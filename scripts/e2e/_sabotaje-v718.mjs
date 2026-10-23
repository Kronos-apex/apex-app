// Matriz de sabotaje de v718 — «Cardio a tu ritmo» en los entrenamientos rápidos. Cada fila devuelve UNA
// pieza a la conducta de antes (o a una conducta mala) y la suite TIENE que ponerse roja. El recorrido en el
// navegador (ventana, atrás, clic real, minutos por actividad) lo prueba `_verify-qw-cardio.mjs`.
//   node scripts/e2e/_sabotaje-v718.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), entreno: join(ROOT, 'app-4-entreno.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['una opción apunta a un HIIT (e74) y no a un cardio continuo', 'core',
    "{ id: 'e64',  label: 'Bicicleta estática'", "{ id: 'e74',  label: 'Bicicleta estática'"],
  ['todas las actividades comparten el mismo id de rutina (sus minutos se mezclan)', 'core',
    "return { id: 'qw_cardio_' + optId,", "return { id: 'qw_cardio',"],
  ['el tipo del coach (HIIT) vuelve a mandar sobre el cardio continuo', 'core',
    "{ sets: 1, reps: min > 0 ? min : 20, track: 'cardio' }", "{ sets: 1, reps: min > 0 ? min : 20 }"],
  ['los intervalos del coach se cuelan en el cardio continuo', 'core', '  delete ex.hiit;\n', ''],
  ['una opción que no existe arma igual una rutina', 'core',
    '  const opt = QUICK_CARDIO_OPTIONS.find(o => o.id === optId);\n  if (!opt) return null;',
    "  const opt = QUICK_CARDIO_OPTIONS.find(o => o.id === optId) || { id: optId, label: optId };"],
  ['un catálogo viejo sin el ejercicio deja la rutina sin nombre', 'core',
    "|| { id: optId, name: opt.label, muscle: 'cardio', type: 'Cardio' };", "|| { id: optId, muscle: 'cardio', type: 'Cardio' };"],
  ['tocar la tarjeta del cardio ya no abre las opciones', 'entreno', "  if(spec.cardio){ openQuickCardio(); return; }\n", ''],
  ['«Cardio a tu ritmo» deja de ser la primera tarjeta', 'entreno',
    "  {id:'qw_cardio', emoji:'❤️'", "  {id:'qw_cardio_x', emoji:'❤️'"],
  ['la opción arranca sin el catálogo del código (copia vieja de ax_e)', 'entreno',
    "quickCardioRoutine(exId,(DB.exercises||[]).concat(typeof defaultExercises!=='undefined'?defaultExercises:[]))",
    'quickCardioRoutine(exId,DB.exercises||[])'],
  ['la entrada de «Hoy» deja de decir que ahí hay cardio', 'html',
    '<small>Cardio, HIIT, abdomen, movilidad…</small>', '<small>Entrenamientos rápidos — HIIT, abdomen, movilidad…</small>'],
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
