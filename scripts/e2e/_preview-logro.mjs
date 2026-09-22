// _preview-logro.mjs — DIBUJA variantes de la tarjeta de LOGRO para ELEGIR MIRANDO, no leyendo.
//
// Patrón de la casa (`docs/metodologia.md`): una decisión visual se toma con las opciones dibujadas
// al lado, con el MISMO motor que usa la app (tipografía de marca cargada, `_wfDrawCrest`, tokens).
// Cada variante respeta lo ya medido en v660: la marca y el enlace caen dentro de la franja que
// WhatsApp deja ver en el chat (y ≈ 202-1718 de un lienzo 1080×1920).
//
// Corre: node scripts/e2e/_preview-logro.mjs   → scripts/_logro-A..E.png
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 8857, DBG = 9367;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG,
   '--user-data-dir=' + process.env.TEMP + '/logroprev-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');

if (!await waitFor(`typeof _gxCard==='function' && typeof canvasFont==='function'`)) { console.log('🔴 la app no arrancó'); process.exit(1); }

const salida = await ev(`(async()=>{
  const TITULO='50 ENTRENOS', SUB='Cincuenta entrenos terminados', NOMBRE='Andres';
  const PIE='Entreno con Andrés Martínez  ·  avientrena.com';
  const F=(px,w,display)=>canvasFont(px,w,display);
  // 🔒 RETRATO REAL, recortado de una tarjeta que el PO compartió (scripts/_tmp-foto.jpg, 899x1599):
  //    con un muñeco gris no se puede juzgar una composición cuyo punto fuerte es la CARA — la skill
  //    de redes lo dice y el propio PO decidió el tamaño del retrato en v622 MIRANDO.
  const src=new Image(); src.src='/scripts/_tmp-foto.jpg';
  await new Promise(ok=>{src.onload=ok;src.onerror=ok;});
  const rc=document.createElement('canvas');rc.width=600;rc.height=600;const rg=rc.getContext('2d');
  const cxF=0.498*src.width, cyF=0.350*src.height, rF=0.100*src.height;
  rg.drawImage(src, cxF-rF, cyF-rF, 2*rF, 2*rF, 0,0,600,600);
  const foto=new Image(); foto.src=rc.toDataURL('image/png');
  await new Promise(ok=>{foto.onload=ok;foto.onerror=ok;});
  if(!src.width) return {error:'no cargó la foto'};

  const nuevo=()=>{const c=document.createElement('canvas');c.width=1080;c.height=1920;return [c,c.getContext('2d')];};
  const fondo=(x,claro)=>{const g=x.createLinearGradient(0,0,0,1920);
    g.addColorStop(0, claro?'#10402F':'#0B2A1F');g.addColorStop(.55,'#06120D');g.addColorStop(1,'#030806');
    x.fillStyle=g;x.fillRect(0,0,1080,1920);
    const r=x.createRadialGradient(540,700,40,540,700,640);r.addColorStop(0,'rgba(16,224,160,.26)');r.addColorStop(1,'rgba(16,224,160,0)');
    x.fillStyle=r;x.fillRect(0,0,1080,1920);};
  const veloArriba=(x)=>{const v=x.createLinearGradient(0,0,0,420);
    v.addColorStop(0,'rgba(3,10,7,.80)');v.addColorStop(1,'rgba(3,10,7,0)');x.fillStyle=v;x.fillRect(0,0,1080,420);};
  const marca=(x,y)=>{x.textAlign='center';x.fillStyle='#FFFFFF';x.font=F(40,'800');
    try{x.letterSpacing='10px';}catch(e){} x.fillText('A V I',540,y); try{x.letterSpacing='0px';}catch(e){}};
  const pie=(x,yRaya,yTexto)=>{x.fillStyle='rgba(16,224,160,.9)';x.fillRect(90,yRaya,900,4);
    x.textAlign='center';x.fillStyle='rgba(234,251,244,.6)';x.font=F(34,'600');x.fillText(PIE,540,yTexto);};
  const titulo=(x,y,max)=>{let px=150;x.fillStyle='#FFFFFF';
    do{ x.font=F(px,'900',true); px-=6; }while(x.measureText(TITULO).width>(max||960)&&px>60);
    x.fillText(TITULO,540,y); return px;};

  // Foto de RELLENO a sangre: la del PO llegó recortada en círculo, así que para juzgar una
  // composición SIN bordes hace falta una rectangular. Se sustituye por la suya al decidir.
  const llena=new Image(); llena.src='/scripts/_tmp-foto-llena.png';
  await new Promise(ok=>{llena.onload=ok;llena.onerror=ok;});
  const aSangre=(x,alto,brillo)=>{ // cubre el ancho completo, recortando lo que sobre
    const rel=Math.max(1080/llena.width, alto/llena.height);
    const w=llena.width*rel, h=llena.height*rel;
    // 🔴 La primera versión teñía con multiply sobre un verde oscuro y la foto se perdía: en una
    //    tarjeta que existe para que se vea la PERSONA, eso la borra. Se aclara y se tiñe por encima
    //    con transparencia, que conserva los medios tonos.
    x.save(); x.filter='saturate(.6) contrast(1.06) brightness('+(brillo||1.15)+')';
    x.drawImage(llena,(1080-w)/2,(alto-h)/2,w,h); x.filter='none';
    x.fillStyle='rgba(10,74,56,.30)'; x.fillRect(0,0,1080,alto); x.restore();
  };

  const out={};

  // ── A · LA DE HOY (v660), como referencia ──────────────────────────────────────────────
  {const cv=_gxCard('Logro desbloqueado','50 entrenos',SUB,NOMBRE,NOMBRE); out.A=cv.toDataURL('image/png');}

  // ── B · RETRATO A SANGRE: la foto ocupa la tarjeta, tratada como el cierre (v605) ───────
  {const [cv,x]=nuevo(); fondo(x,false);
   x.save();
   x.filter='grayscale(1) blur(2px)';
   const rel=Math.max(1080/foto.width,1250/foto.height), w=foto.width*rel, h=foto.height*rel;
   x.drawImage(foto,(1080-w)/2,-60,w,h);
   x.filter='none';
   x.globalCompositeOperation='multiply'; x.fillStyle='#0E5C44'; x.fillRect(0,0,1080,1250);
   x.globalCompositeOperation='source-over';
   const v=x.createLinearGradient(0,620,0,1250); v.addColorStop(0,'rgba(3,8,6,0)'); v.addColorStop(1,'#050D0A');
   x.fillStyle=v; x.fillRect(0,620,1080,640);
   x.restore();
   marca(x,250);
   x.textAlign='center';
   x.fillStyle='#10E0A0';x.font=F(44,'800');try{x.letterSpacing='8px';}catch(e){}
   x.fillText('LOGRO DESBLOQUEADO',540,1240);try{x.letterSpacing='0px';}catch(e){}
   titulo(x,1400);
   x.fillStyle='rgba(234,251,244,.82)';x.font=F(46,'600');x.fillText(SUB,540,1500);
   x.fillStyle='#FFFFFF';x.font=F(52,'800');x.fillText(NOMBRE,540,1590);
   pie(x,1640,1700);
   out.B=cv.toDataURL('image/png');}

  // ── C · MEDALLA: sin foto, el número ES el protagonista dentro de un emblema ────────────
  {const [cv,x]=nuevo(); fondo(x,true); marca(x,250);
   x.save();
   x.translate(540,760);
   x.strokeStyle='rgba(16,224,160,.55)';x.lineWidth=6;x.beginPath();x.arc(0,0,330,0,Math.PI*2);x.stroke();
   x.strokeStyle='rgba(16,224,160,.25)';x.lineWidth=2;x.beginPath();x.arc(0,0,360,0,Math.PI*2);x.stroke();
   for(let i=0;i<24;i++){const a=i*Math.PI/12; x.strokeStyle='rgba(16,224,160,'+(i%2?'.5':'.18')+')';x.lineWidth=4;
     x.beginPath();x.moveTo(Math.cos(a)*300,Math.sin(a)*300);x.lineTo(Math.cos(a)*330,Math.sin(a)*330);x.stroke();}
   const gg=x.createRadialGradient(0,-60,20,0,0,330);gg.addColorStop(0,'rgba(16,224,160,.20)');gg.addColorStop(1,'rgba(16,224,160,.03)');
   x.fillStyle=gg;x.beginPath();x.arc(0,0,300,0,Math.PI*2);x.fill();
   x.textAlign='center';
   x.fillStyle='#10E0A0';x.font=F(150,'900',true);x.fillText('50',0,10);
   x.fillStyle='rgba(234,251,244,.85)';x.font=F(40,'700');x.fillText('ENTRENOS',0,90);
   x.restore();
   x.textAlign='center';
   x.fillStyle='#FFFFFF';x.font=F(58,'800');x.fillText(NOMBRE,540,1230);
   x.fillStyle='#10E0A0';x.font=F(40,'800');try{x.letterSpacing='8px';}catch(e){}
   x.fillText('LOGRO DESBLOQUEADO',540,1320);try{x.letterSpacing='0px';}catch(e){}
   x.fillStyle='rgba(234,251,244,.82)';x.font=F(46,'600');x.fillText(SUB,540,1420);
   pie(x,1560,1630);
   out.C=cv.toDataURL('image/png');}

  // ── D · PANEL: todo dentro de una tarjeta con borde, como las fichas de la app ──────────
  {const [cv,x]=nuevo(); fondo(x,false); marca(x,190);
   const X=70,Y=300,W=940,H=1330,R=56;
   x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath();
   const pg=x.createLinearGradient(X,Y,X+W,Y+H);pg.addColorStop(0,'rgba(16,224,160,.10)');pg.addColorStop(1,'rgba(6,18,13,.55)');
   x.fillStyle=pg;x.fill();x.strokeStyle='rgba(16,224,160,.5)';x.lineWidth=3;x.stroke();
   if(typeof _wfDrawCrest==='function')_wfDrawCrest(x,540,540,170,NOMBRE,foto,'system-ui');
   x.textAlign='center';
   x.fillStyle='#FFFFFF';x.font=F(52,'800');x.fillText(NOMBRE,540,800);
   x.fillStyle='#10E0A0';x.font=F(40,'800');try{x.letterSpacing='8px';}catch(e){}
   x.fillText('LOGRO DESBLOQUEADO',540,890);try{x.letterSpacing='0px';}catch(e){}
   titulo(x,1050,820);
   x.fillStyle='rgba(234,251,244,.82)';x.font=F(44,'600');x.fillText(SUB,540,1150);
   x.fillStyle='rgba(16,224,160,.35)';x.fillRect(X+120,1230,W-240,3);
   x.fillStyle='rgba(234,251,244,.6)';x.font=F(32,'600');x.fillText('12 semanas seguidas · sin fallar una',540,1310);
   x.fillStyle='rgba(234,251,244,.6)';x.font=F(34,'600');x.fillText(PIE,540,1730);
   out.D=cv.toDataURL('image/png');}

  // ── E · TITULAR MANDANDO: el logro primero, el retrato como firma abajo ─────────────────
  {const [cv,x]=nuevo(); fondo(x,true); marca(x,250);
   x.textAlign='center';
   x.fillStyle='#10E0A0';x.font=F(44,'800');try{x.letterSpacing='10px';}catch(e){}
   x.fillText('LOGRO DESBLOQUEADO',540,520);try{x.letterSpacing='0px';}catch(e){}
   titulo(x,700);
   x.fillStyle='rgba(234,251,244,.82)';x.font=F(46,'600');x.fillText(SUB,540,800);
   x.fillStyle='rgba(16,224,160,.9)';x.fillRect(420,870,240,5);
   if(typeof _wfDrawCrest==='function')_wfDrawCrest(x,540,1200,250,NOMBRE,foto,'system-ui');
   x.fillStyle='#FFFFFF';x.font=F(56,'800');x.fillText(NOMBRE,540,1560);
   pie(x,1620,1690);
   out.E=cv.toDataURL('image/png');}

  // ── F · FOTO A SANGRE, SIN BORDES: la foto ES la tarjeta y el texto va abajo ────────────
  {const [cv,x]=nuevo(); fondo(x,false);
   aSangre(x,1420,1.25);
   const v=x.createLinearGradient(0,620,0,1420); v.addColorStop(0,'rgba(3,8,6,0)'); v.addColorStop(.62,'rgba(4,11,8,.90)'); v.addColorStop(1,'#050D0A');
   x.fillStyle=v; x.fillRect(0,620,1080,800);
   veloArriba(x); marca(x,250);
   x.textAlign='center';
   x.fillStyle='#FFFFFF';x.font=F(52,'800');x.fillText(NOMBRE,540,1180);
   x.fillStyle='#10E0A0';x.font=F(42,'800');try{x.letterSpacing='8px';}catch(e){}
   x.fillText('LOGRO DESBLOQUEADO',540,1290);try{x.letterSpacing='0px';}catch(e){}
   titulo(x,1440);
   x.fillStyle='rgba(234,251,244,.82)';x.font=F(46,'600');x.fillText(SUB,540,1530);
   pie(x,1600,1670);
   out.F=cv.toDataURL('image/png');}

  // ── G · FOTO ENTERA DE FONDO: el texto vive ENCIMA, sin bloque oscuro aparte ────────────
  {const [cv,x]=nuevo();
   aSangre(x,1920,1.18);
   const v=x.createLinearGradient(0,0,0,1920);
   v.addColorStop(0,'rgba(3,10,7,.72)'); v.addColorStop(.40,'rgba(3,10,7,.10)'); v.addColorStop(.72,'rgba(3,10,7,.80)'); v.addColorStop(1,'rgba(3,10,7,.96)');
   x.fillStyle=v; x.fillRect(0,0,1080,1920);
   marca(x,250);
   x.textAlign='center';
   x.fillStyle='#10E0A0';x.font=F(42,'800');try{x.letterSpacing='8px';}catch(e){}
   x.fillText('LOGRO DESBLOQUEADO',540,1310);try{x.letterSpacing='0px';}catch(e){}
   titulo(x,1460);
   x.fillStyle='rgba(234,251,244,.86)';x.font=F(46,'600');x.fillText(SUB,540,1548);
   x.fillStyle='#FFFFFF';x.font=F(48,'800');x.fillText(NOMBRE,540,1632);
   x.fillStyle='rgba(234,251,244,.62)';x.font=F(32,'600');x.fillText(PIE,540,1706);
   out.G=cv.toDataURL('image/png');}

  // ── H · MITAD Y MITAD: foto arriba a sangre con corte limpio, bloque de marca abajo ─────
  {const [cv,x]=nuevo(); fondo(x,true);
   aSangre(x,1020,1.25);
   x.fillStyle='rgba(16,224,160,.9)';x.fillRect(0,1016,1080,6);
   veloArriba(x); marca(x,250);
   x.textAlign='center';
   x.fillStyle='#10E0A0';x.font=F(42,'800');try{x.letterSpacing='8px';}catch(e){}
   x.fillText('LOGRO DESBLOQUEADO',540,1160);try{x.letterSpacing='0px';}catch(e){}
   titulo(x,1320);
   x.fillStyle='rgba(234,251,244,.82)';x.font=F(46,'600');x.fillText(SUB,540,1410);
   x.fillStyle='#FFFFFF';x.font=F(50,'800');x.fillText(NOMBRE,540,1500);
   pie(x,1580,1650);
   out.H=cv.toDataURL('image/png');}

  return out;
})()`);

let n = 0;
for (const [k, dataUrl] of Object.entries(salida || {})) {
  writeFileSync(`${RAIZ}/scripts/_logro-${k}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  n++;
}
console.log(`  🖼️  ${n} variantes en scripts/_logro-*.png — MIRARLAS`);
console.log('  jsErrors: ' + JSON.stringify(jsErrors));
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(n && !jsErrors.length ? 0 : 1);
