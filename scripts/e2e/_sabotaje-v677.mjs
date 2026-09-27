// Matriz de sabotaje de v677 — la librería del login vive en la app, en versión fija. Cada fila
// devuelve UN defecto y la suite TIENE que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA.
// node scripts/e2e/_sabotaje-v677.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  html: join(ROOT, 'index.html'), sw: join(ROOT, 'sw.js'), pub: join(ROOT, 'scripts', 'publicar-hogar.mjs'),
  lib: join(ROOT, 'vendor', 'supabase-js-2.117.2.js'), attr: join(ROOT, '.gitattributes'), a4: join(ROOT, 'app-4-entreno.js'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['vuelve el CDN flotante', 'html',
    '<script defer src="vendor/supabase-js-2.117.2.js"></script>',
    '<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'],
  ['se añade OTRO script de un tercero', 'html',
    '<script defer src="vendor/supabase-js-2.117.2.js"></script>',
    '<script defer src="vendor/supabase-js-2.117.2.js"></script>\n<script src="//evil.example.com/x.js"></script>'],
  ['la librería cambia un solo byte', 'lib', 'e.processLock=xi', 'e.processLock=xj'],
  ['la librería sale del precache (login sin red en una instalación nueva)', 'sw',
    "BASE + 'icons/badge-96.png', BASE + SUPABASE_JS]", "BASE + 'icons/badge-96.png']"],
  ['la publicación deja de subir vendor/', 'pub',
    "'legal', 'vendor'];", "'legal'];"],
  ['git vuelve a poder reescribir los bytes', 'attr', 'vendor/** -text', 'vendor/** text'],
  ['un módulo carga código de un CDN por su cuenta', 'a4',
    'function ', "import('https://cdn.example.com/x.js');\nfunction "],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar0, poner0] of SABOTAJES) {
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const buscar = buscar0.replace(/\n/g, eol), poner = poner0.replace(/\n/g, eol);
  const veces = src.split(buscar).length - 1;
  // El último sabotaje ancla en la PRIMERA función del módulo: se permite más de una ocurrencia.
  if (veces < 1 || (veces !== 1 && archivo !== 'a4')) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
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
