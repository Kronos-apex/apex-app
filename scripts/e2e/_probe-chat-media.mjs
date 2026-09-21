// _probe-chat-media.mjs — v649: el bucket PRIVADO del chat, probado con los MISMOS endpoints que la app.
//
// Lo que el harness de pantalla no puede probar (en localhost la subida está sellada): que una
// sesión real sube a SU carpeta, que el enlace firmado sirve el archivo, que SIN firma no se ve
// (el bucket no es público) y que a la carpeta de OTRO no se sube.
// ⚠️ Escribe en producción, y solo en la carpeta de la cuenta QA dedicada. Borra lo que sube
//    al terminar, pase lo que pase.
//
//   node scripts/e2e/_probe-chat-media.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMAIL, PASS } from './_creds.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const infra = readFileSync(join(ROOT, 'app-1-infra.js'), 'utf8');
const SB_URL = infra.match(/const SB_URL='([^']+)'/)[1];
const SB_KEY = infra.match(/const SB_KEY='([^']+)'/)[1];

const R = [];
const chk = (n, ok, d) => { R.push(ok); console.log(`${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`); };

const login = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASS }) }).then(r => r.json());
if (!login.access_token) { console.log('❌ no entró la cuenta QA:', login.error_description || login.msg); process.exit(1); }
const token = login.access_token, uid = login.user.id;
const H = { apikey: SB_KEY, Authorization: `Bearer ${token}` };
const path = `${uid}/chat-sonda${Date.now()}.jpg`;
// JPEG mínimo válido (1×1)
const jpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

try {
  const up = await fetch(`${SB_URL}/storage/v1/object/chat-media/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: jpg });
  chk('P1 la sesión sube a SU carpeta', up.ok, `HTTP ${up.status}`);

  const sg = await fetch(`${SB_URL}/storage/v1/object/sign/chat-media/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) });
  const sj = await sg.json().catch(() => ({}));
  const rel = sj.signedURL || sj.signedUrl;
  chk('P2 pide su enlace firmado', sg.ok && !!rel, `HTTP ${sg.status}`);
  if (rel) {
    const url = `${SB_URL}/storage/v1${rel.charAt(0) === '/' ? '' : '/'}${rel}`;
    const g = await fetch(url);
    const b = Buffer.from(await g.arrayBuffer());
    chk('P3 el enlace firmado sirve el archivo', g.ok && b.length === jpg.length, `HTTP ${g.status}, ${b.length} B`);
  }
  const pub = await fetch(`${SB_URL}/storage/v1/object/public/chat-media/${path}`);
  chk('P4 🔒 SIN firma NO se ve (el bucket no es público)', !pub.ok, `HTTP ${pub.status}`);
  const anon = await fetch(`${SB_URL}/storage/v1/object/sign/chat-media/${path}`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }) });
  chk('P5 🔒 sin sesión no se consigue enlace', !anon.ok, `HTTP ${anon.status}`);
  const ajena = `00000000-0000-4000-8000-000000000000/chat-sonda${Date.now()}.jpg`;
  const up2 = await fetch(`${SB_URL}/storage/v1/object/chat-media/${ajena}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: jpg });
  chk('P6 🔒 no sube a la carpeta de otra persona', !up2.ok, `HTTP ${up2.status}`);
  const pdf = await fetch(`${SB_URL}/storage/v1/object/chat-media/${uid}/chat-sonda${Date.now()}.pdf`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/pdf' }, body: jpg });
  chk('P7 el servidor rechaza tipos que no son foto o video', !pdf.ok, `HTTP ${pdf.status}`);
} finally {
  const del = await fetch(`${SB_URL}/storage/v1/object/chat-media`, { method: 'DELETE', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) });
  const quedan = await fetch(`${SB_URL}/storage/v1/object/list/chat-media`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: uid + '/', limit: 100 }) }).then(r => r.json()).catch(() => []);
  const sondas = Array.isArray(quedan) ? quedan.filter(f => /chat-sonda/.test(f.name)).length : -1;
  chk('P8 limpieza: no quedó ningún archivo de la sonda', del.ok && sondas === 0, `borrar HTTP ${del.status}, quedan ${sondas}`);
}
const ok = R.every(Boolean);
console.log(`\n${ok ? '🟢' : '🔴'} ${R.filter(Boolean).length}/${R.length}`);
process.exit(ok ? 0 : 1);
