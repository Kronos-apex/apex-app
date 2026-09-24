// _verify-v668.mjs — los 4 del radar del 23-sep, medidos en el DOM real (no leídos del código):
//   A  la lista del peso NO se arrastra de lado, y el ✕ conserva su área de toque de 40 px
//   B  el color del cambio de PESO no depende de si subió o bajó (regla de Valery, v607):
//      línea, resumen y píldoras salen IGUAL con el peso subiendo que bajando
//   C  lo mismo en la tabla de MEDIDAS y en el mini-gráfico del coach
//   D  las fechas de la gráfica de medidas caben enteras en su lienzo (no se cortan por abajo ni a los lados)
//   E  la gráfica de la habitación de la rutina escribe el volumen como sus casillas («9,9 t»), sin «9082.5 kg»
//   F  la píldora neutra se lee: contraste ≥ 4,5 en claro y en oscuro
// Cada bloque lleva su control de cobertura (¿se pintó lo que se mide?). Sin login ni red.
// Corre: node scripts/e2e/_verify-v668.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8838, DBG = 9358, RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/v668-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
const salir = code => { try { chrome.kill(); srv.kill(); } catch {} process.exit(code); };
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setScrollbarsHidden', { hidden: true });
const res = []; const check = (n, c, x = '') => { res.push(!!c); console.log('  ' + (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
if (!await waitFor(`typeof renderClientProfile==='function' && typeof openRoutineRoom==='function' && !!window._aviUpdateBusy`)) { console.log('🔴 la app no arrancó'); salir(1); }
await sleep(1500);

// Monta a una asesorada inventada. `sube`: el peso y el brazo SUBEN (true) o BAJAN (false).
const MONTAR = sube => `(()=>{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const lib=DB.exercises||[]; const e0=lib.find(x=>/^Hip Thrust con Barra/i.test(x.name))||lib[0];
  const rut={id:'rw1',name:'Glúteo y pierna',day:days[(new Date().getDay()+1)%7],restSec:90,reviewed:true,exercises:[Object.assign({},e0,{sets:4,reps:'10'})]};
  const hist=[]; for(let s=0;s<14;s++){ const d=new Date(Date.now()-(2+s*4)*86400000).toISOString(); const vol=6800+(13-s)*230+(s%3)*0.5;
    hist.push({id:'h'+s,sessionId:'s'+s,routineId:'rw1',routineName:rut.name,date:d,finishedAt:d,doneSets:4,totalSets:4,totalVol:vol,duration:3000,exercises:[]}); }
  let bw=[]; for(let w=7;w>=0;w--){ const d=new Date(Date.now()-w*7*86400000); bw=bwUpsert(bw,d.toISOString().split('T')[0],+((${sube}?61:64)+(${sube}?-1:1)*w*0.4).toFixed(1),d.toISOString()); }
  const hace=n=>new Date(Date.now()-n*86400000).toISOString();
  let med=[]; med=medUpsert(med,{cintura:${sube}?74:79,brazo_der:${sube}?28:29.5},hace(62))||med;
  med=medUpsert(med,{cintura:${sube}?75.5:76,brazo_der:${sube}?29.2:28.6},hace(33))||med;
  med=medUpsert(med,{cintura:${sube}?77:74,brazo_der:${sube}?30:28},hace(2))||med;
  DB.clients=[{id:'demo',name:'Mariana',sex:'F',goal:'Ganar músculo',level:'Intermedio',days:3,weight:61,height:164,age:29,createdAt:'2026-06-10T10:00:00.000Z',routines:[rut],habits:{water:{},steps:{}}}];
  DB.history={demo:hist}; DB.prs={demo:{}}; DB.bodyweight={demo:bw}; DB.medidas={demo:med}; DB.photos={}; DB.nutrition={};
  CUR.clientId='demo'; CUR.loggedAs='client';
  showScreen('s-client');
  const t=[...document.querySelectorAll('.cntab')].find(x=>/Perfil/.test(x.textContent)); cnTab('cn-profile',t,true);
  renderClientProfile(DB.clients[0]);
  return true;
})()`;

// Lo que se mide de la pantalla del perfil, en el DOM vivo.
const MEDIR = `(()=>{
  const bwl=document.getElementById('bw-list');
  const btn=bwl&&bwl.querySelector('button.hit40');
  let toque=null;
  if(btn){ btn.scrollIntoView({block:'center'}); const r=btn.getBoundingClientRect(); const cy=r.top+r.height/2, cx=r.left+r.width/2;
    const pega=x=>{const el=document.elementFromPoint(x,cy);return !!(el&&el.closest&&el.closest('button.hit40')===btn);};
    toque={izq:pega(cx-16),der:pega(cx+16),ancho:Math.round(r.width)}; }
  const pills=[...document.querySelectorAll('#bw-list .wlog-delta')];
  const cs=el=>el?getComputedStyle(el):null;
  const linea=document.querySelector('#bw-chart svg path[style*="stroke"]');
  const resumen=document.querySelector('#bw-summary span');
  const medTabla=[...document.querySelectorAll('#cn-med-list table tbody tr')].map(tr=>{const td=tr.querySelectorAll('td');const c=td[td.length-1];return c?{t:c.textContent.trim(),col:getComputedStyle(c).color}:null;}).filter(Boolean);
  const svg=document.querySelector('#cn-med-chart svg');
  let fechas=[];
  if(svg){ const vb=svg.viewBox.baseVal; fechas=[...svg.querySelectorAll('text')].map(t=>{const b=t.getBBox();return {t:t.textContent,fuera:(b.y+b.height>vb.height+0.5)||b.x<-0.5||(b.x+b.width>vb.width+0.5),abajo:+(b.y+b.height-vb.height).toFixed(1)};}); }
  const lineaMed=svg&&svg.querySelector('path[style*="stroke"]');
  return {
    lista:bwl?{x:bwl.scrollWidth-bwl.clientWidth}:null, toque,
    pill:pills.length?{n:pills.length,col:cs(pills[0]).color,bg:cs(pills[0]).backgroundColor}:null,
    linea:linea?cs(linea).stroke:null, resumen:resumen?cs(resumen).color:null,
    medTabla, fechas, lineaMed:lineaMed?cs(lineaMed).stroke:null,
    mini:(typeof miniSparkline==='function')?((miniSparkline('demo').match(/stroke:([^;"]+)/)||[])[1]||null):null
  };
})()`;

const lum = c => { const m = (c || '').match(/\d+(\.\d+)?/g); if (!m) return null; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); if (x == null || y == null) return null; return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };

const medir = async (sube, tema) => {
  // El tema se FIJA (data-theme), no se supone: el headless arranca en oscuro y cambiar solo la
  // preferencia del sistema no bastó (la primera corrida midió dos veces el oscuro).
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] });
  await ev(`(typeof setTheme==='function'?setTheme('${tema}'):0, document.documentElement.getAttribute('data-theme'))`);
  await ev(MONTAR(sube)); await sleep(1300);
  return await ev(MEDIR);
};
const sube = await medir(true, 'light'), baja = await medir(false, 'light');
// Controles de cobertura: si no se pintó lo que se mide, las comparaciones no valen nada.
check('cobertura: lista, píldoras, línea, resumen, tabla y gráfica de medidas pintadas',
  sube.lista && sube.pill && sube.pill.n >= 3 && sube.linea && sube.resumen && sube.medTabla.length >= 2 && sube.fechas.length >= 2 && sube.lineaMed && sube.mini,
  JSON.stringify({ pill: sube.pill && sube.pill.n, tabla: sube.medTabla.length, fechas: sube.fechas.length }));
check('A la lista del peso no se arrastra de lado', sube.lista && sube.lista.x <= 0, 'sobra ' + (sube.lista && sube.lista.x) + ' px');
check('A el ✕ conserva su área de toque (16 px a cada lado del centro)', sube.toque && sube.toque.izq && sube.toque.der, JSON.stringify(sube.toque));
check('B la píldora del peso es igual subiendo que bajando', sube.pill && baja.pill && sube.pill.col === baja.pill.col && sube.pill.bg === baja.pill.bg,
  `sube ${sube.pill && sube.pill.col}/${sube.pill && sube.pill.bg} · baja ${baja.pill && baja.pill.col}/${baja.pill && baja.pill.bg}`);
check('B la línea y el resumen del peso no cambian de color con la dirección', sube.linea === baja.linea && sube.resumen === baja.resumen,
  `línea ${sube.linea} / ${baja.linea} · resumen ${sube.resumen} / ${baja.resumen}`);
const cambios = r => [...new Set(r.medTabla.filter(x => /[+-]\d/.test(x.t)).map(x => x.col))];
const cs = cambios(sube), cb = cambios(baja);
check('C la columna «Cambio» de medidas tiene UN solo color, suba o baje', cs.length === 1 && cb.length === 1 && cs[0] === cb[0], JSON.stringify({ sube: cs, baja: cb }));
check('C la línea de medidas y el mini-gráfico del coach no dependen de la dirección', sube.lineaMed === baja.lineaMed && sube.mini === baja.mini,
  `medidas ${sube.lineaMed}/${baja.lineaMed} · coach ${sube.mini}/${baja.mini}`);
const fuera = sube.fechas.concat(baja.fechas).filter(f => f.fuera);
check('D las fechas de la gráfica de medidas caben enteras', fuera.length === 0, JSON.stringify(fuera.slice(0, 3)));
// F · contraste de la píldora en los dos temas
const oscuro = await medir(true, 'dark');
check('control: el tema claro y el oscuro se midieron DISTINTOS', sube.pill && oscuro.pill && sube.pill.bg !== oscuro.pill.bg, `claro ${sube.pill && sube.pill.bg} · oscuro ${oscuro.pill && oscuro.pill.bg}`);
const rc = ratio(sube.pill && sube.pill.col, sube.pill && sube.pill.bg), ro = ratio(oscuro.pill && oscuro.pill.col, oscuro.pill && oscuro.pill.bg);
check('F la píldora neutra se lee en claro y en oscuro (≥ 4,5)', rc >= 4.5 && ro >= 4.5, `claro ${rc} · oscuro ${ro}`);
// E · la habitación de la rutina
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(`typeof setTheme==='function'?setTheme('light'):0`);
await ev(MONTAR(true)); await sleep(800);
await ev(`(()=>{ openRoutineRoom('demo','rw1'); return 1; })()`); await sleep(1500);
const room = await ev(`(()=>{ const ch=document.getElementById('rtroom-chart'); const et=ch?[...ch.querySelectorAll('text')].map(t=>t.textContent.trim()):[];
  const casillas=[...document.querySelectorAll('#routine-room .sroom-stat-v')].map(x=>x.textContent.trim()); return {et,casillas}; })()`);
const valores = room.et.filter(t => /^[\d.,]+ (kg|t)$/.test(t));   // «1 sept» termina en t y NO es un valor
check('E cobertura: la gráfica de la rutina pintó etiquetas de valor', valores.length >= 2, JSON.stringify(room.et.slice(0, 6)));
check('E ninguna etiqueta escribe miles sin separar («9082.5 kg»)', !valores.some(t => /\d{4}/.test(t)), JSON.stringify(valores.slice(0, 5)));
check('E la gráfica habla en las mismas unidades que sus casillas', valores.length && valores.every(t => / t$/.test(t)) && room.casillas.some(c => / t$/.test(c)),
  JSON.stringify({ valores: valores.slice(0, 3), casillas: room.casillas }));
check('sin errores de JavaScript', jsErrors.length === 0, JSON.stringify(jsErrors.slice(0, 3)));
const ok = res.every(Boolean);
console.log(ok ? `\n✅ ${res.length}/${res.length}` : `\n🔴 ${res.filter(Boolean).length}/${res.length}`);
try { ws.close(); } catch {}
salir(ok ? 0 : 1);
