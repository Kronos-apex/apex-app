// Matriz de sabotaje del REPARTO DE CARBOHIDRATO (`pick.carb2`, v472 + el arreglo del piso v475).
// Rompe cada candado del solver y exige que la suite se ponga ROJA.
// Este frente ya se comió tres defectos propios (el piso aplicado después del solver, el descuento
// cruzado restado dos veces, y la puerta mirando el objetivo bruto en vez de lo que se sirve), así
// que sus candados son de los que más falta hace mantener con dientes.
// Corre: node scripts/e2e/_sabotaje-carb2.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// ⚠️ Los archivos del repo van con CRLF: los patrones se anclan en UNA sola línea, nunca con `\n`.
const SABOTAJES = [
  ['1· la puerta vuelve a mirar el objetivo BRUTO en vez de lo que se sirve (el bug P1-1: «15 g de plátano»)',
    'const usaDos = !!(_conDos && _conDos.gC2 >= _c2min);',
    'const usaDos = !!(carb2 && carb2.c > 0 && (tC * NUT_CARB2_SHARE / carb2.c * 100) >= _c2min);'],
  ['2· el piso desaparece: se parte el plato aunque al segundo le toquen migajas',
    'const usaDos = !!(_conDos && _conDos.gC2 >= _c2min);',
    'const usaDos = !!_conDos;'],
  ['3· el reparto se apaga del todo (vuelve el carbohidrato único y sus raciones enormes)',
    'const usaDos = !!(_conDos && _conDos.gC2 >= _c2min);',
    'const usaDos = false;'],
  ['4· el descuento cruzado se aplica DOS veces, una por rama (hunde la entrega de carbohidrato)',
    "      gC = falta * (parte ? 1 - NUT_CARB2_SHARE : 1) / carb.c * 100;",
    "      gC = Math.max(0, tC * (parte ? 1 - NUT_CARB2_SHARE : 1) - ap(prot, gP, 'c') - ap(fat, gF, 'c')) / carb.c * 100;"],
  ['5· `carb2` deja de descontar su propia proteína (el plato la sirve dos veces)',
    "      gP = Math.max(piso, (tP - ap(carb, gC, 'p') - ap(carb2, gC2, 'p') - ap(fat, gF, 'p')) / prot.p * 100);",
    "      gP = Math.max(piso, (tP - ap(carb, gC, 'p') - ap(fat, gF, 'p')) / prot.p * 100);"],
  ['6· la grasa deja de descontar lo que aporta el segundo carbohidrato',
    "      gF = Math.max(0, (tF - ap(prot, gP, 'f') - ap(carb, gC, 'f') - ap(carb2, gC2, 'f')) / fat.f * 100);",
    "      gF = Math.max(0, (tF - ap(prot, gP, 'f') - ap(carb, gC, 'f')) / fat.f * 100);"],
  // ── El escalón chico de medida casera (v476) ──
  ['7· desaparece la medida CHICA: vuelven «avena 15 g» y «maní 5 g»',
    '  const chica = escalon(food.un2);',
    '  const chica = null;'],
  ['8· la medida chica MANDA sobre la grande («8 cucharadas de avena» en vez de «1 taza»)',
    '  const grande = escalon(food.un);',
    '  const grande = food.un2 ? null : escalon(food.un);'],
];
// ⚠️ NO se pone aquí un «sabotaje» que afloje el tope del guardián de extremos: aflojar un tope
// deja la suite VERDE por definición, así que nunca mordería. Contra eso no protege una matriz de
// sabotaje sino la razón escrita en el test — y el precedente de que el 14 se puso sobre un
// +13,04% que nadie ha vuelto a reproducir.

const ARCHIVO = 'avi-core.js';
const RUTA = new URL('../../' + ARCHIVO, import.meta.url);
const ORIGINAL = readFileSync(RUTA, 'utf8');

let muerden = 0;
try {
  for (const [nombre, buscar, poner] of SABOTAJES) {
    const veces = ORIGINAL.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    writeFileSync(RUTA, ORIGINAL.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node --test avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    writeFileSync(RUTA, ORIGINAL, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  writeFileSync(RUTA, ORIGINAL, 'utf8');
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
