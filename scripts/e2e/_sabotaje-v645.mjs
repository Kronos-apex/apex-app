// Matriz de sabotaje de v645 — «eliminar la conversación, solo para quien la elimina».
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale verde significa que el candado no vigila nada (lección v503/v572).
// Reemplazos con FUNCIÓN, nunca con string (un `$` es patrón especial de String.replace), y
// escritura ATÓMICA (tmp + rename): un corte de luz a mitad de la matriz ya destruyó un archivo.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(ROOT, 'avi-core.js'),
  co: join(ROOT, 'app-3-coach.js'),
  ent: join(ROOT, 'app-4-entreno.js'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la vista no filtra nada (lo eliminado sigue a la vista)', 'core',
    '  return arr.filter(m => new Date(m && m.date).getTime() > c);',
    '  return arr;'],
  ['la marca es el reloj del teléfono (se come lo que subió tarde)', 'core',
    '  return best === null ? null : new Date(best).toISOString();',
    "  return best === null ? null : '2026-09-20T10:20:00.000Z';"],
  ['la marca retrocede con una copia vieja', 'core',
    '  return tb > ta ? b : a;',
    '  return b;'],
  ['el coach elimina con un filter sobre el hilo compartido', 'co',
    "  sv('ax_msgclear',m);",
    "  sv('ax_msgclear',m); DB.msgs[id]=[]; sv('ax_m',DB.msgs);"],
  ['el asesorado elimina con un filter sobre el hilo compartido', 'ent',
    "  svNow('ax_c',DB.clients);\n  markMsgsRead();",
    "  DB.msgs[clientId]=[]; svNow('ax_m',DB.msgs);\n  markMsgsRead();"],
  ['eliminar vuelve a ser UN toque', 'co',
    "  if(btn.dataset.armed!=='1'){\n    btn._ico=btn.innerHTML; btn.dataset.armed='1'; btn.classList.add('armed'); btn.textContent='Eliminar';",
    "  if(false){\n    btn._ico=btn.innerHTML; btn.classList.add('armed'); btn.textContent='Eliminar';"],
  ['la bandeja del coach lee el hilo crudo', 'co',
    'const list=DB.clients.map(c=>{const ms=_coachMsgs(c.id);return',
    'const list=DB.clients.map(c=>{const ms=DB.msgs[c.id]||[];return'],
  ['el chat del asesorado lee el hilo crudo', 'ent',
    "  const msgs=_clientMsgs(clientId);const con=document.getElementById('cn-msg-thread');",
    "  const msgs=DB.msgs[clientId]||[];const con=document.getElementById('cn-msg-thread');"],
  ['la marca del coach no se hidrata de la nube', 'co',
    "        localStorage.setItem('ax_msgclear',JSON.stringify(chatClearMapMerge(_coachClears(),_cs.mc)));",
    "        localStorage.setItem('ax_msgclear',JSON.stringify(_coachClears()));"],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0;

for (const [nombre, archivo, buscar, poner] of SABOTAJES) {
  const src = orig[archivo];
  if (!src.includes(buscar)) {
    console.log(`⚠️  ANCLA NO CASA — «${nombre}»: el sabotaje no mordió porque no encontró el texto.`);
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
console.log(`Resultado: ${muerden}/${SABOTAJES.length} sabotajes muerden.`);
process.exit(base && muerden === SABOTAJES.length ? 0 : 1);
