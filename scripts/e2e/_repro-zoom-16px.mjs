// ─────────────────────────────────────────────────────────────────────────────
// _repro-zoom-16px.mjs — NINGÚN CAMPO QUE SE TECLEA PUEDE BAJAR DE 16 px
//
// EL DEFECTO: Safari en iPhone hace ZOOM automático al enfocar un campo cuyo `font-size` es menor
// que 16 px. La pantalla se agranda, se descoloca, y la persona queda escribiendo dentro de una
// vista ampliada de la que no sabe salir. Es de la misma familia que el reporte de Kathe: la app
// no está rota, pero la persona no puede usarla.
//
// 🔴 POR QUÉ ESTE HARNESS Y NO EL CANDADO DE v526: en v526 puse en `avi.test.js` un candado que
// lee `styles.css` COMO TEXTO y resuelve el font-size «por clase». Tiene tres agujeros que
// confirmé uno por uno y que dejaron ocho campos con el defecto detrás de una luz verde:
//   · 13 campos tecleables NO llevan `class` — el candado ni los mira;
//   · no entiende selectores de descendencia (`.cchat-composer textarea` estaba a 14 px y es
//     invisible para una tabla clase→tamaño);
//   · no ve `font-size` puesto en `style=` en la propia etiqueta (9 campos lo traen).
// La lección: **el tamaño de letra de un campo no se puede deducir del texto del CSS.** Solo el
// navegador sabe qué gana la cascada. Por eso esto se mide con `getComputedStyle` sobre el DOM
// VIVO, que es la única autoridad.
//
// CÓMO SE BARRE TODO SIN ABRIR TODO: `getComputedStyle` resuelve el valor aunque el elemento (o
// su padre) esté en `display:none`. Así que tras entrar se barre el documento ENTERO — app del
// asesorado y panel del coach, modales cerrados incluidos — sin tener que navegar a cada pantalla.
//
// 🔎 POR QUÉ SE SALTAN LOS `[hidden]`: los cinco `<select id="su-*">` del registro
// (`index.html:182-186`) están `hidden` y NO son campos: son cajones donde el asistente guarda lo
// que la persona eligió tocando botones `.wz-chip`. Nadie les quita el `hidden` (verificado:
// `removeAttribute('hidden')` y `.hidden=false` no existen en ningún .js), así que jamás reciben
// el foco y jamás pueden disparar el zoom. Contarlos era un falso positivo — 13 «campos chicos»
// cuando los de verdad eran 8.
//
// QUÉ AFIRMA:
//   0. CONTROL DE COBERTURA — cada campo con `id` escrito a mano en `index.html` tiene que
//      aparecer en el barrido. Si falta alguno, el DOM no cargó entero y la corrida NO vale
//      (un barrido vacío también sale «verde», y ese es justo el modo de fallo que se persigue).
//   1. Ningún `<input>` tecleable, `<textarea>` o `<select>` queda por debajo de 16 px.
//
//   node scripts/e2e/_repro-zoom-16px.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
import { afirmador, salir } from './_afirma.mjs';

const MIN = 16;                      // el umbral de Safari iOS, no una preferencia de diseño
const PORT = 8802, DP = 9302, APP = `http://localhost:${PORT}/`;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-zoom16-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const A = afirmador('ningún campo tecleable baja de 16px');

// ── Censo del archivo: qué campos tecleables hay escritos a mano, para el control de cobertura.
const TECL = /^(text|email|password|number|tel|search|url|date|time|month|week)$/i;
const html = readFileSync(RAIZ + '/index.html', 'utf8');
const idsEnElArchivo = [];
for (const t of html.match(/<(?:input|textarea|select)\b[^>]*>/gi) || []) {
  const tag = /<\s*(\w+)/.exec(t)[1].toLowerCase();
  const m = /type\s*=\s*["']?([\w-]+)/.exec(t);
  const ty = m ? m[1] : (tag === 'input' ? 'text' : tag);
  if (tag === 'input' && !TECL.test(ty)) continue;
  if (/\shidden(\s|>|=)/i.test(t)) continue;                    // cajones del asistente, no campos
  const idm = /\bid\s*=\s*["']([^"']+)/.exec(t);
  if (idm) idsEnElArchivo.push(idm[1]);
}

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=393,852', APP]);
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
if (!dentro) {
  const por = await ev(`(()=>{const l=document.getElementById('lerr')||document.querySelector('.lerr');return {err:l?(l.innerText||'').trim():null, login:!!document.getElementById('lu')};})()`);
  console.log('EL LOGIN NO ENTRÓ:', JSON.stringify(por));
  console.log('  (si no dice nada: mira si quedó un python zombi en el puerto — está en scripts/e2e/README.md)');
  A.ok(false, 'el login entró', por);
  salir(A, { chrome, srv });
}
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await ev(`document.fonts.ready`); await sleep(500);

const r = await ev(`(()=>{
  const TECL=/^(text|email|password|number|tel|search|url|date|time|month|week)$/i;
  const campos=[...document.querySelectorAll('input,textarea,select')].filter(e=>{
    if(e.hasAttribute('hidden')) return false;                 // cajones del asistente, no campos
    const tag=e.tagName.toLowerCase();
    if(tag!=='input') return true;
    return TECL.test(e.getAttribute('type')||'text');
  });
  const chicos=[];
  campos.forEach(e=>{
    const px=parseFloat(getComputedStyle(e).fontSize);
    if(px>=${MIN}-0.01) return;
    chicos.push({                                              // cómo se llama, para poder arreglarlo
      px: Math.round(px*10)/10,
      tag: e.tagName.toLowerCase(),
      id: e.id||null,
      clases: e.className||null,
      enLinea: /font-size/i.test(e.getAttribute('style')||'') ? (e.getAttribute('style').match(/font-size\\s*:\\s*[^;]+/i)||[''])[0] : null,
      padre: e.parentElement ? (e.parentElement.id||e.parentElement.className||e.parentElement.tagName) : null
    });
  });
  return { total: campos.length, ids: campos.map(e=>e.id).filter(Boolean), chicos };
})()`);

const vistos = new Set(r.ids || []);
const faltan = idsEnElArchivo.filter(x => !vistos.has(x));
console.log(`\n  campos tecleables con id escritos en index.html: ${idsEnElArchivo.length}`);
console.log(`  campos tecleables encontrados en el DOM vivo: ${r.total}`);
A.ok(faltan.length === 0, `CONTROL DE COBERTURA: el barrido ve los ${idsEnElArchivo.length} campos con id del archivo`, faltan);

if (r.chicos.length) {
  console.log(`\n  ── campos por debajo de ${MIN}px ──`);
  r.chicos.forEach(c => console.log(`   ${String(c.px).padStart(5)}px  ${c.tag}#${c.id || '—'} .${c.clases || '—'}${c.enLinea ? '  [' + c.enLinea + ']' : ''}  (dentro de ${c.padre})`));
}
A.ok(r.chicos.length === 0, `ningún campo tecleable baja de ${MIN}px (Safari iOS haría zoom al enfocarlo)`, r.chicos);

salir(A, { chrome, srv });
