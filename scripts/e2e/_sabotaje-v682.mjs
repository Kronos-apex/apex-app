// Matriz de sabotaje de v682 — las reps en reserva: un toque en la última serie de cada ejercicio de
// peso, solo dato. Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que se ve en
// pantalla lo prueba `_verify-barra-rir.mjs`. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v682.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e4: join(ROOT, 'app-4-entreno.js'), e6: join(ROOT, 'app-6-extra.js'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la respuesta de ayer queda marcada hoy (no se borra con el día)', 'e4',
    "try{ Object.keys(localStorage).filter(k=>k.indexOf(lp)===0&&/_rir$/.test(k)).forEach(k=>localStorage.removeItem(k)); }catch(_e){}", ''],
  ['se guardan reps en reserva de una serie SIN hacer', 'e4',
    "const rir=(done&&typeof rirValue==='function')?", "const rir=(typeof rirValue==='function')?"],
  ['el entreno se guarda sin las reps en reserva', 'e4', ',...(rir!=null?{rir}:{})', ''],
  ['la pregunta va en la PRIMERA serie', 'e4',
    'function rirSetIndex(ex){ return Math.max(0,(parseInt(ex&&ex.sets)||3)-1); }', 'function rirSetIndex(ex){ return 0; }'],
  ['entra un 4 en la escala', 'core', 'return Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;', 'return Number.isInteger(n) && n >= 0 && n <= 4 ? n : null;'],
  ['«sin dato» se vuelve 0 (vacío = «no salía ni una»)', 'core',
    "if (v === '' || v == null || typeof v === 'boolean') return null;\n  const n = Number(v);\n  return Number.isInteger(n) && n >= 0 && n <= 3",
    "if (v == null || typeof v === 'boolean') return null;\n  const n = Number(v);\n  return Number.isInteger(n) && n >= 0 && n <= 3"],
  ['«3+» se dice como «3 exactas»', 'core', "n === 2 ? 'sobraban 2' : 'sobraban 3+'", "n === 2 ? 'sobraban 2' : 'sobraban 3'"],
  ['el campo pierde su tope', 'core', 'dist: 999, rir: 3 };', 'dist: 999 };'],
  ['una regla de progresión empieza a leer las reps en reserva', 'core', 'function perfIndex(kg, reps) {', 'function perfIndex(kg, reps, rir) {'],
  ['el descanso pregunta en CUALQUIER serie', 'e6', 'const rirEi=cerro?ei:null;', 'const rirEi=ei;'],
  ['se pregunta en ejercicios que no son de peso', 'e6', "if(!ex||exTrack(ex)!=='peso_reps'||typeof sessionRir!=='function'){", "if(!ex||typeof sessionRir!=='function'){"],
  ['la pregunta queda pintada en la plancha', 'e6',
    "  _gmRestRir(null); // v682: el mismo recuadro sirve a la plancha y al cardio — ahí no se pregunta\n  if(breEl) breEl.style.display='none';",
    "  if(breEl) breEl.style.display='none';"],
  ['responder vuelve a disparar el cierre', 'e6', "if(typeof resaveSessionPartial==='function') resaveSessionPartial(GM.routine);\n  const box=",
    "updateClientProgress(GM.routine);\n  const box="],
  ['un toque de más no se puede deshacer', 'e6', "cur===n?'':String(n)", 'String(n)'],
  ['la fila sale en ejercicios sin terminar', 'e6', "if(gmTrack==='peso_reps' && exAllDone && typeof sessionRir==='function'){", "if(gmTrack==='peso_reps' && typeof sessionRir==='function'){"],
  ['la tarjeta hecha vuelve a atenuarse entera (la pregunta a 2,57:1)', 'css',
    '.gm-ex-card.done{border-color:var(--g2)}', '.gm-ex-card.done{border-color:var(--g2);opacity:.6}'],
  ['el historial no lo muestra', 'e4', "${(typeof rirHistText==='function'&&rirHistText(st.rir))?`<div class=\"hist-rir\">${esc(rirHistText(st.rir))}</div>`:''}", ''],
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
