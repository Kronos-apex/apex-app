// Verificación E2E de v586: EL COACH VE LAS FOTOS DE PROGRESO (y en solo lectura).
//
// Hallazgo D3-3 de la auditoría del 7-sep: `renderPhotosClient` vive exclusivamente en la
// pantalla del ASESORADO y en `p-detail` no había ningún contenedor, así que el coach no veía
// NINGUNA foto de nadie. Medido contra producción: 5 asesorados con 10 fotos vivas (9 de ellas
// base64 dentro de su propia fila, que la RLS del coach sí puede leer — comprobado ANTES de
// escribir la pantalla, que es la lección de v540).
//
// 🔒 Se afirma lo que el coach VE y lo que PUEDE HACER (¿aparece la sección? ¿cuántas
//    miniaturas? ¿tiene botón de borrar?), no la presencia de un selector — regla de v453.
// 🔒 Con sus CONTROLES: sin fotos la sección no se pinta, y al asesorado NO se le quita su
//    propio botón de borrar (eso no sería proteger, sería borrar la feature).
// Patrón preview-SIN-login: se inyectan datos fake y se llama al render directo.
//
// Corre: node scripts/e2e/_verify-fotos-coach.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8795;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-fotoscoach-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9295', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9295/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-fotoscoach';
try { mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof renderPhotosCoach==='function' && typeof renderPhotosClient==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó (o `renderPhotosCoach` no existe)'); process.exit(1); }

// ── FIXTURE: tres fotos con etiqueta y fecha, como las guarda la app ──
// Se usan SVG data-URI (pasan el filtro `data:image/` del render) de colores distintos, para
// que en la captura se vea que son tres fotos distintas y no una repetida.
const montaje = await ev(`(()=>{try{
  const dia=86400000, hoy=Date.now();
  const img=(col,txt)=>'data:image/svg+xml;base64,'+btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="'+col+'"/>'+
    '<text x="150" y="215" font-size="64" font-family="sans-serif" fill="white" text-anchor="middle">'+txt+'</text></svg>');
  DB.clients=[
    {id:'ph1',name:'Con Fotos',tier:'premium',level:'Intermedio',days:3,routines:[]},
    {id:'ph2',name:'Sin Fotos',tier:'premium',level:'Intermedio',days:3,routines:[]},
    {id:'ph3',name:'Premium Sin Coach',tier:'app',level:'Intermedio',days:3,routines:[]},
  ];
  DB.photos={
    ph1:[{id:'f3',label:'Hoy',date:new Date(hoy-2*dia).toISOString(),src:img('#0A7C5B','3')},
         {id:'f2',label:'Mes 2',date:new Date(hoy-35*dia).toISOString(),src:img('#13B583','2')},
         {id:'f1',label:'Punto de partida',date:new Date(hoy-90*dia).toISOString(),src:img('#457B9D','1')}],
    ph2:[],
    ph3:[{id:'g1',label:'Punto de partida',date:new Date(hoy-10*dia).toISOString(),src:img('#E76F51','L')}],
  };
  showScreen('s-coach'); gp('p-detail',null,'Detalle');
  CUR.clientId='ph1';
  renderPhotosCoach('ph1');
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE el fixture se planta y el render corre', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }
await ev(`(()=>{const s=document.getElementById('avi-loading');if(s)s.style.display='none';
  const b=document.getElementById('install-banner');if(b)b.style.display='none';return 1;})()`);
await sleep(300);

// ── COBERTURA: ¿hay miniaturas VISIBLES de verdad? ──
const cob = await ev(`(()=>{const w=document.getElementById('d-photos-wrap');
  if(!w)return {err:'sin contenedor'};
  const vis=getComputedStyle(w).display!=='none';
  const imgs=[...w.querySelectorAll('img')].filter(i=>i.getBoundingClientRect().height>0);
  return {vis,imgs:imgs.length,alto:Math.round(w.getBoundingClientRect().height),
    txt:w.innerText.replace(/\\s+/g,' ').trim()};})()`);
check('COBERTURA la sección se ve y pinta 3 miniaturas con alto real',
  cob && cob.vis && cob.imgs === 3 && cob.alto > 0, JSON.stringify(cob));
if (!cob || cob.imgs !== 3) { log('\n🔴 sin cobertura las cifras de esta corrida no valen'); process.exit(1); }

check('F1 el coach VE las fotos: la sección aparece con su título y su pie',
  /Fotos de progreso/i.test(cob.txt) && /3 fotos/.test(cob.txt), cob.txt);
check('F2 y dice de cuándo es la más reciente (una foto sin fecha no dice nada)',
  /hace 2 días/.test(cob.txt), '');

// ── CONTROL: sin fotos NO se pinta un hueco ──
const vacio = await ev(`(()=>{CUR.clientId='ph2';renderPhotosCoach('ph2');
  const w=document.getElementById('d-photos-wrap');
  return {display:getComputedStyle(w).display,html:w.querySelector('#d-photos').innerHTML.length};})()`);
check('F3 CONTROL a quien no tiene fotos no se le pinta la sección vacía',
  vacio && vacio.display === 'none' && vacio.html === 0, JSON.stringify(vacio));

// ── EL VISOR: el coach NO puede borrar; el asesorado SÍ ──
const visorCoach = await ev(`(()=>{try{
  document.querySelectorAll('div[style*="z-index:9999"]').forEach(d=>d.remove());
  CUR.clientId='ph1'; viewPhoto('f1','ph1',true);
  const del=document.getElementById('ph-del-btn');
  const ov=[...document.querySelectorAll('div')].find(d=>d.style&&d.style.zIndex==='9999');
  const txt=ov?ov.innerText.replace(/\\s+/g,' ').trim():'';
  return {borrar:!!del, txt};
}catch(e){return {err:e.message}}})()`);
check('F4 el visor del COACH no trae botón de borrar (la foto no es suya y no hay vuelta atrás)',
  visorCoach && visorCoach.borrar === false && /Cerrar/.test(visorCoach.txt || ''), JSON.stringify(visorCoach));
await shot('fotos-visor-coach');
const visorCliente = await ev(`(()=>{try{
  document.querySelectorAll('div[style*="z-index:9999"]').forEach(d=>d.remove());
  [...document.querySelectorAll('div')].filter(d=>d.style&&d.style.zIndex==='9999').forEach(d=>d.remove());
  CUR.clientId='ph1'; viewPhoto('f1','ph1');
  return {borrar: !!document.getElementById('ph-del-btn')};
}catch(e){return {err:e.message}}})()`);
check('F5 CONTROL el asesorado SÍ conserva el suyo: proteger no es borrar la feature',
  visorCliente && visorCliente.borrar === true, JSON.stringify(visorCliente));
await ev(`[...document.querySelectorAll('div')].filter(d=>d.style&&d.style.zIndex==='9999').forEach(d=>d.remove());`);

// ── EL ASESORADO SE ENTERA (y solo quien tiene coach) ──
const aviso = await ev(`(()=>{try{
  showScreen('s-client'); if(typeof cnTab==='function')cnTab('cn-profile');
  const g=document.getElementById('cn-photos-grid');
  CUR.clientId='ph1'; renderPhotosClient('ph1');
  const conFotos=g.innerText.replace(/\\s+/g,' ').trim();
  CUR.clientId='ph2'; renderPhotosClient('ph2');
  const sinFotos=g.innerText.replace(/\\s+/g,' ').trim();
  CUR.clientId='ph3'; renderPhotosClient('ph3');
  const sinCoach=g.innerText.replace(/\\s+/g,' ').trim();
  return {conFotos,sinFotos,sinCoach};
}catch(e){return {err:e.message}}})()`);
const dice = t => /Tu entrenador ve estas fotos/.test(t || '');
check('F6 con coach y con fotos, se le DICE que su entrenador las ve', dice(aviso.conFotos), (aviso.conFotos || '').slice(0, 90));
check('F7 y también SIN fotos: enterarse antes de subir la primera es cuando sirve', dice(aviso.sinFotos), (aviso.sinFotos || '').slice(0, 90));
check('F8 CONTROL a un PREMIUM SIN COACH (tier app) no se le promete un lector que no existe',
  !dice(aviso.sinCoach), (aviso.sinCoach || '').slice(0, 90));

// ── CAPTURAS de la ficha del coach, los dos temas (el tema vive en documentElement) ──
const pinta = `showScreen('s-coach');gp('p-detail',null,'Detalle');CUR.clientId='ph1';renderPhotosCoach('ph1');
  const s=document.getElementById('avi-loading');if(s)s.style.display='none';
  const b=document.getElementById('install-banner');if(b)b.style.display='none';
  document.getElementById('d-photos-wrap').scrollIntoView({block:'center'});`;
const fondo = async () => await ev(`(()=>{let el=document.getElementById('d-photos-wrap');
  while(el&&el!==document.documentElement){const c=getComputedStyle(el).backgroundColor;
    if(c&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent')return c; el=el.parentElement;}
  return getComputedStyle(document.body).backgroundColor;})()`);
const lum = c => { const m = String(c).match(/\d+/g); return m ? (+m[0] + +m[1] + +m[2]) / 3 : -1; };
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(`setTheme('light');` + pinta); await sleep(400);
check('F9 CONTROL el modo claro es CLARO de verdad (o la captura no prueba nada)', lum(await fondo()) > 180, String(await fondo()));
await shot('fotos-coach-claro');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await ev(`setTheme('dark');` + pinta); await sleep(400);
await shot('fotos-coach-oscuro');
// 360 px: las miniaturas no pueden desbordar la ficha
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
await ev(pinta); await sleep(300);
const desb = await ev(`(()=>{let el=document.getElementById('d-photos-wrap'),peor=0;
  while(el&&el!==document.body){if(el.scrollWidth>el.clientWidth+1)peor=Math.max(peor,el.scrollWidth-el.clientWidth);el=el.parentElement;}
  return peor;})()`);
check('F10 a 360 px la rejilla no obliga a arrastrar la pantalla de lado', desb === 0, desb + 'px');
await shot('fotos-coach-360');

log('\njsErrors: ' + JSON.stringify(jsErrors));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
log(`\n${fallas || jsErrors.length ? '🔴' : '✅'} ${results.length - fallas}/${results.length} OK` + (jsErrors.length ? ` · ${jsErrors.length} errores JS` : ''));
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fallas || jsErrors.length ? 1 : 0);
