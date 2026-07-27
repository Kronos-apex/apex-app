// _audit-pantallas.mjs — FASE 2 DEL ESTUDIO DE INTERFAZ: recorrido ASERTIVO de las 12
// superficies (6 pestañas del asesorado + 6 paneles del coach), 2026-07-27.
//
// POR QUÉ EXISTE: la FASE 1 terminó descubriendo que v403 había roto «Perfil» del asesorado EN
// PRODUCCIÓN durante un día entero, y que el harness que abría esa pantalla era de SOLO CAPTURAS
// — seguía generando PNG de una pantalla rota. Nueve harnesses `_shot*` están en esa situación.
// Este recorrido es a la vez (a) el candado que faltaba y (b) la materia prima medida de la
// auditoría: nada de «se ve cargado», sino cuántos píxeles, cuántos toques pequeños y qué se sale.
//
// QUÉ MIDE por superficie, con datos de forma REAL (el fixture irreal fabricó un defecto falso
// en la FASE 1 — ver GOTCHAS VIGENTES):
//   1. ¿LANZA? — excepción no capturada al abrir la pantalla (el bug de v403).
//   2. ¿PINTA? — texto real dentro del panel (una pantalla viva no está vacía).
//   3. ¿SE SALE? — desbordamiento horizontal a 390px (mobile-first es innegociable).
//   4. ¿SE PUEDE TOCAR? — controles visibles con menos de 36px de alto o ancho.
//   5. ¿ALGUIEN LE ROBA EL TOQUE? — hit-testing contra la píldora «Instalar app».
//   6. ¿CUÁNTO HAY QUE BAJAR? — alto del contenido en pantallas de 844px.
// Y captura claro + oscuro de cada una para MIRARLAS (R2.6).
//
// Sin login ni red. 390×844. exit 1 si algo LANZA, no PINTA o SE SALE.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8829, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-fase2';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9349', '--user-data-dir=' + process.env.TEMP + '/fase2-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9349/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
// evx NO envuelve en try/catch: si la pantalla lanza, la excepción sube y queda registrada.
// Es exactamente lo que el harness de «Perfil» no hacía.
const evx = async e => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  return { value: r.result?.value, error: r.exceptionDetails ? (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : null };
};
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && typeof renderClientToday==='function'`);
await sleep(2000);

// ══════════ FIXTURE con la FORMA REAL del dato ══════════
// `type` = etiqueta del catálogo · `muscleLabel` presente en unos y ausente en otros (como en
// producción, donde 8 personas tienen rutinas viejas sin esa etiqueta).
const FIXTURE = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const ex=(id,n,m,lbl,t,s,r)=>{const e={id:id,name:n,muscle:m,type:t,sets:s,reps:r};if(lbl)e.muscleLabel=lbl;return e;};
  const rut=(id,n,d)=>({id:id,name:n,day:d,restSec:90,exercises:[
    ex('e1','Sentadilla','piernas','Cuádriceps y glúteo','Compuesto',4,'12'),
    ex('e2','Press de Banca con Barra','pecho','Pecho','Compuesto',4,'10'),
    ex('e3','Curl de Bíceps','biceps','','Aislamiento',3,'12'),
    ex('e4','Plancha','core','','Isométrico',3,'40')]});
  const _dk=off=>{const d=new Date();d.setDate(d.getDate()-off);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const ses=(cid,off,vol)=>{const d=new Date();d.setDate(d.getDate()-off);d.setHours(18,0,0,0);
    return {id:cid+'s'+off,sessionId:cid+'sid'+off,routineId:'r1',routineName:'Full body A',date:d.toISOString(),
      startedAt:d.toISOString(),finishedAt:d.toISOString(),totalVol:vol,doneSets:12,totalSets:12,
      exercises:[{name:'Sentadilla',muscle:'piernas',track:'peso_reps',sets:[{done:true,kg:'60',reps:'12'},{done:true,kg:'65',reps:'10'}]},
                 {name:'Press de Banca con Barra',muscle:'pecho',track:'peso_reps',sets:[{done:true,kg:'40',reps:'10'}]}]};};
  const cli={id:'cA',name:'Santiago Rivera',email:'santiago.rivera@gmail.com',goal:'Ganar músculo',level:'Intermedio',
    days:3,weight:78,height:176,age:29,sex:'M',phone:'3001234567',tier:'premium',
    notes:'Cuida la zona lumbar en peso muerto.',
    payments:[{date:'2026-06-15',dueDate:'2026-08-05',amount:120000,note:'Mensualidad julio'}],
    routines:[rut('r1','Full body A',hoy),rut('r2','Full body B','Miércoles'),rut('r3','Full body C','Viernes')],
    habits:{water:{[_dk(0)]:6,[_dk(1)]:8,[_dk(2)]:4,[_dk(3)]:8},steps:{[_dk(0)]:6200,[_dk(1)]:9100}}};
  const otro=(id,nm,due,sex,goal)=>({id,name:nm,email:nm.toLowerCase().replace(/ /g,'.')+'@gmail.com',goal,level:'Principiante',
    days:3,weight:70,height:170,age:31,sex,phone:'3009876543',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:due,amount:120000}],routines:[rut('r9','Full body A','Lunes')]});
  DB.clients=[cli, otro('cB','Andrea Molina','2026-07-16','F','Bajar de peso'), otro('cC','Julián Restrepo','2026-07-02','M','Fuerza')];
  DB.history={cA:[ses('cA',0,4800),ses('cA',2,4600),ses('cA',5,4400),ses('cA',7,4200),ses('cA',9,4000)],cB:[ses('cB',1,3200)]};
  DB.prs={cA:{e1:{name:'Sentadilla',kg:120,reps:5,date:'2026-07-20',val:120,unit:'kg'},e2:{name:'Press de Banca con Barra',kg:85,reps:5,date:'2026-07-10',val:85,unit:'kg'}}};
  DB.bodyweight={cA:[{date:_dk(0),kg:78.2},{date:_dk(7),kg:78.9},{date:_dk(14),kg:79.4}]};
  DB.msgs={cA:[{from:'coach',text:'¡Buen trabajo hoy Santiago!',date:new Date(Date.now()-5*3.6e6).toISOString()},
               {from:'client',text:'Gracias coach, me sentí fuerte 💪',date:new Date(Date.now()-3*3.6e6).toISOString()}],
           cB:[{from:'client',text:'Coach, me dolió un poco la rodilla en la sentadilla',date:new Date(Date.now()-2*3.6e6).toISOString()}]};
  DB.nutrition={cA:{water:8,kcal:2600,prot:160,carb:280,fat:80,meals:[{name:'Desayuno',items:'Huevos, avena, fruta'},{name:'Almuerzo',items:'Pollo, arroz, ensalada'}]}};
  DB.medidas={cA:[{date:_dk(0),cintura:82,pecho:100,brazo:36}]};
  DB.templates=[{id:'t1',name:'Full Body Principiante',tag:'Principiante',restSec:90,note:'Primeras 3 semanas.',
                 exercises:[ex('e1','Sentadilla','piernas','Cuádriceps y glúteo','Compuesto',3,'12')]},
                {id:'t2',name:'Empuje — Hipertrofia',tag:'Intermedio',restSec:75,
                 exercises:[ex('e2','Press de Banca con Barra','pecho','Pecho','Compuesto',4,'10')]}];
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  // La píldora, en el estado REAL de quien no ha instalado la app.
  const b=document.getElementById('install-banner'); if(b){b.classList.remove('hide');b.style.display='flex';}
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;
const fx = await ev(FIXTURE);
if (fx !== 'ok') { console.log('❌ fixture:', fx); process.exit(1); }

// ══════════ LA MEDICIÓN (una por superficie) ══════════
const MEDIR = sel => `(()=>{
  const p=document.querySelector('${sel}'); if(!p) return {falta:true};
  const vw=390, vh=innerHeight;
  const txt=(p.innerText||'').replace(/\\s+/g,' ').trim();
  // Desbordamiento horizontal REAL: se salen del ancho del teléfono y NO viven dentro de un
  // carrusel horizontal. (Ojo: .mquick —las respuestas rápidas del chat— es overflow-x:auto
  // a propósito; contarlo como defecto fue un falso positivo de la primera corrida.)
  const enScroller=el=>{
    for(let n=el.parentElement;n&&n!==document.body;n=n.parentElement){
      const ox=getComputedStyle(n).overflowX;
      if(ox==='auto'||ox==='scroll') return true;
    }
    return false;
  };
  const fuera=[];
  p.querySelectorAll('*').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1) return;
    if(r.right>vw+1||r.left<-1){
      const cs=getComputedStyle(el);
      if(cs.position==='fixed') return;                       // los flotantes se miden aparte
      if(enScroller(el)) return;                              // carrusel horizontal = por diseño
      fuera.push({t:(el.className||el.tagName||'').toString().slice(0,34),r:Math.round(r.right),l:Math.round(r.left)});
    }
  });
  // Toques pequeños: controles VISIBLES por debajo de 36px (regla del proyecto).
  // OJO: se mide el área EFECTIVA con hit-testing, no la caja del elemento. La primitiva
  // .hit40 (avi-v332) agranda la zona táctil con un ::after de 40px sin cambiar el tamaño
  // visual — medir el rect a secas la ignora y denuncia botones que sí se pueden tocar
  // (pasó en la primera corrida con la ✕ de «Eliminar registro de peso», 11×14 pero con
  // .hit40). Misma lección que el falso peso_reps de la FASE 1: medir lo que importa.
  const chicos=[];
  p.querySelectorAll('button,input,select,textarea,a[href],[role="button"]').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1) return;
    if(getComputedStyle(el).visibility==='hidden') return;
    if(r.height>=36&&r.width>=36) return;
    // Solo se mide lo que está CÓMODAMENTE dentro de la pantalla: cerca del borde los puntos de
    // prueba caen fuera del viewport o sobre la cabecera fija y devuelven un falso «no responde»
    // (pasó con la ✕ de peso y con «Ver mi plan en grande», que centradas responden perfecto).
    if(r.top<24||r.bottom>innerHeight-24) return;
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const toca=(x,y)=>{const t=document.elementFromPoint(Math.round(x),Math.round(y)); return !!(t&&(t===el||el.contains(t)));};
    // alcance() se mide DESDE EL CENTRO, así que ya incluye la mitad del propio botón: sumarle
    // r.height contaba el elemento dos veces (un botón de 27px daba 53 y pasaba el filtro).
    // El alto efectivo es alcance-arriba + alcance-abajo + el píxel del centro.
    const alcance=(dx,dy)=>{let d=0; for(let i=1;i<=22;i++){ if(toca(cx+dx*i,cy+dy*i)) d=i; else break; } return d;};
    const hEf=alcance(0,-1)+alcance(0,1)+1;
    const wEf=alcance(-1,0)+alcance(1,0)+1;
    if(hEf<36||wEf<36){
      chicos.push({t:((el.getAttribute('aria-label')||el.textContent||el.className||'').toString().trim().slice(0,26)),
                   w:Math.round(r.width),h:Math.round(r.height),wEf:Math.round(wEf),hEf:Math.round(hEf)});
    }
  });
  // ¿La píldora «Instalar app» le roba el toque a algo de esta pantalla?
  const pill=document.getElementById('install-banner');
  const dentro=el=>{ for(let n=el;n;n=n.parentElement){ if(n.id==='install-banner') return true; } return false; };
  const robados=[];
  if(pill&&getComputedStyle(pill).visibility!=='hidden'){
    p.querySelectorAll('input,button,select,textarea').forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.width<2||r.height<2||r.bottom<0||r.top>vh) return;
      const top=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
      if(top&&dentro(top)) robados.push((el.getAttribute('aria-label')||el.textContent||el.className||'').toString().trim().slice(0,24));
    });
  }
  const sc=p.closest('.cnbody')||p.parentElement;
  return {txt:txt.length, alto:Math.round(p.scrollHeight||0), visible:Math.round(sc?sc.clientHeight:vh),
          fuera:fuera.slice(0,6), nFuera:fuera.length, chicos:chicos, nChicos:chicos.length,
          robados:robados, primeras:txt.slice(0,90)};
})()`;

// El hit-testing solo funciona sobre lo que está EN PANTALLA, así que una sola medición al tope
// sub-reporta (la mayoría de los controles viven bajo el pliegue). Se recorre la pantalla por
// tramos y se acumulan los hallazgos sin repetir. En pantallas larguísimas (la biblioteca de
// ejercicios mide 30.000px) esto es un MUESTREO, y así se reporta — no una lista exhaustiva.
const TRAMOS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const scrollA = frac => `(()=>{const p=document.querySelector('#s-client .cnbody')||document.querySelector('.main')||document.scrollingElement;
  if(p)p.scrollTop=(p.scrollHeight-p.clientHeight)*${frac}; window.scrollTo(0,(document.body.scrollHeight-innerHeight)*${frac}); return true;})()`;

const filas = [];
async function auditar(nombre, sel, abrir) {
  const r = await evx(abrir);
  await sleep(900);
  const m = await ev(MEDIR(sel));
  // Barrido de toques pequeños por tramos.
  const vistos = new Map();
  for (const frac of TRAMOS) {
    await ev(scrollA(frac)); await sleep(320);
    const parcial = await ev(MEDIR(sel));
    (parcial.chicos || []).forEach(c => { const k = c.t + '|' + c.w + 'x' + c.h; if (!vistos.has(k)) vistos.set(k, c); });
  }
  await ev(scrollA(0)); await sleep(300);
  m.chicos = [...vistos.values()];
  m.nChicos = m.chicos.length;
  const pantallas = m.visible ? (m.alto / m.visible) : 0;
  filas.push({ nombre, sel, lanza: r.error, ...m, pantallas: Math.round(pantallas * 10) / 10 });
  for (const tema of ['light', 'dark']) {
    await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(350);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${OUT}/${nombre}-${tema}.png`, Buffer.from(s.data, 'base64'));
  }
  await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(250);
  const f = filas[filas.length - 1];
  console.log(`  ${f.lanza ? '🔴' : '  '} ${nombre.padEnd(22)} txt:${String(f.txt).padStart(5)}  alto:${String(f.alto).padStart(5)}px (${f.pantallas} pantallas)  fuera:${f.nFuera}  toques<36:${f.nChicos}  robados:${f.robados.length}${f.lanza ? '  LANZA: ' + String(f.lanza).slice(0, 60) : ''}`);
}

// ══════════ 1) LAS 6 PESTAÑAS DEL ASESORADO ══════════
console.log('\n── ASESORADO ──');
await ev(`(()=>{CUR.clientId='cA';CUR.loggedAs='client';showScreen('s-client');
  if(typeof initClientView==='function')initClientView(DB.clients[0]);
  if(typeof ntClose==='function')ntClose(false);})()`);
await sleep(1500);
// El asistente de datos (#data-ob) se abre encima al entrar y CONTAMINA la medición de las
// pestañas (la primera corrida midió con él tapando la pantalla). Se cierra antes de medir…
// pero se AUDITA aparte más abajo: es lo primero que ve alguien nuevo.
await ev(`(()=>{const el=document.getElementById('data-ob'); if(el)el.classList.remove('on');
  const ob=document.getElementById('onboarding'); if(ob)ob.style.display='none';})()`);
await sleep(400);
const TABS = [
  ['a1-hoy', '#cn-today', 0], ['a2-rutinas', '#cn-routines', 1], ['a3-mensajes', '#cn-messages', 2],
  ['a4-progreso', '#cn-history', 3], ['a5-perfil', '#cn-profile', 4], ['a6-comunidad', '#cn-community', 5]
];
for (const [nombre, sel, i] of TABS) {
  await auditar(nombre, sel, `(()=>{const t=document.querySelectorAll('.cntab')[${i}]; t.click(); return t.textContent.trim();})()`);
}

// ══════════ 2) LOS 6 PANELES DEL COACH ══════════
console.log('\n── COACH ──');
await ev(`(()=>{CUR.loggedAs='coach';showScreen('s-coach');if(typeof renderAll==='function')renderAll();})()`);
await sleep(1200);
const PANELES = [
  ['c1-inicio', '#p-home', `gp('p-home',document.getElementById('sbi-home'),'Inicio');renderHome();`],
  ['c2-asesorados', '#p-clients', `gp('p-clients',document.getElementById('sbi-clients'),'Asesorados');renderClients();`],
  ['c3-ficha', '#p-detail', `openDetail('cA');`],
  ['c4-plantillas', '#p-templates', `gp('p-templates',document.getElementById('sbi-templates'),'Plantillas');renderTemplates();`],
  ['c5-ejercicios', '#p-exercises', `gp('p-exercises',document.getElementById('sbi-exercises'),'Ejercicios');renderExercises();`],
  ['c6-mensajes', '#p-msgs', `gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes');renderMsgs();`]
];
for (const [nombre, sel, abrir] of PANELES) await auditar(nombre, sel, abrir);

// ══════════ 3) LO QUE SE ABRE ENCIMA (asistente, tour y modales) ══════════
// La píldora «Instalar app» vive en z-index 8000; los modales están en 1000, el asistente de
// datos en 900 y el tour en 800 → flota por ENCIMA de todos. Aquí se mide si eso le roba el
// toque a sus botones principales.
console.log('\n── ENCIMA (overlays) ──');
const ROBA_EN = sel => `(()=>{
  const p=document.querySelector('${sel}'); if(!p) return {falta:true};
  const pill=document.getElementById('install-banner');
  if(!pill||getComputedStyle(pill).visibility==='hidden'||getComputedStyle(pill).display==='none') return {robados:[],pildoraOculta:true};
  const dentro=el=>{ for(let n=el;n;n=n.parentElement){ if(n.id==='install-banner') return true; } return false; };
  const robados=[];
  p.querySelectorAll('button,input,select,textarea,a[href]').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight) return;
    const top=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
    if(top&&dentro(top)) robados.push((el.getAttribute('aria-label')||el.textContent||el.className||'').toString().trim().slice(0,30));
  });
  return {robados, pildoraOculta:false};
})()`;
const overlays = [];
async function auditarOverlay(nombre, sel, abrir) {
  await ev(abrir); await sleep(800);
  const r = await ev(ROBA_EN(sel));
  overlays.push({ nombre, ...r });
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/o-${nombre}.png`, Buffer.from(s.data, 'base64'));
  console.log(`  ${r.robados && r.robados.length ? '🔴' : '  '} ${nombre.padEnd(22)} píldora ${r.pildoraOculta ? 'oculta (bien)' : 'VISIBLE'} · robados: ${JSON.stringify(r.robados || [])}`);
}
await ev(`(()=>{CUR.clientId='cA';CUR.loggedAs='client';showScreen('s-client');})()`); await sleep(500);
await auditarOverlay('asistente-datos', '#data-ob', `(()=>{if(typeof showDataOnboarding==='function')showDataOnboarding('cA');})()`);
await ev(`(()=>{const el=document.getElementById('data-ob'); if(el)el.classList.remove('on');})()`); await sleep(300);
await auditarOverlay('modal-nutricion', '#m-nut', `(()=>{const m=document.getElementById('m-nut'); if(m){m.style.display='flex';}})()`);
await ev(`(()=>{const m=document.getElementById('m-nut'); if(m)m.style.display='';})()`); await sleep(300);
await auditarOverlay('tour-educativo', '#onboarding', `(()=>{if(typeof showOnboarding==='function')showOnboarding('cA');})()`);
await ev(`(()=>{const ob=document.getElementById('onboarding'); if(ob)ob.style.display='none';})()`); await sleep(300);

// ══════════ VEREDICTO ══════════
const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const lanzan = filas.filter(f => f.lanza);
const vacias = filas.filter(f => !f.lanza && f.txt < 40);
const desbordan = filas.filter(f => f.nFuera > 0);
const roban = filas.filter(f => f.robados.length > 0);

check('Ninguna de las 12 pantallas LANZA al abrirse', lanzan.length === 0,
  lanzan.map(f => f.nombre + ': ' + String(f.lanza).slice(0, 70)).join(' | '));
check('Ninguna de las 12 pantallas se queda VACÍA', vacias.length === 0,
  vacias.map(f => f.nombre + ' (' + f.txt + ' car.)').join(' | '));
check('Nada se sale del ancho del teléfono (390px)', desbordan.length === 0,
  desbordan.map(f => f.nombre + ': ' + f.nFuera + ' → ' + JSON.stringify(f.fuera.slice(0, 2))).join(' | '));
check('La píldora «Instalar app» no le roba el toque a ninguna pantalla', roban.length === 0,
  roban.map(f => f.nombre + ': ' + JSON.stringify(f.robados)).join(' | '));
const robanOv = overlays.filter(o => (o.robados || []).length > 0);
check('Tampoco le roba el toque a lo que se abre ENCIMA (asistente, modales, tour)', robanOv.length === 0,
  robanOv.map(o => o.nombre + ': ' + JSON.stringify(o.robados)).join(' | '));

console.log('\n──── TABLA DE LA AUDITORÍA (FASE 2) ────');
console.log('pantalla                 texto   alto   pantallas  fuera  toques<36  roba');
filas.forEach(f => console.log(
  '  ' + f.nombre.padEnd(22) + String(f.txt).padStart(6) + String(f.alto).padStart(7) +
  String(f.pantallas).padStart(10) + String(f.nFuera).padStart(7) + String(f.nChicos).padStart(10) +
  String(f.robados.length).padStart(7)));
console.log('\n  detalle de toques pequeños:');
filas.filter(f => f.nChicos).forEach(f => console.log('   ' + f.nombre + ': ' + JSON.stringify(f.chicos)));

console.log('\n──── VEREDICTO ────');
results.forEach(r => console.log('  ' + r));
check('Sin errores JS sueltos en todo el recorrido', jsErrors.length === 0, jsErrors.join(' | ').slice(0, 300));
console.log('  ' + results[results.length - 1]);
const failed = results.filter(r => r.startsWith('❌'));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('  capturas en:', OUT);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
