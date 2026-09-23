// v662 · LA MUDANZA EN PRODUCCIÓN: el sitio viejo (kronos-apex.github.io) salta solo al hogar nuevo.
// Solo LEE: perfil de navegador limpio, sin sesión, sin escribir nada en la nube.
//   P1 la señal del hogar nuevo responde y es la de v662 (hogar + v:2).
//   P2 un navegador que abre la dirección VIEJA termina en app.avientrena.com.
//   P3 la barra queda limpia (ni `#avimv` ni `?mudanza`) y la app arranca allá.
//   P4 un iPhone con la app instalada (`navigator.standalone`) se queda en la dirección vieja.
//      Su control es P2: el mismo navegador sin esa marca sí salta.
// Corre: node scripts/e2e/_prodcheck-mudanza.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, c, x = '') => { results.push((c ? 'OK ' : 'FAIL ') + n); console.log('  ' + (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const VIEJO = 'https://kronos-apex.github.io/apex-app/';
const NUEVO_HOST = 'app.avientrena.com';

const senal = await (await fetch('https://' + NUEVO_HOST + '/mudanza.json?nc=' + Date.now(), { headers: { Origin: 'https://kronos-apex.github.io' } })).json().catch(() => null);
check('P1 la señal responde y es la de v662', senal && senal.v === 2 && senal.hogar === 'https://' + NUEVO_HOST && !('home' in senal), JSON.stringify(senal));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9394', '--user-data-dir=' + process.env.TEMP + '/prodmud-' + Date.now(), '--no-first-run', 'about:blank']);
let page; for (let i = 0; i < 60; i++) { try { const t = await (await fetch('http://127.0.0.1:9394/json/list')).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch {} await sleep(400); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.on('open', r));
let id = 1; const pend = new Map(); const jsErr = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErr.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise(r => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
const esperarHost = async (host, ms) => { const fin = Date.now() + ms; while (Date.now() < fin) { if ((await ev('location.host')) === host) return true; await sleep(500); } return false; };

// ── P4 primero (perfil sin nada de ningún origen): iPhone instalado → se queda.
const ios = await send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator,'standalone',{value:true,configurable:true});" });
await send('Page.navigate', { url: VIEJO + '?nc=' + Date.now() }); await sleep(12000);
const p4 = await ev("({host:location.host, ios:navigator.standalone===true, arranco:typeof showScreen==='function'})");
check('P4 un iPhone con la app instalada se queda en la dirección vieja', p4 && p4.ios && p4.host === 'kronos-apex.github.io' && p4.arranco, JSON.stringify(p4));
await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: ios.result.identifier });

// ── P2/P3: el mismo navegador sin la marca → salta.
await send('Page.navigate', { url: VIEJO + '?nc=' + Date.now() });
const salto = await esperarHost(NUEVO_HOST, 30000);
check('P2 la dirección vieja salta sola a ' + NUEVO_HOST, salto, await ev('location.href'));
await sleep(6000);
const p3 = await ev("({href:location.href, marca:!!window._aviLlegoMudanza, arranco:typeof showScreen==='function' && typeof window._aviUpdateBusy==='function', sw:!!navigator.serviceWorker && !!navigator.serviceWorker.controller})");
check('P3a la barra queda limpia (sin #avimv ni ?mudanza)', p3 && !/avimv|mudanza/.test(p3.href), p3 && p3.href);
check('P3b la página sabe que llegó por la mudanza (para el aviso de reinstalar)', p3 && p3.marca === true);
check('P3c la app arrancó en el hogar nuevo', p3 && p3.arranco === true);

console.log('\njsErrors: ' + JSON.stringify(jsErr));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
console.log(fallas || jsErr.length ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
try { ws.close(); } catch {} chrome.kill();
process.exit(fallas || jsErr.length ? 1 : 0);
