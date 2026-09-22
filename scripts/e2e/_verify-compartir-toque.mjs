// Verificación E2E de v654: COMPARTIR RESPONDE AL PRIMER TOQUE (reporte del PO, 21-sep).
// Antes: sin aviso, y un segundo toque chocaba con el primero y caía a «guardar».
// Corre: node scripts/e2e/_verify-compartir-toque.mjs
//
// Se sustituye SOLO `navigator.share` (espía con menú lento de 1,5 s, como un Android con archivo
// pesado) y se cuentan los menús abiertos, el aviso, el formato y el respaldo. Molde: _verify-fotos-privadas.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8855;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-medshare-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9375', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9375/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-compartir';
try { mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof wfShare==='function' && typeof showWorkoutFinish==='function'", 40000);
if (!booted) { log('no arrancó'); process.exit(1); }
await ev(`(()=>{ const U='33333333-4444-4555-8666-777777777777';
  DB.clients=[{id:U,name:'Mide Compartir',sex:'F',tier:'premium',routines:[]}]; CUR.clientId=U; CUR.loggedAs='client';
  DB.history={[U]:[]}; showScreen('s-client');
  const press={...(DB.exercises||[]).find(e=>e.id==='e83')||{name:'Press',id:'e83'},sets:2,reps:12};
  const rt={id:'rM',name:'Mide',day:'Lunes',exercises:[press]}; DB.clients[0].routines=[rt]; _wfShownFor=null;
  showWorkoutFinish(rt,{done:2,total:2,totalVol:400,newPRs:[]}); })()`);
await sleep(2500);
// Menú de compartir LENTO (1,5 s), como en un Android con un archivo pesado: ahí es donde se toca otra vez.
const r1 = await ev(`(async()=>{ window.__shares=[]; window.__toasts=[]; const tO=window.toast; window.toast=m=>{window.__toasts.push(m); return tO&&tO(m);};
  Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});
  Object.defineProperty(navigator,'share',{value:(d)=>{ window.__shares.push({n:d.files[0].name,t:d.files[0].type,kb:Math.round(d.files[0].size/1024)}); return new Promise(r=>setTimeout(r,1500)); },configurable:true});
  wfShare(); const t0=window.__toasts.slice(); wfShare(); wfShare();
  await new Promise(r=>setTimeout(r,2500));
  const primeraTanda=window.__shares.length; wfShare(); await new Promise(r=>setTimeout(r,2500));
  window.toast=tO; return {avisoInmediato:t0, shares:window.__shares, primeraTanda}; })()`);
check('K1 tres toques seguidos abren el menú UNA sola vez', r1.primeraTanda === 1, JSON.stringify(r1.shares));
check('K2 el aviso sale en el mismo toque', (r1.avisoInmediato || []).includes('Preparando tu imagen…'), JSON.stringify(r1.avisoInmediato));
check('K3 la imagen va en PNG (sin pérdida, decisión del PO)', r1.shares[0] && r1.shares[0].t === 'image/png' && /\.png$/.test(r1.shares[0].n), JSON.stringify(r1.shares[0]));
check('K4 terminado el primero, un toque nuevo vuelve a funcionar', r1.shares.length === 2, 'shares=' + r1.shares.length);
const r2 = await ev(`(async()=>{ window.__toasts=[]; const tO=window.toast; window.toast=m=>{window.__toasts.push(m); return tO&&tO(m);};
  let descargas=0; const oc=document.createElement.bind(document); document.createElement=t=>{const el=oc(t); if(t==='a')el.click=()=>{descargas++;}; return el;};
  Object.defineProperty(navigator,'share',{value:()=>Promise.reject(Object.assign(new Error('x'),{name:'NotAllowedError'})),configurable:true});
  wfShare(); await new Promise(r=>setTimeout(r,1500)); document.createElement=oc; window.toast=tO;
  return {toasts:window.__toasts, descargas}; })()`);
check('K5 si Android pierde el permiso: pide tocar otra vez, NO guarda en silencio', r2.descargas === 0 && r2.toasts.includes('Toca «Compartir» otra vez'), JSON.stringify(r2));
log('\njsErrors: ' + JSON.stringify(jsErrors));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
log(fallas || jsErrors.length ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallas || jsErrors.length ? 1 : 0);
