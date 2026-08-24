// ─────────────────────────────────────────────────────────────────────────────
// _verify-gracia.mjs — EL PERÍODO DE GRACIA, VISTO DESDE LA PANTALLA (v528)
//
// QUÉ CAMBIÓ: hasta v527 el plan vencía y la app se apagaba **el mismo día**. La auditoría de
// negocio del 24-ago midió qué hizo eso: **cobra de quien iba a pagar igual** (Claudia y Luz
// entrenaron el 1-ago con el plan vencido y pagaron el día 3) **y expulsa al que dudaba** (Yeison
// y Valery Valbuena llevan 24 días bloqueados, sin volver y sin pagar). Ahora hay 7 días de
// gracia con acceso completo y una banda que lo explica.
//
// 🔴 LO QUE ESTE HARNESS EXISTE PARA CAZAR: la banda es la ÚNICA forma que tiene la persona de
// enterarse de que está en la gracia. Sin banda, la gracia no es un margen: es el mismo muro
// corrido una semana, y encima sin aviso. Un candado de motor (la suite ya afirma `getStatus` y
// `canLogin`) NO ve eso — puede estar todo verde y la pantalla muda.
//
// QUÉ AFIRMA:
//   0. CONTROL — con el plan AL DÍA la banda NO sale. Sin este control, una banda pegada siempre
//      pasaría por «funciona» (es el error de haber borrado la feature, al revés).
//   1. Con el plan vencido hace 3 días, la banda SALE y dice cuántos días quedan.
//   2. La banda sobrevive a los `return` de «Hoy»: sale también en DÍA DE DESCANSO.
//   3. El tope de tarjetas (v505) NO la topa, ni siquiera con la pantalla llena de avisos.
//   4. Pasada la gracia (30 días) el estado vuelve a ser `overdue` — la gracia TIENE FIN.
//
//   node scripts/e2e/_verify-gracia.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';
import { afirmador, salir } from './_afirma.mjs';

const PORT = 8803, DP = 9303, APP = `http://localhost:${PORT}/`;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-gracia-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = afirmador('período de gracia');

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=393,852', APP]);
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
if (!dentro) {
  console.log('EL LOGIN NO ENTRÓ (si no dice nada: python zombi en el puerto — ver scripts/e2e/README.md)');
  A.ok(false, 'el login entró');
  salir(A, { chrome, srv });
}
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await sleep(400);

// Fixture: se le pone al cliente EN MEMORIA un pago con la fecha que toque y se re-renderiza.
// La nube está SELLADA en localhost (`cloudWriteSealed`, v298), así que esto no sale de aquí.
const conVencimiento = async dias => ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c) return 'sin cliente';
  const d=new Date(); d.setDate(d.getDate()+(${dias}));
  c.suspended=false;
  c.payments=[{date:new Date(Date.now()-30*86400000).toISOString().slice(0,10), dueDate:d.toISOString().slice(0,10), amount:100000}];
  renderClientToday(c);
  return MS.getStatus(c);
})()`);

const leerBanda = () => ev(`(()=>{
  const el=document.getElementById('cn-grace'); if(!el) return {falta:true};
  const b=el.querySelector('.gband');
  const r=b?b.getBoundingClientRect():null;
  return { hay: !!b,
           txt: b?(b.innerText||'').replace(/\\s+/g,' ').trim():'',
           visible: !!(b && getComputedStyle(b).display!=='none' && r && r.height>0),
           display: getComputedStyle(el).display };
})()`);

// ── 0 · CONTROL: al día, NADA ──────────────────────────────────────────────────────────────
const stOk = await conVencimiento(20); await sleep(350);
const bOk = await leerBanda();
A.ok(stOk === 'active', `CONTROL: con vencimiento a 20 días el estado es "active" (es "${stOk}")`, stOk);
A.ok(bOk && bOk.hay === false, 'CONTROL: con el plan al día la banda NO sale', bOk);

// ── 1 · En gracia: sale y dice cuánto queda ────────────────────────────────────────────────
const stG = await conVencimiento(-3); await sleep(350);
const bG = await leerBanda();
A.ok(stG === 'grace', `vencido hace 3 días → estado "grace" (es "${stG}")`, stG);
A.ok(!!(bG && bG.hay && bG.visible), 'la banda SALE y se ve', bG);
A.ok(/venci/i.test(bG.txt || ''), 'la banda dice que el plan se venció', bG.txt);
A.ok(/4 días/.test(bG.txt || ''), 'la banda dice cuántos días quedan (7-3 = 4)', bG.txt);
A.ok(/coach/i.test(bG.txt || ''), 'la banda ofrece hablar con el coach', bG.txt);

// ── 2 · Sobrevive a los `return` de «Hoy»: día de DESCANSO ─────────────────────────────────
// Se vacían las rutinas del día para forzar la rama de descanso, que corta con `return` antes
// de pintar el cuerpo. Es la puerta por la que se cayó la portada del día 1 en v508.
const desc = await ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  c._rutBak=c.routines; c.routines=[];
  renderClientToday(c);
  return (document.getElementById('cn-today-body').innerText||'').slice(0,40);
})()`);
await sleep(300);
const bD = await leerBanda();
A.ok(!!(bD && bD.hay && bD.visible), 'la banda sigue saliendo SIN rutinas (pasa los `return` de Hoy)', { bD, cuerpo: desc });
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId); c.routines=c._rutBak||[]; delete c._rutBak; renderClientToday(c);})()`);
await sleep(300);

// ── 3 · El tope de tarjetas (v505) no la topa ──────────────────────────────────────────────
const tope = await ev(`(()=>{
  if(typeof todayCardPlan!=='function') return 'sin todayCardPlan';
  const p=todayCardPlan(['cn-grace','cn-coach-card','cn-missday','cn-news','cn-deload']);
  return { visibles:p.visibles, ocultas:p.ocultas };
})()`);
A.ok(!!(tope && tope.visibles && tope.visibles.indexOf('cn-grace') !== -1),
  'el tope de tarjetas NO esconde la banda ni con la pantalla llena de avisos', tope);

// ── 4 · La gracia TIENE FIN ────────────────────────────────────────────────────────────────
const stO = await conVencimiento(-30); await sleep(350);
const bO = await leerBanda();
A.ok(stO === 'overdue', `vencido hace 30 días → vuelve a "overdue" (es "${stO}")`, stO);
A.ok(bO && bO.hay === false, 'pasada la gracia la banda ya no sale (manda el bloqueo del login)', bO);

salir(A, { chrome, srv });
