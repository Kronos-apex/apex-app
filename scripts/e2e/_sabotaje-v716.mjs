// Matriz de sabotaje de v716 — los cortes con letra grande. Cada fila devuelve UNA regla al valor de antes y la
// suite TIENE que ponerse roja. Que esas reglas son las que evitan los cortes lo prueba `_verify-cortes-letra.mjs`
// (su CONTROL vuelve a poner el CSS viejo y exige ver cada corte).
//   node scripts/e2e/_sabotaje-v716.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { css: join(ROOT, 'styles.css'), salud: join(ROOT, 'app-5-salud.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la tarjeta de cifra vuelve a columnas 1fr a secas', 'css', 'grid-template-columns:repeat(3,minmax(min-content,1fr))', 'grid-template-columns:repeat(3,1fr)'],
  ['la cifra de la tarjeta se vuelve a poder partir', 'css', 'line-height:1.1;white-space:nowrap}', 'line-height:1.1;word-break:break-word}'],
  ['con letra grande las tarjetas de cifra dejan de ir de a dos', 'css', 'flex:1 1 calc((100% - 9px) / 2); min-width:min-content;', 'min-width:0;'],
  ['la fila del ejercicio deja de partir en dos renglones', 'css', '.exrow{ flex-wrap:wrap; row-gap:4px; }', '.exrow{ row-gap:4px; }'],
  ['la sangría de la cifra del ejercicio vuelve a margin (se sale 58 px)', 'css', 'margin-left:0; padding-left:58px;', 'margin-left:58px;'],
  ['en Mis récords la sangría vuelve a margin', 'css', 'flex-basis:100%; padding-left:48px;', 'flex-basis:100%; margin-left:48px;'],
  ['la cifra de nutrición no baja con «Muy grande»', 'css', '.nutri-v{ font-size:18px; }', '.nutri-v{ }'],
  ['la cifra de nutrición vuelve a ir en línea', 'salud', '<div class="nutri-v" style="color:var(${col})">', '<div style="font-size:22px;font-weight:800;color:var(${col})">'],
  ['la cabecera de la sala deja de bajar bajo el ícono', 'css', '.sroom-hero{ flex-wrap:wrap; }', '.sroom-hero{ }'],
  ['el texto de la cabecera vuelve a encogerse a cero', 'css', '.sroom-hero-txt{ flex:1 1 0; min-width:min-content; }', '.sroom-hero-txt{ flex:1 1 0; }'],
  ['la píldora del coach vuelve a cortarse en seco', 'css', 'white-space:normal;text-wrap:balance}', 'white-space:nowrap;text-overflow:ellipsis}'],
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
