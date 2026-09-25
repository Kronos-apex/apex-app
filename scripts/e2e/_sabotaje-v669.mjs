// Matriz de sabotaje de v669 — la sesión que viaja en la mudanza solo se acepta si la llegada viene
// del SALTO de la dirección vieja (fijación de sesión, auditoría del 25-sep, F1-1).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja.
// Reemplazos con FUNCIÓN, escritura ATÓMICA y el fin de línea tomado del propio archivo.
// node scripts/e2e/_sabotaje-v669.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), a1: join(ROOT, 'app-1-infra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la llegada deja de mirar de dónde viene', 'a1',
    "const _refOk=(typeof mudanzaReferrerOk==='function')&&mudanzaReferrerOk(document.referrer,AVI_OLD_HOSTS);",
    'const _refOk=true;'],
  ['sin la regla (avi-core no cargó) acepta a ciegas', 'a1',
    "const _refOk=(typeof mudanzaReferrerOk==='function')&&mudanzaReferrerOk(document.referrer,AVI_OLD_HOSTS);",
    "const _refOk=(typeof mudanzaReferrerOk!=='function')||mudanzaReferrerOk(document.referrer,AVI_OLD_HOSTS);"],
  ['una llegada rechazada sigue de largo', 'a1',
    "      return;\n    }\n    window._aviLlegoMudanza=true;",
    "    }\n    window._aviLlegoMudanza=true;"],
  ['marca «llegó por la mudanza» antes de mirar de dónde viene', 'a1',
    "    history.replaceState(null,'',location.pathname+(q?'?'+q:''));",
    "    history.replaceState(null,'',location.pathname+(q?'?'+q:''));\n    window._aviLlegoMudanza=true;"],
  ['la telemetría del rechazo se lleva lo que traía el enlace', 'a1',
    "_logAppError('mudanza','llegada rechazada: no viene de la dirección vieja',_rh);",
    "_logAppError('mudanza','llegada rechazada: '+m[1],_rh);"],
  ['el host se compara por SUFIJO (un subdominio pasaría)', 'core',
    'return oldHosts.indexOf(u.host) >= 0;',
    'return oldHosts.some(h => u.host.endsWith(h));'],
  ['un enlace SIN origen (pegado en WhatsApp) pasa', 'core',
    "if (typeof referrer !== 'string' || !referrer || !Array.isArray(oldHosts)) return false;",
    "if (typeof referrer !== 'string' || !Array.isArray(oldHosts)) return false;\n  if (!referrer) return true;"],
  ['cualquier esquema con ese host pasa', 'core',
    "  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;\n",
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
