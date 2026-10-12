// Harness de v709 — PROGRESO EN PESTAÑAS (lote 4 del estudio de organización, decisión del PO del 11-oct-2026):
// Resumen · Historial · Récords · Logros. Sin login: monta asesoradas de prueba y recorre Progreso a 360 px:
//   · al entrar se ve el Resumen; cada pestaña enseña solo lo suyo y lo suyo se ve;
//   · las cuatro caben y se tocan; con «Muy grande» la elegida queda a la vista; con teclado ← → Inicio Fin;
//   · la pestaña se recuerda al ir a otra pantalla y volver; cambiar de pestaña no empuja historial;
//   · con la pantalla bajada, cambiar de pestaña empieza arriba;
//   · «Récords» trae el progreso por ejercicio aunque no se haya abierto el Perfil (antes salía vacío);
//   · una asesorada nueva no ve pestañas en blanco (Logros dice qué esperar);
//   · nada se sale de la pantalla y las pestañas se leen en los dos temas.
//   node scripts/e2e/_verify-progreso-pestanas.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { afirmador, salir, liberarPuerto, cuidarProcesos } from './_afirma.mjs';

const A = afirmador('Progreso en pestañas');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(process.env.TEMP || '.', 'avi-v709-shots'); mkdirSync(OUT, { recursive: true });
const PORT = 8900, DP = 9410, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
liberarPuerto(PORT); liberarPuerto(DP);
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: ROOT });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/progpest-' + Date.now(), '--no-first-run', '--window-size=360,800', APP]);
cuidarProcesos(chrome, srv);
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, n + '.png'), Buffer.from(r.data, 'base64')); };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await sleep(600);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}localStorage.clear();})()`);
await send('Page.navigate', { url: APP });
A.ok(await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof renderClientHistory==='function' && typeof progTab==='function'`), 'la app terminó de arrancar');
A.ok(await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000), 'la pantalla de carga ya se fue');

// Montaje: una asesorada con 12 entrenos (dos ejercicios que suben de peso) y otra nueva sin nada.
const MONTAR = conDatos => `(()=>{try{
  window.svNow=async()=>true; window.sbSet=async()=>true;
  const hace=n=>new Date(Date.now()-n*86400000).toISOString();
  const ses=k=>({id:'s'+k,sessionId:'s'+k,routineId:'r1',routineName:'Pierna',date:hace(k*3+1),finishedAt:hace(k*3+1),doneSets:6,totalSets:6,duration:3000,totalVol:4000+(12-k)*80,
    exercises:[{id:'e14',name:'Hip Thrust con Barra',track:'peso_reps',sets:[1,2,3].map(()=>({kg:String(80+(12-k)*2.5),reps:'10',done:true}))},
               {id:'e1',name:'Press de Banca',track:'peso_reps',sets:[1,2,3].map(()=>({kg:String(30+(12-k)),reps:'8',done:true}))},
               {id:'e5',name:'Remo con Barra',track:'peso_reps',sets:[1,2,3].map(()=>({kg:String(35+(12-k)),reps:'8',done:true}))}]});
  DB.clients=[{id:'demo',name:'Mariana Prueba',sex:'F',goal:'Recomposición',level:'Intermedio',days:3,age:29,height:164,weight:61,
    payments:[{date:hace(10),dueDate:new Date(Date.now()+20*86400000).toISOString(),amount:150000}],routines:[],habits:{water:{},steps:{}}}];
  DB.history={demo:${conDatos ? '[0,1,2,3,4,5,6,7,8,9,10,11].map(ses)' : '[]'}};
  DB.prs={demo:{}}; DB.bodyweight={demo:[]}; DB.medidas={demo:[]}; DB.photos={demo:[]}; DB.nutrition={};
  ${conDatos ? '' : 'DB.clients[0].payments=[];'}
  CUR.clientId='demo'; CUR.loggedAs='client'; CUR.progTab=undefined;
  showScreen('s-client');
  const t=[...document.querySelectorAll('.cntab')].find(x=>/Progreso/.test(x.textContent)); cnTab('cn-history',t);
  return {ok:true};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`;
const m = await ev(MONTAR(true)); await sleep(800);
A.ok(m && m.ok, 'montaje: una asesorada con 12 entrenos', m);

const VIS = `(()=>{ const P=document.getElementById('cn-history'); return { tab:P.getAttribute('data-ptab'),
  vis:[...P.querySelectorAll('.pg-sec')].filter(s=>getComputedStyle(s).display!=='none').map(s=>s.getAttribute('data-pt')),
  sel:[...P.querySelectorAll('.dt-tab[aria-selected="true"]')].map(b=>b.getAttribute('data-t')) }; })()`;
const tocar = sel => ev(`(()=>{ const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return {falta:true}; b.scrollIntoView({block:'nearest'}); const r=b.getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); const ok=el===b||b.contains(el); if(ok) b.click(); return {ok}; })()`);

// ── 1. Al entrar: solo el Resumen ──
let v = await ev(VIS);
A.ok(v.tab === 'resumen' && v.vis.join() === 'resumen' && v.sel.join() === 'resumen', 'al entrar a Progreso se ve solo el Resumen', v);
await shot('progreso-resumen');

// ── 2. Las cuatro caben y se tocan a 360 px ──
const barra = await ev(`(()=>{ const seg=document.querySelector('#pg-tabs .dt-seg').getBoundingClientRect();
  return [...document.querySelectorAll('#pg-tabs .dt-tab')].map(b=>{ const r=b.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {t:b.dataset.t, dentro:r.left>=seg.left-0.5&&r.right<=seg.right+0.5, alto:Math.round(r.height), toca:el===b||b.contains(el)}; }); })()`);
A.ok(barra.length === 4 && barra.every(b => b.dentro && b.toca && b.alto >= 36), 'las cuatro pestañas se ven enteras, miden ≥36 px y reciben el toque', barra);

// ── 3. Cada pestaña enseña solo lo suyo, y lo suyo se ve ──
const DENTRO = { historial: '#cn-hist-list .sescard', records: '#cn-exprog-list svg', logros: '#cn-gamif', resumen: '#cn-streak' };
for (const t of ['historial', 'records', 'logros', 'resumen']) {
  const tq = await tocar(`#pg-tabs .dt-tab[data-t="${t}"]`); await sleep(350);
  v = await ev(VIS);
  const alto = await ev(`(()=>{ const e=document.querySelector(${JSON.stringify(DENTRO[t])}); return e?Math.round(e.getBoundingClientRect().height):0; })()`);
  A.ok(tq.ok && v.tab === t && v.vis.join() === t && alto > 0, `tocar «${t}» enseña solo esa pestaña y su contenido se ve`, { tq, v, alto });
  if (t === 'records') await shot('progreso-records');
}

// ── 4. La pestaña se recuerda al ir a otra pantalla y volver; cambiarla no empuja historial ──
await tocar('#pg-tabs .dt-tab[data-t="logros"]'); await sleep(250);
await ev(`(()=>{ const t=[...document.querySelectorAll('.cntab')].find(x=>/Hoy/.test(x.textContent)); cnTab('cn-today',t); })()`); await sleep(400);
await ev(`(()=>{ const t=[...document.querySelectorAll('.cntab')].find(x=>/Progreso/.test(x.textContent)); cnTab('cn-history',t); })()`); await sleep(500);
// Pasar por «Hoy» abre el tour de novedades (normal en la app): se cierra como lo haría la persona, o tapa todo.
await ev(`(()=>{ const nt=document.getElementById('news-tour'); if(nt&&!nt.classList.contains('hidden')&&typeof ntClose==='function') ntClose(false); })()`); await sleep(300);
A.ok(await ev(`(()=>{ const nt=document.getElementById('news-tour'); return !nt||nt.classList.contains('hidden'); })()`), 'CONTROL: no queda ningún tour tapando la pantalla');
v = await ev(VIS);
A.ok(v.tab === 'logros' && v.vis.join() === 'logros', 'al volver a Progreso sigue en la pestaña donde estaba', v);
const largo0 = await ev(`history.length`);
await tocar('#pg-tabs .dt-tab[data-t="historial"]'); await sleep(200);
await tocar('#pg-tabs .dt-tab[data-t="records"]'); await sleep(200);
A.ok((await ev(`history.length`)) === largo0, 'cambiar de pestaña no añade pasos al atrás', { antes: largo0, despues: await ev(`history.length`) });

// ── 5. Con la pantalla bajada, cambiar de pestaña empieza arriba (la barra queda fija) ──
await ev(`(()=>{ _cnHistOpen.demo=true; progTab('historial'); renderClientHistory('demo'); })()`); await sleep(500);
const baja = await ev(`(async()=>{ const sc=document.querySelector('#cn-history').closest('.cnbody'); sc.scrollTop=1200; await new Promise(r=>setTimeout(r,250));
  const bt=document.getElementById('pg-tabs').getBoundingClientRect().top, st=sc.getBoundingClientRect().top; return {scroll:sc.scrollTop, fija:Math.abs(bt-st)<=2}; })()`);
A.ok(baja.scroll > 300 && baja.fija, 'CONTROL: con el Historial abierto la pantalla baja, y la barra queda fija arriba', baja);
await tocar('#pg-tabs .dt-tab[data-t="resumen"]'); await sleep(350);
A.ok((await ev(`document.querySelector('#cn-history').closest('.cnbody').scrollTop`)) === 0, 'cambiar de pestaña con la pantalla bajada empieza arriba');

// ── 6. Teclado ──
await ev(`document.querySelector('#pg-tabs .dt-tab[data-t="resumen"]').focus()`); await sleep(100);
const tecla = async k => { const c = { ArrowRight: 39, ArrowLeft: 37, End: 35, Home: 36 }[k];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: c }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: c }); await sleep(250); };
await tecla('ArrowRight'); const k1 = await ev(`({tab:CUR.progTab, foco:document.activeElement&&document.activeElement.dataset.t})`);
await tecla('End'); const k2 = await ev(`({tab:CUR.progTab, foco:document.activeElement&&document.activeElement.dataset.t})`);
await tecla('Home');
A.ok(k1.tab === 'historial' && k1.foco === 'historial' && k2.tab === 'logros' && k2.foco === 'logros', 'con teclado, → y Fin recorren las pestañas y el foco las sigue', { k1, k2 });

// ── 7. «Récords» trae el progreso por ejercicio aunque no se haya abierto el Perfil ──
await ev(`(()=>{ document.getElementById('cn-exprog-list').innerHTML=''; renderClientHistory('demo'); progTab('records'); })()`); await sleep(400);
const exp = await ev(`document.querySelectorAll('#cn-exprog-list svg').length`);
A.ok(exp > 0, 'abrir Progreso pinta el progreso por ejercicio (antes solo lo pintaba el Perfil)', exp);
const abre = await ev(`(async()=>{ const card=document.querySelector('#cn-exprog-list .exprog-card'); if(!card) return {falta:true};
  const h=card.querySelector('.exprog-header'); h.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,150));
  const r=h.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); const toca=el===h||h.contains(el);
  if(toca) h.click(); await new Promise(r=>setTimeout(r,250));
  const svg=card.querySelector('[id$="_chart"] svg'); return {toca, abierta:card.classList.contains('open'), ancho:svg?Math.round(svg.getBoundingClientRect().width):0}; })()`);
A.ok(abre.toca && abre.abierta && abre.ancho > 200, 'tocar una tarjeta de «Récords» la abre y dibuja su gráfica', abre);
const cierra = await ev(`(()=>{ const card=document.querySelector('#cn-exprog-list .exprog-card'); card.querySelector('.exprog-header').click(); return card.classList.contains('open'); })()`);
A.ok(cierra === false, 'tocarla otra vez la cierra', cierra);

// ── 8. Una asesorada nueva no ve pestañas en blanco ──
await ev(MONTAR(false)); await sleep(700);
const vacios = {};
for (const t of ['resumen', 'historial', 'records', 'logros']) {
  await ev(`progTab('${t}')`); await sleep(250);
  vacios[t] = await ev(`(()=>{ const s=document.querySelector('.pg-sec[data-pt="${t}"]'); return (s.innerText||'').replace(/\\s+/g,' ').trim().slice(0,90); })()`);
}
A.ok(Object.values(vacios).every(x => x.length > 10), 'una asesorada nueva ve en cada pestaña qué esperar (ninguna en blanco)', vacios);
A.ok(/primer entreno/.test(vacios.logros), 'Logros le dice que su nivel aparece con su primer entreno', vacios.logros);
await ev(MONTAR(true)); await sleep(700);

// ── 9. Nada se sale; «Muy grande»; contraste en los dos temas ──
const lado = [];
for (const t of ['resumen', 'historial', 'records', 'logros']) {
  await ev(`progTab('${t}')`); await sleep(250);
  const w = await ev(`(()=>{ const sc=document.querySelector('#cn-history').closest('.cnbody'); return Math.max(document.documentElement.scrollWidth-innerWidth, sc.scrollWidth-sc.clientWidth); })()`);
  if (w > 0) lado.push({ t, w });
}
A.ok(lado.length === 0, 'ninguna pestaña se puede arrastrar de lado a 360 px', lado);
await ev(`document.documentElement.setAttribute('data-fs','xl')`); await sleep(700);
const zoom = await ev(`Number(getComputedStyle(document.getElementById('cn-history')).zoom)||1`);
A.ok(zoom > 1.3, 'CONTROL: con «Muy grande» la pantalla de verdad crece (si no, lo de abajo no prueba nada)', zoom);
await ev(`progTab('logros')`); await sleep(500);
const xl = await ev(`(()=>{ const seg=document.querySelector('#pg-tabs .dt-seg'); const sr=seg.getBoundingClientRect();
  const bs=[...document.querySelectorAll('#pg-tabs .dt-tab')].map(b=>{ const r=b.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {t:b.dataset.t, dentro:r.left>=sr.left-1&&r.right<=sr.right+1, toca:el===b||b.contains(el), top:Math.round(r.top)}; });
  return {bs, desliza:seg.scrollWidth>seg.clientWidth+1, filas:new Set(bs.map(b=>b.top)).size}; })()`);
A.ok(xl.bs.every(b => b.dentro && b.toca) && !xl.desliza, 'con «Muy grande» las cuatro pestañas se ven enteras y se tocan (ninguna asoma cortada)', xl);
const ladoXl = [];
for (const t of ['resumen', 'historial', 'records', 'logros']) {
  await ev(`progTab('${t}')`); await sleep(300);
  const w = await ev(`(()=>{ const sc=document.querySelector('#cn-history').closest('.cnbody'); return Math.max(document.documentElement.scrollWidth-innerWidth, sc.scrollWidth-sc.clientWidth); })()`);
  if (w > 0) ladoXl.push({ t, w });
}
A.ok(ladoXl.length === 0, 'con «Muy grande» ninguna pestaña se arrastra de lado (las medallas de Logros caben)', ladoXl);
await ev(`progTab('resumen')`); await sleep(250);
await ev(`renderClientHistory('demo')`); await sleep(300);
await tocar('#pg-tabs .dt-tab[data-t="historial"]'); await sleep(400);
const vol = await ev(`(()=>{ const con=document.getElementById('vol-chart'); const svg=con&&con.querySelector('svg'); if(!svg) return {falta:true};
  return {caja:con.offsetWidth, dibujo:Number((svg.getAttribute('viewBox')||'').split(' ')[2])||0}; })()`);
A.ok(!vol.falta && vol.caja > 100 && Math.abs(vol.dibujo - Math.max(vol.caja, 200)) <= 2, 'la gráfica de volumen se dibuja con el ancho de su caja (piso 200) al entrar a «Historial» (no sale chica)', vol);
await ev(`document.documentElement.removeAttribute('data-fs')`); await sleep(500);
const CONTRASTE = `(()=>{ const rgb=s=>(String(s).match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
  const L=c=>{const a=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];};
  const fondo=el=>{ while(el){ const b=getComputedStyle(el).backgroundColor; const m=String(b).match(/[\\d.]+/g); if(m&&(m.length<4||Number(m[3])>0.95)) return rgb(b); el=el.parentElement; } return [255,255,255]; };
  const r=el=>{ const a=L(rgb(getComputedStyle(el).color)), b=L(fondo(el)); return Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05))*100)/100; };
  const peor=[...document.querySelectorAll('.pg-sec[data-pt="resumen"] .sstat-n, .pg-sec[data-pt="resumen"] .sstat-l, .pg-sec[data-pt="resumen"] .adv-bal-seg')]
    .filter(e=>e.getBoundingClientRect().height>0&&(e.textContent||'').trim()).map(e=>({c:e.className, t:(e.textContent||'').trim().slice(0,12), r:r(e)})).sort((a,b)=>a.r-b.r);
  return {tab:r(document.querySelector('#pg-tabs .dt-tab[aria-selected="false"]')), sel:r(document.querySelector('#pg-tabs .dt-tab[aria-selected="true"]')), n:peor.length, peor:peor[0]}; })()`;
for (const tema of ['light', 'dark']) {
  await ev(`setTheme('${tema}')`); await ev(`progTab('resumen')`); await sleep(400);
  const c = await ev(CONTRASTE);
  A.ok(c.tab >= 4.5 && c.sel >= 4.5, `tema ${tema}: las pestañas se leen (4,5:1)`, c);
  A.ok(c.n >= 6 && c.peor.r >= 4.5, `tema ${tema}: los números, etiquetas y la barra del Resumen se leen (4,5:1)`, c);
}

salir(A, { chrome, srv });
