// ─────────────────────────────────────────────────────────────────────────────
// _verify-lista-planes.mjs — LA LISTA DEL COACH POR PLAN (v731), sin login, 390 px, claro + oscuro
//
// Pedido del PO (8-nov): «necesito tener una lista personalizada de mis asesorados, quienes entrenan
// conmigo». Decisión: pestañas «Entrenan conmigo» (por defecto) · PRO · Libres · Todos, armadas con
// el plan. Monta 6 asesorados INVENTADOS (2 con coach —uno vencido—, 2 PRO, 2 libres, uno pide coach)
// + el coach («Yo»), y AFIRMA: qué filas muestra cada pestaña, las cifras, que el buscador recorre
// todas las pestañas, el punto del lead, el estado vacío y que nada se sale a 390 px con letra xl.
//   node scripts/e2e/_verify-lista-planes.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8807, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9307', '--user-data-dir=' + process.env.TEMP + '/lista-planes-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9307/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
const MAXH = parseInt(process.env.SHOT_MAXH || '0');
async function shotFull(n) {
  let h = await ev(`(()=>{
    const mn=document.querySelector('#s-coach .main'); if(mn){mn.style.overflow='visible';mn.style.height='auto';mn.style.flex='none';}
    const cs=document.getElementById('s-coach'); if(cs){cs.style.height='auto';cs.style.maxHeight='none';cs.style.overflow='visible';}
    document.querySelectorAll('.coach-topbar').forEach(e=>{e.style.position='static';});
    return document.getElementById('s-coach').scrollHeight;
  })()`);
  if (MAXH && h > MAXH) h = MAXH;
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
// Esperar el SÍMBOLO REAL post-boot, no solo el DOM: en una corrida lenta el setup arrancaba
// antes de que existiera `DB` y fallaba entero con «DB is not defined» — un rojo que no era del
// código sino del arranque. (Misma clase que el boot-check de prod de 2026-07-12.)
await waitFor(`typeof DB!=='undefined' && !!DB && typeof gp==='function'`, 45000);
await sleep(2500);

const fallos = []; const ok = (c, m, d) => { console.log((c ? '  ✅ ' : '  ❌ ') + m + (c ? '' : '  → ' + JSON.stringify(d))); if (!c) fallos.push(m); };
const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const mkC=(id,name,tier,extra)=>Object.assign({id,name,email:id+'@ejemplo.test',goal:'Ganar músculo',level:'Intermedio',days:3,sex:'F',
    payments:[{date:'2026-10-15',dueDate:'2026-12-15',amount:120000}],routines:[{id:'r'+id,name:'Pierna',day:'Lunes',exercises:[]}]},tier?{tier}:{},extra||{});
  DB.clients=[
    mkC('_self','Coach de Prueba',null),
    mkC('c1','Andrea Molina',null),
    mkC('c2','Julián Restrepo','premium',{payments:[{date:'2026-08-01',dueDate:'2026-09-01',amount:120000}]}),
    mkC('c3','Karen Duarte','app'),
    mkC('c4','Mateo Gil','app'),
    mkC('c5','Laura Pinto','libre',{selfReg:true}),
    mkC('c6','Sara Vélez','libre',{selfReg:true,wantsCoach:true,wantsCoachAt:new Date().toISOString()}),
  ];
  DB.history={}; DB.msgs={};
  window.CUR=window.CUR||{}; CUR.loggedAs='coach'; CUR.cliTab=null;
  showScreen('s-coach'); if(typeof renderAll==='function')renderAll();
  gp('p-clients',document.getElementById('sbi-clients'),'Asesorados'); renderClients();
  return true;
}catch(e){return 'err:'+e.message;}})()`);
ok(setup === true, 'CONTROL DE MONTAJE: panel de asesorados con 6 asesorados inventados + el coach', setup);
const estado = `(()=>{
  const vis=[...document.querySelectorAll('#cli-list .cli')].filter(e=>e.style.display!=='none').map(e=>(e.querySelector('.cn')||{}).textContent);
  const tabs={}; document.querySelectorAll('#cli-tabs .dt-tab').forEach(b=>{tabs[b.getAttribute('data-t')]={sel:b.getAttribute('aria-selected'),n:(b.querySelector('.cli-tab-n')||{}).textContent,dot:!!b.querySelector('.dt-dot')};});
  const emp=document.getElementById('cli-tab-empty');
  return {vis,tabs,vacio:emp?emp.textContent:null,lbl:document.getElementById('cli-lbl').textContent};
})()`;
const orden = a => JSON.stringify([...a].sort());
let e = await ev(estado);
ok(e.tabs.coach && e.tabs.coach.sel === 'true', 'abre en «Entrenan conmigo»', e.tabs);
ok(orden(e.vis) === orden(['Andrea Molina', 'Coach de Prueba', 'Julián Restrepo']),
  '«Entrenan conmigo» = los 2 con coach (el vencido también) + el coach', e.vis);
ok(e.tabs.coach.n === '2' && e.tabs.pro.n === '2' && e.tabs.libre.n === '2' && e.tabs.todos.n === '6', 'cifras 2 · 2 · 2 · 6 (el coach no suma)', e.tabs);
ok(e.tabs.libre.dot === true && e.tabs.pro.dot === false, 'punto en «Libres»: ahí está quien pide coach', e.tabs);
await ev(`cliTab('pro')`); e = await ev(estado);
ok(orden(e.vis) === orden(['Karen Duarte', 'Mateo Gil']), '«PRO» = los 2 de AVI PRO', e.vis);
await ev(`cliTab('libre')`); e = await ev(estado);
ok(orden(e.vis) === orden(['Laura Pinto', 'Sara Vélez']) && e.tabs.libre.dot === false, '«Libres» = los 2 libres, y sin punto cuando ya está abierta', e);
await ev(`cliTab('todos')`); e = await ev(estado);
ok(e.vis.length === 7, '«Todos» = las 7 filas', e.vis);
// Buscar a una persona libre desde «Entrenan conmigo»
await ev(`(()=>{cliTab('coach'); const s=document.getElementById('cli-search'); s.value='sara'; filterClients(s.value);})()`); e = await ev(estado);
ok(JSON.stringify(e.vis) === JSON.stringify(['Sara Vélez']) && /1 resultado de 6/.test(e.lbl), 'buscando «sara» desde «Entrenan conmigo» aparece la persona libre («1 resultado de 6»)', e);
await ev(`(()=>{const s=document.getElementById('cli-search'); s.value='zzz'; filterClients(s.value);})()`); e = await ev(estado);
ok(e.vis.length === 0 && /Nadie coincide con «zzz»/.test(e.vacio || ''), 'búsqueda sin resultados: lo dice', e);
// El poll de 15 s vuelve a pintar: la pestaña elegida se conserva
await ev(`(()=>{const s=document.getElementById('cli-search'); s.value=''; cliTab('pro'); renderClients();})()`); e = await ev(estado);
ok(e.tabs.pro.sel === 'true' && e.vis.length === 2, 'al repintar (poll) se queda en la pestaña elegida', e);
// Estado vacío de una pestaña
await ev(`(()=>{DB.clients=DB.clients.filter(c=>c.tier!=='app'); renderClients();})()`); e = await ev(estado);
ok(e.vis.length === 0 && /AVI PRO/.test(e.vacio || '') && e.tabs.pro.n === '0', 'pestaña PRO vacía: mensaje y cifra 0', e);
// Teclado: ← → recorren las pestañas
await ev(`(()=>{cliTab('coach'); cliTabKey({key:'ArrowRight',preventDefault(){}});})()`); e = await ev(estado);
ok(e.tabs.pro.sel === 'true', 'con teclado, → pasa a la siguiente pestaña', e.tabs);
// 390 px con letra «Muy grande»: ninguna pestaña se sale de la pantalla
await ev(`(()=>{cliTab('coach'); document.documentElement.setAttribute('data-fs','xl'); renderClients();})()`); await sleep(300);
const caben = await ev(`(()=>{const vw=document.documentElement.clientWidth;const r=[...document.querySelectorAll('#cli-tabs .dt-tab')].map(b=>{const x=b.getBoundingClientRect();return {l:Math.round(x.left),r:Math.round(x.right),h:Math.round(x.height)};});return {vw,r,fuera:r.filter(x=>x.r>vw||x.l<0).length,bajas:r.filter(x=>x.h<36).length};})()`);
ok(caben.fuera === 0 && caben.bajas === 0, 'a 390 px con letra xl las 4 pestañas caben y miden ≥ 36 px de alto', caben);
await ev(`(()=>{document.documentElement.removeAttribute('data-fs'); DB.clients.push({id:'c3',name:'Karen Duarte',tier:'app',email:'c3@ejemplo.test',level:'Intermedio',days:3,routines:[]}); renderClients();})()`);
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(500); await shotFull('lista-planes-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(500); await shotFull('lista-planes-oscuro');
console.log('OUT:', OUT);
console.log(fallos.length ? '\n❌ ' + fallos.length + ' fallo(s)' : '\nTODO OK');
chrome.kill(); srv.kill(); process.exit(fallos.length ? 1 : 0);
