import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const APP = 'https://kronos-apex.github.io/apex-app/';
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-samuel-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/fae26a46-b053-491e-a1f0-e7a28f9db92e/scratchpad/shots';
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

// ── launch headless Chrome with remote debugging ──
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=9222',
  '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check',
  '--window-size=390,844', APP,
], { detached: false });
chrome.on('error', e => { console.error('chrome spawn error', e); process.exit(1); });

async function findPage() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch('http://localhost:9222/json/list');
      const targets = await r.json();
      const p = targets.find(t => t.type === 'page' && t.url.includes('apex-app'));
      if (p && p.webSocketDebuggerUrl) return p;
    } catch {}
    await sleep(500);
  }
  throw new Error('no page target found');
}

const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map();
const jsErrors = []; const consoleErrors = [];

ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    jsErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'unknown');
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push((m.params.args || []).map(a => a.value || a.description || '').join(' '));
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = msgId++; pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.subtype === 'error') throw new Error(r.result.description);
  return r.result.value;
};
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  log('  📸', name);
};
const waitFor = async (expr, ms = 12000) => {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await evaluate(expr)) return true; } catch {} await sleep(300); }
  return false;
};

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const report = {};
try {
  // wait for app + login screen
  await waitFor(`!!document.getElementById('lu')`, 15000);
  await shot('01-login');

  // login
  await evaluate(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await evaluate(`doLogin()`);
  const logged = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
  report.login = logged;
  // First-run overlays appear chained via timeouts (data onboarding "¿Cómo estás hoy?" →
  // educational "Cómo funciona" → welcome). Dismiss whichever is up, in a loop, for ~4s.
  for (let k = 0; k < 8; k++) {
    await evaluate(`(()=>{
      try{const d=document.getElementById('data-ob');if(typeof _dobFinish==='function'&&d&&d.classList.contains('on'))_dobFinish();}catch(e){}
      try{const o=document.getElementById('onboarding');if(typeof obSkip==='function'&&o&&o.style.display!=='none')obSkip();}catch(e){}
      try{const f=document.getElementById('m-fsintro');if(typeof fsIntroDismiss==='function'&&f&&getComputedStyle(f).display!=='none')fsIntroDismiss();}catch(e){}
      try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}
      ['data-ob','cwelcome','fsintro','m-fsintro'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('on');});
      const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';
    })()`).catch(()=>{});
    await sleep(500);
  }
  await sleep(800); await shot('02-hoy');
  report.greet = await evaluate(`(document.getElementById('cn-greet')||{}).textContent||''`);
  report.todayText = await evaluate(`(document.getElementById('cn-today')||{}).innerText?.slice(0,200)||''`);

  // Rutinas tab
  await evaluate(`cnTab('cn-routines', document.querySelectorAll('.cntab')[1])`);
  await sleep(1200); await shot('03-rutinas');
  report.routines = await evaluate(`[...document.querySelectorAll('#cn-all-rut .rcname')].map(e=>e.textContent.trim())`);
  report.hasNuevaRutina = await evaluate(`!!document.querySelector('#cn-all-rut button.bp') && /Nueva rutina/.test(document.getElementById('cn-all-rut').innerText)`);
  report.editButtons = await evaluate(`document.querySelectorAll('#cn-all-rut button').length && /Editar/.test(document.getElementById('cn-all-rut').innerText)`);

  // Open the Empuje routine card (expand) + check no Pec Deck / posteriores
  await evaluate(`(()=>{const cards=[...document.querySelectorAll('#cn-all-rut .rc')];const emp=cards.find(c=>/Empuje/i.test(c.querySelector('.rcname')?.textContent||''));if(emp){const h=emp.querySelector('.rch');if(h)h.click();}})()`);
  await sleep(800); await shot('04-empuje-expandido');
  report.empujeExercises = await evaluate(`(()=>{const cards=[...document.querySelectorAll('#cn-all-rut .rc')];const emp=cards.find(c=>/Empuje/i.test(c.querySelector('.rcname')?.textContent||''));if(!emp)return null;return [...emp.querySelectorAll('.exname')].map(e=>e.textContent.trim());})()`);

  // Open editor on Empuje (verify the exercise list renders — the "no aparecía" bug)
  const openedEditor = await evaluate(`(()=>{const cards=[...document.querySelectorAll('#cn-all-rut .rc')];const emp=cards.find(c=>/Empuje/i.test(c.querySelector('.rcname')?.textContent||''));if(!emp)return false;const btn=[...emp.querySelectorAll('button')].find(b=>/Editar/.test(b.textContent));if(!btn)return false;btn.click();return true;})()`);
  report.editorButtonFound = openedEditor;
  await waitFor(`(()=>{const m=document.getElementById('m-routine');return m&&getComputedStyle(m).display!=='none'})()`, 6000);
  await sleep(800); await shot('05-editor');
  report.editorExList = await evaluate(`[...document.querySelectorAll('#rf-exlist .exname, #rf-exlist [style*="font-weight:600"]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,12)`);
  report.editorExCount = await evaluate(`document.querySelectorAll('#rf-exlist input[type="number"]').length`);
  // close editor WITHOUT saving
  await evaluate(`(()=>{const m=document.getElementById('m-routine');if(window.cm)cm('m-routine');else if(m)m.style.display='none';})()`);
  await sleep(500);

  // Mensajes
  await evaluate(`cnTab('cn-messages', document.querySelectorAll('.cntab')[2])`);
  await sleep(1000); await shot('06-mensajes');
  report.msgComposerVisible = await evaluate(`(()=>{const c=document.getElementById('cn-msg-composer');return c?getComputedStyle(c).display!=='none':null})()`);

  // Progreso
  await evaluate(`cnTab('cn-history', document.querySelectorAll('.cntab')[3])`);
  await sleep(1000); await shot('07-progreso');
  report.progresoLocked = await evaluate(`/Premium|🔒/.test((document.getElementById('cn-history')||{}).innerText||'')`);

  // Perfil
  await evaluate(`cnTab('cn-profile', document.querySelectorAll('.cntab')[4])`);
  await sleep(1000); await shot('08-perfil');
  report.perfilText = await evaluate(`(document.getElementById('cn-profile')||{}).innerText?.slice(0,160)||''`);

} catch (e) {
  report.fatal = e.message;
} finally {
  report.jsErrors = jsErrors;
  report.consoleErrors = consoleErrors.slice(0, 20);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  ws.close(); try { chrome.kill(); } catch {}
  await sleep(300); process.exit(0);
}
