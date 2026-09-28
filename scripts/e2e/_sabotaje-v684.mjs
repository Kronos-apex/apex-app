// Matriz de sabotaje de v684 — el video del login solo se carga cuando el login se ve (R16 #2).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que pasa en la red lo prueba
// `_verify-video-v684.mjs` (con su control contra v683). Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v684.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { html: join(ROOT, 'index.html'), i1: join(ROOT, 'app-1-infra.js'), i2: join(ROOT, 'app-2-login.js'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['el video vuelve a arrancar solo desde el marcado', 'html', '<video class="cin-vid" muted loop', '<video class="cin-vid" autoplay muted loop'],
  ['el video vuelve a tener src en el marcado', 'html', 'data-src="media/hero-montage.mp4"></video>', 'data-src="media/hero-montage.mp4" src="media/hero-montage.mp4"></video>'],
  ['se carga aunque el login no esté a la vista', 'i2', "if(!v||!v.dataset||!v.dataset.src||!s.classList.contains('on'))return false;", 'if(!v||!v.dataset||!v.dataset.src)return false;'],
  ['se carga debajo de la marca', 'i2', "if(o&&!o.classList.contains('fade'))return false;", ''],
  ['«reducir movimiento» no se respeta', 'i2', "if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return false;", ''],
  ['mostrar el login no arranca su video', 'i2', "document.getElementById(id).classList.add('on');if(id==='s-login')aviLoginVideo();}", "document.getElementById(id).classList.add('on');}"],
  ['quitar la marca no arranca el video', 'i1', "    if(typeof aviLoginVideo==='function')aviLoginVideo(); },d);", '    },d);'],
  ['sin foto de fondo (login negro mientras carga)', 'css', "background:#000 url('media/brand/hero.jpg') center/cover no-repeat;overflow:hidden}", 'background:#000;overflow:hidden}'],
  ['el video ya no entra con fundido', 'css', '.cin-vid.on{opacity:1}', '.cin-vid.on{}'],
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
