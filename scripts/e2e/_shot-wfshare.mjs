// _shot-wfshare.mjs — DIBUJA el lienzo que se comparte al terminar el entreno y lo guarda como PNG
// para MIRARLO. Nace del reporte del PO (15-sep): «la foto del asesorado se ve muy pequeña».
//
// 🔒 Monta el CASO APRETADO a propósito —4 cifras y 3 récords, que es el máximo que caben— porque
//    agrandar el retrato empuja todo hacia abajo y lo que hay que comprobar es que NADA se salga
//    ni se monte sobre el pie. Con 1 récord sobra sitio y la prueba no probaría nada.
// 🔒 El avatar se FABRICA en un lienzo del mismo origen (nunca tiñe) y se AFIRMA que cargó: sin
//    eso la sonda mediría el círculo de iniciales, que es otro dibujo (lección v597).
//
// Corre: node scripts/e2e/_shot-wfshare.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 8849;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1400);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9359',
   '--user-data-dir=' + process.env.TEMP + '/wfs-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9359/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

try {
  const listo = await waitFor(`typeof wfShare==='function' && typeof _wfDrawCrest==='function'`);
  ok('la app arrancó y el lienzo existe', listo);

  // ── CONTROL DE MONTAJE: el avatar tiene que ser una imagen REAL y cargada ──
  const SIN = process.argv.includes('--sin-foto');
  // v664 · --foto=<archivo de media/brand>: una foto REAL de persona, para juzgar el modelo G (foto a
  //   sangre) con una cara de verdad y no con el muñeco. Mismo origen: no tiñe el lienzo.
  const FOTO = (process.argv.find(a => a.startsWith('--foto=')) || '').slice(7);
  const PRS = +((process.argv.find(a => a.startsWith('--prs=')) || '--prs=3').slice(6));
  const montaje = await ev(`(async()=>{
    const SIN_FOTO=${SIN};
    const c=document.createElement('canvas');c.width=400;c.height=400;
    const g=c.getContext('2d');
    // Una cara de mentira con contraste, para ver el recorte: fondo naranja y un ovalo claro.
    g.fillStyle='#E2703A';g.fillRect(0,0,400,400);
    g.fillStyle='#F7D9B5';g.beginPath();g.ellipse(200,190,105,130,0,0,Math.PI*2);g.fill();
    g.fillStyle='#2A1A12';g.beginPath();g.arc(165,170,14,0,Math.PI*2);g.arc(235,170,14,0,Math.PI*2);g.fill();
    g.strokeStyle='#2A1A12';g.lineWidth=9;g.beginPath();g.arc(200,225,45,0.15*Math.PI,0.85*Math.PI);g.stroke();
    const FOTO=${JSON.stringify(FOTO)};
    const img=new Image(); img.src=FOTO?('media/brand/'+FOTO):c.toDataURL('image/png');
    await new Promise(r=>{img.onload=r;img.onerror=r;});
    // 🔴 un let de un script clasico NO cuelga de window (gotcha de la casa): se asigna al
    //    NOMBRE PELADO, o wfShare sigue viendo su variable vacia y no dibuja nada.
    // (sin comillas invertidas: esto vive DENTRO de un template literal — 5a vez del gotcha)
    _wfShareAvatar=(SIN_FOTO?null:img); _wfBgPhoto=img;
    _wfShareData={name:'Astrid',fullName:'Astrid Beltran',rname:'Tren inferior · Fuerza',
      fecha:'lunes, 15 de septiembre',
      chips:[['Duración','48 min'],['Series','18/18'],['Volumen','4.320 kg'],['Calorías','412 kcal']],
      prs:[{name:'Prensa de Pierna',val:95,unit:'kg',reps:12},
           {name:'Hip Thrust con Barra',val:110,unit:'kg',reps:10},
           {name:'Sentadilla Búlgara con Mancuernas',val:22,unit:'kg',reps:12}].slice(0,${PRS})};
    // El share real abriria un dialogo: se neutraliza para quedarnos solo con el dibujo.
    navigator.canShare=()=>false;
    return {w:img.width,h:img.height};
  })()`);
  ok('CONTROL: el avatar de prueba cargó de verdad (' + (montaje && montaje.w) + 'px)',
    !!(montaje && (FOTO ? montaje.w > 300 : montaje.w === 400)));

  await ev(`(()=>{ try{ wfShare(); }catch(e){ return String(e); } return ''; })()`);
  await sleep(1200);
  const dim = await ev(`window._wfLastCanvas?{w:window._wfLastCanvas.width,h:window._wfLastCanvas.height}:null`);
  ok('el lienzo se dibujó (1080×1920)', !!(dim && dim.w === 1080 && dim.h === 1920));

  // ── La GEOMETRÍA que el PO reporta: cuánto ocupa el retrato ──
  const geo = await ev(`(()=>{
    const s=document.documentElement.innerHTML;
    const m=s.match(/_wfDrawCrest\\(x,540,(\\d+),(\\d+),/);
    return m?{cy:+m[1],r:+m[2]}:null;
  })()`);
  if (geo) {
    const pct = (2 * geo.r / 1080 * 100).toFixed(1);
    console.log(`\n  📐 retrato: centro y=${geo.cy} · radio ${geo.r} → ${2 * geo.r}px de diámetro = ${pct}% del ancho`);
    console.log(`     ocupa de y=${geo.cy - geo.r} a y=${geo.cy + geo.r}`);
  }

  const png = await ev(`window._wfLastCanvas.toDataURL('image/png')`);
  if (png && png.startsWith('data:image/png;base64,')) {
    const out = RAIZ + (SIN ? '/scripts/_wfshare-iniciales.png' : FOTO ? '/scripts/_wfshare-foto-' + PRS + '.png' : '/scripts/_wfshare.png');
    writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
    console.log('\n  🖼️  guardado en scripts/_wfshare.png — MIRARLO, no solo generarlo');
    ok('la imagen se pudo exportar', true);
  } else ok('la imagen se pudo exportar', false);

  ok('sin errores JS', jsErrors.length === 0);
  if (jsErrors.length) console.log('     ', jsErrors.slice(0, 3));
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
console.log(`\n${fail ? '❌' : '✅'} ${pass} OK · ${fail} fallos`);
process.exitCode = fail ? 1 : 0;
if (fail) process.exit(1);   // dientes en la forma que exige el candado de _afirma.mjs
