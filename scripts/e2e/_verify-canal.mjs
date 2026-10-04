// Verificación de v699 en un navegador: la app guarda el canal AL LLEGAR, el primero manda, y sin nada no inventa.
//   node scripts/e2e/_verify-canal.mjs
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/KRONOS/Desktop/AVI/avi-web/package.json');
const WebSocket = require('ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 8799, DBG = 9299, APP = `http://localhost:${PORT}/`;
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${join(tmpdir(), 'avi-canal-' + Date.now())}`, '--no-first-run', 'about:blank']);
let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json(); } catch { await sleep(300); } }
for (let i = 0; i < 40; i++) { try { await fetch(APP); break; } catch { await sleep(250); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl); let id = 1; const pend = new Map();
const send = (m, p = {}, s) => new Promise((res) => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p, ...(s ? { sessionId: s } : {}) })); });
ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error); pend.delete(m.id); } });
await new Promise((r) => ws.on('open', r));
const { targetInfos } = await send('Target.getTargets');
const { sessionId: P } = await send('Target.attachToTarget', { targetId: targetInfos.find((t) => t.type === 'page').targetId, flatten: true });
await send('Page.enable', {}, P); await send('Runtime.enable', {}, P);
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true }, P))?.result?.value;
const ir = async (q) => { await send('Page.navigate', { url: APP + q }, P); await sleep(2500); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`);
const leer = () => ev(`localStorage.getItem('ax_canal')`);

await ir(''); await ev(`localStorage.removeItem('ax_canal')`);
await ir(''); ok('sin canal ni origen: no se inventa nada', (await leer()) === null, String(await leer()));
await ir('?origen=web&canal=ig-bio'); const a = JSON.parse((await leer()) || 'null');
ok('llega por Instagram: se guarda «ig-bio» con fecha', a && a.c === 'ig-bio' && !isNaN(Date.parse(a.at)), JSON.stringify(a));
await ir('?origen=web&canal=tiktok'); const b = JSON.parse((await leer()) || 'null');
ok('después llega por TikTok: el primero manda', b && b.c === 'ig-bio', JSON.stringify(b));
await ev(`localStorage.removeItem('ax_canal')`);
await ir('?origen=web'); const c = JSON.parse((await leer()) || 'null');
ok('de la web sin canal: «web»', c && c.c === 'web', JSON.stringify(c));
await ev(`localStorage.removeItem('ax_canal')`);
await ir('?canal=%3Cimg%3E'); ok('una etiqueta con otra forma no entra', (await leer()) === null, String(await leer()));
await ev(`localStorage.setItem('ax_canal', JSON.stringify({c:'ig-bio', at:new Date().toISOString()}))`);
await ir('');
const rec = await ev(`JSON.stringify(typeof _canalDeLlegada==='function' ? _canalDeLlegada() : 'sin función')`);
ok('lo guardado pasa por la regla al crear la cuenta', /"c":"ig-bio"/.test(rec || ''), rec);
const lab = await ev(`typeof canalLabel==='function' ? canalLabel('ig-bio') : 'sin función'`);
ok('la ficha lo nombra para el coach', lab === 'Instagram (enlace de la bio)', lab);
await ev(`localStorage.removeItem('ax_canal')`);
console.log(res.join('\n'));
const malos = res.filter((r) => r.startsWith('❌')).length;
console.log(`\n${res.length - malos}/${res.length}`);
ws.close(); chrome.kill(); srv.kill(); process.exit(malos ? 1 : 0);
