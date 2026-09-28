// Matriz de sabotaje de v679 — el login reconoce el correo sin confirmar y «olvidé mi contraseña» no
// manda el enlace a un dominio ajeno. Cada fila devuelve UN defecto y la suite TIENE que ponerse roja.
// Reemplazos con FUNCIÓN y escritura ATÓMICA.   node scripts/e2e/_sabotaje-v679.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), login: join(ROOT, 'app-2-login.js'), infra: join(ROOT, 'app-1-infra.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['el motor deja de reconocer el correo sin confirmar', 'core',
    "  if (err.code === 'email_not_confirmed') return true;\n  return /email not confirmed/i.test(String(err.message || ''));",
    "  return false;"],
  ['el login deja de preguntarlo', 'login',
    "_sinConfirmar=!_falloDeRed&&(typeof loginNeedsConfirm==='function')&&loginNeedsConfirm(r&&r.error);",
    "_sinConfirmar=false;"],
  ['el aviso se apaga con un if(false)', 'login', 'if(_sinConfirmar){', 'if(false){'],
  ['el aviso no corta y el intento se gasta igual', 'login',
    "onclick=\"reenviarConfirmacion()\">Reenviar correo</button>';\n      err.classList.add('on');\n      return;",
    "onclick=\"reenviarConfirmacion()\">Reenviar correo</button>';\n      err.classList.add('on');"],
  ['el reenvío pide otro tipo de correo', 'infra', "c.auth.resend({type:'signup',email,", "c.auth.resend({type:'magiclink',email,"],
  ['el reenvío pierde el compás de 60 s', 'login',
    "  const falta=RESET_COOLDOWN_MS-(Date.now()-_confirmEnviadoAt);", "  const falta=0-(Date.now()-_confirmEnviadoAt);"],
  ['«olvidé mi contraseña» vuelve a mandar el enlace a cualquier dominio', 'login',
    "  if(typeof resetPassWouldLeak==='function'&&resetPassWouldLeak(correo)){", "  if(false){"],
  ['la lista de dominios ajenos se vacía', 'core',
    "const RESET_DOMINIOS_AJENOS = ['avi.com', 'apex.com'];", "const RESET_DOMINIOS_AJENOS = [];"],
  ['el dominio se compara por el final (se come mail.avi.com)', 'core',
    "  return RESET_DOMINIOS_AJENOS.indexOf(e.slice(i + 1)) >= 0;",
    "  return RESET_DOMINIOS_AJENOS.some(d => e.endsWith(d));"],
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
