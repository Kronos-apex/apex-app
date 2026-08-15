// Matriz de sabotaje del CANDADO NUMÉRICO DE MENORES (v485).
//
// Rompe el arreglo de una forma distinta cada vez y exige que la suite se ponga ROJA. Un sabotaje
// que sale VERDE significa una de tres cosas, y hay que separarlas (gotcha de v471/v482):
//   (1) el test es débil · (2) ESE CÓDIGO SOBRA · (3) el sabotaje no se aplicó.
// Por (3) el runner GRITA si el patrón no aparece exactamente una vez: un «no se aplicó» se lee
// de reojo igual que un ✅ y en una lista larga se pierde.
//
// Los finales de línea de este repo NO son estables (git los reescribe al commitear), así que
// cada salto del patrón se compila como `\r?\n` en vez de perseguirlos a mano.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE = join(ROOT, 'avi-core.js');

const rx = (s) => new RegExp(s.split('\n').map(l =>
  l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'));

const SABOTAJES = [
  {
    n: 'S1 · el plan ESCRITO A MANO deja de pasar por el piso (el defecto original de v485)',
    de: `    return nutMinorFloorBase({
      origen: 'coach', kcalObj: macros.kcal, macros,
      kcalEscrito: Math.round(k), desfase: macros.kcal - Math.round(k),
    }, client, weightKg);`,
    a: `    return {
      origen: 'coach', kcalObj: macros.kcal, macros,
      kcalEscrito: Math.round(k), desfase: macros.kcal - Math.round(k),
    };`,
  },
  {
    // Hasta el 15-ago este sabotaje salía VERDE (lo tapaba el piso de dentro de `nutritionEstimate`)
    // y hubo que probar con S2b que no era código redundante. Con el margen ×1,05 del dictamen de
    // Andrés la capa de la salida MUEVE el resultado por su cuenta, así que ya muerde sola.
    n: 'S2 · la CALCULADORA deja de pasar por el piso de la salida',
    de: `  return nutMinorFloorBase({ origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee }, client, weightKg);`,
    a: `  return { origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee };`,
  },
  {
    n: 'S2b · LAS DOS CAPAS de la calculadora muertas a la vez',
    de: `  if (isMenor(client) && t.deficit < 0) {`,
    a: `  if (false && isMenor(client) && t.deficit < 0) {`,
    ademas: {
      de: `  return nutMinorFloorBase({ origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee }, client, weightKg);`,
      a: `  return { origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee };`,
    },
  },
  {
    n: 'S3 · el piso sube «algo» pero no hasta el gasto (afirma el SIGNO, no la DOSIS)',
    de: `  const factor = piso / base.kcalObj;`,
    a: `  const factor = 1 + (piso / base.kcalObj - 1) * 0.3;`,
  },
  {
    n: 'S4 · se cae el remate del redondeo (el piso queda unas kcal por debajo)',
    de: `  if (macros.kcal < piso) {
    macros.carb_g += Math.ceil((piso - macros.kcal) / 4);
    macros.kcal = nutMacroKcal(macros);
  }`,
    a: `  if (false) { macros.kcal = nutMacroKcal(macros); }`,
  },
  {
    n: 'S5 · el piso se aplica a TODO EL MUNDO (borra el déficit legítimo de un adulto)',
    de: `  if (!base || !base.macros || !client || !isMenor(client)) return base;`,
    a: `  if (!base || !base.macros || !client) return base;`,
  },
  {
    n: 'S6 · el piso INVENTA superávit sobre un plan que ya estaba bien',
    de: `  if (base.kcalObj >= piso) return base;`,
    a: `  if (false) return base;`,
  },
  {
    n: 'S7 · el piso se inventa un gasto cuando falta el sexo',
    // ⚠️ El patrón del `sx` aparece DOS veces en avi-core (aquí y en `nutritionEstimate`), así que
    // se ancla con la línea de abajo, que solo existe dentro de `nutMinorFloorBase`. El runner lo
    // cazó gritando «NO SE APLICÓ» — para eso está.
    de: `  const sx = client.sex === 'M' || client.sex === 'F' ? client.sex : null;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);`,
    a: `  const sx = client.sex === 'M' || client.sex === 'F' ? client.sex : 'F';
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);`,
  },
  {
    n: 'S8 · el piso vuelca todo en carbohidrato (le cambia el reparto al coach)',
    de: `    prot_g: Math.min(Math.round(base.macros.prot_g * factor), protTecho),
    carb_g: Math.round(base.macros.carb_g * factor),
    fat_g: Math.round(base.macros.fat_g * factor),`,
    a: `    prot_g: base.macros.prot_g,
    carb_g: base.macros.carb_g + Math.ceil((piso - base.kcalObj) / 4),
    fat_g: base.macros.fat_g,`,
  },
  {
    n: 'S9 · el desfase del coach se recalcula DESPUÉS del piso (le echa encima lo nuestro)',
    de: `  return Object.assign({}, base, {
    kcalObj: macros.kcal, macros,
    minorFloor: {`,
    a: `  return Object.assign({}, base, {
    kcalObj: macros.kcal, macros, desfase: macros.kcal - (base.kcalEscrito || 0),
    minorFloor: {`,
  },
  {
    n: 'S10 · el piso pierde el margen del plato (vuelve al gasto pelado — dictamen de Andrés)',
    de: `const NUT_MENOR_PISO_MARGEN = 1.05;`,
    a: `const NUT_MENOR_PISO_MARGEN = 1.0;`,
  },
  {
    n: 'S11 · se cae el TECHO de proteína (un plan bajo escala hasta el disparate)',
    de: `    prot_g: Math.min(Math.round(base.macros.prot_g * factor), protTecho),`,
    a: `    prot_g: Math.round(base.macros.prot_g * factor),`,
  },
  {
    n: 'S12 · un menor sin datos de gasto se pasa EN SILENCIO (sin marcar)',
    de: `  if (!tdee) return Object.assign({}, base, { minorFloorUnknown: true });`,
    a: `  if (!tdee) return base;`,
  },
  {
    n: 'S13 · la ficha del coach vuelve a callarse con un menor bajo su gasto',
    de: `  if (isMenor(client) && gap < 0) {
    return { status: 'menor_bajo_gasto', gap, actual, sugerido: base.kcalObj, base };
  }`,
    a: `  if (false) { return { status: 'menor_bajo_gasto', gap, actual, sugerido: base.kcalObj, base }; }`,
  },
];

const original = readFileSync(CORE, 'utf8');
let mordieron = 0, verdes = [];

for (const s of SABOTAJES) {
  const pasos = [s].concat(s.ademas ? [s.ademas] : []);
  let roto = original, aplicoTodo = true;
  for (const p of pasos) {
    const re = rx(p.de);
    const hits = roto.match(new RegExp(re.source, 'g'));
    if (!hits || hits.length !== 1) {
      console.log(`🛑 ${s.n}\n   NO SE APLICÓ — el patrón aparece ${hits ? hits.length : 0} veces (debe ser 1). ARREGLA EL SABOTAJE.`);
      verdes.push(s.n + ' (NO SE APLICÓ)'); aplicoTodo = false; break;
    }
    const antes = roto;
    roto = roto.replace(re, p.a.replace(/\$/g, '$$$$'));
    if (roto === antes) { console.log(`🛑 ${s.n}\n   NO SE APLICÓ — el reemplazo no cambió nada.`); verdes.push(s.n + ' (NO SE APLICÓ)'); aplicoTodo = false; break; }
  }
  if (!aplicoTodo) continue;
  writeFileSync(CORE, roto);
  let rojo = false, detalle = '';
  try {
    execFileSync(process.execPath, [join(ROOT, 'avi.test.js')], { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;
    const out = String(e.stdout || '') + String(e.stderr || '');
    const m = out.match(/❌[^\n]*/g);
    detalle = m ? m.slice(0, 2).join(' · ') : '(la suite falló)';
  } finally {
    writeFileSync(CORE, original);
  }
  if (rojo) {
    mordieron++;
    console.log(`✅ ${s.n}\n   → la suite se puso ROJA: ${detalle}`);
    if (s.verdeEsperado) { verdes.push(s.n + ' (se esperaba VERDE y salió ROJO — revisa la nota)'); }
  } else if (s.verdeEsperado) {
    mordieron++;
    console.log(`🟡 ${s.n}\n   → VERDE ESPERADO: ${s.verdeEsperado}`);
  } else {
    verdes.push(s.n);
    console.log(`❌ ${s.n}\n   → la suite siguió VERDE. ¿test débil, código redundante, o sabotaje no aplicado?`);
  }
}

console.log(`\n${'─'.repeat(60)}\nMordieron (o salieron verdes por la razón medida) ${mordieron} de ${SABOTAJES.length}`);
if (verdes.length) { console.log('SIN EXPLICAR:'); verdes.forEach(v => console.log('  · ' + v)); process.exit(1); }
console.log('Matriz completa: cada sabotaje muerde, o tiene medida la razón por la que no.');
