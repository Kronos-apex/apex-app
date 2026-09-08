#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// plantillas-prometen.mjs — ¿lo que el NOMBRE de una plantilla promete está adentro?
//
// Hallazgo D2-3 (auditoría 7-sep): «Tren Superior — Espalda, Pecho y Hombros» son
// e6, e83, e51, e84, e24 → 3 de espalda + 2 de pecho y CERO de hombro. Se la aplicó a 3
// personas y a Kathe la dejó sin un solo ejercicio de hombro en todo su plan (corregido a mano
// el 7-sep). La plantilla, en cambio, sigue igual para la próxima persona.
//
// Esto mide las DOS caras, porque el arreglo no puede ser solo el dato:
//   1. qué promete cada plantilla en su nombre y qué músculos tiene de verdad;
//   2. a cuántas RUTINAS vivas les pasa lo mismo (el coach también arma rutinas a mano).
//
// Lee de Supabase con ~/.avi/service-role.key. NO escribe nada.
//   node scripts/plantillas-prometen.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const r = await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,role,profile,routines,templates`, { headers: H });
if (!r.ok) { console.error('Supabase respondió', r.status); process.exit(1); }
const filas = await r.json();

// Las palabras con las que un coach nombra un músculo en el título de una rutina, y el `muscle`
// del catálogo al que corresponden. Solo lo que se puede afirmar sin adivinar.
const PROMESAS = [
  [/hombro/i, 'hombros'], [/pecho|pectoral/i, 'pecho'], [/espalda|dorsal/i, 'espalda'],
  [/b[ií]ceps/i, 'biceps'], [/tr[ií]ceps/i, 'triceps'], [/pierna|cu[aá]driceps/i, 'piernas'],
  [/gl[uú]teo/i, 'gluteo'], [/abdomen|core|abdominal/i, 'core'],
];
const musculosDe = (ejs) => new Set((ejs || []).map(e => String(e && e.muscle || '').toLowerCase()).filter(Boolean));
const faltantes = (nombre, ejs) => {
  const tiene = musculosDe(ejs);
  return PROMESAS.filter(([re, m]) => re.test(String(nombre || '')) && !tiene.has(m)).map(([, m]) => m);
};

console.log('═══ PLANTILLAS DEL COACH ═══');
let tpls = [];
for (const f of filas) {
  if (f.role !== 'coach') continue;
  const nombre = (f.profile || {}).name || '?';
  const lista = Array.isArray(f.templates) ? f.templates : [];
  if (!lista.length) continue;
  console.log(`\n${nombre}: ${lista.length} plantillas`);
  for (const t of lista) {
    const ejs = t.exercises || [];
    const falta = faltantes(t.name, ejs);
    tpls.push({ coach: nombre, name: t.name, n: ejs.length, falta });
    const musc = [...musculosDe(ejs)].join(', ') || '(sin músculo declarado)';
    console.log(`  ${falta.length ? '🔴' : '✅'} «${t.name}» — ${ejs.length} ej · músculos: ${musc}` +
      (falta.length ? `  ← PROMETE Y NO TIENE: ${falta.join(', ')}` : ''));
  }
}

console.log('\n═══ RUTINAS VIVAS CON LA MISMA CONTRADICCIÓN ═══');
let rutinas = 0, malas = 0;
const porPersona = {};
for (const f of filas) {
  const p = f.profile || {};
  const nombre = p.name || '(sin nombre)';
  if (/^qa[- ]/i.test(nombre) || /^qa-(coach|harness)@/i.test(p.email || '')) continue;
  for (const rt of (f.routines || [])) {
    rutinas++;
    const falta = faltantes(rt.name, rt.exercises);
    if (!falta.length) continue;
    malas++;
    (porPersona[nombre] = porPersona[nombre] || []).push(`«${rt.name}» sin ${falta.join('/')}`);
  }
}
for (const [k, v] of Object.entries(porPersona)) console.log(`  🔴 ${k}: ${v.join(' · ')}`);
console.log(`\n  ${malas} de ${rutinas} rutinas vivas prometen en el nombre un músculo que no tienen`);

// Y el caso que motivó todo: ¿a quién le quedó CERO de un músculo en TODO su plan?
console.log('\n═══ ¿A QUIÉN LE FALTA UN MÚSCULO EN TODO SU PLAN? ═══');
const GRANDES = ['hombros', 'pecho', 'espalda', 'piernas', 'gluteo'];
for (const f of filas) {
  const p = f.profile || {};
  const nombre = p.name || '(sin nombre)';
  if (/^qa[- ]/i.test(nombre) || /^qa-(coach|harness)@/i.test(p.email || '')) continue;
  const rts = f.routines || [];
  if (!rts.length) continue;
  const todos = new Set();
  let nEj = 0;
  rts.forEach(rt => (rt.exercises || []).forEach(e => { nEj++; if (e && e.muscle) todos.add(String(e.muscle).toLowerCase()); }));
  const sin = GRANDES.filter(m => !todos.has(m));
  if (sin.length) console.log(`  ${sin.length >= 2 ? '🔴' : '🟡'} ${nombre.padEnd(20)} ${rts.length} rutinas · ${nEj} ejercicios · sin: ${sin.join(', ')}`);
}
