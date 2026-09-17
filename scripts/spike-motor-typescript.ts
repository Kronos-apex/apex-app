// SPIKE VERSIONADO — la prueba de que la migracion a un stack moderno no exige reescribir el motor.
//
// Se compila con el TypeScript 5 que YA esta instalado en avi-web (Next 16 + React 19 + Tailwind 4)
// e importa avi-core.js SIN TOCARLE UNA LINEA. Si esto compila y corre, los 11.574 lines del motor
// -generador de rutinas, nutricion, progresion de carga, filtros de lesion- no se reescriben en la
// migracion: se importan. Plan: docs/plan-migracion-moderna.md
//
// Corre:  ../avi-web/node_modules/.bin/tsc scripts/spike-motor-typescript.ts --allowJs --esModuleInterop --skipLibCheck --target ES2022 --module commonjs --outDir scripts/_spike-out
//         node scripts/_spike-out/scripts/spike-motor-typescript.js
// Resultado medido el 17-sep-2026: 534 funciones · TDEE 2178 kcal · 18 festivos · 0 errores de tipos.

import * as core from '../avi-core.js';

const gasto: any = core.nutritionEstimate(
  { sex: 'F', age: 33, weight: 70, height: 165, activityFactor: 1.55, goal: 'Perder grasa' } as any);
const racha: any = core.weekStreak(
  [{ date: '2026-09-15T10:00:00Z', finishedAt: '2026-09-15T11:00:00Z' }] as any, 2, new Date('2026-09-17'));

console.log('funciones del motor disponibles:', Object.keys(core).length);
console.log('TDEE calculado por el motor real:', gasto && gasto.tdee, 'kcal');
console.log('racha:', racha && racha.weeks, 'semanas ·', racha && racha.thisWeekDays, 'días esta semana');
console.log('whatsapp normalizado:', core.waPhone('300 123 4567'));
console.log('festivos colombianos 2026:', core.festivosCO(2026).length);
