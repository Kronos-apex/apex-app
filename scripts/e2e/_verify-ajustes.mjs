// ─────────────────────────────────────────────────────────────────────────────
// _verify-ajustes.mjs — «AJUSTES» COMO UNA APP DE VERDAD (v704)
//
// Pedido del PO (10-oct-2026): *«organices todo lo que tiene que ver con ajustes en ajustes!!! Esa
// pantalla de perfil está muy larga… algo bien organizado como una app de verdad»*, y *«el coach
// también pasa a ese formato»*. Referencias: Apple, Android, Hevy, Strava, Fitia, MyFitnessPal,
// TrainHeroic, Fitsly y WhatsApp → el Perfil es quién eres; Ajustes, una lista agrupada donde cada
// fila dice su valor y abre su pantalla.
//
// QUÉ AFIRMA, sobre lo que la persona hace y ve:
//   · el Perfil ya no trae tema, letra, sonido, cuenta ni versión, y el engranaje se ve y se toca;
//   · Ajustes abre con sus grupos y cada fila con su valor real (tema, letra, sonido, plan);
//   · cada fila abre SU pantalla (una sola sección a la vista), lo elegido se aplica, y al volver la
//     fila ya dice lo nuevo; el atrás (history.back, como el botón de Android) cierra de a una;
//   · «Salir» deja en el login sin ninguna pantalla encima;
//   · el coach llega por su menú («Ajustes») a la misma pantalla, con «Tu cuenta de coach» y sus
//     datos cargados; nunca ve «Mi plan»;
//   · todo cabe en 360 px y se toca (≥44 px), con letra normal y «Muy grande» (control de zoom).
//
//   node scripts/e2e/_verify-ajustes.mjs        (SHOTS_DIR=… para capturas)
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('ajustes');
const PORT = 8819, DP = 9319, APP = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/ajustes-' + Date.now(), '--no-first-run', '--window-size=360,800', APP]);
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await sleep(600);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}localStorage.clear();})()`);
await send('Page.navigate', { url: APP });
A.ok(await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof openAjustes==='function' && typeof renderMedidasClient==='function'`), 'la app terminó de arrancar');
// CONTROL de montaje (gotcha v624): el splash `#avi-loading` (z-index 9999) puede seguir encima un rato
// después del símbolo de arranque; tocar antes de que se vaya mide el splash, no la app (1 de 5 corridas).
A.ok(await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000), 'la pantalla de carga ya se fue');

const shot = async (nombre) => {
  if (!SHOTS) return;
  const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 360, height: 800, scale: 1 } });
  writeFileSync(`${SHOTS}/ajustes-${nombre}.png`, Buffer.from(s.data, 'base64'));
};
const atras = async () => { await ev('history.back()'); await sleep(450); };
const tocar = sel => ev(`(()=>{ const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return false; b.click(); return true; })()`);

// ── Montaje: una asesorada con AVI PRO que vence en 20 días ──
const CID = 'aj1';
const montaje = await ev(`(()=>{try{
  const vence=new Date(Date.now()+20*864e5); vence.setHours(12,0,0,0);
  const client={id:'${CID}',name:'Daniela Paredes',level:'Intermedio',tier:'app',goal:'Recomposición',days:4,routines:[],
    payments:[{date:new Date().toISOString(),dueDate:vence.toISOString(),amount:0}]};
  DB.clients=[client]; DB.history={'${CID}':[]}; DB.prs={}; DB.bodyweight={}; DB.medidas={}; DB.nutrition={}; DB.photos={}; DB.msgs={'${CID}':[]};
  CUR.clientId='${CID}'; CUR.loggedAs='client';
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  setTheme('dark'); setTextSize('normal');
  showScreen('s-client'); renderClientProfile(client); cnTab('cn-profile',null);
  return {ok:true, mes:['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][vence.getMonth()], dia:vence.getDate()};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`);
A.ok(montaje && montaje.ok, 'el montaje abre el Perfil de una asesorada con AVI PRO', montaje);
await sleep(500);

// ── 1. El Perfil ya no trae ajustes, y el engranaje se ve y se toca ──
const perfil = await ev(`(()=>{
  const p=document.getElementById('cn-profile');
  const dentro=p.querySelectorAll('[data-theme-btn],[data-fs-btn],#cn-sound,#cn-danger-card,#cn-account-card,#cn-build').length;
  const enLaApp=document.querySelectorAll('[data-theme-btn],[data-fs-btn],#cn-sound,#cn-danger-card,#cn-account-card,#cn-build').length;
  const b=document.getElementById('cn-aj-btn'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
  return {dentro, enLaApp, alto:Math.round(r.height), derecha:Math.round(innerWidth-r.right), tocable:!!el&&(el===b||b.contains(el)), txt:b.textContent.trim(), encima:el?((el.id||'')+'.'+(el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className)+'<'+(el.parentElement&&el.parentElement.id||'')):'nada'};
})()`);
A.ok(perfil.dentro === 0, 'el Perfil ya no trae tema, letra, sonido, cuenta ni versión', perfil);
A.ok(perfil.enLaApp >= 10, 'CONTROL: esos controles siguen existiendo en la app (se mudaron, no se borraron)', perfil.enLaApp);
A.ok(perfil.tocable && perfil.alto >= 40 && perfil.derecha <= 24 && /Ajustes/.test(perfil.txt), 'el botón «Ajustes» está arriba a la derecha del Perfil y se puede tocar', perfil);
await shot('perfil');

// ── 2. La lista de Ajustes ──
const LISTA = `(()=>{ const room=document.getElementById('ajustes-room'); const r=room.getBoundingClientRect();
  const grupos=[...room.querySelectorAll('.aj-grp')].map(g=>g.textContent.trim());
  const filas=[...room.querySelectorAll('.aj-row')].map(f=>({id:f.dataset.ajRow||'', lbl:f.querySelector('.aj-lbl').textContent.trim(), val:(f.querySelector('.aj-val')||{}).textContent||'', h:Math.round(f.getBoundingClientRect().height), boton:f.tagName==='BUTTON'}));
  const ico=[...room.querySelectorAll('.aj-ic')].filter(i=>!i.querySelector('svg')).length;
  return {abierta:room.classList.contains('on')&&r.height>300, grupos, filas, sinIcono:ico, anchoDoc:document.documentElement.scrollWidth,
    version:document.getElementById('cn-build').textContent.trim(), auth:typeof AUTH_MODE!=='undefined'&&!!AUTH_MODE}; })()`;
const capas0 = await ev('AVINAV.layers||0');
A.ok(await tocar('#cn-aj-btn'), 'se toca «Ajustes»');
await sleep(400);
const l0 = await ev(LISTA);
// 🔒 v572: cada pantalla empuja SU entrada de historial al abrir. Sin ella el atrás igual la cierra en el
// escritorio (ruta de «overlay sin capa» que re-empuja dentro del popstate), y ESE re-empuje es justo
// el que el teléfono instalado se come: el siguiente atrás cierra la app. Se mira el mecanismo.
A.ok((await ev('AVINAV.layers||0')) === capas0 + 1, 'abrir Ajustes empuja SU entrada de historial (una capa más)', { antes: capas0 });
const fila = (l, idF) => l.filas.find(f => f.id === idF) || {};
A.ok(l0.abierta, 'se abre la pantalla de Ajustes', l0);
A.ok(JSON.stringify(l0.grupos) === JSON.stringify(['Entreno', 'Pantalla', 'Tu cuenta', 'Sesión']), 'grupos: Entreno · Pantalla · Tu cuenta · Sesión', l0.grupos);
A.ok(fila(l0, 'sonido').val === 'Clásico' && fila(l0, 'tema').val === 'Oscuro' && fila(l0, 'letra').val === 'Normal', 'cada fila dice lo que hay elegido (Clásico · Oscuro · Normal)', l0.filas);
A.ok(fila(l0, 'plan').val === `AVI PRO · vence el ${montaje.dia} de ${montaje.mes}` && fila(l0, 'plan').boton === false, '«Mi plan» dice su plan y cuándo vence (y es solo informativa)', fila(l0, 'plan'));
A.ok(!!fila(l0, 'cuenta').lbl === l0.auth, '«Cuenta y acceso» sale solo con sesión real (Google y eliminar cuenta)', { auth: l0.auth, fila: fila(l0, 'cuenta') });
A.ok(fila(l0, 'salir').lbl === 'Cerrar sesión', 'y al final, «Cerrar sesión» (como en el menú del coach)');
A.ok(await ev(`!document.querySelector('#ajroom-list [data-aj-row="salir"] .aj-chev')`), 'es una acción: no lleva la flecha de «abre otra pantalla»');
A.ok(l0.sinIcono === 0, 'todas las filas llevan su ícono (ninguno cae a ✨ por un nombre que no existe)', l0.sinIcono);
A.ok(/703|704|versión/.test(l0.version) || l0.version === 'AVI', 'la versión de la app queda al pie de Ajustes', l0.version);
A.ok(l0.anchoDoc <= 360 && l0.filas.every(f => f.h >= 44), 'cabe en 360 px y cada fila se toca (≥44 px)', l0.filas.map(f => f.h));
await shot('lista-oscuro');

// ── 3. Cada fila abre su pantalla, lo elegido se aplica, y al volver la fila lo dice ──
const SUB = `(()=>{ const r=document.getElementById('ajustes-sub-room'); const vis=[...r.querySelectorAll('.aj-sec')].filter(s=>!s.hidden&&s.getBoundingClientRect().height>0).map(s=>s.dataset.aj);
  return {abierta:r.classList.contains('on'), titulo:document.getElementById('ajsub-t').textContent, vis, anchoDoc:document.documentElement.scrollWidth}; })()`;
A.ok(await tocar('#ajroom-list [data-aj-row="tema"]'), 'se toca «Tema»');
await sleep(400);
const s1 = await ev(SUB);
A.ok(s1.abierta && s1.titulo === 'Tema' && JSON.stringify(s1.vis) === '["tema"]', 'abre «Tema», y solo esa sección está a la vista', s1);
A.ok((await ev('AVINAV.layers||0')) === capas0 + 2, 'el detalle empuja la suya encima (dos capas)');
await tocar('#ajsub-body [data-theme-btn="light"]'); await sleep(250);
// Desmarcados: transparentes y con borde suave. Antes `style.x=''` borraba la regla en línea y el
// navegador los pintaba con fondo gris y borde del color del texto.
const desm = await ev(`(()=>{ const b=document.querySelector('#ajsub-body [data-theme-btn="dark"]'); const cs=getComputedStyle(b);
  const ref=document.createElement('div'); ref.style.color='var(--br2)'; document.body.appendChild(ref); const br2=getComputedStyle(ref).color; ref.remove();
  return {fondo:cs.backgroundColor, borde:cs.borderTopColor, br2}; })()`);
A.ok(desm.fondo === 'rgba(0, 0, 0, 0)' && desm.borde === desm.br2, 'el tema sin marcar se ve como siempre: transparente y con borde suave', desm);
A.ok((await ev(`document.documentElement.getAttribute('data-theme')`)) === 'light', 'elegir «Claro» lo aplica en el acto');
await shot('tema-claro');
await atras();
const l1 = await ev(LISTA), s1b = await ev(SUB);
A.ok(!s1b.abierta && l1.abierta && fila(l1, 'tema').val === 'Claro', 'el atrás vuelve a la lista, y la fila ya dice «Claro»', { sub: s1b, tema: fila(l1, 'tema') });
await shot('lista-claro');

A.ok(await tocar('#ajroom-list [data-aj-row="letra"]'), 'se toca «Tamaño de texto»');
await sleep(350);
await tocar('#ajsub-body [data-fs-btn="xl"]'); await sleep(650);
const z = await ev(`(()=>{ const b=document.getElementById('ajsub-body'); return Math.round((b.currentCSSZoom||1)*100)/100; })()`);
A.ok(z === 1.4, 'CONTROL: con «Muy grande», la pantalla de Ajustes crece (zoom 1,4)', z);
const sxl = await ev(SUB);
A.ok(sxl.anchoDoc <= 360, 'y con «Muy grande» nada se sale de los 360 px', sxl.anchoDoc);
await atras();
const lxl = await ev(LISTA);
A.ok(fila(lxl, 'letra').val === 'Muy grande' && lxl.anchoDoc <= 360 && lxl.filas.every(f => f.h >= 44), 'la lista con «Muy grande»: dice «Muy grande», cabe y se toca', { val: fila(lxl, 'letra').val, ancho: lxl.anchoDoc, altos: lxl.filas.map(f => f.h) });
await shot('lista-muy-grande');
await ev(`setTextSize('normal')`); await sleep(500);

A.ok(await tocar('#ajroom-list [data-aj-row="sonido"]'), 'se toca «Sonido del entreno»');
await sleep(350);
const ss = await ev(`({vis:[...document.querySelectorAll('#ajsub-body .aj-sec')].filter(s=>!s.hidden).map(s=>s.dataset.aj), modos:document.querySelectorAll('#cn-sound .snd-mode').length, tonos:document.querySelectorAll('#cn-sound .snd-tone').length})`);
A.ok(JSON.stringify(ss.vis) === '["sonido"]' && ss.modos === 3 && ss.tonos === 11, 'abre «Sonido del entreno» con sus 3 modos y 11 tonos', ss);
await ev(`(()=>{ const b=[...document.querySelectorAll('#cn-sound .snd-mode')].find(x=>x.textContent.trim()==='Silencio'); b.click(); })()`);
await atras();
const l2 = await ev(LISTA);
A.ok(fila(l2, 'sonido').val === 'En silencio', 'al volver, la fila dice «En silencio»', fila(l2, 'sonido'));

// ── 4. El atrás cierra Ajustes y deja el Perfil (no se sale de la app) ──
await atras();
const tras = await ev(`({aj:document.getElementById('ajustes-room').classList.contains('on'), perfil:document.getElementById('cn-profile').classList.contains('on'), cliente:document.getElementById('s-client').classList.contains('on')})`);
A.ok(!tras.aj && tras.perfil && tras.cliente, 'el atrás cierra Ajustes y deja el Perfil', tras);
A.ok((await ev('AVINAV.layers||0')) === capas0, 'y cada atrás consumió su propia capa (vuelven a las de antes)');

// ── 4b. «Eliminar mi cuenta» abre su ventana ENCIMA de Ajustes (QA Lucas y Julián, v704) ──
// Con sesión real (AUTH_MODE) la sección «Cuenta y acceso» trae el botón. La ventana es un .mdbg (z 1000)
// y Ajustes una habitación (z 1400+): antes se abría DETRÁS y tocar el botón no mostraba nada.
await ev(`(()=>{ AUTH_MODE=true; AUTH_ROLE='client'; COACH_SELF=false; return true; })()`);
await tocar('#cn-aj-btn'); await sleep(350);
A.ok(fila(await ev(LISTA), 'cuenta').lbl === 'Cuenta y acceso', 'con sesión real sale «Cuenta y acceso»');
await tocar('#ajroom-list [data-aj-row="cuenta"]'); await sleep(450);
const del = await ev(`(()=>{ const b=[...document.querySelectorAll('#cn-danger-card button')].find(x=>/Eliminar mi cuenta/.test(x.textContent)); if(!b) return {boton:false};
  b.scrollIntoView({block:'center'}); b.click();
  const m=document.getElementById('m-delacct'), puntos=['delacct-confirm','delacct-go'].map(i=>{ const el=document.getElementById(i), r=el.getBoundingClientRect(), x=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return !!x&&(x===el||el.contains(x)); });
  const sobre=document.elementFromPoint(innerWidth/2, 30);
  return {boton:true, abierto:m.classList.contains('on'), puntos, z:getComputedStyle(m).zIndex, fondo:!!sobre&&!!sobre.closest('#m-delacct')}; })()`);
A.ok(del.boton && del.abierto && del.puntos.every(Boolean), '«Eliminar mi cuenta» abre su ventana ENCIMA de Ajustes y sus controles se tocan', del);
A.ok(del.fondo, 'y el velo de la ventana tapa Ajustes (arriba de la pantalla se toca la ventana, no Ajustes)', del);
await shot('eliminar-cuenta');
await atras();
const trasDel = await ev(`({modal:document.getElementById('m-delacct').classList.contains('on'), sub:document.getElementById('ajustes-sub-room').classList.contains('on'), lista:document.getElementById('ajustes-room').classList.contains('on')})`);
A.ok(!trasDel.modal && trasDel.sub && trasDel.lista, 'el atrás cierra primero esa ventana y deja Ajustes abierto debajo', trasDel);
await atras(); await atras();
const trasTodo = await ev(`({salas:document.querySelectorAll('.sroom.on').length, perfil:document.getElementById('cn-profile').classList.contains('on'), capas:AVINAV.layers||0})`);
A.ok(trasTodo.salas === 0 && trasTodo.perfil && trasTodo.capas === capas0, 'dos atrás más cierran el detalle y la lista, y se vuelve al Perfil sin capas de más', trasTodo);
await ev(`(()=>{ AUTH_MODE=false; return true; })()`);

// ── 5. «Cerrar sesión» deja en el login sin nada encima ──
await tocar('#cn-aj-btn'); await sleep(350);
await tocar('#ajroom-list [data-aj-row="salir"]'); await sleep(900);
const fuera = await ev(`({login:document.getElementById('s-login').classList.contains('on'), encima:document.querySelectorAll('.sroom.on').length, capas:(typeof AVINAV!=='undefined'?AVINAV.layers:-1)})`);
A.ok(fuera.login && fuera.encima === 0 && fuera.capas === 0, '«Salir» deja en el login, sin ninguna pantalla encima ni capas colgadas', fuera);

// ── 6. El coach: su menú dice «Ajustes» y llega a la misma pantalla ──
const coach = await ev(`(()=>{try{
  CUR.loggedAs='coach'; showScreen('s-coach');
  const item=[...document.querySelectorAll('.sbout')].find(x=>/openSettings/.test(x.getAttribute('onclick')||''));
  const txt=item?item.textContent.trim():''; if(item) item.click();
  return {ok:true, txt, nombre:getCoachName()};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`);
await sleep(450);
A.ok(coach.ok && /Ajustes/.test(coach.txt) && !/Configuración/.test(coach.txt), 'en el menú del coach la entrada se llama «Ajustes»', coach);
const lc = await ev(LISTA);
A.ok(lc.abierta && fila(lc, 'coach').lbl === 'Tu cuenta de coach' && fila(lc, 'coach').val === coach.nombre, 'abre Ajustes con «Tu cuenta de coach» y su nombre', fila(lc, 'coach'));
A.ok(!fila(lc, 'plan').lbl && !fila(lc, 'cuenta').lbl && JSON.stringify(lc.grupos) === '["Tu cuenta","Entreno","Pantalla","Sesión"]', 'el coach no ve «Mi plan» ni «Cuenta y acceso» de un asesorado', lc.grupos);
await tocar('#ajroom-list [data-aj-row="coach"]'); await sleep(400);
const sc = await ev(`(()=>{ const g=document.querySelector('#ajsub-body [data-aj="coach"] .aj-guardar'); g.scrollIntoView({block:'center'}); const r=g.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {vis:[...document.querySelectorAll('#ajsub-body .aj-sec')].filter(s=>!s.hidden).map(s=>s.dataset.aj), nombre:document.getElementById('st-name').value, guardar:!!el&&(el===g||g.contains(el)), anchoDoc:document.documentElement.scrollWidth}; })()`);
A.ok(JSON.stringify(sc.vis) === '["coach"]' && sc.nombre === coach.nombre, 'su cuenta abre con sus datos ya cargados', sc);
// Estructura: un <div> sin cerrar al mudar los campos metió «Guardar» dentro del recuadro (v704).
const est = await ev(`({guardarFuera:!document.querySelector('#ajsub-body [data-aj="coach"] .aj-guardar').closest('.aj-panel'),
  secciones:[...document.querySelectorAll('.aj-sec')].every(s=>s.parentElement&&s.parentElement.id==='ajsub-body'),
  habitacionesSueltas:!document.querySelector('#ajustes-room .sroom, #ajustes-sub-room .sroom')})`);
A.ok(est.guardarFuera && est.secciones && est.habitacionesSueltas, 'el marcado de Ajustes está bien cerrado («Guardar» fuera del recuadro, cada sección en su sitio)', est);
A.ok(sc.guardar && sc.anchoDoc <= 360, '«Guardar cambios» se ve y se puede tocar, sin salirse de los 360 px', sc);
// Cada campo con su etiqueta a la vista, y el mismo espacio entre campos dentro de cada grupo (QA: el
// formulario heredado del modal viejo iba a 8 · 34 · 122 px, con las contraseñas sin etiqueta).
const form = await ev(`(()=>{ const sec=document.querySelector('#ajsub-body [data-aj="coach"]');
  const campos=[...sec.querySelectorAll('input')];
  const etiquetas=campos.map(c=>{ const l=sec.querySelector('label[for="'+c.id+'"]'); return !!l&&l.getBoundingClientRect().height>0&&l.textContent.trim().length>2; });
  const huecos=[]; [...sec.querySelectorAll('.aj-panel')].forEach(p=>{ const cs=[...p.querySelectorAll('input')]; for(let i=1;i<cs.length;i++) huecos.push(Math.round(cs[i].getBoundingClientRect().top-cs[i-1].getBoundingClientRect().bottom)); });
  return {n:campos.length, etiquetas, huecos, distintos:[...new Set(huecos)].length, grupos:[...sec.querySelectorAll('.aj-grp')].map(g=>g.textContent.trim())}; })()`);
A.ok(form.n === 7 && form.etiquetas.every(Boolean), 'los 7 campos del coach tienen su etiqueta a la vista', form);
A.ok(form.huecos.length >= 4 && form.distintos === 1, 'dentro de cada grupo, el mismo espacio entre campos', form.huecos);
A.ok(JSON.stringify(form.grupos) === '["Tus datos","Cobros","Contraseña"]', 'tres grupos: Tus datos · Cobros · Contraseña', form.grupos);
await shot('coach-cuenta');

// ── 7. La sesión se cierra con un ajuste abierto (como cuando el servidor la cierra: `_sesionCerrada`
//       llama a logout() directo, sin pasar por el botón de Ajustes) ──
await ev(`logout()`); await sleep(700);
const cerrada = await ev(`({login:document.getElementById('s-login').classList.contains('on'), encima:document.querySelectorAll('.sroom.on').length, capas:AVINAV.layers||0})`);
A.ok(cerrada.login && cerrada.encima === 0 && cerrada.capas === 0, 'cerrar la sesión con un ajuste abierto no deja ninguna pantalla tapando el login ni capas colgadas', cerrada);

salir(A, { chrome, srv, out: SHOTS });
