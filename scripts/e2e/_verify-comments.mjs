// _verify-comments.mjs — v3-a #4: COMENTARIOS en el muro. Sin login, cliente stubbeado.
// Los candados reales (quién puede comentar, menores en ambas direcciones, rate-limit, borrado
// del moderador) son de la RLS y se probaron a nivel DB con la matriz K1-K14 + D1 (c16). Aquí se
// prueba lo que es del CLIENTE: pintado, escapado, saneo del texto, opt-in del hilo y sellado.
//   K13 XSS: un comentario con <img onerror> se pinta escapado y no ejecuta nada
//   C1  el hilo arranca CERRADO; el contador 💬 muestra N
//   C2  abrir el hilo → comentarios + input maxlength=280 + Enviar
//   C3  las TRES tarjetas (rutina, entreno, hito) tienen la fila de comentarios
//   C4  enviar → 1 insert con post_id/user_id y el texto SANEADO (communityCommentText)
//   C5  vacío / solo espacios → cero inserts (no se molesta al servidor con lo que va a rebotar)
//   C6  rebote de la RLS → mensaje honesto, sin pantalla rota
//   C7  «Borrar» solo donde cc_del lo permitiría (mío, o cualquiera en MI post); «Reportar» en los ajenos
//   C8  borrar → delete sobre community_comments
//   C9  reportar → insert en community_reports con context 'comment:<id>' y SIN bloquear al autor
//   C10 sellado en localhost → cero escrituras a la nube
//   C11 el borrador sobrevive a un repintado (un DM entrante repinta el panel)
//   C12 estado vacío del hilo (nadie ha comentado)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8847;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9357', '--user-data-dir=' + process.env.TEMP + '/cmt-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9357/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await waitFor(`typeof cmtyComment==='function' && typeof _cmtyThreadHtml==='function' && typeof communityCommentText==='function' && !document.getElementById('avi-loading')`);
await sleep(900);

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };
const ME = 'me-1', OTHER = 'other-1';
const XSS = '<img src=x onerror=window.__pwned=1>';

// Estado de comunidad + cliente stubbeado que REGISTRA cada escritura
const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  window.__w=[]; window.__toasts=[]; window.__failIns=false;
  window.toast=(m)=>{window.__toasts.push(m);};
  const thread=()=>Promise.resolve({data:(window.__cmts||[]).filter(c=>c.post_id===window.__reloadPost),error:null});
  AUTH.client=()=>({
    from:(t)=>({
      insert:(p)=>{ window.__w.push({op:'insert',t,p});
        return Promise.resolve({error: window.__failIns ? {message:'new row violates row-level security policy for table "community_comments"'} : null}); },
      delete:()=>({ eq:(c,v)=>{ window.__w.push({op:'delete',t,c,v}); return Promise.resolve({error:null}); } }),
      select:()=>({ in:()=>({order:()=>({limit:thread})}), eq:(c,v)=>{ window.__reloadPost=v; return {order:()=>({limit:thread})}; } })
    }),
    rpc:()=>Promise.resolve({data:[],error:null})
  });
  AUTH.getUser=async()=>({id:'${ME}'});
  CMTY.uid='${ME}'; CMTY.loaded=true; CMTY.loading=false; CMTY.offline=false; CMTY.view='feed';
  CMTY.profile={user_id:'${ME}',handle:'Cami',visible:true,is_private:true};
  CMTY.friends=[]; CMTY.gym=[]; CMTY.incoming=[]; CMTY.outgoing=[]; CMTY.discover=[]; CMTY.followerReqs=[];
  CMTY.following={}; CMTY.dmThreads=[]; CMTY.activity={};
  CMTY.profById={'${OTHER}':{user_id:'${OTHER}',handle:'Ana',streak_weeks:4}};
  CMTY.posts=[
    {id:'p1',user_id:'${OTHER}',kind:'workout',payload:{name:'Pierna',exercises_count:5,duration_min:52},created_at:'2026-07-23T10:00:00Z'},
    {id:'p2',user_id:'${ME}',kind:'routine',payload:{name:'Mi rutina',exercises:[{name:'Sentadilla',sets:4,reps:10}]},created_at:'2026-07-23T09:00:00Z'},
    {id:'p3',user_id:'${OTHER}',kind:'streak',payload:{weeks:4},created_at:'2026-07-23T08:00:00Z'}
  ];
  CMTY.postHearts={}; CMTY.postHeartMine={}; CMTY.threadOpen=null; CMTY.cmtDraft={};
  window.__cmts=[
    {id:'c1',post_id:'p1',user_id:'${OTHER}',text:${JSON.stringify(XSS)},created_at:'2026-07-23T10:05:00Z'},
    {id:'c2',post_id:'p1',user_id:'${ME}',text:'mi comentario',created_at:'2026-07-23T10:06:00Z'},
    {id:'c3',post_id:'p2',user_id:'${OTHER}',text:'buena rutina',created_at:'2026-07-23T09:30:00Z'}
  ];
  CMTY.postComments={p1:window.__cmts.filter(c=>c.post_id==='p1'),p2:window.__cmts.filter(c=>c.post_id==='p2')};
  _cmtyPaint();
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// C1 · hilo cerrado por defecto + contador
const c1 = await ev(`(()=>{ const h=document.getElementById('cn-community').innerHTML;
  return JSON.stringify({ cerrado: !document.getElementById('cmt-in-p1'),
    conta2: /aria-expanded="false"[^>]*onclick="cmtyToggleThread\\('p1'\\)"[^>]*>[^<]*<svg[\\s\\S]*?<\\/svg> <span[^>]*>2<\\/span>/.test(h),
    hayBoton: h.indexOf("cmtyToggleThread('p1')")>0 }); })()`);
const d1 = JSON.parse(c1);
ok('C1 el hilo arranca CERRADO y el botón 💬 muestra el conteo (2)', d1.cerrado && d1.hayBoton && d1.conta2);

// C3 · las tres tarjetas tienen la fila de comentarios
const c3 = await ev(`(()=>{ const h=document.getElementById('cn-community').innerHTML;
  return JSON.stringify({ p1:h.indexOf("cmtyToggleThread('p1')")>0, p2:h.indexOf("cmtyToggleThread('p2')")>0, p3:h.indexOf("cmtyToggleThread('p3')")>0 }); })()`);
const d3 = JSON.parse(c3);
ok('C3 rutina, entreno E hito tienen fila de comentarios', d3.p1 && d3.p2 && d3.p3);

// C2 + K13 · abrir el hilo: comentarios, input 280, XSS escapado
await ev(`cmtyToggleThread('p1')`); await sleep(150);
const c2 = await ev(`(()=>{ const inp=document.getElementById('cmt-in-p1');
  const host=document.getElementById('cn-community'); const h=host.innerHTML;
  return JSON.stringify({ input:!!inp, max:inp&&inp.getAttribute('maxlength'),
    enviar:/Enviar<\\/button>/.test(h), ana:/Ana/.test(h), mio:/mi comentario/.test(h),
    escapado: h.indexOf('&lt;img src=x')>0 && h.indexOf('<img src=x onerror')<0,
    pwned: !!window.__pwned, imgs: host.querySelectorAll('img[src="x"]').length,
    otroCerrado: !document.getElementById('cmt-in-p2') }); })()`);
const d2 = JSON.parse(c2);
ok('C2 hilo abierto → comentarios + input maxlength=280 + Enviar', d2.input && d2.max === '280' && d2.enviar && d2.ana && d2.mio);
ok('K13 XSS: el comentario se pinta ESCAPADO, no se crea el <img> ni se ejecuta', d2.escapado && !d2.pwned && d2.imgs === 0);
ok('C1b un solo hilo abierto a la vez', d2.otroCerrado);

// C7 · botones según cc_del (mío / mi post / ajeno en post ajeno)
const c7 = await ev(`(()=>{ const h=_cmtyThreadHtml(CMTY.posts[0]); const h2=_cmtyThreadHtml(CMTY.posts[1]);
  const borrarC1=h.indexOf("cmtyDeleteComment('c1'")>0, borrarC2=h.indexOf("cmtyDeleteComment('c2'")>0;
  CMTY.threadOpen='p2'; const t2=_cmtyThreadHtml(CMTY.posts[1]); CMTY.threadOpen='p1';
  return JSON.stringify({ borrarAjenoEnPostAjeno:borrarC1, borrarMio:borrarC2,
    reportarAjeno:h.indexOf("cmtyReportComment('c1'")>0, reportarMio:h.indexOf("cmtyReportComment('c2'")>0,
    borrarAjenoEnMiPost:t2.indexOf("cmtyDeleteComment('c3'")>0 }); })()`);
const d7 = JSON.parse(c7);
ok('C7 «Borrar» en el mío y en cualquiera de MI post; no en el ajeno de un post ajeno',
  d7.borrarMio && d7.borrarAjenoEnMiPost && !d7.borrarAjenoEnPostAjeno);
ok('C7b «Reportar» en los ajenos, nunca en el mío', d7.reportarAjeno && !d7.reportarMio);

// C4 · enviar → insert con el texto SANEADO
const c4 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; window.__w=[]; window.__toasts=[];
  const inp=document.getElementById('cmt-in-p1'); inp.value='   ¡vas durísimo! 💪   ';
  window.__cmts.push({id:'c9',post_id:'p1',user_id:'${ME}',text:'¡vas durísimo! 💪',created_at:'2026-07-23T11:00:00Z'});
  await cmtyComment('p1');
  const ins=window.__w.filter(w=>w.op==='insert'&&w.t==='community_comments');
  return JSON.stringify({ n:ins.length, post:ins[0]&&ins[0].p.post_id, uid:ins[0]&&ins[0].p.user_id,
    text:ins[0]&&ins[0].p.text, esperado:communityCommentText('   ¡vas durísimo! 💪   '),
    draftLimpio:!CMTY.cmtDraft['p1'], repintado:/vas durísimo/.test(document.getElementById('cn-community').innerHTML) }); })()`);
const d4 = JSON.parse(c4);
ok('C4 enviar → 1 insert con post_id/user_id y el texto saneado por communityCommentText',
  d4.n === 1 && d4.post === 'p1' && d4.uid === ME && d4.text === d4.esperado && d4.text === '¡vas durísimo! 💪');
ok('C4b tras publicar: el borrador se limpia y el hilo se repinta con el comentario', d4.draftLimpio && d4.repintado);

// C5 · vacío / espacios → cero inserts
const c5 = await ev(`(async()=>{ window.__w=[]; window.__toasts=[];
  const inp=document.getElementById('cmt-in-p1'); inp.value='   '; await cmtyComment('p1');
  inp.value=''; await cmtyComment('p1');
  return JSON.stringify({ n:window.__w.length, toasts:window.__toasts.length }); })()`);
const d5 = JSON.parse(c5);
ok('C5 vacío y solo-espacios → cero inserts + aviso al usuario', d5.n === 0 && d5.toasts === 2);

// C6 · rebote de la RLS → mensaje honesto (fail-visible, no fail-broken)
const c6 = await ev(`(async()=>{ window.__w=[]; window.__toasts=[]; window.__failIns=true;
  const inp=document.getElementById('cmt-in-p1'); inp.value='hola';
  await cmtyComment('p1'); window.__failIns=false;
  return JSON.stringify({ toast:window.__toasts[0]||'', vivo:!!document.getElementById('cmt-in-p1'),
    habilitado:!document.getElementById('cmt-in-p1').disabled }); })()`);
const d6 = JSON.parse(c6);
ok('C6 rebote de la RLS → «Esta publicación no acepta tus comentarios.» y la UI sigue viva',
  d6.toast === 'Esta publicación no acepta tus comentarios.' && d6.vivo && d6.habilitado);

// C8 · borrar
const c8 = await ev(`(async()=>{ window.__w=[]; window.__cmts=window.__cmts.filter(c=>c.id!=='c2');
  await cmtyDeleteComment('c2','p1');
  const del=window.__w.filter(w=>w.op==='delete'&&w.t==='community_comments');
  return JSON.stringify({ n:del.length, campo:del[0]&&del[0].c, id:del[0]&&del[0].v,
    yaNoEsta: document.getElementById('cn-community').innerHTML.indexOf('mi comentario')<0 }); })()`);
const d8 = JSON.parse(c8);
ok('C8 borrar → delete por id sobre community_comments y desaparece del hilo',
  d8.n === 1 && d8.campo === 'id' && d8.id === 'c2' && d8.yaNoEsta);

// C9 · reportar un comentario (context) SIN bloquear al autor
const c9 = await ev(`(async()=>{ window.__w=[]; window.__toasts=[];
  await cmtyReportComment('c1','${OTHER}');
  const rep=window.__w.filter(w=>w.t==='community_reports');
  const bloq=window.__w.filter(w=>w.t==='friendships');
  return JSON.stringify({ n:rep.length, ctx:rep[0]&&rep[0].p.context, quien:rep[0]&&rep[0].p.reported,
    sinBloqueo:bloq.length===0, toast:window.__toasts[0]||'' }); })()`);
const d9 = JSON.parse(c9);
ok('C9 reportar → community_reports con context «comment:<id>», sin bloquear al autor',
  d9.n === 1 && d9.ctx === 'comment:c1' && d9.quien === OTHER && d9.sinBloqueo && /revisaremos/i.test(d9.toast));

// C11 · el borrador sobrevive a un repintado
const c11 = await ev(`(()=>{ CMTY.cmtDraft={}; const inp=document.getElementById('cmt-in-p1');
  inp.value='a medio escribir'; cmtyCommentDraft('p1','a medio escribir');
  _cmtyPaint();  // un DM entrante repinta el panel entero
  const inp2=document.getElementById('cmt-in-p1');
  return JSON.stringify({ valor:inp2&&inp2.value, abierto:!!inp2 }); })()`);
const d11 = JSON.parse(c11);
ok('C11 el borrador sobrevive a un repintado del panel', d11.abierto && d11.valor === 'a medio escribir');

// C12 · estado vacío del hilo
const c12 = await ev(`(()=>{ CMTY.postComments['p3']=[]; CMTY.threadOpen='p3';
  const h=_cmtyThreadHtml(CMTY.posts[2]); CMTY.threadOpen='p1';
  return /Todavía nadie ha comentado/.test(h) && /cmt-in-p3/.test(h); })()`);
ok('C12 hilo sin comentarios → estado vacío accionable (con su input)', c12);

// C10 · sellado en localhost
const c10 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; window.__w=[];
  const inp=document.getElementById('cmt-in-p1'); if(inp) inp.value='no debe salir';
  await cmtyComment('p1'); await cmtyDeleteComment('c1','p1'); await cmtyReportComment('c1','${OTHER}');
  return window.__w.length===0; })()`);
ok('C10 sellado en localhost → cero escrituras a la nube', c10);

// ── Capturas (R2.6: se MIRAN, no solo se generan) — hilo abierto, claro y oscuro, 390px ──
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = (process.env.TEMP || '/tmp') + '/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
await ev(`(()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; CMTY.cmtDraft={};
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  CMTY.postComments['p1']=[{id:'c1',post_id:'p1',user_id:'${OTHER}',text:'¡Vas durísimo! ¿Qué rutina es esa? 💪',created_at:'2026-07-23T10:05:00Z'},
    {id:'c2',post_id:'p1',user_id:'${ME}',text:'Gracias, es la de pierna que me armó el coach.',created_at:'2026-07-23T10:06:00Z'}];
  CMTY.threadOpen='p1'; _cmtyPaint(); return 1; })()`);
await sleep(250);
for (const tema of ['light', 'dark']) {
  await ev(`(()=>{ if(typeof setTheme==='function') setTheme('${tema}'); document.body.classList.toggle('dark', ${tema === 'dark'}); return 1; })()`);
  await sleep(250);
  const h = await ev(`Math.max(document.getElementById('cn-community').scrollHeight+120, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/comments-${tema}.png`, Buffer.from(shot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
console.log('  shots en:', OUT);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));
console.log(`\n  COMENTARIOS: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
