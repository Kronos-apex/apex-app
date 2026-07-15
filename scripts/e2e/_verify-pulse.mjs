// Verificación E2E de EL PULSO DEL COACH (#h-pulse, v353). Patrón _shot-coach: NO login real —
// se inyectan clientes fake y se fuerza s-coach (CUR.loggedAs='coach'). El pulso vive en el
// Inicio del coach y lista motivos POSITIVOS para escribirle a cada asesorado (récord/estancado/
// deload/racha), NUNCA inactividad (esa la cubre el banner de adherencia). Determinista (el poll
// de 15s re-renderiza). Cubre orden, ✕ (mute por fila), XSS en el nombre del ejercicio, y shots.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8783;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-pulse-' + Date.now();
const OUT = process.env.PULSE_OUT || (process.env.TEMP + '/avi-pulse');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9283', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9283/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };
async function shot(name) { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); } catch (e) { log('  (shot ' + name + ' falló: ' + e.message + ')'); } }
async function setTheme(t) { await ev(`typeof setTheme==='function' && setTheme('${t}')`); await sleep(200); }
const pulseRows = `(()=>{const el=document.getElementById('h-pulse');
  if(!el||getComputedStyle(el).display==='none')return {shown:false,rows:[]};
  const card=el.querySelector('.card'); if(!card)return {shown:false,rows:[]};
  const rows=[...card.children].slice(1).map(d=>{ // [0]=encabezado, resto=filas
    const tc=d.children[0]; const nm=tc&&tc.children[0], lb=tc&&tc.children[1];
    return {name:(nm?nm.textContent:'').trim(),label:(lb?lb.textContent:'').trim()};});
  return {shown:true,rows};})()`;

try {
  await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
  await sleep(2000);

  // Inyecta 4 asesorados, uno por señal, + fuerza el Inicio del coach (patrón _shot-coach).
  const setup = await ev(`(()=>{try{
    ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
    const mon=(()=>{const x=new Date();x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x.getTime();})();
    const wk=(weeks)=>{const out=[];for(let i=0;i<weeks;i++){[0,2].forEach(d=>out.push({date:new Date(mon-i*7*86400000+d*86400000).toISOString(),routineName:'R',exercises:[{name:'A',track:'reps',sets:[{done:true,reps:'15'}]}]}));}return out;};
    const stall=()=>[62,62,61,60,62,62].map((kg,i)=>({date:new Date(Date.now()-i*86400000).toISOString(),exercises:[{name:'Press',muscle:'pecho',track:'peso_reps',sets:[{done:true,kg:String(kg),reps:'8'}]}]}));
    const mkC=(id,name)=>({id,name,days:2,tier:'premium',goal:'Ganar músculo',payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:120000}]});
    DB.clients=[mkC('r','Ana Récord'),mkC('s','Beto Estancado'),mkC('d','Cira Deload'),mkC('k','Dan Racha')];
    DB.history={s:stall(),d:wk(4),k:wk(3)};
    DB.prs={r:{x:{val:100,unit:'kg',name:'Sentadilla',date:new Date(Date.now()-3600000).toISOString()}}};
    // limpiar cualquier mute previo del pulso
    for(let i=localStorage.length-1;i>=0;i--){const kk=localStorage.key(i);if(kk&&kk.indexOf('coachpulse_')===0)localStorage.removeItem(kk);}
    window.CUR=window.CUR||{}; CUR.loggedAs='coach';
    showScreen('s-coach');
    gp('p-home',document.getElementById('sbi-home'),'Inicio');
    if(typeof renderHome==='function')renderHome();
    return true;
  }catch(e){return 'err:'+e.message+' | '+e.stack;}})()`);
  if (setup !== true) throw new Error('setup falló: ' + setup);
  await sleep(600);

  // P1: el pulso aparece con las 4 filas en orden record > estancado > deload > racha.
  let s = JSON.parse(await ev(`JSON.stringify(${pulseRows})`));
  await shot('P1-pulse-orden');
  const names = s.rows.map(r => r.name);
  check('P1 pulso visible con orden record>estancado>deload>racha', s.shown && names.join('|') === 'Ana Récord|Beto Estancado|Cira Deload|Dan Racha', JSON.stringify(names));
  check('P1b label del récord lleva el nombre del ejercicio', /Sentadilla/.test((s.rows[0] || {}).label || ''), (s.rows[0] || {}).label);

  // P2: ✕ en la fila del récord la silencia → re-render la excluye, quedan 3 en orden.
  await ev(`dismissPulse('r','record')`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify(${pulseRows})`));
  check('P2 ✕ silencia la fila (record fuera) → quedan Beto/Cira/Dan', s.rows.map(r => r.name).join('|') === 'Beto Estancado|Cira Deload|Dan Racha', JSON.stringify(s.rows.map(r => r.name)));

  // P3: determinismo — renderHome dos veces seguidas da el MISMO orden (candado del poll 15s).
  const o1 = await ev(`(renderHome(),JSON.stringify(${pulseRows}))`);
  const o2 = await ev(`(renderHome(),JSON.stringify(${pulseRows}))`);
  check('P3 determinista: dos renders seguidos → mismo DOM', o1 === o2, 'iguales=' + (o1 === o2));

  // P4: XSS — nombre de ejercicio con payload en el label NO ejecuta (esc).
  await ev(`window.__XSS=undefined;(()=>{
    DB.prs={z:{x:{val:80,unit:'kg',name:'<img src=x onerror=window.__XSS=1>',date:new Date(Date.now()-3600000).toISOString()}}};
    DB.history={}; DB.clients=[{id:'z',name:'Payload',days:2,tier:'premium',payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:1}]}];
    for(let i=localStorage.length-1;i>=0;i--){const kk=localStorage.key(i);if(kk&&kk.indexOf('coachpulse_')===0)localStorage.removeItem(kk);}
    renderHome();})()`);
  await sleep(400);
  const xss = await ev(`window.__XSS`);
  s = JSON.parse(await ev(`JSON.stringify(${pulseRows})`));
  check('P4 XSS en el nombre del ejercicio NO ejecuta (esc en el label)', !xss && s.shown, 'XSS=' + xss);

  // P5: sin señales → la tarjeta se oculta (sin tarjeta vacía).
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    DB.prs={};DB.history={};DB.clients=[{id:'q',name:'Quieto',days:2,tier:'premium',payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:1}]}];
    renderHome();
    const el=document.getElementById('h-pulse');
    return {display:el?getComputedStyle(el).display:'?',html:el?el.innerHTML.length:0};})())`));
  check('P5 sin señales → #h-pulse oculto', s.display === 'none', JSON.stringify(s));

  // ── Shots ambos temas con las 4 señales ──
  await ev(`(()=>{
    const mon=(()=>{const x=new Date();x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x.getTime();})();
    const wk=(weeks)=>{const out=[];for(let i=0;i<weeks;i++){[0,2].forEach(d=>out.push({date:new Date(mon-i*7*86400000+d*86400000).toISOString(),routineName:'R',exercises:[{name:'A',track:'reps',sets:[{done:true,reps:'15'}]}]}));}return out;};
    const stall=()=>[62,62,61,60,62,62].map((kg,i)=>({date:new Date(Date.now()-i*86400000).toISOString(),exercises:[{name:'Press',muscle:'pecho',track:'peso_reps',sets:[{done:true,kg:String(kg),reps:'8'}]}]}));
    const mkC=(id,name)=>({id,name,days:2,tier:'premium',goal:'Ganar músculo',payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:120000}]});
    DB.clients=[mkC('r','Ana Récord'),mkC('s','Beto Estancado'),mkC('d','Cira Deload'),mkC('k','Dan Racha')];
    DB.history={s:stall(),d:wk(4),k:wk(3)};
    DB.prs={r:{x:{val:100,unit:'kg',name:'Sentadilla',date:new Date(Date.now()-3600000).toISOString()}}};
    for(let i=localStorage.length-1;i>=0;i--){const kk=localStorage.key(i);if(kk&&kk.indexOf('coachpulse_')===0)localStorage.removeItem(kk);}
    document.getElementById('s-coach').scrollTop=0; renderHome();
    const el=document.getElementById('h-pulse'); if(el)el.scrollIntoView();})()`);
  await sleep(400);
  await setTheme('light'); await shot('pulse-light');
  await setTheme('dark'); await shot('pulse-dark');

  log('\njsErrors: ' + JSON.stringify(jsErrors));
  log('shots en: ' + OUT);
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
