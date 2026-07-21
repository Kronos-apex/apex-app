// _verify-dm.mjs — COMUNIDAD v2 ① CHAT EN VIVO (DMs Realtime, app-7). Sin login (sintetiza el
// asesorado + un cliente Supabase FALSO que graba llamadas y no toca la nube; el sello
// cloudWriteSealed protege en localhost). Verifica la LÓGICA del cliente del chat:
//   DM1 agrupación de la bandeja (último msg + no-leídos por interlocutor, orden reciente)
//   DM2 render de la bandeja: badge "N sin leer" + handle ESCAPADO (XSS)
//   DM3 handler Realtime INSERT en hilo abierto → aparece + marca leído
//   DM4 handler Realtime INSERT en OTRO hilo → sube la bandeja + incrementa no-leídos
//   DM5 handler Realtime UPDATE (acuse de leído) de un mensaje MÍO → "leído" en el hilo
//   DM6 XSS del texto: la burbuja usa textContent (un <img onerror> NO se inyecta al DOM)
//   DM7 enviar SELLADO en localhost (no escribe) ; DM8 con AVI_ALLOW_CLOUD_WRITE el insert va con from/to/text correctos
//   DM9 marcar leído escribe SOLO read_at por id (única columna client-writable)
// Aserciones DURAS: exit 1 si algo falla. #9 de §13-BIS.8 (Realtime respeta RLS por-suscriptor)
// se prueba a nivel DB (cm_sel aísla; ver migración c6) — aquí se prueba el CABLEADO del handler.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const PORT = 8801;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9311', '--user-data-dir=' + process.env.TEMP + '/dm-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9311/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderCommunity==='function' && typeof cmtyChatOpen==='function' && !document.getElementById('avi-loading')`);
await sleep(1200);

const MYUID = 'me-uid-0001', F1 = 'peer-f1', G1 = 'peer-g1';
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

// Instala escenario + cliente FALSO que soporta community_messages.
const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  DB.clients=[{id:'me',name:'Camila',routines:[],habits:{water:{},steps:{}}}]; CUR.clientId='me'; CUR.loggedAs='client';
  // Estado de comunidad ya "cargado": mi perfil + un amigo (F1) + un compañero de gym (G1)
  CMTY.uid='${MYUID}'; CMTY.loaded=true; CMTY.offline=false;
  CMTY.profile={user_id:'${MYUID}',handle:'Camila',share_code:'ABCD1234',streak_weeks:2,level:2,visible:true,show_today:true};
  CMTY.friends=[{fid:'${F1}',fr:{id:'fr1'},prof:{user_id:'${F1}',handle:'<b>Andrea</b>',streak_weeks:3,level:2}}];
  CMTY.gym=[{user_id:'${G1}',handle:'Marcela',streak_weeks:1,level:1}];
  CMTY.dmThreads=[]; CMTY.dmUnread=0; CMTY.dmOpen=null; CMTY.dmMsgs=[];
  window.__cm=[]; window.__cmSeq=0; window.__cmRows=[];
  const cmBuilder=()=>{ let _p=null, _asc=null; const b={
    select(){return b;}, insert(p){_p=p;window.__cm.push({op:'insert',p});return b;},
    update(p){_p=p;window.__cm.push({op:'update',p});return b;}, delete(){window.__cm.push({op:'delete'});return b;},
    or(){return b;}, eq(){return b;}, in(col,ids){window.__cm.push({op:'in',col,ids});return b;},
    order(col,opts){ _asc = opts?!!opts.ascending:false; return b; }, limit(){return b;},
    single(){ const row=Object.assign({id:'m'+(++window.__cmSeq),created_at:new Date().toISOString(),read_at:null}, _p); return Promise.resolve({data:row,error:null}); },
    maybeSingle(){return Promise.resolve({data:null,error:null});},
    then(res){ let rows=(window.__cmRows||[]).slice(); if(_asc!==null){ rows.sort((x,y)=>{const a=x.created_at,c=y.created_at; return _asc?(a<c?-1:a>c?1:0):(a<c?1:a>c?-1:0);}); } res({data:rows,error:null}); } };
    return b; };
  const genBuilder=(t)=>({ select(){return this;}, insert(){return this;}, update(){return this;}, delete(){return this;},
    or(){return this;}, eq(){return this;}, neq(){return this;}, in(){return this;}, order(){return this;}, limit(){return this;},
    maybeSingle(){return Promise.resolve({data:CMTY.profile,error:null});}, then(r){r({data:[],error:null});} });
  AUTH.client=()=>({ from:(t)=> t==='community_messages'?cmBuilder():genBuilder(t),
    channel:()=>({on(){return this;},subscribe(){return this;}}), removeChannel(){}, rpc:()=>Promise.resolve({data:[],error:null}),
    functions:{invoke:async()=>({data:{},error:null})} });
  AUTH.getUser=async()=>({id:'${MYUID}'});
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// ── DM1: agrupación de la bandeja ──
const dm1 = await ev(`(async()=>{
  const now=Date.now();
  window.__cmRows=[
    {id:'a1',from_user:'${F1}',to_user:'${MYUID}',text:'hola',created_at:new Date(now-60000).toISOString(),read_at:null},
    {id:'a2',from_user:'${MYUID}',to_user:'${F1}',text:'qué más',created_at:new Date(now-50000).toISOString(),read_at:new Date().toISOString()},
    {id:'b1',from_user:'${G1}',to_user:'${MYUID}',text:'listo 💪',created_at:new Date(now-10000).toISOString(),read_at:null},
    {id:'a3',from_user:'${F1}',to_user:'${MYUID}',text:'nos vemos',created_at:new Date(now-5000).toISOString(),read_at:null}
  ];
  await _cmtyLoadDMs(AUTH.client(), '${MYUID}');
  return JSON.stringify({n:CMTY.dmThreads.length, unread:CMTY.dmUnread, first:CMTY.dmThreads[0].uid, firstUnread:CMTY.dmThreads[0].unread, firstLast:CMTY.dmThreads[0].last, secondUnread:CMTY.dmThreads[1].unread});
})()`);
const d1 = JSON.parse(dm1);
ok('DM1 dos hilos agrupados', d1.n === 2);
ok('DM1 el más reciente (F1) va primero', d1.first === F1 && d1.firstLast === 'nos vemos');
ok('DM1 no-leídos F1=2 (a1,a3; a2 es mío)', d1.firstUnread === 2);
ok('DM1 total sin leer = 3 (2 de F1 + 1 de G1)', d1.unread === 3);

// ── DM2: render de la bandeja (badge + XSS del handle) ──
const dm2 = await ev(`(()=>{ const h=_cmtyInboxHtml(); return JSON.stringify({badge:/3 sin leer/.test(h), rawTag:h.includes('<b>Andrea'), esc:h.includes('&lt;b&gt;Andrea')}); })()`);
const d2 = JSON.parse(dm2);
ok('DM2 badge "3 sin leer"', d2.badge);
ok('DM2 handle con HTML NO se inyecta crudo', !d2.rawTag);
ok('DM2 handle escapado', d2.esc);

// ── DM3: Realtime INSERT en hilo abierto → aparece + intenta marcar leído ──
const dm3 = await ev(`(async()=>{
  window.AVI_ALLOW_CLOUD_WRITE=true;   // permite el markread contra el STUB (no la nube real)
  CMTY.dmOpen='${F1}'; CMTY.dmMsgs=[{id:'a1',from_user:'${F1}',to_user:'${MYUID}',text:'hola',created_at:new Date().toISOString(),read_at:new Date().toISOString()}];
  const el=document.getElementById('cmty-chat'); if(el)el.classList.add('on');
  window.__cm=[];
  cmtyDmRealtime({eventType:'INSERT', new:{id:'z9',from_user:'${F1}',to_user:'${MYUID}',text:'entra en vivo',created_at:new Date().toISOString(),read_at:null}});
  await new Promise(r=>setTimeout(r,60));
  return JSON.stringify({inThread:CMTY.dmMsgs.some(m=>m.id==='z9'), markCall:window.__cm.some(c=>c.op==='update'&&c.p&&('read_at' in c.p))});
})()`);
const d3 = JSON.parse(dm3);
ok('DM3 INSERT del hilo abierto aparece', d3.inThread);
ok('DM3 marca leído el entrante (update read_at)', d3.markCall);

// ── DM4: Realtime INSERT en OTRO hilo → bandeja sube + no-leídos ──
const dm4 = await ev(`(()=>{
  CMTY.dmOpen='${F1}';  // hilo de F1 abierto → un msg de G1 es "otro hilo"
  const before=CMTY.dmUnread;
  cmtyDmRealtime({eventType:'INSERT', new:{id:'g9',from_user:'${G1}',to_user:'${MYUID}',text:'nuevo de gym',created_at:new Date(Date.now()+1000).toISOString(),read_at:null}});
  const th=CMTY.dmThreads.find(t=>t.uid==='${G1}');
  return JSON.stringify({unreadUp:CMTY.dmUnread===before+1, top:CMTY.dmThreads[0].uid==='${G1}', last:th&&th.last==='nuevo de gym'});
})()`);
const d4 = JSON.parse(dm4);
ok('DM4 no-leídos del otro hilo +1', d4.unreadUp);
ok('DM4 el otro hilo sube al tope', d4.top && d4.last);

// ── DM5: Realtime UPDATE (acuse de leído de un mensaje MÍO) ──
const dm5 = await ev(`(()=>{
  CMTY.dmOpen='${F1}'; CMTY.dmMsgs=[{id:'mine1',from_user:'${MYUID}',to_user:'${F1}',text:'hey',created_at:new Date().toISOString(),read_at:null}];
  cmtyDmRealtime({eventType:'UPDATE', new:{id:'mine1',from_user:'${MYUID}',to_user:'${F1}',text:'hey',created_at:new Date().toISOString(),read_at:new Date().toISOString()}});
  const m=CMTY.dmMsgs.find(x=>x.id==='mine1');
  const thread=document.getElementById('cmtychat-thread');
  return JSON.stringify({readSet:!!(m&&m.read_at), shownLeido:/leído/.test(thread?thread.textContent:'')});
})()`);
const d5 = JSON.parse(dm5);
ok('DM5 acuse marca read_at en el mensaje propio', d5.readSet);
ok('DM5 el hilo muestra "leído"', d5.shownLeido);

// ── DM6: XSS del TEXTO en la burbuja (textContent, sin inyección) ──
const dm6 = await ev(`(()=>{
  CMTY.dmOpen='${F1}';
  CMTY.dmMsgs=[{id:'x1',from_user:'${F1}',to_user:'${MYUID}',text:'<img src=x onerror=window.__xss=1>',created_at:new Date().toISOString(),read_at:null}];
  window.__xss=0; _cmtyChatRender(true);
  const th=document.getElementById('cmtychat-thread');
  return JSON.stringify({noImg:!th.querySelector('img'), textKept:/<img src=x onerror/.test(th.textContent), xss:window.__xss});
})()`);
await sleep(120);
const d6 = JSON.parse(dm6);
ok('DM6 el <img> del texto NO se inyecta al DOM', d6.noImg);
ok('DM6 el texto crudo se conserva como TEXTO', d6.textKept);
ok('DM6 el onerror NO ejecutó (xss=0)', (await ev('window.__xss')) === 0);

// ── DM7: enviar SELLADO en localhost ──
const dm7 = await ev(`(async()=>{
  window.AVI_ALLOW_CLOUD_WRITE=false;   // sello activo
  CMTY.dmOpen='${F1}'; window.__cm=[];
  const ta=document.getElementById('cmtychat-in'); ta.value='hola sellado'; ta.disabled=false;
  await cmtyChatSend();
  return JSON.stringify({sealed:!window.__cm.some(c=>c.op==='insert'), valueKept:ta.value==='hola sellado'});
})()`);
const d7 = JSON.parse(dm7);
ok('DM7 enviar en localhost NO escribe a la nube (sellado)', d7.sealed);

// ── DM8: con cloud-write permitido, el insert va con from/to/text ──
const dm8 = await ev(`(async()=>{
  window.AVI_ALLOW_CLOUD_WRITE=true;
  CMTY.dmOpen='${F1}'; window.__cm=[];
  const ta=document.getElementById('cmtychat-in'); ta.value='mensaje real'; ta.disabled=false;
  await cmtyChatSend();
  const ins=window.__cm.find(c=>c.op==='insert');
  return JSON.stringify({sent:!!ins, from:ins&&ins.p.from_user==='${MYUID}', to:ins&&ins.p.to_user==='${F1}', text:ins&&ins.p.text==='mensaje real', cleared:ta.value===''});
})()`);
const d8 = JSON.parse(dm8);
ok('DM8 insert con from=yo, to=peer, text correcto', d8.sent && d8.from && d8.to && d8.text);
ok('DM8 el input se limpia tras enviar', d8.cleared);

// ── DM9: marcar leído escribe SOLO read_at, por id ──
const dm9 = await ev(`(async()=>{
  window.AVI_ALLOW_CLOUD_WRITE=true;
  CMTY.dmOpen='${F1}'; window.__cm=[];
  CMTY.dmMsgs=[{id:'u1',from_user:'${F1}',to_user:'${MYUID}',text:'x',created_at:new Date().toISOString(),read_at:null}];
  await _cmtyChatMarkRead();
  const upd=window.__cm.find(c=>c.op==='update');
  const keys=upd?Object.keys(upd.p):[];
  const inCall=window.__cm.find(c=>c.op==='in');
  return JSON.stringify({onlyReadAt:keys.length===1&&keys[0]==='read_at', byId:!!(inCall&&inCall.ids&&inCall.ids.indexOf('u1')>=0)});
})()`);
const d9 = JSON.parse(dm9);
ok('DM9 marca leído escribe SOLO read_at', d9.onlyReadAt);
ok('DM9 filtra por id (.in)', d9.byId);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));

// ── Capturas visuales (barra premium: móvil + ambos temas) ──
async function shot(name) {
  const h = await ev(`Math.max((document.getElementById('cmty-chat')?.classList.contains('on'))?844:(document.getElementById('cn-community').scrollHeight+80), 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('  shot', name, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
for (const theme of ['light', 'dark']) {
  await ev(`(()=>{ setTheme('${theme}');
    CMTY.dmOpen=null; const el=document.getElementById('cmty-chat'); if(el)el.classList.remove('on');
    CMTY.dmThreads=[
      {uid:'${F1}',prof:{handle:'Andrea',streak_weeks:3,level:2},last:'nos vemos mañana 💪',at:new Date().toISOString(),unread:2,lastFromMe:false},
      {uid:'${G1}',prof:{handle:'Marcela',streak_weeks:1,level:1},last:'listo, gracias',at:new Date(Date.now()-9e5).toISOString(),unread:0,lastFromMe:true}
    ]; CMTY.dmUnread=2; _cmtyPaint(); return 1; })()`);
  await sleep(250); await shot('dm-inbox-' + theme);
  await ev(`(async()=>{ CMTY.dmOpen='${F1}';
    window.__cmRows=[
      {id:'s1',from_user:'${F1}',to_user:'${MYUID}',text:'¿Vas al gym hoy?',created_at:new Date(Date.now()-6e5).toISOString(),read_at:new Date().toISOString()},
      {id:'s2',from_user:'${MYUID}',to_user:'${F1}',text:'Sí, a las 6. ¿Nos vemos?',created_at:new Date(Date.now()-5e5).toISOString(),read_at:new Date().toISOString()},
      {id:'s3',from_user:'${F1}',to_user:'${MYUID}',text:'De una 🔥 nos vemos mañana 💪',created_at:new Date(Date.now()-4e5).toISOString(),read_at:null}
    ];
    await cmtyChatOpen('${F1}'); return 1; })()`);
  await sleep(350); await shot('dm-chat-' + theme);
}

console.log(`\n  DM: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
