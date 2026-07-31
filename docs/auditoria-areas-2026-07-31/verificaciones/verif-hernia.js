// Verificación propia del hallazgo 2 de la auditoría deportiva:
// "aunque se declare hernia discal, el generador sigue entregando flexión de columna cargada"
const core = require('C:/Users/KRONOS/Desktop/AVI/apex-app/avi-core.js');
const path = 'C:/Users/KRONOS/Desktop/AVI/apex-app/';

// Catálogo real de la app (no inventado).
const fs = require('fs');
let lib = null;
{
  const txt = fs.readFileSync(path + 'app-1-infra.js', 'utf8');
  const start = txt.indexOf('const defaultExercises=[');
  const open = txt.indexOf('[', start);
  // Cierre real del array: contar corchetes respetando comillas.
  let depth = 0, i = open, q = null, end = -1;
  for (; i < txt.length; i++) {
    const c = txt[i], p = txt[i - 1];
    if (q) { if (c === q && p !== '\\') q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  lib = eval(txt.slice(open, end + 1));
  console.log('catálogo real desde app-1-infra.js →', lib.length, 'ejercicios');
}
if (!lib) { console.log('NO encontré el catálogo — abortando en vez de inventarlo'); process.exit(2); }

// 1) ¿Qué detecta parseLimitations con la nota real?
const nota = 'Hernia discal L4-L5 diagnosticada, dolor lumbar al flexionar';
const lim = core.parseLimitations(nota);
console.log('\n--- parseLimitations ---');
console.log('detectado:', lim.detected, '| zonas:', lim.zones, '| hasExclusions:', lim.hasExclusions);
console.log('LO QUE LE PROMETE AL COACH:', JSON.stringify(lim.advice));

// 2) Correr el generador de verdad, varias veces (es determinista por seed).
const FLEXION = /crunch|abdominal|russian|twist|elevacion de piernas|elevaciones de piernas|encogimiento|sit ?up|bicicleta/i;
const cliente = {
  id: 'verif1', name: 'Prueba Hernia', sex: 'M', age: 35, weight: 82, height: 175,
  goal: 'hipertrofia', level: 'intermedio', days: 4, notes: nota, place: 'gimnasio',
};

let planes = 0, conFlexion = 0;
const ejemplos = new Set();
for (let seed = 1; seed <= 60; seed++) {
  const out = core.generarRutinas(cliente, lib, { seed, now: new Date('2026-07-31T12:00:00Z'), idFn: () => 'r' + seed });
  if (!out || !out.routines) continue;
  planes++;
  let hit = false;
  out.routines.forEach(r => (r.exercises || []).forEach(e => {
    if (FLEXION.test(e.name || '')) { hit = true; ejemplos.add(e.name); }
  }));
  if (hit) conFlexion++;
}
console.log('\n--- generarRutinas con hernia declarada ---');
console.log('planes generados:', planes, '| planes CON flexión de columna:', conFlexion);
console.log('ejercicios que se colaron:', [...ejemplos].join(' · ') || '(ninguno)');

// 3) CONTROL: ¿la exclusión que SÍ está en la regex funciona? Si no, mi sonda miente.
const LUMBAR_OK = /peso muerto|remo con barra|buenos dias|hiperexten|sentadilla/i;
let conExcluidos = 0;
for (let seed = 1; seed <= 60; seed++) {
  const out = core.generarRutinas(cliente, lib, { seed, now: new Date('2026-07-31T12:00:00Z'), idFn: () => 'r' + seed });
  if (!out || !out.routines) continue;
  out.routines.forEach(r => (r.exercises || []).forEach(e => {
    if (LUMBAR_OK.test(e.name || '')) conExcluidos++;
  }));
}
console.log('\n--- CONTROL (lo que la regex SÍ excluye) ---');
console.log('apariciones de peso muerto/sentadilla/remo con barra:', conExcluidos, '(debe ser 0 si el filtro corre)');
