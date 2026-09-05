#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// fotos-referencias.mjs — busca la REFERENCIA de cada ejercicio sin foto y, con
// ella, genera la imagen con el look AVI. (2026-09-05)
//
// EL BANCO: free-exercise-db (github.com/yuhonas/free-exercise-db), DOMINIO
// PÚBLICO, 873 ejercicios con foto y en pares inicio/final — la misma convención
// `eNNN.jpg` / `eNNN_f.jpg` que ya usa la app. Se consulta, no se redistribuye:
// las referencias quedan FUERA del repo, en ~/.avi/ref-ejercicios/.
//
// 🔒 EL CANDADO DE APARATO, que es la lección del lote. Emparejar por nombre a
// secas produce el error de v498: se miraron 12 candidatos y **6 estaban mal**,
// todos por lo mismo — «Elevaciones Laterales EN MÁQUINA» emparejaba con un tipo
// con mancuernas, «Sumo CON MANCUERNA» con una barra, «Patada EN POLEA» con una
// mancuerna. Por eso: **si el nombre de AVI declara aparato, el candidato tiene
// que traer ESE aparato o se descarta.** Preferir NADA a una foto de otro
// movimiento: el asesorado copia lo que ve.
//
// ⚠️ Y ni con el candado se publica a ciegas. `machine` es una etiqueta gruesa:
// una prensa de 45° y una prensa horizontal sentada son las dos `machine`. El
// modo --revisar arma la hoja de contactos para mirarlas UNA POR UNA.
//
//   node scripts/fotos-referencias.mjs --cruzar     (empareja y reporta)
//   node scripts/fotos-referencias.mjs --bajar      (+ descarga las referencias)
//   node scripts/fotos-referencias.mjs --revisar    (hoja de contactos para el ojo)
//   node scripts/fotos-referencias.mjs --generar e240 e235   (necesita GEMINI_API_KEY CON SALDO)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url);
const REF_DIR = join(homedir(), '.avi', 'ref-ejercicios');   // JAMÁS dentro del repo
const BANCO = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Catálogo de AVI y qué le falta ───────────────────────────────────────────
const src = readFileSync(new URL('app-1-infra.js', RAIZ), 'utf8');
const marcas = [...src.matchAll(/\{id:'(e\d+)',/g)];
const cat = marcas.map((m, i) => {
  const b = src.slice(m.index, marcas[i + 1] ? marcas[i + 1].index : src.length);
  const campo = k => (new RegExp(k + ":'((?:[^'\\\\]|\\\\.)*)'").exec(b) || [, ''])[1].replace(/\\'/g, "'");
  return { id: m[1], name: campo('name'), muscle: campo('muscle'), desc: campo('desc') };
});
if (cat.length < 100 || cat.some(e => !e.name)) { console.error('🔴 sonda incompleta'); process.exit(1); }
const conFoto = new Set(readdirSync(new URL('media/exercises', RAIZ))
  .filter(f => f.endsWith('.jpg')).map(f => f.replace('.jpg', '')));
const sin = cat.filter(e => !conFoto.has(e.id));

// ── Glosario es→en del oficio ────────────────────────────────────────────────
const G = {
  press:['press'], banca:['bench'], banco:['bench'], pecho:['chest'], maquina:['machine'],
  polea:['cable'], mancuerna:['dumbbell'], mancuernas:['dumbbell'], barra:['barbell','bar'],
  z:['ez'], ez:['ez'], recta:['straight'], banda:['band','bands'], bandas:['band','bands'],
  elastica:['band'], curl:['curl'], biceps:['curl','bicep'], triceps:['tricep','triceps'],
  extension:['extension'], espalda:['back'], dominadas:['pullup','pull','chinup'],
  dominada:['pullup','pull'], supina:['chin'], asistidas:['assisted'], asistida:['assisted'],
  remo:['row'], jalon:['pulldown','pull'], hombro:['shoulder'], hombros:['shoulder'],
  militar:['military','shoulder'], elevaciones:['raise'], elevacion:['raise'],
  laterales:['lateral','side'], lateral:['lateral','side'], frontales:['front'],
  posteriores:['rear'], pajaro:['rear'], pierna:['leg'], piernas:['leg','legs'],
  prensa:['leg','press'], sentadilla:['squat'], cuadriceps:['quad','leg','extension'],
  femoral:['leg','curl','hamstring'], muerto:['deadlift'], peso:['deadlift'],
  rumano:['romanian'], sumo:['sumo'], rigidas:['stiff'], zancada:['lunge'],
  desplante:['lunge'], desplantes:['lunge'], bulgara:['bulgarian'], gemelo:['calf'],
  gemelos:['calf'], talones:['calf'], gluteo:['glute'], gluteos:['glute'], cadera:['hip'],
  patada:['kickback','kick'], puente:['bridge'], thrust:['thrust'], hip:['hip'],
  abduccion:['abductor'], aduccion:['adductor'], hiperextension:['hyperextension'],
  romano:['roman'], abdominal:['crunch','ab'], abdominales:['crunch','ab'],
  core:['crunch','ab'], crunch:['crunch'], plancha:['plank'], oblicuos:['oblique'],
  colgado:['hanging'], colgada:['hanging'], rodillas:['knee'], rodilla:['knee'],
  disco:['plate','weighted'], cuerda:['rope'], multipower:['smith'], smith:['smith'],
  inclinado:['incline'], inclinada:['incline'], declinado:['decline'], declinada:['decline'],
  sentado:['seated'], sentada:['seated'], pie:['standing'], tumbado:['lying'],
  acostado:['lying'], mano:['one','single'], unilateral:['one','single'], una:['one'],
  agarre:['grip'], cerrado:['close'], amplio:['wide'], neutro:['neutral','hammer'],
  martillo:['hammer'], trasnuca:['overhead'], frances:['skullcrusher','lying'],
  scott:['preacher'], predicador:['preacher'], concentrado:['concentration'],
  aperturas:['fly','flye'], apertura:['fly','flye'], contractora:['pec','deck'],
  pullover:['pullover'], encogimiento:['shrug'], face:['face'], pull:['pull'],
  fondos:['dip'], paralelas:['dip'], flexiones:['pushup','push'], lagartijas:['pushup'],
  pica:['pike'], step:['step'], cajon:['box'], salto:['jump'], comba:['rope','jump'],
  burpee:['burpee'], cinta:['treadmill'], caminata:['walking'], carrera:['running'],
  eliptica:['elliptical'], ergometro:['rowing'], trineo:['sled'], empuje:['push'],
  granjero:['farmers'], lenador:['chop'], giro:['twist'], ruso:['russian'],
  superman:['superman'], rueda:['wheel'], goblet:['goblet'], cosaco:['cossack'],
  hack:['hack'], clamshell:['clam'], concha:['clam'], chaleco:['weighted'],
  lastrado:['weighted'], hollow:['hollow'], dragon:['dragon'], bicicleta:['bicycle'],
};
const PARAR = new Set(['de','en','con','la','el','los','las','a','y','del','al','para','sobre','su','un','una']);
const saco = n => {
  const o = new Set();
  norm(n).split(' ').filter(w => w && !PARAR.has(w))
    .forEach(w => { if (G[w]) G[w].forEach(x => o.add(x)); else if (/^[a-z]{3,}$/.test(w)) o.add(w); });
  return o;
};

// 🔒 EL CANDADO. Qué aparato declara cada lado.
const aparatoAvi = n => {
  const s = norm(n);
  if (/\bmultipower\b|\bsmith\b/.test(s)) return 'smith';
  if (/\bmaquina\b|\bprensa\b|\bcontractora\b|pec deck|\basistid/.test(s)) return 'machine';
  if (/\bpolea\b|\bcable\b|crossover/.test(s)) return 'cable';
  if (/\bmancuerna/.test(s)) return 'dumbbell';
  if (/\bbanda|elastica/.test(s)) return 'bands';
  if (/\bbarra\b/.test(s)) return 'barbell';
  if (/pesa rusa|kettlebell/.test(s)) return 'kettlebells';
  return null;
};
const aparatoDb = e => {
  if (/\bsmith\b/.test(norm(e.name))) return 'smith';
  if (e.equipment === 'e-z curl bar') return 'barbell';
  return ['machine','cable','dumbbell','barbell','bands','body only','kettlebells']
    .includes(e.equipment) ? e.equipment : 'otro';
};

async function banco() {
  const cache = join(REF_DIR, 'exercises.json');
  mkdirSync(REF_DIR, { recursive: true });
  if (!existsSync(cache)) {
    const r = await fetch(`${BANCO}/dist/exercises.json`);
    if (!r.ok) { console.error('No pude bajar el banco:', r.status); process.exit(1); }
    writeFileSync(cache, await r.text());
  }
  return JSON.parse(readFileSync(cache, 'utf8')).filter(e => e.images && e.images.length);
}

function cruza(db) {
  return sin.map(a => {
    const apA = aparatoAvi(a.name), sa = saco(a.name);
    const top = db.map(b => {
      if (apA && aparatoDb(b) !== apA) return null;      // 🔒 el candado
      const sb = new Set(norm(b.name).split(' ').filter(w => w.length > 1));
      let hit = 0; sa.forEach(w => { if (sb.has(w)) hit++; });
      if (!hit) return null;
      return { id: b.id, name: b.name, eq: b.equipment,
               score: +(hit / new Set([...sa, ...sb]).size).toFixed(3) };
    }).filter(Boolean).sort((x, y) => y.score - x.score).slice(0, 3);
    return { ...a, declara: apA, top };
  });
}

const arg = n => process.argv.includes(n);
const db = await banco();
const filas = cruza(db);
const FUERTE = 0.40;
const fuerte = filas.filter(f => f.top[0] && f.top[0].score >= FUERTE);
const flojo = filas.filter(f => f.top[0] && f.top[0].score < FUERTE);
const nada = filas.filter(f => !f.top[0]);

console.log(`\n══ REFERENCIAS · ${sin.length} sin foto, banco de ${db.length} ══\n`);
console.log(`  con aparato correcto y nombre fuerte (>=${FUERTE}) : ${fuerte.length}`);
console.log(`  aparato correcto pero nombre flojo                : ${flojo.length}`);
console.log(`  sin candidato válido                              : ${nada.length}`);
console.log(`\n  ⚠️  «fuerte» NO quiere decir «correcta»: hay que MIRARLAS (--revisar).\n`);

if (arg('--bajar') || arg('--revisar')) {
  mkdirSync(join(REF_DIR, 'img'), { recursive: true });
  let ok = 0, ya = 0;
  for (const f of fuerte) {
    const dest = join(REF_DIR, 'img', f.id + '.jpg');
    if (existsSync(dest) && statSync(dest).size > 3000) { ya++; continue; }
    const r = await fetch(`${BANCO}/exercises/${encodeURI(f.top[0].id)}/0.jpg`);
    if (!r.ok) continue;
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
  }
  console.log(`  referencias descargadas: ${ok} nuevas, ${ya} ya estaban → ${join(REF_DIR, 'img')}\n`);
}

if (arg('--revisar')) {
  // ── LA HOJA DE TRABAJO ──────────────────────────────────────────────────────────────
  // El PO genera las imagenes el mismo, en la cuenta gratis de Gemini. O sea que lo que
  // necesita en pantalla no es solo la referencia: es el PROMPT listo para pegar, al lado
  // de la foto que va a adjuntar. Van las 141, no solo las que tienen referencia — el
  // prompt no la necesita (asi se hicieron las 109 originales); la referencia AYUDA.
  //
  // 🔒 LA FRASE DEL MOVIMIENTO VA EN ESPANOL, con el texto de tecnica que YA vive en la
  //    app (`desc`). Lo escribieron el y Laura y esta verificado: traducirlo yo seria
  //    meter errores mios en 141 prompts. Gemini es multilingue. El BLOQUE DE ESTILO si
  //    va en ingles y VERBATIM del doc del PO — es lo que da la serie cohesiva.
  let ESTILO = '';
  try {
    ESTILO = readFileSync(new URL('../../PROMPTS-EJERCICIOS-AVI.md', import.meta.url), 'utf8').split('```')[1].trim();
  } catch (e) { /* el doc vive fuera del repo; si no esta, se avisa abajo */ }
  if (!ESTILO || ESTILO.length < 400) {
    console.error('🔴 No pude leer el BLOQUE DE ESTILO de PROMPTS-EJERCICIOS-AVI.md — la hoja saldria sin el look AVI.');
    process.exit(1);
  }

  const esc = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // El punto del rep se pide EXPLICITO: es lo que el doc marca como truco, y sin eso el
  // modelo dibuja una pose neutra que no ensena el movimiento.
  const promptDe = f => {
    const ap = f.declara ? `El aparato es OBLIGATORIO y tiene que verse completo: ${f.declara === 'smith' ? 'multipower (máquina Smith)' : f.declara === 'machine' ? 'máquina' : f.declara === 'cable' ? 'polea con su cable y su torre' : f.declara === 'dumbbell' ? 'mancuerna' : f.declara === 'bands' ? 'banda elástica' : f.declara === 'barbell' ? 'barra' : f.declara}.` : '';
    return [
      `Un atleta hombre haciendo: ${f.name}.`,
      f.desc,
      ap,
      'Captúralo en el punto más claro del movimiento (abajo, a media subida o en la contracción máxima), con los ángulos de codo y rodilla bien visibles. Ángulo de cámara: el que mejor muestre el gesto (lateral o 3/4).',
      '',
      ESTILO,
    ].filter(Boolean).join('\n');
  };

  const orden = [...filas].sort((a, b) =>
    (b.top.length ? 1 : 0) - (a.top.length ? 1 : 0) || a.id.localeCompare(b.id, 'es', { numeric: true }));

  const tarjetas = orden.map(f => {
    const tieneRef = !!(f.top[0] && existsSync(join(REF_DIR, 'img', f.id + '.jpg')));
    return `<article class="c" data-id="${esc(f.id)}" data-ref="${tieneRef ? 1 : 0}">
  <div class="ph">${tieneRef
      ? `<img src="img/${esc(f.id)}.jpg" alt="referencia de ${esc(f.name)}" loading="lazy">`
      : '<div class="sinref">sin referencia<br><small>el prompt igual sirve</small></div>'}</div>
  <div class="bd">
    <h3>${esc(f.id)} · ${esc(f.name)}</h3>
    <p class="sub">${tieneRef ? 'adjunta a Gemini: <code>img\\\\' + esc(f.id) + '.jpg</code>' : 'sin foto de referencia en el banco'}</p>
    ${f.top[0] ? `<p class="sub2">banco: ${esc(f.top[0].name)} [${esc(f.top[0].eq)}]</p>` : ''}
    <button class="cp" type="button">Copiar el prompt</button>
    <details><summary>ver el prompt</summary><pre>${esc(promptDe(f))}</pre></details>
  </div></article>`;
  }).join('\n');

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prompts y referencias — fotos que faltan</title><style>
:root{--bg:#0b0f0d;--sf:#141a17;--sf2:#1b231e;--tx:#e8f2ec;--t2:#94a89d;--ac:#10E0A0;--ln:#232e27}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{padding:20px 16px 12px;border-bottom:1px solid var(--ln)}
h1{margin:0;font-size:22px;letter-spacing:-.01em}
.lede{margin:8px 0 0;color:var(--t2);max-width:75ch}
.lede b{color:var(--tx)}
.bar{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--ln);z-index:3}
.bar button{font:inherit;font-size:13px;padding:6px 12px;border-radius:999px;background:var(--sf);color:var(--t2);border:1px solid var(--ln);cursor:pointer}
.bar button[aria-pressed=true]{background:var(--ac);color:#04170f;border-color:var(--ac);font-weight:600}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;padding:14px 16px 60px}
.c{background:var(--sf);border:1px solid var(--ln);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.ph{background:#000;aspect-ratio:3/2}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.sinref{height:100%;display:grid;place-content:center;text-align:center;color:#5d6b63;font-size:12px;background:var(--sf2)}
.bd{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px}
h3{margin:0;font-size:14px;color:var(--ac);font-weight:600;line-height:1.3}
.sub,.sub2{margin:0;font-size:11.5px;color:var(--t2)}
.sub2{color:#5d6b63}
code{background:var(--sf2);padding:1px 5px;border-radius:4px;font-size:11px}
.cp{font:inherit;font-size:13px;font-weight:600;padding:8px 12px;border-radius:7px;cursor:pointer;
    background:var(--ac);color:#04170f;border:0;margin-top:2px}
.cp.ok{background:var(--sf2);color:var(--ac)}
details{margin-top:2px}
summary{cursor:pointer;font-size:12px;color:var(--t2)}
pre{white-space:pre-wrap;word-break:break-word;background:var(--sf2);padding:9px;border-radius:7px;
    font-size:11px;line-height:1.45;max-height:230px;overflow:auto;margin:7px 0 0;color:#c4d4cb}
button:focus-visible,summary:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
</style></head><body>
<header>
  <h1>Prompts y referencias · ${orden.length} ejercicios sin foto</h1>
  <p class="lede">Cada tarjeta trae <b>el prompt listo para pegar en Gemini</b> y, cuando existe,
  <b>la foto de referencia</b> que le adjuntas (está en la carpeta <code>img\\\\</code>, al lado de este archivo).
  La técnica va en español porque es la que ya está escrita y verificada en tu app; el bloque de estilo va en inglés,
  igual al de tu documento. <b>Ninguna entra a la app sin que la mires a tamaño real</b> — en v498, 9 de 22 mostraban otro ejercicio.</p>
</header>
<div class="bar">
  <button id="f-todas" aria-pressed="true">Las ${orden.length}</button>
  <button id="f-ref" aria-pressed="false">Con referencia (${orden.filter(f => f.top[0] && existsSync(join(REF_DIR, 'img', f.id + '.jpg'))).length})</button>
  <button id="f-sin" aria-pressed="false">Sin referencia</button>
</div>
<main class="g">
${tarjetas}
</main>
<script>
(function(){
  // Copiar sin depender de navigator.clipboard: en file:// no siempre existe.
  function copiar(t){
    if(navigator.clipboard&&window.isSecureContext){ return navigator.clipboard.writeText(t); }
    return new Promise(function(res,rej){
      var a=document.createElement('textarea');
      a.value=t; a.setAttribute('readonly',''); a.style.position='fixed'; a.style.opacity='0';
      document.body.appendChild(a); a.select();
      var ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
      document.body.removeChild(a); ok?res():rej();
    });
  }
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('.cp'); if(!b) return;
    var pre=b.parentNode.querySelector('pre');
    copiar(pre.textContent).then(function(){
      b.textContent='Copiado \u2713'; b.classList.add('ok');
      setTimeout(function(){ b.textContent='Copiar el prompt'; b.classList.remove('ok'); },1600);
    }).catch(function(){
      b.textContent='No pude copiar \u2014 abre \u00abver el prompt\u00bb';
      setTimeout(function(){ b.textContent='Copiar el prompt'; },2600);
    });
  });
  var modos=[['f-todas',null],['f-ref','1'],['f-sin','0']];
  modos.forEach(function(p){
    document.getElementById(p[0]).addEventListener('click',function(){
      modos.forEach(function(q){ document.getElementById(q[0]).setAttribute('aria-pressed', q[0]===p[0]?'true':'false'); });
      document.querySelectorAll('.c').forEach(function(c){
        c.hidden = (p[1]!==null && c.getAttribute('data-ref')!==p[1]);
      });
    });
  });
})();
<\/script>
</body></html>`;
  writeFileSync(join(REF_DIR, 'revisar.html'), html);
  console.log(`  hoja de trabajo → ${join(REF_DIR, 'revisar.html')}`);
  console.log('  (cada tarjeta: la referencia para adjuntar + el prompt para pegar en Gemini)\n');
}

if (arg('--generar')) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) { console.error('Falta GEMINI_API_KEY'); process.exit(1); }
  const ids = process.argv.slice(2).filter(a => /^e\d+$/.test(a));
  if (!ids.length) { console.error('Dime qué ids generar: --generar e240 e235'); process.exit(1); }
  // El BLOQUE DE ESTILO va VERBATIM de PROMPTS-EJERCICIOS-AVI.md: es lo que da la serie
  // cohesiva y lo decidió el PO (incluido el #10E0A0 del pecho). No se reescribe aquí.
  const ESTILO = readFileSync(new URL('../../PROMPTS-EJERCICIOS-AVI.md', import.meta.url), 'utf8')
    .split('```')[1];
  if (!ESTILO || ESTILO.length < 400) { console.error('No pude leer el BLOQUE DE ESTILO del doc'); process.exit(1); }
  const MODELO = process.env.MODELO || 'gemini-3-pro-image';
  mkdirSync(join(REF_DIR, 'gen'), { recursive: true });
  for (const id of ids) {
    const f = filas.find(x => x.id === id);
    const ref = join(REF_DIR, 'img', id + '.jpg');
    if (!f || !existsSync(ref)) { console.log(`  ${id}: sin referencia descargada — corre --bajar`); continue; }
    const prompt = `A male athlete performing: ${f.name}. ${f.desc}\n\n${ESTILO}\n\n` +
      'Use the attached photo ONLY as reference for the EQUIPMENT and the BODY POSITION. ' +
      'Do not copy its person, clothing, lighting or background.';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: 'image/jpeg', data: readFileSync(ref).toString('base64') } },
        { text: prompt }] }] }),
    });
    const j = await r.json();
    if (j.error) { console.log(`  ${id}: ${j.error.status} — ${String(j.error.message).slice(0, 90)}`); continue; }
    const p = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    const img = p.find(x => x.inlineData || x.inline_data);
    if (!img) { console.log(`  ${id}: la respuesta no trajo imagen`); continue; }
    const out = join(REF_DIR, 'gen', id + '.png');
    writeFileSync(out, Buffer.from((img.inlineData || img.inline_data).data, 'base64'));
    console.log(`  ${id}: generada → ${out}`);
  }
  console.log('\n  ⚠️  NINGUNA entra a media/exercises sin que el PO la mire a TAMAÑO REAL.');
  console.log('      v498: 9 de 22 mostraban otro ejercicio y las cazó él, no la auditoría.\n');
}
