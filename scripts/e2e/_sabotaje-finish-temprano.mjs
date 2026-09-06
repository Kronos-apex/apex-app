// Matriz de sabotaje de «TERMINAR TEMPRANO TAMBIÉN PREMIA» (v579).
// Rompe cada candado nuevo y exige que la suite se ponga ROJA — por CÓDIGO DE SALIDA, nunca
// leyendo el mensaje impreso (lección de v524: un test appendeado bajo el bloque RESUMEN imprime
// su fallo y aun así deja la suite en verde).
//
// Por qué hace falta versionada: `showWorkoutFinish` —duración, calorías, récords, subida de
// nivel y el pedido de avisos— tenía DOS puntos de entrada y los dos eran el camino del 100%.
// Quien tocaba «✓ Finalizar entrenamiento» guardaba bien y recibía un `toast`. Medido el
// 6-sep-2026: 4 de 213 cierres usaron ese botón, con el 24,5% de las sesiones sin cerrar nunca.
// Nada de esto lo cazaba la suite, porque el defecto era un CABLEADO que faltaba.
//
// Corre: node scripts/e2e/_sabotaje-finish-temprano.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const APP4 = new URL('../../app-4-entreno.js', import.meta.url);
const APP6 = new URL('../../app-6-extra.js', import.meta.url);

// ⚠️ Los patrones se anclan en UNA sola línea y en el TROZO que cambia (los finales de línea del
//    repo no son estables, y una línea entera se despega en cuanto alguien la alarga — v549/v550).
const SABOTAJES = [
  [APP6, '1· la conducta ANTERIOR: terminar temprano vuelve a acabar en un toast',
    '  if(typeof showWorkoutFinish===\'function\' && routine) showWorkoutFinish(routine,stats);',
    '  if(false) showWorkoutFinish(routine,stats);'],
  [APP6, '2· se celebra ANTES de cerrar el guiado: el fondo se desplaza bajo la pantalla de cierre',
    '  closeGuidedMode();',
    '  if(false) closeGuidedMode();'],
  [APP6, '3· se ignora el resumen y se celebra con lo que haya (0 series, 0 volumen)',
    '  const stats=finishSessionEarly(); if(!stats) return; // no guardó (0 series o canceló el confirm)',
    '  const stats={}; if(!finishSessionEarly()) return;'],
  [APP6, '4· se pierde la salida temprana: cancelar el confirm celebra igual',
    '  const stats=finishSessionEarly(); if(!stats) return; // no guardó (0 series o canceló el confirm)',
    '  const stats=finishSessionEarly()||{};'],
  [APP4, '5· finishSessionEarly vuelve al booleano: el llamador se queda sin cifras',
    '  return {done,total,totalVol,newPRs,partial:done<total};',
    '  return true;'],
  [APP4, '6· el resumen deja de decir si la sesión fue PARCIAL: el titular vuelve a mentir',
    '  return {done,total,totalVol,newPRs,partial:done<total};',
    '  return {done,total,totalVol,newPRs};'],
  [APP4, '7· los récords corren sin blindaje: un throw ahí se lleva la pantalla de cierre',
    '  try{ newPRs=_prsMergeSession(routine,checkAndUpdatePRs(routine)||[])||[]; } // cierra la sesión → vacía lo apartado',
    '  newPRs=_prsMergeSession(routine,checkAndUpdatePRs(routine)||[])||[];'],
  [APP4, '8· el titular se escribe a mano en el render (segunda definición del texto)',
    '  document.getElementById(\'wf-title\').textContent=wfTitle(name,!!(stats&&stats.partial));',
    '  document.getElementById(\'wf-title\').textContent=name?`¡Lo lograste, ${name}!`:\'¡Lo lograste!\';'],
  [CORE, '9· wfTitle deja de mirar el parcial: «¡Lo lograste!» encima de «Series 6/12»',
    '  if (partial) return n ? `¡Bien hecho, ${n}!` : \'¡Bien hecho!\';',
    '  if (false) return n ? `¡Bien hecho, ${n}!` : \'¡Bien hecho!\';'],
  // CONTROL DEL CONTROL: al 100% el texto tiene que seguir siendo EXACTAMENTE el de siempre.
  // Sin este caso, «arreglar» el titular pasando TODO a «¡Bien hecho!» saldría verde y habríamos
  // degradado la celebración de quien sí llegó al final (v546: acotar sin control es borrar).
  [CORE, '10· CONTROL · el 100% pierde su «¡Lo lograste!» de siempre',
    '  return n ? `¡Lo lograste, ${n}!` : \'¡Lo lograste!\';',
    '  return n ? `¡Bien hecho, ${n}!` : \'¡Bien hecho!\';'],
];

const ORIGINALES = new Map([
  [CORE.href, readFileSync(CORE, 'utf8')],
  [APP4.href, readFileSync(APP4, 'utf8')],
  [APP6.href, readFileSync(APP6, 'utf8')],
]);
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
