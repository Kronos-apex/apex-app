// Matriz de sabotaje de v694 — el aviso de salto guarda también «lo corrijo» + el lote técnico de R17.
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. El check [13b] del hook (teléfonos y uid
// reales) se prueba aparte, contra el hook mismo, con datos del respaldo (5/5 el 30-sep: 3 frenan, 2 controles pasan).
// Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v694.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), c1: join(ROOT, 'app-1-infra.js'), c4: join(ROOT, 'app-4-entreno.js'), c6: join(ROOT, 'app-6-extra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const BS = String.fromCharCode(92);   // la barra invertida del escape del festivo, sin que ninguna herramienta la interprete

const SABOTAJES = [
  ['«lo corrijo» se vuelve a perder', 'c4', "const saltoOtro=(_salto&&_salto.estado!=='corte')?_salto.estado:null;", 'const saltoOtro=null;'],
  ['el ejercicio guardado no lleva el estado', 'c4', '...(saltoOtro?{salto:saltoOtro}:{}),', ''],
  ['vuelve el santo equivocado', 'core', "'Día de San Jos" + BS + "u00e9'", "'Día de San Jorge'"],
  ['migrateEnv sin guarda de módulo', 'c1', "try{ if(typeof migrateEnv==='function')migrateEnv(); }", 'try{ migrateEnv(); }'],
  ['healExerciseEnv sin guarda de módulo', 'c1', "try{ if(typeof healExerciseEnv==='function')healExerciseEnv(); }", 'try{ healExerciseEnv(); }'],
  ['reg.update() otra vez sin .catch', 'c6', "const p=reg.update(); if(p&&typeof p.catch==='function')p.catch(()=>{});", 'reg.update();'],
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
