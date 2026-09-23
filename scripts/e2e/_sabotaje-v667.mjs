// Matriz de sabotaje de v667 — la tarjeta de progreso del coach, con foto, es la FOTO (modelo G).
// Cada fila rompe el modelo G de UNA forma y la suite TIENE que ponerse roja. Reemplazos con
// FUNCIÓN, escritura ATÓMICA y el fin de línea tomado del propio archivo.
// node scripts/e2e/_sabotaje-v667.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { coach: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['con foto se vuelve a dibujar el modelo C', 'coach',
    'if(_conFoto){ const lyG=_storyDrawG(x,d,_storyAvatar);', 'if(false){ const lyG=_storyDrawG(x,d,_storyAvatar);'],
  ['la foto cubre el lienzo entero (la cara queda detrás del texto)', 'coach',
    'const H=Math.min(1920,textTop+300);\n  const rel=Math.max(1080/foto.width,H/foto.height)', 'const H=1920;\n  const rel=Math.max(1080/foto.width,H/foto.height)'],
  ['el filtro de la foto se queda puesto', 'coach',
    "try{ x.filter='none'; }catch(e){}   // SIEMPRE se quita, o todo lo de abajo sale filtrado\n  x.fillStyle='rgba(10,74,56,.30)';x.fillRect(0,0,1080,H);",
    "x.fillStyle='rgba(10,74,56,.30)';x.fillRect(0,0,1080,H);"],
  ['la barra con foto mide el % en vez de los kilos', 'coach',
    "const w=Math.max(8,Math.round(560*((s2.gano||0)/maxGano)));\n    x.fillStyle='rgba(255,255,255,.08)'",
    "const w=Math.max(8,Math.round(560*((s2.pct||0)/100)));\n    x.fillStyle='rgba(255,255,255,.08)'"],
  ['el titular con foto dice FUERZA', 'coach', "x.fillText('DE CARGA',540,cargaY);", "x.fillText('DE FUERZA',540,cargaY);"],
  ['la gráfica con foto deja de toparse (8 barras le tapan la cara)', 'coach',
    '.slice(0,STORY_G_BARS), FILA=86;', '.slice(0,8), FILA=86;'],
  ['el texto deja de anclarse abajo (con pocas subidas la foto no gana sitio)', 'coach',
    'const firstY=lastY-Math.max(0,lista.length-1)*FILA;', 'const firstY=1176;'],
  ['el enlace sale de la franja que WhatsApp muestra', 'coach',
    "x.fillText('Entrena con '+(coach||'AVI')+'  ·  '+site,540,1670);", "x.fillText('Entrena con '+(coach||'AVI')+'  ·  '+site,540,1830);"],
  ['filas más altas: el texto sube y le tapa la cara', 'coach', '.slice(0,STORY_G_BARS), FILA=86;', '.slice(0,STORY_G_BARS), FILA=120;'],
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
