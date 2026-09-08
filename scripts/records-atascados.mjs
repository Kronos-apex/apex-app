#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// records-atascados.mjs — ¿cuántos récords guardados los batió una sesión POSTERIOR?
//
// Nace del hallazgo D3-2 (auditoría 7-sep): «Nataly, Curl Femoral Acostado: `prs` dice 20 kg
// del 25-may y su historial tiene 30 kg el 25-jul». v585 lo esquivó en el panel «Cargas»
// (calcula el récord del historial), pero `ax_pr` sigue alimentando el PESO SUGERIDO y la
// pantalla de récords del asesorado.
//
// 🔒 Y hay una decisión previa que NO se puede ignorar: **v483 midió y RECHAZÓ rellenar récords
// desde el historial**, por dos razones que siguen vivas — (1) las sesiones viejas no traen id
// de ejercicio, así que el récord derivado se duplica bajo el NOMBRE; (2) **resucita lo que un
// humano borró a mano** (`coachEditPR` existe justo para quitar un récord falso).
//
// Por eso esto NO mide «cuántos récords faltan» sino algo más estrecho y seguro:
//   ¿cuántos récords que YA EXISTEN fueron batidos por una sesión POSTERIOR a su fecha?
// Ahí no se crea nada: solo se actualiza hacia arriba un récord que la propia persona batió,
// que es exactamente lo que el coach ve mal.
//
// Lee de Supabase con ~/.avi/service-role.key. NO escribe nada.
//   node scripts/records-atascados.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const r = await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,role,profile,prs,history`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
if (!r.ok) { console.error('Supabase respondió', r.status); process.exit(1); }
const filas = await r.json();
const HOY = Date.now();
const dias = t => Math.round((HOY - new Date(t).getTime()) / 86400000);

let personas = 0, conPrs = 0, prsTotal = 0;
const atascados = [], sinRecord = [];
for (const f of filas) {
  const p = f.profile || {};
  const nombre = p.name || '(sin nombre)';
  if (/^qa[- ]/i.test(nombre) || /^qa-(coach|harness)@/i.test(p.email || '')) continue;
  personas++;
  const prs = f.prs || {};
  const hist = Array.isArray(f.history) ? f.history : [];
  if (!Object.keys(prs).length) continue;
  conPrs++;

  // El mejor kg por ejercicio en el historial, con su fecha. Clave: el id si viene, si no el nombre.
  const mejor = {};   // clave -> {kg, date, name}
  for (const s of hist) {
    const fecha = s && (s.date || s.finishedAt || s.startedAt);
    for (const ex of (s && s.exercises) || []) {
      const clave = ex && (ex.id || ex.name);
      if (!clave) continue;
      for (const se of (ex.sets || [])) {
        const kg = parseFloat(se && se.kg);
        if (!(kg > 0)) continue;
        if (!mejor[clave] || kg > mejor[clave].kg) mejor[clave] = { kg, date: fecha, name: ex.name || clave };
      }
    }
  }

  for (const [clave, pr] of Object.entries(prs)) {
    prsTotal++;
    const kgPr = parseFloat(pr && (pr.kg != null ? pr.kg : pr.value));
    const fPr = pr && (pr.date || pr.at);
    const m = mejor[clave];
    if (!m) continue;                       // el récord no tiene historial que lo bata
    if (!(m.kg > kgPr)) continue;           // nadie lo batió
    const posterior = fPr && m.date ? new Date(m.date).getTime() > new Date(fPr).getTime() : null;
    atascados.push({ persona: nombre, ex: m.name, clave, prKg: kgPr, prFecha: fPr, histKg: m.kg,
      histFecha: m.date, posterior, diasPr: fPr ? dias(fPr) : null });
  }
  // Control del lado contrario: ejercicios con historial de peso y SIN récord guardado.
  for (const [clave, m] of Object.entries(mejor)) if (prs[clave] === undefined) sinRecord.push({ persona: nombre, ex: m.name });
}

console.log('personas (sin QA):', personas, '· con récords guardados:', conPrs, '· récords totales:', prsTotal);
console.log('\n🔴 RÉCORDS BATIDOS POR UNA SESIÓN POSTERIOR (los que se pueden curar sin inventar):');
const curables = atascados.filter(a => a.posterior === true);
curables.sort((a, b) => (b.histKg - b.prKg) - (a.histKg - a.prKg));
for (const a of curables) {
  console.log(`   ${a.persona.padEnd(18)} ${String(a.ex).slice(0, 38).padEnd(38)} ` +
    `guardado ${String(a.prKg).padStart(6)} kg (${String(a.prFecha).slice(0, 10)}) → historial ${String(a.histKg).padStart(6)} kg (${String(a.histFecha).slice(0, 10)})`);
}
console.log('   total curables:', curables.length, 'de', prsTotal, `(${(curables.length / prsTotal * 100).toFixed(1)}%)`);

const ambiguos = atascados.filter(a => a.posterior !== true);
console.log('\n⚠️  batidos pero SIN poder afirmar que la sesión sea posterior (no se tocan):', ambiguos.length);
for (const a of ambiguos.slice(0, 8)) console.log(`   ${a.persona} · ${a.ex} · pr ${a.prKg} (${a.prFecha}) vs hist ${a.histKg} (${a.histFecha})`);

console.log('\n🔒 CONTROL v483 — ejercicios con peso en el historial y SIN récord guardado:', sinRecord.length);
console.log('   (esos NO se crean: pueden ser récords que el coach borró a mano a propósito)');
for (const x of sinRecord.slice(0, 10)) console.log(`   ${x.persona} · ${x.ex}`);
