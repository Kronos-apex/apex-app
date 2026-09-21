// Matriz de sabotaje de v647 — «quién espera tu respuesta + respuestas guardadas».
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
  infra: join(ROOT, 'app-1-infra.js'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['esperar se cuenta desde el ÚLTIMO mensaje, no desde el primero sin respuesta', 'core',
    "    while (i > 0 && vis[i - 1].from === 'client') i--;",
    ''],
  ['el aviso ignora lo que el coach eliminó', 'core',
    '    const vis = msgsVisible((msgsById || {})[c.id], (clearsById || {})[c.id])',
    '    const vis = msgsVisible((msgsById || {})[c.id], null)'],
  ['una conversación respondida también «espera»', 'core',
    "    if (!vis.length || vis[vis.length - 1].from !== 'client') return;",
    '    if (!vis.length) return;'],
  ['vaciar las respuestas las devuelve de fábrica', 'core',
    '  if (!Array.isArray(saved)) return COACH_QR_DEFAULT.slice();',
    '  if (!Array.isArray(saved) || !saved.length) return COACH_QR_DEFAULT.slice();'],
  ['el aviso no entra a la prioridad del Inicio', 'core',
    "  'h-today-banner',\n  'h-await',",
    "  'h-today-banner',"],
  ['la frase guardada se envía sola', 'co',
    '  ta.value=t; if(typeof _cchatGrow===\'function\')_cchatGrow(ta); ta.focus();',
    '  ta.value=t; sendCoachChatMsg();'],
  ['las respuestas guardadas no se hidratan de la nube', 'co',
    "      if(Array.isArray(_cs.qr)) localStorage.setItem('ax_cqr',JSON.stringify(_cs.qr));",
    ''],
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
