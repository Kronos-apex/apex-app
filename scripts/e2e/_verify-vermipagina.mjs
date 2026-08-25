// _verify-vermipagina.mjs — VER LA PÁGINA PÚBLICA SIN SALIR DE LA CUENTA (avi-v542).
//
// Reporte del PO (25-ago): *«hoy aparece un botón de compartir datos de asesorados en la página,
// pero no aparece un link para visitar esa página»*. Desde v523 podía PUBLICAR tarjetas en la
// página que abre su link y no tenía ni una puerta para verla — y aunque la hubiera, con la
// sesión guardada el arranque lo mete derecho a su panel: para ver su propia vitrina tendría que
// cerrar sesión.
//
// 🔴 ESTO TOCA LA CADENA DE ARRANQUE, que es donde este repo se quemó TRES veces (v375/v393/v403)
// y donde v537 encontró que un fallo de módulo echaba al login a quien tenía sesión guardada. Por
// eso no basta la suite: hace falta una sesión REAL, un arranque REAL y una recarga REAL.
//
// LO QUE PROTEGE, en orden de gravedad:
//   1. 🔴 sin la marca, el arranque entra como SIEMPRE (P2 — el control que importa: que no le
//      haya roto el arranque a nadie)
//   2. 🔴 mirar la página NO cuesta la sesión: al volver, entra sin escribir contraseña (P4)
//   3. con la marca, se queda en la página y avisa por qué (P1, P3)
//   4. la puerta existe y se puede pulsar de verdad (P5)
// Cuenta QA sellada (`~/.avi/e2e-creds.json`), nunca un asesorado real.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
const PORT = 8841, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-vermipagina';
const APP = `http://localhost:${PORT}/`;
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9361', '--user-data-dir=' + process.env.TEMP + '/vmp-' + Date.now(), '--no-first-run', '--window-size=390,844', APP]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9361/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 40000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };
const estado = async () => {
  const r = await ev(`JSON.stringify((()=>{
    const vis=id=>{const e=document.getElementById(id);return !!(e&&getComputedStyle(e).display!=='none');};
    const bar=document.getElementById('avi-prevbar');
    const rb=bar?bar.getBoundingClientRect():null;
    const btn=bar?bar.querySelector('button'):null;
    const rr=btn?btn.getBoundingClientRect():null;
    return {login:vis('s-login'), coach:vis('s-coach'), cliente:vis('s-client'),
      modo:(typeof AUTH_MODE!=='undefined')?!!AUTH_MODE:null,
      banda:!!bar, bandaTxt:bar?(bar.innerText||'').replace(/\\s+/g,' ').trim():'',
      bandaAbajo:rb?Math.round(window.innerHeight-rb.bottom):null,
      bandaPulsable: rr? (()=>{const e=document.elementFromPoint(rr.left+rr.width/2, rr.top+rr.height/2);
        return !!(e && (e===btn || btn.contains(e)));})() : false,
      vitrina:(document.getElementById('cin-showcase')||{}).childElementCount||0};})())`);
  return JSON.parse(r || '{}');
};
async function shot(n) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); }

console.log('\n──── comprobaciones ────');

// ══════════ P0 · login real (una sola vez: el rate limit es real) ══════════
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const entro = await waitFor(`(()=>{const c=document.getElementById('s-client'),k=document.getElementById('s-coach');
  return (c&&getComputedStyle(c).display!=='none')||(k&&getComputedStyle(k).display!=='none');})()`, 40000);
check('P0 la cuenta QA entró (montaje: hay una sesión REAL guardada)', entro);
if (!entro) { console.log('\n❌ sin sesión no se puede probar nada'); try { chrome.kill(); } catch {} try { srv.kill(); } catch {} process.exit(1); }
await sleep(800);

// ══════════ P2 · EL CONTROL QUE MÁS IMPORTA: sin la marca, todo igual que siempre ══════════
// Va PRIMERO a propósito: si el cambio rompió el arranque normal, da igual todo lo demás.
await send('Page.navigate', { url: APP }); await sleep(1200);
await waitFor(`typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);
let e = await estado();
check('P2 🔒 CONTROL: recargando SIN la marca, la sesión se restaura como siempre',
  (e.coach || e.cliente) && !e.login && !e.banda, JSON.stringify(e));

// ══════════ P1 · con la marca, se queda en la página ══════════
await send('Page.navigate', { url: APP + '?ver=pagina' }); await sleep(1200);
await waitFor(`!document.getElementById('avi-loading')`);
await sleep(3000);
e = await estado();
check('P1 con ?ver=pagina NO entra a la cuenta: se queda en la página pública',
  e.login && !e.coach && !e.cliente, JSON.stringify(e));
check('P1b y la página que ve es la de VERDAD, con su vitrina cargada de la nube',
  e.vitrina > 0, 'tarjetas=' + e.vitrina);
check('P3 la banda le explica qué está viendo y ofrece volver, pegada abajo y PULSABLE',
  e.banda && /tu página/i.test(e.bandaTxt) && /Volver/i.test(e.bandaTxt) && e.bandaPulsable && e.bandaAbajo === 0,
  JSON.stringify({ txt: e.bandaTxt, abajo: e.bandaAbajo, pulsable: e.bandaPulsable }));
await shot("vista-pagina");

// ══════════ P4 · 🔴 mirar la página NO cuesta la sesión ══════════
const hayToken = await ev(`(()=>{try{return Object.keys(localStorage).some(k=>/^avi_auth/.test(k));}catch(e){return false;}})()`);
check('P4 la sesión guardada SIGUE ahí mientras mira su página (no se cerró nada)', !!hayToken);
await ev(`salirVistaPagina()`); await sleep(1500);
await waitFor(`typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);
e = await estado();
check('P4b «Volver a mi panel» lo devuelve a su cuenta SIN escribir contraseña',
  (e.coach || e.cliente) && !e.login && !e.banda, JSON.stringify(e));

// ══════════ P5 · la puerta existe en la app y se puede pulsar ══════════
const puerta = await ev(`JSON.stringify((()=>{
  try{
    if(typeof renderPageCard!=='function')return {err:'sin renderPageCard'};
    // 🔴 La tarjeta vive DENTRO del panel del coach, que para esta cuenta (asesorado QA) está en
    // display:none — medirla ahí daba 0 de ancho y 0 de alto, y ese cero era de la sonda, no de
    // la app. Se abre el panel real y se mide donde de verdad vive; el CONTROL de abajo (ancho>0)
    // existe para que un cero vuelva a poner esto en rojo en vez de pasar por «botón chiquito».
    showScreen('s-coach');
    document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
    const home=document.getElementById('p-home'); if(home)home.classList.add('on');
    const el=document.getElementById('h-page');
    if(!el)return {err:'el Inicio del coach no tiene el contenedor'};
    renderPageCard();
    const c=el.querySelector('.card'); if(!c)return {err:'no pintó'};
    const bs=[].slice.call(c.querySelectorAll('button'));
    const r=c.getBoundingClientRect();
    return {botones:bs.map(b=>(b.innerText||'').trim()),
      altos:bs.map(b=>Math.round(b.getBoundingClientRect().height)),
      txt:(c.innerText||'').replace(/\\s+/g,' ').trim().slice(0,140), ancho:Math.round(r.width)};
  }catch(x){return {err:x.message};}})())`);
const P = JSON.parse(puerta || '{}');
check('P5-montaje 🔒 CONTROL: la tarjeta se midió VISIBLE (un 0 aquí es de la sonda, no de la app)',
  !P.err && P.ancho > 200, JSON.stringify({ err: P.err, ancho: P.ancho }));
check('P5 la tarjeta «Tu página» existe con sus tres acciones, todas ≥36px',
  !P.err && P.botones && P.botones.length === 3 && /Ver mi página/.test(P.botones.join('|')) &&
  /Compartir/.test(P.botones.join('|')) && P.altos.every(h => h >= 36),
  JSON.stringify(P));
await shot('tarjeta-pagina');
check('P5b y explica QUÉ es esa página (no un botón suelto sin contexto)',
  !!P.txt && /link/i.test(P.txt), (P.txt || '').slice(0, 100));

console.log('\njsErrors:', JSON.stringify(jsErrors));
const fallos = results.filter(r => r.startsWith('❌')).length;
console.log(`\n${fallos ? '❌' : '✅'} ${results.length - fallos}/${results.length} comprobaciones` + (fallos ? ' — ' + fallos + ' FALLARON' : ' · TODO OK'));
console.log('capturas en ' + OUT);
try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallos || jsErrors.length ? 1 : 0);
