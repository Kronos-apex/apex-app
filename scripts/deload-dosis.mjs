#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// deload-dosis.mjs — las 7 mediciones que pidió Andrés Hyp antes de fijar la dosis
// de la semana de descarga (dictamen 2026-08-14).
//
// Él firma carga 0,85 × series 0,60 (~49% del tonelaje) y RECHAZA carga 0,50 con series
// recortadas (~29%). Su alternativa si el PO sostiene el 0,50: series SIN recorte y piso 3.
// Las dos terminan en ~50% del trabajo habitual; la pregunta es de dónde sale esa mitad.
// Estas mediciones son las que deciden, y las pidió él explícitamente en vez de predecir
// (precedente: su predicción del umbral 0,05 de proteína salió la PEOR fila al medirla).
//
//   node scripts/deload-dosis.mjs
//
// READ-ONLY sobre los mismos 21 asesorados. Lee la service role key de ~/.avi/service-role.key.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require(join(import.meta.dirname, '..', 'avi-core.js'));

const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const CARGA_A = 0.85, CARGA_B = 0.50;   // las dos dosis en discusión
const MANTEN_SERIES = 4;                // series/semana por músculo bajo las cuales se pierde estímulo

let KEY;
try { KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim(); }
catch { console.error('Falta ~/.avi/service-role.key'); process.exit(1); }

const r = await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,profile,routines,history,prs&role=eq.client`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!r.ok) { console.error('Supabase respondió', r.status, await r.text()); process.exit(1); }
const filas = await r.json();
const AHORA = new Date();

// %1RM implícito de una serie a `reps` repeticiones (inversa de Epley, la misma que usa la app).
const pct1rm = reps => 1 / (1 + reps / 30);
// Repeticiones que se podrían hacer con ese %1RM (Epley al revés) — para leer «cuánto le sobra».
const repsPosibles = p => Math.round((1 / p - 1) * 30);
const mediana = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (a, b) => b ? (a / b * 100).toFixed(0) : '0';

const gente = [];
const repsTodas = [];
const casosCarga = [];

for (const f of filas) {
  const p = f.profile || {};
  const nombre = p.name || '(sin nombre)';
  if (/^qa[- ]/i.test(nombre) || /^qa-(coach|harness)@/i.test(p.email || '')) continue;
  const rutinas = f.routines || [];
  if (!rutinas.length) continue;
  const client = Object.assign({ id: f.user_id }, p, { routines: rutinas });
  const history = { [f.user_id]: f.history || [] };
  const prs = f.prs || {};
  const enAdapt = core.isInAdaptation(client, history, AHORA);
  const dias = core.planDays(client);

  const musculoN = {}, musculoD = {};
  let ex = 0, exPeso = 0, setsMenor3 = 0, exConSets = 0, sug = 0;
  const reps = [];
  for (const rt of rutinas) for (const e of (rt.exercises || [])) {
    ex++;
    const n = parseInt(e.sets);
    if (n > 0) {
      exConSets++;
      if (core.deloadSets(n) === n) setsMenor3++;   // el recorte de series NO lo toca
      const m = e.muscle || '(sin músculo)';
      musculoN[m] = (musculoN[m] || 0) + n;
      musculoD[m] = (musculoD[m] || 0) + core.deloadSets(n);
    }
    if (core.exTrack(e) !== 'peso_reps') continue;
    exPeso++;
    const objetivo = parseInt(e.reps) || 10;
    reps.push(objetivo); repsTodas.push(objetivo);
    if (enAdapt) continue;
    const pr = prs[e.id || e.name];
    if (!pr) continue;
    const prKg = parseFloat(pr.val != null ? pr.val : pr.kg);
    if (!(prKg > 0)) continue;
    if (!core.suggestFromPR(pr, objetivo)) continue;
    sug++;
    casosCarga.push({ nombre, ex: e.name || e.id, prKg, objetivo });
  }
  gente.push({ nombre, nivel: p.level, dias, enAdapt, ex, exPeso, exConSets, setsMenor3, sug, reps, musculoN, musculoD });
}

console.log(`\n══════ LAS 7 MEDICIONES DE ANDRÉS · ${gente.length} asesorados con rutina · ${AHORA.toISOString().slice(0, 10)} ══════`);

// ── 1. ¿En qué %1RM deja realmente cada dosis? ───────────────────────────────
console.log(`\n【1】 EL %1RM QUE DEJA CADA DOSIS  (Andrés supuso 12 reps típicas — aquí está el dato real)`);
const medReps = mediana(repsTodas);
console.log(`  repeticiones de los ejercicios de peso: mediana ${medReps} · min ${Math.min(...repsTodas)} · max ${Math.max(...repsTodas)} (${repsTodas.length} ejercicios)`);
const tabla = [];
for (const reps of [8, 10, 12, 15, 20]) {
  const cuantos = repsTodas.filter(r2 => r2 === reps).length;
  if (!cuantos) continue;
  const base = pct1rm(reps);
  tabla.push({ reps, cuantos, base, a: base * CARGA_A, b: base * CARGA_B });
}
console.log(`  reps │ cuántos │ hoy es %1RM │ con ×${CARGA_A} │ con ×${CARGA_B} │ reps que le sobrarían al ×${CARGA_B}`);
for (const t of tabla) {
  console.log(`   ${String(t.reps).padStart(3)} │ ${String(t.cuantos).padStart(7)} │ ${(t.base * 100).toFixed(0).padStart(10)}% │ ${(t.a * 100).toFixed(0).padStart(7)}% │ ${(t.b * 100).toFixed(0).padStart(7)}% │ podría hacer ~${repsPosibles(t.b)} y el plan le pide ${t.reps}`);
}
const medBase = pct1rm(medReps);
console.log(`  → con la mediana real (${medReps} reps): hoy ${(medBase * 100).toFixed(0)}% 1RM · ×${CARGA_A} → ${(medBase * CARGA_A * 100).toFixed(0)}% · ×${CARGA_B} → ${(medBase * CARGA_B * 100).toFixed(0)}%`);

// ── 2. Series semanales por músculo, normal vs descarga ──────────────────────
console.log(`\n【2】 SERIES POR MÚSCULO Y SEMANA — ¿cuántos quedan bajo el umbral de mantenimiento?`);
let pares = 0, bajoTercio = 0, bajo4 = 0, bajo4Antes = 0;
const peores = [];
for (const g of gente) for (const m of Object.keys(g.musculoN)) {
  pares++;
  const n = g.musculoN[m], d = g.musculoD[m];
  if (d < n / 3) bajoTercio++;
  if (n < MANTEN_SERIES) bajo4Antes++;
  if (d < MANTEN_SERIES) { bajo4++; peores.push(`${g.nombre}/${m}: ${n}→${d}`); }
}
console.log(`  pares persona-músculo: ${pares}`);
console.log(`  caen bajo 1/3 de su volumen normal .......... ${bajoTercio} (${pct(bajoTercio, pares)}%)`);
console.log(`  quedan bajo ${MANTEN_SERIES} series/semana en descarga ....... ${bajo4} (${pct(bajo4, pares)}%)  ← ya estaban bajo ${MANTEN_SERIES} SIN descarga: ${bajo4Antes}`);
console.log(`  los que caen bajo ${MANTEN_SERIES}: ${peores.slice(0, 14).join(' · ')}${peores.length > 14 ? ` … (+${peores.length - 14})` : ''}`);

// ── 3. Quién entrena ≤2 días ─────────────────────────────────────────────────
console.log(`\n【3】 QUIÉN ENTRENA ≤2 DÍAS/SEMANA  (Andrés: a estos NO les recortaría series)`);
const pocos = gente.filter(g => g.dias <= 2);
console.log(`  ${pocos.length} de ${gente.length}: ${pocos.map(g => `${g.nombre} (${g.dias}d)`).join(', ') || '—'}`);
for (const g of pocos) {
  const bajo = Object.keys(g.musculoN).filter(m => g.musculoD[m] < MANTEN_SERIES).length;
  console.log(`    ${g.nombre}: ${Object.keys(g.musculoN).length} músculos, ${bajo} quedarían bajo ${MANTEN_SERIES} series en descarga`);
}

// ── 4. Ejercicios que el recorte de series NO toca ───────────────────────────
console.log(`\n【4】 EJERCICIOS A LOS QUE EL RECORTE DE SERIES NO LES HACE NADA (ya están en el piso)`);
const totCon = gente.reduce((s, g) => s + g.exConSets, 0), totMenor = gente.reduce((s, g) => s + g.setsMenor3, 0);
console.log(`  ${totMenor} de ${totCon} ejercicios con series (${pct(totMenor, totCon)}%)`);
const dobleCero = gente.filter(g => g.sug === 0 && g.setsMenor3 > 0);
console.log(`  🔴 CRUCE — personas sin bajada de carga Y con ejercicios que tampoco pierden series:`);
for (const g of dobleCero) console.log(`     ${g.nombre}: ${g.setsMenor3} de ${g.exConSets} ejercicios sin recorte de series, y 0 ejercicios con carga bajada`);
if (!dobleCero.length) console.log('     (ninguna)');

// ── 5. Quién solo recibiría la FRASE ─────────────────────────────────────────
console.log(`\n【5】 QUIÉN SOLO RECIBIRÍA EL TEXTO (la app no le sugiere peso a nadie de estos)`);
const soloFrase = gente.filter(g => g.sug === 0);
console.log(`  ${soloFrase.length} de ${gente.length}`);
for (const g of soloFrase) console.log(`    ${g.nombre} [${g.nivel || '?'}]${g.enAdapt ? ' · EN ADAPTACIÓN ← Andrés pide GATEAR el texto aquí' : ''} — ${g.exPeso} ejercicios de peso sin sugerencia`);

// ── 6. ¿La carga reducida cae en un peso que EXISTE? ─────────────────────────
console.log(`\n【6】 ¿EL PESO REDUCIDO EXISTE EN EL GIMNASIO?  (rejilla de loadStep: 1 / 2,5 / 5 kg)`);
for (const [et, factor] of [[`×${CARGA_A}`, CARGA_A], [`×${CARGA_B}`, CARGA_B]]) {
  let fuera = 0, bajo25 = 0, bajo1 = 0;
  for (const c of casosCarga) {
    const kg = Math.round(c.prKg * factor * 2) / 2;
    const paso = core.loadStep(kg);
    if (Math.abs(kg / paso - Math.round(kg / paso)) > 1e-9) fuera++;
    if (kg < 2.5) bajo25++;
    if (kg < 1) bajo1++;
  }
  console.log(`  ${et}: ${fuera} de ${casosCarga.length} caen FUERA de la rejilla · ${bajo25} quedan bajo 2,5 kg · ${bajo1} bajo 1 kg`);
}
const livianos = casosCarga.filter(c => c.prKg < 10);
console.log(`  récords bajo 10 kg (donde el porcentaje es el instrumento equivocado): ${livianos.length} de ${casosCarga.length}`);
for (const c of livianos.slice(0, 8)) console.log(`    ${c.nombre} · ${c.ex}: récord ${c.prKg} kg → ×${CARGA_A} = ${Math.round(c.prKg * CARGA_A * 2) / 2} · ×${CARGA_B} = ${Math.round(c.prKg * CARGA_B * 2) / 2}`);

// ── 7. ¿Alguna descarga ha corrido alguna vez? ───────────────────────────────
console.log(`\n【7】 ¿ALGUNA VEZ HA CORRIDO UNA SEMANA DE DESCARGA?`);
const conDeload = filas.filter(f => (f.profile || {}).deload);
console.log(`  filas con estado de descarga guardado: ${conDeload.length}`);
if (conDeload.length) for (const f of conDeload) console.log(`    ${(f.profile.name || '?')}: ${JSON.stringify(f.profile.deload).slice(0, 160)}`);
else console.log(`  🔴 NINGUNA. No hay ni un dato de resultado: la dosis se calibra sobre literatura prestada,`);
console.log(`     y eso hay que decírselo al PO tal cual. (El campo se borra al cerrarla, así que esto`);
console.log(`     solo prueba que NO HAY UNA ACTIVA — no que nunca haya corrido. Sin telemetría no se sabe.)`);
