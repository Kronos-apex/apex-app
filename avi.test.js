// avi.test.js — Tests críticos de negocio AVI
// Ejecutar con: node avi.test.js
// Sin dependencias externas — Node.js puro.
//
// Estos tests prueban avi-core.js DIRECTAMENTE (la misma fuente que carga
// index.html). No hay lógica duplicada: si cambias una función en
// avi-core.js, el test refleja el cambio automáticamente.

const assert = require('assert');
const core = require('./avi-core.js');
const {
  getIccLabel,
  getSexCode,
  calcMacrosSugeridos,
  migrateRoutineIds,
  shouldPostPush,
  delClientGuard,
  cnTodayGuard,
  generarRutinas,
  parseLimitations,
  inferExerciseEnv,
  mergeHistory,
  mergeClientArrays,
  mergePRs,
  retentionByDay,
  weeklyActiveCount,
  clientsTrainedToday,
  daysSinceLastSession,
  workoutStreak,
  sortRoutinesByDay,
  genSchemeFor,
  restForType,
  restForExercise,
  bisetBlocks,
  guidedStepOrder,
  bisetInfo,
  normalizeBisets,
  isInAdaptation,
  estimate1RM,
  suggestLoad,
  suggestFromPR,
  warmupLoad,
  dropLoad,
  bmiFrom,
  bodyLoadProfile,
  validateSignup,
  isFreeClient,
  clientToRow,
  rowToClient,
  USER_DATA_COLLECTIONS,
  MOOD_STATES,
  applyMood,
  MS,
  fmtMetric,
  fmtDuration,
  feelingEmoji,
  feelingLabel,
  inferNutGoal,
  calcTMB,
  calcTDEE,
  getRctLabel,
  getGoalMsg,
  kcalTargetFor,
  calcMacrosFromKcal,
  gxLevel,
  gxDiscount,
  gxNextTier,
  computeExerciseProgress,
  weekEditorial,
  exTrack,
  prFromSets,
  isBetterPR,
} = core;

// Biblioteca mínima de prueba que cubre todos los músculos/tipos que usa el generador.
// (No depende de index.html — pequeña pero suficiente para validar la lógica.)
const LIB = [
  // pecho
  { id: 'p1', name: 'Press de Banca', muscle: 'pecho', type: 'Compuesto', sets: 4, reps: 10, icon: '🏋️' },
  { id: 'p2', name: 'Press Inclinado Mancuernas', muscle: 'pecho', type: 'Compuesto', sets: 3, reps: 12, icon: '📐' },
  { id: 'p3', name: 'Aperturas con Cable', muscle: 'pecho', type: 'Aislamiento', sets: 3, reps: 15, icon: '📉' },
  { id: 'p4', name: 'Flexiones', muscle: 'pecho', type: 'Bodyweight', sets: 3, reps: 15, icon: '🤜' },
  // espalda
  { id: 'b1', name: 'Remo con Barra', muscle: 'espalda', type: 'Compuesto', sets: 4, reps: 10, icon: '⬇️' },
  { id: 'b2', name: 'Jalón al Pecho', muscle: 'espalda', type: 'Compuesto', sets: 3, reps: 12, icon: '🔄' },
  { id: 'b3', name: 'Remo en Polea Sentado', muscle: 'espalda', type: 'Compuesto', sets: 4, reps: 10, icon: '🚣' },
  { id: 'b4', name: 'Pullover en Polea', muscle: 'espalda', type: 'Aislamiento', sets: 3, reps: 12, icon: '🌊' },
  // hombros
  { id: 'h1', name: 'Press Militar con Barra', muscle: 'hombros', type: 'Compuesto', sets: 4, reps: 8, icon: '⬆️' },
  { id: 'h2', name: 'Press Militar en Máquina', muscle: 'hombros', type: 'Compuesto', sets: 4, reps: 10, icon: '🖥️' },
  { id: 'h3', name: 'Elevaciones Laterales', muscle: 'hombros', type: 'Aislamiento', sets: 4, reps: 15, icon: '🚣' },
  { id: 'h4', name: 'Face Pull en Polea', muscle: 'hombros', type: 'Aislamiento', sets: 4, reps: 15, icon: '🎯' }, // rear delt detectado por NOMBRE
  { id: 'h5', name: 'Elevaciones Y-T-W en Suelo', muscle: 'hombros', type: 'Aislamiento', muscleLabel: 'Hombro posterior y postura', sets: 3, reps: 15, icon: '🔠' }, // rear delt solo por muscleLabel (caso e109)
  // biceps
  { id: 'bi1', name: 'Curl con Barra', muscle: 'biceps', type: 'Aislamiento', sets: 3, reps: 12, icon: '🧲' },
  { id: 'bi2', name: 'Curl Martillo', muscle: 'biceps', type: 'Aislamiento', sets: 3, reps: 12, icon: '🎣' },
  { id: 'bi3', name: 'Curl en Polea Baja', muscle: 'biceps', type: 'Aislamiento', sets: 3, reps: 15, icon: '〰️' },
  // triceps
  { id: 't1', name: 'Extensión en Polea Alta', muscle: 'triceps', type: 'Aislamiento', sets: 4, reps: 15, icon: '📉' },
  { id: 't2', name: 'Skull Crushers', muscle: 'triceps', type: 'Aislamiento', sets: 3, reps: 12, icon: '💀' },
  { id: 't3', name: 'Fondos Gironda', muscle: 'triceps', type: 'Bodyweight', sets: 4, reps: 10, icon: '🧘' },
  // piernas
  { id: 'pi1', name: 'Sentadilla con Barra', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 10, icon: '🦵' },
  { id: 'pi2', name: 'Prensa de Piernas', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 12, icon: '🔩' },
  { id: 'pi3', name: 'Peso Muerto Rumano', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 10, icon: '🏗️' },
  { id: 'pi4', name: 'Extensión de Cuádriceps', muscle: 'piernas', type: 'Aislamiento', sets: 3, reps: 15, icon: '🦿' },
  { id: 'pi5', name: 'Curl Femoral', muscle: 'piernas', type: 'Aislamiento', sets: 3, reps: 15, icon: '🦵' },
  { id: 'pi6', name: 'Zancadas con Mancuernas', muscle: 'piernas', type: 'Funcional', sets: 3, reps: 12, icon: '🚶' },
  // gluteo
  { id: 'g1', name: 'Hip Thrust', muscle: 'gluteo', type: 'Compuesto', sets: 4, reps: 12, icon: '🍑' },
  { id: 'g2', name: 'Puente de Glúteo', muscle: 'gluteo', type: 'Compuesto', sets: 4, reps: 15, icon: '🌉' },
  { id: 'g3', name: 'Patada de Glúteo en Polea', muscle: 'gluteo', type: 'Aislamiento', sets: 3, reps: 15, icon: '🦶' },
  { id: 'g4', name: 'Abducción de Cadera', muscle: 'gluteo', type: 'Aislamiento', sets: 3, reps: 20, icon: '↔️' },
  // core
  { id: 'co1', name: 'Plancha', muscle: 'core', type: 'Isométrico', sets: 3, reps: 60, icon: '🧱' },
  { id: 'co2', name: 'Crunch Abdominal', muscle: 'core', type: 'Bodyweight', sets: 3, reps: 20, icon: '🔽' },
  { id: 'co3', name: 'Dead Bug', muscle: 'core', type: 'Bodyweight', sets: 3, reps: 12, icon: '🐞' },
  // cardio
  { id: 'ca1', name: 'Caminata Inclinada', muscle: 'cardio', type: 'Cardio', sets: 1, reps: 20, icon: '🚶' },
  { id: 'ca2', name: 'Bicicleta', muscle: 'cardio', type: 'Cardio', sets: 1, reps: 15, icon: '🚴' },
  { id: 'ca3', name: 'Burpees HIIT', muscle: 'cardio', type: 'HIIT', sets: 4, reps: 8, icon: '🔥' },
];

let passed = 0, failed = 0, total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

// ══════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════

section('1. ICC — umbral por sexo');

test('hombre sex="M", cintura 90cm, cadera 100cm → umbral masculino → Riesgo moderado', () => {
  const icc = 90 / 100; // 0.90
  const sexCode = getSexCode('M');
  assert.strictEqual(sexCode, 'M');
  const result = getIccLabel(icc, sexCode);
  // Con umbral masculino [0.90,0.95]: 0.90 < 0.90 = false → 0.90 < 0.95 = true → "Riesgo moderado"
  assert.strictEqual(result.label, 'Riesgo moderado',
    `Esperaba "Riesgo moderado" (umbral M). Si falla, se están usando umbrales femeninos`);
});

test('mismo ICC 0.90 con sex="F" → umbral femenino → Distribución de riesgo', () => {
  const result = getIccLabel(0.90, 'F');
  // Con umbral femenino [0.80,0.85]: 0.90 < 0.80 = false → 0.90 < 0.85 = false → "Distribución de riesgo"
  assert.strictEqual(result.label, 'Distribución de riesgo');
});

test('mujer ICC 0.78 → Distribución favorable', () => {
  const result = getIccLabel(0.78, 'F');
  assert.strictEqual(result.label, 'Distribución favorable');
});

test('getSexCode: cualquier valor distinto de "M" → "F"', () => {
  assert.strictEqual(getSexCode('M'), 'M');
  assert.strictEqual(getSexCode('F'), 'F');
  assert.strictEqual(getSexCode('Hombre'), 'F'); // el form guarda 'M'/'F', no etiquetas
  assert.strictEqual(getSexCode(undefined), 'F');
});

section('2. Macros — activityFactor → kcalPerKg');

test('activityFactor=1.55, goal="salud", peso 70kg → kcalPerKg=36, kcal=2520', () => {
  const result = calcMacrosSugeridos({ weight: 70, activityFactor: 1.55, goal: 'salud' });
  // 'salud' no contiene 'gan/perd/etc' → sin ajuste → 70 * 36 = 2520
  assert.strictEqual(result.kcal, 2520,
    `Esperaba 2520 (70kg × 36 kcal/kg). Recibió ${result.kcal}`);
});

test('goal="bajar de peso" → déficit de 350 kcal', () => {
  const base = calcMacrosSugeridos({ weight: 70, activityFactor: 1.55, goal: 'salud' });
  const cut = calcMacrosSugeridos({ weight: 70, activityFactor: 1.55, goal: 'bajar de peso' });
  assert.strictEqual(cut.kcal, base.kcal - 350);
});

test('goal="ganar masa muscular" → superávit de 250 kcal y proteína 2.2g/kg', () => {
  const base = calcMacrosSugeridos({ weight: 70, activityFactor: 1.55, goal: 'salud' });
  const bulk = calcMacrosSugeridos({ weight: 70, activityFactor: 1.55, goal: 'ganar masa muscular' });
  assert.strictEqual(bulk.kcal, base.kcal + 250);
  assert.strictEqual(bulk.prot, Math.round(70 * 2.2));
});

test('sin activityFactor → kcalPerKg fallback=33', () => {
  const result = calcMacrosSugeridos({ weight: 70, goal: 'salud' });
  assert.strictEqual(result.kcal, 70 * 33);
});

test('sin peso → fallback 70kg', () => {
  const result = calcMacrosSugeridos({ activityFactor: 1.2, goal: 'salud' });
  assert.strictEqual(result.kcal, 70 * 30);
});

section('3. routine.id migration');

test('rutina sin .id → recibe .id tras migración, retorna true', () => {
  const clients = [{ id: 'c1', routines: [{ name: 'Lunes' }] }];
  const migrated = migrateRoutineIds(clients);
  assert.strictEqual(migrated, true);
  assert.ok(clients[0].routines[0].id, 'La rutina debe tener id asignado');
  assert.ok(typeof clients[0].routines[0].id === 'string' && clients[0].routines[0].id.length > 0);
});

test('idFn personalizado se usa para generar el id', () => {
  const clients = [{ id: 'c1', routines: [{ name: 'Lunes' }] }];
  migrateRoutineIds(clients, () => 'fijo-123');
  assert.strictEqual(clients[0].routines[0].id, 'fijo-123');
});

test('rutina con .id existente no se sobreescribe', () => {
  const clients = [{ id: 'c1', routines: [{ name: 'Lunes', id: 'id-fijo' }] }];
  migrateRoutineIds(clients, () => 'NO');
  assert.strictEqual(clients[0].routines[0].id, 'id-fijo');
});

test('todas las rutinas con .id → retorna false (sin migración)', () => {
  const clients = [{ id: 'c1', routines: [{ name: 'Lunes', id: 'abc' }, { name: 'Miércoles', id: 'def' }] }];
  const migrated = migrateRoutineIds(clients);
  assert.strictEqual(migrated, false);
});

test('clients vacío o sin routines no rompe', () => {
  assert.strictEqual(migrateRoutineIds([]), false);
  assert.strictEqual(migrateRoutineIds([{ id: 'c1' }]), false);
});

section('4. shouldPostPush — guard de suscripción');

test('mismo endpoint que el guardado → NO postea (false)', () => {
  assert.strictEqual(shouldPostPush('https://push.ex/abc', 'https://push.ex/abc'), false);
});

test('endpoint distinto → sí postea (suscripción renovada)', () => {
  assert.strictEqual(shouldPostPush('endpoint-A', 'endpoint-B'), true);
});

test('cliente sin suscripción previa (stored=null) → postea', () => {
  assert.strictEqual(shouldPostPush(null, 'https://push.ex/abc'), true);
});

section('5. delClient — guard de confirmación');

test('confirm=false → no borra (retorna false)', () => {
  const client = { id: 'c1', name: 'Kathe' };
  assert.strictEqual(delClientGuard(client, () => false), false);
});

test('client=null → no borra', () => {
  assert.strictEqual(delClientGuard(null, () => true), false);
});

test('confirm=true + client válido → procede (retorna true)', () => {
  const client = { id: 'c1', name: 'Kathe' };
  assert.strictEqual(delClientGuard(client, () => true), true);
});

section('6. cnTab cn-today — re-render guard');

test('mismo día → NO re-renderiza', () => {
  const CUR = { todayRenderedDay: 'Martes', clientId: 'c1' };
  const result = cnTodayGuard(CUR, 'Martes', true);
  assert.strictEqual(result, false, 'Mismo día no debe disparar renderClientToday');
  assert.strictEqual(CUR.todayRenderedDay, 'Martes', 'CUR no debe cambiar');
});

test('día diferente → SÍ re-renderiza y actualiza CUR.todayRenderedDay', () => {
  const CUR = { todayRenderedDay: 'Lunes', clientId: 'c1' };
  const result = cnTodayGuard(CUR, 'Martes', true);
  assert.strictEqual(result, true, 'Día diferente debe disparar renderClientToday');
  assert.strictEqual(CUR.todayRenderedDay, 'Martes', 'CUR debe actualizarse al nuevo día');
});

test('sin clientId (clientExists=false) → no re-renderiza aunque el día cambie', () => {
  const CUR = { todayRenderedDay: 'Lunes' };
  const result = cnTodayGuard(CUR, 'Martes', false);
  assert.strictEqual(result, false);
});

section('7. Auto-generador de rutinas — generarRutinas()');

const FIXED = { idFn: () => 'rid', now: '2026-05-30T00:00:00.000Z' };

test('nº de rutinas = días (mujer, 4 días)', () => {
  const { routines } = generarRutinas({ sex: 'F', level: 'Intermedio', days: 4, goal: 'Ganar músculo' }, LIB, FIXED);
  assert.strictEqual(routines.length, 4);
  assert.deepStrictEqual(routines.map(r => r.day), ['Lunes', 'Martes', 'Miércoles', 'Jueves']);
});

test('mujer Intermedio → primer día es de glúteo/piernas (regla de Andrés)', () => {
  const { routines } = generarRutinas({ sex: 'F', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  assert.ok(/Gl[úu]teo/i.test(routines[0].name), `Esperaba bloque de glúteo primero, fue "${routines[0].name}"`);
});

test('hombre Intermedio 3 días → split Empuje/Tracción/Pierna', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  assert.deepStrictEqual(routines.map(r => r.name), ['Empuje', 'Tracción', 'Pierna']);
});

test('deltoides posterior NO cae en EMPUJE, sí en TRACCIÓN — por nombre Y por muscleLabel (Camilo 2026-06-25)', () => {
  // h4 = rear delt detectado por NOMBRE ("Face Pull"); h5 = rear delt detectado SOLO por
  // muscleLabel ("Hombro posterior", nombre sin la palabra — caso real e109). Ninguno debe
  // caer en Empuje (son músculo de tracción); el día de Tracción debe priorizar el posterior.
  const REAR = new Set(['h4', 'h5']);
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  const empuje = routines.find(r => r.name === 'Empuje');
  const traccion = routines.find(r => r.name === 'Tracción');
  assert.ok(!empuje.exercises.some(e => REAR.has(e.id)), 'ningún deltoide posterior (h4 nombre / h5 label) debe ir en Empuje');
  assert.ok(traccion.exercises.some(e => REAR.has(e.id)), 'el día de Tracción debe priorizar el deltoide posterior');
});

test('TODOS los ejercicios llevan id+icon+muscle+type (§2.6 crítico)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Avanzado', days: 5, goal: 'Perder grasa' }, LIB, FIXED);
  routines.forEach(r => r.exercises.forEach(e => {
    ['id', 'icon', 'muscle', 'type', 'sets', 'reps'].forEach(k => {
      assert.ok(e[k] !== undefined && e[k] !== '', `${r.name}: ejercicio ${e.name} sin ${k}`);
    });
  }));
});

test('sin duplicados dentro de un mismo día', () => {
  const { routines } = generarRutinas({ sex: 'F', level: 'Avanzado', days: 6, goal: 'Recomposición' }, LIB, FIXED);
  routines.forEach(r => {
    const ids = r.exercises.map(e => e.id);
    assert.strictEqual(ids.length, new Set(ids).size, `Día "${r.name}" tiene ejercicios duplicados`);
  });
});

test('orden §2.5: Compuesto → … → Cardio/Core al final (rank no decreciente)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 4, goal: 'Perder grasa' }, LIB, FIXED);
  const rank = e => (e.muscle === 'cardio' || e.muscle === 'core' || /cardio|hiit/i.test(e.type) || e.type === 'Isométrico') ? 5
    : e.type === 'Compuesto' ? 1 : e.type === 'Funcional' ? 2 : 3;
  routines.forEach(r => {
    const ranks = r.exercises.map(rank);
    for (let i = 1; i < ranks.length; i++) {
      assert.ok(ranks[i] >= ranks[i - 1], `Día "${r.name}" mal ordenado: ${r.exercises.map(e => e.type)}`);
    }
  });
});

test('sets/reps según objetivo: Ganar músculo Intermedio → 4×10 (no cardio)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  const peso = routines.flatMap(r => r.exercises).filter(e => e.muscle !== 'cardio' && e.type !== 'Isométrico');
  peso.forEach(e => { assert.strictEqual(e.sets, 4); assert.strictEqual(e.reps, 10); });
});

test('Principiante → cap de 3 series', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  routines.flatMap(r => r.exercises).filter(e => !['cardio'].includes(e.muscle) && e.type !== 'Isométrico')
    .forEach(e => assert.ok(e.sets <= 3, `Principiante no debe pasar de 3 series, fue ${e.sets}`));
});

test('Principiante → Full Body (no split avanzado)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  routines.forEach(r => assert.ok(/Full Body/.test(r.name), `Esperaba Full Body, fue "${r.name}"`));
});

test('Perder grasa → cierre con cardio en cada día', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Perder grasa' }, LIB, FIXED);
  routines.forEach(r => {
    assert.ok(r.exercises.some(e => e.muscle === 'cardio'), `Día "${r.name}" sin cardio de cierre`);
    assert.strictEqual(r.exercises[r.exercises.length - 1].muscle, 'cardio', 'El cardio debe ir al final');
  });
});

test('restSec coincide con el objetivo (Perder grasa → 55s)', () => {
  const { routines } = generarRutinas({ sex: 'F', level: 'Intermedio', days: 3, goal: 'Perder grasa' }, LIB, FIXED);
  routines.forEach(r => assert.strictEqual(r.restSec, 55));
});

// ── Fase C: excluir 🚫 / priorizar ⭐ / deload 🔄 ──
test('Fase C excluir: un ejercicio en la lista negra NUNCA aparece', () => {
  const base = { sex: 'M', level: 'Avanzado', days: 5, goal: 'Ganar músculo' };
  const all = generarRutinas(base, LIB, FIXED).routines.flatMap(r => r.exercises).map(e => e.id);
  assert.ok(all.includes('p1'), 'precondición: p1 normalmente sí aparece');
  const { routines } = generarRutinas(base, LIB, { ...FIXED, excludeIds: ['p1'] });
  assert.ok(!routines.flatMap(r => r.exercises).some(e => e.id === 'p1'), 'p1 excluido no debe aparecer');
});

test('Fase C priorizar: un ejercicio marcado ⭐ entra primero en su músculo/tipo', () => {
  // p2 (pecho Compuesto): forzado debe aparecer en el slot de pecho compuesto.
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, { ...FIXED, preferIds: ['p2'] });
  assert.ok(routines.flatMap(r => r.exercises).some(e => e.id === 'p2'), 'p2 priorizado debe estar presente');
});

test('Fase C: excluir gana sobre priorizar (no se fuerza un ejercicio vetado)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Avanzado', days: 5, goal: 'Ganar músculo' }, LIB, { ...FIXED, preferIds: ['p1'], excludeIds: ['p1'] });
  assert.ok(!routines.flatMap(r => r.exercises).some(e => e.id === 'p1'), 'p1 vetado no debe aparecer aunque esté priorizado');
});

test('Fase C deload: −1 serie por ejercicio + flag deload + nota de descarga', () => {
  const normal = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  const pesoNormal = normal.routines.flatMap(r => r.exercises).filter(e => e.muscle !== 'cardio' && e.type !== 'Isométrico')[0];
  const res = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, { ...FIXED, deload: true });
  assert.strictEqual(res.deload, true);
  const peso = res.routines.flatMap(r => r.exercises).filter(e => e.muscle !== 'cardio' && e.type !== 'Isométrico');
  peso.forEach(e => assert.strictEqual(e.sets, pesoNormal.sets - 1, `deload debe bajar 1 serie (${pesoNormal.sets}→${pesoNormal.sets - 1})`));
  assert.ok(res.routines.every(r => /descarga|deload/i.test(r.note)), 'la nota debe mencionar la descarga');
});

test('Fase C deload: piso de 2 series (no baja de ahí)', () => {
  // Principiante Ganar músculo = 3 series → deload 2; un segundo deload no baja de 2.
  const res = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo' }, LIB, { ...FIXED, deload: true });
  res.routines.flatMap(r => r.exercises).filter(e => e.muscle !== 'cardio' && e.type !== 'Isométrico')
    .forEach(e => assert.ok(e.sets >= 2, `deload no debe bajar de 2 series, fue ${e.sets}`));
});

test('< 16 años INTERMEDIO → split de gym (no full body) PERO sin carga axial con barra', () => {
  // El NIVEL decide la estructura, no la edad: un menor intermedio sin condiciones recibe su
  // split (Empuje/Tracción/Pierna). La seguridad de menores es de SELECCIÓN (sin carga axial
  // con barra), no de estructura. Corrección 2026-06-23 (caso Samuel, 14, casi intermedio).
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', age: 14, days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  assert.deepStrictEqual(routines.map(r => r.name), ['Empuje', 'Tracción', 'Pierna'], 'menor intermedio debe recibir split, no Full Body');
  const nombres = routines.flatMap(r => r.exercises).map(e => e.name.toLowerCase());
  nombres.forEach(n => {
    assert.ok(!/sentadilla/.test(n), `Menor no debe recibir "${n}" (carga axial)`);
    assert.ok(!/peso muerto/.test(n), `Menor no debe recibir "${n}" (carga axial)`);
    assert.ok(!/militar con barra/.test(n), `Menor no debe recibir "${n}" (carga axial sobre la cabeza)`);
  });
});

test('< 16 años PRINCIPIANTE → Full Body (el nivel, no la edad, fija la estructura)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', age: 14, days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  routines.forEach(r => assert.ok(/Full Body/.test(r.name), `Menor principiante sí va Full Body, fue "${r.name}"`));
});

test('place=gym → bandas NO como ejercicio principal; en casa sí pueden entrar', () => {
  // lib propio: para hombros hay opción de máquina (solo gym) y de banda (casa/parque/gym).
  const lib = [
    { id: 'pe1', name: 'Press de Banca', muscle: 'pecho', type: 'Compuesto', sets: 4, reps: 10, icon: 'x', env: ['gym'] },
    { id: 'es1', name: 'Remo en Máquina', muscle: 'espalda', type: 'Compuesto', sets: 4, reps: 10, icon: 'x', env: ['gym'] },
    { id: 'pi1', name: 'Prensa de Pierna', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 10, icon: 'x', env: ['gym', 'casa'] },
    { id: 'co1', name: 'Plancha', muscle: 'core', type: 'Isométrico', sets: 3, reps: 1, icon: 'x', env: ['gym', 'casa'] },
    { id: 'ho_m', name: 'Press de Hombro en Máquina', muscle: 'hombros', type: 'Compuesto', sets: 4, reps: 10, icon: 'x', env: ['gym'] },
    { id: 'ho_b', name: 'Press de Hombro con Banda', muscle: 'hombros', type: 'Compuesto', sets: 3, reps: 12, icon: 'x', env: ['casa', 'parque', 'gym'] },
  ];
  const gymNames = generarRutinas({ sex: 'M', level: 'Principiante', days: 1, goal: 'Ganar músculo', place: 'gym' }, lib, FIXED)
    .routines.flatMap(r => r.exercises).map(e => e.name.toLowerCase());
  assert.ok(!gymNames.some(n => /banda/.test(n)), `En gym no debe haber bandas como principal: ${gymNames}`);
  assert.ok(gymNames.some(n => /máquina/.test(n)), 'en gym debe entrar la versión de máquina');
  // En casa la opción de máquina (env=gym) no está → la banda sí puede cubrir el hueco.
  const casaNames = generarRutinas({ sex: 'M', level: 'Principiante', days: 1, goal: 'Ganar músculo', place: 'casa' }, lib, FIXED)
    .routines.flatMap(r => r.exercises).map(e => e.name.toLowerCase());
  assert.ok(casaNames.some(n => /banda/.test(n)), `En casa la banda sí debe poder entrar: ${casaNames}`);
});

section('7b. Gate por nivel de dificultad (P/I/A)');

test('exLevel: lee el mapa, respeta level propio, default I', () => {
  assert.strictEqual(core.exLevel({ id: 'e4' }), 'A');           // Dominadas
  assert.strictEqual(core.exLevel({ id: 'e70' }), 'P');          // Sentadilla Goblet
  assert.strictEqual(core.exLevel({ id: 'e1' }), 'I');           // Press de banca
  assert.strictEqual(core.exLevel({ id: 'zzz' }), 'I');          // desconocido → I
  assert.strictEqual(core.exLevel({ id: 'e4', level: 'P' }), 'P'); // level propio manda sobre el mapa
});

test('gate: Principiante NUNCA recibe ejercicios Avanzados (y no cuela el único A de un músculo)', () => {
  const lib = [
    { id: 'z_pec_P', name: 'Flexión Rodillas', muscle: 'pecho', type: 'Bodyweight', sets: 3, reps: 12, icon: 'x', level: 'P' },
    { id: 'z_pec_A', name: 'Flexión Pica', muscle: 'pecho', type: 'Bodyweight', sets: 3, reps: 8, icon: 'x', level: 'A' },
    { id: 'z_pie_P', name: 'Sentadilla Silla', muscle: 'piernas', type: 'Bodyweight', sets: 3, reps: 12, icon: 'x', level: 'P' },
    { id: 'z_pie_A', name: 'Sentadilla 1 Pierna', muscle: 'piernas', type: 'Bodyweight', sets: 3, reps: 8, icon: 'x', level: 'A' },
    { id: 'z_esp_A', name: 'Dominadas', muscle: 'espalda', type: 'Bodyweight', sets: 3, reps: 6, icon: 'x', level: 'A' },
    { id: 'z_core_P', name: 'Plancha', muscle: 'core', type: 'Isométrico', sets: 3, reps: 30, icon: 'x', level: 'P' },
    { id: 'z_core_A', name: 'Rueda Abdominal', muscle: 'core', type: 'Bodyweight', sets: 3, reps: 8, icon: 'x', level: 'A' },
  ];
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 2, goal: 'Ganar músculo' }, lib, FIXED);
  const all = routines.flatMap(r => r.exercises);
  all.forEach(e => assert.notStrictEqual(core.exLevelRank(e), 2, `Principiante recibió avanzado: ${e.name}`));
  assert.ok(!all.some(e => e.id === 'z_esp_A'), 'No debe colar Dominadas (la única opción de espalda era Avanzada)');
});

test('gate: Principiante PREFIERE nivel P sobre I cuando hay ambos', () => {
  const lib = [
    { id: 'z_pec_P', name: 'Flexión Inclinada', muscle: 'pecho', type: 'Bodyweight', sets: 3, reps: 12, icon: 'x', level: 'P' },
    { id: 'z_pec_I', name: 'Flexión Normal', muscle: 'pecho', type: 'Bodyweight', sets: 3, reps: 10, icon: 'x', level: 'I' },
  ];
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 1, goal: 'Ganar músculo' }, lib, FIXED);
  const pec = routines.flatMap(r => r.exercises).filter(e => e.muscle === 'pecho');
  assert.ok(pec.length > 0, 'Debe asignar al menos un ejercicio de pecho');
  assert.strictEqual(core.exLevel(pec[0]), 'P', 'El primer pecho debe ser el de nivel P');
});

test('gate: Avanzado SÍ puede recibir ejercicios Avanzados', () => {
  const lib = [
    { id: 'z_esp_A', name: 'Dominadas', muscle: 'espalda', type: 'Bodyweight', sets: 3, reps: 6, icon: 'x', level: 'A' },
    { id: 'z_pie_A', name: 'Sentadilla 1 Pierna', muscle: 'piernas', type: 'Bodyweight', sets: 3, reps: 8, icon: 'x', level: 'A' },
  ];
  const { routines } = generarRutinas({ sex: 'M', level: 'Avanzado', days: 2, goal: 'Ganar músculo' }, lib, FIXED);
  const all = routines.flatMap(r => r.exercises);
  assert.ok(all.some(e => core.exLevelRank(e) === 2), 'Avanzado debería poder incluir ejercicios avanzados');
});

section('8. Generador — seguridad / limitaciones físicas');

test('parseLimitations detecta lumbar y rodilla', () => {
  const lim = parseLimitations('Dolor lumbar crónico y operación de menisco en rodilla');
  assert.strictEqual(lim.detected, true);
  assert.ok(lim.keys.includes('lumbar') && lim.keys.includes('rodilla'));
});

test('parseLimitations sin limitaciones → detected false', () => {
  assert.strictEqual(parseLimitations('Quiere ganar masa, sin problemas').detected, false);
  assert.strictEqual(parseLimitations('').detected, false);
});

test('limitación con zona (rodilla) → hasExclusions true y promete exclusión', () => {
  const lim = parseLimitations('Operación de menisco en la rodilla');
  assert.strictEqual(lim.hasExclusions, true);
  assert.ok(/Se excluyeron/.test(lim.advice));
});

test('limitación GENÉRICA (sin zona) → NO promete exclusión que no ocurrió', () => {
  const lim = parseLimitations('Cirugía reciente, postoperatorio'); // 'generic', sin zona con reglas
  assert.strictEqual(lim.detected, true, 'se detecta');
  assert.strictEqual(lim.hasExclusions, false, 'pero no hay exclusiones automáticas');
  assert.ok(!/Se excluyeron/.test(lim.advice), 'el texto NO debe afirmar que excluyó');
  assert.ok(/a mano|manual/i.test(lim.advice), 'debe pedir ajuste manual');
});

test('notas con "lumbar" → rutina marcada needsReview + ⚠️ en la nota', () => {
  const { routines, needsReview } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo', notes: 'hernia lumbar, evitar peso muerto' }, LIB, FIXED);
  assert.strictEqual(needsReview, true);
  routines.forEach(r => {
    assert.strictEqual(r.needsReview, true);
    assert.ok(r.note.includes('⚠️'), 'La nota debe llevar ⚠️ de revisión');
  });
});

test('biblioteca sin ejercicios → día vacío marca needsReview + ⚠️ en la nota', () => {
  const { routines, needsReview } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 2, goal: 'Ganar músculo' }, [], FIXED);
  assert.strictEqual(needsReview, true); // antes daba false aunque el día saliera en blanco
  assert.ok(routines.some(r => (r.exercises || []).length === 0), 'algún día debe quedar vacío');
  routines.filter(r => !(r.exercises || []).length).forEach(r => {
    assert.strictEqual(r.needsReview, true);
    assert.ok(r.note.includes('⚠️'), 'la nota del día vacío debe llevar ⚠️');
  });
});

test('limitación lumbar → excluye peso muerto y sentadilla de TODAS las rutinas', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 4, goal: 'Ganar músculo', notes: 'dolor lumbar' }, LIB, FIXED);
  const nombres = routines.flatMap(r => r.exercises).map(e => e.name.toLowerCase());
  nombres.forEach(n => {
    assert.ok(!/peso muerto/.test(n), `No debe incluir "${n}" con limitación lumbar`);
    assert.ok(!/sentadilla/.test(n), `No debe incluir "${n}" con limitación lumbar`);
  });
});

test('sin limitación → needsReview false y nota de borrador normal', () => {
  const { routines, needsReview } = generarRutinas({ sex: 'F', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  assert.strictEqual(needsReview, false);
  routines.forEach(r => assert.strictEqual(r.needsReview, false));
});

test('metadatos de borrador: generated true, reviewed false, createdAt fijado', () => {
  const { routines } = generarRutinas({ sex: 'F', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  routines.forEach(r => {
    assert.strictEqual(r.generated, true);
    assert.strictEqual(r.reviewed, false);
    assert.strictEqual(r.createdAt, '2026-05-30T00:00:00.000Z');
    assert.ok(r.id && r.exercises.length > 0);
  });
});

section('9. Entornos de equipo — inferExerciseEnv()');

test('máquina/polea/prensa → solo gym', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Prensa de Piernas', muscle: 'piernas', type: 'Compuesto' }), ['gym']);
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Jalón al Pecho', muscle: 'espalda', type: 'Compuesto' }), ['gym']);
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Aperturas con Cable', muscle: 'pecho', type: 'Aislamiento' }), ['gym']);
});

test('dominadas / remo invertido → parque + gym (necesitan barra)', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Dominadas', muscle: 'espalda', type: 'Bodyweight' }), ['parque', 'gym']);
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Remo Invertido', muscle: 'espalda', type: 'Bodyweight' }), ['parque', 'gym']);
});

test('barra cargada → solo gym', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Sentadilla con Barra', muscle: 'piernas', type: 'Compuesto' }), ['gym']);
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Curl con Barra', muscle: 'biceps', type: 'Aislamiento' }), ['gym']);
});

test('banda → casa + parque + gym', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Curl de Bíceps con Banda', muscle: 'biceps', type: 'Aislamiento' }), ['casa', 'parque', 'gym']);
});

test('mancuerna → casa + gym (no parque ni corporal)', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Press Inclinado Mancuernas', muscle: 'pecho', type: 'Compuesto' }), ['casa', 'gym']);
});

test('peso corporal / isométrico → todos los entornos', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Lagartijas (Push-up)', muscle: 'pecho', type: 'Bodyweight' }), ['corporal', 'casa', 'parque', 'gym']);
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Plancha', muscle: 'core', type: 'Isométrico' }), ['corporal', 'casa', 'parque', 'gym']);
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Sentadilla de Peso Corporal', muscle: 'piernas', type: 'Compuesto' }), ['corporal', 'casa', 'parque', 'gym']);
});

test('cardio: máquina → gym; corporal → todos', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Bicicleta Estática', muscle: 'cardio', type: 'Cardio' }), ['gym']);
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Burpees', muscle: 'cardio', type: 'HIIT' }), ['corporal', 'casa', 'parque', 'gym']);
});

test('ambiguo sin pista → gym (conservador, el coach reabre)', () => {
  assert.deepStrictEqual(inferExerciseEnv({ name: 'Elevaciones Laterales', muscle: 'hombros', type: 'Aislamiento' }), ['gym']);
});

test('precedencia: "con Banda" gana sobre default y sobre mancuerna ausente', () => {
  // banda se evalúa antes que el default; un nombre con banda nunca cae a gym-only
  assert.ok(inferExerciseEnv({ name: 'Sentadilla con Banda de Resistencia', muscle: 'piernas', type: 'Compuesto' }).includes('casa'));
});

section('10. Generador filtra por entorno (place) — Fase C');

// Fixture con env explícito: espalda SOLO en gym (para probar huecos en corporal).
const ENVLIB = [
  { id: 'x1', name: 'Sentadilla Peso Corporal', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 12, icon: '🦵', env: ['corporal', 'casa', 'parque', 'gym'] },
  { id: 'x2', name: 'Sentadilla con Barra', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 10, icon: '🏋️', env: ['gym'] },
  { id: 'x3', name: 'Flexiones', muscle: 'pecho', type: 'Bodyweight', sets: 3, reps: 15, icon: '🤜', env: ['corporal', 'casa', 'parque', 'gym'] },
  { id: 'x4', name: 'Press de Banca', muscle: 'pecho', type: 'Compuesto', sets: 4, reps: 10, icon: '🏋️', env: ['gym'] },
  { id: 'x5', name: 'Press de Banca Máquina', muscle: 'pecho', type: 'Compuesto', sets: 4, reps: 10, icon: '🖥️', env: ['gym'] },
  // espalda: SOLO gym → en corporal debe reportarse como hueco (envGaps)
  { id: 'x6', name: 'Jalón al Pecho', muscle: 'espalda', type: 'Compuesto', sets: 4, reps: 10, icon: '🔄', env: ['gym'] },
  { id: 'x7', name: 'Pike Push-up', muscle: 'hombros', type: 'Bodyweight', sets: 3, reps: 10, icon: '🔻', env: ['corporal', 'casa', 'parque', 'gym'] },
  { id: 'x8', name: 'Press Militar Barra', muscle: 'hombros', type: 'Compuesto', sets: 4, reps: 8, icon: '⬆️', env: ['gym'] },
  { id: 'x9', name: 'Plancha', muscle: 'core', type: 'Isométrico', sets: 3, reps: 60, icon: '🧱', env: ['corporal', 'casa', 'parque', 'gym'] },
];

test('place="corporal" → ningún ejercicio sin "corporal" en su env', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'corporal' }, ENVLIB, FIXED);
  const all = routines.flatMap(r => r.exercises);
  assert.ok(all.length > 0, 'Debe generar algo en corporal');
  all.forEach(e => assert.ok((e.env || ['gym']).includes('corporal'), `"${e.name}" no es de peso corporal (env ${JSON.stringify(e.env)})`));
});

test('place="corporal" → NO aparecen barra/máquina (solo-gym)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'corporal' }, ENVLIB, FIXED);
  const nombres = routines.flatMap(r => r.exercises).map(e => e.name);
  assert.ok(!nombres.some(n => /barra|máquina/i.test(n)), `Coló un ejercicio de gym: ${nombres}`);
});

test('place="corporal" → reporta envGaps de músculos sin opción (espalda solo gym)', () => {
  const res = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'corporal' }, ENVLIB, FIXED);
  assert.ok(res.envGaps.includes('espalda'), `Esperaba 'espalda' en envGaps, fue ${JSON.stringify(res.envGaps)}`);
});

test('place="gym" (default) → sí puede usar espalda solo-gym, sin huecos', () => {
  const res = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'gym' }, ENVLIB, FIXED);
  assert.deepStrictEqual(res.envGaps, []);
  assert.ok(routinesIncludeMuscle(res.routines, 'espalda'), 'En gym debería poder incluir espalda');
});

test('sin place (default gym) → comportamiento intacto: usa cualquier env', () => {
  const res = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo' }, ENVLIB, FIXED);
  assert.strictEqual(res.place, 'gym');
});

test('methodBias="calistenia" (vía opts/estilo) → prefiere peso corporal cuando hay opción', () => {
  // pecho tiene Flexiones (Bodyweight) y Press de Banca/Máquina; en gym con calistenia → Flexiones
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'gym' }, ENVLIB, { ...FIXED, methodBias: 'calistenia' });
  const pechos = routines.flatMap(r => r.exercises).filter(e => e.muscle === 'pecho');
  assert.ok(pechos.length && pechos.every(e => e.type === 'Bodyweight'), `Con calistenia el pecho debería ser peso corporal, fue ${pechos.map(e => e.name)}`);
});

function routinesIncludeMuscle(routines, m) {
  return routines.flatMap(r => r.exercises).some(e => e.muscle === m);
}

// ══════════════════════════════════════════════════════
// 11. Fusión de historial (mergeHistory) — incidente 2026-06-01
// ══════════════════════════════════════════════════════
section('11. Fusión de historial (sync sin perder entrenos)');

test('EL BUG: sesión local que la nube NO tiene NO se pierde tras fusionar', () => {
  const cloud = { c1: [{ id: 's_vieja', date: '2026-05-25T10:00:00.000Z', totalVol: 100 }] };
  const local = {
    c1: [
      { id: 's_hoy', date: '2026-06-01T15:00:00.000Z', totalVol: 200 }, // entreno de hoy, solo en el celular
      { id: 's_vieja', date: '2026-05-25T10:00:00.000Z', totalVol: 100 },
    ],
  };
  const merged = mergeHistory(local, cloud);
  const ids = merged.c1.map(s => s.id);
  assert.ok(ids.includes('s_hoy'), 'La sesión de hoy debe sobrevivir a la fusión');
  assert.strictEqual(merged.c1.length, 2, 'Debe quedar con las 2 sesiones');
});

test('unión: combina clientes presentes solo en nube o solo en local', () => {
  const cloud = { c1: [{ id: 'a', date: '2026-05-01T00:00:00Z' }] };
  const local = { c2: [{ id: 'b', date: '2026-05-02T00:00:00Z' }] };
  const merged = mergeHistory(local, cloud);
  assert.ok(merged.c1 && merged.c2, 'Deben estar ambos clientes');
  assert.strictEqual(merged.c1.length, 1);
  assert.strictEqual(merged.c2.length, 1);
});

test('dedupe: misma sesión (mismo id) en nube y local → una sola copia', () => {
  const s = { id: 'x', date: '2026-05-10T00:00:00Z', totalVol: 50 };
  const merged = mergeHistory({ c1: [s] }, { c1: [s] });
  assert.strictEqual(merged.c1.length, 1);
});

test('conflicto: conserva la versión de fecha más reciente (sesión editada)', () => {
  const cloud = { c1: [{ id: 'x', date: '2026-05-10T10:00:00Z', totalVol: 50 }] };
  const local = { c1: [{ id: 'x', date: '2026-05-10T18:00:00Z', totalVol: 80 }] }; // editada más tarde
  const merged = mergeHistory(local, cloud);
  assert.strictEqual(merged.c1.length, 1);
  assert.strictEqual(merged.c1[0].totalVol, 80, 'Debe quedar la edición más reciente');
});

test('orden: queda de más nuevo a más viejo', () => {
  const local = { c1: [
    { id: 'a', date: '2026-05-01T00:00:00Z' },
    { id: 'c', date: '2026-05-03T00:00:00Z' },
    { id: 'b', date: '2026-05-02T00:00:00Z' },
  ] };
  const merged = mergeHistory(local, {});
  assert.deepStrictEqual(merged.c1.map(s => s.id), ['c', 'b', 'a']);
});

test('sesiones viejas sin id: dedupe por rutina + día', () => {
  const cloud = { c1: [{ routineId: 'r1', routineName: 'Pierna', date: '2026-05-05T09:00:00Z' }] };
  const local = { c1: [{ routineId: 'r1', routineName: 'Pierna', date: '2026-05-05T20:00:00Z' }] }; // mismo día/rutina
  const merged = mergeHistory(local, cloud);
  assert.strictEqual(merged.c1.length, 1, 'Misma rutina el mismo día = una sola sesión');
});

test('respeta el tope de 365 por cliente', () => {
  const many = Array.from({ length: 400 }, (_, i) => ({ id: 's' + i, date: new Date(2026, 0, 1 + i).toISOString() }));
  const merged = mergeHistory({ c1: many }, {});
  assert.strictEqual(merged.c1.length, 365);
});

test('robusto: maneja null/undefined sin reventar', () => {
  assert.deepStrictEqual(mergeHistory(null, null), {});
  assert.deepStrictEqual(mergeHistory(undefined, { c1: [{ id: 'a', date: '2026-05-01T00:00:00Z' }] }).c1.length, 1);
});

// ══════════════════════════════════════════════════════
// 12. Fusión de mensajes / peso / medidas (mergeClientArrays)
// ══════════════════════════════════════════════════════
section('12. Fusión de colecciones por cliente (sync sin perder)');

const msgKey = m => (m.from || '') + '|' + (m.date || '') + '|' + (m.text || '');

test('mensajes: une chat de ambos lados, orden ascendente (cronológico)', () => {
  const local = { c1: [
    { from: 'coach', text: 'Hola', date: '2026-05-01T10:00:00Z' },
    { from: 'client', text: 'Buenas', date: '2026-05-01T10:05:00Z' },
  ] };
  const cloud = { c1: [
    { from: 'coach', text: 'Hola', date: '2026-05-01T10:00:00Z' }, // duplicado
    { from: 'client', text: '¿Rutina hoy?', date: '2026-05-01T10:10:00Z' }, // solo en nube
  ] };
  const merged = mergeClientArrays(local, cloud, msgKey, 'asc', null);
  assert.strictEqual(merged.c1.length, 3, 'Dedup del duplicado + une el nuevo');
  assert.deepStrictEqual(merged.c1.map(m => m.text), ['Hola', 'Buenas', '¿Rutina hoy?']);
});

test('mensajes: un mensaje que solo está en local NO se pierde', () => {
  const local = { c1: [{ from: 'client', text: 'urgente', date: '2026-06-01T09:00:00Z' }] };
  const cloud = { c1: [] };
  const merged = mergeClientArrays(local, cloud, msgKey, 'asc', null);
  assert.strictEqual(merged.c1.length, 1);
});

test('peso/medidas: dedup por fecha (uno por día), newest-first, respeta tope', () => {
  const dateKey = e => e.date || '';
  const local = { c1: [{ date: '2026-05-03', kg: 70 }, { date: '2026-05-01', kg: 71 }] };
  const cloud = { c1: [{ date: '2026-05-02', kg: 70.5 }, { date: '2026-05-01', kg: 71 }] };
  const merged = mergeClientArrays(local, cloud, dateKey, 'desc', 52);
  assert.strictEqual(merged.c1.length, 3, '3 días distintos (01 dedup)');
  assert.deepStrictEqual(merged.c1.map(e => e.date), ['2026-05-03', '2026-05-02', '2026-05-01']);
});

test('PRs: conserva el mejor récord, nunca pierde uno', () => {
  const local = { c1: { sentadilla: { val: 100, reps: 5, date: '2026-05-01T00:00:00Z' }, curl: { val: 20, reps: 10, date: '2026-05-01T00:00:00Z' } } };
  const cloud = { c1: { sentadilla: { val: 110, reps: 3, date: '2026-05-10T00:00:00Z' } } };
  const merged = mergePRs(local, cloud);
  assert.strictEqual(merged.c1.sentadilla.val, 110, 'Gana el récord más alto');
  assert.ok(merged.c1.curl, 'El PR que solo estaba en local sobrevive');
});

test('PRs: empate de valor → gana más reps', () => {
  const local = { c1: { press: { val: 80, reps: 5, date: '2026-05-01T00:00:00Z' } } };
  const cloud = { c1: { press: { val: 80, reps: 8, date: '2026-05-02T00:00:00Z' } } };
  const merged = mergePRs(local, cloud);
  assert.strictEqual(merged.c1.press.reps, 8);
});

test('robusto: mergeClientArrays y mergePRs manejan null', () => {
  assert.deepStrictEqual(mergeClientArrays(null, null, msgKey, 'asc'), {});
  assert.deepStrictEqual(mergePRs(null, null), {});
});

// ══════════════════════════════════════════════════════
section('13. Agregados de actividad por fecha (dashboard del coach)');

// Helper: fecha local legible (mes 1-based). Construye en zona local para que la
// lógica (que usa límites de día locales) sea consistente sin importar el TZ del CI.
const D = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0);

test('retentionByDay: el mismo día de la semana pasada NO cuenta como hoy (regresión bug 2026-06-02)', () => {
  const now = D(2026, 6, 2, 8); // martes
  const history = {
    miguel: [
      { date: D(2026, 6, 2, 8) },   // hoy (martes)
      { date: D(2026, 5, 26, 12) }, // martes pasado — mismo getDay, NO debe caer en "hoy"
      { date: D(2026, 5, 26, 18) },
    ],
  };
  const bars = retentionByDay(history, now);
  assert.strictEqual(bars.length, 7);
  assert.strictEqual(bars[6].label, 'Mar', 'La última columna es hoy (martes)');
  assert.strictEqual(bars[6].count, 1, 'HOY debe contar SOLO la sesión de hoy, no las del martes pasado');
  assert.strictEqual(bars.reduce((a, b) => a + b.count, 0), 1, 'El martes pasado (7 días atrás) queda fuera de la ventana');
});

test('retentionByDay: ubica cada sesión en su día de calendario real', () => {
  const now = D(2026, 6, 2, 10);
  const history = {
    a: [{ date: D(2026, 6, 2, 9) }, { date: D(2026, 6, 1, 9) }, { date: D(2026, 6, 1, 20) }],
    b: [{ date: D(2026, 5, 30, 9) }],
  };
  const bars = retentionByDay(history, now);
  assert.strictEqual(bars[6].count, 1, 'hoy (jun 2): 1');
  assert.strictEqual(bars[5].count, 2, 'ayer (jun 1): 2');
  assert.strictEqual(bars[3].count, 1, 'hace 3 días (may 30): 1');
});

test('retentionByDay: ignora sesiones futuras y de más de 6 días atrás', () => {
  const now = D(2026, 6, 2, 10);
  const history = { a: [{ date: D(2026, 6, 3, 9) }, { date: D(2026, 5, 25, 9) }] };
  const bars = retentionByDay(history, now);
  assert.strictEqual(bars.reduce((a, b) => a + b.count, 0), 0);
});

test('retentionByDay: robusto con history null/vacío', () => {
  assert.strictEqual(retentionByDay(null, D(2026, 6, 2)).length, 7);
  assert.strictEqual(retentionByDay({}, D(2026, 6, 2)).reduce((a, b) => a + b.count, 0), 0);
});

test('weeklyActiveCount: cuenta clientes con sesión en los últimos 7 días', () => {
  const now = D(2026, 6, 2, 10);
  const history = {
    a: [{ date: D(2026, 6, 1, 9) }],  // dentro
    b: [{ date: D(2026, 5, 20, 9) }], // fuera (>7d)
    c: [],
  };
  assert.strictEqual(weeklyActiveCount(history, now, ['a', 'b', 'c']), 1);
});

test('weeklyActiveCount: un cliente cuenta una sola vez aunque tenga varias sesiones', () => {
  const now = D(2026, 6, 2, 10);
  const history = { a: [{ date: D(2026, 6, 1) }, { date: D(2026, 5, 31) }] };
  assert.strictEqual(weeklyActiveCount(history, now, ['a']), 1);
});

test('clientsTrainedToday: solo clientes con sesión de hoy, orden desc por hora', () => {
  const now = D(2026, 6, 2, 15);
  const clients = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }, { id: 'c', name: 'Caro' }];
  const history = {
    a: [{ date: D(2026, 6, 2, 9) }],
    b: [{ date: D(2026, 6, 1, 9) }],                          // ayer → no
    c: [{ date: D(2026, 6, 2, 13) }, { date: D(2026, 6, 2, 7) }],
  };
  const res = clientsTrainedToday(clients, history, now);
  assert.strictEqual(res.length, 2, 'Ana y Caro entrenaron hoy, Beto no');
  assert.strictEqual(res[0].client.id, 'c', 'Caro primero (13:00 es más reciente)');
  assert.strictEqual(res[1].client.id, 'a');
  assert.strictEqual(res[0].sessions.length, 2);
});

test('clientsTrainedToday: robusto con datos vacíos', () => {
  assert.deepStrictEqual(clientsTrainedToday(null, null, D(2026, 6, 2)), []);
  assert.deepStrictEqual(clientsTrainedToday([{ id: 'a' }], {}, D(2026, 6, 2)), []);
});

test('daysSinceLastSession: días enteros desde la sesión más reciente', () => {
  const now = D(2026, 6, 2, 12);
  assert.strictEqual(daysSinceLastSession([{ date: D(2026, 5, 30, 12) }, { date: D(2026, 5, 28, 12) }], now), 3);
});

test('daysSinceLastSession: encuentra el máximo aunque el orden esté invertido', () => {
  const now = D(2026, 6, 2, 12);
  assert.strictEqual(daysSinceLastSession([{ date: D(2026, 5, 28, 12) }, { date: D(2026, 6, 1, 12) }], now), 1);
});

test('daysSinceLastSession: sin sesiones → Infinity (cuenta como inactivo)', () => {
  assert.strictEqual(daysSinceLastSession([], D(2026, 6, 2)), Infinity);
  assert.strictEqual(daysSinceLastSession(null, D(2026, 6, 2)), Infinity);
});

test('workoutStreak: días consecutivos terminando HOY', () => {
  const now = D(2026, 6, 8, 18);
  assert.strictEqual(workoutStreak([{ date: D(2026, 6, 8) }, { date: D(2026, 6, 7) }, { date: D(2026, 6, 6) }], now), 3);
});

test('workoutStreak: sigue viva desde AYER si hoy aún no entrena', () => {
  const now = D(2026, 6, 8, 9);
  assert.strictEqual(workoutStreak([{ date: D(2026, 6, 7) }, { date: D(2026, 6, 6) }], now), 2);
});

test('workoutStreak: se rompe si la última sesión fue hace 2+ días', () => {
  const now = D(2026, 6, 8, 9);
  assert.strictEqual(workoutStreak([{ date: D(2026, 6, 5) }, { date: D(2026, 6, 4) }], now), 0);
});

test('workoutStreak: varias sesiones el mismo día cuentan como 1', () => {
  const now = D(2026, 6, 8, 20);
  assert.strictEqual(workoutStreak([{ date: D(2026, 6, 8, 7) }, { date: D(2026, 6, 8, 19) }, { date: D(2026, 6, 7) }], now), 2);
});

test('workoutStreak: sin sesiones → 0', () => {
  assert.strictEqual(workoutStreak([], D(2026, 6, 8)), 0);
  assert.strictEqual(workoutStreak(null, D(2026, 6, 8)), 0);
});

// ══════════════════════════════════════════════════════
section('14. Orden de rutinas por día (Lunes primero)');

test('sortRoutinesByDay: ordena Lunes→Domingo, Libre al final', () => {
  const r = [
    { id: 'a', day: 'Martes' },
    { id: 'b', day: 'Lunes' },
    { id: 'c', day: 'Libre' },
    { id: 'd', day: 'Domingo' },
  ];
  assert.deepStrictEqual(sortRoutinesByDay(r).map(x => x.day), ['Lunes', 'Martes', 'Domingo', 'Libre']);
});

test('sortRoutinesByDay: martes NO queda antes que lunes (regresión del perfil)', () => {
  const r = [{ id: 'mar', day: 'Martes' }, { id: 'lun', day: 'Lunes' }];
  assert.strictEqual(sortRoutinesByDay(r)[0].id, 'lun');
});

test('sortRoutinesByDay: estable ante el mismo día (conserva orden original)', () => {
  const r = [{ id: 'x', day: 'Lunes' }, { id: 'y', day: 'Lunes' }];
  assert.deepStrictEqual(sortRoutinesByDay(r).map(x => x.id), ['x', 'y']);
});

test('sortRoutinesByDay: tolera tildes y días desconocidos van al final', () => {
  const r = [{ id: 'a', day: '???' }, { id: 'b', day: 'Miercoles' }, { id: 'c', day: 'Miércoles' }];
  assert.deepStrictEqual(sortRoutinesByDay(r).map(x => x.id), ['b', 'c', 'a']);
});

test('sortRoutinesByDay: no muta el original y maneja null', () => {
  const r = [{ id: 'a', day: 'Martes' }, { id: 'b', day: 'Lunes' }];
  const out = sortRoutinesByDay(r);
  assert.strictEqual(r[0].id, 'a', 'el array original no se reordena');
  assert.notStrictEqual(out, r, 'devuelve un array nuevo');
  assert.deepStrictEqual(sortRoutinesByDay(null), []);
});

// ══════════════════════════════════════════════════════
section('15. Fase de adaptación para principiantes');

const DAY = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0).toISOString();

test('genSchemeFor: en adaptación fuerza 15 reps / 3 series / descanso 60, sin importar el objetivo', () => {
  ['Ganar músculo', 'Perder grasa', 'Fuerza', 'Resistencia'].forEach(goal => {
    const s = genSchemeFor(goal, 'Principiante', true);
    assert.strictEqual(s.repsN, 15, `reps en adaptación para "${goal}"`);
    assert.strictEqual(s.setsN, 3, `series en adaptación para "${goal}"`);
    assert.strictEqual(s.restSec, 60, `descanso en adaptación para "${goal}"`);
    assert.strictEqual(s.adaptation, true);
  });
});

test('genSchemeFor: SIN adaptación mantiene el esquema del objetivo (hipertrofia = 10 reps)', () => {
  const s = genSchemeFor('Ganar músculo', 'Principiante', false);
  assert.strictEqual(s.repsN, 10);
  assert.ok(!s.adaptation);
});

test('isInAdaptation: principiante recién creado (sin historial) → true', () => {
  assert.strictEqual(isInAdaptation({ id: 'c1', level: 'Principiante' }, {}, new Date('2026-06-02')), true);
});

test('isInAdaptation: principiante con primera sesión hace 5 días → true', () => {
  const hist = { c1: [{ date: DAY(2026, 5, 28) }] };
  assert.strictEqual(isInAdaptation({ id: 'c1', level: 'Principiante' }, hist, new Date('2026-06-02T12:00:00')), true);
});

test('isInAdaptation: principiante con primera sesión hace 30 días → false (ya progresa)', () => {
  const hist = { c1: [{ date: DAY(2026, 5, 30) }, { date: DAY(2026, 5, 3) }] };
  assert.strictEqual(isInAdaptation({ id: 'c1', level: 'Principiante' }, hist, new Date('2026-06-02T12:00:00')), false);
});

test('isInAdaptation: NO aplica a intermedio/avanzado aunque sea su semana 1', () => {
  assert.strictEqual(isInAdaptation({ id: 'c1', level: 'Intermedio' }, {}, new Date('2026-06-02')), false);
  assert.strictEqual(isInAdaptation({ id: 'c1', level: 'Avanzado' }, {}, new Date('2026-06-02')), false);
});

test('isInAdaptation: client.startDate explícito manda sobre el historial', () => {
  const hist = { c1: [{ date: DAY(2026, 6, 1) }] }; // sesión reciente
  // pero arrancó hace mucho → ya no está en adaptación
  assert.strictEqual(isInAdaptation({ id: 'c1', level: 'Principiante', startDate: DAY(2026, 1, 1) }, hist, new Date('2026-06-02')), false);
});

test('generarRutinas: con adaptación todos los ejercicios de carga van a 15 reps / 3 series + nota y flag', () => {
  const res = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo' }, LIB, { ...FIXED, adaptation: true });
  assert.strictEqual(res.adaptation, true, 'el retorno marca adaptación');
  const cargas = res.routines[0].exercises.filter(e => e.muscle !== 'cardio' && e.type !== 'Isométrico' && !/cardio|hiit/i.test(e.type || ''));
  assert.ok(cargas.length > 0, 'hay ejercicios de carga');
  cargas.forEach(e => {
    assert.strictEqual(e.reps, 15, `${e.name} debe ir a 15 reps en adaptación`);
    assert.strictEqual(e.sets, 3, `${e.name} debe ir a 3 series en adaptación`);
  });
  assert.ok(/adaptaci/i.test(res.routines[0].note), 'la nota menciona la fase de adaptación');
});

test('generarRutinas: SIN adaptación (intermedio) usa reps del objetivo, no 15', () => {
  const res = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  assert.ok(!res.adaptation);
  const carga = res.routines[0].exercises.find(e => e.type === 'Compuesto');
  assert.strictEqual(carga.reps, 10, 'hipertrofia intermedio = 10 reps');
});

// ══════════════════════════════════════════════════════
section('16. Personalización por composición (IMC / cintura)');

const _na = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

test('bmiFrom: calcula IMC en cm y en metros; null si falta dato', () => {
  assert.ok(Math.abs(bmiFrom(85, 165) - 31.2) < 0.2);
  assert.ok(Math.abs(bmiFrom(50, 165) - 18.4) < 0.2);
  assert.ok(Math.abs(bmiFrom(68, 1.70) - 23.5) < 0.3, 'tolera estatura en metros');
  assert.strictEqual(bmiFrom(null, 165), null);
  assert.strictEqual(bmiFrom(70, null), null);
});

test('bodyLoadProfile: IMC>=30 → high; por debajo → normal (50 vs 85 kg, misma estatura)', () => {
  assert.strictEqual(bodyLoadProfile({ weight: 85, height: 165 }), 'high');
  assert.strictEqual(bodyLoadProfile({ weight: 50, height: 165 }), 'normal');
});

test('bodyLoadProfile: cintura alta sube el perfil aunque el IMC no sea obesidad', () => {
  assert.strictEqual(bodyLoadProfile({ weight: 70, height: 170 }, 110), 'high'); // RCT 0.647
  assert.strictEqual(bodyLoadProfile({ weight: 70, height: 170 }, 78), 'normal'); // RCT 0.46
});

test('bodyLoadProfile: sin datos suficientes → normal (no asume)', () => {
  assert.strictEqual(bodyLoadProfile({}), 'normal');
  assert.strictEqual(bodyLoadProfile({ weight: 70 }), 'normal');
});

test('generarRutinas: perfil alto prioriza máquina/guiado en tren inferior', () => {
  const res = generarRutinas({ sex: 'F', level: 'Principiante', days: 3, goal: 'Ganar músculo', weight: 85, height: 165 }, LIB, { ...FIXED, loadProfile: 'high' });
  assert.strictEqual(res.loadProfile, 'high');
  const piernas = res.routines[0].exercises.find(e => e.muscle === 'piernas');
  assert.ok(piernas, 'hay ejercicio de piernas');
  assert.ok(/prensa|maquina|polea|guiad|asistid|sentado|banda/.test(_na(piernas.name)), `esperaba variante guiada en piernas, vino "${piernas.name}"`);
  assert.ok(!/sentadilla con barra/.test(_na(piernas.name)), 'no debe elegir sentadilla libre con barra como "guiada"');
});

test('generarRutinas: perfil alto evita saltos/pliométricos (burpees fuera)', () => {
  const res = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Perder grasa', weight: 95, height: 170 }, LIB, { ...FIXED, loadProfile: 'high' });
  const names = res.routines.flatMap(r => r.exercises.map(e => _na(e.name)));
  assert.ok(!names.some(n => /burpee|salto|jump/.test(n)), 'no debe haber alto impacto con perfil alto');
});

test('generarRutinas: perfil normal no fuerza máquina (retorna loadProfile normal)', () => {
  const res = generarRutinas({ sex: 'F', level: 'Principiante', days: 3, goal: 'Ganar músculo', weight: 55, height: 165 }, LIB, FIXED);
  assert.strictEqual(res.loadProfile, 'normal');
});

// ══════════════════════════════════════════════════════
section('17. Auto-registro (modo libre)');

const COACH = 'coach@apex.com';

test('validateSignup: registro válido pasa', () => {
  const r = validateSignup({ name: 'Ana', email: 'ana@mail.com', password: 'clave123' }, [], COACH);
  assert.strictEqual(r.ok, true);
});

test('validateSignup: email inválido se rechaza', () => {
  assert.strictEqual(validateSignup({ name: 'Ana', email: 'ana-arroba-mail', password: '1234' }, [], COACH).ok, false);
  assert.strictEqual(validateSignup({ name: 'Ana', email: '', password: '1234' }, [], COACH).ok, false);
});

test('validateSignup: email duplicado se rechaza (case-insensitive)', () => {
  const clients = [{ email: 'Ana@Mail.com' }];
  const r = validateSignup({ name: 'Otra', email: 'ana@mail.com', password: '1234' }, clients, COACH);
  assert.strictEqual(r.ok, false);
  assert.ok(/existe/i.test(r.error));
});

test('validateSignup: no se puede registrar con el email del coach', () => {
  assert.strictEqual(validateSignup({ name: 'X', email: COACH, password: '1234' }, [], COACH).ok, false);
});

test('validateSignup: contraseña corta y nombre vacío se rechazan', () => {
  assert.strictEqual(validateSignup({ name: 'Ana', email: 'a@b.com', password: '12' }, [], COACH).ok, false);
  assert.strictEqual(validateSignup({ name: '', email: 'a@b.com', password: '1234' }, [], COACH).ok, false);
});

test('flujo libre: con los datos del registro, el generador produce ≥1 rutina (principiante)', () => {
  // Simula lo que hace signupClient: registro válido → generar con sus datos.
  const data = { name: 'Sofía', email: 'sofia@mail.com', password: 'clave123', sex: 'F', age: 40, weight: 85, height: 165, level: 'Principiante', days: 3, goal: 'Perder grasa', place: 'gym' };
  assert.strictEqual(validateSignup(data, [], COACH).ok, true);
  const res = generarRutinas(data, LIB, { ...FIXED, adaptation: true, loadProfile: bodyLoadProfile(data) });
  assert.ok(res.routines.length >= 1, 'genera al menos una rutina');
  assert.strictEqual(res.adaptation, true);
  assert.strictEqual(res.loadProfile, 'high'); // 85/165 → IMC 31
});

test('isFreeClient: solo tier "libre" es free; coach-creados y premium tienen acceso', () => {
  assert.strictEqual(isFreeClient({ tier: 'libre' }), true);
  assert.strictEqual(isFreeClient({ selfReg: true, tier: 'libre' }), true);
  assert.strictEqual(isFreeClient({ tier: 'premium' }), false);
  assert.strictEqual(isFreeClient({}), false);          // creado por coach (sin tier)
  assert.strictEqual(isFreeClient(null), false);
});

// ══════════════════════════════════════════════════════
// 18. Mapeo cliente <-> fila user_data (Fase 2 — auth/RLS)
// ══════════════════════════════════════════════════════
console.log('\n── 18. Mapeo user_data (Fase 2 auth) ──');

const SAMPLE_CLIENT = {
  id: 'c1', name: 'Ana', email: 'ana@mail.com', password: 'sha256:abc',
  goal: 'Perder grasa', level: 'Principiante', days: 3, sex: 'F', age: 30,
  tier: 'libre', selfReg: true, place: 'gym',
  routines: [{ id: 'r1', day: 'Lunes', exercises: [] }],
};

test('clientToRow: separa perfil/rutinas y mueve el id a user_id', () => {
  const row = clientToRow(SAMPLE_CLIENT, { coachId: null, role: 'client' });
  assert.strictEqual(row.user_id, 'c1');
  assert.strictEqual(row.coach_id, null);
  assert.strictEqual(row.role, 'client');
  assert.strictEqual(row.routines.length, 1);
  assert.strictEqual(row.profile.name, 'Ana');
  assert.strictEqual(row.profile.tier, 'libre');
});

test('clientToRow: NUNCA filtra la contraseña ni el id al perfil', () => {
  const row = clientToRow(SAMPLE_CLIENT, {});
  assert.ok(!('password' in row.profile), 'password no debe estar en profile (lo maneja Auth)');
  assert.ok(!('id' in row.profile), 'id no debe duplicarse en profile (vive en user_id)');
  assert.ok(!('routines' in row.profile), 'routines tiene su propia columna');
});

test('clientToRow: coach_id se setea al convertir a Premium (coach asignado)', () => {
  const row = clientToRow({ ...SAMPLE_CLIENT, tier: 'premium' }, { coachId: 'coach-uid' });
  assert.strictEqual(row.coach_id, 'coach-uid');
  assert.strictEqual(row.profile.tier, 'premium');
});

test('rowToClient: reconstruye {id, ...perfil, routines}', () => {
  const row = clientToRow(SAMPLE_CLIENT, {});
  const back = rowToClient(row);
  assert.strictEqual(back.id, 'c1');
  assert.strictEqual(back.name, 'Ana');
  assert.strictEqual(back.tier, 'libre');
  assert.strictEqual(back.routines.length, 1);
  assert.strictEqual(back.password, undefined); // la auth la maneja, no vuelve
});

test('round-trip client→row→client conserva el perfil (sin password)', () => {
  const back = rowToClient(clientToRow(SAMPLE_CLIENT, {}));
  const { password, ...expected } = SAMPLE_CLIENT;
  assert.deepStrictEqual(back, expected);
});

test('rowToClient: tolera fila vacía/parcial sin romper', () => {
  assert.deepStrictEqual(rowToClient(null), { id: null, routines: [] });
  assert.deepStrictEqual(rowToClient({ user_id: 'x' }), { id: 'x', routines: [] });
});

test('USER_DATA_COLLECTIONS lista las colecciones por-usuario esperadas', () => {
  assert.ok(USER_DATA_COLLECTIONS.includes('history'));
  assert.ok(USER_DATA_COLLECTIONS.includes('msgs'));
  assert.ok(!USER_DATA_COLLECTIONS.includes('routines')); // routines es columna propia
});

// ══════════════════════════════════════════════════════
// PESO SUGERIDO POR PR (estimación 1RM, Epley)
// ══════════════════════════════════════════════════════

test('estimate1RM: Epley — 60kg×8 ≈ 76kg; 1 rep = el mismo peso', () => {
  assert.strictEqual(estimate1RM(60, 8), 60 * (1 + 8 / 30));
  assert.strictEqual(estimate1RM(100, 1), 100);
});

test('estimate1RM: inválidos y fuera de rango → null (0kg, 0 reps, >15 reps)', () => {
  assert.strictEqual(estimate1RM(0, 8), null);
  assert.strictEqual(estimate1RM(60, 0), null);
  assert.strictEqual(estimate1RM(60, 20), null); // poco confiable: mejor no sugerir
  assert.strictEqual(estimate1RM(null, 8), null);
});

test('suggestLoad: inversa de Epley con factor conservador 0.95 y redondeo a 2.5kg', () => {
  assert.strictEqual(suggestLoad(76, 10), 55); // 76/(1+10/30)*0.95 = 54.15 → 55
  assert.strictEqual(suggestLoad(100, 1, { factor: 1, step: 1 }), 100);
  assert.strictEqual(suggestLoad(0, 10), null);
  assert.strictEqual(suggestLoad(76, 20), null);
});

test('suggestFromPR: PR 60kg×8 → sugerencia para 12 reps; PRs no-kg → null', () => {
  assert.strictEqual(suggestFromPR({ val: 60, unit: 'kg', reps: 8 }, 12), 52.5); // e1RM 76 → 51.57 → 52.5
  assert.strictEqual(suggestFromPR({ val: 20, unit: 'reps', reps: 20 }, 10), null); // PR corporal no estima kg
  assert.strictEqual(suggestFromPR(null, 10), null);
});

test('suggestFromPR: tolera PR legacy {kg} sin val ni reps (asume 1RM)', () => {
  assert.strictEqual(suggestFromPR({ kg: 80 }, 10, { factor: 1 }), 60); // 80/(1+10/30) = 60
});

section('Calentamiento + dropset — peso derivado');

test('warmupLoad: ≈50% del peso de trabajo, redondeado a 2.5kg', () => {
  assert.strictEqual(warmupLoad(90), 45);    // 90*0.5 = 45
  assert.strictEqual(warmupLoad(87.5), 45);  // 43.75 → 45 (redondeo a 2.5)
  assert.strictEqual(warmupLoad(20), 10);    // 20*0.5 = 10
  assert.strictEqual(warmupLoad(11), 5);     // 5.5 → 5
});

test('dropLoad: ≈70% del peso de la última serie, redondeado a 2.5kg', () => {
  assert.strictEqual(dropLoad(87.5), 62.5);  // 61.25 → 62.5
  assert.strictEqual(dropLoad(100), 70);     // 70
  assert.strictEqual(dropLoad(50), 35);      // 35
});

test('warmupLoad/dropLoad: sin base o base inválida → null; piso de 2.5kg', () => {
  assert.strictEqual(warmupLoad(0), null);
  assert.strictEqual(warmupLoad(null), null);
  assert.strictEqual(dropLoad(undefined), null);
  assert.strictEqual(warmupLoad(2), 2.5);    // 1 → piso 2.5 (mancuerna mínima real)
});

// ══════════════════════════════════════════════════════
section('18. Check-in diario "¿cómo te sientes hoy?" (applyMood)');
// ══════════════════════════════════════════════════════

function moodRoutine() {
  return {
    id: 'r1', name: 'Full Body', day: 'Lunes', restSec: 60,
    exercises: [
      { name: 'Sentadilla con Barra', muscle: 'piernas', type: 'Compuesto', sets: 4, reps: 10 },
      { name: 'Press de Banca', muscle: 'pecho', type: 'Compuesto', sets: 4, reps: 10 },
      { name: 'Curl con Barra', muscle: 'biceps', type: 'Aislamiento', sets: 3, reps: 12 },
      { name: 'Plancha', muscle: 'core', type: 'Isométrico', sets: 3, reps: 60 },
    ],
  };
}

test('applyMood: nunca muta la rutina original (devuelve copia)', () => {
  const base = moodRoutine();
  const snapshot = JSON.stringify(base);
  applyMood(base, 'cansado', {});
  applyMood(base, 'periodo', { sex: 'F' });
  assert.strictEqual(JSON.stringify(base), snapshot, 'la rutina original cambió');
});

test('applyMood "bien" deja la rutina igual y no marca ajuste', () => {
  const out = applyMood(moodRoutine(), 'bien', {});
  assert.strictEqual(out.moodAdjusted, false);
  assert.strictEqual(out.exercises.length, 4);
  assert.strictEqual(out.exercises[0].sets, 4);
  assert.strictEqual(out.adapt.flagCoach, false);
});

test('applyMood "cansado": baja 1 serie por ejercicio y sube descanso', () => {
  const out = applyMood(moodRoutine(), 'cansado', {});
  assert.strictEqual(out.moodAdjusted, true);
  assert.strictEqual(out.restSec, 75);              // 60 + 15
  assert.strictEqual(out.exercises.length, 4);      // base tiene 4 → no entra al drop (solo si >4)
  assert.ok(out.exercises.every(e => e.sets >= 2));
  assert.strictEqual(out.exercises[0].sets, 3);     // 4 - 1
});

test('applyMood "cansado" con >4 ejercicios sí quita el último accesorio', () => {
  const r = moodRoutine();
  r.exercises.push({ name: 'Extra', muscle: 'triceps', type: 'Aislamiento', sets: 3, reps: 12 });
  const out = applyMood(r, 'cansado', {});
  assert.strictEqual(out.exercises.length, 4);      // 5 → 4
  assert.ok(out.adapt.changes.some(c => /Quitamos/.test(c)));
});

test('applyMood "estres": agrega un bloque de cardio (sin duplicar si ya hay)', () => {
  const out = applyMood(moodRoutine(), 'estres', {});
  assert.strictEqual(out.exercises.filter(e => e.muscle === 'cardio').length, 1);
  const r = moodRoutine();
  r.exercises.push({ name: 'Bicicleta', muscle: 'cardio', type: 'Cardio', sets: 1, reps: 15 });
  assert.strictEqual(applyMood(r, 'estres', {}).exercises.filter(e => e.muscle === 'cardio').length, 1);
});

test('applyMood "periodo": NO despoja carga (empodera + autorregula); rutina intacta', () => {
  // Evidencia: la fase del ciclo no afecta la fuerza. No convertimos a peso
  // corporal ni agregamos cardio — la rutina queda igual; el banner educa.
  const base = moodRoutine();
  const out = applyMood(base, 'periodo', { sex: 'F' });
  assert.strictEqual(out.exercises.length, base.exercises.length);
  assert.ok(out.exercises.every(e => !e.bodyweightMode), 'no debe quitar la carga');
  assert.ok(!out.exercises.some(e => e._added), 'no debe agregar bloques');
  assert.strictEqual(out.adapt.flagCoach, false);
  assert.strictEqual(out.adapt.tone, 'g'); // tono positivo / empoderador
});

test('applyMood "dolor": trabajo sin carga, descanso mayor y avisa al coach', () => {
  const out = applyMood(moodRoutine(), 'dolor', {});
  assert.strictEqual(out.adapt.flagCoach, true);
  assert.strictEqual(out.restSec, 80);              // 60 + 20
  const loaded = out.exercises.filter(e => e.muscle !== 'cardio' && e.muscle !== 'core');
  assert.ok(loaded.every(e => e.bodyweightMode === true && e.sets === 2));
});

test('MOOD_STATES: "periodo" es el único femaleOnly; ids únicos', () => {
  assert.deepStrictEqual(MOOD_STATES.filter(m => m.femaleOnly).map(m => m.id), ['periodo']);
  const ids = MOOD_STATES.map(m => m.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

// ══════════════════════════════════════════════════════
section('Membresía (MS) — estado de pago, login y badge');

const _today = new Date();
const _plusDays = n => new Date(_today.getTime() + n * 86400000).toISOString();

test('MS.getStatus: sin pagos → "pending"', () => {
  assert.strictEqual(MS.getStatus({ payments: [] }), 'pending');
  assert.strictEqual(MS.getStatus({}), 'pending');
});
test('MS.getStatus: suspendido → "inactive" (aunque tenga pagos)', () => {
  assert.strictEqual(MS.getStatus({ suspended: true, payments: [{ dueDate: _plusDays(30) }] }), 'inactive');
});
test('MS.getStatus: vence en >7 días → "active"', () => {
  assert.strictEqual(MS.getStatus({ payments: [{ dueDate: _plusDays(20) }] }), 'active');
});
test('MS.getStatus: vence dentro de 7 días → "expiring"', () => {
  assert.strictEqual(MS.getStatus({ payments: [{ dueDate: _plusDays(3) }] }), 'expiring');
});
test('MS.getStatus: ya venció → "overdue"', () => {
  assert.strictEqual(MS.getStatus({ payments: [{ dueDate: _plusDays(-5) }] }), 'overdue');
});
test('MS.getStatus: toma el pago con dueDate más reciente', () => {
  assert.strictEqual(MS.getStatus({ payments: [{ dueDate: _plusDays(-30) }, { dueDate: _plusDays(20) }] }), 'active');
});
test('MS.canLogin: active/expiring/pending SÍ; overdue/inactive NO', () => {
  assert.strictEqual(MS.canLogin({ payments: [{ dueDate: _plusDays(20) }] }), true);  // active
  assert.strictEqual(MS.canLogin({ payments: [{ dueDate: _plusDays(3) }] }), true);   // expiring
  assert.strictEqual(MS.canLogin({ payments: [] }), true);                            // pending
  assert.strictEqual(MS.canLogin({ payments: [{ dueDate: _plusDays(-5) }] }), false); // overdue
  assert.strictEqual(MS.canLogin({ suspended: true }), false);                        // inactive
});
test('MS.badge: estado conocido → etiqueta correcta; desconocido → fallback', () => {
  assert.strictEqual(MS.badge('active').label, 'Al día');
  assert.strictEqual(MS.badge('overdue').label, 'Vencido');
  assert.strictEqual(MS.badge('zzz').label, 'Sin pago');
});

// ══════════════════════════════════════════════════════
section('Formato (fmtMetric / fmtDuration)');

test('fmtMetric: kg redondea a 1 decimal', () => {
  assert.strictEqual(fmtMetric(72.49, 'kg'), '72.5 kg');
  assert.strictEqual(fmtMetric(60, 'kg'), '60 kg');
});
test('fmtMetric: reps/s/min/rondas redondean a entero con su sufijo', () => {
  assert.strictEqual(fmtMetric(12.4, 'reps'), '12 reps');
  assert.strictEqual(fmtMetric(45, 's'), '45 s');
  assert.strictEqual(fmtMetric(30, 'min'), '30 min');
  assert.strictEqual(fmtMetric(5, 'rondas'), '5 rondas');
});
test('fmtDuration: <60min en minutos; ≥60 en h/min', () => {
  assert.strictEqual(fmtDuration(1800), '30 min');
  assert.strictEqual(fmtDuration(3600), '1 h');
  assert.strictEqual(fmtDuration(5400), '1 h 30 min');
});

section('Feeling (calificación de sesión)');

test('feelingEmoji/feelingLabel: valor conocido', () => {
  assert.strictEqual(feelingEmoji(5), '😄');
  assert.strictEqual(feelingLabel(1), 'Muy duro');
});
test('feelingEmoji/feelingLabel: valor desconocido → cadena vacía', () => {
  assert.strictEqual(feelingEmoji(9), '');
  assert.strictEqual(feelingLabel(0), '');
});

section('inferNutGoal — objetivo del plan nutricional');

test('inferNutGoal: usa nut.goal si es válido', () => {
  assert.strictEqual(inferNutGoal({ goal: 'volumen' }), 'volumen');
  assert.strictEqual(inferNutGoal({ goal: 'mantenimiento', plan: 'lo que sea' }), 'mantenimiento');
});
test('inferNutGoal: goal inválido cae a inferencia por texto', () => {
  assert.strictEqual(inferNutGoal({ goal: 'xxx', plan: 'Superávit calórico para ganar masa' }), 'volumen');
});
test('inferNutGoal: infiere del texto del plan', () => {
  assert.strictEqual(inferNutGoal({ plan: 'Déficit moderado para perder grasa' }), 'cutting');
  assert.strictEqual(inferNutGoal({ plan: 'Plan de definición con alta proteína' }), 'definicion');
  assert.strictEqual(inferNutGoal({ plan: 'Mantenimiento, balance calórico' }), 'mantenimiento');
});
test('inferNutGoal: sin pista → null', () => {
  assert.strictEqual(inferNutGoal({ plan: 'come sano' }), null);
  assert.strictEqual(inferNutGoal(null), null);
});

// ══════════════════════════════════════════════════════
section('Valoración nutricional / composición');

test('calcTMB: Mifflin-St Jeor por sexo', () => {
  // Hombre 80kg/180cm/30: 10·80 + 6.25·180 - 5·30 + 5 = 1780
  assert.strictEqual(calcTMB(80, 180, 30, 'M'), 1780);
  // Mujer 60kg/165cm/30: 10·60 + 6.25·165 - 5·30 - 161 = 1320.25 → 1320
  assert.strictEqual(calcTMB(60, 165, 30, 'F'), 1320);
});
test('calcTMB: falta algún dato → null', () => {
  assert.strictEqual(calcTMB(0, 180, 30, 'M'), null);
  assert.strictEqual(calcTMB(80, 180, 30, ''), null);
  assert.strictEqual(calcTMB(80, 180, null, 'M'), null);
});
test('calcTDEE: TMB × factor (default 1.55)', () => {
  assert.strictEqual(calcTDEE(1780, 1.2), 2136);
  assert.strictEqual(calcTDEE(1780, null), Math.round(1780 * 1.55));
  assert.strictEqual(calcTDEE(null, 1.5), null);
});

test('getRctLabel: cortes de riesgo cintura-talla', () => {
  assert.strictEqual(getRctLabel(0.35).label, 'Muy delgado/a');
  assert.strictEqual(getRctLabel(0.45).label, 'Óptimo');
  assert.strictEqual(getRctLabel(0.55).label, 'Riesgo moderado');
  assert.strictEqual(getRctLabel(0.65).label, 'Riesgo elevado');
});

test('getGoalMsg: ganar músculo varía con RCT', () => {
  assert.ok(/favorable/.test(getGoalMsg('Ganar músculo', 0.45)));
  assert.ok(/normal y esperado/.test(getGoalMsg('Ganar músculo', 0.62)));
});
test('getGoalMsg: perder grasa según RCT (incl. sin medida)', () => {
  assert.ok(/Registra tu cintura/.test(getGoalMsg('Perder grasa', null)));
  assert.ok(/riesgo elevado/.test(getGoalMsg('Perder grasa', 0.61)));
  assert.ok(/zona óptima/.test(getGoalMsg('Perder grasa', 0.45)));
});
test('getGoalMsg: default saludable vs por mejorar', () => {
  assert.ok(/zona saludable/.test(getGoalMsg('Salud general', 0.45)));
  assert.ok(/por debajo de 0.50/.test(getGoalMsg('Salud general', 0.55)));
});

test('kcalTargetFor: aplica déficit/superávit sobre TDEE', () => {
  assert.strictEqual(kcalTargetFor('Perder grasa', 2000).kcalObj, 1500);
  assert.strictEqual(kcalTargetFor('Ganar músculo', 2000).kcalObj, 2350);
  assert.strictEqual(kcalTargetFor('Fuerza', 2000).kcalObj, 2200);
  assert.strictEqual(kcalTargetFor('Salud general', 2000).kcalObj, 2000);
});
test('kcalTargetFor: sin TDEE → kcalObj null', () => {
  assert.strictEqual(kcalTargetFor('Perder grasa', null).kcalObj, null);
});

test('calcMacrosFromKcal: proteína sube en músculo/fuerza; carbs = resto', () => {
  // 80kg, 2350 kcal, Ganar músculo → prot 2.2·80=176, fat 0.9·80=72
  const m = calcMacrosFromKcal(2350, 80, 'Ganar músculo');
  assert.strictEqual(m.prot_g, 176);
  assert.strictEqual(m.fat_g, 72);
  // carbs = (2350 - 176·4 - 72·9)/4 = (2350 - 704 - 648)/4 = 998/4 = 249.5 → 250
  assert.strictEqual(m.carb_g, 250);
  assert.strictEqual(m.kcal, 2350);
});
test('calcMacrosFromKcal: objetivo no-fuerza usa 1.8 g/kg', () => {
  assert.strictEqual(calcMacrosFromKcal(2000, 70, 'Perder grasa').prot_g, Math.round(70 * 1.8));
});
test('calcMacrosFromKcal: sin kcal o sin peso → null', () => {
  assert.strictEqual(calcMacrosFromKcal(null, 80, 'Fuerza'), null);
  assert.strictEqual(calcMacrosFromKcal(2000, 0, 'Fuerza'), null);
});
test('calcMacrosFromKcal: carbohidratos nunca negativos', () => {
  // kcal absurdamente bajas → carbs colapsan a 0, no negativo
  assert.strictEqual(calcMacrosFromKcal(100, 80, 'Fuerza').carb_g, 0);
});

// ══════════════════════════════════════════════════════
section('Gamificación (nivel + descuento del mes)');

test('gxLevel: arranque, intermedio y tope', () => {
  const a = gxLevel(0);
  assert.strictEqual(a.cur.name, 'Arranque');
  assert.strictEqual(a.next.name, 'Constante');
  assert.strictEqual(a.rem, 10);
  assert.strictEqual(a.pct, 0);
  // 45 entrenos → Comprometido (min 30), siguiente Imparable (min 60)
  const m = gxLevel(45);
  assert.strictEqual(m.cur.name, 'Comprometido');
  assert.strictEqual(m.pct, 50);   // (45-30)/(60-30) = 50%
  assert.strictEqual(m.rem, 15);
  // tope: sin siguiente nivel, pct 100, rem 0
  const top = gxLevel(200);
  assert.strictEqual(top.cur.name, 'Élite AVI');
  assert.strictEqual(top.next, null);
  assert.strictEqual(top.pct, 100);
  assert.strictEqual(top.rem, 0);
});

// Cliente base: 2 pagos (ciclo 01-may → 01-jun = 4 semanas), 3 días/sem → esperado 12.
const gxClient = { days: 3, routines: [], payments: [{ dueDate: '2026-05-01' }, { dueDate: '2026-06-01' }] };
const gxSessions = n => Array.from({ length: n }, () => ({ date: '2026-05-10', doneSets: 1, totalVol: 100 }));
const GX_NOW = '2026-05-25';

test('gxDiscount: adherencia plena → 15% (esperado 12 sesiones)', () => {
  const d = gxDiscount(gxClient, gxSessions(12), GX_NOW);
  assert.strictEqual(d.expected, 12);
  assert.strictEqual(d.done, 12);
  assert.strictEqual(d.adh, 1);
  assert.strictEqual(d.pct, 15);
  assert.strictEqual(d.daysLeft, 7); // 25-may → 01-jun
});
test('gxDiscount: tramos 10% / 5% / 0%', () => {
  assert.strictEqual(gxDiscount(gxClient, gxSessions(10), GX_NOW).pct, 10); // 10/12 = .83
  assert.strictEqual(gxDiscount(gxClient, gxSessions(8), GX_NOW).pct, 5);   // 8/12  = .67
  assert.strictEqual(gxDiscount(gxClient, gxSessions(4), GX_NOW).pct, 0);   // 4/12  = .33
});
test('gxDiscount: solo cuenta sesiones reales (con series o volumen)', () => {
  const sess = gxSessions(6).concat([{ date: '2026-05-10', doneSets: 0, totalVol: 0 }]);
  assert.strictEqual(gxDiscount(gxClient, sess, GX_NOW).done, 6); // la vacía no suma
});
test('gxDiscount: sin pagos → null', () => {
  assert.strictEqual(gxDiscount({ days: 3 }, gxSessions(5), GX_NOW), null);
});
test('gxDiscount: un solo pago → ventana del mes previo', () => {
  const d = gxDiscount({ days: 3, routines: [], payments: [{ dueDate: '2026-06-01' }] }, gxSessions(12), GX_NOW);
  assert.strictEqual(d.expected, 12);
  assert.strictEqual(d.done, 12);
});

test('gxNextTier: sesiones que faltan para el próximo tramo', () => {
  const d = gxDiscount(gxClient, gxSessions(4), GX_NOW); // adh .33
  const nt = gxNextTier(d);
  assert.strictEqual(nt.pct, 5);
  assert.strictEqual(nt.need, 4); // ceil(.6·12)=8, faltan 8-4
});
test('gxNextTier: ya en el tope (15%) → null', () => {
  const d = gxDiscount(gxClient, gxSessions(12), GX_NOW);
  assert.strictEqual(gxNextTier(d), null);
});

// ══════════════════════════════════════════════════════
section('Progreso por ejercicio (computeExerciseProgress)');

test('peso_reps: serie viejo→nuevo con maxKg y volumen del día', () => {
  // history se guarda nuevo→viejo; la función lo invierte.
  const hist = [
    { date: '2026-05-10', exercises: [{ name: 'Sentadilla', muscle: 'piernas', track: 'peso_reps', sets: [{ done: true, kg: '100', reps: '5' }, { done: true, kg: '90', reps: '8' }] }] },
    { date: '2026-05-03', exercises: [{ name: 'Sentadilla', muscle: 'piernas', track: 'peso_reps', sets: [{ done: true, kg: '80', reps: '5' }] }] },
  ];
  const r = computeExerciseProgress(hist);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].name, 'Sentadilla');
  assert.strictEqual(r[0].unit, 'kg');
  assert.strictEqual(r[0].points.length, 2);
  assert.strictEqual(r[0].points[0].maxKg, 80);          // el más viejo primero
  assert.strictEqual(r[0].points[0].vol, 400);           // 80·5
  assert.strictEqual(r[0].points[1].maxKg, 100);         // máx del día
  assert.strictEqual(r[0].points[1].vol, 1220);          // 100·5 + 90·8
});

test('cada modalidad de track calcula su valor y unidad', () => {
  const hist = [{ date: '2026-05-10', exercises: [
    { name: 'Dominadas', track: 'reps', sets: [{ done: true, reps: '12' }, { done: true, reps: '10' }] },
    { name: 'Plancha', track: 'tiempo', sets: [{ done: true, secs: '60' }, { done: true, secs: '45' }] },
    { name: 'Trote', track: 'cardio', sets: [{ done: true, min: '10' }, { done: true, min: '5' }] },
    { name: 'Burpees', track: 'hiit', sets: [{ done: true }, { done: true }, { done: false }] },
  ] }];
  const by = Object.fromEntries(computeExerciseProgress(hist).map(e => [e.name, e]));
  assert.deepStrictEqual([by.Dominadas.points[0].maxKg, by.Dominadas.unit], [12, 'reps']);     // reps máx
  assert.deepStrictEqual([by.Plancha.points[0].maxKg, by.Plancha.unit], [60, 's']);            // segundos máx
  assert.deepStrictEqual([by.Trote.points[0].maxKg, by.Trote.unit], [15, 'min']);              // minutos sumados
  assert.deepStrictEqual([by.Burpees.points[0].maxKg, by.Burpees.unit], [2, 'rondas']);        // rondas = series hechas
});

test('mismo día dos veces → un punto con el máximo y volumen sumado', () => {
  const hist = [
    { date: '2026-05-10T18:00', exercises: [{ name: 'Press', track: 'peso_reps', sets: [{ done: true, kg: '60', reps: '10' }] }] },
    { date: '2026-05-10T07:00', exercises: [{ name: 'Press', track: 'peso_reps', sets: [{ done: true, kg: '50', reps: '10' }] }] },
  ];
  const r = computeExerciseProgress(hist);
  assert.strictEqual(r[0].points.length, 1);
  assert.strictEqual(r[0].points[0].maxKg, 60);
  assert.strictEqual(r[0].points[0].vol, 1100); // 50·10 + 60·10
});

test('peso_reps sin peso o sin series hechas → no genera punto', () => {
  const hist = [{ date: '2026-05-10', exercises: [
    { name: 'Vacío', track: 'peso_reps', sets: [{ done: true, kg: '0', reps: '10' }] },
    { name: 'NoHecho', track: 'peso_reps', sets: [{ done: false, kg: '80', reps: '5' }] },
  ] }];
  assert.strictEqual(computeExerciseProgress(hist).length, 0);
});

test('ordena por número de puntos (más datos primero)', () => {
  const hist = [
    { date: '2026-05-10', exercises: [{ name: 'A', track: 'peso_reps', sets: [{ done: true, kg: '50', reps: '5' }] }, { name: 'B', track: 'peso_reps', sets: [{ done: true, kg: '30', reps: '5' }] }] },
    { date: '2026-05-03', exercises: [{ name: 'A', track: 'peso_reps', sets: [{ done: true, kg: '45', reps: '5' }] }] },
  ];
  const r = computeExerciseProgress(hist);
  assert.strictEqual(r[0].name, 'A'); // 2 puntos
  assert.strictEqual(r[1].name, 'B'); // 1 punto
});

test('historial vacío o nulo → []', () => {
  assert.deepStrictEqual(computeExerciseProgress([]), []);
  assert.deepStrictEqual(computeExerciseProgress(null), []);
});

// ══════════════════════════════════════════════════════
section('Editorial de la semana (weekEditorial)');

test('elige el editorial según el objetivo', () => {
  assert.strictEqual(weekEditorial({ goal: 'Perder grasa' }).kick, 'QUEMA Y CONSTANCIA');
  assert.strictEqual(weekEditorial({ goal: 'Ganar músculo' }).kick, 'FUERZA Y CRECIMIENTO');
  assert.strictEqual(weekEditorial({ goal: 'Recomposición' }).kick, 'RECOMPOSICIÓN');
  // hipertrofia cae en la rama de músculo aunque no diga "músculo"
  assert.strictEqual(weekEditorial({ goal: 'Hipertrofia' }).kick, 'FUERZA Y CRECIMIENTO');
});
test('objetivo desconocido o vacío → editorial por defecto', () => {
  assert.strictEqual(weekEditorial({ goal: 'Salud general' }).kick, 'TU SEMANA');
  assert.strictEqual(weekEditorial({}).kick, 'TU SEMANA');
  assert.strictEqual(weekEditorial(null).kick, 'TU SEMANA');
});
test('cuenta días de entreno (excluye Libre)', () => {
  const client = { goal: 'Fuerza', routines: [{ day: 'Lunes' }, { day: 'Martes' }, { day: 'Libre' }, { day: 'Jueves' }] };
  assert.strictEqual(weekEditorial(client).trainDays, 3);
  assert.strictEqual(weekEditorial({ routines: [] }).trainDays, 0);
});

// ══════════════════════════════════════════════════════
section('Modalidad y récords (exTrack / prFromSets / isBetterPR)');

test('exTrack: track explícito manda; si no, lo infiere del tipo', () => {
  assert.strictEqual(exTrack({ track: 'cardio', type: 'Bodyweight' }), 'cardio');
  assert.strictEqual(exTrack({ type: 'HIIT' }), 'hiit');
  assert.strictEqual(exTrack({ type: 'Cardio' }), 'cardio');
  assert.strictEqual(exTrack({ type: 'Isométrico' }), 'tiempo');
  assert.strictEqual(exTrack({ type: 'Bodyweight' }), 'reps');
  assert.strictEqual(exTrack({ type: 'Compuesto' }), 'peso_reps');
  assert.strictEqual(exTrack({}), 'peso_reps');
});

test('prFromSets: peso_reps → kg máx con sus reps', () => {
  const pr = prFromSets([{ kg: '80', reps: '5' }, { kg: '100', reps: '3' }], 'peso_reps');
  assert.deepStrictEqual(pr, { val: 100, reps: 3, unit: 'kg' });
});
test('prFromSets: cada modalidad calcula su valor y unidad', () => {
  assert.deepStrictEqual(prFromSets([{ reps: '12' }, { reps: '10' }], 'reps'), { val: 12, reps: 12, unit: 'reps' });
  assert.deepStrictEqual(prFromSets([{ secs: '60' }, { secs: '45' }], 'tiempo'), { val: 60, reps: 0, unit: 's' });
  assert.deepStrictEqual(prFromSets([{ min: '10' }, { min: '5' }], 'cardio'), { val: 15, reps: 0, unit: 'min' });
  assert.deepStrictEqual(prFromSets([{}, {}, {}], 'hiit'), { val: 3, reps: 0, unit: 'rondas' });
});
test('prFromSets: sin valor positivo o sin series → null', () => {
  assert.strictEqual(prFromSets([{ kg: '0', reps: '8' }], 'peso_reps'), null);
  assert.strictEqual(prFromSets([], 'peso_reps'), null);
});

test('isBetterPR: sin récord previo → siempre es récord', () => {
  assert.strictEqual(isBetterPR(50, 5, 'kg', null), true);
});
test('isBetterPR: supera por valor', () => {
  assert.strictEqual(isBetterPR(100, 3, 'kg', { val: 90, reps: 5 }), true);
  assert.strictEqual(isBetterPR(80, 5, 'kg', { val: 90, reps: 5 }), false);
});
test('isBetterPR: empate en kg se desempata por más reps', () => {
  assert.strictEqual(isBetterPR(90, 6, 'kg', { val: 90, reps: 5 }), true);
  assert.strictEqual(isBetterPR(90, 5, 'kg', { val: 90, reps: 5 }), false);
});
test('isBetterPR: empate sin kg (reps/min/etc) NO mejora', () => {
  assert.strictEqual(isBetterPR(12, 12, 'reps', { val: 12, reps: 12 }), false);
});
test('isBetterPR: récord previo viejo guardado como kg (sin val)', () => {
  assert.strictEqual(isBetterPR(100, 3, 'kg', { kg: 90, reps: 5 }), true);
});

// ══════════════════════════════════════════════════════
section('Descanso por tipo de ejercicio (variable, no uniforme)');

test('restForType: hipertrofia → compuesto 120s, aislamiento 60s', () => {
  assert.strictEqual(restForType('Compuesto', 'Ganar músculo'), 120);
  assert.strictEqual(restForType('Aislamiento', 'Ganar músculo'), 60);
});
test('restForType: fuerza descansa más (compuesto 180, aislamiento 90)', () => {
  assert.strictEqual(restForType('Compuesto', 'Fuerza'), 180);
  assert.strictEqual(restForType('Aislamiento', 'Fuerza'), 90);
});
test('restForType: perder grasa / resistencia descansa menos (compuesto 75)', () => {
  assert.strictEqual(restForType('Compuesto', 'Perder grasa'), 75);
  assert.strictEqual(restForType('Aislamiento', 'Resistencia'), 45);
});
test('restForType: objetivo desconocido cae a hipertrofia (default moderado)', () => {
  assert.strictEqual(restForType('Compuesto', 'Salud general'), 120);
  assert.strictEqual(restForType('Compuesto', ''), 120);
});
test('restForType: tipo raro/sin tabla cae a aislamiento', () => {
  assert.strictEqual(restForType('Movilidad', 'Ganar músculo'), 60);
});
test('restForType: Cardio/HIIT → null (su intervalo lo maneja su propio flujo)', () => {
  assert.strictEqual(restForType('Cardio', 'Ganar músculo'), null);
  assert.strictEqual(restForType('HIIT', 'Perder grasa'), null);
});

test('restForExercise: prioriza el descanso propio del ejercicio (override del coach)', () => {
  assert.strictEqual(restForExercise({ type: 'Compuesto', restSec: 200 }, { why: 'Ganar músculo' }), 200);
});
test('restForExercise: sin propio → deriva por tipo y objetivo de la rutina', () => {
  assert.strictEqual(restForExercise({ type: 'Compuesto' }, { why: 'Fuerza' }), 180);
  assert.strictEqual(restForExercise({ type: 'Aislamiento' }, { why: 'Perder grasa' }), 45);
});
test('restForExercise: cardio sin descanso propio cae al de la rutina', () => {
  assert.strictEqual(restForExercise({ type: 'Cardio' }, { restSec: 30 }), 30);
});
test('restForExercise: ejercicio sin tipo cae al descanso de la rutina, o 60 por defecto', () => {
  assert.strictEqual(restForExercise({}, { restSec: 80 }), 80);
  assert.strictEqual(restForExercise({}, {}), 60);
  assert.strictEqual(restForExercise(null, null), 60);
});
test('restForExercise: restSec=0 o negativo no cuenta como propio (cae a derivar/rutina)', () => {
  assert.strictEqual(restForExercise({ type: 'Compuesto', restSec: 0 }, { why: 'Ganar músculo' }), 120);
});

test('generador: hornea descanso por tipo en cada ejercicio (compuesto > aislamiento)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  const exs = routines.flatMap(r => r.exercises);
  const comp = exs.find(e => e.type === 'Compuesto');
  const aisl = exs.find(e => e.type === 'Aislamiento');
  if (comp) assert.strictEqual(comp.restSec, 120, 'compuesto hipertrofia debe ser 120s');
  if (aisl) assert.strictEqual(aisl.restSec, 60, 'aislamiento hipertrofia debe ser 60s');
  assert.ok(comp || aisl, 'la rutina debería traer al menos un compuesto o aislamiento');
});
test('generador en fuerza: compuesto horneado a 180s', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Avanzado', days: 4, goal: 'Fuerza' }, LIB, FIXED);
  const comp = routines.flatMap(r => r.exercises).find(e => e.type === 'Compuesto');
  if (comp) assert.strictEqual(comp.restSec, 180);
});

test('applyMood "cansado": sube +15s sobre el descanso por tipo de cada ejercicio', () => {
  const routine = { why: 'Ganar músculo', restSec: 90, exercises: [
    { name: 'Sentadilla', type: 'Compuesto', sets: 4, restSec: 120 },
    { name: 'Extensión', type: 'Aislamiento', sets: 3, restSec: 60 },
  ] };
  const out = applyMood(routine, 'cansado', { sex: 'M' });
  assert.strictEqual(out.exercises[0].restSec, 135, 'compuesto 120+15');
  assert.strictEqual(out.exercises[1].restSec, 75, 'aislamiento 60+15');
});

// ══════════════════════════════════════════════════════
section('Biseries (superseries de a 2, manual)');

test('bisetBlocks: sin biseries → cada ejercicio es su propio bloque', () => {
  const exs = [{ sets: 3 }, { sets: 3 }, { sets: 3 }];
  assert.deepStrictEqual(bisetBlocks(exs), [[0], [1], [2]]);
});
test('bisetBlocks: ssNext empareja con el siguiente', () => {
  const exs = [{ sets: 3, ssNext: true }, { sets: 3 }, { sets: 3 }];
  assert.deepStrictEqual(bisetBlocks(exs), [[0, 1], [2]]);
});
test('bisetBlocks: solo parejas — un ssNext encadenado NO forma triserie', () => {
  const exs = [{ ssNext: true }, { ssNext: true }, { ssNext: true }, {}];
  // (0,1) pareja; el ssNext de 1 se salta; (2,3) pareja
  assert.deepStrictEqual(bisetBlocks(exs), [[0, 1], [2, 3]]);
});
test('bisetBlocks: ssNext en el último ejercicio no tiene con quién (queda solo)', () => {
  const exs = [{}, { ssNext: true }];
  assert.deepStrictEqual(bisetBlocks(exs), [[0], [1]]);
});

test('guidedStepOrder: normal = serie por serie', () => {
  const exs = [{ sets: 2 }, { sets: 2 }];
  assert.deepStrictEqual(guidedStepOrder(exs),
    [{ ei: 0, si: 0 }, { ei: 0, si: 1 }, { ei: 1, si: 0 }, { ei: 1, si: 1 }]);
});
test('guidedStepOrder: biserie intercala por ronda (A1,B1,A2,B2)', () => {
  const exs = [{ sets: 2, ssNext: true }, { sets: 2 }];
  assert.deepStrictEqual(guidedStepOrder(exs),
    [{ ei: 0, si: 0 }, { ei: 1, si: 0 }, { ei: 0, si: 1 }, { ei: 1, si: 1 }]);
});
test('guidedStepOrder: biserie con distinto nº de series no se desfasa', () => {
  const exs = [{ sets: 3, ssNext: true }, { sets: 2 }];
  assert.deepStrictEqual(guidedStepOrder(exs),
    [{ ei: 0, si: 0 }, { ei: 1, si: 0 }, { ei: 0, si: 1 }, { ei: 1, si: 1 }, { ei: 0, si: 2 }]);
});

test('bisetInfo: identifica rol A/B y la pareja', () => {
  const exs = [{ ssNext: true }, {}, {}];
  assert.deepStrictEqual(bisetInfo(exs, 0), { biset: true, role: 'a', partner: 1 });
  assert.deepStrictEqual(bisetInfo(exs, 1), { biset: true, role: 'b', partner: 0 });
  assert.deepStrictEqual(bisetInfo(exs, 2), { biset: false, role: null, partner: null });
});

test('normalizeBisets: limpia ssNext del último (sin pareja)', () => {
  const exs = [{}, { ssNext: true }];
  normalizeBisets(exs);
  assert.strictEqual(exs[1].ssNext, undefined);
});
test('normalizeBisets: rompe cadenas dejando solo la primera pareja', () => {
  const exs = [{ ssNext: true }, { ssNext: true }, {}];
  normalizeBisets(exs);
  assert.strictEqual(exs[0].ssNext, true);
  assert.strictEqual(exs[1].ssNext, undefined); // el 2º de la pareja no encadena
});

// ══════════════════════════════════════════════════════
// RESUMEN
// ══════════════════════════════════════════════════════

const line = '─'.repeat(50);
console.log(`\n${line}`);
if (failed === 0) {
  console.log(`✅ AVI Tests: ${passed}/${total} pasaron`);
} else {
  console.log(`❌ AVI Tests: ${passed}/${total} pasaron — ${failed} FALLARON`);
  process.exit(1);
}
