// Verificación E2E del PLAN DE CHOQUE (#d-shock, v354, Fase 4). Patrón _shot-coach/_verify-pulse:
// NO login real — se inyectan clientes fake y se fuerza s-coach (CUR.loggedAs='coach'); el sello
// v298 protege la nube. Cubre los 2 CANDADOS innegociables: (a) con dolor activo NUNCA se ofrece
// el 5×5, (b) nada le llega al asesorado sin que el coach lo toque (el chat se PRELLENA, no se
// envía). Además: aplicar en 1 toque, swap que conserva sets/reps, mute, XSS y determinismo.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8784;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-shock-' + Date.now();
const OUT = process.env.SHOCK_OUT || (process.env.TEMP + '/avi-shock');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9284', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9284/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const evj = async expr => JSON.parse(await ev(`JSON.stringify(${expr})`));
const waitFor = async (expr, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };
async function shot(name) { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); } catch (e) { log('  (shot ' + name + ' falló: ' + e.message + ')'); } }
async function setTheme(t) { await ev(`typeof setTheme==='function' && setTheme('${t}')`); await sleep(200); }

// Lectura de la tarjeta. `opts` cuenta los botones "Aplicar" REALES (por su onclick), no por
// texto: así el check no depende del copy. innerText aplica text-transform (gotcha v352) → el
// texto se compara case-insensitive.
const shockCard = `(()=>{const el=document.getElementById('d-shock');
  if(!el||getComputedStyle(el).display==='none')return {shown:false,opts:0,warns:0,text:'',sections:0,deload:false};
  const card=el.querySelector('.card'); if(!card)return {shown:false,opts:0,warns:0,text:'',sections:0,deload:false};
  const btns=[...card.querySelectorAll('button')]; const oc=b=>b.getAttribute('onclick')||'';
  return {shown:true,
    opts:btns.filter(b=>/applyShock\\(/.test(oc(b))).length,
    write:btns.some(b=>/shockWrite\\(/.test(oc(b))),
    dismiss:btns.some(b=>/dismissShock\\(/.test(oc(b)))||btns.some(b=>/dismissShockGlobal\\(/.test(oc(b))),
    sections:btns.filter(b=>/shockWrite\\(/.test(oc(b))).length,
    deload:btns.some(b=>/shockDeload\\(/.test(oc(b))),
    rebuild:btns.some(b=>/shockWriteRebuild\\(/.test(oc(b))),
    warns:[...card.querySelectorAll('div')].filter(d=>/--orl/.test(d.getAttribute('style')||'')).length,
    text:el.innerText};})()`;

// Astrid, estancada en "Jalón al Pecho". v433: el detector pide ≥8 semanas de datos y ≥7 sesiones
// del ejercicio, así que el fixture son 25 sesiones cada 3 días con el techo de 62 kg en la 2ª
// (zona de referencia) y el resto por debajo. El historial de la app va nuevo→viejo (de ahí el
// reverse). `startDate` de hace 200 días = pasa también los pisos de la DESCARGA.
const ST_N = 25, ST_WIN_I = 13;
const stKgsJs = `(p,b,t)=>Array.from({length:${ST_N}},(_,i)=>i===1?p:(i>=${ST_WIN_I}?t:b))`;
const fixture = (extra) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const kgs=(${stKgsJs})(62,60,60);
  const sess=kgs.map((kg,i)=>({date:new Date(Date.now()-(${ST_N}-1-i)*3*86400000).toISOString(),routineName:'Espalda',
    exercises:[{name:'Jalón al Pecho',muscle:'espalda',track:'peso_reps',sets:[{done:true,kg:String(kg),reps:'8'}]}]})).reverse();
  const c={id:'a1',name:'Astrid Prueba',level:'Intermedio',days:3,tier:'premium',goal:'Ganar músculo',notes:'',
    startDate:new Date(Date.now()-200*86400000).toISOString(),
    payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:120000}],
    routines:[{id:'r1',name:'Espalda A',day:'Lunes',restSec:60,exercises:[
        {id:'e0',name:'Jalón al Pecho',muscle:'espalda',sets:4,reps:8,restSec:90},
        {id:'e1',name:'Otro',muscle:'pecho',sets:3,reps:10}]},
      {id:'r2',name:'Espalda B',day:'Jueves',restSec:45,exercises:[
        {id:'e0',name:'Jalón al Pecho',muscle:'espalda',sets:3,reps:12}]}]};
  ${extra || ''}
  DB.clients=[c]; DB.history={a1:sess}; DB.prs={}; DB.msgs={};
  for(let i=localStorage.length-1;i>=0;i--){const kk=localStorage.key(i);if(kk&&(kk.indexOf('shockmute_')===0||kk.indexOf('coachpulse_')===0))localStorage.removeItem(kk);}
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach');
  gp('p-detail',null,'Detalle',true); // los shots deben mostrar la ficha, que es donde vive la tarjeta
  CUR.clientId=c.id;
  renderShockCard(c);
  document.getElementById('s-coach').scrollTop=0;
  const _el=document.getElementById('d-shock'); if(_el&&_el.style.display!=='none')_el.scrollIntoView();
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`;

// Fase 4.1: historial con VARIOS ejercicios plantados. specs=[{name,muscle,kgs}] con kgs de ST_N
// valores cronológicos (usa KG_MESETA/KG_CAIDA). `spacingDays` controla la CADENCIA (cada cuántos
// días entrena) → separa «grindeando» (denso, spacing 3) de «a saltos» (spacing 8). 3 rutinas con
// día → planDays=3 (bar de constancia 3×0,8 = 2,4 desde v433). `endOffset` corre el bloque entero.
const multiFixture = (specs, spacingDays = 3, endOffset = 2, extraClient = '') => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const specs=${JSON.stringify(specs)}; const SP=${spacingDays}; const EO=${endOffset};
  const N=${ST_N}, out=[];
  for(let i=0;i<N;i++){ out.push({date:new Date(Date.now()-(EO+(N-1-i)*SP)*86400000).toISOString(),routineName:'R',
    exercises:specs.map(s=>({name:s.name,muscle:s.muscle,track:'peso_reps',sets:[{done:true,kg:String(s.kgs[i]),reps:'8'}]}))}); }
  const sess=out.reverse();
  const c={id:'a1',name:'Astrid Prueba',level:'Intermedio',days:3,tier:'premium',goal:'Ganar músculo',notes:'',
    startDate:new Date(Date.now()-200*86400000).toISOString(),
    payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:120000}],
    routines:[{id:'r1',name:'R',day:'Lunes',restSec:60,exercises:specs.map((s,i)=>({id:'e'+i,name:s.name,muscle:s.muscle,sets:4,reps:8,restSec:90}))},
      {id:'r2',name:'B',day:'Miércoles',restSec:60,exercises:[]},{id:'r3',name:'C',day:'Viernes',restSec:60,exercises:[]}]};
  ${extraClient}
  DB.clients=[c]; DB.history={a1:sess}; DB.prs={}; DB.msgs={};
  for(let i=localStorage.length-1;i>=0;i--){const kk=localStorage.key(i);if(kk&&(kk.indexOf('shockmute_')===0||kk.indexOf('coachpulse_')===0))localStorage.removeItem(kk);}
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach');
  gp('p-detail',null,'Detalle',true);
  CUR.clientId=c.id;
  renderShockCard(c);
  document.getElementById('s-coach').scrollTop=0;
  const _el=document.getElementById('d-shock'); if(_el&&_el.style.display!=='none')_el.scrollIntoView();
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`;
// Patrones de ST_N valores cronológicos (mismo molde que avi.test.js): el techo va en la 2ª
// sesión (zona de REFERENCIA) y la cola desde ST_WIN_I (dentro de la ventana).
const stKgs=(p,base,t)=>Array.from({length:ST_N},(_,i)=>i===1?p:(i>=ST_WIN_I?t:base));
const KG_MESETA=stKgs(62,60,62); // iguala el techo → estancado SIN regresión
const KG_CAIDA=stKgs(62,60,52);  // el índice cae ~16% → estancado Y en regresión (→ descarga)

try {
  await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
  await sleep(2000);
  // Congela el poll de 15s: re-trae la nube y borraría los fixtures a media corrida (gotcha v347).
  await ev(`(()=>{for(let i=1;i<9999;i++)clearInterval(i);window.pollMessages=()=>{};window.syncFromCloud=()=>Promise.resolve();})()`);
  // Silencia el tour de novedades ANTES del primer shot (regla 6, observación del ciclo v352).
  await ev(`(()=>{try{localStorage.setItem('ax_news_seen',JSON.stringify((AVI_NEWS||[]).map(n=>n.id)));}catch(e){}
    const t=document.getElementById('news-tour'); if(t)t.classList.remove('on');})()`);

  // ── S1: la tarjeta aparece con el análisis y las 3 opciones ──
  const setup = await ev(fixture());
  if (setup !== true) throw new Error('setup falló: ' + setup);
  await sleep(400);
  let s = await evj(shockCard);
  await shot('S1-card');
  check('S1 tarjeta visible con 3 opciones + Escribirle + Descartar', s.shown && s.opts === 3 && s.write && s.dismiss, JSON.stringify({ opts: s.opts, write: s.write, dismiss: s.dismiss }));
  check('S1b análisis con el ejercicio y el kg plantado', /jal[oó]n al pecho/i.test(s.text) && /62\s*kg/i.test(s.text), (s.text || '').slice(0, 90).replace(/\n/g, ' | '));
  check('S1c sin dolor ni limitación → sin avisos', s.warns === 0, 'warns=' + s.warns);

  // ── S2 (CANDADO): con dolor activo NO se ofrece el 5×5 y el coach ve el aviso ──
  await ev(fixture(`c.painCare=[{area:'hombro',at:new Date(Date.now()-2*86400000).toISOString()}];`));
  await sleep(300);
  s = await evj(shockCard);
  await shot('S2-dolor');
  const pesadoConDolor = await ev(`(()=>{const o=(CUR.shock&&CUR.shock.targets&&CUR.shock.targets[0].plan.options)||[];return o.some(x=>x.id==='pesado');})()`);
  check('🔒 S2 dolor activo → SIN bloque pesado 5×5', s.shown && s.opts === 2 && pesadoConDolor === false, 'opts=' + s.opts + ' pesado=' + pesadoConDolor);
  check('S2b el coach ve el aviso de dolor', s.warns >= 1 && /dolor/i.test(s.text), 'warns=' + s.warns);

  // ── S3: "Aplicar" el 5×5 desde el botón real → TODAS las entradas del ejercicio ──
  await ev(fixture());
  await sleep(300);
  const applied = await evj(`(()=>{
    const el=document.getElementById('d-shock');
    const btns=[...el.querySelectorAll('button')].filter(b=>/applyShock\\(/.test(b.getAttribute('onclick')||''));
    const idx=CUR.shock.targets[0].plan.options.findIndex(o=>o.id==='pesado');
    btns[idx].click();
    const c=DB.clients.find(x=>x.id==='a1');
    const rows=[];
    c.routines.forEach(r=>r.exercises.forEach(e=>rows.push({n:e.name,sets:e.sets,reps:e.reps,rest:e.restSec})));
    return {rows, muted:!!localStorage.getItem('shockmute_a1_'+_norm('Jalón al Pecho'))};})()`);
  const jal = applied.rows.filter(r => r.n === 'Jalón al Pecho');
  check('S3 Aplicar 5×5 → las 2 apariciones quedan 5×5', jal.length === 2 && jal.every(r => r.sets === 5 && r.reps === 5), JSON.stringify(jal));
  check('S3b descanso +30s (propio 90→120, heredado 45→75)', jal[0] && jal[0].rest === 120 && jal[1] && jal[1].rest === 75, JSON.stringify(jal.map(r => r.rest)));
  check('S3c no toca los demás ejercicios', applied.rows.some(r => r.n === 'Otro' && r.sets === 3 && r.reps === 10), JSON.stringify(applied.rows.filter(r => r.n === 'Otro')));
  check('S3d tras aplicar queda silenciado 21 días', applied.muted === true);
  s = await evj(shockCard);
  check('S3e tras aplicar la tarjeta desaparece (no re-propone)', s.shown === false);

  // ── S4 (CANDADO): el chat se PRELLENA pero NADA se envía ──
  const chat = await evj(`(()=>{const ta=document.getElementById('cchat-in');
    return {val:ta?ta.value:'', open:!!document.getElementById('coach-chat').classList.contains('on'),
      msgs:((DB.msgs&&DB.msgs.a1)||[]).length, disabled:ta?!!ta.disabled:null};})()`);
  check('🔒 S4 el chat se abre PRELLENADO y editable', chat.open && chat.val.length > 20 && chat.disabled === false, JSON.stringify({ open: chat.open, len: chat.val.length }));
  check('🔒 S4b NADA se envió solo (0 mensajes en la conversación)', chat.msgs === 0, 'msgs=' + chat.msgs);
  check('S4c el mensaje va en voz del coach (nombre + kg)', /Astrid/.test(chat.val) && /62/.test(chat.val), chat.val.slice(0, 80));
  await shot('S4-chat-prellenado');
  await ev(`(()=>{const el=document.getElementById('coach-chat');if(el)el.classList.remove('on');})()`);

  // ── S5: la variante rota el ejercicio CONSERVANDO series y repeticiones ──
  await ev(fixture());
  await sleep(300);
  const swap = await evj(`(()=>{
    const idx=CUR.shock.targets[0].plan.options.findIndex(o=>o.id==='variante');
    if(idx<0)return {skip:true};
    const cand=CUR.shock.targets[0].plan.options[idx].apply.swapTo;
    applyShock(0,idx);
    const c=DB.clients.find(x=>x.id==='a1');
    const a=c.routines[0].exercises[0], b=c.routines[1].exercises[0];
    return {cand, a:{id:a.id,name:a.name,muscle:a.muscle,sets:a.sets,reps:a.reps}, b:{sets:b.sets,reps:b.reps,name:b.name}};})()`);
  check('S5 la variante hace swap de identidad en las 2 rutinas', !swap.skip && swap.a.id === swap.cand && swap.a.name !== 'Jalón al Pecho' && swap.b.name === swap.a.name, JSON.stringify(swap.a));
  check('S5b conserva sets/reps de CADA entrada (4×8 y 3×12)', swap.a.sets === 4 && swap.a.reps === 8 && swap.b.sets === 3 && swap.b.reps === 12, JSON.stringify([swap.a.sets + 'x' + swap.a.reps, swap.b.sets + 'x' + swap.b.reps]));
  check('S5c la variante es del mismo músculo', swap.a.muscle === 'espalda', swap.a.muscle);
  await ev(`(()=>{const el=document.getElementById('coach-chat');if(el)el.classList.remove('on');})()`);

  // ── S6: "Descartar" silencia y no reaparece al reabrir ──
  await ev(fixture());
  await sleep(300);
  const dism = await evj(`(()=>{
    document.querySelector('#d-shock button[onclick*="dismissShock"]').click();
    const c=DB.clients.find(x=>x.id==='a1');
    const after=(()=>{const el=document.getElementById('d-shock');return getComputedStyle(el).display;})();
    renderShockCard(c); // "reabrir" la ficha
    const reopen=getComputedStyle(document.getElementById('d-shock')).display;
    return {after, reopen, muted:!!localStorage.getItem('shockmute_a1_'+_norm('Jalón al Pecho')),
      routinesTocadas:c.routines[0].exercises[0].sets!==4};})()`);
  check('S6 Descartar oculta la tarjeta y silencia 21 días', dism.after === 'none' && dism.muted === true, JSON.stringify(dism));
  check('S6b al reabrir la ficha NO reaparece', dism.reopen === 'none', dism.reopen);
  check('S6c Descartar NO toca la rutina del asesorado', dism.routinesTocadas === false);

  // ── S7: XSS — nombre de ejercicio con payload NO ejecuta ──
  await ev(`window.__XSS=undefined`);
  await ev(`(()=>{try{
    const P='<img src=x onerror=window.__XSS=1>';
    const sess=${JSON.stringify(KG_MESETA)}.map((kg,i)=>({date:new Date(Date.now()-(${ST_N}-1-i)*3*86400000).toISOString(),
      exercises:[{name:P,muscle:'espalda',track:'peso_reps',sets:[{done:true,kg:String(kg),reps:'8'}]}]})).reverse();
    const c={id:'a1',name:'<b>XSS</b>',level:'Intermedio',days:3,tier:'premium',goal:'Ganar músculo',
      startDate:new Date(Date.now()-200*86400000).toISOString(),
      notes:'hernia lumbar "><script>window.__XSS=1</script>',
      payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:1}],
      routines:[{id:'r1',name:'R',restSec:60,exercises:[{id:'e0',name:P,muscle:'espalda',sets:4,reps:8}]}]};
    DB.clients=[c];DB.history={a1:sess};DB.prs={};
    for(let i=localStorage.length-1;i>=0;i--){const kk=localStorage.key(i);if(kk&&kk.indexOf('shockmute_')===0)localStorage.removeItem(kk);}
    renderShockCard(c);
  }catch(e){return 'err:'+e.message}})()`);
  await sleep(400);
  const xss = await ev(`window.__XSS`);
  s = await evj(shockCard);
  check('S7 XSS en nombre de ejercicio/notas NO ejecuta (esc)', !xss && s.shown, 'XSS=' + xss + ' shown=' + s.shown);
  check('S7b la limitación lumbar de las notas genera aviso', s.warns >= 1, 'warns=' + s.warns);

  // ── S8: determinismo — dos renders seguidos dan el mismo DOM ──
  await ev(fixture());
  await sleep(300);
  const d1 = await ev(`(renderShockCard(DB.clients[0]),document.getElementById('d-shock').innerHTML)`);
  const d2 = await ev(`(renderShockCard(DB.clients[0]),document.getElementById('d-shock').innerHTML)`);
  check('S8 determinista: dos renders → mismo DOM', d1 === d2 && (d1 || '').length > 100, 'iguales=' + (d1 === d2));

  // ── S9: sin estancamiento → la tarjeta no existe ──
  const sin = await evj(`(()=>{
    const c=DB.clients[0];
    DB.history={a1:${JSON.stringify(stKgs(62,60,70))}.map((kg,i)=>({date:new Date(Date.now()-(${ST_N}-1-i)*3*86400000).toISOString(),
      exercises:[{name:'Jalón al Pecho',muscle:'espalda',track:'peso_reps',sets:[{done:true,kg:String(kg),reps:'8'}]}]})).reverse()};
    renderShockCard(c);
    return {display:getComputedStyle(document.getElementById('d-shock')).display, shock:CUR.shock};})()`);
  check('S9 si el asesorado progresa → sin tarjeta (no inventa mesetas)', sin.display === 'none' && !sin.shock, JSON.stringify(sin));

  // ══════════════ FASE 4.1 — MÚLTIPLES ESTANCAMIENTOS ══════════════
  // ── S10: 2 del MISMO músculo → 1 sección + nota "también se plantó" (gana el más clavado) ──
  const s10 = await ev(multiFixture([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA }, // solo meseta
    { name: 'Remo con Barra', muscle: 'espalda', kgs: KG_CAIDA }, // en CAÍDA = más clavado → gana
  ]));
  if (s10 !== true) throw new Error('S10 setup: ' + s10);
  await sleep(400);
  s = await evj(shockCard);
  await shot('S10-mismo-musculo');
  const s10win = await ev(`(()=>{const t=(CUR.shock&&CUR.shock.targets)||[];return t.length===1?t[0].exName:('n='+t.length);})()`);
  check('S10 mismo músculo → 1 sola sección', s.shown && s.sections === 1, 'sections=' + s.sections);
  check('S10b ataca el más plantado (Remo), el otro en la nota', s10win === 'Remo con Barra' && /jal[oó]n al pecho.*tambi[eé]n se plant/i.test(s.text.replace(/\n/g, ' ')), 'win=' + s10win);

  // ── S11: 2 músculos DISTINTOS → 2 secciones; aplicar la 1ª NO oculta la 2ª ──
  const s11 = await ev(multiFixture([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_CAIDA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
  ]));
  if (s11 !== true) throw new Error('S11 setup: ' + s11);
  await sleep(400);
  s = await evj(shockCard);
  await shot('S11-dos-musculos');
  check('S11 dos músculos → 2 secciones (en paralelo)', s.shown && s.sections === 2, 'sections=' + s.sections);
  // Aplica la opción "remonta" del PRIMER target y comprueba que el segundo SIGUE visible.
  const s11b = await evj(`(()=>{
    const t0=CUR.shock.targets[0].exName, t1=CUR.shock.targets[1].exName;
    const oi=CUR.shock.targets[0].plan.options.findIndex(o=>o.id==='remonta');
    applyShock(0,oi);
    const el=document.getElementById('coach-chat'); if(el)el.classList.remove('on');
    const sec=(CUR.shock&&CUR.shock.targets||[]).map(x=>x.exName);
    return {t0,t1,shownAfter:getComputedStyle(document.getElementById('d-shock')).display!=='none',remaining:sec};})()`);
  check('S11b aplicar el 1º NO oculta el 2º (recuperación independiente)', s11b.shownAfter && s11b.remaining.length === 1 && s11b.remaining[0] === s11b.t1, JSON.stringify(s11b.remaining));

  // ── S12 (CANDADO GLOBAL): 3 estancados ENTRENANDO PAREJO (spacing 3 = cadencia alta) → tarjeta
  // global SIN Aplicar de protocolo + CTA descarga ──
  const s12 = await ev(multiFixture([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_CAIDA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
    { name: 'Sentadilla', muscle: 'pierna', kgs: KG_CAIDA },
  ], 3));
  if (s12 !== true) throw new Error('S12 setup: ' + s12);
  await sleep(400);
  s = await evj(shockCard);
  await shot('S12-global');
  const s12mode = await ev(`(CUR.shock&&CUR.shock.mode)||'?'`);
  check('S12 3+ estancados → modo global (fatiga sistémica)', s12mode === 'global', 'mode=' + s12mode);
  check('S12b la tarjeta NO ofrece protocolos por ejercicio (0 botones Aplicar)', s.shown && s.opts === 0, 'opts=' + s.opts);
  check('S12c ofrece la CTA de semana de descarga (y NO es rebuild)', s.deload === true && s.rebuild === false && /descarga/i.test(s.text), 'deload=' + s.deload + ' rebuild=' + s.rebuild);
  // Click real en "Generar semana de descarga" → abre m-gen con #mg-deload marcado.
  const s12d = await evj(`(()=>{
    document.querySelector('#d-shock button[onclick*="shockDeload"]').click();
    const mg=document.getElementById('m-gen');
    return {gopen:!!(mg&&mg.classList.contains('on')), deloadChk:!!(document.getElementById('mg-deload')||{}).checked, curDeload:!!CUR.genDeload};})()`);
  check('🔒 S12d el click abre el generador (m-gen) con la descarga marcada', s12d.gopen && s12d.deloadChk && s12d.curDeload, JSON.stringify(s12d));
  await shot('S12-gen-deload');
  await ev(`(()=>{const m=document.getElementById('m-gen');if(m)m.classList.remove('on');})()`);

  // ── S13: mute independiente — silenciar (aplicar) el target 1 deja visible el 2 al re-render ──
  const s13 = await ev(multiFixture([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_CAIDA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
  ]));
  if (s13 !== true) throw new Error('S13 setup: ' + s13);
  await sleep(400);
  const s13r = await evj(`(()=>{
    const t0=CUR.shock.targets[0].exName;
    // Mutea SOLO el primero por su clave de ejercicio y re-renderiza (sin tocar el segundo).
    localStorage.setItem('shockmute_a1_'+_norm(t0),String(Date.now()+21*86400000));
    renderShockCard(DB.clients[0]);
    const t=(CUR.shock&&CUR.shock.targets||[]).map(x=>x.exName);
    return {t0, shown:getComputedStyle(document.getElementById('d-shock')).display!=='none', remaining:t};})()`);
  check('S13 mutear un target deja VISIBLE el otro (mute por ejercicio)', s13r.shown && s13r.remaining.length === 1 && s13r.remaining[0] !== s13r.t0, JSON.stringify(s13r.remaining));

  // ── S14 (CANDADO CONSTANCIA): 3 estancados pero A SALTOS (spacing 8 = cadencia baja) → REBUILD,
  // NO descarga. La descarga a quien ya entrena poco es el consejo equivocado (caso real de Astrid). ──
  const s14 = await ev(multiFixture([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_CAIDA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
    { name: 'Sentadilla', muscle: 'pierna', kgs: KG_CAIDA },
  ], 8));
  if (s14 !== true) throw new Error('S14 setup: ' + s14);
  await sleep(400);
  s = await evj(shockCard);
  await shot('S14-rebuild');
  const s14mode = await ev(`(CUR.shock&&CUR.shock.mode)||'?'`);
  check('🔒 S14 3+ estancados a saltos → modo rebuild (no fatiga, es por faltas)', s14mode === 'rebuild', 'mode=' + s14mode);
  check('🔒 S14b NO ofrece descarga ni protocolos (0 Aplicar, 0 deload)', s.shown && s.opts === 0 && s.deload === false, 'opts=' + s.opts + ' deload=' + s.deload);
  check('S14c habla de recuperar el ritmo / constancia', s.rebuild === true && /(ritmo|constancia|saltos)/i.test(s.text), s.text.replace(/\n/g, ' ').slice(0, 90));
  check('S14c2 muestra la CIFRA de cadencia (~X de sus 3 días por semana)', /de sus 3 d[ií]as por semana/i.test(s.text) && /~\s*\d/.test(s.text), (s.text.match(/viene entrenando[^)]*\)/i) || [''])[0]);
  // Escribirle desde el rebuild → chat prellenado sobre volver al ritmo, sin tocar la rutina.
  const s14d = await evj(`(()=>{
    document.querySelector('#d-shock button[onclick*="shockWriteRebuild"]').click();
    const ta=document.getElementById('cchat-in');
    const c=DB.clients.find(x=>x.id==='a1');
    const routTocada=c.routines[0].exercises[0].sets!==4;
    const el=document.getElementById('coach-chat'); const open=!!(el&&el.classList.contains('on'));
    return {val:ta?ta.value:'', open, msgs:((DB.msgs&&DB.msgs.a1)||[]).length, routTocada};})()`);
  check('🔒 S14d Escribirle prellena (voz coach) SIN enviar ni tocar la rutina', s14d.open && s14d.val.length > 20 && s14d.msgs === 0 && s14d.routTocada === false, JSON.stringify({ len: s14d.val.length, msgs: s14d.msgs, rout: s14d.routTocada }));
  await ev(`(()=>{const el=document.getElementById('coach-chat');if(el)el.classList.remove('on');})()`);

  // ── S15 (CANDADO RETORNANTE): meseta VIEJA (>4 semanas) + esta semana DENSA → rebuild, NO descarga.
  // La 1ª semana de vuelta no cuenta: sin el candado, la semana densa inflaría la cadencia → descarga
  // falsa a quien apenas volvió. Historial con offsets a medida (3 viejos >28d + 3 de esta semana). ──
  const s15 = await ev(`(()=>{try{
    ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
    const K=${JSON.stringify(KG_CAIDA)};
    const specs=[{name:'Jalón al Pecho',muscle:'espalda',kgs:K},
      {name:'Press Banca',muscle:'pecho',kgs:K},{name:'Sentadilla',muscle:'pierna',kgs:K}];
    // viejo→nuevo: ${ST_N - 3} sesiones de hace >4 semanas + 3 de esta semana
    const offs=Array.from({length:${ST_N - 3}},(_,k)=>35+(${ST_N - 4}-k)*3).concat([5,3,1]);
    const sess=offs.map((off,k)=>({date:new Date(Date.now()-off*86400000).toISOString(),routineName:'R',
      exercises:specs.map(s=>({name:s.name,muscle:s.muscle,track:'peso_reps',sets:[{done:true,kg:String(s.kgs[k]),reps:'8'}]}))})).reverse();
    const c={id:'a1',name:'Retornante Prueba',level:'Intermedio',days:3,tier:'premium',goal:'Ganar músculo',notes:'',
      startDate:new Date(Date.now()-200*86400000).toISOString(),
      payments:[{date:'2026-06-15',dueDate:'2026-09-01',amount:1}],
      routines:[{id:'r1',name:'R',day:'Lunes',restSec:60,exercises:specs.map((s,i)=>({id:'e'+i,name:s.name,muscle:s.muscle,sets:4,reps:8,restSec:90}))},
        {id:'r2',name:'B',day:'Miércoles',restSec:60,exercises:[]},{id:'r3',name:'C',day:'Viernes',restSec:60,exercises:[]}]};
    DB.clients=[c];DB.history={a1:sess};DB.prs={};DB.msgs={};
    for(let i=localStorage.length-1;i>=0;i--){const kk=localStorage.key(i);if(kk&&kk.indexOf('shockmute_')===0)localStorage.removeItem(kk);}
    window.CUR=window.CUR||{};CUR.loggedAs='coach';showScreen('s-coach');gp('p-detail',null,'Detalle',true);CUR.clientId=c.id;
    renderShockCard(c);return true;}catch(e){return 'err:'+e.message}})()`);
  if (s15 !== true) throw new Error('S15 setup: ' + s15);
  await sleep(400);
  s = await evj(shockCard);
  await shot('S15-retornante');
  const s15mode = await ev(`(CUR.shock&&CUR.shock.mode)||'?'`);
  check('🔒 S15 retornante (vuelve denso su 1ª semana) → rebuild, NO descarga', s15mode === 'rebuild' && s.deload === false && s.opts === 0, 'mode=' + s15mode + ' deload=' + s.deload);
  check('S15b la tarjeta no miente con "~0": frase digna cuando casi no entrenó antes', s.rebuild === true && /(casi no entren|no ha venido entrenando parejo)/i.test(s.text), (s.text.match(/casi no[^.]*\.|viene entrenando[^)]*\)/i) || [''])[0]);

  // ── S16 (CANDADO DE LAURA, v433): con DOLOR reciente la tarjeta NUNCA ofrece rehacer la semana.
  // `shockTargets` era ciega al dolor mientras `shockPlan` sí lo miraba — y esta es la que
  // reescribe la rutina entera. Mismo historial que S12 (que sí daba descarga), solo cambia el dolor. ──
  const s16 = await ev(multiFixture([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_CAIDA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
    { name: 'Sentadilla', muscle: 'pierna', kgs: KG_CAIDA },
  ], 3, 2, `c.painCare=[{area:'zona lumbar',at:new Date(Date.now()-2*86400000).toISOString()}];`));
  if (s16 !== true) throw new Error('S16 setup: ' + s16);
  await sleep(400);
  s = await evj(shockCard);
  await shot('S16-dolor-sin-descarga');
  const s16mode = await ev(`(CUR.shock&&CUR.shock.mode)||'?'`);
  check('🔒 S16 con dolor reciente NO se ofrece la semana de descarga (Laura)', s16mode !== 'global' && s.deload === false, 'mode=' + s16mode + ' deload=' + s.deload);
  check('S16b sigue proponiendo trabajo por ejercicio (no se calla del todo)', s.shown && s.opts > 0, 'shown=' + s.shown + ' opts=' + s.opts);

  // ── Shots ambos temas ──
  await ev(fixture());
  await sleep(300);
  await ev(`(()=>{gp('p-detail',null,'Detalle',true);document.getElementById('s-coach').scrollTop=0;
    const el=document.getElementById('d-shock'); if(el)el.scrollIntoView();})()`);
  await sleep(400);
  await setTheme('light'); await shot('shock-light');
  await setTheme('dark'); await shot('shock-dark');

  log('\njsErrors: ' + JSON.stringify(jsErrors));
  log('shots en: ' + OUT);
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log('\n' + (fails === 0 && jsErrors.length === 0 ? 'TODO OK' : fails + ' FALLA(S)' + (jsErrors.length ? ' + ' + jsErrors.length + ' jsError(s)' : '')));
  process.exitCode = (fails === 0 && jsErrors.length === 0) ? 0 : 1;
} catch (e) {
  log('ERROR: ' + (e && e.message));
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
