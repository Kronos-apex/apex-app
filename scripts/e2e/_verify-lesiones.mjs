// Verificación E2E del FILTRO DE LESIONES (avi-v424). SIN login: monta un asesorado que declara
// «Hernia discal L4-L5 … ciática, el dolor me baja por la pierna», abre el generador REAL del
// coach y afirma sobre lo que se pinta. Nace de una medición: hasta hoy la app le prometía al
// coach «se excluyeron ejercicios contraindicados» y le entregaba Russian Twist 462 veces a quien
// declaraba hernia. Las listas las dictó Laura (fisio); esto verifica que llegan a la pantalla.
//
// Cubre lo que la suite NO puede ver: el texto REAL del banner, que el borrador pintado no traiga
// flexión de columna, que el calentamiento de la ficha no mande a doblarse, y que sin limitación
// el banner NO aparezca (antes salía «Limitación detectada ()» con la lista vacía por needsReview).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8793, OUT = process.env.LES_OUT || (process.env.TEMP + '/avi-lesiones');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const PROFILE = process.env.TEMP + '/cdp-lesiones-' + Date.now();
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9293', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9293/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
const results = [];
const check = (n, c, x = '') => { results.push({ n, c }); console.log('  ' + (c ? 'OK   ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
async function shot(n) { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  📸 ' + n); }

await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

// La nota es la que ESCRIBIRÍA una persona en el registro, no una hecha a la medida del regex.
const NOTA = 'Tengo hernia discal L4-L5 diagnosticada y ciática, el dolor me baja por la pierna izquierda';
const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const mk=(id,name,notes)=>({id,name,email:id+'@qa.local',goal:'Ganar músculo',level:'Intermedio',days:4,
    weight:80,height:175,age:32,sex:'M',place:'gym',tier:'premium',notes,payments:[],routines:[]});
  DB.clients=[mk('cLes','QA Lesión',${JSON.stringify(NOTA)}), mk('cSano','QA Sin Lesión','Quiere ganar masa')];
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach'); if(typeof renderAll==='function')renderAll();
  return true;
}catch(e){return 'err:'+e.message}})()`);
if (setup !== true) { console.error('❌ setup:', setup); chrome.kill(); srv.kill(); process.exit(1); }
await sleep(600);

// ── 1) El borrador del asesorado CON hernia ──
const g1 = await ev(`(()=>{try{openDetail('cLes');openGenRutinas();return true}catch(e){return 'err:'+e.message}})()`);
if (g1 !== true) { console.error('❌ generador:', g1); chrome.kill(); srv.kill(); process.exit(1); }
await sleep(900);
const con = JSON.parse(await ev(`JSON.stringify((()=>{
  const b=document.getElementById('mg-body'); const t=(b.innerText||'').replace(/\\s+/g,' ');
  const nombres=[...b.querySelectorAll('.exname')].map(e=>e.innerText.trim());
  const banner=b.querySelector('div[style*="fde8e8"]');
  return {txt:t, nombres, banner: banner?(banner.innerText||'').replace(/\\s+/g,' '):null,
          ancho: b.scrollWidth, visible: b.clientWidth};
})())`));
const FLEX = /crunch|russian|hollow|rueda abdominal|elevaci[oó]n de piernas|oruga|superman|salto|burpee|sprint/i;
const AXIAL = /peso muerto|remo con barra|buenos d[ií]as|hiperexten|sentadilla con barra|sentadilla frontal|sentadilla hack|sentadilla en smith|sentadilla sumo/i;
const colados = con.nombres.filter(n => FLEX.test(n) || AXIAL.test(n));
check('el borrador se pintó con ejercicios', con.nombres.length >= 10, con.nombres.length + ' ejercicios');
check('CERO contraindicados en el borrador PINTADO', colados.length === 0, colados.join(' · ') || 'ninguno');
check('el banner de limitación aparece', !!con.banner, (con.banner || '').slice(0, 90));
check('el banner NOMBRA la zona (no sale vacío)', /zona lumbar/i.test(con.banner || ''), '');
check('el banner dice QUÉ QUITÓ', /Quitamos/.test(con.banner || ''), '');
check('el banner NO promete revisión clínica', !/Se excluyeron ejercicios contraindicados/.test(con.banner || ''), '');
check('el banner declara que NO es valoración clínica', /NO una valoraci[oó]n cl[ií]nica/i.test(con.banner || ''), '');
check('la ciática dispara la derivación médica', /valore un profesional de la salud/i.test(con.banner || ''), '');
check('el banner no desborda a 390px', con.ancho <= con.visible + 1, `scrollWidth ${con.ancho} vs ${con.visible}`);
await ev(`typeof setTheme==='function'&&setTheme('light')`); await sleep(400); await shot('1-borrador-hernia-claro');
await ev(`typeof setTheme==='function'&&setTheme('dark')`); await sleep(400); await shot('2-borrador-hernia-oscuro');
await ev(`typeof setTheme==='function'&&setTheme('light')`); await sleep(300);

// ── 2) Sin limitación: el banner NO puede aparecer (antes salía con la zona VACÍA) ──
await ev(`cm('m-gen')`); await sleep(400);
await ev(`(()=>{openDetail('cSano');openGenRutinas();})()`); await sleep(900);
const sano = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('mg-body');
  const banner=b.querySelector('div[style*="fde8e8"]');
  return {banner: banner?(banner.innerText||'').replace(/\\s+/g,' '):null, n:[...b.querySelectorAll('.exname')].length};})())`));
check('sin lesión NO hay banner rojo de limitación', sano.banner === null, sano.banner || '');
check('sin lesión el borrador igual se genera', sano.n >= 10, sano.n + ' ejercicios');
await shot('3-borrador-sano-claro');

// ── 3) El CALENTAMIENTO de la ficha respeta la lesión ──
await ev(`cm('m-gen')`); await sleep(300);
const wu = JSON.parse(await ev(`JSON.stringify((()=>{try{
  const c=DB.clients.find(x=>x.id==='cLes');
  c.routines=[{id:'rQA',name:'Full Body',day:'Lunes',restSec:60,exercises:[
    {id:'x1',name:'Plancha Frontal',muscle:'core',type:'Isométrico',sets:3,reps:'30s'},
    {id:'x2',name:'Jalón al Pecho',muscle:'espalda',type:'Compuesto',sets:4,reps:'10'}]}];
  openDetail('cLes'); renderDetailRoutines(c);
  // Como lo abriría el coach: clic en la tarjeta y clic en la cabecera del calentamiento.
  // (Sin esto, innerText devuelve '' sobre lo colapsado y las aserciones "NO manda X" salen
  // verdes sobre algo que NUNCA se pintó — la trampa de v411/v413.)
  const rc=document.querySelector('#d-routines .rc'); if(rc) rc.querySelector('.rch').click();
  // El panel de calentamiento nace COLAPSADO por diseño (no es defecto): se abre como lo haría
  // el coach y se COMPRUEBA que quedó abierto, en vez de asumirlo.
  const wuh=document.querySelector('#d-routines .wupchev');
  const cab=wuh&&wuh.closest('div[onclick]');
  const cuerpo=cab&&cab.nextElementSibling;
  if(cuerpo&&!cuerpo.classList.contains('open')) cab.click();
  const t=(document.getElementById('d-routines').innerText||'').replace(/\\s+/g,' ');
  // VISIBLES de verdad (offsetHeight>0), no "presentes en el DOM": una lista colapsada sigue
  // teniendo su texto y dejaría pasar cualquier aserción de innerText.
  window.__WUC=cuerpo; // se mide APARTE, tras dejar que el panel termine de abrirse
  return {txt:t, abierto:!!(cuerpo&&cuerpo.classList.contains('open'))};
}catch(e){return {err:e.message}}})())`));
await sleep(700); // el panel abre con transición: medir en el mismo tick da altura 0
const wuVis = JSON.parse(await ev(`JSON.stringify((()=>{const c=window.__WUC; if(!c)return{visibles:0,muestra:[],display:'?'};
  window.__WUDISP=getComputedStyle(c).display;
  const vis=[...c.querySelectorAll('*')].filter(e=>e.offsetHeight>0&&!e.children.length&&/[A-Za-zÁ-ú]{4}/.test(e.textContent||''));
  const n=[...new Set(vis.map(e=>(e.textContent||'').trim()))];
  return {visibles:n.length, muestra:n.slice(0,16), alto:c.offsetHeight, display:window.__WUDISP};})())`));
Object.assign(wu, wuVis);
const PROHIBIDO = [
  ['Apertura de cadena posterior', /Apertura de cadena posterior/i],
  ['Rollitos sobre colchoneta', /Rollitos sobre colchoneta/i],
  ['Peso muerto con peso corporal', /Peso muerto con peso corporal/i],
];
check('el calentamiento se pintó', /Calentamiento/i.test(wu.txt || ''), wu.err || '');
PROHIBIDO.forEach(([nm, re]) => check('el calentamiento NO manda "' + nm + '"', !re.test(wu.txt || ''), ''));
check('el calentamiento no quedó vacío', /Círculos|Cat-Cow|Rotación|Plancha|Band pull/i.test(wu.txt || ''), '');
check('el panel de calentamiento quedó ABIERTO al abrirlo', wu.abierto === true, '');
check('los ejercicios del calentamiento se VEN (no solo están en el DOM)', wu.visibles >= 4,
  wu.visibles + ' visibles · display=' + wu.display + ' · alto=' + wu.alto + ' · ' + JSON.stringify(wu.muestra));
check('ninguno de los VISIBLES es contraindicado', !(wu.muestra || []).some(n => PROHIBIDO.some(([, re]) => re.test(n))),
  JSON.stringify(wu.muestra));
await ev(`(()=>{const e=document.querySelector('#d-routines .wupchev'); if(e) e.closest('.rcbody').scrollIntoView({block:'center'});})()`); await sleep(400);
await shot('4-calentamiento-hernia-claro');
await ev(`typeof setTheme==='function'&&setTheme('dark')`); await sleep(400); await shot('5-calentamiento-hernia-oscuro');

console.log('\n  errores JS:', jsErrors.length ? jsErrors.join(' | ') : 'ninguno');
const fails = results.filter(r => !r.c);
console.log('\n  ' + (results.length - fails.length) + '/' + results.length + ' aserciones OK · shots en ' + OUT);
chrome.kill(); srv.kill();
if (fails.length || jsErrors.length) { console.error('❌ FALLÓ: ' + fails.map(f => f.n).join(' · ') + (jsErrors.length ? ' | JS: ' + jsErrors.join(' | ') : '')); process.exit(1); }
console.log('✅ TODO OK — el filtro de lesiones llega a la pantalla');
process.exit(0);
