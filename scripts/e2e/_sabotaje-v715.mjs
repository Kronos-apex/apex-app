// Matriz de sabotaje de v715 — las casillas de la serie con letra grande. Cada fila devuelve UNA regla al
// valor de antes y la suite TIENE que ponerse roja. Que esas reglas son las que evitan el corte lo prueba
// `_verify-casillas-letra.mjs` (su CONTROL vuelve a poner el CSS viejo y exige ver el corte).
//   node scripts/e2e/_sabotaje-v715.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la casilla vuelve a 10 px de relleno', 'css', 'padding:8px 3px;font-family', 'padding:8px 10px;font-family'],
  ['la fila vuelve a sus rellenos normales con letra grande', 'css',
    'grid-template-columns:28px 1fr 1fr auto; column-gap:6px; padding-left:8px; padding-right:8px;',
    'grid-template-columns:32px 1fr 1fr auto; column-gap:8px; padding-left:12px; padding-right:12px;'],
  ['la tarjeta vuelve a 18 px con «Muy grande»', 'css', '.gm-ex-card{ padding-left:12px; padding-right:12px; }', '.gm-ex-card{ padding-left:18px; padding-right:18px; }'],
  ['la casilla vuelve a 16 px con «Muy grande»', 'css', '.gm-sinput{ font-size:15px; }', '.gm-sinput{ font-size:16px; }'],
  ['el chulo vuelve a 38 px con «Muy grande»', 'css', '.gm-check{ width:34px; height:34px; }', '.gm-check{ width:38px; height:38px; }'],
  ['las casillas de una fila vuelven a arrancar a distinta altura', 'css', '>div:not(.gm-set-num){ align-self:start; }', '>div:not(.gm-set-num){ }'],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar0, poner0] of SABOTAJES) {
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const buscar = buscar0.replace(/\n/g, eol), poner = poner0.replace(/\n/g, eol);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let rojo = false;
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { rojo = true; } finally { escribir(F[archivo], orig[archivo]); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
