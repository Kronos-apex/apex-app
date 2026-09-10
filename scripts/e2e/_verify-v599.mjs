// Verificación E2E de v599 — «EL VACÍO DE LA BÚSQUEDA DE ALIMENTOS TIENE QUE TENER SALIDA».
//
// El defecto: al no encontrar un alimento la app decía «Prueba con otro nombre — la lista tiene
// 181 alimentos». Para un PRODUCTO DE MARCA (una bebida de proteína del D1) eso es un callejón sin
// salida: no va a estar ahí por más nombres que se prueben. El camino para agregarlo existe desde
// el 10-ago (escanear el empaque o teclear el código) y estaba a un botón arriba, pero el mensaje
// del momento exacto en que se descubre que no está NO lo mencionaba.
// Medido: `food_barcodes` = **0 filas en toda la historia de la app**, con la función desplegada
// hace un mes. El primero en chocarse fue el propio PO.
//
// Se fuerza EL ESTADO EN EL QUE EL DEFECTO EXISTE (un harness que encuentra la superficie vacía es
// inofensivo) y se mide lo que la persona puede HACER, no qué texto salió:
//   V1 el vacío explica POR QUÉ no está y ofrece la salida como acción principal
//   V2 la salida FUNCIONA: lleva al escáner, y ahí está el campo para teclear el código a mano
//      (sin cámara también se puede — es la mitad que hace que el camino sirva de verdad)
//   V3 CONTROL: con una búsqueda que SÍ encuentra, ese vacío no aparece
// Cuenta QA + sello v298. Corre: node scripts/e2e/_verify-v599.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8801;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v599-' + Date.now();
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ, detached: false });
await sleep(1400);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9299', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--use-fake-ui-for-media-stream', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9299/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const evj = async expr => { const v = await ev(expr); try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return { crudo: v }; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

// Mide el vacío de la búsqueda para la consulta que se le pase.
const buscar = async (q) => {
  await ev(`(()=>{ _flView.modo='buscar'; _flView.sel=null; _flView.q=${JSON.stringify(q)}; renderFoodLogRoom(); })()`);
  await sleep(200);
  await sleep(600);
  return await evj(`JSON.stringify((()=>{
    const room=document.getElementById('flroom-body')||document.body;
    const vacio=room.querySelector('.empty');
    const txt=vacio?vacio.innerText:'';
    // El botón de salida se busca por lo que HACE (llama a flEscanear), no por su texto.
    const btns=[...room.querySelectorAll('button')].filter(b=>/flEscanear/.test(b.getAttribute('onclick')||''));
    const dentro=vacio?btns.filter(b=>vacio.contains(b)):[];
    const b=dentro[0]||null;
    const r=b?b.getBoundingClientRect():null;
    return {
      hayVacio:!!vacio, txt:txt.slice(0,220),
      diceMarca:/marca/i.test(txt), dicePorQue:/no va a estar/i.test(txt),
      salida:!!b, alto:r?Math.round(r.height):0, ancho:r?Math.round(r.width):0,
      // Dos botones que hacen LO MISMO en una pantalla reparten la atención: en el vacío tiene
      // que quedar UNA sola salida al escáner, no la de arriba más la del vacío.
      salidas:btns.length,
      dentroDePantalla:r?(r.left>=0&&r.right<=window.innerWidth+1):false,
      // CONTROL DE MONTAJE: la habitación tiene que estar de verdad abierta y opaca (v453)
      abierta:(()=>{const s=document.querySelector('.sroom.on');return !!s&&parseFloat(getComputedStyle(s).opacity)>0.9})()
    };
  })())`);
};

try {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none'&&CUR&&CUR.clientId)})()`);
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~4-5 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{hideClientWelcome();}catch(e){}['data-ob','cwelcome','m-fsintro','m-textsize'].forEach(i=>{const e=document.getElementById(i);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';try{localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));ntClose(false);}catch(e){}})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}})()`);

  // El registro de comida es Premium de app y la cuenta QA puede no serlo: el candado se
  // neutraliza A PROPÓSITO para llegar al estado que se quiere medir. Lo que se prueba aquí es el
  // VACÍO de la búsqueda, no el candado (ese tiene sus propios tests).
  // Y el registro de comida tiene su propio consentimiento por persona (`foodlogOk`): sin
  // activarlo la habitacion pinta el AVISO, no el buscador — otro estado, y medirlo ahi seria
  // aprobar por la pantalla equivocada. Se activa solo en memoria (sello v298).
  await ev(`(()=>{ try{premiumLocked=()=>false;}catch(e){} const c=DB.clients.find(x=>x.id===CUR.clientId); if(c)c.foodlogOk=true; })()`);
  await ev(`openFoodLogRoom&&openFoodLogRoom('desayuno')`);
  await sleep(600);
  await ev(`flBuscar&&flBuscar('desayuno')`);   // esta puerta es la que CARGA el catalogo
  await sleep(1200);
  const abierta = await ev(`!!document.querySelector('.sroom.on')`);
  check('V0 montaje: la habitación del registro de comida está abierta', abierta === true, 'sroom.on=' + abierta);
  // El catálogo se carga por red: sin esperarlo el vacío que sale es «Cargando alimentos…», que es
  // OTRO estado — medirlo ahí sería aprobar por el estado equivocado.
  // `_foodCat` es un `let` de modulo: NO vive en `window` (mi primera sonda leia window._foodCat
  // y media 0 siempre, con lo que el 'control' pasaba por vacio en vez de por discriminar).
  const cargado = await waitFor(`!!(typeof _foodCat!=='undefined'&&_foodCat&&_foodCat.length>0)`, 25000);
  check('V0b el catálogo de alimentos cargó (si no, el vacío medido sería «Cargando…»)',
    cargado === true, 'foodCat=' + await ev(`(typeof _foodCat!=='undefined'&&_foodCat)?_foodCat.length:'sin cargar'`));

  // ── V1 · el vacío con un producto que NUNCA va a estar en la lista ──
  const v = await buscar('bebida proteina d1 zenu xyz');
  check('V1 el vacío aparece para un producto de marca', v.hayVacio === true, v.txt.slice(0, 80));
  check('V1b y DICE por qué no está (no manda a probar otro nombre en círculos)',
    v.diceMarca === true && v.dicePorQue === true, v.txt.slice(0, 160));
  check('V1c la salida está DENTRO del vacío, es tocable (≥36px) y cabe en 390px',
    v.salida === true && v.alto >= 36 && v.dentroDePantalla === true,
    `alto=${v.alto} ancho=${v.ancho} dentro=${v.dentroDePantalla}`);
  check('V1d en el vacío hay UNA sola salida al escáner, no dos botones que hacen lo mismo',
    v.salidas === 1, 'botones que llaman a flEscanear=' + v.salidas);
  await shot('v599-vacio-con-salida');

  // ── V3 · CONTROL: con algo que SÍ está, este vacío no aparece ──
  // Sin este caso, «hay un vacío con botón» lo aprobaría una pantalla que lo muestre SIEMPRE.
  const c = await buscar('arroz');
  // Y el CONTROL del control: con resultados el botón de escanear de ARRIBA sigue estando. Si
  // esconderlo fuera incondicional, V1d pasaría igual y el caso normal se quedaría sin escáner.
  check('V3-CONTROL con «arroz» (que sí está) el vacío NO aparece, y el escáner de arriba SIGUE',
    c.hayVacio === false && c.salidas === 1,
    JSON.stringify({ hayVacio: c.hayVacio, salidas: c.salidas, txt: c.txt.slice(0, 60) }));

  // ── V2 · la salida funciona y el camino SIN CÁMARA existe ──
  await buscar('bebida proteina d1 zenu xyz');
  await ev(`(()=>{const s=document;
    const b=[...s.querySelectorAll('#flroom-body .empty button')].find(x=>/flEscanear/.test(x.getAttribute('onclick')||''));
    if(b)b.click();})()`);
  await sleep(1500);
  const esc2 = await evj(`JSON.stringify((()=>{
    const inp=document.getElementById('fl-ean');
    const r=inp?inp.getBoundingClientRect():null;
    return {modo:_flView.modo, campoCodigo:!!inp, visible:r?(r.width>0&&r.height>0):false,
      alto:r?Math.round(r.height):0,
      hayBoton:!![...document.querySelectorAll('button')].find(b=>/flBuscarEan/.test(b.getAttribute('onclick')||''))};
  })())`);
  check('V2 la salida lleva al escáner', esc2.modo === 'escanear', JSON.stringify(esc2));
  check('V2b y ahí se puede TECLEAR el código sin cámara (la mitad que hace útil el camino)',
    esc2.campoCodigo === true && esc2.visible === true && esc2.hayBoton === true, JSON.stringify(esc2));
  await shot('v599-escaner-con-codigo-a-mano');

  log('\njsErrors: ' + JSON.stringify(jsErrors));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log('\n' + (fails === 0 && jsErrors.length === 0 ? 'TODO OK' : fails + ' FALLA(S)'));
  process.exitCode = (fails === 0 && jsErrors.length === 0) ? 0 : 1;
} catch (e) {
  log('ERROR: ' + (e && e.message));
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
