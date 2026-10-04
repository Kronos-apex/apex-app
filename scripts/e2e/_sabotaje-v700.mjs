// Matriz de sabotaje de v700 — «Recomienda AVI» con premio (decisión del PO, 4-oct-2026). Cada fila devuelve
// UN defecto y la suite TIENE que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v700.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e4: join(ROOT, 'app-4-entreno.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['un menor recibe la invitación', 'core', '  if (!(parseInt(client.age) >= TMB_MENOR_EDAD)) return false;\n', ''],
  ['sin edad se presume adulto (regla v671 al revés)', 'core', '  if (!(parseInt(client.age) >= TMB_MENOR_EDAD)) return false;', '  if (isMenor(client)) return false;'],
  ['AVI PRO recibe premio sin tener coach', 'core', "  if (!client || clientPlan(client) !== 'coach' || !clientIsBillable(client)) return false;", "  if (!client || clientPlan(client) === 'libre' || !clientIsBillable(client)) return false;"],
  ['el asesorado sintético del coach o la cortesía reciben premio', 'core', "  if (!client || clientPlan(client) !== 'coach' || !clientIsBillable(client)) return false;", "  if (!client || clientPlan(client) !== 'coach') return false;"],
  ['un plan vencido recibe premio', 'core', "  return st === 'active' || st === 'expiring';", "  return st === 'active' || st === 'expiring' || st === 'overdue';"],
  ['un plan pausado recibe premio', 'core', "  return st === 'active' || st === 'expiring';", "  return st === 'active' || st === 'expiring' || st === 'inactive';"],
  ['en gracia recibe premio («Hoy» ya le dice que venció)', 'core', "  return st === 'active' || st === 'expiring';", "  return st === 'active' || st === 'expiring' || st === 'grace';"],
  ['sin ningún pago recibe premio', 'core', "  return st === 'active' || st === 'expiring';", "  return st === 'active' || st === 'expiring' || st === 'pending';"],
  ['la tarjeta sale en cada cierre (sin los 14 días)', 'core', '  if (v && v <= t && t - v < REFERIDO_CADA_DIAS * 864e5) return false;\n', ''],
  ['una fecha del futuro la apaga para siempre', 'core', '  if (v && v <= t && t - v < REFERIDO_CADA_DIAS * 864e5) return false;', '  if (v && t - v < REFERIDO_CADA_DIAS * 864e5) return false;'],
  ['la pide antes de 3 entrenos terminados', 'core', '  return fin >= SHARE_MIN_SESSIONS;', '  return true;'],
  ['el mensaje no dice de parte de quién', 'core', "  if (n) msg += kPila ? `\\nCuando le escribas a ${kPila}, dile que vas de parte de ${n}.` : `\\nCuando le escribas al entrenador, dile que vas de parte de ${n}.`;\n", ''],
  ['el apellido viaja en el mensaje', 'core', "  const n = String(nombre || '').trim().split(/\\s+/)[0] || '';", "  const n = String(nombre || '').trim();"],
  ['el cierre no le da turno a la invitación', 'e4', '  renderWfReferido(); // v700: recomendar con premio (solo plan con coach)\n', ''],
  ['la tarjeta de un cierre anterior se cuela', 'e4', '  _wfRefVisible=false;\n  renderWfLogro();', '  renderWfLogro();'],
  ['la invitación no toma el turno y se apila con el muro', 'e4', "  _wfAskOwner='referido';\n", ''],
  ['no se guarda que ya se vio', 'e4', "  if(!_wfRefVisible){ _wfRefVisible=true; try{ localStorage.setItem(llave,String(Date.now())); }catch(_e){} }", "  if(!_wfRefVisible){ _wfRefVisible=true; }"],
  ['la tarjeta del cierre no pregunta por el coach', 'e4', "  if(!_referidoEsAsesorado())return null;\n", ''],
  ['el coach en «Mi entrenamiento» se ve la invitación (solo loggedAs)', 'e4', "function _referidoEsAsesorado(){ return CUR.loggedAs==='client' && !COACH_SELF && AUTH_ROLE!=='coach'; }", "function _referidoEsAsesorado(){ return CUR.loggedAs==='client'; }"],
  ['el perfil no la pinta', 'e4', '  renderReferidoPerfil(client); // v700: «Recomienda AVI» con premio, junto a lo de su plan\n', ''],
  ['quien tiene premio recibe también el banner sin premio', 'e4', "  if(typeof referidoPuede==='function'&&_referidoEsAsesorado()&&referidoPuede(client,Date.now())){ el.style.display='none'; return; }\n", ''],
  ['falta el lugar de la tarjeta en el cierre', 'html', '    <div id="wf-referido"></div>\n', ''],
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
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe', env: { ...process.env, TZ: 'UTC' } }); } catch { rojo = true; } finally { escribir(F[archivo], orig[archivo]); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe', env: { ...process.env, TZ: 'UTC' } }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
