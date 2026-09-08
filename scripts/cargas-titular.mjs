#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// cargas-titular.mjs — ¿qué número muestra hoy el panel «Cargas» y cuánto miente?
//
// Nace del hallazgo D3-1 (auditoría 7-sep-2026): `renderProgressPanel` pinta como titular
// `pts[pts.length-1].maxKg` (el peso máximo de la ÚLTIMA sesión) sin rotularlo, y la flecha
// ↑/↓ compara esa última sesión contra la PRIMERA de toda la historia.
//
// Mide, con la función REAL de la app (`computeExerciseProgress` de avi-core, no una copia):
//   1. cuántos ejercicios tienen titular ≠ récord del historial
//   2. cuántos salen marcados «↓ bajando» habiendo progreso real (récord > primera sesión)
//   3. qué pasaría con cada definición candidata de tendencia, para elegir con números
//
// CONTROLES (van dentro, no aparte):
//   · cobertura      — cuántas personas/ejercicios entran realmente al panel
//   · discriminación — el mismo cálculo contra `ax_pr` (la otra fuente) para ver si concuerdan
//   · unidad         — se cuenta EJERCICIOS-de-una-persona en kg, no personas ni sesiones
//
// Lee de Supabase con ~/.avi/service-role.key. NO escribe nada.
//   node scripts/cargas-titular.mjs [--detalle]
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require(join(import.meta.dirname, '..', 'avi-core.js'));

const DETALLE = process.argv.includes('--detalle');
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';

let KEY;
try { KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim(); }
catch { console.error('Falta la llave en ~/.avi/service-role.key'); process.exit(1); }

const r = await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,role,profile,history,prs&role=eq.client`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
if (!r.ok) { console.error('Supabase respondió', r.status, await r.text()); process.exit(1); }
const filas = await r.json();

let personas = 0, personasConEx = 0, totEx = 0, exKg = 0;
let titularDistinto = 0, bajandoFalso = 0, bajandoReal = 0, estableHoy = 0, subiendoHoy = 0;
let ultimaBajoRecord = 0, ultimaEsRecord = 0;
let prsComparables = 0, prsCoincide = 0;
const distEstanc = { s1: 0, s2: 0, s3mas: 0 };   // sesiones seguidas sin superar el récord
const casos = [], casosFalsos = [];

for (const f of filas) {
  const p = f.profile || {};
  const nombre = p.name || '(sin nombre)';
  if (/^qa[- ]/i.test(nombre) || /^qa-(coach|harness)@/i.test(p.email || '')) continue;
  personas++;
  const hist = f.history || [];
  const prog = core.computeExerciseProgress(hist);       // ← la función REAL de la app
  if (prog.length) personasConEx++;
  const prs = f.prs || {};
  for (const ex of prog) {
    totEx++;
    if ((ex.unit || 'kg') !== 'kg') continue;            // el panel mezcla unidades; aquí solo kg
    exKg++;
    const pts = ex.points;
    const last = pts[pts.length - 1].maxKg;
    const first = pts[0].maxKg;
    const record = Math.max(...pts.map(x => x.maxKg));

    if (last !== record) { titularDistinto++; ultimaBajoRecord++; }
    else ultimaEsRecord++;

    // Clasificación de HOY (última vs primera) — lo que pinta la app
    if (last > first) subiendoHoy++;
    else if (last < first) {
      if (record > first) { bajandoFalso++; casosFalsos.push({ nombre, ex: ex.name, first, last, record }); }
      else bajandoReal++;
    } else estableHoy++;

    // ¿Cuántas sesiones lleva sin volver a tocar su récord?
    let sinSuperar = 0;
    for (let i = pts.length - 1; i >= 0; i--) { if (pts[i].maxKg >= record) break; sinSuperar++; }
    if (sinSuperar >= 3) distEstanc.s3mas++; else if (sinSuperar === 2) distEstanc.s2++; else if (sinSuperar === 1) distEstanc.s1++;

    // CONTROL de discriminación: la otra fuente (ax_pr) contra el récord del historial
    const pr = prs[ex.key] || prs[ex.name];
    if (pr && parseFloat(pr.val ?? pr.kg) > 0) {
      prsComparables++;
      if (Math.abs(parseFloat(pr.val ?? pr.kg) - record) < 0.01) prsCoincide++;
    }
    casos.push({ nombre, ex: ex.name, first, last, record, sesiones: pts.length, sinSuperar });
  }
}

const pct = (a, b) => b ? (a * 100 / b).toFixed(1) + '%' : '—';
console.log(`\n── COBERTURA (control) ──`);
console.log(`   ${personas} asesorados reales · ${personasConEx} con algún ejercicio con historial`);
console.log(`   ${totEx} ejercicios-persona con puntos · ${exKg} de ellos en kg (los medidos)`);

console.log(`\n── 1. EL TITULAR ──`);
console.log(`   titular (última sesión) ≠ récord: ${titularDistinto} de ${exKg}  (${pct(titularDistinto, exKg)})`);
console.log(`   la última sesión ES el récord:    ${ultimaEsRecord} de ${exKg}  (${pct(ultimaEsRecord, exKg)})`);

console.log(`\n── 2. LA FLECHA, COMO ESTÁ HOY (última vs primera) ──`);
console.log(`   ↑ subiendo: ${subiendoHoy}   ↔ estable: ${estableHoy}   ↓ bajando: ${bajandoFalso + bajandoReal}`);
console.log(`   🔴 de esos «↓ bajando», ${bajandoFalso} tienen récord POR ENCIMA de su primera sesión`);
console.log(`      (o sea: hubo progreso real y la pantalla lo cuenta como retroceso)`);
console.log(`      «↓» sin progreso ninguno (récord = primera): ${bajandoReal}`);

console.log(`\n── 3. CANDIDATA: la flecha = récord vs primera ──`);
const subeRec = casos.filter(c => c.record > c.first).length;
const igualRec = casos.filter(c => c.record === c.first).length;
const bajaRec = casos.filter(c => c.record < c.first).length;
console.log(`   ↑ subiendo: ${subeRec}   ↔ estable: ${igualRec}   ↓ bajando: ${bajaRec}  ← imposible por construcción`);
console.log(`   ⇒ un filtro «bajando» sobre esta definición queda SIEMPRE vacío. Candidato de relevo:`);
console.log(`     sesiones seguidas por debajo del récord → 1: ${distEstanc.s1} · 2: ${distEstanc.s2} · 3+: ${distEstanc.s3mas}`);

console.log(`\n── CONTROL DE DISCRIMINACIÓN: ax_pr vs récord del historial ──`);
console.log(`   coinciden ${prsCoincide} de ${prsComparables} comparables (${pct(prsCoincide, prsComparables)})`);
console.log(`   ⇒ si esto NO fuera alto, computar del historial sería tan sospechoso como leer ax_pr.`);

if (DETALLE) {
  console.log(`\n── LOS «↓ bajando» FALSOS, uno por uno ──`);
  casosFalsos.sort((a, b) => (b.record - b.last) - (a.record - a.last))
    .forEach(c => console.log(`   ${c.nombre.padEnd(20)} ${c.ex.slice(0, 34).padEnd(36)} muestra ${String(c.last).padStart(5)} kg · récord ${String(c.record).padStart(5)} kg · 1ª ${c.first}`));
  console.log(`\n── LOS 12 TITULARES MÁS LEJOS DE SU RÉCORD ──`);
  casos.filter(c => c.last !== c.record).sort((a, b) => (b.record - b.last) - (a.record - a.last)).slice(0, 12)
    .forEach(c => console.log(`   ${c.nombre.padEnd(20)} ${c.ex.slice(0, 34).padEnd(36)} muestra ${String(c.last).padStart(5)} kg · récord ${String(c.record).padStart(5)} kg`));
}
