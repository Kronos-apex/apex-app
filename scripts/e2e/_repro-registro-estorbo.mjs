// ════════════════════════════════════════════════════════════════════════════════════════
// REPRO — v571 · «hacer el registro es super incomodo y tedioso por esas tarjetas»
//
// Reporte del PO el 3-sep, registrando a DOS asesorados nuevos en persona. Al tocar «Crear
// cuenta» solo se escondia `#cin-cta`: la tira de tarjetas de resultados (v523) y el bloque
// «Instala la app» viven ENTRE los botones y las tarjetas de formulario, asi que seguian
// puestos DURANTE TODO EL REGISTRO.
//
// v578 · LA TIRA YA NO EXISTE: el PO la mando a la web («las prefiero en la web de la app,
// incomodan mucho», 6-sep). Este repro se queda por el bloque de instalacion, que sigue
// viviendo ahi, y de paso vigila que la tira no vuelva a colarse en la bienvenida.
//
// MEDIDO, y tumbo mi primera hipotesis: el primer campo SI se alcanza sin scrollear en los dos
// telefonos, antes y despues (campoTop dentro del viewport, scroll de pagina 0). Lo que la
// medicion sostiene es que la tira sigue VISIBLE durante todo el registro — una tira con
// scroll horizontal y scroll-snap pegada al formulario. El mecanismo exacto de la molestia lo
// sabe quien lo sufrio; lo que este repro prueba es que deja de estar.
//
//   node scripts/e2e/_repro-registro-estorbo.mjs
// ════════════════════════════════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { tmpdir } from 'node:os';   // el perfil de Chrome NUNCA dentro del repo: se colo en un commit

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 8811;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const srv = createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html');
  if (!existsSync(f) || f.indexOf(ROOT) !== 0) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => srv.listen(PORT, r));

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(existsSync);
if (!CHROME) { console.error('No hay Chrome'); process.exit(1); }
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9411',
  '--no-first-run', '--disable-gpu', `--user-data-dir=${join(tmpdir(), 'avi-chrome-registro')}`, 'about:blank']);

const wsUrl = await (async () => {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch('http://127.0.0.1:9411/json/version'); return (await r.json()).webSocketDebuggerUrl; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  throw new Error('Chrome no levanto');
})();

const { WebSocket } = await import('node:worker_threads').then(() => ({ WebSocket: globalThis.WebSocket }));
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
});
const send = (method, params = {}, sessionId) => new Promise(res => {
  const i = ++id; pend.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' }).then(r => r.result);
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }).then(r => r.result);
const ev = async (expr) => (await send('Runtime.evaluate',
  { expression: expr, awaitPromise: true, returnByValue: true }, sessionId)).result?.result?.value;

const TELEFONOS = [
  { n: 'iPhone 12 / Android medio', w: 390, h: 844 },
  { n: 'iPhone SE / Android corto', w: 360, h: 640 },
];

console.log('\n\u2501'.repeat(1) + ' REGISTRO: cuanto estorba la bienvenida \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n');
let fallos = 0;

for (const t of TELEFONOS) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: t.w, height: t.h, deviceScaleFactor: 2, mobile: true }, sessionId);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` }, sessionId);
  await new Promise(r => setTimeout(r, 2600));

  /* v578: la tira de tarjetas de resultados YA NO EXISTE aqui — el PO la mando a la web. Lo que
     queda entre los botones y el formulario es el bloque «Instala la app», y es lo que este
     repro sigue vigilando. Se FUERZA visible: en headless no llega el evento de instalacion,
     asi que sin esto la asercion saldria gratis y el harness aprobaria por vacio.
     (Sin comillas invertidas: esto vive DENTRO de un template literal.) */
  await ev(`(()=>{const ih=document.getElementById('install-hint'); if(ih)ih.style.display='block';
    return 1})()`);

  // CONTROL DE MONTAJE: si el bloque no ocupa alto, esta medicion no vale.
  const altoTira = await ev(`document.getElementById('install-hint').getBoundingClientRect().height`);
  if (!(altoTira > 40)) {
    console.log(`  \x1b[33m!! MONTAJE\x1b[0m ${t.n}: el bloque mide ${Math.round(altoTira)}px, no se puede medir el estorbo`);
    fallos++; continue;
  }

  // Toca «Crear cuenta» exactamente como la persona.
  await ev(`document.querySelector('.cin-cta-out').click();1`);
  await new Promise(r => setTimeout(r, 500));

  const m = await ev(`(()=>{
    const sc=document.getElementById('cin-showcase'), ih=document.getElementById('install-hint');
    const campo=document.getElementById('su-name');
    const vis=el=>{ if(!el) return false; const r=el.getBoundingClientRect();
      return r.height>0 && getComputedStyle(el).display!=='none'; };
    const r=campo?campo.getBoundingClientRect():null;
    return JSON.stringify({
      tiraExiste: !!sc, instalVisible: vis(ih),
      campoTop: r?Math.round(r.top):null,
      campoDentro: r? (r.top>=0 && r.bottom<=window.innerHeight) : false,
      scrollPagina: Math.round(document.scrollingElement.scrollHeight-window.innerHeight)
    });
  })()`);
  const d = JSON.parse(m);

  const ok = !d.tiraExiste && !d.instalVisible && d.campoDentro;
  console.log(`  ${ok ? '\x1b[32mOK  \x1b[0m' : '\x1b[31mFALLA\x1b[0m'} ${t.n} (${t.w}x${t.h})`);
  console.log(`        tira de tarjetas en la bienvenida     : ${d.tiraExiste ? 'SI (volvio: el PO la quiso en la web)' : 'no existe (v578)'}`);
  console.log(`        bloque «Instala la app» visible       : ${d.instalVisible ? 'SI (estorba)' : 'no'}`);
  console.log(`        primer campo del formulario           : y=${d.campoTop}px  ${d.campoDentro ? 'se ve sin scrollear' : 'HAY QUE SCROLLEAR'}`);
  console.log(`        scroll de pagina sobrante             : ${d.scrollPagina}px`);
  if (!ok) fallos++;

  // Y al volver, lo que se aparto TIENE que reaparecer (v508: lo que se apaga se enciende).
  await ev(`WZ.back();1`);
  await new Promise(r => setTimeout(r, 350));
  const vuelve = await ev(`(()=>{const ih=document.getElementById('install-hint');
    return getComputedStyle(ih).display!=='none' && ih.getBoundingClientRect().height>40})()`);
  console.log(`        al tocar «← Volver» el bloque vuelve    : ${vuelve ? '\x1b[32msi\x1b[0m' : '\x1b[31mNO — se apago para siempre\x1b[0m'}`);
  if (!vuelve) fallos++;
}

ws.close(); chrome.kill(); srv.close();
console.log('\n' + '-'.repeat(70));
if (fallos) { console.log(`\x1b[31m${fallos} fallos\x1b[0m`); process.exit(1); }
console.log('\x1b[32mOK — la bienvenida se aparta y vuelve\x1b[0m');
process.exit(0);
