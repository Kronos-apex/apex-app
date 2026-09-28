// _verify-barra-rir.mjs — LA BARRA (v681) EN LA PANTALLA DONDE SE ENTRENA.
//
// La suite vigila la regla (qué barra, de quién, atada a qué ejercicio) y el cableado. Esto prueba
// lo que la suite no puede: que la línea de la barra se PINTE donde toca y SOLO ahí, que sus opciones
// se toquen (≥36 px), se LEAN en los dos temas y quepan a 360 px, que elegir una barra quede en el
// entreno guardado SIN volver a celebrar, y que el 1RM que ve la persona lleve la barra.
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una asesorada
// INVENTADA que ya entrenó hip thrust con barra de 15 (el caso de Astrid).
//   node scripts/e2e/_verify-barra-rir.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8883, DBG = 9437;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-barra-rir';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/barrarir-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof gmBarLine==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const CID = 'qa-barra';

// Rutina: hip thrust (olímpica, su historial dice 15), sentadilla (olímpica, sin historial → 20),
// peso muerto hexagonal (25 en sus opciones) y curl en polea (NO lleva barra: control).
const MONTAR = (tema) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  document.body.classList.toggle('dark', ${tema === 'oscuro'});
  document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const cat=(id,sets,reps)=>Object.assign({},DB.exercises.find(e=>e.id===id),{sets,reps:String(reps)});
  const exs=[cat('e42',4,10),cat('e13',3,8),cat('e338',3,6),cat('e256',3,12)];
  const client={id:'${CID}',name:'Prueba Barra',sex:'F',level:'Intermedio',goal:'Recomposición',days:3,weight:75,height:163,age:33,
    createdAt:'2026-06-01T10:00:00.000Z',startDate:'2026-06-01',
    routines:[{id:'rb1',name:'Pierna',day:days[new Date().getDay()],restSec:90,reviewed:true,note:'',exercises:exs}],habits:{water:{},steps:{}}};
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  const hist=[
    {id:'hb1',sessionId:'sb1',routineId:'rb1',routineName:'Pierna',date:d(3),finishedAt:d(3),doneSets:4,totalSets:4,totalVol:4800,
     exercises:[{id:'e42',name:'Hip Thrust con Barra',bar:15,sets:Array.from({length:4},()=>({kg:'120',reps:'10',done:true}))}]},
    {id:'hb2',sessionId:'sb2',routineId:'rb1',routineName:'Pierna',date:d(10),finishedAt:d(10),doneSets:4,totalSets:4,totalVol:4600,
     exercises:[{id:'e42',name:'Hip Thrust con Barra',bar:20,sets:Array.from({length:4},()=>({kg:'115',reps:'10',done:true}))}]},
  ];
  DB.clients=[client]; DB.history={'${CID}':hist};
  DB.prs={'${CID}':{e42:{kg:120,reps:10,date:d(3),name:'Hip Thrust con Barra',muscle:'gluteo'},
                     e256:{kg:30,reps:10,date:d(3),name:DB.exercises.find(e=>e.id==='e256').name,muscle:'biceps'}}};
  DB.bodyweight={}; DB.nutrition={}; DB.medidas={}; DB.photos={};
  CUR.clientId='${CID}'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|^wshow_|^wuopen_|^barra_|^lastre_|^ax_news_seen|^coachmute_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  if(typeof GM==='object'&&GM) GM.barOpen=null;
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  if(typeof expandTodayWorkout==='function')expandTodayWorkout();
  return {ok:true};
}catch(e){return {ok:false,err:e.message+' | '+((e.stack||'').split('\\n')[1]||'')};}})()`;

const MEDIR = `(()=>{
  const efectivo=el=>{ for(let n=el;n;n=n.parentElement){ const b=getComputedStyle(n).backgroundColor; if(b&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(b)) return b; } return 'rgb(255, 255, 255)'; };
  const rgb=s=>(s.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
  const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
  const ratio=el=>{const x=lum(rgb(getComputedStyle(el).color)),y=lum(rgb(efectivo(el)));return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);};
  const ex=ei=>{ const c=document.getElementById('gm-ex-'+ei); if(!c) return null;
    const btn=c.querySelector('.gm-bar-btn'); const opts=[...c.querySelectorAll('.gm-bar-opt')];
    const lab=c.querySelector('#gm-set-'+ei+'-0 .gm-sinput[data-field="kg"] + .gm-sinput-label, #gm-set-'+ei+'-0 [data-field="kg"]');
    const kgLab=(()=>{const inp=c.querySelector('#gm-set-'+ei+'-0 .gm-sinput[data-field="kg"]'); return inp&&inp.parentElement.querySelector('.gm-sinput-label'); })();
    const r=btn&&btn.getBoundingClientRect();
    return { linea: btn?btn.innerText.replace(/\\s+/g,' ').trim():null, lineaAlto: r?Math.round(r.height):0, lineaDer: r?Math.round(r.right):0,
      lineaRatio: btn?Math.min(ratio(btn.querySelector('span')), ratio(btn.querySelector('.gm-bar-edit'))):0,
      opciones: opts.map(o=>({t:o.innerText.trim(), on:o.getAttribute('aria-pressed')==='true', alto:Math.round(o.getBoundingClientRect().height),
        der:Math.round(o.getBoundingClientRect().right), ratio:ratio(o)})),
      casilla: kgLab?kgLab.textContent.trim():null };
  };
  return { ancho: innerWidth, e0: ex(0), e1: ex(1), e2: ex(2), e3: ex(3), guiado: !!document.getElementById('gm-ex-0') };
})()`;

for (const tema of ['claro', 'oscuro']) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  const m = await ev(MONTAR(tema));
  check(`${tema}: CONTROL · se montó la asesorada`, m && m.ok, JSON.stringify(m));
  if (!m || !m.ok) break;
  await sleep(1400);
  // «¿Cómo te sientes?» primero, como lo hace la persona.
  await ev(`(()=>{ const b=[...document.querySelectorAll('.mood-btn')][0]; if(b)b.click(); return 1; })()`); await sleep(1400);
  let r = await ev(MEDIR);
  check(`${tema}: CONTROL · el guiado pinta los 4 ejercicios`, r.guiado && r.e0 && r.e1 && r.e2 && r.e3, JSON.stringify({ g: r.guiado }));
  if (!r.e0) break;
  check(`${tema}: hip thrust dice la barra de SU historial (15), no la del catálogo`, /Barra de 15 kg/.test(r.e0.linea || ''), r.e0.linea);
  check(`${tema}: sentadilla sin historial → la del catálogo (20)`, /Barra de 20 kg/.test(r.e1.linea || ''), r.e1.linea);
  check(`${tema}: CONTROL · el curl en polea NO lleva línea de barra`, r.e3.linea === null, String(r.e3.linea));
  check(`${tema}: con barra la casilla dice DISCOS`, r.e0.casilla === 'DISCOS' && r.e1.casilla === 'DISCOS', r.e0.casilla + '/' + r.e1.casilla);
  check(`${tema}: CONTROL · sin barra la casilla sigue diciendo KG`, r.e3.casilla === 'KG', String(r.e3.casilla));
  check(`${tema}: la línea se toca (≥36 px) y cabe a 360`, r.e0.lineaAlto >= 36 && r.e0.lineaDer <= r.ancho, `${r.e0.lineaAlto}px · der ${r.e0.lineaDer}`);
  check(`${tema}: la línea se lee (≥4,5:1)`, r.e0.lineaRatio >= 4.5, String(r.e0.lineaRatio));

  // Abrir las opciones del hip thrust.
  await ev(`(()=>{ document.querySelector('#gm-ex-0 .gm-bar-btn').click(); return 1; })()`); await sleep(500);
  r = await ev(MEDIR);
  const op = r.e0.opciones;
  check(`${tema}: las opciones son 20 · 15 · 10 · Sin barra`, op.map(o => o.t).join('|') === '20 kg|15 kg|10 kg|Sin barra', op.map(o => o.t).join('|'));
  check(`${tema}: marcada la que usa (15)`, op.filter(o => o.on).map(o => o.t).join() === '15 kg', op.filter(o => o.on).map(o => o.t).join());
  check(`${tema}: cada opción se toca (≥36 px) y cabe a 360`, op.every(o => o.alto >= 36 && o.der <= r.ancho), op.map(o => o.alto + '/' + o.der).join(','));
  check(`${tema}: las opciones se leen (≥4,5:1)`, op.every(o => o.ratio >= 4.5), op.map(o => o.ratio).join(','));
  // La captura va CON el elemento en vista (R2.6): una foto de la cabecera no prueba nada.
  const enVista = await ev(`(()=>{ const st=document.getElementById('qa-sin-instalar')||document.createElement('style'); st.id='qa-sin-instalar';
    st.textContent='#install-banner,#install-pill,.install-pill,#ios-install,.toast{display:none!important}'; document.head.appendChild(st);
    const e=document.querySelector('#gm-ex-0 .gm-bar'); if(!e) return false; e.scrollIntoView({block:'center'});
    const r=e.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight; })()`);
  await sleep(500);
  check(`${tema}: CONTROL · la captura tiene la barra en vista`, enVista === true, String(enVista));
  await send('Page.captureScreenshot', { format: 'png' }).then(s => writeFileSync(`${OUT}/barra-opciones-${tema}.png`, Buffer.from(s.data, 'base64')));
  // La hexagonal ofrece su 25.
  await ev(`(()=>{ document.querySelector('#gm-ex-2 .gm-bar-btn').click(); return 1; })()`); await sleep(400);
  r = await ev(MEDIR);
  check(`${tema}: la hexagonal ofrece 25 y lo marca`, r.e2.opciones.length && r.e2.opciones[0].t === '25 kg' && r.e2.opciones[0].on, r.e2.opciones.map(o => o.t + (o.on ? '*' : '')).join('|'));
  check(`${tema}: abrir otra cierra la primera (una a la vez)`, r.e0.opciones.length === 0, String(r.e0.opciones.length));

  // Marcar una serie del hip thrust y elegir otra barra: el entreno guardado la lleva, sin celebrar.
  const tras = await ev(`(()=>{
    const row=document.getElementById('gm-set-0-0'); const kg=row.querySelector('[data-field="kg"]'), reps=row.querySelector('[data-field="reps"]');
    kg.value='120'; reps.value='10'; document.getElementById('gm-chk-0-0').click();
    if(typeof gmSkipRest==='function') gmSkipRest();
    const h=(DB.history['${CID}']||[]).find(s=>s.routineId==='rb1'&&!/^hb/.test(s.id));
    const x=h&&h.exercises.find(e=>e.id==='e42');
    return {bar:x&&x.bar, kg:x&&x.sets[0].kg, done:x&&x.sets[0].done};
  })()`);
  check(`${tema}: la serie se guarda en DISCOS y con su barra (15)`, tras && tras.bar === 15 && tras.kg === '120' && tras.done === true, JSON.stringify(tras));
  await ev(`(()=>{ document.querySelector('#gm-ex-0 .gm-bar-btn').click(); return 1; })()`); await sleep(300);
  await ev(`(()=>{ const b=[...document.querySelectorAll('#gm-ex-0 .gm-bar-opt')].find(o=>o.innerText.trim()==='20 kg'); b.click(); return 1; })()`); await sleep(500);
  const cambio = await ev(`(()=>{
    const h=(DB.history['${CID}']||[]).find(s=>s.routineId==='rb1'&&!/^hb/.test(s.id));
    const x=h&&h.exercises.find(e=>e.id==='e42');
    const wf=document.getElementById('workout-finish');
    const linea=document.querySelector('#gm-ex-0 .gm-bar-btn');
    return {bar:x&&x.bar, clave:localStorage.getItem('barra_rb1_0'), celebra:!!(wf&&wf.classList.contains('on')),
      linea:linea&&linea.innerText.replace(/\\s+/g,' ').trim(), abiertas:document.querySelectorAll('#gm-ex-0 .gm-bar-opt').length};
  })()`);
  check(`${tema}: elegir 20 queda en el entreno guardado y en la clave del día`, cambio.bar === 20 && cambio.clave === 'e42|20', JSON.stringify(cambio));
  check(`${tema}: elegir NO vuelve a celebrar el cierre`, cambio.celebra === false, JSON.stringify(cambio));
  check(`${tema}: tras elegir se cierra y la línea dice la nueva`, cambio.abiertas === 0 && /Barra de 20 kg/.test(cambio.linea || ''), JSON.stringify(cambio));

  // El 1RM que ve la persona lleva la barra: 120 × 10 con la de 20 → (140)·(1+10/30) ≈ 187.
  const pr = await ev(`(()=>({ ht:_prRowHtml(DB.prs['${CID}'].e42,'${CID}','e42'), polea:_prRowHtml(DB.prs['${CID}'].e256,'${CID}','e256') }))()`);
  check(`${tema}: el 1RM del récord suma la barra (≈ 187 con barra)`, /≈ 187 kg · 1RM est\. con barra/.test(pr.ht), (pr.ht.match(/≈[^<]*/) || [''])[0]);
  check(`${tema}: CONTROL · sin barra el 1RM no cambia ni dice «con barra»`, /≈ 40 kg · 1RM est\.</.test(pr.polea), (pr.polea.match(/≈[^<]*/) || [''])[0]);
}
check('cero errores de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

console.log(results.join('\n'));
console.log('capturas en ' + OUT);
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} barra y reps en reserva: ${results.length - malos}/${results.length}`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(malos ? 1 : 0);
