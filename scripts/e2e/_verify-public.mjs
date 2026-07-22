// _verify-public.mjs — COMUNIDAD v2 ③c-2 CUENTA PÚBLICA/PRIVADA + activación (menores). Sin login
// (sintetiza el asesorado + cliente FALSO con functions.invoke para la edge activate_public_profile).
// Verifica la LÓGICA del cliente:
//   P1 perfil privado → toggle «Perfil público» OFF + copy «ábrelo para que te descubran»
//   P2 activar sin fecha → la edge pide fecha (needs_birthdate) → aparece el input de fecha
//   P3 confirmar fecha ADULTA → is_minor:false → update is_private=false (se hace público)
//   P4 confirmar fecha MENOR → is_minor:true → NO se hace público + queda marca de menor
//   P5 marca de menor → render «Perfil privado 🔒» (bloqueado)
//   P6 role=coach → insignia «Perfil de coach»
//   P7 SELLADO en localhost → no toca la nube (ni edge ni update)
// El candado REAL (menor forzado privado, extraño no ve, role no forgeable) es de la RLS/edge y se
// probó a nivel DB (matriz + trigger + role desde «posee asesorados»). Aserciones duras.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8803;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9315', '--user-data-dir=' + process.env.TEMP + '/pub-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9315/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && typeof cmtyTogglePublic==='function' && typeof _cmtyPublicBlockHtml==='function' && !document.getElementById('avi-loading')`);
await sleep(1200);

const MYUID = 'me-uid-0001';
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  DB.clients=[{id:'me',name:'Camila',routines:[],habits:{water:{},steps:{}}}]; CUR.clientId='me'; CUR.loggedAs='client';
  try{ localStorage.removeItem('ax_cmty_minor_'+'${MYUID}'); }catch(e){}
  CMTY.uid='${MYUID}'; CMTY.loaded=true; CMTY.offline=false;
  CMTY.profile={user_id:'${MYUID}',handle:'Camila',share_code:'ABCD1234',streak_weeks:2,level:2,visible:true,show_today:true,show_last_active:false,is_private:true,role:'client'};
  CMTY.friends=[]; CMTY.gym=[]; CMTY.incoming=[]; CMTY.outgoing=[]; CMTY.activity={}; CMTY.dmThreads=[]; CMTY.dmOpen=null;
  window.__edge=null; window.__calls=[];
  const b=(t)=>({ select(){return this;}, insert(){return this;}, update(p){window.__calls.push({op:'update',t,p});return this;}, delete(){return this;},
    or(){return this;}, eq(){return this;}, neq(){return this;}, in(){return this;}, order(){return this;}, limit(){return this;},
    maybeSingle(){return Promise.resolve({data:CMTY.profile,error:null});}, then(r){r({data:[],error:null});} });
  AUTH.client=()=>({ from:(t)=>b(t),
    functions:{ invoke:(name,opts)=>{ window.__calls.push({op:'invoke',name,body:opts&&opts.body}); return Promise.resolve({data:window.__edge,error:null}); } },
    rpc:()=>Promise.resolve({data:[],error:null}),
    channel:()=>({on(){return this;},subscribe(){return this;}}), removeChannel(){} });
  AUTH.getUser=async()=>({id:'${MYUID}'});
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// ── P1: perfil privado → toggle OFF + copy de descubrir ──
const p1 = await ev(`(()=>{ const h=_cmtyPublicBlockHtml(CMTY.profile); return JSON.stringify({
  hasToggle:/cmty-tg-public/.test(h), off:/aria-checked="false"/.test(h), copy:/descubran/.test(h), noCoach:!/Perfil de coach/.test(h) }); })()`);
const d1 = JSON.parse(p1);
ok('P1 privado: toggle público OFF + copy «que te descubran»', d1.hasToggle && d1.off && d1.copy && d1.noCoach);

// ── P2: activar sin fecha → needs_birthdate → aparece input de fecha ──
const p2 = await ev(`(async()=>{
  window.AVI_ALLOW_CLOUD_WRITE=true; window.__calls=[]; window.__edge={ok:true,needs_birthdate:true};
  CMTY.view='settings'; _cmtyPaint(); // R1: el perfil (bloque público + #cmty-bd-box) vive ahora en la vista Ajustes
  await cmtyTogglePublic();
  await new Promise(r=>setTimeout(r,60));
  const box=document.getElementById('cmty-bd-box');
  return JSON.stringify({ invoked:window.__calls.some(c=>c.op==='invoke'&&c.name==='activate_public_profile'),
    boxShown: box && box.style.display==='block' && /cmty-bd-input/.test(box.innerHTML),
    noUpdate:!window.__calls.some(c=>c.op==='update') }); })()`);
const d2 = JSON.parse(p2);
ok('P2 sin fecha → llama la edge + muestra input de fecha, sin update', d2.invoked && d2.boxShown && d2.noUpdate);

// ── P3: fecha ADULTA → is_minor:false → update is_private=false ──
const p3 = await ev(`(async()=>{
  window.__calls=[]; window.__edge={ok:true,is_minor:false,role:'client'};
  _cmtyShowBdBox(); const el=document.getElementById('cmty-bd-input'); el.value='1990-05-10';
  await cmtySubmitBirthdate();
  await new Promise(r=>setTimeout(r,60));
  const u=window.__calls.find(c=>c.op==='update'&&c.t==='community_profiles');
  return JSON.stringify({ sentDate:window.__calls.some(c=>c.op==='invoke'&&c.body&&c.body.birth_date==='1990-05-10'),
    wentPublic: !!(u && u.p && u.p.is_private===false), minorFlag: localStorage.getItem('ax_cmty_minor_'+'${MYUID}')==='1' }); })()`);
const d3 = JSON.parse(p3);
ok('P3 fecha adulta → edge recibe la fecha + update is_private=false', d3.sentDate && d3.wentPublic);
ok('P3 adulto NO marca menor', d3.minorFlag === false);

// ── P4: fecha MENOR → is_minor:true → NO público + marca de menor ──
const p4 = await ev(`(async()=>{
  try{ localStorage.removeItem('ax_cmty_minor_'+'${MYUID}'); }catch(e){}
  window.__calls=[]; window.__edge={ok:true,is_minor:true,role:'client'};
  _cmtyShowBdBox(); const el=document.getElementById('cmty-bd-input'); el.value='2010-05-10';
  await cmtySubmitBirthdate();
  await new Promise(r=>setTimeout(r,60));
  return JSON.stringify({ noPublic: !window.__calls.some(c=>c.op==='update'&&c.p&&c.p.is_private===false),
    minorFlag: localStorage.getItem('ax_cmty_minor_'+'${MYUID}')==='1' }); })()`);
const d4 = JSON.parse(p4);
ok('P4 fecha menor → NO se hace público', d4.noPublic);
ok('P4 fecha menor → queda marca de menor', d4.minorFlag);

// ── P5: marca de menor → render bloqueado ──
const p5 = await ev(`(()=>{ /* la marca de P4 sigue puesta */ const h=_cmtyPublicBlockHtml(CMTY.profile);
  return JSON.stringify({ locked:/Perfil privado/.test(h) && /menores de 18/.test(h), noToggle:!/cmty-tg-public/.test(h) }); })()`);
const d5 = JSON.parse(p5);
ok('P5 menor → «Perfil privado 🔒» bloqueado, sin toggle', d5.locked && d5.noToggle);

// ── P6: role=coach → insignia ──
const p6 = await ev(`(()=>{ try{ localStorage.removeItem('ax_cmty_minor_'+'${MYUID}'); }catch(e){}
  const h=_cmtyPublicBlockHtml(Object.assign({},CMTY.profile,{role:'coach'})); return JSON.stringify({ coach:/Perfil de coach/.test(h) }); })()`);
ok('P6 role=coach → insignia «Perfil de coach»', JSON.parse(p6).coach);

// ── P7: sellado en localhost → no toca la nube ──
const p7 = await ev(`(async()=>{
  window.AVI_ALLOW_CLOUD_WRITE=false; window.__calls=[]; CMTY.profile.is_private=true;
  await cmtyTogglePublic();
  return JSON.stringify({ sealed: window.__calls.length===0 }); })()`);
ok('P7 sellado en localhost → ni edge ni update', JSON.parse(p7).sealed);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));

console.log(`\n  CUENTA PÚBLICA: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
