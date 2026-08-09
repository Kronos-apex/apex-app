// Verificación E2E del COACH INTELIGENTE (v352). Login real con la cuenta QA (qa-harness);
// el sello v298 (cloudWriteSealed) corta toda escritura a la nube en localhost, así que mutar
// DB.history/DB.prs/tier en memoria JAMÁS toca producción. Congelamos el poll (UD.loadOwn stub)
// para que la nube no repueble DB a mitad de corrida (gotcha v347). Cubre Capa A (bienestar por
// ánimo) y Capa B (tarjeta de insight: récord/racha/inactividad/estancamiento, prioridad, mute,
// free/premium, orden en descanso). Shots de la tarjeta y el banner en AMBOS temas.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8781;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-coach-' + Date.now();
const OUT = process.env.COACH_OUT || (process.env.TEMP + '/avi-coach');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9281', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9281/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };
async function shot(name) { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); } catch (e) { log('  (shot ' + name + ' falló: ' + e.message + ')'); } }
async function setTheme(t) { await ev(`document.documentElement.setAttribute('data-theme','${t}')`); await sleep(150); }

try {
  // ── login QA ──
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none'&&CUR&&CUR.clientId)})()`);
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~2-3 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  // Congelar el poll y darle al cliente QA una rutina para HOY (para poder ejercitar el check-in).
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const hoy=dias[new Date().getDay()];
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    window.__C=c; window.__CID=c.id;
    c.tier=undefined; // arranca como asesorado de coach (acceso completo)
    c.level='Intermedio'; c.days=3;
    c.routines=[{id:'rHoy',name:'Full Body',day:hoy,restSec:60,exercises:[
      {name:'Sentadilla',muscle:'piernas',type:'Compuesto',track:'peso_reps',sets:4,reps:10},
      {name:'Press de Banca',muscle:'pecho',type:'Compuesto',track:'peso_reps',sets:4,reps:10}]}];
    // Regla 6 (v353): silenciar el tour de novedades ANTES del PRIMER shot (lección del shot E
    // tapado en v352) — ax_news_seen al máximo + ocultar el overlay si ya apareció.
    localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
    const nt=document.getElementById('news-tour');if(nt)nt.classList.add('hidden');
  })()`);
  await sleep(300);

  // 🔴 CONTROL DEL MONTAJE (v467). Este harness llevaba en rojo desde v448 con `care:false`, y la
  // causa era suya: el bloque «Para cuidarte hoy» se pinta DENTRO del modo guiado
  // (`app-6-extra`), y aquí solo se renderizaba «Hoy» — que desde v447 colapsa el entreno en una
  // tarjeta de arranque. El motor estaba bien todo este tiempo; fallaba la sonda.
  // Sin este control, un fixture que deja de montar vuelve a parecer un defecto de la app.
  {
    const abre = await ev(`(()=>{try{const c=window.__C;const r=(c.routines||[]).find(x=>x.id==='rHoy');
      return typeof openGuidedEmbedded==='function' ? !!openGuidedEmbedded(r) : false;}catch(e){return 'ERR '+(e&&e.message)}})()`);
    await sleep(400);
    check('A0 el modo guiado ABRE (control del montaje)', abre === true, 'openGuidedEmbedded=' + abre);
  }

  // ═══════════ CAPA A — bienestar por ánimo ═══════════
  // A1: ánimo "cansado" → el banner muestra "Para cuidarte hoy" con ≥2 consejos.
  await ev(`(()=>{const c=window.__C;setTodayMood(c.id,'cansado');renderClientToday(c);`+
  `const r=(c.routines||[]).find(x=>x.id==='rHoy'); if(typeof openGuidedEmbedded==='function')openGuidedEmbedded(r);})()`);
  await sleep(500);
  // OJO: innerText en Chrome aplica text-transform → el header sale en MAYÚSCULAS ("PARA CUIDARTE
  // HOY"). Comparamos case-insensitive; los consejos (sin transform) van tal cual.
  let s = JSON.parse(await ev(`JSON.stringify((()=>{const t=(document.getElementById('cn-today')||{}).innerText||'';
    const care=/para cuidarte hoy/i.test(t);
    const lines=['Duerme','carbohidratos','amable'].filter(w=>t.includes(w)).length;
    return {care,lines};})())`));
  await shot('A1-mood-cansado-care');
  check('A1 ánimo cansado → bloque "Para cuidarte hoy" con ≥2 consejos en el DOM', s.care && s.lines >= 2, JSON.stringify(s));

  // A2: ánimo "dolor" → el consejo de SEGURIDAD (empuja a PARAR) aparece.
  await ev(`(()=>{const c=window.__C;setTodayMood(c.id,'dolor');renderClientToday(c);`+
  `const r=(c.routines||[]).find(x=>x.id==='rHoy'); if(typeof openGuidedEmbedded==='function')openGuidedEmbedded(r);})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const t=(document.getElementById('cn-today')||{}).innerText||'';
    return {care:/para cuidarte hoy/i.test(t),para:/si algo duele de verdad, para/i.test(t)};})())`));
  check('A2 ánimo dolor → consejo de seguridad "para" presente', s.care && s.para, JSON.stringify(s));
  await ev(`(()=>{clearTodayMood(window.__CID);})()`);

  // ═══════════ CAPA B — tarjeta del coach ═══════════
  // Helper para inyectar historial/prs y renderizar SOLO la tarjeta.
  const inject = `(cfg)=>{const c=window.__C;
    DB.history[c.id]=cfg.sessions||[]; DB.prs[c.id]=cfg.prs||{}; DB.bodyweight[c.id]=cfg.bw||[];
    if(cfg.tier!==undefined)c.tier=cfg.tier; else c.tier=undefined;
    c.days=cfg.days||3;
    if(cfg.goal!==undefined)c.goal=cfg.goal;
    if(cfg.startDate!==undefined)c.startDate=cfg.startDate; else delete c.startDate;
    if(cfg.level!==undefined)c.level=cfg.level;
    c.habits=cfg.habits||{};
    if(cfg.clearRoutines)c.routines=[];
    Object.keys(window.__mutes||{}).forEach(k=>localStorage.removeItem('coachmute_'+c.id+'_'+k));
    renderCoachCard(c);
    const card=document.querySelector('#cn-coach-card [data-insight]');
    return {type:card?card.getAttribute('data-insight'):null,
      title:card?(card.querySelector('div div div')||{}).textContent:'',
      html:card?card.outerHTML.length:0,
      hasCta:!!(card&&card.querySelector('.bp'))};}`;
  await ev(`window.__inject=${inject};window.__mutes={inactivo:1,record:1,racha:1,estancado:1,adaptacion:1,deload:1,peso:1,agua:1};`);
  const sess = `(offDays)=>({date:new Date(Date.now()-offDays*86400000).toISOString(),exercises:[{name:'X',track:'reps',sets:[{done:true,reps:'15'}]}]})`;
  await ev(`window.__sess=${sess};`);

  // B: récord reciente (PR en 48h) → tarjeta type=record con el nombre del ejercicio.
  s = JSON.parse(await ev(`JSON.stringify(window.__inject({
    sessions:[window.__sess(0)],
    prs:{k1:{val:120,unit:'kg',name:'Sentadilla',date:new Date(Date.now()-3600000).toISOString()}}}))`));
  await shot('B-record');
  check('B récord reciente → tarjeta type=record con "Sentadilla" en el título', s.type === 'record' && /Sentadilla/.test(s.title || ''), JSON.stringify(s));

  // B-XSS: nombre de PR con payload → NO ejecuta (esc). window.__XSS queda undefined.
  await ev(`window.__XSS=undefined;`);
  s = JSON.parse(await ev(`JSON.stringify(window.__inject({
    sessions:[window.__sess(0)],
    prs:{k1:{val:50,unit:'kg',name:'<img src=x onerror=window.__XSS=1>',date:new Date(Date.now()-3600000).toISOString()}}}))`));
  await sleep(300);
  const xss = await ev(`window.__XSS`);
  check('B-XSS payload en el nombre del PR NO ejecuta (esc en el título)', s.type === 'record' && !xss, 'XSS=' + xss);

  // C: inactividad (última sesión hace 6 días) + varias semanas con historial → gana inactivo
  // (prioridad sobre la racha). Todas las sesiones ≥6 días atrás → dsls=6 dispara inactivo.
  s = JSON.parse(await ev(`JSON.stringify(window.__inject({
    sessions:[window.__sess(6),window.__sess(8),window.__sess(13),window.__sess(15),window.__sess(20),window.__sess(22)],
    prs:{}}))`));
  await shot('C-inactivo');
  check('C inactivo (6 días) gana la prioridad', s.type === 'inactivo', JSON.stringify(s));

  // D: "Entendido" silencia el insight → desaparece y no vuelve en el re-render; aparece el siguiente.
  await ev(`(()=>{const c=window.__C;
    DB.history[c.id]=[window.__sess(6)]; // inactivo
    DB.prs[c.id]={k1:{val:100,unit:'kg',name:'Press',date:new Date(Date.now()-3600000).toISOString()}}; // record (2ª señal)
    ['inactivo','record'].forEach(k=>localStorage.removeItem('coachmute_'+c.id+'_'+k));
    renderCoachCard(c);})()`);
  let d0 = await ev(`(document.querySelector('#cn-coach-card [data-insight]')||{}).getAttribute&&document.querySelector('#cn-coach-card [data-insight]').getAttribute('data-insight')`);
  await ev(`dismissCoachInsight('inactivo')`);
  await sleep(200);
  let d1 = await ev(`(()=>{const el=document.querySelector('#cn-coach-card [data-insight]');return el?el.getAttribute('data-insight'):null;})()`);
  // re-render: inactivo NO vuelve (muted); queda record.
  await ev(`renderCoachCard(window.__C)`);
  await sleep(150);
  let d2 = await ev(`(()=>{const el=document.querySelector('#cn-coach-card [data-insight]');return el?el.getAttribute('data-insight'):null;})()`);
  check('D "Entendido" silencia inactivo → aparece la 2ª señal (record) y no reaparece inactivo', d0 === 'inactivo' && d1 === 'record' && d2 === 'record', JSON.stringify({ d0, d1, d2 }));
  await ev(`(()=>{['inactivo','record'].forEach(k=>localStorage.removeItem('coachmute_'+window.__CID+'_'+k));})()`);

  // E (v433): a la asesorada NUNCA se le dice que se estancó. La tarjeta se ELIMINÓ (decisión del
  // PO + petición de Valery: ni la palabra ni el CTA «hablar con tu coach»). El aviso es del coach.
  // Fixture con un estancamiento REAL y evaluable: 25 sesiones en ~10 semanas, techo en la 2ª.
  const stall = `(()=>{const k=Array.from({length:25},(_,i)=>i===1?62:(i>=13?60:61));
    return k.map((kg,i)=>({date:new Date(Date.now()-(24-i)*3*86400000).toISOString(),
      exercises:[{name:'Press',muscle:'pecho',track:'peso_reps',sets:[{done:true,kg:String(kg),reps:'8'}]}]})).reverse();})()`;
  await ev(`window.__stall=${stall};`);
  // planDays lee c.routines PRIMERO; con la rutina de hoy (day real) target=1 y la racha taparía
  // la señal. Vaciamos routines → planDays cae a c.days=7 → weekStreak nunca cumple → aísla.
  const rutBak = await ev(`(()=>{const b=window.__C.routines;window.__C.routines=[];return JSON.stringify(b);})()`);
  const eReal = await ev(`(()=>{const c=window.__C;const l=c.level;c.level='Intermedio';
    const n=(typeof stalledExercises==='function')?stalledExercises(c,window.__stall,Date.now()).length:-1;c.level=l;return n;})()`);
  let ePrem = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:window.__stall,prs:{},tier:undefined,days:7,level:'Intermedio'}))`));
  let eFree = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:window.__stall,prs:{},tier:'libre',days:7,level:'Intermedio'}))`));
  await shot('E-sin-estancado');
  check('🔒 E el estancamiento EXISTE en el motor (control: si no, este check no prueba nada)', eReal >= 1, 'estancados=' + eReal);
  check('🔒 E v433: a la asesorada NO se le pinta ninguna tarjeta de estancamiento', ePrem.type !== 'estancado' && eFree.type !== 'estancado', JSON.stringify({ ePrem: ePrem.type, eFree: eFree.type }));
  await ev(`window.__C.tier=undefined;window.__C.routines=${JSON.stringify(rutBak)}?JSON.parse(${JSON.stringify(rutBak)}):[];`);

  // ═══════════ FASE 3 — señales nuevas (v353) ═══════════
  // Fixture de 4 semanas de plan cumplidas, ROBUSTO al día de la semana: 2 sesiones por cada una
  // de las últimas 4 semanas de calendario (ancladas al lunes de cada semana). clearRoutines +
  // days:2 → planDays cae a 2 → weekStreak cuenta 4 semanas.
  // v433: la tarjeta de descarga pasa por los MISMOS pisos que la del coach (180 días entrenando
  // + 10 semanas de datos), así que el fixture añade una sesión vieja y `startDate` de hace 200 días.
  await ev(`window.__wk4=(()=>{const x=new Date();x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));const mon=x.getTime();const out=[];for(let i=0;i<4;i++){[0,2].forEach(d=>out.push({date:new Date(mon-i*7*86400000+d*86400000).toISOString(),exercises:[{name:'A',track:'reps',sets:[{done:true,reps:'15'}]}]}));}out.push({date:new Date(mon-75*86400000).toISOString(),exercises:[{name:'A',track:'reps',sets:[{done:true,reps:'15'}]}]});return out;})();
    window.__vet=new Date(Date.now()-200*86400000).toISOString();`);
  // G: deload → premium con ≥4 semanas; free ve racha (deload es premium).
  let gPrem = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:window.__wk4,prs:{},tier:undefined,days:2,clearRoutines:true,startDate:window.__vet}))`));
  let gFree = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:window.__wk4,prs:{},tier:'libre',days:2,clearRoutines:true,startDate:window.__vet}))`));
  await shot('G-deload-premium');
  check('G deload: premium ve type=deload (con CTA); free ve racha', gPrem.type === 'deload' && gPrem.hasCta && gFree.type === 'racha', JSON.stringify({ gPrem: gPrem.type, gFree: gFree.type }));

  // H: agua → para TODOS con ≥3 días registrados y casi nunca cumplida (HOY excluido).
  await ev(`window.__habitsLow=(()=>{const w={};[1,2,3,4].forEach(o=>{w[habitDayKey(new Date(Date.now()-o*86400000))]=2;});return {water:w};})();`);
  let hAgua = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:[window.__sess(0)],prs:{},habits:window.__habitsLow,tier:undefined,days:3,clearRoutines:true}))`));
  await shot('H-agua');
  let hNone = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:[window.__sess(0)],prs:{},habits:{water:{}},tier:undefined,days:3,clearRoutines:true}))`));
  check('H agua: 4 días flojos → type=agua; sin registros → NO regaña (null)', hAgua.type === 'agua' && hNone.type === null, JSON.stringify({ hAgua: hAgua.type, hNone: hNone.type }));

  // I: peso → premium, objetivo bajar + pérdida dispara; subida (contrario) SILENCIO.
  await ev(`window.__bwDown=[{date:new Date(Date.now()-30*86400000).toISOString(),kg:80},{date:new Date(Date.now()-15*86400000).toISOString(),kg:79},{date:new Date(Date.now()-86400000).toISOString(),kg:78.6}];window.__bwUp=[{date:new Date(Date.now()-30*86400000).toISOString(),kg:78},{date:new Date(Date.now()-15*86400000).toISOString(),kg:79},{date:new Date(Date.now()-86400000).toISOString(),kg:79.4}];`);
  let iPos = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:[window.__sess(0)],prs:{},bw:window.__bwDown,goal:'perder grasa',tier:undefined,days:3,clearRoutines:true}))`));
  let iNeg = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:[window.__sess(0)],prs:{},bw:window.__bwUp,goal:'perder grasa',tier:undefined,days:3,clearRoutines:true}))`));
  check('I peso: baja con objetivo bajar → type=peso; sube (contrario) → NUNCA peso', iPos.type === 'peso' && iNeg.type !== 'peso', JSON.stringify({ iPos: iPos.type, iNeg: iNeg.type }));

  // J: prioridad deload > record (ambos presentes → gana deload).
  let jP = JSON.parse(await ev(`JSON.stringify(window.__inject({sessions:window.__wk4,prs:{k:{val:100,unit:'kg',name:'X',date:new Date(Date.now()-3600000).toISOString()}},tier:undefined,days:2,clearRoutines:true,startDate:window.__vet}))`));
  check('J prioridad: deload gana a record', jP.type === 'deload', JSON.stringify(jP));
  await ev(`window.__C.goal='';DB.bodyweight[window.__CID]=[];`);

  // F: día de DESCANSO → la tarjeta sale ARRIBA (orden no-training de _todayOrder).
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=window.__C;
    const rutGuardadas=c.routines; c.routines=[]; // sin rutina hoy → descanso/preparación
    DB.history[c.id]=[window.__sess(6)]; DB.prs[c.id]={};
    ['inactivo'].forEach(k=>localStorage.removeItem('coachmute_'+c.id+'_'+k));
    renderClientToday(c);
    const panel=document.getElementById('cn-today');
    const kids=[...panel.children].map(e=>e.id);
    const iCard=kids.indexOf('cn-coach-card'), iBody=kids.indexOf('cn-today-body');
    c.routines=rutGuardadas;
    return {iCard,iBody,order:kids.join(',')};})())`));
  await shot('F-descanso-arriba');
  check('F descanso: #cn-coach-card sale ANTES de #cn-today-body', s.iCard >= 0 && s.iCard < s.iBody, JSON.stringify(s));

  // ── Shots de ambos temas de la tarjeta (récord) ──
  // Silenciar el tour de novedades (AVI_NEWS) para que no tape los shots.
  await ev(`(()=>{localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));try{if(typeof ntClose==='function')ntClose(false);}catch(e){}const nt=document.getElementById('news-tour');if(nt)nt.classList.add('hidden');})()`);
  await ev(`window.__inject({sessions:[window.__sess(0)],prs:{k1:{val:120,unit:'kg',name:'Sentadilla',date:new Date(Date.now()-3600000).toISOString()}}})`);
  await ev(`(()=>{const t=document.getElementById('cn-today');if(t)t.scrollTop=0;})()`);
  await setTheme('dark'); await shot('card-record-dark');
  await setTheme('light'); await shot('card-record-light');

  // Tarjetas deload y agua AISLADAS en overlay (el guiado las tapa en su sitio real): renderizamos
  // el insight en #cn-coach-card y levantamos su HTML a un overlay a pantalla completa para eyeball.
  const cardOverlay = `(cfg)=>{window.__inject(cfg);
    const card=document.querySelector('#cn-coach-card');
    const ov=document.createElement('div');ov.id='__cardov';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--bg);padding:60px 16px 0;overflow:auto';
    ov.innerHTML=card?card.innerHTML:'(sin tarjeta)';
    document.body.appendChild(ov);}`;
  await ev(`window.__cardOverlay=${cardOverlay};`);
  const clearOverlay = `(()=>{const o=document.getElementById('__cardov');if(o)o.remove();})()`;
  // deload (premium, 4 semanas)
  await ev(`window.__cardOverlay({sessions:window.__wk4,prs:{},tier:undefined,days:2,clearRoutines:true})`);
  await setTheme('light'); await shot('card-deload-light');
  await setTheme('dark'); await shot('card-deload-dark');
  await ev(clearOverlay);
  // agua (para todos)
  await ev(`window.__cardOverlay({sessions:[window.__sess(0)],prs:{},habits:window.__habitsLow,tier:undefined,days:3,clearRoutines:true})`);
  await setTheme('light'); await shot('card-agua-light');
  await setTheme('dark'); await shot('card-agua-dark');
  await ev(clearOverlay);
  await ev(`window.__C.goal='';DB.bodyweight[window.__CID]=[];window.__C.habits={};`);

  // banner de ánimo ambos temas
  await ev(`(()=>{const c=window.__C;const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];c.routines=[{id:'rHoy',name:'FB',day:dias[new Date().getDay()],restSec:60,exercises:[{name:'Sentadilla',muscle:'piernas',type:'Compuesto',track:'peso_reps',sets:4,reps:10}]}];setTodayMood(c.id,'cansado');renderClientToday(c);const nt=document.getElementById('news-tour');if(nt)nt.classList.add('hidden');const t=document.getElementById('cn-today');if(t)t.scrollTop=0;})()`);
  await sleep(400);
  await setTheme('dark'); await shot('mood-care-dark');
  await setTheme('light'); await shot('mood-care-light');
  await ev(`clearTodayMood(window.__CID)`);

  // Banner de ánimo STANDALONE (para eyeball del bloque "Para cuidarte hoy" sin el guiado encima):
  // overlay a pantalla completa con moodBannerHtml('cansado') aislado, con el fondo real de la app.
  await ev(`(()=>{const a=applyMood({exercises:[]}, 'cansado', {});
    const ov=document.createElement('div');ov.id='__bnrov';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--bg);padding:60px 16px 0;overflow:auto';
    ov.innerHTML=moodBannerHtml(a.adapt,'changeMood');
    document.body.appendChild(ov);})()`);
  await sleep(200);
  await setTheme('light'); await shot('mood-banner-standalone-light');
  await setTheme('dark'); await shot('mood-banner-standalone-dark');
  await ev(`(()=>{const o=document.getElementById('__bnrov');if(o)o.remove();})()`);

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
