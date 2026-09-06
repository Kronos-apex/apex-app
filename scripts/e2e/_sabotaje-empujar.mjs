// Matriz de sabotaje de «EMPUJAR 💪 NO SALE SIN DESTINATARIO» (v580).
// Veredicto por CÓDIGO DE SALIDA, jamás por el mensaje impreso (lección v524).
//
// Por qué hace falta versionada: el banner de adherencia del Inicio pintaba el botón para todo
// el mundo, y `whatsappNudge` cae a «elige el contacto» cuando no hay número plausible. Medido
// el 6-sep-2026 sobre las fichas reales: **de 14 dormidos, 12 sin ninguna vía** — 5 de los 6
// botones visibles no llevaban a nadie. Y el daño mayor era el ORDEN: los «nunca empezó» van
// primero y son justo los que no dejaron teléfono, así que el único caso accionable (Nataly)
// quedaba enterrado bajo «y 8 más…». Nada de esto lo veía la suite.
//
// Corre: node scripts/e2e/_sabotaje-empujar.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APP2 = new URL('../../app-2-login.js', import.meta.url);

// ⚠️ Anclado en el TROZO que cambia, en una sola línea (los finales de línea no son estables).
const SABOTAJES = [
  ['1· la conducta ANTERIOR: el botón vuelve a salirle a todos',
    '      const shown=conVia.slice(0,6), extra=conVia.length-shown.length;',
    '      const shown=dormidos.slice(0,6), extra=dormidos.length-shown.length;'],
  ['2· se deja de separar por alcance (conVia = todos)',
    '      const conVia=dormidos.filter(({c})=>_coachPuedeEscribir(c));',
    '      const conVia=dormidos.slice();'],
  ['3· el titular vuelve a contar a los que no se pueden avisar',
    '        ? `💤 ${conVia.length} ${conVia.length>1?\'asesorados necesitan\':\'asesorado necesita\'} un empujón`',
    '        ? `💤 ${dormidos.length} ${dormidos.length>1?\'asesorados necesitan\':\'asesorado necesita\'} un empujón`'],
  ['4· los inalcanzables se ESCONDEN (el coach deja de saber que existen)',
    '      const sinVia=dormidos.filter(({c})=>!_coachPuedeEscribir(c));',
    '      const sinVia=[];'],
  ['5· el envoltorio re-implementa «número válido» en vez de delegar (clase v448/v511)',
    '  return (typeof coachCanReach===\'function\')?coachCanReach(c):!!(c&&c.phone);',
    '  return !!(c&&c.phone);'],
  ['6· el reporte «Sin entrenar» deja de preguntar por el alcance',
    '    const conVia=dorm.filter(({c})=>_coachPuedeEscribir(c)), sinVia=dorm.filter(({c})=>!_coachPuedeEscribir(c));',
    '    const conVia=dorm.slice(), sinVia=[];'],
];

const ORIGINAL = readFileSync(APP2, 'utf8');
const restaurar = () => writeFileSync(APP2, ORIGINAL, 'utf8');

let muerden = 0;
try {
  for (const [nombre, buscar, poner] of SABOTAJES) {
    const veces = ORIGINAL.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    writeFileSync(APP2, ORIGINAL.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
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
