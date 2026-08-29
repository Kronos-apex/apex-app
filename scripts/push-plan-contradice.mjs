#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// push-plan-contradice.mjs — ¿el aviso diario le puede decir dos cosas distintas
// a la MISMA persona el mismo día?
//
// EL DEFECTO (medido el 2026-08-29 contra producción): los días de entreno viajaban GUARDADOS en
// la fila de `push_subscriptions` —una copia por APARATO de un hecho que es de la PERSONA— y esa
// copia solo se reescribe cuando el navegador cambia de endpoint. Cuando cambia, la fila vieja
// queda HUÉRFANA: ningún aparato la vuelve a tocar jamás, pero la ronda diaria le sigue enviando
// con el plan congelado de aquel día.
//   Natalia Martínez: fila del 7-ago con `["Lunes","Lunes","Martes"]` + fila de hoy con su plan
//   real de 4 días. Los logs de la edge del jueves 28-ago, turno de la tarde, imprimieron para su
//   client_id «(entreno) ✅» y «(descanso) ✅» con 14 segundos de diferencia.
//
// QUÉ MIDE, y por qué así: recorre los 7 días de la semana y, para cada persona con más de una
// suscripción, compara la clasificación entreno/descanso que sale de CADA fila.
//   · REGLA VIEJA  → cada fila usa su propia copia `training_days`  → puede contradecirse.
//   · REGLA v551   → todas las filas leen el plan VIVO de `user_data.routines` → imposible.
// La regla nueva se importa de `avi-core` (`pushPlanFromRoutines`), no se re-escribe aquí: un
// harness que re-implementa la regla que viene a probar no prueba nada.
//
// Sale con código 1 si la regla nueva deja UNA sola contradicción — eso sería el arreglo roto.
//
//   node scripts/push-plan-contradice.mjs
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

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';

let KEY;
try {
  KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
} catch {
  console.error('Falta la llave en ~/.avi/service-role.key (nunca va en el repo).');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const subs = await (await fetch(`${URL_SB}/rest/v1/push_subscriptions?select=id,client_id,training_days,training_shift`, { headers: H })).json();
const ud = await (await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,profile,routines`, { headers: H })).json();
if (!Array.isArray(subs) || !Array.isArray(ud)) { console.error('Supabase no devolvió filas.'); process.exit(1); }

const persona = {};
ud.forEach(r => persona[r.user_id] = r);
const porCliente = {};
subs.forEach(s => { if (s.client_id !== '_coach') (porCliente[s.client_id] = porCliente[s.client_id] || []).push(s); });

let viejas = 0, nuevas = 0, conVariasFilas = 0;
for (const [cid, filas] of Object.entries(porCliente)) {
  const p = persona[cid] || {};
  const nombre = (p.profile && p.profile.name) || cid;
  if (filas.length < 2) continue;
  conVariasFilas++;
  const plan = core.pushPlanFromRoutines(p.routines);
  for (const dia of DIAS) {
    const vieja = filas.map(f => (f.training_days || []).includes(dia));
    const nueva = filas.map(() => plan.days.includes(dia));   // el plan no depende del aparato
    const chocaVieja = new Set(vieja).size > 1;
    const chocaNueva = new Set(nueva).size > 1;
    if (chocaVieja) {
      viejas++;
      console.log(`🔴 REGLA VIEJA · ${nombre} · ${dia}: ${filas.map((f, i) => `${String(f.id).slice(0, 8)}=${vieja[i] ? 'entreno' : 'descanso'}`).join('  vs  ')}`);
    }
    if (chocaNueva) {
      nuevas++;
      console.log(`❌ REGLA v551 · ${nombre} · ${dia}: sigue contradiciéndose`);
    }
  }
}

console.log(`\npersonas con más de un aparato: ${conVariasFilas}`);
console.log(`contradicciones con la regla VIEJA (la copia del teléfono): ${viejas}`);
console.log(`contradicciones con la regla v551 (el plan de la persona):  ${nuevas}`);
if (nuevas > 0) { console.error('\n❌ El arreglo NO cierra el defecto.'); process.exit(1); }
if (viejas === 0) {
  console.log('\n⚠️ Hoy no hay ninguna contradicción que reproducir en los datos vivos:');
  console.log('   el defecto sigue siendo posible (la copia por aparato es lo que se congela),');
  console.log('   pero este harness ya no lo demuestra. Ver los logs del 28-ago en la bitácora.');
} else {
  console.log('\n✅ TODO OK — la regla nueva deja 0 contradicciones sobre los mismos datos.');
}
