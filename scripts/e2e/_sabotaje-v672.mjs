// Matriz de sabotaje de v672 — una corrección del coach hecha sin señal se reenvía sola si nadie tocó
// ESA columna (el «visto» mueve la fila y la dejaba retenida; auditoría del 25-sep, F3-1).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja.
// Reemplazos con FUNCIÓN, escritura ATÓMICA y el fin de línea tomado del propio archivo.
// node scripts/e2e/_sabotaje-v672.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), a1: join(ROOT, 'app-1-infra.js'), a3: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la regla nueva desaparece (vuelve a retener por el «visto»)', 'core',
    '      && coachColHash(lectura.valor) === entry.baseHash) return \'subir\';',
    '      && false) return \'subir\';'],
  ['reenvía aunque la columna haya cambiado (pisaría al asesorado)', 'core',
    '      && coachColHash(lectura.valor) === entry.baseHash) return \'subir\';',
    '      && coachColHash(lectura.valor) !== \'\') return \'subir\';'],
  ['la huella pasa también a ax_c (saltaría su fusión de tres vías)', 'core',
    "  if (entry.col !== 'msgs' && entry.col !== 'ax_c' && String(entry.col).indexOf('cs:') !== 0",
    "  if (entry.col !== 'msgs' && String(entry.col).indexOf('cs:') !== 0"],
  ['la huella depende del orden de las claves', 'core',
    '  try { s = canonJSON(v === undefined ? null : v); } catch (e) { return \'\'; }',
    '  try { s = JSON.stringify(v === undefined ? null : v); } catch (e) { return \'\'; }'],
  ['la cola deja de guardar la huella', 'a3',
    'ts:Date.now(),baseHash:baseHash});',
    'ts:Date.now()});'],
  ['la rama de los asesorados deja de pasar lo que la nube tenía', 'a1',
    '_cwqAdd(col,id,slice,undefined,_coachSnap[sk]);',
    '_cwqAdd(col,id,slice);'],
  ['la rama de los datos propios del coach deja de pasarlo', 'a1',
    '_cwqAdd(col,SELF_CLIENT_ID,slice,undefined,_coachSnap[sk]);',
    '_cwqAdd(col,SELF_CLIENT_ID,slice);'],
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
