// ─────────────────────────────────────────────────────────────────────────────
// _verify-aviso-calentamiento.mjs — EL AVISO «OJO CON TU ZONA» EN LA PANTALLA DONDE SE ENTRENA (v642)
//
// La suite ya vigila el CABLEADO (que `renderWarmup` consulte las zonas y pinte el aviso) y el
// dictamen de Laura sobre `wc3`. Lo que un test de texto NO puede probar es lo único que importa
// aquí: que el aviso se PINTE, que se LEA en los dos temas, que quepa a 360 px, y que aparezca
// SOLO donde debe — la lección de v566 es que el candado del motor no protege la pantalla.
//
// MÉTODO: se extrae del propio `app-6-extra.js` el tramo que va de `WARMUP_LIBRARY` a
// `findWarmupEx` (contiguo: ahí viven la biblioteca, `buildWarmup`, `renderWarmup` y sus helpers) y
// se ejecuta DENTRO de un navegador real, con `avi-core.js` cargado tal cual y `styles.css` puesto.
// Así se prueba la función REAL sin arrancar la app con sesión ni nube.
// 🔴 Con su control de extracción: si el tramo no define `renderWarmup`, se ABORTA — un `undefined`
//    silencioso da un rojo a 15.000 caracteres del origen (lección de v594).
//
//   node scripts/e2e/_verify-aviso-calentamiento.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afirmador, salir } from './_afirma.mjs';

const A = afirmador('aviso del calentamiento');
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = readFileSync(join(RAIZ, 'styles.css'), 'utf8');
const CORE = readFileSync(join(RAIZ, 'avi-core.js'), 'utf8');
const APP6 = readFileSync(join(RAIZ, 'app-6-extra.js'), 'utf8');
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-aviso-wu';
mkdirSync(OUT, { recursive: true });

// ── El tramo REAL del archivo real ───────────────────────────────────────────
const ini = APP6.indexOf('const WARMUP_LIBRARY');
const fin = APP6.indexOf('function openWarmupDetail(');
A.ok(ini > 0 && fin > ini, 'CONTROL · se localizó el tramo del calentamiento en app-6-extra.js', { ini, fin });
if (!(ini > 0 && fin > ini)) salir(A, {});
const TRAMO = APP6.slice(ini, fin);
// El tramo tiene que traer lo que vamos a medir; si el recorte se despega, el resto no prueba nada.
A.ok(/function renderWarmup\(/.test(TRAMO) && /function buildWarmup\(/.test(TRAMO) && /function findWarmupEx\(/.test(TRAMO),
  'CONTROL DE COBERTURA · el tramo trae renderWarmup, buildWarmup y findWarmupEx', TRAMO.length);

// ── Los casos, con los datos REALES medidos el 20-sep ────────────────────────
// La lista manual del PO (creada el 10-sep) y su dolor activo del 14-sep: muslo por detrás,
// nivel 3, bandera roja R5 → zonas lumbar + isquios. `we5` y `wai3` son los dos que su propio
// filtro le quitaría, y son los que tiene que ver marcados.
const LISTA_PO = ['wh1','wh2','wc1','wc2','wr1','wr2','wt1','wt2','wm1','wm2','we5','we1','wa1','wai3'];
const PAIN_PO = [{ at: '2026-09-14T14:24:53.238Z', id: 'p1', area: 'muslo por detrás', side: 'izquierda',
  flags: ['R5'], level: 3, exName: 'Peso Muerto Rumano', inicio: 'traumatismo', limita: 'normal', triaje: 4 }];

const PORT = 9413;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
   '--user-data-dir=' + process.env.TEMP + '/avisowu-' + Date.now(), '--no-first-run', 'about:blank']);
await dormir(1800);
const t0 = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(t0.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', m => { const o = JSON.parse(m); A.verError(o); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
const cmd = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
await cmd('Page.enable'); await cmd('Runtime.enable');
const ev = async e => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;

// Pinta un caso y devuelve lo MEDIDO en pantalla (nunca el innerHTML: lo que se juzga es lo visible).
async function pintar(caso) {
  const r = await ev(`(()=>{
    try{
      CUR = { clientId:'c1', activeRoutine:{ id:'rTest', warmup:${JSON.stringify(caso.warmup || null)},
        exercises:${JSON.stringify(caso.exercises || [])} } };
      DB = { clients:[{ id:'c1', name:'Prueba', notes:${JSON.stringify(caso.notes || '')},
        painCare:${JSON.stringify(caso.painCare || null)} }] };
      localStorage.clear();
      localStorage.setItem('wuopen_rTest','1');           // abierta: se mide lo VISIBLE, no lo plegado
      document.getElementById('wu-wrap').innerHTML='';
      renderWarmup(CUR.activeRoutine.exercises);
      const wrap=document.getElementById('wu-wrap');
      const filas=[...wrap.querySelectorAll('.wu-ex-row')].map(f=>({
        id:(f.id||'').replace('wu-row-',''),
        nombre:(f.querySelector('.wu-ex-name')||{}).textContent||'',
        aviso:((f.querySelector('.wu-ex-warn')||{}).textContent||'').trim(),
        altoAviso: f.querySelector('.wu-ex-warn') ? Math.round(f.querySelector('.wu-ex-warn').getBoundingClientRect().height) : 0,
      }));
      // Un título de sección con NADA debajo: se cuenta mirando el DOM, no el marcado.
      const titulos=[...wrap.querySelectorAll('.wu-section-title')];
      const vacios=titulos.filter(t=>!(t.nextElementSibling&&t.nextElementSibling.classList.contains('wu-ex-row')))
        .map(t=>t.textContent.trim());
      const cab=wrap.querySelector('.wu-warn-head');
      let peor=0; wrap.querySelectorAll('*').forEach(el=>{ const x=Math.round(el.getBoundingClientRect().right-window.innerWidth); if(x>peor)peor=x; });
      const c1=wrap.querySelector('.wu-ex-warn');
      const guia=wrap.querySelector('.wu-guide-btn');
      return { ok:true, filas, titulos:titulos.map(t=>t.textContent.trim()), vacios, html:wrap.innerHTML.length,
        guiaSvg: !!(guia&&guia.querySelector('svg[data-ico]')), guiaTxt: guia?(guia.textContent||'').trim():'',
        cab: cab ? cab.textContent.trim() : '', altoCab: cab ? Math.round(cab.getBoundingClientRect().height) : 0,
        colorCab: cab ? getComputedStyle(cab).color : '', colorFila: c1 ? getComputedStyle(c1).color : '',
        alto: Math.round(wrap.getBoundingClientRect().height), excesoPx: peor };
    }catch(e){ return { ok:false, err:String(e&&e.message||e) }; }
  })()`);
  return r;
}

const medidas = {};
for (const tema of ['claro', 'oscuro']) {
  await cmd('Emulation.setDeviceMetricsOverride', { width: 360, height: 900, deviceScaleFactor: 2, mobile: true });
  // 🔴 El tema se FIJA: Chrome headless arranca en OSCURO (gotcha de v493).
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  await cmd('Page.navigate', { url: 'data:text/html,<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' });
  await dormir(500);
  // 🔴 DOS trampas del montaje, las dos cazadas por el control de abajo en la primera corrida:
  //  (a) `new Function(core)()` define sus funciones en el ÁMBITO DE ESA FUNCIÓN, no en el global,
  //      así que `warmupWarnZones` quedaba `undefined` y el aviso no habría salido nunca — el
  //      «defecto» habría sido mío. Se inyecta como <script>, que sí corre en el ámbito global.
  //  (b) en una URL `data:` el ALMACENAMIENTO está apagado y `localStorage` LANZA al leerlo; la
  //      tarjeta lo usa para recordar si está abierta. Se le pone un sustituto en memoria.
  const armado = await ev(`(()=>{try{
    Object.defineProperty(window,'localStorage',{configurable:true,value:(()=>{const m=new Map();return {
      getItem:k=>m.has(String(k))?m.get(String(k)):null, setItem:(k,v)=>m.set(String(k),String(v)),
      removeItem:k=>m.delete(String(k)), clear:()=>m.clear(),
      key:i=>[...m.keys()][i]||null, get length(){return m.size} };})()});
    const s=document.createElement('style'); s.textContent=${JSON.stringify(CSS)}; document.head.appendChild(s);
    document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
    document.body.style.cssText='margin:0;padding:12px;background:var(--bg)';
    document.body.innerHTML='<div id="wu-wrap"></div>';
    window.module={exports:{}};
    window.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // \`aviIcon\` (app-1) y \`_gmIco\` (app-6, línea 388) viven FUERA del tramo extraído: en la app
    // existen, aquí hay que ponerlos o el render lanza. El icono de juguete lleva \`data-ico\` para
    // poder AFIRMAR en pantalla que el botón pinta un SVG y no el emoji de respaldo.
    window.aviIcon=(n,sz)=>'<svg width="'+sz+'" height="'+sz+'" data-ico="'+n+'"><rect width="100%" height="100%" fill="currentColor"/></svg>';
    window._gmIco=(n,sz,fb)=>typeof aviIcon==='function'?aviIcon(n,sz):fb;
    const meter=txt=>{const e=document.createElement('script'); e.textContent=txt; document.head.appendChild(e);};
    meter(${JSON.stringify(CORE)});
    meter(${JSON.stringify(TRAMO)});
    return { core: typeof warmupWarnZones, render: typeof renderWarmup, lim: typeof limitationsFor, ls: typeof localStorage.setItem };
  }catch(e){ return { err:String(e&&e.message||e) }; }})()`);
  A.ok(armado && armado.render === 'function' && armado.core === 'function' && armado.lim === 'function',
    `${tema}: CONTROL · se montaron avi-core y renderWarmup en la página`, armado);
  if (!armado || armado.render !== 'function') break;

  // ── CASO 1 · la lista MANUAL del PO con su dolor activo ───────────────────
  const m1 = await pintar({ warmup: LISTA_PO, painCare: PAIN_PO,
    exercises: [{ id: 'e14', name: 'Peso Muerto Rumano', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 10 }] });
  // Si el caso principal no pintó, se ABORTA con el diagnóstico: seguir midiendo sobre un `undefined`
  // da un rojo a mil líneas del origen en vez de decir qué pasó (lección de v579).
  A.ok(m1 && m1.ok, `${tema}: el caso de la lista manual se pinta sin lanzar`, (m1 && m1.err) || m1);
  if (!m1 || !m1.ok) break;
  A.ok(m1.filas.length === LISTA_PO.length, `${tema}: se pintan los 14 movimientos de su lista`, m1.filas.length);
  const marcadas = m1.filas.filter(f => f.aviso);
  A.ok(marcadas.length === 2 && marcadas.every(f => ['we5', 'wai3'].includes(f.id)),
    `${tema}: SOLO we5 y wai3 llevan aviso (los dos que su filtro le quitaría)`, marcadas.map(f => f.id + ':' + f.aviso));
  A.ok(marcadas.every(f => f.altoAviso > 6), `${tema}: el aviso de la fila tiene alto REAL (se ve)`, marcadas.map(f => f.altoAviso));
  A.ok(/ojo con/i.test(m1.cab) && m1.altoCab > 6,
    `${tema}: la CABECERA avisa (la tarjeta llega colapsada: ahí es donde se ve)`, { cab: m1.cab, alto: m1.altoCab });
  A.ok(/muslo|isquio|lumbar/i.test(m1.cab), `${tema}: el aviso NOMBRA la zona que declaró`, m1.cab);
  A.ok(!/contraindicad|L4|L5|flexi[óo]n lumbar/i.test(m1.cab + marcadas.map(f => f.aviso).join(' ')),
    `${tema}: sin jerga clínica en lo que lee la persona`, m1.cab);
  A.ok(m1.excesoPx <= 1, `${tema}: no se desborda a 360 px (exceso ${m1.excesoPx}px)`, m1.excesoPx);
  A.ok(m1.guiaSvg && !/🎥/.test(m1.guiaTxt),
    `${tema}: el botón de «cómo se hace» pinta el icono de la marca, no el emoji`, { svg: m1.guiaSvg, txt: m1.guiaTxt });
  A.ok(/rgb/.test(m1.colorCab || '') && !/rgba\(0, 0, 0, 0\)/.test(m1.colorCab || ''),
    `${tema}: el aviso tiene color resuelto (si el token falla, queda invisible)`, m1.colorCab);

  // ── CONTROL de discriminación · la MISMA lista sin nada declarado ─────────
  const m2 = await pintar({ warmup: LISTA_PO,
    exercises: [{ id: 'e14', name: 'Peso Muerto Rumano', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 10 }] });
  A.ok(m2.ok && m2.filas.length === LISTA_PO.length && m2.filas.every(f => !f.aviso) && !m2.cab,
    `${tema}: CONTROL · sin dolor declarado NO hay ni un aviso (si no, marcaría a todo el mundo)`,
    { cab: m2.cab, conAviso: m2.filas.filter(f => f.aviso).length });

  // ── CASO 2 · auto-derivado con RODILLA: el dictamen de Laura, en pantalla ─
  const m3 = await pintar({ notes: 'Rodillas desgastadas, lesión de rodilla operada',
    exercises: [{ id: 'e2', name: 'Prensa de Pierna', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 12 },
                { id: 'e3', name: 'Sentadilla Goblet', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 12 }] });
  A.ok(m3.ok, `${tema}: el caso auto-derivado se pinta sin lanzar`, m3.err || '');
  const ids3 = m3.filas.map(f => f.id);
  A.ok(!ids3.includes('wc3'), `${tema}: wc3 (90/90) NO llega a quien declara rodilla — dictamen de Laura`, ids3.join(','));
  A.ok(ids3.includes('wc1') && ids3.includes('wc4'), `${tema}: en su lugar recibe wc1 + wc4, los dos aprobados`, ids3.join(','));
  A.ok(m3.filas.every(f => !f.aviso) && !m3.cab,
    `${tema}: en el auto-derivado no hay avisos porque el filtro YA los quitó`, m3.filas.filter(f => f.aviso).map(f => f.id));
  A.ok(m3.filas.length >= 2, `${tema}: el calentamiento no queda vacío tras filtrar`, m3.filas.length);

  // ── CASO 3 · lumbar + tobillo en día de pierna: la sección que se quedaba sola ─
  // Medido por E1: con esas dos zonas, `activaciones` queda en CERO y el título se pintaba igual.
  // Hoy no le pasa a nadie (ninguna ficha declara las dos) y por eso mismo se cierra ahora.
  const m4 = await pintar({ notes: 'Hernia lumbar L5 y esguince de tobillo',
    exercises: [{ id: 'e2', name: 'Prensa de Pierna', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 12 },
                { id: 'e5', name: 'Curl Femoral Tumbado', muscle: 'piernas', type: 'Aislamiento', sets: 3, reps: 12 }] });
  A.ok(m4.ok, `${tema}: el caso lumbar+tobillo se pinta sin lanzar`, m4.err || '');
  A.ok(m4.vacios.length === 0, `${tema}: ningún título se queda sin ejercicios debajo`, m4.vacios);
  A.ok(m4.filas.length >= 2 && m4.titulos.length >= 1,
    `${tema}: CONTROL · la tarjeta sigue pintando lo que SÍ sobrevive al filtro`, { filas: m4.filas.length, titulos: m4.titulos });

  // ── CASO 4 · lista propia del coach cuyos ids ya no existen ──────────────
  const m5 = await pintar({ warmup: ['zz1', 'zz2', 'zz3'],
    exercises: [{ id: 'e2', name: 'Prensa de Pierna', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 12 }] });
  A.ok(m5.ok, `${tema}: el caso de ids muertos se pinta sin lanzar`, m5.err || '');
  A.ok(m5.filas.length >= 2, `${tema}: una lista que no resuelve nada cae al auto-derivado, no a «0/0»`, m5.filas.length);
  A.ok(m5.titulos.length >= 1, `${tema}: y cae al auto-derivado de verdad (trae sus secciones)`, m5.titulos);

  // Captura del caso que importa (la lista manual con su dolor activo).
  await pintar({ warmup: LISTA_PO, painCare: PAIN_PO,
    exercises: [{ id: 'e14', name: 'Peso Muerto Rumano', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 10 }] });
  const cap = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/aviso-${tema}.png`, Buffer.from(cap.result.data, 'base64'));
  medidas[tema] = { filas: m1.filas.length, marcadas: marcadas.length, cab: m1.cab };
}

ws.close();
salir(A, { chrome, out: OUT, medidas });
