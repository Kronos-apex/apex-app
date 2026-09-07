// _verify-chat-archivo-lucas.mjs — QA funcional de Lucas sobre v584 (chat-archivo).
// NO repite lo que ya mide `_verify-chat-archivo.mjs` (10/10, sabotaje en chatViewMode).
// Ataca: pliegue/scroll a 360 y 393px, re-render, datos extremos, badge, poll con mensaje nuevo.
// Puertos DISTINTOS al harness de Camila (8829/9349) para no chocar con el rate limit de login.
//
//   node scripts/e2e/_verify-chat-archivo-lucas.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';

const PORT = 8831, DP = 9351, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-chatarch-lucas-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=393,852', APP]);
const cerrar = () => { try { chrome.kill(); } catch {} try { srv.kill(); } catch {} };
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
if (!dentro) { console.log('❌ EL LOGIN NO ENTRÓ (rate limit ~2-3 min entre corridas)'); cerrar(); process.exit(1); }
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await waitFor(`!!document.querySelector('.cntab[onclick*="cn-messages"]')`, 20000);

let checks = 0, ok = 0;
const A = (cond, label) => { checks++; if (cond) { ok++; console.log('✅ ' + label); } else { console.log('❌ ' + label); } };

// ── Montaje: cliente 'libre' con 42 mensajes (incluye uno de 2000 chars y uno SIN text) ──
const LARGO = 'X'.repeat(2000);
await ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c) return 'sin cliente';
  c.tier='libre';
  const msgs=[];
  for(let i=0;i<40;i++){
    msgs.push({from:i%2===0?'coach':'client',text:'Mensaje número '+i+' de la conversación de prueba',date:new Date(Date.now()-(40-i)*3600000).toISOString()});
  }
  msgs.push({from:'coach',text:${JSON.stringify(LARGO)},date:new Date(Date.now()-1800000).toISOString()});
  msgs.push({from:'client',date:new Date().toISOString()}); // sin 'text'
  DB.msgs[CUR.clientId]=msgs;
  window._msgsCount=msgs.length;
  return 'ok';
})()`);

// Abrir la pestaña de Mensajes como lo haría la persona (tab + markMsgsRead)
await ev(`(()=>{const b=document.querySelector('.cntab[onclick*="cn-messages"]');if(b){cnTab('cn-messages',b);markMsgsRead();}})()`);
await sleep(500);

// ═══ 1. PLIEGUE Y SCROLL a 393px ═══
async function medirPliegue(w,h,label){
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: true });
  await sleep(200);
  return ev(`(()=>{
    const hilo=document.getElementById('cn-msg-thread');
    const card=hilo?hilo.closest('.card'):null;
    const panel=document.getElementById('cn-messages');
    if(!hilo) return {err:'no hilo'};
    const rHilo=hilo.getBoundingClientRect();
    const rPanel=panel.getBoundingClientRect();
    // Empuja el scroll al fondo de verdad (medir la CONDUCTA, no una propiedad geométrica sola)
    hilo.scrollTop=hilo.scrollHeight;
    const bajoAntes=hilo.scrollTop;
    const puedeBajar = hilo.scrollHeight - hilo.clientHeight;
    // ¿el pie del candado (última tarjeta con 🔒) queda dentro del área VISIBLE del scroller?
    const kids=[...hilo.children];
    const pie=kids[kids.length-1];
    const rPie=pie?pie.getBoundingClientRect():null;
    const pieDentroDeViewport = rPie ? (rPie.top < window.innerHeight && rPie.bottom > 0) : false;
    const pieDentroDelScroller = rPie ? (rPie.top >= rHilo.top-1 && rPie.bottom <= rHilo.bottom+1) : false;
    return {
      viewport:[window.innerWidth,window.innerHeight],
      hiloRect:[Math.round(rHilo.width),Math.round(rHilo.height)],
      hiloScrollHeight:hilo.scrollHeight, hiloClientHeight:hilo.clientHeight,
      puedeScrollear: puedeBajar>2,
      scrollTopTrasEmpujar: bajoAntes,
      llegoAlFondo: Math.abs(bajoAntes - puedeBajar) < 2,
      pieTexto: pie ? (pie.innerText||'').slice(0,40) : null,
      pieDentroDeViewport, pieDentroDelScroller,
      numHijos: kids.length
    };
  })()`);
}
const m393 = await medirPliegue(393,852,'393px');
console.log('  393px:', JSON.stringify(m393));
A(m393 && !m393.err && m393.puedeScrollear && m393.llegoAlFondo, '393px: el hilo con 42 mensajes SÍ scrollea y llega al fondo real');
A(m393 && m393.pieDentroDeViewport, '393px: el pie del candado queda DENTRO del viewport tras scrollear al fondo');
A(m393 && /Aquí quedó tu conversación/.test(m393.pieTexto||''), '393px: el último hijo del hilo es el pie del candado (no quedó cortado antes)');

const m360 = await medirPliegue(360,640,'360px');
console.log('  360px:', JSON.stringify(m360));
A(m360 && !m360.err && m360.puedeScrollear && m360.llegoAlFondo, '360px: el hilo SÍ scrollea y llega al fondo real');
A(m360 && m360.pieDentroDeViewport, '360px: el pie del candado queda DENTRO del viewport tras scrollear al fondo');

// ¿#cn-msg-thread tiene max-height/height fijo que recorte por debajo del contenido real?
const geom = await ev(`(()=>{
  const hilo=document.getElementById('cn-msg-thread');
  const cs=getComputedStyle(hilo);
  return {maxHeight:cs.maxHeight, height:cs.height, overflowY:cs.overflowY, flex:cs.flex};
})()`);
console.log('  geometría CSS de #cn-msg-thread:', JSON.stringify(geom));
A(geom && (geom.maxHeight==='none') , '#cn-msg-thread NO declara max-height fijo (crece con flex + overflow-y:auto)');

await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
await sleep(150);

// ═══ 2. RE-RENDER (llamar renderClientMsgs 2 veces seguidas): ¿se duplica el pie? ═══
// Ojo: el pie de premiumLockHTML anida VARIOS divs (icono/título/desc/botón) dentro de
// pie.style.cssText='margin-top:12px' — contar por querySelectorAll('div') cuenta la anidación,
// no la duplicación. Se cuenta por HIJOS DIRECTOS de #cn-msg-thread (donde se hace con.appendChild(pie)).
const doble = await ev(`(()=>{
  renderClientMsgs(CUR.clientId);
  renderClientMsgs(CUR.clientId);
  const hilo=document.getElementById('cn-msg-thread');
  const piesConTexto=[...hilo.children].filter(d=>/Aquí quedó tu conversación/.test(d.textContent||'')).length;
  const burbujas=hilo.querySelectorAll('.mb').length;
  return {piesConTexto, burbujas, esperado: window._msgsCount};
})()`);
console.log('  doble render:', JSON.stringify(doble));
A(doble && doble.piesConTexto===1, 'Re-render x2: el pie del candado NO se duplica (queda exactamente 1)');
A(doble && doble.burbujas===doble.esperado, 'Re-render x2: las burbujas no se duplican (42 mensajes = 42 burbujas)');

// ═══ 3. DATOS EXTREMOS: mensaje sin text, mensaje de 2000 chars ═══
const extremos = await ev(`(()=>{
  const hilo=document.getElementById('cn-msg-thread');
  const burbujas=[...hilo.querySelectorAll('.mb')];
  const ultima=burbujas[burbujas.length-1]; // el 'sin text' es el último mensaje
  const larga=burbujas[burbujas.length-2]; // el de 2000 chars (palabra pegada, sin espacios), penúltimo
  return {
    sinTextRompe: ultima ? (ultima.textContent==='undefined') : null,
    sinTextTexto: ultima ? JSON.stringify(ultima.textContent) : null,
    largaLen: larga ? larga.textContent.length : 0,
    largaOverflowX: larga ? (larga.scrollWidth > larga.parentElement.clientWidth + 4) : null,
    hiloOverflowXTrasLarga: (hilo.scrollWidth > hilo.clientWidth + 4)
  };
})()`);
console.log('  extremos (palabra pegada de 2000):', JSON.stringify(extremos));
A(extremos && extremos.sinTextTexto==='""', 'Mensaje sin `text`: NO pinta "undefined", queda vacío ("")');
A(extremos && extremos.largaLen===2000, 'Mensaje de 2000 chars: se pinta completo (no se trunca)');
A(extremos && extremos.hiloOverflowXTrasLarga===false, 'Mensaje de 2000 chars pegados: el HILO (el que scrollea la pantalla) no se ensancha horizontalmente');

// Variante realista: 2000 caracteres de prosa CON espacios (como escribiría alguien de verdad)
const prosa = await ev(`(()=>{
  const hilo=document.getElementById('cn-msg-thread');
  const frase='Hola coach, quería contarte que hoy me sentí muy bien en el entrenamiento y quiero preguntarte si puedo subir el peso en la próxima sesión porque ya no se me hace tan pesado como antes. ';
  const texto=frase.repeat(Math.ceil(2000/frase.length)).slice(0,2000);
  DB.msgs[CUR.clientId].push({from:'coach',text:texto,date:new Date().toISOString()});
  renderClientMsgs(CUR.clientId);
  const burbujas=[...hilo.querySelectorAll('.mb')];
  const b=burbujas[burbujas.length-1];
  return {
    len:b.textContent.length,
    overflowX: b.scrollWidth > b.parentElement.clientWidth + 4,
    maxWidthRespetado: b.getBoundingClientRect().width <= hilo.clientWidth*0.8+2
  };
})()`);
console.log('  extremos (prosa de 2000 con espacios):', JSON.stringify(prosa));
A(prosa && prosa.overflowX===false && prosa.maxWidthRespetado, 'Mensaje de 2000 chars de PROSA normal: envuelve bien dentro del 78% de ancho (max-width de .mb)');

// ═══ 4. IDA Y VUELTA DE PESTAÑA (colapsado / re-render por navegación) ═══
const idaVuelta = await ev(`(()=>{
  const btnHoy=document.querySelector('.cntab[onclick*="cn-today"]');
  const btnMsg=document.querySelector('.cntab[onclick*="cn-messages"]');
  if(btnHoy)cnTab('cn-today',btnHoy);
  if(btnMsg)cnTab('cn-messages',btnMsg);
  const hilo=document.getElementById('cn-msg-thread');
  const burbujas=hilo.querySelectorAll('.mb').length;
  const pies=[...hilo.children].filter(d=>/Aquí quedó tu conversación/.test(d.textContent||'')).length;
  return {burbujas, pies, esperado: window._msgsCount};
})()`);
console.log('  ida y vuelta de pestaña:', JSON.stringify(idaVuelta));
A(idaVuelta && idaVuelta.burbujas===idaVuelta.esperado && idaVuelta.pies===1, 'Salir a Hoy y volver a Mensajes: el hilo se repinta igual, sin duplicar el pie');

// ═══ 5. BOTÓN ATRÁS (popstate) no rompe la pantalla ═══
const antesDeAtras = await ev(`(()=>{return {tieneClienteId:!!CUR.clientId, hilo:!!document.getElementById('cn-msg-thread'), sClient: getComputedStyle(document.getElementById('s-client')).display};})()`);
await ev(`history.back()`);
await sleep(500);
const despuesDeAtras = await ev(`(()=>{return {tieneClienteId:!!CUR.clientId, hilo:!!document.getElementById('cn-msg-thread'), sClient: getComputedStyle(document.getElementById('s-client')).display};})()`);
console.log('  atrás:', JSON.stringify({antesDeAtras, despuesDeAtras}));
A(despuesDeAtras && despuesDeAtras.sClient!=='none' && despuesDeAtras.tieneClienteId, 'Botón atrás: la app sigue viva (no cierra sesión ni se sale de #s-client)');

// volver a mensajes para lo que sigue
await ev(`(()=>{const b=document.querySelector('.cntab[onclick*="cn-messages"]');if(b)cnTab('cn-messages',b);})()`);
await sleep(300);

// ═══ 6. BADGE (msg-badge) para 'libre' con archivo legible ═══
const badge1 = await ev(`(()=>{
  // Forzar un mensaje de coach MÁS NUEVO que el último 'leído' para generar no-leído
  DB.msgs[CUR.clientId].push({from:'coach',text:'Mensaje nuevo sin leer',date:new Date(Date.now()+5000).toISOString()});
  localStorage.removeItem('msg_read_'+CUR.clientId);
  updateMsgBadge(CUR.clientId);
  const b=document.getElementById('msg-badge');
  return {count:b.getAttribute('data-count')};
})()`);
console.log('  badge antes de abrir:', JSON.stringify(badge1));
A(badge1 && badge1.count && Number(badge1.count.replace('+',''))>0, 'Badge: con mensajes nuevos del coach y tier libre, el número SÍ aparece');

const badge2 = await ev(`(()=>{
  const btn=document.querySelector('.cntab[onclick*="cn-messages"]');
  btn.onclick=null; // evitar el atributo inline duplicado, invocar directo
  cnTab('cn-messages',btn); markMsgsRead();
  const b=document.getElementById('msg-badge');
  return {count:b.getAttribute('data-count')};
})()`);
console.log('  badge tras abrir Mensajes:', JSON.stringify(badge2));
A(badge2 && badge2.count===null, 'Badge: al abrir Mensajes (tier libre, modo archivo) el número SÍ baja a cero');

// ═══ 7. LLEGA UN MENSAJE NUEVO CON LA PANTALLA ABIERTA (simula lo que hace pollMessages) ═══
const nuevoMientrasAbierto = await ev(`(()=>{
  const antes=document.getElementById('cn-msg-thread').querySelectorAll('.mb').length;
  DB.msgs[CUR.clientId].push({from:'coach',text:'LLEGÓ-EN-VIVO-'+Date.now(),date:new Date().toISOString()});
  // Esto es exactamente lo que hace _pollAuthClient al detectar mensajes nuevos:
  renderClientMsgs(CUR.clientId);
  updateMsgBadge(CUR.clientId);
  const hilo=document.getElementById('cn-msg-thread');
  const despues=hilo.querySelectorAll('.mb').length;
  const pies=[...hilo.children].filter(d=>/Aquí quedó tu conversación/.test(d.textContent||'')).length;
  const seVeElNuevo=/LLEGÓ-EN-VIVO-/.test(hilo.innerText||'');
  return {antes,despues,pies,seVeElNuevo};
})()`);
console.log('  mensaje nuevo en vivo (modo archivo):', JSON.stringify(nuevoMientrasAbierto));
A(nuevoMientrasAbierto && nuevoMientrasAbierto.despues===nuevoMientrasAbierto.antes+1, 'Mensaje nuevo en vivo: se agrega UNA burbuja más (no rompe ni duplica el resto)');
A(nuevoMientrasAbierto && nuevoMientrasAbierto.pies===1, 'Mensaje nuevo en vivo: el pie del candado sigue existiendo UNA sola vez, al final');
A(nuevoMientrasAbierto && nuevoMientrasAbierto.seVeElNuevo, 'Mensaje nuevo en vivo: el texto del mensaje nuevo SÍ se ve pintado');

console.log(`\n${ok}/${checks} en verde`);
cerrar();
process.exit(ok === checks ? 0 : 1);
