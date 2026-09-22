// v658 · LA MUDANZA A app.avientrena.com, de punta a punta en local.
// Origen VIEJO = 127.0.0.1:8861/apex-app/ · origen NUEVO = 127.0.0.1:8862/ (dos orígenes de verdad).
// Se sirve una COPIA del repo con las dos constantes apuntadas a esos puertos; el resto es el código real.
//   M1 sin hogar nuevo (no responde): la app se queda donde está.
//   M2 con algo SIN confirmar en la nube: tampoco salta, aunque el hogar ya responda.
//   M3 todo confirmado: salta al hogar nuevo, se lleva la sesión y los ajustes chicos,
//      NO se lleva el respaldo grande de la fila, y borra de la barra el # y la marca ?mudanza.
//   M4 el hogar nuevo no vuelve a saltar (no hay bucle) y la app arranca.
// Corre: node scripts/e2e/_verify-mudanza.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cpSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
const SRV = fileURLToPath(new URL('./_mudanza-srv', import.meta.url));
const REPO = fileURLToPath(new URL('../..', import.meta.url));
const TMP = process.env.TEMP + '/avi-mudanza-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, c, x = '') => { results.push((c ? 'OK ' : 'FAIL ') + n); console.log('  ' + (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };

// Copia del repo con las constantes apuntadas a los puertos locales.
mkdirSync(TMP, { recursive: true });
for (const f of ['index.html', 'sw.js', 'manifest.json', 'styles.css', 'foods.json', 'avi-core.js', 'muscle-map.js', 'exercise-muscles.js',
  'app-1-infra.js', 'app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'app-7-community.js']) cpSync(REPO + '/' + f, TMP + '/' + f);
cpSync(REPO + '/icons', TMP + '/icons', { recursive: true });
let a1 = readFileSync(TMP + '/app-1-infra.js', 'utf8');
const n1 = a1.split("const AVI_HOME_ORIGIN='https://app.avientrena.com';").length - 1;
const n2 = a1.split("const AVI_OLD_HOSTS=['kronos-apex.github.io'];").length - 1;
if (n1 !== 1 || n2 !== 1) { console.log('🔴 MONTAJE: las constantes de la mudanza no aparecen exactamente una vez', n1, n2); process.exit(1); }
a1 = a1.replace("const AVI_HOME_ORIGIN='https://app.avientrena.com';", "const AVI_HOME_ORIGIN='http://127.0.0.1:8862';")
       .replace("const AVI_OLD_HOSTS=['kronos-apex.github.io'];", "const AVI_OLD_HOSTS=['127.0.0.1:8861'];");
// Sonda: lo que la llegada escribió, leído EN ESE INSTANTE. Después el cliente de auth descarta la
// sesión FALSA de la prueba (su token no existe en Supabase) — eso es correcto y no es la mudanza.
if (a1.split('window._aviLlegoMudanza=true;').length - 1 !== 1) { console.log('🔴 MONTAJE: no encuentro la marca de llegada'); process.exit(1); }
a1 = a1.replace('window._aviLlegoMudanza=true;', "window._aviLlegoMudanza=true; window.__mvAuth=localStorage.getItem('avi_auth');");
writeFileSync(TMP + '/app-1-infra.js', a1);

const viejo = spawn('python', [SRV + '/rootsrv.py', '8861', TMP, '/apex-app/']);
let nuevo = null;   // el hogar nuevo arranca APAGADO (M1)
await sleep(1000);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9393', '--user-data-dir=' + process.env.TEMP + '/mudprof-' + Date.now(), '--no-first-run', 'about:blank']);
let page; for (let i = 0; i < 60; i++) { try { const t = await (await fetch('http://127.0.0.1:9393/json/list')).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch {} await sleep(400); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.on('open', r));
let id = 1; const pend = new Map(); const jsErr = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErr.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise(r => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
const ir = async url => { await send('Page.navigate', { url }); await sleep(5000); };

const FAKE = JSON.stringify({ access_token: 'tok-falso', refresh_token: 'ref-falso', user: { id: 'u-prueba' } });
const plantar = extra => ev(`(()=>{ localStorage.clear();
  localStorage.setItem('avi_auth', ${JSON.stringify(FAKE)});
  localStorage.setItem('ax_theme', '"dark"');
  localStorage.setItem('ax_udcache_u-prueba', 'x'.repeat(20000));
  ${extra || ''} return true; })()`);

// ── M1: el hogar nuevo no responde → la app se queda
await ir('http://127.0.0.1:8861/apex-app/');
await plantar();
await ir('http://127.0.0.1:8861/apex-app/'); await sleep(3000);
check('M1 sin hogar nuevo, la app se queda donde está', (await ev('location.host')) === '127.0.0.1:8861', await ev('location.href'));

// Se enciende el hogar nuevo con su marca.
writeFileSync(TMP + '/mudanza.json', JSON.stringify({ home: 'http://127.0.0.1:8862' }));
nuevo = spawn('python', [SRV + '/rootsrv.py', '8862', TMP]); await sleep(1000);

// ── M2: algo sin confirmar → no salta aunque el hogar responda
await plantar("localStorage.setItem('ax_udirty_u-prueba','1');");
await ir('http://127.0.0.1:8861/apex-app/'); await sleep(7000);
check('M2 con algo sin confirmar en la nube, NO salta', (await ev('location.host')) === '127.0.0.1:8861', await ev('location.href'));

// ── M3: todo confirmado → salta con la sesión
await plantar();
await ir('http://127.0.0.1:8861/apex-app/?go=hoy'); await sleep(4000);
const llegada = await ev(`({host:location.host, href:location.href, auth:localStorage.getItem('avi_auth'), theme:localStorage.getItem('ax_theme'),
  cache:localStorage.getItem('ax_udcache_u-prueba'), marca:!!window._aviLlegoMudanza, authLlegada:window.__mvAuth})`);
check('M3a salta al hogar nuevo', llegada && llegada.host === '127.0.0.1:8862', llegada && llegada.href);
check('M3b se lleva la sesión (no hay que volver a escribir la contraseña)', llegada && llegada.authLlegada === FAKE, 'ahora en disco: ' + (llegada && llegada.auth ? 'sesión' : 'null (el cliente de auth descartó el token FALSO)'));
check('M3c se lleva los ajustes chicos', llegada && llegada.theme === '"dark"');
check('M3d NO se lleva el respaldo grande de la fila (lo baja de la nube)', llegada && llegada.cache === null);
check('M3e la barra queda limpia: ni la sesión en el # ni la marca ?mudanza', llegada && !/#|avimv|mudanza/.test(llegada.href) && /go=hoy/.test(llegada.href), llegada && llegada.href);
check('M3f la página sabe que llegó por la mudanza (para el aviso)', llegada && llegada.marca === true);

// ── M4: en el hogar nuevo no se vuelve a saltar y la app arranca
await sleep(3000);
check('M4a sin bucle: sigue en el hogar nuevo', (await ev('location.host')) === '127.0.0.1:8862');
check('M4b la app arrancó en el hogar nuevo', await ev("typeof showScreen==='function' && document.body.innerText.length>50"));

console.log('\njsErrors: ' + JSON.stringify(jsErr));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
console.log(fallas || jsErr.length ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
try { ws.close(); } catch {} chrome.kill(); viejo.kill(); if (nuevo) nuevo.kill();
try { rmSync(TMP, { recursive: true, force: true }); } catch {}
process.exit(fallas || jsErr.length ? 1 : 0);
