// Verificación E2E de v598 — «HOMBROS ENTRA A LAS MEDIDAS» (pedido del PO, 10-sep-2026).
//
// Los candados de la suite leen el fuente: prueban que el campo y su casilla existen los dos. Esto
// prueba lo que la suite NO puede ver — que la casilla se VE en el formulario y que el número
// SOBREVIVE al guardado y aparece en la tabla:
//   M1 el formulario pinta 13 casillas VISIBLES, con Hombros entre Cuello y Pecho
//   M2 un valor tecleado en Hombros llega a `DB.medidas` con su decimal intacto
//   M3 y sale en la tabla del asesorado rotulado «Hombros»
//   M4 CONTROL: una toma sin hombros NO inventa la fila (una fila vacía es peor que ninguna)
//
// 🛑 ANTES DE GUARDAR se comprueba el SELLO v298 (`cloudWriteSealed`): en localhost ningún harness
// puede escribir a producción. El incidente del 8-jul (un harness borró las 4 rutinas reales de
// Samuel) empezó exactamente así. Si el sello no está, esto ABORTA sin tocar nada.
// Corre: node scripts/e2e/_verify-v598.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8799;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v598-' + Date.now();
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ, detached: false });
await sleep(1400);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9298', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9298/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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

  // 🛑 EL SELLO PRIMERO. Sin él, guardar aquí escribiría en la nube REAL.
  const sello = await ev(`(typeof cloudWriteSealed==='function')?cloudWriteSealed(location.hostname):'no existe'`);
  check('S0 sello v298 activo: este harness NO puede escribir a producción', sello === true, 'cloudWriteSealed=' + sello);
  if (sello !== true) throw new Error('ABORTADO: el sello anti-escritura no está activo — no se guarda nada');

  // ── M1 · el formulario pinta las 13 casillas y se VEN ──
  // El candado premium vive en la ACCIÓN (v-medidas) y la cuenta QA puede no ser premium: se
  // neutraliza A PROPÓSITO para poder medir el formulario. Lo que se prueba aquí es el FORMULARIO,
  // no el candado (ese tiene sus propios tests).
  await ev(`(()=>{ window._medLocked=()=>false; try{premiumLocked=()=>false;}catch(e){} })()`);
  await ev(`openMedModal()`);
  await sleep(700);
  const form = await evj(`JSON.stringify((()=>{
    const md=document.getElementById('m-med');
    const abierto=!!md&&md.classList.contains('on')&&parseFloat(getComputedStyle(md).opacity)>0.9;
    const visibles=MED_FIELDS.filter(f=>{
      const e=document.getElementById('med-'+f.key);
      if(!e)return false;
      const r=e.getBoundingClientRect();
      return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';
    }).map(f=>f.key);
    const tronco=[...document.querySelectorAll('#m-med .medgrid')][0];
    const orden=tronco?[...tronco.querySelectorAll('input')].map(i=>i.id.replace('med-','')):[];
    const h=document.getElementById('med-hombros');
    return {abierto, visibles:visibles.length, total:MED_FIELDS.length, orden,
      hombrosAncho:h?Math.round(h.getBoundingClientRect().width):0,
      pista:(h&&h.parentElement.querySelector('.medhint')||{}).textContent||''};
  })())`);
  check('M0 montaje: el modal de medidas está abierto y opaco', form.abierto === true, JSON.stringify(form).slice(0, 120));
  check('M1 se ven TODAS las casillas (13 de 13), ninguna huérfana fuera de pantalla',
    form.visibles === form.total && form.total === 13, `visibles=${form.visibles} de ${form.total}`);
  check('M1b Hombros va entre Cuello y Pecho, y su casilla es tocable (≥36px de ancho)',
    JSON.stringify(form.orden) === JSON.stringify(['cuello', 'hombros', 'pecho', 'cintura', 'cadera']) && form.hombrosAncho >= 36,
    `orden=${JSON.stringify(form.orden)} ancho=${form.hombrosAncho}`);
  check('M1c la casilla dice CÓMO medirlo', /rodeando/i.test(form.pista) && form.pista.length > 40, form.pista.slice(0, 60));

  // ── M1d · el aviso de las tres reglas, que se leía roto ──
  // `.medfirst b{display:block}` estaba pensado para el TÍTULO y le caía a todas las negritas: el
  // párrafo rompía línea en cada resalte y una coma abría renglón («, con el»). Se afirma la
  // CONSECUENCIA que sufre quien lee (¿las negritas del párrafo van en línea?), no la presencia de
  // una regla en el CSS — así el check sigue sirviendo aunque el arreglo correcto sea otro (v453).
  const aviso = await evj(`JSON.stringify((()=>{
    const el=document.getElementById('med-first');
    if(!el||getComputedStyle(el).display==='none')return {visible:false};
    const bs=[...el.querySelectorAll('b')];
    return {visible:true, n:bs.length,
      titulo:bs.length?getComputedStyle(bs[0]).display:'',      // CONTROL: el título SÍ es bloque
      parrafo:bs.slice(1).map(b=>getComputedStyle(b).display),  // y el resto NO
      lineas:Math.round(el.getBoundingClientRect().height)};
  })())`);
  check('M1d el aviso de las tres reglas no rompe línea en cada negrita',
    aviso.visible === true && aviso.n >= 3 && aviso.titulo === 'block' &&
    aviso.parrafo.every(d => d === 'inline'), JSON.stringify(aviso));
  await shot('v598-formulario-medidas');

  // ── M2 · el número sobrevive al guardado, con su decimal ──
  const guardado = await evj(`JSON.stringify((()=>{
    document.getElementById('med-hombros').value='118.5';
    document.getElementById('med-cintura').value='95';
    const antes=((DB.medidas||{})[CUR.clientId]||[]).length;
    saveMedidas();
    const lista=(DB.medidas||{})[CUR.clientId]||[];
    const ult=lista[lista.length-1]||{};
    return {antes, despues:lista.length, hombros:ult.hombros, cintura:ult.cintura};
  })())`);
  check('M2 el valor de Hombros llega a DB.medidas con su decimal intacto',
    guardado.hombros === 118.5 && guardado.cintura === 95, JSON.stringify(guardado));

  // ── M3 · y aparece en la tabla que ve el asesorado ──
  await ev(`renderMedidasClient(CUR.clientId)`);
  await sleep(500);
  const tabla = await evj(`JSON.stringify((()=>{
    const t=document.getElementById('cn-med-list');
    const txt=t?t.innerText:'';
    return {hayHombros:/Hombros/.test(txt), hay118:/118[.,]5/.test(txt), largo:txt.length};
  })())`);
  check('M3 la tabla del asesorado muestra la fila «Hombros» con su número',
    tabla.hayHombros === true && tabla.hay118 === true, JSON.stringify(tabla));
  await shot('v598-tabla-medidas');

  // ── M4 · CONTROL: sin hombros la fila NO se inventa ──
  // La tabla salta los campos sin dato (`if(!cur&&!ini)return`). Si pintara la fila vacía, el
  // OK de M3 no probaría nada: cualquier toma mostraría «Hombros».
  const control = await evj(`JSON.stringify((()=>{
    const lista=(DB.medidas||{})[CUR.clientId]||[];
    const ult=lista[lista.length-1]; if(ult) delete ult.hombros;
    renderMedidasClient(CUR.clientId);
    const t=document.getElementById('cn-med-list');
    return {hayHombros:/Hombros/.test(t?t.innerText:'')};
  })())`);
  check('M4-CONTROL sin dato de hombros la fila NO aparece (la sonda discrimina)',
    control.hayHombros === false, JSON.stringify(control));

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
