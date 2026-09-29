// Matriz de sabotaje de v688 — quien tiene la sesión guardada entra aunque la red no conteste.
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que ve la persona (su pantalla
// o el login, sin red / con la red colgada / con el token vencido) lo prueba `_verify-red-colgada.mjs`.
// Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v688.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), i1: join(ROOT, 'app-1-infra.js'), i2: join(ROOT, 'app-2-login.js'), c3: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['sin copia local igual entra sin red', 'core', '  if (!r.respaldo || !r.antes || !r.antes.id) return null;', '  if (!r.antes || !r.antes.id) return null;'],
  ['entra aunque la librería borró la sesión', 'core', '  if (!r.despues || r.despues.id !== r.antes.id) return null;', ''],
  ['sin respuesta de la nube, al login (el defecto)', 'core', '  return { user: r.despues, sinRed: true };', '  return null;'],
  ['sin conexión sigue esperando a la nube', 'core', 'function bootNetWait(online) { return online === false ? 0 : BOOT_NET_MS; }', 'function bootNetWait(online) { return BOOT_NET_MS; }'],
  ['la espera vuelve a pasarse de la marca de carga', 'core', 'const BOOT_NET_MS = 3000;', 'const BOOT_NET_MS = 4000;'],
  ['no se re-lee la sesión después de preguntar', 'i2', 'despues:_respaldo?AUTH.storedUser():null', 'despues:_antes'],
  ['el tope a la sesión sin mirar la copia local', 'i2', "const _resp=(_respaldo&&typeof conTope==='function')?", "const _resp=(typeof conTope==='function')?"],
  ['la entrada no se entera de que no hay red', 'i2', '_enterAuthSession(session.user,{sinRed:_sinRed})', '_enterAuthSession(session.user)'],
  ['el tope a su fila sin copia local (crearía una cuenta vacía)', 'c3', "const _r=(_conCopia&&typeof conTope==='function')?", "const _r=(typeof conTope==='function')?"],
  ['sabiendo que no hay red, igual pregunta', 'c3', '  if(!(sinRed&&_conCopia)){', '  if(true){'],
  ['el panel del coach espera a la nube sin red', 'c3', '  const rows=(_conCopia&&opts.sinRed)?null', '  const rows=(false)?null'],
  ['el tope de la lista del coach en todos los llamadores', 'c3', '  const _cache=(opts&&opts.arranque)?_readCoachCache():null;', '  const _cache=_readCoachCache();'],
  ['storedUser lee otra clave', 'i1', "storedUser(){ try{ const o=JSON.parse(localStorage.getItem('avi_auth')", "storedUser(){ try{ const o=JSON.parse(localStorage.getItem('avi_auth_x')"],
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
