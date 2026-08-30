#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _sabotaje-showcase-objetivo.mjs — matriz VERSIONADA de los candados de v555.
//
// Qué protege: el OBJETIVO en la tarjeta de vitrina. Pedido del PO (30-ago) y no es decoración:
// sin él la MISMA cifra dice cosas opuestas — Nataly subió de 54 a 59,5 kg y es un éxito porque
// busca ganar músculo, pero en una tarjeta muda ese «+5,5 kg» en una página de VENTA se lee como
// que engordó. El objetivo es la lente con la que se leen los kilos que ya estaban ahí.
//
// Lo que hay que sostener:
//   · el valor sale del PERFIL y viaja historia → fila → tabla (nadie lo teclea)
//   · solo entran los SEIS de la lista, y la lista de la app es la del CHECK del servidor
//   · la columna admite NULL (las 6 tarjetas vivas nacieron sin objetivo y la tabla no tiene UPDATE)
//   · se pinta ESCAPADO —es innerHTML en la página pública— y solo si existe
//
// Cada sabotaje devuelve el código a la conducta INCORRECTA, corre la suite y exige que CAIGA por
// CÓDIGO DE SALIDA (nunca por el mensaje impreso: leer el texto es como el smoke pasó 43 versiones
// muerto). Si el texto a sustituir no aparece EXACTAMENTE una vez, grita «NO SE APLICÓ» — un
// sabotaje que no muta nada sale verde y parece un candado flojo.
//
// 🔴 Y LLEVA UN CASO QUE DEBE PASAR (P1). Una matriz donde todo cae también la satisface un test
// que diga `assert.fail()`: sin un control en verde no se está midiendo el candado, se está
// midiendo que la suite se puede romper.
//
//   node scripts/e2e/_sabotaje-showcase-objetivo.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..');
const CORE = join(RAIZ, 'avi-core.js');
const LOGIN = join(RAIZ, 'app-2-login.js');
const SQL = join(RAIZ, 'supabase', 'community', 's2_showcase_objetivo.sql');
const CSS = join(RAIZ, 'styles.css');

const SABOTAJES = [
  { n: 1, f: CORE, why: 'la historia deja de llevar el objetivo del perfil',
    de: '    objetivo: normalizeGoal(client.goal),',
    a:  '    objetivo: null,' },
  { n: 2, f: CORE, why: 'la fila publicable tira el objetivo por el camino',
    de: '  if (obj) row.objetivo = obj;',
    a:  '  if (false) row.objetivo = obj;' },
  { n: 3, f: CORE, why: 'entra CUALQUIER objetivo: el CHECK del servidor lo rechazaría en la cara del coach',
    de: '  return SHOWCASE_OBJETIVOS.indexOf(g) >= 0 ? g : null;',
    a:  '  return g || null;' },
  { n: 4, f: CORE, why: 'vuelve el String() que dejaba pasar un arreglo de un elemento',
    de: "  if (typeof goal !== 'string') return null;\n  const g = goal.trim();",
    a:  "  const g = String(goal == null ? '' : goal).trim();" },
  { n: 5, f: CORE, why: 'la lista de la app se separa de la del servidor',
    de: "const SHOWCASE_OBJETIVOS = ['Perder grasa', 'Ganar músculo', 'Recomposición', 'Fuerza', 'Resistencia', 'Salud general'];",
    a:  "const SHOWCASE_OBJETIVOS = ['Perder grasa', 'Ganar músculo', 'Recomposición', 'Fuerza', 'Resistencia', 'Salud general', 'Bajar de peso'];" },
  { n: 6, f: SQL, why: 'la columna se vuelve NOT NULL y rompe las 6 tarjetas ya publicadas',
    de: '  add column if not exists objetivo text;',
    a:  '  add column if not exists objetivo text not null default \'Fuerza\';' },
  { n: 7, f: SQL, why: 'el CHECK deja de admitir null (mismo daño, por la otra puerta)',
    de: '    objetivo is null or objetivo in (',
    a:  '    objetivo in (' },
  { n: 8, f: LOGIN, why: 'la consulta pública deja de pedir la columna: el chip nunca se pinta',
    de: 'select=nombre,entrenos,meses,subidas,subieron,con_carga,objetivo',
    a:  'select=nombre,entrenos,meses,subidas,subieron,con_carga' },
  { n: 9, f: LOGIN, why: 'el objetivo se interpola SIN esc() en innerHTML de la página pública',
    de: '${obj?`<div class="sc-goal">${esc(obj)}</div>`:""}',
    a:  '${obj?`<div class="sc-goal">${obj}</div>`:""}' },
  { n: 10, f: LOGIN, why: 'el chip se pinta siempre: una tarjeta sin objetivo muestra un hueco',
    de: '${obj?`<div class="sc-goal">${esc(obj)}</div>`:""}',
    a:  '<div class="sc-goal">${esc(obj||"")}</div>' },
  { n: 11, f: LOGIN, why: 'el valor de la tabla se pinta crudo, sin pasar por la lista blanca',
    de: 'const obj=(typeof normalizeGoal==="function")?normalizeGoal(f.objetivo):null;',
    a:  'const obj=f.objetivo||null;' },
  { n: 12, f: CSS, why: 'el chip se queda sin estilo y sale como texto suelto encima de los kilos',
    de: '.sc-goal{display:inline-block;',
    a:  '.sc-goalXX{display:inline-block;' },
];

// 🔴 EL CASO QUE DEBE PASAR. No es relleno: sin él, una suite que reventara por cualquier motivo
// daría 12/12 «muerden» y parecería perfecta. Aquí se cambia algo REAL y ajeno al candado —el
// texto del chip pasa a mayúsculas por CSS, que ya era el aspecto— y la suite tiene que SEGUIR
// VERDE. Si esto cae, las aserciones están atadas a la forma y no a la conducta.
const DEBE_PASAR = [
  { n: 'P1', f: CSS, why: 'cambiar el aspecto del chip NO puede romper la suite',
    de: 'text-transform:uppercase;color:rgba(234,251,244,.82);',
    a:  'text-transform:none;color:rgba(234,251,244,.90);' },
];

// ⚠️ LOS FINALES DE LÍNEA DE ESTE REPO NO SON ESTABLES (gotcha vigente: git los reescribe al
// hacer checkout, y `avi-core.js` va con CRLF mientras otros van con LF). Un patrón de varias
// líneas escrito con `\n` NO casa, y el sabotaje sale «NO SE APLICÓ». La solución es del RUNNER.
const rx = (txt) => new RegExp(
  txt.split('\n').map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'), 'g');

const suiteCae = () => {
  try { execFileSync('node', ['--test', join(RAIZ, 'avi.test.js')], { cwd: RAIZ, stdio: 'pipe' }); return false; }
  catch { return true; }
};

if (suiteCae()) { console.error('❌ La suite ya estaba en ROJO antes de empezar. Abortado.'); process.exit(1); }
console.log('control: suite verde antes de sabotear ✅\n');

let muerden = 0, fallos = 0;
const corre = (s, esperaCaida) => {
  const orig = readFileSync(s.f, 'utf8');
  const veces = (orig.match(rx(s.de)) || []).length;
  if (veces !== 1) {
    console.log(`  ${s.n} 🚨 NO SE APLICÓ — el texto aparece ${veces} veces (esperaba 1). ${s.why}`);
    fallos++; return;
  }
  writeFileSync(s.f, orig.replace(rx(s.de), () => s.a), 'utf8');
  const cayo = suiteCae();
  writeFileSync(s.f, orig, 'utf8');
  const bien = cayo === esperaCaida;
  console.log(`  ${s.n} ${bien ? (esperaCaida ? '✅ muerde' : '✅ sigue verde') : (esperaCaida ? '❌ VERDE' : '❌ CAYÓ')} — ${s.why}`);
  bien ? muerden++ : fallos++;
};

SABOTAJES.forEach(s => corre({ ...s, n: 'S' + s.n }, true));
console.log('');
DEBE_PASAR.forEach(s => corre(s, false));

console.log(`\n${muerden}/${SABOTAJES.length + DEBE_PASAR.length} como se esperaba`);
if (suiteCae()) { console.error('❌ La suite quedó en ROJO al restaurar. Revisa los archivos.'); process.exit(1); }
if (fallos) { console.error(`❌ ${fallos} caso(s) fuera de lo esperado.`); process.exit(1); }
console.log('✅ TODO OK — los candados de v555 muerden, el control pasa y el código quedó restaurado.');
