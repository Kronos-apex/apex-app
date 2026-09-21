// _verify-chat-lote.mjs — v646-v649: el lote del chat (contexto, respuestas del coach, visto, fotos).
//
// Decisión del PO (21-sep-2026): como «Vaciar chat» de WhatsApp — coach y asesorado pueden,
// cada uno para sí; el otro conserva su copia. Este harness mide lo que se VE (innerText y
// display reales), no el código:
//   A1-A6  asesorado: el botón aparece con mensajes, el primer toque solo ARMA, el segundo
//          vacía SU vista, el hilo compartido (DB.msgs) sigue entero, un mensaje nuevo del
//          coach SÍ aparece, y sin mensajes el botón no está.
//   C1-C6  coach: lo mismo en el chat de pantalla completa, más la bandeja (el hilo eliminado
//          sale de la lista) y la ficha (preview vacío).
// Escribe solo en memoria del navegador; el sello `cloudWriteSealed` impide tocar la nube
// desde localhost — no se desactiva.
//
//   node scripts/e2e/_verify-eliminar-chat.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';

const PORT = 8851, DP = 9371, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-chatlote-' + Date.now();
const SHOTS = process.env.AVI_SHOTS || (process.env.TEMP + '/avi-chatlote');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
const cerrar = () => { try { chrome.kill(); } catch {} try { srv.kill(); } catch {} };
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const fs = await import('node:fs');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (nombre) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${SHOTS}/${nombre}.png`, Buffer.from(r.data, 'base64')); };
// El tema se FIJA en los dos sitios: la preferencia del sistema Y el `data-theme` que la app pone
// desde el ajuste guardado de la cuenta — con solo el primero, la cuenta QA sale oscura siempre.
const tema = async t => {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: t }] });
  await ev(`document.documentElement.setAttribute('data-theme',${JSON.stringify(t)})`);
};

await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await tema('light');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
if (!dentro) { console.log('❌ EL LOGIN NO ENTRÓ (ojo con el rate limit: ~2-3 min entre corridas)'); cerrar(); process.exit(1); }
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize','news-tour'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await waitFor(`!!document.querySelector('.cntab[onclick*="cn-messages"]')`, 20000);
await ev(`(()=>{const b=document.querySelector('.cntab[onclick*="cn-messages"]');if(b)cnTab('cn-messages',b);})()`);
await sleep(600);

const R = [];
const chk = (nombre, ok, detalle) => { R.push([nombre, ok, detalle]); console.log(`${ok ? '✅' : '❌'} ${nombre}${detalle ? ' — ' + detalle : ''}`); };

// ═════ v646 · CONTEXTO DE LA RESPUESTA RÁPIDA ═════
// Sesión de HOY plantada en memoria (el sello impide que suba) y un chip de verdad pulsado.
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId); c.tier='premium'; delete c.chatClearedAt;
  DB.msgs[CUR.clientId]=[];
  const hoy=new Date(); hoy.setHours(Math.max(0,hoy.getHours()-1));
  DB.history[CUR.clientId]=[{id:'sx-lote',date:hoy.toISOString(),routineName:'Pierna LOTE',doneSets:3,totalSets:8,
    exercises:[{name:'Hip Thrust LOTE',sets:[{kg:'80',reps:'10',done:true},{kg:'90',reps:'8',done:true}]},{name:'Curl LOTE',sets:[{kg:'30',reps:'12',done:true}]}]}].concat(DB.history[CUR.clientId]||[]);
  renderClientMsgs(CUR.clientId);})()`);
await sleep(300);
await ev(`(()=>{const b=[...document.querySelectorAll('#cn-msg-quick button')].find(x=>/dolió/.test(x.textContent)); b.click();})()`);
await sleep(400);
const x1 = await ev(`(()=>{const ms=DB.msgs[CUR.clientId]||[]; const m=ms[ms.length-1]||{};
  const h=document.getElementById('cn-msg-thread'); const card=h.querySelector('.mctx');
  return {ctx:m.ctx||null, card:card?card.innerText:'', lineas:card?card.querySelectorAll('.mctx-l').length:-1};})()`);
chk('X1 el chip «Algo me dolió» viaja con el entreno de hoy', x1.ctx && x1.ctx.rutina === 'Pierna LOTE' && x1.ctx.ejs.length === 2, JSON.stringify(x1.ctx && x1.ctx.ejs));
chk('X2 el asesorado ve la tarjeta COMPACTA (sabe que su coach la ve)', /Pierna LOTE/.test(x1.card) && x1.lineas === 0, `«${x1.card}» líneas=${x1.lineas}`);
await tema('light'); await sleep(150); await shot('ctx-asesorado');
const ctxMsg = JSON.stringify(x1.ctx);
// Control de discriminación: sin sesión de hoy, NO hay contexto.
await ev(`(()=>{DB.history[CUR.clientId]=(DB.history[CUR.clientId]||[]).filter(s=>s.id!=='sx-lote'&&new Date(s.date).toDateString()!==new Date().toDateString());
  const b=[...document.querySelectorAll('#cn-msg-quick button')].find(x=>/duda/.test(x.textContent)); b.click();})()`);
await sleep(300);
const x3 = await ev(`(()=>{const ms=DB.msgs[CUR.clientId]; return ms[ms.length-1].ctx||null;})()`);
chk('X3 sin entreno hoy, el mensaje va SIN contexto', x3 === null, JSON.stringify(x3));

// Lado del coach: el mismo mensaje en su chat.
await ev(`(()=>{ showScreen('s-coach'); CUR.loggedAs='coach';
  try{localStorage.removeItem('ax_msgclear');}catch(e){}
  DB.clients=[{id:'kc1',name:'Ana Test',level:'Intermedio',goal:'Ganar músculo',days:3,tier:'premium'}];
  DB.msgs={kc1:[{from:'client',text:'🤕 Algo me dolió',date:new Date().toISOString(),ctx:${ctxMsg}}]};
  openCoachChat('kc1'); })()`);
await sleep(400);
const x4 = await ev(`(()=>{const card=document.querySelector('#cchat-thread .mctx'); return {txt:card?card.innerText:'', lineas:card?card.querySelectorAll('.mctx-l').length:0};})()`);
chk('X4 el coach ve la rutina y CADA ejercicio con su carga', /Pierna LOTE/.test(x4.txt) && x4.lineas === 2 && /90 kg × 8/.test(x4.txt), `«${x4.txt.replace(/\n/g,' | ')}»`);
await tema('light'); await sleep(150); await shot('ctx-coach-claro');
await tema('dark'); await sleep(150); await shot('ctx-coach-oscuro'); await tema('light');

// ═════ v647 · QUIÉN ESPERA + RESPUESTAS GUARDADAS ═════
await ev(`(()=>{ try{localStorage.removeItem('ax_cqr');localStorage.removeItem('ax_msgclear');}catch(e){}
  const hace=h=>new Date(Date.now()-h*3600000).toISOString();
  DB.clients=[{id:'kc1',name:'Ana Espera',days:3,tier:'premium'},{id:'kc2',name:'Beto Atendido',days:3,tier:'premium'}];
  DB.msgs={kc1:[{from:'coach',text:'hola',date:hace(90)},{from:'client',text:'¿Puedo cambiar la rutina?',date:hace(72)}],
           kc2:[{from:'client',text:'listo',date:hace(80)},{from:'coach',text:'bien',date:hace(79)}]};
  document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
  const home=document.getElementById('p-home'); if(home)home.classList.add('on');
  closeCoachChat&&(document.getElementById('coach-chat').classList.remove('on'));
  renderAwaitCard(); })()`);
await sleep(300);
const w1 = await ev(`(()=>{const e=document.getElementById('h-await'); return {vis:getComputedStyle(e).display!=='none', txt:(e.innerText||'').replace(/\\s+/g,' ')};})()`);
chk('W1 el Inicio avisa quién espera y desde cuándo', w1.vis && /1 persona espera tu respuesta/.test(w1.txt) && /Ana Espera/.test(w1.txt) && /hace 3 días/.test(w1.txt) && !/Beto/.test(w1.txt), `«${w1.txt}»`);
await ev(`document.getElementById('h-await').scrollIntoView({block:'center'})`); await tema('light'); await sleep(150); await shot('await-home-claro');
await tema('dark'); await sleep(150); await shot('await-home-oscuro'); await tema('light');
const w2 = await ev(`(()=>{renderMsgs(); const l=document.getElementById('msgs-list'); const f=l.querySelector('.cli'); return {primero:f?f.innerText.replace(/\\s+/g,' '):'', marcas:l.querySelectorAll('.msg-wait').length};})()`);
chk('W2 en la bandeja, quien espera va arriba con su marca', /Espera tu respuesta · hace 3 días/.test(w2.primero) && /Ana Espera/.test(w2.primero) && w2.marcas === 1, `primero=«${w2.primero}» marcas=${w2.marcas}`);
await ev(`openCoachChat('kc1')`); await sleep(400);
const w3 = await ev(`(()=>{const b=[...document.querySelectorAll('#cchat-qr .cchat-qr-b')]; const r=b[0]?b[0].getBoundingClientRect():null; return {n:b.length, primero:b.length?b[0].textContent:'', alto:r?Math.round(r.height):0};})()`);
chk('W3 el chat trae «Editar» primero + las 4 respuestas de fábrica', w3.n === 5 && w3.primero === 'Editar' && w3.alto >= 36, JSON.stringify(w3));
await tema('light'); await sleep(100); await shot('qr-chat-claro');
const antes = await ev(`DB.msgs.kc1.length`);
await ev(`document.querySelectorAll('#cchat-qr .cchat-qr-b')[1].click()`); await sleep(200);
const w4 = await ev(`({val:document.getElementById('cchat-in').value, n:DB.msgs.kc1.length})`);
chk('W4 la frase va a la caja y NO se envía sola', w4.val === '¡Bien hecho! 💪 Sigue así' && w4.n === antes, JSON.stringify(w4));
await ev(`document.querySelector('#cchat-qr .cchat-qr-edit').click()`); await sleep(200);
await ev(`(()=>{document.getElementById('cchat-qr-in').value='Uno\\nDos\\n\\n'; })()`);
await tema('dark'); await sleep(100); await shot('qr-editor-oscuro'); await tema('light');
await ev(`coachQrEditSave()`); await sleep(250);
const w5 = await ev(`(()=>{const b=[...document.querySelectorAll('#cchat-qr .cchat-qr-b')].map(x=>x.textContent); return {b, guardado:localStorage.getItem('ax_cqr'), editor:getComputedStyle(document.getElementById('cchat-qr-ed')).display};})()`);
chk('W5 editar guarda SUS frases y el chat las usa', JSON.stringify(w5.b) === JSON.stringify(['Editar', 'Uno', 'Dos']) && w5.guardado === '["Uno","Dos"]' && w5.editor === 'none', JSON.stringify(w5));

// ═════ v648 · «VISTO» ═════
// Lado coach: abrir el chat con un mensaje nuevo del asesorado estampa coachReadAt en su ficha.
await ev(`(()=>{ const hace=h=>new Date(Date.now()-h*3600000).toISOString();
  DB.clients=[{id:'kv1',name:'Vale Visto',days:3,tier:'premium'}];
  DB.msgs={kv1:[{from:'client',text:'¿Hoy pierna?',date:hace(2)}]};
  openCoachChat('kv1'); })()`);
await sleep(300);
const v1 = await ev(`(()=>{const c=DB.clients[0]; return {marca:c.coachReadAt||null, ok:!!c.coachReadAt&&new Date(c.coachReadAt)>=new Date(DB.msgs.kv1[0].date)};})()`);
chk('V1 abrir el chat con algo nuevo estampa la marca en la ficha del asesorado', v1.ok, JSON.stringify(v1));
const marca1 = v1.marca;
await sleep(1100);
await ev(`(()=>{closeCoachChat(); setTimeout(()=>openCoachChat('kv1'),0);})()`); await sleep(400);
const v2 = await ev(`DB.clients[0].coachReadAt`);
chk('V2 abrirlo otra vez SIN novedades no vuelve a escribir', v2 === marca1, `${marca1} → ${v2}`);
// Lado asesorado: vuelve a su pantalla (showScreen) con la marca puesta y un mensaje posterior sin ver.
await ev(`(()=>{ showScreen('s-client'); CUR.loggedAs='client';
  const hace=h=>new Date(Date.now()-h*3600000).toISOString();
  const c={id:'kv1',name:'Vale Visto',tier:'premium',coachReadAt:hace(1),routines:[]};
  DB.clients=[c]; CUR.clientId='kv1';
  DB.msgs={kv1:[{from:'client',text:'Uno',date:hace(3)},{from:'coach',text:'Dale',date:hace(2.5)},{from:'client',text:'Dos',date:hace(2)},{from:'client',text:'Tres',date:hace(0.5)}]};
  const b=document.querySelector('.cntab[onclick*="cn-messages"]'); if(b)cnTab('cn-messages',b);
  renderClientMsgs('kv1'); })()`);
await sleep(400);
const v3 = await ev(`(()=>{const ms=[...document.querySelectorAll('#cn-msg-thread .mt')].map(x=>x.textContent); return ms;})()`);
const conVisto = v3.filter(t => /Visto/.test(t));
chk('V3 el asesorado ve «Visto» UNA vez, bajo el último mensaje que su coach leyó', conVisto.length === 1 && v3.indexOf(conVisto[0]) === 2, JSON.stringify(v3));
await tema('light'); await sleep(150); await shot('visto-asesorado-claro');
await tema('dark'); await sleep(150); await shot('visto-asesorado-oscuro'); await tema('light');

// ═════ v649 · FOTO O VIDEO ═════
// En localhost la subida está SELLADA (y así debe seguir): se sustituyen SOLO la subida, la URL
// firmada y el selector de archivos — el resto del flujo es el real. La sonda
// `_probe-chat-media.mjs` prueba esos tres contra el servidor de verdad.
await ev(`(()=>{ window.__subidas=[]; window.__falla=false;
  const cv=document.createElement('canvas'); cv.width=320; cv.height=240; const g=cv.getContext('2d'); g.fillStyle='#e76f51'; g.fillRect(0,0,320,240); g.fillStyle='#fff'; g.font='40px sans-serif'; g.fillText('TÉCNICA',60,135);
  window.__img=cv.toDataURL('image/jpeg');
  window._chatMediaUpload=async (path,blob,type)=>{ if(window.__falla)throw new Error('red'); window.__subidas.push({path,type,size:blob.size}); return path; };
  window._chatMediaUrl=async path=>window.__img;
  window.chatPickMedia=cb=>cb({blob:new Blob([new Uint8Array(1000)],{type:'image/jpeg'}),type:'image/jpeg',kind:'img'});
  const U='11111111-2222-4333-8444-555555555555';
  DB.clients=[{id:U,name:'Fer Foto',tier:'premium',routines:[]}]; CUR.clientId=U; CUR.loggedAs='client';
  DB.msgs={[U]:[]};
  showScreen('s-client'); const b=document.querySelector('.cntab[onclick*="cn-messages"]'); if(b)cnTab('cn-messages',b);
  renderClientMsgs(U); })()`);
await sleep(300);
await ev(`document.querySelector('#cn-msg-composer .mattach').click()`); await sleep(500);
const f1 = await ev(`(()=>{const U=CUR.clientId; const ms=DB.msgs[U]; const m=ms[ms.length-1]||{}; const img=document.querySelector('#cn-msg-thread .mmedia img');
  return {subidas:window.__subidas.length, ruta:(window.__subidas[0]||{}).path||'', media:m.media||null, img:!!img&&img.getBoundingClientRect().height>40};})()`);
chk('F1 el asesorado manda una foto: se sube a SU carpeta y se ve en el hilo', f1.subidas === 1 && /^11111111-2222-4333-8444-555555555555\/chat-/.test(f1.ruta) && f1.media && f1.media.kind === 'img' && f1.img, JSON.stringify(f1));
await ev(`document.querySelector('#cn-msg-thread .mmedia').scrollIntoView({block:'center'})`);
await tema('light'); await sleep(150); await shot('foto-asesorado-claro');
await tema('dark'); await sleep(150); await shot('foto-asesorado-oscuro'); await tema('light');
await ev(`(()=>{window.__falla=true; document.querySelector('#cn-msg-composer .mattach').click();})()`); await sleep(400);
const f2 = await ev(`DB.msgs[CUR.clientId].length`);
chk('F2 si la subida falla, NO aparece un mensaje roto', f2 === 1, `mensajes=${f2}`);
await ev(`(()=>{window.__falla=false; DB.msgs[CUR.clientId].push({from:'coach',text:'📷 Foto',date:new Date().toISOString(),media:{path:'otra-persona/chat-x.jpg',kind:'img'}}); renderClientMsgs(CUR.clientId);})()`);
await sleep(300);
const f3 = await ev(`(()=>{const n=[...document.querySelectorAll('#cn-msg-thread .mmedia')]; const u=n[n.length-1]; return {txt:u?u.textContent:'', img:u?!!u.querySelector('img'):null};})()`);
chk('F3 🔒 una ruta de OTRA carpeta no se pide ni se pinta', f3.img === false && /no disponible/.test(f3.txt), JSON.stringify(f3));
// Coach: el mismo archivo en su chat, y un video suyo.
await ev(`(()=>{ const U=CUR.clientId; showScreen('s-coach'); CUR.loggedAs='coach';
  window.chatPickMedia=cb=>cb({blob:new Blob([new Uint8Array(2000)],{type:'video/mp4'}),type:'video/mp4',kind:'vid'});
  DB.msgs[U]=DB.msgs[U].filter(m=>!(m.media&&/^otra/.test(m.media.path)));
  openCoachChat(U); })()`);
await sleep(400);
await ev(`document.querySelector('#coach-chat .mattach').click()`); await sleep(500);
const f4 = await ev(`(()=>{const U=CUR.clientId||DB.clients[0].id; const ult=window.__subidas[window.__subidas.length-1]||{};
  return {imgs:document.querySelectorAll('#cchat-thread .mmedia img').length, videos:document.querySelectorAll('#cchat-thread .mmedia video').length, ruta:ult.path||'', tipo:ult.type||''};})()`);
chk('F4 el coach ve la foto y manda un video a la carpeta DEL ASESORADO', f4.imgs === 1 && f4.videos === 1 && /^11111111-2222-4333-8444-555555555555\/chat-.*\.mp4$/.test(f4.ruta) && f4.tipo === 'video/mp4', JSON.stringify(f4));
await tema('light'); await sleep(150); await shot('foto-coach-claro');
const f5 = await ev(`(()=>{const b=document.querySelector('#coach-chat .mattach').getBoundingClientRect(); const c=document.querySelector('#cn-msg-composer .mattach'); return {coach:Math.round(Math.min(b.width,b.height))};})()`);
chk('F5 el botón de adjuntar se puede tocar (≥40 px)', f5.coach >= 40, JSON.stringify(f5));

// @@SECCIONES@@

const ok = R.every(r => r[1]) && jsErrors.length === 0;
console.log(`\n${ok ? '🟢' : '🔴'} ${R.filter(r => r[1]).length}/${R.length} comprobaciones · jsErrors=${JSON.stringify(jsErrors)}\n📸 ${SHOTS}`);
cerrar();
process.exit(ok ? 0 : 1);
