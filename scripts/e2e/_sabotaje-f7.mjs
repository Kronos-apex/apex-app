// Matriz de sabotaje de F7 (el plan se MARCA, no se re-escribe). Rompe a propósito cada candado
// y exige que la suite se ponga ROJA. Misma doctrina que `_sabotaje-f5/f6`: un candado que no
// muerde no es un candado, y en este repo un sabotaje ya salió VERDE cuatro veces — la última,
// los tres descuentos cruzados de `carb2`, que llegaron a producción SIN UN SOLO TEST.
// ⚠️ Los archivos del repo van con CRLF: un patrón con `\n` suelto NO SE APLICA NUNCA. Los
// patrones se anclan en UNA sola línea, y el runner grita si el texto no aparece exactamente 1 vez.
// Corre: node scripts/e2e/_sabotaje-f7.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SABOTAJES = [
  // ── El corazón: qué se registra ──────────────────────────────────────────
  ['1· los acompañantes dejan de registrarse (el plato sin la fruta: v470 al revés)',
    "  (m.acompIds || []).forEach(id => { const f = NUT_FOOD_BY_ID[id]; if (f) add(id, nutAcompGrams(f)); });",
    '  // sabotaje'],
  ['2· el plato deja de registrarse y solo entran los acompañantes',
    "  (m.items || []).forEach(it => add(it.id, it.grams));",
    '  // sabotaje'],
  ['3· el acompañante se registra con 100 g fijos en vez de su ración real',
    'function nutAcompGrams(food) { return (food && food.un && food.un.g > 0) ? food.un.g : 100; }',
    'function nutAcompGrams(food) { return food ? 100 : 100; }'],
  ['4· los gramos del plato se sirven a ojo (media ración de más)',
    "  (m.items || []).forEach(it => add(it.id, it.grams));",
    '  (m.items || []).forEach(it => add(it.id, it.grams * 1.5));'],

  // ── El orden: el desayuno registrado como cena ───────────────────────────
  ['5· el plan y el registro se desalinean una posición (desayuno → media mañana)',
    '  const mealKey = FOODLOG_MEALS[idx];\r\n  if (!m || !mealKey) return [];',
    '  const mealKey = FOODLOG_MEALS[(idx + 1) % FOODLOG_MEALS.length];\r\n  if (!m || !mealKey) return [];'],
  ['6· FOODLOG_MEALS se reordena y nadie se entera (los totales del día seguirían cuadrando)',
    "const FOODLOG_MEALS = ['desayuno', 'media_m', 'almuerzo', 'media_t', 'cena'];",
    "const FOODLOG_MEALS = ['desayuno', 'almuerzo', 'media_m', 'media_t', 'cena'];"],

  // ── La idempotencia: el id determinista ──────────────────────────────────
  ['7· el id vuelve a ser aleatorio: marcar dos veces sirve el desayuno dos veces',
    "    const e = foodLogEntry(food, grams, mealKey, now, () => _flPlanId(dayKey, mealKey, out.length));",
    '    const e = foodLogEntry(food, grams, mealKey, now, () => _flPlanId(dayKey, mealKey, out.length) + Math.random());'],
  ['8· el id pierde la comida: el desayuno y la cena se pisan entre sí',
    "function _flPlanId(dayKey, mealKey, n) { return FOODLOG_PLAN_PREFIX + dayKey + '-' + mealKey + '-' + n; }",
    "function _flPlanId(dayKey, mealKey, n) { return FOODLOG_PLAN_PREFIX + dayKey + '-' + n; }"],

  // ── Desmarcar: la salida que hace usable la marca ────────────────────────
  ['9· desmarcar arrasa con lo que la persona anotó a mano',
    '  const rest = o.d[dayKey].filter(e => !(foodLogIsPlanEntry(e) && e.meal === mealKey));',
    '  const rest = o.d[dayKey].filter(e => e.meal !== mealKey);'],
  ['10· desmarcar una comida se lleva las otras cuatro',
    '  const rest = o.d[dayKey].filter(e => !(foodLogIsPlanEntry(e) && e.meal === mealKey));',
    '  const rest = o.d[dayKey].filter(e => !foodLogIsPlanEntry(e));'],
  ['11· el detector no distingue lo del plan de lo anotado a mano (nunca deja desmarcar)',
    '  return foodLogDay(foodlog, now).some(e => foodLogIsPlanEntry(e) && e.meal === mealKey);',
    '  return foodLogDay(foodlog, now).some(e => e.meal === mealKey);'],
  ['12· el prefijo del plan se confunde con el de una entrada escrita a mano',
    "const FOODLOG_PLAN_PREFIX = 'pl-';",
    "const FOODLOG_PLAN_PREFIX = 'fl';"],

  // ── Las dos superficies ──────────────────────────────────────────────────
  ['13· la habitación del registro se calcula su PROPIO plan (dos verdades a un toque)',
    "  const _ph=(typeof _nutPlanHoy==='function')?_nutPlanHoy(c):null;",
    '  const _ph=(function(){try{const b=nutBaseFor(c,(DB.nutrition||{})[c.id],_nutPesoDe(c));return b?{plan:nutDayPlan(b,"entreno",4,1,new Date().getDay())}:null;}catch(e){return null;}})();',
    'app-5-salud.js'],
  ['14· marcar el plan se salta el aviso de que el coach ve el detalle',
    '  if(!c.foodlogOk){ openFoodLogRoom(FOODLOG_MEALS[idx]); return; }',
    '  // sabotaje',
    'app-5-salud.js'],
  // ⚠️ OJO: `avi-core.js` va con CRLF pero `app-5-salud.js` va con LF — el repo es MIXTO, no
  // uniformemente CRLF como decía el gotcha. Los patrones multilínea de este archivo usan `\n`.
  ['15· marcar el plan se salta el gate Premium',
    "  if(typeof isFreeClient==='function'&&isFreeClient(c))return;\n  if(typeof foodLogMarkPlanMeal!=='function')return;",
    "  if(typeof foodLogMarkPlanMeal!=='function')return;",
    'app-5-salud.js'],
  ['16· el botón de marcar llama a una función que no existe (no hace nada y no da error)',
    'function flTogglePlanMeal(idx){',
    'function flTogglePlanMealRenombrada(idx){',
    'app-5-salud.js'],

  // ── CONTROL: un cambio inocuo NO debe poner la suite roja ────────────────
  // Sin esto no se sabe si los 16 de arriba muerden por lo que dicen morder o porque cualquier
  // toque en el archivo rompe algo. Un control que no puede pasar no es un control.
  ['C· CONTROL (debe seguir VERDE): tocar el archivo sin tocar el candado',
    'const FOODLOG_PLAN_PREFIX = ',
    'const FOODLOG_PLAN_PREFIX = /* control del sabotaje */ ',
    'avi-core.js', 'verde'],
];

const ARCHIVOS = ['avi-core.js', 'app-5-salud.js'];
const RUTA = n => new URL('../../' + n, import.meta.url);
const ORIGINAL = Object.fromEntries(ARCHIVOS.map(n => [n, readFileSync(RUTA(n), 'utf8')]));

let ok = 0, fallos = [];
try {
  for (const [nombre, buscar, poner, archivo = 'avi-core.js', espera = 'rojo'] of SABOTAJES) {
    const original = ORIGINAL[archivo];
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces en ${archivo} (esperaba 1)`);
      fallos.push(nombre);
      continue;
    }
    writeFileSync(RUTA(archivo), original.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node --test avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    writeFileSync(RUTA(archivo), original, 'utf8');
    const bien = espera === 'verde' ? !rojo : rojo;
    console.log(`  ${bien ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (bien) ok++; else fallos.push(nombre);
  }
} finally {
  ARCHIVOS.forEach(n => writeFileSync(RUTA(n), ORIGINAL[n], 'utf8'));
}
console.log(`\n${ok === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que se comportan como deben: ${ok}/${SABOTAJES.length}`);
if (fallos.length) console.log('   No mordieron: ' + fallos.join(' · '));
process.exit(ok === SABOTAJES.length ? 0 : 1);
