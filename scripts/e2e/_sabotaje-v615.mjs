// Matriz de sabotaje de «LA CORRECCIÓN DE UN RÉCORD YA NO LA REVIERTE LA FUSIÓN» (v615).
//
// Por qué hace falta versionada: `mergePRs` se queda con el MAYOR porque un récord ES un máximo,
// y la corrección del coach casi siempre BAJA el número (`coachEditPR` existe para bajar un récord
// falso: el caso vivo son 200.000 kg de un dedo gordo). Una copia rezagada trae el valor viejo,
// que es más alto, así que ganaba. Medido sobre 45 respaldos: 8 correcciones a mano vivas y 0
// reversiones observadas — la fusión solo corre tras entrenar sin conexión. Estructural.
//
// Corre: node scripts/e2e/_sabotaje-v615.mjs
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico: un corte de luz no deja ceros (v611)
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};
const F = { core: new URL('../../avi-core.js', import.meta.url) };
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· vuelve el «gana el mayor» a secas: la copia vieja revierte la corrección (el defecto original)',
    'core', [['        if (cand && cand.corregido || cur && cur.corregido) {', '        if (false) {']]],
  ['2· la corrección BLOQUEA para siempre: un récord nuevo posterior ya no puede ganarle',
    'core', [['          const sc = setAt(cand), su = setAt(cur);',
      '          const sc = (cand && cand.corregido) ? Infinity : 0, su = (cur && cur.corregido) ? Infinity : 0;']]],
  ['3· la fecha de la corrección se ignora y solo cuenta la del récord',
    'core', [['const setAt = p => Math.max(tsOf(p && p.corregido), tsOf(p && p.date));',
      'const setAt = p => tsOf(p && p.date);']]],
  ['4· gana el establecido MÁS VIEJO',
    'core', [['          if (sc > su || (sc === su && cand && cand.corregido && !(cur && cur.corregido))) m[k] = cand;',
      '          if (sc < su) m[k] = cand;']]],
  ['5· una fecha ilegible cuenta como AHORA en vez de como 0',
    'core', [['  const tsOf = raw => { const t = new Date(raw || 0).getTime(); return Number.isFinite(t) ? t : 0; };',
      '  const tsOf = raw => { const t = new Date(raw || 0).getTime(); return Number.isFinite(t) ? t : Date.now(); };']]],
  ['6· CONTROL: el récord deja de ser un máximo (un día flojo posterior baja la marca)',
    'core', [['        const better = cv > uv', '        const better = cv < uv']]],
];

try {
  for (const [nombre, cual, pares] of matriz) {
    total++;
    const EOL = eolDe(orig[cual]);
    const eol = s => s.split('\n').join(EOL);
    let roto = orig[cual], aplicable = true;
    for (const [b, p] of pares) {
      const buscar = eol(b), poner = eol(p);
      if (roto.split(buscar).length - 1 !== 1) { aplicable = false; break; }
      roto = roto.split(buscar).join(poner);
    }
    if (!aplicable) {
      inertes++;
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto no aparece exactamente 1 vez (¿cambió el código?)`);
      continue;
    }
    escribir(F[cual], roto);
    const [linea, rojo] = suiteRoja();
    escribir(F[cual], orig[cual]);
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [k, u] of Object.entries(F)) escribir(u, orig[k]);
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
