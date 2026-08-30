#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vitrina-refrescar.mjs — vuelve a publicar las tarjetas de vitrina con los
// números de HOY y su objetivo (v555).
//
// POR QUÉ HACE FALTA: la tarjeta se CONGELA al publicarla (la tabla no tiene
// grant de UPDATE a propósito, lección c13c: editar = quitar y volver a
// publicar). La de Astrid decía 48 entrenos y ya iba en más.
//
// 🔒 NO RE-IMPLEMENTA NADA: arma la fila con las MISMAS funciones puras que usa
// la app (`clientProgressStory` → `showcaseRow`). Un script que recalcule la
// tarjeta por su cuenta publicaría números que la app no reconoce.
//
// 🔒 EN SECO POR DEFECTO. Escribe solo con --escribir, y antes guarda copia de
// las filas actuales en un archivo, porque el borrado no se puede deshacer.
//
//   node scripts/vitrina-refrescar.mjs            (en seco)
//   node scripts/vitrina-refrescar.mjs --escribir
//
// Lee/escribe con la service role key de ~/.avi/service-role.key (JAMÁS al repo).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require(join(import.meta.dirname, '..', 'avi-core.js'));

const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const COACH_UID = '0a6484ed-42af-449d-9903-e440ac683ecf';
const ESCRIBIR = process.argv.includes('--escribir');

let KEY;
try { KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim(); }
catch { console.error('Falta ~/.avi/service-role.key'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// control: sin las funciones reales esto no puede correr
for (const f of ['clientProgressStory', 'showcaseRow', 'normalizeGoal'])
  if (typeof core[f] !== 'function') { console.error('avi-core no expone ' + f); process.exit(1); }

const filas = await (await fetch(`${URL_SB}/rest/v1/avi_showcase?select=*&coach_id=eq.${COACH_UID}&order=created_at.desc`, { headers: H })).json();
const ud = await (await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,profile,history`, { headers: H })).json();
if (!Array.isArray(filas) || !Array.isArray(ud)) { console.error('Supabase no devolvió filas'); process.exit(1); }

const ahora = new Date();
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const plan = [];

for (const f of filas) {
  const row = ud.find(r => norm((r.profile || {}).name).split(/\s+/)[0] === norm(f.nombre));
  if (!row) { plan.push({ f, estado: 'SIN FICHA', motivo: 'no encontré a esta persona en la base' }); continue; }
  const c = row.profile || {};
  const st = core.clientProgressStory(c, row.history || [], ahora);
  if (!st || !st.ok) {
    plan.push({ f, estado: 'LA APP SE NIEGA', motivo: 'clientProgressStory → ' + (st && st.razon) });
    continue;
  }
  const nueva = core.showcaseRow(st);
  if (!nueva) { plan.push({ f, estado: 'NO PUBLICABLE', motivo: 'showcaseRow devolvió null' }); continue; }
  const cambia = f.entrenos !== nueva.entrenos || f.meses !== nueva.meses
    || (f.objetivo || null) !== (nueva.objetivo || null)
    || JSON.stringify(f.subidas) !== JSON.stringify(nueva.subidas)
    || f.subieron !== nueva.subieron || f.con_carga !== nueva.con_carga;
  plan.push({ f, nueva, estado: cambia ? 'SE ACTUALIZA' : 'YA ESTÁ IGUAL', edad: c.age, goalApp: c.goal });
}

console.log('\n════ TARJETAS DE LA VITRINA ════\n');
for (const p of plan) {
  console.log(`── ${p.f.nombre} ──  ${p.estado}${p.motivo ? '  (' + p.motivo + ')' : ''}`);
  console.log(`   publicada: ${p.f.entrenos} entrenos · ${p.f.meses} meses · objetivo ${p.f.objetivo || '(ninguno)'} · subió en ${p.f.subieron}/${p.f.con_carga}`);
  if (p.nueva) {
    console.log(`   HOY      : ${p.nueva.entrenos} entrenos · ${p.nueva.meses} meses · objetivo ${p.nueva.objetivo || '(ninguno)'} · subió en ${p.nueva.subieron}/${p.nueva.con_carga}`);
    console.log(`   subidas  : ${p.nueva.subidas.map(s => `${s.ejercicio} ${s.de}→${s.a}`).join(' | ')}`);
  }
  console.log('');
}

if (!ESCRIBIR) { console.log('EN SECO — no se escribió nada. Corre con --escribir para aplicar.'); process.exit(0); }

// 🔴 `slice(2)` PRIMERO: argv[0] es node y argv[1] este archivo. Filtrar sin
// recortarlos mete dos rutas en la lista de nombres y no coincide ninguna.
const soloEstas = process.argv.slice(2).filter(a => !a.startsWith('--'));
const aplicar = plan.filter(p => p.estado === 'SE ACTUALIZA' && (!soloEstas.length || soloEstas.includes(p.f.nombre)));
if (!aplicar.length) { console.log('Nada que aplicar.'); process.exit(0); }

const copia = join(homedir(), '.avi', `vitrina-antes-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(copia, JSON.stringify(filas, null, 1), 'utf8');
console.log('copia de seguridad de las 6 filas → ' + copia + '\n');

for (const p of aplicar) {
  const del = await fetch(`${URL_SB}/rest/v1/avi_showcase?id=eq.${p.f.id}`, { method: 'DELETE', headers: H });
  if (!del.ok) { console.error(`🔴 ${p.f.nombre}: no se pudo quitar la vieja (${del.status})`); continue; }
  const ins = await fetch(`${URL_SB}/rest/v1/avi_showcase`, {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...p.nueva, coach_id: COACH_UID }),
  });
  const body = await ins.text();
  if (!ins.ok) { console.error(`🔴 ${p.f.nombre}: la nueva NO entró (${ins.status}) ${body}\n   La vieja YA se quitó — restaura desde ${copia}`); continue; }
  console.log(`✅ ${p.f.nombre} republicada`);
}
