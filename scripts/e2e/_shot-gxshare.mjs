// _shot-gxshare.mjs — DIBUJA la tarjeta de LOGRO que se comparte y la guarda como PNG para MIRARLA.
//
// Nace de una captura real del PO (22-sep): compartió un logro a WhatsApp y **el chat recorta la
// imagen**. Medido sobre esa captura: la burbuja muestra ~1080×1516 centrado, o sea y≈202-1718 —
// la marca «A V I» (y=150) salía cortada y el pie con el enlace (y=1830) no se veía.
//
// Por eso el PNG sale en DOS versiones: la tarjeta entera y la MISMA con la franja que WhatsApp
// deja fuera oscurecida, que es lo que hay que mirar para decidir dónde va el pie.
// Corre: node scripts/e2e/_shot-gxshare.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 8853;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const RECORTE = { alto: 1516 };            // lo que WhatsApp deja ver de un 1080×1920 en el chat
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9363',
   '--user-data-dir=' + process.env.TEMP + '/gxshot-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9363/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };
try {
  const arranco = await waitFor(`typeof _gxCard==='function'`);
  if(!arranco) console.log('   diagnóstico:', JSON.stringify(await ev(`({url:location.href, wfShare:typeof wfShare, gx:typeof _gxCard, gxShare:typeof gxShareLogro, body:(document.body&&document.body.innerText||'').slice(0,60)})`)));
  ok('la app arrancó y la tarjeta existe', arranco);
  const SIN = process.argv.includes('--sin-foto');
const r = await ev(`(async()=>{
    const SIN_FOTO=${SIN};
    // La foto REAL que mandó el PO: una composición a sangre no se juzga con un dibujo.
    const img=new Image(); img.src='/scripts/_tmp-foto-llena.png';
    await new Promise(ok2=>{img.onload=ok2;img.onerror=ok2;});
    // Dos casos REALES: con foto de perfil (8 de 27 asesorados, medido) y sin ella.
    _wfShareAvatar = (SIN_FOTO ? null : img);
    const cv=_gxCard('Logro desbloqueado','Tres meses seguidos','Doce semanas seguidas sin fallar una','Andres','Andres');
    // La MISMA tarjeta con la franja que WhatsApp recorta, oscurecida.
    const cut=document.createElement('canvas');cut.width=1080;cut.height=1920;
    const cx=cut.getContext('2d'); cx.drawImage(cv,0,0);
    const fuera=(1920-${RECORTE.alto})/2;
    cx.fillStyle='rgba(180,0,0,.55)'; cx.fillRect(0,0,1080,fuera); cx.fillRect(0,1920-fuera,1080,fuera);
    cx.fillStyle='#fff'; cx.font='bold 34px system-ui'; cx.textAlign='center';
    cx.fillText('lo que WhatsApp NO muestra en el chat',540,fuera-30);
    cx.fillText('lo que WhatsApp NO muestra en el chat',540,1920-fuera+60);
    return {entera:cv.toDataURL('image/png'), recorte:cut.toDataURL('image/png'), alto:cv.height};
  })()`);
  ok('la tarjeta se pudo dibujar', !!(r && r.entera));
  if (r && r.entera) {
    writeFileSync(RAIZ + '/scripts/_gxshare' + (SIN ? '-sinfoto' : '') + '.png', Buffer.from(r.entera.split(',')[1], 'base64'));
    writeFileSync(RAIZ + '/scripts/_gxshare' + (SIN ? '-sinfoto' : '') + '-recorte.png', Buffer.from(r.recorte.split(',')[1], 'base64'));
    console.log('  🖼️  scripts/_gxshare.png y scripts/_gxshare-recorte.png — MIRARLOS, no solo generarlos');
  }
  ok('sin errores JS', jsErrors.length === 0);
} finally {
  try { ws.close(); } catch {} chrome.kill(); srv.kill();
}
console.log(`\n${fail ? '🔴' : '✅'} ${pass} OK · ${fail} fallos`);
process.exit(fail ? 1 : 0);   // con dientes: un rojo aquí para la corrida (regla de _afirma.mjs)
