import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8787, APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-coachback-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9287', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9287/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(800);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`);

// El login-cliente pudo abrir el TOUR de novedades (reintento v305) — es un overlay a nivel
// body (z1600) que sobrevive al cambio a s-coach y se COME el primer atrás (2026-07-10:
// 6 checks corridos en uno). El coach real nunca lo ve (no renderiza el Hoy del cliente).
await ev(`(()=>{try{if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));if(typeof ntClose==='function')ntClose(false);}catch(e){}})()`);
// Forzar la PANTALLA DEL COACH y un estado inicial como initCoach (sin datos reales del coach):
// metemos un cliente de prueba en DB.clients para poder probar p-detail.
await ev(`(()=>{
  showScreen('s-coach');
  CUR.loggedAs='coach'; // el poller del cliente re-ejecuta initClientView y resetea AVINAV; en coach no corre
  // panel inicial = p-home visible
  document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
  document.getElementById('p-home').classList.add('on');
  document.querySelectorAll('.sbi').forEach(s=>s.classList.remove('on'));
  document.getElementById('sbi-home').classList.add('on');
  navReset(null);
  const onP=document.querySelector('#s-coach .panel.on'); AVINAV.curTab=(onP&&onP.id)||'p-home';
  // cliente de prueba para p-detail (usa el propio samuel que ya está en DB.clients, o uno fake)
  if(!(DB.clients||[]).length){ DB.clients=[{id:'tc1',name:'Test Cliente',level:'Intermedio',goal:'Ganar músculo',days:3}]; }
  window.__TCID=DB.clients[0].id;
  // saltar la carga pesada (en esta sesión-cliente falsa re-ejecuta el init y resetea el stack;
  // en una sesión-coach real la carga va por la ruta del coach). Aísla la lógica de stepping.
  try{ if(typeof _heavyLoaded!=='undefined') _heavyLoaded[window.__TCID]=true; }catch(e){}
  // history guard activo
  if(history.state===null) history.pushState({aviGuard:1},'');
})()`);
await sleep(300);

const onPanel = async () => ev(`(()=>{const p=document.querySelector('#s-coach .panel.on');return p?p.id:'?'})()`);
const stackLen = async () => ev(`AVINAV.stack.length`);
const curTab = async () => ev(`AVINAV.curTab`);
const sbiOn = async () => ev(`(()=>{const s=document.querySelector('.sbi.on');return s?s.id:'?'})()`);
const back = async () => { await ev(`_aviHandleBack()`); await sleep(250); };
const results = [];
const check = (name, cond, extra='') => { results.push((cond?'✅':'❌')+' '+name+(extra?' — '+extra:'')); };

// ── FLUJO 1: stepping de paneles Home→Cargas→Mensajes, atrás×2 → Cargas, Home ──
await ev(`gp('p-progress',document.getElementById('sbi-progress'),'Cargas')`); await sleep(150);
await ev(`gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes')`); await sleep(150);
check('F1 forward: panel=p-msgs', await onPanel()==='p-msgs', await onPanel());
check('F1 forward: stack=2', await stackLen()===2, 'len='+await stackLen());
await back();
check('F1 atrás1: panel=p-progress', await onPanel()==='p-progress', await onPanel());
check('F1 atrás1: sidebar=sbi-progress', await sbiOn()==='sbi-progress', await sbiOn());
check('F1 atrás1: stack=1', await stackLen()===1, 'len='+await stackLen());
await back();
check('F1 atrás2: panel=p-home', await onPanel()==='p-home', await onPanel());
check('F1 atrás2: stack=0', await stackLen()===0, 'len='+await stackLen());
// atrás en Inicio = arma salida, NO sale
await back();
check('F1 atrás3 en Inicio: exitArmed=true', await ev(`AVINAV.exitArmed===true`));
check('F1 atrás3 en Inicio: sigue en p-home', await onPanel()==='p-home', await onPanel());

// reset a Inicio limpio
await ev(`AVINAV.stack.length=0;AVINAV.exitArmed=false;AVINAV.curTab='p-home';document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));document.getElementById('p-home').classList.add('on');`);
await sleep(150);

// ── FLUJO 2: Asesorados → detalle(cliente) → atrás → Asesorados → Inicio ──
// gp('p-detail') es exactamente la navegación que ejecuta openDetail (su cola async de carga
// pesada se omite aquí porque en esta sesión-cliente falsa re-entraría a initClientView).
console.log('  [dbg] F2 inicio: stack=', await stackLen(), 'curTab=', await curTab());
await ev(`gp('p-clients',document.getElementById('sbi-clients'),'Asesorados')`); await sleep(150);
console.log('  [dbg] tras gp(p-clients): stack=', await stackLen(), 'curTab=', await curTab());
await ev(`CUR.clientId=window.__TCID`);
await ev(`gp('p-detail',null,'Detalle')`); await sleep(200);
console.log('  [dbg] tras gp(p-detail): stack=', await stackLen(), 'curTab=', await curTab());
check('F2 forward: panel=p-detail', await onPanel()==='p-detail', await onPanel());
check('F2 forward: stack=2 (home→clients, clients→detail)', await stackLen()===2, 'len='+await stackLen());
await back();
check('F2 atrás1: panel=p-clients', await onPanel()==='p-clients', await onPanel());
check('F2 atrás1: sidebar=sbi-clients', await sbiOn()==='sbi-clients', await sbiOn());
check('F2 atrás1: stack=1', await stackLen()===1, 'len='+await stackLen());
await back();
check('F2 atrás2: panel=p-home', await onPanel()==='p-home', await onPanel());
check('F2 atrás2: stack=0', await stackLen()===0, 'len='+await stackLen());

// ── FLUJO 2b: detalle → Mensajes → atrás → reabre el detalle del MISMO cliente ──
await ev(`AVINAV.stack.length=0;AVINAV.curTab='p-clients';CUR.clientId=window.__TCID;gp('p-detail',null,'Detalle',true);`); await sleep(150);
// stub ligero de openDetail para aislar el RESTORE de p-detail de su carga pesada async
await ev(`window.__realOpenDetail=window.openDetail; window.openDetail=function(id,s){CUR.clientId=id;gp('p-detail',null,'Detalle',s);return Promise.resolve();};`);
await ev(`gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes')`); await sleep(150);
check('F2b forward a Mensajes: panel=p-msgs', await onPanel()==='p-msgs', await onPanel());
await back();
check('F2b atrás: reabre p-detail', await onPanel()==='p-detail', await onPanel());
check('F2b atrás: CUR.clientId conservado', await ev(`CUR.clientId===window.__TCID`));
await ev(`window.openDetail=window.__realOpenDetail;`);

// ── FLUJO 3: navegar al MISMO panel no duplica pasos ──
await ev(`AVINAV.stack.length=0;AVINAV.curTab='p-home';`);
await ev(`gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes')`); await sleep(100);
await ev(`gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes')`); await sleep(100);
check('F3 mismo panel 2x: stack=1', await stackLen()===1, 'len='+await stackLen());

console.log('\n──── RESULTADOS COACH BACK ────');
results.forEach(r => console.log('  ' + r));
const fail = results.filter(r => r.startsWith('❌')).length;
console.log(fail === 0 ? '\n✅ TODO OK' : `\n❌ ${fail} FALLARON`);

ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fail === 0 ? 0 : 1);
