// Verificación E2E de v700: «Recomienda AVI» con premio (decisión del PO, 4-oct-2026).
// La tarjeta del cierre (turno F13, 1 vez cada 14 días), la tarjeta fija del perfil, la salida por el menú de
// compartir o por WhatsApp, y quién NO la ve (AVI PRO, menor, coach, plan vencido).
//
// 🔒 Sin login y sin escribir en ningún lado: los clientes son de mentira y se plantan en memoria
//    (`DB.clients` + `CUR`); `window.open` y `navigator.share` se ESPÍAN (no se abre nada). La escritura a la
//    nube está sellada en localhost.
//
// Corre: node scripts/e2e/_verify-referido.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8795, DBG = 9295;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-referido-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', 'about:blank'], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch(`http://localhost:${DBG}/json/list`); const t = await r.json(); const p = t.find(x => x.type === 'page'); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

await send('Page.navigate', { url: APP });
const arranco = await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof renderWfReferido==='function' && (()=>{const s=document.getElementById('avi-loading'); return !s || getComputedStyle(s).display==='none' || s.style.display==='none' || !s.isConnected;})()`, 25000);
check('MONTAJE: la app arranca con las funciones de v700', arranco);
await sleep(600);

// Espías: nada sale del navegador de prueba.
await ev(`(()=>{ window.__abiertos=[]; window.open=(u)=>{ window.__abiertos.push(String(u)); return null; };
  window.__compartido=[]; Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:async(d)=>{ window.__compartido.push(d); }});
  return 1; })()`);

// Cliente de mentira: plan, edad, pagos y 3 entrenos terminados en semanas pasadas (para que el logro de
// «semana completa» no se lleve el turno).
// El coach en «Mi entrenamiento» entra COMO lo hace openMyTraining: vista de asesorado (loggedAs='client'), tier
// premium y COACH_SELF=true. La primera versión lo simulaba con loggedAs='coach', una puerta que ese flujo nunca usa,
// y por eso no vio que el coach recibía la invitación (lo cazaron Julián y Lucas en el QA de v700).
const plantar = (o) => ev(`(()=>{ const o=${JSON.stringify(o)};
  const c={id:o.id,name:o.name,age:o.age,coachName:o.coachName||'',payments:[{date:new Date(Date.now()-20*864e5).toISOString(),dueDate:new Date(Date.now()+(o.dias==null?10:o.dias)*864e5).toISOString(),amount:100000}]};
  if(o.tier)c.tier=o.tier; if(o.suspended)c.suspended=true; if(o.age==null)delete c.age;
  COACH_SELF=!!o.coachSelf; AUTH_ROLE=o.coachSelf?'coach':'client';
  DB.clients=[c]; CUR.clientId=c.id; CUR.loggedAs='client';
  DB.history=DB.history||{}; DB.history[c.id]=[0,1,2].map(i=>({id:'h'+i,sessionId:'s'+i,routineId:'rX',routineName:'Prueba',date:new Date(Date.now()-(20+i*8)*864e5).toISOString(),finishedAt:new Date(Date.now()-(20+i*8)*864e5).toISOString(),doneSets:9,totalSets:9}));
  try{ localStorage.removeItem('ax_refvista_'+c.id); localStorage.setItem('ax_push_snooze_'+c.id,String(Date.now())); }catch(e){}
  return 1; })()`);
// Abre la pantalla de fin como lo hace la app (con una rutina de mentira) y devuelve qué quedó a la vista.
const cierre = async () => {
  await ev(`(()=>{ document.getElementById('workout-finish').classList.remove('on'); _wfShownFor=null;
    showWorkoutFinish({id:'rV700',name:'Prueba v700',exercises:[]},{done:9,total:9,totalVol:1000,newPRs:[]}); return 1; })()`);
  await sleep(500);
  return JSON.parse(await ev(`JSON.stringify({dueño:_wfAskOwner, html:document.getElementById('wf-referido').innerHTML,
    texto:document.getElementById('wf-referido').textContent.replace(/\\s+/g,' ').trim(),
    vista:localStorage.getItem('ax_refvista_'+CUR.clientId)})`));
};
const cerrarCierre = () => ev(`(()=>{ document.getElementById('workout-finish').classList.remove('on'); document.body.style.overflow=''; return 1; })()`);

// ── 1 · Plan con coach, adulto, al día, con 3 entrenos: la tarjeta sale en el cierre ──
await plantar({ id: 'v700-coach', name: 'Prueba Gómez', age: 30, tier: 'premium', coachName: 'Andrés Martínez' });
let w = await cierre();
check('con coach: la tarjeta sale en el cierre y toma el turno', w.dueño === 'referido' && /Conoces a alguien que quiera empezar/.test(w.texto), w.dueño + ' · ' + w.texto);
check('con coach: dice el premio con el coach y los $20.000', /entra al coaching con Andrés/.test(w.texto) && /\$20\.000 más barato/.test(w.texto), w.texto);
check('se guarda CUÁNDO se vio (para los 14 días)', w.vista && Math.abs(Date.now() - (+w.vista)) < 60000, String(w.vista));
const hitRec = await ev(`(()=>{ const b=document.querySelector('#wf-referido .wf-push-on'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return (h===b||b.contains(h)) && r.height>=36; })()`);
check('«Recomendar» se puede tocar (nada encima, ≥36 px)', hitRec === true, String(hitRec));
await ev(`document.documentElement.setAttribute('data-theme','light')`); await sleep(250);
await shot('v700-cierre-claro');
await ev(`document.documentElement.setAttribute('data-theme','dark')`); await sleep(250);
await shot('v700-cierre-oscuro');
await ev(`document.documentElement.removeAttribute('data-theme')`);
// Compartir: sale por el menú del teléfono con el mensaje de avi-core, y la tarjeta se va.
await ev(`document.querySelector('#wf-referido .wf-push-on').click()`); await sleep(300);
const comp = JSON.parse(await ev('JSON.stringify(window.__compartido)'));
const txt = (comp[0] && comp[0].text) || '';
check('«Recomendar» abre el menú de compartir con el enlace de referidos', /https:\/\/avientrena\.com\/de\/referido/.test(txt), txt);
check('el mensaje dice de parte de quién (nombre de pila, sin apellido)', /dile que vas de parte de Prueba\./.test(txt) && !/Gómez/.test(txt), txt);
check('después de compartir, la tarjeta se va', await ev(`document.getElementById('wf-referido').innerHTML===''`));
await cerrarCierre();

// ── 2 · Otro cierre el mismo día: ya no sale (14 días) ──
w = await cierre();
check('segundo cierre el mismo día: la tarjeta no vuelve', w.html === '' && w.dueño !== 'referido', w.dueño + ' · ' + w.texto);
await cerrarCierre();

// ── 3 · Sin menú de compartir (escritorio): sale por WhatsApp eligiendo contacto ──
await ev(`(()=>{ localStorage.removeItem('ax_refvista_'+CUR.clientId); navigator.share=undefined; window.__abiertos=[]; return 1; })()`);
w = await cierre();
await ev(`wfReferidoCompartir()`); await sleep(300);
let ab = JSON.parse(await ev('JSON.stringify(window.__abiertos)'));
check('sin menú de compartir: abre WhatsApp con el mensaje', ab.length === 1 && /^https:\/\/wa\.me\/\?text=/.test(ab[0]) && decodeURIComponent(ab[0]).includes('/de/referido'), ab.join(' | '));
await cerrarCierre();

// ── 4 · «Ahora no» la quita sin compartir ──
await ev(`(()=>{ localStorage.removeItem('ax_refvista_'+CUR.clientId); window.__abiertos=[]; return 1; })()`);
w = await cierre();
await ev(`document.querySelector('#wf-referido .wf-push-later').click()`); await sleep(200);
ab = JSON.parse(await ev('JSON.stringify(window.__abiertos)'));
check('«Ahora no» la quita y no abre nada', (await ev(`document.getElementById('wf-referido').innerHTML===''`)) && ab.length === 0, ab.join(' | '));
await cerrarCierre();

// ── 5 · Perfil: la tarjeta fija, sus dos botones, y «Ver condiciones» lleva a la web ──
await ev(`(()=>{ window.__abiertos=[]; renderReferidoPerfil(DB.clients[0]); return 1; })()`);
const perfil = await ev(`document.getElementById('cn-referido').textContent.replace(/\\s+/g,' ').trim()`);
check('perfil: la tarjeta «Recomienda AVI» con el premio y «sin tope»', /Recomienda AVI/.test(perfil) && /\$20\.000/.test(perfil) && /sin tope/.test(perfil), perfil);
await ev(`[...document.querySelectorAll('#cn-referido button')].find(b=>/condiciones/.test(b.textContent)).click()`); await sleep(200);
ab = JSON.parse(await ev('JSON.stringify(window.__abiertos)'));
check('«Ver condiciones» abre avientrena.com/ayuda#referidos', ab[0] === 'https://avientrena.com/ayuda#referidos', ab.join(' | '));
// El perfil ENTERO se pinta sin romperse con la tarjeta nueva (la integración, no solo la función suelta).
const errAntes = jsErrors.length;
const pintado = await ev(`(()=>{ try{ renderClientProfile(DB.clients[0]); return document.getElementById('cn-referido').textContent.includes('Recomienda AVI'); }catch(e){ return 'ERR '+e.message; } })()`);
check('el perfil completo se pinta y trae la tarjeta', pintado === true && jsErrors.length === errAntes, String(pintado));
// A la vista: el contenedor del perfil al frente, en claro y oscuro.
await ev(`(()=>{ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); const sc=document.getElementById('s-client'); if(sc){ sc.classList.add('on'); sc.style.display='block'; }
  document.querySelectorAll('.cnsec').forEach(s=>s.style.display='none'); const p=document.getElementById('cn-profile'); if(p){ p.style.display='block'; }
  document.getElementById('cn-referido').scrollIntoView({block:'center'}); return 1; })()`);
await sleep(300);
const hitPerf = await ev(`(()=>{ const b=document.querySelector('#cn-referido .bp'); const r=b.getBoundingClientRect(); const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return (h===b||b.contains(h)) && r.height>=36; })()`);
check('perfil: «Recomendar a alguien» se puede tocar', hitPerf === true, String(hitPerf));
await ev(`document.documentElement.setAttribute('data-theme','light')`); await sleep(250);
const claroBg = await ev(`getComputedStyle(document.querySelector('#cn-referido .card')).backgroundColor`);
check('tema claro: la tarjeta del perfil toma el fondo claro del tema', /rgb\((2[0-9]{2}), (2[0-9]{2}), (2[0-9]{2})\)/.test(claroBg || ''), claroBg);
await shot('v700-perfil-claro');
await ev(`document.documentElement.setAttribute('data-theme','dark')`); await sleep(250);
await shot('v700-perfil-oscuro');
await ev(`document.documentElement.removeAttribute('data-theme')`);
// 360 px con «Muy grande»: el botón no se sale ni deja la página ancha.
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
await ev(`(()=>{ document.documentElement.setAttribute('data-fs','xl'); renderReferidoPerfil(DB.clients[0]); document.getElementById('cn-referido').scrollIntoView({block:'center'}); return 1; })()`); await sleep(300);
const xl = JSON.parse(await ev(`JSON.stringify((()=>{ const out={}; [...document.querySelectorAll('#cn-referido button')].forEach((b,i)=>{ const r=b.getBoundingClientRect(); out['b'+i]=r.right<=innerWidth+0.5 && r.left>=0; }); out.ancho=document.documentElement.scrollWidth<=innerWidth+1; return out; })())`));
check('360 px + «Muy grande»: los botones caben y la página no se ensancha', Object.values(xl).every(Boolean), JSON.stringify(xl));
await shot('v700-perfil-360-xl');
await ev(`document.documentElement.removeAttribute('data-fs')`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// ── 6 · Quién NO la ve, y el banner sin premio ──
const nadie = async (o, etiqueta) => {
  await plantar(o);
  const c = await cierre(); await cerrarCierre();
  await ev(`renderReferidoPerfil(DB.clients[0])`);
  const p = await ev(`document.getElementById('cn-referido').innerHTML`);
  check(`${etiqueta}: ni tarjeta en el cierre ni en el perfil`, c.html === '' && c.dueño !== 'referido' && p === '', `${c.dueño} · ${c.texto} · perfil=${p.length}`);
};
await nadie({ id: 'v700-pro', name: 'Prueba Pro', age: 30, tier: 'app' }, 'AVI PRO');
await nadie({ id: 'v700-menor', name: 'Prueba Menor', age: 16, tier: 'premium' }, 'menor de edad');
await nadie({ id: 'v700-vencido', name: 'Prueba Vencido', age: 30, tier: 'premium', dias: -40 }, 'plan con coach vencido');
await nadie({ id: 'v700-coachself', name: 'Prueba Coach', age: 30, tier: 'premium', coachSelf: true }, 'el coach en «Mi entrenamiento» (loggedAs client + COACH_SELF)');
await nadie({ id: 'v700-gracia', name: 'Prueba Gracia', age: 30, tier: 'premium', dias: -3 }, 'plan con coach en gracia (venció hace 3 días)');
await nadie({ id: 'v700-sinedad', name: 'Prueba Sinedad', tier: 'premium' }, 'ficha sin edad (no se presume adulta)');
// El banner sin premio de «Hoy»: cede con quien tiene premio; sigue para AVI PRO (CONTROL).
const banner = async (o) => { await plantar(o); await ev(`(()=>{ localStorage.removeItem('ax_sharesnooze'); if(typeof CMTY!=='undefined')CMTY.nudgeOn=false; renderShareBanner(DB.clients[0]); return 1; })()`); return ev(`document.getElementById('cn-share').style.display`); };
check('«¿Te sirve AVI?» se calla con quien tiene premio', (await banner({ id: 'v700-coach', name: 'Prueba Gómez', age: 30, tier: 'premium' })) === 'none');
check('CONTROL · «¿Te sirve AVI?» sigue saliendo para AVI PRO', (await banner({ id: 'v700-pro', name: 'Prueba Pro', age: 30, tier: 'app' })) === 'block');
check('el coach en su entrenamiento conserva «¿Te sirve AVI?» (no tiene premio)', (await banner({ id: 'v700-coachself', name: 'Prueba Coach', age: 30, tier: 'premium', coachSelf: true })) === 'block');
await ev(`(()=>{ COACH_SELF=false; AUTH_ROLE='client'; return 1; })()`);

check('cero errores de JavaScript', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
const fallos = results.filter(r => r.startsWith('FAIL')).length;
log(`\n${results.length - fallos}/${results.length} OK`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(fallos ? 1 : 0);
