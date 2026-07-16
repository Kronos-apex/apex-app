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
  nutritionEstimate,
  nutMealSplit,
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
  mergeMsgs,
  mergeAuthRow,
  retentionByDay,
  weeklyActiveCount,
  clientsTrainedToday,
  daysSinceLastSession,
  workoutStreak,
  longestStreak,
  planDays,
  weekStreak,
  longestWeekStreak,
  errReportGate,
  cloudWriteSealed,
  stripFixtureSessions,
  adherenceMonth,
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
  passwordProblem,
  consentEvidence,
  PAIN_AREAS,
  PAIN_LEVELS,
  painTipFor,
  painCareAdd,
  painCareActive,
  clientAttentionRank,
  sortClientsByAttention,
  pushNudgeDecision,
  waterGoalGlasses,
  waterToday,
  waterAdd,
  waterWeek,
  clampQwHiit,
  newsToShow,
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
  computeExerciseProgress,
  coachInsight,
  coachPulse,
  shockTargets,
  shockPlan,
  applyShockOption,
  weekEditorial,
  exTrack,
  prFromSets,
  isBetterPR,
  muscleVolume,
  pushPullBalance,
  clientHasCoach,
  clientPlan,
  submuscleVolume,
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
// 12b. mergeMsgs + mergeAuthRow — auditoría 2026-07-01 (P1-3 y P0-2)
// ══════════════════════════════════════════════════════
section('12b. Pollers y boot offline: unión sin perder nada');

test('EL BUG P1-3: mensaje local sin subir NO se descarta cuando el remoto viene más largo', () => {
  const local = [{ from: 'client', text: 'me dolió el hombro', date: '2026-07-01T09:00:00Z' }]; // sin subir
  const remote = [
    { from: 'coach', text: 'Hola', date: '2026-07-01T08:00:00Z' },
    { from: 'coach', text: '¿Cómo vas?', date: '2026-07-01T08:30:00Z' },
  ];
  const merged = mergeMsgs(local, remote);
  assert.strictEqual(merged.length, 3, 'Los 3 mensajes sobreviven');
  assert.ok(merged.some(m => m.text === 'me dolió el hombro'), 'El local sin subir sobrevive');
  assert.deepStrictEqual(merged.map(m => m.text), ['Hola', '¿Cómo vas?', 'me dolió el hombro'], 'Orden cronológico');
});

test('EL BUG P1-3 (empate): longitudes iguales pero contenido distinto → une, no ignora', () => {
  const local = [{ from: 'client', text: 'listo', date: '2026-07-01T10:00:00Z' }];
  const remote = [{ from: 'coach', text: 'sube el peso', date: '2026-07-01T10:01:00Z' }];
  const merged = mergeMsgs(local, remote);
  assert.strictEqual(merged.length, 2, 'Ambos mensajes quedan');
});

test('mergeMsgs: duplicados exactos no se repiten; null no revienta', () => {
  const m = { from: 'coach', text: 'Hola', date: '2026-07-01T08:00:00Z' };
  assert.strictEqual(mergeMsgs([m], [m]).length, 1);
  assert.deepStrictEqual(mergeMsgs(null, null), []);
});

test('EL BUG P0-2: sesión entrenada offline sobrevive al merge del boot', () => {
  const cached = { // respaldo local con la sesión que la nube nunca recibió
    history: [{ id: 's_offline', date: '2026-07-01T06:00:00.000Z', totalVol: 500 }],
    prs: { sentadilla: { val: 90, reps: 5, date: '2026-07-01T06:30:00Z' } },
    msgs: [], bodyweight: [{ date: '2026-07-01', kg: 74 }], medidas: [], photos: [],
    routines: [{ id: 'r_vieja' }], profile: { name: 'Luz' },
  };
  const cloud = { // fila de la nube: sin la sesión, pero con rutina nueva del coach
    history: [{ id: 's_ayer', date: '2026-06-30T18:00:00.000Z', totalVol: 400 }],
    prs: { sentadilla: { val: 100, reps: 3, date: '2026-06-28T00:00:00Z' } },
    msgs: [{ from: 'coach', text: 'Nueva rutina', date: '2026-07-01T07:00:00Z' }],
    bodyweight: [], medidas: [], photos: [],
    routines: [{ id: 'r_nueva' }], profile: { name: 'Luz' }, user_id: 'u1', role: 'client',
  };
  const merged = mergeAuthRow(cached, cloud);
  assert.strictEqual(merged.history.length, 2, 'La sesión offline Y la de la nube quedan');
  assert.ok(merged.history.some(s => s.id === 's_offline'), 'La sesión offline sobrevive');
  assert.strictEqual(merged.prs.sentadilla.val, 100, 'PR: gana el mejor récord');
  assert.strictEqual(merged.msgs.length, 1, 'El mensaje del coach queda');
  assert.strictEqual(merged.bodyweight.length, 1, 'El peso registrado offline queda');
  assert.deepStrictEqual(merged.routines, [{ id: 'r_nueva' }], 'Las rutinas las manda la NUBE (territorio del coach)');
  assert.strictEqual(merged.user_id, 'u1', 'user_id/role de la nube intactos');
});

test('mergeAuthRow: robusto ante filas incompletas o null', () => {
  const out = mergeAuthRow(null, { history: [{ id: 'a', date: '2026-07-01T00:00:00Z' }] });
  assert.strictEqual(out.history.length, 1);
  assert.deepStrictEqual(out.msgs, []);
  const out2 = mergeAuthRow({ history: [{ id: 'b', date: '2026-07-01T00:00:00Z' }] }, null);
  assert.strictEqual(out2.history.length, 1, 'Sin fila de nube, el respaldo local no se pierde');
});

// 12c. parseOAuthReturn — retorno de linkIdentity/OAuth (caso Luz 2026-07-02: los
// errores de GoTrue vuelven en el hash de la URL y se perdían en silencio).
const { parseOAuthReturn } = core;

test('parseOAuthReturn: error de GoTrue en el hash (identity_already_exists)', () => {
  const r = parseOAuthReturn('#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user', '');
  assert.strictEqual(r.error, 'server_error');
  assert.strictEqual(r.code, 'identity_already_exists');
  assert.strictEqual(r.desc, 'Identity is already linked to another user', 'Los + se vuelven espacios');
});

test('parseOAuthReturn: error en el search (?error=) también se captura', () => {
  const r = parseOAuthReturn('', '?error=access_denied&error_description=User%20denied%20access');
  assert.strictEqual(r.error, 'access_denied');
  assert.strictEqual(r.desc, 'User denied access');
});

test('parseOAuthReturn: retorno exitoso (tokens) o vacío → sin error', () => {
  assert.strictEqual(parseOAuthReturn('#access_token=abc&refresh_token=def', '').error, '');
  assert.strictEqual(parseOAuthReturn('', '').error, '');
  assert.strictEqual(parseOAuthReturn(null, undefined).error, '', 'null/undefined no revientan');
});

test('parseOAuthReturn: hash gana pero search rellena lo que falte', () => {
  const r = parseOAuthReturn('#error=server_error', '?error=otro&error_code=manual_linking_disabled');
  assert.strictEqual(r.error, 'server_error', 'El hash tiene prioridad');
  assert.strictEqual(r.code, 'manual_linking_disabled', 'El search rellena el código ausente');
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
  const r = validateSignup({ name: 'Ana', email: 'ana@mail.com', password: 'Clave123' }, [], COACH);
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

test('painCareAdd: normaliza área/nivel/nota y no muta la lista original', () => {
  const orig = [];
  const l1 = painCareAdd(orig, { area: 'hombro', level: 3, exId: 'e7', exName: 'Press Militar', note: 'x'.repeat(500) }, '2026-07-07T12:00:00Z');
  assert.strictEqual(orig.length, 0);
  assert.strictEqual(l1.length, 1);
  assert.strictEqual(l1[0].area, 'hombro');
  assert.strictEqual(l1[0].level, 3);
  assert.strictEqual(l1[0].note.length, 300);
  const l2 = painCareAdd(l1, { area: 'marciano', level: 99 });
  assert.strictEqual(l2[1].area, 'otra zona');
  assert.strictEqual(l2[1].level, 3);
  const l3 = painCareAdd(l1, { area: 'rodilla', level: 0 });
  assert.strictEqual(l3[1].level, 1);
});

test('painCareAdd: tope de 20 reportes (conserva los más recientes)', () => {
  let l = [];
  for (let i = 0; i < 25; i++) l = painCareAdd(l, { area: 'rodilla', level: 1, note: 'n' + i });
  assert.strictEqual(l.length, 20);
  assert.strictEqual(l[19].note, 'n24');
});

test('painCareActive: expira a los 14 días y respeta cleared', () => {
  const now = Date.parse('2026-07-07T12:00:00Z');
  const list = [
    { area: 'hombro', at: '2026-07-06T12:00:00Z' },              // 1 día → activo
    { area: 'rodilla', at: '2026-06-20T12:00:00Z' },             // 17 días → expiró
    { area: 'codo', at: '2026-07-05T12:00:00Z', cleared: true }, // descartado por el usuario
    { area: 'cadera', at: '2026-07-13T12:00:00Z' },              // fecha futura (reloj raro) → fuera
  ];
  const act = painCareActive(list, now);
  assert.strictEqual(act.length, 1);
  assert.strictEqual(act[0].area, 'hombro');
  assert.deepStrictEqual(painCareActive(null, now), []);
});

// ── Hábitos: agua por vasos (v300) ──
test('waterGoalGlasses: meta por peso (~35ml/kg, vaso 250ml) con clamp [6..12] y fallback 8', () => {
  assert.strictEqual(waterGoalGlasses(70), 10);   // 2450ml → 9.8 → 10
  assert.strictEqual(waterGoalGlasses(50), 7);    // 1750ml → 7
  assert.strictEqual(waterGoalGlasses(30), 6);    // clamp piso
  assert.strictEqual(waterGoalGlasses(120), 12);  // clamp techo
  assert.strictEqual(waterGoalGlasses(null), 8);  // sin peso
  assert.strictEqual(waterGoalGlasses('abc'), 8); // basura
  assert.strictEqual(waterGoalGlasses(-5), 8);    // negativo
});

test('waterAdd/waterToday: suma por día local, clamp [0..30], inmutable', () => {
  const now = new Date(2026, 6, 9, 15, 0, 0); // 2026-07-09 local
  const orig = { water: { '2026-07-08': 5 } };
  const h1 = waterAdd(orig, 1, now);
  assert.strictEqual(waterToday(h1, now), 1);
  assert.strictEqual(orig.water['2026-07-09'], undefined); // no muta
  const h2 = waterAdd(waterAdd(h1, 1, now), 1, now);
  assert.strictEqual(waterToday(h2, now), 3);
  assert.strictEqual(waterToday(waterAdd(h2, -5, now), now), 0);  // piso 0
  assert.strictEqual(waterToday(waterAdd(h2, 99, now), now), 30); // techo 30
  assert.strictEqual(waterToday(null, now), 0);                    // sin datos
  assert.strictEqual(h2.water['2026-07-08'], 5); // ayer intacto (< 30 días)
});

test('waterAdd: poda entradas con más de 30 días', () => {
  const now = new Date(2026, 6, 9);
  const h = waterAdd({ water: { '2026-05-01': 8, '2026-06-20': 6 } }, 1, now);
  assert.strictEqual(h.water['2026-05-01'], undefined); // 69 días → fuera
  assert.strictEqual(h.water['2026-06-20'], 6);         // 19 días → queda
});

test('waterWeek: 7 días terminando hoy, con ceros donde no hay registro', () => {
  const now = new Date(2026, 6, 9);
  const wk = waterWeek({ water: { '2026-07-09': 4, '2026-07-06': 8 } }, now);
  assert.strictEqual(wk.length, 7);
  assert.strictEqual(wk[6].day, '2026-07-09');
  assert.strictEqual(wk[6].n, 4);
  assert.strictEqual(wk[3].n, 8);
  assert.strictEqual(wk[0].n, 0);
});

test('clampQwHiit: clamps de cordura y fallback al default del preset', () => {
  const def = { rounds: 6, work: 30, rest: 15 };
  assert.deepStrictEqual(clampQwHiit({ rounds: 8, work: 45, rest: 20 }, def), { rounds: 8, work: 45, rest: 20 });
  assert.deepStrictEqual(clampQwHiit({ rounds: 99, work: 5, rest: 999 }, def), { rounds: 20, work: 10, rest: 180 }); // clamps
  assert.deepStrictEqual(clampQwHiit({ rounds: 'abc', work: '', rest: null }, def), def); // basura → default
  assert.deepStrictEqual(clampQwHiit(null, null), { rounds: 4, work: 30, rest: 15 }); // sin nada → defaults duros
});

test('newsToShow: solo lo más nuevo que lo visto, reciente primero, tope 3', () => {
  const list = [{ v: 299, t: 'a' }, { v: 300, t: 'b' }, { v: 301, t: 'c' }, { v: 302, t: 'd' }];
  assert.deepStrictEqual(newsToShow(list, 300).map(n => n.v), [302, 301]);
  assert.deepStrictEqual(newsToShow(list, 0).map(n => n.v), [302, 301, 300]); // tope 3
  assert.deepStrictEqual(newsToShow(list, 302), []);       // al día
  assert.deepStrictEqual(newsToShow(list, 'abc').map(n => n.v), [302, 301, 300]); // basura = 0
  assert.deepStrictEqual(newsToShow(null, 0), []);
});

test('painTipFor: tip por área con fallback conservador', () => {
  assert.ok(/encima de la cabeza/.test(painTipFor('hombro')));
  assert.ok(/rango de movimiento que NO duele/.test(painTipFor('zona inventada')));
  assert.strictEqual(PAIN_AREAS.length, 10);
  assert.strictEqual(PAIN_LEVELS[2].v, 3);
});

test('passwordProblem: exige 8+ con minúscula, mayúscula y dígito (política Supabase)', () => {
  assert.strictEqual(passwordProblem('Clave123'), null);
  assert.strictEqual(passwordProblem('MiClaveSegura2026'), null);
  assert.ok(/8 caracteres/.test(passwordProblem('Cl1a')));
  assert.ok(/minúscula/.test(passwordProblem('CLAVE123')));
  assert.ok(/mayúscula/.test(passwordProblem('clave123')));
  assert.ok(/número/.test(passwordProblem('ClaveSegura')));
  assert.ok(passwordProblem(''));
  assert.ok(passwordProblem(null));
});

test('validateSignup: rechaza contraseña que no cumple la política y lo dice en español', () => {
  const r = validateSignup({ name: 'Ana', email: 'ana@mail.com', password: 'corta1' }, [], COACH);
  assert.strictEqual(r.ok, false);
  assert.ok(/8 caracteres/.test(r.error));
  assert.strictEqual(validateSignup({ name: 'Ana', email: 'ana@mail.com', password: 'Clave123' }, [], COACH).ok, true);
});

test('consentEvidence: las 3 casillas marcadas arman la evidencia con versión y fecha', () => {
  const ev = consentEvidence({ general: true, salud: true, adulto: true }, '2026-07-07', '2026-07-07T15:00:00.000Z');
  assert.deepStrictEqual(ev, { general: true, salud: true, adulto: true, v: '2026-07-07', at: '2026-07-07T15:00:00.000Z' });
});

test('consentEvidence: cualquier casilla sin marcar devuelve null (no hay "acepto todo")', () => {
  assert.strictEqual(consentEvidence({ general: true, salud: true, adulto: false }, 'v1'), null);
  assert.strictEqual(consentEvidence({ general: true, salud: false, adulto: true }, 'v1'), null);
  assert.strictEqual(consentEvidence({ general: false, salud: true, adulto: true }, 'v1'), null);
  assert.strictEqual(consentEvidence({}, 'v1'), null);
  assert.strictEqual(consentEvidence(null, 'v1'), null);
});

test('consentEvidence: sin nowIso usa la fecha actual (ISO válido)', () => {
  const ev = consentEvidence({ general: true, salud: true, adulto: true }, '2026-07-07');
  assert.ok(!isNaN(Date.parse(ev.at)), 'at es fecha ISO parseable');
  assert.strictEqual(ev.v, '2026-07-07');
});

test('flujo libre: con los datos del registro, el generador produce ≥1 rutina (principiante)', () => {
  // Simula lo que hace signupClient: registro válido → generar con sus datos.
  const data = { name: 'Sofía', email: 'sofia@mail.com', password: 'Clave123', sex: 'F', age: 40, weight: 85, height: 165, level: 'Principiante', days: 3, goal: 'Perder grasa', place: 'gym' };
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

test('clientHasCoach / clientPlan: split de 3 niveles sin quitar capacidades', () => {
  // Libre: ni premium de app ni coach.
  assert.strictEqual(clientHasCoach({ tier: 'libre' }), false);
  assert.strictEqual(clientPlan({ tier: 'libre' }), 'libre');
  // Premium app (sin coach): tiene premium de app, NO chat.
  assert.strictEqual(isFreeClient({ tier: 'app' }), false);      // sí ve premium de app
  assert.strictEqual(clientHasCoach({ tier: 'app' }), false);     // NO chat
  assert.strictEqual(clientPlan({ tier: 'app' }), 'app');
  // Premium + Coach: todo.
  assert.strictEqual(clientHasCoach({ tier: 'premium' }), true);
  assert.strictEqual(clientPlan({ tier: 'premium' }), 'coach');
  // COMPAT: cliente creado por coach SIN tier conserva el chat (no regresión).
  assert.strictEqual(clientHasCoach({}), true);
  assert.strictEqual(clientPlan({}), 'coach');
  // Nulos seguros.
  assert.strictEqual(clientHasCoach(null), false);
  assert.strictEqual(clientPlan(null), 'libre');
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
  // #6: la modalidad pasa a 'reps' → la UI NO pide KG ni sugiere peso ni permite dropset
  // (todo eso está gateado por track==='peso_reps'). Sin esto el "sin carga" era invisible.
  assert.ok(loaded.every(e => exTrack(e) === 'reps'), 'dolor debe dejar la modalidad sin carga (reps)');
});

test('MOOD_STATES: "periodo" es el único femaleOnly; ids únicos', () => {
  assert.deepStrictEqual(MOOD_STATES.filter(m => m.femaleOnly).map(m => m.id), ['periodo']);
  const ids = MOOD_STATES.map(m => m.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

// ── Capa A del Coach Inteligente: adapt.care (bienestar por ánimo, v352) ──
test('adapt.care: SIEMPRE presente (1-3 consejos) para cada estado + default', () => {
  const moods = MOOD_STATES.map(m => m.id).concat(['bien', '__desconocido__']);
  moods.forEach(mood => {
    const care = applyMood(moodRoutine(), mood, { sex: 'F' }).adapt.care;
    assert.ok(Array.isArray(care), `care no es array para "${mood}"`);
    assert.ok(care.length >= 1 && care.length <= 3, `care fuera de 1-3 para "${mood}" (${care.length})`);
    assert.ok(care.every(c => typeof c === 'string' && c.trim().length), `care con string vacío en "${mood}"`);
  });
});

test('adapt.care "dolor": empuja a PARAR, no a aguantar (límite de seguridad)', () => {
  const care = applyMood(moodRoutine(), 'dolor', {}).adapt.care;
  assert.ok(care.some(c => /\bpara\b/i.test(c)), 'el consejo de dolor debe decir que pare');
});

test('adapt.care: no rompe changes/flagCoach existentes (no regresión)', () => {
  const cansado = applyMood(moodRoutine(), 'cansado', {}).adapt;
  assert.ok(cansado.changes.length >= 2, 'cansado conserva sus chips de ajuste');
  assert.strictEqual(cansado.flagCoach, false);
  const dolor = applyMood(moodRoutine(), 'dolor', {}).adapt;
  assert.strictEqual(dolor.flagCoach, true);
  assert.ok(dolor.changes.some(c => /coach/i.test(c)), 'dolor conserva el aviso al coach');
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
test('MS.getStatus: acepta `now` explícito (determinista) sin romper a los viejos', () => {
  const c = { payments: [{ dueDate: '2026-07-15T00:00:00Z' }] };
  assert.strictEqual(MS.getStatus(c, '2026-07-01T00:00:00Z'), 'active');   // faltan 14 días
  assert.strictEqual(MS.getStatus(c, '2026-07-10T00:00:00Z'), 'expiring'); // faltan 5 días
  assert.strictEqual(MS.getStatus(c, '2026-07-20T00:00:00Z'), 'overdue');  // venció
});

// ══════════════════════════════════════════════════════
section('Orden inteligente de asesorados (clientAttentionRank / sortClientsByAttention)');

const _RNOW = '2026-07-11T12:00:00Z';
const _rDay = n => new Date(Date.parse(_RNOW) + n * 86400000).toISOString();
// cliente al día, entrenó hoy → tier 4 "ok" (base para clonar en los casos)
const _mkClient = (over) => Object.assign({
  id: 'x', name: 'Zoe', createdAt: _rDay(-60), routines: [{ id: 'r1' }],
  payments: [{ dueDate: _rDay(20) }], painCare: [],
}, over || {});

test('rank tier 0: dolor vigente gana a todo; nivel 3 sube la severidad', () => {
  const hist = { x: [{ date: _rDay(-30) }] };            // además inactivo y…
  const c = _mkClient({ payments: [{ dueDate: _rDay(-10) }], // …vencido
    painCare: [{ level: 3, at: _rDay(-1) }] });
  const r = clientAttentionRank(c, hist, _RNOW);
  assert.strictEqual(r.tier, 0);
  assert.strictEqual(r.reason, 'pain');
  assert.strictEqual(r.sev, 3);
  assert.match(r.label, /impide/);
});
test('rank: dolor expirado (>14 días) NO cuenta', () => {
  const c = _mkClient({ painCare: [{ level: 2, at: _rDay(-20) }] });
  assert.strictEqual(clientAttentionRank(c, { x: [{ date: _rDay(-1) }] }, _RNOW).reason, 'ok');
});
test('rank tier 1/2: plan vencido y por vencer', () => {
  const hist = { x: [{ date: _rDay(-1) }] };
  assert.strictEqual(clientAttentionRank(_mkClient({ payments: [{ dueDate: _rDay(-3) }] }), hist, _RNOW).reason, 'overdue');
  assert.strictEqual(clientAttentionRank(_mkClient({ payments: [{ dueDate: _rDay(4) }] }), hist, _RNOW).reason, 'expiring');
});
test('rank tier 3: dejó de entrenar (≥7 días) → idle con nº de días en sev', () => {
  const r = clientAttentionRank(_mkClient(), { x: [{ date: _rDay(-9) }] }, _RNOW);
  assert.strictEqual(r.tier, 3);
  assert.strictEqual(r.reason, 'idle');
  assert.strictEqual(r.sev, 9);
  assert.match(r.label, /9 días/);
});
test('rank: entrenó hace <7 días → al día (no molesta al coach)', () => {
  assert.strictEqual(clientAttentionRank(_mkClient(), { x: [{ date: _rDay(-3) }] }, _RNOW).reason, 'ok');
});
test('rank: SUSPENDIDO va al fondo sin chip, aunque no entrene o tenga dolor (Lucas v317)', () => {
  // suspendido + inactivo 30 días → NO "sin entrenar"; tier 5 = el fondo (debajo del sano tier 4)
  const s1 = clientAttentionRank(_mkClient({ suspended: true }), { x: [{ date: _rDay(-30) }] }, _RNOW);
  assert.strictEqual(s1.tier, 5);
  assert.strictEqual(s1.reason, 'ok');
  assert.strictEqual(s1.label, '');
  // suspendido + dolor nivel 3 → tampoco salta al tope
  const s2 = clientAttentionRank(_mkClient({ suspended: true, painCare: [{ level: 3, at: _rDay(-1) }] }), {}, _RNOW);
  assert.strictEqual(s2.tier, 5);
  assert.strictEqual(s2.reason, 'ok');
});
test('rank: "aún no estrena" SOLO si lleva ≥7 días Y tiene rutinas', () => {
  const noHist = {};
  // recién creado (2 días) con rutinas → NO molesta todavía
  assert.strictEqual(clientAttentionRank(_mkClient({ createdAt: _rDay(-2) }), noHist, _RNOW).reason, 'ok');
  // veterano sin rutinas → no es "aún no estrena" (el estado "sin rutinas" ya lo grita)
  assert.strictEqual(clientAttentionRank(_mkClient({ createdAt: _rDay(-30), routines: [] }), noHist, _RNOW).reason, 'ok');
  // veterano con rutinas y sin una sola sesión → sí
  assert.strictEqual(clientAttentionRank(_mkClient({ createdAt: _rDay(-30) }), noHist, _RNOW).reason, 'nostart');
});
test('sortClientsByAttention: orden por urgencia y desempate estable por nombre', () => {
  const clients = [
    { id: 'ok', name: 'Ana', createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(20) }] },
    { id: 'pain', name: 'Beto', createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(20) }], painCare: [{ level: 1, at: _rDay(-1) }] },
    { id: 'idleA', name: 'Yara', createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(20) }] },
    { id: 'idleB', name: 'Aaron', createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(20) }] },
    { id: 'due', name: 'Carla', createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(-2) }] },
  ];
  const hist = { ok: [{ date: _rDay(-1) }], pain: [{ date: _rDay(-1) }], due: [{ date: _rDay(-1) }],
                 idleA: [{ date: _rDay(-10) }], idleB: [{ date: _rDay(-10) }] };
  const order = sortClientsByAttention(clients, hist, _RNOW).map(x => x.c.id);
  // dolor → vencido → inactivos (empatados en días: desempate por nombre Aaron<Yara) → al día
  assert.deepStrictEqual(order, ['pain', 'due', 'idleB', 'idleA', 'ok']);
});
// ══════════════════════════════════════════════════════
section('Tarjeta de notificaciones (pushNudgeDecision)');

const _PN_NOW = '2026-07-11T12:00:00Z';
test('pushNudgeDecision: granted → oculta', () => {
  assert.strictEqual(pushNudgeDecision('granted', 0, _PN_NOW), 'hidden');
});
test('pushNudgeDecision: denied → denied (instrucciones, sin botón inútil)', () => {
  assert.strictEqual(pushNudgeDecision('denied', 0, _PN_NOW), 'denied');
});
test('pushNudgeDecision: default sin snooze → ask', () => {
  assert.strictEqual(pushNudgeDecision('default', 0, _PN_NOW), 'ask');
  assert.strictEqual(pushNudgeDecision('default', null, _PN_NOW), 'ask');
});
test('pushNudgeDecision: default con snooze vigente (<7d) → hidden; vencido → ask', () => {
  const now = Date.parse(_PN_NOW);
  assert.strictEqual(pushNudgeDecision('default', now - 3 * 86400000, now), 'hidden'); // snooze de hace 3d
  assert.strictEqual(pushNudgeDecision('default', now - 8 * 86400000, now), 'ask');    // snooze vencido
});
test('pushNudgeDecision: snoozeDays configurable', () => {
  const now = Date.parse(_PN_NOW);
  assert.strictEqual(pushNudgeDecision('default', now - 2 * 86400000, now, 1), 'ask'); // ventana de 1 día ya venció
});

test('sortClientsByAttention: NO muta el arreglo original', () => {
  const clients = [{ id: 'a', name: 'B', createdAt: _rDay(-60), routines: [], payments: [] },
                   { id: 'b', name: 'A', createdAt: _rDay(-60), routines: [], payments: [] }];
  const before = clients.map(c => c.id);
  sortClientsByAttention(clients, {}, _RNOW);
  assert.deepStrictEqual(clients.map(c => c.id), before);
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
section('Gamificación (nivel permanente)');

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

// (gxDiscount/gxNextTier ELIMINADAS 2026-07-06 — decisión de Camilo: el descuento por
// adherencia tuvo poca recepción; se retiró todo rastro. El nivel y los logros siguen.)

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
section('Racha y adherencia (longestStreak / adherenceMonth)');

test('longestStreak: vacío → 0, un día → 1', () => {
  assert.strictEqual(longestStreak([]), 0);
  assert.strictEqual(longestStreak(null), 0);
  assert.strictEqual(longestStreak([{ date: '2026-05-10T12:00' }]), 1);
});
test('longestStreak: 3 días consecutivos → 3', () => {
  assert.strictEqual(longestStreak([
    { date: '2026-05-10T12:00' }, { date: '2026-05-11T12:00' }, { date: '2026-05-12T12:00' },
  ]), 3);
});
test('longestStreak: dos rachas (3 y 2) → toma la más larga', () => {
  assert.strictEqual(longestStreak([
    { date: '2026-05-08T12:00' }, { date: '2026-05-09T12:00' }, { date: '2026-05-10T12:00' },
    { date: '2026-05-12T12:00' }, { date: '2026-05-13T12:00' },
  ]), 3);
});
test('longestStreak: mismo día varias veces cuenta 1', () => {
  assert.strictEqual(longestStreak([
    { date: '2026-05-10T07:00' }, { date: '2026-05-10T20:00' },
  ]), 1);
});

test('adherenceMonth: cuenta días entrenados del mes y arma la grilla', () => {
  const now = new Date('2026-05-15T12:00');
  const sess = [
    { date: '2026-05-01T12:00' }, { date: '2026-05-02T12:00' },
    { date: '2026-05-15T08:00' }, { date: '2026-05-15T20:00' }, // dos el día 15 = 1 día
    { date: '2026-04-30T12:00' }, // mes anterior, no cuenta
  ];
  const r = adherenceMonth(sess, now);
  assert.strictEqual(r.month, 4);            // mayo = índice 4
  assert.strictEqual(r.trainedDays, 3);      // 1, 2 y 15
  r.weeks.forEach(w => assert.strictEqual(w.length, 7));
  const cells = r.weeks.flat().filter(c => c.inMonth);
  assert.strictEqual(cells.length, 31);      // mayo tiene 31 días
  const d15 = cells.find(c => c.day === 15);
  assert.deepStrictEqual([d15.trained, d15.count, d15.isToday], [true, 2, true]);
  const d16 = cells.find(c => c.day === 16);
  assert.deepStrictEqual([d16.trained, d16.isFuture], [false, true]);
  assert.strictEqual(cells.find(c => c.day === 1).trained, true);
  assert.strictEqual(cells.find(c => c.day === 3).trained, false);
});
test('adherenceMonth: sin sesiones → grilla del mes con 0 entrenados', () => {
  const r = adherenceMonth([], new Date('2026-05-15T12:00'));
  assert.strictEqual(r.trainedDays, 0);
  assert.strictEqual(r.weeks.flat().filter(c => c.inMonth).length, 31);
});

// ══════════════════════════════════════════════════════
section('Estadísticas avanzadas (muscleVolume / pushPullBalance)');

// Helper: sesión con N series completadas de un grupo muscular.
const _sess = (date, ...exs) => ({
  date,
  exercises: exs.map(([muscle, done, total]) => ({
    muscle,
    sets: Array.from({ length: total != null ? total : done }, (_, i) => ({ kg: '50', reps: '10', done: i < done })),
  })),
});

test('muscleVolume: cuenta SOLO series completadas (done), por grupo', () => {
  const now = new Date('2026-05-15T12:00');
  const r = muscleVolume([
    _sess('2026-05-14T10:00', ['pecho', 3], ['espalda', 2, 4]), // espalda: 2 done de 4
  ], 7, now);
  assert.strictEqual(r.totalSets, 5);
  assert.strictEqual(r.groups.find(g => g.group === 'pecho').sets, 3);
  assert.strictEqual(r.groups.find(g => g.group === 'espalda').sets, 2);
});

test('muscleVolume: respeta la ventana de días (cutoff)', () => {
  const now = new Date('2026-05-15T12:00');
  const sess = [
    _sess('2026-05-14T10:00', ['pecho', 3]), // dentro de 7 días
    _sess('2026-05-01T10:00', ['pecho', 5]), // fuera de 7 días
  ];
  assert.strictEqual(muscleVolume(sess, 7, now).totalSets, 3);
  assert.strictEqual(muscleVolume(sess, 30, now).totalSets, 8);
});

test('muscleVolume: agrupa por categoría (empuje/tracción/piernas/core)', () => {
  const now = new Date('2026-05-15T12:00');
  const r = muscleVolume([
    _sess('2026-05-14T10:00', ['pecho', 3], ['triceps', 2], ['espalda', 4], ['biceps', 1], ['piernas', 5], ['core', 2]),
  ], 7, now);
  assert.strictEqual(r.byCat.empuje, 5);    // pecho 3 + triceps 2
  assert.strictEqual(r.byCat.traccion, 5);  // espalda 4 + biceps 1
  assert.strictEqual(r.byCat.piernas, 5);
  assert.strictEqual(r.byCat.core, 2);
});

test('muscleVolume: grupos ordenados desc por series, con % y etiqueta', () => {
  const now = new Date('2026-05-15T12:00');
  const r = muscleVolume([
    _sess('2026-05-14T10:00', ['espalda', 6], ['pecho', 2], ['biceps', 2]),
  ], 7, now);
  assert.strictEqual(r.groups[0].group, 'espalda');
  assert.strictEqual(r.groups[0].label, 'Espalda');
  assert.strictEqual(r.groups[0].pct, 60); // 6 de 10
  assert.strictEqual(r.totalSets, 10);
});

test('muscleVolume: sin sesiones / sin series done → vacío seguro', () => {
  const now = new Date('2026-05-15T12:00');
  assert.strictEqual(muscleVolume([], 7, now).totalSets, 0);
  assert.strictEqual(muscleVolume(null, 7, now).groups.length, 0);
  const r = muscleVolume([_sess('2026-05-14T10:00', ['pecho', 0, 3])], 7, now); // 0 done de 3
  assert.strictEqual(r.totalSets, 0);
  assert.strictEqual(r.sessions, 0);
});

test('pushPullBalance: empuje y tracción parejos → equilibrado', () => {
  const r = pushPullBalance({ empuje: 10, traccion: 10 });
  assert.strictEqual(r.verdict, 'equilibrado');
  assert.strictEqual(r.pushPct, 50);
  assert.strictEqual(r.pullPct, 50);
});

test('pushPullBalance: mucho empuje, poca tracción → mas-empuje', () => {
  const r = pushPullBalance({ empuje: 12, traccion: 4 });
  assert.strictEqual(r.verdict, 'mas-empuje');
  assert.strictEqual(r.pushPct, 75);
});

test('pushPullBalance: más tracción que empuje → mas-traccion', () => {
  const r = pushPullBalance({ empuje: 3, traccion: 12 });
  assert.strictEqual(r.verdict, 'mas-traccion');
});

test('pushPullBalance: sin datos → verdict sin-datos, no rompe', () => {
  const r = pushPullBalance({ empuje: 0, traccion: 0 });
  assert.strictEqual(r.verdict, 'sin-datos');
  assert.strictEqual(r.ratio, null);
  assert.strictEqual(pushPullBalance(null).verdict, 'sin-datos');
});

// ══════════════════════════════════════════════════════
section('Subgrupos musculares (submuscleVolume)');

// getSubregions falso: ejercicio → subregiones primarias (como MM_EX[id].p).
const _subs = {
  'Sentadilla': ['quads', 'gluteus-maximus'],   // glúteo es de OTRO grupo
  'Prensa': ['quads', 'gluteus-maximus'],
  'Curl femoral': ['hamstrings'],
  'Aductor en máquina': ['adductors'],
  'Hip thrust': ['gluteus-maximus'],
};
const _getSub = ex => _subs[ex.name] || [];
const _sm = (date, ...exs) => ({ date, exercises: exs.map(([muscle, name, done]) => ({ muscle, name, sets: Array.from({ length: done }, () => ({ done: true })) })) });

test('submuscleVolume: desglosa Piernas en sus subregiones (cuádriceps/femoral/aductores)', () => {
  const now = new Date('2026-05-15T12:00');
  const r = submuscleVolume([
    _sm('2026-05-14T10:00', ['piernas', 'Sentadilla', 3], ['piernas', 'Curl femoral', 2], ['piernas', 'Aductor en máquina', 2]),
  ], 'piernas', 7, now, _getSub);
  const m = Object.fromEntries(r.map(x => [x.label, x.sets]));
  assert.strictEqual(m['Cuádriceps'], 3);
  assert.strictEqual(m['Femoral'], 2);
  assert.strictEqual(m['Aductores'], 2);
  assert.strictEqual(m['Glúteo mayor'], undefined); // glúteo NO entra bajo Piernas
});

test('submuscleVolume: el glúteo de la sentadilla va bajo Glúteos, no Piernas', () => {
  const now = new Date('2026-05-15T12:00');
  const piernas = submuscleVolume([_sm('2026-05-14T10:00', ['piernas', 'Sentadilla', 4])], 'piernas', 7, now, _getSub);
  assert.deepStrictEqual(piernas, [{ label: 'Cuádriceps', sets: 4 }]);
  const gluteo = submuscleVolume([_sm('2026-05-14T10:00', ['gluteo', 'Hip thrust', 3])], 'gluteo', 7, now, _getSub);
  assert.deepStrictEqual(gluteo, [{ label: 'Glúteo mayor', sets: 3 }]);
});

test('submuscleVolume: respeta ventana y solo el grupo pedido; sin resolver → General', () => {
  const now = new Date('2026-05-15T12:00');
  const sess = [
    _sm('2026-05-14T10:00', ['piernas', 'Sentadilla', 3], ['pecho', 'Press', 5]), // pecho ignorado
    _sm('2026-05-01T10:00', ['piernas', 'Curl femoral', 9]), // fuera de ventana
  ];
  const r = submuscleVolume(sess, 'piernas', 7, now, _getSub);
  assert.deepStrictEqual(r, [{ label: 'Cuádriceps', sets: 3 }]);
  // ejercicio cuyo nombre no resuelve subregiones → General
  const g = submuscleVolume([_sm('2026-05-14T10:00', ['piernas', 'Ejercicio raro', 2])], 'piernas', 7, now, _getSub);
  assert.deepStrictEqual(g, [{ label: 'General', sets: 2 }]);
});

// ══════════════════════════════════════════════════════
section('Calculadora nutricional (nutritionEstimate)');

test('nutritionEstimate: compone TMB→TDEE→objetivo→macros (ganar músculo)', () => {
  const c = { weight: 80, height: 180, age: 30, sex: 'M', activityFactor: 1.55, goal: 'Ganar músculo' };
  const e = nutritionEstimate(c);
  assert.strictEqual(e.tmb, 1780);                 // 10·80 + 6.25·180 − 5·30 + 5
  assert.strictEqual(e.tdee, Math.round(1780 * 1.55));
  assert.strictEqual(e.kcalObj, e.tdee + 350);     // superávit por ganar músculo
  assert.strictEqual(e.macros.prot_g, 176);        // 2.2 · 80
  assert.strictEqual(e.macros.fat_g, 72);          // 0.9 · 80
  assert.ok(e.water > 0);
});
test('nutritionEstimate: perder grasa → déficit (kcal < TDEE)', () => {
  const c = { weight: 70, height: 175, age: 25, sex: 'F', goal: 'Perder grasa' };
  const e = nutritionEstimate(c);
  assert.strictEqual(e.af, 1.55);                  // default cuando no hay activityFactor
  assert.ok(e.kcalObj < e.tdee);
});
test('nutritionEstimate: weightKg pasado manda sobre client.weight', () => {
  const c = { weight: 70, height: 175, age: 25, sex: 'F', goal: 'Mantenimiento' };
  const e = nutritionEstimate(c, 60);
  assert.strictEqual(e.tmb, Math.round(10 * 60 + 6.25 * 175 - 5 * 25 - 161));
});
test('nutritionEstimate: faltan datos → null', () => {
  assert.strictEqual(nutritionEstimate({ weight: 80, height: 180 }), null); // sin edad/sexo
  assert.strictEqual(nutritionEstimate(null), null);
  // #10 auditoría 2026-06-30: sexo OBLIGATORIO. Con todo menos sexo → null (no calibrar como
  // mujer en silencio). La UI pide completar el sexo en vez de mostrar kcal mal estimadas.
  assert.strictEqual(nutritionEstimate({ weight: 80, height: 180, age: 30, activityFactor: 1.55, goal: 'Ganar músculo' }), null);
  assert.ok(nutritionEstimate({ weight: 80, height: 180, age: 30, sex: 'M', goal: 'Ganar músculo' }), 'con sexo sí estima');
});

section('Reparto del día en comidas (nutMealSplit)');

test('nutMealSplit: default 4 comidas, kcal reparten ~100%, proteína en partes iguales', () => {
  const s = nutMealSplit(2000, 160);
  assert.strictEqual(s.length, 4);
  assert.strictEqual(s.reduce((t, m) => t + m.kcal, 0), 2000); // pesos suman 1.0 → sin redondeo perdido
  assert.ok(s.every(m => m.prot === 40)); // 160/4 igual en todas
});
test('nutMealSplit: respeta el nº de comidas pedido y lo acota a 2–6', () => {
  assert.strictEqual(nutMealSplit(2000, 160, 3).length, 3);
  assert.strictEqual(nutMealSplit(2000, 160, 6).length, 6);
  assert.strictEqual(nutMealSplit(2000, 160, 9).length, 6); // clamp arriba
  assert.strictEqual(nutMealSplit(2000, 160, 1).length, 2); // clamp abajo
});
test('nutMealSplit: sin kcal/proteína → ceros sin romper', () => {
  const s = nutMealSplit(0, 0, 4);
  assert.ok(s.every(m => m.kcal === 0 && m.prot === 0));
});

// ══════════════════════════════════════════════════════
section('Racha semanal (planDays / weekStreak / longestWeekStreak)');

// Ref: 2026-07-06 es LUNES. Semanas: 06-15 (L) … 06-21 (D) · 06-22…06-28 · 06-29…07-05 · 07-06…
const WS_NOW = '2026-07-08T10:00:00'; // miércoles de la semana del 07-06
const wsDay = d => ({ date: d + 'T07:00:00', doneSets: 3, totalVol: 100 });

test('planDays: rutinas con día real mandan; fallback a client.days; clamp 1–7', () => {
  assert.strictEqual(planDays({ days: 5, routines: [{ day: 'Lunes' }, { day: 'Jueves' }, { day: 'Libre' }] }), 2);
  assert.strictEqual(planDays({ days: 4, routines: [] }), 4);
  assert.strictEqual(planDays({}), 3);
  assert.strictEqual(planDays({ days: 99 }), 7);
});

test('weekStreak: 3/sem con 2 semanas cumplidas + la actual a medias → racha 2, NO se rompe', () => {
  const s = ['2026-06-22', '2026-06-24', '2026-06-26', '2026-06-29', '2026-07-01', '2026-07-03', '2026-07-06'].map(wsDay);
  const r = weekStreak(s, 3, WS_NOW);
  assert.strictEqual(r.weeks, 2);
  assert.strictEqual(r.thisWeekDays, 1);
  assert.strictEqual(r.metThisWeek, false);
});

test('weekStreak: la semana actual ya cumplida extiende la racha', () => {
  const s = ['2026-06-29', '2026-07-01', '2026-07-03', '2026-07-06', '2026-07-07', '2026-07-08'].map(wsDay);
  const r = weekStreak(s, 3, WS_NOW);
  assert.strictEqual(r.weeks, 2);
  assert.strictEqual(r.metThisWeek, true);
});

test('weekStreak: semana pasada fallada → racha 0 aunque haya historia vieja', () => {
  const s = ['2026-06-15', '2026-06-17', '2026-06-19', '2026-06-29'].map(wsDay); // la del 06-29 solo tuvo 1 día
  assert.strictEqual(weekStreak(s, 3, WS_NOW).weeks, 0);
});

test('weekStreak: varias sesiones el mismo día cuentan 1 día', () => {
  const s = [wsDay('2026-06-29'), wsDay('2026-06-29'), wsDay('2026-07-01'), wsDay('2026-07-03')];
  const r = weekStreak(s, 3, WS_NOW);
  assert.strictEqual(r.weeks, 1); // 3 días únicos esa semana, no 4 sesiones
});

test('weekStreak: sin sesiones → todo en cero', () => {
  const r = weekStreak([], 3, WS_NOW);
  assert.strictEqual(r.weeks, 0);
  assert.strictEqual(r.thisWeekDays, 0);
});

test('longestWeekStreak: récord histórico con hueco en el medio', () => {
  const s = [
    '2026-05-04', '2026-05-06', '2026-05-08',   // semana cumplida
    '2026-05-11', '2026-05-13', '2026-05-15',   // cumplida (racha 2)
    // 2026-05-18: semana fallada (0 días)
    '2026-05-25', '2026-05-27', '2026-05-29',   // cumplida (racha 1)
  ].map(wsDay);
  assert.strictEqual(longestWeekStreak(s, 3), 2);
});

// ══════════════════════════════════════════════════════
section('Coach Inteligente — motor coachInsight (Capa B, v352)');

const CI_NOW = new Date('2026-07-08T10:00:00').getTime();
const ciDay = (offsetDays, exercises) => ({
  date: new Date(CI_NOW - offsetDays * 86400000).toISOString(),
  exercises: exercises || [],
});
// Un ejercicio de carga con una serie hecha (para computeExerciseProgress).
const ciEx = (name, kg) => ({ name, track: 'peso_reps', sets: [{ done: true, kg: String(kg), reps: '8' }] });
// Ejercicio sin carga (no cuenta para estancamiento kg).
const ciBW = name => ({ name, track: 'reps', sets: [{ done: true, reps: '15' }] });

test('coachInsight: sin argumentos → null (no lanza)', () => {
  assert.strictEqual(coachInsight(), null);
});

test('coachInsight "inactivo": ≥4 días sin entrenar dispara; 3 días no', () => {
  const c = { level: 'Intermedio', days: 3 };
  const seis = coachInsight(c, [ciDay(6, [ciBW('Sentadilla')])], {}, CI_NOW, {});
  assert.ok(seis && seis.type === 'inactivo', 'a 6 días debe extrañar');
  assert.ok(/6 días/.test(seis.msg));
  const tres = coachInsight(c, [ciDay(3, [ciBW('Sentadilla')])], {}, CI_NOW, {});
  assert.strictEqual(tres, null, 'a 3 días no dispara nada');
});

test('coachInsight "record": PR en 48h dispara con el nombre; PR viejo no', () => {
  const c = { level: 'Intermedio', days: 3 };
  const recent = [ciDay(0, [ciBW('Press')])]; // entrenó hoy → no inactivo
  const prNuevo = { k1: { val: 120, unit: 'kg', name: 'Sentadilla', date: new Date(CI_NOW - 3600000).toISOString() } };
  const rec = coachInsight(c, recent, prNuevo, CI_NOW, {});
  assert.ok(rec && rec.type === 'record');
  assert.ok(/Sentadilla/.test(rec.title) && /120 kg/.test(rec.msg));
  const prViejo = { k1: { val: 120, unit: 'kg', name: 'Sentadilla', date: new Date(CI_NOW - 3 * 86400000).toISOString() } };
  assert.strictEqual(coachInsight(c, recent, prViejo, CI_NOW, {}), null, 'PR de 3 días atrás no es reciente');
});

test('coachInsight "racha": ≥2 semanas de plan cumplidas dispara', () => {
  const c = { level: 'Intermedio', days: 2 };
  // 3 semanas con 2 días cada una, sin carga (para no gatillar estancado), terminando esta semana.
  const s = [
    ciDay(0, [ciBW('A')]), ciDay(2, [ciBW('A')]),        // esta semana (07-06,07-08→ 2 días)
    ciDay(7, [ciBW('A')]), ciDay(9, [ciBW('A')]),        // semana pasada
    ciDay(14, [ciBW('A')]), ciDay(16, [ciBW('A')]),      // 2 semanas atrás
  ];
  const r = coachInsight(c, s, {}, CI_NOW, {});
  assert.ok(r && r.type === 'racha', 'debe celebrar la racha');
  assert.ok(/semanas/.test(r.title));
});

test('coachInsight "estancado": premium sí, free no (gating)', () => {
  const c = { level: 'Intermedio', days: 7 }; // days 7 → weekStreak no llega a 2 (evita racha)
  // 6 sesiones de 'Press' en kg: los últimos 4 no superan el máx previo (62).
  const kgs = [60, 62, 62, 60, 61, 62];
  const s = kgs.map((kg, i) => ciDay(i, [ciEx('Press', kg)])); // i=0 es hoy → no inactivo
  const prem = coachInsight(c, s, {}, CI_NOW, { isFree: false });
  assert.ok(prem && prem.type === 'estancado', 'premium ve el estancamiento');
  assert.ok(/Press/.test(prem.title));
  assert.ok(prem.cta && prem.cta.action === 'msgs');
  const free = coachInsight(c, s, {}, CI_NOW, { isFree: true });
  assert.ok(!free || free.type !== 'estancado', 'free NO ve el estancamiento');
});

test('coachInsight "estancado": 5 puntos (< mínimo) no dispara', () => {
  const c = { level: 'Intermedio', days: 7 };
  const s = [62, 62, 61, 60, 62].map((kg, i) => ciDay(i, [ciEx('Press', kg)]));
  const r = coachInsight(c, s, {}, CI_NOW, { isFree: false });
  assert.ok(!r || r.type !== 'estancado', 'con 5 puntos no evalúa estancamiento');
});

test('coachInsight "adaptacion": principiante nuevo con ≥1 sesión; intermedio no', () => {
  const nuevo = { level: 'Principiante', days: 3, createdAt: new Date(CI_NOW - 5 * 86400000).toISOString() };
  const r = coachInsight(nuevo, [ciDay(0, [ciBW('A')])], {}, CI_NOW, {});
  assert.ok(r && r.type === 'adaptacion');
  const inter = { level: 'Intermedio', days: 3, createdAt: new Date(CI_NOW - 5 * 86400000).toISOString() };
  const r2 = coachInsight(inter, [ciDay(0, [ciBW('A')])], {}, CI_NOW, {});
  assert.ok(!r2 || r2.type !== 'adaptacion');
});

test('coachInsight prioridad: inactivo > record; record > racha', () => {
  const c = { level: 'Intermedio', days: 2 };
  // inactivo (6 días) + record (PR reciente) → gana inactivo
  const pr = { k1: { val: 100, unit: 'kg', name: 'X', date: new Date(CI_NOW - 3600000).toISOString() } };
  const a = coachInsight(c, [ciDay(6, [ciBW('A')])], pr, CI_NOW, {});
  assert.strictEqual(a.type, 'inactivo');
  // record + racha (sesiones recientes formando racha) → gana record
  const s = [ciDay(0, [ciBW('A')]), ciDay(2, [ciBW('A')]), ciDay(7, [ciBW('A')]), ciDay(9, [ciBW('A')]), ciDay(14, [ciBW('A')]), ciDay(16, [ciBW('A')])];
  const b = coachInsight(c, s, pr, CI_NOW, {});
  assert.strictEqual(b.type, 'record');
});

test('coachInsight muted: si el de mayor prioridad está silenciado, cae al siguiente', () => {
  const c = { level: 'Intermedio', days: 2 };
  const pr = { k1: { val: 100, unit: 'kg', name: 'X', date: new Date(CI_NOW - 3600000).toISOString() } };
  const sessions = [ciDay(6, [ciBW('A')])]; // inactivo + record
  const r = coachInsight(c, sessions, pr, CI_NOW, { muted: { inactivo: CI_NOW + 86400000 } });
  assert.strictEqual(r.type, 'record', 'con inactivo silenciado gana record');
  // mute vencido (en el pasado) → inactivo vuelve
  const r2 = coachInsight(c, sessions, pr, CI_NOW, { muted: { inactivo: CI_NOW - 1000 } });
  assert.strictEqual(r2.type, 'inactivo');
});

test('coachInsight: historial vacío + sin datos → null', () => {
  assert.strictEqual(coachInsight({ level: 'Intermedio', days: 3 }, [], {}, CI_NOW, {}), null);
});

// ── Fase 3: señales nuevas (deload / agua / peso) + hardening (v353) ──
const ciWaterKey = off => { const d = new Date(CI_NOW - off * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// 4 semanas de plan cumplidas (days:2 → target 2): esta semana + 3 previas, 2 días c/u.
const ci4weeks = [0, 2, 7, 9, 14, 16, 21, 23].map(o => ciDay(o, [ciBW('A')]));

test('coachInsight "deload": ≥4 semanas premium dispara; 3 → racha; free → racha', () => {
  const c = { level: 'Intermedio', days: 2 };
  const r = coachInsight(c, ci4weeks, {}, CI_NOW, { isFree: false });
  assert.ok(r && r.type === 'deload', 'a 4 semanas premium sugiere descarga');
  assert.ok(r.cta && r.cta.action === 'msgs');
  const s3 = [0, 2, 7, 9, 14, 16].map(o => ciDay(o, [ciBW('A')]));
  assert.strictEqual(coachInsight(c, s3, {}, CI_NOW, { isFree: false }).type, 'racha', '3 semanas → racha, no deload');
  assert.strictEqual(coachInsight(c, ci4weeks, {}, CI_NOW, { isFree: true }).type, 'racha', 'free no ve deload');
});

test('coachInsight "agua": ≥3 días registrados y casi nunca cumple → dispara; 2 días → NO (anti-regaño)', () => {
  const hoySesion = [ciDay(0, [ciBW('A')])]; // entrenó hoy → sin inactivo
  const mk = (offs, n) => { const w = {}; offs.forEach(o => w[ciWaterKey(o)] = n); return { level: 'Intermedio', days: 3, habits: { water: w } }; };
  const r = coachInsight(mk([1, 2, 3, 4], 3), hoySesion, {}, CI_NOW, { waterGoal: 8 });
  assert.ok(r && r.type === 'agua', 'con 4 días flojos dispara agua');
  assert.strictEqual(coachInsight(mk([1, 2], 3), hoySesion, {}, CI_NOW, { waterGoal: 8 }), null, '2 días registrados NO dispara');
  assert.ok((coachInsight(mk([1, 2, 3, 4], 8), hoySesion, {}, CI_NOW, { waterGoal: 8 }) || {}).type !== 'agua', 'si cumple todos los días no regaña');
});

test('coachInsight "peso": objetivo bajar + pérdida → celebra; subida (contrario) → JAMÁS mensaje', () => {
  const sess = [ciDay(0, [ciBW('A')])];
  const bwDown = [{ date: new Date(CI_NOW - 30 * 86400000).toISOString(), kg: 80 }, { date: new Date(CI_NOW - 15 * 86400000).toISOString(), kg: 79 }, { date: new Date(CI_NOW - 86400000).toISOString(), kg: 78.8 }];
  const c = { level: 'Intermedio', days: 3, goal: 'perder grasa' };
  const r = coachInsight(c, sess, {}, CI_NOW, { bw: bwDown });
  assert.ok(r && r.type === 'peso' && /1\.2 kg/.test(r.msg), r && r.msg);
  const bwUp = [{ date: new Date(CI_NOW - 30 * 86400000).toISOString(), kg: 78 }, { date: new Date(CI_NOW - 15 * 86400000).toISOString(), kg: 79 }, { date: new Date(CI_NOW - 86400000).toISOString(), kg: 79.2 }];
  assert.ok((coachInsight(c, sess, {}, CI_NOW, { bw: bwUp }) || {}).type !== 'peso', 'subir con objetivo de bajar NO emite nada');
  assert.ok((coachInsight({ level: 'Intermedio', days: 3, goal: 'recomposición' }, sess, {}, CI_NOW, { bw: bwDown }) || {}).type !== 'peso', 'recomp no dispara');
  assert.ok((coachInsight(c, sess, {}, CI_NOW, { bw: bwDown.slice(0, 2) }) || {}).type !== 'peso', '2 registros no basta');
  assert.ok((coachInsight(c, sess, {}, CI_NOW, {}) || {}).type !== 'peso', 'sin bw no dispara');
});

test('coachInsight récord legacy: PR con solo kg (sin val) → msg con el número, no "undefined"', () => {
  const prs = { k: { kg: 100, unit: 'kg', name: 'Peso Muerto', date: new Date(CI_NOW - 3600000).toISOString() } };
  const r = coachInsight({ level: 'Intermedio', days: 3 }, [ciDay(0, [ciBW('A')])], prs, CI_NOW, {});
  assert.ok(r && r.type === 'record' && /100 kg/.test(r.msg) && !/undefined/.test(r.msg), r && r.msg);
});

test('coachInsight prioridad v353: deload > record; peso > agua', () => {
  const c = { level: 'Intermedio', days: 2 };
  const pr = { k: { val: 100, unit: 'kg', name: 'X', date: new Date(CI_NOW - 3600000).toISOString() } };
  assert.strictEqual(coachInsight(c, ci4weeks, pr, CI_NOW, { isFree: false }).type, 'deload', 'deload gana a record');
  const w = {}; [1, 2, 3, 4].forEach(o => w[ciWaterKey(o)] = 2);
  const cp = { level: 'Intermedio', days: 3, goal: 'perder grasa', habits: { water: w } };
  const bw = [{ date: new Date(CI_NOW - 30 * 86400000).toISOString(), kg: 80 }, { date: new Date(CI_NOW - 15 * 86400000).toISOString(), kg: 79 }, { date: new Date(CI_NOW - 86400000).toISOString(), kg: 78.5 }];
  assert.strictEqual(coachInsight(cp, [ciDay(0, [ciBW('A')])], {}, CI_NOW, { bw, waterGoal: 8 }).type, 'peso', 'peso gana a agua');
});

// ── Fase 3: EL PULSO DEL COACH (coachPulse) — v353 ──
const ciRecentPr = name => ({ x: { val: 100, unit: 'kg', name, date: new Date(CI_NOW - 3600000).toISOString() } });

test('coachPulse: mezcla de señales → orden por tipo luego nombre, tope 5, suspendido excluido', () => {
  const clients = [
    { id: 'a', name: 'Zoe', days: 2 },   // record
    { id: 'b', name: 'Ana', days: 2 },   // record (desempata por nombre)
    { id: 'c', name: 'Beto', days: 2 },  // estancado
    { id: 'd', name: 'Cira', days: 2 },  // deload (4 semanas)
    { id: 'e', name: 'Dan', days: 2 },   // racha (3 semanas)
    { id: 'f', name: 'Eva', days: 2, suspended: true }, // excluida
  ];
  const prs = { a: ciRecentPr('Press'), b: ciRecentPr('Sentadilla') };
  const stall = [62, 62, 61, 60, 62, 62].map((kg, i) => ciDay(i, [ciEx('Press', kg)]));
  const wk4 = [0, 2, 7, 9, 14, 16, 21, 23].map(o => ciDay(o, [ciBW('A')]));
  const wk3 = [0, 2, 7, 9, 14, 16].map(o => ciDay(o, [ciBW('A')]));
  const history = { c: stall, d: wk4, e: wk3, f: wk4 };
  const r = coachPulse(clients, history, prs, CI_NOW, {});
  assert.deepStrictEqual(r.map(x => x.name), ['Ana', 'Zoe', 'Beto', 'Cira', 'Dan']);
  assert.deepStrictEqual(r.map(x => x.type), ['record', 'record', 'estancado', 'deload', 'racha']);
  assert.ok(/Sentadilla/.test(r[0].label), 'label con el nombre del ejercicio');
  assert.ok(!r.some(x => x.id === 'f'), 'suspendido excluido');
  assert.ok(r.length <= 5);
});

test('coachPulse: NO incluye inactividad (el home ya la grita)', () => {
  // Un asesorado que solo entrenó hace 10 días → inactivo, pero SIN señal positiva → no aparece.
  const clients = [{ id: 'a', name: 'Ana', days: 2 }];
  const history = { a: [ciDay(10, [ciBW('A')])] };
  assert.deepStrictEqual(coachPulse(clients, history, {}, CI_NOW, {}), []);
});

test('coachPulse: fila silenciada por el coach (✕) se excluye', () => {
  const clients = [{ id: 'a', name: 'Ana', days: 2 }];
  const prs = { a: ciRecentPr('Press') };
  assert.strictEqual(coachPulse(clients, {}, prs, CI_NOW, {}).length, 1);
  assert.strictEqual(coachPulse(clients, {}, prs, CI_NOW, { muted: { 'a_record': CI_NOW + 86400000 } }).length, 0);
});

test('coachPulse: sin datos → []; determinista (mismos args → mismo resultado)', () => {
  assert.deepStrictEqual(coachPulse([], {}, {}, CI_NOW, {}), []);
  assert.deepStrictEqual(coachPulse([{ id: 'a', name: 'Ana' }], {}, {}, CI_NOW, {}), []);
  const clients = [{ id: 'a', name: 'Ana', days: 2 }, { id: 'b', name: 'Beto', days: 2 }];
  const prs = { a: ciRecentPr('X'), b: ciRecentPr('Y') };
  assert.strictEqual(JSON.stringify(coachPulse(clients, {}, prs, CI_NOW, {})), JSON.stringify(coachPulse(clients, {}, prs, CI_NOW, {})));
});

// ══════════════════════════════════════════════════════
section('Plan de choque contra estancamientos (shockPlan / applyShockOption, v354)');

// Una sesión con un ejercicio de carga que SÍ trae músculo (shockPlan busca variantes por músculo).
const spSess = (offsetDays, name, muscle, kg) => ({
  date: new Date(CI_NOW - offsetDays * 86400000).toISOString(),
  exercises: [{ name, muscle, track: 'peso_reps', sets: [{ done: true, kg: String(kg), reps: '8' }] }],
});
// Historial ESTANCADO en "Jalón al Pecho": cronológico 60,62,61,60,61,61 → máx previo 62 (2º punto),
// y los últimos 4 (61,60,61,61) no lo superan. bestKg=62, 4 sesiones planas desde el récord.
// El historial de la app va nuevo→viejo, por eso el reverse().
const spStalled = [60, 62, 61, 60, 61, 61]
  .map((kg, i) => spSess((5 - i) * 3, 'Jalón al Pecho', 'espalda', kg)).reverse();
// Historial que PROGRESA (el último punto supera el máx previo) → no hay meseta.
const spProgress = [60, 61, 62, 63, 64, 65]
  .map((kg, i) => spSess((5 - i) * 3, 'Jalón al Pecho', 'espalda', kg)).reverse();
// Catálogo de prueba. Orden deliberado: "Remo con Barra" (P) es la 1ª candidata de espalda…
// …pero la excluye una limitación lumbar (GEN_ZONE_EXCL.lumbar) → cae en "Dominada" (I).
const spLib = [
  { id: 'x1', name: 'Remo con Barra', muscle: 'espalda', level: 'P', icon: '🏋️', desc: 'd1', imgUrl: 'u1', track: 'peso_reps' },
  { id: 'x2', name: 'Dominada', muscle: 'espalda', level: 'I', icon: '💪', desc: 'd2', imgUrl: 'u2', track: 'reps' },
  { id: 'x3', name: 'Remo Pendlay', muscle: 'espalda', level: 'A', icon: '🔥', desc: 'd3', imgUrl: 'u3' },
  { id: 'x9', name: 'Press Banca', muscle: 'pecho', level: 'P', icon: '🏋️', desc: 'd9', imgUrl: 'u9' },
];
const spClient = { id: 'c1', name: 'Astrid', level: 'Intermedio', notes: '' };
const spPain = area => [{ area, at: new Date(CI_NOW - 2 * 86400000).toISOString() }];

test('shockPlan: sin estancamiento (o ejercicio inexistente) → null', () => {
  assert.strictEqual(shockPlan(spClient, 'Jalón al Pecho', spProgress, spLib, CI_NOW), null, 'si progresa no hay plan');
  assert.strictEqual(shockPlan(spClient, 'Sentadilla', spStalled, spLib, CI_NOW), null, 'ejercicio que no está en el historial');
  assert.strictEqual(shockPlan(spClient, 'Jalón al Pecho', [], spLib, CI_NOW), null, 'sin historial');
  assert.strictEqual(shockPlan(), null, 'sin argumentos no lanza');
});

test('shockPlan: con estancamiento → análisis con el kg plantado y las sesiones planas', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  assert.ok(p, 'hay plan');
  assert.strictEqual(p.ex.name, 'Jalón al Pecho');
  assert.strictEqual(p.ex.muscle, 'espalda');
  assert.strictEqual(p.analysis.bestKg, 62, 'el mejor kg es el techo real, no el último');
  assert.strictEqual(p.analysis.flatPoints, 4, 'sesiones desde el récord sin superarlo');
  assert.ok(p.analysis.sinceStr, 'trae la fecha del récord para el coach');
});

test('shockPlan: "remonta" SIEMPRE está y es la primera opción (la recomendada)', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  assert.strictEqual(p.options[0].id, 'remonta');
  assert.strictEqual(p.options[0].apply.reps, 12);
  // Y sigue estando incluso con dolor activo (es la opción segura).
  const conDolor = shockPlan({ ...spClient, painCare: spPain('hombro') }, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  assert.strictEqual(conDolor.options[0].id, 'remonta');
});

test('🔒 shockPlan: dolor activo NUNCA ofrece el bloque pesado 5×5, y avisa al coach', () => {
  const p = shockPlan({ ...spClient, painCare: spPain('hombro') }, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  assert.ok(!p.options.some(o => o.id === 'pesado'), 'subir cargas con dolor activo está prohibido');
  assert.ok(p.warnings.some(w => /dolor/i.test(w)), 'el coach ve el aviso de dolor');
  // Un dolor VIEJO (>14 días, fuera de la ventana de painCareActive) ya no bloquea.
  const viejo = { ...spClient, painCare: [{ area: 'hombro', at: new Date(CI_NOW - 30 * 86400000).toISOString() }] };
  assert.ok(shockPlan(viejo, 'Jalón al Pecho', spStalled, spLib, CI_NOW).options.some(o => o.id === 'pesado'));
  // Y un dolor descartado ("ya estoy bien") tampoco.
  const cleared = { ...spClient, painCare: [{ area: 'hombro', at: new Date(CI_NOW - 2 * 86400000).toISOString(), cleared: true }] };
  assert.ok(shockPlan(cleared, 'Jalón al Pecho', spStalled, spLib, CI_NOW).options.some(o => o.id === 'pesado'));
});

test('shockPlan: sin dolor → ofrece el bloque pesado 5×5 con más descanso', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  const pesado = p.options.find(o => o.id === 'pesado');
  assert.ok(pesado, 'sin dolor el 5×5 es una opción válida');
  assert.strictEqual(pesado.apply.sets, 5);
  assert.strictEqual(pesado.apply.reps, 5);
  assert.strictEqual(pesado.apply.restSecDelta, 30);
  assert.deepStrictEqual(p.warnings, [], 'sin dolor ni limitación, sin avisos');
});

test('🔒 shockPlan: una limitación lumbar EXCLUYE las variantes contraindicadas', () => {
  const lesionado = { ...spClient, notes: 'Tiene hernia lumbar diagnosticada' };
  const p = shockPlan(lesionado, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  const v = p.options.find(o => o.id === 'variante');
  assert.ok(v, 'sigue habiendo una variante segura');
  assert.strictEqual(v.apply.swapTo, 'x2', 'salta "Remo con Barra" (contraindicado en lumbar) y toma "Dominada"');
  assert.ok(p.warnings.some(w => /limitaci/i.test(w)), 'el coach ve el aviso de la limitación');
  // Sin la limitación, la primera candidata SÍ es el remo.
  const sano = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  assert.strictEqual(sano.options.find(o => o.id === 'variante').apply.swapTo, 'x1');
});

test('🔒 shockPlan: el dolor de zona también filtra las variantes de esa zona', () => {
  const conDolor = { ...spClient, painCare: spPain('zona lumbar') };
  const v = shockPlan(conDolor, 'Jalón al Pecho', spStalled, spLib, CI_NOW).options.find(o => o.id === 'variante');
  assert.strictEqual(v.apply.swapTo, 'x2', 'con dolor lumbar tampoco se propone "Remo con Barra"');
});

test('shockPlan: sin candidata del nivel del asesorado → sin opción "variante"', () => {
  // Solo queda una variante Avanzada; un Intermedio (cap I) no la puede recibir.
  const libAvanzado = [spLib[2], spLib[3]];
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, libAvanzado, CI_NOW);
  assert.ok(!p.options.some(o => o.id === 'variante'), 'no se propone un ejercicio por encima de su nivel');
  assert.strictEqual(p.options.length, 2, 'quedan remonta + pesado');
  // El mismo catálogo con un Avanzado sí la ofrece.
  const av = shockPlan({ ...spClient, level: 'Avanzado' }, 'Jalón al Pecho', spStalled, libAvanzado, CI_NOW);
  assert.strictEqual(av.options.find(o => o.id === 'variante').apply.swapTo, 'x3');
});

test('shockPlan: sin catálogo o sin variantes del mismo músculo → sigue habiendo plan (sin variante)', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, [spLib[3]], CI_NOW);
  assert.deepStrictEqual(p.options.map(o => o.id), ['remonta', 'pesado'], 'el pecho no sirve para un ejercicio de espalda');
  assert.deepStrictEqual(shockPlan(spClient, 'Jalón al Pecho', spStalled, [], CI_NOW).options.map(o => o.id), ['remonta', 'pesado']);
});

test('shockPlan: los mensajes van en VOZ DEL COACH — nombre del asesorado, ejercicio y kg', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  p.options.forEach(o => {
    assert.ok(o.msg.includes('Astrid'), o.id + ': le habla por su nombre');
    assert.ok(o.msg.includes('Jalón al Pecho'), o.id + ': nombra el ejercicio');
    assert.ok(o.msg.includes('62'), o.id + ': dice el kg en el que se plantó');
    assert.ok(o.title && o.desc, o.id + ': tiene título y explicación para el coach');
  });
});

test('shockPlan: determinista — mismos argumentos, mismas opciones', () => {
  const a = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  const b = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

// ── applyShockOption ──
const spRoutines = () => ([
  { id: 'r1', restSec: 60, exercises: [
    { id: 'e0', name: 'Jalón al Pecho', muscle: 'espalda', sets: 4, reps: 8, restSec: 90, icon: '🏋️', desc: 'viejo', imgUrl: 'v' },
    { id: 'e1', name: 'Press Banca', muscle: 'pecho', sets: 3, reps: 10 },
  ] },
  { id: 'r2', restSec: 45, exercises: [
    { id: 'e0', name: 'Jalón al Pecho', muscle: 'espalda', sets: 3, reps: 12 },
  ] },
]);

test('applyShockOption: "remonta" cambia las reps de TODAS las apariciones del ejercicio', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  const out = applyShockOption(spRoutines(), 'Jalón al Pecho', p.options.find(o => o.id === 'remonta'), spLib);
  assert.strictEqual(out[0].exercises[0].reps, 12);
  assert.strictEqual(out[1].exercises[0].reps, 12, 'también en la segunda rutina');
  assert.strictEqual(out[0].exercises[0].sets, 4, 'las series no las toca');
  assert.strictEqual(out[0].exercises[1].reps, 10, 'no toca los demás ejercicios');
});

test('applyShockOption: "pesado" pone 5×5 y suma 30s al descanso (propio, o el de la rutina)', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  const out = applyShockOption(spRoutines(), 'Jalón al Pecho', p.options.find(o => o.id === 'pesado'), spLib);
  assert.strictEqual(out[0].exercises[0].sets, 5);
  assert.strictEqual(out[0].exercises[0].reps, 5);
  assert.strictEqual(out[0].exercises[0].restSec, 120, '90 propio + 30');
  assert.strictEqual(out[1].exercises[0].restSec, 75, 'sin descanso propio hereda el de la rutina (45) + 30');
});

test('applyShockOption: "variante" rota el ejercicio CONSERVANDO series y repeticiones', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  const out = applyShockOption(spRoutines(), 'Jalón al Pecho', p.options.find(o => o.id === 'variante'), spLib);
  const ex = out[0].exercises[0];
  assert.strictEqual(ex.id, 'x1');
  assert.strictEqual(ex.name, 'Remo con Barra');
  assert.strictEqual(ex.muscle, 'espalda');
  assert.strictEqual(ex.icon, '🏋️');
  assert.strictEqual(ex.desc, 'd1', 'la ficha nueva reemplaza a la vieja');
  assert.strictEqual(ex.imgUrl, 'u1');
  assert.strictEqual(ex.sets, 4, 'conserva las series de ESA entrada');
  assert.strictEqual(ex.reps, 8, 'conserva las reps de ESA entrada');
  assert.strictEqual(out[1].exercises[0].sets, 3, 'y las de la otra rutina, que eran distintas');
  assert.strictEqual(out[1].exercises[0].reps, 12);
});

test('applyShockOption: PURA — no muta las rutinas originales', () => {
  const p = shockPlan(spClient, 'Jalón al Pecho', spStalled, spLib, CI_NOW);
  const original = spRoutines();
  const snapshot = JSON.stringify(original);
  p.options.forEach(o => applyShockOption(original, 'Jalón al Pecho', o, spLib));
  assert.strictEqual(JSON.stringify(original), snapshot, 'nada se aplica hasta que el coach lo guarde');
});

test('applyShockOption: entradas raras no lanzan ni pierden datos', () => {
  assert.deepStrictEqual(applyShockOption(null, 'X', null, null), []);
  const out = applyShockOption(spRoutines(), 'Jalón al Pecho', { apply: { swapTo: 'noexiste' } }, spLib);
  assert.strictEqual(out[0].exercises[0].name, 'Jalón al Pecho', 'un swap a un id inexistente no borra el ejercicio');
});

// ── shockTargets (v355, Fase 4.1: múltiples estancamientos) ──
// Construye un historial (nuevo→viejo, como en la app) de 6 sesiones donde cada ejercicio dado
// sigue su propio patrón de kg. exs = [{name, muscle, kgs:[6 valores cronológicos]}].
const stHist = (exs) => {
  const N = 6;
  const out = [];
  for (let i = 0; i < N; i++) { // i=0 = la más vieja
    out.push({
      date: new Date(CI_NOW - (N - 1 - i) * 3 * 86400000).toISOString(),
      exercises: exs.map(e => ({ name: e.name, muscle: e.muscle, track: 'peso_reps', sets: [{ done: true, kg: String(e.kgs[i]), reps: '8' }] })),
    });
  }
  return out.reverse();
};
// Patrones que ESTANCAN (techo en los 2 primeros puntos, últimos 4 no lo superan). El techo más
// temprano = MÁS puntos planos: idx0 → flatPoints 5, idx1 → flatPoints 4.
const KG_FLAT5 = [62, 60, 60, 60, 60, 60]; // techo 62 en idx0 → flatPoints 5
const KG_FLAT4 = [60, 62, 60, 60, 60, 60]; // techo 62 en idx1 → flatPoints 4

test('shockTargets: 0 estancados → null', () => {
  assert.strictEqual(shockTargets(spProgress), null, 'un ejercicio que progresa no dispara nada');
  assert.strictEqual(shockTargets([]), null, 'sin historial');
  assert.strictEqual(shockTargets(), null, 'sin argumentos no lanza');
});

test('shockTargets: 1 estancado → multi con 1 target sin also', () => {
  const r = shockTargets(stHist([{ name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_FLAT5 }]));
  assert.strictEqual(r.mode, 'multi');
  assert.strictEqual(r.targets.length, 1);
  assert.strictEqual(r.targets[0].name, 'Jalón al Pecho');
  assert.strictEqual(r.targets[0].muscle, 'espalda');
  assert.deepStrictEqual(r.targets[0].also, [], 'un solo estancado no tiene hermanos');
});

test('shockTargets: 2 del MISMO músculo → 1 target, gana el de MÁS puntos planos, el otro va en also', () => {
  // 'Jalón' va primero y alfabéticamente antes que 'Remo', PERO 'Remo' está más clavado (flat5) →
  // debe ganar por flatPoints, aislado del orden de inserción Y del desempate por nombre.
  const r = shockTargets(stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_FLAT4 }, // flatPoints 4
    { name: 'Remo con Barra', muscle: 'espalda', kgs: KG_FLAT5 }, // flatPoints 5 (más clavado)
  ]));
  assert.strictEqual(r.mode, 'multi');
  assert.strictEqual(r.targets.length, 1, 'mismo músculo = un solo problema → una sección');
  assert.strictEqual(r.targets[0].name, 'Remo con Barra', 'ataca primero el más plantado, no el 1º ni el alfabético');
  assert.deepStrictEqual(r.targets[0].also, ['Jalón al Pecho'], 'el hermano queda anotado para la nota');
});

test('shockTargets: 2 músculos DISTINTOS → 2 targets (recuperación independiente → en paralelo)', () => {
  const r = shockTargets(stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_FLAT5 },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_FLAT4 },
  ]));
  assert.strictEqual(r.mode, 'multi');
  assert.strictEqual(r.targets.length, 2);
  assert.deepStrictEqual(r.targets.map(t => t.muscle).sort(), ['espalda', 'pecho']);
  r.targets.forEach(t => assert.deepStrictEqual(t.also, [], 'cada músculo tiene un solo estancado'));
});

test('shockTargets: 3 estancados (aunque sean de 3 músculos distintos) → global con los nombres', () => {
  const r = shockTargets(stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_FLAT5 },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_FLAT4 },
    { name: 'Sentadilla', muscle: 'pierna', kgs: KG_FLAT4 },
  ]));
  assert.strictEqual(r.mode, 'global', '3+ a la vez = fatiga sistémica, no N planes');
  assert.strictEqual(r.count, 3);
  assert.deepStrictEqual(r.names.slice().sort(), ['Jalón al Pecho', 'Press Banca', 'Sentadilla']);
});

test('shockTargets: determinista — mismo historial, mismo resultado', () => {
  const h = stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_FLAT5 },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_FLAT4 },
  ]);
  assert.strictEqual(JSON.stringify(shockTargets(h)), JSON.stringify(shockTargets(h)));
});

test('shockTargets: shockPlan de cada target sigue funcionando (la firma no se tocó)', () => {
  const h = stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_FLAT5 },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_FLAT4 },
  ]);
  const r = shockTargets(h);
  r.targets.forEach(t => {
    const p = shockPlan(spClient, t.name, h, spLib, CI_NOW);
    assert.ok(p && p.options.length, t.name + ': cada target sigue produciendo su plan de choque');
    assert.strictEqual(p.ex.name, t.name);
  });
});

// ══════════════════════════════════════════════════════
section('Telemetría de errores (errReportGate)');

const T0 = '2026-07-06T10:00:00'; // now fijo → deterministas

test('errReportGate: primer error se reporta y actualiza el estado', () => {
  const r = errReportGate(null, 'TypeError: x is not a function', T0);
  assert.strictEqual(r.report, true);
  assert.strictEqual(r.state.sent, 1);
  assert.strictEqual(r.state.dayCount, 1);
  assert.strictEqual(r.state.seen.length, 1);
});

test('errReportGate: mensaje vacío o solo espacios → no reporta', () => {
  assert.strictEqual(errReportGate(null, '', T0).report, false);
  assert.strictEqual(errReportGate(null, '   ', T0).report, false);
  assert.strictEqual(errReportGate(null, null, T0).report, false);
});

test('errReportGate: el mismo error dos veces → la repetición no se reporta', () => {
  const r1 = errReportGate(null, 'boom', T0);
  const r2 = errReportGate(r1.state, 'boom', T0);
  assert.strictEqual(r2.report, false);
  assert.strictEqual(r2.state.sent, 1, 'el contador no sube con duplicados');
});

test('errReportGate: dedupe por firma — errores largos que solo difieren tras 120 chars cuentan como uno', () => {
  const base = 'x'.repeat(120);
  const r1 = errReportGate(null, base + 'AAA', T0);
  const r2 = errReportGate(r1.state, base + 'BBB', T0);
  assert.strictEqual(r1.report, true);
  assert.strictEqual(r2.report, false);
});

test('errReportGate: tope de 5 por sesión — el 6º distinto no se reporta', () => {
  let st = null;
  for (let i = 0; i < 5; i++) { const r = errReportGate(st, 'err distinto ' + i, T0); assert.strictEqual(r.report, true); st = r.state; }
  const r6 = errReportGate(st, 'err distinto 5', T0);
  assert.strictEqual(r6.report, false);
});

test('errReportGate: tope diario de 20 (cross-sesión) — bloquea aunque la sesión vaya en cero', () => {
  const st = { seen: [], sent: 0, day: new Date(T0).toDateString(), dayCount: 20 };
  assert.strictEqual(errReportGate(st, 'otro error', T0).report, false);
});

test('errReportGate: al cambiar el día de calendario el tope diario arranca en cero', () => {
  const st = { seen: [], sent: 0, day: new Date(T0).toDateString(), dayCount: 20 };
  const r = errReportGate(st, 'error de mañana', '2026-07-07T08:00:00');
  assert.strictEqual(r.report, true);
  assert.strictEqual(r.state.dayCount, 1);
});

// ══════════════════════════════════════════════════════
// Sello anti-harness (cloudWriteSealed) — incidente Samuel 2026-07-08
// ══════════════════════════════════════════════════════
section('Sello anti-harness (cloudWriteSealed)');

test('cloudWriteSealed: localhost sella la escritura (sin opt-in)', () => {
  assert.strictEqual(cloudWriteSealed('localhost', false), true);
  assert.strictEqual(cloudWriteSealed('localhost', undefined), true);
});

test('cloudWriteSealed: 127.0.0.1 e IPv6 [::1] también se sellan', () => {
  assert.strictEqual(cloudWriteSealed('127.0.0.1', false), true);
  assert.strictEqual(cloudWriteSealed('[::1]', false), true);
});

test('cloudWriteSealed: producción (github.io) NUNCA se sella — usuarios reales sí escriben', () => {
  assert.strictEqual(cloudWriteSealed('kronos-apex.github.io', false), false);
  assert.strictEqual(cloudWriteSealed('avi.entrena.app', false), false);
});

test('cloudWriteSealed: opt-in explícito (AVI_ALLOW_CLOUD_WRITE) permite escribir aun en localhost', () => {
  assert.strictEqual(cloudWriteSealed('localhost', true), false);
});

test('cloudWriteSealed: hostname vacío/indefinido NO se sella (no es localhost)', () => {
  assert.strictEqual(cloudWriteSealed('', false), false);
  assert.strictEqual(cloudWriteSealed(undefined, false), false);
});

test('stripFixtureSessions: barre sesiones-fixture (rTest/rVis/rf5) y conserva las reales', () => {
  const hist = [
    { routineId: 'mqqx81o', routineName: 'Empuje' },
    { routineId: 'rTest', routineName: 'WF Guard2' },
    { routineId: 'rVis', routineName: 'Cardio + Core' },
    { routineId: 'rf5', routineName: 'Test F5a' },
    { routineId: '6d8c55048f9d', routineName: 'Full Body C' },
  ];
  const r = stripFixtureSessions(hist);
  assert.strictEqual(r.removed, 3);
  assert.strictEqual(r.history.length, 2);
  assert.deepStrictEqual(r.history.map(h => h.routineId), ['mqqx81o', '6d8c55048f9d']);
});

test('stripFixtureSessions: historial sin basura queda idéntico (removed 0)', () => {
  const hist = [{ routineId: 'mqqx81o' }, { routineId: 'aaea3e62d581' }];
  const r = stripFixtureSessions(hist);
  assert.strictEqual(r.removed, 0);
  assert.strictEqual(r.history.length, 2);
});

test('stripFixtureSessions: entrada no-array → array vacío sin lanzar', () => {
  assert.deepStrictEqual(stripFixtureSessions(null), { history: [], removed: 0 });
  assert.deepStrictEqual(stripFixtureSessions(undefined), { history: [], removed: 0 });
});

// ══════════════════════════════════════════════════════
// ESTÁTICO — anti-clase de bug (C1 auditoría 2026-07-13)
// ══════════════════════════════════════════════════════
// Un onclick inline con `identificadorLocal ?? '${...}'` deja el identificador
// CRUDO en el atributo (se evalúa en scope global donde no existe) → ReferenceError
// silencioso ANTES de que el ?? actúe. Fue el bug del botón "Aplicar →" de plantillas.
// Este test escanea los módulos de la app y prohíbe la CLASE entera.
section('Estático — anti-clase (onclick con ?? antes de interpolar)');
test('ningún módulo tiene el patrón `?? \'${` (interpolación a medias en onclick)', () => {
  const fs = require('fs');
  const path = require('path');
  const files = ['app-1-infra.js','app-2-login.js','app-3-coach.js','app-4-entreno.js','app-5-salud.js','app-6-extra.js'];
  const re = /\?\?\s*'\$\{/;
  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    src.split('\n').forEach((ln, i) => { if (re.test(ln)) offenders.push(`${f}:${i + 1}`); });
  }
  assert.strictEqual(offenders.length, 0, 'patron de interpolacion a medias encontrado en: ' + offenders.join(', '));
});

// ── C4 (auditoría 2026-07-13): el mapa EX_IMG_NAME debe ser null-proto ──
// El lookup `EX_IMG_NAME[nf(nombre)]` de exImgSrc/exVidSrc (app-1-infra.js) resolvería a un
// miembro HEREDADO del prototipo si un ejercicio custom se llama 'constructor'/'__proto__'/
// 'toString' (→ id basura → 404 de imagen). Se blinda severando el prototipo del mapa. app-1
// no es requerible en Node (usa globals de browser), así que se verifica estáticamente en la
// fuente: el severado debe estar presente. Falla si alguien lo quita o reintroduce el literal.
test('C4: EX_IMG_NAME es null-proto (lookup por nombre no hereda del prototipo)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  const nulled = /Object\.setPrototypeOf\(\s*EX_IMG_NAME\s*,\s*null\s*\)/.test(src)
              || /EX_IMG_NAME\s*=\s*Object\.assign\(\s*Object\.create\(\s*null\s*\)/.test(src);
  assert.ok(nulled, 'EX_IMG_NAME debe blindarse (Object.setPrototypeOf(...,null) u Object.create(null)) — C4');
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
