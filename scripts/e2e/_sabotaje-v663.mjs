// Matriz de sabotaje de v663 — lo que la app le da a otra persona apunta al hogar nuevo.
// Cada fila devuelve UNA referencia a la dirección vieja (o deja de reconocerla) y la suite TIENE
// que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA (tmp + rename).
//   node scripts/e2e/_sabotaje-v663.mjs      (COMMITEAR antes de correrla)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  ent: join(ROOT, 'app-4-entreno.js'), login: join(ROOT, 'app-2-login.js'), cmty: join(ROOT, 'app-7-community.js'),
  core: join(ROOT, 'avi-core.js'), html: join(ROOT, 'index.html'), infra: join(ROOT, 'app-1-infra.js'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const V = 'https://kronos-apex.github.io/apex-app/', N = 'https://app.avientrena.com/';

const SABOTAJES = [
  ['el enlace que se comparte vuelve a la dirección vieja', 'ent', "const AVI_SHARE_URL='" + N + "';", "const AVI_SHARE_URL='" + V + "';"],
  ['el respaldo del enlace (login) vuelve a la dirección vieja', 'login', "AVI_SHARE_URL:'" + N + "'; }", "AVI_SHARE_URL:'" + V + "'; }"],
  ['el respaldo de Comunidad vuelve a la dirección vieja', 'cmty', "AVI_SHARE_URL : '" + N + "';", "AVI_SHARE_URL : '" + V + "';"],
  ['la invitación de Comunidad vuelve a la dirección vieja', 'core', "const CMTY_INVITE_URL = '" + N + "';", "const CMTY_INVITE_URL = '" + V + "';"],
  ['la vista previa del enlace sale del dominio viejo', 'html', '<meta property="og:image" content="' + N, '<meta property="og:image" content="' + V],
  ['la dirección vieja deja de reconocerse (nadie saltaría)', 'infra', "const AVI_OLD_HOSTS=['kronos-apex.github.io'];", "const AVI_OLD_HOSTS=[];"],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar, poner] of SABOTAJES) {
  const src = orig[archivo];
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces (tiene que ser 1).`); continue; }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let rojo = false;
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { rojo = true; } finally { escribir(F[archivo], orig[archivo]); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»: la suite NO vigila esto.`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴 (los resultados de arriba no valen)'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
