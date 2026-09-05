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
  // Hoja de contactos: el nombre de AVI contra la foto propuesta, para el OJO.
  const html = `<meta charset="utf-8"><title>Referencias propuestas</title><style>
body{margin:0;background:#0d0d0d;color:#eee;font:13px system-ui}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;padding:12px}
figure{margin:0;background:#1a1a1a;border-radius:8px;overflow:hidden}
img{width:100%;height:160px;object-fit:cover;display:block;background:#000}
figcaption{padding:7px 9px;line-height:1.35}
b{color:#10E0A0;font-size:12px;display:block}
span{color:#8a8a8a;font-size:11px;display:block;margin-top:2px}
</style><div class="g">` + fuerte.map(f =>
  `<figure><img src="img/${f.id}.jpg" alt=""><figcaption><b>${f.id} · ${f.name}</b>` +
  `<span>banco: ${f.top[0].name} [${f.top[0].eq}] · ${f.top[0].score}</span></figcaption></figure>`
).join('') + '</div>';
  writeFileSync(join(REF_DIR, 'revisar.html'), html);
  console.log(`  hoja de contactos → ${join(REF_DIR, 'revisar.html')}  (ábrela y descarta las que no son)\n`);
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
