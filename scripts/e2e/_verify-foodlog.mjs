// Verificación E2E del REGISTRO DE ALIMENTOS (F2). Login real con la CUENTA QA (qa-harness).
// El sello v298 (cloudWriteSealed) corta toda escritura a la nube en localhost, así que lo que
// se registra aquí JAMÁS toca producción.
//
// Cubre las estipulaciones E9/E10/E11 de Fable:
//   FL1  el bloque «Comida de hoy» sale en la tarjeta de hábitos
//   FL2  la habitación NO deja registrar sin mostrar antes el aviso de que el coach lo ve
//   FL3  al aceptar, aparece el día con sus 5 comidas
//   FL4  buscar en español encuentra (incluida una fruta que solo trae la tabla del ICBF)
//   FL5  agregar guarda: la entrada queda en client.foodlog y el total del día SE PINTA
//   FL6  el total pintado coincide con el cálculo independiente desde el catálogo
//   FL7  borrar quita la entrada y el total vuelve a cero
//   FL8  E9 — con foods.json BLOQUEADO por red, la app arranca y el registro sigue usable
//   FL9  cantidad imposible no entra
//   FL10 el botón atrás cierra la habitación (no se sale de la app)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8779;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-foodlog-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const BLOQUEAR = process.argv.includes('--sin-catalogo');   // FL8

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9279', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9279/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch { } await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch { } await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
if (BLOQUEAR) await send('Network.setBlockedURLs', { urls: ['*foods.json*'] });
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
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~2-3 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  // Arranque limpio: sin registro previo y sin el aviso aceptado (solo memoria; el sello corta la nube).
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    const c=DB.clients.find(x=>x.id===CUR.clientId); delete c.foodlog; delete c.foodlogOk; delete c.tier;
    // FIXTURE REALISTA: sin sesiones, la app trata al asesorado como «dia 1» (v403) y OCULTA a
    // proposito toda la tarjeta de habitos. Quien registra lo que come es alguien que ya entrena,
    // asi que el fixture le da historial. Un fixture que no se parece a produccion fabrica
    // defectos que no existen (gotcha vigente).
    const hoy=Date.now();
    DB.history[CUR.clientId]=[0,2,4].map(d=>({id:'hfl'+d,routineId:'rfl',name:'Full Body',
      date:new Date(hoy-(d+1)*86400000).toISOString(), finishedAt:new Date(hoy-(d+1)*86400000+3.6e6).toISOString(),
      doneSets:12,totalSets:12,exercises:[]}));
    navReset('cn-today');cnTab('cn-today',_cnTabEl('cn-today'),true);renderClientToday(c);})()`);
  await sleep(600);

  // FL1 — el bloque sale en la tarjeta de hábitos. OBSERVA lo que la app pinta sola: la sonda
  // NO llama a renderHabitsCard (la primera versión lo hacía y se fabricaba su propio verde).
  await waitFor(`!!document.querySelector('#cn-habits .hb-card')`, 8000);
  let s = JSON.parse(await ev(`JSON.stringify((()=>{const el=document.getElementById('cn-habits');
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const hist=(DB.history||{})[CUR.clientId]||[];

    return {bloque:!!document.querySelector('#cn-habits .hb-ic.fl'), largo:el?el.innerHTML.length:-1,
      libre:typeof isFreeClient==='function'?isFreeClient(c):'nofn', sesiones:hist.length,
      sesiones2:hist.length,
      titulo:[...document.querySelectorAll('#cn-habits .hb-title')].map(e=>e.textContent).join('|')};})())`));
  check('FL1 el bloque «Comida de hoy» sale junto a agua y pasos', s.bloque && /Comida de hoy/.test(s.titulo), JSON.stringify(s));

  // FL2 — sin aceptar el aviso NO se puede registrar
  await ev(`openFoodLogRoom()`); await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('flroom-body');
    return {abierta:document.getElementById('foodlog-room').classList.contains('on'),
      aviso:/lo ve tu coach/i.test(b.textContent||''), botonAgregar:/Agregar/.test(b.textContent||'')};})())`));
  check('FL2 primero el aviso de que el coach lo ve, y NO deja registrar todavía', s.abierta && s.aviso && !s.botonAgregar, JSON.stringify(s));

  // FL3 — al aceptar aparece el día con sus comidas
  await ev(`flAceptarAviso()`); await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('flroom-body').textContent||'';
    return {desayuno:/Desayuno/.test(b), cena:/Cena/.test(b), sinReg:/Sin registrar/.test(b),
      ok:!!DB.clients.find(x=>x.id===CUR.clientId).foodlogOk};})())`));
  check('FL3 aceptado el aviso, se ve el día con sus comidas', s.desayuno && s.cena && s.sinReg && s.ok, JSON.stringify(s));

  // FL4 — buscar en español (incluida una fruta que solo trae el ICBF)
  await ev(`flBuscar('almuerzo')`); await sleep(900);
  s = JSON.parse(await ev(`(async()=>{await foodCatalogLoad();flQ('lulo');await new Promise(r=>setTimeout(r,150));
    const b=document.getElementById('flroom-body').textContent||'';
    const n=(_foodCat||[]).length;
    return JSON.stringify({n, lulo:/Lulo/.test(b)});})()`));
  check('FL4 el buscador responde en español y trae la fruta del ICBF', s.n > 0 && (BLOQUEAR ? true : s.lulo), JSON.stringify(s) + (BLOQUEAR ? ' (catálogo degradado)' : ''));

  if (!BLOQUEAR) {
    // FL5 + FL6 — agregar guarda, pinta, y el total cuadra con un cálculo INDEPENDIENTE
    s = JSON.parse(await ev(`(()=>{const f=_foodCat.find(x=>x.id==='arroz');flElegir('arroz');flGuardar('arroz',200);
      const c=DB.clients.find(x=>x.id===CUR.clientId);
      const dia=foodLogDay(c.foodlog); const tot=foodLogTotals(dia);
      const esperado=Math.round(f.kcal*200/100);
      const pintado=(document.getElementById('flroom-body').textContent||'');
      return JSON.stringify({n:dia.length, kcal:tot.kcal, esperado, pinta:pintado.includes(String(esperado)), nombre:dia[0]&&dia[0].name});})()`));
    check('FL5 agregar guarda la entrada y la pinta', s.n === 1 && /Arroz/.test(s.nombre || ''), JSON.stringify(s));
    check('FL6 el total del día cuadra con el cálculo independiente', Math.abs(s.kcal - s.esperado) <= 1 && s.pinta, JSON.stringify(s));

    // FL9 — cantidad imposible no entra
    s = JSON.parse(await ev(`(()=>{const antes=foodLogDay(DB.clients.find(x=>x.id===CUR.clientId).foodlog).length;
      flGuardar('arroz',0); flGuardar('arroz',-5);
      const dsp=foodLogDay(DB.clients.find(x=>x.id===CUR.clientId).foodlog).length;
      return JSON.stringify({antes,dsp});})()`));
    check('FL9 cantidad 0 o negativa NO entra al registro', s.antes === s.dsp, JSON.stringify(s));

    // FL7 — borrar
    s = JSON.parse(await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
      const e=foodLogDay(c.foodlog)[0]; flQuitar(e.id);
      const dia=foodLogDay(c.foodlog);
      return JSON.stringify({n:dia.length, kcal:foodLogTotals(dia).kcal});})()`));
    check('FL7 borrar quita la entrada y el total vuelve a cero', s.n === 0 && s.kcal === 0, JSON.stringify(s));
  }

  // FL8 — degradación: con el catálogo bloqueado la app arranca y el registro sigue usable
  if (BLOQUEAR) {
    s = JSON.parse(await ev(`(async()=>{await foodCatalogLoad();
      return JSON.stringify({n:(_foodCat||[]).length, arroz:!!(_foodCat||[]).find(x=>x.id==='arroz'),
        boot:typeof window._aviUpdateBusy!=='undefined'});})()`));
    check('FL8 sin foods.json la app arranca y quedan los 50 de avi-core', s.n >= 50 && s.arroz && s.boot, JSON.stringify(s));
  }

  // FL10 — el botón atrás cierra la habitación
  await ev(`(()=>{if(!document.getElementById('foodlog-room').classList.contains('on'))openFoodLogRoom();})()`); await sleep(400);
  await ev(`history.back()`); await sleep(700);
  s = await ev(`document.getElementById('foodlog-room').classList.contains('on')`);
  check('FL10 el botón atrás cierra el registro (no se sale de la app)', s === false, 'abierta=' + s);

  const errs = jsErrors.filter(e => !/favicon|net::ERR_BLOCKED/.test(e));
  check('sin errores JS', errs.length === 0, errs.join(' | '));
} catch (e) {
  check('EXCEPCIÓN', false, e.message);
} finally {
  const fails = results.filter(r => r.startsWith('FAIL'));
  log('\n' + (fails.length ? `❌ ${fails.length}/${results.length} fallaron` : `✅ ${results.length}/${results.length} OK`));
  try { ws.close(); } catch { }
  try { chrome.kill(); } catch { }
  try { srv.kill(); } catch { }
  process.exit(fails.length ? 1 : 0);
}
