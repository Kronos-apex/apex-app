// Matriz de sabotaje de v660 — la tarjeta de logro dentro de lo que WhatsApp muestra.
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale verde significa que el candado no vigila nada (lección v503/v572).
// Reemplazos con FUNCIÓN, nunca con string (un `$` es patrón especial de String.replace), y
// escritura ATÓMICA (tmp + rename): un corte de luz a mitad de la matriz ya destruyó un archivo.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { infra: join(ROOT, 'app-1-infra.js'), core: join(ROOT, 'avi-core.js'), ent: join(ROOT, 'app-4-entreno.js'), co: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la marca vuelve a y=150 (CORTADA en el chat de WhatsApp)', 'ent',
    "x.fillText('A V I',540,250);",
    "x.fillText('A V I',540,150);"],
  ['el pie del logro vuelve a y=1830 (el enlace NO se ve sin abrir la imagen)', 'ent',
    "x.fillText('Entreno con '+(coach||'mi coach')+'  ·  '+_site,540,1670);",
    "x.fillText('Entreno con '+(coach||'mi coach')+'  ·  '+_site,540,1830);"],
  ['la raya del pie queda por DEBAJO del pie', 'ent',
    "  x.fillStyle='rgba(16,224,160,.9)';x.fillRect(90,1600,900,4);",
    "  x.fillStyle='rgba(16,224,160,.9)';x.fillRect(90,1700,900,4);"],
  ['una pieza del bloque deja de derivar su posición (se monta sobre la de al lado)', 'ent',
    "x.fillText(title.toUpperCase(),540,1160+_gy);",
    "x.fillText(title.toUpperCase(),540,1160);"],
  ['el texto del compartir vuelve a repetir «AVI» dos veces', 'infra',
    "      const datos={files:[file],title:titulo||'AVI',text:(titulo?titulo+' · ':'')+web};",
    "      const datos={files:[file],title:titulo||'AVI',text:(titulo?titulo+' · ':'')+'Entrena con AVI: '+web};"],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
// Los finales de línea de este repo no son estables (v537): el patrón se traduce al del archivo.
const alArchivo = (src, txt) => (src.includes('\r\n') ? txt.replace(/\n/g, '\r\n') : txt);
let muerden = 0, noAplican = 0;

for (const [nombre, archivo, buscarRaw, ponerRaw] of SABOTAJES) {
  const src = orig[archivo];
  const buscar = alArchivo(src, buscarRaw), poner = alArchivo(src, ponerRaw);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) {
    noAplican++;
    console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces (tiene que ser 1).`);
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
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
