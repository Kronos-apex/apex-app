// ─────────────────────────────────────────────────────────────────────────────
// _verify-buscar-ejercicio.mjs — EL BUSCADOR DEL SELECTOR DE EJERCICIOS (v705)
//
// Pedido del PO (10-oct-2026): *«necesito introducir un botón de búsqueda en los ejercicios»*. La
// biblioteca ya buscaba; el selector que se abre con «+ Añadir ejercicio» (rutina y plantilla), con
// «Excluir/Priorizar» del generador y con «cambiar ejercicio» del asesorado mostraba los 374 con
// filtros de músculo y entorno, sin buscador.
//
// QUÉ AFIRMA, escribiendo en el campo como lo haría una persona (evento `input` real):
//   · cada resultado contiene todas las palabras escritas, sin importar tildes («biceps» → «Bíceps»);
//   · si el nombre existe fuera del músculo o el entorno elegidos, el vacío lo dice y «Buscar en
//     todos» quita los filtros; si no existe en ningún lado, lo dice también;
//   · al volver a abrir, la búsqueda arranca vacía;
//   · 🔒 al CAMBIAR un ejercicio con hernia lumbar declarada, buscar «peso muerto» no ofrece nada que
//     esa zona prohíba (CONTROL: en el armado de rutinas del coach, que no se filtra, sí aparece);
//   · al cambiar un ejercicio, el botón de filtro marcado es SU músculo, no «Todos»;
//   · el campo se ve, se toca y cabe en 360 px con letra «Muy grande».
//
//   node scripts/e2e/_verify-buscar-ejercicio.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('buscar-ejercicio');
const PORT = 8851, DP = 9381, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/buscarej-' + Date.now(), '--no-first-run', '--window-size=360,800', APP]);
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
A.ok(await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof openPicker==='function' && typeof todaySubstitute==='function' && typeof searchExercises==='function'`), 'la app terminó de arrancar');
A.ok(await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000), 'la pantalla de carga ya se fue');

// Escribe en el buscador como una persona: valor + evento `input` (es lo que dispara `oninput`).
const escribir = async txt => { await ev(`(()=>{ const q=document.getElementById('pk-q'); q.focus(); q.value=${JSON.stringify(txt)}; q.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`); await sleep(250); };
const LISTA = `(()=>{ const l=document.getElementById('pk-list'); const filas=[...l.children].filter(x=>x.querySelector('div[style*="font-weight:600"]'));
  return {n:filas.length, nombres:filas.map(f=>f.querySelector('div[style*="font-weight:600"]').firstChild.textContent.trim()), vacio:(l.querySelector('.pk-vacio')||{}).textContent||'', todos:!!l.querySelector('.pk-vacio button'),
    activo:[...document.querySelectorAll('#pk-f .btn')].filter(b=>b.style.background.indexOf('--gl')>=0).map(b=>b.textContent.trim())}; })()`;
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ── Montaje: el coach arma la rutina de una asesorada que entrena en casa ──
const m = await ev(`(()=>{try{
  DB.clients=[{id:'bq1',name:'Daniela Paredes',place:'casa',level:'Intermedio',goal:'Recomposición',days:4,routines:[],notes:''}];
  CUR.clientId='bq1'; CUR.loggedAs='coach'; CUR.routineExs=[]; showScreen('s-coach');
  return {ok:true, total:DB.exercises.length};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`);
A.ok(m && m.ok && m.total >= 300, 'el montaje carga el catálogo completo', m);

// ── 1. «+ Añadir ejercicio»: el buscador se ve, se toca y busca ──
await ev(`openPicker()`); await sleep(400);
const campo = await ev(`(()=>{ const q=document.getElementById('pk-q'); const r=q.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {seVe:r.height>=36&&r.width>200, toca:el===q, fs:getComputedStyle(q).fontSize, valor:q.value}; })()`);
A.ok(campo.seVe && campo.toca, 'el buscador está arriba del selector y se puede tocar', campo);
A.ok(campo.fs === '16px', 'su letra es de 16 px (con menos, el iPhone hace zoom al tocarlo)', campo.fs);
await ev(`pkEnvFilter('all'); document.getElementById('pk-env').value='all'`); await sleep(200);
const lleno = await ev(LISTA);
await escribir('press milit');
const r1 = await ev(LISTA);
A.ok(r1.n > 0 && r1.n < lleno.n && r1.nombres.every(n => norm(n).includes('press') && norm(n).includes('milit')), '«press milit» deja solo los press militares', r1.nombres);
await escribir('biceps');
const r2 = await ev(LISTA);
A.ok(r2.n > 0 && r2.nombres.some(n => /Bíceps/.test(n)), 'sin tilde también encuentra («biceps» → «Bíceps»)', r2.nombres.slice(0, 4));

// ── 2. El vacío dice por qué ──
await ev(`[...document.querySelectorAll('#pk-f .btn')].find(b=>b.textContent.trim()==='Pecho').click()`); await sleep(200);
await escribir('sentadilla');
const r3 = await ev(LISTA);
A.ok(r3.n === 0 && /otros músculos o entornos/.test(r3.vacio) && r3.todos, 'buscando «sentadilla» en Pecho: dice que existe en otro lado y ofrece «Buscar en todos»', r3);
await ev(`document.querySelector('#pk-list .pk-vacio button').click()`); await sleep(250);
const r4 = await ev(LISTA);
A.ok(r4.n > 0 && r4.nombres.every(n => norm(n).includes('sentadilla')) && JSON.stringify(r4.activo) === '["Todos"]', '«Buscar en todos» muestra las sentadillas y marca «Todos»', r4);
await escribir('zzqx');
const r5 = await ev(LISTA);
A.ok(r5.n === 0 && /Ningún ejercicio se llama así/.test(r5.vacio) && !r5.todos, 'algo que no existe: «Ningún ejercicio se llama así», sin botón', r5);

// CONTROL para el punto 4: en el armado de rutinas del coach NO se filtra por lesión (ahí decide él).
await escribir('peso muerto');
const ctrl = await ev(LISTA);
A.ok(ctrl.n > 0, 'CONTROL: en el armado de rutinas, «peso muerto» sí aparece', ctrl.nombres.slice(0, 4));

// ── 3. Al volver a abrir, la búsqueda arranca vacía ──
await ev(`cm('m-picker')`); await sleep(200);
await ev(`openPicker()`); await sleep(350);
const re = await ev(`({valor:document.getElementById('pk-q').value, n:document.querySelectorAll('#pk-list > div').length})`);
A.ok(re.valor === '' && re.n > 20, 'al volver a abrir, el buscador está vacío y se ve la lista entera', re);
await ev(`cm('m-picker')`); await sleep(200);

// ── 4. 🔒 Cambiar un ejercicio con hernia lumbar: lo buscado NUNCA salta el filtro de la zona ──
const sub = await ev(`(()=>{try{
  const c={id:'bq2',name:'Laura Gómez',place:'gym',level:'Intermedio',goal:'Salud general',days:3,notes:'Hernia discal lumbar L4-L5',
    routines:[{id:'rq1',name:'Pierna',day:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()],restSec:90,
      exercises:[Object.assign({},DB.exercises.find(e=>e.muscle==='piernas'),{sets:3,reps:'10'})]}]};
  DB.clients=[c]; CUR.clientId='bq2'; CUR.loggedAs='client'; showScreen('s-client');
  renderClientToday(c);
  const lim=limitationsFor(c,Date.now());
  return {ok:typeof _todayWork==='function'&&!!_todayWork(), keys:lim.keys};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`);
A.ok(sub && sub.ok && sub.keys.includes('lumbar'), 'montaje: una asesorada con hernia lumbar y su entreno de hoy', sub);
await ev(`todaySubstitute(0)`); await sleep(400);
const s0 = await ev(LISTA);
const musc = await ev(`(DB.exercises.find(e=>e.muscle==='piernas')||{}).muscle`);
A.ok(s0.activo.length === 1 && s0.activo[0] !== 'Todos', 'al cambiar un ejercicio, el filtro marcado es SU músculo, no «Todos»', { activo: s0.activo, musculo: musc });
await ev(`pkSearchAll()`); await sleep(200);
await escribir('peso muerto');
const s1 = await ev(`(()=>{ const c=DB.clients[0]; const lim=limitationsFor(c,Date.now()).keys;
  const filas=[...document.querySelectorAll('#pk-list > div')].filter(x=>x.querySelector('div[style*="font-weight:600"]'));
  const nombres=filas.map(f=>f.querySelector('div[style*="font-weight:600"]').firstChild.textContent.trim());
  const prohibidos=nombres.filter(n=>{ const e=DB.exercises.find(x=>x.name===n); return e&&exerciseContraindicated(e,lim,DB.exercises); });
  const enCatalogo=searchExercises(DB.exercises,'peso muerto','all').filter(e=>exerciseContraindicated(e,lim,DB.exercises)).length;
  return {n:nombres.length, prohibidos, enCatalogo, texto:document.getElementById('pk-list').innerText.slice(0,160)}; })()`);
A.ok(s1.enCatalogo >= 2, 'CONTROL: en el catálogo hay «peso muerto» que la zona lumbar prohíbe (si no, el siguiente check no prueba nada)', s1.enCatalogo);
A.ok(s1.prohibidos.length === 0, '🔒 buscando «peso muerto» con hernia lumbar, no aparece nada que esa zona prohíba', s1);
A.ok(s1.n > 0 || /esa zona/.test(s1.texto), 'y si no queda ninguno, lo dice el mensaje de la zona (nunca una lista vacía muda)', s1);
await ev(`cm('m-picker')`); await sleep(200);

// ── 5. Con «Muy grande» a 360 px cabe ──
await ev(`CUR.loggedAs='coach'; showScreen('s-coach'); DB.clients=[{id:'bq1',name:'Daniela Paredes',place:'casa',routines:[]}]; CUR.clientId='bq1'; CUR.routineExs=[]; setTextSize('xl')`); await sleep(600);
await ev(`openPicker()`); await sleep(500);
const xl = await ev(`(()=>{ const q=document.getElementById('pk-q'); const r=q.getBoundingClientRect(); const md=document.querySelector('#m-picker .md');
  return {zoom:Math.round((md.currentCSSZoom||1)*100)/100, dentro:r.left>=0&&r.right<=innerWidth, anchoDoc:document.documentElement.scrollWidth}; })()`);
A.ok(xl.zoom > 1.3, 'CONTROL: con «Muy grande» la ventana crece', xl.zoom);
A.ok(xl.dentro && xl.anchoDoc <= 360, 'y el buscador cabe en 360 px', xl);
await ev(`setTextSize('normal')`);

salir(A, { chrome, srv });
