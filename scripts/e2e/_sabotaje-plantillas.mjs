// Matriz de sabotaje de LA PROMESA DEL NOMBRE Y EL FORMULARIO QUE HEREDABA (v590, D2-3 y D2-4).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: los dos defectos que esto mata son SILENCIOSOS. Una plantilla
// que promete hombros y no los tiene funciona perfectamente —se aplica, se guarda, se entrena—
// y solo se nota meses después mirando el plan entero de alguien (Kathe, 25 ejercicios, cero de
// hombro). Y un formulario que hereda el calentamiento de otra persona tampoco da error: escribe
// el dato de otra en el plan de una.
//
// Corre: node scripts/e2e/_sabotaje-plantillas.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const LOGIN = new URL('../../app-2-login.js', import.meta.url);
const COACH = new URL('../../app-3-coach.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· la regla deja de mirar los hombros (el caso exacto de Kathe)',
    "  [/\\bhombros?\\b/i, 'hombros', 'hombros'],",
    "  // (hombros fuera)"],
  [CORE, '2· deja de mirar QUÉ músculos hay dentro: no marca nunca',
    '    if (re.test(txt) && !tiene.has(muscle)) falta.push(label);',
    '    if (false) falta.push(label);'],
  [CORE, '3· la regla se ensancha y marca «bíceps femoral», que es de la PIERNA (v424)',
    "  [/\\bb[ií]ceps\\b(?!\\s+femoral)/i, 'biceps', 'bíceps'],",
    "  [/\\bb[ií]ceps\\b/i, 'biceps', 'bíceps'],"],
  [CORE, '4· el aviso se queda mudo aunque el hueco exista',
    "  if (!l.length) return '';",
    "  return '';\n  if (!l.length) return '';"],
  [COACH, '5· el vaciado deja de limpiar el calentamiento: vuelve el de la otra persona',
    '  CUR.editRoutineIdx=null; CUR.routineExs=[]; CUR.restSec=60; CUR.routineWarmup=null;',
    '  CUR.editRoutineIdx=null; CUR.routineExs=[]; CUR.restSec=60;'],
  [COACH, '6· el vaciado deja de limpiar el «por qué», que es texto que lee el asesorado',
    "  ['rf-name','rf-note','rf-shift','r-why'].forEach(id=>{ const el=g(id); if(el)el.value=''; });",
    "  ['rf-name','rf-note','rf-shift'].forEach(id=>{ const el=g(id); if(el)el.value=''; });"],
  [LOGIN, '7· aplicar una plantilla vuelve a heredar el estado anterior (el hallazgo D2-4)',
    "  if(typeof rfBlank==='function')rfBlank();\n  document.getElementById('mr-title').innerHTML=`Nueva rutina",
    "  document.getElementById('mr-title').innerHTML=`Nueva rutina"],
  [LOGIN, '8· cargar una plantilla DENTRO del modal vuelve a heredar',
    "      // v590 · misma puerta, mismo vaciado previo (hallazgo D2-4).\n      if(typeof rfBlank==='function')rfBlank();",
    '      // (sin vaciar)'],
  [LOGIN, '9· la lista de plantillas deja de avisar donde se decide aplicarla',
    "          ${_gapTpl.length?`<div class=\"tpl-gap\">⚠️ ${esc(routinePromiseText(_gapTpl))}</div>`:''}",
    '          '],
  [COACH, '10· guardar una rutina deja de comprobar lo que promete su nombre',
    "  const _gap=(typeof routinePromiseGap==='function')?routinePromiseGap(name,rutData.exercises):[];",
    '  const _gap=[];'],
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
