// _verify-firstrun.mjs — LA PORTADA DEL DÍA 1 (variante C del estudio, 2026-07-26).
// Nació como harness de CAPTURA para el estudio; ahora además AFIRMA (exit 1).
// Nace de un dato de producción, no de una idea: de los 23 del gimnasio, **8 tienen rutina
// asignada y NUNCA completaron un entreno**. No abandonan a la semana: no llegan a terminar el
// primero. Este harness reproduce EXACTAMENTE ese estado (rutinas sí, historial cero) y captura
// lo que esa persona ve, para poder mirarlo en vez de suponerlo.
// Sin login ni red. Captura full-page en claro y oscuro a 390×844.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8821, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-day1';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9341', '--user-data-dir=' + process.env.TEMP + '/day1-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9341/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(1800);

// Asesorado REAL de los 8: 5 rutinas asignadas por el coach, CERO entrenos, cuenta recién creada.
const NUEVO = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const ex=(id,n,m,s,r)=>({id:id,name:n,muscle:m,type:'Compuesto',sets:s,reps:r});
  const rut=(id,n,d,exs)=>({id:id,name:n,day:d,restSec:90,exercises:exs});
  const client={id:'nuevo',name:'Santiago',sex:'M',level:'Principiante',goal:'Bajar de peso',days:3,
    createdAt:new Date().toISOString(),
    routines:[
      rut('r1','Full body A',hoy,[ex('e1','Sentadilla','Pierna',3,'12'),ex('e2','Press banca','Pecho',3,'10'),ex('e3','Remo con barra','Espalda',3,'10'),ex('e4','Plancha','Core',3,'30s')]),
      rut('r2','Full body B','Miércoles',[ex('e5','Peso muerto','Espalda',3,'10'),ex('e6','Press militar','Hombro',3,'10')]),
      rut('r3','Cardio','Viernes',[ex('e7','Caminadora','Cardio',1,'20 min')])
    ],
    habits:{water:{},steps:{}}};
  DB.clients=[client]; DB.history={nuevo:[]}; DB.prs={}; DB.bodyweight={};
  CUR.clientId='nuevo'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;

console.log('  nuevo asesorado (5 rutinas, 0 entrenos):', await ev(NUEVO)); await sleep(600);

// VIEWPORT REAL (390x844), no full-page: `captureBeyondViewport` miente con position:fixed
// —la primera corrida salió en blanco— y además lo que importa para el estudio es lo que cabe
// en la pantalla del celular sin desplazar. `parte` 0 = arriba del todo, 1 = tras un scroll.
async function shot(name, tema, parte) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(300);
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody'); if(b)b.scrollTop=${parte ? 'b.clientHeight*0.85' : '0'};})()`);
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}${parte ? '-b' : ''}-${tema}.png`, Buffer.from(r.data, 'base64'));
  const alto = await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');return b?{scroll:b.scrollHeight,visible:b.clientHeight}:null;})()`);
  console.log('  shot', name + (parte ? '-b' : ''), tema, JSON.stringify(alto));
}

// 1) «Hoy» — la primera pantalla que ve. ¿Se entiende qué tiene que hacer?
await shot('1-hoy', 'light', 0);
await shot('1-hoy', 'light', 1);
await shot('1-hoy', 'dark', 0);

// 2) «Rutinas» — su plan completo.
await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Rutinas/.test(x.textContent)); if(t)t.click();})()`); await sleep(700);
await shot('2-rutinas', 'light', 0);

// 3) El ENTRENO ya arrancado (el momento de la verdad).
await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Hoy/.test(x.textContent)); if(t)t.click();})()`); await sleep(500);
const arranque = await ev(`(()=>{
  const btns=[...document.querySelectorAll('#cn-today button, #cn-today .btn')].map(b=>({txt:(b.textContent||'').trim().slice(0,40),on:b.getAttribute('onclick')||''}));
  return btns.filter(b=>b.txt);})()`);
console.log('  botones en «Hoy»:', JSON.stringify(arranque, null, 1).slice(0, 700));
await ev(`(()=>{ if(typeof startRoutineNow==='function'){ const c=DB.clients[0]; startRoutineNow(c, c.routines[0]); } })()`); await sleep(1200);
await shot('3-entreno', 'light', 0);
await shot('3-entreno', 'light', 1);

// ══════════ ASERCIONES ══════════
const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Hoy/.test(x.textContent)); if(t)t.click();})()`); await sleep(400);
await ev(`(()=>{DB.history={nuevo:[]}; renderClientToday(DB.clients[0]);})()`); await sleep(700);

// D1: con CERO sesiones y rutina de hoy → portada con el entreno y UNA sola salida.
const d1 = await ev(`(()=>{const el=document.getElementById('cn-firstrun');
  const btn=el?el.querySelector('.fr-cta'):null; const r=btn?btn.getBoundingClientRect():null;
  return {pintada:!!(el&&el.innerHTML.trim()), txt:el?el.innerText.replace(/\\s+/g,' ').trim():'',
          rutina:/Full body A/.test(el?el.innerText:''), botones:el?el.querySelectorAll('button').length:-1,
          altoBoton:r?Math.round(r.height):0};})()`);
check('D1 con cero entrenos se pinta la portada, con la rutina de hoy y UNA sola acción',
  d1.pintada && d1.rutina && d1.botones === 1 && d1.altoBoton >= 44,
  JSON.stringify({ btns: d1.botones, alto: d1.altoBoton, txt: d1.txt.slice(0, 80) }));

// D1-bis: la duración sale del motor puro, no de un número inventado (12 series, 90s → ~27 min).
check('D1-bis dice cuántos ejercicios y una duración estimada honesta',
  /4 ejercicios/.test(d1.txt) && /~27 min/.test(d1.txt), JSON.stringify({ txt: d1.txt.slice(0, 120) }));

// D2: NINGUNA tarjeta secundaria compite ese día.
const d2 = await ev(`(()=>{const ids=['cn-habits','cn-coach-card','cn-missday','cn-news','cn-today-upsell','cn-cmty-nudge','cn-share','cn-push-nudge'];
  return ids.filter(id=>{const e=document.getElementById(id); return e && e.innerHTML.trim().length>0 && e.style.display!=='none';});})()`);
check('D2 el día 1 no hay tarjetas secundarias compitiendo', Array.isArray(d2) && d2.length === 0, JSON.stringify(d2));

// D3: el ánimo no aparece antes del primer entreno; el entreno SÍ está montado debajo.
const d3 = await ev(`(()=>{const mc=document.querySelector('#cn-today-body .checkin-card');
  const body=document.getElementById('cn-today-body');
  return {moodVisible:!!(mc&&mc.offsetHeight>0), entrenoMontado:!!(body&&body.innerHTML.trim().length>200)};})()`);
check('D3 el ánimo no compite el día 1, y el entreno SÍ está montado debajo',
  d3.moodVisible === false && d3.entrenoMontado === true, JSON.stringify(d3));

// D4 — EL CANDADO (clase v367): una sesión PARCIAL (la que deja el auto-guardado de la 1ª serie)
// significa que YA empezó → la portada debe desaparecer y jamás taparle el entreno.
await ev(`(()=>{const hoy=new Date().toISOString();
  DB.history={nuevo:[{id:'p1',sessionId:'s1',routineId:'r1',routineName:'Full body A',date:hoy,startedAt:hoy,doneSets:1,totalSets:12,exercises:[]}]};
  renderClientToday(DB.clients[0]);})()`); await sleep(700);
const d4 = await ev(`(()=>{const el=document.getElementById('cn-firstrun');const body=document.getElementById('cn-today-body');
  return {portada:!!(el&&el.innerHTML.trim()), entreno:!!(body&&body.innerHTML.trim().length>200)};})()`);
check('D4 (v367) con una sesión PARCIAL la portada desaparece y el entreno se pinta igual',
  d4.portada === false && d4.entreno === true, JSON.stringify(d4));

// D5: las tarjetas normales vuelven en cuanto la portada se apaga.
const d5 = await ev(`(()=>{const h=document.getElementById('cn-habits');
  return {habitos:!!(h&&h.innerHTML.trim()&&h.style.display!=='none')};})()`);
check('D5 apagada la portada, «Hoy» vuelve a ser el de siempre (hábitos de vuelta)', d5.habitos === true, JSON.stringify(d5));

// D6: día de DESCANSO → la portada no se inventa un entreno que no existe.
await ev(`(()=>{DB.history={nuevo:[]};
  DB.clients[0].routines=DB.clients[0].routines.map(r=>Object.assign({},r,{day:'Miércoles'}));
  renderClientToday(DB.clients[0]);})()`); await sleep(700);
const d6 = await ev(`(()=>{const el=document.getElementById('cn-firstrun');return !!(el&&el.innerHTML.trim());})()`);
check('D6 sin entreno hoy la portada NO se pinta', d6 === false, JSON.stringify({ pintada: d6 }));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── PORTADA DEL DÍA 1 (variante C) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('  capturas en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
