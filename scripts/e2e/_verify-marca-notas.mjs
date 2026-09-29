// _verify-marca-notas.mjs — LO QUE EL COACH ESCRIBE EN LAS NOTAS SE VE EN SUS DOS PANTALLAS (v676).
//
// R13 (lesiones, 27-sep): la regla de la casa dice que lo que arma el coach se MARCA, y esa marca
// solo existía con dolor REPORTADO. Lucía Ríos («rodillas desgastadas… codos») hizo el 23-sep
// una plantilla con saltos y escaladores sin que ninguna pantalla lo dijera. La suite vigila el
// cableado; esto prueba lo único que la suite no puede: que la marca se PINTE, se LEA en los dos
// temas y quepa a 360 px, en la ficha y en el editor (adonde llega una plantilla aplicada).
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una
// asesorada INVENTADA que lleva la nota real de Laura, y su CONTROL sin notas.
//   node scripts/e2e/_verify-marca-notas.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8879, DBG = 9431;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-marca-notas';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/marcanotas-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
// Se espera el símbolo POST-arranque, no la mera existencia de funciones (gotcha v624).
for (let i = 0; i < 90; i++) { if (await ev(`typeof openNewRoutineFromTemplate==='function' && typeof _exWarnChip==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1200);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

const NOTA = 'Rodillas desgastadas, dolor en la espalda alta, dolor en los codos';
// La plantilla real que se aplicó el 23-sep, con el tríceps RENOMBRADO como lo guarda un plan.
const IDS = ['e69', 'e184', 'e83', 'e134', 'e81', 'e11', 'e42'];
const ESPERADAS = { e69: 3, e184: 2, e81: 1, e11: 1 };   // cuántas zonas nombra cada marca

async function montar(tema) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  return ev(`(()=>{try{
    ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
    document.body.classList.toggle('dark', ${tema === 'oscuro'});
    document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
    CUR.loggedAs='coach'; showScreen('s-coach');
    const cat=id=>({...(DB.exercises.find(e=>e.id===id)||{}), sets:3, reps:12});
    const exs=${JSON.stringify(IDS)}.map(cat);
    exs[5]={...exs[5], name:'Extensión en Polea'};
    const rutina={id:'rq1', name:'Full body funcional', day:'Lunes', restSec:60, exercises:exs};
    DB.clients=DB.clients.filter(c=>!/^qa-marca/.test(c.id));
    DB.clients.push({id:'qa-marca-rod', name:'Prueba Rodilla', notes:${JSON.stringify(NOTA)}, routines:[JSON.parse(JSON.stringify(rutina))], payments:[]});
    DB.clients.push({id:'qa-marca-sin', name:'Prueba Sin Notas', notes:'', routines:[JSON.parse(JSON.stringify(rutina))], payments:[]});
    window._tplQA={name:'Full body funcional', exercises:exs};
    return {ok:true, exs:exs.filter(e=>e.id).length};
  }catch(e){return {err:String(e&&e.message||e)};}})()`);
}

async function medir(clienteId) {
  await ev(`(()=>{CUR.clientId=${JSON.stringify(clienteId)}; openNewRoutineFromTemplate(window._tplQA);})()`);
  await sleep(700);
  return ev(`(()=>{
    const efectivo=el=>{ for(let n=el;n;n=n.parentElement){ const b=getComputedStyle(n).backgroundColor; if(b&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(b)) return b; } return 'rgb(255, 255, 255)'; };
    const rgb=s=>(s.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
    const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
    const ratio=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const zona=sel=>{ const root=document.querySelector(sel); if(!root) return null;
      root.querySelectorAll('.rc').forEach(r=>r.classList.add('open'));
      const filas=[...root.querySelectorAll(sel==='#d-routines'?'.exrow':'#rf-exlist > div')];
      const marcas=[...root.querySelectorAll('.ex-warn')].map(m=>{ const r=m.getBoundingClientRect();
        return {txt:m.textContent.trim(), alto:Math.round(r.height), der:Math.round(r.right), ratio:+ratio(getComputedStyle(m).color, efectivo(m)).toFixed(2)}; });
      return {filas:filas.length, marcas};
    };
    const modal=document.getElementById('m-routine');
    return { ficha:zona('#d-routines'), editor:zona('#rf-exlist'),
      modalAbierto: !!(modal && (modal.classList.contains('open')||modal.classList.contains('on')||getComputedStyle(modal).display!=='none')),
      ancho: window.innerWidth, desbordeLista: (()=>{const l=document.getElementById('rf-exlist'); return l? l.scrollWidth-l.clientWidth : -1;})() };
  })()`);
}

for (const tema of ['claro', 'oscuro']) {
  const m = await montar(tema);
  check(`${tema}: CONTROL · se montó la asesorada con el catálogo real`, m && m.ok && m.exs === IDS.length, JSON.stringify(m));
  if (!m || !m.ok) break;

  const r = await medir('qa-marca-rod');
  // CONTROL DE COBERTURA: si no se pintaron las filas, cero marcas no prueba nada.
  check(`${tema}: CONTROL · la ficha pinta los ${IDS.length} ejercicios`, r.ficha && r.ficha.filas >= IDS.length, JSON.stringify(r.ficha && r.ficha.filas));
  check(`${tema}: CONTROL · el editor pinta los ${IDS.length} ejercicios (la plantilla llegó)`, r.editor && r.editor.filas >= IDS.length, JSON.stringify(r.editor && r.editor.filas));
  for (const [dondeNombre, z] of [['ficha', r.ficha], ['editor', r.editor]]) {
    if (!z) continue;
    check(`${tema}/${dondeNombre}: marca los 4 que cargan sus zonas (salto, clean, escaladores, tríceps renombrado)`, z.marcas.length === 4,
      z.marcas.map(x => x.txt).join(' | '));
    const conTres = z.marcas.filter(x => /rodilla/.test(x.txt) && /cuello/.test(x.txt) && /codo/.test(x.txt)).length;
    check(`${tema}/${dondeNombre}: el Clean & Press nombra las TRES zonas`, conTres === 1, z.marcas.map(x => x.txt).join(' | '));
    check(`${tema}/${dondeNombre}: la marca le habla al coach («Ojo con su …»)`, z.marcas.every(x => /^⚠️ Ojo con su /.test(x.txt)), z.marcas.map(x => x.txt).join(' | '));
    check(`${tema}/${dondeNombre}: cada marca tiene alto real (se ve)`, z.marcas.every(x => x.alto > 8), z.marcas.map(x => x.alto).join(','));
    check(`${tema}/${dondeNombre}: cabe a 360 px`, z.marcas.every(x => x.der <= r.ancho), z.marcas.map(x => x.der).join(','));
    const peor = Math.min(...z.marcas.map(x => x.ratio));
    check(`${tema}/${dondeNombre}: se lee (contraste ≥ 4,5 : 1, texto chico)`, peor >= 4.5, 'peor ' + peor);
  }
  check(`${tema}: la lista del editor no se arrastra de lado`, r.desbordeLista <= 0, String(r.desbordeLista));
  await send('Page.captureScreenshot', { format: 'png' }).then(s => writeFileSync(`${OUT}/editor-${tema}.png`, Buffer.from(s.data, 'base64')));

  // CONTROL DE DISCRIMINACIÓN: la MISMA rutina sin notas no lleva ni una marca.
  const c = await medir('qa-marca-sin');
  check(`${tema}: CONTROL · sin notas NO hay ni una marca (si no, marcaría a todo el mundo)`,
    c.ficha && c.editor && c.ficha.marcas.length === 0 && c.editor.marcas.length === 0 && c.editor.filas >= IDS.length,
    JSON.stringify({ ficha: c.ficha && c.ficha.marcas.length, editor: c.editor && c.editor.marcas.length }));
}
check('cero errores de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

console.log(results.join('\n'));
console.log('capturas en ' + OUT);
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} marca de las notas: ${results.length - malos}/${results.length}`);
try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(malos ? 1 : 0);
