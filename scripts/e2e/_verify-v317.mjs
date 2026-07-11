// Verificación E2E de v317 (estudio, mejora 7): ORDEN INTELIGENTE de asesorados en el panel
// del coach. sortClientsByAttention (avi-core, puro) ordena #cli-list por urgencia:
// dolor → plan vencido → por vencer → inactivo (días desc) → al día; desempate por nombre.
// Patrón preview-sin-login: se inyectan asesorados fake y se llama renderClients() directo
// (cero login → cero rate-limit → cero riesgo a producción; nada toca la nube).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8786;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v317-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9286', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9286/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

try {
  // Esperar a que los scripts estén cargados (no hace falta login para este panel).
  const ready = await waitFor(`(typeof renderClients==='function' && typeof sortClientsByAttention==='function' && typeof DB==='object' && !!document.getElementById('cli-list'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (renderClients/sortClientsByAttention/DB/#cli-list)');

  // Inyectar asesorados fake que cubren cada tier. Fechas relativas al now REAL (renderClients
  // usa new Date()). Nombres elegidos para probar el desempate alfabético dentro de un tier.
  await ev(`(()=>{
    const now=Date.now(); const d=n=>new Date(now+n*86400000).toISOString();
    const base={level:'Intermedio',goal:'Ganar músculo',days:3,routines:[{id:'r1',day:'Lunes',name:'Full body',exercises:[]}],createdAt:d(-90),selfReg:false};
    DB.clients=[
      {...base,id:'ok',   name:'Mónica Al Día',      payments:[{dueDate:d(20)}]},
      {...base,id:'pain', name:'Pablo Dolor',        payments:[{dueDate:d(20)}], painCare:[{id:'p1',level:3,area:'rodilla',at:d(-1)}]},
      {...base,id:'over', name:'Vera Vencida',       payments:[{dueDate:d(-3)}]},
      {...base,id:'exp',  name:'Elena Por Vencer',   payments:[{dueDate:d(4)}]},
      {...base,id:'idle12',name:'Iván Doce',         payments:[{dueDate:d(20)}]},
      {...base,id:'idle9a',name:'Bruno Nueve',       payments:[{dueDate:d(20)}]},
      {...base,id:'idle9b',name:'Ana Nueve',         payments:[{dueDate:d(20)}]},
    ];
    DB.history={
      ok:[{date:d(0)}], pain:[{date:d(-1)}], over:[{date:d(-1)}], exp:[{date:d(-1)}],
      idle12:[{date:d(-12)}], idle9a:[{date:d(-9)}], idle9b:[{date:d(-9)}],
    };
    DB.msgs={};
    window._idsBefore=DB.clients.map(c=>c.id).join(',');
    renderClients();
  })()`);
  await sleep(400);

  // R1: el ORDEN de las tarjetas por nombre visible sigue la prioridad esperada.
  const order = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('#cli-list .cli .cn')].map(e=>e.textContent.trim()))`));
  const expected = ['Pablo Dolor', 'Vera Vencida', 'Elena Por Vencer', 'Iván Doce', 'Ana Nueve', 'Bruno Nueve', 'Mónica Al Día'];
  check('R1 orden por urgencia (dolor→vencido→por vencer→inactivo dias desc→desempate nombre→al día)',
        JSON.stringify(order) === JSON.stringify(expected), JSON.stringify(order));

  // R2: chip de atención con la RAZÓN correcta por asesorado (busca cada tarjeta por nombre).
  const chips = JSON.parse(await ev(`JSON.stringify((()=>{
    const byName={};[...document.querySelectorAll('#cli-list .cli')].forEach(card=>{
      const nm=card.querySelector('.cn')?.textContent.trim();
      const pills=[...card.querySelectorAll('.cli-pill')].map(p=>p.textContent.trim());
      byName[nm]=pills;
    });return byName;})())`));
  const has = (nm, re) => (chips[nm] || []).some(t => re.test(t));
  check('R2 chip dolor "impide" en el de nivel 3', has('Pablo Dolor', /impide entrenar/i), JSON.stringify(chips['Pablo Dolor']));
  check('R2 chip "Plan vencido"', has('Vera Vencida', /vencido/i), JSON.stringify(chips['Vera Vencida']));
  check('R2 chip "Plan por vencer"', has('Elena Por Vencer', /por vencer/i), JSON.stringify(chips['Elena Por Vencer']));
  check('R2 chip "12 días sin entrenar"', has('Iván Doce', /12 días sin entrenar/), JSON.stringify(chips['Iván Doce']));

  // R3: el asesorado al día NO tiene chip de atención (solo el pill de estado del día).
  check('R3 al día sin chip de atención (evita ruido)',
        !has('Mónica Al Día', /dolor|vencid|vencer|sin entrenar|estrena/i), JSON.stringify(chips['Mónica Al Día']));

  // R4: renderClients NO mutó el orden de DB.clients (home y otras vistas lo comparten).
  const notMutated = await ev(`(DB.clients.map(c=>c.id).join(',')===window._idsBefore)`);
  check('R4 DB.clients NO se reordena (copia, no mutación)', notMutated === true, String(notMutated));

  // R5: determinismo — dos renders seguidos dan el MISMO orden (el poll de 15s no salta).
  const order2 = JSON.parse(await ev(`(()=>{renderClients();return JSON.stringify([...document.querySelectorAll('#cli-list .cli .cn')].map(e=>e.textContent.trim()))})()`));
  check('R5 orden estable entre renders (determinista)', JSON.stringify(order2) === JSON.stringify(expected), JSON.stringify(order2));

  // R6: "aún no estrena" sólo veterano CON rutinas; recién creado no molesta.
  const nostart = JSON.parse(await ev(`JSON.stringify((()=>{
    const now=Date.now(); const d=n=>new Date(now+n*86400000).toISOString();
    const base={level:'Intermedio',goal:'x',days:3,payments:[{dueDate:d(20)}]};
    DB.clients=[
      {...base,id:'nuevo',name:'Recién Creado',createdAt:d(-2),routines:[{id:'r1',day:'Lunes',name:'x',exercises:[]}]},
      {...base,id:'veterano',name:'Veterano Sin Estrenar',createdAt:d(-30),routines:[{id:'r1',day:'Lunes',name:'x',exercises:[]}]},
      {...base,id:'sinrut',name:'Veterano Sin Rutinas',createdAt:d(-30),routines:[]},
    ];
    DB.history={}; DB.msgs={}; renderClients();
    const byName={};[...document.querySelectorAll('#cli-list .cli')].forEach(card=>{
      byName[card.querySelector('.cn')?.textContent.trim()]=[...card.querySelectorAll('.cli-pill')].map(p=>p.textContent.trim());});
    return byName;})())`));
  const has2 = (nm, re) => (nostart[nm] || []).some(t => re.test(t));
  check('R6 veterano con rutinas sin estrenar → "Aún no estrena"', has2('Veterano Sin Estrenar', /no estrena/i), JSON.stringify(nostart['Veterano Sin Estrenar']));
  check('R6 recién creado → SIN chip de atención', !has2('Recién Creado', /no estrena|sin entrenar/i), JSON.stringify(nostart['Recién Creado']));
  check('R6 veterano SIN rutinas → NO "aún no estrena" (ya lo grita "sin rutinas")', !has2('Veterano Sin Rutinas', /no estrena/i), JSON.stringify(nostart['Veterano Sin Rutinas']));

  // R7: SUSPENDIDO (pausado por el coach) → al fondo, sin chip de atención, DEBAJO de un sano
  // al día — aunque no entrene hace 30 días y tenga dolor (aviso Lucas v317).
  const susp = JSON.parse(await ev(`JSON.stringify((()=>{
    const now=Date.now(); const d=n=>new Date(now+n*86400000).toISOString();
    const base={level:'Intermedio',goal:'x',days:3,payments:[{dueDate:d(20)}],routines:[{id:'r1',day:'Lunes',name:'x',exercises:[]}],createdAt:d(-90)};
    DB.clients=[
      {...base,id:'susp',name:'Sara Suspendida',suspended:true,painCare:[{id:'p',level:3,at:d(-1)}]},
      {...base,id:'sano',name:'Zoe Sana'},
    ];
    DB.history={susp:[{date:d(-30)}],sano:[{date:d(0)}]};
    DB.msgs={}; renderClients();
    const cards=[...document.querySelectorAll('#cli-list .cli')];
    const names=cards.map(c=>c.querySelector('.cn')?.textContent.trim());
    const suspCard=cards.find(c=>/Sara/.test(c.querySelector('.cn')?.textContent||''));
    const pills=[...suspCard.querySelectorAll('.cli-pill')].map(p=>p.textContent.trim());
    return {names,pills};})())`));
  check('R7 suspendido SIN chip de atención (no "sin entrenar" ni dolor)',
        !susp.pills.some(t => /sin entrenar|dolor|impide|estrena/i.test(t)), JSON.stringify(susp.pills));
  check('R7 suspendido queda DEBAJO del sano al día',
        susp.names.indexOf('Sara Suspendida') > susp.names.indexOf('Zoe Sana'), JSON.stringify(susp.names));

  // Restaurar la lista completa y tomar shots claro/oscuro de la lista ordenada.
  await ev(`(()=>{const now=Date.now(); const d=n=>new Date(now+n*86400000).toISOString();
    const base={level:'Intermedio',goal:'Ganar músculo',days:3,routines:[{id:'r1',day:'Lunes',name:'Full body',exercises:[]}],createdAt:d(-90)};
    DB.clients=[
      {...base,id:'pain',name:'Pablo Dolor',payments:[{dueDate:d(20)}],painCare:[{id:'p1',level:3,area:'rodilla',at:d(-1)}]},
      {...base,id:'over',name:'Vera Vencida',payments:[{dueDate:d(-3)}]},
      {...base,id:'exp',name:'Elena Por Vencer',payments:[{dueDate:d(4)}]},
      {...base,id:'idle12',name:'Iván Doce',payments:[{dueDate:d(20)}]},
      {...base,id:'ok',name:'Mónica Al Día',payments:[{dueDate:d(20)}]},
    ];
    DB.history={pain:[{date:d(-1)}],over:[{date:d(-1)}],exp:[{date:d(-1)}],idle12:[{date:d(-12)}],ok:[{date:d(0)}]};
    DB.msgs={}; renderClients();
    ['avi-loading','s-login'].forEach(i=>{const e=document.getElementById(i);if(e){e.style.display='none';e.classList.remove('on');}});
    document.querySelectorAll('.screen').forEach(s=>{s.style.display='none';s.classList.remove('on');});
    const sc=document.getElementById('s-coach'); if(sc){sc.style.display='';sc.classList.add('on');}
    try{ gp('p-clients',document.getElementById('sbi-clients'),'Asesorados',true); }
    catch(e){ document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
      const pc=document.getElementById('p-clients'); if(pc)pc.classList.add('on'); }
    renderClients();
    document.documentElement.setAttribute('data-theme','light');
  })()`);
  await sleep(400); await shot('v317-orden-claro');
  await ev(`document.documentElement.setAttribute('data-theme','dark')`);
  await sleep(400); await shot('v317-orden-oscuro');

  log('\njsErrors: ' + JSON.stringify(jsErrors));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log('\n' + (fails === 0 && jsErrors.length === 0 ? 'TODO OK' : fails + ' FALLA(S)'));
  process.exitCode = (fails === 0 && jsErrors.length === 0) ? 0 : 1;
} catch (e) {
  log('ERROR: ' + (e && e.message));
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
