// _verify-animo.mjs — v666 · «¿Cómo te sientes hoy?» con los íconos de la MARCA (modelo D).
// El PO eligió D mirando cuatro opciones dibujadas: círculo de color sólido con el ícono en blanco.
//   N1 salen los seis estados (con el del periodo, que es solo para mujeres) y NINGÚN emoji
//   N2 el ícono blanco pasa 3:1 sobre su círculo en el tema oscuro Y en el claro (gráfico, WCAG 1.4.11)
//      — con los tonos de marca del tema oscuro daba 1,5-2,8: por eso hay tokens propios
//   N3 el círculo es de color de verdad (si el token no resolviera, sería transparente)
//   N4 el botón se puede tocar (≥44 px) y elegir funciona
//   N5 CONTROL: sin el módulo de íconos vuelve el emoji — nunca un círculo vacío
// Sin login ni red. Corre: node scripts/e2e/_verify-animo.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8834, DBG = 9354, OUT = process.env.TEMP + '/avi-animo';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/animo-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`typeof moodChooserHtml==='function' && typeof aviIcon==='function' && !document.getElementById('avi-loading')`);
await sleep(1500);

// (sin comillas invertidas dentro: va en un template literal)
const MEDIR = `(()=>{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); tod.classList.add('on');
  let box=document.getElementById('prueba-animo'); if(!box){box=document.createElement('div');box.id='prueba-animo';tod.prepend(box);}
  box.innerHTML=moodChooserHtml({id:'x',name:'Luz',sex:'F'},'pickMood');
  const lum=c=>{const m=String(c).match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);};
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const btns=[...box.querySelectorAll('.mood-btn')];
  return btns.map(b=>{
    const ic=b.querySelector('.mood-emoji'); const cs=getComputedStyle(ic);
    const r=b.getBoundingClientRect();
    const bg=cs.backgroundColor, fg=cs.color;
    const transparente=/rgba\\(\\s*0,\\s*0,\\s*0,\\s*0\\)|transparent/.test(bg);
    return {lbl:b.getAttribute('aria-label'), svg:!!ic.querySelector('svg'), claseIc:ic.classList.contains('mood-ic'),
      texto:ic.textContent.trim(), bg, fg, transparente, ratio:transparente?0:+ratio(fg,bg).toFixed(2), alto:Math.round(r.height), ancho:Math.round(r.width)};
  });
})()`;

const results = [];
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };
try {
  for (const tema of ['dark', 'light']) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] });
    await ev(`(()=>{document.body.classList.remove('dark','light');document.documentElement.setAttribute('data-theme','${tema}');return 1;})()`);
    await sleep(400);
    const m = await ev(MEDIR);
    const T = tema === 'dark' ? 'oscuro' : 'claro';
    check(`N1 [${T}] salen los seis estados, todos con el ícono de la marca`, m.length === 6 && m.every(x => x.svg && x.claseIc), JSON.stringify(m.map(x => x.lbl)));
    check(`N1b [${T}] ni un emoji en el selector`, m.every(x => x.texto === ''), JSON.stringify(m.map(x => x.texto)));
    check(`N2 [${T}] el ícono blanco pasa 3:1 sobre su círculo en los seis`, m.every(x => x.ratio >= 3), m.map(x => x.lbl.split(' ')[0] + '=' + x.ratio).join(' · '));
    check(`N3 [${T}] cada círculo tiene color de verdad (el token resolvió)`, m.every(x => !x.transparente), JSON.stringify(m.map(x => x.bg)));
    check(`N4 [${T}] cada botón se puede tocar (≥44 px)`, m.every(x => x.alto >= 44 && x.ancho >= 44), m.map(x => x.ancho + 'x' + x.alto).join(' '));
    await ev(`(()=>{const e=document.getElementById('prueba-animo');e.scrollIntoView({block:'start'});})()`); await sleep(300);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${OUT}/animo-${T}.png`, Buffer.from(shot.data, 'base64'));
  }
  // N4b · elegir funciona (el botón llama a pickMood con su estado)
  const eligio = await ev(`(()=>{let got=null; const o=window.pickMood; window.pickMood=(m)=>{got=m;};
    document.querySelectorAll('#prueba-animo .mood-btn')[2].click(); window.pickMood=o; return got;})()`);
  check('N4b tocar un estado lo elige (Cansado → cansado)', eligio === 'cansado', String(eligio));
  // N5 · CONTROL: sin el módulo de íconos, vuelve el emoji — nunca un círculo vacío
  const sin = await ev(`(()=>{const o=window.aviIcon; window.aviIcon=undefined;
    const h=moodChooserHtml({id:'x',name:'Luz',sex:'F'},'pickMood'); window.aviIcon=o;
    const d=document.createElement('div'); d.innerHTML=h;
    return [...d.querySelectorAll('.mood-emoji')].map(s=>({svg:!!s.querySelector('svg'),txt:s.textContent.trim(),ic:s.classList.contains('mood-ic')}));})()`);
  check('N5 CONTROL: sin módulo de íconos vuelve el emoji (sin círculo vacío)', sin.length === 6 && sin.every(x => !x.svg && x.txt.length > 0 && !x.ic), JSON.stringify(sin.map(x => x.txt)));
  check('sin errores JS', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));
  console.log('  capturas en ' + OUT);
} catch (e) { check('el harness corrió', false, String(e)); }
finally { try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {} }
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
process.exit(fallas ? 1 : 0);
