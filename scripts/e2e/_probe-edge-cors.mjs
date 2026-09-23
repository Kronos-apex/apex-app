// ─────────────────────────────────────────────────────────────────────────────
// _probe-edge-cors.mjs — ¿las edge functions que llama el NAVEGADOR contestan a los
// DOS orígenes de la app, y siguen ARRANCANDO? Sin escribir nada. (mudanza, v662)
//
// 🔒 POR QUÉ. El día que la app se muda a `app.avientrena.com`, toda llamada a una edge
// desde el origen nuevo depende de que la respuesta diga ESE origen en
// `Access-Control-Allow-Origin`: si dice `kronos-apex.github.io`, el navegador la tira y
// la llamada falla EN SILENCIO (el push al coach, crear una cuenta, borrar la cuenta, la
// constancia de Comunidad). Medido el 23-sep ANTES de desplegar: las 6 contestaban
// github.io a todo el mundo, o sea que encender la mudanza sin desplegar las rompía.
//
// Qué afirma, por función:
//   · OPTIONS desde el origen NUEVO  → devuelve el origen NUEVO.
//   · OPTIONS desde el origen VIEJO  → devuelve el VIEJO (los rezagados siguen vivos).
//   · OPTIONS desde un origen AJENO  → NO lo refleja (control: si reflejara cualquier
//     origen, el candado sería un `*` disfrazado).
//   · GET con la sesión de QA        → 405 del PROPIO handler (la 2ª línea): para verlo el
//     módulo tuvo que cargar entero, así que un despliegue roto saldría 500. No entra en
//     ninguna rama que escriba.
//
// `daily-notifs` NO está: la llama el cron del servidor, que no manda `Origin`.
//
//   node scripts/e2e/_probe-edge-cors.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const NUEVO = 'https://app.avientrena.com';
const VIEJO = 'https://kronos-apex.github.io';
const AJENO = 'https://ejemplo-ajeno.invalid';
const FUNCIONES = ['send-push', 'delete-account', 'coach-create-client', 'refresh_snapshot', 'activate_public_profile'];

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

const login = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: creds.email, password: creds.pass }),
});
const sesion = await login.json();
// Control de montaje: sin sesión el 405 no se puede medir, y callar eso sería un verde por vacío.
if (!sesion.access_token) { console.error('No pude iniciar sesión con la cuenta de QA:', sesion.error_description || sesion.msg || login.status); process.exit(1); }

const pre = (fn, origin) => fetch(`${URL_SB}/functions/v1/${fn}`, {
  method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
});

for (const fn of FUNCIONES) {
  console.log(`\n━━━ ${fn} ━━━`);
  const n = (await pre(fn, NUEVO)).headers.get('access-control-allow-origin');
  afirma(n === NUEVO, 'el origen NUEVO recibe su propio origen', `dijo ${n}`);
  const v = (await pre(fn, VIEJO)).headers.get('access-control-allow-origin');
  afirma(v === VIEJO, 'el origen VIEJO sigue recibiendo el suyo', `dijo ${v}`);
  const a = (await pre(fn, AJENO)).headers.get('access-control-allow-origin');
  afirma(a !== AJENO && a !== '*', 'un origen AJENO no se refleja', `dijo ${a}`);
  const g = await fetch(`${URL_SB}/functions/v1/${fn}`, {
    method: 'GET', headers: { apikey: ANON, Authorization: `Bearer ${sesion.access_token}`, Origin: NUEVO },
  });
  const cuerpo = await g.text();
  afirma(g.status === 405 && /Method not allowed/.test(cuerpo), 'ARRANCA: GET con sesión → 405 del propio handler', `status=${g.status} ${cuerpo.slice(0, 80)}`);
  afirma(g.headers.get('access-control-allow-origin') === NUEVO, 'y esa respuesta también lleva el origen NUEVO', `dijo ${g.headers.get('access-control-allow-origin')}`);
}

console.log(fallos ? `\n\x1b[31m${fallos} FALLA(S)\x1b[0m\n` : '\n\x1b[32mTodo verde\x1b[0m\n');
process.exit(fallos ? 1 : 0);
