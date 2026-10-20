// Matriz de sabotaje de v714 — la casilla del peso dice KG y, con la barra ELEGIDA, debajo el total
// («60» con barra de 15 → «75 kg con barra»). Cada fila devuelve UN defecto y la suite TIENE que ponerse
// roja. Lo que se ve en pantalla lo prueba `_verify-barra-rir.mjs`. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v714.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e6: join(ROOT, 'app-6-extra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['el total no suma la barra', 'core', "return fmtMiles(n + b) + ' kg con barra';", "return fmtMiles(n) + ' kg con barra';"],
  ['la coma decimal no suma', 'core', "const n = Number(s.replace(',', '.'));", 'const n = Number(s);'],
  ['la casilla VACÍA dice «15 kg con barra»', 'core', "  if (!s) return '';", ''],
  ['la casilla vuelve a decir DISCOS', 'e6', "g('kg'),'KG',false,B)", "g('kg'),'DISCOS',false,B)"],
  ['el total sale con una barra que la persona no eligió', 'e6', 'gmLastre, gmBarOk?gmBar:null)', 'gmLastre, gmBar)'],
  ['la línea recibe «elegida» sin sessionBarConfirmed', 'e6', 'gmBarLine(ei,ex,gmBar,gmBarOk)', 'gmBarLine(ei,ex,gmBar,true)'],
  ['el total no se reescribe al teclear', 'e6', ";gmBarTotal(this)", ''],
  ['gmBarTotal no lee lo tecleado', 'e6', 'sub.textContent=barTotalLabel(inp.value,inp.dataset.bar)', 'sub.textContent=barTotalLabel(inp.defaultValue,inp.dataset.bar)'],
  ['el total se pinta sin esc()', 'e6', '${esc(barTotalLabel(val,B.bar))}', '${barTotalLabel(val,B.bar)}'],
  ['la línea deja de decir qué se anota', 'e6', '· anota todos los discos`', '· se suma a todos los discos`'],
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
