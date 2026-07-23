// _verify-pr.mjs — v3 #6 PR PILOTO: compartir un récord de PESO (SOLO coach moderador). Sin login.
// El candado real (quién puede insertar 'pr') es de la RLS y se probó a nivel DB (PR1-PR6, c18).
// Aquí: la LÓGICA del cliente — la sección solo aparece al moderador, el valor sale de un PR real
// (no se teclea), la confirmación activa, el insert kind='pr' con el payload exacto, la tarjeta, XSS.
//   P1  la sección «Comparte un récord» NO aparece si no soy moderador
//   P2  aparece con isModerator + lista SOLO mis PRs de PESO (kg), no reps/seg
//   P3  «Compartir» abre confirmación con el nombre y el número reales
//   P4  confirmar → 1 insert kind='pr' con {exercise_name, value_kg} EXACTO del mapeador
//   P5  cancelar → 0 inserts, la confirmación se cierra
//   P6  la tarjeta del muro pinta «Ejercicio — N kg», felicitar/comentar, XSS del nombre escapado
//   P7  sellado en localhost → 0 inserts
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8849, OUT = (process.env.TEMP || '/tmp') + '/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9359', '--user-data-dir=' + process.env.TEMP + '/pr-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9359/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await waitFor(`typeof cmtyPublishPr==='function' && typeof _cmtyPrShareHtml==='function' && typeof communityPrPayload==='function' && !document.getElementById('avi-loading')`);
await sleep(900);

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };
const ME = 'me-1', OTHER = 'other-1';
const XSS = '<img src=x onerror=window.__pwned=1>';

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  if(typeof setTheme==='function')setTheme('light');
  window.__w=[]; window.__toasts=[]; window.toast=(m)=>{window.__toasts.push(m);};
  AUTH.client=()=>({ from:(t)=>({ insert:(p)=>{ window.__w.push({op:'insert',t,p}); return Promise.resolve({error:null}); },
    select:()=>({ eq:()=>({maybeSingle:()=>Promise.resolve({data:null,error:null})}), in:()=>({order:()=>({limit:()=>Promise.resolve({data:[],error:null})})}) }) }),
    rpc:()=>Promise.resolve({data:[],error:null}) });
  AUTH.getUser=async()=>({id:'${ME}'});
  // PRs propios: 2 de PESO (kg) + 1 de reps (no debe listarse)
  DB.prs={'me':{
    e1:{name:'Sentadilla',unit:'kg',val:100,reps:3,date:'2026-07-01T10:00:00Z'},
    e2:{name:'Peso muerto',unit:'kg',kg:140,date:'2026-07-02T10:00:00Z'},
    e3:{name:'Dominadas',unit:'reps',val:15,date:'2026-07-03T10:00:00Z'}
  }};
  CUR.clientId='me'; CUR.loggedAs='client';
  CMTY.uid='${ME}'; CMTY.loaded=true; CMTY.loading=false; CMTY.offline=false; CMTY.view='settings';
  CMTY.profile={user_id:'${ME}',handle:'Coach',share_code:'AAAA1111BB',visible:true,is_private:false,streak_weeks:3,level:2,role:'coach'};
  CMTY.friends=[]; CMTY.gym=[]; CMTY.incoming=[]; CMTY.outgoing=[]; CMTY.discover=[]; CMTY.followerReqs=[];
  CMTY.following={}; CMTY.dmThreads=[]; CMTY.activity={}; CMTY.heartsRecv=0; CMTY.heartsGiven={};
  CMTY.profById={}; CMTY.posts=[]; CMTY.postHearts={}; CMTY.postHeartMine={}; CMTY.postComments={};
  CMTY.isModerator=false; CMTY.prConfirm=null;
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// P1 · no moderador → la sección NO aparece
await ev(`CMTY.isModerator=false; _cmtyPaint();`); await sleep(120);
const p1 = await ev(`(()=>{ const h=document.getElementById('cn-community').innerText; return !/Comparte un récord/.test(h); })()`);
ok('P1 la sección NO aparece si no soy moderador', p1);

// P2 · moderador → lista SOLO PRs de peso (Sentadilla, Peso muerto), no Dominadas (reps)
await ev(`CMTY.isModerator=true; _cmtyPaint();`); await sleep(120);
const p2 = await ev(`(()=>{ const h=document.getElementById('cn-community');
  const t=h.innerText;
  return JSON.stringify({ seccion:/Comparte un récord/.test(t), sent:/Sentadilla/.test(t) && /100 kg/.test(t),
    peso:/Peso muerto/.test(t) && /140 kg/.test(t), sinReps:!/Dominadas/.test(t),
    orden: t.indexOf('Peso muerto') < t.indexOf('Sentadilla') }); })()`);
const d2 = JSON.parse(p2);
ok('P2 moderador: lista solo PRs de PESO (Sentadilla 100, Peso muerto 140), NO Dominadas (reps)', d2.seccion && d2.sent && d2.peso && d2.sinReps);
ok('P2b orden por más pesado primero (140 antes que 100)', d2.orden);

// P3 · «Compartir» del más pesado abre confirmación con nombre y número reales
await ev(`cmtyPrAsk(0)`); await sleep(120);
const p3 = await ev(`(()=>{ const t=document.getElementById('cn-community').innerText;
  return JSON.stringify({ conf:/¿Publicarlo\\?/.test(t)||/publicar/i.test(t), muestra:/Peso muerto — 140 kg/.test(t),
    estado: CMTY.prConfirm && CMTY.prConfirm.val }); })()`);
const d3 = JSON.parse(p3);
ok('P3 «Compartir» abre confirmación con «Peso muerto — 140 kg» real', d3.conf && d3.muestra && d3.estado === 140);

// P4 · confirmar → 1 insert kind='pr' con el payload EXACTO del mapeador
const p4 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; window.__w=[];
  await cmtyPublishPr();
  const ins=window.__w.filter(w=>w.op==='insert'&&w.t==='community_posts');
  const exp=communityPrPayload(DB.prs['me']['e2']);
  return JSON.stringify({ n:ins.length, kind:ins[0]&&ins[0].p.kind, uid:ins[0]&&ins[0].p.user_id,
    deep: ins[0] && JSON.stringify(ins[0].p.payload)===JSON.stringify(exp),
    payload: ins[0] && ins[0].p.payload, limpio: CMTY.prConfirm===null }); })()`);
const d4 = JSON.parse(p4);
ok('P4 confirmar → 1 insert kind=pr con {exercise_name,value_kg} EXACTO del mapeador',
  d4.n === 1 && d4.kind === 'pr' && d4.uid === ME && d4.deep && d4.payload.exercise_name === 'Peso muerto' && d4.payload.value_kg === 140 && d4.limpio);
await ev(`delete window.AVI_ALLOW_CLOUD_WRITE;`);

// cmtyPublishPr terminó con cmtyLoad() (stub) → restauro el estado que ese reload dejó vacío.
const RESET = `(()=>{ CMTY.uid='${ME}'; CMTY.loaded=true; CMTY.offline=false; CMTY.isModerator=true; CMTY.prConfirm=null;
  CMTY.profile={user_id:'${ME}',handle:'Coach',share_code:'AAAA1111BB',visible:true,is_private:false,streak_weeks:3,level:2,role:'coach'};
  CMTY.friends=[]; CMTY.gym=[]; CMTY.incoming=[]; CMTY.outgoing=[]; CMTY.discover=[]; CMTY.followerReqs=[];
  CMTY.following={}; CMTY.dmThreads=[]; CMTY.activity={}; CMTY.profById={}; CMTY.posts=[]; CMTY.postHearts={}; CMTY.postHeartMine={}; CMTY.postComments={};
  return 1; })()`;
await ev(RESET);

// P5 · cancelar → 0 inserts + confirmación cerrada
await ev(`CMTY.view='settings'; cmtyPrAsk(1)`); await sleep(80);
const p5 = await ev(`(async()=>{ window.__w=[]; cmtyPrCancel(); await new Promise(r=>setTimeout(r,50));
  return JSON.stringify({ ins:window.__w.length, cerrada:CMTY.prConfirm===null,
    vuelveLista:/Comparte un récord/.test(document.getElementById('cn-community').innerText) }); })()`);
const d5 = JSON.parse(p5);
ok('P5 cancelar → 0 inserts y la confirmación se cierra', d5.ins === 0 && d5.cerrada && d5.vuelveLista);

// P6 · tarjeta del muro: «Ejercicio — N kg» + felicitar/comentar + XSS del nombre escapado
await ev(RESET);
const p6 = await ev(`(()=>{ CMTY.view='feed'; window.__pwned=undefined;
  CMTY.posts=[{id:'pp1',user_id:'${OTHER}',kind:'pr',payload:{exercise_name:${JSON.stringify('Sentadilla ' + XSS)},value_kg:120},created_at:'2026-07-23T10:00:00Z'}];
  CMTY.profById={'${OTHER}':{user_id:'${OTHER}',handle:'Ana'}};
  _cmtyPaint();
  const host=document.getElementById('cn-community'); const h=host.innerHTML; const t=host.innerText;
  return JSON.stringify({ card:/120 kg/.test(t), quien:/Ana/.test(t), record:/marcó un récord/.test(t),
    corazon: h.indexOf(\"cmtyPostHeart('pp1'\")>0, coment: h.indexOf(\"cmtyToggleThread('pp1')\")>0,
    escapado: h.indexOf('&lt;img src=x')>0 && host.querySelectorAll('img[src=\"x\"]').length===0, pwned:!!window.__pwned }); })()`);
const d6 = JSON.parse(p6);
ok('P6 tarjeta del récord: «… 120 kg» + autor + felicitar + comentar', d6.card && d6.quien && d6.record && d6.corazon && d6.coment);
ok('P6b XSS del nombre del ejercicio escapado (sin <img>, onerror no corre)', d6.escapado && !d6.pwned);

// P7 · sellado en localhost
const p7 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; window.__w=[];
  CMTY.view='settings'; CMTY.isModerator=true; _cmtyPaint(); cmtyPrAsk(0); await cmtyPublishPr();
  return window.__w.length===0; })()`);
ok('P7 sellado en localhost → 0 inserts', p7);

// Capturas (settings con la sección de récords; muro con la tarjeta) — MIRADAS
for (const tema of ['light', 'dark']) {
  await ev(`(()=>{ if(typeof setTheme==='function')setTheme('${tema}'); document.body.classList.toggle('dark', ${tema === 'dark'});
    CMTY.view='settings'; CMTY.isModerator=true; CMTY.prConfirm=null; _cmtyPaint(); return 1; })()`);
  await sleep(220);
  const h = await ev(`Math.max(document.getElementById('cn-community').scrollHeight+120, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(280);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/pr-settings-${tema}.png`, Buffer.from(shot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
console.log('  shots en:', OUT);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));
console.log(`\n  PR PILOTO: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
