#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _verify-medidas.mjs — medidas corporales, dirección A (v566)
//
// LO QUE SE MIDIÓ EN PRODUCCIÓN (2026-09-02, cuentas reales, solo SELECT):
//   · 8 de 24 personas se han medido alguna vez. Las 8, EXACTAMENTE UNA VEZ.
//     Cero segundas tomas. (Peso: 18 personas. Fotos: 6.)
//   · Las 8 vieron lo mismo: la tabla compara «Actual» contra «Inicio» y con una
//     sola toma son el MISMO registro, así que la columna «Cambio» decía 0.0 cm
//     en todas las filas. Te mides el cuerpo entero y la app te devuelve ceros.
//   · No había forma de corregir ni de borrar una toma: un 56 tecleado como 65
//     quedaba para siempre y envenenaba la comparación de ahí en adelante.
//
// 🔴 LA SUITE NO PUEDE PROBAR ESTO SOLA. El motor (`medUpsert`, `medDelete`,
// `mergeMedidas`, `medAsimetria`) tiene sus candados en avi.test.js, pero lo que
// sufre la persona es de PANTALLA: cuántos campos ve, si el aviso de protocolo
// aparece, qué dice la app con UNA sola toma y qué dice de su lado izquierdo.
// Aquí se abre la app de verdad y se lee SOLO LO VISIBLE (`offsetParent`, `innerText`).
//
// 🔒 NO TOCA LA NUBE NI NINGUNA CUENTA: monta un asesorado de mentira en memoria
//    (`DB`/`CUR`) y neutraliza `sv` para que nada se escriba ni se sincronice.
//
//   node scripts/e2e/_verify-medidas.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RAIZ = join(import.meta.dirname, '..', '..');
const PORT = 8803, CDP = 9403;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + CDP,
  '--user-data-dir=' + process.env.TEMP + '/medidas-' + Date.now(), '--no-first-run',
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

// CONTROL DE MONTAJE: si la pantalla de medidas no cargó, esta corrida no prueba nada
// y tiene que ABORTAR — no salir verde por no haber mirado (lección v490/v537).
let listo = false;
for (let i = 0; i < 80 && !listo; i++) {
  listo = await ev(`typeof openMedModal==='function' && typeof medUpsert==='function'
    && typeof renderMedidasClient==='function' && !!document.getElementById('med-brazo_izq')
    && !!document.getElementById('cn-med-list')`);
  if (!listo) await sleep(500);
}
if (!listo) { console.error('❌ ABORTO: la pantalla de medidas nunca cargó — esta corrida no prueba nada'); fin(1); }

let fallos = 0;
const ok = (cond, txt, extra) => { console.log(`  ${cond ? '✅' : '❌'} ${txt}${extra !== undefined ? ' — ' + JSON.stringify(extra) : ''}`); if (!cond) fallos++; };

// Monta un asesorado de mentira con las tomas que se le pasen. `sv` se neutraliza:
// nada de esto puede llegar a localStorage ni a la nube.
const montar = async (tomas, edad) => ev(`(()=>{
  if(!window.__svOff){ window.__svOff=true; window.sv=function(){}; }
  window.DB = window.DB || {};
  DB.clients = [{ id:'qa1', name:'QA Medidas', age:${JSON.stringify(edad ?? 30)} }];
  DB.medidas = { qa1: ${JSON.stringify(tomas)} };
  window.CUR = window.CUR || {}; CUR.clientId='qa1';
  renderMedidasClient('qa1');
  return true;
})()`);

const leerLista = async () => JSON.parse(await ev(`(()=>{
  const el=document.getElementById('cn-med-list');
  // Lo que la persona LEE, no el HTML: un regex sobre el marcado ve texto que nadie ve.
  return JSON.stringify({ texto: el.innerText.replace(/\\s+/g,' ').trim(), html: el.innerHTML.length });
})()`));

const T1 = '2026-06-01T10:00:00.000Z', T2 = '2026-08-15T10:00:00.000Z';

// ══ 1 · El modal pide los 12 perímetros, cada uno con su instrucción ══
console.log('\n── 1 · los 12 campos de la dirección A ───────────────────────────');
await montar([]);
const campos = JSON.parse(await ev(`(()=>{
  openMedModal();
  const vis = el => !!(el && el.offsetParent !== null);
  const ids = MED_FIELDS.map(f=>'med-'+f.key);
  const pintados = ids.filter(i=>vis(document.getElementById(i)));
  // Cada campo tiene que traer su instrucción DEBAJO y visible: doce perímetros con la
  // cinta en un sitio distinto cada vez son doce números que no se pueden comparar.
  const conPista = ids.filter(i=>{
    const c=document.getElementById(i); if(!c) return false;
    const h=c.parentElement.querySelector('.medhint');
    return vis(h) && h.innerText.trim().length>15;
  });
  return JSON.stringify({
    total: ids.length, pintados: pintados.length, conPista: conPista.length,
    faltan: ids.filter(i=>!vis(document.getElementById(i))),
    aviso: vis(document.getElementById('med-first')),
    avisoTexto: (document.getElementById('med-first').innerText||'').replace(/\\s+/g,' ').trim().slice(0,160),
    lados: MED_FIELDS.filter(f=>f.lado).length
  });})()`));
ok(campos.total === 12, 'la lista declara 12 perímetros', campos.total);
ok(campos.pintados === 12, 'los 12 se pintan de verdad en la pantalla', campos.faltan);
ok(campos.lados === 8, 'ocho de ellos son por lado (brazo, antebrazo, muslo, pantorrilla × 2)', campos.lados);
ok(campos.conPista === 12, 'los 12 traen su instrucción visible debajo', campos.conPista);
ok(campos.aviso === true, 'la primera vez se ve el aviso de las tres reglas');
ok(/ayunas/i.test(campos.avisoTexto) && /suelto/i.test(campos.avisoTexto),
  'el aviso dice lo que decide si dos tomas se pueden comparar', campos.avisoTexto);

// ══ 2 · CONTROL · el aviso NO se repite cuando ya hay tomas ══
console.log('\n── 2 · CONTROL: el aviso es de una sola vez ──────────────────────');
await montar([{ id: 'x1', date: T1, mAt: T1, cintura: 80 }]);
const rep = await ev(`(()=>{ cm('m-med'); openMedModal();
  return !!(document.getElementById('med-first').offsetParent); })()`);
ok(rep === false, 'con tomas anteriores el aviso ya no aparece (repetirlo lo vuelve ruido)');

// ══ 3 · EL DEFECTO QUE VIERON LAS 8: con UNA toma no se inventa un cambio ══
console.log('\n── 3 · con UNA sola toma, punto de partida (no una columna de ceros)');
await ev(`cm('m-med')`);
await montar([{ id: 'x1', date: T1, mAt: T1, cintura: 80, brazo_izq: 30, brazo_der: 31 }]);
const una = await leerLista();
ok(!/0\.0 cm/.test(una.texto), 'NO aparece «0.0 cm» por ninguna parte', una.texto.match(/0\.0 cm/g));
ok(/punto de partida/i.test(una.texto), 'se le dice que esto es su punto de partida');
ok(!/\bCambio\b/.test(una.texto), 'la columna «Cambio» ni se dibuja con una sola toma');

// ══ 4 · CONTROL DE DISCRIMINACIÓN · con DOS tomas sí hay cambio que mostrar ══
console.log('\n── 4 · CONTROL: con dos tomas vuelve la comparación ──────────────');
await montar([
  { id: 'x2', date: T2, mAt: T2, cintura: 77, brazo_izq: 31, brazo_der: 32 },
  { id: 'x1', date: T1, mAt: T1, cintura: 80, brazo_izq: 30, brazo_der: 31 },
]);
const dos = await leerLista();
ok(/\bCambio\b/.test(dos.texto), 'con dos tomas aparece la columna «Cambio»');
ok(/-3\.0 cm/.test(dos.texto), 'y trae el número real (80 → 77 = −3.0 cm)');
ok(!/punto de partida/i.test(dos.texto), 'ya no se le habla de punto de partida');

// ══ 5 · Corregir una toma: existe la vía, y no le mueve la fecha ══
console.log('\n── 5 · corregir un dedazo ────────────────────────────────────────');
const corr = JSON.parse(await ev(`(()=>{
  openMedModal('x1');
  const t=document.getElementById('mdt-21').innerText;
  const pre=document.getElementById('med-cintura').value;
  document.getElementById('med-cintura').value='78';
  saveMedidas();
  const e=(DB.medidas.qa1||[]).find(x=>x.id==='x1');
  return JSON.stringify({ titulo:t, precargado:pre, cintura:e&&e.cintura, fecha:e&&e.date });
})()`));
ok(/corregir/i.test(corr.titulo), 'el modal dice que se está CORRIGIENDO, no registrando', corr.titulo);
ok(corr.precargado === '80', 'el campo llega precargado con lo que había', corr.precargado);
ok(corr.cintura === 78, 'la corrección se guarda', corr.cintura);
ok(corr.fecha === T1, 'corregir NO mueve la fecha de la toma (no te reescribe la historia)', corr.fecha);

// ══ 6 · Borrar: pide confirmación EN LA FILA y deja lápida, no un `filter` ══
console.log('\n── 6 · borrar de verdad (y que dure) ─────────────────────────────');
const bor = JSON.parse(await ev(`(()=>{
  askDelMedida('x1'); renderMedidasClient('qa1');
  const pide=/S..,? eliminar|Cancelar/i.test(document.getElementById('cn-med-list').innerText);
  delMedida('x1');
  const lista=DB.medidas.qa1||[];
  const lapida=lista.find(x=>x.id==='x1');
  return JSON.stringify({
    pide,
    vivas: medLive(lista).length,
    esLapida: !!(lapida && lapida.del===true),
    // La prueba de que DURA: la nube todavía trae la copia viva.
    tras: medLive(mergeMedidas({q:lista},{q:[{id:'x1',date:'${T1}',mAt:'${T1}',cintura:80}]}).q).length
  });})()`));
ok(bor.pide === true, 'pregunta antes de borrar, en la propia fila (sin `confirm()`)');
ok(bor.vivas === 1, 'la toma borrada desaparece de la lista', bor.vivas);
ok(bor.esLapida === true, 'queda lápida, no un hueco');
ok(bor.tras === 1, 'y NO resucita cuando la nube trae su copia viva', bor.tras);

// ══ 7 · La diferencia izquierda/derecha: qué dice y qué NO puede decir ══
console.log('\n── 7 · el lado izquierdo contra el derecho ───────────────────────');
const asim = async (izq, der) => {
  await montar([
    { id: 'a2', date: T2, mAt: T2, brazo_izq: izq, brazo_der: der },
    { id: 'a1', date: T1, mAt: T1, brazo_izq: izq, brazo_der: der },
  ]);
  return (await leerLista()).texto;
};
const ruido = await asim(31, 31.5);          // 1.6 % — dentro del error de la cinta
ok(/pr.cticamente iguales/i.test(ruido), 'una diferencia de 1.6 % no alarma a nadie');
const habla = await asim(28, 32);            // 12.5 % — por encima del techo
ok(/coach/i.test(habla), 'una diferencia de 12.5 % le dice que se lo comente a su coach');
ok(/derecho/.test(habla), 'nombra el lado mayor');
// 🔒 EL TECHO DE LO QUE LA CINTA SOSTIENE. El perímetro explica el 13 % de la varianza
//    de la asimetría de FUERZA en la población más favorable medida (dictamen de Andrés).
const prohibido = /desequilibrio|m[úu]sculo|grasa|linfedema|edema|circulatori|v[áa]rice/i;
ok(!prohibido.test(habla), 'no promete fuerza, ni músculo, ni ningún diagnóstico',
  (habla.match(prohibido) || [])[0]);
ok(/tama.o/i.test(habla), 'y sí dice lo único que sostiene: es una diferencia de TAMAÑO');

// ══ 8 · Un MENOR: se le guarda cintura y cadera, pero no se le interpretan ══
console.log('\n── 8 · quien tiene 15 años (dictamen de Laura) ───────────────────');
const tomas2 = [
  { id: 'x2', date: T2, mAt: T2, cintura: 77, cadera: 92, brazo_izq: 30, brazo_der: 31 },
  { id: 'x1', date: T1, mAt: T1, cintura: 80, cadera: 95, brazo_izq: 30, brazo_der: 31 },
];
await montar(tomas2, 15);
const men = (await leerLista()).texto;
ok(/77/.test(men) && /92/.test(men), 'sus medidas se le siguen mostrando (no se le esconden)');
ok(!/-3\.0 cm/.test(men) && !/-3 cm/.test(men),
  'pero NO se le calcula ni se le destaca el cambio de cintura ni de cadera');
// CONTROL DE DISCRIMINACIÓN: la misma persona con 30 años SÍ ve el cambio.
await montar(tomas2, 30);
const may = (await leerLista()).texto;
ok(/-3\.0 cm/.test(may), 'CONTROL: con 30 años el mismo dato sí muestra el cambio');
ok(!/cintura\s*\/\s*cadera|\bICC\b/i.test(may + men),
  'no existe índice cintura-cadera en la pantalla del asesorado, a ninguna edad');

// ══ 9 · Volver a medirse: la fecha se entrega al guardar y el aviso llega a los 7 días ══
console.log('\n── 9 · cuándo toca volver (v567) ─────────────────────────');
const hace = d => new Date(Date.now() - d * 86400000).toISOString();
const conAviso = async (dias) => {
  await montar([{ id: 'r1', date: hace(dias), mAt: hace(dias), cintura: 80 }]);
  return JSON.parse(await ev(`(()=>{
    try{ localStorage.removeItem('ax_meddue_qa1'); }catch(e){}
    renderMedDueCard(DB.clients[0]);
    const el=document.getElementById('cn-med-due');
    return JSON.stringify({ texto: el.innerText.replace(/\\s+/g,' ').trim(), vacio: el.innerHTML==='' });
  })()`));
};
// A 40 días todavía falta más de una semana: silencio.
const lejos = await conAviso(40);
ok(lejos.vacio === true, 'a 40 días no se le dice nada todavía', lejos.texto.slice(0, 60));
// A 50 días (faltan 6) ya avisa.
const pronto = await conAviso(50);
ok(!pronto.vacio && /días|mañana/i.test(pronto.texto), 'una semana antes ya avisa', pronto.texto.slice(0, 80));
// A 60 días ya toca, y se le dice POR QUÉ son 8 semanas.
const toca = await conAviso(60);
ok(/toca/i.test(toca.texto), 'pasadas las 8 semanas dice que toca', toca.texto.slice(0, 70));
ok(/cinta/i.test(toca.texto), 'explica por qué son 8 semanas y no menos');
// CONTROL: quien NUNCA se midió no recibe el aviso (eso es adopción, no un recordatorio).
await montar([]);
const nunca = await ev(`(()=>{renderMedDueCard(DB.clients[0]);return document.getElementById('cn-med-due').innerHTML==='';})()`);
ok(nunca === true, 'CONTROL: sin una toma anterior no hay fecha que recordar');
// Y al guardar, la fecha de regreso se entrega ahí mismo.
await montar([]);
const guardado = JSON.parse(await ev(`(()=>{
  openMedModal(); document.getElementById('med-cintura').value='80';
  let dicho=''; const _t=window.toast; window.toast=(m)=>{dicho=m;}; saveMedidas(); window.toast=_t;
  return JSON.stringify({ dicho, pantalla: document.getElementById('cn-med-list').innerText.replace(/\\s+/g,' ') });
})()`));
ok(/vuelve a medirte el/i.test(guardado.dicho), 'al guardar se le dice cuándo volver', guardado.dicho);
ok(/próxima medición/i.test(guardado.pantalla), 'y la fecha queda visible en la pantalla');

// ══ 10 · Sin errores de JavaScript por el camino ══
console.log('\n── 10 · consola limpia ───────────────────────────────────────────');
ok(jsErrors.length === 0, 'ningún error de JS durante toda la corrida', jsErrors.slice(0, 3));

console.log('\n' + '─'.repeat(66));
console.log(fallos === 0 ? '✅ MEDIDAS v566+v567 OK' : `❌ ${fallos} comprobaciones en rojo`);
fin(fallos === 0 ? 0 : 1);
