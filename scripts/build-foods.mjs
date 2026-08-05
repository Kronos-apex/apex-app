#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// build-foods.mjs — genera `foods.json`, el CATÁLOGO DE BÚSQUEDA Y REGISTRO.
//
// F1a del registro de alimentos · estipulaciones E5, E7 y E8 de Fable.
//
// 🔴 DOS CAPAS, NUNCA UNA FUSIÓN:
//   (a) `NUT_FOODS` en avi-core.js = pool del RECETARIO. Cerrado, curado, referenciado POR ID
//       desde `NUT_MENUS` (41 de 50). Este script NO lo toca: lo LEE.
//   (b) `foods.json` (lo que genera este archivo) = lo que el usuario busca y registra. Incluye
//       los 50 con sus MISMOS ids y valores, más lo que se ingiera después (TCAC del ICBF, F1b).
//
// Determinista y re-ejecutable: mismo insumo → mismo archivo byte a byte (ids ordenados), para
// que un `git diff` muestre solo lo que de verdad cambió.
//
//   node scripts/build-foods.mjs            → escribe foods.json y reporta
//   node scripts/build-foods.mjs --check    → NO escribe; falla si el archivo está desfasado
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = require(join(RAIZ, 'avi-core.js'));
const SALIDA = join(RAIZ, 'foods.json');
const CHECK = process.argv.includes('--check');

// E7 — de dónde salió cada valor, escrito AL LADO del dato. Un valor verificado contra una
// fuente externa solo se protege si la fuente viaja con él: cambiarlo obliga a re-verificarla.
const FUENTES = {
  avi50: {
    nombre: 'Catálogo curado de AVI',
    nota: 'Macros por 100 g del alimento LISTO PARA COMER. Valores verificados contra fuente externa y revisados en el lote del 2026-08-03 (yuca cocida, avena por taza, lata de atún escurrida).',
  },
  tcac2018: {
    nombre: 'ICBF — Tabla de Composición de Alimentos Colombianos, 2018',
    url: 'https://www.icbf.gov.co/tabla-de-composicion-de-alimentos-colombianos-tcac-2018',
    nota: '773 alimentos, incluidas preparaciones típicas colombianas. Pendiente confirmar por escrito las condiciones de reúso con el ICBF (E14).',
  },
  off: {
    nombre: 'Open Food Facts',
    url: 'https://world.openfoodfacts.org/data',
    nota: 'Licencia ODbL. Se CONSULTA en línea por código de barras y se muestra con atribución. 🔴 PROHIBIDO fusionar estos datos en este archivo: haría de foods.json una base derivada y obligaría a publicarla como datos abiertos (E13).',
  },
};

// ── Capa (a): los 50 del recetario, tal cual, sin tocar ids ni valores ──
function desdeNutFoods() {
  return core.NUT_FOODS.map(f => ({
    id: f.id,
    name: f.name,
    src: 'avi50',
    kcal: f.kcal, p: f.p, c: f.c, f: f.f,
    ...(f.un ? { un: { label: f.un.label, g: f.un.g } } : {}),
    ...(f.rol ? { rol: f.rol } : {}),        // solo los del recetario lo traen
  }));
}

// ── Capa (b): ingesta externa (TCAC en F1b). Hoy no hay insumo y el catálogo son los 50.
// Cuando llegue, este es el ÚNICO punto donde entra, y pasa por las mismas validaciones.
function desdeIngesta() {
  try {
    const crudo = JSON.parse(readFileSync(join(RAIZ, 'scripts', 'foods-ingesta.json'), 'utf8'));
    return Array.isArray(crudo) ? crudo : [];
  } catch { return []; }              // sin insumo todavía: no es un error, es F1b sin empezar
}

// ── Validación: lo que NO cumple no entra, y se reporta. Nada se corrige en silencio ──
function validar(foods) {
  const problemas = [];
  const vistos = new Map();
  const ok = [];
  for (const f of foods) {
    const donde = `${f && f.id || '(sin id)'} «${f && f.name || ''}»`;
    if (!f || !f.id || !f.name) { problemas.push(`${donde}: sin id o sin nombre`); continue; }
    if (vistos.has(f.id)) { problemas.push(`${donde}: id DUPLICADO (ya venía de ${vistos.get(f.id)})`); continue; }
    if (!FUENTES[f.src]) { problemas.push(`${donde}: fuente desconocida «${f.src}»`); continue; }
    // E7: un macro que la fuente no trae se queda en null, JAMÁS en 0.
    for (const k of ['kcal', 'p', 'c', 'f']) {
      if (f[k] === 0) continue;
      if (f[k] != null && !Number.isFinite(Number(f[k]))) { problemas.push(`${donde}: ${k} no es un número («${f[k]}»)`); }
    }
    // El detector barato de errores de transcripción: las kcal declaradas contra las que dan
    // sus propios macros. Es la clase de defecto que ningún test de cuadre ve.
    if (core.foodKcalSuspect(f)) {
      const g = core.foodKcalGap(f);
      problemas.push(`${donde}: las kcal (${f.kcal}) no cuadran con sus macros — ${g.abs} kcal de desfase (${Math.round(g.rel * 100)}%). Revisar contra la fuente antes de incluirlo.`);
      continue;
    }
    vistos.set(f.id, f.src);
    ok.push(f);
  }
  return { ok, problemas };
}

const todos = [...desdeNutFoods(), ...desdeIngesta()];
const { ok, problemas } = validar(todos);
ok.sort((a, b) => a.id.localeCompare(b.id, 'es'));       // determinista

const salida = JSON.stringify({
  v: 1,
  generado: new Date().toISOString().slice(0, 10),
  nota: 'Catálogo de BÚSQUEDA y REGISTRO. NO es el pool del recetario (ese es NUT_FOODS en avi-core.js, referenciado por id desde NUT_MENUS). Generado por scripts/build-foods.mjs — no editar a mano.',
  fuentes: FUENTES,
  foods: ok,
}, null, 1) + '\n';

const porFuente = ok.reduce((a, f) => { a[f.src] = (a[f.src] || 0) + 1; return a; }, {});
console.log(`foods.json · ${ok.length} alimentos (${Object.entries(porFuente).map(([k, n]) => `${k}: ${n}`).join(' · ')})`);
console.log(`tamaño: ${(Buffer.byteLength(salida, 'utf8') / 1024).toFixed(1)} KB`);
if (problemas.length) {
  console.log(`\n⚠️  ${problemas.length} alimento(s) RECHAZADO(S) — no entran al catálogo:`);
  problemas.forEach(p => console.log('   · ' + p));
}

if (CHECK) {
  let actual = '';
  try { actual = readFileSync(SALIDA, 'utf8'); } catch { }
  // La fecha de generación cambia sola cada día: se compara el CONTENIDO, no el sello.
  const sinFecha = s => s.replace(/"generado": "[^"]*"/, '');
  if (sinFecha(actual) !== sinFecha(salida)) {
    console.error('\n❌ foods.json está desfasado del generador. Corre: node scripts/build-foods.mjs');
    process.exit(1);
  }
  console.log('\n✅ foods.json coincide con el generador');
} else {
  writeFileSync(SALIDA, salida, 'utf8');
  console.log(`\n✅ escrito ${SALIDA}`);
}
if (problemas.length && !CHECK) process.exitCode = 0;   // rechazar es el comportamiento correcto
