// Captura de RUTINAS del asesorado (#cn-routines) para auditoría de diseño —
// sin login, 390px, claro+oscuro, página COMPLETA. 4 rutinas fake con ejercicios (fotos).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8797, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9299', '--user-data-dir=' + process.env.TEMP + '/rut-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9299/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  const D=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()];
  const mkEx=(nm,mus,ty)=>({id:nm,name:nm,muscle:mus,type:ty,track:'peso_reps',sets:3,reps:'10'});
  const c={id:'cH',name:'Samuel Cifuentes',email:'samuel@ejemplo.com',goal:'Ganar músculo',level:'Intermedio',days:4,weight:78,sex:'M',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:'2026-08-01',amount:120000}],
    routines:[
      {id:'r1',name:'Empuje — Pecho y Hombro',day:D,note:'Calienta bien el manguito antes de press.',exercises:[mkEx('Press banca','Pecho','Compuesto'),mkEx('Press militar','Hombro','Compuesto'),mkEx('Aperturas','Pecho','Aislamiento'),mkEx('Fondos','Tríceps','Compuesto')]},
      {id:'r2',name:'Tracción — Espalda y Bíceps',day:'Martes',exercises:[mkEx('Dominadas','Espalda','Compuesto'),mkEx('Remo con barra','Espalda','Compuesto'),mkEx('Curl con barra','Bíceps','Aislamiento')]},
      {id:'r3',name:'Pierna completa',day:'Jueves',exercises:[mkEx('Sentadilla','Cuádriceps','Compuesto'),mkEx('Peso muerto rumano','Isquios','Compuesto'),mkEx('Prensa','Cuádriceps','Compuesto'),mkEx('Elevación de gemelos','Gemelos','Aislamiento')]},
      {id:'r4',name:'Descanso',day:'Libre',exercises:[]}
    ]};
  DB.clients=[c];
  window.CUR=window.CUR||{}; CUR.clientId='cH'; CUR.role='client';
  showScreen('s-client');
  const el=(typeof _cnTabEl==='function')?_cnTabEl('cn-routines'):null;
  cnTab('cn-routines', el);
  // abrir la primera tarjeta (la de hoy) para ver el cuerpo expandido
  const first=document.querySelector('#cn-all-rut .rc'); if(first)first.classList.add('open');
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`);
console.log('  setup:', setup);
await sleep(900);
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(500); await shotFull('rutinas-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(500); await shotFull('rutinas-oscuro');
console.log('OUT:', OUT);
chrome.kill(); srv.kill(); process.exit(0);
