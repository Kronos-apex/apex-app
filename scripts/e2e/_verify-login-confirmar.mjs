// _verify-login-confirmar.mjs — EL LOGIN YA NO LE DICE «CONTRASEÑA INCORRECTA» A QUIEN NO CONFIRMÓ SU
// CORREO, Y «OLVIDÉ MI CONTRASEÑA» NO MANDA EL ENLACE A UN DOMINIO AJENO (v679, R14).
//
// Corre el login REAL de la app en el navegador (la suite no puede esperar promesas) con los métodos de
// acceso ESPIADOS: cero correos, cero cuentas, cero red contra Supabase. Cada caso lleva su control.
//   node scripts/e2e/_verify-login-confirmar.mjs      · exit 1 si algo falla
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8891, DBG = 9441;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-login-confirmar';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/loginconf-' + Date.now(), '--no-first-run', 'about:blank']);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page'); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(400); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const ERR_SIN = `{status:400,code:'email_not_confirmed',message:'Email not confirmed'}`;
const ERR_MALA = `{status:400,code:'invalid_credentials',message:'Invalid login credentials'}`;

for (const tema of ['claro', 'oscuro']) {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  await send('Page.navigate', { url: `http://localhost:${PORT}/?t=${Date.now()}` });
  let listo = false; for (let i = 0; i < 80 && !listo; i++) { listo = await ev(`!!window._aviUpdateBusy && typeof doLogin==='function'`); if (!listo) await sleep(500); }
  check(`${tema}: CONTROL · la app arrancó`, listo);
  // Espías: nada sale a la red. `__respuesta` decide qué contesta el «servidor».
  await ev(`(()=>{ window.__calls=[]; window.__respuesta=${ERR_SIN};
    AUTH.ready=()=>true;
    AUTH.signInEmail=async(u)=>{ __calls.push(['in',u]); return {data:{},error:window.__respuesta}; };
    AUTH.resendSignup=async(e)=>{ __calls.push(['resend',e]); return {data:{},error:null}; };
    AUTH.resetPassword=async(e)=>{ __calls.push(['reset',e]); return {data:{},error:null}; };
    sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY); return 1; })()`);
  // Se entra como una persona: tocando «Iniciar sesión» en la bienvenida (el formulario vive escondido).
  await ev(`(()=>{ ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
    const b=[...document.querySelectorAll('#cin-cta button')].find(x=>/Iniciar sesión/.test(x.textContent)); if(b) b.click(); return !!b; })()`);
  await sleep(400);
  const abierto = await ev(`!!(document.getElementById('lu')&&document.getElementById('lu').offsetParent)`);
  check(`${tema}: CONTROL · el formulario de entrada está a la vista`, abierto);

  // ── 1 · correo sin confirmar ──────────────────────────────────────────────
  await ev(`(()=>{ document.getElementById('lu').value='edwin.prueba@gmail.com'; document.getElementById('lp').value='Clave1234'; document.querySelector('.lbtn').click(); return 1; })()`);
  await sleep(700);
  const s1 = await ev(`(()=>{ const e=document.getElementById('lerr'); const b=e&&e.querySelector('.lerr-btn'); const r=b&&b.getBoundingClientRect();
    const hit=r?document.elementFromPoint(r.x+r.width/2,r.y+r.height/2):null;
    return { visible:!!(e&&e.classList.contains('on')&&e.offsetHeight>0), txt:(e&&e.textContent)||'', boton:!!b, alto:r?Math.round(r.height):0,
      pulsable: !!(b&&hit&&(hit===b||b.contains(hit))), gastados: sessionStorage.getItem(LOGIN_ATTEMPTS_KEY) }; })()`);
  check(`${tema}: sin confirmar → dice que falta confirmar el correo`, s1.visible && /confirmar tu correo/.test(s1.txt), s1.txt.slice(0, 80));
  check(`${tema}: sin confirmar → NO dice «contraseña incorrecta»`, !/incorrect/i.test(s1.txt));
  check(`${tema}: sin confirmar → NO gasta un intento`, !s1.gastados || s1.gastados === '0', String(s1.gastados));
  check(`${tema}: el botón «Reenviar correo» se ve y se puede tocar (≥36 px)`, s1.boton && s1.pulsable && s1.alto >= 36, JSON.stringify({ alto: s1.alto, pulsable: s1.pulsable }));
  await send('Page.captureScreenshot', { format: 'png' }).then(s => writeFileSync(`${OUT}/sin-confirmar-${tema}.png`, Buffer.from(s.data, 'base64')));

  await ev(`document.querySelector('#lerr .lerr-btn').click()`); await sleep(500);
  const s2 = await ev(`({ calls: __calls.filter(c=>c[0]==='resend'), msg: (document.getElementById('l-forgot-msg')||{}).textContent||'' })`);
  check(`${tema}: «Reenviar correo» pide el correo de confirmación de ESA dirección`, s2.calls.length === 1 && s2.calls[0][1] === 'edwin.prueba@gmail.com', JSON.stringify(s2.calls));
  check(`${tema}: y dice que se lo volvimos a mandar`, /volvimos a mandar/.test(s2.msg), s2.msg.slice(0, 70));
  await ev(`(()=>{ const f=document.getElementById('lerr'); if(f) f.classList.remove('on'); window.reenviarConfirmacion(); return 1; })()`); await sleep(300);
  const s3 = await ev(`({ n: __calls.filter(c=>c[0]==='resend').length, msg: (document.getElementById('l-forgot-msg')||{}).textContent||'' })`);
  check(`${tema}: un segundo toque enseguida NO lo vuelve a mandar (compás de 60 s)`, s3.n === 1 && /Ya te lo mandamos/.test(s3.msg), JSON.stringify(s3));

  // ── CONTROL · clave de verdad incorrecta ─────────────────────────────────
  await ev(`(()=>{ window.__respuesta=${ERR_MALA}; sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY); document.getElementById('lp').value='Mala1234'; document.querySelector('.lbtn').click(); return 1; })()`);
  await sleep(700);
  const c1 = await ev(`(()=>{ const e=document.getElementById('lerr'); return { txt:e.textContent, boton:!!e.querySelector('.lerr-btn'), gastados: sessionStorage.getItem(LOGIN_ATTEMPTS_KEY) }; })()`);
  check(`${tema}: CONTROL · la clave mala sigue diciendo «incorrectos» y gastando el intento`, /incorrect/.test(c1.txt) && c1.gastados === '1' && !c1.boton, JSON.stringify(c1));

  // ── 2 · olvidé mi contraseña con un dominio ajeno ─────────────────────────
  await ev(`(()=>{ __calls.length=0; document.getElementById('lu').value='claudia.prueba@avi.com'; document.getElementById('l-forgot').click(); return 1; })()`);
  await sleep(500);
  const r1 = await ev(`({ n: __calls.filter(c=>c[0]==='reset').length, msg:(document.getElementById('l-forgot-msg')||{}).textContent||'' })`);
  check(`${tema}: dominio ajeno → NO se manda el enlace`, r1.n === 0, JSON.stringify(r1.n));
  check(`${tema}: dominio ajeno → le dice que se lo pida a su coach`, /coach/.test(r1.msg), r1.msg.slice(0, 80));
  // CONTROL · un correo propio sí se manda, y el mensaje menciona al coach como otra salida.
  await ev(`(()=>{ _resetEnviadoAt=0; __calls.length=0; document.getElementById('lu').value='persona.prueba@gmail.com'; document.getElementById('l-forgot').click(); return 1; })()`);
  await sleep(500);
  const r2 = await ev(`({ calls: __calls.filter(c=>c[0]==='reset'), msg:(document.getElementById('l-forgot-msg')||{}).textContent||'' })`);
  check(`${tema}: CONTROL · un correo propio SÍ recibe el enlace`, r2.calls.length === 1 && r2.calls[0][1] === 'persona.prueba@gmail.com', JSON.stringify(r2.calls));
  check(`${tema}: y el mensaje recuerda que el coach también puede ponerle una clave`, /coach/.test(r2.msg) && /Listo/.test(r2.msg), r2.msg.slice(0, 60));
}
check('cero errores de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

console.log(results.join('\n'));
console.log('capturas en ' + OUT);
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} login con correo sin confirmar y dominios ajenos: ${results.length - malos}/${results.length}`);
try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(malos ? 1 : 0);
