// ─────────────────────────────────────────────────────────────────────────────
// _verify-cuentas-nuevas.mjs — LA TARJETA «CUENTAS NUEVAS» DEL INICIO (v732), sin login, 390 px
//
// Pedido del PO (8-nov): «hoy no me doy cuenta si llegan nuevos usuarios» (medido: 4 en 7 días sin
// aviso). Decisión: aviso al celular + tarjeta en Inicio hasta que abra a cada persona. Monta cuentas
// INVENTADAS que se registraron solas (hoy por Instagram, hace 3 días sin canal, hace 10 días, una ya
// vista) y AFIRMA: quién sale y en qué orden, el texto de cada fila, que va fuera del tope de avisos,
// que tocar abre la ficha y la saca, «Ya las vi», y que cabe con letra xl. Capturas claro + oscuro.
// (El aviso al celular no se prueba aquí: un harness jamás manda un push real — `cloudWriteSealed`.)
//   node scripts/e2e/_verify-cuentas-nuevas.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8808, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9308', '--user-data-dir=' + process.env.TEMP + '/cuentas-nuevas-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9308/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
const montar = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const hace=h=>new Date(Date.now()-h*3600e3).toISOString();
  const mkC=(id,name,extra)=>Object.assign({id,name,email:id+'@ejemplo.test',goal:'Bajar de peso',level:'Principiante',days:3,sex:'F',payments:[],routines:[{id:'r'+id,name:'Cuerpo completo',day:'Lunes',exercises:[]}]},extra||{});
  DB.clients=[
    mkC('_self','Coach de Prueba'),
    mkC('c1','Andrea Molina',{tier:'premium',payments:[{date:'2026-10-15',dueDate:'2026-12-15',amount:120000}]}),
    mkC('n1','Laura Pinto',{selfReg:true,tier:'libre',createdAt:hace(2),canal:{c:'ig-bio',at:hace(3)}}),
    mkC('n2','Mateo Gil',{selfReg:true,tier:'libre',createdAt:hace(72)}),
    mkC('n3','Sara Vélez',{selfReg:true,tier:'libre',createdAt:hace(240)}),
    mkC('n4','Karen Duarte',{selfReg:true,tier:'libre',createdAt:hace(30)}),
  ];
  DB.history={n1:[{id:'s1',sessionId:'s1',routineId:'rn1',routineName:'Cuerpo completo',date:hace(1),startedAt:hace(1),totalVol:900,doneSets:9,totalSets:12,exercises:[]}]};
  DB.msgs={};
  localStorage.setItem('avi_newseen',JSON.stringify({n4:new Date().toISOString()}));
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach'); if(typeof renderAll==='function')renderAll();
  gp('p-home',document.getElementById('sbi-home'),'Inicio'); renderHome();
  return true;
}catch(e){return 'err:'+e.message;}})()`;
const setup = await ev(montar);
ok(setup === true, 'CONTROL DE MONTAJE: Inicio con 4 cuentas que se registraron solas (1 vieja, 1 ya vista)', setup);
const tarjeta = `(()=>{const el=document.getElementById('h-new');if(!el)return {existe:false};
  const filas=[...el.querySelectorAll('[role="button"]')].map(f=>f.innerText.replace(/\\s+/g,' ').trim());
  const hoy=document.getElementById('h-today-banner');
  return {existe:true,disp:el.style.display,titulo:(el.querySelector('.card div div')||{}).innerText||'',filas,
    despuesDeHoy:!!(hoy&&hoy.nextElementSibling===el), alLado:hoy&&hoy.nextElementSibling?(hoy.nextElementSibling.id||hoy.nextElementSibling.tagName):null, padreHoy:hoy&&hoy.parentElement?hoy.parentElement.id:null, padreNew:el.parentElement?el.parentElement.id:null, hijos:[...document.getElementById('p-home').children].map(x=>x.id||x.className).slice(0,12)};})()`;
let t = await ev(tarjeta);
ok(t.existe && t.disp === 'block', 'la tarjeta «Cuentas nuevas» se ve en Inicio', t);
ok(/2 cuentas nuevas esta semana/.test(t.titulo), 'dice «2 cuentas nuevas esta semana» (ni la de hace 10 días ni la ya vista)', t);
ok(t.filas.length === 2 && /^Laura Pinto/.test(t.filas[0]) && /^Mateo Gil/.test(t.filas[1]), 'la más nueva arriba: Laura, después Mateo', t.filas);
ok(/hoy · Instagram \(enlace de la bio\) · 1 entreno/.test(t.filas[0] || ''), 'Laura: «hoy · Instagram (enlace de la bio) · 1 entreno»', t.filas[0]);
ok(/hace 3 días · sin entrenar todavía/.test(t.filas[1] || ''), 'Mateo: «hace 3 días · sin entrenar todavía» (sin canal inventado)', t.filas[1]);
ok(t.despuesDeHoy, 'va justo debajo de «quién entrenó hoy», fuera del tope de avisos', t);
// CON EL TOPE TRABAJANDO: alguien espera respuesta hace 30 h → «quién entrenó hoy» + «espera tu
// respuesta» llenan los 2 cupos. «Cuentas nuevas» NO puede quitarle el cupo a nadie ni quedar apartada.
const conTope = await ev(`(()=>{
  DB.msgs={c1:[{from:'client',text:'Coach, ¿cambio la rutina?',date:new Date(Date.now()-30*3600e3).toISOString()}]};
  renderHome();
  const vis=id=>{const e=document.getElementById(id);return !!(e&&e.style.display!=='none'&&!e.classList.contains('cap-off')&&e.innerHTML.trim());};
  const orden=[...document.getElementById('p-home').children].map(x=>x.id).filter(id=>['h-today-banner','h-new','h-await','h-more'].indexOf(id)>=0);
  return {hoy:vis('h-today-banner'),nuevas:vis('h-new'),espera:vis('h-await'),orden};
})()`);
ok(conTope.hoy && conTope.nuevas && conTope.espera && JSON.stringify(conTope.orden) === JSON.stringify(['h-today-banner', 'h-new', 'h-await', 'h-more']),
  'con el tope lleno (hoy + espera respuesta) las cuentas nuevas se ven, en su sitio y sin quitarle el cupo a nadie', conTope);
await ev(`(()=>{DB.msgs={}; renderHome();})()`);
// Tocar a Laura: abre su ficha y sale de la tarjeta
const abre = await ev(`(()=>{const f=document.querySelector('#h-new [role="button"]'); f.click();
  return {cid:CUR.clientId, detalle:document.getElementById('p-detail').classList.contains('on'), visto:!!JSON.parse(localStorage.getItem('avi_newseen')||'{}').n1};})()`);
ok(abre.cid === 'n1' && abre.detalle && abre.visto, 'tocar a Laura abre SU ficha y la marca como vista', abre);
await ev(`(()=>{gp('p-home',document.getElementById('sbi-home'),'Inicio'); renderHome();})()`);
t = await ev(tarjeta);
ok(t.filas.length === 1 && /^Mateo Gil/.test(t.filas[0]) && /1 cuenta nueva esta semana/.test(t.titulo), 'al volver a Inicio queda solo Mateo («1 cuenta nueva»)', t);
await ev(`newAccountsSeenAll()`);
t = await ev(tarjeta);
ok(t.disp === 'none', '«Ya las vi» esconde la tarjeta', t);
// Letra «Muy grande» a 390 px: el botón y las filas no se salen y miden ≥ 36 px
await ev(montar); await ev(`(()=>{document.documentElement.setAttribute('data-fs','xl'); renderHome();})()`); await sleep(300);
const mide = await ev(`(()=>{const vw=document.documentElement.clientWidth;const els=[...document.querySelectorAll('#h-new button, #h-new [role="button"]')].map(b=>{const x=b.getBoundingClientRect();return {r:Math.round(x.right),h:Math.round(x.height)};});return {vw,n:els.length,fuera:els.filter(x=>x.r>vw).length,bajas:els.filter(x=>x.h<36).length};})()`);
ok(mide.n === 3 && mide.fuera === 0 && mide.bajas === 0, 'con letra xl a 390 px el botón y las 2 filas caben y miden ≥ 36 px', mide);
await ev(`(()=>{document.documentElement.removeAttribute('data-fs'); renderHome(); document.getElementById('h-new').scrollIntoView();})()`);
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(500); await shotFull('cuentas-nuevas-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(500); await shotFull('cuentas-nuevas-oscuro');
console.log('OUT:', OUT);
console.log(fallos.length ? '\n❌ ' + fallos.length + ' fallo(s)' : '\nTODO OK');
chrome.kill(); srv.kill(); process.exit(fallos.length ? 1 : 0);
