// _verify-f4-chat.mjs — F4: la pestaña «Mensajes» del asesorado tiene que OCUPAR la pantalla.
//
// POR QUÉ EXISTE: la auditoría FASE 2 midió la pestaña en 0,4 pantallas — la conversación en una
// cajita de 380px arriba y el campo de escribir flotando a media pantalla. Y no es un caso de
// borde: de los 23 del gimnasio, 11 no han cruzado NUNCA un mensaje y la mediana de los demás son
// 5 (medido contra el backup del 2026-07-27), así que casi todos ven la pantalla flaca.
//
// AFIRMA, en los 3 estados reales (sin mensajes, pocos, muchos):
//   1. El compositor termina PEGADO al borde de abajo del cuerpo (no a media pantalla).
//   2. El panel llena el alto disponible (nada de media pantalla en blanco).
//   3. Con muchos mensajes el hilo scrollea POR DENTRO y aterriza en el último mensaje.
//   4. Sin mensajes se ve el estado que explica para qué sirve la pestaña.
//   5. Cero errores JS y nada que se salga de 390px.
// Sin login ni red. exit 1 si algo falla.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8831, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-f4';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9351', '--user-data-dir=' + process.env.TEMP + '/f4-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9351/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login')&&typeof showScreen==='function'&&typeof renderClientMsgs==='function'`);
await sleep(1500);

const fallos = [];
const ok = (cond, msg, extra) => { console.log(`  ${cond ? '✅' : '❌'} ${msg}${extra !== undefined && !cond ? '  → ' + JSON.stringify(extra) : ''}`); if (!cond) fallos.push(msg); };

const setup = n => `(()=>{try{
 ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none'});
 const c={id:'cF4',name:'Santiago Rivera',email:'s@x.com',goal:'Ganar músculo',level:'Principiante',days:3,routines:[]};
 DB.clients=[c];CUR.clientId='cF4';CUR.loggedAs='client';
 const ms=[];const base=Date.now()-86400000*3;
 for(let i=0;i<${n};i++)ms.push({from:i%2?'client':'coach',text:i%2?'Listo coach, terminé el de piernas 💪':'¿Cómo te fue con la rutina de hoy, Santiago?',date:new Date(base+i*3600000).toISOString()});
 DB.msgs={cF4:ms};
 showScreen('s-client');
 const tabs=document.querySelectorAll('.cntab');cnTab('cn-messages',tabs[2]);
 renderClientMsgs('cF4');
 // La píldora «Instalar app» NO aparece sola en headless (beforeinstallprompt no dispara). Sin
 // forzarla, el hit-testing de abajo no probaría NADA — sería un check verde sobre nada, que es
 // la clase de defecto que ya nos costó 43 versiones de smoke inútil.
 const b=document.getElementById('install-banner'); if(b){b.classList.remove('hide');b.style.display='flex';}
 return 'ok';}catch(e){return 'ERR '+e.message}})()`;

const medir = `(()=>{const p=document.getElementById('cn-messages'),th=document.getElementById('cn-msg-thread'),
 co=document.getElementById('cn-msg-composer'),b=document.querySelector('.cnbody');
 const rp=p.getBoundingClientRect(),rt=th.getBoundingClientRect(),rc=co.getBoundingClientRect(),rb=b.getBoundingClientRect();
 // Hit-testing en el compositor: al bajarlo al pie queda EN LA ZONA de la píldora «Instalar app»
 // (bottom:84px). Si la píldora se le para encima, tocar «Enviar» abre el instalador — que es
 // exactamente el defecto F1 de la FASE 2. La visibilidad CSS no lo detecta: hay que preguntar
 // por el elemento que hay en ese punto.
 const enBtn=co.querySelector('button'), ta=co.querySelector('textarea');
 const quien=el=>{const r=el.getBoundingClientRect();const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return t?(t.closest('#install-banner,#ios-install-banner')?'PILDORA':(co.contains(t)?'compositor':(t.id||t.className||t.tagName))):'nada';};
 return {panel:Math.round(rp.height),body:Math.round(rb.height),hilo:Math.round(rt.height),
  // Distancia del compositor al FONDO DEL PANEL (no del cuerpo): el cuerpo reserva 64px cuando
  // la píldora está visible, y eso no es hueco muerto del chat.
  huecoAbajo:Math.round(rp.bottom-rc.bottom),
  hiloDesborda:th.scrollHeight>th.clientHeight+2,
  alFinal:Math.abs(th.scrollHeight-th.clientHeight-th.scrollTop)<6,
  paginaScrollea:b.scrollHeight>b.clientHeight+2,
  tocaEnviar:quien(enBtn), tocaCampo:quien(ta),
  pildoraVisible:(()=>{const b=document.getElementById('install-banner');if(!b)return false;const r=b.getBoundingClientRect();return getComputedStyle(b).display!=='none'&&r.height>0;})(),
  vacio:!!p.querySelector('.mempty'),
  textoVacio:(p.querySelector('.mempty .etxt')||{}).textContent||'',
  anchoDoc:document.documentElement.scrollWidth};})()`;

for (const [nombre, n] of [['sin-mensajes', 0], ['pocos', 4], ['muchos', 30]]) {
  const r = await ev(setup(n));
  await sleep(700);
  const m = await ev(medir);
  console.log(`\n── ${nombre} (${n} mensajes) — ${JSON.stringify(m)}`);
  ok(r === 'ok', `${nombre}: la pestaña se arma sin lanzar`, r);
  // 1. El compositor, al pie del panel.
  ok(m.huecoAbajo <= 12, `${nombre}: el compositor queda al pie (hueco ${m.huecoAbajo}px ≤ 12)`, m.huecoAbajo);
  // 2. El panel NO se estira más allá de la pantalla: quien scrollea es el hilo, no la página.
  ok(!m.paginaScrollea, `${nombre}: la pestaña no estira la página`, m);
  ok(m.panel >= m.body - 70, `${nombre}: el panel llena el alto disponible (${m.panel} vs cuerpo ${m.body})`, m);
  // 3. Y la píldora «Instalar app» NO se para encima del compositor (defecto F1 de la FASE 2:
  //    el compositor acaba de mudarse justo a la franja donde vive la píldora).
  ok(m.pildoraVisible, `${nombre}: la píldora «Instalar app» está EN PANTALLA (si no, el hit-testing no prueba nada)`, m.pildoraVisible);
  ok(m.tocaEnviar === 'compositor', `${nombre}: «Enviar» recibe el toque (no la píldora)`, m.tocaEnviar);
  ok(m.tocaCampo === 'compositor', `${nombre}: el campo de escribir recibe el toque`, m.tocaCampo);
  // 5. Nada se sale a 390px.
  ok(m.anchoDoc <= 390, `${nombre}: no se sale del ancho del teléfono`, m.anchoDoc);
  if (n === 0) ok(m.vacio && /coach/i.test(m.textoVacio), 'sin-mensajes: explica para qué sirve la pestaña', m.textoVacio);
  if (n === 30) {
    ok(m.hiloDesborda, 'muchos: el hilo scrollea POR DENTRO (no estira la página)');
    ok(m.alFinal, 'muchos: aterriza en el último mensaje');
  }
  const png = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/msg-${nombre}.png`, Buffer.from(png.data, 'base64'));
}

// ══════════ LETRA GRANDE (data-fs="xl") ══════════
// Barra premium: toda superficie nueva se prueba con letra grande. Con el chat a altura fija, el
// riesgo real es que el compositor y las respuestas rápidas se coman el hilo o lo saquen de la
// pantalla.
console.log('\n── letra grande (data-fs=xl)');
await ev(setup(6));
await ev(`(()=>{document.documentElement.setAttribute('data-fs','xl');return 1})()`);
await sleep(700);
{
  const m = await ev(medir);
  console.log('  ', JSON.stringify(m));
  ok(m.huecoAbajo <= 12, 'letra grande: el compositor sigue al pie', m.huecoAbajo);
  ok(m.hilo >= 180, 'letra grande: al hilo le queda sitio para leer (≥180px)', m.hilo);
  ok(!m.paginaScrollea, 'letra grande: la pestaña no estira la página', m);
  ok(m.anchoDoc <= 390, 'letra grande: no se sale del ancho', m.anchoDoc);
  // Con letra grande el compositor sube y entra en la franja de la píldora. Aquí SÍ mordió:
  // la píldora se paraba encima del campo de escribir (mismo defecto F1 de la FASE 2).
  ok(m.tocaEnviar === 'compositor', 'letra grande: «Enviar» recibe el toque (no la píldora)', m.tocaEnviar);
  ok(m.tocaCampo === 'compositor', 'letra grande: el campo de escribir recibe el toque (no la píldora)', m.tocaCampo);
  const png = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/msg-letra-grande.png`, Buffer.from(png.data, 'base64'));
}
await ev(`(()=>{document.documentElement.removeAttribute('data-fs');return 1})()`);

// ══════════ BANDEJA DEL COACH: los que nunca han escrito ══════════
// La otra mitad de F4: la bandeja mostraba solo las conversaciones existentes y dejaba media
// pantalla vacía. Ahora lista a quién le falta el primer mensaje (11 de 23 en producción).
console.log('\n── bandeja del coach');
const rCoach = await ev(`(()=>{try{
 DB.clients=[
  {id:'k1',name:'Andrea Molina'},{id:'k2',name:'Santiago Rivera'},
  {id:'k3',name:'Miguel Pulido'},{id:'k4',name:'Nataly Gómez'},
  {id:'k5',name:'Kathe Beltrán',suspended:true}];
 DB.msgs={k1:[{from:'client',text:'Coach, me dolió la rodilla',date:new Date().toISOString()}]};
 CUR.loggedAs='coach';
 showScreen('s-coach');
 gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes');
 renderMsgs();
 return 'ok';}catch(e){return 'ERR '+e.message}})()`);
await sleep(600);
const mc = await ev(`(()=>{const s=document.getElementById('msgs-sinconv');
 const filas=s?s.querySelectorAll('.cli').length:0;
 const txt=(document.getElementById('msgs-list')||{}).innerText||'';
 return {existe:!!s, filas, mencionaSuspendido:/Kathe/.test(txt), alto:Math.round((document.getElementById('msgs-list')||{scrollHeight:0}).scrollHeight)};})()`);
console.log('  ', JSON.stringify(mc));
ok(rCoach === 'ok', 'bandeja: se arma sin lanzar', rCoach);
ok(mc.existe, 'bandeja: aparece la sección «Sin conversación»');
ok(mc.filas === 3, 'bandeja: lista a los 3 que nunca han escrito (y NO al suspendido)', mc.filas);
ok(!mc.mencionaSuspendido, 'bandeja: el asesorado suspendido no aparece como pendiente');
// Y el toque tiene que ABRIR el chat de esa persona, no ser decoración.
const abre = await ev(`(()=>{const f=document.querySelectorAll('#msgs-sinconv .cli')[0];if(!f)return 'sin fila';
 f.click();const on=document.querySelector('#coach-chat.cchat.on');
 return on?((document.getElementById('cchat-name')||{}).textContent||'sin nombre'):'no abrió';})()`);
ok(/Miguel|Nataly|Santiago/.test(abre), 'bandeja: tocar una fila abre el chat de esa persona', abre);
await ev(`(()=>{if(typeof closeCoachChat==='function')closeCoachChat();return 1})()`);
{
  const png = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/coach-bandeja.png`, Buffer.from(png.data, 'base64'));
}

console.log('\n── jsErrors:', jsErrors.length ? jsErrors : '[]');
if (jsErrors.length) fallos.push('errores JS sueltos');
console.log(fallos.length ? `\n❌ F4 CHAT: ${fallos.length} fallo(s)` : '\n✅ F4 CHAT OK — el chat del asesorado ocupa la pantalla en los 3 estados');
console.log('  capturas en:', OUT);
srv.kill(); chrome.kill();
process.exit(fallos.length ? 1 : 0);
