// Verificación E2E de v319 (estudio, mejora 8 — CIERRA el estudio 8/8): números tabulares.
// Las stats del coach (Anton) y el cierre de entreno (Plus Jakarta) usan fuente proporcional
// → sus dígitos "bailan" al actualizarse. Se les aplicó font-variant-numeric:tabular-nums.
// Aquí: confirmar que la regla ESTÁ aplicada (getComputedStyle) + shot con números variados
// para ver la alineación. Patrón preview-SIN-login. Las transiciones de pestaña ya existían
// (.panel.on/.cnp.on fadeIn) y las respeta el bloque global de reduced-motion.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8789;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v319-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9289', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9289/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
const tnum = v => typeof v === 'string' && v.includes('tabular-nums');

try {
  const ready = await waitFor(`(typeof CUR==='object' && !!document.getElementById('h-ingr') && !!document.querySelector('#s-coach .smv'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (#h-ingr / #s-coach .smv)');

  // T1: el cierre de entreno (.wf-stat-val, Plus Jakarta = tiene tnum) → tabular-nums APLICADO
  //     (la única superficie proporcional donde la propiedad tiene efecto real).
  let s = await ev(`(()=>{const d=document.createElement('div');d.className='wf-stat-val';d.textContent='1234';document.body.appendChild(d);const v=getComputedStyle(d).fontVariantNumeric;d.remove();return v;})()`);
  check('T1 stat de fin de entreno (.wf-stat-val) con tabular-nums', tnum(s), String(s));

  // T2: DOCUMENTA por qué las stats del coach (Anton) NO llevan la regla: 'Anton' no trae la
  //     feature OpenType `tnum`, así que tabular-nums es INERTE ahí (mismo ancho con y sin).
  //     Se mide en vivo con la fuente cargada — si algún día se aplica a Anton, este check
  //     recuerda que sería un no-op engañoso.
  s = JSON.parse(await ev(`(async()=>{try{await document.fonts.load('30px Anton');await document.fonts.ready;}catch(e){}
    const mk=tab=>{const d=document.createElement('div');
      d.style.cssText="font-family:'Anton',sans-serif;font-size:30px;display:inline-block;position:absolute;left:-9999px;"+(tab?"font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1;":"font-variant-numeric:normal;");
      d.textContent='88';document.body.appendChild(d);const w=d.getBoundingClientRect().width;d.remove();return Math.round(w*100)/100;};
    return JSON.stringify({loaded:document.fonts.check('30px Anton'),normal:mk(0),tabular:mk(1)});})()`));
  check('T2 tabular-nums es INERTE en Anton (por eso NO se aplica a las stats del coach)', s.loaded && s.normal > 0 && s.normal === s.tabular, JSON.stringify(s));

  // T3: los timers del guiado (.gm-rest-sec) siguen en JetBrains Mono (tabulares por fuente,
  //     intactos) — ahí vivía el "baile" real y ya estaba resuelto por la fuente.
  s = await ev(`(()=>{const d=document.createElement('div');d.className='gm-rest-sec';document.body.appendChild(d);const f=getComputedStyle(d).fontFamily;d.remove();return f;})()`);
  check('T3 timer del guiado sigue en JetBrains Mono (intacto)', /JetBrains Mono/i.test(String(s)), String(s));

  // T4: la transición de pestaña del asesorado y del coach EXISTE (fadeIn) — no se rompió.
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const mk=sel=>{const e=document.querySelector(sel);return e?getComputedStyle(e).animationName:'?';};
    // forzamos .on para leer la animación declarada
    const cnp=document.querySelector('.cnp'); if(cnp)cnp.classList.add('on');
    const pan=document.querySelector('#s-coach .panel'); if(pan)pan.classList.add('on');
    return {cnp:mk('.cnp.on'), panel:mk('#s-coach .panel.on')};})())`));
  check('T4 transiciones de pestaña presentes (fadeIn) coach+asesorado', /fadeIn/i.test(s.cnp) && /fadeIn/i.test(s.panel), JSON.stringify(s));

  // Shot del home del coach con números VARIADOS (para ver la alineación tabular a ojo).
  await ev(`(()=>{
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('h-ingr','$1.250.000'); set('h-actv','18'); set('h-sess','47'); set('h-venc','6');
    ['avi-loading','s-login'].forEach(i=>{const e=document.getElementById(i);if(e){e.style.display='none';e.classList.remove('on');}});
    document.querySelectorAll('.screen').forEach(x=>{x.style.display='none';x.classList.remove('on');});
    const sc=document.getElementById('s-coach'); if(sc){sc.style.display='';sc.classList.add('on');}
    document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
    const ph=document.getElementById('p-home'); if(ph)ph.classList.add('on');
    document.documentElement.setAttribute('data-theme','light');
  })()`);
  await sleep(400); await shot('v319-tabular-claro');
  await ev(`document.documentElement.setAttribute('data-theme','dark')`);
  await sleep(400); await shot('v319-tabular-oscuro');

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
