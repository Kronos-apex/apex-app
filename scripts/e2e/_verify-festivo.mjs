// _verify-festivo.mjs — v515: qué ve el asesorado un día FESTIVO.
// Decisión del PO (2026-08-22): ese día se descansa y NO se le cuenta como entreno perdido.
// El harness NO puede esperar a que llegue un festivo: fija la fecha del navegador en uno REAL
// del calendario colombiano (lunes 17-ago-2026 = La Asunción) sobreescribiendo `Date`, y
// comprueba lo que la persona LEE. Sin login; la escritura a la nube está sellada en localhost.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8799, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9304', '--user-data-dir=' + process.env.TEMP + '/fest-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9304/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shot(n) {
  const h = await ev(`Math.max(document.body.scrollHeight, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && typeof nombreFestivoCO==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

// Fija la fecha del navegador en un festivo REAL: lunes 17-ago-2026, La Asunción.
// `Date.now()` y `new Date()` sin argumentos devuelven ese día; el resto de Date sigue igual.
const FIJAR = (iso, hora) => `(()=>{const F=new Date('${iso}T${hora}');const R=Date;
  const D=function(...a){return a.length?new R(...a):new R(F.getTime());};
  D.now=()=>F.getTime(); D.parse=R.parse; D.UTC=R.UTC; D.prototype=R.prototype;
  window.Date=D; return new Date().toString().slice(0,15);})()`;

const MONTAR = (nombreDia) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const client={id:'cf1',name:'Camilo',sex:'M',level:'Intermedio',goal:'Ganar músculo',days:5,
    routines:[{id:'rF',day:'${nombreDia}',name:'Pierna',restSec:90,
      exercises:[{id:'e1',name:'Sentadilla',muscle:'piernas',type:'Compuesto',sets:4,reps:'10'}]}],
    habits:{water:{},steps:{}}};
  DB.clients=[client];
  DB.history={cf1:[10,13,16,19].map(d=>{const iso=new Date(Date.now()-d*86400000).toISOString();
    return {id:'hf'+d,sessionId:'sf'+d,routineId:'rF',routineName:'Pierna',date:iso,finishedAt:iso,
            doneSets:4,totalSets:4,exercises:[]};})};
  DB.msgs=DB.msgs||{};
  CUR.clientId='cf1'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayWorking=null;
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

console.log('\n── FESTIVO: lunes 17-ago-2026 (La Asunción), con entreno programado ese día ──');
console.log('  fecha fijada:', await ev(FIJAR('2026-08-17', '09:00:00')));
console.log('  montaje:', await ev(MONTAR('Lunes')));
await sleep(600);

const txt = await ev(`(()=>{const b=document.getElementById('cn-today-body');return b?b.textContent.replace(/\\s+/g,' ').trim():''})()`);
console.log('  texto:', JSON.stringify(txt.slice(0, 220)));
check('F1 dice que hoy es festivo', /festivo/i.test(txt), txt.slice(0, 60));
check('F2 NOMBRA el festivo (La Asunción), no un «hoy es festivo» a secas', /Asunci/i.test(txt));
check('F3 le dice que NO cuenta como perdida', /no cuenta como perdida/i.test(txt));
check('F4 NO le ofrece el entreno de ese día', !/Sentadilla/i.test(txt), txt.slice(0, 60));
const missTxt = await ev(`(()=>{const c=document.querySelector('#cn-missday .card');return c?c.textContent:''})()`);
check('F5 tampoco le reclama el entreno del festivo como perdido', !/Pierna/.test(missTxt), JSON.stringify(missTxt.slice(0, 50)));
// Se scrollea hasta el banner ANTES de capturar: en «Hoy» el descanso va debajo de los avisos
// y una captura desde arriba no lo muestra — lo que no se ve, no se revisó.
await ev(`(()=>{const b=[...document.querySelectorAll('#cn-today .avi-restbnr')][0];if(b)b.scrollIntoView({block:'center'});return !!b;})()`);
await sleep(400);
await shot('festivo-claro');

// CONTROL obligatorio: el MISMO montaje un día NO festivo tiene que ofrecer el entreno.
// Sin esto, un banner que saliera SIEMPRE (o una pantalla vacía) dejaría F1-F5 en verde.
console.log('\n── CONTROL: martes 18-ago-2026, día normal, mismo montaje ──');
console.log('  fecha fijada:', await ev(FIJAR('2026-08-18', '09:00:00')));
console.log('  montaje:', await ev(MONTAR('Martes')));
await sleep(600);
const txt2 = await ev(`(()=>{const t=document.getElementById('cn-today');return t?t.textContent.replace(/\\s+/g,' ').trim():''})()`);
check('F6 CONTROL · un día normal SÍ le ofrece su entreno', /Sentadilla/i.test(txt2), txt2.slice(0, 70));
check('F7 CONTROL · y no le habla de ningún festivo', !/festivo/i.test(txt2));
await shot('festivo-control-dia-normal');

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));
console.log('\n──── RESULTADOS FESTIVO (v515) ────');
results.forEach(r => console.log('  ' + r));
const bad = results.filter(r => r.startsWith('❌')).length;
console.log('\njsErrors:', JSON.stringify(jsErrors));
console.log(bad ? `\n❌ ${bad} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
chrome.kill(); srv.kill();
process.exit(bad ? 1 : 0);
