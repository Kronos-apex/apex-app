// Captura de pantallas para AUDITORÍA DE DISEÑO (preview-sin-login, 390px, claro+oscuro).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8794;
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9296', '--user-data-dir=' + process.env.TEMP + '/design-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9296/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);
const theme = async t => { await ev(`typeof setTheme==='function' && setTheme('${t}')`); await sleep(400); };

// 1) LOGIN claro + oscuro (primera impresión / marca)
await theme('light'); await shot('01-login-claro');
await theme('dark'); await shot('02-login-oscuro');
await theme('light');

// 2) CIERRE DE ENTRENO (pico de diseño / celebración) — datos fake
await ev(`(()=>{ ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  window._pushCtx={clientId:'cX',days:[],shifts:null};
  document.getElementById('wf-title').textContent='¡Lo lograste, Samuel!';
  document.getElementById('wf-sub').textContent='Full Body · lunes, 12 de julio';
  document.getElementById('wf-stats').innerHTML='<div class="wf-stat"><div class="wf-stat-val">42 min</div><div class="wf-stat-lbl">Duracion</div></div><div class="wf-stat"><div class="wf-stat-val">320 kcal</div><div class="wf-stat-lbl">Calorias</div></div><div class="wf-stat"><div class="wf-stat-val">8/8</div><div class="wf-stat-lbl">Series</div></div><div class="wf-stat"><div class="wf-stat-val">4,850 kg</div><div class="wf-stat-lbl">Volumen</div></div>';
  if(typeof WF_FEELINGS!=='undefined')document.getElementById('wf-faces').innerHTML=WF_FEELINGS.map(f=>'<button class="wf-face">'+f.e+'</button>').join('');
  if(typeof renderWfPushNudge==='function')renderWfPushNudge();
  const wf=document.getElementById('workout-finish'); wf.classList.add('on'); wf.style.zIndex='99999';
})()`); await sleep(500); await shot('03-cierre-entreno');
await ev(`document.getElementById('workout-finish').classList.remove('on')`);

// 3) PANEL DEL COACH — home con clientes fake (preview)
const coachOK = await ev(`(()=>{try{
  if(typeof DB==='undefined'||typeof showScreen!=='function')return false;
  const mk=(id,name,d)=>({id,name,goal:'Ganar músculo',level:'Intermedio',days:4,payments:[{date:'2026-06-15',dueDate:d,amount:120000}],routines:[{id:'r1',name:'Pierna',day:'Lunes',exercises:[{id:'e1',name:'Sentadilla',muscle:'Cuádriceps',type:'Compuesto',sets:4,reps:10}]}]});
  DB.clients=[mk('c1','Samuel Cifuentes','2026-08-01'),mk('c2','Andrés Martínez','2026-07-14'),mk('c3','Astrid Beltran','2026-06-30')];
  showScreen('s-coach'); if(typeof renderHome==='function')renderHome(); if(typeof showPanel==='function')showPanel('p-home');
  return true;
}catch(e){return 'err:'+e.message;}})()`);
if (coachOK === true) { await sleep(700); await theme('light'); await shot('04-coach-home-claro'); await theme('dark'); await shot('05-coach-home-oscuro'); await theme('light'); }
else console.log('  coach-home no capturado:', coachOK);

console.log('OUT:', OUT);
chrome.kill(); srv.kill(); process.exit(0);
