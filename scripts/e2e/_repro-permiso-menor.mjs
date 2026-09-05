// ════════════════════════════════════════════════════════════════════════════════════════
// REPRO — v573 · la puerta del acudiente para publicar a un MENOR
//
// EL DEFECTO. Samuel se registro declarando 28 anios y tiene 15. Con esa edad falsa la app le
// publico la tarjeta el 29-ago. Al corregirle la edad, `clientProgressStory` empezo a devolver
// `menor` y la ficha se quedo SIN NINGUNA SALIDA UTIL: explicaba por que no se podia y no
// ofrecia nada. O sea que un coach CON el permiso del acudiente en la mano quedaba exactamente
// en el mismo sitio que uno que no lo tenia, y la tarjeta ya publicada no se podia corregir por
// ningun camino de la app (la tabla no acepta UPDATE: corregir = quitar y volver a publicar,
// y publicar era justo lo prohibido).
//
// 🔒 LO QUE ESTE HARNESS PRUEBA, y que la suite NO puede probar: la suite afirma el motor puro,
//    pero la puerta es una PANTALLA. Aqui se toca como lo toca el coach, en el DOM real, con el
//    CSS real y a 360 px.
//
// 🔴 LOS DOS CONTROLES, sin los cuales esto no mide nada (leccion de las sondas de falsos
//    positivos): COBERTURA — si `renderStoryCard` no pinto nada, toda afirmacion sobre lo que
//    «no aparece» sale gratis; DISCRIMINACION — el mismo menor SIN permiso tiene que quedar
//    bloqueado, o un candado caido pasaria el harness entero.
//    Y todo se lee de lo VISIBLE (rect + getComputedStyle), nunca del innerHTML.
//
//   node scripts/e2e/_repro-permiso-menor.mjs
// ════════════════════════════════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 8817;
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
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9417',
  '--no-first-run', '--disable-gpu', `--user-data-dir=${join(tmpdir(), 'avi-chrome-permiso')}`, 'about:blank']);

const wsUrl = await (async () => {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch('http://127.0.0.1:9417/json/version'); return (await r.json()).webSocketDebuggerUrl; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  throw new Error('Chrome no levanto');
})();

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

// Historial con progresion de carga suficiente para que haya historia que contar (>= 8 sesiones).
const HIST = `(()=>{const s=[];for(let i=0;i<10;i++){s.push({date:new Date(Date.now()-(70-i*7)*864e5).toISOString().slice(0,10),
  exercises:[{name:'Prensa de Pierna',sets:[{kg:40+i*6,reps:10}]},{name:'Jalon al Pecho',sets:[{kg:20+i*2,reps:10}]}]});}return s})()`;

// Monta un menor en la ficha del coach y pinta su tarjeta de progreso, exactamente con la
// funcion real. `sv` se intercepta para no tocar la nube ni el localStorage del navegador.
const montar = async () => ev(`(()=>{
  window.__guardados=0;
  if(!window.__svReal){ window.__svReal=window.sv; window.sv=function(){ window.__guardados++; }; }
  window.__toasts=[];
  if(!window.__toastReal){ window.__toastReal=window.toast; window.toast=function(t){ window.__toasts.push(String(t)); }; }
  DB.clients=[{id:'smx',name:'Samuel Cifuentes',age:15,sex:'m',
    consent:{general:true,salud:true,menor:true,adulto:false,edad:15,
             acudiente:{nombre:'Marta Restrepo',tel:'573001234567'},v:'legal-3',at:'2026-09-01T10:00:00.000Z'}}];
  DB.history={smx:${HIST}};
  CUR.clientId='smx';
  window.__c=DB.clients[0];
  /* La ficha del coach es un panel apagado hasta que el navega. Se abre con la MISMA funcion
     de la app (gp), no forzando estilos a mano: si se pinta sobre un panel oculto, todo lo que
     este harness afirme sobre lo VISIBLE sale gratis — lo caza el control de cobertura.
     Y el PANEL NO BASTA: vive dentro de la pantalla del coach, que esta apagada hasta que el
     entra — medido aqui mismo, el innerHTML tenia 2.064 caracteres con alto 0.
     (Sin comillas invertidas: esto vive DENTRO de un template literal.) */
  showScreen('s-coach'); gp('p-detail',null,'Detalle',true);
  renderStoryCard(window.__c);
  return 1})()`);

// Lee SOLO lo visible.
const leer = async () => JSON.parse(await ev(`(()=>{
  const vis=el=>{ if(!el) return false; const r=el.getBoundingClientRect();
    return r.width>0 && r.height>0 && getComputedStyle(el).visibility!=='hidden'; };
  const cont=document.getElementById('d-story');
  const ck=document.getElementById('d-story-acu-ck');
  const puerta=document.querySelector('#d-story details');
  const btnReg=[...document.querySelectorAll('#d-story button')].find(b=>/Registrar la autorizaci/.test(b.textContent));
  const btnRet=[...document.querySelectorAll('#d-story button')].find(b=>/Retirar/.test(b.textContent));
  const btnImg=[...document.querySelectorAll('#d-story button')].find(b=>/Crear la imagen/.test(b.textContent));
  // desbordamiento horizontal DENTRO de la tarjeta (a 360 px es donde se rompe)
  const desborde=cont?Math.max(0,cont.scrollWidth-cont.clientWidth):0;
  return JSON.stringify({
    pintoAlgo: vis(cont) && cont.getBoundingClientRect().height>20,
    altoTarjeta: cont?Math.round(cont.getBoundingClientRect().height):0,
    puertaVisible: vis(puerta),
    casillaExiste: !!ck, casillaMarcada: !!(ck&&ck.checked),
    botonRegistrar: vis(btnReg), botonRetirar: vis(btnRet), botonImagen: vis(btnImg),
    desborde,
    guardados: window.__guardados, toasts: window.__toasts.slice(),
    tienePermiso: (typeof showcaseMinorOk==='function') && showcaseMinorOk(window.__c),
    consentGuardado: window.__c.showcaseConsent?JSON.parse(JSON.stringify(window.__c.showcaseConsent)):null
  })})()`));

console.log('\n\u2501\u2501\u2501 v573 \u00b7 LA PUERTA DEL ACUDIENTE, EN LA PANTALLA REAL \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n');
let fallos = 0;
const afirma = (ok, txt, detalle) => {
  console.log(`  ${ok ? '\x1b[32mOK   \x1b[0m' : '\x1b[31mFALLA\x1b[0m'} ${txt}${detalle ? '  \x1b[90m' + detalle + '\x1b[0m' : ''}`);
  if (!ok) fallos++;
};

for (const t of [{ n: 'iPhone 12 / Android medio', w: 390, h: 844 },
                 { n: 'iPhone SE / Android corto', w: 360, h: 640 }]) {
  console.log(`\n\u2500\u2500 ${t.n} (${t.w}\u00d7${t.h}) \u2500\u2500`);
  await send('Emulation.setDeviceMetricsOverride',
    { width: t.w, height: t.h, deviceScaleFactor: 2, mobile: true }, sessionId);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` }, sessionId);
  await new Promise(r => setTimeout(r, 2600));
  await montar();
  let d = await leer();

  // ── CONTROL DE COBERTURA ────────────────────────────────────────────────────────────
  // Si la tarjeta no se pinto, TODO lo de abajo saldria gratis.
  if (!d.pintoAlgo) {
    afirma(false, 'CONTROL DE COBERTURA: renderStoryCard no pinto nada', `alto=${d.altoTarjeta}px`);
    continue;
  }
  afirma(true, 'CONTROL DE COBERTURA: la tarjeta se pinto', `alto=${d.altoTarjeta}px`);

  // ── 1) SIN permiso: bloqueado, pero CON puerta (esto es lo que v572 no tenia) ────────
  afirma(!d.tienePermiso, 'el menor arranca SIN permiso');
  afirma(!d.botonImagen, 'sin permiso NO se ofrece crear la imagen');
  afirma(d.puertaVisible, 'la puerta del acudiente esta a la vista');
  afirma(d.casillaExiste && !d.casillaMarcada, '🔒 la casilla NO viene pre-marcada',
    d.casillaMarcada ? 'VIENE MARCADA' : 'sin marcar');
  afirma(d.botonRegistrar, 'hay boton para registrar la autorizacion');

  // ── 2) Registrar SIN marcar la casilla: se niega ─────────────────────────────────────
  await ev(`document.getElementById('d-story-acu-nom').value='Marta Restrepo';
            registrarPermisoVitrina();1`);
  d = await leer();
  afirma(!d.tienePermiso && d.guardados === 0,
    'sin marcar la casilla NO se firma nada', `guardados=${d.guardados}`);

  // ── 3) Marcada pero SIN nombre: se niega ────────────────────────────────────────────
  await ev(`document.getElementById('d-story-acu-ck').checked=true;
            document.getElementById('d-story-acu-nom').value='';
            registrarPermisoVitrina();1`);
  d = await leer();
  afirma(!d.tienePermiso && d.guardados === 0,
    'sin nombre del acudiente NO se firma nada', `guardados=${d.guardados}`);

  // ── 4) Completo: se registra y la tarjeta pasa a publicable ──────────────────────────
  await ev(`document.getElementById('d-story-acu-ck').checked=true;
            document.getElementById('d-story-acu-nom').value='Marta Restrepo';
            document.getElementById('d-story-acu-tel').value='573001234567';
            registrarPermisoVitrina();1`);
  d = await leer();
  afirma(d.tienePermiso, 'con la casilla y el nombre, el permiso queda registrado');
  afirma(d.guardados > 0, 'el permiso se GUARDA', `sv() llamado ${d.guardados}\u00d7`);
  afirma(!!(d.consentGuardado && d.consentGuardado.at && d.consentGuardado.v),
    'la evidencia dice cuando y con que version');
  afirma(!!(d.consentGuardado && d.consentGuardado.acudiente
    && d.consentGuardado.acudiente.nombre === 'Marta Restrepo'), 'la evidencia dice QUIEN autorizo');
  afirma(d.botonImagen, 'ahora SI se ofrece crear la imagen para compartir');
  afirma(d.botonRetirar, '🔒 y la salida esta a la vista: hay boton para RETIRAR');

  // ── 5) Retirar: vuelve a bloquear y la prueba NO se borra ────────────────────────────
  await ev(`window.confirm=()=>true; retirarPermisoVitrina();1`);
  d = await leer();
  afirma(!d.tienePermiso, 'retirar el permiso vuelve a bloquear la publicacion');
  afirma(!d.botonImagen, 'y deja de ofrecer la imagen');
  afirma(!!(d.consentGuardado && d.consentGuardado.retiradoAt), 'el retiro queda FECHADO');
  afirma(!!(d.consentGuardado && d.consentGuardado.acudiente
    && d.consentGuardado.acudiente.nombre === 'Marta Restrepo'),
    '🔒 retirar NO borro la prueba de que si autorizo');
  afirma(d.puertaVisible, 'y la puerta sigue ahi para volver a autorizar');

  // ── 6) A 360 px nada se desborda ────────────────────────────────────────────────────
  afirma(d.desborde === 0, 'la tarjeta no desborda a lo ancho', `desborde=${d.desborde}px`);
}

// ── CONTROL DE DISCRIMINACION ─────────────────────────────────────────────────────────
// El mismo montaje con un ADULTO tiene que comportarse al reves: ni puerta ni casilla, y la
// imagen disponible de una. Si esto no cambia, el harness no esta midiendo el candado.
console.log('\n\u2500\u2500 CONTROL DE DISCRIMINACION (la misma pantalla con una adulta) \u2500\u2500');
await ev(`DB.clients=[{id:'ax',name:'Astrid Beltran',age:33}];
          DB.history={ax:${HIST}}; CUR.clientId='ax'; window.__c=DB.clients[0];
          showScreen('s-coach'); gp('p-detail',null,'Detalle',true); renderStoryCard(window.__c);1`);
const a = await leer();
afirma(a.pintoAlgo, 'CONTROL: la tarjeta de la adulta se pinto');
afirma(!a.puertaVisible && !a.casillaExiste, 'a una adulta NO se le pide permiso de acudiente');
afirma(a.botonImagen, 'a una adulta se le ofrece la imagen de una');
afirma(!a.botonRetirar, 'y no hay nada que retirar');

ws.close(); chrome.kill(); srv.close();
console.log('\n' + '-'.repeat(72));
if (fallos) { console.log(`\x1b[31m${fallos} fallos\x1b[0m`); process.exit(1); }
console.log('\x1b[32mOK \u2014 la puerta del acudiente se abre, se ve, y se puede cerrar\x1b[0m');
process.exit(0);
