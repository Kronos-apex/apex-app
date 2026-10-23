// Matriz de sabotaje de v719 — el volteo de llanta en el catálogo. Cada fila devuelve UNA pieza a una conducta
// mala y la suite TIENE que ponerse roja. Que la casilla diga VOLTEOS y no ofrezca lastre en el navegador lo
// prueba `_verify-llanta.mjs`.
//   node scripts/e2e/_sabotaje-v719.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { cat: join(ROOT, 'app-1-infra.js'), core: join(ROOT, 'avi-core.js'), extra: join(ROOT, 'app-6-extra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la llanta vuelve a pedir KG (sin track reps)', 'cat', "type:'Funcional',track:'reps',sets:3,reps:5", "type:'Funcional',sets:3,reps:5"],
  ['la llanta pasa a ser de espalda (el generador la mete en planes)', 'cat', "name:'Volteo de Llanta (Tire Flip)',muscle:'otro'", "name:'Volteo de Llanta (Tire Flip)',muscle:'espalda'"],
  ['la llanta baja a nivel intermedio', 'cat', "env:['gym','parque'],level:'A',desc:'Volteo", "env:['gym','parque'],level:'I',desc:'Volteo"],
  ['el texto del asesorado pierde «sin jalar con los brazos»', 'cat', 'empujando con las piernas y la cadera, sin jalar con los brazos.', 'empujando con las piernas y la cadera.'],
  ['la llanta vuelve al ícono que sale como cuadro vacío', 'cat', "sets:3,reps:5,icon:'🏋️',env:['gym','parque']", "sets:3,reps:5,icon:'🛞',env:['gym','parque']"],
  ['la llanta sale de lumbar', 'core', "caminata del granjero|farmer|paseo del camarero|camarero|volteo de llanta|tire flip/,\r\n  hombro", "caminata del granjero|farmer|paseo del camarero|camarero/,\r\n  hombro"],
  ['la llanta sale de codo', 'core', "caminata del cangrejo|caminata del granjero|farmer|paseo del camarero|camarero|volteo de llanta|tire flip/,", "caminata del cangrejo|caminata del granjero|farmer|paseo del camarero|camarero/,"],
  ['la llanta sale de pecho', 'core', 'contractora|fondos|lanzamiento|azote|volteo de llanta|tire flip/,', 'contractora|fondos|lanzamiento|azote/,'],
  ['la llanta entra a tobillo (regla ancha)', 'core', 'caminata del oso|caminata del cangrejo/,', 'caminata del oso|caminata del cangrejo|volteo de llanta/,'],
  ['los menores de 16 vuelven a poder recibirla', 'core', 'militar con barra|volteo de llanta|tire flip/);', 'militar con barra/);'],
  ['la casilla vuelve a decir REPS', 'core', "e382: 'volteos' };", "};"],
  ['el lastre vuelve a ofrecerse a todo lo que cuenta en reps', 'core', "return exTrack(ex || {}) === 'reps' && repsUnitOf(ex) === 'reps';", "return exTrack(ex || {}) === 'reps';"],
  ['el guiado deja de preguntar si aplica el lastre', 'extra', 'const gmLastre = lastreApplies(ex) && lastreOn(GM.routine,ei);', "const gmLastre = gmTrack==='reps' && lastreOn(GM.routine,ei);"],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar0, poner0] of SABOTAJES) {
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  // Las anclas se escriben con \r\n donde cruzan de línea; se adaptan al final de línea real del archivo.
  const buscar = buscar0.replace(/\r\n/g, eol), poner = poner0.replace(/\r\n/g, eol);
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
