// _pantallas-retencion-dia.mjs — v758: tocar una barra de «Retención semanal» marca el día y saca quién entrenó (una fila por PERSONA).
//
// Mide en Chrome REAL (sin login ni red: la nube está sellada en localhost) y, con una carpeta, deja PANTALLAZOS de página completa
// con el aviso de instalar oculto y un día marcado. Los datos son SEMBRADOS DE PRUEBA («… Prueba»): jamás de producción.
// Mide: (1) cada barra es un botón de 36 px o más de área táctil, con aria-label y foco de teclado;
//       (2) al tocar una barra, las filas son tantas como dice su número (misma fuente) y el número sigue dentro de la caja;
//       (3) tocar la fila abre la ficha y el botón ATRÁS vuelve al Inicio (como Prioritarios);
//       (4) nada se sale del ancho del teléfono (360 y 390 px, claro y oscuro, letra normal y xl).
// CONTROL: una barra sin aria-label o de menos de 36 px la sonda TIENE que verla.
//   node scripts/e2e/_pantallas-retencion-dia.mjs [carpeta-de-pantallazos]
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { FIXTURE } from './_fixture-12.mjs';
import { afirmador, salir, liberarPuerto, cuidarProcesos, capturaConContenido, pngVacio } from './_afirma.mjs';
const A = afirmador('retención · tocar un día');
const PORT = 8894, DBG = 9448;
const OUT = process.argv[2] || '';
if (OUT) mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
liberarPuerto(PORT);
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/retdia-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
cuidarProcesos(chrome, srv);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (m, p = {}, ms = 45000) => new Promise(res => { const i = id++; const t = setTimeout(() => { pend.delete(i); res({ timeout: true }); }, ms); pend.set(i, r => { clearTimeout(t); res(r); }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderHome==='function' && typeof applyTextSize==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);
A.ok((await ev(FIXTURE)) === 'ok', 'el fixture se montó');
// DATOS SEMBRADOS DE PRUEBA: nombres «… Prueba»; varias personas el mismo día (la barra más alta = 4) y una con DOS entrenos el mismo día.
const SIEMBRA = `(()=>{
  const nombres={cA:'Mariana Prueba',cB:'Andrés Prueba',cC:'Julia Prueba',cD:'Camila Prueba'};
  DB.clients.forEach(c=>{ if(nombres[c.id]){ c.name=nombres[c.id]; c.email=c.id.toLowerCase()+'@prueba.invalid'; } });
  DB.clients.push({id:'_self',name:'Yo',email:'',goal:'',level:'Intermedio',days:3,payments:[],routines:[]});
  const dia=86400000, d0=new Date(); d0.setHours(0,0,0,1); const base=+d0;
  const s=(ms,r)=>({id:'s'+ms,sessionId:'sid'+ms,routineId:'r1',routineName:r,date:new Date(ms).toISOString(),startedAt:new Date(ms).toISOString(),finishedAt:new Date(ms).toISOString(),totalVol:3000,doneSets:12,totalSets:12,exercises:[]});
  DB.history={
    cA:[s(base+1000,'Pierna A'),s(base+2000,'Core'),s(base-dia*1.5,'Empuje'),s(base-dia*3.5,'Tirón')],
    cB:[s(base+3000,'Empuje'),s(base-dia*3.5+5000,'Pierna B')],
    cC:[s(base+4000,'Full body A'),s(base-dia*3.5+7000,'Core')],
    _self:[s(base+5000,'Mi pierna'),s(base-dia*3.5+9000,'Mi espalda')],
    cD:[s(base-dia*5.5,'Tirón')],
    // v759 · datos que DISTINGUEN las dos ventanas: Elena entrenó hace 7 días a las 11 p. m. (dentro de 7×24 h, FUERA de los 7 días de calendario) y
    // «fantasma» es una llave del historial que ya no está en DB.clients (con 2 sesiones de hoy). Con la lógica de v758 salen 100 % y 13 sesiones.
    cE:[(()=>{ const d=new Date(); d.setHours(23,0,0,0); d.setDate(d.getDate()-7); return s(+d,'Tirón'); })()],
    fantasma:[s(base+6000,'Fantasma'),s(base+7000,'Fantasma')]
  };
  DB.clients.push({id:'cE',name:'Elena Prueba',email:'',goal:'',level:'Intermedio',days:3,payments:[],routines:[]});
  CUR.loggedAs='coach'; showScreen('s-coach'); gp('p-home',document.getElementById('sbi-home'),'Inicio'); renderHome();
  document.querySelectorAll('#install-banner').forEach(b=>{b.style.display='none';b.classList.add('hide');});
  return DB.clients.map(c=>c.name).join('|');
})()`;
const sembrado = await ev(SIEMBRA);
A.ok(/Mariana Prueba/.test(sembrado) && !/Julián Restrepo|Andrea Molina/.test(sembrado), 'los datos son sembrados de prueba (nombres «… Prueba»)', sembrado);
await sleep(600);
// v759 · UNA sola semana, medido en Chrome con cuentas HECHAS APARTE (no con la función de la app): el % de la tarjeta = personas de la unión de
// las 7 barras ÷ personas, y «Sesiones semana» = suma de las sesiones de los 7 días de calendario de las personas que existen.
const SEMANA = `(()=>{ const ids=new Set(); for(let i=0;i<7;i++){ const b=document.querySelector('#h-ret-bars button.ret-dia[data-ret="'+i+'"]'); b.click();
    document.querySelectorAll('#h-ret-bars .ret-fila').forEach(f=>{ const m=(f.getAttribute('onclick')||'').match(/'([^']+)'/); if(m)ids.add(m[1]); });
    document.querySelector('#h-ret-bars button.ret-dia[data-ret="'+i+'"]').click(); }
  const hoy0=new Date(); hoy0.setHours(0,0,0,0); const ini=+hoy0-6*86400000, quienes=new Set(DB.clients.map(c=>c.id)); let ses=0;
  Object.keys(DB.history).forEach(id=>{ if(!quienes.has(id))return; (DB.history[id]||[]).forEach(x=>{ const t=new Date(x.date); const d0=new Date(t.getFullYear(),t.getMonth(),t.getDate()).getTime(); if(d0>=ini&&d0<=+hoy0) ses++; }); });
  return { union:ids.size, personas:DB.clients.length, pctEsperado:Math.round(ids.size/DB.clients.length*100), etq:document.getElementById('h-ret-label').textContent, sesEsperado:ses, sess:document.getElementById('h-sess').textContent, marcados:document.querySelectorAll('#h-ret-bars [aria-pressed="true"]').length }; })()`;
const sem = await ev(SEMANA);
// con la siembra de arriba: 5 de 6 personas (83 %) y 11 sesiones; la lógica de v758 daría 100 % y 13
const juzgaSemana = r => Boolean(r) && r.union === 5 && r.personas === 6 && r.etq === r.pctEsperado + '% entrenaron esta semana' && r.pctEsperado === 83 && r.sesEsperado === 11 && String(r.sess) === String(r.sesEsperado) && r.marcados === 0;
A.ok(juzgaSemana(sem), 'el % de la tarjeta («' + sem.etq + '») = personas de la unión de las 7 barras ÷ personas (' + sem.union + ' de ' + sem.personas + ') y «Sesiones semana» (' + sem.sess + ') = la suma de las sesiones de los 7 días (' + sem.sesEsperado + ')', sem);
// CONTROL (v759): con la lógica de v758 metida en vivo (el % en 7×24 h y «Sesiones semana» sobre TODO DB.history) esta misma comprobación TIENE que caer
await ev(`(()=>{ window.__rhOrig=renderHome; renderHome=function(){ window.__rhOrig(); const ref=Date.now()-7*864e5; const n=DB.clients.filter(c=>(DB.history[c.id]||[]).some(s=>new Date(s.date).getTime()>=ref)).length; document.getElementById('h-ret-label').textContent=Math.round(n/DB.clients.length*100)+'% entrenaron esta semana'; let k=0; Object.values(DB.history).forEach(a=>(a||[]).forEach(s=>{ if(new Date(s.date).getTime()>=ref)k++; })); document.getElementById('h-sess').textContent=k; }; renderHome(); return 'ok'; })()`);
await sleep(300);
const semV758 = await ev(SEMANA);
A.ok(!juzgaSemana(semV758), 'CONTROL: con la lógica de v758 (% en 7×24 h y Sesiones sobre todo el historial) la comprobación cae (' + semV758.etq + ' · ' + semV758.sess + ' sesiones)', semV758);
await ev(`(()=>{ renderHome=window.__rhOrig; renderHome(); return 'ok'; })()`); await sleep(300);
const MIDE = `(()=>{ const card=document.getElementById('h-retention-card'), cont=document.getElementById('h-ret-bars'); if(!card||card.style.display==='none')return {err:'sin tarjeta'};
  const ch=card.querySelector('.ch').getBoundingClientRect(), cajaEl=cont.firstElementChild, caja=cajaEl.getBoundingClientRect();
  const bts=[...cajaEl.querySelectorAll('button.ret-dia')];
  const nums=bts.map(b=>b.children[0]).filter(n=>n.textContent.trim()); const maxTop=Math.min(...nums.map(n=>n.getBoundingClientRect().top));
  const tam=bts.map(b=>{const r=b.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)};});
  const filas=[...cont.querySelectorAll('.ret-fila')]; const fueraX=[...cont.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.right>innerWidth+1||r.left<-1);}).length;
  const marcados=bts.filter(b=>b.getAttribute('aria-pressed')==='true').length;
  const sinEtq=bts.filter(b=>!(b.getAttribute('aria-label')||'').match(/: (nadie entrenó|\\d+ entren)/)).length;
  return {botones:bts.length, minW:Math.min(...tam.map(t=>t.w)), minH:Math.min(...tam.map(t=>t.h)), numTopOk: maxTop>=caja.top-0.5 && maxTop>=ch.bottom-0.5, filas:filas.length, filasH:filas.map(f=>Math.round(f.getBoundingClientRect().height)), fueraX, marcados, sinEtq, n6:bts[6].children[0].textContent.trim()}; })()`;
// PÁGINA COMPLETA: la app es un «cascarón» con el contenido dentro de un contenedor que se desplaza; se busca ese contenedor (el que
// desplaza y contiene el elemento) y se pone la ventana tan alta como su contenido, para que la captura traiga TODO el panel.
async function altoCompleto(w, selector) {
  for (let k = 0; k < 3; k++) {
    const h = await ev(`(()=>{ let n=document.querySelector('${selector}'); while(n&&n!==document.documentElement){ const o=getComputedStyle(n).overflowY; if((o==='auto'||o==='scroll')&&n.scrollHeight>n.clientHeight+4){ n.scrollTop=0; return n.scrollHeight+(innerHeight-n.clientHeight); } n=n.parentElement; } return Math.max(document.scrollingElement.scrollHeight, innerHeight); })()`);
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.min(6000, Math.ceil(h) + 8), deviceScaleFactor: 2, mobile: true });
    await sleep(350);
  }
}
const tocar = i => ev(`document.querySelector('#h-ret-bars button.ret-dia[data-ret="${i}"]').click(); 'ok'`);
const ver = r => !r.err && r.botones === 7 && r.minW >= 36 && r.minH >= 36 && r.numTopOk && r.fueraX === 0 && r.sinEtq === 0;
let primera = true;
for (const w of [360, 390]) for (const tema of ['light', 'dark']) for (const fs of ['normal', 'xl']) {
  if (fs === 'xl' && w === 390) continue;   // letra grande se mide a 360 (el caso más estrecho) y a 390 solo en normal
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
  await ev(`setTheme('${tema}'); applyTextSize('${fs}'); renderHome(); document.querySelectorAll('#install-banner').forEach(b=>{b.style.display='none';b.classList.add('hide');}); 'ok'`);
  await sleep(400);
  const r0 = await ev(MIDE);
  A.ok(ver(r0) && r0.filas === 0 && r0.marcados === 0, `${w}px · ${tema} · ${fs}: sin día marcado (7 botones ≥36 px, aria-label, número dentro de la caja)`, r0);
  await tocar(6); await sleep(250);
  const r1 = await ev(MIDE);
  A.ok(ver(r1) && r1.marcados === 1 && r1.filas === Number(r1.n6) && r1.filas === 4 && r1.filasH.every(h => h >= 36), `${w}px · ${tema} · ${fs}: con hoy marcado hay ${r1.filas} filas (= el número de la barra, 4 personas, cada una de 36 px o más) y nada se sale del ancho`, r1);
  if (OUT && !(fs === 'xl' && w !== 360)) {
    await altoCompleto(w, '#h-retention-card');
    await capturaConContenido(send, ev, A, `${OUT}/inicio-${w}-${tema === 'light' ? 'claro' : 'oscuro'}-${fs === 'xl' ? 'letra-grande' : 'normal'}-dia-marcado.png`, { rearmar: () => altoCompleto(w, '#h-retention-card') });
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
  }
  await tocar(6); await sleep(150);   // vuelve a cerrar
  const r2 = await ev(MIDE);
  A.ok(r2.filas === 0 && r2.marcados === 0, `${w}px · ${tema} · ${fs}: tocar el mismo día otra vez lo cierra`, r2);
}
// Otro día (hace 3 días: 4 personas con 2 entrenos cada una) y el cambio entre días
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await ev(`setTheme('light'); applyTextSize('normal'); renderHome(); 'ok'`); await sleep(300);
await tocar(2); await sleep(200);
const r3 = await ev(MIDE);
A.ok(r3.filas === 4 && r3.marcados === 1, 'otro día (hace 4 días): 4 filas por persona aunque cada una hizo 2 entrenos', r3);
await tocar(0); await sleep(200);
const r4 = await ev(MIDE);
A.ok(r4.marcados === 1 && r4.filas === 1, 'tocar otro día cambia la lista (hace 6 días: 1 persona sola)', r4);
// Tocar una fila abre la ficha; el ATRÁS vuelve al Inicio (la misma función de Prioritarios)
await tocar(6); await sleep(200);
await ev(`document.querySelector('#h-ret-bars .ret-fila').click(); 'ok'`); await sleep(800);
const ficha = await ev(`({det: !!document.querySelector('#p-detail.on')||getComputedStyle(document.getElementById('p-detail')).display!=='none', home: getComputedStyle(document.getElementById('p-home')).display!=='none' && document.getElementById('p-home').classList.contains('on')})`);
A.ok(ficha.det, 'tocar una fila abre la ficha de esa persona', ficha);
await ev(`history.back(); 'ok'`); await sleep(900);
const vuelta = await ev(`({det: document.getElementById('p-detail').classList.contains('on'), home: document.getElementById('p-home').classList.contains('on')})`);
A.ok(vuelta.home && !vuelta.det, 'el botón ATRÁS desde la ficha vuelve al Inicio (como Prioritarios)', vuelta);
// El reporte de Sesiones con un día marcado
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await ev(`gp('p-home',document.getElementById('sbi-home'),'Inicio'); renderHome(); openCoachStat('sesiones'); 'ok'`); await sleep(700);
// el día marcado se conserva al volver de la ficha (por diseño): si ya está marcado hoy, no se toca otra vez
await ev(`(()=>{ const r=document.getElementById('ret-rep'); if(!r.querySelector('.ret-fila')) r.querySelector('button.ret-dia[data-ret="6"]').click(); return 'ok'; })()`); await sleep(300);
const rep = await ev(`(()=>{const r=document.getElementById('ret-rep'); return {filas:r.querySelectorAll('.ret-fila').length, n6:r.querySelector('button.ret-dia[data-ret="6"]').children[0].textContent.trim(), fueraX:[...r.querySelectorAll('*')].filter(e=>{const b=e.getBoundingClientRect(); return b.width>0&&(b.right>innerWidth+1||b.left<-1);}).length};})()`);
A.ok(rep.filas === Number(rep.n6) && rep.filas === 4 && rep.fueraX === 0, 'el reporte de Sesiones: hoy marcado trae las mismas 4 filas que dice su barra, sin salirse', rep);
// Desde el REPORTE: tocar una fila cierra el reporte y abre la ficha; UN solo atrás vuelve al Inicio (no la ficha debajo del reporte)
if (!OUT) {
  await ev(`document.querySelector('#ret-rep .ret-fila').click(); 'ok'`); await sleep(900);
  const f2 = await ev(`({det: document.getElementById('p-detail').classList.contains('on'), room: document.getElementById('coach-stat-room').classList.contains('on')})`);
  A.ok(f2.det && !f2.room, 'desde el reporte: tocar la fila abre la ficha y el reporte queda cerrado (no debajo)', f2);
  await ev(`history.back(); 'ok'`); await sleep(900);
  const v2 = await ev(`({det: document.getElementById('p-detail').classList.contains('on'), room: document.getElementById('coach-stat-room').classList.contains('on'), home: document.getElementById('p-home').classList.contains('on')})`);
  A.ok(v2.home && !v2.det && !v2.room, 'desde el reporte: UN solo atrás vuelve al Inicio', v2);
  await ev(`openCoachStat('sesiones'); 'ok'`); await sleep(500);
  // CONTROL (v759): con la fila llamando openDetail directo (el defecto de antes) la ficha queda DEBAJO del reporte y esta sonda TIENE que verlo
  await ev(`(()=>{ const r=document.getElementById('ret-rep'); if(!r.querySelector('.ret-fila')) r.querySelector('button.ret-dia[data-ret="6"]').click(); document.querySelectorAll('#ret-rep .ret-fila').forEach(b=>b.setAttribute('onclick', b.getAttribute('onclick').replace('_crepGoDetail(','openDetail('))); return 'ok'; })()`); await sleep(300);
  await ev(`document.querySelector('#ret-rep .ret-fila').click(); 'ok'`); await sleep(900);
  const f3 = await ev(`({det: document.getElementById('p-detail').classList.contains('on'), room: document.getElementById('coach-stat-room').classList.contains('on')})`);
  A.ok(f3.det && f3.room, 'CONTROL: con openDetail directo la ficha queda DEBAJO del reporte abierto y la sonda lo ve', f3);
  await ev(`closeCoachStat(); history.back(); 'ok'`); await sleep(900);
  await ev(`gp('p-home',document.getElementById('sbi-home'),'Inicio'); renderHome(); openCoachStat('sesiones'); 'ok'`); await sleep(500);
}
if (OUT) {
  await altoCompleto(360, '#coach-stat-body');
  await capturaConContenido(send, ev, A, `${OUT}/reporte-sesiones-360-claro-dia-marcado.png`, { rearmar: () => altoCompleto(360, '#coach-stat-body') });
}
// CONTROL de las capturas (v759): una captura forzada con la página OCULTA (nada pintado) la sonda TIENE que verla vacía, y una con la página pintada, con contenido
await ev(`gp('p-home',document.getElementById('sbi-home'),'Inicio'); renderHome(); 'ok'`); await sleep(500);
const _pintada = await send('Page.captureScreenshot', { format: 'png' });
A.ok(_pintada.data && !pngVacio(Buffer.from(_pintada.data, 'base64')), 'CONTROL: una captura con la página pintada NO se ve vacía');
// La captura «sin pintar» se fabrica escondiendo el BODY (queda solo el fondo del documento, como las capturas vacías reales de 16 KB):
// con `visibility:hidden` en <html> la captura NO salía de un solo color y el control no probaba nada.
await ev(`document.body.style.display='none'; 'ok'`); await sleep(300);
const _oculta = await send('Page.captureScreenshot', { format: 'png' });
A.ok(_oculta.data && pngVacio(Buffer.from(_oculta.data, 'base64')), 'CONTROL: una captura forzada antes de pintar (página oculta) la sonda la ve VACÍA');
await ev(`document.body.style.display=''; 'ok'`); await sleep(300);
// CONTROL de discriminación: una barra sin aria-label y una de 20 px TIENEN que verse mal
await ev(`closeCoachStat(); gp('p-home',document.getElementById('sbi-home'),'Inicio'); renderHome(); (()=>{const b=document.querySelector('#h-ret-bars button.ret-dia'); b.removeAttribute('aria-label'); b.style.minWidth='0'; b.style.width='20px'; b.style.flex='none';})(); 'ok'`); await sleep(300);
const mala = await ev(MIDE);
A.ok(!ver(mala), 'CONTROL: una barra sin aria-label y de 20 px la sonda la ve mal', mala);
salir(A, { chrome, srv });
