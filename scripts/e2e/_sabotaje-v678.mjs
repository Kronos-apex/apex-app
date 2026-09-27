// Matriz de sabotaje de v678 — la regla de orígenes (CSP). Cada fila la afloja o la quita de una
// forma realista y la suite TIENE que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA.
// node scripts/e2e/_sabotaje-v678.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const META_INI = '<meta http-equiv="Content-Security-Policy" content="';

const SABOTAJES = [
  ['se quita la regla', 'html', META_INI, '<meta name="x-sin-csp" content="'],
  ['se abre script-src a un CDN', 'html', "script-src 'self' 'unsafe-inline';", "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;"],
  ['se abre connect-src a cualquier https', 'html', 'https://app.avientrena.com; worker-src', 'https://app.avientrena.com https:; worker-src'],
  ['comodín en las imágenes', 'html', "img-src 'self' data: blob:", "img-src * data: blob:"],
  ['se permiten objetos incrustados', 'html', "object-src 'none';", "object-src 'self';"],
  ['la regla se mueve después de un script', 'html', META_INI, '<script>/*x*/</script>\n' + META_INI],
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
