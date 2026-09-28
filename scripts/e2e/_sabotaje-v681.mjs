// Matriz de sabotaje de v681 — la barra: se anotan los discos y la app suma la barra de cada ejercicio.
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que se ve en pantalla lo prueba
// `_verify-barra-rir.mjs`. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v681.mjs   (COMMITEAR antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e4: join(ROOT, 'app-4-entreno.js'), e6: join(ROOT, 'app-6-extra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['el hip thrust pierde su barra en la lista', 'core', "e42: 'olimpica', ", ''],
  ['la hexagonal no se puede confirmar (opciones fijas)', 'core',
    'return [...new Set([def, ...BAR_CHOICES_BASE])].sort((a, b) => b - a);', 'return BAR_CHOICES_BASE.slice();'],
  ['manda la PRIMERA barra que aparece, no la más reciente', 'core',
    'if (best == null || tt > bt) { best = b; bt = tt; }', 'if (best == null) { best = b; bt = tt; }'],
  ['«sin barra» (0) se trata como dato que falta', 'core',
    "if (v === '' || v == null || typeof v === 'boolean') return null;", "if (!v || typeof v === 'boolean') return null;"],
  ['se agrupa por NOMBRE, no por identidad (un renombrado pierde su barra)', 'core',
    'if (!x || idt.keyOf(x) !== key) return;', "if (!x || String(x.name) !== String((ex && ex.name) || '')) return;"],
  ['la barra de hoy se le pega a otro ejercicio', 'core',
    "if (i <= 0 || raw.slice(0, i) !== String(ex.id)) return null;", 'if (i <= 0) return null;'],
  ['barra_ no se mueve con el reorden', 'e4',
    "const _SK_EX=['lastre','wshow','barra'];", "const _SK_EX=['lastre','wshow'];"],
  ['barra_ no viaja en la mudanza', 'core', '|lastre_|barra_|drop_|', '|lastre_|drop_|'],
  ['el entreno se guarda sin la barra', 'e4', '...(bar!=null?{bar}:{}),', ''],
  ['una pantalla del 1RM vuelve a ignorar la barra', 'e4',
    'const e1=isKg&&pr.reps>1?estimate1RM((parseFloat(recVal)||0)+_bar,pr.reps):null;',
    'const e1=isKg&&pr.reps>1?estimate1RM(recVal,pr.reps):null;'],
  ['la casilla vuelve a decir KG con barra', 'e6', "!=null)?'DISCOS':'KG';", "!=null)?'KG':'KG';"],
  ['cambiar la barra vuelve a disparar el cierre', 'e6',
    "if(typeof resaveSessionPartial==='function') resaveSessionPartial(GM.routine);", 'updateClientProgress(GM.routine);'],
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
