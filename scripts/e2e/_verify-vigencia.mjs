// _verify-vigencia.mjs — LA VIGENCIA DE LAS CONDICIONES EN LA APP MONTADA (v728).
//
// Laura, 5-nov Q5: la condición NUNCA caduca sola, pero se revisa. La suite prueba las funciones; aquí se mira
// lo que VE y lo que HACE cada quien:
//  (1) el coach, en la ficha: «Revisar condición» con sus dos botones a los 90 días (abdomen), no a los 10;
//      sin fecha también; «Sigue vigente» renueva SOLO la fecha (la nota y las claves quedan iguales);
//      «Ya no aplica» abre la nota con el cursor en ella; guardar con las MISMAS condiciones no calla el aviso
//      y guardar con condiciones distintas, sí;
//  (2) la persona que se registró sola, en su Perfil: «¿Sigue igual?» sin nombrarle diagnósticos; «Cambió» le
//      deja el mensaje al coach en su hilo y el aviso, sin tocar su nota; «Sigue igual» también se va.
// CONTROLES: sin condición no hay aviso; a quien creó el coach no se le pregunta en su Perfil. Capturas claro,
// oscuro y «Muy grande», MIRADAS.
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con personas INVENTADAS.
//   node scripts/e2e/_verify-vigencia.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8895, DBG = 9449;
const OUT = (process.env.VIG_OUT || ((process.env.TEMP || '.') + '/avi-vigencia')).replace(/\\/g, '/');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/vig-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(300); } throw new Error('sin Chrome'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || '').slice(0, 200)); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const foto = async nombre => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${nombre}.png`, Buffer.from(s.data, 'base64')); };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof openDetail==='function' && typeof limitReview==='function' && typeof renderLimitReviewAsk==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const TEMA = t => `(()=>{document.body.classList.toggle('dark',${t === 'oscuro'});document.documentElement.setAttribute('data-theme','${t === 'oscuro' ? 'dark' : 'light'}');return 1;})()`;
const TAMANO = fs => `(()=>{ ${fs ? `document.documentElement.setAttribute('data-fs','${fs}')` : `document.documentElement.removeAttribute('data-fs')`}; return 1; })()`;
const LIMPIAR = `(()=>{['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));
  const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';return 1;})()`;
// El push al coach se ANOTA en vez de mandarse (sin red); así también se comprueba qué diría.
await ev(`(()=>{window._pushes=[];window.pushToClient=function(){window._pushes.push([...arguments]);return Promise.resolve();};return 1;})()`);
const HACE = d => `new Date(Date.now()-${d}*864e5).toISOString()`;
const FUERA = sel => `[...document.querySelectorAll('${sel} *')].filter(d=>{const r=d.getBoundingClientRect();return r.width>0&&(r.left<-0.5||r.right>innerWidth+0.5);}).length`;

// ── (1) EL COACH, EN LA FICHA ─────────────────────────────────────────────────────────────────────────
const FICHA = (notas, revisado, extra) => `(async()=>{try{
  const c=Object.assign({id:'qa-vig',name:'Prueba Vigencia',email:'qa-vigencia@example.com',sex:'F',level:'Intermedio',goal:'Perder grasa',days:4,
    weight:64,height:160,age:31,place:'gym',notes:${JSON.stringify(notas)},painCare:[],payments:[],routines:[],createdAt:'2026-01-10T10:00:00.000Z'},
    ${revisado ? `{limitReviewedAt:${revisado}}` : '{}'}, ${extra || '{}'});
  DB.clients=[c]; DB.msgs={}; CUR.loggedAs='coach'; showScreen('s-coach');
  await openDetail(c.id); await new Promise(r=>setTimeout(r,400));
  const box=document.querySelector('#d-notes .lim-rev');
  if(box) box.scrollIntoView({block:'center'});
  const bts=box?[...box.querySelectorAll('button')]:[];
  return {ok:true,hay:!!box,texto:box?box.textContent:'',botones:bts.map(b=>b.textContent.trim()),
    altos:bts.map(b=>Math.round(b.getBoundingClientRect().height)),fuera:${FUERA('#d-notes')}};
}catch(e){return {ok:false,err:e.message};}})()`;

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(LIMPIAR); await ev(TEMA('claro'));
let s = await ev(FICHA('postparto', HACE(10)));
check('CONTROL · revisada hace 10 días: la ficha NO pide revisar', s.ok && !s.hay, s.err || s.texto);
s = await ev(FICHA('me duele la rodilla', null));
check('CONTROL · una zona de dolor sin fecha no es una condición: no pide revisar', s.ok && !s.hay, s.err || s.texto);
s = await ev(FICHA('postparto', HACE(100)));
check('a los 100 días (abdomen, plazo 90): «Revisar condición» con el texto de Laura y sus dos botones',
  s.ok && s.hay && /Anotó una condición del abdomen o del suelo pélvico hace más de 90 días/.test(s.texto) && /médico o fisio/.test(s.texto)
  && s.botones.join('|') === 'Sigue vigente|Ya no aplica', s.err || JSON.stringify({ t: s.texto, b: s.botones }));
check('los botones miden 36 px o más y nada se sale de los 360 px', s.ok && s.altos.every(h => h >= 36) && s.fuera === 0, JSON.stringify({ altos: s.altos, fuera: s.fuera }));
await foto('1-coach-revisar-claro');

// «Sigue vigente» con clic real: renueva la fecha y NADA más.
s = await ev(`(async()=>{const c=DB.clients[0];const antes={notes:c.notes,keys:limitationsFor(c,Date.now()).keys.join(',')};
  const b=[...document.querySelectorAll('#d-notes .lim-rev button')].find(x=>/Sigue vigente/.test(x.textContent)); if(!b)return {ok:false,err:'sin botón'};
  b.click(); await new Promise(r=>setTimeout(r,500));
  return {ok:true,hay:!!document.querySelector('#d-notes .lim-rev'),edad:Date.now()-Date.parse(c.limitReviewedAt),
    mismaNota:c.notes===antes.notes,mismasClaves:limitationsFor(c,Date.now()).keys.join(',')===antes.keys};})()`);
check('«Sigue vigente»: el aviso se va, la fecha queda de HOY y la nota y el filtro siguen iguales',
  s.ok && !s.hay && s.edad >= 0 && s.edad < 60000 && s.mismaNota && s.mismasClaves, s.err || JSON.stringify(s));

// Sin fecha (la nota vieja de la hernia umbilical).
s = await ev(FICHA('hernia umbilical', null));
check('sin fecha (nota de antes de v728): pide revisar y dice que no hay registro', s.ok && s.hay && /no hay registro de cuándo se revisó/.test(s.texto), s.err || s.texto);

// «Ya no aplica» abre la nota con el cursor; guardar IGUAL no calla el aviso; cambiar la condición, sí.
s = await ev(`(async()=>{const b=[...document.querySelectorAll('#d-notes .lim-rev button')].find(x=>/Ya no aplica/.test(x.textContent)); if(!b)return {ok:false,err:'sin botón'};
  b.click(); await new Promise(r=>setTimeout(r,600));
  return {ok:true,modal:document.getElementById('m-client').classList.contains('on'),foco:(document.activeElement||{}).id||''};})()`);
check('«Ya no aplica»: abre la ficha con el cursor en la nota', s.ok && s.modal && s.foco === 'cf-notes', s.err || JSON.stringify(s));
s = await ev(`(async()=>{document.getElementById('cf-notes').value='hernia umbilical, ya la operaron'; await saveClient(); await new Promise(r=>setTimeout(r,600));
  const c=DB.clients[0]; return {hay:!!document.querySelector('#d-notes .lim-rev'),fecha:c.limitReviewedAt||null};})()`);
check('guardar con las MISMAS condiciones no cuenta como revisar: el aviso sigue', s.hay && !s.fecha, JSON.stringify(s));
s = await ev(`(async()=>{openEditClient(); await new Promise(r=>setTimeout(r,300)); document.getElementById('cf-notes').value='ya no tengo nada';
  await saveClient(); await new Promise(r=>setTimeout(r,600));
  const c=DB.clients[0]; return {hay:!!document.querySelector('#d-notes .lim-rev'),fecha:c.limitReviewedAt===undefined?'undef':c.limitReviewedAt,keys:limitationsFor(c,Date.now()).keys};})()`);
// Sin fecha = null o sin la clave: esta ficha nunca tuvo fecha y `saveClient` no estrena un null (v728, a propósito).
check('quitar la condición de la nota: el aviso se va, no queda fecha y el filtro se levanta POR LA NOTA',
  !s.hay && (s.fecha === null || s.fecha === 'undef') && !s.keys.includes('core_central'), JSON.stringify(s));
s = await ev(`(async()=>{openEditClient(); await new Promise(r=>setTimeout(r,300)); document.getElementById('cf-notes').value='tengo osteopenia';
  await saveClient(); await new Promise(r=>setTimeout(r,600));
  const c=DB.clients[0]; return {hay:!!document.querySelector('#d-notes .lim-rev'),edad:Date.now()-Date.parse(c.limitReviewedAt)};})()`);
check('anotar una condición nueva le pone fecha de HOY y no pide revisar todavía', !s.hay && s.edad >= 0 && s.edad < 60000, JSON.stringify(s));

// Oscuro y «Muy grande»: embarazo, dos condiciones y lo que contestó la persona.
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await ev(TEMA('oscuro')); await ev(TAMANO('xl')); await ev(LIMPIAR);
s = await ev(FICHA('estoy embarazada y tengo osteopenia', HACE(200), `{selfReg:true,tier:'libre',limitAsk:{at:${HACE(5)},r:'cambio'}}`));
check('oscuro + «Muy grande»: embarazo (médico u obstetra), lo que avisó la persona y nada fuera de pantalla',
  s.ok && s.hay && /Anotó embarazo y osteopenia u osteoporosis hace más de 180 días/.test(s.texto) && /médico u obstetra/.test(s.texto)
  && /avisó desde la app que CAMBIÓ/.test(s.texto) && s.altos.every(h => h >= 36) && s.fuera === 0, s.err || JSON.stringify({ t: s.texto, fuera: s.fuera, altos: s.altos }));
await foto('2-coach-embarazo-oscuro-xl');
await ev(TAMANO(''));

// ── (2) LA PERSONA QUE SE REGISTRÓ SOLA, EN SU PERFIL ─────────────────────────────────────────────────
const PERFIL = (notas, revisado, extra) => `(async()=>{try{
  const c=Object.assign({id:'qa-vig-cli',name:'Prueba Registro',email:'qa-vig-cli@example.com',sex:'F',level:'Principiante',goal:'Salud general',days:3,
    weight:62,height:158,age:29,place:'gym',selfReg:true,tier:'libre',notes:${JSON.stringify(notas)},painCare:[],routines:[],
    createdAt:'2026-01-10T10:00:00.000Z',startDate:'2026-01-10',habits:{water:{},steps:{}}}, ${revisado ? `{limitReviewedAt:${revisado}}` : '{}'}, ${extra || '{}'});
  DB.clients=[c]; DB.msgs={}; DB.history={}; CUR.clientId=c.id; CUR.loggedAs='client'; window._pushes=[];
  // Abrir el Perfil vuelve al tema GUARDADO (setTheme(ld('ax_theme'))): se guarda el que se está probando.
  setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
  showScreen('s-client'); const t=[...document.querySelectorAll('.cntab')].find(x=>/perfil/i.test(x.textContent));
  cnTab('cn-profile',t,true); await new Promise(r=>setTimeout(r,600));
  const box=document.querySelector('#cn-limrev .lim-ask'); if(box) box.scrollIntoView({block:'center'});
  const bts=box?[...box.querySelectorAll('button')]:[];
  return {ok:true,hay:!!box,texto:box?box.textContent:'',botones:bts.map(b=>b.textContent.trim()),
    altos:bts.map(b=>Math.round(b.getBoundingClientRect().height)),fuera:${FUERA('#cn-limrev')}};
}catch(e){return {ok:false,err:e.message};}})()`;
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(TEMA('claro')); await ev(LIMPIAR);
s = await ev(PERFIL('estoy embarazada', HACE(30)));
check('CONTROL · revisada hace 30 días: el Perfil no pregunta', s.ok && !s.hay, s.err || s.texto);
s = await ev(PERFIL('estoy embarazada', HACE(100), `{selfReg:false}`));
check('CONTROL · a quien creó el coach no se le pregunta en su Perfil (lo pregunta el coach)', s.ok && !s.hay, s.err || s.texto);
s = await ev(PERFIL('postparto con diastasis', HACE(100)));
check('a los 100 días: «¿Sigue igual?» sin nombrarle el diagnóstico, con sus dos botones',
  s.ok && s.hay && /Hace unos meses escribiste algo sobre tu abdomen o tu suelo pélvico\. ¿Sigue igual\?/.test(s.texto)
  && !/diástasis|diastasis|postparto/i.test(s.texto) && s.botones.join('|') === 'Sigue igual|Cambió', s.err || JSON.stringify({ t: s.texto, b: s.botones }));
check('botones de 36 px o más y nada fuera de los 360 px', s.ok && s.altos.every(h => h >= 36) && s.fuera === 0, JSON.stringify({ altos: s.altos, fuera: s.fuera }));
await foto('3-perfil-pregunta-claro');
s = await ev(`(async()=>{const c=DB.clients[0]; const nota=c.notes, fecha=c.limitReviewedAt;
  const b=[...document.querySelectorAll('#cn-limrev button')].find(x=>/Cambió/.test(x.textContent)); if(!b)return {ok:false,err:'sin botón'};
  b.click(); await new Promise(r=>setTimeout(r,500));
  const m=(DB.msgs[c.id]||[]).slice(-1)[0]||{};
  return {ok:true,hay:!!document.querySelector('#cn-limrev .lim-ask'),r:(c.limitAsk||{}).r,msg:m.text||'',de:m.from,push:window._pushes.map(p=>p[0]+' · '+p[1]),
    mismaNota:c.notes===nota,mismaFecha:c.limitReviewedAt===fecha,claves:limitationsFor(c,Date.now()).keys};})()`);
check('«Cambió»: la fila se va, el coach recibe el mensaje en su hilo y el push',
  s.ok && !s.hay && s.r === 'cambio' && /^🔄 Prueba avisó desde la app que cambió/.test(s.msg) && s.de === 'client'
  && s.push.length === 1 && /^_coach · 🔄 Prueba dice que su condición cambió/.test(s.push[0]), s.err || JSON.stringify(s));
check('«Cambió» no toca la nota, ni la fecha del coach, ni el filtro', s.mismaNota && s.mismaFecha && s.claves.includes('core_central'), JSON.stringify(s));
s = await ev(`(async()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/perfil/i.test(x.textContent)); cnTab('cn-profile',t,true);
  await new Promise(r=>setTimeout(r,400)); return !!document.querySelector('#cn-limrev .lim-ask');})()`);
check('volver al Perfil no la vuelve a preguntar en el mismo plazo', s === false, String(s));

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await ev(TEMA('oscuro')); await ev(TAMANO('xl')); await ev(LIMPIAR);
s = await ev(PERFIL('tengo hipertension', null));
check('oscuro + «Muy grande», sin fecha: «Hace un tiempo…», sin nombrar la hipertensión y sin salirse',
  s.ok && s.hay && /Hace un tiempo escribiste algo sobre tu presión arterial o tu corazón/.test(s.texto) && !/hipertensi/i.test(s.texto)
  && s.altos.every(h => h >= 36) && s.fuera === 0, s.err || JSON.stringify({ t: s.texto, fuera: s.fuera, altos: s.altos }));
await foto('4-perfil-pregunta-oscuro-xl');
s = await ev(`(async()=>{const c=DB.clients[0];
  const b=[...document.querySelectorAll('#cn-limrev button')].find(x=>/Sigue igual/.test(x.textContent)); if(!b)return {ok:false,err:'sin botón'};
  b.click(); await new Promise(r=>setTimeout(r,500));
  return {ok:true,hay:!!document.querySelector('#cn-limrev .lim-ask'),r:(c.limitAsk||{}).r,msgs:(DB.msgs[c.id]||[]).length,push:window._pushes.length};})()`);
check('«Sigue igual»: la fila se va y NO se le escribe ni se le manda push al coach', s.ok && !s.hay && s.r === 'igual' && s.msgs === 0 && s.push === 0, s.err || JSON.stringify(s));
await ev(TAMANO(''));

for (const r of results) console.log(r);
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log('capturas: ' + OUT);
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas === 0 && jsErrors.length === 0 ? `\nTODO OK (${results.length}/${results.length})` : `\n${fallas} FALLA(S)`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallas === 0 && jsErrors.length === 0 ? 0 : 1);
