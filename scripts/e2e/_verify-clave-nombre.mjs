// _verify-clave-nombre.mjs — v692 · la contraseña no lleva el nombre ni el correo de la persona.
//
// Lo que la suite no ve: el FORMULARIO real del coach en un teléfono de 390 px. El alta rechaza
// «Andrea2026» para Andrea y lo dice; el mismo alta con una clave ajena SÍ crea (control: el rechazo
// es por el nombre, no porque el alta esté rota); «Generar una» deja una clave legible A LA VISTA,
// con el ojo abierto; al volver a abrir el alta el campo vuelve a su estado; y «crear contraseña
// nueva» (la vuelta de «olvidé mi contraseña») rechaza la del propio nombre.
// Sin login ni red de verdad: monta la app local. Toma una captura del alta en ~/…/Temp.
// exit 1 si algo falla · cero jsErrors.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8878, DBG = 9422;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/clavenombre-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof saveClient==='function' && typeof cfGenPass==='function' && typeof generatePassword==='function'`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// Los avisos se CAPTURAN (toast es global); nada sale a la red: la cuenta de acceso se simula.
const base = await ev(`(()=>{['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  window.__toasts=[]; toast=(m)=>window.__toasts.push(String(m));
  _provisionClientAccount=async()=>null; _addPending=()=>{};
  CUR.loggedAs='coach'; showScreen('s-coach');
  return {clientes:DB.clients.length, modal:!!document.getElementById('m-client')};})()`);
if (!base || !base.modal) { console.error('🔴 sonda rota: no hay formulario del alta', JSON.stringify(base)); process.exit(1); }

const llenar = (pass) => ev(`(()=>{openAddClient();
  const s=(i,v)=>{document.getElementById(i).value=v;};
  s('cf-name','Andrea'); s('cf-last','Bernal'); s('cf-email','andrea.bernal@example.com'); s('cf-age','30');
  s('cf-pass',${JSON.stringify(pass)}); window.__toasts=[]; return true;})()`);

// ── A · el alta vacía no enseña el patrón y trae «Generar una» dentro del teléfono
const a = await ev(`(()=>{openAddClient(); const el=document.getElementById('cf-pass'), b=document.getElementById('cf-pass-gen');
  const r=b&&b.getBoundingClientRect();
  return {ph:el.placeholder, tipo:el.type, visible:!!(b&&b.offsetParent), izq:r&&Math.round(r.left), der:r&&Math.round(r.right),
          ancho:document.documentElement.scrollWidth, txt:b&&b.textContent.trim()};})()`);
check('A1 el ejemplo del campo ya no es un nombre con el año', a.ph === 'Mín. 8 · sin su nombre' && !/20\d\d/.test(a.ph), JSON.stringify(a.ph));
check('A2 «Generar una» se ve y cabe en 390 px', a.visible && a.txt === 'Generar una' && a.izq >= 0 && a.der <= 390 && a.ancho <= 390, JSON.stringify(a));

// captura del alta tal como la ve el coach
await sleep(400);
const shot = await send('Page.captureScreenshot', { format: 'png' });
const ruta = process.env.TEMP + '/v692-alta.png';
if (shot?.data) writeFileSync(ruta, Buffer.from(shot.data, 'base64'));

// ── B · «Andrea2026» para Andrea NO crea a nadie y lo dice
await llenar('Andrea2026');
const b = await ev(`(async()=>{const n=DB.clients.length; await saveClient(); return {antes:n, despues:DB.clients.length, avisos:window.__toasts.slice()};})()`);
const avisoB = (b.avisos || []).join(' | ');
check('B1 con su nombre en la clave no se crea el asesorado', b.despues === b.antes, JSON.stringify(b));
check('B2 y el aviso dice por qué y qué hacer', /su nombre/.test(avisoB) && /Generar una/.test(avisoB), avisoB);
// y con los números cambiados por letras tampoco
await llenar('Andr3a2026');
const b3 = await ev(`(async()=>{const n=DB.clients.length; await saveClient(); return {antes:n, despues:DB.clients.length};})()`);
check('B3 «Andr3a2026» tampoco pasa', b3.despues === b3.antes, JSON.stringify(b3));

// ── C · CONTROL: el mismo alta con una clave ajena SÍ crea (el rechazo era por el nombre)
await llenar('Pakemolirusa38');
const c = await ev(`(async()=>{const n=DB.clients.length; await saveClient(); return {antes:n, despues:DB.clients.length, avisos:window.__toasts.slice()};})()`);
check('C1 control: con una clave ajena el alta sí crea', c.despues === c.antes + 1, JSON.stringify(c));
check('C2 control: y no habla de nombres', !(c.avisos || []).some(t => /nombre/.test(t)), (c.avisos || []).join(' | '));

// ── D · «Generar una»: legible, a la vista, ojo abierto, sin el nombre
await llenar('');
const d = await ev(`(()=>{cfGenPass(); const el=document.getElementById('cf-pass'); const u=el.parentElement.querySelector('button use');
  return {v:el.value, tipo:el.type, ojo:u&&u.getAttribute('href'), cambio:el.dataset.unchanged, avisos:window.__toasts.slice(),
          problema:passwordProblem(el.value,{name:'Andrea Bernal',email:'andrea.bernal@example.com'})};})()`);
check('D1 la generada es legible (Mayúscula + 11 letras + 2 cifras, sin l/0/1)', /^[A-Z][a-z]{11}[2-9]{2}$/.test(d.v) && !/[l01]/.test(d.v), d.v);
check('D2 queda A LA VISTA con el ojo abierto', d.tipo === 'text' && d.ojo === '#i-eye-off', JSON.stringify({ tipo: d.tipo, ojo: d.ojo }));
check('D3 cumple la regla con su nombre y cuenta como cambio', d.problema === null && d.cambio === '0', JSON.stringify(d));
check('D4 avisa que está lista para copiarla', (d.avisos || []).some(t => /cópiala/.test(t)), (d.avisos || []).join(' | '));

// ── E · al volver a abrir el alta, el campo vuelve a su estado (oculto, vacío, ojo cerrado)
const e = await ev(`(()=>{openAddClient(); const el=document.getElementById('cf-pass'); const u=el.parentElement.querySelector('button use');
  return {v:el.value, tipo:el.type, ojo:u&&u.getAttribute('href'), ph:el.placeholder};})()`);
check('E1 al reabrir: vacío, oculto y con el ojo cerrado', e.v === '' && e.tipo === 'password' && e.ojo === '#i-eye' && e.ph === 'Mín. 8 · sin su nombre', JSON.stringify(e));
const e2 = await ev(`(()=>{const c=DB.clients.find(x=>x.name==='Andrea Bernal'); if(!c) return null; CUR.clientId=c.id; openEditClient();
  const el=document.getElementById('cf-pass'); return {ph:el.placeholder, tipo:el.type, v:el.value};})()`);
check('E2 al editar: el ejemplo de edición y oculto', e2 && e2.ph.startsWith('•') && e2.tipo === 'password' && e2.v === '', JSON.stringify(e2));

// ── F · «crear contraseña nueva» rechaza la del propio nombre (el coach, con su nombre de ajustes)
const f = await ev(`(async()=>{AUTH_ROLE='coach'; const quien=_pwWhoMe(); openNewPassModal();
  const nombre=(getCoachName().match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]{4,}/)||['Coach'])[0];
  const clave=nombre[0].toUpperCase()+nombre.slice(1).toLowerCase()+'2026x';
  document.getElementById('np-new').value=clave; document.getElementById('np-rep').value=clave;
  await saveNewPass(); const err=document.getElementById('np-err');
  return {quien, clave, err:err&&err.textContent, on:err&&err.classList.contains('on')};})()`);
check('F1 «crear contraseña nueva» rechaza la del propio nombre y lo dice en «tu»', f.on && /tu nombre/.test(f.err || ''), JSON.stringify(f));

check('Z cero errores de JavaScript', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
console.log(results.join('\n'));
console.log('captura:', ruta);
try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(results.every(r => r.startsWith('✅')) ? 0 : 1);
