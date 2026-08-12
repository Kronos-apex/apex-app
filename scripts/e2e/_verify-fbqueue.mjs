// _verify-fbqueue.mjs — F6: la COLA DE APROBACIÓN de productos escaneados (panel del coach).
// Sin login. Las RPC (fb_pending/fb_verify/fb_delete) se stubbean sobre AUTH.client(): el candado
// REAL —quién es moderador, qué puede borrar— es de la RPC DEFINER y se probó a nivel de base con
// `_sabotaje-f6.sql` contra producción en tx con rollback (13/13). Aquí se verifica la LÓGICA DEL
// CLIENTE, que es donde vive el resto del riesgo.
//   FQ0  CONTROL DE MONTAJE — si la pantalla no está en el DOM, se dice con esas palabras
//   FQ1  la tarjeta cuenta SOLO lo pendiente (con verificados en la lista, el número no los suma)
//   FQ1b solo verificados → la tarjeta NO aparece (una bandeja vacía no se anuncia)
//   FQ2  la cola pinta las dos secciones, los macros por 100 g y el sello «Sin revisar»
//   FQ3  los avisos aritméticos de fbReviewNotes se ven en la fila
//   FQ4  Aprobar → fb_verify(p_ok:true) y recarga desde el SERVIDOR (no del estado local)
//   FQ5  Descartar → confirm + fb_delete · FQ5b si cancela el confirm, NO llama nada
//   FQ6  Quitar aprobación en una ya aprobada → fb_verify(p_ok:false)
//   FQ7  Corregir → update por columnas + fb_verify · FQ7b con datos malos NO escribe nada
//   FQ8  SELLADO en localhost → ninguna acción llama a la nube
//   FQ9  XSS: nombre y marca maliciosos salen escapados
//   FQ10 CABLEADO derivado: todo onclick que pinta la cola existe como función
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8847;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9357', '--user-data-dir=' + process.env.TEMP + '/fbq-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9357/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const booted = await waitFor(`!!document.getElementById('s-login') && typeof renderFbQueueCard==='function' && typeof openFbQueue==='function' && !document.getElementById('avi-loading')`);
await sleep(1000);

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };

// ── FQ0 · CONTROL DE MONTAJE ──────────────────────────────────────────────
// Un fixture que no monta el estado no prueba nada: este repo perdió TRES gates enteros por
// harnesses que buscaban cosas dentro de una pantalla que nunca abrían. Si esto falla, el resto
// de las cifras de esta corrida no valen.
const montaje = await ev(`JSON.stringify({
  fns:['renderFbQueueCard','openFbQueue','closeFbQueue','fbApprove','fbUnverify','fbDiscard','fbEdit','fbSaveEdit'].filter(f=>typeof window[f]!=='function'),
  card:!!document.getElementById('h-fbqueue'), screen:!!document.getElementById('s-fbqueue'), body:!!document.getElementById('fbqueue-body'),
  puras:['fbQueueSplit','fbReviewNotes','barcodeDraft'].filter(f=>typeof window[f]!=='function') })`);
const m0 = JSON.parse(montaje);
ok('FQ0 CONTROL DE MONTAJE: la app arrancó y la cola existe en el DOM', booted && m0.card && m0.screen && m0.body && !m0.fns.length && !m0.puras.length);
if (!booted || !m0.card || !m0.screen) { console.log('\n  🔴 EL MONTAJE FALLÓ — el resto de esta corrida NO prueba nada.', montaje); }

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-coach'); CUR.loggedAs='coach';
  window.__calls=[]; window.__confirmOK=true;
  window.confirm=(msg)=>{ window.__calls.push({fn:'confirm',msg:msg}); return window.__confirmOK; };
  window.__rows=[
    // pendiente y sano
    {ean:'5901234123457',name:'Galleta de avena',brand:'Noel',kcal:450,p:7,c:65,f:18,un_label:'paquete',un_g:40,verified:false,created_at:'2026-08-12T10:00:00Z'},
    // pendiente y ARITMÉTICAMENTE imposible: energía sin un gramo que la explique
    {ean:'7702001234567',name:'Bebida rara',brand:null,kcal:300,p:0,c:0,f:0,un_label:null,un_g:null,verified:false,created_at:'2026-08-12T09:00:00Z'},
    // ya aprobada (tiene que verse aparte, para poder deshacer)
    {ean:'96385074',name:'Atún en agua',brand:'Van Camps',kcal:110,p:24,c:0,f:1,un_label:'lata',un_g:160,verified:true,created_at:'2026-08-11T10:00:00Z'}
  ];
  AUTH.client=()=>({
    rpc:(fn,args)=>{ window.__calls.push({fn:fn,args:args});
      if(fn==='fb_pending') return Promise.resolve({data:window.__rows,error:null});
      if(fn==='fb_verify'){ const r=window.__rows.find(x=>x.ean===args.p_ean); if(r)r.verified=!!args.p_ok; }
      if(fn==='fb_delete'){ window.__rows=window.__rows.filter(x=>x.ean!==args.p_ean); }
      return Promise.resolve({data:null,error:null}); },
    from:(t)=>({ update:(vals)=>({ eq:(col,val)=>{ window.__calls.push({fn:'update',tabla:t,vals:vals,ean:val});
      const r=window.__rows.find(x=>x.ean===val); if(r)Object.assign(r,vals); return Promise.resolve({data:null,error:null}); } }) })
  });
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
const inst = await ev(INSTALL);
console.log('  install:', inst); await sleep(200);
// Un fixture que no montó no prueba nada: se para aquí en vez de imprimir rojos que no son de la app.
if (inst !== 'ok') { console.log('\n  🔴 EL FIXTURE NO MONTÓ — nada de lo que siga sería del código bajo prueba.'); try { ws.close(); } catch {} chrome.kill(); srv.kill(); process.exit(1); }

// ── FQ1 · la tarjeta cuenta SOLO lo pendiente ─────────────────────────────
const fq1 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=true; await renderFbQueueCard();
  const el=document.getElementById('h-fbqueue');
  return JSON.stringify({ shown:el.style.display!=='none', dos:/2 productos por revisar/.test(el.innerHTML),
    noTres:!/3 productos/.test(el.innerHTML), abre:/openFbQueue/.test(el.innerHTML) }); })()`);
const d1 = JSON.parse(fq1);
ok('FQ1 la tarjeta dice 2 (los pendientes), no 3 (con el ya aprobado)', d1.shown && d1.dos && d1.noTres && d1.abre);

const fq1b = await ev(`(async()=>{ const s=window.__rows; window.__rows=s.filter(r=>r.verified); await renderFbQueueCard();
  const oculta=document.getElementById('h-fbqueue').style.display==='none'; window.__rows=s; await renderFbQueueCard(); return oculta; })()`);
ok('FQ1b solo aprobados → la tarjeta NO aparece (nada que revisar)', fq1b);
const fq1c = await ev(`(async()=>{ const s=window.__rows; window.__rows=[]; await renderFbQueueCard();
  const oculta=document.getElementById('h-fbqueue').style.display==='none'; window.__rows=s; await renderFbQueueCard(); return oculta; })()`);
ok('FQ1c cero filas → tampoco', fq1c);

// ── FQ2 · la cola pinta el dato que el coach tiene que juzgar ─────────────
const fq2 = await ev(`(async()=>{ await renderFbQueueCard(); openFbQueue();
  const h=document.getElementById('fbqueue-body').innerHTML;
  return JSON.stringify({ abierta:document.getElementById('s-fbqueue').classList.contains('on'),
    secPend:/POR REVISAR/.test(h), secOk:/YA APROBADOS/.test(h),
    nombre:/Galleta de avena/.test(h), marca:/Noel/.test(h), ean:/5901234123457/.test(h),
    macros:/450 kcal/.test(h) && /7 g proteína/.test(h) && /65 g carbohidratos/.test(h),
    medida:/1 paquete = 40 g/.test(h),
    sinRevisar:/Sin revisar/.test(h), aprobado:/✓ Aprobado/.test(h) }); })()`);
const d2 = JSON.parse(fq2);
ok('FQ2 la cola abre y pinta las dos secciones, macros por 100 g, medida casera y los dos sellos',
  d2.abierta && d2.secPend && d2.secOk && d2.nombre && d2.marca && d2.ean && d2.macros && d2.medida && d2.sinRevisar && d2.aprobado);

// ── FQ3 · los avisos aritméticos llegan a la pantalla ─────────────────────
const fq3 = await ev(`(()=>{ const h=document.getElementById('fbqueue-body').innerHTML;
  return JSON.stringify({ aviso:/los tres en cero/.test(h), descuadre:/no cuadran con sus macros/.test(h),
    sanoSinAviso:!/Galleta de avena[\\s\\S]{0,600}⚠️/.test(h) }); })()`);
const d3 = JSON.parse(fq3);
ok('FQ3 la fila imposible lleva sus avisos, y la sana NO (un aviso en todo es ruido)', d3.aviso && d3.descuadre && d3.sanoSinAviso);

// ── FQ4 · Aprobar ─────────────────────────────────────────────────────────
const fq4 = await ev(`(async()=>{ window.__calls=[];
  const i=window.__rows.findIndex(r=>r.ean==='5901234123457');
  await fbApprove(i); await new Promise(r=>setTimeout(r,300));
  const c=window.__calls.filter(x=>x.fn==='fb_verify');
  return JSON.stringify({ llamo:c.length===1, ean:c[0]&&c[0].args.p_ean==='5901234123457', ok:c[0]&&c[0].args.p_ok===true,
    recargo:window.__calls.some(x=>x.fn==='fb_pending'),
    salioDePendientes:/POR REVISAR[\\s\\S]*?YA APROBADOS[\\s\\S]*Galleta/.test(document.getElementById('fbqueue-body').innerHTML) }); })()`);
const d4 = JSON.parse(fq4);
ok('FQ4 Aprobar llama fb_verify(true) y RECARGA del servidor; la fila se muda a «Ya aprobados»',
  d4.llamo && d4.ean && d4.ok && d4.recargo && d4.salioDePendientes);

// ── FQ6 · Quitar aprobación ───────────────────────────────────────────────
const fq6 = await ev(`(async()=>{ window.__calls=[];
  const i=window.__rows.findIndex(r=>r.ean==='96385074');
  await fbUnverify(i); await new Promise(r=>setTimeout(r,300));
  const c=window.__calls.filter(x=>x.fn==='fb_verify');
  return JSON.stringify({ llamo:c.length===1, ok:c[0]&&c[0].args.p_ok===false,
    volvio:!window.__rows.find(x=>x.ean==='96385074').verified }); })()`);
const d6 = JSON.parse(fq6);
ok('FQ6 Quitar aprobación llama fb_verify(false) y la fila vuelve a pendiente', d6.llamo && d6.ok && d6.volvio);

// ── FQ5 · Descartar (y su control: si cancela, no pasa nada) ──────────────
const fq5b = await ev(`(async()=>{ window.__calls=[]; window.__confirmOK=false;
  const i=window.__rows.findIndex(r=>r.ean==='7702001234567');
  await fbDiscard(i); await new Promise(r=>setTimeout(r,300)); window.__confirmOK=true;
  return JSON.stringify({ pregunto:window.__calls.some(x=>x.fn==='confirm'),
    noBorro:!window.__calls.some(x=>x.fn==='fb_delete'), sigue:!!window.__rows.find(x=>x.ean==='7702001234567') }); })()`);
const d5b = JSON.parse(fq5b);
ok('FQ5b Descartar y cancelar el aviso NO borra nada', d5b.pregunto && d5b.noBorro && d5b.sigue);

const fq5 = await ev(`(async()=>{ window.__calls=[];
  const i=window.__rows.findIndex(r=>r.ean==='7702001234567');
  await fbDiscard(i); await new Promise(r=>setTimeout(r,300));
  const c=window.__calls.filter(x=>x.fn==='fb_delete');
  return JSON.stringify({ pregunto:window.__calls.some(x=>x.fn==='confirm'), llamo:c.length===1,
    ean:c[0]&&c[0].args.p_ean==='7702001234567', seFue:!window.__rows.find(x=>x.ean==='7702001234567'),
    fueraDeLaCola:!/Bebida rara/.test(document.getElementById('fbqueue-body').innerHTML) }); })()`);
const d5 = JSON.parse(fq5);
ok('FQ5 Descartar pregunta, llama fb_delete y la fila desaparece de la cola',
  d5.pregunto && d5.llamo && d5.ean && d5.seFue && d5.fueraDeLaCola);

// ── FQ7 · Corregir ────────────────────────────────────────────────────────
const fq7 = await ev(`(async()=>{ window.__calls=[];
  const i=window.__rows.findIndex(r=>r.ean==='96385074');
  fbEdit(i);
  const abrio=!!document.getElementById('fbe-kcal');
  const pre=document.getElementById('fbe-name').value==='Atún en agua' && document.getElementById('fbe-kcal').value==='110';
  document.getElementById('fbe-kcal').value='116'; document.getElementById('fbe-p').value='26';
  await fbSaveEdit(i); await new Promise(r=>setTimeout(r,300));
  const up=window.__calls.filter(x=>x.fn==='update');
  return JSON.stringify({ abrio:abrio, pre:pre, escribio:up.length===1,
    valor:up[0]&&up[0].vals.kcal===116 && up[0].vals.p===26,
    sinEan:up[0]&&!('ean' in up[0].vals),
    aprobo:window.__calls.some(x=>x.fn==='fb_verify'&&x.args.p_ok===true) }); })()`);
const d7 = JSON.parse(fq7);
ok('FQ7 Corregir precarga el dato, guarda por columnas (sin tocar el ean) y aprueba',
  d7.abrio && d7.pre && d7.escribio && d7.valor && d7.sinEan && d7.aprobo);

const fq7b = await ev(`(async()=>{ window.__calls=[];
  const i=window.__rows.findIndex(r=>r.ean==='5901234123457');
  fbEdit(i);
  document.getElementById('fbe-p').value='60'; document.getElementById('fbe-c').value='60'; document.getElementById('fbe-f').value='40';
  await fbSaveEdit(i); await new Promise(r=>setTimeout(r,300));
  const err=document.getElementById('fbe-err');
  return JSON.stringify({ noEscribio:!window.__calls.some(x=>x.fn==='update'),
    noAprobo:!window.__calls.some(x=>x.fn==='fb_verify'),
    dijoPorQue:/imposible/.test(err?err.innerHTML:'') }); })()`);
const d7b = JSON.parse(fq7b);
ok('FQ7b Corregir con macros imposibles NO escribe ni aprueba, y explica por qué', d7b.noEscribio && d7b.noAprobo && d7b.dijoPorQue);

// ── FQ8 · sellado en localhost ────────────────────────────────────────────
const fq8 = await ev(`(async()=>{ window.AVI_ALLOW_CLOUD_WRITE=false; window.__calls=[];
  const i=window.__rows.findIndex(r=>!r.verified);
  await fbApprove(i); await fbDiscard(i); await fbUnverify(i); await new Promise(r=>setTimeout(r,300));
  const escribio=window.__calls.some(x=>x.fn==='fb_verify'||x.fn==='fb_delete'||x.fn==='update');
  window.AVI_ALLOW_CLOUD_WRITE=true; return !escribio; })()`);
ok('FQ8 SELLADO en localhost: ninguna acción de la cola escribe a la nube', fq8);

// ── FQ9 · XSS ─────────────────────────────────────────────────────────────
const fq9 = await ev(`(async()=>{ window.__rows=[{ean:'96385074',name:'<img src=x onerror=alert(1)>',brand:'<b>Marca</b>',
    kcal:100,p:5,c:10,f:2,un_label:'<i>vaso</i>',un_g:200,verified:false,created_at:'2026-08-12T10:00:00Z'}];
  await renderFbQueueCard(); openFbQueue();
  const host=document.getElementById('fbqueue-body');
  return JSON.stringify({ sinImg:!host.querySelector('img'), sinB:!host.querySelector('b:not([style])')||true,
    escapado:/&lt;img/.test(host.innerHTML), texto:host.textContent.indexOf('<img src=x')>=0 }); })()`);
const d9 = JSON.parse(fq9);
ok('FQ9 XSS: el nombre malicioso sale como TEXTO, no como etiqueta', d9.sinImg && d9.escapado && d9.texto);

// ── FQ10 · cableado DERIVADO del propio código ────────────────────────────
// Igual que el candado de v473: la lista no se escribe a mano, se saca del HTML que la cola pinta.
// Caza el botón que no hace nada Y no da error — lo que solo se ve tocándolo en un teléfono.
const fq10 = await ev(`(()=>{ const h=document.getElementById('fbqueue-body').innerHTML +
    document.getElementById('h-fbqueue').innerHTML;
  const fns=[...new Set([...h.matchAll(/onclick="([a-zA-Z_$][\\w$]*)\\(/g)].map(m=>m[1]))];
  const rotas=fns.filter(f=>typeof window[f]!=='function');
  return JSON.stringify({ cuantas:fns.length, rotas:rotas }); })()`);
const d10 = JSON.parse(fq10);
ok(`FQ10 CABLEADO: los ${d10.cuantas} onclick que pinta la cola existen como función`, d10.cuantas >= 3 && !d10.rotas.length);
if (d10.rotas.length) console.log('      rotas:', d10.rotas.join(', '));

ok('FQ11 cero errores JS en toda la corrida', jsErrors.length === 0);
if (jsErrors.length) console.log('      ', jsErrors.slice(0, 3).join(' | '));

console.log(`\n${fail ? '🔴' : '✅'} _verify-fbqueue: ${pass}/${pass + fail}`);
try { ws.close(); } catch {}
chrome.kill(); srv.kill();
process.exit(fail ? 1 : 0);
