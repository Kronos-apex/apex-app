// _verify-cortes-letra.mjs — LOS CINCO CORTES CON LETRA GRANDE (v716).
//
// El recorrido `_audit-letra-recortes` (19-oct) encontró, con «Muy grande» a 360 px, cinco sitios donde un texto
// se corta o se parte: la rutina abierta (nombre una palabra por renglón y «4×12 series × reps» fuera de la
// tarjeta), el detalle del entreno («4.80 / 0 kg»), Mis récords («Sentadi / lla»), las calorías de nutrición
// («3.050» sin el último 0) y la píldora del coach («Mensaje sin respon»). Esto afirma, en 360 y 390 px con los
// tres tamaños, que DENTRO de cada componente no hay texto cortado, palabra o número partido, ni nada fuera de la
// pantalla. El CONTROL vuelve a poner el CSS de antes y exige que la sonda vea los cinco.
//
// Sin login ni red (la nube está sellada en localhost).
//   node scripts/e2e/_verify-cortes-letra.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { FIXTURE, abrirTab } from './_fixture-12.mjs';
import { SONDA } from './_sonda-recortes.mjs';
import { afirmador, salir, liberarPuerto, cuidarProcesos } from './_afirma.mjs';
const A = afirmador('los cinco cortes con letra grande');
const PORT = 8893, DBG = 9447;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-cortes-letra';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
liberarPuerto(PORT);
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/cortes-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
cuidarProcesos(chrome, srv);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (m, p = {}, ms = 45000) => new Promise(res => { const i = id++; const t = setTimeout(() => { pend.delete(i); res({ timeout: true }); }, ms);
  pend.set(i, r => { clearTimeout(t); res(r); }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
const pantalla = w => send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
await pantalla(360);
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof applyTextSize==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);
const fx = await ev(FIXTURE);
A.ok(fx === 'ok', 'CONTROL · el fixture monta', fx);
if (fx !== 'ok') salir(A, { chrome, srv, out: OUT });
await ev(`(()=>{ const st=document.createElement('style'); st.textContent='#install-banner,#install-pill,.install-pill,#ios-install,.toast{display:none!important}'; document.head.appendChild(st); return 1; })()`);
// El volumen y las calorías más anchos que da un entreno y un plan reales: 5 cifras de volumen, 4 de kcal.
await ev(`(()=>{ DB.history.cA[0].totalVol=12850; DB.nutrition.cA.kcal=3050; return 1; })()`);
await ev(SONDA);

const LIMPIAR = `(()=>{ document.querySelectorAll('.sroom.on,.mdbg.on').forEach(r=>r.classList.remove('on')); try{ AVINAV.layers=0; }catch(e){}
  if(typeof _syncRoomBodyClass==='function') _syncRoomBodyClass(); return 1; })()`;
const COMO = (rol) => rol === 'coach'
  ? `(()=>{ CUR.loggedAs='coach'; showScreen('s-coach'); if(typeof renderAll==='function') renderAll(); return 1; })()`
  : `(()=>{ CUR.loggedAs='client'; CUR.clientId='cA'; showScreen('s-client'); const ob=document.getElementById('onboarding'); if(ob) ob.style.display='none'; return 1; })()`;
// [nombre, rol, cómo se abre, raíz, componente, [[texto que tiene que leerse ENTERO, renglones como mucho]]]
// Un nombre largo puede ir en dos o tres renglones; lo que no puede es quedar una palabra por renglón.
const CASOS = [
  ['rutina abierta', 'client', `${abrirTab('cn-routines')}; document.querySelectorAll('#cn-routines .rc').forEach(r=>r.classList.add('open'))`, '#cn-routines', '.exrow',
    [['Press de Banca con Barra', 3], ['4×12', 1], ['4×10', 1]]],
  ['sala de rutina', 'client', `openRoutineRoom('cA','r1')`, '.sroom.on', '.exrow', [['Press de Banca con Barra', 3], ['4×10', 1]]],
  ['detalle del entreno', 'client', `openSessionRoom('cA','cAs0')`, '#session-room', '.sroom-stat', [['12.850', 1], ['12/12', 1]]],
  ['mis récords', 'client', `${abrirTab('cn-profile')}; perfilAbrir('records')`, '#perfil-room', '.pr-row', [['Sentadilla', 1], ['120 kg', 1]]],
  ['sala de nutrición', 'client', `openNutritionRoom('cA')`, '.sroom.on', '.nutri-card', [['3.050', 1]]],
  ['perfil · mi plan de alimentación', 'client', `${abrirTab('cn-profile')}; perfilAbrir('comida')`, '#perfil-room', '.nutri-card', [['3.050', 1]]],
  ['coach · asesorados', 'coach', `gp('p-clients',document.getElementById('sbi-clients'),'Asesorados'); renderClients()`, '#p-clients', '.cli-pill', [['Mensaje sin responder', 2]]],
  // La misma tarjeta de cifra (.sroom-stat) con lo más ancho que pinta: la plata del mes, a 3 por fila.
  ['coach · ingresos del mes', 'coach', `DB.clients.forEach((c,i)=>{ c.payments=[{date:new Date().toISOString(),dueDate:new Date(Date.now()+20*864e5).toISOString().slice(0,10),amount:[600000,450000,450000,300000][i]||300000}]; }); openCoachStat('ingresos')`,
    '.sroom.on', '.sroom-stat', [['$1.800.000', 1], ['$450.000', 1]]],
  // y la cabecera de esa sala: el mismo número en letra de titular, al lado de su ícono.
  ['coach · ingresos del mes, cabecera', 'coach', `openCoachStat('ingresos')`, '.sroom.on', '.sroom-hero', [['$1.800.000', 1]]],
  // Una cabecera de PALABRAS no baja bajo su ícono mientras su palabra más larga quepa al lado.
  ['sala de nutrición, cabecera', 'client', `openNutritionRoom('cA')`, '.sroom.on', '.sroom-hero', [['nutrición', 1]]],
];
const MALOS = ['casilla', 'corte', 'partida', 'fuera'];
// ¿El texto pedido se lee ENTERO dentro del componente? Cuenta sus renglones y exige que ninguna caja que recorta
// (overflow hidden o clip: un scroller no tapa, desliza) ni el borde de la pantalla le tape un pedazo.
const ENTERO = (raiz, comp, txt) => `(()=>{ const R=document.querySelector(${JSON.stringify(raiz)}); if(!R) return {e:'sin raíz'};
  for(const c of R.querySelectorAll(${JSON.stringify(comp)})){ const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT); let n;
    while((n=w.nextNode())){ const i=n.textContent.indexOf(${JSON.stringify(txt)}); if(i<0) continue;
      const rg=document.createRange(); rg.setStart(n,i); rg.setEnd(n,i+${txt.length});
      const rs=[...rg.getClientRects()].filter(r=>r.width>0.5); if(!rs.length) return {e:'invisible'};
      const tops=new Set(rs.map(r=>Math.round(r.top)));
      let sx=false, sy=false;   // pasado un scroller, lo de más allá en ese eje se desliza: no está tapado
      for(let a=n.parentElement;a&&a!==document.documentElement;a=a.parentElement){ const s=getComputedStyle(a), hx=/hidden|clip/.test(s.overflowX)&&!sx, hy=/hidden|clip/.test(s.overflowY)&&!sy;
        if(/auto|scroll/.test(s.overflowX)) sx=true; if(/auto|scroll/.test(s.overflowY)) sy=true; if(!hx&&!hy) continue;
        const b=a.getBoundingClientRect();
        for(const r of rs){ if((hx&&(r.right>b.right+1||r.left<b.left-1))||(hy&&(r.bottom>b.bottom+1||r.top<b.top-1))) return {e:'tapado por '+a.tagName.toLowerCase()+(a.id?'#'+a.id:'')+(a.className?'.'+String(a.className).trim().split(/ +/).join('.'):''), renglones:tops.size, caja:[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)], donde:[Math.round(rs[0].left),Math.round(rs[0].top),Math.round(rs[rs.length-1].right),Math.round(rs[rs.length-1].bottom)]}; } }
      for(const r of rs){ if(r.right>document.documentElement.clientWidth+1) return {e:'fuera de la pantalla', renglones:tops.size}; }
      return {e:'ok', renglones:tops.size}; } }
  return {e:'no está'}; })()`;
// ¿Alguna CAJA del componente se sale de su contenedor o de la pantalla? Un renglón vacío que desborda no tiene
// texto que la sonda vea (así se le escapó a la primera versión de v716 lo que cazó _repro-sroom-fs).
const CAJAS = (raiz, comp) => `(()=>{ const R=document.querySelector(${JSON.stringify(raiz)}); if(!R) return ['sin raíz']; const vw=document.documentElement.clientWidth, out=[];
  for(const c of R.querySelectorAll(${JSON.stringify(comp)})){ if(!c.getBoundingClientRect().width) continue; const lim=Math.min(vw, c.parentElement.getBoundingClientRect().right);
    for(const e of [c, ...c.querySelectorAll('*')]){ const r=e.getBoundingClientRect(); if(r.width>0&&r.right>lim+1) out.push((e.className||e.tagName)+' +'+Math.round(r.right-lim)); } }
  return out.slice(0,4); })()`;
// Para diseñar el arreglo: el ancho de cada hijo del primer componente (con DIAG=1).
const DIAG = (raiz, comp) => `(()=>{ const c=document.querySelector(${JSON.stringify(raiz)})?.querySelector(${JSON.stringify(comp)}); if(!c) return null;
  const f=e=>({e:(e.className||e.tagName)+'', w:Math.round(e.getBoundingClientRect().width), sw:e.scrollWidth, cw:e.clientWidth});
  return {comp:f(c), hijos:[...c.children].map(f), padre:f(c.parentElement), zoom:getComputedStyle(c).zoom}; })()`;

async function medirCaso([nombre, rol, abrir, raiz, comp, textos], { capturar = true } = {}) {
  const res = [];
  for (const w of [360, 390]) for (const fs of ['normal', 'lg', 'xl']) {
    await pantalla(w); await ev(`applyTextSize('${fs}')`); await sleep(300);
    const m = await ev(`window.__qaRec(${JSON.stringify(raiz)},{comp:${JSON.stringify(comp)}})`);
    const malos = m && !m.falta ? MALOS.flatMap(t => m.out[t].filter(h => h.enComp).map(h => ({ tipo: t, ...h }))) : null;
    const cajas = await ev(CAJAS(raiz, comp));
    const enteros = [];
    for (const [txt, max] of textos) { const e = await ev(ENTERO(raiz, comp, txt)); enteros.push({ txt, max, ...e }); }
    if (process.env.DIAG && fs !== 'normal') console.log(`   ${w}·${fs}`, JSON.stringify(await ev(DIAG(raiz, comp))));
    res.push({ w, fs, m, malos, enteros, cajas });
    if (capturar && w === 360 && fs === 'xl') {
      await ev(`(()=>{ const c=document.querySelector(${JSON.stringify(raiz)})?.querySelector(${JSON.stringify(comp)}); if(c) c.scrollIntoView({block:'center'}); return 1; })()`);
      await sleep(250);
      const png = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`${OUT}/${nombre.replace(/[^a-záéíóúñ]+/gi, '-')}-360-xl.png`, Buffer.from(png.data, 'base64'));
    }
  }
  return res;
}
async function abrirCaso(caso) {
  await ev(LIMPIAR); await pantalla(360); await ev(`applyTextSize('normal')`);
  await ev(COMO(caso[1])); await sleep(500);
  const r = await ev(`(()=>{ try{ ${caso[2]}; return 'ok'; }catch(e){ return 'err: '+e.message; } })()`); await sleep(700);
  return r;
}

for (const caso of CASOS) {
  const [nombre, , , , comp] = caso;
  console.log(`\n── ${nombre} ──`);
  const r = await abrirCaso(caso);
  if (!A.ok(r === 'ok', `${nombre}: CONTROL · se abre`, r)) continue;
  for (const x of await medirCaso(caso)) {
    const et = `${nombre} ${x.w} px · ${x.fs}`;
    if (!A.ok(x.m && !x.m.falta && x.m.nComp > 0 && x.m.nTxt > 0 && x.m.fs === x.fs, `${et}: CONTROL · la sonda midió ${comp} con la letra pedida`, x.m && { nComp: x.m.nComp, nTxt: x.m.nTxt, fs: x.m.fs })) continue;
    A.ok(x.malos.length === 0, `${et}: nada cortado ni partido dentro de ${comp}`, x.malos.slice(0, 3).map(h => `${h.tipo} «${h.txt}» ${h.el}${h.caja ? ' ⊂ ' + h.caja : ''}${h.falta ? ' falta ' + h.falta : ''}`));
    A.ok(Array.isArray(x.cajas) && x.cajas.length === 0, `${et}: ninguna caja de ${comp} se sale de su contenedor`, x.cajas);
    for (const e of x.enteros) A.ok(e.e === 'ok' && e.renglones <= e.max, `${et}: «${e.txt}» se lee entero (≤${e.max} ${e.max > 1 ? 'renglones' : 'renglón'})`, e);
  }
}

// ══════════ CONTROL DE DISCRIMINACIÓN · el CSS de antes de v716 ══════════
// Con las reglas viejas, la sonda TIENE que ver cada uno de los cinco a 360 · Muy grande. Si no los ve, este
// candado no prueba nada.
const CSS_VIEJO = [
  '.sroom-stats{display:grid!important;grid-template-columns:repeat(3,1fr)!important}',
  '.sroom-stat{flex:initial!important;min-width:0!important}',
  '.sroom-stat-v{white-space:normal!important;word-break:break-word!important}',
  '.cli-pill{white-space:nowrap!important;text-overflow:ellipsis!important}',
  '.exrow{flex-wrap:nowrap!important}',
  '.exrow>div:not(.exicon):not(.exsets){flex:initial!important;min-width:auto!important}',
  '.exsets{flex-basis:auto!important;margin-left:auto!important;text-align:right!important;display:block!important}',
  '.pr-row{flex-wrap:nowrap!important}',
  '.pr-row>div:last-child{flex-basis:auto!important;margin-left:0!important;display:block!important}',
  '.nutri-v{font-size:22px!important}',
  '.sroom-hero{flex-wrap:nowrap!important}',
  '.sroom-hero-txt{flex:initial!important;min-width:0!important}',
].join(' ');
const SIN_DEFECTO_ANTES = ['perfil · mi plan de alimentación', 'sala de nutrición, cabecera'];
{
  await ev(`(()=>{ const st=document.createElement('style'); st.id='qa-css-viejo'; st.textContent=${JSON.stringify(CSS_VIEJO)}; document.head.appendChild(st); return 1; })()`);
  for (const caso of CASOS.filter(c => !SIN_DEFECTO_ANTES.includes(c[0]))) {
    await abrirCaso(caso);
    await pantalla(360); await ev(`applyTextSize('xl')`); await sleep(300);
    const m = await ev(`window.__qaRec(${JSON.stringify(caso[3])},{comp:${JSON.stringify(caso[4])}})`);
    const malos = MALOS.flatMap(t => (m?.out?.[t] || []).filter(h => h.enComp));
    const fallan = [];
    for (const [txt, max] of caso[5]) { const e = await ev(ENTERO(caso[3], caso[4], txt)); if (!(e.e === 'ok' && e.renglones <= max)) fallan.push(txt + ': ' + (e.e === 'ok' ? e.renglones + ' renglones' : e.e)); }
    A.ok(malos.length > 0 || fallan.length > 0, `CONTROL · con el CSS de antes la sonda SÍ ve el corte en «${caso[0]}»`, { malos: malos.length, fallan });
  }
  await ev(`document.getElementById('qa-css-viejo').remove()`);
}
// CONTROL · la medición de CAJAS ve el error de la primera versión de v716 (sangría con margin: el renglón vacío
// de la cifra se salía 58 px de la sala de rutina sin que se cortara ninguna letra).
{
  const caso = CASOS.find(c => c[0] === 'sala de rutina');
  await abrirCaso(caso); await pantalla(360); await ev(`applyTextSize('xl')`); await sleep(300);
  await ev(`(()=>{ const st=document.createElement('style'); st.id='qa-margin'; st.textContent='html[data-fs="xl"] .exsets{margin-left:58px!important;padding-left:0!important}'; document.head.appendChild(st); return 1; })()`);
  await sleep(200);
  const cajas = await ev(CAJAS(caso[3], caso[4]));
  await ev(`document.getElementById('qa-margin').remove()`);
  A.ok(Array.isArray(cajas) && cajas.length > 0, 'CONTROL · con la sangría en margin la medición SÍ ve la caja que se sale', cajas);
}
await ev(`applyTextSize('normal')`);
salir(A, { chrome, srv, out: OUT });
