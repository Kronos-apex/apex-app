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
//
// F5 · EL ESCÁNER DE CÓDIGOS (avi-v473). La cámara NO existe en headless, así que lo que aquí
// se prueba es TODO lo demás: que el botón esté, que sin lector se diga por qué y se pueda
// teclear igual, que un producto nuevo se pueda aportar, y —lo que de verdad importa— que la
// conversión «por porción → por 100 g» sobreviva hasta lo que la persona acaba registrando.
// La nube va STUBBEADA (`AUTH.client()`), como el resto de harnesses: nada sale de esta máquina.
//   F5-1  el botón «Escanear un empaque» está en el buscador
//   F5-2  sin lector nativo (el Safari del iPhone) se dice POR QUÉ y se puede teclear igual
//   F5-3  un código mal tecleado avisa y no deja a nadie atascado
//   F5-4  un código que no está en el catálogo abre «producto nuevo» con el código a la vista
//   F5-5  el error de datos imposibles es HUMANO, no un error de motor de base de datos
//   F5-6  guardar deja el producto listo, marcado «sin revisar»
//   F5-7  🔴 lo registrado lleva los macros CONVERTIDOS, no los del empaque
//   F5-8  al salir, la cámara queda apagada
//   F5-9  el formulario cabe a 360px y con letra «Muy grande»
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

  // ══════════ F5 · EL ESCÁNER DE CÓDIGOS ══════════
  if (!BLOQUEAR) {
    // La nube, stubbeada: el catálogo de códigos arranca VACÍO y todo insert se queda aquí.
    // Se instala ANTES de levantar el sello, o una escritura podría irse de verdad.
    await ev(`(()=>{
      window._bcFake={filas:[],inserts:0};
      const tabla=()=>({
        select:()=>({eq:(col,val)=>({maybeSingle:async()=>({data:window._bcFake.filas.find(r=>r.ean===val)||null,error:null})})}),
        insert:async row=>{ window._bcFake.inserts++; window._bcFake.filas.push(Object.assign({verified:false},row)); return {error:null}; },
      });
      AUTH.client=()=>({from:()=>tabla()});
      window.AVI_ALLOW_CLOUD_WRITE=true;   // el destino ya es el stub, no la nube
      localStorage.removeItem('ax_bccache'); _bcCache=null; _foodCat=null; _foodCatCargando=null;
    })()`);
    await ev(`(()=>{if(!document.getElementById('foodlog-room').classList.contains('on'))openFoodLogRoom();flBuscar('almuerzo');})()`);
    await sleep(500);

    // F5-1 — el botón existe y está cableado
    s = JSON.parse(await ev(`JSON.stringify((()=>{const b=[...document.querySelectorAll('#flroom-body button')].find(x=>/Escanear/.test(x.textContent));
      return {hay:!!b, onclick:b?b.getAttribute('onclick'):'', alto:b?Math.round(b.getBoundingClientRect().height):0};})())`));
    check('F5-1 el botón «Escanear un empaque» está y es táctil (≥36px)', s.hay && /flEscanear/.test(s.onclick) && s.alto >= 36, JSON.stringify(s));

    // F5-2 — sin lector nativo: se dice POR QUÉ y queda el campo para teclear (el caso iPhone)
    await ev(`(()=>{ window._bdReal=window.BarcodeDetector; delete window.BarcodeDetector; flEscanear(); })()`);
    await sleep(500);
    s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('flroom-body');
      return {txt:b.textContent, campo:!!document.getElementById('fl-ean'), video:!!document.getElementById('fl-video')};})())`));
    check('F5-2 sin lector se explica y se puede teclear igual (nunca un botón muerto)',
      /Safari|navegador/i.test(s.txt) && s.campo && !s.video, JSON.stringify({ campo: s.campo, video: s.video, txt: (s.txt || '').slice(0, 90) }));

    // F5-3 — código mal tecleado: avisa y sigue usable
    await ev(`(()=>{document.getElementById('fl-ean').value='5901234123456';flBuscarEan(document.getElementById('fl-ean').value);})()`);
    await sleep(400);
    s = JSON.parse(await ev(`JSON.stringify({txt:document.getElementById('flroom-body').textContent,campo:!!document.getElementById('fl-ean'),inserts:window._bcFake.inserts})`));
    check('F5-3 un código con un dígito mal avisa y no atasca a nadie',
      /no cuadra/i.test(s.txt) && s.campo && s.inserts === 0, JSON.stringify({ campo: s.campo, inserts: s.inserts }));

    // F5-4 — código válido que no está: se abre «producto nuevo»
    await ev(`flBuscarEan('5901234123457')`);
    await sleep(900);
    s = JSON.parse(await ev(`JSON.stringify({modo:_flView.modo,txt:document.getElementById('flroom-body').textContent,name:!!document.getElementById('bc-name'),porcion:!!document.getElementById('bc-porcion')})`));
    check('F5-4 un código que nadie ha aportado abre «producto nuevo» con el código a la vista',
      s.modo === 'nuevo' && s.name && s.porcion && /5901234123457/.test(s.txt), JSON.stringify({ modo: s.modo, name: s.name, porcion: s.porcion }));

    // F5-5 — datos imposibles: el mensaje es HUMANO y nada se guarda. Se prueban los DOS
    // caminos, porque no dan el mismo error y los dos existen en la vida real:
    //   (a) «por porción» con una porción chica → el tope salta al convertir, y el mensaje
    //       tiene que apuntar a la PORCIÓN, que es donde está el error de verdad;
    //   (b) «por 100 g» con macros que suman más de 100 → el espejo del CHECK de la tabla.
    // La propiedad que se afirma no es una palabra concreta: es que NUNCA se le enseñe a nadie
    // un error del motor de base de datos.
    // ⚠️ Solo PALABRAS. La primera versión traía `23\d{3}` (los SQLSTATE de Postgres) y casaba
    // dentro del CÓDIGO DE BARRAS que la propia pantalla muestra — dos rojos que eran de la
    // sonda, no de la app. Un patrón numérico suelto sobre el texto de una pantalla que
    // contiene números es un falso positivo esperando.
    const MOTOR = /constraint|violates|null value|PGRST|duplicate key|permission denied/i;
    await ev(`(()=>{const v=(id,x)=>{document.getElementById(id).value=x};
      v('bc-name','Prueba');v('bc-porcion','2');v('bc-kcal','120');v('bc-p','40');v('bc-c','40');v('bc-f','40');})()`);
    await ev(`flGuardarProducto()`); await sleep(600);
    s = JSON.parse(await ev(`JSON.stringify({txt:document.getElementById('flroom-body').textContent,inserts:window._bcFake.inserts})`));
    check('F5-5a con una porción imposible, el error apunta a la PORCIÓN y nada se guardó',
      /Revisa el tamaño de la porción/i.test(s.txt) && !MOTOR.test(s.txt) && s.inserts === 0,
      JSON.stringify({ inserts: s.inserts, txt: (s.txt || '').match(/Con esa porción[^]{0,80}/) }));
    await ev(`flBase('g100')`); await sleep(300);
    await ev(`(()=>{const v=(id,x)=>{document.getElementById(id).value=x};
      v('bc-kcal','450');v('bc-p','40');v('bc-c','40');v('bc-f','40');})()`);
    await ev(`flGuardarProducto()`); await sleep(600);
    s = JSON.parse(await ev(`JSON.stringify({txt:document.getElementById('flroom-body').textContent,inserts:window._bcFake.inserts})`));
    check('F5-5b macros que suman más de 100 g: se explica en español, y nada se guardó',
      /imposible/i.test(s.txt) && !MOTOR.test(s.txt) && s.inserts === 0,
      JSON.stringify({ inserts: s.inserts, txt: (s.txt || '').match(/suman[^]{0,80}/) }));
    // Y volver a «por porción» NO borra lo que ya tenía tecleado (nombre y marca siguen ahí).
    await ev(`flBase('porcion')`); await sleep(300);
    s = JSON.parse(await ev(`JSON.stringify({name:document.getElementById('bc-name').value,kcal:document.getElementById('bc-kcal').value})`));
    check('F5-5c cambiar de «por 100 g» a «por porción» conserva lo tecleado',
      s.name === 'Prueba' && s.kcal === '450', JSON.stringify(s));

    // F5-6 — el camino bueno: etiqueta POR PORCIÓN de un cereal real (120 kcal / 30 g)
    await ev(`(()=>{const v=(id,x)=>{document.getElementById(id).value=x};
      v('bc-name','Cereal de prueba');v('bc-brand','Marca X');v('bc-porcion','30');
      v('bc-kcal','120');v('bc-p','2.4');v('bc-c','25.5');v('bc-f','1.2');})()`);
    await ev(`flGuardarProducto()`); await sleep(1200);
    s = JSON.parse(await ev(`JSON.stringify((()=>{const f=_flView.sel||{};const fila=window._bcFake.filas[0]||{};
      return {inserts:window._bcFake.inserts, filaKcal:fila.kcal, filaP:fila.p, filaUn:fila.un_g,
        sel:f.name, verificado:f.verified, txt:document.getElementById('flroom-body').textContent,
        enCat:!!(_foodCat||[]).find(x=>x.id==='bc:5901234123457')};})())`));
    check('F5-6 guardar deja el producto listo y marcado «sin revisar»',
      s.inserts === 1 && /Cereal de prueba/.test(s.sel || '') && s.verificado === false && /sin revisar/i.test(s.txt) && s.enCat,
      JSON.stringify({ inserts: s.inserts, sel: s.sel, verificado: s.verificado, enCat: s.enCat }));
    // 🔴 F5-7 — LO QUE DE VERDAD IMPORTA: 120 kcal por porción de 30 g son 400 por 100 g. Si
    // esto entrara sin convertir, la persona registraría un tercio de lo que se comió.
    check('F5-7 lo que se guardó son los macros CONVERTIDOS a 100 g (400 kcal, no 120)',
      s.filaKcal === 400 && s.filaP === 8 && s.filaUn === 30, JSON.stringify({ kcal: s.filaKcal, p: s.filaP, un_g: s.filaUn }));
    // …y sobrevive hasta el plato: media porción (15 g) son 60 kcal, las del empaque partidas.
    s = JSON.parse(await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
      flGuardar('bc:5901234123457',15);
      const e=foodLogDay(c.foodlog).find(x=>/Cereal/.test(x.name))||{};
      return JSON.stringify({kcal:e.kcal,g:e.g,name:e.name});})()`));
    check('F5-7b y llega así al registro del día (15 g del cereal = 60 kcal)',
      s.g === 15 && Math.abs(s.kcal - 60) <= 1, JSON.stringify(s));

    // F5-9 — cabe a 360px y con letra «Muy grande» (barra premium)
    await ev(`(()=>{flNuevoProducto('4006381333931');document.documentElement.setAttribute('data-fs','xl');})()`);
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 2, mobile: true });
    await sleep(700);
    s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('flroom-body');
      const btn=document.getElementById('bc-save'); const r=btn?btn.getBoundingClientRect():null;
      return {desborde:b.scrollWidth-b.clientWidth, docDesborde:document.documentElement.scrollWidth-window.innerWidth,
        btnAlto:r?Math.round(r.height):0, btnDentro:!!r&&r.left>=0&&r.right<=360};})())`));
    check('F5-9 el formulario cabe a 360px con letra «Muy grande», sin desborde horizontal',
      s.desborde <= 1 && s.docDesborde <= 1 && s.btnAlto >= 36 && s.btnDentro, JSON.stringify(s));
    await ev(`document.documentElement.removeAttribute('data-fs')`);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

    // F5-8 — al salir, la cámara queda apagada. (En headless no hay cámara: lo que se afirma es
    // que la SALIDA suelta el stream, montando uno falso a mano.)
    s = JSON.parse(await ev(`(()=>{let parado=0;
      _flScan.stream={getTracks:()=>[{stop:()=>{parado++}}]}; _flScan.on=true;
      closeFoodLogRoom();
      return JSON.stringify({parado, on:_flScan.on, stream:_flScan.stream===null, timer:_flScan.timer===null});})()`));
    check('F5-8 salir de la habitación suelta la cámara de verdad',
      s.parado === 1 && s.on === false && s.stream && s.timer, JSON.stringify(s));
    await ev(`(()=>{if(window._bdReal)window.BarcodeDetector=window._bdReal;window.AVI_ALLOW_CLOUD_WRITE=false;
      const c=DB.clients.find(x=>x.id===CUR.clientId); c.foodlog=foodLogBlank(); localStorage.removeItem('ax_bccache');})()`);
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
