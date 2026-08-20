#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// medir-descuadre-tapaba.mjs — LA COLA DIRECTA DE v506.
//
// v506 arregló que la tarjeta de DESCUADRE de la ficha del coach (titular escrito ≠ suma de sus
// propios macros) cortara con `return` ANTES de llamar a `nutPlanReview`: en cuanto un plan
// fallaba en dos cosas a la vez, el coach leía la de menos peso. Lo que NO se sabía es a cuántos
// asesorados reales se les mostró el aviso equivocado.
//
// Esto NO simula la ficha con un DOM: corre las MISMAS funciones puras que corre la app
// (`avi-core.js`) sobre los backups reales, y reproduce las dos ramas del render de
// `renderNutReviewCard` (app-3-coach.js):
//   ANTES de v506 → con descuadre (y sin banda de menores) se pintaba ESA tarjeta y se salía con
//                   `return`: `nutPlanReview` ni se llamaba → «TAPADO».
//   DESDE v506    → manda la palanca grande (el revisor) y el descuadre viaja como línea de más.
//
// 🔑 UNA FOTO DE HOY NO RESPONDE LA PREGUNTA. El defecto vivió del 2026-08-04 (v435, la tarjeta
// nace) al 2026-08-19 (v506), y los planes CAMBIARON dentro de esa ventana. Por eso el modo por
// defecto barre TODA la serie de backups y marca la ventana; el modo de un día es para inspeccionar.
//
//   node scripts/medir-descuadre-tapaba.mjs                 → la serie completa (la respuesta)
//   node scripts/medir-descuadre-tapaba.mjs <backup.json>   → el detalle de UN día
//
// ⚠️ Corre el revisor de HOY sobre datos de ayer: `proteina_fuera` (v496) y las bandas de menores
// (v493) no existían en julio, así que en las filas viejas cuenta lo que HABRÍA visto, no lo que
// vio. Los `desviado`, que son los que sostienen la conclusión, sí existen desde v430.
// Solo LEE. No toca la nube ni el repo.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require(join(import.meta.dirname, '..', 'avi-core.js'));

const DIR_BK = join(import.meta.dirname, '..', '..', 'backups');
const V435 = '2026-08-04';   // nace la tarjeta de descuadre con el `return`
const V506 = '2026-08-19';   // se le quita el `return`
const TITULOS = {
  desviado: 'DESVIADO ≥300 kcal', rotulo_miente: 'el rótulo miente',
  menor_bajo_gasto: 'MENOR bajo su gasto', menor_sobre_techo: 'MENOR sobre el techo',
  proteina_fuera: 'proteína fuera de dosis', sin_datos: 'faltan datos', sin_plan: 'sin plan',
};
const pad = (s, n) => String(s).padEnd(n);
const kc = n => `${n > 0 ? '+' : ''}${n} kcal`;

// Un día: una fila por plan con titular escrito (el coach también se revisa a sí mismo).
function analizar(db) {
  const out = [];
  for (const fila of (db.user_data || [])) {
    if (fila.role !== 'client' && fila.role !== 'coach') continue;
    const p = fila.profile || {}, nut = fila.nutrition;
    if (!nut || !(parseFloat(nut.kcal) > 0)) continue;   // sin titular no hay descuadre posible
    const c = { ...p, id: fila.user_id };
    const peso = core.nutWeightFor(c, fila.bodyweight);
    const b = core.nutBaseFor(c, nut, peso);
    const banda = !!(b && (b.minorCap || b.minorFloor));  // si la banda actúa, manda ella (ya resuelto)
    let desfase = null;
    if (!banda) {
      const real = core.nutMacroKcal({ prot_g: nut.prot, carb_g: nut.carbs, fat_g: nut.fat });
      const dif = real - Math.round(parseFloat(nut.kcal));
      if (real > 0 && Math.abs(dif) >= core.NUT_KCAL_MISMATCH) desfase = { real, dif, titular: Math.round(parseFloat(nut.kcal)) };
    }
    const r = core.nutPlanReview(c, nut, peso);
    const hayReview = !!(r && r.status !== 'ok');
    out.push({ nombre: (p.name || '(sin nombre)').split(' ')[0], rol: fila.role, goal: p.goal || '—',
      desfase, r, hayReview, tapado: !!(desfase && hayReview) });
  }
  return out;
}
const quePasaba = x => {
  let s = TITULOS[x.r.status] || x.r.status;
  if (x.r.status === 'desviado') s += ` (${kc(x.r.gap)}${x.r.riesgo ? ', ' + x.r.riesgo : ''})`;
  if (x.r.status === 'proteina_fuera' && x.r.prot) s += ` (${x.r.prot.gramos > 0 ? '+' : ''}${x.r.prot.gramos} g)`;
  return s;
};

// ── MODO DETALLE (un backup) ────────────────────────────────────────────────
if (process.argv[2]) {
  const filas = analizar(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  const tap = filas.filter(x => x.tapado);
  console.log(`\n📋 ${process.argv[2].split(/[\\/]/).pop()} — ${filas.length} planes con titular · ` +
    `${filas.filter(x => x.desfase).length} descuadrados · ${filas.filter(x => x.hayReview).length} con algo que decir`);
  console.log(`🔴 AVISO EQUIVOCADO EN: ${tap.length} de ${filas.length}\n`);
  console.log('   ' + pad('PERSONA', 11) + pad('OBJETIVO', 20) + pad('DESCUADRE', 12) + pad('ANTES v506', 14) + 'LO QUE SE CALLABA');
  console.log('─'.repeat(104));
  for (const x of filas.sort((a, b) => b.tapado - a.tapado)) {
    console.log((x.tapado ? '🔴 ' : '   ') + pad(x.nombre, 11) + pad(x.goal, 20) +
      pad(x.desfase ? kc(x.desfase.dif) : '—', 12) +
      pad(x.desfase ? 'descuadre' : (x.hayReview ? x.r.status : 'nada'), 14) +
      (x.tapado ? quePasaba(x) : (x.hayReview ? '(se veía bien)' : '—')));
  }
  console.log('');
  process.exit(0);
}

// ── MODO SERIE (la respuesta) ───────────────────────────────────────────────
const dias = readdirSync(DIR_BK).filter(f => /^avi-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
console.log(`\n📅 ${dias.length} backups · el defecto vivió del ${V435} (v435) al ${V506} (v506)\n`);
console.log('   ' + pad('DÍA', 12) + pad('PLANES', 8) + pad('DESCUAD.', 10) + pad('TAPADOS', 9) + 'QUIÉN Y QUÉ SE LE CALLABA');
console.log('─'.repeat(112));
const enVentana = [];
for (const f of dias) {
  const dia = f.slice(11, 21);
  const filas = analizar(JSON.parse(readFileSync(join(DIR_BK, f), 'utf8')));
  const tap = filas.filter(x => x.tapado);
  const dentro = dia >= V435 && dia <= V506;
  if (dentro) enVentana.push({ dia, tap });
  console.log((dentro ? '🔴 ' : '   ') + pad(dia, 12) + pad(filas.length, 8) +
    pad(filas.filter(x => x.desfase).length, 10) + pad(tap.length, 9) +
    tap.map(x => `${x.nombre} ${kc(x.desfase.dif)}→${x.r.status === 'desviado' ? kc(x.r.gap) : x.r.status}`).join(' · '));
}

// Lo que importa no es el promedio: es a quién le pasó DENTRO de la ventana en que el defecto vivía.
const personas = new Map();
for (const { dia, tap } of enVentana) for (const x of tap) {
  const e = personas.get(x.nombre) || { dias: [], x };
  e.dias.push(dia); e.x = x; personas.set(x.nombre, e);
}
console.log(`\n${'═'.repeat(112)}`);
console.log(`🔴 DENTRO DE LA VENTANA DEL DEFECTO (${enVentana.length} backups, del ${V435} al ${V506}):`);
console.log(`   personas con el aviso equivocado en la ficha: ${personas.size}\n`);
for (const [nombre, e] of personas) {
  const razon = Math.abs(e.x.r.gap / (e.x.desfase.dif || 1));
  console.log(`   · ${nombre} (${e.x.rol}, «${e.x.goal}») — la ficha decía «ajusta el titular, ${Math.abs(e.x.desfase.dif)} kcal»`);
  console.log(`     y CALLABA: ${quePasaba(e.x)}` + (e.x.r.status === 'desviado' ? `  → ${razon.toFixed(0)}× más grande` : ''));
  console.log(`     presente en ${e.dias.length} de ${enVentana.length} backups de la ventana (${e.dias[0]} → ${e.dias[e.dias.length - 1]})`);
}
const pico = enVentana.length ? Math.max(...enVentana.map(v => v.tap.length)) : 0;
const previo = dias.filter(f => f.slice(11, 21) < V435).pop();
if (previo) {
  const antes = analizar(JSON.parse(readFileSync(join(DIR_BK, previo), 'utf8'))).filter(x => x.tapado);
  console.log(`\n   📏 El día que nació la tarjeta el estado era el del ${previo.slice(11, 21)}: ${antes.length} planes la habrían`);
  console.log(`      recibido equivocada (${antes.map(x => x.nombre).join(', ')}) — y el pico DENTRO de la ventana fue ${pico}.`);
}
console.log('');
