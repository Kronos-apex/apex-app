// Matriz de sabotaje del CANDADO DE REPETICIONES (v593, hallazgo 1 de la auditoría de rápidos).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: este defecto es SILENCIOSO y permanente. Un `110` entre series
// de `10` no da error, se guarda, se vuelve récord — y a partir de ahí ese ejercicio queda
// imposible de superar para esa persona, con el detector de estancamiento leyéndolo como plantado
// para siempre. Ya pasó con Luz (Dead Bug, dos días) antes de que existiera este candado.
//
// 🔬 El umbral de este candado NO es el de los kilos: se eligió con un barrido sobre las 7.116
// series reales, porque copiar `_SANE_REL_MIN_SETS` (3 series) dejaba fuera justo el único caso
// con récord corrupto. Por eso hay un sabotaje dedicado a devolverlo a 3.
//
// Corre: node scripts/e2e/_sabotaje-reps.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const EXTRA = new URL('../../app-6-extra.js', import.meta.url);
const ENTRENO = new URL('../../app-4-entreno.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· el mínimo vuelve a 3 series: el caso de Luz (que solo tiene 2) deja de cazarse',
    'const _SANE_REL_MIN_SETS_REPS = 2;',
    'const _SANE_REL_MIN_SETS_REPS = 3;'],
  [CORE, '2· la regla se afloja hasta no marcar a nadie',
    '  return m > 0 && mio >= _SANE_REL_FACTOR * m;\n}\n\nfunction kgOutlier(kgs, i) {',
    '  return false;\n}\n\nfunction kgOutlier(kgs, i) {'],
  [CORE, '3· la repetición imposible se RECORTA en vez de dejarse en blanco (afirma un dato falso)',
    "        if (!sTocado && _saneRelReps(ex.sets, i)) { ns.reps = ''; sTocado = true; fixed++; }",
    '        if (!sTocado && _saneRelReps(ex.sets, i)) { ns.reps = 10; sTocado = true; fixed++; }'],
  [CORE, '4· la cura del historial deja de mirar las repeticiones',
    "        if (!sTocado && _saneRelReps(ex.sets, i)) { ns.reps = ''; sTocado = true; fixed++; }",
    '        if (false) { }'],
  [CORE, '5· el récord fantasma de repeticiones se queda (el ejercicio queda imposible de superar)',
    "    if (!malo && !fantasma && p && (p.unit === 'reps')) {",
    '    if (false) {'],
  [EXTRA, '6· el aviso al teclear se descuelga de la casilla',
    ` onchange="repsSanityHint('\${GM.routine.id}',\${ei},\${si},this)"`,
    ''],
  [ENTRENO, '7· vuelve el lenguaje de composición corporal al preset que ven cuatro menores',
    "name:'HIIT sin equipo'",
    "name:'HIIT Quema-grasa'"],
];

const ORIG = new Map();
for (const [ruta] of SABOTAJES) if (!ORIG.has(ruta.href)) ORIG.set(ruta.href, readFileSync(ruta, 'utf8'));

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIG.get(ruta.href);
    // Los finales de línea de este repo NO son estables (v537): el patrón se aplica con `\r?\n`.
    const re = new RegExp(buscar.split('\n').map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'));
    const veces = (original.match(new RegExp(re.source, 'g')) || []).length;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    // Reemplazo con FUNCIÓN: un `$` en el reemplazo es un patrón especial (v583).
    writeFileSync(ruta, original.replace(re, () => poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló';
    }
    writeFileSync(ruta, original, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [href, txt] of ORIG) writeFileSync(new URL(href), txt, 'utf8');
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
