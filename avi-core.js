// avi-core.js — Lógica de negocio pura de AVI (sin DOM, sin globals de app)
// ─────────────────────────────────────────────────────────────────────
// FUENTE ÚNICA DE VERDAD para la lógica crítica testeable.
//
// Se carga en index.html como <script src="avi-core.js"></script> ANTES
// del script principal, por lo que estas funciones quedan disponibles como
// globales del navegador. También se exporta con module.exports para que
// avi.test.js pruebe ESTE archivo (no una copia).
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

// Deltoides POSTERIOR (face pull, pájaro, pec deck inverso, Y-T-W…) = músculo de TRACCIÓN
// aunque su etiqueta de catálogo sea "hombros". No debe caer en día de EMPUJE; pertenece al
// de jalón. Se detecta por el muscleLabel ("Hombro posterior…") — más fiable que el nombre,
// que no siempre lleva la palabra (ej. e109 "Elevaciones Y-T-W") — con respaldo por nombre.
// Pedido de Camilo 2026-06-25.
const _isRearDelt = ex => /posterior|face pull|pajaro/.test(_norm(((ex && ex.muscleLabel) || '') + ' ' + ((ex && ex.name) || '')));

// Plantillas de bloque: cada slot = [muscle, type|null, n] (4º opcional = {avoid|prefer:RegExp}
// para filtrar por nombre dentro del slot). type null = cualquiera de ese músculo.
const GEN_DAYS = {
  FULL_BODY:      { name: 'Full Body', slots: [['piernas', 'Compuesto', 1], ['pecho', 'Compuesto', 1], ['espalda', 'Compuesto', 1], ['hombros', 'Compuesto', 1], ['core', null, 1]] },
  GP_A:           { name: 'Glúteo y Piernas A', slots: [['gluteo', 'Compuesto', 2], ['piernas', 'Compuesto', 1], ['gluteo', 'Aislamiento', 1], ['piernas', 'Aislamiento', 2], ['core', null, 1]] },
  GP_B:           { name: 'Glúteo y Piernas B', slots: [['piernas', 'Compuesto', 2], ['gluteo', 'Compuesto', 1], ['gluteo', 'Aislamiento', 2], ['piernas', 'Aislamiento', 1], ['core', null, 1]] },
  TREN_SUP:       { name: 'Tren Superior', slots: [['pecho', 'Compuesto', 1], ['espalda', 'Compuesto', 1], ['hombros', 'Compuesto', 1], ['biceps', 'Aislamiento', 1], ['triceps', 'Aislamiento', 1]] },
  EMP_BRAZOS:     { name: 'Empuje y Brazos', slots: [['pecho', 'Compuesto', 1], ['hombros', 'Compuesto', 1], ['triceps', 'Aislamiento', 2], ['biceps', 'Aislamiento', 2]] },
  CORE_CARDIO:    { name: 'Core y Cardio', slots: [['core', null, 2], ['cardio', null, 2]] },
  EMPUJE:         { name: 'Empuje', slots: [['pecho', 'Compuesto', 2], ['hombros', 'Compuesto', 1], ['pecho', 'Aislamiento', 1], ['hombros', 'Aislamiento', 1, { avoid: _isRearDelt }], ['triceps', 'Aislamiento', 2]] },
  TRACCION:       { name: 'Tracción', slots: [['espalda', 'Compuesto', 2], ['espalda', 'Aislamiento', 1], ['hombros', 'Aislamiento', 1, { prefer: _isRearDelt }], ['biceps', 'Aislamiento', 2]] },
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
function genSchemeFor(goal, level, adaptation, deload) {
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
  // Semana de descarga (deload, Fase C): baja el VOLUMEN (−1 serie por ejercicio, piso 2)
  // sobre el esquema que toque. La carga (kg) no la fija el generador, así que la baja se
  // comunica como NOTA (~10-20% menos). Recuperación planificada, no castigo.
  if (deload) {
    scheme.setsN = Math.max(2, scheme.setsN - 1);
    scheme.deload = true;
  }
  scheme.goalBucket = _restGoalBucket(goal); // cubeta para el descanso por tipo de ejercicio
  return scheme;
}

// ── DESCANSO POR TIPO DE EJERCICIO (validado con Camilo, coach, 2026-06-19) ──
// El descanso ya NO es uniforme: un compuesto pesado pide más recuperación que un
// aislamiento. La tabla cruza el TIPO del ejercicio × la cubeta del OBJETIVO.
// Cardio/HIIT NO usan esta tabla (tienen su propio flujo de intervalos).
const REST_BY_TYPE = {
  // hipertrofia / recomposición / salud general (default moderado)
  hipertrofia: { Compuesto: 120, Aislamiento: 60, Funcional: 75, Isométrico: 45, Bodyweight: 60 },
  // fuerza: cargas altas, recuperación neural completa
  fuerza:      { Compuesto: 180, Aislamiento: 90, Funcional: 90, Isométrico: 60, Bodyweight: 75 },
  // pérdida de grasa / resistencia: densidad alta, descansos cortos
  resistencia: { Compuesto: 75,  Aislamiento: 45, Funcional: 45, Isométrico: 30, Bodyweight: 45 },
};
// Mapea el objetivo del cliente a una de las 3 columnas de REST_BY_TYPE.
function _restGoalBucket(goal) {
  const g = _norm(goal || '');
  if (g.includes('fuerza')) return 'fuerza';
  if (g.includes('perder') || g.includes('grasa') || g.includes('defin') || g.includes('resist')) return 'resistencia';
  return 'hipertrofia'; // ganar masa / recomp / salud general / default
}
// Descanso (seg) recomendado para un TIPO de ejercicio bajo un objetivo dado.
function restForType(type, goal) {
  // Cardio/HIIT no tienen "descanso entre series": su intervalo lo maneja su propio flujo.
  // Devolvemos null (antes daba un número de aislamiento engañoso a quien lo llamara directo).
  if (type === 'Cardio' || type === 'HIIT') return null;
  const bucket = REST_BY_TYPE[_restGoalBucket(goal)] || REST_BY_TYPE.hipertrofia;
  return bucket[type] || bucket.Aislamiento; // otros tipos sin entrada (raros) caen a aislamiento
}
// Descanso EFECTIVO de un ejercicio dentro de una rutina. Orden de prioridad:
//   1) descanso propio del ejercicio (override manual del coach o horneado al generar)
//   2) derivado de su TIPO × objetivo de la rutina (mejora aplicada a TODA rutina)
//   3) descanso base de la rutina (compatibilidad con rutinas viejas) · 4) 60s
// Cardio/HIIT sin descanso propio → caen al de la rutina (su intervalo lo maneja su flujo).
function restForExercise(ex, routine) {
  ex = ex || {};
  const own = +ex.restSec;
  if (Number.isFinite(own) && own > 0) return own;
  const t = ex.type;
  if (t && t !== 'Cardio' && t !== 'HIIT') {
    const goal = (routine && (routine.goalBucket || routine.why || routine.goal)) || '';
    return restForType(t, goal);
  }
  return (routine && +routine.restSec) || 60;
}

// ── BISERIES (superseries de a 2) — manual, validado con Camilo 2026-06-19 ──
// Una biserie = dos ejercicios ADYACENTES que se hacen alternados SIN descanso
// entre ellos; el descanso va al terminar la pareja. Modelo: el primer ejercicio
// lleva `ssNext:true` (se empareja con el siguiente). Solo parejas: si el segundo
// también trae ssNext, se ignora (no encadena triseries).
function bisetBlocks(exercises) {
  const exs = exercises || [];
  const blocks = [];
  let i = 0;
  while (i < exs.length) {
    if (exs[i] && exs[i].ssNext && i + 1 < exs.length) { blocks.push([i, i + 1]); i += 2; }
    else { blocks.push([i]); i += 1; }
  }
  return blocks;
}
// Orden de ejecución para el modo guiado: dentro de una biserie intercala por
// RONDA (A1, B1, A2, B2…); los ejercicios normales van serie por serie.
function guidedStepOrder(exercises) {
  const exs = exercises || [];
  const order = [];
  bisetBlocks(exs).forEach(block => {
    if (block.length === 1) {
      const ei = block[0]; const sets = parseInt(exs[ei] && exs[ei].sets) || 3;
      for (let si = 0; si < sets; si++) order.push({ ei, si });
    } else {
      const [a, b] = block;
      const sa = parseInt(exs[a].sets) || 3, sb = parseInt(exs[b].sets) || 3;
      const rounds = Math.max(sa, sb);
      for (let r = 0; r < rounds; r++) {
        if (r < sa) order.push({ ei: a, si: r });
        if (r < sb) order.push({ ei: b, si: r });
      }
    }
  });
  return order;
}
// ¿El ejercicio `ei` es parte de una biserie? Devuelve su rol y la pareja.
function bisetInfo(exercises, ei) {
  const blocks = bisetBlocks(exercises);
  for (const blk of blocks) {
    if (blk.length === 2) {
      if (blk[0] === ei) return { biset: true, role: 'a', partner: blk[1] };
      if (blk[1] === ei) return { biset: true, role: 'b', partner: blk[0] };
    }
  }
  return { biset: false, role: null, partner: null };
}
// Limpia flags ssNext inválidos tras mover/borrar (último sin pareja, o encadenados).
function normalizeBisets(exercises) {
  const exs = exercises || [];
  let i = 0;
  while (i < exs.length) {
    if (exs[i] && exs[i].ssNext) {
      if (i + 1 >= exs.length) { delete exs[i].ssNext; i += 1; continue; } // último: no hay pareja
      if (exs[i + 1]) delete exs[i + 1].ssNext; // el segundo de la pareja NO puede iniciar otra
      i += 2; continue;
    }
    i += 1;
  }
  return exs;
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

// ── Peso sugerido por PR (estimación de 1RM, fórmula de Epley) ──
// No se hacen tests de máximos (peligrosos para principiantes): el 1RM se ESTIMA
// desde cualquier serie registrada (kg × reps). Epley: 1RM ≈ kg·(1 + reps/30).
// Confiable hasta ~12-15 reps; fuera de ese rango devolvemos null (mejor no sugerir
// que sugerir mal). Es una guía: el coach y la sensación del asesorado mandan.
function estimate1RM(kg, reps) {
  kg = parseFloat(kg); reps = parseInt(reps);
  if (!kg || kg <= 0 || !reps || reps < 1 || reps > 15) return null;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}
// Inversa de Epley: peso para un objetivo de reps, con factor conservador (default
// 0.95 — es sugerencia de trabajo, no reto) y redondeo a discos reales (step 2.5kg).
function suggestLoad(e1rm, targetReps, opts) {
  opts = opts || {};
  e1rm = parseFloat(e1rm); targetReps = parseInt(targetReps);
  if (!e1rm || e1rm <= 0 || !targetReps || targetReps < 1 || targetReps > 15) return null;
  const base = targetReps === 1 ? e1rm : e1rm / (1 + targetReps / 30);
  const raw = base * (opts.factor != null ? opts.factor : 0.95);
  const step = opts.step || 2.5;
  const kg = Math.round(raw / step) * step;
  return kg > 0 ? kg : null;
}
// Desde un PR guardado ({val|kg, reps, unit:'kg'}) → kg sugeridos para targetReps.
// Solo aplica a modalidad de peso; PRs en reps/seg/min no estiman 1RM.
function suggestFromPR(pr, targetReps, opts) {
  if (!pr || (pr.unit || 'kg') !== 'kg') return null;
  const kg = pr.val != null ? pr.val : pr.kg;
  const e1 = estimate1RM(kg, pr.reps || 1);
  return e1 ? suggestLoad(e1, targetReps, opts) : null;
}

// ── Calentamiento + dropset: peso derivado del peso de trabajo ──
// Calentamiento ≈ 50% del peso de trabajo; dropset ≈ 70% del peso de la última serie.
// Ambos redondean a discos reales (2.5 kg) con piso de 2.5 kg. null si no hay base.
function warmupLoad(workKg, opts) {
  opts = opts || {};
  workKg = parseFloat(workKg);
  if (!workKg || workKg <= 0) return null;
  const step = opts.step || 2.5;
  const frac = opts.frac != null ? opts.frac : 0.5;
  // Limpia el ruido de punto flotante (87.5*0.7 = 61.2499…) antes de redondear a disco,
  // para que un empate exacto (61.25) suba al disco superior y no caiga por el error FP.
  const raw = Math.round(workKg * frac * 1e6) / 1e6;
  return Math.max(step, Math.round(raw / step) * step);
}
function dropLoad(baseKg, opts) {
  return warmupLoad(baseKg, Object.assign({ frac: 0.7 }, opts || {}));
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
  // Hornea el descanso por tipo (cada ejercicio nace con su descanso correcto).
  // En adaptación se respeta el descanso corto uniforme (técnica primero, ver genSchemeFor).
  // Cardio/HIIT no llevan descanso propio: su intervalo lo maneja su flujo.
  if (scheme.adaptation) {
    c.restSec = scheme.restSec;
  } else if (ex.type && ex.type !== 'Cardio' && ex.type !== 'HIIT') {
    c.restSec = restForType(ex.type, scheme.goalBucket);
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
// ── NIVEL DE DIFICULTAD POR EJERCICIO (id → P/I/A) ──────────────────────
// Borrador aprobado por Camilo (2026-06-14). Gobierna el gate del generador:
// un Principiante NUNCA recibe movimientos avanzados (sentadilla a una pierna,
// dominadas, rueda abdominal, flexión pica, fondos…). Editable. Un ejercicio con
// `level` propio manda sobre este mapa; lo no listado cae a 'I' por seguridad.
const EX_LEVEL = {
  e1:'I',e2:'I',e110:'I',e3:'P',e71:'I',e84:'P',e85:'P',e86:'P',e111:'P',e112:'I',e77:'P',e78:'P',e113:'P',e83:'I',
  e4:'A',e5:'I',e6:'P',e24:'P',e25:'P',e26:'P',e27:'P',e28:'P',e34:'A',e50:'A',e51:'P',e52:'P',e104:'P',e114:'P',e116:'I',e137:'I',e82:'P',
  e7:'I',e8:'P',e21:'P',e22:'I',e23:'P',e53:'P',e54:'P',e97:'A',e98:'P',e99:'P',e100:'P',e109:'P',e115:'P',e117:'P',e118:'I',e119:'P',e138:'P',
  e9:'P',e10:'P',e29:'P',e55:'P',e56:'P',e101:'P',e102:'P',e103:'A',e120:'P',e121:'P',e139:'P',e140:'P',
  e11:'P',e12:'I',e19:'A',e30:'P',e31:'P',e57:'I',e105:'P',e122:'P',e123:'A',e79:'P',
  e13:'I',e14:'I',e15:'P',e16:'P',e33:'P',e35:'I',e36:'P',e37:'P',e39:'P',e40:'A',e41:'I',e58:'P',e59:'P',e70:'P',e80:'P',e93:'P',e95:'A',e107:'P',e108:'A',e124:'I',e125:'I',e126:'P',e127:'A',e128:'P',
  e42:'I',e43:'P',e44:'P',e45:'P',e60:'P',e46:'I',e61:'P',e73:'P',e87:'P',e88:'P',e89:'P',e90:'P',e91:'P',e92:'I',e94:'P',e96:'P',e106:'I',e129:'P',e130:'P',
  e17:'P',e18:'P',e47:'A',e48:'A',e49:'P',e62:'P',e63:'I',e72:'P',e81:'I',e131:'P',e132:'P',e133:'P',e134:'P',
  e20:'P',e64:'P',e65:'P',e66:'I',e67:'P',e74:'A',e75:'A',e76:'I',e135:'P',
  e68:'I',e69:'A',e136:'P',
};
const _LVL_RANK = { P: 0, I: 1, A: 2 };
function exLevel(ex) {
  const v = (ex && (ex.level || EX_LEVEL[ex.id])) || 'I';
  return (v === 'P' || v === 'I' || v === 'A') ? v : 'I';
}
function exLevelRank(ex) { return _LVL_RANK[exLevel(ex)]; }
// Tope de nivel + preferencia según el perfil. Principiante: P primero, I solo como
// respaldo cuando un músculo no tiene opción P, NUNCA A. Intermedio: P+I. Avanzado: todo.
function _levelGate(level) {
  if (level === 'Avanzado') return { cap: 2, preferP: false };
  if (level === 'Intermedio') return { cap: 1, preferP: false };
  return { cap: 1, preferP: true };
}

// Familia de MOVIMIENTO: evita dos ejercicios del MISMO patrón el mismo día (ej. dos
// abducciones de cadera —máquina, banda o tumbado— que son redundantes). null = no se
// deduplica (la mayoría). Camilo 2026-06-29: abducción (abre) y aducción (cierra) son
// OPUESTOS → familias DISTINTAS, deben poder convivir.
function _genMoveFamily(ex) {
  const n = _norm((ex && ex.name) || '');
  if (/abducc/.test(n)) return 'abduccion_cadera';
  if (/aducc/.test(n))  return 'aduccion_cadera';
  return null;
}
function _genPick(lib, muscle, type, st, slotOpts) {
  const cap = st.levelCap == null ? 2 : st.levelCap;
  // Filtro por SLOT (4º elemento): `avoid` es un predicado que saca ejercicios de este slot
  // (ej. deltoides posteriores fuera del día de EMPUJE — son músculo de tracción, no de empuje).
  const avoidFn = slotOpts && slotOpts.avoid;
  const ok = e => e.muscle === muscle && !st.exclude(e)
    && !(st.excludeIds && st.excludeIds.has(e.id)) // 🚫 lista negra manual del coach (Fase C)
    && !(avoidFn && avoidFn(e))                    // 🚫 predicado a evitar en este slot (Camilo 2026-06-25)
    && exLevelRank(e) <= cap // gate por nivel: el ejercicio no puede exceder el tope del cliente
    && (!st.tier || (e.tier || 'premium') === st.tier)
    && (e.env || ['gym']).includes(st.place); // entorno: el ejercicio debe ser realizable ahí
  // ⭐ Priorizados (Fase C): si el coach marcó un ejercicio de este músculo/tipo, va PRIMERO
  // (cubre "impulsar" y "asegurar que entre"). Respeta ok() (nivel/entorno/tier/exclusión) y
  // el tipo del slot; si no pasa esos filtros, simplemente no se fuerza.
  if (st.preferIds && st.preferIds.size) {
    const pref = lib.find(e => st.preferIds.has(e.id) && e.muscle === muscle
      && (type ? e.type === type : true) && ok(e) && !st.usedInDay.has(e.id));
    if (pref) { st.usedInDay.add(pref.id); const fm=_genMoveFamily(pref); if(fm&&st.usedFamiliesInDay)st.usedFamiliesInDay.add(fm); return pref; }
  }
  // Pools en orden de prioridad. Se usa el primero que tenga algo sin usar hoy:
  //  1) methodBias (ej. calistenia → peso corporal) ANTES que el tipo del slot,
  //  2) tipo exacto del slot, 3) fallback solo-músculo (cuando el tipo está agotado/vacío).
  // `extra` permite anteponer una tanda más estricta (ej. solo-Principiante) antes de la normal.
  const addTier = extra => {
    if (st.preferType) pools.push(lib.filter(e => ok(e) && e.type === st.preferType && extra(e)));
    // Perfil de carga 'high' (IMC/cintura altos): prioriza variantes guiadas/asistidas
    // (máquina, polea, prensa…) DENTRO del tipo del slot, antes de las libres.
    if (st.preferName) pools.push(lib.filter(e => ok(e) && (type ? e.type === type : true) && st.preferName.test(_norm(e.name)) && extra(e)));
    pools.push(lib.filter(e => ok(e) && (type ? e.type === type : true) && extra(e)));
    pools.push(lib.filter(e => ok(e) && extra(e)));
  };
  const pools = [];
  // `prefer` del slot: predicado cuyos ejercicios van PRIMERO (ej. los posteriores en el día
  // de TRACCIÓN), respetando nivel/entorno/tier y el tipo del slot.
  if (slotOpts && slotOpts.prefer) {
    pools.push(lib.filter(e => ok(e) && (type ? e.type === type : true) && slotOpts.prefer(e)));
  }
  // Principiante: agota TODAS las opciones de nivel P antes de permitir Intermedio.
  if (st.preferP) addTier(e => exLevelRank(e) === 0);
  addTier(() => true);
  let pool = null;
  for (const p of pools) { if (p.some(e => !st.usedInDay.has(e.id))) { pool = p; break; } }
  if (!pool) {
    // Sin NINGUNA opción de este músculo en este entorno → hueco real (lo reporta al coach).
    if (st.envShortfall && !lib.some(ok)) st.envShortfall.add(muscle);
    return null;
  }
  const key = muscle + '|' + (type || '*');
  const start = st.cursors[key] != null ? st.cursors[key] : (st.seed % pool.length);
  let fb = -1; // fallback: primer candidato libre cuya FAMILIA ya se usó hoy (último recurso)
  for (let i = 0; i < pool.length; i++) {
    const idx = (start + i) % pool.length;
    const cand = pool[idx];
    if (st.usedInDay.has(cand.id)) continue;
    const fam = _genMoveFamily(cand);
    if (fam && st.usedFamiliesInDay && st.usedFamiliesInDay.has(fam)) { if (fb < 0) fb = idx; continue; }
    st.cursors[key] = (idx + 1) % pool.length;
    st.usedInDay.add(cand.id);
    if (fam && st.usedFamiliesInDay) st.usedFamiliesInDay.add(fam);
    return cand;
  }
  // Solo quedaban repetidos del mismo patrón (familia) → tomar el fallback antes que dejar el
  // slot vacío (la dedup por patrón es una preferencia, no debe romper la generación).
  if (fb >= 0) {
    const cand = pool[fb];
    st.cursors[key] = (fb + 1) % pool.length;
    st.usedInDay.add(cand.id);
    return cand;
  }
  return null; // todo el pool ya está usado en este día
}

// Movimientos guiados/asistidos (cargan parte del peso o estabilizan) — se prefieren
// cuando el perfil de carga es alto. Patrones en minúsculas SIN tilde (van contra _norm).
const GEN_ASSISTED_RE = /maquina|polea|cable|prensa|smith|hack|peck|contractora|hammer|multipower|jaca|asistid|guiad|sentado|banda/;
// Alto impacto / pliométrico: se evita con perfil de carga alto (más masa = más estrés articular).
const GEN_HIIMPACT_RE = /salto|jump|burpee|pliometr|plyo|sprint|saltar|box jump|tijera saltada|skipping/;

// Excluder combinado: carga axial con barra para menores + contraindicaciones por zona
// + (perfil de carga alto) alto impacto/pliométrico + (gym completo) NO bandas como
// ejercicio PRINCIPAL. En gym hay equipo real → las bandas se ven pobres como trabajo
// principal (sí valen para calentar/activar o para casa/parque). Pedido de Camilo 2026-06-23.
function _genMakeExcluder(lim, minor, avoidHighImpact, place) {
  const res = [];
  if (minor) res.push(/sentadilla|peso muerto|militar con barra/); // §2.2 <16: sin carga axial con barra (incluye press de barra sobre la cabeza)
  if (avoidHighImpact) res.push(GEN_HIIMPACT_RE);
  if (place === 'gym') res.push(/banda|elastic|\bliga\b/); // gym completo: bandas no como principal
  lim.keys.forEach(z => { if (GEN_ZONE_EXCL[z]) res.push(GEN_ZONE_EXCL[z]); });
  return ex => { const n = _norm(ex.name); return res.some(re => re.test(n)); };
}

// Resuelve la lista de bloques (split). Full Body para Principiante o ≤2 días (poco margen
// para dividir). NIVEL manda, no la edad: un menor INTERMEDIO/AVANZADO sin condiciones recibe
// su split de gym (PPL hombre / glúteo-pierna+tren mujer); la seguridad de menores es de
// SELECCIÓN de ejercicios (sin carga axial con barra, ver _genMakeExcluder), no de estructura.
// Antes `minor` forzaba Full Body toda la semana y un joven intermedio (Samuel, 14) quedaba
// como principiante — corregido 2026-06-23 por pedido de Camilo.
function _genResolveSplit(sexKey, days, level) {
  if (level === 'Principiante' || days <= 2) return Array(Math.max(1, days)).fill('FULL_BODY');
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
  const scheme = genSchemeFor(client.goal || '', level, opts.adaptation, opts.deload);
  const lim = parseLimitations(client.notes || '');
  const place = opts.place || client.place || 'gym'; // entorno de equipo (Fase C)
  const methodBias = opts.methodBias || null;        // del estilo/preset (calistenia/funcional/...)
  const loadProfile = opts.loadProfile === 'high' ? 'high' : 'normal'; // por IMC/cintura (ver bodyLoadProfile)
  const highLoad = loadProfile === 'high';
  const _gate = _levelGate(level); // tope/preferencia de dificultad por perfil (Principiante NUNCA recibe avanzados)
  const st = {
    cursors: {}, seed: opts.seed || 0, tier: opts.tier || null, place,
    levelCap: _gate.cap, preferP: _gate.preferP,
    preferType: methodBias === 'calistenia' ? 'Bodyweight' : methodBias === 'funcional' ? 'Funcional' : null,
    preferName: highLoad ? GEN_ASSISTED_RE : null, // perfil alto → variantes guiadas/asistidas primero
    scheme, usedInDay: new Set(), usedFamiliesInDay: new Set(), exclude: _genMakeExcluder(lim, minor, highLoad, place), envShortfall: new Set(),
    excludeIds: new Set(opts.excludeIds || []), // 🚫 lista negra manual (Fase C)
    preferIds: new Set(opts.preferIds || []),   // ⭐ priorizados manuales (Fase C)
  };

  const codes = _genResolveSplit(sexKey, days, level);
  const nameCount = {};
  const routines = codes.map((code, idx) => {
    const tpl = GEN_DAYS[code] || GEN_DAYS.FULL_BODY;
    st.usedInDay = new Set();
    st.usedFamiliesInDay = new Set();
    let exs = [];
    tpl.slots.forEach(([muscle, type, n, slotOpts]) => {
      for (let i = 0; i < n; i++) {
        const ex = _genPick(lib, muscle, type, st, slotOpts);
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
    const note = exs.length === 0
      ? '⚠️ REVISAR — no se pudieron generar ejercicios para este día con la biblioteca/entorno actual. Agrega ejercicios manualmente antes de asignar.'
      : lim.detected
      ? `⚠️ REVISAR — limitación detectada (${lim.zones.join(', ')}). ${lim.advice} Ajusta antes de aprobar.`
      : scheme.adaptation
      ? '🌱 Fase de adaptación (primeras semanas): 15-20 reps con poco o nada de peso, sin llegar al fallo. La técnica primero; las cargas suben cuando el patrón esté limpio.'
      : scheme.deload
      ? '🔄 Semana de descarga (deload): −1 serie por ejercicio. Baja la carga ~10-20% respecto a tu semana normal — la meta es recuperar, no exigir.'
      : 'Borrador generado automáticamente. Revisa y ajusta antes de asignar.';
    return {
      id: idFn(), name: nm, day: GEN_DAY_LABELS[idx] || ('Día ' + (idx + 1)), shift: null,
      note, why: client.goal || '', restSec: scheme.restSec, exercises: exs,
      // needsReview también si el día quedó VACÍO (lib/entorno sin match) — el coach no
      // debe poder aprobar un día en blanco sin alerta. Auditoría 2026-06-21.
      createdAt: now, generated: true, reviewed: false, needsReview: lim.detected || exs.length === 0,
    };
  });
  const envGaps = [...st.envShortfall];
  // Eleva la revisión global si hay huecos de entorno o algún día sin ejercicios (antes solo
  // lo hacían las limitaciones, así que un plan a medio cubrir pasaba sin bandera).
  const anyEmpty = routines.some(r => !(r.exercises || []).length);
  return { routines, needsReview: lim.detected || envGaps.length > 0 || anyEmpty, limitations: lim, place, envGaps, adaptation: !!scheme.adaptation, deload: !!scheme.deload, loadProfile };
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

// Identidad de un mensaje de chat para dedupe (quién + cuándo + qué).
function _msgKey(m) {
  return (m && m.from || '?') + '|' + (m && m.date || '?') + '|' + (m && m.text || '');
}

// Une dos listas de mensajes SIN PERDER NINGUNO (unión por identidad, orden
// cronológico viejo→nuevo). Reemplaza la comparación por longitud de los pollers,
// que descartaba un mensaje local sin subir cuando el remoto venía más largo
// (P1-3 auditoría 2026-07-01). Pura y testeable.
function mergeMsgs(local, cloud, cap) {
  const merged = mergeClientArrays(
    { x: Array.isArray(local) ? local : [] },
    { x: Array.isArray(cloud) ? cloud : [] },
    _msgKey, 'asc', cap
  );
  return merged.x || [];
}

// Fusiona la fila user_data local (respaldo offline con cambios sin confirmar)
// con la fila recién bajada de la nube. Regla: las COLECCIONES generadas por el
// usuario (historial, PRs, mensajes, peso, medidas, fotos) se UNEN con los merges
// de arriba (nada se pierde); el resto (perfil, rutinas, nutrición — territorio
// del coach) lo manda la nube. Cierra la ventana "entrené offline y Android mató
// la app antes de reconectar" (P0-2 auditoría 2026-07-01). Pura y testeable.
function mergeAuthRow(localRow, cloudRow) {
  localRow = localRow || {}; cloudRow = cloudRow || {};
  const out = Object.assign({}, cloudRow);
  const pair = (fn, l, c) => fn({ x: l }, { x: c }).x;
  out.history = pair(mergeHistory, localRow.history || [], cloudRow.history || []);
  out.prs = pair(mergePRs, localRow.prs || {}, cloudRow.prs || {});
  out.msgs = mergeMsgs(localRow.msgs, cloudRow.msgs);
  const byDate = it => String(it && it.date || '');
  out.bodyweight = pair((l, c) => mergeClientArrays(l, c, byDate, 'desc'), localRow.bodyweight || [], cloudRow.bodyweight || []);
  out.medidas = pair((l, c) => mergeClientArrays(l, c, byDate, 'desc'), localRow.medidas || [], cloudRow.medidas || []);
  out.photos = pair((l, c) => mergeClientArrays(l, c, byDate, 'desc'), localRow.photos || [], cloudRow.photos || []);
  return out;
}

// Retorno de OAuth (Google): GoTrue devuelve los ERRORES del vínculo/login por la
// URL de redirect (#error=…&error_code=…&error_description=…), NO en el valor de
// retorno de linkIdentity/signInWithOAuth — y supabase-js (detectSessionInUrl)
// consume el hash al crear el cliente. Sin parsear esto ANTES, la app tiraba los
// errores a la basura y "Conectar mi Google" fallaba en silencio (caso Luz
// 2026-07-02). Pura y testeable: recibe hash y search crudos.
function parseOAuthReturn(hash, search) {
  const out = { error: '', code: '', desc: '' };
  const read = (raw, strip) => {
    try {
      const p = new URLSearchParams(String(raw || '').replace(strip, ''));
      out.error = out.error || p.get('error') || '';
      out.code = out.code || p.get('error_code') || '';
      out.desc = out.desc || p.get('error_description') || '';
    } catch (e) { /* URL malformada → sin error */ }
  };
  read(hash, /^#/); read(search, /^\?/);
  // error_description llega con + por espacios (form-encoding sobre el fragment)
  out.desc = out.desc.replace(/\+/g, ' ');
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

// ── Racha de entrenamiento: días de CALENDARIO consecutivos con ≥1 sesión,
// terminando HOY o AYER (no se rompe por no haber entrenado aún hoy). Si la última
// sesión fue hace 2+ días, la racha es 0. Varias sesiones el mismo día cuentan 1.
function workoutStreak(sessions, now) {
  const days = new Set();
  (sessions || []).forEach(s => { const d = new Date(s && s.date); if (!isNaN(d.getTime())) days.add(d.toDateString()); });
  if (!days.size) return 0;
  const cursor = now ? new Date(now) : new Date();
  // Si hoy aún no entrena, la racha puede seguir viva desde ayer.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

// ── Récord de racha: la racha de días de CALENDARIO consecutivos MÁS LARGA en todo
// el historial (vigente o pasada). Varias sesiones el mismo día cuentan 1. Pura/testeable.
function longestStreak(sessions) {
  const days = [...new Set((sessions || [])
    .map(s => { const d = new Date(s && s.date); return isNaN(d.getTime()) ? null : localDayStart(d); })
    .filter(v => v != null))].sort((a, b) => a - b);
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = days[i] - days[i - 1];
    if (gap === MS_DAY) { cur++; if (cur > best) best = cur; }
    else if (gap !== 0) cur = 1;
  }
  return best;
}

// ── Racha SEMANAL (decisión Camilo 2026-07-06): semanas de calendario (Lunes→Domingo)
// consecutivas CUMPLIENDO la meta de días del plan. La racha por días consecutivos
// castigaba al que entrena 3/sem (nunca pasaba de 2). La semana EN CURSO no rompe la
// racha mientras no termine; si ya cumplió, la extiende. Sin DST en Colombia (UTC-5
// fijo) → aritmética de 7 días exacta. Puras/testeables.

// Meta de días/semana del plan: rutinas con día real (≠ Libre) o client.days; clamp 1–7.
function planDays(client) {
  client = client || {};
  const fromRoutines = (client.routines || []).filter(r => r && r.day && r.day !== 'Libre').length;
  const d = fromRoutines || parseInt(client.days) || 3;
  return Math.max(1, Math.min(7, d));
}

// Lunes 00:00 local de la semana de `d`, como timestamp.
function weekStartTs(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // 0 = lunes
  return x.getTime();
}

// weekStreak(sessions, target, now) → { weeks, thisWeekDays, target, metThisWeek }
// weeks = semanas consecutivas cumplidas terminando en la semana pasada, o en la
// actual si ya cumplió. Varias sesiones el mismo día cuentan 1 día.
function weekStreak(sessions, target, now) {
  const tgt = Math.max(1, Math.min(7, parseInt(target) || 3));
  const ref = now ? new Date(now) : new Date();
  const byWeek = {};
  (sessions || []).forEach(s => {
    const d = new Date(s && s.date); if (isNaN(d.getTime())) return;
    const wk = weekStartTs(d);
    (byWeek[wk] = byWeek[wk] || new Set()).add(d.toDateString());
  });
  const WEEK = 7 * 86400000;
  const curWk = weekStartTs(ref);
  const thisWeekDays = (byWeek[curWk] || { size: 0 }).size;
  const metThisWeek = thisWeekDays >= tgt;
  let weeks = 0;
  let cursor = metThisWeek ? curWk : curWk - WEEK;
  while (byWeek[cursor] && byWeek[cursor].size >= tgt) { weeks++; cursor -= WEEK; }
  return { weeks, thisWeekDays, target: tgt, metThisWeek };
}

// Récord histórico: la racha de semanas cumplidas MÁS LARGA de todo el historial.
function longestWeekStreak(sessions, target) {
  const tgt = Math.max(1, Math.min(7, parseInt(target) || 3));
  const byWeek = {};
  (sessions || []).forEach(s => {
    const d = new Date(s && s.date); if (isNaN(d.getTime())) return;
    const wk = weekStartTs(d);
    (byWeek[wk] = byWeek[wk] || new Set()).add(d.toDateString());
  });
  const met = Object.keys(byWeek).filter(k => byWeek[k].size >= tgt).map(Number).sort((a, b) => a - b);
  if (!met.length) return 0;
  const WEEK = 7 * 86400000;
  let best = 1, cur = 1;
  for (let i = 1; i < met.length; i++) {
    if (met[i] - met[i - 1] === WEEK) { cur++; if (cur > best) best = cur; }
    else cur = 1;
  }
  return best;
}

// ── Calendario de adherencia del MES de `now`: filas de semanas (Lunes→Domingo);
// cada celda { inMonth, day, count, trained, isToday, isFuture } + días entrenados del
// mes. Para el heatmap Premium. Agrupa por día de calendario LOCAL. Pura/testeable.
function adherenceMonth(sessions, now) {
  const ref = now ? new Date(now) : new Date();
  const year = ref.getFullYear(), month = ref.getMonth();
  const todayStart = localDayStart(ref);
  const counts = {};
  (sessions || []).forEach(s => { const d = new Date(s && s.date); if (!isNaN(d.getTime())) { const k = localDayStart(d); counts[k] = (counts[k] || 0) + 1; } });
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Lunes (semana arranca lunes)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = []; let week = [];
  for (let i = 0; i < firstDow; i++) week.push({ inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = localDayStart(new Date(year, month, d));
    const count = counts[ds] || 0;
    week.push({ inMonth: true, day: d, count, trained: count > 0, isToday: ds === todayStart, isFuture: ds > todayStart });
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push({ inMonth: false }); weeks.push(week); }
  let trainedDays = 0;
  for (const k in counts) { const dd = new Date(Number(k)); if (dd.getFullYear() === year && dd.getMonth() === month) trainedDays++; }
  return { year, month, weeks, trainedDays };
}

// ── Estadísticas avanzadas Premium: volumen por grupo muscular + balance
// empuje/tracción. Se calcula desde el historial REAL (cada sesión guarda, por
// ejercicio, su grupo `muscle` y las series con `done`). Cuenta SERIES EFECTIVAS
// (completadas) — la métrica que usa la ciencia del entrenamiento para volumen, y
// que funciona igual con peso corporal que con barra. El calentamiento y los
// dropsets ya van en campos aparte de la sesión, así que no inflan el conteo.
// Puras/testeables — sirven sobre datos que YA existen (sesiones viejas también).

// Grupo muscular AVI → categoría de patrón de movimiento.
const MUSCLE_GROUP_CAT = {
  pecho: 'empuje', hombros: 'empuje', triceps: 'empuje',
  espalda: 'traccion', biceps: 'traccion',
  piernas: 'piernas', gluteo: 'piernas',
  core: 'core', cardio: 'cardio', otro: 'otro',
};
// Etiqueta legible por grupo.
const MUSCLE_GROUP_LABEL = {
  pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', biceps: 'Bíceps',
  triceps: 'Tríceps', piernas: 'Piernas', gluteo: 'Glúteos', core: 'Core',
  cardio: 'Cardio', otro: 'Otro',
};

// Series efectivas por grupo muscular y por categoría en los últimos `windowDays`.
// sessions = DB.history[clientId]; `now` opcional (para tests). Devuelve:
// { days, totalSets, sessions, groups:[{group,label,cat,sets,pct}] (desc, solo >0),
//   byCat:{empuje,traccion,piernas,core,cardio,otro} }
function muscleVolume(sessions, windowDays, now) {
  const ref = now ? new Date(now) : new Date();
  const days = windowDays || 7;
  const cutoff = ref.getTime() - days * MS_DAY;
  const groups = {};
  const byCat = { empuje: 0, traccion: 0, piernas: 0, core: 0, cardio: 0, otro: 0 };
  let totalSets = 0, sessCount = 0;
  (sessions || []).forEach(s => {
    const t = new Date(s && s.date).getTime();
    if (isNaN(t) || t < cutoff) return;
    let sessHadSets = false;
    ((s && s.exercises) || []).forEach(ex => {
      const g = (ex && ex.muscle) || 'otro';
      const sets = (((ex && ex.sets) || []).filter(st => st && st.done)).length;
      if (sets > 0) {
        groups[g] = (groups[g] || 0) + sets;
        const cat = MUSCLE_GROUP_CAT[g] || 'otro';
        byCat[cat] = (byCat[cat] || 0) + sets;
        totalSets += sets;
        sessHadSets = true;
      }
    });
    if (sessHadSets) sessCount++;
  });
  const groupArr = Object.keys(groups).map(g => ({
    group: g,
    label: MUSCLE_GROUP_LABEL[g] || g,
    cat: MUSCLE_GROUP_CAT[g] || 'otro',
    sets: groups[g],
    pct: totalSets ? Math.round(groups[g] / totalSets * 100) : 0,
  })).sort((a, b) => b.sets - a.sets || a.label.localeCompare(b.label));
  return { days, totalSets, sessions: sessCount, groups: groupArr, byCat };
}

// Balance empuje/tracción desde las series por categoría. Buen entrenamiento =
// empuje y tracción parejos (la tracción puede ir ligeramente por encima). Devuelve
// { push, pull, total, pushPct, pullPct, ratio, verdict, msg }.
// verdict: 'sin-datos' | 'equilibrado' | 'mas-empuje' | 'mas-traccion'.
function pushPullBalance(byCat) {
  const push = (byCat && byCat.empuje) || 0;
  const pull = (byCat && byCat.traccion) || 0;
  const total = push + pull;
  if (!total) return { push: 0, pull: 0, total: 0, pushPct: 0, pullPct: 0, ratio: null, verdict: 'sin-datos', msg: 'Aún no hay series de empuje o tracción registradas. Completa un par de entrenamientos y aquí verás tu balance.' };
  const ratio = pull ? push / pull : Infinity;
  const pushPct = Math.round(push / total * 100);
  const pullPct = 100 - pushPct;
  let verdict, msg;
  // Tolerancia: si ninguno supera al otro por más de ~40% → equilibrado.
  if (push >= pull * 0.7 && push <= pull * 1.4) {
    verdict = 'equilibrado';
    msg = 'Tu empuje y tu tracción están parejos 💪 Así cuidas tu postura y tus hombros.';
  } else if (push > pull) {
    verdict = 'mas-empuje';
    msg = 'Estás empujando bastante más de lo que jalas. Suma algo de espalda y bíceps (remos, jalones) para equilibrar y cuidar tu postura.';
  } else {
    verdict = 'mas-traccion';
    msg = 'Estás jalando más de lo que empujas. Un poco más de pecho, hombros y tríceps equilibraría tu desarrollo.';
  }
  return { push, pull, total, pushPct, pullPct, ratio, verdict, msg };
}

// ── Desglose por SUBGRUPO muscular: al tocar un grupo (Piernas) se muestran sus
// subregiones (Cuádriceps, Femoral, Aductores…). Subregión canónica (la de MM_EX)
// → grupo AVI al que pertenece, y → etiqueta en español. Mantener en sync con
// MM_GROUP (muscle-map.js) y MM_EX (exercise-muscles.js).
const SUBMUSCLE_GROUP = {
  'chest-upper': 'pecho', 'chest-lower': 'pecho',
  'lats-upper': 'espalda', 'lats-mid': 'espalda', 'lats-lower': 'espalda',
  'traps-upper': 'espalda', 'traps-mid': 'espalda', 'traps-lower': 'espalda', 'lower-back-erectors': 'espalda',
  'shoulder-front': 'hombros', 'shoulder-side': 'hombros', 'deltoid-rear': 'hombros',
  'biceps': 'biceps', 'brachialis': 'biceps', 'brachioradialis': 'biceps', 'brachioradialis-back': 'biceps',
  'forearm': 'biceps', 'forearm-flexors': 'biceps', 'forearm-extensors': 'biceps',
  'triceps-long': 'triceps', 'triceps-lateral': 'triceps',
  'quads': 'piernas', 'hamstrings': 'piernas', 'adductors': 'piernas', 'calves-gastroc': 'piernas', 'calves-soleus': 'piernas',
  'gluteus-maximus': 'gluteo', 'gluteus-medius': 'gluteo',
  'abs-upper': 'core', 'abs-lower': 'core', 'obliques': 'core', 'hip-flexor': 'core',
};
const SUBMUSCLE_LABEL = {
  'chest-upper': 'Pecho superior', 'chest-lower': 'Pecho inferior',
  'lats-upper': 'Dorsal superior', 'lats-mid': 'Dorsal medio', 'lats-lower': 'Dorsal inferior',
  'traps-upper': 'Trapecio superior', 'traps-mid': 'Trapecio medio', 'traps-lower': 'Trapecio inferior', 'lower-back-erectors': 'Lumbares',
  'shoulder-front': 'Hombro anterior', 'shoulder-side': 'Hombro lateral', 'deltoid-rear': 'Hombro posterior',
  'biceps': 'Bíceps', 'brachialis': 'Braquial', 'brachioradialis': 'Braquiorradial', 'brachioradialis-back': 'Braquiorradial',
  'forearm': 'Antebrazo', 'forearm-flexors': 'Antebrazo', 'forearm-extensors': 'Antebrazo',
  'triceps-long': 'Tríceps (cabeza larga)', 'triceps-lateral': 'Tríceps (cabeza lateral)',
  'quads': 'Cuádriceps', 'hamstrings': 'Femoral', 'adductors': 'Aductores', 'calves-gastroc': 'Gemelos', 'calves-soleus': 'Sóleo',
  'gluteus-maximus': 'Glúteo mayor', 'gluteus-medius': 'Glúteo medio (abductores)',
  'abs-upper': 'Abdomen superior', 'abs-lower': 'Abdomen inferior', 'obliques': 'Oblicuos', 'hip-flexor': 'Flexores de cadera',
};

// Series efectivas por SUBREGIÓN dentro de UN grupo AVI, en los últimos windowDays.
// Solo cuenta ejercicios cuyo `muscle` ES el grupo pedido, y atribuye sus series a las
// subregiones PRIMARIAS que pertenecen a ESE grupo (las de otros grupos se ignoran;
// p.ej. el glúteo de una sentadilla no aparece bajo Piernas). Agrega por etiqueta
// (Antebrazo/Braquiorradial unen sus variantes). getSubregions(ex)→[subregión…] lo
// inyecta la UI (resuelve el ejercicio por id o nombre vía MM_EX). Pura/testeable.
// Devuelve [{label, sets}] desc (sets>0). Si un ejercicio no resuelve subregiones del
// grupo, su volumen cae en 'General'.
function submuscleVolume(sessions, group, windowDays, now, getSubregions) {
  const ref = now ? new Date(now) : new Date();
  const cutoff = ref.getTime() - (windowDays || 7) * MS_DAY;
  const counts = {};
  (sessions || []).forEach(s => {
    const t = new Date(s && s.date).getTime();
    if (isNaN(t) || t < cutoff) return;
    ((s && s.exercises) || []).forEach(ex => {
      if (((ex && ex.muscle) || '') !== group) return;
      const sets = (((ex && ex.sets) || []).filter(st => st && st.done)).length;
      if (!sets) return;
      const subs = (getSubregions && getSubregions(ex)) || [];
      const labels = [...new Set(subs.filter(sb => SUBMUSCLE_GROUP[sb] === group).map(sb => SUBMUSCLE_LABEL[sb] || sb))];
      if (labels.length) labels.forEach(lb => { counts[lb] = (counts[lb] || 0) + sets; });
      else counts['General'] = (counts['General'] || 0) + sets;
    });
  });
  return Object.keys(counts).map(lb => ({ label: lb, sets: counts[lb] }))
    .sort((a, b) => b.sets - a.sets || a.label.localeCompare(b.label));
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

// ── Niveles de acceso (3): 'libre' | 'app' (Premium app, sin coach) | 'coach'
// (Premium + Coach). `isFreeClient` gatea lo PREMIUM DE APP (libre NO entra; app y
// coach SÍ). `clientHasCoach` gatea lo SOLO-COACH (hoy: el chat). Compatibilidad
// crítica: tiene coach TODO el que NO es libre y NO es el nuevo tier 'app' —
// incluido el cliente creado por coach SIN tier (isFreeClient=false, tier
// indefinido) que YA tenía chat. Así, al introducir el split, NADIE pierde el
// chat (regla: activar/cambiar un nivel nunca debe quitar capacidades).
function clientHasCoach(client) {
  return !!client && !isFreeClient(client) && client.tier !== 'app';
}
// Nivel normalizado del cliente para etiquetas/UI.
function clientPlan(client) {
  if (!client || isFreeClient(client)) return 'libre';
  if (client.tier === 'app') return 'app';
  return 'coach';
}
const PLAN_LABEL = { libre: 'Libre', app: 'Premium app', coach: 'Premium + Coach' };

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

// ── CHECK-IN DIARIO "¿cómo te sientes hoy?" — adapta la rutina al ánimo ──
// Cada estado es una REGLA UNIVERSAL que TRANSFORMA la rutina del día que el
// asesorado ya tiene (mismo patrón que la fase de adaptación). No es una rutina
// por estado por persona.
const MOOD_STATES = [
  { id: 'bien',    emoji: '😊',   label: 'Bien' },
  { id: 'energia', emoji: '🔥',   label: 'Con toda la energía' },
  { id: 'cansado', emoji: '😮‍💨', label: 'Cansado' },
  { id: 'estres',  emoji: '😤',   label: 'Estresado / enojado' },
  { id: 'periodo', emoji: '🩸',   label: 'En mi periodo', femaleOnly: true },
  { id: 'dolor',   emoji: '🤕',   label: 'Con dolor o molestia' },
];

// ¿El ejercicio es de carga (fuerza con peso externo)? Peso corporal,
// isométrico, funcional, cardio y core NO cuentan como carga.
function _isLoadedEx(ex) {
  const type = ((ex && ex.type) || '').toLowerCase();
  const muscle = (ex && ex.muscle) || '';
  if (muscle === 'cardio' || muscle === 'core') return false;
  if (/bodyweight|isom|funcional|cardio|hiit/.test(type)) return false;
  return true;
}

// Bloque de cardio "de relleno" autocontenido (no depende de la biblioteca).
function _cardioBlock(name, mins) {
  return { id: '_mood_cardio', name: name, muscle: 'cardio', type: 'Cardio', sets: 1, reps: mins + ' min', icon: '🏃', _added: true };
}

// Convierte un ejercicio de carga a peso corporal (sin peso, reps altas,
// menos series). Muta la copia recibida. Usado por 'dolor'.
function _demoteToBodyweight(e) {
  e.bodyweightMode = true;
  e.loadHint = 'Sin peso — solo tu cuerpo';
  // Forzar la modalidad a 'reps' (peso corporal): exTrack devuelve ex.track si existe, y TODO
  // lo de carga (input KG, peso sugerido, calentamiento 🔥, swipe→dropset) está gateado por
  // track==='peso_reps'. Antes solo se marcaba bodyweightMode (que ningún render lee) → seguía
  // pidiendo KG y podía registrar un PR de peso en un día sin carga (bug #6 auditoría 2026-06-30).
  e.track = 'reps';
  e.reps = Math.max(parseInt(e.reps) || 12, 15);
  e.sets = Math.min(parseInt(e.sets) || 3, 3);
}

// Aplica el modificador de ánimo a una rutina. opts: { sex }.
// Devuelve una copia nueva con `adapt` (meta para la UI) y `moodAdjusted`.
function applyMood(routine, mood, opts) {
  opts = opts || {};
  const base = routine || {};
  const exs = (base.exercises || []).map(e => Object.assign({}, e));
  const out = Object.assign({}, base, { exercises: exs });
  const rest = parseInt(base.restSec) || 60;
  const adapt = { mood: mood || 'bien', title: '', why: '', tone: 'g', changes: [], flagCoach: false };

  switch (mood) {
    case 'energia':
      adapt.title = '¡A por todo hoy! 🔥';
      adapt.why = 'Te sientes con energía: rutina completa. Si hay un día para buscar un récord, es hoy.';
      break;

    case 'cansado': {
      exs.forEach(e => { e.sets = Math.max(2, (parseInt(e.sets) || 3) - 1); e.restSec = restForExercise(e, base) + 15; });
      out.restSec = rest + 15;
      let dropped = null;
      if (exs.length > 4) dropped = exs.pop(); // quita el último accesorio en sesiones largas
      adapt.title = 'Hoy entrenamos suave 😮‍💨';
      adapt.why = 'Bajamos una serie por ejercicio y subimos el descanso. Mejor entrenar liviano que no entrenar — mañana vuelves con todo.';
      adapt.tone = 'b';
      adapt.changes.push('−1 serie por ejercicio', '+15s de descanso');
      if (dropped) adapt.changes.push('Quitamos: ' + (dropped.name || 'último accesorio'));
      break;
    }

    case 'estres': {
      if (!exs.some(e => e.muscle === 'cardio')) exs.push(_cardioBlock('Cardio de descarga', 10));
      adapt.title = 'Descarga la tensión 😤';
      adapt.why = 'Sumamos un bloque de cardio al final para soltar el estrés. Hoy el gimnasio es tu terapia.';
      adapt.tone = 'b';
      adapt.changes.push('+ Cardio de descarga (10 min)');
      break;
    }

    case 'periodo':
      // Evidencia 2023-2025: la fase del ciclo NO afecta la fuerza ni la
      // hipertrofia. "Nada de fuerza en el periodo" es un MITO. En vez de
      // despojar la carga, EMPODERAMOS + autorregulación: si hay síntomas
      // (cólicos/fatiga) ella marca 'Cansada'/'Con dolor' y esos estados
      // ajustan. Ver docs/entrenamiento-femenino.md.
      adapt.title = 'Entrena con confianza 🩸';
      adapt.why = 'Estar en tu periodo no te frena: puedes entrenar fuerza con normalidad y además te hace bien (huesos, energía, ánimo). Escucha tu cuerpo — si hoy tienes cólicos o te sientes cansada, marca "Cansada" o "Con dolor" y ajustamos la sesión por ti.';
      adapt.tone = 'g';
      break;

    case 'dolor': {
      // Seguridad primero: trabajo suave (sin carga) + avisar al coach.
      let n = 0;
      exs.forEach(e => { if (_isLoadedEx(e)) { _demoteToBodyweight(e); e.sets = 2; n++; } e.restSec = restForExercise(e, base) + 20; });
      out.restSec = rest + 20;
      adapt.title = 'Escucha a tu cuerpo 🤕';
      adapt.why = 'Con dolor lo mejor es no forzar. Hoy trabajamos suave, sin carga, y le avisamos a tu coach para que te acompañe.';
      adapt.tone = 'r';
      adapt.flagCoach = true;
      if (n) adapt.changes.push(n + ' ejercicios sin carga');
      adapt.changes.push('Tu coach fue notificado');
      break;
    }

    case 'bien':
    default:
      adapt.title = 'A entrenar 💪';
      adapt.why = 'Te sientes bien: rutina completa, tal como tu coach la preparó para ti.';
      break;
  }

  out.adapt = adapt;
  out.moodAdjusted = !!mood && mood !== 'bien';
  return out;
}

// ── MEMBRESÍA — estado de pago, permiso de login y badge ──
// Lógica pura (extraída de index.html). getStatus deriva el estado del último
// pago; canLogin define quién entra (pending/active/expiring SÍ; overdue/inactive NO);
// badge mapea estado → etiqueta/colores. Los colores son tokens CSS (var(--…)).
const MS = {
  getStatus(c) {
    if (c.suspended) return 'inactive';
    const pays = c.payments || [];
    if (!pays.length) return 'pending';
    const last = pays.reduce((a, b) => new Date(a.dueDate) > new Date(b.dueDate) ? a : b);
    const daysLeft = Math.ceil((new Date(last.dueDate) - Date.now()) / 86400000);
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 7) return 'expiring';
    return 'active';
  },
  // pending = asesorado nuevo aún sin pago → SÍ entra (onboarding + tier libre).
  // overdue (plan que venció) e inactive (suspendido) siguen bloqueados.
  canLogin(c) { const s = this.getStatus(c); return s === 'active' || s === 'expiring' || s === 'pending'; },
  badge(s) {
    return ({
      active:   { label: 'Al día',      color: 'var(--gt)', bg: 'var(--gl)' },
      expiring: { label: 'Por vencer',  color: 'var(--or)', bg: 'var(--orl)' },
      overdue:  { label: 'Vencido',     color: 'var(--rd)', bg: 'var(--rdl)' },
      pending:  { label: 'Sin pago',    color: 'var(--yl)', bg: 'var(--yll)' },
      inactive: { label: 'Inactivo',    color: 'var(--t2)', bg: 'var(--br)' },
      suspended:{ label: 'Suspendido',  color: 'var(--t2)', bg: 'var(--br)' },
    }[s]) || { label: 'Sin pago', color: 'var(--t2)', bg: 'var(--br)' };
  }
};

// ── Formato de métricas y duración (presentación, sin DOM) ──
function fmtMetric(v, unit) {
  const n = unit === 'kg' ? Math.round(v * 10) / 10 : Math.round(v);
  const u = unit === 'kg' ? ' kg' : unit === 'reps' ? ' reps' : unit === 's' ? ' s' : unit === 'min' ? ' min' : unit === 'rondas' ? ' rondas' : ' ' + (unit || '');
  return n + u;
}
function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} h ${mm} min` : `${h} h`;
}

// ── Calificación de sesión "¿cómo te sentiste?" (1–5 → emoji/etiqueta) ──
const WF_FEELINGS = [{ v: 1, e: '😫', l: 'Muy duro' }, { v: 2, e: '😕', l: 'Pesado' }, { v: 3, e: '😐', l: 'Normal' }, { v: 4, e: '🙂', l: 'Bien' }, { v: 5, e: '😄', l: 'Excelente' }];
function feelingEmoji(n) { const f = WF_FEELINGS.find(x => x.v === n); return f ? f.e : ''; }
function feelingLabel(n) { const f = WF_FEELINGS.find(x => x.v === n); return f ? f.l : ''; }

// ── Objetivo del plan nutricional: usa nut.goal si está fijado; si no, lo infiere
// del texto (planes guardados antes del campo). Devuelve null si no hay pista. ──
const _NUT_GOALS = ['volumen', 'definicion', 'cutting', 'mantenimiento'];
function inferNutGoal(nut) {
  if (!nut) return null;
  if (nut.goal && _NUT_GOALS.indexOf(nut.goal) !== -1) return nut.goal;
  const t = ((nut.plan || '') + ' ' + (nut.avoid || '')).toLowerCase();
  if (/cutting/.test(t)) return 'cutting';
  if (/definici|definir/.test(t)) return 'definicion';
  if (/super[áa]vit|volumen|ganar m[áa]sa|masa muscular|ganancia/.test(t)) return 'volumen';
  if (/d[ée]ficit|perder grasa|p[ée]rdida de grasa|bajar de peso/.test(t)) return 'cutting';
  if (/mantener|mantenimiento|balance cal/.test(t)) return 'mantenimiento';
  return null;
}

// ══════════════════════════════════════════════════════════════════════
// VALORACIÓN NUTRICIONAL / COMPOSICIÓN (panel del coach)
// ──────────────────────────────────────────────────────────────────────
// Fórmulas estándar, SIN DOM ni DB. Antes vivían sueltas dentro del render
// de la valoración (~150 líneas) sin tests. Todas toleran datos faltantes
// devolviendo null (TMB/TDEE/macros) o el caso por defecto, para que el
// render decida qué mostrar. getRctLabel es el hermano de getIccLabel.

// TMB — gasto basal por Mifflin-St Jeor. Requiere peso, altura, edad y sexo;
// si falta alguno → null (no se puede estimar). Redondeado a entero (kcal/día).
function calcTMB(weightKg, heightCm, age, sex) {
  const w = parseFloat(weightKg), h = parseFloat(heightCm), a = parseInt(age);
  if (!w || !h || !a || !sex) return null;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(sex === 'M' ? base + 5 : base - 161);
}

// TDEE — gasto total = TMB × factor de actividad. Sin TMB → null.
function calcTDEE(tmb, activityFactor) {
  if (!tmb) return null;
  const af = parseFloat(activityFactor) || 1.55;
  return Math.round(tmb * af);
}

// Etiqueta de riesgo por relación cintura-talla (RCT = cintura/estatura).
// Mismos cortes que ya usaba el render. Color = token CSS.
function getRctLabel(v) {
  if (v < 0.40) return { label: 'Muy delgado/a', color: 'var(--bl)' };
  if (v < 0.50) return { label: 'Óptimo', color: 'var(--g2)' };
  if (v < 0.60) return { label: 'Riesgo moderado', color: 'var(--yl)' };
  return { label: 'Riesgo elevado', color: 'var(--rd)' };
}

// Mensaje educativo según objetivo + RCT (cintura/talla). rct null = sin medida.
// El foco es enseñar que la composición/cintura pesa más que la balanza.
function getGoalMsg(goal, rct) {
  const rctOk = !rct || rct < 0.50;
  if (goal && (goal.includes('músculo') || goal.includes('Ganar'))) {
    return rctOk
      ? '💪 Tu composición es favorable para ganar músculo. Enfócate en el progreso de carga, no en la balanza.'
      : '💪 Tu objetivo es ganar músculo. El peso puede subir — eso es normal y esperado. Monitorea la cintura como referencia de salud.';
  }
  if (goal && goal.includes('grasa')) {
    if (!rct) return '📉 Registra tu cintura para un seguimiento más preciso.';
    if (rct >= 0.60) return '📉 Tu relación cintura-talla indica riesgo elevado. Reducir 10% de cintura tiene impacto real en tu salud.';
    if (rct >= 0.50) return '📉 Estás en zona de mejora. Cada cm menos en cintura importa más que los kilos en la balanza.';
    return '📉 Tu relación cintura-talla está en zona óptima. Mantenerla es tu principal meta de salud.';
  }
  if (goal && goal.includes('omposición')) {
    return '⚖️ En recomposición el peso puede mantenerse igual mientras tu cuerpo cambia. Mide la cintura cada 3 semanas.';
  }
  if (goal && goal.includes('uerza')) {
    return '🏋️ Para fuerza máxima, la relación cintura-talla indica salud metabólica. El peso en sí es secundario al rendimiento.';
  }
  return rctOk
    ? '✅ Tu relación cintura-talla está en zona saludable.'
    : '📊 Mantener la relación cintura-talla por debajo de 0.50 es el indicador de salud más importante.';
}

// Calorías objetivo según meta. Devuelve { kcalObj, label, deficit }. Sin TDEE
// → kcalObj null (no hay base sobre la cual aplicar déficit/superávit).
function kcalTargetFor(goal, tdee) {
  let deficit = 0, label = 'Mantenimiento calórico';
  switch (goal) {
    case 'Perder grasa':  deficit = -500; label = 'Déficit de 500 kcal/día (aprox. 0.5 kg/sem)'; break;
    case 'Ganar músculo': deficit = +350; label = 'Superávit de 350 kcal/día (ganancia limpia)'; break;
    case 'Recomposición': deficit = 0;    label = 'Mantenimiento + ciclado calórico'; break;
    case 'Fuerza':        deficit = +200; label = 'Superávit moderado para rendimiento'; break;
    case 'Resistencia':   deficit = 0;    label = 'Mantenimiento con foco en carbohidratos'; break;
    default:              deficit = 0;    label = 'Mantenimiento calórico'; break;
  }
  return { kcalObj: tdee ? tdee + deficit : null, label, deficit };
}

// Macros desde las calorías objetivo: proteína por kg (2.2 g si músculo/fuerza,
// si no 1.8), grasa 0.9 g/kg, el resto a carbohidratos (mínimo 0). Sin kcal o
// sin peso → null. Devuelve { prot_g, fat_g, carb_g, kcal }.
function calcMacrosFromKcal(kcalObj, weightKg, goal) {
  const w = parseFloat(weightKg);
  if (!kcalObj || !w) return null;
  const prot_g = Math.round(w * (goal === 'Ganar músculo' || goal === 'Fuerza' ? 2.2 : 1.8));
  const fat_g = Math.round(w * 0.9);
  const carb_kcal = Math.max(0, kcalObj - prot_g * 4 - fat_g * 9);
  const carb_g = Math.round(carb_kcal / 4);
  return { prot_g, fat_g, carb_g, kcal: kcalObj };
}

// ── Estimación nutricional AUTOMÁTICA (Premium self-serve): compone el pipeline
// TMB(Mifflin-St Jeor) → TDEE(×actividad) → objetivo calórico por meta → macros.
// weightKg opcional (si no, usa client.weight). Devuelve null si faltan datos
// (peso/estatura/edad). Pura/testeable; reúne las funciones ya existentes.
function nutritionEstimate(client, weightKg) {
  client = client || {};
  // Exigir sexo EXPLÍCITO: sin él no calibramos. Antes getSexCode caía a 'F' y estimaba a un
  // hombre sin sexo como mujer en silencio (~166 kcal menos), además incoherente con la
  // valoración del coach que ya muestra blanco sin sexo. La UI pide "peso, estatura, edad y
  // sexo" cuando esto devuelve null. Bug #10 auditoría 2026-06-30.
  const sx = client.sex === 'M' || client.sex === 'F' ? client.sex : null;
  if (!sx) return null;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);
  const tmb = calcTMB(w, client.height, client.age, sx);
  if (!tmb) return null;
  const af = parseFloat(client.activityFactor) || 1.55;
  const tdee = calcTDEE(tmb, af);
  const t = kcalTargetFor(client.goal, tdee);
  const macros = calcMacrosFromKcal(t.kcalObj, w, client.goal);
  const water = w ? Math.round(w * 35 / 250) : null; // ~35 ml/kg en vasos de 250 ml
  return { tmb, tdee, af, kcalObj: t.kcalObj, label: t.label, deficit: t.deficit, macros, water };
}

// ── Reparto del día en comidas: distribuye las kcal objetivo por comida según
// pesos típicos y reparte la proteína EN PARTES IGUALES (mejor síntesis cuando
// se distribuye en todas las tomas). n = nº de comidas (2–6; default 4). Pura:
// la usa la habitación de Nutrición para mostrar "cómo repartir tu día" cuando
// el cliente solo tiene la estimación automática (sin ejemplos del coach).
function nutMealSplit(kcal, protG, n) {
  kcal = parseFloat(kcal) || 0; protG = parseFloat(protG) || 0;
  n = Math.max(2, Math.min(6, parseInt(n) || 4));
  const NAMES = {
    2: ['Comida principal', 'Segunda comida'],
    3: ['Desayuno', 'Almuerzo', 'Cena'],
    4: ['Desayuno', 'Almuerzo', 'Snack', 'Cena'],
    5: ['Desayuno', 'Snack mañana', 'Almuerzo', 'Snack tarde', 'Cena'],
    6: ['Desayuno', 'Snack mañana', 'Almuerzo', 'Snack tarde', 'Cena', 'Antes de dormir'],
  };
  const WEIGHTS = {
    2: [0.55, 0.45],
    3: [0.30, 0.40, 0.30],
    4: [0.30, 0.35, 0.10, 0.25],
    5: [0.25, 0.10, 0.30, 0.10, 0.25],
    6: [0.22, 0.10, 0.28, 0.10, 0.22, 0.08],
  };
  const names = NAMES[n], w = WEIGHTS[n];
  const protEach = protG ? Math.round(protG / n) : 0;
  return names.map((name, i) => ({ name, kcal: kcal ? Math.round(kcal * w[i]) : 0, prot: protEach }));
}

// ══════════════════════════════════════════════════════════════════════
// GAMIFICACIÓN — nivel permanente
// ──────────────────────────────────────────────────────────────────────
// Lógica pura sin DOM ni DB. El nivel premia el TOTAL histórico de entrenos
// (nunca baja). El descuento por adherencia (gxDiscount/gxNextTier) se
// ELIMINÓ el 2026-07-06 por decisión de Camilo: tuvo poca recepción.

const GX_LEVELS = [{ n: 1, name: 'Arranque', min: 0 }, { n: 2, name: 'Constante', min: 10 }, { n: 3, name: 'Comprometido', min: 30 }, { n: 4, name: 'Imparable', min: 60 }, { n: 5, name: 'Élite AVI', min: 120 }];

// Nivel permanente según el total de entrenamientos completados.
// Devuelve { cur, next, pct (avance al siguiente), rem (entrenos que faltan) }.
function gxLevel(total) {
  let cur = GX_LEVELS[0];
  for (const l of GX_LEVELS) { if (total >= l.min) cur = l; }
  const i = GX_LEVELS.indexOf(cur), next = GX_LEVELS[i + 1] || null;
  let pct = 100, rem = 0;
  if (next) { pct = Math.max(0, Math.min(100, Math.round(((total - cur.min) / (next.min - cur.min)) * 100))); rem = Math.max(0, next.min - total); }
  return { cur, next, pct, rem };
}

// ══════════════════════════════════════════════════════════════════════
// PROGRESO POR EJERCICIO (gráfica de evolución del asesorado)
// ──────────────────────────────────────────────────────────────────────
// Agrega el historial en una serie por ejercicio: un punto por día entrenado
// con el MEJOR valor de ese día (y el volumen, en peso_reps). El "mejor valor"
// depende de la modalidad (track): peso máx, reps máx, segundos máx, minutos
// sumados o rondas. Pura: recibe el array de sesiones (como se guarda, nuevo→viejo)
// y lo invierte internamente para que la serie quede viejo→nuevo (la lee el chart).
// El consumidor (buildExerciseProgress en index.html) solo le pasa DB.history[cid].
function computeExerciseProgress(history) {
  const sessions = (history || []).slice().reverse(); // oldest first
  const map = {}; // key: nombre del ejercicio
  sessions.forEach(s => {
    const dateStr = new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    (s.exercises || []).forEach(ex => {
      // track viene del historial; las sesiones antiguas sin track son peso_reps.
      const track = ex.track || 'peso_reps';
      const done = (ex.sets || []).filter(st => st.done);
      let val = 0, vol = 0, unit = 'kg';
      if (track === 'peso_reps') {
        const ws = done.filter(st => parseFloat(st.kg) > 0);
        if (!ws.length) return; // sin peso registrado
        val = Math.max(...ws.map(st => parseFloat(st.kg)));
        vol = ws.reduce((t, st) => t + (parseFloat(st.kg) || 0) * (parseFloat(st.reps) || 0), 0);
        unit = 'kg';
      } else if (track === 'reps') {
        const rs = done.filter(st => parseInt(st.reps) > 0); if (!rs.length) return;
        val = Math.max(...rs.map(st => parseInt(st.reps) || 0)); unit = 'reps';
      } else if (track === 'tiempo') {
        const ts = done.filter(st => parseInt(st.secs) > 0); if (!ts.length) return;
        val = Math.max(...ts.map(st => parseInt(st.secs) || 0)); unit = 's';
      } else if (track === 'cardio') {
        const cs = done.filter(st => parseFloat(st.min) > 0); if (!cs.length) return;
        val = cs.reduce((t, st) => t + (parseFloat(st.min) || 0), 0); unit = 'min';
      } else if (track === 'hiit') {
        if (!done.length) return; val = done.length; unit = 'rondas';
      } else return;
      if (!map[ex.name]) map[ex.name] = { name: ex.name, icon: ex.icon || '💪', muscle: ex.muscle, unit, points: [] };
      map[ex.name].unit = unit;
      // Un punto por fecha de sesión (si entrenó dos veces el mismo día, toma el máx).
      const existing = map[ex.name].points.find(p => p.dateStr === dateStr);
      if (existing) { existing.maxKg = Math.max(existing.maxKg, val); existing.vol += vol; }
      else map[ex.name].points.push({ date: s.date, dateStr, maxKg: val, vol: Math.round(vol) });
    });
  });
  // Conserva ejercicios con ≥1 punto; ordena por nº de puntos (más datos primero).
  return Object.values(map).filter(e => e.points.length >= 1).sort((a, b) => b.points.length - a.points.length);
}

// ══════════════════════════════════════════════════════════════════════
// EDITORIAL DE LA SEMANA — voz de coach según el objetivo del asesorado
// ──────────────────────────────────────────────────────────────────────
// Elige kick/título/cuerpo del banner semanal a partir del objetivo (matching
// por regex, antes sin test) y cuenta los días de entreno. Devuelve DATOS, no
// HTML: el armado del markup (con esc) se queda en index.html. Pura.
function weekEditorial(client) {
  client = client || {};
  const trainDays = (client.routines || []).filter(r => r.day !== 'Libre').length;
  const g = (client.goal || '').toLowerCase();
  let kick, title, body;
  if (/grasa|perder|baj|adelgaz/.test(g)) {
    kick = 'QUEMA Y CONSTANCIA'; title = 'Esta semana, cada gota cuenta';
    body = 'Tu plan mezcla fuerza y movimiento para encender tu metabolismo. Preséntate aunque el día venga flojo — la constancia es la que transforma.';
  } else if (/m[uú]sculo|muscul|ganar|hipertrof/.test(g)) {
    kick = 'FUERZA Y CRECIMIENTO'; title = 'Esta semana construimos músculo';
    body = 'Sube el peso cuando la técnica te lo permita y respeta los descansos: ahí es donde creces. Tu coach diseñó cada rutina para ti.';
  } else if (/recompos/.test(g)) {
    kick = 'RECOMPOSICIÓN'; title = 'Más fuerte y más definido';
    body = 'Entrenas fuerza mientras cuidas tu energía. Ten paciencia: el cambio se nota en semanas, no en días. Vamos juntos.';
  } else {
    kick = 'TU SEMANA'; title = 'Entrenamos con propósito';
    body = 'Tu coach armó cada rutina pensando en tu objetivo. Preséntate, dale con todo y registra tus series — el progreso se construye día a día.';
  }
  return { kick, title, body, trainDays };
}

// ══════════════════════════════════════════════════════════════════════
// MODALIDAD (track) Y RÉCORDS PERSONALES (PR)
// ──────────────────────────────────────────────────────────────────────
// exTrack: cómo se mide un ejercicio (qué campo registra). Si no trae `track`
// explícito, lo infiere del tipo. prFromSets/isBetterPR son la lógica pura del
// récord: el valor según la modalidad y si supera al previo. El acceso a estado
// (getLog/isDone/DB.prs) se queda en index.html (checkAndUpdatePRs).
function exTrack(ex) {
  ex = ex || {};
  if (ex.track) return ex.track;
  const t = (ex.type || '').toLowerCase();
  if (t.includes('hiit')) return 'hiit';
  if (t === 'cardio') return 'cardio';
  if (t.includes('isom')) return 'tiempo';
  if (t === 'bodyweight') return 'reps';
  return 'peso_reps';
}

// Valor del récord a partir de las series HECHAS (ya filtradas) según la modalidad:
// peso_reps → kg máx (+ sus reps); reps → reps máx; tiempo → segundos máx;
// cardio → minutos sumados; hiit → nº de rondas. Sin valor positivo → null.
// set = { kg, reps, secs, min } (strings o números; se parsean aquí).
function prFromSets(sets, track) {
  let val = 0, reps = 0, unit = 'kg';
  (sets || []).forEach(s => {
    const kg = parseFloat(s.kg) || 0, rp = parseInt(s.reps) || 0, secs = parseInt(s.secs) || 0, min = parseFloat(s.min) || 0;
    if (track === 'peso_reps') { unit = 'kg'; if (kg > val) { val = kg; reps = rp; } }
    else if (track === 'reps') { unit = 'reps'; if (rp > val) { val = rp; reps = rp; } }
    else if (track === 'tiempo') { unit = 's'; if (secs > val) val = secs; }
    else if (track === 'cardio') { unit = 'min'; val += min; }
    else if (track === 'hiit') { unit = 'rondas'; val += 1; }
  });
  if (val <= 0) return null;
  return { val, reps, unit };
}

// ¿El candidato supera al récord previo? Sin previo → siempre (récord nuevo).
// Empate en kg se desempata por más reps (mismo peso a más repes = mejor récord).
function isBetterPR(val, reps, unit, prev) {
  if (!prev) return true;
  const prevVal = prev.val != null ? prev.val : prev.kg;
  return val > prevVal || (unit === 'kg' && val === prevVal && reps > (prev.reps || 0));
}

// ══════════════════════════════════════════════════════════════════════
// TELEMETRÍA DE ERRORES — limitador puro (v282)
// ──────────────────────────────────────────────────────────────────────
// Decide si un error JS se reporta a la nube (tabla app_errors). Reglas:
// mensaje no vacío, dedupe por firma (primeros 120 chars), máx 5 por
// sesión y 20 por día de calendario. PURA: recibe y devuelve el estado;
// el caller lo persiste (sesión en memoria, tope diario en localStorage).
// state = { seen:[firmas], sent:n, day:'Mon Jul 06 2026', dayCount:n }
function errReportGate(state, msg, now) {
  const s = state || {};
  const seen = Array.isArray(s.seen) ? s.seen : [];
  const sent = s.sent || 0;
  const today = (now ? new Date(now) : new Date()).toDateString();
  const dayCount = s.day === today ? (s.dayCount || 0) : 0; // nuevo día → contador diario en cero
  const base = { seen, sent, day: today, dayCount };
  const clean = String(msg == null ? '' : msg).trim();
  if (!clean) return { report: false, state: base };
  const sig = clean.slice(0, 120);
  if (seen.indexOf(sig) !== -1) return { report: false, state: base };
  if (sent >= 5 || dayCount >= 20) return { report: false, state: base };
  return { report: true, state: { seen: seen.concat(sig), sent: sent + 1, day: today, dayCount: dayCount + 1 } };
}

// ── Exportación dual: navegador (global) + Node (module.exports) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MOOD_STATES,
    applyMood,
    MS,
    fmtMetric,
    fmtDuration,
    WF_FEELINGS,
    feelingEmoji,
    feelingLabel,
    inferNutGoal,
    getIccLabel,
    getRctLabel,
    getGoalMsg,
    calcTMB,
    calcTDEE,
    kcalTargetFor,
    calcMacrosFromKcal,
    nutritionEstimate,
    nutMealSplit,
    getSexCode,
    calcMacrosSugeridos,
    migrateRoutineIds,
    shouldPostPush,
    delClientGuard,
    cnTodayGuard,
    generarRutinas,
    EX_LEVEL,
    exLevel,
    exLevelRank,
    parseLimitations,
    genSchemeFor,
    restForType,
    restForExercise,
    REST_BY_TYPE,
    bisetBlocks,
    guidedStepOrder,
    bisetInfo,
    normalizeBisets,
    inferExerciseEnv,
    ENV_ALL,
    mergeHistory,
    mergeClientArrays,
    mergePRs,
    mergeMsgs,
    mergeAuthRow,
    parseOAuthReturn,
    _msgKey,
    localDayStart,
    retentionByDay,
    weeklyActiveCount,
    clientsTrainedToday,
    daysSinceLastSession,
    workoutStreak,
    longestStreak,
    planDays,
    weekStreak,
    longestWeekStreak,
    adherenceMonth,
    dayOrder,
    sortRoutinesByDay,
    isInAdaptation,
    estimate1RM,
    suggestLoad,
    suggestFromPR,
    warmupLoad,
    dropLoad,
    trainingStartTs,
    bmiFrom,
    bodyLoadProfile,
    validateSignup,
    isFreeClient,
    clientHasCoach,
    clientPlan,
    PLAN_LABEL,
    USER_DATA_COLLECTIONS,
    clientToRow,
    rowToClient,
    GX_LEVELS,
    gxLevel,
    computeExerciseProgress,
    weekEditorial,
    exTrack,
    prFromSets,
    isBetterPR,
    MUSCLE_GROUP_CAT,
    MUSCLE_GROUP_LABEL,
    muscleVolume,
    pushPullBalance,
    SUBMUSCLE_GROUP,
    SUBMUSCLE_LABEL,
    submuscleVolume,
    errReportGate,
  };
}
