#!/usr/bin/env node
// _fable3-comida-casos.mjs — casos REALISTAS de la matriz de comida, día por día.   node scripts/e2e/_fable3-comida-casos.mjs
import { join } from 'node:path';
import { createRequire } from 'node:module';
const core = createRequire(join(import.meta.dirname, '..', '..', 'x.js'))('./avi-core.js');
const rut = n => ['Lunes', 'Miércoles', 'Viernes', 'Martes', 'Jueves'].slice(0, n).map((d, i) => ({ id: 'r' + i, day: d, name: i % 2 ? 'Pierna' : 'Torso', exercises: [{ id: 'e36', name: i % 2 ? 'Prensa de Pierna' : 'Press de Pecho en Máquina', muscle: i % 2 ? 'piernas' : 'pecho', sets: 3, reps: 10 }] }));
const CASOS = [
  ['embarazada adulta', { sex: 'F', age: 28, height: 160, weight: 65, goal: 'Perder grasa', activityFactor: 1.55, notes: 'estoy embarazada de 5 meses' }, 3],
  ['embarazada sedentaria', { sex: 'F', age: 32, height: 158, weight: 72, goal: 'Salud general', activityFactor: 1.2, notes: 'embarazada' }, 3],
  ['menor de 16', { sex: 'F', age: 16, height: 160, weight: 55, goal: 'Perder grasa', activityFactor: 1.55, notes: '' }, 3],
  ['menor de 15 varón', { sex: 'M', age: 15, height: 170, weight: 60, goal: 'Ganar músculo', activityFactor: 1.55, notes: '' }, 4],
  ['mujer baja en el piso', { sex: 'F', age: 45, height: 150, weight: 50, goal: 'Perder grasa', activityFactor: 1.2, notes: '' }, 3],
  ['mujer peso bajo', { sex: 'F', age: 22, height: 165, weight: 46, goal: 'Perder grasa', activityFactor: 1.55, notes: '' }, 3],
  ['hombre peso bajo', { sex: 'M', age: 20, height: 178, weight: 54, goal: 'Perder grasa', activityFactor: 1.55, notes: '' }, 3],
];
console.log('forma de nutWeekTargets:', JSON.stringify(core.nutWeekTargets(core.nutBaseFor(CASOS[0][1], null), rut(3))).slice(0, 420));
for (const [tit, c, d] of CASOS) {
  const e = core.nutritionEstimate(c), b = core.nutBaseFor(c, null), wk = core.nutWeekTargets(b, rut(d));
  const lista = Array.isArray(wk) ? wk : (wk.days || wk.dias);
  const imc = (c.weight / (c.height / 100) ** 2).toFixed(1);
  console.log(`\n${tit} · ${c.sex} ${c.age}a ${c.height}cm ${c.weight}kg IMC ${imc} «${c.goal}» act ${c.activityFactor} ${c.notes ? '· «' + c.notes + '»' : ''}`);
  console.log(`  basal ${Math.round(e.tmb)} · gasto ${e.tdee} · gasto×1,05 ${Math.round(e.tdee * 1.05)} · base ${b.kcalObj} · rótulo «${e.label}»`);
  console.log('  semana: ' + lista.map(x => `${(x.day || x.dia || '').slice(0, 3)} ${x.kcal != null ? x.kcal : x.target && x.target.kcal}${x.kind ? '(' + x.kind + ')' : ''}`).join(' · '));
  const ks = lista.map(x => x.kcal != null ? x.kcal : x.target && x.target.kcal); console.log(`  día más bajo ${Math.min(...ks)} · promedio ${Math.round(ks.reduce((a, x) => a + x, 0) / ks.length)}`);
}
