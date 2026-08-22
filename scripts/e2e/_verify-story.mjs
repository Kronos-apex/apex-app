// _verify-story.mjs — v522: la imagen de progreso que el coach postea en su historia.
// El PO vende por voz a voz y por historias, y dice que lo que MÁS le vende es «el resultado
// visual de las personas que entrenan conmigo». Esto verifica que la tarjeta salga, que la imagen
// se dibuje con los números REALES y que a un MENOR no se le arme de un toque.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8803, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9310', '--user-data-dir=' + process.env.TEMP + '/story-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9310/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderStoryCard==='function' && typeof clientProgressStory==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

// Fixture con la FORMA real de una sesión (exercises[].sets[].kg) y fechas RELATIVAS.
// Los números imitan a una persona real: prensa 40→95, hip thrust 90→110.
const MONTAR = (edad) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  const hace=d=>new Date(Date.now()-d*86400000).toISOString();
  const ses=(d,prensa,hip,abd)=>({id:'s'+d,sessionId:'x'+d,routineId:'r1',routineName:'Pierna',
    date:hace(d),finishedAt:hace(d),doneSets:9,totalSets:9,exercises:[
      {id:'e36',name:'Prensa de Pierna',sets:[{kg:prensa,reps:12}]},
      {id:'e42',name:'Hip Thrust con Barra',sets:[{kg:hip,reps:10}]},
      {id:'e45',name:'Abducción de Cadera en Máquina',sets:[{kg:abd,reps:15}]}]});
  const h=[ses(85,40,90,25),ses(70,50,95,25),ses(55,60,100,30),ses(40,70,100,35),
           ses(28,80,105,35),ses(18,85,110,40),ses(10,90,110,40),ses(3,95,110,40)];
  const c={id:'st1',name:'Astrid Beltrán',sex:'F',age:${edad},level:'Intermedio',goal:'Ganar músculo',days:5,phone:'3001234567',
    payments:[{date:hace(5),dueDate:new Date(Date.now()+25*86400000).toISOString(),amount:150000,note:''}]};
  DB.clients=[c]; DB.history={st1:h}; DB.prs=DB.prs||{}; CUR.clientId='st1';
  showScreen('s-coach');
  // el contenedor vive dentro de #p-detail: sin activar ese panel mide como OCULTO y las
  // aserciones darian rojo por el montaje, no por la app.
  document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
  const pd=document.getElementById('p-detail'); if(pd)pd.classList.add('on');
  renderStoryCard(c);
  return 'ok';
}catch(e){return 'err:'+e.message;}})()`;

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

console.log('── ADULTA (33 años, 8 entrenos con progresión) ──');
console.log('  montaje:', await ev(MONTAR(33)));
await sleep(500);
const txt = await ev(`(()=>{const e=document.getElementById('d-story');return e&&e.offsetParent!==null?e.textContent.replace(/\\s+/g,' ').trim():''})()`);
console.log('  tarjeta:', JSON.stringify(txt.slice(0, 200)));
check('S1 la tarjeta aparece en la ficha', txt.length > 20, txt.slice(0, 50));
check('S2 nombra a la persona y sus entrenos', /Astrid/.test(txt) && /8 entrenos/.test(txt));
check('S3 muestra las subidas de carga con sus kilos', /40 → 95 kg/.test(txt), txt.slice(0, 120));
check('S4 dice en cuántos ejercicios subió', /subió carga en 3 de 3/.test(txt));
check('S5 tiene el botón de crear la imagen', /Crear la imagen/.test(txt));

// La IMAGEN: se dispara y se lee el lienzo real (el gancho `_storyLastCanvas`)
await ev(`(()=>{window.__blobs=0;const T=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(cb,t){window.__blobs++;return T.call(this,cb,t);};return 1})()`);
await ev(`shareClientProgress()`);
await sleep(900);
const cvInfo = await ev(`(()=>{const c=window._storyLastCanvas;if(!c)return null;
  const x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height).data;
  let claros=0;for(let i=0;i<d.length;i+=4*997){if(d[i]+d[i+1]+d[i+2]>200)claros++;}
  return {w:c.width,h:c.height,muestras:Math.floor(d.length/(4*997)),claros};})()`);
console.log('  lienzo:', JSON.stringify(cvInfo));
check('S6 la imagen se dibuja en formato historia (1080×1920)', !!cvInfo && cvInfo.w === 1080 && cvInfo.h === 1920, JSON.stringify(cvInfo));
// 🔴 CONTROL: el lienzo tiene CONTENIDO. Un canvas negro entero pasaría el tamaño y no diría nada.
check('S7 CONTROL · el lienzo tiene contenido pintado, no está en negro',
  !!cvInfo && cvInfo.claros > 30, 'píxeles claros: ' + (cvInfo && cvInfo.claros));

console.log('\n── MENOR (16 años, MISMOS datos) ──');
console.log('  montaje:', await ev(MONTAR(16)));
await sleep(500);
const txtM = await ev(`(()=>{const e=document.getElementById('d-story');return e&&e.offsetParent!==null?e.textContent.replace(/\\s+/g,' ').trim():''})()`);
console.log('  tarjeta:', JSON.stringify(txtM.slice(0, 200)));
check('S8 a un MENOR no se le ofrece el botón', !/Crear la imagen/.test(txtM), txtM.slice(0, 60));
check('S9 y se explica por qué (permiso del acudiente), no se calla', /menor de edad/.test(txtM) && /acudiente/.test(txtM));
check('S10 CONTROL · el bloqueo es por EDAD, no porque falten datos: los mismos datos sí sirven para la adulta',
  /8 entrenos/.test(txt) && !/8 entrenos/.test(txtM));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

// La imagen, guardada para mirarla
await ev(MONTAR(33)); await sleep(400); await ev(`shareClientProgress()`); await sleep(900);
const dataUrl = await ev(`window._storyLastCanvas?window._storyLastCanvas.toDataURL('image/png'):''`);
if (dataUrl) { writeFileSync(OUT + '/story-imagen.png', Buffer.from(dataUrl.split(',')[1], 'base64')); console.log('  imagen guardada: story-imagen.png'); }

console.log('\n──── RESULTADOS HISTORIA (v522) ────');
results.forEach(r => console.log('  ' + r));
const bad = results.filter(r => r.startsWith('❌')).length;
console.log('\njsErrors:', JSON.stringify(jsErrors));
console.log(bad ? `\n❌ ${bad} FALLARON` : '\n✅ TODO OK');
try { ws.close(); } catch {}
chrome.kill(); srv.kill();
process.exit(bad ? 1 : 0);
