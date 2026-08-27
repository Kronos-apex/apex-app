// Matriz de sabotaje de LA DURACIÓN DE UN HIIT (v545).
// Rompe cada candado nuevo y exige que la suite se ponga ROJA — por CÓDIGO DE SALIDA, nunca
// leyendo el mensaje impreso (lección de v524: un test appendeado bajo el bloque RESUMEN imprime
// su fallo y aun así deja la suite en verde).
//
// Por qué hace falta versionada: el defecto que la motivó salió de una pregunta de dos asesoradas
// reales (Luz y Claudia, 27-ago-2026) sobre por qué el mismo HIIT con las mismas rondas les daba
// duraciones y calorías distintas. La app no calculaba mal: medía el reloj de pared, así que una
// pausa —o el celular bloqueado, que en Android congela el temporizador— contaba como entreno y
// se convertía en calorías. La suite estaba verde todo el tiempo.
//
// Corre: node scripts/e2e/_sabotaje-hiit.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const APP4 = new URL('../../app-4-entreno.js', import.meta.url);

// ⚠️ Los patrones se anclan en UNA sola línea (los finales de línea del repo no son estables).
const SABOTAJES = [
  [CORE, '1· el protocolo se apaga: un HIIT vuelve a durar lo que marque el reloj',
    'function hiitProtocolSec(routine, doneByEx) {',
    'function hiitProtocolSec(routine, doneByEx) { return null;'],
  [CORE, '2· cae el filtro de «solo HIIT»: una sesión de pesas pierde su tiempo real',
    "  if (!exs.every(e => exTrack(e) === 'hiit')) return null;",
    '  if (false) return null;'],
  [CORE, '3· se cuenta una pausa de más (450 s en vez de 435: la persona no descansa tras la última ronda)',
    '    sec += n * c.work + (n - 1) * c.rest;',
    '    sec += n * c.work + n * c.rest;'],
  [CORE, '4· el ejercicio sin cerrar RESTA tiempo en vez de no contar',
    '    if (!n) continue;',
    '    if (false) continue;'],
  [APP4, '5· CABLEADO: showWorkoutFinish deja de preguntarle al protocolo',
    '    durationSec=proto!=null?proto:reloj;',
    '    durationSec=reloj;'],
  [APP4, '6· las calorías vuelven al peso que se tecleó en el alta y nadie actualiza (v511)',
    '    const w=parseFloat(_entrenoPesoDe(c))||70;      // kg; fallback 70 si no hay peso',
    '    const w=parseFloat(c&&c.weight)||70;            // kg; fallback 70 si no hay peso'],
  [APP4, '7· el preset cambia de rondas y el 435 medido se queda mintiendo en silencio',
    "   items:[{id:'e74',sets:10,hiit:{work:30,rest:15}}]},",
    "   items:[{id:'e74',sets:12,hiit:{work:30,rest:15}}]},"],
];

const ORIGINALES = new Map([[CORE.href, readFileSync(CORE, 'utf8')], [APP4.href, readFileSync(APP4, 'utf8')]]);
const restaurar = () => { for (const [href, txt] of ORIGINALES) writeFileSync(new URL(href), txt, 'utf8'); };

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIGINALES.get(ruta.href);
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    writeFileSync(ruta, original.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;                       // ← el VEREDICTO es el código de salida, no el texto
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    restaurar();
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  restaurar();
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
