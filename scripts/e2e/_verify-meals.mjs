// _verify-meals.mjs — LA COMIDA DE HOY pegada al día de entreno (2026-08-01) + la REVISIÓN
// del plan que ve el coach. Sin login: sintetiza a las personas REALES de producción que
// motivaron la feature (Nataly +971 kcal, Luz +670 queriendo perder grasa, Astrid sin peso ni
// estatura) y llama a los render directo. La escritura a la nube está SELLADA en localhost
// (v298), así que nada toca producción.
// CON DIENTES (exit 1): no se queda en capturas — la lección de v403 es que un harness que
// solo saca PNG genera imágenes de una pantalla rota sin protestar.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8801, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9309', '--user-data-dir=' + process.env.TEMP + '/meals-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9309/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shot(n) {
  const h = await ev(`Math.max(document.body.scrollHeight, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`typeof renderMealsToday==='function' && typeof nutDayPlan==='function' && typeof renderNutReviewCard==='function' && !document.getElementById('avi-loading')`);
await sleep(1500);

let fallos = 0;
const ok = (c, n, extra) => { console.log(`  ${c ? 'OK ' : '❌ '} ${n}${extra !== undefined ? ' — ' + JSON.stringify(extra).slice(0, 170) : ''}`); if (!c) fallos++; };

const SETUP = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  // Nataly: 56 kg, ganar músculo, plan del coach de 3200 kcal (+971 sobre su objetivo real).
  const nataly={id:'cN',name:'Nataly',sex:'F',age:40,weight:56,height:162,goal:'Ganar músculo',
    activityFactor:1.55,days:3,tier:'premium',
    routines:[{id:'r1',name:'Full Body',day:hoy,exercises:[{muscle:'piernas'},{muscle:'gluteo'},{muscle:'pecho'}]}]};
  // Luz: 82 kg, PERDER GRASA, y su plan la tiene comiendo por encima del mantenimiento.
  const luz={id:'cL',name:'Luz',sex:'F',age:39,weight:82,height:156,goal:'Perder grasa',
    activityFactor:1.55,days:3,tier:'premium',routines:[]};
  // Andrés: su plan está BIEN (+38 kcal) → no debe generar alarma.
  const sano={id:'cS',name:'Andrés',sex:'M',age:37,weight:90,height:175,goal:'Ganar músculo',
    activityFactor:1.55,days:5,tier:'premium',routines:[]};
  // Astrid: sin peso ni estatura → no se le puede calcular nada.
  const astrid={id:'cX',name:'Astrid',sex:'F',age:33,goal:'Ganar músculo',activityFactor:1.55,days:3,tier:'premium',routines:[]};
  DB.clients=[nataly,luz,sano,astrid];
  DB.nutrition={cN:{kcal:3200,prot:180,carbs:380,fat:80},cL:{kcal:2400,prot:150,carbs:270,fat:75},
                cS:{kcal:3200,prot:180,carbs:380,fat:80},cX:{kcal:2400}};
  DB.bodyweight={};DB.history={cN:[],cL:[],cS:[],cX:[]};DB.prs={};DB.medidas={};DB.photos={};
  return {hoy};
}catch(e){return {err:String(e)}}})()`;

const s = await ev(SETUP);
ok(!s.err, 'setup', s);

// ── 1. La comida de hoy ──
const r1 = await ev(`(()=>{CUR.clientId='cN';renderMealsToday(DB.clients[0]);
  const c=document.getElementById('cn-meals');
  return {html:c?c.innerHTML.length:0, txt:c?c.textContent.replace(/\\s+/g,' ').trim():''};})()`);
ok(r1.html > 100, 'la tarjeta de «Tu comida de hoy» se pinta', r1.txt.slice(0, 80));
ok(/kcal/.test(r1.txt), 'muestra las calorías del día');
ok(/Proteína/.test(r1.txt), 'muestra los macros del día');

const r2 = await ev(`(()=>{toggleMealsToday();
  const c=document.getElementById('cn-meals');
  const t=c?c.textContent.replace(/\\s+/g,' ').trim():'';
  return {t, comidas:['Desayuno','Media mañana','Almuerzo','Media tarde','Cena'].filter(n=>t.includes(n)),
    gramos:(t.match(/\\(\\d+ g\\)/g)||[]).length,
    kcal:(t.match(/(\\d{3,4}) kcal/)||[])[1]||null};})()`);
ok(r2.comidas.length === 5, 'trae las 5 comidas del día', r2.comidas);
ok(r2.gramos >= 8, 'trae CANTIDADES en gramos, no solo macros', { cantidades: r2.gramos });
// 🔴 el plan del COACH manda: 3200 escritas por él, NO la estimación (2229)
ok(r2.kcal && Number(r2.kcal) >= 3000, 'usa el plan del COACH (3200), no la estimación', { kcal: r2.kcal });
ok(!/undefined|NaN|\[object/.test(r2.t), 'sin texto roto (undefined/NaN)');
await shot('meals-hoy-claro');

// ── 2. La revisión del coach ──
const r3 = await ev(`(()=>{const luz=DB.clients[1];CUR.clientId='cL';renderNutReviewCard(luz);
  const e=document.getElementById('d-nutreview');
  return {vis:!!(e&&e.style.display!=='none'&&e.innerHTML.length>50), txt:e?e.textContent.replace(/\\s+/g,' ').trim():''};})()`);
ok(r3.vis, 'avisa que el plan de Luz está desviado');
ok(/perder grasa/i.test(r3.txt), 'explica el riesgo PARA SU OBJETIVO', r3.txt.slice(0, 130));
ok(/6[0-9]{2}/.test(r3.txt), 'dice cuántas kcal sobran');

const r4 = await ev(`(()=>{const sano=DB.clients[2];CUR.clientId='cS';renderNutReviewCard(sano);
  const e=document.getElementById('d-nutreview');
  return {vis:!!(e&&e.style.display!=='none'&&e.innerHTML.length>50)};})()`);
ok(!r4.vis, 'un plan SANO no genera alarma (silencio)');

// ── 3. Sin datos del cuerpo: pide el dato, no inventa ──
const r5 = await ev(`(()=>{const a=DB.clients[3];CUR.clientId='cX';renderMealsToday(a);
  const c=document.getElementById('cn-meals');
  const t=c?c.textContent.replace(/\\s+/g,' ').trim():'';
  return {t, pide:/peso|estatura/i.test(t), inventa:/\\d{3,4} kcal/.test(t)};})()`);
ok(r5.pide, 'sin peso ni estatura PIDE el dato', r5.t.slice(0, 110));
ok(!r5.inventa, '🔴 y NO inventa un plan de calorías');

// ── 4. El plan de comida es Premium ──
const r6 = await ev(`(()=>{const libre={...DB.clients[0],id:'cF',tier:'libre'};DB.clients.push(libre);
  CUR.clientId='cF';renderMealsToday(libre);
  const c=document.getElementById('cn-meals');
  return {vacio:!c||c.innerHTML.trim().length===0};})()`);
ok(r6.vacio, 'un asesorado en modo libre no ve el plan de comida (es Premium)');

await ev(`(()=>{CUR.clientId='cN';renderMealsToday(DB.clients[0]);if(typeof setTheme==='function')setTheme('dark');})()`);
await sleep(400); await shot('meals-hoy-oscuro');

console.log('\njsErrors:', jsErrors);
if (jsErrors.length) fallos++;
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
console.log(fallos ? `\n❌ ${fallos} FALLARON` : '\n✅ TODO OK');
process.exit(fallos ? 1 : 0);
