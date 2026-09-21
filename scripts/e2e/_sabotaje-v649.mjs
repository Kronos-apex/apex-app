// Matriz de sabotaje de v649 — «foto o video en el chat, en un bucket privado».
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
  ['un video de cualquier duración sale', 'core',
    '    if (f.duration > CHAT_VIDEO_MAX_S + 0.5) return',
    '    if (false) return'],
  ['la ruta acepta un id que no es uuid (la RLS lo rechazaría en silencio)', 'core',
    "  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(folderUid || ''))) return null;",
    ''],
  ['se pinta un archivo de OTRA carpeta', 'core',
    "  return typeof path === 'string' && !!folderUid && path.indexOf(String(folderUid) + '/chat-') === 0",
    "  return typeof path === 'string'"],
  ['el asesorado crea el mensaje aunque la subida falle', 'ent',
    "    catch(e){ _mediaSubiendo=false; toast('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo'); return; }",
    "    catch(e){ _mediaSubiendo=false; }"],
  ['un harness podría subir a producción', 'infra',
    "  if(typeof cloudWriteSealed==='function'&&cloudWriteSealed(location.hostname,window.AVI_ALLOW_CLOUD_WRITE))throw new Error('sellado');",
    ''],
  ['el coach deja de ver los archivos', 'co',
    "    if(m.media&&typeof chatMediaNode==='function'){ b.classList.add('mb-media'); b.appendChild(chatMediaNode(m,clientId)); }",
    '    if(false){}'],
  ['el tope del cliente se separa del bucket', 'core',
    'const CHAT_MEDIA_MAX_BYTES = 20 * 1024 * 1024;',
    'const CHAT_MEDIA_MAX_BYTES = 50 * 1024 * 1024;'],
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
