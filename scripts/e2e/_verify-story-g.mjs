// _verify-story-g.mjs — v667 · la tarjeta de progreso del coach, CON foto, es la foto (modelo G).
// Dibuja el lienzo REAL con una historia INVENTADA (nada de datos de personas reales) y lo mide:
//   S1 con foto → modelo G (cv._layout.modo) · sin foto → el C de siempre
//   S2 la foto SE VE arriba: un «retrato» naranja sale naranja donde va la cara  ← y su CONTROL:
//      sin foto ese mismo punto NO es naranja
//   S3 la gráfica con foto se topa en 5 barras (contadas por píxeles, no leídas del código)
//   S4 debajo del enlace no hay nada y el enlace cae dentro de lo que WhatsApp muestra
// Y guarda los PNG para MIRARLOS con una foto de verdad (una de la marca, no de un asesorado).
// Corre: node scripts/e2e/_verify-story-g.mjs   → %TEMP%/story-g-*.png
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8837, DBG = 9357, RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const OUT = process.env.TEMP.replace(/\\/g, '/');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/storyg-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
const res = []; const check = (n, c, x = '') => { const l = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); res.push(c); console.log('  ' + l); };
// Control de montaje: el arranque real terminó (las funciones existen al PARSEAR, eso no basta).
if (!await waitFor(`typeof shareClientProgress==='function' && typeof _storyDrawG==='function' && !!window._aviUpdateBusy`)) { console.log('🔴 la app no arrancó'); chrome.kill(); srv.kill(); process.exit(1); }
await sleep(1500);

const historia = n => ({ ok: true, nombre: 'Mariana', meses: 3, entrenos: 22, subieron: 7, conCarga: 8, medianaPct: 38, volRatio: 1.27,
  subidas: [['Hip Thrust con Barra', 60, 90], ['Prensa de Pierna', 80, 115], ['Sentadilla con Barra', 35, 55], ['Peso Muerto Rumano', 30, 45],
    ['Jalón al Pecho en Polea', 25, 35], ['Abducción de Cadera en Máquina', 30, 40], ['Remo Sentado en Polea', 25, 32], ['Curl Femoral', 20, 25]]
    .slice(0, n).map(([e, de, a]) => ({ ejercicio: e, de, a, gano: a - de, pct: Math.round((a / de - 1) * 100) })) });

// Dibuja y mide. `foto`: 'naranja' (retrato de color plano, para medir) · 'marca' (foto real de la
// marca, para MIRAR) · null (sin foto → modelo C).
const pintar = async (story, foto, archivo) => {
  const r = await ev(`(async()=>{
    window.shareCanvasImage=()=>{};                      // se dibuja, no se comparte
    _storyData=${JSON.stringify(story)};
    _storyAvatar=null;
    if(${JSON.stringify(foto)}==='naranja'){ const c=document.createElement('canvas'); c.width=600;c.height=600;
      const g=c.getContext('2d'); g.fillStyle='rgb(230,120,30)'; g.fillRect(0,0,600,600); _storyAvatar=c; }
    else if(${JSON.stringify(foto)}==='marca'){ _storyAvatar=await new Promise(ok=>{ const im=new Image(); im.onload=()=>ok(im); im.onerror=()=>ok(null); im.src='media/brand/ath-woman-1.jpg'; }); }
    window._storyLastCanvas=null;
    let err=''; try{ shareClientProgress(); }catch(e){ err=String(e&&e.message||e); }
    const cv=window._storyLastCanvas; if(!cv) return {err:err||'sin lienzo'};
    const g=cv.getContext('2d');
    const px=(x,y)=>{const d=g.getImageData(x,y,1,1).data;return [d[0],d[1],d[2]];};
    // barras: franjas verdes de 14-26 px en x=95 igualmente espaciadas (método de v601)
    const d=g.getImageData(95,0,1,1920).data; let dentro=false; const altos=[];
    for(let y=0;y<1920;y++){ const r2=d[y*4],g2=d[y*4+1],b2=d[y*4+2]; const v=(g2>80&&g2>b2+20&&g2>r2+60);
      if(v&&dentro===false)dentro=y; else if(!v&&dentro!==false){altos.push([dentro,y-dentro]);dentro=false;} }
    const cand=altos.filter(a=>a[1]>=14&&a[1]<=26).map(a=>a[0]); let filas=0;
    for(let i=0;i<cand.length;i++)for(let j=i+1;j<cand.length;j++){ const paso=cand[j]-cand[i]; if(paso<40)continue;
      let n=1,y2=cand[i]; while(cand.indexOf(y2+paso)>=0){n++;y2+=paso;} if(n>filas)filas=n; }
    // tinta debajo del enlace (1690-1718): tiene que estar limpio
    const p=g.getImageData(40,1690,1000,28).data; let sucio=0; for(let i=0;i<p.length;i+=4){ if(p[i]+p[i+1]+p[i+2]>200) sucio++; }
    return {err, modo:cv._layout?cv._layout.modo:'C', lay:cv._layout||null, cara:px(540,420), filas, sucio};
  })()`);
  if (archivo) {
    const url = await ev(`window._storyLastCanvas?window._storyLastCanvas.toDataURL('image/png'):''`);
    if (url) { writeFileSync(`${OUT}/${archivo}`, Buffer.from(url.split(',')[1], 'base64')); console.log('  shot → ' + OUT + '/' + archivo); }
  }
  return r;
};
// El retrato pasa por el tratamiento de marca (desatura y tiñe de verde), así que un naranja puro
// sale templado: medido (145,111,65). Lo que discrimina es «cálido» contra el verde oscuro del fondo
// (sin foto ese punto da (7,43,31)); el control S2b es el que prueba que el umbral separa.
const naranja = ([r, g, b]) => r > g + 20 && r > b + 50;

const g8 = await pintar(historia(8), 'naranja', 'story-g-medida.png');
check('S1 con foto se dibuja el modelo G', g8 && g8.modo === 'G' && !g8.err, JSON.stringify({ modo: g8 && g8.modo, err: g8 && g8.err }));
check('S2 la foto se ve donde va la cara', g8 && naranja(g8.cara), 'px(540,420)=' + (g8 && g8.cara));
check('S3 con foto la gráfica se topa en 5 barras', g8 && g8.filas === 5, 'filas=' + (g8 && g8.filas));
check('S4 nada debajo del enlace, y el enlace en la franja de WhatsApp', g8 && g8.sucio === 0 && g8.lay && g8.lay.pie <= 1690, 'sucio=' + (g8 && g8.sucio));
const c8 = await pintar(historia(8), null, 'story-c.png');
check('S1b sin foto se queda el modelo C', c8 && c8.modo === 'C' && !c8.err, JSON.stringify({ modo: c8 && c8.modo }));
check('S2b CONTROL: sin foto, ese punto NO es naranja (la sonda discrimina)', c8 && !naranja(c8.cara), 'px=' + (c8 && c8.cara));
check('S3b CONTROL: sin foto la gráfica sigue mostrando 8', c8 && c8.filas === 8, 'filas=' + (c8 && c8.filas));
// Para MIRAR: una foto real (de la marca) en el peor caso, en el corto y en el de recuento.
await pintar(historia(8), 'marca', 'story-g-peor.png');
await pintar(historia(2), 'marca', 'story-g-corto.png');
await pintar(Object.assign(historia(5), { medianaPct: null, volRatio: 0.9 }), 'marca', 'story-g-recuento.png');
check('S5 sin errores de JavaScript', jsErrors.length === 0, JSON.stringify(jsErrors.slice(0, 3)));
const ok = res.every(Boolean);
console.log(ok ? `\n✅ ${res.length}/${res.length}` : `\n🔴 ${res.filter(Boolean).length}/${res.length}`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(ok ? 0 : 1);
