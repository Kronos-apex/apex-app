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
    n: 'S1 · el plan ESCRITO A MANO deja de pasar por la banda (el defecto original de v485)',
    de: `    return nutMinorBandBase({
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
    n: 'S2 · la CALCULADORA deja de pasar por la banda de la salida',
    de: `  const b = nutMinorBandBase({ origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee }, client, weightKg);`,
    a: `  const b = Object.assign({ origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee });`,
    // 🟡 Desde v493 la banda vive DENTRO de `nutritionEstimate` (para que la habitación y el plato
    // no den números distintos), así que esta capa quedó siendo lo que su comentario siempre dijo
    // ser: el respaldo de la SALIDA. Ya no mueve el resultado por su cuenta y el verde es correcto
    // — lo que lo prueba es S2b, que mata las dos y sí cae. Se conserva porque la garantía tiene
    // que ser de `nutBaseFor`, no de que quien toque la otra puerta se acuerde de la regla.
    verdeEsperado: 'la banda ya se aplicó dentro de nutritionEstimate; S2b prueba que esta capa no es adorno',
  },
  {
    n: 'S2b · LAS DOS CAPAS de la calculadora muertas a la vez',
    de: `  const _band = nutMinorBandBase({ kcalObj, macros }, client, w);`,
    a: `  const _band = { kcalObj, macros };`,
    ademas: {
      de: `  const b = nutMinorBandBase({ origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee }, client, weightKg);`,
      a: `  const b = Object.assign({ origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee });`,
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
    // ⚠️ Esta guarda es IDÉNTICA en el piso y en el techo desde v493: se ancla con la línea de
    // abajo, que solo existe en el piso. El runner lo cazó gritando «NO SE APLICÓ».
    de: `  if (!base || !base.macros || !client || !isMenor(client)) return base;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);
  const tdee = nutMinorTdee(client, w);
  // 🔴 Sin gasto conocido NO se inventa un piso`,
    a: `  if (!base || !base.macros || !client) return base;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);
  const tdee = nutMinorTdee(client, w);
  // 🔴 Sin gasto conocido NO se inventa un piso`,
  },
  {
    n: 'S6 · el piso INVENTA superávit sobre un plan que ya estaba bien',
    de: `  if (base.kcalObj >= piso) return base;`,
    a: `  if (false) return base;`,
  },
  {
    n: 'S7 · la banda se inventa un gasto cuando falta el sexo',
    // El cálculo del gasto del menor vive en `nutMinorTdee` desde v493 (antes estaba copiado en el
    // piso y en el techo, y el patrón dejó de ser único: el runner gritó «NO SE APLICÓ»).
    de: `  const sx = client && (client.sex === 'M' || client.sex === 'F') ? client.sex : null;
  if (!sx) return null;`,
    a: `  const sx = client && (client.sex === 'M' || client.sex === 'F') ? client.sex : 'F';
  if (!sx) return null;`,
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
    return { status: 'menor_bajo_gasto', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch };
  }`,
    a: `  if (false) { return { status: 'menor_bajo_gasto', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch }; }`,
  },
  {
    n: 'S14 · el revisor vuelve a mirar SOLO los números (el rótulo puede mentir en paz)',
    de: `  if (mismatch) return { status: 'rotulo_miente', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch, sirve: _kcalSirve };`,
    a: `  if (false) return { status: 'rotulo_miente', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch, sirve: _kcalSirve };`,
  },
  // 🗑️ S15 RETIRADO en v493. Saboteaba el `ref = gasto × 1,05` del detector, y ese mecanismo ya
  // no existe: la franja (S27) cubre lo mismo y con más alcance, así que el `ref` quedó redundante
  // y se borró. Se supo porque el sabotaje salió VERDE — la primera hipótesis de un verde no es
  // «falta un test», es «ese código sobra». El candado vivo de esta conducta es S27.
  {
    n: 'S16 · el rótulo se compara contra el titular ESCRITO y no contra lo que se SIRVE',
    de: `  const _kcalSirve = (_srv && _srv.kcalObj) || actual;`,
    a: `  const _kcalSirve = actual;`,
  },
  {
    n: 'S17 · el aviso de rótulo se cuela DELANTE de la regla dura del menor',
    de: `  if (isMenor(client) && gap < 0) {`,
    a: `  if (isMenor(client) && gap < 0 && false) {`,
  },

  // ── EL TECHO (v493, REGLA 3 del dictamen) ────────────────────────────────────────────────
  {
    n: 'S18 · el TECHO no existe (vuelve el +350 de la calculadora a una menor con sobrepeso)',
    de: `  return nutMinorFloorBase(nutMinorCapBase(base, client, weightKg), client, weightKg);`,
    a: `  return nutMinorFloorBase(base, client, weightKg);`,
  },
  {
    n: 'S19 · el techo se le aplica también a un ADULTO (solo la guarda de `nutMinorTecho`)',
    de: `  if (!(tdee > 0) || !client || !isMenor(client)) return null;`,
    a: `  if (!(tdee > 0) || !client) return null;`,
    // 🟡 `nutMinorCapBase` ya pregunta la edad antes de llamar aquí, así que romper solo esta no
    // mueve a nadie. NO se borra porque `nutMinorTecho` es PÚBLICA (la usan los tests y mañana
    // otra superficie): una función que devuelve el techo de un adulto es una trampa esperando.
    // Que no sea adorno lo prueba S19b, que mata las DOS y sí cae. Patrón de S2/S2b.
    verdeEsperado: 'la guarda de nutMinorCapBase la cubre; S19b prueba que la pareja sostiene',
  },
  {
    n: 'S19b · LAS DOS guardas de edad del techo muertas a la vez',
    de: `  if (!(tdee > 0) || !client || !isMenor(client)) return null;`,
    a: `  if (!(tdee > 0) || !client) return null;`,
    ademas: {
      de: `  if (!base || !base.macros || !client || !isMenor(client)) return base;
  if (!(base.kcalObj > 0)) return base;`,
      a: `  if (!base || !base.macros || !client) return base;
  if (!(base.kcalObj > 0)) return base;`,
    },
  },
  {
    n: 'S20 · el «sobrepeso» deja de mirar la EDAD (vuelve al corte fijo de adulto)',
    de: `  const corte = WHO_BMI_SD1[sx][parseInt(client.age)];`,
    a: `  const corte = 25;`,
  },
  {
    n: 'S21 · el corte deja de mirar el SEXO (usa la tabla de mujeres para todos)',
    de: `  const corte = WHO_BMI_SD1[sx][parseInt(client.age)];`,
    a: `  const corte = WHO_BMI_SD1.F[parseInt(client.age)];`,
  },
  {
    n: 'S22 · el recorte le baja la PROTEÍNA (escala los tres en vez de tocar el carbohidrato)',
    de: `  const prot_g = Math.min(base.macros.prot_g, Math.round(ref * NUT_MENOR_PROT_MAX));`,
    a: `  const prot_g = Math.round(base.macros.prot_g * techo / base.kcalObj);`,
  },
  {
    n: 'S23 · el techo se cumple dejando a la persona SIN carbohidrato (el 0-carb de v428, al revés)',
    de: `  if (apretado) carb_g = carbMin;`,
    a: `  if (false) carb_g = carbMin;`,
  },
  {
    n: 'S24 · el rótulo sigue explicándole VOLUMEN a quien ya no lleva superávit',
    de: `  if (goalKey === 'volumen' && nutMinorBmiOver(client, weightKg)) return 'mantenimiento';`,
    a: `  if (false) return 'mantenimiento';`,
  },
  {
    n: 'S25 · la etiqueta sigue anunciando el superávit que la banda acaba de quitar (v437)',
    de: `  if (_band.minorCap) {
    out.label = _band.minorCap.sobrepeso`,
    a: `  if (false) {
    out.label = _band.minorCap.sobrepeso`,
  },
  {
    n: 'S26 · la ficha del coach se calla con un menor POR ENCIMA de su techo',
    de: `  if (isMenor(client) && _srv && _srv.minorCap) {`,
    a: `  if (false && _srv && _srv.minorCap) {`,
  },
  {
    n: 'S27 · el detector vuelve a marcar la FRANJA que la app misma impone',
    de: `  if (client && isMenor(client) && tdee > 0 && kcal > 0
    && kcal >= Math.round(tdee * NUT_MENOR_PISO_MARGEN)
    && kcal <= Math.round(tdee * NUT_MENOR_TECHO_MARGEN) + NUT_MENOR_GRANO) return null;`,
    a: `  if (false) return null;`,
  },
  {
    n: 'S28 · el techo pierde su margen (+10% → sin tope real)',
    de: `const NUT_MENOR_TECHO_MARGEN = 1.10;`,
    a: `const NUT_MENOR_TECHO_MARGEN = 1.60;`,
  },
  {
    n: 'S29 · se cae el grano y el recorte deja de ser IDEMPOTENTE',
    de: `  if (!techo || base.kcalObj <= techo + NUT_MENOR_GRANO) return base;`,
    a: `  if (!techo || base.kcalObj <= techo) return base;`,
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
