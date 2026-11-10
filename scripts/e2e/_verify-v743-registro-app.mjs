// _verify-v743-registro-app.mjs — v743: dentro de Threads el formulario conserva el aviso y no ofrece Google (Chrome de control),
// y el canal de la metadata llega al alta en OTRO navegador (sin sesión ni nube). Base: _fable2-camino-nuevo.
//   A. aviso de navegador interno (v738) con agentes de usuario reales + controles
//   B. el canal al salir del navegador interno y al confirmar el correo en OTRO navegador
//   C. qué ve en «Hoy» quien se registra sábado, domingo, festivo o día hábil (reloj fingido)
//   node scripts/e2e/_verify-v743-registro-app.mjs
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/KRONOS/Desktop/AVI/avi-web/package.json');
const WebSocket = require('ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 8793, DBG = 9293, APP = `http://localhost:${PORT}/`;
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${join(tmpdir(), 'avi-v743-' + Date.now())}`, '--no-first-run', 'about:blank']);
let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json(); } catch { await sleep(300); } }
for (let i = 0; i < 40; i++) { try { await fetch(APP); break; } catch { await sleep(250); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl); let id = 1; const pend = new Map();
const send = (m, p = {}, s) => new Promise((res) => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p, ...(s ? { sessionId: s } : {}) })); });
ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error); pend.delete(m.id); } });
await new Promise((r) => ws.on('open', r));

// una pestaña en un contexto NUEVO = otro navegador (almacenamiento aparte)
async function pestana() {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: P } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, P); await send('Runtime.enable', {}, P);
  // 🔒 nada sale a la nube real: ni la fila del embudo ni el perfil de prueba
  await send('Network.enable', {}, P); await send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*supabase.in*'] }, P);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }, P);
  const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, P); if (!r || r.message || r.exceptionDetails) return 'EXC ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r?.exceptionDetails?.text || r); return r.result?.value; };
  const ir = async (q, espera = 2500) => { await send('Page.navigate', { url: APP + q }, P); await sleep(espera); for (let i = 0; i < 40; i++) { if ((await ev("typeof _canalDeLlegada==='function'&&typeof signupFunnelRow==='function'&&typeof initClientView==='function'")) === true) break; await sleep(400); } };
  return { P, ev, ir };
}
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`); };
const nota = (t) => out.push(t);


const THREADS = 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 Barcelona 355.0.0.38.109 Android (34/14; 450dpi; 1080x2125; samsung; SM-A546E; a54x; s5e8835; es_CO; 660282911)';
const THREADS_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21G93 Barcelona 355.0.0.29.90 (iPhone14,5; iOS 17_6_1; es_CO; es; scale=3.00; 1170x2532; 658190018)';
const CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const LEER = `JSON.stringify((function(){const d=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).display:'NO EXISTE'};
  return {aviso:d('#wz-inapp'),googleRegistro:d('.wz-gbtn-main'),googleEntrar:d('.av-g-login'),chrome:d('.wz-inapp-and'),ios:d('.wz-inapp-ios'),correo:!!document.getElementById('su-email'),cajaCorreo:d('#su-mail-box'),plegador:d('#su-mail-toggle')};})())`;
for (const [nombre, ua, espera] of [['Threads Android', THREADS, { aviso: 'block', googleRegistro: 'none', googleEntrar: 'none', chrome: 'block', ios: 'none', cajaCorreo: 'block', plegador: 'none' }],
  ['Threads iPhone', THREADS_IOS, { aviso: 'block', googleRegistro: 'none', googleEntrar: 'none', chrome: 'none', ios: 'block', cajaCorreo: 'block', plegador: 'none' }],
  ['CONTROL Chrome', CHROME, { aviso: 'none', cajaCorreo: 'none' }]]) {
  const t = await pestana(); await send('Emulation.setUserAgentOverride', { userAgent: ua }, t.P);
  await t.ir('?origen=web&canal=threads');
  const r = JSON.parse(await t.ev(LEER));
  const bien = Object.entries(espera).every(([k, v]) => r[k] === v) && r.correo && (nombre.startsWith('CONTROL') ? r.googleRegistro !== 'none' && r.googleEntrar !== 'none' : true);
  ok(`${nombre}: aviso en el formulario y Google ${nombre.startsWith('CONTROL') ? 'visible (control)' : 'escondido'}`, bien, JSON.stringify(r));
}
// El correo se confirma en OTRO navegador: sin ax_canal, el alta lo toma de la metadata de la cuenta.
const n = await pestana(); await n.ir('');
const r = JSON.parse(await n.ev(`(async function(){
  UD.createFromClient=async()=>({}); window._wzFunnel=function(){}; // 🔒 sin escrituras reales
  const antes=_canalDeLlegada();
  const p=_profileFromMeta({email:'x@example.com',user_metadata:{name:'Prueba',goal:'Perder grasa',level:'Principiante',days:3,place:'casa',canal:{c:'threads',at:new Date(Date.now()-3600e3).toISOString()}}});
  let canalPerfil=null, err=null;
  try{ const rec=await _provisionFreeClient({id:'v743-prueba',email:'x@example.com'},p); canalPerfil=rec&&rec.canal; }catch(e){ err=e.message; }
  return JSON.stringify({antes, deLaMeta:p.canal, canalPerfil, err, quedoSuelto:localStorage.getItem('ax_canal')});
})()`));
ok('confirmando en otro navegador, el perfil sale con canal threads y el aparato lo suelta', r.antes === null && r.canalPerfil && r.canalPerfil.c === 'threads' && r.quedoSuelto === null, JSON.stringify(r));
console.log(out.join('\n'));
const malos = out.filter((x) => x.startsWith('❌')).length;
console.log(`\n${out.filter(x => x.startsWith('✅')).length} ✅ · ${malos} ❌`);
ws.close(); chrome.kill(); srv.kill(); process.exit(malos ? 1 : 0);
