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

// D1-bis: la duración sale del motor puro, no de un número inventado.
// ⚠️ El minuto exacto se DERIVA del motor, no se escribe aquí: v533 recalibró la constante de 45 a
// 84 s con 225 sesiones reales delante y un `~27 min` quemado habría pintado esa medición como un
// fallo del arreglo. Lo que este check afirma es que el número que se PINTA es el que el motor
// calcula — que es lo que de verdad puede romperse.
const d1min = await ev(`(()=>{const c=DB.clients[0];const r=(c.routines||[])[0];
  return (typeof estimateWorkoutMinutes==='function')?estimateWorkoutMinutes(r,{secsPerSet:(typeof _secsPerSetDe==='function'?_secsPerSetDe(c):undefined)}):null;})()`);
check('D1-bis dice cuántos ejercicios y la duración que calcula el motor',
  /4 ejercicios/.test(d1.txt) && d1min > 0 && new RegExp('~' + d1min + ' min').test(d1.txt),
  JSON.stringify({ motor: d1min, txt: d1.txt.slice(0, 120) }));

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
// v503 (héroe de la dirección B): el entreno que llega COLAPSADO ya no se pinta en
// `#cn-today-body` sino en la cabecera, fundido con el saludo. La propiedad que este check
// protege no cambió —la portada del día 1 no puede tapar el entreno— así que se afirma donde
// el entreno se OFRECE hoy: el cuerpo montado, o el héroe con su botón de empezar.
const d4 = await ev(`(()=>{const el=document.getElementById('cn-firstrun');const body=document.getElementById('cn-today-body');
  const hero=document.querySelector('#cn-today-head .tod-hero');
  return {portada:!!(el&&el.innerHTML.trim()), entreno:!!(body&&body.innerHTML.trim().length>200),
          heroCta:!!(hero&&hero.querySelector('.tod-hero-cta'))};})()`);
check('D4 (v367) con una sesión PARCIAL la portada desaparece y el entreno sigue OFRECIDO',
  d4.portada === false && (d4.entreno === true || d4.heroCta === true), JSON.stringify(d4));

// D5: las tarjetas normales vuelven en cuanto la portada se apaga.
// 🔴 D5-bis: y las ESTÁTICAS vuelven con su TEXTO. El día 1 vaciaba el innerHTML de los once
// bloques, y `qw-entry` es el único que nadie repinta (vive en index.html): al terminar su
// PRIMER entreno la persona se quedaba con una píldora en blanco —y pulsable— el resto de la
// sesión. Preexistente desde v403, reproducido en HEAD limpio, arreglado el 20-ago.
const d5 = await ev(`(()=>{const h=document.getElementById('cn-habits'); const q=document.getElementById('qw-entry');
  return {habitos:!!(h&&h.innerHTML.trim()&&h.style.display!=='none'),
          qwTexto:(q?q.textContent:'').replace(/\\s+/g,' ').trim(),
          qwVisible:!!(q&&q.style.display!=='none')};})()`);
check('D5 apagada la portada, «Hoy» vuelve a ser el de siempre (hábitos de vuelta)', d5.habitos === true, JSON.stringify({ habitos: d5.habitos }));
check('🔴 D5-bis el botón de entrenamientos rápidos vuelve CON SU TEXTO, no en blanco',
  d5.qwVisible === true && /rápidos/i.test(d5.qwTexto), JSON.stringify({ visible: d5.qwVisible, txt: d5.qwTexto.slice(0, 60) }));

// 🔴 D7 — EL CASO QUE D4 NO PODÍA CAZAR: la sesión FINALIZADA (`finishedAt`), no la parcial.
// La parcial de D4 no dispara ningún `return` de `renderClientToday`, así que sí llegaba a
// `renderFirstRun` y la portada se limpiaba. Con una sesión TERMINADA se sale por el `return` de
// «ya entrenaste hoy», que vive ARRIBA de esa llamada — y la portada del render anterior se
// quedaba entera: 933 chars, 326 px, con el botón «Empezar mi primer entreno →» VIVO encima de
// «¡Ya entrenaste hoy!» (medido por Lucas QA en la auditoría de v507, arreglado el 21-ago).
// El orden importa: primero se PINTA la portada (día 1 de verdad, historial vacío) y solo después
// llega el entreno terminado. Sin ese primer render no hay portada vieja que dejar colgada, y el
// check pasaría sin tocar el defecto.
await ev(`(()=>{DB.history={nuevo:[]};renderClientToday(DB.clients[0]);})()`); await sleep(500);
const d7pre = await ev(`(()=>{const el=document.getElementById('cn-firstrun');return !!(el&&el.innerHTML.trim());})()`);
await ev(`(()=>{const hoy=new Date().toISOString();
  DB.history={nuevo:[{id:'f1',sessionId:'s2',routineId:'r1',routineName:'Full body A',date:hoy,startedAt:hoy,finishedAt:hoy,doneSets:12,totalSets:12,exercises:[]}]};
  renderClientToday(DB.clients[0]);})()`); await sleep(700);
const d7 = await ev(`(()=>{const el=document.getElementById('cn-firstrun');const con=document.getElementById('cn-today-body');
  const txt=(el?el.textContent:'').replace(/\\s+/g,' ').trim();
  return {portadaLargo:(el?el.innerHTML.trim().length:0), alto:(el?Math.round(el.getBoundingClientRect().height):0),
          cta:!!(el&&el.querySelector('button,.btn')), txt:txt.slice(0,80),
          yaEntrenaste:/ya entrenaste/i.test((con?con.textContent:''))};})()`);
check('🔴 D7 con el primer entreno TERMINADO la portada del día 1 se va (y sale «¡Ya entrenaste hoy!»)',
  d7pre === true && d7.portadaLargo === 0 && d7.alto === 0 && d7.cta === false && d7.yaEntrenaste === true,
  JSON.stringify({ portadaAntes: d7pre, ...d7 }));

// D6: día de DESCANSO → la portada no se inventa un entreno que no existe.
// 🔴 El día se elige RELATIVO a hoy (era 'Miércoles' fijo, y los miércoles este check daba rojo
// sin que nadie tocara código — la clase del fixture con fechas absolutas de GOTCHAS VIGENTES).
// 'Libre' tampoco vale: `renderClientToday` lo usa de comodín cuando no hay rutina para hoy.
await ev(`(()=>{DB.history={nuevo:[]};
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const manana=days[(new Date().getDay()+1)%7];
  DB.clients[0].routines=DB.clients[0].routines.map(r=>Object.assign({},r,{day:manana}));
  renderClientToday(DB.clients[0]);})()`); await sleep(700);
// 🔴 D6 RE-ENCUADRADO en v531. Antes afirmaba «sin entreno hoy la portada NO se pinta» — o sea,
// afirmaba EL DEFECTO: el plan va de lunes a viernes, así que quien se registra sábado, domingo o
// festivo (el 43 % de los días, medido) veía como primera pantalla de su vida en la app un banner
// que le dice que hoy no entrene. Le pasó a Chema el 22-ago con plan de pago y cero sesiones.
// Ahora la portada SÍ se pinta, en su variante «tu plan empieza el <día>».
const d6 = await ev(`(()=>{
  const el=document.getElementById('cn-firstrun');
  const con=document.getElementById('cn-today-body');
  const txt=el?(el.innerText||'').replace(/\\s+/g,' ').trim():'';
  return { pintada: !!(el&&el.innerHTML.trim()), txt,
           bannerDescanso: /d[ií]a de descanso/i.test((con&&con.innerText)||''),
           cuerpoVacio: !((con&&con.innerHTML||'').trim()) };
})()`);
check('🔴 D6 sin entreno hoy la portada SÍ se pinta (v531: antes era el banner de descanso a secas)',
  d6.pintada === true, JSON.stringify(d6).slice(0, 200));
// 🔴 Esta aserción nació DÉBIL y lo cazó el sabotaje S3: buscaba un día de la semana en TODO el
// texto, y la frase «tu plan va de lunes a viernes» la satisfacía sola — o sea que borrar la
// promesa entera salía verde. Ahora se exige la FRASE, que es lo que la persona necesita leer.
check('🔴 D6b y DICE cuándo empieza («tu primer entreno es …»)',
  /tu primer entreno es\s+(mañana|el\s+\S+)/i.test(d6.txt || ''), (d6.txt || '').slice(0, 140));
check('D6c y enseña CON QUÉ empieza (el nombre de la rutina)',
  /EMPIEZAS CON/i.test(d6.txt || ''), (d6.txt || '').slice(0, 120));
// 🔒 El banner de descanso NO puede quedar apilado debajo: «tu plan está listo» + «hoy descansa»
// se contradicen para quien acaba de entrar y todavía no sabe cómo funciona la app.
check('🔒 D6d el banner de descanso NO queda apilado debajo de la portada',
  d6.bannerDescanso === false && d6.cuerpoVacio === true, JSON.stringify(d6).slice(0, 200));

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
