// Matriz de sabotaje de v717 — el cardio anota sus minutos aunque nadie los teclee. Cada fila devuelve UNA
// pieza a la conducta de antes y la suite TIENE que ponerse roja. Que el minuto llega al historial en el
// navegador lo prueba `_verify-qw-cardio.mjs`.
//   node scripts/e2e/_sabotaje-v717.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), extra: join(ROOT, 'app-6-extra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['el cronómetro marca el cardio sin anotar lo que corrió', 'extra',
    "      gmLogCardio(ei, GM.restTotal); // v717 · lo que corrió, con los +15 s\n", ''],
  ['«✓ Completar» vuelve a buscar una fila que el cardio no tiene', 'extra',
    "  if(exTrack(ex)==='cardio'){ gmLogCardio(ei, null); return; }\n", ''],
  ['la regla ignora lo que corrió el cronómetro (se queda con la casilla)', 'core',
    'if (Number.isFinite(s) && s > 0) return Math.round(s / 6) / 10;', 'if (false) return Math.round(s / 6) / 10;'],
  ['la regla inventa 20 minutos cuando no hay ningún dato', 'core',
    '    if (Number.isFinite(n) && n > 0) return Math.round(n * 10) / 10;\n  }\n  return null;',
    '    if (Number.isFinite(n) && n > 0) return Math.round(n * 10) / 10;\n  }\n  return 20;'],
  ['gmLogCardio deja de escribir el minuto', 'extra',
    "  if(min!=null) setLog(rid, ei, 0, 'min', String(min));", '  if(min!=null) void 0;'],
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
