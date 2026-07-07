// F5a (retiro del flag ax_ui_guided): con login real, "Hoy" embebe el guiado SIN flag,
// el Perfil ya no tiene el interruptor, y un opt-out viejo ('0' en localStorage) se ignora.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';

const PORT = 8793, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-f5a-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9293', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9293/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('sin page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails?.exception?.description || 'excepción'); });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
// Simula un dispositivo con OPT-OUT viejo: el valor debe IGNORARSE post-F5a.
await ev(`localStorage.setItem('ax_ui_guided','0')`);
await send('Page.navigate', { url: APP });
await sleep(800);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const inApp = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);

const results = [];
const check = (n, c, x='') => results.push((c?'✅':'❌')+' '+n+(x?' — '+x:''));
check('setup: sesión entrada', inApp);
if (inApp) {
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId); if(c&&!(c.routines||[]).length){c.routines=[{id:'rf5',name:'Test F5a',day:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()],restSec:60,exercises:[{id:'e1',name:'Sentadilla',muscle:'piernas',type:'Compuesto',sets:2,reps:10}]}];}
    UD.loadOwn=async()=>null; CUR.todayRenderedDay=null; renderClientToday(c); })()`);
  await sleep(1200);
  const r = await ev(`({
    embedded: !!document.querySelector('#cn-today-body #guided-mode.gm-embedded'),
    cexList: !!document.querySelector('#cn-today-body #cex-list'),
    flagFns: (typeof uiGuided)+'/'+(typeof setUiGuided)+'/'+(typeof renderGuidedViewToggle),
    guidedCard: !!document.getElementById('cn-guided-card')
  })`);
  check('F5a: Hoy embebe el guiado (ignora el opt-out viejo)', r.embedded && !r.cexList, JSON.stringify(r));
  check('F5a: funciones del flag retiradas', r.flagFns==='undefined/undefined/undefined', r.flagFns);
  // Perfil sin interruptor
  await ev(`cnTab('cn-profile', _cnTabEl?_cnTabEl('cn-profile'):null)`);
  await sleep(800);
  const perfil = await ev(`({card: !!document.getElementById('cn-guided-card'), texto: /vista clásica|vista guiada/i.test((document.getElementById('cn-profile')||{}).innerText||'')})`);
  check('F5a: Perfil sin interruptor ni textos de vista clásica', !perfil.card && !perfil.texto, JSON.stringify(perfil));
}
console.log(results.join('\n'));
console.log('jsErrors:', JSON.stringify(jsErrors.slice(0,3)));
const fails = results.filter(r => r.startsWith('❌')).length + (jsErrors.length ? 1 : 0);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
console.log(fails === 0 ? '\n✅ VERIFY F5a OK' : `\n❌ ${fails} FALLARON`);
process.exit(fails === 0 ? 0 : 1);
