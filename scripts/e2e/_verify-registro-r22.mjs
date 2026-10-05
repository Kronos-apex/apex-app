// ════════════════════════════════════════════════════════════════════════════════════════
// VERIFY — R22 (v701) · el registro que llega desde la web, recorrido de verdad
//
// Lo que la auditoría final del 5-oct pidió y el PO aprobó con «dale con todos»:
//   · quien llega de la web (?origen=web) no ve «Instala la app» compitiendo con «Crear cuenta»
//   · el paso 2 habla en palabras de la calle
//   · el paso 7 abre con Google; el correo está plegado y se abre en el sitio, con el foco en él
//   · la medición del registro manda UNA fila por paso, sin nada de la persona
//
// NO crea nada: `loginWithGoogle` y `AUTH.signUpEmail` se ESPÍAN, y el cliente de Supabase se
// sustituye por uno que solo anota lo que se habría insertado. El sello de localhost (v298) se
// levanta SOLO para ese cliente falso (AVI_ALLOW_CLOUD_WRITE), así que nada llega a la nube.
//
//   node scripts/e2e/_verify-registro-r22.mjs        (capturas en %TEMP%/avi-registro-r22)
// ════════════════════════════════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(tmpdir(), 'avi-registro-r22');
mkdirSync(OUT, { recursive: true });
const PORT = 8822;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webp': 'image/webp' };
const srv = createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html');
  if (!existsSync(f) || f.indexOf(ROOT) !== 0) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => srv.listen(PORT, r));

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(existsSync);
if (!CHROME) { console.error('No hay Chrome'); process.exit(1); }
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9422', '--no-first-run', '--disable-gpu',
  `--user-data-dir=${join(tmpdir(), 'avi-chrome-r22-' + Date.now())}`, 'about:blank']);
const wsUrl = await (async () => {
  for (let i = 0; i < 60; i++) {
    try { return (await (await fetch('http://127.0.0.1:9422/json/version')).json()).webSocketDebuggerUrl; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  throw new Error('Chrome no levantó');
})();
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}, sessionId) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = (await send('Target.createTarget', { url: 'about:blank' })).result;
const { sessionId } = (await send('Target.attachToTarget', { targetId, flatten: true })).result;
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.result?.exceptionDetails) throw new Error('JS: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
  return r.result?.result?.value;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(join(OUT, n + '.png'), Buffer.from(r.result.data, 'base64')); };
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
const jsErr = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') jsErr.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text); });

let fallos = 0, bien = 0;
const ok = (cond, txt, det) => { if (cond) { bien++; console.log('  ✅ ' + txt + (det !== undefined ? ' — ' + JSON.stringify(det) : '')); } else { fallos++; console.log('  🔴 ' + txt + (det !== undefined ? ' — ' + JSON.stringify(det) : '')); } };

// Contraste: compone los fondos translúcidos hacia arriba hasta encontrar uno opaco (lección v682).
const CONTRASTE = `(el)=>{ const p=s=>{const m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const a=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1};};
  const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
  const capas=[]; let n=el; while(n&&n.nodeType===1){ const b=p(getComputedStyle(n).backgroundColor); const img=getComputedStyle(n).backgroundImage; if(img&&img!=='none') return {medible:false,porque:'degradado o imagen en '+(n.id||n.className)}; if(b&&b.a>0){capas.push(b); if(b.a>=1) break;} n=n.parentElement; }
  if(!capas.length||capas[capas.length-1].a<1) return {medible:false,porque:'sin fondo opaco'};
  let bg=capas.pop(); while(capas.length){const c=capas.pop(); bg={r:c.r*c.a+bg.r*(1-c.a),g:c.g*c.a+bg.g*(1-c.a),b:c.b*c.a+bg.b*(1-c.a),a:1};}
  let fg=p(getComputedStyle(el).color); fg={r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a)};
  const l1=L(fg),l2=L(bg); return {medible:true,ratio:Math.round(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))*100)/100}; }`;

const TELEFONOS = [{ n: '390x844', w: 390, h: 844 }, { n: '360x640', w: 360, h: 640 }];
for (const t of TELEFONOS) {
  console.log(`\n━━━ ${t.n} · llega desde la web con canal ━━━`);
  await send('Emulation.setDeviceMetricsOverride', { width: t.w, height: t.h, deviceScaleFactor: 2, mobile: true }, sessionId);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html?origen=web&canal=ig-bio` }, sessionId);
  // Control de montaje: se espera el arranque REAL (lo que define initPWA), no el DOM.
  let listo = false;
  for (let i = 0; i < 80 && !listo; i++) { await sleep(250); listo = await ev(`typeof window._aviUpdateBusy==='function' && typeof WZ==='object' && typeof wzShowMail==='function'`); }
  ok(listo, 'la app arrancó (control de montaje)');
  if (!listo) continue;
  // La marca de carga (z-index 9999) se queda con el toque y con la captura hasta que se retira.
  let sinCarga = false;
  for (let i = 0; i < 40 && !sinCarga; i++) { await sleep(250); sinCarga = await ev(`(()=>{ const l=document.getElementById('avi-loading'); if(!l) return true; const s=getComputedStyle(l); return s.display==='none'||s.visibility==='hidden'||+s.opacity<0.05; })()`); }
  ok(sinCarga, 'la pantalla de carga ya se fue (control de montaje)');
  await ev(`localStorage.removeItem('ax_canal'); localStorage.setItem('ax_canal', JSON.stringify({c:'ig-bio', at:new Date().toISOString()})); true`);

  // ── Bienvenida: «Crear cuenta» arriba y sin el bloque de instalación ──
  const bienv = await ev(`(()=>{ const ih=document.getElementById('install-hint'); if(ih) ih.style.display='block';
    const cta=document.getElementById('cin-cta'); const primero=cta&&cta.querySelector('button,a');
    return { instalar: ih?getComputedStyle(ih).display:'sin elemento', primero: primero?(primero.innerText||'').trim():null,
      origen: sessionStorage.getItem('ax_origen') }; })()`);
  ok(bienv.instalar === 'none', '«Instala la app» no sale aunque su módulo lo encienda', bienv.instalar);
  ok(/crear cuenta/i.test(bienv.primero || ''), '«Crear cuenta» es el primer botón', bienv.primero);
  ok(bienv.origen === 'web', 'el origen queda para la vuelta de Google', bienv.origen);
  await shot(`${t.n}-0-bienvenida`);

  // ── Espías: nada sale a la red ──
  await ev(`(()=>{ window.__funnel=[]; window.__google=0; window.__signup=0; window.AVI_ALLOW_CLOUD_WRITE=true;
    AUTH.ready=()=>true;
    AUTH.client=()=>({ from:(tabla)=>({ insert:(row)=>{ window.__funnel.push({tabla,row}); return Promise.resolve({error:null}); } }) });
    AUTH.signUpEmail=async()=>{ window.__signup++; return {data:{session:null,user:{id:'x'}},error:null}; };
    window.loginWithGoogle=()=>{ window.__google++; };
    return true; })()`);
  await ev(`[...document.querySelectorAll('#cin-cta button')].find(b=>/crear cuenta/i.test(b.innerText||'')).click(); true`);
  await sleep(700);

  // ── Pasos 1 a 6 ──
  await ev(`document.getElementById('su-name').value='Prueba'; WZ.next(); true`); await sleep(300);
  const subs = await ev(`[...document.querySelectorAll('#wz-s-goal .wz-chip .sub')].filter(s=>s.getBoundingClientRect().height>0).map(s=>s.innerText.trim())`);
  ok(subs.length === 6 && !subs.some(s => /d[ée]ficit|hipertrofia|volumen|compuestos/i.test(s)), 'el paso 2 se lee sin jerga', subs);
  await shot(`${t.n}-2-objetivo`);
  for (let paso = 2; paso <= 5; paso++) {
    await ev(`(()=>{ const st=document.getElementById(WZ.steps[WZ.cur]); const c=st.querySelector('.wz-chip,.wz-gchip'); if(c) c.click(); return true; })()`);
    await sleep(450);
    const cur = await ev(`WZ.cur`);
    if (cur < paso) { await ev(`WZ.next(); true`); await sleep(250); }
  }
  await ev(`document.getElementById('su-age').value='30'; WZ.next(); true`); await sleep(400);
  const enCuenta = await ev(`WZ.steps[WZ.cur]`);
  ok(enCuenta === 'wz-s-account', 'el recorrido llega al paso 7', enCuenta);
  await shot(`${t.n}-7-llegada`);   // lo que ve al llegar, sin bajar nada

  // ── Paso 7 ──
  const p7 = await ev(`(()=>{ const r=id=>{const e=document.getElementById(id); if(!e) return null; const b=e.getBoundingClientRect(); return {top:Math.round(b.top),bottom:Math.round(b.bottom),alto:Math.round(b.height),display:getComputedStyle(e).display};};
    const g=document.querySelector('#wz-s-account .wz-gbtn-main'); const gb=g.getBoundingClientRect();
    return { google:{top:Math.round(gb.top),bottom:Math.round(gb.bottom),alto:Math.round(gb.height)}, viewport:innerHeight,
      caja:r('su-mail-box'), correo:r('su-email'), enlace:r('su-mail-toggle'), casilla:r('su-ck-general'),
      enlaceAlto: Math.round(document.getElementById('su-mail-toggle').getBoundingClientRect().height) }; })()`);
  ok(p7.casilla.top < p7.google.top && p7.google.top < p7.enlace.top, 'orden: casillas → Google → «o con mi correo»', { casilla: p7.casilla.top, google: p7.google.top, enlace: p7.enlace.top });
  ok(p7.caja.display === 'none' && p7.correo.alto === 0, 'el correo empieza plegado', p7.caja.display);
  ok(p7.google.alto >= 44 && p7.enlaceAlto >= 44, 'Google y el enlace del correo son tocables (≥44 px)', { google: p7.google.alto, enlace: p7.enlaceAlto });
  console.log(`  ℹ️  Google arranca en y=${p7.google.top} con la pantalla de ${p7.viewport} px (${p7.google.bottom <= p7.viewport ? 'se ve sin bajar' : 'hay que bajar dentro del recuadro'})`);
  const contr = {};
  for (const sel of ['#wz-s-account .wz-ghint', '#su-mail-toggle']) contr[sel] = await ev(`(${CONTRASTE})(document.querySelector('${sel}'))`);
  for (const [sel, c] of Object.entries(contr)) {
    if (c.medible) ok(c.ratio >= 4.5, 'contraste de ' + sel, c.ratio); else console.log(`  ⚪ ${sel}: ${c.porque} — se mira en la captura`);
  }
  await ev(`document.querySelector('#wz-s-account .wz-gbtn-main').scrollIntoView({block:'center'}); true`); await sleep(250);
  await shot(`${t.n}-7-cerrado`);
  // Hit-test: el dedo cae sobre el enlace, no sobre otra cosa.
  const hit = await ev(`(()=>{ const t=document.getElementById('su-mail-toggle'); t.scrollIntoView({block:'center'}); const b=t.getBoundingClientRect();
    const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return e===t||t.contains(e); })()`);
  ok(hit, 'el toque cae sobre «o crear la cuenta con mi correo»');
  await ev(`document.getElementById('su-mail-toggle').click(); true`); await sleep(400);
  const abierto = await ev(`(()=>{ const box=document.getElementById('su-mail-box'), tg=document.getElementById('su-mail-toggle');
    const em=document.getElementById('su-email'); const b=em.getBoundingClientRect();
    return { caja:getComputedStyle(box).display, enlace:getComputedStyle(tg).display, aria:tg.getAttribute('aria-expanded'),
      foco: document.activeElement&&document.activeElement.id, correoVisible: b.height>0 && b.top>=0 && b.bottom<=innerHeight }; })()`);
  ok(abierto.caja !== 'none' && abierto.enlace === 'none' && abierto.aria === 'true', 'tocar el enlace abre el correo y el enlace se va', abierto);
  ok(abierto.foco === 'su-email' && abierto.correoVisible, 'el foco queda en el correo, a la vista', { foco: abierto.foco, visible: abierto.correoVisible });
  await shot(`${t.n}-7-abierto`);

  // ── Google, con las casillas marcadas ──
  await ev(`['su-ck-general','su-ck-salud','su-ck-adulto'].forEach(i=>{const c=document.getElementById(i); if(c&&!c.checked) c.click();}); true`);
  await ev(`document.querySelector('#wz-s-account .wz-gbtn-main').click(); true`); await sleep(400);
  const fin = await ev(`({ google: window.__google, signup: window.__signup, filas: window.__funnel })`);
  ok(fin.google === 1 && fin.signup === 0, 'Google sale una vez y no se creó ninguna cuenta', { google: fin.google, signup: fin.signup });
  const pasos = fin.filas.map(f => f.row.paso);
  ok(JSON.stringify(pasos) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 9]), 'la medición mandó los pasos 1-7 y la salida a Google, una vez cada uno', pasos);
  ok(fin.filas.every(f => f.tabla === 'signup_funnel'), 'todo va a signup_funnel');
  ok(fin.filas.every(f => JSON.stringify(Object.keys(f.row).sort()) === '["canal","origen","paso"]' && f.row.origen === 'web' && f.row.canal === 'ig-bio'),
    'cada fila es solo {paso, origen:web, canal:ig-bio} — nada de la persona', fin.filas[0] && fin.filas[0].row);

  // ── Volver a abrir el asistente lo pliega otra vez ──
  const replegado = await ev(`(()=>{ WZ.open(); return { caja:getComputedStyle(document.getElementById('su-mail-box')).display, aria:document.getElementById('su-mail-toggle').getAttribute('aria-expanded') }; })()`);
  ok(replegado.caja === 'none' && replegado.aria === 'false', 'reabrir el asistente vuelve a plegar el correo', replegado);
}

// ── CONTROL: quien NO viene de la web ve la bienvenida de siempre ──
console.log('\n━━━ control · llega sin ?origen=web ━━━');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` }, sessionId);
let listo = false;
for (let i = 0; i < 80 && !listo; i++) { await sleep(250); listo = await ev(`typeof window._aviUpdateBusy==='function'`); }
const ctl = await ev(`(()=>{ sessionStorage.removeItem('ax_origen'); const ih=document.getElementById('install-hint'); if(ih) ih.style.display='block';
  return { instalar: ih?getComputedStyle(ih).display:'sin elemento', clase: document.documentElement.classList.contains('av-desde-web') }; })()`);
ok(ctl.instalar !== 'none' && ctl.clase === false, 'sin ?origen=web el bloque de instalación SÍ puede salir (el apagado no es ancho)', ctl);
ok(jsErr.length === 0, 'sin errores de JS en toda la corrida', jsErr.slice(0, 3));

console.log(`\n${bien} bien · ${fallos} fallos · capturas en ${OUT}`);
ws.close(); chrome.kill(); srv.close();
process.exit(fallos ? 1 : 0);
