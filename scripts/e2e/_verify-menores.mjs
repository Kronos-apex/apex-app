// Harness de LA BANDA DE MENORES (v493) — lo que de verdad se PINTA en la pantalla de ella.
//
// La suite prueba el motor. Esto prueba las dos cosas que un test estático no puede ver:
//   (1) que la habitación de Nutrición y el plato pinten EL MISMO número (el defecto medido el
//       18-ago: 2.111 en una pantalla y 2.219 en la otra, a un toque de distancia);
//   (2) que lo que lee una menor de 16 años no tenga ni una palabra de composición corporal,
//       que es la regla del dictamen que ningún cálculo puede garantizar.
// Caso: los datos REALES de la asesorada de 16 años con IMC 26,4 (sobrepeso para su edad en la
// referencia OMS 5-19) que recibía +350 kcal/día de superávit.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
import { afirmador, salir } from './_afirma.mjs';

const A = afirmador('banda de menores');
const PORT = 8791, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-menores-' + Date.now();
const OUT = process.env.TEMP + '/claude/menores';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9291', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=360,780', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9291/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };

await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 2, mobile: true });
await sleep(600);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(800);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`);
for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }

// Los datos reales del caso: 16 años, F, 72 kg, 165 cm (IMC 26,4), «Ganar músculo», SIN plan
// escrito → entra por la calculadora, que es por donde entraban los +350.
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';c.age=16;c.sex='F';c.weight=72;c.height=165;c.goal='Ganar músculo';c.activityFactor=1.55;(DB.bodyweight||(DB.bodyweight={}))[c.id]=[];if(DB.nutrition)delete DB.nutrition[CUR.clientId];})()`);

// CONTROL DE MONTAJE: si el fixture no deja al motor en el estado que este harness existe para
// mirar, se DETIENE en vez de salir verde sobre otra cosa (lección de `_verify-foodlog`).
const montaje = await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);const b=nutBaseFor(c,null,72);return JSON.stringify({cap:!!(b&&b.minorCap),sobre:!!(b&&b.minorCap&&b.minorCap.sobrepeso),kcal:b&&b.kcalObj,antes:b&&b.minorCap&&b.minorCap.kcalAntes})})()`);
console.log('  montaje:', montaje);
const M = JSON.parse(montaje || '{}');
if (!A.ok(M.cap && M.sobre, 'MONTAJE: el techo actúa sobre este perfil (si no, nada de lo de abajo prueba nada)', M)) { ws.close(); salir(A, { chrome, srv, out: OUT }); }

await ev(`openNutritionRoom(CUR.clientId)`); await sleep(900);
await ev(`void document.body.offsetHeight`); await sleep(400);
A.ok(await ev(`!!document.querySelector('.sroom.on')`), 'M0 la habitación de nutrición abre');

// M1 — EL DEFECTO MEDIDO: la habitación pintaba `nutritionEstimate` y el plato `nutBaseFor`.
// ⚠️ La primera versión de esta sonda buscaba «N kcal» en el texto de la habitación y agarraba el
// «632 kcal» de la tarjeta de PROTEÍNA: rojo de la sonda, no de la app (la pantalla decía 2.697).
// Se lee la tarjeta del TITULAR, la que dice «Calorías / día», no el primer número que aparezca.
const dos = await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);const b=nutBaseFor(c,null,72);
  const card=[...document.querySelectorAll('#nutroom-body *')].find(e=>/calor[íi]as\\s*\\/\\s*d[íi]a/i.test(e.textContent||'')&&e.children.length<4);
  const t=card?(card.closest('.nutri-card')||card.parentElement).innerText:'';
  const m=t.replace(/[.,](?=\\d{3})/g,'').match(/(\\d{3,5})/);
  return JSON.stringify({pantalla:m?+m[1]:null,plato:b.kcalObj,crudo:t.slice(0,60)})})()`);
const D = JSON.parse(dos || '{}');
A.ok(D.pantalla === D.plato, 'M1 la habitación pinta el MISMO número que sirve el plato', D);

// M2 — el número que ve es el del techo, no el del superávit de antes.
A.ok(D.pantalla === M.kcal && D.pantalla < M.antes, 'M2 lo pintado es el plan con el techo puesto, no el de +350', { visto: D.pantalla, antes: M.antes });

// M3 — CERO lenguaje de composición corporal en lo que ella lee (regla del dictamen v448/v449).
const txt = await ev(`(document.getElementById('nutroom-body').innerText||'')`);
const prohibidas = ['sobrepeso', 'IMC', 'grasa corporal', 'obesidad', 'adelgaz', 'bajar de peso', 'definición'];
const halladas = prohibidas.filter(p => new RegExp(p, 'i').test(txt || ''));
A.ok(halladas.length === 0, 'M3 no lee ni una palabra de composición corporal', halladas);

// M4 — el número le cambió, así que la pantalla EXPLICA por qué (v434: un número que cambia sin
// explicación se lee como un error de la app).
A.ok(/creciendo/i.test(txt || '') && /entrenamiento/i.test(txt || ''), 'M4 la pantalla explica por qué su plan no sube más');

// M5 — y el rótulo NO le explica un volumen que ya no lleva (v437).
A.ok(!/super[áa]vit/i.test(txt || ''), 'M5 no le anuncia un superávit que la app acaba de quitar');

// ⚠️ EL TEMA SE FIJA, NO SE SUPONE: las dos primeras capturas de este harness salieron en OSCURO
// creyéndose «claro» (Chrome headless arranca con `prefers-color-scheme: dark`), así que el modo
// claro no se miró. Y el scroll va al ELEMENTO, no a un porcentaje: reabrir la habitación conserva
// el scroll y un 45% caía en la lista del mercado, o sea una foto perfecta de otra cosa.
const verNota = async () => ev(`(()=>{const n=[...document.querySelectorAll('#nutroom-body .exroom-note')].find(e=>/creciendo/i.test(e.textContent||''));
  if(!n)return null;n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();
  return JSON.stringify({alto:Math.round(r.height),dentro:r.top>=0&&r.bottom<=window.innerHeight,ancho:Math.round(r.width),vw:window.innerWidth})})()`);
const tema = async t => { await ev(`document.documentElement.setAttribute('data-theme',${JSON.stringify(t)});document.body.classList.toggle('dark',${t === 'dark'})`); await sleep(400); };
await tema('light');
const nClaro = JSON.parse(await verNota() || 'null');
await sleep(300);
A.ok(nClaro && nClaro.dentro && nClaro.alto > 20, 'M4b la explicación se ve entera en pantalla (claro)', nClaro);
await shot('claro-360-explicacion');

// M6 — letra «Muy grande» a 360 px: crece y no se desborda (clase _repro-sroom-fs).
await ev(`document.documentElement.setAttribute('data-fs','xl')`); await sleep(600);
await ev(`openNutritionRoom(CUR.clientId)`); await sleep(700);
await verNota();
const ancho = await ev(`(()=>{const b=document.getElementById('nutroom-body');return JSON.stringify({sw:b.scrollWidth,cw:b.clientWidth,doc:document.documentElement.scrollWidth,vw:window.innerWidth})})()`);
const W = JSON.parse(ancho || '{}');
A.ok(W.sw <= W.cw + 1 && W.doc <= W.vw + 1, 'M6 con letra «Muy grande» no se desborda a lo ancho', W);
await shot('xl-360');

// M7 — oscuro, la MISMA explicación (los dos temas, barra premium).
await ev(`document.documentElement.setAttribute('data-fs','')`); await sleep(200);
await tema('dark');
await ev(`openNutritionRoom(CUR.clientId)`); await sleep(700);
const nOsc = JSON.parse(await verNota() || 'null');
await sleep(300);
A.ok(nOsc && nOsc.dentro && nOsc.alto > 20, 'M7 la explicación también se ve entera en oscuro', nOsc);
await shot('oscuro-360-explicacion');

// M9 — y no le nombra la ecuación que a ella NO se le aplica (v448 cambió el cálculo de los
// menores a Schofield y estas tres pantallas siguieron diciendo «Mifflin-St Jeor» dos meses).
A.ok(!/Mifflin/i.test(txt || '') && /Schofield/i.test(txt || ''),
  'M9 la pantalla nombra la fórmula que de verdad se usó con ella', (txt || '').slice(0, 0) || undefined);

A.ok(A.jsErrors.length === 0, 'M8 sin errores JS', A.jsErrors);
ws.close();
salir(A, { chrome, srv, out: OUT });
