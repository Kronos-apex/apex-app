// _verify-profile.mjs — PERFIL DE OTRA PERSONA: tocar nombre/avatar → su perfil; foto en grande.
// Sin login, cliente stubbeado. La visibilidad real la gobierna la RLS (cpost_sel/_profile_visible)
// y la RPC c19; aquí se prueba la NAVEGACIÓN y el pintado del cliente.
//   PF1 el nombre y el avatar de un amigo abren su perfil (cmtyOpenProfile)
//   PF2 el perfil muestra avatar grande, handle, insignia coach, bio y cifras
//   PF3 «N seguidores / sigue a M» sale de la RPC (cmty_follow_counts)
//   PF4 «Entrena desde …» + «N entrenos» del perfil rico
//   PF5 sus publicaciones se pintan (reusa _cmtyPostCard); XSS del handle escapado
//   PF6 tocar la foto (con avatar del bucket) abre el visor en grande; ✕ lo cierra
//   PF7 «Volver» regresa a la vista de la que vine (feed)
//   PF8 abrir MI propio perfil no hace nada (mi perfil vive en Ajustes)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8851, OUT = (process.env.TEMP || '/tmp') + '/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9361', '--user-data-dir=' + process.env.TEMP + '/pf-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9361/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await waitFor(`typeof cmtyOpenProfile==='function' && typeof _cmtyProfileHtml==='function' && typeof cmtyZoomAvatar==='function' && !document.getElementById('avi-loading')`);
await sleep(900);

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n); } };
const ME = 'me-1', SAM = 'sam-1';
const PREFIX = 'https://eoebhrxbokyllqalyecj.supabase.co/storage/v1/object/public/avatars/';
const XSSNAME = 'Samu <img src=x onerror=window.__pwned=1>';

const INSTALL = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const cc=document.getElementById('cn-community'); if(cc)cc.classList.add('on');
  if(typeof setTheme==='function')setTheme('light');
  window.__pwned=undefined;
  // cliente stub: posts del perfil + follow counts por RPC
  AUTH.client=()=>({
    from:(t)=>({
      select:()=>({ eq:()=>({ eq:()=>({ order:()=>({ limit:()=>Promise.resolve({data: t==='community_posts' ? window.__samPosts : [], error:null}) }) }) }),
                    in:()=>({ order:()=>({ limit:()=>Promise.resolve({data:[],error:null}) }) }) })
    }),
    rpc:(n)=> n==='cmty_follow_counts' ? Promise.resolve({data:[{followers:3,following:5}],error:null}) : Promise.resolve({data:[],error:null})
  });
  AUTH.getUser=async()=>({id:'${ME}'});
  // Blindaje del harness: nada de recargas de fondo que pisen los fixtures (poll/boot/realtime).
  window.cmtyLoad=async()=>{}; window.cmtyMaybeRefresh=async()=>{}; window.cmtyDmSubscribe=()=>{};
  window.__samPosts=[
    {id:'sp1',user_id:'${SAM}',kind:'workout',payload:{name:'Pierna',exercises_count:5,duration_min:50},created_at:'2026-07-23T10:00:00Z'},
    {id:'sp2',user_id:'${SAM}',kind:'pr',payload:{exercise_name:'Sentadilla',value_kg:120},created_at:'2026-07-22T10:00:00Z'}
  ];
  CMTY.uid='${ME}'; CMTY.loaded=true; CMTY.loading=false; CMTY.offline=false; CMTY.view='feed';
  CMTY.profile={user_id:'${ME}',handle:'Yo',visible:true,is_private:false};
  CMTY.gym=[]; CMTY.incoming=[]; CMTY.outgoing=[]; CMTY.discover=[]; CMTY.followerReqs=[];
  CMTY.following={}; CMTY.dmThreads=[]; CMTY.activity={}; CMTY.heartsRecv=0; CMTY.heartsGiven={};
  CMTY.posts=[]; CMTY.postHearts={}; CMTY.postHeartMine={}; CMTY.postComments={}; CMTY.isModerator=false;
  CMTY.friends=[{fid:'${SAM}',fr:{id:'fr-s'},prof:{user_id:'${SAM}',handle:${JSON.stringify(XSSNAME)},avatar_url:'${PREFIX}${SAM}/a.jpg',bio:'Entreno pierna',role:'coach',streak_weeks:5,level:3,sessions_4w:8,achievements:6,total_sessions:120,training_since:'2025-11-10'}}];
  CMTY.profById={'${SAM}':CMTY.friends[0].prof};
  _cmtyPaint();
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;
console.log('  install:', await ev(INSTALL)); await sleep(200);

// PF1 · el nombre y el avatar del amigo apuntan a cmtyOpenProfile
const pf1 = await ev(`(()=>{ const h=document.getElementById('cn-community').innerHTML;
  return h.indexOf("cmtyOpenProfile('${SAM}')")>0; })()`);
ok('PF1 el nombre/avatar del amigo abren su perfil (cmtyOpenProfile)', pf1);

// abrir el perfil y esperar a que carguen los conteos (RPC)
await ev(`cmtyOpenProfile('${SAM}')`);
await waitFor(`CMTY.profileCounts !== null`, 8000); await sleep(150);

// PF2 · encabezado del perfil
const pf2 = await ev(`(()=>{ const host=document.getElementById('cn-community'); const t=host.innerText;
  return JSON.stringify({ vista:CMTY.view==='profile', handle:/Samu/.test(t), coach:/Perfil de coach/.test(t),
    bio:/Entreno pierna/.test(t), avatarGrande: host.querySelector('img[style*=\"92px\"]')!==null||/width:92px/.test(host.innerHTML) }); })()`);
const d2 = JSON.parse(pf2);
ok('PF2 perfil abierto: avatar grande + handle + insignia coach + bio', d2.vista && d2.handle && d2.coach && d2.bio && d2.avatarGrande);

// PF3 · conteo de seguidores de la RPC. OJO: la etiqueta usa text-transform:uppercase, e innerText
// la devuelve en MAYÚSCULAS (gotcha conocido) → se busca en el innerHTML (fuente) o case-insensitive.
const pf3 = await ev(`(()=>{ const h=document.getElementById('cn-community').innerHTML;
  return JSON.stringify({ seg:/Seguidores/i.test(h) && h.indexOf('>3<')>0, sigue:/Sigue a/i.test(h) && h.indexOf('>5<')>0,
    counts: CMTY.profileCounts && CMTY.profileCounts.followers }); })()`);
const d3 = JSON.parse(pf3);
ok('PF3 «3 seguidores / sigue a 5» de cmty_follow_counts', d3.seg && d3.sigue && d3.counts === 3);

// PF4 · perfil rico
const pf4 = await ev(`(()=>{ const t=document.getElementById('cn-community').innerText;
  return /120/.test(t) && /Entrena desde noviembre de 2025/.test(t); })()`);
ok('PF4 «120 entrenos» + «Entrena desde noviembre de 2025»', pf4);

// PF5 · sus publicaciones + XSS del handle escapado
const pf5 = await ev(`(()=>{ const host=document.getElementById('cn-community'); const t=host.innerText; const h=host.innerHTML;
  return JSON.stringify({ pierna:/Pierna/.test(t), record:/120 kg/.test(t),
    escapado: h.indexOf('&lt;img src=x')>0 && host.querySelectorAll('img[src=\"x\"]').length===0, pwned:!!window.__pwned }); })()`);
const d5 = JSON.parse(pf5);
ok('PF5 sus publicaciones (entreno + récord) se pintan', d5.pierna && d5.record);
ok('PF5b XSS del handle escapado en el perfil (sin <img>, onerror no corre)', d5.escapado && !d5.pwned);

// PF6 · zoom de la foto (abrir + leer en la MISMA llamada — el visor es síncrono, sin carrera)
const pf6 = await ev(`(()=>{ cmtyZoomAvatar('${PREFIX}${SAM}/a.jpg');
  const ov=document.getElementById('cmty-avatar-zoom');
  return JSON.stringify({ abierto:!!ov, tieneImg: !!(ov && ov.querySelector('img[src*=\"a.jpg\"]')) }); })()`);
const d6 = JSON.parse(pf6);
ok('PF6 tocar la foto abre el visor en grande', d6.abierto && d6.tieneImg);
if(!(d6.abierto && d6.tieneImg)) console.log('    PF6 debug:', pf6);
await sleep(60);
await ev(`cmtyCloseZoom()`); await sleep(80);
const pf6b = await ev(`document.getElementById('cmty-avatar-zoom')===null`);
ok('PF6b ✕ cierra el visor', pf6b);
// una URL externa NO abre el visor (defensa: solo fotos del bucket)
await ev(`cmtyZoomAvatar('https://evil.example.com/x.jpg')`); await sleep(80);
const pf6c = await ev(`document.getElementById('cmty-avatar-zoom')===null`);
ok('PF6c una URL externa NO abre el visor (solo bucket propio)', pf6c);

// PF7 · volver
await ev(`cmtyProfileBack()`); await sleep(200);
const pf7 = await ev(`CMTY.view==='feed' && CMTY.profileUid===null`);
ok('PF7 «Volver» regresa al muro y limpia el perfil', pf7);

// PF8 · abrir mi propio perfil = no-op
await ev(`CMTY.view='feed'; cmtyOpenProfile('${ME}')`); await sleep(120);
const pf8 = await ev(`CMTY.view==='feed'`);
ok('PF8 abrir MI propio perfil no navega (vive en Ajustes)', pf8);

// Capturas del perfil abierto, claro y oscuro
await ev(`cmtyOpenProfile('${SAM}')`); await sleep(400);
for (const tema of ['light', 'dark']) {
  await ev(`(()=>{ if(typeof setTheme==='function')setTheme('${tema}'); document.body.classList.toggle('dark', ${tema === 'dark'}); return 1; })()`);
  await sleep(220);
  const h = await ev(`Math.max(document.getElementById('cn-community').scrollHeight+120, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(280);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/profile-${tema}.png`, Buffer.from(shot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
console.log('  shots en:', OUT);

ok('sin errores JS', jsErrors.length === 0);
if (jsErrors.length) console.log('  jsErrors:', jsErrors.slice(0, 4));
console.log(`\n  PERFIL: ${pass} ok, ${fail} fallos`);
try { srv.kill(); chrome.kill(); } catch {}
process.exit(fail ? 1 : 0);
