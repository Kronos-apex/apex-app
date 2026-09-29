// _verify-salto.mjs — EL AVISO DE SALTO (v689) EN LA PANTALLA DONDE SE ENTRENA.
//
// La suite vigila la regla (umbrales, qué pregunta según el implemento, la clave del día) y el cableado.
// Esto prueba lo que la suite no puede: que la nota salga DONDE toca y SOLO ahí (al teclear una subida,
// y en el descanso al cerrar el ejercicio con una bajada), que se LEA en los dos temas, se toque y quepa
// a 360 px, que «sí» llegue al entreno guardado como `corte`, que «Lo corrijo» lleve al campo del peso,
// y que se calle donde debe: rampas, implementos sin pregunta, progresos normales, la confirmación de v417.
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una asesorada INVENTADA.
//   node scripts/e2e/_verify-salto.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8885, DBG = 9447;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-salto';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/salto-' + Date.now(), '--no-first-run',
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
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof gmSaltoAlAnotar==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const CID = 'qa-salto';

// La sonda de contraste que COMPONE fondos translúcidos, el alfa del texto y la opacidad de los ancestros (v682).
const CONTRASTE = `const col=s=>{const m=(s.match(/[\\d.]+/g)||[]).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1};};
  const efectivo=el=>{ const capas=[]; for(let n=el;n;n=n.parentElement){ const c=col(getComputedStyle(n).backgroundColor); if(c.a>0){capas.push(c); if(c.a>=1) break;} }
    let f={r:255,g:255,b:255}; for(let i=capas.length-1;i>=0;i--){ const c=capas[i]; f={r:c.r*c.a+f.r*(1-c.a),g:c.g*c.a+f.g*(1-c.a),b:c.b*c.a+f.b*(1-c.a)}; } return [f.r,f.g,f.b]; };
  const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
  const opac=el=>{ let o=1; for(let n=el;n;n=n.parentElement){ const v=parseFloat(getComputedStyle(n).opacity); if(!isNaN(v)) o*=v; } return o; };
  const ratio=el=>{const t=col(getComputedStyle(el).color);const f=efectivo(el);const ta=t.a*opac(el);
    const tc=[t.r*ta+f[0]*(1-ta),t.g*ta+f[1]*(1-ta),t.b*ta+f[2]*(1-ta)]; const x=lum(tc),y=lum(f);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);};`;

// Rutina: curl martillo (mancuernas, la vez pasada 25), prensa (máquina, 200), sentadilla con barra (40),
// sentadilla sumo (sin pregunta escrita: 20), extensión de cuádriceps (máquina, 50: progreso normal) y plancha.
const MONTAR = (tema) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  document.body.classList.toggle('dark', ${tema === 'oscuro'});
  document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const cat=(id,sets,reps)=>Object.assign({},DB.exercises.find(e=>e.id===id),{sets,reps:String(reps)});
  const exs=[cat('e10',3,10),cat('e36',3,10),cat('e13',3,8),cat('e61',3,10),cat('e37',3,12),cat('e17',2,30)];
  const client={id:'${CID}',name:'Prueba Salto',sex:'F',level:'Intermedio',goal:'Recomposición',days:3,weight:70,height:165,age:31,
    createdAt:'2026-06-01T10:00:00.000Z',startDate:'2026-06-01',
    routines:[{id:'rs1',name:'Full',day:days[new Date().getDay()],restSec:90,reviewed:true,note:'',exercises:exs}],habits:{water:{},steps:{}}};
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  const serie=kg=>Array.from({length:3},()=>({kg:String(kg),reps:'10',done:true}));
  const hist=[{id:'hs1',sessionId:'ss1',routineId:'rs1',routineName:'Full',date:d(3),finishedAt:d(3),doneSets:15,totalSets:15,totalVol:1,
    exercises:[{id:'e10',name:'Curl Martillo con Mancuernas',sets:serie(25)},{id:'e36',name:'Prensa de Pierna',sets:serie(200)},
      {id:'e13',name:'Sentadilla con Barra',bar:20,sets:serie(40)},{id:'e61',name:'Sentadilla Sumo',sets:serie(20)},{id:'e37',name:'Extensión',sets:serie(50)}]}];
  DB.clients=[client]; DB.history={'${CID}':hist};
  DB.prs={'${CID}':{e37:{kg:50,reps:12,date:d(3),name:'Extensión',muscle:'piernas'}}};
  DB.bodyweight={}; DB.nutrition={}; DB.medidas={}; DB.photos={};
  CUR.clientId='${CID}'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|^wshow_|^wuopen_|^barra_|^salto_|^lastre_|^ax_news_seen|^coachmute_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  if(typeof expandTodayWorkout==='function')expandTodayWorkout();
  const st=document.getElementById('qa-sin-instalar')||document.createElement('style'); st.id='qa-sin-instalar';
  st.textContent='#install-banner,#install-pill,.install-pill,#ios-install,.toast{display:none!important}'; document.head.appendChild(st);
  return {ok:true};
}catch(e){return {ok:false,err:e.message+' | '+((e.stack||'').split('\\n')[1]||'')};}})()`;

// Teclear el peso como una persona: `input` (lo anota) y `change` (al salir del campo: los avisos).
const teclear = (ei, si, kg) => ev(`(()=>{ const inp=document.querySelector('#gm-set-${ei}-${si} .gm-sinput[data-field="kg"]'); if(!inp) return false;
  inp.value='${kg}'; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
const NOTA = ei => `(()=>{ ${CONTRASTE} const n=document.getElementById('gm-salto-${ei}'); if(!n) return null;
  const q=n.querySelector('.gm-salto-q'); const bs=[...n.querySelectorAll('.gm-salto-opt')];
  return { texto:q.innerText.replace(/\\s+/g,' ').trim(), qRatio:ratio(q), bajoSerie:n.previousElementSibling&&(n.previousElementSibling.id||n.previousElementSibling.className),
    botones:bs.map(b=>({t:b.innerText.trim(), alto:Math.round(b.getBoundingClientRect().height), der:Math.round(b.getBoundingClientRect().right), ratio:ratio(b)})), ancho:innerWidth }; })()`;
const clave = ei => ev(`localStorage.getItem('salto_rs1_${ei}')`);

for (const tema of ['claro', 'oscuro']) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  const m = await ev(MONTAR(tema));
  check(`${tema}: CONTROL · se montó la asesorada`, m && m.ok, JSON.stringify(m));
  if (!m || !m.ok) break;
  await sleep(1400);
  await ev(`(()=>{ const b=[...document.querySelectorAll('.mood-btn')][0]; if(b)b.click(); return 1; })()`); await sleep(1400);
  const hay = await ev(`[0,1,2,3,4].every(i=>!!document.querySelector('#gm-set-'+i+'-0 .gm-sinput[data-field="kg"]'))`);
  check(`${tema}: CONTROL · el guiado pinta las series con su casilla de peso`, hay === true, String(hay));
  if (!hay) break;

  // 1) Subida con mancuernas: 25 → 60 al teclear.
  await teclear(0, 0, 60); await sleep(500);
  let n = await ev(NOTA(0));
  check(`${tema}: 25 → 60 en curl martillo: sale la nota`, !!n, JSON.stringify(n));
  if (n) {
    check(`${tema}: dice lo de Sofía para mancuernas`, n.texto === 'La vez pasada anotaste 25 kg aquí. ¿Son las dos mancuernas?', n.texto);
    check(`${tema}: sus botones: «Sí, las dos» · «Lo corrijo»`, n.botones.map(b => b.t).join('|') === 'Sí, las dos|Lo corrijo', n.botones.map(b => b.t).join('|'));
    check(`${tema}: va bajo la serie donde se anotó`, /gm-set-0-0|setrow-wrap/.test(String(n.bajoSerie)), String(n.bajoSerie));
    check(`${tema}: se lee (≥4,5:1)`, n.qRatio >= 4.5 && n.botones.every(b => b.ratio >= 4.5), n.qRatio + ' · ' + n.botones.map(b => b.ratio).join(','));
    check(`${tema}: se toca (≥36 px) y cabe a 360`, n.botones.every(b => b.alto >= 36 && b.der <= n.ancho), n.botones.map(b => b.alto + '/' + b.der).join(','));
    const enVista = await ev(`(()=>{ const e=document.getElementById('gm-salto-0'); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight; })()`);
    await sleep(400);
    check(`${tema}: CONTROL · la captura tiene la nota en vista`, enVista === true, String(enVista));
    await send('Page.captureScreenshot', { format: 'png' }).then(s => writeFileSync(`${OUT}/salto-mancuernas-${tema}.png`, Buffer.from(s.data, 'base64')));
  }
  // 2) Barra: 40 → 80.
  await teclear(2, 0, 80); await sleep(500);
  n = await ev(NOTA(2));
  check(`${tema}: en la barra pregunta por la barra`, n && n.texto === 'La vez pasada anotaste 40 kg aquí. ¿Cambiaste de barra?' && n.botones[0].t === 'Es otra barra', n && (n.texto + ' | ' + n.botones[0].t));
  // 3) Controles: donde NO debe salir.
  await teclear(3, 0, 40); await sleep(400);
  check(`${tema}: CONTROL · sentadilla sumo (sin pregunta escrita) se calla`, (await ev(NOTA(3))) === null && (await clave(3)) === null, String(await clave(3)));
  await teclear(4, 0, 55); await sleep(400);
  check(`${tema}: CONTROL · 50 → 55 es progreso, no salto`, (await ev(NOTA(4))) === null, '');
  await teclear(1, 0, 90); await sleep(400);
  check(`${tema}: CONTROL · 200 → 90 AL TECLEAR no pregunta (una rampa no es un salto)`, (await ev(NOTA(1))) === null && (await clave(1)) === null, String(await clave(1)));
  // 4) La confirmación de v417 gana: 800 en la extensión (su mejor marca es 50).
  const conf = await ev(`(()=>{ localStorage.removeItem('salto_rs1_4'); const inp=document.querySelector('#gm-set-4-1 .gm-sinput[data-field="kg"]');
    inp.value='800'; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true}));
    const md=document.getElementById('m-kgconf'); const abierta=!!(md&&getComputedStyle(md).display!=='none'&&md.offsetHeight>0);
    const r={abierta, salto:localStorage.getItem('salto_rs1_4')}; if(typeof kgConfCorregir==='function')kgConfCorregir(); return r; })()`);
  await sleep(300);
  check(`${tema}: con la confirmación de un peso fuera de rango, NO sale además el salto`, conf.abierta && conf.salto === null, JSON.stringify(conf));
  // 5) Responder «Sí, las dos»: queda como corte y viaja al entreno guardado.
  await ev(`(()=>{ [...document.querySelectorAll('#gm-salto-0 .gm-salto-opt')][0].click(); return 1; })()`); await sleep(400);
  check(`${tema}: «Sí, las dos» guarda el corte y la nota se va`, /^e10\|corte\|25\|0$/.test(String(await clave(0))) && (await ev(NOTA(0))) === null, String(await clave(0)));
  // Una vez por ejercicio y por sesión: otra subida en la serie 2 ya no pregunta.
  await teclear(0, 1, 70); await sleep(400);
  check(`${tema}: no vuelve a preguntar en la misma sesión`, (await ev(NOTA(0))) === null && /\|corte\|/.test(String(await clave(0))), String(await clave(0)));
  // 6) «Lo corrijo» en la barra: queda como visto y lleva al campo del peso.
  await ev(`(()=>{ [...document.querySelectorAll('#gm-salto-2 .gm-salto-opt')][1].click(); return 1; })()`); await sleep(400);
  const foco = await ev(`(()=>{ const a=document.activeElement; const f=document.querySelector('#gm-set-2-0 .gm-sinput[data-field="kg"]'); return {mismo:a===f, clave:localStorage.getItem('salto_rs1_2')}; })()`);
  check(`${tema}: «Lo corrijo» lleva al peso de esa serie y no vuelve a preguntar`, foco.mismo && /^e13\|visto\|/.test(String(foco.clave)), JSON.stringify(foco));
  // 7) Bajada al CERRAR la prensa (90, 90, 90 contra 200): la pregunta sale en el descanso.
  const marcar = (ei, si, kg) => ev(`(()=>{ const row=document.getElementById('gm-set-${ei}-${si}'); row.querySelector('[data-field="kg"]').value='${kg}';
    row.querySelector('[data-field="kg"]').dispatchEvent(new Event('input',{bubbles:true}));
    row.querySelector('[data-field="reps"]').value='10'; row.querySelector('[data-field="reps"]').dispatchEvent(new Event('input',{bubbles:true}));
    document.getElementById('gm-chk-${ei}-${si}').click(); return 1; })()`);
  const saltar = async () => { await ev(`(()=>{ gmSkipRest(); return 1; })()`); await sleep(350);
    await ev(`(()=>{ if(typeof closeStartCard==='function') closeStartCard(); return 1; })()`); await sleep(350); };
  // 7a) FUERA de orden (el paso actual es el curl): sin descanso, la bajada sale en la TARJETA.
  //     Extensión 50 → 20, 20, 20. No se responde: si lo ignora, no pasa nada (el control de abajo).
  await marcar(4, 0, 20); await sleep(250); await marcar(4, 1, 20); await sleep(250); await marcar(4, 2, 20); await sleep(500);
  const fo = await ev(`(()=>{ const n=document.getElementById('gm-salto-4'); const ov=document.getElementById('gm-rest-overlay');
    return { nota:n?n.querySelector('.gm-salto-q').innerText.replace(/\\s+/g,' ').trim():null, descanso:!ov.classList.contains('hidden') }; })()`);
  check(`${tema}: fuera de orden, cerrar la extensión (50 → 20) pregunta en la tarjeta`, fo.nota === 'La vez pasada anotaste 50 kg aquí. ¿Cambiaste de máquina?' && !fo.descanso, JSON.stringify(fo));
  // 7b) EN orden: el curl (sus 3 series, ya respondido) y luego la prensa 200 → 90 → la pregunta sale en el DESCANSO.
  for (const si of [0, 1, 2]) { await marcar(0, si, 60); await sleep(300); await saltar(); }
  await marcar(1, 0, 90); await sleep(300);
  const d1 = await ev(`(()=>{ const b=document.getElementById('gm-rest-salto'); const ov=document.getElementById('gm-rest-overlay');
    return { descanso:!ov.classList.contains('hidden'), aviso:!!(b&&!b.hidden&&b.offsetHeight>0) }; })()`);
  check(`${tema}: CONTROL · en orden, una serie que NO cierra el ejercicio abre el descanso SIN el aviso`, d1.descanso && !d1.aviso, JSON.stringify(d1));
  await saltar(); await marcar(1, 1, 90); await sleep(300); await saltar();
  await marcar(1, 2, 90); await sleep(500);
  const ov = await ev(`(()=>{ ${CONTRASTE} const b=document.getElementById('gm-rest-salto'); if(!b||b.hidden||!b.offsetHeight) return null;
    const q=b.querySelector('.gm-rest-salto-in-q'); const bs=[...b.querySelectorAll('.gm-rest-salto-in-opt')];
    return { texto:q.innerText.replace(/\\s+/g,' ').trim(), qRatio:ratio(q), botones:bs.map(x=>({t:x.innerText.trim(),alto:Math.round(x.getBoundingClientRect().height),ratio:ratio(x)})) }; })()`);
  check(`${tema}: al cerrar la prensa (200 → 90) el descanso pregunta por la máquina`, ov && ov.texto === 'La vez pasada anotaste 200 kg aquí. ¿Cambiaste de máquina?' && ov.botones.map(b => b.t).join('|') === 'Es otra máquina|Lo corrijo', JSON.stringify(ov));
  if (ov) check(`${tema}: en el descanso se lee (≥4,5:1) y se toca (≥44 px)`, ov.qRatio >= 4.5 && ov.botones.every(b => b.ratio >= 4.5 && b.alto >= 44), ov.qRatio + ' · ' + ov.botones.map(b => b.ratio + '/' + b.alto).join(','));
  await send('Page.captureScreenshot', { format: 'png' }).then(s => writeFileSync(`${OUT}/salto-descanso-${tema}.png`, Buffer.from(s.data, 'base64')));
  await ev(`(()=>{ [...document.querySelectorAll('#gm-rest-salto .gm-rest-salto-in-opt')][0].click(); return 1; })()`); await sleep(500);
  const guard = await ev(`(()=>{ const h=(DB.history['${CID}']||[]).find(s=>s.routineId==='rs1'&&s.id!=='hs1'); const x=h&&h.exercises;
    const b=document.getElementById('gm-rest-salto');
    return { e36:x&&x[1]&&x[1].corte===true, e10:x&&x[0]&&x[0].corte===true, e13:x&&x[2]&&!!x[2].corte, e37:x&&x[4]&&!!x[4].corte, cajaOculta:!!(b&&b.hidden) }; })()`);
  check(`${tema}: «Es otra máquina» y «Sí, las dos» llegan al entreno guardado como corte`, guard.e36 && guard.e10, JSON.stringify(guard));
  check(`${tema}: CONTROL · «Lo corrijo» y los que no saltaron NO quedan como corte`, guard.e13 === false && guard.e37 === false, JSON.stringify(guard));
  check(`${tema}: responder esconde la pregunta del descanso`, guard.cajaOculta, JSON.stringify(guard));
  await saltar();
  // 8) La plancha usa el mismo recuadro: ahí NO puede seguir pintado el aviso.
  const pl = await ev(`(()=>{ gmHoldTimer(5,0,5); const b=document.getElementById('gm-rest-salto'); const r={abierto:!document.getElementById('gm-rest-overlay').classList.contains('hidden'), aviso:!!(b&&!b.hidden&&b.offsetHeight>0)}; gmSkipRest(); return r; })()`);
  check(`${tema}: CONTROL · la plancha abre el recuadro SIN el aviso`, pl.abierto && !pl.aviso, JSON.stringify(pl));
  // 9) Día nuevo: la respuesta de hoy no se hereda.
  const dia = await ev(`(()=>{ _wipeSessionFlags(GM.routine); return ['0','1','2'].map(i=>localStorage.getItem('salto_rs1_'+i)); })()`);
  check(`${tema}: al empezar otro día se borran las respuestas del salto`, dia.every(v => v === null), JSON.stringify(dia));
}
check('cero errores de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

console.log(results.join('\n'));
console.log('capturas en ' + OUT);
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} aviso de salto: ${results.length - malos}/${results.length}`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(malos ? 1 : 0);
