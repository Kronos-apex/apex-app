// _verify-versiones.mjs — QUÉ VERSIÓN TRAE CADA TELÉFONO (avi-v541).
//
// Decisión del PO (25-ago): instrumentarlo. Hasta hoy la app **solo registraba su versión cuando
// había un ERROR** (`app_errors.build`), así que después de desplegar un arreglo no se podía
// saber si le llegó a alguien — la pregunta que quedó sin responder con el reporte de Kathe.
//
// LO QUE PROTEGE:
//   1. la tarjeta APARECE cuando alguien está atrasado, y lo NOMBRA (V1)
//   2. NO aparece cuando todos están al día — una tarjeta que siempre dice «todo bien» es
//      ruido, y el ruido es cómo se aprende a ignorar un aviso (V2)
//   3. «sin datos» NO es «atrasado» y no dispara nada (V3)
//   4. la ficha de cada asesorado dice su versión y hace cuánto (V4)
// Sin login ni red. Capturas en claro y oscuro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8838, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-versiones';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9358', '--user-data-dir=' + process.env.TEMP + '/vers-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9358/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const evj = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`typeof DB!=='undefined' && !!DB && typeof gp==='function' && typeof openDetail==='function' && typeof renderBuildsCard==='function'`);
await sleep(1600);

// La versión con la que corre ESTE navegador sale del `?v=` real de los scripts: el fixture la
// LEE en vez de clavar un número, o el harness caduca en el próximo deploy (lección v533).
const BUILD = await ev(`appBuildFrom([].slice.call(document.querySelectorAll('script[src],link[href]')).map(n=>n.getAttribute('src')||n.getAttribute('href')))`);

const MONTAR = `((caso) => {try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const B=${BUILD};
  const iso=h=>new Date(Date.now()-h*3600000).toISOString();
  const base=(id,name,dev)=>({id,name,email:id+'@x.com',goal:'Ganar músculo',level:'Intermedio',days:4,
    age:30,sex:'F',weight:62,height:163,activityFactor:1.55,tier:'premium',payments:[],routines:[],dev});
  const sets={
    mezcla:[ base('c1','Kathe Beltran',{b:B-2,at:iso(30)}),
             base('c2','Astrid Beltran',{b:B,at:iso(1)}),
             base('c3','Chema',null) ],
    aldia:[  base('c2','Astrid Beltran',{b:B,at:iso(1)}) ],
    sindato:[base('c3','Chema',null), base('c4','Daniel',null) ],
  };
  DB.clients=sets[caso]; DB.history={}; DB.bodyweight={}; DB.nutrition={};
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach'); if(typeof renderAll==='function')renderAll();
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})`;

const montar = async caso => { const r = await ev(`${MONTAR}(${JSON.stringify(caso)})`); if (String(r).startsWith('err:')) throw new Error('montaje: ' + r); await sleep(900); };

const TARJETA = `(()=>{const el=document.getElementById('h-builds');
  if(!el)return {existe:false};
  const c=el.querySelector('.card'); const r=c?c.getBoundingClientRect():null;
  return {existe:!!c, visible:!!(r&&r.height>0&&el.style.display!=='none'),
    txt:c?(c.innerText||'').replace(/\\s+/g,' ').trim():'', alto:r?Math.round(r.height):0};})()`;

const results = [];
console.log('\n──── comprobaciones ──── (esta app corre en la versión ' + BUILD + ')');
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };
async function shot(name, tema) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(320);
  await ev(`(()=>{const b=document.getElementById('h-builds'); if(b&&b.scrollIntoView)b.scrollIntoView({block:'center'});})()`);
  await sleep(280);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}-${tema}.png`, Buffer.from(r.data, 'base64'));
}

check('V0 el harness sabe con qué versión corre (no la lleva clavada)', BUILD > 0, 'build=' + BUILD);

// ══════════ V1 · con alguien atrasado, la tarjeta aparece y lo nombra ══════════
await montar('mezcla');
let t = await evj(TARJETA);
check('V1 con un teléfono atrasado la tarjeta APARECE y dice de quién es',
  t.existe && t.visible && /Kathe/.test(t.txt) && new RegExp('versión ' + (BUILD - 2)).test(t.txt),
  t.txt.slice(0, 150));
check('V1b dice en qué versión está ÉL, que es la referencia honesta',
  new RegExp('\\b' + BUILD + '\\b').test(t.txt), t.txt.slice(0, 90));
check('V1c y NO acusa a quien está al día ni a quien no tiene dato todavía',
  !/Astrid/.test(t.txt) && !/Chema/.test(t.txt) && /1 al día/.test(t.txt) && /1 sin datos/.test(t.txt),
  t.txt.slice(0, 150));
await shot('versiones', 'light'); await shot('versiones', 'dark');

// ══════════ V4 · la ficha de cada asesorado ══════════
await ev(`openDetail('c1')`); await sleep(900);
const ficha = await ev(`(document.getElementById('d-stats')||{}).textContent||''`);
check('V4 la ficha del atrasado dice su versión y hace cuánto se vio',
  new RegExp('app versión ' + (BUILD - 2)).test(ficha) && /hace 1 días|ayer|hace \d+ días/.test(ficha),
  ficha);
await ev(`openDetail('c3')`); await sleep(800);
const ficha3 = await ev(`(document.getElementById('d-stats')||{}).textContent||''`);
check('V4b a quien no ha abierto la app NO se le inventa una versión',
  !/app versión/.test(ficha3), ficha3);
await ev(`gp('p-home',document.getElementById('sbi-home'),'Inicio')`); await sleep(500);

// ══════════ V2/V3 · silencio cuando no hay nada que hacer ══════════
await montar('aldia');
t = await evj(TARJETA);
check('V2 🔒 con TODOS al día la tarjeta NO existe (una que siempre dice «todo bien» es ruido)',
  !t.existe || !t.visible, JSON.stringify(t).slice(0, 120));
await montar('sindato');
t = await evj(TARJETA);
check('V3 «sin datos» NO es «atrasado»: no dispara la tarjeta',
  !t.existe || !t.visible, JSON.stringify(t).slice(0, 120));

// ══════════ V5 · CONTROL DE MONTAJE ══════════
await montar('mezcla');
t = await evj(TARJETA);
check('V5 🔒 CONTROL: el mismo montaje vuelve a encender la tarjeta (V2/V3 no salieron verdes por vacío)',
  t.existe && t.visible, 'alto=' + t.alto);

console.log('\njsErrors:', JSON.stringify(jsErrors));
const fallos = results.filter(r => r.startsWith('❌')).length;
console.log(`\n${fallos ? '❌' : '✅'} ${results.length - fallos}/${results.length} comprobaciones` + (fallos ? ' — ' + fallos + ' FALLARON' : ' · TODO OK'));
console.log('capturas en ' + OUT);
try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallos || jsErrors.length ? 1 : 0);
