// Matriz de sabotaje de v683 — la marca 1 s y el arranque que espera a TODOS los módulos (R16).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que ve la persona lo prueba
// `_verify-splash-v683.mjs` (con su control contra v682). Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v683.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), i1: join(ROOT, 'app-1-infra.js'), i2: join(ROOT, 'app-2-login.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['vuelve la espera fija de 2,8 s detrás de la marca', 'i1',
    "  // (El tope lo arma el arranque cuando ya cargaron TODOS los módulos: ver `_aviModulesReady`.)\n}",
    "  // (El tope lo arma el arranque cuando ya cargaron TODOS los módulos: ver `_aviModulesReady`.)\n  await new Promise(r=>setTimeout(r, 2800));\n}"],
  ['la marca se vuelve a quitar dentro de syncFromCloud (antes de la sesión)', 'i1',
    "  // (El tope lo arma el arranque cuando ya cargaron TODOS los módulos: ver `_aviModulesReady`.)\n}",
    "  // (El tope lo arma el arranque cuando ya cargaron TODOS los módulos: ver `_aviModulesReady`.)\n  const overlay=document.getElementById('avi-loading'); if(overlay) overlay.remove();\n}"],
  ['el tope se arma antes de tener los módulos', 'i1',
    "  // (El tope lo arma el arranque cuando ya cargaron TODOS los módulos: ver `_aviModulesReady`.)\n}",
    "  // (El tope lo arma el arranque cuando ya cargaron TODOS los módulos: ver `_aviModulesReady`.)\n  _aviArmSplashCap();\n}"],
  ['la marca se puede quitar dos veces', 'i1', 'if(_aviSplashGone)return; _aviSplashGone=true;', '_aviSplashGone=true;'],
  ['el arranque ya no espera a los módulos', 'i2', 'syncFromCloud().then(_aviModulesReady).then(async ()=>{', 'syncFromCloud().then(async ()=>{'],
  ['la espera de módulos no espera nada', 'i2',
    "    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>r(),{once:true});\n    else r();",
    '    r();'],
  ['la marca no se quita al final del arranque', 'i2', "  if(typeof aviHideSplash==='function')aviHideSplash();\n}).catch(e=>{", '}).catch(e=>{'],
  ['el mínimo deja de ser el segundo que decidió el PO', 'core', 'const SPLASH_MIN_MS = 1000;', 'const SPLASH_MIN_MS = 300;'],
  ['el tope se vuelve a alargar', 'core', 'const SPLASH_MAX_MS = 4000;', 'const SPLASH_MAX_MS = 12000;'],
  ['la marca se va sin cumplir el segundo', 'core',
    'return Math.max(0, Math.min(SPLASH_MIN_MS, SPLASH_MIN_MS - visto));', 'return 0;'],
  ['index.html deja de estampar cuándo aparece la marca', 'html',
    'window.__aviSplashAt = (window.performance && performance.now) ? performance.now() : 0;', ''],
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
