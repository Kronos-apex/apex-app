// Matriz de sabotaje de «LA PROGRESIÓN SE DICE COMO INSTRUCCIÓN» (v595).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esto no da error nunca. Una app que dice «🎯 Peso sugerido:
// 95 kg» el día que toca subir y el día que toca repetir funciona igual de bien — solo que la
// persona nunca sube. Medido sobre el PO antes de construir: la doble progresión YA existía y le
// mandaba subir en **15 de 24 ejercicios**, uno con **18 sesiones al mismo peso**, y él seguía en
// el mismo número. El defecto no estaba en el motor, estaba en cómo se decía.
//
// Corre: node scripts/e2e/_sabotaje-progresion.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const ENTRENO = new URL('../../app-4-entreno.js', import.meta.url);
const EXTRA = new URL('../../app-6-extra.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· el día del escalón deja de anunciarse (todo cae a «peso sugerido»)',
    '  if (s > kg) {',
    '  if (false) {'],
  [CORE, '2· el plazo se escribe A MANO en vez de derivarse de la constante',
    'const faltan = Math.max(0, LOAD_CONSOLIDATE_SESSIONS - (isFinite(n) ? n : 0));',
    'const faltan = Math.max(0, 2 - (isFinite(n) ? n : 0));'],
  [CORE, '3· promete una consolidación donde el mecanismo es OTRO (récord a menos reps)',
    '  if (reps >= tgt && tgt > 0) {',
    '  if (true) {'],
  [CORE, '4· el aviso de subir pierde el peso NUEVO: deja de ser una instrucción',
    'texto: `Consolidaste ${kg} kg${cuantas} — hoy toca ${s} kg` };',
    'texto: `Consolidaste ${kg} kg${cuantas}` };'],
  [ENTRENO, '5· `_suggestKg` vuelve a contar las sesiones por su cuenta (dos verdades)',
    '  const i=_progressInfo(ex);',
    '  const c0=_curClient(); const pr0=(DB.prs[c0.id]||{})[ex.id||ex.name]; const r0=parseInt(ex.reps)||10;\n  const s0=sessionsAtLoad((DB.history&&DB.history[c0.id])||[],ex.id||ex.name,parseFloat(pr0&&(pr0.val!=null?pr0.val:pr0.kg)),r0);\n  const i={sug:suggestFromPR(pr0,r0,{sesionesEnPeso:s0})};'],
  [EXTRA, '6· la pantalla deja de usar la instrucción y vuelve al número pelado',
    '        _ph=progressHint(_pr.val!=null?_pr.val:_pr.kg,_pr.reps,gmInfo.reps,gmInfo.ses,gmSug,gmInfo.ultimo);',
    '        _ph=null;'],
  [CORE, '8· la guarda del récord desfasado se apaga: instrucciones sobre pesos que ya no mueve',
    '  const desfasado = ult > 0 && ult < kg * PROGRESS_HINT_MIN_RATIO;',
    '  const desfasado = false;'],
  [CORE, '9· el corte se escribe a mano en vez de derivarse de la constante',
    'const PROGRESS_HINT_MIN_RATIO = 0.75;',
    'const PROGRESS_HINT_MIN_RATIO = 0.30;'],
  [ENTRENO, '10· el último peso real deja de calcularse: la guarda queda inerte',
    '      ? lastWorkKg((DB.history&&DB.history[c.id])||[], ex.id||ex.name) : null;',
    '      ? null : null;'],
  [EXTRA, '7· el realce se aplica SIEMPRE: destacar todo es no destacar nada',
    '      if(_ph&&_ph.estado===\'sube\'){',
    '      if(_ph){'],
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
