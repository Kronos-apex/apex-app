// _verify-reports.mjs — MODERACIÓN: bandeja de reportes del coach (lote v3-a #1, backend c14).
// Sin login. La RPC cmty_mod_reports/resolve/delete_post se stubbea sobre AUTH.client() — el candado
// REAL (quién es moderador, qué ve) es de la RLS+RPC DEFINER y se probó a nivel DB (matriz R1-R10).
// Aquí se verifica la LÓGICA DEL CLIENTE: la tarjeta aparece solo con reportes abiertos, el modal
// pinta reportero→reportado + excerpt + fallback de cuenta borrada, resolver/eliminar llaman la RPC
// correcta y quitan la fila, y el sellado en localhost bloquea escrituras.
//   MR1 renderReportsCard: con reportes → tarjeta visible con conteo; sin reportes → oculta
//   MR2 openReportsInbox: pinta filas (reportero, reportado, motivo, excerpt) con esc()
//   MR3 cuenta borrada (reported_handle null) → «Ya no está en la comunidad» (nunca fila rota)
//   MR4 modResolve → rpc cmty_mod_resolve(p_report) + quita la fila + re-pinta
//   MR5 modDeletePost → rpc cmty_mod_delete_post(p_post) con el id del context + resolve; sin context → no
//   MR6 SELLADO en localhost → resolver/eliminar no llaman la RPC
//   MR7 XSS: handle/motivo/excerpt maliciosos escapados
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8841;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9351', '--user-data-dir=' + process.env.TEMP + '/rep-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9351/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderReportsCard==='function' && typeof openReportsInbox==='function' && !document.getElementById('avi-loading')`);
await sleep(1000);

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-coach'); CUR.loggedAs='coach';
  window.__rpc=[]; window.__rows=[
    {rid:'r1',rcreated_at:'2026-07-22T10:00:00Z',rstatus:'open',rreason:'contenido feo',rcontext:'post:11111111-1111-1111-1111-111111111111',reporter_uid:'a',reporter_handle:'Andrea',reported_uid:'b',reported_handle:'Beto',excerpt:'Pierna dura — nota rara'},
    {rid:'r2',rcreated_at:'2026-07-21T10:00:00Z',rstatus:'open',rreason:'spam',rcontext:null,reporter_uid:'a',reporter_handle:'<b>Caro</b>',reported_uid:null,reported_handle:null,excerpt:null},
    {rid:'r3',rcreated_at:'2026-07-20T10:00:00Z',rstatus:'resolved',rreason:'viejo',rcontext:null,reporter_uid:'a',reporter_handle:'X',reported_uid:'y',reported_handle:'Y',excerpt:null}
  ];
  AUTH.client=()=>({ rpc:(fn,args)=>{ window.__rpc.push({fn,args});
    if(fn==='cmty_mod_reports') return Promise.resolve({data:window.__rows,error:null});
    // el servidor marca el reporte resuelto → la próxima consulta ya no lo trae como abierto (imita la RLS/RPC real)
    if(fn==='cmty_mod_resolve'){ const r=window.__rows.find(x=>x.rid===args.p_report); if(r)r.rstatus='resolved'; }
    return Promise.resolve({data:null,error:null}); } });
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// ── MR1: tarjeta con reportes abiertos ──
const mr1 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; await renderReportsCard();
  const el=document.getElementById('h-reports');
  return JSON.stringify({ shown:el.style.display!=='none', count:/2 reportes por revisar/.test(el.innerHTML), open:/openReportsInbox/.test(el.innerHTML) }); })()`);
const d1 = JSON.parse(mr1);
ok('MR1 tarjeta visible con el conteo de reportes ABIERTOS (2, ignora el resuelto)', d1.shown && d1.count && d1.open);

// ── MR1b: sin reportes → oculta ──
const mr1b = await ev(`(async()=>{ const saved=window.__rows; window.__rows=[]; await renderReportsCard();
  const el=document.getElementById('h-reports'); const hidden=el.style.display==='none'; window.__rows=saved; return hidden; })()`);
ok('MR1b sin reportes abiertos → la tarjeta no aparece', mr1b);

// ── MR2: bandeja pinta filas ──
const mr2 = await ev(`(async()=>{ await renderReportsCard(); openReportsInbox();
  const h=document.getElementById('reports-body').innerHTML;
  return JSON.stringify({ rep:/Andrea/.test(h), tgt:/Beto/.test(h), motivo:/contenido feo/.test(h),
    excerpt:/Pierna dura/.test(h), resolver:/modResolve\\('r1'\\)/.test(h), eliminar:/modDeletePost\\('r1'\\)/.test(h),
    onlyOpen:!/viejo/.test(h) }); })()`);
const d2 = JSON.parse(mr2);
ok('MR2 bandeja: reportero + reportado + motivo + excerpt + acciones', d2.rep && d2.tgt && d2.motivo && d2.excerpt && d2.resolver && d2.eliminar);
ok('MR2 la bandeja muestra solo los ABIERTOS', d2.onlyOpen);

// ── MR3: cuenta borrada → fallback ──
const mr3 = await ev(`(()=>{ const h=document.getElementById('reports-body').innerHTML;
  return JSON.stringify({ fallback:/Ya no está en la comunidad/.test(h),
    noDelForR2:!/modDeletePost\\('r2'\\)/.test(h) }); })()`);
const d3 = JSON.parse(mr3);
ok('MR3 reportado sin perfil → «Ya no está en la comunidad» (nunca fila rota)', d3.fallback);
ok('MR3 reporte sin context (no-post) → sin botón «Eliminar publicación»', d3.noDelForR2);

// ── MR7: XSS ──
const mr7 = await ev(`(()=>{ const h=document.getElementById('reports-body').innerHTML;
  return JSON.stringify({ escaped: !/<b>Caro<\\/b>/.test(h) && /&lt;b&gt;Caro/.test(h) }); })()`);
ok('MR7 XSS: handle malicioso escapado', JSON.parse(mr7).escaped);

// ── MR4: resolver → rpc + quita fila ──
const mr4 = await ev(`(async()=>{ window.__rpc=[]; await modResolve('r1');
  const call=window.__rpc.find(c=>c.fn==='cmty_mod_resolve');
  const gone=!_modReports.some(r=>r.rid==='r1');
  return JSON.stringify({ called:!!call, arg:call&&call.args&&call.args.p_report==='r1', gone }); })()`);
const d4 = JSON.parse(mr4);
ok('MR4 resolver → cmty_mod_resolve(p_report=r1) + quita la fila', d4.called && d4.arg && d4.gone);

// ── MR5: eliminar post → rpc delete con el id del context + resolve ──
const mr5 = await ev(`(async()=>{ window.__rows=[{rid:'r9',rcreated_at:'2026-07-22T10:00:00Z',rstatus:'open',rreason:'x',rcontext:'post:22222222-2222-2222-2222-222222222222',reporter_uid:'a',reporter_handle:'A',reported_uid:'b',reported_handle:'B',excerpt:'y'}];
  await renderReportsCard(); openReportsInbox();
  window.__rpc=[]; window.confirm=()=>true; await modDeletePost('r9');
  const del=window.__rpc.find(c=>c.fn==='cmty_mod_delete_post');
  const res=window.__rpc.find(c=>c.fn==='cmty_mod_resolve');
  return JSON.stringify({ del:!!del, pid:del&&del.args&&del.args.p_post==='22222222-2222-2222-2222-222222222222', alsoResolved:!!res }); })()`);
const d5 = JSON.parse(mr5);
ok('MR5 eliminar → cmty_mod_delete_post(p_post=<id del context>) + resuelve', d5.del && d5.pid && d5.alsoResolved);

// ── MR6: sellado en localhost ──
const mr6 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; window.__rpc=[];
  await modResolve('rX'); window.confirm=()=>true; await modDeletePost('r9');
  return JSON.stringify({ sealed: !window.__rpc.some(c=>c.fn==='cmty_mod_resolve'||c.fn==='cmty_mod_delete_post') }); })()`);
ok('MR6 sellado en localhost → resolver/eliminar NO llaman la RPC', JSON.parse(mr6).sealed);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));
console.log(`\n  REPORTES: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
