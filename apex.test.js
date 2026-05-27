// apex.test.js — Tests críticos de negocio APEX v1.3.2
// Ejecutar con: node apex.test.js
// Sin dependencias externas — Node.js puro

const assert = require('assert');
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
// Lógica extraída de index.html (sin DOM, sin globals)
// ══════════════════════════════════════════════════════

// getIccLabel — líneas 3041-3046
function getIccLabel(v, sex) {
  const lim = sex === 'M' ? [0.90, 0.95] : [0.80, 0.85];
  if (v < lim[0]) return { label: 'Distribución favorable' };
  if (v < lim[1]) return { label: 'Riesgo moderado' };
  return { label: 'Distribución de riesgo' };
}

// sexCode — línea 3029 (el form guarda 'M'/'F', no 'Hombre'/'Mujer')
function getSexCode(sex) {
  return sex === 'M' ? 'M' : 'F';
}

// calcMacrosSugeridos — líneas 4558-4571
function calcMacrosSugeridos(client) {
  const kg = parseFloat(client.weight) || 70;
  const actMap = { 1.2: 30, 1.375: 33, 1.55: 36, 1.725: 40, 1.9: 44 };
  const kcalPerKg = actMap[client.activityFactor] || 33;
  let kcal = Math.round(kg * kcalPerKg);
  const g = (client.goal || '').toLowerCase();
  if (g.includes('perd') || g.includes('baj') || g.includes('defin')) kcal -= 350;
  else if (g.includes('gan') || g.includes('masa') || g.includes('volum') || g.includes('musc')) kcal += 250;
  const protG = g.includes('gan') || g.includes('masa') || g.includes('musc')
    ? Math.round(kg * 2.2)
    : g.includes('perd') || g.includes('baj')
      ? Math.round(kg * 2.0)
      : Math.round(kg * 1.8);
  const fatG = Math.round(kg * 0.9);
  const carbsG = Math.max(0, Math.round((kcal - protG * 4 - fatG * 9) / 4));
  const water = Math.max(6, Math.round(kg * 0.035 / 0.25));
  return { kcal, prot: protG, carbs: carbsG, fat: fatG, water };
}

// migrateRoutineIds — líneas 1617-1618
function uid() { return Math.random().toString(36).slice(2, 10); }
function migrateRoutineIds(clients) {
  let migrated = false;
  clients.forEach(c => {
    (c.routines || []).forEach(r => {
      if (!r.id) { r.id = uid(); migrated = true; }
    });
  });
  return migrated;
}

// subscribePush guard — líneas 1371-1372
// Devuelve true si debe llamar fetch (guard no activado), false si el endpoint ya estaba guardado
function subscribePushGuard(clientId, endpoint, store) {
  const key = `apex_push:${clientId}`;
  if (store[key] === endpoint) return false;
  store[key] = endpoint;
  return true;
}

// delClient guard — línea 3179
function delClientGuard(client, confirmFn) {
  if (!client || !confirmFn()) return false;
  return true;
}

// cnTab cn-today re-render guard — líneas 3727-3731
function cnTodayGuard(CUR, todayLabel, clientExists) {
  if (clientExists && CUR.todayRenderedDay !== todayLabel) {
    CUR.todayRenderedDay = todayLabel;
    return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════

section('1. ICC — umbral por sexo (lines 3041-3046)');

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
  // Verifica que los umbrales sí son distintos entre sexos
  const result = getIccLabel(0.90, 'F');
  // Con umbral femenino [0.80,0.85]: 0.90 < 0.80 = false → 0.90 < 0.85 = false → "Distribución de riesgo"
  assert.strictEqual(result.label, 'Distribución de riesgo');
});

test('mujer ICC 0.78 → Distribución favorable', () => {
  const result = getIccLabel(0.78, 'F');
  assert.strictEqual(result.label, 'Distribución favorable');
});

section('2. Macros — activityFactor → kcalPerKg (lines 4558-4561)');

test('activityFactor=1.55, goal="salud", peso 70kg → kcalPerKg=36, kcal=2520', () => {
  const result = calcMacrosSugeridos({ weight: 70, activityFactor: 1.55, goal: 'salud' });
  // 'salud' no contiene 'gan/perd/etc' → sin ajuste → 70 * 36 = 2520
  assert.strictEqual(result.kcal, 2520,
    `Esperaba 2520 (70kg × 36 kcal/kg). Recibió ${result.kcal}`);
});

test('activityFactor=1.2 → kcalPerKg=30', () => {
  const actMap = { 1.2: 30, 1.375: 33, 1.55: 36, 1.725: 40, 1.9: 44 };
  assert.strictEqual(actMap[1.2] || 33, 30);
});

test('sin activityFactor → kcalPerKg fallback=33', () => {
  const actMap = { 1.2: 30, 1.375: 33, 1.55: 36, 1.725: 40, 1.9: 44 };
  assert.strictEqual(actMap[undefined] || 33, 33);
});

section('3. routine.id migration (lines 1617-1618)');

test('rutina sin .id → recibe .id tras migración, retorna true', () => {
  const clients = [{ id: 'c1', routines: [{ name: 'Lunes' }] }];
  const migrated = migrateRoutineIds(clients);
  assert.strictEqual(migrated, true);
  assert.ok(clients[0].routines[0].id, 'La rutina debe tener id asignado');
  assert.ok(typeof clients[0].routines[0].id === 'string' && clients[0].routines[0].id.length > 0);
});

test('rutina con .id existente no se sobreescribe', () => {
  const clients = [{ id: 'c1', routines: [{ name: 'Lunes', id: 'id-fijo' }] }];
  migrateRoutineIds(clients);
  assert.strictEqual(clients[0].routines[0].id, 'id-fijo');
});

test('todas las rutinas con .id → retorna false (sin migración)', () => {
  const clients = [{ id: 'c1', routines: [{ name: 'Lunes', id: 'abc' }, { name: 'Miércoles', id: 'def' }] }];
  const migrated = migrateRoutineIds(clients);
  assert.strictEqual(migrated, false);
});

section('4. subscribePush guard (lines 1371-1372)');

test('segunda llamada con mismo endpoint → NO llama fetch', () => {
  const store = {};
  const r1 = subscribePushGuard('client-1', 'https://push.ex/abc', store);
  const r2 = subscribePushGuard('client-1', 'https://push.ex/abc', store);
  assert.strictEqual(r1, true, 'Primera llamada debe pasar al fetch');
  assert.strictEqual(r2, false, 'Segunda llamada con mismo endpoint debe ser bloqueada');
});

test('endpoint distinto → sí llama fetch (suscripción renovada)', () => {
  const store = {};
  subscribePushGuard('client-1', 'endpoint-A', store);
  const result = subscribePushGuard('client-1', 'endpoint-B', store);
  assert.strictEqual(result, true);
});

test('clientes distintos con mismo endpoint → ambos pasan', () => {
  const store = {};
  const r1 = subscribePushGuard('coach', 'https://push.ex/abc', store);
  const r2 = subscribePushGuard('client-2', 'https://push.ex/abc', store);
  assert.strictEqual(r1, true);
  assert.strictEqual(r2, true);
});

section('5. delClient — guard de confirmación (line 3179)');

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

section('6. cnTab cn-today — re-render guard (lines 3727-3731)');

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
