#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _verify-borrado-cuenta.mjs — prueba el camino DESTRUCTIVO de `delete-account`
// de la única forma que se puede probar: borrando de verdad, pero una cuenta
// DESECHABLE que se crea aquí mismo. (v574)
//
// POR QUÉ EXISTE. La sonda `_probe-delete-account.mjs` solo prueba que la función
// ARRANCA. Que borre lo que debe —y sobre todo que retire la TARJETA PÚBLICA, que
// es el único dato de una persona que se lee sin cuenta— no se puede afirmar sin
// ejecutarlo. Autorizado por el PO el 2026-09-05.
//
// 🔒 LOS CANDADOS, y son la parte importante de este archivo:
//   1. Solo corre con `--si-borrar`. Sin el flag, no hace nada.
//   2. La cuenta desechable es SU PROPIO COACH. Así su tarjeta de prueba vive en
//      un coach_id que no es el del PO, y el tope de 6 tarjetas (que es POR COACH)
//      no puede rozar las suyas.
//   3. NUNCA borra una cuenta que no haya creado esta misma corrida: se exige que
//      el correo lleve el prefijo desechable Y que el uid sea el que acaba de
//      crear. Y se aborta si por lo que sea coincidiera con el uid del coach.
//   4. CONTROL DE NO-DAÑO: cuenta las tarjetas del PO antes y después. Si el
//      número cambió, la corrida FALLA aunque todo lo demás salga bien.
//   5. Limpia lo que sobreviva, para no dejar basura en producción.
//
//   node scripts/e2e/_verify-borrado-cuenta.mjs --si-borrar
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

if (!process.argv.includes('--si-borrar')) {
  console.log('\nEsta prueba CREA y BORRA una cuenta real (desechable) en producción.');
  console.log('Corre con --si-borrar si es lo que quieres.\n');
  process.exit(0);
}

const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const COACH_UID = '0a6484ed-42af-449d-9903-e440ac683ecf';
const MARCA = '🧪 PRUEBA BORRADO (desechable)';
const PREFIJO = 'avi-e2e-borrado-';

const KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const app = readFileSync(new URL('../../app-1-infra.js', import.meta.url), 'utf8');
const ANON = (app.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
if (!ANON) { console.error('No encontré la llave publicable'); process.exit(1); }

let fallos = 0;
const afirma = (ok, txt, det) => {
  console.log(`  ${ok ? '\x1b[32mOK   \x1b[0m' : '\x1b[31mFALLA\x1b[0m'} ${txt}${det ? '  \x1b[90m' + det + '\x1b[0m' : ''}`);
  if (!ok) fallos++;
};
const sb = (ruta, init = {}) => fetch(`${URL_SB}/rest/v1/${ruta}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
const cuenta = async (ruta) => {
  const r = await sb(ruta, { headers: { Prefer: 'count=exact', Range: '0-0' } });
  return Number((r.headers.get('content-range') || '/0').split('/')[1]);
};

console.log('\n━━━ ¿BORRAR LA CUENTA BORRA LO QUE PROMETE? (cuenta desechable) ━━━\n');

// ── CONTROL DE NO-DAÑO (antes) ──────────────────────────────────────────────
const tarjetasCoachAntes = await cuenta(`avi_showcase?coach_id=eq.${COACH_UID}&select=id`);
const personasAntes = await cuenta('user_data?select=user_id');
console.log(`  (control: el coach tiene ${tarjetasCoachAntes} tarjetas y hay ${personasAntes} filas de user_data)\n`);

// ── 1. Crear la cuenta desechable ───────────────────────────────────────────
const correo = `${PREFIJO}${Date.now()}@avi-pruebas.local`;
const clave = 'Prueba-' + Math.random().toString(36).slice(2) + '-Aa1!';
const cre = await fetch(`${URL_SB}/auth/v1/admin/users`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ email: correo, password: clave, email_confirm: true }),
});
const nueva = await cre.json();
const uid = nueva?.id;
if (!uid) { console.error('No pude crear la cuenta desechable:', JSON.stringify(nueva).slice(0, 200)); process.exit(1); }
// 🔒 CANDADO 3: jamás tocar al coach, pase lo que pase.
if (uid === COACH_UID) { console.error('ABORTO: el uid creado es el del coach'); process.exit(1); }
afirma(true, 'cuenta desechable creada', uid);

let limpiar = true;
try {
  // ── 2. Sembrar TODO lo que el borrado debe llevarse ───────────────────────
  //     Es su propio coach: así su tarjeta no cuenta contra el tope del PO.
  const perfil = { name: MARCA, age: 30, sex: 'm' };
  let r = await sb('user_data', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: uid, coach_id: uid, role: 'client', profile: perfil, routines: [], history: [] }),
  });
  afirma(r.ok, 'sembrada su fila de user_data', 'status=' + r.status);

  r = await sb('avi_showcase', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      coach_id: uid, nombre: MARCA.split(/\s+/)[0], entrenos: 12, meses: 2,
      subidas: [{ ejercicio: 'Prensa de Pierna', de: 40, a: 90 }], subieron: 1, con_carga: 1,
    }),
  });
  afirma(r.ok, 'sembrada su TARJETA PÚBLICA', 'status=' + r.status);

  r = await sb('push_subscriptions', {
    method: 'POST',
    body: JSON.stringify({ client_id: uid, subscription: { endpoint: 'https://ejemplo.invalido/x', keys: {} } }),
  });
  afirma(r.ok, 'sembrada su suscripción de push', 'status=' + r.status);

  r = await sb('app_errors', {
    method: 'POST',
    body: JSON.stringify({ uid, kind: 'error', msg: 'prueba de borrado', src: 'harness', build: 'avi-v574', ua: 'harness' }),
  });
  afirma(r.ok, 'sembrado un error suyo registrado', 'status=' + r.status);

  // ── 3. Iniciar sesión COMO ELLA y pedir el borrado, igual que la app ──────
  const log = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo, password: clave }),
  });
  const ses = await log.json();
  if (!ses.access_token) { afirma(false, 'no pude iniciar sesión como la desechable', JSON.stringify(ses).slice(0, 120)); throw new Error('sin sesión'); }

  const del = await fetch(`${URL_SB}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ses.access_token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const res = await del.json();
  afirma(del.ok && res.ok === true, 'la función respondió que borró', JSON.stringify(res).slice(0, 120));
  afirma(res.tarjetasQuitadas === 1, 'y dice que quitó 1 tarjeta', 'tarjetasQuitadas=' + res.tarjetasQuitadas);

  // ── 4. ¿De verdad se fue todo? ────────────────────────────────────────────
  afirma(await cuenta(`user_data?user_id=eq.${uid}&select=user_id`) === 0, 'su perfil ya no está');
  afirma(await cuenta(`avi_showcase?coach_id=eq.${uid}&select=id`) === 0, '🔴 su TARJETA PÚBLICA ya no está');
  afirma(await cuenta(`push_subscriptions?client_id=eq.${uid}&select=id`) === 0, 'su push ya no está');
  afirma(await cuenta(`app_errors?uid=eq.${uid}&select=id`) === 0, 'sus errores registrados ya no están');
  const quedaCuenta = await fetch(`${URL_SB}/auth/v1/admin/users/${uid}`, { headers: H });
  afirma(quedaCuenta.status === 404, 'su cuenta de acceso ya no existe', 'status=' + quedaCuenta.status);
  limpiar = false;   // si todo se fue, no hay nada que limpiar
} catch (e) {
  afirma(false, 'la prueba se cayó', String(e).slice(0, 120));
} finally {
  if (limpiar) {
    console.log('\n  limpiando lo que quedó de la cuenta desechable…');
    await sb(`avi_showcase?coach_id=eq.${uid}`, { method: 'DELETE' });
    await sb(`push_subscriptions?client_id=eq.${uid}`, { method: 'DELETE' });
    await sb(`app_errors?uid=eq.${uid}`, { method: 'DELETE' });
    await sb(`user_data?user_id=eq.${uid}`, { method: 'DELETE' });
    await fetch(`${URL_SB}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: H });
  }
}

// ── CONTROL DE NO-DAÑO (después) ────────────────────────────────────────────
// 🔒 Si esto falla, la corrida falla aunque todo lo demás haya salido verde.
const tarjetasCoachDespues = await cuenta(`avi_showcase?coach_id=eq.${COACH_UID}&select=id`);
const personasDespues = await cuenta('user_data?select=user_id');
afirma(tarjetasCoachDespues === tarjetasCoachAntes,
  '🔒 CONTROL: las tarjetas del coach quedaron intactas',
  `${tarjetasCoachAntes} → ${tarjetasCoachDespues}`);
afirma(personasDespues === personasAntes,
  '🔒 CONTROL: las filas de user_data quedaron como estaban',
  `${personasAntes} → ${personasDespues}`);

console.log('\n' + '-'.repeat(68));
if (fallos) { console.log(`\x1b[31m${fallos} fallos\x1b[0m`); process.exit(1); }
console.log('\x1b[32mOK — borrar la cuenta se lleva TODO, incluida la tarjeta pública\x1b[0m');
process.exit(0);
