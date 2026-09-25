// Matriz de sabotaje de v673 — la foto o el video del coach reciben el mismo trato que el texto (v588):
// esperan a que el mensaje se guarde y, si quedó en la cola, ni dicen «enviada» ni avisan al asesorado
// (auditoría del 25-sep, F3-3). Cada fila devuelve UN defecto y la suite TIENE que ponerse roja.
// Reemplazos con FUNCIÓN, escritura ATÓMICA y el fin de línea tomado del propio archivo.
// node scripts/e2e/_sabotaje-v673.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { a3: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la foto vuelve a avisar y decir «enviada» aunque quedó en la cola', 'a3',
    "    if(_enCola){ toast(prep.kind==='vid'?'📴 Sin conexión: guardé el video y lo envío al reconectar':'📴 Sin conexión: guardé la foto y la envío al reconectar'); return; }\n",
    ''],
  ['deja de mirar la cola', 'a3',
    "    const _enCola=(typeof _cwqHasMsg==='function')&&_cwqHasMsg(id,_msg.date);\n    if(_cchatId===id)renderCoachChatThread(id,true);\n    if(_enCola){",
    "    const _enCola=false;\n    if(_cchatId===id)renderCoachChatThread(id,true);\n    if(_enCola){"],
  ['el ⏳ de la foto no se quita nunca', 'a3',
    "    delete _cchatSending[_msg.date];\n    const _enCola=(typeof _cwqHasMsg==='function')&&_cwqHasMsg(id,_msg.date);\n    if(_cchatId===id)renderCoachChatThread(id,true);\n    if(_enCola){ toast(prep.kind",
    "    const _enCola=(typeof _cwqHasMsg==='function')&&_cwqHasMsg(id,_msg.date);\n    if(_cchatId===id)renderCoachChatThread(id,true);\n    if(_enCola){ toast(prep.kind"],
  ['la foto deja de marcarse en vuelo', 'a3',
    "    DB.msgs[id].push(_msg);\n    _cchatSending[_msg.date]=1;\n    markCoachRead(id);\n    if(_cchatId===id)renderCoachChatThread(id,true);\n    if(typeof renderMsgs==='function')renderMsgs();\n    try{ await svNow('ax_m',DB.msgs); }catch(e){ warn('AVI: enviar archivo",
    "    DB.msgs[id].push(_msg);\n    markCoachRead(id);\n    if(_cchatId===id)renderCoachChatThread(id,true);\n    if(typeof renderMsgs==='function')renderMsgs();\n    try{ await svNow('ax_m',DB.msgs); }catch(e){ warn('AVI: enviar archivo"],
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
