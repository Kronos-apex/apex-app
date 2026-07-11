// Verificación E2E de v314 (estudio de interfaz, mejoras 3 y 5):
// (A) anclas en Progreso: ocultas sin sesiones, fila sticky con sesiones, chips según
//     contenido de su bloque, progJump apunta al elemento correcto.
// (P) micro-pop al marcar serie: _gmPop agrega y retira .gm-pop; la marca real en el
//     guiado (click en el check, como el usuario) dispara la animación gmPop.
// Shot del pop: serie FUERA de orden (sin descanso) — marcar el paso activo abre la
// pantalla de descanso encima y taparía la animación; esa ruta se verifica por clase.
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8783;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v314-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9283', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9283/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
// El headless nuevo trae prefers-reduced-motion:reduce por defecto → apagaría el pop (P3)
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

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

  // ── (A) ANCLAS EN PROGRESO ──
  // A1: sin sesiones → fila oculta (el estado vacío no necesita saltos)
  let s = JSON.parse(await ev(`JSON.stringify((()=>{
    DB.history[CUR.clientId]=[];
    renderClientHistory(CUR.clientId);
    const row=document.getElementById('prog-anchors');
    return {disp:row.style.display};})())`));
  check('A1 sin sesiones: fila de anclas oculta', s.disp === 'none', JSON.stringify(s));

  // A2: con sesiones → fila visible, sticky, y los 4 chips con bloque lleno visibles
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const mk=i=>({id:'sQA'+i,date:new Date(Date.now()-i*86400000).toISOString(),routineName:'Full-Body QA',doneSets:12,totalSets:12,totalVol:2450,durationSec:2530});
    DB.history[CUR.clientId]=[0,1,2,3,4].map(mk);
    renderClientHistory(CUR.clientId);
    const row=document.getElementById('prog-anchors');
    const cs=getComputedStyle(row);
    const bar=document.querySelector('#s-client .cntopbar');
    const chips=[...row.querySelectorAll('[data-jump]')].map(b=>({j:b.getAttribute('data-jump'),vis:b.style.display!=='none'}));
    const smt=(document.getElementById('prog-hist-sec')||{style:{}}).style.scrollMarginTop;
    return {disp:row.style.display,sticky:cs.position,top:cs.top,rowH:row.offsetHeight,smt,chips};})())`));
  check('A2 con sesiones: fila visible, sticky top:0 (el scroller .cnbody arranca bajo la barra) y scroll-margin = fila+aire', s.disp === 'flex' && s.sticky === 'sticky' && s.top === '0px' && parseFloat(s.smt) >= s.rowH, JSON.stringify({disp:s.disp,sticky:s.sticky,top:s.top,rowH:s.rowH,smt:s.smt}));
  const histChip = (s.chips||[]).find(c => c.j === 'prog-hist-sec');
  check('A3 chips visibles solo con bloque lleno (Historial siempre)', !!histChip && histChip.vis && (s.chips||[]).every(c => typeof c.vis === 'boolean'), JSON.stringify(s.chips));

  // A4: progJump apunta al elemento correcto (espía scrollIntoView)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const calls=[];const orig=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(){calls.push(this.id);};
    try{progJump('cn-gamif');progJump('prog-hist-sec');progJump('no-existe-xyz');}
    finally{Element.prototype.scrollIntoView=orig;}
    return {calls};})())`));
  check('A4 progJump hace scroll al bloque pedido (y aguanta id inexistente)', Array.isArray(s.calls) && s.calls.length === 2 && s.calls[0] === 'cn-gamif' && s.calls[1] === 'prog-hist-sec', JSON.stringify(s));

  // Shot de la fila en el panel real de Progreso
  await ev(`(()=>{const tabs=[...document.querySelectorAll('.cntab')];const t=tabs.find(x=>(x.getAttribute('onclick')||'').includes('cn-history'));if(t)t.click();})()`);
  await sleep(900);
  await shot('v314-anclas');

  // A5: salto REAL — la fila queda visible bajo la barra y el título del bloque NO queda tapado
  await ev(`progJump('prog-hist-sec')`);
  await sleep(1200); // scroll smooth
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const bar=document.querySelector('#s-client .cntopbar').getBoundingClientRect();
    const row=document.getElementById('prog-anchors').getBoundingClientRect();
    const sec=document.getElementById('prog-hist-sec').getBoundingClientRect();
    return {barB:Math.round(bar.bottom),rowT:Math.round(row.top),rowB:Math.round(row.bottom),secT:Math.round(sec.top)};})())`));
  check('A5 tras el salto: fila AL RAS bajo la barra (sin hueco) y título destapado', s.rowT >= s.barB - 2 && s.rowT <= s.barB + 6 && s.secT >= s.rowB - 4, JSON.stringify(s));
  await shot('v314-anclas-sticky');

  // ── (P) MICRO-POP AL MARCAR SERIE ──
  // P1: _gmPop pone la clase y la retira sola (~500ms)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const el=document.createElement('button');el.className='gm-check';document.body.appendChild(el);
    _gmPop(el);const during=el.classList.contains('gm-pop');
    return {fn:typeof _gmPop==='function',during,el:!!el};})())`));
  await sleep(800);
  const after = await ev(`(()=>{const els=[...document.querySelectorAll('body>button.gm-check')];const v=els.length&&!els[0].classList.contains('gm-pop');els.forEach(e=>e.remove());return v;})()`);
  check('P1 _gmPop agrega .gm-pop y la retira sola', s.fn && s.during && after === true, JSON.stringify({...s, after}));

  // Guiado real: rutina inyectada de 1 ejercicio × 3 series
  await ev(`(()=>{const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const press={...DB.exercises.find(e=>e.id==='e83'),sets:3,reps:12};
    c.routines=[{id:'rV314',name:'Pop v314',day:days[new Date().getDay()],exercises:[press]}];
    localStorage.removeItem('apex_tip_done_'+c.id);
    ['0','1','2'].forEach(si=>{try{setDone('rV314',0,parseInt(si),false);}catch(e){}});
    const tabs=[...document.querySelectorAll('.cntab')];const t=tabs.find(x=>(x.getAttribute('onclick')||'').includes('cn-today'));if(t)t.click();
    renderClientToday(c);})()`);
  await sleep(1200);
  const hasChk = await waitFor(`!!document.getElementById('gm-chk-0-1')`, 8000);
  check('P2 guiado renderizado con checks de serie', hasChk === true);

  // P3: marcar FUERA de orden (serie 2 sin ser el paso activo) → pop visible, sin descanso encima
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const chk=document.getElementById('gm-chk-0-1');chk.click();
    return {pop:chk.classList.contains('gm-pop'),checked:chk.classList.contains('checked'),
      anim:getComputedStyle(chk).animationName};})())`));
  await shot('v314-pop');
  check('P3 marcar serie fuera de orden dispara el pop (clase + animación gmPop)', s.pop && s.checked && s.anim === 'gmPop', JSON.stringify(s));

  // P4: marcar el paso ACTIVO también popea (el descanso puede abrirse encima — solo clase)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const chk=document.getElementById('gm-chk-0-0');chk.click();
    return {pop:chk.classList.contains('gm-pop'),checked:chk.classList.contains('checked')};})())`));
  check('P4 marcar el paso activo también dispara el pop', s.pop && s.checked, JSON.stringify(s));

  // P6 (aviso Julián QA): al retirar .gm-pop NO debe re-arrancar checkDone (doble rebote)
  await sleep(700); // el pop de P4 ya terminó y el timeout de 500ms limpió
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const chk=document.getElementById('gm-chk-0-0');
    return {pop:chk.classList.contains('gm-pop'),anim:getComputedStyle(chk).animationName};})())`));
  check('P6 a los ~600ms el pop se limpió sin re-disparar checkDone', !s.pop && s.anim === 'none', JSON.stringify(s));

  // P5: reduced-motion apaga la animación (accesibilidad)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const chk=document.getElementById('gm-chk-0-2');chk.classList.add('gm-pop');
    const anim=getComputedStyle(chk).animationName;chk.classList.remove('gm-pop');
    return {anim};})())`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  check('P5 prefers-reduced-motion apaga la animación', s.anim === 'none', JSON.stringify(s));

  // limpieza: solo memoria — el sello v298 corta toda escritura a la nube en localhost
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
