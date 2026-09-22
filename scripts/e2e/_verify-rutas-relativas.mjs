// v657 · la app se instala y abre SIN RED tanto en /apex-app/ (github.io) como en la raíz (dominio propio).
// El id resuelto en github.io sigue siendo /apex-app/: la app ya instalada no cambia de identidad.
// Corre: node scripts/e2e/_verify-rutas-relativas.mjs
import WebSocket from 'ws'; import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const T = fileURLToPath(new URL('./_mudanza-srv', import.meta.url));
const dir='C:/Users/KRONOS/Desktop/AVI/apex-app'; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const a=spawn('python',[T+'/rootsrv.py','8861',dir,'/apex-app/']); const b=spawn('python',[T+'/rootsrv.py','8862',dir]); await sleep(1000);
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--remote-debugging-port=9392','--user-data-dir='+process.env.TEMP+'/rutas-'+Date.now(),'--no-first-run','about:blank']);
let page; for(let i=0;i<60;i++){try{const t=await (await fetch('http://127.0.0.1:9392/json/list')).json(); page=t.find(x=>x.type==='page'); if(page)break;}catch{} await sleep(400);}
const ws=new WebSocket(page.webSocketDebuggerUrl); await new Promise(r=>ws.on('open',r));
let id=1; const pend=new Map(); ws.on('message',d=>{const m=JSON.parse(d); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
const send=(method,params={})=>new Promise(r=>{const i=id++;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.result?.value;
await send('Page.enable'); let fails=0;
for (const url of ['http://127.0.0.1:8861/apex-app/','http://127.0.0.1:8862/']) {
  await send('Network.enable'); await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await send('Page.navigate',{url}); await sleep(6000); await send('Page.reload'); await sleep(5000);
  const r=await ev(`(async()=>{const reg=await navigator.serviceWorker.getRegistration(); const m=await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
    const keys=await caches.keys(); const c=await caches.open(keys[0]); const n=(await c.keys()).length;
    return {ctl:!!navigator.serviceWorker.controller, scope:reg&&reg.scope, start:new URL(m.start_url,document.querySelector('link[rel=manifest]').href).href, id:new URL(m.id,new URL(m.start_url,document.querySelector('link[rel=manifest]').href)).href, cached:n};})()`);
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await send('Page.reload'); await sleep(5000);
  const off=await ev("typeof showScreen==='function' && document.body.innerText.length>50");
  const ok=r&&r.ctl&&r.scope===url&&r.start===url&&r.cached>10&&off;
  if(!ok)fails++; console.log((ok?'OK ':'FAIL ')+url, JSON.stringify(r), 'offline:', off);
}
try{ws.close();}catch{} chrome.kill(); a.kill(); b.kill(); process.exit(fails?1:0);
