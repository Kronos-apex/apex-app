#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _verify-vitrina-corte.mjs — la tarjeta de la vitrina no puede quedar CORTADA
// en la pantalla de bienvenida.
//
// EL DEFECTO (medido el 2026-08-30, cazado MIRANDO la captura, no con un test):
// `.cin-wrap` es una COLUMNA de alto fijo (100% de la pantalla), así que sus hijos
// se ENCOGEN cuando el contenido queda justo — y la tira de la vitrina era la que
// cedía. Al encogerse recorta por dentro, porque `overflow-x:auto` obliga a
// `overflow-y` a valer `auto` (el navegador no permite dejarlo en `visible`), y lo
// que se pierde es la ÚLTIMA LÍNEA de la tarjeta: «Subió carga en 16 de 28
// ejercicios». Con el chip del objetivo (v555) las tres tarjetas que lo llevan
// desbordaban 8 px en un teléfono de 844.
//
// 🔴 Y AL MEDIRLO POR ALTURAS RESULTÓ MUCHO PEOR, Y ANTERIOR AL CHIP. Con el defecto
// puesto: a 800 px se cortan 3 tarjetas, a 720 las 6 pierden 90 px, y **a 640 px la
// tira entera colapsa a 55 px** (170 px perdidos). O sea que en cualquier teléfono
// más corto que 844 la vitrina se aplastaba — y 640-800 es media gama Android y el
// iPhone SE. El chip solo lo hizo visible en la pantalla más grande.
//
// ⚠️ POR ESO SE MIDE EN DOS ALTURAS. A 844 y EN LOCAL el defecto NO se reproduce: la
// bienvenida pinta la variante de TEXTO del banner de instalación, que es más baja que
// la de BOTÓN que sale en producción, y la columna no llega a apretar. Un montaje que
// solo mire 844 sale VERDE sobre el defecto — le pasó a la primera versión de este
// harness, y lo delató el sabotaje.
//
// 🔴 LA ASERCIÓN VA SOBRE LA CONSECUENCIA, NO SOBRE EL SELECTOR. Un check que
// buscara `flex-shrink:0` en el CSS aprobaría el día que el arreglo correcto sea
// otro, y marcaría en rojo código sano — que es como se aprende a ignorar un gate.
// Aquí se pregunta lo que le pasa a la persona: ¿se lee la tarjeta entera?
//
// 🔒 Y LLEVA SU CONTROL DE MONTAJE: si la vitrina no llegó a pintar (sin red, o
// sin tarjetas publicadas) se ABORTA en vez de salir verde sobre una pantalla vacía.
//
//   node scripts/e2e/_verify-vitrina-corte.mjs
//
// Lee la vitrina PÚBLICA de producción con la llave publicable (es la única tabla
// que se lee sin cuenta). No escribe nada y no inicia sesión.
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RAIZ = join(import.meta.dirname, '..', '..');
const PORT = 8797, CDP = 9397;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + CDP,
  '--user-data-dir=' + process.env.TEMP + '/vitcorte-' + Date.now(), '--no-first-run',
  '--window-size=390,844', `http://localhost:${PORT}/`]);

let page = null;
for (let i = 0; i < 120 && !page; i++) {
  try { const t = await (await fetch('http://localhost:' + CDP + '/json/list')).json();
        page = t.find(x => x.type === 'page' && x.url.includes('localhost')); } catch {}
  if (!page) await sleep(500);
}
if (!page) { console.error('❌ no arrancó Chrome'); srv.kill(); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown')
    jsErrors.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

const fin = (code) => { try { ws.close(); } catch {} chrome.kill(); srv.kill(); process.exit(code); };

await new Promise(r => ws.on('open', r)); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// CONTROL DE MONTAJE: sin tarjetas pintadas esto no mide nada.
let listo = false;
for (let i = 0; i < 80 && !listo; i++) { listo = await ev(`!!document.querySelector('#cin-showcase .sc-card')`); if (!listo) await sleep(500); }
if (!listo) { console.error('❌ ABORTO: la vitrina nunca pintó — sin tarjetas esta corrida no prueba nada'); fin(1); }

const medir = async () => JSON.parse(await ev(`(()=>{
  const cont=document.getElementById('cin-showcase');
  const wrap=document.querySelector('.cin-wrap');
  const cards=[...cont.querySelectorAll('.sc-card')];
  return JSON.stringify({
    tarjetas: cards.length,
    conChip: cont.querySelectorAll('.sc-goal').length,
    tira: Math.round(cont.getBoundingClientRect().height),
    recortadas: cards.map(c=>({n:(c.querySelector('.sc-name')||{}).textContent||'?',
                               px:c.scrollHeight-c.clientHeight})).filter(x=>x.px>0),
    tiraRecortaVertical: cont.scrollHeight > cont.clientHeight+1,
    desliza: cont.scrollWidth > cont.clientWidth+4,
    // 🔴 LA PREGUNTA NO ES si está en la primera pantalla, SINO si se puede ALCANZAR.
    // La columna se desplaza, así que quedar bajo la línea de flotación es normal; lo
    // que no se tolera es lo INALCANZABLE, porque la pantalla de login recorta.
    // 🔴 SE DESPLAZA DE VERDAD, no se calcula. Comparar scrollHeight con clientHeight
    // da cierto AUNQUE el elemento no pueda desplazarse (con overflow visible el contenido
    // desborda igual), así que la versión aritmética de este check salía VERDE con el
    // desplazamiento quitado: lo delató el sabotaje. Aquí se empuja el scroll al fondo
    // y se mira cuánto bajó DE VERDAD.
    inalcanzable: (()=>{
      const antes = wrap.scrollTop;
      wrap.scrollTop = wrap.scrollHeight;          // intenta bajar del todo
      const wb = wrap.getBoundingClientRect().bottom;
      const fuera = [...wrap.children].map(e=>{const b=e.getBoundingClientRect();
        return {et:(e.id||String(e.className).split(/\\s+/)[0]||e.tagName), px:Math.round(b.bottom-wb)};
      }).filter(x=>x.px>1);
      wrap.scrollTop = antes;
      return fuera;
    })(),
    puedeDesplazarse: (()=>{ const a=wrap.scrollTop; wrap.scrollTop=wrap.scrollHeight;
      const bajo=wrap.scrollTop>a; wrap.scrollTop=a; return bajo; })(),
    scrollLateralPagina: document.documentElement.scrollWidth > document.documentElement.clientWidth
  });})()`));

let fallos = 0;
const ok = (cond, txt, extra) => { console.log(`  ${cond ? '✅' : '❌'} ${txt}${extra ? ' — ' + extra : ''}`); if (!cond) fallos++; };

// 🔴 DOS ALTURAS: la grande (donde lo vio el PO) y una REAL de gama media / iPhone SE,
// que es donde el defecto muerde de verdad. Una sola altura deja el candado ciego.
for (const [w, h, etq] of [[390, 844, 'teléfono grande'], [360, 640, 'teléfono corto']]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(500);
  const m = await medir();
  console.log(`
── ${w}×${h} (${etq}) · ${m.tarjetas} tarjetas, ${m.conChip} con chip · tira ${m.tira}px`);
  ok(m.tarjetas >= 1, 'control: hay tarjetas que medir', `${m.tarjetas}`);
  ok(m.recortadas.length === 0, 'ninguna tarjeta queda cortada por dentro',
     m.recortadas.length ? m.recortadas.map(r => `${r.n} pierde ${r.px}px`).join(' · ') : `las ${m.tarjetas} completas`);
  ok(!m.tiraRecortaVertical, 'la tira no recorta en vertical');
  ok(m.desliza, 'la tira sigue deslizándose de lado');
  ok(m.inalcanzable.length === 0, 'todo lo de la bienvenida se puede alcanzar',
     m.inalcanzable.length ? m.inalcanzable.map(x => `${x.et} queda ${x.px}px fuera de alcance`).join(' · ')
                           : (m.puedeDesplazarse ? 'se desplaza y todo llega' : 'cabe entero'));
  ok(!m.scrollLateralPagina, 'la página no se arrastra de lado');
}
ok(jsErrors.length === 0, 'sin errores de JS', jsErrors.join(' | '));

console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ VITRINA OK — la tarjeta se lee entera');
fin(fallos ? 1 : 0);
