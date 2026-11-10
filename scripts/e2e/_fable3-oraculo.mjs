#!/usr/bin/env node
// _fable3-oraculo.mjs — oráculo INDEPENDIENTE de `exerciseContraindicated`: clasifica cada ejercicio por lo que dice
// su propia FICHA (desc + descSimple + tipo), no por las listas de la app, y lo cruza con lo que entregan el generador
// y los entrenamientos rápidos. Solo LEE. Lo que marca es CANDIDATO: se revisa a ojo.   node scripts/e2e/_fable3-oraculo.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const RAIZ = join(import.meta.dirname, '..', '..');
const core = createRequire(join(RAIZ, 'x.js'))('./avi-core.js');
const infra = readFileSync(join(RAIZ, 'app-1-infra.js'), 'utf8');
const ini = infra.indexOf('const defaultExercises=['); const fin = infra.indexOf('\n];', ini);
const LIB = vm.runInNewContext('(' + infra.slice(ini + 'const defaultExercises='.length, fin + 2) + ')');
const e4 = readFileSync(join(RAIZ, 'app-4-entreno.js'), 'utf8');
const qi = e4.indexOf('const QUICK_WORKOUTS=['); const qf = e4.indexOf('\n];', qi);
const QW = vm.runInNewContext('(' + e4.slice(qi + 'const QUICK_WORKOUTS='.length, qf + 2) + ')');
console.log('catálogo:', LIB.length, '· rápidos:', QW.length);
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ficha = e => norm(e.name + ' · ' + (e.desc || '') + ' · ' + (e.descSimple || ''));
// rasgos leídos de la ficha
const R = {
  supino: f => /boca arriba|acostad[oa] (de espaldas|en el (suelo|piso|banco))|tumbad[oa] (de espaldas|en (el|un) (suelo|piso|banco))|tumbate (de espaldas|en (el|un) (suelo|piso|banco))|acuestate (de espaldas|en (el|un) (suelo|piso|banco)|boca arriba)|espalda (apoyada |pegada |plana )?(en|sobre|contra) (el|un) (suelo|piso|banco plano)/.test(f),
  prono: f => /boca abajo|pecho (apoyado|contra) (en|sobre)? ?(el|un) (banco|suelo|piso)|acostad[oa] sobre el (vientre|abdomen|estomago)/.test(f),
  flexCol: f => /crunch|abdominales? (corto|clasic)|enrolla|sube el torso|despega (los hombros|la espalda)|lleva el pecho a las rodillas|redondea/.test(f) && !/sin redondear|no redondees|nunca redondees|no enrolles/.test(f),
  rotCarga: f => /gira el (torso|tronco)|rotacion de(l)? (torso|tronco)|rota el (torso|tronco)/.test(f),
  impacto: f => /\bsalt(a|o|os|ar|ando)\b|brinc|aterriza|explosiv|sprint|a toda velocidad/.test(f),
  axial: f => /barra (sobre|en) (la espalda|los hombros|el trapecio|los trapecios)|barra en la espalda alta/.test(f),
  bisagraCarga: f => /peso muerto|buenos dias|inclina(te)? (el torso )?hacia adelante/.test(f) && /barra|mancuerna|pesa/.test(f),
  overhead: f => /sobre la cabeza|por encima de la cabeza|encima de (tu|la) cabeza|arriba de la cabeza/.test(f),
  isometrico: (f, e) => e.type === 'Isométrico' || /manten(ga|er)? la posicion|aguanta/.test(f),
  hiit: (f, e) => e.type === 'HIIT' || /\bhiit\b|intervalo/.test(f),
  rodProf: f => /sentadilla|zancada|desplante|estocada|en cuclillas/.test(f),
};
const ORAC = {
  'hernia lumbar': ['flexCol', 'rotCarga', 'impacto', 'axial', 'bisagraCarga'],
  'embarazada de 6 meses': ['supino', 'prono', 'impacto', 'hiit', 'flexCol'],
  'hipertension': ['isometrico', 'hiit', 'impacto'],
  'dolor de rodilla': ['impacto', 'rodProf'],
  'lesion de hombro': ['overhead'],
};
const rasgos = e => { const f = ficha(e); return Object.keys(R).filter(k => R[k](f, e)); };
const ESTILO = { gym: { env: 'gym', bias: 'hipertrofia' }, casa: { env: 'casa', bias: 'hipertrofia' }, corporal: { env: 'corporal', bias: null }, parque: { env: 'parque', bias: 'calistenia' } };
const OBJ = ['Perder grasa', 'Ganar músculo', 'Fuerza', 'Resistencia', 'Salud general'];
for (const [nota, malos] of Object.entries(ORAC)) {
  const lim = core.parseLimitations(nota);
  console.log(`\n══ «${nota}» → claves ${JSON.stringify(lim.keys)}`);
  const visto = new Map(); let corridas = 0, minReps = 99;
  for (const place of Object.keys(ESTILO)) for (const days of [2, 3, 4, 5]) for (const goal of OBJ)
    for (const level of ['Principiante', 'Intermedio', 'Avanzado']) for (const sex of nota.startsWith('embaraz') ? ['F'] : ['M', 'F']) for (const seed of [1, 2, 3]) {
      let i = 0;
      const res = core.generarRutinas({ sex, age: 30, level, days, goal, notes: nota, place }, LIB,
        { idFn: () => 'r' + (i++), startDay: 'Lunes', seed, place: ESTILO[place].env, methodBias: ESTILO[place].bias, adaptation: level === 'Principiante', audience: 'client', now: '2026-11-10T15:00:00.000Z' });
      corridas++;
      (res.routines || []).forEach(r => (r.exercises || []).forEach(x => {
        const base = LIB.find(l => l.id === x.id) || x;
        const rr = parseInt(x.reps); if (x.track !== 'tiempo' && base.type !== 'Isométrico' && base.type !== 'Cardio' && base.type !== 'HIIT' && rr > 0 && rr < minReps) minReps = rr;
        const hit = rasgos(base).filter(k => malos.includes(k));
        if (hit.length) { const k = base.id + ' ' + base.name; const v = visto.get(k) || { hit, lugares: new Set(), n: 0, type: base.type }; v.lugares.add(place); v.n++; visto.set(k, v); }
      }));
    }
  console.log(`   ${corridas} planes · repeticiones mínimas vistas (sin tiempo/cardio): ${minReps}`);
  [...visto.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => console.log(`   ⚠️ ${k} [${v.type}] ← ${v.hit.join('+')} · ${v.n} veces · ${[...v.lugares].join(',')}`));
  // rápidos
  const fits = core.quickWorkoutsFor(QW, lim.keys, LIB);
  fits.forEach(f => {
    if (f.oculto) { console.log(`   rápido «${f.w.name}»: OCULTO`); return; }
    const ids = f.w.cardio ? f.opciones : f.w.items.map(i => i.id);
    const formatoHiit = !f.w.cardio && f.w.items.some(i => i.hiit);
    const sospe = ids.map(id => LIB.find(l => l.id === id)).filter(Boolean).map(b => ({ b, hit: rasgos(b).filter(k => malos.includes(k)) })).filter(x => x.hit.length);
    console.log(`   rápido «${f.w.name}»: quedan ${f.quedan}/${f.total}${formatoHiit ? ' · SIGUE EN FORMATO HIIT (' + ids.map(id => (LIB.find(l => l.id === id) || {}).name).join(' | ') + ')' : ''}${sospe.length ? ' · ⚠️ ' + sospe.map(s => s.b.id + ' ' + s.b.name + ' ← ' + s.hit.join('+')).join(' ; ') : ''}`);
  });
}
