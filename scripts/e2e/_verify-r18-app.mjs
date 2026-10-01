// Verificación E2E de v696 (R18): la bienvenida honesta, «Crear cuenta» primero si se llega de la web,
// y AVI PRO dentro de la app (candado, ventana «Más de AVI» y bandas de cuenta).
//
// 🔒 Sin login y sin escribir en ningún lado: los clientes son de mentira y se plantan en memoria
//    (`DB.clients` + `CUR.clientId`); `window.open` y `requestCoach` se ESPÍAN, así que no se abre
//    ningún WhatsApp ni se manda ninguna solicitud. La escritura a la nube está sellada en localhost.
//
// Corre: node scripts/e2e/_verify-r18-app.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8796, DBG = 9296;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-r18-' + Date.now();
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
// El arranque real termina después de que existen las funciones: se espera el símbolo POST-arranque y
// que la pantalla de carga se haya ido (si no, el hit-test lo gana el splash — gotcha de v624).
const arrancar = async (url) => {
  await send('Page.navigate', { url });
  const ok = await waitFor(`typeof window._aviUpdateBusy!=='undefined' && (()=>{const s=document.getElementById('avi-loading'); return !s || getComputedStyle(s).display==='none' || s.style.display==='none' || !s.isConnected;})()`, 20000);
  await sleep(600);
  return ok;
};
const cta = () => ev(`JSON.stringify([...document.querySelectorAll('#cin-cta > button')].map(b=>({t:b.textContent.trim(),c:b.className})))`).then(s => JSON.parse(s || '[]'));

// ── 1 · Sin marca: la bienvenida de siempre, con el texto honesto ──
check('MONTAJE: la app arranca sin marca', await arrancar(APP));
const eyebrow = await ev(`(document.querySelector('.cin-eyebrow')||{}).textContent`);
check('la bienvenida no le promete un coach', eyebrow === 'Tu rutina, en tu celular', eyebrow);
const sub = await ev(`(document.querySelector('.cin-sub2')||{}).textContent||''`);
check('el subtítulo dice que es gratis y que el coach se suma', /^Gratis para empezar/.test(sub) && !/no entrenas solo/.test(sub), sub);
let b = await cta();
check('sin marca: «Iniciar sesión» sigue siendo el principal (CONTROL)', b[0]?.t === 'Iniciar sesión' && b[0]?.c === 'cin-cta-fill' && b[1]?.t === 'Crear cuenta', JSON.stringify(b));
check('sin marca: el enlace a la web sigue ahí (CONTROL)', await ev(`!!document.querySelector('#cin-cta .cin-web')`));
await shot('r18-bienvenida-sin-marca');

// ── 2 · Con ?origen=web: «Crear cuenta» adelante, sin el enlace de vuelta ──
check('MONTAJE: la app arranca con ?origen=web', await arrancar(APP + '?origen=web'));
b = await cta();
check('con marca: «Crear cuenta» es el botón principal y va primero', b[0]?.t === 'Crear cuenta' && b[0]?.c === 'cin-cta-fill', JSON.stringify(b));
check('con marca: el otro dice «Ya tengo cuenta» y va en contorno', b[1]?.t === 'Ya tengo cuenta' && b[1]?.c === 'cin-cta-out', JSON.stringify(b));
check('con marca: no hay enlace de vuelta a la web', await ev(`!document.querySelector('.cin-web')`));
const hit = await ev(`(()=>{const e=document.querySelector('#cin-cta > button'); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return h===e||e.contains(h);})()`);
check('con marca: «Crear cuenta» se puede tocar (nada encima)', hit === true, String(hit));
await shot('r18-bienvenida-origen-web');
await ev(`document.querySelector('#cin-cta > button').click()`);
await sleep(500);
check('tocar «Crear cuenta» abre el registro', await ev(`getComputedStyle(document.getElementById('cin-signup')).display!=='none'`));

// ── 3 · AVI PRO dentro de la app (clientes de mentira, en memoria) ──
await ev(`(()=>{ window.__abiertos=[]; window.open=(u)=>{window.__abiertos.push(String(u)); return null;};
  window.__rc=0; window.requestCoach=async()=>{ window.__rc=window.__abiertos.length+1; }; return 1; })()`);
const plantar = (cli) => ev(`(()=>{ const c=${JSON.stringify(cli)}; c.payments=(c.dias==null)?[]:[{date:new Date(Date.now()-30*864e5).toISOString(),dueDate:new Date(Date.now()+c.dias*864e5).toISOString(),amount:1}];
  DB.clients=[c]; CUR.clientId=c.id; return 1; })()`);
const upsell = async () => {
  await ev(`(()=>{ closePremiumUpsell(); showPremiumUpsell(); return 1; })()`); await sleep(300);
  return JSON.parse(await ev(`JSON.stringify({on:document.getElementById('premium-upsell').classList.contains('on'),
    pro:document.getElementById('pu-opt-pro').offsetHeight>0, coach:document.getElementById('pu-opt-coach').offsetHeight>0,
    titulo:document.getElementById('pu-title').textContent, sub:document.getElementById('pu-sub').textContent})`));
};
await plantar({ id: 'r18-libre', name: 'Prueba Libre', tier: 'libre' });
let u = await upsell();
check('libre: la ventana ofrece AVI PRO y el coaching', u.on && u.pro && u.coach, JSON.stringify(u));
check('libre: el titular ofrece elegir y desbloquear', u.titulo === 'Elige cómo seguir' && /^Desbloquea la app entera/.test(u.sub), u.titulo + ' / ' + u.sub);
await shot('r18-mas-de-avi-libre');
await ev(`puPro()`); await sleep(200);
let ab = JSON.parse(await ev('JSON.stringify(window.__abiertos)'));
check('«Quiero AVI PRO» abre la página de paso de PRO en la web', ab[ab.length - 1] === 'https://avientrena.com/ir/app-pro', ab.join(' | '));
await ev(`(()=>{ window.__abiertos=[]; window.__rc=0; showPremiumUpsell(); return 1; })()`);
await ev(`puConfirm()`); await sleep(300);
ab = JSON.parse(await ev('JSON.stringify(window.__abiertos)'));
const rc = await ev('window.__rc');
check('«Quiero el coaching» abre WhatsApp del coaching ANTES de la solicitud', ab[0] === 'https://avientrena.com/ir/app-coach' && rc === 2, `abiertos=${ab.join(' | ')} solicitud tras ${rc - 1} ventanas`);
const sent = JSON.parse(await ev(`JSON.stringify({sent:getComputedStyle(document.getElementById('pu-sent')).display, sell:getComputedStyle(document.getElementById('pu-sell')).display})`));
check('tras pedir el coaching se ve «Solicitud enviada» y no las opciones', sent.sent === 'flex' && sent.sell === 'none', JSON.stringify(sent));
// El botón atrás de Android cierra la ventana (el manejador de la app la reconoce).
const atras = await ev(`(()=>{ const r=(typeof _aviCloseTopOverlay==='function')?_aviCloseTopOverlay():'sin-fn'; return {r, on:document.getElementById('premium-upsell').classList.contains('on')}; })()`);
check('el botón atrás cierra la ventana «Más de AVI»', atras && atras.r === true && atras.on === false, JSON.stringify(atras));
await ev(`closePremiumUpsell()`);
// Quien ya pidió coach ve su solicitud, no un formulario nuevo.
await plantar({ id: 'r18-libre2', name: 'Prueba Pidio', tier: 'libre', wantsCoach: true });
await ev(`(()=>{ closePremiumUpsell(); showPremiumUpsell(); return 1; })()`); await sleep(200);
const ya = await ev(`getComputedStyle(document.getElementById('pu-sent')).display`);
check('libre que ya pidió coach: la ventana abre en «Solicitud enviada»', ya === 'flex', ya);
await ev(`closePremiumUpsell()`);
// 360 px con «Muy grande»: las dos opciones y «Ahora no» se alcanzan (la ventana zoomea su contenido).
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
await plantar({ id: 'r18-libre', name: 'Prueba Libre', tier: 'libre' });
await ev(`(()=>{ document.documentElement.setAttribute('data-fs','xl'); closePremiumUpsell(); showPremiumUpsell(); return 1; })()`); await sleep(400);
const xl = JSON.parse(await ev(`JSON.stringify((()=>{ const out={};
  for (const [k,sel] of [['pro','#pu-opt-pro .pu-opt-b'],['coach','#pu-cta'],['ahoraNo','#pu-sell .pu-skip']]) {
    const e=document.querySelector(sel); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect();
    const h=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
    out[k]={toca:h===e||e.contains(h), dentro:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};
  } out.zoom=getComputedStyle(document.querySelector('#premium-upsell .wf-inner')).zoom; return out; })())`));
check('360 px + «Muy grande»: los dos botones y «Ahora no» se pueden tocar', ['pro', 'coach', 'ahoraNo'].every(k => xl[k].toca && xl[k].dentro), JSON.stringify(xl));
await shot('r18-mas-de-avi-360-xl');
await ev(`(()=>{ document.documentElement.removeAttribute('data-fs'); closePremiumUpsell(); return 1; })()`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const lock = (cli) => plantar(cli).then(() => ev(`premiumLockHTML('Prueba','Algo.')`));
let h = await lock({ id: 'r18-libre', name: 'Prueba Libre', tier: 'libre' });
check('libre: el candado nombra AVI PRO y abre las opciones', /AVI PRO/.test(h) && /Ver cómo desbloquearlo/.test(h) && !/coach \(Premium\)/.test(h));

await plantar({ id: 'r18-pro', name: 'Prueba Pro', tier: 'app', dias: 20 });
u = await upsell();
check('PRO al día: la ventana NO le ofrece PRO, solo el coaching', u.on && !u.pro && u.coach, JSON.stringify(u));
check('PRO al día: el titular no le ofrece desbloquear lo que ya tiene', u.titulo === 'Súmale un coach' && /^Ya tienes la app entera/.test(u.sub), u.titulo + ' / ' + u.sub);
await shot('r18-mas-de-avi-pro');
await ev(`closePremiumUpsell()`);
h = await lock({ id: 'r18-pro', name: 'Prueba Pro', tier: 'app', dias: 20 });
check('PRO al día: el candado (el chat) ofrece el coaching', /Ver el coaching/.test(h), h.replace(/\s+/g, ' ').slice(0, 120));

h = await lock({ id: 'r18-prov', name: 'Prueba Vencido', tier: 'app', dias: -30 });
check('PRO vencido: el candado dice «Renovar mi AVI PRO» y abre WhatsApp', /Renovar mi AVI PRO/.test(h) && /abrirPlanWhatsApp\('renovar-pro'\)/.test(h) && !/Hablar con mi coach/.test(h));
await ev(`renderGraceBand(DB.clients[0])`);
let band = await ev(`(document.querySelector('#cn-grace .gband-b')||{}).textContent||''`);
check('PRO vencido: la banda dice «Renovar mi AVI PRO»', band === 'Renovar mi AVI PRO', band);
await plantar({ id: 'r18-prog', name: 'Prueba Gracia', tier: 'app', dias: -3 });
await ev(`renderGraceBand(DB.clients[0])`);
band = await ev(`(document.querySelector('#cn-grace .gband-b')||{}).textContent||''`);
check('PRO en gracia: la banda dice «Renovar mi AVI PRO»', band === 'Renovar mi AVI PRO', band);
await ev(`(()=>{ window.__abiertos=[]; document.querySelector('#cn-grace .gband-b').click(); return 1; })()`);
ab = JSON.parse(await ev('JSON.stringify(window.__abiertos)'));
check('y tocarla abre la página de paso de renovar', ab[0] === 'https://avientrena.com/ir/app-renovar-pro', ab.join(' | '));

// CONTROL de discriminación: quien tiene coach conserva su salida de siempre (el chat), y la ventana no se abre.
await plantar({ id: 'r18-coach', name: 'Prueba Coach', tier: 'premium', dias: -3 });
await ev(`renderGraceBand(DB.clients[0])`);
band = await ev(`(document.querySelector('#cn-grace .gband-b')||{}).textContent||''`);
check('CONTROL · con coach en gracia: la banda sigue diciendo «Hablar con mi coach»', band === 'Hablar con mi coach', band);
h = await lock({ id: 'r18-coachv', name: 'Prueba CoachV', tier: 'premium', dias: -30 });
check('CONTROL · con coach vencido: el candado sigue llevando al chat', /Hablar con mi coach/.test(h) && !/Renovar mi AVI PRO/.test(h));
u = await upsell();
check('CONTROL · con coach: la ventana «Más de AVI» no se abre', !u.on, JSON.stringify(u));

check('cero errores de JavaScript', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
const fallos = results.filter(r => r.startsWith('FAIL')).length;
log(`\n${results.length - fallos}/${results.length} OK`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(fallos ? 1 : 0);
