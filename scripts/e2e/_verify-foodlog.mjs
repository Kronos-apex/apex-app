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
  await waitFor(`!!document.querySelector('#cn-habits .hb-strip, #cn-habits .hb-card')`, 8000);
  // El detalle guarda su estado por asesorado y en ESTE aparato: se abre solo si está cerrado.
  await ev(`(()=>{if(typeof habitsOpen==='function'&&!habitsOpen(CUR.clientId))habitsToggle();})()`);
  await sleep(600);
  let s = JSON.parse(await ev(`JSON.stringify((()=>{const el=document.getElementById('cn-habits');
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const hist=(DB.history||{})[CUR.clientId]||[];

    // v507: el registro BAJÓ DE SITIO por decisión del PO (medido: 5 personas, 7 días, nadie
    // desde el 13-ago, contra 8 personas y 71 días del agua). Ya no tiene chip en la tira: vive
    // en el detalle de hábitos, a UN toque. Lo que este check protege sigue siendo lo mismo —que
    // la comida esté junto al agua y los pasos y no en otra pantalla—, así que ahora se abre el
    // detalle primero. Si esto se pone rojo, es que el registro se fue de «Hoy» del todo.
    return {bloque:!!document.querySelector('#cn-habits .hb-ic.fl, #cn-habits .hb-chip.f'), largo:el?el.innerHTML.length:-1,
      libre:typeof isFreeClient==='function'?isFreeClient(c):'nofn', sesiones:hist.length,
      sesiones2:hist.length,
      titulo:[...document.querySelectorAll('#cn-habits .hb-title, #cn-habits .hb-chip')].map(e=>e.textContent.replace(/\s+/g,' ').trim()).join('|')};})())`));
  check('FL1 la comida sale junto al agua y los pasos (chip o bloque)', s.bloque && /kcal|Comida de hoy|anota tu comida/.test(s.titulo), JSON.stringify(s));

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

  // ── F7 · EL PLAN SE MARCA, NO SE RE-ESCRIBE ────────────────────────────────
  // 🔒 CONTROL DE MONTAJE primero: sin plan de comida no hay nada que marcar, y un harness que
  // mide sobre una pantalla vacía sale verde sin haber probado nada (lección de `_guiado-suite`,
  // que llevó muerto desde v447, y de los modales que medían cuatro líneas).
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    c.foodlog=foodLogBlank(); c.foodlogOk=new Date().toISOString();
    c.sex='F'; c.age=32; c.height=163; c.weight=62;
    DB.nutrition=DB.nutrition||{}; DB.nutrition[CUR.clientId]={kcal:2100,prot:150,carbs:210,fat:60};
    navReset('cn-today');cnTab('cn-today',_cnTabEl('cn-today'),true);renderClientToday(c);})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const ph=_nutPlanHoy(c); const plan=ph&&ph.plan;
    return {hayPlan:!!plan, comidas:plan?plan.meals.length:0,
      conItems:plan?plan.meals.filter(m=>m.items&&m.items.length).length:0,
      conAcomp:plan?plan.meals.filter(m=>(m.acompIds||[]).length).length:0};})())`));
  check('F7-0 CONTROL DE MONTAJE: hay un plan de comida real con sus 5 comidas',
    s.hayPlan && s.comidas === 5 && s.conItems === 5 && s.conAcomp > 0, JSON.stringify(s));
  if (!s.hayPlan) throw new Error('sin plan de comida no se puede probar F7: el fixture no montó');

  // F7-1 — el botón está DONDE la persona lee su plan, y la tarjeta se abre sola al tocar «Ver»
  await ev(`(()=>{_mealsOpen=true;renderMealsToday(DB.clients.find(x=>x.id===CUR.clientId));})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const con=document.getElementById('cn-meals');
    const btns=[...con.querySelectorAll('button[onclick^="flTogglePlanMeal"]')];
    const r=btns.length?btns[0].getBoundingClientRect():null;
    return {n:btns.length, txt:btns.map(b=>b.textContent.trim()).join('|'),
      alto:r?Math.round(r.height):0, dentro:!!r&&r.left>=0&&r.right<=390};})())`));
  check('F7-1 cada comida del plan tiene su botón de marcar, táctil y dentro de la pantalla',
    s.n === 5 && /Me lo comí/.test(s.txt) && s.alto >= 36 && s.dentro, JSON.stringify(s));

  // F7-2 — UN TOQUE registra la comida entera. Es el corazón de la feature: lo que antes eran
  // 3-4 búsquedas con sus gramos tecleados.
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const ph=_nutPlanHoy(c); const m=ph.plan.meals[0];
    const antes=foodLogDay(c.foodlog).length;
    document.querySelector('#cn-meals button[onclick="flTogglePlanMeal(0)"]').click();
    const dia=foodLogDay(c.foodlog);
    const esperados=(m.items||[]).length+(m.acompIds||[]).filter(id=>NUT_FOOD_BY_ID[id]).length;
    return {antes, despues:dia.length, esperados,
      todasDesayuno:dia.every(e=>e.meal==='desayuno'),
      delPlan:dia.filter(e=>foodLogIsPlanEntry(e)).length};})())`));
  check('F7-2 un toque registra la comida ENTERA (plato + acompañantes)',
    s.antes === 0 && s.despues === s.esperados && s.despues >= 2 && s.todasDesayuno && s.delPlan === s.despues, JSON.stringify(s));

  // F7-3 — el número que la persona LEE se mueve. Sin esto la marca es un gesto sin efecto.
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const tot=foodLogTotals(foodLogDay(c.foodlog));
    const hab=document.getElementById('cn-habits').textContent||'';
    const meals=document.getElementById('cn-meals').textContent||'';
    // El bloque de hábitos habla en FRANJA desde v478 (antes decía «X de Y kcal»): lo que se
    // afirma es que la cifra registrada aparece Y que el veredicto es uno de los tres de la
    // franja — nunca el texto viejo, que fingía una precisión que el plato no tiene.
    return {kcal:tot.kcal, cifra:hab.includes(String(Math.round(tot.kcal))),
      veredicto:/vas en tu franja|te quedan \\d+|\\d+ por encima/i.test(hab),
      comido:/comido/.test(meals), deshacer:/Deshacer/.test(meals)};})())`));
  check('F7-3 marcar mueve el contador de hábitos (en lenguaje de franja) y la tarjeta dice «comido» + «Deshacer»',
    s.kcal > 0 && s.cifra && s.veredicto && s.comido && s.deshacer, JSON.stringify(s));

  // F7-4 — se puede DESHACER, y no se lleva por delante lo que la persona anotó a mano.
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const cafe=foodLogEntry({id:'x_cafe',name:'Cafe',kcal:2,p:0.1,c:0.3,f:0},200,'desayuno',null,()=>'fl_manual_h');
    c.foodlog=foodLogAdd(c.foodlog,cafe);
    renderMealsToday(c);
    document.querySelector('#cn-meals button[onclick="flTogglePlanMeal(0)"]').click();
    const dia=foodLogDay(c.foodlog);
    return {quedan:dia.length, ids:dia.map(e=>e.id).join(','),
      vuelveElBoton:/Me lo comí/.test(document.getElementById('cn-meals').textContent||'')};})())`));
  check('F7-4 deshacer quita SOLO lo del plan (el café escrito a mano sobrevive)',
    s.quedan === 1 && s.ids === 'fl_manual_h' && s.vuelveElBoton, JSON.stringify(s));

  // F7-5 — la SEGUNDA superficie: la habitación del registro ofrece el plan donde está el hueco.
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.foodlog=foodLogBlank();openFoodLogRoom();})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('flroom-body');
    const btns=[...b.querySelectorAll('button[onclick^="flTogglePlanMeal"]')];
    return {n:btns.length, dice:/Tu plan/.test(b.textContent||''),
      txt:btns.map(x=>x.textContent.trim()).join('|')};})())`));
  check('F7-5 la habitación del registro ofrece «Me comí esto» en cada hueco del plan',
    s.n === 5 && s.dice && /Me comí esto/.test(s.txt), JSON.stringify(s));

  // F7-6 — marcar desde la habitación deja la entrada ROTULADA, para que no aparezcan
  // cuatro alimentos de la nada.
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    document.querySelector('#flroom-body button[onclick="flTogglePlanMeal(2)"]').click();
    const b=document.getElementById('flroom-body').textContent||'';
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const alm=foodLogDay(c.foodlog).filter(e=>e.meal==='almuerzo');
    return {n:alm.length, rotulo:/de tu plan/.test(b),
      yaNoOfrece:!document.querySelector('#flroom-body button[onclick="flTogglePlanMeal(2)"]')};})())`));
  check('F7-6 marcado desde la habitación: entradas rotuladas «de tu plan» y ya no se re-ofrece',
    s.n >= 2 && s.rotulo && s.yaNoOfrece, JSON.stringify(s));

  // F7-7 — con el DÍA ENTERO marcado, la barra NO acusa un hueco falso. Es la propiedad que
  // decide si la feature es honesta: si dijera «te faltan 400 kcal» a quien comió exactamente lo
  // que le mandaron, la app se contradiría a un toque de distancia (familia v435/v444).
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    c.foodlog=foodLogBlank();
    const ph=_nutPlanHoy(c);
    for(let i=0;i<5;i++)c.foodlog=foodLogMarkPlanMeal(c.foodlog,ph.plan,i);
    const pr=foodLogProgress(foodLogTotals(foodLogDay(c.foodlog)),ph.plan.target);
    renderFoodLogRoom(); renderHabitsCard(c);
    return {pct:pr.kcal.pct, prot:pr.p.pct, n:foodLogDay(c.foodlog).length,
      texto:(document.getElementById('flroom-body').textContent||'').slice(0,120)};})())`));
  check('F7-7 con el plan ENTERO marcado la barra cae dentro de la franja declarada (90-114%)',
    s.pct >= 90 && s.pct <= 114 && s.n >= 10, JSON.stringify(s));

  // F7-8 — 360px y letra «Muy grande»: la barra premium del proyecto.
  await ev(`document.documentElement.setAttribute('data-fs','xl')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 2, mobile: true });
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.foodlog=foodLogBlank();renderFoodLogRoom();})()`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('flroom-body');
    const btns=[...b.querySelectorAll('button[onclick^="flTogglePlanMeal"]')];
    const rs=btns.map(x=>x.getBoundingClientRect());
    return {desborde:b.scrollWidth-b.clientWidth, docDesborde:document.documentElement.scrollWidth-window.innerWidth,
      n:btns.length, minAlto:rs.length?Math.round(Math.min(...rs.map(r=>r.height))):0,
      dentro:rs.every(r=>r.left>=-1&&r.right<=361)};})())`));
  check('F7-8 cabe a 360px con letra «Muy grande», táctil y sin desborde horizontal',
    s.n === 5 && s.desborde <= 1 && s.docDesborde <= 1 && s.minAlto >= 36 && s.dentro, JSON.stringify(s));
  await ev(`document.documentElement.removeAttribute('data-fs')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.foodlog=foodLogBlank();delete DB.nutrition[CUR.clientId];})()`);

  // ── LA FRANJA Y LA SEMANA (patrones 2, 3 y 6 del estudio) ──────────────────
  // Se re-monta el plan (el bloque de F7 lo borró al terminar) y se deja el día VACÍO.
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    c.foodlog=foodLogBlank();
    DB.nutrition=DB.nutrition||{}; DB.nutrition[CUR.clientId]={kcal:2100,prot:150,carbs:210,fat:60};
    renderHabitsCard(c); renderFoodLogRoom();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const meta=_foodLogTargetHoy(c.id); const b=foodLogBandFor(meta.kcal,0);
    return {hab:document.getElementById('cn-habits').textContent||'',
      room:document.getElementById('flroom-body').textContent||'', lo:b.lo, hi:b.hi, meta:b.meta};})())`));
  check('FR1 sin nada anotado, las dos pantallas dan la FRANJA del día, no una cifra exacta',
    s.hab.includes(String(s.lo)) && s.hab.includes(String(s.hi)) &&
    s.room.includes(String(s.lo)) && s.room.includes(String(s.hi)) && s.lo < s.meta && s.hi > s.meta,
    JSON.stringify({ lo: s.lo, meta: s.meta, hi: s.hi, hab: s.hab.slice(0, 90) }));

  // FR2 — comerse el plan ENTERO tiene que caer DENTRO y decirlo con un ✓, no «te faltan 200».
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const ph=_nutPlanHoy(c);
    for(let i=0;i<5;i++)c.foodlog=foodLogMarkPlanMeal(c.foodlog,ph.plan,i);
    renderHabitsCard(c); renderFoodLogRoom();
    const tot=foodLogTotals(foodLogDay(c.foodlog));
    const b=foodLogBandFor(ph.plan.target.kcal,tot.kcal);
    return {estado:b.estado, hecho:Math.round(b.hecho), lo:b.lo, hi:b.hi,
      hab:document.getElementById('cn-habits').textContent||'',
      room:document.getElementById('flroom-body').textContent||''};})())`));
  check('FR2 comerse el plan ENTERO cae DENTRO de la franja y la app lo dice con ✓ (no «te faltan»)',
    s.estado === 'dentro' && /✓/.test(s.hab) && /franja/i.test(s.hab) &&
    /✓ Vas en tu franja/.test(s.room) && !/te faltan/i.test(s.hab),
    JSON.stringify({ estado: s.estado, hecho: s.hecho, lo: s.lo, hi: s.hi, hab: s.hab.slice(0, 100) }));

  // FR3 — «te quedan X»: el número es para entrar en la FRANJA, no para clavar la meta.
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    c.foodlog=foodLogBlank();
    const ph=_nutPlanHoy(c); c.foodlog=foodLogMarkPlanMeal(c.foodlog,ph.plan,0);
    renderHabitsCard(c); renderFoodLogRoom();
    const tot=foodLogTotals(foodLogDay(c.foodlog));
    const b=foodLogBandFor(ph.plan.target.kcal,tot.kcal);
    const hastaMeta=Math.round(b.meta-b.hecho);
    return {falta:b.falta, hastaMeta, estado:b.estado,
      room:document.getElementById('flroom-body').textContent||''};})())`));
  check('FR3 «te quedan X» cuenta hasta la FRANJA, no hasta la cifra exacta',
    s.estado === 'bajo' && s.falta < s.hastaMeta && s.room.includes('Te quedan ' + s.falta),
    JSON.stringify({ falta: s.falta, hastaMeta: s.hastaMeta }));

  // FR4 — la fila de los 7 días, con el dato que el asesorado nunca veía.
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const dias=foodLogWeekStates(c.foodlog,_foodLogTargetsSemana(c.id),new Date(),7);
    const b=document.getElementById('flroom-body');
    const celdas=[...b.querySelectorAll('[title]')].filter(e=>/sin registrar|franja|por (debajo|encima)|registrado/.test(e.getAttribute('title')||''));
    return {n:celdas.length, vacios:dias.filter(d=>d.estado==='vacio').length,
      dice:/Tu semana/.test(b.textContent||''), titles:celdas.map(e=>e.getAttribute('title')).join(' | ')};})())`));
  check('FR4 la fila de los 7 días se pinta y los días sin registrar salen como hueco, no como cero',
    s.n === 7 && s.dice && s.vacios === 6 && /sin registrar/.test(s.titles),
    JSON.stringify({ n: s.n, vacios: s.vacios, dice: s.dice }));

  // FR5 — 360px + letra «Muy grande»: la fila de 7 días es lo que más riesgo tiene de desbordar.
  await ev(`document.documentElement.setAttribute('data-fs','xl')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 2, mobile: true });
  await ev(`renderFoodLogRoom()`); await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('flroom-body');
    const celdas=[...b.querySelectorAll('[title]')].filter(e=>/sin registrar|franja|por (debajo|encima)|registrado/.test(e.getAttribute('title')||''));
    const rs=celdas.map(e=>e.getBoundingClientRect());
    return {desborde:b.scrollWidth-b.clientWidth, docDesborde:document.documentElement.scrollWidth-window.innerWidth,
      n:celdas.length, dentro:rs.every(r=>r.left>=-1&&r.right<=361), minAncho:rs.length?Math.round(Math.min(...rs.map(r=>r.width))):0};})())`));
  check('FR5 la fila de 7 días cabe a 360px con letra «Muy grande», sin desborde horizontal',
    s.n === 7 && s.desborde <= 1 && s.docDesborde <= 1 && s.dentro && s.minAncho >= 12, JSON.stringify(s));
  await ev(`document.documentElement.removeAttribute('data-fs')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.foodlog=foodLogBlank();delete DB.nutrition[CUR.clientId];})()`);

  // ── LA LISTA DEL MERCADO (patrón 4 del estudio) ────────────────────────────
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    DB.nutrition=DB.nutrition||{}; DB.nutrition[CUR.clientId]={kcal:2100,prot:150,carbs:210,fat:60};
    c.routines=[{id:'r1',day:'Lunes',name:'Pierna',exercises:[{id:'e1',name:'Sentadilla',muscle:'cuadriceps'}]},
                {id:'r2',day:'Miércoles',name:'Torso',exercises:[{id:'e2',name:'Press',muscle:'pecho'}]}];
    closeFoodLogRoom(); openShopList();})()`);
  await sleep(900);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('nutroom-body');
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const base=nutBaseFor(c,(DB.nutrition||{})[c.id],_nutPesoDe(c));
    const l=nutShoppingList(base,c.routines);
    const txt=b.textContent||'';
    const faltan=[]; l.grupos.forEach(g=>g.items.forEach(i=>{ if(txt.indexOf(i.name)<0)faltan.push(i.name); }));
    return {abierta:document.getElementById('nutrition-room').classList.contains('on'),
      dias:l.dias, items:l.items, grupos:l.grupos.length, faltan,
      titulo:/Tu lista del mercado/.test(txt), boton:!!b.querySelector('button[onclick="shopListShare()"]')};})())`));
  check('LM1 la lista del mercado se pinta con TODOS los alimentos de los 7 días',
    s.abierta && s.dias === 7 && s.items >= 15 && s.grupos >= 4 && s.faltan.length === 0 && s.titulo && s.boton,
    JSON.stringify({ dias: s.dias, items: s.items, grupos: s.grupos, faltan: s.faltan.slice(0, 3) }));

  // 🔴 LM2 — el número que se lee tiene que ser el de la COMPRA: lo que se compra por unidad se
  // cuenta («12 huevos») y lo demás va al peso, porque «13 octavos de aguacate» no es una cantidad.
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('nutroom-body').textContent||'';
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const l=nutShoppingList(nutBaseFor(c,(DB.nutrition||{})[c.id],_nutPesoDe(c)),c.routines);
    const todos=[]; l.grupos.forEach(g=>g.items.forEach(i=>todos.push(i)));
    const porUn=todos.filter(i=>i.porUnidad), porPeso=todos.filter(i=>!i.porUnidad);
    return {nUn:porUn.length, nPeso:porPeso.length,
      pintaUn:porUn.every(i=>b.indexOf(i.text)>=0), pintaPeso:porPeso.every(i=>b.indexOf(i.text)>=0),
      sinOctavos:!/\\d{2,} octavos/.test(b), ejUn:(porUn[0]||{}).text, ejPeso:(porPeso[0]||{}).text};})())`));
  check('LM2 lo que se compra por unidad se cuenta, y lo demás va por peso (nada de «13 octavos»)',
    s.nUn > 0 && s.nPeso > 0 && s.pintaUn && s.pintaPeso && s.sinOctavos, JSON.stringify(s));

  // LM3 — la limitación honesta de esta lista, en UNA frase y sin clasificar alimento por
  // alimento. 🔴 Este check afirmaba lo contrario («ya cocido» pegado a cada alimento) y se
  // cambió a propósito el 13-ago: la marca se deducía del NOMBRE y las 6 carnes —que también
  // son cocido-base— no la llevaban nunca, así que la lista pedía ~28% menos carne sin avisar.
  // Marcar unos e implicar que los otros son peso de compra es peor que no marcar ninguno.
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('nutroom-body').textContent||'';
    return {sinMarca:!/ya cocido/.test(b), aviso:/ya lista para comer/.test(b),
      dosDirecciones:/pesan menos crudos/.test(b)&&/pesan más/.test(b), nombraCarnes:/carnes/.test(b)};})())`));
  check('LM3 la lista avisa en UNA frase, con las dos direcciones y sin marcar alimento por alimento',
    s.sinMarca && s.aviso && s.dosDirecciones && s.nombraCarnes, JSON.stringify(s));

  // LM4 — compartir arma el texto SIN volver a calcular, y no revienta si no hay nada.
  s = JSON.parse(await ev(`JSON.stringify((()=>{let compartido=null;
    const real=navigator.share; navigator.share=async o=>{compartido=o;return true;};
    shopListShare();
    navigator.share=real;
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const l=nutShoppingList(nutBaseFor(c,(DB.nutrition||{})[c.id],_nutPesoDe(c)),c.routines);
    const t=(compartido&&compartido.text)||'';
    const faltan=[]; l.grupos.forEach(g=>g.items.forEach(i=>{ if(t.indexOf(i.name)<0)faltan.push(i.name); }));
    return {hay:!!compartido, largo:t.length, faltan:faltan.length, dice7:/7 días/.test(t)};})())`));
  check('LM4 «Compartir mi lista» manda el texto completo (todos los alimentos, sin recalcular)',
    s.hay && s.faltan === 0 && s.largo > 200 && s.dice7, JSON.stringify(s));

  // LM5 — 360px + letra «Muy grande»: la lista es la pantalla más densa del módulo.
  await ev(`document.documentElement.setAttribute('data-fs','xl')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 2, mobile: true });
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);openNutritionRoom(c.id);})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.getElementById('nutroom-body');
    const btn=b.querySelector('button[onclick="shopListShare()"]');
    const r=btn?btn.getBoundingClientRect():null;
    return {desborde:b.scrollWidth-b.clientWidth, docDesborde:document.documentElement.scrollWidth-window.innerWidth,
      btnAlto:r?Math.round(r.height):0, btnDentro:!!r&&r.left>=-1&&r.right<=361};})())`));
  check('LM5 la lista cabe a 360px con letra «Muy grande», sin desborde horizontal',
    s.desborde <= 1 && s.docDesborde <= 1 && s.btnAlto >= 36 && s.btnDentro, JSON.stringify(s));
  await ev(`document.documentElement.removeAttribute('data-fs')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await ev(`(()=>{closeNutritionRoom();const c=DB.clients.find(x=>x.id===CUR.clientId);delete DB.nutrition[CUR.clientId];})()`);

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
