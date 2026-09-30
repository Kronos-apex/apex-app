// Matriz de sabotaje de v695 — el 1RM solo suma la barra que la persona ELIGIÓ (la de ese día) y el entreno
// la pregunta una vez. Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo visible lo prueba
// `_verify-barra-rir.mjs` (97/97 el 30-sep: pregunta, contestar, una a la vez, 1RM ≈180 con la barra del día).
// Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v695.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), c4: join(ROOT, 'app-4-entreno.js'), c6: join(ROOT, 'app-6-extra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la del catálogo guardada sola cuenta como elegida', 'core', '  return def != null && b !== def;\n}', '  return true;\n}'],
  ['la marca de elegida se ignora', 'core', '  if (x.barOk === true) return true;\n', ''],
  ['el récord suma una barra no elegida', 'core', "  return (mejor && barConfirmed(mejor, def)) ? _barNum(mejor.bar) : null;", '  return mejor ? _barNum(mejor.bar) : null;'],
  ['el récord toma una sesión de cualquier fecha', 'core', '    if (isNaN(t) || Math.abs(t - tRec) > 36 * 3600 * 1000) return;', '    if (isNaN(t)) return;'],
  ['«solo la elegida» devuelve la del catálogo', 'core', '  if (opts && opts.soloConfirmada) return conf;\n', ''],
  ['las pantallas vuelven a la barra de hoy', 'c4', "  return recordBarKg(hist,{id,name:exName||''},fecha);", "  return exerciseBarKg(hist,{id,name:exName||''});"],
  ['tocarla hoy no cuenta como elegida', 'c4', "  if(barSessionValue(localStorage.getItem(`barra_${routine.id}_${ei}`),ex)!=null) return true;\n", ''],
  ['el guardado no marca la elegida', 'c4', '    const barOk=bar!=null&&sessionBarConfirmed(routine,ei,ex,bar,_barIdt);', '    const barOk=false;'],
  ['el entreno nunca pregunta', 'c6', "  const elegida=(typeof sessionBarConfirmed==='function')?sessionBarConfirmed(GM.routine,ei,ex,bk):true;", '  const elegida=true;'],
  ['la pregunta marca la del catálogo', 'c6', '`<button type="button" class="gm-bar-opt" onclick="gmPickBar(${ei},${k})">', "`<button type=\"button\" class=\"gm-bar-opt${k===bk?' on':''}\" onclick=\"gmPickBar(${ei},${k})\">"],
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
