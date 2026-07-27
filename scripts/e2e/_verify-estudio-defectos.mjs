// _verify-estudio-defectos.mjs — LOS 3 DEFECTOS DEL §2 DEL ESTUDIO DE INTERFAZ (2026-07-27).
//
// 1) JERGA: bajo el nombre del ejercicio el asesorado leía «pecho · Compuesto», y 8 personas
//    con rutinas viejas (medido en prod: 163 ejercicios sin `muscleLabel`) leían el slug crudo
//    sin tilde: «biceps», «gluteo». Ahora se ve SOLO el músculo, bien escrito.
//    (El `peso_reps` que denunciaba el estudio NO existe en datos reales: salía del fixture
//     de los propios harnesses, que metían el *track* en el campo `type`. Corregidos.)
// 2) PÍLDORA: «Instalar app» no tapaba los campos — se quedaba con el TOQUE. Medido con
//    hit-testing: se paraba sobre KG/REPS de una serie. Ahora se aparta mientras el entreno
//    está en pantalla, y SOLO mientras eso pasa (instalar es el problema nº1 de adopción).
// 3) JERARQUÍA: en «Rutinas» el botón más llamativo era «+ Nueva rutina», verde y encima del
//    plan que el coach ya armó. Ahora es secundario y va al final.
//
// Sin login ni red. 390×844, claro y oscuro. Afirma con exit 1.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8827, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-defectos';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9347', '--user-data-dir=' + process.env.TEMP + '/defectos-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9347/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function'`);
await sleep(1800);

// FIXTURE CON LA FORMA REAL DEL DATO (`type` = etiqueta del catálogo, NO el track):
//  · e1/e2 traen `muscleLabel` como los ejercicios del catálogo vivo.
//  · e3 NO lo trae y su músculo es el slug 'biceps' — la forma exacta que tienen en producción
//    las rutinas de esas 8 personas. Es el caso que antes se leía «biceps · Aislamiento».
const SETUP = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const client={id:'nuevo',name:'Santiago',sex:'M',level:'Principiante',goal:'Bajar de peso',days:3,
    createdAt:new Date().toISOString(),
    routines:[{id:'r1',name:'Full body A',day:hoy,restSec:90,exercises:[
      {id:'e1',name:'Sentadilla',muscle:'piernas',muscleLabel:'Cuádriceps y glúteo',type:'Compuesto',sets:3,reps:'12'},
      {id:'e2',name:'Press de Banca con Barra',muscle:'pecho',muscleLabel:'Pecho',type:'Compuesto',sets:3,reps:'10'},
      {id:'e3',name:'Curl de Bíceps',muscle:'biceps',type:'Aislamiento',sets:3,reps:'12'},
      {id:'e4',name:'Plancha',muscle:'core',type:'Isométrico',sets:3,reps:'30'}]},
      {id:'r2',name:'Full body B',day:'Miércoles',restSec:90,exercises:[
      {id:'e5',name:'Peso Muerto',muscle:'espalda',type:'Compuesto',sets:3,reps:'10'}]}],
    habits:{water:{},steps:{}}};
  DB.clients=[client]; DB.history={nuevo:[]}; DB.prs={}; DB.bodyweight={};
  CUR.clientId='nuevo'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  document.getElementById('cn-today').classList.add('on');
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  // Estado REAL de quien no ha instalado la app (los 8 del gimnasio que nunca entrenaron).
  const b=document.getElementById('install-banner'); if(b){b.classList.remove('hide');b.style.display='flex';}
  if(typeof window._aviPillGuard==='function')window._aviPillGuard();
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;
const setup = await ev(SETUP);
if (setup !== 'ok') { console.log('❌ setup falló:', setup); process.exit(1); }
await sleep(800);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
async function shot(name, tema) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}-${tema}.png`, Buffer.from(r.data, 'base64'));
}

// ══════════ 1 · JERGA ══════════
// El día 1 la portada tapa el entreno: se pulsa su única salida, como haría la persona.
await ev(`typeof firstRunGo==='function' && (firstRunGo(),1)`); await sleep(1400);

const metas = await ev(`(()=>[...document.querySelectorAll('#cn-today-body .gm-ex-meta')].map(e=>e.textContent.trim()))()`);
const JERGA = /compuesto|aislamiento|bodyweight|peso_reps|isom[eé]trico|funcional/i;
check('J1 la línea del ejercicio en el entreno no trae NADA de jerga técnica',
  Array.isArray(metas) && metas.length >= 3 && metas.every(t => !JERGA.test(t)),
  JSON.stringify(metas));

check('J2 la etiqueta del catálogo manda cuando existe',
  Array.isArray(metas) && metas[0] === 'Cuádriceps y glúteo', JSON.stringify(metas[0]));

// El caso de las 8 personas: rutina vieja sin `muscleLabel`, slug crudo 'biceps'.
check('J3 sin etiqueta de catálogo el slug se escribe como lo lee una persona («Bíceps», no «biceps»)',
  Array.isArray(metas) && metas[2] === 'Bíceps', JSON.stringify(metas[2]));

// La MISMA regla en «Rutinas» (otra superficie del asesorado, mismo defecto).
await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Rutinas/.test(x.textContent)); if(t)t.click();})()`); await sleep(800);
await ev(`(()=>{const h=document.querySelector('#cn-routines .rc .rch'); if(h)h.click();})()`); await sleep(500);
const metasRut = await ev(`(()=>[...document.querySelectorAll('#cn-routines .exmet')].map(e=>e.textContent.trim()))()`);
check('J4 en «Rutinas» tampoco queda jerga (misma regla, otra superficie)',
  Array.isArray(metasRut) && metasRut.length > 0 && metasRut.every(t => !JERGA.test(t)),
  JSON.stringify(metasRut.slice(0, 3)));

// ══════════ 3 · JERARQUÍA EN «RUTINAS» ══════════
const jer = await ev(`(()=>{
  const con=document.getElementById('cn-all-rut');
  const btns=[...con.querySelectorAll(':scope > button')].map(b=>({txt:b.textContent.trim(),cls:b.className,top:Math.round(b.getBoundingClientRect().top)}));
  const nueva=btns.find(b=>/Nueva rutina/i.test(b.txt));
  const tarjeta=con.querySelector('.rc');
  return {nueva:nueva||null, hayTarjetas:!!tarjeta,
          topTarjeta:tarjeta?Math.round(tarjeta.getBoundingClientRect().top):null};
})()`);
check('R1 «+ Nueva rutina» ya no es el botón principal (no es .bp)',
  !!jer.nueva && !/\bbp\b/.test(jer.nueva.cls), JSON.stringify(jer.nueva));
check('R2 «+ Nueva rutina» va DESPUÉS del plan, no encima',
  !!jer.nueva && jer.hayTarjetas && jer.nueva.top > jer.topTarjeta,
  JSON.stringify({ btn: jer.nueva && jer.nueva.top, tarjeta: jer.topTarjeta }));
await shot('rutinas', 'light');

// ══════════ 2 · LA PÍLDORA NO SE QUEDA CON LOS TOQUES ══════════
await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Hoy/.test(x.textContent)); if(t)t.click();})()`); await sleep(700);
await ev(`typeof firstRunGo==='function' && (firstRunGo(),1)`); await sleep(1200);

const HIT_EN = zona => `(()=>{
  const dentro=el=>{ for(let n=el;n;n=n.parentElement){ if(n.id==='install-banner') return true; } return false; };
  const robados=[]; let mirados=0;
  document.querySelectorAll('${zona} input, ${zona} button, ${zona} .btn').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight) return;
    mirados++;
    const top=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
    if(top&&dentro(top)) robados.push((el.className||'')+'|'+(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,24));
  });
  const p=document.getElementById('install-banner');
  return {mirados, robados, oculta:!!(p&&getComputedStyle(p).visibility==='hidden'),
          clase:document.body.classList.contains('avi-train-onscreen')};
})()`;
const HIT = HIT_EN('#cn-today');

let totalMirados = 0, totalRobados = [];
for (const frac of [0, 0.35, 0.6, 0.9]) {
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody'); if(b)b.scrollTop=b.scrollHeight*${frac};})()`);
  await sleep(450);
  await ev(`typeof window._aviPillGuard==='function' && (window._aviPillGuard(),1)`); await sleep(150);
  const r = await ev(HIT);
  totalMirados += r.mirados; totalRobados = totalRobados.concat(r.robados);
  if (frac === 0.35) await shot('entreno', 'light');
  if (frac === 0.35) await shot('entreno', 'dark');
}
check('P1 con el entreno en pantalla la píldora NO se queda con ningún toque',
  totalRobados.length === 0 && totalMirados > 20,
  JSON.stringify({ controles: totalMirados, robados: totalRobados }));

// La MISMA clase de defecto en «Rutinas»: la píldora se paraba sobre «Hacer esta rutina ahora».
await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Rutinas/.test(x.textContent)); if(t)t.click();})()`); await sleep(800);
await ev(`(()=>{const h=document.querySelector('#cn-routines .rc .rch'); if(h)h.click();})()`); await sleep(600);
// OJO: aquí NO se llama a `_aviPillGuard` a mano. Desplegar la tarjeta es un TOQUE, no un
// scroll, y la app tiene que reaccionar sola — la primera versión no lo hacía y la píldora se
// quedaba encima de «Hacer esta rutina ahora» hasta que la persona moviera la pantalla.
let rutRobados = [], rutMirados = 0;
await sleep(700);                       // deja terminar la animación de despliegue
const rut0 = await ev(HIT_EN('#cn-routines'));
rutMirados += rut0.mirados; rutRobados = rutRobados.concat(rut0.robados);
await shot('rutinas-desplegada', 'light');
for (const frac of [0.3, 0.65, 1]) {
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody'); if(b)b.scrollTop=b.scrollHeight*${frac};})()`);
  await sleep(500);
  const r = await ev(HIT_EN('#cn-routines'));
  rutMirados += r.mirados; rutRobados = rutRobados.concat(r.robados);
}
check('P4 en «Rutinas» tampoco se queda con el toque de «Hacer esta rutina ahora»',
  rutRobados.length === 0 && rutMirados > 5, JSON.stringify({ controles: rutMirados, robados: rutRobados }));

// Y NO la matamos: fuera del entreno tiene que seguir ahí (instalar = problema nº1).
await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Perfil/.test(x.textContent)); if(t)t.click();})()`); await sleep(700);
await ev(`typeof window._aviPillGuard==='function' && (window._aviPillGuard(),1)`); await sleep(200);
const fuera = await ev(`(()=>{const p=document.getElementById('install-banner');const cs=getComputedStyle(p);
  return {visibility:cs.visibility, display:cs.display, clase:document.body.classList.contains('avi-train-onscreen')};})()`);
check('P2 fuera del entreno la píldora sigue visible (no la matamos)',
  fuera.visibility !== 'hidden' && fuera.display !== 'none' && fuera.clase === false, JSON.stringify(fuera));

// Y vuelve a apartarse al regresar al entreno (ida y vuelta, no un apagón de una vía).
await ev(`(()=>{const t=[...document.querySelectorAll('.cntab')].find(x=>/Hoy/.test(x.textContent)); if(t)t.click();})()`); await sleep(700);
await ev(`(()=>{const b=document.querySelector('#s-client .cnbody'); if(b)b.scrollTop=b.scrollHeight*0.4;})()`); await sleep(400);
await ev(`typeof window._aviPillGuard==='function' && (window._aviPillGuard(),1)`); await sleep(200);
const vuelta = await ev(HIT);
check('P3 al volver al entreno se aparta otra vez (la regla es de ida y vuelta)',
  vuelta.robados.length === 0 && vuelta.clase === true, JSON.stringify(vuelta));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── 3 DEFECTOS DEL ESTUDIO DE INTERFAZ ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('  capturas en:', OUT);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
