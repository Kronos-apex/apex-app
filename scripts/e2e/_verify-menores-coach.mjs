// Harness de LA BANDA DE MENORES — el lado del COACH (v493).
//
// Cuando la app le cambia el número a una asesorada, el que lo ESCRIBIÓ tiene que enterarse: no
// avisarle es la mentira de v437 al revés (cambiar la cifra y callarla). Son dos superficies y
// ninguna la ve el asesorado: el aviso DENTRO del editor de nutrición y la tarjeta de su FICHA,
// que es el único sitio donde se entera sin reabrirle el editor a esa persona.
// Sin login: monta el fixture local, como `_shot-coach.mjs`.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { afirmador, salir } from './_afirma.mjs';

const A = afirmador('banda de menores · coach');
const PORT = 8792, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-menores-coach-' + Date.now();
const OUT = process.env.TEMP + '/claude/menores-coach';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9292', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9292/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };

await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
// El SÍMBOLO post-boot, no el DOM (gotcha del boot-check de prod).
await waitFor(`typeof DB!=='undefined' && !!DB && typeof gp==='function' && typeof openDetail==='function'`);
await sleep(1500);

// Fixture: la asesorada real de 16 años (IMC 26,4) con un plan ESCRITO A MANO muy por encima de
// su techo — la puerta que v485 encontró abierta, ahora por el otro lado.
const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  DB.clients=[{id:'c1',name:'Sharith Sofía',email:'s@x.com',goal:'Ganar músculo',level:'Intermedio',days:4,
    age:16,sex:'F',weight:72,height:165,activityFactor:1.55,tier:'premium',payments:[],routines:[]}];
  DB.nutrition={c1:{goal:'volumen',kcal:3200,prot:158,carbs:500,fat:80,water:10,meals:5}};
  DB.history={}; DB.bodyweight={}; window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach'); if(typeof renderAll==='function')renderAll();
  openDetail('c1'); return 'ok';
}catch(e){return 'err:'+e.message}})()`);
A.ok(setup === 'ok', 'montaje del fixture del coach', setup);
await sleep(1200);

// CONTROL DE MONTAJE: el revisor tiene que estar viendo el caso, o lo de abajo no prueba nada.
const rev = await ev(`(()=>{const c=DB.clients[0];const r=nutPlanReview(c,DB.nutrition.c1,72);const b=nutBaseFor(c,DB.nutrition.c1,72);
  return JSON.stringify({status:r&&r.status,sirve:r&&r.sirve,escrito:b&&b.minorCap&&b.minorCap.kcalAntes})})()`);
console.log('  montaje:', rev);
const R = JSON.parse(rev || '{}');
if (!A.ok(R.status === 'menor_sobre_techo', 'MONTAJE: el revisor ve un menor por encima de su techo', R)) { ws.close(); salir(A, { chrome, srv, out: OUT }); }

// C1 — la tarjeta de la FICHA lo dice, sin abrir el editor.
const ficha = await ev(`(()=>{const el=document.getElementById('d-nutreview')||[...document.querySelectorAll('#p-detail .card')].find(e=>/menor de edad/i.test(e.textContent||''));
  if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();
  return JSON.stringify({txt:(el.innerText||'').replace(/\\s+/g,' ').slice(0,600),alto:Math.round(r.height),dentro:r.top>=0&&r.bottom<=window.innerHeight,desborde:el.scrollWidth-el.clientWidth})})()`);
const F = JSON.parse(ficha || 'null');
A.ok(!!F && /menor de edad/i.test(F.txt) && /techo|por encima/i.test(F.txt), 'C1 la ficha avisa que su plan queda por encima de su techo', F && F.txt);
A.ok(!!F && F.txt.includes(String(R.sirve)), 'C2 y cita el número que de verdad se le está sirviendo', { busca: R.sirve, txt: F && F.txt });
A.ok(!!F && F.desborde <= 1 && F.dentro, 'C3 la tarjeta cabe y se ve entera a 390px', F);
await shot('ficha-techo');

// C4 — el editor de nutrición: el aviso sale mientras el coach escribe.
// ⚠️ El editor se abre con `openNutModal`, que RELLENA el formulario. Abrirlo de otra forma deja
// los campos vacíos y entonces el aviso describe la ESTIMACIÓN, no lo que el coach escribió: la
// primera versión de este harness leyó 2.917 y parecía un defecto de la app. Era el montaje.
const editor = await ev(`(()=>{try{CUR.clientId='c1';openNutModal();return document.getElementById('nut-kcal').value;}catch(e){return 'err:'+e.message}})()`);
await sleep(900);
const nota = await ev(`(()=>{const n=document.getElementById('nut-goal-nota');if(!n)return null;
  if(typeof nutGoalCheck==='function')nutGoalCheck();
  const r=n.getBoundingClientRect();
  return JSON.stringify({vis:getComputedStyle(n).display!=='none',txt:(n.innerText||'').replace(/\\s+/g,' ').slice(0,600),desborde:n.scrollWidth-n.clientWidth,alto:Math.round(r.height)})})()`);
const N = JSON.parse(nota || 'null');
A.ok(editor === '3200', 'MONTAJE: el formulario quedó con el plan escrito del coach', editor);
A.ok(!!N && N.vis && /menor de edad/i.test(N.txt), 'C4 el editor avisa al coach mientras escribe', { editor, N });
A.ok(!!N && N.txt.includes(String(R.sirve)), 'C5 el aviso del editor cita el MISMO número servido', { busca: R.sirve, txt: N && N.txt });
A.ok(!!N && N.desborde <= 1, 'C6 el aviso no se desborda a lo ancho', N);
await ev(`(()=>{const n=document.getElementById('nut-goal-nota');if(n)n.scrollIntoView({block:'center'})})()`); await sleep(300);
await shot('editor-techo');

A.ok(A.jsErrors.length === 0, 'C7 sin errores JS', A.jsErrors);
ws.close();
salir(A, { chrome, srv, out: OUT });
