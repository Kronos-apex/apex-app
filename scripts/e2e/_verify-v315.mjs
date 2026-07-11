// Verificación E2E de v315 (estudio, mejora 4): Rutinas con foto.
// La tarjeta .rc gana .rc-photo (foto del primer ejercicio CON foto, vía exImgSrc) de fondo
// del encabezado; sin fotos en la rutina la tarjeta queda como antes; el acordeón sigue vivo.
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8784;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v315-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9284', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9284/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}})()`);

  // Rutinas inyectadas: una con foto (e83 press banca), una SIN foto (ejercicio custom), una Libre
  await ev(`(()=>{const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const press={...DB.exercises.find(e=>e.id==='e83'),sets:3,reps:12};
    const custom={id:'cx1',name:'Ejercicio casero',muscle:'Pecho',type:'Fuerza',sets:2,reps:10};
    c.routines=[
      {id:'rF1',name:'Con foto',day:days[new Date().getDay()],exercises:[custom,press]},
      {id:'rF2',name:'Sin foto',day:'Lunes',exercises:[custom]},
      {id:'rF3',name:'Descanso',day:'Libre',exercises:[]},
      {id:'rF4',name:'Full body + cardio de recuperación activa',day:'Martes',exercises:[press]}
    ];
    const tabs=[...document.querySelectorAll('.cntab')];const t=tabs.find(x=>(x.getAttribute('onclick')||'').includes('cn-routines'));if(t)t.click();
    renderClientAllRoutines(c);})()`);
  await sleep(900);

  // R1: la rutina con al menos un ejercicio CON foto gana .rc-photo con la URL del catálogo
  let s = JSON.parse(await ev(`JSON.stringify((()=>{
    const cards=[...document.querySelectorAll('#cn-all-rut .rc')];
    const f=cards.find(c=>c.querySelector('.rcname').textContent.includes('Con foto'));
    const ph=f&&f.querySelector('.rc-photo');
    return {found:!!f,ph:!!ph,url:ph?ph.style.backgroundImage:''};})())`));
  check('R1 rutina con ejercicio con foto → .rc-photo con la foto del catálogo (salta el custom sin foto)', s.found && s.ph && /media\/exercises\/e\d+/.test(s.url), JSON.stringify(s));

  // R2: rutina SIN fotos y día Libre → sin .rc-photo (tarjeta clásica)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const cards=[...document.querySelectorAll('#cn-all-rut .rc')];
    const sf=cards.find(c=>c.querySelector('.rcname').textContent.includes('Sin foto'));
    const li=cards.find(c=>c.querySelector('.rcname').textContent.includes('Descanso'));
    return {sf:!!sf,sfPh:!!(sf&&sf.querySelector('.rc-photo')),li:!!li,liPh:!!(li&&li.querySelector('.rc-photo'))};})())`));
  check('R2 rutina sin fotos y día Libre → tarjeta clásica sin .rc-photo', s.sf && !s.sfPh && s.li && !s.liPh, JSON.stringify(s));

  // R3: la foto no tapa el texto — el nombre queda sobre la mitad sólida y por encima (z)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const f=[...document.querySelectorAll('#cn-all-rut .rc')].find(c=>c.querySelector('.rcname').textContent.includes('Con foto'));
    const ph=f.querySelector('.rc-photo');
    const pr=ph.getBoundingClientRect(),hr=f.querySelector('.rch').getBoundingClientRect();
    return {phW:Math.round(pr.width),hW:Math.round(hr.width),right:pr.right===hr.right,
      mask:getComputedStyle(ph).maskImage!=='none'||getComputedStyle(ph).webkitMaskImage!=='none',
      ptr:getComputedStyle(ph).pointerEvents};})())`));
  check('R3 foto al 46% derecho con máscara de degradado y sin robar toques', s.phW < s.hW * 0.5 && s.right && s.mask && s.ptr === 'none', JSON.stringify(s));

  // R4: el acordeón sigue vivo (toque abre, muestra ejercicios)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const f=[...document.querySelectorAll('#cn-all-rut .rc')].find(c=>c.querySelector('.rcname').textContent.includes('Con foto'));
    f.querySelector('.rch').click();
    const open=f.classList.contains('open');
    const rows=f.querySelectorAll('.rcbody .exrow').length;
    return {open,rows};})())`));
  check('R4 acordeón abre y muestra los ejercicios', s.open && s.rows === 2, JSON.stringify(s));
  await ev(`(()=>{const f=[...document.querySelectorAll('#cn-all-rut .rc')].find(c=>c.classList.contains('open'));if(f)f.querySelector('.rch').click();})()`);
  await sleep(300);
  await shot('v315-rutinas-claro');

  // R5: el chevron sobre la foto gana contraste (blanco + sombra) y en oscuro la foto va a full
  await ev(`(()=>{document.documentElement.setAttribute('data-theme','dark');})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const f=[...document.querySelectorAll('#cn-all-rut .rc')].find(c=>c.querySelector('.rc-photo'));
    const ph=f.querySelector('.rc-photo');const ch=getComputedStyle(f.querySelector('.rcchev'));
    return {op:parseFloat(getComputedStyle(ph).opacity),chev:ch.color,shadow:ch.textShadow!=='none'};})())`));
  check('R5 foto a toda opacidad y chevron blanco con sombra sobre la foto', s.op === 1 && /234|235/.test(s.chev) && s.shadow, JSON.stringify(s));
  await shot('v315-rutinas-oscuro');
  await ev(`(()=>{document.documentElement.removeAttribute('data-theme');})()`);

  // R6 (aviso Julián): nombre largo — .rci con padding de seguridad, no entra a la zona opaca
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const f=[...document.querySelectorAll('#cn-all-rut .rc')].find(c=>c.querySelector('.rcname').textContent.includes('recuperación'));
    const rci=f.querySelector('.rci');const hr=f.querySelector('.rch').getBoundingClientRect();
    const pr=parseFloat(getComputedStyle(rci).paddingRight);
    return {pr:Math.round(pr),okZone:rci.getBoundingClientRect().right-pr<=hr.right-hr.width*0.18};})())`));
  check('R6 nombre largo: padding de seguridad mantiene el texto fuera de la zona opaca', s.pr > 40 && s.okZone, JSON.stringify(s));

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
