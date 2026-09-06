// ─────────────────────────────────────────────────────────────────────────────
// _probe-delete-account.mjs — comprueba que la edge `delete-account` ARRANCA,
// SIN borrar absolutamente nada. (v574)
//
// 🔒 POR QUÉ ESTA SONDA Y NO OTRA. El camino destructivo de esta función no se
// puede ejecutar para probarlo: borraría una cuenta real. Pero un fallo de
// sintaxis, un import roto o una variable mal escrita tumban la función ENTERA
// al arrancar — y eso sí se puede detectar sin borrar nada:
//
//   · GET con sesión válida  → la función responde 405 «Method not allowed».
//     Esa respuesta la produce la SEGUNDA línea del handler, o sea que para
//     verla el módulo tuvo que cargar entero. Si el despliegue estuviera roto,
//     aquí saldría 500 o un error de arranque, no un 405.
//   · POST sin token         → 401. Confirma que el candado sigue puesto.
//
// ⚠️ LO QUE ESTA SONDA **NO** PRUEBA, y hay que decirlo: que el borrado borre lo
// que debe. Eso solo se comprueba borrando una cuenta desechable de verdad.
//
//   node scripts/e2e/_probe-delete-account.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const FN = `${URL_SB}/functions/v1/delete-account`;

// La llave PUBLICABLE, la misma que viaja en el JS de la app (no es un secreto).
const app = readFileSync(new URL('../../app-1-infra.js', import.meta.url), 'utf8');
const ANON = (app.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
if (!ANON) { console.error('No encontré la llave publicable en app-1-infra.js'); process.exit(1); }

let creds;
try { creds = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8')); }
catch { console.error('Faltan las credenciales de QA en ~/.avi/e2e-creds.json'); process.exit(1); }

let fallos = 0;
const afirma = (ok, txt, det) => {
  console.log(`  ${ok ? '\x1b[32mOK   \x1b[0m' : '\x1b[31mFALLA\x1b[0m'} ${txt}${det ? '  \x1b[90m' + det + '\x1b[0m' : ''}`);
  if (!ok) fallos++;
};

console.log('\n━━━ delete-account: ¿ARRANCA? (sin borrar nada) ━━━━━━━━━━━━━━\n');

// 1) Sin token: el candado responde antes que nada.
const sinToken = await fetch(FN, { method: 'POST', headers: { apikey: ANON }, body: '{}' });
afirma(sinToken.status === 401, 'sin sesión responde 401', `status=${sinToken.status}`);

// 2) Con sesión válida y GET: 405 — lo produce la 2ª línea del handler, así que el
//    módulo cargó entero. NO entra en ninguna rama de borrado.
const login = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: creds.email, password: creds.pass }),
});
const sesion = await login.json();
if (!sesion.access_token) {
  afirma(false, 'no pude iniciar sesión con la cuenta de QA', String(sesion.error_description || sesion.msg || login.status));
  console.log('\n(sin sesión no puedo comprobar el arranque; el 401 de arriba sí vale)\n');
  process.exit(1);
}
const get = await fetch(FN, {
  method: 'GET',
  headers: { apikey: ANON, Authorization: `Bearer ${sesion.access_token}` },
});
const cuerpo = await get.text();
afirma(get.status === 405, 'con sesión válida, un GET devuelve 405 → la función CARGÓ entera',
  `status=${get.status} body=${cuerpo.slice(0, 80)}`);
afirma(/Method not allowed/.test(cuerpo), 'y el 405 lo produce el handler, no la plataforma');

// 3) CONTROL DE DISCRIMINACIÓN: la sonda tiene que saber distinguir una función CAÍDA.
//    Se pide un slug que no existe; si eso también diera 405, la sonda no mediría nada.
const inexistente = await fetch(`${URL_SB}/functions/v1/delete-account-que-no-existe`, {
  method: 'GET', headers: { apikey: ANON, Authorization: `Bearer ${sesion.access_token}` },
});
afirma(inexistente.status !== 405, 'CONTROL: una función inexistente NO devuelve 405',
  `status=${inexistente.status}`);

console.log('\n' + '-'.repeat(68));
console.log('⚠️  Esto prueba que la función ARRANCA. NO prueba que el borrado borre lo');
console.log('   que debe: eso exige borrar una cuenta desechable de verdad.\n');
if (fallos) { console.log(`\x1b[31m${fallos} fallos\x1b[0m`); process.exit(1); }
console.log('\x1b[32mOK — delete-account cargó y sus dos guardas responden\x1b[0m');
process.exit(0);
