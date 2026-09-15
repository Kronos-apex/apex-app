// Matriz de sabotaje de «LA CORRECCIÓN TAPA EL NÚMERO QUE QUITÓ, NO TODO LO MAYOR» (v618).
//
// Por qué hace falta versionada: v615 arregló que una copia rezagada revirtiera la corrección del
// coach… y de paso introdujo una REGRESIÓN que la regla vieja no tenía. La demostró Fable
// verificando v615: un teléfono sin red donde la persona batió su marca de verdad (30 kg el
// 20-ago) perdía contra una corrección posterior (1-sep) que hablaba de OTRO número (el typo de
// 200.000). Comparaba cuándo se LOGRÓ contra cuándo se ADMINISTRÓ.
//
// Corre: node scripts/e2e/_sabotaje-v618.mjs
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico (v611)
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
  ['1· LA REGRESIÓN DE v615: la corrección gana por reciente y se come un récord legítimo',
    'core', [['            && valOf(otro) === corr.corregidoDe && setAt(otro) <= tsOf(corr.corregido));',
      '            && setAt(otro) <= tsOf(corr.corregido));']]],
  ['2· la corrección deja de tapar el número que quitó (vuelve el récord falso)',
    'core', [['            && valOf(otro) === corr.corregidoDe && setAt(otro) <= tsOf(corr.corregido));',
      '            && false);']]],
  ['3· se ignora que el candidato sea POSTERIOR: la corrección bloquea para siempre',
    'core', [['            && valOf(otro) === corr.corregidoDe && setAt(otro) <= tsOf(corr.corregido));',
      '            && valOf(otro) === corr.corregidoDe);']]],
  ['4· entre dos correcciones gana la MÁS VIEJA (el último cambio del coach no manda)',
    'core', [['            if (tsOf(cand.corregido) > tsOf(cur.corregido)) m[k] = cand;',
      '            if (tsOf(cand.corregido) < tsOf(cur.corregido)) m[k] = cand;']]],
  ['5· una corrección vieja sin corregidoDe pierde su protección (la de v615)',
    'core', [['          if (!(cand && cand.corregidoDe != null) && !(cur && cur.corregidoDe != null)) {',
      '          if (false) {']]],
  ['6· CONTROL: el récord deja de ser un máximo cuando no hay ninguna corrección de por medio',
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
