// ¿Toda mujer principiante recibe CERO series de glúteo?
const fs = require('fs');
const core = require('C:/Users/KRONOS/Desktop/AVI/apex-app/avi-core.js');
const path = 'C:/Users/KRONOS/Desktop/AVI/apex-app/';
let lib;
{
  const txt = fs.readFileSync(path + 'app-1-infra.js', 'utf8');
  const open = txt.indexOf('[', txt.indexOf('const defaultExercises=['));
  let d = 0, q = null, end = -1;
  for (let i = open; i < txt.length; i++) {
    const c = txt[i], p = txt[i - 1];
    if (q) { if (c === q && p !== '\\') q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') d++; else if (c === ']') { d--; if (!d) { end = i; break; } }
  }
  lib = eval(txt.slice(open, end + 1));
}
const byName = {}; lib.forEach(e => byName[e.name] = e);
const musculos = [...new Set(lib.map(e => e.muscle))];
console.log('músculos del catálogo:', musculos.join(', '));
const esGluteo = e => /gluteo|glúteo/i.test(e.muscle || '') || /gluteo|glúteo|hip thrust|puente de cadera|patada/i.test(e.name || '');
console.log('ejercicios de glúteo en el catálogo:', lib.filter(esGluteo).length);

for (const level of ['Principiante', 'Intermedio', 'Avanzado']) {
  for (const sex of ['F', 'M']) {
    let planes = 0, conGluteo = 0, series = 0;
    for (const goal of ['Ganar músculo', 'Perder grasa', 'Mantener', 'Tonificar'])
      for (const days of [2, 3, 4, 5]) for (const place of ['gimnasio', 'casa', 'parque'])
        for (const seed of [1, 7, 42]) {
          const c = { id: 'v', name: 'P', sex, age: 25, weight: 70, height: 165, goal, level, days, place, notes: '' };
          let out; try { out = core.generarRutinas(c, lib, { seed, now: new Date('2026-07-31T12:00:00Z'), idFn: () => 'r' }); } catch (e) { continue; }
          if (!out || !out.routines) continue;
          planes++;
          let hit = 0;
          out.routines.forEach(r => (r.exercises || []).forEach(e => {
            const def = byName[e.name] || e;
            if (esGluteo(def)) { hit++; series += Number(e.sets) || 0; }
          }));
          if (hit) conGluteo++;
        }
    console.log(`${level.padEnd(13)} ${sex}  planes ${String(planes).padEnd(5)} con glúteo ${String(conGluteo).padEnd(5)} series totales ${series}`);
  }
}
