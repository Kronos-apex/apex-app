// Matriz de sabotaje de «LA CORRECCIÓN DEL REPORTE DE DOLOR TIENE UNA PUERTA QUE NO SE CIERRA
// SOLA» (v613). Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: el defecto no daba error ni dejaba rastro. `painCanCorrect`
// decía que sí —ese derecho no caduca nunca— y el único botón vivía en la pantalla de resultado,
// o sea los segundos siguientes a enviar el reporte, porque el id se guardaba en una variable EN
// MEMORIA. Al cerrar la app el derecho seguía abierto y ya no había forma de ejercerlo. El PO se
// equivocó de chip el 14-sep (marcó el muslo por DENTRO con un tirón en la parte de ATRÁS: 2 de
// sus 53 ejercicios marcados en vez de 13, con el Curl Femoral fuera) y no tuvo dónde arreglarlo.
//
// Corre: node scripts/e2e/_sabotaje-v613.mjs
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// 🔴 ESCRITURA ATÓMICA (13-sep-2026): un corte de luz a mitad de un `writeFileSync` deja el
// archivo con su tamaño nuevo y el contenido en CEROS. `.tmp` + `rename` es todo-o-nada.
const escribir = (url, texto) => {
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};

const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  app6: new URL('../../app-6-extra.js', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');   // ni se asume ni se mezcla (v600)
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  // ── EL MOTOR PURO ────────────────────────────────────────────────────────────────────
  ['1· la regla de UNA SOLA VEZ se cae: se ofrece corregir lo ya corregido',
    'core', [['  const vivos = painCareActive(list, nowTs).filter(p => p && !p.corregido && p.id);',
      '  const vivos = painCareActive(list, nowTs).filter(p => p && p.id);']]],
  ['2· se ofrece corregir un reporte que ya no filtra nada (descartado o vencido)',
    'core', [['  const vivos = painCareActive(list, nowTs).filter(p => p && !p.corregido && p.id);',
      '  const vivos = (list || []).filter(p => p && !p.corregido && p.id);']]],
  ['3· devuelve el reporte MÁS VIEJO: la puerta apunta al que la persona no recuerda',
    'core', [['    if (Number.isFinite(t) && t >= mejorT) { mejorT = t; mejor = p; }',
      '    if (Number.isFinite(t) && t <= mejorT) { mejorT = t; mejor = p; }']]],
  ['4· sin ningún candidato devuelve algo igual (un id inventado)',
    'core', [['  if (!vivos.length) return null;', '  if (!vivos.length) return (list && list[0] && list[0].id) || null;']]],

  // ── LA PUERTA ────────────────────────────────────────────────────────────────────────
  ['5· la corrección vuelve a depender de la variable en MEMORIA (el defecto original)',
    'app6', [['function painFixAnswers(entryId){', 'function painFixAnswers(){'],
      ['  const id=entryId||_painLastId; if(!id)return;', '  const id=_painLastId; if(!id)return;']]],
  ['6· se corrige un reporte y se marca OTRO como corregido',
    'app6', [['sinFlags:!(p.flags||[]).length,fixId:id};', 'sinFlags:!(p.flags||[]).length,fixId:_painLastId};']]],
  ['7· el banner deja de preguntar si a ese reporte le queda su corrección',
    'app6', [["  const _fixId=(typeof painLastCorrectable==='function')?painLastCorrectable(c.painCare):null;",
      '  const _fixId=null;']]],
  ['8· el botón se pinta SIEMPRE, tenga puerta o no (un botón muerto es peor que ninguno)',
    'app6', [['  const _fixBtn=_fixId?`<button', '  const _fixBtn=true?`<button']]],
  ['9· el banner no pasa el id: la puerta vuelve a depender de la pantalla de resultado',
    'app6', [["onclick=\"painFixAnswers('${esc(_fixId)}')\"", 'onclick="painFixAnswers()"']]],
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
