// Verificación E2E de v320: fix de notificaciones del ASESORADO (mismo patrón de raíz que el
// coach v318). CERO asesorados suscritos en 40+ días. aviAskPush cantaba "¡Listo!" sin
// confirmar (y sin _pushCtx no suscribía nada); ahora toast HONESTO condicionado al registro
// real + subscribePush FORZADO + self-heal ensureClientPush 1×/sesión. Patrón preview-SIN-login
// con stub de Notification/subscribePush + espía de toast; _pushCtx es window-accesible (var).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8790;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v320-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9290', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9290/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

try {
  const ready = await waitFor(`(typeof aviAskPush==='function' && typeof ensureClientPush==='function' && typeof renderPushNudge==='function' && typeof CUR==='object' && !!document.getElementById('cn-push-nudge'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (aviAskPush/ensureClientPush/#cn-push-nudge)');

  // Andamiaje: asesorado con contexto de push + stub de Notification/subscribePush/toast.
  await ev(`(()=>{
    CUR.loggedAs='client'; CUR.clientId='cli1';
    _pushCtx={clientId:'cli1',days:['Lunes','Miércoles'],shifts:null};
    window.__perm='default'; window.__reqResult='granted';
    window.Notification={ get permission(){return window.__perm;}, requestPermission:async()=>window.__reqResult };
    if(!('PushManager' in window)) window.PushManager=function(){};
    window.__subOk=true; window.__subCalls=[];
    window.subscribePush=async(id,d,s,f)=>{window.__subCalls.push({id,force:f}); return window.__subOk;};
    window.__lastToast=''; window.toast=(m)=>{window.__lastToast=m;};
    try{localStorage.removeItem('ax_push_snooze_cli1');}catch(e){}
  })()`);

  // P1: nudge del asesorado visible con permiso 'default' (2 botones).
  let s = JSON.parse(await ev(`JSON.stringify((()=>{ window.__perm='default'; renderPushNudge();
    const el=document.getElementById('cn-push-nudge');
    return {card:!!el.querySelector('.push-nudge'), btns:el.querySelectorAll('button').length};})())`));
  check('P1 default → tarjeta del asesorado con 2 botones', s.card && s.btns === 2, JSON.stringify(s));

  // P2: granted → nudge oculto (ya activó).
  s = await ev(`(()=>{ window.__perm='granted'; renderPushNudge(); return document.getElementById('cn-push-nudge').innerHTML;})()`);
  check('P2 granted → nudge oculto', s === '', JSON.stringify(s));

  // P3/P4 (self-heal) van ANTES de los de "Activar+éxito": aviAskPush con éxito marca
  // _clientPushHealed=true (let de módulo, no reseteable desde afuera) y bloquearía el self-heal.
  // P3: ensureClientPush self-heal que FALLA → reintenta (2 intentos, no se marca curado).
  s = JSON.parse(await ev(`(async()=>{ window.__perm='granted'; window.__subOk=false; window.__subCalls=[];
    await ensureClientPush(); await ensureClientPush();
    return JSON.stringify({calls:window.__subCalls.length, force:(window.__subCalls[0]||{}).force});})()`));
  check('P3 self-heal FALLA → reintenta (2 intentos)', s.calls === 2 && s.force === true, JSON.stringify(s));

  // P4: LAZO CERRADO — "Activar" concede pero el POST falla → toast "Activando…" (sin exigir
  //     reintento); luego el self-heal cura y muestra "¡Listo!" (aviso Lucas v320). Este es el
  //     PRIMER éxito → marca _clientPushHealed, por eso va aquí (antes de otros que lo necesiten false).
  s = JSON.parse(await ev(`(async()=>{
    window.__perm='granted'; window.__reqResult='granted'; window.__subOk=false; window.__lastToast='';
    await aviAskPush(); const t1=window.__lastToast;
    window.__subOk=true; window.__lastToast=''; window.__subCalls=[];
    await ensureClientPush(); const t2=window.__lastToast;
    return JSON.stringify({t1,t2,calls:window.__subCalls.length});})()`));
  check('P4 lazo: Activar+fallo → "Activando…"; luego self-heal cura → "¡Listo!"',
        /Activando/i.test(s.t1) && !/Listo/.test(s.t1) && /Listo/.test(s.t2) && s.calls === 1, JSON.stringify(s));

  // P5: "Activar" con registro ÉXITO → subscribePush(clientId, force=true) + toast "¡Listo!".
  s = JSON.parse(await ev(`(async()=>{ window.__perm='granted'; window.__reqResult='granted'; window.__subOk=true;
    window.__subCalls=[]; window.__lastToast=''; await aviAskPush();
    const last=window.__subCalls[window.__subCalls.length-1]||{};
    return JSON.stringify({calls:window.__subCalls.length, id:last.id, force:last.force, toast:window.__lastToast});})()`));
  check('P5 Activar+éxito → subscribePush("cli1",force) y toast "¡Listo!"',
        s.calls === 1 && s.id === 'cli1' && s.force === true && /Listo/.test(s.toast), JSON.stringify(s));

  // P6: "Activar" con registro FALLIDO → toast honesto "Activando…", NO "¡Listo!".
  s = JSON.parse(await ev(`(async()=>{ window.__perm='granted'; window.__reqResult='granted'; window.__subOk=false;
    window.__lastToast=''; await aviAskPush(); return JSON.stringify({toast:window.__lastToast});})()`));
  check('P6 Activar+fallo → toast honesto (no miente "¡Listo!")',
        !/Listo/.test(s.toast) && /Activando|tardar/i.test(s.toast), JSON.stringify(s));

  // P7: "Activar" concedido pero SIN _pushCtx → no suscribe y NO canta "¡Listo!" (bug viejo:
  //     _pushCtx null a los 4s → decía Listo sin registrar nada).
  s = JSON.parse(await ev(`(async()=>{ const bak=_pushCtx; _pushCtx=null;
    window.__perm='granted'; window.__reqResult='granted'; window.__subOk=true; window.__subCalls=[]; window.__lastToast='';
    await aviAskPush(); const out={calls:window.__subCalls.length, toast:window.__lastToast}; _pushCtx=bak;
    return JSON.stringify(out);})()`));
  check('P7 sin _pushCtx → no suscribe y no dice "¡Listo!"', s.calls === 0 && !/Listo/.test(s.toast), JSON.stringify(s));

  // P8: ensureClientPush NO corre si no es asesorado (guard loggedAs).
  s = JSON.parse(await ev(`(async()=>{ CUR.loggedAs='coach'; window.__perm='granted'; window.__subCalls=[];
    await ensureClientPush(); CUR.loggedAs='client';
    return JSON.stringify({calls:window.__subCalls.length});})()`));
  check('P8 no-asesorado → ensureClientPush no hace nada', s.calls === 0, JSON.stringify(s));

  // P9: permiso BLOQUEADO ('denied') → el asesorado YA no queda sin salida: tarjeta con
  //     instrucciones para reactivar (antes se ocultaba; aviso Lucas v320).
  s = JSON.parse(await ev(`JSON.stringify((()=>{ window.__perm='denied'; renderPushNudge();
    const el=document.getElementById('cn-push-nudge');
    return {card:!!el.querySelector('.push-nudge'), bloq:/bloqueadas/i.test(el.textContent), btns:el.querySelectorAll('button').length};})())`));
  check('P9 denied → instrucciones para reactivar (sin callejón sin salida)', s.card && s.bloq && s.btns === 0, JSON.stringify(s));

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
