// Verificación de v600 — «LAS FOTOS SÍ LLEGAN AL BUCKET».
//
// Esto no necesita navegador: reproduce EXACTAMENTE lo que hace `uploadPhotoToStorage` (POST con
// `x-upsert:true` y el JWT de la sesión) contra el bucket REAL, con la cuenta QA.
//
// Prueba las dos mitades del arreglo y sus controles:
//   S1 subida a la carpeta PROPIA con `x-upsert` → 200      ← necesita la policy `apex_photos_select_own`
//   S2 y la SEGUNDA subida al mismo objeto también → 200    ← el upsert de verdad (reemplazar la foto)
//   S3 CONTROL de seguridad: carpeta de OTRO → 403          ← la policy no se puede ensanchar
//   S4 CONTROL de seguridad: raíz sin carpeta → 403
//   S5 CONTROL del diagnóstico: sin `x-upsert` daba 200 incluso ANTES del arreglo, así que si S1
//      falla y S5 pasa, lo que falta es la policy y no otra cosa
//   S6 el bucket hermano `avatars` sigue funcionando (no se toca, pero es el espejo)
//
// 🛑 Sube un JPEG de 1x1 bajo la carpeta de la cuenta QA y lo BORRA al terminar. No toca a nadie real.
// Corre: node scripts/e2e/_verify-v600.mjs
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const ANON = 'sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8';
const SERVICE = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const { email, pass } = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
// JPEG 1x1 real (no un placeholder: el bucket filtra por mime y un archivo falso daría otro error).
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDIzNP/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAAwDAQACEQMRAD8A/v4oooA//9k=', 'base64');

const results = [];
const check = (n, c, x = '') => { const l = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };

const ses = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: pass }),
})).json();
if (!ses.access_token) { console.log('ERROR: no hubo sesión QA (¿rate limit?):', JSON.stringify(ses).slice(0, 160)); process.exit(1); }
const T = ses.access_token, UID = ses.user.id;
console.log('cuenta QA · uuid =', UID, '\n');

const borrar = async (path, bucket = 'apex-photos') => {
  await fetch(`${SB}/storage/v1/object/${bucket}`, {
    method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  }).catch(() => {});
};
const subir = async (path, { upsert = true, bucket = 'apex-photos' } = {}) => {
  const h = { apikey: ANON, Authorization: `Bearer ${T}`, 'Content-Type': 'image/jpeg' };
  if (upsert) h['x-upsert'] = 'true';
  const r = await fetch(`${SB}/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers: h, body: JPEG });
  return [r.status, (await r.text()).replace(/\s+/g, ' ').slice(0, 120)];
};

const n = Date.now();
const propio = `${UID}/_v600-${n}.jpg`;

// ── S1 · lo que hace la app: POST con x-upsert a la carpeta propia ──
let [st, cuerpo] = await subir(propio);
check('S1 subida con x-upsert a la carpeta propia', st === 200, `HTTP ${st} ${st === 200 ? '' : cuerpo}`);

// ── S2 · el upsert de VERDAD: repetir el mismo objeto (es lo que hace reemplazar tu avatar) ──
if (st === 200) {
  const [st2, c2] = await subir(propio);
  check('S2 repetir el MISMO objeto (reemplazar la foto de perfil)', st2 === 200, `HTTP ${st2} ${st2 === 200 ? '' : c2}`);
  // y se puede leer por la URL pública, que es como la ve la app
  const pub = await fetch(`${SB}/storage/v1/object/public/apex-photos/${propio}`);
  check('S2b y se lee por su URL pública (que es lo que guarda la app)', pub.ok, 'HTTP ' + pub.status);
  await borrar(propio);
  console.log('     (objetos de prueba BORRADOS)');
} else {
  check('S2 repetir el MISMO objeto (reemplazar la foto de perfil)', false, 'no se pudo: S1 falló');
}

// ── S3/S4 · los CONTROLES de seguridad: el arreglo no puede ensanchar la guarda ──
[st, cuerpo] = await subir(`00000000-0000-0000-0000-000000000000/_v600-${n}.jpg`);
check('S3-CONTROL a la carpeta de OTRO sigue prohibido', st !== 200, 'HTTP ' + st);
[st, cuerpo] = await subir(`_v600-raiz-${n}.jpg`);
check('S4-CONTROL a la raíz del bucket sigue prohibido', st !== 200, 'HTTP ' + st);

// ── S5 · CONTROL DEL DIAGNÓSTICO ──
// Sin `x-upsert` esto ya daba 200 ANTES del arreglo. Si S1 falla y esto pasa, lo que falta es la
// policy SELECT y no el token, ni el mime, ni el tamaño, ni la ruta.
const sinUpsert = `${UID}/_v600-nu-${n}.jpg`;
const [st5] = await subir(sinUpsert, { upsert: false });
if (st5 === 200) await borrar(sinUpsert);
check('S5-CONTROL sin x-upsert sube igual (aísla que lo que falta es la policy SELECT)', st5 === 200, 'HTTP ' + st5);

// ── S6 · el bucket hermano, que ya lo tenía bien, sigue bien ──
const av = `${UID}/_v600-av-${n}.jpg`;
const [st6] = await subir(av, { bucket: 'avatars' });
if (st6 === 200) await borrar(av, 'avatars');
check('S6-CONTROL el bucket avatars (el espejo) sigue aceptando el upsert', st6 === 200, 'HTTP ' + st6);

const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log('\n' + (fails === 0 ? 'TODO OK — las fotos ya suben al bucket' : fails + ' FALLA(S)'));
if (results.some(r => /^FAIL S1/.test(r)) && results.some(r => /^OK S5/.test(r))) {
  console.log('\n⏭️  FALTA APLICAR LA MIGRACIÓN: supabase/migrations/20260910_apex_photos_select_policy.sql');
  console.log('    (S5 pasa y S1 no: el token y la ruta están bien, falta la policy SELECT del bucket)');
}
process.exitCode = fails === 0 ? 0 : 1;
