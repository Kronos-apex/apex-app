import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const APP = process.env.WALK_URL || 'http://localhost:8137/';
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-live-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/fae26a46-b053-491e-a1f0-e7a28f9db92e/scratchpad/shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--remote-debugging-port=9223','--user-data-dir='+PROFILE,'--no-first-run','--no-default-browser-check','--window-size=390,844', APP], {});
async function findPage(){ for(let i=0;i<40;i++){ try{ const r=await fetch('http://localhost:9223/json/list'); const t=await r.json(); const p=t.find(x=>x.type==='page'&&/localhost:8137|apex-app/.test(x.url)); if(p&&p.webSocketDebuggerUrl)return p; }catch{} await sleep(500);} throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200*1024*1024 });
let id=1; const pend=new Map();
ws.on('message', d=>{ const m=JSON.parse(d); if(m.id&&pend.has(m.id)){ const {resolve,reject}=pend.get(m.id); pend.delete(m.id); m.error?reject(new Error(m.error.message)):resolve(m.result); }});
const send=(method,params={})=>new Promise((res,rej)=>{ const i=id++; pend.set(i,{resolve:res,reject:rej}); ws.send(JSON.stringify({id:i,method,params})); });
const evaluate=async expr=>{ const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true}); if(r.result?.subtype==='error')throw new Error(r.result.description); return r.result.value; };
const shot=async n=>{ const r=await send('Page.captureScreenshot',{format:'png'}); writeFileSync(`${OUT}/${n}.png`,Buffer.from(r.data,'base64')); };
const waitFor=async(expr,ms=12000)=>{ const t=Date.now(); while(Date.now()-t<ms){ try{ if(await evaluate(expr))return true; }catch{} await sleep(300);} return false; };

await new Promise((res,rej)=>{ ws.on('open',res); ws.on('error',rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
const R={};
try{
  await waitFor(`!!document.getElementById('lu')`,15000);
  await evaluate(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await evaluate(`doLogin()`);
  R.login = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`,20000);
  // dismiss first-run overlays
  for(let k=0;k<8;k++){ await evaluate(`(()=>{try{const d=document.getElementById('data-ob');if(typeof _dobFinish==='function'&&d&&d.classList.contains('on'))_dobFinish();}catch(e){}try{const o=document.getElementById('onboarding');if(typeof obSkip==='function'&&o&&o.style.display!=='none')obSkip();}catch(e){}try{const f=document.getElementById('m-fsintro');if(typeof fsIntroDismiss==='function'&&f&&getComputedStyle(f).display!=='none')fsIntroDismiss();}catch(e){}try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('on');});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`).catch(()=>{}); await sleep(400); }

  R.authMode = await evaluate(`typeof AUTH_MODE!=='undefined' && AUTH_MODE`);
  R.pollerExists = await evaluate(`typeof _pollAuthClient==='function'`);

  // ── TEST 1: mensaje del coach en vivo ──
  // Guardamos los msgs originales, escribimos uno de 'coach' en la fila REMOTA (sin tocar el
  // estado local), abrimos la pestaña de mensajes y disparamos el poller. Debe aparecer.
  await evaluate(`cnTab('cn-messages', document.querySelectorAll('.cntab')[2])`); await sleep(800);
  const baseline = await evaluate(`(()=>{const cid=CUR.clientId;return {cid, n:(DB.msgs[cid]||[]).length, orig:JSON.stringify(DB.msgs[cid]||[])};})()`);
  R.msgBaseline = baseline.n;
  // escribir remoto: leer fila, agregar mensaje coach, upsert (NO tocar DB local)
  await evaluate(`(async()=>{const row=await UD.loadOwn();const msgs=(row&&row.msgs||[]).concat([{from:'coach',text:'PRUEBA LIVE ${Date.now()}',ts:Date.now()}]);await UD.upsertOwn({msgs});return true;})()`);
  // disparar el poller (lo que el setInterval hace cada 15s)
  await evaluate(`_pollAuthClient()`); await sleep(1200);
  R.msgAfter = await evaluate(`(DB.msgs[CUR.clientId]||[]).length`);
  R.msgInDom = await evaluate(`/PRUEBA LIVE/.test((document.getElementById('cn-messages')||{}).innerText||'')`);
  R.msgLiveOK = (R.msgAfter === R.msgBaseline + 1) && R.msgInDom;
  await shot('live-01-mensaje');
  // revertir remoto al original
  await evaluate(`(async()=>{const orig=${JSON.stringify(baseline.orig)};await UD.upsertOwn({msgs:JSON.parse(orig)});return true;})()`);

  // ── TEST 2: cambio de rutina del coach en vivo ──
  await evaluate(`cnTab('cn-routines', document.querySelectorAll('.cntab')[1])`); await sleep(800);
  const rb = await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);return {orig:JSON.stringify(c.routines||[]), firstName:(c.routines[0]||{}).name};})()`);
  R.routineFirstBefore = rb.firstName;
  // remoto: renombrar la 1a rutina (cambio detectable) sin tocar DB local
  await evaluate(`(async()=>{const row=await UD.loadOwn();const rts=JSON.parse(JSON.stringify(row.routines||[]));if(rts[0])rts[0].name='⚡PRUEBA SYNC';await UD.upsertOwn({routines:rts});return true;})()`);
  await evaluate(`_pollAuthClient()`); await sleep(1200);
  R.routineFirstAfter = await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);return (c.routines[0]||{}).name;})()`);
  R.routineInDom = await evaluate(`/PRUEBA SYNC/.test((document.getElementById('cn-all-rut')||{}).innerText||'')`);
  R.routineLiveOK = R.routineFirstAfter==='⚡PRUEBA SYNC' && R.routineInDom;
  await shot('live-02-rutina');
  // revertir
  await evaluate(`(async()=>{const orig=${JSON.stringify(rb.orig)};await UD.upsertOwn({routines:JSON.parse(orig)});return true;})()`);

  // ── TEST 3: guard — no pisa edición en curso ──
  // Con _authDirty=true (simula edición sin guardar), un cambio remoto NO debe aplicarse.
  await evaluate(`(async()=>{const row=await UD.loadOwn();const rts=JSON.parse(JSON.stringify(row.routines||[]));if(rts[0])rts[0].name='NO-DEBE-VERSE';await UD.upsertOwn({routines:rts});return true;})()`);
  await evaluate(`window._authDirty=true; if(typeof _authDirty!=='undefined'){try{_authDirty=true}catch(e){}}`);
  // forzar la guarda real: setear la variable del módulo no es trivial; probamos con editor abierto
  await evaluate(`(()=>{const m=document.getElementById('m-routine');if(m){m.style.display='flex';m.classList.add('on');}})()`);
  await evaluate(`_pollAuthClient()`); await sleep(800);
  R.guardHeld = await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);return (c.routines[0]||{}).name!=='NO-DEBE-VERSE';})()`);
  await evaluate(`(()=>{const m=document.getElementById('m-routine');if(m){m.style.display='none';m.classList.remove('on');}})()`);
  // revertir remoto
  await evaluate(`(async()=>{const orig=${JSON.stringify(rb.orig)};await UD.upsertOwn({routines:JSON.parse(orig)});return true;})()`);

} catch(e){ R.fatal = e.message; }
finally {
  console.log('\n===LIVE-REPORT===\n'+JSON.stringify(R,null,2));
  ws.close(); try{chrome.kill();}catch{}
  await sleep(300); process.exit(0);
}
