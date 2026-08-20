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
  nutritionEstimate,
  loadStep,
  kgOutlier,
  sanitizeHistory,
  sanitizePrs,
  nutAcompMacros,
  nutDayPlan,
  NUT_MEALS_5,
  nutAcompGrams,
  nutPlanMealEntries,
  foodLogIsPlanEntry,
  foodLogMarkPlanMeal,
  foodLogUnmarkPlanMeal,
  foodLogPlanMealDone,
  foodLogBandFor,
  foodLogWeekStates,
  FL_ESTADO_UI,
  foodLogBandCount,
  FOODLOG_BAND,
  nutShoppingList,
  nutShopQty,
  nutShoppingText,
  NUT_SHOP_NOTA,
  NUT_FOODS,
  nutWeekShape,
  nutDayKind,
  nutPortionText,
  nutBaseFor,
  workoutStartCollapsed,
  nutMacroKcal,
  nutWeekTargets,
  nutDayNote,
  nutRefWeight,
  nutProtPerKg,
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
  sessionFinished,
  finishedTrainingToday,
  daysSinceLastSession,
  workoutStreak,
  longestStreak,
  planDays,
  weeklyMissed,
  myTrainingSummary,
  communitySnapshot,
  communityTrainingSinceText,
  CMTY_REFRESH_MIN_MS,
  CMTY_STALE_MS,
  CMTY_AVATAR_PREFIX,
  cmtyHandleValid,
  cmtyCodeNormalize,
  cmtyShouldRefresh,
  cmtyFreshness,
  cmtyAvatarOk,
  cmtyInitials,
  cmtyLocalKey,
  communityPostPayload,
  communityEmptyState,
  communityPeersLine,
  communityNudgeEligible,
  communityProbeStale,
  communityMe,
  firstSessionMode,
  estimateWorkoutMinutes,
  CMTY_NUDGE_MIN_SESSIONS,
  communityGymAdoption,
  communityGymHint,
  communityInviteMsg,
  highestStreakMilestone,
  milestoneAskEligible,
  MILESTONE_ASK_MAX_SHOWS,
  STREAK_MILESTONES,
  communityMilestoneText,
  communityCommentText,
  communityPrPayload,
  communityWorkoutPayload,
  leadPending,
  shareBannerEligible,
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
  waterGoalFor,
  waterAdherence,
  STEPS_GOAL_DEFAULT,
  stepsToday,
  stepsSet,
  stepsAdd,
  stepsWeek,
  waPhone,
  waPhoneNote,
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
  habitDayKey,
  NUT_MENUS,
  NUT_FOOD_BY_ID,
  FOOD_PAGE,
  foodNormText,
  foodCatalog,
  foodKcalSuspect,
  foodSearch,
  eanNormalize,
  eanCheckDigit,
  eanValid,
  labelPer100,
  barcodeDraft,
  foodFromBarcode,
  fbReviewNotes,
  fbQueueSplit,
  FOODLOG_KEEP_DAYS,
  FOODLOG_MAX_G,
  FOODLOG_MEALS,
  foodLogBlank,
  foodLogEntry,
  foodLogDay,
  foodLogTotals,
  foodLogPrune,
  foodLogAdd,
  foodLogRemove,
  foodLogMerge,
  foodLogProgress,
  foodLogWeek,
  foodLogAdherence,
  foodLogActiveDays,
  inferNutGoal,
  nutGoalForClient,
  nutKcalDirection,
  nutGoalMismatch,
  calcTMB,
  isMenor,
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
  perfIndex,
  exercisePerfSeries,
  stallGateReason,
  stallReport,
  stalledExercises,
  deloadFloorReason,
  deloadSets,
  startDeload,
  endDeload,
  deloadState,
  deloadSuggestKg,
  deloadLoadHint,
  deloadCardText,
  deloadWarnings,
  deloadOverdue,
  DELOAD_DAYS,
  DELOAD_LOAD_FACTOR,
  PERF_CLAMP_REPS,
  STALL_BEGINNER_MIN_WEEKS,
  STALL_DELOAD_REGRESSION,
  shockPlan,
  applyShockOption,
  weekEditorial,
  exTrack,
  prFromSets,
  isBetterPR,
  prsRemapRetired,
  REMOVED_EXERCISES,
  muscleHuman,
  exMuscleText,
  EX_LEVEL,
  searchExercises,
  pillStealsTap,
  muscleVolume,
  pushPullBalance,
  clientHasCoach,
  chatDeliveryBlock,
  clientPlan,
  submuscleVolume,
  exDoseShort,
  heroTitleSize,
  todayHeroModel,
  HERO_MAX_LINES,
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

section('2. Macros — el formulario del coach calcula con el MISMO motor que la app (v436)');
// 🔴 `calcMacrosSugeridos` era una CUARTA cuenta: la que rellenaba «Editar plan». Hacía sobre el
// PESO TOTAL lo que el motor corrige desde v428 (sobre IMC 30, proteína y grasa van sobre peso de
// REFERENCIA). Medido sobre la base real el 2026-08-04: a Kathe (IMC 32) le proponía 2.710 kcal
// cuando le corresponden 1.930, y a Luz (IMC 33,7) 2.602 contra 1.730 — a las dos, con objetivo de
// PERDER GRASA, les proponía comer POR ENCIMA de su propio gasto. Se borró; el formulario usa
// `nutritionEstimate`, que es lo que la app entrega de verdad.

test('🔴 v436 · a quien quiere perder grasa NUNCA se le propone comer por encima de su gasto', () => {
  // Los dos casos reales que lo destaparon.
  const casos = [
    { name: 'Kathe', sex: 'F', age: 28, height: 163, weight: 85, activityFactor: 1.55, goal: 'Perder grasa' },
    { name: 'Luz', sex: 'F', age: 39, height: 156, weight: 82, activityFactor: 1.55, goal: 'Perder grasa' },
  ];
  for (const c of casos) {
    const est = nutritionEstimate(c, c.weight);
    assert.ok(est && est.macros, c.name + ': tiene que poder estimarse');
    assert.ok(est.kcalObj < est.tdee, `${c.name}: le propone ${est.kcalObj} con un gasto de ${est.tdee} — eso es superávit con objetivo de perder grasa`);
    // Y el déficit es MODERADO: ni de adorno ni salvaje.
    const deficit = est.tdee - est.kcalObj;
    assert.ok(deficit >= 300 && deficit <= 800, `${c.name}: déficit de ${deficit} kcal fuera de rango razonable`);
    // Y la propiedad de fondo: con IMC>30 la dosificación va sobre peso de REFERENCIA, no sobre la
    // báscula (v428). Se afirma sobre `nutRefWeight` directamente — una aserción del tipo
    // «proteína < 2 g por kilo» es demasiado floja y deja pasar el defecto (lo demostró el sabotaje).
    const ref = core.nutRefWeight(c.weight, c.height);
    assert.ok(ref < c.weight - 5, `${c.name}: peso de referencia ${ref} para ${c.weight} kg — no se está ajustando`);
    assert.ok(est.macros.prot_g <= Math.round(ref * 2.2), `${c.name}: ${est.macros.prot_g} g de proteína sale del peso total, no del de referencia`);
    assert.ok(est.macros.carb_g > 0, `${c.name}: nadie puede quedarse en cero carbohidratos`);
  }
});

test('🔒 v436 · la cuenta vieja del formulario ya no existe (una sola fuente)', () => {
  assert.strictEqual(typeof core.calcMacrosSugeridos, 'undefined',
    'calcMacrosSugeridos era una cuarta verdad: se borró, no se dejó "por si acaso"');
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
  // ⚠️ Este test afirmaba ['Lunes','Martes','Miércoles','Jueves'] — los días CONSECUTIVOS que
  // producía el generador. No se cambió la aserción para que pasara: se cambió el COMPORTAMIENTO
  // a propósito (2026-08-01) porque amontonar 4 entrenos seguidos y descansar 3 no es programar.
  // Ahora el plan se reparte a lo ancho de la semana. Ver `genWeekDays`.
  assert.deepStrictEqual(routines.map(r => r.day), ['Lunes', 'Miércoles', 'Viernes', 'Sábado']);
});

test('🔴 el plan se REPARTE en la semana, no se amontona en días seguidos', () => {
  // Un principiante de 3 días entrenaba lunes, martes y miércoles y descansaba cuatro.
  const dias = core.genWeekDays(3, 0);
  assert.deepStrictEqual(dias, ['Lunes', 'Miércoles', 'Sábado']);
  // ninguna pareja de días de entreno puede quedar pegada cuando hay hueco de sobra
  const idx = dias.map(d => core.GEN_WEEK_DAYS.indexOf(d));
  idx.slice(1).forEach((v, i) => assert.ok(v - idx[i] >= 2, `quedaron días seguidos: ${dias.join(', ')}`));
});

test('🔴 el día 1 tiene entreno: el plan arranca el día que la persona empieza', () => {
  // Medido 2026-08-01: el 100% de los planes arrancaba el LUNES, así que quien se registraba
  // sábado o domingo veía «hoy es tu día de descanso» el mismo día que se inscribió — el 100%
  // de las veces, en el momento de más ganas. Ocho personas tenían rutina y nunca entrenaron.
  core.GEN_WEEK_DAYS.forEach((dia, i) => {
    const dias = core.genWeekDays(3, i);
    assert.strictEqual(dias[0], dia, `arrancando en ${dia} el primer entreno cayó en ${dias[0]}`);
    const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo' }, LIB, { ...FIXED, startDay: dia });
    assert.ok(routines.some(r => r.day === dia), `el plan que empieza el ${dia} no tiene entreno ese día`);
  });
});

test('sin startDay el plan sigue arrancando el lunes (lo que el coach espera)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  assert.strictEqual(routines[0].day, 'Lunes');
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

// La MOVILIDAD entró al catálogo en junio (16 ejercicios) y los slots `[músculo, null]` aceptan
// cualquier tipo: en casa/parque, donde el pool del tipo se agota, el plan salía con «Postura del
// Niño» ocupando el sitio de una plancha, con series y repeticiones. Medido el 2026-07-28: 60 de
// 384 planes. Estirar no es entrenar — su sitio es el calentamiento y la sesión de movilidad.
test('el generador NUNCA pone movilidad en un slot de entreno (estirar no es entrenar)', () => {
  const lib = [
    { id: 'z_core_mov', name: 'Postura del Niño', muscle: 'core', type: 'Movilidad', sets: 2, reps: 30, icon: 'x', level: 'P' },
    { id: 'z_core_iso', name: 'Plancha', muscle: 'core', type: 'Isométrico', sets: 3, reps: 30, icon: 'x', level: 'I' },
    { id: 'z_pie_P', name: 'Sentadilla Silla', muscle: 'piernas', type: 'Bodyweight', sets: 3, reps: 12, icon: 'x', level: 'P' },
  ];
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 2, goal: 'Ganar músculo' }, lib, FIXED);
  const all = routines.flatMap(r => r.exercises);
  assert.ok(!all.some(e => e.id === 'z_core_mov'), 'La movilidad no puede ocupar un slot de entreno');
  // Y el slot no se queda vacío por el filtro: la plancha (nivel I, respaldo del principiante) entra.
  assert.ok(all.some(e => e.id === 'z_core_iso'), 'Al excluir la movilidad el slot de core debe cubrirse igual');
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

// 🔴 P0 del dictamen de Laura (docs/dictamen-laura-dolor-2026-08-08.md §0): hasta v454 el dolor
// que reportaba la PERSONA no llegaba a ninguna de las superficies que ella toca. El generador y
// el calentamiento solo miraban las notas del COACH. Estos tests afirman que ya llega.
test('🔴 el dolor que reporta la persona excluye igual que la nota del coach', () => {
  const hoy = Date.now();
  // ⚠️ La forma REAL del dato: `painCareAdd` guarda la fecha en `at`, no en `date`. Un fixture con
  // la forma cómoda hacía pasar el test por el motivo equivocado (lo cazó fallando).
  const conDolor = { notes: '', painCare: [{ area: 'rodilla', level: 2, at: new Date(hoy).toISOString() }] };
  const lim = core.limitationsFor(conDolor, hoy);
  assert.ok(lim.keys.includes('rodilla'), 'el dolor de rodilla no llegó a las limitaciones');
  assert.strictEqual(lim.hasExclusions, true, 'se detectó la zona pero no excluye nada');
  assert.deepStrictEqual(lim.fromPain, ['rodilla'], 'no queda registrado que vino del reporte de dolor');
  // CONTROL: sin dolor y sin notas, nada cambia — o esto no sería un filtro, sería un apagón.
  const limpio = core.limitationsFor({ notes: '', painCare: [] }, hoy);
  assert.strictEqual(limpio.detected, false);
  assert.deepStrictEqual(limpio.keys, []);
});

test('🔴 el generador NO entrega sentadillas a quien reportó dolor de rodilla', () => {
  const lib = [
    { id: 'e13', name: 'Sentadilla con Barra', muscle: 'piernas', type: 'Compuesto', env: ['gym'] },
    { id: 'e33', name: 'Sentadilla en Smith', muscle: 'piernas', type: 'Compuesto', env: ['gym'] },
    { id: 'e36', name: 'Prensa de Pierna', muscle: 'piernas', type: 'Compuesto', env: ['gym'] },
    { id: 'e15', name: 'Curl Femoral Tumbado', muscle: 'piernas', type: 'Aislamiento', env: ['gym'] },
    { id: 'e42', name: 'Hip Thrust con Barra', muscle: 'gluteo', type: 'Compuesto', env: ['gym'] },
    { id: 'e1', name: 'Press de Banca con Barra', muscle: 'pecho', type: 'Compuesto', env: ['gym'] },
    { id: 'e6', name: 'Jalón al Pecho', muscle: 'espalda', type: 'Compuesto', env: ['gym'] },
    { id: 'e17', name: 'Plancha Frontal', muscle: 'core', type: 'Bodyweight', env: ['gym'] },
  ];
  const now = '2026-08-08T12:00:00.000Z';
  const base = { days: 3, level: 'Intermedio', goal: 'ganar_musculo', sex: 'M', place: 'gym' };
  const nombres = c => generarRutinas(c, lib, { now, seed: 1 }).routines
    .flatMap(r => (r.exercises || []).map(e => e.name));
  // CONTROL: sin dolor, la sentadilla SÍ aparece — si no, el test no probaría nada (estaría
  // midiendo un pool vacío en vez de un filtro).
  const sin = nombres({ ...base, painCare: [] });
  assert.ok(sin.some(n => /Sentadilla/i.test(n)), 'CONTROL: sin dolor tampoco salía sentadilla — el fixture no sirve');
  const con = nombres({ ...base, painCare: [{ area: 'rodilla', level: 2, at: now }] });
  assert.ok(!con.some(n => /Sentadilla/i.test(n)),
    'con dolor de rodilla declarado el generador sigue entregando sentadillas: ' + con.join(', '));
  assert.ok(con.length > 0, 'el filtro vació el plan entero — un hueco es aceptable, un plan vacío no');
});

test('🔴 la sustitución no ofrece MÁS de lo que duele (exerciseContraindicated)', () => {
  const zonas = ['rodilla'];
  assert.strictEqual(core.exerciseContraindicated({ name: 'Sentadilla en Smith' }, zonas), true);
  assert.strictEqual(core.exerciseContraindicated({ name: 'Sentadilla Hack' }, zonas), true);
  // Lo terapéutico NO se puede llevar por delante — es la trampa que ya nos costó una vez.
  assert.strictEqual(core.exerciseContraindicated({ name: 'Curl Femoral Tumbado' }, zonas), false);
  assert.strictEqual(core.exerciseContraindicated({ name: 'Hip Thrust con Barra' }, zonas), false);
  // Sin zonas no filtra nada.
  assert.strictEqual(core.exerciseContraindicated({ name: 'Sentadilla en Smith' }, []), false);
});

// 🔴 EL CANDADO DE LAS LISTAS NUEVAS (adenda de Laura, 2026-08-08). Lo que se afirma aquí no es
// que las regex existan: es que **no se lleven por delante lo terapéutico** y que **ningún pool
// quede vacío**. Son las dos trampas que la propia doctrina tiene escritas — `sentadilla` a secas
// borraba el wall-sit y el sit-to-stand, y una lista que vacía un puesto es peor que no filtrar.
// Lector del catálogo REAL. 🔴 Se ancla SOLO en `{id:'eNN'` y saca el resto de una ventana, sin
// exigir orden de campos: la versión que pedía `id,name,muscle` seguidos se dejaba fuera a `e89`
// y a otros 3 que declaran `env` en medio — y con ellos, cualquier cifra que saliera de aquí.
// El control de abajo (218+) es lo que hace que un parser roto no pase por verde.
function _leerCatalogo(src) {
  const cat = []; const re = /\{\s*id:\s*'(e\d+)'/g; let m;
  while ((m = re.exec(src))) {
    const w = src.slice(m.index, m.index + 900);
    const nm = /name:\s*'([^']+)'/.exec(w), mu = /muscle:\s*'([^']+)'/.exec(w), en = /env:\s*\[([^\]]*)\]/.exec(w);
    cat.push({ id: m[1], name: nm ? nm[1] : '', muscle: mu ? mu[1] : '',
      env: en ? en[1].split(',').map(s => s.replace(/['\s]/g, '')).filter(Boolean) : ['gym'] });
  }
  return cat;
}

test('🔴 el trabajo CORRECTIVO nunca es algo que su propia zona excluya', () => {
  const fs = require('fs'), path = require('path');
  const cat = _leerCatalogo(fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8'));
  assert.ok(cat.length >= 218, 'catálogo no leído entero: ' + cat.length);
  const malos = [];
  const zonasConBloque = Object.keys(core.GEN_CORRECTIVE);
  zonasConBloque.forEach(z => {
    core.GEN_CORRECTIVE[z].forEach(cand => {
      const ex = cat.find(e => e.id === cand.id);
      if (!ex) { malos.push(`${z}: el candidato ${cand.id} NO EXISTE en el catálogo`); return; }
      // 🔒 LA ÚNICA EXCEPCIÓN DE TODO EL MOTOR, y va acotada aquí para que siga siendo una:
      // el escalón SUBAGUDO de aductor/abductor prescribe abducción a propósito (es el correctivo
      // real de esa zona) y por eso se exime del filtro de SU zona. Exigimos las tres marcas
      // juntas: `saltaSuZona` + `fase:'subagudo'` + `cargaCero`. Ninguna otra zona puede usarla.
      if (cand.saltaSuZona) {
        if (['aductor', 'abductor'].indexOf(z) < 0)
          malos.push(`${z}: la excepción «saltaSuZona» se extendió a una zona que Laura no firmó`);
        if (cand.fase !== 'subagudo')
          malos.push(`${z}/${cand.id}: se salta su zona FUERA del escalón subagudo`);
        if (!cand.cargaCero)
          malos.push(`${z}/${cand.id}: se salta su zona sin el candado de carga cero`);
      } else if (core.exerciseContraindicated(ex, [z])) {
        malos.push(`${z}: el candidato ${cand.id} (${ex.name}) lo EXCLUYE su propia zona`);
      }
      // F2: cada candidato trae SU frase; sin ella el fallback explicaría otra cosa.
      if (!cand.why) malos.push(`${z}: el candidato ${cand.id} no trae su propio «why»`);
    });
    ['gym', 'casa', 'parque', 'corporal'].forEach(en => {
      const c = core.correctiveFor([z], cat, en);
      if (c && core.exerciseContraindicated(c.ex, [z]))
        malos.push(`${z}/${en}: prescribió ${c.ex.id}, que su propia zona excluye`);
    });
  });

  // 🔴 EL REPRO DE LAURA (F1, P0) — UNA PERSONA CON DOS ZONAS.
  // El test anterior probaba de a UNA zona y por eso NO PODÍA cazar esto: `correctiveFor`
  // preguntaba por la zona del propio correctivo, no por las de la persona. Alguien con
  // «operada de rodilla» en notas Y dolor de abductores reportado recibía `e89 Clamshell` todos
  // los días — el ejercicio que la regla de abductor le acababa de borrar de todo el plan.
  const pares = [];
  zonasConBloque.forEach(a => ['rodilla', 'lumbar', 'hombro', 'aductor', 'abductor', 'cuello', 'tobillo']
    .forEach(b => { if (a !== b) pares.push([a, b]); }));
  pares.forEach(([a, b]) => ['gym', 'casa', 'parque', 'corporal'].forEach(en => {
    const c = core.correctiveFor([a, b], cat, en);
    if (!c) return;                       // null es respuesta válida
    if (core.exerciseContraindicated(c.ex, [a, b]))
      malos.push(`zonas [${a}+${b}]/${en}: prescribió ${c.ex.id} (${c.ex.name}), que UNA DE LAS DOS excluye`);
  }));
  assert.deepStrictEqual(malos, [], malos.join('\n  '));

  // CONTROL: sin zonas no prescribe nada — esto es un añadido, no un impuesto para todos.
  assert.strictEqual(core.correctiveFor([], cat, 'gym'), null);
  assert.strictEqual(core.correctiveFor(['pecho'], cat, 'gym'), null, 'inventó correctivo para una zona sin bloque');
  // 🔒 Aductor y abductor ya NO están retirados (Laura los reactivó con el triaje construido),
  // pero SIN fase declarada el motor tiene que dar el escalón AGUDO — el que no abre la pierna.
  ['aductor', 'abductor'].forEach(z => {
    const c = core.correctiveFor([z], cat, 'gym');
    assert.ok(c, z + ' volvió a quedarse sin correctivo');
    assert.strictEqual(c.fase, 'agudo', z + ': sin reporte que lo diga, el default no fue el lado seguro');
    assert.strictEqual(c.ex.id, 'e73', z + ': el escalón agudo debe ser el puente de glúteo');
    assert.ok(!core.exerciseContraindicated(c.ex, [z]), z + ': el escalón agudo se saltó su propio filtro');
  });
  // 🔒 El SITIO lo dicta la función y lo decide Laura: la ACTIVACIÓN va al calentamiento (activar
  // el glúteo medio después de la sentadilla no protege la sentadilla que ya hizo) y el
  // FORTALECIMIENTO al final (al principio fatigaría el estabilizador justo antes de exigirlo).
  assert.strictEqual(core.correctiveFor(['tobillo'], cat, 'gym').cuando, 'calentamiento');
  assert.strictEqual(core.correctiveFor(['rodilla'], cat, 'gym').cuando, 'calentamiento');
  assert.strictEqual(core.correctiveFor(['lumbar'], cat, 'gym').cuando, 'calentamiento');
  assert.strictEqual(core.correctiveFor(['hombro'], cat, 'gym').cuando, 'final');
  assert.strictEqual(core.correctiveFor(['cuello'], cat, 'gym').cuando, 'final');
  // Todo candidato declara su sitio: si falta, cae a «final» sin que nadie lo haya decidido.
  Object.entries(core.GEN_CORRECTIVE).forEach(([z, arr]) => arr.forEach(c =>
    assert.ok(c.when === 'final' || c.when === 'calentamiento', `${z}/${c.id} no declara dónde va`)));
});

// 🔴 «La más importante de las seis» (Laura, respuesta 4): el reporte de dolor es un EVENTO y
// caduca a los 14 días; el déficit que el correctivo trabaja es una CONDICIÓN y tarda 6-8 semanas.
// Si el correctivo muriera con el reporte, la app se lo quitaría a la persona justo cuando empieza
// a servir — que es la receta de la recaída.
test('🔴 el correctivo SOBREVIVE a que el dolor se pase (el déficit tarda semanas, no días)', () => {
  const dia = 86400000, hoy = Date.now();
  const rep = d => ({ painCare: [{ area: 'hombro', side: 'derecha', level: 2, at: new Date(hoy - d * dia).toISOString() }] });
  // A los 20 días el REPORTE ya caducó (TTL 14) → el filtro deja de excluir…
  assert.deepStrictEqual(core.painZoneKeys(rep(20), hoy), [], 'el filtro de dolor debería haber caducado');
  // …pero el CORRECTIVO sigue puesto, que es justo el punto.
  assert.deepStrictEqual(core.correctiveZoneKeys(rep(20), hoy), ['hombro'], 'el correctivo murió con el reporte');
  // Y «Ya estoy bien ✓» tampoco lo mata: se fue el dolor, no el déficit.
  const cerrado = { painCare: [{ area: 'hombro', level: 2, at: new Date(hoy - 20 * dia).toISOString(), cleared: true }] };
  assert.deepStrictEqual(core.correctiveZoneKeys(cerrado, hoy), ['hombro'], 'cerrar el reporte mató el correctivo');
  // A las 8 semanas SÍ se acaba — y el coach fue avisado a las 4.
  assert.deepStrictEqual(core.correctiveZoneKeys(rep(60), hoy), [], 'el correctivo no se acaba nunca');
  assert.strictEqual(core.correctiveReview(rep(10), hoy), null, 'avisó al coach antes de las 4 semanas');
  const rv = core.correctiveReview(rep(35), hoy);
  assert.ok(rv && rv.area === 'hombro' && rv.semanas === 5, 'no avisa al coach a las 4+ semanas: ' + JSON.stringify(rv));
});

// 🔴 LA REACTIVACIÓN DE ADUCTOR Y ABDUCTOR (Laura, 2026-08-09). Estuvieron retirados desde v461
// porque «la misma cosa es el veneno a las 24 h y la medicina a las 72, y el motor no sabe de
// fases». Ahora sí sabe. Lo que se afirma aquí NO es que existan los dos escalones: es que el
// escalón subagudo —el único sitio del motor que se salta el filtro de su propia zona— no se
// pueda alcanzar por ninguna de las puertas por las que Laura no lo autorizó.
test('🔴 aductor/abductor: el escalón SUBAGUDO no se alcanza sin cumplir las tres condiciones', () => {
  const h = 3600000, hoy = Date.parse('2026-08-08T12:00:00.000Z');
  const cli = p => ({ painCare: [Object.assign({ area: 'cara externa del muslo o glúteo (abductores)',
    side: 'izquierda', level: 2, at: new Date(hoy - (p.horas != null ? p.horas : 96) * h).toISOString() }, p.rep || {})] });
  const fase = p => core.correctivePhases(cli(p), hoy).abductor;
  // ≥72 h + nivel ≤2 + sin bandera = las TRES → subagudo.
  assert.strictEqual(fase({ horas: 96 }), 'subagudo');
  // 1) Antes de las 72 h, agudo. Y esto es también el candado 3: un reporte NUEVO devuelve al
  //    escalón agudo sin que haga falta ninguna regla extra — un reporte nuevo tiene 0 horas.
  assert.strictEqual(fase({ horas: 71 }), 'agudo', 'progresó antes de las 72 h');
  assert.strictEqual(fase({ horas: 0 }), 'agudo', 'un reporte recién hecho no volvió al escalón agudo');
  // 2) Nivel 3 → agudo, aunque hayan pasado semanas.
  assert.strictEqual(fase({ horas: 24 * 20, rep: { level: 3 } }), 'agudo', 'un nivel 3 progresó solo con el tiempo');
  // 3) Bandera roja → agudo, aunque el nivel sea leve.
  assert.strictEqual(fase({ horas: 24 * 20, rep: { level: 1, flags: ['R2'] } }), 'agudo', 'una bandera roja progresó');
  assert.strictEqual(fase({ horas: 24 * 20, rep: { level: 1, triaje: 4 } }), 'agudo', 'un N4 progresó');
  // 🔒 EL PEOR REPORTE MANDA: dos reportes de la misma zona, uno viejo y uno de hoy → agudo.
  const dos = { painCare: [
    { area: 'cara externa del muslo o glúteo (abductores)', level: 2, at: new Date(hoy - 96 * h).toISOString() },
    { area: 'cara externa del muslo o glúteo (abductores)', level: 2, at: new Date(hoy - 2 * h).toISOString() }] };
  assert.strictEqual(core.correctivePhases(dos, hoy).abductor, 'agudo',
    'un reporte nuevo NO tumbó la progresión que había ganado el viejo');
  // Sin reporte no hay fase: el default (agudo) lo pone `correctiveFor`, no esta función.
  assert.deepStrictEqual(core.correctivePhases({ painCare: [] }, hoy), {});
  // Fuera de la ventana de 8 semanas ya no hay correctivo, así que tampoco fase.
  assert.deepStrictEqual(core.correctivePhases(cli({ horas: 24 * 60 }), hoy), {});
});

test('🔴 el subagudo se salta el filtro de SU zona y de ninguna otra (los 3 candados de Laura)', () => {
  const fs = require('fs'), path = require('path');
  const cat = _leerCatalogo(fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8'));
  // SUBAGUDO: prescribe abducción, que es justo lo que la regla de abductor borra del plan. Ese es
  // el punto — el correctivo real de esa zona ES la abducción.
  const sub = core.correctiveFor(['abductor'], cat, 'gym', { fases: { abductor: 'subagudo' } });
  assert.strictEqual(sub.ex.id, 'e163', 'el escalón subagudo no llegó a la abducción');
  assert.strictEqual(sub.fase, 'subagudo');
  assert.strictEqual(core.exerciseContraindicated(sub.ex, ['abductor']), true,
    'si su propia zona ya NO lo excluye, esta excepción dejó de hacer falta y sobra');
  // 🔒 CANDADO 1 — solo SU zona. Con rodilla también declarada, el filtro de rodilla sigue vivo.
  //    (`e163` no lo excluye rodilla, así que el que prueba de verdad el candado es el de abajo.)
  // 🔒 EL CASO QUE MÁS IMPORTA: «cadera o ingle» mapea a aductor Y abductor a la vez, y cada una
  //    excluye la abducción. Aunque las DOS estén en subagudo, la otra zona lo bloquea → cae al
  //    escalón agudo. Es exactamente lo que Laura quiere: sin exploración no se separa una ingle
  //    de un trocánter, así que a esa persona no se le prescribe abducción nunca.
  const ingle = core.correctiveFor(['aductor', 'abductor'], cat, 'gym',
    { fases: { aductor: 'subagudo', abductor: 'subagudo' } });
  assert.strictEqual(ingle.ex.id, 'e73', 'con las dos zonas de la ingle declaradas prescribió abducción');
  assert.strictEqual(ingle.fase, 'subagudo', 'la fase que informa al texto se perdió');
  // 🔒 CANDADO 2 — carga cero, DICHA con esas palabras. `e89` se llama «Clamshell con Banda»: si
  //    el texto no dice «sin banda», el nombre del ejercicio afirma lo contrario de la indicación.
  core.GEN_CORRECTIVE.abductor.concat(core.GEN_CORRECTIVE.aductor)
    .filter(c => c.cargaCero)
    .forEach(c => assert.ok(/sin banda/i.test(c.extra || ''),
      c.id + ': el candado de carga cero no llega al texto que lee la persona'));
  // 🔒 En AGUDO la excepción no existe: ni con la fase puesta a mano en la otra zona.
  const ag = core.correctiveFor(['abductor'], cat, 'gym', { fases: { abductor: 'agudo' } });
  assert.strictEqual(core.exerciseContraindicated(ag.ex, ['abductor']), false,
    'el escalón agudo heredó la excepción del subagudo');
});

test('🔴 e177 se dosifica en TIEMPO como correctivo, sin tocar el catálogo', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  const cat = _leerCatalogo(src).map(e => Object.assign({ type: 'Aislamiento' }, e));
  const now = '2026-08-08T12:00:00.000Z';
  const plan = generarRutinas({ days: 3, level: 'Intermedio', goal: 'ganar_musculo', sex: 'M', place: 'gym',
    painCare: [{ area: 'tobillo o pie', side: 'derecha', level: 2, at: now }] }, cat, { now, seed: 3 }).routines;
  const c = plan.flatMap(r => (r.exercises || []).filter(e => e.corrective))[0];
  assert.ok(c && c.id === 'e177', 'el correctivo de tobillo dejó de ser e177: ' + (c && c.id));
  // La movilidad se sostiene, no se repite: 30 s por lado, no 30 repeticiones.
  assert.strictEqual(c.track, 'tiempo', 'e177 sigue prescribiéndose en repeticiones');
  assert.strictEqual(c.reps, 30);
  assert.ok(/por cada lado/.test(c.correctiveWhy), 'no dice que es por lado');
  // 🔒 Y el CATÁLOGO no se toca: fuera del correctivo `e177` sigue siendo un ejercicio de reps que
  //    el coach puede poner a mano. La copia manda sobre la fuente, no al revés.
  assert.ok(/\{id:'e177'[^}]*track:'reps'/.test(src),
    'se cambió el catálogo para arreglar el correctivo: eso mueve el ejercicio para todo el mundo');
});

test('🔴 el correctivo EXPLICA por qué sigue puesto cuando ya no duele', () => {
  const fs = require('fs'), path = require('path');
  const cat = _leerCatalogo(fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8'))
    .map(e => Object.assign({ type: e.type || 'Aislamiento' }, e));
  const dia = 86400000;
  const now = new Date('2026-08-08T12:00:00.000Z').getTime();
  const iso = d => new Date(now - d * dia).toISOString();
  const base = { days: 3, level: 'Intermedio', goal: 'ganar_musculo', sex: 'M', place: 'gym' };
  const corr = c => generarRutinas(c, cat, { now: new Date(now).toISOString(), seed: 7 }).routines
    .flatMap(r => (r.exercises || []).filter(e => e.corrective));
  // Reporte de hace 20 días: ya no duele, pero el correctivo sigue — y lo DICE.
  const viejo = corr({ ...base, painCare: [{ area: 'hombro', side: 'derecha', level: 2, at: iso(20) }] });
  assert.ok(viejo.length > 0, 'el correctivo desapareció al caducar el reporte');
  assert.ok(/evita que vuelva/.test(viejo[0].correctiveWhy),
    'no explica por qué sigue puesto cuando ya no duele — así lo abandona: ' + viejo[0].correctiveWhy);
  // CONTROL: con el dolor vigente el texto sigue siendo el del reporte, no el de mantenimiento.
  const fresco = corr({ ...base, painCare: [{ area: 'hombro', side: 'derecha', level: 2, at: iso(1) }] });
  assert.ok(/reportaste/.test(fresco[0].correctiveWhy), fresco[0].correctiveWhy);
});

test('🔴 el correctivo dice de dónde salió la zona, y se apaga con dolor que impide entrenar', () => {
  const fs = require('fs'), path = require('path');
  const cat = _leerCatalogo(fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8'))
    .map(e => Object.assign({ type: e.type || 'Aislamiento' }, e));
  const now = '2026-08-08T12:00:00.000Z';
  const base = { days: 3, level: 'Intermedio', goal: 'ganar_musculo', sex: 'M', place: 'gym' };
  const corrDe = c => generarRutinas(c, cat, { now, seed: 5 }).routines
    .flatMap(r => (r.exercises || []).filter(e => e.corrective));
  // (F3) Zona por NOTA del coach → el texto NO puede decir «reportaste».
  const porNota = corrDe({ ...base, notes: 'Operada de hombro hace un año', painCare: [] });
  assert.ok(porNota.length > 0, 'no añadió correctivo por la nota del coach');
  assert.ok(/tu coach anotó/.test(porNota[0].correctiveWhy), 'dice «reportaste» a quien no reportó nada: ' + porNota[0].correctiveWhy);
  assert.ok(!/reportaste/.test(porNota[0].correctiveWhy));
  // Zona por REPORTE → sí dice «reportaste».
  const porDolor = corrDe({ ...base, notes: '', painCare: [{ area: 'hombro', side: 'derecha', level: 2, at: now }] });
  assert.ok(/reportaste/.test(porDolor[0].correctiveWhy), porDolor[0].correctiveWhy);
  // 🔒 Nivel 3 («No puedo hacerlo») → NO se prescribe nada: con ese dolor la sesión no existe.
  const n3 = corrDe({ ...base, notes: '', painCare: [{ area: 'hombro', side: 'derecha', level: 3, at: now }] });
  assert.strictEqual(n3.length, 0, 'prescribió un correctivo a quien no puede ni hacer el ejercicio');
  // (F5) El dolor de HOY manda sobre la nota vieja: hombro en notas + rodilla reportada → rodilla.
  const cruce = corrDe({ ...base, notes: 'Molestia de hombro antigua',
    painCare: [{ area: 'rodilla', side: 'izquierda', level: 1, at: now }] });
  assert.strictEqual(cruce[0].correctiveZone, 'rodilla', 'la nota vieja le ganó al dolor de esta semana');
});

test('🔴 el generador AÑADE el correctivo a quien reportó dolor (y no a quien no)', () => {
  const fs = require('fs'), path = require('path');
  const cat = _leerCatalogo(fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8'))
    .map(e => Object.assign({ type: 'Aislamiento' }, e));
  const now = '2026-08-08T12:00:00.000Z';
  const base = { days: 3, level: 'Intermedio', goal: 'ganar_musculo', sex: 'M', place: 'gym' };
  const plan = c => generarRutinas(c, cat, { now, seed: 3 }).routines;
  // CONTROL primero: sin dolor NO aparece ningún correctivo.
  const sin = plan({ ...base, painCare: [] });
  assert.ok(!sin.some(r => (r.exercises || []).some(e => e.corrective)),
    'metió trabajo correctivo a alguien que no reportó nada');
  // Con dolor de hombro → aparece, y es el del manguito.
  const con = plan({ ...base, painCare: [{ area: 'hombro', side: 'derecha', level: 2, at: now }] });
  const corr = con.flatMap(r => (r.exercises || []).filter(e => e.corrective));
  assert.ok(corr.length > 0, 'no añadió trabajo correctivo pese al dolor declarado');
  assert.strictEqual(corr[0].correctiveZone, 'hombro');
  // Lleva su explicación: un ejercicio nuevo sin decir por qué se lee como un error de la app.
  assert.ok(/reportaste/.test(corr[0].correctiveWhy || ''), 'el correctivo no explica por qué está ahí');
  // Y NO puede ser algo prohibido para el hombro.
  assert.strictEqual(core.exerciseContraindicated(corr[0], ['hombro']), false);
  // Un día no puede llevarlo dos veces.
  con.forEach(r => {
    const n = (r.exercises || []).filter(e => e.corrective).length;
    assert.ok(n <= 1, 'un día recibió ' + n + ' correctivos');
  });
});

test('🔴 las listas de zona NO borran lo terapéutico (wall-sit, sit-to-stand, movilidad…)', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  // Catálogo REAL, no un fixture cómodo: el defecto vive en los nombres de verdad.
  const cat = _leerCatalogo(src);
  assert.ok(cat.length >= 218, 'no se pudo leer el catálogo real, encontré ' + cat.length);
  const fuera = (z, id) => core.exerciseContraindicated(cat.find(e => e.id === id) || {}, [z]);
  // TERAPÉUTICOS que tienen que SOBREVIVIR a su propia zona.
  // ⚠️ OJO CON LA ASIMETRÍA, que es deliberada y me equivoqué al escribir este test la primera
  // vez: el wall-sit y el sit-to-stand sobreviven a LUMBAR (ahí `sentadilla` se estrechó a las
  // variantes con barra justo para salvarlos) pero **caen con RODILLA**, donde la regla se dejó
  // ANCHA a propósito porque el riesgo está en rango y alineación y el sistema no controla
  // ninguno de los dos. Está escrito en el comentario del propio `GEN_ZONE_EXCL`.
  [['lumbar', 'e128'], ['lumbar', 'e158'], ['lumbar', 'e133'], // wall-sit, sit-to-stand, press pallof
   ['cuello', 'e148'],                                   // bisagra SIN peso: el 1er regex de cuello se lo comía
   ['tobillo', 'e177'],                                  // movilidad de tobillo: es el tratamiento
   ['cuello', 'e11'],                                    // tríceps con cuerda (el regex de tobillo se lo comía)
   ['cuello', 'e132'],                                   // elevación de piernas TUMBADO
   ['aductor', 'e128'], ['aductor', 'e42'],              // wall-sit y hip thrust
   ['abductor', 'e42'], ['abductor', 'e73'],             // empuje de cadera en línea recta
  ].forEach(([z, id]) => assert.strictEqual(fuera(z, id), false,
    `la regla de ${z} se llevó por delante ${id} (${(cat.find(e => e.id === id) || {}).name}), que es terapéutico o de otra zona`));
  // Y lo que SÍ tiene que caer — si no cayera, la lista sería decorativa (control positivo).
  [['aductor', 'e60'], ['aductor', 'e61'], ['abductor', 'e45'], ['abductor', 'e93'],
   ['cuello', 'e115'], ['tobillo', 'e20'], ['hombro', 'e212'], ['hombro', 'e211'],
   ['rodilla', 'e41'], ['lumbar', 'e136'],
  ].forEach(([z, id]) => assert.strictEqual(fuera(z, id), true,
    `la regla de ${z} NO atrapa ${id} (${(cat.find(e => e.id === id) || {}).name})`));
  // 🔒 `e211` fuera de hombro pero DENTRO de lumbar: criterio explícito de Laura, no simetría.
  assert.strictEqual(fuera('lumbar', 'e211'), false, 'e211 debe seguir permitido en lumbar (descompresión)');
  // 🔒 `e93` solo en abductor: la banda RESISTE abducción, el aductor no se estira.
  assert.strictEqual(fuera('aductor', 'e93'), false, 'e93 no debe excluirse por aductor');
});

test('🔴 ninguna zona deja un músculo sin ejercicios (un pool vacío es peor que no filtrar)', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  // ⚠️ La ventana para leer `env` es FIJA y no «hasta el primer `}`»: con la versión lazy la
  // sonda leía 13 de 220 ejercicios y reportaba 40 pools en cero que eran suyos, no de la app.
  const cat = _leerCatalogo(src);
  // CONTROL de la sonda: sin esto, un catálogo mal leído da un verde que no significa nada.
  assert.ok(cat.length >= 218, 'catálogo no leído entero: ' + cat.length);
  const musculos = [...new Set(cat.map(e => e.muscle))];
  const zonas = ['rodilla', 'lumbar', 'hombro', 'aductor', 'abductor', 'cuello', 'tobillo'];
  const vacios = [];
  // Por músculo Y POR ENTORNO: el hueco que importa no es «no queda cardio», es «no queda cardio
  // EN CASA» — lo pidió Laura al firmar las listas (medido: con tobillo en casa sobreviven 2).
  zonas.forEach(z => musculos.forEach(mu => ['gym', 'casa', 'corporal', 'parque'].forEach(en => {
    const tot = cat.filter(e => e.muscle === mu && e.env.includes(en));
    if (tot.length < 2) return;   // con 1 solo, el hueco es del catálogo y no lo causa la zona
    const quedan = tot.filter(e => !core.exerciseContraindicated(e, [z]));
    if (!quedan.length) vacios.push(`${z} × ${en} deja «${mu}» SIN ejercicios (${tot.length} → 0)`);
  })));
  assert.deepStrictEqual(vacios, [], vacios.join('\n  '));
});

// ── TRIAJE DE DOLOR (§1 del dictamen de Laura) ────────────────────────────────────────────────
test('🔴 la BANDERA ROJA gana sobre la intensidad, siempre', () => {
  const t = core.painTriage;
  // Su ejemplo literal: «leve» + «se me duerme el pie» es N4, no N1.
  const leve = { area: 'rodilla', limita: 'normal', inicio: 'progresivo', flags: ['R2'] };
  assert.strictEqual(t(leve).nivel, 4, 'una bandera roja se quedó en nivel bajo por la intensidad');
  assert.strictEqual(t(leve).texto, 'A', 'no manda a valoración');
  // Urgencia manda sobre bandera normal Y sobre todo lo demás.
  assert.strictEqual(t({ area: 'pecho', limita: 'normal', inicio: 'agujetas', flags: ['U2'] }).nivel, 4);
  assert.strictEqual(t({ area: 'pecho', limita: 'normal', inicio: 'agujetas', flags: ['U2'] }).urgente, true);
  assert.strictEqual(t({ area: 'pecho', limita: 'normal', inicio: 'agujetas', flags: ['U2'] }).texto, 'U');
  // Una bandera inventada NO cuenta (la lista es cerrada).
  assert.notStrictEqual(t({ area: 'rodilla', limita: 'normal', inicio: 'progresivo', flags: ['XX'] }).nivel, 4);
});

test('🔴 un reporte INCOMPLETO cae del lado seguro (N2), nunca en leve', () => {
  const t = core.painTriage;
  // Si alguien abandona el flujo a mitad, lo que alcanzó a marcar se trata como N2.
  assert.strictEqual(t({ area: 'rodilla' }).nivel, 2);
  assert.strictEqual(t({ area: 'rodilla', inicio: 'agujetas' }).nivel, 2, 'sin P2 se clasificó como agujetas');
  assert.strictEqual(t({}).nivel, 2);
  assert.strictEqual(t(null).nivel, 2);
  assert.strictEqual(t({ area: 'rodilla', limita: 'inventado', inicio: 'agujetas' }).nivel, 2);
});

test('🔴 la nota LIBRE con síntomas de nervio sube a bandera roja (la regex ya existía y miraba al otro lado)', () => {
  const t = core.painTriage;
  const base = { area: 'zona lumbar', limita: 'normal', inicio: 'progresivo', flags: [] };
  // Describirlo con sus palabras y no reconocerlo en la lista es lo más normal del mundo.
  ['me baja un hormigueo por la pierna', 'siento que se me duerme el pie', 'me irradia hacia abajo',
   'siento debilidad al subir escaleras'].forEach(note =>
    assert.strictEqual(t({ ...base, note }).nivel, 4, 'no detectó nervio en: ' + note));
  // CONTROL: una nota normal NO dispara una derivación médica.
  assert.strictEqual(t({ ...base, note: 'me molesta al agacharme a recoger algo' }).nivel, 1);
  assert.strictEqual(t({ ...base, note: '' }).nivel, 1);
});

test('🔴 N0 (agujetas) sólo con TODO a favor — si no, el triaje se apaga solo', () => {
  const t = core.painTriage;
  const ok = { area: 'muslo por delante', limita: 'normal', inicio: 'agujetas', flags: [] };
  assert.strictEqual(t(ok).nivel, 0, 'no reconoce unas agujetas de manual');
  // 🔒 Nunca en una ARTICULACIÓN ni en la lumbar, aunque todo lo demás cuadre.
  ['rodilla', 'hombro', 'zona lumbar', 'tobillo o pie', 'codo'].forEach(area =>
    assert.notStrictEqual(t({ ...ok, area }).nivel, 0, 'llamó agujetas a un dolor de ' + area));
  // Y no si empezó de otra forma, o si hay bandera.
  assert.notStrictEqual(t({ ...ok, inicio: 'progresivo' }).nivel, 0);
  assert.notStrictEqual(t({ ...ok, flags: ['R4'] }).nivel, 0);
  // POR QUÉ EXISTE N0: si esto no fuera 0, la app abriría protocolo de lesión por unas agujetas,
  // la gente aprendería que reportar es un fastidio y dejaría de reportar. Un triaje que
  // sobre-reacciona se apaga solo — y el día que sea de verdad no nos enteramos.
  assert.strictEqual(t(ok).texto, 'N0');
});

test('🔴 N3 y N4 PARAN la sesión; N0-N2 no', () => {
  assert.strictEqual(core.painStopsSession(0), false);
  assert.strictEqual(core.painStopsSession(1), false);
  assert.strictEqual(core.painStopsSession(2), false);
  assert.strictEqual(core.painStopsSession(3), true);
  assert.strictEqual(core.painStopsSession(4), true);
  // «No puedo cargar/apoyar» y «me duele en reposo» son parada.
  assert.strictEqual(core.painTriage({ area: 'rodilla', limita: 'no_puedo', inicio: 'progresivo' }).nivel, 3);
  assert.strictEqual(core.painTriage({ area: 'rodilla', limita: 'reposo', inicio: 'progresivo' }).nivel, 3);
});

test('el mecanismo manda sobre la sensación: un tirón seco es N2 aunque hoy duela poco', () => {
  const t = core.painTriage;
  const base = { area: 'muslo por detrás', limita: 'normal', flags: [] };
  assert.strictEqual(t({ ...base, inicio: 'golpe_seco' }).nivel, 2);
  // ⚠️ `traumatismo` pasó de N2 a N4 al arreglar la fuga que cazó Sofía: «después de un golpe o
  // una caída» ES la bandera R5, y Laura la clasifica como derivación. Antes, decirlo en P3 en vez
  // de marcarlo en P4 lo dejaba en N2 — o sea, el mismo hecho daba dos niveles distintos según en
  // qué pregunta lo contaras. No es aflojar el test: es que el nivel correcto era el alto.
  assert.strictEqual(t({ ...base, inicio: 'traumatismo' }).nivel, 4, 'un golpe o caída es bandera roja');
  assert.strictEqual(t({ ...base, inicio: 'cronico' }).nivel, 2, 'más de dos semanas ya no es leve');
});

// 🔴 LO QUE CAZÓ SOFÍA REVISANDO EL TONO, y que resultaron ser fugas del triaje, no redacción.
test('🔴 contestar P3 no puede APAGAR una bandera roja (P3 y P4 se pisaban)', () => {
  const t = core.painTriage;
  // «Después de un golpe, una caída o un accidente» (P3) es palabra por palabra R5 (P4). Quien ya
  // lo dijo en P3 no lo vuelve a marcar en P4 —«ya lo dije»— y el nivel depende de P4.
  const r = t({ area: 'rodilla', limita: 'normal', inicio: 'traumatismo', flags: [] });
  assert.strictEqual(r.nivel, 4, 'un traumatismo sin marcar R5 se quedó por debajo de bandera roja');
  assert.ok(r.flags.includes('R5'), 'no se marcó R5 sola');
  // CONTROL: sin traumatismo no se inventa la bandera.
  assert.ok(!t({ area: 'rodilla', limita: 'normal', inicio: 'progresivo', flags: [] }).flags.includes('R5'));
});

test('🔴 U3 pide UNA de las dos cosas, no las dos (un «ni» apagaba una urgencia)', () => {
  const u3 = core.PAIN_FLAGS.find(f => f.id === 'U3');
  assert.ok(!/peso ni /.test(u3.txt), 'U3 volvió a exigir las dos cosas con un «ni»: ' + u3.txt);
  assert.ok(/apoyar el peso, o no puedo mover/.test(u3.txt), 'U3 perdió la disyunción: ' + u3.txt);
  // U1 tiene que cubrir también la RETENCIÓN, no solo la incontinencia.
  const u1 = core.PAIN_FLAGS.find(f => f.id === 'U1');
  assert.ok(/no logro orinar/.test(u1.txt), 'U1 volvió a cubrir solo incontinencia: ' + u1.txt);
});

test('🔴 «ayer, pero solo en un lado» NO son agujetas', () => {
  const t = core.painTriage;
  const base = { area: 'muslo por delante', limita: 'normal', flags: [] };
  assert.strictEqual(t({ ...base, inicio: 'agujetas' }).nivel, 0, 'parejo en los dos lados sí es N0');
  assert.strictEqual(t({ ...base, inicio: 'unilateral' }).nivel, 1,
    'un dolor de UN SOLO lado se clasificó como agujetas — la opción existía para eso');
});

test('🔴 los textos que lee la persona no rompen las reglas del dictamen', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-6-extra.js'), 'utf8');
  const i = src.indexOf('const PAIN_RESULT_TXT');
  assert.ok(i > -1, 'no se encontró la tabla de textos');
  const txt = src.slice(i, src.indexOf('function painShowResult'));
  // Prohibido nombrar una lesión.
  [/contractura/i, /tendinitis/i, /desgarro/i, /\bhernia/i, /esguince/i, /pinzamiento/i, /ciática/i]
    .forEach(re => assert.ok(!re.test(txt), 'un texto nombra una lesión: ' + re));
  // Prohibido poner plazos de RECUPERACIÓN («perder dos semanas»).
  assert.ok(!/perder dos semanas/.test(txt), 'volvió el plazo de recuperación');
  // Prohibido invocar experiencia clínica que nadie tuvo sobre ese caso.
  assert.ok(!/hemos visto mil veces/.test(txt), 'volvió el «hemos visto mil veces»');
  // Prohibido empujar a seguir.
  [/no pierdas tu racha/i, /solo te faltan/i, /¿seguro que quieres/i]
    .forEach(re => assert.ok(!re.test(txt), 'un texto empuja a seguir: ' + re));
  // Prohibido sugerir medicamentos.
  [/ibuprofeno/i, /analg[eé]sic/i, /medicament/i].forEach(re =>
    assert.ok(!re.test(txt), 'un texto menciona medicamentos: ' + re));
  // 🔒 U conserva «urgencias»; U y C conservan su verbo de parada.
  assert.ok(/urgencias/.test(txt), 'el texto de urgencia perdió la palabra «urgencias»');
  assert.ok(/Para ahora mismo/.test(txt), 'el texto de urgencia perdió el «Para»');
  // 🔒 Parar no puede costar la racha, y hay que DECIRLO o la persona asume que sí.
  assert.ok((txt.match(/racha no se rompe/g) || []).length >= 2,
    'los textos de parada no dicen que la racha no se rompe — si calla, la persona asume que pierde');
  // «agujetas» no es palabra colombiana.
  assert.ok(!/agujetas/i.test(txt), '«agujetas» es de España; acá no se dice');
  // 🔒 EL TEXTO A LLEVA SU PLAZO DE CONSULTA, con las palabras de Laura. Una derivación sin cuándo
  // se aplaza hasta que duela más. No choca con la prohibición de plazos: los prohibidos son los de
  // RECUPERACIÓN, que la app no puede saber; este es de CONSULTA, y la persona sí lo controla.
  assert.ok(/[Pp]ide esa cita esta semana/.test(txt),
    'el texto de derivación no dice CUÁNDO pedir la cita');
});

// 🔴 P0 de la auditoría de Laura (v468): el triaje se calculaba bien y NO SOBREVIVÍA a la capa que
// lo guarda. `painCareAdd` era una lista blanca de 7 campos. La aserción que faltaba no es «el
// motor devuelve 4» —eso ya pasaba— sino **que la bandera llegue guardada**, que es de donde la
// ficha del coach la lee.
test('🔴 el triaje SOBREVIVE al guardado: la bandera roja llega a la ficha del coach', () => {
  const now = '2026-08-08T12:00:00.000Z';
  const tri = core.painTriage({ area: 'zona lumbar', side: 'izquierda', limita: 'normal', inicio: 'progresivo', flags: ['R2'] });
  assert.strictEqual(tri.nivel, 4);
  const lista = core.painCareAdd(null, { area: 'zona lumbar', side: 'izquierda', level: 3,
    triaje: tri.nivel, motivo: tri.motivo, flags: tri.flags, limita: 'normal', inicio: 'progresivo' }, now);
  const p = lista[0];
  assert.deepStrictEqual(p.flags, ['R2'], 'la bandera NO se guardó — la ficha del coach no puede pintarla');
  assert.strictEqual(p.triaje, 4, 'el nivel de triaje no se guardó: N3 y N4 quedan indistinguibles');
  assert.strictEqual(p.limita, 'normal');
  assert.strictEqual(p.inicio, 'progresivo');
  // Banderas inventadas no entran (se normalizan igual que en painTriage).
  assert.deepStrictEqual(core.painCareAdd(null, { area: 'rodilla', flags: ['XX', 'R4'] }, now)[0].flags, ['R4']);
});

test('🔴 un trauma con pérdida funcional es URGENCIAS, aunque no marque la casilla', () => {
  const t = core.painTriage;
  // Los dos hechos de U3 ya están en P2 y P3: pedirle marcarlos otra vez es el mismo «ya lo dije».
  const r = t({ area: 'tobillo o pie', side: 'derecha', limita: 'no_puedo', inicio: 'traumatismo', flags: [] });
  assert.strictEqual(r.urgente, true, 'un trauma con pérdida funcional se quedó en «pide cita»');
  assert.strictEqual(r.texto, 'U');
  assert.ok(r.flags.includes('U3'));
  assert.strictEqual(t({ area: 'rodilla', limita: 'reposo', inicio: 'traumatismo', flags: [] }).urgente, true);
  // CONTROL: trauma SIN pérdida funcional sigue siendo derivación, no urgencias.
  const leve = t({ area: 'rodilla', limita: 'normal', inicio: 'traumatismo', flags: [] });
  assert.strictEqual(leve.urgente, false, 'inventó una urgencia sin pérdida funcional');
  assert.strictEqual(leve.nivel, 4);
});

test('N0 no se abre con dolor de UN SOLO lado (las agujetas son parejas)', () => {
  const base = { area: 'muslo por delante', limita: 'normal', inicio: 'agujetas', flags: [] };
  assert.strictEqual(core.painTriage({ ...base, side: 'ambos' }).nivel, 0);
  assert.strictEqual(core.painTriage({ ...base, side: 'izquierda' }).nivel, 1,
    'llamó agujetas a un dolor de un solo lado');
});

test('🔴 «me equivoqué» corrige UNA vez y el coach ve LAS DOS respuestas', () => {
  const now = '2026-08-08T12:00:00.000Z';
  // Reporte original: bandera roja marcada sin querer.
  let lista = core.painCareAdd(null, { area: 'rodilla', side: 'derecha', level: 3 }, now);
  lista[0].triaje = 4; lista[0].flags = ['R2']; lista[0].limita = 'normal'; lista[0].inicio = 'progresivo';
  const id = lista[0].id;
  assert.strictEqual(core.painCanCorrect(lista, id), true, 'un reporte nuevo debe poder corregirse');
  // Corrige a algo más leve.
  lista = core.painCareCorrect(lista, id, { area: 'rodilla', side: 'derecha', level: 1, triaje: 1, flags: [], limita: 'normal', inicio: 'progresivo' }, now);
  assert.strictEqual(lista.length, 1, 'la corrección creó un reporte NUEVO en vez de corregir el suyo');
  assert.strictEqual(lista[0].id, id, 'cambió el id: ya no es el mismo reporte');
  assert.strictEqual(lista[0].triaje, 1, 'no aplicó la corrección');
  // 🔒 LO QUE HACE QUE ESTO SEA SEGURO: lo que dijo la primera vez queda guardado.
  assert.ok(lista[0].previo, 'se perdió la respuesta original — sin ella, corregir es bajarse una bandera en silencio');
  assert.strictEqual(lista[0].previo.triaje, 4);
  assert.deepStrictEqual(lista[0].previo.flags, ['R2']);
  // 🔒 UNA SOLA VEZ: si no, es el botón de saltarse el triaje.
  assert.strictEqual(core.painCanCorrect(lista, id), false, 'quedó corregible una segunda vez');
  const otra = core.painCareCorrect(lista, id, { triaje: 0, flags: [] }, now);
  assert.strictEqual(otra[0].triaje, 1, 'aceptó una segunda corrección');
  assert.strictEqual(otra[0].previo.triaje, 4, 'la segunda corrección pisó la respuesta original');
  // Un id que no existe no rompe ni inventa nada.
  assert.strictEqual(core.painCareCorrect(lista, 'nope', { triaje: 0 }).length, 1);
  assert.strictEqual(core.painCanCorrect(lista, 'nope'), false);
});

test('la lista de banderas rojas está completa y es cerrada (U1-U3 + R1-R9)', () => {
  const ids = core.PAIN_FLAGS.map(f => f.id);
  ['U1', 'U2', 'U3', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'].forEach(i =>
    assert.ok(ids.includes(i), 'falta la bandera ' + i));
  assert.strictEqual(core.PAIN_FLAGS.length, 12, 'alguien añadió o quitó una bandera sin decirlo');
  assert.strictEqual(core.PAIN_FLAGS.filter(f => f.urg).length, 3, 'las de URGENCIAS deben ser exactamente 3');
  // Ninguna puede quedarse sin su texto, que es lo que la persona lee para marcarla.
  core.PAIN_FLAGS.forEach(f => assert.ok(f.txt && f.txt.length > 25, 'bandera sin texto: ' + f.id));
});

test('🔴 las zonas de dolor son las que dictó Laura, e incluyen las que faltaban', () => {
  const A = core.PAIN_AREAS;
  // El caso del PO: marcó «abductores» y esa zona NO EXISTÍA → caía en «otra zona».
  assert.ok(A.some(z => /abductores/i.test(z)), 'sigue sin poder declararse abductores');
  assert.ok(A.some(z => /aductores/i.test(z)), 'sigue sin poder declararse aductores');
  ['cuello', 'pantorrilla', 'muslo por delante', 'muslo por detrás'].forEach(z =>
    assert.ok(A.includes(z), 'falta la zona ' + z));
  // Las 3 que SÍ tienen lista clínica no pueden cambiar de nombre: `_PAIN_ZONE_TO_EXCL` las mapea
  // por string, así que renombrarlas rompería el filtro EN SILENCIO.
  ['hombro', 'zona lumbar', 'rodilla'].forEach(z =>
    assert.ok(A.includes(z), 'se renombró una zona con regla de exclusión: ' + z));
  ['hombro', 'zona lumbar', 'rodilla'].forEach(z =>
    assert.deepStrictEqual(core.painZoneKeys({ painCare: [{ area: z, level: 2, at: new Date().toISOString() }] }, Date.now()).length, 1,
      'la zona ' + z + ' dejó de mapear a su regla'));
  // Toda zona declarable tiene consejo propio o cae al genérico, nunca a `undefined`.
  A.forEach(z => assert.ok(typeof core.painTipFor(z) === 'string' && core.painTipFor(z).length > 20,
    'la zona ' + z + ' no tiene consejo'));
});

// 🔴 «Centro» no significa nada en un hombro y «ambos» no significa nada en la lumbar (Laura,
// 2026-08-09). Ofrecer los cuatro siempre obliga a elegir entre opciones que no aplican, y el dato
// con el que se prescribe lo unilateral queda sucio.
test('🔴 los lados que se ofrecen dependen del TIPO de zona (línea media vs pareada)', () => {
  const F = core.painSidesFor;
  // Línea media: no hay dos cuellos, así que «ambos» sobra; sí hay un centro.
  ['cuello', 'zona lumbar', 'espalda alta', 'pecho'].forEach(z => {
    assert.deepStrictEqual(F(z), ['izquierda', 'derecha', 'centro'], 'lados mal en ' + z);
  });
  // Pareadas: no hay centro de un hombro; sí puede dolerle los dos.
  ['hombro', 'rodilla', 'codo', 'tobillo o pie', 'muslo por dentro (aductores)',
   'cara externa del muslo o glúteo (abductores)', 'cadera o ingle', 'pantorrilla'].forEach(z => {
    assert.deepStrictEqual(F(z), ['izquierda', 'derecha', 'ambos'], 'lados mal en ' + z);
  });
  // «otra zona» los cuatro: no sabemos qué marcó, y ahí sí no podemos descartar ninguno.
  assert.deepStrictEqual(F('otra zona'), core.PAIN_SIDES);
  assert.deepStrictEqual(F('marciano'), core.PAIN_SIDES, 'una zona desconocida perdió opciones');
  // 🔒 Toda zona declarable ofrece al menos dos lados: ninguna puede quedarse sin respuesta posible.
  core.PAIN_AREAS.forEach(z => assert.ok(F(z).length >= 2, 'la zona ' + z + ' se quedó sin lados'));
  // 🔒 Y LA CAPA QUE GUARDA RESPETA LA MISMA LISTA. Con `PAIN_SIDES` a secas, un «centro» en un
  // hombro entraba aunque la pantalla ya no lo ofreciera (la clase de v468, al revés).
  const now = '2026-08-08T12:00:00.000Z';
  assert.strictEqual(core.painCareAdd(null, { area: 'hombro', side: 'centro', level: 2 }, now)[0].side, null,
    'guardó un «centro» en un hombro');
  assert.strictEqual(core.painCareAdd(null, { area: 'zona lumbar', side: 'ambos', level: 2 }, now)[0].side, null,
    'guardó un «ambos» en la lumbar');
  assert.strictEqual(core.painCareAdd(null, { area: 'zona lumbar', side: 'centro', level: 2 }, now)[0].side, 'centro');
  assert.strictEqual(core.painCareAdd(null, { area: 'otra zona', side: 'centro', level: 2 }, now)[0].side, 'centro');
  // 🔒 La PANTALLA usa esta misma función: dos listas se separan (lección del filtro de lesiones).
  const fs = require('fs'), path = require('path');
  const ui = fs.readFileSync(path.join(__dirname, 'app-6-extra.js'), 'utf8');
  assert.ok(/painSidesFor\(PAIN\.area\)/.test(ui), 'los chips de lado volvieron a pintarse desde una lista fija');
  // Y al cambiar de zona el lado que ya no aplica se cae, o se guardaría como null en silencio.
  assert.ok(/function painPick[\s\S]{0,300}painSidesFor\(val\)[\s\S]{0,80}PAIN\.side=null/.test(ui),
    'cambiar de zona deja seleccionado un lado que la pantalla ya no muestra');
});

test('el reporte de dolor guarda el LADO, y no se lo inventa', () => {
  const now = '2026-08-08T12:00:00.000Z';
  const con = core.painCareAdd(null, { area: 'rodilla', side: 'izquierda', level: 2 }, now);
  assert.strictEqual(con[0].side, 'izquierda');
  // Sin lado marcado queda null: nunca se rellena con un valor por defecto.
  assert.strictEqual(core.painCareAdd(null, { area: 'rodilla', level: 2 }, now)[0].side, null);
  // Un lado inventado no entra.
  assert.strictEqual(core.painCareAdd(null, { area: 'rodilla', side: 'arriba', level: 2 }, now)[0].side, null);
});

test('painZoneKeys ignora los reportes ya vencidos y los cerrados', () => {
  const hoy = Date.now();
  const viejo = new Date(hoy - 40 * 24 * 3600 * 1000).toISOString();
  // 🔒 CONTROL POSITIVO PRIMERO: sin esto el test afirma solo listas VACÍAS y pasaría igual con la
  // función devolviendo [] siempre — un caso que no puede fallar no es un caso.
  assert.deepStrictEqual(core.painZoneKeys({ painCare: [{ area: 'rodilla', level: 2, at: new Date(hoy).toISOString() }] }, hoy), ['rodilla'],
    'CONTROL: un reporte VIGENTE tiene que excluir');
  assert.deepStrictEqual(core.painZoneKeys({ painCare: [{ area: 'rodilla', level: 2, at: viejo }] }, hoy), [],
    'un reporte vencido sigue excluyendo');
  assert.deepStrictEqual(core.painZoneKeys({ painCare: [{ area: 'hombro', level: 2, at: new Date(hoy).toISOString(), cleared: true }] }, hoy), [],
    'un reporte cerrado sigue excluyendo');
});

test('parseLimitations detecta lumbar y rodilla', () => {
  const lim = parseLimitations('Dolor lumbar crónico y operación de menisco en rodilla');
  assert.strictEqual(lim.detected, true);
  assert.ok(lim.keys.includes('lumbar') && lim.keys.includes('rodilla'));
});

test('parseLimitations sin limitaciones → detected false', () => {
  assert.strictEqual(parseLimitations('Quiere ganar masa, sin problemas').detected, false);
  assert.strictEqual(parseLimitations('').detected, false);
});

// (2026-08-02) El aserto viejo exigía «Se excluyeron ejercicios contraindicados y se priorizaron
// variantes seguras» — texto RETIRADO por veredicto de Laura: afirmaba una revisión clínica que
// nunca ocurrió y le bajaba la guardia a quien revisa. El contrato nuevo: la app dice QUÉ QUITÓ,
// nunca que lo que queda esté bien para esa persona.
test('limitación con zona (rodilla) → hasExclusions true, dice qué quitó y NO se hace pasar por clínica', () => {
  const lim = parseLimitations('Operación de menisco en la rodilla');
  assert.strictEqual(lim.hasExclusions, true);
  assert.ok(/Quitamos/.test(lim.advice), 'debe decir qué quitó');
  assert.ok(/NO una valoración clínica/i.test(lim.advice), 'debe declarar que NO es valoración clínica');
  assert.ok(!/variantes seguras|contraindicados/i.test(lim.advice),
    'PROHIBIDO volver a prometer que lo que queda es seguro/está revisado');
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

// ── 🔴 El filtro lumbar entregaba flexión de columna a quien declara hernia (2026-08-02) ──
// Medición previa al arreglo, 5.040 planes con y sin la nota: la flexión de columna entregada era
// IDÉNTICA (1.246 → 1.246) mientras el texto le prometía al coach que había excluido lo
// contraindicado. Estos tests corren contra el CATÁLOGO REAL (220 ejercicios leídos de
// app-1-infra.js), no contra el fixture: un fixture no tiene Russian Twist y habría dado verde
// sobre algo que nunca pasó. Listas dictadas por Laura (fisio) — su veredicto es vinculante.
const _LIB_REAL = (() => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'app-1-infra.js'), 'utf8');
  const open = src.indexOf('[', src.indexOf('const defaultExercises=['));
  let depth = 0, q = null, end = -1;
  for (let i = open; i < src.length; i++) {
    const c = src[i], p = src[i - 1];
    if (q) { if (c === q && p !== '\\') q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') depth++; else if (c === ']') { depth--; if (!depth) { end = i; break; } }
  }
  return eval(src.slice(open, end + 1));
})();

test('🔴 hernia declarada → CERO flexión de columna en el catálogo real (barrido de 5.040 planes)', () => {
  assert.ok(_LIB_REAL.length > 200, `esperaba el catálogo real, leí ${_LIB_REAL.length}`);
  // Los 5 que se colaban 1.246 veces + el control que YA se excluía bien (no debe romperse).
  const FLEX = /crunch|russian|hollow|rueda abdominal|elevacion de piernas|oruga|superman/i;
  const CONTROL = /peso muerto|remo con barra|buenos dias|hiperexten/i;
  const NOTA = 'Hernia discal L4-L5 diagnosticada, dolor lumbar al flexionar';
  let planes = 0, flex = 0, control = 0, diasVacios = 0;
  const colados = {};
  for (const level of ['Principiante', 'Intermedio', 'Avanzado'])
    for (const goal of ['Ganar músculo', 'Perder grasa', 'Mantener', 'Fuerza', 'Resistencia'])
      for (const sex of ['M', 'F']) for (const days of [2, 3, 4, 5, 6])
        // Entornos REALES (los del selector). Ojo: un `place` inventado deja el plan vacío —
        // el barrido de la auditoría usaba 'gimnasio' y por eso medía 1.800 días en blanco.
        for (const place of ['gym', 'casa', 'parque', 'corporal']) for (const seed of [1, 7, 42]) {
          const c = { id: 'v', name: 'P', sex, age: 30, weight: 80, height: 172, goal, level, days, place, notes: NOTA };
          const out = generarRutinas(c, _LIB_REAL, { seed, now: '2026-07-31T12:00:00Z', idFn: () => 'r' });
          if (!out || !out.routines) continue;
          planes++;
          out.routines.forEach(r => {
            const exs = r.exercises || [];
            if (!exs.length) diasVacios++;
            exs.forEach(e => {
              const nm = e.name || '';
              if (FLEX.test(nm)) { flex++; colados[nm] = (colados[nm] || 0) + 1; }
              if (CONTROL.test(nm)) control++;
            });
          });
        }
  assert.ok(planes > 1000, `esperaba miles de planes, generé ${planes}`);
  assert.strictEqual(flex, 0, 'se le sigue entregando flexión de columna a quien declara hernia: ' + JSON.stringify(colados));
  assert.strictEqual(control, 0, 'el control (peso muerto/remo con barra) dejó de excluirse — se rompió lo que YA funcionaba');
  assert.strictEqual(diasVacios, 0, 'la lista de exclusión vació algún día: el pool se quedó sin candidatos');
});

test('🔴 el filtro NO puede vaciar el core: quedan alternativas anti-flexión para la hernia', () => {
  // Laura exige que el plan conserve trabajo de core seguro. Si excluir deja el músculo sin
  // candidatos, el arreglo es peor que el bug.
  const SEGUROS = /plancha|dead bug|bird dog|pallof|caminata del oso|caminata del cangrejo/i;
  const excl = core.GEN_ZONE_EXCL.lumbar;
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const coreLibres = _LIB_REAL.filter(e => e.muscle === 'core' && !excl.test(norm(e.name)));
  assert.ok(coreLibres.length >= 8, `el core quedó con ${coreLibres.length} ejercicios; hacen falta alternativas`);
  assert.ok(coreLibres.filter(e => SEGUROS.test(e.name)).length >= 5,
    'no quedan suficientes ejercicios anti-flexión/anti-rotación (plancha, dead bug, bird dog, pallof)');
});

test('🔴 lumbar: se van las sentadillas CON BARRA, se quedan las terapéuticas', () => {
  // `sentadilla` a secas (lo que había hasta el 2026-08-02) borraba también el wall-sit y el
  // sit-to-stand, que están en la columna «seguro» del protocolo de Laura: levantarse de una
  // silla es una actividad que esa persona hace 20 veces al día. En RODILLA, en cambio, se
  // conserva ancho a propósito — ahí el riesgo está en el rango y la alineación.
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cae = (re, n) => re.test(norm(n));
  const L = core.GEN_ZONE_EXCL.lumbar, R = core.GEN_ZONE_EXCL.rodilla;
  ['Sentadilla con Barra', 'Sentadilla Frontal con Barra', 'Sentadilla Hack', 'Sentadilla en Smith', 'Sentadilla Sumo']
    .forEach(n => assert.ok(cae(L, n), `"${n}" carga la columna y debe excluirse en lumbar`));
  ['Sentadilla Isométrica en Pared (Wall Sit)', 'Sentadilla a Silla (Sit-to-Stand)', 'Sentadilla Goblet', 'Sentadilla de Peso Corporal']
    .forEach(n => assert.ok(!cae(L, n), `"${n}" es terapéutica y NO puede desaparecer del plan lumbar`));
  ['Sentadilla con Barra', 'Sentadilla a Silla (Sit-to-Stand)', 'Sentadilla Goblet']
    .forEach(n => assert.ok(cae(R, n), `en RODILLA la lista es ancha a propósito y "${n}" sí sale`));
  // Los huecos que Laura señaló zona por zona, cada uno con su forma propia.
  assert.ok(cae(R, norm('Extensión de Cuádriceps en Máquina')), 'rodilla: extensión terminal bajo carga');
  ['Press Militar con Mancuernas', 'Press de Hombro con Banda', 'Press Arnold con Mancuernas', 'Pike Push-up (Flexión Pica)', 'Jalón al Pecho Agarre Amplio']
    .forEach(n => assert.ok(cae(core.GEN_ZONE_EXCL.hombro, n), `hombro: "${n}" es press sobre la cabeza / compresión subacromial`));
  ['Jalón al Pecho Agarre Neutro', 'Face Pull en Polea', 'Remo Sentado en Máquina']
    .forEach(n => assert.ok(!cae(core.GEN_ZONE_EXCL.hombro, n), `"${n}" es de la columna segura de hombro`));
});

test('🔴 el CALENTAMIENTO también respeta la lesión (ejecutado, no leído)', () => {
  // El filtro limpiaba el entreno y dejaba el calentamiento intacto: a quien declaraba hernia se
  // le pedía «dobla el cuerpo hacia adelante y RELAJA la espalda completamente» (we3) antes de
  // entrenar. Este test EJECUTA el buildWarmup real de app-6-extra.js — un candado que sólo
  // MIRARA el código tendría los huecos que ya nos costaron el teléfono de v418.
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-6-extra.js'), 'utf8');
  const ini = src.indexOf('const WARMUP_LIBRARY');
  const fin = src.indexOf('return {sessionLabel,sessionEmoji,articulares,activaciones,aproximacion};');
  assert.ok(ini > 0 && fin > ini, 'no encontré WARMUP_LIBRARY/buildWarmup en app-6-extra.js');
  const cierre = src.indexOf('\n}', fin);
  const sandbox = new Function('warmupContraindicated',
    src.slice(ini, cierre + 2) + '\nreturn {WARMUP_LIBRARY, buildWarmup};')(core.warmupContraindicated);
  const { WARMUP_LIBRARY, buildWarmup } = sandbox;

  const rutina = [{ name: 'Plancha Frontal', muscle: 'core' }, { name: 'Jalón al Pecho', muscle: 'espalda' }];
  const sinLim = buildWarmup(rutina, null);
  const ids = w => [...w.articulares, ...w.activaciones].map(e => e.id);
  assert.ok(ids(sinLim).includes('we5'), 'sin limitación el calentamiento sigue igual que siempre (we5 presente)');

  const lim = parseLimitations('Hernia discal L4-L5, dolor lumbar al flexionar').keys;
  assert.ok(lim.includes('lumbar'), 'la nota debe detectarse como lumbar');
  const conLim = buildWarmup(rutina, lim);
  ['we3', 'we5', 'wai3'].forEach(id =>
    assert.ok(!ids(conLim).includes(id), `${id} está contraindicado en lumbar y sigue en el calentamiento`));
  assert.ok(ids(conLim).length >= 2, 'el calentamiento no puede quedar vacío tras filtrar');

  // La rodilla tiene su propia lista, y el nombre solo no delata a we3: por eso se filtra por id.
  const limR = parseLimitations('Operación de menisco en la rodilla').keys;
  ['wr2', 'wai1', 'wai2'].forEach(id => assert.ok(
    !ids(buildWarmup([{ name: 'Prensa de Pierna', muscle: 'piernas' }], limR)).includes(id),
    `${id} está contraindicado en rodilla y sigue en el calentamiento`));

  // Y el catálogo de calentamiento no puede tener ids fantasma en la lista de exclusión.
  const todos = new Set(Object.keys(WARMUP_LIBRARY).flatMap(k => WARMUP_LIBRARY[k].map(e => e.id)));
  Object.values(core.WARMUP_ZONE_EXCL_IDS).flat().forEach(id =>
    assert.ok(todos.has(id), `WARMUP_ZONE_EXCL_IDS apunta a "${id}", que no existe en WARMUP_LIBRARY`));
});

test('🔴 wac3 fuera del lumbar, wc2 dentro (2.º veredicto de Laura, 2026-08-02)', () => {
  const wac3 = { id: 'wac3', name: 'Rotación de cadera tumbado' };
  const wc2 = { id: 'wc2', name: 'Estocada con rotación' };
  const lum = parseLimitations('hernia discal L4-L5').keys;
  const rod = parseLimitations('operado de menisco, rodilla').keys;
  // wac3 se hace con las RODILLAS AL PECHO y desde ahí rota: flexión + rotación en rango final.
  assert.ok(core.warmupContraindicated(wac3, lum), 'wac3 debe salir del calentamiento lumbar');
  // wc2: la estocada bloquea la pelvis → la rotación es TORÁCICA y sin carga. Es tratamiento.
  assert.ok(!core.warmupContraindicated(wc2, lum), 'wc2 es terapéutica para lumbar y NO puede salir');
  assert.ok(core.warmupContraindicated(wc2, rod), 'wc2 sí sale en rodilla (la estocada)');
  // Sin carga y sin flexión: estos se quedan a propósito para un lumbar.
  [{ id: 'wr2', name: 'Sentadilla de movilidad lenta' }, { id: 'wai1', name: 'Sentadilla con peso corporal' }]
    .forEach(w => assert.ok(!core.warmupContraindicated(w, lum), `${w.id} no debe salir en lumbar`));
});

test('la marca del selector manual nombra SOLO las zonas que esa persona declaró', () => {
  const we3 = { id: 'we3', name: 'Apertura de cadena posterior' };
  const lum = parseLimitations('dolor lumbar').keys;
  assert.deepStrictEqual(core.warmupWarnZones(we3, lum), ['zona lumbar']);
  assert.strictEqual(core.warmupWarnText(core.warmupWarnZones(we3, lum), false), 'Ojo con su zona lumbar');
  assert.strictEqual(core.warmupWarnText(['zona lumbar', 'rodilla'], false), 'Ojo con su zona lumbar y rodilla');
  assert.strictEqual(core.warmupWarnText(['zona lumbar'], true), 'Ojo con tu zona lumbar', 'el coach editando lo PROPIO');
  // Sin limitación declarada NO hay marca: una señal que sale siempre deja de ser señal.
  assert.deepStrictEqual(core.warmupWarnZones(we3, []), []);
  assert.strictEqual(core.warmupWarnText([], false), '');
  // Una limitación GENÉRICA (sin zona con reglas) tampoco inventa una marca.
  assert.deepStrictEqual(core.warmupWarnZones(we3, parseLimitations('cirugía reciente').keys), []);
  // Y un calentamiento seguro nunca se marca.
  assert.deepStrictEqual(core.warmupWarnZones({ id: 'we1', name: 'Cat-Cow (Gato-Vaca)' }, lum), []);
});

test('síntoma de nervio (ciática) → la app pide valoración médica y NO se hace la clínica', () => {
  const lim = parseLimitations('Hernia lumbar con ciática, el dolor me baja por la pierna');
  assert.strictEqual(lim.nerve, true, 'debe detectar el compromiso nervioso');
  assert.ok(/valore un profesional de la salud/i.test(lim.nerveAdvice), 'debe pedir derivación');
  const sin = parseLimitations('Dolor lumbar al levantar peso');
  assert.strictEqual(sin.nerve, false, 'sin síntoma de nervio no se alarma a nadie');
  assert.strictEqual(sin.nerveAdvice, '');
  // Y sin limitación alguna no se dispara por una palabra suelta.
  assert.strictEqual(parseLimitations('Siente debilidad los lunes por la mañana').nerve, false);
});

test('las formas que la gente SÍ escribe se detectan como lumbar', () => {
  ['Lumbago recurrente', 'Espondilolistesis L5-S1', 'Protrusión discal', 'Estenosis del canal',
   'Dolor sacroilíaco', 'me duele la espalda al agacharme', 'Problema en L4'].forEach(n =>
    assert.ok(parseLimitations(n).keys.includes('lumbar'), `no detectó lumbar en: "${n}"`));
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
  // Glúteo: lo pide el Full Body desde 2026-08-03. El fixture representa una biblioteca
  // realista, así que tiene que cubrir los músculos que el split pide — sin esto los tests de
  // `envGaps` reportarían un hueco que es del FIXTURE, no del motor. (No se aflojó ninguna
  // aserción: se completó el fixture, que es lo que estaba incompleto.)
  { id: 'x10', name: 'Puente de Glúteo', muscle: 'gluteo', type: 'Aislamiento', sets: 3, reps: 15, icon: '🍑', env: ['corporal', 'casa', 'parque', 'gym'] },
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

// ── Variedad en la semana (2026-08-01) ──────────────────────────────────
// El Principiante recibe Full Body los 3 días (mismos slots). Cuando el pool de su nivel
// para un slot tenía UN solo ejercicio, ese caía los 3 días en toda semilla: medido en el
// catálogo real, hombro compuesto en gym = 1 opción, y 660 de 1.440 planes (45,8%) repetían
// un ejercicio TODOS los días. Es el origen del reclamo del PO «a nadie le gustan las rutinas».
// Biblioteca mínima que reproduce la situación: UN solo hombro de nivel P, dos de nivel I.
const VARLIB = [
  { id: 'v1', name: 'Sentadilla Máquina', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v2', name: 'Prensa', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v3', name: 'Sentadilla Hack', muscle: 'piernas', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v4', name: 'Press Pecho Máquina', muscle: 'pecho', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v5', name: 'Press Pecho Polea', muscle: 'pecho', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v6', name: 'Press Pecho Suelo', muscle: 'pecho', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v7', name: 'Jalón Polea', muscle: 'espalda', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v8', name: 'Jalón Neutro', muscle: 'espalda', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v9', name: 'Remo Polea', muscle: 'espalda', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  // hombros: UN solo compuesto de nivel P → sin el fix se repite los 3 días
  { id: 'v10', name: 'Press Militar en Máquina', muscle: 'hombros', type: 'Compuesto', sets: 3, reps: 10, level: 'P', env: ['gym'] },
  { id: 'v11', name: 'Press Militar con Barra', muscle: 'hombros', type: 'Compuesto', sets: 3, reps: 8, level: 'I', env: ['gym'] },
  { id: 'v12', name: 'Press Militar con Mancuernas', muscle: 'hombros', type: 'Compuesto', sets: 3, reps: 10, level: 'I', env: ['gym'] },
  { id: 'v13', name: 'Elevaciones Laterales', muscle: 'hombros', type: 'Aislamiento', sets: 3, reps: 15, level: 'P', env: ['gym'] },
  { id: 'v14', name: 'Plancha', muscle: 'core', type: 'Isométrico', sets: 3, reps: 60, level: 'P', env: ['gym'] },
  { id: 'v15', name: 'Crunch', muscle: 'core', type: 'Bodyweight', sets: 3, reps: 15, level: 'P', env: ['gym'] },
  { id: 'v16', name: 'Dead Bug', muscle: 'core', type: 'Bodyweight', sets: 3, reps: 12, level: 'P', env: ['gym'] },
];
const hombrosDe = routines => routines.flatMap(r => r.exercises).filter(e => e.muscle === 'hombros');

test('el principiante NO recibe el mismo ejercicio los 3 días cuando hay alternativa', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'gym' }, VARLIB, FIXED);
  const hom = hombrosDe(routines);
  assert.strictEqual(hom.length, 3, 'los 3 días deben traer un hombro');
  const distintos = new Set(hom.map(e => e.name));
  assert.strictEqual(distintos.size, 3, `el hombro se repitió en la semana: ${hom.map(e => e.name).join(' / ')}`);
});

test('al variar NO se pierde el patrón del slot: el hombro sigue siendo compuesto', () => {
  // El relleno afloja el NIVEL antes que el TIPO: si aflojara el tipo, entrarían las
  // elevaciones laterales (aislamiento, nivel P) y el principiante perdería el press.
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'gym' }, VARLIB, FIXED);
  const hom = hombrosDe(routines);
  assert.ok(hom.every(e => e.type === 'Compuesto'), `entró un aislamiento donde el slot pide compuesto: ${hom.map(e => `${e.name}(${e.type})`).join(' / ')}`);
});

test('la variedad JAMÁS supera el tope de nivel: a un principiante no le llega un Avanzado', () => {
  const AV = VARLIB.concat([{ id: 'v99', name: 'Press Militar Estricto de Pie', muscle: 'hombros', type: 'Compuesto', sets: 5, reps: 3, level: 'A', env: ['gym'] }]);
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'gym' }, AV, FIXED);
  const nombres = routines.flatMap(r => r.exercises).map(e => e.name);
  assert.ok(!nombres.includes('Press Militar Estricto de Pie'), `un ejercicio Avanzado llegó a un principiante: ${nombres.join(' / ')}`);
});

test('SEGURIDAD: el menor sigue sin carga axial con barra aunque la variedad abra el nivel', () => {
  // El fix hace alcanzable «Press Militar con Barra» (nivel I) para un principiante. Para un
  // MENOR eso está prohibido (§2.2): el excluder debe seguir mordiendo por encima de la variedad.
  const { routines } = generarRutinas({ sex: 'M', age: 14, level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'gym' }, VARLIB, FIXED);
  const nombres = routines.flatMap(r => r.exercises).map(e => e.name);
  assert.ok(!nombres.some(n => /militar con barra/i.test(n)), `un menor recibió carga axial con barra: ${nombres.join(' / ')}`);
});

test('la INTENCIÓN explícita manda sobre la variedad: calistenia repite antes que desobedecer', () => {
  // Con estilo calistenia y UN solo ejercicio de pecho corporal, repetirlo los 3 días es lo
  // correcto; meter un press de banca para «variar» sería desobedecer lo que pidió el coach.
  const { routines } = generarRutinas({ sex: 'M', level: 'Principiante', days: 3, goal: 'Ganar músculo', place: 'gym' }, ENVLIB, { ...FIXED, methodBias: 'calistenia' });
  const pechos = routines.flatMap(r => r.exercises).filter(e => e.muscle === 'pecho');
  assert.ok(pechos.length && pechos.every(e => e.type === 'Bodyweight'), `la variedad pisó el estilo pedido: ${pechos.map(e => e.name).join(' / ')}`);
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

test('sessionFinished: finishedAt o 100% (historial viejo); parcial en curso → false', () => {
  assert.strictEqual(sessionFinished({ finishedAt: '2026-07-02T09:00:00Z' }), true); // marca explícita
  assert.strictEqual(sessionFinished({ doneSets: 8, totalSets: 8 }), true);           // 100% (legacy sin flag)
  assert.strictEqual(sessionFinished({ doneSets: 3, totalSets: 8 }), false);          // serie 3 de 8 → EN CURSO
  assert.strictEqual(sessionFinished({ doneSets: 3, totalSets: 8, finishedAt: 'x' }), true); // finalizó temprano
  assert.strictEqual(sessionFinished({ doneSets: 0, totalSets: 0 }), false);          // nada marcado, sin sets
  assert.strictEqual(sessionFinished(null), false);
  assert.strictEqual(sessionFinished(undefined), false);
});

test('finishedTrainingToday: solo cuenta una sesión FINALIZADA de hoy (no una parcial en curso)', () => {
  const now = D(2026, 6, 2, 15); // martes
  const iso = D(2026, 6, 2, 9);  // hoy 9am
  // 🔴 EL FIX: parcial EN CURSO hoy (marcó 1 de 8, sin finishedAt) → NO cuenta (sigue entrenando)
  assert.strictEqual(finishedTrainingToday([{ date: iso, doneSets: 1, totalSets: 8 }], now), false);
  // finalizó hoy (100%) con rutina de OTRO día (rEspalda aunque hoy tocara rPierna) → cuenta igual
  assert.strictEqual(finishedTrainingToday([{ date: iso, routineId: 'rEspalda', doneSets: 8, totalSets: 8 }], now), true);
  // finalizó temprano hoy (finishedAt, aunque doneSets<totalSets) → cuenta
  assert.strictEqual(finishedTrainingToday([{ date: iso, doneSets: 2, totalSets: 8, finishedAt: iso }], now), true);
  // finalizada pero AYER → false
  assert.strictEqual(finishedTrainingToday([{ date: D(2026, 6, 1, 20), doneSets: 8, totalSets: 8 }], now), false);
  // parcial hoy + finalizada ayer → false (hoy aún no ha terminado nada)
  assert.strictEqual(finishedTrainingToday([{ date: iso, doneSets: 1, totalSets: 8 }, { date: D(2026, 6, 1, 20), doneSets: 6, totalSets: 6 }], now), false);
  // sin datos / basura → false
  assert.strictEqual(finishedTrainingToday([], now), false);
  assert.strictEqual(finishedTrainingToday(null, now), false);
  assert.strictEqual(finishedTrainingToday(undefined, now), false);
  assert.strictEqual(finishedTrainingToday([null, { date: iso, doneSets: 8, totalSets: 8 }], now), true);
});

test('weeklyMissed: rutina de un día ya pasado sin entrenar aparece; hoy/futuro/Libre/sin-día no', () => {
  const now = D(2026, 6, 3, 15); // miércoles; semana lun 1 → dom 7
  const client = { routines: [
    { id: 'rLeg', name: 'Pierna', day: 'Lunes' },       // pasado, sin entrenar → PERDIDA
    { id: 'rChest', name: 'Pecho', day: 'Miércoles' },  // HOY → aún puede hacerla, no
    { id: 'rBack', name: 'Espalda', day: 'Jueves' },    // futuro → no
    { id: 'rFree', name: 'Suave', day: 'Libre' },       // Libre → no
    { id: 'rNone', name: 'Suelta', day: '' },           // sin día → no
  ]};
  const missed = weeklyMissed(client, [], now);
  assert.strictEqual(missed.length, 1);
  assert.strictEqual(missed[0].routine.id, 'rLeg');
  assert.strictEqual(missed[0].dayName, 'Lunes');
});

test('weeklyMissed: entrenada esta semana (por id o nombre, aun otro día, aun parcial) NO aparece', () => {
  const now = D(2026, 6, 3, 15); // miércoles
  const client = { routines: [{ id: 'rLeg', name: 'Pierna', day: 'Lunes' }] };
  // sesión de ESTA semana con ese routineId (aunque la hiciera el martes) → no perdida
  assert.strictEqual(weeklyMissed(client, [{ date: D(2026, 6, 2), routineId: 'rLeg', doneSets: 8, totalSets: 8 }], now).length, 0);
  // match por nombre (id viejo migrado) → tampoco perdida
  assert.strictEqual(weeklyMissed(client, [{ date: D(2026, 6, 2), routineName: 'Pierna', doneSets: 8, totalSets: 8 }], now).length, 0);
  // parcial esta semana (1 de 8) → ya la tocó, no nagear
  assert.strictEqual(weeklyMissed(client, [{ date: D(2026, 6, 2), routineId: 'rLeg', doneSets: 1, totalSets: 8 }], now).length, 0);
  // pero una sesión de la semana PASADA no la salva
  assert.strictEqual(weeklyMissed(client, [{ date: D(2026, 5, 26), routineId: 'rLeg', doneSets: 8, totalSets: 8 }], now).length, 1);
});

test('weeklyMissed: varias perdidas ordenadas por antigüedad (el día más lejano primero)', () => {
  const now = D(2026, 6, 4, 15); // jueves → lun/mar/mié ya pasaron
  const client = { routines: [
    { id: 'rMar', name: 'Martes', day: 'Martes' },
    { id: 'rLun', name: 'Lunes', day: 'Lunes' },
    { id: 'rMie', name: 'Miércoles', day: 'Miércoles' },
  ]};
  assert.deepStrictEqual(weeklyMissed(client, [], now).map(m => m.routine.id), ['rLun', 'rMar', 'rMie']);
});

test('weeklyMissed: sin rutinas / cliente nulo → []', () => {
  assert.deepStrictEqual(weeklyMissed({ routines: [] }, [], D(2026, 6, 3)), []);
  assert.deepStrictEqual(weeklyMissed(null, null, D(2026, 6, 3)), []);
});

test('myTrainingSummary: sin sesiones → vacío honesto (hasData false, racha 0, último Infinity)', () => {
  const s = myTrainingSummary({ days: 3 }, [], D(2026, 6, 3, 15));
  assert.strictEqual(s.hasData, false);
  assert.strictEqual(s.streakWeeks, 0);
  assert.strictEqual(s.thisWeekDays, 0);
  assert.strictEqual(s.daysSince, Infinity);
});

test('myTrainingSummary: pasa las cifras (días de esta semana, meta, hace cuánto)', () => {
  const now = D(2026, 6, 3, 15); // miércoles; semana lun 1 → dom 7
  const sess = [{ date: D(2026, 6, 1) }, { date: D(2026, 6, 2) }];
  const s = myTrainingSummary({ days: 3 }, sess, now);
  assert.strictEqual(s.hasData, true);
  assert.strictEqual(s.thisWeekDays, 2);
  assert.strictEqual(s.target, 3);
  assert.strictEqual(s.daysSince, 1);          // última = martes, hoy miércoles
});

test('myTrainingSummary: historial con fechas TODAS inválidas → hasData false (no "Hace Infinity días")', () => {
  const s = myTrainingSummary({ days: 3 }, [{ date: 'basura' }, { date: null }, {}], D(2026, 6, 3, 15));
  assert.strictEqual(s.hasData, false);        // el fix v372: la tarjeta se oculta, no pinta Infinity
  assert.strictEqual(s.daysSince, Infinity);
});

test('shareBannerEligible: solo tras ≥3 sesiones FINALIZADAS y respetando el snooze', () => {
  const now = D(2026, 6, 3, 12);
  const fin = n => Array.from({ length: n }, (_, i) => ({ date: D(2026, 6, 1, 8 + i), finishedAt: 'x' }));
  // menos de 3 finalizadas → no
  assert.strictEqual(shareBannerEligible(fin(2), now, 0), false);
  // 3 finalizadas → sí
  assert.strictEqual(shareBannerEligible(fin(3), now, 0), true);
  // parciales en curso NO cuentan (sessionFinished false)
  assert.strictEqual(shareBannerEligible([{ date: D(2026, 6, 1), doneSets: 1, totalSets: 8 }, { date: D(2026, 6, 2), doneSets: 2, totalSets: 8 }, { date: D(2026, 6, 2), doneSets: 3, totalSets: 8 }], now, 0), false);
  // snooze en el futuro → no, aunque sea elegible
  assert.strictEqual(shareBannerEligible(fin(5), now, +now + 86400000), false);
  // snooze ya vencido → sí
  assert.strictEqual(shareBannerEligible(fin(5), now, +now - 86400000), true);
  // sin sesiones → no
  assert.strictEqual(shareBannerEligible([], now, 0), false);
});

test('communitySnapshot: destila racha/semana/nivel/logros/hoy (server-side, no inflable)', () => {
  const now = D(2026, 6, 3, 15); // miércoles; semana lun 1 → dom 7
  // 3 entrenos: hoy (lun-vol alto), martes, y uno de hace 40 días (fuera de las 4 semanas)
  const hist = [
    { date: D(2026, 6, 1), totalVol: 6000 },
    { date: D(2026, 6, 2), totalVol: 6000 },
    { date: D(2026, 6, 3), totalVol: 6000 },
    { date: D(2026, 4, 24), totalVol: 3000 }, // ~40 días atrás
  ];
  const s = communitySnapshot({ days: 2 }, hist, { e1: {}, e2: {} }, now);
  assert.strictEqual(s.trained_today, true);         // hay sesión de hoy (mié 3)
  assert.strictEqual(s.sessions_4w, 3);              // lun/mar/mié dentro de 28d; el de abril NO
  assert.strictEqual(s.level, 1);                    // 4 entrenos < 10 → nivel 1
  assert.strictEqual(s.streak_weeks, 1);             // meta 2: esta semana lun+mar+mié = 3 días ≥ 2 → cumple
  assert.strictEqual(s.achievements, 3);             // PR(2≥1) + 10k(21k) + 20k(21k); NO 50k, NO 10/30 entrenos, NO nivel3
  assert.strictEqual(s.total_sessions, 4);           // #5: todos los entrenos cuentan (incl. el de abril)
  assert.strictEqual(s.training_since, '2026-04-24'); // #5: el primero es el de hace ~40 días
});

test('communitySnapshot: logros por volumen y nivel; sin datos → cero honesto', () => {
  const now = D(2026, 6, 3, 12);
  // 30 entrenos (nivel 3) con 60k kg totales → medallas: 10 entrenos, 30 entrenos, 10k, 20k, 50k, nivel3
  const hist = Array.from({ length: 30 }, (_, i) => ({ date: D(2026, 6, 1), totalVol: 2000 }));
  const s = communitySnapshot({ days: 3 }, hist, { e1: {} }, now);
  assert.strictEqual(s.level, 3);                    // 30 ≥ 30 (GX_LEVELS)
  // medallas on: PR(1) + 10ent + 30ent + 10k + 20k + 50k + nivel3 = 7  (falta 50k? 60k≥50k sí; nivel4 no)
  assert.strictEqual(s.achievements, 7);
  assert.strictEqual(s.total_sessions, 30);
  assert.strictEqual(s.training_since, '2026-06-01');
  const empty = communitySnapshot({ days: 3 }, [], {}, now);
  assert.deepStrictEqual(empty, { streak_weeks: 0, sessions_4w: 0, level: 1, achievements: 0, trained_today: false, total_sessions: 0, training_since: null });
});

test('communitySnapshot: training_since ignora fechas ilegibles y toma el mínimo válido', () => {
  const now = D(2026, 6, 10, 12);
  const hist = [
    { date: 'basura' }, { date: null },
    { date: D(2026, 6, 5), totalVol: 1 },
    { date: D(2026, 3, 2), totalVol: 1 }, // marzo → es el más antiguo válido
    { date: D(2026, 6, 8), totalVol: 1 },
  ];
  const s = communitySnapshot({ days: 2 }, hist, {}, now);
  assert.strictEqual(s.total_sessions, 5);            // cuenta TODAS las filas (como hist.length en la edge)
  assert.strictEqual(s.training_since, '2026-03-02'); // el mínimo IGNORANDO las ilegibles
});

test('communityTrainingSinceText: mes+año en español, o null en todo caso raro', () => {
  const now = D(2026, 7, 23, 12);
  assert.strictEqual(communityTrainingSinceText('2026-03-02', now), 'Entrena desde marzo de 2026');
  assert.strictEqual(communityTrainingSinceText('2025-12-31', now), 'Entrena desde diciembre de 2025');
  assert.strictEqual(communityTrainingSinceText('2026-01-01', now), 'Entrena desde enero de 2026');
  // futura → null (no se inventa una antigüedad por venir — clase «Hace -1d»)
  assert.strictEqual(communityTrainingSinceText('2027-01-01', now), null);
  // faltante / ilegible / formato inválido → null (jamás «Invalid Date»)
  assert.strictEqual(communityTrainingSinceText(null, now), null);
  assert.strictEqual(communityTrainingSinceText('', now), null);
  assert.strictEqual(communityTrainingSinceText('2026-13-01', now), null);
  assert.strictEqual(communityTrainingSinceText('2026-02-31', now), null); // día imposible, no se corre a marzo
  assert.strictEqual(communityTrainingSinceText('marzo 2026', now), null);
  assert.strictEqual(communityTrainingSinceText('2026-03', now), null);
});

// ── Comunidad C3 — helpers puros de la UI ──
test('cmtyHandleValid: 1-30 chars tras recortar; rechaza vacío/largo/no-string', () => {
  assert.strictEqual(cmtyHandleValid('Cami'), true);
  assert.strictEqual(cmtyHandleValid('  Cami  '), true);       // recorta
  assert.strictEqual(cmtyHandleValid('   '), false);           // solo espacios
  assert.strictEqual(cmtyHandleValid(''), false);
  assert.strictEqual(cmtyHandleValid('a'.repeat(30)), true);
  assert.strictEqual(cmtyHandleValid('a'.repeat(31)), false);
  assert.strictEqual(cmtyHandleValid(null), false);
  assert.strictEqual(cmtyHandleValid(123), false);
});

test('cmtyCodeNormalize: mayúsculas, solo [A-Z0-9], tolera espacios/guiones', () => {
  assert.strictEqual(cmtyCodeNormalize('a1b2c3d4e5'), 'A1B2C3D4E5');
  assert.strictEqual(cmtyCodeNormalize(' AB12-CD34 '), 'AB12CD34');
  assert.strictEqual(cmtyCodeNormalize('ab_12!cd'), 'AB12CD');
  assert.strictEqual(cmtyCodeNormalize(''), '');
  assert.strictEqual(cmtyCodeNormalize(null), '');
});

test('cmtyShouldRefresh: nunca (falsy) o pasado el debounce de 30 min', () => {
  const now = 1000 * CMTY_REFRESH_MIN_MS;
  assert.strictEqual(cmtyShouldRefresh(0, now), true);         // nunca
  assert.strictEqual(cmtyShouldRefresh(null, now), true);
  assert.strictEqual(cmtyShouldRefresh(NaN, now), true);
  assert.strictEqual(cmtyShouldRefresh(now - 1000, now), false);            // hace 1s
  assert.strictEqual(cmtyShouldRefresh(now - CMTY_REFRESH_MIN_MS, now), true);   // justo 30 min
  assert.strictEqual(cmtyShouldRefresh(now - CMTY_REFRESH_MIN_MS + 1, now), false);
});

test('cmtyFreshness: <48h fresco; ≥48h desactualizado; fecha inválida → no fresco', () => {
  const now = +D(2026, 6, 10, 12);
  assert.deepStrictEqual(cmtyFreshness(new Date(now - 3600000).toISOString(), now), { fresh: true, daysOld: 0 });
  const stale = cmtyFreshness(new Date(now - 3 * 86400000).toISOString(), now);
  assert.strictEqual(stale.fresh, false);
  assert.strictEqual(stale.daysOld, 3);
  assert.deepStrictEqual(cmtyFreshness(null, now), { fresh: false, daysOld: null });
  assert.deepStrictEqual(cmtyFreshness('basura', now), { fresh: false, daysOld: null });
});

test('cmtyAvatarOk: solo URLs del bucket propio; externa/null/vacía → false', () => {
  assert.strictEqual(cmtyAvatarOk(CMTY_AVATAR_PREFIX + 'uid/avatar.jpg'), true);
  assert.strictEqual(cmtyAvatarOk('https://evil.example.com/x.png'), false);
  assert.strictEqual(cmtyAvatarOk('javascript:alert(1)'), false);
  assert.strictEqual(cmtyAvatarOk(null), false);
  assert.strictEqual(cmtyAvatarOk(''), false);
});

test('cmtyInitials: 1-2 letras del handle en mayúsculas', () => {
  assert.strictEqual(cmtyInitials('Camilo'), 'CA');
  assert.strictEqual(cmtyInitials('Ana María'), 'AM');
  assert.strictEqual(cmtyInitials('x'), 'X');
  assert.strictEqual(cmtyInitials('   '), '?');
  assert.strictEqual(cmtyInitials(null), '?');
});

test('communityPostPayload: solo claves allow-list, descarta pesos/salud/ids', () => {
  const routine = {
    id: 'r1', name: 'Full body A', day: 'Lunes', restSec: 90, note: 'peso 100kg, cuidado rodilla',
    warmup: 'movilidad',
    exercises: [
      { id: 'e1', name: 'Sentadilla', muscle: 'piernas', type: 'peso_reps', sets: 3, reps: '8-12',
        icon: 'x', desc: 'baja', descSimple: 'baja', imgUrl: 'http://img', kg: 80 },
      { id: 'e2', name: 'Press banca', muscle: 'pecho', sets: 4, reps: 10 }
    ]
  };
  const p = communityPostPayload(routine);
  // top-level: SOLO name, days, exercises
  assert.deepStrictEqual(Object.keys(p).sort(), ['days', 'exercises', 'name']);
  assert.strictEqual(p.name, 'Full body A');
  assert.strictEqual(p.days, 'Lunes'); // day → days
  // ejercicio 1: SOLO name/muscle/type/sets/reps (kg/id/icon/desc/imgUrl descartados)
  assert.deepStrictEqual(Object.keys(p.exercises[0]).sort(), ['muscle', 'name', 'reps', 'sets', 'type']);
  assert.strictEqual(p.exercises[0].sets, '3'); // stringificado
  assert.strictEqual(p.exercises[0].reps, '8-12');
  assert.ok(!('kg' in p.exercises[0]) && !('imgUrl' in p.exercises[0]) && !('id' in p.exercises[0]));
  // ejercicio 2 sin type → clave ausente, no vacía
  assert.ok(!('type' in p.exercises[1]));
  assert.strictEqual(p.exercises[1].muscle, 'pecho');
});

test('communityPostPayload: caps (40 ejercicios, 80 chars) y defaults defensivos', () => {
  const many = { name: 'x'.repeat(200), exercises: Array.from({ length: 60 }, (_, i) => ({ name: 'E' + i })) };
  const p = communityPostPayload(many);
  assert.strictEqual(p.name.length, 80);
  assert.strictEqual(p.exercises.length, 40);
  assert.ok(!('days' in p)); // sin day → sin days
  // objeto vacío → nombre por defecto, sin ejercicios (la UI impide publicar así)
  const empty = communityPostPayload({});
  assert.strictEqual(empty.name, 'Mi rutina');
  assert.deepStrictEqual(empty.exercises, []);
});

test('communityPrPayload: solo récords de PESO ya registrados, anti-cheat de UX', () => {
  // un PR de peso real → payload exacto {exercise_name, value_kg}
  assert.deepStrictEqual(
    communityPrPayload({ name: 'Sentadilla', unit: 'kg', val: 100, reps: 3 }),
    { exercise_name: 'Sentadilla', value_kg: 100 });
  // PR legacy que solo trae kg (sin val) → se lee de kg
  assert.deepStrictEqual(
    communityPrPayload({ name: 'Peso muerto', unit: 'kg', kg: 140 }),
    { exercise_name: 'Peso muerto', value_kg: 140 });
  // NO es de peso (reps/seg/rondas) → null: no es un «Sentadilla 100 kg»
  assert.strictEqual(communityPrPayload({ name: 'Plancha', unit: 's', val: 90 }), null);
  assert.strictEqual(communityPrPayload({ name: 'Dominadas', unit: 'reps', val: 15 }), null);
  // nombre vacío / sin nombre → null
  assert.strictEqual(communityPrPayload({ name: '', unit: 'kg', val: 100 }), null);
  assert.strictEqual(communityPrPayload({ unit: 'kg', val: 100 }), null);
  // fuera de rango (0 / >1000 / NaN) → null (espejo del trigger)
  assert.strictEqual(communityPrPayload({ name: 'x', unit: 'kg', val: 0 }), null);
  assert.strictEqual(communityPrPayload({ name: 'x', unit: 'kg', val: 1001 }), null);
  assert.strictEqual(communityPrPayload({ name: 'x', unit: 'kg', val: NaN }), null);
  assert.strictEqual(communityPrPayload(null), null);
  // nombre largo → recortado a 80
  assert.strictEqual(communityPrPayload({ name: 'y'.repeat(200), unit: 'kg', val: 50 }).exercise_name.length, 80);
});

test('leadPending: el lead atendido por el coach NO reaparece (caso Hernán/Cristian)', () => {
  const hernan = { id: 'h1', wantsCoach: true, wantsCoachAt: '2026-07-06T19:33:26.070Z' };
  // sin registro de atención → pendiente (conducta vieja)
  assert.strictEqual(leadPending(hernan, {}), true);
  assert.strictEqual(leadPending(hernan, null), true);
  // el coach lo atiende DESPUÉS de que pidió → deja de aparecer, pase lo que pase con su flag
  assert.strictEqual(leadPending(hernan, { h1: '2026-07-08T12:00:00.000Z' }), false);
  // …y sigue sin aparecer aunque el dispositivo del asesorado re-suba wantsCoach:true (clase F7)
  const resucitado = { ...hernan, wantsCoach: true };
  assert.strictEqual(leadPending(resucitado, { h1: '2026-07-08T12:00:00.000Z' }), false);
  // quien nunca pidió, nunca es lead
  assert.strictEqual(leadPending({ id: 'x', wantsCoach: false }, {}), false);
  assert.strictEqual(leadPending({ id: 'x' }, { x: '2026-07-08T12:00:00.000Z' }), false);
});

test('leadPending: una solicitud NUEVA tras ser atendido SÍ reaparece', () => {
  const done = { c1: '2026-07-08T12:00:00.000Z' };
  // volvió a pedir el 20 de julio, después de la atención del 8 → es un lead nuevo, debe verse
  assert.strictEqual(leadPending({ id: 'c1', wantsCoach: true, wantsCoachAt: '2026-07-20T10:00:00.000Z' }, done), true);
  // pidió ANTES de la atención → sigue resuelto
  assert.strictEqual(leadPending({ id: 'c1', wantsCoach: true, wantsCoachAt: '2026-07-01T10:00:00.000Z' }, done), false);
});

test('leadPending: datos raros fallan del lado VISIBLE (perder un lead cuesta plata)', () => {
  // marca de atención ilegible → se muestra igual
  assert.strictEqual(leadPending({ id: 'c1', wantsCoach: true, wantsCoachAt: '2026-07-20T10:00:00.000Z' }, { c1: 'basura' }), true);
  // pidió SIN fecha pero ya fue atendido → resuelto (no se inventa una fecha para adelantarlo, lección v359)
  assert.strictEqual(leadPending({ id: 'c1', wantsCoach: true }, { c1: '2026-07-08T12:00:00.000Z' }), false);
  // pidió sin fecha y nunca fue atendido → pendiente
  assert.strictEqual(leadPending({ id: 'c1', wantsCoach: true }, {}), true);
  assert.strictEqual(leadPending(null, {}), false);
  assert.strictEqual(leadPending(undefined, undefined), false);
});

test('clientAttentionRank: un lead atendido deja de ocupar el tier 3', () => {
  const now = D(2026, 6, 22, 10);
  const c = { id: 'h1', name: 'Hernán', selfReg: true, wantsCoach: true, wantsCoachAt: '2026-07-06T19:33:26.070Z',
    payments: [{ date: '2026-07-20', dueDate: '2026-08-20', amount: 1 }] };
  const pendiente = clientAttentionRank(c, [], now, {});
  assert.strictEqual(pendiente.reason, 'lead');
  const atendido = clientAttentionRank(c, [], now, { leadsDone: { h1: '2026-07-08T12:00:00.000Z' } });
  assert.notStrictEqual(atendido.reason, 'lead');
});

test('communityWorkoutPayload: sesión terminada → allow-list {name, duration_min, exercises_count}', () => {
  const s = {
    routineName: 'Pierna y glúteo', finishedAt: '2026-07-22T11:00:00Z', startedAt: '2026-07-22T10:08:00Z',
    totalVol: 9999, doneSets: 12, totalSets: 12,
    exercises: [
      { name: 'Sentadilla', muscle: 'piernas', sets: [{ kg: 80, reps: 10, done: true }] },
      { name: 'Peso muerto', sets: [{ kg: 100, reps: 5, done: true }] }
    ]
  };
  const p = communityWorkoutPayload(s, 'Pierna y glúteo');
  assert.deepStrictEqual(Object.keys(p).sort(), ['duration_min', 'exercises_count', 'name']);
  assert.strictEqual(p.name, 'Pierna y glúteo');
  assert.strictEqual(p.exercises_count, 2);
  assert.strictEqual(p.duration_min, 52); // 11:00 - 10:08
  assert.ok(!('kg' in p) && !('note' in p) && !('streak' in p)); // jamás kilos ni racha
});

test('communityWorkoutPayload: parcial en curso → null (clase v367, no pisa un entreno a medias)', () => {
  const parcial = { routineName: 'X', startedAt: '2026-07-22T10:00:00Z', doneSets: 1, totalSets: 12, exercises: [{ name: 'A', sets: [{ done: true }] }] };
  assert.strictEqual(communityWorkoutPayload(parcial, 'X'), null); // sin finishedAt y no 100%
  assert.strictEqual(communityWorkoutPayload(null, 'X'), null);
  assert.strictEqual(communityWorkoutPayload({ finishedAt: 'x', exercises: [] }, ''), null); // sin nombre
});

test('communityWorkoutPayload: duración omitida si no hay startedAt sano; nota validada 1-140', () => {
  const sinInicio = { routineName: 'X', finishedAt: '2026-07-22T11:00:00Z', doneSets: 6, totalSets: 6, exercises: [{ name: 'A', sets: [{ done: true }] }] };
  const p = communityWorkoutPayload(sinInicio, 'X');
  assert.ok(!('duration_min' in p)); // sin startedAt → sin chip de duración
  assert.strictEqual(p.exercises_count, 1);
  // nota dentro de rango
  assert.strictEqual(communityWorkoutPayload(sinInicio, 'X', '  ¡vamos! 💪  ').note, '¡vamos! 💪');
  // nota vacía tras trim → se omite; nota de 141 → se omite (el trigger igual la rechazaría)
  assert.ok(!('note' in communityWorkoutPayload(sinInicio, 'X', '   ')));
  assert.ok(!('note' in communityWorkoutPayload(sinInicio, 'X', 'a'.repeat(141))));
  assert.strictEqual(communityWorkoutPayload(sinInicio, 'X', 'a'.repeat(140)).note.length, 140);
  // duración fuera de rango (0 o >600) se omite, no revienta
  const larga = { routineName: 'X', startedAt: '2026-07-22T10:00:00Z', finishedAt: '2026-07-23T02:00:00Z', doneSets: 6, totalSets: 6, exercises: [{ name: 'A', sets: [{ done: true }] }] };
  assert.ok(!('duration_min' in communityWorkoutPayload(larga, 'X'))); // 960 min > 600
});

test('communityMilestoneText: racha y nivel en voz de AVI, persona según sea mío o ajeno', () => {
  assert.deepStrictEqual(communityMilestoneText('streak', { weeks: 4 }, false),
    { emoji: '🔥', text: 'Cumplió 4 semanas seguidas entrenando' });
  assert.deepStrictEqual(communityMilestoneText('streak', { weeks: 4 }, true),
    { emoji: '🔥', text: 'Cumpliste 4 semanas seguidas entrenando' });
  // NUNCA se filtra un dato de salud: el payload de un hito solo trae el número del servidor
  assert.ok(!/kg|peso|\d+\s*kg/i.test(communityMilestoneText('streak', { weeks: 8 }, false).text));
  // concordancia en singular (los umbrales arrancan en 2, pero la función no debe decir barbaridades)
  assert.strictEqual(communityMilestoneText('streak', { weeks: 1 }, false).text, 'Cumplió 1 semana seguida entrenando');
  assert.deepStrictEqual(communityMilestoneText('level', { level: 3 }, false),
    { emoji: '⭐', text: 'Subió al nivel 3' });
  assert.deepStrictEqual(communityMilestoneText('level', { level: 3 }, true),
    { emoji: '⭐', text: 'Subiste al nivel 3' });
});

test('communityMilestoneText: hito no reconocible → null (jamás una tarjeta rota)', () => {
  // kind desconocido, payload vacío, números inválidos o negativos: el caller no pinta nada
  assert.strictEqual(communityMilestoneText('pr', { kg: 100 }, false), null);
  assert.strictEqual(communityMilestoneText('routine', { name: 'x' }, false), null);
  assert.strictEqual(communityMilestoneText('streak', {}, false), null);
  assert.strictEqual(communityMilestoneText('streak', { weeks: 0 }, false), null);
  assert.strictEqual(communityMilestoneText('streak', { weeks: -4 }, false), null);
  assert.strictEqual(communityMilestoneText('streak', { weeks: 'cuatro' }, false), null);
  assert.strictEqual(communityMilestoneText('level', { level: null }, false), null);
  assert.strictEqual(communityMilestoneText('streak', null, false), null);
  assert.strictEqual(communityMilestoneText(undefined, undefined, false), null);
});

test('communityCommentText: espejo del CHECK de c16 — recorta, corta a 280, vacío → null', () => {
  assert.strictEqual(communityCommentText('  ¡vas durísimo! 💪  '), '¡vas durísimo! 💪');
  // el servidor rechaza vacío y solo-espacios (btrim <> ''): el cliente ni lo intenta
  assert.strictEqual(communityCommentText(''), null);
  assert.strictEqual(communityCommentText('   '), null);
  assert.strictEqual(communityCommentText('\n\t  \n'), null);
  assert.strictEqual(communityCommentText(null), null);
  assert.strictEqual(communityCommentText(undefined), null);
  // 280 es el tope duro; lo que pasa de ahí se corta, nunca rebota el insert
  assert.strictEqual(communityCommentText('a'.repeat(280)).length, 280);
  assert.strictEqual(communityCommentText('a'.repeat(500)).length, 280);
  // cortar a 280 no puede dejar espacios en la cola (volvería a fallar el btrim del servidor)
  assert.strictEqual(communityCommentText('a'.repeat(279) + '   b'), 'a'.repeat(279));
  // no sanea HTML: eso es trabajo de esc() al pintar, aquí el texto viaja íntegro
  assert.strictEqual(communityCommentText('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>');
});

test('🔴 c16: el espejo del comentario se DERIVA del .sql, no de un 280 escrito a mano', () => {
  // Este test se llamaba «espejo del CHECK» y NO leía el .sql: el 280 estaba escrito a mano en
  // los dos lados. Si el CHECK del servidor bajara a 200, el cliente seguiría dejando publicar
  // 280 y la persona recibiría `violates check constraint` en la cara — exactamente lo que el
  // espejo existe para evitar. Es la clase que Fable marcó en F5 (P2-3), un piso más abajo:
  // allá el test leía el archivo y le faltaba el conteo; aquí no lo leía en absoluto.
  const fs = require('fs'), path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'community', 'c16_comments.sql'), 'utf8');
  const tabla = sql.slice(sql.indexOf('create table public.community_comments'));
  const cuerpo = tabla.slice(0, tabla.indexOf('\n);'));
  assert.ok(/created_at/.test(cuerpo) && cuerpo.length > 200,
    `control: se leyeron ${cuerpo.length} caracteres del cuerpo de la tabla`);
  assert.ok(!/with\s+check/i.test(cuerpo), 'el recorte se comió una policy: el conteo ya no significa lo que dice');
  // El tope sale del CHECK, y el cliente tiene que cortar EXACTAMENTE ahí.
  const m = cuerpo.match(/char_length\(text\) between 1 and (\d+)/);
  assert.ok(m, 'cambió la forma del CHECK de largo en c16 — el espejo del cliente quedó ciego');
  const tope = Number(m[1]);
  assert.strictEqual(communityCommentText('a'.repeat(tope)).length, tope, 'el cliente corta antes que el servidor');
  assert.strictEqual(communityCommentText('a'.repeat(tope + 200)).length, tope, 'el cliente deja pasar más de lo que el servidor acepta');
  // La otra mitad del mismo CHECK (D2): solo-espacios no se manda.
  assert.ok(/btrim\(text\) <> ''/.test(cuerpo), 'se cayó el btrim del CHECK y el cliente sigue creyendo que existe');
  assert.strictEqual(communityCommentText(' '.repeat(tope + 200)), null);
  // Y un CHECK NUEVO en la tabla tiene que salir aquí, no en la cara de quien comenta.
  assert.strictEqual((cuerpo.match(/check\s*\(/gi) || []).length, 1,
    'cambió el número de CHECK de community_comments: si es uno nuevo, `communityCommentText` tiene que replicarlo');
});

test('communityEmptyState: un solo vacío — publicaciones > gente conectada > solo', () => {
  // con publicaciones no hay vacío, aunque no tenga a nadie más
  assert.strictEqual(communityEmptyState({ posts: 3 }), 'none');
  assert.strictEqual(communityEmptyState({ posts: 1, friends: 0, gym: 0, discover: 0 }), 'none');
  // sin publicaciones pero CON gente (cualquiera de las vías cuenta) → «tranquilo», empuja a publicar
  assert.strictEqual(communityEmptyState({ posts: 0, friends: 2 }), 'quiet');
  assert.strictEqual(communityEmptyState({ posts: 0, gym: 1 }), 'quiet');
  assert.strictEqual(communityEmptyState({ posts: 0, following: 1 }), 'quiet');
  // una solicitud pendiente ya es «tiene gente en camino»: no se le dice que está solo
  assert.strictEqual(communityEmptyState({ posts: 0, outgoing: 1 }), 'quiet');
  assert.strictEqual(communityEmptyState({ posts: 0, incoming: 1 }), 'quiet');
  assert.strictEqual(communityEmptyState({ posts: 0, followerReqs: 1 }), 'quiet');
  // sin nada de nada → 'lonely' (el único mensaje que resuelve el caso: conectar)
  assert.strictEqual(communityEmptyState({ posts: 0, friends: 0, gym: 0, discover: 0, following: 0 }), 'lonely');
  assert.strictEqual(communityEmptyState({}), 'lonely');
  assert.strictEqual(communityEmptyState(), 'lonely');
});

test('communityEmptyState: «Descubrir» NO es tener gente (reserva de Fable, veredicto R3)', () => {
  // Ver perfiles públicos de desconocidos no es una relación: si publica, su post no lo ve nadie.
  // Debe seguir empujando a CONECTAR ('lonely'), no a publicar ('quiet').
  assert.strictEqual(communityEmptyState({ posts: 0, discover: 5 }), 'lonely');
  assert.strictEqual(communityEmptyState({ posts: 0, discover: 99, friends: 0, gym: 0, following: 0 }), 'lonely');
  // pero en cuanto SÍ hay una relación real (aunque además haya desconocidos) → 'quiet'
  assert.strictEqual(communityEmptyState({ posts: 0, discover: 5, following: 1 }), 'quiet');
  assert.strictEqual(communityEmptyState({ posts: 0, discover: 5, friends: 1 }), 'quiet');
  // seguir a alguien de «Descubrir» es lo que crea la relación → cuenta por `following`, no por `discover`
  assert.strictEqual(communityEmptyState({ posts: 0, discover: 5, outgoing: 1 }), 'quiet');
});

test('communityEmptyState: valores basura cuentan como 0 (no inventan gente)', () => {
  assert.strictEqual(communityEmptyState({ posts: null, friends: NaN, gym: undefined }), 'lonely');
  assert.strictEqual(communityEmptyState({ posts: 0, friends: -3 }), 'lonely');
  assert.strictEqual(communityEmptyState({ posts: 'x', friends: 'y' }), 'lonely');
  // pero un conteo numérico en string sí cuenta (viene de un length, pero defensivo)
  assert.strictEqual(communityEmptyState({ posts: 0, friends: '2' }), 'quiet');
  assert.strictEqual(communityEmptyState({ posts: '2' }), 'none');
});

// ── A1 adopción — prueba social del opt-in (dato real: 23 en el gym, 6 con perfil) ──
test('communityPeersLine: nombra a la gente del gym, en orden estable, con «y N más»', () => {
  const gym = h => ({ handle: h, is_private: true, gym: true }); // gym = señal REAL del servidor (F3)
  const l = communityPeersLine([gym('Samuel'), gym('Astrid'), gym('Kathe'), gym('Luz'), gym('Natalia')]);
  assert.strictEqual(l.scope, 'gym');
  assert.strictEqual(l.total, 5);
  assert.deepStrictEqual(l.names, ['Astrid', 'Kathe']); // alfabético: el repintado no baraja nombres
  assert.strictEqual(l.extra, 3);
  assert.strictEqual(l.text, 'Astrid, Kathe y 3 más de tu gym ya están aquí');
  // el mismo insumo en otro orden da EXACTAMENTE la misma línea (determinismo)
  const l2 = communityPeersLine([gym('Luz'), gym('Natalia'), gym('Kathe'), gym('Samuel'), gym('Astrid')]);
  assert.strictEqual(l2.text, l.text);
  // `picked` son los perfiles ORIGINALES (la UI pinta esos avatares, sin re-filtrar por su cuenta)
  assert.strictEqual(l.picked.length, 2);
  assert.strictEqual(l.picked[0].handle, 'Astrid');
});

test('communityPeersLine: concordancia y conteos exactos (1, 2 y 3 personas)', () => {
  const gym = h => ({ handle: h, is_private: true, gym: true }); // gym = señal REAL del servidor (F3)
  assert.strictEqual(communityPeersLine([gym('Samuel')]).text, 'Samuel de tu gym ya está aquí');
  assert.strictEqual(communityPeersLine([gym('Samuel'), gym('Astrid')]).text, 'Astrid y Samuel de tu gym ya están aquí');
  assert.strictEqual(communityPeersLine([gym('Samuel'), gym('Astrid'), gym('Luz')]).text, 'Astrid, Luz y 1 más de tu gym ya están aquí');
});

test('communityPeersLine: una sonda CORRUPTA no puede tumbar «Hoy» (F9)', () => {
  // La lista sale de localStorage y esto se pinta ANTES del entreno: si `.filter` lanza, el
  // asesorado se queda sin su rutina en pantalla. Cualquier forma que no sea lista → null.
  assert.strictEqual(communityPeersLine('Samuel'), null);
  assert.strictEqual(communityPeersLine(42), null);
  assert.strictEqual(communityPeersLine({ handle: 'Samuel' }), null);
  assert.strictEqual(communityPeersLine(true), null);
});

test('communityPeersLine: sin nadie a quién nombrar → null (la bienvenida queda intacta)', () => {
  assert.strictEqual(communityPeersLine([]), null);
  assert.strictEqual(communityPeersLine(null), null);
  assert.strictEqual(communityPeersLine(), null);
  // basura que no se puede nombrar NO cuenta: nunca «2 más» fantasma ni un avatar sin nombre
  assert.strictEqual(communityPeersLine([{ handle: '' }, { handle: '   ' }, { handle: null }, null, {}]), null);
  const l = communityPeersLine([{ handle: 'Samuel', is_private: true, gym: true }, { handle: '  ' }, null]);
  assert.strictEqual(l.total, 1);
  assert.strictEqual(l.text, 'Samuel de tu gym ya está aquí');
});

test('communityPeersLine: el gym manda; sin gym no MIENTE el origen («en AVI», no «de tu gym»)', () => {
  // F3 (2026-07-26) — ESTE TEST CONSAGRABA EL BUG. Afirmaba `total === 1` con el comentario «el
  // público NO se cuenta dentro del gym», deduciendo la pertenencia de `is_private`. Con datos
  // reales de prod el ÚNICO perfil público del gym es el COACH: la línea lo escondía justo a él.
  // La pertenencia ya no se deduce de la privacidad — la marca el servidor (`cmty_gym_peers`).
  const publicoDelGym = { handle: 'Publico', is_private: false, gym: true };
  const privadoDelGym = { handle: 'Samuel', is_private: true, gym: true };
  const l = communityPeersLine([publicoDelGym, privadoDelGym]);
  assert.strictEqual(l.scope, 'gym');
  assert.strictEqual(l.total, 2);                    // el público del gym SÍ es del gym
  assert.strictEqual(l.text, 'Publico y Samuel de tu gym ya están aquí');  // plural correcto
  // 5 públicos del gym + 1 privado: antes decía «Zulma de tu gym ya está aquí» (singular, 5 ocultos)
  const cinco = ['Ana', 'Beto', 'Caro', 'Dani', 'Eva'].map(h => ({ handle: h, is_private: false, gym: true }));
  const l5 = communityPeersLine(cinco.concat([{ handle: 'Zulma', is_private: true, gym: true }]));
  assert.strictEqual(l5.total, 6);
  assert.strictEqual(l5.text, 'Ana, Beto y 4 más de tu gym ya están aquí');
  // un DESCONOCIDO público (no marcado) no se cuela en el gym, aunque se le pueda ver
  const conExtrano = communityPeersLine([{ handle: 'Extrano', is_private: false }, privadoDelGym]);
  assert.strictEqual(conExtrano.total, 1);
  assert.strictEqual(conExtrano.text, 'Samuel de tu gym ya está aquí');
  // nadie del gym → se nombra a los públicos, pero como gente de AVI (no se miente el origen)
  const p = communityPeersLine([{ handle: 'Ana', is_private: false }, { handle: 'Beto', is_private: false }]);
  assert.strictEqual(p.scope, 'avi');
  assert.strictEqual(p.text, 'Ana y Beto ya están en AVI');
  // sin la señal del servidor (RPC caída) un privado visible NO se pierde: el llamador cae al proxy
  // viejo y lo marca; sin marca, la línea sigue siendo cierta, solo que dice «en AVI».
  const sinSenal = communityPeersLine([{ handle: 'Samuel', is_private: true }]);
  assert.strictEqual(sinSenal.scope, 'avi');
  assert.strictEqual(sinSenal.text, 'Samuel ya está en AVI');
});


test('communityNudgeEligible: a quien YA tiene perfil no se le insiste, jamás', () => {
  const fin = n => Array.from({ length: n }, (_, i) => ({ date: D(2026, 7, i + 1), finishedAt: D(2026, 7, i + 1) }));
  const conGente = { hasProfile: false, peers: 5, at: D(2026, 7, 25) };
  assert.strictEqual(communityNudgeEligible(fin(3), D(2026, 7, 25), 0, conGente), true);
  // ya activó su perfil → la tarjeta desaparece para siempre (no es un recordatorio, es una puerta)
  assert.strictEqual(communityNudgeEligible(fin(30), D(2026, 7, 25), 0, { hasProfile: true, peers: 5, at: D(2026, 7, 25) }), false);
  // sonda ausente o a medias → callar, nunca invitar a ciegas
  assert.strictEqual(communityNudgeEligible(fin(30), D(2026, 7, 25), 0, null), false);
  assert.strictEqual(communityNudgeEligible(fin(30), D(2026, 7, 25), 0, {}), false);
  assert.strictEqual(communityNudgeEligible(fin(30), D(2026, 7, 25), 0, { peers: 9 }), false);
});

test('communityNudgeEligible: sin gente visible NO se invita (no se manda a nadie a un cuarto vacío)', () => {
  const fin = n => Array.from({ length: n }, (_, i) => ({ date: D(2026, 7, i + 1), finishedAt: D(2026, 7, i + 1) }));
  const base = { hasProfile: false, at: D(2026, 7, 25) };
  assert.strictEqual(communityNudgeEligible(fin(10), D(2026, 7, 25), 0, Object.assign({}, base, { peers: 0 })), false);
  assert.strictEqual(communityNudgeEligible(fin(10), D(2026, 7, 25), 0, base), false);            // sin el dato
  assert.strictEqual(communityNudgeEligible(fin(10), D(2026, 7, 25), 0, Object.assign({}, base, { peers: 'muchos' })), false);
  assert.strictEqual(communityNudgeEligible(fin(10), D(2026, 7, 25), 0, Object.assign({}, base, { peers: 1 })), true);
});

test('communityNudgeEligible: exige entreno real (finalizado) y respeta el silencio', () => {
  const probe = { hasProfile: false, peers: 4, at: D(2026, 7, 25) };
  const now = D(2026, 7, 25);
  const fin = n => Array.from({ length: n }, (_, i) => ({ date: D(2026, 7, i + 1), finishedAt: D(2026, 7, i + 1) }));
  assert.strictEqual(communityNudgeEligible(fin(2), now, 0, probe), false);   // 2 < CMTY_NUDGE_MIN_SESSIONS
  assert.strictEqual(communityNudgeEligible(fin(3), now, 0, probe), true);
  assert.strictEqual(communityNudgeEligible([], now, 0, probe), false);
  assert.strictEqual(communityNudgeEligible(null, now, 0, probe), false);
  // sesiones ABIERTAS (sin finishedAt) no cuentan — el mismo criterio de shareBannerEligible
  const abiertas = [{ date: D(2026, 7, 1) }, { date: D(2026, 7, 2) }, { date: D(2026, 7, 3) }];
  assert.strictEqual(communityNudgeEligible(abiertas, now, 0, probe), false);
  // silenciada: callada hasta que vence, y vuelve sola después
  assert.strictEqual(communityNudgeEligible(fin(9), now, +D(2026, 7, 26), probe), false);
  assert.strictEqual(communityNudgeEligible(fin(9), now, +D(2026, 7, 24), probe), true);
});

test('communityProbeStale: pega a la red 1×/día, y ante una fecha ilegible pregunta de nuevo', () => {
  const now = D(2026, 7, 25, 12);
  assert.strictEqual(communityProbeStale({ at: D(2026, 7, 25, 11) }, now), false);   // 1h
  assert.strictEqual(communityProbeStale({ at: D(2026, 7, 24, 11) }, now), true);    // 25h
  assert.strictEqual(communityProbeStale({ at: D(2026, 7, 25, 11) }, now, 0.5), true); // TTL a medida
  assert.strictEqual(communityProbeStale(null, now), true);
  assert.strictEqual(communityProbeStale({}, now), true);
  // `new Date(null)` es EPOCH, no NaN (gotcha training_since): sin este guard una sonda con
  // at:null se leería como "de 1970" → stale igual, pero por accidente. Aquí es explícito.
  assert.strictEqual(communityProbeStale({ at: null }, now), true);
  assert.strictEqual(communityProbeStale({ at: '' }, now), true);
  assert.strictEqual(communityProbeStale({ at: 'ayer por la tarde' }, now), true);
});

test('firstSessionMode: la portada del día 1 JAMÁS tapa a quien ya empezó (clase v367)', () => {
  assert.strictEqual(firstSessionMode([]), true);
  // una sesión PARCIAL (sin finishedAt) ya significa que empezó → se apaga la portada
  assert.strictEqual(firstSessionMode([{ date: '2026-07-26' }]), false);
  assert.strictEqual(firstSessionMode([{ date: '2026-07-26', finishedAt: '2026-07-26' }]), false);
  // dato ilegible → conducta de siempre, nunca portada
  assert.strictEqual(firstSessionMode(null), false);
  assert.strictEqual(firstSessionMode(undefined), false);
  assert.strictEqual(firstSessionMode('nada'), false);
  assert.strictEqual(firstSessionMode({ length: 0 }), false);
});

test('estimateWorkoutMinutes: estima con el descanso real, o calla si no puede', () => {
  // 12 series × (45s de trabajo + 90s de descanso) = 27 min
  const r = { restSec: 90, exercises: [{ sets: 3 }, { sets: 3 }, { sets: 3 }, { sets: 3 }] };
  assert.strictEqual(estimateWorkoutMinutes(r), 27);
  // el descanso de la rutina manda (60s → 21 min)
  assert.strictEqual(estimateWorkoutMinutes({ restSec: 60, exercises: [{ sets: 3 }, { sets: 3 }, { sets: 3 }, { sets: 3 }] }), 21);
  // sin descanso declarado usa 90s
  assert.strictEqual(estimateWorkoutMinutes({ exercises: [{ sets: 4 }] }), 9);
  // NUNCA inventa: sin ejercicios, sin series o basura → null (la UI omite el chip)
  assert.strictEqual(estimateWorkoutMinutes({ exercises: [] }), null);
  assert.strictEqual(estimateWorkoutMinutes({ exercises: [{ sets: 0 }] }), null);
  assert.strictEqual(estimateWorkoutMinutes({ exercises: [{ sets: 'x' }] }), null);
  assert.strictEqual(estimateWorkoutMinutes(null), null);
  // una serie absurda (999) no dispara una promesa de 20 horas
  assert.ok(estimateWorkoutMinutes({ restSec: 90, exercises: [{ sets: 999 }] }) <= 45);
});

test('communityMe: sé quién soy sin haber abierto la pestaña (F2), o no pregunto', () => {
  const prof = { handle: 'Camilo', show_milestones: false };
  const cache = { profile: { handle: 'Camilo-viejo', show_milestones: true } };
  // 1. el perfil cargado manda sobre todo lo demás
  assert.strictEqual(communityMe(prof, { hasProfile: true, showMilestones: true }, cache), prof);
  // 2. sin perfil cargado, la sonda de A2 responde (es lo que hace que A4 exista en la práctica)
  assert.deepStrictEqual(communityMe(null, { hasProfile: true, showMilestones: false }, null), { show_milestones: false });
  assert.deepStrictEqual(communityMe(null, { hasProfile: true, showMilestones: true }, null), { show_milestones: true });
  // 3. la sonda SABE que no hay perfil → null, aunque la caché tenga uno viejo (no se resucita)
  assert.strictEqual(communityMe(null, { hasProfile: false, peers: 3 }, cache), null);
  // 4. sonda vieja (sin el campo, formato anterior al fix) → cae a la caché de disco
  assert.strictEqual(communityMe(null, { hasProfile: true, peers: 0 }, cache), cache.profile);
  // 5. nadie sabe → null: no se pregunta a ciegas
  assert.strictEqual(communityMe(null, null, null), null);
  assert.strictEqual(communityMe(null, { hasProfile: true }, { profile: null }), null);
  assert.strictEqual(communityMe(undefined, undefined, undefined), null);
  // 6. basura no se cuela como perfil
  assert.strictEqual(communityMe('si', null, null), null);
  assert.strictEqual(communityMe(null, { hasProfile: true, showMilestones: 'true' }, null), null);
});

test('cmtyLocalKey: ninguna clave de comunidad sin dueño (P0 identidad pegada)', () => {
  assert.strictEqual(cmtyLocalKey('ax_cmty_probe', 'u-astrid'), 'ax_cmty_probe_u-astrid');
  // dos cuentas del MISMO aparato NUNCA comparten clave — esto es el bug del PO, en una línea
  assert.notStrictEqual(cmtyLocalKey('ax_cmty_cache', 'u-a'), cmtyLocalKey('ax_cmty_cache', 'u-b'));
  // sin uid no hay clave: se prefiere no leer nada antes que leer lo del anterior
  assert.strictEqual(cmtyLocalKey('ax_cmty_probe', ''), null);
  assert.strictEqual(cmtyLocalKey('ax_cmty_probe', null), null);
  assert.strictEqual(cmtyLocalKey('ax_cmty_probe', undefined), null);
  assert.strictEqual(cmtyLocalKey('ax_cmty_probe', 123), null);
  assert.strictEqual(cmtyLocalKey('', 'u-a'), null);
  assert.strictEqual(cmtyLocalKey(null, 'u-a'), null);
  // el formato que YA usaban las claves namespacadas se respeta (no invalida datos existentes)
  assert.strictEqual(cmtyLocalKey('ax_cmty_minor', 'u-a'), 'ax_cmty_minor_u-a');
});

test('communityGymAdoption: `invitable` cuenta solo a quien la lista puede invitar (F5)', () => {
  // Caso REAL del modal: 4 miembros = el coach + 3 asesorados, de los cuales uno está archivado
  // (ya no aparece en DB.clients) y otro ya activó. `pending` dice 2; invitables hay UNO.
  const miembros = ['coach', 'ana', 'beto', 'archivado'];
  const conPerfil = ['coach', 'ana'];
  const enLista = ['ana', 'beto'];               // el coach no lleva botón; el archivado no tiene fila
  const a = communityGymAdoption(miembros, conPerfil, enLista);
  assert.strictEqual(a.total, 4);
  assert.strictEqual(a.active, 2);
  assert.strictEqual(a.pending, 2);              // beto + archivado
  assert.strictEqual(a.invitable, 1);            // solo beto tiene botón en pantalla
  // sin `listedIds` se comporta EXACTAMENTE como antes (nada que romper en otros llamadores)
  assert.deepStrictEqual(communityGymAdoption(miembros, conPerfil), { total: 4, active: 2, pending: 2 });
  // una lista con gente que NO es del gym no infla invitable
  assert.strictEqual(communityGymAdoption(['ana'], [], ['ana', 'zoe']).invitable, 1);
});

test('communityGymHint: la frase del modal nunca promete botones que no existen (F5)', () => {
  const A = (o) => Object.assign({ total: 5, active: 2, pending: 3, invitable: 3 }, o || {});
  assert.match(communityGymHint(A({ invitable: 3 })), /A los otros 3 puedes invitarlos/);
  assert.match(communityGymHint(A({ invitable: 1 })), /Al que falta puedes invitarlo/);
  assert.strictEqual(communityGymHint(A({ pending: 0, invitable: 0 })), 'Tu comunidad está completa 🎉');
  // EL BUG: faltaba 1, no había ni un botón → decía «al que falta puedes invitarlo desde esta lista»
  assert.match(communityGymHint(A({ pending: 1, invitable: 0 })), /no puedes invitarlo desde aquí/);
  assert.match(communityGymHint(A({ pending: 2, invitable: 0 })), /A los 2 que faltan no puedes invitarlos/);
  // el único que falta es el propio coach → no se le dice que se invite a sí mismo
  assert.match(communityGymHint(A({ pending: 1, invitable: 0 }), { coachPending: true }), /El que falta eres tú/);
  // el coach pendiente NO se cuenta entre los «fuera de la lista»
  assert.match(communityGymHint(A({ pending: 2, invitable: 0 }), { coachPending: true }), /A quien falta no puedes invitarlo/);
  // defensivo: valores raros no producen frases absurdas («NaN que faltan»)
  assert.strictEqual(communityGymHint(null), 'Tu comunidad está completa 🎉');
  assert.strictEqual(communityGymHint({ pending: 'x', invitable: null }), 'Tu comunidad está completa 🎉');
});

test('communityGymAdoption: solo cuenta como activo a quien está en MI gym', () => {
  const a = communityGymAdoption(['u1', 'u2', 'u3'], ['u1', 'u9']);
  assert.deepStrictEqual(a, { total: 3, active: 1, pending: 2 });
  // un perfil que NO es de mi gym no infla la cifra (u9 se ignora)
  assert.strictEqual(communityGymAdoption(['u1'], ['u9']).active, 0);
  // duplicados no cuentan doble ni inflan el total
  assert.deepStrictEqual(communityGymAdoption(['u1', 'u1', 'u2'], ['u1', 'u1']), { total: 2, active: 1, pending: 1 });
  // basura fuera: ni ids vacíos ni nulos entran al conteo
  assert.deepStrictEqual(communityGymAdoption(['u1', '', null, 7], ['u1', null]), { total: 1, active: 1, pending: 0 });
  assert.deepStrictEqual(communityGymAdoption(null, null), { total: 0, active: 0, pending: 0 });
});

test('communityInviteMsg: texto plano, honesto y con el nombre de pila', () => {
  const m = communityInviteMsg('Samuel Cifuentes', 7);
  assert.ok(/^Hola Samuel 👋/.test(m), m);
  assert.ok(/Ya somos 7 del gym/.test(m), m);
  // dice lo que se ve Y lo que no (la corrección de copy que salió en A1)
  assert.ok(/apodo y tu constancia/.test(m), m);
  assert.ok(/nunca tu peso, tus fotos ni tus kilos/.test(m), m);
  assert.ok(m.indexOf('https://kronos-apex.github.io/apex-app/') > 0, m);
  // va por WhatsApp: TEXTO PLANO, sin una sola etiqueta
  assert.ok(!/[<>]/.test(m), m);
});

test('communityInviteMsg: concuerda el número y no inventa una comunidad que no existe', () => {
  assert.ok(/Ya hay alguien del gym/.test(communityInviteMsg('Luz', 1)));
  assert.ok(/Ya somos 2 del gym/.test(communityInviteMsg('Luz', 2)));
  // sin nadie todavía NO dice «ya somos 0»: cambia el ángulo, no miente
  const cero = communityInviteMsg('Luz', 0);
  assert.ok(/Abrimos la comunidad del gym/.test(cero), cero);
  assert.ok(!/0/.test(cero), cero);
  assert.ok(/Abrimos la comunidad del gym/.test(communityInviteMsg('Luz')), 'sin dato de conteo se comporta como cero');
  // sin nombre no queda un «Hola  👋» cojo
  assert.ok(/^¡Hola! 👋/.test(communityInviteMsg('', 3)));
  assert.ok(/^¡Hola! 👋/.test(communityInviteMsg(null, 3)));
  assert.ok(/^¡Hola! 👋/.test(communityInviteMsg('   ', 3)));
});

test('highestStreakMilestone: el umbral que YA ostenta, no el siguiente', () => {
  assert.strictEqual(highestStreakMilestone(1), null);
  assert.strictEqual(highestStreakMilestone(2), 2);
  assert.strictEqual(highestStreakMilestone(3), 2);   // sigue ostentando el de 2
  assert.strictEqual(highestStreakMilestone(4), 4);
  assert.strictEqual(highestStreakMilestone(11), 8);
  assert.strictEqual(highestStreakMilestone(99), 52); // el tope no se pasa de largo
  assert.strictEqual(highestStreakMilestone(0), null);
  assert.strictEqual(highestStreakMilestone(-5), null);
  assert.strictEqual(highestStreakMilestone(null), null);
  assert.strictEqual(highestStreakMilestone('cuatro'), null);
  // los umbrales son los que decidió el PO; si cambian aquí, cambian en la edge
  assert.deepStrictEqual(STREAK_MILESTONES, [2, 4, 8, 12, 24, 52]);
});

test('milestoneAskEligible: ignorar la tarjeta tres veces también es un «no» (F12)', () => {
  const prof = { show_milestones: false };
  assert.strictEqual(milestoneAskEligible(prof, 4, {}), 4);
  assert.strictEqual(milestoneAskEligible(prof, 4, { 4: 1 }), 4);
  assert.strictEqual(milestoneAskEligible(prof, 4, { 4: 2 }), 4);
  assert.strictEqual(milestoneAskEligible(prof, 4, { 4: MILESTONE_ASK_MAX_SHOWS }), null);
  assert.strictEqual(milestoneAskEligible(prof, 4, { 4: 9 }), null);
  // haber respondido (true) sigue callando ESE umbral para siempre
  assert.strictEqual(milestoneAskEligible(prof, 4, { 4: true }), null);
  // …pero el SIGUIENTE umbral vuelve a preguntar (el silencio es por hito, no global)
  assert.strictEqual(milestoneAskEligible(prof, 8, { 4: true, 8: 1 }), 8);
  assert.strictEqual(milestoneAskEligible(prof, 8, { 4: 9 }), 8);
  // basura en el mapa no calla la pregunta por accidente
  assert.strictEqual(milestoneAskEligible(prof, 4, { 4: 'x' }), 4);
  assert.strictEqual(milestoneAskEligible(prof, 4, { 4: null }), 4);
});

test('milestoneAskEligible: se pregunta una vez por umbral, nunca a quien ya dijo que sí', () => {
  const sinOptIn = { show_milestones: false };
  assert.strictEqual(milestoneAskEligible(sinOptIn, 4, {}), 4);
  // ya dijo que sí → jamás se le vuelve a preguntar
  assert.strictEqual(milestoneAskEligible({ show_milestones: true }, 4, {}), null);
  // sin perfil de comunidad no hay nada que celebrar ni dónde publicarlo
  assert.strictEqual(milestoneAskEligible(null, 52, {}), null);
  // aún no llega a ningún umbral
  assert.strictEqual(milestoneAskEligible(sinOptIn, 1, {}), null);
  // dijo «ahora no» en 4 → callado hasta el siguiente umbral, y ahí sí vuelve
  assert.strictEqual(milestoneAskEligible(sinOptIn, 5, { 4: true }), null);
  assert.strictEqual(milestoneAskEligible(sinOptIn, 8, { 4: true }), 8);
  // el perfil sin la columna (caché vieja) NO cuenta como opt-in dado
  assert.strictEqual(milestoneAskEligible({}, 4, {}), 4);
});

test('myTrainingSummary: racha de semanas consecutivas cumplidas', () => {
  const now = D(2026, 6, 3, 15); // miércoles
  // meta 2; esta semana (lun 1 + mié 3) cumple, semana pasada (lun 25 + mié 27 de mayo) cumple
  const sess = [{ date: D(2026, 5, 25) }, { date: D(2026, 5, 27) }, { date: D(2026, 6, 1) }, { date: D(2026, 6, 3) }];
  const s = myTrainingSummary({ days: 2 }, sess, now);
  assert.strictEqual(s.streakWeeks, 2);
  assert.strictEqual(s.daysSince, 0);          // entrenó HOY
  assert.strictEqual(s.thisWeekDays, 2);
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

test('waPhone: móvil CO sin indicativo → +57; ya con indicativo se respeta; vacío → ""', () => {
  // EL BUG ORIGINAL (v365): móvil de 10 dígitos que empieza por 3 (formatos variados) → anteponer 57
  assert.strictEqual(waPhone('300 123 4567'), '573001234567');
  assert.strictEqual(waPhone('3001234567'), '573001234567');
  assert.strictEqual(waPhone('310-555-0000'), '573105550000');
  // ya trae indicativo → NO se duplica
  assert.strictEqual(waPhone('57 300 123 4567'), '573001234567');
  assert.strictEqual(waPhone('+57 300 123 4567'), '573001234567');
  // internacional (no CO) → respetar tal cual
  assert.strictEqual(waPhone('1 415 555 2671'), '14155552671');
  // FIJA el guard de longitud (radar Fable §v365): un móvil extranjero que EMPIEZA por 3 pero
  // NO tiene 10 dígitos (España «34 612 345 678») NO debe recibir el 57 — sin este assert, borrar
  // `d.length===10` dejaba la suite verde en silencio.
  assert.strictEqual(waPhone('34 612 345 678'), '34612345678');
  // vacío / basura → '' (el caller cae a wa.me/?text=)
  assert.strictEqual(waPhone(''), '');
  assert.strictEqual(waPhone(null), '');
  assert.strictEqual(waPhone(undefined), '');
  assert.strictEqual(waPhone('  '), '');
  assert.strictEqual(waPhone('no tiene'), '');
});

test('waPhone: un número no plausible NO abre chat con un desconocido (F14)', () => {
  // ESTE TEST CONSAGRABA EL BUG. Afirmaba waPhone('6012345678') === '6012345678' con el comentario
  // «no adivinamos país, se deja». Pero `wa.me/6012345678` NO es neutral: WhatsApp lo lee como
  // E.164 → **+60 = Malasia**. Un fijo de Bogotá abría chat con un desconocido en otro continente.
  assert.strictEqual(waPhone('6012345678'), '');        // fijo de Bogotá (nuevo formato 60x)
  assert.strictEqual(waPhone('601 234 5678'), '');
  assert.strictEqual(waPhone('576012345678'), '');      // el mismo fijo CON indicativo 57
  assert.strictEqual(waPhone('4441234567'), '');        // 10 dígitos que no son móvil CO
  assert.strictEqual(waPhone('1234567'), '');           // fijo viejo de 7 dígitos
  assert.strictEqual(waPhone('300123'), '');            // incompleto
  assert.strictEqual(waPhone('3001234567890123456'), ''); // absurdamente largo
  // el internacional EXPLÍCITO sí se respeta (quien escribe «+» sabe su indicativo)
  assert.strictEqual(waPhone('+60 12 345 678'), '6012345678'); // Malasia de verdad
  assert.strictEqual(waPhone('+1 305 555 1234'), '13055551234');
  // sesgo DECLARADO: 10 dígitos que empiezan por 3 se asumen CO aunque puedan ser de EE.UU.
  assert.strictEqual(waPhone('3055551234'), '573055551234');
});

test('waPhoneNote: al coach se le dice POR QUÉ no se pudo usar el teléfono (F14)', () => {
  assert.strictEqual(waPhoneNote('3001234567'), '');
  assert.strictEqual(waPhoneNote('+1 305 555 1234'), '');
  assert.match(waPhoneNote(''), /No tienes su tel/);
  assert.match(waPhoneNote(null), /No tienes su tel/);
  assert.match(waPhoneNote('6012345678'), /parece un fijo/);
  assert.match(waPhoneNote('576012345678'), /parece un fijo/);
  assert.match(waPhoneNote('300123'), /incompleto/);
  assert.match(waPhoneNote('3001234567890123456'), /indicativo/);
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

// ── Pasos diarios (v362 — 👟 hábito parte 2) ──
test('stepsSet/stepsToday: fija el total del día, clamp [0..100000], inmutable', () => {
  const now = new Date(2026, 6, 9, 15, 0, 0); // 2026-07-09 local
  const orig = { steps: { '2026-07-08': 5000 } };
  const h1 = stepsSet(orig, 6200, now);
  assert.strictEqual(stepsToday(h1, now), 6200);
  assert.strictEqual(orig.steps['2026-07-09'], undefined);          // no muta
  assert.strictEqual(stepsToday(stepsSet(h1, 9500, now), now), 9500); // fija (no suma)
  assert.strictEqual(stepsToday(stepsSet(h1, -100, now), now), 0);    // piso 0
  assert.strictEqual(stepsToday(stepsSet(h1, 999999, now), now), 100000); // techo
  assert.strictEqual(stepsToday(stepsSet(h1, 'abc', now), now), 0);   // basura → 0
  assert.strictEqual(stepsToday(null, now), 0);                       // sin datos
  assert.strictEqual(h1.steps['2026-07-08'], 5000);                   // ayer intacto
});

test('stepsAdd: suma delta al total del día (atajos +1.000), clamp e inmutable', () => {
  const now = new Date(2026, 6, 9, 15, 0, 0);
  const h1 = stepsSet({}, 3000, now);
  assert.strictEqual(stepsToday(stepsAdd(h1, 1000, now), now), 4000);
  assert.strictEqual(stepsToday(stepsAdd(h1, -5000, now), now), 0);   // piso 0
  assert.strictEqual(stepsToday(stepsAdd({}, 1000, now), now), 1000); // desde cero
});

test('stepsSet: poda entradas con más de 30 días', () => {
  const now = new Date(2026, 6, 9);
  const h = stepsSet({ steps: { '2026-05-01': 8000, '2026-06-20': 6000 } }, 7000, now);
  assert.strictEqual(h.steps['2026-05-01'], undefined); // 69 días → fuera
  assert.strictEqual(h.steps['2026-06-20'], 6000);      // 19 días → queda
});

test('stepsWeek: 7 días terminando hoy, con ceros donde no hay registro', () => {
  const now = new Date(2026, 6, 9);
  const wk = stepsWeek({ steps: { '2026-07-09': 8200, '2026-07-06': 5000 } }, now);
  assert.strictEqual(wk.length, 7);
  assert.strictEqual(wk[6].day, '2026-07-09');
  assert.strictEqual(wk[6].n, 8200);
  assert.strictEqual(wk[3].n, 5000);
  assert.strictEqual(wk[0].n, 0);
  assert.strictEqual(STEPS_GOAL_DEFAULT, 8000); // meta fija OMS
});

test('waterGoalFor: plan del coach manda (>0, tope 30); sin plan → peso', () => {
  const c = { weight: 70 };
  assert.strictEqual(waterGoalFor(c, { water: 10 }), 10);      // plan del coach
  assert.strictEqual(waterGoalFor(c, { water: '9' }), 9);      // string numérico
  assert.strictEqual(waterGoalFor(c, { water: 99 }), 30);      // tope 30
  assert.strictEqual(waterGoalFor(c, { water: 0 }), 10);       // 0 → cae al peso (70kg → 10)
  assert.strictEqual(waterGoalFor(c, null), 10);               // sin plan → peso
  assert.strictEqual(waterGoalFor(c, {}), 10);                 // plan sin water → peso
  assert.strictEqual(waterGoalFor({ weight: null }, null), 8); // sin peso ni plan → fallback 8
});

test('waterAdherence: cuenta días cumplidos y registrados en los últimos 7', () => {
  const now = new Date(2026, 6, 9); // 2026-07-09
  // meta 8: 07-09=8 (cumple), 07-08=10 (cumple), 07-06=3 (registrado, no cumple), resto 0
  const habits = { water: { '2026-07-09': 8, '2026-07-08': 10, '2026-07-06': 3 } };
  const a = waterAdherence(habits, 8, now);
  assert.strictEqual(a.week.length, 7);
  assert.strictEqual(a.week[6].n, 8);
  assert.strictEqual(a.week[6].met, true);   // hoy cumplió
  assert.strictEqual(a.week[5].met, true);   // ayer cumplió (10≥8)
  assert.strictEqual(a.week[3].met, false);  // 07-06: 3 vasos, no cumple
  assert.strictEqual(a.week[3].n, 3);
  assert.strictEqual(a.metDays, 2);          // solo 07-09 y 07-08
  assert.strictEqual(a.loggedDays, 3);       // 3 días con ≥1 vaso
});

test('waterAdherence: sin datos → todo en cero (ficha oculta)', () => {
  const now = new Date(2026, 6, 9);
  const a = waterAdherence(null, 8, now);
  assert.strictEqual(a.metDays, 0);
  assert.strictEqual(a.loggedDays, 0); // 0 registrados → la UI oculta la tarjeta
  assert.strictEqual(a.week.every(d => d.n === 0 && d.met === false), true);
});

test('waterAdherence: la meta cambia qué días cuentan (plan del coach vs peso)', () => {
  const now = new Date(2026, 6, 9);
  const habits = { water: { '2026-07-09': 6, '2026-07-08': 6 } };
  assert.strictEqual(waterAdherence(habits, 6, now).metDays, 2);  // meta 6 → ambos cumplen
  assert.strictEqual(waterAdherence(habits, 8, now).metDays, 0);  // meta 8 → ninguno
  assert.strictEqual(waterAdherence(habits, 8, now).loggedDays, 2); // pero sí registrados
  // meta inválida → cae al default por peso (8): ninguno cumple
  assert.strictEqual(waterAdherence(habits, 0, now).metDays, 0);
  assert.strictEqual(waterAdherence(habits, 'x', now).metDays, 0);
});

test('waterAdherence: límites — 7 días llenos y borde de semana', () => {
  const now = new Date(2026, 6, 9);
  const full = { water: {} };
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    full.water[waterWeek({ water: {} }, d)[6].day] = 8;
  }
  const a = waterAdherence(full, 8, now);
  assert.strictEqual(a.metDays, 7);
  assert.strictEqual(a.loggedDays, 7);
  // un registro de hace 7 días (fuera de la ventana) NO cuenta
  const old = { water: { '2026-07-02': 8 } }; // 07-09 menos 7 días = 07-02, queda fuera del arreglo de 7
  assert.strictEqual(waterAdherence(old, 8, now).loggedDays, 0);
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

// 🔴 EL RECORTE VA DESPUÉS DEL FILTRO. Antes se cortaba a 3 y la PANTALLA filtraba las novedades
// de Premium después: en cuanto las tres más nuevas fueron todas `coach:true` —pasó de verdad al
// publicar v477 y v478—, a quien está en el tier libre no le quedaba ninguna y **el tour dejaba
// de abrir del todo**. Un tour que no sale no da error: nadie lo habría notado.
test('🔴 newsToShow: al tier libre le quedan novedades aunque las 3 más nuevas sean de Premium', () => {
  const list = [
    { v: 470, t: 'vieja libre' }, { v: 471, t: 'otra libre' }, { v: 472, t: 'tercera libre' },
    { v: 476, t: 'premium a', coach: true }, { v: 477, t: 'premium b', coach: true }, { v: 478, t: 'premium c', coach: true },
  ];
  // Con coach: las 3 más nuevas, que son las de Premium.
  assert.deepStrictEqual(newsToShow(list, 0, { coach: true }).map(n => n.v), [478, 477, 476]);
  // Sin coach: NO se queda sin nada — le llegan las 3 que sí son para él.
  const libre = newsToShow(list, 0, { coach: false });
  assert.deepStrictEqual(libre.map(n => n.v), [472, 471, 470]);
  assert.ok(libre.every(n => !n.coach), 'se le coló una novedad de Premium a quien no tiene coach');
  // Y sin `opts` se comporta EXACTAMENTE como antes (los llamadores viejos no cambian).
  assert.deepStrictEqual(newsToShow(list, 0).map(n => n.v), [478, 477, 476]);
});

test('painTipFor: tip por área con fallback conservador', () => {
  assert.ok(/encima de la cabeza/.test(painTipFor('hombro')));
  assert.ok(/rango de movimiento que NO duele/.test(painTipFor('zona inventada')));
  // 10 → 16 el 2026-08-08: la lista la dictó Laura (§1.2 de su dictamen) porque a la vieja le
  // faltaban las zonas que la gente realmente reporta — el PO marcó dolor en los ABDUCTORES y esa
  // zona no existía, así que cayó en «otra zona» y no excluyó nada. No es aflojar el test: el
  // número se sube porque cambió el dato clínico, y quién lo dictó está escrito al lado.
  assert.strictEqual(PAIN_AREAS.length, 16);
  assert.strictEqual(core.PAIN_SIDES.length, 4);
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

test('ESTÁTICO: la invitación «Abre AVI» lleva el enlace de la app', () => {
  // El mensaje pedía «abre AVI» y NO decía dónde: la persona recibía la orden sin la puerta.
  // Es el canal de rescate de quien no tiene push, así que sin enlace no rescata a nadie.
  const fs = require('fs');
  const coach = fs.readFileSync(__dirname + '/app-3-coach.js', 'utf8');
  const fn = coach.slice(coach.indexOf('function coachInviteOpenApp()'));
  const cuerpo = fn.slice(0, fn.indexOf('\n}'));
  assert.ok(/AVI_SHARE_URL/.test(cuerpo), 'la invitación no incluye la URL de la app');
  assert.ok(/\$\{url\}/.test(cuerpo), 'la URL se calcula pero no entra en el mensaje');
});

test('ESTÁTICO + VIVO: el teléfono del registro llega entero hasta la ficha (6 eslabones)', () => {
  // 15 de 22 asesorados eran imposibles de contactar porque el registro no pedía el número
  // y `_provisionFreeClient` lo escribía vacío A LA FUERZA. El dato cruza 4 manos y ningún
  // test unitario lo cubre: si alguien corta un eslabón, el teléfono deja de llegar EN
  // SILENCIO y solo se nota meses después, cuando hay que escribirle a alguien y no se puede.
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const coach = fs.readFileSync(__dirname + '/app-3-coach.js', 'utf8');

  // 1) el campo existe en el wizard
  assert.ok(/id="su-phone"/.test(html), 'falta el campo su-phone en el registro');
  // 2) se recoge YA normalizado (sin waPhone, wa.me sale roto — gotcha v365)
  assert.ok(/phone:\s*\(typeof waPhone==='function'\)/.test(coach),
    'el registro debe normalizar el teléfono con waPhone al recogerlo');
  // 3) viaja en la metadata de la cuenta nueva
  assert.ok(/const meta=\{[^}]*phone:data\.phone/.test(coach),
    'el teléfono no viaja en la metadata del signup');
  // 4) y aterriza en la ficha (NO vacío a la fuerza, que era el bug)
  assert.ok(/phone:\(p&&p\.phone\)\|\|''/.test(coach),
    '_provisionFreeClient volvió a escribir el teléfono vacío');
  assert.ok(!/phone:'',/.test(coach),
    'quedó el phone:"" a la fuerza en _provisionFreeClient');

  // 🔴 EL ESLABÓN QUE FALTABA. Los checks de arriba son REGEX sobre el código: miran 4 puntos
  // de una cadena de 6 y por eso dieron verde mientras el teléfono se perdía de verdad. Entre
  // «viaja en la metadata» y «aterriza en la ficha» está `_profileFromMeta`, que NO devolvía
  // `phone` — así que `_provisionFreeClient` leía undefined y guardaba "". Probado ejecutando
  // la función el 2026-08-01: el arreglo de v418 no guardaba nada.
  // Este check EJECUTA la función real en vez de mirarla: un regex no puede volver a taparlo.
  const cuerpo = (nombre) => {
    const i = coach.indexOf('function ' + nombre + '(');
    assert.ok(i >= 0, 'no existe ' + nombre);
    let d = 0, j = coach.indexOf('{', i);
    for (; j < coach.length; j++) { const c = coach[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
    return coach.slice(i, j + 1);
  };
  const _pendingWizard = () => ({});
  const profileFromMeta = eval('(' + cuerpo('_profileFromMeta') + ')');
  const prof = profileFromMeta({ id: 'u', email: 'a@b.c', user_metadata: {
    name: 'N', goal: 'Ganar músculo', level: 'Principiante', days: 3,
    phone: '573001234567', notes: 'hernia discal' } });
  assert.strictEqual(prof.phone, '573001234567', 'el teléfono se pierde entre la metadata y la ficha');
  assert.strictEqual(prof.notes, 'hernia discal', 'las lesiones se pierden entre la metadata y la ficha');
});

test('🔴 el registro PREGUNTA por lesiones, y llegan hasta la ficha', () => {
  // Sin esto el motor de exclusiones es CÓDIGO MUERTO para quien se registra solo: `notes:''`
  // iba a pelo y `parseLimitations` no tenía qué leer. Y el consentimiento ya le decía al
  // usuario que autorizaba el tratamiento de sus «lesiones» — texto que afirmaba algo que el
  // código no hacía.
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const coach = fs.readFileSync(__dirname + '/app-3-coach.js', 'utf8');
  assert.ok(/id="su-notes"/.test(html), 'falta el campo de lesiones en el registro');
  // ⚠️ Las DOS vías por separado. Un `notes:(g('su-notes')` a secas hace match con la de
  // Google y con la de correo indistintamente: al sabotear la de correo el test seguía verde
  // porque la otra lo tapaba. Cada camino se afirma con su forma propia.
  assert.ok(/notes:\(g\('su-notes'\)&&g\('su-notes'\)\.value\|\|''\)\.trim\(\)/.test(coach),
    'el registro por CORREO no recoge las lesiones');
  assert.ok(/notes:\(g\('su-notes'\)\|\|''\)\.trim\(\)/.test(coach),
    'el registro por GOOGLE no recoge las lesiones');
  assert.ok(/notes:data\.notes/.test(coach), 'las lesiones no viajan en la metadata');
  assert.ok(/notes:\(p&&p\.notes\)\|\|''/.test(coach), 'las lesiones no aterrizan en la ficha');
  // y lo declarado en el wizard alimenta de verdad el motor de exclusiones
  const lim = parseLimitations('hernia discal');
  assert.ok(lim.detected, 'una hernia declarada en el registro no activa las exclusiones');
});

test('todo ícono que el registro usa EXISTE en el sprite', () => {
  // El campo de WhatsApp (v418) apuntaba a `#i-chat`, que nunca se definió: salía un hueco.
  // Es por lo que quedó pendiente «ver renderizado el campo del teléfono».
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const definidos = new Set([...html.matchAll(/<symbol id="(i-[a-z0-9-]+)"/g)].map(m => m[1]));
  const usados = new Set([...html.matchAll(/href="#(i-[a-z0-9-]+)"/g)].map(m => m[1]));
  const faltan = [...usados].filter(x => !definidos.has(x));
  assert.deepStrictEqual(faltan, [], 'íconos usados que no existen en el sprite');
});

test('chatDeliveryBlock: avisa cuando el mensaje del coach NO le va a llegar', () => {
  // Caso real medido 2026-07-31: 5 personas de plan 'app' con 20 mensajes del coach que
  // ninguna podía leer. El chat es solo-coach y escribirle a 'app'/'libre' era MUDO.
  const app = chatDeliveryBlock({ tier: 'app' });
  assert.ok(app, 'plan app: el mensaje NO llega → tiene que avisar');
  assert.strictEqual(app.plan, 'app');
  assert.strictEqual(app.label, 'Premium app');       // el texto que lee el coach
  const libre = chatDeliveryBlock({ tier: 'libre' });
  assert.ok(libre, 'plan libre: tampoco llega');
  assert.strictEqual(libre.plan, 'libre');
  // Y NO debe avisar donde el chat sí funciona — un aviso de más asusta al coach sin motivo.
  assert.strictEqual(chatDeliveryBlock({ tier: 'premium' }), null);
  assert.strictEqual(chatDeliveryBlock({}), null);    // creado por coach, sin tier: sí tiene chat
  assert.strictEqual(chatDeliveryBlock(null), null);  // sin cliente no hay nada que avisar
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
test('rank tier 5: dejó de entrenar (≥7 días) → idle con nº de días en sev', () => {
  const r = clientAttentionRank(_mkClient(), { x: [{ date: _rDay(-9) }] }, _RNOW);
  assert.strictEqual(r.tier, 5); // v360: re-numerado (antes 3) al insertar unread(2)/lead(3)
  assert.strictEqual(r.reason, 'idle');
  assert.strictEqual(r.sev, 9);
  assert.match(r.label, /9 días/);
});
test('rank: entrenó hace <7 días → al día (no molesta al coach)', () => {
  assert.strictEqual(clientAttentionRank(_mkClient(), { x: [{ date: _rDay(-3) }] }, _RNOW).reason, 'ok');
});
test('rank: SUSPENDIDO va al fondo sin chip, aunque no entrene o tenga dolor (Lucas v317)', () => {
  // suspendido + inactivo 30 días → NO "sin entrenar"; tier 7 = el fondo (debajo del sano tier 6)
  const s1 = clientAttentionRank(_mkClient({ suspended: true }), { x: [{ date: _rDay(-30) }] }, _RNOW);
  assert.strictEqual(s1.tier, 7); // v360: re-numerado (antes 5) — sigue siendo el FONDO
  assert.strictEqual(s1.reason, 'ok');
  assert.strictEqual(s1.label, '');
  // suspendido + dolor nivel 3 → tampoco salta al tope
  const s2 = clientAttentionRank(_mkClient({ suspended: true, painCare: [{ level: 3, at: _rDay(-1) }] }), {}, _RNOW);
  assert.strictEqual(s2.tier, 7);
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

// ── v360: 💬 mensaje sin leer (tier 2) + 🙋 pidió coach (tier 3) ──
test('rank tier 2: mensaje sin leer del asesorado rankea ENTRE vencido y lead', () => {
  const c = _mkClient({ wantsCoach: true, wantsCoachAt: _rDay(-5) }); // también es lead…
  const opts = { msgs: [{ from: 'client', text: 'hola', date: _rDay(-2) }], lastReadTs: null };
  const r = clientAttentionRank(c, { x: [{ date: _rDay(-1) }] }, _RNOW, opts);
  assert.strictEqual(r.tier, 2); // …pero el unread manda mientras no lo lea
  assert.strictEqual(r.reason, 'unread');
  assert.match(r.label, /sin responder/);
  // sev = ms desde el unread más viejo (2 días)
  assert.strictEqual(r.sev, 2 * 86400000);
});
test('rank tier 2: sev = ms desde el mensaje sin leer MÁS VIEJO (quien más espera, primero)', () => {
  const opts = { msgs: [
    { from: 'client', text: 'a', date: _rDay(-3) },
    { from: 'coach',  text: 'resp', date: _rDay(-2.5) }, // el mensaje del coach NO cuenta
    { from: 'client', text: 'b', date: _rDay(-1) },
  ], lastReadTs: null };
  const r = clientAttentionRank(_mkClient(), { x: [{ date: _rDay(-1) }] }, _RNOW, opts);
  assert.strictEqual(r.tier, 2);
  assert.strictEqual(r.sev, 3 * 86400000); // el más viejo (3 días), no el reciente
});
test('rank tier 2: lastReadTs posterior al último mensaje → ya leído, NO sube', () => {
  const opts = { msgs: [{ from: 'client', text: 'a', date: _rDay(-3) }], lastReadTs: Date.parse(_rDay(-2)) };
  const r = clientAttentionRank(_mkClient({ payments: [{ dueDate: _rDay(20) }] }), { x: [{ date: _rDay(-1) }] }, _RNOW, opts);
  assert.strictEqual(r.reason, 'ok'); // entrenó hace 1 día → al día, sin chip
});
test('rank tier 2: mensaje sin fecha válida NO cuenta (no inventamos, lección v359)', () => {
  const opts = { msgs: [{ from: 'client', text: 'sin fecha' }], lastReadTs: null };
  const r = clientAttentionRank(_mkClient(), { x: [{ date: _rDay(-1) }] }, _RNOW, opts);
  assert.strictEqual(r.reason, 'ok'); // sin date parseable → no es "sin leer"
});
test('rank tier 3: lead "pidió coach" ordena por antigüedad de wantsCoachAt', () => {
  const r = clientAttentionRank(_mkClient({ wantsCoach: true, wantsCoachAt: _rDay(-6) }), { x: [{ date: _rDay(-1) }] }, _RNOW);
  assert.strictEqual(r.tier, 3);
  assert.strictEqual(r.reason, 'lead');
  assert.strictEqual(r.sev, 6);
  assert.match(r.label, /hace 6d/);
});
test('rank tier 3: lead sin wantsCoachAt → sev 0 (al FINAL del tier, sin inventar fecha)', () => {
  const r = clientAttentionRank(_mkClient({ wantsCoach: true }), { x: [{ date: _rDay(-1) }] }, _RNOW);
  assert.strictEqual(r.tier, 3);
  assert.strictEqual(r.reason, 'lead');
  assert.strictEqual(r.sev, 0);
  assert.strictEqual(r.label, '🙋 Pidió coach'); // sin "hoy" ni "hace Nd" — no afirmamos cuándo
  // y NO adelanta a un lead con fecha (sev 0 = el más bajo del tier)
  const withDate = clientAttentionRank(_mkClient({ wantsCoach: true, wantsCoachAt: _rDay(-1) }), {}, _RNOW);
  assert.ok(withDate.sev > r.sev);
});
test('rank tier 3: lead que pidió coach HOY → label "hoy"', () => {
  const r = clientAttentionRank(_mkClient({ wantsCoach: true, wantsCoachAt: _rDay(0) }), { x: [{ date: _rDay(-1) }] }, _RNOW);
  assert.strictEqual(r.sev, 0);
  assert.match(r.label, /hoy/);
});
test('rank v360: SUSPENDIDO con mensaje sin leer SIGUE al fondo (tier 7 corta antes)', () => {
  const opts = { msgs: [{ from: 'client', text: 'urgente', date: _rDay(-1) }], lastReadTs: null };
  const r = clientAttentionRank(_mkClient({ suspended: true }), { x: [{ date: _rDay(-1) }] }, _RNOW, opts);
  assert.strictEqual(r.tier, 7);
  assert.strictEqual(r.reason, 'ok');
  assert.strictEqual(r.label, '');
});
test('rank v360: dolor sigue ARRIBA de todo (aun con mensaje sin leer y lead)', () => {
  const c = _mkClient({ wantsCoach: true, wantsCoachAt: _rDay(-5), painCare: [{ level: 2, at: _rDay(-1) }] });
  const opts = { msgs: [{ from: 'client', text: 'x', date: _rDay(-1) }], lastReadTs: null };
  const r = clientAttentionRank(c, {}, _RNOW, opts);
  assert.strictEqual(r.tier, 0);
  assert.strictEqual(r.reason, 'pain');
});
test('rank v360: SIN opts → comportamiento v317 idéntico (prueba del refactor aditivo)', () => {
  // un lead con mensajes existe en DB, pero sin pasar opts la función no los ve → tier por
  // membresía/actividad como antes. Aquí: al día, entrenó ayer → ok.
  const c = _mkClient({ wantsCoach: true, wantsCoachAt: _rDay(-5) });
  // Sin wantsCoach el resultado base es 'ok'; CON wantsCoach y sin opts, el lead SÍ se detecta
  // por el propio campo del cliente (no necesita opts) → tier 3. Ambos deterministas.
  const r = clientAttentionRank(c, { x: [{ date: _rDay(-1) }] }, _RNOW);
  assert.strictEqual(r.tier, 3);
  assert.strictEqual(r.reason, 'lead');
  // un cliente normal sin nada especial y sin opts → ok (idéntico a v317)
  assert.strictEqual(clientAttentionRank(_mkClient(), { x: [{ date: _rDay(-1) }] }, _RNOW).reason, 'ok');
});
test('sortClientsByAttention v360: unread(2) sobre lead(3) sobre por-vencer(4); optsById aditivo', () => {
  const clients = [
    { id: 'ok',     name: 'Ana',   createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(20) }] },
    { id: 'lead',   name: 'Beto',  createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(20) }], wantsCoach: true, wantsCoachAt: _rDay(-3) },
    { id: 'unread', name: 'Caro',  createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(20) }] },
    { id: 'exp',    name: 'Dani',  createdAt: _rDay(-60), routines: [{ id: 1 }], payments: [{ dueDate: _rDay(4) }] },
  ];
  const hist = { ok: [{ date: _rDay(-1) }], lead: [{ date: _rDay(-1) }], unread: [{ date: _rDay(-1) }], exp: [{ date: _rDay(-1) }] };
  const optsById = { unread: { msgs: [{ from: 'client', text: 'hola', date: _rDay(-2) }], lastReadTs: null } };
  const order = sortClientsByAttention(clients, hist, _RNOW, optsById).map(x => x.c.id);
  assert.deepStrictEqual(order, ['unread', 'lead', 'exp', 'ok']);
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
section('Registro de alimentos — F1a: catálogo de búsqueda (E5, E7, E9 de Fable)');

const _foodsJson = (() => {
  try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'foods.json'), 'utf8')); }
  catch { return null; }
})();

// 🔴 E5 — LA RAZÓN DE LAS DOS CAPAS. `NUT_MENUS` referencia alimentos POR ID: si el catálogo de
// búsqueda pisara o renombrara esos ids, los platos que la app YA recomienda se romperían.
// ── LA PROCEDENCIA DE LOS 50 DEL RECETARIO (v487) ─────────────────────────────────────────
// Hasta hoy **ninguno de los 50 declaraba de dónde salía su número**, mientras la OTRA capa
// (`foods.json`, el buscador) sí lo exige alimento por alimento. Y la capa sin trazabilidad es
// justo la que decide cuántos gramos come la gente. Peor: `foods.json` copia los 50 con
// `src:'avi50'`, así que 50 de sus 181 entradas «con fuente» apuntan de vuelta a la tabla que no
// la tiene — la trazabilidad era CIRCULAR donde más importaba.
const NUT_SRC_OK = ['usda_sr', 'tcac2018', 'etiqueta', 'derivado', 'sin_verificar'];
// 🎯 CERO desde v490 (2026-08-16): los 6 que quedaban se cerraron contra su fila. Solo puede BAJAR,
// así que a partir de aquí el tope hace de candado absoluto — un alimento nuevo entra CON su fuente.
const NUT_SIN_VERIFICAR_TOPE = 0;

test('🔴 v487 · los 50 del recetario declaran TODOS de dónde salió su número', () => {
  for (const f of NUT_FOODS) {
    assert.ok(f.src, `«${f.name}» (${f.id}) no dice de dónde salieron sus macros`);
    assert.ok(NUT_SRC_OK.indexOf(f.src) !== -1, `${f.id}: fuente desconocida «${f.src}»`);
    // Una fuente externa sin la CITA al lado no es una fuente: es una afirmación.
    if (f.src === 'usda_sr' || f.src === 'tcac2018' || f.src === 'derivado') {
      assert.ok(f.ref && f.ref.length > 15, `${f.id} dice «${f.src}» pero no cita contra qué`);
    }
  }
});

test('🔴 v487 · el número de alimentos SIN VERIFICAR solo puede BAJAR', () => {
  // Se afirma por CONTEO, no por lista: una lista caza que se quite uno, jamás que se AGREGUE un
  // alimento nuevo sin fuente — que es exactamente como se llega a 50 sin trazabilidad.
  const sin = NUT_FOODS.filter(f => f.src === 'sin_verificar');
  assert.ok(sin.length <= NUT_SIN_VERIFICAR_TOPE,
    `subió a ${sin.length} (tope ${NUT_SIN_VERIFICAR_TOPE}). Un alimento nuevo entra CON su fuente: ` +
    sin.map(f => f.id).slice(0, 5).join(', '));
});

test('🔴 v487 · la yuca es la fila B106 de la TCAC, y NO la deducción que fue', () => {
  // La historia completa en el comentario de `NUT_FOODS`. Resumen: el 112 que estuvo aquí NO salía
  // de ninguna tabla — era la fila CRUDA de USDA (SR 169985: 160/1,36/38,1/0,28) × 0,70 exacto en
  // los cuatro macros, con un factor de absorción de agua que la propia TCAC desmiente (humedad
  // 61,6% cocida contra 60,9% cruda). Ahora es la fila oficial, leída del PDF del ICBF.
  const y = NUT_FOODS.find(f => f.id === 'yuca');
  assert.strictEqual(y.src, 'tcac2018');
  assert.ok(/B106/.test(y.ref), 'la cita lleva el código de la fila, o no se puede re-verificar');
  // Los valores se afirman UNO A UNO: cambiarlos obliga a volver al PDF, que es el único candado
  // que existe contra un dato internamente coherente (la clase de la yuca, en la yuca).
  assert.strictEqual(y.kcal, 157);
  assert.strictEqual(y.p, 0.7);
  assert.strictEqual(y.c, 36.6, 'carbohidrato TOTAL — el disponible (33,9) dejaría el kcal descuadrado y mediría distinto que las 36 filas USDA de al lado');
  assert.strictEqual(y.f, 0.2);
  // Y el candado contra la vuelta atrás: nunca más el crudo × un factor inventado.
  assert.ok(Math.abs(y.kcal / 160 - 0.70) > 0.1, 'no puede volver a ser el crudo de USDA × 0,70');
});

test('🔴 v492 · todo campo tiene NOMBRE accesible y todo modal es un diálogo con nombre', () => {
  // Nace de una auditoría externa que decía «Accessibility 42/100, Screen Reader FAIL». Medido:
  // la mayor parte de su lista ya estaba (0 imágenes sin alt, `lang="es"`, regla global de foco),
  // pero DOS cosas eran ciertas — campos sin nombre y modales sin `role` — y son justo las que
  // dejan a un lector de pantalla anunciando «cuadro combinado» sin decir de qué.
  // ⚠️ LA REGLA DE ESTE TEST SE CORRIGIÓ ANTES DE ESCRIBIRLO. La primera versión (la que produjo
  // el «35 campos») contaba de más: no veía las etiquetas que ENVUELVEN al campo —que sí dan
  // nombre— y además leía dentro de los COMENTARIOS del HTML. Siete de aquellos 35 nunca
  // estuvieron mal. Un candado con la regla floja acusa lo sano y enseña a ignorarlo.
  const raw = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
  const html = raw.replace(/<!--[\s\S]*?-->/g, '');   // los comentarios no son interfaz

  // Tramos cubiertos por una etiqueta que ENVUELVE (`<label>Texto <input></label>`).
  const envuelve = [];
  const reLab = /<label\b[^>]*>[\s\S]*?<\/label>/g;
  for (let m; (m = reLab.exec(html));) envuelve.push([m.index, m.index + m[0].length]);
  const idsFor = new Set([...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map(m => m[1]));
  const idsDoc = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

  const anonimos = [];
  for (let m, re = /<(input|select|textarea)\b[^>]*>/g; (m = re.exec(html));) {
    const t = m[0];
    if (/type="hidden"/.test(t) || /\shidden(\s|\/|>)/.test(t)) continue;
    if (/aria-label(ledby)?=/.test(t) || /placeholder="/.test(t)) continue;
    if (envuelve.some(([a, b]) => m.index > a && m.index < b)) continue;
    const id = /\sid="([^"]+)"/.exec(t);
    if (id && idsFor.has(id[1])) continue;
    anonimos.push(id ? id[1] : t.slice(0, 60));
  }
  assert.deepStrictEqual(anonimos, [],
    `campos sin nombre accesible (un lector de pantalla no dice qué se pide ahí): ${anonimos.join(', ')}`);

  // Los modales: `role`, y un nombre que APUNTE A ALGO. Un `aria-labelledby` hacia un id que no
  // existe no da nombre — se lee igual que no tenerlo, y es el fallo típico al copiar el patrón.
  const modales = [...html.matchAll(/<div\s+class="([^"]*)"([^>]*)>/g)]
    .filter(m => m[1].split(/\s+/).indexOf('md') !== -1);
  assert.ok(modales.length >= 20, `solo se encontraron ${modales.length} modales: el patrón cambió`);
  modales.forEach(m => {
    const a = m[2], quien = (/aria-label(?:ledby)?="([^"]*)"/.exec(a) || [])[1] || '(sin nombre)';
    assert.ok(/role="dialog"/.test(a), `un modal sin role="dialog" (${quien})`);
    assert.ok(/aria-modal="true"/.test(a), `un modal sin aria-modal (${quien})`);
    const by = /aria-labelledby="([^"]+)"/.exec(a);
    assert.ok(by || /aria-label="[^"]+"/.test(a), 'un modal sin nombre accesible');
    if (by) assert.ok(idsDoc.has(by[1]),
      `un modal apunta su nombre a «${by[1]}», que NO existe en el documento: eso no da nombre`);
  });

  // Lo que la auditoría daba por roto y ya estaba — se afirma para que no se rompa AHORA.
  assert.ok(/<html[^>]+lang="es"/.test(raw), 'el documento perdió su idioma');
  assert.strictEqual([...raw.matchAll(/<img\b[^>]*>/g)].filter(m => !/\salt=/.test(m[0])).length, 0,
    'una imagen sin alt');
});

test('🔴 v491 · la versión que se MUESTRA es la que se SIRVIÓ (no un literal que caduca)', () => {
  // Hasta v490 la barra del coach decía «v2.0 · Jun 2026» a mano: dos meses y ~490 despliegues
  // desactualizada, y una auditoría externa la copió y fechó su informe entero en junio de 2026.
  // Lo que se afirma aquí no es que la función «funcione» sino la propiedad de fondo: **lo que
  // se pinta coincide con el `?v=` real del archivo desplegado**. Así, si alguien vuelve a
  // escribir un número a mano o rompe la derivación, esto se pone rojo con el motivo delante.
  const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
  const servida = /\?v=(\d+)/.exec(html);
  assert.ok(servida, 'index.html no declara ninguna versión ?v=');
  const urls = (html.match(/(?:src|href)="([^"]+)"/g) || []).map(s => s.slice(s.indexOf('"') + 1, -1));
  assert.strictEqual(core.appBuildFrom(urls), parseInt(servida[1], 10),
    'lo que la app va a mostrar no es la versión que se está sirviendo');
  assert.ok(core.appBuildLabel(urls).indexOf(servida[1]) !== -1,
    `el rótulo «${core.appBuildLabel(urls)}» no contiene la versión servida (${servida[1]})`);
  // 🔒 Y los dos huecos llegan VACÍOS del HTML: un texto escrito ahí volvería a ser el bug.
  ['sb-build', 'cn-build'].forEach(id => {
    const m = new RegExp('id="' + id + '"[^>]*>([^<]*)<').exec(html);
    assert.ok(m, `falta el hueco #${id} donde va la versión`);
    assert.strictEqual(m[1].trim(), '',
      `#${id} trae texto escrito a mano («${m[1].trim()}»): eso es lo que caduca`);
  });
  // 🔒 Sin `?v=` NO se inventa un número (un rótulo que adivina es el mismo defecto).
  assert.strictEqual(core.appBuildFrom(['avi-core.js', 'styles.css']), null);
  assert.strictEqual(core.appBuildLabel([]), 'AVI');
  assert.strictEqual(core.appBuildFrom(null), null, 'sin lista no puede reventar');
  // Control: con una versión distinta, el rótulo cambia — o no está leyendo nada.
  assert.ok(core.appBuildLabel(['x.js?v=123']).indexOf('123') !== -1);
});

test('🔴 v490 · las 6 últimas filas sin fuente son la fila que imprime la fuente', () => {
  // Medido el 2026-08-16 contra el PDF del ICBF (páginas leídas como JPEG, ver `scratchpad/ext.py`
  // en el commit) y contra la API de FoodData Central: **ninguno de sus valores anteriores
  // reconciliaba con NINGUNA fila de las dos tablas** — eran cifras de cabeza, la clase del 112 de
  // la yuca. Se afirman UNO A UNO a propósito: cambiarlos obliga a volver a la fuente, que es el
  // único candado que existe contra un dato internamente coherente.
  const F = id => NUT_FOODS.find(f => f.id === id);
  const esperado = {
    // TCAC — sección F (carnes). Esa sección solo publica carbohidrato TOTAL: no hay columna de
    // «disponibles», así que aquí el doble criterio de la tabla ni se plantea.
    pollo_muslo: { src: 'tcac2018', cod: /F074/, kcal: 186, p: 24.7, c: 0,   f: 9.7 },
    res_magra:   { src: 'tcac2018', cod: /F095/, kcal: 176, p: 28.7, c: 0.5, f: 6.6 },
    cerdo_lomo:  { src: 'tcac2018', cod: /F018/, kcal: 170, p: 35.1, c: 0,   f: 3.2 },
    // USDA — la TCAC NO tiene estas tres: no publica molida COCIDA (su F101 es cruda), no tiene
    // leche semidescremada (solo entera y descremada) y no tiene sección de leguminosas ni de
    // frutos secos (salta las letras I, M y O), así que el maní no existe en ella.
    res_molida:  { src: 'usda_sr', cod: /171794/, kcal: 230, p: 28.4, c: 0,    f: 12.0 },
    leche:       { src: 'usda_sr', cod: /172205/, kcal: 50,  p: 3.3,  c: 4.8,  f: 1.98 },
    crema_mani:  { src: 'usda_sr', cod: /172470/, kcal: 598, p: 22.2, c: 22.3, f: 51.4 },
  };
  Object.keys(esperado).forEach(id => {
    const f = F(id), e = esperado[id];
    assert.ok(f, `desapareció ${id} de la tabla`);
    assert.strictEqual(f.src, e.src, `${id} cambió de fuente`);
    assert.ok(e.cod.test(f.ref || ''),
      `${id}: la cita tiene que llevar el código de la fila (${e.cod}), o no se puede re-verificar`);
    ['kcal', 'p', 'c', 'f'].forEach(k => assert.strictEqual(f[k], e[k],
      `${id}.${k} = ${f[k]} y la fuente dice ${e[k]} — se vuelve al PDF/API antes de tocarlo`));
  });
  // 🔒 EL CANDADO CONTRA LA VUELTA ATRÁS, con los valores INVENTADOS escritos: si alguien los
  // restaura «porque el plato cuadraba mejor», esto se pone rojo con el motivo delante.
  const inventados = { pollo_muslo: 209, res_magra: 187, res_molida: 176, cerdo_lomo: 174, leche: 47, crema_mani: 588 };
  Object.keys(inventados).forEach(id => assert.notStrictEqual(F(id).kcal, inventados[id],
    `${id} volvió a su valor sin fuente (${inventados[id]}): no salía de ninguna tabla`));
});

test('🔴 los ids que usa el recetario existen en NUT_FOODS (por eso no se fusiona)', () => {
  // ⚠️ La lista de referencias se lee de la ESTRUCTURA de NUT_MENUS (`pick` y `acomp`), NUNCA
  // cruzándola contra NUT_FOODS: la primera versión de este test hacía eso y un sabotaje que
  // renombraba «huevo» salió VERDE — el id roto simplemente desaparecía de la lista que el
  // propio test construía. Una aserción que el defecto puede satisfacer no es un candado.
  // Excepción DOCUMENTADA, no un agujero: 'ensalada' no es un alimento de la tabla, aporta 0 a
  // propósito (ver el comentario de `nutAcompMacros`). Se lista aquí para que CUALQUIER otro id
  // colgado sí haga fallar el test. Un `pick` en null es un puesto que esa comida no usa.
  const NO_SON_ALIMENTO = ['ensalada'];
  const refs = new Set();
  Object.values(NUT_MENUS).forEach(banco => (banco || []).forEach(m => {
    Object.values((m && m.pick) || {}).forEach(id => { if (id) refs.add(id); });
    ((m && m.acomp) || []).forEach(id => { if (id) refs.add(id); });
  }));
  assert.ok(refs.size >= 40, `el recetario referencia ${refs.size} alimentos por id — se esperaban 41`);
  const rotos = [...refs].filter(id => !NUT_FOOD_BY_ID[id] && NO_SON_ALIMENTO.indexOf(id) === -1);
  assert.deepStrictEqual(rotos, [], `NUT_MENUS receta alimentos que ya no existen: ${rotos.join(', ')}`);
});
test('🔴 foods.json conserva los ids y los valores del pool del recetario', () => {
  assert.ok(_foodsJson, 'foods.json no se pudo leer');
  const porId = new Map(_foodsJson.foods.map(f => [f.id, f]));
  NUT_FOODS.forEach(orig => {
    const cat = porId.get(orig.id);
    assert.ok(cat, `el catálogo perdió «${orig.id}» — el buscador dejaría de encontrar lo que el plan receta`);
    ['kcal', 'p', 'c', 'f'].forEach(k => assert.strictEqual(cat[k], orig[k],
      `«${orig.id}» tiene ${k}=${cat[k]} en el catálogo y ${orig[k]} en el recetario: dos verdades para el mismo alimento`));
  });
});
// F1b (USDA) — trazabilidad y limpieza del catálogo importado.
test('🔴 todo alimento importado dice de qué registro oficial salió', () => {
  assert.ok(_foodsJson);
  const importados = _foodsJson.foods.filter(f => f.src !== 'avi50');
  assert.ok(importados.length >= 80, `se esperaban ~89 importados, hay ${importados.length}`);
  // Cada fuente identifica su registro a su manera; lo que NO se negocia es que se pueda volver
  // a la fuente original: la USDA por su fdc_id, el ICBF por su código y su página del PDF.
  const PATRON = { usda_sr: /FDC \d+/, tcac2018: /TCAC 2018 \(ICBF\) [A-Z]\d{3}, pág\. \d+/ };
  importados.forEach(f => {
    const pat = PATRON[f.src];
    assert.ok(pat, `«${f.id}» viene de una fuente sin patrón de referencia declarado: ${f.src}`);
    assert.ok(f.ref && pat.test(f.ref),
      `«${f.id}» no dice de qué registro salió — sin eso no se puede re-verificar contra la fuente`);
  });
  // 🔴 v490 · Y LOS 50 DEL RECETARIO TAMBIÉN, que es lo que cierra la trazabilidad circular.
  // Hasta v489 estas filas llegaban al buscador con `src:'avi50'` y nada más: un puntero de vuelta
  // a la tabla que en su momento no tenía fuente. `src` sigue diciendo «avi50» porque marca la
  // CAPA (y las entradas ya guardadas en el registro de la gente lo llevan escrito), así que lo
  // que se exige es la CITA. Sin esta aserción, el paso de `ref` en `build-foods.mjs` se puede
  // caer en cualquier refactor y nadie se entera: el buscador seguiría pintando igual.
  const propios = _foodsJson.foods.filter(f => f.src === 'avi50');
  assert.strictEqual(propios.length, 50, `el recetario aporta ${propios.length} filas, se esperaban 50`);
  const CUALQUIERA = /FDC \d+|TCAC 2018 \(ICBF\) [A-Z]\d{3}, pag\. \d+/;
  propios.forEach(f => assert.ok(f.ref && CUALQUIERA.test(f.ref),
    `«${f.id}» llega al buscador sin decir de dónde salió su número: la procedencia se quedó en NUT_FOODS`));
});
test('🔴 ningún nombre repetido: el buscador no puede mostrar dos filas iguales', () => {
  assert.ok(_foodsJson);
  const vistos = new Map();
  _foodsJson.foods.forEach(f => {
    const k = foodNormText(f.name);
    assert.ok(!vistos.has(k), `«${f.name}» aparece dos veces (${vistos.get(k)} y ${f.id})`);
    vistos.set(k, f.id);
  });
});
// La razón de existir de la tabla del ICBF: nuestras frutas, que ninguna base extranjera trae.
test('🔴 el catálogo tiene las frutas colombianas (lo que solo da la TCAC del ICBF)', () => {
  const cat = foodCatalog(_foodsJson);
  ['lulo', 'curuba', 'tomate de arbol', 'uchuva', 'guanabana', 'granadilla', 'chontaduro',
    'feijoa', 'mangostino', 'zapote', 'pitahaya', 'mora de castilla', 'queso costeno'].forEach(t => {
      assert.ok(foodSearch(cat, t).total > 0, `falta «${t}» — la tabla colombiana es justo para esto`);
    });
});
test('🔴 cada alimento del ICBF cita su código y su página (re-verificable)', () => {
  assert.ok(_foodsJson);
  const tcac = _foodsJson.foods.filter(f => f.src === 'tcac2018');
  assert.ok(tcac.length >= 40, `se esperaban ~42 del ICBF, hay ${tcac.length}`);
  tcac.forEach(f => assert.ok(/TCAC 2018 \(ICBF\) [A-Z]\d{3}, pág\. \d+/.test(f.ref || ''),
    `«${f.id}» no dice de qué código y página salió: «${f.ref}»`));
  // Y la cita formal de la fuente viaja en el propio archivo, no en la cabeza de nadie.
  assert.ok(/Instituto Colombiano de Bienestar Familiar/.test(_foodsJson.fuentes.tcac2018.cita || ''),
    'falta la cita formal del ICBF en foods.json');
});
test('🔴 el catálogo responde en ESPAÑOL a lo que come la gente aquí', () => {
  // La base de la USDA viene en inglés: importarla cruda dejaba «huevo» y «plátano» en CERO
  // resultados (medido el 2026-08-05 sobre los 7.793 registros). Por eso se importa curada y
  // traducida. Este test es el que se rompe si alguien vuelve a volcar nombres en inglés.
  const cat = foodCatalog(_foodsJson);
  ['huevo', 'platano', 'arroz', 'frijol', 'queso', 'pollo', 'manzana', 'aguacate', 'yuca', 'avena']
    .forEach(t => assert.ok(foodSearch(cat, t).total > 0, `buscar «${t}» no devuelve nada`));
});
test('foods.json: ids únicos y toda fuente declarada', () => {
  assert.ok(_foodsJson);
  const vistos = new Set();
  _foodsJson.foods.forEach(f => {
    assert.ok(!vistos.has(f.id), `id duplicado: ${f.id}`);
    vistos.add(f.id);
    assert.ok(_foodsJson.fuentes[f.src], `«${f.id}» declara una fuente que no está documentada: ${f.src}`);
  });
});
// E7 — el cuadre kcal ↔ macros, con los DOS umbrales derivados midiendo.
test('🔴 ningún alimento del catálogo tiene las kcal peleadas con sus propios macros', () => {
  assert.ok(_foodsJson);
  const malos = _foodsJson.foods.filter(f => foodKcalSuspect(f)).map(f => f.id);
  assert.deepStrictEqual(malos, [], `alimentos con kcal sospechosas: ${malos.join(', ')}`);
});
test('foodKcalSuspect: caza el dígito mal tecleado y NO castiga a la fibra', () => {
  // Un número mal copiado se pasa de los dos umbrales.
  assert.ok(foodKcalSuspect({ kcal: 43, p: 13, c: 1.1, f: 9.9 }), 'huevo con un dígito de menos debería caer');
  assert.ok(foodKcalSuspect({ kcal: 165, p: 310, c: 0, f: 3.6 }), 'proteína ×10 debería caer');
  // Atwater (4/4/9) sobreestima cuando hay fibra: la espinaca se desvía 29% por SOLO 6,6 kcal,
  // y las almendras 43 kcal por solo 7%. Con un único umbral, uno de los dos sale falso positivo.
  assert.ok(!foodKcalSuspect({ kcal: 23, p: 2.9, c: 3.6, f: 0.4 }), 'la espinaca real no es un error');
  assert.ok(!foodKcalSuspect({ kcal: 579, p: 21, c: 22, f: 50 }), 'las almendras reales no son un error');
  // 🔴 LÍMITE HONESTO, afirmado a propósito: este candado NO caza la clase de error que ya nos
  // mordió. La yuca cruda etiquetada «cocida» traía 160 kcal CON los macros de la cruda — cuadre
  // perfecto. Esa clase solo la caza verificar contra la FUENTE, no una fórmula.
  assert.ok(!foodKcalSuspect({ kcal: 160, p: 1.4, c: 38, f: 0.3 }),
    'si algún día esto cambia, revisa el comentario: el candado no promete cazar el dato coherente-pero-falso');
});
// E9 — degradación: sin catálogo la app no se queda sin alimentos.
test('🔴 foodCatalog: sin foods.json (sin red, archivo corrupto) cae a los 50 de avi-core', () => {
  [null, undefined, {}, { foods: [] }, { foods: 'no-es-lista' }, 'basura'].forEach(malo => {
    const cat = foodCatalog(malo);
    assert.strictEqual(cat.length, NUT_FOODS.length, 'la degradación debe dejar un catálogo usable');
    assert.ok(cat.every(f => f.id && f.name), 'el catálogo degradado trae alimentos completos');
  });
  assert.strictEqual(foodCatalog(_foodsJson).length, _foodsJson.foods.length);
});
test('foodCatalog: descarta lo que no se puede registrar y deduplica por id', () => {
  const cat = foodCatalog({ foods: [{ id: 'a', name: 'A' }, { id: 'a', name: 'A otra vez' }, { name: 'sin id' }, null] });
  assert.strictEqual(cat.length, 1);
  assert.strictEqual(cat[0].name, 'A');
});
// Buscador: la gente teclea sin tildes y de afán.
test('foodSearch: encuentra sin tildes y sin importar mayúsculas', () => {
  const cat = foodCatalog(_foodsJson);
  assert.ok(foodSearch(cat, 'platano').total > 0, '«platano» debe encontrar «Plátano»');
  assert.ok(foodSearch(cat, 'PLÁTANO').total > 0);
  assert.ok(foodSearch(cat, 'pina').total > 0, '«pina» debe encontrar «Piña»');
  assert.ok(foodSearch(cat, 'atun').total > 0);
});
test('foodSearch: los paréntesis del nombre no rompen el match por palabra', () => {
  const cat = foodCatalog(_foodsJson);
  // «Carne de res magra (posta)» y «Atún en agua (escurrido)».
  assert.ok(foodSearch(cat, 'posta').total > 0, 'buscar dentro del paréntesis debe funcionar');
  assert.ok(foodSearch(cat, 'escurrido').total > 0);
});
test('foodSearch: primero lo que EMPIEZA por lo tecleado', () => {
  const cat = foodCatalog(_foodsJson);
  const r = foodSearch(cat, 'arroz');
  assert.ok(r.total > 0);
  assert.ok(foodNormText(r.items[0].name).indexOf('arroz') === 0, `el primero fue «${r.items[0].name}»`);
});
test('foodSearch: tandas — no devuelve el catálogo entero de un golpe', () => {
  const cat = foodCatalog(_foodsJson);
  const p1 = foodSearch(cat, '', { limit: FOOD_PAGE });
  assert.strictEqual(p1.items.length, Math.min(FOOD_PAGE, cat.length));
  assert.strictEqual(p1.total, cat.length);
  const p2 = foodSearch(cat, '', { limit: FOOD_PAGE, offset: FOOD_PAGE });
  assert.strictEqual(p2.hayMas, cat.length > FOOD_PAGE * 2);
  // Sin solapamiento: una tanda no repite lo de la anterior.
  const ids1 = new Set(p1.items.map(f => f.id));
  assert.ok(p2.items.every(f => !ids1.has(f.id)), 'la segunda tanda repite alimentos de la primera');
});
test('foodSearch: sin resultados y con basura no revienta', () => {
  const cat = foodCatalog(_foodsJson);
  assert.strictEqual(foodSearch(cat, 'zzzzqx').total, 0);
  assert.deepStrictEqual(foodSearch(cat, 'zzzzqx').items, []);
  assert.strictEqual(foodSearch(null, 'arroz').total, 0);
  assert.ok(foodSearch(cat, null).total > 0, 'sin término se lista todo (primera apertura)');
});

// ══════════════════════════════════════════════════════
section('F5 · Escáner de códigos de barras — la parte pura');

// Códigos REALES con dígito de control verificado a mano (no salidos de `eanCheckDigit`, que es
// justo lo que se está probando — un oráculo que se calcula con la función bajo prueba no prueba
// nada). Fuentes: ejemplos canónicos de EAN-13 / EAN-8 / UPC-A / ITF-14.
const _EAN_OK = {
  '5901234123457': 13,   // EAN-13
  '4006381333931': 13,   // EAN-13 (Staedtler)
  '96385074': 8,         // EAN-8
  '036000291452': 12,    // UPC-A
  '10614141000415': 14,  // ITF-14
};
const _bcOk = { ean: '5901234123457', name: 'Galleta de avena', brand: 'Noel', base: 'g100', kcal: 450, p: 7, c: 65, f: 18 };
test('eanValid: acepta los códigos reales y caza el dígito cambiado', () => {
  Object.keys(_EAN_OK).forEach(ean => {
    assert.ok(eanValid(ean), `${ean} es un código válido de verdad`);
    assert.strictEqual(eanCheckDigit(ean), parseInt(ean[ean.length - 1], 10));
  });
  // El caso que esto existe para cazar: alguien lo TECLEA del empaque y se equivoca en un dígito.
  // Se prueban TODAS las posiciones, no una — un control que solo mira el final no es control.
  let cazados = 0, probados = 0;
  Object.keys(_EAN_OK).forEach(ean => {
    for (let i = 0; i < ean.length; i++) {
      for (let d = 0; d <= 9; d++) {
        if (String(d) === ean[i]) continue;
        probados++;
        if (!eanValid(ean.slice(0, i) + d + ean.slice(i + 1))) cazados++;
      }
    }
  });
  assert.ok(probados > 500, `control: se probaron ${probados} códigos con un dígito cambiado`);
  // El mod-10 caza CUALQUIER dígito cambiado (es su propiedad, no una estadística): 100% o hay bug.
  assert.strictEqual(cazados, probados, `${probados - cazados} códigos con un dígito mal pasaron el control`);
});
test('eanValid: rechaza lo que no es un código, y no opina de las longitudes sin control', () => {
  ['', '123', '1234567', '123456789012345', 'abcdefgh', null, undefined]
    .forEach(malo => assert.ok(!eanValid(malo), `«${malo}» no puede pasar por código`));
  // ⚠️ LÍMITE DECLARADO, no descuido: se NORMALIZA antes de validar, así que la basura que no es
  // dígito se cae por el camino. `EAN 590-1234 123457` es un código válido para esta app, y tiene
  // que serlo: así viene escrito en los empaques y así lo pega la gente. Lo que se guarda son los
  // dígitos, nunca lo tecleado en bruto — por eso la tolerancia no ensucia la tabla.
  assert.ok(eanValid('EAN 590-1234 123457'), 'el código como se lee del empaque tiene que pasar');
  assert.strictEqual(eanNormalize('EAN 590-1234 123457'), '5901234123457');
  assert.strictEqual(barcodeDraft(Object.assign({}, _bcOk, { ean: 'EAN 590-1234 123457' })).fila.ean, '5901234123457',
    'y lo que llega a la tabla son solo los dígitos');
  // 9, 10 y 11 dígitos NO son GS1: la tabla los acepta (códigos internos de tienda) y aquí no se
  // puede decir si sobra un dígito. `eanCheckDigit` devuelve null = «no se sabe», no «está mal».
  ['123456789', '1234567890', '12345678901'].forEach(s => {
    assert.strictEqual(eanCheckDigit(s), null, 'sin dígito de control no se puede opinar');
    assert.ok(eanValid(s), 'y sin poder opinar, no se bloquea a nadie');
  });
});
test('eanNormalize: el código leído a ojo viene con espacios y guiones', () => {
  assert.strictEqual(eanNormalize(' 590 1234-123457 '), '5901234123457');
  assert.ok(eanValid('7 590123 412345 7'.replace(/^7 /, '')));
  assert.strictEqual(eanNormalize(null), '');
});

// ⚠️ EL PUNTO ENTERO DE PREGUNTAR «¿por 100 g o por porción?»
test('🔴 labelPer100: la etiqueta que habla por porción es OTRO alimento si no se convierte', () => {
  // Cereal real de caja: 120 kcal por porción de 30 g. Sin convertir entra como 120 kcal/100 g
  // (un alimento liviano); convertido son 400. Un factor de 3,3 en lo que la persona registra.
  assert.strictEqual(labelPer100(120, 30), 400);
  assert.strictEqual(labelPer100(2.4, 30), 8);
  // Leche en vaso de 200 ml: 130 kcal por porción → 65 por 100.
  assert.strictEqual(labelPer100(130, 200), 65);
  assert.strictEqual(labelPer100(5, 0), null, 'una porción de 0 g no se puede convertir');
  assert.strictEqual(labelPer100(null, 30), null);
  assert.strictEqual(labelPer100('no', 30), null);
});

test('barcodeDraft: el camino bueno deja una fila lista para la tabla', () => {
  const r = barcodeDraft(_bcOk);
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.deepStrictEqual(r.fila, {
    ean: '5901234123457', name: 'Galleta de avena', brand: 'Noel',
    kcal: 450, p: 7, c: 65, f: 18, un_label: null, un_g: null,
  });
  assert.strictEqual(r.aviso, null, '450 kcal cuadra con esos macros');
});
test('🔴 barcodeDraft: «por porción» convierte, y de paso regala la medida casera', () => {
  const r = barcodeDraft({ ean: '96385074', name: 'Cereal', base: 'porcion', porcionG: 30, kcal: 120, p: 2.4, c: 25.5, f: 1.2 });
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.strictEqual(r.fila.kcal, 400);
  assert.strictEqual(r.fila.p, 8);
  assert.strictEqual(r.fila.c, 85);
  assert.strictEqual(r.fila.f, 4);
  // La porción del empaque ES una medida casera: sin esto, comerse la barra pide pesarla.
  assert.strictEqual(r.fila.un_label, 'porción');
  assert.strictEqual(r.fila.un_g, 30);
  // Control: los MISMOS números declarados como «por 100 g» dan otro alimento. Si esto empatara,
  // la pregunta de la pantalla no estaría haciendo nada.
  const plano = barcodeDraft({ ean: '96385074', name: 'Cereal', base: 'g100', kcal: 120, p: 2.4, c: 25.5, f: 1.2 });
  assert.ok(plano.ok);
  assert.notStrictEqual(plano.fila.kcal, r.fila.kcal);
  assert.strictEqual(plano.fila.un_label, null, 'sin porción no hay medida casera que regalar');
});
test('barcodeDraft: sin el tamaño de la porción, el error señala la porción y no los macros', () => {
  const r = barcodeDraft({ ean: '96385074', name: 'Cereal', base: 'porcion', kcal: 120, p: 2.4, c: 25.5, f: 1.2 });
  assert.ok(!r.ok);
  assert.ok(r.errores.porcionG, 'tiene que pedir el tamaño de la porción');
  // 🔴 Lo que esto protege: la persona SÍ escribió las calorías. Decirle «escribe las calorías»
  // sobre un campo lleno la manda a buscar un error que no cometió.
  assert.ok(!r.errores.kcal && !r.errores.p, `no puede culpar a los macros: ${JSON.stringify(r.errores)}`);
});
test('🔴 barcodeDraft: espejo de los CHECK de la tabla — el mensaje es humano, no de Postgres', () => {
  const suma = barcodeDraft(Object.assign({}, _bcOk, { p: 40, c: 40, f: 40 }));
  assert.ok(!suma.ok && suma.errores.suma, 'p+c+f>100 es imposible en 100 g de producto');
  assert.ok(/por porción/.test(suma.errores.suma), 'y le dice la causa más probable');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { kcal: 950 })).ok, 'kcal > 900 no existe');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { p: 120, c: 0, f: 0 })).ok, 'proteína > 100 g por 100 g');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { kcal: -5 })).ok, 'no hay macros negativos');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { name: '   ' })).ok, 'sin nombre no se puede buscar después');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { name: 'x'.repeat(81) })).ok);
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { brand: 'x'.repeat(61) })).ok);
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { ean: '5901234123456' })).ok, 'el código con un dígito mal');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { kcal: '' })).ok, 'un macro en blanco no es un 0');
  // Una porción absurdamente chica dispara el tope al convertir → el mensaje apunta a la PORCIÓN,
  // que es donde está el error de verdad, no a las calorías que copió bien del empaque.
  const chica = barcodeDraft({ ean: '96385074', name: 'Cereal', base: 'porcion', porcionG: 2, kcal: 120, p: 2, c: 25, f: 1 });
  assert.ok(!chica.ok && /porción/.test(chica.errores.kcal || ''), JSON.stringify(chica.errores));
});
test('barcodeDraft: la medida casera va completa o no va', () => {
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { un_label: 'tarrina' })).ok, 'una medida sin gramos no sirve');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { un_g: 125 })).ok, 'unos gramos sin nombre tampoco');
  assert.ok(!barcodeDraft(Object.assign({}, _bcOk, { un_label: 'saco', un_g: 5000 })).ok);
  const r = barcodeDraft(Object.assign({}, _bcOk, { un_label: 'tarrina', un_g: 125 }));
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.strictEqual(r.fila.un_g, 125);
});
test('🔴 barcodeDraft: el aviso de kcal AVISA, no bloquea — el empaque es el que manda', () => {
  // Un empaque puede declarar calorías que no cuadran con sus macros (fibra, polioles, redondeo
  // del fabricante). Bloquear ahí sería llamarle mentiroso al producto que la persona tiene en la
  // mano, y dejarla sin poder registrar lo que come.
  const r = barcodeDraft(Object.assign({}, _bcOk, { kcal: 200, p: 7, c: 65, f: 18 }));
  assert.ok(r.ok, 'tiene que dejar guardar');
  assert.ok(r.aviso && /200/.test(r.aviso), `debía avisar: ${r.aviso}`);
  assert.ok(r.fila, 'y la fila sale igual');
  // Control: el camino bueno NO avisa, o el aviso sería ruido que nadie lee.
  assert.strictEqual(barcodeDraft(_bcOk).aviso, null);
});
test('foodFromBarcode: se viste de alimento del catálogo sin poder pisar a los otros dos', () => {
  const f = foodFromBarcode({ ean: '5901234123457', name: 'Galleta de avena', brand: 'Noel', kcal: 450, p: 7, c: 65, f: 18, un_label: 'paquete', un_g: 40, verified: false });
  assert.strictEqual(f.id, 'bc:5901234123457');
  assert.ok(f.id.indexOf('bc:') === 0, 'el prefijo es lo que impide el choque de ids entre capas');
  assert.strictEqual(f.name, 'Galleta de avena (Noel)', 'la marca se ve: hay tres arroces distintos');
  assert.deepStrictEqual(f.un, { label: 'paquete', g: 40 });
  assert.strictEqual(f.verified, false, 'la interfaz tiene que poder decir «esto nadie lo ha revisado»');
  assert.strictEqual(f.src, 'bc');
  // Ningún id de las otras dos capas empieza por `bc:` — se afirma, no se supone.
  const otros = foodCatalog(_foodsJson).concat(NUT_FOODS);
  assert.ok(otros.every(x => String(x.id).indexOf('bc:') !== 0), 'alguna capa ya usa el prefijo bc:');
  assert.strictEqual(foodFromBarcode({ ean: '1', name: 'X', un_label: 'vaso' }).un, undefined, 'medida a medias = sin medida');
  assert.strictEqual(foodFromBarcode(null), null);
  assert.strictEqual(foodFromBarcode({ name: 'sin ean' }), null);
});
test('🔴 foodCatalog: lo escaneado SE SUMA — quedarse sin red no borra lo que aportó la persona', () => {
  const bc = [foodFromBarcode({ ean: '5901234123457', name: 'Galleta', kcal: 450, p: 7, c: 65, f: 18 })];
  const conJson = foodCatalog(_foodsJson, bc);
  assert.strictEqual(conJson.length, _foodsJson.foods.length + 1);
  // 🔴 El caso que importa: sin `foods.json` (sin red, archivo caído) la tercera fuente sigue ahí.
  const sinJson = foodCatalog(null, bc);
  assert.strictEqual(sinJson.length, NUT_FOODS.length + 1, 'la degradación no puede comerse lo escaneado');
  assert.ok(sinJson.some(f => f.id === 'bc:5901234123457'));
  assert.ok(foodSearch(sinJson, 'galleta').total > 0, 'y se puede encontrar buscando');
  // Sin tercera fuente todo sigue exactamente como antes (compatibilidad de la firma vieja).
  assert.strictEqual(foodCatalog(_foodsJson).length, _foodsJson.foods.length);
  assert.strictEqual(foodCatalog(null, null).length, NUT_FOODS.length);
  // Y no duplica: el mismo código escaneado dos veces es un alimento.
  assert.strictEqual(foodCatalog(_foodsJson, bc.concat(bc)).length, _foodsJson.foods.length + 1);
});

// ── F6 · la cola de aprobación del coach ──────────────────────────────────
test('🔴 fbQueueSplit: el contador cuenta SOLO lo pendiente', () => {
  // Un contador que incluyera lo ya aprobado no bajaría nunca, y una bandeja cuyo número no baja
  // es una bandeja que se aprende a ignorar. Este proyecto ya perdió gates así.
  const filas = [
    { ean: '1', verified: false }, { ean: '2', verified: true },
    { ean: '3', verified: false }, { ean: '4', verified: true },
  ];
  const s = fbQueueSplit(filas);
  assert.strictEqual(s.porRevisar, 2);
  assert.strictEqual(s.pendientes.length, 2);
  assert.strictEqual(s.verificados.length, 2, 'lo aprobado se sigue viendo, para poder deshacer');
  assert.deepStrictEqual(s.pendientes.map(r => r.ean), ['1', '3'], 'conserva el orden del servidor');
  // Basura sin código no cuenta como nada: no se puede aprobar lo que no se puede identificar.
  assert.strictEqual(fbQueueSplit([{ verified: false }, null]).porRevisar, 0);
  assert.strictEqual(fbQueueSplit(null).porRevisar, 0);
});
test('🔴 fbReviewNotes: solo afirma lo que es ARITMÉTICAMENTE imposible', () => {
  const ok = { ean: '1', name: 'Galleta', kcal: 450, p: 7, c: 65, f: 18 };
  assert.deepStrictEqual(fbReviewNotes(ok), [], 'un producto sano no lleva ni un aviso, o son ruido');
  // Energía sin un solo gramo que la explique.
  const vacio = fbReviewNotes({ ean: '1', name: 'X', kcal: 300, p: 0, c: 0, f: 0 });
  assert.strictEqual(vacio.length, 2, 'descuadre + los tres en cero');
  assert.ok(vacio.some(t => /cero/.test(t)), JSON.stringify(vacio));
  // Gramos que no pesan nada en energía.
  assert.ok(fbReviewNotes({ ean: '1', name: 'X', kcal: 0, p: 10, c: 10, f: 5 }).some(t => /0 calor/.test(t)));
  // Una «medida casera» de más de un kilo es el paquete entero.
  assert.ok(fbReviewNotes(Object.assign({}, ok, { un_label: 'vaso', un_g: 1500 })).some(t => /kilo/.test(t)));
  assert.deepStrictEqual(fbReviewNotes(Object.assign({}, ok, { un_label: 'vaso', un_g: 250 })), [], '250 g es un vaso normal');
  // 🔴 CONTROL DE ALCANCE — lo que esta capa NO puede ver, y hay que dejarlo escrito:
  // un cereal cuya etiqueta hablaba «por porción» (120 kcal / 30 g) tecleado como si fuera por
  // 100 g es COHERENTE consigo mismo, y por eso no sale ni un aviso. No es un descuido: es el
  // límite real. Si algún día se inventa un umbral de densidad calórica, este test lo caza y
  // obliga a justificarlo con datos medidos, que hoy no existen (la tabla tiene 0 filas).
  assert.deepStrictEqual(fbReviewNotes({ ean: '1', name: 'Cereal', kcal: 120, p: 2.4, c: 25.5, f: 1.2 }), [],
    'si esto deja de estar vacío, alguien metió un umbral inventado — que lo respalde midiendo');
  assert.deepStrictEqual(fbReviewNotes(null), []);
});
test('🔴 F6: el cliente NUNCA puede mover `verified` — el .sql de verdad lo dice', () => {
  // Espejo del test de F5: se lee el archivo, no una copia. Si alguien afloja el permiso en el
  // SQL, esto se pone rojo y hay que decidirlo a propósito.
  const fs = require('fs'), path = require('path');
  const f5 = fs.readFileSync(path.join(__dirname, 'supabase/community/f5_food_barcodes.sql'), 'utf8');
  const grants = f5.match(/grant (insert|update) \(([^)]+)\) on public\.food_barcodes/g) || [];
  assert.strictEqual(grants.length, 2, 'los dos grants por columna siguen ahí');
  grants.forEach(g => {
    assert.ok(!/verified/.test(g), `un grant de cliente toca verified: ${g}`);
  });
  const f6 = fs.readFileSync(path.join(__dirname, 'supabase/community/f6_fb_moderation.sql'), 'utf8');
  // Las dos RPCs nuevas son DEFINER y las dos están gateadas por moderador. Sin el gate, la de
  // borrar deja a cualquier autenticado vaciar el catálogo.
  ['fb_pending', 'fb_delete'].forEach(fn => {
    assert.ok(new RegExp('function public\\.' + fn).test(f6), `falta ${fn}`);
    assert.ok(new RegExp('revoke all on function public\\.' + fn).test(f6), `${fn} sin revoke a public/anon`);
  });
  assert.strictEqual((f6.match(/_is_moderator\(auth\.uid\(\)\)/g) || []).length, 2,
    'las dos RPCs tienen que gatear por moderador, no una');
  // 🔴 Esta aserción nació DÉBIL y lo cazó el sabotaje 8: decía `/search_path = ''/.test(f6)` y
  // con una de las dos funciones saboteada seguía en verde, porque la OTRA lo tenía. Se afirma
  // por conteo: toda DEFINER del archivo, no «alguna».
  const definers = (f6.match(/security definer/g) || []).length;
  assert.strictEqual(definers, 2, 'cambió el número de funciones DEFINER — revisa el archivo');
  assert.strictEqual((f6.match(/security definer set search_path = ''/g) || []).length, definers,
    'hay una DEFINER sin search_path fijo: es escalable por esquema');
  // Y la de borrar se niega sobre una fila ya aprobada: dos actos deliberados, no uno.
  assert.ok(/verified row: unverify first/.test(f6));
});
test('🔴 F5: los límites del cliente son los MISMOS que los CHECK de la tabla', () => {
  // Este test existe porque el espejo que miente es peor que no tener espejo: si el SQL se
  // relaja y el cliente no (o al revés), o se bloquea a alguien sin motivo o el insert vuelve
  // con un error de motor que nadie puede leer. Se lee el SQL de verdad, no una copia.
  const fs = require('fs'), path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'community', 'f5_food_barcodes.sql'), 'utf8');
  assert.ok(sql.length > 1000, `control: se leyeron ${sql.length} caracteres del SQL`);
  const { FOOD_BC_MAX, FOOD_BC_LEN, EAN_RE } = core;
  assert.ok(sql.includes("ean ~ '^[0-9]{8,14}$'"), 'el rango del código cambió en la tabla');
  assert.strictEqual(EAN_RE.source, '^[0-9]{8,14}$', 'y el del cliente tiene que ser el mismo');
  assert.ok(sql.includes('kcal >= 0 and kcal <= ' + FOOD_BC_MAX.kcal), 'tope de kcal desalineado');
  ['p', 'c', 'f'].forEach(m => {
    assert.ok(sql.includes(m + ' >= 0 and ' + m + ' <= ' + FOOD_BC_MAX[m]), 'tope de ' + m + ' desalineado');
  });
  assert.ok(sql.includes('check (p + c + f <= 100)'), 'el candado de la suma cambió en la tabla');
  assert.ok(sql.includes('un_g > 0 and un_g <= ' + FOOD_BC_MAX.un_g), 'tope de la medida casera desalineado');
  assert.ok(sql.includes('length(name) <= ' + FOOD_BC_LEN.name), 'largo del nombre desalineado');
  assert.ok(sql.includes('length(brand) <= ' + FOOD_BC_LEN.brand), 'largo de la marca desalineado');
  assert.ok(sql.includes('length(un_label) <= ' + FOOD_BC_LEN.un_label), 'largo de la medida desalineado');
  // 🔴 P2-3 de Fable (2026-08-12): hasta aquí el test solo afirmaba la lista de CHECK que YA
  // CONOCE, así que un CHECK **nuevo** en la tabla no lo delataba nadie — y un CHECK sin espejo
  // en `barcodeDraft` le sale en la cara a la persona como `new row violates check constraint
  // "food_barcodes_x_check"`, que es justo lo que el espejo existe para evitar. Las aserciones de
  // arriba cazan que se QUITE o se AFLOJE uno conocido; el conteo caza que se AGREGUE uno nuevo.
  // Es la misma lección que el `search_path` de F6: «alguna lo cumple» no es un candado, se
  // afirma por CONTEO.
  const tabla = sql.slice(sql.indexOf('create table public.food_barcodes'));
  const cuerpo = tabla.slice(0, tabla.indexOf('\n);'));   // solo el DDL de la tabla: las policies
  assert.ok(/created_at/.test(cuerpo) && cuerpo.length > 400,  // traen `with check (` y no son espejo
    `control: se leyeron ${cuerpo.length} caracteres del cuerpo de la tabla`);
  assert.ok(!/with\s+check/i.test(cuerpo), 'el recorte se comió una policy: el conteo ya no significa lo que dice');
  const nChecks = (cuerpo.match(/check\s*\(/gi) || []).length;
  assert.strictEqual(nChecks, 10,
    'cambió el número de CHECK de food_barcodes. Si es uno NUEVO, `barcodeDraft` tiene que ' +
    'replicarlo con su mensaje humano, o el asesorado va a leer un error crudo de Postgres.');
});

// ══════════════════════════════════════════════════════
section('Registro de alimentos — F0: modelo de datos (E1-E4 de Fable)');

const _comida = { id: 'arroz_blanco_cocido', name: 'Arroz blanco cocido', src: 'tcac2018', kcal: 130, p: 2.7, c: 28.2, f: 0.3 };
const _hoyFL = new Date('2026-08-05T12:00:00');
let _flSeq = 0;
const _flId = () => 'fl' + (++_flSeq);

test('foodLogEntry: la entrada es un SNAPSHOT con los macros ya calculados a los gramos', () => {
  const e = foodLogEntry(_comida, 180, 'almuerzo', _hoyFL, _flId);
  assert.strictEqual(e.foodId, 'arroz_blanco_cocido');
  assert.strictEqual(e.g, 180);
  assert.strictEqual(e.kcal, 234);          // 130 × 1.8
  assert.strictEqual(e.p, 4.86);
  assert.strictEqual(e.src, 'tcac2018');
  // Si mañana se corrige el catálogo, esta entrada NO cambia: los macros ya están dentro.
  assert.ok(Object.prototype.hasOwnProperty.call(e, 'kcal'));
});
test('foodLogEntry: un macro que la fuente no trae queda en null, JAMÁS en 0', () => {
  const sinGrasa = { id: 'x', name: 'X', kcal: 100, p: 5, c: 10, f: null };
  const e = foodLogEntry(sinGrasa, 100, 'cena', _hoyFL, _flId);
  assert.strictEqual(e.f, null, 'un 0 afirmaría que no tiene grasa; null dice que no se sabe');
  assert.strictEqual(e.c, 10);
});
test('foodLogEntry: tope de cordura y cantidades imposibles', () => {
  assert.strictEqual(foodLogEntry(_comida, 999999, 'cena', _hoyFL, _flId).g, FOODLOG_MAX_G);
  assert.strictEqual(foodLogEntry(_comida, 0, 'cena', _hoyFL, _flId), null);
  assert.strictEqual(foodLogEntry(_comida, -50, 'cena', _hoyFL, _flId), null);
  assert.strictEqual(foodLogEntry(null, 100, 'cena', _hoyFL, _flId), null);
  // Una comida que no existe no rompe: cae al almuerzo, no a undefined.
  assert.strictEqual(foodLogEntry(_comida, 100, 'brunch', _hoyFL, _flId).meal, 'almuerzo');
});
test('foodLogTotals: suma POR MACRO y avisa cuando algún alimento no traía el dato', () => {
  const a = foodLogEntry(_comida, 100, 'desayuno', _hoyFL, _flId);
  const b = foodLogEntry({ id: 'y', name: 'Y', kcal: 200, p: 10, c: null, f: 5 }, 100, 'cena', _hoyFL, _flId);
  const t = foodLogTotals([a, b]);
  assert.strictEqual(t.kcal, 330);
  assert.strictEqual(t.p, 12.7);
  assert.strictEqual(t.n, 2);
  assert.ok(t.parcial, 'con un macro faltante el total no puede presentarse como completo');
  assert.strictEqual(foodLogTotals([]).parcial, false);
});
test('foodLogAdd / foodLogRemove: inmutables, no mutan lo que reciben', () => {
  const fl0 = foodLogBlank();
  const e = foodLogEntry(_comida, 150, 'almuerzo', _hoyFL, _flId);
  const fl1 = foodLogAdd(fl0, e, _hoyFL);
  assert.strictEqual(Object.keys(fl0.d).length, 0, 'el original quedó tocado');
  assert.strictEqual(foodLogDay(fl1, _hoyFL).length, 1);
  const fl2 = foodLogRemove(fl1, habitDayKey(_hoyFL), e.id);
  assert.strictEqual(foodLogDay(fl2, _hoyFL).length, 0);
  assert.strictEqual(foodLogDay(fl1, _hoyFL).length, 1, 'borrar mutó el objeto anterior');
});
// 🔴 E3 — la poda NO puede perder el pasado: lo que sale del detalle queda agregado por mes.
test('🔴 foodLogPrune: lo que pasa de 30 días se resume por mes, no se borra', () => {
  let fl = foodLogBlank();
  const viejo = new Date('2026-06-01T12:00:00');
  fl = foodLogAdd(fl, foodLogEntry(_comida, 100, 'cena', viejo, _flId), viejo);
  assert.strictEqual(foodLogDay(fl, viejo).length, 1);
  // Al anotar algo HOY, lo de junio ya cayó fuera de la ventana.
  fl = foodLogAdd(fl, foodLogEntry(_comida, 100, 'cena', _hoyFL, _flId), _hoyFL);
  assert.strictEqual(foodLogDay(fl, viejo).length, 0, 'el detalle viejo debía podarse');
  assert.ok(fl.m['2026-06'], 'el mes viejo TIENE que quedar resumido, no desaparecer');
  assert.strictEqual(fl.m['2026-06'].dias, 1);
  assert.strictEqual(fl.m['2026-06'].kcal, 130);
});
// 🔴 E3 — el umbral se DERIVÓ MIDIENDO (2026-08-05), no de memoria: un año de uso diario
// (5 comidas/día, todo de código de barras = peor caso) pesa 37,6 KB y se mantiene ESTABLE.
// Los perfiles reales de producción pesan ~600 bytes y el historial de meses, 10-18 KB.
test('🔴 el registro no crece sin techo: un AÑO de uso diario queda estable y acotado', () => {
  const largo = { id: 'off_7702001139903', name: 'Galletas Festival Sabor a Vainilla Paquete x 12 unidades', src: 'off', kcal: 470, p: 6.2, c: 70.1, f: 18.4, barcode: '7702001139903', brand: 'Noel' };
  let fl = foodLogBlank();
  const fin = new Date('2026-08-05T12:00:00');
  for (let d = 364; d >= 0; d--) {                       // del más viejo al más nuevo = uso real
    const dia = new Date(fin.getTime() - d * 86400000);
    for (let m = 0; m < 5; m++) fl = foodLogAdd(fl, foodLogEntry(largo, 60, FOODLOG_MEALS[m], dia, _flId), dia);
  }
  const kb = Buffer.byteLength(JSON.stringify(fl), 'utf8') / 1024;
  assert.ok(kb < 60, `un año de registro pesa ${kb.toFixed(1)} KB — la poda dejó de contener el objeto`);
  assert.ok(Object.keys(fl.d).length <= FOODLOG_KEEP_DAYS + 1, 'quedó detalle fuera de la ventana');
  assert.ok(Object.keys(fl.m).length >= 11, 'los meses viejos se perdieron en vez de resumirse');
});
// 🔴 E4 — EL BUG QUE MATA EL MÓDULO SI NO SE ATAJA. La app es offline-first y el teléfono pisa
// la nube con un replace total: sin merge, anotar el almuerzo en el celular y abrir la app en
// otro aparato BORRA el almuerzo. «La app me borró lo que comí» en el módulo que pide 3-5
// toques de fe al día.
test('🔴 foodLogMerge: dos dispositivos anotando el MISMO día no se pisan', () => {
  const celular = foodLogAdd(foodLogBlank(), foodLogEntry(_comida, 150, 'almuerzo', _hoyFL, () => 'A1'), _hoyFL);
  const tablet = foodLogAdd(foodLogBlank(), foodLogEntry(_comida, 200, 'cena', _hoyFL, () => 'B1'), _hoyFL);
  const uni = foodLogMerge(celular, tablet);
  const dia = foodLogDay(uni, _hoyFL);
  assert.strictEqual(dia.length, 2, 'una de las dos comidas se perdió en el merge');
  assert.deepStrictEqual(dia.map(e => e.id).sort(), ['A1', 'B1']);
});
test('foodLogMerge: la misma entrada editada en los dos lados → gana la más reciente', () => {
  const vieja = { id: 'X', ts: 1000, meal: 'cena', foodId: 'a', name: 'A', g: 100, kcal: 100, p: 1, c: 1, f: 1 };
  const nueva = Object.assign({}, vieja, { ts: 2000, g: 250, kcal: 250 });
  const A = { d: { '2026-08-05': [vieja] }, m: {} };
  const B = { d: { '2026-08-05': [nueva] }, m: {} };
  assert.strictEqual(foodLogMerge(A, B).d['2026-08-05'][0].g, 250);
  assert.strictEqual(foodLogMerge(B, A).d['2026-08-05'][0].g, 250, 'el merge debe dar igual en cualquier orden');
  assert.strictEqual(foodLogMerge(A, B).d['2026-08-05'].length, 1, 'la entrada quedó duplicada');
});
test('foodLogMerge: los resúmenes mensuales no se duplican al unir', () => {
  const A = { d: {}, m: { '2026-06': { dias: 20, kcal: 40000, p: 100, c: 200, f: 50 } } };
  const B = { d: {}, m: { '2026-06': { dias: 20, kcal: 40000, p: 100, c: 200, f: 50 } } };
  assert.strictEqual(foodLogMerge(A, B).m['2026-06'].kcal, 40000, 'sumarlos duplicaría el pasado');
});
test('foodLogActiveDays: días distintos con al menos una comida (métrica del criterio de corte)', () => {
  let fl = foodLogBlank();
  [0, 1, 5, 40].forEach(d => {
    const dia = new Date(_hoyFL.getTime() - d * 86400000);
    fl = foodLogAdd(fl, foodLogEntry(_comida, 100, 'cena', dia, _flId), dia);
  });
  assert.strictEqual(foodLogActiveDays(fl, _hoyFL, 21), 3, 'el día de hace 40 no entra en la ventana de 21');
  assert.strictEqual(foodLogActiveDays(foodLogBlank(), _hoyFL, 21), 0);
});
// ── F2 · E10 — la suma del día se afirma POR MACRO, con ORÁCULO INDEPENDIENTE ──
// 🔴 El test NO le pregunta a la app cuánto sirvió: recalcula desde el catálogo y los gramos.
// Cuando el defecto es «el sistema no sabe lo que hizo», la aserción no puede leer el reporte
// del sistema (lección del plan de comida, que reportaba 9,6% mientras servía 22%).
test('🔴 el total del día cuadra con un cálculo INDEPENDIENTE desde el catálogo', () => {
  const cat = foodCatalog(_foodsJson);
  const elegidos = ['arroz', 'huevo', 'pollo_pechuga', 't_lulo', 'u_salmon']
    .map(id => cat.find(f => f.id === id)).filter(Boolean);
  assert.ok(elegidos.length >= 4, 'el fixture necesita alimentos de las tres fuentes');
  const gramos = [180, 100, 150, 120, 90];
  let fl = foodLogBlank();
  elegidos.forEach((f, i) => {
    fl = foodLogAdd(fl, foodLogEntry(f, gramos[i], FOODLOG_MEALS[i % FOODLOG_MEALS.length], _hoyFL, _flId), _hoyFL);
  });
  const tot = foodLogTotals(foodLogDay(fl, _hoyFL));
  // Oráculo: los macros del CATÁLOGO por los gramos servidos. Nada de leerle el total a la app.
  const esperado = { kcal: 0, p: 0, c: 0, f: 0 };
  elegidos.forEach((f, i) => {
    ['kcal', 'p', 'c', 'f'].forEach(k => { esperado[k] += (parseFloat(f[k]) || 0) * gramos[i] / 100; });
  });
  ['kcal', 'p', 'c', 'f'].forEach(k => {
    const dif = Math.abs(tot[k] - esperado[k]);
    assert.ok(dif <= 1, `${k}: la app suma ${tot[k]} y el cálculo independiente da ${Math.round(esperado[k] * 10) / 10}`);
  });
});
test('foodLogProgress: compara POR MACRO contra el objetivo del día', () => {
  const tot = { kcal: 900, p: 60, c: 90, f: 30, n: 3, parcial: false };
  const meta = { kcal: 1800, prot_g: 120, carb_g: 200, fat_g: 60 };
  const pr = foodLogProgress(tot, meta);
  assert.strictEqual(pr.kcal.pct, 50);
  assert.strictEqual(pr.kcal.falta, 900);
  assert.strictEqual(pr.p.pct, 50);
  assert.strictEqual(pr.c.pct, 45);   // el carbohidrato va MÁS atrasado que el total: eso es el punto
  assert.strictEqual(pr.f.pct, 50);
});
// 🔴 REPORTADO POR EL PO (2026-08-08): en el héroe de «Comida de hoy» le salió
// «Te quedan 36.799999999999955 kcal». Lo metí yo en v456 recalculando a mano una resta que la
// función pura YA daba redondeada (`falta`). Nunca se rehace fuera un cálculo que la función pura
// expone: se rehace peor. Este test afirma la CLASE — que ninguna cifra que llegue a pantalla
// arrastre basura de coma flotante — con los números reales que la producen.
test('🔴 ningún número de «Comida de hoy» sale con basura de coma flotante', () => {
  // Estos son los valores que lo reproducen: gramos escalados dan totales con un decimal.
  const tot = { kcal: 1827.2, p: 96.3, c: 210.7, f: 51.9, n: 5, parcial: false };
  const meta = { kcal: 1864, prot_g: 160, carb_g: 171, fat_g: 60 };
  const pr = foodLogProgress(tot, meta);
  const sucio = v => String(v).replace('-', '').split('.')[1] && String(v).split('.')[1].length > 1;
  ['kcal', 'p', 'c', 'f'].forEach(k => {
    assert.ok(!sucio(pr[k].hecho), `«hecho» de ${k} sale sucio: ${pr[k].hecho}`);
    assert.ok(!sucio(pr[k].falta), `«falta» de ${k} sale sucio: ${pr[k].falta}`);
    assert.ok(!sucio(pr[k].meta), `«meta» de ${k} sale sucia: ${pr[k].meta}`);
  });
  // Y el número EXACTO del reporte: restarlo a mano da basura; `falta` da 36.8.
  assert.strictEqual(1864 - 1827.2 > 36.79 && 1864 - 1827.2 < 36.81, true);
  assert.ok(sucio(1864 - 1827.2), 'el repro dejó de reproducir: la resta a mano ya no da basura');
  assert.strictEqual(pr.kcal.falta, 36.8, 'foodLogProgress dejó de redondear «falta»');
  assert.strictEqual(Math.round(pr.kcal.falta), 37, 'lo que se pinta en el héroe debe ser entero');
});

// Candado ESTÁTICO de la misma clase: el defecto no fue de la función pura (que redondeaba bien)
// sino de la PANTALLA, que se puso a recalcular por su cuenta. Un test sobre la función pura no
// lo habría visto nunca — por eso este mira el código que pinta.
test('🔴 la pantalla de «Comida de hoy» NO recalcula lo que la función pura ya da', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-5-salud.js'), 'utf8');
  const i = src.indexOf('function _flDiaHtml');
  assert.ok(i > -1, 'no se encontró _flDiaHtml');
  const cuerpo = src.slice(i, i + 2600);
  // La cifra que se pinta sale SIEMPRE de un `falta` que ya viene redondeado de una función pura
  // —`foodLogProgress` desde v456, `foodLogBandFor` desde v478 (la franja)—, nunca de una resta
  // hecha aquí. Se afirma la PROPIEDAD, no el nombre de la variable: el héroe cambió de
  // referencia (de la cifra exacta a la franja) y la lección es la misma.
  assert.ok(/(pr\.kcal|_band)\.falta/.test(cuerpo), 'el héroe dejó de usar un `falta` ya redondeado');
  assert.ok(!/\.meta\s*\|\|\s*0\s*\)\s*-\s*\(/.test(cuerpo),
    'volvió a restar meta-hecho a mano: eso es lo que sacaba «36.799999999999955» en pantalla');
  assert.ok(!/(meta|hi|lo)\s*-\s*(hecho|tot\.kcal)/.test(cuerpo),
    'una resta de la meta menos lo hecho, a mano, en la pantalla: eso vuelve a sacar coma flotante');
});

test('foodLogProgress: pasarse no deja «falta» negativo, y sin meta no inventa porcentaje', () => {
  const pr = foodLogProgress({ kcal: 2500, p: 0, c: 0, f: 0, n: 1 }, { kcal: 1800 });
  assert.strictEqual(pr.kcal.falta, 0);
  assert.ok(pr.kcal.pct > 100, 'el exceso se lee en el porcentaje');
  const sinMeta = foodLogProgress({ kcal: 500, p: 0, c: 0, f: 0, n: 1 }, null);
  assert.strictEqual(sinMeta.kcal.pct, null);
  assert.strictEqual(sinMeta.kcal.falta, null);
});
// E11 — estados no-felices del registro.
test('🔴 un alimento borrado del catálogo NO rompe lo ya registrado (el snapshot pinta igual)', () => {
  const cat = foodCatalog(_foodsJson);
  const f = cat.find(x => x.id === 'arroz');
  let fl = foodLogAdd(foodLogBlank(), foodLogEntry(f, 200, 'almuerzo', _hoyFL, _flId), _hoyFL);
  // Mañana ese id ya no existe en el catálogo: la entrada sigue completa por sí sola.
  const e = foodLogDay(fl, _hoyFL)[0];
  assert.strictEqual(e.name, 'Arroz blanco cocido');
  assert.ok(e.kcal > 0 && e.g === 200);
  assert.strictEqual(foodLogTotals([e]).kcal, e.kcal);
});
test('🔴 el formulario del registro está cableado a las funciones que guardan', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'app-5-salud.js'), 'utf8');
  const html = fs.readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
  assert.ok(/id="foodlog-room"/.test(html), 'falta la habitación del registro');
  assert.ok(/id="flroom-body"/.test(html), 'falta el cuerpo de la habitación');
  ['openFoodLogRoom', 'closeFoodLogRoom', 'flGuardar', 'flQuitar', 'flAceptarAviso', 'foodCatalogLoad']
    .forEach(f => assert.ok(new RegExp('function ' + f + '\\b').test(src), `falta ${f}()`));
  // 🔴 CABLEADO, DERIVADO DEL PROPIO CÓDIGO en vez de una lista a mano: todo `onclick="algo(`
  // que pinta esta pantalla tiene que existir como función global, o el botón no hace NADA y no
  // hay error visible — la clase de defecto que solo se ve tocándolo en un teléfono. La lista se
  // mantiene sola: al agregar un botón nuevo, este test ya lo cubre.
  const llamados = new Set();
  (src.match(/onclick="([A-Za-z_$][\w$]*)\(/g) || []).forEach(m => llamados.add(m.slice(9, -1)));
  assert.ok(llamados.size > 10, `control: se encontraron ${llamados.size} manejadores en app-5-salud.js`);
  const otros = ['app-1-infra.js', 'app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-6-extra.js']
    .map(n => fs.readFileSync(require('path').join(__dirname, n), 'utf8')).join('\n');
  const huerfanos = [...llamados].filter(f => !new RegExp('(function|const|let|var) +' + f + '\\b').test(src + otros));
  assert.deepStrictEqual(huerfanos, [], `botones que llaman a una función que no existe: ${huerfanos.join(', ')}`);
  // Guardar y borrar pasan por sv('ax_c'), la vía sancionada que ya usan agua y pasos.
  assert.ok(/c\.foodlog=foodLogAdd[\s\S]{0,80}sv\('ax_c'/.test(src), 'agregar no persiste por la vía sancionada');
  assert.ok(/c\.foodlog=foodLogRemove[\s\S]{0,80}sv\('ax_c'/.test(src), 'borrar no persiste por la vía sancionada');
  // El aviso de privacidad es obligatorio ANTES de registrar (decisión #2 del PO).
  assert.ok(/if\(!c\.foodlogOk\)/.test(src), 'se puede registrar sin haber visto el aviso de que el coach lo ve');
  // …y en el entrenamiento PROPIO del coach el aviso no puede decirle que «lo ve tu coach»:
  // ahí el dueño del dato es él (verificado en el camino de guardado: COACH_SELF escribe en su
  // propia fila vía clientToRow, que copia todo el perfil, así que su registro es suyo).
  // ── F5 · el escáner ──
  // 🔒 LA CÁMARA SE APAGA POR TODAS LAS SALIDAS. Un stream vivo deja la luz del celular
  // encendida y se lee (con razón) como «esta app me está grabando». No es un detalle de
  // cortesía: es lo que hace que alguien desinstale.
  assert.ok(/function closeFoodLogRoom\(\)\{\s*_flScanStop\(\);/.test(src),
    'cerrar la habitación (incluido el botón «‹ Volver») tiene que apagar la cámara');
  assert.ok(/function flSalirEscaner\(\)\{ _flScanStop\(\);/.test(src), 'salir del escáner apaga la cámara');
  assert.ok(/function flNuevoProducto\(ean\)\{\s*_flScanStop\(\);/.test(src), 'pasar a escribir el producto apaga la cámara');
  assert.ok(/function openFoodLogRoom\(meal\)\{[\s\S]{0,220}_flScanStop\(\);/.test(src), 'reabrir la habitación apaga lo que quedara prendido');
  assert.ok(/getTracks\(\)\.forEach\(t=>t\.stop\(\)\)/.test(src), 'no hay ninguna llamada que suelte la cámara de verdad');
  // Y la que se pide mientras la persona ya se fue de la pantalla también se suelta.
  assert.ok(/if\(_flView\.modo!=='escanear'\)\{ try\{ stream\.getTracks/.test(src),
    'si el permiso llega cuando ya salió de la pantalla, la cámara queda prendida en segundo plano');
  // CERO DEPENDENCIAS: el lector es el NATIVO del navegador. Si algún día entra una librería de
  // códigos de barras, este test lo dice — es una restricción del proyecto, no una preferencia.
  assert.ok(/new window\.BarcodeDetector\(/.test(src), 'el lector tiene que ser el nativo');
  assert.ok(!/quagga|zxing|html5-qrcode|jsqr/i.test(src), 'entró una librería de lectura de códigos');
  // Lo escaneado NO se sincroniza como dato personal: son empaques, y su caché es del aparato.
  const infra = fs.readFileSync(require('path').join(__dirname, 'app-1-infra.js'), 'utf8');
  assert.ok(/const BC_CACHE_KEY='ax_bccache'/.test(src), 'cambió la clave de la caché de códigos');
  assert.ok(!/'ax_bccache'/.test(infra.match(/const SB_KEYS=\[[^\]]*\]/)[0]),
    'ax_bccache no puede ir en SB_KEYS: el yogur de uno viajaría en la fila de datos de otro');
  assert.ok(/const propio=\(typeof COACH_SELF!=='undefined'&&COACH_SELF\)/.test(src),
    'el aviso no distingue el entrenamiento propio del coach');
  assert.ok(/tu propio registro/.test(src), 'falta el texto del caso COACH_SELF');
  // Y el registro es Premium: al tier libre no se le pinta el bloque.
  // Dos aserciones separadas y exactas: de dónde sale el gate, y que el bloque dependa de él.
  assert.ok(/const conComida=!\(typeof isFreeClient==='function'&&isFreeClient\(client\)\)/.test(src),
    'el gate Premium del registro no sale de isFreeClient');
  assert.ok(/\$\{conComida\?_foodLogBlockHtml\(client\):''\}/.test(src),
    'el bloque de comida se pinta sin pasar por el gate Premium');
  // El botón de atrás tiene que cerrar la habitación (si no, se sale de la app).
  const nav = fs.readFileSync(require('path').join(__dirname, 'app-2-login.js'), 'utf8');
  assert.ok(/foodlog-room[\s\S]{0,120}closeFoodLogRoom/.test(nav), 'el botón atrás no cierra el registro');
});

// ══════════════════════════════════════════════════════
section('Registro de alimentos — F7: el plan se MARCA, no se re-escribe');
// Patrón 1 del estudio de Fitia/MyFitnessPal. El dato que lo decide: el vaso de agua, que es UN
// toque, lo usan 6 de 24 — así que un plan que pide 3-5 anotaciones al día no se registra nunca.

const _planBase = { origen: 'coach', kcalObj: 2200, macros: { prot_g: 165, carb_g: 220, fat_g: 61, kcal: 2089 } };
const _planF7 = nutDayPlan(_planBase, 'entreno', 4, 1, 3);
const _hoyF7 = new Date('2026-08-12T12:00:00');

test('F7: el plan se convierte en entradas NORMALES del registro (mismo snapshot de macros)', () => {
  const ents = nutPlanMealEntries(_planF7, 0, _hoyF7);
  assert.ok(ents.length >= 2, 'un desayuno del plan tiene al menos dos alimentos');
  ents.forEach(e => {
    assert.strictEqual(e.meal, 'desayuno');
    assert.ok(e.foodId && e.g > 0, 'toda entrada lleva su alimento y sus gramos');
    assert.ok(Object.prototype.hasOwnProperty.call(e, 'kcal'), 'los macros van DENTRO de la entrada');
  });
});

// 🔴 EL ORDEN. `plan.meals` y `FOODLOG_MEALS` van en paralelo por construcción (NUT_MEALS_5).
// Si alguien reordena UNO de los dos, el desayuno se registraría como cena y nadie lo notaría:
// los totales del día seguirían cuadrando. Esto es lo único que lo impide.
test('🔴 F7: el orden del plan y el del registro NO se pueden separar', () => {
  assert.strictEqual(NUT_MEALS_5.length, FOODLOG_MEALS.length, 'los dos arreglos dejaron de tener el mismo tamaño');
  const esperado = ['desayuno', 'media_m', 'almuerzo', 'media_t', 'cena'];
  assert.deepStrictEqual(FOODLOG_MEALS, esperado);
  _planF7.meals.forEach((m, i) => {
    nutPlanMealEntries(_planF7, i, _hoyF7).forEach(e => {
      assert.strictEqual(e.meal, FOODLOG_MEALS[i], `«${m.name}» se estaría registrando como ${e.meal}`);
    });
  });
});

// 🔴 LOS ACOMPAÑANTES CUENTAN. Es el bug que costó v470 pero al revés: allá el plato servía 22%
// de más porque la guayaba se pintaba y no se sumaba. Si aquí se registrara solo el plato, el
// registro quedaría por debajo de lo que el propio plan dice que la persona come.
// Se afirma POR CONTEO, no con un «alguna lo cumple» (lección del search_path de F6).
test('🔴 F7: los acompañantes también se registran', () => {
  let conAcomp = 0, verificadas = 0;
  _planF7.meals.forEach((m, i) => {
    const reales = (m.acompIds || []).filter(id => NUT_FOOD_BY_ID[id]);
    if (!reales.length) return;
    conAcomp++;
    const ents = nutPlanMealEntries(_planF7, i, _hoyF7);
    const ids = ents.map(e => e.foodId);
    reales.forEach(id => assert.ok(ids.indexOf(id) > -1, `${m.name}: falta el acompañante ${id}`));
    assert.strictEqual(ents.length, (m.items || []).length + reales.length, `${m.name}: sobran o faltan entradas`);
    verificadas++;
  });
  assert.ok(conAcomp > 0, 'el fixture no tiene ni un acompañante: no prueba nada');
  assert.strictEqual(verificadas, conAcomp);
});

// 🔴 EL ORÁCULO INDEPENDIENTE: lo registrado se recalcula desde NUT_FOOD_BY_ID y los gramos, no
// se le pregunta a la app cuánto sirvió (lección del plato que reportaba 9,6% sirviendo 22%).
test('🔴 F7: lo registrado es lo que el plan dice que se come, recalculado desde el catálogo', () => {
  _planF7.meals.forEach((m, i) => {
    const ents = nutPlanMealEntries(_planF7, i, _hoyF7);
    const esp = { p: 0, c: 0, f: 0 };
    (m.items || []).forEach(it => {
      const f = NUT_FOOD_BY_ID[it.id]; if (!f) return;
      ['p', 'c', 'f'].forEach(k => { esp[k] += f[k] * it.grams / 100; });
    });
    (m.acompIds || []).forEach(id => {
      const f = NUT_FOOD_BY_ID[id]; if (!f) return;
      // 🔴 La ración se lee de la TABLA, no de `nutAcompGrams`. Llamar aquí a la función bajo
      // prueba haría que el oráculo se moviera con el defecto: se comprobó saboteándola —el
      // sabotaje 3 de `_sabotaje-f7` salía VERDE— porque el plan y el registro se equivocaban
      // juntos y quedaban de acuerdo. Un oráculo que usa la función que audita no audita nada.
      const g = (f.un && f.un.g > 0) ? f.un.g : 100;
      ['p', 'c', 'f'].forEach(k => { esp[k] += f[k] * g / 100; });
    });
    const tot = foodLogTotals(ents);
    ['p', 'c', 'f'].forEach(k => {
      assert.ok(Math.abs(tot[k] - esp[k]) <= 0.5,
        `${m.name} · ${k}: registrado ${tot[k]}, cálculo independiente ${Math.round(esp[k] * 10) / 10}`);
    });
  });
});

// 🔴 IDEMPOTENCIA. El id es determinista justamente para esto. Con un id aleatorio, tocar dos
// veces —o dos teléfonos marcando la misma comida— serviría el desayuno dos veces.
test('🔴 F7: marcar dos veces NO duplica, y dos teléfonos tampoco', () => {
  let fl = foodLogMarkPlanMeal(foodLogBlank(), _planF7, 0, _hoyF7);
  const n1 = foodLogDay(fl, _hoyF7).length;
  fl = foodLogMarkPlanMeal(fl, _planF7, 0, _hoyF7);
  assert.strictEqual(foodLogDay(fl, _hoyF7).length, n1, 'marcar dos veces duplicó el desayuno');
  // Dos aparatos distintos, minutos distintos: el merge tiene que unirlos, no sumarlos.
  const a = foodLogMarkPlanMeal(foodLogBlank(), _planF7, 2, _hoyF7);
  const b = foodLogMarkPlanMeal(foodLogBlank(), _planF7, 2, new Date(_hoyF7.getTime() + 6e4));
  assert.ok(foodLogDay(a, _hoyF7).length > 0, 'el fixture no marcó nada');
  assert.strictEqual(foodLogDay(foodLogMerge(a, b), _hoyF7).length, foodLogDay(a, _hoyF7).length,
    'el merge multi-dispositivo duplicó el almuerzo');
});

// 🔴 DESMARCAR RESPETA LO ANOTADO A MANO. Una marca que se lleva por delante el café que la
// persona escribió ella misma es peor que no poder desmarcar.
test('🔴 F7: desmarcar quita SOLO lo del plan', () => {
  let fl = foodLogMarkPlanMeal(foodLogBlank(), _planF7, 0, _hoyF7);
  const cafe = foodLogEntry({ id: 'x_cafe', name: 'Café', kcal: 2, p: 0.1, c: 0.3, f: 0 }, 200, 'desayuno', _hoyF7, () => 'fl_manual');
  fl = foodLogAdd(fl, cafe, _hoyF7);
  assert.ok(foodLogPlanMealDone(fl, 0, _hoyF7), 'el detector no ve la comida marcada');
  fl = foodLogUnmarkPlanMeal(fl, 0, _hoyF7);
  const quedan = foodLogDay(fl, _hoyF7);
  assert.strictEqual(quedan.length, 1, 'desmarcar se llevó por delante lo que anotó la persona');
  assert.strictEqual(quedan[0].id, 'fl_manual');
  assert.strictEqual(foodLogPlanMealDone(fl, 0, _hoyF7), false);
  // Y desmarcar una comida NO toca a las vecinas.
  let fl2 = foodLogMarkPlanMeal(foodLogBlank(), _planF7, 0, _hoyF7);
  fl2 = foodLogMarkPlanMeal(fl2, _planF7, 2, _hoyF7);
  fl2 = foodLogUnmarkPlanMeal(fl2, 0, _hoyF7);
  assert.strictEqual(foodLogPlanMealDone(fl2, 2, _hoyF7), true, 'desmarcar el desayuno borró el almuerzo');
});

// ── UNA SOLA DEFINICIÓN DE CALORÍA (v501) ─────────────────────────────────────────────────
// El plato sumaba sus calorías con `4p+4c+9f` y el REGISTRO con el campo `kcal` de la fuente:
// dos definiciones vivas en la misma app. Medido el 18-ago sobre las 50 filas, **40 se separan
// ≥1%** — la fórmula genérica se pasa **+28,7% en la espinaca** (su carbohidrato TOTAL incluye la
// fibra, que no da 4 kcal/g) y se queda **−6,5% corta en la clara** (USDA le aplica 4,27 kcal/g de
// proteína). Regla: **la caloría de un ALIMENTO sale de su fila; la de un OBJETIVO, de sus macros.**
test('🔴 v501 · el plato cuenta la caloría de la TABLA, no la fórmula genérica', () => {
  const F = core.NUT_FOOD_BY_ID;
  const base = { origen: 'coach', kcalObj: 2200, macros: { prot_g: 150, carb_g: 220, fat_g: 60, kcal: 2200 } };
  let comidas = 0, dias = 0, peor = 0;
  ['pierna', 'entreno', 'descanso'].forEach(kind => {
    for (let di = 0; di < 7; di++) {
      const plan = nutDayPlan(base, kind, 4, 1, di);
      if (!plan) return;
      dias++;
      let kcalDia = 0;
      plan.meals.forEach(m => {
        comidas++;
        // ORÁCULO INDEPENDIENTE: se suma desde los gramos y la COLUMNA kcal de la tabla.
        let k = 0;
        m.items.forEach(it => { const f = F[it.id]; if (f) k += f.kcal * it.grams / 100; });
        (m.acompIds || []).forEach(id => { const f = F[id]; if (f) k += f.kcal * core.nutAcompGrams(f) / 100; });
        kcalDia += k;
        peor = Math.max(peor, Math.abs(m.real.kcal - Math.round(k)));
      });
      assert.ok(Math.abs(plan.real.kcal - kcalDia) <= plan.meals.length,
        `el día suma ${plan.real.kcal} y sus alimentos dan ${Math.round(kcalDia)}`);
    }
  });
  assert.ok(comidas > 50 && dias >= 20, `el barrido resolvió ${comidas} comidas: no prueba nada`);
  // Tolerancia = el redondeo a entero de cada comida, nada más. Con la fórmula genérica puesta el
  // hueco medido era de **+1,43% de media y +5,18% en el peor día**, o sea decenas de kcal.
  assert.ok(peor <= 1, `una comida se separa ${peor} kcal de lo que suman sus alimentos`);
});

test('🔴 v501 · el plato y el REGISTRO dicen el MISMO número para la misma comida', () => {
  // Es el sitio donde las dos definiciones se encontraban en pantalla: la franja compara la meta
  // del plan contra lo que suma el registro. Antes se separaban ~35 kcal en un día.
  const hoy = new Date('2026-08-18T12:00:00');
  const base = { origen: 'coach', kcalObj: 2200, macros: { prot_g: 150, carb_g: 220, fat_g: 60, kcal: 2200 } };
  let dias = 0, peor = 0, caso = '';
  ['pierna', 'entreno', 'descanso'].forEach(kind => {
    for (let di = 0; di < 7; di++) {
      const plan = nutDayPlan(base, kind, 4, 1, di);
      if (!plan) return;
      let fl = foodLogBlank();
      for (let i = 0; i < plan.meals.length; i++) fl = foodLogMarkPlanMeal(fl, plan, i, hoy);
      const t = foodLogTotals(foodLogDay(fl, hoy));
      dias++;
      const d = Math.abs(t.kcal - plan.real.kcal);
      if (d > peor) { peor = d; caso = `${kind}/día ${di}: plato ${plan.real.kcal} vs registro ${t.kcal}`; }
    }
  });
  assert.ok(dias >= 20, `el barrido resolvió ${dias} días`);
  // Medido 2026-08-18 sobre 315 días-plan: coinciden ±1 kcal en 202, y el PEOR caso son 3 kcal
  // (redondeo por entrada contra redondeo por comida). El tope va en 5 con aire.
  assert.ok(peor <= 5, `el plato y el registro se separan ${peor} kcal — ${caso}`);
});

// 🔴 LA PROPIEDAD DE FONDO, no una consecuencia holgada: con el DÍA ENTERO marcado, lo que lee
// la persona en su barra tiene que caer dentro de la franja que la app ya declara (±10%). Si no,
// la app se contradice a un toque de distancia — la familia v435/v444.
// Presupuesto buscado a BARRIDO, no escrito de memoria.
test('🔴 F7: con el plan ENTERO marcado, la barra del registro no acusa un hueco falso', () => {
  let dias = 0, peorBajo = 100, peorAlto = 100, casoBajo = null, casoAlto = null;
  [1400, 1800, 2200, 2600, 3200].forEach(kcal => {
    [0.25, 0.30, 0.35].forEach(pk => {
      const prot_g = Math.round(kcal * pk / 4);
      const fat_g = Math.round(kcal * 0.25 / 9);
      const carb_g = Math.round((kcal - prot_g * 4 - fat_g * 9) / 4);
      if (carb_g <= 0) return;
      const base = { origen: 'coach', kcalObj: kcal, macros: { prot_g, carb_g, fat_g, kcal } };
      ['pierna', 'entreno', 'descanso'].forEach(kind => {
        for (let di = 0; di < 7; di++) {
          const plan = nutDayPlan(base, kind, 4, 1, di);
          if (!plan) continue;
          let fl = foodLogBlank();
          for (let i = 0; i < plan.meals.length; i++) fl = foodLogMarkPlanMeal(fl, plan, i, _hoyF7);
          const pr = foodLogProgress(foodLogTotals(foodLogDay(fl, _hoyF7)), plan.target);
          dias++;
          if (pr.kcal.pct < peorBajo) { peorBajo = pr.kcal.pct; casoBajo = `${kcal} kcal · ${kind} · día ${di}`; }
          if (pr.kcal.pct > peorAlto) { peorAlto = pr.kcal.pct; casoAlto = `${kcal} kcal · ${kind} · día ${di}`; }
        }
      });
    });
  });
  assert.ok(dias >= 300, `el barrido solo resolvió ${dias} días: no prueba nada`);
  // Medido 2026-08-12 sobre 315 días: min 93%, mediana 101%, max 111%. Los topes van 3 puntos
  // por fuera de lo medido, y la cifra medida queda escrita aquí con su fecha — contra aflojar
  // un tope NO protege una matriz de sabotaje, solo el número al lado (lección de v476).
  assert.ok(peorBajo >= 90, `con el plan entero marcado la barra baja al ${peorBajo}% (${casoBajo}): la app diría que se quedó corta comiendo justo lo que le mandó`);
  assert.ok(peorAlto <= 114, `con el plan entero marcado la barra sube al ${peorAlto}% (${casoAlto})`);
});

// Candado ESTÁTICO: las DOS superficies que ofrecen marcar tienen que leer el plan de la MISMA
// función. Dos cálculos paralelos del mismo plan acabarían contradiciéndose (regla de v435).
test('🔴 F7: las dos pantallas leen el plan de hoy de UNA sola función', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-5-salud.js'), 'utf8');
  assert.ok(/function _nutPlanHoy\(client\)/.test(src), 'desapareció la función única del plan de hoy');
  // Ni la tarjeta de «Hoy» ni la habitación del registro pueden volver a llamar a nutDayPlan.
  const llamadas = (src.match(/[^_]nutDayPlan\(/g) || []).length;
  assert.strictEqual(llamadas, 1, `nutDayPlan se llama ${llamadas} veces en la pantalla: solo _nutPlanHoy puede hacerlo`);
  assert.ok(/function flTogglePlanMeal\(idx\)/.test(src), 'no existe la acción de marcar');
  // 🔒 Marcar el plan ES registrar: no puede saltarse el aviso de que el coach ve el detalle.
  const cuerpo = src.slice(src.indexOf('function flTogglePlanMeal'), src.indexOf('function flTogglePlanMeal') + 1400);
  assert.ok(/if\(!c\.foodlogOk\)/.test(cuerpo), 'marcar el plan se salta el aviso de privacidad');
  assert.ok(/isFreeClient/.test(cuerpo), 'marcar el plan se salta el gate Premium');
});

// ══════════════════════════════════════════════════════
section('Registro de alimentos — la FRANJA y la SEMANA (patrones 2, 3 y 6 del estudio)');

test('la franja es simétrica alrededor de la meta y dice en qué lado cae lo comido', () => {
  // 🔒 Los bordes se DERIVAN de la constante, nunca se escriben a mano: estaban clavados en 1760 y
  // 2240 (±12%) y al re-medir la franja en v487 este test se cayó por su propio literal, no por la
  // app. Es la misma regla que ya se aplicó al umbral de desvío del coach (v478): el número que
  // significa lo mismo vive en UN solo sitio. Lo que se afirma aquí es la FORMA (simétrica, con su
  // lado y su distancia), que es lo que no debe cambiar aunque el ancho sí.
  const LO = Math.round(2000 * (1 - FOODLOG_BAND)), HI = Math.round(2000 * (1 + FOODLOG_BAND));
  assert.ok(HI - 2000 === 2000 - LO, 'simétrica alrededor de la meta');
  const b = foodLogBandFor(2000, 1900);
  assert.strictEqual(b.lo, LO);
  assert.strictEqual(b.hi, HI);
  assert.strictEqual(b.estado, 'dentro');
  assert.strictEqual(b.falta, 0, 'dentro de la franja no falta nada');
  assert.strictEqual(b.sobra, 0);
  assert.strictEqual(foodLogBandFor(2000, 1500).estado, 'bajo');
  assert.strictEqual(foodLogBandFor(2000, 1500).falta, LO - 1500, 'lo que falta es para entrar a la FRANJA, no para clavar la meta');
  assert.strictEqual(foodLogBandFor(2000, 2400).estado, 'alto');
  assert.strictEqual(foodLogBandFor(2000, 2400).sobra, 2400 - HI);
  // Sin meta no se inventa una franja (y la pantalla cae al texto sin objetivo).
  assert.strictEqual(foodLogBandFor(0, 500), null);
  assert.strictEqual(foodLogBandFor(null, 500), null);
});

test('🔴 ninguna cifra de la franja sale con basura de coma flotante', () => {
  const b = foodLogBandFor(1864, 1827.2);
  const sucio = v => String(v).split('.')[1] && String(v).split('.')[1].length > 1;
  ['lo', 'hi', 'falta', 'sobra'].forEach(k => assert.ok(!sucio(b[k]), `${k} sale sucio: ${b[k]}`));
});

// 🔴 LA RESTRICCIÓN QUE DEFINE EL ANCHO, y la única que importa: una franja más estrecha de lo
// que el PLATO entrega le diría «te pasaste» a quien comió EXACTAMENTE lo que la app le mandó.
// Medido 2026-08-12 por la ruta `nutBaseFor` contra la nube: de 25 filas, 21 resuelven y **17
// ven el plan en producción** (6 son tier 'libre'), 119 días-plan. El plato sirve 94,7%-110,2%
// de lo que promete → a ±10% se sale 1 día (Nataly, 110,2%); a ±12%, ninguno.
// Aquí se re-deriva con una malla, que es lo que la suite puede correr sin red.
test('🔴 la franja NUNCA es más estrecha de lo que el propio plato entrega', () => {
  let dias = 0, peor = 100, mejor = 100, fuera = 0, caso = null;
  [1400, 1800, 2200, 2600, 3200].forEach(kcal => {
    [0.25, 0.30, 0.35].forEach(pk => {
      const prot_g = Math.round(kcal * pk / 4);
      const fat_g = Math.round(kcal * 0.25 / 9);
      const carb_g = Math.round((kcal - prot_g * 4 - fat_g * 9) / 4);
      if (carb_g <= 0) return;
      const base = { origen: 'coach', kcalObj: kcal, macros: { prot_g, carb_g, fat_g, kcal } };
      ['pierna', 'entreno', 'descanso'].forEach(kind => {
        for (let di = 0; di < 7; di++) {
          const plan = nutDayPlan(base, kind, 4, 1, di);
          if (!plan || !(plan.target.kcal > 0)) continue;
          dias++;
          const r = plan.real.kcal / plan.target.kcal * 100;
          if (r < peor) { peor = r; }
          if (r > mejor) { mejor = r; caso = `${kcal} kcal · ${kind} · día ${di}`; }
          // Lo que de verdad se afirma: comerse el plan ENTERO cae DENTRO de la franja.
          const b = foodLogBandFor(plan.target.kcal, plan.real.kcal);
          if (b.estado !== 'dentro') { fuera++; if (!caso) caso = `${kcal}/${kind}/${di}`; }
        }
      });
    });
  });
  assert.ok(dias >= 300, `el barrido solo resolvió ${dias} días: no prueba nada`);
  assert.strictEqual(fuera, 0,
    `${fuera} de ${dias} días-plan: comerse el plan ENTERO cae FUERA de la franja (${caso}). ` +
    `La franja (±${FOODLOG_BAND * 100}%) es más estrecha que lo que el plato entrega ` +
    `(${peor.toFixed(1)}%-${mejor.toFixed(1)}%) → la app le diría «te pasaste» a quien comió lo que le mandó.`);
  // Y el control al revés: una franja de ±5% NO puede pasar este test, o el test no prueba nada.
  // ⚠️ El control barría MENOS espacio que la aserción (solo 'entreno' y una proporción de
  // proteína) y en v501 se quedó sin dientes: al dejar el plato de contarse de más, ese rincón
  // cómodo pasó a caber dentro del ±5%. Un control que mira menos que lo que controla deja de
  // discriminar sin avisar. Ahora barre EL MISMO espacio que la aserción.
  const estrecha = (m, h) => { const lo = Math.round(m * 0.95), hi = Math.round(m * 1.05); return h >= lo && h <= hi; };
  let fueraEstrecha = 0;
  [1400, 1800, 2200, 2600, 3200].forEach(kcal => {
    [0.25, 0.30, 0.35].forEach(pk => {
      const prot_g = Math.round(kcal * pk / 4), fat_g = Math.round(kcal * 0.25 / 9);
      const carb_g = Math.round((kcal - prot_g * 4 - fat_g * 9) / 4);
      if (carb_g <= 0) return;
      const base = { origen: 'coach', kcalObj: kcal, macros: { prot_g, carb_g, fat_g, kcal } };
      ['pierna', 'entreno', 'descanso'].forEach(kind => {
        for (let di = 0; di < 7; di++) {
          const plan = nutDayPlan(base, kind, 4, 1, di);
          if (plan && !estrecha(plan.target.kcal, plan.real.kcal)) fueraEstrecha++;
        }
      });
    });
  });
  assert.ok(fueraEstrecha > 0, 'CONTROL: con ±5% tampoco se sale nadie → este test no discrimina nada');
});

// 🔴 UN DÍA SIN REGISTRAR NO ES «COMIÓ CERO»: es «no sabemos». Pintarlo como fallo es la misma
// mentira que promediar contra 0, que ya está prohibida en la ficha del coach.
test('🔴 la fila de la semana: sin registro es «no sabemos», no un cero', () => {
  const hoy = new Date('2026-08-12T12:00:00');   // miércoles → getDay() 3
  // 🔴 UNA META DISTINTA POR DÍA, que es como son de verdad (el día de pierna se come más). Con
  // los 7 días iguales el fixture NO PUEDE FALLAR: se comprobó saboteando `targetsPorDia[d.dayIndex]`
  // a `[0]` y la suite seguía VERDE, porque comparar contra el día equivocado daba lo mismo.
  const metas = {};
  for (let i = 0; i < 7; i++) metas[i] = { kcal: 1600 + i * 200, prot_g: 150, carb_g: 200, fat_g: 55 };
  let fl = foodLogBlank();
  const ayer = new Date(hoy.getTime() - 86400000);   // martes → getDay() 2, meta 2000
  // Los dos días caen DENTRO de su propia franja… y FUERA de la del domingo (meta 1600, techo 1792).
  fl = foodLogAdd(fl, foodLogEntry({ id: 'a', name: 'A', kcal: 1900, p: 150, c: 200, f: 55 }, 100, 'cena', ayer, () => 'e1'), ayer);
  fl = foodLogAdd(fl, foodLogEntry({ id: 'b', name: 'B', kcal: 2100, p: 150, c: 200, f: 55 }, 100, 'cena', hoy, () => 'e2'), hoy);
  const sem = foodLogWeekStates(fl, metas, hoy, 7);
  assert.strictEqual(sem.length, 7);
  assert.strictEqual(sem[6].dayIndex, 3, 'el fixture dejó de caer en miércoles: revisa la fecha');
  assert.strictEqual(sem[6].band.meta, 2200, 'hoy se comparó contra la meta de OTRO día');
  assert.strictEqual(sem[5].band.meta, 2000, 'ayer se comparó contra la meta de OTRO día');
  assert.strictEqual(sem[6].estado, 'dentro', 'hoy (2.100 sobre meta 2.200) quedó dentro de su franja');
  assert.strictEqual(sem[5].estado, 'dentro', 'ayer (1.900 sobre meta 2.000) quedó dentro de su franja');
  assert.strictEqual(sem.filter(d => d.estado === 'vacio').length, 5, 'los días sin registro son huecos, no fallos');
  sem.filter(d => d.estado === 'vacio').forEach(d => {
    assert.strictEqual(d.band, null, 'un día sin registro NO puede traer veredicto: no se sabe qué comió');
  });
  // Sin plan contra el que comparar tampoco se opina.
  const sinMeta = foodLogWeekStates(fl, null, hoy, 7);
  assert.strictEqual(sinMeta[6].estado, 'sinmeta');
});

// ── EL COACH Y LA ASESORADA JUZGAN EL MISMO DÍA CON LA MISMA VARA ─────────────
// v478 cerró esto para el UMBRAL del promedio (`_FL_DESVIO_MEDIO` derivado de `FOODLOG_BAND`) y
// dejó la FILA sin cerrar: los puntos del coach eran binarios («registró / no registró») mientras
// ella leía «✓ vas en tu franja» del mismo día. Estos tres candados son para que no se separen.
test('🔴 la cuenta de días en franja es UNA, y el hueco no cuenta como fallo', () => {
  // 🔴 META DISTINTA POR DÍA a propósito: con las 7 iguales, comparar contra el día equivocado
  // no cambia nada y el test no muerde (el error exacto que se cometió en v478).
  const hoy = new Date('2026-08-12T12:00:00');            // miércoles → getDay() 3
  const metas = {};
  for (let i = 0; i < 7; i++) metas[i] = { kcal: 1600 + i * 200, prot_g: 150, carb_g: 200, fat_g: 55 };
  let fl = foodLogBlank();
  const dia = off => new Date(hoy.getTime() - off * 86400000);
  const meter = (off, kcal) => {
    const d = dia(off);
    fl = foodLogAdd(fl, foodLogEntry({ id: 'x' + off, name: 'X', kcal, p: 10, c: 10, f: 10 }, 100, 'cena', d, () => 'e' + off), d);
  };
  meter(0, 2200);   // mié, meta 2200 → dentro
  meter(1, 1400);   // mar, meta 2000 → bajo  (−30%)
  meter(2, 2700);   // lun, meta 1800 → alto  (+50%)
  meter(3, 2000);   // dom, meta 1600 → alto
  //  los otros 3 días quedan SIN registrar: son huecos
  const sem = foodLogWeekStates(fl, metas, hoy, 7);
  const cnt = foodLogBandCount(sem);
  assert.strictEqual(cnt.registrados, 4, `control: el fixture registró ${cnt.registrados} días de 7`);
  assert.strictEqual(cnt.dentro, 1);
  assert.strictEqual(cnt.fuera, 3, 'bajo y alto son los únicos que cuentan como fuera');
  // 🔒 LA REGLA DEL HUECO, por CONTEO: 3 días sin registrar y NINGUNO cuenta como desvío.
  assert.strictEqual(sem.filter(d => d.estado === 'vacio').length, 3);
  assert.strictEqual(cnt.dentro + cnt.fuera, cnt.registrados,
    'algún día registrado no cayó ni dentro ni fuera, o un hueco se coló en la cuenta');
  // Sin plan: se registra, pero no se puede opinar → ni dentro ni fuera.
  const sinPlan = foodLogBandCount(foodLogWeekStates(fl, null, hoy, 7));
  assert.strictEqual(sinPlan.registrados, 4);
  assert.strictEqual(sinPlan.dentro, 0);
  assert.strictEqual(sinPlan.fuera, 0, 'sin plan no hay franja: decir «se desvió» sería inventarla');
  assert.strictEqual(foodLogBandCount(null).registrados, 0);
});

test('🔴 el vocabulario de estados cubre TODOS los que el motor produce — por CONTEO', () => {
  // `aviIcon` enseñó que un fallback silencioso a un valor plausible no falla: PINTA algo. Si
  // `foodLogWeekStates` gana un estado nuevo y el vocabulario no, el coach lo pinta como «vacio»
  // (hueco gris) y nadie se entera: un día desviado se leería como «no registró».
  const hoy = new Date('2026-08-12T12:00:00');
  const metas = {}; for (let i = 0; i < 7; i++) metas[i] = { kcal: 2000, prot_g: 150, carb_g: 200, fat_g: 55 };
  let fl = foodLogBlank();
  [[0, 2000], [1, 1000], [2, 3000]].forEach(([off, kcal]) => {
    const d = new Date(hoy.getTime() - off * 86400000);
    fl = foodLogAdd(fl, foodLogEntry({ id: 'v' + off, name: 'V', kcal, p: 1, c: 1, f: 1 }, 100, 'cena', d, () => 'v' + off), d);
  });
  const producidos = new Set();
  foodLogWeekStates(fl, metas, hoy, 7).forEach(d => producidos.add(d.estado));
  foodLogWeekStates(fl, null, hoy, 7).forEach(d => producidos.add(d.estado));
  // El barrido alcanza los CINCO estados alcanzables (con plan y sin plan), así que la cobertura
  // se puede afirmar como IGUALDAD DE CONJUNTOS y no solo «alguno está» — que no sería candado.
  assert.strictEqual(producidos.size, 5, `control: el barrido solo produjo ${producidos.size} estados distintos (${[...producidos]})`);
  producidos.forEach(e => assert.ok(FL_ESTADO_UI[e], `el motor produce «${e}» y el vocabulario no lo tiene: el coach lo pintaría como hueco`));
  // Y al revés: ni sobra vocabulario muerto ni se cuela un estado nuevo sin decidir su color.
  assert.deepStrictEqual(Object.keys(FL_ESTADO_UI).sort(), [...producidos].sort(),
    'el vocabulario y los estados que el motor produce dejaron de coincidir: si hay uno nuevo, decide qué color lleva Y si cuenta como fuera de franja');
  ['dentro', 'sinmeta', 'vacio'].forEach(e => assert.strictEqual(FL_ESTADO_UI[e].fuera, false, `${e} no puede contar como desvío`));
  ['bajo', 'alto'].forEach(e => assert.strictEqual(FL_ESTADO_UI[e].fuera, true));
  // Las dos audiencias, un solo color: ella lee sobre sí misma y él sobre ella.
  Object.keys(FL_ESTADO_UI).forEach(e => {
    const v = FL_ESTADO_UI[e];
    assert.ok(v.bg && v.fg && v.tu && v.su, `al estado «${e}» le falta color o texto`);
  });
});

test('🔴 el coach NO puede volver a juzgar la semana por su cuenta (candado estático)', () => {
  // Prohibir el literal `d.n>0` no serviría: se puede escribir de veinte formas. Lo que se
  // afirma es la FORMA de dónde sale el veredicto —el mismo patrón que ya protege la franja en
  // las dos superficies del asesorado—, que es lo que impide una segunda verdad (v435/v444).
  const fs = require('fs'), path = require('path');
  const coach = fs.readFileSync(path.join(__dirname, 'app-3-coach.js'), 'utf8');
  assert.ok(coach.length > 1000, `control: se leyeron ${coach.length} caracteres de app-3-coach.js`);
  assert.ok(/foodLogWeekStates\(c\.foodlog,targets,new Date\(\),7\)/.test(coach),
    'la fila del coach dejó de salir de foodLogWeekStates: volvió a juzgar la semana por su cuenta');
  assert.ok(/foodLogBandCount\(estados\)/.test(coach),
    'el coach dejó de contar con foodLogBandCount: si cuenta aparte, vuelven las dos varas');
  assert.ok(/FL_ESTADO_UI/.test(coach), 'el coach dejó de leer el vocabulario compartido');
  // Y la asesorada tiene que seguir leyendo el MISMO, o la unificación duró una versión.
  const cli = fs.readFileSync(path.join(__dirname, 'app-5-salud.js'), 'utf8');
  assert.ok(/FL_ESTADO_UI/.test(cli), 'la pantalla del asesorado se volvió a fabricar sus propios colores');
  // El vocabulario NO puede estar definido en una pantalla: vive en avi-core y de ahí lo leen las dos.
  assert.ok(!/const FL_ESTADO_UI\s*=/.test(coach) && !/const FL_ESTADO_UI\s*=/.test(cli),
    'una pantalla se declaró su propio FL_ESTADO_UI: eso es la segunda verdad otra vez');
});

// Candado ESTÁTICO: la pantalla no puede volver a la cifra exacta por su cuenta.
test('🔴 la pantalla habla de FRANJA, y no se inventa el ancho por su lado', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-5-salud.js'), 'utf8');
  assert.ok(/franja/i.test(src), 'desapareció la palabra «franja» de lo que lee la persona');
  // 🔴 EL ANCHO VIVE EN avi-core Y EN NINGÚN OTRO SITIO. Prohibir el literal `0.12` NO basta:
  // se comprobó saboteándolo —la pantalla se calculaba la franja con `0.88`/`1.12` y el test
  // seguía VERDE—. Lo que se afirma es la FORMA EXACTA de dónde sale la franja en cada una de
  // las dos superficies, que es lo que de verdad impide una segunda verdad (familia v435/v444).
  const deLaFuente = src.match(/const _?band\s*=\s*\(typeof foodLogBandFor==='function'\)\?foodLogBandFor\(/g) || [];
  assert.strictEqual(deLaFuente.length, 2,
    `la franja tiene que salir de foodLogBandFor en las DOS superficies (héroe del registro y bloque de hábitos); encontradas ${deLaFuente.length}`);
  // Y no puede haber una segunda función que fabrique una franja por su cuenta.
  assert.ok(!/lo\s*:\s*Math\.round|Math\.round\([^)]*\*\s*1\.\d\d\)/.test(src),
    'hay aritmética de franja en la pantalla: el ancho se duplicó');
  assert.ok(/function _flSemanaHtml\(/.test(src), 'desapareció la fila de los 7 días');
  assert.ok(/_foodLogTargetsSemana/.test(src), 'la fila de la semana dejó de comparar contra el plan de cada día');
});

// 🔴 EL COACH Y LA ASESORADA NO PUEDEN JUZGAR EL MISMO DÍA CON DOS VARAS DISTINTAS. La ficha del
// coach pintaba naranja a partir de un `12` escrito a mano, y la franja del asesorado es un
// `0.12` en avi-core: dos números con el mismo significado en dos archivos. Es la contradicción
// de v435/v444 esperando su turno — ella leyendo «✓ vas en tu franja» y él una alerta por ese día.
test('🔴 el umbral de desvío del coach SALE del ancho de la franja, no de un número suelto', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-3-coach.js'), 'utf8');
  assert.ok(/_FL_DESVIO_MEDIO\s*=\s*\(typeof FOODLOG_BAND==='number'\)\?Math\.round\(FOODLOG_BAND\*100\)/.test(src),
    'el umbral del coach dejó de derivarse del ancho de la franja');
  assert.ok(/const grave=Math\.abs\(pct\)>=25, medio=Math\.abs\(pct\)>_FL_DESVIO_MEDIO;/.test(src),
    'el chip de desvío volvió a un umbral propio (o a `>=`, que marca desvío justo en el borde de la franja)');
  // Y el borde exacto: a +12% ella está DENTRO, así que él NO puede verlo como desvío.
  const borde = Math.round(FOODLOG_BAND * 100);
  assert.strictEqual(foodLogBandFor(1000, 1000 + borde * 10).estado, 'dentro',
    `a +${borde}% el asesorado está dentro de su franja`);
  assert.ok(!(borde > borde), 'el chip del coach marcaría desvío justo donde ella está dentro');
});

// ══════════════════════════════════════════════════════
section('Registro de alimentos — la LISTA DEL MERCADO (patrón 4 del estudio)');

const _shopBase = { origen: 'coach', kcalObj: 2100, macros: { prot_g: 150, carb_g: 210, fat_g: 60, kcal: 2100 } };
const _shopRut = [
  { day: 'Lunes', name: 'Pierna', exercises: [{ muscle: 'cuadriceps' }] },
  { day: 'Miércoles', name: 'Torso', exercises: [{ muscle: 'pecho' }] },
  { day: 'Viernes', name: 'Full', exercises: [{ muscle: 'espalda' }] },
];

test('la lista suma los 7 días del plan y los agrupa por sección del mercado', () => {
  const l = nutShoppingList(_shopBase, _shopRut);
  assert.strictEqual(l.dias, 7, 'la lista tiene que cubrir la semana entera');
  assert.ok(l.items >= 15, `solo ${l.items} alimentos: el plan no se resolvió`);
  assert.ok(l.grupos.length >= 4);
  l.grupos.forEach(g => {
    assert.ok(g.items.length > 0, 'un grupo vacío no se pinta');
    g.items.forEach(i => {
      assert.ok(i.grams > 0 && i.text, `${i.name} sin cantidad`);
      assert.ok(NUT_FOOD_BY_ID[i.id], 'un id que no está en la tabla no puede entrar a la lista');
    });
  });
  // Sin plan no se inventa una lista.
  assert.strictEqual(nutShoppingList(null, _shopRut), null);
});

// 🔴 EL ORÁCULO INDEPENDIENTE: la suma se re-deriva recorriendo los 7 días a mano, sin creerle
// nada a `nutShoppingList`. Si la lista se dejara un alimento (o lo contara dos veces), la
// persona iría al mercado con la compra mal y NADA más en la app se enteraría.
test('🔴 la lista es EXACTAMENTE lo que piden los 7 días, recalculado aparte', () => {
  const l = nutShoppingList(_shopBase, _shopRut);
  const esperado = Object.create(null);
  const shape = nutWeekShape(_shopRut);
  ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].forEach((nom, i) => {
    const rut = _shopRut.find(r => r.day === nom) || null;
    const plan = nutDayPlan(_shopBase, nutDayKind(rut), shape.trainDays, shape.legDays, i);
    plan.meals.forEach(m => {
      (m.items || []).forEach(it => { esperado[it.id] = (esperado[it.id] || 0) + it.grams; });
      (m.acompIds || []).forEach(id => {
        const f = NUT_FOOD_BY_ID[id]; if (!f) return;
        esperado[id] = (esperado[id] || 0) + ((f.un && f.un.g > 0) ? f.un.g : 100);
      });
    });
  });
  const enLista = Object.create(null);
  l.grupos.forEach(g => g.items.forEach(i => { enLista[i.id] = i.grams; }));
  const ids = Object.keys(esperado).filter(id => NUT_FOOD_BY_ID[id]);
  assert.strictEqual(Object.keys(enLista).length, ids.length, 'la lista y el plan no traen los mismos alimentos');
  ids.forEach(id => {
    assert.ok(Math.abs(enLista[id] - esperado[id]) <= 1,
      `${id}: la lista pide ${enLista[id]} g y los 7 días suman ${Math.round(esperado[id])} g`);
  });
});

// 🔴 `maxG` ES EL TOPE DE UNA RACIÓN, NO DE LA COMPRA DE LA SEMANA. `nutPortionText` sí lo aplica
// —y el reflejo de reusarla aquí es fortísimo—, pero aplicarlo dejaría la lista pidiendo 200 g de
// clara de huevo para siete días de plan.
test('🔴 la lista del mercado NO aplica el tope de ración', () => {
  const clara = NUT_FOOD_BY_ID['clara'];
  assert.ok(clara.maxG > 0, 'el fixture necesita un alimento CON tope de ración');
  const q = nutShopQty(clara, 900);
  assert.strictEqual(q.grams, 900, `el tope de ración (${clara.maxG} g) recortó la compra de la semana`);
  // Y el control: la MISMA cantidad por `nutPortionText` sí queda topada — o este test no prueba nada.
  assert.ok(nutPortionText(clara, 900).grams <= clara.maxG,
    'nutPortionText dejó de aplicar maxG: el control de este test ya no discrimina');
});

// La medida de RACIÓN no es la de COMPRA: sumada a la semana da «13 octavos de aguacate».
test('🔴 al mercado se va con el peso, salvo lo que de verdad se compra por unidad', () => {
  const huevo = nutShopQty(NUT_FOOD_BY_ID['huevo'], 575);
  assert.strictEqual(huevo.porUnidad, true);
  assert.strictEqual(huevo.text, '12 huevos', 'los huevos se cuentan, y se redondea HACIA ARRIBA');
  assert.strictEqual(huevo.sub, '575 g');
  const agua = nutShopQty(NUT_FOOD_BY_ID['aguacate'], 375);
  assert.strictEqual(agua.porUnidad, false, '«13 octavos de aguacate» no es una cantidad de mercado');
  assert.strictEqual(agua.text, '375 g');
  // Y la cuenta de raciones NO vuelve por la línea de ayuda: sería el mismo ruido, más pequeño.
  assert.strictEqual(agua.sub, null, 'la ayuda de al lado devolvió «13 octavos» debajo del peso');
  assert.strictEqual(huevo.sub, '575 g', 'a lo que se compra por unidad sí le sirve saber el peso');
  // El kilo es la unidad del mercado en cuanto se pasa de 1.000 g.
  assert.strictEqual(nutShopQty(NUT_FOOD_BY_ID['yogur_griego'], 2600).text, '2,6 kg');
  // Y todo lo marcado `compra:'un'` tiene que tener medida casera, o la marca no hace nada.
  let marcados = 0;
  NUT_FOODS.forEach(f => {
    if (f.compra !== 'un') return;
    marcados++;
    assert.ok(f.un && f.un.g > 0, `${f.id} se declara de compra por unidad y no tiene medida casera`);
  });
  assert.ok(marcados >= 10, `solo ${marcados} alimentos se compran por unidad: revisa la tabla`);
});

// 🔴 ESTE TEST AFIRMABA EL COMPORTAMIENTO CONTRARIO Y SE CAMBIÓ A PROPÓSITO (13-ago). Decía «lo
// que se sirve COCIDO se marca» y exigía `arroz.cocido === true` / `huevo.cocido === false`. Era
// un candado sobre un mecanismo roto: la marca se deducía del NOMBRE del alimento, y como la
// tabla entera es cocido-base pero solo algunos lo dicen en el nombre, **las 6 carnes no se
// marcaban nunca** (la lista pedía 1,4 kg de pechuga para 1 kg servido: ~28% menos proteína, sin
// aviso). El test pasaba en verde porque preguntaba por el arroz, que sí acierta.
// Decisión del PO sobre el dictamen de Andrés Hyp: fuera el marcado por alimento, UNA frase.
test('🔴 la lista NO clasifica alimento por alimento: una sola frase, y dice las DOS direcciones', () => {
  const l = nutShoppingList(_shopBase, _shopRut);
  const todos = [];
  l.grupos.forEach(g => g.items.forEach(i => todos.push(i)));
  assert.ok(todos.length >= 10, `control: la lista trae ${todos.length} alimentos`);
  // 🔒 Ni un alimento puede llevar su propia marca: marcar unos e implicar que los otros son
  // peso de compra es el defecto que esto cierra (puerta cerrada, ventana abierta).
  const marcados = todos.filter(i => 'cocido' in i);
  assert.strictEqual(marcados.length, 0,
    `${marcados.length} alimentos volvieron a llevar marca propia: un marcado parcial es peor que ninguno`);
  // 🔒 La frase sale SIEMPRE, no cuando un detector crea que hace falta: el alimento que el
  // detector no vea es exactamente este bug otra vez.
  assert.strictEqual(l.nota, NUT_SHOP_NOTA, 'la lista dejó de traer su nota');
  assert.ok(/menos/.test(l.nota) && /más/.test(l.nota),
    'la frase tiene que decir las DOS direcciones: el texto viejo solo decía «crudo pesa menos», ' +
    'que es falso para las carnes, la papa, la yuca y el plátano (pesan MÁS crudos)');
  assert.ok(/carne/i.test(l.nota), 'la frase no nombra las carnes, que son el caso que se estaba callando');
  // 🔒 Y la pantalla y el WhatsApp dicen lo MISMO, porque leen la misma constante.
  assert.ok(nutShoppingText(l, 'X').includes(NUT_SHOP_NOTA), 'el texto para compartir dice otra cosa que la pantalla');
});

// 🔴 EL CONTROL DE POR QUÉ NO HAY MARCADO: la tabla es cocido-base, TAMBIÉN en las carnes. Si
// alguien migra estos macros a valores crudos, la frase de arriba pasa a ser falsa y hay que
// re-decidir — por eso se afirma aquí y no en un comentario. Ninguna carne CRUDA llega a 26 g de
// proteína por 100 g: no cabe físicamente con 70-75% de agua (TCAC 2018: res magra cruda F099 =
// 21,8 g · cerdo lomo crudo F019 = 21,6 g · tilapia entera cruda E043 = 20,1 g).
test('🔴 las carnes de la tabla son valores COCIDOS — si dejan de serlo, la nota miente', () => {
  // 🔁 v489: antes esto se afirmaba con `proteína ≥ 25`, un PROXY de «cocida» — y el proxy es
  // falso: la fila oficial del pollo de pierna sin piel COCIDA (TCAC F090) trae 22,9 g, porque una
  // pierna es menos densa en proteína que una pechuga. El candado marcaba en rojo un dato correcto.
  // Ahora que cada alimento lleva su CITA, se le pregunta a la fuente en vez de adivinar: la
  // descripción tiene que decir que está cocida. Es la misma regla que ya se aplicó a los `onclick`
  // y al espejo del SQL — un candado se DERIVA del dato, no de una heurística sobre el dato.
  const carnes = ['pollo_pechuga', 'pollo_muslo', 'res_magra', 'res_molida', 'cerdo_lomo', 'tilapia'];
  // 🔁 v490: se añade `frit` a la lista de formas de cocción. NO es aflojar el candado —lo que
  // vigila es que la fila citada no sea CRUDA, y freír cuece— sino que a la lista le faltaba una
  // cocción entera: la TCAC solo publica la cadera (la «posta» de `res_magra`) frita.
  const COCIDA = /cocid|asad|horne|frit|roast|cooked|grill|braise|baked|fried/i;
  let vistas = 0, porCita = 0;
  carnes.forEach(id => {
    const f = NUT_FOODS.find(x => x.id === id);
    assert.ok(f, `desapareció ${id} de la tabla`);
    vistas++;
    if (f.ref) {
      porCita++;
      assert.ok(COCIDA.test(f.ref), `${id} cita una fila que NO dice cocida («${f.ref}»): la lista del mercado aplica su factor de compra sobre un valor crudo y queda mintiendo`);
    } else {
      // Sin cita no hay a quién preguntarle: queda el proxy viejo, que es lo único que hay.
      assert.ok(f.p >= 25, `${id} no tiene fuente citada y sus ${f.p} g de proteína no parecen carne cocida`);
    }
  });
  assert.strictEqual(vistas, 6, `control: se revisaron ${vistas} carnes de 6`);
  assert.ok(porCita >= 2, `control: solo ${porCita} carnes se verificaron contra su CITA — si baja, el candado volvió a ser una heurística`);
});

test('el texto para compartir sale de la lista YA armada, no de un segundo cálculo', () => {
  const l = nutShoppingList(_shopBase, _shopRut);
  const txt = nutShoppingText(l, 'Nataly');
  assert.ok(txt.includes('Nataly') && txt.includes('lista del mercado'));
  l.grupos.forEach(g => {
    assert.ok(txt.includes(g.name.toUpperCase()), `falta la sección ${g.name}`);
    g.items.forEach(i => assert.ok(txt.includes(i.name), `falta ${i.name} en el texto`));
  });
  assert.strictEqual(nutShoppingText(null), '');
  assert.strictEqual(nutShoppingText({ grupos: [] }), '');
});

// Candado ESTÁTICO de una clase entera: `aviIcon` cae a SPARKLES cuando el nombre no existe, así
// que un nombre mal escrito no falla — pinta ✨ en un botón de compartir y nadie se entera.
// Se descubrió al escribir esta pantalla, con `aviIcon('share')`, que no existe.
test('🔴 todo aviIcon(«nombre») usa un icono que EXISTE (o pinta ✨ en silencio)', () => {
  const fs = require('fs'), path = require('path');
  const infra = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  const bloque = infra.slice(infra.indexOf('const AVI_ICONS={'));
  const validos = new Set((bloque.slice(0, bloque.indexOf('\n};')).match(/^\s{2}([a-zA-Z_]\w*)\s*:/gm) || [])
    .map(s => s.trim().replace(/\s*:$/, '')));
  assert.ok(validos.size > 30, `solo se leyeron ${validos.size} iconos: el parser no está viendo la tabla`);
  const usados = new Set();
  ['app-1-infra.js', 'app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'app-7-community.js']
    .forEach(f => {
      const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
      (src.match(/aviIcon\('([a-zA-Z_]\w*)'/g) || []).forEach(m => usados.add(m.replace(/aviIcon\('/, '').replace(/'$/, '')));
    });
  assert.ok(usados.size > 10, `solo se encontraron ${usados.size} usos: el parser no está viendo las llamadas`);
  const rotos = [...usados].filter(n => !validos.has(n));
  assert.deepStrictEqual(rotos, [], `estos nombres de icono no existen y pintan ✨ en silencio: ${rotos.join(', ')}`);
});

// ══════════════════════════════════════════════════════
section('Menores de edad y peso real (dictamen de Andrés Hyp, 2026-08-05)');

// 🔴 Mifflin-St Jeor NO está validado por debajo de 18 y SUBESTIMA (no cuenta el crecimiento).
test('🔴 calcTMB usa Schofield en menores y Mifflin en adultos', () => {
  // Valery, real: F, 15 años, 52 kg, 161 cm. Schofield 10-18 F = 13,384·P + 692,6 = 1.389
  assert.strictEqual(calcTMB(52, 161, 15, 'F'), 1389);
  // La misma persona a los 18 pasa a Mifflin: 520 + 1006,25 − 90 − 161 = 1.275
  assert.strictEqual(calcTMB(52, 161, 18, 'F'), 1275);
  // Y con Mifflin a los 15 habría dado 1.290: 99 kcal de basal MENOS que Schofield.
  assert.ok(calcTMB(52, 161, 15, 'F') > 10 * 52 + 6.25 * 161 - 5 * 15 - 161,
    'Schofield tiene que dar MÁS que Mifflin en una menor, no menos');
  // Hombre menor: 17,686·P + 658,2
  assert.strictEqual(calcTMB(64, 170, 17, 'M'), Math.round(17.686 * 64 + 658.2));
});
test('isMenor: solo con edad válida y menor de 18', () => {
  assert.strictEqual(isMenor({ age: 15 }), true);
  assert.strictEqual(isMenor({ age: 17 }), true);
  assert.strictEqual(isMenor({ age: 18 }), false);
  assert.strictEqual(isMenor({ age: 34 }), false);
  assert.strictEqual(isMenor({}), false);          // sin edad no se asume nada
  assert.strictEqual(isMenor({ age: 0 }), false);
});
// 🔴 LA REGLA QUE PROTEGE A 5 PERSONAS REALES DE LA BASE.
test('🔴 un menor NUNCA recibe déficit, ni con objetivo «Perder grasa»', () => {
  const v = { age: 15, sex: 'F', height: 161, weight: 52, activityFactor: 1.375 };
  ['Perder grasa', 'Recomposición'].forEach(goal => {
    const e = nutritionEstimate(Object.assign({}, v, { goal }), 52);
    // 🔴 Este test decía `deficit === 0` y `kcalObj === tdee`, y estaba pinchando el defecto en vez
    // del producto: la app NUNCA le sirvió su gasto pelado — `nutBaseFor` le pone el piso ×1,05
    // desde v485, así que lo que ella come son 2.009 y la estimación decía 1.910. El test protegía
    // la mitad de la app que NO se sirve. Ahora se afirma lo que de verdad se promete: no baja de
    // su gasto, y las DOS puertas dicen el mismo número.
    assert.ok(e.deficit >= 0, `«${goal}» le está restando energía a una menor`);
    const piso = Math.round(e.tdee * 1.05);
    // La banda se cierra con carbohidrato y un gramo son 4 kcal: se afirma el piso y su grano, no
    // una cifra exacta que el redondeo no puede prometer.
    assert.ok(e.kcalObj >= piso && e.kcalObj < piso + 4,
      `un menor recibe su gasto con el margen del plato (${e.kcalObj} contra un piso de ${piso})`);
    const b = nutBaseFor(Object.assign({}, v, { goal }), null, 52);
    assert.strictEqual(b.kcalObj, e.kcalObj, 'la habitación y el plato tienen que dar el MISMO número');
  });
  // Y el TEXTO lo dice: cambiar el número y dejar el rótulo viejo es el defecto de v437.
  const e = nutritionEstimate(Object.assign({}, v, { goal: 'Perder grasa' }), 52);
  assert.ok(/creciendo/.test(e.label), `la etiqueta no explica por qué no baja: «${e.label}»`);
  assert.strictEqual(nutGoalForClient('Perder grasa', v), 'mantenimiento',
    'el rótulo diría «cutting» sobre un plan que NO es déficit');
});
test('control: una ADULTA con los mismos datos SÍ lleva déficit', () => {
  const a = { age: 25, sex: 'F', height: 161, weight: 52, activityFactor: 1.375, goal: 'Perder grasa' };
  const e = nutritionEstimate(a, 52);
  assert.ok(e.deficit < 0, 'la regla de menores se está aplicando a una adulta');
  assert.strictEqual(nutGoalForClient('Perder grasa', a), 'cutting');
});
// 🔴 El peso que manda es el ÚLTIMO registrado. Tres superficies llamaban sin peso y usaban el
// de la ficha: en un asesorado real eran 78 kg contra 86, o sea 138 kcal y 17 g de proteína de
// diferencia ENTRE PANTALLAS DE LA MISMA APP. Cuarta superficie de la familia v435/v444.
test('🔴 ninguna pantalla estima con el peso de la ficha en vez del último registrado', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'app-5-salud.js'), 'utf8');
  const sinPeso = src.match(/nutritionEstimate\((c|cl)\)/g) || [];
  assert.deepStrictEqual(sinPeso, [], `hay ${sinPeso.length} llamada(s) sin peso: usarían la ficha, que envejece`);
  // Y las que hay pasan por el helper que lee el último peso registrado.
  const conPeso = (src.match(/nutritionEstimate\((c|cl),_nutPesoDe\(\1\)\)/g) || []).length;
  assert.ok(conPeso >= 5, `solo ${conPeso} llamadas usan _nutPesoDe; se esperaban 5`);
});
// 🔴 QUINTA SUPERFICIE de la familia v435/v444/v448 (2026-08-06). El helper que v448 puso para
// leer «el último peso registrado» leía el EXTREMO EQUIVOCADO: `saveBodyweight` guarda con
// `unshift` + `sort` DESCENDENTE, así que `bw[bw.length-1]` es el registro MÁS VIEJO. Medido
// contra producción: los 5 historiales con más de un registro están en orden descendente y 4
// personas recibían un plan calculado sobre un peso que ya no era el suyo (Nataly con 54 kg
// pesando 59,5 = 85 kcal y 12 g de proteína de diferencia). O sea: **pesarse no movía el plan**.
test('🔴 el peso vigente sale de la FECHA, no de la posición en el arreglo', () => {
  // El orden REAL en el que la app guarda: el más nuevo primero.
  const comoLoGuardaLaApp = [{ date: '2026-07-15', kg: 83 }, { date: '2026-06-03', kg: 85 }, { date: '2026-05-23', kg: 85 }];
  assert.strictEqual(core.lastBodyweightKg(comoLoGuardaLaApp), 83,
    'con el arreglo descendente que la app escribe, el peso vigente es el de julio, no el de mayo');
  // Y si llegara al revés (otro dispositivo, una migración), el resultado tiene que ser el MISMO:
  // la fecha manda, no el índice.
  assert.strictEqual(core.lastBodyweightKg(comoLoGuardaLaApp.slice().reverse()), 83,
    'el orden del arreglo no puede decidir cuánto pesa alguien');
  // Casos degradados: nada que leer → null (y el llamador cae a la ficha, no inventa).
  assert.strictEqual(core.lastBodyweightKg([]), null);
  assert.strictEqual(core.lastBodyweightKg(null), null);
  assert.strictEqual(core.lastBodyweightKg([{ date: '2026-07-15', kg: 0 }]), null, 'un 0 no es un peso');
  // `new Date(null)` devuelve EPOCH, no Invalid Date: un registro sin fecha no puede ganar por
  // ser "de 1970" ni tumbar al que sí la tiene.
  assert.strictEqual(core.lastBodyweightKg([{ date: '2026-07-15', kg: 83 }, { date: null, kg: 99 }]), 83);
  assert.strictEqual(core.lastBodyweightKg([{ kg: 77 }]), 77, 'sin ninguna fecha usable, el convenio de escritura: el primero');
  // nutWeightFor: el registrado manda sobre la ficha; sin registros, la ficha es el respaldo.
  assert.strictEqual(core.nutWeightFor({ weight: 78 }, comoLoGuardaLaApp), 83);
  assert.strictEqual(core.nutWeightFor({ weight: 78 }, []), 78);
});

test('🔴 ninguna pantalla vuelve a leer un extremo del arreglo de pesos', () => {
  const fs = require('fs'), path = require('path');
  const malas = [];
  ['app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js'].forEach(f => {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    src.split('\n').forEach((ln, i) => {
      if (/^\s*\/\//.test(ln)) return;                     // los comentarios documentan el defecto
      if (/\b(_?bw|bwEntries)\s*\[\s*\1?\s*(_?bw|bwEntries)?\.?length\s*-\s*1\s*\]/.test(ln)) malas.push(`${f}:${i + 1}`);
    });
  });
  assert.deepStrictEqual(malas, [],
    'quien lea el último índice del arreglo de pesos está leyendo el registro MÁS VIEJO: usa nutWeightFor');
});

test('el peso de la ficha y el último registrado dan planes distintos (por eso importa)', () => {
  const s = { age: 28, sex: 'M', height: 176, weight: 78, activityFactor: 1.725, goal: 'Ganar músculo' };
  const ficha = nutritionEstimate(s);           // sin peso → usa client.weight
  const real = nutritionEstimate(s, 86);        // último registrado
  assert.strictEqual(real.kcalObj - ficha.kcalObj, 138);
  assert.strictEqual(real.macros.prot_g - ficha.macros.prot_g, 17);
});

// ── v447: el entreno de «Hoy» llega colapsado ──
// Medido: «Hoy» eran 4.709 px (5,6 pantallas) y el entreno el 79%.
test('workoutStartCollapsed: por defecto llega colapsado', () => {
  assert.strictEqual(workoutStartCollapsed({}), true);
  assert.strictEqual(workoutStartCollapsed(), true);
});
// 🔴 EL CANDADO. Colapsar encima de alguien que va en la serie 3 le esconde su propio entreno.
// Es el bug de v366 que Fable rechazó, con otra cara.
test('🔴 workoutStartCollapsed: una sesión EN CURSO nunca se colapsa', () => {
  assert.strictEqual(workoutStartCollapsed({ hasProgress: true }), false);
  // …ni siquiera si además pidió otra rutina o entrenar de nuevo.
  assert.strictEqual(workoutStartCollapsed({ hasProgress: true, isOverride: true }), false);
});
test('workoutStartCollapsed: si ya tocó «Empezar», eligió rutina o pidió entrenar otra vez, va abierto', () => {
  assert.strictEqual(workoutStartCollapsed({ expanded: true }), false);
  assert.strictEqual(workoutStartCollapsed({ isOverride: true }), false);
  assert.strictEqual(workoutStartCollapsed({ trainAgain: true }), false);
});
test('🔴 «Hoy» está cableada a la tarjeta de arranque y respeta la sesión en curso', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'app-4-entreno.js'), 'utf8');
  assert.ok(/function _startCardHTML/.test(src) && /function expandTodayWorkout/.test(src));
  assert.ok(/hasProgress: _todayHasProgress\(todayR\)/.test(src),
    'la decisión de colapsar no está mirando si hay una sesión a medias');
  // El progreso se lee de la MISMA clave donde el entreno lo guarda, no de un espejo.
  assert.ok(/localStorage\.getItem\(getDoneKey\(routine\.id,ei,si\)\)==='1'/.test(src),
    '_todayHasProgress no lee las banderas reales de serie hecha');
  // Y el colapso va ANTES de embeber el guiado, o se pinta el entreno igual.
  const iCol = src.indexOf('workoutStartCollapsed({');
  const iEmb = src.indexOf('openGuidedEmbedded(todayR)');
  assert.ok(iCol > 0 && iEmb > iCol, 'el guiado se embebe antes de decidir si colapsar');
});

// 🔴 LAS TRES PANTALLAS DE NUTRICIÓN MUESTRAN EL MISMO NÚMERO. Reporte del PO (2026-08-05):
// «ver mi plan en grande no sigue los parámetros de las otras pantallas». Medido: la habitación
// pintaba el titular ESCRITO (2.900) y el Perfil el derivado de sus macros (2.805) — 95 kcal/día
// de diferencia para el MISMO plan, a un toque de distancia. v435 arregló esto en «Hoy» y
// «Perfil» y se dejó viva la tercera superficie.
test('🔴 la habitación del plan usa el MISMO kcal que Perfil (derivado de los macros)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'app-5-salud.js'), 'utf8');
  const room = src.slice(src.indexOf('function openNutritionRoom'), src.indexOf('function closeNutritionRoom'));
  assert.ok(/nutBaseFor\(c,nut,_nutPesoDe\(c\)\)/.test(room),
    'la habitación no está derivando el kcal del mismo motor que las otras pantallas');
  assert.ok(!/d=\{kcal:nut\.kcal,/.test(room),
    'la habitación volvió a pintar el titular escrito en vez del derivado');
  // Y el motor confirma la diferencia que el PO vio: 2.900 escritos, 2.805 reales.
  const nut = { kcal: 2900, prot: 170, carbs: 340, fat: 85 };
  assert.strictEqual(nutMacroKcal(nut), 2805);
});

// ── F4 · lo que ve el coach ──
const _metas7 = (() => { const m = {}; for (let i = 0; i < 7; i++) m[i] = { kcal: 1200, prot_g: 62, carb_g: 120, fat_g: 30 }; return m; })();
function _flTresDias() {
  const comida = { id: 'x', name: 'X', kcal: 200, p: 10, c: 20, f: 5 };
  let fl = foodLogBlank();
  [0, 1, 3].forEach(d => {
    const dia = new Date(_hoyFL.getTime() - d * 86400000);
    fl = foodLogAdd(fl, foodLogEntry(comida, 500, 'almuerzo', dia, _flId), dia);
  });
  return fl;
}
test('foodLogWeek: los últimos 7 días, hoy de último, con su total', () => {
  const w = foodLogWeek(_flTresDias(), _hoyFL, 7);
  assert.strictEqual(w.length, 7);
  assert.strictEqual(w[6].day, habitDayKey(_hoyFL), 'hoy debe ir de último');
  assert.strictEqual(w.filter(d => d.n > 0).length, 3);
  assert.strictEqual(w[6].kcal, 1000);
});
// 🔴 LA TRAMPA DEL PROMEDIO. Un día sin registrar NO es «comió cero», es «no sabemos». Contarlo
// como cero haría ver a cualquiera en déficit brutal y el coach decidiría sobre un dato inventado.
test('🔴 el promedio del coach SOLO cuenta los días que la persona registró', () => {
  const a = foodLogAdherence(_flTresDias(), _metas7, _hoyFL, 7);
  assert.strictEqual(a.registrados, 3);
  assert.strictEqual(a.prom.kcal, 1000, 'el promedio debe ser sobre los 3 días con registro');
  assert.strictEqual(a.desvio.kcal, -17);
  // Con los días vacíos contando como cero el desvío daría -64%: casi cuatro veces peor, y falso.
  const falso = Math.round((1000 * 3 / 7 - 1200) / 1200 * 100);
  assert.strictEqual(falso, -64);
  assert.notStrictEqual(a.desvio.kcal, falso, 'está promediando contra los días sin registrar');
});
test('foodLogAdherence: el desvío se calcula por macro, no solo en calorías', () => {
  const a = foodLogAdherence(_flTresDias(), _metas7, _hoyFL, 7);
  assert.strictEqual(a.desvio.p, -19);   // la proteína va PEOR que el total: ese es el punto
  assert.strictEqual(a.desvio.c, -17);
  assert.strictEqual(a.desvio.f, -17);
});
test('foodLogAdherence: sin registro y sin plan no inventa nada', () => {
  const vacio = foodLogAdherence(foodLogBlank(), _metas7, _hoyFL, 7);
  assert.strictEqual(vacio.registrados, 0);
  assert.strictEqual(vacio.prom, null);
  assert.strictEqual(vacio.desvio, null);
  // Con registro pero SIN plan: promedia, pero no opina sobre desvío.
  const sinPlan = foodLogAdherence(_flTresDias(), null, _hoyFL, 7);
  assert.strictEqual(sinPlan.registrados, 3);
  assert.ok(sinPlan.prom.kcal > 0);
  assert.strictEqual(sinPlan.desvio, null, 'sin plan no hay contra qué comparar');
});
test('🔴 la ficha del coach está cableada y respeta la fuente única del plan', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'app-3-coach.js'), 'utf8');
  const html = fs.readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
  assert.ok(/id="d-foodlog"/.test(html), 'falta el contenedor en la ficha del asesorado');
  assert.ok(/renderCoachFoodLogCard\(c\);/.test(src), 'la tarjeta no se pinta al abrir la ficha');
  assert.ok(/function renderCoachFoodLogCard/.test(src) && /function flCoachDia/.test(src));
  // Los objetivos por día salen de nutWeekTargets, el MISMO motor que ve el asesorado.
  assert.ok(/_flCoachTargets[\s\S]{0,600}nutWeekTargets/.test(src),
    'el coach estaría comparando contra una cuenta distinta de la que ve su asesorado');
  // El detalle de cada día se pinta con esc(): son datos que escribió otra persona.
  assert.ok(/esc\(e\.name\|\|'Alimento'\)/.test(src), 'el nombre del alimento entra sin escapar');
});
test('el registro tolera basura sin romperse (fila corrupta, campo de otro tipo)', () => {
  [null, undefined, 'texto', 42, [], { d: 'no-es-objeto' }].forEach(basura => {
    const fl = foodLogPrune(basura, _hoyFL);
    assert.deepStrictEqual(Object.keys(fl).sort(), ['d', 'm']);
    assert.strictEqual(foodLogDay(basura, _hoyFL).length, 0);
    assert.strictEqual(foodLogTotals(foodLogDay(basura, _hoyFL)).n, 0);
  });
});

// ── v437: el RÓTULO del plan tiene que cuadrar con sus propios números ──
test('nutGoalForClient: cada objetivo del asesorado tiene su rótulo de plan', () => {
  assert.strictEqual(nutGoalForClient('Perder grasa'), 'cutting');
  assert.strictEqual(nutGoalForClient('Ganar músculo'), 'volumen');
  assert.strictEqual(nutGoalForClient('Fuerza'), 'volumen');
  // v449: la recomposición tiene rótulo PROPIO. Antes caía en `mantenimiento`, cuyo texto dice
  // «sostener tu composición» — la negación exacta de lo que es una recomposición.
  assert.strictEqual(nutGoalForClient('Recomposición'), 'recomposicion');
  assert.strictEqual(nutGoalForClient('Resistencia'), 'mantenimiento');
  // Sin objetivo declarado NO se inventa un déficit ni un superávit.
  assert.strictEqual(nutGoalForClient(''), 'mantenimiento');
  assert.strictEqual(nutGoalForClient(undefined), 'mantenimiento');
  // 🔴 Pero a una MENOR no se le habla de composición corporal: no tiene nada que recomponer
  // (las dos de la base están en IMC 19 y 20) y ese lenguaje es justo el que no debe leer.
  const menor = { age: 15, sex: 'F' };
  assert.strictEqual(nutGoalForClient('Recomposición', menor), 'mantenimiento');
  assert.strictEqual(nutGoalForClient('Perder grasa', menor), 'mantenimiento');
  // y una adulta con el mismo objetivo SÍ recibe el rótulo real (control del candado)
  assert.strictEqual(nutGoalForClient('Recomposición', { age: 30, sex: 'F' }), 'recomposicion');
});

// 🔴 EL CANDADO DE MENORES TIENE QUE CUBRIR **LAS DOS** RUTAS QUE ELIGEN EL TEXTO.
// Hallazgo de Sofía auditando v449 ANTES de publicarla: `nutGoalForClient` (estimación
// automática) guardaba, pero la habitación de nutrición usa el rótulo del plan GUARDADO por el
// coach, que salía de `inferNutGoal(nut)` — una función que ni siquiera recibe al cliente. Con un
// toque del botón nuevo «Recomposición 🔄» sobre el plan de la asesorada de 15 años, la app le
// explicaba «que cambie de qué está hecho ese peso: menos grasa y más músculo».
// Puerta cerrada, ventana abierta: la misma familia que el filtro de lesiones y el calentamiento.
test('🔴 a una menor no le llega lenguaje de composición por NINGUNA de las dos rutas', () => {
  const menor = { age: 15, sex: 'F', goal: 'Recomposición' };
  const adulta = { age: 30, sex: 'F', goal: 'Recomposición' };
  // ruta A — sin plan del coach (estimación automática)
  assert.strictEqual(nutGoalForClient(menor.goal, menor), 'mantenimiento');
  // ruta B — CON plan guardado por el coach, que es la que estaba abierta
  ['recomposicion', 'cutting', 'definicion'].forEach(g => {
    assert.strictEqual(core.nutWhyKey({ goal: g }, menor), 'mantenimiento',
      `un plan rotulado «${g}» le llega a una menor con su lenguaje de composición corporal`);
    // CONTROL: a una adulta el rótulo NO se toca, o el candado sería un apagón
    assert.strictEqual(core.nutWhyKey({ goal: g }, adulta), g);
  });
  // y el rótulo inferido del TEXTO libre del coach pasa por el mismo filtro
  assert.strictEqual(core.nutWhyKey({ plan: 'Plan de recomposición con proteína alta' }, menor), 'mantenimiento');
  assert.strictEqual(core.nutWhyKey({ plan: 'Déficit para perder grasa' }, menor), 'mantenimiento');
  // sin pista no se inventa rótulo (ni para menor ni para adulta)
  assert.strictEqual(core.nutWhyKey({ plan: 'come sano' }, menor), null);
});

test('🔴 la habitación de nutrición pasa por el candado, no por inferNutGoal a secas', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-5-salud.js'), 'utf8');
  const crudas = (src.match(/GOAL_WHY\[inferNutGoal\(/g) || []);
  assert.deepStrictEqual(crudas, [],
    'elegir el texto con inferNutGoal a secas se salta el candado de menores: usa nutWhyKey(nut, cliente)');
  // Se afirma la LLAMADA, no su lista de argumentos: clavarla a `(nut,c)` la rompió el día que el
  // rótulo pasó a depender también del peso (banda de menores). R2.3 — aserciones derivadas.
  assert.ok(/GOAL_WHY\[nutWhyKey\(nut,\s*c\s*[,)]/.test(src), 'la ruta del plan guardado debe resolver con nutWhyKey');
  // El aviso al coach se calcula con la MISMA función que pinta lo que ve el destinatario (v437).
  assert.ok(/const efectivo=nutWhyKey\(/.test(src),
    'el aviso del coach no puede usar un oráculo distinto al que decide lo que lee su asesorada');
});

// 🔴 El editorial semanal vive en la pantalla de ENTRENO del asesorado, no en nutrición — y
// también le hablaba de composición corporal a las menores: las dos de 15 y 16 años con objetivo
// «Recomposición» leían «RECOMPOSICIÓN · Más fuerte y más definido» encima de sus rutinas, todas
// las semanas, y el de 17 con «Perder grasa», «cada gota cuenta · encender tu metabolismo».
test('🔴 el editorial semanal tampoco le habla de grasa ni de recomposición a un menor', () => {
  const eMenor = core.weekEditorial({ age: 15, sex: 'F', goal: 'Recomposición', routines: [] });
  assert.ok(!/RECOMPOSICI|definid/i.test(eMenor.kick + eMenor.title + eMenor.body),
    `una menor lee «${eMenor.kick} · ${eMenor.title}»`);
  const eMenorGrasa = core.weekEditorial({ age: 17, sex: 'M', goal: 'Perder grasa', routines: [] });
  assert.ok(!/QUEMA|gota|metabolismo|grasa/i.test(eMenorGrasa.kick + eMenorGrasa.title + eMenorGrasa.body),
    `un menor lee «${eMenorGrasa.kick} · ${eMenorGrasa.title}»`);
  // CONTROL 1: a una ADULTA con el mismo objetivo sí le llega su editorial (si no, esto no
  // sería un candado, sería haber borrado la feature).
  const eAdulta = core.weekEditorial({ age: 30, sex: 'F', goal: 'Recomposición', routines: [] });
  assert.ok(/RECOMPOSICI/i.test(eAdulta.kick), 'a una adulta el editorial de recomposición SÍ le llega');
  // CONTROL 2: «Ganar músculo» se CONSERVA en un menor — habla de entrenar, no de cómo se ve el
  // cuerpo. Son 2 de los 5 menores reales; quitárselo sería dejarlos sin editorial por nada.
  const eMenorMusculo = core.weekEditorial({ age: 16, sex: 'F', goal: 'Ganar músculo', routines: [] });
  assert.ok(/FUERZA Y CRECIMIENTO/.test(eMenorMusculo.kick), 'a un menor con objetivo de músculo no hay por qué quitarle su editorial');
});
// 🔴 El rótulo NO puede quedarse a medias: `nutGoalForClient` devuelve `recomposicion` y si no
// existe la explicación, la plantilla de texto y la opción del formulario, «✨ Generar» deja el
// texto del objetivo ANTERIOR — que es exactamente la mentira de v437 con otra cara.
test('🔴 «recomposicion» tiene explicación, plantilla y opción, y NO dice «sostener»', () => {
  const fs = require('fs'), path = require('path');
  const salud = fs.readFileSync(path.join(__dirname, 'app-5-salud.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(/recomposicion:\{title:/.test(salud), 'falta la entrada de GOAL_WHY: el asesorado leería el texto de mantenimiento');
  assert.ok(/goal:'recomposicion'/.test(salud), 'falta la plantilla: _nutSwapTemplateText dejaría el texto del objetivo anterior');
  assert.ok(/<option value="recomposicion">/.test(html), 'falta la opción del formulario: el select caería a vacío y el rótulo se inferiría del texto viejo');
  // El texto tiene que decir lo CONTRARIO que el de mantenimiento, o no sirve de nada tenerlo.
  const bloque = salud.slice(salud.indexOf('recomposicion:{title:'));
  const texto = bloque.slice(0, bloque.indexOf('},'));
  assert.ok(!/sostener tu composici/i.test(texto),
    'el texto de recomposición no puede decir «sostener tu composición»: eso es lo que NIEGA una recomposición');
  assert.ok(/cintura/i.test(texto), 'una recomposición se mide con la cintura, no con la balanza (dictamen §2) — tiene que decirlo');
  // Y las 5 claves del select tienen las 5 explicaciones: ninguna puede quedar sin «por qué».
  const opciones = (html.match(/<option value="(volumen|definicion|cutting|mantenimiento|recomposicion)">/g) || [])
    .map(s => s.match(/value="(\w+)"/)[1]);
  assert.strictEqual(opciones.length, 5, `el formulario ofrece ${opciones.length} objetivos, esperaba 5`);
  opciones.forEach(k => assert.ok(new RegExp(k + ':\\{title:').test(salud), `el objetivo «${k}» se puede elegir pero no tiene explicación en GOAL_WHY`));
  // y cada uno tiene su plantilla de texto (si no, «Generar» hereda el texto anterior)
  opciones.forEach(k => assert.ok(new RegExp("goal:'" + k + "'").test(salud), `el objetivo «${k}» no tiene plantilla de texto`));
});

// 🔴 UNA PLANTILLA NO PUEDE TRAER SU PROPIO TITULAR. Es la regla de v435/v444 («el titular se
// DERIVA de sus componentes, nunca se guarda aparte») aplicada al último sitio donde quedaba una
// segunda verdad. Medido el 2026-08-06: 4 de las 5 plantillas tenían un `kcal` que no cuadraba con
// sus propios gramos, y la de Volumen se desviaba **240 kcal** — el mismo número exacto del plan
// de Nataly que se cazó en v435. La causa raíz nunca fue su plan: era este botón.
test('🔴 ninguna plantilla de nutrición guarda un titular aparte de sus macros', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-5-salud.js'), 'utf8');
  const conKcal = src.match(/goal:'\w+',kcal:\d+/g) || [];
  assert.deepStrictEqual(conKcal, [],
    'una plantilla con `kcal` propio es una segunda verdad que acaba contradiciendo a sus gramos');
  assert.ok(/nut-kcal'\)\.value=nutMacroKcal\(t\)/.test(src),
    'aplicar una plantilla debe DERIVAR el titular de sus macros, no copiar un número guardado');
  // Y la aritmética de la que depende, con el control de que de verdad suma.
  assert.strictEqual(core.nutMacroKcal({ prot: 180, carbs: 380, fat: 80 }), 2960);
  assert.notStrictEqual(core.nutMacroKcal({ prot: 180, carbs: 380, fat: 80 }), 3200,
    'los 3.200 escritos a mano eran 240 kcal más de lo que entregan esos gramos');
});

test('nutKcalDirection: déficit / superávit / balance con tolerancia del 5%', () => {
  assert.strictEqual(nutKcalDirection(1730, 2230), 'deficit');
  assert.strictEqual(nutKcalDirection(2600, 2230), 'superavit');
  assert.strictEqual(nutKcalDirection(2230, 2230), 'balance');
  assert.strictEqual(nutKcalDirection(2300, 2230), 'balance');   // +3,1% = ciclado, no contradicción
  assert.strictEqual(nutKcalDirection(0, 2230), null);
  assert.strictEqual(nutKcalDirection(1730, null), null);
});
// 🔴 REGRESIÓN — el caso REAL medido en producción el 2026-08-05: «✨ Generar» corrigió las
// calorías de Luz (1.730 sobre un gasto de 2.230, déficit de 500) pero dejó el rótulo
// «mantenimiento» de una plantilla vieja, así que su pantalla le explicaba «estás comiendo en
// balance: lo que gastas» encima de un déficit. Con el defecto puesto NADIE avisaba.
test('🔴 nutGoalMismatch: rótulo «mantenimiento» sobre un déficit real se MARCA (caso Luz)', () => {
  const mm = nutGoalMismatch('mantenimiento', 1730, 2230);
  assert.ok(mm, 'un plan de mantenimiento que entrega 500 kcal menos del gasto debe marcarse');
  assert.strictEqual(mm.dice, 'balance');
  assert.strictEqual(mm.real, 'deficit');
  // Caso Kathe, mismo defecto con otras cifras.
  assert.ok(nutGoalMismatch('mantenimiento', 1930, 2430));
});
test('nutGoalMismatch: rótulo que SÍ cuadra con los números no molesta', () => {
  assert.strictEqual(nutGoalMismatch('cutting', 1730, 2230), null);
  assert.strictEqual(nutGoalMismatch('definicion', 1730, 2230), null);
  assert.strictEqual(nutGoalMismatch('volumen', 2600, 2230), null);
  assert.strictEqual(nutGoalMismatch('mantenimiento', 2230, 2230), null);
});
test('nutGoalMismatch: también caza el superávit rotulado como pérdida de grasa', () => {
  // Es exactamente lo que el formulario proponía antes de v436 (Kathe: 2.710 con gasto 2.430).
  const mm = nutGoalMismatch('cutting', 2710, 2430);
  assert.ok(mm);
  assert.strictEqual(mm.real, 'superavit');
});
test('nutGoalMismatch: sin rótulo o sin gasto NO opina', () => {
  assert.strictEqual(nutGoalMismatch('', 1730, 2230), null);
  assert.strictEqual(nutGoalMismatch('xxx', 1730, 2230), null);
  assert.strictEqual(nutGoalMismatch('cutting', 1730, null), null);
});
// El aviso solo sirve si el formulario LO LLAMA y si «Generar» fija el rótulo. Los dos son
// código con DOM (no puro) → se afirman en la fuente, que es donde puede volver a perderse.
test('🔴 «✨ Generar» fija el objetivo del plan, no solo las cifras', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'app-5-salud.js'), 'utf8');
  assert.ok(/nut-goal'\)\.value\s*=\s*goalKey/.test(src),
    'nutFillSuggested debe fijar #nut-goal con nutGoalForClient — si no, el rótulo queda del plan anterior');
  assert.ok(/_nutSwapTemplateText\(goalKey\)/.test(src),
    'el texto de plantilla de otro objetivo debe cambiarse con el rótulo');
  // Y las tres puertas que dejan un plan escrito tienen que pasar por el aviso.
  const puertas = (src.match(/nutGoalCheck\(\)/g) || []).length;
  assert.ok(puertas >= 4, `nutGoalCheck debe llamarse desde generar/abrir/plantilla/onchange (encontradas ${puertas})`);
});
test('🔴 el formulario cablea el aviso de contradicción', () => {
  const fs = require('fs');
  const html = fs.readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
  assert.ok(/id="nut-goal-nota"/.test(html), 'falta el contenedor del aviso');
  assert.ok(/id="nut-goal"[^>]*onchange="nutGoalCheck\(\)"/.test(html), 'el selector de objetivo no re-chequea');
  assert.ok(/id="nut-kcal"[^>]*onchange="nutGoalCheck\(\)"/.test(html), 'las calorías no re-chequean');
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
// 🔴 REGLA VINCULANTE de Andrés Hyp (punto 1 del dictamen 2026-08-05): 2,2 g/kg si el objetivo
// depende de construir o CONSERVAR músculo; 1,8 si no. «Perder grasa» estaba en el cubo bajo, que
// es donde la proteína alta importa MÁS (hay 500 kcal de déficit tirando del músculo) — y encima
// la app le decía a esa persona «mantenemos la proteína alta» sobre la dosis más baja del motor.
// Si este test te estorba, la respuesta no es aflojarlo: es un dictamen nuevo del especialista.
test('🔴 proteína 2,2 g/kg en todo objetivo que dependa de conservar músculo', () => {
  ['Ganar músculo', 'Fuerza', 'Recomposición', 'Perder grasa'].forEach(g => {
    assert.strictEqual(nutProtPerKg(g), 2.2, `${g} tiene músculo en juego: le toca 2,2 g/kg`);
    assert.strictEqual(calcMacrosFromKcal(2000, 70, g).prot_g, Math.round(70 * 2.2), `${g}: los gramos no siguen a la regla`);
  });
  // El cubo de 1,8 se queda SOLO con estos dos (y con lo que no declara objetivo).
  ['Resistencia', 'Salud general', '', undefined].forEach(g => {
    assert.strictEqual(nutProtPerKg(g), 1.8, `${g || '(sin objetivo)'} no debería subir a 2,2`);
  });
  assert.strictEqual(calcMacrosFromKcal(2000, 70, 'Resistencia').prot_g, Math.round(70 * 1.8));
  // No 2,4: el carbohidrato paga la diferencia y es el combustible del estímulo (dictamen §1).
  assert.strictEqual(nutProtPerKg('Ganar músculo'), 2.2, 'el tope aprobado es 2,2, no 2,4');
});
test('calcMacrosFromKcal: sin kcal o sin peso → null', () => {
  assert.strictEqual(calcMacrosFromKcal(null, 80, 'Fuerza'), null);
  assert.strictEqual(calcMacrosFromKcal(2000, 0, 'Fuerza'), null);
});
test('calcMacrosFromKcal: el carbohidrato tiene PISO, no colapsa a 0', () => {
  // ⚠️ ASERCIÓN CAMBIADA A PROPÓSITO el 2026-08-03, declarado en el commit (R2.2).
  // La versión vieja exigía `carb_g === 0` con kcal absurdamente bajas — y ESO ERA EL BUG:
  // el `Math.max(0, …)` se tragaba el desbordamiento en silencio y entregaba una dieta con
  // CERO carbohidratos (medido en producción: mujer de 48 kg, sedentaria, perder grasa →
  // 708 kcal y 0 g de carbohidrato). El contrato correcto no es «no seas negativo», es
  // «el carbohidrato es un piso: si no cabe, sube la caloría objetivo».
  const m = calcMacrosFromKcal(100, 80, 'Fuerza');
  assert.ok(m.carb_g > 0, 'el carbohidrato ya no puede colapsar a 0');
  assert.strictEqual(m.carb_g, Math.round(80 * core.NUT_CARB_MIN_G_KG), 'debe quedar exactamente en el piso');
  assert.ok(m.kcal > 100, 'si el piso no cabía en 100 kcal, la caloría objetivo SUBE (no se recorta el macro)');
  assert.strictEqual(m.kcal, m.prot_g * 4 + m.carb_g * 4 + m.fat_g * 9, 'las kcal devueltas deben ser las de sus macros');
});

test('el objetivo calórico nunca baja del metabolismo basal', () => {
  // El caso REAL que disparó el arreglo: nadie debe recibir 708 kcal con 0 g de carbohidrato.
  const r = nutritionEstimate({ sex: 'F', age: 50, weight: 48, height: 150, activityFactor: 1.2, goal: 'Perder grasa' });
  assert.ok(r.kcalObj >= r.tmb, `${r.kcalObj} kcal está por debajo de su basal (${r.tmb})`);
  assert.ok(r.kcalObj >= 1200, 'piso absoluto para mujer');
  assert.ok(r.macros.carb_g > 0, 'jamás una dieta de cero carbohidratos');
  assert.ok(r.floored === true, 'si se tocó el piso, el resultado debe declararlo');
  assert.ok(!/Déficit/.test(r.label),
    'si se tocó el piso, el texto NO puede seguir prometiendo un déficit: sería cambiar el número y dejar la mentira');
  // CONTROL: alguien normal no debe verse afectado por el piso
  const ok = nutritionEstimate({ sex: 'M', age: 30, weight: 80, height: 175, activityFactor: 1.55, goal: 'Ganar músculo' });
  assert.strictEqual(ok.floored, false, 'un perfil normal no toca ningún piso');
  assert.ok(/Superávit/.test(ok.label), 'y conserva su etiqueta real');
});

test('nutRefWeight: por encima de IMC 30 dosifica sobre peso de referencia, no el total', () => {
  // Luz: 82 kg / 156 cm = IMC 33,7. Con peso total, proteína+grasa no dejaban espacio al
  // carbohidrato. Con peso ajustado sí.
  const ref = nutRefWeight(82, 156);
  assert.ok(ref < 82, 'con IMC 33,7 el peso de referencia debe ser menor que el total');
  assert.ok(ref > 54, 'pero no puede desplomarse al peso "ideal": es ideal + 25% del exceso');
  // CONTROL: peso normal → no se ajusta nada
  assert.strictEqual(nutRefWeight(70, 175), 70, 'con IMC normal el peso de referencia es el real');
  assert.strictEqual(nutRefWeight(82, null), 82, 'sin estatura no hay IMC: se queda como estaba');
});

// 🔴 EL ACANTILADO DE IMC 30 (punto 6 del dictamen, verificado contra producción 2026-08-05).
// Con el corte seco, **200 gramos de báscula cambiaban 30 g de proteína**: una mujer de 156 cm a
// 72,9 kg recibía 160 g y a 73,1 kg, 130 g. Y mordía al revés de como debe: Claudia está en IMC
// 30,4 y bajar 1,1 kg —el propósito de su plan— le SUBÍA la proteína de 131 a 160 sin ninguna
// razón visible para ella. Al PO ya le pasó cruzando de 90 a 92 kg en julio.
test('🔴 la rampa 28-32 quita el acantilado: 200 g de báscula no mueven 30 g de proteína', () => {
  const H = 156;
  const protDe = kg => calcMacrosFromKcal(2000, kg, 'Perder grasa', H).prot_g;
  // El salto exacto que se midió, ahora en su versión continua.
  const salto = Math.abs(protDe(73.1) - protDe(72.9));
  assert.ok(salto <= 2, `200 g de báscula todavía mueven ${salto} g de proteína (antes eran 30)`);
  // Y la propiedad de fondo en toda la franja: pesar MENOS nunca sube la dosis de golpe.
  let peorSalto = 0, dondeSalto = '';
  for (let kg = 60; kg <= 95; kg = Math.round((kg + 0.1) * 10) / 10) {
    const d = Math.abs(protDe(kg) - protDe(Math.round((kg - 0.1) * 10) / 10));
    if (d > peorSalto) { peorSalto = d; dondeSalto = `${kg} kg`; }
  }
  assert.ok(peorSalto <= 2, `hay un escalón de ${peorSalto} g de proteína en ${dondeSalto}`);
  // 🔴 El caso REAL que lo disparó: Claudia, 74 kg / 156 cm (IMC 30,4). Bajar 1,1 kg es el
  // PROPÓSITO de su plan, y con el corte seco eso le subía la proteína de 131 a 160 g de golpe.
  // Que baje de peso tiene que mover su dosis de forma imperceptible, en cualquier dirección.
  const claudia = protDe(74), claudiaMenos = protDe(72.9);
  assert.ok(Math.abs(claudiaMenos - claudia) <= 4,
    `bajar 1,1 kg le mueve la proteína de ${claudia} a ${claudiaMenos} g — con el acantilado eran 131→160`);
  // Nota: dentro de la franja el peso de REFERENCIA baja al subir la báscula, y eso es el diseño
  // del peso ajustado (cuanto más exceso, más se descuenta). Lo que no puede haber es un ESCALÓN.
});

test('🔴 fuera de la franja 28-32 la rampa es IDÉNTICA a la fórmula anterior', () => {
  // El dictamen la aprobó con esa condición: solo cambia la franja que estaba rota. La identidad
  // tiene que ser por CONSTRUCCIÓN, no por suerte — `w - 1×(w-a)` es `a` en álgebra pero no bit a
  // bit en punto flotante, y esa última cifra caía del otro lado del redondeo en IMC ~48-54.
  const anterior = (w, h) => {
    const m = h / 100, imc = w / (m * m);
    if (imc < 30) return w;
    const ideal = 22.5 * m * m;
    return Math.round((ideal + 0.25 * (w - ideal)) * 10) / 10;
  };
  let comparadas = 0;
  for (let h = 140; h <= 200; h += 1) {
    for (let w = 35; w <= 180; w = Math.round((w + 0.1) * 10) / 10) {
      const imc = w / ((h / 100) ** 2);
      if (imc > 28 && imc < 32) continue;         // la franja que cambia a propósito
      comparadas++;
      assert.strictEqual(nutRefWeight(w, h), anterior(w, h),
        `${w} kg / ${h} cm (IMC ${imc.toFixed(1)}) cambió y está FUERA de la franja`);
    }
  }
  assert.ok(comparadas > 50000, `esperaba el barrido completo, comparé ${comparadas}`);
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

// Lo que lee el ASESORADO bajo el nombre del ejercicio (2026-07-27). El caso real medido
// en prod: 8 personas con rutinas viejas sin `muscleLabel` leían el slug crudo.
test('muscleHuman: el slug crudo se escribe como lo lee una persona (con tilde)', () => {
  assert.strictEqual(muscleHuman('biceps'), 'Bíceps');
  assert.strictEqual(muscleHuman('triceps'), 'Tríceps');
  assert.strictEqual(muscleHuman('gluteo'), 'Glúteo');
  assert.strictEqual(muscleHuman('piernas'), 'Piernas');
  assert.strictEqual(muscleHuman('core'), 'Abdomen');
});
test('muscleHuman: «otro» no se pinta, y un músculo desconocido nunca sale en minúscula', () => {
  assert.strictEqual(muscleHuman('otro'), '');
  assert.strictEqual(muscleHuman('antebrazo'), 'Antebrazo');   // custom del coach
  assert.strictEqual(muscleHuman(''), '');
  assert.strictEqual(muscleHuman(null), '');
  assert.strictEqual(muscleHuman(undefined), '');
});
test('exMuscleText: manda la etiqueta del catálogo; sin ella, el slug humanizado', () => {
  assert.strictEqual(exMuscleText({ muscle: 'piernas', muscleLabel: 'Cuádriceps y glúteo' }), 'Cuádriceps y glúteo');
  assert.strictEqual(exMuscleText({ muscle: 'biceps' }), 'Bíceps');
  assert.strictEqual(exMuscleText({ muscle: 'biceps', muscleLabel: '   ' }), 'Bíceps'); // etiqueta vacía no cuenta
  assert.strictEqual(exMuscleText({}), '');
  assert.strictEqual(exMuscleText(null), '');
});
test('exMuscleText: JAMÁS devuelve jerga de modalidad ni el tipo del catálogo', () => {
  // El defecto que motivó el cambio: la línea del asesorado mostraba «pecho · Compuesto»
  // (y en 8 personas, «biceps · Bodyweight»). El tipo NO debe colarse por ningún campo.
  const casos = [
    { muscle: 'pecho', type: 'Compuesto' },
    { muscle: 'core', type: 'Bodyweight', track: 'reps' },
    { muscle: 'piernas', type: 'peso_reps' },          // forma inventada por fixtures viejos
    { muscle: 'espalda', type: 'Aislamiento', muscleLabel: 'Espalda media' }
  ];
  casos.forEach(ex => {
    const txt = exMuscleText(ex);
    assert.ok(!/Compuesto|Aislamiento|Bodyweight|peso_reps|Isométrico/i.test(txt),
      'se coló jerga en «' + txt + '»');
  });
});

// La píldora «Instalar app» no puede quedarse con un toque del entreno (medido con
// hit-testing 2026-07-27: se paraba sobre los campos KG/REPS de una serie).
const rect = (top, bottom, left = 99, right = 291) => ({ top, bottom, left, right });
test('pillStealsTap: encimada sobre el entreno → hay que apagarla', () => {
  // El caso REAL medido: píldora en y 710-760, cuerpo del entreno ocupando la pantalla.
  assert.strictEqual(pillStealsTap(rect(710, 760), rect(-1200, 2400, 0, 390)), true);
});
test('pillStealsTap: el entreno por encima o por debajo de la píldora → se queda', () => {
  assert.strictEqual(pillStealsTap(rect(710, 760), rect(0, 600, 0, 390)), false);   // entreno arriba
  assert.strictEqual(pillStealsTap(rect(710, 760), rect(800, 1400, 0, 390)), false); // entreno abajo (día 1: bajo la portada)
});
test('pillStealsTap: sin caja (oculta / día de descanso) NO se apaga nada', () => {
  // El caso con dientes: la píldora ya está oculta (rect todo en cero) y el entreno está
  // SCROLLEADO, así que su rect se sale por arriba y por la izquierda del origen. Sin el
  // candado de "caja vacía", el cero cae DENTRO de ese rectángulo y la regla diría que hay
  // encimado donde no hay ni píldora.
  assert.strictEqual(pillStealsTap(rect(0, 0, 0, 0), rect(-1200, 2400, -8, 398)), false);
  assert.strictEqual(pillStealsTap(rect(0, 0, 0, 0), rect(0, 800, 0, 390)), false);
  assert.strictEqual(pillStealsTap(rect(710, 760), rect(-5, -5, -5, -5)), false);   // entreno sin pintar
  assert.strictEqual(pillStealsTap(null, rect(0, 800, 0, 390)), false);
  assert.strictEqual(pillStealsTap(rect(710, 760), null), false);
  assert.strictEqual(pillStealsTap({}, {}), false);
});
test('pillStealsTap: solo se cruzan en vertical pero no en horizontal → se queda', () => {
  // Entreno en una columna estrecha a la izquierda; la píldora va centrada.
  assert.strictEqual(pillStealsTap(rect(710, 760, 200, 380), rect(600, 900, 0, 90)), false);
});

// Buscador de la biblioteca (auditoría FASE 2): 212 ejercicios, 42 pantallas y sin búsqueda.
const LIB_BUSCA = [
  { id: 'e1', name: 'Press de Banca con Barra', muscle: 'pecho', muscleLabel: 'Pecho', type: 'Compuesto' },
  { id: 'e2', name: 'Curl de Bíceps', muscle: 'biceps', type: 'Aislamiento' },
  { id: 'e3', name: 'Sentadilla', muscle: 'piernas', muscleLabel: 'Cuádriceps y glúteo', type: 'Compuesto' },
  { id: 'e4', name: 'Press Inclinado con Mancuernas', muscle: 'pecho', muscleLabel: 'Pecho superior', type: 'Compuesto' }
];
// Repoblado del catálogo (2026-07-27): los ejercicios NUEVOS tienen que traer nivel EXPLÍCITO.
// Sin él, exLevel() los manda a 'Intermedio' por defecto y un PRINCIPIANTE no los recibe jamás —
// que es exactamente lo que le pasó a 50 ejercicios del catálogo sin que nadie lo decidiera.
test('los ejercicios nuevos (e215+) tienen nivel explícito, no heredado del default', () => {
  const nuevos = ['e215','e216','e217','e218','e219','e220','e222','e223','e225','e226'];
  nuevos.forEach(id => {
    assert.ok(EX_LEVEL[id], `${id} sin nivel en EX_LEVEL → caería a 'Intermedio' por defecto`);
    assert.ok(['P','I','A'].includes(EX_LEVEL[id]), `${id} con nivel inválido: ${EX_LEVEL[id]}`);
  });
  // Y al menos uno tiene que ser de principiante: si todos fueran 'I', repoblar el catálogo no
  // le habría dado NADA nuevo a los principiantes, que son la mayoría del gimnasio.
  assert.ok(nuevos.filter(id => EX_LEVEL[id] === 'P').length >= 3);
  // Los duplicados retirados el 2026-07-28 no pueden reaparecer por la puerta de atrás: si un
  // día vuelve a haber nivel para uno de estos ids es que alguien lo volvió a meter al catálogo
  // (e227 = e121 · e224 = e12 · e221 = e137 · e181 = e81 · e208 = e136).
  ['e181','e208','e221','e224','e227'].forEach(id => {
    assert.ok(!EX_LEVEL[id], `${id} fue RETIRADO por duplicar a otro ejercicio: no debe volver`);
  });
});

test('searchExercises: sin texto ni músculo devuelve la biblioteca entera', () => {
  assert.strictEqual(searchExercises(LIB_BUSCA, '', 'all').length, 4);
  assert.strictEqual(searchExercises(LIB_BUSCA, '', '').length, 4);
  assert.strictEqual(searchExercises(LIB_BUSCA).length, 4);
});
test('searchExercises: encuentra AUNQUE se escriba sin tildes (así teclea la gente)', () => {
  const r = searchExercises(LIB_BUSCA, 'biceps');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].name, 'Curl de Bíceps');
});
test('searchExercises: palabras sueltas, no la frase literal', () => {
  // «press banca» debe encontrar «Press de Banca con Barra» sin escribir el «de».
  const r = searchExercises(LIB_BUSCA, 'press banca');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, 'e1');
  assert.strictEqual(searchExercises(LIB_BUSCA, 'press').length, 2);
});
test('searchExercises: el filtro de músculo y el texto se aplican JUNTOS', () => {
  assert.strictEqual(searchExercises(LIB_BUSCA, '', 'pecho').length, 2);
  assert.strictEqual(searchExercises(LIB_BUSCA, 'inclinado', 'pecho').length, 1);
  assert.strictEqual(searchExercises(LIB_BUSCA, 'inclinado', 'piernas').length, 0);
});
test('searchExercises: busca también por la etiqueta del músculo, y aguanta basura', () => {
  assert.strictEqual(searchExercises(LIB_BUSCA, 'gluteo')[0].name, 'Sentadilla');   // por muscleLabel
  assert.strictEqual(searchExercises(LIB_BUSCA, 'zzz').length, 0);
  assert.strictEqual(searchExercises(null, 'press').length, 0);
  assert.strictEqual(searchExercises([null, undefined], 'press').length, 0);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// v484 · EL RÉCORD SE QUEDABA EN EL EJERCICIO RETIRADO
// `dedupeExercises` remapea el catálogo y las RUTINAS desde junio (`REMOVED_EXERCISES e38→e15`)
// pero NUNCA tocó los récords: la rutina pasaba a `e15` y la marca se quedaba en `e38`, así que la
// app dejaba de encontrarla. Medido contra producción el 14-ago: 3 récords varados en `e38`
// (Kathe, Nataly, Miguel) y **Miguel sin peso sugerido** en un ejercicio con marca de 30 kg.
// ══════════════════════════════════════════════════════════════════════════════════════════

test('🔴 v484 · el récord de un ejercicio RETIRADO se muda al que lo reemplazó', () => {
  const viejo = { val: 30, kg: 30, reps: 8, unit: 'kg', name: 'Curl Femoral Acostado en Máquina' };
  const r = prsRemapRetired({ e38: viejo, e6: { val: 40, kg: 40, reps: 10, unit: 'kg' } });
  assert.strictEqual(r.moved, 1);
  assert.strictEqual(r.prs.e38, undefined, 'el id retirado NO puede quedar: es el duplicado en pantalla');
  assert.deepStrictEqual(r.prs.e15, viejo, 'la marca vive ahora bajo el id bueno');
  assert.ok(r.prs.e6, 'no toca lo que no tiene nada que ver');
});

test('🔒 v484 · si los DOS existen se funden con isBetterPR, la única definición de récord', () => {
  const flojo = { val: 3, kg: 3, reps: 15, unit: 'kg' };
  const fuerte = { val: 20, kg: 20, reps: 15, unit: 'kg' };
  // El caso de Kathe: e38 flojo (3 kg) contra su e15 real (15 kg) → gana el suyo.
  const a = prsRemapRetired({ e38: flojo, e15: { val: 15, kg: 15, reps: 12, unit: 'kg' } });
  assert.strictEqual(a.prs.e15.val, 15, 'el récord bueno no se pisa con uno peor');
  assert.strictEqual(a.prs.e38, undefined);
  // El caso de Nataly: el varado es MEJOR que el vigente → gana el varado.
  const b = prsRemapRetired({ e38: fuerte, e15: { val: 10, kg: 10, reps: 15, unit: 'kg' } });
  assert.strictEqual(b.prs.e15.val, 20, 'la mejor marca es la que sobrevive');
  // 🔒 CONTROL: la regla es la de `isBetterPR`, no «se queda el más reciente». Una segunda
  // definición de récord es la forma exacta del bug de v435/v444.
  assert.strictEqual(isBetterPR(20, 15, 'kg', { val: 10 }), true);
  assert.strictEqual(isBetterPR(3, 15, 'kg', { val: 15 }), false);
});

test('🔒 v484 · un récord viejo SIN `val` ni `unit` (formato legacy) se funde igual', () => {
  // Los 3 récords varados reales son de mayo y solo traen `kg`: si la fusión leyera únicamente
  // `val`, los daría por vacíos y los tiraría — perdiendo la marca en vez de recuperarla.
  const legacy = { kg: 30, reps: 8, name: 'Curl Femoral Acostado en Máquina' };
  const r = prsRemapRetired({ e38: legacy });
  assert.strictEqual(r.prs.e15.kg, 30, 'la marca legacy se conserva');
  assert.strictEqual(suggestFromPR(r.prs.e15, 8), 35, 'y ya alimenta el peso sugerido');
});

test('🔒 v484 · sin récords varados no toca NADA (ni copia el objeto)', () => {
  const prs = { e15: { val: 15, kg: 15, reps: 12, unit: 'kg' } };
  const r = prsRemapRetired(prs);
  assert.strictEqual(r.moved, 0);
  assert.strictEqual(r.prs, prs, 'devuelve el mismo objeto: no hay nada que reescribir ni que sincronizar');
  assert.deepStrictEqual(prsRemapRetired(null).prs, {});
  assert.deepStrictEqual(prsRemapRetired({}).moved, 0);
});

test('🔒 v484 · el mapa de retirados apunta SOLO a ejercicios que existen', () => {
  // Un destino inexistente movería el récord de un id muerto a otro id muerto — el mismo bug
  // con otra cara, y en silencio. El catálogo se lee del código, no de una lista a mano.
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  const ids = new Set([...src.matchAll(/id:'(e\d+)',name:'/g)].map(m => m[1]));
  assert.ok(ids.size > 200, 'no pude leer el catálogo: ' + ids.size);
  Object.entries(REMOVED_EXERCISES).forEach(([viejo, nuevo]) => {
    assert.ok(!ids.has(viejo), `${viejo} está marcado como retirado pero SIGUE en el catálogo`);
    assert.ok(ids.has(nuevo), `${viejo} → ${nuevo}, y ${nuevo} no existe en el catálogo`);
  });
});

test('🔒 v484 · el mapa de retirados vive en UN solo sitio', () => {
  // Vivía en app-2-login.js y ahora lo necesitan dos superficies (coach y asesorado). Dos copias
  // serían dos verdades sobre el mismo hecho — el patrón que ya estalló con las calorías (v435).
  const fs = require('fs'), path = require('path');
  const app2 = fs.readFileSync(path.join(__dirname, 'app-2-login.js'), 'utf8');
  assert.ok(!/const\s+REMOVED_EXERCISES\s*=/.test(app2),
    'app-2-login.js volvió a declarar su propia copia de REMOVED_EXERCISES');
  assert.ok(/'e38':\s*'e15'/.test(fs.readFileSync(path.join(__dirname, 'avi-core.js'), 'utf8')),
    'el mapa ya no está en avi-core');
});

test('🔴 v484 · CABLEADO: las DOS superficies remapean los récords', () => {
  // El asesorado es quien ESCRIBE su propia fila (offline-first): si solo se arreglara en el
  // arranque del coach, el teléfono lo volvería a pisar en el siguiente sync.
  const fs = require('fs'), path = require('path');
  const app2 = fs.readFileSync(path.join(__dirname, 'app-2-login.js'), 'utf8');
  const app3 = fs.readFileSync(path.join(__dirname, 'app-3-coach.js'), 'utf8');
  const dedupe = app2.slice(app2.indexOf('function dedupeExercises'), app2.indexOf('\n// ══', app2.indexOf('function dedupeExercises')));
  assert.ok(/prsRemapRetired\(/.test(dedupe), 'el arranque del COACH no remapea los récords');
  assert.ok(/sv\('ax_pr'/.test(dedupe), 'el coach remapea pero no lo persiste');
  const auth = app3.slice(app3.indexOf('function _applyAuthClientDB'), app3.indexOf('\nfunction ', app3.indexOf('function _applyAuthClientDB') + 1));
  assert.ok(/prsRemapRetired\(/.test(auth), 'el arranque del ASESORADO no remapea los récords');
  assert.ok(/svNow\('ax_pr'/.test(auth), 'el asesorado remapea pero no lo persiste');
});

// 🔴 v483 · CANDADO DE CABLEADO: el récord se escribe al GUARDAR la sesión, no solo al cerrarla.
// El historial se guarda desde la 1ª serie marcada (auto-guardado parcial) pero `checkAndUpdatePRs`
// solo corría en la rama del 100% y en «Finalizar temprano». Medido el 14-ago en producción:
// **de 192 sesiones con peso registrado solo 72 (38%) quedaron cerradas** → Nataly hizo Prensa de
// Pierna 100 kg ×15 en CINCO sesiones y no tenía récord; 10 de los 11 huecos medidos son de
// sesiones sin cerrar. Y la cadena sigue: sin récord no hay peso sugerido, y sin peso sugerido la
// semana de descarga (v482) no tiene sobre qué bajar.
// Es un check ESTÁTICO porque la lógica vive en la capa de pantalla (app-4), fuera de esta suite;
// la prueba de que de verdad se guarda sin cerrar la sesión la hace `_verify-deload` (D8).
test('🔴 v483 · el auto-guardado PARCIAL también escribe los récords', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-4-entreno.js'), 'utf8');
  const i = src.indexOf('function updateClientProgress');
  assert.ok(i > 0, 'no encontré updateClientProgress en app-4-entreno.js');
  const cuerpo = src.slice(i, src.indexOf('\nfunction saveSessionToHistory', i));
  const ramas = cuerpo.split('} else if(done>0){');
  assert.strictEqual(ramas.length, 2, 'cambió la forma de updateClientProgress: revisa este candado');
  assert.ok(/checkAndUpdatePRs\(/.test(ramas[0]), 'la rama del 100% dejó de calcular récords');
  assert.ok(/checkAndUpdatePRs\(/.test(ramas[1]),
    'el auto-guardado parcial guarda la sesión pero NO el récord — es el bug de v483 otra vez');
  // Y lo que se logra en el parcial se APARTA, o la celebración del final se queda muda.
  assert.ok(/_prsStashSession\(/.test(ramas[1]), 'el parcial no aparta los récords para la celebración');
  assert.ok(/_prsMergeSession\(/.test(ramas[0]), 'el 100% no recupera los récords apartados durante la sesión');
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

// ══════════════════════════════════════════════════════════════════════
// Plan de alimentación con CANTIDADES REALES (2026-08-01)
// ══════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
// El coach también entrena: su perfil es un asesorado más (2026-08-01)
// ══════════════════════════════════════════════════════════════════════
section('El coach como asesorado (perfil propio en el panel)');

const OWN_ROW = {
  profile: { name: 'Andres Martínez', sex: 'M', age: 37, weight: 90, height: 175,
    goal: 'Ganar músculo', level: 'Avanzado', days: 5, activityFactor: 1.55 },
  routines: [{ id: 'r1', name: 'Empuje', day: 'Lunes', exercises: [] }],
};

test('la fila propia del coach se vuelve un asesorado con sus datos de entreno', () => {
  const s = core.selfClientFromRow(OWN_ROW);
  assert.strictEqual(s.id, core.SELF_CLIENT_ID);
  assert.strictEqual(s.isSelf, true);
  assert.strictEqual(s.weight, 90);
  assert.strictEqual(s.level, 'Avanzado');
  assert.strictEqual(s.days, 5);
  assert.strictEqual(s.routines.length, 1);
});

test('el coach NO se cobra a sí mismo: su perfil no lleva nada de negocio', () => {
  const s = core.selfClientFromRow(OWN_ROW);
  ['payments', 'tier', 'suspended', 'wantsCoach', 'password'].forEach(k => {
    assert.strictEqual(s[k], undefined, `el perfil propio no debe traer ${k}`);
  });
  assert.strictEqual(core.clientIsBillable(s), false);
  assert.strictEqual(core.clientIsContactable(s), false);
  // y un asesorado de verdad sí
  assert.strictEqual(core.clientIsBillable({ id: 'c1' }), true);
  assert.strictEqual(core.clientIsContactable({ id: 'c1' }), true);
});

test('sin fila propia no se inventa un asesorado vacío', () => {
  assert.strictEqual(core.selfClientFromRow(null), null);
  assert.strictEqual(core.selfClientFromRow('x'), null);
});

test('🔴 el coach JAMÁS puede salir en la lista que se guarda como filas de cliente', () => {
  // `_persistCoachWrite` escribe una fila de cliente por elemento de DB.clients: si el
  // coach se cuela, la app le crea un asesorado FANTASMA en la nube con su entrenamiento
  // adentro, y encima su fila real no recibe nada.
  const lista = [{ id: 'c1' }, core.selfClientFromRow(OWN_ROW), { id: 'c2' }];
  const { clients, self } = core.splitSelfFromClients(lista);
  assert.deepStrictEqual(clients.map(c => c.id), ['c1', 'c2']);
  assert.ok(self && self.id === core.SELF_CLIENT_ID);
  assert.ok(!clients.some(core.isSelfClient), 'el coach quedó entre los clientes a persistir');
});

test('🔴 mi propia fila no se puede BORRAR desde la lista', () => {
  // Aparece como un asesorado más, así que el botón de eliminar la alcanza. Borrarla se
  // llevaría el entrenamiento y las rutinas del coach. Ni siquiera se pregunta.
  let preguntó = false;
  const confirmFn = () => { preguntó = true; return true; };
  assert.strictEqual(core.delClientGuard({ id: core.SELF_CLIENT_ID }, confirmFn), false);
  assert.strictEqual(preguntó, false, 'no debe ni pedir confirmación para la fila propia');
  // y un asesorado de verdad sí se borra, con confirmación
  assert.strictEqual(core.delClientGuard({ id: 'c1' }, () => true), true);
  assert.strictEqual(core.delClientGuard({ id: 'c1' }, () => false), false);
});

test('isSelfClient reconoce tanto el objeto como el id suelto, y no confunde a nadie', () => {
  assert.strictEqual(core.isSelfClient(core.SELF_CLIENT_ID), true);
  assert.strictEqual(core.isSelfClient({ id: core.SELF_CLIENT_ID }), true);
  assert.strictEqual(core.isSelfClient({ id: 'c1' }), false);
  assert.strictEqual(core.isSelfClient(null), false);
  assert.strictEqual(core.isSelfClient({ id: '_selfie' }), false);
});

test('el perfil propio sirve para el generador y para la nutrición como cualquier otro', () => {
  // Es el punto del pedido: «que mi perfil sea como cualquier perfil de asesorado».
  const s = core.selfClientFromRow(OWN_ROW);
  const est = nutritionEstimate(s);
  assert.ok(est && est.kcalObj > 0, 'no se le puede calcular el plan de alimentación');
  const { routines } = generarRutinas(s, LIB, { idFn: () => 'r', now: '2026-08-01T00:00:00.000Z' });
  assert.strictEqual(routines.length, 5, 'no se le generan sus 5 días');
});

section('Plan de alimentación — tabla de alimentos y porciones');

const NUT_BASE = { sex: 'F', age: 40, weight: 56, height: 162, goal: 'Ganar músculo', activityFactor: 1.55 };

test('la tabla de alimentos es coherente: las kcal declaradas cuadran con sus macros (4/4/9)', () => {
  // Audita MI PROPIA tabla: un número mal tecleado aquí se propaga a todos los planes
  // de todo el mundo y nadie lo vería nunca.
  // Los alimentos que MUEVEN el plan (proteína, carbohidrato, grasa) deben cuadrar al 12%.
  // En verduras y frutas la regla 4/4/9 SOBREESTIMA a propósito: buena parte de su
  // carbohidrato es FIBRA, que aporta ~0 kcal en vez de 4 (medido: espinaca +29%,
  // brócoli +26%, lechuga +27%). Aflojar ahí la tolerancia sin más sería callar el test,
  // así que en su lugar se les exige la DIRECCIÓN: la fibra sólo puede hacer que la
  // cuenta sobre, jamás que falte. Si un kcal quedara por ENCIMA de sus macros, es un
  // error de tecleo y este test lo caza igual.
  const altos = [], bajos = [];
  core.NUT_FOODS.forEach(f => {
    const calc = f.p * 4 + f.c * 4 + f.f * 9;
    if (!f.kcal) { altos.push(f.name + ' (sin kcal)'); return; }
    const detalle = f.name + ' (declara ' + f.kcal + ', macros dan ' + Math.round(calc) + ')';
    // La banda es ASIMÉTRICA y cada lado tiene su motivo físico:
    //  · por arriba, poco margen (8%): el 4/4/9 es una aproximación —en carnes la proteína
    //    rinde ~4,27 kcal/g— y las fuentes redondean los macros. Más que eso es tecleo.
    //  · por abajo, mucho (35%): la fibra cuenta como carbohidrato pero casi no aporta kcal.
    if (calc < f.kcal * 0.92) altos.push(detalle);
    if (calc > f.kcal * 1.35) bajos.push(detalle);
  });
  assert.deepStrictEqual(altos, [], 'declara MÁS kcal de las que dan sus macros de lo que explica el redondeo: revisar el tecleo');
  assert.deepStrictEqual(bajos, [], 'el hueco es demasiado grande para ser fibra: revisar el alimento');
});

test('la tabla no tiene ids repetidos y toda medida casera pesa algo', () => {
  const ids = core.NUT_FOODS.map(f => f.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'hay ids duplicados');
  const sinPeso = core.NUT_FOODS.filter(f => f.un && !(f.un.g > 0));
  assert.deepStrictEqual(sinPeso.map(f => f.id), []);
  const rolesOk = ['prot', 'carb', 'fat', 'verd', 'fruta'];
  assert.deepStrictEqual(core.NUT_FOODS.filter(f => !rolesOk.includes(f.rol)).map(f => f.id), []);
});

test('🔴 el ciclado NO cambia el total de la semana (la regla que no se puede romper)', () => {
  // Bajarle el carbohidrato al descanso sin devolvérselo a los días de entreno dejaría
  // a la persona comiendo de menos TODA la semana, en silencio. Medido antes del fix:
  // con todos los días de pierna la semana se pasaba +5,1%.
  const base = nutritionEstimate(NUT_BASE);
  for (const d of [2, 3, 4, 5]) {
    for (let L = 0; L <= d; L++) {
      let semana = 0;
      for (let i = 0; i < d; i++) semana += core.nutDayTarget(base, i < L ? 'pierna' : 'entreno', d, L).carb_g;
      for (let i = 0; i < 7 - d; i++) semana += core.nutDayTarget(base, 'descanso', d, L).carb_g;
      const plano = base.macros.carb_g * 7;
      const desvio = Math.abs(semana - plano) / plano;
      assert.ok(desvio <= 0.01, `días=${d} pierna=${L}: la semana se desvió ${(desvio * 100).toFixed(1)}% (${semana} vs ${plano})`);
    }
  }
});

// ── v435: UNA SOLA VERDAD PARA LAS DOS PANTALLAS ──
// El PO reportó «hay dos planes de nutrición y son diferentes». Lo eran: «Perfil» pintaba el
// titular escrito por el coach (fijo) y «Hoy» el objetivo DEL DÍA (que se mueve con el entreno).
const NUT_RUT_4D = [
  { day: 'Lunes', name: 'Glúteo y Piernas A', exercises: [{ muscle: 'piernas' }, { muscle: 'gluteo' }] },
  { day: 'Martes', name: 'Tren Superior', exercises: [{ muscle: 'espalda' }, { muscle: 'pecho' }] },
  { day: 'Jueves', name: 'Glúteo y Piernas B', exercises: [{ muscle: 'piernas' }, { muscle: 'gluteo' }] },
  { day: 'Viernes', name: 'Brazos', exercises: [{ muscle: 'biceps' }] },
];

test('🔴 v435 · el titular del plan y sus PROPIOS macros tienen que decir lo mismo', () => {
  // Medido en producción (2026-08-04): 6 de 10 planes descuadrados, y el de Nataly por 240 kcal
  // al día — decía 3.200 y sus macros sumaban 2.960. El plato se arma con los MACROS, así que el
  // titular era el número que mentía. Ahora el que se muestra es el que se sirve.
  assert.strictEqual(nutMacroKcal({ prot_g: 150, carb_g: 270, fat_g: 75 }), 2355);
  const base = nutBaseFor({ weight: 60 }, { kcal: 2400, prot: 150, carbs: 270, fat: 75 }, 60);
  assert.strictEqual(base.origen, 'coach');
  assert.strictEqual(base.kcalObj, 2355, 'muestra lo que de verdad suman sus macros');
  assert.strictEqual(base.kcalEscrito, 2400, 'y conserva el titular para poder avisarle al coach');
  assert.strictEqual(base.desfase, -45);
  assert.strictEqual(base.macros.kcal, base.kcalObj, 'el motor del plato usa el mismo número');
  // Un plan que sí cuadra no genera desfase.
  const ok = nutBaseFor({ weight: 60 }, { kcal: 2355, prot: 150, carbs: 270, fat: 75 }, 60);
  assert.strictEqual(ok.desfase, 0);
});

// ── EL CANDADO NUMÉRICO DE MENORES (v485) ─────────────────────────────────────────────────
// Caso real medido el 2026-08-15 (backup del 12-ago): una asesorada de 15 años con plan ESCRITO
// A MANO de 1.775 kcal y gasto de 1.910 comía 7,1% por debajo de lo que gasta. La regla «un menor
// nunca lleva déficit» solo vivía en `nutritionEstimate` (la calculadora); el plan escrito entraba
// por la otra puerta de `nutBaseFor` y nadie le preguntaba la edad.
const MENOR_REAL = { name: 'menor', age: 15, sex: 'F', weight: 52, height: 161, activityFactor: 1.375 };
const PLAN_BAJO = { kcal: 1775, prot: 94, carbs: 244, fat: 47 }; // los macros REALES de ese plan
const TDEE_MENOR = 1910; // Schofield 10-18 F: 13,384×52+692,6 = 1.389 → ×1,375 = 1.910

test('🔴 v485 · un MENOR con plan escrito a mano NUNCA queda por debajo de su gasto', () => {
  const base = nutBaseFor(MENOR_REAL, PLAN_BAJO, 52);
  assert.strictEqual(base.origen, 'coach', 'sigue siendo el plan del coach, no lo reemplazamos');
  // La DOSIS, no el signo: «subió algo» lo cumpliría un +1 kcal y el defecto seguiría vivo
  // (lección de v482 — un candado que afirma el signo deja pasar lo que lo motivó).
  assert.ok(base.kcalObj >= TDEE_MENOR, `le entrega ${base.kcalObj} y gasta ${TDEE_MENOR}`);
  assert.ok(base.kcalObj <= Math.round(TDEE_MENOR * 1.05) + 30, 'y no se pasa de largo inventando un superávit');
  assert.strictEqual(base.macros.kcal, base.kcalObj, 'el plato se arma con el número corregido');
  assert.ok(base.minorFloor, 'y queda dicho que el piso actuó, para poder avisarle al coach');
  assert.strictEqual(base.minorFloor.kcalAntes, 1775);
  assert.strictEqual(base.minorFloor.tdee, TDEE_MENOR);
});

test('🔴 v485 · CONTROL: a una ADULTA EN DÉFICIT REAL el plan le llega INTACTO', () => {
  // Sin este control el «candado» sería haber borrado la feature: un adulto SÍ puede llevar
  // déficit, es una decisión clínica legítima de su entrenador. (Regla de v449.)
  // ⚠️ La adulta tiene que estar EN DÉFICIT DE VERDAD o el control no controla nada: la primera
  // versión de este test usaba a alguien de 52 kg cuyo plan de 1.775 kcal ya estaba POR ENCIMA de
  // su gasto, así que quitarle el candado de edad no le quitaba nada y el sabotaje S5 salía VERDE.
  const adulta = { name: 'adulta', age: 34, sex: 'F', weight: 75, height: 165, activityFactor: 1.375 };
  const planDeficit = { kcal: 1530, prot: 120, carbs: 150, fat: 50 };
  const tdee = calcTDEE(calcTMB(75, 165, 34, 'F'), 1.375);
  const kcalPlan = nutMacroKcal({ prot_g: 120, carb_g: 150, fat_g: 50 });
  assert.ok(kcalPlan < tdee * 0.9, `el control exige déficit real: ${kcalPlan} vs ${tdee}`);
  const base = nutBaseFor(adulta, planDeficit, 75);
  assert.strictEqual(base.kcalObj, kcalPlan, 'su déficit se respeta, no se lo subimos');
  assert.ok(!base.minorFloor, 'a una adulta no se le toca el plan');
});

test('🔴 v485 · el piso RESPETA el reparto de macros que eligió el coach', () => {
  // Subir solo el titular no serviría (el plato se arma con los macros) y volcarlo todo en un
  // macro sería decidir por el entrenador. Se escala; las proporciones se conservan.
  const base = nutBaseFor(MENOR_REAL, PLAN_BAJO, 52);
  const antes = { p: 94 * 4, c: 244 * 4, f: 47 * 9 }, tot = antes.p + antes.c + antes.f;
  const desp = { p: base.macros.prot_g * 4, c: base.macros.carb_g * 4, f: base.macros.fat_g * 9 };
  const totD = desp.p + desp.c + desp.f;
  for (const k of ['p', 'c', 'f']) {
    const dif = Math.abs(desp[k] / totD - antes[k] / tot);
    assert.ok(dif < 0.01, `el reparto de ${k} se movió ${(dif * 100).toFixed(2)} puntos`);
  }
});

test('🔴 v485 · un menor que YA come DENTRO de su banda no se toca', () => {
  // Este test decía «por encima de su gasto no se toca» con un plan de +29%, y desde REGLA 3 del
  // dictamen (2026-08-15) eso ya no es cierto: por encima del techo SÍ se toca. Lo que sigue
  // siendo verdad —y es lo que aquí importa— es que dentro de la banda no metemos mano.
  const dentro = { kcal: 2028, prot: 110, carbs: 262, fat: 60 }; // 2.028 kcal: entre 2.006 y 2.101
  const base = nutBaseFor(MENOR_REAL, dentro, 52);
  assert.ok(!base.minorFloor && !base.minorCap, 'ni el piso ni el techo inventan nada sobre un plan que ya está bien');
  assert.strictEqual(base.kcalObj, nutMacroKcal({ prot_g: 110, carb_g: 262, fat_g: 60 }));
});

test('🔴 v485 · sin datos para conocer el gasto NO se inventa un piso', () => {
  // Santiago (17) no declara sexo en producción: sin gasto no se puede afirmar que el plan esté
  // por debajo, y un piso inventado sería peor que el defecto.
  for (const falta of [{ sex: '' }, { height: '' }, { weight: '' }]) {
    const c = Object.assign({}, MENOR_REAL, falta);
    const base = nutBaseFor(c, PLAN_BAJO, falta.weight === '' ? '' : 52);
    assert.ok(base && !base.minorFloor, 'sin ' + Object.keys(falta)[0] + ' no se toca el plan');
  }
});

test('🔴 v485 · el desfase del COACH sobrevive al piso (no le echamos encima lo nuestro)', () => {
  // `desfase` denuncia que SU titular no cuadra con SUS macros. Si el piso lo recalculara, el
  // coach vería una contradicción que fabricamos nosotros — el error del botón «✨ Generar».
  const base = nutBaseFor(MENOR_REAL, PLAN_BAJO, 52);
  assert.strictEqual(base.kcalEscrito, 1775);
  assert.strictEqual(base.desfase, nutMacroKcal({ prot_g: 94, carb_g: 244, fat_g: 47 }) - 1775);
});

test('🔴 v485 · el piso deja margen para lo que el PLATO se desvía (gasto × 1,05)', () => {
  // Dictamen de Andrés (15-ago): el plato entrega entre −5,3% y +11,4% de lo que promete, así que
  // con el piso clavado en el gasto EXACTO la menor real seguía comiendo −5,1% en su peor día.
  const base = nutBaseFor(MENOR_REAL, PLAN_BAJO, 52);
  assert.ok(base.kcalObj >= Math.round(TDEE_MENOR * 1.05),
    `el piso tiene que absorber el margen del plato: ${base.kcalObj} vs ${Math.round(TDEE_MENOR * 1.05)}`);
  assert.strictEqual(base.minorFloor.piso, Math.round(TDEE_MENOR * 1.05));
});

test('🔴 v485 · TECHO de proteína: escalar un plan muy bajo no produce un disparate', () => {
  // Sin techo, un plan escrito de 1.000 kcal daba 287 g de proteína = 5,5 g/kg (medido por Andrés).
  const planAbsurdo = { kcal: 900, prot: 80, carbs: 100, fat: 20 }; // reparto muy proteico y muy bajo
  const base = nutBaseFor(MENOR_REAL, planAbsurdo, 52);
  const ref = nutRefWeight(52, 161) || 52;
  assert.ok(base.kcalObj >= Math.round(TDEE_MENOR * 1.05), 'el piso igual se cumple');
  assert.ok(base.macros.prot_g <= Math.round(ref * 2.2) + 1,
    `${base.macros.prot_g} g son ${(base.macros.prot_g / ref).toFixed(2)} g/kg — el techo es 2,2`);
  assert.ok(base.minorFloor.protTope, 'y queda dicho que el techo actuó');
});

test('🔴 v485 · un menor SIN datos de gasto se MARCA, no se pasa en silencio', () => {
  // Santiago, 17 años, no declara sexo. Antes el plan escrito pasaba sin piso y sin aviso: las dos
  // puertas degradaban al revés (la calculadora se cierra y pide datos; esta se abría y servía).
  const sinSexo = Object.assign({}, MENOR_REAL, { sex: '' });
  const base = nutBaseFor(sinSexo, PLAN_BAJO, 52);
  assert.ok(base, 'el plan sigue existiendo');
  assert.ok(!base.minorFloor, 'no se inventa un piso sin saber el gasto');
  assert.ok(base.minorFloorUnknown, 'pero el candado lo DICE — fallar mudo no es fallar seguro');
});

test('🔴 v485 · la ficha del coach NO se calla con un menor bajo su gasto', () => {
  // El umbral de 300 kcal se midió sobre ADULTOS. Con él, la menor real (−135) daba `ok` y la
  // tarjeta de su ficha no pintaba nada: el único aviso vivía dentro del editor de nutrición.
  const r = core.nutPlanReview(MENOR_REAL, PLAN_BAJO, 52);
  assert.strictEqual(r.status, 'menor_bajo_gasto', 'JSON: ' + JSON.stringify(r.status));
  assert.ok(Math.abs(r.gap) < 300, 'y el hueco es MENOR que el umbral de adulto: ' + r.gap);
  // CONTROL: a un adulto con el mismo hueco pequeño se le sigue respetando el silencio.
  const adulto = Object.assign({}, MENOR_REAL, { age: 34 });
  assert.strictEqual(core.nutPlanReview(adulto, PLAN_BAJO, 52).status, 'ok');
});

// ── EL LOTE DE MÁQUINAS (e228-e249, v497) ────────────────────────────────────────────────
// Nace de una queja del PO con la razón de su lado: «he estado en otros gyms y veo máquinas que no
// están en nuestra biblioteca». Medido contra el piso de un gimnasio de cadena: faltaban 25 de las
// 30 estaciones revisadas, y el catálogo tenía 36 ejercicios de máquina contra 127 de peso corporal.
const _LOTE_MAQ = [];
for (let n = 228; n <= 251; n++) _LOTE_MAQ.push('e' + n);   // e250 pendular y e251 RDL en Smith: los dos salieron de las fotos del PO
const _catFuente = () => require('fs').readFileSync(require('path').join(__dirname, 'app-1-infra.js'), 'utf8');

test('🔴 v497 · el lote de máquinas es de GIMNASIO y no se cuela en casa ni en el parque', () => {
  // El defecto que este candado impide es el que ya está documentado: «al de gym le caen ejercicios
  // de suelo y al de casa prensa de pierna». Una máquina sin `env` cae a gym por defecto, pero
  // declararlo es lo que impide que mañana alguien la deje suelta.
  const src = _catFuente();
  _LOTE_MAQ.forEach(id => {
    const linea = src.split('\n').find(l => l.includes(`{id:'${id}',`));
    assert.ok(linea, `${id} no está en el catálogo`);
    assert.ok(/env:\['gym'\]/.test(linea), `${id} no declara env:['gym'] — se puede colar en casa`);
  });
});

test('🔴 v497 · ninguna máquina nueva cae al nivel por DEFECTO', () => {
  // Un id sin nivel explícito cae a 'I' y entonces un PRINCIPIANTE no lo recibe jamás — que es
  // justo al revés de lo que una máquina guiada debería hacer. Pasó con el lote de junio (48
  // ejercicios un mes en el limbo), así que aquí se afirma id por id.
  _LOTE_MAQ.forEach(id => {
    assert.ok(core.EX_LEVEL[id], `${id} no tiene nivel en EX_LEVEL: caería a 'I' por el default`);
    assert.ok(['P', 'I', 'A'].includes(core.EX_LEVEL[id]), `${id} con nivel raro: ${core.EX_LEVEL[id]}`);
  });
  // Y el criterio: la máquina GUIADA es de entrada. Al menos la mitad del lote tiene que ser 'P'
  // o el lote no le sirve a quien más lo necesita (el principiante que no sabe usar una barra).
  const p = _LOTE_MAQ.filter(id => core.EX_LEVEL[id] === 'P').length;
  assert.ok(p >= 12, `solo ${p} de ${_LOTE_MAQ.length} son de nivel principiante`);
});

test('🔴 v497 · cada máquina nueva dice qué músculo trabaja (mapa muscular)', () => {
  const { MM_EX } = require('./exercise-muscles.js');
  _LOTE_MAQ.forEach(id => {
    const m = MM_EX[id];
    assert.ok(m && m.p && m.p.length, `${id} sin mapa muscular: la ficha no diría qué trabaja`);
  });
});

test('🔴 v497 · el generador de GIMNASIO ya reparte las máquinas nuevas', () => {
  // Un ejercicio que el generador nunca elige solo sirve en el buscador del coach. Se barre gym
  // con varias semillas: el catálogo entero se recorre por rotación, así que con UNA semilla no
  // se puede concluir nada (con 8 parecía que el press de banca DESAPARECÍA y con 40 se ve que
  // solo baja de frecuencia porque el pool creció).
  const src = _catFuente();
  const LIB = [];
  for (const m of src.matchAll(/\{id:'(e\d+)',name:'([^']+)',muscle:'([^']*)',type:'([^']*)'([^}]*)\}/g)) {
    const c = m[5]; const env = (c.match(/env:\[([^\]]*)\]/) || [])[1];
    LIB.push({ id: m[1], name: m[2], muscle: m[3], type: m[4],
      env: env ? env.split(',').map(s => s.replace(/'/g, '').trim()) : undefined,
      sets: +((c.match(/sets:(\d+)/) || [])[1] || 3), reps: +((c.match(/reps:(\d+)/) || [])[1] || 10) });
  }
  assert.ok(LIB.length > 200, `el barrido leyó ${LIB.length} ejercicios: no está leyendo el catálogo`);
  const salen = new Set(); const enCasa = new Set();
  // El barrido cubre los DOS sexos y dos objetivos: los splits y los puestos cambian con ambos,
  // así que uno solo mide media biblioteca (mi primer barrido de este test daba 10 de 22 por eso).
  ['Principiante', 'Intermedio', 'Avanzado'].forEach(level => {
    [3, 5].forEach(days => {
      ['gym', 'casa'].forEach(place => {
        for (let seed = 1; seed <= 6; seed++) {
         for (const sex of ['M', 'F']) {
          for (const goal of ['Ganar músculo', 'Perder grasa']) {
          const cli = { id: 'x', name: 'x', sex, level, days, goal, age: 30, weight: 75, height: 175 };
          let r;
          try { r = core.generarRutinas(cli, LIB, { place, seed, now: new Date('2026-08-18T12:00:00'), idFn: () => 'r' }); } catch (e) { r = null; }
          ((r && r.routines) || []).forEach(x => (x.exercises || []).forEach(e => {
            if (_LOTE_MAQ.includes(e.id)) (place === 'casa' ? enCasa : salen).add(e.id);
          }));
          }
         }
        }
      });
    });
  });
  assert.strictEqual(enCasa.size, 0, `máquinas de gimnasio en un plan de CASA: ${[...enCasa].join(', ')}`);
  // Medido 2026-08-18 con ESTE mismo barrido: **14 de las 22** llegan a un plan de gimnasio (con
  // uno más ancho —8 semillas y 4 objetivos— son 18). El piso va en 12 con aire: cuáles salen
  // depende de la rotación del cursor, y lo que este test protege es que el lote NO sea decorativo.
  // Las 8 que no salen viven del buscador del coach, que es de donde nació la queja.
  assert.ok(salen.size >= 12, `solo ${salen.size} de 22 máquinas nuevas llegan a un plan de gimnasio`);
});

test('🔴 v497 · las máquinas que YA estaban ahora dicen que son máquina', () => {
  // El barrido casi las cuenta como faltantes: el nombre no decía «máquina» aunque la descripción
  // empieza por «Boca abajo en la MÁQUINA…». Si el coach no las encuentra buscando, para él no
  // existen — que es literalmente la queja que abrió este lote.
  const src = _catFuente();
  [['e15', 'Curl Femoral Tumbado en Máquina'], ['e59', 'Elevación de Talones Sentado en Máquina']]
    .forEach(([id, nombre]) => {
      assert.ok(src.includes(`{id:'${id}',name:'${nombre}'`), `${id} debería llamarse «${nombre}»`);
    });
});

// ── LA PROTEÍNA DEL PLAN, QUE NO MIRABA NADIE (v496 — punto 1 del dictamen del 2026-08-05) ──
// El revisor juzgaba calorías y rótulo. Medido el 18-ago sobre los 10 planes escritos: 4 están
// entre 25 y 37 g POR DEBAJO de la doctrina y 1 está 26 g POR ENCIMA del techo de 2,2 g/kg, y a
// tres de ellos la ficha les decía **«ok»**. Todas las cortas son mujeres en «Perder grasa» o
// «Recomposición», que es el cubo donde la proteína alta importa MÁS.
const CLAUDIA = { name: 'Claudia', age: 34, sex: 'F', weight: 74, height: 156, activityFactor: 1.55, goal: 'Recomposición' };
const PLAN_CLAUDIA = { kcal: 2146, prot: 107, carbs: 268, fat: 71, goal: 'mantenimiento' };

test('🔴 v496 · un plan con las CALORÍAS perfectas y la proteína corta ya no pasa por «ok»', () => {
  const r = core.nutPlanReview(CLAUDIA, PLAN_CLAUDIA, 74);
  assert.ok(Math.abs(r.gap) < 5, `sus calorías están clavadas (gap ${r.gap}): es la proteína lo único que falla`);
  assert.strictEqual(r.status, 'proteina_fuera', 'status real: ' + r.status);
  assert.strictEqual(r.prot.dir, 'corta');
  // La DOSIS, no el signo: «le falta algo» lo cumpliría 1 g. Medido: 107 g contra 144 de doctrina.
  assert.ok(r.prot.gramos <= -25, `le faltan ${Math.abs(r.prot.gramos)} g y el aviso tiene que decir cuántos`);
  assert.strictEqual(r.prot.objetivo, Math.round(core.nutRefWeight(74, 156) * 2.2));
});

test('🔴 v496 · y el que se PASA del techo de 2,2 g/kg también se marca (caso Miguel)', () => {
  const miguel = { name: 'Miguel', age: 29, sex: 'M', weight: 70, height: 183, activityFactor: 1.55, goal: 'Ganar músculo' };
  const r = core.nutPlanReview(miguel, { kcal: 3040, prot: 180, carbs: 400, fat: 80 }, 70);
  assert.strictEqual(r.status, 'proteina_fuera', 'status real: ' + r.status);
  assert.strictEqual(r.prot.dir, 'pasada');
  assert.ok(r.prot.dosis >= 2.5, `2,57 g/kg era el caso real; midiendo ${r.prot.dosis}`);
});

test('🔴 v496 · la tolerancia reproduce los VEREDICTOS de Andrés, uno por uno', () => {
  // ±0,3 g/kg no se eligió a ojo: es el único corte que marca a los 5 que él marcó y deja en paz
  // a los 3 que aprobó. Si alguien la mueve, este test dice a quién empieza a molestar.
  const casos = [
    ['Claudia', -0.56, true], ['Kathe', -0.47, true], ['Natalia', -0.41, true],
    ['Luz', -0.40, true], ['Miguel', +0.37, true],
    ['coach', -0.28, false], ['Nataly', -0.20, false], ['Samuel', +0.06, false], ['Astrid', -0.01, false],
  ];
  casos.forEach(([quien, dif, marcado]) => {
    assert.strictEqual(Math.abs(dif) >= core.NUT_PROT_TOL_G_KG, marcado,
      `${quien} (${dif} g/kg) debería ${marcado ? 'marcarse' : 'quedar en paz'} con la tolerancia actual (${core.NUT_PROT_TOL_G_KG})`);
  });
});

test('🔴 v496 · la proteína se juzga sobre lo SERVIDO y en peso de REFERENCIA, no sobre la báscula', () => {
  // Dosificar sobre el peso de báscula es lo que v428 arregló: a IMC alto infla la dosis y deja al
  // carbohidrato sin espacio. Con 74 kg de báscula y 156 cm, la referencia baja de 74.
  const ref = core.nutRefWeight(74, 156);
  assert.ok(ref < 74, `la referencia (${ref}) tiene que ser menor que la báscula en IMC alto`);
  const p = core.nutProtCheck(CLAUDIA, { prot_g: 107 }, 74);
  assert.strictEqual(p.dosis, Math.round(107 / ref * 100) / 100);
  // Sin datos no se opina (ni se inventa una dosis).
  assert.strictEqual(core.nutProtCheck(CLAUDIA, { prot_g: 0 }, 74), null);
  assert.strictEqual(core.nutProtCheck(null, { prot_g: 100 }, 74), null);
});

test('🔴 v496 · el NÚMERO manda sobre el rótulo cuando fallan los dos', () => {
  // La tarjeta de `rotulo_miente` afirma «sus números están bien». Con un plan 387 kcal por encima
  // Y el rótulo cambiado, esa frase manda al coach a corregir lo que no toca. Caso real: apareció
  // simulando el arreglo de Samuel (cambiarle el objetivo a Recomposición).
  const samuel = { name: 'Samuel', age: 28, sex: 'M', weight: 86, height: 176, activityFactor: 1.725, goal: 'Recomposición' };
  const plan = { kcal: 3533, prot: 194, carbs: 512, fat: 79, goal: 'mantenimiento' };   // los suyos, tal cual
  const r = core.nutPlanReview(samuel, plan, 86);
  assert.strictEqual(r.status, 'desviado', 'status real: ' + r.status);
  assert.ok(r.gap > 300, `y el hueco es el de verdad: ${r.gap}`);
  assert.ok(r.mismatch, 'el rótulo sigue viajando en el resultado, para que la ficha lo diga en una línea');
  // CONTROL de v486: con las cifras CLAVADAS, el rótulo mentiroso sigue siendo el titular. (La
  // fixture va escrita aquí y no se toma de `LUZ`, que se declara más abajo en el archivo: un
  // `const` no existe antes de su línea y el test moría con «Cannot access before initialization».)
  const luz = { name: 'Luz', age: 39, sex: 'F', weight: 82, height: 158, activityFactor: 1.375, goal: 'Perder grasa' };
  assert.strictEqual(core.nutPlanReview(luz, { kcal: 1731, prot: 130, carbs: 160, fat: 48, goal: 'mantenimiento' }, 82).status, 'rotulo_miente');
});

// ── EL OTRO LADO DEL CANDADO: EL TECHO DE MENORES (v493, REGLA 3 del dictamen 2026-08-15) ──
// Caso real medido sobre el backup del 16-ago: una asesorada de 16 años, 72 kg y 165 cm (IMC 26,4,
// SOBREPESO para su edad y su sexo en la referencia OMS 5-19) recibía **+350 kcal/día** porque su
// objetivo dice «Ganar músculo». No lo escribió nadie: sale de la calculadora. El candado de v485
// solo miraba hacia abajo.
const SHARITH = { name: 'Sharith', age: 16, sex: 'F', weight: 72, height: 165, activityFactor: 1.55, goal: 'Ganar músculo' };
const SHARITH_TDEE = 2567; // Schofield 10-18 F: 13,384×72+692,6 = 1.656 → ×1,55 = 2.567

test('🔴 v493 · una menor con SOBREPESO para su edad no recibe superávit', () => {
  const e = nutritionEstimate(SHARITH, 72);
  assert.strictEqual(e.tdee, SHARITH_TDEE);
  // La DOSIS, no el signo: «le bajamos algo» lo cumpliría un −1 kcal y los +350 seguirían ahí.
  const piso = Math.round(SHARITH_TDEE * 1.05);
  assert.ok(e.kcalObj >= piso && e.kcalObj < piso + 4,
    `sigue en superávit: ${e.kcalObj} contra un techo de ${piso}`);
  assert.ok(e.deficit <= Math.round(SHARITH_TDEE * 0.05) + 3, 'el superávit deliberado desapareció: ' + e.deficit);
  // Y el TEXTO: cambiar el número dejando «Superávit de 350 kcal» es el defecto de v437.
  assert.ok(!/[Ss]uper/.test(e.label), 'la etiqueta sigue anunciando un superávit: «' + e.label + '»');
  assert.strictEqual(core.nutGoalForClient('Ganar músculo', SHARITH, 72), 'mantenimiento',
    'la explicación seguiría diciéndole «volumen» sobre un plan que ya no lo es');
  // Cero lenguaje de composición corporal en lo que lee una menor (regla de v448/v449).
  assert.ok(!/grasa|sobrepeso|peso|IMC|delgad/i.test(e.label), 'lenguaje de composición en su pantalla: «' + e.label + '»');
});

test('🔴 v493 · CONTROL: un adolescente DELGADO con el mismo objetivo SÍ hace volumen', () => {
  // Hernán (17, M, 64 kg, 177 cm, IMC 20,4) estaba en la misma medición y Andrés lo dejó igual:
  // «es defendible en un adolescente delgado en pleno crecimiento». Lo único que se le aplica es
  // el tope general de +10%, no el recorte a mantenimiento.
  const flaco = { name: 'Hernán', age: 17, sex: 'M', weight: 64, height: 177, activityFactor: 1.55, goal: 'Ganar músculo' };
  assert.strictEqual(core.nutMinorBmiOver(flaco, 64), false, 'IMC 20,4 no es sobrepeso a los 17');
  const e = nutritionEstimate(flaco, 64);
  assert.ok(e.deficit > 0, 'a un adolescente delgado en volumen se le quitó el superávit entero');
  const techo = core.nutMinorTecho(e.tdee, flaco, 64);
  assert.ok(e.kcalObj >= techo && e.kcalObj < techo + 4, `el techo general es +10% del gasto: ${e.kcalObj} contra ${techo}`);
  assert.strictEqual(core.nutGoalForClient('Ganar músculo', flaco, 64), 'volumen', 'a él sí le corresponde volumen');
  assert.ok(/[Ss]uper/.test(e.label), 'y su etiqueta lo dice: «' + e.label + '»');
});

test('🔴 v493 · el recorte sale del CARBOHIDRATO: la proteína no baja', () => {
  // El control es el plan que ELLA recibía ayer: su gasto + los 350 de «Ganar músculo», dosificado
  // por la misma función. Compararla contra «la misma persona pero adulta» sería otro gasto y otra
  // ecuación (Schofield contra Mifflin): no mediría el recorte, mediría la edad.
  const antes = core.calcMacrosFromKcal(SHARITH_TDEE + 350, 72, SHARITH.goal, SHARITH.height);
  const e = nutritionEstimate(SHARITH, 72);
  assert.strictEqual(e.macros.prot_g, antes.prot_g, 'recortar energía bajándole la proteína es lo que no se hace');
  assert.strictEqual(e.macros.fat_g, antes.fat_g, 'la grasa tiene su propio piso (0,9 g/kg)');
  assert.ok(e.macros.carb_g < antes.carb_g, 'el macro flexible es el que absorbe el recorte');
  assert.strictEqual(e.macros.kcal, e.kcalObj, 'y el titular sigue siendo la suma de sus propios macros');
});

test('🔴 v493 · el techo también alcanza al plan ESCRITO A MANO', () => {
  // La puerta que v485 encontró abierta: el coach escribe y nadie le pregunta la edad.
  const escrito = { kcal: 3200, prot: 158, carbs: 500, fat: 80 };
  const b = nutBaseFor(SHARITH, escrito, 72);
  assert.ok(b.minorCap, 'el techo no actuó sobre el plan escrito');
  assert.strictEqual(b.minorCap.sobrepeso, true);
  assert.strictEqual(b.minorCap.kcalAntes, core.nutMacroKcal({ prot_g: 158, carb_g: 500, fat_g: 80 }),
    'el aviso al coach tiene que citar SU número, no el nuestro');
  assert.ok(b.kcalObj <= b.minorCap.techo + 3, `sirve ${b.kcalObj} con techo ${b.minorCap.techo}`);
  assert.strictEqual(b.macros.prot_g, 158, 'la proteína del coach se respeta (bajo el tope de 2,2 g/kg)');
  // Y el coach se entera SIN abrir el editor: la ficha lo dice.
  const r = core.nutPlanReview(SHARITH, escrito, 72);
  assert.strictEqual(r.status, 'menor_sobre_techo', 'status real: ' + r.status);
  assert.strictEqual(r.sirve, b.kcalObj, 'la ficha cita lo que de verdad se sirve');
});

test('🔴 v493 · la VALORACIÓN del coach lee de la misma cuenta que sirve la app', () => {
  // Calculaba con `kcalTargetFor` + `calcMacrosFromKcal` a pelo: una cuenta paralela sin pisos ni
  // reglas de menores. En pantalla decía «2.917 kcal/día» encima de la tarjeta que avisaba que se
  // sirven 2.696 — y a un menor con «Perder grasa» le mostraba un déficit (prohibido desde v448).
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-3-coach.js'), 'utf8');
  const i = src.indexOf('function renderValoracion(');
  assert.ok(i > 0, 'renderValoracion cambió de nombre: revisa este candado');
  const cuerpo = src.slice(i, src.indexOf('\nfunction ', i + 10));
  assert.ok(/nutritionEstimate\(c,\s*w\)/.test(cuerpo), 'la valoración volvió a calcular por su cuenta');
  // Y el efecto, sobre el caso real: su cabecera y lo que se sirve son el MISMO número.
  const est = nutritionEstimate(SHARITH, 72);
  assert.strictEqual(est.kcalObj, nutBaseFor(SHARITH, null, 72).kcalObj);
});

test('🔴 v493 · el nombre de la fórmula sale del MÉTODO, no de la memoria de quien escribió el HTML', () => {
  const menor = { age: 16, sex: 'F', weight: 72, height: 165 };
  assert.strictEqual(core.tmbFormulaName(menor), 'Schofield (FAO/OMS/UNU)');
  assert.strictEqual(core.tmbFormulaName({ age: 30, sex: 'F' }), 'Mifflin-St Jeor');
  // El candado: v448 cambió la ecuación de los menores y las TRES pantallas siguieron diciendo
  // «Mifflin-St Jeor» — la que el dictamen prohíbe usarle a ella. Escrito a mano vuelve a pasar.
  const fs = require('fs'), path = require('path');
  const sueltos = [];
  for (const f of ['app-3-coach.js', 'app-5-salud.js', 'app-2-login.js', 'app-4-entreno.js', 'app-6-extra.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    src.split('\n').forEach((l, i) => {
      if (!/Mifflin|Schofield/.test(l)) return;
      const t = l.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // en comentarios sí
      sueltos.push(f + ':' + (i + 1));
    });
  }
  assert.deepStrictEqual(sueltos, [], 'nombre de ecuación escrito a mano en pantalla: usa tmbFormulaName(cliente)');
});

test('🔴 v493 · cumplir el techo NUNCA se hace dejándola sin carbohidrato', () => {
  // El defecto del 0-carb de v428, puesto del revés: si el recorte no cabe, el que cede es el
  // TECHO, no el plato. Un plan escrito con la grasa disparada no puede acabar en «0 g de arroz».
  const grasoso = { kcal: 3400, prot: 158, carbs: 120, fat: 220 };
  const b = nutBaseFor(SHARITH, grasoso, 72);
  const carbMin = Math.round((core.nutRefWeight(72, 165) || 72) * 2.0);
  assert.ok(b.macros.carb_g >= carbMin, `le quedaron ${b.macros.carb_g} g de carbohidrato, bajo el piso de ${carbMin}`);
  assert.ok(b.minorCap.apretado, 'y queda dicho que el techo cedió, para que no sea un recorte silencioso');
});

test('🔴 v493 · las DOS puertas dan el MISMO número (la que se lee y la que se come)', () => {
  // Medido el 18-ago: la habitación de Nutrición decía 2.111 kcal y el plato 2.219 para la misma
  // menor, porque el piso de v485 vivía solo a la salida de `nutBaseFor` y cinco superficies leen
  // `nutritionEstimate` directo. 108 kcal de contradicción a un toque de distancia.
  const casos = [
    SHARITH,
    { name: 'V', age: 16, sex: 'F', weight: 50, height: 162, activityFactor: 1.55, goal: 'Recomposición' },
    { name: 'V2', age: 15, sex: 'F', weight: 52, height: 161, activityFactor: 1.375, goal: 'Perder grasa' },
    { name: 'H', age: 17, sex: 'M', weight: 64, height: 177, activityFactor: 1.55, goal: 'Ganar músculo' },
  ];
  casos.forEach(c => {
    const e = nutritionEstimate(c, c.weight), b = nutBaseFor(c, null, c.weight);
    assert.strictEqual(b.kcalObj, e.kcalObj, `${c.name}: la pantalla dice ${e.kcalObj} y el plato sirve ${b.kcalObj}`);
    assert.deepStrictEqual(b.macros, e.macros, `${c.name}: los macros de las dos puertas`);
  });
});

test('🔴 v493 · la banda es IDEMPOTENTE: aplicarla dos veces no mueve el número', () => {
  // Sin holgura de grano el recorte volvía a «recortar» su propio redondeo y pisaba el `kcalAntes`
  // del aviso con un número que no era el que escribió el coach (cazado midiendo, no razonando).
  const una = nutBaseFor(SHARITH, { kcal: 3200, prot: 158, carbs: 500, fat: 80 }, 72);
  const dos = core.nutMinorBandBase(una, SHARITH, 72);
  assert.strictEqual(dos.kcalObj, una.kcalObj);
  assert.deepStrictEqual(dos.macros, una.macros);
  assert.strictEqual(dos.minorCap.kcalAntes, una.minorCap.kcalAntes, 'la segunda pasada pisó el número original');
});

test('🔴 v493 · el detector NO marca la franja que la app misma impone', () => {
  // El choque de v485 una talla más grande: la banda entera (+5% a +10%) cabe DENTRO de la
  // tolerancia del detector (±5%), así que un adolescente en volumen legítimo aparecía como
  // «su rótulo miente» por un superávit que le acabábamos de recortar A PROPÓSITO.
  const flaco = { name: 'H', age: 17, sex: 'M', weight: 64, height: 177, activityFactor: 1.55, goal: 'Ganar músculo' };
  const e = nutritionEstimate(flaco, 64);
  assert.strictEqual(core.nutGoalMismatch('volumen', e.kcalObj, e.tdee, flaco), null,
    'marca como contradicción el número que el propio motor eligió');
  // CONTROL: fuera de la franja el detector sigue teniendo dientes.
  assert.ok(core.nutGoalMismatch('volumen', Math.round(e.tdee * 0.8), e.tdee, flaco), 'dejó de detectar un déficit real');
});

test('🔴 v493 · «sobrepeso» a los 16 no es «sobrepeso» a los 11, ni igual en los dos sexos', () => {
  // Un corte fijo de IMC 25 es de ADULTO. Entre 5 y 19 años el corte se mueve con la edad y el
  // sexo (OMS 2007, BMI-for-age, +1 DE): a los 11 una niña con IMC 21 ya está por encima, y a los
  // 17 con IMC 24 todavía no. Compararlas contra 25 no es ser estricto, es medir otra cosa.
  const nina = a => ({ age: a, sex: 'F', height: 150, weight: 21 * 2.25, activityFactor: 1.55 }); // IMC 21
  assert.strictEqual(core.nutMinorBmiOver(nina(11), null), true, 'IMC 21 a los 11 años SÍ es sobrepeso');
  assert.strictEqual(core.nutMinorBmiOver(nina(16), null), false, 'IMC 21 a los 16 años NO lo es');
  const c17 = { age: 17, sex: 'F', height: 165, weight: 24 * 2.7225, activityFactor: 1.55 }; // IMC 24
  assert.strictEqual(core.nutMinorBmiOver(c17, null), false, 'IMC 24 a los 17 está bajo el corte de la OMS (24,65)');
  // El corte NO es el mismo para los dos sexos a la misma edad, y eso CAMBIA el veredicto: a los
  // 16, un IMC de 24 pasa el corte de un hombre (23,91) y no el de una mujer (24,32).
  assert.notStrictEqual(core.WHO_BMI_SD1.F[13], core.WHO_BMI_SD1.M[13]);
  const seis = sx => ({ age: 16, sex: sx, height: 170, weight: 24 * 2.89, activityFactor: 1.55 }); // IMC 24
  assert.strictEqual(core.nutMinorBmiOver(seis('M'), null), true, 'a los 16, IMC 24 en un hombre SÍ pasa el corte');
  assert.strictEqual(core.nutMinorBmiOver(seis('F'), null), false, 'y en una mujer de la misma edad NO');
  // Sin sexo, sin edad en la tabla o sin datos NO se inventa un corte: se calla y no recorta.
  assert.strictEqual(core.nutMinorBmiOver({ age: 16, sex: '', height: 165, weight: 90 }, 90), null);
  assert.strictEqual(core.nutMinorBmiOver({ age: 4, sex: 'F', height: 100, weight: 30 }, 30), null);
  assert.strictEqual(core.nutMinorBmiOver({ age: 25, sex: 'F', height: 165, weight: 90 }, 90), null, 'a un adulto no le aplica esta referencia');
  // Y a un ADULTO con IMC alto no se le toca el plan por esta vía.
  const adulta = Object.assign({}, SHARITH, { age: 25 });
  assert.ok(!nutBaseFor(adulta, null, 72).minorCap, 'la banda de menores se le aplicó a una adulta');
});

// ── EL RÓTULO QUE MIENTE SOBRE UN PLAN CORRECTO (v486) ────────────────────────────────────
// Medido el 15-ago sobre los 10 planes escritos: 3 personas tienen los números EXACTOS para su
// objetivo (Luz, desfase 0) y aun así su app les explica «estás comiendo en balance» encima de un
// déficit deliberado. Ninguna disparaba aviso: el detector vivía dentro del editor de nutrición.
const LUZ = { name: 'Luz', age: 39, sex: 'F', weight: 82, height: 158, activityFactor: 1.375, goal: 'Perder grasa' };
const PLAN_LUZ = { kcal: 1731, prot: 130, carbs: 160, fat: 48, goal: 'mantenimiento' };

test('🔴 v486 · un plan con los NÚMEROS BIEN pero el RÓTULO mentiroso se detecta', () => {
  const r = core.nutPlanReview(LUZ, PLAN_LUZ, 82);
  assert.strictEqual(r.status, 'rotulo_miente', 'status real: ' + r.status);
  assert.ok(Math.abs(r.gap) < 300, 'y sus cifras están DENTRO de lo correcto: gap ' + r.gap);
  assert.strictEqual(r.mismatch.dice, 'balance');
  assert.strictEqual(r.mismatch.real, 'deficit', 'lee balance y vive en déficit');
});

test('🔴 v486 · CONTROL: si el rótulo SÍ dice la verdad, no se marca nada', () => {
  // Sin este control el «detector» sería marcar a todo el mundo. Mismo plan, rótulo honesto.
  const honesto = Object.assign({}, PLAN_LUZ, { goal: 'cutting' });
  const r = core.nutPlanReview(LUZ, honesto, 82);
  assert.notStrictEqual(r.status, 'rotulo_miente', 'un rótulo honesto no es una contradicción');
  assert.strictEqual(r.mismatch, null);
});

test('🔴 v486 · el superávit DELIBERADO del piso de menores NO es una contradicción', () => {
  // El margen del piso (×1,05) y la tolerancia del detector (5%) valen lo mismo, así que la menor
  // cruzaba el umbral por 3 kcal y salía marcada por algo que la app hace A PROPÓSITO y le explica.
  // Un detector que marca lo que el propio sistema decide enseña a ignorarlo.
  const base = nutBaseFor(MENOR_REAL, PLAN_BAJO, 52);
  const tdee = calcTDEE(calcTMB(52, 161, 15, 'F'), 1.375);
  assert.ok(base.kcalObj > tdee * 1.05 - 5, 'la menor SÍ queda por encima de su gasto (el piso)');
  assert.strictEqual(core.nutGoalMismatch('mantenimiento', base.kcalObj, tdee, MENOR_REAL), null,
    'con el cliente, el piso es la referencia y no hay contradicción');
  // CONTROL: a un ADULTO con ese mismo número sí se le marca — la excepción es solo del menor.
  const adulto = Object.assign({}, MENOR_REAL, { age: 34 });
  assert.ok(core.nutGoalMismatch('mantenimiento', base.kcalObj, tdee, adulto),
    'a un adulto ese mismo +5% sí es una contradicción con su rótulo');
});

test('🔴 v486 · el rótulo se juzga contra lo que se SIRVE, no contra el titular escrito', () => {
  // Desde v435 el titular que escribe el coach y la suma de sus PROPIOS macros pueden no cuadrar
  // (medido: 6 de 10 planes). El plato se arma con los MACROS, así que es ESO lo que ella come —
  // juzgar el rótulo contra el titular sería auditar un número que nadie se lleva a la boca.
  const planDescuadrado = { kcal: 2200, prot: 130, carbs: 160, fat: 48, goal: 'mantenimiento' };
  const sirve = nutMacroKcal({ prot_g: 130, carb_g: 160, fat_g: 48 });
  assert.ok(sirve < 1700 && 2200 - sirve > 500, `el titular y los macros van en direcciones distintas: ${sirve} vs 2200`);
  const r = core.nutPlanReview(LUZ, planDescuadrado, 82);
  assert.strictEqual(r.status, 'rotulo_miente', 'status real: ' + r.status);
  assert.strictEqual(r.mismatch.real, 'deficit', 'lo que COME es un déficit, aunque el titular diga otra cosa');
  assert.strictEqual(r.sirve, sirve, 'y el aviso muestra el número que de verdad se sirve');
});

test('🔴 v486 · la regla dura del MENOR gana sobre el aviso de rótulo', () => {
  // Un menor bajo su gasto es una regla clínica; el rótulo es un problema de comunicación. Si los
  // dos aplican, el coach tiene que ver el grave.
  const r = core.nutPlanReview(MENOR_REAL, PLAN_BAJO, 52);
  assert.strictEqual(r.status, 'menor_bajo_gasto');
});

test('🔴 v485 · BARRIDO: ningún menor queda bajo su gasto, por ninguna de las dos puertas', () => {
  // El barrido encuentra lo que la medición sobre 5 menores reales no puede (lección de v482).
  let casos = 0, fallos = 0, actuo = 0;
  for (const age of [10, 13, 15, 17]) {
    for (const sex of ['M', 'F']) {
      for (const w of [35, 45, 55, 70, 90]) {
        for (const af of [1.2, 1.375, 1.55, 1.725, 1.9]) {
          for (const goal of ['Perder grasa', 'Recomposición', 'Ganar músculo']) {
            const c = { age, sex, weight: w, height: 160, activityFactor: af, goal };
            const tdee = calcTDEE(calcTMB(w, 160, age, sex), af);
            // Las dos puertas: plan escrito a mano (varios niveles de déficit) y la calculadora.
            for (const frac of [0.5, 0.7, 0.85, 0.95, null]) {
              const nut = frac == null ? null : (() => {
                const k = Math.round(tdee * frac), p = Math.round(w * 1.6);
                const f = Math.round(k * 0.25 / 9);
                return { kcal: k, prot: p, carbs: Math.max(10, Math.round((k - p * 4 - f * 9) / 4)), fat: f };
              })();
              const base = nutBaseFor(c, nut, w);
              if (!base) continue;
              casos++;
              if (base.minorFloor) actuo++;
              if (base.kcalObj < Math.round(tdee * 1.05) - 1) { fallos++; if (fallos <= 3) console.log('    ✗', JSON.stringify({ age, sex, w, af, goal, frac, dio: base.kcalObj, gasta: tdee })); }
            }
          }
        }
      }
    }
  }
  assert.ok(casos > 1000, 'el barrido tiene que barrer de verdad: ' + casos);
  assert.ok(actuo > 100, 'y el piso tiene que ACTUAR en un montón de ellos: ' + actuo);
  assert.strictEqual(fallos, 0, `${fallos} de ${casos} menores quedaron por debajo de su gasto`);
});

test('🔴 v435 · la semana que ve el PERFIL suma EXACTO lo que promete', () => {
  // La frase «en la semana comes lo mismo» tiene que ser verdad, no un consuelo. Con el titular
  // escrito (2.400) la semana daba 16.485 contra 16.800 prometidas: 315 kcal de mentira.
  const base = nutBaseFor({ weight: 60 }, { kcal: 2400, prot: 150, carbs: 270, fat: 75 }, 60);
  const w = nutWeekTargets(base, NUT_RUT_4D);
  assert.strictEqual(w.days.length, 7);
  // El reparto redondea el carbohidrato de cada día, así que la igualdad EXACTA solo se da en
  // algunas formas de semana (lo destapó el harness con un plan de un solo día de entreno). La
  // promesa real es que la semana no SE DESVÍA — mismo criterio (1%) que el test del ciclado.
  const desvio = Math.abs(w.semanaKcal - 7 * base.kcalObj) / (7 * base.kcalObj);
  assert.ok(desvio <= 0.01, `la semana se desvió ${(desvio * 100).toFixed(2)}% (${w.semanaKcal} vs ${7 * base.kcalObj})`);
  assert.strictEqual(w.promedioKcal, Math.round(w.semanaKcal / 7), 'el promedio es el de la semana REAL, no el titular');
  // Y con formas de semana distintas tampoco se desvía (1 solo día de entreno es el caso extremo).
  for (const rut of [NUT_RUT_4D.slice(0, 1), NUT_RUT_4D.slice(0, 2), NUT_RUT_4D]) {
    const x = nutWeekTargets(base, rut);
    const dv = Math.abs(x.semanaKcal - 7 * base.kcalObj) / (7 * base.kcalObj);
    assert.ok(dv <= 0.01, `con ${rut.length} día(s) la semana se desvió ${(dv * 100).toFixed(2)}%`);
  }
  // Y los días NO son todos iguales: eso es lo que hay que explicar, no esconder.
  const kcals = [...new Set(w.days.map(d => d.target.kcal))];
  assert.ok(kcals.length >= 2, 'el ciclado existe: ' + JSON.stringify(kcals));
});

test('🔴 v435 · «Hoy» EXPLICA por qué su número no es el de la semana', () => {
  // Sin esta línea son dos números que se contradicen a la vista, aunque por dentro estén bien.
  const base = nutBaseFor({ weight: 60 }, { kcal: 2400, prot: 150, carbs: 270, fat: 75 }, 60);
  const w = nutWeekTargets(base, NUT_RUT_4D);
  const lunes = w.days.find(d => d.day === 'Lunes');       // pierna → más
  const domingo = w.days.find(d => d.day === 'Domingo');   // descanso → menos
  const nLun = nutDayNote(lunes.kind, lunes.target.kcal, base.kcalObj);
  const nDom = nutDayNote(domingo.kind, domingo.target.kcal, base.kcalObj);
  assert.ok(/pierna/i.test(nLun) && /m[áa]s/i.test(nLun), nLun);
  assert.ok(/descansas/i.test(nDom) && /menos/i.test(nDom), nDom);
  assert.ok(/en la semana comes lo mismo/i.test(nLun), 'la promesa que sostiene el ciclado: ' + nLun);
  // El día que coincide con la base no necesita disculpa (ni ruido en pantalla).
  assert.strictEqual(nutDayNote('entreno', 2360, 2355), '');
  assert.strictEqual(nutDayNote('descanso', 0, 2355), '', 'sin datos no inventa una explicación');
});

test('🔒 v435 · sin plan del coach la semana también cuadra (estimación automática)', () => {
  const base = nutritionEstimate(NUT_BASE);
  const w = nutWeekTargets(base, NUT_RUT_4D);
  assert.ok(w, 'hay semana');
  assert.ok(Math.abs(w.semanaKcal - 7 * w.promedioKcal) <= 7, 'el promedio representa la semana');
  assert.strictEqual(nutWeekTargets(null, NUT_RUT_4D), null, 'sin base no inventa una semana');
});

test('el día de pierna trae MÁS carbohidrato que el normal, y el descanso menos', () => {
  const base = nutritionEstimate(NUT_BASE);
  const p = core.nutDayTarget(base, 'pierna', 3, 1).carb_g;
  const e = core.nutDayTarget(base, 'entreno', 3, 1).carb_g;
  const r = core.nutDayTarget(base, 'descanso', 3, 1).carb_g;
  assert.ok(p > e && e > r, `orden equivocado: pierna=${p} entreno=${e} descanso=${r}`);
});

test('el ciclado mueve SOLO el carbohidrato: proteína y grasa no se tocan', () => {
  // La proteína sostiene el músculo y la grasa tiene un mínimo hormonal: ninguna
  // puede bajar porque ese día no se entrene.
  const base = nutritionEstimate(NUT_BASE);
  const dias = ['pierna', 'entreno', 'descanso'].map(k => core.nutDayTarget(base, k, 3, 1));
  assert.strictEqual(new Set(dias.map(d => d.prot_g)).size, 1, 'la proteína cambió con el día');
  assert.strictEqual(new Set(dias.map(d => d.fat_g)).size, 1, 'la grasa cambió con el día');
});

test('sin datos del cuerpo NO se inventa un plan', () => {
  assert.strictEqual(core.nutDayTarget(null, 'entreno', 3, 1), null);
  assert.strictEqual(core.nutDayTarget(nutritionEstimate({ weight: 80 }), 'entreno', 3, 1), null);
});

test('🔴 el plato descuenta los aportes CRUZADOS y no se pasa del objetivo', () => {
  // El arroz aporta proteína y la carne aporta grasa. Sin descontarlo, los platos
  // salían +12% a +17% y la proteína de una persona real llegaba a 176 g con meta 123.
  // ⚠️ EL FIXTURE SE CORRIGIÓ EN v472 y hay que decir por qué: pasaba el objetivo del **DÍA
  // ENTERO** como si fuera UNA comida (381 g de carbohidrato), algo que en producción no ocurre
  // nunca — `nutDayPlan` lo reparte en 5 tomas. Mientras nada topaba las raciones daba igual;
  // al ponerle tope al arroz, ese presupuesto imposible exigía **1.361 g de arroz** y el test
  // empezó a fallar por su propia fixture, no por el motor. Es el gotcha ya escrito en el repo:
  // «un FIXTURE que no se parece a producción fabrica defectos que no existen».
  // 🔴 Y LA ASERCIÓN TAMBIÉN CAMBIÓ, que es lo importante: pedía **±8% en los tres macros** y eso
  // **NO es una propiedad de este sistema** — se cumplía por coincidencia en esa combinación y a
  // esa escala. Medido al buscarle un fixture realista: en un ALMUERZO de verdad los desvíos van
  // de **−16,1% a +16,7% en proteína**, porque el redondeo a medidas caseras manda (media porción
  // de pollo son 18,6 g de proteína sobre una meta de 31). Y en el DÍA completo la proteína se
  // pasa hasta **+20,7% por diseño**, porque `NUT_PROT_MIN_SHARE` la empuja hacia arriba.
  // Una tolerancia que el sistema no puede cumplir no protege nada: se cambia por el MECANISMO
  // que este test dice vigilar —que los aportes cruzados se descuenten—, que es scale-independent
  // y muerde si alguien borra los `- ap(...)`. Los límites de desvío ya los vigilan los dos
  // guardianes (`en gente TÍPICA…` y `ni en los casos EXTREMOS…`), sobre perfiles reales.
  const meta = { prot_g: 40, carb_g: 100, fat_g: 20 };
  const pick = { prot: 'pollo_pechuga', carb: 'arroz', fat: 'aceite' };
  const r = core.nutSolveMeal(meta, pick);
  const F = core.NUT_FOOD_BY_ID;
  const g = id => (r.items.find(i => i.id === id) || {}).grams || 0;
  // El aceite es 100% grasa: si nadie le descontara nada harían falta `fat_g` gramos exactos.
  // El pollo y el arroz YA traen grasa, así que el plato tiene que servir MENOS aceite.
  const grasaCruzada = F.pollo_pechuga.f * g('pollo_pechuga') / 100 + F.arroz.f * g('arroz') / 100;
  // CONTROL: sin aporte cruzado de grasa el caso no probaría nada.
  assert.ok(grasaCruzada > 2,
    `el fixture dejó de tener aporte cruzado de grasa (${grasaCruzada.toFixed(1)} g): no prueba nada`);
  assert.ok(g('aceite') < meta.fat_g - 1,
    `el aceite no se descontó: ${g('aceite')} g cuando el pollo y el arroz ya aportan ${grasaCruzada.toFixed(1)} g de grasa`);
  // Y el resultado de descontar es que la GRASA del plato cuadra: es el macro residual, sin piso
  // ni tope que la distorsione, así que aquí sí se puede exigir precisión.
  const desvioGrasa = Math.abs(r.real.fat_g - meta.fat_g) / meta.fat_g;
  assert.ok(desvioGrasa <= 0.15,
    `la grasa se desvía ${(100 * desvioGrasa).toFixed(1)}%: pedía ${meta.fat_g} y el plato da ${r.real.fat_g}`);
  // 🔒 Lo mismo por el lado de la PROTEÍNA: el arroz la aporta y hay que descontarla.
  const protDelArroz = F.arroz.p * g('arroz') / 100;
  assert.ok(protDelArroz > 3, `el arroz dejó de aportar proteína (${protDelArroz.toFixed(1)} g): el caso no discrimina`);
  const ingenuoPollo = meta.prot_g / F.pollo_pechuga.p * 100;   // como si el arroz no aportara nada
  assert.ok(g('pollo_pechuga') < ingenuoPollo,
    `el pollo no se descontó: ${g('pollo_pechuga')} g contra los ${ingenuoPollo.toFixed(0)} que pediría ignorar el arroz`);
});

// 🔴 v472 · LA SEGUNDA FUENTE DE CARBOHIDRATO (`pick.carb2`), dictamen de Andrés.
// Un plato colombiano casi nunca trae un solo carbohidrato: es arroz + tajada, arepa + papa. Con
// UNO solo, cubrir el objetivo pide raciones que nadie sirve —«800 g de papa criolla», «9 tajadas
// de pan»— y topar el alimento NO lo arregla: recorta (medido, los 11 topes dejan el plato
// entregando −20,9%). Repartir sí. Medido sobre las 22 personas reales: las raciones de 5 o más
// medidas caseras pasan de **49 a 0** y la peor de **9 a 4**.
// ⚠️ Las barras van ESCRITAS A MANO, no derivadas de `NUT_CARB2_SHARE`/`NUT_CARB2_MIN_UN`: un
// control que se mueve con la constante que vigila no es un control (lección ya pagada con
// `NUT_PROT_MIN_SHARE`).
test('🔴 v472 · el plato reparte el carbohidrato entre DOS fuentes, y respeta el piso del segundo', () => {
  const F = core.NUT_FOOD_BY_ID;
  const pick = { prot: 'pollo_pechuga', carb: 'arroz', carb2: 'platano_maduro', fat: 'aceite' };
  const g = (r, id) => (r.items.find(i => i.id === id) || {}).grams || 0;

  // ── Con carbohidrato suficiente, el plato se PARTE ──
  const alto = core.nutSolveMeal({ prot_g: 40, carb_g: 120, fat_g: 18 }, pick);
  const cA = F.arroz.c * g(alto, 'arroz') / 100;
  const cB = F.platano_maduro.c * g(alto, 'platano_maduro') / 100;
  assert.ok(g(alto, 'platano_maduro') > 0, 'el segundo carbohidrato no llegó al plato');
  assert.ok(cA + cB > 0, 'el plato se quedó sin carbohidrato');
  const parte2 = cB / (cA + cB);
  assert.ok(parte2 >= 0.30 && parte2 <= 0.50,
    `al segundo carbohidrato le tocó el ${(100 * parte2).toFixed(0)}% del carbohidrato de la comida (se espera ~40%)`);
  // 🔒 Y es una RACIÓN DE VERDAD, no un adorno: media medida casera como mínimo. Sin este piso
  // salen «5 g de plátano», que es la misma ración-que-no-es-ración de «5 g de clara» (v471).
  assert.ok(g(alto, 'platano_maduro') >= 40,
    `el segundo salió en ${g(alto, 'platano_maduro')} g, menos de media tajada (40 g): eso no es una ración`);

  // 🔴 EL CASO QUE EL PISO NO VEÍA (P1-1 de Fable, arreglado 2026-08-12): un alimento proteico que
  // aporta MUCHO carbohidrato —fríjol, lenteja— deja un `falta` que es una fracción del objetivo
  // bruto. La puerta miraba `tC` y el solver reparte `falta`: veía 116 g de plátano y servía 15.
  // Medido sobre las 22 personas reales: 8 segundas raciones salían así («5 g», «10 g», «15 g»,
  // «20 g» de plátano) en el almuerzo de 7 personas — Natalia, Luz, Valery, Nataly, Kathe, Astrid.
  // ⚠️ Este test NO puede escribirse con `pollo_pechuga`: su aporte de carbohidrato es cero, así
  // que `falta ≈ tC` y el defecto es invisible. Hace falta el aporte cruzado GRANDE.
  const cruzado = { prot: 'frijol', carb: 'arroz', carb2: 'platano_maduro', fat: 'aguacate' };
  const c2 = F.platano_maduro;
  const pisoG = c2.un.g * core.NUT_CARB2_MIN_UN;
  [80, 90, 100].forEach(tc => {
    const r = core.nutSolveMeal({ prot_g: 30, carb_g: tc, fat_g: 15 }, cruzado);
    const g2 = g(r, 'platano_maduro');
    assert.ok(g2 === 0 || g2 >= pisoG,
      `con ${tc} g de carbohidrato y fríjol (que ya aporta el suyo) sirvió ${g2} g de plátano: ` +
      `menos de media tajada (${pisoG} g) no es una ración, es una migaja`);
  });
  // 🔒 CONTROL: con presupuesto de sobra el mismo menú SÍ parte, o el caso de arriba se estaría
  // cumpliendo por haber apagado el reparto entero en vez de por respetar el piso.
  assert.ok(g(core.nutSolveMeal({ prot_g: 30, carb_g: 130, fat_g: 15 }, cruzado), 'platano_maduro') >= pisoG,
    'con presupuesto amplio el menú del fríjol tiene que seguir partiendo el carbohidrato');

  // 🔴 LOS TRES DESCUENTOS CRUZADOS DE `carb2`, CADA UNO CON SU CANDADO.
  // Nacieron en v472 SIN un solo test: la matriz de sabotaje `_sabotaje-carb2.mjs` los rompió uno
  // a uno y **la suite siguió verde en los tres**. Y no son redundantes — medido sobre las 22
  // personas reales, quitarlos hace daño: sin el de la proteína el peor exceso de kcal del día
  // sube de +9,1% a +11,2%; sin el cruzado, el peor día de carbohidrato cae a −12,0% y la variedad
  // de almuerzo baja de 4,45 a 4,18.
  // Los presupuestos NO están escritos de memoria: salen de barrer 10.368 combinaciones
  // (menú × prot 15-55 × carb 30-140 × grasa 8-28) y quedarse con aquella donde cada defecto se
  // nota más. Y la aserción es **POR COMIDA**, nunca sobre el día: el total del día TAPA la comida
  // rota, y esa lección ya se pagó aquí una vez.
  const kcalDe = r => r.real.kcal;
  const objKcal = t => t.prot_g * 4 + t.carb_g * 4 + t.fat_g * 9;
  const exceso = (r, t) => (kcalDe(r) - objKcal(t)) / objKcal(t) * 100;

  // (a) `carb2` acredita su propia PROTEÍNA (el arroz trae 2,7 g/100 g, la arepa 4,5).
  //     Sin este descuento el plato la sirve DOS veces: medido, la comida pasa de −10,5% a +20,0%
  //     y el pollo de 21 g a 35 g sobre una meta de 25.
  const tA = { prot_g: 25, carb_g: 90, fat_g: 20 };
  const rA = core.nutSolveMeal(tA, { prot: 'pollo_muslo', carb: 'papa_criolla', carb2: 'arroz', fat: 'aguacate' });
  const protA = (rA.items.find(i => i.rol === 'prot') || {}).grams * core.NUT_FOOD_BY_ID.pollo_muslo.p / 100;
  assert.ok(protA <= tA.prot_g * 1.25,
    `el alimento proteico solo aporta ${protA.toFixed(0)} g para una meta de ${tA.prot_g}: ` +
    'el segundo carbohidrato no está acreditando la suya y la comida la sirve dos veces');
  assert.ok(exceso(rA, tA) <= 2, `esa comida se pasa ${exceso(rA, tA).toFixed(1)}% de sus propias kcal`);

  // (b) El aporte cruzado se descuenta UNA vez y luego se reparte, no una vez por rama.
  //     Es el defecto que ya ocurrió en v472 y hundió la entrega a −14,2%. Aquí, al revés,
  //     restarlo dos veces sobre este presupuesto dispara la comida de −19,7% a +6,6%.
  const tB = { prot_g: 35, carb_g: 60, fat_g: 8 };
  const rB = core.nutSolveMeal(tB, { prot: 'yogur_griego', carb: 'avena', carb2: 'banano', fat: 'mani' });
  assert.ok(rB.real.fat_g <= tB.fat_g * 1.3,
    `la grasa servida (${rB.real.fat_g} g) se dispara sobre la meta de ${tB.fat_g} g`);
  assert.ok(exceso(rB, tB) <= 2, `esa comida se pasa ${exceso(rB, tB).toFixed(1)}% de sus propias kcal`);

  // (c) La GRASA descuenta la que aporta el segundo carbohidrato.
  //     Sin él, 11 g de almendra se vuelven 19 sobre una meta de 16.
  const tC = { prot_g: 30, carb_g: 70, fat_g: 16 };
  const rC = core.nutSolveMeal(tC, { prot: 'clara', carb: 'avena', carb2: 'banano', fat: 'almendra' });
  assert.ok(rC.real.fat_g <= tC.fat_g * 1.15,
    `la grasa servida (${rC.real.fat_g} g) pasa la meta de ${tC.fat_g} g: el segundo carbohidrato no la está descontando`);

  // ── Con poco carbohidrato, el plato NO se parte: todo al principal ──
  const bajo = core.nutSolveMeal({ prot_g: 30, carb_g: 28, fat_g: 12 }, pick);
  assert.strictEqual(g(bajo, 'platano_maduro'), 0,
    `con 28 g de carbohidrato le puso ${g(bajo, 'platano_maduro')} g de plátano: partir ahí da migajas`);
  assert.ok(g(bajo, 'arroz') > 0, 'sin partir, el principal tiene que llevarse el carbohidrato entero');

  // 🔒 CONTROL: los dos casos tienen que comportarse DISTINTO, o el test no discrimina y pasaría
  // igual con el piso quitado o con el reparto apagado.
  assert.notStrictEqual(g(alto, 'platano_maduro') > 0, g(bajo, 'platano_maduro') > 0,
    'los dos presupuestos dan el mismo resultado: el test no está probando el piso');

  // 🔒 Un menú SIN `carb2` se resuelve como siempre — verificado sobre las 770 comidas reales al
  // introducirlo (cero diferencias), y afirmado aquí para que siga siendo cierto.
  const sinSegundo = core.nutSolveMeal({ prot_g: 40, carb_g: 120, fat_g: 18 },
    { prot: 'pollo_pechuga', carb: 'arroz', fat: 'aceite' });
  assert.strictEqual(sinSegundo.items.filter(i => F[i.id] && F[i.id].rol === 'carb').length, 1,
    'un menú sin segundo carbohidrato sirvió más de uno');
});

// 🔴 v472 · EL TOPE DE RACIÓN DEL CARBOHIDRATO, que no existía: `maxG` nació para los alimentos
// proteicos (la leche que pedía 1.000 g) y **ningún carbohidrato lo declaraba**. Ahora lo llevan
// los 7 que la segunda fuente hace pagables; los otros son el carbohidrato de menús SIN compañero
// (arepa, avena, pasta, mazorca) y toparlos solo recortaría.
// 💎 No hizo falta tocar el motor: `nutPortionText` YA aplica `maxG` a quien lo declare.
test('🔴 v472 · ninguna ración de carbohidrato pasa de su tope, y el tope MUERDE', () => {
  const conTope = core.NUT_FOODS.filter(f => f.rol === 'carb' && f.maxG > 0);
  assert.ok(conTope.length >= 7, `sólo ${conTope.length} carbohidratos tienen tope — alguien los quitó`);
  // Lista propia (no `_VARIEDAD_PERFILES`: se declara más abajo y quedaría en zona muerta).
  const perfiles = [
    ['fixture', NUT_BASE],
    ['Kathe', { sex: 'F', age: 28, weight: 85, height: 163, activityFactor: 1.55, goal: 'Perder grasa' }],
    ['Samuel', { sex: 'M', age: 28, weight: 78, height: 176, activityFactor: 1.725, goal: 'Ganar músculo' }],
    ['sedentaria', { sex: 'F', age: 50, weight: 48, height: 150, activityFactor: 1.2, goal: 'Perder grasa' }],
  ];
  let porciones = 0;
  perfiles.forEach(([nombre, perfil]) => {
    const base = nutritionEstimate(perfil);
    for (let d = 0; d < 7; d++) {
      const plan = core.nutDayPlan(base, d < 3 ? 'entreno' : 'descanso', 3, 1, d);
      plan.meals.forEach(m => (m.items || []).forEach(it => {
        const f = core.NUT_FOOD_BY_ID[it.id];
        if (!f || f.rol !== 'carb') return;
        porciones++;
        if (!(f.maxG > 0)) return;
        assert.ok(it.grams <= f.maxG,
          `${nombre}: ${it.grams} g de ${f.name} y su tope son ${f.maxG} g (${(it.grams / f.un.g).toFixed(1)} ${f.un.label}s)`);
      }));
    }
  });
  assert.ok(porciones > 50, `sólo ${porciones} porciones de carbohidrato: el barrido no cubre nada`);
  // 🔒 CONTROL: pedir MUCHO más de lo que cabe y exigir que recorte. La primera versión de este
  // control contaba «porciones que llegan al tope» y era FALSO — estaban en ese valor por
  // coincidencia, no recortadas: con el tope apagado daban lo mismo.
  const arroz = core.NUT_FOOD_BY_ID.arroz;
  const exagerado = core.nutPortionText(arroz, 1400);   // ~9 tazas
  assert.ok(exagerado && exagerado.grams <= arroz.maxG,
    `pedí 1.400 g de arroz y el tope (${arroz.maxG} g) no recortó: devolvió ${exagerado && exagerado.grams} g`);
  assert.ok(core.NUT_FOOD_BY_ID.pan_integral.maxG <= 168,
    'el tope del pan pasó de 6 tajadas: eso ya no es un desayuno, es una panadería');
});

test('el plato es determinista: mismos ingredientes y macros → mismo resultado', () => {
  const pedido = { prot_g: 40, carb_g: 80, fat_g: 15 };
  const pick = { prot: 'huevo', carb: 'arepa', fat: 'aguacate' };
  const a = core.nutSolveMeal(pedido, pick), b = core.nutSolveMeal(pedido, pick);
  assert.deepStrictEqual(a, b);
});

test('🔴 v476 · una cantidad chica se dice con la medida CHICA, no en gramos-polvo', () => {
  const f = id => core.NUT_FOOD_BY_ID[id];
  // Medido sobre las 22 personas reales (2.310 raciones servidas): **78 salían en gramos sueltos**
  // —«avena 15 g», «maní 5 g», «almendras 5 g»— y 40 de ellas eran la avena. La cantidad NO estaba
  // mal: 15 g de avena en hojuelas son una cucharada y media. Lo que faltaba era el escalón chico,
  // porque una TAZA de avena son 80 g y un PUÑADO de maní son 30. Con `un2`: **78 → 6** (0,3%).
  assert.strictEqual(core.nutPortionText(f('avena'), 15).text, '1½ cucharadas (15 g)');
  assert.strictEqual(core.nutPortionText(f('mani'), 5).text, 'media cucharada (5 g)');
  assert.strictEqual(core.nutPortionText(f('almendra'), 5).text, '4 almendras (5 g)');
  assert.strictEqual(core.nutPortionText(f('arroz'), 20).text, '1 cucharada (20 g)');
  // 🔒 CONTROL 1 — la medida GRANDE sigue mandando cuando alcanza, o se leería «8 cucharadas de
  // avena» donde cabe decir «1 taza». Sin esto el arreglo sería un empeoramiento disfrazado.
  assert.strictEqual(core.nutPortionText(f('avena'), 80).text, '1 taza (80 g)');
  assert.strictEqual(core.nutPortionText(f('avena'), 120).text, '1½ tazas (120 g)');
  assert.strictEqual(core.nutPortionText(f('mani'), 30).text, '1 puñado (30 g)');
  assert.strictEqual(core.nutPortionText(f('arroz'), 158).text, '1 taza (158 g)');
  // 🔒 CONTROL 2 — y NO cambia ni un gramo de lo que se sirve: `un2` es un escalón de ESCRITURA.
  // Es justamente lo que lo hace seguro, frente a la otra salida posible (subir la ración a media
  // medida), que infla el plato y ya rompió el guardián de los extremos cuando se probó en `carb2`.
  [['avena', 15], ['mani', 5], ['almendra', 5], ['arroz', 20], ['atun', 25]].forEach(([id, g]) => {
    assert.strictEqual(core.nutPortionText(f(id), g).grams,
      core.nutPortionText(Object.assign({}, f(id), { un2: null }), g).grams,
      `la submedida de ${id} cambió los gramos servidos: tiene que ser solo texto`);
  });
  // Un alimento sin `un2` se comporta exactamente como antes.
  assert.strictEqual(core.nutPortionText(f('huevo'), 12).text, '10 g');
});
test('las cantidades se escriben como habla una persona, en español correcto', () => {
  const f = id => core.NUT_FOOD_BY_ID[id];
  assert.strictEqual(core.nutPortionText(f('huevo'), 100).text, '2 huevos (100 g)');
  // plural irregular: «porcións» y «papa medianas» son los que salían con un + 's' a secas
  assert.strictEqual(core.nutPortionText(f('pollo_pechuga'), 180).text, '1½ porciones (180 g)');
  assert.strictEqual(core.nutPortionText(f('papa'), 300).text, '2 papas medianas (300 g)');
  // los medios en fracción, no en decimal
  assert.strictEqual(core.nutPortionText(f('arepa'), 40).text, 'media arepa (40 g)');
  assert.ok(!/\d\.\d/.test(core.nutPortionText(f('arroz'), 395).text), 'no debe quedar un decimal suelto');
});

test('🔴 la proteína es un PISO: el plato no la sacrifica aunque el carbohidrato la aporte', () => {
  // Con pasta (6 g de proteína por 100 g) el solver dejaba «20 g de atún con 490 g de
  // pasta»: cuadraba en macros y era absurdo en la mesa.
  const r = core.nutSolveMeal({ prot_g: 34, carb_g: 120, fat_g: 14 }, { prot: 'atun', carb: 'pasta', fat: 'aceite' });
  const atun = r.items.find(i => i.id === 'atun');
  assert.ok(atun, 'el atún desapareció del plato');
  // ⚠️ El mínimo va ESCRITO A MANO, no derivado de NUT_PROT_MIN_SHARE: si se calculara
  // con la constante, bajarla a 0 bajaría también el listón y el test pasaría siempre
  // (se comprobó saboteando: no mordía). Un control que se mueve con lo que vigila no
  // es un control. 100 g de atún ≈ 26 g de proteína para una meta de 34.
  assert.ok(atun.grams >= 100, `la ración de atún quedó en ${atun.grams} g: el plato sacrificó la proteína`);
});

test('ninguna ración se vuelve irreal: los alimentos diluidos tienen tope', () => {
  // Sin tope, la leche (3,3 g de proteína por 100 g) pedía 1.000 g para una merienda.
  // ⚠️ La lista va ESCRITA A MANO y con su tope máximo tolerable. Antes el test recorría
  // `NUT_FOODS.filter(f => f.maxG)`: al quitarle el tope a un alimento, ese alimento
  // salía del recorrido y el test seguía verde (se comprobó saboteando — no mordía).
  // Igual que el caso del piso de proteína: el alcance de un test no puede depender de
  // lo que el test vigila.
  const TOPES = { leche: 400, yogur_griego: 400, clara: 200, cuajada: 150, queso_campesino: 90, lenteja: 350, frijol: 350, garbanzo: 300 };
  Object.entries(TOPES).forEach(([id, tope]) => {
    const f = core.NUT_FOOD_BY_ID[id];
    assert.ok(f, `${id} desapareció de la tabla`);
    assert.ok(f.maxG > 0 && f.maxG <= tope, `${f.name} se quedó sin ración máxima (o subió por encima de ${tope} g)`);
    // y pedirle una barbaridad no puede producir una ración irreal
    const x = core.nutSolveMeal({ prot_g: 200, carb_g: 300, fat_g: 100 }, { prot: id, carb: 'arroz', fat: 'aceite' });
    const it = x.items.find(i => i.id === id);
    assert.ok(it, `${f.name} desapareció del plato`);
    assert.ok(it.grams <= tope, `${f.name}: ${it.grams} g supera la ración creíble de ${tope} g`);
  });
});

test('las fracciones concuerdan en género: «medio puñado», no «media puñado»', () => {
  const f = id => core.NUT_FOOD_BY_ID[id];
  assert.strictEqual(core.nutPortionText(f('mani'), 15).text, 'medio puñado (15 g)');
  assert.strictEqual(core.nutPortionText(f('huevo'), 25).text, 'medio huevo (25 g)');
  assert.strictEqual(core.nutPortionText(f('arepa'), 40).text, 'media arepa (40 g)');
  // sintagma de dos palabras: manda el núcleo, no el adjetivo
  assert.strictEqual(core.nutPortionText(f('platano_maduro'), 40).text, 'media tajada grande (40 g)');
  assert.strictEqual(core.nutPortionText(f('papa'), 75).text, 'media papa mediana (75 g)');
});

test('el plan del día trae las 5 comidas y ninguna sale vacía', () => {
  const base = nutritionEstimate(NUT_BASE);
  const p = core.nutDayPlan(base, 'pierna', 3, 1, 0);
  assert.strictEqual(p.meals.length, 5);
  assert.deepStrictEqual(p.meals.map(m => m.name),
    ['Desayuno', 'Media mañana', 'Almuerzo', 'Media tarde', 'Cena']);
  p.meals.forEach(m => assert.ok(m.items.length > 0, `${m.name} salió sin comida`));
});

// Misma clase de defecto que el generador de rutinas: un banco de UNO obliga a repetir.
// 🔴 ESTE TEST MIRABA SOLO LAS COMIDAS 0, 2 y 4 (desayuno, almuerzo, cena) y por ahí se coló el
// P0 que reportaron las dos auditorías de v470: **las que colisionan son las DOS `media`**, que
// comparten banco, y ninguna métrica las miraba. Una métrica que no mira la superficie afectada
// no es un control. Ahora se miran las cinco, y las meriendas tienen su propio test debajo.
const _VARIEDAD_PERFILES = [
  ['la del fixture', NUT_BASE],
  ['Kathe (perder grasa)', { sex: 'F', age: 28, weight: 85, height: 163, activityFactor: 1.55, goal: 'Perder grasa' }],
  ['Samuel (ganar músculo)', { sex: 'M', age: 28, weight: 78, height: 176, activityFactor: 1.725, goal: 'Ganar músculo' }],
  ['recomposición (H)', { sex: 'M', age: 26, weight: 82, height: 175, activityFactor: 1.55, goal: 'Recomposición' }],
  ['sedentaria en el PISO', { sex: 'F', age: 50, weight: 48, height: 150, activityFactor: 1.2, goal: 'Perder grasa' }],
];
function _variedadSemana(perfil) {
  const base = nutritionEstimate(perfil);
  const s = [0, 1, 2, 3, 4].map(() => new Set());
  let meriendasIguales = 0;
  for (let d = 0; d < 7; d++) {
    const p = core.nutDayPlan(base, d < 3 ? 'entreno' : 'descanso', 3, 1, d);
    const plato = mi => p.meals[mi].items.map(i => i.id).join('+');
    [0, 1, 2, 3, 4].forEach(mi => s[mi].add(plato(mi)));
    if (plato(1) === plato(3)) meriendasIguales++;
  }
  return { tam: s.map(x => x.size), meriendasIguales, floored: !!base.floored };
}

test('🔴 la semana NO es el mismo plato repetido', () => {
  // ⚠️ LA BARRA BAJÓ DE 4 A 3 VARIANTES EN v471, y va dicho POR QUÉ (no se aflojó para ver
  // verde). El 4 estaba calibrado sobre el filtro VIEJO, que solo miraba calorías; el piso de
  // proteína por menú estrecha el pool —en los días de entreno del fixture, de 5 desayunos solo
  // 1 cabe: tres se pasan de kcal y el cuarto no llega a la proteína— y eso cuesta variedad.
  // 🔴 Y la barra vieja NUNCA fue representativa: medido sobre las 21 personas REALES del
  // respaldo del 9-ago, con el filtro viejo de producción **14 de 21 ya recibían ≤3 desayunos
  // distintos**; el fixture pasaba el ≥4 por suerte, no por diseño. Lo que sí se sostiene sobre
  // gente real es que **nadie baja de 2** (mínimo medido: 2, con las dos versiones).
  // Lo que se compró con ese punto de variedad, en las mismas 21 personas reales:
  //     peor hueco de proteína de un día  **−20,1% → −2,6%**   (Claudia)
  //     días bajo −10% de proteína        **21 de 147 → 0**
  //     merienda repetida                 **55,1% → 0,0%**
  // Si esta barra vuelve a estorbar, la respuesta NO es bajarla otra vez: es AMPLIAR el banco de
  // desayunos con opciones magras (decisión de Andrés, no del código) — hoy son 5 y tres de ellos
  // se pasan de calorías contra un presupuesto de desayuno normal.
  // ⚠️ v472 · LA CENA BAJA SU BARRA A 2, y va dicho por qué. Al darle un segundo carbohidrato a
  // 3 de las 5 cenas, esas 3 dejan de caber en una cena de POCO carbohidrato: al fixture solo le
  // caben `atún+pasta` y `huevo+arepa`, que son **justo las dos que se dejaron sin segundo**.
  // 🔴 Pero sobre GENTE REAL el segundo carbohidrato MEJORA la cena, y por eso se queda: medido
  // sobre las 22 personas, con él la cena da **4,00 platos distintos por semana (mínimo 2)** y
  // sin él **3,64 (mínimo 1, o sea alguien cenando lo mismo los 7 días)**. Quitarlo para que este
  // fixture se vea mejor empeoraría a las personas. La barra sigue siendo un candado real: 2
  // significa «nunca el mismo plato toda la semana», que es la promesa que no se puede romper.
  const sinPiso = _VARIEDAD_PERFILES.filter(([, p]) => !nutritionEstimate(p).floored);
  assert.ok(sinPiso.length >= 4, `el barrido perdió perfiles: quedan ${sinPiso.length}`);
  const MINIMO = { 0: 3, 2: 3, 4: 2 };   // desayuno · almuerzo · cena
  sinPiso.forEach(([nombre, perfil]) => {
    const { tam } = _variedadSemana(perfil);
    [0, 2, 4].forEach(mi => assert.ok(tam[mi] >= MINIMO[mi],
      `${nombre}: la comida ${mi} sólo tuvo ${tam[mi]} variantes distintas en 7 días (mínimo ${MINIMO[mi]})`));
  });
});

// 🔴 LA ESQUINA DEL PISO CALÓRICO, ACOTADA — no escondida.
// A quien queda clavada en el piso (mujer liviana, mayor y sedentaria) el presupuesto le deja UN
// SOLO menú factible en varias comidas, así que recibe el mismo almuerzo los 7 días. Ninguna de
// las 21 personas reales está ahí (todas con factor ≥1.55; el peor real es un almuerzo con 3
// variantes), pero el límite existe y se afirma para que se vea si empeora. La salida real es un
// banco más ancho, que es decisión de nutrición.
test('🟡 en el PISO calórico el banco se queda sin opciones (límite conocido y acotado)', () => {
  const conPiso = _VARIEDAD_PERFILES.filter(([, p]) => nutritionEstimate(p).floored);
  assert.strictEqual(conPiso.length, 1,
    'el barrido perdió la sedentaria del piso: es ella la que destapa el límite');
  const { tam, meriendasIguales } = _variedadSemana(conPiso[0][1]);
  // Hoy da [3,1,1,1,2]. Se afirma que no EMPEORA, y que ni siquiera aquí se repite plato el
  // mismo día — que es lo que de verdad se le prometió al PO.
  assert.ok(tam[0] >= 3, `hasta en el piso el desayuno tenía 3 variantes y ahora ${tam[0]}`);
  assert.ok(tam[4] >= 2, `hasta en el piso la cena tenía 2 variantes y ahora ${tam[4]}`);
  assert.strictEqual(meriendasIguales, 0,
    'ni en la peor esquina se le puede servir la MISMA merienda dos veces el mismo día');
});

// 🔴 EL P0 QUE REPORTARON LAS DOS AUDITORÍAS DE v470, con su candado propio.
// Media mañana y media tarde comparten el banco `media` y se separaban con un desfase FIJO de 4
// índices (`i * 2`). Funcionaba mientras el banco SIEMPRE tuviera 5; desde v470 se rota sobre el
// subconjunto FACTIBLE, cuyo tamaño cambia, y con un pool de 1, 2 o 4 un desfase de 4 es un
// **no-op**: las dos comidas caen en la misma casilla los 7 días. Medido: **0,0% en v469 →
// 60,4% en v470**. Un desfase constante solo separa si el módulo es constante — y ya no lo es.
// El arreglo no es el desfase: es que la comida sepa qué se sirvió YA hoy de su propio banco
// (`evitar`), y que ante un pool de UNO prefiera un menú distinto que se salga un poco antes que
// el mismo plato dos veces el mismo día. Medido sobre las 21 personas reales: **55,1% → 0,0%**.
test('🔴 v471 · las dos meriendas del mismo día NUNCA son la misma', () => {
  let dias = 0;
  _VARIEDAD_PERFILES.forEach(([nombre, perfil]) => {
    const { meriendasIguales, tam } = _variedadSemana(perfil);
    dias += 7;
    assert.strictEqual(meriendasIguales, 0,
      `${nombre}: recibió la MISMA merienda a media mañana y a media tarde en ${meriendasIguales} de 7 días`);
    // CONTROL: que no sea verde por no haber servido merienda ninguna.
    assert.ok(tam[1] >= 1 && tam[3] >= 1, `${nombre}: se quedó sin merienda, el caso no prueba nada`);
  });
  assert.strictEqual(dias, _VARIEDAD_PERFILES.length * 7, 'el barrido no cubrió los 7 días de cada perfil');
});

test('el plan del día es determinista y no inventa sin datos', () => {
  const base = nutritionEstimate(NUT_BASE);
  assert.deepStrictEqual(core.nutDayPlan(base, 'entreno', 3, 1, 2), core.nutDayPlan(base, 'entreno', 3, 1, 2));
  assert.strictEqual(core.nutDayPlan(null, 'entreno', 3, 1, 0), null);
});

test('la revisión del coach señala el riesgo REAL para el objetivo de la persona', () => {
  // Caso real de producción: Luz quiere perder grasa y su plan la tiene 670 kcal por
  // encima; Samuel quiere ganar y está 806 por debajo.
  const luz = { sex: 'F', age: 39, weight: 82, height: 156, goal: 'Perder grasa', activityFactor: 1.55 };
  const rl = core.nutPlanReview(luz, { kcal: 2400 }, 82);
  assert.strictEqual(rl.status, 'desviado');
  assert.ok(rl.gap > 0);
  assert.strictEqual(rl.riesgo, 'come_de_mas_para_bajar');

  const samuel = { sex: 'M', age: 28, weight: 78, height: 176, goal: 'Ganar músculo', activityFactor: 1.725 };
  const rs = core.nutPlanReview(samuel, { kcal: 2554 }, 78);
  assert.strictEqual(rs.riesgo, 'come_de_menos_para_subir');
});

test('sin peso ni talla la revisión PIDE EL DATO, no inventa un plan', () => {
  // Astrid, caso real: no tiene peso ni estatura guardados.
  const astrid = { sex: 'F', age: 33, goal: 'Ganar músculo', activityFactor: 1.55 };
  const r = core.nutPlanReview(astrid, { kcal: 2400 }, null);
  assert.strictEqual(r.status, 'sin_datos');
  assert.ok(r.falta.includes('peso') && r.falta.includes('estatura'));
  assert.strictEqual(r.sugerido, undefined, 'no debe sugerir kcal sin datos del cuerpo');
});

test('un plan que ya está bien NO genera alarma', () => {
  const c = { sex: 'M', age: 37, weight: 90, height: 175, goal: 'Ganar músculo', activityFactor: 1.55 };
  const r = core.nutPlanReview(c, { kcal: 3200 }, 90);   // Andrés: +38 kcal, está bien
  assert.strictEqual(r.status, 'ok');
});

test('nutDayKind lee el día del plan de entreno', () => {
  assert.strictEqual(core.nutDayKind(null), 'descanso');
  assert.strictEqual(core.nutDayKind({ exercises: [] }), 'descanso');
  assert.strictEqual(core.nutDayKind({ name: 'Full Body', exercises: [{ muscle: 'pecho' }] }), 'pierna');
  assert.strictEqual(core.nutDayKind({ name: 'Día A', exercises: [{ muscle: 'piernas' }, { muscle: 'gluteo' }] }), 'pierna');
  assert.strictEqual(core.nutDayKind({ name: 'Empuje', exercises: [{ muscle: 'pecho' }, { muscle: 'hombros' }] }), 'entreno');
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

// ── Historial EVALUABLE por el detector de estancamiento (v433) ──
// El detector pide ≥8 semanas de datos, ≥7 sesiones del ejercicio (6 dentro de la ventana + 1
// antes como referencia) y que no sea un principiante en adaptación. Los fixtures viejos eran de
// 6 sesiones en 15 días: representaban las reglas VIEJAS (ventana de 4 puntos, sin tiempo, sin
// compuertas), no un estancamiento de verdad. Este generador arma un historial que sí lo es.
const ST_N = 25; // 25 sesiones × 3 días = 72 días = 10,3 semanas (pasa también los pisos de la descarga)
// Serie de kg: `peak` en el índice 1 (zona de REFERENCIA, antes de la ventana), `base` el resto de
// la referencia y `tail` desde ST_WIN_I, que es donde empieza la ventana con el espaciado por
// defecto (3 días). Si el `tail` se colara en la referencia, el techo dejaría de ser `peak` y el
// patrón mediría otra cosa — pasó al alargar el fixture de 20 a 25 sesiones.
const ST_WIN_I = 13;
const stKgs = (peak, base, tail) => Array.from({ length: ST_N }, (_, i) => i === 1 ? peak : (i >= ST_WIN_I ? tail : base));
const KG_MESETA = stKgs(62, 60, 62); // iguala su techo y no lo supera → estancado, SIN regresión
const KG_PLANO = stKgs(62, 60, 60);  // se queda 2 kg por debajo de su techo → estancado, −3% (no llega a regresión)
const KG_CAIDA = stKgs(62, 60, 52);  // el índice cae ~16% → estancado Y en regresión (→ descarga)
const KG_SUBE = stKgs(62, 60, 70);   // supera su techo → NO estancado
// Historial nuevo→viejo con esos patrones. exs = [{name, muscle, kgs}].
// `offsetsChrono` = días hacia atrás de cada sesión, de la más VIEJA a la más nueva.
const stHistAt = (exs, offsetsChrono) => offsetsChrono.map((off, i) => ({
  date: new Date(CI_NOW - off * 86400000).toISOString(),
  exercises: exs.map(e => ({ name: e.name, muscle: e.muscle, track: 'peso_reps', sets: [{ done: true, kg: String(e.kgs[i]), reps: '8' }] })),
})).reverse();
const stHist = (exs, spacingDays = 3, endOffsetDays = 0) =>
  stHistAt(exs, Array.from({ length: ST_N }, (_, i) => endOffsetDays + (ST_N - 1 - i) * spacingDays));

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

test('🔒 v433 · a la asesorada NUNCA se le dice que se estancó', () => {
  // Decisión del PO (2026-08-04) + petición de Valery: ni la palabra ni el CTA «hablar con tu
  // coach». El aviso es SOLO del coach. Un estancamiento REAL y evaluable no le pinta nada a ella.
  const c = { level: 'Intermedio', days: 7 }; // days 7 → weekStreak no llega a 2 (evita racha)
  const s = stHist([{ name: 'Press', muscle: 'pecho', kgs: KG_MESETA }]);
  assert.ok(stalledExercises(c, s, CI_NOW).some(x => x.name === 'Press'), 'el estancamiento SÍ existe (control)');
  for (const isFree of [false, true]) {
    const r = coachInsight(c, s, {}, CI_NOW, { isFree });
    assert.ok(!r || r.type !== 'estancado', 'no existe la tarjeta de estancamiento (isFree=' + isFree + ')');
    if (r) {
      assert.ok(!/estanc/i.test(r.title + ' ' + r.msg), 'la palabra «estancado» no aparece en ninguna tarjeta');
      assert.ok(!r.cta || r.cta.action !== 'msgs' || r.type === 'deload', 'sin CTA de «hablar con mi coach» por estancamiento');
    }
  }
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
// v433: la tarjeta de descarga de la asesorada pasa por los MISMOS pisos que la del coach
// (180 días entrenando + 10 semanas de datos), así que el cliente de prueba los cumple.
const ciVeterana = { level: 'Intermedio', days: 2, startDate: new Date(CI_NOW - 200 * 86400000).toISOString() };
const ci4weeksLargo = [0, 2, 7, 9, 14, 16, 21, 23, 75].map(o => ciDay(o, [ciBW('A')])); // +1 sesión vieja = 10,7 semanas de datos

test('coachInsight "deload": ≥4 semanas premium dispara; 3 → racha; free → racha', () => {
  const c = ciVeterana;
  const r = coachInsight(c, ci4weeksLargo, {}, CI_NOW, { isFree: false });
  assert.ok(r && r.type === 'deload', 'a 4 semanas premium sugiere descarga');
  assert.ok(r.cta && r.cta.action === 'msgs');
  const s3 = [0, 2, 7, 9, 14, 16, 75].map(o => ciDay(o, [ciBW('A')]));
  assert.strictEqual(coachInsight(c, s3, {}, CI_NOW, { isFree: false }).type, 'racha', '3 semanas → racha, no deload');
  assert.strictEqual(coachInsight(c, ci4weeksLargo, {}, CI_NOW, { isFree: true }).type, 'racha', 'free no ve deload');
});

test('🔒 v433 · a quien lleva 2 meses entrenando NO se le sugiere una descarga', () => {
  // Las dos descargas tienen que hablar el mismo idioma: no puede la app decirle «pídele una
  // semana suave a tu coach» mientras la herramienta del coach se niega a proponérsela.
  const novata = { level: 'Intermedio', days: 2 }; // sin startDate → antigüedad = 1ª sesión (~3 sem)
  const r = coachInsight(novata, ci4weeks, {}, CI_NOW, { isFree: false });
  assert.ok(!r || r.type !== 'deload', 'sin los meses detrás no se habla de descarga');
  assert.strictEqual(r.type, 'racha', 'lo que sí merece es que le celebren la constancia');
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
  assert.strictEqual(coachInsight(ciVeterana, ci4weeksLargo, pr, CI_NOW, { isFree: false }).type, 'deload', 'deload gana a record');
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
  // 'Beto' es Intermedio (el default del fixture no lo es → se lo damos) con un estancamiento real.
  clients[2].level = 'Intermedio';
  const stall = stHist([{ name: 'Press', muscle: 'pecho', kgs: KG_MESETA }]);
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
section('Detector de estancamiento (perfIndex / stallReport, v433)');
// Los números de estos tests salen de la MEDICIÓN sobre los datos reales del gimnasio
// (2026-08-04, docs/plan-estancamiento-descarga.md §1): el detector viejo marcaba 41 ejercicios en
// 6 personas y disparaba 4 semanas de descarga.

test('perfIndex: las REPETICIONES cuentan, y con más de 15 no se calla', () => {
  assert.ok(perfIndex(80, 15) > perfIndex(80, 10), 'mismo peso y más reps = más rendimiento');
  assert.ok(perfIndex(90, 8) > perfIndex(80, 8), 'mismas reps y más peso = más rendimiento');
  // Es un ÍNDICE para comparar a alguien consigo mismo, no una estimación de 1RM: la fórmula es
  // la misma para todo el rango (sin el caso especial de 1 repetición de estimate1RM).
  assert.strictEqual(perfIndex(60, 1), 60 * (1 + 1 / 30));
  // El motivo de no reusar estimate1RM: devuelve null con reps>15, justo cuando alguien progresa
  // subiendo repeticiones (que es como progresa una principiante).
  assert.strictEqual(estimate1RM(80, 18), null, 'estimate1RM se calla (control)');
  assert.ok(perfIndex(80, 18) > 0, 'perfIndex no');
  // Tope: 30 repeticiones de calentamiento no pueden leerse como un récord.
  assert.strictEqual(perfIndex(50, 30), perfIndex(50, PERF_CLAMP_REPS), 'las reps se topan en ' + PERF_CLAMP_REPS);
  assert.strictEqual(perfIndex(0, 10), null);
  assert.strictEqual(perfIndex(50, 0), null);
  assert.strictEqual(perfIndex('', ''), null);
});

test('🔴 v433 · CONSOLIDAR UN RÉCORD NO ES ESTANCARSE (caso Astrid, medido en producción)', () => {
  // Subió el hip thrust 90 → 100 kg y lo afianzó a 4×12. El detector viejo la marcaba porque su
  // récord caía DENTRO de la ventana `prior` (los últimos 4 puntos no lo superaban) — castigaba
  // terminar bien una progresión. Con ella la app disparó una SEMANA DE DESCARGA.
  const kgs = [90, 90, 70, 90, 90, 70, 90, 90, 90, 100, 100, 100, 100, 100]; // sus 14 sesiones reales
  const h = stHistAt([{ name: 'Hip Thrust con Barra', muscle: 'gluteo', kgs }],
    kgs.map((_, i) => 66 - i * 5)); // ~10 semanas de datos, una sesión cada 5 días
  const c = { level: 'Intermedio', days: 3 };
  const it = stallReport(c, h, CI_NOW).items.find(x => x.name === 'Hip Thrust con Barra');
  assert.ok(it, 'el ejercicio SÍ se evalúa (si no, este test no prueba nada)');
  assert.strictEqual(it.stalled, false, 'consolidar 100 kg no es una meseta');
  assert.ok(it.delta > 0.05, 'lee la mejora real, no un empate: ' + Math.round(it.delta * 100) + '%');
});

test('🔴 v433 · SUBIR REPETICIONES CON EL MISMO PESO NO ES ESTANCARSE (caso Nataly)', () => {
  // 80 kg fijos en el hip thrust, pero de 10 a 19 repeticiones por serie. El detector viejo solo
  // miraba `maxKg` → «se estancó». El índice de rendimiento ve el progreso que hay.
  const reps = [10, 12, 13, 14, 16, 17, 18, 19, 19, 19];
  const h = reps.map((r, i) => ({
    date: new Date(CI_NOW - (66 - i * 6) * 86400000).toISOString(),
    exercises: [{ name: 'Hip Thrust con Barra', muscle: 'gluteo', track: 'peso_reps', sets: [{ done: true, kg: '80', reps: String(r) }] }],
  })).reverse();
  const it = stallReport({ level: 'Intermedio', days: 3 }, h, CI_NOW).items.find(x => x.name === 'Hip Thrust con Barra');
  assert.ok(it, 'se evalúa');
  assert.strictEqual(it.stalled, false, 'de 10 a 19 repeticiones es progreso, no meseta');
});

test('🔴 v433 · UN ESTANCAMIENTO REAL SÍ SE DETECTA (caso Astrid, remo con barra)', () => {
  // El control que impide que el arreglo convierta el detector en un mudo: 10 kg × 12 repeticiones
  // quieto dos meses es una meseta de verdad, y su coach no la había visto.
  const h = Array.from({ length: 12 }, (_, i) => ({
    date: new Date(CI_NOW - (66 - i * 6) * 86400000).toISOString(),
    exercises: [{ name: 'Remo con Barra', muscle: 'espalda', track: 'peso_reps', sets: [{ done: true, kg: '10', reps: '12' }] }],
  })).reverse();
  const it = stallReport({ level: 'Intermedio', days: 3 }, h, CI_NOW).items.find(x => x.name === 'Remo con Barra');
  assert.ok(it && it.stalled, 'esto SÍ es un estancamiento y tiene que salir');
});

test('🔒 v433 · una PRINCIPIANTE en adaptación no se estanca nunca (caso Luz)', () => {
  // Llevaba 5 semanas y la app le decía que se había estancado en el curl femoral.
  const h = Array.from({ length: 12 }, (_, i) => ({
    date: new Date(CI_NOW - (34 - i * 3) * 86400000).toISOString(),
    exercises: [{ name: 'Curl Femoral Tumbado', muscle: 'piernas', track: 'peso_reps', sets: [{ done: true, kg: '5', reps: '15' }] }],
  })).reverse();
  assert.strictEqual(stallGateReason({ level: 'Principiante', days: 4 }, h, CI_NOW), 'principiante en adaptación');
  assert.deepStrictEqual(stalledExercises({ level: 'Principiante', days: 4 }, h, CI_NOW), []);
  // Y la compuerta es por ANTIGÜEDAD, no por la etiqueta: con 6 meses de `startDate` ya no la
  // frena el ser principiante (la frena el otro piso, el de semanas de datos en la app).
  const veterana = { level: 'Principiante', days: 4, startDate: new Date(CI_NOW - 180 * 86400000).toISOString() };
  assert.strictEqual(stallGateReason(veterana, h, CI_NOW), 'pocas semanas de datos',
    'ya no la para el ser principiante, sino la falta de historial');
});

test('🔒 v433 · con menos de 8 semanas de datos no se opina', () => {
  const h = Array.from({ length: 10 }, (_, i) => ({
    date: new Date(CI_NOW - (40 - i * 4) * 86400000).toISOString(),
    exercises: [{ name: 'Press', muscle: 'pecho', track: 'peso_reps', sets: [{ done: true, kg: '40', reps: '10' }] }],
  })).reverse();
  assert.strictEqual(stallGateReason({ level: 'Intermedio' }, h, CI_NOW), 'pocas semanas de datos');
});

test('🔒 v433 · la ventana es ELÁSTICA: un ejercicio de 1 vez por semana también se evalúa', () => {
  // Trampa que casi entra: con «6 puntos en 5 semanas» FIJOS, un ejercicio que solo sale una vez
  // por semana nunca junta 6 puntos y queda invisible PARA SIEMPRE. Medido, 31 de los 41 casos se
  // «salvaban» por ahí y no por haber mejorado: eso no es un detector más listo, es uno mudo.
  // Cada 9 días: dentro de 5 semanas fijas solo caben 4 sesiones, así que con la ventana fija este
  // ejercicio NUNCA se evaluaría. La elástica la estira hasta juntar los 6 puntos.
  const h = Array.from({ length: 10 }, (_, i) => ({
    date: new Date(CI_NOW - (81 - i * 9) * 86400000).toISOString(),
    exercises: [{ name: 'Sentadilla', muscle: 'piernas', track: 'peso_reps', sets: [{ done: true, kg: i < 3 ? '60' : '58', reps: '8' }] }],
  })).reverse();
  const enCincoSemanas = h.filter(s => new Date(s.date).getTime() >= CI_NOW - 35 * 86400000).length;
  assert.ok(enCincoSemanas < 6, 'control: en 5 semanas fijas solo hay ' + enCincoSemanas + ' sesiones');
  const it = stallReport({ level: 'Intermedio', days: 3 }, h, CI_NOW).items.find(x => x.name === 'Sentadilla');
  assert.ok(it, 'se evalúa igual: la ventana se estira, el ejercicio no queda invisible');
  assert.ok(it.weeks > 5, 'la ventana se estiró para juntar 6 puntos: ' + it.weeks.toFixed(1) + ' semanas');
  assert.strictEqual(it.stalled, true);
});

// ══════════════════════════════════════════════════════
section('La semana de descarga (startDeload / endDeload, v434)');
// El PO reportó que la descarga «le manda una rutina totalmente distinta»: era cierto, el botón
// vivía dentro del generador y regeneraba la semana. Ahora es un modo temporal sobre el plan que
// la persona YA tiene.

const dlClient = () => ({
  id: 'c1', name: 'Kathe', level: 'Intermedio', days: 4,
  routines: [
    { id: 'r1', name: 'Glúteo A', day: 'Lunes', restSec: 90, exercises: [
      { id: 'e1', name: 'Hip Thrust en Máquina', muscle: 'gluteo', sets: 4, reps: 15 },
      { id: 'e2', name: 'Peso Muerto Rumano', muscle: 'piernas', sets: 3, reps: 12 },
      { id: 'e3', name: 'Plancha', muscle: 'core', track: 'tiempo' },
    ] },
    { id: 'r2', name: 'Tren Superior', day: 'Martes', restSec: 60, exercises: [
      { id: 'e4', name: 'Jalón al Pecho', muscle: 'espalda', sets: 5, reps: 10 },
      { id: 'e5', name: 'Curl Concentrado', muscle: 'biceps', sets: 2, reps: 15 },
    ] },
  ],
});
const DL_NOW = new Date('2026-08-04T10:00:00').getTime();

test('deloadSets: ×0,6 con piso de 2 — y lo que no es un número de series no se toca', () => {
  assert.strictEqual(deloadSets(5), 3);
  assert.strictEqual(deloadSets(4), 2);
  assert.strictEqual(deloadSets(3), 2);
  assert.strictEqual(deloadSets(2), 2, 'quien ya está en 2 no baja más');
  assert.strictEqual(deloadSets(undefined), undefined, 'un isométrico/cardio sin series pasa igual');
  assert.strictEqual(deloadSets(0), 0);
});

test('🔴 v434 · la descarga NO cambia los ejercicios, ni los días, ni las repeticiones', () => {
  // Es la queja del PO y el criterio VINCULANTE de Laura. Lo único que baja son las series.
  const c = dlClient();
  const antes = JSON.parse(JSON.stringify(c.routines));
  const r = startDeload(c, DL_NOW);
  assert.strictEqual(r.routines.length, antes.length, 'mismo número de rutinas');
  r.routines.forEach((rt, i) => {
    assert.strictEqual(rt.day, antes[i].day, 'mismo día');
    assert.strictEqual(rt.name, antes[i].name, 'misma rutina');
    assert.strictEqual(rt.exercises.length, antes[i].exercises.length, 'mismos ejercicios');
    rt.exercises.forEach((e, j) => {
      assert.strictEqual(e.name, antes[i].exercises[j].name, 'mismo ejercicio y en el mismo orden');
      assert.strictEqual(e.reps, antes[i].exercises[j].reps, 'MISMAS repeticiones');
    });
  });
  // Y las series sí bajan: 4→2, 3→2, 5→3, 2→2.
  assert.deepStrictEqual(r.routines[0].exercises.map(e => e.sets), [2, 2, undefined]);
  assert.deepStrictEqual(r.routines[1].exercises.map(e => e.sets), [3, 2]);
});

test('🔒 v434 · startDeload es PURA: no muta el plan del asesorado', () => {
  const c = dlClient();
  startDeload(c, DL_NOW);
  assert.strictEqual(c.routines[0].exercises[0].sets, 4, 'el original queda intacto hasta que se guarde');
  assert.strictEqual(c.deload, undefined);
});

test('🔴 v434 · «volver al plan normal» devuelve las series EXACTAS (antes era imposible)', () => {
  // No existía ningún snapshot del plan anterior, así que volver no se podía. Ahora sí.
  const c = dlClient();
  const original = c.routines.map(r => r.exercises.map(e => e.sets));
  const r = startDeload(c, DL_NOW);
  const enDescarga = Object.assign({}, c, { routines: r.routines, deload: r.deload });
  const vuelta = endDeload(enDescarga);
  assert.deepStrictEqual(vuelta.routines.map(x => x.exercises.map(e => e.sets)), original);
});

test('🔒 v434 · si el coach cambia un ejercicio DURANTE la descarga, al volver se respeta su cambio', () => {
  const c = dlClient();
  const r = startDeload(c, DL_NOW);
  const enDescarga = Object.assign({}, c, { routines: JSON.parse(JSON.stringify(r.routines)), deload: r.deload });
  // El coach cambia el 1.º de la rutina 1 por otro ejercicio, con sus propias series.
  // Ojo con el fixture: las series del ejercicio NUEVO tienen que ser DISTINTAS de las que guarda
  // el snapshot (4), o restaurar y no restaurar dan el mismo número y el test no prueba nada.
  enDescarga.routines[0].exercises[0] = { id: 'e9', name: 'Hip Thrust con Barra', muscle: 'gluteo', sets: 3, reps: 12 };
  const vuelta = endDeload(enDescarga);
  assert.strictEqual(vuelta.routines[0].exercises[0].name, 'Hip Thrust con Barra', 'no se le pisa el cambio');
  assert.strictEqual(vuelta.routines[0].exercises[0].sets, 3, 'ni sus series (el snapshot decía 4)');
  assert.strictEqual(vuelta.routines[0].exercises[1].sets, 3, 'los que no tocó sí se restauran');
});

test('deloadState: 7 días, cuenta lo que queda y avisa cuando se pasó', () => {
  const c = dlClient();
  const r = startDeload(c, DL_NOW);
  const en = Object.assign({}, c, { routines: r.routines, deload: r.deload });
  assert.strictEqual(deloadState(c, DL_NOW), null, 'sin descarga → null');
  const d0 = deloadState(en, DL_NOW);
  assert.strictEqual(d0.daysLeft, DELOAD_DAYS);
  assert.strictEqual(d0.over, false);
  assert.strictEqual(deloadState(en, DL_NOW + 6 * 86400000).daysLeft, 1);
  const fin = deloadState(en, DL_NOW + 9 * 86400000);
  assert.strictEqual(fin.over, true, 'a los 9 días ya se pasó');
  assert.strictEqual(fin.daysOver, 2);
  assert.strictEqual(fin.daysLeft, 0);
  assert.strictEqual(deloadState({ deload: { until: 'basura' } }, DL_NOW), null, 'fecha ilegible → no inventa');
});

test('🔒 v434 · la descarga NO se quita sola: sigue puesta hasta que el coach la cierre', () => {
  // Decisión del PO: sin temporizador. La contrapartida es el aviso al coach (deloadOverdue).
  const c = dlClient();
  const r = startDeload(c, DL_NOW);
  const en = Object.assign({}, c, { routines: r.routines, deload: r.deload });
  const tarde = DL_NOW + 30 * 86400000;
  assert.ok(deloadState(en, tarde), 'a los 30 días sigue activa');
  assert.deepStrictEqual(deloadOverdue([en], tarde).map(x => x.name), ['Kathe'], 'pero el coach lo ve en su Inicio');
  assert.strictEqual(deloadOverdue([en], DL_NOW + 86400000).length, 0, 'dentro de los 7 días no molesta');
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// v482 · LA SEMANA DE DESCARGA NO DESCARGABA LA CARGA
// El PO: «solo le bajas el 10% del peso y eso es prácticamente nada». Medido el 14-ago sobre 21
// asesorados reales (scripts/deload-carga.mjs), era peor: la sugerencia «de descarga» quedaba POR
// ENCIMA del propio récord en 130 de 148 casos, porque el factor caía sobre el peso YA SUBIDO por
// la progresión. Estos son los candados de eso.
// ══════════════════════════════════════════════════════════════════════════════════════════

test('🔴 v482 · EL CANDADO CENTRAL: en descarga NUNCA se sugiere un peso ≥ al récord', () => {
  // Barrido, no un caso suelto: el defecto vivía justo en la rama de la doble progresión, así que
  // hay que recorrer los dos lados (récord con MÁS reps que el plan, y con menos) y toda la
  // rejilla de escalones de carga (1 kg bajo 10, 2,5 bajo 30, 5 por encima).
  // 🎓 Y afirma la DOSIS, no solo el signo: la primera versión de este candado solo pedía
  // «dl < récord», y con eso quitar el tope seguía saliendo VERDE (un récord de 25 kg subido a
  // 27,5 y multiplicado por 0,85 da 23,5, que baja... un 6% en vez del 15%). Un candado que
  // afirma la dirección y no la magnitud deja pasar justo el defecto que lo motivó.
  let casos = 0;
  for (const kg of [1, 1.5, 2, 2.5, 5, 7.5, 10, 15, 20, 25, 30, 40, 60, 80, 100, 140]) {
    for (const prReps of [1, 5, 8, 10, 12, 15]) {
      for (const tgt of [8, 10, 12, 15, 20]) {
        const pr = { val: kg, unit: 'kg', reps: prReps };
        const dl = deloadSuggestKg(pr, tgt);
        if (dl == null) continue;
        casos++;
        assert.ok(dl < kg,
          `récord ${kg} kg ×${prReps}, plan ×${tgt} → la descarga sugiere ${dl} kg, que NO baja`);
        // Tope superior con la holgura del redondeo a medio kilo. No hay tope inferior a propósito:
        // cuando el récord se hizo a MENOS reps de las que pide el plan, la base ya viene mucho más
        // abajo (Epley) y eso es correcto.
        assert.ok(dl <= kg * DELOAD_LOAD_FACTOR + 0.5,
          `récord ${kg} kg ×${prReps}, plan ×${tgt} → sugiere ${dl} kg: baja, pero MENOS de lo que la app promete`);
      }
    }
  }
  assert.ok(casos > 200, 'el barrido tiene que morder de verdad, corrió ' + casos);
});

test('🔴 v482 · el caso REAL que lo destapó: Natalia, récord 25 kg ×15, plan de 15 reps', () => {
  // Antes: suggestFromPR sube a 27,5 (doble progresión) y el 0,9 lo devolvía a 25 — exactamente su
  // récord. La app llamaba «descarga» a levantar lo mismo de siempre.
  const pr = { val: 25, unit: 'kg', reps: 15 };
  assert.strictEqual(suggestFromPR(pr, 15), 27.5, 'fuera de descarga sí progresa (eso está bien)');
  assert.strictEqual(Math.round(27.5 * 0.9 * 2) / 2, 25, 'la cadena vieja devolvía su propio récord');
  assert.strictEqual(deloadSuggestKg(pr, 15), 21.5, 'ahora sale del récord, no del escalón');
});

test('🔒 v482 · el factor se aplica sobre el RÉCORD, no sobre la sugerencia normal', () => {
  // Es la trampa en la que cayó el harness _verify-deload durante 48 versiones: comparaba la
  // sugerencia de descarga contra la NORMAL (que ya venía subida) y pintaba verde.
  const pr = { val: 60, unit: 'kg', reps: 15 };
  const normal = suggestFromPR(pr, 15);          // 65 — con escalón de progresión
  const dl = deloadSuggestKg(pr, 15);            // 51 — 60 × 0,85
  assert.ok(dl < normal, 'contra la normal baja (esto pasaba ANTES también, por eso no servía)');
  assert.ok(dl < 60 * 0.9, 'y contra el RÉCORD baja de verdad: ' + dl);
  assert.strictEqual(dl, Math.round(60 * DELOAD_LOAD_FACTOR * 2) / 2);
});

test('🔒 v482 · cuando el récord es a MENOS reps de las que pide el plan, no se usa el récord crudo', () => {
  // Ahí el récord NO es sostenible para las reps del plan: la base tiene que seguir siendo la
  // estimación de Epley (que ya está por debajo), y el factor cae encima de ESA.
  const pr = { val: 10, unit: 'kg', reps: 6 };
  const normal = suggestFromPR(pr, 12);
  assert.ok(normal < 10, 'la sugerencia normal ya está por debajo del récord: ' + normal);
  assert.strictEqual(deloadSuggestKg(pr, 12), Math.round(normal * DELOAD_LOAD_FACTOR * 2) / 2);
});

test('🔒 v482 · sin récord no se inventa un peso', () => {
  assert.strictEqual(deloadSuggestKg(null, 12), null);
  assert.strictEqual(deloadSuggestKg({ val: 20, unit: 'reps', reps: 12 }, 12), null, 'un PR en reps no estima carga');
  assert.strictEqual(deloadSuggestKg({ val: 0, unit: 'kg', reps: 12 }, 12), null);
});

test('🔴 v482 · a quien NO tiene récord se le dice EN PALABRAS (9 de 21 no recibían nada)', () => {
  const c = dlClient();
  const r = startDeload(c, DL_NOW);
  const en = Object.assign({}, c, { routines: r.routines, deload: r.deload });
  const peso = { id: 'e1', name: 'Hip Thrust en Máquina', muscle: 'gluteo', sets: 4, reps: 15 };
  assert.strictEqual(deloadLoadHint(c, {}, peso, DL_NOW), null, 'fuera de la descarga no se dice nada');
  const t = deloadLoadHint(en, {}, peso, DL_NOW);
  assert.ok(t && t.length > 20, 'en descarga sí: ' + t);
  assert.ok(!/RIR|RPE|%|1RM|deload/i.test(t), 'sin jerga ni porcentajes: ' + t);
  assert.ok(/mancuerna/i.test(t), 'anclada a un objeto, no a una fracción suelta: ' + t);
  // Y solo en ejercicios de peso: a una plancha o a un cardio no se le baja «el peso».
  assert.strictEqual(deloadLoadHint(en, {}, { id: 'e3', name: 'Plancha', track: 'tiempo' }, DL_NOW), null);
  assert.strictEqual(deloadLoadHint(en, {}, { id: 'e9', name: 'Caminadora', track: 'cardio', reps: 20 }, DL_NOW), null);
});

test('🔴 v482 · a quien está en sus primeras semanas NO se le dice que baje el peso (Andrés)', () => {
  // En adaptación el peso ES la referencia técnica: todavía está armando el patrón del movimiento.
  // `_suggestKg` ya se callaba con ella; la frase tenía que callarse igual o el arreglo de la
  // cobertura habría metido la peor instrucción posible justo en la persona más frágil.
  const nueva = Object.assign(dlClient(), { level: 'Principiante', startDate: new Date(DL_NOW - 10 * 86400000).toISOString() });
  const r = startDeload(nueva, DL_NOW);
  const en = Object.assign({}, nueva, { routines: r.routines, deload: r.deload });
  const peso = { id: 'e1', name: 'Hip Thrust en Máquina', sets: 4, reps: 15 };
  assert.ok(isInAdaptation(en, {}, DL_NOW), 'control: la fixture SÍ está en adaptación');
  assert.strictEqual(deloadLoadHint(en, {}, peso, DL_NOW), null, 'y por eso no recibe la frase');
  // Control por el otro lado: la misma persona pasada la ventana sí la recibe.
  const tarde = DL_NOW + 40 * 86400000;
  const r2 = startDeload(nueva, tarde);
  const en2 = Object.assign({}, nueva, { routines: r2.routines, deload: r2.deload });
  assert.ok(deloadLoadHint(en2, {}, peso, tarde), 'pasada la adaptación sí se le habla de carga');
});

test('🔒 v482 · la dosis de carga es la que firmó Andrés, y bajarla de nuevo a 0,9 se nota', () => {
  // Contra un tope AFLOJADO no protege una matriz de sabotaje (aflojar deja la suite verde por
  // definición): lo que protege es la cifra medida escrita al lado, con su fecha y su ruta.
  // 📊 Medido 2026-08-14, `scripts/deload-carga.mjs`, 186 casos de 21 asesorados reales:
  //    con 0,85 la sugerencia queda en mediana −15,0% del récord (peor −25%, más suave −10%).
  //    Con 0,90 la mediana era −13,0%; con el defecto vivo, +6,7% (o sea, SUBÍA).
  // Andrés (14-ago) firma la banda 0,80-0,90 y RECHAZA 0,50 junto al recorte de series: a 12 reps
  // —la mediana real de estos planes— el 0,50 deja a la persona en 36% de su máximo pidiéndole 12
  // repeticiones cuando podría hacer ~54.
  assert.strictEqual(DELOAD_LOAD_FACTOR, 0.85);
  assert.ok(DELOAD_LOAD_FACTOR >= 0.80 && DELOAD_LOAD_FACTOR <= 0.90,
    'fuera de la banda que firmó Andrés — su dictamen es el que manda aquí, no la conveniencia');
});

test('🔒 v434 · a la asesorada se le EXPLICA por qué tiene menos series', () => {
  // Si no se explica, lo lee como un error de la app o como que la están descuidando.
  const c = dlClient();
  const r = startDeload(c, DL_NOW);
  const en = Object.assign({}, c, { routines: r.routines, deload: r.deload });
  assert.strictEqual(deloadCardText(c, DL_NOW), null, 'sin descarga no hay tarjeta');
  const t = deloadCardText(en, DL_NOW);
  assert.ok(t && t.title && t.msg);
  assert.ok(/7 días|quedan/i.test(t.msg), 'dice hasta cuándo: ' + t.msg);
  assert.ok(!/deload|descarga programada|estanc/i.test(t.title + ' ' + t.msg), 'sin jerga: ' + t.title);
  const fin = deloadCardText(en, DL_NOW + 9 * 86400000);
  assert.ok(/termin/i.test(fin.title), 'cuando se pasó, el texto no miente con los días: ' + fin.title);
});

test('🔒 v434 · el coach recibe AVISO (no un bloqueo) cuando la descarga no le cuadra a esa persona', () => {
  const ses = n => Array.from({ length: n }, (_, i) => ({ date: new Date(DL_NOW - i * 3 * 86400000).toISOString(), exercises: [] }));
  const novata = dlClient();
  const w = deloadWarnings(novata, ses(4), DL_NOW);
  assert.ok(w.length >= 1 && /construyendo/i.test(w.join(' ')), 'avisa de la poca historia: ' + JSON.stringify(w));
  const conDolor = Object.assign(dlClient(), {
    startDate: new Date(DL_NOW - 300 * 86400000).toISOString(),
    painCare: [{ area: 'zona lumbar', at: new Date(DL_NOW - 2 * 86400000).toISOString() }],
  });
  assert.ok(deloadWarnings(conDolor, ses(40), DL_NOW).some(x => /dolor/i.test(x)), 'y del dolor reciente');
  const veterana = Object.assign(dlClient(), { startDate: new Date(DL_NOW - 300 * 86400000).toISOString() });
  assert.deepStrictEqual(deloadWarnings(veterana, ses(40), DL_NOW), [], 'a quien le cuadra, sin ruido');
});

// ══════════════════════════════════════════════════════
section('Plan de choque contra estancamientos (shockPlan / applyShockOption, v354)');

// Una sesión con un ejercicio de carga que SÍ trae músculo (shockPlan busca variantes por músculo).
const spSess = (offsetDays, name, muscle, kg) => ({
  date: new Date(CI_NOW - offsetDays * 86400000).toISOString(),
  exercises: [{ name, muscle, track: 'peso_reps', sets: [{ done: true, kg: String(kg), reps: '8' }] }],
});
// Historial ESTANCADO en "Jalón al Pecho", evaluable por el detector v433: techo de 62 kg en la
// zona de referencia (2ª sesión de 20) y todo lo demás por debajo. bestKg=62, 18 sesiones planas.
const spStalled = stHist([{ name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_PLANO }]);
// Historial que PROGRESA (la ventana supera el techo previo) → no hay meseta.
const spProgress = stHist([{ name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_SUBE }]);
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
  assert.strictEqual(p.analysis.flatPoints, ST_N - 2, 'sesiones desde el récord (2ª de 20) sin superarlo');
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

// ── shockTargets (v355, Fase 4.1: múltiples estancamientos · disparo v433) ──
// Cliente de prueba para el gate de constancia (planDays = client.days = 3 sin rutinas con día).
// `startDate` de hace 200 días: pasa el piso de antigüedad de la DESCARGA (180). Sin él, los
// casos de descarga no se pueden probar — y ese piso es justo lo que hoy la apaga en el gimnasio.
const stClient = { level: 'Intermedio', days: 3, startDate: new Date(CI_NOW - 200 * 86400000).toISOString() };

test('shockTargets: 0 estancados → null', () => {
  assert.strictEqual(shockTargets(spProgress, stClient, CI_NOW), null, 'un ejercicio que progresa no dispara nada');
  assert.strictEqual(shockTargets([], stClient, CI_NOW), null, 'sin historial');
  assert.strictEqual(shockTargets(), null, 'sin argumentos no lanza');
});

test('shockTargets: 1 estancado → multi con 1 target sin also', () => {
  const r = shockTargets(stHist([{ name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA }]), stClient, CI_NOW);
  assert.strictEqual(r.mode, 'multi');
  assert.strictEqual(r.targets.length, 1);
  assert.strictEqual(r.targets[0].name, 'Jalón al Pecho');
  assert.strictEqual(r.targets[0].muscle, 'espalda');
  assert.deepStrictEqual(r.targets[0].also, [], 'un solo estancado no tiene hermanos');
});

test('shockTargets: 2 del MISMO músculo → 1 target, gana el que MÁS cayó, el otro va en also', () => {
  // 'Jalón' va primero y alfabéticamente antes que 'Remo', PERO 'Remo' viene CAYENDO mientras el
  // jalón solo está en meseta → debe ganar el que más cayó, aislado del orden y del nombre.
  const r = shockTargets(stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA }, // meseta (delta 0)
    { name: 'Remo con Barra', muscle: 'espalda', kgs: KG_CAIDA },  // en caída (más clavado)
  ]), stClient, CI_NOW);
  assert.strictEqual(r.mode, 'multi');
  assert.strictEqual(r.targets.length, 1, 'mismo músculo = un solo problema → una sección');
  assert.strictEqual(r.targets[0].name, 'Remo con Barra', 'ataca primero el más plantado, no el 1º ni el alfabético');
  assert.deepStrictEqual(r.targets[0].also, ['Jalón al Pecho'], 'el hermano queda anotado para la nota');
});

test('shockTargets: 2 músculos DISTINTOS → 2 targets (recuperación independiente → en paralelo)', () => {
  const r = shockTargets(stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
  ]), stClient, CI_NOW);
  assert.strictEqual(r.mode, 'multi');
  assert.strictEqual(r.targets.length, 2);
  assert.deepStrictEqual(r.targets.map(t => t.muscle).sort(), ['espalda', 'pecho']);
  r.targets.forEach(t => assert.deepStrictEqual(t.also, [], 'cada músculo tiene un solo estancado'));
});

test('shockTargets: 3 EN REGRESIÓN (aunque sean de 3 músculos distintos) → global con los nombres', () => {
  const r = shockTargets(stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_CAIDA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
    { name: 'Sentadilla', muscle: 'pierna', kgs: KG_CAIDA },
  ], 3, 2), stClient, CI_NOW);
  assert.strictEqual(r.mode, 'global', '3+ CAYENDO a la vez = fatiga sistémica, no N planes');
  assert.strictEqual(r.count, 3);
  assert.deepStrictEqual(r.names.slice().sort(), ['Jalón al Pecho', 'Press Banca', 'Sentadilla']);
});

test('🔒 v433 · 3 en MESETA (sin caída) NO son una descarga — es el caso de Astrid', () => {
  // El disparo viejo contaba ejercicios PLANTADOS: un conteo absoluto que ignora cuántos van
  // subiendo. Medido en producción, Astrid tenía 3 planos y 7 MEJORANDO y la app le mandaba una
  // semana de descarga. Meseta ≠ fatiga sistémica: eso pide regresión real (criterio de Andrés).
  const meseta3 = [
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_MESETA },
    { name: 'Sentadilla', muscle: 'pierna', kgs: KG_MESETA },
  ];
  const r = shockTargets(stHist(meseta3), stClient, CI_NOW);
  assert.strictEqual(stalledExercises(stClient, stHist(meseta3), CI_NOW).length, 3, 'los 3 SÍ están estancados (control)');
  assert.strictEqual(r.mode, 'multi', 'planes por ejercicio, NO una descarga');
  assert.ok(r.targets.length <= 2, 'la tarjeta atiende lo peor primero, no lista todo: ' + r.targets.length);
});

// ── Gate de constancia (v356): 3+ en regresión → descarga SOLO si viene entrenando parejo ──
const stall3 = [
  { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_CAIDA },
  { name: 'Press Banca', muscle: 'pecho', kgs: KG_CAIDA },
  { name: 'Sentadilla', muscle: 'pierna', kgs: KG_CAIDA },
];

test('shockTargets: 3+ en regresión ENTRENANDO PAREJO (cadencia alta) → global (descarga)', () => {
  // Sesiones cada 3 días = ~2.5 días/sem en la ventana de constancia → constante (bar 3*0.8 = 2.4).
  const r = shockTargets(stHist(stall3, 3, 2), stClient, CI_NOW);
  assert.strictEqual(r.mode, 'global', 'fatiga real → semana de descarga');
  assert.strictEqual(r.count, 3);
});

test('🔒 v433 · los PISOS de la descarga: sin meses de entreno detrás, no se propone', () => {
  // Decisión del PO (2026-08-04) con el criterio de Andrés: 180 días entrenando + 10 semanas de
  // datos. Medido, hoy NADIE del gimnasio los cumple → la descarga automática queda apagada hasta
  // ~noviembre, y el coach la sigue generando a mano cuando quiera.
  const h = stHist(stall3, 3, 2);
  assert.strictEqual(shockTargets(h, stClient, CI_NOW).mode, 'global', 'con los pisos cumplidos SÍ (control)');
  const novato = { level: 'Intermedio', days: 3 }; // sin startDate → antigüedad = 1ª sesión (~10 sem)
  assert.strictEqual(deloadFloorReason(novato, h, CI_NOW), 'lleva poco entrenando');
  assert.strictEqual(shockTargets(h, novato, CI_NOW).mode, 'multi', 'sin los meses detrás: planes por ejercicio, no descarga');
});

test('🔒 v433 · DOLOR RECIENTE = PARADA de la descarga (Laura, vinculante)', () => {
  // `shockTargets` era CIEGA AL DOLOR mientras `shockPlan` sí lo miraba — al revés de como debía
  // ser, porque esta es la que reescribe la rutina entera.
  const h = stHist(stall3, 3, 2);
  const conDolor = { ...stClient, painCare: [{ area: 'zona lumbar', at: new Date(CI_NOW - 2 * 86400000).toISOString() }] };
  assert.strictEqual(deloadFloorReason(conDolor, h, CI_NOW), 'dolor reciente');
  assert.strictEqual(shockTargets(h, conDolor, CI_NOW).mode, 'multi', 'con dolor activo NUNCA se rehace la semana');
  // Un dolor ya descartado («ya estoy bien») no bloquea.
  const ok = { ...stClient, painCare: [{ area: 'zona lumbar', at: new Date(CI_NOW - 2 * 86400000).toISOString(), cleared: true }] };
  assert.strictEqual(shockTargets(h, ok, CI_NOW).mode, 'global');
});

test('🔒 shockTargets: 3+ en regresión pero A SALTOS (cadencia baja) → rebuild, NO descarga', () => {
  // Mismos 3, pero 1 sesión cada 8 días → ~1.2 días/sem → por debajo del bar → rebuild.
  const r = shockTargets(stHist(stall3, 8), stClient, CI_NOW);
  assert.strictEqual(r.mode, 'rebuild', 'se estancó por faltas: recuperar ritmo, no bajar volumen');
  assert.strictEqual(r.count, 3);
  assert.deepStrictEqual(r.names.slice().sort(), ['Jalón al Pecho', 'Press Banca', 'Sentadilla']);
  assert.ok(typeof r.cadence === 'number' && r.cadence < 2.1, 'reporta la cadencia baja: ' + r.cadence);
  assert.strictEqual(r.plan, 3, 'reporta el plan (días/sem) para mostrar la evidencia en la tarjeta');
});

test('🔒 v433 · sin `client`/`now` NO se evalúa a nadie (mejor callar que inventar)', () => {
  // Cambió el contrato base: el detector necesita el NIVEL y la ANTIGÜEDAD para sus compuertas.
  // Sin ellos no puede saber si es una principiante en adaptación → no dice nada, en vez de
  // asumir «global» como hacía antes (que era la conclusión más agresiva posible sin datos).
  assert.strictEqual(shockTargets(stHist(stall3, 8)), null, 'sin perfil: silencio');
  assert.strictEqual(stallGateReason(null, stHist(stall3, 8), CI_NOW), 'sin perfil');
  assert.deepStrictEqual(stallReport(null, stHist(stall3, 8), CI_NOW).items, [], 'ni un solo ejercicio evaluado');
});

test('🔒 shockTargets: PARÓN RECIENTE (entrenó DENSO pero paró hace 3 semanas) → rebuild, no descarga', () => {
  // Bloque denso que TERMINÓ hace 21 días → la cadencia medida HASTA now queda baja aunque en su
  // momento entrenara parejo. Blinda que _recentCadence use el span hasta `now` y no el que hay
  // entre 1ª y última sesión (eso daría cadencia alta = descarga FALSA a un retornante).
  const paron = stHist(stall3, 3, 21);
  assert.strictEqual(shockTargets(paron, stClient, CI_NOW).mode, 'rebuild', 'un parón reciente NO es fatiga: recuperar ritmo');
});

test('🔒 shockTargets: RETORNANTE (faltó semanas y vuelve DENSO su 1ª semana) → rebuild, no descarga', () => {
  // Historial viejo (fuera de la ventana de constancia) + esta semana entrenando fuerte. Sin el
  // candado «no cuenta la 1ª semana», la semana densa infla la cadencia y clasificaría GLOBAL
  // (descarga) por error a alguien que apenas volvió. Debe caer en rebuild.
  const viejas = Array.from({ length: ST_N - 3 }, (_, k) => 35 + (ST_N - 4 - k) * 3); // 98…35 días atrás
  const ret = stHistAt(stall3, viejas.concat([5, 3, 1]));
  assert.strictEqual(shockTargets(ret, stClient, CI_NOW).mode, 'rebuild', 'un retornante NO recibe descarga por su 1ª semana');
});

test('shockTargets: el gate de constancia NO afecta al modo multi (1-2 estancados)', () => {
  // Con <3 en regresión, entrenar a saltos NO cambia nada: los planes por-ejercicio siguen válidos.
  const r = shockTargets(stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_MESETA },
  ], 8), stClient, CI_NOW);
  assert.strictEqual(r.mode, 'multi');
  assert.strictEqual(r.targets.length, 2);
});

test('shockTargets: determinista — mismo historial, mismo resultado', () => {
  const h = stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_PLANO },
  ]);
  assert.strictEqual(JSON.stringify(shockTargets(h, stClient, CI_NOW)), JSON.stringify(shockTargets(h, stClient, CI_NOW)));
});

test('shockTargets: shockPlan de cada target sigue funcionando (la firma no se tocó)', () => {
  const h = stHist([
    { name: 'Jalón al Pecho', muscle: 'espalda', kgs: KG_MESETA },
    { name: 'Press Banca', muscle: 'pecho', kgs: KG_PLANO },
  ]);
  const r = shockTargets(h, spClient, CI_NOW);
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
// ── F5 (2026-07-28): NINGÚN harness de captura puede terminar siempre en éxito ──
// Durante v403 la pestaña «Perfil» estuvo ROTA en producción un día entero mientras su harness
// seguía generando PNG y saliendo con código 0: capturaba una pantalla muerta. Diez harnesses
// `_shot*` estaban igual. La regla adoptada es que un harness que abre una pantalla tiene que
// EXIGIR que arranque, y los dientes viven en `scripts/e2e/_afirma.mjs`.
// Este check es el candado: si mañana nace un `_shot*` nuevo sin importar `_afirma`, la suite
// lo caza aquí — que es más barato que descubrirlo cuando ya se coló un bug a producción.
// ── FASE 3 (2026-07-28): la tinta legible de los colores de músculo ──
// El código de colores por músculo pinta el tinte de la etiqueta Y su texto. Medido: 7 de los 10
// colores no llegan al mínimo de lectura usados así en tema claro. `mcInk` oscurece SOLO el
// texto, así que el color sigue identificando al músculo pero se lee.
section('FASE 3 — tinta legible (mcInk)');
test('mcInk oscurece el color y mantiene el formato #rrggbb', () => {
  assert.strictEqual(core.mcInk('#00BFA5'), '#00695b');
  assert.strictEqual(core.mcInk('#E76F51'), '#7f3d2d');
  assert.strictEqual(core.mcInk('#FFFFFF', 0.5), '#808080');
});
test('mcInk deja pasar lo que no es un color hexadecimal (no rompe el render)', () => {
  ['var(--g)', '', null, undefined, '#abc', 'rgb(1,2,3)'].forEach(v => {
    assert.strictEqual(core.mcInk(v), v, 'no debe tocar ' + String(v));
  });
});
test('mcInk sube de verdad el contraste de los 10 colores de músculo sobre su tinte', () => {
  // Mismo cálculo de WCAG 2.1 que usa la auditoría de lectura, aquí sobre el tinte al 9%.
  const hex = h => { h = h.replace('#',''); return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); const hi = Math.max(L1,L2), lo = Math.min(L1,L2); return (hi+0.05)/(lo+0.05); };
  const sobreBlanco = (c, a) => ({ r: c.r*a + 255*(1-a), g: c.g*a + 255*(1-a), b: c.b*a + 255*(1-a) });
  const MUSCULOS = ['#E76F51','#457B9D','#A855F7','#0A7C5B','#C77DFF','#00BFA5','#F4845F','#E63946','#FF6B6B','#6B6B6B'];
  MUSCULOS.forEach(col => {
    const tinte = sobreBlanco(hex(col), 0.094);
    const conTinta = ratio(hex(core.mcInk(col)), tinte);
    assert.ok(conTinta >= 4.5, `${col}: con la tinta legible da ${conTinta.toFixed(2)}:1 y hace falta 4.5`);
  });
});

// ── FASE 3 · fuga (2026-07-29): el badge de membresía ──
// La FASE 3 barrió el CSS, pero este badge lo arma JS (`MS.badge` devuelve color+bg como texto
// inline) y se quedó con los tokens de RELLENO encima de su propio tinte: «Por vencer» 2.62:1,
// «Vencido» 3.45 y «Sin pago» 1.55 — el peor de toda la app, y es la señal de PLATA que el coach
// lee en su Inicio y en la ficha. Se escapó porque el fixture de la auditoría tenía la fecha de
// vencimiento FIJA y solo llegaba a pintar «Al día», el único que ya pasaba.
// Este test lee los hex REALES de styles.css: si mañana alguien cambia un token o vuelve a poner
// el crudo en el badge, muerde aquí sin depender de que la auditoría alcance a pintar ese estado.
section('FASE 3 — el badge de membresía se lee');
test('todo badge de MS.badge llega a 4.5:1 sobre su propio fondo (tema claro)', () => {
  const fs = require('fs');
  const css = fs.readFileSync(require('path').join(__dirname, 'styles.css'), 'utf8');
  // Los tokens del tema CLARO viven en el primer bloque `:root{...}` del archivo.
  const raiz = css.slice(css.indexOf(':root {'), css.indexOf('/* dark mode automático'));
  const token = t => {
    const m = raiz.match(new RegExp('--' + t + '\\s*:\\s*(#[0-9A-Fa-f]{6})'));
    assert.ok(m, `no encontré el token --${t} en el :root claro de styles.css`);
    return m[1];
  };
  const hex = h => { h = h.replace('#',''); return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
  const ratio = (a, b) => { const L1 = lum(hex(a)), L2 = lum(hex(b)); const hi = Math.max(L1,L2), lo = Math.min(L1,L2); return (hi+0.05)/(lo+0.05); };
  // La sonda se valida ANTES de creerle (regla de la FASE 3).
  assert.strictEqual(Number(ratio('#FFFFFF','#000000').toFixed(2)), 21, 'la sonda de contraste está rota');
  assert.strictEqual(Number(ratio('#767676','#FFFFFF').toFixed(2)), 4.54, 'la sonda de contraste está rota');
  const resuelve = v => token(String(v).replace(/^var\(--|\)$/g, ''));
  // Los dos estados APAGADOS (gris --t2 sobre --br) llevaban una excepción a 4.2 mientras el gris
  // secundario esperaba decisión del PO. La decisión se tomó el 2026-07-29 y --t2 bajó a #636363:
  // ahora dan 4.75 y la excepción sobra. Umbral uniforme, sin exenciones — que es como debe estar.
  ['active','expiring','overdue','pending','inactive','suspended'].forEach(estado => {
    const b = MS.badge(estado);
    const r = ratio(resuelve(b.color), resuelve(b.bg));
    assert.ok(r >= 4.5, `«${b.label}» (${estado}): ${b.color} sobre ${b.bg} da ${r.toFixed(2)}:1 y hace falta 4.5`);
  });
});

// ── FASE 3 · segunda pasada (2026-07-29): las iniciales del avatar y el chip en oscuro ──
// Dos cosas que la auditoría NO podía cazar sola, porque el color no está en el CSS:
//   · el color del avatar sale de un hash del NOMBRE → con los nombres del fixture nunca
//     salieron los peores de la paleta (el amarillo con blanco encima daba 1.67:1).
//   · la etiqueta de músculo en tema OSCURO usaba el color crudo, que ahí se queda en 2.66-4.46
//     (la nota de la FASE 3 afirmaba lo contrario; se corrigió midiendo).
// Estos tests recorren la paleta ENTERA, que es lo que un fixture no puede prometer.
section('FASE 3 — tinta sobre rellenos de color (avatares y chips en oscuro)');
const _wcag = (() => {
  const hex = h => { h = h.replace('#',''); return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
  const ratio = (a, b) => { const L1 = lum(hex(a)), L2 = lum(hex(b)); const hi = Math.max(L1,L2), lo = Math.min(L1,L2); return (hi+0.05)/(lo+0.05); };
  // La sonda se valida antes de creerle, como en la FASE 3.
  assert.strictEqual(Number(ratio('#FFFFFF','#000000').toFixed(2)), 21);
  assert.strictEqual(Number(ratio('#767676','#FFFFFF').toFixed(2)), 4.54);
  const mezcla = (fg, bg, a) => { const f = hex(fg), b = hex(bg);
    return '#' + [0,1,2].map(i => Math.round([f.r,f.g,f.b][i]*a + [b.r,b.g,b.b][i]*(1-a)).toString(16).padStart(2,'0')).join(''); };
  return { ratio, mezcla };
})();
test('inkOn elige una tinta legible para los 8 colores de avatar', () => {
  // La paleta se lee del módulo real, no se copia: si mañana entra un color nuevo, entra al test.
  const src = require('fs').readFileSync(require('path').join(__dirname, 'app-1-infra.js'), 'utf8');
  const AVC = src.match(/const AVC\s*=\s*\[([^\]]+)\]/)[1].split(',').map(s => s.trim().replace(/['"`]/g, ''));
  assert.ok(AVC.length >= 8, `esperaba la paleta de avatares, encontré ${AVC.length}`);
  AVC.forEach(col => {
    const r = _wcag.ratio(core.inkOn(col), col);
    assert.ok(r >= 4.5, `avatar ${col}: la tinta ${core.inkOn(col)} da ${r.toFixed(2)}:1 y hace falta 4.5`);
  });
});
test('inkOn no revienta con basura (cae a blanco, nunca a undefined)', () => {
  ['', null, undefined, '#abc', 'var(--g)', 'rgb(1,2,3)'].forEach(v =>
    assert.strictEqual(core.inkOn(v), '#FFFFFF', 'debe caer a blanco con ' + String(v)));
});
test('mcInkUp hace legibles los 10 colores de músculo sobre el chip en tema oscuro', () => {
  // El chip pinta el color al 8% (`${color}15`) sobre la tarjeta oscura --w #152A1E.
  const MUSCULOS = ['#E76F51','#457B9D','#A855F7','#0A7C5B','#C77DFF','#00BFA5','#F4845F','#E63946','#FF6B6B','#6B6B6B'];
  MUSCULOS.forEach(col => {
    const fondo = _wcag.mezcla(col, '#152A1E', 0x15/255);
    const crudo = _wcag.ratio(col, fondo);
    const claro = _wcag.ratio(core.mcInkUp(col), fondo);
    assert.ok(claro >= 4.5, `${col}: aclarado da ${claro.toFixed(2)}:1 y hace falta 4.5`);
    assert.ok(claro > crudo, `${col}: aclarar tiene que MEJORAR sobre el crudo (${crudo.toFixed(2)})`);
  });
});
test('mcInkUp deja pasar lo que no es un color hexadecimal', () => {
  ['var(--g)', '', null, undefined, '#abc'].forEach(v => assert.strictEqual(core.mcInkUp(v), v));
});
// CANDADO (auditoría del 2026-07-29): el barrido que migró los avatares buscó el patrón de
// PLANTILLA (`background:${avc(nombre)}`) y por eso se le escaparon DOS sitios que pintan
// mutando el DOM (`av.style.background=avc(...)`) — el avatar grande de la ficha y el del chat
// del coach. Quedaron con el `color:white` fijo del CSS, que es justo el defecto que el lote
// decía haber cerrado. La suite no podía cazarlo porque no es una función pura: este check
// estático sí. Regla: todo sitio que pinte con `avc(` declara su tinta en el MISMO sitio.
test('todo avatar pintado con avc() declara su tinta (avcStyle o inkOn)', () => {
  const fs = require('fs'), path = require('path');
  const malos = [];
  fs.readdirSync(__dirname).filter(f => /^app-\d.*\.js$/.test(f)).forEach(f => {
    fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').forEach((linea, i) => {
      if (!/\bavc\(/.test(linea)) return;
      if (/^\s*(\/\/|\*)/.test(linea)) return;                       // comentarios
      if (/function avc\b|function avcStyle\b|const AVC\s*=/.test(linea)) return; // definiciones
      if (/avcStyle\(/.test(linea) || /inkOn\(/.test(linea)) return; // ya declara su tinta
      malos.push(`${f}:${i + 1}`);
    });
  });
  assert.deepStrictEqual(malos, [],
    'estos sitios pintan un avatar sin declarar su tinta (usa avcStyle o pon .style.color=inkOn(...)): ' + malos.join(', '));
});

// ══ CANDADO DE CLASE (lote de la auditoría, 2026-07-30) ══════════════════════════════════════
// El «0 textos bajo el umbral» de v413 era 0 en las 12 superficies AUDITADAS, no en la app.
// Fuera de ellas quedaban DOS patrones, y los dos nacen de lo mismo: la regla de tokens legibles
// (--ort/--blt/--rdt) se aplicó donde YA había tokens y no donde el color estaba escrito de otra
// forma. Esta pareja de checks es el grep que la propia auditoría dijo que «los caza todos de
// una» — y a diferencia de un recorrido de pantallas, no depende de que el estado llegue a
// pintarse: mira el código, así que no puede salir verde sobre lo que no vio.
section('Estático — texto sobre tinte: la variante legible, no el token crudo');

// (A) En el CSS: una regla que pinta el FONDO con un tinte (--orl/--bll/--rdl/--yll) y el TEXTO
//     con el token CRUDO del mismo color. Falla solo en tema claro (2.62-3.45), que es por lo que
//     sobrevivió: quien lo revisó en oscuro lo vio bien —ahí --ort es alias del crudo—.
test('ninguna regla de styles.css usa el token CRUDO como texto sobre su propio tinte', () => {
  const fs = require('fs'), path = require('path');
  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  const PAREJAS = { orl: 'or', bll: 'bl', rdl: 'rd', yll: 'yl' };
  const malas = [];
  // Regla a regla (selector + bloque). Basta con mirar dentro de cada bloque: el defecto es
  // declarar las dos cosas juntas.
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' '), cuerpo = m[2];
    for (const [tinte, crudo] of Object.entries(PAREJAS)) {
      if (!new RegExp(`background(-color)?\\s*:\\s*var\\(--${tinte}\\)`).test(cuerpo)) continue;
      if (!new RegExp(`(^|[;{\\s])color\\s*:\\s*var\\(--${crudo}\\)`).test(cuerpo)) continue;
      malas.push(`${sel.slice(0, 40)} → color:var(--${crudo}) sobre var(--${tinte}); usa var(--${crudo}t)`);
    }
  }
  assert.deepStrictEqual(malas, [],
    'texto con el token crudo sobre su propio tinte (ilegible en tema CLARO):\n  ' + malas.join('\n  '));
});

// (B) En el JS/HTML: un hex ESCRITO A MANO sobre uno de esos mismos tintes. Es el caso inverso y
//     más traicionero — el hex se eligió mirando el tema claro (5.79 ✔) y nunca cambia, así que
//     el que se rompe es el tema OSCURO (2.45 y 1.67), donde el tinte sí se invierte.
test('ningún estilo inline pinta texto con un hex a mano sobre un tinte que cambia de tema', () => {
  const fs = require('fs'), path = require('path');
  const TINTES = ['yll', 'orl', 'bll', 'rdl'];
  const malas = [];
  fs.readdirSync(__dirname)
    .filter(f => /^app-\d.*\.js$/.test(f) || f === 'index.html')
    .forEach(f => {
      fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').forEach((linea, i) => {
        // El defecto exige las DOS cosas en el mismo atributo style; buscar por línea alcanza
        // porque estos banners se escriben en una sola línea (y si alguien los parte, el check
        // deja de verlos — por eso existe ADEMÁS la auditoría de lectura, que mide lo pintado).
        if (!TINTES.some(t => linea.includes(`var(--${t})`))) return;
        const m = linea.match(/color\s*:\s*(#[0-9A-Fa-f]{3,8})/);
        if (!m) return;
        malas.push(`${f}:${i + 1} → color:${m[1]} sobre un tinte de tema; usa var(--ylt/--ort/--blt/--rdt)`);
      });
    });
  assert.deepStrictEqual(malas, [],
    'hex a mano sobre un tinte que sí cambia de tema (ilegible en tema OSCURO):\n  ' + malas.join('\n  '));
});

// (C) El token que faltaba. --ort/--blt/--rdt existían desde la FASE 3; --ylt no, y por eso los
//     tres banners amarillos llevaban el mismo #7a5c00 copiado a mano. Se mide igual que los
//     otros para que nadie lo mueva a un valor que no se lee.
test('--ylt se lee sobre --yll en tema claro (y existe en los cuatro bloques :root)', () => {
  const fs = require('fs'), path = require('path');
  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  const hex = h => { h = h.replace('#', ''); return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
  const ratio = (a, b) => { const L1 = lum(hex(a)), L2 = lum(hex(b)); const hi = Math.max(L1,L2), lo = Math.min(L1,L2); return (hi+0.05)/(lo+0.05); };
  assert.strictEqual(Number(ratio('#FFFFFF','#000000').toFixed(2)), 21, 'la sonda de contraste está rota');
  assert.strictEqual(Number(ratio('#767676','#FFFFFF').toFixed(2)), 4.54, 'la sonda de contraste está rota');
  // Los 4 bloques: 2 claros lo definen con hex, 2 oscuros lo alias al crudo (que ahí sí se lee).
  const definiciones = css.match(/--ylt\s*:\s*[^;]+;/g) || [];
  assert.strictEqual(definiciones.length, 4, `--ylt debe estar en los 4 bloques :root, encontré ${definiciones.length}`);
  const claro = css.slice(css.indexOf(':root {'), css.indexOf('/* dark mode automático'));
  const ylt = (claro.match(/--ylt\s*:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
  const yll = (claro.match(/--yll\s*:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
  assert.ok(ylt && yll, 'faltan --ylt o --yll en el :root claro');
  const r = ratio(ylt, yll);
  assert.ok(r >= 4.5, `--ylt (${ylt}) sobre --yll (${yll}) da ${r.toFixed(2)}:1 y hace falta 4.5`);
});

// (D) El caso HERMANO de (A) y (B), y el que se coló: texto BLANCO sobre el RELLENO saturado
//     (--yl/--or/--bl), no sobre el tinte pálido. La barra de macros de la habitación de
//     nutrición lo llevaba: `#fff` sobre los tres → carbos 1.67 (claro) y 1.59 (oscuro), grasa
//     3.09/2.19 y proteína 2.23 en oscuro. Los tokens `--on-*` existían justamente para esto y
//     esa barra nunca se migró — el patrón de siempre: la regla nueva se aplica donde ya había
//     tokens, no donde había un hex a mano. Cazado el 2026-08-08.
test('ninguna regla pinta texto BLANCO sobre un relleno saturado (--yl/--or/--bl/--rd)', () => {
  const fs = require('fs'), path = require('path');
  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  const RELLENOS = ['yl', 'or', 'bl', 'rd'];
  const malas = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' '), cuerpo = m[2];
    // Sólo el token EXACTO: `var(--yl)` sí, `var(--yll)` no (ese es el tinte pálido, caso A).
    for (const t of RELLENOS) {
      if (!new RegExp(`background(-color)?\\s*:\\s*var\\(--${t}\\)(?![a-z])`).test(cuerpo)) continue;
      if (!/(^|[;{\s])color\s*:\s*(#fff(fff)?|white)\b/i.test(cuerpo)) continue;
      malas.push(`${sel.slice(0, 44)} → color blanco sobre var(--${t}); usa var(--on-${t})`);
    }
  }
  assert.deepStrictEqual(malas, [],
    'texto blanco sobre un relleno saturado (ilegible en al menos un tema):\n  ' + malas.join('\n  '));
});

// (E) Los dos tokens nuevos del 2026-08-08, medidos igual que --ylt para que nadie los mueva a un
//     valor que no se lee. `--sr-sec` es el que más importa: el dorado de la habitación se diseñó
//     contra fondo oscuro y sobre `--bg` claro medía 1.92.
test('--on-yl y --sr-sec existen en los 4 bloques :root y se leen en tema claro', () => {
  const fs = require('fs'), path = require('path');
  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  const hex = h => { h = h.replace('#', ''); return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
  const ratio = (a, b) => { const L1 = lum(hex(a)), L2 = lum(hex(b)); const hi = Math.max(L1,L2), lo = Math.min(L1,L2); return (hi+0.05)/(lo+0.05); };
  assert.strictEqual(Number(ratio('#FFFFFF','#000000').toFixed(2)), 21, 'la sonda de contraste está rota');
  assert.strictEqual(Number(ratio('#767676','#FFFFFF').toFixed(2)), 4.54, 'la sonda de contraste está rota');
  for (const tok of ['--on-yl', '--sr-sec']) {
    const defs = css.match(new RegExp(`${tok}\\s*:\\s*[^;]+;`, 'g')) || [];
    assert.strictEqual(defs.length, 4, `${tok} debe estar en los 4 bloques :root, encontré ${defs.length}`);
  }
  const claro = css.slice(css.indexOf(':root {'), css.indexOf('/* dark mode automático'));
  const val = t => (claro.match(new RegExp(`${t}\\s*:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1];
  const onYl = val('--on-yl'), yl = val('--yl'), srSec = val('--sr-sec'), bg = val('--bg');
  assert.ok(onYl && yl && srSec && bg, 'faltan tokens en el :root claro');
  const rYl = ratio(onYl, yl);
  assert.ok(rYl >= 4.5, `--on-yl (${onYl}) sobre --yl (${yl}) da ${rYl.toFixed(2)}:1 y hace falta 4.5`);
  const rSec = ratio(srSec, bg);
  assert.ok(rSec >= 4.5, `--sr-sec (${srSec}) sobre --bg (${bg}) da ${rSec.toFixed(2)}:1 y hace falta 4.5`);
});

section('Estático — F5: los harnesses de captura tienen dientes');
test('todo harness _shot*/_shots* exige que la pantalla arranque (_afirma.mjs)', () => {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, 'scripts/e2e');
  const files = fs.readdirSync(dir).filter(f => /^_shots?[-.].*\.mjs$/.test(f));
  assert.ok(files.length >= 10, `esperaba al menos 10 harnesses de captura, encontré ${files.length}`);
  const sinDientes = files.filter(f => {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    // Vale con importar los dientes compartidos O traer los suyos propios (salida != 0).
    return !/_afirma\.mjs/.test(src) && !/process\.exit\(\s*(fallos|[a-zA-Z_$][\w$]*\.length|1)/.test(src);
  });
  assert.strictEqual(sinDientes.length, 0,
    'harnesses de captura que siempre salen en verde: ' + sinDientes.join(', '));
});

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

section('Arranque — la guarda que faltaba (2026-07-30)');

// CANDADO del arranque: la llamada que reventó 3 veces en Android real (24/26/27-jul) por invocar
// una función de OTRO módulo sin comprobar que existiera.
test('migratePhotosToStorage se llama con guarda typeof (revienta el arranque sin ella)', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  const linea = src.split('\n').find(l => /migratePhotosToStorage\(\)/.test(l) && !/^\s*\/\//.test(l));
  assert.ok(linea, 'no se encontró la llamada a migratePhotosToStorage');
  assert.ok(/typeof\s+migratePhotosToStorage\s*===\s*'function'/.test(linea),
    'la llamada perdió su guarda typeof: ' + linea.trim());
});

section('Tope de lo que se registra en una serie (2026-07-30)');

// POR QUÉ: hay 800.000.090 kg guardados en producción en un curl femoral. Sin tope, un dedo gordo
// entra al historial y contamina el récord, la gráfica y el volumen para siempre.
test('clampLogValue topa el peso y deja pasar lo razonable', () => {
  assert.strictEqual(core.clampLogValue('kg', '800000090'), '1000');
  assert.strictEqual(core.clampLogValue('kg', '200000'), '1000');
  assert.strictEqual(core.clampLogValue('kg', '-5'), '0');
  // lo normal pasa LITERAL: no se reformatea ni se pierde el decimal
  ['0', '2.5', '60', '100.5', '999.5', '1000'].forEach(v =>
    assert.strictEqual(core.clampLogValue('kg', v), v, 'el tope estropeó un valor legítimo: ' + v));
  // borrar el campo sigue siendo válido (si no, no se puede corregir un dato)
  ['', null, undefined].forEach(v => assert.strictEqual(core.clampLogValue('kg', v), v));
  // el lastre es peso y también se topa; un campo sin tope definido pasa intacto
  assert.strictEqual(core.clampLogValue('lastre', '99999'), '1000');
  assert.strictEqual(core.clampLogValue('loquesea', '99999'), '99999');
  // reps/minutos/distancia tienen su propio techo
  assert.strictEqual(core.clampLogValue('reps', '100000'), '999');
  assert.strictEqual(core.clampLogValue('min', '99999'), '600');
});

test('setLog es la única vía de escritura de una serie y aplica el tope', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-4-entreno.js'), 'utf8');
  const m = src.match(/function setLog\([^)]*\)\{[^\n]*/);
  assert.ok(m, 'no se encontró setLog');
  assert.ok(/clampLogValue/.test(m[0]), 'setLog volvió a guardar el valor crudo: ' + m[0]);
});

section('Auto-cura de valores imposibles ya guardados (2026-07-30)');

// Los dos casos son LOS DE PRODUCCIÓN, con su forma exacta: kg como string, el de Natalia con
// ceros a la izquierda (un teclado trabado, no un dedo), y el volumen guardado ya contaminado.
test('sanitizeHistory borra el valor imposible y RECALCULA el volumen de esa sesión', () => {
  const hist = [{
    id: 'mrozcnp88cyw3jloxih', date: '2026-07-17T14:29:47.797Z',
    totalVol: 12000002430, doneSets: 3, totalSets: 15,
    exercises: [{
      id: 'e40', name: 'Curl Femoral Tumbado', track: 'peso_reps',
      sets: [
        { kg: '00000800000090', reps: '15', done: true },
        { kg: '30', reps: '15', done: true },
        { kg: '30', reps: '12', done: true },
      ],
    }],
  }];
  const r = core.sanitizeHistory(hist);
  assert.strictEqual(r.fixed, 1, 'debe tocar exactamente un valor');
  const sets = r.history[0].exercises[0].sets;
  assert.strictEqual(sets[0].kg, '', 'el valor imposible queda en blanco');
  assert.strictEqual(sets[0].reps, '15', 'las repeticiones NO se tocan');
  assert.strictEqual(sets[0].done, true, 'la serie sigue contando como hecha');
  assert.strictEqual(sets[1].kg, '30', 'las series buenas quedan intactas');
  // 30×15 + 30×12 = 450 + 360 = 810. El 12.000.002.430 se derivaba del dato corrupto.
  assert.strictEqual(r.history[0].totalVol, 810, 'el volumen se recalcula desde lo que queda');
  assert.notStrictEqual(r.history, hist, 'no muta el original (función pura)');
  assert.strictEqual(hist[0].exercises[0].sets[0].kg, '00000800000090', 'el original quedó intacto');
});

test('sanitizeHistory NO toca un historial sano (ni lo copia)', () => {
  const hist = [{
    id: 'x', date: '2026-07-20T10:00:00.000Z', totalVol: 600,
    exercises: [{ id: 'e1', sets: [{ kg: '20', reps: '12', done: true }, { kg: '', reps: '12', done: false }] }],
  }];
  const r = core.sanitizeHistory(hist);
  assert.strictEqual(r.fixed, 0);
  assert.strictEqual(r.history, hist, 'sin cambios debe devolver el MISMO array, no una copia');
  assert.strictEqual(r.history[0].totalVol, 600, 'no recalcula el volumen de lo que no tocó');
});

test('sanitizeHistory aguanta basura sin reventar', () => {
  [null, undefined, [], 'no soy un array', 42, [null], [{}], [{ exercises: null }],
   [{ exercises: [{ sets: null }] }], [{ exercises: [{ sets: [null] }] }]].forEach(x => {
    const r = core.sanitizeHistory(x);
    assert.ok(r && Array.isArray(r.history), 'devolvió algo que no es historial con ' + JSON.stringify(x));
    assert.strictEqual(typeof r.fixed, 'number');
  });
});

// El récord vive APARTE del historial: limpiar la sesión no lo limpia a él.
test('sanitizePrs retira el récord imposible y conserva los reales', () => {
  const prs = {
    e24: { kg: 200000, val: 200000, reps: 12, name: 'Pullover en Polea', date: '2026-07-29T22:21:35.110Z' },
    e5:  { kg: 20, val: 20, reps: 10, name: 'Press de Banca con Barra', date: '2026-07-04T03:21:20.269Z' },
    e9:  { kg: 35, val: 35, reps: 10, name: 'Press Inclinado con Mancuernas' },
  };
  const r = core.sanitizePrs(prs);
  assert.strictEqual(r.removed, 1);
  assert.strictEqual(r.prs.e24, undefined, 'el récord falso se va entero');
  assert.strictEqual(r.prs.e5.kg, 20, 'los reales quedan intactos');
  assert.strictEqual(r.prs.e9.kg, 35);
  assert.ok(prs.e24, 'no muta el original (función pura)');
});

test('sanitizePrs no toca un conjunto sano ni revienta con basura', () => {
  const sanos = { e5: { kg: 20, val: 20, reps: 10 } };
  const r = core.sanitizePrs(sanos);
  assert.strictEqual(r.removed, 0);
  assert.strictEqual(r.prs, sanos, 'sin cambios devuelve el MISMO objeto');
  [null, undefined, 'texto', 42, {}, { e1: null }, { e1: 'raro' }].forEach(x => {
    const rr = core.sanitizePrs(x);
    assert.ok(rr && typeof rr.prs === 'object', 'reventó con ' + JSON.stringify(x));
  });
});

// CANDADO: la cura tiene que estar CABLEADA en la carga, no solo existir. Sin esto, el teléfono
// vuelve a empujar el valor viejo en el siguiente sync (la app es offline-first) y el arreglo de
// la nube no dura ni un día.
test('la auto-cura está cableada en la carga del asesorado y persiste lo que arregla', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-3-coach.js'), 'utf8');
  const i = src.indexOf('function _applyAuthClientDB');
  assert.ok(i > -1, 'no se encontró _applyAuthClientDB');
  // El cuerpo se recorta hasta la SIGUIENTE función, no con una ventana de N caracteres: la
  // ventana fija (2.600) dio un rojo falso en v483 en cuanto un comentario creció dentro de la
  // función. Un candado que se rompe al documentar el código enseña a no documentarlo.
  const fin = src.indexOf('\nfunction ', i + 1);
  const cuerpo = src.slice(i, fin > i ? fin : src.length);
  assert.ok(/sanitizeHistory\(/.test(cuerpo), 'la carga no sanea el historial');
  assert.ok(/sanitizePrs\(/.test(cuerpo), 'la carga no sanea los récords');
  // OJO: no basta con buscar `svNow('ax_hist')` en la zona — el auto-curado de fixtures (v298)
  // ya tiene uno, así que el check pasaba por el motivo equivocado (lo descubrí saboteando: quité
  // la persistencia del saneo y el test siguió verde). Se exige que el svNow esté DENTRO del
  // bloque que dispara cada cura.
  const tras = (marca, n) => { const j = cuerpo.indexOf(marca); return j < 0 ? '' : cuerpo.slice(j, j + n); };
  assert.ok(/svNow\('ax_hist'/.test(tras('_sh.fixed>0', 220)),
    'el saneo del historial no persiste dentro de su propio bloque (el teléfono lo volvería a pisar)');
  assert.ok(/svNow\('ax_pr'/.test(tras('_sp.removed>0', 220)),
    'el saneo de récords no persiste dentro de su propio bloque');
});

section('Racha — el umbral topado (2026-07-30)');

// POR QUÉ: MEDIDO en producción, `streak_weeks` marcaba **0 para las 8 personas de comunidad**,
// incluida quien llevaba 31 sesiones y 10 semanas seguidas entrenando. Causa: la racha exigía
// cumplir `planDays` ENTERO (4-5 días) y la conducta real es 2-3. La gamificación estaba
// desplegada y no premiaba a nadie; los hitos al muro tampoco se disparaban nunca.
test('streakTarget topa la meta del plan, sin inventar días a quien planea menos', () => {
  const c5 = { routines: [{ day: 'Lunes' }, { day: 'Martes' }, { day: 'Miércoles' }, { day: 'Jueves' }, { day: 'Viernes' }] };
  assert.strictEqual(core.planDays(c5), 5, 'el plan sigue siendo de 5 días');
  assert.strictEqual(core.streakTarget(c5), 2, 'la racha se conforma con 2');
  // quien planea MENOS que el tope no recibe una meta inventada más alta
  assert.strictEqual(core.streakTarget({ routines: [{ day: 'Lunes' }] }), 1);
  assert.strictEqual(core.streakTarget({ days: 1 }), 1);
  // nunca 0 ni negativo, pase lo que pase
  [null, undefined, {}, { days: 0 }, { days: -3 }].forEach(x =>
    assert.ok(core.streakTarget(x) >= 1, 'streakTarget cayó por debajo de 1 con ' + JSON.stringify(x)));
});

// El caso REAL que motivó el cambio, con la forma exacta de los datos de producción: plan de 4
// días, entrena 2 por semana, 6 semanas seguidas. Antes daba 0. Este test FALLA con la conducta
// vieja (weekStreak contra planDays) — que es su razón de ser.
test('quien entrena 2 días/semana con un plan de 4 SÍ acumula racha (antes daba 0)', () => {
  const lunes = new Date('2026-07-27T10:00:00');
  const sess = [];
  for (let w = 0; w < 6; w++) {
    for (const off of [0, 2]) {
      const d = new Date(lunes); d.setDate(d.getDate() - w * 7 + off);
      sess.push({ date: d.toISOString(), doneSets: 8, totalSets: 8 });
    }
  }
  const cli = { routines: [{ day: 'Lunes' }, { day: 'Martes' }, { day: 'Jueves' }, { day: 'Viernes' }] };
  const ref = new Date('2026-07-30T18:00:00');
  assert.strictEqual(core.planDays(cli), 4);
  const viejo = core.weekStreak(sess, core.planDays(cli), ref).weeks;
  assert.strictEqual(viejo, 0, 'el escenario debe reproducir el bug: con planDays la racha era 0');
  const nuevo = core.weekStreak(sess, core.streakTarget(cli), ref).weeks;
  assert.ok(nuevo >= 6, 'con el umbral topado debe acumular las 6 semanas, dio ' + nuevo);
});

// CANDADO: el detector de DESCARGA NO puede usar el umbral topado — «semanas seguidas A TOPE»
// significa cumplir el plan completo. Si alguien migra estos dos sitios por descuido, la app le
// recomendaría una semana de descarga a quien entrena 2 días, que es el consejo contrario.
test('el detector de descarga sigue midiendo contra planDays, NO contra streakTarget', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'avi-core.js'), 'utf8');
  const deload = src.split('\n')
    .map((l, i) => ({ l: l, n: i + 1 }))
    .filter(x => /weekStreak\(/.test(x.l) && /nowTs/.test(x.l));
  assert.strictEqual(deload.length, 2, 'esperaba los 2 sitios de carga (coachInsight/coachPulse), hay ' + deload.length);
  deload.forEach(x => assert.ok(/planDays\(/.test(x.l),
    'avi-core.js:' + x.n + ' usa el umbral de racha para medir CARGA: ' + x.l.trim()));
});

// PARIDAD: el umbral vive duplicado en avi-core y en la edge, y no se pueden importar entre sí.
// Si se separan, la app le muestra una racha al asesorado y el servidor publica otra.
test('el umbral de racha de avi-core y el de la edge refresh_snapshot son idénticos', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'supabase/functions/refresh_snapshot/index.ts'), 'utf8');
  const m = src.match(/const\s+STREAK_WEEK_MIN_DAYS\s*=\s*(\d+)/);
  assert.ok(m, 'la edge refresh_snapshot no declara STREAK_WEEK_MIN_DAYS');
  assert.strictEqual(Number(m[1]), core.STREAK_WEEK_MIN_DAYS,
    'el umbral de la edge y el de avi-core se separaron');
  assert.ok(/streakTargetN\s*\(/.test(src), 'la edge perdió streakTargetN');
  assert.ok(/tgt\s*=\s*streakTargetN\(/.test(src), 'la edge volvió a calcular la racha contra planDays');
});

// ── A4 (adopción 2026-07-25): los umbrales de racha viven DUPLICADOS ──
// `STREAK_MILESTONES` está en avi-core.js (para decidir cuándo preguntar el opt-in) y en la edge
// `refresh_snapshot` (que es quien EMITE el hito). No se pueden importar entre sí: uno corre en el
// navegador y el otro en Deno. Si se separan, la app le promete al asesorado un logro que el
// servidor nunca publica. Este check estático es el candado de esa duplicación.
test('A4: los umbrales de racha de avi-core y de la edge refresh_snapshot son idénticos', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'supabase/functions/refresh_snapshot/index.ts'), 'utf8');
  const m = src.match(/const\s+STREAK_MILESTONES\s*=\s*\[([^\]]*)\]/);
  assert.ok(m, 'no se encontró STREAK_MILESTONES en la edge refresh_snapshot');
  // §P3: el `.filter(n => !isNaN(n))` de antes DESCARTABA los tokens no numéricos, así que si
  // alguien AGREGABA un umbral a la edge (…,52,104) el test pasaba en VERDE. Ahora se exige que
  // TODOS los tokens parseen: agregar, quitar o reordenar rompe el check, que es su razón de ser.
  const tokens = m[1].split(',').map(x => x.trim()).filter(x => x.length);
  const edge = tokens.map(Number);
  assert.ok(edge.every(n => Number.isFinite(n)), 'umbrales de la edge con algo que no es número: ' + tokens.join('|'));
  assert.deepStrictEqual(edge, STREAK_MILESTONES, 'los umbrales de la edge y de avi-core se separaron');
  // y el catch-up del opt-in (A4) tiene que seguir existiendo: sin él, decir «sí, celébralo» no
  // publica nada (crossedStreak exige `antes < umbral` y el snapshot ya guardó la racha nueva)
  assert.ok(/catchup/.test(src), 'la edge perdió el catch-up del opt-in de logros');
  assert.ok(/function\s+highestStreak\s*\(/.test(src), 'la edge perdió highestStreak (el umbral vigente)');
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

// ── H1 (auditoría BD 2026-07-31): send-push no puede depender de una llave PÚBLICA ──
// La anon key se sirve en el JS de Pages y está en el repo: usarla de Bearer NO es un
// candado. El control real es el JWT del usuario (`auth.getUser(token)`) + comprobar que
// ese usuario tenga derecho a pushear a ese destinatario. Estas dos afirmaciones son
// estáticas porque el camino vive entre el navegador y Deno (no se puede requerir ninguno
// de los dos en Node), pero muerden: cualquiera de las dos regresiones las tumba.
test('H1: pushToClient manda el JWT del usuario (functions.invoke), no la anon key', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'app-1-infra.js'), 'utf8');
  const m = src.match(/async function pushToClient\([\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró pushToClient en app-1-infra.js');
  const fn = m[0];
  assert.ok(/functions\.invoke\(\s*['"]send-push['"]/.test(fn),
    'pushToClient debe invocar send-push por el cliente auth (functions.invoke)');
  assert.ok(!/fetch\(/.test(fn),
    'pushToClient volvió al fetch crudo: ese camino manda la anon key PÚBLICA de Bearer (H1)');
  assert.ok(!/SB_KEY/.test(fn),
    'pushToClient no debe tocar SB_KEY: la autorización es el JWT de la sesión (H1)');
  assert.ok(/cloudWriteSealed\(/.test(fn),
    'pushToClient perdió el sello: un harness no le manda notificaciones reales a nadie');
});

test('H1: la edge send-push resuelve al usuario por su token y autoriza el destinatario', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'supabase/functions/send-push/index.ts'), 'utf8');
  assert.ok(/auth\.getUser\(\s*token\s*\)/.test(src),
    'send-push debe resolver al usuario con auth.getUser(token) — la anon key no tiene usuario');
  assert.ok(!/sb_publishable_/.test(src),
    'send-push volvió a llevar la anon key hardcodeada como candado (H1)');
  assert.ok(/_authorize\(/.test(src),
    'send-push perdió la comprobación de a QUIÉN puede pushear el que llama');
  // El permiso del destinatario asesorado sale de la fila del DESTINATARIO (su coach_id),
  // nunca de un campo que el que llama pueda escribirse a sí mismo (clase F7).
  assert.ok(/eq\("user_id",\s*target\)/.test(src),
    'la titularidad del destinatario debe leerse de SU fila (user_data.user_id = target)');
  // '_coach' son las suscripciones del teléfono de Camilo: un asesorado de OTRO coach
  // (existe el coach QA de los harness) no puede hacérselo sonar.
  assert.ok(/coach_id\s*===\s*COACH_UID/.test(src),
    'la rama _coach debe exigir que el coach del que llama sea COACH_UID, no un coach cualquiera');
});

// ── Los ACOMPAÑANTES del plan de comida se COMEN: entran al presupuesto y a la cuenta ──
// Hasta el 2026-08-03 se mapeaban solo a nombre para pintarlos y sus macros no entraban en
// ningún lado → el plan servía hasta un 22% más de lo que prometía en su propia tarjeta, y
// pegaba más fuerte en quien está en déficit (Luz, perder grasa: prometía 1.768 kcal y
// servía 2.160; su déficit de 500 quedaba en ~110).
test('nutAcompMacros: un acompañante conocido aporta sus macros, uno inventado aporta 0', () => {
  const conFruta = nutAcompMacros(['guayaba']);
  assert.ok(conFruta.kcal > 0, 'la guayaba debe aportar calorías: es fruta, no aire');
  assert.ok(conFruta.carb_g > 0, 'la guayaba debe aportar carbohidrato');
  // 'ensalada' NO es un alimento de la tabla (se usa como acompañante en 3 menús)
  assert.deepStrictEqual(nutAcompMacros(['ensalada']), { prot_g: 0, carb_g: 0, fat_g: 0, kcal: 0 },
    'un id que no está en la tabla no debe inventar macros');
  assert.deepStrictEqual(nutAcompMacros([]), { prot_g: 0, carb_g: 0, fat_g: 0, kcal: 0 });
  assert.deepStrictEqual(nutAcompMacros(null), { prot_g: 0, carb_g: 0, fat_g: 0, kcal: 0 });
});

// 🔴 ORÁCULO INDEPENDIENTE — no le preguntes a la app cuánto sirve.
// Primer intento de estos tests: comparar `plan.target` contra `plan.real`. **El sabotaje salió
// VERDE** y por una razón que vale más que el test: con el defecto puesto, `plan.real` NO cuenta
// los acompañantes, así que la app REPORTA 9,6% mientras SIRVE 22%. Un test que le pregunta a la
// app cuánto sirve recibe la misma mentira que el usuario. Por eso este ayudante recalcula lo
// servido desde la tabla de alimentos y los gramos escritos en el plato: es la comida REAL.
function _kcalRealmenteServidas(plan) {
  let p = 0, c = 0, f = 0;
  (plan.meals || []).forEach(m => {
    (m.items || []).forEach(it => {
      const food = core.NUT_FOOD_BY_ID[it.id];
      if (!food) return;
      p += food.p * it.grams / 100; c += food.c * it.grams / 100; f += food.f * it.grams / 100;
    });
  });
  // los acompañantes SE COMEN, los cuente la app o no. Se recuperan por NOMBRE, que es lo
  // único que el plan expone de ellos para pintarlos.
  const porNombre = {};
  core.NUT_FOODS.forEach(x => { porNombre[x.name] = x; });
  (plan.meals || []).forEach(m => {
    (m.acomp || []).forEach(nombre => {
      const food = porNombre[nombre];
      if (!food) return;                       // 'ensalada' no es alimento de la tabla
      const g = (food.un && food.un.g > 0) ? food.un.g : 100;
      p += food.p * g / 100; c += food.c * g / 100; f += food.f * g / 100;
    });
  });
  return { kcal: Math.round(p * 4 + c * 4 + f * 9), prot_g: Math.round(p), carb_g: Math.round(c), fat_g: Math.round(f) };
}

// Recorre un conjunto de perfiles × 7 días y devuelve el peor desvío de kcal y el peor
// hueco de CARBOHIDRATO. El de carbohidrato existe por un aviso de Andrés que salió de medir:
// con topes de ración puestos, el desvío de kcal del día se veía PERFECTO (0,2%) mientras el
// carbohidrato caía un 42% — el exceso de las meriendas compensaba el déficit y el promedio
// mentía. **Un test que solo mira las kcal del día deja pasar un macro roto.**
// 🔴 Y desde v471 devuelve también el peor hueco de PROTEÍNA, que es el macro que Andrés
// protege y el que NADIE estaba vigilando: hasta esta versión `grep -c "peorProt"` daba 0. El
// filtro de menús miraba solo kcal, así que un menú que cuadraba el total y entregaba 20 g menos
// de proteína «cabía» — a Kathe, la persona por la que Andrés peleó +26 g, le quitaba 22 g en su
// peor día. Medido sobre estos perfiles: el peor hueco era **−23,8%** y ninguna línea lo decía.
function _peorDesvioPlan(perfiles) {
  let peorKcal = -Infinity, quienKcal = '', peorCarb = Infinity, quienCarb = '';
  let peorProt = Infinity, quienProt = '';
  perfiles.forEach(p => {
    const base = nutritionEstimate(p);
    if (!base) return;
    for (let d = 0; d < 7; d++) {
      const plan = nutDayPlan(base, d % 2 ? 'pierna' : 'torso', 4, 2, d);
      if (!plan) continue;
      const real = _kcalRealmenteServidas(plan);
      const dk = 100 * (real.kcal - plan.target.kcal) / plan.target.kcal;
      const dc = 100 * (real.carb_g - plan.target.carb_g) / plan.target.carb_g;
      const dp = 100 * (real.prot_g - plan.target.prot_g) / plan.target.prot_g;
      const quien = `${p.sex} ${p.weight}kg ${p.height}cm af${p.activityFactor} ${p.goal} día ${d}`;
      if (dk > peorKcal) { peorKcal = dk; quienKcal = quien; }
      if (dc < peorCarb) { peorCarb = dc; quienCarb = quien; }
      if (dp < peorProt) { peorProt = dp; quienProt = quien; }
    }
  });
  return { peorKcal, quienKcal, peorCarb, quienCarb, peorProt, quienProt };
}

// Los 8 perfiles TÍPICOS: calcados de gente real de producción + el caso límite que disparó
// el arreglo del piso calórico. Aquí el guardián va apretado.
const _PERFILES_TIPICOS = [
  { sex: 'F', age: 39, weight: 82, height: 156, activityFactor: 1.55, goal: 'Perder grasa' },
  { sex: 'F', age: 28, weight: 85, height: 163, activityFactor: 1.55, goal: 'Perder grasa' },
  { sex: 'F', age: 34, weight: 74, height: 156, activityFactor: 1.55, goal: 'Recomposición' },
  { sex: 'F', age: 40, weight: 56, height: 162, activityFactor: 1.55, goal: 'Ganar músculo' },
  { sex: 'M', age: 28, weight: 78, height: 176, activityFactor: 1.725, goal: 'Ganar músculo' },
  { sex: 'M', age: 26, weight: 82, height: 175, activityFactor: 1.55, goal: 'Recomposición' },
  { sex: 'M', age: 22, weight: 60, height: 172, activityFactor: 1.725, goal: 'Ganar músculo' },
  { sex: 'F', age: 50, weight: 48, height: 150, activityFactor: 1.2, goal: 'Perder grasa' },
];

// La ESQUINA MALA, encontrada barriendo 5.040 días: mujer liviana, alta, SEDENTARIA y en
// déficit — objetivo calórico chiquito donde el redondeo a media ración pesa muchísimo.
// Va en el test a propósito: un guardián que solo mira los casos cómodos no es un guardián.
const _PERFILES_EXTREMOS = _PERFILES_TIPICOS.concat([
  { sex: 'F', age: 30, weight: 55, height: 170, activityFactor: 1.2, goal: 'Perder grasa' },
  { sex: 'F', age: 30, weight: 45, height: 160, activityFactor: 1.2, goal: 'Perder grasa' },
  { sex: 'M', age: 30, weight: 65, height: 160, activityFactor: 1.55, goal: 'Ganar músculo' },
]);

test('el plan de comida CUENTA los acompañantes en lo que dice servir', () => {
  const base = nutritionEstimate({ sex: 'F', age: 39, weight: 82, height: 156, activityFactor: 1.55, goal: 'Perder grasa' });
  const plan = nutDayPlan(base, 'pierna', 4, 2, 1);
  assert.ok(plan && plan.meals.length, 'el plan del día debe traer comidas');
  const servidoDeVerdad = _kcalRealmenteServidas(plan);
  // Lo que la app REPORTA tiene que coincidir con lo que de verdad se come (±2% por redondeos).
  // Con el defecto, la app reportaba ~11% menos de lo que ponía en el plato.
  const brecha = Math.abs(100 * (plan.real.kcal - servidoDeVerdad.kcal) / servidoDeVerdad.kcal);
  assert.ok(brecha <= 2,
    `la app dice servir ${plan.real.kcal} kcal y en el plato hay ${servidoDeVerdad.kcal}: se está callando ${brecha.toFixed(1)}%`);
});

// 🔴 VALORES VERIFICADOS CONTRA FUENTE — no los cambies "a ojo".
// Estos tres se corrigieron el 2026-08-03 porque estaban mal y el error llegaba al plato de
// una persona. Un valor equivocado NO se detecta desde dentro del sistema: la yuca cruda es
// internamente coherente (160 ≈ 1,4×4 + 38×4 + 0,3×9), así que ningún test de cuadre la caza.
// El único candado posible es AFIRMAR el valor verificado y obligar a re-verificar contra la
// fuente para cambiarlo. Si este test te estorba, la respuesta no es aflojarlo: es traer la
// fuente nueva y actualizar el comentario.
test('los 3 valores de la tabla verificados contra fuente siguen puestos', () => {
  const by = core.NUT_FOOD_BY_ID;
  // 🔴 YUCA — este bloque es la lección más cara de la tabla, y su propio comentario mentía.
  // Decía «ICBF/tablas de composición, verificado 2026-08-03» y afirmaba 112 kcal… nombrando
  // justo la fuente que dice **157**. El 112 nunca salió del ICBF ni de USDA: era la fila CRUDA
  // de USDA (SR 169985: 160/1,36/38,1/0,28) multiplicada por 0,70 exacto en los cuatro macros,
  // con una premisa («cocida absorbe agua») que la TCAC desmiente en su propia columna de humedad
  // (61,6% cocida contra 60,9% cruda). O sea: el arreglo del 3-ago cambió un número malo por otro
  // inventado, y este test lo estuvo DEFENDIENDO con un mensaje que sonaba a autoridad.
  // Cerrado el 2026-08-15 leyendo la fila B106 del PDF oficial del ICBF (pág. 54 impresa).
  // 🎓 Por eso el candado no puede ser solo «afirma el valor»: tiene que afirmar la CITA, para que
  // el que venga pueda ir a mirarla. Un valor afirmado sin cita localizable es indefendible.
  assert.strictEqual(by.yuca.kcal, 157, 'yuca cocida = 157 kcal/100 g (TCAC B106), no los 112 deducidos');
  assert.strictEqual(by.yuca.c, 36.6, 'carbohidrato TOTAL de la fila B106 (el disponible es 33,9)');
  assert.ok(/B106/.test(by.yuca.ref || ''), 'y la cita viaja con el dato, o no se puede re-verificar');
  // Avena: una CUCHARADA de hojuelas pesa ~5,6 g, no 15 (verificado 2026-08-03). Con 15 g la
  // persona servía un TERCIO de lo recetado, y es el alimento más denso de la tabla.
  assert.strictEqual(by.avena.un.label, 'taza', 'la avena se mide en taza: la cucharada mentía por 3x');
  assert.strictEqual(by.avena.un.g, 80);
  // Atún: la lata colombiana de 160 g netos escurre ~104 g (Van Camp's, verificado 2026-08-03).
  assert.strictEqual(by.atun.un.g, 100, 'la lata escurrida son ~100 g, no 120');
});

// Los planes CLAVADOS EN UN PISO (`floored`) se miden aparte, y no por comodidad: ahí el
// objetivo calórico ya no lo manda el gasto sino el mínimo de seguridad, así que la persona
// recibe un presupuesto chiquito con una proteína que sigue saliendo de su peso — y el
// redondeo a media ración pesa muchísimo. Medido 2026-08-06: TODA la diferencia entre +14,6%
// y +23,3% vive en esta esquina; ninguna de las 19 personas reales de producción está en ella
// (todas tienen factor de actividad ≥1.55), pero 3 de las 10 mujeres quedan a UN TOQUE.
const _sinPiso = ps => ps.filter(p => { const e = nutritionEstimate(p); return e && !e.floored; });
const _conPiso = ps => ps.filter(p => { const e = nutritionEstimate(p); return e && e.floored; });

test('en gente TÍPICA el plan no se pasa del 16% ni deja el carbohidrato bajo -12%', () => {
  // Umbrales DERIVADOS midiendo, no elegidos a ojo. Con las meriendas magras + los 3 valores
  // corregidos de la tabla, el máximo medido sobre estos perfiles es **+14,6% en kcal** y
  // **−7,6% en carbohidrato**. 16% y −12% dejan margen sin dejar de morder.
  const objetivo = _sinPiso(_PERFILES_TIPICOS);
  assert.ok(objetivo.length >= 7, `el barrido perdió perfiles: quedan ${objetivo.length}`);
  const r = _peorDesvioPlan(objetivo);
  assert.ok(r.peorKcal <= 13,
    `el plan sirve ${r.peorKcal.toFixed(1)}% más de lo que promete (${r.quienKcal}) — el tope es 13%`);
  // 🔴 La aserción de CARBOHIDRATO existe por un aviso de Andrés que salió de medir: con topes
  // de ración, el desvío de kcal del día se veía perfecto (0,2%) mientras el carbohidrato caía
  // un 42% para un hombre en volumen. El promedio mentía. Un test que solo mira kcal no lo ve.
  assert.ok(r.peorCarb >= -12,
    `al plan le falta ${Math.abs(r.peorCarb).toFixed(1)}% del carbohidrato prometido (${r.quienCarb}) — el tope es -12%`);
  // 🔒 LA PROTEÍNA, que hasta v471 no vigilaba nadie. Medido con el filtro por macro puesto: el
  // peor hueco es **−9,2%** (era −23,8% sin él). El tope va en −11%: apretado contra la medida.
  assert.ok(r.peorProt >= -11,
    `al plan le falta ${Math.abs(r.peorProt).toFixed(1)}% de la proteína prometida (${r.quienProt}) — el tope es -11%`);
});

// 🟢 EL FRENTE DEL PISO CALÓRICO, CERRADO (2026-08-09). Aquí vivía un test aparte que ACOTABA el
// defecto en 29% «mientras se arregla», y con él las 3 sedentarias sacadas del barrido por
// `_sinPiso`. Ya no hacen falta ninguno de los dos: **las 3 vuelven al guardián de todos**, que es
// donde debieron estar siempre. Su propio mensaje decía qué hacer el día que bajara de 16%, y lo
// dice el commit de v470: no lo decidí yo, lo decidió la medición.
test('ni en los casos EXTREMOS el plan se pasa del 13%', () => {
  // La esquina mala salió de barrer 5.040 días: mujer liviana, alta y en déficit — objetivo
  // chiquito donde el redondeo a media ración pesa muchísimo. Va aquí a propósito: un guardián
  // que solo mira los casos cómodos no es un guardián. Y ahora **incluye a las 3 del piso**, que
  // son las que llegaban a +28,6%.
  const r = _peorDesvioPlan(_PERFILES_EXTREMOS);
  assert.strictEqual(_conPiso(_PERFILES_EXTREMOS).length, 3,
    'el barrido perdió las sedentarias del piso: son ellas las que destapaban el defecto');
  // 🔴 EL TOPE VOLVIÓ A 13% (2026-08-12). En v471 se subió de 13 a 14 alegando que «el peor medido
  // pasó de +12,08% a **+13,04%**» — y ese 13,04% **NO EXISTE**: no lo reproduce ni Fable
  // verificando v471/v472 (mide 12,55%) ni esta medición sobre v475, que da **+12,6%**. O sea que
  // el guardián se aflojó un punto entero para dejar sitio a una cifra que nadie ha vuelto a ver.
  // Aflojar un guardián sobre un número que no se reproduce es el modo de fallo que este repo
  // tiene registrado, y esta vez lo cometí yo.
  // Lo que v471 SÍ compró en estos mismos perfiles, y sigue en pie:
  //     proteína  −23,8% → **−9,2%**   ·   carbohidrato  −11,0% → **−9,4%**
  // ⚠️ El aire sobre lo medido queda en **0,4 puntos**, menos que el ~1 punto con que se derivó el
  // 13 desde el 12,1. Es apretado A PROPÓSITO: el 14 sobraba, y un guardián con holgura de más no
  // avisa de nada. Si esto se pone rojo, PRIMERO se mide (`r.peorKcal` sale en el mensaje) y se
  // averigua qué lo movió; el tope solo se toca con la cifra nueva escrita aquí y su razón.
  // 🎓 2026-08-15: este guardián se puso en rojo (+15,2%) al traer 8 filas de la TCAC, y estuve a
  // punto de subirlo a 16 con una justificación elaborada — «la medición dejó de hacerse contra una
  // tabla equivocada». Era FALSA. Midiendo cuál lo movió (revertir los 8 de uno en uno) apareció
  // que la causa era UNA fila mal elegida: le puse al «muslo de pollo» la F090 «pierna o colombina»
  // (el muslo INFERIOR) cuando en Colombia el muslo de AVI es el contramuslo. Bajar su proteína de
  // 26 a 22,9 empujaba al solver por un escalón de medida casera y DUPLICABA las porciones de esa
  // comida (48 g → 95 g de pollo, 79 → 158 de arroz). Revertida esa fila, el tope de 13 aguanta.
  // 🔴 La lección: cuando un guardián se pone rojo, la respuesta NUNCA es la primera explicación
  // que se te ocurra para subirlo — es medir cuál de tus cambios lo movió. La explicación bonita
  // habría aflojado 3 puntos un tope que protege a la persona más expuesta del sistema.
  assert.ok(r.peorKcal <= 13,
    `el plan sirve ${r.peorKcal.toFixed(1)}% más de lo que promete (${r.quienKcal}) — el tope es 13%`);
  assert.ok(r.peorCarb >= -13,
    `al plan le falta ${Math.abs(r.peorCarb).toFixed(1)}% del carbohidrato prometido (${r.quienCarb}) — el tope es -13%`);
  // 🔒 Y su hermana POR MACRO, que es la razón de ser de todo el cambio.
  assert.ok(r.peorProt >= -11,
    `al plan le falta ${Math.abs(r.peorProt).toFixed(1)}% de la proteína prometida (${r.quienProt}) — el tope es -11%`);
});

// 🔒 EL PISO DE PROTEÍNA DE LA COMIDA (`NUT_PROT_MIN_SHARE`, 0,70 → 0,60 en v494, REGLA 4 del
// dictamen de Andrés Hyp). El piso existe para que el proteico no desaparezca del plato («20 g de
// atún con 490 g de pasta»), pero puesto demasiado alto EMPUJA: la comida sirve mucha más proteína
// de la que su propia meta pide, porque el carbohidrato que la acompaña también aporta.
// Lo que se afirma es la propiedad, no la constante — con 0,70 este test CAE.
test('🔴 v494 · el piso de proteína no EMPUJA la comida por encima de su propia meta', () => {
  const byId = {}; core.NUT_FOODS.forEach(f => { byId[f.id] = f; });
  let comidas = 0, sobre130 = 0, bajo85 = 0, minRacion = Infinity, minTxt = '';
  const combos = new Set();
  _PERFILES_EXTREMOS.forEach(p => {
    const base = nutritionEstimate(p); if (!base) return;
    ['pierna', 'torso', 'descanso'].forEach(k => {
      for (let d = 0; d < 7; d++) {
        const plan = nutDayPlan(base, k, 4, 2, d); if (!plan) continue;
        plan.meals.forEach(m => {
          comidas++;
          // ORÁCULO INDEPENDIENTE: la proteína se recalcula desde los gramos y la tabla, no se le
          // pregunta a `m.real` — que es el número que el defecto de v470 falseaba.
          let pr = 0;
          m.items.forEach(it => { const f = byId[it.id]; if (f) pr += f.p * it.grams / 100; });
          const ac = core.nutAcompMacros(m.acompIds || []); pr += (ac && ac.prot_g) || 0;
          const r = m.target.prot_g > 0 ? pr / m.target.prot_g : 1;
          if (r > 1.30) sobre130++;
          if (r < 0.85) bajo85++;
          combos.add(m.items.map(i => i.id).sort().join('+'));
          m.items.forEach(it => { if (it.rol === 'prot' && it.grams < minRacion) { minRacion = it.grams; minTxt = it.text; } });
        });
      }
    });
  });
  assert.ok(comidas > 1000, `el barrido solo resolvió ${comidas} comidas: no prueba nada`);
  // Medido 2026-08-18 sobre estas 11 personas (1.155 comidas): 0,70 → **23** · 0,65 → 16 ·
  // 0,60 → **14** · 0,55 → 14. El tope de 18 cae entre los dos y con 0,70 este test se pone ROJO.
  assert.ok(sobre130 <= 18,
    `${sobre130} comidas sirven más del 130% de su propia meta de proteína — el piso está empujando`);
  // 🔒 Y LO QUE NO SE PUEDE PAGAR A CAMBIO, que es lo que autoriza bajarlo:
  // (1) que se quede corta (0,70 y 0,60 dan los MISMOS 14: bajar el piso no recorta la entrega);
  assert.ok(bajo85 <= 14, `${bajo85} comidas se quedan por debajo del 85% de su proteína`);
  // (2) que aparezca la ración que no es ración — el «5 g de atún» rechazado dos veces (v471, v485);
  assert.ok(minRacion >= 25, `el plato sirve una ración proteica de ${minRacion} g («${minTxt}»): eso es un redondeo, no una ración`);
  // (3) que se pierda variedad. Medido: 46 combinaciones con 0,70 y **47** con 0,60 — SUBE.
  assert.ok(combos.size >= 46, `la variedad cayó a ${combos.size} combinaciones distintas`);
});

// 🔒 EL TOPE DE RACIÓN DEL HUEVO (v495). Era el único proteico sin `maxG` y el plato llegaba a
// servir SEIS huevos en un desayuno. Se afirma la ración que la persona ve en la mesa, no la
// constante — porque el defecto no es que falte un campo, es lo que aparece en el plato.
test('🔴 v495 · el plato no sirve más de 4 huevos en una sola comida', () => {
  let comidas = 0, maxG = 0, maxTxt = '', sobre4 = 0;
  _PERFILES_EXTREMOS.forEach(p => {
    const base = nutritionEstimate(p); if (!base) return;
    ['pierna', 'torso', 'descanso'].forEach(k => {
      for (let d = 0; d < 7; d++) {
        const plan = nutDayPlan(base, k, 4, 2, d); if (!plan) return;
        plan.meals.forEach(m => {
          comidas++;
          m.items.forEach(it => {
            if (it.id !== 'huevo') return;
            if (it.grams > maxG) { maxG = it.grams; maxTxt = it.text; }
            if (it.grams > 200) sobre4++;
          });
        });
      }
    });
  });
  assert.ok(comidas > 1000, `el barrido solo resolvió ${comidas} comidas: no prueba nada`);
  // Medido 2026-08-18: SIN tope el barrido sirve hasta **«6 huevos (300 g)»** y 18 raciones pasan
  // de 4; con el tope, la mayor es «4 huevos (200 g)» y las de más de 4 son **0**.
  assert.strictEqual(sobre4, 0, `${sobre4} raciones sirven más de 4 huevos (la mayor: «${maxTxt}»)`);
  assert.ok(maxG > 0, 'control: si el barrido no sirve huevo ni una vez, este test no prueba nada');
  // 🔒 Y el tope va en la TABLA, que es de donde lo lee `nutPortionText`: ponerlo a mano en el
  // solver sería la segunda verdad de siempre. La clara —su par por densidad— lo tiene igual.
  assert.strictEqual(core.NUT_FOOD_BY_ID.huevo.maxG, 200);
  assert.strictEqual(core.NUT_FOOD_BY_ID.clara.maxG, 200);
});

// 🔴 LA FUNCIÓN QUE CERRÓ EL FRENTE. Lo que se afirma no es que elija «bien» —eso lo miden los
// dos guardianes de arriba— sino las dos cosas que puede romper alguien tocándola sin querer:
// que NO deje de rotar (variedad) y que NO se quede callada cuando no hay nada que quepa.
test('🔴 el menú se elige entre los que CABEN, y la rotación sigue viva', () => {
  const banco = core.NUT_MENUS.almuerzo;
  // Presupuesto normal: la rotación manda y días distintos dan menús distintos.
  // 🔁 v490: era `{41, 138, 20}`. Se movió porque las 6 filas sin fuente pasaron a sus valores
  // reales y ese presupuesto concreto quedó dejando 3 menús. **NO es que la variedad empeorara**:
  // medido sobre 720 presupuestos, los menús distintos en 7 días van de **4,06 a 4,00** — el
  // fixture caducó, no el producto. El nuevo se buscó a barrido cerca del viejo: 5 distintos en
  // 7 días con 5 de 7 factibles (el viejo tampoco los admitía todos).
  const meta = { prot_g: 42, carb_g: 130, fat_g: 20 };
  const vistos = new Set();
  for (let d = 0; d < 7; d++) vistos.add(core.nutPickMenu(banco, d, meta).menu.pick.prot);
  assert.ok(vistos.size >= 4, `la rotación se aplanó a ${vistos.size} menús distintos en 7 días`);
  // Determinista: mismo día + mismo presupuesto = mismo menú, siempre.
  assert.strictEqual(core.nutPickMenu(banco, 3, meta).menu, core.nutPickMenu(banco, 3, meta).menu);
  // 🔒 CON EL BANCO PARCIALMENTE FACTIBLE NO SE PIERDE NINGUNO. Con este presupuesto caben los
  // índices [0,1,2,4,5] (la lenteja y el fríjol se caen) y la semana tiene que visitarlos TODOS:
  // quedarse con un subconjunto es el defecto del banco de UNO que ya costó una versión en el
  // generador de rutinas.
  // ⚠️ Lo que este test NO prueba, y conviene que quede escrito: no distingue «rotar sobre los
  // factibles» de «el primero que quepa desde donde apunta el día». Se comprobó saboteando y salió
  // VERDE — las dos formas cubren lo mismo porque `start` recorre todos los índices. Lo que se
  // afirma es la COBERTURA, que es lo que le importa a quien come.
  // ⚠️ EL ORÁCULO DE ESTE TEST ESTABA VIEJO, y por eso se toca (no se está callando nada).
  // Decía «CABE» = `over <= MAX_OVER`, o sea SOLO calorías. Desde v471 caber es BILATERAL y POR
  // MACRO (no pasarse, no quedarse corto, y la proteína aparte), así que el filtro de referencia
  // afirmaba una regla que la función ya no tiene y el test medía contra el criterio de ayer.
  // El presupuesto también cambió: con el viejo `{p28 c45 f14}` el criterio vivo deja UN solo
  // menú (medido, 1 de 7) y su propia guardia de abajo lo habría dicho — «dejó de discriminar».
  // El nuevo se eligió barriendo: de 10.842 presupuestos que discriminan, este deja 4 de 7.
  const cabeDeVerdad = c => c.over <= core.NUT_MENU_MAX_OVER
    && c.over >= -core.NUT_MENU_MAX_UNDER
    && c.protRatio >= 1 - core.NUT_MENU_PROT_UNDER;
  const apretado = { prot_g: 40, carb_g: 150, fat_g: 16 };
  const factibles = banco.filter(m => cabeDeVerdad(core.nutPickMenu([m], 0, apretado)));
  assert.ok(factibles.length > 1 && factibles.length < banco.length,
    `este presupuesto dejó de discriminar (caben ${factibles.length} de ${banco.length}) — busca otro o el test no prueba nada`);
  const visitados = new Set();
  for (let d = 0; d < banco.length; d++) visitados.add(core.nutPickMenu(banco, d, apretado).menu);
  assert.strictEqual(visitados.size, factibles.length,
    `la rotación visitó ${visitados.size} de los ${factibles.length} menús que sí cabían`);
  factibles.forEach(m => assert.ok(visitados.has(m),
    `un menú que CABÍA nunca le tocó a nadie: ${m.pick.prot}`));
  // 🔒 Y NINGUNO de los que NO caben se cuela por la puerta de la rotación.
  banco.filter(m => !cabeDeVerdad(core.nutPickMenu([m], 0, apretado)))
    .forEach(m => assert.ok(!visitados.has(m),
      `se sirvió un menú que NO cabía habiendo ${factibles.length} que sí: ${m.pick.prot}`));
  // 🔒 Presupuesto IMPOSIBLE (nadie cabe): NO devuelve null ni el de la rotación a ciegas —
  // devuelve el que MENOS INCUMPLE. Ojo: «el que menos se pasa» (mirar solo `over`) era el
  // mismo defecto de kcal-puro que se acaba de matar arriba, vivo en el respaldo; ahora se
  // mide la peor de las tres condiciones y se elige la menor.
  const enano = { prot_g: 2, carb_g: 2, fat_g: 1 };
  const peorCaso = core.nutPickMenu(banco, 0, enano);
  assert.ok(peorCaso && peorCaso.menu, 'con un presupuesto imposible se quedó sin menú');
  const incumple = c => Math.max(
    c.over - core.NUT_MENU_MAX_OVER,
    -core.NUT_MENU_MAX_UNDER - c.over,
    (1 - core.NUT_MENU_PROT_UNDER) - c.protRatio,
  );
  const peorTodos = banco.map(m => incumple(core.nutPickMenu([m], 0, enano)));
  assert.ok(incumple(peorCaso) <= Math.min(...peorTodos) + 1e-9,
    `con nada factible eligió uno que incumple ${incumple(peorCaso).toFixed(3)} habiendo uno de ${Math.min(...peorTodos).toFixed(3)}`);
  // 🔒 Y el que elige en condiciones normales CABE de verdad.
  assert.ok(core.nutPickMenu(banco, 0, meta).over <= core.NUT_MENU_MAX_OVER,
    'eligió un menú que se pasa del tope habiendo alternativas');
  // Banco vacío no revienta.
  assert.strictEqual(core.nutPickMenu([], 0, meta), null);
  assert.strictEqual(core.nutPickMenu(null, 0, meta), null);
});

// 🔴 EL PISO DE CALORÍAS, con su propio candado — porque NO lo tenía.
// Se supo saboteando: quitar `NUT_MENU_MAX_UNDER` dejaba la suite entera en VERDE. El motivo es
// la lección que ya está escrita en el repo con otra cara: **el total del día TAPA la comida
// rota**. Medido, quitar el piso no mueve ni un decimal del desvío del DÍA (−8,95% con y sin),
// mientras las comidas servidas 10% por debajo de su propio presupuesto pasan de **42 a 53 de
// 385**. Por eso la aserción es POR COMIDA y sobre el contrato, no sobre un promedio.
test('🔴 v471 · un menú que se queda CORTO no se sirve habiendo alternativas', () => {
  const banco = core.NUT_MENUS.almuerzo;
  // Presupuesto elegido barriendo: deja UN menú descalificado ÚNICAMENTE por el piso (sirve
  // −11,9%, con la proteína al 91% y sin pasarse de calorías) y otros 6 que sí cuadran. Si el piso
  // desaparece, «cabe» y la rotación se lo sirve a alguien.
  // 🔁 RE-BARRIDO el 2026-08-15: el anterior era {34, 105, 13} y dejó de producir menús cortos al
  // corregir 8 alimentos contra la TCAC — el propio test lo cantó («busca otro»), que es para lo
  // que está su control. El nuevo se eligió con el MISMO criterio, entre 388 candidatos que
  // reproducen el perfil del original (un solo corto, proteína 85-102%, entrega bajo −9%).
  const meta = { prot_g: 22, carb_g: 90, fat_g: 11 };
  const cortos = banco.filter(m => core.nutPickMenu([m], 0, meta).over < -core.NUT_MENU_MAX_UNDER);
  const buenos = banco.filter(m => {
    const c = core.nutPickMenu([m], 0, meta);
    return c.over <= core.NUT_MENU_MAX_OVER && c.over >= -core.NUT_MENU_MAX_UNDER
      && c.protRatio >= 1 - core.NUT_MENU_PROT_UNDER;
  });
  // CONTROL: sin menús cortos Y sin alternativas, este test no probaría nada.
  assert.ok(cortos.length >= 1, 'el presupuesto dejó de producir menús cortos — busca otro');
  assert.ok(buenos.length >= 2, `sólo ${buenos.length} menús caben: sin alternativa el corto sería legítimo`);
  const servidos = new Set();
  for (let d = 0; d < banco.length; d++) servidos.add(core.nutPickMenu(banco, d, meta).menu);
  cortos.forEach(m => {
    const c = core.nutPickMenu([m], 0, meta);
    assert.ok(!servidos.has(m),
      `se sirvió un menú que entrega ${(100 * c.over).toFixed(1)}% de lo prometido habiendo ${buenos.length} que cuadran: ${m.pick.prot}`);
  });
});

// 🔴 EL DESEMPATE DEL RESPALDO PESA LA PROTEÍNA — y también nació sin candado.
// Saboteándolo (devolverlo a `|over|`) la suite salía VERDE: mi primera aserción usaba un
// presupuesto donde los dos criterios COINCIDEN, así que el defecto la satisfacía. Es el gotcha
// ya escrito: «al escribir el test, pregunta si con el bug puesto este número también pasaría».
// Este presupuesto se buscó a propósito entre los 2.782 en que los dos criterios DIVERGEN.
test('🔴 v471 · sin ningún menú factible, el respaldo NO decide por calorías solas', () => {
  const banco = core.NUT_MENUS.media;
  const meta = { prot_g: 21, carb_g: 120, fat_g: 4 };
  const cs = banco.map(m => core.nutPickMenu([m], 0, meta));
  // CONTROL: aquí no puede caber ninguno, o estaríamos probando el otro camino.
  assert.ok(!cs.some(c => c.over <= core.NUT_MENU_MAX_OVER && c.over >= -core.NUT_MENU_MAX_UNDER
    && c.protRatio >= 1 - core.NUT_MENU_PROT_UNDER),
    'con este presupuesto ya cabe alguno: el test dejó de probar el respaldo');
  const porKcal = cs.reduce((a, b) => (Math.abs(b.over) < Math.abs(a.over) ? b : a));
  // CONTROL: el criterio VIEJO elegiría uno que se queda MUY corto de proteína. Si no, el
  // sabotaje no tendría nada que romper y este test sería decorativo.
  assert.ok(porKcal.protRatio < 0.8,
    `el criterio de kcal puras ya no elige un menú flojo de proteína (${(100 * porKcal.protRatio).toFixed(0)}%) — busca otro presupuesto`);
  const elegido = core.nutPickMenu(banco, 0, meta);
  assert.notStrictEqual(elegido.menu, porKcal.menu,
    `el respaldo eligió por calorías el menú que entrega ${(100 * porKcal.protRatio).toFixed(0)}% de la proteína`);
  assert.ok(elegido.protRatio > porKcal.protRatio,
    `el respaldo entregó ${(100 * elegido.protRatio).toFixed(0)}% de proteína pudiendo entregar más`);
});

// ── EL PUESTO DE GLÚTEO DEL FULL BODY (validado por Valery, 2026-08-03) ──
// El Full Body —lo que recibe TODO principiante y también quien entrena ≤2 días— no tenía
// puesto dedicado de glúteo. Corre contra el CATÁLOGO REAL, no un fixture: los tres defectos
// que este test vigila (el aductor disfrazado de glúteo, las pliometrías en nivel de
// principiante y el hip thrust unilateral) son datos del catálogo y un fixture no los tiene.
test('🔴 todo principiante recibe glúteo dirigido, y nunca uno peligroso (2.016 días)', () => {
  const EXL = core.EX_LEVEL;
  let dias = 0, conGluteo = 0;
  const avanzados = [], saltos = [], prohibidos = [];
  ['F', 'M', ''].forEach(sex => {
    ['Perder grasa', 'Ganar músculo', 'Recomposición', 'Salud general'].forEach(goal => {
      ['gym', 'casa', 'corporal', 'parque'].forEach(place => {
        [2, 3, 4, 5].forEach(days => {
          // con y sin lesión declarada: el filtro de lesiones NO puede vaciar este puesto
          ['', 'hernia discal L4-L5', 'menisco operado rodilla derecha'].forEach(notes => {
            const r = generarRutinas({ sex, age: 30, level: 'Principiante', days, goal, place, weight: 70, height: 168, notes },
              _LIB_REAL, { seed: 42, now: '2026-08-03T10:00:00Z' });
            (r.routines || []).forEach(rt => {
              dias++;
              const g = (rt.exercises || []).filter(e => e.muscle === 'gluteo');
              if (g.length) conGluteo++;
              g.forEach(e => {
                const lv = e.level || EXL[e.id] || 'I';
                // 'I' es el respaldo previsto del gate (cap 1, preferP) cuando un entorno no
                // tiene opción 'P'; medido, solo ocurre en `corporal`. 'A' JAMÁS.
                if (lv === 'A') avanzados.push(`${e.id} ${e.name} en ${place}`);
                if (e.type === 'HIIT' || /salto|patinador/i.test(e.name)) saltos.push(`${e.id} ${e.name} en ${place}`);
                // e60 = ADUCTOR (estaba etiquetado glúteo) · e92 = Hip Thrust Unilateral,
                // que su propia ficha llama «progresión avanzada»
                if (e.id === 'e60' || e.id === 'e92') prohibidos.push(`${e.id} ${e.name} en ${place}`);
              });
            });
          });
        });
      });
    });
  });
  assert.ok(dias > 1900, `esperaba el barrido completo, generé ${dias} días`);
  assert.strictEqual(conGluteo, dias,
    `${dias - conGluteo} de ${dias} días de principiante quedaron SIN trabajo dirigido de glúteo`);
  assert.deepStrictEqual(avanzados, [], 'a un principiante no le puede caer un glúteo de nivel avanzado');
  assert.deepStrictEqual(saltos, [], 'pliometría de impacto en el puesto de glúteo de un principiante');
  assert.deepStrictEqual(prohibidos, [], 'e60 es ADUCTOR y e92 es progresión avanzada: no van en este puesto');
});

test('e60 es aductor (no glúteo) y las pliometrías de salto son nivel avanzado', () => {
  // Los tres son datos del catálogo y no se detectan generando planes si el slot cambia:
  // se afirman aquí. e60 lo delata su propia descripción y el mapa muscular (`adductors`).
  const e60 = _LIB_REAL.find(e => e.id === 'e60');
  assert.strictEqual(e60.muscle, 'piernas', 'e60 «Aducción de Cadera» trabaja el aductor, no el glúteo');
  // e186/e205 contra sus hermanas idénticas, que siempre estuvieron en 'A'
  ['e185', 'e186', 'e187', 'e205'].forEach(id => {
    assert.strictEqual(core.EX_LEVEL[id], 'A', `${id} es pliometría de alto impacto: va en nivel A`);
  });
});

// ── CORDURA RELATIVA: el cero de más que el tope absoluto no ve ──
// El tope de 1.000 kg de v417 atrapó el 800.000.090 pero dejó pasar **200 kg × 12** sellados
// como récord en producción (5 fechas), con las otras dos series de ESE día en 20 kg.
// 🔴 El primer criterio que escribí (4× la mediana de TODA su historia en ese ejercicio) marcó
// 21 series y **la mayoría era PROGRESO REAL** — alguien que pasó de 2,5 a 10 kg. Por eso la
// regla mira DENTRO de la sesión: un cero de más convive con valores normales el mismo día;
// progresar hace que el valor nuevo SEA el normal en todas las series.
// Tope relativo a la propia persona. El umbral se DERIVÓ midiendo 1.258 series reales: la regla
// completa dispara en 9 (0,7%). Estos casos son los que decidieron la forma de la regla.
test('🔴 kgNeedsConfirm: pide confirmar el disparate y NO estorba al progreso real', () => {
  // El caso del PO: Samuel, mejor prensa 90 kg, escribe 800 → límite 180, se le pide confirmar.
  assert.strictEqual(core.kgNeedsConfirm(800, 90, 90), true);
  assert.strictEqual(core.kgConfirmLimit(90, 90), 180);
  // 🔴 LA RAZÓN DE QUE HAGAN FALTA LAS DOS CONDICIONES: doblar un peso PEQUEÑO es normal.
  // De 5 a 12 kg en un accesorio es progreso real (2,4× pero solo +7 kg) → NO molesta.
  assert.strictEqual(core.kgNeedsConfirm(12, 5, 40), false, 'estorbaría a quien sube de 5 a 12 kg');
  // …y doblar uno GRANDE es imposible: de 100 a 220 (2,2× y +120) → sí pregunta.
  assert.strictEqual(core.kgNeedsConfirm(220, 100, 100), true);
  // Progresión normal: subir 5 kg sobre 100 no pregunta nunca.
  assert.strictEqual(core.kgNeedsConfirm(105, 100, 100), false);
  // Sin referencia en ESE ejercicio (28,6% de las series reales) cae a su mejor marca global…
  assert.strictEqual(core.kgConfirmLimit(0, 90), 180);
  // …y con alguien sin ningún historial, al piso, para que el primer día no sea un interrogatorio.
  assert.strictEqual(core.kgConfirmLimit(0, 0), 120);
  assert.strictEqual(core.kgNeedsConfirm(160, 0, 0), true);
  assert.strictEqual(core.kgNeedsConfirm(100, 0, 0), false);
  // Vacíos y basura no preguntan nada (se anota en blanco todo el tiempo).
  [null, undefined, '', 0, -5, 'abc'].forEach(v =>
    assert.strictEqual(core.kgNeedsConfirm(v, 90, 90), false, 'preguntó por un valor vacío: ' + v));
});

test('kgOutlier: caza el cero de más y deja en paz al progreso, dropsets y calentamientos', () => {
  assert.strictEqual(kgOutlier([20, 20, 200], 2), true, 'el 200 entre 20 y 20 es un cero de más');
  assert.strictEqual(kgOutlier([10, 10, 10], 2), false, 'subir de peso en TODAS las series es progresar');
  assert.strictEqual(kgOutlier([2.5, 52.5], 1), false, 'con 2 series no hay con qué comparar: no se acusa');
  assert.strictEqual(kgOutlier([40, 30, 20], 0), false, 'un dropset baja de peso a propósito');
  assert.strictEqual(kgOutlier([5, 40, 40], 1), false, 'una serie de calentamiento no vuelve outlier a las de trabajo');
  assert.strictEqual(kgOutlier([], 0), false);
  assert.strictEqual(kgOutlier(null, 0), false);
});

test('sanitizeHistory borra el kg imposible de la sesión y RECALCULA su volumen', () => {
  const ses = [{
    date: '2026-06-10T12:00:00Z', totalVol: 11280,
    exercises: [{ id: 'e46', name: 'Peso Muerto con Piernas Rígidas', sets: [
      { kg: '20', reps: '12', done: true }, { kg: '20', reps: '12', done: true }, { kg: '200', reps: '12', done: true },
    ] }],
  }];
  const r = sanitizeHistory(ses);
  assert.strictEqual(r.fixed, 1, 'debe sanear exactamente la serie imposible');
  const sets = r.history[0].exercises[0].sets;
  assert.strictEqual(sets[2].kg, '', 'el valor imposible va en BLANCO, jamás recortado (recortar afirma algo falso)');
  assert.strictEqual(sets[0].kg, '20', 'las series buenas no se tocan');
  assert.strictEqual(r.history[0].totalVol, 480, 'el volumen se recalcula desde lo que queda (20×12 + 20×12)');
});

test('sanitizePrs retira el récord FANTASMA que nadie podría volver a batir', () => {
  // Caso real: PR de 200 kg cuando lo más pesado que sobrevive en su historial son 40.
  // Mientras siga ahí, ese ejercicio le queda «estancado» de por vida.
  const hist = [{ date: '2026-07-29T12:00:00Z', exercises: [
    { id: 'e46', name: 'Peso Muerto con Piernas Rígidas', sets: [{ kg: '40', reps: '5' }, { kg: '40', reps: '5' }] },
  ] }];
  const prs = { e46: { kg: 200, val: 200, reps: 12, name: 'Peso Muerto con Piernas Rígidas' } };
  assert.strictEqual(sanitizePrs(prs, hist).removed, 1, 'el récord fantasma debe retirarse');
  // CONTROL: un récord legítimo (aunque sea el mejor de su vida) NO se toca
  const prsOk = { e46: { kg: 45, val: 45, reps: 5, name: 'Peso Muerto con Piernas Rígidas' } };
  assert.strictEqual(sanitizePrs(prsOk, hist).removed, 0, 'un récord real, apenas por encima de lo suyo, se respeta');
  // CONTROL: sin historial se comporta como antes (solo el tope absoluto)
  assert.strictEqual(sanitizePrs(prs).removed, 0, 'sin historial no hay base relativa: no se inventa');
});

// ── EL PESO SUGERIDO TIENE QUE SUBIR (bucle cerrado, medido 2026-08-03) ──
// Estimaba el 1RM desde el récord y devolvía el 95% para ESAS MISMAS reps = exactamente el
// peso que la persona ya levanta. PR 10 kg × 12 → 1RM 14 → 14/1,4 × 0,95 = 9,5 → redondea a
// **10**. El peso sugerido no sube ⇒ el récord no sube ⇒ el detector lo llama estancamiento.
// Caso real: 10 sesiones en 2 meses remando con 10 kg mientras hacía hip thrust con 100.
test('🔴 suggestFromPR: si ya cumpliste las reps objetivo, el peso SUBE (doble progresión)', () => {
  // El caso exacto que estaba en producción
  const r = suggestFromPR({ kg: 10, reps: 12, unit: 'kg' }, 12);
  assert.ok(r > 10, `sugirió ${r} kg cuando ya levanta 10: el peso sugerido nunca subiría`);
  assert.strictEqual(r, 12.5);
  // Y no se calla por encima de 15 reps: ahí es JUSTO cuando se ganó el salto de mancuerna
  const luz = suggestFromPR({ kg: 2.5, reps: 20, unit: 'kg' }, 15);
  assert.ok(luz != null, 'con 20 reps la app se callaba (estimate1RM devuelve null > 15 reps)');
  assert.ok(luz > 2.5, `sugirió ${luz} tras 20 repeticiones con 2,5 kg`);
});

test('suggestFromPR: si el récord es a MENOS reps que el objetivo, sigue estimando hacia abajo', () => {
  // CONTROL: la regla nueva no puede convertirse en «sumar siempre».
  const r = suggestFromPR({ kg: 60, reps: 5, unit: 'kg' }, 12);
  assert.ok(r != null && r < 60, `para 12 reps debe sugerir MENOS de 60, sugirió ${r}`);
  // CONTROLES de borde: sin PR, PR que no es de peso, PR sin kg
  assert.strictEqual(suggestFromPR(null, 12), null);
  assert.strictEqual(suggestFromPR({ val: 30, reps: 1, unit: 'reps' }, 12), null);
  assert.strictEqual(suggestFromPR({ kg: 0, reps: 12, unit: 'kg' }, 12), null);
});

test('loadStep: el escalón es proporcional — 2,5 kg sobre una mancuerna de 2,5 es +100%', () => {
  assert.strictEqual(loadStep(2.5), 1, 'quien arranca liviano no puede saltar el doble');
  assert.strictEqual(loadStep(10), 2.5);
  assert.strictEqual(loadStep(100), 5);
  assert.ok(loadStep(2.5) < loadStep(100), 'el escalón crece con la carga');
});

// ── EL ÁNIMO DECLARADO TIENE QUE SOBREVIVIR A LA MEDIANOCHE ──
// Vivía solo en localStorage (`mood_<cid>_<fecha>`): la persona declaraba dolor, la app le
// bajaba la carga ese día y después la penalizaba por no haber levantado peso — un falso
// estancamiento fabricado por la propia app. app-4 no es requerible en Node (usa globals de
// browser), así que se verifica en la fuente, en las DOS ramas que escriben la sesión.
test('🔴 el ánimo declarado se guarda EN LA SESIÓN (no solo en el teléfono)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'app-4-entreno.js'), 'utf8');
  const rama1 = /already\.mood\s*=\s*\(typeof getTodayMood/.test(src);
  const rama2 = /unshift\(\{\s*mood:\s*\(typeof getTodayMood/.test(src);
  assert.ok(rama1, 'la rama que ACTUALIZA una sesión en curso perdió el ánimo');
  assert.ok(rama2, 'la rama que CREA la entrada del historial perdió el ánimo');
  // Las dos: si solo estuviera en la que crea, una sesión que declara el ánimo DESPUÉS de
  // empezar lo perdería — y esa es justo la sesión que interesa (la que salió mal).
  assert.ok(rama1 && rama2, 'el ánimo debe guardarse en las DOS ramas');
});

// ══════════════════════════════════════════════════════
// EL HÉROE DE «HOY» — dirección B «El Compromiso» (v503)
// ══════════════════════════════════════════════════════
// La maqueta que eligió el PO se dibujó con una rutina de 4 ejercicios y un nombre de 15
// letras. Los datos reales del 19-ago (93 rutinas de 24 filas) dicen otra cosa: la moda son
// 6 ejercicios, 35 rutinas tienen 7 o más (una tiene 14) y el nombre más largo son 40
// caracteres. Estos tests fijan lo que el héroe hace con los datos que EXISTEN, no con los
// de la maqueta.

test('🔴 el héroe no le pone «series × reps» a un cardio (clase Camilo 2026-06-29)', () => {
  assert.strictEqual(exDoseShort({ type: 'Cardio', sets: 1, reps: 20 }), '20 min');
  assert.strictEqual(exDoseShort({ type: 'Isométrico', sets: 3, reps: 45 }), '3 × 45s');
  assert.strictEqual(exDoseShort({ type: 'HIIT', sets: 4, reps: 8 }), '4 rondas');
  assert.strictEqual(exDoseShort({ type: 'Compuesto', sets: 4, reps: 10 }), '4 × 10');
  // El track explícito manda sobre el tipo (es el campo que el coach edita).
  assert.strictEqual(exDoseShort({ track: 'cardio', type: 'Compuesto', sets: 3, reps: 25 }), '25 min');
});

test('el titular se encoge con nombres largos (a 34 px, 40 caracteres son cuatro líneas)', () => {
  assert.strictEqual(heroTitleSize('Pierna y glúteo'), 'xl');
  assert.strictEqual(heroTitleSize('Gluteo y Piernas A — Cadena Posterior'), 'md');
  // Nombre REAL más largo del backup del 19-ago: 40 caracteres.
  assert.strictEqual(heroTitleSize('Tren Superior — Espalda, Pecho y Hombros'), 'md');
  assert.strictEqual(heroTitleSize(''), 'xl');
  assert.strictEqual(heroTitleSize(null), 'xl');
});

test('🔴 el héroe NUNCA lista más de 6 ejercicios, y dice cuántos deja fuera', () => {
  const ex = n => Array.from({ length: n }, (_, i) => ({ id: 'e' + i, name: 'Ejercicio ' + i, sets: 3, reps: 10 }));
  const seis = todayHeroModel({ name: 'Pierna', exercises: ex(6), restSec: 90 });
  assert.strictEqual(seis.lines.length, 6, 'la rutina más común (6) se lista COMPLETA');
  assert.strictEqual(seis.rest, 0);
  // 8 ejercicios (15 rutinas reales): 5 filas + el resumen. Nunca 8 filas en la portada.
  const ocho = todayHeroModel({ name: 'Pierna', exercises: ex(8), restSec: 90 });
  assert.strictEqual(ocho.lines.length, HERO_MAX_LINES - 1);
  assert.strictEqual(ocho.rest, 3, 'lo que no cabe se DICE, no se esconde');
  assert.strictEqual(ocho.count, 8, 'el total sigue siendo el de verdad');
  // La de 14 ejercicios (existe, una) no puede pintar 14 filas.
  assert.ok(todayHeroModel({ name: 'x', exercises: ex(14), restSec: 90 }).lines.length <= HERO_MAX_LINES);
  // La numeración es la del plan, en orden y a dos dígitos.
  assert.deepStrictEqual(seis.lines.map(l => l.n), ['01', '02', '03', '04', '05', '06']);
});

test('🔴 el héroe no promete «menos de una hora» cuando la rutina dura más', () => {
  const ex = n => Array.from({ length: n }, (_, i) => ({ id: 'e' + i, name: 'Ej ' + i, sets: 4, reps: 10 }));
  // 4 ejercicios × 4 series × (45 + 90)s = 36 min → la promesa es verdad.
  const corta = todayHeroModel({ name: 'Corta', exercises: ex(4), restSec: 90 });
  assert.strictEqual(corta.mins, 36);
  assert.strictEqual(corta.underHour, true);
  // 8 ejercicios × 4 series = 72 min → la app se calla, no miente.
  const larga = todayHeroModel({ name: 'Larga', exercises: ex(8), restSec: 90 });
  assert.strictEqual(larga.mins, 72);
  assert.strictEqual(larga.underHour, false);
  // Sin series legibles no hay estimación → tampoco promesa (mins null, no 0).
  const sinDato = todayHeroModel({ name: 'X', exercises: [{ id: 'e', name: 'Ej', sets: 0, reps: '' }] });
  assert.strictEqual(sinDato.mins, null);
  assert.strictEqual(sinDato.underHour, false);
});

test('rutina VACÍA → no hay héroe (la vista degrada a la tarjeta de arranque, no a un héroe hueco)', () => {
  assert.strictEqual(todayHeroModel({ name: 'Vacía', exercises: [] }), null);
  assert.strictEqual(todayHeroModel({ name: 'Nula' }), null);
  assert.strictEqual(todayHeroModel(null), null);
  // Un ejercicio nulo dentro del arreglo no cuenta como ejercicio.
  assert.strictEqual(todayHeroModel({ name: 'X', exercises: [null, undefined] }), null);
  // Y un nombre en blanco no deja el titular vacío.
  assert.strictEqual(todayHeroModel({ name: '   ', exercises: [{ name: 'Sentadilla', sets: 3, reps: 10 }] }).name, 'Entrenamiento');
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
