// Verificación E2E de la tarjeta de NOVEDADES (v302, pedido Camilo 2026-07-09):
// "¿Qué hay de nuevo?" descartable en Hoy, gateada por ax_news_seen (por dispositivo).
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8773;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-news-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9273', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9273/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Users-KRONOS/40941d22-8542-4c7c-9e7a-88c3e84720fc/scratchpad';
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch {} };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x='') => { const line = (c?'OK ':'FAIL ') + n + (x?' — '+x:''); results.push(line); log('  ' + line); };
// Deriva del PROPIO AVI_NEWS lo que el tour DEBE mostrar (top-3 más nuevas > seen, filtro coach,
// orden de display = la más VIEJA primero) para que las aserciones NO envejezcan al añadir novedades
// (radar Fable v367: la entrada v367 corrió la ventana y dejó N1/N2/N5/N9 en rojo por versiones clavadas).
const expNews = async (seen, coachExpr = "((typeof clientHasCoach==='function')?!!clientHasCoach(DB.clients.find(x=>x.id===CUR.clientId)):true)") =>
  JSON.parse(await ev(`(()=>{const has=${coachExpr};let items=newsToShow(AVI_NEWS,${seen},{coach:has});const asc=items.slice().sort((a,b)=>a.v-b.v);return JSON.stringify({dots:asc.length,firstT:(asc[0]||{}).t||'',lastT:(asc[asc.length-1]||{}).t||'',firstSteps:((asc[0]||{}).steps||[]).length});})()`));

try {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none'&&CUR&&CUR.clientId)})()`);
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~2-3 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    localStorage.removeItem('ax_news_seen');
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    // EL FIXTURE TIENE QUE DARLE HISTORIAL, y por eso N1/N2 llevaban en rojo acusando a la app
    // de no abrir el tour con el tour PERFECTO: renderClientToday solo llama a renderNewsCard
    // si NO esta en modo dia-1 (v403), y sin una sola sesion la app entra en ese modo y SUPRIME
    // el tour a proposito — a quien estrena la app no se le ensenan doce novedades que no tuvo.
    // N5/N8b pasaban porque llaman a renderNewsCard() a mano, saltandose la puerta real.
    // Un fixture que no monta el estado no prueba nada, y sus mensajes se leen como bugs de la app.
    // (Ojo: NADA de comillas invertidas aqui dentro — esto vive en un template literal.)
    const _h=Date.now();
    DB.history[CUR.clientId]=[0,2,4].map(d=>({id:'hnt'+d,routineId:'rnt',name:'Full Body',
      date:new Date(_h-(d+1)*86400000).toISOString(), finishedAt:new Date(_h-(d+1)*86400000+3.6e6).toISOString(),
      doneSets:12,totalSets:12,exercises:[]}));
    renderClientToday(c);})()`);
  await sleep(900);

  // N1: tour abierto con la slide 1 (la novedad más vieja sin ver), pasos y dots
  let s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),
    title:(document.querySelector('#nt-body .nt-title')||{}).textContent,
    pill:(document.querySelector('#nt-body .nt-pill')||{}).textContent,
    steps:document.querySelectorAll('#nt-body .nt-step').length,
    dots:document.querySelectorAll('#nt-dots .nt-dot').length,
    next:(document.getElementById('nt-next')||{}).textContent,
    chip:!!document.querySelector('#nt-body .nt-chip svg')})`));
  await shot('news-tour-slide1');
  // Derivado de AVI_NEWS (no clavado a versiones): slide 1 = la más VIEJA de las ≤3 novedades nuevas.
  const e1 = await expNews(0);
  check('N1 tour abre en slide 1 (la más vieja de las 3 nuevas, derivada de AVI_NEWS) con pill NUEVO, pasos, dots e icono SVG', s.open && s.title === e1.firstT && s.pill === 'NUEVO' && s.steps === e1.firstSteps && s.dots === e1.dots && (e1.dots > 1 ? /Siguiente/ : /Listo/).test(s.next||'') && s.chip, JSON.stringify({ s, exp: e1 }));

  // N2: avanzar hasta la ultima slide (la más NUEVA) → boton "Listo"
  for (let i = 0; i < e1.dots - 1; i++) await ev(`ntNext()`);
  s = JSON.parse(await ev(`JSON.stringify({title:(document.querySelector('#nt-body .nt-title')||{}).textContent,
    next:(document.getElementById('nt-next')||{}).textContent,
    dotOn:[...document.querySelectorAll('#nt-dots .nt-dot')].findIndex(d=>d.classList.contains('on'))})`));
  await shot('news-tour-slide3');
  check('N2 ultima slide (la más nueva de AVI_NEWS) con "Listo" en el ultimo dot', s.title === e1.lastT && /Listo/.test(s.next||'') && s.dotOn === e1.dots - 1, JSON.stringify({ s, exp: e1 }));

  // N3: "Listo" cierra y marca la ultima version vista
  await ev(`ntNext()`);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),seen:localStorage.getItem('ax_news_seen'),latest:String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0))})`));
  check('N3 Listo → tour cerrado, ax_news_seen = ultima version', !s.open && s.seen === s.latest, JSON.stringify(s));

  // N4: re-render de Hoy no lo reabre
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden')})`));
  check('N4 re-render no lo reabre', !s.open, JSON.stringify(s));

  // N5: visto parcial (v314) → tour con las novedades > 314 (top-3), slide 1 = la más vieja (derivado)
  await ev(`(()=>{localStorage.setItem('ax_news_seen','314');renderNewsCard();})()`);
  await sleep(300);
  const e5 = await expNews(314);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),dots:document.querySelectorAll('#nt-dots .nt-dot').length,title:(document.querySelector('#nt-body .nt-title')||{}).textContent})`));
  check('N5 visto parcial (v314) → tour con las novedades nuevas (derivado de AVI_NEWS), slide 1 = la más vieja', s.open && s.dots === e5.dots && s.title === e5.firstT, JSON.stringify({ s, exp: e5 }));
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),open:!document.getElementById('news-tour').classList.contains('hidden'),seen:localStorage.getItem('ax_news_seen'),latest:String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0))})`));
  check('N6 atras cierra el tour y marca visto', s.closed === true && !s.open && s.seen === s.latest, JSON.stringify(s));

  // N7: mecanismo CTA (ntCta → ntGoMsgs abre Mensajes y cierra el tour). Inyecto una novedad
  // temporal CON cta como la ÚNICA nueva, porque la única real con cta (chat v316) ya salió del
  // top-3 al crecer AVI_NEWS (v352/v362/v367 más nuevas) → probar el mecanismo, no una versión.
  await ev(`(()=>{window.__origNews=AVI_NEWS.slice();const maxV=AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0);
    AVI_NEWS.push({v:maxV+1,icon:'chat',t:'CTA Test',d:'prueba de deep-link',steps:['a','b','c'],cta:{label:'Probarlas ahora',run:'ntGoMsgs'}});
    localStorage.setItem('ax_news_seen',String(maxV));renderNewsCard();})()`);
  await sleep(400);
  await ev(`ntCta()`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),msgs:document.getElementById('cn-messages').classList.contains('on')})`));
  check('N7 CTA "Probarlas ahora" (ntCta→ntGoMsgs) cierra el tour y abre la pestaña Mensajes', !s.open && s.msgs, JSON.stringify(s));
  // Restaura AVI_NEWS intacto y vuelve a Hoy con todo visto (no contamina N8/N9).
  await ev(`(()=>{if(window.__origNews){AVI_NEWS.length=0;window.__origNews.forEach(n=>AVI_NEWS.push(n));}
    const t=document.querySelectorAll('.cntab')[0];if(typeof cnTab==='function'&&t)cnTab('cn-today',t);
    localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));})()`);
  await sleep(400);

  // N8: bienvenida encima (login fresco) → NO abre, pero reintenta solo al despejarse (v305)
  // Reproduce el reporte de Camilo 2026-07-10: incógnito con perfil real → tour nunca salió.
  await ev(`(()=>{localStorage.removeItem('ax_news_seen');
    const w=document.getElementById('cwelcome');if(w){w.classList.add('on');w.style.display='';}
    renderNewsCard();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden')})`));
  check('N8a con la bienvenida encima el tour ESPERA (no abre)', !s.open, JSON.stringify(s));
  await ev(`hideClientWelcome()`);
  const opened = await waitFor(`!document.getElementById('news-tour').classList.contains('hidden')`, 5000);
  check('N8b al cerrarse la bienvenida el tour abre SOLO (reintento v305)', opened);
  await ev(`(()=>{if(typeof ntClose==='function')ntClose(false);})()`);
  await sleep(200);

  // N9 (v316): las novedades coach:true NO se muestran al modo libre (prometían chat sin coach).
  // Derivado con has=false: al libre se le filtran los coach:true; slide 1 = la más vieja del resto.
  const e9 = await expNews(314, 'false');
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const orig=window.clientHasCoach; window.clientHasCoach=()=>false;
    localStorage.setItem('ax_news_seen','314');
    try{ renderNewsCard(); }finally{ window.clientHasCoach=orig; }
    const open=!document.getElementById('news-tour').classList.contains('hidden');
    const dots=document.querySelectorAll('#nt-dots .nt-dot').length;
    const title=(document.querySelector('#nt-body .nt-title')||{}).textContent||'';
    localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
    return {open,dots,title};})())`));
  check('N9 libre (sin coach): la novedad del chat (coach:true) SE FILTRA; dots y slide 1 = derivados sin coach, sin "chat"', s.open && s.dots === e9.dots && s.title === e9.firstT && !/chat|respuestas/i.test(s.title), JSON.stringify({ s, exp: e9 }));

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
