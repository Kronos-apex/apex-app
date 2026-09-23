// Matriz de sabotaje de v665 — a quien se mudó y perdió sus avisos se le recuerda activarlos.
// Cada fila rompe el recordatorio de UNA forma y la suite TIENE que ponerse roja. Reemplazos con
// FUNCIÓN y escritura ATÓMICA.   node scripts/e2e/_sabotaje-v665.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), infra: join(ROOT, 'app-1-infra.js'), ent: join(ROOT, 'app-4-entreno.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['se le recuerda también a quien nunca tuvo avisos', 'core', "  if (perm !== 'default' || !hadEndpoint) return false;", "  if (perm !== 'default') return false;"],
  ['el «Mañana» dura una semana', 'core', 'const PUSH_LOST_SNOOZE_DAYS = 1;', 'const PUSH_LOST_SNOOZE_DAYS = 7;'],
  ['el recordatorio respeta el «ahora no» que viajó de la dirección vieja', 'infra',
    "_mvSnz=parseInt(localStorage.getItem('ax_pushmv_snooze_'+cid)||'0',10)||0;",
    "_mvSnz=parseInt(localStorage.getItem('ax_push_snooze_'+cid)||'0',10)||0;"],
  ['al activar, el recordatorio se queda pegado', 'infra', "  const mv=document.getElementById('cn-push-moved'); if(mv)mv.innerHTML='';",
    "  const mv=document.getElementById('cn-push-moved');"],
  ['al tocar «Mañana» sale en el acto el aviso genérico', 'infra',
    "  if(_had&&Notification.permission==='default'){ el.innerHTML=''; return; }\n  let snooze=0; try{ snooze=parseInt(localStorage.getItem('ax_push_snooze_'+cid)",
    "  let snooze=0; try{ snooze=parseInt(localStorage.getItem('ax_push_snooze_'+cid)"],
  ['el coach que se mudó no recibe el recordatorio', 'infra',
    "  try{ _had=!!localStorage.getItem('apex_push:_coach');", "  try{ _had=false;"],
  ['el recordatorio entra al tope (quedaría detrás de «Tienes N avisos más»)', 'core',
    "  'cn-deload',        // 1. la semana de descarga", "  'cn-push-moved','cn-deload',        // 1. la semana de descarga"],
  ['el recordatorio baja al final de «Hoy»', 'ent',
    "    ? ['cn-today-head','cn-push-moved','cn-firstrun',", "    ? ['cn-today-head','cn-firstrun',"],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
const alArchivo = (src, t) => (src.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t);
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, bRaw, pRaw] of SABOTAJES) {
  const src = orig[archivo], buscar = alArchivo(src, bRaw), poner = alArchivo(src, pRaw);
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
