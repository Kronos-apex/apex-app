// Verificación E2E de v583: LA NOTA DE RENOVACIONES PENDIENTES en las cifras del Inicio.
//
// 🔴 Nace de DESMENTIR un hallazgo de la auditoría del 6-sep («Ingresos mes» y «Activos» medirían
// la cadencia con que el coach teclea los pagos). Medido contra los 26 pagos reales: es falso.
// Lo que pasa es un artefacto del CICLO — casi todos renuevan los primeros días del mes, así que
// el día 6 el tablero muestra la caja casi en cero y «Activos» en mínimos POR DISEÑO, con media
// lista en gracia. Decisión del PO: no se cambia ninguna definición, se pone al lado lo que falta.
//
// 🔒 Se afirma la CONSECUENCIA (qué lee el coach y si le cabe), no la presencia de un selector.
// Patrón preview-SIN-login.
//
// Corre: node scripts/e2e/_verify-renovaciones.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8797;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-renov-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9297', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9297/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { await ev("(()=>{const e=document.getElementById('h-ingr');if(e)e.scrollIntoView({block:'center'});})()"); await sleep(250); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

// gente = [{nombre, venceEnDias, monto}] — venceEnDias negativo = ya venció.
async function escenario(gente) {
  const r = await ev(`(()=>{try{
    const now=Date.now(), d=n=>new Date(now+n*86400000).toISOString();
    DB.clients=${JSON.stringify(gente)}.map((g,i)=>({
      id:'fk'+i, name:g.nombre, days:3, level:'Intermedio', goal:'Fuerza',
      routines:[{id:'r'+i,day:'Lunes',name:'Full body',exercises:[]}],
      payments:[{date:d(g.venceEnDias-30),dueDate:d(g.venceEnDias),amount:g.monto,note:''}]
    }));
    DB.history={}; DB.prs={};
    renderHome();
    return 'ok';
  }catch(e){return String(e&&e.stack||e);}})()`);
  if (r !== 'ok') throw new Error('MONTAJE falló → ' + r);
  await sleep(350);
}

// Lee SOLO lo visible de las dos baldosas, y si la nota se sale de su caja.
const leer = () => ev(`(()=>{
  // OJO: preguntarle a la BALDOSA si desborda mezcla dos cosas — la cifra grande (32px sobre una
  // baldosa de ~160px) ya desborda por su cuenta, sin nota ninguna. Se mide lo de la NOTA:
  // que su propio texto quepa en su ancho, y que no se salga de la caja de la baldosa.
  // El desborde de la baldosa se reporta aparte, como CONTEXTO, y el control lo compara con el
  // mismo dato medido SIN la nota.
  const caja=(id)=>{const e=document.getElementById(id);if(!e)return null;
    const b=e.closest('button'); const rb=b?b.getBoundingClientRect():null, re=e.getBoundingClientRect();
    return {txt:e.textContent.trim(), visible:getComputedStyle(e).display!=='none',
      desborda: (e.scrollWidth>e.clientWidth+1) || !!(rb && re.right>rb.right-1),
      baldosaDesborda: !!(b && b.scrollWidth>b.clientWidth+1),
      altoCaja: rb?Math.round(rb.height):0};};
  return JSON.stringify({
    ingr:(document.getElementById('h-ingr')||{}).textContent||'',
    actv:(document.getElementById('h-actv')||{}).textContent||'',
    notaIngr:caja('h-ingr-nota'), notaActv:caja('h-actv-nota')
  });
})()`).then(JSON.parse);

try {
  const ready = await waitFor(`(typeof renderHome==='function' && typeof coachPendingRenewals==='function' && !!document.getElementById('h-ingr-nota'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (renderHome/coachPendingRenewals/#h-ingr-nota)');
  await ev(`(()=>{try{['apex-loading','avi-loading'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});}catch(e){}
                  try{showScreen('s-coach');}catch(e){}
                  try{if(typeof gp==='function')gp('p-home');}catch(e){}})()`);
  await sleep(400);

  // ── N1: el caso REAL del 6-sep (media lista en gracia) ──
  log('\n=== N1: el día 6, con media lista en gracia ===');
  await escenario([
    { nombre: 'Astrid', venceEnDias: -4, monto: 150000 },
    { nombre: 'Kathe', venceEnDias: -4, monto: 150000 },
    { nombre: 'Claudia', venceEnDias: -4, monto: 130000 },
    { nombre: 'Samuel', venceEnDias: -1, monto: 125000 },
    { nombre: 'Danilo', venceEnDias: 14, monto: 150000 },   // al día
  ]);
  let v = await leer();
  log('    ' + JSON.stringify({ ingr: v.ingr, actv: v.actv, n1: v.notaIngr.txt, n2: v.notaActv.txt }));
  check('N1a la caja del mes NO cambia (sigue siendo la plata que entró)', v.ingr === '$0', v.ingr);
  check('N1b «Activos» NO cambia: la gracia no cuenta como al día (v528)', v.actv === '1', v.actv);
  check('N1c pero ahora se DICE cuántos faltan por renovar', v.notaIngr.visible && /4 por renovar/.test(v.notaIngr.txt), v.notaIngr.txt);
  check('N1d con la plata estimada y marcada como estimación', /≈\$555\.000/.test(v.notaIngr.txt), v.notaIngr.txt);
  check('N1e y «Activos» explica su propio número', v.notaActv.visible && /4 en gracia/.test(v.notaActv.txt), v.notaActv.txt);
  check('N1f la nota cabe en su baldosa', v.notaIngr.desborda === false && v.notaActv.desborda === false, JSON.stringify([v.notaIngr, v.notaActv]));
  // CONTROL: ¿la baldosa ya desbordaba SIN la nota? Si sí, es preexistente (la cifra a 32px) y
  // no lo causó este cambio — pero se REPORTA, porque un margen que no falla todavía no es que
  // funcione (la lección de los 386 de 390 px del calendario, v453).
  const sinNota = JSON.parse(await ev(`(()=>{const n1=document.getElementById('h-ingr-nota'),n2=document.getElementById('h-actv-nota');
    const d1=n1.style.display,d2=n2.style.display; n1.style.display='none'; n2.style.display='none';
    const b1=n1.closest('button'), b2=n2.closest('button');
    const r={ingr:b1.scrollWidth>b1.clientWidth+1, actv:b2.scrollWidth>b2.clientWidth+1};
    n1.style.display=d1; n2.style.display=d2; return JSON.stringify(r);})()`));
  log('    baldosa desborda SIN nota -> ' + JSON.stringify(sinNota) + ' · CON nota -> ' +
      JSON.stringify({ingr:v.notaIngr.baldosaDesborda, actv:v.notaActv.baldosaDesborda}));
  check('N1g la nota no EMPEORA el ancho de la baldosa',
    (v.notaIngr.baldosaDesborda === sinNota.ingr) && (v.notaActv.baldosaDesborda === sinNota.actv),
    JSON.stringify({sinNota, conNota:{ingr:v.notaIngr.baldosaDesborda, actv:v.notaActv.baldosaDesborda}}));
  await shot('renov-n1-390');

  // ── N2: CONTROL · sin nadie en gracia NO se fabrica ruido ──
  log('\n=== N2: CONTROL · nadie en gracia ===');
  await escenario([
    { nombre: 'Danilo', venceEnDias: 14, monto: 150000 },
    { nombre: 'Diana', venceEnDias: 27, monto: 120000 },
  ]);
  v = await leer();
  check('N2a sin renovaciones pendientes las dos notas desaparecen',
    v.notaIngr.visible === false && v.notaActv.visible === false, JSON.stringify([v.notaIngr.visible, v.notaActv.visible]));
  check('N2b y las cifras siguen ahí', v.actv === '2', v.actv);

  // ── N3: el vencido de hace un mes NO infla la expectativa ──
  log('\n=== N3: el que ya se fue ===');
  await escenario([
    { nombre: 'Ido', venceEnDias: -37, monto: 20000 },
    { nombre: 'EnGracia', venceEnDias: -3, monto: 130000 },
  ]);
  v = await leer();
  check('N3 solo cuenta el de gracia, no el de 37 días', /1 por renovar/.test(v.notaIngr.txt) && /≈\$130\.000/.test(v.notaIngr.txt), v.notaIngr.txt);

  // ── N4: 360px y tema claro (barra premium) ──
  log('\n=== N4: 360px + claro ===');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await ev(`(()=>{try{setTheme('light');}catch(e){document.body.classList.remove('dark');}})()`);
  await escenario([
    { nombre: 'Astrid', venceEnDias: -4, monto: 150000 },
    { nombre: 'Kathe', venceEnDias: -4, monto: 150000 },
    { nombre: 'Claudia', venceEnDias: -4, monto: 130000 },
    { nombre: 'Samuel', venceEnDias: -1, monto: 125000 },
    { nombre: 'Luz', venceEnDias: -4, monto: 130000 },
    { nombre: 'Nataly', venceEnDias: -6, monto: 30000 },
    { nombre: 'Miguel', venceEnDias: -3, monto: 0 },
    { nombre: 'Danilo', venceEnDias: 14, monto: 150000 },
  ]);
  v = await leer();
  check('N4a el caso real completo (7 en gracia, uno con pago de $0)', /7 por renovar/.test(v.notaIngr.txt) && /≈\$715\.000/.test(v.notaIngr.txt), v.notaIngr.txt);
  check('N4b a 360px la nota sigue cabiendo', v.notaIngr.desborda === false && v.notaActv.desborda === false, JSON.stringify([v.notaIngr, v.notaActv]));
  await shot('renov-n4-360-claro');

} catch (e) { results.push('FATAL ' + e.message); }
finally {
  const errs = [...new Set(jsErrors)].slice(0, 8);
  log('\n===RESUMEN===');
  results.forEach(r => log(r));
  log('jsErrors: ' + JSON.stringify(errs));
  const bad = results.filter(r => !r.startsWith('OK'));
  log(bad.length ? `\n${bad.length} FALLA(S)` : '\nTODO OK');
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(bad.length ? 1 : 0);
}
