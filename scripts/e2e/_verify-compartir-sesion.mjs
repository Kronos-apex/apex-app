// Harness de «COMPARTIR UN ENTRENO YA GUARDADO» (v624).
//
// Reporte del PO: la imagen solo existía en la pantalla de cierre y «si de casualidad oprimes
// Continuar ya perdiste la opción de compartir». Aquí se abre la habitación de una sesión VIEJA
// (como quien entra desde su historial) y se comprueba lo que la persona puede hacer de verdad:
// que el botón esté, que se pueda tocar y que la imagen que sale sea la de ESA sesión.
//
// 🔒 CONTROLES DE MONTAJE (sin ellos un verde no vale): que la app arrancó, que la habitación
//    PINTÓ algo con alto > 0 (vive dentro de una pantalla que puede estar apagada, lección v573)
//    y que la sesión plantada es la que se está mirando.
// 🔒 Se prueba con una sesión VIEJA sin duración ni calorías —el 25% del historial real— para
//    ver que la tarjeta se arma con lo que hay y no inventa fichas.
//
// Corre: node scripts/e2e/_verify-compartir-sesion.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 8851;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1400);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9361',
   '--user-data-dir=' + process.env.TEMP + '/cshare-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9361/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');

let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) { pass++; console.log('  ✅', n, extra === undefined ? '' : '— ' + JSON.stringify(extra)); } else { fail++; console.log('  ❌', n, extra === undefined ? '' : '— ' + JSON.stringify(extra)); } };

try {
  // 🔒 CONTROL DE MONTAJE: las funciones existen al PARSEAR el archivo, así que preguntar por
  //    ellas mira demasiado pronto — el arranque real corre dentro de `syncFromCloud().then()`.
  //    Sin esperar el símbolo post-arranque, el splash (`#avi-loading`, z-index 9999) sigue
  //    encima y se lleva el toque de cualquier botón que se mida (lección v579: cuando un check
  //    de «se puede tocar» cae solo, la hipótesis es el MONTAJE, no la app).
  ok('la app arrancó de verdad (símbolo post-arranque)',
    await waitFor(`typeof window._aviUpdateBusy!=='undefined'`, 45000));
  ok('el splash ya no está encima',
    await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000));
  ok('existen la habitación y el lienzo',
    await ev(`typeof openSessionRoom==='function' && typeof wfShare==='function' && typeof sessionShareData==='function'`));

  // ── MONTAJE: un asesorado con DOS sesiones, una reciente y una VIEJA (sin duración ni kcal) ──
  const montaje = await ev(`(()=>{
    CUR.loggedAs='client'; CUR.clientId='c1';
    DB.clients=[{id:'c1',name:'Astrid Beltran',sex:'F',age:33}];
    DB.history={c1:[
      {id:'s-nueva',date:'2026-09-15T16:30:00.000Z',routineName:'Tren inferior',doneSets:18,totalSets:18,
       totalVol:4320,durationSec:2880,kcal:412,
       prs:[{name:'Prensa de Pierna',val:95,unit:'kg',reps:12}],
       exercises:[{name:'Prensa de Pierna',muscle:'piernas',sets:[{kg:'95',reps:'12',done:true}]}]},
      {id:'s-vieja',date:'2026-05-25T16:34:00.000Z',routineName:'Glúteo y Piernas A',doneSets:23,totalSets:23,
       totalVol:19780,
       exercises:[{name:'Hip Thrust con Barra',muscle:'gluteo',sets:[{kg:'80',reps:'10',done:true}]}]}
    ]};
    navigator.canShare=()=>false;   // el share real abriría un diálogo: nos quedamos con el dibujo
    return DB.history.c1.length;
  })()`);
  ok('CONTROL DE MONTAJE: hay 2 sesiones plantadas', montaje === 2, montaje);

  // ── Se abre la habitación de la sesión VIEJA, como quien entra desde su historial ──
  await ev(`openSessionRoom('c1','s-vieja')`);
  await sleep(700);
  const vista = await ev(`(()=>{
    const body=document.getElementById('sroom-body');
    const r=body?body.getBoundingClientRect():null;
    const btn=[...document.querySelectorAll('#sroom-body button')].find(b=>/Compartir este entreno/i.test(b.textContent||''));
    const br=btn?btn.getBoundingClientRect():null;
    const centro=br?document.elementFromPoint(br.left+br.width/2,br.top+br.height/2):null;
    return {alto:r?Math.round(r.height):0, texto:(body&&body.textContent||'').slice(0,0),
      titulo:(document.querySelector('.sroom-title')||{}).textContent||'',
      hayBoton:!!btn, altoBoton:br?Math.round(br.height):0, visible:!!(br&&br.width>0&&br.height>0),
      alcanzable:!!(centro&&btn&&(centro===btn||btn.contains(centro))),
      tapadoPor:(centro&&btn&&!(centro===btn||btn.contains(centro)))?(centro.id||centro.className||centro.tagName):null,
      chips:(_wfShareData&&_wfShareData.chips||[]).map(c=>c[0]), fecha:(_wfShareData||{}).fecha,
      rname:(_wfShareData||{}).rname, prs:((_wfShareData||{}).prs||[]).length};
  })()`);
  // 🔒 CONTROL DE COBERTURA: si la habitación no pintó, todo lo demás es un verde sobre nada.
  ok('CONTROL DE COBERTURA: la habitación pintó de verdad', vista.alto > 200, { alto: vista.alto, titulo: vista.titulo });
  ok('el botón «Compartir este entreno» existe y se ve', vista.hayBoton && vista.visible);
  ok('se puede TOCAR (≥36 px y nada encima)', vista.alcanzable && vista.altoBoton >= 36,
    { alto: vista.altoBoton, tapadoPor: vista.tapadoPor });
  ok('la tarjeta es la de ESA sesión (fecha y rutina de mayo)',
    /25 de mayo/.test(vista.fecha || '') && /Glúteo/.test(vista.rname || ''), { fecha: vista.fecha, rutina: vista.rname });
  ok('🔒 sin duración ni calorías guardadas NO se inventan fichas',
    JSON.stringify(vista.chips) === JSON.stringify(['Series', 'Volumen']) && vista.prs === 0, vista.chips);

  // ── El toque de verdad: dibuja el lienzo de esa sesión ──
  await ev(`(()=>{const b=[...document.querySelectorAll('#sroom-body button')].find(x=>/Compartir este entreno/i.test(x.textContent||''));if(b)b.click();})()`);
  await sleep(1200);
  const dim = await ev(`window._wfLastCanvas?{w:window._wfLastCanvas.width,h:window._wfLastCanvas.height}:null`);
  ok('al tocarlo se dibuja la imagen (1080×1920)', !!(dim && dim.w === 1080 && dim.h === 1920), dim);

  // ── Y la RECIENTE sí trae sus cuatro fichas (control: la función no está rota «hacia abajo») ──
  await ev(`openSessionRoom('c1','s-nueva')`);
  await sleep(500);
  const nueva = await ev(`({chips:(_wfShareData&&_wfShareData.chips||[]).map(c=>c[0]),prs:((_wfShareData||{}).prs||[]).length,fecha:(_wfShareData||{}).fecha})`);
  ok('CONTROL: la sesión reciente SÍ trae duración, calorías y su récord',
    nueva.chips.length === 4 && nueva.prs === 1 && /15 de septiembre/.test(nueva.fecha || ''), nueva);

  const png = await ev(`window._wfLastCanvas.toDataURL('image/png')`);
  if (png && png.startsWith('data:image/png;base64,')) {
    writeFileSync(RAIZ + '/scripts/_share-sesion-vieja.png', Buffer.from(png.split(',')[1], 'base64'));
    console.log('\n  🖼️  guardado en scripts/_share-sesion-vieja.png — MIRARLO, no solo generarlo');
  }
  console.log('\n  jsErrors:', JSON.stringify(jsErrors.slice(0, 3)));
  ok('sin errores JS', jsErrors.length === 0);
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
console.log(`\n${fail ? '❌' : '✅'} ${pass} OK · ${fail} fallos`);
process.exitCode = fail ? 1 : 0;
if (fail) process.exit(1);
