// ─────────────────────────────────────────────────────────────────────────────
// _verify-coach-tarjetas.mjs — EL NOMBRE SE LEE EN «ASESORADOS» Y LOS RÉCORDS NO OCUPAN 3 PANTALLAS
//
// Nace de dos capturas del PO (9-oct-2026, su teléfono):
//   (1) en «Asesorados» los nombres salían «D..», «L...», «C..»: el nombre compartía fila con el
//       nivel y «Libre», y con la columna de «Ver →» al lado le quedaban ~25 px;
//   (2) en la ficha, «los récords se ven muy largos»: mediana de 24 récords por persona y máximo
//       42 (respaldo del 7-oct) → hasta ~2.150 px de lista.
//
// QUÉ AFIRMA, sobre la CONSECUENCIA y no sobre el CSS:
//   · cada nombre se ve ENTERO (ni recortado por elipsis ni por el tope de 2 líneas), en 360 px y
//     con la letra en «Grande» y «Muy grande»;
//   · CONTROL de que la sonda discrimina: un nombre imposible de 90 letras SÍ sale recortado;
//   · la tarjeta de récords abre con 6, el botón dice cuántos hay, despliega todos y vuelve a 6;
//   · nada se sale de su tarjeta por los lados, y el lápiz de corregir mide ≥36 px.
//
//   node scripts/e2e/_verify-coach-tarjetas.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('tarjetas del coach (nombres y récords)');
const PORT = 8817, DP = 9317, APP = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/tarjetas-' + Date.now(), '--no-first-run',
   '--window-size=360,1600', APP]);
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 1600, deviceScaleFactor: 2, mobile: true });
await sleep(700);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP }); await sleep(900);
const listo = await waitFor(`typeof renderClients==='function' && typeof renderCoachPRsCard==='function' && typeof prCardToggle==='function' && typeof gp==='function'`);
A.ok(listo, 'los módulos del coach cargaron');

// Nombres INVENTADOS (el repo es público): largos como los de la captura, más uno de control.
const NOMBRES = ['Daniela Paredes Mora', 'Estefanía Rodríguez Quintero', 'Ximena Cárdenas Villalobos', 'Camila Ospina'];
// Más largo de lo que caben 3 líneas en cualquier talla: si la sonda no lo ve recortado, no mide nada.
const CONTROL = 'Nombre de control larguísimo que ninguna tarjeta puede mostrar entero en tres líneas, escrito solo para comprobar que la sonda sí detecta un recorte cuando lo hay';
const montaje = await ev(`(()=>{try{
  CUR.loggedAs='coach'; showScreen('s-coach');
  const hoy=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()];
  const mk=(id,name,extra)=>Object.assign({id,name,level:'Principiante',selfReg:true,tier:'libre',goal:'Recomposición',days:5,
    routines:[{id:'r'+id,name:'Gluteo',day:hoy,exercises:[]}]},extra||{});
  DB.clients=${JSON.stringify(NOMBRES)}.map((n,i)=>mk('c'+i,n)).concat([mk('cx',${JSON.stringify(CONTROL)})]);
  DB.history={}; DB.msgs={};
  // 24 récords (la mediana medida), del más nuevo al más viejo.
  const prs={}; for(let i=0;i<24;i++){ const d=new Date(Date.now()-i*86400000).toISOString();
    prs['e'+(100+i)]={val:10+i,kg:10+i,unit:'kg',reps:15,name:i%3?'Extensión de Tríceps con Cuerda en Polea':'Peso Muerto Piernas Rígidas',date:d}; }
  DB.prs={c0:prs};
  gp('p-clients');
  return 'ok';
}catch(e){return 'ERR '+(e&&e.message)}})()`);
A.ok(montaje === 'ok', 'el montaje deja la lista con nombres largos y 24 récords', montaje);
await sleep(500);

// Mide cada nombre: ¿se ve entero? Un nombre recortado tiene más alto de contenido que de caja
// (tope de 2 líneas) o más ancho de contenido que de caja (elipsis).
const MEDIR = `(()=>{const out=[];document.querySelectorAll('#cli-list .cli .cn').forEach(el=>{
  const r=el.getBoundingClientRect();
  out.push({nombre:el.textContent.trim(), ancho:Math.round(r.width), alto:Math.round(r.height),
    recortado: el.scrollHeight>el.clientHeight+1 || el.scrollWidth>el.clientWidth+1,
    lineas: Math.round(el.scrollHeight/parseFloat(getComputedStyle(el).lineHeight||'18'))});});
  const desborde=[...document.querySelectorAll('#cli-list .cli')].some(c=>c.scrollWidth>c.clientWidth+1);
  return {nombres:out, desborde};})()`;

for (const fs of ['', 'lg', 'xl']) {
  await ev(`(()=>{const h=document.documentElement; if(${JSON.stringify(fs)}) h.setAttribute('data-fs',${JSON.stringify(fs)}); else h.removeAttribute('data-fs'); renderClients();})()`);
  await sleep(300);
  const m = await ev(MEDIR);
  const tag = fs || 'normal';
  A.ok(m && m.nombres.length === NOMBRES.length + 1, `[${tag}] se pintaron las ${NOMBRES.length + 1} tarjetas`, m && m.nombres.length);
  for (const n of m.nombres.filter(x => x.nombre !== CONTROL)) {
    A.ok(!n.recortado && n.ancho > 60, `[${tag}] «${n.nombre}» se lee entero`, n);
  }
  const ctl = m.nombres.find(x => x.nombre === CONTROL);
  A.ok(ctl && ctl.recortado, `[${tag}] CONTROL: un nombre imposible SÍ sale recortado (la sonda discrimina)`, ctl);
  A.ok(!m.desborde, `[${tag}] ninguna tarjeta se sale por los lados`);
  if (SHOTS && fs !== 'lg') {
    const rect = await ev(`(()=>{const r=document.getElementById('cli-list').getBoundingClientRect();return {x:0,y:Math.max(0,r.top+scrollY),w:360,h:Math.min(r.height,1400)}})()`);
    const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 }, captureBeyondViewport: true });
    writeFileSync(`${SHOTS}/asesorados-${tag}.png`, Buffer.from(s.data, 'base64'));
  }
}
await ev(`document.documentElement.removeAttribute('data-fs')`);

// ── Récords ──
const PR = `(()=>{const el=document.getElementById('d-prs'); if(!el) return null;
  const filas=[...el.querySelectorAll('button[aria-label^="Corregir"]')];
  const tg=[...el.querySelectorAll('button')].find(b=>/Ver (los|menos)/.test(b.textContent));
  const lapiz=filas[0]?filas[0].getBoundingClientRect():null;
  return {visible:el.style.display!=='none', filas:filas.length, boton:tg?tg.textContent.trim():null,
    alto:Math.round(el.getBoundingClientRect().height), lapiz: lapiz?[Math.round(lapiz.width),Math.round(lapiz.height)]:null,
    desborde: el.scrollWidth>el.clientWidth+1, texto: el.innerText};})()`;
await ev(`(()=>{CUR.clientId='c0'; showScreen('s-coach'); gp('p-detail'); renderCoachPRsCard(DB.clients[0]);})()`);
await sleep(300);
const cerrado = await ev(PR);
A.ok(cerrado && cerrado.visible, 'la tarjeta de récords se pinta', cerrado && cerrado.visible);
A.ok(cerrado && cerrado.filas === 6, 'abre con los 6 más recientes', cerrado && cerrado.filas);
A.ok(cerrado && cerrado.boton === 'Ver los 24 récords', 'el botón dice cuántos hay', cerrado && cerrado.boton);
// El fixture pone el MÁS RECIENTE con 10 kg y el más viejo con 33: cerrada, sale el primero y no el último.
const primeraFila = (cerrado && cerrado.texto.split(/\r?\n/).find(l => /kg/.test(l))) || '';
A.ok(/^10\s*kg/.test(primeraFila), 'la primera fila es el récord MÁS RECIENTE (10 kg)', primeraFila);
A.ok(cerrado && !/33\s*kg/.test(cerrado.texto), 'y el más viejo (33 kg) queda dentro del botón, no a la vista', cerrado && cerrado.texto.slice(0, 160));
A.ok(cerrado && cerrado.lapiz && cerrado.lapiz[0] >= 36 && cerrado.lapiz[1] >= 36, 'el lápiz de corregir mide ≥36 px', cerrado && cerrado.lapiz);
A.ok(cerrado && !cerrado.desborde, 'la tarjeta no se sale por los lados');
if (SHOTS) {
  const r = await ev(`(()=>{const b=document.getElementById('d-prs').getBoundingClientRect();return {y:b.top+scrollY,h:b.height}})()`);
  const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: r.y, width: 360, height: r.h, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(`${SHOTS}/records-cerrado.png`, Buffer.from(s.data, 'base64'));
}
await ev(`prCardToggle('c0')`); await sleep(200);
const abierto = await ev(PR);
A.ok(abierto && abierto.filas === 24, 'al tocar el botón se ven los 24', abierto && abierto.filas);
A.ok(abierto && abierto.boton === 'Ver menos', 'y el botón pasa a «Ver menos»', abierto && abierto.boton);
await ev(`prCardToggle('c0')`); await sleep(200);
const otraVez = await ev(PR);
A.ok(otraVez && otraVez.filas === 6, 'y vuelve a 6', otraVez && otraVez.filas);
console.log(`   alto de la tarjeta: ${cerrado && cerrado.alto} px cerrada · ${abierto && abierto.alto} px abierta`);

// El NOMBRE del ejercicio se lee entero en las tres tallas (Lucas QA, 9-oct: con el valor al
// lado, en «Muy grande» quedaba en 51 px y se partía a mitad de palabra).
for (const fs of ['', 'lg', 'xl']) {
  const tag = fs || 'normal';
  await ev(`(()=>{const h=document.documentElement; if(${JSON.stringify(fs)}) h.setAttribute('data-fs',${JSON.stringify(fs)}); else h.removeAttribute('data-fs'); renderCoachPRsCard(DB.clients[0]);})()`);
  // 🔴 El tamaño de letra tarda unos milisegundos en llegar al panel de la ficha: medir en el acto
  // daba el zoom de la talla ANTERIOR (1 en «Grande», 1,18 en «Muy grande») y la prueba aprobaba
  // sin haber medido nada. Se espera y se AFIRMA el zoom antes de medir (control de montaje).
  await sleep(600);
  const r = await ev(`(()=>{const els=[...document.querySelectorAll('#d-prs .pr-nm')];
    return {zoom: els[0]?els[0].currentCSSZoom:null,
      filas: els.map(el=>({n:el.textContent.trim(), w:el.clientWidth, cort: el.scrollHeight>el.clientHeight+1}))};})()`);
  const zEsperado = { '': 1, lg: 1.18, xl: 1.4 }[fs];
  A.ok(r && Math.abs((r.zoom || 0) - zEsperado) < 0.01, `[${tag}] CONTROL: la ficha está de verdad en esa talla (zoom ${zEsperado})`, r && r.zoom);
  A.ok(r && r.filas.length === 6, `[${tag}] la tarjeta muestra 6 nombres`, r && r.filas.length);
  console.log(`   [${tag}] caja del nombre más angosta: ${Math.min(...(r ? r.filas : []).map(x => x.w))} px (de texto)`);
  // El ancho va en px DE TEXTO (clientWidth), no de pantalla: con zoom, la caja en pantalla mide lo
  // mismo pero le caben menos letras.
  const malos = (r ? r.filas : []).filter(x => x.cort || x.w < 120);
  A.ok(malos.length === 0, `[${tag}] cada nombre de ejercicio se lee entero (caja ≥120 px de texto)`, malos.slice(0, 2));
}
await ev(`document.documentElement.removeAttribute('data-fs')`);

// «Ver menos» deja el botón donde estaba el dedo (Lucas QA: sin esto quedaba a −128 px, fuera de
// la pantalla por arriba). Hace falta una pantalla más baja que la tarjeta abierta para que haya scroll.
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 700, deviceScaleFactor: 2, mobile: true });
await sleep(300);
const ancla = await ev(`(async()=>{renderCoachPRsCard(DB.clients[0]); prCardToggle('c0'); await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#d-prs [data-prtoggle]'); b.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,100));
  const y0=b.getBoundingClientRect().top; b.click(); await new Promise(r=>setTimeout(r,150));
  const b2=document.querySelector('#d-prs [data-prtoggle]');
  return {y0:Math.round(y0), y1:Math.round(b2.getBoundingClientRect().top), texto:b2.textContent.trim(), alto:innerHeight};})()`);
A.ok(ancla && ancla.texto === 'Ver los 5 récords' || (ancla && /Ver los \d+ récords/.test(ancla.texto)), 'al plegar, el botón vuelve a decir «Ver los N récords»', ancla);
A.ok(ancla && Math.abs(ancla.y1 - ancla.y0) <= 4 && ancla.y1 >= 0 && ancla.y1 < ancla.alto, 'al plegar, el botón se queda donde estaba el dedo (no salta fuera de la pantalla)', ancla);
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 1600, deviceScaleFactor: 2, mobile: true });

// Cambiar de ficha vuelve a cerrar la lista, también al regresar a la primera.
const ficha = await ev(`(()=>{DB.clients[1].id='c1'; DB.prs.c1=JSON.parse(JSON.stringify(DB.prs.c0));
  renderCoachPRsCard(DB.clients[0]); prCardToggle('c0'); const a=document.querySelectorAll('#d-prs .pr-nm').length;
  renderCoachPRsCard(DB.clients[1]); const b=document.querySelectorAll('#d-prs .pr-nm').length;
  renderCoachPRsCard(DB.clients[0]); const c=document.querySelectorAll('#d-prs .pr-nm').length;
  return {abiertaA:a, otraFicha:b, vueltaA:c};})()`);
A.ok(ficha && ficha.abiertaA > 6 && ficha.otraFicha === 6 && ficha.vueltaA === 6, 'abrir otra ficha (y volver) la deja cerrada en 6', ficha);

// Con 6 o menos no hay botón: no se ofrece desplegar lo que ya se ve entero.
await ev(`(()=>{const p=DB.prs.c0; DB.prs.c0=Object.fromEntries(Object.entries(p).slice(0,5)); renderCoachPRsCard(DB.clients[0]);})()`);
const pocos = await ev(PR);
A.ok(pocos && pocos.filas === 5 && pocos.boton === null, 'con 5 récords se ven los 5 y no hay botón', pocos && [pocos.filas, pocos.boton]);

ws.close(); chrome.kill(); srv.kill();
salir(A);
