// Verificación E2E de v592: EL INICIO DEL COACH DEJA DE TAPAR A QUIEN SÍ ENTRENA.
//
// Reporte del PO (8-sep): *«está muy saturada de información innecesaria y me ocultaste a los
// asesorados que han entrenado en el día; quita esa tarjeta [la de las versiones] y la de empujar
// asesorados, eso me contamina la pantalla y me oculta a los que SÍ utilizan la aplicación»*.
//
// Medido ese día contra sus datos reales: **7 personas entrenaron y ninguna se veía**, porque el
// tope de dos avisos (v581) lo ocupaban «7 planes vencen en 5 días» y «16 necesitan un empujón».
//
// 🔒 Se afirma lo que se VE en su pantalla, con alto real — no que exista un contenedor.
// 🔒 Con sus CONTROLES: quitar no puede ser perder, así que se comprueba que la lista de
//    dormidos sigue estando (con su botón) en el reporte, y que la cifra que lleva hasta él
//    sigue en el Inicio.
// Patrón preview-SIN-login.
//
// Corre: node scripts/e2e/_verify-inicio-coach.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8804;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-iniciocoach-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9304', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9304/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-iniciocoach';
try { mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof renderHome==='function' && typeof openCoachStat==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó'); process.exit(1); }

// ── FIXTURE: su situación REAL del 8-sep — 7 entrenaron hoy, 7 por vencer, 16 dormidos ──
const montaje = await ev(`(()=>{try{
  const hoyISO=new Date().toISOString(), dia=86400000;
  const venc=new Date(Date.now()+3*dia).toISOString();
  DB.clients=[]; DB.history={};
  // 7 que entrenaron HOY y además están por vencer (como en sus datos reales)
  ['Claudia','Natalia','Danilo','Astrid','Andres','Valery','Luz'].forEach((n,i)=>{
    const id='e'+i; DB.clients.push({id,name:n+' Prueba',days:3,goal:'Ganar músculo',phone:'3001234567',
      payments:[{date:hoyISO,dueDate:venc,amount:120000}]});
    DB.history[id]=[{id:'h'+i,date:hoyISO,routineId:'r1',routineName:'Pierna',doneSets:12,totalSets:12,finishedAt:hoyISO,exercises:[]}];
  });
  // 16 dormidos, la mayoría SIN teléfono (como en la medición real)
  for(let i=0;i<16;i++){ const id='d'+i;
    DB.clients.push({id,name:'Dormido '+(i+1),days:3,goal:'Salud general',phone:i<3?'3001234567':'',
      payments:[{date:hoyISO,dueDate:new Date(Date.now()+20*dia).toISOString(),amount:120000}]});
    DB.history[id]=[]; }
  DB.templates=DB.templates||[];
  showScreen('s-coach'); gp('p-home',null,'Inicio'); renderHome();
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE su situación del 8-sep: 7 entrenaron hoy, 7 por vencer, 16 dormidos', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }
await ev(`(()=>{const s=document.getElementById('avi-loading');if(s)s.style.display='none';
  const b=document.getElementById('install-banner');if(b)b.style.display='none';return 1;})()`);
await sleep(400);

const vis = id => `(()=>{const e=document.getElementById('${id}');
  if(!e)return {existe:false};
  const r=e.getBoundingClientRect();
  return {existe:true, visible:getComputedStyle(e).display!=='none' && r.height>0, alto:Math.round(r.height),
    txt:(e.innerText||'').replace(/\\s+/g,' ').trim().slice(0,90)};})()`;

const hoy = await ev(vis('h-today-banner'));
check('R1 «entrenaron hoy» SE VE, con alto real y con la gente adentro',
  hoy && hoy.visible && /7 asesorados entrenaron hoy/.test(hoy.txt || ''), JSON.stringify(hoy));

// 🔒 Y no basta con que se VEA: tiene que verse SIN SCROLLEAR. Antes estaba debajo del héroe,
//    las cuatro cifras, la retención, «Mi entrenamiento» y «Comunidad de mi gym» — a dos
//    pantallas. Se mide su posición contra el alto de la pantalla, que es lo que él sufre.
const pos = await ev(`(()=>{const e=document.getElementById('h-today-banner');
  const r=e.getBoundingClientRect();
  const ret=document.getElementById('h-retention-card').getBoundingClientRect();
  return {top:Math.round(r.top+window.scrollY), alturaPantalla:window.innerHeight, antesQueRetencion:r.top<ret.top};})()`);
check('R1-b y se ve SIN scrollear: queda dentro de la primera pantalla y encima de la retención',
  pos && pos.antesQueRetencion === true && pos.top < pos.alturaPantalla,
  JSON.stringify(pos));

const emp = await ev(vis('h-adherence-banner'));
check('R2 la tarjeta de «Empujar» ya no está en el Inicio', emp && emp.existe === false, JSON.stringify(emp));

const bui = await ev(vis('h-builds'));
check('R3 la tarjeta de versiones de la app ya no está en el Inicio', bui && bui.existe === false, JSON.stringify(bui));

const venc = await ev(vis('h-expiry-banner'));
check('R4 CONTROL los vencimientos SIGUEN (no se pidió quitarlos y son la plata)',
  venc && venc.visible && /vence/.test(venc.txt || ''), JSON.stringify(venc));

const mas = await ev(vis('h-more'));
check('R5 y con dos avisos no sobra nada: no aparece «Tienes N avisos más»',
  mas && (!mas.visible || !/avisos? m[áa]s/.test(mas.txt || '')), JSON.stringify(mas));
await shot('inicio-coach');

// ── R6 · CONTROL: quitar no puede ser PERDER — la lista sigue en el reporte, con su botón ──
// 🔬 Se leen las SECCIONES por geometría y no por `innerText`: la habitación se abre con una
//    transición y en ese instante `innerText` devuelve '' aunque el contenido ya esté maquetado
//    (alto 1457 px). Medir la caja de cada encabezado no depende de ese momento.
const rep = await ev(`(()=>{try{ openCoachStat('sinentrenar');
  const b=document.getElementById('coach-stat-body');
  const secs=[...b.querySelectorAll('.sroom-sec')].map(e=>({t:(e.textContent||'').trim(), alto:Math.round(e.getBoundingClientRect().height)}));
  const btns=[...b.querySelectorAll('button')].filter(x=>/Empujar/.test(x.textContent||''));
  // 🔬 La frase se busca DENTRO de la página: recortar el texto antes de afirmar es cómo una
  //    sonda da rojo justo antes de lo que buscaba (v493).
  const nota=[...b.querySelectorAll('.crep-note')].map(e=>(e.textContent||'').trim()).join(' | ');
  return {alto:Math.round(b.getBoundingClientRect().height), botones:btns.length, secs,
    notaOk:/no gastes tu tiempo en esta lista/.test(nota), notaIni:nota.slice(0,60)};
}catch(e){return {err:e.message}}})()`);
const _sec = t => (rep.secs || []).some(x => new RegExp(t).test(x.t) && x.alto > 0);
check('R6-a el reporte «Sin entrenar» sigue teniendo las dos secciones, visibles',
  rep && _sec('Necesitan un empuj') && _sec('No tienes cómo avisarles') && rep.alto > 0,
  JSON.stringify(rep && rep.secs));
check('R6-b y el botón «Empujar» se mudó ahí: 3 botones, uno por cada dormido CON teléfono',
  rep && rep.botones === 3, 'botones=' + (rep && rep.botones));
check('R6-c y la nota que dice que ahí la app no puede hacer nada sigue puesta (decisión del PO, v521)',
  rep && rep.notaOk === true, (rep && rep.notaIni || '') + '…');
await shot('reporte-sinentrenar');
await ev(`(()=>{const r=document.getElementById('coach-stat-room'); if(r)r.classList.remove('on'); return 1;})()`);

// ── R7 · CONTROL: sin nadie entrenando hoy, la pantalla no queda con un hueco ──
const sinHoy = await ev(`(()=>{ Object.keys(DB.history).forEach(k=>{DB.history[k]=[];}); renderHome();
  const e=document.getElementById('h-today-banner');
  const v=document.getElementById('h-expiry-banner');
  return {hoyVisible:getComputedStyle(e).display!=='none', vencVisible:getComputedStyle(v).display!=='none'};})()`);
check('R7 CONTROL si hoy no entrenó nadie, ese aviso no se pinta vacío y el otro sigue',
  sinHoy && sinHoy.hoyVisible === false && sinHoy.vencVisible === true, JSON.stringify(sinHoy));

log('\n  jsErrors: ' + JSON.stringify(jsErrors));
const fails = results.filter(r => r.startsWith('FAIL'));
log(`\n  ${results.length - fails.length}/${results.length} checks OK`);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fails.length || jsErrors.length ? 1 : 0);
