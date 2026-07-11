// Verificación E2E de v316 (estudio, mejora 6): respuestas rápidas en Mensajes.
// Chips #cn-msg-quick sobre el compositor: un toque envía por la MISMA ruta (_clientSend),
// pinta la burbuja, notifica al coach (pushToClient espiado) y no toca el textarea.
// Sin coach (candado Premium) los chips se ocultan con el compositor.
// Cuenta QA + sello v298 → cero riesgo a producción; push espiado, sin red.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8785;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v316-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9285', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9285/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x='') => { const line = (c?'OK ':'FAIL ') + n + (x?' — '+x:''); results.push(line); log('  ' + line); };

try {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none'&&CUR&&CUR.clientId)})()`);
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~4-5 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{hideClientWelcome();}catch(e){}['data-ob','cwelcome','m-fsintro','m-textsize'].forEach(i=>{const e=document.getElementById(i);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';try{localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));ntClose(false);}catch(e){}})()`); await sleep(150); }
  // Espías: push sin red, sync ya sellado (v298); mensajes solo en memoria de la corrida
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    window._pushSpy=[]; window.pushToClient=(id,t,b,o)=>{window._pushSpy.push({id,t,b});};
    DB.msgs[CUR.clientId]=[]; })()`);

  // Abrir la pestaña Mensajes
  await ev(`(()=>{const tabs=[...document.querySelectorAll('.cntab')];const t=tabs.find(x=>(x.getAttribute('onclick')||'').includes('cn-messages'));if(t)t.click();})()`);
  await sleep(700);

  // Q1: chips visibles con coach — 4, táctiles ≥36px
  let s = JSON.parse(await ev(`JSON.stringify((()=>{
    const q=document.getElementById('cn-msg-quick');
    const btns=[...q.querySelectorAll('button')];
    return {disp:q.style.display,n:btns.length,minH:Math.min(...btns.map(b=>b.getBoundingClientRect().height))};})())`));
  check('Q1 con coach: 4 respuestas rápidas visibles y táctiles ≥36px', s.disp === 'flex' && s.n === 4 && s.minH >= 36, JSON.stringify(s));
  await shot('v316-chat-chips');

  // Q2: tocar un chip envía — DB, burbuja propia en el thread y push al coach
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const q=document.getElementById('cn-msg-quick');
    const btn=[...q.querySelectorAll('button')].find(b=>/duda/i.test(b.textContent));
    btn.click();
    const msgs=DB.msgs[CUR.clientId]||[];const last=msgs[msgs.length-1]||{};
    const bubbles=[...document.querySelectorAll('#cn-msg-thread .mb.cs')];
    return {n:msgs.length,from:last.from,text:last.text,
      bubble:bubbles.some(b=>/duda/i.test(b.textContent)),
      push:window._pushSpy.length===1&&window._pushSpy[0].id==='_coach'&&/duda/i.test(window._pushSpy[0].b)};})())`));
  check('Q2 un toque: mensaje en DB (from client), burbuja propia y push al coach', s.n === 1 && s.from === 'client' && /Tengo una duda/.test(s.text||'') && s.bubble && s.push, JSON.stringify(s));
  await shot('v316-chat-enviado');

  // Q3: el textarea sigue funcionando por la misma ruta y queda limpio tras enviar
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const ta=document.getElementById('cn-msg-in');ta.value='Mensaje manual de prueba';
    sendClientMsg();
    const msgs=DB.msgs[CUR.clientId]||[];const last=msgs[msgs.length-1]||{};
    return {n:msgs.length,text:last.text,taVacio:ta.value===''};})())`));
  check('Q3 el textarea envía por la misma ruta y queda limpio', s.n === 2 && s.text === 'Mensaje manual de prueba' && s.taVacio, JSON.stringify(s));

  // Q4: sin coach → candado, compositor Y chips ocultos
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const orig=window.clientHasCoach; window.clientHasCoach=()=>false;
    try{ renderClientMsgs(CUR.clientId); }finally{ window.clientHasCoach=orig; }
    const q=document.getElementById('cn-msg-quick');const comp=document.getElementById('cn-msg-composer');
    const lock=!!document.querySelector('#cn-msg-thread .plock, #cn-msg-thread [class*=lock]')||/coach/i.test(document.getElementById('cn-msg-thread').textContent);
    const out={q:q.style.display,comp:comp.style.display,lock};
    renderClientMsgs(CUR.clientId); // restaura la vista real
    return out;})())`));
  check('Q4 sin coach: chips y compositor ocultos, candado visible', s.q === 'none' && s.comp === 'none' && s.lock, JSON.stringify(s));

  // Q5: chip vacío/basura no envía (guard de _clientSend)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const before=(DB.msgs[CUR.clientId]||[]).length;
    clientQuickMsg('');clientQuickMsg('   ');
    return {before,after:(DB.msgs[CUR.clientId]||[]).length};})())`));
  check('Q5 texto vacío no envía nada', s.before === s.after, JSON.stringify(s));

  // limpieza en memoria (el sello v298 impidió cualquier escritura a la nube)
  await ev(`(()=>{DB.msgs[CUR.clientId]=[];})()`);

  log('\njsErrors: ' + JSON.stringify(jsErrors));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log('\n' + (fails === 0 && jsErrors.length === 0 ? 'TODO OK' : fails + ' FALLA(S)'));
  process.exitCode = (fails === 0 && jsErrors.length === 0) ? 0 : 1;
} catch (e) {
  log('ERROR: ' + (e && e.message));
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
