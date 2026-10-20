// _audit-letra-recortes.mjs — ¿QUÉ MÁS SE CORTA CON LETRA GRANDE? (19-oct-2026, tras v715)
//
// POR QUÉ EXISTE: v715 arregló las casillas de la serie (con «Muy grande» a 360 px «120» se veía «12») y
// ninguna auditoría lo había visto. `_audit-lectura` (FASE 3) sí mide letra grande, pero solo a 390 px, solo
// «Muy grande» y solo tres cosas: lo que se sale del teléfono, el texto cortado por un ALTO fijo y los
// controles chicos. No mira lo que se corta a lo ANCHO.
//
// Recorre las 12 superficies con sus pestañas, las habitaciones, las ventanas, el guiado y el fin de entreno, a
// 360 y 390 px con letra normal, grande y muy grande, y mide cinco cosas:
//   1. CASILLA  — el valor (o la pista) de un input/select no cabe en su ancho útil.
//   2. CORTE    — un texto queda visible A MEDIAS: lo tapa una caja con overflow hidden/clip. Lo que queda
//                 escondido ENTERO no cuenta (un acordeón cerrado no es un corte). El corte con «…»
//                 (text-overflow) y el de line-clamp van aparte: son recortes A PROPÓSITO, no defectos.
//   3. PARTIDA  — una palabra de 3+ letras, o un número, queda partida en dos renglones.
//   4. MONTADOS — dos textos de la misma capa se pisan.
//   5. FUERA    — un texto se sale del ancho del teléfono.
// CONTROLES:
//   (a) cobertura: cada superficie mide texto;
//   (b) discriminación: una caja de prueba con los cuatro defectos fabricados TIENE que salir con los cuatro, y
//       su gemela sana con ninguno;
//   (c) el caso real: con el CSS de antes de v715, la sonda TIENE que ver cortadas las casillas del guiado.
//
// Sin login ni red (la nube está sellada en localhost). Es una AUDITORÍA: sale en 1 solo si fallan sus
// controles; los hallazgos se leen.
//   node scripts/e2e/_audit-letra-recortes.mjs   → volcado en %TEMP%/avi-letra-recortes/ (hallazgos.json + capturas)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { FIXTURE, TABS, PANELES, abrirTab } from './_fixture-12.mjs';
import { SONDA } from './_sonda-recortes.mjs';
import { afirmador, salir, liberarPuerto, cuidarProcesos } from './_afirma.mjs';
const A = afirmador('letra grande · recortes');
const PORT = 8891, DBG = 9445;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-letra-recortes';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
liberarPuerto(PORT);
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/recortes-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
cuidarProcesos(chrome, srv);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
const dialogos = [];
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  // Un alert/confirm deja la página muda y la corrida entera colgada: se cierra y se apunta.
  if (m.method === 'Page.javascriptDialogOpening') { dialogos.push(String(m.params?.message || '').slice(0, 80)); ws.send(JSON.stringify({ id: id++, method: 'Page.handleJavaScriptDialog', params: { accept: false } })); } });
// Con plazo: una sola espera colgada no puede llevarse la corrida entera.
const send = (m, p = {}, ms = 45000) => new Promise(res => { const i = id++; const t = setTimeout(() => { pend.delete(i); res({ timeout: true }); }, ms);
  pend.set(i, r => { clearTimeout(t); res(r); }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
const pantalla = w => send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
await pantalla(360);
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof gmRender==='function' && typeof applyTextSize==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);
const fx = await ev(FIXTURE);
A.ok(fx === 'ok', 'el fixture de las 12 superficies monta', fx);
if (fx !== 'ok') salir(A, { chrome, srv, out: OUT });
// La píldora «Instalar» y los toasts son capas fijas que no son de ninguna pantalla.
await ev(`(()=>{ const st=document.createElement('style'); st.textContent='#install-banner,#install-pill,.install-pill,#ios-install,.toast{display:none!important}'; document.head.appendChild(st); return 1; })()`);

// ══════════ LA SONDA (se instala una vez en la página) ══════════
// Todas las cajas se comparan en el MISMO espacio (getBoundingClientRect / getClientRects, ya con el zoom),
// salvo la casilla, que compara su texto con su ancho útil en el espacio de la propia casilla (como v715).
await ev(SONDA);
// Lleva un hallazgo a la vista y lo marca para la captura.
const VER = k => `(()=>{ const e=document.querySelector('[data-qrec="${k}"]'); if(!e) return false; e.scrollIntoView({block:'center',inline:'nearest'});
  e.style.outline='2px solid #ff00d4'; e.style.outlineOffset='1px'; return true; })()`;
const DESVER = k => `(()=>{ const e=document.querySelector('[data-qrec="${k}"]'); if(e){ e.style.outline=''; e.style.outlineOffset=''; } return 1; })()`;
const LETRA = fs => `(()=>{ applyTextSize('${fs}'); return document.documentElement.getAttribute('data-fs')||'normal'; })()`;
const LIMPIAR = `(()=>{ document.querySelectorAll('.sroom.on,.mdbg.on').forEach(r=>r.classList.remove('on'));
  ['workout-finish','premium-upsell','level-up'].forEach(i=>{ const e=document.getElementById(i); if(e) e.classList.remove('on'); });
  try{ AVINAV.layers=0; }catch(e){} if(typeof _syncRoomBodyClass==='function') _syncRoomBodyClass(); return 1; })()`;
// La raíz «arriba» es la capa abierta más alta: la ventana, si hay; si no, la habitación.
const ARRIBA = `(()=>{ const m=[...document.querySelectorAll('.mdbg.on .md')].pop(); if(m) return '.mdbg.on .md';
  const r=[...document.querySelectorAll('.sroom.on')]; if(r.length){ r.forEach(x=>x.removeAttribute('data-qtop'));
    r.sort((a,b)=>(+getComputedStyle(a).zIndex||0)-(+getComputedStyle(b).zIndex||0)).pop().setAttribute('data-qtop','1'); return '.sroom.on[data-qtop]'; }
  return null; })()`;
const T = s => `(()=>{ try{ ${s}; return 'ok'; }catch(e){ return 'err: '+e.message; } })()`;

// ══════════ LAS SUPERFICIES ══════════
// [nombre, cómo se abre, raíz] — raíz 'arriba' = la capa que abrió el paso.
const hoyY = new Date().getFullYear(), hoyM = new Date().getMonth();
const LLENAR_GUIADO = `document.querySelectorAll('#gm-body .gm-set-row [data-field="kg"]').forEach((i,x)=>{ if(x%3===0) i.value='102.5'; else if(x%3===1) i.value='120'; });
  document.querySelectorAll('#gm-body .gm-set-row [data-field="reps"]').forEach(i=>{ i.value='12'; });
  if(typeof gmBarTotal==='function') document.querySelectorAll('#gm-body [data-field="kg"][data-bar]').forEach(gmBarTotal)`;
const ASESORADO = [
  ...TABS.filter(([n]) => n !== 'a4-progreso').map(([n, sel, cn]) => [n, abrirTab(cn), sel]),
  ['a2-rutinas-abiertas', `${abrirTab('cn-routines')}; document.querySelectorAll('#cn-routines .rc').forEach(r=>r.classList.add('open'))`, '#cn-routines'],
  ...['resumen', 'historial', 'records', 'logros'].map(t => ['a4-progreso-' + t, `${abrirTab('cn-history')}; progTab('${t}')`, '#cn-history']),
  ...['datos', 'records', 'comida', 'peso', 'medidas', 'fotos'].map(s => ['perfil-' + s, `${abrirTab('cn-profile')}; perfilAbrir('${s}')`, 'arriba']),
  ['ajustes', `openAjustes()`, 'arriba'],
  ...['sonido', 'tema', 'letra', 'cuenta'].map(s => ['ajustes-' + s, `openAjustes(); ajustesAbrir('${s}')`, 'arriba']),
  ['sala-sesion', `openSessionRoom('cA','cAs0')`, 'arriba'],
  ['sala-ejercicio', `openExerciseRoom('cA','e1')`, 'arriba'],
  ['sala-mes', `openMonthRoom('cA',${hoyY},${hoyM})`, 'arriba'],
  ['sala-record', `openRecordRoom('cA','Sentadilla')`, 'arriba'],
  ['sala-musculo', `openMuscleRoom('cA','piernas')`, 'arriba'],
  ['sala-nutricion', `openNutritionRoom('cA')`, 'arriba'],
  ['sala-rutina', `openRoutineRoom('cA','r1')`, 'arriba'],
  ['entrenos-rapidos', `openQuickWorkouts()`, 'arriba'],
  ['v-medidas', `openMedModal()`, 'arriba'],
  ['v-fotos', `openPhotosModal()`, 'arriba'],
  ['v-avatar', `openAvatarPicker()`, 'arriba'],
  ['v-ayuda', `openHelp()`, 'arriba'],
  ['v-lista-mercado', `openShopList()`, 'arriba'],
  ['guiado', `${abrirTab('cn-today')}; expandTodayWorkout()`, '#guided-mode', LLENAR_GUIADO],
  ['fin-entreno', `showWorkoutFinish(DB.clients[0].routines[0],{done:12,total:12,totalVol:4850,newPRs:[{name:'Press de Banca con Barra',kg:87.5,reps:5}]})`, '#workout-finish'],
  ['subir-nivel', `showLevelUp(GX_LEVELS[3])`, '#level-up'],
];
const COACH = [
  ...PANELES.map(([n, sel, abrir]) => [n, abrir, sel]),
  ...['entreno', 'comida', 'cuerpo', 'pagos'].map(t => ['c3-ficha-' + t, `openDetail('cA'); detailTab('${t}')`, '#p-detail']),
  ['cv-nuevo-asesorado', `openAddClient()`, 'arriba'],
  ['cv-editar-asesorado', `openDetail('cA'); openEditClient()`, 'arriba'],
  ['cv-rutina-nueva', `openDetail('cA'); openNewRoutine()`, 'arriba'],
  ['cv-rutina-editar', `openDetail('cA'); openEditRoutine('cA',0)`, 'arriba'],
  ['cv-elegir-ejercicio', `openDetail('cA'); openEditRoutine('cA',0); openPicker()`, 'arriba'],
  ['cv-plantilla-nueva', `openNewTemplate()`, 'arriba'],
  ['cv-plantilla-editar', `openEditTemplate('t1')`, 'arriba'],
  ['cv-elegir-plantilla', `openDetail('cA'); openTemplatePicker()`, 'arriba'],
  ['cv-pago', `openDetail('cA'); openPaymentModal()`, 'arriba'],
  ['cv-nutricion', `openDetail('cA'); openNutModal()`, 'arriba'],
  ['cv-medidas', `openDetail('cA'); openMedModal()`, 'arriba'],
  ['cv-aviso', `openDetail('cA'); openNotifModal()`, 'arriba'],
  ['cv-ejercicio-nuevo', `openAddEx()`, 'arriba'],
  ['cv-generar-rutinas', `openDetail('cA'); openGenRutinas()`, 'arriba'],
  ['cv-respaldo', `openBackup()`, 'arriba'],
  ['cv-chat', `openCoachChat('cA')`, 'arriba'],
];

const TAMANOS = ['normal', 'lg', 'xl'], ANCHOS = [360, 390];
const hallazgos = new Map();   // clave → { superficie, tipo, ..., donde:[«360·xl»] }
const cobertura = [];
let capturas = 0;
async function medir(nombre, abrir, raiz, despues) {
  await ev(LIMPIAR); await pantalla(360); await ev(LETRA('normal')); await sleep(150);
  const r = await ev(T(abrir)); await sleep(700);
  if (r !== 'ok') { cobertura.push({ nombre, abrio: r }); return; }
  let sel = raiz;
  if (raiz === 'arriba') { sel = await ev(ARRIBA); if (!sel) { cobertura.push({ nombre, abrio: 'no abrió ninguna capa' }); return; } }
  let minTxt = Infinity;
  for (const w of ANCHOS) for (const fs of TAMANOS) {
    // Se cambia, se deja pintar y se mide en OTRO paso (medir en el acto mide la talla anterior, gotcha de v680).
    await pantalla(w); const puesto = await ev(LETRA(fs)); await sleep(300);
    if (despues) { await ev(T(despues)); await sleep(150); }
    const t0 = Date.now();
    const m = await ev(`window.__qaRec(${JSON.stringify(sel)})`);
    if (Date.now() - t0 > 8000) console.log(`\n   ⏱️ ${nombre} ${w}·${fs}: la sonda tardó ${Math.round((Date.now() - t0) / 1000)} s`);
    if (!m || m.falta || puesto !== fs) { cobertura.push({ nombre, abrio: 'raíz perdida o letra no puesta', w, fs, puesto }); return; }
    minTxt = Math.min(minTxt, m.nTxt);
    for (const [tipo, lista] of Object.entries(m.out)) for (const h of lista) {
      const clave = [nombre, tipo, h.el, h.txt, h.con || ''].join('¦');
      let x = hallazgos.get(clave);
      if (!x) {
        x = { superficie: nombre, tipo, ...h, donde: [] }; delete x.id; hallazgos.set(clave, x);
        if (capturas < 70 && tipo !== 'puntos' && tipo !== 'clamp') {
          if (await ev(VER(h.id))) {
            await sleep(200);
            const png = await send('Page.captureScreenshot', { format: 'png' });
            const f = `${String(++capturas).padStart(2, '0')}-${nombre}-${tipo}-${w}-${fs}.png`;
            writeFileSync(`${OUT}/${f}`, Buffer.from(png.data, 'base64')); x.captura = f;
            await ev(DESVER(h.id));
          }
        }
      }
      x.donde.push(`${w}·${fs}`);
    }
  }
  cobertura.push({ nombre, abrio: 'ok', raiz: sel, textosMedidos: minTxt });
}

// ══════════ CONTROL (b) · la caja de prueba ══════════
// Cuatro defectos fabricados y su gemela sana, dentro de «Hoy» del asesorado.
await ev(`(()=>{CUR.loggedAs='client';CUR.clientId='cA';showScreen('s-client'); const ob=document.getElementById('onboarding'); if(ob)ob.style.display='none'; return 1;})()`);
await sleep(600);
await ev(abrirTab('cn-today')); await sleep(500);
await ev(`(()=>{ const d=document.createElement('div'); d.id='qa-caja'; d.innerHTML=
  '<div data-qa="mal-casilla"><input value="102.5" style="width:30px;padding:0 3px;font-size:16px"></div>'+
  '<div data-qa="mal-corte" style="width:60px;overflow:hidden;white-space:nowrap">Texto bastante largo</div>'+
  '<div data-qa="mal-partida" style="width:40px;overflow-wrap:anywhere">Sentadilla</div>'+
  '<div data-qa="mal-montados" style="position:relative;height:22px"><span>Hola mundo</span><span style="position:absolute;left:0;top:0">Encima texto</span></div>'+
  '<div data-qa="bien"><input value="12" style="width:120px"><div style="width:300px;overflow:hidden;white-space:nowrap">Corto</div>'+
  '<div style="width:300px">Sentadilla</div><div style="height:0;overflow:hidden">Escondido entero</div>'+
  '<div style="width:80px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Con puntos a propósito</div></div>';
  document.getElementById('cn-today').prepend(d); return 1; })()`);
await sleep(200);
const ctl = await ev(`window.__qaRec('#qa-caja')`);
const qas = t => (ctl?.out?.[t] || []).map(h => h.qa);
A.ok(qas('casilla').includes('mal-casilla'), 'CONTROL · la sonda ve la casilla que no cabe', ctl?.out?.casilla);
A.ok(qas('corte').includes('mal-corte'), 'CONTROL · la sonda ve el texto cortado a media letra', ctl?.out?.corte);
A.ok(qas('partida').includes('mal-partida'), 'CONTROL · la sonda ve la palabra partida', ctl?.out?.partida);
A.ok(qas('montados').includes('mal-montados'), 'CONTROL · la sonda ve los textos montados', ctl?.out?.montados);
A.ok(qas('puntos').includes('bien') && !Object.entries(ctl?.out || {}).some(([t, l]) => t !== 'puntos' && l.some(h => h.qa === 'bien')),
  'CONTROL · la gemela sana no sale como defecto (y el «…» a propósito va aparte)', ctl?.out);
await ev(`document.getElementById('qa-caja').remove()`);

// ══════════ EL RECORRIDO ══════════
console.log('\n── asesorado ──');
for (const [n, abrir, raiz, despues] of ASESORADO) { await medir(n, abrir, raiz, despues); process.stdout.write('.'); }
console.log('\n── coach ──');
await ev(LIMPIAR);
await ev(`(()=>{CUR.loggedAs='coach';showScreen('s-coach');if(typeof renderAll==='function')renderAll();return 1;})()`);
await sleep(1200);
for (const [n, abrir, raiz] of COACH) { await medir(n, abrir, raiz); process.stdout.write('.'); }
console.log('');

// ══════════ CONTROL (c) · el caso real de v715 ══════════
// Con el CSS de antes, la sonda TIENE que ver cortadas las casillas del guiado a 360 · Muy grande.
await ev(LIMPIAR);
await ev(`(()=>{CUR.loggedAs='client';CUR.clientId='cA';showScreen('s-client');return 1;})()`); await sleep(500);
await ev(T(`${abrirTab('cn-today')}; expandTodayWorkout()`)); await sleep(800);
await pantalla(360); await ev(LETRA('xl')); await sleep(300);
await ev(`(()=>{ const st=document.createElement('style'); st.id='qa-css-viejo';
  st.textContent='.gm-sinput{padding:8px 10px!important;font-size:16px!important} .gm-set-row{grid-template-columns:32px 1fr 1fr auto!important;column-gap:8px!important;padding-left:12px!important;padding-right:12px!important} .gm-ex-card{padding-left:18px!important;padding-right:18px!important} .gm-set-row .gm-check{width:38px!important;height:38px!important}';
  document.head.appendChild(st); gmRender(); return 1; })()`); await sleep(300);
await ev(T(LLENAR_GUIADO)); await sleep(150);
const viejo = await ev(`window.__qaRec('#guided-mode')`);
await ev(`(()=>{ document.getElementById('qa-css-viejo').remove(); gmRender(); return 1; })()`);
A.ok((viejo?.out?.casilla || []).filter(h => /gm-sinput/.test(h.el)).length >= 3,
  `CONTROL · con el CSS de antes de v715 la sonda SÍ ve cortadas las casillas del guiado (${(viejo?.out?.casilla || []).length})`, viejo?.out?.casilla?.slice(0, 3));

// ══════════ COBERTURA ══════════
const noAbrieron = cobertura.filter(c => c.abrio !== 'ok');
const vacias = cobertura.filter(c => c.abrio === 'ok' && !(c.textosMedidos > 0));
console.log(`\n${cobertura.filter(c => c.abrio === 'ok').length} superficies medidas · ${noAbrieron.length} no abrieron`);
noAbrieron.forEach(c => console.log(`   ⚪ ${c.nombre}: ${c.abrio}`));
A.ok(vacias.length === 0, 'CONTROL · cada superficie que abrió midió texto', vacias.map(c => c.nombre));
A.ok(cobertura.filter(c => c.abrio === 'ok').length >= 50, 'CONTROL · se midieron al menos 50 superficies', cobertura.length);

// ══════════ HALLAZGOS ══════════
const lista = [...hallazgos.values()];
const solo = x => x.donde.every(d => !d.endsWith('normal')) ? (x.donde.some(d => d.endsWith('lg')) ? 'grande' : 'muy grande') : 'normal';
lista.forEach(x => { x.desde = solo(x); });
writeFileSync(`${OUT}/hallazgos.json`, JSON.stringify({ cobertura, lista }, null, 1));
const ORDEN = ['casilla', 'corte', 'partida', 'montados', 'fuera', 'puntos', 'clamp'];
for (const tipo of ORDEN) {
  const l = lista.filter(x => x.tipo === tipo); if (!l.length) continue;
  console.log(`\n════ ${tipo.toUpperCase()} · ${l.length} ════`);
  l.sort((a, b) => ['normal', 'grande', 'muy grande'].indexOf(a.desde) - ['normal', 'grande', 'muy grande'].indexOf(b.desde));
  for (const x of l.slice(0, 60)) console.log(`  [desde ${x.desde.padEnd(10)}] ${x.superficie.padEnd(22)} «${x.txt}»${x.con ? ' ⟂ «' + x.con + '»' : ''}  ${x.el}${x.caja ? ' ⊂ ' + x.caja : ''}${x.mide ? ` ${x.mide}/${x.cabe}` : ''}${x.falta ? ` falta ${x.falta}px` : ''}  (${x.donde.join(' ')})${x.captura ? '  📷 ' + x.captura : ''}`);
}
if (dialogos.length) console.log(`\n⚠️ diálogos cerrados por la corrida: ${dialogos.join(' | ')}`);
console.log(`\nvolcado: ${OUT}/hallazgos.json`);
salir(A, { chrome, srv, out: OUT });
