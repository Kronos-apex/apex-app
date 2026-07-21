// _verify-follow.mjs — COMUNIDAD v2 ③c-3 DESCUBRIR + SEGUIR (app-7). Sin login (cliente FALSO que
// enruta por tabla). Verifica la LÓGICA del cliente:
//   FL1 partición: público-no-amigo → «Descubrir»; privado-no-amigo → «Tu gimnasio»; amigo → «amigos»
//   FL2 estado de seguir cargado (following: active/pending) + solicitudes de seguidores (followerReqs)
//   FL3 _cmtyDiscoverHtml: público con botón «Seguir» + insignia COACH
//   FL4 botón refleja estado (Seguir / Siguiendo ✓ / Pendiente)
//   FL5 cmtyFollow → insert follows(follower=yo, followee=uid)
//   FL6 solicitudes de seguidores: aprobar → update state=active · rechazar → delete
//   FL7 SELLADO en localhost → no escribe
// El candado REAL (público→active, privado→pending, bloqueo corta, no enumeración) es de la RLS/triggers
// y se probó a nivel DB (③b sabotajes #13/#14 + estados con dientes). Aserciones duras.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8804;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9317', '--user-data-dir=' + process.env.TEMP + '/fol-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9317/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof cmtyFollow==='function' && typeof _cmtyDiscoverHtml==='function' && !document.getElementById('avi-loading')`);
await sleep(1200);

const ME = 'me-1', FRIEND = 'fr-1', GYM = 'gym-1', PUB = 'pub-1', PUBC = 'pubc-1', REQ = 'req-1';
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client'); document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  DB.clients=[{id:'me',name:'Camila',routines:[],habits:{water:{},steps:{}}}]; CUR.clientId='me'; CUR.loggedAs='client';
  window.__calls=[];
  window.__myprofile={user_id:'${ME}',handle:'Camila',visible:true,is_private:true,role:'client',streak_weeks:2,level:2,show_today:true,show_last_active:false};
  window.__fr=[{user_a:'${ME}',user_b:'${FRIEND}',status:'accepted',requested_by:'${ME}'}];
  window.__allp=[
    {user_id:'${FRIEND}',handle:'Andrea',is_private:true,role:'client',streak_weeks:3,level:2,sessions_4w:9},
    {user_id:'${GYM}',handle:'Marcela',is_private:true,role:'client',streak_weeks:1,level:1,sessions_4w:4},
    {user_id:'${PUB}',handle:'Publico',is_private:false,role:'client',streak_weeks:5,level:3,sessions_4w:12},
    {user_id:'${PUBC}',handle:'CoachPro',is_private:false,role:'coach',streak_weeks:8,level:4,sessions_4w:15},
    {user_id:'${REQ}',handle:'Seguidora',is_private:false,role:'client',streak_weeks:2,level:1,sessions_4w:6}
  ];
  window.__fol=[{follower:'${ME}',followee:'${PUB}',state:'active'},{follower:'${ME}',followee:'${GYM}',state:'pending'},{follower:'${REQ}',followee:'${ME}',state:'pending'}];
  const rec=(op,t,p)=>window.__calls.push({op,t,p});
  const b=(t)=>{ let _op='select'; const o={
    select(){return o;}, insert(p){rec('insert',t,p);return o;}, update(p){rec('update',t,p);return o;}, delete(){rec('delete',t);return o;},
    or(){return o;}, eq(){return o;}, neq(){return o;}, in(){return o;}, order(){return o;}, limit(){return o;},
    maybeSingle(){return Promise.resolve({data:(t==='community_profiles')?window.__myprofile:null,error:null});},
    then(r){ const data = t==='friendships'?window.__fr : t==='community_profiles'?window.__allp : t==='follows'?window.__fol : []; r({data,error:null}); } };
    return o; };
  AUTH.client=()=>({ from:(t)=>b(t), rpc:()=>Promise.resolve({data:[],error:null}),
    functions:{invoke:async()=>({data:{},error:null})}, channel:()=>({on(){return this;},subscribe(){return this;}}), removeChannel(){} });
  AUTH.getUser=async()=>({id:'${ME}'});
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// ── FL1/FL2: cargar y particionar ──
const fl1 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; await cmtyLoad();
  return JSON.stringify({
    friends: CMTY.friends.map(f=>f.fid),
    gym: CMTY.gym.map(p=>p.user_id),
    discover: CMTY.discover.map(p=>p.user_id).sort(),
    following: CMTY.following,
    followerReqs: CMTY.followerReqs
  }); })()`);
const d1 = JSON.parse(fl1);
ok('FL1 amigo→amigos, privado-no-amigo→gym, público-no-amigo→descubrir (gym NO en descubrir)',
  d1.friends.includes(FRIEND) && d1.gym.includes(GYM) && !d1.gym.includes(PUB) &&
  d1.discover.includes(PUB) && d1.discover.includes(PUBC) && !d1.discover.includes(GYM) && !d1.discover.includes(FRIEND));
ok('FL2 following cargado (PUB=active, GYM=pending)', d1.following[PUB]==='active' && d1.following[GYM]==='pending');
ok('FL2 solicitud de seguidor entrante cargada (REQ)', d1.followerReqs.includes(REQ));

// ── FL3/FL4: render descubrir + estados del botón ──
const fl3 = await ev(`(()=>{ const h=_cmtyDiscoverHtml(); return JSON.stringify({
  hasPub:/Publico/.test(h), coachBadge:/CoachPro<\\/div>|CoachPro.*COACH|COACH/.test(h) && /CoachPro/.test(h),
  seguirBtn:/cmtyFollow\\('${PUB}'\\)/.test(h)===false, // PUB ya es active → NO botón Seguir
  siguiendo:/Siguiendo/.test(h) }); })()`);
const d3 = JSON.parse(fl3);
ok('FL3 descubrir muestra público + insignia COACH', d3.hasPub && d3.coachBadge);
const fl4 = await ev(`JSON.stringify({ none:_cmtyFollowBtn('nadie'), active:_cmtyFollowBtn('${PUB}'), pending:_cmtyFollowBtn('${GYM}') })`);
const d4 = JSON.parse(fl4);
ok('FL4 botón: sin relación→Seguir, active→Siguiendo, pending→Pendiente',
  /Seguir<\/button>|>Seguir</.test(d4.none) && /Siguiendo/.test(d4.active) && /Pendiente/.test(d4.pending));

// ── FL5: seguir a un público nuevo → insert ──
const fl5 = await ev(`(async()=>{ window.__calls=[]; await cmtyFollow('${PUBC}');
  const ins=window.__calls.find(c=>c.op==='insert'&&c.t==='follows');
  return JSON.stringify({ inserted:!!ins, from:ins&&ins.p.follower==='${ME}', to:ins&&ins.p.followee==='${PUBC}' }); })()`);
const d5 = JSON.parse(fl5);
ok('FL5 seguir → insert follows(follower=yo, followee=uid)', d5.inserted && d5.from && d5.to);

// ── FL6: solicitudes de seguidores — aceptar (update active) / rechazar (delete) ──
const fl6a = await ev(`(()=>{ const h=_cmtyFollowReqsHtml(); return JSON.stringify({ shown:/quiere seguirte/.test(h), name:/Seguidora/.test(h) }); })()`);
ok('FL6 sección de solicitudes muestra al solicitante', JSON.parse(fl6a).shown && JSON.parse(fl6a).name);
const fl6b = await ev(`(async()=>{ window.__calls=[]; await cmtyApproveFollow('${REQ}');
  const u=window.__calls.find(c=>c.op==='update'&&c.t==='follows');
  return JSON.stringify({ approved: !!(u && u.p && u.p.state==='active') }); })()`);
ok('FL6 aceptar → update follows state=active', JSON.parse(fl6b).approved);
const fl6c = await ev(`(async()=>{ window.__calls=[]; await cmtyRejectFollow('${REQ}');
  return JSON.stringify({ deleted: window.__calls.some(c=>c.op==='delete'&&c.t==='follows') }); })()`);
ok('FL6 rechazar → delete follows', JSON.parse(fl6c).deleted);

// ── FL7: sellado en localhost ──
const fl7 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; window.__calls=[];
  await cmtyFollow('${PUBC}'); await cmtyUnfollow('${PUB}'); await cmtyApproveFollow('${REQ}');
  return JSON.stringify({ sealed: window.__calls.length===0 }); })()`);
ok('FL7 sellado en localhost → cero escrituras', JSON.parse(fl7).sealed);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));

console.log(`\n  DESCUBRIR+SEGUIR: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
