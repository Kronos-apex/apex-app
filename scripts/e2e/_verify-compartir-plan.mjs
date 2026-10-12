// Harness de v706 — EL COACH COMPARTE EL PLAN DE ALIMENTACIÓN (pedido del PO, 10-oct-2026).
// Los tres caminos que eligió: WhatsApp a ESA persona, una imagen del plan con la marca y un aviso
// dentro de la app. Sin login: monta el fixture local (como _verify-menores-coach) y ESPÍA lo que
// sale (window.open, shareCanvasImage, svNow, pushToClient) — nada llega a nadie.
//   · la ficha pinta las MISMAS cifras que ve la persona (control: una menor cuyo plan escrito no
//     cuadra con lo que se le sirve);
//   · WhatsApp va al número normalizado de esa persona y le habla a ella;
//   · la imagen mide 1080×1350 y el texto no pisa el pie, aun con notas larguísimas;
//   · el aviso sale con su marca SOLO en ese mensaje, el coach ve la nota y la persona el botón;
//   · donde el aviso no llegaría (AVI FREE, plan sin coach) no se ofrece y se dice por qué.
//   node scripts/e2e/_verify-compartir-plan.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afirmador, salir } from './_afirma.mjs';

const A = afirmador('compartir el plan de alimentación');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 8893, DP = 9403, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: ROOT });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/compartirplan-' + Date.now(), '--no-first-run', '--window-size=360,800', APP]);
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
A.ok(await waitFor(`typeof window._aviUpdateBusy!=='undefined' && typeof openDetail==='function' && typeof nutShareToClient==='function' && typeof _paintMsgThread==='function'`), 'la app terminó de arrancar');
A.ok(await waitFor(`(()=>{const l=document.getElementById('avi-loading');return !l||getComputedStyle(l).display==='none'||getComputedStyle(l).opacity==='0';})()`, 20000), 'la pantalla de carga ya se fue');

// ── Montaje: cuatro personas y sus planes. Los espías se ponen ANTES de tocar nada. ──
const NOTAS = 'Desayuno con huevo y arepa, almuerzo con arroz, frijol y carne magra, cena liviana con verduras. '.repeat(9);
const m = await ev(`(()=>{try{
  window._spy={open:[],img:[],push:[],room:[]};
  window.open=(u)=>{_spy.open.push(String(u));return null;};
  window.shareCanvasImage=(cv)=>{_spy.img.push({w:cv.width,h:cv.height,y:cv._ultimaY});};
  window.svNow=async()=>true; window.pushToClient=(id,t,b,o)=>{_spy.push.push({id,t,b});};
  DB.clients=[
    {id:'c1',name:'Andrea Ruiz',phone:'300 123 4567',goal:'Perder grasa',level:'Intermedio',days:4,age:31,sex:'F',weight:68,height:163,activityFactor:1.55,tier:'premium',payments:[],routines:[]},
    {id:'c2',name:'Menor Prueba',goal:'Salud general',level:'Principiante',days:3,age:15,sex:'F',weight:52,height:161,activityFactor:1.375,tier:'premium',payments:[],routines:[]},
    {id:'c3',name:'Libre Prueba',phone:'3109876543',goal:'Salud general',level:'Principiante',days:3,age:30,sex:'M',weight:80,height:175,activityFactor:1.2,tier:'libre',payments:[],routines:[]},
    {id:'c4',name:'App Prueba',phone:'3109876543',goal:'Salud general',level:'Principiante',days:3,age:30,sex:'M',weight:80,height:175,activityFactor:1.2,tier:'app',payments:[],routines:[]}];
  DB.nutrition={
    c1:{goal:'definicion',kcal:1900,prot:130,carbs:190,fat:60,water:9,meals:5,plan:${JSON.stringify(NOTAS)},avoid:'Gaseosas, jugos de caja, fritos, salsas de paquete, dulces y paquetes del mecato de la tienda de la esquina.'},
    c2:{kcal:1775,prot:94,carbs:244,fat:47,meals:4,plan:'Tres comidas y una merienda.'},
    c3:{kcal:2200,prot:150,carbs:240,fat:70,plan:'Plan de prueba.'},
    c4:{kcal:2200,prot:150,carbs:240,fat:70,plan:'Plan de prueba.'}};
  DB.msgs={}; DB.history={}; DB.bodyweight={}; CUR.loggedAs='coach';
  showScreen('s-coach'); return {ok:true};
}catch(e){return {ok:false,err:String(e&&e.message)}}})()`);
A.ok(m && m.ok, 'montaje: cuatro asesorados con su plan y los espías puestos', m);

// ── 1. La ficha dice lo que VE la persona (control: una menor cuyo plan escrito no cuadra) ──
await ev(`openDetail('c2'); detailTab('comida')`); await sleep(700);
const f2 = await ev(`(()=>{ const c=DB.clients.find(x=>x.id==='c2'), nut=DB.nutrition.c2; const b=nutBaseFor(c,nut,_nutPesoDe(c));
  const con=document.getElementById('d-nut-preview'); const t=con.innerText;
  return {derivado:b.kcalObj, escrito:nut.kcal, texto:t.slice(0,160), dice:t.indexOf(fmtMiles(b.kcalObj))>=0, diceEscrito:t.indexOf(fmtMiles(nut.kcal))>=0, ve:/lo que ve menor/i.test(t)}; })()`);
A.ok(f2.derivado && f2.derivado !== f2.escrito, 'CONTROL: en la menor, lo escrito y lo que se le sirve NO coinciden (si no, el siguiente check no prueba nada)', f2);
A.ok(f2.dice && !f2.diceEscrito && f2.ve, 'la ficha pinta las calorías que ve la persona y lo dice («Lo que ve…»), no las escritas', f2);

// ── 2. Los tres botones se ven y se tocan (360 px) ──
await ev(`openDetail('c1'); detailTab('comida')`); await sleep(700);
const bt = await ev(`(()=>{ const con=document.getElementById('d-nut-preview'); const bs=[...con.querySelectorAll('.nut-share-b button')];
  return bs.map(b=>{ b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {t:b.textContent.trim(), alto:Math.round(r.height), toca:el===b||b.contains(el), dentro:r.left>=0&&r.right<=innerWidth}; }); })()`);
A.ok(Array.isArray(bt) && bt.length === 3, 'con plan y coach: WhatsApp, imagen y aviso en la app', bt);
A.ok(bt.every(b => b.toca && b.dentro && b.alto >= 36), 'los tres se ven enteros a 360 px, miden ≥36 px y reciben el toque', bt);
const ancho = await ev(`document.documentElement.scrollWidth`);
A.ok(ancho <= 360, 'la ficha no se arrastra de lado', ancho);

// ── 3. WhatsApp a ESA persona ──
await ev(`[...document.querySelectorAll('#d-nut-preview .nut-share-b button')].find(b=>/WhatsApp/.test(b.textContent)).click()`); await sleep(200);
const wa = await ev(`(()=>{ const u=_spy.open[_spy.open.length-1]||''; const c=DB.clients[0], k=_nutPlanCifras(c,DB.nutrition.c1);
  const txt=decodeURIComponent((u.split('?text=')[1]||'')); return {u:u.slice(0,40), num:u.indexOf('https://wa.me/573001234567?text=')===0, hola:/^Hola Andrea/.test(txt), kcal:txt.indexOf(fmtMiles(k.kcal)+' kcal')>=0, tu:/TU PLAN/.test(txt)}; })()`);
A.ok(wa.num, 'WhatsApp va al celular de la persona, con indicativo (sin waPhone, wa.me sale roto)', wa);
A.ok(wa.hola && wa.tu && wa.kcal, 'el mensaje la saluda, dice «TU PLAN» y trae las calorías que ella ve', wa);

// ── 4. La imagen: 1080×1350 y el texto no pisa el pie, con notas larguísimas ──
await ev(`[...document.querySelectorAll('#d-nut-preview .nut-share-b button')].find(b=>/imagen/i.test(b.textContent)).click()`); await sleep(300);
const im = await ev(`_spy.img[_spy.img.length-1]||null`);
A.ok(im && im.w === 1080 && im.h === 1350, 'la imagen mide 1080×1350 (lo que WhatsApp e Instagram muestran entero)', im);
// La última línea base deja aire sobre la raya del pie (y=1218): con 30 px de aire la letra no la toca.
A.ok(im && im.y > 900 && im.y + 30 <= 1218, 'con notas larguísimas el texto termina ANTES del pie, con aire (y no quedó vacío)', im);
// Regla de v624: con un plan corto el aire que sobra se parte por la mitad, no se deja todo abajo; y la
// tarjeta llena casi no se mueve (su CONTROL: si el reparto se aplicara a todo, la llena también bajaría).
const aire = await ev(`(()=>{ const c=DB.clients.find(x=>x.id==='c1');
  const corto=nutPlanCanvas(c,{kcal:2200,prot:150,carbs:240,fat:70,meals:4,plan:'Tres comidas fuertes y una merienda con fruta.'});
  const largo=nutPlanCanvas(c,DB.nutrition.c1);
  return {dyCorto:corto._dy, abajoCorto:1180-corto._ultimaY, dyLargo:largo._dy}; })()`);
A.ok(aire.dyCorto > 50 && Math.abs(aire.abajoCorto - aire.dyCorto) <= 1, 'plan corto: el aire se reparte arriba y abajo (no 280 px vacíos al fondo)', aire);
A.ok(aire.dyLargo <= 20, 'CONTROL: la tarjeta llena casi no se mueve', aire);

// ── 5. El aviso: sale por el chat con su marca SOLO en ese mensaje ──
await ev(`[...document.querySelectorAll('#d-nut-preview .nut-share-b button')].find(b=>/Avisarle/.test(b.textContent)).click()`); await sleep(600);
const av = await ev(`(()=>{ const ms=DB.msgs.c1||[]; const u=ms[ms.length-1]||{}; const ch=document.getElementById('coach-chat');
  return {abierto:!!(ch&&ch.classList.contains('on')), n:ms.length, act:u.act||null, texto:u.text||'', nota:document.querySelectorAll('#cchat-thread .mact-n').length, push:_spy.push.length}; })()`);
A.ok(av.abierto && av.n === 1 && av.act === 'nutplan', 'el aviso abre el chat y sale como mensaje con su marca', av);
A.ok(av.nota === 1, 'el coach ve en su hilo qué botón le aparece a la persona', av);
A.ok(av.push >= 1, 'y le llega la notificación DESPUÉS de guardarse (misma ruta del chat)', av);
await ev(`(async()=>{ const ta=document.getElementById('cchat-in'); ta.value='¿Cómo vas con el plan?'; await sendCoachChatMsg(); })()`); await sleep(300);
const sig = await ev(`(()=>{ const ms=DB.msgs.c1||[]; return {n:ms.length, act:(ms[ms.length-1]||{}).act||null, notas:document.querySelectorAll('#cchat-thread .mact-n').length}; })()`);
A.ok(sig.n === 2 && sig.act === null && sig.notas === 1, 'el mensaje siguiente sale SIN marca (no se pega al próximo)', sig);
await ev(`closeCoachChat()`); await sleep(200);

// ── 6. Lo que ve la PERSONA: el botón bajo el aviso, y solo ahí ──
const cl = await ev(`(()=>{ CUR.clientId='c1'; CUR.loggedAs='client'; window.openNutritionRoom=(id)=>{_spy.room.push(id);};
  showScreen('s-client'); if(typeof cnTab==='function'){const b=document.querySelector('[onclick*="cn-messages"]'); cnTab('cn-messages',b);} renderClientMsgs('c1');
  const th=document.getElementById('cn-msg-thread'); const bs=[...th.querySelectorAll('button.mact')];
  const b=bs[0]; if(b) b.scrollIntoView({block:'center'}); const r=b?b.getBoundingClientRect():null; const el=r?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;
  return {botones:bs.length, texto:b?b.textContent:'', toca:!!b&&(el===b||b.contains(el)), alto:r?Math.round(r.height):0}; })()`);
A.ok(cl.botones === 1 && /Ver mi plan/.test(cl.texto), 'la persona ve UN botón «Ver mi plan de alimentación», bajo el aviso', cl);
A.ok(cl.toca && cl.alto >= 36, 'el botón se ve y recibe el toque', cl);
await ev(`document.querySelector('#cn-msg-thread button.mact').click()`); await sleep(200);
const rm = await ev(`_spy.room.slice()`);
A.ok(Array.isArray(rm) && rm[0] === 'c1', 'tocarlo abre SU plan de alimentación', rm);
const txt = await ev(`(DB.msgs.c1||[]).find(m=>m.act==='nutplan').text`);
A.ok(/Mi plan nutricional/.test(txt) && !/aquí abajo/.test(txt), 'el texto del aviso se entiende también en la notificación (dice dónde está, no «aquí abajo»)', txt);
// QA de v706 (Lucas): con «Muy grande» el rótulo del botón se salía del botón (white-space:nowrap).
await ev(`setTextSize('xl')`); await sleep(700); await ev(`renderClientMsgs('c1')`); await sleep(200);
const xl = await ev(`(()=>{ const b=document.querySelector('#cn-msg-thread button.mact'); const th=document.getElementById('cn-msg-thread');
  const z=(document.querySelector('#cn-messages')||th).currentCSSZoom||1; if(!b) return {z, b:false};
  return {z:Math.round(z*100)/100, b:true, cabe:b.scrollWidth<=b.clientWidth+1, dentro:b.getBoundingClientRect().right<=th.getBoundingClientRect().right+1}; })()`);
A.ok(xl.z > 1.3, 'CONTROL: con «Muy grande» el chat de la persona crece', xl);
A.ok(xl.b && xl.cabe && xl.dentro, 'con «Muy grande» el rótulo del botón cabe en el botón y el botón en el hilo', xl);
await ev(`setTextSize('normal')`); await sleep(300);
// QA de v706 (Lucas): en AVI FREE, el aviso viejo del ARCHIVO del chat abría el plan completo.
const arch = await ev(`(()=>{ const c=DB.clients.find(x=>x.id==='c1'); const antes=c.tier; c.tier='libre'; _spy.room.length=0; renderClientMsgs('c1');
  const th=document.getElementById('cn-msg-thread'); const r={vista:chatViewMode(c,DB.msgs.c1), botones:th.querySelectorAll('button.mact').length, nota:(th.querySelector('.mact-n')||{}).textContent||''};
  c.tier=antes; return r; })()`);
A.ok(arch.vista === 'archive', 'CONTROL: con AVI FREE el chat queda como archivo', arch);
A.ok(arch.botones === 0 && /no aparece en la app/.test(arch.nota), 'con la comida bloqueada el archivo no ofrece abrir el plan y dice por qué', arch);

// ── 7. Donde el aviso no llegaría, no se ofrece y se dice por qué ──
await ev(`CUR.loggedAs='coach'; showScreen('s-coach'); openDetail('c3'); detailTab('comida')`); await sleep(600);
const l3 = await ev(`(()=>{ const con=document.getElementById('d-nut-preview'); return {aviso:!!con.querySelector('button[onclick*="nutNotifyInApp"]'), wa:!!con.querySelector('button[onclick*="nutShareToClient"]'), nota:(con.querySelector('.nut-share-n')||{}).textContent||''}; })()`);
A.ok(!l3.aviso && l3.wa && /no le muestra la comida/.test(l3.nota), 'AVI FREE: sin aviso en la app (la llevaría a un candado), con WhatsApp y el porqué', l3);
const ve3 = await ev(`(document.querySelector('#d-nut-preview .nut-ve')||{}).textContent||''`);
A.ok(/hoy no le aparece/.test(ve3) && !/^Lo que ve/.test(ve3), 'AVI FREE: la ficha no dice «Lo que ve» de alguien que hoy no lo ve', ve3);
await ev(`openDetail('c4'); detailTab('comida')`); await sleep(600);
const l4 = await ev(`(()=>{ const con=document.getElementById('d-nut-preview'); const antes=(DB.msgs.c4||[]).length; nutNotifyInApp('c4');
  return {aviso:!!con.querySelector('button[onclick*="nutNotifyInApp"]'), nota:(con.querySelector('.nut-share-n')||{}).textContent||'', escribio:(DB.msgs.c4||[]).length-antes}; })()`);
A.ok(!l4.aviso && /no incluye chat/.test(l4.nota), 'plan sin coach: sin aviso (se guardaría y no le llegaría) y se dice por qué', l4);
A.ok(l4.escribio === 0, 'y la acción tampoco escribe nada si la llaman igual', l4);

salir(A, { chrome, srv });
