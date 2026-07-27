// _verify-community.mjs — COMUNIDAD (idea #5, Fase 1 · C3): pestaña del asesorado con perfil
// opt-in + amigos por código + ❤️. Sin login (sintetiza el asesorado). Usa un cliente Supabase
// FALSO que graba las llamadas (jamás toca la nube; además el sello cloudWriteSealed protege en
// localhost). Verifica: opt-in visible + gate de consentimiento, sello, XSS del handle escapado,
// avatar externo NO se pinta, stats de amigos, ❤️ toggle, offline degradado. Aserciones duras.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8799, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9308', '--user-data-dir=' + process.env.TEMP + '/cmty-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9308/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shot(n) {
  await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Comunidad/.test(x.textContent));if(t)t.click();})()`);
  await sleep(300);
  const h = await ev(`Math.max(document.getElementById('cn-community').scrollHeight+120, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderCommunity==='function' && typeof _cmtyPaint==='function' && !document.getElementById('avi-loading')`);
await sleep(1500);

const PREFIX = 'https://eoebhrxbokyllqalyecj.supabase.co/storage/v1/object/public/avatars/';
const MYUID = '00000000-0000-0000-0000-000000000001';

// Instala el cliente FALSO (graba llamadas, no red) + un asesorado sintético. AVI_ALLOW_CLOUD_WRITE
// se controla por test (para separar "sellado" de "flujo real permitido contra el stub").
const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  DB.clients=[{id:'me',name:'Camila',sex:'F',level:'Intermedio',goal:'Salud general',days:3,routines:[],habits:{water:{},steps:{}}}];
  CUR.clientId='me'; CUR.loggedAs='client';
  window.__cmtyCalls=[]; window.__profileRow=null; window.__resolveRet=[]; window.__xss=0;
  window.__frRows=[]; window.__allProfiles=[]; window.__rxRows=[];
  const rec=(table,op,p)=>window.__cmtyCalls.push({table,op,p});
  const builder=(table)=>{ let op='select';
    const b={ select(){return b;},
      insert(p){op='insert';rec(table,'insert',p);return b;},
      update(p){op='update';rec(table,'update',p);return b;},
      delete(){op='delete';rec(table,'delete',null);return b;},
      eq(){return b;}, neq(){return b;}, or(){return b;}, in(){return b;}, limit(){return b;},
      maybeSingle(){return Promise.resolve({data:(table==='community_profiles')?window.__profileRow:null,error:null});},
      then(resolve){ const data = table==='friendships' ? (window.__frRows||[]) : table==='community_profiles' ? (window.__allProfiles||[]) : table==='community_reactions' ? (window.__rxRows||[]) : []; resolve({data,error:null}); } };
    return b; };
  AUTH.client=()=>({ from:builder,
    rpc:(n,args)=>{rec('rpc',n,args);
      if(n==='cmty_gym_peers')return Promise.resolve({data:(window.__gymPeers||[]),error:window.__gymPeersErr||null});
      return Promise.resolve({data:window.__resolveRet,error:null});},
    functions:{invoke:async()=>({data:{ok:true},error:null})},
    storage:{from:()=>({upload:async()=>({data:{},error:null}),getPublicUrl:(p)=>({data:{publicUrl:'${PREFIX}'+p}})})} });
  AUTH.getUser=async()=>({id:'${MYUID}'});
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;

console.log('  install:', await ev(INSTALL)); await sleep(300);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// Estado sin perfil → opt-in
const setState = `(()=>{ CMTY.uid='${MYUID}'; CMTY.profile=null; CMTY.friends=[]; CMTY.incoming=[]; CMTY.outgoing=[]; CMTY.heartsGiven={}; CMTY.heartsRecv=0; CMTY.loaded=true; CMTY.loading=false; CMTY.busy=false; CMTY.offline=false; _cmtyPaint(); return 'ok'; })()`;

// CM1: opt-in visible (handle + 2 checkboxes + botón crear)
await ev(setState); await sleep(200);
const cm1 = await ev(`(()=>{const h=document.getElementById('cn-community');const t=h.innerText;return {handle:!!document.getElementById('cmty-handle'),ck1:!!document.getElementById('cmty-ck-consent'),ck2:!!document.getElementById('cmty-ck-age'),btn:!!document.getElementById('cmty-optin-btn'),privacidad:/Nunca verán/.test(t)};})()`);
check('CM1 opt-in: apodo + 2 casillas + botón crear + qué NO se comparte', cm1.handle && cm1.ck1 && cm1.ck2 && cm1.btn && cm1.privacidad, JSON.stringify(cm1));

// CM2: gate de consentimiento — sin casillas NO crea (error visible, ningún insert)
await ev(`window.__cmtyCalls=[]; delete window.AVI_ALLOW_CLOUD_WRITE; document.getElementById('cmty-handle').value='Cami';`);
await ev(`cmtyCreateProfile()`); await sleep(300);
const cm2 = await ev(`(()=>{const e=document.getElementById('cmty-optin-err');const ins=window.__cmtyCalls.filter(c=>c.op==='insert');return {err:e&&e.style.display==='block'&&/casilla/i.test(e.textContent),inserts:ins.length};})()`);
check('CM2 gate: sin marcar casillas NO crea perfil (error + 0 inserts)', cm2.err && cm2.inserts === 0, JSON.stringify(cm2));

// CM3: SELLO — con casillas marcadas pero sellado (localhost, sin AVI_ALLOW_CLOUD_WRITE) → NO inserta
await ev(`window.__cmtyCalls=[]; document.getElementById('cmty-ck-consent').checked=true; document.getElementById('cmty-ck-age').checked=true; document.getElementById('cmty-handle').value='Cami';`);
await ev(`cmtyCreateProfile()`); await sleep(300);
const cm3 = await ev(`window.__cmtyCalls.filter(c=>c.op==='insert').length`);
check('CM3 sello: en localhost la creación NO toca la nube (0 inserts)', cm3 === 0, 'inserts=' + cm3);

// CM4: flujo real permitido (AVI_ALLOW_CLOUD_WRITE) → inserta con consent_v
await ev(`window.__cmtyCalls=[]; window.AVI_ALLOW_CLOUD_WRITE=true; document.getElementById('cmty-ck-consent').checked=true; document.getElementById('cmty-ck-age').checked=true; document.getElementById('cmty-handle').value='Cami';`);
await ev(`cmtyCreateProfile()`); await sleep(400);
const cm4 = await ev(`(()=>{const ins=window.__cmtyCalls.filter(c=>c.table==='community_profiles'&&c.op==='insert');const p=ins[0]&&ins[0].p||{};return {n:ins.length,handle:p.handle,consent:!!p.consent_v,show:p.show_today};})()`);
check('CM4 crear (permitido): insert con handle + consent_v + show_today', cm4.n === 1 && cm4.handle === 'Cami' && cm4.consent && cm4.show === true, JSON.stringify(cm4));
await ev(`delete window.AVI_ALLOW_CLOUD_WRITE;`);

// Estado CON perfil + amigos (para el resto). Un amigo con handle MALICIOSO y avatar EXTERNO.
const withFriends = `(()=>{
  CMTY.uid='${MYUID}';
  CMTY.profile={user_id:'${MYUID}',handle:'Camila',avatar_url:null,bio:'Entreno 5am',share_code:'ABCD1234EF',visible:true,show_today:true,streak_weeks:3,level:2,achievements:4,total_sessions:87,training_since:'2026-03-02'};
  CMTY.heartsRecv=2; CMTY.heartsGiven={};
  CMTY.incoming=[{fid:'req1',fr:{id:'fr-inc'},handle:'<b>Hacker</b>'}];
  CMTY.outgoing=[];
  CMTY.friends=[
    {fid:'fA',fr:{id:'fr-A'},prof:{user_id:'fA',handle:'<img src=x onerror="window.__xss=1">Ana',avatar_url:'https://evil.example.com/track.png',bio:'',streak_weeks:5,level:3,sessions_4w:8,achievements:6,trained_today:true,snapshot_at:new Date().toISOString(),total_sessions:120,training_since:'2025-11-10'}},
    {fid:'fB',fr:{id:'fr-B'},prof:{user_id:'fB',handle:'Beto',avatar_url:'${PREFIX}fB/avatar.jpg',bio:'',streak_weeks:1,level:1,sessions_4w:2,achievements:1,trained_today:false,snapshot_at:new Date(Date.now()-5*86400000).toISOString(),total_sessions:0}}
  ];
  CMTY.loaded=true; CMTY.offline=false; _cmtyPaint(); return 'ok';
})()`;
await ev(withFriends); await sleep(300);

// CM5: XSS — el handle malicioso se ESCAPA (no crea <img>, no dispara onerror)
const cm5 = await ev(`(()=>{const h=document.getElementById('cn-community');const badImg=h.querySelector('img[src="x"]');const t=h.innerText;return {xss:window.__xss,badImg:!!badImg,literal:/onerror/.test(t)};})()`);
check('CM5 XSS: handle malicioso escapado (sin <img src=x>, onerror no corre, texto literal)', cm5.xss === 0 && !cm5.badImg && cm5.literal, JSON.stringify(cm5));

// CM6: avatar EXTERNO no se pinta (ninguna <img> apunta a la URL externa)
const cm6 = await ev(`(()=>{const h=document.getElementById('cn-community');const ext=[...h.querySelectorAll('img')].some(i=>/evil\\.example\\.com/.test(i.getAttribute('src')||''));return {ext:ext,imgs:h.querySelectorAll('img').length};})()`);
check('CM6 avatar externo NO se pinta (cae a iniciales)', cm6.ext === false, JSON.stringify(cm6));

// CM7: tarjetas de amigos con stats + solicitud entrante escapada (vista MURO) + mi código (vista AJUSTES tras R1)
const cm7 = await ev(`(()=>{
  const h=document.getElementById('cn-community');
  const feed=h.innerText.replace(/\\s+/g,' '); // vista muro (default): amigos + solicitud
  cmtyGoView('settings'); const set=h.innerText.replace(/\\s+/g,' '); // R1: el código vive en Ajustes
  cmtyGoView('feed');
  return {racha:/Racha 5 sem/.test(feed),nivel:/Nivel 3/.test(feed),noTrainedToday:!/Entren[oó] hoy/.test(feed),req:/quiere ser tu amigo/.test(feed),code:/ABCD1234EF/.test(set)};
})()`);
check('CM7 amigos: stats (racha/nivel) + «entrenó hoy» RETIRADO (§13-BIS.1b) + solicitud entrante (muro) + mi código (ajustes)', cm7.racha && cm7.nivel && cm7.noTrainedToday && cm7.req && cm7.code, JSON.stringify(cm7));

// CM13-rich (#5): «N entrenos» en la tarjeta del amigo (>0), OMITIDO si 0; «Entrena desde» propio en Ajustes
const cmRich = await ev(`(()=>{
  const h=document.getElementById('cn-community');
  const feed=h.innerText.replace(/\\s+/g,' '); // muro: amigos fA(120)/fB(0)
  const anaConEntrenos=/120 entrenos/.test(feed);
  const betoSinCero=!/\\b0 entrenos/.test(feed); // \\b evita el falso match dentro de «12·0· entrenos»
  cmtyGoView('settings'); const set=h.innerText.replace(/\\s+/g,' ');
  cmtyGoView('feed');
  return {anaConEntrenos, betoSinCero, desde:/Entrena desde marzo de 2026/.test(set), mios:/87 entrenos/.test(set)};
})()`);
check('CM13 perfil rico (#5): «N entrenos» en amigo (>0), omitido si 0, «Entrena desde <mes año>» propio en Ajustes',
  cmRich.anaConEntrenos && cmRich.betoSinCero && cmRich.desde && cmRich.mios, JSON.stringify(cmRich));

// Shots del estado con perfil+amigos
await ev(`typeof setTheme==='function'&&setTheme('light')`); await sleep(250); await shot('community-claro');
await ev(`typeof setTheme==='function'&&setTheme('dark')`); await sleep(250); await shot('community-oscuro');
// La frase «Entrena desde …» del perfil propio (vista Ajustes) queda cubierta por la aserción DURA
// de CM13 (cmtyGoView('settings') + innerText) — el shot() re-hace click en la pestaña y resetea a muro.
await ev(`typeof setTheme==='function'&&setTheme('light')`); await sleep(250);
// Shot del opt-in
await ev(setState); await sleep(250); await shot('community-optin');
await ev(withFriends); await sleep(250);

// CM8: ❤️ toggle (permitido contra el stub) — insert luego delete; estado y aria-pressed cambian
await ev(`window.AVI_ALLOW_CLOUD_WRITE=true; window.__cmtyCalls=[];`);
await ev(`cmtyHeart('fB')`); await sleep(300);
const cm8a = await ev(`(()=>{const ins=window.__cmtyCalls.filter(c=>c.table==='community_reactions'&&c.op==='insert');return {ins:ins.length,given:!!CMTY.heartsGiven['fB']};})()`);
await ev(`cmtyHeart('fB')`); await sleep(300);
const cm8b = await ev(`(()=>{const del=window.__cmtyCalls.filter(c=>c.table==='community_reactions'&&c.op==='delete');return {del:del.length,given:!!CMTY.heartsGiven['fB']};})()`);
check('CM8 ❤️ toggle: 1º da (insert + estado on), 2º quita (delete + estado off)', cm8a.ins === 1 && cm8a.given === true && cm8b.del === 1 && cm8b.given === false, JSON.stringify(cm8a) + ' / ' + JSON.stringify(cm8b));
await ev(`delete window.AVI_ALLOW_CLOUD_WRITE;`);

// CM11 (C5): directorio del gym muestra a los compañeros con el botón de conectar.
// R3 (2026-07-22): el verbo pasó de «Agregar» a «Conectar» — la acción inserta una AMISTAD mutua
// (cmtyGymAdd → friendships pending), así que el copy viejo «agrega a quien quieras seguir» mentía
// sobre la mecánica. Lo que se verifica sigue siendo lo mismo: el botón existe y apunta al compañero.
await ev(`(()=>{ CMTY.gym=[{user_id:'gymA',handle:'CompaGym',avatar_url:null,streak_weeks:4,level:2,sessions_4w:6,trained_today:false}]; _cmtyPaint(); return 'ok'; })()`); await sleep(200);
const cm11 = await ev(`(()=>{const h=document.getElementById('cn-community');const t=h.innerText.replace(/\\s+/g,' ');const btn=[...h.querySelectorAll('button')].some(b=>/Conectar/.test(b.textContent)&&/cmtyGymAdd/.test(b.getAttribute('onclick')||'')&&/gymA/.test(b.getAttribute('onclick')||''));return {gym:/Tu gimnasio/.test(t),compa:/CompaGym/.test(t),conectar:btn};})()`);
check('CM11 (C5) directorio del gym: sección + compañero + botón Conectar', cm11.gym && cm11.compa && cm11.conectar, JSON.stringify(cm11));

// CM12 (C5): «Agregar» del directorio envía solicitud (INSERT friendship) — permitido contra el stub
await ev(`window.AVI_ALLOW_CLOUD_WRITE=true; window.__cmtyCalls=[];`);
await ev(`cmtyGymAdd('gymA')`); await sleep(300);
const cm12 = await ev(`window.__cmtyCalls.filter(c=>c.table==='friendships'&&c.op==='insert').length`);
check('CM12 (C5) «Agregar» del gym inserta una solicitud de amistad', cm12 === 1, 'inserts=' + cm12);
await ev(`delete window.AVI_ALLOW_CLOUD_WRITE;`);

// CM9: offline sin perfil → "Conéctate para ver a tu gente"
await ev(`CMTY.profile=null; CMTY.offline=true; CMTY.loaded=true; CMTY.loading=false; _cmtyPaint();`); await sleep(250);
const cm9 = await ev(`/Conéctate para ver a tu gente/.test(document.getElementById('cn-community').innerText)`);
check('CM9 offline sin perfil → mensaje "Conéctate para ver a tu gente" (nunca pantalla rota)', cm9 === true, 'ok=' + cm9);

// CM10 (C4): en el opt-in, el enlace "política de tratamiento de datos" abre el documento legal
// y ese documento trae la sección Comunidad (consentimiento específico cableado).
await ev(setState); await sleep(250);
const hasLink = await ev(`(()=>{const a=[...document.querySelectorAll('#cn-community a')].find(x=>/política de tratamiento/i.test(x.textContent));return !!a;})()`);
await ev(`typeof showLegalDoc==='function' && showLegalDoc('politica')`); await sleep(1200);
const cm10 = await ev(`(()=>{const m=document.getElementById('m-legal');const b=document.getElementById('legal-body');const t=b?b.innerText:'';return {open:!!(m&&m.classList.contains('on')),comunidad:/Comunidad/.test(t),noSensible:/Qué NO se comparte|nunca/i.test(t)};})()`);
check('CM10 (C4) enlace legal en el opt-in abre la política CON la sección Comunidad', hasLink && cm10.open && cm10.comunidad && cm10.noSensible, JSON.stringify({hasLink}) + ' ' + JSON.stringify(cm10));
await ev(`(()=>{const m=document.getElementById('m-legal');if(m)m.classList.remove('on');})()`);

// CM13 (C5, reserva de Fable): un compañero de gym BLOQUEADO no aparece en «Tu gimnasio».
// Drive del cmtyLoad REAL contra el cliente falso: __allProfiles trae dos compañeros de gym
// (uno bloqueado, uno normal) y __frRows trae la amistad 'blocked'. El directorio debe listar
// SOLO al normal. (Espejo frontend de la RLS c5_block_hides_in_gym; defensa en profundidad.)
const GYMBLK = '00000000-0000-0000-0000-0000000000b1';
const GYMOK  = '00000000-0000-0000-0000-0000000000a1';
await ev(`(()=>{
  window.__profileRow = {user_id:'${MYUID}',handle:'Camila',avatar_url:null,bio:'',share_code:'ABCD1234EF',visible:true,show_today:true,streak_weeks:3,level:2,achievements:4};
  window.__frRows = [{id:'fr-blk',user_a:'${MYUID}',user_b:'${GYMBLK}',requested_by:'${GYMBLK}',status:'blocked'}];
  window.__allProfiles = [
    {user_id:'${GYMBLK}',handle:'Bloqueado',avatar_url:null,bio:'',streak_weeks:9,level:4,sessions_4w:9,achievements:9,trained_today:true,snapshot_at:new Date().toISOString()},
    {user_id:'${GYMOK}',handle:'CompaGym',avatar_url:null,bio:'',streak_weeks:4,level:2,sessions_4w:6,achievements:3,trained_today:false,snapshot_at:new Date().toISOString()}
  ];
  window.__rxRows = [];
  CMTY.busy=false; CMTY.loaded=false;
  return 'ok';
})()`);
await ev(`cmtyLoad()`); await sleep(600);
const cm13 = await ev(`(()=>{const g=(CMTY.gym||[]).map(p=>p.user_id);return {gymIds:g,hasOK:g.includes('${GYMOK}'),hasBlk:g.includes('${GYMBLK}'),friendBlk:(CMTY.friends||[]).some(f=>f.fid==='${GYMBLK}')};})()`);
check('CM13 (C5 reserva) compañero de gym BLOQUEADO oculto del directorio (normal SÍ aparece)', cm13.hasOK && !cm13.hasBlk && !cm13.friendBlk, JSON.stringify(cm13));

// ── A1 ADOPCIÓN: prueba social de la bienvenida (23 en el gym, 6 con perfil → el opt-in no
// mostraba una sola cara conocida). CM14 prueba la CARGA real (rama else de cmtyLoad, que antes
// no existía: sin perfil no se cargaba nada), CM15 el pintado, CM16 que sin gente no hay hueco.
const P1 = '00000000-0000-0000-0000-0000000000c1';
const P2 = '00000000-0000-0000-0000-0000000000c2';
await ev(`(()=>{
  window.__profileRow = null;                     // NO tengo perfil todavía (el caso de los 17)
  window.__frRows = []; window.__rxRows = [];
  window.__allProfiles = [
    {user_id:'${P1}',handle:'Samuel',avatar_url:null,is_private:true},
    {user_id:'${P2}',handle:'<img src=x onerror="window.__xss=1">Astrid',avatar_url:'https://evil.example.com/t.png',is_private:true}
  ];
  window.__xss=0; CMTY.busy=false; CMTY.loaded=false; CMTY.profile=null; CMTY.offline=false;
  return 'ok';
})()`);
await ev(`cmtyLoad()`); await sleep(600);
const cm14 = await ev(`(()=>({peers:(CMTY.peers||[]).length, prof:!!CMTY.profile})) ()`);
check('CM14 (A1) sin perfil propio, cmtyLoad SÍ carga a los compañeros visibles (prueba social)', cm14.peers === 2 && cm14.prof === false, JSON.stringify(cm14));

const cm15 = await ev(`(()=>{
  const h=document.getElementById('cn-community'); const t=h.innerText.replace(/\\s+/g,' ');
  // 2 compañeros → ambos nombrados, sin «y N más». El handle hostil ordena antes (empieza por '<')
  // y por eso aparece primero: lo que importa es que salga como TEXTO, no como etiqueta.
  return {linea:/de tu gym ya están aquí/.test(t) && /Samuel/.test(t) && /onerror/.test(t) && !/y 1 más/.test(t),
          optin:!!document.getElementById('cmty-optin-btn'),
          xss:window.__xss, badImg:!!h.querySelector('img[src="x"]'),
          ext:[...h.querySelectorAll('img')].some(i=>/evil\\.example\\.com/.test(i.getAttribute('src')||''))};
})()`);
check('CM15 (A1) la bienvenida nombra a la gente del gym, sin perder el opt-in y con el handle escapado',
  cm15.linea && cm15.optin && cm15.xss === 0 && !cm15.badImg && !cm15.ext, JSON.stringify(cm15));

// CM18 (F3) — el compañero de gym que se hizo PÚBLICO. `is_private` NO puede decidir la
// pertenencia: en prod el único perfil público del gimnasio es EL COACH, y la línea lo escondía.
// Aquí entra por la RPC `cmty_gym_peers` (señal real), y un público AJENO al gym no se cuela.
const P3 = '00000000-0000-0000-0000-0000000000c3';
const P4 = '00000000-0000-0000-0000-0000000000c4';
await ev(`(()=>{
  window.__allProfiles = [
    {user_id:'${P1}',handle:'Samuel',avatar_url:null,is_private:true},
    {user_id:'${P3}',handle:'AndresCoach',avatar_url:null,is_private:false},
    {user_id:'${P4}',handle:'Desconocido',avatar_url:null,is_private:false}
  ];
  window.__gymPeers = ['${P1}','${P3}'];   // el servidor dice: Samuel y el coach son de mi gym
  CMTY.busy=false; CMTY.loaded=false; CMTY.profile=null; CMTY.offline=false; return 'ok';
})()`);
await ev(`cmtyLoad()`); await sleep(600);
const cm18 = await ev(`(()=>{const h=document.getElementById('cn-community');const t=h.innerText.replace(/\\s+/g,' ');
  const l=(typeof communityPeersLine==='function')?communityPeersLine(CMTY.peers):null;
  return {total:l&&l.total,scope:l&&l.scope,texto:l&&l.text,pintado:/de tu gym ya están aquí/.test(t),
          nombraCoach:/AndresCoach/.test(t),nombraExtrano:/Desconocido/.test(t)};})()`);
check('CM18 (F3) el compañero PÚBLICO del gym cuenta como del gym; el público ajeno no',
  cm18.total === 2 && cm18.scope === 'gym' && cm18.pintado && cm18.nombraCoach && !cm18.nombraExtrano, JSON.stringify(cm18));

// CM18-bis: si la RPC FALLA, no se pierde el gym privado (la señal es aditiva, nunca resta)
await ev(`(()=>{ window.__gymPeersErr={message:'boom'}; CMTY.busy=false; CMTY.loaded=false; CMTY.profile=null; return 'ok'; })()`);
await ev(`cmtyLoad()`); await sleep(600);
const cm18b = await ev(`(()=>{const l=(typeof communityPeersLine==='function')?communityPeersLine(CMTY.peers):null;
  const marcados=(CMTY.peers||[]).filter(p=>p.gym).map(p=>p.handle);
  return {total:l&&l.total,scope:l&&l.scope,marcados:marcados};})()`);
check('CM18-bis con la RPC caída se conserva la conducta de siempre (el privado sigue siendo del gym)',
  cm18b.total === 1 && cm18b.scope === 'gym' && cm18b.marcados.length === 1 && cm18b.marcados[0] === 'Samuel',
  JSON.stringify(cm18b));
await ev(`(()=>{ window.__gymPeersErr=null; window.__gymPeers=[]; return 'ok'; })()`);

// Shots de la bienvenida CON prueba social (R2.6: se miran, no solo se generan)
await ev(`typeof setTheme==='function'&&setTheme('light')`); await sleep(250); await shot('community-optin-social-claro');
await ev(`typeof setTheme==='function'&&setTheme('dark')`); await sleep(250); await shot('community-optin-social-oscuro');
await ev(`typeof setTheme==='function'&&setTheme('light')`); await sleep(250);

// CM17 (A1) — HIT-TEST del CTA: el banner flotante «Instalar app» NO puede tapar «Crear mi
// perfil». Es la clase del bug v348 (el banner encima del recuadro del login) y aquí caería
// justo sobre el botón que destraba la adopción. Se mide con elementFromPoint en el viewport
// REAL (una captura full-page miente con position:fixed), con el scroller abajo del todo.
const cm17 = await ev(`(()=>{
  const body=document.querySelector('#s-client .cnbody')||document.scrollingElement;
  try{ body.scrollTop = body.scrollHeight; }catch(e){}
  // §P3: con el banner oculto este check pasaba EN VACÍO. Se fuerza visible y se afirma que existe.
  const bn0=document.getElementById('install-banner');
  if(bn0){ bn0.classList.remove('hide'); bn0.style.display='flex'; }
  const b=document.getElementById('cmty-optin-btn'); if(!b) return {err:'sin boton'};
  const r=b.getBoundingClientRect();
  const cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
  const hit=document.elementFromPoint(cx,cy);
  const bn=document.getElementById('install-banner');
  const br=bn?bn.getBoundingClientRect():null;
  const visible=bn?getComputedStyle(bn).display!=='none':false;
  const solapa=!!(br&&visible&&br.top<r.bottom&&br.bottom>r.top&&br.left<r.right&&br.right>r.left);
  return {hayBanner:!!bn, hitEsBoton:!!(hit&&(hit===b||b.contains(hit))), solapa, visible,
          btn:[Math.round(r.top),Math.round(r.bottom)], banner:br?[Math.round(br.top),Math.round(br.bottom)]:null,
          hit:hit?(hit.id||hit.tagName):null};
})()`);
check('CM17 (A1) el banner «Instalar app» NO tapa el botón «Crear mi perfil» (hit-test real)',
  cm17.hayBanner === true && cm17.visible === true && cm17.hitEsBoton === true && cm17.solapa === false, JSON.stringify(cm17));

// Sin nadie visible: NI un hueco NI un «0 personas» — la pantalla queda como estaba siempre.
await ev(`(()=>{ CMTY.peers=[]; CMTY.profile=null; CMTY.loaded=true; CMTY.offline=false; _cmtyPaint(); return 'ok'; })()`); await sleep(250);
const cm16 = await ev(`(()=>{const h=document.getElementById('cn-community');const t=h.innerText.replace(/\\s+/g,' ');
  return {sinLinea:!/ya están aquí|ya está aquí|ya están en AVI/.test(t), optin:!!document.getElementById('cmty-optin-btn'), unete:/Únete a la comunidad/.test(t)};})()`);
check('CM16 (A1) sin compañeros visibles: ninguna línea vacía ni «0 personas», la bienvenida intacta',
  cm16.sinLinea && cm16.optin && cm16.unete, JSON.stringify(cm16));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS COMUNIDAD (C3) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
