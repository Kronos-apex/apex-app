// _verify-chat-archivo.mjs — v584: bajar de nivel NO le confisca la conversación que ya tuvo.
//
// Caso real: Samuel Cifuentes, 40 mensajes en 5 meses, pasó a 'libre' y su pestaña de mensajes
// le mostraba un candado de upsell en vez de su historial. Medido 2026-09-07: 68 de los 95
// mensajes que existen estaban así, en 5 personas.
//
// Este harness NO mide el código: mide lo que se VE en pantalla (innerText del hilo), que es lo
// único que le pasa a la persona. Escribe solo en memoria del navegador; el sello
// `cloudWriteSealed` impide tocar la nube desde localhost — no se desactiva.
//
//   node scripts/e2e/_verify-chat-archivo.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';

const PORT = 8829, DP = 9349, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-chatarch-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=393,852', APP]);
const cerrar = () => { try { chrome.kill(); } catch {} try { srv.kill(); } catch {} };
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
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
if (!dentro) { console.log('❌ EL LOGIN NO ENTRÓ (ojo con el rate limit: ~2-3 min entre corridas)'); cerrar(); process.exit(1); }
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await waitFor(`!!document.querySelector('.cntab[onclick*="cn-messages"]')`, 20000);
await ev(`(()=>{const b=document.querySelector('.cntab[onclick*="cn-messages"]');if(b)cnTab('cn-messages',b);})()`);
await sleep(600);

// Estado de laboratorio: 3 mensajes con textos IRREPETIBLES (para que encontrarlos en pantalla
// no pueda ser casualidad de otro texto de la app) y el tier que se quiera probar.
const MARCA = 'ZQX-' + Date.now();
const montar = (tier, conMensajes) => ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c) return 'sin cliente';
  c.tier=${JSON.stringify(tier)};
  DB.msgs[CUR.clientId] = ${conMensajes ? `[
    {from:'coach',text:'${MARCA}-COACH-UNO',date:'2026-05-23T14:28:12.599Z'},
    {from:'client',text:'${MARCA}-YO-DOS',date:'2026-05-23T15:00:00.000Z'},
    {from:'coach',text:'${MARCA}-COACH-TRES',date:'2026-07-31T22:56:46.348Z'}
  ]` : '[]'};
  renderClientMsgs(CUR.clientId);
  return 'ok';
})()`);

// Lee SOLO lo visible: innerText del hilo (no innerHTML — un banner apagado sin limpiar
// contaría igual) + display real de la caja de escribir y sus padres.
const leer = () => ev(`(()=>{
  const hilo=document.getElementById('cn-msg-thread');
  const comp=document.getElementById('cn-msg-composer');
  const quick=document.getElementById('cn-msg-quick');
  const vis=e=>{ if(!e) return false; let x=e; while(x){ const s=getComputedStyle(x); if(s.display==='none'||s.visibility==='hidden') return false; x=x.parentElement; } return true; };
  return {
    texto: hilo?(hilo.innerText||'').replace(/\\s+/g,' ').trim():null,
    hiloVisible: vis(hilo),
    composerVisible: vis(comp),
    quickVisible: vis(quick),
    burbujas: hilo?hilo.querySelectorAll('.mb').length:0
  };
})()`);

const R = [];
const chk = (nombre, ok, detalle) => { R.push([nombre, ok, detalle]); console.log(`${ok ? '✅' : '❌'} ${nombre}${detalle ? ' — ' + detalle : ''}`); };

// 1) CON coach: chat normal. Es el control de cobertura — si esto no sale, el harness no está
//    midiendo la pantalla de mensajes y los demás resultados no valen.
await montar('premium', true); await sleep(400);
let v = await leer();
chk('con coach: se ven los 3 mensajes', v.burbujas === 3, `burbujas=${v.burbujas}`);
chk('con coach: la caja de escribir está', v.composerVisible === true, `composer=${v.composerVisible}`);

// 2) SIN coach y CON historial: se lee, no se escribe. Esto es v584.
await montar('libre', true); await sleep(400);
v = await leer();
chk('libre con historial: el hilo SIGUE ahí', v.burbujas === 3, `burbujas=${v.burbujas}`);
chk('libre con historial: se leen los textos', v.texto.includes(MARCA + '-COACH-UNO') && v.texto.includes(MARCA + '-YO-DOS') && v.texto.includes(MARCA + '-COACH-TRES'), '3 textos irrepetibles');
chk('libre con historial: NO puede escribir', v.composerVisible === false && v.quickVisible === false, `composer=${v.composerVisible} quick=${v.quickVisible}`);
chk('libre con historial: le dice por qué', /volver a escribirle|plan con coach/i.test(v.texto), 'el pie explica el candado');

// 3) SIN coach y SIN historial: el candado de siempre. Control de DISCRIMINACIÓN — si el
//    harness diera verde también aquí, no estaría distinguiendo nada.
await montar('libre', false); await sleep(400);
v = await leer();
chk('libre sin historial: candado, no hilo', v.burbujas === 0, `burbujas=${v.burbujas}`);
chk('libre sin historial: NO aparecen textos viejos', !v.texto.includes(MARCA), 'sin fugas del estado anterior');
chk('libre sin historial: sigue ofreciendo el coach', /coach/i.test(v.texto), 'el upsell se mantiene');

// 3b) Un enlace larguísimo pegado (2000 caracteres SIN espacios) no puede empujar la pantalla
//     de lado. Se mide el desbordamiento REAL (scrollWidth vs clientWidth), no el estilo.
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='libre';
  DB.msgs[CUR.clientId]=[{from:'coach',text:'https://ejemplo.com/'+'X'.repeat(2000),date:'2026-05-23T14:28:12.599Z'}];
  renderClientMsgs(CUR.clientId);})()`);
await sleep(400);
const desb = await ev(`(()=>{const h=document.getElementById('cn-msg-thread');const b=document.body;
  return {hilo:h.scrollWidth-h.clientWidth, pagina:b.scrollWidth-(document.documentElement.clientWidth)};})()`);
chk('un enlace de 2000 caracteres NO desborda a lo ancho', desb.hilo <= 1 && desb.pagina <= 1, `hilo=+${desb.hilo}px pagina=+${desb.pagina}px`);

// 4) 'app' (Premium app, sin coach) se comporta igual que 'libre'.
await montar('app', true); await sleep(400);
v = await leer();
chk('plan app con historial: también lo lee', v.burbujas === 3 && v.composerVisible === false, `burbujas=${v.burbujas} composer=${v.composerVisible}`);

const jsErr = await ev(`(window.__aviErrs||[]).length||0`);
const ok = R.every(r => r[1]);
console.log(`\n${ok ? '🟢' : '🔴'} ${R.filter(r => r[1]).length}/${R.length} comprobaciones · jsErrors=${jsErr}`);
cerrar();
process.exit(ok ? 0 : 1);
