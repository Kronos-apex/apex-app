// Verificación de v601 — «LA TARJETA DE HITO, CON GRÁFICA Y CON EL % HONESTO».
//
// El PO: «solo se ven 3 ejercicios de 15 mejoras… si utilizamos una gráfica y lo vendemos mejor
// como en %… pero quiero que la imagen se vea top».
//
// Dibuja el lienzo REAL con los datos REALES de Luz (leídos de producción y volcados a
// `luz-story.json`), mide el resultado y GUARDA EL PNG para mirarlo — que es la única forma de
// juzgar si «se ve top». Y sus controles:
//   G1 el lienzo se genera 1080×1920 y sale el blob
//   G2 se dibujan 8 filas, no 3  ← el pedido, medido por píxeles de barra
//   G3 el titular en % aparece   ← y su CONTROL: sin `medianaPct` no aparece nada en ese sitio
//   G4 nada se sale del lienzo ni pisa el pie
// Corre: node scripts/e2e/_verify-v601.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const PORT = 8802;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v601-' + Date.now();
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
// Los datos REALES de Luz. Si no están, el harness no inventa una historia bonita: para.
let STORY;
try { STORY = JSON.parse(readFileSync(process.env.TEMP + '/luz-story.json', 'utf8')); }
catch { log('ERROR: falta %TEMP%/luz-story.json (lo genera scratchpad/luz-story.py)'); process.exit(1); }

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ, detached: false });
await sleep(1400);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9301', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9301/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const evj = async expr => { const v = await ev(expr); try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return { crudo: v }; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');

const results = [];
const check = (n, c, x = '') => { const l = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(l); log('  ' + l); };

// Dibuja la tarjeta con el `_storyData` que se le pase y devuelve MEDICIONES del lienzo.
const pintar = async (story, nombreArchivo) => {
  const r = await evj(`(async()=>{
    _storyData=${JSON.stringify(story)};
    const orig=HTMLCanvasElement.prototype.toBlob; let blob=false;
    HTMLCanvasElement.prototype.toBlob=function(cb){blob=true;cb(new Blob(['x'],{type:'image/png'}));};
    try{ Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true}); }catch(e){}
    const oc=document.createElement.bind(document);
    document.createElement=t=>{const el=oc(t);if(t==='a'){el.click=()=>{};}return el;};
    let err='';
    try{ shareClientProgress(); }catch(e){ err=String(e&&e.message||e); }
    await new Promise(r2=>setTimeout(r2,300));
    HTMLCanvasElement.prototype.toBlob=orig; document.createElement=oc;
    const cv=window._storyLastCanvas; if(!cv) return JSON.stringify({err:err||'sin lienzo'});
    const g=cv.getContext('2d');
    // Cuenta FILAS DE BARRA: una barra es una franja horizontal de verde de marca que empieza en
    // x=95. Se cuenta por franjas separadas, no por pixeles, o una barra ancha valdria por varias.
    const col=(px,i)=>[px[i],px[i+1],px[i+2]];
    const d=g.getImageData(95,0,1,1920).data;
    let dentro=false; const altos=[];
    for(let y=0;y<1920;y++){
      const [r2,g2,b2]=col(d,y*4);
      // 🔴 El test de verde tiene que cubrir TODO el degradado. El primer intento pedia
      // g>b+40 y el arranque #0A7C5B (10,124,91) NO lo cumple (124 < 131): a x=95 la barra esta
      // en su punto MAS OSCURO, asi que contaba 4 de 8 y parecia un defecto de la tarjeta.
      const verde=(g2>80&&g2>b2+20&&g2>r2+60);
      if(verde&&!dentro){dentro=y;} else if(!verde&&dentro!==false){altos.push([dentro,y-dentro]);dentro=false;}
    }
    // 🔴 La columna x=95 tambien cruza el subrayado de AVI (7 px), el «+133%» del titular y la
    // linea del pie (4 px): contar «cualquier franja verde» daba 12 de 8. Las barras son las
    // unicas de 20 px de alto, y los ALTOS se devuelven para poder ver que la sonda discrimina
    // en vez de creerselo.
    const filas=altos.filter(a2=>a2[1]>=16&&a2[1]<=24).length;
    // ¿hay tinta en la banda del titular? (y 560..700, a la derecha del margen)
    const t=g.getImageData(90,560,900,140).data; let tinta=0;
    for(let i=0;i<t.length;i+=4){ if(t[i]+t[i+1]+t[i+2]>150) tinta++; }
    // ¿algo pisa el pie? la linea del pie esta en y=1760; la banda 1715..1755 debe estar limpia
    const p=g.getImageData(90,1715,900,40).data; let sucio=0;   // el recuento cierra en 1690
    for(let i=0;i<p.length;i+=4){ if(p[i]+p[i+1]+p[i+2]>150) sucio++; }
    return JSON.stringify({blob,err,filas,altos,tinta,sucio,w:cv.width,h:cv.height});
  })()`);
  const dataUrl = await ev(`window._storyLastCanvas?window._storyLastCanvas.toDataURL('image/png'):''`);
  if (dataUrl && dataUrl.startsWith('data:image/png')) {
    writeFileSync(SHOTDIR + '/' + nombreArchivo, Buffer.from(dataUrl.split(',')[1], 'base64'));
    log('  shot → ' + SHOTDIR + '/' + nombreArchivo);
  }
  return r;
};

try {
  await waitFor(`(()=>{const sl=document.getElementById('s-login');return !!(sl&&typeof shareClientProgress==='function')})()`, 60000);
  // No hace falta login: `shareClientProgress` solo dibuja lo que tiene en `_storyData`, y así el
  // harness no toca ninguna cuenta real ni depende del rate limit de la QA.
  check('G0 la funcion del lienzo esta cargada sin necesidad de sesion',
    (await ev(`typeof shareClientProgress==='function'`)) === true);

  // ── La tarjeta de Luz, con sus numeros REALES ──
  const g = await pintar(STORY, 'v601-luz.png');
  check('G1 el lienzo se genera 1080×1920 y sale el blob',
    g.blob === true && g.w === 1080 && g.h === 1920 && !g.err, JSON.stringify(g).slice(0, 150));
  check('G2 se dibujan las 8 filas de la grafica, no 3',
    g.filas === STORY.subidas.length, 'franjas de barra=' + g.filas + ' y subidas=' + STORY.subidas.length);
  check('G3 el titular en % ocupa su banda', (g.tinta || 0) > 3000, 'tinta en la banda=' + g.tinta);
  check('G4 nada pisa el pie de la tarjeta', (g.sucio || 0) === 0, 'pixeles sobre el pie=' + g.sucio);

  // ── CONTROL · la misma tarjeta SIN titular (volumen a la baja) ──
  // Sin este caso, «hay tinta en la banda del titular» lo aprobaria cualquier cosa que se pinte
  // ahi, incluida una banda que no cambia nunca.
  const sinTitular = { ...STORY, medianaPct: null, volRatio: 0.7 };
  const c = await pintar(sinTitular, 'v601-luz-sin-titular.png');
  check('G3-CONTROL sin titular en % esa banda cambia (y la tarjeta sigue saliendo)',
    c.blob === true && (c.tinta || 0) !== (g.tinta || 0), `con=${g.tinta} sin=${c.tinta}`);
  check('G2-CONTROL y la grafica sigue completa sin titular', c.filas === STORY.subidas.length, 'franjas=' + c.filas);

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
