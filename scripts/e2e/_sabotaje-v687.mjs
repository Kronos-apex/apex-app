// Matriz de sabotaje de v687 — con una WiFi «conectada pero sin internet» la app abre.
// Cada fila devuelve UN defecto al service worker y la suite TIENE que ponerse roja. Lo que ve la
// persona (abre o no abre con la red colgada) lo prueba `_verify-red-colgada.mjs`, con su control
// `--sw-viejo`. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v687.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { sw: join(ROOT, 'sw.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['vuelve a esperar a la red antes que a la copia', 'sw',
    "  return caches.match(req).then(c => c || fetch(req, {cache:'no-cache'})",
    "  return fetch(req, {cache:'no-cache'}).catch(() => null).then(n => n || caches.match(req)).then(c => c || fetch(req, {cache:'no-cache'})"],
  ['sirve la copia de OTRA versión con la red funcionando', 'sw',
    "  return caches.match(req).then(c => c || fetch(req, {cache:'no-cache'})",
    "  return caches.match(req, {ignoreSearch:true}).then(c => c || fetch(req, {cache:'no-cache'})"],
  ['el pedido a la red pierde el no-cache', 'sw',
    "  return caches.match(req).then(c => c || fetch(req, {cache:'no-cache'})",
    "  return caches.match(req).then(c => c || fetch(req)"],
  ['lo que trae la red no se guarda', 'sw', '    .then(r => { _guardar(req, r); return r; })', '    .then(r => r)'],
  ['sin red y sin la versión exacta, pantalla rota', 'sw',
    '    .catch(() => caches.match(req, {ignoreSearch:true})));', '    .catch(() => undefined));'],
  ['la copia guardada se sirve también sin versión', 'sw',
    "    if(url.searchParams.has('v')){ e.respondWith(_versionExacta(e.request)); return; }",
    "    if(true){ e.respondWith(_versionExacta(e.request)); return; }"],
  ['app-7 vuelve a faltar en la lista del service worker', 'sw', "'app-6-extra.js', 'app-7-community.js', ", "'app-6-extra.js', "],
  ['la navegación pierde su tope de 3 s', 'sw',
    "new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))",
    "new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000000))"],
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
