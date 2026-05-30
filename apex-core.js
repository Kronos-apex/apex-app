// apex-core.js — Lógica de negocio pura de APEX (sin DOM, sin globals de app)
// ─────────────────────────────────────────────────────────────────────
// FUENTE ÚNICA DE VERDAD para la lógica crítica testeable.
//
// Se carga en index.html como <script src="apex-core.js"></script> ANTES
// del script principal, por lo que estas funciones quedan disponibles como
// globales del navegador. También se exporta con module.exports para que
// apex.test.js pruebe ESTE archivo (no una copia).
//
// REGLA: si tocas una de estas funciones, los tests reflejan el cambio
// automáticamente. No dupliques esta lógica dentro de index.html.
// ─────────────────────────────────────────────────────────────────────
'use strict';

// ── ICC — etiqueta de riesgo por sexo ──
// Umbral masculino [0.90, 0.95], femenino [0.80, 0.85].
function getIccLabel(v, sex) {
  const lim = sex === 'M' ? [0.90, 0.95] : [0.80, 0.85];
  if (v < lim[0]) return { label: 'Distribución favorable', color: 'var(--g2)' };
  if (v < lim[1]) return { label: 'Riesgo moderado', color: 'var(--yl)' };
  return { label: 'Distribución de riesgo', color: 'var(--rd)' };
}

// ── Código de sexo normalizado ('M' / 'F') ──
function getSexCode(sex) {
  return sex === 'M' ? 'M' : 'F';
}

// ── Macros sugeridos a partir del cliente ──
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

// ── Migración: asigna .id a rutinas que no lo tengan ──
// idFn: generador de ids (el navegador pasa uid(); fallback incluido para tests).
function migrateRoutineIds(clients, idFn) {
  const genId = idFn || (() => Date.now().toString(36) + Math.random().toString(36).slice(2));
  let migrated = false;
  (clients || []).forEach(c => {
    (c.routines || []).forEach(r => {
      if (!r.id) { r.id = genId(); migrated = true; }
    });
  });
  return migrated;
}

// ── Push: ¿debe enviarse el POST de suscripción? ──
// true si el endpoint guardado difiere del actual (suscripción nueva o renovada).
// Guard contra reenvíos duplicados que rompieron las notificaciones (2026-05-25).
function shouldPostPush(storedEndpoint, newEndpoint) {
  return storedEndpoint !== newEndpoint;
}

// ── delClient: guard de confirmación ──
// true solo si hay cliente Y el usuario confirma.
function delClientGuard(client, confirmFn) {
  if (!client || !confirmFn()) return false;
  return true;
}

// ── cn-today: guard de re-render (muta CUR.todayRenderedDay) ──
// true (y actualiza CUR) solo si hay cliente y cambió el día.
function cnTodayGuard(CUR, todayLabel, clientExists) {
  if (clientExists && CUR.todayRenderedDay !== todayLabel) {
    CUR.todayRenderedDay = todayLabel;
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
// AUTO-GENERADOR DE RUTINAS (Paso 1) — ver docs/auto-generador-rutinas.md
// ─────────────────────────────────────────────────────────────────────
// Produce un BORRADOR completo de la semana a partir del perfil del cliente.
// El coach SIEMPRE revisa/aprueba (innegociable por seguridad). Función pura,
// sin DOM. Config en objetos (splits/slots/scheme/exclusiones) → fácil de tunear.
// ─────────────────────────────────────────────────────────────────────

// Normaliza texto: minúsculas + sin acentos (para matching robusto de notas/nombres).
function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Etiquetas de día (1..6) y nombres legibles de cada bloque.
const GEN_DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Plantillas de bloque: cada slot = [muscle, type|null, n]. type null = cualquiera de ese músculo.
const GEN_DAYS = {
  FULL_BODY:      { name: 'Full Body', slots: [['piernas', 'Compuesto', 1], ['pecho', 'Compuesto', 1], ['espalda', 'Compuesto', 1], ['hombros', 'Compuesto', 1], ['core', null, 1]] },
  GP_A:           { name: 'Glúteo y Piernas A', slots: [['gluteo', 'Compuesto', 2], ['piernas', 'Compuesto', 1], ['gluteo', 'Aislamiento', 1], ['piernas', 'Aislamiento', 2], ['core', null, 1]] },
  GP_B:           { name: 'Glúteo y Piernas B', slots: [['piernas', 'Compuesto', 2], ['gluteo', 'Compuesto', 1], ['gluteo', 'Aislamiento', 2], ['piernas', 'Aislamiento', 1], ['core', null, 1]] },
  TREN_SUP:       { name: 'Tren Superior', slots: [['pecho', 'Compuesto', 1], ['espalda', 'Compuesto', 1], ['hombros', 'Compuesto', 1], ['biceps', 'Aislamiento', 1], ['triceps', 'Aislamiento', 1]] },
  EMP_BRAZOS:     { name: 'Empuje y Brazos', slots: [['pecho', 'Compuesto', 1], ['hombros', 'Compuesto', 1], ['triceps', 'Aislamiento', 2], ['biceps', 'Aislamiento', 2]] },
  CORE_CARDIO:    { name: 'Core y Cardio', slots: [['core', null, 2], ['cardio', null, 2]] },
  EMPUJE:         { name: 'Empuje', slots: [['pecho', 'Compuesto', 2], ['hombros', 'Compuesto', 1], ['pecho', 'Aislamiento', 1], ['hombros', 'Aislamiento', 1], ['triceps', 'Aislamiento', 2]] },
  TRACCION:       { name: 'Tracción', slots: [['espalda', 'Compuesto', 2], ['espalda', 'Aislamiento', 1], ['hombros', 'Aislamiento', 1], ['biceps', 'Aislamiento', 2]] },
  PIERNA:         { name: 'Pierna', slots: [['piernas', 'Compuesto', 2], ['piernas', 'Funcional', 1], ['piernas', 'Aislamiento', 2], ['gluteo', 'Aislamiento', 1], ['core', null, 1]] },
  HOMBROS_BRAZOS: { name: 'Hombros y Brazos', slots: [['hombros', 'Compuesto', 1], ['hombros', 'Aislamiento', 2], ['biceps', 'Aislamiento', 2], ['triceps', 'Aislamiento', 2]] },
  CARDIO_CORE:    { name: 'Cardio y Core', slots: [['cardio', null, 2], ['core', null, 2]] },
};

// Splits por sexo + días (regla de Andrés: mujer→glúteo/pierna primero; hombre→tren sup/fuerza).
const GEN_SPLITS = {
  F: {
    3: ['GP_A', 'TREN_SUP', 'GP_B'],
    4: ['GP_A', 'TREN_SUP', 'GP_B', 'CORE_CARDIO'],
    5: ['GP_A', 'TREN_SUP', 'GP_B', 'EMP_BRAZOS', 'CORE_CARDIO'],
    6: ['GP_A', 'TREN_SUP', 'GP_B', 'GP_A', 'TREN_SUP', 'GP_B'],
  },
  M: {
    3: ['EMPUJE', 'TRACCION', 'PIERNA'],
    4: ['EMPUJE', 'TRACCION', 'PIERNA', 'TREN_SUP'],
    5: ['EMPUJE', 'PIERNA', 'TRACCION', 'HOMBROS_BRAZOS', 'CARDIO_CORE'],
    6: ['EMPUJE', 'PIERNA', 'TRACCION', 'EMPUJE', 'PIERNA', 'TRACCION'],
  },
};

// Detección de limitaciones físicas en `notes` (lo que hace Laura, codificado).
const GEN_LIMIT_KWS = [
  { zone: 'rodilla', re: /rodilla|menisco|patela|rotula|ligamento|\blca\b|\blcl\b/ },
  { zone: 'lumbar', re: /lumbar|espalda baja|lumbalgia|hernia|ciatic|disco|escolios/ },
  { zone: 'hombro', re: /hombro|manguito|rotador|deltoid/ },
  { zone: 'generic', re: /lesion|operad|postoperat|posoperat|tendon|cirugia|protesis|fractura/ },
];
const GEN_ZONE_LABEL = { rodilla: 'rodilla', lumbar: 'zona lumbar', hombro: 'hombro', generic: 'lesión/postoperatorio' };
// Ejercicios a EXCLUIR por zona (match contra nombre normalizado). Preferimos variantes seguras
// dejando que el fallback elija otras del mismo músculo.
const GEN_ZONE_EXCL = {
  rodilla: /sentadilla|zancada|estocada|salto|pistol|bulgara/,
  lumbar: /peso muerto|remo con barra|buenos dias|hiperexten|sentadilla/,
  hombro: /tras ?nuca|trasnuca|fondos|militar con barra/,
};

// Parsea las notas del cliente → limitaciones detectadas. Exportada para tests.
function parseLimitations(notes) {
  const n = _norm(notes);
  const keys = [];
  GEN_LIMIT_KWS.forEach(k => { if (k.re.test(n)) keys.push(k.zone); });
  const uniq = [...new Set(keys)];
  const detected = uniq.length > 0;
  return {
    detected,
    keys: uniq,
    zones: [...new Set(uniq.map(z => GEN_ZONE_LABEL[z]))],
    advice: detected ? 'Se excluyeron ejercicios contraindicados y se priorizaron variantes seguras.' : '',
  };
}

// Scheme de series/reps/descanso según objetivo (regla de Andrés §2.4) + nivel.
function genSchemeFor(goal, level) {
  const g = _norm(goal);
  let base;
  if (g.includes('perder') || g.includes('grasa') || g.includes('defin')) base = { reps: 14, sets: [3, 4], rest: 55, cardioClose: true };
  else if (g.includes('ganar') || g.includes('masa') || g.includes('musc') || g.includes('volum')) base = { reps: 10, sets: [3, 4], rest: 90 };
  else if (g.includes('recomp')) base = { reps: 12, sets: [3, 4], rest: 70, coreClose: true };
  else if (g.includes('fuerza')) base = { reps: 6, sets: [4, 5], rest: 120 };
  else if (g.includes('resist')) base = { reps: 18, sets: [3, 4], rest: 45, cardioClose: true };
  else base = { reps: 12, sets: [3, 3], rest: 60 }; // salud general / default
  const [lo, hi] = base.sets;
  const setsN = level === 'Principiante' ? Math.min(lo, 3) : level === 'Avanzado' ? hi : Math.min(hi, 4);
  return { setsN, repsN: base.reps, restSec: base.rest, cardioClose: !!base.cardioClose, coreClose: !!base.coreClose };
}

// ¿El ejercicio se trackea sin peso (cardio/hiit/isométrico)? → conserva sets/reps de biblioteca.
function _genKeepNatural(ex) {
  return ex.muscle === 'cardio' || /cardio|hiit/i.test(ex.type || '') || ex.type === 'Isométrico';
}

// Copia enriquecida del ejercicio para la rutina (§2.6 CRÍTICO: id+icon+muscle+type siempre).
function _genMaterialize(ex, scheme) {
  const c = { ...ex };
  c.icon = ex.icon || '💪';
  if (_genKeepNatural(ex)) {
    c.sets = parseInt(ex.sets) || scheme.setsN; // reps natural (minutos/segundos/rondas)
  } else {
    c.sets = scheme.setsN;
    c.reps = scheme.repsN;
  }
  return c;
}

// Orden §2.5: Compuesto → Funcional → Aislamiento → Cardio/Core al final (sort estable).
function _genRank(e) {
  if (e.muscle === 'cardio' || e.muscle === 'core' || _genKeepNatural(e)) return 5;
  if (e.type === 'Compuesto') return 1;
  if (e.type === 'Funcional') return 2;
  return 3; // Aislamiento / Bodyweight
}

// Selector con rotación: avanza un cursor por (muscle|type) para que A y B no salgan idénticos.
// Cae a "solo músculo" si el slot exacto (type) está agotado o vacío (ej. Funcional escaso).
function _genPick(lib, muscle, type, st) {
  const ok = e => e.muscle === muscle && !st.exclude(e)
    && (!st.tier || (e.tier || 'premium') === st.tier)
    && (e.env || ['gym']).includes(st.place); // entorno: el ejercicio debe ser realizable ahí
  // Pools en orden de prioridad. Se usa el primero que tenga algo sin usar hoy:
  //  1) methodBias (ej. calistenia → peso corporal) ANTES que el tipo del slot,
  //  2) tipo exacto del slot, 3) fallback solo-músculo (cuando el tipo está agotado/vacío).
  const pools = [];
  if (st.preferType) pools.push(lib.filter(e => ok(e) && e.type === st.preferType));
  pools.push(lib.filter(e => ok(e) && (type ? e.type === type : true)));
  pools.push(lib.filter(ok));
  let pool = null;
  for (const p of pools) { if (p.some(e => !st.usedInDay.has(e.id))) { pool = p; break; } }
  if (!pool) {
    // Sin NINGUNA opción de este músculo en este entorno → hueco real (lo reporta al coach).
    if (st.envShortfall && !lib.some(ok)) st.envShortfall.add(muscle);
    return null;
  }
  const key = muscle + '|' + (type || '*');
  const start = st.cursors[key] != null ? st.cursors[key] : (st.seed % pool.length);
  for (let i = 0; i < pool.length; i++) {
    const cand = pool[(start + i) % pool.length];
    if (!st.usedInDay.has(cand.id)) {
      st.cursors[key] = (start + i + 1) % pool.length;
      st.usedInDay.add(cand.id);
      return cand;
    }
  }
  return null; // todo el pool ya está usado en este día
}

// Excluder combinado: carga axial con barra para menores + contraindicaciones por zona.
function _genMakeExcluder(lim, minor) {
  const res = [];
  if (minor) res.push(/sentadilla|peso muerto|militar con barra/); // §2.2 <16: sin carga axial con barra (incluye press de barra sobre la cabeza)
  lim.keys.forEach(z => { if (GEN_ZONE_EXCL[z]) res.push(GEN_ZONE_EXCL[z]); });
  return ex => { const n = _norm(ex.name); return res.some(re => re.test(n)); };
}

// Resuelve la lista de bloques (split). Principiante/<16/≤2 días → Full Body.
function _genResolveSplit(sexKey, days, level, minor) {
  if (minor || level === 'Principiante' || days <= 2) return Array(Math.max(1, days)).fill('FULL_BODY');
  return (GEN_SPLITS[sexKey] && GEN_SPLITS[sexKey][days]) || Array(days).fill('FULL_BODY');
}

// ── API principal: genera el borrador de rutinas de la semana ──
// client: {sex,age,level,days,goal,notes}. lib: DB.exercises. opts: {idFn,now,seed,tier}.
// Devuelve { routines:[...], needsReview:bool, limitations:{...} }.
function generarRutinas(client, lib, opts) {
  client = client || {};
  opts = opts || {};
  lib = (lib || []).filter(e => e && e.id && e.muscle);
  const idFn = opts.idFn || (() => Date.now().toString(36) + Math.random().toString(36).slice(2));
  const now = opts.now || new Date().toISOString();
  const days = Math.max(1, Math.min(6, parseInt(client.days) || 3));
  const level = client.level || 'Principiante';
  const age = parseInt(client.age) || null;
  const minor = age != null && age < 16;
  const sexKey = client.sex === 'F' ? 'F' : 'M'; // sexo desconocido → PPL neutro (M)
  const scheme = genSchemeFor(client.goal || '', level);
  const lim = parseLimitations(client.notes || '');
  const place = opts.place || client.place || 'gym'; // entorno de equipo (Fase C)
  const methodBias = opts.methodBias || null;        // del estilo/preset (calistenia/funcional/...)
  const st = {
    cursors: {}, seed: opts.seed || 0, tier: opts.tier || null, place,
    preferType: methodBias === 'calistenia' ? 'Bodyweight' : methodBias === 'funcional' ? 'Funcional' : null,
    scheme, usedInDay: new Set(), exclude: _genMakeExcluder(lim, minor), envShortfall: new Set(),
  };

  const codes = _genResolveSplit(sexKey, days, level, minor);
  const nameCount = {};
  const routines = codes.map((code, idx) => {
    const tpl = GEN_DAYS[code] || GEN_DAYS.FULL_BODY;
    st.usedInDay = new Set();
    let exs = [];
    tpl.slots.forEach(([muscle, type, n]) => {
      for (let i = 0; i < n; i++) {
        const ex = _genPick(lib, muscle, type, st);
        if (ex) exs.push(_genMaterialize(ex, scheme));
      }
    });
    // Cierre por objetivo (§2.4): + cardio/HIIT o + core, si el día no lo trae ya.
    if (scheme.cardioClose && !exs.some(e => e.muscle === 'cardio')) {
      const f = _genPick(lib, 'cardio', null, st); if (f) exs.push(_genMaterialize(f, scheme));
    }
    if (scheme.coreClose && !exs.some(e => e.muscle === 'core')) {
      const f = _genPick(lib, 'core', null, st); if (f) exs.push(_genMaterialize(f, scheme));
    }
    exs = exs.slice().sort((a, b) => _genRank(a) - _genRank(b));

    let nm = tpl.name;
    nameCount[nm] = (nameCount[nm] || 0) + 1;
    if (nameCount[nm] > 1) nm += ' ' + nameCount[nm];
    const note = lim.detected
      ? `⚠️ REVISAR — limitación detectada (${lim.zones.join(', ')}). ${lim.advice} Ajusta antes de aprobar.`
      : 'Borrador generado automáticamente. Revisa y ajusta antes de asignar.';
    return {
      id: idFn(), name: nm, day: GEN_DAY_LABELS[idx] || ('Día ' + (idx + 1)), shift: null,
      note, why: client.goal || '', restSec: scheme.restSec, exercises: exs,
      createdAt: now, generated: true, reviewed: false, needsReview: lim.detected,
    };
  });
  return { routines, needsReview: lim.detected, limitations: lim, place, envGaps: [...st.envShortfall] };
}

// ═══════════════════════════════════════════════════════════════════════
// ENTORNOS DE EQUIPO (env) — ver docs/estilos-y-entornos.md (Fase A)
// ─────────────────────────────────────────────────────────────────────
// Eje INDEPENDIENTE de `goal` y de `tier`. Responde: ¿dónde/con qué se hace?
// Heurístico por nombre+tipo: PROPONE, el coach valida (no es exacto).
// Regla de compatibilidad: lo 'corporal' sirve en todos; 'casa'/'parque' también en 'gym'.
// ─────────────────────────────────────────────────────────────────────
const ENV_ALL = ['corporal', 'casa', 'parque', 'gym'];

function inferExerciseEnv(ex) {
  ex = ex || {};
  const n = _norm(ex.name);
  const type = ex.type || '';
  const muscle = ex.muscle || '';
  // 1) Aparatos exclusivos de gym
  if (/maquina|polea|cable|prensa|smith|hack|gironda|peck|contractora|hammer|multipower|jaca/.test(n)) return ['gym'];
  // 2) Calistenia en barra/paralelas (peso corporal pero necesita estructura)
  if (/dominad|chin.?up|muscle.?up|paralel|colgad|remo invertid|australian/.test(n)) return ['parque', 'gym'];
  // 3) Barra cargada (olímpica / EZ) → gym
  if (/\bbarra\b|\bez\b|olimpic/.test(n)) return ['gym'];
  // 4) Banda elástica → casa / parque / gym
  if (/banda|elastic|\bliga\b/.test(n)) return ['casa', 'parque', 'gym'];
  // 5) Mancuerna → casa / gym
  if (/mancuern/.test(n)) return ['casa', 'gym'];
  // 6) Cardio: máquina vs corporal
  if (muscle === 'cardio') {
    if (/estatic|eliptic|ergometr|cinta|escaladora|spinning/.test(n)) return ['gym'];
    return ENV_ALL.slice(); // carrera, cuerda, burpees, saltos, mountain climbers...
  }
  // 7) Peso corporal / isométrico / funcional / patrones sin implemento → todos
  if (type === 'Bodyweight' || type === 'Isométrico' || type === 'Funcional') return ENV_ALL.slice();
  if (/peso corporal|lagartij|flexion|plancha|superman|puente|zancada|desplante|bulgar|a una pierna|unilateral|pike|burpee|step.?up|crunch|abdominal|mountain|escalador|wall sit|patada de gluteo en cuadrupedia/.test(n)) return ENV_ALL.slice();
  // 8) Por defecto, conservador: gym (el coach reabre a casa si aplica)
  return ['gym'];
}

// ── Exportación dual: navegador (global) + Node (module.exports) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getIccLabel,
    getSexCode,
    calcMacrosSugeridos,
    migrateRoutineIds,
    shouldPostPush,
    delClientGuard,
    cnTodayGuard,
    generarRutinas,
    parseLimitations,
    genSchemeFor,
    inferExerciseEnv,
    ENV_ALL,
  };
}
