#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// nut-adherencia.mjs — ¿cuánta gente REGISTRA de verdad lo que come?
//
// Estipulación E15/E16 de Fable: el criterio de corte del módulo se mide con un script
// READ-ONLY que DERIVA la adherencia del propio registro. Sin tabla de telemetría, sin
// eventos nuevos, sin un solo dato personal más de los que ya existen.
//
// CRITERIO (§8.4 del plan): a los 21 días del despliegue que deja F2 + catálogo en producción,
// personas con ≥3 días DISTINTOS con al menos una comida guardada.
//   <3 personas → F5 (aceleradores) CONGELADA y sesión con el PO con el número en la mano.
//   ≥3 personas → F5 procede.
// Alarma temprana: si a los 10 días NADIE guardó ni una comida, se le muestra al PO de una vez.
//
//   node scripts/nut-adherencia.mjs            → ventana de 21 días
//   node scripts/nut-adherencia.mjs 10         → ventana de 10 días (la alarma temprana)
//
// Lee de Supabase con la service role key de ~/.avi/service-role.key (JAMÁS en el repo).
// NO escribe nada: es una consulta.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require(join(import.meta.dirname, '..', 'avi-core.js'));

const VENTANA = parseInt(process.argv[2]) || 21;
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';

let KEY;
try {
  KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
} catch {
  console.error('Falta la llave en ~/.avi/service-role.key (nunca va en el repo).');
  process.exit(1);
}

const r = await fetch(`${URL_SB}/rest/v1/user_data?select=profile,role&role=eq.client`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!r.ok) { console.error('Supabase respondió', r.status, await r.text()); process.exit(1); }
const filas = await r.json();

const ahora = new Date();
const conRegistro = [];
for (const fila of filas) {
  const p = fila.profile || {};
  const dias = core.foodLogActiveDays(p.foodlog, ahora, VENTANA);
  const total = Object.keys((p.foodlog && p.foodlog.d) || {}).length;
  if (total > 0) conRegistro.push({ nombre: p.name || '(sin nombre)', dias, total });
}
conRegistro.sort((a, b) => b.dias - a.dias || b.total - a.total);

const cumplen = conRegistro.filter(x => x.dias >= 3);
console.log(`Ventana: últimos ${VENTANA} días · ${filas.length} asesorados en la base\n`);
if (!conRegistro.length) {
  console.log('NADIE ha guardado una sola comida todavía.');
} else {
  console.log('quien ha registrado algo:');
  conRegistro.forEach(x => console.log(`  ${String(x.dias).padStart(2)} día(s) en la ventana · ${String(x.total).padStart(2)} con detalle guardado · ${x.nombre}`));
}
console.log(`\nPersonas con ≥3 días distintos en la ventana: ${cumplen.length}`);
console.log(cumplen.length >= 3
  ? 'VEREDICTO: ≥3 → F5 (aceleradores) procede.'
  : 'VEREDICTO: <3 → F5 CONGELADA. Sesión con el PO con este número en la mano (§8.4).');
