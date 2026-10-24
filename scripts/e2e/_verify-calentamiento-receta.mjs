// ─────────────────────────────────────────────────────────────────────────────
// _verify-calentamiento-receta.mjs — EL CALENTAMIENTO POR RECETA, EN PANTALLA (v721)
//
// La suite prueba el motor (recetas, cadenas de Laura, matriz pieza × zona). Lo que un test de texto
// NO puede probar es la tarjeta que ve la persona: que el cardio suave salga arriba con su título,
// que «Ya vengo caliente» marque ESE bloque y se vaya (y vuelva si quita el ✓), que la línea de la
// aproximación aparezca solo con algo de peso, que ningún título quede sin filas, y que todo quepa a
// 360 px en los dos temas y con letra «Muy grande».
//
// MÉTODO (el de `_verify-aviso-calentamiento`): se extrae de `app-6-extra.js` el tramo que va de
// `WARMUP_LIBRARY` a `openWarmupDetail` y se ejecuta en un Chrome real con `avi-core.js` y
// `styles.css` tal cual. Sin sesión ni nube. Las capturas quedan en %TEMP%/avi-wu-receta.
//
//   node scripts/e2e/_verify-calentamiento-receta.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afirmador, salir, matarArbol } from './_afirma.mjs';

const A = afirmador('calentamiento por receta');
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = readFileSync(join(RAIZ, 'styles.css'), 'utf8');
const CORE = readFileSync(join(RAIZ, 'avi-core.js'), 'utf8');
const APP6 = readFileSync(join(RAIZ, 'app-6-extra.js'), 'utf8');
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-wu-receta';
mkdirSync(OUT, { recursive: true });

const ini = APP6.indexOf('const WARMUP_LIBRARY');
const fin = APP6.indexOf('function openWarmupDetail(');
A.ok(ini > 0 && fin > ini, 'CONTROL · se localizó el tramo del calentamiento en app-6-extra.js', { ini, fin });
if (!(ini > 0 && fin > ini)) salir(A, {});
const TRAMO = APP6.slice(ini, fin);
A.ok(['renderWarmup', 'buildWarmup', 'wuOptsFor', 'wuYaCaliente', 'findWarmupEx'].every(f => TRAMO.includes('function ' + f + '(')),
  'CONTROL DE COBERTURA · el tramo trae el motor, la tarjeta y «Ya vengo caliente»', TRAMO.length);

const CASOS = {
  // Una asesorada en el gimnasio, día de glúteo A: la receta más larga (7 con el cardio).
  gluteo: { cliente: { sex: 'F', place: 'gym' }, exercises: [
    { id: 'e42', name: 'Hip Thrust con Barra', muscle: 'gluteo', type: 'Compuesto', track: 'peso_reps', sets: 4, reps: 10 },
    { id: 'e2', name: 'Prensa de Pierna', muscle: 'piernas', type: 'Compuesto', track: 'peso_reps', sets: 3, reps: 12 }] },
  // Un asesorado en casa, día de empuje con peso corporal: marcha en vez de máquina, y SIN línea de
  // aproximación (no hay nada con peso).
  casa: { cliente: { sex: 'M', place: 'casa' }, exercises: [
    { id: 'e77', name: 'Flexiones Inclinadas', muscle: 'pecho', type: 'Bodyweight', track: 'reps', sets: 3, reps: 12 },
    { id: 'e90', name: 'Fondos en Silla', muscle: 'triceps', type: 'Bodyweight', track: 'reps', sets: 3, reps: 10 }] },
  // Lumbar + tobillo en día de pierna: la receta pierde piezas y ningún título se queda solo.
  zonas: { cliente: { sex: 'M', place: 'gym', notes: 'Hernia lumbar L5 y esguince de tobillo' }, exercises: [
    { id: 'e2', name: 'Prensa de Pierna', muscle: 'piernas', type: 'Compuesto', track: 'peso_reps', sets: 4, reps: 12 }] },
};

const PORT = 9417;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
   '--user-data-dir=' + process.env.TEMP + '/wureceta-' + Date.now(), '--no-first-run', 'about:blank']);
// Chrome en frío puede tardar más que una espera fija: se reintenta hasta 20 s antes de rendirse.
let t0 = null;
for (let i = 0; i < 40 && !t0; i++) {
  await dormir(500);
  try { t0 = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(x => x.type === 'page'); } catch {}
}
A.ok(!!t0, 'CONTROL · Chrome arrancó y expuso su página de depuración', PORT);
if (!t0) { matarArbol(chrome); salir(A, {}); }
const ws = new WebSocket(t0.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', m => { const o = JSON.parse(m); A.verError(o); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
const cmd = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
await cmd('Page.enable'); await cmd('Runtime.enable');
const ev = async e => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;

// Lo que se juzga es lo VISIBLE: filas, títulos, el botón y su alto, el desborde.
const MEDIR = `(()=>{
  const wrap=document.getElementById('wu-wrap');
  const filas=[...wrap.querySelectorAll('.wu-ex-row')].map(f=>({ id:(f.id||'').replace('wu-row-',''),
    nombre:(f.querySelector('.wu-ex-name')||{}).textContent||'', dosis:(f.querySelector('.wu-ex-reps')||{}).textContent||'',
    hecho:(f.querySelector('.wu-check-btn')||{}).textContent==='✓' }));
  const titulos=[...wrap.querySelectorAll('.wu-section-title')];
  const vacios=titulos.filter(t=>!(t.nextElementSibling&&t.nextElementSibling.classList.contains('wu-ex-row'))).map(t=>t.textContent.trim());
  const b=document.getElementById('wu-caliente');
  const bv=b&&getComputedStyle(b).display!=='none'?b.getBoundingClientRect():null;
  let peor=0; wrap.querySelectorAll('*').forEach(el=>{ const x=Math.round(el.getBoundingClientRect().right-window.innerWidth); if(x>peor)peor=x; });
  const nota=wrap.querySelector('.wu-aprox-nota');
  return { filas, titulos:titulos.map(t=>t.textContent.trim().replace(/Ya vengo caliente$/,'').trim()), vacios,
    boton: bv?{ alto:Math.round(bv.height), ancho:Math.round(bv.width), color:getComputedStyle(b).color, texto:b.textContent.trim() }:null,
    progreso:(document.getElementById('wu-prog-num')||{}).textContent||'', insignia:(document.getElementById('wu-status-badge')||{}).textContent||'',
    nota: nota?nota.textContent.trim():'', excesoPx:peor, cabecera:(wrap.querySelector('.wu-title')||{}).textContent||'' };
})()`;

async function pintar(nombre) {
  const c = CASOS[nombre];
  return ev(`(()=>{ try{
    CUR={ clientId:'c1', activeRoutine:{ id:'r_${nombre}', warmup:null, exercises:${JSON.stringify(c.exercises)} } };
    DB={ clients:[Object.assign({ id:'c1', name:'Prueba', notes:'', routines:[CUR.activeRoutine] }, ${JSON.stringify(c.cliente)})] };
    localStorage.clear(); localStorage.setItem('wuopen_r_${nombre}','1');
    renderWarmup(CUR.activeRoutine.exercises);
    return Object.assign({ ok:true }, ${MEDIR});
  }catch(e){ return { ok:false, err:String(e&&e.stack||e) }; } })()`);
}
async function foto(nombre) {
  const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  if (r.result && r.result.data) writeFileSync(`${OUT}/${nombre}.png`, Buffer.from(r.result.data, 'base64'));
}

for (const [tema, fs] of [['claro', ''], ['oscuro', ''], ['claro', 'xl']]) {
  const tag = tema + (fs ? '-' + fs : '');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 360, height: 1400, deviceScaleFactor: 2, mobile: true });
  // 🔴 El tema se FIJA: Chrome headless arranca en OSCURO (gotcha de v493).
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  await cmd('Page.navigate', { url: 'data:text/html,<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' });
  await dormir(500);
  // Las dos trampas del montaje que cazó `_verify-aviso-calentamiento` (v642): el código va como
  // <script> (no `new Function`, que no deja nada global) y `localStorage` lleva sustituto (en `data:`
  // lanza). La tarjeta va dentro de `.cnp` para que la letra «Muy grande» le aplique su zoom real.
  const armado = await ev(`(()=>{try{
    Object.defineProperty(window,'localStorage',{configurable:true,value:(()=>{const m=new Map();return {
      getItem:k=>m.has(String(k))?m.get(String(k)):null, setItem:(k,v)=>m.set(String(k),String(v)),
      removeItem:k=>m.delete(String(k)), clear:()=>m.clear(), key:i=>[...m.keys()][i]||null, get length(){return m.size} };})()});
    const s=document.createElement('style'); s.textContent=${JSON.stringify(CSS)}; document.head.appendChild(s);
    document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
    ${fs ? `document.documentElement.setAttribute('data-fs','${fs}');` : ''}
    document.body.style.cssText='margin:0;padding:12px;background:var(--bg)';
    document.body.innerHTML='<div class="cnp on" style="display:block"><div id="wu-wrap"></div></div>';
    window.module={exports:{}};
    window.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    window.aviIcon=(n,sz)=>'<svg width="'+sz+'" height="'+sz+'" data-ico="'+n+'"><rect width="100%" height="100%" fill="currentColor"/></svg>';
    window._gmIco=(n,sz,fb)=>typeof aviIcon==='function'?aviIcon(n,sz):fb;
    const meter=txt=>{const e=document.createElement('script'); e.textContent=txt; document.head.appendChild(e);};
    meter(${JSON.stringify(CORE)});
    meter(${JSON.stringify(TRAMO)});
    return { render: typeof renderWarmup, motor: typeof wuResolveRecipe, cal: typeof wuYaCaliente };
  }catch(e){ return { err:String(e&&e.message||e) }; }})()`);
  A.ok(armado && armado.render === 'function' && armado.motor === 'function' && armado.cal === 'function',
    `${tag}: CONTROL · se montaron avi-core y la tarjeta en la página`, armado);
  if (!armado || armado.render !== 'function') break;

  // ── 1 · Glúteo A en el gimnasio ─────────────────────────────────────────────
  const g = await pintar('gluteo');
  A.ok(g && g.ok, `${tag}: el día de glúteo se pinta sin lanzar`, (g && g.err) || '');
  if (!g || !g.ok) break;
  A.ok(/Glúteo y pierna/.test(g.cabecera), `${tag}: la cabecera nombra el tipo de entrenamiento`, g.cabecera);
  A.ok(g.filas.map(f => f.id).join(',') === 'wg1,wt2,wc2,wc3,wc4,wag1,wag2',
    `${tag}: llegan los 7 de la receta de Valery con el corte del PO`, g.filas.map(f => f.id).join(','));
  A.ok(g.filas[0].dosis === '5 min', `${tag}: el cardio suave del día de glúteo es de 5 minutos`, g.filas[0].dosis);
  A.ok((g.filas.find(f => f.id === 'wc4') || {}).dosis === '15 · 2 s arriba', `${tag}: el puente del día A lleva su pausa`, g.filas.map(f => f.dosis));
  A.ok(g.titulos.length === 3 && /Cardio suave/.test(g.titulos[0]) && /Movilidad/.test(g.titulos[1]) && /Activación/.test(g.titulos[2]),
    `${tag}: los tres bloques en orden: cardio, movilidad, activación`, g.titulos);
  A.ok(g.vacios.length === 0, `${tag}: ningún título se queda sin filas`, g.vacios);
  A.ok(g.boton && g.boton.texto === 'Ya vengo caliente' && g.boton.alto >= 36,
    `${tag}: «Ya vengo caliente» se ve y mide al menos 36 px de alto`, g.boton);
  A.ok(g.boton && /rgb/.test(g.boton.color) && !/rgba\(0, 0, 0, 0\)/.test(g.boton.color), `${tag}: el botón tiene tinta resuelta`, g.boton && g.boton.color);
  A.ok(/Sets de calentamiento/.test(g.nota), `${tag}: la línea dice dónde están las series de aproximación`, g.nota);
  A.ok(g.progreso === '0/7', `${tag}: el progreso cuenta los 7`, g.progreso);
  A.ok(g.excesoPx <= 1, `${tag}: nada se sale a 360 px (exceso ${g.excesoPx}px)`, g.excesoPx);
  await foto(`1-gluteo-${tag}`);

  // ── 2 · «Ya vengo caliente»: marca el cardio, se va, y vuelve si se quita el ✓ ──
  const c1 = await ev(`(()=>{ document.getElementById('wu-caliente').click(); return ${MEDIR}; })()`);
  A.ok(c1.filas[0].hecho && c1.filas.slice(1).every(f => !f.hecho), `${tag}: marca SOLO el cardio suave`, c1.filas.map(f => f.id + (f.hecho ? '✓' : '')));
  A.ok(!c1.boton, `${tag}: el botón se va cuando el cardio ya está hecho`, c1.boton);
  A.ok(c1.progreso === '1/7', `${tag}: el progreso sube a 1/7`, c1.progreso);
  await foto(`2-ya-caliente-${tag}`);
  const c2 = await ev(`(()=>{ wuToggle('wg1'); return ${MEDIR}; })()`);
  A.ok(!c2.filas[0].hecho && c2.boton, `${tag}: al quitar el ✓ del cardio, el botón vuelve`, { hecho: c2.filas[0].hecho, boton: c2.boton });
  const c3 = await ev(`(()=>{ wuToggle('wg1'); wuYaCaliente('wg1'); return ${MEDIR}; })()`);
  A.ok(c3.filas[0].hecho, `${tag}: «Ya vengo caliente» sobre un cardio ya hecho no lo desmarca`, c3.filas[0]);
  // Repintar (el guiado repinta por cualquier cosa) conserva lo hecho y el botón sigue oculto.
  const c4 = await ev(`(()=>{ renderWarmup(CUR.activeRoutine.exercises); return ${MEDIR}; })()`);
  A.ok(c4.filas[0].hecho && !c4.boton, `${tag}: tras repintar, el cardio sigue hecho y el botón oculto`, { hecho: c4.filas[0].hecho, boton: c4.boton });

  // ── 3 · En casa, sin nada con peso ──────────────────────────────────────────
  const k = await pintar('casa');
  A.ok(k.ok && k.filas[0].id === 'wg2', `${tag}: en casa el cardio suave es la marcha, no una máquina`, k.filas.map(f => f.id).join(','));
  A.ok(!k.nota, `${tag}: sin nada con peso no se nombran las series de aproximación`, k.nota);
  A.ok(k.excesoPx <= 1, `${tag}: en casa tampoco se sale nada (exceso ${k.excesoPx}px)`, k.excesoPx);
  await foto(`3-casa-${tag}`);

  // ── 4 · Lumbar + tobillo en día de pierna ───────────────────────────────────
  const z = await pintar('zonas');
  const malos = await ev(`(()=>{ const lim=limitationsFor(DB.clients[0],Date.now()).keys;
    return [...document.querySelectorAll('#wu-wrap .wu-ex-row')].map(f=>f.id.replace('wu-row-','')).filter(i=>warmupContraindicated(findWarmupEx(i),lim)); })()`);
  A.ok(z.ok && malos.length === 0, `${tag}: con lumbar y tobillo nada de lo que llega está contraindicado`, malos);
  A.ok(z.vacios.length === 0, `${tag}: ningún título se queda sin filas con dos zonas`, z.vacios);
  A.ok(z.filas.length >= 4 && z.filas[0].id === 'wg1', `${tag}: el cardio suave sigue ahí aunque caigan piezas`, z.filas.map(f => f.id).join(','));
}

matarArbol(chrome);
salir(A, { out: OUT });
