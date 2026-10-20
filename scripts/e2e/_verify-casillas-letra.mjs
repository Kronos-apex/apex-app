// _verify-casillas-letra.mjs — LAS CASILLAS DE LA SERIE CON LETRA GRANDE (v715).
//
// El zoom de «Grande» (1,18) y «Muy grande» (1,40) agranda también los rellenos fijos de la fila de la serie
// (círculo, chulo, huecos, márgenes de la tarjeta) y a 360 px al peso le quedaban 11 px útiles: «120» se veía
// «12». Esto mide, en el guiado real, que NINGUNA casilla corte su número en 360 y 390 px con los tres tamaños,
// que la fila quepa en la pantalla y que el chulo se siga tocando. El CONTROL de discriminación vuelve a poner
// el CSS de antes y exige que la sonda SÍ vea el corte (si no lo ve, la sonda no sirve).
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una asesorada INVENTADA.
//   node scripts/e2e/_verify-casillas-letra.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8887, DBG = 9441;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-casillas-letra';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/casillas-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
const pantalla = w => send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
await pantalla(360);
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof gmRender==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const CID = 'qa-casillas';

// Hip thrust con barra de 15 (con el total debajo, v714) y su calentamiento a la vista · curl en polea (KG) ·
// plancha (SEG + crono): las tres formas de la fila que pinta `gmSetCellsHTML`, más la fila auxiliar.
const MONTAR = tema => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  document.body.classList.toggle('dark', ${tema === 'oscuro'});
  document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const cat=(id,sets,reps)=>Object.assign({},DB.exercises.find(e=>e.id===id),{sets,reps:String(reps)});
  const client={id:'${CID}',name:'Prueba Casillas',sex:'F',level:'Intermedio',goal:'Recomposición',days:3,weight:65,height:160,age:30,
    createdAt:'2026-06-01T10:00:00.000Z',startDate:'2026-06-01',
    routines:[{id:'rc1',name:'Pierna',day:days[new Date().getDay()],restSec:90,reviewed:true,note:'',exercises:[cat('e42',3,12),cat('e256',3,15),cat('e17',2,30)]}],habits:{water:{},steps:{}}};
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  DB.clients=[client];
  DB.history={'${CID}':[{id:'hc1',sessionId:'sc1',routineId:'rc1',routineName:'Pierna',date:d(3),finishedAt:d(3),doneSets:3,totalSets:3,totalVol:3600,
    exercises:[{id:'e42',name:'Hip Thrust con Barra',bar:15,sets:Array.from({length:3},()=>({kg:'100',reps:'12',done:true}))}]}]};
  DB.prs={}; DB.bodyweight={}; DB.nutrition={}; DB.medidas={}; DB.photos={};
  CUR.clientId='${CID}'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|^wshow_|^barra_|^lastre_/.test(k)).forEach(k=>localStorage.removeItem(k));
  localStorage.setItem('wshow_rc1_0','1');
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  if(typeof expandTodayWorkout==='function')expandTodayWorkout();
  return {ok:true};
}catch(e){return {ok:false,err:e.message};}})()`;

// Los números más anchos que se anotan de verdad: «102.5» (5 caracteres), la sugerencia «~120» y dos cifras de reps.
const LLENAR = `(()=>{
  const faltan=[];
  const pon=(ei,si,f,v,ph)=>{ const i=document.querySelector('#gm-set-'+ei+'-'+si+' [data-field="'+f+'"]'); if(!i){ faltan.push(ei+'-'+si+'-'+f); return; } i.value=v; if(ph!=null) i.placeholder=ph; };
  pon(0,0,'kg','102.5'); pon(0,0,'reps','12'); pon(0,1,'kg','120'); pon(0,1,'reps','12'); pon(0,2,'kg','','~120');
  pon(1,0,'kg','22.5'); pon(1,0,'reps','15');
  pon(2,0,'secs','60');
  const w=document.querySelector('#gm-ex-0 .gm-set-row.gm-warm [data-field="kg"]'); if(w) w.value='60'; else faltan.push('calentamiento');
  if(typeof gmBarTotal==='function') document.querySelectorAll('#gm-ex-0 [data-field="kg"][data-bar]').forEach(gmBarTotal);
  return faltan.length?faltan.join(','):10; })()`;

// Texto útil de cada casilla (ancho del contenido, en el espacio de la propia casilla) contra lo que mide su
// número con SU letra; fila dentro de la pantalla; chulo y casilla tocables en pantalla (≥36 px).
const MEDIR = `(()=>{
  const cv=document.createElement('canvas').getContext('2d');
  const casillas=[...document.querySelectorAll('#gm-body .gm-set-row .gm-sinput')].filter(i=>i.offsetParent).map(i=>{
    const cs=getComputedStyle(i); cv.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    const txt=i.value||i.placeholder||''; const tw=cv.measureText(txt).width;
    const util=i.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    return {txt, tw:+tw.toFixed(1), util:+util.toFixed(1), alto:Math.round(i.getBoundingClientRect().height)}; });
  const filas=[...document.querySelectorAll('#gm-body .gm-set-row')].filter(r=>r.offsetParent).map(r=>{ const b=r.getBoundingClientRect();
    const tops=[...r.querySelectorAll('.gm-sinput')].map(i=>i.getBoundingClientRect().top);
    return {izq:Math.round(b.left), der:Math.round(b.right), desnivel:tops.length>1?Math.round(Math.max(...tops)-Math.min(...tops)):0}; });
  const chulos=[...document.querySelectorAll('#gm-body .gm-set-row .gm-check')].filter(c=>c.offsetParent).map(c=>Math.round(Math.min(c.getBoundingClientRect().width,c.getBoundingClientRect().height)));
  return { ancho:innerWidth, fs:document.documentElement.getAttribute('data-fs')||'normal', casillas, filas, chulos,
    cortan:casillas.filter(c=>c.tw>c.util+0.5).map(c=>c.txt+' '+c.tw+'/'+c.util) };
})()`;
const TAMANO = fs => `(()=>{ ${fs ? `document.documentElement.setAttribute('data-fs','${fs}')` : `document.documentElement.removeAttribute('data-fs')`}; return 1; })()`;
const REPINTAR = `(()=>{ gmRender(); return 1; })()`;

for (const tema of ['claro', 'oscuro']) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  await ev(TAMANO('')); await pantalla(360);
  const m = await ev(MONTAR(tema));
  check(`${tema}: CONTROL · se montó la asesorada`, m && m.ok, JSON.stringify(m));
  if (!m || !m.ok) break;
  await sleep(1400);
  await ev(`(()=>{ const b=[...document.querySelectorAll('.mood-btn')][0]; if(b)b.click(); return 1; })()`); await sleep(1400);
  await ev(`(()=>{ const st=document.createElement('style'); st.textContent='#install-banner,#install-pill,.install-pill,#ios-install,.toast{display:none!important}'; document.head.appendChild(st); return 1; })()`);
  for (const w of [360, 390]) for (const fs of ['', 'lg', 'xl']) {
    // El tamaño se pone, se repinta y se mide en OTRO paso: medir en el acto mide la talla anterior (gotcha de v680).
    await pantalla(w); await ev(TAMANO(fs)); await sleep(250); await ev(REPINTAR); await sleep(250);
    const n = await ev(LLENAR); await sleep(250);
    const r = await ev(MEDIR);
    const et = `${tema} ${w} px · ${r.fs}`;
    check(`${et}: CONTROL · la sonda midió las 10 casillas llenas y la letra es la pedida`, n === 10 && r.casillas.length >= 10 && r.fs === (fs || 'normal'), `${n} llenas · ${r.casillas.length} medidas · ${r.fs}`);
    check(`${et}: ninguna casilla corta su número`, r.cortan.length === 0, r.cortan.join(' | ') || 'mínimo útil ' + Math.min(...r.casillas.map(c => c.util)));
    check(`${et}: las filas caben en la pantalla`, r.filas.every(f => f.izq >= 0 && f.der <= r.ancho), JSON.stringify(r.filas.slice(0, 2)));
    check(`${et}: las casillas de cada fila arrancan a la misma altura (calentamiento y total incluidos)`, r.filas.every(f => f.desnivel <= 1), r.filas.map(f => f.desnivel).join(','));
    check(`${et}: chulo y casillas se tocan (≥36 px en pantalla)`, r.chulos.length > 0 && Math.min(...r.chulos) >= 36 && Math.min(...r.casillas.map(c => c.alto)) >= 36,
      `chulo ${Math.min(...r.chulos)} · casilla ${Math.min(...r.casillas.map(c => c.alto))}`);
    if (w === 360 && fs === 'xl') {
      const vista = await ev(`(()=>{ const e=document.getElementById('gm-set-0-0'); e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return b.top>=0&&b.bottom<=innerHeight; })()`);
      await sleep(300);
      check(`${et}: CONTROL · la captura tiene las series en vista`, vista === true, String(vista));
      await send('Page.captureScreenshot', { format: 'png' }).then(s => writeFileSync(`${OUT}/casillas-xl-360-${tema}.png`, Buffer.from(s.data, 'base64')));
    }
  }
  // CONTROL DE DISCRIMINACIÓN: con el CSS de antes de v715 la sonda TIENE que ver el corte a 360 · Muy grande.
  await pantalla(360); await ev(TAMANO('xl')); await sleep(250);
  await ev(`(()=>{ const st=document.createElement('style'); st.id='qa-css-viejo';
    st.textContent='.gm-sinput{padding:8px 10px!important;font-size:16px!important} .gm-set-row{grid-template-columns:32px 1fr 1fr auto!important;column-gap:8px!important;padding-left:12px!important;padding-right:12px!important} .gm-ex-card{padding-left:18px!important;padding-right:18px!important} .gm-set-row .gm-check{width:38px!important;height:38px!important} .gm-set-row>div:not(.gm-set-num):not(.gm-scell-top){align-self:auto!important}';
    document.head.appendChild(st); gmRender(); return 1; })()`); await sleep(300);
  await ev(LLENAR); await sleep(200);
  const viejo = await ev(MEDIR);
  await ev(`(()=>{ document.getElementById('qa-css-viejo').remove(); gmRender(); return 1; })()`); await sleep(200);
  check(`${tema}: CONTROL · con el CSS de antes la sonda SÍ ve el corte a 360 · Muy grande`, viejo.cortan.length >= 5, viejo.cortan.slice(0, 3).join(' | '));
  check(`${tema}: CONTROL · y SÍ ve el desnivel del calentamiento`, viejo.filas.some(f => f.desnivel > 1), viejo.filas.map(f => f.desnivel).join(','));
  await ev(TAMANO(''));
}
check('cero errores de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

console.log(results.join('\n'));
console.log('capturas en ' + OUT);
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} casillas con letra grande: ${results.length - malos}/${results.length}`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(malos ? 1 : 0);
