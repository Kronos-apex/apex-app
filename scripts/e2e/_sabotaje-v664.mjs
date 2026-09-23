// Matriz de sabotaje de v664 — con foto de perfil, la imagen del cierre es la FOTO (modelo G).
// Cada fila rompe el modelo de UNA forma y la suite TIENE que ponerse roja. Reemplazos con FUNCIÓN
// y escritura ATÓMICA (tmp + rename).   node scripts/e2e/_sabotaje-v664.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = join(ROOT, 'app-4-entreno.js');
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['con foto se sigue dibujando el modelo C', "  if(_conFoto){ const lyG=_wfDrawShareG(x,d,_wfShareAvatar); try{ cv._layout=lyG; }catch(e){} }",
    "  if(false){ const lyG=_wfDrawShareG(x,d,_wfShareAvatar); try{ cv._layout=lyG; }catch(e){} }"],
  ['la foto vuelve a cubrir el lienzo entero (la cara detrás del texto)', "  const H=Math.min(1920,textTop+300);", "  const H=1920;"],
  ['la foto se centra en vez de encuadrarse arriba', "x.drawImage(foto,(1080-fw)/2,(H-fh)*0.4,fw,fh);", "x.drawImage(foto,(1080-fw)/2,(1920-fh)/2,fw,fh);"],
  ['la etiqueta vuelve a pisar la tilde del titular', "eyeY=titleY-132,", "eyeY=titleY-118,"],
  ['el enlace sale de la franja que WhatsApp muestra', "+site,540,1670);\n  x.textAlign='start';\n  return {modo:'G'",
    "+site,540,1830);\n  x.textAlign='start';\n  return {modo:'G'"],
  ['el filtro de la foto se queda puesto', "  try{ x.filter='none'; }catch(e){}   // SIEMPRE se quita, o todo lo de abajo sale filtrado\n  x.fillStyle='rgba(10,74,56,.30)';x.fillRect(0,0,1080,H);",
    "  x.fillStyle='rgba(10,74,56,.30)';x.fillRect(0,0,1080,H);"],
];

const orig = readFileSync(F, 'utf8');
const alArchivo = t => (orig.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t);
let muerden = 0, noAplican = 0;
for (const [nombre, bRaw, pRaw] of SABOTAJES) {
  const buscar = alArchivo(bRaw), poner = alArchivo(pRaw);
  const veces = orig.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
  escribir(F, orig.replace(buscar, () => poner));
  let rojo = false;
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { rojo = true; } finally { escribir(F, orig); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
