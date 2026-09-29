// Matriz de sabotaje de v685 — «Cargas» ya no deja el teléfono pegado (R16 #3).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que se ve lo prueba `_verify-cargas.mjs`
// y los tiempos `_r16-cargas-perfil.mjs` (datos reales, solo en memoria). Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v685.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { i1: join(ROOT, 'app-1-infra.js'), i2: join(ROOT, 'app-2-login.js'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['vuelve a ser UNA sola tarea (sin tandas)', 'i2', 'const PROG_SLICE_MS=12;', 'const PROG_SLICE_MS=100000;'],
  ['ya no cede el hilo entre asesorados', 'i2', '      if(i<clients.length){ setTimeout(paso,0); return; }', '      if(i<clients.length){ paso(); return; }'],
  ['una pintada vieja escribe encima de la nueva', 'i2', '      if(seq!==_progSeq){ resolve(false); return; }', ''],
  ['una tarjeta rota tumba el panel', 'i2',
    "        let card=null; try{ card=_progCardFor(clients[i]); }catch(e){ warn('AVI: una tarjeta de Cargas falló (se salta):',e&&e.message); }",
    '        let card=_progCardFor(clients[i]);'],
  ['las filas se arman cada vez que se abre', 'i2', '  if(!card._progBuilt&&card._prog)_progBuildBody(card);', '  if(card._prog)_progBuildBody(card);'],
  ['las filas vuelven a pintar la silueta SVG entera', 'i2', '${muscleIcon(ex.muscle,16,true)}', '${muscleIcon(ex.muscle,16)}'],
  ['los puntos vuelven a viajar como texto por fila', 'i2', '    _progPts[chartId]=pts;', '    body.dataset.pts=JSON.stringify(pts);'],
  ['la silueta se arma en cada fila (sin memoria)', 'i1',
    "  if(comoImagen&&_muscleImgHtml[m+'|'+s])return _muscleImgHtml[m+'|'+s];", ''],
  ['sin xmlns: la silueta no se ve como imagen', 'i1',
    "svg.replace('<svg','<svg xmlns=\"http://www.w3.org/2000/svg\"')", 'svg'],
  ['con un color de tema la imagen sale rota', 'i1', "if(/var\\(/.test(svg)||typeof Blob!=='function'", "if(typeof Blob!=='function'"],
  ['las filas fuera de pantalla se vuelven a dibujar', 'css', '.pex-item{content-visibility:auto;contain-intrinsic-size:auto 56px}', '.pex-item{}'],
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
