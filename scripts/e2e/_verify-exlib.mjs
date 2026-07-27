// _verify-exlib.mjs — BIBLIOTECA DE EJERCICIOS: buscador + pintado por tandas (FASE 2, 2026-07-27).
// La auditoría midió 30.752 px —42 pantallas— con los 212 ejercicios dibujados de golpe (cada
// uno con su foto) y sin forma de buscar por nombre: para hallar uno había que filtrar por
// músculo y bajar a pulso. Y el PO va a repoblarla, así que solo empeora.
// Sin login ni red. 390×844, claro y oscuro. exit 1.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8835, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-exlib';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9355', '--user-data-dir=' + process.env.TEMP + '/exlib-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9355/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderExercises==='function' && typeof searchExercises==='function'`)) break; await sleep(500); }
await sleep(1800);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const escribir = txt => `(()=>{const i=document.getElementById('ex-search');i.value=${JSON.stringify(txt)};
  i.dispatchEvent(new Event('input',{bubbles:true}));})()`;
const leer = `(()=>{const g=document.getElementById('ex-grid');const m=document.getElementById('ex-more');
  return {tarjetas:g.querySelectorAll('.exc').length, alto:Math.round(g.scrollHeight),
          more:((m&&m.textContent)||'').trim().slice(0,44),
          vacio:(g.innerText||'').split(/[\\r\\n\\t ]+/).join(' ').trim().slice(0,90)};})()`;

const st = await ev(`(()=>{['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  CUR.loggedAs='coach';showScreen('s-coach');if(typeof renderAll==='function')renderAll();
  gp('p-exercises',document.getElementById('sbi-exercises'),'Ejercicios');
  exQ='';exPage=1;exF='all';renderExercises();
  return {catalogo:DB.exercises.length};})()`);
await sleep(900);

// E1 — de entrada ya no se dibujan los 212: solo la primera tanda.
const e1 = await ev(leer);
check('E1 la biblioteca ya no dibuja los 212 ejercicios de golpe (primera tanda de 30)',
  e1.tarjetas === 30 && st.catalogo > 200, JSON.stringify({ catalogo: st.catalogo, ...e1 }));
check('E1-bis el alto de la biblioteca deja de ser un abismo (antes 30.752px)',
  e1.alto > 0 && e1.alto < 6000, JSON.stringify({ alto: e1.alto }));
check('E1-ter el botón dice cuántos faltan (no es un «ver más» a ciegas)',
  /Ver \d+ más/.test(e1.more) && /de \d+/.test(e1.more), JSON.stringify(e1.more));

// E2 — «Ver más» suma la siguiente tanda sin perder las anteriores.
await ev(`exMore()`); await sleep(500);
const e2 = await ev(leer);
check('E2 «Ver más» añade la siguiente tanda', e2.tarjetas === 60, JSON.stringify({ n: e2.tarjetas }));

// E3 — buscar por nombre, escrito como lo teclea alguien de afán (sin tildes).
await ev(escribir('biceps')); await sleep(600);
const e3 = await ev(leer);
const nombres = await ev(`[...document.querySelectorAll('#ex-grid .exc')].slice(0,4).map(d=>d.innerText.split('\n')[0])`);
check('E3 buscar «biceps» (sin tilde) filtra de verdad y NO devuelve la biblioteca entera',
  e3.tarjetas > 0 && e3.tarjetas < 30, JSON.stringify({ n: e3.tarjetas, muestra: nombres }));
const pag = await ev(`exPage`);
check('E3-bis al buscar se vuelve a la primera tanda (si no, el «ver más» viejo esconde resultados)',
  pag === 1, 'exPage=' + pag);

// E4 — búsqueda sin resultados: dice qué hacer, y NO invita a crear un ejercicio.
await ev(escribir('zzzqqq')); await sleep(500);
const e4 = await ev(leer);
check('E4 sin resultados el mensaje habla de la BÚSQUEDA, no de crear un ejercicio',
  /se llama as/i.test(e4.vacio) && !/Añade uno/i.test(e4.vacio), JSON.stringify(e4.vacio));

// E5 — el filtro de músculo y el buscador conviven (no se pisan).
await ev(escribir('press')); await sleep(500);
await ev(`(()=>{const b=[...document.querySelectorAll('#exf button')].find(x=>/Pecho/.test(x.textContent)); if(b)b.click();})()`);
await sleep(600);
const e5 = await ev(`(()=>{const g=document.getElementById('ex-grid');
  return {n:g.querySelectorAll('.exc').length, txt:(g.innerText||'').toLowerCase(),
          q:document.getElementById('ex-search').value};})()`);
check('E5 el filtro de músculo NO borra la búsqueda: se aplican los dos',
  e5.n > 0 && e5.q === 'press' && e5.txt.includes('press'), JSON.stringify({ n: e5.n, q: e5.q }));

// Capturas para mirarlas.
await ev(escribir('')); await sleep(400);
await ev(`(()=>{const b=[...document.querySelectorAll('#exf button')].find(x=>/Todos/.test(x.textContent)); if(b)b.click();})()`);
await sleep(600);
for (const tema of ['light', 'dark']) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(350);
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/biblioteca-${tema}.png`, Buffer.from(s.data, 'base64'));
}
check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | ').slice(0, 200));

console.log('\n──── BIBLIOTECA DE EJERCICIOS ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('  capturas en:', OUT);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
