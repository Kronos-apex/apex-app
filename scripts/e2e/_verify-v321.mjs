// Verificación E2E de v321: chat de pantalla completa del COACH + estado de leído sincronizado
// + anti-ráfaga de notificaciones. Reporte de Camilo: la notif llevaba al perfil (no al chat),
// había que scrollear para ver lo reciente, y mensajes viejos ya leídos re-notificaban.
// Patrón preview-SIN-login: se inyecta estado de coach fake y se stubea sv/pushToClient/toast.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8793;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v321-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9293', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9293/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  const ready = await waitFor(`(typeof openCoachChat==='function' && typeof markCoachRead==='function' && typeof openChatFor==='function' && typeof renderMsgs==='function' && !!document.getElementById('coach-chat') && !!document.getElementById('msgs-list'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (openCoachChat/#coach-chat/#msgs-list)');

  // Estado de coach fake + espías. Un asesorado con 30 mensajes (para probar el scroll al final)
  // y otro con un mensaje reciente sin leer.
  await ev(`(()=>{
    CUR.loggedAs='coach'; CUR.clientId=null;
    const now=Date.now(); const iso=n=>new Date(now+n).toISOString();
    DB.clients=[
      {id:'c1',name:'Ana Pérez',level:'Intermedio',routines:[]},
      {id:'c2',name:'Beto Ruiz',level:'Intermedio',routines:[]},
    ];
    const many=[]; for(let i=0;i<30;i++)many.push({from:i%2?'coach':'client',text:'Mensaje número '+(i+1),date:iso(-((30-i)*60000))});
    DB.msgs={ c1:many, c2:[{from:'client',text:'Hola coach, una pregunta',date:iso(-1000)}] };
    try{localStorage.removeItem('ax_msgreads');}catch(e){}
    window.__push=[]; window.pushToClient=(id,t,b,o)=>{window.__push.push({id,chatId:o&&o.chatId,t});};
    // NO stubeamos sv (Lucas v321: eso daba falso verde). Ejercemos el sv() REAL y espiamos su
    // camino de SUBIDA a la nube (sbSet legacy / _persistAuthUserDebounced auth) — sin red.
    window.__upload=[];
    sbSet=(k,v)=>{ window.__upload.push(k); };
    _persistAuthUserDebounced=(k,v)=>{ window.__upload.push(k); };
    window.toast=()=>{};
  })()`);

  // C1: openCoachChat abre el overlay, pinta cabecera y thread, y aterriza en el ÚLTIMO mensaje.
  let s = JSON.parse(await ev(`JSON.stringify((()=>{
    openCoachChat('c1');
    const el=document.getElementById('coach-chat');
    const con=document.getElementById('cchat-thread');
    const bubbles=con.querySelectorAll('.mb').length;
    const atBottom=(con.scrollHeight-con.clientHeight-con.scrollTop)<=2;
    return {on:el.classList.contains('on'), name:document.getElementById('cchat-name').textContent, bubbles, atBottom, sh:con.scrollHeight, st:con.scrollTop};})())`));
  check('C1 openCoachChat: overlay abierto, cabecera y 30 burbujas, scroll al final',
        s.on && s.name === 'Ana Pérez' && s.bubbles === 30 && s.atBottom, JSON.stringify({on:s.on,name:s.name,bubbles:s.bubbles,atBottom:s.atBottom}));
  await shot('v321-chat-oscuro-prep');

  // C2: enviar un mensaje → se agrega a DB, empuja al asesorado (spy) y re-renderiza.
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    document.getElementById('cchat-in').value='Claro, dime';
    window.__push=[]; sendCoachChatMsg();
    const last=DB.msgs.c1[DB.msgs.c1.length-1];
    return {n:DB.msgs.c1.length, from:last.from, text:last.text, push:window.__push.length, pushChat:(window.__push[0]||{}).chatId, taVacio:document.getElementById('cchat-in').value===''};})())`));
  check('C2 enviar: mensaje del coach en DB + push al asesorado (chatId c1) + textarea limpio',
        s.n === 31 && s.from === 'coach' && s.text === 'Claro, dime' && s.push === 1 && s.pushChat === 'c1' && s.taVacio, JSON.stringify(s));

  // C3: markCoachRead → el sv() REAL ejecuta la subida a la nube de 'ax_msgreads' (prueba el fix
  //     del 🔴: sin la clave en SB_KEYS el portón de subida NO dispara). Esperamos el debounce
  //     (sbSet legacy 1500ms / _persistAuthUserDebounced) — spies, sin red. + espejo a localStorage.
  await ev(`(()=>{ window.__upload=[]; markCoachRead('c1'); })()`);
  await sleep(1800);
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const map=JSON.parse(localStorage.getItem('ax_msgreads')||'{}');
    return {uploaded:window.__upload.includes('ax_msgreads'), inSB:SB_KEYS.includes('ax_msgreads'), hasC1:!!map.c1};})())`));
  check('C3 markCoachRead: el sv REAL EJECUTA la subida a la nube (ax_msgreads en SB_KEYS) + local', s.uploaded && s.inSB && s.hasC1, JSON.stringify(s));

  // C4: estado de leído — c2 tiene un mensaje del cliente SIN leer → badge de no-leídos = 1;
  //     tras abrir su chat (marca leído), el badge baja a 0.
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    try{localStorage.removeItem('ax_msgreads');}catch(e){}
    renderMsgs(); const b1=document.getElementById('sb-msgs-bdg').textContent;
    openCoachChat('c2'); // marca leído c2
    renderMsgs(); const b2=document.getElementById('sb-msgs-bdg').textContent;
    return {b1,b2};})())`));
  // c1 Y c2 tienen mensajes del cliente sin leer → 2; abrir el chat de c2 lo marca leído → 1 (c1).
  check('C4 leído: badge no-leídos 2 → 1 tras abrir un chat (usa el mapa sincronizado)', s.b1 === '2' && s.b2 === '1', JSON.stringify(s));

  // C5: la BANDEJA (renderMsgs) abre el CHAT (no el perfil): el onclick de una fila abre #coach-chat.
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    _closeCoachChat(); renderMsgs();
    const row=document.querySelector('#msgs-list .cli'); row.onclick();
    return {on:document.getElementById('coach-chat').classList.contains('on')};})())`));
  check('C5 bandeja → abre el chat de pantalla completa (no el perfil)', s.on, JSON.stringify(s));

  // C6: tocar la NOTIFICACIÓN (openChatFor como coach) abre el chat directo.
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    _closeCoachChat(); openChatFor('c1');
    const el=document.getElementById('coach-chat');
    return {on:el.classList.contains('on'), name:document.getElementById('cchat-name').textContent};})())`));
  check('C6 notificación → chat directo del asesorado correcto', s.on && s.name === 'Ana Pérez', JSON.stringify(s));

  // C7: el botón ATRÁS (via _aviCloseTopOverlay) cierra el chat primero.
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const closed=_aviCloseTopOverlay();
    return {closed, on:document.getElementById('coach-chat').classList.contains('on')};})())`));
  check('C7 atrás: _aviCloseTopOverlay cierra el chat (prioridad de tope)', s.closed === true && s.on === false, JSON.stringify(s));

  // C8: anti-ráfaga — startMsgPolling fija _msgNotifSince > 0 (base para no re-notificar viejos).
  s = await ev(`(()=>{ startMsgPolling(); const v=_msgNotifSince; try{stopMsgPolling();}catch(e){} return v>0; })()`);
  check('C8 anti-ráfaga: _msgNotifSince se inicializa al arrancar el polling', s === true, String(s));

  // C9: si el coach está leyendo ARRIBA, un re-render del poll (sin forceBottom) NO lo tira al
  //     fondo; con forceBottom (abrir/enviar) sí (aviso Lucas v321).
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    openCoachChat('c1'); const con=document.getElementById('cchat-thread');
    con.scrollTop=0; // el coach subió a leer
    renderCoachChatThread('c1'); const keptTop=con.scrollTop; // poll re-render: respeta
    renderCoachChatThread('c1',true); const forced=(con.scrollHeight-con.clientHeight-con.scrollTop)<=2; // forzado: al fondo
    return {keptTop, forced};})())`));
  check('C9 scroll: re-render del poll respeta la posición; forceBottom baja al final', s.keptTop === 0 && s.forced, JSON.stringify(s));

  // Shots del chat abierto, claro y oscuro.
  await ev(`(()=>{ openCoachChat('c1');
    ['avi-loading','s-login'].forEach(i=>{const e=document.getElementById(i);if(e){e.style.display='none';}});
    document.documentElement.setAttribute('data-theme','light'); })()`);
  await sleep(400); await shot('v321-chat-claro');
  await ev(`document.documentElement.setAttribute('data-theme','dark')`);
  await sleep(400); await shot('v321-chat-oscuro');

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
