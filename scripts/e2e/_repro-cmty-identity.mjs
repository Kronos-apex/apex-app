// _repro-cmty-identity.mjs — REPRO del bug reportado por el PO (2026-07-25):
// «vi la pantalla de comunidad de Astrid y en el perfil de ella aparecía el MÍO en la parte superior».
//
// CAUSA RAÍZ (no es del servidor: la consulta del perfil es `.eq('user_id', uid)` y la RLS
// no dejaría leer otra fila). Es identidad PEGADA en el cliente, por dos vías independientes:
//   (1) MEMORIA — `logout()` (app-2-login.js) limpia `ax_session` y `_pushCtx`, pero NO toca el
//       objeto CMTY. En todo el repo NO existe ningún `CMTY.profile = null` / `CMTY.uid = null` /
//       `CMTY.loaded = false`. Y `renderCommunity()` corta por `if(!CMTY.loaded) cmtyLoad()`:
//       con `loaded` en true de la cuenta anterior, NO recarga y pinta los datos de la anterior.
//       Como `logout()` tampoco recarga la página, el estado sobrevive al cambio de cuenta.
//   (2) DISCO — `ax_cmty_cache` (localStorage, SIN namespace por usuario) guarda `profile`+`friends`
//       y `_cmtyLoadCache()` lo carga en CUALQUIER fallo de `cmtyLoad` (offline, error de grant).
//       `logout()` tampoco lo borra. La misma clase que A2 extendió a «Hoy» con `ax_cmty_probe`.
//
// ALCANCE: no es solo el perfil. Lo que queda pegado incluye amigos, ❤️ recibidos, publicaciones
// y la BANDEJA DE MENSAJES (`dmThreads`: apodos y último mensaje de conversaciones ajenas).
//
// ESTADO: ARREGLADO (2026-07-26). Nació como repro en rojo; ahora es el HARNESS DE REGRESIÓN del
// bug — debe quedarse en verde para siempre. El fix: `cmtyResetIdentity()` (app-7) devuelve el
// objeto CMTY entero a su molde y borra las claves globales heredadas, `logout()` la llama, las
// claves locales llevan el uid del dueño (`cmtyLocalKey`, avi-core), y un candado de identidad
// corta tanto en `cmtyLoad`/`cmtyAdoptionProbe` (uid resuelto ≠ uid guardado) como en el render
// SÍNCRONO de la pestaña y de «Hoy» (cambio de cuenta que no pasa por `logout()`).
//
// P2 afirmaba el bug como conducta esperada («la identidad queda pegada»); con el fix afirma lo
// contrario: que al salir NO queda nada. P5 y P6 son nuevos: cambio de cuenta SIN `logout()` y
// separación real de las claves en disco.
// Sin login real ni red: cliente Supabase falso por cuenta. Sale con exit 1 si el bug REVIVE.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8873, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9373', '--user-data-dir=' + process.env.TEMP + '/cmtyid-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9373/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof cmtyLoad==='function' && typeof logout==='function' && !document.getElementById('avi-loading')`);
await sleep(1500);

const UID_COACH = '00000000-0000-0000-0000-00000000c0ac';
const UID_ASTRID = '00000000-0000-0000-0000-0000000a5721';

// Monta una cuenta: cliente falso que devuelve SU perfil y SUS DMs, y entra a la pestaña.
const ENTRAR = (uid, handle, dmCon) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-client');
  DB.clients=[{id:'c-${handle}',name:'${handle}',routines:[],habits:{water:{},steps:{}}}];
  CUR.clientId='c-${handle}'; CUR.loggedAs='client';
  const perfil={user_id:'${uid}',handle:'${handle}',avatar_url:null,bio:'',visible:true,is_private:true,
    role:'client',streak_weeks:3,sessions_4w:8,level:2,achievements:2,created_at:'2026-01-01',
    show_today:true,show_last_active:false,show_milestones:false,total_sessions:20,training_since:'2026-01-01',
    share_code:'CODE-${handle}'};
  const builder=(table)=>{const b={select(){return b;},insert(){return b;},update(){return b;},delete(){return b;},
    eq(){return b;},neq(){return b;},or(){return b;},in(){return b;},order(){return b;},limit(){return b;},
    maybeSingle(){return Promise.resolve({data:(table==='community_profiles')?perfil:null,error:null});},
    then(r){ if(table==='community_messages')return r({data:[{id:'m1',from_user:'x',to_user:'${uid}',body:'${dmCon}',created_at:new Date().toISOString(),read_at:null}],error:null});
             r({data:[],error:null}); }};
    return b;};
  AUTH.client=()=>({from:builder,rpc:()=>Promise.resolve({data:[],error:null}),
    functions:{invoke:async()=>({data:{ok:true},error:null})},
    channel:()=>({on(){return this;},subscribe(){return this;}}), removeChannel(){}});
  AUTH.getUser=async()=>({id:'${uid}'});
  _authUid='${uid}'; // lo que hace _enterAuthSession en el login real (uid de sesión, síncrono)
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// ── PASO 1: entra el COACH, abre Comunidad y su pestaña de ajustes (donde va su perfil arriba)
console.log('  1) entra el coach:', await ev(ENTRAR(UID_COACH, 'Andres', 'hola coach')));
await ev(`(async()=>{ await cmtyLoad(); cmtyGoView('settings'); })()`); await sleep(900);
const p1 = await ev(`(()=>{const h=document.getElementById('cn-community');return {uid:CMTY.uid,perfil:(CMTY.profile||{}).handle,loaded:CMTY.loaded,txt:(h.innerText||'').replace(/\\s+/g,' ').slice(0,90)};})()`);
check('P1 el coach ve SU propio perfil (estado de partida sano)', p1.perfil === 'Andres' && /Andres/.test(p1.txt), JSON.stringify(p1));

// ── PASO 2: CIERRA SESIÓN (como lo hace cualquiera, sin recargar la página)
await ev(`logout()`); await sleep(500);
const p2 = await ev(`(()=>({sesion:localStorage.getItem('ax_session'),uid:CMTY.uid,perfil:(CMTY.profile||{}).handle,loaded:CMTY.loaded,dm:(CMTY.dmThreads||[]).length,friends:(CMTY.friends||[]).length,posts:(CMTY.posts||[]).length,cache:!!localStorage.getItem('ax_cmty_cache'),authUid:(typeof _authUid!=='undefined'?_authUid:'n/a')}))()`);
check('P2 al «Salir» no queda NADA de la cuenta anterior (ni perfil, ni DMs, ni caché global)',
  p2.sesion === null && p2.uid === null && !p2.perfil && p2.loaded === false &&
  p2.dm === 0 && p2.friends === 0 && p2.posts === 0 && p2.cache === false && !p2.authUid,
  JSON.stringify(p2));

// ── PASO 3: entra ASTRID en la misma pestaña y abre Comunidad
console.log('  3) entra Astrid:', await ev(ENTRAR(UID_ASTRID, 'Astrid', 'hola astrid')));
await ev(`(()=>{ const t=[...document.querySelectorAll('.cntab')].find(x=>/Comunidad/.test(x.textContent)); if(t)t.click(); })()`); await sleep(1200);
await ev(`cmtyGoView('settings')`); await sleep(600);
const p3 = await ev(`(()=>{const h=document.getElementById('cn-community');const t=(h.innerText||'').replace(/\\s+/g,' ');
  return {uid:CMTY.uid,perfil:(CMTY.profile||{}).handle,loaded:CMTY.loaded,
    saleElCoach:/Andres/.test(t),saleAstrid:/Astrid/.test(t),txt:t.slice(0,110)};})()`);

// El BUG: Astrid ve el perfil del coach. Este check está escrito para PASAR cuando esté ARREGLADO.
check('🔴 P3 Astrid debe ver SU perfil, no el del coach',
  p3.perfil === 'Astrid' && p3.saleElCoach === false, JSON.stringify(p3));

const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };
await shot('repro-cmty-identidad-pegada');

// ── PASO 4: la vía de DISCO (sobrevive incluso a recargar la página)
const p4 = await ev(`(()=>{ const c=JSON.parse(localStorage.getItem('ax_cmty_cache')||'null');
  return {hay:!!c, deQuien:(c&&c.profile&&c.profile.handle)||null}; })()`);
check('🔴 P4 la caché de disco no debe conservar el perfil de la cuenta anterior',
  !p4.hay || p4.deQuien === 'Astrid', JSON.stringify(p4));

// ── PASO 5: cambio de cuenta SIN pasar por `logout()` (sesión que expira y entra otro, vuelta de
// OAuth, otra pestaña que cerró sesión). Aquí `renderCommunity()` NO recarga —corta por
// `CMTY.loaded`— así que el candado síncrono de identidad es lo único que separa a las cuentas.
console.log('  5) vuelve el coach SIN logout:', await ev(ENTRAR(UID_COACH, 'Andres', 'hola coach')));
await ev(`(()=>{ const t=[...document.querySelectorAll('.cntab')].find(x=>/Comunidad/.test(x.textContent)); if(t)t.click(); })()`); await sleep(1400);
await ev(`cmtyGoView('settings')`); await sleep(600);
const p5 = await ev(`(()=>{const h=document.getElementById('cn-community');const t=(h.innerText||'').replace(/\\s+/g,' ');
  return {uid:CMTY.uid,perfil:(CMTY.profile||{}).handle,saleAstrid:/Astrid/.test(t),saleElCoach:/Andres/.test(t),txt:t.slice(0,110)};})()`);
check('🔴 P5 cambio de cuenta SIN «Salir»: no se hereda la identidad anterior',
  p5.perfil === 'Andres' && p5.uid === UID_COACH && p5.saleAstrid === false && p5.saleElCoach === true,
  JSON.stringify(p5));
await shot('repro-cmty-identidad-sin-logout');

// ── PASO 6: las claves de disco van por dueño. Cada cuenta tiene la suya y la global no se usa.
const p6 = await ev(`(()=>{const g=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return (v&&v.profile&&v.profile.handle)||null;}catch(e){return 'ilegible';}};
  return {global:localStorage.getItem('ax_cmty_cache'),
    coach:g('ax_cmty_cache_${UID_COACH}'), astrid:g('ax_cmty_cache_${UID_ASTRID}'),
    sondaGlobal:localStorage.getItem('ax_cmty_probe'), nudgeGlobal:localStorage.getItem('ax_cmtynudge')};})()`);
check('🔴 P6 cada cuenta escribe en SU clave (y las globales del dispositivo quedaron muertas)',
  p6.global === null && p6.sondaGlobal === null && p6.nudgeGlobal === null &&
  p6.coach === 'Andres' && p6.astrid === 'Astrid', JSON.stringify(p6));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── REGRESIÓN: identidad de Comunidad entre cuentas (bug P0, arreglado) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n🔴 REGRESIÓN — ${failed.length} check(s) en rojo: la identidad volvió a pegarse` : '\n✅ TODO OK — la identidad NO se hereda entre cuentas');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
