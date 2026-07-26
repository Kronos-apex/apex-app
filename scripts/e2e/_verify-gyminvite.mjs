// _verify-gyminvite.mjs — ADOPCIÓN A3: el COACH invita a su gym por WhatsApp (2026-07-25).
// A1 y A2 trabajan sobre quien ya abre la app; el canal que de verdad mueve al gym es Camilo
// escribiéndoles (lección de v364: el chat interno solo alcanza a quien ya entra). En el modal
// «Comunidad de mi gym» cada asesorado muestra si YA activó su perfil o un botón «Invitar» que
// abre WhatsApp con el mensaje prellenado — que el coach revisa y envía él.
// Sin login ni red: cliente Supabase FALSO que graba las llamadas. Aserciones duras (exit 1).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8801, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9311', '--user-data-dir=' + process.env.TEMP + '/gyminv-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9311/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof openGymMgr==='function' && typeof communityInviteMsg==='function' && typeof communityGymAdoption==='function' && !document.getElementById('avi-loading')`);
await sleep(1500);

const COACH = '00000000-0000-0000-0000-0000000000c0';
// 4 asesorados: 2 en el gym con perfil, 1 en el gym SIN perfil (a ese se invita), 1 FUERA del gym.
// `__gymRows`/`__profRows` son lo que devuelve el cliente falso por tabla.
const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  showScreen('s-coach');
  DB.clients=[
    {id:'u-sam',name:'Samuel Cifuentes',phone:'3001234567'},
    {id:'u-nat',name:'Natalia Martinez',phone:'+57 310 000 1111'},
    {id:'u-luz',name:'Luz Rodríguez',phone:'3009998877'},
    {id:'u-out',name:'<img src=x onerror=window.__xss=1>',phone:''},
    {id:'u-kat',name:'Kathe Beltran',phone:'3005556677'}
  ];
  window.__xss=0; window.__opened=null; window.__profErr=false; window.__calls=[];
  window.__gymRows=[{member_id:'${COACH}'},{member_id:'u-sam'},{member_id:'u-nat'},{member_id:'u-luz'}];
  // u-kat: asesorado que YA tiene perfil de comunidad pero AÚN NO está en el gym (F4).
  window.__profRows=[{user_id:'${COACH}'},{user_id:'u-sam'},{user_id:'u-nat'},{user_id:'u-kat'}];
  const builder=(table)=>{ const b={
      select(){return b;}, insert(){return b;}, update(){return b;}, delete(){return b;},
      eq(){return b;}, neq(){return b;}, or(){return b;}, limit(){return b;},
      // §P3: antes in() IGNORABA sus argumentos, así que la consulta de perfiles devolvía
      // siempre lo mismo aunque perdiera el filtro — por eso F4 pasó desapercibido.
      in(col,ids){ b.__in=(ids||[]).slice(); window.__lastIn={col:col,ids:b.__in}; return b; },
      maybeSingle(){return Promise.resolve({data:null,error:null});},
      then(resolve){
        window.__calls.push(table);
        if(table==='community_gym_members')return resolve({data:window.__gymRows,error:null});
        if(table==='community_profiles'){
          if(window.__profErr)return resolve({data:null,error:{message:'boom'}});
          const rows=b.__in?window.__profRows.filter(r=>b.__in.indexOf(r.user_id)>=0):window.__profRows;
          return resolve({data:rows,error:null});
        }
        resolve({data:[],error:null}); } };
    return b; };
  AUTH.client=()=>({from:builder,rpc:()=>Promise.resolve({data:[],error:null})});
  AUTH.getUser=async()=>({id:'${COACH}'});
  window.open=(u)=>{window.__opened=u;return null;};
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;

console.log('  install:', await ev(INSTALL)); await sleep(300);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const rowsOf = `(()=>{const b=document.getElementById('gym-mgr-body');
  return [...b.querySelectorAll('div')].filter(d=>d.parentElement===b).map(d=>({
    txt:d.innerText.replace(/\\s+/g,' ').trim(),
    chip:/Ya está/.test(d.innerText),
    invitar:[...d.querySelectorAll('button')].some(x=>/Invitar/.test(x.textContent))}));})()`;

await ev(`openGymMgr()`); await sleep(700);

// G1: la cifra que le importa al coach — cuántos de su gym ya activaron.
const g1 = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');const t=b.innerText.replace(/\\s+/g,' ');
  return {txt:t.slice(0,140),tres:/3 de 4/.test(t),invita:/Al que falta puedes invitarlo por WhatsApp/.test(t)};})()`);
check('G1 el modal dice «3 de 4 ya crearon su perfil» y qué hacer con el resto', g1.tres && g1.invita, JSON.stringify(g1));

// G2/G3/G4: etiqueta por miembro según su estado real.
const g2 = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');
  const row=n=>[...b.children].find(d=>d.innerText&&d.innerText.indexOf(n)>=0);
  const st=n=>{const r=row(n);return r?{chip:/Ya está/.test(r.innerText),inv:[...r.querySelectorAll('button')].some(x=>/Invitar/.test(x.textContent))}:null;};
  return {sam:st('Samuel'),luz:st('Luz'),fuera:st('onerror')};})()`);
check('G2 quien YA activó muestra «✓ Ya está» y NO botón de invitar', !!(g2.sam && g2.sam.chip && !g2.sam.inv), JSON.stringify(g2.sam));
check('G3 quien está en el gym SIN perfil muestra «Invitar»', !!(g2.luz && g2.luz.inv && !g2.luz.chip), JSON.stringify(g2.luz));
check('G4 a quien NO está en el gym no se le invita (vería un cuarto vacío)', !!(g2.fuera && !g2.fuera.inv && !g2.fuera.chip), JSON.stringify(g2.fuera));

// G5: nombre hostil ESCAPADO (el modal pinta nombres que el coach tecleó).
const g5 = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');
  return {xss:!!window.__xss,imgs:b.querySelectorAll('img[onerror]').length,esc:/&lt;img/.test(b.innerHTML)};})()`);
check('G5 un nombre hostil se escapa (sin <img onerror> ni ejecución)', !g5.xss && g5.imgs === 0 && g5.esc, JSON.stringify(g5));

const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300); await shot('gym-invite-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(300); await shot('gym-invite-oscuro');
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300);

// G6: «Invitar» con teléfono → wa.me con el móvil NORMALIZADO (57…, bug de clase v365).
await ev(`window.__opened=null; gymInvite('u-luz');`); await sleep(300);
const g6 = await ev(`(()=>{const u=window.__opened||'';const m=decodeURIComponent((u.split('text=')[1]||''));
  return {url:u.split('?')[0],msg:m};})()`);
check('G6 «Invitar» abre WhatsApp con el móvil normalizado a 57…', g6.url === 'https://wa.me/573009998877', JSON.stringify({ url: g6.url }));

// G7: el mensaje es honesto, en texto plano y con el enlace de AVI.
check('G7 el mensaje dice qué se ve y qué NO, en texto plano y con el enlace',
  /^Hola Luz 👋/.test(g6.msg) && /apodo y tu constancia/.test(g6.msg) && /nunca tu peso, tus fotos ni tus kilos/.test(g6.msg) &&
  /kronos-apex\.github\.io\/apex-app/.test(g6.msg) && !/[<>]/.test(g6.msg), JSON.stringify({ msg: g6.msg.slice(0, 90) }));

// G7-bis: el conteo del mensaje sale de la realidad (3 con perfil), no de un número inventado.
check('G7-bis el mensaje cuenta a los que YA están (3), sin inventar', /Ya somos 3 del gym/.test(g6.msg), JSON.stringify({ msg: g6.msg.slice(0, 60) }));

// G8: sin teléfono → cae a elegir contacto en WhatsApp (no un enlace roto tipo wa.me/undefined).
await ev(`(()=>{DB.clients.find(c=>c.id==='u-luz').phone='';window.__opened=null;gymInvite('u-luz');})()`); await sleep(300);
const g8 = await ev(`(()=>{const u=window.__opened||'';return {url:u.split('?')[0],tieneTexto:/text=/.test(u)};})()`);
check('G8 sin teléfono cae a «elige contacto» (wa.me/?text=), sin enlace roto',
  g8.url === 'https://wa.me/' && g8.tieneTexto, JSON.stringify(g8));

// G9: si la consulta de perfiles falla, el modal SIGUE sirviendo (switches intactos) y
// simplemente no promete estados que no puede saber.
await ev(`(()=>{window.__profErr=true;DB.clients.find(c=>c.id==='u-luz').phone='3009998877';})()`);
await ev(`openGymMgr()`); await sleep(700);
const g9 = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');
  return {sw:b.querySelectorAll('.cmty-sw').length,chips:/Ya está/.test(b.innerText),inv:[...b.querySelectorAll('button')].some(x=>/Invitar/.test(x.textContent)),cifra:/ya crearon su perfil/.test(b.innerText)};})()`);
check('G9 si no se puede saber quién activó, el modal sigue sirviendo y no inventa estados',
  g9.sw >= 5 && !g9.chips && !g9.inv && !g9.cifra, JSON.stringify(g9));

// ── G10 (F4): agregar al gym a alguien que YA tiene perfil no puede marcarlo como «no activado».
// El Set de activos se calculaba UNA vez con los miembros de ese momento; el recién agregado nunca
// estaba en esa consulta → el modal empujaba a invitarlo a algo donde ya estaba. Repro en 2 toques.
await ev(`(()=>{window.__profErr=false;})()`);
await ev(`openGymMgr()`); await sleep(700);
await ev(`toggleGymMember('u-kat')`); await sleep(600);
const g10 = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');
  const r=[...b.children].find(d=>d.innerText&&d.innerText.indexOf('Kathe')>=0);
  return r?{chip:/Ya está/.test(r.innerText),inv:[...r.querySelectorAll('button')].some(x=>/Invitar/.test(x.textContent))}:null;})()`);
check('G10 (F4) al agregar al gym a quien YA tiene perfil, se marca «Ya está» (no «Invitar»)',
  !!(g10 && g10.chip && !g10.inv), JSON.stringify(g10));

// G10-bis: la consulta de perfiles se hace con los ids REALES del directorio (si perdiera el
// filtro, este harness ya no lo notaría — por eso el cliente falso honra `.in()`).
const g10b = await ev(`window.__lastIn`);
check('G10-bis la consulta de activos filtra por los miembros del directorio',
  !!(g10b && g10b.col === 'user_id' && g10b.ids.indexOf('u-kat') >= 0 && g10b.ids.indexOf('u-out') < 0), JSON.stringify(g10b));

// ── G11 (F5): la frase debe contar SOLO lo que la lista ofrece. Se agrega un miembro ARCHIVADO
// (está en el gym pero ya no en DB.clients → no tiene fila ni botón). Antes se le contaba y el
// modal podía prometer invitaciones que no existen en pantalla.
await ev(`(()=>{window.__gymRows.push({member_id:'u-archivado'});})()`);
await ev(`openGymMgr()`); await sleep(700);
const g11 = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');const t=b.innerText.replace(/\\s+/g,' ');
  const botones=[...b.querySelectorAll('button')].filter(x=>/Invitar/.test(x.textContent)).length;
  return {txt:t.slice(0,190),botones:botones,
          promete2:/A los otros 2 puedes invitarlos/.test(t),
          prometeUno:/Al que falta puedes invitarlo/.test(t),
          fuera:/no puedes invitarlo desde aquí/.test(t)};})()`);
check('G11 (F5) la frase no promete más invitaciones que botones hay en pantalla',
  g11.botones === 1 && g11.prometeUno && !g11.promete2, JSON.stringify(g11));

// G11-bis: si NO queda nadie invitable pero sí pendientes, lo dice sin mentir.
await ev(`(()=>{window.__profRows.push({user_id:'u-luz'});})()`);
await ev(`openGymMgr()`); await sleep(700);
const g11b = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');const t=b.innerText.replace(/\\s+/g,' ');
  return {botones:[...b.querySelectorAll('button')].filter(x=>/Invitar/.test(x.textContent)).length,
          fuera:/no puedes invitarlo desde aquí/.test(t),completa:/está completa/.test(t),txt:t.slice(0,180)};})()`);
check('G11-bis sin nadie a quien invitar, no dice «invítalos» ni «completa» en falso',
  g11b.botones === 0 && g11b.fuera && !g11b.completa, JSON.stringify(g11b));

// ── G12 (F6): el botón «Invitar» vive pegado al switch que da/quita membresía → mínimo táctil 36px.
await ev(`(()=>{window.__profRows=window.__profRows.filter(r=>r.user_id!=='u-luz');})()`);
await ev(`openGymMgr()`); await sleep(700);
const g12 = await ev(`(()=>{const b=document.getElementById('gym-mgr-body');
  const btn=[...b.querySelectorAll('button')].find(x=>/Invitar/.test(x.textContent));
  if(!btn)return {err:'sin boton'};
  const r=btn.getBoundingClientRect();
  return {h:Math.round(r.height),w:Math.round(r.width)};})()`);
check('G12 (F6) el botón «Invitar» cumple el mínimo táctil de 36px', g12.h >= 36, JSON.stringify(g12));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «EL COACH INVITA AL GYM» (A3, adopción) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
