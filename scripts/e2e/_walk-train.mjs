import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const APP = 'https://kronos-apex.github.io/apex-app/';
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-train-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/fae26a46-b053-491e-a1f0-e7a28f9db92e/scratchpad/shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--remote-debugging-port=9224','--user-data-dir='+PROFILE,'--no-first-run','--no-default-browser-check','--window-size=390,844', APP], {});
async function findPage(){ for(let i=0;i<40;i++){ try{ const r=await fetch('http://localhost:9224/json/list'); const t=await r.json(); const p=t.find(x=>x.type==='page'&&/apex-app/.test(x.url)); if(p&&p.webSocketDebuggerUrl)return p; }catch{} await sleep(500);} throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200*1024*1024 });
let id=1; const pend=new Map(); const jsErrors=[];
ws.on('message', d=>{ const m=JSON.parse(d); if(m.id&&pend.has(m.id)){ const {resolve,reject}=pend.get(m.id); pend.delete(m.id); m.error?reject(new Error(m.error.message)):resolve(m.result); } else if(m.method==='Runtime.exceptionThrown'){ jsErrors.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'?'); }});
const send=(method,params={})=>new Promise((res,rej)=>{ const i=id++; pend.set(i,{resolve:res,reject:rej}); ws.send(JSON.stringify({id:i,method,params})); });
const evaluate=async expr=>{ const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true}); if(r.result?.subtype==='error')throw new Error(r.result.description); return r.result.value; };
const shot=async n=>{ const r=await send('Page.captureScreenshot',{format:'png'}); writeFileSync(`${OUT}/${n}.png`,Buffer.from(r.data,'base64')); };
const waitFor=async(expr,ms=12000)=>{ const t=Date.now(); while(Date.now()-t<ms){ try{ if(await evaluate(expr))return true; }catch{} await sleep(300);} return false; };

await new Promise((res,rej)=>{ ws.on('open',res); ws.on('error',rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
const R={};
try{
  await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function' && typeof DB!=='undefined'`,20000);
  await evaluate(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await evaluate(`doLogin()`);
  R.login=await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`,25000);
  if(!R.login){
    await sleep(1500); await shot('train-00-loginfail');
    R.lerr = await evaluate(`(document.getElementById('lerr')||{}).textContent||''`);
    R.lerrOn = await evaluate(`!!(document.getElementById('lerr')&&document.getElementById('lerr').classList.contains('on'))`);
    R.visibleScreen = await evaluate(`[...document.querySelectorAll('.screen')].filter(s=>getComputedStyle(s).display!=='none').map(s=>s.id)`);
    R.authReady = await evaluate(`typeof AUTH!=='undefined' && AUTH.ready && AUTH.ready()`);
  }
  for(let k=0;k<8;k++){ await evaluate(`(()=>{try{const d=document.getElementById('data-ob');if(typeof _dobFinish==='function'&&d&&d.classList.contains('on'))_dobFinish();}catch(e){}try{const o=document.getElementById('onboarding');if(typeof obSkip==='function'&&o&&o.style.display!=='none')obSkip();}catch(e){}try{const f=document.getElementById('m-fsintro');if(typeof fsIntroDismiss==='function'&&f&&getComputedStyle(f).display!=='none')fsIntroDismiss();}catch(e){}try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('on');});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`).catch(()=>{}); await sleep(350); }

  // Abrir la sesión EN VIVO de la rutina Empuje
  const empId = await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);const r=(c.routines||[]).find(x=>/Empuje/i.test(x.name));return r?r.id:null;})()`);
  R.empujeId = empId;
  await evaluate(`startRoutineNow(${JSON.stringify(empId)})`);
  // CUR.todayWorking se materializa de forma perezosa vía _todayWork() (respeta el override).
  R.sessionOpened = await waitFor(`(()=>{const w=(typeof _todayWork==='function')?_todayWork():null;return !!(w&&w.exercises&&w.exercises.length);})()`,8000);
  const killOverlays = `(()=>{try{if(typeof fsIntroDismiss==='function'){const f=document.getElementById('m-fsintro');if(f&&getComputedStyle(f).display!=='none')fsIntroDismiss();}}catch(e){}['m-fsintro','data-ob','cwelcome','fsintro'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('on');});})()`;
  await evaluate(killOverlays); await sleep(600); await evaluate(killOverlays);
  await sleep(500); await shot('train-01-sesion');
  R.workingExercises = await evaluate(`(_todayWork().exercises||[]).map(e=>e.name)`);
  R.sessionRendersInputs = await evaluate(`document.querySelectorAll('#cn-today input').length`);

  // TEST reordenar: mover el 1er ejercicio hacia abajo
  const before = await evaluate(`_todayWork().exercises.map(e=>e.name)`);
  await evaluate(`todayMoveEx(0,1)`); await sleep(500);
  const after = await evaluate(`CUR.todayWorking.exercises.map(e=>e.name)`);
  R.reorderBefore = before.slice(0,3);
  R.reorderAfter = after.slice(0,3);
  R.reorderWorks = (after[0]===before[1] && after[1]===before[0]);
  R.reorderInDom = await evaluate(`(()=>{const names=[...document.querySelectorAll('#cn-today .exname')].map(e=>e.textContent.trim());return names[0]===${JSON.stringify('@@')}? false : names.indexOf(${JSON.stringify('')})})()`).catch(()=>null);
  await shot('train-02-reordenado');

  // TEST sustituir: cambiar el ejercicio en índice 1
  const subTarget = await evaluate(`(CUR.todayWorking.exercises[1]||{}).name`);
  R.subTargetBefore = subTarget;
  await evaluate(`todaySubstitute(1)`);
  R.pickerOpened = await waitFor(`(()=>{const m=document.getElementById('m-picker');return m&&getComputedStyle(m).display!=='none'})()`,6000);
  await sleep(500); await shot('train-03-picker');
  R.pickerCandidates = await evaluate(`document.querySelectorAll('#pk-list > div').length`);
  // clic en el primer candidato cuyo nombre difiera del actual
  R.clickedCandidate = await evaluate(`(()=>{const cur=(CUR.todayWorking.exercises[1]||{}).name;const items=[...document.querySelectorAll('#pk-list > div')];const t=items.find(d=>{const n=d.querySelector('div div');return n&&n.textContent.trim()&&!n.textContent.trim().startsWith(cur)&&typeof d.onclick==='function';});if(t){const nm=t.querySelector('div div').textContent.trim();t.click();return nm;}return null;})()`);
  await sleep(700);
  R.subTargetAfter = await evaluate(`(CUR.todayWorking.exercises[1]||{}).name`);
  R.substituteWorks = !!R.subTargetAfter && R.subTargetAfter!==R.subTargetBefore;
  R.subInDom = await evaluate(`[...document.querySelectorAll('#cn-today .exname')].map(e=>e.textContent.trim()).includes((CUR.todayWorking.exercises[1]||{}).name)`);
  await evaluate(killOverlays); await sleep(500); await shot('train-04-sustituido');

  R.jsErrors = jsErrors;
} catch(e){ R.fatal=e.message; R.jsErrors=jsErrors; }
finally{
  console.log('\n===TRAIN-REPORT===\n'+JSON.stringify(R,null,2));
  ws.close(); try{chrome.kill();}catch{}
  await sleep(300); process.exit(0);
}
