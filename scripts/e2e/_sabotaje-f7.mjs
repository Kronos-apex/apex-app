// Matriz de sabotaje de F7 (el plan se MARCA, no se re-escribe). Rompe a propósito cada candado
// y exige que la suite se ponga ROJA. Misma doctrina que `_sabotaje-f5/f6`: un candado que no
// muerde no es un candado, y en este repo un sabotaje ya salió VERDE cuatro veces — la última,
// los tres descuentos cruzados de `carb2`, que llegaron a producción SIN UN SOLO TEST.
// ⚠️ FINALES DE LÍNEA: perseguirlos a mano es perder el tiempo. Este repo tiene los dos —y
// además **git los REESCRIBE al commitear**: `app-5-salud.js` estaba con LF mientras se trabajaba
// y amaneció con CRLF después del commit, así que un patrón multilínea que hoy casa mañana no.
// Por eso el runner NORMALIZA: convierte el patrón en un regex donde cada salto es `\r?\n`.
// Y sigue gritando si el texto no aparece EXACTAMENTE una vez — un «no se aplicó» se lee de
// reojo igual que un ✅, y en un listado de 24 se pierde.
// Corre: node scripts/e2e/_sabotaje-f7.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Busca `txt` sin que el final de línea importe. Devuelve {veces, aplicar(src)}.
const buscador = txt => {
  const re = new RegExp(txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'), 'g');
  return {
    veces: (s) => (s.match(re) || []).length,
    aplicar: (s, poner) => s.replace(re, () => poner),
  };
};

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
  // Los saltos de línea de los patrones multilínea dan igual: el runner los normaliza (ver arriba).
  ['15· marcar el plan se salta el gate Premium',
    "  if(typeof isFreeClient==='function'&&isFreeClient(c))return;\n  if(typeof foodLogMarkPlanMeal!=='function')return;",
    "  if(typeof foodLogMarkPlanMeal!=='function')return;",
    'app-5-salud.js'],
  ['16· el botón de marcar llama a una función que no existe (no hace nada y no da error)',
    'function flTogglePlanMeal(idx){',
    'function flTogglePlanMealRenombrada(idx){',
    'app-5-salud.js'],

  // ── La FRANJA y la SEMANA (patrones 2, 3 y 6 del estudio) ────────────────
  ['17· la franja se aprieta por debajo de lo que el plato entrega (le diría «te pasaste» a quien comió su plan)',
    // 🔁 El ancho ya se ha movido tres veces (0.12 → 0.14 en v490 al corregir las filas sin fuente,
    // 0.14 → 0.13 en v501 al contar el plato con la caloría de la tabla). **Este patrón cita el
    // valor vigente, así que hay que re-anclarlo cada vez que la constante se re-mida** — ya se
    // despegó una vez y el runner lo cantó como «no mordió». Lo que se sabotea no es el número:
    // es que la franja quede MÁS ESTRECHA de lo que el plato entrega, y por eso se aprieta a 0.08.
    'const FOODLOG_BAND = 0.13;',
    'const FOODLOG_BAND = 0.08;'],
  ['18· «lo que falta» vuelve a medirse contra la cifra EXACTA en vez de la franja',
    '    falta: Math.max(0, Math.round(lo - h)),',
    '    falta: Math.max(0, Math.round(m - h)),'],
  ['19· la franja deja de decir en qué lado se cayó (todo «dentro»)',
    "    estado: h < lo ? 'bajo' : (h > hi ? 'alto' : 'dentro'),",
    "    estado: 'dentro',"],
  ['20· un día SIN registrar se pinta como si hubiera comido cero (el promedio que miente)',
    '    const band = (d.n > 0 && t) ? foodLogBandFor(t.kcal, d.kcal) : null;',
    '    const band = t ? foodLogBandFor(t.kcal, d.kcal) : null;'],
  // Ancla única: `targetsPorDia[d.dayIndex]` aparece también en `foodLogAdherence` (la ficha del
  // coach), así que el patrón se ancla con la línea de al lado, que solo existe aquí.
  ['21· la fila de la semana compara todos los días contra el objetivo del MISMO día',
    '    const t = targetsPorDia && targetsPorDia[d.dayIndex];\n    const band = (d.n > 0 && t) ? foodLogBandFor(t.kcal, d.kcal) : null;',
    '    const t = targetsPorDia && targetsPorDia[0];\n    const band = (d.n > 0 && t) ? foodLogBandFor(t.kcal, d.kcal) : null;'],
  ['22· la pantalla se inventa su propio ancho de franja (segunda verdad)',
    '  const _band=(typeof foodLogBandFor===',
    '  const _band=(function(m,h){const lo=Math.round(m*0.88),hi=Math.round(m*1.12);return{lo,hi,meta:m,hecho:h,estado:h<lo?"bajo":(h>hi?"alto":"dentro"),falta:Math.max(0,Math.round(lo-h)),sobra:Math.max(0,Math.round(h-hi))};})(pr.kcal.meta,pr.kcal.hecho)||(typeof foodLogBandFor===',
    'app-5-salud.js'],
  ['23· desaparece la fila de los 7 días',
    'function _flSemanaHtml(c){',
    'function _flSemanaHtmlRenombrada(c){',
    'app-5-salud.js'],

  ['24· el coach juzga el mismo día con OTRA vara que la asesorada (él naranja, ella «vas bien»)',
    "const _FL_DESVIO_MEDIO=(typeof FOODLOG_BAND==='number')?Math.round(FOODLOG_BAND*100):12;",
    'const _FL_DESVIO_MEDIO=12;',
    'app-3-coach.js'],
  ['25· el chip del coach marca desvío JUSTO en el borde donde ella sigue dentro',
    'const grave=Math.abs(pct)>=25, medio=Math.abs(pct)>_FL_DESVIO_MEDIO;',
    'const grave=Math.abs(pct)>=25, medio=Math.abs(pct)>=_FL_DESVIO_MEDIO;',
    'app-3-coach.js'],

  ['26· el tour de novedades vuelve a recortar ANTES de filtrar (el tier libre se queda sin nada)',
    '    .filter(n => conCoach || !n.coach)' + String.fromCharCode(10) + '    .sort((a, b) => b.v - a.v)',
    '    .sort((a, b) => b.v - a.v)'],

  // ── La LISTA DEL MERCADO (patrón 4 del estudio) ──────────────────────────
  ['27· la lista del mercado se deja los acompañantes (manda a la persona sin la mitad de la compra)',
    "      (m.acompIds || []).forEach(id => {\n        const f = NUT_FOOD_BY_ID[id];\n        if (f) acum[id] = (acum[id] || 0) + nutAcompGrams(f);\n      });",
    '      // sabotaje'],
  ['28· la lista cuenta solo UN día en vez de los siete',
    '  NUT_WEEK_DAYS.forEach((name, i) => {\n    const rut = rs.find(r => r && r.day === name) || null;\n    const plan = nutDayPlan(base, nutDayKind(rut), shape.trainDays, shape.legDays, i);',
    '  NUT_WEEK_DAYS.slice(0, 1).forEach((name, i) => {\n    const rut = rs.find(r => r && r.day === name) || null;\n    const plan = nutDayPlan(base, nutDayKind(rut), shape.trainDays, shape.legDays, i);'],
  ['29· la compra de la semana queda recortada por el tope de UNA ración',
    '  const g = Math.round(parseFloat(grams) || 0);\n  if (!food || !(g > 0)) return null;',
    '  let g = Math.round(parseFloat(grams) || 0);\n  if (!food || !(g > 0)) return null;\n  if (food.maxG > 0) g = Math.min(g, food.maxG);'],
  ['30· los huevos se piden por PESO en vez de por unidad',
    "  const porUnidad = food.compra === 'un' && !!cuenta;",
    '  const porUnidad = false;'],
  ['31· la lista redondea los huevos hacia ABAJO (se queda corta el viernes)',
    '  const n = (un && un.g > 0) ? Math.ceil(g / un.g) : null;',
    '  const n = (un && un.g > 0) ? Math.floor(g / un.g) : null;'],
  // 🔴 v490 · ESTE SABOTAJE LLEVABA SIN APLICARSE DESDE v481 y nadie lo notó: apuntaba al campo
  // `cocido` del marcado alimento-por-alimento, que v481 BORRÓ a propósito al cambiarlo por una
  // frase única e incondicional (`NUT_SHOP_NOTA`). O sea que la matriz venía contando un candado
  // que ya no existía. Reapuntado al mecanismo VIVO: si la frase deja de nombrar las dos
  // direcciones, la lista vuelve a mentirle a quien compra carne. (Lo delató el «NO SE APLICÓ»
  // del propio runner — sin ese grito habría pasado por un ✅ más de la lista.)
  ['32· la nota del mercado deja de decir las DOS direcciones (la carne pesa MÁS cruda)',
    'el arroz, la pasta y los granos pesan menos crudos, y las carnes, la papa, la yuca y el plátano pesan más.',
    'el arroz, la pasta y los granos pesan menos crudos.'],
  ['33· un botón usa un icono que no existe (pinta ✨ en silencio)',
    "aviIcon('utensils',21)",
    "aviIcon('nutricion',21)",
    'app-5-salud.js'],

  // ── CONTROL: un cambio inocuo NO debe poner la suite roja ────────────────
  // Sin esto no se sabe si los 16 de arriba muerden por lo que dicen morder o porque cualquier
  // toque en el archivo rompe algo. Un control que no puede pasar no es un control.
  ['C· CONTROL (debe seguir VERDE): tocar el archivo sin tocar el candado',
    'const FOODLOG_PLAN_PREFIX = ',
    'const FOODLOG_PLAN_PREFIX = /* control del sabotaje */ ',
    'avi-core.js', 'verde'],
  // ── UNA SOLA DEFINICIÓN DE CALORÍA (v501) ───────────────────────────────────────────────
  ['35· el plato vuelve a contarse con la fórmula genérica 4p+4c+9f en vez de la caloría de la tabla',
    '    gotK += food.kcal * por.grams / 100;',
    '    gotK += (food.p * 4 + food.c * 4 + food.f * 9) * por.grams / 100;'],
  ['36· los ACOMPAÑANTES (las verduras, donde la fórmula se pasa hasta +28,7%) vuelven a derivarse',
    '    kcal += food.kcal * g / 100;',
    '    kcal += (food.p * 4 + food.c * 4 + food.f * 9) * g / 100;'],
  ['37· el total del DÍA se re-deriva desde los macros redondeados en vez de sumar sus comidas',
    '  real.kcal = meals.reduce((a, m) => a + m.real.kcal, 0);',
    '  real.kcal = Math.round(real.prot_g * 4 + real.carb_g * 4 + real.fat_g * 9);'],
];

const ARCHIVOS = ['avi-core.js', 'app-5-salud.js', 'app-3-coach.js'];
const RUTA = n => new URL('../../' + n, import.meta.url);
const ORIGINAL = Object.fromEntries(ARCHIVOS.map(n => [n, readFileSync(RUTA(n), 'utf8')]));

let ok = 0, fallos = [];
try {
  for (const [nombre, buscar, poner, archivo = 'avi-core.js', espera = 'rojo'] of SABOTAJES) {
    const original = ORIGINAL[archivo];
    const b = buscador(buscar);
    const veces = b.veces(original);
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces en ${archivo} (esperaba 1)`);
      fallos.push(nombre);
      continue;
    }
    writeFileSync(RUTA(archivo), b.aplicar(original, poner), 'utf8');
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
