// ¿Se corta alguna pestaña de la barra inferior del asesorado?
//
// Se mide el DOM VIVO con el styles.css REAL, no se razona sobre la regla: `.cntab` es
// flex:1, así que el ancho por pestaña depende del viewport y del número de pestañas, y
// el texto se recorta sin dar ningún error. La barra del ASESORADO tiene 6 (Comunidad
// llegó en v373) y la del COACH 5, así que hay que mirar las dos.
//
// El criterio es lo que sufre la persona: el texto no cabe en su celda (scrollWidth >
// clientWidth) o se sale de la pantalla. Se barre en las tres tallas de letra, porque
// `.cnp` lleva zoom con «Grande» y «Muy grande» (lección de v544).
//
//   node scripts/e2e/_repro-nav-corte.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import WebSocket from 'ws';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = readFileSync(join(RAIZ, 'styles.css'), 'utf8');
// La tipografia REAL o la medida no vale: una fuente de respaldo mas estrecha diria que
// cabe algo que en el telefono no cabe. Se toma el <link> tal cual de index.html.
const FONTLINK = (readFileSync(join(RAIZ, 'index.html'), 'utf8')
  .match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];
const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');

// Las pestañas se LEEN de index.html — escribirlas a mano dejaría fuera la que alguien
// agregue mañana, que es justo el caso que rompió esto (Comunidad, v373).
// El rotulo es lo que queda entre el </div> del icono y el </div> de la pestana.
const rotulos = (clase) => [...HTML.matchAll(
  new RegExp(`<div class="${clase}[^"]*"[^>]*>[\\s\\S]*?</svg></(?:div|span)>\\s*(?:</div>)?\\s*([^<]+)</div>`, 'g'))]
  .map(m => m[1].trim()).filter(Boolean);
const tabsCliente = rotulos('cntab');
const tabsCoach = rotulos('cbnav-item');

const PORT = 9401;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
   '--user-data-dir=' + process.env.TEMP + '/navprof-' + Date.now(),
   '--no-first-run', 'about:blank']);

const dormir = ms => new Promise(r => setTimeout(r, ms));
await dormir(1800);

const listar = async () => (await (await fetch(`http://localhost:${PORT}/json`)).json());
let t = (await listar()).find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', m => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;

// 🔴 SIN el meta viewport la pagina se maqueta a 980px (el ancho por defecto de movil) y
// la medida no tiene NADA que ver con un telefono: la primera corrida dio 163px por
// pestana, o sea 6x163=978. Un fixture que no se parece a produccion fabrica defectos que
// no existen.
const pagina = (css, tabs, clase, contenedor) => `data:text/html;charset=utf-8,` + encodeURIComponent(
  `<meta name="viewport" content="width=device-width,initial-scale=1">` +
  FONTLINK +
  `<style>html,body{margin:0}${css}</style><div class="${contenedor}">` +
  tabs.map(x => `<div class="${clase}"><div class="ctico"><svg viewBox="0 0 24 24"></svg></div>${x}</div>`).join('') +
  `</div>`);

let fallos = 0, medidas = 0;
for (const [nombre, tabs, clase, cont] of [
  ['asesorado', tabsCliente, 'cntab', 'cntabs'],
  ['coach', tabsCoach, 'cbnav-item', 'coach-bottom-nav'],
]) {
  if (!tabs.length) { console.log(`🔴 no se extrajo ninguna pestaña de ${nombre}: revisa el patrón`); fallos++; continue; }
  console.log(`\n── barra del ${nombre.toUpperCase()} (${tabs.length}): ${tabs.join(' · ')}`);
  for (const [ancho, fs] of [[360, 'normal'], [390, 'normal'], [360, 'lg'], [360, 'xl']]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width: ancho, height: 800, deviceScaleFactor: 1, mobile: true });
    await cmd('Page.navigate', { url: pagina(CSS, tabs, clase, cont) });
    await dormir(450);
    await ev(`document.documentElement.setAttribute('data-fs','${fs}')`);
    // 🔒 CONTROL DEL MONTAJE: si la tipografia de marca no cargo, se esta midiendo con una
    // de respaldo mas estrecha y el verde no significa nada. Se afirma, no se supone.
    const fuenteOk = await ev(`(async()=>{try{await document.fonts.ready;` +
      `return document.fonts.check('600 11px "Plus Jakarta Sans"')}catch(e){return false}})()`);
    if (!fuenteOk) {
      console.log(`   ${ancho}px · letra ${fs}: 🔴 la tipografia de marca NO cargo — medida invalida`);
      fallos++; continue;
    }
    await dormir(120);
    // 🔴 `.cntab` NO recorta: el texto ENVUELVE. Por eso `scrollWidth > clientWidth` no
    // acusa nada (lo dijo el control de discriminacion, que salio en rojo con un rotulo
    // imposible). Lo que hay que medir es el TEXTO: cuanto ocupa de verdad y en cuantas
    // lineas cae — un rotulo partido en dos es lo que la persona ve como «cortado».
    const r = await ev(`JSON.stringify([...document.querySelectorAll('.${clase}')].map(e=>{
      const n=[...e.childNodes].filter(x=>x.nodeType===3&&x.textContent.trim()).pop();
      const rg=document.createRange(); let tw=0, lineas=0;
      if(n){ rg.selectNodeContents(n); tw=rg.getBoundingClientRect().width; lineas=rg.getClientRects().length; }
      const cs=getComputedStyle(e);
      const util=e.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
      return {t:(n?n.textContent:'').trim(), texto:Math.round(tw), util:Math.round(util),
              lineas, der:Math.round(e.getBoundingClientRect().right)};
    }))`);
    const filas = JSON.parse(r || '[]');
    medidas += filas.length;
    const malas = filas.filter(f => f.lineas > 1 || f.texto > f.util + 0.5 || f.der > ancho + 1);
    console.log(`   ${ancho}px · letra ${fs}: ` + (malas.length
      ? `🔴 ${malas.map(f => `«${f.t}» ocupa ${f.texto}px en ${f.util} útiles${f.lineas > 1 ? ` y cae en ${f.lineas} líneas` : ''}`).join(' · ')}`
      : '✅ las ' + filas.length + ' caben (la más justa: ' +
        filas.map(f => `${f.t} ${f.texto}/${f.util}`).sort((a, b) =>
          (parseFloat(b.split(' ')[1]) / parseFloat(b.split('/')[1])) -
          (parseFloat(a.split(' ')[1]) / parseFloat(a.split('/')[1])))[0] + ')'));
    if (malas.length) fallos++;
  }
}

// Control de cobertura: si no se midió nada, el verde no vale (lección de v527).
if (medidas < 20) { console.log(`\n🔴 solo ${medidas} medidas: el montaje no barrió lo que dice`); fallos++; }

// 🔒 CONTROL DE DISCRIMINACION: una sonda que no puede dar rojo no es una sonda. Con un
// rotulo imposible TIENE que acusar; si sale verde, el criterio no mide nada y el ✅ de
// arriba tampoco significa nada.
await cmd('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
await cmd('Page.navigate', { url: pagina(CSS, [...tabsCliente, 'Entrenamientos personalizados'], 'cntab', 'cntabs') });
await dormir(500);
const ctrl = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.cntab')].map(e=>{
  const n=[...e.childNodes].filter(x=>x.nodeType===3&&x.textContent.trim()).pop();
  const rg=document.createRange(); let tw=0, lineas=0;
  if(n){ rg.selectNodeContents(n); tw=rg.getBoundingClientRect().width; lineas=rg.getClientRects().length; }
  const cs=getComputedStyle(e);
  return {t:(n?n.textContent:'').trim(), texto:tw, util:e.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight), lineas};
}))`) || '[]');
const acusa = ctrl.some(f => f.lineas > 1 || f.texto > f.util + 0.5);
console.log(`\ncontrol · con un rótulo imposible: ${acusa ? '✅ la sonda lo acusa' : '🔴 NO lo acusa — el criterio no mide nada'}`);
if (!acusa) fallos++;
console.log(`\n${fallos ? '🔴 ' + fallos + ' combinaciones con texto cortado' : '✅ ninguna pestaña se corta'}`);
ws.close(); chrome.kill();
process.exit(fallos ? 1 : 0);
