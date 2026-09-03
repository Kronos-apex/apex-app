#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _verify-menor-consent.mjs — la app ya no obliga a un menor a mentir (v565)
//
// EL DEFECTO (medido contra producción el 2026-09-02, hallazgo A7 de la auditoría):
// la casilla «Declaro que soy mayor de 18 años» era OBLIGATORIA, no había alternativa
// de acudiente, y **nadie la cruzaba contra la edad que el propio formulario acababa
// de pedir dos pasos antes**. Valery (15) y Sharith Sofía (16) tienen `adulto:true`
// guardado en su perfil: la única forma de entrar era declarar algo falso, y esa
// mentira quedaba archivada como PRUEBA de que autorizaron siendo adultas.
//
// Decisión del PO: si declara menos de 18, se le pide el permiso de su acudiente.
//
// 🔴 LA SUITE NO PUEDE PROBAR ESTO SOLA. `consentEvidence` es pura y sus candados ya
// están en avi.test.js, pero lo que sufre la persona es de PANTALLA: qué casilla ve,
// si la otra queda escondida y viva, y qué se firmaría de verdad al tocar el botón.
// Aquí se abre la app, se rellena el formulario y se lee SOLO LO VISIBLE.
//
// 🔒 NO CREA NINGUNA CUENTA: se espía `AUTH.signUpEmail` (patrón ya usado en el repo)
//    para leer la evidencia que viajaría, y se devuelve un error simulado.
//
//   node scripts/e2e/_verify-menor-consent.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RAIZ = join(import.meta.dirname, '..', '..');
const PORT = 8801, CDP = 9401;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + CDP,
  '--user-data-dir=' + process.env.TEMP + '/menorc-' + Date.now(), '--no-first-run',
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

// CONTROL DE MONTAJE: sin el asistente de registro cargado esto no mide nada.
let listo = false;
for (let i = 0; i < 80 && !listo; i++) {
  listo = await ev(`typeof WZ==='object' && typeof _wzConsent==='function' && !!document.getElementById('su-ck-adulto')`);
  if (!listo) await sleep(500);
}
if (!listo) { console.error('❌ ABORTO: el asistente de registro nunca cargó — esta corrida no prueba nada'); fin(1); }

let fallos = 0;
const ok = (cond, txt, extra) => { console.log(`  ${cond ? '✅' : '❌'} ${txt}${extra !== undefined ? ' — ' + JSON.stringify(extra) : ''}`); if (!cond) fallos++; };

// Abre el asistente y lo deja en el paso de la cuenta con la EDAD dada.
// Se lee solo lo VISIBLE: `offsetParent` null = no pintado (gotcha del nodo oculto, v563).
const conEdad = async (edad) => JSON.parse(await ev(`(()=>{
  document.getElementById('cin-cta').style.display='none';
  const sg=document.getElementById('cin-signup'); sg.style.display='block';
  document.getElementById('su-age').value=${JSON.stringify(String(edad))};
  WZ.cur = WZ.steps.indexOf('wz-s-account');
  WZ._sync();
  const vis = el => !!(el && el.offsetParent !== null);
  const adRow = document.getElementById('su-ck-adulto-row');
  const meBox = document.getElementById('su-menor-box');
  return JSON.stringify({
    veAdulto: vis(adRow),
    veAcudiente: vis(meBox),
    // El texto que la persona LEE de verdad, no el del HTML
    textoVisible: (vis(meBox) ? meBox.innerText : (adRow ? adRow.innerText : '')).replace(/\\s+/g,' ').trim().slice(0,120),
    // Ninguna casilla escondida puede quedar MARCADA: sería una declaración viva e invisible
    adultoMarcado: !!document.getElementById('su-ck-adulto').checked,
    acudienteMarcado: !!document.getElementById('su-ck-acudiente').checked
  });})()`));

// ══ 1 · Una persona de 15 años ve la salida del acudiente, no la de adulto ══
console.log('\n── 1 · quien declara 15 años ─────────────────────────────────────');
const m = await conEdad(15);
ok(m.veAcudiente === true, 've la casilla del ACUDIENTE');
ok(m.veAdulto === false, 'NO ve la casilla de «soy mayor de 18» (no puede mentir)', m.veAdulto);
ok(/acudiente/i.test(m.textoVisible), 'el texto visible le habla de su acudiente', m.textoVisible);
ok(m.adultoMarcado === false, 'la casilla de adulto no queda marcada por debajo');

// ══ 2 · CONTROL · una persona de 25 ve lo de siempre ══
console.log('\n── 2 · CONTROL: quien declara 25 años ────────────────────────────');
const a = await conEdad(25);
ok(a.veAdulto === true, 've la casilla de «soy mayor de 18»');
ok(a.veAcudiente === false, 'NO ve la del acudiente (no le corresponde)');
ok(/mayor de 18/i.test(a.textoVisible), 'el texto visible es el de siempre', a.textoVisible);

// ══ 3 · CONTROL · sin edad declarada manda el camino conservador (adulto) ══
console.log('\n── 3 · CONTROL: sin edad declarada ───────────────────────────────');
const s = await conEdad('');
ok(s.veAdulto === true && s.veAcudiente === false,
  'sin edad se pide la de adulto: dejar el campo vacío NO abre la puerta del menor');

// ══ 4 · Corregir la edad hacia abajo APAGA la declaración anterior ══
console.log('\n── 4 · si corrige 25 → 15, la marca vieja no sobrevive ───────────');
await ev(`(()=>{ document.getElementById('su-ck-adulto').checked=true; })()`);
const c = await conEdad(15);
ok(c.adultoMarcado === false,
  'la casilla de adulto se DESMARCA al pasar a la rama del menor', c.adultoMarcado);

// ══ 5 · Lo que se FIRMARÍA al tocar el botón, sin crear ninguna cuenta ══
console.log('\n── 5 · la evidencia que viajaría dice la verdad ──────────────────');
const firma = async (edad, rellenarAcudiente) => JSON.parse(await ev(`(()=>{
  document.getElementById('su-age').value=${JSON.stringify(String(edad))};
  WZ.cur = WZ.steps.indexOf('wz-s-account'); WZ._sync();
  document.getElementById('su-ck-general').checked=true;
  document.getElementById('su-ck-salud').checked=true;
  const menor = document.getElementById('su-menor-box').offsetParent !== null;
  if (menor) {
    document.getElementById('su-ck-acudiente').checked=true;
    // 🔴 SE LIMPIA SIEMPRE: sin esto el nombre del caso anterior sobrevive y el caso
    // «sin acudiente» sale VERDE sobre un campo que en realidad estaba lleno.
    document.getElementById('su-acu-nombre').value = ${rellenarAcudiente ? "'Camilo Andrés'" : "''"};
  } else {
    document.getElementById('su-ck-adulto').checked=true;
  }
  const ev = _wzConsent();
  return JSON.stringify({ ev });
})()`));

const f15 = await firma(15, true);
ok(!!f15.ev, 'con el acudiente puesto, la cuenta SÍ se puede crear');
ok(f15.ev && f15.ev.menor === true && f15.ev.adulto === false,
  'la evidencia dice MENOR y NO dice que sea mayor de edad', f15.ev);
ok(f15.ev && f15.ev.edad === 15, 'guarda la edad con la que autorizó', f15.ev && f15.ev.edad);
ok(!!(f15.ev && f15.ev.acudiente && f15.ev.acudiente.nombre === 'Camilo Andrés'),
  'guarda quién autorizó', f15.ev && f15.ev.acudiente);

const f15sin = await firma(15, false);
ok(f15sin.ev === null, 'sin el nombre del acudiente NO se puede crear la cuenta', f15sin.ev);

const f25 = await firma(25, false);
ok(!!(f25.ev && f25.ev.adulto === true && f25.ev.menor === undefined),
  'CONTROL: a los 25 la evidencia vuelve a ser la de adulto', f25.ev);

// ── 6 · LA FICHA DEL COACH: borrarle la edad a un menor NO puede degradar su evidencia ──
// Hallazgo de Lucas QA, reproducido por él en vivo: `cfLoadConsent` pre-marca la casilla desde
// la evidencia guardada, así que si el coach vacía el campo Edad y guarda, `consentNeedsGuardian`
// devolvía false y la evidencia de menor+acudiente se **reescribía en silencio** por
// `{adulto:true, edad:null}`. Misma clase que v565 vino a cerrar, entrando por la otra puerta.
console.log('\n── 6 · la ficha del coach no degrada a un menor por vaciarle la edad ──');

const EV_MENOR = { general:true, salud:true, adulto:false, menor:true, edad:15,
  acudiente:{ nombre:'Ana Pérez', tel:'3001234567' }, v:'2026-07-26-borrador',
  at:'2026-07-01T10:00:00.000Z', por:'coach' };

const fichaCoach = async (edadEnCampo) => JSON.parse(await ev(`(()=>{
  window.__toasts=[];
  window.toast=(m)=>{window.__toasts.push(String(m));};
  DB.clients=[{id:'cq1', name:'Menor Prueba', age:15, consent:${JSON.stringify(EV_MENOR)}}];
  CUR.editClientId='cq1'; CUR.clientId='cq1';
  const set=(id,v)=>{const e=document.getElementById(id); if(e)e.value=v;};
  set('cf-name','Menor'); set('cf-last','Prueba'); set('cf-email',''); set('cf-pass','');
  set('cf-weight',''); set('cf-height',''); set('cf-phone',''); set('cf-notes','');
  set('cf-age', ${JSON.stringify(edadEnCampo)});
  set('cf-acu-nombre','Ana Pérez'); set('cf-acu-tel','3001234567');
  const ck=document.getElementById('cf-ck-consent'); if(ck)ck.checked=true;
  try{ saveClient(); }catch(e){ return JSON.stringify({error:String(e)}); }
  const c=(DB.clients||[]).find(x=>x.id==='cq1')||{};
  return JSON.stringify({ consent:c.consent||null, toasts:window.__toasts });
})()`));

// CONTROL DE MONTAJE: sin `saveClient` y sin la casilla, este caso no prueba nada.
const montado6 = await ev(`(typeof saveClient==='function') && !!document.getElementById('cf-ck-consent') && !!document.getElementById('cf-age')`);
ok(montado6 === true, 'CONTROL: la ficha del coach está montada (saveClient + casilla + campo edad)', montado6);

const borrada = await fichaCoach('');
ok(!!(borrada.consent && borrada.consent.menor === true && borrada.consent.adulto === false),
  'con la edad borrada, la evidencia de MENOR sigue intacta — no se degrada a adulto', borrada.consent);
ok(!!(borrada.consent && borrada.consent.acudiente && borrada.consent.acudiente.nombre === 'Ana Pérez'),
  'el acudiente no se pierde', borrada.consent && borrada.consent.acudiente);
ok((borrada.toasts || []).some(t => /edad/i.test(t)),
  'y NO es silencioso: se le dice al coach que falta la edad', borrada.toasts);

// CONTROL DE DISCRIMINACIÓN: con la edad puesta el guardado SÍ pasa, y conserva la evidencia
// ORIGINAL con su fecha y su versión (consentKeep). Si esto saliera igual que el caso de arriba,
// el harness no estaría distinguiendo nada.
const fcEdadOk = await fichaCoach('15');
ok(!!(fcEdadOk.consent && fcEdadOk.consent.menor === true),
  'CONTROL: con la edad puesta el guardado pasa y sigue siendo menor', fcEdadOk.consent);
ok(!!(fcEdadOk.consent && fcEdadOk.consent.at === '2026-07-01T10:00:00.000Z'
      && fcEdadOk.consent.v === '2026-07-26-borrador'),
  'CONTROL: conserva la fecha y la versión ORIGINALES (no se re-fecha)', fcEdadOk.consent && { at:fcEdadOk.consent.at, v:fcEdadOk.consent.v });
ok(!(fcEdadOk.toasts || []).some(t => /edad/i.test(t)),
  'CONTROL: con la edad puesta NO se le pide la edad', fcEdadOk.toasts);

console.log('\njsErrors:', jsErrors);
if (jsErrors.length) fallos++;

console.log('\n' + '─'.repeat(66));
if (fallos) { console.log(`❌ consentimiento de menores: ${fallos} fallo(s)`); fin(1); }
console.log('✅ CONSENTIMIENTO DE MENORES OK — la app ya no obliga a nadie a mentir');
fin(0);
