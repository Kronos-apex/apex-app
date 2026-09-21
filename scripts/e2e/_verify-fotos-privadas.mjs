// Verificación E2E de v650: LAS FOTOS DE PROGRESO VIVEN EN UN BUCKET PRIVADO.
//
// Lo que se afirma es lo que se VE y a dónde va cada foto: (1) una foto PRIVADA (con `path`) se
// pinta en la rejilla del coach, la del asesorado y el visor, pidiendo su enlace firmado; (2) las
// viejas (base64) se siguen viendo; (3) guardar una foto va al bucket PRIVADO y JAMÁS al público;
// (4) la mudanza solo la hace el dueño y deja la entrada sin enlace público.
// En localhost la subida está SELLADA: se sustituyen SOLO la subida y el enlace firmado (espías).
// La sonda `_probe-chat-media.mjs` prueba esos endpoints contra el servidor de verdad.
// Patrón preview-SIN-login (el de `_verify-fotos-coach`).
//
// Corre: node scripts/e2e/_verify-fotos-privadas.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8853;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-fotospriv-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9373', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9373/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-fotospriv';
try { mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof saveProgressPhoto==='function' && typeof migrateProgressPhotosPrivate==='function' && typeof renderPhotosCoach==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó (o faltan las funciones de v650)'); process.exit(1); }
const U = '11111111-2222-4333-8444-555555555555';
const montaje = await ev(`(()=>{try{
  const cv=document.createElement('canvas'); cv.width=300; cv.height=400; const g=cv.getContext('2d');
  g.fillStyle='#0A7C5B'; g.fillRect(0,0,300,400); g.fillStyle='#fff'; g.font='60px sans-serif'; g.fillText('PRIV',70,220);
  window.__priv=cv.toDataURL('image/jpeg');
  g.fillStyle='#457B9D'; g.fillRect(0,0,300,400); g.fillStyle='#fff'; g.fillText('B64',80,220);
  window.__b64=cv.toDataURL('image/jpeg');
  window.__subidas=[]; window.__publicas=0; window.__firmas=[]; window.__falla=false;
  window._chatMediaUpload=async (path,blob,type,bucket,upsert)=>{ if(window.__falla)throw new Error('red'); window.__subidas.push({path,bucket,upsert:!!upsert,size:blob.size}); return path; };
  window._chatMediaUrl=async (path,bucket)=>{ window.__firmas.push({path,bucket}); return window.__priv; };
  window.uploadPhotoToStorage=async ()=>{ window.__publicas++; return 'https://x/storage/v1/object/public/apex-photos/NO'; };
  window.deletePhotoFromStorage=async ()=>{};
  DB.clients=[{id:'${U}',name:'Pri Vada',tier:'premium',level:'Intermedio',days:3,routines:[]}];
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  DB.photos={'${U}':[{id:'p2',label:'Privada',date:d(2),mAt:d(2),path:'${U}/progreso-p2.jpg'},{id:'p1',label:'Vieja',date:d(40),src:window.__b64}]};
  showScreen('s-coach'); gp('p-detail',null,'Detalle'); CUR.clientId='${U}';
  renderPhotosCoach('${U}');
  const s=document.getElementById('avi-loading'); if(s)s.style.display='none';
  const b=document.getElementById('install-banner'); if(b)b.style.display='none';
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE el fixture se planta y el render corre', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { process.exit(1); }
await sleep(500);
const leerGrid = sel => ev(`(()=>{const imgs=[...document.querySelectorAll('${sel} img')]; return imgs.map(i=>({priv:i.hasAttribute('data-ppath'), cargada:!!i.src&&i.src.startsWith('data:image/'), alto:Math.round(i.getBoundingClientRect().height)}));})()`);
let g1 = await leerGrid('#d-photos');
check('P1 el coach ve la foto PRIVADA (enlace firmado) y la vieja', g1.length === 2 && g1[0].priv && g1[0].cargada && g1[0].alto > 50 && !g1[1].priv && g1[1].cargada, JSON.stringify(g1));
check('P2 el enlace se pidió al bucket PRIVADO', (await ev(`JSON.stringify(window.__firmas)`)).includes('"bucket":"progress-photos"'), await ev(`JSON.stringify(window.__firmas)`));
await ev(`document.getElementById('d-photos').scrollIntoView({block:'center'})`); await sleep(200); await shot('fotos-privadas-coach');
await ev(`viewPhoto('p2','${U}',true)`); await sleep(400);
const v1 = await ev(`(()=>{const o=[...document.body.children].pop(); const i=o&&o.querySelector('img'); return {priv:!!i&&i.hasAttribute('data-ppath'), cargada:!!i&&!!i.src&&i.src.startsWith('data:image/')};})()`);
check('P3 el visor abre la foto privada', v1.priv && v1.cargada, JSON.stringify(v1));
await shot('fotos-privadas-visor');
await ev(`(()=>{const o=[...document.body.children].pop(); if(o&&o.querySelector('img[data-ppath]'))o.remove();})()`);
// Guardar: al bucket PRIVADO, nunca al público.
await ev(`(()=>{ CUR.loggedAs='client'; showScreen('s-client'); })()`);
const s1 = await ev(`(async()=>{ const e=await saveProgressPhoto('${U}',window.__b64,'Nueva'); return {path:e.path||null, src:e.src?'sí':'no', subida:window.__subidas[window.__subidas.length-1]||null, publicas:window.__publicas}; })()`);
check('P4 guardar sube al bucket PRIVADO y la entrada NO lleva enlace', s1.path === U + '/progreso-' + s1.path.split('/progreso-')[1] && s1.src === 'no' && s1.subida && s1.subida.bucket === 'progress-photos' && s1.publicas === 0, JSON.stringify(s1));
const s2 = await ev(`(async()=>{ window.__falla=true; const e=await saveProgressPhoto('${U}',window.__b64,'Sin red'); window.__falla=false; return {path:e.path||null, b64:(e.src||'').startsWith('data:image/'), publicas:window.__publicas}; })()`);
check('P5 sin red se queda en la ficha (privada) y NUNCA cae al bucket público', s2.path === null && s2.b64 && s2.publicas === 0, JSON.stringify(s2));
// Mudanza: solo el dueño.
const m0 = await ev(`(async()=>{ _authUid='otro-uid'; CUR.clientId='${U}'; const antes=window.__subidas.length; await migrateProgressPhotosPrivate(); return window.__subidas.length-antes; })()`);
check('P6 🔒 la mudanza NO la hace alguien que no es el dueño', m0 === 0, 'subidas=' + m0);
const m1 = await ev(`(async()=>{ _authUid='${U}'; CUR.clientId='${U}';
  DB.photos['${U}'].push({id:'pub1',label:'Pública',date:new Date(Date.now()-60*86400000).toISOString(),src:'https://x.supabase.co/storage/v1/object/public/apex-photos/leg/pub1.jpg'});
  window.fetch=(orig=>async (u,o)=>{ if(String(u).indexOf('/object/public/apex-photos/')>0) return new Response(new Blob([new Uint8Array(500)],{type:'image/jpeg'})); return orig(u,o); })(window.fetch);
  await migrateProgressPhotosPrivate();
  const l=DB.photos['${U}'].filter(p=>!p.del);
  return {quedanFuera:l.filter(p=>photoNeedsPrivate(p)).length, total:l.length, upserts:window.__subidas.filter(s=>s.upsert).length, conSrc:l.filter(p=>p.src).length, pub:l.find(p=>p.id==='pub1')||null}; })()`);
check('P7 el dueño muda sus fotos viejas (base64 y enlace público) al privado', m1.quedanFuera === 0 && m1.conSrc === 0 && m1.upserts >= 2 && m1.pub && m1.pub.path === U + '/progreso-pub1.jpg', JSON.stringify(m1));

// v651 · «Mi entrenamiento»: el coach es su propio asesorado (COACH_SELF) y muda SUS fotos.
const C = '0a6484ed-42af-449d-9903-e440ac683ecf';
const m2 = await ev(`(async()=>{ COACH_SELF=true; _authUid='${C}'; CUR.clientId='${C}';
  DB.photos={'${C}':[{id:'c1',label:'Coach',date:new Date(Date.now()-30*86400000).toISOString(),src:window.__b64}]};
  let guardados=0; const svO=window.svNow; window.svNow=(k,v)=>{ if(k==='ax_photos')guardados++; return svO?svO(k,v):null; };
  await migrateProgressPhotosPrivate(); window.svNow=svO;
  const p=DB.photos['${C}'][0]; return {path:p.path||null, src:p.src?'sí':'no', guardados}; })()`);
check('P8 «Mi entrenamiento» muda las fotos del coach a SU carpeta privada', m2.path === C + '/progreso-c1.jpg' && m2.src === 'no' && m2.guardados === 1, JSON.stringify(m2));
const m3 = await ev(`(async()=>{ COACH_SELF=true; _authUid='${C}'; CUR.clientId='${C}';
  DB.photos={'${C}':[{id:'c2',label:'Coach 2',date:new Date(Date.now()-20*86400000).toISOString(),src:window.__b64}]};
  const upO=window._chatMediaUpload; window._chatMediaUpload=async (...a)=>{ CUR.clientId=null; COACH_SELF=false; return upO(...a); };
  let guardados=0; const svO=window.svNow; window.svNow=(k,v)=>{ if(k==='ax_photos')guardados++; return svO?svO(k,v):null; };
  await migrateProgressPhotosPrivate(); window.svNow=svO; window._chatMediaUpload=upO;
  return {guardados}; })()`);
check('P9 🔒 si vuelve al panel a mitad de la mudanza, NO guarda por el camino del coach', m3.guardados === 0, JSON.stringify(m3));

log('\njsErrors: ' + JSON.stringify(jsErrors));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
log(fallas || jsErrors.length ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fallas || jsErrors.length ? 1 : 0);
