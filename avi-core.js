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
  // NUEVOS 2026-07-27 (e215-e227). Se declaran EXPLÍCITAMENTE: un id que no esté aquí y no traiga
  // `level` propio cae a 'I' por el default de exLevel(), y entonces un PRINCIPIANTE no lo recibe
  // JAMÁS. Criterio: 'P' lo que un novato puede hacer sin técnica previa
  // ni riesgo (polea de pie, floor press, máquina asistida, curl en banco); 'I' lo que exige
  // banco declinado, barra libre sobre la cara o una base de fuerza (flexión con pies elevados).
  e215:'I',e216:'I',e217:'I',e218:'P',e219:'P',e220:'I',
  e222:'I',e223:'I',e225:'P',e226:'I',
  // ── LOTE DE JUNIO (e165-e214): entró SIN nivel y llevaba un mes cayendo a 'I' por el default.
  // No fue una decisión de nadie: 48 ejercicios de último recurso para un principiante (el gate
  // agota lo de nivel P antes de tocar lo 'I') y, peor, con el riesgo al revés — el burpee
  // completo y el salto al cajón quedaban ANTES que un salto de patinador, porque nadie dijo
  // que fueran avanzados.
  // Criterio aplicado (2026-07-28): 'P' movilidad/estiramiento completo, cardio de bajo impacto,
  // agarre y antebrazo; 'I' lo que pide sostener una plancha, saltar con caída controlada o
  // llevar peso sobre la cabeza; 'A' impacto alto o movimiento encadenado (thruster, man maker,
  // burpee completo, salto al cajón, zancada con salto, salto agrupado) — mismo listón que ya
  // tenían e75 Burpees y e74 HIIT.
  e165:'P',e166:'P',e167:'P',e168:'P',e169:'P',e170:'P',e171:'P',e172:'P',
  e173:'P',e174:'P',e175:'P',e176:'P',e177:'P',e178:'P',e179:'P',e180:'P',
  e182:'P',e183:'P',e184:'I',e185:'A',e186:'I',e187:'A',e188:'I',e189:'I',
  e190:'I',e191:'A',e192:'I',e193:'P',e194:'I',e195:'P',e196:'I',e197:'P',
  e198:'P',e199:'P',e200:'A',e201:'I',e202:'A',e203:'I',e204:'A',e205:'I',
  e206:'P',e207:'P',e209:'P',e210:'P',e211:'P',e212:'I',e213:'P',e214:'P',
};
// ── TINTA LEGIBLE PARA LOS COLORES DE MÚSCULO (FASE 3, 2026-07-28) ──────────────────────
// El código de colores por músculo (MC) pinta a la vez el TINTE de fondo de una etiqueta y su
// TEXTO. Medido: 7 de los 10 colores no llegan al mínimo de lectura usados así sobre su propio
// tinte en tema claro (piernas 2.14:1, gluteo 2.33, tríceps 2.47, pecho 2.80…). Oscurecer solo
// el TEXTO respeta el código de colores —el ojo sigue leyendo «naranja = pecho»— y lo sube a
// 6:1 o más.
// Puro y sin DOM para poder probarlo en la suite.
//
// ⚠️ CORRECCIÓN (2026-07-29): la nota original decía que «en tema oscuro el color crudo ya se
// lee, no se toca». Medido con la lista completa, es FALSO — sobre el tinte al 8% encima de una
// tarjeta oscura el crudo se queda en 2.66-4.46 (la etiqueta de series salía a 3.04). Ahí hay
// que ir al otro lado: ACLARAR el texto mezclándolo con blanco, que es lo que hace `mcInkUp`.
// Mezclar hacia blanco (no multiplicar) es lo que conserva el tono: multiplicar por un factor
// >1 satura y clipa los canales que ya venían altos, y el color deja de identificar al músculo.
function mcInk(hex, factor) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const f = factor == null ? 0.55 : factor;
  const p2 = n => n.toString(16).padStart(2, '0');
  const c = [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))));
  return '#' + c.map(p2).join('');
}
// Gemela de `mcInk` para el TEMA OSCURO: mezcla el color con blanco en vez de oscurecerlo.
// Con t=0.35 los 10 colores de músculo pasan de 2.66-4.46 a 5.14 o más sobre su propio tinte
// encima de la tarjeta oscura, y siguen siendo el mismo tono (versión pastel, no otro color).
function mcInkUp(hex, t) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const k = t == null ? 0.35 : Math.max(0, Math.min(1, t));
  const p2 = n => n.toString(16).padStart(2, '0');
  const c = [0, 2, 4].map(i => { const v = parseInt(h.slice(i, i + 2), 16); return Math.round(v + (255 - v) * k); });
  return '#' + c.map(p2).join('');
}
// ── TINTA SOBRE UN RELLENO SATURADO (2026-07-29) ─────────────────────────────────────────
// Las iniciales del avatar iban en `color:white` fijo sobre una paleta de 8 colores: medido,
// **6 de los 8 no llegaban** al mínimo y el amarillo daba 1.67:1 (prácticamente invisible). La
// auditoría solo cazó uno (3.96) porque el color sale de un hash del NOMBRE — con los nombres
// del fixture nunca salieron los peores. En vez de embarrar la paleta oscureciéndola entera,
// cada relleno declara su tinta, que es el patrón que AVI ya usa (`--on-or`, `--on-bl`, mcInk):
// se elige blanco o tinta oscura, la que contraste MÁS con ese color.
const INK_DARK = '#1A1A1A';
function _relLum(h) {
  const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function inkOn(hex) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '#FFFFFF';
  const L = _relLum(h);
  const conBlanco = 1.05 / (L + 0.05);
  const conOscuro = (L + 0.05) / (_relLum(INK_DARK.slice(1)) + 0.05);
  return conBlanco >= conOscuro ? '#FFFFFF' : INK_DARK;
}

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
    // La MOVILIDAD no es un ejercicio de entreno: es calentamiento. Los slots `[músculo, null]`
    // (core, cardio) aceptaban cualquier tipo, así que en casa/parque —donde el pool del tipo se
    // agota— el plan salía con «Postura del Niño» o «Círculos de Brazos» ocupando el sitio de una
    // plancha, con series y repeticiones. Medido: pasaba en 60 de 384 planes al darle nivel P a
    // la movilidad (2026-07-28). Su lugar es el calentamiento (WARMUP_LIBRARY) y la sesión rápida
    // «Movilidad & Estiramiento». Un slot que la pidiera por su nombre sí la recibe.
    && !(e.type === 'Movilidad' && type !== 'Movilidad')

    && exLevelRank(e) <= cap // gate por nivel: el ejercicio no puede exceder el tope del cliente
    && (!st.tier || (e.tier || 'premium') === st.tier)
    && (e.env || ['gym']).includes(st.place); // entorno: el ejercicio debe ser realizable ahí
  // ⭐ Priorizados (Fase C): si el coach marcó un ejercicio de este músculo/tipo, va PRIMERO
  // (cubre "impulsar" y "asegurar que entre"). Respeta ok() (nivel/entorno/tier/exclusión) y
  // el tipo del slot; si no pasa esos filtros, simplemente no se fuerza.
  if (st.preferIds && st.preferIds.size) {
    const pref = lib.find(e => st.preferIds.has(e.id) && e.muscle === muscle
      && (type ? e.type === type : true) && ok(e) && !st.usedInDay.has(e.id));
    if (pref) { st.usedInDay.add(pref.id); if(st.usedInWeek)st.usedInWeek.add(pref.id); const fm=_genMoveFamily(pref); if(fm&&st.usedFamiliesInDay)st.usedFamiliesInDay.add(fm); return pref; }
  }
  // Pools en orden de prioridad. Se usa el primero que tenga algo sin usar hoy:
  //  1) methodBias (ej. calistenia → peso corporal) ANTES que el tipo del slot,
  //  2) tipo exacto del slot, 3) fallback solo-músculo (cuando el tipo está agotado/vacío).
  // `extra` permite anteponer una tanda más estricta (ej. solo-Principiante) antes de la normal.
  // `loose` = la tanda que SUELTA el tipo del slot y se queda solo con el músculo.
  //
  // Se separan en DOS grupos, y la distinción importa (ver la elección del pool, abajo):
  //   · `prefPools` = INTENCIÓN EXPLÍCITA de quien pidió el plan (estilo calistenia/funcional,
  //     perfil de carga alto, `prefer` del slot). La variedad NUNCA los puede saltar: si el
  //     coach pidió peso corporal y sólo hay un ejercicio de pecho corporal, ese va los 3 días
  //     — repetirlo es correcto; meterle un press de banca sería desobedecer lo que pidió.
  //   · `tierPools` = escalones de RELLENO (nivel, tipo del slot). Aquí sí manda la variedad.
  const prefPools = [], tierPools = [];
  const addTier = (extra, loose) => {
    if (loose) { tierPools.push(lib.filter(e => ok(e) && extra(e))); return; }
    if (st.preferType) prefPools.push(lib.filter(e => ok(e) && e.type === st.preferType && extra(e)));
    // Perfil de carga 'high' (IMC/cintura altos): prioriza variantes guiadas/asistidas
    // (máquina, polea, prensa…) DENTRO del tipo del slot, antes de las libres.
    if (st.preferName) prefPools.push(lib.filter(e => ok(e) && (type ? e.type === type : true) && st.preferName.test(_norm(e.name)) && extra(e)));
    tierPools.push(lib.filter(e => ok(e) && (type ? e.type === type : true) && extra(e)));
  };
  // `prefer` del slot: predicado cuyos ejercicios van PRIMERO (ej. los posteriores en el día
  // de TRACCIÓN), respetando nivel/entorno/tier y el tipo del slot.
  if (slotOpts && slotOpts.prefer) {
    prefPools.push(lib.filter(e => ok(e) && (type ? e.type === type : true) && slotOpts.prefer(e)));
  }
  // ORDEN DE DESCARTES: se afloja el NIVEL antes que el TIPO DE MOVIMIENTO.
  // El slot pide un patrón (empuje vertical, tracción, sentadilla); rellenarlo con un
  // aislamiento del mismo músculo cambia el entrenamiento, mientras que subir un escalón de
  // dificultad NO sale del tope ya sancionado (`levelCap`: un principiante siempre pudo
  // recibir Intermedio; Avanzado sigue fuera). Con el orden anterior —nivel primero— el
  // principiante de gym perdía el press por encima de la cabeza 2 de 3 días y en su lugar
  // le caían elevaciones laterales, y en casa el compuesto de espalda lo ocupaban unos
  // encogimientos (trapecio). Medido 2026-08-01 sobre 1.440 planes.
  if (st.preferP) addTier(e => exLevelRank(e) === 0, false);
  addTier(() => true, false);
  if (st.preferP) addTier(e => exLevelRank(e) === 0, true);
  addTier(() => true, true);
  // ── Elección del POOL ────────────────────────────────────────────────
  // El cursor (`st.cursors`) ya rota entre días, así que un pool de 2+ sale variado solo.
  // Lo que NO se puede rotar es un pool de UNO: el Principiante recibe Full Body los 3 días
  // (mismos slots), y si el nivel P sólo tiene un compuesto para ese músculo en ese entorno,
  // ese ejercicio caía los 3 días, en TODA semilla. Medido 2026-08-01: hombro compuesto en
  // gym = 1 opción («Press Militar en Máquina» lunes/martes/miércoles) · pecho en casa = 1 ·
  // espalda en casa/parque = 1. Es el origen de «a nadie le gustan las rutinas».
  // Fix: si la tanda estricta (solo nivel P) ya se agotó ESTA SEMANA, se cede a la siguiente,
  // que para un principiante incluye Intermedio — permitido desde siempre por `levelCap`
  // (_levelGate: cap 1 = P+I); `preferP` era una PREFERENCIA, no un tope. Avanzado sigue fuera.
  // La variedad se busca DENTRO de cada grupo, nunca saltando del de intención al de relleno:
  // se agota lo explícito (fresco, y si no, repitiendo) antes de tocar los escalones.
  const libreHoy = e => !st.usedInDay.has(e.id);
  const libreEstaSemana = e => libreHoy(e) && !(st.usedInWeek && st.usedInWeek.has(e.id));
  const primero = (lista, regla) => { for (const p of lista) if (p.some(regla)) return p; return null; };
  const pool = primero(prefPools, libreEstaSemana) || primero(prefPools, libreHoy)
    || primero(tierPools, libreEstaSemana) || primero(tierPools, libreHoy);
  if (!pool) {
    // Sin NINGUNA opción de este músculo en este entorno → hueco real (lo reporta al coach).
    if (st.envShortfall && !lib.some(ok)) st.envShortfall.add(muscle);
    return null;
  }
  const key = muscle + '|' + (type || '*');
  const start = st.cursors[key] != null ? st.cursors[key] : (st.seed % pool.length);
  const tomar = idx => {
    const cand = pool[idx];
    st.cursors[key] = (idx + 1) % pool.length;
    st.usedInDay.add(cand.id);
    if (st.usedInWeek) st.usedInWeek.add(cand.id);
    const fam = _genMoveFamily(cand);
    if (fam && st.usedFamiliesInDay) st.usedFamiliesInDay.add(fam);
    return cand;
  };
  let fb = -1; // fallback: primer candidato libre cuya FAMILIA ya se usó hoy (último recurso)
  let fw = -1; // fallback: primer candidato libre que ya salió ESTA SEMANA (antes que fb)
  for (let i = 0; i < pool.length; i++) {
    const idx = (start + i) % pool.length;
    const cand = pool[idx];
    if (st.usedInDay.has(cand.id)) continue;
    const fam = _genMoveFamily(cand);
    if (fam && st.usedFamiliesInDay && st.usedFamiliesInDay.has(fam)) { if (fb < 0) fb = idx; continue; }
    if (st.usedInWeek && st.usedInWeek.has(cand.id)) { if (fw < 0) fw = idx; continue; }
    return tomar(idx);
  }
  // Repetir un ejercicio de la semana es menos malo que repetir el PATRÓN dentro del mismo día
  // (eso desbalancea la sesión), y las dos cosas son mejores que dejar el slot vacío.
  if (fw >= 0) return tomar(fw);
  if (fb >= 0) return tomar(fb);
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
    // usedInDay/usedFamiliesInDay se reinician CADA día; usedInWeek NO — es la memoria que
    // evita que el mismo ejercicio caiga los 3 días cuando su pool de nivel es de uno solo.
    scheme, usedInDay: new Set(), usedFamiliesInDay: new Set(), usedInWeek: new Set(), exclude: _genMakeExcluder(lim, minor, highLoad, place), envShortfall: new Set(),
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

// ¿Una sesión ya está TERMINADA (no una serie suelta a media sesión)? La marca `finishedAt` la
// ponen los DOS flujos de fin (100% en updateClientProgress y "Finalizar temprano" en
// finishSessionEarly); una sesión 100% del historial VIEJO (sin flag) también cuenta por
// doneSets>=totalSets. Una parcial en curso (marcó 1 serie pero sigue entrenando) → false. PURA.
function sessionFinished(s) {
  if (!s) return false;
  if (s.finishedAt) return true;
  const ds = +s.doneSets || 0, ts = +s.totalSets || 0;
  return ts > 0 && ds >= ts;
}

// ¿El asesorado ya TERMINÓ un entrenamiento HOY? CUALQUIER rutina finalizada cuenta, no solo la
// del día: si el lunes de pierna FINALIZÓ la de espalda, igual entrenó. Una parcial EN CURSO no
// cuenta → la tarjeta "ya entrenaste" JAMÁS pisa un entreno a medias (bug v366). PURA. `sessions`
// = historial del asesorado (DB.history[id]); `now` opcional. Determinista por día LOCAL.
function finishedTrainingToday(sessions, now) {
  const today = localDayStart(now || new Date());
  return (sessions || []).some(s => s && localDayStart(s.date) === today && sessionFinished(s));
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

// ── TOPE DE LO QUE SE REGISTRA EN UNA SERIE (2026-07-30) ─────────────────────────────
// MEDIDO en producción: hay **800.000.090 kg** guardados en un curl femoral y 200.000 en un
// pullover. Sin tope, un dedo gordo en el teclado entra tal cual al historial y de ahí contamina
// para SIEMPRE: el récord personal de ese ejercicio, la gráfica de progreso y el `totalVol` que
// alimenta las medallas (había una sesión con volumen de 12 mil millones).
// Los topes son generosos a propósito — el récord mundial de peso muerto ronda los 500 kg, así
// que 1.000 no le estorba a nadie real y sí ataja el error de digitación.
const LOG_MAX = { kg: 1000, lastre: 1000, reps: 999, min: 600, dist: 999 };
function clampLogValue(field, val) {
  const max = LOG_MAX[field];
  if (max == null) return val;                    // campo sin tope definido → intacto
  if (val === '' || val == null) return val;      // borrar el campo sigue siendo válido
  const n = parseFloat(val);
  if (!isFinite(n)) return val;                   // basura → la deja pasar, no es lo nuestro
  if (n < 0) return '0';
  if (n > max) return String(max);
  return val;                                     // dentro de rango → literal, sin reformatear
}

// ── AUTO-CURA DE VALORES ABSURDOS YA GUARDADOS (2026-07-30) ──────────────────────────────────
// `clampLogValue` impide que entren nuevos, pero NO limpia los que ya están: en producción había
// un «Curl Femoral Tumbado» con 800.000.090 kg y un «Pullover en Polea» con 200.000, más un
// RÉCORD falso de 200.000 kg en el perfil de esa persona. Eso contamina la gráfica de progreso,
// el volumen total y las medallas del snapshot de comunidad, para siempre.
//
// POR QUÉ VA EN EL CLIENTE Y NO SOLO EN LA NUBE: la app es offline-first y el dispositivo pisa al
// servidor. Arreglar solo en Supabase no dura — el teléfono vuelve a empujar el valor viejo en el
// siguiente sync. Mismo patrón que `stripFixtureSessions`: se sanea AL CARGAR y, si algo cambió,
// se persiste. Así cada teléfono se cura solo la próxima vez que abra.
//
// QUÉ HACE, y qué NO: pone en BLANCO el valor imposible (la serie sigue contando como hecha, con
// sus repeticiones) y recalcula el volumen de esa sesión. **NO inventa un peso.** Poner el tope
// (1.000) sería afirmar que alguien levantó 1.000 kg, que es tan falso como el dato original.
const _SANE_MAX = { kg: 1000, lastre: 1000, reps: 999, secs: 86400, min: 600, dist: 999 };
function _saneNum(v, max) {
  // true = hay que borrarlo. Solo toca lo que es un número FUERA de rango; el texto raro, el
  // vacío y el 0 se dejan como están (no es asunto de esta función).
  if (v === '' || v == null) return false;
  const n = parseFloat(v);
  if (!isFinite(n)) return false;
  return n < 0 || n > max;
}
// Volumen de una sesión = Σ(kg × reps) de las series HECHAS. Espejo de `updateClientProgress`.
function _volOf(sesion) {
  let vol = 0;
  ((sesion && sesion.exercises) || []).forEach(ex => {
    ((ex && ex.sets) || []).forEach(s => {
      if (!s || !s.done) return;
      vol += (parseFloat(s.kg) || 0) * (parseFloat(s.reps) || 0);
    });
  });
  return vol;
}
function sanitizeHistory(history) {
  const arr = Array.isArray(history) ? history : [];
  let fixed = 0;
  const out = arr.map(h => {
    if (!h || !Array.isArray(h.exercises)) return h;
    let tocado = false;
    const exercises = h.exercises.map(ex => {
      if (!ex || !Array.isArray(ex.sets)) return ex;
      let exTocado = false;
      const sets = ex.sets.map(s => {
        if (!s) return s;
        let sTocado = false; const ns = { ...s };
        Object.keys(_SANE_MAX).forEach(f => {
          if (_saneNum(ns[f], _SANE_MAX[f])) { ns[f] = ''; sTocado = true; fixed++; }
        });
        if (!sTocado) return s;
        exTocado = true; return ns;
      });
      if (!exTocado) return ex;
      tocado = true; return { ...ex, sets: sets };
    });
    if (!tocado) return h;
    const nh = { ...h, exercises: exercises };
    // El volumen guardado se derivó del valor corrupto: se recalcula desde lo que queda.
    nh.totalVol = _volOf(nh);
    return nh;
  });
  return { history: fixed ? out : arr, fixed: fixed };
}
// Los RÉCORDS son un objeto {exId: {kg, val, reps, date, …}} y se guardan aparte del historial:
// un récord imposible sobrevive aunque la sesión que lo originó ya esté limpia. Se ELIMINA el
// récord entero (no se recorta): la app lo vuelve a registrar sola la próxima vez que la persona
// haga ese ejercicio, y con su peso de verdad.
function sanitizePrs(prs) {
  const src = (prs && typeof prs === 'object') ? prs : {};
  const out = {}; let removed = 0;
  Object.keys(src).forEach(k => {
    const p = src[k];
    const malo = p && typeof p === 'object' &&
      ['kg', 'val', 'reps', 'secs', 'min', 'dist'].some(f => _saneNum(p[f], _SANE_MAX[f] || 1000));
    if (malo) { removed++; return; }
    out[k] = p;
  });
  return { prs: removed ? out : src, removed: removed };
}

// ── UMBRAL DE LA RACHA (2026-07-30) ───────────────────────────────────────────
// MEDIDO en producción: el plan del coach prescribe 4-5 días y la gente entrena 2-3. Como la
// racha exigía cumplir `planDays` ENTERO, ninguna semana contaba: `streak_weeks` marcaba **0
// para las 8 personas de la comunidad**, incluida quien lleva 31 sesiones y 10 semanas seguidas
// entrenando. La gamificación estaba desplegada y no premiaba a nadie — y los hitos al muro
// (`crossedStreak`) tampoco se disparaban nunca, porque nunca había cruce.
//
// La racha mide CONSTANCIA (¿volviste esta semana?), no CUMPLIMIENTO del plan (que es otra cosa
// y la ve el coach). Por eso el umbral se topa: una semana cuenta con `STREAK_WEEK_MIN_DAYS`
// días, o con `planDays` si el plan pide menos.
//
// ⚠️ NO usar esto para carga de entrenamiento. El detector de DESCARGA (`coachInsight` /
// `coachPulse`) sigue con `planDays` a propósito: «semanas seguidas A TOPE» significa cumplir el
// plan completo. Con el umbral topado, alguien que entrena 2 días se marcaría como necesitado de
// descarga, que es el consejo contrario al correcto.
const STREAK_WEEK_MIN_DAYS = 2;
function streakTarget(client) {
  return Math.max(1, Math.min(planDays(client), STREAK_WEEK_MIN_DAYS));
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

// ── Rutinas que se "corrieron": día programado ya pasó esta semana y no se entrenó ──
// PURA (recibe `now`), sin localStorage. Alimenta la tarjeta "te quedó pendiente" del
// asesorado (idea Camilo 2026-07-17): si el lunes de pierna quedó sin hacer y hoy es
// miércoles, la ofrece recuperar. Semana Lunes→Domingo (weekStartTs, mismo que weekStreak).
// Reglas:
//   • Solo rutinas con día real (dayOrder 1..7); 'Libre'/''/desconocido NO cuentan.
//   • El día de HOY NO es "perdido" (aún puede entrenarlo) → exige dayOrder(r.day) < hoy.
//   • "No entrenada" = ninguna sesión de ESTA semana con ese routineId (fallback por nombre);
//     cuenta cualquier sesión aun parcial (si ya la tocó, no la nagueamos).
//   • Orden: el día más lejano primero (dayOrder asc = el más atrasado arriba).
// Devuelve [{routine, dayName, weekdayIdx}]. El mute por-semana vive en la UI (no aquí).
function weeklyMissed(client, sessions, now) {
  const ref = now ? new Date(now) : new Date();
  const routines = (client && client.routines) || [];
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayOrd = dayOrder(days[ref.getDay()]);
  const wk = weekStartTs(ref);
  const trainedIds = new Set(), trainedNames = new Set();
  (sessions || []).forEach(s => {
    if (!s || !s.date || weekStartTs(s.date) !== wk) return;
    if (s.routineId) trainedIds.add(s.routineId);
    if (s.routineName) trainedNames.add(s.routineName);
  });
  const out = [];
  routines.forEach(r => {
    if (!r) return;
    const ord = dayOrder(r.day);
    if (ord < 1 || ord > 7) return;                       // Libre / '' / desconocido
    if (ord >= todayOrd) return;                          // hoy o futuro → aún no perdida
    if (trainedIds.has(r.id)) return;                     // ya la entrenó esta semana
    if (r.name && trainedNames.has(r.name)) return;       // fallback por nombre
    out.push({ routine: r, dayName: r.day, weekdayIdx: ord });
  });
  return out.sort((a, b) => a.weekdayIdx - b.weekdayIdx);
}

// ── ¿Mostrar el banner "comparte AVI"? (idea Camilo 2026-07-18, crecimiento orgánico) ──
// PURA. Se muestra SOLO tras engagement real (>= SHARE_MIN_SESSIONS sesiones FINALIZADAS — que el
// asesorado ya le sacó provecho antes de pedirle que invite) y si no lo silenció hace poco
// (snoozeUntil, timestamp). Al descartarlo se pospone SHARE_SNOOZE_DAYS días (ocasional, no molesto).
const SHARE_MIN_SESSIONS = 3;
const SHARE_SNOOZE_DAYS = 45;
function shareBannerEligible(sessions, now, snoozeUntil) {
  const t = +new Date(now == null ? Date.now() : now);
  if (snoozeUntil && t < +snoozeUntil) return false;
  let finished = 0;
  (sessions || []).forEach(s => { if (sessionFinished(s)) finished++; });
  return finished >= SHARE_MIN_SESSIONS;
}

// ── Resumen del PROPIO entrenamiento del coach para su panel (idea Camilo 2026-07-18) ──
// PURA. El coach entrena con "Mi entrenamiento" (COACH_SELF, en su fila propia); esto destila su
// historial en las 3 cifras de la tarjeta "Mi entrenamiento" del Inicio: racha de semanas, días
// entrenados esta semana (contra su meta) y hace cuántos días fue el último. `hasData` distingue
// "no hay entreno" de datos corruptos. Reusa weekStreak/daysSinceLastSession/planDays (ya testeadas).
function myTrainingSummary(client, sessions, now) {
  const ref = now ? new Date(now) : new Date();
  const sess = (sessions || []).filter(s => s && s.date && !isNaN(new Date(s.date).getTime()));
  // OJO: esta tarjeta mezcla DOS cosas y cada una lleva su umbral.
  //  · `streakWeeks` es CONSTANCIA  → umbral topado (streakTarget).
  //  · `target` es la META DEL PLAN que se MUESTRA («2 de 3 días esta semana») → planDays.
  // Un test de la suite cazó justo esto: al migrar todo a streakTarget, la tarjeta del coach le
  // decía que su plan era de 2 días cuando es de 3. `thisWeekDays` no depende del umbral (es el
  // conteo de días distintos de la semana), así que sale igual de cualquiera de las dos.
  const ws = weekStreak(sess, streakTarget(client), ref);
  const daysSince = daysSinceLastSession(sess, ref); // Infinity si nunca entrenó
  return {
    hasData: sess.length > 0,
    streakWeeks: ws.weeks,
    thisWeekDays: ws.thisWeekDays,
    target: planDays(client),
    daysSince: daysSince,
  };
}

// ── Requisitos de contraseña — pura, testeable ──
// DEBE coincidir con la política de Supabase Auth (Camilo la endureció 2026-07-07:
// mínimo 8, con minúscula, mayúscula y dígito). Si la validación local fuera más laxa,
// el registro pasaría aquí y Supabase lo rechazaría con un error EN INGLÉS confuso.
// Fuente única: la usan validateSignup (auto-registro) y el alta de asesorados del coach.
// Devuelve null si la contraseña cumple, o el mensaje de error (en español) si no.
function passwordProblem(pass) {
  pass = pass || '';
  if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[a-z]/.test(pass)) return 'La contraseña debe incluir una letra minúscula';
  if (!/[A-Z]/.test(pass)) return 'La contraseña debe incluir una letra mayúscula';
  if (!/[0-9]/.test(pass)) return 'La contraseña debe incluir un número';
  return null;
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
  const pp = passwordProblem(pass);
  if (pp) return { ok: false, error: pp };
  return { ok: true };
}

// ── Reporte de dolor (pedido Camilo 2026-07-07) — puro, testeable ──
// El asesorado marca DÓNDE le duele y QUÉ TANTO desde la tarjeta del ejercicio en el
// guiado. Niveles: 1=leve, 2=molesto, 3=me impide hacer el ejercicio. El reporte vive
// en client.painCare (perfil → sincroniza a user_data → el coach lo ve) y expira a los
// 14 días. Los tips son CONSERVADORES a propósito: la app no es un médico — la UI
// SIEMPRE añade el aviso de consultar a un profesional si persiste.
const PAIN_AREAS = ['hombro','pecho','codo','muñeca','espalda alta','zona lumbar','cadera','rodilla','tobillo','otra zona'];
const PAIN_LEVELS = [
  { v: 1, label: 'Leve', emoji: '🟡' },
  { v: 2, label: 'Molesto', emoji: '🟠' },
  { v: 3, label: 'No puedo hacerlo', emoji: '🔴' },
];
const PAIN_TIPS = {
  'hombro': 'Evita por ahora las cargas por encima de la cabeza y los rangos que duelan. Prueba agarres neutros (palmas enfrentadas) y baja el peso — como te pasó: a veces cambiar de mancuerna a barra (o al revés) cambia todo.',
  'pecho': 'Reduce el rango de bajada y el peso en los presses. Si un ángulo duele (inclinado), prueba plano o máquinas con recorrido guiado mientras pasa.',
  'codo': 'Baja el peso en empujes y jalones, y evita bloquear el codo con fuerza al final del movimiento. Agarres neutros suelen ayudar.',
  'muñeca': 'Revisa que la muñeca vaya RECTA bajo la carga. Agarres neutros o straps pueden ayudar mientras se calma.',
  'espalda alta': 'Calienta más tiempo la zona antes de jalones/remos y baja el peso. Evita encoger los hombros al remar.',
  'zona lumbar': 'Evita por ahora cargar peso con la columna flexionada (peso muerto, remo con barra) y prefiere ejercicios con apoyo (máquinas, poleas). El core firme es tu protección.',
  'cadera': 'Reduce la profundidad en sentadillas/zancadas al rango que NO duela y trabaja movilidad suave de cadera en el calentamiento.',
  'rodilla': 'Controla la bajada (no rebotes), reduce profundidad y carga. Las extensiones/prensas con rango corto suelen tolerarse mejor mientras pasa.',
  'tobillo': 'Evita impacto (saltos, trote) mientras duela; la bici estática y ejercicios sentado son buena alternativa.',
  '_default': 'Baja la carga y quédate en el rango de movimiento que NO duele. Si un ejercicio puntual molesta, cámbialo por una variante — para eso está el botón 🔄.',
};
function painTipFor(area) {
  return PAIN_TIPS[area] || PAIN_TIPS._default;
}
// Agrega un reporte normalizado a la lista de cuidado (inmutable). Cap 20 (los más recientes).
function painCareAdd(list, rep, nowIso) {
  rep = rep || {};
  const entry = {
    id: 'p' + Math.random().toString(36).slice(2, 9),
    area: PAIN_AREAS.includes(rep.area) ? rep.area : 'otra zona',
    level: Math.min(3, Math.max(1, parseInt(rep.level) || 1)),
    exId: rep.exId || null,
    exName: String(rep.exName || '').slice(0, 80),
    note: String(rep.note || '').slice(0, 300),
    at: nowIso || new Date().toISOString(),
  };
  return (list || []).concat([entry]).slice(-20);
}
// Reportes vigentes: menos de 14 días y no descartados por el usuario ("Ya estoy bien").
const PAIN_TTL_MS = 14 * 86400000;
function painCareActive(list, nowTs) {
  const now = nowTs || Date.now();
  return (list || []).filter(p => p && !p.cleared && p.at && (now - Date.parse(p.at)) < PAIN_TTL_MS && (now - Date.parse(p.at)) >= 0);
}

// ── Tarjeta "Activa notificaciones" (2026-07-11): decisión pura/testeable ──
// Gobierna la tarjeta del coach (y sirve para la del asesorado). 'granted' → oculta;
// 'denied' → 'denied' (instrucciones, sin botón inútil); 'default' → 'ask' salvo snooze
// vigente. `now`/`snoozeDays` inyectables para tests.
function pushNudgeDecision(perm, snoozeTs, now, snoozeDays) {
  if (perm === 'granted') return 'hidden';
  if (perm === 'denied') return 'denied';
  const days = snoozeDays || 7;
  const n = (now != null ? new Date(now).getTime() : Date.now());
  const s = parseInt(snoozeTs, 10) || 0;
  if (n - s < days * 86400000) return 'hidden';
  return 'ask';
}

// ── Hábitos diarios (v300): AGUA por vasos — puro, testeable ──
// El registro vive en client.habits (viaja en el perfil vía clientToRow, igual que
// painCare). Vaso estándar 250ml; la meta sale del peso (~35 ml/kg) acotada a un
// rango humano [6..12]; sin peso → 8. Todo recibe `now` (determinista).
const WATER_GLASS_ML = 250;
const WATER_KEEP_DAYS = 30; // poda: el objeto no crece sin límite
function habitDayKey(now) {
  const d = now || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function waterGoalGlasses(weightKg) {
  const w = +weightKg;
  if (!Number.isFinite(w) || w <= 0) return 8;
  return Math.min(12, Math.max(6, Math.round((w * 35) / WATER_GLASS_ML)));
}
function waterToday(habits, now) {
  const w = (habits && habits.water) || {};
  return Math.max(0, parseInt(w[habitDayKey(now)]) || 0);
}
// Suma delta (puede ser negativo) al día de `now`. Inmutable. Clamp [0..30] (30 vasos
// = 7.5L, tope de cordura). Poda entradas con más de WATER_KEEP_DAYS días.
function waterAdd(habits, delta, now) {
  const h = Object.assign({}, habits || {});
  const w = Object.assign({}, h.water || {});
  const k = habitDayKey(now);
  w[k] = Math.max(0, Math.min(30, (parseInt(w[k]) || 0) + (parseInt(delta) || 0)));
  const cutoff = habitDayKey(new Date((now ? now.getTime() : Date.now()) - WATER_KEEP_DAYS * 86400000));
  Object.keys(w).forEach(dk => { if (dk < cutoff) delete w[dk]; }); // YYYY-MM-DD ordena lexicográfico
  h.water = w;
  return h;
}
// Últimos 7 días (hoy de último) para la mini-fila de la tarjeta: [{day, n}].
function waterWeek(habits, now) {
  const base = now || new Date();
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86400000);
    out.push({ day: habitDayKey(d), n: waterToday(habits, d) });
  }
  return out;
}
// Meta de agua PURA — réplica del criterio de `_waterGoalFor` (app-5, que toca DOM/estado
// leyendo DB.nutrition): el plan del coach manda (nut.water, ya en vasos) si es >0, acotado
// a 30; sin plan → se calcula del peso (~35 ml/kg). Recibe el registro nutricional del
// asesorado (o null) para NO tocar estado global. Determinista.
function waterGoalFor(client, nut) {
  const coachGoal = nut && parseInt(nut.water);
  return (coachGoal > 0) ? Math.min(30, coachGoal) : waterGoalGlasses(client && client.weight);
}
// Adherencia de agua de los últimos 7 días — para que el COACH la vea en la ficha.
// `goal` = meta ya resuelta (usar waterGoalFor); si viene inválida se cae al default por peso.
// Devuelve: week = [{n, met}×7] cronológico (hoy al final, met = cumplió la meta ese día),
// metDays = cuántos cumplieron la meta, loggedDays = cuántos tienen ≥1 vaso registrado
// (la ficha se OCULTA si loggedDays === 0: progressive disclosure, sin regañar al asesorado).
function waterAdherence(habits, goal, now) {
  const g = (parseInt(goal) > 0) ? parseInt(goal) : waterGoalGlasses();
  const week = waterWeek(habits, now).map(d => ({ n: d.n, met: d.n >= g }));
  let metDays = 0, loggedDays = 0;
  week.forEach(d => { if (d.met) metDays++; if (d.n > 0) loggedDays++; });
  return { week, metDays, loggedDays };
}

// ── Pasos diarios (v362 — 👟 hábito parte 2, mismo hogar que el agua) ──
// Viven en client.habits.steps {'YYYY-MM-DD': pasos} y viajan en el perfil (clientToRow
// copia todo, como painCare). A diferencia del agua (se suma vaso a vaso), los pasos se
// LEEN del celular: la entrada natural es teclear el total del día (stepsSet), y de paso
// hay atajos de +1.000 (stepsAdd). Meta FIJA 8.000 (referencia OMS) — no depende del peso.
// Todo recibe `now` (determinista). Retención compartida con el agua (WATER_KEEP_DAYS).
const STEPS_GOAL_DEFAULT = 8000;
const STEPS_MAX = 100000; // tope de cordura (una jornada extrema ronda un maratón a pie)
function stepsToday(habits, now) {
  const s = (habits && habits.steps) || {};
  return Math.max(0, parseInt(s[habitDayKey(now)]) || 0);
}
// Fija el total del día de `now` (lo que marca el celular). Inmutable. Clamp [0..STEPS_MAX].
// Basura/NaN → 0. Poda entradas con más de WATER_KEEP_DAYS días.
function stepsSet(habits, value, now) {
  const h = Object.assign({}, habits || {});
  const s = Object.assign({}, h.steps || {});
  s[habitDayKey(now)] = Math.max(0, Math.min(STEPS_MAX, parseInt(value) || 0));
  const cutoff = habitDayKey(new Date((now ? now.getTime() : Date.now()) - WATER_KEEP_DAYS * 86400000));
  Object.keys(s).forEach(dk => { if (dk < cutoff) delete s[dk]; }); // YYYY-MM-DD ordena lexicográfico
  h.steps = s;
  return h;
}
// Suma delta (puede ser negativo) al día de `now`, para los atajos +1.000. Inmutable.
// Clamp [0..STEPS_MAX], misma poda que stepsSet.
function stepsAdd(habits, delta, now) {
  return stepsSet(habits, stepsToday(habits, now) + (parseInt(delta) || 0), now);
}
// Últimos 7 días (hoy de último) para la mini-fila de la tarjeta: [{day, n}].
function stepsWeek(habits, now) {
  const base = now || new Date();
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86400000);
    out.push({ day: habitDayKey(d), n: stepsToday(habits, d) });
  }
  return out;
}

// ── Config de HIIT rápido (v301): el usuario elige rondas/trabajo/descanso ──
// Clamps de cordura: rondas 1-20, trabajo 10-180s, descanso 5-180s. Basura/NaN → el
// default del preset. Puro (lo usa el mini-modal de Entrenamientos rápidos).
function clampQwHiit(cfg, def) {
  cfg = cfg || {}; def = def || {};
  const pick = (v, d, lo, hi) => {
    const n = parseInt(v);
    if (!Number.isFinite(n)) return d;
    return Math.min(hi, Math.max(lo, n));
  };
  return {
    rounds: pick(cfg.rounds, def.rounds || 4, 1, 20),
    work:   pick(cfg.work,   def.work   || 30, 10, 180),
    rest:   pick(cfg.rest,   def.rest   || 15, 5, 180),
  };
}

// ── Novedades de la app (v302): qué mostrarle al asesorado — puro, testeable ──
// Devuelve las entradas MÁS NUEVAS que la última versión vista (seenV), de la más
// reciente a la más vieja, tope 3 (una tarjeta digerible; lo viejo ya no es noticia).
function newsToShow(list, seenV) {
  const seen = parseInt(seenV) || 0;
  return (list || [])
    .filter(n => n && parseInt(n.v) > seen)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3);
}

// ── Evidencia de consentimiento (Habeas Data, Ley 1581/2012) — pura, testeable ──
// Las 3 casillas del registro se marcan POR SEPARADO y ninguna viene pre-marcada
// (legal/autorizacion-consentimiento.md §E). Si falta alguna devuelve null (el registro
// no procede); si están todas, arma la "prueba de autorización" que exige la ley:
// qué se aceptó, cuándo y con qué versión de los textos. Va en la fila del usuario.
function consentEvidence(checks, version, nowIso) {
  checks = checks || {};
  if (!checks.general || !checks.salud || !checks.adulto) return null;
  return {
    general: true, salud: true, adulto: true,
    v: String(version || ''),
    at: nowIso || new Date().toISOString(),
  };
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
// El chat es SOLO-COACH (`clientHasCoach`): el asesorado de plan 'libre' o 'app' NO tiene la
// pestaña de mensajes. Escribirle igual NO falla ni avisa — el mensaje se guarda en su fila y
// se queda ahí para siempre. Medido en producción el 2026-07-31: **20 mensajes del coach a 5
// personas de plan 'app'** que ninguna podía leer, el más reciente ese mismo día, a alguien con
// 15 sesiones. El código hacía lo que dice; lo que mentía era la interfaz del coach, que pinta
// un chat normal. Esto devuelve el motivo para que ESA pantalla lo diga.
// Puro: la UI solo pinta lo que esto devuelva. null = el mensaje sí llega.
function chatDeliveryBlock(client) {
  if (!client || clientHasCoach(client)) return null;
  const plan = clientPlan(client);
  return { plan, label: PLAN_LABEL[plan] || plan };
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
  // `care` = 1-3 consejos de BIENESTAR (voz AVI cálida). Consejos generales, NUNCA
  // médicos ni cifras prescriptivas. SIEMPRE presente (también en 'bien'/default).
  // Coach Inteligente Capa A (plan-coach-inteligente §11.E1, 2026-07-15).
  const adapt = { mood: mood || 'bien', title: '', why: '', tone: 'g', changes: [], care: [], flagCoach: false };

  switch (mood) {
    case 'energia':
      adapt.title = '¡A por todo hoy! 🔥';
      adapt.why = 'Te sientes con energía: rutina completa. Si hay un día para buscar un récord, es hoy.';
      adapt.care.push(
        'Aprovecha el día: hidrátate bien durante la sesión',
        'Esta noche duerme 7-8 horas — ahí se consolida lo que entrenas hoy'
      );
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
      adapt.care.push(
        'Duerme 7-8 horas esta noche: el descanso también entrena',
        'Súbele hoy a los carbohidratos, son tu gasolina',
        'Sé amable contigo: el cansancio pone irritable a cualquiera'
      );
      break;
    }

    case 'estres': {
      if (!exs.some(e => e.muscle === 'cardio')) exs.push(_cardioBlock('Cardio de descarga', 10));
      adapt.title = 'Descarga la tensión 😤';
      adapt.why = 'Sumamos un bloque de cardio al final para soltar el estrés. Hoy el gimnasio es tu terapia.';
      adapt.tone = 'b';
      adapt.changes.push('+ Cardio de descarga (10 min)');
      adapt.care.push(
        'Respira profundo entre series — el ejercicio es tu descarga',
        'Al terminar, camina un poco sin afán',
        'Evita la cafeína en la tarde para dormir mejor'
      );
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
      adapt.care.push(
        'Hidrátate más de lo normal estos días',
        'Si hay cólicos, el movimiento suave ayuda — escucha tu cuerpo'
      );
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
      // Seguridad: el care empuja a PARAR, no a aguantar (el test lo verifica).
      adapt.care.push(
        'Si algo duele de verdad, para — no es negociable',
        'Al llegar a casa: hielo y descanso en la zona',
        'Si sigue igual en unos días, consúltalo con un profesional'
      );
      break;
    }

    case 'bien':
    default:
      adapt.title = 'A entrenar 💪';
      adapt.why = 'Te sientes bien: rutina completa, tal como tu coach la preparó para ti.';
      adapt.care.push('La constancia es lo que te transforma — hoy suma un día más');
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
  // `now` opcional (default Date.now()) para determinismo en tests/rank — los callers
  // viejos que pasan solo `c` siguen funcionando igual.
  getStatus(c, now) {
    if (c.suspended) return 'inactive';
    const pays = c.payments || [];
    if (!pays.length) return 'pending';
    const last = pays.reduce((a, b) => new Date(a.dueDate) > new Date(b.dueDate) ? a : b);
    const daysLeft = Math.ceil((new Date(last.dueDate) - (now != null ? new Date(now).getTime() : Date.now())) / 86400000);
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 7) return 'expiring';
    return 'active';
  },
  // pending = asesorado nuevo aún sin pago → SÍ entra (onboarding + tier libre).
  // overdue (plan que venció) e inactive (suspendido) siguen bloqueados.
  canLogin(c) { const s = this.getStatus(c); return s === 'active' || s === 'expiring' || s === 'pending'; },
  // El color va como TEXTO sobre `bg`, así que aquí manda la regla de lectura de la FASE 3:
  // los tokens crudos (--or/--rd/--yl) son para RELLENAR, y encima de su propio tinte no se
  // leen (medido en claro: «Por vencer» daba 2.62:1, «Vencido» 3.45 y «Sin pago» 1.55, contra
  // el 4.5 que pide WCAG). Van sus variantes legibles. El amarillo no tiene variante propia
  // porque ya había precedente: la clase `.ty` pinta sobre --yll con --t1.
  // Esto se le escapó a la FASE 3 porque el badge lo arma JS (no CSS) y el fixture de la
  // auditoría solo llegaba a pintar el estado «Al día», el único que ya pasaba (--gt).
  badge(s) {
    return ({
      active:   { label: 'Al día',      color: 'var(--gt)',  bg: 'var(--gl)' },
      expiring: { label: 'Por vencer',  color: 'var(--ort)', bg: 'var(--orl)' },
      overdue:  { label: 'Vencido',     color: 'var(--rdt)', bg: 'var(--rdl)' },
      pending:  { label: 'Sin pago',    color: 'var(--t1)',  bg: 'var(--yll)' },
      inactive: { label: 'Inactivo',    color: 'var(--t2)',  bg: 'var(--br)' },
      suspended:{ label: 'Suspendido',  color: 'var(--t2)',  bg: 'var(--br)' },
    }[s]) || { label: 'Sin pago', color: 'var(--t2)', bg: 'var(--br)' };
  }
};

// ── Orden inteligente de asesorados (mejora 7 del estudio, 2026-07-11) — puro/testeable ──
// El coach con 20+ asesorados no puede escanear una lista plana. Esta función ordena por
// QUIÉN NECESITA ATENCIÓN, usando SOLO señales que ya existen en los datos. Devuelve un
// tier (0 = más urgente) + sev (desempate dentro del tier) + reason/label para el chip.
// El orden final (en renderClients) es: tier asc → sev desc → nombre asc — DETERMINISTA,
// para que el poll de 15s del coach no reordene la lista "en vivo" (el desempate por nombre
// es el candado contra el salto). NADA de DOM/colores aquí: el color lo pone la vista.
// Prioridades: dolor → vencido → 💬 mensaje sin leer → 🙋 pidió coach → por vencer →
// inactivo → al día → suspendido (siempre el fondo).
//
// FIRMA ADITIVA (v360): `opts = { msgs:[...], lastReadTs:number|null }` es OPCIONAL y trae el
// estado de conversación de ESTE asesorado. Sin opts el resultado es idéntico al de v317 (la
// vista y los callers viejos siguen funcionando). PURO: nada de localStorage/DB aquí — el
// estado de lectura entra por opts (lo arma la vista desde DB.msgs + ax_msgreads).
function clientAttentionRank(c, history, now, opts) {
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  c = c || {};
  opts = opts || {};
  // SUSPENDIDO primero: el coach lo pausó a propósito → tier 7, el FONDO (debajo incluso de
  // los sanos al día), SIN chip de atención. (Sin este corte un suspendido "no entrena" →
  // caería en inactivo y rankearía por encima de los sanos; con dolor hasta saltaría al tope.
  // Aviso Lucas v317. Un suspendido con mensaje sin leer TAMPOCO sube: el corte va primero.)
  if (c.suspended) return { tier: 7, sev: 0, reason: 'ok', label: '' };
  // 0) Dolor vigente: lo más urgente (nivel 3 = "no puedo" pesa más que leve).
  const pains = painCareActive(c.painCare, nowTs);
  if (pains.length) {
    const maxLvl = pains.reduce((m, p) => Math.max(m, p.level || 1), 1);
    return { tier: 0, sev: maxLvl, reason: 'pain',
             label: maxLvl >= 3 ? '🤕 Dolor le impide entrenar' : '🤕 Reportó dolor' };
  }
  // 1) Plan vencido (determinista con now).
  const st = MS.getStatus(c, nowTs);
  if (st === 'overdue')  return { tier: 1, sev: 0, reason: 'overdue',  label: '⛔ Plan vencido' };
  // 2) 💬 MENSAJE SIN LEER del asesorado — la señal #1 que el coach espera (aviso Lucas v317).
  //    Va ENCIMA del lead a propósito: un lead recién llegado también escribió al chat
  //    (requestCoach empuja un mensaje) → entra aquí hasta que el coach lo lea, y DESPUÉS
  //    persiste en el tier 3 hasta convertirlo. Unread = mensaje del asesorado (from !=='coach')
  //    con fecha VÁLIDA posterior a lastReadTs (null = nunca leyó → todo cuenta). sev = ms desde
  //    el unread MÁS VIEJO → quien más lleva esperando respuesta, primero. NO inventamos fechas:
  //    un mensaje sin fecha parseable NO cuenta (lección del bug v359, fallback = época/0).
  const msgs = opts.msgs;
  if (Array.isArray(msgs) && msgs.length) {
    const readTs = (opts.lastReadTs != null && isFinite(opts.lastReadTs)) ? opts.lastReadTs : 0;
    let oldestUnread = Infinity;
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (!m || m.from === 'coach') continue;
      const t = Date.parse(m.date);
      if (!isFinite(t)) continue;                 // sin fecha válida → no cuenta (no inventamos)
      if (t > readTs && t < oldestUnread) oldestUnread = t;
    }
    if (oldestUnread !== Infinity) {
      return { tier: 2, sev: Math.max(0, nowTs - oldestUnread), reason: 'unread',
               label: '💬 Mensaje sin responder' };
    }
  }
  // 3) 🙋 PIDIÓ COACH — lead libre que quiere coach = conversión a Premium enterrada. sev = días
  //    desde wantsCoachAt (el más antiguo primero). Sin wantsCoachAt VÁLIDO → sev 0, al FINAL del
  //    tier: JAMÁS inventar una fecha para adelantarlo (lección del bug v359).
  if (leadPending(c, opts.leadsDone)) {
    const at = c.wantsCoachAt != null ? Date.parse(c.wantsCoachAt) : NaN;
    if (isFinite(at)) {
      const d = Math.max(0, Math.floor((nowTs - at) / MS_DAY));
      return { tier: 3, sev: d, reason: 'lead',
               label: d === 0 ? '🙋 Pidió coach hoy' : `🙋 Pidió coach hace ${d}d` };
    }
    return { tier: 3, sev: 0, reason: 'lead', label: '🙋 Pidió coach' };
  }
  // 4) Plan por vencer.
  if (st === 'expiring') return { tier: 4, sev: 0, reason: 'expiring', label: '⏳ Plan por vencer' };
  // 5) Inactividad. Distinguimos "entrenaba y paró" de "nunca estrenó":
  //    - dejó de entrenar (≥7 días, tenía historial) → churn real, lo más accionable.
  //    - nunca estrenó → SOLO si ya lleva ≥7 días como asesorado Y tiene rutinas asignadas
  //      (si no tiene rutinas, el trabajo del coach es asignarlas y eso ya lo grita el
  //      estado "Sin rutinas" de la tarjeta; y ≥7 días evita marcar a un registro de hoy).
  const dsls = daysSinceLastSession((history && history[c.id]) || [], nowTs);
  const tenureDays = c.createdAt ? Math.floor((nowTs - Date.parse(c.createdAt)) / MS_DAY) : Infinity;
  if (dsls === Infinity) {
    if (tenureDays >= 7 && (c.routines || []).length) {
      return { tier: 5, sev: 9999, reason: 'nostart', label: '🚩 Aún no estrena' };
    }
  } else if (dsls >= 7) {
    // Ícono 📉 (no 💤): el pill de estado del día ya usa 💤 para "Descanso hoy" — dos lunas
    // pegadas confundían descanso planificado con abandono real (aviso Lucas v317).
    return { tier: 5, sev: dsls, reason: 'idle', label: `📉 ${dsls} días sin entrenar` };
  }
  // 6) Al día: sin chip de atención.
  return { tier: 6, sev: 0, reason: 'ok', label: '' };
}
// Ordena una copia de la lista de asesorados por atención (no muta el arreglo original —
// DB.clients lo comparten home y otras vistas). Estable/determinista.
// `optsById` (v360) es OPCIONAL: mapa { clientId: {msgs, lastReadTs} } con el estado de
// conversación por asesorado. Sin él, el orden es idéntico al de v317.
function sortClientsByAttention(clients, history, now, optsById) {
  optsById = optsById || {};
  return (clients || []).map(c => ({ c, r: clientAttentionRank(c, history, now, optsById[c && c.id]) }))
    .sort((a, b) => (a.r.tier - b.r.tier) || (b.r.sev - a.r.sev)
                    || String(a.c.name || '').localeCompare(String(b.c.name || ''), 'es'));
}

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
// PLAN DE ALIMENTACIÓN CON CANTIDADES REALES (2026-08-01)
// ──────────────────────────────────────────────────────────────────────
// Pedido del PO: «que sea un conjunto con su plan de entrenamiento y sus
// objetivos», con comida colombiana y cantidades de verdad — cuántos huevos,
// cuántos gramos de arroz. Hasta hoy el plan decía «Desayuno: 600 kcal, 40 g
// de proteína» (nutMealSplit) y NO tenía una sola cantidad de comida.
//
// Decisiones de producto del PO, ya tomadas (2026-07-31):
//   1. La tabla de alimentos la arma AVI con criterio de nutrición deportiva
//      y comida colombiana; el PO la aprueba. «Si mandas aguacate que sea
//      aguacate, no nombres raros de otros países.»
//   2. El plan de comida va PEGADO AL DÍA DE ENTRENO: más carbohidrato el día
//      de pierna, menos el día de descanso.
//
// NO es una base de datos de alimentos (eso se descartó el 2026-07-09 por ser
// «un hueco sin fondo»): es una lista CERRADA y curada para RECETAR, no un
// buscador donde el usuario registra lo que come. No crece con el uso.
//
// Macros por 100 g del alimento LISTO PARA COMER (cocido cuando aplica), que es
// como lo pesa una persona en su cocina. `un` = medida casera y sus gramos, para
// poder decir «2 huevos» o «1 taza de arroz» en vez de «104 g».
// ──────────────────────────────────────────────────────────────────────
const NUT_FOODS = [
  // ── PROTEÍNA ──
  { id: 'pollo_pechuga', name: 'Pechuga de pollo', rol: 'prot', kcal: 165, p: 31.0, c: 0, f: 3.6, un: { label: 'porción', g: 120 } },
  { id: 'pollo_muslo', name: 'Muslo de pollo sin piel', rol: 'prot', kcal: 209, p: 26.0, c: 0, f: 11.0, un: { label: 'muslo', g: 95 } },
  { id: 'res_magra', name: 'Carne de res magra (posta)', rol: 'prot', kcal: 187, p: 30.0, c: 0, f: 7.0, un: { label: 'porción', g: 120 } },
  { id: 'res_molida', name: 'Carne molida de res', rol: 'prot', kcal: 176, p: 26.0, c: 0, f: 8.0, un: { label: 'porción', g: 120 } },
  { id: 'cerdo_lomo', name: 'Lomo de cerdo', rol: 'prot', kcal: 174, p: 28.0, c: 0, f: 6.0, un: { label: 'porción', g: 120 } },
  { id: 'huevo', name: 'Huevo entero', rol: 'prot', kcal: 143, p: 13.0, c: 1.1, f: 9.9, un: { label: 'huevo', g: 50 } },
  { id: 'clara', name: 'Clara de huevo', rol: 'prot', kcal: 52, p: 11.0, c: 0.7, f: 0.2, un: { label: 'clara', g: 33 } },
  { id: 'tilapia', name: 'Mojarra o tilapia', rol: 'prot', kcal: 128, p: 26.0, c: 0, f: 2.7, un: { label: 'porción', g: 130 } },
  { id: 'atun', name: 'Atún en agua (escurrido)', rol: 'prot', kcal: 116, p: 26.0, c: 0, f: 1.0, un: { label: 'lata', g: 120 } },
  { id: 'queso_campesino', name: 'Queso campesino', rol: 'prot', kcal: 230, p: 17.0, c: 2.0, f: 17.0, un: { label: 'tajada', g: 30 } },
  { id: 'cuajada', name: 'Cuajada', rol: 'prot', kcal: 180, p: 15.0, c: 3.0, f: 12.0, un: { label: 'porción', g: 60 } },
  { id: 'yogur_griego', name: 'Yogur griego natural', rol: 'prot', kcal: 59, p: 10.0, c: 3.6, f: 0.4, un: { label: 'vaso', g: 200 } },
  { id: 'leche', name: 'Leche semidescremada', rol: 'prot', kcal: 47, p: 3.3, c: 5.0, f: 1.5, un: { label: 'vaso', g: 200 } },
  { id: 'lenteja', name: 'Lentejas cocidas', rol: 'prot', kcal: 116, p: 9.0, c: 20.0, f: 0.4, un: { label: 'taza', g: 200 } },
  { id: 'frijol', name: 'Fríjol cocido', rol: 'prot', kcal: 127, p: 9.0, c: 23.0, f: 0.5, un: { label: 'taza', g: 180 } },
  { id: 'garbanzo', name: 'Garbanzo cocido', rol: 'prot', kcal: 164, p: 9.0, c: 27.0, f: 2.6, un: { label: 'taza', g: 165 } },
  // ── CARBOHIDRATO ──
  { id: 'arroz', name: 'Arroz blanco cocido', rol: 'carb', kcal: 130, p: 2.7, c: 28.0, f: 0.3, un: { label: 'taza', g: 158 } },
  { id: 'papa', name: 'Papa cocida', rol: 'carb', kcal: 87, p: 2.0, c: 20.0, f: 0.1, un: { label: 'papa mediana', g: 150 } },
  { id: 'papa_criolla', name: 'Papa criolla cocida', rol: 'carb', kcal: 95, p: 2.0, c: 22.0, f: 0.1, un: { label: 'porción', g: 100 } },
  { id: 'yuca', name: 'Yuca cocida', rol: 'carb', kcal: 160, p: 1.4, c: 38.0, f: 0.3, un: { label: 'trozo', g: 100 } },
  { id: 'platano_maduro', name: 'Plátano maduro cocido', rol: 'carb', kcal: 116, p: 0.8, c: 31.0, f: 0.2, un: { label: 'tajada grande', g: 80 } },
  { id: 'platano_verde', name: 'Plátano verde cocido', rol: 'carb', kcal: 122, p: 1.2, c: 32.0, f: 0.4, un: { label: 'trozo', g: 80 } },
  { id: 'arepa', name: 'Arepa de maíz asada', rol: 'carb', kcal: 218, p: 4.5, c: 44.0, f: 2.5, un: { label: 'arepa', g: 80 } },
  { id: 'pan_integral', name: 'Pan integral tajado', rol: 'carb', kcal: 247, p: 13.0, c: 41.0, f: 3.4, un: { label: 'tajada', g: 28 } },
  { id: 'avena', name: 'Avena en hojuelas', rol: 'carb', kcal: 389, p: 17.0, c: 66.0, f: 7.0, un: { label: 'cucharada', g: 15 } },
  { id: 'pasta', name: 'Pasta cocida', rol: 'carb', kcal: 158, p: 6.0, c: 31.0, f: 0.9, un: { label: 'taza', g: 140 } },
  { id: 'mazorca', name: 'Mazorca (maíz tierno)', rol: 'carb', kcal: 96, p: 3.4, c: 21.0, f: 1.5, un: { label: 'mazorca', g: 130 } },
  // ── GRASA ──
  { id: 'aguacate', name: 'Aguacate', rol: 'fat', kcal: 160, p: 2.0, c: 9.0, f: 15.0, un: { label: 'octavo', g: 30 } },
  { id: 'aceite', name: 'Aceite de oliva o canola', rol: 'fat', kcal: 884, p: 0, c: 0, f: 100.0, un: { label: 'cucharada', g: 14 } },
  { id: 'mani', name: 'Maní', rol: 'fat', kcal: 567, p: 26.0, c: 16.0, f: 49.0, un: { label: 'puñado', g: 30 } },
  { id: 'almendra', name: 'Almendras', rol: 'fat', kcal: 579, p: 21.0, c: 22.0, f: 50.0, un: { label: 'puñado', g: 30 } },
  { id: 'crema_mani', name: 'Mantequilla de maní', rol: 'fat', kcal: 588, p: 25.0, c: 20.0, f: 50.0, un: { label: 'cucharada', g: 16 } },
  // ── VERDURA (libre: acompañan, no se cuentan al ajustar macros) ──
  { id: 'tomate', name: 'Tomate', rol: 'verd', kcal: 18, p: 0.9, c: 3.9, f: 0.2, un: { label: 'tomate', g: 120 } },
  { id: 'cebolla', name: 'Cebolla', rol: 'verd', kcal: 40, p: 1.1, c: 9.0, f: 0.1, un: { label: 'porción', g: 60 } },
  { id: 'zanahoria', name: 'Zanahoria', rol: 'verd', kcal: 41, p: 0.9, c: 10.0, f: 0.2, un: { label: 'zanahoria', g: 80 } },
  { id: 'espinaca', name: 'Espinaca', rol: 'verd', kcal: 23, p: 2.9, c: 3.6, f: 0.4, un: { label: 'taza', g: 30 } },
  { id: 'brocoli', name: 'Brócoli', rol: 'verd', kcal: 34, p: 2.8, c: 7.0, f: 0.4, un: { label: 'taza', g: 90 } },
  { id: 'habichuela', name: 'Habichuela', rol: 'verd', kcal: 31, p: 1.8, c: 7.0, f: 0.2, un: { label: 'taza', g: 100 } },
  { id: 'pepino', name: 'Pepino', rol: 'verd', kcal: 15, p: 0.7, c: 3.6, f: 0.1, un: { label: 'porción', g: 100 } },
  { id: 'lechuga', name: 'Lechuga', rol: 'verd', kcal: 15, p: 1.4, c: 2.9, f: 0.2, un: { label: 'taza', g: 50 } },
  { id: 'ahuyama', name: 'Ahuyama', rol: 'verd', kcal: 26, p: 1.0, c: 6.5, f: 0.1, un: { label: 'taza', g: 120 } },
  // ── FRUTA ──
  { id: 'banano', name: 'Banano', rol: 'fruta', kcal: 89, p: 1.1, c: 23.0, f: 0.3, un: { label: 'banano', g: 118 } },
  { id: 'mango', name: 'Mango', rol: 'fruta', kcal: 60, p: 0.8, c: 15.0, f: 0.4, un: { label: 'taza', g: 165 } },
  { id: 'papaya', name: 'Papaya', rol: 'fruta', kcal: 43, p: 0.5, c: 11.0, f: 0.3, un: { label: 'taza', g: 145 } },
  { id: 'guayaba', name: 'Guayaba', rol: 'fruta', kcal: 68, p: 2.6, c: 14.0, f: 1.0, un: { label: 'guayaba', g: 90 } },
  { id: 'naranja', name: 'Naranja', rol: 'fruta', kcal: 47, p: 0.9, c: 12.0, f: 0.1, un: { label: 'naranja', g: 130 } },
  { id: 'mandarina', name: 'Mandarina', rol: 'fruta', kcal: 53, p: 0.8, c: 13.0, f: 0.3, un: { label: 'mandarina', g: 90 } },
  { id: 'pina', name: 'Piña', rol: 'fruta', kcal: 50, p: 0.5, c: 13.0, f: 0.1, un: { label: 'taza', g: 165 } },
  { id: 'fresa', name: 'Fresa', rol: 'fruta', kcal: 32, p: 0.7, c: 7.7, f: 0.3, un: { label: 'taza', g: 150 } },
  { id: 'maracuya', name: 'Maracuyá', rol: 'fruta', kcal: 97, p: 2.2, c: 23.0, f: 0.7, un: { label: 'unidad', g: 60 } },
];

// Índice por id, null-proto para que un id raro NO herede del prototipo
// (misma clase de bug que EX_IMG_NAME, hallazgo C4 de la auditoría 2026-07-13).
const NUT_FOOD_BY_ID = NUT_FOODS.reduce((a, f) => { a[f.id] = f; return a; }, Object.create(null));

// ── Tipo de día: el plan de comida se pega al de entreno ────────────────
// 'pierna'  = el día trae trabajo de pierna o full body → el que más carga
// 'entreno' = día de entreno sin pierna
// 'descanso'= sin rutina ese día
// Puro: recibe la rutina del día ya resuelta, no la busca.
function nutDayKind(routine) {
  if (!routine || !(routine.exercises || []).length) return 'descanso';
  const musculos = (routine.exercises || []).map(e => _norm(e.muscle || ''));
  const pierna = musculos.filter(m => m === 'piernas' || m === 'gluteo').length;
  // Full body y día de pierna piden más combustible. Umbral: 2+ ejercicios de
  // tren inferior, o que el nombre del día lo diga.
  const nm = _norm(routine.name || '');
  if (pierna >= 2 || /pierna|full body|inferior/.test(nm)) return 'pierna';
  return 'entreno';
}

// PESOS del carbohidrato por tipo de día. La PROTEÍNA no se toca (va por kg de peso
// y es la que sostiene el músculo) y la GRASA tampoco (mínimo hormonal).
// Son pesos RELATIVOS que después se normalizan: lo que importa es la forma de la
// semana, no el número. Medido 2026-08-01: con un corte del 25% y un extra de pierna
// suelto, a una mujer de 56 kg le salían 467 g de carbohidrato en el día de pierna
// (+45%) — «6 tazas de arroz y 6 papas». Nadie come eso. Con estos pesos el swing
// real queda en −8% / +18%, que es un ciclado que una persona puede sostener.
const NUT_DAY_W = { descanso: 0.85, entreno: 1.00, pierna: 1.10 };

// ── Objetivo del DÍA ────────────────────────────────────────────────────
// 🔴 REGLA QUE NO SE PUEDE ROMPER: el TOTAL DE LA SEMANA no cambia. Lo que se le
// quita al día de descanso se le devuelve a los de entreno, ni un gramo más. Bajar
// el carbohidrato del descanso sin devolverlo dejaría a la persona comiendo menos de
// lo que necesita TODA la semana, en silencio — y en nutrición deportiva el que manda
// es el total semanal, no el día suelto.
// Se consigue NORMALIZANDO: se reparte el presupuesto semanal (7 × carbohidrato base)
// según los pesos de los días que la persona realmente tiene. Por eso hacen falta
// `trainDays` Y `legDays`: sin saber cuántos días son de pierna, el extra de pierna
// se agregaba sin financiar y la semana se pasaba un 5,1% (medido con el caso real).
//
// base = macros de nutritionEstimate · trainDays = días de entreno (1-7) · legDays =
// cuántos de esos son de pierna/full body (0..trainDays).
// Devuelve null si no hay base (faltan peso/talla/edad/sexo) — nunca inventa.
function nutDayTarget(base, kind, trainDays, legDays) {
  if (!base || !base.macros) return null;
  const m = base.macros;
  const d = Math.max(1, Math.min(7, parseInt(trainDays) || 3));
  const L = Math.max(0, Math.min(d, parseInt(legDays) || 0));
  const rest = 7 - d;
  const C = m.carb_g;
  if (!C || kind === undefined || kind === null) {
    return { kind: kind || 'entreno', kcal: m.kcal, prot_g: m.prot_g, fat_g: m.fat_g, carb_g: C || 0 };
  }
  // Suma de pesos de la semana REAL de esta persona → factor que conserva el total.
  const suma = rest * NUT_DAY_W.descanso + (d - L) * NUT_DAY_W.entreno + L * NUT_DAY_W.pierna;
  const k = suma > 0 ? 7 / suma : 1;
  const w = NUT_DAY_W[kind] != null ? NUT_DAY_W[kind] : NUT_DAY_W.entreno;
  let carb = Math.round(C * w * k);
  const kcal = Math.round(m.prot_g * 4 + carb * 4 + m.fat_g * 9);
  return { kind, kcal, prot_g: m.prot_g, fat_g: m.fat_g, carb_g: carb };
}

// Plural en español de una medida casera. Un `+ 's'` a secas escribe «1.5 porcións»
// y «2 papa medianas» — lo lee el asesorado y rompe la barra de tono. Las irregulares
// y las de dos palabras se declaran; el resto sigue la regla (vocal → +s, si no → +es).
const NUT_PLURAL = Object.assign(Object.create(null), {
  'porción': 'porciones',
  'unidad': 'unidades',
  'papa mediana': 'papas medianas',
  'tajada grande': 'tajadas grandes',
});
function _nutPlural(label) {
  const l = String(label || '');
  if (NUT_PLURAL[l]) return NUT_PLURAL[l];
  if (/s$/.test(l)) return l;
  return /[aeiou]$/i.test(l) ? l + 's' : l + 'es';
}
// Cantidad escrita como la serviría una persona: «2 huevos», «1½ tazas», «media
// porción». Los medios van en fracción y no en decimal — «0.5 porción» no es como
// habla nadie. Si el alimento no tiene medida casera, gramos redondeados a 5.
function _nutNumText(rn) {
  if (rn === 0.5) return 'media';
  const ent = Math.floor(rn);
  return rn === ent ? String(ent) : String(ent) + '½';
}
function nutPortionText(food, grams) {
  if (!food || !(grams > 0)) return null;
  const un = food.un;
  if (un && un.g) {
    const n = grams / un.g;
    // Hasta 4 unidades se permite medio; de ahí en adelante, enteras.
    const paso = n <= 4 ? 0.5 : 1;
    const rn = Math.round(n / paso) * paso;
    if (rn >= paso) {
      const label = rn > 1 ? _nutPlural(un.label) : un.label;
      const txt = _nutNumText(rn) + ' ' + label;
      return { n: rn, grams: Math.round(rn * un.g), text: txt + ' (' + Math.round(rn * un.g) + ' g)' };
    }
  }
  const g = Math.max(5, Math.round(grams / 5) * 5);
  return { n: null, grams: g, text: g + ' g' };
}

// ── De macros a COMIDA de verdad ────────────────────────────────────────
// Resuelve una comida en cantidades concretas de comida colombiana.
//
// 🔴 EL ALIMENTO NO ES PURO: el arroz aporta proteína, la carne aporta grasa y el
// aguacate aporta carbohidrato. Un reparto ingenuo —tanta carne para la proteína,
// tanto arroz para el carbohidrato— IGNORA esos aportes cruzados y el plato se pasa.
// Medido 2026-08-01 con las 3 personas reales: los platos salían entre +12% y +17%
// por encima del objetivo, y la proteína de Nataly llegaba a 176 g cuando su meta
// eran 123 g (+43%). Un plan que se pasa un 15% todos los días es un plan que no
// cumple el objetivo, y nadie lo habría notado mirando la pantalla.
//
// Se resuelve por ITERACIÓN de punto fijo: cada pasada recalcula la cantidad de cada
// alimento descontando lo que YA aportan los otros dos. Converge en 2-3 pasadas
// (`NUT_SOLVE_PASSES`); se redondea a medidas caseras sólo AL FINAL, porque redondear
// en cada pasada mete el error del redondeo dentro del bucle y ya no converge.
// Las verduras acompañan y NO se ajustan (aportan poco y nadie pesa la lechuga).
// Puro y determinista: mismos ingredientes + mismos macros = mismo resultado.
const NUT_SOLVE_PASSES = 4;
function nutSolveMeal(target, pick) {
  target = target || {};
  const prot = NUT_FOOD_BY_ID[pick && pick.prot] || null;
  const carb = NUT_FOOD_BY_ID[pick && pick.carb] || null;
  const fat = NUT_FOOD_BY_ID[pick && pick.fat] || null;
  const tP = target.prot_g > 0 ? target.prot_g : 0;
  const tC = target.carb_g > 0 ? target.carb_g : 0;
  const tF = target.fat_g > 0 ? target.fat_g : 0;
  // gramos de cada alimento, en crudo (sin redondear) durante la iteración
  let gP = 0, gC = 0, gF = 0;
  const ap = (food, g, macro) => (food ? food[macro] * g / 100 : 0);
  for (let i = 0; i < NUT_SOLVE_PASSES; i++) {
    // proteína: la que falta después de la que traen el carbohidrato y la grasa
    if (prot && prot.p > 0 && tP > 0) {
      gP = Math.max(0, (tP - ap(carb, gC, 'p') - ap(fat, gF, 'p')) / prot.p * 100);
    }
    // carbohidrato: descontando el que traen la proteína y la grasa
    if (carb && carb.c > 0 && tC > 0) {
      gC = Math.max(0, (tC - ap(prot, gP, 'c') - ap(fat, gF, 'c')) / carb.c * 100);
    }
    // grasa: descontando la que traen la proteína y el carbohidrato
    if (fat && fat.f > 0 && tF > 0) {
      gF = Math.max(0, (tF - ap(prot, gP, 'f') - ap(carb, gC, 'f')) / fat.f * 100);
    }
  }
  const items = [];
  let gotP = 0, gotC = 0, gotF = 0;
  const poner = (food, g, rol) => {
    if (!food || !(g > 0)) return;
    const por = nutPortionText(food, g);
    if (!por) return;
    items.push({ id: food.id, name: food.name, rol, grams: por.grams, text: por.text });
    gotP += food.p * por.grams / 100; gotC += food.c * por.grams / 100; gotF += food.f * por.grams / 100;
  };
  poner(prot, gP, 'prot');
  poner(carb, gC, 'carb');
  poner(fat, gF, 'fat');
  return {
    items,
    real: { prot_g: Math.round(gotP), carb_g: Math.round(gotC), fat_g: Math.round(gotF), kcal: Math.round(gotP * 4 + gotC * 4 + gotF * 9) },
  };
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

// ── Snapshot de constancia para la COMUNIDAD (idea #5, C2) — PURA, fuente de verdad ──
// Destila el historial/prs/plan de un usuario en las 5 cifras públicas que ven sus amigos:
// racha de semanas, días entrenados en las últimas 4 semanas, nivel, nº de logros y si entrenó
// hoy. Reusa weekStreak/gxLevel/planDays/localDayStart (ya testeadas). La lógica de logros calca
// las 8 medallas de renderGamification (app-4). **La edge function `refresh_snapshot` la PORTA a
// TS y la corre server-side (decisión #7): el cliente NO puede inflar estos números.** Nota TZ:
// aquí usa la zona local (= Colombia en los dispositivos reales); la edge la fija a America/Bogota.
function communitySnapshot(client, sessions, prs, now) {
  const hist = sessions || [];
  const total = hist.length;
  const totalVol = hist.reduce((s, h) => s + ((h && h.totalVol) || 0), 0);
  const lvl = gxLevel(total).cur.n;
  const prsCount = prs ? Object.keys(prs).length : 0;
  const streakWeeks = weekStreak(hist, streakTarget(client), now).weeks;
  const today = localDayStart(now || new Date());
  const cutoff = today - 27 * 86400000; // hoy + 27 días previos = ventana de 4 semanas
  const days4w = new Set();
  let trainedToday = false;
  let minDay = null; // #5: día de la PRIMERA sesión válida (antigüedad) — ignora fechas ilegibles
  hist.forEach(h => {
    const raw = h && h.date;
    if (raw == null || raw === '') return; // OJO: new Date(null) === epoch (1970), NO NaN — hay que atajarlo
    const d = new Date(raw); if (isNaN(d.getTime())) return;
    const ds = localDayStart(d);
    if (ds >= cutoff) days4w.add(ds);
    if (ds === today) trainedToday = true;
    if (minDay === null || ds < minDay) minDay = ds;
  });
  // Las 8 medallas de renderGamification (app-4): PR, 10/30 entrenos, 10k/20k/50k kg, nivel 3/4.
  const badges = [prsCount >= 1, total >= 10, total >= 30, totalVol >= 10000, totalVol >= 50000, totalVol >= 20000, lvl >= 3, lvl >= 4];
  return {
    streak_weeks: streakWeeks,
    sessions_4w: days4w.size,
    level: lvl,
    achievements: badges.filter(Boolean).length,
    trained_today: trainedToday,
    // #5 perfil rico (agregados seguros, mismo régimen server-side que streak/level):
    total_sessions: total,                                 // Nº de entrenos del historial
    training_since: minDay === null ? null : _ymdLocal(minDay), // 'YYYY-MM-DD' del primer entreno, o null
  };
}

// 'YYYY-MM-DD' del día de calendario LOCAL de un timestamp ya anclado a medianoche
// (localDayStart). La edge produce el equivalente en Bogota; en un dispositivo colombiano
// (UTC-5) coinciden — la paridad se prueba en c2_parity_snapshot.cjs.
function _ymdLocal(ts) {
  const x = new Date(ts);
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return x.getFullYear() + '-' + mm + '-' + dd;
}

// #5 — FRASE de antigüedad para el perfil: «Entrena desde marzo de 2026». Pinta MES y AÑO,
// nunca el día exacto (patrón «etiqueta redondeada» de ②: menos precisión = menos patrón
// reconstruible). Pura y fail-visible-nada: fecha faltante/ilegible/FUTURA → null (el caller
// omite la frase; jamás «desde Invalid Date» — clase «Hace -1d»/«Infinity días»).
const CMTY_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function communityTrainingSinceText(dateStr, now) {
  if (typeof dateStr !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (isNaN(dt.getTime()) || dt.getMonth() !== mo - 1) return null; // '2026-02-31' → normaliza a marzo → rechazo
  const nTs = (typeof now === 'number') ? now : +new Date(now || Date.now());
  if (isNaN(nTs) || dt.getTime() > nTs) return null; // futura → nada (no se inventa una fecha por venir)
  return 'Entrena desde ' + CMTY_MESES[mo - 1] + ' de ' + y;
}

// ══════════════════════════════════════════════════════════════════════
// COMUNIDAD C3 — helpers PUROS de la UI del asesorado (Fase 1)
// ──────────────────────────────────────────────────────────────────────
// Deterministas, sin DOM/localStorage. La capa CMTY (app-N) delega en estos.
// El snapshot lo calcula el SERVIDOR (edge refresh_snapshot, decisión #7); aquí
// solo va la lógica de presentación/validación del cliente.

// Debounce del refresh del snapshot: la edge NO tiene rate-limit propio (requisito 🟢 de
// la auditoría C2) → el cliente no la invoca más de una vez cada 30 min.
const CMTY_REFRESH_MIN_MS = 30 * 60 * 1000;
// Un snapshot con más de 48 h se marca "puede estar desactualizado".
const CMTY_STALE_MS = 48 * 3600 * 1000;
// Prefijo público del bucket 'avatars' del proyecto (espejo del CHECK cp_avatar_url_bucket en DB):
// defensa DOBLE — antes de pintar un <img> con avatar de OTRO usuario, se exige este prefijo.
const CMTY_AVATAR_PREFIX = 'https://eoebhrxbokyllqalyecj.supabase.co/storage/v1/object/public/avatars/';

// Handle válido: 1-30 chars tras recortar (espejo del CHECK char_length(handle) between 1 and 30).
function cmtyHandleValid(h) {
  if (typeof h !== 'string') return false;
  const t = h.trim();
  return t.length >= 1 && t.length <= 30;
}

// Normaliza un código pegado por el usuario: mayúsculas, solo [A-Z0-9] (el share_code es
// 10 hex-upper). Tolera espacios/guiones/minúsculas que el usuario copie de más.
function cmtyCodeNormalize(s) {
  if (typeof s !== 'string') return '';
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ¿Toca refrescar el snapshot? true si nunca (lastTs falsy/no numérico) o pasó el debounce.
function cmtyShouldRefresh(lastTs, now) {
  const n = (typeof now === 'number') ? now : +new Date(now || Date.now());
  const last = Number(lastTs);
  if (!last || isNaN(last)) return true;
  return (n - last) >= CMTY_REFRESH_MIN_MS;
}

// Frescura del snapshot para el aviso "desactualizado". snapshotAt = ISO string, ms o Date.
function cmtyFreshness(snapshotAt, now) {
  const n = (typeof now === 'number') ? now : +new Date(now || Date.now());
  const t = snapshotAt ? +new Date(snapshotAt) : NaN;
  if (isNaN(t)) return { fresh: false, daysOld: null };
  const age = n - t;
  return { fresh: age < CMTY_STALE_MS, daysOld: Math.floor(age / 86400000) };
}

// ¿Es un avatar seguro de pintar? Solo si es una URL del bucket propio (no externa).
// null/vacío/externa → false → el caller cae a iniciales.
function cmtyAvatarOk(url) {
  return typeof url === 'string' && url.indexOf(CMTY_AVATAR_PREFIX) === 0;
}

// Iniciales para el avatar sin foto: 1-2 letras del handle, mayúsculas.
function cmtyInitials(handle) {
  if (typeof handle !== 'string') return '?';
  const words = handle.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ④ FEED — mapea una rutina propia al payload ALLOW-LIST que acepta `community_posts`
// (trigger _community_post_validate): SOLO {name, days, exercises:[{name,muscle,sets,reps,type}]}.
// TODO lo demás (note/desc/imgUrl/icon/id/kg/peso/salud…) se DESCARTA aquí — nunca sale del
// dispositivo. Pura y determinista: sin DOM, sin localStorage. Caps espejo del trigger.
function communityPostPayload(routine) {
  routine = routine || {};
  const out = { name: String(routine.name || 'Mi rutina').slice(0, 80) };
  const day = routine.day;
  if (day != null && String(day) !== '') out.days = String(day).slice(0, 60);
  const exs = Array.isArray(routine.exercises) ? routine.exercises : [];
  out.exercises = exs.slice(0, 40).map(function (e) {
    e = e || {};
    const o = { name: String(e.name || 'Ejercicio').slice(0, 80) };
    if (e.muscle != null && String(e.muscle) !== '') o.muscle = String(e.muscle).slice(0, 40);
    if (e.type != null && String(e.type) !== '') o.type = String(e.type).slice(0, 20);
    if (e.sets != null && String(e.sets) !== '') o.sets = String(e.sets).slice(0, 20);
    if (e.reps != null && String(e.reps) !== '') o.reps = String(e.reps).slice(0, 20);
    return o;
  });
  return out;
}

// #6 PR PILOTO — mapea un récord de PESO YA REGISTRADO al payload allow-list `{exercise_name,
// value_kg}` que acepta `community_posts` (rama 'pr' del trigger, c18). ANTI-CHEAT DE UX, honesto:
// el valor NO se teclea, se LEE de una entrada de `ax_pr` del usuario (`DB.prs[cid][key]`), así que
// no puedes publicar un récord que nunca registraste entrenando. Es un candado de UX, NO de servidor
// (el trigger no puede leer user_data sin abrir superficie) — declarado como tal (§8-BIS.3), mismo
// patrón que el allow-list de nombres de rutina. SOLO récords de PESO (unit 'kg'): un PR de reps/seg/
// rondas → null (no es «Sentadilla 100 kg»). Caps espejo del trigger: nombre 1-80, value en (0,1000].
function communityPrPayload(prEntry) {
  const p = prEntry || {};
  if (p.unit !== 'kg') return null;                 // solo récords de peso
  const name = String(p.name || '').trim();
  if (!name) return null;
  const v = Number(p.val != null ? p.val : p.kg);
  if (!isFinite(v) || v <= 0 || v > 1000) return null;
  return { exercise_name: name.slice(0, 80), value_kg: v };
}

// LEAD «quiere coach» — ¿sigue PENDIENTE de atender?
// El flag `wantsCoach` vive en la fila del ASESORADO (su propio dispositivo la sincroniza), así
// que NO sirve como estado de "ya lo atendí": el coach lo apaga y el celular del asesorado puede
// volver a subirlo (misma clase que el hallazgo F7: jamás decidir con un campo que el cliente
// escribe). Por eso el "atendido" vive en `ax_leadsdone`, que SOLO escribe el coach.
//   leadsDone = { [clientId]: ISO de cuando el coach lo atendió }
// Si el asesorado vuelve a pedir coach DESPUÉS de esa fecha, reaparece (una solicitud nueva es
// una solicitud nueva). Marca corrupta/ilegible → se muestra: perder un lead cuesta plata,
// mostrar uno de más solo cuesta un toque.
function leadPending(client, leadsDone) {
  const c = client || {};
  if (!c.wantsCoach) return false;
  const done = (leadsDone || {})[c.id];
  if (done == null) return true;                       // nunca atendido → pendiente
  const doneTs = Date.parse(done);
  if (!isFinite(doneTs)) return true;                  // marca ilegible → fail-visible
  const askTs = c.wantsCoachAt != null ? Date.parse(c.wantsCoachAt) : NaN;
  if (!isFinite(askTs)) return false;                  // pidió sin fecha y ya fue atendido → resuelto
  return askTs > doneTs;                               // volvió a pedir después de atenderlo
}

// ④/v3-a — mapea una SESIÓN TERMINADA al payload allow-list de un post `kind='workout'`
// (trigger `_community_post_validate` rama workout): SOLO {name, duration_min?, exercises_count, note?}.
// PURA y determinista. Devuelve null si la sesión NO está finalizada (clase v367: una parcial en
// curso jamás se publica) o no tiene nombre. TODO lo demás (kilos, series, salud, ids) se DESCARTA
// aquí — nunca sale del dispositivo. Clamps espejo EXACTO del trigger (name 80 · dur 1-600 · exs 1-60
// · note 140). `duration_min` solo si startedAt/finishedAt dan 1-600 min (sesión legacy sin startedAt
// sano → se OMITE, la tarjeta no pinta el chip). La RACHA NO va aquí: la tarjeta la lee del perfil
// server-side del autor (un solo origen de verdad, cero falsificación).
function communityWorkoutPayload(session, routineName, note) {
  const s = session || {};
  if (!sessionFinished(s)) return null;
  const nm = String(routineName || s.routineName || '').trim();
  if (!nm) return null;
  const exs = Array.isArray(s.exercises) ? s.exercises : [];
  // ejercicios con al menos una serie hecha; si ninguno lo marca pero la sesión finalizó, cuenta los presentes
  let count = exs.filter(function (e) {
    return e && Array.isArray(e.sets) && e.sets.some(function (st) { return st && st.done; });
  }).length;
  if (count === 0) count = exs.length;
  if (count < 1) return null;                 // sin ejercicios no hay entreno que compartir
  const out = { name: nm.slice(0, 80), exercises_count: Math.min(60, count) };
  const st = +new Date(s.startedAt), fi = +new Date(s.finishedAt || s.date);
  if (isFinite(st) && isFinite(fi) && fi > st) {
    const mins = Math.round((fi - st) / 60000);
    if (mins >= 1 && mins <= 600) out.duration_min = mins;
  }
  if (note != null) {
    const t = String(note).trim();
    if (t.length >= 1 && t.length <= 140) out.note = t;
  }
  return out;
}

// R2 (re-forma) — TEXTO de una tarjeta de HITO del muro. Puro: recibe el kind y el payload que
// EMITIÓ EL SERVIDOR (la edge `refresh_snapshot`; el cliente no puede insertarlos — candado
// `cpost_ins`) y devuelve `{text, emoji}` en voz de AVI, o null si el hito no es reconocible
// (nunca una tarjeta rota: el caller no pinta). `mine` cambia la persona gramatical.
// Solo dos tipos en v1: racha de semanas y subida de nivel. El «récord personal» quedó FUERA
// a propósito (Fable §R2(c)): el peso es autoreportado y no se celebra un número autoafirmado.
function communityMilestoneText(kind, payload, mine) {
  const p = payload || {};
  if (kind === 'streak') {
    const w = Math.floor(Number(p.weeks));
    if (!isFinite(w) || w <= 0) return null;
    const semanas = w === 1 ? '1 semana seguida' : w + ' semanas seguidas';
    return { emoji: '🔥', text: (mine ? 'Cumpliste ' : 'Cumplió ') + semanas + ' entrenando' };
  }
  if (kind === 'level') {
    const l = Math.floor(Number(p.level));
    if (!isFinite(l) || l <= 0) return null;
    return { emoji: '⭐', text: (mine ? 'Subiste al nivel ' : 'Subió al nivel ') + l };
  }
  return null;
}

// ADOPCIÓN A4 — PEDIR EL OPT-IN DE LOGROS EN EL MOMENTO DEL HITO. Hasta hoy `show_milestones`
// vivía como un interruptor en Ajustes de Comunidad: quien nunca entra a Ajustes nunca lo
// enciende, y su constancia no se celebra nunca. Se pregunta cuando el logro acaba de pasar.
// ESPEJO EXACTO de STREAK_MILESTONES en la edge `refresh_snapshot` (decisión del PO 2026-07-22).
// Si estos números cambian, cambian en los DOS lados o la app promete un hito que el servidor
// no emite.
const STREAK_MILESTONES = [2, 4, 8, 12, 24, 52];
// El umbral más alto que YA ostenta con esa racha (no el que cruzó ahora): es lo que el servidor
// publicaría si el usuario dice que sí. PURA. null si aún no llega a ninguno.
function highestStreakMilestone(weeks) {
  const w = Math.floor(Number(weeks));
  if (!isFinite(w) || w <= 0) return null;
  let hit = null;
  STREAK_MILESTONES.forEach(m => { if (w >= m) hit = m; });
  return hit;
}
// ¿Le preguntamos AHORA? PURA. Candados:
//   1. sin perfil de comunidad no hay nada que celebrar (ni dónde publicarlo).
//   2. si ya dijo que sí (`show_milestones === true`), no se vuelve a preguntar. Nunca.
//   3. tiene que haber un umbral alcanzado de verdad.
//   4. una sola pregunta por umbral: si dijo «ahora no» en las 4 semanas, no se le repite hasta
//      las 8. `asked` es el mapa local {umbral: true} — vive en el dispositivo, como los mutes.
// F12 (2026-07-26): `asked[umbral]` ya no es solo `true`/ausente. Ahora también puede ser un
// NÚMERO = cuántas veces se mostró sin que el usuario tocara nada. Ignorar es una respuesta:
// a la tercera, ese umbral se calla. Antes, cerrar la pantalla dejaba la tarjeta reapareciendo en
// CADA entreno hasta el umbral siguiente — y en las 52 semanas, para siempre (R1.6).
const MILESTONE_ASK_MAX_SHOWS = 3;
function milestoneAskEligible(profile, weeks, asked) {
  if (!profile) return null;
  if (profile.show_milestones === true) return null;
  const m = highestStreakMilestone(weeks);
  if (m === null) return null;
  const seen = asked ? asked[m] : null;
  if (seen === true) return null;                              // ya dijo sí o no
  if (Number(seen) >= MILESTONE_ASK_MAX_SHOWS) return null;    // la ignoró tres veces = no
  return m;
}

// v3-a #4 — TEXTO de un comentario, saneado. Espejo EXACTO del CHECK de la tabla
// (`char_length between 1 and 280 and btrim(text) <> ''`, c16): recorta los extremos, corta a
// 280 y devuelve null cuando no queda nada que publicar. Puro: la UI no decide, solo delega —
// y así el cliente NUNCA manda un insert que el servidor va a rebotar por longitud o por vacío.
// El candado REAL de quién puede comentar vive en la RLS (_can_comment), no aquí.
function communityCommentText(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  return t.slice(0, 280).trim() || null;
}

// P0 (2026-07-25) — NOMBRE de una clave local de comunidad, SIEMPRE atada a su dueño.
// El bug que reportó el PO («en el perfil de Astrid aparecía el mío») tenía dos vías: el objeto
// CMTY en memoria y las claves de disco GLOBALES del dispositivo (`ax_cmty_cache`,
// `ax_cmty_probe`, `ax_cmtynudge`, `ax_cmty_refresh`), que guardan apodos y caras de OTRAS
// personas y sobrevivían al cambio de cuenta. Una clave con datos ajenos sin uid en el nombre es
// un cruce de identidades esperando ocurrir: la 2ª cuenta lee lo de la 1ª.
// PURA. Sin uid devuelve null = «no sé de quién sería esto» → el llamador NI lee NI escribe.
// Callar es correcto: mejor la tarjeta sin datos que la tarjeta con los datos del anterior.
function cmtyLocalKey(base, uid) {
  if (typeof base !== 'string' || !base) return null;
  if (typeof uid !== 'string' || !uid) return null;
  return base + '_' + uid;
}

// R3 (re-forma) — ESTADO VACÍO ÚNICO del muro. Antes se apilaban dos vacíos («tu muro está
// tranquilo» + «aún no tienes amigos aquí») que decían lo mismo dos veces y ninguno resolvía
// el caso real: no tener a NADIE todavía. Esta función decide cuál (y solo uno) corresponde:
//   'none'   → hay publicaciones: se pinta el muro, ningún vacío
//   'quiet'  → ya tiene gente conectada, pero nadie ha publicado todavía → empuja a PUBLICAR
//   'lonely' → todavía no tiene a nadie (ni amigos, ni gym, ni seguidos, ni solicitudes) →
//              empuja a CONECTAR, que es lo único que destraba el muro
// Pura y defensiva: valores raros (null/NaN/negativos/strings) cuentan como 0.
// ⚠️ `discover` (perfiles PÚBLICOS de desconocidos) NO cuenta como gente — RESERVA de Fable
// (§veredicto R3, 2026-07-22): ver desconocidos en «Descubrir» no es tener una relación, y
// contarlos empujaba a PUBLICAR a alguien cuyo post no vería nadie. Es 'lonely' → conectar.
function communityEmptyState(counts) {
  const c = counts || {};
  const n = v => { const x = Number(v); return (isFinite(x) && x > 0) ? x : 0; };
  if (n(c.posts) > 0) return 'none';
  const people = n(c.friends) + n(c.gym) + n(c.following) +
    n(c.incoming) + n(c.outgoing) + n(c.followerReqs);
  return people > 0 ? 'quiet' : 'lonely';
}

// ADOPCIÓN A1 — PRUEBA SOCIAL de la pantalla de bienvenida. Dato real 2026-07-25: 23 personas
// en el directorio del gym, 6 con perfil → 17 nunca pasaron del opt-in, que hasta hoy era un
// explicador de privacidad SIN una sola cara conocida. Los referentes (Strava/Hevy) ponen
// primero a la gente que ya conoces y la política después. Esta función arma esa línea.
// Pura: recibe los perfiles que la RLS ya deja ver (sin perfil propio eso es exactamente el
// directorio del gym + los públicos) y devuelve `null` cuando no hay a quién nombrar.
//   scope 'gym' → los que el SERVIDOR dice que son del gym (`p.gym === true`).
//   scope 'avi' → no hay nadie del gym todavía; se nombra a los públicos sin mentir el origen.
// Orden alfabético estable a propósito: el mismo repintado no puede barajar los nombres.
//
// F3 (2026-07-26): antes la pertenencia se deducía de `is_private === true` («si lo veo y es
// privado solo puede ser del gym»). Es cierto en un sentido pero NO en el otro: un compañero que
// se hace PÚBLICO (c11_activate_public) deja de contarse. Con datos reales de prod eso escondía
// justo al COACH —el único perfil público del gym— y con 5 públicos + 1 privado la línea decía
// «Zulma de tu gym ya está aquí», en singular, escondiendo a cinco. Ahora la señal la pone el
// llamador con la RPC `cmty_gym_peers` (la misma que usa la RLS); si esa consulta no responde, el
// llamador cae al proxy viejo, que subcuenta pero nunca miente. Esta función ya no adivina.
const CMTY_PEERS_NAMES = 2; // cuántos nombres se dicen antes del «y N más»
function communityPeersLine(profiles, opts) {
  // F9: la lista viene de una clave de localStorage; si está corrupta (un string, un objeto) el
  // `.filter` de abajo LANZA, y esto se pinta en «Hoy» ANTES del entreno → pantalla sin entreno.
  // Un dato podrido de la comunidad no puede tumbar lo único que la app tiene que hacer siempre.
  if (profiles != null && !Array.isArray(profiles)) return null;
  const max = (opts && Number(opts.max) > 0) ? Math.floor(opts.max) : CMTY_PEERS_NAMES;
  const clean = (profiles || [])
    .filter(p => p && typeof p.handle === 'string' && p.handle.trim())
    .map(p => ({ handle: p.handle.trim(), gym: p.gym === true, prof: p }));
  const gym = clean.filter(p => p.gym);
  const pool = gym.length ? gym : clean;
  if (!pool.length) return null;
  const sorted = pool.slice().sort((a, b) => {
    const x = a.handle.toLowerCase(), y = b.handle.toLowerCase();
    return x < y ? -1 : (x > y ? 1 : 0);
  });
  const picked = sorted.slice(0, max);
  const names = picked.map(p => p.handle);
  const total = sorted.length;
  const extra = total - names.length;
  const parts = extra > 0 ? names.concat([extra + ' más']) : names.slice();
  const joined = parts.length > 1
    ? parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1]
    : parts[0];
  const scope = gym.length ? 'gym' : 'avi';
  const verb = total === 1 ? 'ya está' : 'ya están';
  const text = scope === 'gym'
    ? joined + ' de tu gym ' + verb + ' aquí'
    : joined + ' ' + verb + ' en AVI';
  // `picked` devuelve los perfiles ORIGINALES (no copias) para que la UI pinte sus avatares
  // sin repetir aquí el filtrado/orden — una sola fuente de verdad para nombres y caras.
  return { scope: scope, names: names, picked: picked.map(p => p.prof), extra: extra, total: total, text: text };
}

// ADOPCIÓN A2 — LA PUERTA. La prueba social de A1 solo la ve quien ya ABRIÓ la pestaña Comunidad;
// las 17 personas sin perfil no tienen motivo para abrirla. Esta es la invitación desde «Hoy»,
// que es la pantalla que sí visitan a diario. Mismo molde que `shareBannerEligible` (v370): pedir
// algo SOLO después de que la app ya le dio valor, y posponer de verdad al descartar.
// PURA. `probe` = sonda cacheada (¿tengo perfil? ¿a cuánta gente vería?) que arma la capa de red.
// Cuatro candados, en este orden:
//   1. sonda ausente/indecisa → NO (nunca invitar a ciegas: sin saber si ya tiene perfil, callar).
//   2. ya tiene perfil → NO, jamás. El objetivo es activar a quien no está, no molestar a quien sí.
//   3. cero personas visibles → NO. Es la misma lección de la reserva de Fable en R3: no empujar a
//      alguien a un cuarto vacío. Sin gente, la invitación es una promesa que la pestaña no cumple.
//   4. poco entreno / silenciada hace poco → NO.
const CMTY_NUDGE_MIN_SESSIONS = 3;   // espejo de SHARE_MIN_SESSIONS: primero valor, después el pedido
const CMTY_NUDGE_SNOOZE_DAYS = 30;
const CMTY_NUDGE_PROBE_TTL_H = 24;   // la sonda pega a la red 1×/día, no en cada render de «Hoy»
function communityNudgeEligible(sessions, now, snoozeUntil, probe) {
  if (!probe || probe.hasProfile !== false) return false;   // 1 y 2
  if (!(Number(probe.peers) > 0)) return false;             // 3
  const t = +new Date(now == null ? Date.now() : now);
  if (snoozeUntil && t < +snoozeUntil) return false;
  let finished = 0;
  (sessions || []).forEach(s => { if (sessionFinished(s)) finished++; });
  return finished >= CMTY_NUDGE_MIN_SESSIONS;
}
// ¿Toca volver a preguntarle al servidor? PURA. Sin sonda o con fecha ilegible → sí (y como
// `communityNudgeEligible` exige sonda, mientras tanto la tarjeta simplemente no se pinta).
// Ojo `new Date(null)` = epoch, no NaN (gotcha de `training_since`) → se ataja el null antes.
function communityProbeStale(probe, now, ttlHours) {
  if (!probe || probe.at == null || probe.at === '') return true;
  const at = +new Date(probe.at);
  if (isNaN(at)) return true;
  const ttl = (Number(ttlHours) > 0 ? Number(ttlHours) : CMTY_NUDGE_PROBE_TTL_H) * 3600000;
  return (+new Date(now == null ? Date.now() : now)) - at >= ttl;
}

// ══════════ PRIMERA SESIÓN (estudio de interfaz, variante C elegida por el PO 2026-07-26) ══════════
// Dato que lo motiva: de las 23 personas del gimnasio, **8 tienen rutina asignada y NUNCA
// completaron un entreno**. Abrieron la app, vieron el plan y no terminaron ni uno. El día 1, «Hoy»
// muestra primero lo que sirve a quien YA entrena (ánimo, hábitos, racha, comunidad) y deja bajo el
// pliegue lo único que le importa a quien nunca entrenó: qué hace hoy y cómo empieza.
//
// PURA. `true` SOLO si no hay NI UNA sesión registrada — ni siquiera parcial. Esa dureza es
// deliberada y es el candado anti-v367: el auto-guardado de la 1ª serie ya deja una sesión sin
// `finishedAt`, así que en cuanto alguien EMPIEZA su primer entreno esto devuelve false y la
// portada desaparece. Jamás puede taparle el entreno a alguien que está entrenando.
function firstSessionMode(sessions) {
  if (!Array.isArray(sessions)) return false;   // dato ilegible → conducta de siempre
  return sessions.length === 0;
}

// Estimación honesta de cuánto dura una rutina, en minutos. PURA. `null` si no se puede calcular
// (sin ejercicios, sin series legibles) → la UI omite el dato en vez de inventar un número: decirle
// «~35 min» a alguien que va a tardar 70 quema la confianza en el primer día, que es justo lo que
// se está intentando ganar. Series × (trabajo + descanso), con el descanso real de la rutina.
const SET_WORK_SECONDS = 45;   // una serie de fuerza típica, de pie a última repetición
function estimateWorkoutMinutes(routine) {
  const exs = (routine && routine.exercises) || [];
  if (!exs.length) return null;
  const rest = Number(routine.restSec) > 0 ? Number(routine.restSec) : 90;
  let sets = 0;
  exs.forEach(e => { const n = Number(e && e.sets); if (isFinite(n) && n > 0) sets += Math.min(n, 20); });
  if (!sets) return null;
  const mins = Math.round((sets * (SET_WORK_SECONDS + rest)) / 60);
  return mins > 0 ? mins : null;
}

// F2 (2026-07-26) — ¿QUIÉN SOY en la comunidad, sin haber abierto la pestaña?
// A4 preguntaba por los logros solo si `CMTY.profile` estaba cargado, y eso exige haber entrado a
// Comunidad en ESA MISMA carga (`renderCommunity` tiene un solo llamador). En la sesión típica
// —abrir, entrenar, cerrar— el perfil era null y la pregunta NO se pintaba nunca: la ironía de una
// feature que nació justo porque «quien no entra a Ajustes nunca lo enciende». Lo mismo tapaba
// «Compártelo con tu gente» y, peor, el refresco del snapshot al terminar el entreno (sin él el
// servidor nunca recalcula la racha de quien no abre la pestaña → sus logros no se emiten jamás).
// PURA. Fuentes de más fresca a menos: perfil cargado → sonda de A2 (1×/día desde «Hoy») → caché
// de la última vez que se abrió la pestaña en este aparato.
// Devuelve null cuando NINGUNA fuente sabe: no se pregunta a ciegas (mismo candado que A2).
function communityMe(profile, probe, cache) {
  if (profile && typeof profile === 'object') return profile;
  if (probe && probe.hasProfile === false) return null;   // la sonda SABE que no hay perfil
  if (probe && probe.hasProfile === true && typeof probe.showMilestones === 'boolean') {
    return { show_milestones: probe.showMilestones };
  }
  // Sonda vieja (sin el campo) o ausente → la caché de disco, que sí trae el perfil completo.
  const cp = cache && cache.profile;
  if (cp && typeof cp === 'object') return cp;
  return null;
}

// ADOPCIÓN A3 — EL COACH INVITA. A1 y A2 trabajan sobre quien ya abre la app; el canal que de
// verdad mueve a la gente del gym es Camilo escribiéndoles (misma lección de v364: el chat interno
// solo alcanza a quien ya entra, WhatsApp alcanza a quien no). Estas dos funciones son PURAS.
//
// Cuántos de mi gym ya activaron su perfil. `memberIds` = mi directorio (community_gym_members),
// `profileIds` = los que tienen fila en community_profiles Y me son visibles. Deduplica y solo
// cuenta como activo a quien esté en AMBAS listas: un perfil que no es de mi gym no infla la cifra.
// F5 (2026-07-26): `pending` NO es cuántos puede invitar. El modal decía «A los otros N puedes
// invitarlos desde esta lista» contando al PROPIO COACH (su fila nunca lleva botón) y a miembros
// que ya no están en `DB.clients` (archivados: no tienen fila en la lista) → podía decir «al que
// falta» con CERO botones en pantalla. `listedIds` = los que la lista realmente ofrece invitar;
// cuando se pasa, `invitable` es la cifra honesta para esa frase. Sin él, se comporta como antes.
function communityGymAdoption(memberIds, profileIds, listedIds) {
  const members = new Set((memberIds || []).filter(x => typeof x === 'string' && x));
  const withProf = new Set((profileIds || []).filter(x => typeof x === 'string' && x));
  let active = 0;
  members.forEach(id => { if (withProf.has(id)) active++; });
  const total = members.size;
  const out = { total: total, active: active, pending: total - active };
  if (listedIds != null) {
    const listed = new Set((listedIds || []).filter(x => typeof x === 'string' && x));
    let invitable = 0;
    members.forEach(id => { if (!withProf.has(id) && listed.has(id)) invitable++; });
    out.invitable = invitable;
  }
  return out;
}

// F5 — la SEGUNDA frase del modal («…y a los otros los invitas desde esta lista»). Pura, porque
// tiene cuatro casos con significados distintos y ninguno puede mentirle al coach:
//   · hay a quién invitar        → se dice cuántos (los que TIENEN botón en pantalla)
//   · no falta nadie             → celebración
//   · el único que falta es ÉL   → no se invita a sí mismo; se le dice dónde crear su perfil
//   · faltan, pero fuera de la lista (asesorados archivados) → se dice que desde aquí no se puede
// `opts.coachPending` = el coach está en su propio gym y todavía no tiene perfil de comunidad.
function communityGymHint(adoption, opts) {
  const a = adoption || {}, o = opts || {};
  const invitable = Number(a.invitable) > 0 ? Number(a.invitable) : 0;
  const pending = Number(a.pending) > 0 ? Number(a.pending) : 0;
  if (invitable === 1) return 'Al que falta puedes invitarlo por WhatsApp desde esta lista.';
  if (invitable > 1) return 'A los otros ' + invitable + ' puedes invitarlos por WhatsApp desde esta lista.';
  if (pending === 0) return 'Tu comunidad está completa 🎉';
  const fuera = pending - (o.coachPending ? 1 : 0);
  if (fuera <= 0) return 'El que falta eres tú: crea tu perfil desde «Mi entrenamiento» → Comunidad.';
  if (fuera === 1) return 'A quien falta no puedes invitarlo desde aquí: ya no está en tu lista de asesorados.';
  return 'A los ' + fuera + ' que faltan no puedes invitarlos desde aquí: ya no están en tu lista de asesorados.';
}

// El mensaje de invitación. Se manda por WhatsApp, así que es TEXTO PLANO (nada de HTML) y lo
// revisa el coach antes de enviarlo — AVI nunca escribe sola a un asesorado.
// El texto dice la verdad de lo que se verá (apodo + constancia) y de lo que NO (peso/fotos/kilos),
// que es exactamente la corrección de copy que salió en A1: el gym también te ve.
const CMTY_INVITE_URL = 'https://kronos-apex.github.io/apex-app/';
function communityInviteMsg(name, peers, url) {
  const first = (typeof name === 'string' ? name.trim().split(/\s+/)[0] : '') || '';
  const saludo = first ? 'Hola ' + first + ' 👋' : '¡Hola! 👋';
  const n = Number(peers);
  const cuantos = (n > 0)
    ? (n === 1 ? ' Ya hay alguien del gym en la comunidad de AVI.' : ' Ya somos ' + n + ' del gym en la comunidad de AVI.')
    : ' Abrimos la comunidad del gym en AVI.';
  return saludo + cuantos +
    ' Puedes ver en qué van tus compañeros y darles ánimo.' +
    ' Se ve tu apodo y tu constancia — nunca tu peso, tus fotos ni tus kilos.' +
    ' Si te suena, entra a AVI y toca la pestaña Comunidad: ' +
    ((typeof url === 'string' && url) ? url : CMTY_INVITE_URL);
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
// COACH INTELIGENTE — motor de insights proactivos (Capa B, v352)
// ──────────────────────────────────────────────────────────────────────
// Función PURA: recibe `now` SIEMPRE (jamás Date.now() adentro), sin DOM, sin
// localStorage, sin DB. Devuelve el insight de MAYOR prioridad NO silenciado, o
// null. Reglas deterministas (docs/plan-coach-inteligente §11.E3). Voz AVI cálida.
// sessions = DB.history[cid] (nuevo→viejo) · prs = DB.prs[cid] (mapa key→{val,unit,reps,date,name,…})
// opts = { isFree:bool, muted:{tipo: ts_hasta_ms} }. Umbrales como constantes para ajuste fácil.
const INSIGHT_INACTIVE_DAYS = 4;   // días sin entrenar → "te extrañamos"
const INSIGHT_RECORD_HOURS = 48;   // ventana de un PR "reciente"
const INSIGHT_STREAK_WEEKS = 2;    // semanas de plan cumplidas → celebrar racha
const INSIGHT_STALL_POINTS = 6;    // mínimo de puntos de un ejercicio para evaluar estancamiento
const INSIGHT_STALL_RECENT = 4;    // últimos N puntos que NO superan el máx previo → estancado
const INSIGHT_DELOAD_WEEKS = 4;      // semanas de plan a tope → sugerir descarga (premium, v353)
const INSIGHT_WATER_MIN_LOGGED = 3;  // días con agua registrada para evaluar el hábito (v353)
const INSIGHT_WATER_MET_MAX = 1;     // si cumplió la meta en ≤1 de esos días → anduvo flojo
const INSIGHT_BW_MIN_ENTRIES = 3;    // registros de peso mínimos para evaluar tendencia (v353)
const INSIGHT_BW_WINDOW_DAYS = 45;   // ventana de la tendencia de peso
const INSIGHT_BW_MIN_DELTA = 0.5;    // kg de cambio para que valga la pena celebrar

// ── Detectores COMPARTIDOS por coachInsight (asesorado) y coachPulse (coach), v353 ──
// Puros. Extraídos para no duplicar la detección entre los dos lados de la misma máquina.
// _insRecordOf: el PR más nuevo dentro de la ventana de 48 h, o null.
function _insRecordOf(prs, nowTs) {
  let best = null;
  Object.keys(prs || {}).forEach(k => {
    const p = prs[k]; if (!p || !p.date) return;
    const t = new Date(p.date).getTime(); if (isNaN(t)) return;
    if (t <= nowTs && nowTs - t <= INSIGHT_RECORD_HOURS * 3600000) {
      if (!best || t > best._t) best = Object.assign({ _t: t }, p);
    }
  });
  return best;
}
// _isStalledEx: ¿una entrada de progreso (computeExerciseProgress) está estancada? kg, ≥6 puntos,
// y el máx de los últimos 4 no supera el máx de los anteriores. Predicado compartido.
function _isStalledEx(e) {
  if (!e || e.unit !== 'kg' || e.points.length < INSIGHT_STALL_POINTS) return false;
  const n = e.points.length;
  const prior = e.points.slice(0, n - INSIGHT_STALL_RECENT);
  const recent = e.points.slice(n - INSIGHT_STALL_RECENT);
  if (!prior.length) return false;
  const priorMax = Math.max.apply(null, prior.map(p => p.maxKg));
  const recentMax = Math.max.apply(null, recent.map(p => p.maxKg));
  return recentMax <= priorMax;
}
// _insStallOf: el PRIMER ejercicio de carga estancado del historial, o null.
function _insStallOf(sessions) {
  return computeExerciseProgress(sessions || []).find(_isStalledEx) || null;
}
// _flatPointsOf: nº de sesiones desde el ÚLTIMO récord de kg de un ejercicio sin superarlo.
// Extraído de shockPlan para que shockTargets ordene por "el más plantado" sin duplicar el cálculo.
function _flatPointsOf(e) {
  if (!e || !e.points || !e.points.length) return 0;
  const bestKg = Math.max.apply(null, e.points.map(p => p.maxKg));
  let lastBestIdx = 0;
  e.points.forEach((p, i) => { if (p.maxKg === bestKg) lastBestIdx = i; });
  return e.points.length - 1 - lastBestIdx;
}

function coachInsight(client, sessions, prs, now, opts) {
  client = client || {};
  sessions = sessions || [];
  prs = prs || {};
  opts = opts || {};
  const muted = opts.muted || {};
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const isFree = !!opts.isFree;
  const isMuted = type => muted[type] != null && nowTs < muted[type];

  // Candidatos en ORDEN de prioridad (v353):
  //   inactivo > deload > récord > racha > estancado > adaptación > peso > agua.
  // Se construyen todos y luego se devuelve el primero NO silenciado (así, si el de mayor
  // prioridad está en "Entendido", aparece el siguiente).
  const candidates = [];

  // 1) Inactividad — la señal más accionable (churn real). Infinity = nunca entrenó (no aplica aquí).
  const dsls = daysSinceLastSession(sessions, nowTs);
  if (dsls !== Infinity && dsls >= INSIGHT_INACTIVE_DAYS) {
    candidates.push({
      type: 'inactivo', icon: 'moon',
      title: 'Te extrañamos por aquí',
      msg: 'Hace ' + dsls + ' días que no entrenas. ¿Todo bien? Sin presión — tu plan te espera para cuando quieras retomar.',
    });
  }

  // 2) Descarga (deload) — SOLO premium. Muchas semanas seguidas a tope → recuperar para crecer.
  const ws = weekStreak(sessions, planDays(client), nowTs);
  if (!isFree && ws.weeks >= INSIGHT_DELOAD_WEEKS) {
    candidates.push({
      type: 'deload', icon: 'wind',
      title: 'Vas duro hace semanas',
      msg: 'Llevas ' + ws.weeks + ' semanas a tope. Una semana más suave ayuda a crecer — coméntalo con tu coach.',
      cta: { label: 'Hablar con mi coach', action: 'msgs' },
    });
  }

  // 3) Récord reciente (últimas 48 h) — toma el PR más nuevo dentro de la ventana.
  const bestPr = _insRecordOf(prs, nowTs);
  if (bestPr) {
    // val ?? kg: los PR legacy guardaban solo `kg` (paridad con isBetterPR) — evita "undefined kg".
    const v = bestPr.val != null ? bestPr.val : bestPr.kg;
    candidates.push({
      type: 'record', icon: 'trend',
      title: '¡Récord en ' + (bestPr.name || 'tu ejercicio') + '!',
      msg: v + ' ' + (bestPr.unit || 'kg') + ' — tu mejor marca hasta hoy. Vas volando 🏆',
    });
  }

  // 4) Racha de semanas cumpliendo el plan (reusa ws — weekStreak es consciente de la semana en curso).
  if (ws.weeks >= INSIGHT_STREAK_WEEKS) {
    candidates.push({
      type: 'racha', icon: 'flame',
      title: '¡' + ws.weeks + ' semanas cumpliendo tu plan!',
      msg: 'Constancia pura. Esto es lo que te transforma 💪',
    });
  }

  // 5) Estancamiento por ejercicio — SOLO premium (coherente con la analítica gateada).
  //    kg, ≥6 puntos, y el máx de los últimos 4 no supera el máx de los anteriores.
  if (!isFree) {
    const stalled = _insStallOf(sessions);
    if (stalled) {
      candidates.push({
        type: 'estancado', icon: 'flat',
        title: stalled.name + ' se estancó un poquito',
        msg: 'Llevas varias sesiones en la misma marca. Un cambio de reps o de técnica lo destraba — coméntalo con tu coach.',
        cta: { label: 'Hablar con mi coach', action: 'msgs' },
      });
    }
  }

  // 6) Fase de adaptación — con ≥1 sesión (sin sesiones el onboarding ya habla).
  if (sessions.length >= 1 && isInAdaptation(client, sessions, nowTs)) {
    candidates.push({
      type: 'adaptacion', icon: 'leaf',
      title: 'Vas empezando, y vas bien',
      msg: 'En estas primeras semanas la constancia importa más que el peso. Tu cuerpo se está adaptando.',
    });
  }

  // 7) Peso hacia el objetivo — SOLO premium, SOLO en positivo. CANDADO DE PRODUCTO: si el peso
  //    va en dirección CONTRARIA al objetivo, SILENCIO TOTAL — esa conversación es del coach
  //    humano, no de una tarjeta automática (nunca regañamos por la báscula).
  if (!isFree && Array.isArray(opts.bw)) {
    const cutoff = nowTs - INSIGHT_BW_WINDOW_DAYS * 86400000;
    const bwPts = opts.bw
      .map(e => ({ t: new Date(e && e.date).getTime(), kg: parseFloat(e && e.kg) }))
      .filter(e => !isNaN(e.t) && Number.isFinite(e.kg) && e.t >= cutoff && e.t <= nowTs)
      .sort((a, b) => a.t - b.t);
    if (bwPts.length >= INSIGHT_BW_MIN_ENTRIES) {
      const delta = bwPts[bwPts.length - 1].kg - bwPts[0].kg;
      const g = (client.goal || '').toLowerCase();
      const wantsDown = /grasa|perder|baj|adelgaz/.test(g);
      const wantsUp = /m[uú]sculo|muscul|ganar|hipertrof/.test(g);
      const good = (wantsDown && delta <= -INSIGHT_BW_MIN_DELTA) || (wantsUp && delta >= INSIGHT_BW_MIN_DELTA);
      if (good) {
        candidates.push({
          type: 'peso', icon: 'scale',
          title: 'Vas en la dirección de tu objetivo',
          msg: Math.abs(delta).toFixed(1) + ' kg en las últimas semanas, paso a paso y sin afán. Así se hace.',
        });
      }
    }
  }

  // 8) Agua — para TODOS (hábito/gancho). SOLO si USA la feature (≥3 días registrados) y casi
  //    nunca llegó a la meta. HOY se excluye (a media mañana nadie ha cumplido). Candado
  //    anti-regaño: quien no registra agua (0-2 días) NUNCA recibe este mensaje.
  const goal = opts.waterGoal || waterGoalGlasses(client.weight);
  const week = waterWeek((client && client.habits) || {}, new Date(nowTs)).slice(0, 6); // sin HOY (último)
  const logged = week.filter(d => d.n > 0).length;
  const met = week.filter(d => d.n >= goal).length;
  if (logged >= INSIGHT_WATER_MIN_LOGGED && met <= INSIGHT_WATER_MET_MAX) {
    candidates.push({
      type: 'agua', icon: 'droplet',
      title: 'Esta semana anduvimos bajos de agua',
      msg: 'Tu cuerpo rinde mejor hidratado. Mañana súbele un vasito a la vez 💧',
    });
  }

  for (let i = 0; i < candidates.length; i++) {
    if (!isMuted(candidates[i].type)) return candidates[i];
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════
// EL PULSO DEL COACH — coach-para-el-coach (v353)
// ──────────────────────────────────────────────────────────────────────
// Motivos POSITIVOS/técnicos para escribirle a cada asesorado (récord/estancamiento/deload/
// racha). NO incluye inactividad: el home del coach ya la grita con el banner de adherencia 💤
// (no duplicar). Pura y DETERMINISTA (el poll de 15s del coach re-renderiza → orden estable o
// "salta"). SIN gating free/premium: el coach ve TODO lo suyo. Reusa los detectores compartidos.
// clients = DB.clients · history = DB.history · prs = DB.prs · opts.muted = {'<cid>_<type>': ts}
const PULSE_STREAK_WEEKS = 3;   // al coach solo lo NOTABLE (más exigente que el lado del asesorado)
const PULSE_TYPE_RANK = { record: 0, estancado: 1, deload: 2, racha: 3 };
function coachPulse(clients, history, prs, now, opts) {
  clients = clients || [];
  history = history || {};
  prs = prs || {};
  opts = opts || {};
  const muted = opts.muted || {};
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const rows = [];
  clients.forEach(c => {
    if (!c || c.suspended) return;
    const sessions = history[c.id] || [];
    // Un solo item por asesorado, prioridad: record > estancado > deload > racha.
    let item = null;
    const rec = _insRecordOf(prs[c.id] || {}, nowTs);
    if (rec) {
      item = { type: 'record', label: '🏆 Rompió récord en ' + (rec.name || 'un ejercicio') };
    } else {
      const stall = _insStallOf(sessions);
      if (stall) {
        item = { type: 'estancado', label: 'Se estancó en ' + stall.name };
      } else {
        const weeks = weekStreak(sessions, planDays(c), nowTs).weeks;
        if (weeks >= INSIGHT_DELOAD_WEEKS) item = { type: 'deload', label: 'Lleva ' + weeks + ' semanas a tope — ¿descarga?' };
        else if (weeks >= PULSE_STREAK_WEEKS) item = { type: 'racha', label: weeks + ' semanas cumpliendo su plan' };
      }
    }
    if (!item) return;
    const mk = c.id + '_' + item.type;
    if (muted[mk] != null && nowTs < muted[mk]) return; // silenciado por el coach (✕)
    rows.push({ id: c.id, name: c.name || '', type: item.type, label: item.label });
  });
  // Orden DETERMINISTA: prioridad de tipo, luego nombre asc (candado contra el poll de 15s).
  rows.sort((a, b) => (PULSE_TYPE_RANK[a.type] - PULSE_TYPE_RANK[b.type]) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return rows.slice(0, 5);
}

// ══════════════════════════════════════════════════════════════════════
// PLAN DE CHOQUE contra estancamientos — coach propone, coach aprueba (v354, Fase 4)
// ──────────────────────────────────────────────────────────────────────
// Cuando un asesorado se planta en un ejercicio, el coach ve una PROPUESTA concreta (2-3 opciones
// de periodización) y la aplica en un toque. AVI PROPONE, el coach SIEMPRE aprueba — igual que el
// generador (nada toca la rutina del asesorado ni le llega mensaje sin acción del coach). Puras/
// testeables. Ver docs/plan-coach-inteligente §17. Los mensajes prellenados van en VOZ DEL COACH.
const SHOCK_REMONTA_REPS = 12;      // descarga: 2 semanas a reps altas con menos peso
const SHOCK_PESADO_SETS = 5;        // bloque de fuerza 5×5
const SHOCK_PESADO_REPS = 5;
const SHOCK_PESADO_REST_PLUS = 30;  // + descanso para el trabajo pesado
const SHOCK_MUTE_DAYS = 21;         // tras aplicar/descartar, no re-proponer por ~un mesociclo
const SHOCK_GLOBAL_MIN = 3;         // ≥3 ejercicios plantados a la vez = fatiga sistémica → descarga global
const SHOCK_GLOBAL_MUTE_DAYS = 7;   // re-chequear antes que los 21d: si está fundido, una semana después hay que volver a mirar
// «3+ estancados = descarga» SOLO vale si viene entrenando parejo (fatiga de tanto exigir). Si se
// estancó por FALTAS (poca frecuencia / huecos por trabajo), una descarga es el consejo equivocado
// —ya entrena poco— y toca RECUPERAR EL RITMO. Los separa la constancia reciente (decisión de
// Camilo con el caso real de Astrid, 2026-07-16). Ver [[avi-coach-inteligente-plan]].
const SHOCK_CONSISTENCY_DAYS = 28;       // ventana para medir la constancia reciente
const SHOCK_CONSISTENCY_MIN_RATIO = 0.7; // fracción del plan (días/sem) para llamarla "constante"
const SHOCK_RETURN_WEEK_DAYS = 7;        // la "primera semana de vuelta" NO cuenta: un retornante que
// entrena denso su 1ª semana tras faltar NO es constancia establecida (decisión de Camilo, radar de
// Fable §24). La constancia se juzga por lo SOSTENIDO (semanas anteriores a esta), no por el arranque.

// _recentCadence: días entrenados por semana en la ventana `[now-windowDays, now-skipRecentDays]`
// —ignora los últimos `skipRecentDays` (la semana en curso / de vuelta)— medidos hasta el FIN de esa
// ventana. Un parón reciente baja la cadencia aunque antes entrenara seguido → capta «huecos», «baja
// frecuencia» Y «acaba de volver» en una cifra. Puro. Varias sesiones el mismo día cuentan 1.
function _recentCadence(sessions, now, windowDays, skipRecentDays) {
  const ref = (now != null ? new Date(now) : new Date()).getTime();
  const end = ref - (skipRecentDays || 0) * 86400000;
  const cutoff = ref - windowDays * 86400000;
  const days = [...new Set((sessions || [])
    .map(s => { const t = new Date(s && s.date).getTime(); return isNaN(t) ? null : new Date(t).setHours(0, 0, 0, 0); })
    .filter(t => t != null && t <= end && t >= cutoff))].sort((a, b) => a - b);
  if (!days.length) return 0;
  const spanWeeks = Math.max(1, (end - days[0]) / (7 * 86400000));
  return days.length / spanWeeks;
}
// Área de dolor (PAIN_AREAS) → zona con reglas de exclusión (GEN_ZONE_EXCL). Solo estas 3 tienen
// exclusiones; un dolor de codo/muñeca no filtra variantes (no hay regla), pero SÍ genera warning.
const _PAIN_ZONE_TO_EXCL = { hombro: 'hombro', 'zona lumbar': 'lumbar', rodilla: 'rodilla' };

// shockTargets(sessions, client, now) → PURA. Decide CÓMO atacar cuando hay varios ejercicios
// plantados a la vez (v355 Fase 4.1; gate de constancia v356). Criterio del coach profesional
// (decisión de Camilo): mismo músculo = un problema con dos síntomas → se ataca UNO primero;
// músculos distintos = recuperación independiente → en paralelo; 3+ = fatiga sistémica → descarga
// global… PERO solo si viene entrenando parejo — si se estancó por FALTAS, toca recuperar el ritmo,
// no bajar aún más el volumen. Devuelve:
//   null                                              → 0 estancados
//   { mode:'global', count, names }                   → ≥SHOCK_GLOBAL_MIN estancados y constante → descarga
//   { mode:'rebuild', count, names, cadence }         → ≥SHOCK_GLOBAL_MIN pero entrenó a saltos → recuperar ritmo
//   { mode:'multi', targets:[{name,muscle,also}] }    → 1-2 músculos (uno por músculo)
// `client`/`now` solo hacen falta para el gate de constancia del modo 3+; sin `now` se asume el
// modo `global` (contrato base). La UI SIEMPRE los pasa.
function shockTargets(sessions, client, now) {
  const stalled = computeExerciseProgress(sessions || []).filter(_isStalledEx);
  if (!stalled.length) return null;
  // 3+ ejercicios plantados = ya no es por-ejercicio (el umbral es por Nº de ejercicios, aunque sean
  // de músculos distintos). ¿Fatiga (→ descarga) o faltas (→ ritmo)? Lo separa la constancia reciente.
  if (stalled.length >= SHOCK_GLOBAL_MIN) {
    const names = stalled.map(e => e.name);
    if (now != null) {
      const cadence = _recentCadence(sessions, now, SHOCK_CONSISTENCY_DAYS, SHOCK_RETURN_WEEK_DAYS);
      const plan = planDays(client);
      if (cadence < plan * SHOCK_CONSISTENCY_MIN_RATIO) {
        // Se estancó entrenando a saltos → una descarga sería consejo equivocado. Recuperar ritmo.
        // Devuelve la cadencia y el plan para que la tarjeta muestre la evidencia («~1,2 de 3 días»).
        return { mode: 'rebuild', count: stalled.length, names, cadence: Math.round(cadence * 10) / 10, plan };
      }
    }
    return { mode: 'global', count: stalled.length, names };
  }
  // 1-2 músculos: por cada músculo gana la entrada con MÁS puntos planos (la más clavada); las
  // hermanas del mismo músculo van en `also` («X también se plantó — destrabemos este primero»).
  // Desempate por nombre asc = determinista (el poll de 15s del coach no debe reordenar).
  const byMuscle = {};
  stalled.forEach(e => { const m = e.muscle || ''; (byMuscle[m] = byMuscle[m] || []).push(e); });
  const targets = Object.keys(byMuscle).map(m => {
    const group = byMuscle[m].slice().sort((a, b) =>
      (_flatPointsOf(b) - _flatPointsOf(a)) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return { name: group[0].name, muscle: m, also: group.slice(1).map(e => e.name) };
  });
  // Orden estable de las secciones por nombre del ganador (con <3 estancados hay ≤2 targets).
  targets.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { mode: 'multi', targets };
}

// shockPlan(client, exName, sessions, lib, now) → null si ESE ejercicio no está estancado, o el plan.
function shockPlan(client, exName, sessions, lib, now) {
  client = client || {};
  lib = lib || [];
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const e = computeExerciseProgress(sessions || []).find(x => x.name === exName);
  if (!_isStalledEx(e)) return null;

  const bestKg = Math.max.apply(null, e.points.map(p => p.maxKg));
  let lastBestIdx = 0;
  e.points.forEach((p, i) => { if (p.maxKg === bestKg) lastBestIdx = i; });
  const analysis = {
    bestKg,
    flatPoints: _flatPointsOf(e), // sesiones desde el último récord sin superarlo (helper compartido)
    sinceStr: (e.points[lastBestIdx] || {}).dateStr || '',
  };

  // Zonas a excluir de las variantes: limitaciones anotadas + dolor activo. + warnings al coach.
  const warnings = [];
  const excludeZones = new Set();
  const lim = parseLimitations(client.notes);
  if (lim.detected) {
    warnings.push('Tiene una limitación anotada (' + lim.zones.join(', ') + ') — confirma que la opción no la comprometa.');
    lim.keys.forEach(z => { if (GEN_ZONE_EXCL[z]) excludeZones.add(z); });
  }
  const hasPain = painCareActive(client.painCare, nowTs).length > 0;
  if (hasPain) {
    warnings.push('🤕 Reportó dolor hace poco — revisa su estado antes de subir cargas.');
    painCareActive(client.painCare, nowTs).forEach(p => { const z = _PAIN_ZONE_TO_EXCL[p.area]; if (z) excludeZones.add(z); });
  }

  const name = client.name || 'Tu asesorado';
  const options = [];
  // 1) Descarga y remonta — SIEMPRE (la recomendada, segura con o sin dolor).
  options.push({
    id: 'remonta', title: 'Descarga y remonta',
    desc: '2 semanas con ~10% menos peso a ' + SHOCK_REMONTA_REPS + ' repeticiones con técnica perfecta; en la semana 3 vuelve a su peso y lo supera.',
    apply: { reps: SHOCK_REMONTA_REPS },
    msg: name + ', vi que el ' + exName + ' se te plantó en ' + bestKg + ' kg. Vamos a destrabarlo: estas 2 semanas baja el peso ~10% y hazlo a ' + SHOCK_REMONTA_REPS + ' repeticiones con técnica perfecta. En la semana 3 volvemos por ese récord 💪',
  });
  // 2) Bloque de fuerza 5×5 — NO si hay dolor activo (subir carga con dolor es peligroso).
  if (!hasPain) {
    options.push({
      id: 'pesado', title: 'Bloque de fuerza 5×5',
      desc: '3 semanas de ' + SHOCK_PESADO_SETS + ' series × ' + SHOCK_PESADO_REPS + ' repeticiones con más carga y descansos largos — un estímulo distinto rompe la meseta.',
      apply: { sets: SHOCK_PESADO_SETS, reps: SHOCK_PESADO_REPS, restSecDelta: SHOCK_PESADO_REST_PLUS },
      msg: name + ', el ' + exName + ' se estancó en ' + bestKg + ' kg. Cambiemos el estímulo: 3 semanas de ' + SHOCK_PESADO_SETS + '×' + SHOCK_PESADO_REPS + ' con más peso y descansos largos. La fuerza que ganes ahí destraba el resto.',
    });
  }
  // 3) Rota a una variante — si hay candidata segura (mismo músculo, del nivel, sin chocar zonas).
  const cap = _levelGate(client.level || 'Principiante').cap;
  const exNorm = _norm(exName);
  const cand = lib.find(x => x && x.muscle === e.muscle && _norm(x.name) !== exNorm
    && exLevelRank(x) <= cap
    && ![...excludeZones].some(z => GEN_ZONE_EXCL[z].test(_norm(x.name))));
  if (cand) {
    options.push({
      id: 'variante', title: 'Rota a una variante',
      desc: 'Cambia ' + exName + ' por ' + cand.name + ' unas 3-4 semanas — un ejercicio nuevo para el mismo músculo reactiva el progreso.',
      apply: { swapTo: cand.id },
      msg: name + ', el ' + exName + ' lleva rato clavado en ' + bestKg + ' kg. Rotemos a ' + cand.name + ' unas 3-4 semanas: trabaja el mismo músculo desde otro ángulo y suele reactivar el progreso. Después volvemos por ese récord 💪',
    });
  }

  return { ex: { name: e.name, muscle: e.muscle }, analysis, warnings, options };
}

// applyShockOption(routines, exName, option, lib) → PURA, copia nueva de las rutinas con la opción
// aplicada a TODAS las entradas de ese ejercicio (mismo criterio de agrupación del estancamiento).
function applyShockOption(routines, exName, option, lib) {
  const opt = (option && option.apply) || {};
  lib = lib || [];
  const swap = opt.swapTo ? lib.find(x => x && x.id === opt.swapTo) : null;
  return (routines || []).map(r => {
    const rt = Object.assign({}, r);
    rt.exercises = (r.exercises || []).map(ex => {
      if (!ex || ex.name !== exName) return ex;
      const nx = Object.assign({}, ex);
      if (swap) {
        // Rota el ejercicio CONSERVANDO sets/reps de la entrada; cambia su identidad.
        nx.id = swap.id; nx.name = swap.name; nx.muscle = swap.muscle;
        if (swap.type != null) nx.type = swap.type;
        if (swap.track != null) nx.track = swap.track;
        nx.icon = swap.icon; nx.desc = swap.desc; nx.imgUrl = swap.imgUrl;
      } else {
        if (opt.sets != null) nx.sets = opt.sets;
        if (opt.reps != null) nx.reps = opt.reps;
        if (opt.restSecDelta != null) nx.restSec = (parseInt(ex.restSec) || parseInt(r.restSec) || 60) + opt.restSecDelta;
      }
      return nx;
    });
    return rt;
  });
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
// LO QUE LEE EL ASESORADO BAJO EL NOMBRE DEL EJERCICIO (2026-07-27)
// ──────────────────────────────────────────────────────────────────────
// Hasta ahora esa línea decía «músculo · tipo» tal cual salía del dato:
//   · 8 personas con rutinas viejas (163 ejercicios, medido en prod) no tienen
//     `muscleLabel` y leían el SLUG crudo, en minúscula y sin tilde: «biceps»,
//     «gluteo», «triceps».
//   · Y al lado, vocabulario de entrenador: «Compuesto», «Aislamiento» y hasta
//     «Bodyweight», en inglés. A quien nunca ha entrenado no le dice nada
//     (regla de tono del proyecto: cero jerga técnica para el asesorado).
// Decisión del PO (2026-07-27): el asesorado ve SOLO el músculo, bien escrito.
// El panel del coach conserva «músculo · tipo» — ahí sí significa algo.
// PURA: recibe el ejercicio, devuelve texto ya listo (nunca null; '' = no pintar
// la línea, que es mejor que pintar «otro»).
const MUSCLE_HUMAN = {
  pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', biceps: 'Bíceps',
  triceps: 'Tríceps', piernas: 'Piernas', gluteo: 'Glúteo', core: 'Abdomen',
  cardio: 'Cardio', otro: ''
};
function muscleHuman(slug) {
  const k = String(slug == null ? '' : slug).trim().toLowerCase();
  if (!k) return '';
  if (Object.prototype.hasOwnProperty.call(MUSCLE_HUMAN, k)) return MUSCLE_HUMAN[k];
  // Músculo que no está en el catálogo (custom del coach): al menos con mayúscula
  // inicial, jamás el slug crudo en minúscula.
  return k.charAt(0).toUpperCase() + k.slice(1);
}
// La línea completa para el asesorado. `muscleLabel` del catálogo ya viene escrito
// para humanos («Cuádriceps y glúteo») y manda; si falta, se humaniza el slug.
function exMuscleText(ex) {
  const e = ex || {};
  const label = String(e.muscleLabel == null ? '' : e.muscleLabel).trim();
  if (label) return label;
  return muscleHuman(e.muscle);
}

// ══════════════════════════════════════════════════════════════════════
// BUSCAR EN LA BIBLIOTECA DE EJERCICIOS (auditoría FASE 2, 2026-07-27)
// ──────────────────────────────────────────────────────────────────────
// La biblioteca del coach medía 30.752 px —42 pantallas de scroll— con los
// 212 ejercicios pintados de golpe y SIN buscador: para hallar uno había que
// filtrar por músculo y bajar a pulso. Y va a crecer al repoblarla.
// Busca por nombre y por músculo a la vez, sin distinguir mayúsculas NI
// TILDES («biceps» encuentra «Bíceps», que es como la gente teclea de afán).
// PURA: recibe la lista y devuelve otra; el render solo pinta.
function _exNorm(s) {
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita tildes
    .trim();
}
function searchExercises(lib, term, muscle) {
  const list = Array.isArray(lib) ? lib : [];
  const m = String(muscle == null ? '' : muscle);
  const porMusculo = (!m || m === 'all') ? list : list.filter(e => e && e.muscle === m);
  const q = _exNorm(term);
  if (!q) return porMusculo;
  // Todas las palabras que escribió tienen que aparecer en algún lado del ejercicio:
  // «press banca» encuentra «Press de Banca con Barra» aunque no sea literal.
  const palabras = q.split(/\s+/).filter(Boolean);
  return porMusculo.filter(e => {
    if (!e) return false;
    const heno = _exNorm([e.name, e.muscleLabel, e.muscle, e.type].filter(Boolean).join(' '));
    return palabras.every(p => heno.indexOf(p) !== -1);
  });
}

// ══════════════════════════════════════════════════════════════════════
// LA PÍLDORA «INSTALAR APP» NO PUEDE QUEDARSE CON UN TOQUE
// ──────────────────────────────────────────────────────────────────────
// Medido con hit-testing a 390×844 (2026-07-27): el botón flotante se paraba
// sobre los campos KG/REPS de una serie — tocar para anotar el peso abría el
// instalador. No es que "tape": se lleva el toque, en LA tarea de la app. El
// mismo encimado le pasaba a «Hacer esta rutina ahora» en la pestaña Rutinas.
// La regla es de GEOMETRÍA y va CONTROL POR CONTROL, no por pantalla: la
// píldora solo se aparta si de verdad está encima de algo que se toca. Así
// sigue visible el resto del tiempo — instalar la app es el problema nº1 de
// adopción (a 15 de 16 no se les puede notificar) y no se sacrifica de gratis.
// PURA: recibe dos rectángulos tipo DOMRect; sin alguno de los dos → false
// (ante la duda la píldora se queda: esconderla de más cuesta instalaciones).
function pillStealsTap(pill, ctrl) {
  if (!pill || !ctrl) return false;
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
  const pt = num(pill.top), pb = num(pill.bottom), pl = num(pill.left), pr = num(pill.right);
  const ct = num(ctrl.top), cb = num(ctrl.bottom), cl = num(ctrl.left), cr = num(ctrl.right);
  if (pt === null || pb === null || pl === null || pr === null) return false;
  if (ct === null || cb === null || cl === null || cr === null) return false;
  if (pb <= pt || pr <= pl) return false;   // píldora sin caja (display:none) → nada que robar
  if (cb <= ct || cr <= cl) return false;   // control sin caja (oculto / aún sin pintar)
  return pt < cb && pb > ct && pl < cr && pr > cl;
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

// ══════════════════════════════════════════════════════════════════════
// SELLO ANTI-HARNESS — corta escrituras a la nube desde localhost (v298)
// ──────────────────────────────────────────────────────────────────────
// Incidente 2026-07-08 (Samuel): los harness E2E corren `python http.server`
// sobre el index.html LOCAL, que apunta al Supabase de PRODUCCIÓN. Al iniciar
// sesión con la cuenta REAL de un asesorado y hacer svNow('ax_c') con una
// rutina de PRUEBA (fixture rTest), el harness SOBRESCRIBIÓ las 4 rutinas
// reales de Samuel en la nube. Causa de raíz: la ruta de escritura (UD.upsert*)
// nunca se sellaba en localhost. Este guard la sella para CUALQUIER harness,
// presente o futuro, sin tener que tocar cada script. Pura y testeable:
// recibe hostname + flag de opt-in. Escape hatch para probar sync a propósito
// contra un proyecto de PRUEBA: window.AVI_ALLOW_CLOUD_WRITE = true.
function cloudWriteSealed(hostname, allowFlag) {
  if (allowFlag) return false;
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(String(hostname || ''));
}

// IDs de rutina que SOLO usan los harness E2E (nunca un asesorado real: las rutinas
// reales llevan id hex/base36 tipo "mqqx81o..."). Antes del sello v298, algún harness
// alcanzó a inyectar sesiones de PRUEBA en el historial real de un asesorado (y su
// teléfono las re-empujaba a la nube). stripFixtureSessions las barre de cualquier
// dispositivo al cargar. Blocklist explícita → cero riesgo de tocar datos reales.
const FIXTURE_ROUTINE_IDS = ['rTest', 'rVis', 'rf5'];
// Purga sesiones-fixture de un array de historial. Devuelve {history, removed}. PURA.
function stripFixtureSessions(history) {
  const arr = Array.isArray(history) ? history : [];
  const clean = arr.filter(h => !h || FIXTURE_ROUTINE_IDS.indexOf(h.routineId) === -1);
  return { history: clean, removed: arr.length - clean.length };
}

// Normaliza un teléfono a los dígitos que espera wa.me (E.164 sin '+'). PURA.
// RAÍZ del bug (2026-07-17, cazado por Fable): los 3 nudges de WhatsApp (recordatorio de pago,
// empujón de adherencia, invitar a abrir la app) hacían `wa.me/${phone.replace(/\D/g,'')}` →
// un móvil colombiano guardado SIN indicativo («300 123 4567») producía `wa.me/3001234567`,
// que WhatsApp NO reconoce (falta el país). Regla: móvil CO = 10 dígitos que empiezan por 3 →
// anteponer 57. Un número que YA trae indicativo (12 dígitos con 57, o cualquier otro largo) se
// respeta tal cual. Vacío/no reconocible → '' (el caller cae a `wa.me/?text=` para elegir contacto).
// Solo se toca el móvil CO pelón: NO adivinamos país de fijos ni de números internacionales.
// F14 (2026-07-26) — «devolver los dígitos tal cual» NO es neutral: `wa.me/<n>` interpreta el
// número como E.164, así que un FIJO de Bogotá guardado sin indicativo (6012345678) abría chat con
// **+60 12 345 678 = Malasia**. Un número equivocado no es un enlace roto: es escribirle a un
// desconocido de otro país. Ahora, si el número no es plausible como celular, se devuelve '' y el
// llamador cae a `wa.me/?text=` (elegir contacto), que ya estaba implementado en los 4 sitios.
//
// Sesgo declarado: la base de usuarios es colombiana. Un móvil de 10 dígitos que empieza por 3 se
// asume CO (+57). Un celular de OTRO país con esa forma (EE.UU. «305…») es indistinguible → hay
// que guardarlo con indicativo (+1 305…). `waPhoneNote` se lo dice al coach en vez de callar.
function waPhone(raw) {
  const s = String(raw == null ? '' : raw).trim();
  const plus = s.charAt(0) === '+';
  const d = s.replace(/\D/g, '');
  if (!d) return '';
  // Colombia explícita (con o sin «+»): 57 + 10 dígitos. El móvil empieza por 3; 60x… es fijo.
  if (d.length === 12 && d.slice(0, 2) === '57') return d[2] === '3' ? d : '';
  if (plus) return (d.length >= 8 && d.length <= 15) ? d : ''; // otro país con indicativo EXPLÍCITO
  if (d.length === 10) return d[0] === '3' ? '57' + d : '';    // local CO: móvil sí, fijo NO
  if (d.length >= 11 && d.length <= 15) return d;              // largo sin «+»: ya trae indicativo
  return ''; // corto, incompleto o ambiguo → mejor elegir el contacto que escribirle a un extraño
}

// Por qué no se pudo usar el teléfono, en cristiano y accionable (R1.5: estados no felices con
// mensaje útil). '' = el número sirve. PURA.
function waPhoneNote(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return 'No tienes su teléfono guardado.';
  if (waPhone(s)) return '';
  const d = s.replace(/\D/g, '');
  if (d.length === 10 || (d.length === 12 && d.slice(0, 2) === '57')) return 'Ese número parece un fijo, no un celular.';
  if (d.length < 10) return 'Ese teléfono está incompleto.';
  return 'No reconozco ese número. Si es de otro país, guárdalo con indicativo (+1, +34…).';
}

// ── Exportación dual: navegador (global) + Node (module.exports) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MOOD_STATES,
    applyMood,
    waPhone,
    waPhoneNote,
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
    NUT_FOODS,
    NUT_FOOD_BY_ID,
    nutDayKind,
    nutDayTarget,
    nutPortionText,
    nutSolveMeal,
    NUT_DAY_W,
    NUT_SOLVE_PASSES,
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
  mcInk,
    mcInkUp,
    inkOn,
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
    sessionFinished,
    finishedTrainingToday,
    daysSinceLastSession,
    workoutStreak,
    longestStreak,
    planDays,
    streakTarget,
    STREAK_WEEK_MIN_DAYS,
    clampLogValue,
    sanitizeHistory,
    sanitizePrs,
    LOG_MAX,
    weekStreak,
    longestWeekStreak,
    adherenceMonth,
    dayOrder,
    sortRoutinesByDay,
    weeklyMissed,
    myTrainingSummary,
    shareBannerEligible,
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
    isFreeClient,
    clientHasCoach,
    chatDeliveryBlock,
    clientPlan,
    PLAN_LABEL,
    USER_DATA_COLLECTIONS,
    clientToRow,
    rowToClient,
    GX_LEVELS,
    gxLevel,
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
    communityPrPayload,
    communityWorkoutPayload,
    communityEmptyState,
    communityPeersLine,
    CMTY_PEERS_NAMES,
    communityNudgeEligible,
    communityProbeStale,
    communityMe,
    firstSessionMode,
    estimateWorkoutMinutes,
    CMTY_NUDGE_MIN_SESSIONS,
    CMTY_NUDGE_SNOOZE_DAYS,
    CMTY_NUDGE_PROBE_TTL_H,
    communityGymAdoption,
    communityGymHint,
    communityInviteMsg,
    CMTY_INVITE_URL,
    communityMilestoneText,
    highestStreakMilestone,
    milestoneAskEligible,
    MILESTONE_ASK_MAX_SHOWS,
    STREAK_MILESTONES,
    communityCommentText,
    leadPending,
    computeExerciseProgress,
    coachInsight,
    coachPulse,
    stalledExercise: _insStallOf,
    shockTargets,
    shockPlan,
    applyShockOption,
    weekEditorial,
    exTrack,
    prFromSets,
    isBetterPR,
    muscleHuman,
    exMuscleText,
    searchExercises,
    pillStealsTap,
    MUSCLE_GROUP_CAT,
    MUSCLE_GROUP_LABEL,
    muscleVolume,
    pushPullBalance,
    SUBMUSCLE_GROUP,
    SUBMUSCLE_LABEL,
    submuscleVolume,
    errReportGate,
    cloudWriteSealed,
    FIXTURE_ROUTINE_IDS,
    stripFixtureSessions,
    WATER_GLASS_ML,
    clampQwHiit,
    newsToShow,
    habitDayKey,
    waterGoalGlasses,
    waterToday,
    waterAdd,
    waterWeek,
    waterGoalFor,
    waterAdherence,
    STEPS_GOAL_DEFAULT,
    STEPS_MAX,
    stepsToday,
    stepsSet,
    stepsAdd,
    stepsWeek,
  };
}
