// og-gen.mjs — genera la TARJETA DE VISTA PREVIA del enlace (Open Graph), 1200×630.
//
// 🔴 EL DEFECTO QUE ARREGLA: `og:image` apuntaba a `icons/icon-512.png` —un cuadrado de 512— con
// la etiqueta `twitter:card = summary_large_image`, que espera 1200×630 apaisado. O sea que cada
// vez que el PO comparte el enlace de la app en sus historias (que es lo que hace), la vista
// previa sale como un iconito recortado en vez de una tarjeta con la marca. Es la pantalla de
// compartir que más gente ve —la ve QUIEN TODAVÍA NO ES CLIENTE— y no la dibujaba nadie.
//
// Se dibuja con el MISMO lienzo y la MISMA tipografía que las otras dos tarjetas (Anton +
// Plus Jakarta Sans), en un Chrome headless, y se guarda el PNG en `media/brand/`.
// 🔒 El archivo se versiona en el repo: una imagen que solo existe en la máquina de alguien
//    desaparece con la máquina. Se regenera con:  node scripts/og-gen.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 8803;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
// 🔴 JPEG y no PNG: en PNG este degradado pesaba **831 KB** y una vista previa pesada la
// DESCARTAN los clientes de mensajeria (WhatsApp entre ellos) — o sea que el arreglo se
// quedaria sin verse, que es peor que no hacerlo. En JPEG a 0,92 son ~60 KB con la misma cara.
const SALIDA = RAIZ + '/media/brand/og-1200x630.jpg';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ, detached: false });
await sleep(1400);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9303',
  '--user-data-dir=' + process.env.TEMP + '/cdp-og-' + Date.now(), '--no-first-run',
  '--no-default-browser-check', `http://localhost:${PORT}/`], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9303/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Runtime.enable');

try {
  // Se espera a que las fuentes de la marca estén CARGADAS. Sin esto el canvas cae a la del
  // sistema en silencio y la tarjeta sale con la letra genérica — el defecto de v602, aquí otra vez.
  const listas = await (async () => {
    for (let i = 0; i < 60; i++) {
      // Se espera al SIMBOLO REAL (`canvasFont`, de app-1) ademas de a las fuentes: que el DOM
      // este no significa que los modulos hayan parseado — es el gotcha del boot-check de prod.
      const ok = await ev(`(()=>{try{return typeof canvasFont==='function'&&document.fonts.check('400 40px Anton')&&document.fonts.check('800 40px "Plus Jakarta Sans"')}catch(e){return false}})()`);
      if (ok) return true;
      await sleep(500);
    }
    return false;
  })();
  if (!listas) throw new Error('las fuentes de la marca no cargaron: la tarjeta saldría en la del sistema');

  const dataUrl = await ev(`(()=>{try{
    const cv=document.createElement('canvas');cv.width=1200;cv.height=630;
    const x=cv.getContext('2d');
    const bg=x.createLinearGradient(0,0,1200,630);
    bg.addColorStop(0,'#06120D');bg.addColorStop(.55,'#0A2118');bg.addColorStop(1,'#061410');
    x.fillStyle=bg;x.fillRect(0,0,1200,630);
    const glow=x.createRadialGradient(980,150,60,980,150,620);
    glow.addColorStop(0,'rgba(16,224,160,.22)');glow.addColorStop(1,'rgba(16,224,160,0)');
    x.fillStyle=glow;x.fillRect(0,0,1200,630);
    const cf=(px,w,disp)=>canvasFont(px,w,disp);
    x.fillStyle='#EAFBF4';x.font=cf(96,'900',true);x.fillText('AVI',80,180);
    x.fillStyle='#10E0A0';x.fillRect(80,208,130,8);
    x.fillStyle='rgba(234,251,244,.45)';x.font=cf(24,'700');
    x.fillText('ENTRENAMIENTO CON NOMBRE PROPIO',80,262);
    x.fillStyle='#FFFFFF';x.font=cf(72,'900',true);
    x.fillText('Tu rutina, tu progreso',80,390);
    x.fillText('y tu coach, en un solo sitio.',80,470);
    x.fillStyle='rgba(234,251,244,.6)';x.font=cf(28,'600');
    x.fillText('Entrenamiento personalizado, medido de verdad.',80,540);
    return cv.toDataURL('image/jpeg',0.92);
  }catch(e){return 'ERR: '+(e&&e.message||e);}})()`);
  if(typeof dataUrl==='string'&&dataUrl.indexOf('ERR:')===0)throw new Error(dataUrl);
  if (!dataUrl || !dataUrl.startsWith('data:image/jpeg')) throw new Error('no se generó la imagen');
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  // 🔒 Y se AFIRMA el peso: si un cambio la vuelve a poner pesada, el generador lo dice aqui y
  //    no tres semanas despues, cuando alguien note que sus enlaces salen sin imagen.
  if (bytes.length > 300 * 1024) throw new Error('la tarjeta pesa ' + Math.round(bytes.length/1024) + ' KB: por encima de 300 los clientes la descartan');
  writeFileSync(SALIDA, bytes);
  console.log('✅ ' + SALIDA + ' (' + Math.round(bytes.length / 1024) + ' KB)');
} catch (e) {
  console.log('ERROR: ' + (e && e.message));
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
