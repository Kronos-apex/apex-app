// _medir-retencion-caja.mjs — v758: ¿el número de la barra más alta de «Retención semanal» queda DENTRO de su caja?
//
// POR QUÉ EXISTE: el verificador midió en el Inicio una caja de 60 px con columnas de ~82 px; el número de la barra más alta salía
// por arriba y se montaba sobre el encabezado de la tarjeta. Esto lo MIDE en Chrome real (el candado de la suite es estático):
// a 360 y 390 px, en claro y oscuro y con letra normal y grande (data-fs xl), con una barra en el máximo.
// Mide: (1) el número más alto queda dentro de la caja de barras y por DEBAJO del encabezado de la tarjeta (.ch);
//       (2) las barras no se salen de su ranura. CONTROL: con la caja vieja (alto fijo de 60 px) la sonda TIENE que ver el desborde.
// Con PANTALLAZOS=<carpeta> guarda capturas de PÁGINA COMPLETA del Inicio (aviso de instalar oculto).
//   node scripts/e2e/_medir-retencion-caja.mjs [carpeta-de-pantallazos]
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { FIXTURE } from './_fixture-12.mjs';
import { afirmador, salir, liberarPuerto, cuidarProcesos } from './_afirma.mjs';
const A = afirmador('retención · caja de barras');
const PORT = 8893, DBG = 9447;
const OUT = process.argv[2] || '';
if (OUT) mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
liberarPuerto(PORT);
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/retcaja-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
cuidarProcesos(chrome, srv);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (m, p = {}, ms = 45000) => new Promise(res => { const i = id++; const t = setTimeout(() => { pend.delete(i); res({ timeout: true }); }, ms); pend.set(i, r => { clearTimeout(t); res(r); }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderHome==='function' && typeof applyTextSize==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);
A.ok((await ev(FIXTURE)) === 'ok', 'el fixture se montó');
// Una barra en el MÁXIMO: 4 sesiones de dos asesorados el mismo día (hoy), el resto en 0-1.
await ev(`(()=>{ const ses=(cid,n)=>{const d=new Date();d.setHours(18,0,0,0);return {id:cid+'x'+n,sessionId:cid+'sx'+n,routineId:'r1',routineName:'Full body A',date:d.toISOString(),startedAt:d.toISOString(),finishedAt:d.toISOString(),totalVol:3000,doneSets:12,totalSets:12,exercises:[]};};
  DB.history.cA=(DB.history.cA||[]).concat([ses('cA',1),ses('cA',2)]); DB.history.cB=(DB.history.cB||[]).concat([ses('cB',1),ses('cB',2)]); return 'ok'; })()`);
await ev(`(()=>{CUR.loggedAs='coach';showScreen('s-coach');gp('p-home',document.getElementById('sbi-home'),'Inicio');renderHome();return 'ok';})()`);
await sleep(600);
const MIDE = `(()=>{ const card=document.getElementById('h-retention-card'), cont=document.getElementById('h-ret-bars'); if(!card||card.style.display==='none')return {err:'sin tarjeta'};
  const ch=card.querySelector('.ch').getBoundingClientRect(), caja=cont.firstElementChild.getBoundingClientRect();
  const cols=[...cont.firstElementChild.children]; /* v759: se mide contra la BARRA DE COLOR (si la barra va dentro de una ranura de alto fijo, la ranura NO es la barra) */ const barDe=c=>{const x=c.children[1]; return (x&&x.firstElementChild)||x;}; const nums=cols.map(c=>c.children[0]).filter(n=>n.textContent.trim());
  const altos=nums.map(n=>({t:n.textContent, top:n.getBoundingClientRect().top, bottom:n.getBoundingClientRect().bottom}));
  const maxN=Math.min(...altos.map(a=>a.top));
  // el número va JUSTO encima de SU barra: distancia entre la base del número y el tope de su barra (debe ser ~3 px, nunca decenas)
  const gaps=cols.filter(c=>c.children[0].textContent.trim()).map(c=>Math.round((barDe(c).getBoundingClientRect().top-c.children[0].getBoundingClientRect().bottom)*10)/10);
  const gapMax=gaps.length?Math.max(...gaps):-1, gapMin=gaps.length?Math.min(...gaps):-1;
  const barMax=Math.max(...cols.map(c=>barDe(c).getBoundingClientRect().height));   // la barra más alta mide 52 px: una caja de alto fijo la APRIETA
  const fuera=cols.filter(c=>barDe(c).getBoundingClientRect().top < caja.top-0.5 || barDe(c).getBoundingClientRect().bottom > caja.bottom+0.5).length;
  return {cajaTop:Math.round(caja.top*10)/10, cajaH:Math.round(caja.height*10)/10, chBottom:Math.round(ch.bottom*10)/10, numTop:Math.round(maxN*10)/10, hay: nums.length, barrasFuera: fuera, gapMin, gapMax, barMax: Math.round(barMax*10)/10}; })()`;
const ver = (r) => !r.err && r.hay >= 1 && r.numTop >= r.cajaTop - 0.5 && r.numTop >= r.chBottom - 0.5 && r.barrasFuera === 0 && r.gapMax <= 6 && r.gapMin >= 0 && r.barMax >= 51.5;
for (const w of [360, 390]) for (const tema of ['light', 'dark']) for (const fs of ['normal', 'xl']) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
  await ev(`setTheme('${tema}'); applyTextSize('${fs}'); renderHome(); document.querySelectorAll('#install-banner').forEach(b=>{b.style.display='none';b.classList.add('hide');}); 'ok'`);
  await sleep(500);
  const r = await ev(MIDE);
  A.ok(ver(r), `${w}px · ${tema} · letra ${fs}: el número queda dentro de la caja, bajo el encabezado y a ≤6 px de SU barra`, r);
  if (OUT) {
    // PÁGINA COMPLETA: se mide el alto real del documento del panel y se captura más allá del viewport
    const dim = await ev(`(()=>{const e=document.scrollingElement; const p=document.getElementById('p-home'); return {h:Math.max(e.scrollHeight, document.body.scrollHeight, (p&&p.scrollHeight)||0)};})()`);
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.min(4000, Math.max(800, Math.ceil(dim.h) + 40)), deviceScaleFactor: 2, mobile: true });
    await sleep(400);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    if (shot.data) writeFileSync(`${OUT}/inicio-${w}-${tema === 'light' ? 'claro' : 'oscuro'}-${fs === 'xl' ? 'letra-grande' : 'normal'}.png`, Buffer.from(shot.data, 'base64'));
  }
}
// CONTROL de discriminación: la caja vieja (alto fijo de 60 px) TIENE que verse desbordada
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await ev(`setTheme('light'); applyTextSize('normal'); renderHome(); document.getElementById('h-ret-bars').firstElementChild.style.height='60px'; 'ok'`);
await sleep(400);
const viejo = await ev(MIDE);
A.ok(!ver(viejo), 'CONTROL: con la caja vieja de 60 px la sonda ve el número fuera de su caja', viejo);
// CONTROL 2 (v759): la estructura de 070942c — la barra de color dentro de una RANURA de 52 px — deja el número flotando lejos de una barra baja.
// Antes la sonda medía contra children[1] (la ranura) y NO lo habría visto; ahora mide contra la barra de color.
await ev(`setTheme('light'); applyTextSize('normal'); renderHome(); document.querySelectorAll('#h-ret-bars button.ret-dia').forEach(b=>{ const bar=b.children[1]; const slot=document.createElement('span'); slot.style.cssText='height:52px;width:100%;display:flex;align-items:flex-end'; bar.replaceWith(slot); slot.appendChild(bar); }); 'ok'`);
await sleep(400);
const ranura = await ev(MIDE);
A.ok(!ver(ranura) && ranura.gapMax > 20, 'CONTROL: con la ranura de 52 px de 070942c la sonda ve el número lejos de su barra baja (mide contra la barra de color)', ranura);
salir(A, { chrome, srv });
