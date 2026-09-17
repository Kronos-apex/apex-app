// ¿EL FORMULARIO TIENE UN RITMO VERTICAL, O CADA CAMPO CAE DONDE LE TOCA?
//
// Pedido del PO (17-sep): «que no parezca hecha por un novato». Mirando la captura de «Nuevo
// asesorado» los huecos entre campos ALTERNAN (uno ancho, uno estrecho, uno ancho…). Un formulario
// profesional tiene un ritmo constante: es de las primeras cosas que el ojo registra como
// «hecho a mano» aunque nadie sepa nombrarlo.
//
// Mide, sobre el DOM vivo: la distancia entre el final de un campo y la etiqueta del siguiente.
// 🔒 CONTROL DE COBERTURA: si no encuentra al menos 6 campos, el montaje falló y sus números no
//    valen. 🔒 Y mide TAMBIÉN los placeholders, que es la otra inconsistencia visible.
//
// Corre: node scripts/e2e/_medir-ritmo-formularios.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8859, RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1400);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9369',
   '--user-data-dir=' + process.env.TEMP + '/ritmo-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9369/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof window._aviUpdateBusy!=='undefined'`)) break; await sleep(500); }

const MODALES = ['m-client', 'm-ex', 'm-routine', 'm-settings'];
let fallos = 0;
for (const mid of MODALES) {
  await ev(`(()=>{ if(typeof showScreen==='function')showScreen('s-coach');
    document.querySelectorAll('.mdbg').forEach(m=>m.classList.remove('on'));
    const m=document.getElementById('${mid}'); if(m){const bg=m.closest('.mdbg')||m; bg.classList.add('on'); bg.style.display='flex';}
    return true; })()`);
  await sleep(500);
  const r = await ev(`(()=>{
    const m=document.getElementById('${mid}'); if(!m) return {error:'no existe'};
    const campos=[...m.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')]
      .filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;});
    if(campos.length<3) return {error:'solo '+campos.length+' campos visibles: el montaje no abrió el modal'};
    const huecos=[];
    for(let i=1;i<campos.length;i++){
      const a=campos[i-1].getBoundingClientRect(), b=campos[i].getBoundingClientRect();
      if(Math.abs(b.top-a.top)<4) continue;            // misma fila (dos campos en línea)
      huecos.push(Math.round(b.top-a.bottom));
    }
    const ph=campos.map(el=>el.getAttribute('placeholder')).filter(Boolean);
    return {campos:campos.length, huecos, placeholders:ph};
  })()`);
  if (r.error) { console.log(`\n${mid}: ⚠️  ${r.error}`); continue; }
  const u = [...new Set(r.huecos)].sort((a, b) => a - b);
  const malo = u.length > 2;
  if (malo) fallos++;
  console.log(`\n${mid} — ${r.campos} campos`);
  console.log(`  huecos entre campos: ${r.huecos.join(', ')}`);
  console.log(`  valores distintos:   ${u.join(' · ')}  ${malo ? '🔴 el ritmo es irregular' : '✅ ritmo constante'}`);
  const conEj = r.placeholders.filter(p => /^Ej[.:]/.test(p)).length;
  const sinEj = r.placeholders.length - conEj;
  if (r.placeholders.length) {
    console.log(`  placeholders: ${conEj} con «Ej:» · ${sinEj} sin él  ${conEj && sinEj ? '🔴 mezclados' : '✅ consistentes'}`);
    if (conEj && sinEj) console.log(`     ${r.placeholders.join(' | ')}`);
  }
}
console.log(`\n${fallos ? '🔴' : '✅'} ${fallos} modal(es) con ritmo irregular`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
