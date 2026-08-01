// Capturas del LOGIN (#s-login) y del overlay de carga — pantalla PRE-login, sin credenciales.
// Estados: bienvenida (2 CTAs) · con banner flotante de instalar · form de login · wizard registro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { afirmador, afirmaPantalla, afirmaCaptura, salir } from './_afirma.mjs';
const A = afirmador('pantallas de entrada');

const PORT = 8787, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-login-' + Date.now();
const OUT = process.env.LOGIN_OUT || (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-login-shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9287', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9287/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); } catch (e) { console.log('  shot', n, 'ERR:', e.message); } };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// Bypass del service worker
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(1000);

await waitFor(`!!document.getElementById('s-login')`);
await ev(`document.fonts.ready`); await sleep(800);

// 1) Overlay de carga (#avi-loading) — forzar visible
await ev(`(()=>{const l=document.getElementById('avi-loading');if(l){l.style.display='flex';l.style.opacity='1';l.style.visibility='visible';}})()`);
await sleep(500); await shot('0-loading');
await ev(`(()=>{const l=document.getElementById('avi-loading');if(l){l.style.display='none';}})()`);
await sleep(300);

// 2) Bienvenida (2 CTAs) — estado por defecto. Forzar el banner flotante de instalar visible.
await ev(`(()=>{const b=document.getElementById('install-banner');if(b){b.classList.remove('hide');b.style.display='flex';}})()`);
await sleep(500); await afirmaPantalla(ev, A, { nombre: 'bienvenida', sel: '#s-login', minTxt: 60 }); await shot('1-welcome-with-banner');

// 3) Bienvenida SIN banner flotante (para ver el diseño limpio)
await ev(`(()=>{const b=document.getElementById('install-banner');if(b)b.style.display='none';})()`);
await sleep(400); await shot('2-welcome-clean');

// 4) Form de login
await ev(`(()=>{const c=document.getElementById('cin-cta');if(c)c.style.display='none';const card=document.getElementById('cin-card');if(card)card.style.display='block';})()`);
await sleep(500); await afirmaPantalla(ev, A, { nombre: 'formulario de entrar', sel: '#cin-card', minTxt: 20 }); await shot('3-login-form');

// 5) Wizard registro paso 1
await ev(`(()=>{const card=document.getElementById('cin-card');if(card)card.style.display='none';const s=document.getElementById('cin-signup');if(s)s.style.display='block';if(window.WZ&&WZ.open)try{WZ.open()}catch(e){}})()`);
await sleep(600); await shot('4-signup-step1');

// 5-bis) Paso «Tu cuerpo»: es donde viven WhatsApp y Lesiones. Quedó pendiente de v418
// «ver renderizado el campo del teléfono» — y con razón: su ícono `#i-chat` NUNCA existió en
// el sprite, así que salía un hueco. Se AFIRMA que los dos campos se pintan y que sus íconos
// resuelven de verdad (un <use> a un símbolo inexistente no dibuja nada y no da error).
const cuerpo = await ev(`(()=>{
  document.querySelectorAll('#cin-signup .wz-step').forEach(x=>x.classList.remove('on'));
  const b=document.getElementById('wz-s-body'); if(b)b.classList.add('on');
  const vis=el=>{ if(!el)return false; const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
  const ico=sel=>{ const u=document.querySelector(sel); if(!u)return null;
    const id=(u.getAttribute('href')||'').replace('#',''); return !!document.getElementById(id); };
  return {
    telefono: vis(document.getElementById('su-phone')),
    lesiones: vis(document.getElementById('su-notes')),
    icoTelefono: ico('#wz-s-body use[href="#i-chat"]'),
    icoLesiones: ico('#wz-s-body use[href="#i-alert"]'),
    placeholderLesiones: (document.getElementById('su-notes')||{}).placeholder||'',
    // 🔴 Que el símbolo exista no basta: sin la regla CSS el <svg> toma su tamaño POR DEFECTO
    // (300x150) y relleno negro — un bloque enorme en medio del formulario. Se mide la caja real.
    tamIconos: [...document.querySelectorAll('#wz-s-body .wz-row .lic .ic')].map(el=>{
      const r=el.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height); }),
  };
})()`);
A.ok(cuerpo.telefono, 'el campo de WhatsApp se ve en el wizard', cuerpo);
A.ok(cuerpo.lesiones, 'el campo de LESIONES se ve en el wizard', cuerpo);
A.ok(cuerpo.icoTelefono, 'el ícono del teléfono EXISTE en el sprite (no un hueco)', cuerpo);
A.ok(cuerpo.icoLesiones, 'el ícono de lesiones EXISTE en el sprite', cuerpo);
A.ok(/hernia|rodilla/i.test(cuerpo.placeholderLesiones), 'las lesiones traen un ejemplo que se entiende', cuerpo);
A.ok(cuerpo.tamIconos.length >= 2 && cuerpo.tamIconos.every(t => t === '19x19'),
  'los íconos de esas filas miden lo que deben (no un bloque de 300x150)', cuerpo.tamIconos);
console.log('  paso «Tu cuerpo»:', JSON.stringify(cuerpo));
// La tarjeta del wizard tiene scroll PROPIO: sin bajarlo, la captura corta antes de los
// campos y no se ve lo que se quiere revisar (fue justo lo que pasó la primera vez).
await ev(`(()=>{const n=document.getElementById('su-notes'); if(n)n.scrollIntoView({block:'center'});})()`);
await sleep(300); await shot('4b-signup-cuerpo');

// VERIFICACIÓN: el banner flotante debe estar OCULTO con el login activo y VISIBLE al
// entrar a una pantalla interna (regla `#s-login.on ~ #install-banner`).
const check = await ev(`(()=>{
  const b=document.getElementById('install-banner'); b.style.display='flex';
  // estado login activo
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('s-login').classList.add('on');
  const onLogin=getComputedStyle(b).display;
  // simular pantalla interna (coach)
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('s-coach').classList.add('on');
  const onCoach=getComputedStyle(b).display;
  return JSON.stringify({onLogin,onCoach});
})()`);
console.log('  banner display →', check, '(esperado: onLogin=none, onCoach=flex)');

ws.close();
salir(A, { chrome, srv, out: OUT });
