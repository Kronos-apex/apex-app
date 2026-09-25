// Matriz de sabotaje de v675 — «Esperando respuesta» no cuenta lo que no pide nada («Entrenamiento
// hecho», «Gracias, coach»; decisión del PO, auditoría del 25-sep F3-2). Cada fila devuelve UN defecto y
// la suite TIENE que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA.
// node scripts/e2e/_sabotaje-v675.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['vuelve a contar todo lo que escribe el asesorado', 'core',
    "  return !(typeof m.text === 'string' && CHAT_NO_REPLY_TEXTS.indexOf(m.text.trim()) >= 0);",
    '  return true;'],
  ['una duda deja de contar', 'core',
    "const CHAT_NO_REPLY_TEXTS = ['💪 ¡Entrenamiento hecho!', '🙏 ¡Gracias, coach!'];",
    "const CHAT_NO_REPLY_TEXTS = ['💪 ¡Entrenamiento hecho!', '🙏 ¡Gracias, coach!', '🙋 Tengo una duda'];"],
  ['la lista ya no coincide con los botones', 'core',
    "const CHAT_NO_REPLY_TEXTS = ['💪 ¡Entrenamiento hecho!', '🙏 ¡Gracias, coach!'];",
    "const CHAT_NO_REPLY_TEXTS = ['💪 Entrenamiento hecho', '🙏 ¡Gracias, coach!'];"],
  ['la espera se cuenta desde el «Gracias», no desde lo que pide respuesta', 'core',
    '    const desde = new Date(pide[0].date).getTime();',
    '    const desde = new Date(vis[i].date).getTime();'],
  ['una foto del asesorado con ese texto deja de contar', 'core',
    '  if (m.media) return true;   // una foto o un video del asesorado siempre merecen mirada\n',
    ''],
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
