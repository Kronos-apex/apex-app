// _verify-selftraining.mjs — "Mi entrenamiento" en el panel del coach (v369, idea Camilo #3):
// el coach entrena en una cuenta de asesorado aparte; la MARCA como "mi cuenta" en la ficha
// (#d-selfacct → ax_selfclient, ajuste que SINCRONIZA) y su Inicio muestra una tarjeta
// #h-mytraining con racha/semana/último + acceso a su ficha. Sin login (sintetiza el panel del
// coach; la escritura a la nube está SELLADA en localhost). Aserciones duras (exit 1) + shots.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8796, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9303', '--user-data-dir=' + process.env.TEMP + '/self-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9303/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shotFull(n) {
  const h = await ev(`(()=>{
    const mn=document.querySelector('#s-coach .main'); if(mn){mn.style.overflow='visible';mn.style.height='auto';mn.style.flex='none';}
    const cs=document.getElementById('s-coach'); if(cs){cs.style.height='auto';cs.style.maxHeight='none';cs.style.overflow='visible';}
    document.querySelectorAll('.coach-topbar').forEach(e=>{e.style.position='static';});
    return Math.max(document.getElementById('s-coach').scrollHeight, 844);
  })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: Math.min(h, 1600), deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${Math.min(h, 1600)}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && typeof myTrainingSummary==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);

const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  try{ localStorage.removeItem('ax_selfclient'); }catch(e){}
  const mkEx=(nm,mus)=>({id:nm,name:nm,muscle:mus,type:'Compuesto',track:'peso_reps',sets:3,reps:'10'});
  const rout=(nm,day)=>({id:'r'+nm,name:nm,day,exercises:[mkEx('Sentadilla','Cuádriceps'),mkEx('Press banca','Pecho')]});
  const mkC=(id,name,sex)=>({id,name,email:name.toLowerCase().replace(/ /g,'.')+'@gmail.com',goal:'Ganar músculo',level:'Intermedio',days:3,weight:78,height:178,age:29,sex,phone:'3001234567',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:'2026-08-05',amount:120000}],routines:[rout('Empuje','Lunes'),rout('Pierna','Miércoles'),rout('Tracción','Viernes')]});
  // c1 = la cuenta del propio Camilo (con historial); c2 = otro asesorado SIN historial.
  DB.clients=[ mkC('c1','Camilo Andres','M'), mkC('c2','Andrea Molina','F') ];
  const mkS=(cid,daysAgo,name)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);d.setHours(18,0,0,0);
    return {id:cid+'s'+daysAgo,sessionId:cid+'sid'+daysAgo,routineId:'rEmpuje',routineName:name,date:d.toISOString(),startedAt:d.toISOString(),finishedAt:d.toISOString(),totalVol:4200,doneSets:12,totalSets:12,exercises:[]};};
  DB.history={ c1:[mkS('c1',0,'Empuje'),mkS('c1',2,'Pierna'),mkS('c1',5,'Tracción')] }; // c2 sin historial
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach');
  if(typeof renderAll==='function')renderAll();
  gp('p-home',document.getElementById('sbi-home'),'Inicio'); if(typeof renderHome==='function')renderHome();
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`);
console.log('  setup:', setup);
await sleep(800);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// ST1: sin cuenta marcada, la tarjeta del Inicio está oculta.
const st1 = await ev(`(()=>{const el=document.getElementById('h-mytraining');return {disp:el?el.style.display:'?',html:el?el.innerHTML.length:0};})()`);
check('ST1 sin cuenta marcada → #h-mytraining oculta y vacía', st1.disp === 'none' && st1.html === 0, JSON.stringify(st1));

// ST2: abrir la ficha de c1 → el toggle "Marcar como mi cuenta" aparece (aún sin marcar).
await ev(`openDetail('c1')`); await sleep(600);
const st2 = await ev(`(()=>{const el=document.getElementById('d-selfacct');return {txt:el?el.textContent.trim():'',marked:/Mi cuenta/.test(el?el.textContent:'')};})()`);
check('ST2 ficha sin marcar → botón "Marcar como mi cuenta de entrenamiento"', /Marcar como mi cuenta/.test(st2.txt) && !st2.marked, JSON.stringify(st2));

// ST3: marcar c1 → ax_selfclient='c1', chip "Mi cuenta", y entra al objeto que sincroniza.
await ev(`toggleSelfAcct('c1')`); await sleep(400);
const st3 = await ev(`(()=>{const el=document.getElementById('d-selfacct');return {ls:JSON.parse(localStorage.getItem('ax_selfclient')||'""'),chip:/Mi cuenta de entrenamiento/.test(el?el.textContent:''),sync:(typeof _coachSettingsObj==='function')?_coachSettingsObj().selfclient:'?'};})()`);
check('ST3 "Marcar" → ax_selfclient=c1, chip "Mi cuenta", y va en coach_settings (sincroniza)', st3.ls === 'c1' && st3.chip === true && st3.sync === 'c1', JSON.stringify(st3));

// ST4: el Inicio ahora muestra la tarjeta con nombre + las 3 cifras (c1 tiene historial).
await ev(`gp('p-home',document.getElementById('sbi-home'),'Inicio');renderHome();`); await sleep(500);
const st4 = await ev(`(()=>{const el=document.getElementById('h-mytraining');const t=el?el.innerText.replace(/\\s+/g,' ').trim():'';return {disp:el?el.style.display:'?',name:/Camilo Andres/.test(t),racha:/Racha/.test(t),semana:/Esta semana/.test(t),ultimo:/Último/.test(t),empty:/Aún no registras/.test(t),cta:/Ver mi entrenamiento/.test(t)};})()`);
check('ST4 Inicio: tarjeta visible con nombre + Racha/Esta semana/Último + CTA (c1 con datos, NO vacío)', st4.disp === 'block' && st4.name && st4.racha && st4.semana && st4.ultimo && st4.cta && !st4.empty, JSON.stringify(st4));

await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300); await shotFull('selftraining-home-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(300); await shotFull('selftraining-home-oscuro');
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300);

// ST5: la tarjeta lleva a su ficha (CTA → openDetail(c1)).
await ev(`(()=>{const b=[...document.querySelectorAll('#h-mytraining button')].find(x=>/Ver mi entrenamiento/.test(x.textContent));if(b)b.click();})()`);
await sleep(600);
const st5 = await ev(`(()=>{const p=document.getElementById('p-detail');const open=p&&p.classList.contains('on');return {open:!!open,name:(document.getElementById('d-name')||{}).textContent||''};})()`);
check('ST5 "Ver mi entrenamiento" abre la ficha del propio coach', st5.open === true && /Camilo Andres/.test(st5.name), JSON.stringify(st5));

// ST5b: con c1 ya marcada, la ficha de OTRO asesorado no muestra ruido (ni chip ni botón).
await ev(`openDetail('c2');`); await sleep(500);
const st5b = await ev(`(()=>{const el=document.getElementById('d-selfacct');return {html:el?el.innerHTML.trim().length:-1};})()`);
check('ST5b con una cuenta ya marcada, otras fichas quedan LIMPIAS (#d-selfacct vacío)', st5b.html === 0, JSON.stringify(st5b));

// ST6: re-designar (flujo real): desmarcar c1 → la ficha de c2 vuelve a ofrecer "marcar" → marcar c2.
// c2 no tiene historial → la tarjeta del Inicio invita a registrar (estado vacío honesto).
await ev(`openDetail('c1');`); await sleep(400);
await ev(`toggleSelfAcct('c1');`); await sleep(300);            // desmarca c1
await ev(`openDetail('c2');`); await sleep(400);
const st6btn = await ev(`/Marcar como mi cuenta/.test((document.getElementById('d-selfacct')||{}).textContent||'')`);
check('ST6a al desmarcar, la ficha de c2 vuelve a ofrecer "Marcar como mi cuenta"', st6btn === true, 'btn=' + st6btn);
await ev(`toggleSelfAcct('c2');`); await sleep(300);            // marca c2
await ev(`gp('p-home',document.getElementById('sbi-home'),'Inicio');renderHome();`); await sleep(400);
const st6 = await ev(`(()=>{const el=document.getElementById('h-mytraining');const t=el?el.innerText.replace(/\\s+/g,' ').trim():'';return {disp:el?el.style.display:'?',empty:/Aún no registras/.test(t),name:/Andrea Molina/.test(t)};})()`);
check('ST6b cuenta sin historial → tarjeta visible con estado vacío ("Aún no registras…")', st6.disp === 'block' && st6.empty && st6.name, JSON.stringify(st6));

// ST7: desmarcar → ax_selfclient vacío y la tarjeta del Inicio se oculta de nuevo.
await ev(`openDetail('c2');`); await sleep(400);
await ev(`toggleSelfAcct('c2');`); await sleep(300);
await ev(`gp('p-home',document.getElementById('sbi-home'),'Inicio');renderHome();`); await sleep(400);
const st7 = await ev(`(()=>{const el=document.getElementById('h-mytraining');return {ls:JSON.parse(localStorage.getItem('ax_selfclient')||'""'),disp:el?el.style.display:'?'};})()`);
check('ST7 desmarcar → ax_selfclient vacío y tarjeta oculta', st7.ls === '' && st7.disp === 'none', JSON.stringify(st7));

// Shot de la ficha con el chip "Mi cuenta" marcado (c1).
await ev(`(()=>{localStorage.setItem('ax_selfclient',JSON.stringify('c1'));openDetail('c1');})()`); await sleep(600);
await shotFull('selftraining-ficha-chip');

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «MI ENTRENAMIENTO» (v369) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
