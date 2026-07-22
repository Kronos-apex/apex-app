// _verify-workoutshare.mjs — v3-a #2+#3: compartir el ENTRENO TERMINADO en el muro. Sin login.
// El candado real (allow-list) es del trigger y se probó a nivel DB (W1-W10). Aquí: la LÓGICA del
// cliente — opt-in por publicación (nada automático), el payload EXACTO del mapeador, y XSS de la nota.
//   WS1 renderWfCmtyshare: NO aparece si no es miembro de comunidad (CMTY.profile null)
//   WS2 aparece con miembro + sesión finalizada; resumen con nombre/duración/ejercicios
//   WS3 W11: terminar SIN tocar el botón → CERO inserts a community_posts
//   WS4 W11: con el botón → 1 insert kind='workout' con el payload EXACTO (deep-equal del mapeador)
//   WS5 la nota va en el payload (≤140) y jamás kilos
//   WS6 SELLADO en localhost → cero inserts
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8845;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9355', '--user-data-dir=' + process.env.TEMP + '/ws-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9355/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await waitFor(`typeof cmtyShareWorkout==='function' && typeof renderWfCmtyShare==='function' && typeof communityWorkoutPayload==='function' && !document.getElementById('avi-loading')`);
await sleep(900);

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };
const ME = 'me-1';

// Sesión terminada de fixture + stub del cliente que registra los inserts
const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  window.__ins=[];
  AUTH.client=()=>({ from:(t)=>({ insert:(p)=>{ window.__ins.push({t,p}); return Promise.resolve({error:null}); } }), rpc:()=>Promise.resolve({data:[],error:null}) });
  AUTH.getUser=async()=>({id:'${ME}'});
  window.__sess={routineName:'Pierna y glúteo',startedAt:'2026-07-22T10:08:00Z',finishedAt:'2026-07-22T11:00:00Z',doneSets:12,totalSets:12,
    exercises:[{name:'Sentadilla',sets:[{kg:80,reps:10,done:true}]},{name:'Peso muerto',sets:[{kg:100,reps:5,done:true}]}]};
  _wfEntry=window.__sess; _wfCmtyRoutineName='Pierna y glúteo';
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(150);

// WS1: sin perfil de comunidad → la tarjeta NO aparece
const ws1 = await ev(`(()=>{ CMTY.profile=null; renderWfCmtyShare();
  return document.getElementById('wf-cmty-share').innerHTML===''; })()`);
ok('WS1 no-miembro de comunidad → la tarjeta de compartir NO aparece', ws1);

// WS2: con perfil + sesión finalizada → aparece con el resumen
const ws2 = await ev(`(()=>{ CMTY.profile={user_id:'${ME}',handle:'Cami',visible:true}; CMTY.uid='${ME}'; CMTY.loaded=false;
  renderWfCmtyShare(); const h=document.getElementById('wf-cmty-share').innerHTML;
  return JSON.stringify({ shown:h!=='', name:/Pierna y glúteo/.test(h), dur:/52 min/.test(h), exs:/2 ejercicios/.test(h),
    hasNote:!!document.getElementById('wf-cshare-note'), hasBtn:/Compartir este entreno/.test(h) }); })()`);
const d2 = JSON.parse(ws2);
ok('WS2 miembro + sesión finalizada → tarjeta con nombre/duración/ejercicios + input + botón',
  d2.shown && d2.name && d2.dur && d2.exs && d2.hasNote && d2.hasBtn);

// WS3 (W11): renderWfCmtyShare (lo que corre en el flujo de fin) SOLO pinta — no inserta nada.
// Sabotaje-proof: si renderWfCmtyShare publicara por sí sola, __ins tendría un post tras pintarla.
const ws3 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; window.__ins=[];
  CMTY.profile={user_id:'${ME}',handle:'Cami'}; CMTY.uid='${ME}';
  renderWfCmtyShare(); await new Promise(r=>setTimeout(r,50));
  return window.__ins.length===0; })()`);
ok('WS3 (W11) pintar la tarjeta NO publica — solo el botón publica (opt-in real)', ws3);

// WS4+WS5 (W11): con el botón → 1 insert con el payload EXACTO del mapeador (+ nota)
const ws4 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; window.__ins=[];
  const ta=document.getElementById('wf-cshare-note'); if(ta) ta.value='¡Vamos! 💪 <img src=x onerror=alert(1)>';
  await wfShareToCommunity();
  const ins=window.__ins.find(c=>c.t==='community_posts');
  if(!ins) return JSON.stringify({inserted:false});
  const expected=communityWorkoutPayload(_wfEntry,'Pierna y glúteo','¡Vamos! 💪 <img src=x onerror=alert(1)>');
  return JSON.stringify({ inserted:true, kind:ins.p.kind==='workout', uid:ins.p.user_id==='${ME}',
    deepEqual: JSON.stringify(ins.p.payload)===JSON.stringify(expected),
    hasNote: ins.p.payload.note==='¡Vamos! 💪 <img src=x onerror=alert(1)>',
    noKg: !('kg' in ins.p.payload) && !('exercises' in ins.p.payload),
    keys: Object.keys(ins.p.payload).sort().join(','),
    doneUI: /Compartido/.test(document.getElementById('wf-cmty-share').innerHTML) }); })()`);
const d4 = JSON.parse(ws4);
ok('WS4 (W11) con el botón → 1 insert kind=workout, payload EXACTO del mapeador (deep-equal)', d4.inserted && d4.kind && d4.uid && d4.deepEqual);
ok('WS5 nota en el payload (allow-list name,duration_min,exercises_count,note; jamás kilos)',
  d4.hasNote && d4.noKg && d4.keys === 'duration_min,exercises_count,name,note');
ok('WS5b tras compartir → la tarjeta muestra «Compartido»', d4.doneUI);

// WS6: sellado en localhost → cero inserts
const ws6 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; window.__ins=[];
  CMTY.profile={user_id:'${ME}',handle:'Cami'}; renderWfCmtyShare();
  await cmtyShareWorkout(_wfEntry,'Pierna y glúteo','x');
  return window.__ins.length===0; })()`);
ok('WS6 sellado en localhost → cero inserts', ws6);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));
console.log(`\n  WORKOUT-SHARE: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
