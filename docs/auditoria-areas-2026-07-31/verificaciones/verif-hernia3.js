// Verificación 3 — ¿mi propia regex tiene falsos positivos? ¿y qué se entrega REALMENTE?
const fs = require('fs');
const core = require('C:/Users/KRONOS/Desktop/AVI/apex-app/avi-core.js');
const path = 'C:/Users/KRONOS/Desktop/AVI/apex-app/';
let lib;
{
  const txt = fs.readFileSync(path + 'app-1-infra.js', 'utf8');
  const open = txt.indexOf('[', txt.indexOf('const defaultExercises=['));
  let depth = 0, q = null, end = -1;
  for (let i = open; i < txt.length; i++) {
    const c = txt[i], p = txt[i - 1];
    if (q) { if (c === q && p !== '\\') q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') depth++; else if (c === ']') { depth--; if (!depth) { end = i; break; } }
  }
  lib = eval(txt.slice(open, end + 1));
}

const re = /crunch|abdominal|russian|twist|elevacion de piernas|encogimiento|sit ?up|bicicleta/i;
console.log('LO QUE MI REGEX MARCÓ — ¿es de verdad flexión de columna?\n');
console.log('nombre'.padEnd(36) + '| músculo        | tipo');
console.log('-'.repeat(78));
lib.filter(e => re.test(e.name)).forEach(e =>
  console.log(String(e.name).padEnd(36) + '| ' + String(e.muscle).padEnd(14) + '| ' + e.type));

// Ahora: entregas REALES por ejercicio, con y sin la nota de hernia.
const NOTA = 'Hernia discal L4-L5 diagnosticada, dolor lumbar al flexionar';
function contar(conNota) {
  const tally = {};
  for (const sex of ['M', 'F']) for (const level of ['Principiante', 'Intermedio', 'Avanzado'])
    for (const goal of ['Ganar músculo', 'Perder grasa', 'Mantener'])
      for (const days of [3, 4, 5]) for (const place of ['gimnasio', 'casa']) {
        const c = { id: 'v', name: 'P', sex, age: 35, weight: 82, height: 175,
                    goal, level, days, place, notes: conNota ? NOTA : '' };
        const out = core.generarRutinas(c, lib, { seed: 7, now: new Date('2026-07-31T12:00:00Z'), idFn: () => 'r' });
        (out && out.routines || []).forEach(r => (r.exercises || []).forEach(e => {
          if (re.test(e.name || '')) tally[e.name] = (tally[e.name] || 0) + 1;
        }));
      }
  return tally;
}
const sin = contar(false), con = contar(true);
console.log('\nENTREGAS REALES en 108 planes (barrido de perfiles)\n');
console.log('ejercicio'.padEnd(36) + '| sin nota | con hernia');
console.log('-'.repeat(64));
[...new Set([...Object.keys(sin), ...Object.keys(con)])].sort().forEach(n =>
  console.log(String(n).padEnd(36) + '| ' + String(sin[n] || 0).padEnd(9) + '| ' + (con[n] || 0)));
