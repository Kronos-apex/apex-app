// v670 · LOS AVISOS DOBLES tras la mudanza, ejecutando `subscribePush` DE VERDAD con un cliente de
// Supabase FALSO (nada sale a la red): se registran las llamadas y se afirma qué pidió y qué borró.
// Se sirve una COPIA del repo con `AVI_HOME_ORIGIN` apuntado a este mismo puerto, para que la página
// SEA el hogar nuevo; el control apunta el hogar a otro puerto (la página es la dirección vieja).
//   D1 la suscripción que se guarda lleva el origen que la creó.
//   D2 en el hogar nuevo lee las suscripciones de ESTA persona y borra la de la dirección vieja y la sin
//      marca, nunca la de este aparato ni la de otro aparato ya en el hogar nuevo.
//   D3 el borrado va DESPUÉS de guardar la nueva (nunca un hueco sin avisos).
//   D4 (control) en la dirección vieja no lee ni borra nada.
// Corre: node scripts/e2e/_verify-avisos-dobles.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cpSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
const SRV = fileURLToPath(new URL('./_mudanza-srv', import.meta.url));
const REPO = fileURLToPath(new URL('../..', import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, c, x = '') => { results.push((c ? 'OK ' : 'FAIL ') + n); console.log('  ' + (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };

// Un puerto por escenario: cada uno es otro ORIGEN, con su propio service worker y su propia caché
// (con el mismo puerto, el segundo escenario podría servirse de la caché del primero).
function copia(hogar) {
  const TMP = process.env.TEMP + '/avi-dobles-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  mkdirSync(TMP, { recursive: true });
  for (const f of ['index.html', 'sw.js', 'manifest.json', 'styles.css', 'foods.json', 'avi-core.js', 'muscle-map.js', 'exercise-muscles.js',
    'app-1-infra.js', 'app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'app-7-community.js']) cpSync(REPO + '/' + f, TMP + '/' + f);
  cpSync(REPO + '/icons', TMP + '/icons', { recursive: true });
  let a1 = readFileSync(TMP + '/app-1-infra.js', 'utf8');
  const ancla = "const AVI_HOME_ORIGIN='https://app.avientrena.com';";
  if (a1.split(ancla).length - 1 !== 1) { console.log('🔴 MONTAJE: AVI_HOME_ORIGIN no aparece exactamente una vez'); process.exit(1); }
  a1 = a1.replace(ancla, () => `const AVI_HOME_ORIGIN='${hogar}';`);
  writeFileSync(TMP + '/app-1-infra.js', a1);
  return TMP;
}

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9394', '--user-data-dir=' + process.env.TEMP + '/doblesprof-' + Date.now(), '--no-first-run', 'about:blank']);
let page; for (let i = 0; i < 60; i++) { try { const t = await (await fetch('http://127.0.0.1:9394/json/list')).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch {} await sleep(400); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.on('open', r));
let id = 1; const pend = new Map(); const jsErr = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErr.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise(r => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');

// El montaje dentro de la página: permiso concedido, un service worker falso con la suscripción de ESTE
// aparato, y un cliente de Supabase que solo ANOTA (select devuelve las filas del escenario).
const MONTAJE = `(async()=>{
  Object.defineProperty(Notification,'permission',{get:()=>'granted',configurable:true});
  const subFalsa={endpoint:'https://fcm/ep-nuevo',toJSON:()=>({endpoint:'https://fcm/ep-nuevo',expirationTime:null,keys:{p256dh:'k',auth:'a'}})};
  window._swReg={pushManager:{getSubscription:async()=>subFalsa,subscribe:async()=>subFalsa}};
  window.AVI_ALLOW_CLOUD_WRITE=true;
  window.__llamadas=[];
  const filas=[
    {id:'vieja',subscription:{endpoint:'https://fcm/ep-viejo',keys:{},origin:'https://kronos-apex.github.io'}},
    {id:'sinmarca',subscription:{endpoint:'https://fcm/ep-antes',keys:{}}},
    {id:'actual',subscription:{endpoint:'https://fcm/ep-nuevo',keys:{}}},
    {id:'otro',subscription:{endpoint:'https://fcm/ep-pc',keys:{},origin:location.origin}},
  ];
  const q=tabla=>{ const c={tabla,ops:[]};
    const api={
      upsert:(v,o)=>{ c.ops.push(['upsert',v]); window.__llamadas.push(c); return Promise.resolve({error:null}); },
      select:cols=>{ c.ops.push(['select',cols]); return api; },
      delete:()=>{ c.ops.push(['delete']); return api; },
      eq:(k,v)=>{ c.ops.push(['eq',k,v]); if(c.ops[0][0]==='select'){ window.__llamadas.push(c); return Promise.resolve({data:filas,error:null}); } return api; },
      in:(k,v)=>{ c.ops.push(['in',k,v]); window.__llamadas.push(c); return Promise.resolve({error:null}); },
    };
    return api; };
  AUTH.client=()=>({from:q});
  AUTH.getUser=async()=>({id:'u-prueba'});
  const ok=await subscribePush('u-prueba',[],null,true);
  return {ok, llamadas:window.__llamadas.map(c=>c.ops)};
})()`;

async function escenario(puerto, hogar) {
  const TMP = copia(hogar);
  const srv = spawn('python', [SRV + '/rootsrv.py', String(puerto), TMP]); await sleep(1000);
  await send('Page.navigate', { url: `http://127.0.0.1:${puerto}/` }); await sleep(4000);
  const listo = await ev("typeof subscribePush==='function' && typeof AUTH==='object'");
  const r = listo ? await ev(MONTAJE) : null;
  srv.kill(); await sleep(400);
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
  return { listo, r };
}

// ── En el HOGAR NUEVO (la página es el hogar)
const nuevo = await escenario(8863, 'http://127.0.0.1:8863');
check('MONTAJE la app cargó y subscribePush corrió', nuevo.listo && nuevo.r && nuevo.r.ok === true, JSON.stringify(nuevo.r && nuevo.r.ok));
const ops = (nuevo.r && nuevo.r.llamadas) || [];
const iUp = ops.findIndex(o => o[0][0] === 'upsert');
const up = iUp >= 0 ? ops[iUp][0][1] : null;
check('D1 la suscripción guardada dice de qué dirección es', up && up.subscription && up.subscription.origin === 'http://127.0.0.1:8863' && up.subscription.endpoint === 'https://fcm/ep-nuevo', JSON.stringify(up && up.subscription));
const iSel = ops.findIndex(o => o[0][0] === 'select');
const sel = iSel >= 0 ? ops[iSel] : null;
check('D2a lee SOLO las suscripciones de esta persona', sel && sel.some(o => o[0] === 'eq' && o[1] === 'client_id' && o[2] === 'u-prueba'), JSON.stringify(sel));
const iDel = ops.findIndex(o => o[0][0] === 'delete');
const del = iDel >= 0 ? ops[iDel] : null;
const borradas = del ? (del.find(o => o[0] === 'in') || [])[2] : null;
check('D2b borra la de la dirección vieja y la sin marca', Array.isArray(borradas) && borradas.slice().sort().join() === 'sinmarca,vieja', JSON.stringify(borradas));
check('D2c no borra la de este aparato ni la de otro aparato ya mudado', Array.isArray(borradas) && !borradas.includes('actual') && !borradas.includes('otro'));
check('D3 el borrado va DESPUÉS de guardar la nueva', iUp >= 0 && iDel > iUp, `upsert #${iUp} · delete #${iDel}`);

// ── (control) en la DIRECCIÓN VIEJA: el hogar es otro sitio
const viejo = await escenario(8864, 'https://app.avientrena.com');
const opsV = (viejo.r && viejo.r.llamadas) || [];
check('D4 (control) en la dirección vieja guarda, pero no lee ni borra nada', viejo.r && viejo.r.ok === true && opsV.some(o => o[0][0] === 'upsert') && !opsV.some(o => o[0][0] === 'select' || o[0][0] === 'delete'), JSON.stringify(opsV.map(o => o[0][0])));

console.log('\njsErrors: ' + JSON.stringify(jsErr));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
console.log(fallas || jsErr.length ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
try { ws.close(); } catch {} chrome.kill();
process.exit(fallas || jsErr.length ? 1 : 0);
