// _verify-chips.mjs — LA TIRA DE 3 CHIPS (dirección B «El Compromiso», avi-v504).
// Agua, pasos y plato dejan de ser una tarjeta de tres filas y ceden a una tira de una línea.
//
// 🔴 LO QUE ESTE HARNESS EXISTE PARA PROTEGER: el vaso de agua es UN toque y es el hábito con
// más adopción de la app (medido sobre los 24 perfiles reales, 19-ago: agua 8 personas/71 días ·
// pasos 8/45 · comida 5/7). Un rediseño que lo convierta en «abrir, buscar, tocar» le sube el
// precio al único hábito que pegó. C2 es el candado: el chip de agua suma un vaso de un toque.
// Y C6 vigila la otra clase (v435): el chip y la fila del detalle pintan el mismo hábito a un
// toque de distancia, así que tienen que decir el MISMO número.
// Sin login ni red. Capturas en claro y oscuro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8829, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-chips';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9349', '--user-data-dir=' + process.env.TEMP + '/chips-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9349/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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

// Asesorada con historial (si no, el modo DÍA 1 apaga los hábitos a propósito) y con plan de
// nutrición del coach, que es lo que le da meta al chip de comida.
const MONTAR = `((tier, conPlan) => {try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const ex=(i)=>({id:'e'+i,name:'Ejercicio '+i,muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'});
  const client={id:'chips',name:'Nataly Ospina',sex:'F',level:'Intermedio',goal:'Ganar músculo',days:4,
    weight:62,height:163,age:29,activityFactor:1.55,tier:tier||undefined,
    createdAt:'2026-05-01T10:00:00.000Z',
    routines:[{id:'r1',name:'Pierna y glúteo',day:hoy,restSec:90,exercises:[0,1,2,3].map(ex)}],
    habits:{water:{},steps:{}}};
  const hist=[]; for(let i=1;i<=6;i++){ const d=new Date(Date.now()-i*86400000*2).toISOString();
    hist.push({id:'h'+i,sessionId:'s'+i,routineId:'r1',routineName:'Pierna y glúteo',date:d,finishedAt:d,doneSets:16,totalSets:16,exercises:[]}); }
  DB.clients=[client]; DB.history={chips:hist}; DB.prs={}; DB.bodyweight={};
  DB.nutrition = conPlan ? {chips:{kcal:2100,prot:130,carbs:230,fat:60,water:8,goal:'mantenimiento'}} : {};
  CUR.clientId='chips'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^ax_hbopen_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})`;

const montar = async (tier = '', conPlan = true) => {
  const r = await ev(`${MONTAR}(${JSON.stringify(tier)},${conPlan})`);
  if (String(r).startsWith('err:')) throw new Error('montaje: ' + r);
  await sleep(700);
};

const results = [];
console.log('\n──── comprobaciones ────');
// Se imprime EN EL ACTO, no solo al final: bajo sabotaje el harness puede morir a mitad y un
// resumen que solo existe al final se lleva consigo todo lo que ya se había medido.
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };

async function shot(name, tema) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(320);
  // La tira vive DEBAJO del héroe (v503): sin scrollIntoView la captura sale del héroe y no de
  // lo que este harness viene a mirar.
  await ev(`(()=>{const s=document.querySelector('#cn-habits .hb-strip'); if(s&&s.scrollIntoView)s.scrollIntoView({block:'center'});})()`);
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}-${tema}.png`, Buffer.from(r.data, 'base64'));
}

const TIRA = `(()=>{const el=document.getElementById('cn-habits');
  const chips=[...el.querySelectorAll('.hb-strip .hb-chip')];
  const more=el.querySelector('.hb-more');
  const card=el.querySelector('.hb-card');
  const rm=more?more.getBoundingClientRect():null;
  return {n:chips.length,
    clases:chips.map(c=>c.className.replace('hb-chip','').trim()),
    v:chips.map(c=>(c.querySelector('.hb-chip-v')||{}).textContent.trim()),
    l:chips.map(c=>(c.querySelector('.hb-chip-l')||{}).textContent.trim()),
    barras:chips.map(c=>{const i=c.querySelector('.hb-chip-bar i');return i?i.style.width:null}),
    aria:chips.map(c=>c.getAttribute('aria-label')||''),
    alto:chips.map(c=>Math.round(c.getBoundingClientRect().height)),
    ancho:chips.map(c=>Math.round(c.getBoundingClientRect().width)),
    more:!!more, moreAlto:rm?Math.round(rm.height):0, moreExpanded:more?more.getAttribute('aria-expanded'):null,
    detalle:!!card,
    filasDetalle:card?card.querySelectorAll('.hb-row').length:0,
    menos:!!el.querySelector('.hb-minus'), input:!!el.querySelector('.hb-num'),
    mil:!!el.querySelector('.hb-btn.st'), semana:el.querySelectorAll('.hb-week').length,
    desborde:Math.round(document.documentElement.scrollWidth-document.documentElement.clientWidth)};})()`;

// ══════════ C1 · la tira sustituye a la tarjeta apilada ══════════
await montar();
let s = await evj(TIRA);
check('C1 «Hoy» abre con la TIRA de 3 chips (agua · pasos · plato) y sin la tarjeta apilada',
  s.n === 3 && s.detalle === false && s.clases.join(',') === 'w,s,f',
  JSON.stringify({ chips: s.n, clases: s.clases, detalle: s.detalle, v: s.v, l: s.l }));
check('C1-bis táctil: cada chip ≥36 px de alto y el «ver el detalle» también',
  s.alto.every(h => h >= 36) && s.moreAlto >= 36, JSON.stringify({ chips: s.alto, more: s.moreAlto }));
await shot('1-tira', 'light'); await shot('1-tira', 'dark');

// ══════════ C2 · EL CANDADO DE ADOPCIÓN: el agua sigue a UN TOQUE ══════════
const antes = await ev(`waterToday((DB.clients[0]||{}).habits)`);
await ev(`document.querySelector('#cn-habits .hb-chip.w').click()`);
await sleep(500);
const despues = await ev(`waterToday((DB.clients[0]||{}).habits)`);
s = await evj(TIRA);
check('🔴 C2 UN TOQUE en el chip de agua suma un vaso y queda guardado en sus hábitos',
  despues === antes + 1 && /^1\b/.test(s.v[0]),
  JSON.stringify({ antes, despues, chip: s.v[0] }));
check('C2-bis el chip dice en voz alta qué hace y cómo va (lector de pantalla)',
  /vaso de agua/i.test(s.aria[0]) && /1 de \d+/.test(s.aria[0]), JSON.stringify({ aria: s.aria[0] }));

// ══════════ C3 · el chip de pasos abre el detalle Y deja el cursor donde se escribe ══════════
await ev(`document.querySelector('#cn-habits .hb-chip.s').click()`);
await sleep(700);
s = await evj(TIRA);
const foco = await ev(`!!(document.activeElement&&document.activeElement.classList.contains('hb-num'))`);
check('C3 el chip de pasos despliega el detalle con su campo, y el cursor queda AHÍ',
  s.detalle === true && s.input === true && foco === true,
  JSON.stringify({ detalle: s.detalle, input: s.input, foco }));
check('C3-bis desplegado, NADA de lo que había se perdió: −1, campo de pasos, +1.000 y las semanas',
  s.menos && s.input && s.mil && s.semana === 2 && s.filasDetalle === 3,
  JSON.stringify({ menos: s.menos, input: s.input, mil: s.mil, semanas: s.semana, filas: s.filasDetalle }));
await shot('3-detalle', 'light');

// ══════════ C6 · el chip y la fila NO pueden decir cosas distintas (clase v435) ══════════
await ev(`(()=>{const c=DB.clients[0]; c.habits=waterAdd(c.habits,3); c.habits=stepsSet(c.habits,4820); renderHabitsCard(c);})()`);
await sleep(500);
const par = await evj(`(()=>{const el=document.getElementById('cn-habits');
  const chip=[...el.querySelectorAll('.hb-chip')];
  const filas=[...el.querySelectorAll('.hb-card .hb-row')];
  // Si la estructura no está, se REPORTA; una sonda que lanza deja el check sin veredicto.
  if(chip.length<2||filas.length<2)return {err:'faltan elementos: '+chip.length+' chips, '+filas.length+' filas'};
  const num=t=>{const m=String(t).match(/[\\d.]+/);return m?m[0].replace(/\\./g,''):null};
  const barChip=i=>{const b=chip[i].querySelector('.hb-chip-bar i');return b?b.style.width:null};
  const barFila=i=>{const b=filas[i].querySelector('.hb-fill');return b?b.style.width:null};
  // La META también se compara: es la que de verdad se separa en producción (el plan escrito
  // del coach contra la calculada del peso son DOS fuentes del mismo número, clase v435).
  const metaChip=(chip[0].querySelector('.hb-chip-v').textContent.match(/\\/\\s*(\\d+)/)||[])[1]||null;
  const metaFila=(filas[0].querySelector('.hb-sub').textContent.match(/de\\s+(\\d+)\\s+vasos/)||[])[1]||null;
  return {metaChip, metaFila,
          aguaChip:num(chip[0].querySelector('.hb-chip-v').textContent),
          aguaFila:num(filas[0].querySelector('.hb-sub b')?filas[0].querySelector('.hb-sub b').textContent:filas[0].querySelector('.hb-sub').textContent),
          pasosChip:num(chip[1].querySelector('.hb-chip-v').textContent),
          pasosFila:num(filas[1].querySelector('.hb-sub b')?filas[1].querySelector('.hb-sub b').textContent:filas[1].querySelector('.hb-sub').textContent),
          barAgua:[barChip(0),barFila(0)], barPasos:[barChip(1),barFila(1)]};})()`);
check('🔴 C6 el chip y la fila del detalle dicen el MISMO número y pintan la MISMA barra',
  !par.err && par.aguaChip === par.aguaFila && par.pasosChip === par.pasosFila &&
  par.metaChip !== null && par.metaChip === par.metaFila &&
  par.barAgua[0] === par.barAgua[1] && par.barPasos[0] === par.barPasos[1],
  JSON.stringify(par));

// ══════════ C5 · el detalle se QUEDA abierto (quien usa pasos a diario no paga un toque más) ══════════
await ev(`(()=>{const c=DB.clients[0]; renderClientToday(c);})()`);
await sleep(600);
s = await evj(TIRA);
check('C5 el detalle abierto sobrevive a un re-render y queda marcado como expandido',
  s.detalle === true && s.moreExpanded === 'true', JSON.stringify({ detalle: s.detalle, aria: s.moreExpanded }));
await ev(`document.querySelector('#cn-habits .hb-more').click()`); await sleep(500);
s = await evj(TIRA);
const guardado = await ev(`localStorage.getItem('ax_hbopen_chips')`);
check('C5-bis se puede cerrar, y la preferencia vive SOLO en este aparato',
  s.detalle === false && guardado === '0', JSON.stringify({ detalle: s.detalle, disco: guardado }));

// ══════════ C4 · el chip de comida abre la habitación del registro (igual que antes) ══════════
await ev(`(()=>{try{localStorage.setItem('ax_foodlogok_chips','1');}catch(e){}; const c=DB.clients[0]; c.foodlogOk=true; renderHabitsCard(c);})()`);
await sleep(300);
await ev(`document.querySelector('#cn-habits .hb-chip.f').click()`);
await sleep(900);
const room = await ev(`(()=>{const r=document.getElementById('foodlog-room');return !!(r&&r.classList.contains('on'));})()`);
check('C4 el chip del plato abre la habitación del registro (mismo toque que antes)',
  room === true, JSON.stringify({ habitacionAbierta: room }));
await ev(`(()=>{if(typeof closeFoodLogRoom==='function')closeFoodLogRoom();})()`); await sleep(400);

// ══════════ C7 · cuando NO hay meta que mostrar, el chip no se inventa una ══════════
// Ojo: «sin plan del coach» NO es «sin meta» — `nutBaseFor` estima el objetivo del perfil
// (peso, talla, edad, actividad) y el chip lo muestra, igual que las pantallas de nutrición.
// El estado sin meta de verdad es el de quien no tiene ni plan escrito ni datos para estimarla.
await montar('', false);
await ev(`(()=>{const c=DB.clients[0]; delete c.weight; delete c.height; delete c.age; renderClientToday(c);})()`);
await sleep(600);
s = await evj(TIRA);
const cumplido = await ev(`!!document.querySelector('#cn-habits .hb-chip.f.met')`);
check('C7 sin datos para calcular una meta, el chip del plato no se pinta cumplido ni la inventa',
  s.n === 3 && cumplido === false && s.barras[2] === '0%' && !/de \d+ kcal/.test(s.l[2]),
  JSON.stringify({ etiqueta: s.l[2], barra: s.barras[2], cumplido }));
// Y su control: con datos SÍ aparece la meta, o el check anterior estaría aprobando una app muda.
await montar('', false);
s = await evj(TIRA);
// El control lleva la regla de v478 dentro: cuando SÍ hay objetivo, el chip lo dice en FRANJA
// («hoy: 1810–2350 kcal»), nunca como una cifra exacta que el propio plato no clava.
check('C7-bis CONTROL: con datos del perfil el chip SÍ da el objetivo del día, y como FRANJA',
  /hoy: \d+–\d+ kcal/.test(s.l[2]), JSON.stringify({ etiqueta: s.l[2] }));

// ══════════ C8 · tier LIBRE: dos chips, sin puerta que no puede abrir ══════════
await montar('libre');
s = await evj(TIRA);
check('C8 al tier libre le salen 2 chips (el registro es Premium) y la tira no se rompe',
  s.n === 2 && s.clases.join(',') === 'w,s' && s.desborde === 0,
  JSON.stringify({ chips: s.n, clases: s.clases, ancho: s.ancho }));

// ══════════ C9 · 360 px y LETRA GRANDE (clase v452) ══════════
await montar();
await viewport(360, 640); await sleep(400);
await ev(`(()=>{renderClientToday(DB.clients[0]);})()`); await sleep(600);
s = await evj(TIRA);
check('C9 a 360 px los 3 chips caben en una línea y nada se sale a lo ancho',
  s.n === 3 && s.desborde === 0 && s.ancho.every(w => w > 60) && Math.max(...s.ancho) - Math.min(...s.ancho) <= 2,
  JSON.stringify({ ancho: s.ancho, desborde: s.desborde }));
await shot('9-360', 'light');
await ev(`(()=>{document.documentElement.setAttribute('data-fs','xl');renderClientToday(DB.clients[0]);})()`);
await sleep(700);
s = await evj(TIRA);
check('🔴 C9-bis (clase v452) con LETRA GRANDE la tira crece y NO se sale a lo ancho',
  s.n === 3 && s.desborde === 0 && s.alto.every(h => h >= 36),
  JSON.stringify({ desborde: s.desborde, alto: s.alto }));
await shot('9-360-xl', 'light');
await ev(`document.documentElement.removeAttribute('data-fs')`);
await viewport(390, 844); await sleep(400);

// ══════════ C10 · CONTRASTE de la tira, medido en el DOM ══════════
await montar();
const CT = `(()=>{
  const lin=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)};
  const lum=a=>.2126*lin(a[0])+.7152*lin(a[1])+.0722*lin(a[2]);
  const P=s=>{const m=(s||'').match(/rgba?\\(([^)]+)\\)/);return m?m[1].split(',').map(parseFloat):null};
  const fondo=el=>{let n=el; while(n&&n!==document.documentElement){const p=P(getComputedStyle(n).backgroundColor);
    if(p&&(p.length<4||p[3]>0.98))return p.slice(0,3); n=n.parentElement;} return [255,255,255];};
  const medir=(sel,label)=>{const e=document.querySelector(sel); if(!e)return {label,err:'no existe '+sel};
    const cs=getComputedStyle(e); const fg=P(cs.color); if(!fg)return {label,err:'color ilegible: '+cs.color};
    const bg=fondo(e); const a=fg.length>3?fg[3]:1;
    const comp=[0,1,2].map(i=>fg[i]*a+bg[i]*(1-a));
    const l1=Math.max(lum(comp),lum(bg)), l2=Math.min(lum(comp),lum(bg));
    return {label, px:parseFloat(cs.fontSize), ratio:Math.round((l1+.05)/(l2+.05)*100)/100};};
  return [medir('#cn-habits .hb-chip.w .hb-chip-v','valor'),
          medir('#cn-habits .hb-chip.w .hb-chip-l','etiqueta'),
          medir('#cn-habits .hb-chip.s .hb-chip-l','etiqueta pasos'),
          medir('#cn-habits .hb-chip.f .hb-chip-l','etiqueta plato'),
          medir('#cn-habits .hb-more','ver el detalle')];})()`;
for (const tema of ['light', 'dark']) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(350);
  const ct = await evj(CT);
  const malas = ct.filter(m => m.err || !isFinite(m.ratio) || m.ratio < 4.5);
  check(`C10 la tira se lee en tema ${tema === 'light' ? 'claro' : 'oscuro'} (todo ≥4,5:1)`,
    ct.length === 5 && malas.length === 0,
    JSON.stringify(malas.length ? malas : ct.map(m => m.label + ' ' + m.ratio)));
}
await ev(`typeof setTheme==='function' && setTheme('light')`);

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── LA TIRA DE 3 CHIPS (dirección B) ────');
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('  capturas en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
