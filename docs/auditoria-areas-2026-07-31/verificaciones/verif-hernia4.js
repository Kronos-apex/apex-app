// Verificación 4 — barrido ANCHO: ¿el generador programa core/abdomen alguna vez?
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
const byName = {}; lib.forEach(e => byName[e.name] = e);
console.log('ejercicios de músculo "core" en el catálogo:', lib.filter(e => e.muscle === 'core').length);

const NOTA = 'Hernia discal L4-L5 diagnosticada, dolor lumbar al flexionar';
const goals = ['Ganar músculo', 'Perder grasa', 'Mantener', 'Tonificar', 'Fuerza', 'Resistencia', ''];
const levels = ['Principiante', 'Intermedio', 'Avanzado', 'principiante', 'intermedio', 'avanzado'];
const places = ['gimnasio', 'casa', 'parque', ''];

const R = { false: {planes:0, flex:0, excl:0, n:{}}, true: {planes:0, flex:0, excl:0, n:{}} };
const FLEX_RE = /crunch|russian|twist|elevacion de piernas|rueda abdominal|hollow|sit ?up/i;
const EXCL_RE = /peso muerto|remo con barra|buenos dias|hiperexten|sentadilla/i;
const nombresCore = {};
for (const conNota of [false, true]) {
  const acc = R[conNota];
  for (const sex of ['M', 'F']) for (const level of levels) for (const goal of goals)
    for (const days of [2, 3, 4, 5, 6]) for (const place of places) for (const seed of [1, 7, 42]) {
      const c = { id: 'v', name: 'P', sex, age: 30, weight: 80, height: 172,
                  goal, level, days, place, notes: conNota ? NOTA : '' };
      let out; try { out = core.generarRutinas(c, lib, { seed, now: new Date('2026-07-31T12:00:00Z'), idFn: () => 'r' }); } catch (e) { continue; }
      if (!out || !out.routines) continue;
      acc.planes++;
      out.routines.forEach(r => (r.exercises || []).forEach(e => {
        const nm = e.name || '';
        if (FLEX_RE.test(nm)) { acc.flex++; acc.n[nm] = (acc.n[nm] || 0) + 1; }
        if (EXCL_RE.test(nm)) acc.excl++;
      }));
    }
}
const A = R[false], B = R[true];
console.log('');
console.log('                                     SIN nota    CON hernia declarada');
console.log('planes generados                     ' + String(A.planes).padEnd(11) + B.planes);
console.log('FLEXION DE COLUMNA entregada         ' + String(A.flex).padEnd(11) + B.flex);
console.log('peso muerto/sentadilla/remo (CONTROL)' + String(A.excl).padEnd(11) + B.excl + '   <- debe caer a 0');
console.log('');
console.log('Flexion que sigue entregandose CON la nota:');
Object.entries(B.n).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  ' + String(k).padEnd(34) + v));
