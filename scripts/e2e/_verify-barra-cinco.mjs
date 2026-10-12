// Harness de v710 — LA BARRA DE CINCO (lote 5 del estudio de organización, decisión del PO del 11-oct-2026):
// Hoy · Rutinas · Progreso · Mensajes · Perfil; Comunidad sale de la barra y se entra desde Progreso › Resumen.
// Sin login: monta una asesorada de prueba y recorre la barra a 360 px:
//   · cinco pestañas, en el orden del estudio, que caben, se tocan y abren su pantalla con ELLA marcada;
//   · la fila «Comunidad» del Resumen abre Comunidad con «Progreso» marcada, y el atrás vuelve a Progreso;
//   · «Ver a mi gente» (el aviso de Hoy) entra por la misma puerta;
//   · la pestaña marcada se deriva de la pantalla abierta: quien la pasa por su posición vieja no marca otra;
//   · nada se borró: Comunidad sigue ahí, con su ayuda;
//   · con «Muy grande» los rótulos caben, la fila no se sale y se lee en los dos temas.
//   node scripts/e2e/_verify-barra-cinco.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { afirmador, salir, liberarPuerto, cuidarProcesos } from './_afirma.mjs';

const A = afirmador('La barra de cinco');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(process.env.TEMP || '.', 'avi-v710-shots'); mkdirSync(OUT, { recursive: true });
const PORT = 8906, DP = 9416, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
liberarPuerto(PORT); liberarPuerto(DP);
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: ROOT });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/barra5-' + Date.now(), '--no-first-run', '--window-size=360,800', APP]);
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
A.ok(await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof cnTab==='function' && typeof cnOpenCommunity==='function'`), 'la app terminó de arrancar');
A.ok(await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000), 'la pantalla de carga ya se fue');

// Montaje: una asesorada con entrenos; Comunidad no llega a la red (escrituras selladas, lectura sin sesión).
const m = await ev(`(()=>{try{
  window.svNow=async()=>true; window.sbSet=async()=>true;
  const hace=n=>new Date(Date.now()-n*86400000).toISOString();
  const ses=k=>({id:'s'+k,sessionId:'s'+k,routineId:'r1',routineName:'Pierna',date:hace(k*3+1),finishedAt:hace(k*3+1),doneSets:6,totalSets:6,duration:3000,totalVol:4000+(8-k)*80,
    exercises:[{id:'e14',name:'Hip Thrust con Barra',track:'peso_reps',sets:[1,2,3].map(()=>({kg:String(80+(8-k)*2.5),reps:'10',done:true}))}]});
  DB.clients=[{id:'demo',name:'Mariana Prueba',sex:'F',goal:'Recomposición',level:'Intermedio',days:3,age:29,height:164,weight:61,
    payments:[{date:hace(10),dueDate:new Date(Date.now()+20*86400000).toISOString(),amount:150000}],routines:[],habits:{water:{},steps:{}}}];
  DB.history={demo:[0,1,2,3,4,5,6,7].map(ses)}; DB.prs={demo:{}}; DB.bodyweight={demo:[]}; DB.medidas={demo:[]}; DB.photos={demo:[]}; DB.nutrition={}; DB.msgs={demo:[]};
  CUR.clientId='demo'; CUR.loggedAs='client'; CUR.progTab=undefined;
  showScreen('s-client'); cnTab('cn-today',null);
  return {ok:true};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`);
A.ok(m && m.ok, 'montaje: una asesorada con 8 entrenos', m);
await ev(`(()=>{ const nt=document.getElementById('news-tour'); if(nt&&!nt.classList.contains('hidden')&&typeof ntClose==='function') ntClose(false); })()`); await sleep(300);

const ESTADO = `(()=>({ abierta:(document.querySelector('#s-client .cnp.on')||{}).id||null,
  marcadas:[...document.querySelectorAll('.cntab.on')].map(t=>t.dataset.cn) }))()`;
// Pasar por «Hoy» abre el tour de novedades (normal en la app): se cierra como lo haría la persona, o tapa todo.
const cerrarTour = async () => { await ev(`(()=>{ const nt=document.getElementById('news-tour'); if(nt&&!nt.classList.contains('hidden')&&typeof ntClose==='function') ntClose(false); })()`); await sleep(200); };
const tocar = async sel => { await cerrarTour(); return ev(`(()=>{ const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return {falta:true}; b.scrollIntoView({block:'nearest'}); const r=b.getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); const ok=el===b||b.contains(el); if(ok) b.click(); return {ok}; })()`); };

// ── 1. Cinco pestañas, en el orden del estudio, que caben y se tocan ──
const MEDIR = `(()=>[...document.querySelectorAll('.cntab')].map(t=>{ const r=t.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  const rg=document.createRange(); const tx=[...t.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()); let lineas=0, ancho=0;
  if(tx){ rg.selectNodeContents(tx); const cs=[...rg.getClientRects()]; lineas=new Set(cs.map(c=>Math.round(c.top))).size; ancho=Math.max(...cs.map(c=>c.width)); }
  return {cn:t.dataset.cn, rot:(t.textContent||'').trim(), alto:Math.round(r.height), toca:el===t||t.contains(el), lineas, cabe:ancho<=r.width-2}; }))()`;
await cerrarTour();
const b0 = await ev(MEDIR);
A.ok(b0.map(t => t.cn).join() === 'cn-today,cn-routines,cn-history,cn-messages,cn-profile' && b0.map(t => t.rot).join() === 'Hoy,Rutinas,Progreso,Mensajes,Perfil',
  'la barra tiene cinco pestañas, en el orden del estudio (Hoy · Rutinas · Progreso · Mensajes · Perfil)', b0.map(t => t.rot));
A.ok(b0.every(t => t.toca && t.alto >= 44 && t.lineas === 1 && t.cabe), 'las cinco caben en una línea, miden ≥44 px y reciben el toque', b0);
A.ok(await ev(`!!document.getElementById('cn-community')`), 'nada se borró: la pantalla de Comunidad sigue ahí');

// ── 2. Cada pestaña abre su pantalla y queda marcada ELLA, sola ──
for (const cn of ['cn-routines', 'cn-history', 'cn-messages', 'cn-profile', 'cn-today']) {
  const tq = await tocar(`.cntab[data-cn="${cn}"]`); await sleep(350);
  const e = await ev(ESTADO);
  A.ok(tq.ok && e.abierta === cn && e.marcadas.join() === cn, `tocar «${cn}» abre su pantalla y la marca sola`, { tq, e });
}

// ── 3. Comunidad, desde Progreso › Resumen ──
await tocar('.cntab[data-cn="cn-history"]'); await sleep(400);
await ev(`progTab('resumen')`); await sleep(300);
const fila = await ev(`(()=>{ const b=document.getElementById('pg-cmty'); if(!b) return {falta:true}; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return {alto:Math.round(r.height), toca:el===b||b.contains(el), txt:(b.innerText||'').replace(/\\s+/g,' ').trim()}; })()`);
A.ok(!fila.falta && fila.alto >= 44 && fila.toca && /Comunidad/.test(fila.txt), 'en Progreso › Resumen está la fila «Comunidad», se ve y recibe el toque', fila);
await shot('progreso-resumen-comunidad');
const largo0 = await ev(`history.length`);
const bajada = await ev(`document.getElementById('pg-cmty').closest('.cnbody').scrollTop`);
A.ok(bajada > 0, 'CONTROL: la pantalla está bajada al tocar la fila (si no, «Comunidad empieza arriba» no prueba nada)', bajada);
const tq = await tocar('#pg-cmty'); await sleep(700);
let e = await ev(ESTADO);
const pinto = await ev(`(document.getElementById('cn-community').innerText||'').trim().length`);
A.ok(tq.ok && e.abierta === 'cn-community' && e.marcadas.join() === 'cn-history' && pinto > 10, 'tocarla abre Comunidad, con «Progreso» marcada y la pantalla pintada', { tq, e, pinto });
A.ok((await ev(`history.length`)) === largo0 + 1, 'entrar a Comunidad añade UN paso al atrás', { antes: largo0, despues: await ev(`history.length`) });
A.ok((await ev(`document.getElementById('cn-community').closest('.cnbody').scrollTop`)) === 0, 'Comunidad empieza arriba');
await shot('comunidad');
await ev(`history.back()`); await sleep(700);
e = await ev(ESTADO);
A.ok(e.abierta === 'cn-history' && e.marcadas.join() === 'cn-history' && (await ev(`CUR.progTab`)) === 'resumen', 'el atrás desde Comunidad vuelve a Progreso, en el Resumen', e);
await ev(`history.back()`); await sleep(700); await cerrarTour();
e = await ev(ESTADO);
A.ok(e.abierta === 'cn-today' && e.marcadas.join() === 'cn-today', 'y el siguiente atrás vuelve a Hoy', e);

// ── 4. «Ver a mi gente» (el aviso de Hoy) entra por la misma puerta ──
await ev(`cmtyNudgeGo()`); await sleep(500);
e = await ev(ESTADO);
A.ok(e.abierta === 'cn-community' && e.marcadas.join() === 'cn-history', '«Ver a mi gente» abre Comunidad con «Progreso» marcada', e);
await tocar('.cntab[data-cn="cn-history"]'); await sleep(400);
e = await ev(ESTADO);
A.ok(e.abierta === 'cn-history', 'desde Comunidad, tocar «Progreso» vuelve a Progreso', e);

// ── 5. La marcada sale de la pantalla abierta: quien pasa la pestaña por su posición VIEJA no marca otra ──
await ev(`cnTab('cn-messages', document.querySelectorAll('.cntab')[2])`); await sleep(300);
e = await ev(ESTADO);
A.ok(e.abierta === 'cn-messages' && e.marcadas.join() === 'cn-messages', 'cnTab con la pestaña por posición vieja marca Mensajes, no Progreso', e);
await ev(`cnTab('cn-history', null)`); await sleep(300);
e = await ev(ESTADO);
A.ok(e.marcadas.join() === 'cn-history', 'cnTab sin pestaña igual marca la suya', e);
const mapa = await ev(`['cn-today','cn-routines','cn-history','cn-messages','cn-profile','cn-community'].map(id=>(_cnTabEl(id)||{}).textContent||'').map(x=>x.trim())`);
A.ok(mapa.join() === 'Hoy,Rutinas,Progreso,Mensajes,Perfil,Progreso', 'cada pantalla sabe cuál es su pestaña (Comunidad → Progreso)', mapa);

// ── 6. La ayuda de Comunidad sigue saliendo en Comunidad, y la de Progreso la nombra ──
await ev(`cnOpenCommunity()`); await sleep(400);
await ev(`openHelp()`); await sleep(300);
const ay = await ev(`(document.getElementById('help-title').innerText||'')+' | '+(document.getElementById('help-body').innerText||'').slice(0,160)`);
A.ok(/Comunidad/.test(ay) && /Progreso/.test(ay), 'la ayuda en Comunidad es la de Comunidad y dice que se abre desde Progreso', ay);
await ev(`(()=>{ const m=document.getElementById('m-help'); if(m&&typeof cm==='function') cm('m-help'); })()`); await sleep(200);

// ── 6b. QA Lucas: cambiar de pantalla empieza arriba (un solo scroller para todas) ──
await tocar('.cntab[data-cn="cn-history"]'); await sleep(300); await ev(`progTab('resumen')`); await sleep(300);
const bajo = await ev(`(()=>{ const sc=document.getElementById('cn-history').closest('.cnbody'); sc.scrollTop=sc.scrollHeight; return sc.scrollTop; })()`);
A.ok(bajo > 100, 'CONTROL: Progreso quedó bajado antes de cambiar de pestaña', bajo);
await tocar('.cntab[data-cn="cn-profile"]'); await sleep(400);
const arriba = await ev(`document.getElementById('cn-profile').closest('.cnbody').scrollTop`);
A.ok(arriba === 0, 'tocar «Perfil» desde el final de Progreso abre Perfil arriba', arriba);

// ── 7. «Muy grande» y los dos temas ──
await ev(`document.documentElement.setAttribute('data-fs','xl')`); await sleep(700);
await tocar('.cntab[data-cn="cn-history"]'); await sleep(300); await ev(`progTab('resumen')`); await sleep(400);
const zoom = await ev(`Number(getComputedStyle(document.getElementById('cn-history')).zoom)||1`);
A.ok(zoom > 1.3, 'CONTROL: con «Muy grande» la pantalla de verdad crece', zoom);
const bxl = await ev(MEDIR);
A.ok(bxl.every(t => t.toca && t.lineas === 1 && t.cabe), 'con «Muy grande» los cinco rótulos caben en una línea', bxl);
const filaXl = await ev(`(()=>{ const b=document.getElementById('pg-cmty'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); const sc=b.closest('.cnbody');
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); const pb=document.getElementById('install-banner'), pr=pb.getBoundingClientRect(); return {pildora:getComputedStyle(pb).display==='flex'&&pr.height>0, pildoraH:Math.round(pr.height), lbl:(()=>{ const l=b.querySelector('.aj-lbl'); return l.scrollWidth<=l.clientWidth+1; })(), toca:el===b||b.contains(el), en:el?(el.id||el.className||el.tagName):null, r:[Math.round(r.top),Math.round(r.bottom),Math.round(r.left),Math.round(r.right)], vh:innerHeight, dentro:r.right<=innerWidth+1&&r.left>=-1, lado:Math.max(document.documentElement.scrollWidth-innerWidth, sc.scrollWidth-sc.clientWidth)}; })()`);
A.ok(filaXl.pildora, 'CONTROL: la píldora «Instalar app» está a la vista (si no, «se toca» no prueba nada)', filaXl);
A.ok(filaXl.lbl, 'con «Muy grande» el título de la fila no se sale de su caja (no se monta en la descripción)', filaXl);
A.ok(filaXl.toca && filaXl.dentro && filaXl.lado <= 0, 'con «Muy grande» la fila de Comunidad cabe, se toca y nada se arrastra de lado', filaXl);
await shot('resumen-xl');
await ev(`document.documentElement.removeAttribute('data-fs')`); await sleep(500);
const CONTRASTE = `(()=>{ const rgb=s=>(String(s).match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
  const L=c=>{const a=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];};
  const fondo=el=>{ while(el){ const b=getComputedStyle(el).backgroundColor; const m=String(b).match(/[\\d.]+/g); if(m&&(m.length<4||Number(m[3])>0.95)) return rgb(b); el=el.parentElement; } return [255,255,255]; };
  const r=el=>{ const a=L(rgb(getComputedStyle(el).color)), b=L(fondo(el)); return Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05))*100)/100; };
  return {lbl:r(document.querySelector('#pg-cmty .aj-lbl')), val:r(document.querySelector('#pg-cmty .aj-sub')), tab:r(document.querySelector('.cntab:not(.on)'))}; })()`;
for (const tema of ['light', 'dark']) {
  await ev(`setTheme('${tema}')`); await sleep(400);
  const c = await ev(CONTRASTE);
  A.ok(c.lbl >= 4.5 && c.val >= 4.5 && c.tab >= 4.5, `tema ${tema}: la fila de Comunidad y la barra se leen (4,5:1)`, c);
}

salir(A, { chrome, srv });
