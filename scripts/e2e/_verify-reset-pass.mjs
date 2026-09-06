// Verificación E2E de v582: «OLVIDÉ MI CONTRASEÑA».
//
// `AUTH.resetPassword` y `AUTH.sendMagicLink` estaban escritas desde el cutover de auth y NO LAS
// LLAMABA NADIE: quien perdía su contraseña no tenía ninguna salida dentro de la app, y el coach
// tampoco puede cambiársela (la contraseña real vive en Supabase Auth, no en su ficha).
//
// 🔒 Se ESPÍA `AUTH.resetPassword`/`AUTH.updatePassword` en vez de llamarlas de verdad — patrón
//    de `_verify-consent.mjs`: cero correos reales, cero rate-limit, cero riesgo a producción.
//    Que el endpoint FUNCIONA se comprobó aparte contra producción (POST /auth/v1/recover → 200
//    y `user_recovery_requested` en los logs de auth, 6-sep-2026); lo que ningún harness puede
//    comprobar es que el correo LLEGUE a la bandeja, y eso queda dicho en la bitácora.
//
// Corre: node scripts/e2e/_verify-reset-pass.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8795;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-reset-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9295', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9295/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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

// Abre la tarjeta de login como lo hace una persona: tocando «Iniciar sesión».
const abrirLogin = () => ev(`(()=>{const b=document.querySelector('#cin-cta .cin-cta-fill'); if(b){b.click();return 'cta';}
  const c=document.getElementById('cin-card'),k=document.getElementById('cin-cta');
  if(c&&k){k.style.display='none';if(typeof cinFormMode==='function')cinFormMode(true);c.style.display='block';return 'fn';}return 'no';})()`);

// Espía: sustituye la llamada de red y APUNTA con qué se llamó. Devuelve lo que se le diga.
const espiar = (resultado) => ev(`(()=>{window._espia={reset:[],update:[]};
  AUTH.resetPassword=async (email)=>{window._espia.reset.push(email); ${resultado}};
  AUTH.updatePassword=async (p)=>{window._espia.update.push(p); return {error:null};};
  return 'ok';})()`);
const espia = () => ev(`JSON.stringify(window._espia||{})`).then(s => JSON.parse(s || '{}'));
const msg = () => ev(`(()=>{const e=document.getElementById('l-forgot-msg');
  return JSON.stringify({txt:e?e.textContent:'',visible:!!(e&&getComputedStyle(e).display!=='none'),err:!!(e&&e.classList.contains('err'))});})()`).then(JSON.parse);

try {
  const ready = await waitFor(`(typeof pedirResetPass==='function' && typeof saveNewPass==='function' && !!document.getElementById('l-forgot'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (pedirResetPass/saveNewPass/#l-forgot)');
  await ev(`(()=>{try{['apex-loading','avi-loading'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});}catch(e){}})()`);
  const modo = await abrirLogin();
  await sleep(350);

  // ── R1: el enlace EXISTE y se ve dentro de la tarjeta de login ──
  log('\n=== R1: la puerta existe y se ve ===');
  const geo = JSON.parse(await ev(`(()=>{const b=document.getElementById('l-forgot');
    if(!b)return JSON.stringify({ok:false});
    b.scrollIntoView({block:'center'});
    const r=b.getBoundingClientRect();
    const enc=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
    return JSON.stringify({ok:true,alto:Math.round(r.height),txt:b.textContent.trim(),
      pulsable:!!(enc&&(enc===b||b.contains(enc)))});})()`));
  check('R1a el enlace está en la tarjeta de login', geo.ok === true && /Olvidaste/.test(geo.txt || ''), JSON.stringify({ modo, ...geo }));
  check('R1b y se puede pulsar de verdad (nada lo tapa)', geo.pulsable === true, JSON.stringify(geo));
  check('R1c con área táctil ≥36px (regla del proyecto)', geo.alto >= 36, 'alto=' + geo.alto);
  await shot('reset-r1-enlace');

  // ── R2: sin correo NO se llama a la red; se pide el correo ──
  log('\n=== R2: sin correo ===');
  await espiar('return {error:null};');
  await ev(`(()=>{document.getElementById('lu').value='';})()`);
  await ev(`pedirResetPass()`);
  await sleep(300);
  let m = await msg(); let sp = await espia();
  check('R2a no se manda nada a la red sin correo', (sp.reset || []).length === 0, JSON.stringify(sp));
  check('R2b y se le dice qué hacer, marcado como error', m.visible && m.err && /correo/i.test(m.txt), m.txt);

  // ── R3: con correo se pide el enlace y el mensaje NO delata si la cuenta existe ──
  log('\n=== R3: con correo ===');
  await espiar('return {error:null};');
  await ev(`(()=>{document.getElementById('lu').value='  Existe@Ejemplo.COM  ';})()`);
  await ev(`pedirResetPass()`);
  await sleep(400);
  m = await msg(); sp = await espia();
  check('R3a se llamó a AUTH.resetPassword', (sp.reset || []).length >= 1, JSON.stringify(sp.reset));
  check('R3b con el correo normalizado (sin espacios, en minúsculas)', (sp.reset || [])[0] === 'existe@ejemplo.com', JSON.stringify(sp.reset));
  const txtExiste = m.txt;
  check('R3c el mensaje es neutro y NO afirma que la cuenta existe', /si esa cuenta existe/i.test(txtExiste) && !m.err, txtExiste);
  check('R3d y le dice que mire en spam (el correo suele caer ahí)', /spam/i.test(txtExiste), txtExiste);

  // ── R4: 🔒 ANTI-ENUMERACIÓN · una cuenta que NO existe da EXACTAMENTE lo mismo ──
  log('\n=== R4: CONTROL · anti-enumeración ===');
  await ev(`(()=>{_resetEnviadoAt=0;})()`);   // saltar el cooldown, que se prueba aparte
  await espiar(`return {error:{message:'User not found'}};`);
  await ev(`(()=>{document.getElementById('lu').value='noexiste@ejemplo.com';})()`);
  await ev(`pedirResetPass()`);
  await sleep(400);
  m = await msg();
  check('R4 el mensaje es IDÉNTICO al de una cuenta que sí existe', m.txt === txtExiste && !m.err,
    JSON.stringify({ existe: txtExiste, noExiste: m.txt }));

  // ── R5: el cooldown evita gastar el límite del servidor a toques ──
  log('\n=== R5: cooldown ===');
  await espiar('return {error:null};');
  await ev(`pedirResetPass()`);
  await sleep(300);
  sp = await espia(); m = await msg();
  check('R5a un segundo toque seguido NO vuelve a llamar a la red', (sp.reset || []).length === 0, JSON.stringify(sp.reset));
  check('R5b y se le explica, sin decirle que falló', /segundos/.test(m.txt) && !m.err, m.txt);

  // ── R6: la vuelta del correo — crear la contraseña nueva ──
  log('\n=== R6: la contraseña nueva ===');
  await espiar('return {error:null};');
  await ev(`openNewPassModal()`);
  await sleep(350);
  const abierto = await ev(`(()=>{const e=document.getElementById('m-newpass');
    return !!(e&&e.classList.contains('on')&&e.getBoundingClientRect().height>0);})()`);
  check('R6a el modal de contraseña nueva se abre y se ve', abierto === true, String(abierto));
  await shot('reset-r6-modal');

  // Débil → no se guarda (el espejo de la regla del servidor).
  await ev(`(()=>{document.getElementById('np-new').value='123';document.getElementById('np-rep').value='123';})()`);
  await ev(`saveNewPass()`);
  await sleep(300);
  sp = await espia();
  let errTxt = await ev(`(()=>{const e=document.getElementById('np-err');return JSON.stringify({on:!!(e&&e.classList.contains('on')),txt:e?e.textContent:''});})()`).then(JSON.parse);
  check('R6b una contraseña débil NO se manda a la nube', (sp.update || []).length === 0, JSON.stringify(sp.update));
  check('R6c y se dice POR QUÉ', errTxt.on && errTxt.txt.length > 3, JSON.stringify(errTxt));

  // Distintas → no se guarda.
  await ev(`(()=>{document.getElementById('np-new').value='Segura2026x';document.getElementById('np-rep').value='Otra2026x';})()`);
  await ev(`saveNewPass()`);
  await sleep(300);
  sp = await espia();
  errTxt = await ev(`(()=>{const e=document.getElementById('np-err');return JSON.stringify({on:!!(e&&e.classList.contains('on')),txt:e?e.textContent:''});})()`).then(JSON.parse);
  check('R6d si las dos no coinciden tampoco se manda', (sp.update || []).length === 0, JSON.stringify(sp.update));
  check('R6e y lo dice con esas palabras', /no son iguales/i.test(errTxt.txt), errTxt.txt);

  // Buena → se guarda y el modal se cierra.
  await ev(`(()=>{AUTH_ROLE='client';document.getElementById('np-new').value='Segura2026x';document.getElementById('np-rep').value='Segura2026x';})()`);
  await ev(`saveNewPass()`);
  await sleep(400);
  sp = await espia();
  const cerrado = await ev(`(()=>{const e=document.getElementById('m-newpass');return !(e&&e.classList.contains('on'));})()`);
  check('R6f una contraseña válida SÍ se guarda', (sp.update || [])[0] === 'Segura2026x', JSON.stringify(sp.update));
  check('R6g y el modal se cierra', cerrado === true, String(cerrado));

  // ── R7: la fotografía del enlace de recuperación se toma ANTES de que auth se coma el hash ──
  log('\n=== R7: la marca del enlace ===');
  const marca = await ev(`typeof window._aviRecovery`);
  check('R7 la app sabe si esta carga viene del enlace del correo', marca === 'boolean', String(marca));

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
