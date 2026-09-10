// Verificación E2E de v597 — «EL CIERRE LLEVA SU CARA Y SU NOMBRE».
//
// Los candados de la suite son ESTÁTICOS (leen el fuente): prueban que el cable esté puesto, no
// que la pantalla se vea. Esto mide lo que la persona ve de verdad, con sus controles:
//   P1 con foto  → el retrato REEMPLAZA al trofeo (y el hueco del emoji se cierra)
//   P2 sin foto  → sigue el trofeo, sin `<img>` ni cuadro vacío  ← CONTROL de discriminación
//   P3 foto rota → vuelve el trofeo (el estado no-feliz que nadie mira)
//   C1 el NOMBRE se dibuja en el lienzo, y su CONTROL: sin nombre esa banda queda vacía
//   C2 el RETRATO se dibuja en el lienzo, y su CONTROL: sin foto ahí va el círculo de iniciales
//   T1 🔴 EL QUE IMPORTA: una foto de OTRO ORIGEN (sin cabeceras CORS) no puede llevarse el
//      compartir. Se sirve desde un segundo puerto = otro origen, como un bucket sin CORS.
//      Sale de la lección de v596: el cableado puede estar perfecto y el ARCHIVO ser el problema.
//
// Cuenta QA + sello v298 (`cloudWriteSealed` en localhost) → cero riesgo a producción.
// Corre: node scripts/e2e/_verify-v597.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8797, PORT2 = 8798;          // PORT2 = MISMO contenido, OTRO origen (sin CORS)
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v597-' + Date.now();
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ, detached: false });
const srv2 = spawn('python', ['-m', 'http.server', String(PORT2)], { cwd: RAIZ, detached: false });
await sleep(1400);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9297', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9297/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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

// 🔴 LA FOTO DE PRUEBA SE GENERA Y SE COMPRUEBA, NO SE PEGA A MANO. El primer intento de este
// harness llevaba un PNG 4×4 «rojo» escrito de memoria en base64: era un PNG válido, cargaba, y
// resultó TRANSPARENTE — así que «el retrato no se dibuja» era un fallo de la SONDA. Misma clase
// que v596 (el cableado perfecto y el archivo siendo un cuadrado). Se pinta con canvas y se le
// mide el píxel antes de usarla (check F0). Rojo puro a propósito: ningún color de la marca ni de
// la paleta de avatares lo es, así que un (255,0,0) en el lienzo solo puede venir de esta foto.
const HACER_FOTO = `(()=>{const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');g.fillStyle='#FF0000';g.fillRect(0,0,16,16);return c.toDataURL('image/png')})()`;
const FOTO_ROTA = 'data:image/png;base64,Zm9vYmFyLW5vLWVzLXVuLXBuZw==';
const FOTO_OTRO_ORIGEN = `http://localhost:${PORT2}/icons/icon-192.png`;

// Abre la pantalla de cierre con la foto que se le pase (o ninguna) y devuelve lo que se VE.
const abrirCierre = async (avatar) => {
  await ev(`(()=>{
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    ${avatar === null ? 'delete c.avatar;' : `c.avatar=${JSON.stringify(avatar)};`}
    // La cuenta QA se llama «🧪» y un emoji NO tiene pixeles blancos: con ese nombre la sonda del
    // lienzo media 0 y el «control» tambien daba 0, o sea que aprobaba por empate. El nombre se
    // FUERZA (solo en memoria: cloudWriteSealed sella localhost desde v298).
    c.name='Camilo Prueba';
    const press={...DB.exercises.find(e=>e.id==='e83'),sets:2,reps:12};
    const rt={id:'rV597',name:'Cierre v597',day:'Lunes',exercises:[press]};
    c.routines=[rt];
    _wfShownFor=null;                       // el anti re-pop del día no debe tapar el siguiente caso
    showWorkoutFinish(rt,{done:2,total:2,totalVol:400,newPRs:[]});
  })()`);
  await sleep(900);                         // la foto carga por `onload`: sin espera se mide antes
  return await evj(`JSON.stringify((()=>{
    const el=document.getElementById('wf-crest');
    const img=el?el.querySelector('img.wf-crest-img'):null;
    const cs=el?getComputedStyle(el):null;
    return {
      existe:!!el, trofeo:(el?el.textContent:'').includes('🏆'), img:!!img,
      ancho:img?Math.round(img.getBoundingClientRect().width):0,
      redondo:img?getComputedStyle(img).borderRadius:'',
      fontSize:cs?cs.fontSize:'', visible:el?el.getBoundingClientRect().height>0:false,
      // CONTROL DE MONTAJE: ¿la pantalla de cierre está de verdad abierta y opaca? (v453)
      abierta:(()=>{const w=document.getElementById('workout-finish');return !!w&&w.classList.contains('on')&&parseFloat(getComputedStyle(w).opacity)>0.9})(),
      titulo:(document.getElementById('wf-title')||{}).textContent||''
    };
  })())`);
};

// Dibuja la imagen compartible sin descargar nada y mide PÍXELES del lienzo real.
const medirLienzo = async (conNombre) => {
  return await evj(`(async()=>{
    const orig=HTMLCanvasElement.prototype.toBlob; let blob=false;
    HTMLCanvasElement.prototype.toBlob=function(cb){blob=true;cb(new Blob(['x'],{type:'image/png'}));};
    try{ Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true}); }catch(e){}
    const origCreate=document.createElement.bind(document);
    document.createElement=t=>{const el=origCreate(t);if(t==='a'){el.click=()=>{};}return el;};
    ${conNombre ? '' : "_wfShareData.name='';"}
    let err='';
    try{ wfShare(); }catch(e){ err=String(e&&e.message||e); }
    await new Promise(r=>setTimeout(r,400));
    HTMLCanvasElement.prototype.toBlob=orig; document.createElement=origCreate;
    const cv=window._wfLastCanvas; if(!cv) return JSON.stringify({err:err||'sin lienzo'});
    let px=null, rojoCentro=null, centro=null, teñido='';
    try{
      const g=cv.getContext('2d');
      // banda del NOMBRE: a la derecha del círculo (x 282..980, y 360..440)
      const d=g.getImageData(282,360,698,80).data; let claros=0;
      for(let i=0;i<d.length;i+=4){ if(d[i]>230&&d[i+1]>230&&d[i+2]>230) claros++; }
      px=claros;
      // centro del CÍRCULO del retrato (cx=170, cy=400)
      const c=g.getImageData(170,400,1,1).data;
      centro=[c[0],c[1],c[2]];
      rojoCentro=(c[0]>200&&c[1]<60&&c[2]<60);
    }catch(e){ teñido=String(e&&e.name||e); }  // getImageData lanza si el lienzo quedó TEÑIDO
    return JSON.stringify({blob,err,claros:px,centro,rojoCentro,teñido,
      avatarListo:!!_wfShareAvatar, w:cv.width, h:cv.height});
  })()`);
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

  // ── F0 · CONTROL DEL FIXTURE: la foto de prueba tiene que ser roja y OPACA de verdad ──
  // Sin este control, un fixture transparente hace que «el retrato no se dibuja» parezca un
  // defecto de la app. Un forzado que no forzó es un caso que no puede fallar.
  const FOTO_ROJA = await ev(HACER_FOTO);
  const fixOk = await ev(`(async()=>{const img=new Image();img.src=${JSON.stringify(String(FOTO_ROJA))};
    try{await img.decode();}catch(e){return 'no decodifica';}
    const c=document.createElement('canvas');c.width=c.height=4;const g=c.getContext('2d');
    g.drawImage(img,0,0,4,4);const d=g.getImageData(2,2,1,1).data;
    return (d[0]>200&&d[1]<60&&d[2]<60&&d[3]>250)?'ok':('rgba='+[...d].join(','));})()`);
  check('F0 fixture: la foto de prueba es ROJA y OPACA (control de la sonda)', fixOk === 'ok', String(fixOk));

  // ── P1 · CON FOTO: el retrato reemplaza al trofeo ──
  let p = await abrirCierre(FOTO_ROJA);
  check('P0 montaje: la pantalla de cierre está abierta y opaca', p.abierta === true, JSON.stringify(p).slice(0, 160));
  check('P1 con foto: sale el retrato y el trofeo se va', p.img === true && p.trofeo === false, JSON.stringify(p));
  check('P1b el retrato mide 84px y es redondo', p.ancho >= 80 && p.ancho <= 90 && /50%|42px/.test(p.redondo), `ancho=${p.ancho} radio=${p.redondo}`);
  check('P1c el hueco del emoji que ya no está se cierra (font-size:0)', p.fontSize === '0px', 'fontSize=' + p.fontSize);
  await shot('v597-cierre-con-foto');

  // ── C1/C2 · el lienzo compartible con foto y nombre ──
  let L = await medirLienzo(true);
  check('C0 el lienzo se genera 1080×1920 y sale el blob', L.blob === true && L.w === 1080 && L.h === 1920 && !L.err, JSON.stringify(L).slice(0, 180));
  check('C1 el NOMBRE se dibuja en el lienzo', (L.claros || 0) > 400, 'píxeles claros en la banda del nombre=' + L.claros);
  check('C2 el RETRATO se dibuja dentro del círculo', L.rojoCentro === true, 'centro=' + JSON.stringify(L.centro));
  check('C2b la foto pasó la sonda de teñido (data: URL)', L.avatarListo === true, 'avatarListo=' + L.avatarListo);
  const dataUrl = await ev(`window._wfLastCanvas?window._wfLastCanvas.toDataURL('image/png'):''`);
  if (dataUrl && dataUrl.startsWith('data:image/png')) { writeFileSync(SHOTDIR + '/v597-share-img.png', Buffer.from(dataUrl.split(',')[1], 'base64')); log('  shot → ' + SHOTDIR + '/v597-share-img.png'); }

  // ── CONTROL C1 · SIN nombre esa misma banda tiene que quedar VACÍA ──
  // Sin este control, «hay píxeles claros» lo aprobaría cualquier cosa blanca del lienzo.
  const Lsin = await medirLienzo(false);
  check('C1-CONTROL sin nombre la banda queda vacía (la sonda discrimina)', (Lsin.claros || 0) < 40, 'claros sin nombre=' + Lsin.claros);

  // ── P2 · SIN FOTO: sigue el trofeo (control de discriminación de P1) ──
  p = await abrirCierre(null);
  check('P2 sin foto: queda el trofeo y NO hay <img>', p.trofeo === true && p.img === false, JSON.stringify(p));
  // ── CONTROL C2 · sin foto el círculo del lienzo va con iniciales, no rojo ni vacío ──
  L = await medirLienzo(true);
  check('C2-CONTROL sin foto el círculo lleva iniciales (no la foto, no un hueco)',
    L.rojoCentro === false && !!L.centro && (L.centro[0] + L.centro[1] + L.centro[2]) > 40 && L.avatarListo === false,
    'centro=' + JSON.stringify(L.centro) + ' avatarListo=' + L.avatarListo);
  check('C2-CONTROL el compartir sigue saliendo sin foto', L.blob === true && !L.err, JSON.stringify(L).slice(0, 140));

  // ── P3 · FOTO ROTA: vuelve el trofeo, jamás un cuadro roto ──
  p = await abrirCierre(FOTO_ROTA);
  check('P3 foto rota: vuelve el trofeo (sin cuadro roto encima de la celebración)', p.trofeo === true && p.img === false, JSON.stringify(p));

  // ── X1 · EL PEOR CASO DE ALTO: el retrato no puede echar el botón fuera del alcance ──
  // F13 midió que apilar un bloque más en este cierre empujaba el titular fuera de la pantalla, y
  // el retrato es un bloque nuevo en esa misma columna. Se mide con la columna LLENA (3 récords),
  // no con el caso corto.
  // ⚠️ Y de paso, medido aquí: el ajuste de tamaño de letra NO LLEGA a esta pantalla. El `zoom`
  // de `data-fs` solo cubre `.cnp`, `.md`, `#s-coach .panel`, `.gm-body` y `.sroom-body`;
  // `#workout-finish` no está en ninguna lista, así que forzar xl aquí sería un caso que no puede
  // fallar. Va al radar como hallazgo aparte (y el sitio correcto sería `.wf-inner`, el scroller
  // interno — nunca `#workout-finish`, que es `position:fixed;inset:0`: ese es el error de v453).
  const altoDe = async (avatar) => {
    await ev(`(()=>{
      const c=DB.clients.find(x=>x.id===CUR.clientId);
      ${avatar === null ? 'delete c.avatar;' : `c.avatar=${JSON.stringify(String(avatar))};`}
      c.name='Camilo Prueba';
      const press={...DB.exercises.find(e=>e.id==='e83'),sets:2,reps:12};
      const rt={id:'rV597x',name:'Cierre v597 con la columna llena',day:'Lunes',exercises:[press]};
      c.routines=[rt]; _wfShownFor=null;
      showWorkoutFinish(rt,{done:2,total:2,totalVol:400,newPRs:[
        {name:'Press de Banca con Barra',val:80,unit:'kg',reps:8},
        {name:'Sentadilla con Barra',val:120,unit:'kg',reps:5},
        {name:'Peso Muerto Rumano',val:100,unit:'kg',reps:6}]});
    })()`);
    await sleep(900);
    return await evj(`JSON.stringify((()=>{
      const inner=document.querySelector('#workout-finish .wf-inner');
      const btns=[...document.querySelectorAll('#workout-finish .wf-btn')];
      const cont=btns[btns.length-1];
      const img=document.querySelector('#wf-crest img.wf-crest-img');
      return {
        retrato:img?Math.round(img.getBoundingClientRect().width):0,
        // «Alcanzable» = dentro de lo que el scroller PUEDE recorrer (overflow-y:auto), no dentro
        // del viewport: lo que sobra se alcanza scrolleando. Inalcanzable es lo que desborda de un
        // flex centrado SIN scroll (la distinción de v453).
        alcanzable:!!(inner&&cont&&cont.offsetTop+cont.offsetHeight<=inner.scrollHeight+2),
        scroll:inner?inner.scrollHeight:0, alto:inner?inner.clientHeight:0,
        prs:document.querySelectorAll('#wf-prs .wf-pr').length
      };
    })())`);
  };
  const xlCon = await altoDe(FOTO_ROJA);
  const xlSin = await altoDe(null);
  check('X1 columna LLENA con retrato: «Continuar» sigue alcanzable', xlCon.alcanzable === true && xlCon.prs === 3, JSON.stringify(xlCon));
  // CONTROL: la sonda tiene que NOTAR el retrato. Si «con» y «sin» miden igual, no está midiendo
  // el retrato y el OK de arriba no vale nada.
  check('X1-CONTROL la sonda nota el retrato (alarga la columna respecto a sin foto)',
    xlCon.scroll > xlSin.scroll, `con=${xlCon.scroll} sin=${xlSin.scroll}`);
  await shot('v597-cierre-columna-llena');

  // ── T1 · 🔴 EL QUE IMPORTA: foto de OTRO ORIGEN sin CORS ──
  p = await abrirCierre(FOTO_OTRO_ORIGEN);
  check('T1a la foto de otro origen SÍ se ve en la pantalla (el <img> no necesita CORS)', p.img === true && p.trofeo === false, JSON.stringify(p));
  L = await medirLienzo(true);
  check('T1b 🔴 EL COMPARTIR SOBREVIVE a una foto sin CORS (blob generado, lienzo sin teñir)',
    L.blob === true && !L.teñido && !L.err, JSON.stringify(L).slice(0, 200));
  check('T1c y esa foto NO entró al lienzo: el círculo cae a iniciales',
    L.avatarListo === false && L.rojoCentro === false, 'avatarListo=' + L.avatarListo + ' centro=' + JSON.stringify(L.centro));
  check('T1d el nombre se sigue dibujando aunque la foto se caiga', (L.claros || 0) > 400, 'claros=' + L.claros);
  await shot('v597-cierre-otro-origen');

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
  try { srv2.kill(); } catch {}
}
