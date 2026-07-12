// Captura del PERFIL del asesorado (#cn-profile) para auditoría de diseño — sin login,
// 390px, claro+oscuro, página COMPLETA. Datos fake realistas (perfil moderadamente lleno).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8795, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9297', '--user-data-dir=' + process.env.TEMP + '/prof-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9297/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shotFull(n) {
  // Expandir el scroller interno (.cnbody flex:1 overflow-y:auto) y linealizar s-client
  // para que TODO el perfil quede en el flujo; desanclar el bottom-nav para que no tape.
  const h = await ev(`(()=>{
    const sc=document.querySelector('.cnbody'); if(sc){sc.style.overflow='visible';sc.style.height='auto';sc.style.flex='none';}
    const cl=document.getElementById('s-client'); if(cl){cl.style.height='auto';cl.style.maxHeight='none';cl.style.overflow='visible';}
    document.querySelectorAll('.cntabs,.cntab-bar,[class*=cntabs]').forEach(e=>{e.style.position='static';});
    return document.getElementById('s-client').scrollHeight;
  })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
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
  const c={id:'cP',name:'Samuel Cifuentes',email:'samuel.cifuentes@ejemplo.com',goal:'Ganar músculo',level:'Intermedio',days:4,weight:78,height:176,sex:'M',age:29,
    notes:'Cuida la zona lumbar en peso muerto; progresa despacio y avísame si hay molestia.',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:'2026-08-01',amount:120000,note:'Mensualidad julio'}],
    routines:[{id:'r1',name:'Full Body A',day:'Lunes',exercises:[{id:'e1',name:'Sentadilla',muscle:'Cuádriceps',type:'Compuesto',sets:4,reps:10}]}]};
  DB.clients=[c];
  DB.bodyweight={cP:[{date:'2026-07-10',kg:78.2},{date:'2026-07-03',kg:78.6},{date:'2026-06-26',kg:79.1},{date:'2026-06-19',kg:79.5},{date:'2026-06-12',kg:80.0}]};
  DB.prs={cP:{e1:{name:'Sentadilla',kg:120,reps:5,date:'2026-07-08'},e2:{name:'Press banca',kg:85,reps:5,date:'2026-07-01'},e3:{name:'Peso muerto',kg:140,reps:3,date:'2026-06-20'}}};
  window.CUR=window.CUR||{}; CUR.clientId='cP'; CUR.role='client';
  showScreen('s-client');
  const el=(typeof _cnTabEl==='function')?_cnTabEl('cn-profile'):null;
  cnTab('cn-profile', el);
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`);
console.log('  setup:', setup);
await sleep(900);
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(500); await shotFull('profile-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(500); await shotFull('profile-oscuro');
console.log('OUT:', OUT);
chrome.kill(); srv.kill(); process.exit(0);
