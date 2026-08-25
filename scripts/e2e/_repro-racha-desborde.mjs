// _repro-racha-desborde.mjs — LA RACHA SE SALE DE LA PANTALLA (reporte del PO, 25-ago).
//
// *«El letrero de la racha de semanas entrenadas —en mi caso 14 semanas— está bien pero se sale
// de la pantalla, y eso hace que la pantalla se mueva hacia los lados. Prefiero una pantalla
// uniforme y que ese letrero quede dentro.»*
//
// 🔴 LO QUE SE MIDE ES LA CONSECUENCIA QUE ÉL SUFRE, no la presencia de una clase: que el
// DOCUMENTO se pueda desplazar de lado. Un chip que se sale pero no ensancha el documento sería
// otro defecto distinto; el suyo es el scroll horizontal.
//
// La racha NO se falsea: se monta un historial REAL de 15 semanas cumpliendo la meta, y se
// comprueba que `weekStreak` devuelve 14+ antes de medir nada (control de montaje — si el
// fixture no produce la racha, lo de abajo no prueba nada).
//
// Se miden las DOS variantes, porque el texto es distinto y solo una desborda:
//   · SIN héroe  → «🔥 14 semanas seguidas entrenando» (el largo, el que él ve)
//   · CON héroe  → «🔥 14 sems.» (el corto, comparte renglón con el nombre)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8845, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-racha';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9387', '--user-data-dir=' + process.env.TEMP + '/racha-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9387/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const evj = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await waitFor(`!!document.getElementById('s-login') && typeof renderTodayHead==='function' && !document.getElementById('avi-loading')`);
await sleep(1500);

// Historial REAL de 15 semanas cumpliendo la meta (2 sesiones por semana): así `weekStreak`
// devuelve la racha de verdad y no hay que falsear nada.
const MONTAR = `((opts) => {try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const ex=i=>({id:'e'+i,name:'Ejercicio '+i,muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'});
  const client={id:'rc',name:${JSON.stringify('Camilo')},sex:'M',level:'Intermedio',goal:'Ganar músculo',days:4,
    weight:86,height:172,age:29,activityFactor:1.55,createdAt:new Date(Date.now()-200*86400000).toISOString(),
    routines:[{id:'r1',name:'Pierna y glúteo',day:hoy,restSec:90,exercises:[0,1,2,3].map(ex)}],habits:{water:{},steps:{}}};
  const hist=[];
  // 15 semanas hacia atrás, 2 sesiones cada una (lunes y jueves de esa semana).
  for(let w=0;w<15;w++){ for(const off of [1,4]){
    const d=new Date(); d.setDate(d.getDate()-(w*7)-((d.getDay()+7-off)%7||0)-(w?0:7));
    const iso=d.toISOString();
    hist.push({id:'h'+w+'_'+off,sessionId:'s'+w+'_'+off,routineId:'r1',routineName:'Pierna y glúteo',
      date:iso,finishedAt:iso,doneSets:16,totalSets:16,totalVol:3200,
      exercises:[{name:'Ejercicio 0',sets:[{kg:80,reps:10,done:true}]}]}); } }
  DB.clients=[client]; DB.history={rc:hist}; DB.prs={}; DB.bodyweight={}; DB.nutrition={};
  CUR.clientId='rc'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^ax_news_seen|^coachmute_/.test(k)).forEach(k=>localStorage.removeItem(k));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const ws2=weekStreak(hist, streakTarget(client), new Date());
  // La variante la decide el segundo argumento: con rutina = héroe (chip corto), sin = largo.
  renderTodayHead(client, opts.hero? client.routines[0] : null);
  if(typeof ntClose==='function')ntClose(false);
  return JSON.stringify({semanas:ws2.weeks, meta:ws2.target});
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})`;

// 🔴 EL DOCUMENTO NO ES EL QUE SE DESPLAZA. Esta app scrollea en contenedores INTERNOS
// (`.cnbody`, `.cnp`, el panel del coach), así que medir `documentElement.scrollWidth` da 0 de
// desborde mientras la persona SÍ puede arrastrar la pantalla de lado. La primera versión de
// esta sonda decía «desborde=0px» sobre el defecto que venía a reproducir.
// Se recorre la CADENA DE PADRES del chip buscando cualquiera que se pueda desplazar.
const MEDIR = `(()=>{const c=document.querySelector('.streak-chip');
  const r=c?c.getBoundingClientRect():null;
  const doc=document.documentElement;
  const scrollers=[];
  let n=c?c.parentElement:null;
  while(n){ const s=getComputedStyle(n);
    const puede=n.scrollWidth-n.clientWidth>1;
    if(puede) scrollers.push({el:(n.id?'#'+n.id:'.'+(n.className||'').toString().split(' ')[0]),
      sobra:Math.round(n.scrollWidth-n.clientWidth), overflowX:s.overflowX});
    n=n.parentElement; }
  const docSobra=Math.round(doc.scrollWidth-doc.clientWidth);
  if(docSobra>1)scrollers.push({el:'documento',sobra:docSobra,overflowX:getComputedStyle(doc).overflowX});
  return {texto:c?(c.innerText||'').replace(/\\s+/g,' ').trim():'(sin chip)',
    ancho:r?Math.round(r.width):0,
    pantalla:doc.clientWidth,
    seSale: r? Math.round(r.right-doc.clientWidth) : 0,
    scrollers,
    puedeDesplazarse:scrollers.length>0,
    desborde:scrollers.length?Math.max(...scrollers.map(x=>x.sobra)):0};})()`;

const results = [];
console.log('\n──── medición ────');
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };

// 🔴 EL TAMAÑO DE LETRA ES PARTE DEL CASO, no un extra: `.cnp` lleva `zoom:1.18` con la letra
// en «Grande» y `zoom:1.40` en «Muy grande», así que el mismo chip mide 263, 310 o 368 px. Medir
// solo en «Normal» es medir la app de otra persona.
const TALLAS = [['normal', 'Normal'], ['lg', 'Grande'], ['xl', 'Muy grande']];
for (const ancho of [390, 360]) {
  await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true });
  for (const [fs, fsLabel] of TALLAS) {
    for (const hero of [false, true]) {
      await ev(`typeof setTextSize==='function' && setTextSize('${fs}')`); await sleep(220);
      const r = await ev(`${MONTAR}(${JSON.stringify({ hero })})`);
      if (String(r).startsWith('err:')) throw new Error('montaje: ' + r);
      const mont = JSON.parse(r);
      await sleep(500);
      const m = await evj(MEDIR);
      const etiqueta = `${ancho}px · letra ${fsLabel} · ${hero ? 'CON héroe' : 'SIN héroe'}`;
      if (!hero && ancho === 390 && fs === 'normal') {
        check(`MONTAJE 🔒 el fixture produce una racha real de ≥14 semanas`,
          mont.semanas >= 14, JSON.stringify(mont));
      }
      console.log(`  · ${etiqueta}: «${m.texto}» ancho=${m.ancho} pantalla=${m.pantalla} seSale=${m.seSale}px desborde=${m.desborde}px`);
      check(`${etiqueta}: la pantalla NO se desplaza de lado`,
        !m.puedeDesplazarse, 'desborde=' + m.desborde + 'px');
      check(`${etiqueta}: el letrero cabe DENTRO`,
        m.seSale <= 0, 'se sale ' + m.seSale + 'px');
      if (ancho === 360 && fs === 'xl') {
        await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(250);
        const s = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(`${OUT}/racha-${hero ? 'hero' : 'plano'}-xl.png`, Buffer.from(s.data, 'base64'));
      }
    }
  }
}
await ev(`typeof setTextSize==='function' && setTextSize('normal')`);

console.log('\njsErrors:', JSON.stringify(jsErrors));
const fallos = results.filter(r => r.startsWith('❌')).length;
console.log(`\n${fallos ? '❌' : '✅'} ${results.length - fallos}/${results.length} comprobaciones` + (fallos ? ' — ' + fallos + ' FALLARON' : ' · TODO OK'));
console.log('capturas en ' + OUT);
try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallos || jsErrors.length ? 1 : 0);
