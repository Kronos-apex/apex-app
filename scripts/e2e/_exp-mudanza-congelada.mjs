// Experimento: app instalada en ORIGEN VIEJO (8861/apex-app/) → el viejo pasa a redirigir 301 al NUEVO (8862/).
// ¿Qué ve quien abre la app instalada?   node exp.mjs <dirApp>
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const dir = process.argv[2];
import { fileURLToPath } from 'node:url';
const T = fileURLToPath(new URL('./_mudanza-srv', import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let old = spawn('python', [T+'/rootsrv.py', '8861', dir, '/apex-app/']);
const neu = spawn('python', [T+'/rootsrv.py', '8862', dir]);
await sleep(1000);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--remote-debugging-port=9391','--user-data-dir='+process.env.TEMP+'/mudprof-'+Date.now(),'--no-first-run','about:blank']);
let page; for (let i=0;i<60;i++){ try{ const t=await (await fetch('http://127.0.0.1:9391/json/list')).json(); page=t.find(x=>x.type==='page'); if(page) break; }catch{} await sleep(400); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r=>ws.on('open',r));
let id=1; const pend=new Map(); ws.on('message',d=>{const m=JSON.parse(d); if(m.id&&pend.has(m.id)){pend.get(m.id)(m); pend.delete(m.id);}});
const send=(method,params={})=>new Promise(r=>{const i=id++; pend.set(i,r); ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8861/apex-app/'}); await sleep(6000);
await send('Page.reload'); await sleep(5000);
console.log('1) instalada en viejo · controlada por SW:', await ev('!!navigator.serviceWorker.controller'), '·', await ev('location.href'));
old.kill(); await sleep(500);
old = spawn('python', [T+'/redir.py', '8861', 'http://127.0.0.1:8862']); await sleep(1000);
await send('Page.navigate',{url:'http://127.0.0.1:8861/apex-app/'}); await sleep(7000);
const href = await ev('location.href'), body = await ev('(document.body&&document.body.innerText||"").slice(0,120).replace(/\s+/g," ")');
const app = await ev("typeof renderToday==='function' || typeof showScreen==='function'");
console.log('2) tras la mudanza · url:', href, '· la app cargó:', app, '· texto:', JSON.stringify(body));
try{ws.close();}catch{} chrome.kill(); old.kill(); neu.kill(); process.exit(0);
