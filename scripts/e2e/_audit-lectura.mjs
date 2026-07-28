// _audit-lectura.mjs — FASE 3 DEL ESTUDIO DE INTERFAZ: ¿SE LEE? (2026-07-28)
//
// POR QUÉ EXISTE: la FASE 2 midió estructura y ergonomía —qué lanza, qué se sale, qué es muy
// pequeño para el dedo— y dejó dicho lo que NO respondía: **contraste y letra grande**. Es lo
// que le importa a la mitad del gimnasio: gente que entrena de noche mirando el celular con el
// brazo estirado, y gente que usa el teléfono con la letra subida porque no ve de cerca.
//
// QUÉ MIDE, en las 12 superficies, en los DOS temas:
//   1. CONTRASTE real (WCAG 2.1): color del texto contra el fondo EFECTIVO (subiendo por los
//      padres hasta encontrar un fondo opaco). Umbral 4.5:1, o 3:1 si la letra es grande
//      (≥24px, o ≥18.66px en negrita). Lo que no se puede medir con honestidad —texto sobre
//      foto o sobre degradado— se CUENTA APARTE, no se aprueba en silencio.
//   2. LETRA GRANDE (`data-fs="xl"`, la que ofrece la propia app): qué se sale del teléfono,
//      qué texto queda CORTADO por un alto fijo, y qué control se encoge por debajo de 36px.
//
// No inventa defectos: reporta y ordena por gravedad. El veredicto falla solo con lo que es
// indefendible (contraste por debajo de 3:1, texto cortado, desbordamiento).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { FIXTURE, TABS, PANELES } from './_fixture-12.mjs';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('lectura (contraste y letra grande)');
const PORT = 8833, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-fase3';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9353', '--user-data-dir=' + process.env.TEMP + '/fase3-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9353/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && typeof renderClientToday==='function'`);
await sleep(2000);
const fx = await ev(FIXTURE);
A.ok(fx === 'ok', 'el fixture de las 12 superficies monta', fx);
if (fx !== 'ok') salir(A, { chrome, srv, out: OUT });

// ══════════ SONDA 1 · CONTRASTE ══════════
// Implementa el cálculo de WCAG 2.1 (luminancia relativa + (L1+.05)/(L2+.05)) en la página,
// porque el contraste depende del color REALMENTE pintado, no del token CSS.
const CONTRASTE = sel => `(()=>{
  const p=document.querySelector('${sel}'); if(!p) return {falta:true};
  const rgb=s=>{const m=String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null;
    const v=m[1].split(',').map(x=>parseFloat(x)); return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1};};
  const lum=c=>{const f=x=>{x/=255; return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)};
    return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const mezcla=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a), g:fg.g*fg.a+bg.g*(1-fg.a), b:fg.b*fg.a+bg.b*(1-fg.a), a:1});
  const ratio=(a,b)=>{const L1=lum(a),L2=lum(b); const hi=Math.max(L1,L2),lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05);};
  // Fondo EFECTIVO: sube por los padres hasta un color opaco. Si por el camino hay imagen o
  // degradado, se declara NO MEDIBLE en vez de inventar un número.
  const fondoDe=el=>{
    let sobre=null;
    for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
      const cs=getComputedStyle(n);
      if(cs.backgroundImage&&cs.backgroundImage!=='none') return {noMedible:true};
      const c=rgb(cs.backgroundColor);
      if(c&&c.a>0){ if(c.a>=0.99) return {color: sobre?mezcla(sobre,c):c};
                    sobre = sobre?mezcla(sobre,c):c; }
    }
    const cb=rgb(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};
    return {color: sobre?mezcla(sobre,cb):cb};
  };
  const out=[]; let noMedibles=0, medidos=0;
  const vistos=new Set();
  p.querySelectorAll('*').forEach(el=>{
    // Solo elementos con TEXTO PROPIO (no contenedores que heredan el de sus hijos).
    const propio=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>1)
      .map(n=>n.textContent.trim()).join(' ');
    if(!propio) return;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity||'1')<0.15) return;
    const fg=rgb(cs.color); if(!fg) return;
    const f=fondoDe(el);
    if(f.noMedible){ noMedibles++; return; }
    const col = fg.a<0.99 ? mezcla(fg,f.color) : fg;
    const px=parseFloat(cs.fontSize)||14, peso=parseInt(cs.fontWeight)||400;
    const grande = px>=24 || (px>=18.66 && peso>=700);
    const req = grande?3:4.5;
    const cr = ratio(col,f.color);
    medidos++;
    if(cr < req){
      const clave=(el.className||el.tagName)+'|'+propio.slice(0,20);
      if(vistos.has(clave)) return; vistos.add(clave);
      out.push({txt:propio.slice(0,40), cls:String(el.className||el.tagName).slice(0,28),
        px:Math.round(px), peso, ratio:Math.round(cr*100)/100, pide:req});
    }
  });
  out.sort((a,b)=>a.ratio-b.ratio);
  return {medidos, noMedibles, malos:out.length, peor:out[0]?out[0].ratio:null, lista:out.slice(0,8)};
})()`;

// ══════════ SONDA 2 · LETRA GRANDE ══════════
const LETRA = sel => `(()=>{
  const p=document.querySelector('${sel}'); if(!p) return {falta:true};
  const vw=390;
  const enScroller=el=>{for(let n=el.parentElement;n&&n!==document.body;n=n.parentElement){
    const ox=getComputedStyle(n).overflowX; if(ox==='auto'||ox==='scroll') return true;} return false;};
  const fuera=[], cortados=[], chicos=[];
  p.querySelectorAll('*').forEach(el=>{
    const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) return;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden') return;
    // (a) se sale del ancho del teléfono
    if((r.right>vw+1||r.left<-1) && cs.position!=='fixed' && !enScroller(el)){
      // Con el nombre de la clase a secas no se puede arreglar nada: si el DIV es anónimo, se
      // apunta también su texto y de quién cuelga.
      const padre=el.parentElement?String(el.parentElement.id||el.parentElement.className||'').slice(0,24):'';
      fuera.push({t:String(el.className||el.tagName).slice(0,30), r:Math.round(r.right),
        txt:(el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,34), padre});
    }
    // (b) texto CORTADO por un alto fijo: el contenido no cabe y el sobrante se esconde
    const tieneTexto=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);
    if(tieneTexto && (cs.overflowY==='hidden'||cs.overflow==='hidden') && el.scrollHeight>el.clientHeight+2)
      cortados.push({t:String(el.className||el.tagName).slice(0,30),
        txt:(el.innerText||'').trim().slice(0,32), falta:el.scrollHeight-el.clientHeight});
    // (c) control táctil por debajo del mínimo de la propia app (36px)
    if(/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)){
      if(r.height>0&&r.height<36) chicos.push({t:(el.textContent||el.tagName).trim().slice(0,26),h:Math.round(r.height)});
    }
  });
  return {fuera, cortados, chicos, alto:Math.round(p.scrollHeight||0)};
})()`;

const abrirTab = i => `(()=>{const t=document.querySelectorAll('.cntab')[${i}]; t.click(); return true;})()`;
const tema = t => ev(`(typeof setTheme==='function')&&setTheme('${t}')`);
const fs = v => ev(`(()=>{ ${v ? `document.documentElement.setAttribute('data-fs','${v}')` : `document.documentElement.removeAttribute('data-fs')`}; return 1})()`);

const resContraste = [], resLetra = [];
async function auditar(nombre, sel, abrir) {
  await ev(abrir); await sleep(700);
  for (const t of ['light', 'dark']) {
    await tema(t); await sleep(350);
    const c = await ev(CONTRASTE(sel));
    if (c && !c.falta) resContraste.push({ nombre, tema: t, ...c });
  }
  await tema('light'); await sleep(200);
  await fs('xl'); await sleep(600);
  const l = await ev(LETRA(sel));
  if (l && !l.falta) resLetra.push({ nombre, ...l });
  const png = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${nombre}-xl.png`, Buffer.from(png.data, 'base64'));
  await fs(null); await sleep(300);
}

console.log('\n── 12 superficies · contraste (2 temas) y letra grande ──');
await ev(`(()=>{CUR.loggedAs='client';CUR.clientId='cA';showScreen('s-client');
  const ob=document.getElementById('onboarding'); if(ob)ob.style.display='none';})()`);
await sleep(500);
for (const [nombre, sel, i] of TABS) await auditar(nombre, sel, abrirTab(i));
await ev(`(()=>{CUR.loggedAs='coach';showScreen('s-coach');if(typeof renderAll==='function')renderAll();})()`);
await sleep(1200);
for (const [nombre, sel, abrir] of PANELES) await auditar(nombre, sel, abrir);

// ══════════ REPORTE ══════════
console.log('\n════ CONTRASTE (WCAG 2.1 · 4.5:1, o 3:1 si la letra es grande) ════');
console.log('pantalla                tema    medidos  sin-medir  bajos  el peor');
let peorGlobal = 99, totalBajos = 0, bajo3 = [];
for (const r of resContraste) {
  console.log(`  ${r.nombre.padEnd(20)} ${r.tema.padEnd(7)} ${String(r.medidos).padStart(6)} ${String(r.noMedibles).padStart(9)} ${String(r.malos).padStart(6)}   ${r.peor ?? '—'}`);
  totalBajos += r.malos;
  if (r.peor != null && r.peor < peorGlobal) peorGlobal = r.peor;
  (r.lista || []).forEach(x => { if (x.ratio < 3) bajo3.push({ ...x, pantalla: r.nombre, tema: r.tema }); });
}
if (totalBajos) {
  console.log('\n  los peores (texto · clase · tamaño · contraste / pide):');
  const todos = resContraste.flatMap(r => (r.lista || []).map(x => ({ ...x, pantalla: r.nombre, tema: r.tema })));
  todos.sort((a, b) => a.ratio - b.ratio).slice(0, 14).forEach(x =>
    console.log(`   ${String(x.ratio).padStart(5)} / ${x.pide}  ${x.pantalla}/${x.tema}  «${x.txt}»  .${x.cls} ${x.px}px/${x.peso}`));
}

console.log('\n════ LETRA GRANDE (data-fs="xl") ════');
console.log('pantalla               se-sale  texto-cortado  controles<36px');
let totalFuera = 0, totalCortados = 0, totalChicos = 0;
for (const r of resLetra) {
  console.log(`  ${r.nombre.padEnd(20)} ${String(r.fuera.length).padStart(6)} ${String(r.cortados.length).padStart(13)} ${String(r.chicos.length).padStart(14)}`);
  totalFuera += r.fuera.length; totalCortados += r.cortados.length; totalChicos += r.chicos.length;
  r.cortados.slice(0, 3).forEach(c => console.log(`      ✂️  «${c.txt}» (.${c.t}) le faltan ${c.falta}px`));
  r.fuera.slice(0, 4).forEach(c => console.log(`      →  «${c.txt}» (.${c.t} dentro de ${c.padre}) llega a ${c.r}px`));
}

console.log('\n──── VEREDICTO ────');
A.ok(peorGlobal >= 3, `nada por debajo de 3:1 (el peor mide ${peorGlobal})`, bajo3.slice(0, 5));
A.ok(totalCortados === 0, `con letra grande no se corta ningún texto (${totalCortados})`, resLetra.filter(r => r.cortados.length).map(r => r.nombre));
A.ok(totalFuera === 0, `con letra grande nada se sale del teléfono (${totalFuera})`, resLetra.filter(r => r.fuera.length).map(r => r.nombre));
console.log(`  · textos por debajo del umbral WCAG: ${totalBajos} (informativo — el fallo es por debajo de 3:1)`);
console.log(`  · controles por debajo de 36px con letra grande: ${totalChicos}`);
salir(A, { chrome, srv, out: OUT });
