// Reproducción + regresión del BUG de notificaciones de "quiere coach" (reporte de Camilo:
// "me siguen llegando los mensajes de los 21 asesorados pidiendo coach"). El coach recibe una
// notificación por cada lead en CADA sesión, aunque sean viejos. Causa raíz: el guard anti-ráfaga
// (v321) de `_pollAuthCoach` usa `wantsCoachAt ? ts : Date.now()` → un lead SIN `wantsCoachAt`
// (legacy/degradado) toma la hora actual y SIEMPRE parece "nuevo" → burla el guard y re-notifica.
// Este harness ejercita el `_pollAuthCoach` REAL con UD.loadCoachClients stubbeado (sin red, sin
// tocar la nube) y espía notifNewMessage. Casos: A sin fecha (BUG), B fecha vieja (silencio ok),
// C fecha nueva (SÍ notifica — no romper la feature). Y prueba la RE-notificación entre sesiones.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8786;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-clead-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9286', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9286/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const evj = async expr => JSON.parse(await ev(`JSON.stringify(${expr})`));
const waitFor = async (expr, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

// Prepara: sesión coach, congela polls, stubbea UD.loadCoachClients con 3 leads controlados,
// espía notifNewMessage. Devuelve la lista de nombres notificados tras UN _pollAuthCoach.
// `session` fija _msgNotifSince (arranque de la sesión del coach). Cada poll parte de DB.clients
// con wantsCoach=false (como al recargar la app: el poll nunca persistió el true → se re-detecta).
const setup = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  for(let i=1;i<9999;i++)clearInterval(i);
  window.pollMessages=window.pollMessages; // no-op ref
  window.syncFromCloud=()=>Promise.resolve();
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  // Espía de notificaciones (reasigna la función global; captura el cuerpo = nombre del lead).
  window.__notified=[];
  window.notifNewMessage=function(title,body){ window.__notified.push(String(body)); };
  // Silenciar renders que podrían fallar sin DOM completo del panel.
  ['renderMsgs','renderClients','renderHome','renderDetailMsgs'].forEach(fn=>{ if(typeof window[fn]==='function')window[fn]=function(){}; });
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`;

// Corre un poll con leads dados. leads=[{id,name,wantsCoachAt|null}] (todos wantsCoach=true remoto).
// notifSinceAgoMs = hace cuánto arrancó la sesión. Resetea DB.clients (local wantsCoach=false).
function pollRun(leads, notifSinceAgoMs) {
  return `(async()=>{try{
    const now=Date.now();
    _msgNotifSince = now - ${notifSinceAgoMs};
    const L=${JSON.stringify(leads)};
    // Local: el coach tiene a estos asesorados en su lista SIN wantsCoach (nunca se persistió).
    DB.clients=L.map(x=>({id:x.id,name:x.name,selfReg:true,tier:'libre',wantsCoach:false}));
    DB.msgs={};
    // Remoto (stub de UD.loadCoachClients): profile con wantsCoach=true y su wantsCoachAt (o sin él).
    const rows=L.map(x=>{const p={name:x.name,wantsCoach:true,selfReg:true,tier:'libre'};
      if(x.wantsCoachAt!==null)p.wantsCoachAt=x.wantsCoachAt;
      return {user_id:x.id,coach_id:'coach1',role:'client',profile:p,routines:[],msgs:[]};});
    UD.loadCoachClients=async()=>rows;
    window.__notified=[];
    await _pollAuthCoach();
    return window.__notified.slice();
  }catch(e){return 'err:'+e.message+' | '+e.stack;}})()`;
}

try {
  await waitFor(`!!document.getElementById('s-login') && typeof _pollAuthCoach==='function' && typeof UD==='object'`);
  await sleep(1500);
  const okSetup = await ev(setup);
  if (okSetup !== true) throw new Error('setup: ' + okSetup);

  const dayAgo = new Date(Date.now() - 3 * 86400000).toISOString(); // lead VIEJO (antes de la sesión)
  const justNow = new Date(Date.now() - 1000).toISOString();        // lead NUEVO (durante la sesión)

  // ── R1: reproducir el BUG — 3 leads, sesión arrancó hace 60s ──
  // A: sin wantsCoachAt (legacy) · B: fecha vieja (3 días) · C: fecha nueva (hace 1s).
  const leads = [
    { id: 'A', name: 'Ana', wantsCoachAt: null },
    { id: 'B', name: 'Ben', wantsCoachAt: dayAgo },
    { id: 'C', name: 'Cid', wantsCoachAt: justNow },
  ];
  const n1 = await ev(pollRun(leads, 60000));
  if (!Array.isArray(n1)) throw new Error('R1 poll: ' + n1);
  const hit = name => n1.some(b => b.includes(name));
  // El comportamiento CORRECTO: solo C (nuevo en esta sesión) notifica.
  check('R1 lead NUEVO (C) SÍ notifica', hit('Cid'), JSON.stringify(n1));
  check('R1 lead VIEJO con fecha (B) NO notifica', !hit('Ben'), JSON.stringify(n1));
  check('🐛 R1 lead VIEJO SIN fecha (A) NO debe notificar', !hit('Ana'), 'notificados=' + JSON.stringify(n1));

  // ── R2: la SPAM entre sesiones — el mismo lead sin fecha en 2 sesiones seguidas ──
  // Cada "sesión" recarga DB.clients con wantsCoach=false (nunca se persistió) → re-detecta.
  const soloA = [{ id: 'A', name: 'Ana', wantsCoachAt: null }];
  const s1 = await ev(pollRun(soloA, 60000));
  const s2 = await ev(pollRun(soloA, 60000)); // "otra sesión" (mismo lead viejo sin fecha)
  const spamCount = (Array.isArray(s1) ? s1.filter(b => b.includes('Ana')).length : 9) + (Array.isArray(s2) ? s2.filter(b => b.includes('Ana')).length : 9);
  check('🐛 R2 lead viejo sin fecha NO re-notifica en cada sesión (spam)', spamCount === 0, 'notificaciones en 2 sesiones=' + spamCount);

  log('\njsErrors: ' + JSON.stringify(jsErrors));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log('\n' + (fails === 0 && jsErrors.length === 0 ? 'TODO OK' : fails + ' FALLA(S)' + (jsErrors.length ? ' + ' + jsErrors.length + ' jsError(s)' : '')));
  process.exitCode = (fails === 0 && jsErrors.length === 0) ? 0 : 1;
} catch (e) {
  log('ERROR: ' + (e && e.message));
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
