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
  // Solo rodilla/lumbar/hombro tienen reglas de exclusión. Una limitación "genérica"
  // (p.ej. "operado", "cirugía" sin nombrar zona) se DETECTA pero NO excluye nada:
  // el mensaje no debe prometer una exclusión que no ocurrió (lo arregla la auditoría 2026-06-01).
  const hasExclusions = uniq.some(z => GEN_ZONE_EXCL[z]);
  return {
    detected,
    keys: uniq,
    zones: [...new Set(uniq.map(z => GEN_ZONE_LABEL[z]))],
    hasExclusions,
    advice: !detected ? ''
      : hasExclusions ? 'Se excluyeron ejercicios contraindicados y se priorizaron variantes seguras.'
      : 'Limitación sin zona específica: NO se excluyó ningún ejercicio automáticamente. Revísala y ajústala a mano antes de aprobar.',
  };
}

// Scheme de series/reps/descanso según objetivo (regla de Andrés §2.4) + nivel.
// `adaptation`: si es true (principiante en sus primeras semanas) sobrescribe el
// esquema del objetivo por una FASE DE ADAPTACIÓN ANATÓMICA — ver isInAdaptation().
function genSchemeFor(goal, level, adaptation) {
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
  const scheme = { setsN, repsN: base.reps, restSec: base.rest, cardioClose: !!base.cardioClose, coreClose: !!base.coreClose };
  // Fase de adaptación: reps altas (mín. 15; la nota indica 15-20) con poco o nada de
  // peso, descanso corto, técnica primero. Sobrescribe el objetivo SIN importar cuál sea
  // (primero el cuerpo aprende el patrón, luego progresamos cargas).
  if (adaptation) {
    scheme.setsN = 3;
    scheme.repsN = 15;
    scheme.restSec = 60;
    scheme.adaptation = true;
  }
  return scheme;
}

// ── Fase de adaptación: ¿el cliente está en sus primeras semanas de entreno? ──
// Solo aplica a principiantes. La ventana arranca cuando EMPIEZAN a entrenar:
// usa client.startDate si existe, si no la primera sesión registrada, si no la fecha
// de alta; sin ninguna referencia → recién empieza (en adaptación). Default 21 días.
const ADAPT_DAYS = 21;
function trainingStartTs(client, history) {
  client = client || {};
  if (client.startDate) return new Date(client.startDate).getTime();
  const sess = (history && history[client.id]) || [];
  let first = Infinity;
  sess.forEach(s => { const t = new Date(s.date).getTime(); if (t < first) first = t; });
  if (first !== Infinity) return first;
  if (client.createdAt) return new Date(client.createdAt).getTime();
  return null;
}
function isInAdaptation(client, history, now, adaptDays) {
  client = client || {};
  if ((client.level || 'Principiante') !== 'Principiante') return false;
  const start = trainingStartTs(client, history);
  if (start == null) return true; // sin historial ni fecha → semana 1
  const ref = (now ? new Date(now) : new Date()).getTime();
  return (ref - start) < (adaptDays || ADAPT_DAYS) * 86400000;
}

// ── Perfil de carga corporal: ¿conviene priorizar máquina/asistido y bajo impacto? ──
// Señales: IMC (peso/estatura²) y relación cintura-talla (RCT = cintura/estatura, el
// mismo indicador que ya usa la app). Devuelve 'high' cuando IMC≥30 (obesidad) o
// RCT≥0.60 (riesgo elevado); si no, 'normal'. Mover más masa hace el peso corporal y
// el impacto articular más exigentes, así que en 'high' el generador prefiere variantes
// guiadas y evita pliométricos. OJO: el IMC no distingue músculo de grasa — por eso la
// cintura, cuando existe, puede subir el perfil. Es una guía, no diagnóstico clínico.
function bmiFrom(weightKg, heightCm) {
  const w = parseFloat(weightKg), h = parseFloat(heightCm);
  if (!w || !h) return null;
  const m = h > 3 ? h / 100 : h; // tolera cm (168) o m (1.68)
  return w / (m * m);
}
function bodyLoadProfile(client, waistCm) {
  client = client || {};
  const bmi = bmiFrom(client.weight, client.height);
  const waist = parseFloat(waistCm);
  const h = parseFloat(client.height);
  const rct = (waist && h) ? waist / (h > 3 ? h : h * 100) : null; // cintura/estatura, ambos en cm
  if ((bmi != null && bmi >= 30) || (rct != null && rct >= 0.60)) return 'high';
  return 'normal';
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
  // Perfil de carga 'high' (IMC/cintura altos): prioriza variantes guiadas/asistidas
  // (máquina, polea, prensa…) DENTRO del tipo del slot, antes de las libres.
  if (st.preferName) pools.push(lib.filter(e => ok(e) && (type ? e.type === type : true) && st.preferName.test(_norm(e.name))));
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

// Movimientos guiados/asistidos (cargan parte del peso o estabilizan) — se prefieren
// cuando el perfil de carga es alto. Patrones en minúsculas SIN tilde (van contra _norm).
const GEN_ASSISTED_RE = /maquina|polea|cable|prensa|smith|hack|peck|contractora|hammer|multipower|jaca|asistid|guiad|sentado|banda/;
// Alto impacto / pliométrico: se evita con perfil de carga alto (más masa = más estrés articular).
const GEN_HIIMPACT_RE = /salto|jump|burpee|pliometr|plyo|sprint|saltar|box jump|tijera saltada|skipping/;

// Excluder combinado: carga axial con barra para menores + contraindicaciones por zona
// + (perfil de carga alto) alto impacto/pliométrico.
function _genMakeExcluder(lim, minor, avoidHighImpact) {
  const res = [];
  if (minor) res.push(/sentadilla|peso muerto|militar con barra/); // §2.2 <16: sin carga axial con barra (incluye press de barra sobre la cabeza)
  if (avoidHighImpact) res.push(GEN_HIIMPACT_RE);
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
  const scheme = genSchemeFor(client.goal || '', level, opts.adaptation);
  const lim = parseLimitations(client.notes || '');
  const place = opts.place || client.place || 'gym'; // entorno de equipo (Fase C)
  const methodBias = opts.methodBias || null;        // del estilo/preset (calistenia/funcional/...)
  const loadProfile = opts.loadProfile === 'high' ? 'high' : 'normal'; // por IMC/cintura (ver bodyLoadProfile)
  const highLoad = loadProfile === 'high';
  const st = {
    cursors: {}, seed: opts.seed || 0, tier: opts.tier || null, place,
    preferType: methodBias === 'calistenia' ? 'Bodyweight' : methodBias === 'funcional' ? 'Funcional' : null,
    preferName: highLoad ? GEN_ASSISTED_RE : null, // perfil alto → variantes guiadas/asistidas primero
    scheme, usedInDay: new Set(), exclude: _genMakeExcluder(lim, minor, highLoad), envShortfall: new Set(),
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
      : scheme.adaptation
      ? '🌱 Fase de adaptación (primeras semanas): 15-20 reps con poco o nada de peso, sin llegar al fallo. La técnica primero; las cargas suben cuando el patrón esté limpio.'
      : 'Borrador generado automáticamente. Revisa y ajusta antes de asignar.';
    return {
      id: idFn(), name: nm, day: GEN_DAY_LABELS[idx] || ('Día ' + (idx + 1)), shift: null,
      note, why: client.goal || '', restSec: scheme.restSec, exercises: exs,
      createdAt: now, generated: true, reviewed: false, needsReview: lim.detected,
    };
  });
  return { routines, needsReview: lim.detected, limitations: lim, place, envGaps: [...st.envShortfall], adaptation: !!scheme.adaptation, loadProfile };
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

// ═══════════════════════════════════════════════════════════════════════
// FUSIÓN DE HISTORIAL (sync) — incidente 2026-06-01
// ─────────────────────────────────────────────────────────────────────
// El historial es APPEND-ONLY: cada entreno completado se agrega. El sync
// guardaba el bloque completo (last-write-wins), así que un dispositivo con
// datos viejos podía PISAR sesiones recién registradas por otro → se perdían
// entrenos (Nataly y Andrés Martínez, 2026-06-01).
//
// mergeHistory une nube + local SIN PERDER NADA: dedupe por id de sesión
// (fallback rutina+día para sesiones viejas sin id), en conflicto conserva la
// versión de fecha más reciente (cubre la re-edición del mismo día que hace
// saveSessionToHistory), ordena nuevo→viejo y respeta el tope de 365 por
// cliente. Pura y testeable. La usa syncFromCloud en index.html.
// ─────────────────────────────────────────────────────────────────────
function _histKey(s) {
  if (s && s.id) return 'id:' + s.id;
  // Sesiones viejas sin id: misma clave que usa saveSessionToHistory (rutina + día).
  const day = s && s.date ? new Date(s.date).toDateString() : '?';
  return (s && (s.routineId || s.routineName) || '?') + '|' + day;
}

// Une dos colecciones por-cliente { clientId: [items] } SIN PERDER NADA.
// keyOf(item) = identidad para dedupe; en conflicto conserva la de fecha más reciente.
// order: 'desc' (nuevo→viejo, p.ej. historial/medidas) o 'asc' (viejo→nuevo, p.ej. chat).
// cap: máximo por cliente (conserva siempre los más nuevos). Pura y testeable.
function mergeClientArrays(local, cloud, keyOf, order, cap) {
  local = local && typeof local === 'object' ? local : {};
  cloud = cloud && typeof cloud === 'object' ? cloud : {};
  const out = {};
  const ids = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  ids.forEach(cid => {
    const a = Array.isArray(local[cid]) ? local[cid] : [];
    const b = Array.isArray(cloud[cid]) ? cloud[cid] : [];
    const byKey = new Map();
    a.concat(b).forEach(it => {
      if (it == null) return;
      const k = keyOf(it);
      const prev = byKey.get(k);
      if (!prev || new Date(it.date || 0) >= new Date(prev.date || 0)) byKey.set(k, it);
    });
    let merged = [...byKey.values()];
    merged.sort((x, y) => {
      const dx = new Date(x.date || 0), dy = new Date(y.date || 0);
      return order === 'asc' ? dx - dy : dy - dx;
    });
    if (cap && merged.length > cap) merged = order === 'asc' ? merged.slice(merged.length - cap) : merged.slice(0, cap);
    out[cid] = merged;
  });
  return out;
}

// Historial: dedupe por id de sesión (fallback rutina+día), nuevo→viejo, tope 365.
function mergeHistory(local, cloud, cap) {
  return mergeClientArrays(local, cloud, _histKey, 'desc', cap || 365);
}

// Récords personales { clientId: { exKey: {val,unit,reps,kg,date,...} } }.
// Conserva el MEJOR récord: mayor valor → más reps → más reciente. Nunca pierde un PR.
function mergePRs(local, cloud) {
  local = local && typeof local === 'object' ? local : {};
  cloud = cloud && typeof cloud === 'object' ? cloud : {};
  const valOf = p => (p && p.val != null ? p.val : (p && p.kg) || 0);
  const out = {};
  const ids = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  ids.forEach(cid => {
    const m = {};
    const absorb = src => {
      const o = (src && src[cid]) || {};
      Object.keys(o).forEach(k => {
        const cand = o[k], cur = m[k];
        if (!cur) { m[k] = cand; return; }
        const cv = valOf(cand), uv = valOf(cur);
        const better = cv > uv
          || (cv === uv && (cand.reps || 0) > (cur.reps || 0))
          || (cv === uv && (cand.reps || 0) === (cur.reps || 0) && new Date(cand.date || 0) > new Date(cur.date || 0));
        if (better) m[k] = cand;
      });
    };
    absorb(local); absorb(cloud);
    out[cid] = m;
  });
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// AGREGADOS DE ACTIVIDAD POR FECHA (dashboard del coach)
// ──────────────────────────────────────────────────────────────────────
// Todas reciben `now` como parámetro (nunca llaman new Date() implícito sobre
// la "fecha de hoy"): así son deterministas y testeables. Operan en zona local
// del navegador. Se agruparon aquí porque la lógica de fechas es la más
// propensa a bugs sutiles (p.ej. mezclar el mismo día de la semana pasada con
// hoy) y antes vivía suelta en index.html, sin tests.
const MS_DAY = 86400000;
const _DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Medianoche local (timestamp) del día al que pertenece `d`.
function localDayStart(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
}

// Barras de retención: cuenta sesiones por DÍA DE CALENDARIO real en los últimos
// 7 días. Devuelve 7 entradas de hace 6 días (i=0) a hoy (i=6): [{label, count}].
// CLAVE: agrupa por fecha local, NO por getDay() — si agrupara por día de la
// semana, las sesiones del mismo día de la semana pasada caerían en la columna
// de "hoy" y mostrarían entrenos fantasma (bug real, 2026-06-02).
function retentionByDay(history, now) {
  const startToday = localDayStart(now || new Date());
  const bars = Array.from({ length: 7 }, (_, i) => {
    const di = new Date(startToday - (6 - i) * MS_DAY).getDay();
    return { label: _DOW[di], count: 0 };
  });
  Object.values(history || {}).forEach(arr => {
    (arr || []).forEach(s => {
      const idx = 6 - Math.round((startToday - localDayStart(s.date)) / MS_DAY);
      if (idx >= 0 && idx <= 6) bars[idx].count++;
    });
  });
  return bars;
}

// Cuántos de `clientIds` entrenaron en los últimos 7 días (ventana móvil de 7×24h).
// Si no se pasan clientIds, usa las llaves de history.
function weeklyActiveCount(history, now, clientIds) {
  const ref = (now ? new Date(now) : new Date()).getTime() - 7 * MS_DAY;
  const ids = clientIds || Object.keys(history || {});
  return ids.filter(id =>
    ((history && history[id]) || []).some(s => new Date(s.date).getTime() >= ref)
  ).length;
}

// Clientes que entrenaron HOY (mismo día de calendario local que `now`).
// Devuelve [{client, sessions}] ordenado por la sesión más reciente (desc).
function clientsTrainedToday(clients, history, now) {
  const today = localDayStart(now || new Date());
  return (clients || [])
    .map(c => {
      const sess = ((history && history[c.id]) || []).filter(s => localDayStart(s.date) === today);
      return sess.length ? { client: c, sessions: sess } : null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.sessions[0].date) - new Date(a.sessions[0].date));
}

// Días enteros transcurridos desde la sesión MÁS RECIENTE (busca el máximo, no
// asume orden). Sin sesiones → Infinity (cuenta como "inactivo desde siempre").
function daysSinceLastSession(sessions, now) {
  const ref = (now ? new Date(now) : new Date()).getTime();
  let last = 0;
  (sessions || []).forEach(s => { const t = new Date(s.date).getTime(); if (t > last) last = t; });
  if (!last) return Infinity;
  return Math.floor((ref - last) / MS_DAY);
}

// ── Orden de rutinas por día de la semana (Lunes primero, Libre al final) ──
// El día se guarda como nombre en español (con o sin tilde, defensivo). Cualquier
// valor desconocido va al final. Empieza en LUNES (no domingo) porque así lo lee
// la gente; ordenar por getDay() pondría el domingo primero.
const _DAY_ORDER = {
  'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Miercoles': 3, 'Jueves': 4,
  'Viernes': 5, 'Sábado': 6, 'Sabado': 6, 'Domingo': 7, 'Libre': 8,
};
function dayOrder(day) {
  return _DAY_ORDER[day] || 99;
}
// Devuelve un array NUEVO ordenado por día. Ordenamiento estable: ante el mismo
// día, conserva el orden original (por eso lleva el índice como desempate).
function sortRoutinesByDay(routines) {
  return (routines || [])
    .map((r, i) => [r, i])
    .sort((a, b) => (dayOrder(a[0] && a[0].day) - dayOrder(b[0] && b[0].day)) || (a[1] - b[1]))
    .map(pair => pair[0]);
}

// ── Validación de auto-registro (modo libre) — pura, testeable ──
// data: {name,email,password}. clients: DB.clients (para email único). coachEmail: el
// email del coach (no se puede registrar con él). Devuelve {ok} o {ok:false,error}.
function validateSignup(data, clients, coachEmail) {
  data = data || {};
  const name = (data.name || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const pass = data.password || '';
  if (!name) return { ok: false, error: 'Escribe tu nombre' };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Escribe un email válido' };
  if (coachEmail && email === String(coachEmail).trim().toLowerCase()) return { ok: false, error: 'Ese email no está disponible' };
  if ((clients || []).some(c => c && c.email && c.email.toLowerCase() === email)) return { ok: false, error: 'Ya existe una cuenta con ese email. Inicia sesión.' };
  if (!pass || pass.length < 4) return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres' };
  return { ok: true };
}

// ── ¿Es usuario en modo libre (gratis, sin coach)? ──
// Gating de funciones Premium. Libre = tier 'libre' (auto-registrados). Los asesorados
// creados por el coach NO tienen tier → no son libres → acceso completo. Convertir a
// Premium = ponerle tier 'premium' (el coach lo activa).
function isFreeClient(client) {
  return !!(client && client.tier === 'libre');
}

// ══════════ FASE 2 — Auth + fila por usuario (modelo user_data) ══════════
// La tabla user_data (Supabase) tiene una fila por usuario con columnas:
//   user_id, coach_id, role, profile(jsonb), routines, history, prs, bodyweight,
//   medidas, nutrition, photos, msgs, updated_at.
// En la app de hoy un "cliente" (DB.clients[i]) mezcla perfil + rutinas + id, y las
// colecciones (history/prs/…) viven globales indexadas por clientId. Estos helpers
// PUROS traducen entre el objeto cliente de la app y su fila user_data, para que la
// reescritura de la capa de datos (paso 2.2) los reuse en vez de inventar el mapeo.

// Colecciones por-usuario que en el modelo nuevo viven en SU PROPIA fila (no globales).
const USER_DATA_COLLECTIONS = ['history', 'prs', 'bodyweight', 'medidas', 'nutrition', 'photos', 'msgs'];

// Cliente → fila user_data. Separa el perfil (escalares) de las rutinas y el id.
// La contraseña NO viaja: Supabase Auth la maneja → se omite del perfil.
// opts: {coachId, role, userId}. coach_id = opts.coachId (null = libre/sin coach).
function clientToRow(client, opts) {
  client = client || {};
  opts = opts || {};
  const profile = {};
  Object.keys(client).forEach(k => {
    if (k === 'id' || k === 'routines' || k === 'password') return;
    profile[k] = client[k];
  });
  const coachId = (opts.coachId !== undefined ? opts.coachId : client.coach_id);
  return {
    user_id: client.id || opts.userId || null,
    coach_id: coachId || null,
    role: opts.role || 'client',
    profile,
    routines: Array.isArray(client.routines) ? client.routines : [],
  };
}

// Fila user_data → cliente de la app. Reconstruye el objeto que esperan los renders:
// {id, ...perfil, routines}. (Las colecciones se cargan aparte a DB.history[id], etc.)
function rowToClient(row) {
  row = row || {};
  const profile = row.profile || {};
  return Object.assign({}, profile, {
    id: row.user_id || profile.id || null,
    routines: Array.isArray(row.routines) ? row.routines : [],
  });
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
    mergeHistory,
    mergeClientArrays,
    mergePRs,
    localDayStart,
    retentionByDay,
    weeklyActiveCount,
    clientsTrainedToday,
    daysSinceLastSession,
    dayOrder,
    sortRoutinesByDay,
    isInAdaptation,
    trainingStartTs,
    bmiFrom,
    bodyLoadProfile,
    validateSignup,
    isFreeClient,
    USER_DATA_COLLECTIONS,
    clientToRow,
    rowToClient,
  };
}
