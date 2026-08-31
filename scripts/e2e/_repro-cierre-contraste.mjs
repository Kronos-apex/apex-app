// ¿Se lee el texto de la pantalla de cierre encima de su foto?
//
// El contraste sobre una FOTO no se puede calcular desde el CSS: hay que mirar los PIXELES
// que quedan detras de cada texto. El metodo:
//   1. se monta la pantalla real (marcado de index.html + styles.css + la foto de verdad),
//   2. se hace UNA captura con el texto oculto  -> ese es el fondo real,
//   3. para cada texto se toma su caja y se busca el pixel PEOR de esa caja,
//   4. se calcula el contraste WCAG contra el color del texto, componiendo el opacity de
//      toda la cadena de padres (gotcha de v453: el opacity no se hereda, se multiplica).
//
// Se mide con las TRES fotos, porque `.wf-photo` la comparten la pantalla de cierre, la de
// upsell y la de subida de nivel: el velo tiene que servir para la peor de las tres.
//
//   node scripts/e2e/_repro-cierre-contraste.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import WebSocket from 'ws';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const CSS = readFileSync(join(RAIZ, 'styles.css'), 'utf8');
const FONT = (HTML.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];

// Las tres fotos se LEEN del codigo, no se escriben a mano.
const APP4 = readFileSync(join(RAIZ, 'app-4-entreno.js'), 'utf8');
const foto = (k) => (APP4.match(new RegExp(k + "\\s*=\\s*'([^']+)'")) || [, ''])[1];
const FOTOS = [['cierre', foto('WF_DEFAULT_PHOTO')], ['upsell', foto('PU_DEFAULT_PHOTO')],
               ['nivel', foto('LU_DEFAULT_PHOTO')]];

// El bloque #workout-finish tal cual esta en index.html.
// El bloque se recorta CONTANDO divs: un indexOf del primer cierre dejaba fuera las
// tarjetas y la fila de caritas, que es justo la zona del problema. Lo canto el control de
// cobertura, que vio 9 textos donde tenia que ver muchos mas.
const ini = HTML.indexOf('<div id="workout-finish"');
let prof = 0, cierre = -1;
const RE = /<div\b|<\/div>/g; RE.lastIndex = ini;
for (let m; (m = RE.exec(HTML));) {
  prof += m[0] === '</div>' ? -1 : 1;
  if (prof === 0) { cierre = m.index + 6; break; }
}
const BLOQUE = HTML.slice(ini, cierre > 0 ? cierre : HTML.indexOf('\n</div>', ini));

const UMBRAL_NORMAL = 4.5, UMBRAL_GRANDE = 3.0;   // WCAG AA
const PORT = 9403;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, '--allow-file-access-from-files',
   '--user-data-dir=' + process.env.TEMP + '/wfprof-' + Date.now(), '--no-first-run', 'about:blank']);

const dormir = ms => new Promise(r => setTimeout(r, ms));
await dormir(1800);
const t0 = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(t0.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', m => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
const cmd = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;

let peorGlobal = 99, fallos = 0, medidos = 0;
const detalle = [];

for (const [nombre, ruta] of FOTOS) {
  if (!ruta) { console.log(`🔴 no se leyo la ruta de la foto de ${nombre}`); fallos++; continue; }
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cmd('Page.navigate', { url: 'file:///' + join(RAIZ, 'index.html').replace(/\\/g, '/') });
  await dormir(900);
  // Se monta el bloque real y se le pone la foto y datos de ejemplo.
  await ev(`(()=>{document.body.innerHTML=${JSON.stringify(BLOQUE)};
    const f=document.getElementById('wf-photo'); if(f)f.style.backgroundImage="url('${ruta}')";
    const wf=document.getElementById('workout-finish'); if(wf)wf.classList.add('on');
    const pon=(sel,v)=>{const e=document.querySelector(sel); if(e)e.textContent=v;};
    pon('.wf-title','¡Lo lograste, Andres!'); pon('.wf-sub','Hombros + Brazos · lunes, 31 de agosto');
    const chips=[['Duracion','1 h 23 min'],['Calorias','622 kcal'],['Series','32/32'],['Volumen','7.583 kg']];
    const st=document.getElementById('wf-stats');
    if(st)st.innerHTML=chips.map(function(p){return '<div class="wf-stat"><div class="wf-stat-val">'+p[1]+'</div><div class="wf-stat-lbl">'+p[0]+'</div></div>'}).join('');
    const pr=document.getElementById('wf-prs');
    if(pr)pr.innerHTML='<div class="wf-pr"><span class="wf-pr-ico">T</span><div style="flex:1;min-width:0"><div class="wf-pr-name">Primer record: Patada de Triceps en Polea</div><div class="wf-pr-det">15 kg x 10 reps</div></div></div>';
    const fa=document.getElementById('wf-faces');
    if(fa)fa.innerHTML=[1,2,3,4,5].map(function(){return '<button type="button" class="wf-face">O</button>'}).join('');
    const fl=document.getElementById('wf-feeling-lbl'); if(fl)fl.textContent='Gracias - Excelente';
    return 1})()`);
  // Modo BARRIDO: con WF_SCRIM se prueba un velo alternativo sin tocar styles.css, para
  // elegir el valor midiendo. Sin la variable se mide el velo que hay hoy en produccion.
  if (process.env.WF_SCRIM) {
    await ev(`(()=>{const s=document.createElement('style');
      s.textContent='.wf-photo::after{background:' + ${JSON.stringify(process.env.WF_SCRIM)} + ' !important}';
      document.head.appendChild(s); return 1})()`);
  }
  await ev(`(async()=>{try{await document.fonts.ready}catch(e){} return 1})()`);
  await dormir(700);

  let cargo = false;
  for (let intento = 0; intento < 4 && !cargo; intento++) {
    cargo = await ev(`(()=>{const f=document.getElementById('wf-photo');
      return !!((f&&getComputedStyle(f).backgroundImage)||'').match(/url/)})()`);
    if (!cargo) await dormir(600);
  }
  if (!cargo) { console.log(`🔴 ${nombre}: la foto no se aplico — medida invalida`); fallos++; continue; }

  // Cajas + color efectivo de cada texto (opacity compuesto por la cadena de padres).
  const cajas = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll(
    '.wf-eyebrow,.wf-title,.wf-sub,.wf-stat-val,.wf-stat-lbl,.wf-pr-name,.wf-pr-det,.wf-feeling-q,.wf-feeling-lbl,.wf-btn')]
    .map(e=>{const r=e.getBoundingClientRect(); if(r.width<2||r.height<2)return null;
      const cs=getComputedStyle(e); let op=1,n=e; while(n&&n!==document.documentElement){op*=parseFloat(getComputedStyle(n).opacity||1);n=n.parentElement;}
      return {t:(e.textContent||'').trim().slice(0,28), c:cs.color, fs:parseFloat(cs.fontSize), fw:cs.fontWeight, op,
              x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}).filter(Boolean))`) || '[]');

  // Captura del FONDO: se transparenta SOLO EL TEXTO. Esconder `.wf-inner` entera se
  // llevaba tambien el fondo propio de las tarjetas y del boton, y entonces se median
  // contra la foto pelada textos que en realidad van sobre una superficie. Medir una
  // regla fuera de su contenedor real es el error de `.lerr` (v453) con otra cara.
  await ev(`(()=>{const s=document.createElement('style'); s.id='_sinTexto';
    s.textContent='.wf-inner *{color:transparent!important;text-shadow:none!important}';
    document.head.appendChild(s); return 1})()`);
  await dormir(250);
  const shot = (await cmd('Page.captureScreenshot', { format: 'png' })).result.data;
  const png = Buffer.from(shot, 'base64');
  writeFileSync(join(process.env.TEMP, `wf-fondo-${nombre}.png`), png);
  await ev(`(()=>{const s=document.getElementById('_sinTexto'); if(s)s.remove(); return 1})()`);

  // Se leen los pixeles con el propio canvas del navegador (evita traer un decoder).
  const peores = JSON.parse(await ev(`(async()=>{
    const img=new Image(); img.src='data:image/png;base64,${shot}'; await img.decode();
    const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight;
    const g=c.getContext('2d'); g.drawImage(img,0,0);
    const lum=(r,gg,b)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
      return 0.2126*f(r)+0.7152*f(gg)+0.0722*f(b)};
    const cajas=${JSON.stringify(cajas)};
    return JSON.stringify(cajas.map(k=>{
      const d=g.getImageData(Math.max(0,k.x),Math.max(0,k.y),Math.max(1,k.w),Math.max(1,k.h)).data;
      let peor=-1, mejor=2;
      for(let i=0;i<d.length;i+=4){const L=lum(d[i],d[i+1],d[i+2]); if(L>peor)peor=L; if(L<mejor)mejor=L;}
      return {peor,mejor};
    }));
  })()`) || '[]');

  cajas.forEach((k, i) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(k.c);
    if (!m) return;
    const a = (m[4] === undefined ? 1 : parseFloat(m[4])) * k.op;
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    // El texto se compone sobre el fondo con su alfa efectivo, y se juzga contra el pixel PEOR.
    const bg = peores[i].peor;                       // el mas claro del area = el peor para texto claro
    const bg255 = [k, 0].map(() => 0);               // (placeholder, el calculo real va abajo)
    const Lt = (() => {
      const rgb = [+m[1], +m[2], +m[3]].map(v => v / 255);
      // aproximacion de composicion: color de texto sobre el fondo peor, en luminancia
      const Ltexto = 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]);
      return a * Ltexto + (1 - a) * bg;
    })();
    const ratio = (Math.max(Lt, bg) + 0.05) / (Math.min(Lt, bg) + 0.05);
    const grande = k.fs >= 24 || (k.fs >= 18.66 && +k.fw >= 700);
    const umbral = grande ? UMBRAL_GRANDE : UMBRAL_NORMAL;
    medidos++;
    if (ratio < peorGlobal) peorGlobal = ratio;
    if (ratio < umbral) { fallos++; detalle.push(`   🔴 ${nombre} · «${k.t}» ${ratio.toFixed(2)}:1 (pide ${umbral})`); }
    else detalle.push(`   ✅ ${nombre} · «${k.t}» ${ratio.toFixed(2)}:1`);
  });
}

detalle.forEach(d => console.log(d));
if (medidos < 12) { console.log(`\n🔴 solo ${medidos} textos medidos: el montaje no barrio lo que dice`); fallos++; }
console.log(`\npeor contraste: ${peorGlobal === 99 ? 'n/d' : peorGlobal.toFixed(2) + ':1'} · ${fallos ? '🔴 ' + fallos + ' por debajo del umbral' : '✅ todos legibles'}`);
ws.close(); chrome.kill();
process.exit(fallos ? 1 : 0);
