// Harness de v707 — LA FICHA DEL ASESORADO EN PESTAÑAS (lote 2 del estudio de organización, decisión
// del PO del 11-oct-2026: Resumen · Entreno · Comida · Cuerpo · Pagos). Sin login: monta dos asesorados
// de prueba y recorre la ficha como el coach, a 360 px:
//   · al entrar se ve SOLO el Resumen; cada pestaña enseña solo lo suyo;
//   · las cinco caben y se tocan con la letra normal; con «Muy grande» la elegida se trae a la vista;
//   · «Para revisar» lleva a la pestaña donde se resuelve y la pestaña lleva su marca;
//   · re-pintar la misma ficha no la saca de su pestaña; otra persona abre en Resumen;
//   · el atrás vuelve a la lista (no recorre pestañas) y, al regresar a la ficha, recupera su pestaña;
//   · la barra queda fija al bajar y cambiar de pestaña vuelve al principio de la pestaña;
//   · nada se sale de la pantalla y el texto nuevo se lee en los dos temas.
//   node scripts/e2e/_verify-ficha-pestanas.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afirmador, salir, liberarPuerto, cuidarProcesos } from './_afirma.mjs';

const A = afirmador('la ficha del asesorado en pestañas');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 8898, DP = 9408, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
liberarPuerto(PORT); liberarPuerto(DP);   // un servidor huérfano de otra corrida no puede tomarle el puerto
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: ROOT });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/fichapest-' + Date.now(), '--no-first-run', '--window-size=360,800', APP]);
cuidarProcesos(chrome, srv);   // si el harness revienta, su servidor y su Chrome no quedan vivos
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await sleep(600);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}localStorage.clear();})()`);
await send('Page.navigate', { url: APP });
A.ok(await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof openDetail==='function' && typeof detailTab==='function'`), 'la app terminó de arrancar');
A.ok(await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000), 'la pantalla de carga ya se fue');

// ── Montaje: Ana tiene cosas por revisar (plan por vencer, descarga vencida) y Beto ninguna. ──
const m = await ev(`(()=>{try{
  window.svNow=async()=>true; window.pushToClient=()=>{};
  const d=k=>{const x=new Date();x.setDate(x.getDate()+k);return x.toISOString().slice(0,10);};
  const rut=n=>({id:'r'+n,name:'Rutina '+n,day:['Lunes','Martes','Jueves','Viernes'][n-1],restSec:90,exercises:Array.from({length:6},(_,i)=>({id:'e'+(i+1),name:'Ejercicio '+(i+1),muscle:'pecho',sets:3,reps:'10'}))});
  const ses=k=>({id:'s'+k,date:new Date(Date.now()-k*86400000).toISOString(),routineId:'r1',routineName:'Rutina 1',doneSets:18,totalSets:18,finishedAt:1,exercises:[]});
  DB.clients=[
    {id:'c1',name:'Ana Prueba',email:'ana@ejemplo.com',phone:'3001234567',goal:'Recomposición',level:'Intermedio',days:4,age:31,sex:'F',weight:64,height:163,tier:'premium',
     routines:[rut(1),rut(2),rut(3),rut(4)],payments:[{date:d(-27),dueDate:d(3),amount:150000}],deload:{from:d(-10),until:d(-3)},notes:'Cuida la zona lumbar en peso muerto.'},
    {id:'c2',name:'Beto Prueba',email:'beto@ejemplo.com',goal:'Ganar músculo',level:'Principiante',days:3,age:28,sex:'M',weight:78,height:178,tier:'premium',
     routines:[rut(1),rut(2),rut(3)],payments:[{date:d(-5),dueDate:d(25),amount:150000}]}];
  DB.history={c1:[ses(1),ses(3),ses(9),ses(11)],c2:[ses(2)]};
  DB.msgs={c1:[{from:'client',text:'¿Puedo cambiar el lunes por el martes?',date:new Date().toISOString()}],c2:[]};
  DB.prs={c1:{},c2:{}}; DB.bodyweight={c1:[],c2:[]}; DB.medidas={c1:[],c2:[]}; DB.photos={c1:[],c2:[]};
  DB.nutrition={c1:{kcal:2000,prot:140,carbs:210,fat:65,meals:4,water:9,plan:'Cuatro comidas.'},c2:{}};
  _heavyLoaded.c1=true; _heavyLoaded.c2=true; CUR.loggedAs='coach';
  showScreen('s-coach'); gp('p-clients',document.getElementById('sbi-clients'),'Asesorados');
  return {ok:true};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`);
A.ok(m && m.ok, 'montaje: dos asesorados de prueba', m);

const VIS = `(()=>{ const P=document.getElementById('p-detail'); return { tab:P.getAttribute('data-dtab'),
  vis:[...P.querySelectorAll('.dt-sec')].filter(s=>getComputedStyle(s).display!=='none').map(s=>s.getAttribute('data-dt')),
  sel:[...P.querySelectorAll('.dt-tab[aria-selected="true"]')].map(b=>b.getAttribute('data-t')) }; })()`;
const tocar = async sel => ev(`(()=>{ const b=document.querySelector(${JSON.stringify(sel)}); if(!b)return {ok:false,falta:true}; b.scrollIntoView({block:'nearest'}); const r=b.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); const ok=el===b||b.contains(el); if(ok) b.click(); return {ok, tapa:ok?null:(el&&(el.id||el.className))}; })()`);

// ── 1. Entrar a la ficha abre SOLO el Resumen ──
await ev(`openDetail('c1')`); await sleep(700);
let v = await ev(VIS);
A.ok(v.tab === 'resumen' && v.vis.length === 1 && v.vis[0] === 'resumen' && v.sel.join() === 'resumen', 'al entrar se ve solo el Resumen y su pestaña está marcada', v);

// ── 2. Las cinco caben y se tocan a 360 px con la letra normal ──
const barra = await ev(`(()=>{ const seg=document.querySelector('#d-tabs .dt-seg').getBoundingClientRect();
  return [...document.querySelectorAll('#d-tabs .dt-tab')].map(b=>{ const r=b.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {t:b.dataset.t, dentro:r.left>=seg.left-0.5&&r.right<=seg.right+0.5&&r.right<=innerWidth, alto:Math.round(r.height), toca:el===b||b.contains(el)}; }); })()`);
A.ok(barra.length === 5 && barra.every(b => b.dentro), 'las cinco pestañas se ven enteras sin deslizar la barra', barra);
A.ok(barra.every(b => b.toca && b.alto >= 36), 'las cinco miden ≥36 px y reciben el toque', barra);

// ── 3. Cada pestaña enseña solo lo suyo (y lo suyo de verdad se ve) ──
const DONDE = { entreno: 'd-routines', comida: 'd-nut-preview', cuerpo: 'd-valoracion-card', pagos: 'd-membership', resumen: 'd-sum' };
for (const t of ['entreno', 'comida', 'cuerpo', 'pagos', 'resumen']) {
  const tq = await tocar(`#d-tabs .dt-tab[data-t="${t}"]`); await sleep(300);
  v = await ev(VIS);
  const alto = await ev(`document.getElementById('${DONDE[t]}').getBoundingClientRect().height`);
  A.ok(tq.ok && v.tab === t && v.vis.join() === t && v.sel.join() === t && alto > 0, `tocar «${t}» enseña solo esa pestaña y su contenido se ve`, { tq, v, alto });
}

// ── 4. El Resumen: la semana, el plan y «Para revisar» con su pestaña ──
const res = await ev(`(()=>{ const s=document.getElementById('d-sum'); return { txt:s.innerText,
  filas:[...s.querySelectorAll('.dt-rev-row')].map(b=>b.innerText.replace(/\\s+/g,' ').trim()),
  marcas:[...document.querySelectorAll('#d-tabs .dt-tab')].filter(b=>b.querySelector('.dt-dot')).map(b=>b.dataset.t) }; })()`);
// La cifra se DERIVA del calendario del día en que corre (un lunes, «ayer» ya es la semana pasada): las sesiones
// de Ana son de hace 1, 3, 9 y 11 días, y cuentan las que caen desde el lunes de esta semana, días distintos.
const lunes = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); })();
const enSemana = new Set([1, 3, 9, 11].map(k => Date.now() - k * 864e5).filter(t => t >= lunes).map(t => new Date(t).toDateString())).size;
A.ok(/esta semana/i.test(res.txt) && res.txt.includes(enSemana + ' de 4 días') && /Último: ayer/.test(res.txt), `el Resumen dice cómo va su semana contra su plan (${enSemana} de 4 días hoy)`, res.txt);
A.ok(/Por vencer/.test(res.txt) && /vence el \d+ de [a-z]+ · en 3 días/.test(res.txt), 'y cómo está su plan, con la fecha y los días', res.txt);
A.ok(res.filas.some(f => /descarga ya terminó/.test(f) && /Entreno/.test(f)) && res.filas.some(f => /vence en 3 días/.test(f) && /Pagos/.test(f)), '«Para revisar» trae la descarga vencida (→ Entreno) y el vencimiento (→ Pagos)', res.filas);
A.ok(res.marcas.sort().join() === 'entreno,pagos', 'las pestañas con algo por revisar llevan su marca (y solo ellas)', res.marcas);
const fila = await tocar('#d-sum .dt-rev-row:last-of-type'); await sleep(300);
v = await ev(VIS);
A.ok(fila.ok && v.tab === 'pagos', 'tocar «Su plan vence…» lleva a «Pagos»', { fila, v });

// ── 5. Re-pintar la misma ficha no la saca de su pestaña; otra persona abre en Resumen ──
await ev(`openDetail('c1')`); await sleep(500);
v = await ev(VIS);
A.ok(v.tab === 'pagos' && v.vis.join() === 'pagos', 're-pintar la ficha (registrar un pago, cambiar el plan) la deja en «Pagos»', v);
await ev(`openDetail('c2')`); await sleep(500);
v = await ev(VIS);
A.ok(v.tab === 'resumen', 'abrir a otra persona empieza en su Resumen', v);
const nada = await ev(`document.getElementById('d-sum').innerText`);
// Beto no tiene plan de comida: la tarjeta de revisión lo dice y el Resumen tiene que decir LO MISMO.
const marcasB = await ev(`[...document.querySelectorAll('#d-tabs .dt-tab')].filter(b=>b.querySelector('.dt-dot')).map(b=>b.dataset.t).join()`);
A.ok(/No tiene plan de alimentación/.test(nada) && !/Su plan de comida tiene/.test(nada) && marcasB === 'comida', 'sin plan de comida, el Resumen dice «No tiene plan de alimentación» (como su tarjeta) y solo «Comida» lleva marca', { nada, marcasB });
await ev(`DB.nutrition.c2={kcal:2400,prot:150,carbs:300,fat:67,meals:4,plan:'Cuatro comidas.'}; openDetail('c2')`); await sleep(500);
const nada2 = await ev(`document.getElementById('d-sum').innerText`), rev2 = await ev(`document.getElementById('d-nutreview').dataset.rev`);
const esperado = rev2 ? ({ sin_plan: 'No tiene plan de alimentación', sin_datos: 'Faltan datos' }[rev2] || 'Su plan de comida tiene algo que revisar') : 'Nada pendiente';
A.ok(nada2.includes(esperado) && !/No tiene plan de alimentación/.test(nada2), 'con su plan puesto, el Resumen dice exactamente el caso que pinta su tarjeta (ya no «no tiene plan»)', { rev2, nada2 });

// Mientras sus datos pesados no llegan (en producción se piden aparte), la tarjeta de comida cree que no
// tiene plan: el Resumen NO lo repite (QA Julián). Se simula la carga en curso y se re-pinta el Resumen.
const carga = await ev(`(()=>{ const antes=AUTH_MODE; AUTH_MODE=true; _heavyLoaded.c2=false; const c=DB.clients.find(x=>x.id==='c2');
  const dn=DB.nutrition.c2; DB.nutrition.c2={}; renderNutReviewCard(c); renderDetailSummary(c);
  const r={txt:document.getElementById('d-sum').innerText, rev:document.getElementById('d-nutreview').dataset.rev};
  AUTH_MODE=antes; _heavyLoaded.c2=true; DB.nutrition.c2=dn; renderNutReviewCard(c); renderDetailSummary(c); return r; })()`);
A.ok(carga.rev === 'sin_plan' && !/No tiene plan de alimentación/.test(carga.txt), 'con sus datos todavía cargando, el Resumen no afirma «No tiene plan de alimentación» (aunque la tarjeta lo crea)', carga);

// Con teclado: las flechas recorren las pestañas y el foco las sigue (QA Julián).
await ev(`detailTab('resumen'); document.querySelector('#d-tabs .dt-tab[data-t="resumen"]').focus()`); await sleep(150);
const tecla = async k => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: { ArrowRight: 39, ArrowLeft: 37, End: 35, Home: 36 }[k] });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: { ArrowRight: 39, ArrowLeft: 37, End: 35, Home: 36 }[k] }); await sleep(250); };
await tecla('ArrowRight');
const k1 = await ev(`({tab:document.getElementById('p-detail').getAttribute('data-dtab'), foco:(document.activeElement||{}).dataset&&document.activeElement.dataset.t})`);
await tecla('End');
const k2 = await ev(`({tab:document.getElementById('p-detail').getAttribute('data-dtab'), foco:(document.activeElement||{}).dataset&&document.activeElement.dataset.t})`);
await tecla('Home');
A.ok(k1.tab === 'entreno' && k1.foco === 'entreno' && k2.tab === 'pagos' && k2.foco === 'pagos', 'con teclado, → y Fin llevan a la pestaña siguiente y a la última, y el foco las sigue', { k1, k2 });

// ── 6. El atrás vuelve a la lista (no recorre pestañas) y al regresar recupera la pestaña ──
await ev(`gp('p-clients',document.getElementById('sbi-clients'),'Asesorados')`); await sleep(300);
await ev(`openDetail('c1')`); await sleep(500);
await tocar('#d-tabs .dt-tab[data-t="comida"]'); await sleep(200);
await tocar('#d-tabs .dt-tab[data-t="cuerpo"]'); await sleep(200);
await ev(`history.back()`); await sleep(900);
const tras = await ev(`({lista:document.getElementById('p-clients').classList.contains('on'), ficha:document.getElementById('p-detail').classList.contains('on')})`);
A.ok(tras.lista && !tras.ficha, 'el atrás desde la ficha vuelve a la lista, aunque se hayan tocado dos pestañas', tras);
await ev(`openDetail('c1')`); await sleep(500);
await tocar('#d-tabs .dt-tab[data-t="comida"]'); await sleep(200);
await ev(`gp('p-progress',document.getElementById('sbi-progress'),'Cargas')`); await sleep(400);
await ev(`history.back()`); await sleep(1000);
v = await ev(VIS);
const enFicha = await ev(`document.getElementById('p-detail').classList.contains('on')`);
A.ok(enFicha && v.tab === 'comida' && v.vis.join() === 'comida', 'volver a la ficha con el atrás la deja en la pestaña donde estaba', { enFicha, v });

// ── 7. La barra queda fija al bajar, y cambiar de pestaña vuelve al principio de la pestaña ──
await tocar('#d-tabs .dt-tab[data-t="entreno"]'); await sleep(300);
const fija = await ev(`(async()=>{ const main=document.querySelector('.main'); main.scrollTop=900; await new Promise(r=>setTimeout(r,250));
  const bt=document.getElementById('d-tabs').getBoundingClientRect().top, mt=main.getBoundingClientRect().top; return {scroll:main.scrollTop, bt:Math.round(bt), mt:Math.round(mt)}; })()`);
A.ok(fija.scroll > 300 && Math.abs(fija.bt - fija.mt) <= 2, 'con la ficha bajada, la barra de pestañas sigue arriba', fija);
// «Pagos» se alarga a propósito: con una pestaña corta el navegador recorta el scroll solo y esto aprobaría
// sin el código (salió VERDE en la matriz). Un coach con muchos pagos tiene esa pestaña así de larga.
await ev(`(()=>{ const d=document.createElement('div'); d.id='qa-largo'; d.style.height='2200px'; document.querySelector('.dt-sec[data-dt="pagos"]').appendChild(d); })()`);
await tocar('#d-tabs .dt-tab[data-t="pagos"]'); await sleep(300);
const arriba = await ev(`(()=>{ const main=document.querySelector('.main'); const tb=document.getElementById('d-tabs').getBoundingClientRect(); const pr=document.querySelector('.dt-sec[data-dt="pagos"]').getBoundingClientRect(); return {scroll:main.scrollTop, maxScroll:main.scrollHeight-main.clientHeight, inicioVisible:pr.top>=tb.bottom-1&&pr.top<innerHeight}; })()`);
A.ok(arriba.maxScroll > fija.scroll, 'CONTROL: la pestaña nueva es lo bastante larga como para quedarse a media altura', arriba);
A.ok(arriba.scroll < fija.scroll && arriba.inicioVisible, 'cambiar de pestaña con la ficha bajada enseña el principio de la pestaña nueva', arriba);
await ev(`document.getElementById('qa-largo').remove()`);

// ── 8. Nada se sale de la pantalla en ninguna pestaña ──
const desb = [];
for (const t of ['resumen', 'entreno', 'comida', 'cuerpo', 'pagos']) {
  await ev(`detailTab('${t}')`); await sleep(200);
  const w = await ev(`(()=>{ const main=document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth-innerWidth, main.scrollWidth-main.clientWidth); })()`);
  if (w > 0) desb.push({ t, w });
}
A.ok(desb.length === 0, 'ninguna pestaña se puede arrastrar de lado a 360 px', desb);

// ── 9. Con «Muy grande» la barra se desliza y la elegida queda a la vista ──
await ev(`document.documentElement.setAttribute('data-fs','xl')`); await sleep(700);
const zoom = await ev(`getComputedStyle(document.getElementById('p-detail')).zoom`);
A.ok(Number(zoom) > 1.3, 'CONTROL: con «Muy grande» la ficha de verdad crece (si no, lo de abajo no prueba nada)', zoom);
await ev(`detailTab('pagos')`); await sleep(500);
const xl = await ev(`(()=>{ const seg=document.querySelector('#d-tabs .dt-seg'); const sr=seg.getBoundingClientRect(); const b=document.querySelector('#d-tabs .dt-tab[data-t="pagos"]').getBoundingClientRect();
  return {desliza:seg.scrollWidth>seg.clientWidth, dentro:b.left>=sr.left-1&&b.right<=sr.right+1, scrollLeft:Math.round(seg.scrollLeft)}; })()`);
A.ok(xl.desliza && xl.dentro && xl.scrollLeft > 0, 'con «Muy grande» la barra se desliza y «Pagos» queda entera a la vista', xl);
await ev(`document.documentElement.removeAttribute('data-fs')`); await sleep(500);

// ── 10. Lo que cazó el QA funcional (Lucas) ──
// a) «Pidió un coach» se ve desde el Resumen y marca «Pagos».
await ev(`(()=>{ DB.clients.push({id:'c3',name:'Caro Prueba',goal:'Salud general',level:'Principiante',days:3,tier:'libre',selfReg:true,wantsCoach:true,wantsCoachAt:new Date().toISOString(),routines:[],payments:[]});
  DB.history.c3=[]; DB.msgs.c3=[]; DB.prs.c3={}; DB.bodyweight.c3=[]; DB.medidas.c3=[]; DB.photos.c3=[]; DB.nutrition.c3={}; _heavyLoaded.c3=true; openDetail('c3'); })()`); await sleep(500);
const lead = await ev(`({txt:document.getElementById('d-sum').innerText, marcas:[...document.querySelectorAll('#d-tabs .dt-tab')].filter(b=>b.querySelector('.dt-dot')).map(b=>b.dataset.t)})`);
A.ok(/Pidió un coach/.test(lead.txt) && lead.marcas.includes('pagos'), '«Pidió un coach» se ve desde el Resumen y «Pagos» lleva su marca', lead);
// b) Registrar el pago desde «Pagos» apaga su marca sin tener que cambiar de pestaña.
await ev(`openDetail('c1'); detailTab('pagos')`); await sleep(400);
const antesPago = await ev(`!!document.querySelector('#d-tabs .dt-tab[data-t="pagos"] .dt-dot')`);
await ev(`(()=>{ openPaymentModal('c1'); registerPayment(); })()`); await sleep(500);
const trasPago = await ev(`({tab:document.getElementById('p-detail').getAttribute('data-dtab'), punto:!!document.querySelector('#d-tabs .dt-tab[data-t="pagos"] .dt-dot'), pagos:(DB.clients.find(x=>x.id==='c1').payments||[]).length})`);
A.ok(antesPago && trasPago.pagos === 2 && trasPago.tab === 'pagos' && !trasPago.punto, 'registrar el pago deja al coach en «Pagos» y apaga su marca en el acto', { antesPago, trasPago });
// c) En su propia ficha el coach no ve cobros.
await ev(`(()=>{ DB.clients.push({id:SELF_CLIENT_ID,name:'Coach Prueba',days:4,routines:[]}); DB.history[SELF_CLIENT_ID]=[]; DB.msgs[SELF_CLIENT_ID]=[]; DB.prs[SELF_CLIENT_ID]={};
  DB.bodyweight[SELF_CLIENT_ID]=[]; DB.medidas[SELF_CLIENT_ID]=[]; DB.photos[SELF_CLIENT_ID]=[]; DB.nutrition[SELF_CLIENT_ID]={}; _heavyLoaded[SELF_CLIENT_ID]=true; openDetail(SELF_CLIENT_ID); detailTab('pagos'); })()`); await sleep(500);
const yo = await ev(`({txt:document.querySelector('.dt-sec[data-dt="pagos"]').innerText, cobrar:!!document.querySelector('#d-membership button[onclick*="openPaymentModal"]'), nivel:document.getElementById('d-freelead').innerHTML.trim().length})`);
A.ok(/no te cobras a ti mismo/.test(yo.txt) && !yo.cobrar && yo.nivel === 0, 'en su propia ficha el coach no ve membresía ni botones de cobro, y se le dice por qué', yo);
// d) Una nota con un enlace largo se parte en vez de arrastrar la pantalla.
await ev(`(()=>{ DB.clients.find(x=>x.id==='c1').notes='https://www.ejemplo.com/un/camino/muy/largo/de/una/url/de/informe/medico?id=1234567890abcdef&otro=parametro'; openDetail('c1'); })()`); await sleep(500);
const nota = await ev(`(()=>{ const main=document.querySelector('.main'); return {lado:Math.max(document.documentElement.scrollWidth-innerWidth, main.scrollWidth-main.clientWidth), ancho:Math.round(document.getElementById('d-notes').getBoundingClientRect().width), vis:document.getElementById('d-notes').offsetHeight>0}; })()`);
A.ok(nota.vis && nota.lado === 0, 'una nota con un enlace larguísimo se parte y no arrastra la pantalla de lado', nota);

// ── 11. Lo nuevo se lee en los dos temas (texto sobre fondo sólido) ──
const CONTRASTE = `(()=>{ const rgb=s=>{const m=String(s).match(/[\\d.]+/g)||[];return m.slice(0,3).map(Number);};
  const L=c=>{const a=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];};
  const fondo=el=>{ while(el){ const b=getComputedStyle(el).backgroundColor; const m=String(b).match(/[\\d.]+/g); if(m&&(m.length<4||Number(m[3])>0.95)) return rgb(b); el=el.parentElement; } return [255,255,255]; };
  const r=(el)=>{ const a=L(rgb(getComputedStyle(el).color)), b=L(fondo(el)); return Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05))*100)/100; };
  const out={}; const pon=(k,sel)=>{ const el=document.querySelector(sel); out[k]=el?r(el):null; };
  pon('k','#d-sum .dt-k'); pon('v','#d-sum .dt-v'); pon('s','#d-sum .dt-s'); pon('go','#d-sum .dt-go'); pon('fila','#d-sum .dt-rev-row');
  pon('tab','#d-tabs .dt-tab[aria-selected="false"]'); pon('tabSel','#d-tabs .dt-tab[aria-selected="true"]'); return out; })()`;
await ev(`openDetail('c1')`); await sleep(500);
for (const tema of ['light', 'dark']) {
  await ev(`setTheme('${tema}')`); await sleep(400);
  const c = await ev(CONTRASTE);
  const malos = Object.entries(c).filter(([, x]) => x == null || x < 4.5);
  A.ok(malos.length === 0, `tema ${tema}: el texto nuevo de la ficha llega a 4,5:1`, c);
}
// CONTROL de la sonda: un gris claro sobre blanco tiene que reprobar.
const ctl = await ev(`(()=>{ const d=document.createElement('div'); d.style.cssText='background:#fff;color:#ccc'; d.innerHTML='<span class="dt-k">x</span>'; document.body.appendChild(d); d.firstChild.style.color='#ccc';
  const rgb=s=>(String(s).match(/[\\d.]+/g)||[]).slice(0,3).map(Number); const L=c=>{const a=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];};
  const a=L(rgb(getComputedStyle(d.firstChild).color)), b=L(rgb(getComputedStyle(d).backgroundColor)); d.remove(); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); })()`);
A.ok(ctl < 4.5, 'CONTROL: la sonda de contraste reprueba un gris claro sobre blanco', ctl);

salir(A, { chrome, srv });
