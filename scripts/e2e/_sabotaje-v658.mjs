// Matriz de sabotaje de v658 — la mudanza a app.avientrena.com.
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale verde significa que el candado no vigila nada (lección v503/v572).
// Reemplazos con FUNCIÓN, nunca con string (un `$` es patrón especial de String.replace), y
// escritura ATÓMICA (tmp + rename): un corte de luz a mitad de la matriz ya destruyó un archivo.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { infra: join(ROOT, 'app-1-infra.js'), sw: join(ROOT, 'sw.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  // v662: la señal pasó de `home` a `hogar` + `v:2` (reapuntada en el mismo commit que la cambió).
  ['el salto se arma sin comprobar que el hogar nuevo responda (saltaría ANTES de la mudanza)', 'infra',
    "      if(!j||j.v!==2||j.hogar!==AVI_HOME_ORIGIN)return;",
    "      if(false)return;"],
  ['el hogar nuevo que no responde deja de ser silencio', 'infra',
    "    .catch(()=>{});   // el hogar nuevo aún no existe: seguir aquí, sin ruido",
    "    .then(()=>{ _mvArmed=true; _mvTry(); });"],
  ['salta con un entreno vivo o un modal abierto', 'infra',
    "  if(typeof window._aviUpdateBusy==='function'&&window._aviUpdateBusy())return false;",
    "  if(false)return false;"],
  ['salta con trabajo sin confirmar en la nube', 'infra',
    "  if(_mvHasPending())return false;",
    "  if(false)return false;"],
  ['deja de mirar la bandera persistida de «sin confirmar»', 'infra',
    "    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(/^ax_udirty_/.test(k||'')&&localStorage.getItem(k)==='1')return true; }",
    "    void 0;"],
  ['ante la duda (excepción) se muda igual', 'infra',
    "  }catch(e){ return true; }",
    "  }catch(e){ return false; }"],
  // v662: «el respaldo grande no viaja» y «el tope de tamaño» ya no viven en app-1 sino en
  // `mudanzaPick` (avi-core, pura). Sus sabotajes se mudaron a `_sabotaje-v662.mjs`.
  ['la sesión se queda a la vista en la barra (el # se borra DESPUÉS de leerlo)', 'infra',
    // v662: entre el borrado del # y la lectura ahora van la marca y el guard de «solo la primera
    // vez», así que el ancla se reapuntó: el sabotaje LEE lo que trae antes de borrar la barra.
    "    history.replaceState(null,'',location.pathname+(q?'?'+q:''));\n    window._aviLlegoMudanza=true;",
    "    const _leido=_mvDecode(m[1]);\n    history.replaceState(null,'',location.pathname+(q?'?'+q:''));\n    window._aviLlegoMudanza=true;"],
  ['la marca ?mudanza se queda pegada en la barra', 'infra',
    "sp.delete('mudanza');",
    "void 0;"],
  ['la llegada pisa lo que el hogar nuevo ya tenía', 'infra',
    "      if(localStorage.getItem(k)==null) localStorage.setItem(k,String(data[k]));",
    "      localStorage.setItem(k,String(data[k]));"],
  ['el service worker devuelve la respuesta del otro origen (PANTALLA DE ERROR, medido)', 'sw',
    "        if (net.redirected && new URL(net.url).origin !== self.location.origin) return Response.redirect(net.url, 302);",
    "        void 0;"],
  ['el service worker guarda en SU caché lo que vino del origen nuevo', 'sw',
    "        if (net.redirected && new URL(net.url).origin !== self.location.origin) return Response.redirect(net.url, 302);\n        _guardar(e.request, net);",
    "        _guardar(e.request, net);\n        if (net.redirected && new URL(net.url).origin !== self.location.origin) return Response.redirect(net.url, 302);"],
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
