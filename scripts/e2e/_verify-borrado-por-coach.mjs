// ─────────────────────────────────────────────────────────────────────────────
// _verify-borrado-por-coach.mjs — EL COACH ELIMINA A UN ASESORADO SUYO Y SE VA TODO, INCLUIDO EL
// ACCESO; NADIE MÁS PUEDE (v680, R14).
//
// Borra DE VERDAD en producción, pero solo cuentas DESECHABLES creadas aquí mismo (patrón de
// `_verify-borrado-cuenta.mjs`, v574, autorizado por el PO): un coach B, su asesorado A y un
// extraño S. Correos `@avi-pruebas.local` (un dominio que no puede recibir correo) y cuentas creadas
// ya confirmadas: no sale NI UN correo. Sembrado de A: ficha, tarjeta pública, push, error
// registrado y DOS archivos en los almacenes privados (fotos de progreso y chat) — lo que el arreglo
// promete llevarse y lo que `_verify-borrado-cuenta` no cubría.
//
// 🔒 CANDADOS: solo corre con `--si-borrar` · jamás toca un uid que no haya creado esta corrida ·
//    aborta si alguno coincide con el del PO · CONTROL DE NO-DAÑO: las tarjetas del PO y el total de
//    fichas quedan exactamente igual.
//   node scripts/e2e/_verify-borrado-por-coach.mjs --si-borrar
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

if (!process.argv.includes('--si-borrar')) { console.log('Sin --si-borrar no hago nada (borra cuentas desechables en producción).'); process.exit(0); }
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const COACH_UID = '0a6484ed-42af-449d-9903-e440ac683ecf';
const PREFIJO = 'r14-borrado-';
const KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const app = readFileSync(new URL('../../app-1-infra.js', import.meta.url), 'utf8');
const ANON = (app.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
if (!ANON) { console.error('No encontré la llave publicable'); process.exit(1); }

let fallos = 0;
const afirma = (ok, txt, det) => { console.log(`  ${ok ? 'OK   ' : 'FALLA'} ${txt}${det ? '  — ' + det : ''}`); if (!ok) fallos++; };
const sb = (ruta, init = {}) => fetch(`${URL_SB}/rest/v1/${ruta}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
const cuenta = async ruta => { const r = await sb(ruta, { headers: { Prefer: 'count=exact', Range: '0-0' } }); return Number((r.headers.get('content-range') || '/0').split('/')[1]); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const subir = (bucket, ruta) => fetch(`${URL_SB}/storage/v1/object/${bucket}/${ruta}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'image/png' }, body: PNG });
const archivos = async (bucket, carpeta) => { const r = await fetch(`${URL_SB}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: H, body: JSON.stringify({ prefix: carpeta, limit: 100 }) }); const j = await r.json(); return Array.isArray(j) ? j.length : -1; };
const existeCuenta = async uid => (await fetch(`${URL_SB}/auth/v1/admin/users/${uid}`, { headers: H })).status === 200;

async function crear(etiqueta) {
  const correo = `${PREFIJO}${etiqueta}-${Date.now()}@avi-pruebas.local`;
  const clave = 'Prueba-' + Math.random().toString(36).slice(2) + '-Aa1!';
  const r = await fetch(`${URL_SB}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email: correo, password: clave, email_confirm: true }) });
  const j = await r.json();
  if (!j?.id || j.id === COACH_UID) throw new Error('no pude crear ' + etiqueta + ': ' + JSON.stringify(j).slice(0, 150));
  return { uid: j.id, correo, clave };
}
async function sesion(u) {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.correo, password: u.clave }) });
  const j = await r.json(); if (!j.access_token) throw new Error('sin sesión: ' + JSON.stringify(j).slice(0, 120)); return j.access_token;
}
const pedir = async (token, cuerpo) => { const r = await fetch(`${URL_SB}/functions/v1/delete-account`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); let j = {}; try { j = await r.json(); } catch {} return { status: r.status, ...j }; };

console.log('\n━━━ ¿EL COACH ELIMINA A SU ASESORADO DE VERDAD, Y SOLO A ÉL? (cuentas desechables) ━━━\n');
const tarjetasPO = await cuenta(`avi_showcase?coach_id=eq.${COACH_UID}&select=id`);
const fichasAntes = await cuenta('user_data?select=user_id');
console.log(`  (control: el PO tiene ${tarjetasPO} tarjetas y hay ${fichasAntes} fichas)\n`);

const creados = [];
try {
  const B = await crear('coach'); creados.push(B.uid);
  const A = await crear('asesorado'); creados.push(A.uid);
  const S = await crear('extrano'); creados.push(S.uid);
  const NOMBRE = 'PruebaR14 Borrado';
  let r = await sb('user_data', { method: 'POST', body: JSON.stringify({ user_id: B.uid, coach_id: B.uid, role: 'coach', profile: { name: 'Coach R14' } }) });
  afirma(r.ok, 'ficha del coach desechable', 'status=' + r.status);
  r = await sb('user_data', { method: 'POST', body: JSON.stringify({ user_id: A.uid, coach_id: B.uid, role: 'client', profile: { name: NOMBRE, age: 30 }, routines: [], history: [] }) });
  afirma(r.ok, 'ficha del asesorado (su coach_id es B)', 'status=' + r.status);
  r = await sb('user_data', { method: 'POST', body: JSON.stringify({ user_id: S.uid, coach_id: S.uid, role: 'client', profile: { name: 'Extraño R14' } }) });
  afirma(r.ok, 'ficha del extraño (no es coach de A)', 'status=' + r.status);
  r = await sb('avi_showcase', { method: 'POST', body: JSON.stringify({ coach_id: B.uid, nombre: NOMBRE.split(/\s+/)[0], entrenos: 9, meses: 1, subidas: [{ ejercicio: 'Prensa de Pierna', de: 40, a: 60 }], subieron: 1, con_carga: 1 }) });
  afirma(r.ok, 'su tarjeta pública', 'status=' + r.status);
  r = await sb('push_subscriptions', { method: 'POST', body: JSON.stringify({ client_id: A.uid, subscription: { endpoint: 'https://ejemplo.invalido/r14', keys: {} } }) });
  afirma(r.ok, 'su suscripción de avisos', 'status=' + r.status);
  r = await sb('app_errors', { method: 'POST', body: JSON.stringify({ uid: A.uid, kind: 'error', msg: 'prueba r14', src: 'harness', build: 'avi-v680', ua: 'harness' }) });
  afirma(r.ok, 'un error suyo registrado', 'status=' + r.status);
  for (const b of ['progress-photos', 'chat-media']) { r = await subir(b, `${A.uid}/r14.png`); afirma(r.ok, `un archivo suyo en ${b}`, 'status=' + r.status); }

  // ── 1 · un EXTRAÑO no puede ────────────────────────────────────────────────
  const tS = await sesion(S);
  const x = await pedir(tS, { cliente: A.uid });
  afirma(x.status === 403 && x.error === 'not_your_client', '🔒 un extraño NO puede eliminar al asesorado de otro', JSON.stringify(x).slice(0, 90));
  afirma(await existeCuenta(A.uid) && await cuenta(`user_data?user_id=eq.${A.uid}&select=user_id`) === 1 && await archivos('progress-photos', A.uid) === 1,
    '🔒 y el asesorado quedó INTACTO (cuenta, ficha y fotos)');

  // ── 2 · nadie apunta al PO ni a sí mismo ──────────────────────────────────
  const tB = await sesion(B);
  const y = await pedir(tB, { cliente: COACH_UID });
  afirma(y.status === 403 && y.error === 'not_allowed', '🔒 nadie puede apuntar a la cuenta del coach real', JSON.stringify(y).slice(0, 90));
  const z = await pedir(tB, { cliente: 'no-es-un-uuid' });
  afirma(z.status === 400, 'un objetivo que no es un id se rechaza', JSON.stringify(z).slice(0, 80));

  // ── 3 · SU coach sí, y se va TODO ──────────────────────────────────────────
  const ok = await pedir(tB, { cliente: A.uid });
  afirma(ok.status === 200 && ok.ok === true && ok.porCoach === true, 'su coach lo elimina', JSON.stringify(ok).slice(0, 110));
  afirma(ok.tarjetasQuitadas === 1, 'y dice que quitó su tarjeta pública', 'tarjetasQuitadas=' + ok.tarjetasQuitadas);
  afirma(!(await existeCuenta(A.uid)), '🔴 su CUENTA DE ACCESO ya no existe (no puede volver a entrar)');
  afirma(await cuenta(`user_data?user_id=eq.${A.uid}&select=user_id`) === 0, 'su ficha ya no está');
  afirma(await cuenta(`avi_showcase?coach_id=eq.${B.uid}&select=id`) === 0, 'su tarjeta pública ya no está');
  afirma(await cuenta(`push_subscriptions?client_id=eq.${A.uid}&select=id`) === 0, 'sus avisos ya no están');
  afirma(await cuenta(`app_errors?uid=eq.${A.uid}&select=id`) === 0, 'sus errores registrados ya no están');
  afirma(await archivos('progress-photos', A.uid) === 0, 'sus fotos de progreso ya no están');
  afirma(await archivos('chat-media', A.uid) === 0, 'sus fotos del chat ya no están');
  afirma(await existeCuenta(B.uid) && await existeCuenta(S.uid), '🔒 el coach y el extraño siguen vivos');
} catch (e) {
  afirma(false, 'la prueba se cayó', String(e).slice(0, 160));
} finally {
  console.log('\n  limpiando las cuentas desechables…');
  for (const uid of creados) {
    if (!uid || uid === COACH_UID) continue;
    for (const b of ['progress-photos', 'chat-media']) await fetch(`${URL_SB}/storage/v1/object/${b}/${uid}/r14.png`, { method: 'DELETE', headers: H });
    await sb(`avi_showcase?coach_id=eq.${uid}`, { method: 'DELETE' });
    await sb(`push_subscriptions?client_id=eq.${uid}`, { method: 'DELETE' });
    await sb(`app_errors?uid=eq.${uid}`, { method: 'DELETE' });
    await fetch(`${URL_SB}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: H });
  }
}
const tarjetasPO2 = await cuenta(`avi_showcase?coach_id=eq.${COACH_UID}&select=id`);
const fichasDespues = await cuenta('user_data?select=user_id');
afirma(tarjetasPO2 === tarjetasPO, '🔒 CONTROL: las tarjetas del PO quedaron intactas', `${tarjetasPO} → ${tarjetasPO2}`);
afirma(fichasDespues === fichasAntes, '🔒 CONTROL: el total de fichas quedó como estaba', `${fichasAntes} → ${fichasDespues}`);
console.log('\n' + '-'.repeat(68));
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('OK — el coach elimina a su asesorado de verdad (acceso incluido), y nadie más puede');
process.exit(0);
