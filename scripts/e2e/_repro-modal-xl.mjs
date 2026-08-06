// ─────────────────────────────────────────────────────────────────────────────
// _repro-modal-xl.mjs — CON LETRA GRANDE, ¿SE PUEDE GUARDAR?
//
// Defecto reproducido el 2026-08-06 (auditoría de diseño, hallazgo de Diego): con el ajuste de
// texto en «Muy grande» (`data-fs="xl"`), el pie de los modales queda FUERA DE LA PANTALLA y el
// coach no puede pulsar «💾 Guardar». Afecta a los cuatro modales de trabajo, no a uno.
//
// CAUSA: `html[data-fs="xl"] .md{zoom:1.40}` se aplica SIEMPRE, pero la compensación
// `max-height:calc(90vh/1.40)` vive SOLO bajo `[data-zoomw="scale"]` (motores legacy). En un motor
// estandarizado el modal se pinta a 90vh × 1.40 = 126vh, y como `.mdbg` centra con flex y no tiene
// scroll propio, lo que desborda por arriba y por abajo es INALCANZABLE.
//
// QUÉ AFIRMA (y por qué así): no mira el CSS ni la altura — mide si **el botón primario se puede
// tocar**, que es lo único que le importa a quien usa la app. Se lleva el scroll interno al fondo
// (que es lo que haría una persona) y se comprueba con hit-testing que el punto central del botón
// devuelve el botón. Un rect dentro del viewport no basta: puede estar tapado.
//
//   node scripts/e2e/_repro-modal-xl.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('modales con letra grande');

const PORT = 8794, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-mdxl-' + Date.now();
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-modal-xl';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9294', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=360,800', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9294/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); } catch {} };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`typeof om==='function' && typeof applyTextSize==='function' && !!document.getElementById('m-client')`);
await ev(`document.fonts.ready`); await sleep(600);
await ev(`(()=>{const l=document.getElementById('avi-loading');if(l)l.style.display='none';})()`);

// Sonda: lleva el scroll interno al fondo (lo que haría una persona) y comprueba que el ÚLTIMO
// botón del pie se puede tocar de verdad — rect dentro del viewport Y hit-test que lo devuelve.
// 🔴 CADA MODAL SE LLENA HASTA DESBORDAR ANTES DE MEDIR. Sin esto el harness es casi inofensivo:
// pre-login la mayoría de los modales están vacíos, no llegan ni a rozar su `max-height` y pasan
// sin poder fallar. Se comprobó: con un sabotaje que le devolvía a «Comunidad de mi gym» su altura
// en línea de 82vh (que le gana a la regla compensada) el harness salió VERDE, porque ese modal
// sin datos mide cuatro líneas. Con datos reales —un gym con miembros, un documento legal largo—
// sí llega al tope, y ahí el pie vuelve a irse de la pantalla. Un caso que no puede fallar no
// prueba nada, así que se fuerza el estado que importa: relleno alto justo antes del pie.
const RELLENO = mid => `(()=>{
  const md=document.querySelector('#${mid} .md'); if(!md) return false;
  md.querySelectorAll('[data-relleno]').forEach(x=>x.remove());
  const d=document.createElement('div');
  d.setAttribute('data-relleno','1'); d.style.height='2000px'; d.textContent='.';
  const pie=md.querySelector('.mdfooter');
  pie ? md.insertBefore(d,pie) : md.appendChild(d);
  return true;
})()`;

const SONDA = mid => `(()=>{
  const bg=document.getElementById('${mid}'); if(!bg) return {falta:true};
  const md=bg.querySelector('.md'); if(!md) return {falta:true};
  md.scrollTop = md.scrollHeight;                       // scrollear hasta el final
  const pie=md.querySelector('.mdfooter');
  const btn=pie?pie.querySelector('button:last-of-type'):null;
  const r=md.getBoundingClientRect();
  const vh=window.innerHeight, vw=window.innerWidth;
  const out={vh, mdTop:Math.round(r.top), mdBottom:Math.round(r.bottom), mdAlto:Math.round(r.height),
             cortaArriba:Math.round(Math.max(0,-r.top)), cortaAbajo:Math.round(Math.max(0,r.bottom-vh))};
  if(!btn) return Object.assign(out,{sinPie:true});
  const b=btn.getBoundingClientRect();
  out.btn=btn.textContent.trim().slice(0,20);
  out.btnTop=Math.round(b.top); out.btnBottom=Math.round(b.bottom);
  out.dentro = b.top>=0 && b.bottom<=vh && b.left>=0 && b.right<=vw;
  // hit-testing: estar dentro no basta, puede estar tapado
  const cx=Math.min(vw-1,Math.max(0,(b.left+b.right)/2)), cy=Math.min(vh-1,Math.max(0,(b.top+b.bottom)/2));
  const el=document.elementFromPoint(cx,cy);
  out.alcanzable = out.dentro && !!el && (el===btn || btn.contains(el));
  return out;
})()`;

// TODOS los modales que tienen pie, descubiertos del DOM — no una lista escrita a mano que se
// queda vieja en cuanto alguien agrega uno. El defecto era de `.md`, así que la clase entera es
// la superficie: enumerarla es la mitad del arreglo.
const MODALES = await ev(`Array.from(document.querySelectorAll('.mdbg'))
  .filter(bg=>bg.querySelector('.md .mdfooter button'))
  .map(bg=>[bg.id, (bg.querySelector('.mdtitle')||{}).textContent ? bg.querySelector('.mdtitle').textContent.trim().slice(0,28) : bg.id])`);
A.ok(Array.isArray(MODALES) && MODALES.length >= 8,
  `se descubrieron los modales con pie del DOM (${Array.isArray(MODALES) ? MODALES.length : 0})`, MODALES);

// «Grande» (lg) también: 90vh × 1.18 = 106vh, igual de fuera de pantalla. Un candado que solo
// mira el tamaño extremo deja pasar el intermedio, que es el que más gente usa.
for (const fs of ['normal', 'lg', 'xl']) {
  await ev(`applyTextSize('${fs === 'normal' ? '' : fs}')`);
  await sleep(300);
  const puesto = await ev(`document.documentElement.getAttribute('data-fs')`);
  // CONTROL de la sonda: si el atributo no quedó puesto, ninguna cifra de esta vuelta vale.
  A.ok(fs === 'normal' ? !puesto : puesto === fs, `el ajuste «${fs}» quedó puesto de verdad`, { puesto });
  for (const [mid, nombre] of MODALES) {
    await ev(`document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));om('${mid}')`);
    await sleep(450);
    await ev(RELLENO(mid));
    await sleep(150);
    const s = await ev(SONDA(mid));
    // CONTROL: si con 2.000 px de relleno el modal no llegó a su tope, la medida de este modal no
    // prueba nada (y hay que mirar por qué no creció) — no se da por bueno en silencio.
    if (s && !s.falta && !s.sinPie) {
      A.ok(s.mdAlto >= s.vh * 0.6, `${fs}/${mid}: el relleno hizo que el modal llegara a su tope`, s);
    }
    if (s && s.falta) { A.ok(false, `${fs}/${mid}: el modal ni siquiera existe`, s); continue; }
    if (s && s.sinPie) { console.log(`  ·  ${fs}/${mid}: sin .mdfooter, se omite`); continue; }
    A.ok(!!s.alcanzable,
      `${fs} · ${nombre}: se puede pulsar «${s.btn}» tras scrollear hasta el final`, s);
    if (!s.alcanzable) await shot(`${fs}-${mid}-pie-inalcanzable`);
    await ev(`cm('${mid}')`); await sleep(120);
  }
}
await ev(`applyTextSize('')`);
ws.close();
salir(A, { chrome, srv, out: OUT });
