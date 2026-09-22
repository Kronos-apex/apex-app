// Matriz de sabotaje de v661 — con foto, la tarjeta de logro va A SANGRE (modelo G del PO).
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale verde significa que el candado no vigila nada (lección v503/v572).
// Reemplazos con FUNCIÓN, nunca con string (un `$` es patrón especial de String.replace), y
// escritura ATÓMICA (tmp + rename): un corte de luz a mitad de la matriz ya destruyó un archivo.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { ent: join(ROOT, 'app-4-entreno.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const NL = String.fromCharCode(10);   // los heredocs de este entorno manglan las barras invertidas

const SABOTAJES = [
  ['vuelve el retrato en CÍRCULO encima de la foto a sangre', 'ent',
    "    x.fillStyle='rgba(234,251,244,.66)';x.font=_cf(32,'600');",
    "    if(typeof _wfDrawCrest==='function')_wfDrawCrest(x,540,700,200,name,foto,'system-ui');" + NL +
    "    x.fillStyle='rgba(234,251,244,.66)';x.font=_cf(32,'600');"],
  ['la rama con foto NO devuelve su lienzo (se dibujan las dos tarjetas encima)', 'ent',
    "    try{window._gxLastCanvas=cv;}catch(e){}" + NL + "    return cv;" + NL + "  }",
    "    try{window._gxLastCanvas=cv;}catch(e){}" + NL + "  }"],
  ['el pie con foto se va fuera de lo que WhatsApp muestra', 'ent',
    "+siteG,540,yG+146);",
    "+siteG,540,yG+300);"],
  ['quien NO tiene foto se queda sin retrato', 'ent',
    "  if(typeof _wfDrawCrest==='function')_wfDrawCrest(x,540,560+_gy,200,avatarName||name,",
    "  if(false)_wfDrawCrest(x,540,560+_gy,200,avatarName||name,"],
  ['la foto se dibuja SIN comprobar que exista (lienzo roto para quien no tiene)', 'ent',
    "  const foto=(typeof _wfShareAvatar!=='undefined')?_wfShareAvatar:null;" + NL + "  if(foto&&foto.width){",
    "  const foto=(typeof _wfShareAvatar!=='undefined')?_wfShareAvatar:null;" + NL + "  if(true){"],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
// Los finales de línea de este repo no son estables (v537): el patrón se traduce al del archivo.
const alArchivo = (src, txt) => (src.includes('\r\n') ? txt.split(NL).join('\r\n') : txt);
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
