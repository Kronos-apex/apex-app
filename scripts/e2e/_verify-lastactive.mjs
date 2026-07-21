// _verify-lastactive.mjs — COMUNIDAD v2 ② ÚLTIMA CONEXIÓN (app-7). Sin login (sintetiza el
// asesorado + cliente FALSO). Verifica la LÓGICA del cliente de la etiqueta redondeada opt-in:
//   LA1 _cmtyLoadActivity: una RPC cmty_activity_labels puebla CMTY.activity (solo labels no-null)
//   LA2 _cmtyActivityText: mapeo de buckets → texto humano
//   LA3 _cmtyActivityHtml: 'ahora'→verde "● En línea" · 'hoy'→"Activo hoy" · null→'' · XSS-safe
//   LA4 toggle opt-in en mi perfil refleja show_last_active (on/off)
//   LA5 cmtyToggleLastActive: SELLADO en localhost no escribe; con allow, update show_last_active volteado
//   LA6 tarjetas de amigo y de gym muestran la etiqueta cuando existe
//   LA7 encabezado del chat muestra la última conexión
// El candado REAL (extraño no ve, opt-out no ve, last_active nunca crudo) es de la RLS/grants y se
// probó a nivel DB (matriz amigo/extraño/opt-out + permission denied de last_active). Aserciones duras.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const PORT = 8802;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9313', '--user-data-dir=' + process.env.TEMP + '/la-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9313/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof cmtyToggleLastActive==='function' && typeof _cmtyActivityHtml==='function' && !document.getElementById('avi-loading')`);
await sleep(1200);

const MYUID = 'me-uid-0001', F1 = 'peer-f1', G1 = 'peer-g1';
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  DB.clients=[{id:'me',name:'Camila',routines:[],habits:{water:{},steps:{}}}]; CUR.clientId='me'; CUR.loggedAs='client';
  CMTY.uid='${MYUID}'; CMTY.loaded=true; CMTY.offline=false;
  CMTY.profile={user_id:'${MYUID}',handle:'Camila',share_code:'ABCD1234',streak_weeks:2,level:2,visible:true,show_today:true,show_last_active:false};
  CMTY.friends=[{fid:'${F1}',fr:{id:'fr1'},prof:{user_id:'${F1}',handle:'Andrea',streak_weeks:3,level:2,sessions_4w:9,trained_today:true,snapshot_at:new Date().toISOString()}}];
  CMTY.gym=[{user_id:'${G1}',handle:'Marcela',streak_weeks:1,level:1}];
  CMTY.activity={}; CMTY.dmThreads=[]; CMTY.dmUnread=0; CMTY.dmOpen=null; CMTY.dmMsgs=[];
  window.__upd=[]; window.__rpc=[]; window.__labels=[];
  const genBuilder=(t)=>({ select(){return this;}, insert(){return this;}, update(p){window.__upd.push({t,p});return this;}, delete(){return this;},
    or(){return this;}, eq(){return this;}, neq(){return this;}, in(){return this;}, order(){return this;}, limit(){return this;},
    maybeSingle(){return Promise.resolve({data:CMTY.profile,error:null});}, then(r){r({data:[],error:null});} });
  AUTH.client=()=>({ from:(t)=>genBuilder(t),
    rpc:(n,args)=>{window.__rpc.push({n,args});return Promise.resolve({data:window.__labels,error:null});},
    channel:()=>({on(){return this;},subscribe(){return this;}}), removeChannel(){},
    functions:{invoke:async()=>({data:{},error:null})} });
  AUTH.getUser=async()=>({id:'${MYUID}'});
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// ── LA1: _cmtyLoadActivity puebla CMTY.activity solo con labels no-null ──
const la1 = await ev(`(async()=>{
  window.__labels=[{uid:'${F1}',label:'ahora'},{uid:'${G1}',label:null}];  // G1 sin opt-in → null
  await _cmtyLoadActivity(AUTH.client(), '${MYUID}');
  const call=window.__rpc.find(r=>r.n==='cmty_activity_labels');
  return JSON.stringify({rpcCalled:!!call, targetsHasBoth: call && call.args.targets.indexOf('${F1}')>=0 && call.args.targets.indexOf('${G1}')>=0,
    f1:CMTY.activity['${F1}'], g1:('${G1}' in CMTY.activity)});
})()`);
const d1 = JSON.parse(la1);
ok('LA1 llama cmty_activity_labels con amigos+gym', d1.rpcCalled && d1.targetsHasBoth);
ok('LA1 guarda label no-null (F1=ahora)', d1.f1 === 'ahora');
ok('LA1 descarta label null (G1 ausente)', d1.g1 === false);

// ── LA2/LA3: texto + html ──
const la3 = await ev(`JSON.stringify({
  tAhora:_cmtyActivityText('ahora'), tHoy:_cmtyActivityText('hoy'), tSem:_cmtyActivityText('esta semana'), tOld:_cmtyActivityText('hace tiempo'), tNull:_cmtyActivityText(null),
  hF1:_cmtyActivityHtml('${F1}'), hG1:_cmtyActivityHtml('${G1}')
})`);
const d3 = JSON.parse(la3);
ok('LA2 texto por bucket', d3.tAhora === 'En línea' && d3.tHoy === 'Activo hoy' && d3.tSem === 'Activo esta semana' && d3.tOld === 'Hace tiempo' && d3.tNull === '');
ok('LA3 html "ahora" = verde "● En línea"', /var\(--g\)/.test(d3.hF1) && /En línea/.test(d3.hF1));
ok('LA3 html sin label = vacío', d3.hG1 === '');

// ── LA4: toggle opt-in refleja show_last_active ──
const la4 = await ev(`(()=>{
  CMTY.profile.show_last_active=false; _cmtyPaint();
  const off=document.getElementById('cmty-tg-lastactive');
  const offState=off && off.getAttribute('aria-checked');
  CMTY.profile.show_last_active=true; _cmtyPaint();
  const on=document.getElementById('cmty-tg-lastactive');
  return JSON.stringify({present:!!on, off:offState, on:on&&on.getAttribute('aria-checked'), label:/última conexión/i.test(document.getElementById('cn-community').textContent)});
})()`);
const d4 = JSON.parse(la4);
ok('LA4 toggle presente con copy de última conexión', d4.present && d4.label);
ok('LA4 aria-checked sigue a show_last_active (off→false, on→true)', d4.off === 'false' && d4.on === 'true');

// ── LA5: toggle sellado vs permitido ──
const la5 = await ev(`(async()=>{
  window.AVI_ALLOW_CLOUD_WRITE=false; window.__upd=[]; CMTY.profile.show_last_active=false;
  await cmtyToggleLastActive();
  const sealedNoWrite=!window.__upd.some(u=>u.t==='community_profiles');
  window.AVI_ALLOW_CLOUD_WRITE=true; window.__upd=[]; CMTY.profile.show_last_active=false;
  await cmtyToggleLastActive();
  const u=window.__upd.find(x=>x.t==='community_profiles');
  return JSON.stringify({sealedNoWrite, wrote:!!u, flipped:u&&u.p&&u.p.show_last_active===true});
})()`);
const d5 = JSON.parse(la5);
ok('LA5 sellado en localhost NO escribe', d5.sealedNoWrite);
ok('LA5 con allow, update show_last_active=true', d5.wrote && d5.flipped);

// ── LA6: tarjetas muestran la etiqueta ──
const la6 = await ev(`(()=>{
  CMTY.activity={'${F1}':'ahora','${G1}':'hoy'};
  const friends=_cmtyFriendsHtml(); const gym=_cmtyGymHtml();
  return JSON.stringify({friendOnline:/En línea/.test(friends), gymHoy:/Activo hoy/.test(gym)});
})()`);
const d6 = JSON.parse(la6);
ok('LA6 tarjeta de amigo muestra "En línea"', d6.friendOnline);
ok('LA6 tarjeta de gym muestra "Activo hoy"', d6.gymHoy);

// ── LA7: encabezado del chat ──
const la7 = await ev(`(async()=>{
  CMTY.activity={'${F1}':'ahora'}; window.__labels=[];
  await cmtyChatOpen('${F1}');
  const sub=document.getElementById('cmtychat-sub');
  return JSON.stringify({subHasActivity:/En línea/.test(sub?sub.textContent:'')});
})()`);
const d7 = JSON.parse(la7);
ok('LA7 encabezado del chat muestra la última conexión', d7.subHasActivity);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));

// ── Captura visual (etiquetas en tarjetas + toggle), ambos temas ──
for (const theme of ['light', 'dark']) {
  await ev(`(()=>{ setTheme('${theme}');
    CMTY.dmOpen=null; const el=document.getElementById('cmty-chat'); if(el)el.classList.remove('on');
    CMTY.profile.show_last_active=true;
    CMTY.activity={'${F1}':'ahora'};
    CMTY.gym=[{user_id:'${G1}',handle:'Marcela',streak_weeks:1,level:1}];
    CMTY.activity['${G1}']='hoy';
    _cmtyPaint(); return 1; })()`);
  await sleep(250);
  const h = await ev(`Math.max(document.getElementById('cn-community').scrollHeight+80, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(250);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/lastactive-${theme}.png`, Buffer.from(r.data, 'base64'));
  console.log('  shot lastactive-' + theme, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}

console.log(`\n  ÚLTIMA CONEXIÓN: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
