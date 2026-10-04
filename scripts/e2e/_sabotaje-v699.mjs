// Matriz de sabotaje de v699 — el canal por el que llegó quien se registra (pedido del PO, 3-oct-2026). Cada fila
// devuelve UN defecto y la suite TIENE que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v699.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(ROOT, 'avi-core.js'), html: join(ROOT, 'index.html'), c3: join(ROOT, 'app-3-coach.js'),
  pol: join(ROOT, 'legal', 'politica-tratamiento-datos.md'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['de la web sin canal queda null en vez de «web»', 'core', "    return q.get('origen') === 'web' ? 'web' : null;", '    return null;'],
  ['cualquier cosa de la dirección es un canal', 'core', '    if (c && CANAL_RE.test(c)) return c;', '    if (c) return c;'],
  ['el canal no caduca', 'core', '  if (!(ahora >= t) || ahora - t > CANAL_TTL_DIAS * 864e5) return null;', '  if (!(ahora >= t)) return null;'],
  ['una fecha del futuro vale', 'core', '  if (!(ahora >= t) || ahora - t > CANAL_TTL_DIAS * 864e5) return null;', '  if (ahora - t > CANAL_TTL_DIAS * 864e5) return null;'],
  ['al leer no se revisa otra vez la forma', 'core', "typeof raw.c !== 'string' || !CANAL_RE.test(raw.c)) return null;", "typeof raw.c !== 'string') return null;"],
  ['un canal nuevo pisa al primero', 'html', "      if(!c || localStorage.getItem('ax_canal')) return;", '      if(!c) return;'],
  ['la forma de index.html se separa de la de avi-core', 'html', "      if(!(c && /^[a-z0-9][a-z0-9-]{1,23}$/.test(c))) c = q.get('origen')==='web' ? 'web' : null;", "      if(!(c && /^[a-z0-9-]{1,40}$/.test(c))) c = q.get('origen')==='web' ? 'web' : null;"],
  ['la cuenta nueva no guarda el canal', 'c3', '    canal:_canalDeLlegada(),', '    canal:null,'],
  ['el canal no se suelta y se le atribuye a otra cuenta', 'c3', "  try{ localStorage.removeItem('ax_canal'); }catch(e){}\n", ''],
  ['lo guardado entra sin pasar por la regla', 'c3', "    return canalRecord(JSON.parse(localStorage.getItem('ax_canal')||'null'), Date.now());", "    return JSON.parse(localStorage.getItem('ax_canal')||'null');"],
  ['la ficha del coach no dice por dónde llegó', 'c3', "if(_cl) _stats.push('llegó por '+_cl);", 'if(_cl) void 0;'],
  ['la política no dice para qué se guarda', 'pol', '\n- Saber por cuál canal nos llega la gente (Instagram, TikTok, una recomendación…), para dedicarle el esfuerzo al que funciona.', ''],
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
