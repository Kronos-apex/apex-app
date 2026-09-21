// Matriz de sabotaje de v651 — «Mi entrenamiento también muda sus fotos al privado».
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
  ['«Mi entrenamiento» no muda las fotos del coach', 'co',
    "  initClientView(me);\n  // v651 · tus fotos de progreso viejas (base64 dentro de tu ficha) también pasan al bucket privado.\n  setTimeout(()=>{ if(typeof migrateProgressPhotosPrivate==='function')migrateProgressPhotosPrivate(); },4000);",
    "  initClientView(me);"],
  ['guarda aunque la vista haya cambiado a mitad de la mudanza', 'salud',
    '    if(cambio&&CUR.clientId!==cid)return;',
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
