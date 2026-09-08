#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// coach-no-ve.mjs — ¿qué hay guardado de FOTOS y de PESO, y puede el coach leerlo?
//
// Nace de los hallazgos D3-3 y D3-4 (auditoría 7-sep): «el coach no ve ninguna foto de
// progreso» y «el peso corporal no se pide nunca». Antes de construir nada hay que responder
// dos preguntas que el informe no responde:
//   1. ¿en qué FORMA están las fotos? (URL de Storage o base64 dentro de la fila)
//      → si son URLs de un bucket con RLS por dueño, una galería para el coach NACE MUERTA:
//        es exactamente la clase de v540, y se ve ANTES de escribir la pantalla, no después.
//   2. ¿cuál es la antigüedad REAL del peso de cada persona, y con qué se le calculan macros?
//
// Lee de Supabase con ~/.avi/service-role.key. NO escribe nada.
//   node scripts/coach-no-ve.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const r = await fetch(`${URL_SB}/rest/v1/user_data?select=user_id,role,profile,photos,bodyweight,history&role=eq.client`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
if (!r.ok) { console.error('Supabase respondió', r.status); process.exit(1); }
const filas = await r.json();
const HOY = Date.now();
const dias = t => Math.round((HOY - new Date(t).getTime()) / 86400000);

let personas = 0;
const conFotos = [], sinPeso = [], conPeso = [];
const formatos = {};
for (const f of filas) {
  const p = f.profile || {};
  const nombre = p.name || '(sin nombre)';
  if (/^qa[- ]/i.test(nombre) || /^qa-(coach|harness)@/i.test(p.email || '')) continue;
  personas++;

  // ── FOTOS ── (la colección lleva lápidas desde v568: una borrada NO cuenta)
  const fotos = (f.photos || []).filter(x => x && !x.del);
  if (fotos.length) {
    const forma = fotos.map(x => {
      const src = String(x.src || x.url || '');
      const k = src.startsWith('data:') ? 'base64 en la fila'
        : /^https?:\/\//.test(src) ? (src.includes('/storage/v1/object/public/') ? 'URL Storage PÚBLICA' : 'URL Storage (no pública)')
        : src ? 'otra' : 'sin src';
      formatos[k] = (formatos[k] || 0) + 1;
      return k;
    });
    conFotos.push({ nombre, n: fotos.length, forma: [...new Set(forma)].join(' + '),
      masVieja: dias(fotos[fotos.length - 1].date), masNueva: dias(fotos[0].date) });
  }

  // ── PESO CORPORAL ── (se guarda descendente: el más nuevo primero, gotcha v448/v511)
  const bw = (f.bodyweight || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const sesiones = (f.history || []).length;
  if (!bw.length) sinPeso.push({ nombre, sesiones, ficha: p.weight || null });
  else conPeso.push({ nombre, kg: bw[0].kg ?? bw[0].w, edadDias: dias(bw[0].date), tomas: bw.length, sesiones, ficha: p.weight || null });
}

const pct = (a, b) => b ? (a * 100 / b).toFixed(0) + '%' : '—';
console.log(`\n── COBERTURA (control) ── ${personas} asesorados reales\n`);

console.log(`── FOTOS DE PROGRESO ──`);
console.log(`   personas con al menos una foto viva: ${conFotos.length} de ${personas}`);
console.log(`   fotos vivas en total: ${conFotos.reduce((t, x) => t + x.n, 0)}`);
console.log(`   FORMATO (esto decide si el coach puede verlas): ${JSON.stringify(formatos)}`);
conFotos.sort((a, b) => b.n - a.n).forEach(x =>
  console.log(`     ${x.nombre.padEnd(20)} ${String(x.n).padStart(2)} foto(s) · ${x.forma} · de hace ${x.masNueva}-${x.masVieja} días`));

console.log(`\n── PESO CORPORAL ──`);
console.log(`   sin NINGÚN pesaje: ${sinPeso.length} de ${personas} (${pct(sinPeso.length, personas)})`);
sinPeso.sort((a, b) => b.sesiones - a.sesiones).forEach(x =>
  console.log(`     ${x.nombre.padEnd(20)} ${String(x.sesiones).padStart(3)} sesiones · peso en la ficha: ${x.ficha ?? '—'}`));
console.log(`   con pesaje: ${conPeso.length}`);
conPeso.sort((a, b) => b.edadDias - a.edadDias).forEach(x =>
  console.log(`     ${x.nombre.padEnd(20)} ${String(x.kg).padStart(5)} kg de hace ${String(x.edadDias).padStart(3)} días · ${x.tomas} toma(s) · ficha ${x.ficha ?? '—'}`));
const viejos = conPeso.filter(x => x.edadDias > 60).length;
console.log(`\n   ⚠️ con su último pesaje de hace MÁS de 60 días: ${viejos} de ${conPeso.length}`);
console.log(`   ⚠️ con una SOLA toma (o sea, sin ninguna tendencia): ${conPeso.filter(x => x.tomas === 1).length} de ${conPeso.length}`);
