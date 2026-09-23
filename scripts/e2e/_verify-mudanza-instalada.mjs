// v658 · EL CASO QUE IMPORTA: un teléfono con una versión VIEJA ya instalada (su service worker y su
// caché) el día que el origen viejo pasa a REDIRIGIR al nuevo, como hace GitHub Pages con dominio propio.
// Medido antes (`_exp-mudanza-congelada`): sin la mudanza, esa app se queda congelada en su caché.
// Aquí: el viejo sirve la versión instalada (git <ref>, por defecto HEAD), se instala, luego el viejo
// pasa a redirigir y el nuevo sirve el código de trabajo. ¿Termina el teléfono en el hogar nuevo?
// Corre: node scripts/e2e/_verify-mudanza-instalada.mjs [ref-git-de-la-version-instalada]
import WebSocket from 'ws';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cpSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
const SRV = fileURLToPath(new URL('./_mudanza-srv', import.meta.url));
const REPO = fileURLToPath(new URL('../..', import.meta.url));
const REF = process.argv[2] || 'HEAD';
const BASE = process.env.TEMP + '/avi-mudinst-' + Date.now();
const VIEJA = BASE + '/vieja', NUEVA = BASE + '/nueva';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, c, x = '') => { results.push((c ? 'OK ' : 'FAIL ') + n); console.log('  ' + (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const FILES = ['index.html', 'sw.js', 'manifest.json', 'styles.css', 'foods.json', 'avi-core.js', 'muscle-map.js', 'exercise-muscles.js',
  'app-1-infra.js', 'app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'app-7-community.js'];

// La versión INSTALADA: tal cual está en git (sin tocar nada).
mkdirSync(VIEJA, { recursive: true });
// REF='trabajo' = el código de trabajo sin commitear (para probar la versión que se va a desplegar).
for (const f of FILES) writeFileSync(VIEJA + '/' + f, REF === 'trabajo' ? readFileSync(REPO + '/' + f) : execSync(`git show ${REF}:${f}`, { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }));
cpSync(REPO + '/icons', VIEJA + '/icons', { recursive: true });
const vVieja = (readFileSync(VIEJA + '/sw.js', 'utf8').match(/avi-v(\d+)/) || [])[1];
// La versión NUEVA: el código de trabajo, con las constantes apuntadas a los puertos locales.
mkdirSync(NUEVA, { recursive: true });
for (const f of FILES) cpSync(REPO + '/' + f, NUEVA + '/' + f);
cpSync(REPO + '/icons', NUEVA + '/icons', { recursive: true });
let a1 = readFileSync(NUEVA + '/app-1-infra.js', 'utf8');
for (const [a, b] of [["const AVI_HOME_ORIGIN='https://app.avientrena.com';", "const AVI_HOME_ORIGIN='http://127.0.0.1:8862';"],
                      ["const AVI_OLD_HOSTS=['kronos-apex.github.io'];", "const AVI_OLD_HOSTS=['127.0.0.1:8861'];"]]) {
  if (a1.split(a).length - 1 !== 1) { console.log('🔴 MONTAJE: constante no encontrada exactamente una vez: ' + a); process.exit(1); }
  a1 = a1.replace(a, b);
}
writeFileSync(NUEVA + '/app-1-infra.js', a1);
writeFileSync(NUEVA + '/mudanza.json', JSON.stringify({ hogar: 'http://127.0.0.1:8862', v: 2 }));
const vNueva = (readFileSync(NUEVA + '/sw.js', 'utf8').match(/avi-v(\d+)/) || [])[1];
console.log(`instalada v${vVieja} (${REF}) → nueva v${vNueva} (código de trabajo)`);

let viejo = spawn('python', [SRV + '/rootsrv.py', '8861', VIEJA, '/apex-app/']);
const nuevo = spawn('python', [SRV + '/rootsrv.py', '8862', NUEVA]);
await sleep(1000);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9394', '--user-data-dir=' + process.env.TEMP + '/mudinst-' + Date.now(), '--no-first-run', 'about:blank']);
let page; for (let i = 0; i < 60; i++) { try { const t = await (await fetch('http://127.0.0.1:9394/json/list')).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch {} await sleep(400); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.on('open', r));
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');

// 1) Se instala la versión vieja (SW activo y controlando) y se deja una sesión guardada.
await send('Page.navigate', { url: 'http://127.0.0.1:8861/apex-app/' }); await sleep(6000);
await send('Page.reload'); await sleep(5000);
const FAKE = JSON.stringify({ access_token: 'tok-falso', refresh_token: 'ref-falso', user: { id: 'u-prueba' } });
await ev(`localStorage.setItem('avi_auth', ${JSON.stringify(FAKE)}); true`);
const ctl = await ev('!!navigator.serviceWorker.controller');
check('1 la versión vieja quedó instalada (SW controlando)', ctl === true);

// 2) El origen viejo pasa a redirigir (como Pages con dominio propio). Se abre la app instalada.
viejo.kill(); await sleep(500);
viejo = spawn('python', [SRV + '/redir.py', '8861', 'http://127.0.0.1:8862']); await sleep(1000);
let host = '';
for (let intento = 0; intento < 3 && host !== '127.0.0.1:8862'; intento++) {
  await send('Page.navigate', { url: 'http://127.0.0.1:8861/apex-app/' }); await sleep(9000);
  host = await ev('location.host');
  console.log(`  (apertura ${intento + 1}: ${await ev('location.href')})`);
}
check('2 el teléfono con la versión vieja termina en el hogar nuevo (no se queda congelado)', host === '127.0.0.1:8862', 'host=' + host);
check('3 y arranca la app ahí', await ev("typeof showScreen==='function' && document.body.innerText.length>50"));

const fallas = results.filter(r => r.startsWith('FAIL')).length;
console.log(fallas ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
try { ws.close(); } catch {} chrome.kill(); viejo.kill(); nuevo.kill();
try { rmSync(BASE, { recursive: true, force: true }); } catch {}
process.exit(fallas ? 1 : 0);
