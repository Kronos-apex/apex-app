// _verify-alcance.mjs — v520: el reporte «Sin entrenar» separa a quien el coach PUEDE avisarle
// de quien no. Medido sobre las 22 fichas reales el 22-ago: 12 sin ninguna vía, y la app no se lo
// decía en ninguna parte. Sin login: sintetiza los asesorados y abre el reporte directo.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8801, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9306', '--user-data-dir=' + process.env.TEMP + '/alc-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9306/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shot(n) {
  const h = await ev(`Math.max(document.body.scrollHeight, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof openCoachStat==='function' && typeof coachCanReach==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

// Fixture: 4 fríos, DOS con celular y DOS sin — más uno reciente que NO debe salir.
// Las fechas van relativas a hoy (gotcha de la FASE 3: una fecha absoluta mide otra app cada día).
const MONTAR = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  const hace=d=>new Date(Date.now()-d*86400000).toISOString();
  const cli=(id,name,phone,dias)=>({id,name,phone,days:3,level:'Intermedio',goal:'Ganar músculo',
    payments:[{date:hace(5),dueDate:new Date(Date.now()+25*86400000).toISOString(),amount:150000,note:''}]});
  DB.clients=[
    cli('a1','Ana Con Celular','3001234567'),
    cli('a2','Beto Con Celular','+57 300 765 4321'),
    cli('a3','Carlos Sin Celular',''),
    cli('a4','Diana Sin Celular',''),
    cli('a5','Elena Al Día','3009998888'),
  ];
  const ses=(rid,d)=>({id:'s'+rid+d,sessionId:'x'+rid+d,routineId:rid,routineName:'R',date:hace(d),finishedAt:hace(d),doneSets:4,totalSets:4,exercises:[]});
  DB.history={a1:[ses('r',9)],a2:[ses('r',21)],a3:[ses('r',40)],a4:[],a5:[ses('r',1)]};
  showScreen('s-coach');
  openCoachStat('sinentrenar');
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;

console.log('  montaje:', await ev(MONTAR));
await sleep(700);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

const txt = await ev(`(()=>{const b=document.getElementById('coach-stat-body');return b?b.textContent.replace(/\\s+/g,' ').trim():''})()`);
console.log('  texto:', JSON.stringify(txt.slice(0, 260)));

check('A1 el reporte se abrió y lista a los fríos', /Sin entrenar|Necesitan un empuj/.test(txt) || txt.length > 40, txt.slice(0, 50));
check('A2 aparece la sección de los que SÍ puede empujar', /Necesitan un empuj/.test(txt));
check('A3 aparece la sección de los que NO puede avisar', /No tienes cómo avisarles/.test(txt));
check('A4 explica POR QUÉ no llega y qué hacer', /celular guardado no hay WhatsApp/.test(txt) && /agrégale el número/.test(txt));
check('A5 el titular dice cuántos quedan sin forma de avisar', /2 sin forma de avisar/.test(txt), txt.slice(0, 90));
// 🔴 CONTROL de reparto: cada quien en SU sección, no todos en una.
const secs = await ev(`(()=>{const b=document.getElementById('coach-stat-body');if(!b)return null;
  const out={};let cur=null;
  [...b.children].forEach(el=>{ if(el.classList.contains('sroom-sec')){cur=el.textContent.trim();out[cur]=[];}
    else if(cur&&el.classList.contains('crep-row')){const n=el.querySelector('.crep-nm');if(n)out[cur].push(n.textContent.trim());} });
  return out;})()`);
console.log('  secciones:', JSON.stringify(secs));
const conVia = secs && Object.entries(secs).find(([k]) => /empuj/i.test(k));
const sinVia = secs && Object.entries(secs).find(([k]) => /avisarles/i.test(k));
check('A6 los que tienen celular van en «necesitan un empujón»',
  !!conVia && conVia[1].length === 2 && conVia[1].every(n => /Con Celular/.test(n)), JSON.stringify(conVia && conVia[1]));
check('A7 los que NO tienen celular van en «no tienes cómo avisarles»',
  !!sinVia && sinVia[1].length === 2 && sinVia[1].every(n => /Sin Celular/.test(n)), JSON.stringify(sinVia && sinVia[1]));
check('A8 quien entrenó hace poco NO sale en el reporte', !/Elena/.test(txt));
// 🔴 CONTROL de la nota: existe Y está pintada (una clase sin CSS se lee igual que sin nota)
const nota = await ev(`(()=>{const n=document.querySelector('#coach-stat-body .crep-note');if(!n)return null;
  const cs=getComputedStyle(n);return {bg:cs.backgroundColor,color:cs.color,pad:cs.paddingTop};})()`);
console.log('  nota:', JSON.stringify(nota));
check('A9 la nota está PINTADA (fondo y color propios, no texto suelto)',
  !!nota && nota.bg !== 'rgba(0, 0, 0, 0)' && nota.pad !== '0px', JSON.stringify(nota));

await ev(`(()=>{const n=document.querySelector('#coach-stat-body .crep-note');if(n)n.scrollIntoView({block:'center'});return !!n;})()`);
await sleep(300);
await shot('alcance-claro');

// CONTROL FINAL: si TODOS tienen celular, la sección de los inalcanzables NO aparece.
// Sin esto, una sección que saliera siempre dejaría A3-A4 en verde.
console.log('\n  ── CONTROL: todos con celular ──');
await ev(`(()=>{DB.clients.forEach(c=>{if(!c.phone)c.phone='3001112222';});openCoachStat('sinentrenar');return 'ok';})()`);
await sleep(500);
const txt2 = await ev(`(()=>{const b=document.getElementById('coach-stat-body');return b?b.textContent.replace(/\\s+/g,' ').trim():''})()`);
check('A10 CONTROL · con todos alcanzables la sección de «no puedes avisarles» desaparece',
  !/No tienes cómo avisarles/.test(txt2) && /Necesitan un empuj/.test(txt2), txt2.slice(0, 70));
check('A11 CONTROL · y el titular deja de contar gente sin vía', !/sin forma de avisar/.test(txt2));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));
console.log('\n──── RESULTADOS ALCANCE (v520) ────');
results.forEach(r => console.log('  ' + r));
const bad = results.filter(r => r.startsWith('❌')).length;
console.log('\njsErrors:', JSON.stringify(jsErrors));
console.log(bad ? `\n❌ ${bad} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
chrome.kill(); srv.kill();
process.exit(bad ? 1 : 0);
