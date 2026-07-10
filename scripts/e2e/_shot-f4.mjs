// Shot visual efímero de F4 (v308): tarjetas del guiado con help/alert/flame/tridown/wind.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
const srv = spawn('python',['-m','http.server','8777'],{cwd:'C:/Users/KRONOS/Desktop/AVI/apex-app'});
await new Promise(r=>setTimeout(r,1200));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--remote-debugging-port=9277','--user-data-dir='+process.env.TEMP+'/cdp-shotf4-'+Date.now(),'--no-first-run','--window-size=390,844','http://localhost:8777/']);
let p; for(let i=0;i<120;i++){try{const t=await(await fetch('http://localhost:9277/json/list')).json();p=t.find(x=>x.type==='page'&&x.url.includes('localhost'));if(p?.webSocketDebuggerUrl)break;}catch{}await new Promise(r=>setTimeout(r,500));}
const ws=new WebSocket(p.webSocketDebuggerUrl,{maxPayload:200*1024*1024});
let id=1;const pend=new Map();
ws.on('message',d=>{const m=JSON.parse(d);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
const send=(method,params={})=>new Promise(res=>{const i=id++;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r?.result?.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(e,ms=60000)=>{const t=Date.now();while(Date.now()-t<ms){try{if(await ev(e))return true;}catch{}await sleep(300);}return false;};
await new Promise(r=>ws.on('open',r));
await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`);
let inApp=await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
if(!inApp){
  await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await ev(`doLogin()`);
  await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`);
}
const ok=await ev(`!!(typeof CUR!=='undefined'&&CUR.clientId&&(DB.clients||[]).some(x=>x.id===CUR.clientId))`);
if(!ok){console.log('FATAL: rate limit — sin shot');chrome.kill();srv.kill();process.exit(1);}
await sleep(2000);
for(let k=0;k<6;k++){await ev(`(()=>{try{hideClientWelcome();}catch(e){}['data-ob','cwelcome','m-fsintro','m-textsize'].forEach(i=>{const e=document.getElementById(i);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';try{localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));ntClose(false);}catch(e){}})()`);await sleep(150);}
await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const press={...DB.exercises.find(e=>e.id==='e83'),sets:3,reps:12,warm:{kg:20,reps:12}};
  const plancha={...DB.exercises.find(e=>e.id==='e17'),sets:2,reps:40,track:'tiempo'};
  c.routines=[{id:'rShotF4',name:'Visual F4',day:days[new Date().getDay()],exercises:[press,plancha]}];
  localStorage.removeItem('apex_tip_done_'+c.id);
  renderClientToday(c);})()`);
await sleep(1200);
const shot=async n=>{const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(process.env.TEMP.replace(/\\/g,'/')+'/'+n+'.png',Buffer.from(r.data,'base64'));console.log('shot '+n);};
await shot('f4-guiado');
await ev(`(()=>{const b=[...document.querySelectorAll('#gm-body button')].find(x=>/Mostrar/.test(x.textContent));if(b)b.click();})()`);
await sleep(400);
await shot('f4-guiado-warm');
console.log('OK');
chrome.kill();srv.kill();
