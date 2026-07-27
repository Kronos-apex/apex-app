// _fable-verif-v405.mjs — VERIFICACIÓN ADVERSARIAL del bloque v404+v405 (2026-07-27).
// No re-corre lo que ya pasó: ataca lo que la verificación propia NO probó.
//
// V1  La píldora sigue siendo USABLE. El fix bajó su z-index de 8000 a 690 y se demostró que ya
//     no roba toques… pero jamás se probó lo contrario: que no haya quedado ENTERRADA bajo el
//     contenido. `computedStyle.visibility` no lo detecta (un elemento tapado sigue «visible»).
//     Si estuviera enterrada, habríamos matado en silencio el CTA de instalación, que es el
//     problema nº1 de adopción. Se prueba con hit-testing SOBRE LA PÍLDORA.
// V2  El estado del buscador no esconde un ejercicio recién creado. `saveEx` llama a
//     `renderExercises`, que ahora filtra por `exQ`: si el coach está buscando y añade uno que no
//     coincide, la app dice «añadido» y no aparece.
// V3  Las funciones nuevas son alcanzables desde los onclick inline (gotcha «let no es window»).
// V4  Re-medición INDEPENDIENTE del mínimo táctil: no se lee el número que reportó la auditoría,
//     se vuelve a medir con otro método (el rect + la caja de .btn en CSS computado).
// V5  El fix de la jerga (v404) sigue en pie en las 3 superficies del asesorado.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8837, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-fable405';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9357', '--user-data-dir=' + process.env.TEMP + '/fable405-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9357/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof showScreen==='function' && typeof renderClientToday==='function' && typeof searchExercises==='function'`)) break; await sleep(500); }
await sleep(1800);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// Sello de escrituras: esto DEBE estar activo en localhost (nada llega a la nube real).
const sello = await ev(`(()=>{try{return typeof cloudWriteSealed==='function' ? !!cloudWriteSealed(location.hostname) : 'sin función';}catch(e){return 'err';}})()`);
check('SELLO: las escrituras a la nube están selladas en localhost', sello === true, JSON.stringify(sello));

const FIXTURE = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const ex=(id,n,m,lbl,t)=>{const e={id:id,name:n,muscle:m,type:t,sets:3,reps:'10'};if(lbl)e.muscleLabel=lbl;return e;};
  const cli={id:'cA',name:'Santiago',goal:'Ganar músculo',level:'Intermedio',days:3,weight:78,height:176,age:29,sex:'M',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:'2026-08-05',amount:120000}],
    routines:[{id:'r1',name:'Full body A',day:days[new Date().getDay()],restSec:90,exercises:[
      ex('e1','Sentadilla','piernas','Cuádriceps y glúteo','Compuesto'),
      ex('e2','Curl de Bíceps','biceps','','Aislamiento')]}]};
  DB.clients=[cli]; DB.history={cA:[]}; DB.prs={}; DB.bodyweight={};
  CUR.clientId='cA'; CUR.loggedAs='client';
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  document.getElementById('cn-today').classList.add('on');
  renderClientToday(cli);
  const ob=document.getElementById('data-ob'); if(ob)ob.classList.remove('on');
  const on2=document.getElementById('onboarding'); if(on2)on2.style.display='none';
  if(typeof ntClose==='function')ntClose(false);
  const b=document.getElementById('install-banner'); if(b){b.classList.remove('hide');b.style.display='flex';}
  if(typeof window._aviPillGuard==='function')window._aviPillGuard();
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
check('Fixture montado', await ev(FIXTURE) === 'ok'); await sleep(900);

// ══════════ V1 · ¿LA PÍLDORA SIGUE SIENDO USABLE, O LA ENTERRAMOS? ══════════
// Un elemento tapado por otro sigue teniendo visibility:visible. La única prueba honesta es
// preguntarle al navegador QUÉ HAY en el punto donde el dedo tocaría.
const PILL_VIVA = `(()=>{
  const p=document.getElementById('install-banner');
  if(!p) return {falta:true};
  const cs=getComputedStyle(p);
  const r=p.getBoundingClientRect();
  if(cs.visibility==='hidden'||cs.display==='none') return {apartada:true};
  const puntos=[[r.left+r.width*0.35,r.top+r.height/2],[r.left+r.width*0.5,r.top+r.height/2],[r.left+r.width*0.65,r.top+r.height/2]];
  const alcanza=puntos.map(([x,y])=>{
    const t=document.elementFromPoint(Math.round(x),Math.round(y));
    return !!(t&&(t===p||p.contains(t)));
  });
  const encima=puntos.map(([x,y])=>{const t=document.elementFromPoint(Math.round(x),Math.round(y));
    return t?(t.tagName+'.'+String(t.className).slice(0,20)):null;});
  return {apartada:false, alcanza, tocablesDe3:alcanza.filter(Boolean).length, encima, z:cs.zIndex};
})()`;

// En «Hoy» (día de entreno) la píldora SE APARTA a propósito: ahí no se mide.
// Se mide donde DEBE estar viva: Perfil, Progreso, Comunidad y el panel del coach.
const vivaEn = [];
for (const [nombre, idx] of [['Progreso', 3], ['Perfil', 4], ['Comunidad', 5]]) {
  await ev(`(()=>{const t=document.querySelectorAll('.cntab')[${idx}]; t.click();})()`);
  await sleep(700);
  await ev(`typeof window._aviPillGuard==='function' && (window._aviPillGuard(),1)`); await sleep(200);
  const r = await ev(PILL_VIVA);
  vivaEn.push({ nombre, ...r });
}
await ev(`(()=>{CUR.loggedAs='coach';showScreen('s-coach');if(typeof renderAll==='function')renderAll();
  gp('p-home',document.getElementById('sbi-home'),'Inicio');if(typeof renderHome==='function')renderHome();})()`);
await sleep(900);
await ev(`typeof window._aviPillGuard==='function' && (window._aviPillGuard(),1)`); await sleep(200);
vivaEn.push({ nombre: 'Coach·Inicio', ...(await ev(PILL_VIVA)) });

const enterrada = vivaEn.filter(v => !v.apartada && v.tocablesDe3 < 3);
check('V1 la píldora NO quedó enterrada: se puede tocar donde debe estar viva',
  enterrada.length === 0,
  JSON.stringify(vivaEn.map(v => ({ p: v.nombre, apartada: !!v.apartada, tocables: v.tocablesDe3, z: v.z, encima: v.encima && v.encima[1] }))));

// V1-bis: y donde SÍ debe apartarse (el entreno), sigue apartándose.
await ev(`(()=>{CUR.loggedAs='client';showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  document.getElementById('cn-today').classList.add('on');
  renderClientToday(DB.clients[0]);})()`);
await sleep(1000);
await ev(`(()=>{const b=document.querySelector('#s-client .cnbody'); if(b)b.scrollTop=b.scrollHeight*0.4;})()`);
await sleep(600);
const apart = await ev(PILL_VIVA);
// La regla NO es «esconderse en Hoy», es «esconderse SI se encima con un control». Así que la
// aserción honesta compara las dos cosas: si hay un control debajo, tiene que estar apartada;
// si no hay ninguno, tiene que seguir visible. Un test que exija esconderse siempre estaría
// pidiendo justo lo que el PO decidió NO hacer (apagarla de más cuesta instalaciones).
const hayDebajo = await ev(`(()=>{
  const p=document.getElementById('install-banner'); const r=p.getBoundingClientRect();
  const y=Math.round(r.top+r.height/2);
  let n=0;
  document.querySelectorAll('#cn-today input,#cn-today button').forEach(el=>{
    const q=el.getBoundingClientRect();
    if(q.width<2||q.height<2) return;
    if(q.top < r.bottom && q.bottom > r.top && q.left < r.right && q.right > r.left) n++;
  });
  return n;})()`);
check('V1-bis la regla es CONDICIONAL y se cumple en los dos sentidos',
  hayDebajo > 0 ? apart.apartada === true : apart.apartada === false,
  JSON.stringify({ controlesDebajo: hayDebajo, apartada: !!apart.apartada }));

// ══════════ V2 · EL BUSCADOR NO PUEDE ESCONDER UN EJERCICIO RECIÉN CREADO ══════════
await ev(`(()=>{CUR.loggedAs='coach';showScreen('s-coach');
  gp('p-exercises',document.getElementById('sbi-exercises'),'Ejercicios');
  exQ='';exPage=1;exF='all';renderExercises();})()`);
await sleep(800);
// El coach busca «press», y con la búsqueda puesta crea un ejercicio que NO coincide.
await ev(`(()=>{const i=document.getElementById('ex-search');i.value='press';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await sleep(500);
// Por la VÍA REAL (el formulario), no con un push al arreglo: la primera versión de este check
// simulaba un camino que la app no tiene, y por eso seguía en rojo después del arreglo. Un test
// que no pasa por el código que existe no prueba nada.
const v2 = await ev(`(()=>{try{
  const antes=document.querySelectorAll('#ex-grid .exc').length;
  openAddEx();
  document.getElementById('ex-n').value='Zancada Bulgara TEST';
  document.getElementById('ex-m').value='piernas';
  saveEx();
  const g=document.getElementById('ex-grid');
  return {antes, despues:g.querySelectorAll('.exc').length,
          apareceElNuevo:/Zancada Bulgara TEST/.test(g.innerText||''),
          buscador:document.getElementById('ex-search').value};
}catch(e){return {err:String(e.message)};}})()`);
check('V2 crear un ejercicio con una búsqueda activa NO lo deja invisible',
  v2.apareceElNuevo === true, JSON.stringify(v2));
await ev(`(()=>{DB.exercises=DB.exercises.filter(e=>!/Zancada Bulgara TEST/.test(e.name||''));
  const i=document.getElementById('ex-search');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await sleep(400);

// ══════════ V3 · LAS FUNCIONES NUEVAS SON ALCANZABLES DESDE UN onclick INLINE ══════════
// (gotcha del proyecto: un `let` de nivel superior NO es window; una función declarada sí.)
const v3 = await ev(`({exSearch:typeof window.exSearch, exMore:typeof window.exMore,
  buscar:typeof window.searchExercises, muscleHuman:typeof window.muscleHuman,
  exMuscleText:typeof window.exMuscleText, pill:typeof window.pillStealsTap,
  guard:typeof window._aviPillGuard})`);
check('V3 todo lo que invoca un onclick inline existe en window',
  v3.exSearch === 'function' && v3.exMore === 'function' && v3.buscar === 'function'
  && v3.muscleHuman === 'function' && v3.exMuscleText === 'function'
  && v3.pill === 'function' && v3.guard === 'function', JSON.stringify(v3));

// ══════════ V4 · RE-MEDICIÓN INDEPENDIENTE DEL MÍNIMO TÁCTIL ══════════
// Otro método: leer el CSS computado de una muestra real de botones, no el hit-testing.
const v4 = await ev(`(()=>{
  const vistos=[];
  document.querySelectorAll('#p-exercises .btn, #p-exercises button').forEach(b=>{
    const r=b.getBoundingClientRect(); if(r.height<1) return;
    vistos.push({t:(b.textContent||b.getAttribute('aria-label')||'').trim().slice(0,18),h:Math.round(r.height),minH:getComputedStyle(b).minHeight});
  });
  const bajos=vistos.filter(v=>v.h<36);
  return {n:vistos.length, bajos:bajos.slice(0,6), nBajos:bajos.length, muestra:vistos.slice(0,3)};})()`);
check('V4 (método independiente) ningún botón del panel de ejercicios baja de 36px de alto',
  v4.nBajos === 0 && v4.n > 5, JSON.stringify(v4));

// ══════════ V5 · EL FIX DE LA JERGA (v404) SIGUE EN PIE ══════════
await ev(`(()=>{CUR.loggedAs='client';CUR.clientId='cA';showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  document.getElementById('cn-today').classList.add('on');
  renderClientToday(DB.clients[0]);})()`);
await sleep(1000);
const v5 = await ev(`[...document.querySelectorAll('#cn-today-body .gm-ex-meta')].map(e=>e.textContent.trim())`);
const JERGA = /compuesto|aislamiento|bodyweight|peso_reps|isom[eé]trico/i;
check('V5 la línea del ejercicio sigue sin jerga y con el músculo escrito para humanos',
  Array.isArray(v5) && v5.length >= 2 && v5.every(t => !JERGA.test(t)) && v5.includes('Bíceps'),
  JSON.stringify(v5));

check('Sin errores JS en toda la verificación', jsErrors.length === 0, jsErrors.join(' | ').slice(0, 250));

console.log('\n──── VERIFICACIÓN ADVERSARIAL v404+v405 ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
