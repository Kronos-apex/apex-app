// Matriz de sabotaje de v723 — la duración y las calorías de un cardio. Cada fila devuelve UNA pieza a la
// conducta de antes (o la rompe) y la suite TIENE que ponerse roja. Que la pantalla de cierre diga «10 min» en
// el navegador lo prueba `_verify-cardio-duracion.mjs`.
//   node scripts/e2e/_sabotaje-v723.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e4: join(ROOT, 'app-4-entreno.js'), c3: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la sesión vuelve a sellar su inicio al marcar la primera serie', 'e4',
    'startedAt:_ini,', 'startedAt:new Date().toISOString(),'],
  ['el inicio deja de restar el cardio ya hecho', 'e4',
    "(typeof cardioDoneSec==='function'?cardioDoneSec(setsData):0)*1000", '0*1000'],
  ['cardioDoneSec cuenta el cardio que NO se marcó', 'core',
    '      if (!s || s.done !== true) return;\n      const m = parseFloat(s.min);', '      if (!s) return;\n      const m = parseFloat(s.min);'],
  ['cardioDoneSec cuenta ejercicios que no son cardio', 'core',
    "if (!ex || ex.track !== 'cardio' || !Array.isArray(ex.sets)) return;", 'if (!ex || !Array.isArray(ex.sets)) return;'],
  ['cardioDoneSec acepta minutos imposibles', 'core',
    'if (Number.isFinite(m) && m > 0 && m <= _SANE_MAX.min) sec += m * 60;', 'if (Number.isFinite(m) && m > 0) sec += m * 60;'],
  ['la cura alarga la duración pero deja las calorías de un minuto', 'core',
    'if (Number.isFinite(k) && k > 0) nh.kcal = Math.round(k * cardio / dur);', 'if (Number.isFinite(k) && k > 0) nh.kcal = k;'],
  ['la cura no corre el inicio', 'core',
    "    if (Number.isFinite(fin) && (!Number.isFinite(ini) || fin - ini < cardio * 1000)) nh.startedAt = new Date(fin - cardio * 1000).toISOString();\n", ''],
  ['la cura cambia el dato en silencio (sin healedDur)', 'core',
    "healedDur: { durationSec: dur, kcal: h.kcal == null ? null : h.kcal, startedAt: h.startedAt || null } };", '};'],
  ['la cura también toca lo que ya cuadra', 'core',
    '    if (cardio <= dur) return h;\n', ''],
  ['la fila del asesorado cura pero no se queda con lo curado', 'c3',
    'if(_hc.fixed>0){ DB.history={[id]: _hc.history};', 'if(_hc.fixed>0){ void 0;'],
  ['la fila propia del coach cura pero no se queda con lo curado', 'c3',
    'if(_hcSelf.fixed>0){ DB.history[id]=_hcSelf.history;', 'if(_hcSelf.fixed>0){ void 0;'],
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
