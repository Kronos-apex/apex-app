// Matriz de sabotaje de v662 — lo que se lleva el teléfono al mudarse a app.avientrena.com,
// lo que NO acepta al llegar, y los avisos que no se duplican.
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale verde significa que el candado no vigila nada (lección v503/v572).
// Reemplazos con FUNCIÓN, nunca con string (un `$` es patrón especial de String.replace), y
// escritura ATÓMICA (tmp + rename): un corte de luz a mitad de la matriz ya destruyó un archivo.
//   node scripts/e2e/_sabotaje-v662.mjs      (COMMITEAR antes de correrla)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(ROOT, 'avi-core.js'),
  infra: join(ROOT, 'app-1-infra.js'),
  senal: join(ROOT, 'scripts', 'hogar-mudanza.json'),
  sql: join(ROOT, 'supabase', 'migrations', '20260923_push_del_own.sql'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  // ── Qué viaja (avi-core, `mudanzaPick`) ──
  ['el reorden de hoy deja de ser imprescindible (un valor grande se quedaría atrás)', 'core',
    "session_date_|session_id_|work_|mood_|moodalert_)/;",
    "session_date_|session_id_|mood_|moodalert_)/;"],
  ['el respaldo de la fila vuelve a poder viajar (solo lo frenaría el tope de tamaño)', 'core',
    "const MV_SKIP_RE = /^(ax_udcache_|",
    "const MV_SKIP_RE = /^("],
  ['la cola del coach vuelve a viajar y a aceptarse al llegar', 'core',
    "|ax_cwq_|ax_coachpending_|",
    "|ax_coachpending_|"],
  ['se va el tope de tamaño de lo opcional', 'core',
    "    if (v.length > MV_ITEM_MAX || total + peso > MV_TOTAL_MAX) { dejados.push(k); continue; }",
    "    if (false) { dejados.push(k); continue; }"],
  ['lo imprescindible que no cabe se muda igual (dejaría atrás el entreno a medias)', 'core',
    "  if (total > MV_TOTAL_MAX) return { ok: false, reason: 'imprescindible_no_cabe', carry: {}, dejados: [] };",
    "  if (false) return { ok: false, reason: 'imprescindible_no_cabe', carry: {}, dejados: [] };"],
  ['lo que viaja depende del orden en que el navegador lista las claves', 'core',
    "  opt.sort((a, b) => (a[1].length - b[1].length) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));",
    "  void 0;"],
  ['la regla compartida deja de filtrar (la llegada aceptaría cualquier clave)', 'core',
    "  return typeof k === 'string' && k.length > 0 && !MV_SKIP_RE.test(k);",
    "  return typeof k === 'string' && k.length > 0;"],
  // ── ¿Hay trabajo del coach sin subir? (`mudanzaQueuePending`) ──
  ['una cola con cosas se lee como vacía', 'core',
    "      if (Array.isArray(x) ? x.length > 0 :",
    "      if (Array.isArray(x) ? x.length > 99 :"],
  ['ante una cola ilegible, se muda igual', 'core',
    "(x && typeof x === 'object' ? Object.keys(x).length > 0 : !!x)) return true;\n    } catch (_e) { return true; }",
    "(x && typeof x === 'object' ? Object.keys(x).length > 0 : !!x)) return true;\n    } catch (_e) { return false; }"],
  // ── El salto (app-1) ──
  ['sin la regla (avi-core no cargó) se muda a ciegas', 'infra',
    "  if(typeof mudanzaPick!=='function')return {ok:false,carry:{},dejados:[]};",
    "  if(false)return {ok:false,carry:{},dejados:[]};"],
  ['el destino se arma aunque lo imprescindible no quepa', 'infra',
    "  if(!pick||!pick.ok)return null;",
    "  if(!pick)return null;"],
  ['salta sin destino válido', 'infra',
    "  if(!destino)return false;   // v662 · lo imprescindible no cabe: se queda aquí, que funciona igual",
    "  if(false)return false;"],
  ['salta con la cola del coach sin subir', 'infra',
    "    if(mudanzaQueuePending(_mvEntries(localStorage)))return true;",
    "    if(false)return true;"],
  ['sin la regla de las colas, se muda', 'infra',
    "    if(typeof mudanzaQueuePending!=='function')return true;",
    "    if(false)return true;"],
  // ── La llegada ──
  ['la llegada escribe sin preguntarle a la regla (un enlace plantaría una cola)', 'infra',
    "      if(!_mvOk(k))return;",
    "      if(false)return;"],
  ['sin la regla, la llegada acepta cualquier clave', 'infra',
    "mudanzaKeyAllowed:(k=>k==='avi_auth');",
    "mudanzaKeyAllowed:(k=>true);"],
  // ── Los avisos no se duplican ──
  ['borra la fila del endpoint VIGENTE', 'infra',
    "    if(_prevEp && _prevEp!==sub.endpoint){",
    "    if(_prevEp){"],
  ['no retira la fila del endpoint anterior (cada aviso llegaría dos veces)', 'infra',
    ".delete().eq('client_id',_cid).eq('subscription->>endpoint',_prevEp);",
    ".select('id').eq('client_id',_cid);"],
  ['la policy de DELETE deja borrar filas ajenas', 'sql',
    "  using (\n    client_id = ((select auth.uid()))::text",
    "  using (\n    true or client_id = ((select auth.uid()))::text"],
  // ── La señal ──
  ['la señal vuelve a traer `home`: v658-v661 saltarían con la regla vieja', 'senal',
    '{"hogar":"https://app.avientrena.com","v":2}',
    '{"home":"https://app.avientrena.com","hogar":"https://app.avientrena.com","v":2}'],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
// Los finales de línea de este repo no son estables (v537): el patrón se traduce al del archivo.
const alArchivo = (src, txt) => (src.includes('\r\n') ? txt.replace(/\n/g, '\r\n') : txt);
let muerden = 0, noAplican = 0;

for (const [nombre, archivo, buscarRaw, ponerRaw] of SABOTAJES) {
  const src = orig[archivo];
  const buscar = alArchivo(src, buscarRaw), poner = alArchivo(src, ponerRaw);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) {
    noAplican++;
    console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces (tiene que ser 1).`);
    continue;
  }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let rojo = false, detalle = '';
  try {
    execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;
    detalle = String(e.stdout || '').split('\n').filter(l => l.includes('❌')).slice(0, 2).join(' · ');
  } finally {
    escribir(F[archivo], orig[archivo]);
  }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»${detalle ? '\n     ' + detalle : ''}`); }
  else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»: la suite NO vigila esto.`);
}

let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴 (los resultados de arriba no valen)'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
