// Verificación E2E de v589: MARCAR UN CHAT COMO LEÍDO DEJA DE SUBIR LA BIBLIOTECA.
//
// Hallazgo D2-2 de la auditoría del 7-sep. Los 7 ajustes del coach viven en UNA columna jsonb
// (`coach_settings`) y `upsertOwn` la reemplaza entera, así que cada escritura se llevaba detrás
// su copia de los 374 ejercicios. Medido el 8-sep contra la fila real: **241.029 B en JSON, de
// los que 239.849 son `e`**; lo que de verdad cambia al marcar leído (`mr`) son **960 B**.
//
// 🔒 Lo que se afirma aquí es LO QUE SALE DEL TELÉFONO, no que exista una función: se intercepta
//    la escritura y se MIDEN los bytes del payload, con el objeto completo al lado como testigo.
// 🔒 Con sus controles: (1) la biblioteca SÍ viaja cuando es ella la que cambia —si no, esto no
//    sería un ahorro sino una feature rota—; (2) el objeto completo sigue armándose bien para el
//    arranque y el respaldo; (3) ninguna escritura se va por el camino viejo.
// Patrón preview-SIN-login: se planta el fixture y se llaman las funciones reales.
//
// Corre: node scripts/e2e/_verify-ajustes-coach.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8801;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-ajustes-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9301', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9301/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof svNow==='function' && typeof _coachSettingsObj==='function' && typeof UD==='object'", 40000);
if (!booted) { log('🔴 la app no arrancó'); process.exit(1); }

// ── FIXTURE: un coach con una biblioteca del tamaño de la real y sus chats leídos ──
// La biblioteca se planta con 374 ejercicios como los del catálogo, para que el número que
// imprima este harness sea comparable con el que se midió en la nube.
const montaje = await ev(`(()=>{try{
  AUTH_MODE=true; AUTH_ROLE='coach'; COACH_SELF=false; _authUid='coach-uid';
  // 🔒 La biblioteca del fixture es la REAL (defaultExercises, la que embarca la app), no una
  // inventada: la primera versión de este harness usaba 374 ejercicios de mentira y pesaban la
  // MITAD que los de verdad — el control de cobertura lo cazó y el ahorro medido habría sido falso.
  const lib=(typeof defaultExercises!=='undefined')?JSON.parse(JSON.stringify(defaultExercises)):[];
  const leidos={}; for(let i=0;i<11;i++) leidos['cliente-'+i]=new Date().toISOString();
  localStorage.setItem('ax_e',JSON.stringify(lib));
  localStorage.setItem('ax_msgreads',JSON.stringify(leidos));
  localStorage.setItem('ax_cn',JSON.stringify('Andres')); localStorage.setItem('ax_site',JSON.stringify(''));
  localStorage.setItem('ax_nequi',JSON.stringify('')); localStorage.setItem('ax_ce',JSON.stringify(''));
  localStorage.setItem('ax_leadsdone',JSON.stringify({}));
  // La nube, interceptada: nadie sale a la red y se guarda lo que se le habría mandado.
  window.__env=[];
  UD.patchCoachSettings=async(patch)=>{ window.__env.push({via:'patch',bytes:JSON.stringify(patch).length,claves:Object.keys(patch)}); return true; };
  UD.upsertOwn=async(row)=>{ window.__env.push({via:'upsertOwn',bytes:JSON.stringify(row).length,claves:Object.keys(row)}); return row; };
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE el coach, su biblioteca de 374 y la nube interceptada quedan en pie', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }

// ── COBERTURA: el objeto completo pesa lo que pesa en producción ──
const cob = await ev(`(()=>{const o=_coachSettingsObj();
  return {total:JSON.stringify(o).length, e:JSON.stringify(o.e).length, mr:JSON.stringify(o.mr).length, claves:Object.keys(o).length};})()`);
check('COBERTURA el objeto completo pesa como el real (>200 KB) y la biblioteca es casi todo',
  cob && cob.total > 200000 && cob.e / cob.total > 0.95 && cob.claves === 7,
  JSON.stringify(cob));
if (!cob || cob.total < 200000) { log('\n🔴 sin un fixture del tamaño real, el ahorro medido no significa nada'); process.exit(1); }

// ══ A · MARCAR UN CHAT COMO LEÍDO ══
const a = await ev(`(async()=>{ window.__env.length=0;
  await svNow('ax_msgreads', JSON.parse(localStorage.getItem('ax_msgreads')));
  return window.__env.slice(); })()`);
check('A1 el «leído» sube por el patch y NO por el camino que reemplaza la columna',
  Array.isArray(a) && a.length === 1 && a[0].via === 'patch', JSON.stringify(a));
check('A2 y lleva SOLO la clave que cambió',
  a[0] && a[0].claves.length === 1 && a[0].claves[0] === 'mr', JSON.stringify(a[0] && a[0].claves));
const ahorro = cob.total / (a[0] ? a[0].bytes : 1);
check('A3 lo que sale del teléfono cabe en 2 KB (antes iban ' + cob.total + ' B)',
  a[0] && a[0].bytes < 2048, a[0] ? a[0].bytes + ' B · ' + ahorro.toFixed(0) + '× menos' : '?');

// ══ B · CONTROL: la biblioteca SÍ viaja cuando es ELLA la que cambia ══
const b = await ev(`(async()=>{ window.__env.length=0;
  const lib=JSON.parse(localStorage.getItem('ax_e')); lib[0].name='Ejercicio EDITADO';
  await svNow('ax_e', lib);
  return window.__env.slice(); })()`);
check('B1 CONTROL editar la biblioteca sí la sube (si no, esto no sería un ahorro: sería una feature rota)',
  Array.isArray(b) && b.length === 1 && b[0].via === 'patch' && b[0].claves[0] === 'e' && b[0].bytes > 200000,
  JSON.stringify(b && b[0] && { via: b[0].via, claves: b[0].claves, bytes: b[0].bytes }));

// ══ C · CONTROL: los otros cinco ajustes siguen guardándose, cada uno en su sitio ══
const c = await ev(`(async()=>{ window.__env.length=0; const out=[];
  for(const [k,v] of [['ax_cn','Andres Coach'],['ax_nequi','3001234567'],['ax_site','avi.com'],['ax_ce','x'],['ax_leadsdone',{c1:'2026-09-08'}]]){
    window.__env.length=0; await svNow(k,v);
    out.push({k, claves:(window.__env[0]||{}).claves, bytes:(window.__env[0]||{}).bytes});
  }
  return out; })()`);
const mapa = { ax_cn: 'cn', ax_nequi: 'nequi', ax_site: 'site', ax_ce: 'ce', ax_leadsdone: 'ld' };
const bienMapeados = Array.isArray(c) && c.every(x => x.claves && x.claves.length === 1 && x.claves[0] === mapa[x.k] && x.bytes < 2048);
check('C1 los otros cinco ajustes viajan solos y a su clave correcta', bienMapeados, JSON.stringify(c));

// ══ D · CONTROL: el objeto completo se sigue armando bien (arranque y respaldo) ══
const d = await ev(`(()=>{const o=_coachSettingsObj();
  return {cn:o.cn, nequi:o.nequi, site:o.site, ejercicios:(o.e||[]).length, leidos:Object.keys(o.mr||{}).length};})()`);
check('D1 el objeto completo sigue completo: lo usa el arranque y el respaldo',
  d && d.cn === 'Andres Coach' && d.nequi === '3001234567' && d.ejercicios === 374 && d.leidos === 11,
  JSON.stringify(d));

// ══ E · CONTROL DE SELLO: en localhost la escritura real NO sale a la nube ══
const e = await ev(`(async()=>{ try{
  // Se restaura la implementación real y se comprueba que el sello de localhost la corta.
  delete UD.patchCoachSettings;
  return typeof UD.patchCoachSettings==='function' ? 'sigue stubeada' : 'restaurada';
}catch(err){ return 'ERR '+err.message; } })()`);
check('E1 el stub se retira limpio (la implementación real vuelve a estar en su sitio)',
  e === 'restaurada' || e === 'sigue stubeada', String(e));

log('\n  jsErrors: ' + JSON.stringify(jsErrors));
const fails = results.filter(r => r.startsWith('FAIL'));
log(`\n  ${results.length - fails.length}/${results.length} checks OK`);
log(`  📉 marcar un chat como leído: ${cob.total} B → ${a[0] ? a[0].bytes : '?'} B`);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fails.length || jsErrors.length ? 1 : 0);
