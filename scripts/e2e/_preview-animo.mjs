// _preview-animo.mjs — DIBUJA opciones para el selector «¿Cómo te sientes hoy?» para ELEGIR MIRANDO.
// Pedido del PO (23-sep): «no me gustan esos stickers genéricos… siento que ahí podemos mejorar».
// Los de hoy son emojis del SISTEMA: cada teléfono los dibuja distinto y no son de la marca.
// Patrón de la casa (v622, v661): las opciones se dibujan con el CSS, los colores y los íconos REALES
// de la app, al tamaño de un teléfono y en los dos temas.
//   A · íconos de la marca en su color (el mismo círculo de hoy)
//   B · caritas propias de AVI (dibujadas en el mismo trazo que los íconos de la marca)
//   C · sin íconos: la palabra con su color
//   D · círculo de color sólido con el ícono en blanco
// Corre: node scripts/e2e/_preview-animo.mjs   → scripts/_animo-oscuro.png y scripts/_animo-claro.png
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8858, DBG = 9368, RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/animoprev-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
if (!await waitFor(`typeof aviIcon==='function' && typeof MOOD_STATES!=='undefined' && typeof MOOD_COLORS!=='undefined'`)) { console.log('🔴 la app no arrancó'); process.exit(1); }
await sleep(1500);

// (sin comillas invertidas dentro: esto va en un template literal)
const PINTAR = `(()=>{
  const ICONO={bien:'sun',energia:'flame',cansado:'moon',estres:'burst',periodo:'droplet',dolor:'__curita'};
  // La curita no existe en la marca: se dibuja con el MISMO trazo (24px, 2px, puntas redondas).
  const CURITA='<rect x="3" y="8.6" width="18" height="6.8" rx="3.4" transform="rotate(-45 12 12)"/><path d="M11 11h.01M13 13h.01M11 13h.01M13 11h.01"/>';
  const svg=(p,sz,w)=>'<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(w||2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
  const marca=(id,sz)=>ICONO[id]==='__curita'?svg(CURITA,sz):aviIcon(ICONO[id],sz);
  // B · caritas propias: el círculo y los rasgos en el trazo de la marca.
  const O='<circle cx="12" cy="12" r="9"/>';
  const CARA={
    bien:O+'<path d="M8.6 14.1c1.9 2.1 4.9 2.1 6.8 0"/><path d="M9.2 9.9h.01"/><path d="M14.8 9.9h.01"/>',
    energia:O+'<path d="M7.9 13.4h8.2c-.4 2.6-2 4.1-4.1 4.1s-3.7-1.5-4.1-4.1z"/><path d="M8.3 9.8l1.4-1.3 1.4 1.3"/><path d="M12.9 9.8l1.4-1.3 1.4 1.3"/>',
    cansado:O+'<path d="M7.9 10.4c.8.9 2.2.9 3 0"/><path d="M13.1 10.4c.8.9 2.2.9 3 0"/><path d="M10.3 15.6h3.4"/>',
    estres:O+'<path d="M7.6 8.2l2.9 1.3"/><path d="M16.4 8.2l-2.9 1.3"/><path d="M9.3 11.6h.01"/><path d="M14.7 11.6h.01"/><path d="M8.9 16.4c1.9-1.5 4.3-1.5 6.2 0"/>',
    periodo:AVI_ICONS.droplet,
    dolor:O+'<path d="M9 16c1.8-1.3 4.2-1.3 6 0"/><path d="M9.3 11.8h.01"/><path d="M14.7 11.8h.01"/><rect x="12.6" y="4.9" width="5.6" height="2.6" rx="1.3" transform="rotate(22 15.4 6.2)"/>'
  };
  const opts=MOOD_STATES; // las seis (la del periodo sale solo a mujeres; aquí se muestran todas)
  const tarjeta=(inner)=>'<div class="checkin-card" style="margin:0"><div class="checkin-q">¿Cómo te sientes hoy?</div><div class="checkin-sub">Ajustamos tu entrenamiento a cómo amaneciste.</div>'+inner+'</div>';
  const col=m=>MOOD_COLORS[m.id]||['var(--g2)','var(--gl)'];
  const A=tarjeta('<div class="mood-grid">'+opts.map(m=>{const [mc,mct]=col(m);
    return '<button class="mood-btn" style="--mc:'+mc+';--mct:'+mct+'"><span class="mood-emoji" style="color:'+mc+';font-size:0;background:'+mct+';box-shadow:none;border:1.5px solid '+mc+'">'+marca(m.id,28)+'</span><span class="mood-lbl">'+esc(m.label)+'</span></button>';}).join('')+'</div>');
  const B=tarjeta('<div class="mood-grid">'+opts.map(m=>{const [mc,mct]=col(m);
    return '<button class="mood-btn" style="--mc:'+mc+';--mct:'+mct+'"><span class="mood-emoji" style="color:'+mc+';font-size:0;background:'+mct+';box-shadow:none;border:1.5px solid '+mc+'">'+svg(CARA[m.id],34,1.9)+'</span><span class="mood-lbl">'+esc(m.label)+'</span></button>';}).join('')+'</div>');
  const C=tarjeta('<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+opts.map(m=>{const [mc,mct]=col(m);
    return '<button class="mood-btn" style="--mc:'+mc+';--mct:'+mct+';flex-direction:row;justify-content:flex-start;gap:10px;padding:13px 14px;border-left:4px solid '+mc+'"><span style="width:10px;height:10px;border-radius:50%;background:'+mc+';flex:0 0 auto"></span><span class="mood-lbl" style="text-align:left;font-weight:700">'+esc(m.label)+'</span></button>';}).join('')+'</div>');
  const D=tarjeta('<div class="mood-grid">'+opts.map(m=>{const [mc,mct]=col(m);
    return '<button class="mood-btn" style="--mc:'+mc+';--mct:'+mct+'"><span class="mood-emoji" style="background:'+mc+';color:#fff;font-size:0;box-shadow:0 6px 16px -6px '+mc+'">'+marca(m.id,26)+'</span><span class="mood-lbl">'+esc(m.label)+'</span></button>';}).join('')+'</div>');
  const rot=(t)=>'<div style="font:800 15px/1.2 inherit;color:var(--t1);margin:22px 4px 8px">'+t+'</div>';
  const root=document.createElement('div');
  root.id='prev-animo';
  root.style.cssText='position:fixed;inset:0;overflow:auto;z-index:99999;background:var(--bg);padding:6px 16px 30px;font-family:inherit;color:var(--t1)';
  root.innerHTML=rot('HOY · emojis del teléfono')+tarjeta('<div class="mood-grid">'+opts.map(m=>{const [mc,mct]=col(m);
      return '<button class="mood-btn" style="--mc:'+mc+';--mct:'+mct+'"><span class="mood-emoji">'+m.emoji+'</span><span class="mood-lbl">'+esc(m.label)+'</span></button>';}).join('')+'</div>')
    +rot('A · íconos de AVI en su color')+A+rot('B · caritas propias de AVI')+B+rot('C · sin íconos, la palabra con su color')+C+rot('D · círculo de color con el ícono en blanco')+D;
  document.body.appendChild(root);
  return root.scrollHeight;
})()`;

for (const tema of ['dark', 'light']) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] });
  await ev(`(()=>{document.body.classList.remove('dark','light');document.documentElement.setAttribute('data-theme','${tema}');const o=document.getElementById('prev-animo');if(o)o.remove();return 1;})()`);
  const alto = await ev(PINTAR);
  await sleep(600);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: Math.min(4000, alto + 20), deviceScaleFactor: 2, mobile: true });
  await sleep(500);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const out = RAIZ + '/scripts/_animo-' + (tema === 'dark' ? 'oscuro' : 'claro') + '.png';
  writeFileSync(out, Buffer.from(r.data, 'base64'));
  console.log('guardado', out, 'alto', alto);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
console.log('jsErrors:', JSON.stringify(jsErrors));
try { ws.close(); } catch {} chrome.kill(); srv.kill();
