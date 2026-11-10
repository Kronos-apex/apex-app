// _verify-v744-registro.mjs — v744: el registro «Tu semana se arma en vivo» recorrido con toques reales (Chrome sin
// pantalla, sin nube: supabase bloqueado y escrituras selladas en localhost). Afirma:
//   A. la tarjeta arranca vacía y se llena con cada respuesta; los días solo desde su paso
//   B. la semana que pinta ES la que arma `_autoGenerateWeek` para otra cuenta con las mismas respuestas
//   C. lesiones con botones → su-notes; «Nada» suelta; «Otra cosa…» abre el texto; «Embarazo» no le sale a «Hombre»
//   D. el nombre se pide al final: Google sin nombre avisa EN el paso 6 y no se devuelve; con todo, guarda el pendiente
//   E. «Leer todo» abre el texto legal sin marcar la casilla; el WhatsApp se despliega
//   F. dentro de Threads sigue el aviso de v743 y Google escondido
//   node scripts/e2e/_verify-v744-registro.mjs [carpeta-capturas]
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/KRONOS/Desktop/AVI/avi-web/package.json');
const WebSocket = require('ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = process.argv[2] || null;
const PORT = 8795, DBG = 9295, APP = `http://localhost:${PORT}/?origen=web&canal=threads`;
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${join(tmpdir(), 'avi-v744-' + Date.now())}`, '--no-first-run', 'about:blank']);
let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json(); } catch { await sleep(300); } }
for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${PORT}/`); break; } catch { await sleep(250); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl); let id = 1; const pend = new Map();
const send = (m, p = {}, s) => new Promise((res) => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p, ...(s ? { sessionId: s } : {}) })); });
ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error); pend.delete(m.id); } });
await new Promise((r) => ws.on('open', r));

async function pestana(ua) {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: P } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, P); await send('Runtime.enable', {}, P);
  await send('Network.enable', {}, P); await send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*supabase.in*'] }, P);
  if (ua) await send('Emulation.setUserAgentOverride', { userAgent: ua }, P);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, P);
  const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, P); if (!r || r.exceptionDetails) return 'EXC ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r?.exceptionDetails?.text || r); return r.result?.value; };
  await send('Page.navigate', { url: APP }, P);
  for (let i = 0; i < 60; i++) { await sleep(400); if ((await ev("typeof WZ==='object'&&typeof _wzPreviewWeek==='function'&&!!document.getElementById('cin-cta')&&Array.isArray(DB.exercises)&&DB.exercises.length>300")) === true) break; }
  await sleep(600);
  const shot = async (n) => { if (!SHOTS) return; await ev("(function(){const c=document.getElementById('cin-signup');if(c)c.scrollTop=0;})()"); await sleep(350); const { data } = await send('Page.captureScreenshot', { format: 'png' }, P); writeFileSync(join(SHOTS, `v744-${n}.png`), Buffer.from(data, 'base64')); };
  return { P, ev, shot };
}
const out = []; const ok = (n, c, x = '') => out.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`);
const LEER = `JSON.stringify({cur:WZ.cur, modo:document.getElementById('wz-plan').dataset.modo,
  slots:[...document.querySelectorAll('.wz-slot')].map(s=>(s.classList.contains('on')?'+':'-')+s.querySelector('.v').textContent),
  semana:[...document.querySelectorAll('#wz-plan-week span')].map((d,i)=>d.classList.contains('on')?i:null).filter(x=>x!==null),
  n:document.getElementById('wz-plan-n').textContent, err:(document.getElementById('su-err').classList.contains('on')?document.getElementById('su-err').textContent:'')})`;
const toca = (sel) => `(function(){const b=document.querySelector(${JSON.stringify(sel)});if(!b)return 'NO HAY '+${JSON.stringify(sel)};b.click();return 'ok';})()`;

const t = await pestana();
await t.ev(`document.getElementById('cin-cta').style.display='none'; cinFormMode(true); document.getElementById('cin-signup').style.display='block'; WZ.open();`);
await sleep(500);
let r = JSON.parse(await t.ev(LEER));
ok('A1 arranca en el objetivo con la tarjeta vacía', r.cur === 0 && r.modo === 'armando' && r.slots.every(x => x === '-—') && r.semana.length === 0 && /Se arma/.test(r.n), JSON.stringify(r));
await t.shot('1-objetivo');
await t.ev(toca(`#wz-s-goal .wz-chip[onclick*="Perder grasa"]`)); await sleep(150);
r = JSON.parse(await t.ev(LEER));
ok('A2 el objetivo se llena en el toque', r.slots[0] === '+Perder grasa' && /1 de 4/.test(r.n), JSON.stringify(r));
await sleep(500);
await t.ev(toca(`#wz-s-place .wz-chip[onclick*="'gym'"]`)); await sleep(650);
await t.ev(toca(`#wz-s-level .wz-chip[onclick*="Principiante"]`)); await sleep(650);
r = JSON.parse(await t.ev(LEER));
ok('A3 en el paso de los días: 4 casillas y la semana pintada', r.cur === 3 && r.slots[3] === '+3 por semana' && r.semana.length === 3, JSON.stringify(r));
await t.ev(toca(`#wz-s-when .wz-gchip[onclick*="'su-days','4'"]`)); await sleep(200);
await t.ev(toca(`#wz-s-when .wz-gchip[onclick*="'su-sex','F'"]`)); await sleep(200);
r = JSON.parse(await t.ev(LEER));
ok('A4 cambiar los días repinta la semana', r.slots[3] === '+4 por semana' && r.semana.length === 4, JSON.stringify(r));
await t.shot('2-dias');
// B · la semana que pinta = la que arma _autoGenerateWeek para OTRA cuenta con las mismas respuestas
const comp = JSON.parse(await t.ev(`JSON.stringify((function(){
  const vista=[...document.querySelectorAll('#wz-plan-week span')].map((d,i)=>d.classList.contains('on')?i:null).filter(x=>x!==null);
  const c={id:'0b6e4f1a-cuenta-real',goal:'Perder grasa',place:'gym',level:'Principiante',days:4,sex:'F',age:null,weight:null,height:null,notes:'',routines:[]};
  _autoGenerateWeek(c);
  const idx={'Lunes':0,'Martes':1,'Miércoles':2,'Jueves':3,'Viernes':4,'Sábado':5,'Domingo':6};
  return {vista, real:c.routines.map(r=>idx[r.day]), nombres:c.routines.map(r=>r.day+' '+r.name+' '+r.exercises.length)};
})())`));
ok('B la semana que ve es la que recibe (otra cuenta, mismas respuestas)', JSON.stringify(comp.vista) === JSON.stringify(comp.real), JSON.stringify(comp));
// C · cuerpo y lesiones
await t.ev(`WZ.next()`); await sleep(300);
await t.ev(`WZ.next()`); await sleep(200);
r = JSON.parse(await t.ev(LEER));
ok('C1 sin edad no avanza y lo dice', r.cur === 4 && r.modo === 'compacto' && /edad/.test(r.err), JSON.stringify(r));
await t.ev(`document.getElementById('su-age').value='30'`);
await t.ev(toca(`#wz-lchips [data-frase="dolor de rodilla"]`));
await t.ev(toca(`#wz-lchips [data-otra]`)); await sleep(100);
await t.ev(`(function(){const i=document.getElementById('su-notes-otra');i.value='tendinitis';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
let notas = await t.ev(`document.getElementById('su-notes').value+'|'+document.getElementById('wz-lim-otra').className+'|'+document.querySelector('#wz-lchips [data-frase="embarazo"]').className`);
ok('C2 rodilla + otra → su-notes', notas.startsWith('dolor de rodilla, tendinitis|') && !notas.split('|')[1].includes('cx-off') && !notas.split('|')[2].includes('cx-off'), notas);
await t.shot('3-cuerpo');
await t.ev(toca(`#wz-lchips [data-nada]`));
notas = await t.ev(`document.getElementById('su-notes').value+'|'+document.getElementById('wz-lim-otra').className`);
ok('C3 «Nada» suelta todo y cierra el texto', notas === '|cx-off', notas);
await t.ev(toca(`#wz-lchips [data-frase="dolor de hombro"]`));
await t.ev(`WZ.back()`); await sleep(200);
await t.ev(toca(`#wz-s-when .wz-gchip[onclick*="'su-sex','M'"]`)); await sleep(100);
await t.ev(toca(`#wz-lchips [data-frase="embarazo"]`)); // sabotaje del control: aunque se intente, Hombre no la ve
await t.ev(`WZ.next()`); await sleep(250);
notas = await t.ev(`document.querySelector('#wz-lchips [data-frase="embarazo"]').className+'|'+document.getElementById('su-notes').value`);
ok('C4 a «Hombre» no se le ofrece «Embarazo» y no queda en sus notas', notas.split('|')[0].includes('cx-off') && !/embarazo/.test(notas.split('|')[1]) && /dolor de hombro/.test(notas), notas);
// D · cuenta
await t.ev(`WZ.next()`); await sleep(300);
r = JSON.parse(await t.ev(LEER));
const dias = await t.ev(`[...document.querySelectorAll('#wz-plan-days .d')].map(d=>d.textContent).join(' / ')`);
ok('D1 en la cuenta el plan sale listo, con sus días', r.cur === 5 && r.modo === 'listo' && dias.split(' / ').length === 4 && /ejercicios/.test(dias), JSON.stringify(r) + ' ' + dias);
await t.shot('4-cuenta');
await t.ev(`window.__g=0; window.loginWithGoogle=function(){window.__g++;};`);
await t.ev(`wzGoogle()`); await sleep(150);
r = JSON.parse(await t.ev(LEER));
const foco = await t.ev(`document.activeElement&&document.activeElement.id`);
ok('D2 Google sin nombre avisa en el sitio y no se devuelve', r.cur === 5 && /nombre/.test(r.err) && foco === 'su-name' && (await t.ev('window.__g')) === 0, JSON.stringify(r) + ' foco=' + foco);
await t.ev(`document.getElementById('su-name').value='Prueba'`);
await t.ev(`wzGoogle()`); await sleep(150);
r = JSON.parse(await t.ev(LEER));
ok('D3 con nombre y sin casillas: pide las casillas', /autoriz|casill|acept/i.test(r.err) && (await t.ev('window.__g')) === 0, r.err);
// E · Leer todo y WhatsApp
const leer = await t.ev(`(function(){const b=document.querySelector('.wz-cklee');const ck=document.getElementById('su-ck-general');const antes=ck.checked;b.click();const lab=b.previousElementSibling;return [antes,ck.checked,lab.classList.contains('abierto'),b.textContent,getComputedStyle(lab.querySelector('span')).webkitLineClamp].join('|');})()`);
ok('E1 «Leer todo» abre el texto y no marca la casilla', leer.startsWith('false|false|true|Leer menos'), leer);
await t.ev(`wzShowPhone()`);
const ph = await t.ev(`document.getElementById('su-phone-box').className+'|'+document.getElementById('su-phone-toggle').getAttribute('aria-expanded')+'|'+(document.activeElement&&document.activeElement.id)`);
ok('E2 el WhatsApp se despliega y lleva el foco', ph === '|true|su-phone', ph);
await t.ev(`document.getElementById('su-phone').value='3001234567'; ['su-ck-general','su-ck-salud','su-ck-adulto'].forEach(i=>{const c=document.getElementById(i);if(c&&!c.closest('.cx-off'))c.checked=true;});`);
await t.ev(`wzGoogle()`); await sleep(500);
const pendiente = await t.ev(`localStorage.getItem('ax_wz_pending')`);
let pj = {}; try { pj = JSON.parse(pendiente); } catch {}
ok('D4 con todo, sale a Google con el pendiente completo', (await t.ev('window.__g')) === 1 && pj.name === 'Prueba' && pj.days === 4 && pj.goal === 'Perder grasa' && /dolor de hombro/.test(pj.notes || '') && /573001234567|3001234567/.test(pj.phone || '') && pj.consent, String(pendiente).slice(0, 300));
// F · dentro de Threads
const THREADS = 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 Barcelona 355.0.0.38.109 Android (34/14; 450dpi; 1080x2125; samsung; SM-A546E; a54x; s5e8835; es_CO; 660282911)';
const th = await pestana(THREADS);
await th.ev(`document.getElementById('cin-cta').style.display='none'; cinFormMode(true); document.getElementById('cin-signup').style.display='block'; WZ.open(); WZ.cur=5; WZ._sync();`);
await sleep(300);
const f = await th.ev(`['#wz-inapp','.wz-gbtn-main','#su-mail-box','#su-name','#wz-plan'].map(s=>getComputedStyle(document.querySelector(s)).display).join('|')`);
ok('F dentro de Threads: aviso, sin Google, correo abierto, nombre y tarjeta', f === 'block|none|block|inline-block|block', f); // el nombre es un <input>: su display normal es inline-block (lo que importa es que no sea none)

console.log(out.join('\n'));
const malos = out.filter((x) => x.startsWith('❌')).length;
console.log(`\n${out.filter(x => x.startsWith('✅')).length} ✅ · ${malos} ❌`);
ws.close(); chrome.kill(); srv.kill(); process.exit(malos ? 1 : 0);
