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
//   · se pinta solo si existe, y en el repo donde HOY vive la tarjeta
//
// ⏮️ v578 · EL PINTADO SE MUDÓ A LA WEB. El PO sacó la vitrina de la bienvenida de la app
// («las prefiero en la web de la app, incomodan mucho», 6-sep) y con ella se fue `renderShowcase`,
// donde vivían los casos 8 a 12 y el control P1: quedaron **despegados**, gritando «NO SE APLICÓ»
// — el gotcha de v537/v549, que vuelve cada vez que se borra o se arregla lo que un ancla cita.
// No se borran: se mudan y se reapuntan. Lo que se pinta lo vigila ahora
// `avi-web/scripts/verificar-vitrina.mjs` (chip condicional, lista blanca, sin HTML crudo), con
// su propia matriz de 3 sabotajes; aquí quedan los casos 8-12 apuntando al CANDADO NUEVO: que la
// vitrina no se cuele de vuelta a la bienvenida, que es la decisión que hay que sostener.
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
const HTML = join(RAIZ, 'index.html');
const COACH = join(RAIZ, 'app-3-coach.js');
const SQL2 = join(RAIZ, 'supabase', 'community', 's1_showcase.sql');

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
  { n: 8, f: LOGIN, why: 'la vitrina vuelve a la app: el PO la quiso en la web, no en la bienvenida',
    de: 'const CIN_WELCOME_EXTRAS = [',
    a:  'async function renderShowcase(){ return 0; }\nconst CIN_WELCOME_EXTRAS = [' },
  { n: 9, f: HTML, why: 'vuelve el contenedor de la tira entre los botones y el formulario',
    de: '    <div id="install-hint" class="cin-install">',
    a:  '    <div id="cin-showcase" class="cin-showcase" style="display:none"></div>\n    <div id="install-hint" class="cin-install">' },
  { n: 10, f: CSS, why: 'vuelven los estilos de la tarjeta que ya no se pinta aqui',
    de: '.cin-hide-onform{display:none!important}',
    a:  '.cin-hide-onform{display:none!important}\n.sc-card{flex:0 0 82%}' },
  { n: 11, f: HTML, why: 'CONTROL del candado: se lleva por delante el enlace a la web, que es adonde se fueron las tarjetas',
    de: '<a class="cin-web" href="https://avi-web-chi.vercel.app/"',
    a:  '<a class="cin-webXX" href="https://ejemplo-invalido.test/"' },
  // ⚠️ El ancla va con `s.coach_id`: `count(*)` a secas aparece DOS veces en el .sql (la otra
  //    valida las claves del jsonb) y el runner lo canta como «NO SE APLICÓ» — gotcha vigente.
  { n: 12, f: SQL2, why: 'el servidor deja de topar las tarjetas por coach: las de uno desplazan a las del otro',
    de: 'where s.coach_id = new.coach_id) >= 6 then',
    a:  'where s.coach_id = new.coach_id) >= 60 then' },
];

// 🔴 EL CASO QUE DEBE PASAR. No es relleno: sin él, una suite que reventara por cualquier motivo
// daría 12/12 «muerden» y parecería perfecta. Aquí se cambia algo REAL y ajeno al candado —el
// texto del chip pasa a mayúsculas por CSS, que ya era el aspecto— y la suite tiene que SEGUIR
// VERDE. Si esto cae, las aserciones están atadas a la forma y no a la conducta.
const DEBE_PASAR = [
  // ⏮️ v578: el control apuntaba al CSS del chip, que se fue con la vitrina. Se reapunta a un
  // cambio igual de real y de ajeno: el RÓTULO del botón con el que el coach publica. Cambiar
  // cómo se dice algo NO puede poner la suite en rojo; si esto cae, las aserciones están atadas
  // a la redacción y no a la conducta.
  { n: 'P1', f: COACH, why: 'cambiar el rótulo del botón de publicar NO puede romper la suite',
    de: 'Publicar en mi web (la ve cualquiera)',
    a:  'Publicar en mi web (la ve todo el mundo)' },
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
