// Shot visual efímero de F5 (v310): panel del coach con íconos de marca
// (home con chips de estado, p-detail con tags/valoración/rutinas). Misma
// técnica que _test-coach-back: login QA + forzar s-coach (sin coach real).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
const srv = spawn('python',['-m','http.server','8778'],{cwd:'C:/Users/KRONOS/Desktop/AVI/apex-app'});
await new Promise(r=>setTimeout(r,1200));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--remote-debugging-port=9278','--user-data-dir='+process.env.TEMP+'/cdp-shotf5-'+Date.now(),'--no-first-run','--window-size=1180,800','http://localhost:8778/']);
let p; for(let i=0;i<120;i++){try{const t=await(await fetch('http://localhost:9278/json/list')).json();p=t.find(x=>x.type==='page'&&x.url.includes('localhost'));if(p?.webSocketDebuggerUrl)break;}catch{}await new Promise(r=>setTimeout(r,500));}
const ws=new WebSocket(p.webSocketDebuggerUrl,{maxPayload:200*1024*1024});
let id=1;const pend=new Map();
ws.on('message',d=>{const m=JSON.parse(d);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
const send=(method,params={})=>new Promise(res=>{const i=id++;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r?.result?.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(e,ms=60000)=>{const t=Date.now();while(Date.now()-t<ms){try{if(await ev(e))return true;}catch{}await sleep(300);}return false;};
await new Promise(r=>ws.on('open',r));
await send('Page.enable');await send('Runtime.enable');
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
let inApp=await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
if(!inApp){
  await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await ev(`doLogin()`);
  await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`);
}
const ok=await ev(`!!(typeof CUR!=='undefined'&&CUR.clientId&&(DB.clients||[]).some(x=>x.id===CUR.clientId))`);
if(!ok){console.log('FATAL: rate limit — sin shot');chrome.kill();srv.kill();process.exit(1);}
await sleep(1500);
await ev(`(()=>{try{localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));ntClose(false);}catch(e){}})()`);
for(let k=0;k<6;k++){await ev(`(()=>{try{hideClientWelcome();}catch(e){}try{if(typeof _dobFinish==='function'&&document.getElementById('data-ob').classList.contains('on'))_dobFinish();}catch(e){}['data-ob','cwelcome','m-fsintro','m-textsize'].forEach(i=>{const e=document.getElementById(i);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`);await sleep(150);}
await ev(`(()=>{
  showScreen('s-coach');
  CUR.loggedAs='coach';
  document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
  document.getElementById('p-home').classList.add('on');
  const c=DB.clients[0];
  c.weight=c.weight||75;c.height=c.height||175;c.age=c.age||30;c.sex=c.sex||'m';
  if(typeof renderHome==='function')renderHome();
})()`);
await sleep(900);
const shot=async n=>{const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(process.env.TEMP.replace(/\\/g,'/')+'/'+n+'.png',Buffer.from(r.data,'base64'));console.log('shot '+n);};
await shot('f5-coach-home');
await ev(`(()=>{try{openDetail(DB.clients[0].id);}catch(e){}})()`);
await sleep(700); // shot ANTES de que la cola async de openDetail re-entre al init de cliente
await shot('f5-coach-detail');
console.log('OK');
chrome.kill();srv.kill();
