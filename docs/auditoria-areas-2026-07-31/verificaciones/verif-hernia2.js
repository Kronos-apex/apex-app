// Verificación 2 — con control que DISCRIMINA: el mismo perfil con y sin la nota de hernia.
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

const FLEXION = /crunch|abdominal|russian|twist|elevacion de piernas|elevaciones de piernas|encogimiento|sit ?up|bicicleta|plancha lateral con giro/i;
const YA_EXCLUIDO = /peso muerto|remo con barra|buenos dias|hiperexten|sentadilla/i;
const NOTA = 'Hernia discal L4-L5 diagnosticada, dolor lumbar al flexionar';

// ¿Qué ejercicios del catálogo son flexión de columna? Si son 0, el test no puede detectar nada.
const enCatalogo = lib.filter(e => FLEXION.test(e.name || ''));
console.log('flexión de columna EN EL CATÁLOGO:', enCatalogo.length);
console.log('  ' + enCatalogo.map(e => e.name).join(' · '));

const sexos = ['M', 'F'], niveles = ['Principiante', 'Intermedio', 'Avanzado'];
const metas = ['Ganar músculo', 'Perder grasa', 'Mantener'], dias = [3, 4, 5], sitios = ['gimnasio', 'casa'];

function barrer(conNota) {
  let planes = 0, flex = 0, excl = 0;
  const nombres = new Set();
  for (const sex of sexos) for (const level of niveles) for (const goal of metas)
    for (const d of dias) for (const place of sitios) {
      const c = { id: 'v', name: 'P', sex, age: 35, weight: 82, height: 175, goal, level,
                  days: d, place, notes: conNota ? NOTA : '' };
      const out = core.generarRutinas(c, lib, { seed: 7, now: new Date('2026-07-31T12:00:00Z'), idFn: () => 'r' });
      if (!out || !out.routines) continue;
      planes++;
      out.routines.forEach(r => (r.exercises || []).forEach(e => {
        const n = e.name || '';
        if (FLEXION.test(n)) { flex++; nombres.add(n); }
        if (YA_EXCLUIDO.test(n)) excl++;
      }));
    }
  return { planes, flex, excl, nombres: [...nombres] };
}

const sin = barrer(false), con = barrer(true);
console.log('\n                              SIN nota    CON nota de hernia');
console.log('planes generados               ', String(sin.planes).padEnd(11), con.planes);
console.log('flexión de columna entregada   ', String(sin.flex).padEnd(11), con.flex);
console.log('peso muerto/sentadilla/remo    ', String(sin.excl).padEnd(11), con.excl, '  ← CONTROL: debe caer a 0');
console.log('\nflexión que se cuela CON la nota:', con.nombres.join(' · ') || '(ninguna)');
