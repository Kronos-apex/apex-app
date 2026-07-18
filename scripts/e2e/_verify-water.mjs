// Verificación E2E de la tarjeta HÁBITOS DE HOY — 💧 agua por vasos (v300) + 👟 pasos
// (v362). Login real con la CUENTA QA (qa-harness). El sello v298 (cloudWriteSealed)
// corta toda escritura a la nube en localhost, así que los taps de prueba jamás tocan
// producción. La tarjeta vive FUERA de cn-today-body → sale con entreno, en día de
// descanso y sin rutinas. W1-W7 = agua; S1-S5 = pasos (input SET + atajo +1.000).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8771;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-water-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9271', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9271/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x='') => { const line = (c?'OK ':'FAIL ') + n + (x?' — '+x:''); results.push(line); log('  ' + line); };

try {
  // login
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  // Si el login no completó (rate limit de la cuenta QA: ~2 min entre corridas), fallar CLARO.
  inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none'&&CUR&&CUR.clientId)})()`);
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~2-3 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  // Poll de 15s no pisa el estado + arranque limpio de hábitos (solo memoria; sello v298 corta la nube)
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    const c=DB.clients.find(x=>x.id===CUR.clientId); c.habits={}; delete DB.nutrition[CUR.clientId];
    navReset('cn-today');cnTab('cn-today',_cnTabEl('cn-today'),true);renderClientToday(c);})()`);
  await sleep(600);

  // W1: la tarjeta sale en Hoy con contador en 0 y meta razonable
  let s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    return {card:!!document.querySelector('#cn-habits .hb-card'),sub:(document.querySelector('#cn-habits .hb-sub')||{}).textContent,
      goal:_waterGoalFor(c),n:waterToday(c.habits),dots:document.querySelectorAll('#cn-habits .hb-dot:not(.st)').length};})())`));
  check('W1 tarjeta 💧 visible, 0 vasos, meta [6..12], 7 puntos de semana', s.card && s.n === 0 && s.goal >= 6 && s.goal <= 12 && s.dots === 7 && /0.*de/.test(s.sub||''), JSON.stringify(s));

  // W2: tres taps +1 → contador 3, barra con progreso, dato en client.habits de HOY
  await ev(`waterTap(1)`); await ev(`waterTap(1)`); await ev(`waterTap(1)`);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    return {n:waterToday(c.habits),sub:(document.querySelector('#cn-habits .hb-sub')||{}).textContent,
      w:parseFloat((document.querySelector('#cn-habits .hb-fill')||{style:{}}).style.width)||0,
      hoy:c.habits.water[habitDayKey()]};})())`));
  check('W2 tres +1 → 3 vasos, barra avanza, habits.water[hoy]=3', s.n === 3 && s.hoy === 3 && s.w > 0 && /3/.test(s.sub||''), JSON.stringify(s));

  // W3: −1 corrige a 2
  await ev(`waterTap(-1)`);
  s = JSON.parse(await ev(`JSON.stringify({n:waterToday(DB.clients.find(x=>x.id===CUR.clientId).habits)})`));
  check('W3 −1 corrige a 2', s.n === 2, JSON.stringify(s));

  // W4: piso 0 — restar de más no baja de cero ni rompe
  await ev(`(()=>{for(let i=0;i<5;i++)waterTap(-1);})()`);
  s = JSON.parse(await ev(`JSON.stringify({n:waterToday(DB.clients.find(x=>x.id===CUR.clientId).habits),card:!!document.querySelector('#cn-habits .hb-card')})`));
  check('W4 piso 0 (restar de más no rompe)', s.n === 0 && s.card, JSON.stringify(s));

  // W5: llegar a la meta → estado "met" (barra verde + mensaje de meta cumplida)
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);const g=_waterGoalFor(c);
    for(let i=0;i<g;i++)waterTap(1);
    return {n:waterToday(c.habits),g,met:!!document.querySelector('#cn-habits .hb-fill.met'),sub:(document.querySelector('#cn-habits .hb-sub')||{}).textContent};})())`));
  check('W5 meta cumplida → barra verde + mensaje 🎉', s.n === s.g && s.met && /cumplida/i.test(s.sub||''), JSON.stringify(s));

  // W6: re-render de Hoy no pierde el conteo (vive en client.habits, no en el DOM)
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    return {n:waterToday(c.habits),met:!!document.querySelector('#cn-habits .hb-fill.met')};})())`));
  check('W6 re-render conserva el conteo y el estado', s.n > 0 && s.met, JSON.stringify(s));

  // W7: la meta respeta el plan nutricional del coach (nut.water en vasos)
  // (contador a 0 primero — si no, con la meta ya cumplida la tarjeta no muestra el "de N")
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    c.habits={}; DB.nutrition[CUR.clientId]={water:5}; renderHabitsCard(c);
    const g=_waterGoalFor(c); const sub=(document.querySelector('#cn-habits .hb-sub')||{}).textContent;
    delete DB.nutrition[CUR.clientId];
    return {g,sub};})())`));
  check('W7 meta = plan del coach (5 vasos) cuando existe', s.g === 5 && /5/.test(s.sub||''), JSON.stringify(s));

  // ─── 👟 PASOS (v362) — misma tarjeta, acento verde ───
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.habits={};renderHabitsCard(c);})()`);
  await sleep(200);

  // S1: la fila de pasos sale en la MISMA tarjeta, en 0, meta 8.000, 7 puntos de semana
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    return {ic:!!document.querySelector('#cn-habits .hb-ic.st'),
      input:!!document.querySelector('#cn-habits .hb-num'),
      sub:[...document.querySelectorAll('#cn-habits .hb-sub')].map(e=>e.textContent).join(' | '),
      n:stepsToday(c.habits),goal:STEPS_GOAL_DEFAULT,dots:document.querySelectorAll('#cn-habits .hb-dot.st').length};})())`));
  check('S1 fila 👟 en la misma tarjeta, input presente, 0 pasos, meta 8.000, 7 puntos', s.ic && s.input && s.n === 0 && s.goal === 8000 && s.dots === 7 && /8\.000/.test(s.sub||''), JSON.stringify(s));

  // S2: teclear el total (input SET) → fija los pasos, barra avanza, habits.steps[hoy]=valor
  await ev(`(()=>{const inp=document.querySelector('#cn-habits .hb-num');inp.value='6200';stepsSetInput(inp);})()`);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    return {n:stepsToday(c.habits),hoy:c.habits.steps[habitDayKey()],
      w:parseFloat((document.querySelector('#cn-habits .hb-fill.st')||{style:{}}).style.width)||0,
      sub:[...document.querySelectorAll('#cn-habits .hb-sub')].map(e=>e.textContent).join(' | ')};})())`));
  check('S2 input SET 6200 → 6200 pasos, barra avanza, habits.steps[hoy]=6200, "6.200" en pantalla', s.n === 6200 && s.hoy === 6200 && s.w > 0 && /6\.200/.test(s.sub||''), JSON.stringify(s));

  // S3: +1.000 SUMA sobre el total actual
  await ev(`stepsQuick(1000)`);
  s = JSON.parse(await ev(`JSON.stringify({n:stepsToday(DB.clients.find(x=>x.id===CUR.clientId).habits)})`));
  check('S3 +1.000 suma → 7200', s.n === 7200, JSON.stringify(s));

  // S4: llegar/superar la meta → estado "met" (barra verde + mensaje de meta cumplida)
  await ev(`(()=>{const inp=document.querySelector('#cn-habits .hb-num');inp.value='8200';stepsSetInput(inp);})()`);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    return {n:stepsToday(c.habits),met:!!document.querySelector('#cn-habits .hb-fill.st.met'),
      sub:[...document.querySelectorAll('#cn-habits .hb-sub')].map(e=>e.textContent).join(' | ')};})())`));
  check('S4 8.200 ≥ meta → barra verde + mensaje 🎉', s.n === 8200 && s.met && /cumplida/i.test(s.sub||''), JSON.stringify(s));

  // S5: clamp de cordura (999.999 → 100.000) y re-render conserva el conteo
  await ev(`(()=>{const inp=document.querySelector('#cn-habits .hb-num');inp.value='999999';stepsSetInput(inp);})()`);
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    return {n:stepsToday(c.habits),met:!!document.querySelector('#cn-habits .hb-fill.st.met')};})())`));
  check('S5 clamp 100.000 + re-render conserva conteo y estado', s.n === 100000 && s.met, JSON.stringify(s));

  // S6 (reserva Fable v372): el botón "+1.000" NO se recorta a 390px en tema claro (width:auto).
  await ev(`typeof setTheme==='function' && setTheme('light')`);
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderHabitsCard(c);})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.querySelector('#cn-habits .hb-plus.st');
    return b?{sw:b.scrollWidth,cw:b.clientWidth,txt:(b.textContent||'').trim()}:{sw:0,cw:0,txt:''};})())`));
  check('S6 el botón "+1.000" no se recorta (scrollWidth ≤ clientWidth) y muestra el texto completo', /\+1\.000/.test(s.txt) && s.sw <= s.cw + 1, JSON.stringify(s));

  // limpieza en memoria (la nube está sellada igual, pero dejamos el estado prolijo)
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.habits={};renderHabitsCard(c);})()`);

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
