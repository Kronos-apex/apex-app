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
    // 🔴 CORREGIDO 2026-08-15: esta nota decía «Valores verificados contra fuente externa» y era
    // FALSO — medido, 47 de los 50 no citaban ninguna. Un comentario con una razón falsa es peor
    // que ninguno: es lo que hace que dentro de seis meses alguien dé el número por bueno. Y la
    // trazabilidad era CIRCULAR: estas 50 filas se copian aquí como si «avi50» fuera una fuente,
    // cuando es un puntero de vuelta a la tabla que no la tiene. La procedencia REAL de cada una
    // vive ahora en su campo `src`/`ref` dentro de `NUT_FOODS`, con un test que la exige.
    // 🟢 2026-08-16 (v490): el 47 de esta nota ya es CERO — los 50 citan su fila. La nota se
    // actualiza en el mismo commit que cierra el último, o vuelve a ser un comentario falso
    // (que fue el defecto de la versión anterior de esta misma línea).
    nota: 'Macros por 100 g del alimento LISTO PARA COMER. ⚠️ «avi50» NO es una fuente: es la tabla del recetario, y se conserva como marca de CAPA porque las entradas ya guardadas en el registro de la gente lo llevan escrito. La procedencia real viaja al lado, en el campo `ref` de cada fila. Al 2026-08-16 los 50 citan su registro oficial (USDA FoodData Central o TCAC 2018 del ICBF, con código y página) y el test `v487` mantiene ese número en cero.',
  },
  usda_sr: {
    nombre: 'USDA FoodData Central — SR Legacy (abril 2018)',
    url: 'https://fdc.nal.usda.gov/download-datasets',
    nota: 'Datos del gobierno federal de EE.UU., de dominio público. Se importó una selección CURADA con nombre en español (scripts/usda-curada.mjs): de los 7.793 registros, la mayoría son cortes de res, comida de bebé o cadenas gringas que no le sirven a nadie aquí. Los macros son por 100 g y los gramos de cada medida casera los publica la propia USDA — no se inventó ninguno.',
  },
  tcac2018: {
    nombre: 'ICBF — Tabla de Composición de Alimentos Colombianos, 2018',
    url: 'https://www.icbf.gov.co/tabla-de-composicion-de-alimentos-colombianos-tcac-2018',
    cita: 'Instituto Colombiano de Bienestar Familiar (ICBF). Tabla de Composición de Alimentos Colombianos (TCAC), 2018. Bogotá, Colombia.',
    nota: 'Fuente OFICIAL del Estado colombiano: es la que trae nuestras frutas y preparaciones. Decisión del PO (2026-08-05): se usa CITANDO LA FUENTE como obra oficial, sin esperar respuesta al derecho de petición (opción (a) de E14; la solicitud sigue su curso). Cada alimento guarda su código y su página para poder re-verificarlo. Transcrito a mano desde el PDF publicado: el documento son 147 páginas ESCANEADAS COMO IMAGEN (sin texto) y la API del portal de consulta exige cuenta de usuario, así que no hay ruta automática — por eso entra por lotes revisados uno por uno, no en bloque.',
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
    // 🔴 LA CITA VIAJA CON EL DATO (v490). Hasta aquí estas 50 filas llegaban con `src:'avi50'` y
    // nada más — un puntero de vuelta al recetario, que es la trazabilidad CIRCULAR que ya está
    // documentada arriba. `src` no se puede cambiar (las entradas guardadas en el registro de la
    // gente lo llevan escrito), pero la procedencia sí puede acompañarlo, y ahora que las 50 la
    // tienen no hay ninguna razón para dejarla atrás.
    ...(f.ref ? { ref: f.ref } : {}),
    kcal: f.kcal, p: f.p, c: f.c, f: f.f,
    ...(f.un ? { un: { label: f.un.label, g: f.un.g } } : {}),
    ...(f.rol ? { rol: f.rol } : {}),        // solo los del recetario lo traen
  }));
}

// ── Capa (b): ingestas externas. Cada fuente trae su archivo y TODAS pasan por las mismas
// validaciones. Agregar una fuente nueva = agregar un archivo aquí, nada más.
const INGESTAS = ['foods-usda.json', 'foods-tcac.json'];
function desdeIngesta() {
  const out = [];
  for (const f of INGESTAS) {
    try {
      const crudo = JSON.parse(readFileSync(join(RAIZ, 'scripts', f), 'utf8'));
      if (Array.isArray(crudo)) out.push(...crudo);
    } catch { /* archivo aún no existe: no es un error, es una fuente sin ingerir */ }
  }
  return out;
}

// ── Validación: lo que NO cumple no entra, y se reporta. Nada se corrige en silencio ──
function validar(foods) {
  const problemas = [];
  const vistos = new Map();
  const porNombre = new Map();
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
    // Dos alimentos con el MISMO nombre son un buscador que confunde: la persona ve dos filas
    // idénticas con macros distintos y no puede elegir. Los ids no chocan (la capa USDA lleva
    // prefijo), así que el duplicado que importa es el de NOMBRE.
    const clave = f.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (porNombre.has(clave)) {
      problemas.push(`${donde}: NOMBRE repetido — ya existe como «${porNombre.get(clave)}». El buscador mostraría dos filas iguales.`);
      continue;
    }
    porNombre.set(clave, f.id);
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
