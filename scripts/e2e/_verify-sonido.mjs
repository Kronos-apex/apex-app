// ─────────────────────────────────────────────────────────────────────────────
// _verify-sonido.mjs — «SONIDO DEL ENTRENO» (v703): CADA MODO HACE LO QUE DICE, Y CADA TONO SUENA ENTERO
//
// Nace del pedido de los asesorados (9-oct-2026, por el PO): «cambiar el tono de la app o ponerla en
// silencio o vibrador». Hasta v702 los avisos del descanso eran siempre los mismos tres pitidos
// cuadrados + vibración, sin ningún ajuste.
//
// QUÉ AFIRMA, sobre la CONSECUENCIA (lo que de verdad se toca en el parlante y el motor), no el CSS:
//   · sin tocar nada suena «Clásico» con las MISMAS notas de siempre (3 osciladores y el patrón de
//     vibración de siempre);
//   · cada uno de los 11 tonos crea exactamente los osciladores y ruidos que dicen sus notas, en la
//     cuenta y en el aviso final (ninguno se queda a medias ni revienta);
//   · «Solo vibración» no crea NI UN oscilador y sí vibra; «Silencio» no hace ninguna de las dos;
//   · tocar un tono en el Perfil lo elige y lo hace sonar;
//   · el botón del descanso silencia, dice «En silencio», y al volver a tocarlo devuelve el modo que
//     había (vibración vuelve a vibración);
//   · el ajuste sobrevive a recargar, y lo guardado roto cae a sonido (nunca a silencio);
//   · la tarjeta y los botones del descanso caben en 360 px con letra normal y «Muy grande».
//   · CONTROL: los espías cuentan (un oscilador y una vibración creados a mano SÍ suman).
//
//   node scripts/e2e/_verify-sonido.mjs          (SHOTS_DIR=… para guardar capturas)
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('sonido del entreno');
const PORT = 8818, DP = 9318, APP = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/sonido-' + Date.now(), '--no-first-run',
   '--autoplay-policy=no-user-gesture-required', '--window-size=360,1600', APP]);
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 1600, deviceScaleFactor: 2, mobile: true });

// Espías ANTES de que cargue la app (y en cada recarga): cuentan lo que de verdad se le pide al
// parlante y al motor de vibración.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__osc=0; window.__buf=0; window.__vib=[];
  const B=(window.BaseAudioContext||window.AudioContext).prototype;
  const o=B.createOscillator; B.createOscillator=function(){ window.__osc++; return o.apply(this,arguments); };
  const s=B.createBufferSource; B.createBufferSource=function(){ window.__buf++; return s.apply(this,arguments); };
  Object.defineProperty(Navigator.prototype,'vibrate',{configurable:true,value:function(p){ window.__vib.push(p); return true; }});
  window.__toDest=0; const cn=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(d){ if(d instanceof AudioDestinationNode) window.__toDest++; return cn.apply(this,arguments); };
` });
await sleep(700);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}localStorage.clear();})()`);

const CID = 'snd1';
const MONTAR = `(()=>{try{
  const client={id:'${CID}',name:'Asesorada de prueba',level:'Principiante',selfReg:true,tier:'libre',goal:'Recomposición',days:4,routines:[]};
  DB.clients=[client]; DB.history={'${CID}':[]}; DB.prs={}; DB.bodyweight={}; DB.medidas={}; DB.nutrition={}; DB.photos={}; DB.msgs={'${CID}':[]};
  CUR.clientId='${CID}'; CUR.loggedAs='client';
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  showScreen('s-client'); cnTab('cn-profile',null);
  return 'ok';
}catch(e){return 'ERR '+(e&&e.message)}})()`;
const arrancar = async () => {
  await send('Page.navigate', { url: APP }); await sleep(900);
  const listo = await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof renderMedidasClient==='function' && typeof cnTab==='function'`, 45000);
  A.ok(listo, 'la app terminó de arrancar');
  // Lo pinta initSoundSettings EN EL ARRANQUE (app-2). Si esa llamada se cae, la tarjeta sale vacía.
  const boot = await ev(`({modos:document.querySelectorAll('#cn-sound .snd-mode').length, icono:!!document.querySelector('#gm-rest-snd svg')})`);
  A.ok(boot.modos === 3 && boot.icono, 'el ARRANQUE pinta la tarjeta y el ícono del botón del descanso (sin ayuda del montaje)', boot);
  const m = await ev(MONTAR);
  A.ok(m === 'ok', 'el montaje abre el Perfil de una asesorada', m);
  await sleep(500);
};
await arrancar();

// CONTROL de los espías: si esto no suma, ningún «0 osciladores» de abajo vale nada.
const ctl = await ev(`(()=>{ window.__osc=0; window.__vib=[]; const c=getAudioCtx(); c.createOscillator(); navigator.vibrate(5); return [window.__osc, window.__vib.length]; })()`);
A.ok(ctl && ctl[0] === 1 && ctl[1] === 1, 'CONTROL: un oscilador y una vibración hechos a mano SÍ los cuentan los espías', ctl);
// QA Lucas H5: solo se creó el audio (ningún sonido todavía) y el compresor ya existe.
A.ok(await ev(`_sndComp!==null && _sndCompAt!==null`), 'el compresor de los tonos nace con el audio de la app, antes del primer sonido');

// Ejecuta una función de la app y devuelve lo que pidió al parlante y al motor.
const medir = fn => ev(`(()=>{ window.__osc=0; window.__buf=0; window.__vib=[]; window.__toDest=0; ${fn}; return {osc:window.__osc, buf:window.__buf, vib:window.__vib, toDest:window.__toDest}; })()`);

// ── 1. La tarjeta del Perfil ──
const TARJETA = `(()=>{ const box=document.getElementById('cn-sound'); if(!box) return null;
  const r=box.getBoundingClientRect();
  const modos=[...box.querySelectorAll('.snd-mode')].map(b=>({t:b.textContent.trim(), on:b.classList.contains('on'), ap:b.getAttribute('aria-pressed'), h:Math.round(b.getBoundingClientRect().height)}));
  const tonos=[...box.querySelectorAll('.snd-tone')].map(b=>({t:b.querySelector('b').textContent.trim(), on:b.classList.contains('on'), ap:b.getAttribute('aria-pressed'), h:Math.round(b.getBoundingClientRect().height), fuera:b.getBoundingClientRect().right>innerWidth+0.5}));
  return {visible:r.width>0&&r.height>0, modos, tonos, anchoDoc:document.documentElement.scrollWidth,
    recortes:[...box.querySelectorAll('.snd-mode,.snd-tone b,.snd-tone span')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent.trim())};
})()`;
for (const fs of ['', 'xl']) {
  const tag = fs || 'normal';
  if (fs) { await ev(`setTextSize('${fs}')`); await sleep(600); }
  const t = await ev(TARJETA);
  A.ok(t && t.visible, `[${tag}] la tarjeta «Sonido del entreno» se ve en el Perfil`);
  if (!t) continue;
  A.ok(t.modos.length === 3 && t.tonos.length === 11, `[${tag}] 3 modos y 11 tonos`, [t.modos.length, t.tonos.length]);
  A.ok(t.anchoDoc <= 360, `[${tag}] nada se sale de los 360 px (mide ${t.anchoDoc})`, t.anchoDoc);
  A.ok(!t.tonos.some(x => x.fuera) && t.recortes.length === 0, `[${tag}] ningún nombre de modo o tono sale cortado`, t.recortes);
  A.ok(t.modos.every(x => x.h >= 40) && t.tonos.every(x => x.h >= 44), `[${tag}] todo se puede tocar con el dedo (modos ≥40 px, tonos ≥44 px)`,
    [t.modos.map(x => x.h), t.tonos.map(x => x.h)]);
  if (!fs) {
    A.ok(t.modos.find(x => x.on)?.t === 'Sonido y vibración' && t.tonos.find(x => x.on)?.t === 'Clásico',
      'sin tocar nada: «Sonido y vibración» + «Clásico» marcados', [t.modos.find(x => x.on), t.tonos.find(x => x.on)]);
    A.ok(t.modos.filter(x => x.ap === 'true').length === 1 && t.tonos.filter(x => x.ap === 'true').length === 1,
      'un lector de pantalla oye cuál está elegido (aria-pressed en uno solo de cada grupo)');
  }
  if (SHOTS) {
    // El scroller es .cnbody, no la ventana: se lleva la tarjeta a la vista y se recorta en pantalla.
    const r = await ev(`(async()=>{const c=document.getElementById('cn-sound').closest('.card'); c.scrollIntoView({block:'start'}); await new Promise(z=>setTimeout(z,250)); const b=c.getBoundingClientRect(); return {y:Math.max(0,b.top),h:Math.min(b.height,innerHeight-Math.max(0,b.top))};})()`);
    const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: r.y, width: 360, height: r.h, scale: 1 } });
    writeFileSync(`${SHOTS}/sonido-tarjeta-${tag}.png`, Buffer.from(s.data, 'base64'));
  }
}
await ev(`setTextSize('normal')`); await sleep(400);

// ── 2. Sin tocar nada: «Clásico», idéntico a v702 ──
const fin0 = await medir('playRestEndBeep()');
A.ok(fin0.osc === 3 && fin0.buf === 0, 'aviso final por defecto: los 3 pitidos de siempre', fin0);
A.ok(fin0.toDest === 3, '«Clásico» va DIRECTO al parlante, como antes (sin compresor)', fin0);
A.ok(JSON.stringify(fin0.vib) === JSON.stringify([[200, 80, 200, 80, 500]]), 'y la vibración de siempre', fin0.vib);
const tic0 = await medir('playRestTick()');
A.ok(tic0.osc === 1 && JSON.stringify(tic0.vib) === '[60]', 'cuenta regresiva por defecto: 1 pitido + vibración corta', tic0);

// ── 3. Cada tono, entero ──
const esperado = (idT, fase) => ev(`(()=>{ const ns=soundToneNotes('${idT}','${fase}');
  return {osc: ns.filter(n=>!n.ruido).length + ns.filter(n=>n.trino).length, buf: ns.filter(n=>n.ruido).length}; })()`);
const ids = await ev('SOUND_TONE_IDS');
A.ok(Array.isArray(ids) && ids.length === 11, 'la app trae los 11 tonos', ids);
const malos = [];
for (const t of ids || []) {
  await ev(`setSoundPref({mode:'sonido',tone:'${t}'})`);
  for (const [fase, fn] of [['fin', 'playRestEndBeep()'], ['cuenta', 'playRestTick()']]) {
    const e = await esperado(t, fase), m = await medir(fn);
    // Solo «Clásico» conecta notas directo al parlante; los demás pasan TODOS por el compresor.
    const directo = t === 'clasico' ? e.osc : 0;
    if (m.osc !== e.osc || m.buf !== e.buf || m.osc + m.buf === 0 || m.vib.length !== 1 || m.toDest !== directo) malos.push({ t, fase, esperado: e, sonó: m });
  }
}
A.ok(malos.length === 0, 'los 11 tonos suenan con TODAS sus notas, en la cuenta y en el aviso, y además vibran', malos);

// ── 4. Los modos, con toques de verdad en la tarjeta ──
const tocarModo = nombre => ev(`(()=>{ const b=[...document.querySelectorAll('#cn-sound .snd-mode')].find(x=>x.textContent.trim()===${JSON.stringify(nombre)}); if(!b) return false; b.click(); return true; })()`);
const tocarTono = nombre => ev(`(()=>{ window.__osc=0; const b=[...document.querySelectorAll('#cn-sound .snd-tone')].find(x=>x.querySelector('b').textContent.trim()===${JSON.stringify(nombre)}); if(!b) return -1; b.click(); return window.__osc; })()`);
const pref = () => ev(`JSON.parse(localStorage.getItem('ax_sound')||'null')`);

A.ok(await tocarModo('Solo vibración'), 'se puede tocar «Solo vibración»');
const vib = await medir('playRestEndBeep(); playRestTick()');
A.ok(vib.osc === 0 && vib.buf === 0, '«Solo vibración»: NI UN sonido', vib);
A.ok(vib.vib.length === 2, '«Solo vibración»: sí vibra (aviso y cuenta)', vib.vib);
A.ok((await ev(`document.querySelector('#cn-sound .snd-mode.on')?.textContent.trim()`)) === 'Solo vibración', 'y la tarjeta lo marca');

const oscPrueba = await tocarTono('Gong');
const p1 = await pref();
A.ok(p1 && p1.tone === 'gong' && p1.mode === 'vibracion', 'tocar «Gong» lo elige sin cambiar el modo', p1);
A.ok(oscPrueba > 0, 'y lo hace sonar para que lo oiga', oscPrueba);

A.ok(await tocarModo('Silencio'), 'se puede tocar «Silencio»');
const sil = await medir('playRestEndBeep(); playRestTick(); alertVibrate([300,120,300])');
A.ok(sil.osc === 0 && sil.buf === 0 && sil.vib.length === 0, '«Silencio»: ni suena ni vibra (tampoco el aviso del cardio)', sil);
const pSil = await pref();
A.ok(pSil && pSil.prev === 'vibracion', 'elegir «Silencio» en el Perfil recuerda que venía de vibración (QA Lucas H2)', pSil);
// QA Lucas H5: el compresor nace con el audio de la app, no con el primer sonido (recién creado, se come el primero).
A.ok(await ev(`typeof _sndComp!=='undefined' && _sndComp!==null && _sndCompAt!==null`), 'el compresor de los tonos ya existe antes del primer aviso');

// ── 5. El botón del descanso ──
await tocarModo('Solo vibración');
const BOTON = `(()=>{ const b=document.getElementById('gm-rest-snd'); return {txt:b.textContent.trim(), ap:b.getAttribute('aria-pressed'), aria:b.getAttribute('aria-label')}; })()`;
// El descanso vive dentro de #guided-mode, y en el entreno real ese nodo se MUDA a «Hoy» (#cn-today-body,
// dentro de .cnp), que es lo que el tamaño de letra agranda. Se monta igual que openGuidedEmbedded: si se
// mide fuera de ahí, «Muy grande» mide la talla normal.
await ev(`(()=>{ cnTab('cn-today',null); const g=document.getElementById('guided-mode'); g.classList.add('gm-embedded'); g.classList.remove('hidden'); document.getElementById('cn-today-body').appendChild(g); document.getElementById('gm-rest-overlay').classList.remove('hidden'); })()`);
await sleep(300);
const ovH = await ev(`Math.round(document.getElementById('gm-rest-overlay').getBoundingClientRect().height)`);
A.ok(ovH > 300, 'CONTROL de montaje: la pantalla del descanso se ve', ovH);
const b0 = await ev(BOTON);
A.ok(b0.txt === 'Silenciar' && b0.aria === 'Silenciar los avisos' && b0.ap === null, 'en el descanso el botón dice «Silenciar» (y el lector lo anuncia igual)', b0);
await ev(`document.getElementById('gm-rest-snd').click()`);
const b1 = await ev(BOTON), p2 = await pref();
A.ok(b1.txt === 'En silencio' && /^En silencio\./.test(b1.aria || '') && b1.ap === null, 'al tocarlo dice «En silencio»', b1);
A.ok(await ev(`document.querySelector('#gm-rest-snd svg').innerHTML.includes('M3.5 3.5l17 17')`), 'y muestra la campana TACHADA (no el ✨ de un ícono que no existe)');
A.ok(p2 && p2.mode === 'silencio' && p2.prev === 'vibracion', 'y queda en silencio recordando que venía de vibración', p2);
A.ok(/silencio/i.test(await ev(`document.getElementById('toast')?.textContent||document.body.innerText.slice(-400)`) || ''), 'un aviso le confirma que quedó en silencio');
const enSil = await medir('playRestEndBeep()');
A.ok(enSil.osc === 0 && enSil.vib.length === 0, 'silenciado desde el descanso: el final del descanso no suena ni vibra', enSil);
await ev(`document.getElementById('gm-rest-snd').click()`);
const p3 = await pref();
A.ok(p3 && p3.mode === 'vibracion' && p3.tone === 'gong', 'al volver a tocarlo vuelve a VIBRACIÓN (no a sonido) y conserva el tono', p3);

// ── 5b. Con el DEDO, no con .click() (QA Lucas H1) ──
// El botón se repinta al tocarlo; el dedo cae sobre su texto, que deja de existir antes de que el clic suba
// al descanso, y el descanso lo leía como «tocó a un lado» → se minimizaba. .click() entra por el <button>
// y por eso no lo veía. Con un descanso corriendo de verdad (sin restTimer, minimizar no hace nada).
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await ev(`(()=>{ GM.holding=null; if(!GM.restTimer) GM.restTimer=setInterval(()=>{},1e6); _gmWireRestMinimize(document.getElementById('gm-rest-overlay')); })()`);
const dedo = async (x, y) => {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(350);
};
const DESCANSO = `({abierto:!document.getElementById('gm-rest-overlay').classList.contains('hidden'), mini:!!document.getElementById('gm-rest-mini'), modo:JSON.parse(localStorage.getItem('ax_sound')||'{}').mode})`;
const centro = await ev(`(()=>{ const b=document.getElementById('gm-rest-snd').getBoundingClientRect(); const x=b.left+b.width/2, y=b.top+b.height/2; return {x, y, dentro:document.elementFromPoint(x,y).tagName}; })()`);
A.ok(centro.dentro !== 'BUTTON', 'CONTROL: el dedo cae sobre el TEXTO del botón, no sobre el botón (la puerta del defecto)', centro);
await dedo(centro.x, centro.y);
const d1 = await ev(DESCANSO);
A.ok(d1.modo === 'silencio', 'con el dedo, «Silenciar» silencia', d1);
A.ok(d1.abierto && !d1.mini, 'y el descanso sigue abierto (no se minimiza al tocar el botón)', d1);
await dedo(centro.x, centro.y);
const d2 = await ev(DESCANSO);
A.ok(d2.modo === 'vibracion' && d2.abierto && !d2.mini, 'el segundo toque devuelve el modo sin cerrar el descanso', d2);
// CONTROL de discriminación: tocar A UN LADO sí minimiza; si no, el «sigue abierto» de arriba no probaba nada.
await dedo(20, 140);
const d3 = await ev(DESCANSO);
A.ok(!d3.abierto && d3.mini, 'CONTROL: tocar a un lado del descanso SÍ lo minimiza', d3);
await ev(`(()=>{ gmExpandRest(); })()`);
await send('Emulation.setTouchEmulationEnabled', { enabled: false });

for (const fs of ['', 'xl']) {
  const tag = fs || 'normal';
  if (fs) { await ev(`setTextSize('${fs}')`); await sleep(600); }
  // CONTROL (gotcha v702): el zoom de la letra llega tarde; sin esto «Muy grande» puede medir la talla normal.
  const zoom = await ev(`Math.round((document.getElementById('gm-rest-snd').currentCSSZoom||1)*100)/100`);
  A.ok(zoom === (fs ? 1.4 : 1), `[${tag}] CONTROL: el tamaño de letra llegó al descanso (zoom ${zoom})`, zoom);
  const ctlR = await ev(`(()=>{ const c=document.querySelector('#gm-rest-overlay .gm-rest-ctl'); const bs=[...c.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect(); return {t:b.textContent.trim(), l:Math.round(r.left), r:Math.round(r.right), h:Math.round(r.height), corta:b.scrollWidth>b.clientWidth+1};});
    return {bs, anchoDoc:document.documentElement.scrollWidth}; })()`);
  A.ok(ctlR.bs.length === 3 && ctlR.bs.every(b => b.l >= 0 && b.r <= 360 && !b.corta), `[${tag}] los 3 botones del descanso caben enteros en 360 px`, ctlR.bs);
  A.ok(ctlR.bs.every(b => b.h >= 40), `[${tag}] y se pueden tocar (≥40 px de alto)`, ctlR.bs.map(b => b.h));
  if (SHOTS) {
    const rr = await ev(`(()=>{const b=document.querySelector('#gm-rest-overlay .gm-rest-circle').getBoundingClientRect(); const e=document.querySelector('#gm-rest-overlay .gm-rest-skip').getBoundingClientRect(); return {y:Math.max(0,b.top-60),h:e.bottom-b.top+90};})()`);
    const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: rr.y, width: 360, height: rr.h, scale: 1 } });
    writeFileSync(`${SHOTS}/sonido-descanso-${tag}.png`, Buffer.from(s.data, 'base64'));
  }
}
await ev(`setTextSize('normal')`);
await ev(`(()=>{ clearInterval(GM.restTimer); GM.restTimer=null; if(typeof _gmRemoveRestMini==='function') _gmRemoveRestMini(); document.getElementById('gm-rest-overlay').classList.add('hidden'); const g=document.getElementById('guided-mode'); g.classList.add('hidden'); g.classList.remove('gm-embedded'); document.body.appendChild(g); })()`);

// ── 6. Sobrevive a recargar; lo roto cae a sonido ──
await arrancar();
const t2 = await ev(TARJETA);
A.ok(t2 && t2.modos.find(x => x.on)?.t === 'Solo vibración' && t2.tonos.find(x => x.on)?.t === 'Gong',
  'tras recargar sigue en «Solo vibración» con «Gong»', t2 && [t2.modos.find(x => x.on), t2.tonos.find(x => x.on)]);
await ev(`localStorage.setItem('ax_sound','{{esto no es json')`);
const roto = await medir('playRestEndBeep()');
A.ok(roto.osc === 3 && roto.vib.length === 1, 'un ajuste guardado ROTO cae al de siempre (suena), nunca a silencio', roto);
await ev(`localStorage.setItem('ax_sound',JSON.stringify({mode:'mudo',tone:'no-existe'}))`);
const raro = await medir('playRestEndBeep()');
A.ok(raro.osc === 3, 'un modo o tono que no existe también cae al de siempre', raro);

salir(A, { chrome, srv, out: SHOTS });
