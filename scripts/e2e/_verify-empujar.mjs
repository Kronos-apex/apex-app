// Verificación E2E de v580: «EMPUJAR 💪» NO SALE SIN DESTINATARIO.
//
// El banner de adherencia del Inicio del coach pintaba el botón para TODO el mundo, y
// `whatsappNudge` cae a «elige el contacto» cuando el número no es plausible. Medido el
// 6-sep-2026 sobre las fichas reales: **de 14 dormidos, 12 sin ninguna vía** — 5 de los 6
// botones visibles no llevaban a nadie. Y el daño mayor era el ORDEN: los «nunca empezó» van
// primero y son justo los que no dejaron teléfono, así que el único caso accionable quedaba
// enterrado bajo «y N más…».
//
// 🔒 Se afirma la CONSECUENCIA que sufre la persona (¿cuántos botones se ven? ¿sobre quién?),
//    nunca la presencia de un selector — regla de v453.
// Patrón preview-SIN-login: se inyectan asesorados fake y se llama `renderHome()` directo
// (cero login → cero rate-limit → nada toca la nube).
//
// Corre: node scripts/e2e/_verify-empujar.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8791;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-empujar-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9291', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9291/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

// Monta un escenario: `gente` = [{nombre, tel, diasSinEntrenar|null}].
// Un pago vigente por 20 días deja a todos con membresía activa (el banner excluye
// inactive/overdue/suspended, así que sin esto el escenario mediría otra cosa).
async function escenario(gente) {
  const r = await ev(`(()=>{try{
    const now=Date.now(), d=n=>new Date(now+n*86400000).toISOString();
    DB.clients=${JSON.stringify(gente)}.map((g,i)=>({
      id:'fk'+i, name:g.nombre, phone:g.tel||'', days:3, level:'Intermedio', goal:'Ganar músculo',
      routines:[{id:'r'+i,day:'Lunes',name:'Full body',exercises:[]}],
      payments:[{date:d(-10),dueDate:d(20),amount:100000,note:''}]
    }));
    DB.history={};
    ${JSON.stringify(gente)}.forEach((g,i)=>{
      if(g.diasSinEntrenar==null) return;               // null = nunca entrenó
      DB.history['fk'+i]=[{id:'s'+i,routineId:'r'+i,routineName:'Full body',
        date:d(-g.diasSinEntrenar),startedAt:d(-g.diasSinEntrenar),finishedAt:d(-g.diasSinEntrenar),
        doneSets:9,totalSets:9,totalVol:1000,exercises:[]}];
    });
    renderHome();
    return 'ok';
  }catch(e){return String(e&&e.stack||e);}})()`);
  if (r !== 'ok') throw new Error('MONTAJE falló → ' + r);
  await sleep(350);
  // 🔒 CONTROL DE COBERTURA. «display distinto de none» NO es «se ve»: la primera corrida midió
  //    geometría correcta con el SPLASH encima de todo, y la captura salía siendo la foto de
  //    portada. Se comprueba por HIT-TEST —quién recibe el toque en el centro del banner— que es
  //    la pregunta que de verdad importa (misma regla que el «Volver» bajo el reloj, v525).
  const vis = JSON.parse(await ev(`(()=>{
    const b=document.getElementById('h-adherence-banner');
    if(!b) return JSON.stringify({ok:false,por:'no existe'});
    const cs=getComputedStyle(b);
    if(cs.display==='none') return JSON.stringify({ok:false,por:'display none'});
    // El Inicio del coach scrollea: sin llevarlo A LA VISTA, elementFromPoint mira fuera del
    // viewport y devuelve null — un rojo del harness, no de la app (regla de v453).
    b.scrollIntoView({block:'center'});
    const r=b.getBoundingClientRect();
    if(r.height<=0) return JSON.stringify({ok:false,por:'alto 0',h:r.height});
    const enc=document.elementFromPoint(Math.round(r.left+r.width/2), Math.round(r.top+8));
    return JSON.stringify({ok:!!(enc&&b.contains(enc)), por:'tapado por: '+((enc&&(enc.id||enc.className))||'?'), h:Math.round(r.height)});
  })()`));
  if (!vis.ok) throw new Error('MONTAJE: el banner no se VE → ' + JSON.stringify(vis));
}

// Lee SOLO lo que se ve: título, nombres con botón «Empujar» y la línea de los inalcanzables.
const leer = () => ev(`(()=>{
  const b=document.getElementById('h-adherence-banner');
  const filas=[...b.querySelectorAll('div')].filter(d=>d.querySelector('button'));
  const conBoton=[...b.querySelectorAll('button')]
    .filter(x=>/Empujar/.test(x.textContent))
    .map(x=>{const f=x.closest('div');return (f&&f.querySelector('div>div')||{}).textContent||'?';});
  // OJO: el titulo es el PRIMER hijo de la tarjeta. Un selector "div>div" a secas devuelve la
  //      tarjeta entera y su innerText completo — con eso, dos aserciones dieron rojo sobre una
  //      pantalla CORRECTA en la primera corrida. Una sonda se verifica antes de creerle (v453).
  //      (Sin comillas invertidas aqui: este comentario vive DENTRO de un template literal.)
  return JSON.stringify({
    titulo:((b.querySelector('.card')||b).firstElementChild||{}).textContent.trim()||'',
    botones:[...b.querySelectorAll('button')].filter(x=>/Empujar/.test(x.textContent)).length,
    nombresConBoton:[...b.querySelectorAll('button')].filter(x=>/Empujar/.test(x.textContent))
      .map(x=>{const fila=x.parentElement;return (fila.querySelector('div div')||{}).textContent||'?';}),
    texto:b.innerText.replace(/\\s+/g,' ').trim()
  });
})()`).then(JSON.parse);

const TEL_OK = '+57 300 111 2233';   // móvil CO: waPhone lo acepta
const TEL_FIJO = '601 555 5555';     // fijo de Bogotá: NO es vía de WhatsApp (v520)

try {
  const ready = await waitFor(`(typeof renderHome==='function' && typeof coachCanReach==='function' && typeof DB==='object' && !!document.getElementById('h-adherence-banner'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (renderHome/coachCanReach/DB/#h-adherence-banner)');
  // El splash (`#apex-loading`) vive por encima de TODO y en preview-sin-login nadie lo quita:
  // sin esto, las capturas salen siendo la foto de portada aunque el DOM esté bien montado.
  await ev(`(()=>{try{['apex-loading','avi-loading'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});}catch(e){}
                  try{showScreen('s-coach');}catch(e){}
                  try{if(typeof gp==='function')gp('p-home');}catch(e){}})()`);
  await sleep(400);

  // ── E1: mezcla real (la de hoy: pocos alcanzables, muchos sin vía, y los sin vía primero) ──
  log('\n=== E1: 2 alcanzables + 4 sin vía, con los «nunca empezó» delante ===');
  await escenario([
    { nombre: 'Zulma NuncaEmpezo', tel: '', diasSinEntrenar: null },
    { nombre: 'Yolanda NuncaEmpezo', tel: '', diasSinEntrenar: null },
    { nombre: 'Ximena NuncaEmpezo', tel: '', diasSinEntrenar: null },
    { nombre: 'Wilson Fijo', tel: TEL_FIJO, diasSinEntrenar: 12 },
    { nombre: 'Nataly Alcanzable', tel: TEL_OK, diasSinEntrenar: 6 },
    { nombre: 'Maria Alcanzable', tel: TEL_OK, diasSinEntrenar: null },
  ]);
  let v = await leer();
  log('    ' + JSON.stringify(v.nombresConBoton));
  check('E1a se pintan EXACTAMENTE 2 botones (los 2 alcanzables)', v.botones === 2, String(v.botones));
  check('E1b y son ELLOS: ningún botón sobre quien no tiene vía',
    v.nombresConBoton.every(n => /Alcanzable/.test(n)), JSON.stringify(v.nombresConBoton));
  // 🔴 El defecto de verdad: antes el único caso accionable quedaba bajo «y N más…».
  check('E1c Nataly (la que sí se puede alcanzar) YA SE VE, no queda enterrada',
    /Nataly/.test(v.texto), v.texto.slice(0, 120));
  check('E1d el titular cuenta 2, no 6', /^💤 2 /.test(v.titulo), v.titulo);
  check('E1e los 4 sin vía se DICEN (no se esconden) y llevan al reporte',
    /Otros 4 llevan días sin entrenar/.test(v.texto), v.texto.slice(-140));
  const llevaAlReporte = await ev(`/openCoachStat\\('sinentrenar'\\)/.test(document.getElementById('h-adherence-banner').innerHTML)`);
  check('E1f esa línea es pulsable y abre «Sin entrenar»', llevaAlReporte === true, String(llevaAlReporte));
  await shot('empujar-e1-claro');

  // ── E2: NADIE alcanzable — el caso que hoy sería el 86% de la lista ──
  log('\n=== E2: ninguno alcanzable ===');
  await escenario([
    { nombre: 'Zulma SinTel', tel: '', diasSinEntrenar: null },
    { nombre: 'Yolanda SinTel', tel: '', diasSinEntrenar: 20 },
    { nombre: 'Wilson Fijo', tel: TEL_FIJO, diasSinEntrenar: 12 },
  ]);
  v = await leer();
  check('E2a cero botones «Empujar»', v.botones === 0, String(v.botones));
  check('E2b el titular NO promete un empujón imposible', !/necesita/.test(v.titulo) && /no tienes cómo avisarles/.test(v.titulo), v.titulo);
  check('E2c y aun así dice cuántos son (no desaparecen)', /3/.test(v.titulo), v.titulo);
  // Sin nadie alcanzable, el titular YA lo dice: repetirlo abajo era ruido (lo destapó E2).
  check('E2d la línea de abajo no repite el titular, solo lleva al reporte',
    /Ver quiénes son/.test(v.texto) && !/Otros 3 llevan días/.test(v.texto), v.texto.slice(-90));
  await shot('empujar-e2-claro');

  // ── E3: CONTROL · todos alcanzables → ni línea de inalcanzables ni ruido ──
  log('\n=== E3: CONTROL · todos alcanzables ===');
  await escenario([
    { nombre: 'Ana Alcanzable', tel: TEL_OK, diasSinEntrenar: 9 },
    { nombre: 'Beto Alcanzable', tel: TEL_OK, diasSinEntrenar: 15 },
  ]);
  v = await leer();
  check('E3a los 2 conservan su botón (el arreglo no borró la feature)', v.botones === 2, String(v.botones));
  check('E3b sin inalcanzables NO aparece la línea de «no hay cómo avisarles»',
    !/no hay cómo avisarles/.test(v.texto), v.texto.slice(-120));
  check('E3c el titular vuelve a la forma de siempre', /^💤 2 asesorados necesitan un empujón/.test(v.titulo), v.titulo);

  // ── E3b: la MISMA pantalla en tema CLARO (la app arranca en oscuro, así que sin esto la
  //         verificación visual solo cubre la mitad — barra premium).
  log('\n=== E3-claro: mezcla en tema CLARO ===');
  await ev(`(()=>{try{setTheme('light');}catch(e){document.body.classList.remove('dark');}})()`);
  await escenario([
    { nombre: 'Zulma NuncaEmpezo', tel: '', diasSinEntrenar: null },
    { nombre: 'Wilson Fijo', tel: TEL_FIJO, diasSinEntrenar: 12 },
    { nombre: 'Nataly Alcanzable', tel: TEL_OK, diasSinEntrenar: 6 },
  ]);
  v = await leer();
  check('E3d en claro se pinta lo mismo (1 botón + la línea)', v.botones === 1 && /no hay cómo avisarles/.test(v.texto), v.titulo);
  await shot('empujar-e3-claro');
  await ev(`(()=>{try{setTheme('dark');}catch(e){document.body.classList.add('dark');}})()`);

  // ── E4: la misma pantalla en OSCURO y a 360px (barra premium) ──
  log('\n=== E4: oscuro + 360px ===');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await ev(`(()=>{try{setTheme('dark');}catch(e){document.body.classList.add('dark');}})()`);
  await escenario([
    { nombre: 'Zulma NuncaEmpezo', tel: '', diasSinEntrenar: null },
    { nombre: 'Nataly Alcanzable', tel: TEL_OK, diasSinEntrenar: 6 },
    { nombre: 'Wilson Fijo', tel: TEL_FIJO, diasSinEntrenar: 12 },
  ]);
  const geo = JSON.parse(await ev(`(()=>{
    const b=document.getElementById('h-adherence-banner');
    const r=b.getBoundingClientRect();
    const btn=[...b.querySelectorAll('button')].find(x=>/Empujar/.test(x.textContent));
    const br=btn?btn.getBoundingClientRect():null;
    return JSON.stringify({desbordaX:r.right>document.documentElement.clientWidth+1,
      altoBtn:br?Math.round(br.height):0, anchoBtn:br?Math.round(br.width):0});
  })()`));
  check('E4a el banner no se sale de 360px', geo.desbordaX === false, JSON.stringify(geo));
  check('E4b el botón sigue siendo pulsable (≥28px de alto, con su área .tap)', geo.altoBtn >= 24, JSON.stringify(geo));
  await shot('empujar-e4-oscuro-360');

} catch (e) { results.push('FATAL ' + e.message); }
finally {
  const errs = [...new Set(jsErrors)].slice(0, 8);
  log('\n===RESUMEN===');
  results.forEach(r => log(r));
  log('jsErrors: ' + JSON.stringify(errs));
  const bad = results.filter(r => !r.startsWith('OK'));
  log(bad.length ? `\n${bad.length} FALLA(S)` : '\nTODO OK');
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(bad.length ? 1 : 0);
}
