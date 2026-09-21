// Matriz de sabotaje de v650 — «las fotos de progreso viven en un bucket privado».
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
  salud: join(ROOT, 'app-5-salud.js'),
  extra: join(ROOT, 'app-6-extra.js'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la foto nueva vuelve al bucket PÚBLICO', 'salud',
    "    await _chatMediaUpload(path,blob,'image/jpeg',PROGRESS_BUCKET);\n    entry.path=path;",
    "    entry.src=await uploadPhotoToStorage(photoId,base64);"],
  ['el asistente del día 1 sube por su cuenta al público', 'extra',
    "    if(typeof saveProgressPhoto === 'function') await saveProgressPhoto(clientId, base64, label);",
    "    const src=await uploadPhotoToStorage(uid(),base64); DB.photos[clientId].unshift({id:uid(),date:new Date().toISOString(),label,src}); svNow('ax_photos',DB.photos);"],
  ['la mudanza la hace cualquiera, no solo el dueño', 'salud',
    '  if(!cid||!me||cid!==me)return;',
    '  if(!cid)return;'],
  ['la entrada mudada conserva el enlace público', 'core',
    '  delete out.src;\n  return out;',
    '  return out;'],
  ['el coach no sabe pintar una foto privada', 'salud',
    "        ${_photoImgHtml(p,clientId,'width:100%;aspect-ratio:3/4;object-fit:cover;display:block')}\n      </div>`).join('')}\n  </div>\n  <div style=\"font-size:11px;color:var(--t3);margin-top:8px\">",
    "        <img src=\"${p.src||''}\" alt=\"Foto de progreso\">\n      </div>`).join('')}\n  </div>\n  <div style=\"font-size:11px;color:var(--t3);margin-top:8px\">"],
  ['borrar una foto privada no la quita de su bucket', 'salud',
    '  if(_ent&&_ent.path)_privDelete(_ent.path,PROGRESS_BUCKET);\n  else deletePhotoFromStorage(photoId,_ent&&_ent.src);',
    '  deletePhotoFromStorage(photoId,_ent&&_ent.src);'],
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
