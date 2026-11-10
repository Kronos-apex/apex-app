// _fable2-camino-nuevo.mjs — verificación adversarial del camino de una persona NUEVA (sin iniciar sesión, sin escribir nada).
//   A. aviso de navegador interno (v738) con agentes de usuario reales + controles
//   B. el canal al salir del navegador interno y al confirmar el correo en OTRO navegador
//   C. qué ve en «Hoy» quien se registra sábado, domingo, festivo o día hábil (reloj fingido)
//   node scripts/e2e/_fable2-camino-nuevo.mjs
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/KRONOS/Desktop/AVI/avi-web/package.json');
const WebSocket = require('ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 8791, DBG = 9291, APP = `http://localhost:${PORT}/`;
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${join(tmpdir(), 'avi-fable2-' + Date.now())}`, '--no-first-run', 'about:blank']);
let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json(); } catch { await sleep(300); } }
for (let i = 0; i < 40; i++) { try { await fetch(APP); break; } catch { await sleep(250); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl); let id = 1; const pend = new Map();
const send = (m, p = {}, s) => new Promise((res) => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p, ...(s ? { sessionId: s } : {}) })); });
ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error); pend.delete(m.id); } });
await new Promise((r) => ws.on('open', r));

// una pestaña en un contexto NUEVO = otro navegador (almacenamiento aparte)
async function pestana() {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: P } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, P); await send('Runtime.enable', {}, P);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }, P);
  const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, P); if (!r || r.message || r.exceptionDetails) return 'EXC ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r?.exceptionDetails?.text || r); return r.result?.value; };
  const ir = async (q, espera = 2500) => { await send('Page.navigate', { url: APP + q }, P); await sleep(espera); for (let i = 0; i < 40; i++) { if ((await ev("typeof _canalDeLlegada==='function'&&typeof signupFunnelRow==='function'&&typeof initClientView==='function'")) === true) break; await sleep(400); } };
  return { P, ev, ir };
}
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`); };
const nota = (t) => out.push(t);

// ───────────────────────── A · navegador interno ─────────────────────────
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21G93';
const UAS = [
  ['Threads Android', AND + ' Barcelona 355.0.0.38.109 Android (34/14; 450dpi; 1080x2125; samsung; SM-A546E; a54x; s5e8835; es_CO; 660282911)', 'Threads', 'and'],
  ['Threads iPhone', IOS + ' Barcelona 355.0.0.29.90 (iPhone14,5; iOS 17_6_1; es_CO; es; scale=3.00; 1170x2532; 658190018)', 'Threads', 'ios'],
  ['Instagram Android', AND + ' Instagram 355.0.0.38.109 Android (34/14; 450dpi; 1080x2125; samsung; SM-A546E; a54x; s5e8835; es_CO; 660282911)', 'Instagram', 'and'],
  ['Instagram iPhone', IOS + ' Instagram 355.0.0.29.90 (iPhone14,5; iOS 17_6_1; es_CO; es; scale=3.00; 1170x2532; 658190018)', 'Instagram', 'ios'],
  ['Facebook Android', AND + ' [FB_IAB/FB4A;FBAV/487.0.0.52.72;IABMV/1;]', 'Facebook', 'and'],
  ['Facebook iPhone', IOS + ' [FBAN/FBIOS;FBAV/485.0.0.31.107;FBBV/660282911;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.6.1;FBSS/3;FBID/phone;FBLC/es_LA;FBOP/5;FBRV/0]', 'Facebook', 'ios'],
  ['Messenger Android', AND + ' [FB_IAB/Orca-Android;FBAV/480.0.0.9.106;IABMV/1;]', 'Facebook', 'and'],
  ['TikTok Android (musical_ly)', AND + ' musical_ly_2023702050 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/37.2.5 ByteLocale/es ByteFullLocale/es Region/CO AppId/1233 BytedanceWebview/d8a21c6', 'TikTok', 'and'],
  ['TikTok iPhone', IOS + ' musical_ly_37.2.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/es Region/CO isDarkMode/1 WKWebView/1 BytedanceWebview/d8a21c6', 'TikTok', 'ios'],
  ['TikTok Android (trill, sin BytedanceWebview)', AND + ' trill_2023702050 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/trill app_version/37.2.5 ByteLocale/es Region/CO AppId/1180', 'TikTok', 'and'],
  // otras apps con navegador propio que NO están en la afirmación (se anota qué pasa, no cuenta como fallo)
  ['? LinkedIn Android', AND + ' LinkedInApp', '?', 'and'],
  ['? Snapchat iPhone', IOS + ' Snapchat/13.10.0.38 (like Safari/8618.3.11.10.5, panda)', '?', 'ios'],
  ['? X/Twitter iPhone', IOS + ' Twitter for iPhone/10.60', '?', 'ios'],
  ['? Telegram Android (WebView sin nombre)', AND, '?', 'and'],
  // CONTROLES: nada de esto debe disparar el aviso
  ['CONTROL Chrome Android', 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', null],
  ['CONTROL Safari iPhone', IOS.replace('Mobile/21G93', 'Version/17.6 Mobile/15E148 Safari/604.1'), null],
  ['CONTROL Chrome iPhone', IOS.replace('Mobile/21G93', 'CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1'), null],
  ['CONTROL Samsung Internet', 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36', null],
  ['CONTROL Firefox Android', 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0', null],
  ['CONTROL Chrome escritorio', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', null],
];
const LEER = `(function(){const g=i=>document.getElementById(i);const h=g('inapp-hint'),o=g('inapp-open'),s=g('inapp-ios'),ih=g('install-hint');
  const vis=e=>!!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;
  return JSON.stringify({aviso:vis(h),app:g('inapp-app')&&g('inapp-app').textContent,chrome:vis(o),href:o?o.getAttribute('href'):null,ios:vis(s),copiar:vis(g('inapp-copy')),instalar:vis(ih),search:location.search,canal:localStorage.getItem('ax_canal')});})()`;
nota('\n══ A · aviso de navegador interno (llegando con ?origen=web&canal=threads) ══');
let hrefThreads = null;
for (const [nombre, ua, espera, so] of UAS) {
  const t = await pestana();
  await send('Emulation.setUserAgentOverride', { userAgent: ua }, t.P);
  await t.ir(espera === null ? '' : '?origen=web&canal=threads'); // los CONTROLES llegan sin ?origen=web: con el, la app apaga «instalar» a proposito (R22)
  const crudo = await t.ev(LEER); let r; try { r = JSON.parse(crudo); } catch { nota('❓ ' + nombre + ': ' + String(crudo).slice(0, 300)); continue; }
  if (espera === null) ok(nombre + ': SIN aviso y con instrucciones de instalar', !r.aviso && r.instalar, JSON.stringify({ aviso: r.aviso, instalar: r.instalar }));
  else if (espera === '?') nota(`·  ${nombre}: aviso=${r.aviso} instalar=${r.instalar} (fuera de la afirmación; se anota)`);
  else {
    const dec = r.href ? decodeURIComponent(r.href) : '';
    const boton = so === 'and' ? (r.chrome && !r.ios && /^intent:\/\//.test(r.href || '') && /canal=threads/.test(r.href) && /origen=web/.test(r.href) && /package=com\.android\.chrome/.test(r.href) && /browser_fallback_url=/.test(r.href) && /canal=threads/.test(dec.split('browser_fallback_url=')[1] || ''))
                               : (r.ios && !r.chrome);
    ok(`${nombre}: aviso «${espera}», ${so === 'and' ? '«Abrir en Chrome» con la misma dirección y canal' : 'cómo pasar a Safari'}, instalar apagado, dirección intacta`,
      r.aviso && r.app === espera && boton && r.copiar && !r.instalar && /canal=threads/.test(r.search), JSON.stringify({ aviso: r.aviso, app: r.app, chrome: r.chrome, ios: r.ios, instalar: r.instalar, search: r.search }));
    if (nombre === 'Threads Android') {
      hrefThreads = r.href; nota('   href: ' + r.href);
      // ¿sigue el aviso cuando abre el formulario de crear cuenta? ¿qué se le ofrece ahí?
      await t.ev(`document.querySelector('#cin-cta .cin-cta-fill').click()`); await sleep(600);
      const f = JSON.parse(await t.ev(LEER));
      const goo = await t.ev(`(function(){const b=[...document.querySelectorAll('#cin-signup button, #cin-signup a')].filter(e=>/google/i.test(e.textContent||'')||/wzGoogle|loginWithGoogle/.test(e.getAttribute('onclick')||''));return JSON.stringify(b.map(e=>(e.textContent||'').trim().slice(0,40)+' ['+(e.getAttribute('onclick')||'').slice(0,30)+']'));})()`);
      nota(`   al tocar «Crear cuenta» dentro de Threads: aviso visible=${f.aviso} · botones de Google en el asistente=${goo}`);
    }
  }
}

// ───────────────────────── B · canal ─────────────────────────
nota('\n══ B · el canal ══');
{
  // 1) sale del navegador interno a Chrome con el enlace del botón: Chrome es OTRO almacenamiento
  const dec = decodeURIComponent((hrefThreads || '').split('browser_fallback_url=')[1] || '').replace(/;end$/, '');
  const q = dec.indexOf('?') >= 0 ? dec.slice(dec.indexOf('?')) : '';
  const c = await pestana(); await c.ir(q);
  const v = await c.ev(`JSON.stringify(typeof _canalDeLlegada==='function'?_canalDeLlegada():'sin función')`);
  ok('sale a Chrome por «Abrir en Chrome» ANTES de registrarse: el canal llega', /"c":"threads"/.test(v || ''), `${q} → ${v}`);
  // 2) se registra con CORREO dentro de Threads; el enlace de confirmación abre el navegador del celular (otro
  //    almacenamiento) en la dirección de la app SIN ?canal. La cuenta se crea ahí (`_provisionFreeClient`).
  const w = await pestana(); await send('Emulation.setUserAgentOverride', { userAgent: UAS[0][1] }, w.P);
  await w.ir('?origen=web&canal=threads');
  const enThreads = await w.ev(`JSON.stringify(_canalDeLlegada())`);
  const n = await pestana(); await n.ir('');
  const enChrome = await n.ev(`JSON.stringify(typeof _canalDeLlegada==='function'?_canalDeLlegada():'sin función')`);
  const meta = await n.ev(`(function(){const s=String(signupClient);const m=s.match(/const meta=\\{[^}]*\\}/);return m?m[0]:'no encontré meta';})()`);
  ok('se registra con correo dentro de Threads y confirma desde el correo (otro navegador): el canal llega al perfil', /"c":"threads"/.test(enChrome || ''),
    `en Threads: ${enThreads} · donde se crea la cuenta: ${enChrome} · lo que viaja en la cuenta: ${/canal/.test(meta) ? 'incluye canal' : 'SIN canal → ' + meta.slice(0, 120)}`);
  const fila = await n.ev(`(function(){try{return JSON.stringify(signupFunnelRow(10, location.search, (function(){try{const r=JSON.parse(localStorage.getItem('ax_canal')||'null');return r&&r.c||null}catch(e){return null}})()))}catch(e){return 'EXC '+e.message}})()`);
  nota('   fila del embudo (paso 10) que saldría desde ese navegador: ' + fila);
}

// ───────────────────────── C · «Hoy» el día del registro ─────────────────────────
nota('\n══ C · «Hoy» el día que se registra (cuenta nueva armada con las funciones reales, sin sesión ni nube) ══');
const DIAS = [['martes 10-nov (CONTROL)', '2026-11-10T10:00:00-05:00'], ['sábado 14-nov', '2026-11-14T10:00:00-05:00'], ['domingo 15-nov', '2026-11-15T10:00:00-05:00'], ['lunes 16-nov FESTIVO', '2026-11-16T10:00:00-05:00'], ['viernes 13-nov', '2026-11-13T18:00:00-05:00']];
for (const lugar of ['gym', 'casa']) for (const [nombre, iso] of DIAS) {
  if (lugar === 'casa' && !/sábado|FESTIVO/.test(nombre)) continue;
  const t = await pestana();
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){const R=Date,off=R.parse('${iso}')-R.now();function D(...a){if(!new.target)return new R(R.now()+off).toString();return a.length?new R(...a):new R(R.now()+off);}D.prototype=R.prototype;D.now=()=>R.now()+off;D.parse=R.parse;D.UTC=R.UTC;window.Date=D;})();` }, t.P);
  await t.ir('', 3500);
  const r = await t.ev(`(async function(){
    try{
      const rec={id:'fable2-nueva',name:'Prueba Nueva',email:'x@example.com',goal:'Perder grasa',level:'Principiante',days:3,place:'${lugar}',sex:'F',age:30,weight:65,height:160,activityFactor:1.55,notes:'',phone:'',selfReg:true,tier:'libre',routines:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      if(typeof proTrialUntilFrom==='function')rec.proTrialUntil=proTrialUntilFrom(rec.createdAt);
      _applyAuthClientDB(rec,{}); _autoGenerateWeek(rec);
      CUR.loggedAs='client';CUR.clientId=rec.id; showScreen('s-client'); initClientView(rec);
      await new Promise(r=>setTimeout(r,1200));
      const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;
      const hoy=document.getElementById('cn-today');
      const fr=document.getElementById('cn-firstrun');
      const btn=[...hoy.querySelectorAll('button,a')].filter(vis).map(b=>(b.textContent||'').trim().replace(/\\s+/g,' ').slice(0,38)).filter(Boolean);
      return JSON.stringify({hoyEs:new Date().toString().slice(0,15),dias:rec.routines.map(x=>x.day),portada:(fr&&fr.innerText||'').replace(/\\s+/g,' ').slice(0,330),botones:btn.slice(0,14),trial:rec.proTrialUntil});
    }catch(e){return 'EXC '+e.message+' '+(e.stack||'').slice(0,300)}
  })()`);
  let j; try { j = JSON.parse(r); } catch { nota(`❓ ${lugar} · ${nombre}: ${r}`); continue; }
  const puedeHoy = j.botones.some(b => /empezar|entrenar|iniciar|comenzar/i.test(b));
  ok(`${lugar} · ${nombre}: hay un botón para entrenar HOY`, puedeHoy, `plan ${j.dias.join('·')} · «${j.portada}» · botones: ${JSON.stringify(j.botones)}`);
  if (/sábado/.test(nombre) && lugar === 'casa') {
    // ¿y desde «Rutinas»? cuántos toques y qué dice
    const rut = await t.ev(`(async function(){try{cnTab('cn-routines',document.querySelectorAll('.cntab')[1]);await new Promise(r=>setTimeout(r,700));const p=document.getElementById('cn-routines');const vis=e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;
      const antes=[...p.querySelectorAll('button')].filter(vis).map(b=>(b.textContent||'').trim().slice(0,30));const rc=p.querySelector('.rc .rch');if(rc)rc.click();await new Promise(r=>setTimeout(r,500));
      const desp=[...p.querySelectorAll('button')].filter(vis).map(b=>(b.textContent||'').trim().replace(/\\s+/g,' ').slice(0,34));return JSON.stringify({alAbrirRutinas:antes.slice(0,8),alDesplegarUna:desp.slice(0,10)});}catch(e){return 'EXC '+e.message}})()`);
    nota('   camino alterno por «Rutinas»: ' + rut);
  }
}

console.log(out.join('\n'));
const malos = out.filter((r) => r.startsWith('❌')).length;
console.log(`\n${out.filter(r => r.startsWith('✅')).length} ✅ · ${malos} ❌`);
ws.close(); chrome.kill(); srv.kill(); process.exit(malos ? 1 : 0);
