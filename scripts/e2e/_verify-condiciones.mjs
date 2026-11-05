// _verify-condiciones.mjs — LAS CONDICIONES EN LA APP MONTADA (v727).
//
// Abdomen y piso pélvico, salud ósea, presión arterial, embarazo y la alerta del corazón (dictámenes de Laura del
// 5-nov). La suite prueba las funciones; aquí se mira lo que VE cada quien:
//  (1) el coach, en la vista previa del generador (✨): el aviso de la condición con lo que tiene que preguntar, la
//      alerta del corazón en su PROPIO bloque aunque no haya limitación, y la frase de la hernia solo cuando toca;
//  (2) la persona que se registró sola, en «Rutinas»: la nota de su plan con su criterio de parar (embarazo);
//  (3) los rápidos con embarazo: «HIIT sin equipo» no se ofrece.
// CONTROL: sin nota, ni aviso de condición ni bloque del corazón. Capturas claro/oscuro y «Muy grande», MIRADAS.
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con personas INVENTADAS.
//   node scripts/e2e/_verify-condiciones.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8894, DBG = 9448;
const OUT = (process.env.COND_OUT || ((process.env.TEMP || '.') + '/avi-condiciones')).replace(/\\/g, '/');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/cond-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const foto = async nombre => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${nombre}.png`, Buffer.from(s.data, 'base64')); };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderGenPreview==='function' && typeof generarRutinas==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const TEMA = t => `(()=>{document.body.classList.toggle('dark',${t === 'oscuro'});document.documentElement.setAttribute('data-theme','${t === 'oscuro' ? 'dark' : 'light'}');return 1;})()`;
const TAMANO = fs => `(()=>{ ${fs ? `document.documentElement.setAttribute('data-fs','${fs}')` : `document.documentElement.removeAttribute('data-fs')`}; return 1; })()`;
const LIMPIAR = `(()=>{['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));{const r=document.getElementById('quickwo-room');if(r)r.classList.remove('on');}
  const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';return 1;})()`;

// ── (1) EL COACH: la vista previa del generador ─────────────────────────────────────────────────────
const PREVIEW = notas => `(()=>{try{
  const c={id:'qa-cond',name:'Prueba Condición',sex:'F',level:'Intermedio',goal:'Perder grasa',days:4,weight:64,height:160,age:31,place:'gym',
    notes:${JSON.stringify(notas)},painCare:[],createdAt:'2026-06-01T10:00:00.000Z',routines:[]};
  DB.clients=[c]; CUR.loggedAs='coach'; showScreen('s-coach');
  const res=generarRutinas(c,DB.exercises,{idFn:uid,seed:3});
  CUR.genDraft=res; renderGenPreview(c,res); om('m-gen');
  const b=document.getElementById('mg-body'); const W=innerWidth;
  const ids=res.routines.flatMap(r=>r.exercises.map(e=>e.id));
  return {ok:true,texto:b.textContent,
    card:/Valoración médica primero/.test(b.textContent),lim:/Limitación detectada/.test(b.textContent),
    ids,reps:res.routines.flatMap(r=>r.exercises).filter(e=>/^\\d+$/.test(String(e.reps))&&e.type!=='Cardio'&&e.type!=='HIIT').map(e=>+e.reps),
    fuera:[...b.querySelectorAll('div')].filter(d=>{const r=d.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>W+0.5);}).length};
}catch(e){return {ok:false,err:e.message};}})()`;

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(LIMPIAR); await ev(TEMA('claro'));
let s = await ev(PREVIEW(''));
check('CONTROL · sin nota: ni aviso de limitación ni bloque del corazón', s.ok && !s.lim && !s.card, JSON.stringify({ ok: s.ok, err: s.err, lim: s.lim, card: s.card }));
await ev(`cm('m-gen')`);

s = await ev(PREVIEW('estoy embarazada de 20 semanas'));
const PROHIBIDOS_EMB = ['e72', 'e42', 'e43', 'e73', 'e1', 'e71', 'e74', 'e83', 'e18', 'e17'];
check('embarazo: el coach ve «Limitación detectada (embarazo)», lo que debe preguntar y que NO es un plan de embarazo',
  s.ok && /Limitación detectada \(embarazo\)/.test(s.texto) && /NO es un plan de embarazo/.test(s.texto) && /pregúntale semanas/.test(s.texto)
  && !/abdomen y piso pélvico y embarazo/.test(s.texto), s.err || s.texto.slice(0, 160));
check('embarazo: el borrador no trae nada boca arriba, planchas ni HIIT, y nada baja de 8 repeticiones',
  s.ok && !s.ids.some(i => PROHIBIDOS_EMB.includes(i)) && s.reps.every(n => n >= 8) && s.ids.length >= 12,
  JSON.stringify({ malos: s.ids.filter(i => PROHIBIDOS_EMB.includes(i)), minReps: Math.min(...s.reps), n: s.ids.length }));
check('embarazo: nada se sale de los 360 px', s.fuera === 0, 'fuera=' + s.fuera);
await ev(`document.getElementById('mg-body').scrollTop=0`);
await foto('1-coach-embarazo-claro');
await ev(`cm('m-gen')`);

s = await ev(PREVIEW('a veces me desmayo y me falta el aire al subir escaleras'));
check('solo síntomas del corazón: bloque propio «Valoración médica primero», SIN aviso de limitación ni ejercicios quitados',
  s.ok && s.card && !s.lim && /profesional de la salud/.test(s.texto) && /No se quitó ningún ejercicio/.test(s.texto), s.err || s.texto.slice(0, 200));
await foto('2-coach-corazon-claro');
await ev(`cm('m-gen')`);

s = await ev(PREVIEW('hernia umbilical'));
check('hernia umbilical: zona lumbar + abdomen, y la frase de por qué aparece la zona lumbar',
  s.ok && /zona lumbar, abdomen y piso pélvico/.test(s.texto) && /no significa que tenga la espalda lastimada/.test(s.texto), s.err || s.texto.slice(0, 160));
await ev(`cm('m-gen')`);
s = await ev(PREVIEW('Hernia lumbar L5. Hernia umbilical'));
check('🔴 «hernia lumbar L5 + umbilical»: NO se le dice al coach que la espalda no está lastimada',
  s.ok && /abdomen y piso pélvico/.test(s.texto) && !/no significa que tenga la espalda lastimada/.test(s.texto), s.err || '');
await ev(`cm('m-gen')`);

// Oscuro y «Muy grande»: presión arterial + síntomas a la vez (los dos bloques).
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await ev(TEMA('oscuro')); await ev(TAMANO('xl'));
s = await ev(PREVIEW('tengo hipertension y a veces palpitaciones'));
check('oscuro + «Muy grande»: presión arterial y corazón, los dos bloques y nada fuera de pantalla',
  s.ok && s.card && s.lim && /presión arterial o corazón/.test(s.texto) && s.fuera === 0, JSON.stringify({ card: s.card, lim: s.lim, fuera: s.fuera }));
await ev(`document.getElementById('mg-body').scrollTop=0`);
await foto('3-coach-presion-corazon-oscuro-xl');
await ev(`cm('m-gen')`); await ev(TAMANO(''));

// ── (2) LA PERSONA QUE SE REGISTRÓ SOLA: la nota de su plan en «Rutinas» ─────────────────────────────
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(TEMA('claro')); await ev(LIMPIAR);
s = await ev(`(async()=>{try{
  const c={id:'qa-cond-cli',name:'Prueba Registro',sex:'F',level:'Principiante',goal:'Salud general',days:3,weight:62,height:158,age:29,place:'gym',
    selfReg:true,tier:'libre',notes:'estoy embarazada',painCare:[],createdAt:'2026-06-01T10:00:00.000Z',startDate:'2026-06-01',habits:{water:{},steps:{}}};
  const res=generarRutinas(c,DB.exercises,{idFn:uid,seed:5,audience:'client'});
  c.routines=res.routines; DB.clients=[c]; DB.history={}; CUR.clientId=c.id; CUR.loggedAs='client';
  showScreen('s-client'); const tabs=[...document.querySelectorAll('.cntab')];
  const t=tabs.find(x=>/rutina/i.test(x.textContent))||tabs[1]; cnTab('cn-routines',t,true);
  await new Promise(r=>setTimeout(r,600));
  const card=document.querySelector('#cn-routines .rc'); if(!card)return {ok:false,err:'sin tarjeta'};
  card.classList.add('open'); card.scrollIntoView({block:'start'}); await new Promise(r=>setTimeout(r,300));
  const nota=(card.querySelector('.rcbody')||{}).textContent||''; const W=innerWidth;
  return {ok:true,nota:nota.slice(0,1500),fuera:[...card.querySelectorAll('div')].filter(d=>{const r=d.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>W+0.5);}).length};
}catch(e){return {ok:false,err:e.message};}})()`);
check('la persona que se registró sola ve su aviso: visto bueno del médico u obstetra y las señales para parar',
  s.ok && /médico u obstetra/.test(s.nota) && /sangrado/.test(s.nota) && /se mueve menos/.test(s.nota) && !/molestia en/.test(s.nota) && s.fuera === 0,
  s.err || JSON.stringify({ fuera: s.fuera, nota: (s.nota || '').slice(0, 120) }));
await foto('4-cliente-nota-embarazo-claro');

// ── (3) los rápidos con embarazo ─────────────────────────────────────────────────────────────────────
s = await ev(`(async()=>{DB.history={'qa-cond-cli':[{id:'h1',sessionId:'s1',routineId:'x',routineName:'X',date:new Date(Date.now()-3*864e5).toISOString(),finishedAt:new Date(Date.now()-3*864e5).toISOString(),doneSets:1,totalSets:1,exercises:[]}]};
  openQuickWorkouts(); await new Promise(r=>setTimeout(r,450));
  const nombres=[...document.querySelectorAll('#quickwo-body .qw-card-nm')].map(x=>x.textContent);
  const nota=(document.querySelector('#quickwo-body .qw-fit-note')||{}).textContent||'';
  return {nombres,nota};})()`);
check('rápidos con embarazo: «HIIT sin equipo» y «Cardio Pliométrico» no se ofrecen, y la nota dice «tu embarazo»',
  !s.nombres.includes('HIIT sin equipo') && !s.nombres.includes('Cardio Pliométrico') && /tu embarazo\./.test(s.nota) && !/suelo pélvico y tu embarazo/.test(s.nota), JSON.stringify(s));
await foto('5-rapidos-embarazo-claro');

for (const r of results) console.log(r);
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log('capturas: ' + OUT);
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas === 0 && jsErrors.length === 0 ? `\nTODO OK (${results.length}/${results.length})` : `\n${fallas} FALLA(S)`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallas === 0 && jsErrors.length === 0 ? 0 : 1);
