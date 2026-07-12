// Captura de PROGRESO/HISTORIAL del asesorado (#cn-history) para auditoría de diseño —
// sin login, 390px, claro+oscuro, página COMPLETA. ~6 sesiones fake en progresión.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8796, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9298', '--user-data-dir=' + process.env.TEMP + '/hist-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9298/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shotFull(n) {
  const h = await ev(`(()=>{
    const sc=document.querySelector('.cnbody'); if(sc){sc.style.overflow='visible';sc.style.height='auto';sc.style.flex='none';}
    const cl=document.getElementById('s-client'); if(cl){cl.style.height='auto';cl.style.maxHeight='none';cl.style.overflow='visible';}
    document.querySelectorAll('.cntabs').forEach(e=>{e.style.position='static';});
    return document.getElementById('s-client').scrollHeight;
  })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);

const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const c={id:'cH',name:'Samuel Cifuentes',email:'samuel@ejemplo.com',goal:'Ganar músculo',level:'Intermedio',days:4,weight:78,sex:'M',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:'2026-08-01',amount:120000}],routines:[{id:'r1',name:'Full Body A',day:'Lunes',exercises:[]}]};
  DB.clients=[c];
  const mkEx=(nm,mus,kg,reps)=>({id:nm,name:nm,muscle:mus,track:'peso_reps',sets:[{kg,reps,done:true},{kg,reps:reps-1,done:true},{kg:kg-5,reps,done:true}]});
  const mkS=(daysAgo,vol,done,tot,nm)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);d.setHours(18,30,0,0);
    return {id:'s'+daysAgo,sessionId:'sid'+daysAgo,routineId:'r1',routineName:nm,date:d.toISOString(),startedAt:d.toISOString(),
      totalVol:vol,doneSets:done,totalSets:tot,exercises:[mkEx('Sentadilla','Cuádriceps',100+daysAgo%3*5,8),mkEx('Press banca','Pecho',80,8),mkEx('Remo con barra','Espalda',70,10),mkEx('Peso muerto','Espalda',130,5)]};};
  DB.history={cH:[mkS(1,4850,12,12,'Full Body A'),mkS(4,4600,11,12,'Full Body B'),mkS(8,4300,12,12,'Full Body A'),mkS(11,4200,10,12,'Full Body B'),mkS(15,4100,12,12,'Full Body A'),mkS(19,3800,9,12,'Full Body B')]};
  DB.prs={cH:{Sentadilla:{name:'Sentadilla',kg:120,reps:5,date:'2026-07-08'},'Press banca':{name:'Press banca',kg:85,reps:5,date:'2026-07-01'}}};
  window.CUR=window.CUR||{}; CUR.clientId='cH'; CUR.role='client';
  showScreen('s-client');
  const el=(typeof _cnTabEl==='function')?_cnTabEl('cn-history'):null;
  cnTab('cn-history', el);
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`);
console.log('  setup:', setup);
await sleep(900);
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(500); await shotFull('history-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(500); await shotFull('history-oscuro');
console.log('OUT:', OUT);
chrome.kill(); srv.kill(); process.exit(0);
