// Matriz de sabotaje de v659 — el enlace de la web en lo que se comparte.
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
  ['sin sitio del coach el pie se queda VACÍO (como antes: imagen sin enlace)', 'core',
    "  return s || AVI_WEB_HOST;",
    "  return s;"],
  ['el pie pisa el sitio propio del coach con el de AVI', 'core',
    "  return s || AVI_WEB_HOST;",
    "  return AVI_WEB_HOST;"],
  ['la tarjeta del CIERRE vuelve al pie condicional', 'ent',
    "  x.fillText('Entreno con '+(coach||'mi coach')+'  ·  '+site,540,1830);",
    "  x.fillText('Entreno con '+(coach||'mi coach')+(site?('  ·  '+site):''),540,1830);"],
  ['la tarjeta del LOGRO se queda sin enlace', 'ent',
    "  x.fillStyle='rgba(234,251,244,.6)';x.font=_cf(34,'600');x.fillText('Entreno con '+(coach||'mi coach')+'  ·  '+_site,540,1830);",
    "  x.fillStyle='rgba(234,251,244,.6)';x.font=_cf(34,'600');x.fillText('Entreno con '+(coach||'mi coach')+' en AVI',540,1830);"],
  ['la tarjeta de PROGRESO del coach se queda sin enlace', 'co',
    "  x.fillText('Entrena con '+(coach||'AVI')+'  ·  '+site,90,1830);",
    "  x.fillText('Entrena con '+(coach||'AVI'),90,1830);"],
  ['el enlace deja de viajar como texto al compartir', 'infra',
    "      const datos={files:[file],title:titulo||'AVI',text:(titulo?titulo+' · ':'')+'Entrena con AVI: '+web};",
    "      const datos={files:[file],title:titulo||'AVI'};"],
  ['un destino que rechaza el texto se queda SIN imagen', 'infra',
    "      const pay=navigator.canShare(datos)?datos:{files:[file],title:titulo||'AVI'};",
    "      const pay=datos;"],
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
