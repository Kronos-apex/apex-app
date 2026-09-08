// Verificación E2E de v587: LA VALORACIÓN DICE DE CUÁNDO ES EL PESO.
//
// Hallazgo D3-4 de la auditoría del 7-sep. Con ese peso se le calculan TMB, TDEE, objetivo
// calórico, macros y el perfil de carga con el que el generador arma su rutina — y la ficha no
// decía en ninguna parte de cuándo era. Medido contra producción (25 asesorados): 7 sin NINGUNA
// pesada (se calcula con el número del alta, que nadie confirmó), 9 de los 18 con pesada la
// tienen de hace más de 60 días (la peor, 104), y 12 de 18 tienen UNA sola toma.
//
// 🔒 Se afirma lo que el coach LEE en cada uno de los tres estados, no la presencia de un
//    selector (v453), y con el control de que los tres son DISTINTOS entre sí — si los tres
//    dijeran lo mismo, la feature no separaría nada.
// 🔒 Y que los DOS avisos (fuente y descuadre con la ficha) salen JUNTOS cuando ambos aplican:
//    es el `return` prematuro de v506, que ya costó presentar 625 kcal como un problema de
//    redacción.
// Patrón preview-SIN-login.
//
// Corre: node scripts/e2e/_verify-peso-fuente.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8797;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-pesofuente-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9297', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9297/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-pesofuente';
try { mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof renderValoracion==='function' && typeof bodyWeightSource==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó'); process.exit(1); }

// ── FIXTURE: los cuatro estados, con los casos REALES de producción ──
// El perfil tiene que traer sexo/talla/edad o `renderValoracion` no calcula nada y la sonda
// mediría una tarjeta vacía (control de montaje más abajo).
const montaje = await ev(`(()=>{try{
  const dia=86400000, hoy=Date.now();
  const base={height:170,age:30,sex:'F',activityFactor:1.55,goal:'Perder grasa',level:'Intermedio',days:3,tier:'premium',routines:[]};
  DB.clients=[
    Object.assign({id:'w1',name:'Vieja 104',weight:73},base),        // Astrid: 73 kg de hace 104 días
    Object.assign({id:'w2',name:'Sin Pesada',weight:82},base),       // Luz: 48 sesiones, 0 pesadas
    Object.assign({id:'w3',name:'Fresca',weight:60},base),           // pesada de hace 6 días
    Object.assign({id:'w4',name:'Descuadre',weight:78},base),        // Samuel: ficha 78, pesada 86
  ];
  DB.bodyweight={
    w1:[{date:new Date(hoy-104*dia).toISOString(),kg:73}],
    w2:[],
    w3:[{date:new Date(hoy-6*dia).toISOString(),kg:60}],
    w4:[{date:new Date(hoy-5*dia).toISOString(),kg:86},{date:new Date(hoy-40*dia).toISOString(),kg:88}],
  };
  showScreen('s-coach'); gp('p-detail',null,'Detalle');
  const s=document.getElementById('avi-loading'); if(s)s.style.display='none';
  const b=document.getElementById('install-banner'); if(b)b.style.display='none';
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE el fixture se planta', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }

// ⚠️ `#d-valoracion-body` nace con `display:none` (la tarjeta abre COLAPSADA), y con
// display:none `innerText` devuelve el textContent POR ESPECIFICACIÓN — o sea que leerlo así
// mide texto INVISIBLE y la sonda aprueba lo que nadie ve. Se EXPANDE primero
// (`toggleValoracion`) y el control de más abajo exige alto real.
const leer = async id => await ev(`(()=>{const c=DB.clients.find(x=>x.id==='${id}');
  CUR.clientId='${id}'; renderValoracion(c);
  const el=document.getElementById('d-valoracion-body');
  if(el&&getComputedStyle(el).display==='none'&&typeof toggleValoracion==='function')toggleValoracion();
  return el?el.innerText.replace(/\\s+/g,' ').trim():'';})()`);

const tVieja = await leer('w1');
const tSin = await leer('w2');
const tFresca = await leer('w3');
const tDesc = await leer('w4');

// ── CONTROL DE MONTAJE: la valoración tiene que haber CALCULADO algo ──
const visible = await ev(`(()=>{const el=document.getElementById('d-valoracion-body');
  if(!el)return {err:'sin contenedor'};
  const r=el.getBoundingClientRect();
  return {display:getComputedStyle(el).display,alto:Math.round(r.height)};})()`);
check('MONTAJE la valoración calcula de verdad (si no, todo lo demás mide una tarjeta vacía)',
  /kcal/i.test(tVieja) && tVieja.length > 120, tVieja.slice(0, 70) + '…');
if (!/kcal/i.test(tVieja)) { log('\n🔴 la valoración no calculó: las cifras de esta corrida no valen'); process.exit(1); }
check('MONTAJE y está DESPLEGADA: con display:none innerText devuelve textContent, así que sin esto se mediría texto invisible',
  visible && visible.display !== 'none' && visible.alto > 0, JSON.stringify(visible));
if (!visible || visible.alto === 0) { log('\n🔴 la valoración no se ve: las cifras de esta corrida no valen'); process.exit(1); }

log('\n  ── lo que LEE el coach en cada estado ──');
const corta = t => (t.match(/⚖️[^⚖⚕]*/g) || ['(ningún aviso de peso)']).join(' | ');
log('   peso viejo (104 d): ' + corta(tVieja));
log('   sin pesada        : ' + corta(tSin));
log('   pesada fresca     : ' + corta(tFresca));
log('   ficha descuadrada : ' + corta(tDesc));
log('');

check('P1 con una pesada de 104 días DICE cuántos días tiene', /hace 104 días/.test(tVieja), '');
check('P2 y no afirma que el plan esté mal: solo que hace falta confirmarlo',
  /siguen cuadrando/.test(tVieja) && !/mal|incorrect|error/i.test(corta(tVieja)), '');
check('P3 sin NINGUNA pesada lo dice, que es el peor caso y no tenía señal',
  /no tiene ninguna pesada registrada/i.test(tSin), '');
check('P4 y aclara que el número viene del alta (no de algo que alguien confirmara)',
  /darlo de alta/i.test(tSin), '');
check('P5 CONTROL con una pesada fresca NO se le avisa de nada raro: solo de cuándo es',
  /hace 6 días/.test(tFresca) && !/no tiene ninguna pesada/i.test(tFresca) && !/siguen cuadrando/.test(tFresca), corta(tFresca));
check('P6 los DOS avisos salen juntos cuando ambos aplican (nada de `return` prematuro, v506)',
  /hace 5 días/.test(tDesc) && /la ficha dice/i.test(tDesc), corta(tDesc));
check('P7 CONTROL los cuatro estados dicen cosas DISTINTAS (si no, no separan nada)',
  new Set([corta(tVieja), corta(tSin), corta(tFresca), corta(tDesc)]).size === 4, '');

// ── LOS DOS TEMAS, y que el aviso se LEA (el token crudo era ilegible en claro) ──
const pinta = id => `(()=>{const c=DB.clients.find(x=>x.id==='${id}');CUR.clientId='${id}';renderValoracion(c);
  const s=document.getElementById('avi-loading');if(s)s.style.display='none';
  const b=document.getElementById('install-banner');if(b)b.style.display='none';
  const vb=document.getElementById('d-valoracion-body');
  if(vb&&getComputedStyle(vb).display==='none'&&typeof toggleValoracion==='function')toggleValoracion();
  vb.scrollIntoView({block:'center'});return 1;})()`;
const contraste = async () => await ev(`(()=>{
  const el=[...document.querySelectorAll('#d-valoracion-body div')].find(d=>/⚖️/.test(d.textContent)&&d.children.length<=3);
  if(!el)return null;
  const cs=getComputedStyle(el);
  const lum=c=>{const m=String(c).match(/\\d+(\\.\\d+)?/g);if(!m)return -1;
    const f=[+m[0],+m[1],+m[2]].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});
    return 0.2126*f[0]+0.7152*f[1]+0.0722*f[2];};
  let bg=cs.backgroundColor, p=el;
  while((!bg||bg==='rgba(0, 0, 0, 0)')&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}
  const L1=lum(cs.color),L2=lum(bg);
  const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
  return {color:cs.color,bg,ratio:Math.round(ratio*100)/100};})()`);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(`setTheme('light');`); await ev(pinta('w1')); await sleep(400);
const cClaro = await contraste();
check('P8 el aviso se LEE en tema claro (el token crudo daba 3,8 y lo cazó el candado de v570)',
  cClaro && cClaro.ratio >= 4.5, JSON.stringify(cClaro));
await shot('peso-claro');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await ev(`setTheme('dark');`); await ev(pinta('w1')); await sleep(400);
const cOscuro = await contraste();
check('P9 y también en tema oscuro', cOscuro && cOscuro.ratio >= 4.5, JSON.stringify(cOscuro));
await shot('peso-oscuro');
await ev(pinta('w2')); await sleep(300); await shot('peso-sin-pesada');

// 360 px con letra grande: el aviso es texto largo y no puede desbordar
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
await ev(`document.documentElement.setAttribute('data-fs','xl');`); await ev(pinta('w1')); await sleep(300);
// Quién desborda: se busca el elemento culpable, no solo el número — un desborde sin nombre no
// se puede arreglar, y puede ser de un vecino y no de lo que acabo de escribir.
const desbDetalle = await ev(`(()=>{const cont=document.getElementById('d-valoracion-body');
  const culpables=[];
  [...cont.querySelectorAll('*')].forEach(e=>{
    const r=e.getBoundingClientRect(); const c=cont.getBoundingClientRect();
    if(r.width>0&&r.right>c.right+1) culpables.push({t:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,40),
      exceso:Math.round(r.right-c.right), tag:e.tagName+'.'+(e.className||'')});
  });
  let el=cont,peor=0,quien='';
  while(el&&el!==document.body){if(el.scrollWidth>el.clientWidth+1&&el.scrollWidth-el.clientWidth>peor){peor=el.scrollWidth-el.clientWidth;quien=el.id||el.className;}el=el.parentElement;}
  return {peor,quien,culpables:culpables.slice(0,4)};})()`);
const desb = desbDetalle ? desbDetalle.peor : -1;
log('   desborde: ' + JSON.stringify(desbDetalle));
check('P10 a 360 px con la letra en «Muy grande» no desborda de lado', desb === 0, desb + 'px');
await shot('peso-360-xl');

log('\njsErrors: ' + JSON.stringify(jsErrors));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
log(`\n${fallas || jsErrors.length ? '🔴' : '✅'} ${results.length - fallas}/${results.length} OK` + (jsErrors.length ? ` · ${jsErrors.length} errores JS` : ''));
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fallas || jsErrors.length ? 1 : 0);
