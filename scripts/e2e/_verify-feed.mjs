// _verify-feed.mjs — COMUNIDAD v2 ④ MURO / FEED (app-7). Sin login (cliente FALSO que enruta por
// tabla). Verifica la LÓGICA del cliente (el candado REAL de visibilidad/allow-list es de la RLS+trigger
// y se probó a nivel DB con matrices de sabotaje). Aserciones duras.
//   FD1 cmtyLoad carga posts (a quien sigo ACTIVO + míos) + conteo de ❤️ + mi ❤️
//   FD2 _cmtyFeedHtml pinta tarjetas (autor, nombre, días, ejercicios, conteo ❤️)
//   FD3 muro vacío → estado vacío accionable
//   FD4 _cmtyComposeHtml lista mis rutinas; publicar deshabilitado si 0 ejercicios
//   FD5 cmtyPublish → insert community_posts con payload ALLOW-LIST (sin note/kg/imgUrl; day→days)
//   FD6 cmtyPostHeart → insert reaction(context=postId, to_user=autor); no puedo reaccionar a lo mío
//   FD7 cmtyDeletePost → delete community_posts
//   FD8 SELLADO en localhost → cero escrituras
//   FD9 XSS: handle/nombre maliciosos escapados en el HTML del muro
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8807;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9319', '--user-data-dir=' + process.env.TEMP + '/feed-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9319/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof cmtyPublish==='function' && typeof _cmtyFeedHtml==='function' && !document.getElementById('avi-loading')`);
await sleep(1200);

const ME = 'me-1', PUB = 'pub-1', P_PUB = 'post-pub', P_ME = 'post-me';
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client'); document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  // Rutinas propias para el picker de publicar: una VÁLIDA (con basura a descartar) + una VACÍA
  DB.clients=[{id:'me',name:'Camila',habits:{water:{},steps:{}},routines:[
    {id:'r1',name:'Full body A',day:'Lunes',restSec:90,note:'peso 100kg dolor rodilla',
     exercises:[{id:'e1',name:'Sentadilla',muscle:'piernas',type:'peso_reps',sets:3,reps:'8-12',imgUrl:'http://x',kg:80},
                {id:'e2',name:'Press banca',muscle:'pecho',sets:4,reps:10}]},
    {id:'r2',name:'Rutina vacía',day:'Martes',exercises:[]}
  ]}]; CUR.clientId='me'; CUR.loggedAs='client';
  window.__calls=[];
  window.__myprofile={user_id:'${ME}',handle:'Camila',visible:true,is_private:false,role:'client',streak_weeks:2,level:2,show_today:true,show_last_active:false};
  window.__allp=[{user_id:'${PUB}',handle:'<b>Publi</b>',is_private:false,role:'coach',streak_weeks:5,level:3,sessions_4w:12}];
  window.__fr=[];
  window.__fol=[{follower:'${ME}',followee:'${PUB}',state:'active'}];
  window.__posts=[
    {id:'${P_PUB}',user_id:'${PUB}',created_at:'2026-07-21T10:00:00Z',payload:{name:'Pierna dura <script>',days:'Lunes',exercises:[{name:'Sentadilla',muscle:'piernas',sets:'4',reps:'8'},{name:'Peso muerto',sets:'3',reps:'5'}]}},
    {id:'${P_ME}',user_id:'${ME}',created_at:'2026-07-20T10:00:00Z',payload:{name:'Mi rutina',days:'Jueves',exercises:[{name:'Remo',muscle:'espalda',sets:'4',reps:'10'}]}}
  ];
  window.__profrx=[]; // hearts de perfil (context null) — ninguno
  window.__postrx=[{from_user:'${ME}',context:'${P_PUB}'},{from_user:'x',context:'${P_PUB}'}]; // 2 ❤️ en P_PUB, uno mío
  const rec=(op,t,p)=>window.__calls.push({op,t,p});
  const b=(t)=>{ const o={ _ctx:false,
    select(){return o;}, insert(p){rec('insert',t,p);return o;}, update(p){rec('update',t,p);return o;}, delete(){rec('delete',t);return o;},
    or(){return o;}, eq(){return o;}, neq(){return o;}, in(col){ if(col==='context')o._ctx=true; return o;}, order(){return o;}, limit(){return o;},
    maybeSingle(){return Promise.resolve({data:(t==='community_profiles')?window.__myprofile:null,error:null});},
    then(r){ const data = t==='friendships'?window.__fr : t==='community_profiles'?window.__allp : t==='follows'?window.__fol
      : t==='community_posts'?window.__posts : t==='community_reactions'?(o._ctx?window.__postrx:window.__profrx) : [];
      r({data,error:null}); } };
    return o; };
  AUTH.client=()=>({ from:(t)=>b(t), rpc:()=>Promise.resolve({data:[],error:null}),
    functions:{invoke:async()=>({data:{},error:null})}, channel:()=>({on(){return this;},subscribe(){return this;}}), removeChannel(){} });
  AUTH.getUser=async()=>({id:'${ME}'});
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// ── FD1: cargar posts + hearts ──
const fd1 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; await cmtyLoad();
  return JSON.stringify({ posts:CMTY.posts.map(p=>p.id), hearts:CMTY.postHearts, mine:CMTY.postHeartMine }); })()`);
const d1 = JSON.parse(fd1);
ok('FD1 muro carga posts de a quien sigo (active) + míos', d1.posts.includes(P_PUB) && d1.posts.includes(P_ME));
ok('FD1 conteo de ❤️ (P_PUB=2) y mi ❤️ marcado', d1.hearts[P_PUB] === 2 && d1.mine[P_PUB] === true);

// ── FD2: render del muro ──
const fd2 = await ev(`(()=>{ const h=_cmtyFeedHtml(); return JSON.stringify({
  name:/Pierna dura/.test(h), days:/Lunes/.test(h), ex:/Sentadilla/.test(h)&&/Peso muerto/.test(h),
  count:/>2</.test(h), compose:/Publicar una de mis rutinas/.test(h) }); })()`);
const d2 = JSON.parse(fd2);
ok('FD2 tarjeta: nombre + días + ejercicios visibles', d2.name && d2.days && d2.ex);
ok('FD2 conteo de ❤️ pintado + botón de publicar', d2.count && d2.compose);

// ── FD9: XSS — el <script> del nombre y el <b> del handle van escapados ──
const fd9 = await ev(`(()=>{ const h=_cmtyFeedHtml(); return JSON.stringify({
  noRawScript: !/Pierna dura <script>/.test(h) && /&lt;script&gt;/.test(h),
  noRawB: !/<b>Publi<\\/b>/.test(h) && /&lt;b&gt;Publi/.test(h) }); })()`);
const d9 = JSON.parse(fd9);
ok('FD9 XSS: nombre y handle maliciosos escapados', d9.noRawScript && d9.noRawB);

// ── FD3: muro vacío ──
const fd3 = await ev(`(()=>{ const saved=CMTY.posts; CMTY.posts=[]; const h=_cmtyFeedHtml(); CMTY.posts=saved;
  return JSON.stringify({ empty:/tranquilo|publica/i.test(h) }); })()`);
ok('FD3 muro vacío → estado vacío accionable', JSON.parse(fd3).empty);

// ── FD4: compose lista rutinas; vacía deshabilitada ──
const fd4 = await ev(`(()=>{ CMTY.composeOpen=true; const h=_cmtyComposeHtml(); CMTY.composeOpen=false;
  return JSON.stringify({ hasR1:/Full body A/.test(h), hasR2:/Rutina vac/.test(h),
    pubEnabled:/cmtyPublish\\(0\\)/.test(h), emptyDisabled:/disabled onclick="cmtyPublish\\(1\\)"/.test(h) }); })()`);
const d4 = JSON.parse(fd4);
ok('FD4 compose lista mis rutinas', d4.hasR1 && d4.hasR2);
ok('FD4 rutina con ejercicios habilitada, vacía deshabilitada', d4.pubEnabled && d4.emptyDisabled);

// ── FD5: publicar → insert con payload allow-list ──
const fd5 = await ev(`(async()=>{ window.__calls=[]; await cmtyPublish(0);
  const ins=window.__calls.find(c=>c.op==='insert'&&c.t==='community_posts');
  if(!ins) return JSON.stringify({inserted:false});
  const p=ins.p.payload; const topKeys=Object.keys(p).sort().join(','); const exKeys=Object.keys(p.exercises[0]).sort().join(',');
  return JSON.stringify({ inserted:true, uid:ins.p.user_id==='${ME}', kind:ins.p.kind==='routine',
    topKeys, days:p.days==='Lunes', exKeys, noNote:!('note' in p), noKg:!('kg' in p.exercises[0]), noImg:!('imgUrl' in p.exercises[0]) }); })()`);
const d5 = JSON.parse(fd5);
ok('FD5 publicar → insert community_posts(user_id=yo, kind=routine)', d5.inserted && d5.uid && d5.kind);
ok('FD5 payload allow-list (name,days,exercises; sin note/kg/imgUrl; day→days)',
  d5.topKeys === 'days,exercises,name' && d5.days && d5.exKeys === 'muscle,name,reps,sets,type' && d5.noNote && d5.noKg && d5.noImg);

// ── FD6: ❤️ en post + no reaccionar a lo mío ──
const fd6 = await ev(`(async()=>{ window.__calls=[]; await cmtyPostHeart('${P_ME}','${ME}');
  const selfInsert=window.__calls.some(c=>c.op==='insert'&&c.t==='community_reactions');
  window.__calls=[]; CMTY.postHeartMine['${P_PUB}']=false; await cmtyPostHeart('${P_PUB}','${PUB}');
  const ins=window.__calls.find(c=>c.op==='insert'&&c.t==='community_reactions');
  return JSON.stringify({ blockedSelf:!selfInsert, inserted:!!ins,
    ctx:ins&&ins.p.context==='${P_PUB}', to:ins&&ins.p.to_user==='${PUB}', from:ins&&ins.p.from_user==='${ME}' }); })()`);
const d6 = JSON.parse(fd6);
ok('FD6 no puedo reaccionar a mi propio post', d6.blockedSelf);
ok('FD6 ❤️ a post ajeno → insert reaction(context=post, to_user=autor, from=yo)', d6.inserted && d6.ctx && d6.to && d6.from);

// ── FD7: eliminar mi post ──
const fd7 = await ev(`(async()=>{ window.__calls=[]; await cmtyDeletePost('${P_ME}');
  return JSON.stringify({ deleted: window.__calls.some(c=>c.op==='delete'&&c.t==='community_posts') }); })()`);
ok('FD7 eliminar → delete community_posts', JSON.parse(fd7).deleted);

// ── FD8: sellado en localhost ──
const fd8 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; window.__calls=[];
  await cmtyPublish(0); await cmtyPostHeart('${P_PUB}','${PUB}'); await cmtyDeletePost('${P_ME}');
  return JSON.stringify({ sealed: window.__calls.length===0 }); })()`);
ok('FD8 sellado en localhost → cero escrituras', JSON.parse(fd8).sealed);

// ── R1 re-forma: router de vistas (muro / ajustes / bandeja) ──
const r1 = await ev(`(()=>{
  CMTY.view='feed'; _cmtyPaint();
  const host=document.getElementById('cn-community'); const feed=host.innerHTML;
  const feedHasCompose=/Publicar una de mis rutinas/.test(feed);
  const feedHasGear=/cmtyGoView\\('settings'\\)/.test(feed);
  const feedHasInbox=/cmtyGoView\\('inbox'\\)/.test(feed);
  const feedNoProfile=!/Tu código/.test(feed) && !/Salir de la comunidad/.test(feed);
  cmtyGoView('settings'); const set=document.getElementById('cn-community').innerHTML;
  const setHasCode=/Tu código/.test(set) && /Salir de la comunidad/.test(set);
  const setHasBack=/cmtyGoView\\('feed'\\)/.test(set);
  const setNoFeed=!/Publicar una de mis rutinas/.test(set);
  cmtyGoView('inbox'); const inb=document.getElementById('cn-community').innerHTML;
  const inbHasMsgs=/Mensajes/.test(inb) && /cmtyGoView\\('feed'\\)/.test(inb);
  cmtyGoView('feed'); const back=document.getElementById('cn-community').innerHTML;
  const backToFeed=/Publicar una de mis rutinas/.test(back) && !/Tu código/.test(back);
  return JSON.stringify({feedHasCompose,feedHasGear,feedHasInbox,feedNoProfile,setHasCode,setHasBack,setNoFeed,inbHasMsgs,backToFeed});
})()`);
const dr1 = JSON.parse(r1);
ok('R1 vista MURO por defecto: muro + engranaje + sobre, SIN tarjeta de perfil',
  dr1.feedHasCompose && dr1.feedHasGear && dr1.feedHasInbox && dr1.feedNoProfile);
ok('R1 engranaje → Ajustes (código + salir + volver), sin muro', dr1.setHasCode && dr1.setHasBack && dr1.setNoFeed);
ok('R1 sobre → Mensajes (con volver)', dr1.inbHasMsgs);
ok('R1 volver → regresa al muro', dr1.backToFeed);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));

console.log(`\n  MURO/FEED: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
