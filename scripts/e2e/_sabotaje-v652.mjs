// Matriz de sabotaje de v652 — «la foto de perfil también es privada».
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
  ['la foto de perfil nueva vuelve al bucket PÚBLICO', 'ent',
    "      await _chatMediaUpload(path,blob,'image/jpeg','progress-photos');",
    "      await fetch(SB_URL+'/storage/v1/object/apex-photos/'+path,{method:'POST',body:blob});"],
  ['el resolvedor pide archivos de OTRA carpeta', 'infra',
    "    if(typeof profileAvatarPathOk!=='function'||!profileAvatarPathOk(c.avatarPath,c.id))return '';",
    ''],
  ['la ficha del coach deja de pedir la foto privada', 'co',
    "    avatarUrlFor(c).then(u=>{ if(u&&CUR.clientId===id&&!/[\"\\\\]/.test(u)){av.textContent='';av.style.background=`#ccc center/cover url(\"${u}\")`;} });",
    ''],
  ['la mudanza de la foto de perfil guarda aunque cambie la vista', 'salud',
    "          if(CUR.clientId!==cid)return;             // cambió la vista: no se guarda por otro camino",
    ''],
  ['borra la foto anterior ANTES de guardar la nueva', 'ent',
    "    svNow('ax_c',DB.clients);\n    // La foto anterior se borra DESPUÉS de guardar la nueva (si falla al revés, se queda sin foto).\n    if(_prevPath&&_prevPath!==client.avatarPath&&typeof _privDelete==='function')_privDelete(_prevPath,'progress-photos');",
    "    if(_prevPath&&_prevPath!==client.avatarPath&&typeof _privDelete==='function')_privDelete(_prevPath,'progress-photos');\n    svNow('ax_c',DB.clients);"],
  ['vuelve la migración que subía al bucket público', 'infra',
    "  // 🔴 v652 · Aquí corría `migratePhotosToStorage`, que subía fotos de progreso y de PERFIL al bucket",
    "  setTimeout(()=>{ if(typeof migratePhotosToStorage==='function') migratePhotosToStorage(); },3000);\n  // 🔴 v652 · Aquí corría `migratePhotosToStorage`, que subía fotos de progreso y de PERFIL al bucket"],
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
