#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// deload-carga.mjs — ¿la semana de descarga BAJA de verdad la carga?
//
// Nace del reclamo del PO (2026-08-13): «en esa semana solo le bajas el 10% del peso que
// maneja la persona y eso es prácticamente nada». Tenía razón en el dato, y midiendo salió
// peor: el 10% casi nunca llega a la persona.
//
// Mide las DOS mitades de la descarga por separado, porque son mecanismos distintos:
//   · SERIES  → `deloadSets` reescribe el plan. Llega a TODO ejercicio con series.
//   · CARGA   → `DELOAD_LOAD_FACTOR` multiplica el PESO SUGERIDO, que solo existe si el
//               ejercicio es peso+reps, HAY récord guardado y la persona no está en fase de
//               adaptación (`_suggestKg`, app-4-entreno.js). Donde no hay sugerencia, el
//               factor es un no-op: no es un tope, es una recomendación.
//
// 🔴 El número que no se puede leer solo: `suggestFromPR` aplica DOBLE PROGRESIÓN (récord +
// escalón) cuando el récord se hizo con ≥ las reps que pide el plan, y el factor de descarga
// se multiplica DESPUÉS, sobre el número ya subido. Por eso la comparación que importa no es
// «cuánto baja respecto a la sugerencia normal» (eso es el factor, por definición) sino
// **cuánto baja respecto al peso que la persona YA levantó** — su récord.
//
// El factor y los pisos se LEEN de avi-core: si alguien cambia la dosis, este script sigue
// diciendo la verdad en vez de afirmar la cifra vieja.
//
//   node scripts/deload-carga.mjs            → resumen + detalle por persona
//   node scripts/deload-carga.mjs --resumen  → solo el resumen
//
// Lee de Supabase con la service role key de ~/.avi/service-role.key (JAMÁS en el repo).
// NO escribe nada: es una consulta.
//
// ── MEDIDO 2026-08-14, 21 asesorados con rutina, 544 ejercicios, 148 casos comparables ──
//            (comparable = el récord se hizo con ≥ las reps que pide el plan)
//   series 1.899 → 1.091 (−42,5%) en las dos versiones ← esa mitad siempre cumplió
//   la carga solo se ve en 186 de 544 ejercicios (34,2%) — por eso existe `deloadLoadHint`
//
//                      │ v481 (el defecto) │ v482 (arreglado)
//   queda ≥ al récord  │  130 de 148 (88%) │   0 de 148 (0%)
//   mediana            │      +6,7%        │     −15,0%
//   peor / más suave   │  −8,1% / +25,0%   │  −25,0% / −10,0%
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require(join(import.meta.dirname, '..', 'avi-core.js'));

const SOLO_RESUMEN = process.argv.includes('--resumen');
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const FACTOR = core.DELOAD_LOAD_FACTOR;   // se LEE, no se copia

let KEY;
try {
  KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
} catch {
  console.error('Falta la llave en ~/.avi/service-role.key (nunca va en el repo).');
  process.exit(1);
}

const r = await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,role,profile,routines,history,prs&role=eq.client`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!r.ok) { console.error('Supabase respondió', r.status, await r.text()); process.exit(1); }
const filas = await r.json();
const AHORA = new Date();

let personas = 0, totEx = 0, totExPeso = 0, totSug = 0;
let setsAntes = 0, setsDespues = 0;
let noBaja = 0, limpios = 0, limpiosNoBajan = 0;
const deltas = [], deltasLimpios = [], detalle = [];

for (const f of filas) {
  const p = f.profile || {};
  const nombre = p.name || '(sin nombre)';
  // Las cuentas del harness no son población: alimentan los E2E, no entrenan.
  if (/^qa[- ]/i.test(nombre) || /^qa-(coach|harness)@/i.test(p.email || '')) continue;
  const rutinas = f.routines || [];
  if (!rutinas.length) continue;   // sin plan no hay descarga que medir
  personas++;
  const client = Object.assign({ id: f.user_id }, p, { routines: rutinas });
  const history = { [f.user_id]: f.history || [] };
  const prs = f.prs || {};
  // Misma puerta que `_suggestKg`: en adaptación la app NO sugiere peso, así que el factor
  // no llega a esa persona por muchos récords que tenga.
  const enAdapt = core.isInAdaptation(client, history, AHORA);
  let ex = 0, exPeso = 0, sug = 0, sA = 0, sD = 0;
  const casos = [];
  for (const rt of rutinas) for (const e of (rt.exercises || [])) {
    ex++;
    const n = parseInt(e.sets);
    if (n > 0) { sA += n; sD += core.deloadSets(n); }
    if (core.exTrack(e) !== 'peso_reps') continue;
    exPeso++;
    if (enAdapt) continue;
    const pr = prs[e.id || e.name];
    if (!pr) continue;
    const objetivo = parseInt(e.reps) || 10;
    const kgNormal = core.suggestFromPR(pr, objetivo);
    if (!kgNormal) continue;
    sug++;
    const kgDescarga = core.deloadSuggestKg(pr, objetivo);   // la MISMA función que corre en la app
    if (kgDescarga == null) continue;
    const prKg = parseFloat(pr.val != null ? pr.val : pr.kg);
    const delta = (kgDescarga - prKg) / prKg * 100;
    deltas.push(delta);
    // Comparación limpia: si el récord se hizo con ≥ las reps que pide el plan, ese mismo peso
    // NO es más trabajo hoy — así que sugerirlo (o más) no es una descarga por ningún lado.
    const prReps = parseInt(pr.reps) || 1;
    if (prReps >= objetivo) {
      limpios++;
      if (kgDescarga >= prKg) limpiosNoBajan++;
      deltasLimpios.push(delta);
    }
    casos.push({ ex: e.name || e.id, prKg, prReps, objetivo, kgNormal, kgDescarga, delta });
  }
  if (!sug) noBaja++;
  totEx += ex; totExPeso += exPeso; totSug += sug;
  setsAntes += sA; setsDespues += sD;
  detalle.push({ nombre, nivel: p.level, tier: p.tier, enAdapt, ex, exPeso, sug, sA, sD, casos });
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) : '0.0';
const cuantil = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))];

console.log(`\n=== LA SEMANA DE DESCARGA SOBRE PLANES REALES · ${personas} asesorados con rutina ===`);
console.log(`(factor de carga leído de avi-core: ${FACTOR} · series ×${core.DELOAD_SETS_FACTOR} con piso ${core.DELOAD_SETS_MIN} · ${core.DELOAD_DAYS} días)\n`);
console.log(`SERIES  ${setsAntes} → ${setsDespues}   (${((setsDespues / setsAntes - 1) * 100).toFixed(1)}%)`);
console.log(`\nCARGA — ¿a cuántos ejercicios LLEGA siquiera?`);
console.log(`  ejercicios en los planes ................ ${totEx}`);
console.log(`  modalidad peso+reps ..................... ${totExPeso}`);
console.log(`  con peso sugerido de verdad ............. ${totSug}  (${pct(totSug, totEx)}% del plan)`);
console.log(`  personas sin bajada en NINGÚN ejercicio . ${noBaja} de ${personas}`);

if (deltasLimpios.length) {
  deltasLimpios.sort((a, b) => a - b);
  console.log(`\nCARGA — donde llega, ¿baja? (vs el peso que la persona YA levantó)`);
  console.log(`  casos comparables (récord con ≥ las reps del plan): ${limpios}`);
  console.log(`  la sugerencia de descarga queda ≥ a su propio récord: ${limpiosNoBajan} de ${limpios} (${pct(limpiosNoBajan, limpios)}%)`);
  console.log(`  peor ${deltasLimpios[0].toFixed(1)}% · mediana ${cuantil(deltasLimpios, 0.5).toFixed(1)}% · máxima ${deltasLimpios[deltasLimpios.length - 1].toFixed(1)}%`);
}

if (SOLO_RESUMEN) process.exit(0);
console.log('\n=== POR PERSONA ===');
for (const d of detalle) {
  console.log(`\n${d.nombre} [${d.nivel || '?'}${d.tier ? '/' + d.tier : ''}]${d.enAdapt ? ' · EN ADAPTACIÓN → la app no le sugiere peso' : ''}`);
  console.log(`  series ${d.sA} → ${d.sD} · ejercicios ${d.ex} (peso+reps ${d.exPeso}, con sugerencia ${d.sug})`);
  for (const c of d.casos) {
    console.log(`    ${c.ex}: récord ${c.prKg} kg ×${c.prReps} · plan pide ×${c.objetivo} → normal ${c.kgNormal} / descarga ${c.kgDescarga}  (${c.delta > 0 ? '+' : ''}${c.delta.toFixed(1)}% vs su récord)`);
  }
}
