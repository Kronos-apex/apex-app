// Matriz de sabotaje de v693 — cuando el servidor cierra la sesión, la persona sale al login y se le dice.
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que pasa de verdad con una sesión
// revocada lo prueba `_verify-sesion-cerrada.mjs` (cuenta QA de asesorado).
// Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v693.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), c1: join(ROOT, 'app-1-infra.js'), c2: join(ROOT, 'app-2-login.js'),
  c3: join(ROOT, 'app-3-coach.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['salir a mano ya no se marca', 'c1', 'async signOut(){window._aviSaliendo=true;', 'async signOut(){'],
  ['el vigilante no recibe el evento', 'c1', '(evento,session)=>cb(session,evento)', '(_e,session)=>cb(session)'],
  ['«sin respuesta» cuenta como cierre del servidor', 'core', 'r.antes && r.antes.id && r.contesto && !(r.despues', 'r.antes && r.antes.id && !(r.despues'],
  ['el vigilante no saca a la persona', 'c2', "    if(evento!=='SIGNED_OUT'||window._aviSaliendo||!AUTH_MODE)return;\n    _sesionCerrada();\n", "    if(evento!=='SIGNED_OUT'||window._aviSaliendo||!AUTH_MODE)return;\n"],
  ['salir a mano muestra «tu sesión se cerró»', 'c2', "evento!=='SIGNED_OUT'||window._aviSaliendo||!AUTH_MODE", "evento!=='SIGNED_OUT'||!AUTH_MODE"],
  ['al volver a entrar no se desmarca', 'c2', "    if(evento==='SIGNED_IN'){ window._aviSaliendo=false; window._aviSesionCerrada=false; return; }\n", ''],
  ['el arranque no muestra el aviso', 'c2', '_cerradaPorServidor&&!window._aviRecovery) _avisoSesionCerrada();', 'false) _avisoSesionCerrada();'],
  ['salir a mano deja el aviso a la vista', 'c2', "  const _cerr=document.getElementById('lclosed'); if(_cerr)_cerr.style.display='none';\n", ''],
  ['salir borra lo pendiente', 'c2', "  const _cerr=document.getElementById('lclosed');", "  try{ localStorage.removeItem('ax_udirty_'+_authUid); }catch(_e){}\n  const _cerr=document.getElementById('lclosed');"],
  ['_enterAuthSession vuelve a caer a la copia', 'c3', "  if(!row&&!sinRed&&typeof authClosedByServer==='function'&&authClosedByServer({antes:authUser,contesto:true,despues:AUTH.storedUser()})){\n    if(typeof _sesionCerrada==='function'){ _sesionCerrada(); return; }\n  }\n", ''],
  ['_enterAuthSession sigue entrando tras detectarlo', 'c3', "_sesionCerrada(); return; }", "_sesionCerrada(); }"],
  ['nadie engancha el vigilante', 'c3', "  if(typeof _aviVigilarSesion==='function')_aviVigilarSesion();\n", ''],
  ['desaparece el sitio del aviso', 'html', '<div id="lclosed" class="cin-forgot-msg" role="status" style="display:none"></div>', ''],
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
