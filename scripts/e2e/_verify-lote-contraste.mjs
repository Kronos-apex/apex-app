// _verify-lote-contraste.mjs — LOTE DE LA AUDITORÍA DE ALCANCE (2026-07-30).
//
// POR QUÉ EXISTE: el «0 textos bajo el umbral, de 1.112 medidos» de v413 era 0 en las **12
// superficies del recorrido**, no en la app. La auditoría profunda del 29-jul encontró fuera de
// ellas cosas peores que todo lo que se había arreglado, porque el recorrido no abre modales, ni
// wizards, ni el generador, ni las habitaciones, ni los estados del guiado.
//
// Este harness NO recorre pantallas: monta cada sitio sospechoso DENTRO de su contenedor real y
// mide el píxel que resulta de la cascada. Así cubre justo lo que un recorrido no alcanza — el
// caso que solo aparece al generar un plan, o al deslizar una serie, o al abrir un modal.
//
// Es el complemento de los checks estáticos de `avi.test.js` («texto sobre tinte: la variante
// legible, no el token crudo»): aquellos miran el CÓDIGO y cazan la clase; este mira el COLOR
// PINTADO y caza lo que ningún grep ve (mezclas alfa, degradados, herencia).
//
// LA SONDA SE VALIDA ANTES DE CREERLE (regla de la FASE 3): si los dos controles no dan 21 y
// 4.54, el harness falla y no reporta ni una sola medición como buena.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { afirmador, salir } from './_afirma.mjs';

const A = afirmador('lote de contraste (fuera de las 12 superficies)');
const PORT = 8842, DP = 9362;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/lote-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`!!document.getElementById('s-login')&&typeof showScreen==='function'`)) break; await sleep(500); }
await sleep(1500);

// `padre` = un contenedor REAL de la app, para que la cadena de fondos y la cascada sean las de
// producción. `.lerr` es el ejemplo de por qué importa: medido suelto da 3.45, pero los dos que
// existen viven dentro de `.cin-card`, que los repinta sobre la tarjeta oscura → 6.79. Medir la
// regla sin su sitio habría hecho «arreglar» un texto que siempre se leyó bien.
const SITIOS = [
  { n: 'CONTROL blanco/negro',        padre: '#p-home', html: `<div style="background:#000;color:#fff;padding:6px">c</div>`, esperado: 21 },
  { n: 'CONTROL #767676/blanco',      padre: '#p-home', html: `<div style="background:#fff;color:#767676;padding:6px">c</div>`, esperado: 4.54 },
  // ── token crudo como texto sobre su propio tinte (fallaba solo en CLARO)
  { n: '.lerr (regla base)',          padre: '#p-home', html: `<div class="lerr on">Tu plan venció</div>` },
  { n: '.lerr REAL (en .cin-card)',   padre: '#cin-card', html: `<div class="lerr on">Tu plan venció</div>` },
  { n: '.sbout:hover',                padre: '#p-home', html: `<div class="sbout">Cerrar sesión</div>`, forzar: 'hover' },
  { n: '.sroom-cmp.down',             padre: '#p-home', html: `<div class="sroom-cmp down"><span>Bajaste vs la vez pasada</span></div>` },
  { n: '.wu-badge',                   padre: '#p-home', html: `<span class="wu-badge">Calentamiento</span>` },
  { n: '.pain-chip.on',               padre: '#p-home', html: `<button class="pain-chip on">Hombro</button>` },
  { n: '.nutr-avoid (⚠️ Evitar)',      padre: '#p-home', html: `<div class="nutr-avoid">⚠️ <b>Evitar:</b> frituras</div>` },
  // ── hex a mano sobre un tinte que SÍ cambia de tema (fallaba solo en OSCURO)
  { n: 'nota de plantilla',           padre: '#p-home', html: `<div style="background:var(--yll);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--ylt)">Nota de la plantilla</div>` },
  { n: 'envGaps del generador',       padre: '#p-home', html: `<div style="background:var(--yll);border:1px solid var(--yl);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:var(--ylt)">Sin opciones en este entorno</div>` },
  { n: 'modal Backup',                padre: '#p-home', html: `<div style="background:var(--yll);border:1.5px solid var(--yl);border-radius:var(--r);padding:12px 14px;font-size:13px;color:var(--ylt);line-height:1.6">Esto reemplaza tus datos</div>` },
  { n: 'perfil de carga alto',        padre: '#p-home', html: `<div style="background:var(--bll);border:1px solid var(--bl);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:var(--blt)">Perfil de carga alto</div>` },
  // ── guiado: filas auxiliares y la banda del deslizamiento
  { n: 'guiado: núm. calentamiento',  padre: '#p-home', html: `<div style="background:var(--bg)"><span class="gm-set-num warm" style="background:rgba(232,151,58,.16);color:var(--ylt);font-size:15px;padding:6px 10px">C1</span></div>` },
  { n: 'guiado: núm. dropset',        padre: '#p-home', html: `<div style="background:var(--bg)"><span class="gm-set-num drop" style="background:rgba(59,130,246,.16);color:var(--blt);font-size:15px;padding:6px 10px">D1</span></div>` },
  { n: 'casilla calentamiento ✓',     padre: '#p-home', html: `<div class="gm-check warm checked" style="padding:6px 10px">✓</div>` },
  { n: 'casilla dropset ✓',           padre: '#p-home', html: `<div class="gm-check drop checked" style="padding:6px 10px">✓</div>` },
  { n: 'casilla normal ✓',            padre: '#p-home', html: `<div class="gm-check checked" style="padding:6px 10px">✓</div>` },
  // El degradado se mide por sus DOS extremos: la sonda no sabe leer un `linear-gradient` (se
  // sube al fondo del padre y da un número falso), así que aquí se le da cada extremo sólido.
  { n: '.drop-reveal (extremo A)',    padre: '#p-home', html: `<div style="display:flex;padding:8px 18px;font-size:12px;font-weight:800;color:#fff;background:#2563EB">🔻 Dropset</div>` },
  { n: '.drop-reveal (extremo B)',    padre: '#p-home', html: `<div style="display:flex;padding:8px 18px;font-size:12px;font-weight:800;color:#fff;background:#1D4ED8">🔻 Dropset</div>` },
  // ── habitaciones (récord y rutina)
  { n: '.rr-hero-rec',                padre: '#p-home', card: 1, html: `<div class="rr-hero-rec">100 kg</div>` },
  { n: '.rr-mile.cur .rr-mile-val',   padre: '#p-home', card: 1, html: `<div class="rr-mile cur"><div class="rr-mile-body"><div class="rr-mile-top"><span class="rr-mile-val">92 kg</span></div></div></div>` },
  { n: '.rr-mile.cur .rr-mile-tag',   padre: '#p-home', card: 1, html: `<div class="rr-mile cur"><div class="rr-mile-body"><div class="rr-mile-top"><span class="rr-mile-tag">Actual</span></div></div></div>` },
  { n: '.rtr-up',                     padre: '#p-home', card: 1, html: `<div class="rtr-sess"><span class="rtr-up">+8%</span></div>` },
  { n: '.rtr-dn',                     padre: '#p-home', card: 1, html: `<div class="rtr-sess"><span class="rtr-dn">-4%</span></div>` },
  // ── tablero de macros del generador (.vmac): superficie OSCURA horneada en los DOS temas por
  //    decisión del PO. Se mide en los dos igual, porque el riesgo es que alguien meta aquí
  //    dentro un `var(--t1/--t2/--t3)` heredado, que en tema claro se rompe.
  { n: 'vmac: OBJETIVO',              padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-obj"><div class="vmac-obj-t">OBJETIVO: GANAR MÚSCULO</div></div></div>` },
  { n: 'vmac: kcal/día',              padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-obj"><div class="vmac-kcal">2.400 kcal/día</div></div></div>` },
  { n: 'vmac: etiqueta kcal',         padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-obj"><div class="vmac-lbl">Superávit moderado</div></div></div>` },
  { n: 'vmac: encabezado',            padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-h">Distribución de macronutrientes</div></div>` },
  { n: 'vmac: Proteína etiqueta',     padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c prot"><div class="vmac-k">Proteína</div></div></div></div>` },
  { n: 'vmac: Proteína valor',        padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c prot"><div class="vmac-n">180g</div></div></div></div>` },
  { n: 'vmac: Proteína kcal',         padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c prot"><div class="vmac-u">720 kcal</div></div></div></div>` },
  { n: 'vmac: Carbos etiqueta',       padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c carb"><div class="vmac-k">Carbos</div></div></div></div>` },
  { n: 'vmac: Carbos valor',          padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c carb"><div class="vmac-n">220g</div></div></div></div>` },
  { n: 'vmac: Carbos kcal',           padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c carb"><div class="vmac-u">880 kcal</div></div></div></div>` },
  { n: 'vmac: Grasas etiqueta',       padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c fat"><div class="vmac-k">Grasas</div></div></div></div>` },
  { n: 'vmac: Grasas valor',          padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c fat"><div class="vmac-n">70g</div></div></div></div>` },
  { n: 'vmac: Grasas kcal',           padre: '#p-home', card: 1, html: `<div class="vmac"><div class="vmac-g"><div class="vmac-c fat"><div class="vmac-u">630 kcal</div></div></div></div>` },
  // ── HABITACIÓN DE NUTRICIÓN (auditoría de diseño del 2026-08-06, hallazgos 3 y 4).
  //    Se montan dentro de la habitación REAL (`#probe-sroom`, ver `montaje`), no sobre #p-home:
  //    el fondo de `.sroom` es `var(--bg)`, no el `var(--w)` de una tarjeta, y la diferencia
  //    cambia el número.
  { n: '.sroom-sec (rótulo dorado)',  padre: '#probe-sroom', html: `<div class="sroom-sec">¿Por qué este plan?</div>` },
  // Las tres etiquetas de la barra de macros. Van por separado porque cada una falla distinto y
  // en un tema distinto. ⚠️ El marcado es el LITERAL que emite `app-5-salud.js` (clase por macro,
  // sólo el ancho en línea): con el `style="background:var(--bl)"` de antes el harness medía un
  // segmento SIN su clase, heredaba otra tinta y daba cuatro rojos que no eran de la app.
  { n: '.nutr-seg proteína (--bl)',   padre: '#probe-sroom', html: `<div class="nutr-bar"><div class="nutr-seg prot" style="width:100%">30%</div></div>` },
  { n: '.nutr-seg carbos (--yl)',     padre: '#probe-sroom', html: `<div class="nutr-bar"><div class="nutr-seg carb" style="width:100%">45%</div></div>` },
  { n: '.nutr-seg grasas (--or)',     padre: '#probe-sroom', html: `<div class="nutr-bar"><div class="nutr-seg fat" style="width:100%">25%</div></div>` },
  // ── vecinos que se dejaron como estaban: van medidos para que el cero tenga alcance declarado
  { n: 'macros del asesorado',        padre: '#p-home', card: 1, html: `<div style="text-align:center;background:var(--yll);border-radius:var(--rsm);padding:10px 4px"><div style="font-size:10px;color:var(--t2)">Carbos</div></div>` },
  { n: '.gm-rest-sec (descanso)',     padre: '#p-home', html: `<div style="background:rgba(13,31,23,.96);padding:10px"><div style="color:#E8973A;font-size:40px;font-weight:800">45</div></div>` },
];

const PROBE = `(sitio)=>{
  // 🔴 La sonda tiene que saber leer TODOS los formatos en los que Chrome serializa un color
  // computado, no solo \`rgb()\`. \`color-mix(in srgb, …)\` —que usa \`.sroom-sec\`— sale como
  // \`color(srgb 0.8 0.7 0.42)\`: con el parser viejo \`fg\` quedaba null, la sonda REVENTABA, y
  // como el error se tragaba en el \`JSON.parse(r||'{}')\` el sitio salía impreso con ✅ y ratio
  // \`undefined\`. Un caso que no puede fallar no es un caso (hermano del gotcha del degradado).
  const rgb=s=>{const t=String(s);
    let m=t.match(/rgba?\\(([^)]+)\\)/);
    if(m){const v=m[1].split(/[ ,\\/]+/).filter(Boolean).map(x=>parseFloat(x));
      return{r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1};}
    m=t.match(/color\\(srgb ([^)]+)\\)/);
    if(m){const v=m[1].split(/[ \\/]+/).filter(Boolean).map(x=>parseFloat(x));
      return{r:v[0]*255,g:v[1]*255,b:v[2]*255,a:v.length>3?v[3]:1};}
    return null;};
  const lum=c=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)};
    return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const mez=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
  const ratio=(a,b)=>{const L1=lum(a),L2=lum(b);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);};
  const fondoDe=el=>{let sobre=null;
    for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
      const cs=getComputedStyle(n); const c=rgb(cs.backgroundColor);
      if(c&&c.a>0){if(c.a>=0.99)return{color:sobre?mez(sobre,c):c};sobre=sobre?mez(sobre,c):c;}}
    const cb=rgb(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};
    return{color:sobre?mez(sobre,cb):cb};};
  const host=document.querySelector(sitio.padre); if(!host) return {err:'sin padre '+sitio.padre};
  const caja=document.createElement('div'); if(sitio.card) caja.className='card';
  caja.innerHTML=sitio.html; host.appendChild(caja);
  let obj=null;
  caja.querySelectorAll('*').forEach(el=>{
    const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>0);
    if(t.length) obj=el;});
  if(!obj){caja.remove();return{err:'sin texto'};}
  if(sitio.forzar==='hover'){obj.style.background='var(--rdl)';obj.style.color='var(--rdt)';}
  const cs=getComputedStyle(obj); const fg=rgb(cs.color); const f=fondoDe(obj);
  if(!fg){caja.remove();return{err:'color ilegible para la sonda: '+cs.color};}
  const hx=c=>'#'+[c.r,c.g,c.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  const px=parseFloat(cs.fontSize)||14, peso=parseInt(cs.fontWeight)||400;
  const grande=px>=24||(px>=18.66&&peso>=700);
  let op=1; for(let n=obj;n&&n!==document.documentElement;n=n.parentElement)op*=parseFloat(getComputedStyle(n).opacity||'1');
  const alfa=Math.max(0,Math.min(1,(fg.a==null?1:fg.a)*op));
  const col=alfa<0.99?mez({...fg,a:alfa},f.color):fg;
  const out={ratio:Math.round(ratio(col,f.color)*100)/100,pide:grande?3:4.5,col:hx(col),fondo:hx(f.color)};
  caja.remove(); return out;
}`;

// 🔴 DOS ARTEFACTOS DE MEDICIÓN QUE HAY QUE MATAR ANTES DE MEDIR EN UNA HABITACIÓN, o el harness
// reporta 1.0 en todo y el rojo es del harness, no de la app:
//   1. `.sroom` cerrada está a `opacity:0` (+ `visibility:hidden`), y la sonda COMPONE el opacity
//      de toda la cadena de padres (lección de los días futuros del calendario) → alfa 0.
//   2. `.sroom.on .sroom-body>*` lleva `animation:roomUp both`, que arranca en `opacity:0`; un
//      hijo recién insertado se mide DENTRO de la animación de entrada.
// Por eso se abre la habitación y se cuelga un contenedor propio con la animación desactivada.
// No es maquillar el caso: a los 0,5 s la persona ve exactamente esto, opacity 1.
const montaje = await ev(`(()=>{try{CUR.loggedAs='coach';showScreen('s-coach');
  ['cin-card','cin-signup'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.display='block';});
  const l=document.getElementById('s-login'); if(l){l.style.display='block';l.classList.add('on');}
  const room=document.querySelector('.sroom'); if(!room) return 'sin .sroom';
  room.classList.add('on');
  const body=room.querySelector('.sroom-body'); if(!body) return 'sin .sroom-body';
  const h=document.createElement('div'); h.id='probe-sroom';
  h.style.animation='none'; h.style.opacity='1';
  body.appendChild(h);
  return 'ok'}catch(e){return String(e&&e.message||e)}})()`);
A.ok(montaje === 'ok', 'el montaje deja alcanzables el panel del coach, la tarjeta de login y la habitación', montaje);
// ⏱️ El sleep va ANTES del control: `.sroom` abre con `transition:opacity .24s`, así que medir
// inmediatamente después del `classList.add('on')` devuelve el valor A MITAD de la transición
// (se midió: 0). No es que la habitación no abra — es que la sonda miró demasiado pronto, la
// misma clase de falso rojo que el boot-check de producción.
await sleep(800);
// CONTROL del montaje: si la habitación no quedó opaca de verdad, sus 4 medidas no valen nada.
const opRoom = await ev(`(()=>{const h=document.getElementById('probe-sroom');if(!h)return -1;
  let op=1; for(let n=h;n&&n!==document.documentElement;n=n.parentElement)op*=parseFloat(getComputedStyle(n).opacity||'1');
  return op;})()`);
A.ok(opRoom === 1, `la habitación quedó realmente opaca (opacity compuesta = ${opRoom}, no 0)`, { opRoom });
await ev(`window.__probe = ${PROBE}`);

const filas = [];
for (const tema of ['light', 'dark']) {
  await ev(`(typeof setTheme==='function')&&setTheme('${tema}')`); await sleep(400);
  for (const s of SITIOS) {
    const r = await ev(`JSON.stringify(window.__probe(${JSON.stringify(s)}))`);
    filas.push({ tema, n: s.n, esperado: s.esperado, ...JSON.parse(r || '{}') });
  }
}

console.log('\n════ contraste medido sitio por sitio (WCAG 2.1 · 4.5:1, o 3:1 si la letra es grande) ════');
console.log('sitio                            tema    ratio  pide   texto     fondo');
const bajos = [], sinMontar = [];
let ctrl = 0;
for (const f of filas) {
  if (f.err) { console.log(`  ⚠️  ${f.n.padEnd(30)} ${f.tema.padEnd(7)} ${f.err}`); sinMontar.push(`${f.n}/${f.tema}: ${f.err}`); continue; }
  // Sin ratio NO se imprime ✅: un sitio que no se pudo medir es un sitio SIN medir, y darlo por
  // bueno en silencio es exactamente el verde sobre lo que no se vio.
  if (typeof f.ratio !== 'number') { console.log(`  ⚠️  ${f.n.padEnd(30)} ${f.tema.padEnd(7)} sin medida (la sonda no devolvió ratio)`); sinMontar.push(`${f.n}/${f.tema}: sin medida`); continue; }
  if (f.esperado != null) { if (Math.abs(f.ratio - f.esperado) <= 0.05) ctrl++; }
  const mal = f.ratio < f.pide;
  if (mal) bajos.push({ ...f });
  console.log(`  ${mal ? '🔴' : '✅'}  ${f.n.padEnd(30)} ${f.tema.padEnd(7)} ${String(f.ratio).padStart(5)}  ${f.pide}   ${f.col}  ${f.fondo}`);
}

console.log('\n──── VEREDICTO ────');
// La sonda PRIMERO: si miente, ninguna de las cifras de arriba vale nada.
A.ok(ctrl === 4, `la sonda está calibrada (4 controles: 21 y 4.54 en los dos temas) — pasaron ${ctrl}`, { ctrl });
A.ok(sinMontar.length === 0, `los ${SITIOS.length} sitios se montaron en su contenedor real`, sinMontar);
A.ok(bajos.length === 0,
  `ningún texto bajo su umbral (${filas.length} medidas: ${SITIOS.length} sitios × 2 temas)`,
  bajos.slice(0, 6).map(b => `${b.n}/${b.tema}=${b.ratio}`));
// ALCANCE, dicho en voz alta: este harness NO es la app entera. Es el complemento de
// `_audit-lectura` (las 12 superficies) y de los checks estáticos de la suite.
console.log(`  · alcance de este cero: ${SITIOS.length} sitios FUERA de las 12 superficies del recorrido.`);
console.log('  · lo que NO cubre: texto sobre foto, degradados (se miden por sus extremos) y');
console.log('    cualquier sitio que nadie haya puesto en esta lista. Ver `_audit-lectura.mjs`.');
salir(A, { chrome, srv });
