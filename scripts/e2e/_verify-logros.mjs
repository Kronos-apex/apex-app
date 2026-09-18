// _verify-logros.mjs — LOS LOGROS Y SU INVITACIÓN A COMPARTIR (v639).
// Pedido del PO (18-sep): revisar los logros —agregar o mejorar— y que al cumplir la semana
// completa, u otro logro, se pueda compartir. Este harness monta a una persona real de forma
// (plan de 3 días, historial de 3 semanas), pinta la tarjeta de logros, simula el cierre del
// entreno que COMPLETA la semana y genera la imagen. Sin login ni red. Claro y oscuro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8841, OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-logros';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9361', '--user-data-dir=' + process.env.TEMP + '/logros-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9361/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'err'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const evj = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`typeof renderGamification==='function' && typeof gxStats==='function' && window._aviUpdateBusy!==undefined && !document.getElementById('avi-loading')`);
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
async function shot(name, sel) {
  await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(e&&e.scrollIntoView)e.scrollIntoView({block:'start'});})()`);
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
}

// Plan de 3 días (L-X-V). Historial: la semana pasada completa (3 días) y esta semana 2 días; el
// entreno de HOY es el tercero → completa la semana. Semanas relativas a hoy, nunca fechas fijas.
const MONTAR = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const client={id:'lg',name:'Nataly Ospina',sex:'F',level:'Intermedio',goal:'Ganar músculo',days:3,
    routines:[{id:'r1',name:'Pierna',day:'Lunes',exercises:[]},{id:'r2',name:'Torso',day:'Miércoles',exercises:[]},{id:'r3',name:'Full',day:'Viernes',exercises:[]}]};
  const lunes=new Date(weekStartTs(new Date()));
  const dia=(semanas,off)=>{const d=new Date(lunes);d.setDate(d.getDate()-7*semanas+off);d.setHours(10,0,0,0);return d.toISOString();};
  const hist=[];
  [[1,0],[1,2],[1,4],[2,0],[2,2],[2,4]].forEach(([w,o],i)=>hist.push({id:'h'+i,date:dia(w,o),finishedAt:dia(w,o),doneSets:12,totalSets:12,totalVol:2500,exercises:[]}));
  // Esta semana: 2 días ANTES de hoy (o los que quepan) + el de hoy más abajo.
  hist.push({id:'t1',date:new Date(Date.now()-2*3600e3).toISOString(),doneSets:12,totalSets:12,totalVol:2500,exercises:[]});
  DB.clients=[client]; DB.history={lg:hist}; DB.prs={lg:{e1:{val:60},e2:{val:40}}};
  CUR.clientId='lg'; CUR.loggedAs='client';
  localStorage.removeItem('ax_gxseen_lg'); localStorage.removeItem('ax_gxweek_lg');
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  document.getElementById('cn-history').classList.add('on');
  renderGamification(client);
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
const m = await ev(MONTAR);
if (m !== 'ok') { console.log('FATAL montaje', m); chrome.kill(); srv.kill(); process.exit(1); }
await sleep(500);

// ── L1 · la tarjeta: 4 grupos, 20 logros, los ganados se pueden tocar, los otros dicen cuánto falta
const t = await evj(`(()=>{const c=document.getElementById('cn-gamif');
  return {grupos:c.querySelectorAll('.gx-gt').length, total:c.querySelectorAll('.gx-badge').length,
    ganados:c.querySelectorAll('button.gx-badge').length, bloqueados:c.querySelectorAll('.gx-badge.lock').length,
    conFalta:[...c.querySelectorAll('.gx-badge.lock .gx-bp')].filter(e=>/\\d\\s*\\/\\s*\\d/.test(e.textContent)).length,
    cuenta:(c.querySelector('.gx-cnt')||{}).textContent||'', ancho:document.documentElement.scrollWidth,
    visto:localStorage.getItem('ax_gxseen_lg')};})()`);
check('L1 cuatro grupos de logros', t.grupos === 4, JSON.stringify(t));
check('L1b los 20 logros del catálogo se pintan', t.total === 20, String(t.total));
check('L1c los ganados son botones (se tocan para compartir)', t.ganados >= 3, String(t.ganados));
check('L1d cada pendiente dice cuánto le falta («3 / 4»)', t.bloqueados > 0 && t.conFalta === t.bloqueados, t.conFalta + '/' + t.bloqueados);
check('L1e la cuenta cuadra («N de 20»)', t.cuenta === `${t.ganados} de 20`, t.cuenta);
check('L1f no se sale del ancho', t.ancho <= 390, String(t.ancho));
check('L1g abrir la tarjeta guarda lo ya ganado como VISTO (no se anuncia después)', !!t.visto && JSON.parse(t.visto).length === t.ganados, t.visto);
for (const tema of ['light', 'dark']) { await ev(`setTheme('${tema}')`); await sleep(300); await shot('logros-' + tema, '#cn-gamif .streak-title'); }

// ── L2 · el cierre del entreno que COMPLETA la semana → invitación a compartir la semana
const w = await evj(`(()=>{const c=DB.clients[0];const h=DB.history.lg;
  const antes=gxWeekComplete(c,h,Date.now());
  // se asegura el estado: esta semana con 3 días distintos (lunes, miércoles de esta semana si ya pasaron, y hoy)
  const lunes=new Date(weekStartTs(new Date()));
  const hoy=new Date();hoy.setHours(12,0,0,0);
  const ds=[0,1,2].map(k=>{const d=new Date(lunes);d.setDate(d.getDate()+k);d.setHours(9,0,0,0);return d;}).filter(d=>d<hoy);
  DB.history.lg=h.filter(s=>new Date(s.date)<lunes).concat(ds.map((d,i)=>({id:'w'+i,date:d.toISOString(),doneSets:12,totalSets:12,totalVol:2500,exercises:[]})));
  if(ds.length<3)DB.history.lg.push({id:'hoy',date:new Date().toISOString(),doneSets:12,totalSets:12,totalVol:2500,exercises:[]});
  // El plan se ajusta a los días que caben esta semana hasta hoy: así el caso «completa la semana» existe CUALQUIER día (un lunes solo hay uno).
  const dist=new Set(DB.history.lg.filter(s=>new Date(s.date)>=lunes).map(s=>new Date(s.date).toDateString())).size;
  c.routines=c.routines.slice(0,Math.max(1,Math.min(3,dist))); c.days=c.routines.length;
  const desp=gxWeekComplete(c,DB.history.lg,Date.now());
  renderWfLogro();
  const el=document.getElementById('wf-logro');
  return {desp, html:(el.innerText||'').replace(/\\s+/g,' ').trim(), dueno:typeof _wfAskOwner!=='undefined'?_wfAskOwner:null};})()`);
check('L2 con la semana completa, el cierre invita a compartirla', /Semana completa/i.test(w.html) && /Compartir mi semana/.test(w.html), JSON.stringify(w));
check('L2b dice cuántos días de cuántos', new RegExp(w.desp.days + ' de ' + w.desp.target + ' días').test(w.html), w.html);
check('L2c toma el turno del cierre (los demás pedidos ceden)', w.dueno === 'logro', String(w.dueno));
const w2 = await ev(`(()=>{renderWfLogro();return (document.getElementById('wf-logro').innerText||'').trim();})()`);
check('L2d la misma semana NO se vuelve a ofrecer en el siguiente cierre', w2 === '', w2);

// ── L3 · un logro NUEVO manda sobre la semana
const n = await evj(`(()=>{localStorage.setItem('ax_gxseen_lg',JSON.stringify(['ent1']));
  renderWfLogro(); return {txt:(document.getElementById('wf-logro').innerText||'').replace(/\\s+/g,' ').trim()};})()`);
check('L3 un logro nuevo se anuncia y se ofrece compartir', /Logro nuevo/i.test(n.txt) && /Compartir mi logro/.test(n.txt), n.txt);
const n2 = await ev(`(()=>{renderWfLogro();return (document.getElementById('wf-logro').innerText||'').trim();})()`);
check('L3b ya anunciado, no se repite', !/Logro nuevo/i.test(n2), n2);

// ── L4 · la imagen se genera y no sale en blanco
const cv = await evj(`(()=>{window._gxLastCanvas=null; gxShareLogro('sem1'); const c=window._gxLastCanvas; if(!c)return {ok:false};
  const x=c.getContext('2d'); const px=x.getImageData(540,1080,1,1).data; const bg=x.getImageData(20,20,1,1).data;
  const url=c.toDataURL('image/png'); return {ok:true,w:c.width,h:c.height,titulo:[px[0],px[1],px[2]],fondo:[bg[0],bg[1],bg[2]],url};})()`);
check('L4 la imagen del logro se genera (1080×1920)', cv.ok && cv.w === 1080 && cv.h === 1920, JSON.stringify({ w: cv.w, h: cv.h }));
if (cv.url) writeFileSync(`${OUT}/imagen-logro.png`, Buffer.from(cv.url.split(',')[1], 'base64'));
const cw = await evj(`(()=>{window._gxLastCanvas=null; _gxShare={kind:'semana',days:3,target:3,weekKey:'2026-09-14'}; gxShareWeek(); const c=window._gxLastCanvas; return c?{ok:true,url:c.toDataURL('image/png')}:{ok:false};})()`);
check('L4b la imagen de la semana completa se genera', cw.ok);
if (cw.url) writeFileSync(`${OUT}/imagen-semana.png`, Buffer.from(cw.url.split(',')[1], 'base64'));

check('sin errores JS', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));
console.log('\n──── LOGROS Y COMPARTIR (v639) ────');
results.forEach(r => console.log('  ' + r));
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas ? `\n❌ ${fallas} FALLARON` : '\n✅ TODO OK'); console.log('  capturas en: ' + OUT);
ws.close(); chrome.kill(); srv.kill(); process.exit(fallas ? 1 : 0);
