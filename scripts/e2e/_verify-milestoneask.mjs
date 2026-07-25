// _verify-milestoneask.mjs — ADOPCIÓN A4: el opt-in de LOGROS se pregunta EN el momento del hito
// (2026-07-25). `show_milestones` vivía escondido en Ajustes de Comunidad: hoy solo 1 de 7 perfiles
// lo tiene encendido, así que la constancia de casi nadie se celebra. Ahora, al terminar el entreno
// que completa 2/4/8/12/24/52 semanas, se pregunta ahí mismo.
// Verifica: aparece solo con hito y sin opt-in previo · una sola vez por umbral · el «sí» enciende
// el opt-in Y pide el CATCH-UP al servidor (sin eso el «sí» no publicaría nada) · el «no» calla ese
// umbral pero no el siguiente · el sello de localhost · texto escapado.
// Sin login ni red: cliente Supabase FALSO que graba las llamadas. Aserciones duras (exit 1).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8803, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9313', '--user-data-dir=' + process.env.TEMP + '/msask-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9313/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderWfMilestoneAsk==='function' && typeof milestoneAskEligible==='function' && !document.getElementById('avi-loading')`);
await sleep(1500);

const MYUID = '00000000-0000-0000-0000-0000000000a4';

// Historial REAL de N semanas seguidas cumpliendo el plan (2 días/semana), para que la racha la
// calcule `weekStreak` de verdad y no un número inyectado a mano.
const INSTALL = weeks => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client');
  DB.clients=[{id:'me',name:'Camila',sex:'F',level:'Intermedio',goal:'Salud general',days:2,routines:[],habits:{water:{},steps:{}}}];
  CUR.clientId='me'; CUR.loggedAs='client';
  const hist=[]; const now=new Date();
  for(let w=0; w<${weeks}; w++){ for(let k=0;k<2;k++){
    const d=new Date(now); d.setDate(d.getDate()-(w*7+k*2)); d.setHours(18,0,0,0);
    const iso=d.toISOString();
    hist.push({id:'h'+w+'-'+k,sessionId:'s'+w+'-'+k,routineId:'rX',routineName:'Full',date:iso,startedAt:iso,finishedAt:iso,totalVol:3000,doneSets:9,totalSets:9,exercises:[]});
  }}
  DB.history={me:hist};
  window.__calls=[]; window.__invokes=[]; window.__patchFail=false;
  const builder=(table)=>{ const b={ select(){return b;}, insert(){return b;},
    update(p){window.__calls.push({table,p});return b;}, delete(){return b;},
    eq(){return b;}, neq(){return b;}, or(){return b;}, in(){return b;}, limit(){return b;},
    maybeSingle(){return Promise.resolve({data:null,error:null});},
    then(resolve){ resolve(window.__patchFail?{data:null,error:{message:'boom'}}:{data:[],error:null}); } };
    return b; };
  AUTH.client=()=>({from:builder,rpc:()=>Promise.resolve({data:[],error:null}),
    functions:{invoke:async(n,o)=>{window.__invokes.push({n,body:o&&o.body});return {data:{ok:true},error:null};}}});
  AUTH.getUser=async()=>({id:'${MYUID}'});
  CMTY.uid='${MYUID}';
  try{ localStorage.removeItem('ax_cmty_msask_${MYUID}'); }catch(e){}
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;

const setProfile = p => `(()=>{ CMTY.profile=${p}; renderWfMilestoneAsk(); return _cmtyLocalStreak(); })()`;
const askState = `(()=>{const el=document.getElementById('wf-milestone-ask');
  const t=el?el.innerText.replace(/\\s+/g,' ').trim():'';
  return {len:el?el.innerHTML.trim().length:-1,txt:t,
    btns:el?[...el.querySelectorAll('button')].map(b=>b.textContent.trim()):[]};})()`;

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// M1: 4 semanas seguidas y sin opt-in → la pregunta aparece con el logro por su nombre.
console.log('  install(4 semanas):', await ev(INSTALL(4))); await sleep(300);
const racha = await ev(setProfile(`{show_milestones:false}`)); await sleep(200);
const m1 = await ev(askState);
check('M1 con 4 semanas y sin opt-in, se pregunta en el cierre del entreno',
  racha >= 4 && /4 semanas seguidas/.test(m1.txt) && m1.btns.some(b => /Sí, celébralo/.test(b)) && m1.btns.some(b => /No, gracias/.test(b)),
  JSON.stringify({ racha, txt: m1.txt.slice(0, 80), btns: m1.btns }));

// M1-bis: el texto dice qué se publica y qué NO (mismo estándar de honestidad de A1/A3).
check('M1-bis dice que se publica el logro y NUNCA kilos/peso/fotos',
  /nunca tus kilos, tu peso ni tus fotos/.test(m1.txt) && /apagar cuando quieras/.test(m1.txt), JSON.stringify({ txt: m1.txt.slice(0, 160) }));

const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };
await ev(`(()=>{const wf=document.getElementById('workout-finish');if(wf)wf.classList.add('on');const el=document.getElementById('wf-milestone-ask');if(el)el.scrollIntoView({block:'center'});})()`); await sleep(400);
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300); await shot('milestone-ask-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(300); await shot('milestone-ask-oscuro');
await ev(`(()=>{setTheme('light');const wf=document.getElementById('workout-finish');if(wf)wf.classList.remove('on');})()`); await sleep(300);

// M2: a quien YA dijo que sí no se le pregunta nunca más.
await ev(setProfile(`{show_milestones:true}`)); await sleep(200);
const m2 = await ev(askState);
check('M2 a quien ya tiene los logros encendidos NO se le pregunta', m2.len === 0, JSON.stringify(m2));

// M3: sin racha suficiente (1 semana) no se inventa un hito.
console.log('  install(1 semana):', await ev(INSTALL(1))); await sleep(300);
const racha1 = await ev(setProfile(`{show_milestones:false}`)); await sleep(200);
const m3 = await ev(askState);
check('M3 sin llegar a un umbral no se pregunta nada', racha1 === 1 && m3.len === 0, JSON.stringify({ racha: racha1, len: m3.len }));

// M4: sin perfil de comunidad tampoco (no hay dónde publicarlo).
console.log('  install(4 semanas) sin perfil:', await ev(INSTALL(4))); await sleep(300);
await ev(setProfile(`null`)); await sleep(200);
const m4 = await ev(askState);
check('M4 sin perfil de comunidad no se pregunta', m4.len === 0, JSON.stringify(m4));

// M5: «No, gracias» calla ESE umbral… pero el siguiente vuelve a preguntar.
await ev(setProfile(`{show_milestones:false}`)); await sleep(200);
await ev(`cmtyMilestoneNo(4)`); await sleep(200);
const m5a = await ev(askState);
await ev(`renderWfMilestoneAsk()`); await sleep(200);
const m5b = await ev(askState);
console.log('  install(8 semanas):', await ev(INSTALL(8))); await sleep(300);
await ev(`(()=>{localStorage.setItem('ax_cmty_msask_${MYUID}',JSON.stringify({4:true}));})()`);
await ev(setProfile(`{show_milestones:false}`)); await sleep(200);
const m5c = await ev(askState);
check('M5 «No, gracias» calla ese umbral y no reaparece al repintar', m5a.len === 0 && m5b.len === 0, JSON.stringify({ tras: m5a.len, repintado: m5b.len }));
check('M5-bis el SIGUIENTE umbral (8 semanas) sí vuelve a preguntar', /8 semanas seguidas/.test(m5c.txt), JSON.stringify({ txt: m5c.txt.slice(0, 70) }));

// M6: el «Sí» enciende el opt-in Y pide el CATCH-UP. Sin el catch-up el «sí» no publicaría NADA:
// la edge solo emite cuando la racha CRUZA el umbral y el snapshot ya guardó la racha nueva.
await ev(`(()=>{window.AVI_ALLOW_CLOUD_WRITE=true;window.__calls=[];window.__invokes=[];})()`);
await ev(`cmtyMilestoneYes(8)`); await sleep(500);
const m6 = await ev(`(()=>({calls:window.__calls,invokes:window.__invokes,
  perfil:(CMTY.profile||{}).show_milestones,txt:(document.getElementById('wf-milestone-ask')||{}).innerText||''}))()`);
check('M6 «Sí» enciende show_milestones en el perfil',
  m6.perfil === true && m6.calls.some(c => c.table === 'community_profiles' && c.p && c.p.show_milestones === true), JSON.stringify(m6.calls));
check('M6-bis «Sí» pide el catch-up al servidor (o el logro no se publicaría nunca)',
  m6.invokes.some(i => i.n === 'refresh_snapshot' && i.body && i.body.catchup === true), JSON.stringify(m6.invokes));
check('M6-ter tras el «Sí» la tarjeta confirma, no se queda pidiendo', /va a ver/.test(m6.txt), JSON.stringify({ txt: m6.txt.slice(0, 60) }));

// M7: SELLO — en localhost sin permiso explícito, ni patch ni invoke tocan la nube.
console.log('  install(8) sellado:', await ev(INSTALL(8))); await sleep(300);
await ev(`(()=>{delete window.AVI_ALLOW_CLOUD_WRITE;window.__calls=[];window.__invokes=[];})()`);
await ev(setProfile(`{show_milestones:false}`)); await sleep(200);
await ev(`cmtyMilestoneYes(8)`); await sleep(400);
const m7 = await ev(`(()=>({calls:window.__calls.length,invokes:window.__invokes.length}))()`);
check('M7 sello: en localhost el «Sí» no escribe ni invoca a la nube', m7.calls === 0 && m7.invokes === 0, JSON.stringify(m7));

// M8: si el patch del perfil FALLA, no se promete nada (ni catch-up ni confirmación).
console.log('  install(8) patch falla:', await ev(INSTALL(8))); await sleep(300);
await ev(`(()=>{window.AVI_ALLOW_CLOUD_WRITE=true;window.__patchFail=true;window.__calls=[];window.__invokes=[];})()`);
await ev(setProfile(`{show_milestones:false}`)); await sleep(200);
await ev(`cmtyMilestoneYes(8)`); await sleep(500);
const m8 = await ev(`(()=>({invokes:window.__invokes.length,perfil:(CMTY.profile||{}).show_milestones,
  txt:(document.getElementById('wf-milestone-ask')||{}).innerText||''}))()`);
check('M8 si no se pudo guardar el opt-in, no se pide catch-up ni se confirma nada',
  m8.invokes === 0 && m8.perfil !== true && !/va a ver/.test(m8.txt), JSON.stringify(m8));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «LOGROS EN SU MOMENTO» (A4, adopción) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
