// ─────────────────────────────────────────────────────────────────────────────
// _repro-wf-fs.mjs — LA PANTALLA DE CIERRE CON LETRA GRANDE, ¿CRECE?
//
// Defecto (lista de deuda del 10-sep): el ajuste «Tamaño de texto» del Perfil escala el contenido
// con `zoom`, y la lista de selectores de `styles.css` nombra `.cnp`, `#s-coach .panel`,
// `.gm-body`, `.sroom-body/.sroom-bar` y `.md` — pero NO el cierre de entreno. Quien puso la letra
// en «Muy grande» ve el pico emocional del día (y las cifras de su entreno) a tamaño normal.
//
// 🔴 POR QUÉ NO SE APLICA EL SELECTOR OBVIO: `#workout-finish` es `position:fixed;inset:0` — el
// mismo caso de `.sroom`, donde un `zoom` multiplica una caja que YA ocupa el viewport entero. El
// objetivo correcto es el CONTENEDOR INTERNO (`.wf-inner`), que es el scroller y el gemelo de
// `.sroom-body`. Por eso aquí se mide la CONSECUENCIA (¿el texto crece? ¿se desborda a lo ancho?
// ¿se puede pulsar «Continuar»?) y no la presencia de un selector en el CSS.
//
// MÉTODO: se monta el bloque REAL de `index.html` con el `styles.css` REAL (misma técnica que
// `_repro-cierre-contraste.mjs`): el defecto es puramente CSS y no necesita sesión ni nube.
//
// QUÉ AFIRMA:
//   1. CONTROL de la sonda — `.cnp`, que SÍ está en la lista desde siempre, tiene que crecer. Si
//      no crece, la sonda no sabe ver `zoom` y ninguna otra cifra de la corrida vale.
//   2. CONTROL de cobertura — la sonda tiene que ver los textos del cierre (≥8), o estaría
//      midiendo una pantalla vacía.
//   3. El texto del cierre crece con «lg» y con «xl».
//   4. No se desborda a lo ancho en ningún tamaño (el ancho es el eje que SÍ depende del motor:
//      lección de v452 — altura y ancho no van bajo el mismo guard).
//   5. «Continuar →» se sigue pudiendo PULSAR tras scrollear al fondo (hit-testing, no un rect):
//      si el zoom lo saca de alcance, el cierre se vuelve una trampa sin salida.
//
//   node scripts/e2e/_repro-wf-fs.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('cierre de entreno con letra grande');

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-wf-fs';
mkdirSync(OUT, { recursive: true });

// El bloque #workout-finish tal cual está en index.html, recortado CONTANDO divs (un indexOf del
// primer </div> dejaba fuera las tarjetas y los botones — gotcha de _repro-cierre-contraste).
const ini = HTML.indexOf('<div id="workout-finish"');
let prof = 0, cierre = -1;
const RE = /<div\b|<\/div>/g; RE.lastIndex = ini;
for (let m; (m = RE.exec(HTML));) { prof += m[0] === '</div>' ? -1 : 1; if (prof === 0) { cierre = m.index + 6; break; } }
const BLOQUE = HTML.slice(ini, cierre);

const PORT = 9407;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, '--allow-file-access-from-files',
   '--user-data-dir=' + process.env.TEMP + '/wffs-' + Date.now(), '--no-first-run', 'about:blank']);
await dormir(1800);
const t0 = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(t0.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', m => { const o = JSON.parse(m); A.verError(o); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
const cmd = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
await cmd('Page.enable'); await cmd('Runtime.enable');
const ev = async e => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;
const shot = async n => { try { const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); } catch {} };

await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await cmd('Page.navigate', { url: 'file:///' + join(RAIZ, 'index.html').replace(/\\/g, '/') });
await dormir(1200);

// Montaje: el control `.cnp` (ya en la lista de zoom) + el bloque real del cierre, con datos.
const montaje = await ev(`(()=>{try{
  document.body.innerHTML =
    '<div class="cnp" id="ctl" style="display:block"><div class="card" id="ctl-card">'+
    '<div class="ct-t" id="ctl-t" style="white-space:nowrap">Control (.cnp)</div>'+
    '</div></div>' + ${JSON.stringify(BLOQUE)};
  const wf=document.getElementById('workout-finish'); wf.classList.add('on');
  const f=document.getElementById('wf-photo'); if(f) f.style.backgroundImage="url('media/brand/ath-stand.jpg')";
  const pon=(sel,v)=>{const e=document.querySelector(sel); if(e)e.textContent=v;};
  pon('.wf-title','¡Lo lograste, Andrés!'); pon('.wf-sub','Hombros + Brazos · lunes, 31 de agosto');
  const chips=[['Duración','1 h 23 min'],['Calorías','622 kcal'],['Series','32/32'],['Volumen','7.583 kg']];
  document.getElementById('wf-stats').innerHTML=chips.map(p=>'<div class="wf-stat"><div class="wf-stat-val">'+p[1]+'</div><div class="wf-stat-lbl">'+p[0]+'</div></div>').join('');
  document.getElementById('wf-prs').innerHTML='<div class="wf-pr"><span class="wf-pr-ico">🏅</span><div style="flex:1;min-width:0"><div class="wf-pr-name">Primer récord: Patada de Tríceps en Polea</div><div class="wf-pr-det">15 kg × 10 reps</div></div></div>';
  document.getElementById('wf-faces').innerHTML=[1,2,3,4,5].map(()=>'<button type="button" class="wf-face">😀</button>').join('');
  pon('#wf-feeling-lbl','Gracias — Excelente');
  return 'ok';
}catch(e){return 'ERR:'+(e&&e.message||e)}})()`);
A.ok(montaje === 'ok', 'el montaje del cierre no devolvió error', montaje);
await ev(`(async()=>{try{await document.fonts.ready}catch(e){} return 1})()`);
await dormir(600);

// ── SONDA ────────────────────────────────────────────────────────────────────
// Mide el tamaño EFECTIVO en píxeles de pantalla, no el `font-size` computado: `zoom` NO cambia
// el font-size computado, cambia la caja pintada. Por eso `getBoundingClientRect()`, que es lo
// que de verdad ve el ojo.
//
// 🔬 SE MIDE EL ALTO DE LA PRIMERA LÍNEA, NO EL DEL ELEMENTO. Dos sondas anteriores se
// equivocaron aquí y las dos daban VERDE:
//   1ª «el elemento con más texto» → control de ×2.00 donde el CSS dice 1.40: `zoom` estrecha el
//      ancho DISPONIBLE en unidades del propio elemento, así que el párrafo parte en más líneas y
//      el alto mezcla el zoom con el reflujo.
//   2ª «afirmar que sigue siendo de una línea con `el.getClientRects().length===1`» → **ese
//      candado aprueba por casualidad**: en un elemento de BLOQUE `getClientRects()` devuelve UNA
//      caja de borde pase lo que pase, tenga 1 línea o 5. Aprobaba mientras la cifra del entreno
//      medía ×2.80 (dos líneas × 1.40) sin cantarlo.
// Las LÍNEAS de verdad se cuentan con un `Range` sobre el contenido, que sí devuelve una caja por
// línea. Y midiendo la PRIMERA línea el número es el factor de zoom aunque el texto parta.
const SONDA = sel => `(()=>{
  const el=document.querySelector('${sel}'); if(!el) return {falta:true};
  const r=el.getBoundingClientRect();
  const rg=document.createRange(); rg.selectNodeContents(el);
  const ls=[...rg.getClientRects()].filter(x=>x.height>0&&x.width>0);
  return {alto:Math.round((ls[0]?.height||r.height)*100)/100, cajaAlto:Math.round(r.height*100)/100,
          ancho:Math.round(r.width*100)/100, lineas:ls.length,
          txt:(el.textContent||'').trim().slice(0,26)};
})()`;

const COBERTURA = `(()=>{
  const raiz=document.querySelector('.wf-inner'); if(!raiz) return {falta:true};
  let conTexto=0;
  raiz.querySelectorAll('*').forEach(el=>{
    const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>0).join('');
    const r=el.getBoundingClientRect();
    if(t.length>0 && r.height>0 && r.width>0) conTexto++;
  });
  return {conTexto};
})()`;

// 🔬 EL DESBORDE SE MIDE DENTRO DE `.wf-inner`, NO DE `#workout-finish`: el fondo (`#wf-photo`)
// lleva `transform:scale(1.12)` A PROPÓSITO —compensa el borde que deja el desenfoque de v605— y
// sobresale 23 px por diseño, tapados por el `overflow:hidden` del contenedor. Contarlo daba un
// rojo de 23 px en los TRES tamaños, o sea también con el ajuste apagado: un desborde que aparece
// sin tocar nada no es del cambio que se está midiendo.
const DESBORDE = `(()=>{
  const raiz=document.querySelector('.wf-inner'); if(!raiz) return {falta:true};
  const vw=window.innerWidth; let peor=0, culpable='';
  raiz.querySelectorAll('*').forEach(el=>{
    const r=el.getBoundingClientRect(); const ex=Math.round(r.right-vw);
    if(ex>peor){peor=ex;culpable=(el.id||el.className||el.tagName)+'';}
  });
  const rr=raiz.getBoundingClientRect();
  const exRaiz=Math.round(rr.right-vw); if(exRaiz>peor){peor=exRaiz;culpable='.wf-inner';}
  return {vw, excesoPx:peor, culpable:culpable.slice(0,40)};
})()`;

// «Continuar →» tiene que seguir siendo pulsable DESPUÉS de scrollear al fondo: es la única
// salida de la pantalla.
const CONTINUAR = `(()=>{
  const inner=document.querySelector('.wf-inner');
  if(inner) inner.scrollTop = inner.scrollHeight;
  const b=[...document.querySelectorAll('.wf-btn')].pop(); if(!b) return {falta:true};
  const r=b.getBoundingClientRect(), vh=window.innerHeight, vw=window.innerWidth;
  const dentro = r.top>=0 && r.bottom<=vh+1 && r.left>=-1 && r.right<=vw+1;
  const cx=Math.min(vw-1,Math.max(0,(r.left+r.right)/2)), cy=Math.min(vh-1,Math.max(0,(r.top+r.bottom)/2));
  const el=document.elementFromPoint(cx,cy);
  return {dentro, alcanzable: dentro && !!el && (el===b||b.contains(el)), alto:Math.round(r.height),
          maxScroll: inner? Math.round(inner.scrollHeight-inner.clientHeight):-1};
})()`;

const FS = ['', 'lg', 'xl'];
const MIN = { lg: 1.12, xl: 1.30 };   // los factores del CSS son 1.18 y 1.40; holgura de redondeo
// Dos textos del cierre, los dos de UNA línea: la cifra de su entreno y el antetítulo.
const MEDIDOS = [['cifra del entreno', '.wf-stat-val'], ['antetítulo', '.wf-eyebrow']];
const ctl = {}, wf = {};
let cobertura = null;

for (const fs of FS) {
  await ev(`(()=>{const h=document.documentElement; if('${fs}') h.setAttribute('data-fs','${fs}'); else h.removeAttribute('data-fs'); return 1})()`);
  await dormir(350);
  const puesto = await ev(`document.documentElement.getAttribute('data-fs')`);
  A.ok(fs === '' ? !puesto : puesto === fs, `CONTROL · el ajuste «${fs || 'normal'}» quedó puesto de verdad`, { puesto });
  const k = fs || 'normal';
  ctl[k] = await ev(SONDA('#ctl-t'));
  wf[k] = {};
  for (const [, sel] of MEDIDOS) wf[k][sel] = await ev(SONDA(sel));
  if (k === 'normal') cobertura = await ev(COBERTURA);
  const d = await ev(DESBORDE);
  A.ok(!d.falta && d.excesoPx <= 1, `${k}: el cierre no se desborda a lo ancho (exceso ${d.excesoPx}px)`, d);
  const c = await ev(CONTINUAR);
  A.ok(!!c.alcanzable, `${k}: «Continuar →» se puede pulsar`, c);
  await shot(`wf-${k}`);
}

// ── 1) CONTROL DE LA SONDA ───────────────────────────────────────────────────
{
  const base = ctl.normal?.alto || 0;
  A.ok(base > 0, 'CONTROL · la sonda encontró el texto de `.cnp`', ctl.normal);
  for (const fs of ['lg', 'xl']) {
    const r = base ? ctl[fs].alto / base : 0;
    A.ok(r >= MIN[fs], `CONTROL · la sonda VE el zoom: .cnp crece ×${r.toFixed(2)} con «${fs}» (≥${MIN[fs]})`,
      { base, alto: ctl[fs]?.alto });
  }
}

// ── 2) CONTROL DE COBERTURA + EL CIERRE ──────────────────────────────────────
A.ok((cobertura?.conTexto || 0) >= 8,
  `CONTROL · la sonda ve los textos del cierre (${cobertura?.conTexto} ≥ 8)`, cobertura);
for (const [nombre, sel] of MEDIDOS) {
  const base = wf.normal[sel]?.alto || 0;
  A.ok(base > 0, `${nombre}: la sonda lo encontró (${sel})`, wf.normal[sel]);
  if (!base) continue;
  // CONTROL de la sonda: el `Range` tiene que estar viendo LÍNEAS (≥1 caja). Si devuelve 0, el
  // número de arriba es el alto de la caja de bloque y no mide lo que dice medir.
  for (const fs of ['', 'lg', 'xl']) {
    const k = fs || 'normal';
    A.ok((wf[k][sel]?.lineas || 0) >= 1,
      `CONTROL · ${nombre}: el Range ve líneas en «${k}» (${wf[k][sel]?.lineas})`, wf[k][sel]);
  }
  for (const fs of ['lg', 'xl']) {
    const r = wf[fs][sel].alto / base;
    A.ok(r >= MIN[fs], `el cierre · ${nombre} · «${fs}»: crece ×${r.toFixed(2)} (≥${MIN[fs]})`,
      { base, alto: wf[fs][sel].alto, txt: wf[fs][sel].txt });
  }
}

ws.close();
salir(A, { chrome, out: OUT });
