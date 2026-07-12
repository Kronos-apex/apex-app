// Captura del CIERRE DE ENTRENO (#workout-finish) para auditoría de diseño — sin login,
// 390px, claro+oscuro, overlay completo. Datos fake realistas (con PRs + caras + nudge).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8798, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9299', '--user-data-dir=' + process.env.TEMP + '/fin-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9299/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shotFull(n) {
  const h = await ev(`Math.max(document.getElementById('workout-finish').scrollHeight, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);

const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  window._pushCtx={clientId:'cF',days:[1,3,5],shifts:null};
  const wf=document.getElementById('workout-finish');
  document.getElementById('wf-photo').style.backgroundImage=\`url('\${window.WF_DEFAULT_PHOTO||'media/loading-bg.jpg'}')\`;
  document.getElementById('wf-title').textContent='¡Lo lograste, Samuel!';
  document.getElementById('wf-sub').textContent='Full Body A · lunes, 12 de julio';
  document.getElementById('wf-stats').innerHTML=[['Duración','42 min'],['Calorías','320 kcal'],['Series','8/8'],['Volumen','4,850 kg']].map(([l,v])=>\`<div class="wf-stat"><div class="wf-stat-val">\${v}</div><div class="wf-stat-lbl">\${l}</div></div>\`).join('');
  document.getElementById('wf-prs').innerHTML=[['Sentadilla','120 kg × 5 reps'],['Press banca','85 kg × 5 reps']].map(([nm,det])=>\`<div class="wf-pr"><span class="wf-pr-ico">🏆</span><div style="flex:1;min-width:0"><div class="wf-pr-name">¡Nuevo récord! \${nm}</div><div class="wf-pr-det">\${det}</div></div></div>\`).join('');
  if(typeof WF_FEELINGS!=='undefined')document.getElementById('wf-faces').innerHTML=WF_FEELINGS.map((f,i)=>\`<button type="button" class="wf-face\${i===3?' sel':''}">\${f.e}</button>\`).join('');
  const lbl=document.getElementById('wf-feeling-lbl'); if(lbl && typeof WF_FEELINGS!=='undefined')lbl.textContent=(WF_FEELINGS[3]&&WF_FEELINGS[3].l)||'';
  if(typeof renderWfPushNudge==='function')renderWfPushNudge();
  wf.classList.add('on'); wf.style.zIndex='99999';
  return true;
}catch(e){return 'err:'+e.message+' | '+(e.stack||'').split('\\n')[1];}})()`);
console.log('  setup:', setup);
await sleep(700);
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(500); await shotFull('finish-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(500); await shotFull('finish-oscuro');
console.log('OUT:', OUT);
chrome.kill(); srv.kill(); process.exit(0);
