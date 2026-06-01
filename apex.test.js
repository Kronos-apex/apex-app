// apex.test.js — Tests críticos de negocio APEX
// Ejecutar con: node apex.test.js
// Sin dependencias externas — Node.js puro.
//
// Estos tests prueban apex-core.js DIRECTAMENTE (la misma fuente que carga
// index.html). No hay lógica duplicada: si cambias una función en
// apex-core.js, el test refleja el cambio automáticamente.

const assert = require('assert');
const core = require('./apex-core.js');
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
  { id: 'h4', name: 'Face Pull en Polea', muscle: 'hombros', type: 'Aislamiento', sets: 4, reps: 15, icon: '🎯' },
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

test('< 16 años → Full Body sin carga axial con barra (ni sentadilla/peso muerto con barra)', () => {
  const { routines } = generarRutinas({ sex: 'M', level: 'Intermedio', age: 14, days: 3, goal: 'Ganar músculo' }, LIB, FIXED);
  routines.forEach(r => assert.ok(/Full Body/.test(r.name)));
  const nombres = routines.flatMap(r => r.exercises).map(e => e.name.toLowerCase());
  nombres.forEach(n => {
    assert.ok(!/sentadilla/.test(n), `Menor no debe recibir "${n}" (carga axial)`);
    assert.ok(!/peso muerto/.test(n), `Menor no debe recibir "${n}" (carga axial)`);
    assert.ok(!/militar con barra/.test(n), `Menor no debe recibir "${n}" (carga axial sobre la cabeza)`);
  });
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

test('notas con "lumbar" → rutina marcada needsReview + ⚠️ en la nota', () => {
  const { routines, needsReview } = generarRutinas({ sex: 'M', level: 'Intermedio', days: 3, goal: 'Ganar músculo', notes: 'hernia lumbar, evitar peso muerto' }, LIB, FIXED);
  assert.strictEqual(needsReview, true);
  routines.forEach(r => {
    assert.strictEqual(r.needsReview, true);
    assert.ok(r.note.includes('⚠️'), 'La nota debe llevar ⚠️ de revisión');
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
// RESUMEN
// ══════════════════════════════════════════════════════

const line = '─'.repeat(50);
console.log(`\n${line}`);
if (failed === 0) {
  console.log(`✅ APEX Tests: ${passed}/${total} pasaron`);
} else {
  console.log(`❌ APEX Tests: ${passed}/${total} pasaron — ${failed} FALLARON`);
  process.exit(1);
}
