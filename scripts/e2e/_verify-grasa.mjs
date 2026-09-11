// ─────────────────────────────────────────────────────────────────────────────
// _verify-grasa.mjs — LA TARJETA DE GRASA ESTIMADA, PINTADA DE VERDAD (v607)
//
// El motor tiene sus tests en la suite. Lo que esto verifica es lo que un test de texto NO puede:
// que el bloque se PINTE, que se lea en los DOS temas, que quepa a 360 px y que **al menor no le
// aparezca nada** — el candado que más pesa aquí.
//
// MÉTODO: se extrae `_medGrasaHtml` del propio `app-5-salud.js` y se ejecuta con `new Function`
// dándole sus globales (`esc`, `MED_FIELDS`, `bodyFatEstimate`, `bodyFatSourceText`). Así se prueba
// la función REAL sin tener que arrancar la app entera con sesión y nube.
// 🔴 Con su control: si el trozo extraído no devuelve una función, se ABORTA — un `undefined`
//    silencioso da un rojo a 15.000 caracteres del origen (lección de v594).
//
//   node scripts/e2e/_verify-grasa.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { afirmador, salir } from './_afirma.mjs';

const require = createRequire(import.meta.url);
const A = afirmador('grasa corporal estimada');
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const core = require(join(RAIZ, 'avi-core.js'));
const CSS = readFileSync(join(RAIZ, 'styles.css'), 'utf8');
const APP5 = readFileSync(join(RAIZ, 'app-5-salud.js'), 'utf8');
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-grasa';
mkdirSync(OUT, { recursive: true });

// ── Se extrae la función REAL del archivo real ───────────────────────────────
const ini = APP5.indexOf('function _medGrasaHtml(');
const fin = APP5.indexOf('\nfunction ', ini + 10);
const cuerpo = APP5.slice(ini, fin > 0 ? fin : undefined);
// ⚠️ El separador es un SALTO DE LÍNEA, no un `;`: el trozo puede terminar en un comentario `//`
//    y con LF se comería el `return` (lección de v594, que solo se vio en CI).
const build = new Function('esc', 'MED_FIELDS', 'bodyFatEstimate', 'bodyFatSourceText',
  cuerpo + '\n;return _medGrasaHtml;');
const _medGrasaHtml = build(
  s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  core.MED_FIELDS || [], core.bodyFatEstimate, core.bodyFatSourceText);
A.ok(typeof _medGrasaHtml === 'function', 'CONTROL · se extrajo `_medGrasaHtml` del archivo real', typeof _medGrasaHtml);
if (typeof _medGrasaHtml !== 'function') salir(A, {});

// ── Los casos, con los datos REALES del PO ───────────────────────────────────
const MED_PO = [
  { id: 'a', date: '2026-09-08T22:52:43.818Z', cuello: 44.5, cintura: 102, cadera: 105.5 },
  { id: 'b', date: '2026-06-17T20:35:28.694Z', cintura: 95, cadera: 102 },
];
const CASOS = [
  ['po', 'el PO (datos reales del 8-sep)', { sex: 'M', age: 37, height: 175 }, MED_PO, { pinta: true, dice: ['24,4', '%'] }],
  ['flecha', 'con toma anterior comparable (baja)', { sex: 'M', age: 37, height: 175 },
    MED_PO.concat([{ id: 'c', date: '2026-03-01', cuello: 44.5, cintura: 110 }]), { pinta: true, dice: ['puntos desde'] }],
  ['falta', 'a la asesorada le falta el cuello (5 personas reales)', { sex: 'F', age: 34, height: 160 },
    [{ id: 'd', date: '2026-09-01', cintura: 88, cadera: 104 }], { pinta: true, dice: ['cuello'] }],
  ['menor', '🔒 MENOR de 15 años — no se pinta NADA', { sex: 'F', age: 15, height: 160 }, MED_PO, { pinta: false }],
  ['sintalla', 'sin talla en la ficha', { sex: 'M', age: 40 }, MED_PO, { pinta: true, dice: ['altura'] }],
  ['margen', 'cambio DENTRO del margen de la cinta', { sex: 'M', age: 37, height: 175 },
    [{ id: 'n', date: '2026-09-08', cuello: 44.5, cintura: 102 }, { id: 'v', date: '2026-06-08', cuello: 44.5, cintura: 103 }],
    { pinta: true, dice: ['Dentro del margen de tu cinta'], noDice: ['puntos desde'] }],
  ['bandera', 'cambio más grande de lo que el método mide', { sex: 'M', age: 37, height: 175 },
    [{ id: 'n', date: '2026-09-08', cuello: 44.5, cintura: 102 }, { id: 'v', date: '2026-06-08', cuello: 44.5, cintura: 135 }],
    { pinta: true, dice: ['más grande de lo que este método suele medir bien'] }],
];

const bloques = {};
for (const [id, nombre, cli, med, esp] of CASOS) {
  let html = '';
  try { html = _medGrasaHtml(cli, core.medNormalize(med)) || ''; }
  catch (e) { html = ''; A.ok(false, `${nombre}: la función lanzó`, String(e && e.message)); }
  bloques[id] = html;
  if (esp.pinta) {
    A.ok(html.length > 40, `${nombre}: pinta el bloque`, html.slice(0, 60));
    (esp.dice || []).forEach(t => A.ok(html.indexOf(t) >= 0, `${nombre}: dice «${t}»`, html.slice(0, 160)));
    (esp.noDice || []).forEach(t => A.ok(html.indexOf(t) < 0, `${nombre}: NO dice «${t}»`, html.slice(0, 200)));
  } else {
    A.ok(html === '', `${nombre}: NO pinta nada (ni el número ni una explicación)`, html.slice(0, 120));
  }
}
// 🔒 CONTROL del candado del menor: con la MISMA lista, una adulta SÍ recibe bloque — sin esto,
//    «el menor no lo ve» y «nadie lo ve» pasan la misma prueba (lección v485).
A.ok(bloques.po.length > 40 && bloques.menor === '',
  'CONTROL · el silencio es del MENOR, no de la función', { po: bloques.po.length, menor: bloques.menor.length });

// ── La bandera de CINTURA (función aparte: no depende de la grasa estimada) ──
{
  const APP5b = readFileSync(join(RAIZ, 'app-5-salud.js'), 'utf8');
  const i2 = APP5b.indexOf('function _medCinturaFlagHtml(');
  const f2 = APP5b.indexOf('\nfunction ', i2 + 10);
  const cuerpo2 = APP5b.slice(i2, f2 > 0 ? f2 : undefined);
  const build2 = new Function('waistFlag', cuerpo2 + '\n;return _medCinturaFlagHtml;');
  const _flag = build2(core.waistFlag);
  A.ok(typeof _flag === 'function', 'CONTROL · se extrajo `_medCinturaFlagHtml` del archivo real');
  const sinCuello = [{ id: 'a', date: '2026-09-08', cintura: 102, cadera: 105 }];
  const h = _flag({ sex: 'M', age: 37, height: 175 }, core.medNormalize(sinCuello)) || '';
  A.ok(/profesional de la salud/.test(h), 'la bandera de cintura se pinta con 102 cm (el caso del PO)', h.slice(0, 90));
  // 🔬 Mi primera versión de esta aserción era `!/diagn/i` y salía ROJA sobre el texto CORRECTO:
  //    la frase de Laura dice «no es una alarma ni un DIAGNóstico», así que contiene la palabra.
  //    Lo que de verdad hay que exigir es que NOMBRE que no diagnostica y que no cite ninguna
  //    enfermedad — «no diagnostica» no se prueba buscando la raíz de la palabra.
  A.ok(/no es una alarma ni un diagn/i.test(h), 'la bandera DICE que no es un diagnóstico', h.slice(0, 120));
  A.ok(!/obesidad|s[ií]ndrome|diabetes|hipertensi[óo]n|cardiovascular|metab[óo]lic/i.test(h),
    'la bandera no nombra ninguna enfermedad', h.slice(0, 160));
  A.ok(/profesional de la salud/.test(h) && !/m[ée]dico general|especialista en/.test(h),
    'la bandera deriva a un profesional de la salud, sin inventarle la especialidad', h.slice(0, 160));
  const bajo = _flag({ sex: 'M', age: 37, height: 175 }, core.medNormalize([{ id: 'b', date: '2026-09-08', cintura: 90 }])) || '';
  A.ok(bajo === '', 'CONTROL · con 90 cm en un hombre NO se pinta (o marcaría a todo el mundo)', bajo.slice(0, 60));
  const menor = _flag({ sex: 'M', age: 16, height: 175 }, core.medNormalize(sinCuello)) || '';
  A.ok(menor === '', '🔒 a un MENOR no se le pinta la bandera de cintura', menor.slice(0, 60));
  bloques.flag = h;
}

// ── Se pinta en un navegador de verdad, en los dos temas y a 360 px ──────────
const PORT = 9411;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
   '--user-data-dir=' + process.env.TEMP + '/grasa-' + Date.now(), '--no-first-run', 'about:blank']);
await dormir(1800);
const t0 = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(t0.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', m => { const o = JSON.parse(m); A.verError(o); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
const cmd = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
await cmd('Page.enable'); await cmd('Runtime.enable');
const ev = async e => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;

for (const tema of ['claro', 'oscuro']) {
  await cmd('Emulation.setDeviceMetricsOverride', { width: 360, height: 760, deviceScaleFactor: 2, mobile: true });
  // 🔴 El tema se FIJA: Chrome headless arranca en OSCURO y las «capturas del modo claro» de
  //    v493 eran del oscuro (gotcha ya escrito).
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  await cmd('Page.navigate', { url: 'data:text/html,<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' });
  await dormir(500);
  await ev(`(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(CSS)};document.head.appendChild(s);
    document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
    document.body.style.cssText='margin:0;padding:14px;background:var(--bg)';
    document.body.innerHTML='<div class="card" style="padding:12px">'+${JSON.stringify(bloques.po + bloques.flag + bloques.falta)}+'</div>';
    return 1})()`);
  await dormir(400);
  const m = await ev(`(()=>{const b=document.querySelector('.medgrasa'); if(!b) return {falta:true};
    const r=b.getBoundingClientRect(), n=document.querySelector('.mg-n');
    const cs=getComputedStyle(n);
    let peor=0; document.querySelectorAll('.medgrasa *').forEach(el=>{const x=Math.round(el.getBoundingClientRect().right-window.innerWidth); if(x>peor)peor=x;});
    return {alto:Math.round(r.height), num:(n&&n.textContent||'').trim(), color:cs.color, bg:getComputedStyle(b).backgroundColor, excesoPx:peor};
  })()`);
  A.ok(!m.falta && m.alto > 40, `${tema}: el bloque se pinta con alto real`, m);
  A.ok(m.excesoPx <= 1, `${tema}: no se desborda a 360 px (exceso ${m.excesoPx}px)`, m);
  // El número tiene que tener color y fondo REALES: si el token no resuelve, queda transparente.
  A.ok(/rgb/.test(m.color || '') && !/rgba\(0, 0, 0, 0\)/.test(m.color || ''), `${tema}: el número tiene color resuelto`, m.color);
  A.ok(!/rgba\(0, 0, 0, 0\)/.test(m.bg || ''), `${tema}: la caja tiene fondo propio (no hereda la página)`, m.bg);
  const r = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/grasa-${tema}.png`, Buffer.from(r.result.data, 'base64'));
}

ws.close();
salir(A, { chrome, out: OUT });
