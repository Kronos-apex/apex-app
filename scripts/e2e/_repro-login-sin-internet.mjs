// Segunda mitad de la pregunta de Claudia: una cosa es ABRIR la app sin internet (eso ya
// esta probado que funciona, `_repro-sin-internet.mjs`) y otra muy distinta es INICIAR
// SESION sin internet — que es lo que le toca a quien cerro sesion, se le vencio, o entra
// desde otro telefono.
//
// Lo que se mide: (a) si entra, (b) QUE LE DICE la app. Lo segundo pesa igual que lo
// primero: si le responde «email o contrasena incorrectos» va a creer que se le olvido la
// clave, cuando lo unico que pasa es que no hay senal.
//
//   node scripts/e2e/_repro-login-sin-internet.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

// Por defecto mide PRODUCCION; con AVI_URL se apunta a una copia local para probar un
// arreglo antes de desplegarlo (localhost cuenta como contexto seguro, asi que el
// Service Worker se registra igual).
const URL = process.env.AVI_URL || 'https://kronos-apex.github.io/apex-app/';
const CREDS = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
const PORT = 9407;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
   '--user-data-dir=' + join(process.env.TEMP, 'offlog-' + Date.now()),
   '--no-first-run', '--window-size=390,844', 'about:blank']);

const dormir = ms => new Promise(r => setTimeout(r, ms));
// Chrome puede tardar en abrir el puerto; se reintenta en vez de reventar con ECONNREFUSED.
let t0 = null;
for (let i = 0; i < 20 && !t0; i++) {
  await dormir(1000);
  try { t0 = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(x => x.type === 'page'); }
  catch (e) { t0 = null; }
}
if (!t0) { console.log('🔴 Chrome no abrio el puerto de depuracion'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(t0.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', m => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
const cmd = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;
await cmd('Network.enable'); await cmd('Page.enable');

// 1. Primera visita CON red, para que el Service Worker cachee el shell (sin esto no habria
//    nada que abrir y la prueba mediria otra cosa).
await cmd('Page.navigate', { url: URL });
await dormir(7000);
// El SW pasa por installing -> waiting -> active: se espera a que ACTIVE, no se mira una vez.
let swOk = false;
for (let i = 0; i < 12 && !swOk; i++) {
  swOk = await ev(`(async()=>{try{const r=await navigator.serviceWorker.getRegistration();
    return !!(r&&r.active)}catch(e){return false}})()`);
  if (!swOk) await dormir(2000);
}
console.log('1. shell cacheado (SW activo) →', swOk);
if (!swOk) { console.log('   🔴 sin SW no hay nada que probar'); ws.close(); chrome.kill(); process.exit(1); }

// 2. Nos aseguramos de que NO hay sesion guardada: es el caso de quien cerro sesion,
//    se le vencio (30 dias) o entra desde otro telefono.
// Se borra TODO rastro de sesion, no solo `ax_session`: supabase-js guarda su propio
// testigo (`sb-...-auth-token`) y con el la app entra por otra puerta. El caso que hay que
// probar es el de quien NUNCA ha entrado en ese telefono o le dio «Salir».
await ev(`(()=>{try{Object.keys(localStorage).filter(k=>/^ax_session$|^sb-|auth-token/i.test(k))
  .forEach(k=>localStorage.removeItem(k))}catch(e){} return 1})()`);
const haySesion = await ev(`(()=>{try{return Object.keys(localStorage)
  .some(k=>/^ax_session$|^sb-|auth-token/i.test(k))}catch(e){return false}})()`);
console.log('2. sesion guardada           →', haySesion ? 'SI (el control fallo)' : 'no (como quien tiene que entrar)');

// 3. Cortar la red y recargar.
await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await cmd('Page.reload', { ignoreCache: false });
await dormir(11000);
let est = JSON.parse(await ev(`JSON.stringify({
  pantallas:[...document.querySelectorAll('.screen')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id),
  splash:!!(document.getElementById('apex-loading')&&getComputedStyle(document.getElementById('apex-loading')).display!=='none')
})`) || '{}');
console.log('3. sin red, abre en          →', est.pantallas.join(',') || '(ninguna)', '· splash pegado:', est.splash);

// 4. Intentar entrar con las credenciales BUENAS, sin red.
await ev(`(()=>{const u=document.getElementById('lu'),p=document.getElementById('lp');
  if(u)u.value=${JSON.stringify(CREDS.email)}; if(p)p.value=${JSON.stringify(CREDS.pass)}; return 1})()`);
await ev(`(typeof doLogin==='function')?doLogin():null`);
await dormir(12000);

const res = JSON.parse(await ev(`JSON.stringify({
  pantallas:[...document.querySelectorAll('.screen')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id),
  aviso:[...document.querySelectorAll('#s-login .lerr, #s-login .cin-err, #s-login [id*=err], .toast')]
    .filter(e=>{const cs=getComputedStyle(e); const r=e.getBoundingClientRect();
      return cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity||1)>0.05&&r.width>1&&r.height>1;})
    .map(e=>(e.innerText||'').trim()).filter(Boolean).join(' | '),
  texto:(document.getElementById('s-login')||document.body).innerText.replace(/\\s+/g,' ').trim()
})`) || '{}');

const entro = res.pantallas.includes('s-client') || res.pantallas.includes('s-coach');
console.log('4. tras intentar entrar      →', res.pantallas.join(',') || '(ninguna)');
// ¿ENTRO DE VERDAD o quedo una cascara vacia? Se exige identidad y contenido, no una
// pantalla visible: «pantalla presente» no es «app usable» (leccion del boot-check, v312).
const dentro = JSON.parse(await ev(`JSON.stringify({
  id:(typeof CUR!=='undefined'&&CUR&&CUR.clientId)?String(CUR.clientId).slice(0,8):null,
  nombre:(document.querySelector('#s-client .tg-name, #cn-greet')||{}).innerText||'',
  hayPlan:!!document.querySelector('#s-client .exrow, #s-client .today-hero, #cn-today-head *'),
  visible:(document.getElementById('s-client')||{}).innerText ? (document.getElementById('s-client').innerText||'').replace(/\s+/g,' ').trim().slice(0,90) : ''
})`) || '{}');
console.log('   identidad cargada         →', dentro.id ? 'si (' + dentro.id + '…)' : 'NO');
console.log('   contenido suyo a la vista →', dentro.hayPlan ? 'si' : 'NO', '·', dentro.visible.slice(0,70));
console.log('   lo que le dice la app     →', res.aviso || '(ningun aviso visible)');

// ¿El mensaje culpa a sus credenciales o nombra la conexion?
const culpaClave = /incorrect|no coincide|invalid|contrase/i.test(res.aviso);
const nombraRed = /conexi|internet|red|sin señal|sin senal|offline/i.test(res.aviso);

console.log('\nVEREDICTO');
console.log('  entrar sin red con sesion guardada : ✅ (probado en _repro-sin-internet)');
console.log('  INICIAR SESION sin red             : ' + (entro ? '✅ entra' : '🔴 NO entra'));
if (!entro) {
  console.log('  el aviso nombra la conexion        : ' + (nombraRed ? '✅ si' : '🔴 NO'));
  if (culpaClave && !nombraRed) {
    console.log('  🔴 y le echa la culpa a su contrasena: va a creer que se le olvido la clave');
  }
}
ws.close(); chrome.kill();
process.exit((entro || nombraRed) ? 0 : 1);
