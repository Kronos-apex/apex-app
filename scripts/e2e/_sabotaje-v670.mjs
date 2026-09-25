// Matriz de sabotaje de v670 — al activar los avisos en el hogar nuevo se retiran los de la dirección
// vieja (avisos dobles tras la mudanza, auditoría del 25-sep, F1-2).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja.
// Reemplazos con FUNCIÓN, escritura ATÓMICA y el fin de línea tomado del propio archivo.
// node scripts/e2e/_sabotaje-v670.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), a1: join(ROOT, 'app-1-infra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['retira TODO lo que no es este aparato (también otro aparato ya mudado)', 'core',
    '    return s.origin !== homeOrigin;\n  }).map(r => r.id);',
    '    return true;\n  }).map(r => r.id);'],
  ['retira también la suscripción recién guardada', 'core',
    '    if (s.endpoint === currentEndpoint) return false;\n',
    ''],
  ['borra filas que no sabe leer', 'core',
    "    if (!r || r.id == null || !s || typeof s !== 'object' || typeof s.endpoint !== 'string') return false;",
    '    if (!r || r.id == null) return false;'],
  ['la suscripción deja de decir de qué dirección es', 'a1',
    'subscription:Object.assign({},sub.toJSON(),{origin:location.origin})',
    'subscription:sub.toJSON()'],
  ['retira en cualquier dirección, también en la vieja', 'a1',
    "if(location.origin===AVI_HOME_ORIGIN&&typeof pushRowsToRetire==='function'){",
    "if(typeof pushRowsToRetire==='function'){"],
  ['borra TODAS las suscripciones de la persona', 'a1',
    ".delete().in('id',_sobran);",
    ".delete().eq('client_id',_cid);"],
  ['lee suscripciones que no son de esta persona', 'a1',
    ".select('id,subscription').eq('client_id',_cid);",
    ".select('id,subscription').neq('client_id','');"],
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
