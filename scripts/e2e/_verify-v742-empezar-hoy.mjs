// _verify-v742-empezar-hoy.mjs — v742: sin entrenador, el sábado/domingo/festivo la portada ofrece el primer entreno HOY y el
// botón lo ARRANCA en un toque (reloj fingido, cuenta armada con las funciones reales, sin sesión ni nube). Base: _fable2-camino-nuevo.
//   A. aviso de navegador interno (v738) con agentes de usuario reales + controles
//   B. el canal al salir del navegador interno y al confirmar el correo en OTRO navegador
//   C. qué ve en «Hoy» quien se registra sábado, domingo, festivo o día hábil (reloj fingido)
//   node scripts/e2e/_fable2-camino-nuevo.mjs
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/KRONOS/Desktop/AVI/avi-web/package.json');
const WebSocket = require('ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 8792, DBG = 9292, APP = `http://localhost:${PORT}/`;
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${join(tmpdir(), 'avi-v742-' + Date.now())}`, '--no-first-run', 'about:blank']);
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
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }, P);
  const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, P); if (!r || r.message || r.exceptionDetails) return 'EXC ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r?.exceptionDetails?.text || r); return r.result?.value; };
  const ir = async (q, espera = 2500) => { await send('Page.navigate', { url: APP + q }, P); await sleep(espera); for (let i = 0; i < 40; i++) { if ((await ev("typeof _canalDeLlegada==='function'&&typeof signupFunnelRow==='function'&&typeof initClientView==='function'")) === true) break; await sleep(400); } };
  return { P, ev, ir };
}
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`); };
const nota = (t) => out.push(t);


const CASOS = [['sábado 14-nov', '2026-11-14T10:00:00-05:00', 'libre', true], ['lunes 16-nov FESTIVO', '2026-11-16T10:00:00-05:00', 'libre', true],
  ['sábado 14-nov CON COACH (control)', '2026-11-14T10:00:00-05:00', 'coach', false]];
for (const [nombre, iso, tier, debeBoton] of CASOS) {
  const t = await pestana();
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){const R=Date,off=R.parse('${iso}')-R.now();function D(...a){if(!new.target)return new R(R.now()+off).toString();return a.length?new R(...a):new R(R.now()+off);}D.prototype=R.prototype;D.now=()=>R.now()+off;D.parse=R.parse;D.UTC=R.UTC;window.Date=D;})();` }, t.P);
  await t.ir('', 3500);
  const r = JSON.parse(await t.ev(`(async function(){
    const rec={id:'v742-nueva',name:'Prueba Nueva',email:'x@example.com',goal:'Perder grasa',level:'Principiante',days:3,place:'casa',sex:'F',age:30,weight:65,height:160,activityFactor:1.55,notes:'',phone:'',selfReg:${tier === 'libre'},tier:'${tier}',routines:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(typeof proTrialUntilFrom==='function'&&'${tier}'==='libre')rec.proTrialUntil=proTrialUntilFrom(rec.createdAt);
    _applyAuthClientDB(rec,{}); _autoGenerateWeek(rec);
    CUR.loggedAs='client';CUR.clientId=rec.id; showScreen('s-client'); initClientView(rec);
    await new Promise(r=>setTimeout(r,1200));
    const fr=document.getElementById('cn-firstrun'); const b=fr&&fr.querySelector('.fr-cta');
    const out={texto:(fr&&fr.innerText||'').replace(/\\s+/g,' ').slice(0,200),boton:b?b.textContent.trim():null};
    if(b&&/Empezar/.test(b.textContent)){ b.click(); await new Promise(r=>setTimeout(r,1200));
      out.activa=CUR.activeRoutine&&CUR.activeRoutine.id; out.abierta=CUR.todayExpanded; out.eligio=CUR.todayOverride&&CUR.todayOverride.id;
      out.portadaDespues=(document.getElementById('cn-firstrun').innerText||'').trim().slice(0,60); }
    return JSON.stringify(out);
  })()`));
  if (debeBoton) {
    ok(`${nombre}: «Empezar mi primer entreno» y al tocarlo el entreno queda ABIERTO`, /Empezar mi primer entreno/.test(r.boton || '') && r.activa && r.abierta === r.activa && !/entrenador|gimnasio/i.test(r.texto),
      JSON.stringify(r));
  } else {
    ok(`${nombre}: quien entrena con el coach sigue con «Ver mi plan completo»`, /Ver mi plan completo/.test(r.boton || ''), JSON.stringify(r));
  }
}
console.log(out.join('\n'));
const malos = out.filter((x) => x.startsWith('❌')).length;
console.log(`\n${out.filter(x => x.startsWith('✅')).length} ✅ · ${malos} ❌`);
ws.close(); chrome.kill(); srv.kill(); process.exit(malos ? 1 : 0);
