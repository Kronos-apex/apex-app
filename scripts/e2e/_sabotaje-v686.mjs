// Matriz de sabotaje de v686 — la barra no recalcula la identidad en cada toque (R16 #5, costo de v681).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. El tiempo lo mide `_r16-verif-real.mjs`
// («barra por guardado»: 17,1 → 9 ms con los datos reales). Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v686.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e4: join(ROOT, 'app-4-entreno.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la identidad que se le pasa se ignora', 'core',
    "  const idt = (idtOpt && typeof idtOpt.keyOf === 'function') ? idtOpt : exerciseIdentity(history || []);",
    '  const idt = exerciseIdentity(history || []);'],
  ['acepta cualquier cosa como identidad', 'core',
    "  const idt = (idtOpt && typeof idtOpt.keyOf === 'function') ? idtOpt : exerciseIdentity(history || []);",
    '  const idt = idtOpt || exerciseIdentity(history || []);'],
  ['el guardado ya no pasa la identidad', 'e4',
    "sessionBarKg(routine,ei,ex,_barIdt):null;", "sessionBarKg(routine,ei,ex):null;"],
  ['la identidad se arma aunque no haya barra', 'e4',
    "  const _barIdt=((routine.exercises||[]).some(e=>typeof barDefaultKg==='function'&&barDefaultKg(e)!=null)&&typeof exerciseIdentity==='function')",
    "  const _barIdt=(typeof exerciseIdentity==='function')"],
  ['sessionBarKg no pasa la identidad', 'e4',
    "  return exerciseBarKg((DB.history&&DB.history[CUR.clientId])||[],ex,idt);",
    "  return exerciseBarKg((DB.history&&DB.history[CUR.clientId])||[],ex);"],
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
