// Verificación E2E de v588: LO QUE EL COACH ESCRIBE YA NO SE PIERDE EN SILENCIO.
//
// Hallazgo D1-2 de la auditoría del 7-sep: `_persistCoachWrite` solo hacía `warn()` en el
// catch —ni bandera dirty, ni respaldo local, ni reintento— mientras el asesorado tiene esa
// red de seguridad desde junio. Y encima `sendCoachChatMsg` cantaba «💬 Mensaje enviado»
// pasara lo que pasara, y mandaba el PUSH antes de saber si el mensaje existía.
//
// 🔒 Este harness REPRODUCE la pérdida antes de medir el arreglo (R1 corre contra el mismo
//    código con la nube caída) y afirma lo que el coach VE y lo que la nube RECIBE, no la
//    presencia de un selector.
// 🔒 Con sus CONTROLES: con red todo se comporta como antes (mensaje, push y cero aviso), y
//    el reintento NO pisa una fila que cambió después del intento fallido.
// Patrón preview-SIN-login: se planta el fixture y se llama a las funciones reales.
//
// Corre: node scripts/e2e/_verify-cola-coach.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8797;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-colacoach-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9297', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9297/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-colacoach';
try { mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof sendCoachChatMsg==='function' && typeof _flushCoachWrites==='function' && typeof _cwqRead==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó (o falta alguna función de v588)'); process.exit(1); }

// ── FIXTURE: un coach en modo auth con dos asesorados, y la NUBE bajo nuestro control ──
// La nube se sustituye por un doble que registra lo que recibe y puede fallar a voluntad: es la
// única forma de reproducir «sin señal» sin depender de que hoy se caiga internet de verdad.
const montaje = await ev(`(()=>{try{
  AUTH_MODE=true; AUTH_ROLE='coach'; COACH_SELF=false; _authUid='coach-uid';
  if(typeof AUTH==='object'&&AUTH) AUTH.ready=()=>true;
  DB.clients=[
    {id:'cc1',name:'Samuel Cifuentes',tier:'coach',level:'Intermedio',days:3,routines:[]},
    {id:'cc2',name:'Kathe Beltran',tier:'coach',level:'Intermedio',days:3,routines:[]},
  ];
  DB.msgs={cc1:[{from:'coach',text:'Nos vemos el martes',date:'2026-09-01T10:00:00.000Z'}],cc2:[]};
  DB.history={cc1:[],cc2:[]}; DB.prs={cc1:{},cc2:{}}; DB.bodyweight={cc1:[],cc2:[]};
  DB.medidas={cc1:[],cc2:[]}; DB.nutrition={cc1:{},cc2:{}}; DB.photos={cc1:[],cc2:[]};
  window.__nube={caida:true, escrituras:[], fila:{cc1:{msgs:[{from:'coach',text:'Nos vemos el martes',date:'2026-09-01T10:00:00.000Z'}],updated_at:'2026-09-01T10:00:00.000Z'}}};
  UD.updateClientRow=async(id,patch)=>{ if(window.__nube.caida) throw new Error('Failed to fetch');
    window.__nube.escrituras.push({id,patch}); Object.assign(window.__nube.fila[id]||(window.__nube.fila[id]={}),patch); return patch; };
  UD.upsertOwn=async(patch)=>{ if(window.__nube.caida) throw new Error('Failed to fetch'); window.__nube.escrituras.push({id:'self',patch}); return patch; };
  UD.readClientCol=async(id,cols)=>{ if(window.__nube.caida) return null; return window.__nube.fila[id]||null; };
  window.__push=[]; pushToClient=async(id,t,b)=>{ window.__push.push({id,t,b}); return true; };
  window.__toasts=[]; toast=(t)=>{ window.__toasts.push(t); };
  try{localStorage.removeItem('ax_cwq_coach-uid');}catch(e){}
  _primeCoachSnap();
  showScreen('s-coach');
  if(typeof openCoachChat==='function') openCoachChat('cc1'); else { _cchatId='cc1'; renderCoachChatThread('cc1',true); }
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE el coach, sus dos asesorados y la nube-doble quedan en pie', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }
await ev(`(()=>{const s=document.getElementById('avi-loading');if(s)s.style.display='none';
  const b=document.getElementById('install-banner');if(b)b.style.display='none';return 1;})()`);
await sleep(300);

// ── COBERTURA: el hilo está VISIBLE y con su mensaje viejo ──
const cob = await ev(`(()=>{const c=document.getElementById('cchat-thread');
  if(!c)return{err:'sin hilo'};
  const r=c.getBoundingClientRect();
  return {alto:Math.round(r.height),vis:getComputedStyle(c).display!=='none',txt:c.innerText.replace(/\\s+/g,' ').trim()};})()`);
check('COBERTURA el hilo del chat se ve con alto real y trae el mensaje anterior',
  cob && cob.vis && cob.alto > 0 && /Nos vemos el martes/.test(cob.txt || ''), JSON.stringify(cob).slice(0, 160));
if (!cob || !cob.alto) { log('\n🔴 sin cobertura las cifras de esta corrida no valen'); process.exit(1); }

// ══ R1 · LA PÉRDIDA, REPRODUCIDA (la nube está caída) ══
await ev(`(()=>{const ta=document.getElementById('cchat-in'); ta.value='Mañana subimos a 45 kg en sentadilla'; return 1;})()`);
await ev(`sendCoachChatMsg()`);
await sleep(400);
const r1 = await ev(`(()=>({
  cola:_cwqRead().map(x=>({col:x.col,id:x.id,n:(x.val||[]).length})),
  toasts:window.__toasts.slice(),
  push:window.__push.length,
  hilo:document.getElementById('cchat-thread').innerText.replace(/\\s+/g,' ').trim(),
  aviso:(()=>{const b=document.getElementById('coach-sync');return b?{vis:getComputedStyle(b).display!=='none',txt:b.textContent}:null;})(),
}))()`);
check('R1-a el mensaje NO se pierde: queda en la cola persistida con su contenido',
  r1.cola.length === 1 && r1.cola[0].col === 'msgs' && r1.cola[0].id === 'cc1' && r1.cola[0].n === 2, JSON.stringify(r1.cola));
check('R1-b la app NO dice «Mensaje enviado» cuando no salió',
  !r1.toasts.some(t => /Mensaje enviado/.test(t)) && r1.toasts.some(t => /Sin conexión/.test(t)), JSON.stringify(r1.toasts));
check('R1-c el PUSH no sale: avisar de un mensaje que no existe deja al asesorado con un chat vacío',
  r1.push === 0, 'pushes=' + r1.push);
// 🔬 CONTROL DE DISCRIMINACIÓN: que el texto «sin enviar» APAREZCA no prueba nada — la primera
//    versión marcaba el hilo ENTERO (la cola guarda todo el hilo) y esta aserción salía verde
//    igual. Se vio MIRANDO la captura. Lo que hay que exigir es que marque UNO: el que no salió.
const marcas1 = (r1.hilo.match(/sin enviar/g) || []).length;
check('R1-d el hilo marca «sin enviar» SOLO el mensaje que no salió (el viejo ya está en la nube)',
  marcas1 === 1 && /45 kg[^]*sin enviar/.test(r1.hilo) && !/martes\s*·[^·]*sin enviar/.test(r1.hilo),
  'marcas=' + marcas1 + ' · ' + (r1.hilo || '').slice(-120));
check('R1-e y el aviso de la barra aparece con lo que falta por guardar',
  r1.aviso && r1.aviso.vis && /1 sin guardar/.test(r1.aviso.txt), JSON.stringify(r1.aviso));
await shot('cola-sin-red');

// ── R2 · SOBREVIVE A CERRAR LA APP (es el caso del hallazgo: se recargaba y no estaba) ──
const r2 = await ev(`(()=>{const raw=localStorage.getItem('ax_cwq_coach-uid');
  const l=raw?JSON.parse(raw):[];
  return {enDisco:l.length, texto:JSON.stringify(l).indexOf('45 kg')>0, dirty:localStorage.getItem('ax_udirty_coach-uid')};})()`);
check('R2 lo pendiente vive en el disco, no en memoria: sobrevive a que Android mate la app',
  r2.enDisco === 1 && r2.texto === true && r2.dirty === '1', JSON.stringify(r2));

// ══ R3 · VUELVE LA SEÑAL: se sube FUSIONANDO con lo que ella escribió mientras tanto ══
const r3 = await ev(`(async()=>{
  // Mientras el coach estaba sin señal, Kathe... no; SAMUEL escribió desde su teléfono.
  window.__nube.fila.cc1.msgs.push({from:'client',text:'Listo profe, ahí estaré',date:'2026-09-02T11:00:00.000Z'});
  window.__nube.fila.cc1.updated_at='2026-09-02T11:00:00.000Z';
  window.__nube.caida=false;
  const r=await _flushCoachWrites();
  renderCoachChatThread('cc1',true);
  const sub=window.__nube.escrituras.filter(e=>e.patch&&e.patch.msgs).slice(-1)[0];
  return {r, cola:_cwqRead().length, subido:(sub&&sub.patch.msgs||[]).map(m=>m.text),
    hilo:document.getElementById('cchat-thread').innerText.replace(/\\s+/g,' ').trim(),
    aviso:(()=>{const b=document.getElementById('coach-sync');return b?getComputedStyle(b).display!=='none':null;})()};
})()`);
check('R3-a al reconectar se sube y la cola queda vacía',
  r3 && r3.r && r3.r.ok === 1 && r3.cola === 0, JSON.stringify(r3 && r3.r));
check('R3-b y se FUSIONA: lo que subió trae los 3 mensajes, incluido el del asesorado',
  Array.isArray(r3.subido) && r3.subido.length === 3 && r3.subido.some(t => /Listo profe/.test(t)) && r3.subido.some(t => /45 kg/.test(t)),
  JSON.stringify(r3.subido));
check('R3-c el hilo ya no dice «sin enviar» y el aviso de la barra se apaga',
  !/sin enviar/.test(r3.hilo || '') && r3.aviso === false, (r3.hilo || '').slice(-100));
await shot('cola-reconectado');

// ══ R4 · CONTROL DE LA REGLA DURA: no se pisa lo que cambió después del intento fallido ══
const r4 = await ev(`(async()=>{
  // El coach le registra un entreno a Kathe sin señal…
  window.__nube.caida=true;
  DB.history.cc2=[{id:'h1',date:'2026-09-08T09:00:00.000Z',routineId:'r1',exercises:[]}];
  await svNow('ax_hist',DB.history);
  const enCola=_cwqRead().filter(x=>x.col==='history'&&x.id==='cc2').length;
  // …y mientras tanto ELLA entrena desde su teléfono: la fila queda más nueva que mi intento.
  window.__nube.fila.cc2={history:[{id:'h9',date:'2026-09-08T18:00:00.000Z'}],updated_at:new Date(Date.now()+60000).toISOString()};
  window.__nube.caida=false;
  const r=await _flushCoachWrites();
  const pisado=window.__nube.fila.cc2.history.map(h=>h.id);
  return {enCola, r, pisado, sigueEnCola:_cwqRead().filter(x=>x.col==='history').length,
    aviso:(()=>{const b=document.getElementById('coach-sync');return b?b.textContent:null;})()};
})()`);
check('R4-a el fallo de un entreno del coach también entra a la cola (no solo los mensajes)',
  r4.enCola === 1, JSON.stringify(r4).slice(0, 120));
check('R4-b y NO se reenvía sobre una fila más nueva: el entreno de ella sigue ahí',
  r4.r && r4.r.held === 1 && r4.r.ok === 0 && r4.pisado.length === 1 && r4.pisado[0] === 'h9', JSON.stringify(r4.r) + ' ' + JSON.stringify(r4.pisado));
check('R4-c lo retenido NO se descarta: sigue en la cola y a la vista del coach',
  r4.sigueEnCola === 1 && /1 sin guardar/.test(r4.aviso || ''), JSON.stringify({ q: r4.sigueEnCola, a: r4.aviso }));

// ══ R5 · CONTROL CON RED: todo se comporta como antes (si no, «arreglar» sería romper) ══
const r5 = await ev(`(async()=>{
  _cwqDrop('history','cc2');
  window.__toasts.length=0; window.__push.length=0;
  const ta=document.getElementById('cchat-in'); ta.value='Buen trabajo hoy 💪';
  await sendCoachChatMsg();
  await new Promise(r=>setTimeout(r,150));
  return {toasts:window.__toasts.slice(), push:window.__push.length, cola:_cwqRead().length,
    hilo:document.getElementById('cchat-thread').innerText.replace(/\\s+/g,' ').trim(),
    aviso:(()=>{const b=document.getElementById('coach-sync');return getComputedStyle(b).display!=='none';})()};
})()`);
check('R5-a con red: se anuncia enviado, sale el push y no queda nada en la cola',
  r5.toasts.some(t => /Mensaje enviado/.test(t)) && r5.push === 1 && r5.cola === 0, JSON.stringify(r5.toasts) + ' push=' + r5.push);
check('R5-b y el aviso de la barra no aparece cuando no hay nada que avisar',
  r5.aviso === false && !/sin enviar/.test(r5.hilo || ''), 'aviso=' + r5.aviso);

// ── El aviso es legible en los DOS temas (v570: un token crudo es ilegible en claro) ──
for (const tema of ['dark', 'light']) {
  await ev(`(()=>{ setTheme('${tema}'); _cwqAdd('msgs','cc1',[{from:'coach',text:'x',date:'2026-09-08T00:00:00.000Z'}]); return 1;})()`);
  await sleep(200);
  const con = await ev(`(()=>{const b=document.getElementById('coach-sync');
    const cs=getComputedStyle(b);
    let el=b,fondo='rgba(0, 0, 0, 0)';
    while(el&&fondo==='rgba(0, 0, 0, 0)'){ fondo=getComputedStyle(el).backgroundColor; el=el.parentElement; }
    const r=b.getBoundingClientRect();
    return {color:cs.color,fondo,alto:Math.round(r.height),ancho:Math.round(r.width)};})()`);
  const rgb = t => (t.match(/\d+/g) || []).slice(0, 3).map(Number);
  const lum = c => { const [r, g, b] = rgb(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const L1 = Math.max(lum(a), lum(b)), L2 = Math.min(lum(a), lum(b)); return (L1 + 0.05) / (L2 + 0.05); };
  const cr = ratio(con.color, con.fondo);
  check(`T-${tema} el aviso se lee (contraste ≥4.5) y es tocable (≥28 px de alto)`,
    cr >= 4.5 && con.alto >= 28, `ratio=${cr.toFixed(2)} ${JSON.stringify(con)}`);
  await shot('cola-aviso-' + tema);
}
await ev(`setTheme('dark'); _cwqDrop('msgs','cc1');`);

// ── Cierre ──
log('\n  jsErrors: ' + JSON.stringify(jsErrors));
const fails = results.filter(r => r.startsWith('FAIL'));
log(`\n  ${results.length - fails.length}/${results.length} checks OK`);
if (fails.length || jsErrors.length) { log('🔴 ' + fails.length + ' fallos'); }
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fails.length || jsErrors.length ? 1 : 0);
