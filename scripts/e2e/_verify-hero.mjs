// _verify-hero.mjs — EL HÉROE DE «HOY» (dirección B «El Compromiso», avi-v503).
// El PO eligió B de cuatro columnas puestas lado a lado: el día tiene UNA promesa. El saludo,
// la racha y el arranque del entreno se funden en una superficie esmeralda a sangre.
//
// Este harness existe porque el héroe TAPA la primera pantalla: si se pinta cuando no debe,
// le esconde a alguien su propio entreno. Prueba los estados NO felices uno por uno (sesión en
// curso, descanso, ya entrenaste, sin plan, día 1, rutina vacía), mide el contraste de su
// tinta contra el extremo MÁS CLARO de su propio degradado —leído del DOM, no de mi cabeza— y
// mide cuánto ocupa a 360, a 390 y con letra grande.
// Sin login ni red. Capturas en claro y oscuro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8827, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-hero';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9347', '--user-data-dir=' + process.env.TEMP + '/hero-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9347/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const evj = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
const viewport = async (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
await viewport(390, 844);
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(1800);

// Asesorada REAL: 6 ejercicios (la moda del backup del 19-ago), nombre de rutina largo,
// historial con sesiones viejas (NO es día 1) y nada entrenado hoy → el entreno llega colapsado.
const MONTAR = `((exN, nombreRutina, conHistorial) => {try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const EJ=['Sentadilla con Barra','Hip Thrust','Peso Muerto Rumano','Prensa Inclinada',
            'Extensión de Tríceps con Cuerda en Polea','Abducción de Cadera en Máquina',
            'Curl Femoral','Zancadas con Mancuernas'];
  const exs=[];for(let i=0;i<exN;i++)exs.push({id:'e'+i,name:EJ[i%EJ.length],muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'});
  const client={id:'hero',name:'Nataly Ospina',sex:'F',level:'Intermedio',goal:'Ganar músculo',days:4,
    createdAt:'2026-05-01T10:00:00.000Z',
    routines:[
      {id:'r1',name:nombreRutina,day:hoy,restSec:90,exercises:exs},
      {id:'r2',name:'Tren Superior',day:'Miércoles',restSec:90,exercises:exs.slice(0,4)}
    ],
    habits:{water:{},steps:{}}};
  const hist=[];
  if(conHistorial){ for(let i=1;i<=6;i++){ const d=new Date(Date.now()-i*86400000*2).toISOString();
    hist.push({id:'h'+i,sessionId:'s'+i,routineId:'r1',routineName:nombreRutina,date:d,finishedAt:d,doneSets:24,totalSets:24,exercises:[]}); } }
  DB.clients=[client]; DB.history={hero:hist}; DB.prs={}; DB.bodyweight={};
  CUR.clientId='hero'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})`;

const montar = async (exN = 6, nombre = 'Pierna y glúteo', conHist = true) => {
  const r = await ev(`${MONTAR}(${exN},${JSON.stringify(nombre)},${conHist})`);
  if (String(r).startsWith('err:')) throw new Error('montaje: ' + r);
  await sleep(700);
};

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

async function shot(name, tema) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(320);
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody'); if(b)b.scrollTop=0;})()`);
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}-${tema}.png`, Buffer.from(r.data, 'base64'));
}

// Estado del héroe leído del DOM, no supuesto.
const HERO = `(()=>{const head=document.getElementById('cn-today-head');
  const h=document.querySelector('#cn-today-head .tod-hero');
  const body=document.getElementById('cn-today-body');
  const cta=h?h.querySelector('.tod-hero-cta'):null, alt=h?h.querySelector('.tod-hero-alt'):null;
  const rh=h?h.getBoundingClientRect():null, rc=cta?cta.getBoundingClientRect():null, ra=alt?alt.getBoundingClientRect():null;
  const panel=document.getElementById('cn-today'); const rp=panel?panel.getBoundingClientRect():null;
  return {hero:!!h, heroOn:!!(head&&head.classList.contains('hero-on')),
    saludo:!!(h&&h.querySelector('.today-greet .tg-name')), racha:!!(h&&h.querySelector('.streak-chip')),
    rachaSvg:!!(h&&h.querySelector('.streak-chip svg.avic')),
    titulo:h?(h.querySelector('.tod-hero-t')||{}).textContent:'', size:h?(h.querySelector('.tod-hero-t')||{}).getAttribute('data-size'):null,
    meta:h?(h.querySelector('.tod-hero-m')||{}).textContent:'',
    filas:h?h.querySelectorAll('.tod-hero-list .thl').length:0,
    more:h?(h.querySelector('.thl-more')||{textContent:''}).textContent.trim():'',
    doses:h?[...h.querySelectorAll('.thl-d')].map(x=>x.textContent):[],
    bodyLen:body?body.innerHTML.trim().length:-1,
    startCard:!!document.querySelector('#cn-today-body .start-card'),
    guiado:!!document.querySelector('#cn-today-body .gm-body, #cn-today-body #guided-mode'),
    altoHero:rh?Math.round(rh.height):0, anchoHero:rh?Math.round(rh.width):0, anchoPanel:rp?Math.round(rp.width):0,
    topHero:rh?Math.round(rh.top):0,
    ctaAlto:rc?Math.round(rc.height):0, altAlto:ra?Math.round(ra.height):0,
    ctaBottom:rc?Math.round(rc.bottom):0,
    desborde:Math.round(document.documentElement.scrollWidth-document.documentElement.clientWidth)};})()`;

// ══════════ H1 · el héroe se pinta y FUNDE los tres bloques ══════════
console.log('  montaje base (6 ejercicios, con historial):');
await montar(6);
let s = await evj(HERO);
check('H1 el héroe se pinta y funde saludo + racha + arranque del entreno',
  s.hero && s.heroOn && s.saludo && s.racha && /Pierna y glúteo/.test(s.titulo) && s.filas === 6,
  JSON.stringify({ filas: s.filas, titulo: s.titulo.trim(), meta: s.meta.trim() }));
check('H1-bis el cuerpo del entreno queda VACÍO (el héroe es el arranque, no un duplicado)',
  s.bodyLen === 0 && !s.startCard, JSON.stringify({ bodyLen: s.bodyLen, startCard: s.startCard }));
check('H1-ter el chip de racha sigue siendo SVG (no emoji) dentro del héroe', s.rachaSvg === true, JSON.stringify({ svg: s.rachaSvg }));
check('H1-quater el héroe va A SANGRE (ocupa el ancho del panel, sin margen lateral)',
  s.anchoHero === s.anchoPanel && s.anchoHero > 0 && s.desborde === 0,
  JSON.stringify({ hero: s.anchoHero, panel: s.anchoPanel, desborde: s.desborde }));
check('H1-v táctil: el CTA ≥44 px y el enlace secundario ≥36 px',
  s.ctaAlto >= 44 && s.altAlto >= 36, JSON.stringify({ cta: s.ctaAlto, alt: s.altAlto }));
await shot('1-hero', 'light'); await shot('1-hero', 'dark');
const alto390 = s.altoHero, ctaBottom390 = s.ctaBottom;

// ══════════ H2 · EL CANDADO (clase v367/v447): sesión EN CURSO ══════════
// Alguien va en la serie 3. El héroe NO puede pintarse encima: le esconde su propio entreno.
await ev(`(()=>{const c=DB.clients[0];localStorage.setItem(getDoneKey(c.routines[0].id,0,0),'1');renderClientToday(c);})()`);
await sleep(900);
s = await evj(HERO);
check('🔴 H2 (clase v367) con una serie ya marcada el héroe NO se pinta y el entreno SÍ',
  s.hero === false && s.heroOn === false && s.bodyLen > 200,
  JSON.stringify({ hero: s.hero, heroOn: s.heroOn, bodyLen: s.bodyLen }));
check('H2-bis apagado el héroe, el saludo clásico vuelve a su sitio',
  await ev(`!!document.querySelector('#cn-today-head .today-greet .tg-name')`), '');
await shot('2-sesion-en-curso', 'light');

// ══════════ H3 · día de DESCANSO ══════════
await montar(6);
await ev(`(()=>{const c=DB.clients[0];c.routines=c.routines.map(r=>Object.assign({},r,{day:'Miércoles'}));
  const d=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()];
  if(d==='Miércoles')c.routines=c.routines.map(r=>Object.assign({},r,{day:'Jueves'}));
  renderClientToday(c);})()`);
await sleep(800);
s = await evj(HERO);
check('H3 en día de DESCANSO no hay héroe (no se inventa un entreno que no existe)',
  s.hero === false && s.heroOn === false, JSON.stringify({ hero: s.hero }));

// ══════════ H4 · «ya entrenaste hoy» ══════════
await montar(6);
await ev(`(()=>{const c=DB.clients[0];const hoy=new Date().toISOString();
  DB.history.hero.unshift({id:'hoy',sessionId:'sh',routineId:'r1',routineName:'Pierna y glúteo',date:hoy,finishedAt:hoy,doneSets:24,totalSets:24,exercises:[]});
  renderClientToday(c);})()`);
await sleep(800);
s = await evj(HERO);
const trained = await ev(`!!document.querySelector('#cn-today-body .trained-card')`);
check('H4 si ya entrenó hoy manda la tarjeta «ya entrenaste», no el héroe',
  s.hero === false && trained === true, JSON.stringify({ hero: s.hero, trainedCard: trained }));

// ══════════ H5 · sin plan ══════════
await montar(6);
await ev(`(()=>{const c=DB.clients[0];c.routines=[];renderClientToday(c);})()`);
await sleep(800);
s = await evj(HERO);
check('H5 sin rutinas asignadas no hay héroe (queda el mensaje de plan en preparación)',
  s.hero === false && s.bodyLen > 100, JSON.stringify({ hero: s.hero, bodyLen: s.bodyLen }));

// ══════════ H6 · DÍA 1: manda la portada ══════════
// Quien nunca ha entrenado tiene su propia primera pantalla (variante C, PO 2026-07-26).
// Las dos no pueden ocupar la misma: la portada gana y el héroe se calla.
await montar(6, 'Pierna y glúteo', false);
s = await evj(HERO);
const fr = await ev(`!!(document.getElementById('cn-firstrun')||{innerHTML:''}).innerHTML.trim()`);
check('🔴 H6 el DÍA 1 manda: se pinta la portada y el héroe NO (no compiten por la pantalla)',
  s.hero === false && fr === true, JSON.stringify({ hero: s.hero, portada: fr }));
await shot('6-dia1', 'light');

// ══════════ H7 · 8 ejercicios: el tope se respeta y lo que sobra se DICE ══════════
await montar(8, 'Tren Superior — Espalda, Pecho y Hombros');
s = await evj(HERO);
check('H7 con 8 ejercicios lista 5 + «y 3 más» (nunca 8 filas en la portada)',
  s.filas === 6 && /y 3 ejercicios más/.test(s.more), JSON.stringify({ filas: s.filas, more: s.more }));
check('H7-bis el nombre de 40 caracteres baja de tamaño (no cuatro líneas a 34 px)',
  s.size === 'md', JSON.stringify({ size: s.size }));
check('H7-ter la meta NO promete «menos de una hora» en una rutina de 8 ejercicios',
  !/menos de una hora/.test(s.meta), JSON.stringify({ meta: s.meta.trim() }));
const alto390_8 = s.altoHero;
await shot('7-ocho-ejercicios', 'light');

// ══════════ H8 · CONTRASTE, medido contra su PROPIO degradado ══════════
// La superficie es un degradado: getComputedStyle no da un color de fondo. Se leen los topes
// del degradado DEL DOM y se mide contra el MÁS CLARO (el peor caso). Si el parseo falla, esto
// no puede salir verde con un ratio `undefined` — cada ratio se exige finito.
await montar(6);
const CONTRASTE = `(()=>{
  const h=document.querySelector('.tod-hero'); if(!h)return {err:'sin héroe'};
  const bg=getComputedStyle(h).backgroundImage||'';
  const stops=[...bg.matchAll(/rgba?\\(([^)]+)\\)/g)].map(m=>m[1].split(',').map(parseFloat)).filter(a=>a.length>=3);
  if(!stops.length)return {err:'degradado sin topes legibles: '+bg.slice(0,80)};
  const lin=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)};
  const lum=([r,g,b])=>.2126*lin(r)+.7152*lin(g)+.0722*lin(b);
  const claro=stops.slice().sort((a,b)=>lum(b)-lum(a))[0];
  const over=(fg,a,bgc)=>[0,1,2].map(i=>fg[i]*a+bgc[i]*(1-a));
  const ratio=(a,b)=>{const l1=Math.max(lum(a),lum(b)),l2=Math.min(lum(a),lum(b));return (l1+.05)/(l2+.05)};
  const medir=(sel,label)=>{const e=h.querySelector(sel); if(!e)return {label,err:'no existe '+sel};
    const cs=getComputedStyle(e); const m=(cs.color||'').match(/rgba?\\(([^)]+)\\)/);
    if(!m)return {label,err:'color ilegible: '+cs.color};
    const p=m[1].split(',').map(parseFloat); const a=p.length>3?p[3]:1;
    // El fondo del chip de racha es blanco translúcido SOBRE el degradado: se compone también.
    let base=claro.slice(0,3);
    const bc=(cs.backgroundColor||'').match(/rgba?\\(([^)]+)\\)/);
    if(bc){const q=bc[1].split(',').map(parseFloat); const ba=q.length>3?q[3]:1; if(ba>0)base=over(q.slice(0,3),ba,base);}
    const fg=over(p.slice(0,3),a,base);
    return {label, px:parseFloat(cs.fontSize), ratio:Math.round(ratio(fg,base)*100)/100};};
  return {stops:stops.length, claro:claro.slice(0,3).map(Math.round), medidas:[
    medir('.tod-hero-t','titular'), medir('.tod-hero-k','rótulo verde'), medir('.tod-hero-m','meta'),
    medir('.thl-x','ejercicio'), medir('.thl-d','dosis'), medir('.tod-hero-alt','enlace secundario'),
    medir('.today-greet .tg-name','nombre'), medir('.today-greet .tg-hi','saludo'),
    medir('.streak-chip','racha')]};})()`;
const ct = await evj(CONTRASTE);
const malas = (ct.medidas || []).filter(m => m.err || !isFinite(m.ratio) || m.ratio < 4.5);
check('H8 toda la tinta del héroe pasa 4,5:1 contra el tope MÁS CLARO de su degradado',
  !ct.err && (ct.medidas || []).length === 9 && malas.length === 0,
  ct.err || JSON.stringify(malas.length ? malas : (ct.medidas || []).map(m => m.label + ' ' + m.ratio)));
// El CTA es tinta oscura sobre --accent3 (color sólido, sí legible por computed style).
const ctaCt = await evj(`(()=>{const b=document.querySelector('.tod-hero-cta'); if(!b)return {err:'sin CTA'};
  const cs=getComputedStyle(b); const P=s=>{const m=(s||'').match(/rgba?\\(([^)]+)\\)/);return m?m[1].split(',').map(parseFloat):null};
  const fg=P(cs.color), bg=P(cs.backgroundColor); if(!fg||!bg)return {err:'colores ilegibles'};
  const lin=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)};
  const lum=a=>.2126*lin(a[0])+.7152*lin(a[1])+.0722*lin(a[2]);
  const l1=Math.max(lum(fg),lum(bg)),l2=Math.min(lum(fg),lum(bg));
  return {ratio:Math.round((l1+.05)/(l2+.05)*100)/100};})()`);
check('H8-bis el CTA «Empezar mi entreno» pasa 4,5:1 sobre el verde de acento',
  !ctaCt.err && isFinite(ctaCt.ratio) && ctaCt.ratio >= 4.5, JSON.stringify(ctaCt));

// ══════════ H9 · 360 px y LETRA GRANDE (clase v452: crecer y salirse) ══════════
await viewport(360, 640); await sleep(500);
await ev(`(()=>{const c=DB.clients[0];renderClientToday(c);})()`); await sleep(700);
s = await evj(HERO);
check('H9 a 360 px el héroe no desborda a lo ancho y sigue a sangre',
  s.desborde === 0 && s.anchoHero === s.anchoPanel && s.hero,
  JSON.stringify({ desborde: s.desborde, hero: s.anchoHero, panel: s.anchoPanel }));
const alto360 = s.altoHero, ctaBottom360 = s.ctaBottom;
await shot('9-360', 'light');

await ev(`(()=>{document.documentElement.setAttribute('data-fs','xl');const c=DB.clients[0];renderClientToday(c);})()`);
await sleep(800);
s = await evj(HERO);
check('🔴 H9-bis (clase v452) con LETRA GRANDE nada se sale a lo ancho ni se recorta',
  s.desborde === 0 && s.hero && s.ctaAlto >= 44,
  JSON.stringify({ desborde: s.desborde, alto: s.altoHero, cta: s.ctaAlto }));
const altoXL = s.altoHero;
await shot('9-360-xl', 'light');
await ev(`document.documentElement.removeAttribute('data-fs')`);
await viewport(390, 844); await sleep(400);

// ══════════ H10 · rutina VACÍA: degrada a la tarjeta de arranque, no a un héroe hueco ══════════
await montar(6);
await ev(`(()=>{const c=DB.clients[0];c.routines[0].exercises=[];CUR.todayWorking=null;renderClientToday(c);})()`);
await sleep(800);
s = await evj(HERO);
check('H10 rutina SIN ejercicios → no hay héroe hueco; queda la tarjeta de arranque',
  s.hero === false && s.startCard === true, JSON.stringify({ hero: s.hero, startCard: s.startCard }));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

// ══════════ LA MEDIDA (no es aserción: es el dato para decidir el tope) ══════════
console.log('\n──── CUÁNTO OCUPA EL HÉROE ────');
console.log(`  390×844 · 6 ejercicios: ${alto390} px  (el CTA termina en y=${ctaBottom390}, pantalla 844)`);
console.log(`  390×844 · 8 ejercicios (5 + resumen): ${alto390_8} px`);
console.log(`  360×640 · 6 ejercicios: ${alto360} px  (el CTA termina en y=${ctaBottom360}, pantalla 640)`);
console.log(`  360×640 · 6 ejercicios · letra XL: ${altoXL} px`);

console.log('\n──── EL HÉROE DE «HOY» (dirección B) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('  capturas en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
