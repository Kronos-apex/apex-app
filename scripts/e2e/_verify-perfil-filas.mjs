// Harness de v708 — EL PERFIL DEL ASESORADO EN FILAS (lote 3 del estudio de organización, decisión del PO del
// 11-oct-2026). Sin login: monta una asesorada de prueba y recorre su Perfil a 360 px:
//   · el Perfil enseña seis filas (Mis datos · Récords · Plan de alimentación · Peso · Medidas · Fotos) con su
//     dato, y ninguna sección completa;
//   · cada fila se toca, abre SU pantalla con su título y su contenido se ve; el atrás la cierra;
//   · lo que se registra dentro (una pesada) se ve en la fila al volver;
//   · una ventana que se abre desde dentro (registrar medidas) queda ENCIMA y el atrás la cierra primero;
//   · con el plan vencido las filas dicen lo mismo que su candado; el peso no lleva candado;
//   · con «Muy grande» y en los dos temas nada se sale y el texto se lee.
//   node scripts/e2e/_verify-perfil-filas.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { afirmador, salir } from './_afirma.mjs';

const A = afirmador('el Perfil del asesorado en filas');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(process.env.TEMP || '.', 'avi-v708-shots'); mkdirSync(OUT, { recursive: true });
const PORT = 8899, DP = 9409, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: ROOT });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/perfilfilas-' + Date.now(), '--no-first-run', '--window-size=360,800', APP]);
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
const shot = async nombre => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, nombre + '.png'), Buffer.from(r.data, 'base64')); };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await sleep(600);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}localStorage.clear();})()`);
await send('Page.navigate', { url: APP });
A.ok(await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof renderClientProfile==='function' && typeof perfilAbrir==='function'`), 'la app terminó de arrancar');
A.ok(await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000), 'la pantalla de carga ya se fue');

// ── Montaje: una asesorada con todo (récords, pesadas, medidas, fotos y plan de su coach). ──
const MONTAR = tier => `(()=>{try{
  window.svNow=async()=>true; window.sbSet=async()=>true;
  const hace=n=>new Date(Date.now()-n*86400000).toISOString();
  let bw=[]; for(let w=4;w>=0;w--){ const d=new Date(Date.now()-w*7*86400000); bw=bwUpsert(bw,d.toISOString().split('T')[0],+(62-w*0.3).toFixed(1),d.toISOString()); }
  let med=[]; med=medUpsert(med,{cintura:76,brazo_der:28.5},hace(23))||med;
  const prs={e1:{name:'Press de Banca',kg:40,reps:8,date:hace(3)},e14:{name:'Hip Thrust con Barra',kg:110,reps:10,date:hace(5)},e7:{name:'Press Militar',kg:20,reps:10,date:hace(9)}};
  DB.clients=[{id:'demo',name:'Mariana Prueba',sex:'F',goal:'Recomposición',level:'Intermedio',days:4,weight:61,height:164,age:29,${tier ? "tier:'" + tier + "'," : ''}
    payments:[{date:hace(10),dueDate:new Date(Date.now()+20*86400000).toISOString(),amount:150000}],routines:[],habits:{water:{},steps:{}}}];
  DB.history={demo:[]}; DB.prs={demo:prs}; DB.bodyweight={demo:bw}; DB.medidas={demo:med};
  DB.photos={demo:[{id:'p1',date:hace(30),url:'data:image/png;base64,iVBORw0KGgo='},{id:'p2',date:hace(2),url:'data:image/png;base64,iVBORw0KGgo='}]};
  DB.nutrition={demo:{kcal:2000,prot:130,carbs:220,fat:65,meals:4,water:9,plan:'Cuatro comidas.'}};
  CUR.clientId='demo'; CUR.loggedAs='client';
  showScreen('s-client');
  const t=[...document.querySelectorAll('.cntab')].find(x=>/Perfil/.test(x.textContent)); cnTab('cn-profile',t,true);
  renderClientProfile(DB.clients[0]);
  return {ok:true};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`;
const m = await ev(MONTAR(null)); await sleep(700);
A.ok(m && m.ok, 'montaje: una asesorada con récords, pesadas, medidas, fotos y plan', m);

const FILAS = `[...document.querySelectorAll('#cn-prof-rows .aj-row')].map(b=>({sec:b.dataset.pfRow, lbl:b.querySelector('.aj-lbl').textContent, val:b.querySelector('.aj-val').textContent}))`;
// ── 1. Seis filas con su dato, y ninguna sección completa a la vista ──
const f = await ev(FILAS);
A.ok(f.map(x => x.sec).join() === 'datos,records,comida,peso,medidas,fotos', 'el Perfil enseña las seis filas en orden', f.map(x => x.sec));
const val = Object.fromEntries(f.map(x => [x.sec, x.val]));
A.ok(val.datos === '29 años · 164 cm' && val.records === '3 récords' && val.comida === 'Armado por tu coach'
  && val.peso === '62 kg' && val.medidas === 'Hace 3 semanas' && val.fotos === '2 fotos', 'cada fila dice su dato', val);
const vis = await ev(`(()=>{ const g=document.getElementById('prof-guardado'); return {guardadoOculto:getComputedStyle(g).display==='none', tarjetasVisibles:[...document.querySelectorAll('#cn-profile [data-pf]')].filter(n=>n.getBoundingClientRect().height>0).length}; })()`);
A.ok(vis.guardadoOculto && vis.tarjetasVisibles === 0, 'en el Perfil no queda ninguna sección completa a la vista', vis);
const alto = await ev(`(()=>{ const p=document.getElementById('cn-profile'); const kids=[...p.children].filter(e=>getComputedStyle(e).display!=='none'); const top=p.getBoundingClientRect().top; return Math.round(Math.max(...kids.map(e=>e.getBoundingClientRect().bottom))-top); })()`);
console.log('  · alto del Perfil a 360×800: ' + alto + ' px');
await shot('perfil-claro');

// ── 2. Cada fila se toca, abre SU pantalla y su contenido se ve; el atrás la cierra ──
const TIT = { datos: 'Mis datos', records: 'Mis récords', comida: 'Mi plan de alimentación', peso: 'Mi peso', medidas: 'Mis medidas', fotos: 'Mis fotos de progreso' };
const DENTRO = { datos: 'cn-prof-data', records: 'cn-pr-list', comida: 'cn-nut-body', peso: 'bw-list', medidas: 'cn-med-list', fotos: 'cn-photos-grid' };
for (const sec of Object.keys(TIT)) {
  const r = await ev(`(()=>{ const b=document.querySelector('#cn-prof-rows [data-pf-row="${sec}"]'); b.scrollIntoView({block:'center'}); const q=b.getBoundingClientRect();
    const el=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2); const toca=el===b||b.contains(el); if(toca) b.click(); return {toca, alto:Math.round(q.height)}; })()`);
  await sleep(450);
  const a = await ev(`(()=>{ const room=document.getElementById('perfil-room'); const el=document.getElementById('${DENTRO[sec]}'); const r=el.getBoundingClientRect();
    return {abierta:room.classList.contains('on'), titulo:document.getElementById('pfroom-t').textContent, dentro:room.contains(el), alto:Math.round(r.height), arriba:Number(getComputedStyle(room).zIndex)}; })()`);
  A.ok(r.toca && r.alto >= 44 && a.abierta && a.titulo === TIT[sec] && a.dentro && a.alto > 0, `la fila «${TIT[sec]}» se toca (≥44 px) y abre su pantalla con su contenido`, { r, a });
  if (sec === 'medidas') await shot('perfil-medidas');
  await ev(`history.back()`); await sleep(500);
  const c = await ev(`({abierta:document.getElementById('perfil-room').classList.contains('on'), perfil:document.getElementById('cn-profile').classList.contains('on')})`);
  A.ok(!c.abierta && c.perfil, `el atrás cierra «${TIT[sec]}» y deja el Perfil`, c);
}

// ── 3. Lo que se registra dentro se ve en la fila al volver ──
await ev(`perfilAbrir('peso')`); await sleep(400);
await ev(`(()=>{ const i=document.getElementById('bw-kg'); i.value='60.5'; logBodyWeight(); })()`); await sleep(500);
await ev(`history.back()`); await sleep(500);
const peso = await ev(`document.querySelector('#cn-prof-rows [data-pf-row="peso"] .aj-val').textContent`);
A.ok(peso === '60,5 kg', 'registrar una pesada dentro de «Mi peso» se ve en la fila al volver', peso);

// ── 4. Una ventana abierta desde dentro queda ENCIMA y el atrás la cierra primero ──
await ev(`perfilAbrir('medidas')`); await sleep(400);
await ev(`openMedModal()`); await sleep(500);
const mod = await ev(`(()=>{ const md=document.querySelector('.mdbg.on'); if(!md) return {abierto:false}; const r=md.querySelector('.md').getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+30); return {abierto:true, encima:md.contains(el)}; })()`);
A.ok(mod.abierto && mod.encima, 'registrar medidas desde «Mis medidas» abre su ventana ENCIMA de la pantalla', mod);
await ev(`history.back()`); await sleep(450);
const tras1 = await ev(`({modal:!!document.querySelector('.mdbg.on'), sala:document.getElementById('perfil-room').classList.contains('on')})`);
A.ok(!tras1.modal && tras1.sala, 'el atrás cierra primero la ventana y deja abierta «Mis medidas»', tras1);
await ev(`history.back()`); await sleep(450);

// ── 5. Con el plan vencido, las filas dicen lo mismo que su candado (y el peso no lleva candado) ──
await ev(`(()=>{ const c=DB.clients[0]; c.payments=[{date:new Date(Date.now()-60*86400000).toISOString(),dueDate:new Date(Date.now()-30*86400000).toISOString(),amount:150000}]; renderClientProfile(c); })()`); await sleep(400);
const venc = await ev(`(()=>{ const c=DB.clients[0]; return {bloq:premiumLocked(c), salida:planLockExit(c), filas:${FILAS}}; })()`);
const vv = Object.fromEntries(venc.filas.map(x => [x.sec, x.val]));
A.ok(venc.bloq, 'CONTROL: con el plan vencido hace 30 días, la app la trata como bloqueada', venc.bloq);
const esperado = { 'renovar-pro': 'Al renovar tu AVI PRO', 'coach-chat': 'Al renovar tu plan', coach: 'Con el coaching', opciones: 'Con AVI PRO o un coach' }[venc.salida];
A.ok(['records', 'comida', 'medidas', 'fotos'].every(s => vv[s] === esperado) && vv.peso === '60,5 kg', `las filas con candado dicen «${esperado}» (lo mismo que su candado) y el peso sigue libre`, vv);
await ev(`perfilAbrir('records')`); await sleep(400);
const cand = await ev(`document.getElementById('cn-pr-list').innerText`);
A.ok(/Tus récords/.test(cand) && cand.length > 10, 'y al abrir una, se ve su candado', cand.slice(0, 120));
await ev(`history.back()`); await sleep(400);
await ev(MONTAR(null)); await sleep(500);

// ── 5b. Lo que cazó el QA: el candado DENTRO de una pantalla funciona, y no hay acciones junto a él ──
const tocarCentro = sel => ev(`(()=>{ const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return {falta:true}; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); const ok=el===b||b.contains(el); if(ok) b.click(); return {ok}; })()`);
// a) AVI FREE: «Ver cómo desbloquearlo» abre la ventana de venta ENCIMA de la pantalla.
await ev(`(()=>{ const c=DB.clients[0]; c.tier='libre'; c.payments=[]; renderClientProfile(c); perfilAbrir('records'); })()`); await sleep(500);
const accLibre = await ev(`[...document.querySelectorAll('#pfroom-body .ch button')].filter(b=>b.getBoundingClientRect().height>0).length`);
const tq = await tocarCentro('#cn-pr-list button'); await sleep(450);
const up = await ev(`(()=>{ const u=document.getElementById('premium-upsell'); const r=u.getBoundingClientRect(); const el=document.elementFromPoint(innerWidth/2,innerHeight/2); return {on:u.classList.contains('on'), encima:u.contains(el)}; })()`);
A.ok(tq.ok && up.on && up.encima, 'con AVI FREE, el botón del candado de «Mis récords» abre la ventana de venta ENCIMA de la pantalla', { tq, up });
await ev(`history.back()`); await sleep(450);
const tras = await ev(`({upsell:document.getElementById('premium-upsell').classList.contains('on'), sala:document.getElementById('perfil-room').classList.contains('on')})`);
A.ok(!tras.upsell && tras.sala, 'el atrás cierra la ventana de venta y deja «Mis récords»', tras);
await ev(`history.back()`); await sleep(400);
// b) Con candado, la cabecera no ofrece acciones (Subir / + Registrar / WhatsApp), y subir una foto no se deja.
let accs = {};
for (const sec of ['comida', 'medidas', 'fotos']) { await ev(`perfilAbrir('${sec}')`); await sleep(350);
  accs[sec] = await ev(`[...document.querySelectorAll('#pfroom-body .ch button')].filter(b=>b.getBoundingClientRect().height>0).map(b=>b.textContent.trim())`);
  await ev(`history.back()`); await sleep(350); }
A.ok(accLibre === 0 && Object.values(accs).every(a => a.length === 0), 'con candado, ninguna pantalla ofrece «Subir», «+ Registrar» ni «WhatsApp» junto al candado', accs);
const fotosAntes = await ev(`(DB.photos.demo||[]).length`);
await ev(`openPhotosModal()`); await sleep(300);
A.ok(!(await ev(`document.getElementById('m-photos').classList.contains('on')`)), 'y subir una foto con la cuenta bloqueada no abre nada (el candado va en la acción)', fotosAntes);
// c) Plan con coach vencido: «Hablar con mi coach» cierra la pantalla y lleva a Mensajes.
await ev(`(()=>{ const c=DB.clients[0]; delete c.tier; c.payments=[{date:new Date(Date.now()-60*86400000).toISOString(),dueDate:new Date(Date.now()-30*86400000).toISOString(),amount:150000}]; renderClientProfile(c); perfilAbrir('fotos'); })()`); await sleep(500);
const chat = await tocarCentro('#cn-photos-grid button'); await sleep(700);
const enChat = await ev(`({sala:document.getElementById('perfil-room').classList.contains('on'), mensajes:document.getElementById('cn-messages').classList.contains('on')})`);
A.ok(chat.ok && !enChat.sala && enChat.mensajes, 'con el plan vencido, «Hablar con mi coach» cierra la pantalla y lleva a Mensajes', { chat, enChat });
await ev(MONTAR(null)); await sleep(500);
// d) El visor de una foto: el atrás lo cierra a ÉL y deja «Mis fotos».
await ev(`perfilAbrir('fotos')`); await sleep(400);
await ev(`viewPhoto('p2','demo')`); await sleep(400);
const visorAntes = await ev(`!!document.getElementById('ph-visor')`);
await ev(`history.back()`); await sleep(500);
const visor = await ev(`({visor:!!document.getElementById('ph-visor'), sala:document.getElementById('perfil-room').classList.contains('on')})`);
A.ok(visorAntes && !visor.visor && visor.sala, 'con una foto ampliada, el atrás cierra la foto y deja «Mis fotos»', visor);
await ev(`history.back()`); await sleep(400);
// e) Sin edad ni estatura, «Mis datos» dice lo que falta (no manda a completar algo que esa pantalla no deja).
await ev(`(()=>{ const c=DB.clients[0]; delete c.age; delete c.height; renderClientProfile(c); })()`); await sleep(300);
A.ok((await ev(`document.querySelector('#cn-prof-rows [data-pf-row="datos"] .aj-val').textContent`)) === 'Sin edad ni estatura', '«Mis datos» sin edad ni estatura dice lo que falta');
await ev(MONTAR(null)); await sleep(500);

// ── 6. «Muy grande» y los dos temas ──
await ev(`document.documentElement.setAttribute('data-fs','xl')`); await sleep(700);
await ev(`perfilAbrir('peso')`); await sleep(600);
const z = await ev(`(()=>{ const b=document.getElementById('pfroom-body'); const main=document.documentElement; return {zoom:Number(getComputedStyle(b).zoom)||b.currentCSSZoom||1, lado:Math.max(main.scrollWidth-innerWidth, b.scrollWidth-b.clientWidth)}; })()`);
A.ok(z.zoom > 1.3 && z.lado <= 0, 'con «Muy grande» la pantalla de la fila crece y no se sale de lado', z);
await ev(`history.back()`); await sleep(400);
const ladoPerfil = await ev(`(()=>{ const c=document.querySelector('#s-client .cnbody')||document.documentElement; return Math.max(document.documentElement.scrollWidth-innerWidth, c.scrollWidth-c.clientWidth); })()`);
A.ok(ladoPerfil <= 0, 'con «Muy grande» el Perfil no se puede arrastrar de lado', ladoPerfil);
await ev(`document.documentElement.removeAttribute('data-fs')`); await sleep(500);
const CONTRASTE = `(()=>{ const rgb=s=>(String(s).match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
  const L=c=>{const a=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];};
  const fondo=el=>{ while(el){ const b=getComputedStyle(el).backgroundColor; const m=String(b).match(/[\\d.]+/g); if(m&&(m.length<4||Number(m[3])>0.95)) return rgb(b); el=el.parentElement; } return [255,255,255]; };
  const r=el=>{ const a=L(rgb(getComputedStyle(el).color)), b=L(fondo(el)); return Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05))*100)/100; };
  const fila=document.querySelector('#cn-prof-rows .aj-row'); return {lbl:r(fila.querySelector('.aj-lbl')), val:r(fila.querySelector('.aj-val'))}; })()`;
for (const tema of ['light', 'dark']) {
  await ev(`setTheme('${tema}')`); await sleep(400);
  const c = await ev(CONTRASTE);
  A.ok(c.lbl >= 4.5 && c.val >= 4.5, `tema ${tema}: el texto de las filas llega a 4,5:1`, c);
  if (tema === 'dark') await shot('perfil-oscuro');
}

salir(A, { chrome, srv });
