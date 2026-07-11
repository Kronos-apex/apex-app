// Verificación E2E de v318: recordatorio de NOTIFICACIONES del coach + self-heal.
// Diagnóstico raíz (2026-07-11): las suscripciones '_coach' murieron en el cutover y no
// había tarjeta que empujara a reactivarlas. Aquí, patrón preview-SIN-login: se stubea
// `Notification` (permission es read-only en el navegador real) y se ejercita
// renderCoachPushNudge/aviAskCoachPush/ensureCoachPush sin tocar la red ni producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8788;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v318-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9288', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9288/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

try {
  const ready = await waitFor(`(typeof renderCoachPushNudge==='function' && typeof aviAskCoachPush==='function' && typeof ensureCoachPush==='function' && typeof CUR==='object' && !!document.getElementById('h-push-nudge'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (renderCoachPushNudge/ensureCoachPush/#h-push-nudge)');

  // Andamiaje: coach logueado + stub de Notification (permission es read-only en el navegador).
  await ev(`(()=>{
    CUR.loggedAs='coach'; CUR.clientId=null;
    window.__perm='default'; window.__reqResult='granted';
    window.Notification={ get permission(){return window.__perm;}, requestPermission:async()=>window.__reqResult };
    if(!('PushManager' in window)) window.PushManager=function(){};
    window.__subOk=true; window.__subCalls=[];
    window.subscribePush=async(id,d,s,f)=>{window.__subCalls.push({id,force:f}); return window.__subOk;};
    window.__lastToast=''; window.toast=(m)=>{window.__lastToast=m;};
    try{localStorage.removeItem('ax_push_snooze__coach');}catch(e){}
  })()`);

  // Q1: permiso 'default' sin snooze → tarjeta "Activa tus notificaciones" con 2 botones.
  let s = JSON.parse(await ev(`JSON.stringify((()=>{ window.__perm='default'; renderCoachPushNudge();
    const el=document.getElementById('h-push-nudge');
    return {card:!!el.querySelector('.push-nudge'), txt:el.textContent, btns:el.querySelectorAll('button').length};})())`));
  check('Q1 default → tarjeta con activar + ahora no', s.card && /Activa tus notificaciones/.test(s.txt) && s.btns === 2, JSON.stringify({btns:s.btns}));

  // Q2: permiso 'granted' → sin tarjeta (ya está activo).
  s = JSON.parse(await ev(`JSON.stringify((()=>{ window.__perm='granted'; renderCoachPushNudge();
    return {html:document.getElementById('h-push-nudge').innerHTML};})())`));
  check('Q2 granted → tarjeta oculta', s.html === '', JSON.stringify(s));

  // Q3: permiso 'denied' → tarjeta de instrucciones SIN botones inútiles.
  s = JSON.parse(await ev(`JSON.stringify((()=>{ window.__perm='denied'; renderCoachPushNudge();
    const el=document.getElementById('h-push-nudge');
    return {card:!!el.querySelector('.push-nudge'), bloq:/bloqueadas/i.test(el.textContent), btns:el.querySelectorAll('button').length};})())`));
  check('Q3 denied → instrucciones sin botones', s.card && s.bloq && s.btns === 0, JSON.stringify(s));

  // Q4: snooze vigente ("Ahora no") con permiso default → oculta.
  s = JSON.parse(await ev(`JSON.stringify((()=>{ window.__perm='default'; renderCoachPushNudge();
    aviSnoozeCoachPush(); // fija snooze=ahora y re-renderiza
    const el=document.getElementById('h-push-nudge');
    const snoozed=!!localStorage.getItem('ax_push_snooze__coach');
    return {snoozed, hidden:el.innerHTML===''};})())`));
  check('Q4 "Ahora no" → snooze fijado y tarjeta oculta', s.snoozed && s.hidden, JSON.stringify(s));

  // Q6a: ensureCoachPush con self-heal que FALLA → NO marca curado → REINTENTA en el próximo
  // render (antes se marcaba curado antes de saber si entró; aviso Lucas/Julián v318). Va
  // ANTES de Q6b/Q5 porque el flag _coachPushHealed no se puede resetear desde afuera.
  s = JSON.parse(await ev(`(async()=>{ window.__perm='granted'; window.__subOk=false; window.__subCalls=[];
    await ensureCoachPush(); await ensureCoachPush();
    return JSON.stringify({calls:window.__subCalls.length, force:(window.__subCalls[0]||{}).force});})()`));
  check('Q6a self-heal FALLA → reintenta (2 intentos, no se marca curado)', s.calls === 2 && s.force === true, JSON.stringify(s));

  // Q6b: self-heal ÉXITO → marca curado → NO repite en la misma sesión (1 solo POST).
  s = JSON.parse(await ev(`(async()=>{ window.__perm='granted'; window.__subOk=true; window.__subCalls=[];
    await ensureCoachPush(); await ensureCoachPush();
    return JSON.stringify({calls:window.__subCalls.length, force:(window.__subCalls[0]||{}).force});})()`));
  check('Q6b self-heal ÉXITO → forzado UNA vez por sesión', s.calls === 1 && s.force === true, JSON.stringify(s));

  // Q5a: "Activar" con registro ÉXITO → subscribePush('_coach',force) + toast HONESTO "¡Listo!".
  s = JSON.parse(await ev(`(async()=>{ window.__perm='default'; window.__reqResult='granted'; window.__subOk=true;
    window.__subCalls=[]; window.__lastToast=''; await aviAskCoachPush();
    const last=window.__subCalls[window.__subCalls.length-1]||{};
    return JSON.stringify({calls:window.__subCalls.length, id:last.id, force:last.force, toast:window.__lastToast});})()`));
  check('Q5a Activar+éxito → subscribePush("_coach",force) y toast "¡Listo!"',
        s.calls === 1 && s.id === '_coach' && s.force === true && /Listo/.test(s.toast), JSON.stringify(s));

  // Q5b: "Activar" con registro FALLIDO → toast HONESTO de error, NO "¡Listo!".
  s = JSON.parse(await ev(`(async()=>{ window.__perm='default'; window.__reqResult='granted'; window.__subOk=false;
    window.__lastToast=''; await aviAskCoachPush();
    return JSON.stringify({toast:window.__lastToast});})()`));
  check('Q5b Activar+fallo → toast honesto de error (no miente "¡Listo!")',
        !/Listo/.test(s.toast) && /No se pudo|conexión/i.test(s.toast), JSON.stringify(s));

  // Q7: fuera del panel del coach (loggedAs!=='coach') → nunca muestra la tarjeta.
  s = JSON.parse(await ev(`JSON.stringify((()=>{ CUR.loggedAs='client'; window.__perm='default';
    localStorage.removeItem('ax_push_snooze__coach'); renderCoachPushNudge();
    const out=document.getElementById('h-push-nudge').innerHTML; CUR.loggedAs='coach';
    return {hidden:out===''};})())`));
  check('Q7 no-coach → tarjeta nunca aparece', s.hidden, JSON.stringify(s));

  // Shot del home del coach con la tarjeta visible (default).
  await ev(`(()=>{ window.__perm='default'; localStorage.removeItem('ax_push_snooze__coach'); renderCoachPushNudge();
    ['avi-loading','s-login'].forEach(i=>{const e=document.getElementById(i);if(e){e.style.display='none';e.classList.remove('on');}});
    document.querySelectorAll('.screen').forEach(x=>{x.style.display='none';x.classList.remove('on');});
    const sc=document.getElementById('s-coach'); if(sc){sc.style.display='';sc.classList.add('on');}
    document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
    const ph=document.getElementById('p-home'); if(ph)ph.classList.add('on');
    document.documentElement.setAttribute('data-theme','light');
  })()`);
  await sleep(400); await shot('v318-coach-nudge-claro');
  await ev(`document.documentElement.setAttribute('data-theme','dark')`);
  await sleep(400); await shot('v318-coach-nudge-oscuro');

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
