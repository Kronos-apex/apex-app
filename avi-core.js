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

// ⛔ `calcMacrosSugeridos` BORRADA en v436: era una CUARTA cuenta (la que rellenaba «Editar
// plan») que dosificaba sobre el PESO TOTAL — a quien tiene IMC>30 le proponía comer por encima
// de su gasto con objetivo de perder grasa. El formulario usa `nutritionEstimate`, que es lo que
// la app entrega de verdad y ya corrige el peso de referencia (v428).

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
  if (!client) return false;
  // 🔴 La fila propia del coach aparece en la lista como un asesorado más, así que el botón
  // de borrar la alcanza. Borrarla se llevaría su entrenamiento, sus rutinas y su cuenta.
  // Nunca se pide confirmación siquiera: no es una acción disponible.
  if (isSelfClient(client)) return false;
  if (!confirmFn()) return false;
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
// Los 7 días arrancando en LUNES (índice 0 = Lunes … 6 = Domingo). Ojo: NO es el orden de
// `Date.getDay()`, que empieza en domingo — `genDayIdxFromDate` hace la conversión.
const GEN_WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
function genDayIdxFromDate(d) { const n = (d instanceof Date ? d : new Date(d)).getDay(); return (n + 6) % 7; }

// ── EN QUÉ DÍAS CAE EL PLAN ─────────────────────────────────────────────
// Dos defectos que arreglaba esta función, medidos el 2026-08-01 sobre 864 planes:
//
// 1. 🔴 **Todos los planes arrancaban el LUNES — el 100%.** Quien se registraba un sábado o un
//    domingo veía «hoy es tu día de descanso» el mismo día que se inscribió (el 100% de las
//    veces; viernes 75%, jueves 50%), justo en el momento de más ganas. Ocho personas tienen
//    rutina y nunca completaron un entreno.
// 2. 🔴 **Los días iban CONSECUTIVOS** (`GEN_DAY_LABELS` es Lunes·Martes·Miércoles…): un
//    principiante de 3 días entrenaba lunes, martes y miércoles y después descansaba cuatro.
//    Amontonar no es programar; el trabajo se distribuye para que haya recuperación entre
//    sesiones.
//
// Reparte `n` días a lo ancho de la semana con huecos parejos, empezando en `startIdx`
// (0 = Lunes … 6 = Domingo). Pura y determinista. n=3 → huecos de 2-3 días.
function genWeekDays(n, startIdx) {
  const d = Math.max(1, Math.min(7, parseInt(n) || 3));
  const s = ((parseInt(startIdx) || 0) % 7 + 7) % 7;
  const out = [];
  for (let i = 0; i < d; i++) out.push(GEN_WEEK_DAYS[(s + Math.round(i * 7 / d)) % 7]);
  return out;
}


// Deltoides POSTERIOR (face pull, pájaro, pec deck inverso, Y-T-W…) = músculo de TRACCIÓN
// aunque su etiqueta de catálogo sea "hombros". No debe caer en día de EMPUJE; pertenece al
// de jalón. Se detecta por el muscleLabel ("Hombro posterior…") — más fiable que el nombre,
// que no siempre lleva la palabra (ej. e109 "Elevaciones Y-T-W") — con respaldo por nombre.
// Pedido de Camilo 2026-06-25.
const _isRearDelt = ex => /posterior|face pull|pajaro/.test(_norm(((ex && ex.muscleLabel) || '') + ' ' + ((ex && ex.name) || '')));

// Plantillas de bloque: cada slot = [muscle, type|null, n] (4º opcional = {avoid|prefer:RegExp}
// para filtrar por nombre dentro del slot). type null = cualquiera de ese músculo.
const GEN_DAYS = {
  // 🔴 PUESTO DE GLÚTEO (2026-08-03, decisión del PO validada por Valery). El Full Body —lo que
  // recibe TODO principiante, y también quien entrena ≤2 días— no tenía puesto dedicado de
  // glúteo: el estímulo llegaba solo indirecto por sentadilla/zancada (9 de 10 compuestos de
  // pierna lo reclutan), pero cero trabajo dirigido. De las 9 principiantes de producción, 6
  // son mujeres. Va SEGUNDO, y `_genRank` lo baja solo a la posición 5 en gym (detrás de los
  // compuestos) y lo deja arriba en casa/corporal, donde sus vecinos tienen el mismo rango.
  // **`Aislamiento`, NO `Compuesto`:** medido, `Compuesto` entregaba Hip Thrust Unilateral el
  // 24,6% de los días (su propia ficha lo llama «progresión avanzada») y, con lumbar declarada,
  // el filtro borra sumo y peso muerto y CONCENTRA el pool en barra sobre la cadera (24 → 128
  // apariciones). `Aislamiento` entrega 100% nivel P en los 4 entornos. Para TODOS, sin
  // condicionar por sexo: el hombre intermedio ya tiene su glúteo en PIERNA, y `sexKey` cae a
  // 'M' cuando no se declaró sexo → colgar el beneficio de un campo opcional fabrica un defecto.
  FULL_BODY:      { name: 'Full Body', slots: [['piernas', 'Compuesto', 1], ['gluteo', 'Aislamiento', 1], ['pecho', 'Compuesto', 1], ['espalda', 'Compuesto', 1], ['hombros', 'Compuesto', 1], ['core', null, 1]] },
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
// `lumbar` ampliada 2026-08-02 con las formas que la gente SÍ escribe (lumbago, espondilo-,
// protrusión, estenosis, sacroilíaco, "me duele la espalda", L4/L5/S1). Nota de Laura sobre
// `hernia`: atrapa también la inguinal y NO se corrige — también desaconseja Valsalva y carga
// axial alta, así que el error va hacia el lado seguro.
const GEN_LIMIT_KWS = [
  { zone: 'rodilla', re: /rodilla|menisco|patela|rotula|ligamento|\blca\b|\blcl\b/ },
  { zone: 'lumbar', re: /lumbar|lumbago|espalda baja|lumbalgia|hernia|ciatic|disco|escolios|espondil|protusi|protrusi|estenosis|sacroil|dolor de espalda|me duele la espalda|\bl4\b|\bl5\b|\bs1\b/ },
  { zone: 'hombro', re: /hombro|manguito|rotador|deltoid/ },
  { zone: 'generic', re: /lesion|operad|postoperat|posoperat|tendon|cirugia|protesis|fractura/ },
];
const GEN_ZONE_LABEL = { rodilla: 'rodilla', lumbar: 'zona lumbar', hombro: 'hombro', generic: 'lesión/postoperatorio' };
// Síntomas que sugieren compromiso NERVIOSO (radiculopatía). No cambian qué se excluye —
// cambian lo que la app le dice al coach: esto es criterio de DERIVACIÓN médica antes de
// cargar, no de sustituir un ejercicio por otro. (Veredicto de Laura, fisio, 2026-08-02.)
const GEN_NERVE_RE = /ciatic|irradia|hormigueo|adormec|se me duerme|pierda fuerza|debilidad/;
// Ejercicios a EXCLUIR por zona (match contra nombre normalizado). Preferimos variantes seguras
// dejando que el fallback elija otras del mismo músculo.
//
// ⚕️ Listas dictadas por Laura (fisioterapeuta) el 2026-08-02 — veredicto VINCULANTE, no se
// tocan sin ella. Nacen de una medición: con «hernia discal» declarada el generador entregaba
// las MISMAS 1.246 flexiones de columna que sin declarar nada (Russian Twist 462 veces, Crunch
// 448) mientras el texto le prometía al coach que había excluido lo contraindicado.
//  · lumbar  — antes solo cubría bisagra e hiperextensión: NADA de flexión, rotación cargada ni
//              impacto, que es el 100% del hueco de core de cada día. `sentadilla` a secas se
//              ESTRECHÓ a las variantes con barra: borraba el wall-sit y el sit-to-stand, que
//              son terapéuticos. En rodilla, en cambio, se conserva ancho A PROPÓSITO (ahí el
//              riesgo está en rango y alineación, y el sistema no controla ninguno de los dos).
//  · rodilla — se le iba `extension de cuadriceps`: extensión terminal bajo carga es el pico de
//              estrés femoropatelar, el ejercicio nº1 de su columna «Evitar».
//  · hombro  — cubría 3 patrones de ~10: se colaba TODO el press por encima de la cabeza que no
//              fuera con barra (mancuernas, máquina, banda, mochila, pike, Arnold).
//  · 2026-08-08 (ADENDA de Laura, `docs/dictamen-laura-dolor-2026-08-08.md`): entran las 4 zonas
//    que faltaban —aductor, abductor, cuello, tobillo— y se parchean 3 huecos VIVOS que encontró
//    Coach Pro. Los tres se colaban porque **el filtro mira el NOMBRE y no la descripción**:
//    `e212 «Paseo del Camarero»` es un acarreo con la mancuerna SOBRE LA CABEZA, `e211 «Colgarse
//    de la Barra»` es tracción pura, y el patrón de ESCALÓN (e41/e107/e145/e199) es carga
//    unilateral sobre una rodilla. Van como REGEX y no como lista de ids a propósito: son
//    familias nombrables, y una lista solo atrapa lo que ya existe.
//    🔒 `e211` sale de `hombro` pero SE QUEDA en `lumbar`: ahí la descompresión sí es útil y no
//    hay articulación irritada colgando. Criterio de Laura, no simetría automática.
const GEN_ZONE_EXCL = {
  rodilla: /sentadilla|zancada|estocada|desplante|salto|saltarin|pistol|bulgara|extension de cuadriceps|burpee|sprawl|thruster|lanzamiento|clean|man maker|sprint|rodillas altas|step ?-?up|escalon|subida con rodilla/,
  // ⚠️ `buenos dias CON BARRA` y no a secas (Laura, auditoría 2026-08-08): a secas se llevaba
  // `e148 «Patrón de Bisagra (Buenos Días SIN PESO)»`, que es el ejercicio con el que se le enseña
  // a alguien con lumbalgia a moverse desde la cadera y no desde la columna. No es un caso de
  // «ancho a propósito» como rodilla: allí el riesgo vive en el rango y la alineación y el sistema
  // no controla ninguno; aquí **el peso está en el nombre**, así que no hay ambigüedad.
  // 🔒 `wai3` («Peso muerto con peso corporal») SIGUE fuera por id, y la razón no es el riesgo
  // sino el PROPÓSITO: es un ensayo del peso muerto justo antes de una sesión de la que el filtro
  // ya quitó todos los pesos muertos — no tiene beneficio que compense. `e148` sí lo tiene.
  lumbar: /peso muerto|remo con barra|buenos dias con barra|hiperexten|sentadilla con barra|sentadilla frontal|sentadilla hack|sentadilla en smith|sentadilla sumo|crunch|russian twist|hollow|rueda abdominal|ab wheel|elevacion de piernas|oruga|superman|azote|pesa rusa|man maker|thruster|clean|push press|lanzamiento|militar con barra|salto|saltarin|burpee|sprawl|sprint|caminata del granjero|farmer|paseo del camarero|camarero/,
  hombro: /tras ?nuca|trasnuca|fondos|press militar|press de hombro|arnold|pike|push press|thruster|clean|azote|man maker|sobre la cabeza|agarre amplio|pasa-?vallas|cuerdas de batalla|aperturas con mancuernas|aperturas declinadas|press de banca con barra|press inclinado con barra|press declinado con barra|paseo del camarero|camarero|colgarse/,
  // 🔒 ADUCTOR — ANCHO en lateral/apertura/explosivo, ESTRECHO en sentadilla (solo `sumo`). El
  // mecanismo de lesión es el cambio de dirección y la base abierta, no la sentadilla: la
  // sentadilla estrecha, la prensa y el wall-sit son EL CAMINO DE VUELTA. Si `sentadilla` entrara
  // a secas se repetiría el error que borraba el sit-to-stand.
  aductor: /aduccion|abduccion|sumo|clamshell|concha|hidrante|fire hydrant|frog|rana|patinador|tijera|90\/90|estiramiento del mundo|zancada con giro|balanceo de piernas|(zancada|paseo|paso|patada|estocada|desplante|abduccion|balanceo) lateral|salto|saltarin|burpee|sprawl|sprint/,
  // 🔒 ABDUCTOR — ANCHO en abducción/lateral/UNILATERAL DE PIE. El glúteo medio se provoca
  // sosteniendo la pelvis sobre UNA pierna: por eso caen búlgara, step-up y las variantes a una
  // pierna. La zancada bilateral con apoyo sobrevive (es 🟡, no ❌).
  abductor: /abduccion|aduccion|clamshell|concha|hidrante|fire hydrant|patinador|90\/90|(zancada|paseo|paso|patada|estocada|desplante|balanceo) lateral|zancada caminando|bulgara|step ?-?up|escalon|subida con rodilla|sentadilla a una pierna|rumano a una pierna|salto|saltarin|burpee|sprawl|sprint|tijera/,
  // 🔒 CUELLO — MEDIO-ANCHO. Cae lo que carga por encima de la cabeza, lo que cuelga, lo que mete
  // al cuello en el crunch y el impacto; NO cae lo que se hace sentado con respaldo.
  // ⚠️ `buenos dias con barra` y no `buenos dias`: el segundo se comía `e148 Patrón de Bisagra
  // (sin peso)`, que es la versión terapéutica. Igual `elevacion de piernas colgado` y no a secas,
  // que se comía `e132` (tumbado, cuello apoyado). Los dos los cazó Laura midiendo.
  cuello: /encogimiento|press militar|press de hombro|arnold|push press|thruster|clean|sobre la cabeza|tras ?nuca|pike|dominada|chin ?-?up|colgarse|crunch|hollow|russian twist|elevacion de piernas colgado|rueda abdominal|ab wheel|peso muerto convencional|remo con barra|buenos dias con barra|hiperexten|caminata del granjero|farmer|paseo del camarero|camarero|cuerdas de batalla|azote|man maker|burpee|sprawl|salto|saltarin|sprint|superman|nadador/,
  // 🔒 TOBILLO — ANCHO en impacto y carga en pie, ESTRECHO en movilidad. `e177` y `wt1` NO se
  // excluyen: son el tratamiento. La fase aguda la cubre el NIVEL del reporte, que para todo — el
  // regex codifica «qué agrava esta zona», el nivel codifica «cuánto movimiento se permite».
  // ⚠️ Sin `cuerda`: se comía `e11 Extensión de Tríceps con Cuerda en Polea`.
  tobillo: /salto|saltarin|burpee|sprawl|sprint|carrera|trote|tijera|rodillas altas|talones al gluteo|patinador|escalador|mountain climber|elevacion de talones|escalon|step ?-?up|escaladora|subida con rodilla|caminata del granjero|farmer|zancada caminando|perro boca abajo|paso lateral|talones atras|oruga|caminata del oso|caminata del cangrejo/,
};
// Ejercicios que el NOMBRE genuinamente no delata. En todo el dictamen es UN solo caso, y por eso
// esto no es una lista paralela sino la excepción documentada: `e93 «Sentadilla con Banda de
// Resistencia»` es trabajo directo de abductor disfrazado de sentadilla (su descripción dice que
// «la banda fuerza la activación del glúteo medio»). 🔒 NO va en `aductor`: la banda RESISTE
// abducción, así que el aductor no se estira — Laura lo tenía en las dos y lo corrigió al medir.
const GEN_EXCL_IDS = { abductor: ['e93'] };

// ── TRABAJO CORRECTIVO (pedido del PO, 2026-08-08) ───────────────────────────────────────────
// 🔴 HASTA AQUÍ TODO EL MOTOR SABÍA EXCLUIR Y NO SABÍA PRESCRIBIR. Lo destapó el propio PO: «me
// duelen los codos al hacer extensión de tríceps y necesito fortalecer el manguito rotador, ¿eso
// está cubierto?». Lo primero sí (se le quita); lo segundo NO existía — la app puede sacarte lo
// que te hace daño pero no tenía forma de ponerte lo que te hace falta. Quien tiene una molestia
// necesita las dos cosas.
// Los ejercicios salen de los bloques que armó Coach Pro dentro de los límites de Laura.
//
// 🔒 REGLA QUE NO SE PUEDE ROMPER: un correctivo NUNCA puede ser algo que el filtro de SU PROPIA
// zona excluya — sería prescribir lo que se acaba de prohibir. Se verificó midiendo, y la trampa
// era real: `e163 Abducción Tumbado` y `e89 Clamshell` los excluye la regla de abductor (aunque
// Coach Pro los proponga a partir de las 72 h). Hay un test que lo afirma zona por zona.
// Se dan CANDIDATOS y no un id fijo para poder respetar el entorno: `e73 Puente de Glúteo` solo
// declara `gym`, así que en casa hace falta la alternativa.
// 🔒 CADA CANDIDATO LLEVA SU PROPIO `why` — no lo hereda de la zona. Auditoría de Laura (F2): con
// el `why` en la zona, el fallback conservaba el HUECO y perdía la PROMESA — en 3 de 4 entornos
// entregaba `e134 Bird Dog` (que es CORE) diciendo «para el glúteo medio, que controla la
// rodilla». Es la clase «rótulo que niega lo que rotula» que ya costó v437. Un candidato que no
// sostiene su propia frase NO es candidato: se devuelve null y el puesto queda vacío.
// ✅ ADUCTOR y ABDUCTOR REACTIVADOS (Laura, 2026-08-09) — y por eso existe `fase`.
// Estuvieron RETIRADOS desde v461 con una razón que sigue siendo cierta: el correctivo real del
// abductor ES la abducción, y eso es justo lo que el filtro quita en fase aguda, con razón. «La
// misma cosa es el veneno a las 24 h y la medicina a las 72, y el motor no tiene noción de fase».
// Ahora el triaje existe, así que el motor SÍ puede saber en qué fase está y las dos zonas vuelven
// en DOS ESCALONES:
//  · 🔴 AGUDO (<72 h, o nivel 3, o bandera roja, o sin reporte que lo diga) → `e73`/`e106` Puente
//    de Glúteo: extensión de cadera en línea recta, cero apertura. No lo excluye ninguna regla.
//  · 🟢 SUBAGUDO (≥72 h, nivel ≤2 y sin bandera) → `e163`/`e89`, que SÍ son abducción — y por eso
//    son el único sitio de todo el motor donde un correctivo puede saltarse el filtro de su
//    propia zona (`saltaSuZona`). Los TRES candados de Laura, y ninguno es opcional:
//      1. Salta SOLO su zona. Las demás siguen filtrando: quien reporta «cadera o ingle» mapea a
//         aductor **y** abductor a la vez, así que la otra zona lo bloquea y no progresa nunca —
//         que es exactamente lo que ella quiere («sin exploración no se separa una ingle de un
//         trocánter»).
//      2. CARGA CERO. `e89` se llama «Clamshell con Banda» y aquí va SIN banda; el texto lo dice
//         con esas palabras, porque el nombre del ejercicio afirma lo contrario.
//      3. Un reporte nuevo lo devuelve al escalón agudo — sale gratis: un reporte nuevo tiene
//         menos de 72 h.
const GEN_CORRECTIVE = {
// 🔒 EL SITIO LO DICTA LA FUNCIÓN, y lo decide Laura — no se deriva del `type` del catálogo (mi
// primera versión lo hacía y mandaba solo la movilidad al calentamiento):
//  · ACTIVACIÓN → CALENTAMIENTO. «Activar el glúteo medio DESPUÉS de la sentadilla no protege la
//    sentadilla que ya hizo.» Innegociable en rodilla y tobillo.
//  · FORTALECIMIENTO → AL FINAL. Al principio fatigarían el estabilizador justo antes de exigirlo,
//    que con el manguito es de manual y es peor que no hacer nada.
  hombro: [
    { id: 'e138', sets: 2, reps: 15, porLado: true, when: 'final', why: 'para el manguito rotador', extra: 'Con la banda más floja de lo que creas que necesitas: el manguito se arruina con exceso de carga, no con falta.' },
    { id: 'e109', sets: 2, reps: 15, porLado: false, when: 'final', why: 'para el hombro de atrás y el trapecio bajo' },
  ],
  // ⚠️ Texto corregido por Laura: el face pull FORTALECE trapecio medio/bajo y rotadores; no
  // «descarga» nada. Decir lo contrario es explicar al revés lo que la persona está haciendo.
  cuello: [
    { id: 'e100', sets: 2, reps: 15, porLado: false, when: 'final', why: 'para la espalda alta, que es la que sostiene el cuello' },
    { id: 'e109', sets: 2, reps: 15, porLado: false, when: 'final', why: 'para la espalda alta, que es la que sostiene el cuello' },
  ],
  lumbar: [
    { id: 'e133', sets: 2, reps: 10, porLado: true, when: 'calentamiento', why: 'para el control del core', extra: 'Aguanta 3 segundos en cada repetición: sin ese aguante es un movimiento de brazos y no entrena nada.' },
  ],
  rodilla: [
    { id: 'e89', sets: 2, reps: 15, porLado: true, when: 'calentamiento', why: 'para el glúteo medio, que es el que controla la rodilla' },
  ],
  tobillo: [
    // 🔒 EN TIEMPO, NO EN REPETICIONES (Laura, 2026-08-09): la movilidad se dosifica sosteniendo el
    // rango, y 10 repeticiones rápidas no son lo mismo que 30 segundos ahí metido. El catálogo lo
    // declara `track:'reps'` y NO se toca — es un ejercicio con vida propia fuera del correctivo;
    // aquí se sobrescribe en la COPIA, que es lo único que se prescribe.
    { id: 'e177', sets: 2, reps: 30, track: 'tiempo', porLado: true, when: 'calentamiento', why: 'para recuperar el movimiento del tobillo' },
  ],
  // ── Las dos zonas con FASE. Ver el bloque de arriba: el escalón subagudo es el único sitio del
  // motor donde un correctivo se salta el filtro de su propia zona.
  aductor: [
    { id: 'e163', fase: 'subagudo', saltaSuZona: true, cargaCero: true, sets: 1, reps: 12, porLado: true, when: 'calentamiento',
      why: 'para el glúteo medio, que sostiene la pelvis cuando apoyas una pierna',
      extra: 'Sin banda y sin peso: solo el peso de la pierna, y hasta donde NO duela.' },
    { id: 'e89', fase: 'subagudo', saltaSuZona: true, cargaCero: true, sets: 2, reps: 15, porLado: true, when: 'calentamiento',
      why: 'para el glúteo medio, que sostiene la pelvis cuando apoyas una pierna',
      extra: 'Sin banda, aunque el nombre la mencione: por ahora va solo con el peso de la pierna.' },
    { id: 'e73', fase: 'agudo', sets: 2, reps: 12, porLado: false, when: 'calentamiento',
      why: 'para el glúteo, que trabaja sin que tengas que abrir las piernas',
      extra: 'Con la pelvis firme y sin llevar la pierna hacia afuera. Sube lento y baja lento.' },
    // ⚠️ `e106` no está en la tabla de Coach Pro: es el RESPALDO de entorno de `e73` (que solo
    // declara gym). Dosis 2×10 por lado —más corta que el bilateral— porque es unilateral. Si
    // Laura la quiere distinta, es una línea.
    { id: 'e106', fase: 'agudo', sets: 2, reps: 10, porLado: true, when: 'calentamiento',
      why: 'para el glúteo, que trabaja sin que tengas que abrir las piernas',
      extra: 'Con la pelvis firme y sin llevar la pierna hacia afuera. Sube lento y baja lento.' },
  ],
  abductor: [
    { id: 'e163', fase: 'subagudo', saltaSuZona: true, cargaCero: true, sets: 1, reps: 12, porLado: true, when: 'calentamiento',
      why: 'para el glúteo medio, que es el que te duele y el que hay que volver a poner a trabajar',
      extra: 'Sin banda y sin peso: solo el peso de la pierna, y hasta donde NO duela.' },
    { id: 'e89', fase: 'subagudo', saltaSuZona: true, cargaCero: true, sets: 2, reps: 15, porLado: true, when: 'calentamiento',
      why: 'para el glúteo medio, que es el que te duele y el que hay que volver a poner a trabajar',
      extra: 'Sin banda, aunque el nombre la mencione: por ahora va solo con el peso de la pierna.' },
    { id: 'e73', fase: 'agudo', sets: 2, reps: 12, porLado: false, when: 'calentamiento',
      why: 'para el glúteo mayor, que empuja en línea recta y no te pide abrir la pierna',
      extra: 'Con la pelvis firme y sin llevar la pierna hacia afuera. Sube lento y baja lento.' },
    { id: 'e106', fase: 'agudo', sets: 2, reps: 10, porLado: true, when: 'calentamiento',
      why: 'para el glúteo mayor, que empuja en línea recta y no te pide abrir la pierna',
      extra: 'Con la pelvis firme y sin llevar la pierna hacia afuera. Sube lento y baja lento.' },
  ],
};
// PURA. Devuelve UN ejercicio correctivo o null. Null es una respuesta válida y CORRECTA.
// `limKeys` = TODAS las zonas de la persona · `painKeys` = las que vienen de un reporte suyo
// (para el texto) · `orden` = las zonas por prioridad (el dolor de hoy antes que la nota vieja).
function correctiveFor(limKeys, lib, place, opts) {
  const todas = limKeys || [];
  const o = opts || {};
  // 🔴 F5: el dolor VIGENTE va antes que la nota del coach. `limitationsFor` compone
  // [...notas, ...dolor], así que sin esto una nota de hace ocho meses le gana a un reporte de
  // esta semana y la persona recibe el correctivo de la zona equivocada.
  const pain = o.painKeys || [];
  const zonas = [...new Set([...pain, ...todas])].filter(z => GEN_CORRECTIVE[z]);
  if (!zonas.length) return null;
  const env = place || 'gym';
  const fases = o.fases || {};
  for (const z of zonas) {
    // 🔒 EL DEFAULT ES EL ESCALÓN AGUDO. Sin fase declarada (una zona que viene de la NOTA del
    // coach no tiene reporte del que sacarla) se prescribe lo que es seguro para cualquiera.
    // Los candidatos sin `fase` son de las zonas de siempre y valen en las dos.
    const fase = fases[z] === 'subagudo' ? 'subagudo' : 'agudo';
    const cands = GEN_CORRECTIVE[z].filter(c => !c.fase || c.fase === fase || c.fase === 'agudo');
    // En subagudo se prefiere la progresión, pero si no cabe (entorno, nivel, otra zona que la
    // bloquea) se CAE al escalón agudo en vez de dejar el puesto vacío.
    if (fase === 'subagudo') cands.sort((a, b) => (a.fase === 'subagudo' ? 0 : 1) - (b.fase === 'subagudo' ? 0 : 1));
    for (const cand of cands) {
      const ex = (lib || []).find(e => e && e.id === cand.id);
      if (!ex) continue;
      if (!((ex.env || ['gym']).indexOf(env) >= 0)) continue;
      // 🔴 F1 (P0 de la auditoría): el candado pregunta por TODAS las zonas declaradas, no por la
      // del propio correctivo. Con `[z]` a secas, alguien con rodilla en notas + abductor
      // reportado recibía `e89 Clamshell` todos los días — el ejercicio que la regla de abductor
      // le acababa de borrar de todo el plan. La puerta cerrada con la ventana abierta, otra vez,
      // esta vez DENTRO de la misma función.
      // 🔒 CANDADO 1 DE LAURA: `saltaSuZona` exime de la regla de SU PROPIA zona y de ninguna más,
      // y solo en el escalón subagudo. Es la única excepción de todo el motor a «un correctivo
      // nunca es algo que su zona excluya», y existe porque en abductor el correctivo real ES la
      // abducción. Se comprueban DOS cosas antes de eximir (`cand.fase === fase`), o el día que
      // alguien reordene la lista el escalón agudo hereda la excepción.
      const _exime = !!cand.saltaSuZona && cand.fase === 'subagudo' && fase === 'subagudo';
      if (exerciseContraindicated(ex, _exime ? todas.filter(k => k !== z) : todas)) continue;
      // 🔒 F4: el correctivo pasa por el mismo gate de nivel que el resto del plan, o el día que
      // alguien reordene la lista se cuela un avanzado a un principiante.
      if (o.levelCap != null && exLevelRank(ex) > o.levelCap) continue;
      return {
        ex, zona: z, sets: cand.sets, reps: cand.reps, porLado: !!cand.porLado,
        why: cand.why, extra: cand.extra || '',
        cuando: cand.when || 'final',
        fase, track: cand.track || null, cargaCero: !!cand.cargaCero,
        // 🔴 F3: la zona puede venir de la NOTA del coach y entonces nadie reportó nada. Decirle
        // «por el dolor que reportaste» a quien no reportó es afirmar algo falso — y es justo el
        // caso del PO, que preguntó por el manguito sin haber reportado ningún dolor.
        // La fuente se decide POR ZONA, no globalmente: `dolor` si el reporte sigue vigente,
        // `sigue` si lo hubo y ya caducó (mantenimiento), y `nota` si nunca hubo reporte y la
        // zona viene de la ficha. Decidirlo global hacía que a quien solo tenía nota del coach se
        // le dijera «aunque ya no te duela» — a alguien que nunca dijo que le doliera.
        fuente: pain.indexOf(z) >= 0 ? 'dolor' : ((o.corrKeys || []).indexOf(z) >= 0 ? 'sigue' : 'nota'),
      };
    }
  }
  return null;
}

// Calentamientos contraindicados por zona (ids de WARMUP_LIBRARY, en app-6-extra).
// Hasta hoy el filtro limpiaba el entreno y dejaba el calentamiento intacto: a quien declaraba
// hernia L4-L5 se le seguía pidiendo «dobla el cuerpo hacia adelante y RELAJA la espalda
// completamente» (we3) antes de entrenar. Se filtra por DOS vías porque ninguna basta sola:
//  · por NOMBRE con el mismo GEN_ZONE_EXCL del entreno (atrapa lo de hoy y lo que se agregue);
//  · por ID para los que el nombre NO delata — «Apertura de cadena posterior» no dice «flexión»
//    y es la postura de mayor presión intradiscal medida en humanos.
// `wac3` añadido el 2026-08-02 por segundo veredicto de Laura: «Rotación de cadera tumbado» se
// ejecuta con las RODILLAS AL PECHO (flexión lumbar de rango final) y desde ahí rota — flexión +
// rotación es el mecanismo de cizalla del anillo en L4-L5. Estar tumbado quita la carga, no el
// rango. HOY no cambia ni un plan (es el 3.º de 3 en `activacion_core` y el motor toma 2): entra
// precisamente por eso, porque es una trampa que se armaría sola el día que alguien reordene el
// array. `wc2` «Estocada con rotación» NO entra: la estocada bloquea la pelvis, así que la
// rotación es TORÁCICA y sin carga — es tratamiento, no riesgo (mismo criterio que salvó las
// sentadillas terapéuticas).
// Zonas nuevas (adenda de Laura, 2026-08-08) y por qué cada id hace falta —el nombre no delata—:
// `wc2` «Estocada con rotación» no dice apertura de cadera · `wai2` «Desplante alterno» no dice
// zancada · `we4» «Plancha de hombros» y `wa1` «Flexión de pecho» no dicen que el cuello queda
// colgando · `wac1` «Plancha isométrica corta» no dice que el cuello sostiene la cabeza ·
// `wt2` «Movilidad tobillo en pared» no dice que es dorsiflexión BAJO CARGA.
// 🔒 `wt1` «Círculos de tobillo» se queda DENTRO a propósito: sin carga y sentado, es el
// tratamiento y no el riesgo. Mismo criterio que salvó al wall-sit y al sit-to-stand.
const WARMUP_ZONE_EXCL_IDS = {
  lumbar: ['we3', 'we5', 'wai3', 'wac3'],
  rodilla: ['wr2', 'wai1', 'wai2'],
  hombro: ['wh3'],
  aductor: ['wc2', 'wc3', 'wc5', 'wai2'],
  abductor: ['wc2', 'wc3', 'wc5', 'wai2'],
  cuello: ['we3', 'we4', 'wa1', 'wa2', 'wac1'],
  tobillo: ['wai1', 'wai2', 'wai4', 'wt2'],
};
// Zonas DECLARADAS por esa persona para las que ESTE calentamiento está contraindicado. Puras.
// Alimentan la marca del selector manual del coach: cuando él arma el calentamiento a mano NO se
// filtra nada (ahí decide una persona, y hacer desaparecer opciones en silencio sería peor), pero
// tiene que VERLO. Misma fuente que el generador — jamás una segunda lista, que se separan.
function warmupWarnZones(wu, limKeys) {
  return (limKeys || []).filter(z => warmupContraindicated(wu, [z])).map(z => GEN_ZONE_LABEL[z]).filter(Boolean);
}
// «Ojo con su zona lumbar y rodilla». `propio` = el coach editando SU propio entrenamiento.
// Enuncia un HECHO (qué declaró la persona), nunca un consejo clínico ni un permiso: cero jerga
// («contraindicado», «L4-L5», «flexión») en algo que ve un entrenador, no un médico.
function warmupWarnText(zonas, propio) {
  zonas = zonas || [];
  if (!zonas.length) return '';
  const l = zonas.length === 1 ? zonas[0] : zonas.slice(0, -1).join(', ') + ' y ' + zonas[zonas.length - 1];
  return 'Ojo con ' + (propio ? 'tu ' : 'su ') + l;
}
// PURA. ¿este calentamiento está contraindicado para estas zonas? `limKeys` = parseLimitations().keys
// ¿Este EJERCICIO está contraindicado para estas zonas? PURA. Misma fuente que el generador
// (`GEN_ZONE_EXCL`) — jamás una segunda lista, que se separan.
// Nace del hallazgo más embarazoso del dictamen de Laura: el selector de sustitución filtraba por
// MÚSCULO, así que a quien decía «no puedo con esta sentadilla, me duele la rodilla» la app le
// ofrecía sentadilla en Smith y sentadilla hack. La reacción de la app al dolor era ofrecer más
// de lo que duele.
function exerciseContraindicated(ex, limKeys) {
  if (!ex || !limKeys || !limKeys.length) return false;
  const n = _norm(ex.name);
  return limKeys.some(z => {
    const ids = GEN_EXCL_IDS[z];
    if (ids && ex.id && ids.indexOf(ex.id) >= 0) return true;
    const re = GEN_ZONE_EXCL[z];
    return !!re && re.test(n);
  });
}

function warmupContraindicated(wu, limKeys) {
  if (!wu || !limKeys || !limKeys.length) return false;
  const n = _norm(wu.name);
  return limKeys.some(z => {
    const ids = WARMUP_ZONE_EXCL_IDS[z];
    if (ids && ids.indexOf(wu.id) >= 0) return true;
    const re = GEN_ZONE_EXCL[z];
    return !!re && re.test(n);
  });
}

// 🔴 EL DOLOR QUE REPORTA LA PERSONA PESA IGUAL QUE LA NOTA DEL COACH — y hasta v454 no pesaba
// NADA. `generarRutinas` y `buildWarmup` leían SOLO `parseLimitations(client.notes)`, o sea lo que
// escribió el COACH; `client.painCare` —lo que la persona declara con el ⚠️— no entraba por ningún
// lado. Consecuencia medida: quien marcaba 🔴 «rodilla» recibía al día siguiente la semana entera
// con sentadillas, y el calentamiento sin filtrar. El mapa `_PAIN_ZONE_TO_EXCL` existía desde
// v355… usado SOLO para la propuesta que la app le hace al coach cuando alguien se estanca.
// Hallazgo P0 del dictamen de Laura (`docs/dictamen-laura-dolor-2026-08-08.md` §0).
//
// UNA función por la que pasan TODAS las rutas: si mañana aparece otra superficie se le pide esto
// y NO una segunda lista, que es exactamente como se separan (lección del filtro de lesiones y el
// calentamiento, v424: puerta cerrada, ventana abierta).
// ── VIDA DEL TRABAJO CORRECTIVO (auditoría de Laura, respuesta 4 — «la más importante») ───────
// 🔴 EL REPORTE DE DOLOR ES UN EVENTO; EL DÉFICIT QUE LO CAUSÓ ES UNA CONDICIÓN. El reporte
// caduca a los 14 días (`PAIN_TTL_MS`) y un manguito no se fortalece en 14 días: tarda 6-8
// semanas. Si el correctivo muriera con el reporte, la app se lo quitaría a la persona **justo
// cuando empieza a servir**, que es la receta exacta de la recaída — literalmente el patrón del
// aductor, la lesión que más recae porque deja de doler mucho antes de estar curada.
// Por eso el correctivo mira una ventana propia y MÁS LARGA, y **no le importa `cleared`**: haber
// tocado «Ya estoy bien ✓» significa que se fue el dolor, no que se fue el déficit.
const CORRECTIVE_TTL_MS = 56 * 86400000;   // 8 semanas
const CORRECTIVE_REVIEW_MS = 28 * 86400000; // 4 semanas → aviso al coach
function correctiveZoneKeys(client, nowTs) {
  const now = nowTs || Date.now();
  const out = [];
  ((client && client.painCare) || []).forEach(p => {
    if (!p || !p.at) return;
    const dt = now - Date.parse(p.at);
    if (!(dt >= 0 && dt < CORRECTIVE_TTL_MS)) return;
    const z = _PAIN_ZONE_TO_EXCL[p.area];
    if (!z) return;
    (Array.isArray(z) ? z : [z]).forEach(k => out.push(k));
  });
  return [...new Set(out)];
}
// ── FASE de cada zona (Laura, 2026-08-09) — lo que faltaba para devolver aductor y abductor ────
// 🔴 «La misma cosa es el veneno a las 24 h y la medicina a las 72.» El motor no tenía forma de
// saber en cuál de las dos estaba y por eso las dos zonas quedaron retiradas en v461. Con el
// triaje ya construido, sí la tiene.
// SUBAGUDO exige las TRES cosas a la vez, sobre TODOS los reportes vigentes de esa zona:
//   ≥72 h · nivel ≤2 · sin bandera roja.
// Cualquier otra cosa —incluido no tener reporte ninguno, que es el caso de una zona que viene de
// la nota del coach— es AGUDO. 🔒 El default cae del lado seguro, como la regla 3 del triaje: un
// dato que falta es una señal, no un permiso.
// ⚠️ LECTURA LITERAL A PROPÓSITO: un reporte de nivel 3 mantiene la zona en agudo durante las 8
// semanas de la ventana, aunque ya haya pasado el tiempo. Es lo que ella escribió («<72 h **o**
// nivel 3») y el precio de equivocarse hacia el otro lado es peor. Si quiere que el nivel 3 caduque
// con el reporte (14 días), es una condición más.
const CORRECTIVE_ACUTE_MS = 72 * 3600000;
function correctivePhases(client, nowTs) {
  const now = nowTs || Date.now();
  const out = {};
  ((client && client.painCare) || []).forEach(p => {
    if (!p || !p.at) return;
    const dt = now - Date.parse(p.at);
    if (!(dt >= 0 && dt < CORRECTIVE_TTL_MS)) return;
    const z = _PAIN_ZONE_TO_EXCL[p.area];
    if (!z) return;
    const agudo = dt < CORRECTIVE_ACUTE_MS
      || (parseInt(p.level, 10) || 0) >= 3
      || (parseInt(p.triaje, 10) || 0) >= 3
      || ((p.flags || []).length > 0);
    (Array.isArray(z) ? z : [z]).forEach(k => {
      if (out[k] !== 'agudo') out[k] = agudo ? 'agudo' : 'subagudo';
    });
  });
  return out;
}
// Lo que el COACH tiene que ver. 🔒 Un correctivo que lleva un mes idéntico o ya funcionó o no
// está funcionando, y las dos cosas piden decisión humana; a las 8 semanas se acaba solo y él
// tiene que saberlo ANTES. Es la regla de v434: un estado que no expira por sí mismo necesita su
// aviso al responsable, o alguien se queda meses en él sin que nadie lo mire.
function correctiveReview(client, nowTs) {
  const now = nowTs || Date.now();
  let peor = null;
  ((client && client.painCare) || []).forEach(p => {
    if (!p || !p.at || !_PAIN_ZONE_TO_EXCL[p.area]) return;
    const dt = now - Date.parse(p.at);
    if (!(dt >= 0 && dt < CORRECTIVE_TTL_MS)) return;
    if (dt < CORRECTIVE_REVIEW_MS) return;
    const semanas = Math.floor(dt / (7 * 86400000));
    if (!peor || semanas > peor.semanas) peor = { area: p.area, semanas, side: p.side || null };
  });
  return peor;
}

function painZoneKeys(client, nowTs) {
  const act = painCareActive(client && client.painCare, nowTs) || [];
  const out = [];
  act.forEach(p => {
    // Una zona puede mapear a DOS reglas («cadera o ingle» → aductor + abductor).
    const z = _PAIN_ZONE_TO_EXCL[p && p.area];
    if (!z) return;
    (Array.isArray(z) ? z : [z]).forEach(k => out.push(k));
  });
  return [...new Set(out)];
}

// Limitaciones EFECTIVAS de una persona = lo que escribió el coach ∪ lo que ella declaró que le
// duele. Misma forma que `parseLimitations` (es su superconjunto), para que ningún llamador tenga
// que enterarse. `fromPain` deja por escrito qué zonas entraron por el reporte de dolor: el coach
// tiene que poder ver QUÉ hizo la app, o va a contradecirla (§6.2 del dictamen).
function limitationsFor(client, nowTs) {
  const lim = parseLimitations((client && client.notes) || '');
  const fromPain = painZoneKeys(client, nowTs);
  if (!fromPain.length) return Object.assign({}, lim, { fromPain: [] });
  const keys = [...new Set([...(lim.keys || []), ...fromPain])];
  const hasExclusions = keys.some(z => GEN_ZONE_EXCL[z]);
  const dolorTxt = fromPain.map(z => GEN_ZONE_LABEL[z]).filter(Boolean).join(', ');
  return Object.assign({}, lim, {
    detected: true,
    keys,
    zones: [...new Set(keys.map(z => GEN_ZONE_LABEL[z]).filter(Boolean))],
    hasExclusions,
    fromPain,
    // El aviso DICE que el filtro salió de un reporte de la propia persona, no de sus notas. Y
    // sigue sin afirmar que lo que queda sea seguro para ella — esa regla no se toca.
    advice: (lim.advice ? lim.advice + ' ' : '') +
      `Además, ${dolorTxt ? 'reportó dolor en ' + dolorTxt : 'reportó dolor'}: quitamos de su plan y de su calentamiento lo que suele molestar ahí. Es un filtro automático por lo que ELLA marcó, NO una valoración clínica.`,
  });
}

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
  // Compromiso nervioso: solo se anuncia si además hay algo detectado (un texto suelto con
  // "debilidad" hablando de otra cosa no debe disparar una derivación médica).
  const nerve = detected && GEN_NERVE_RE.test(n);
  return {
    detected,
    keys: uniq,
    zones: [...new Set(uniq.map(z => GEN_ZONE_LABEL[z]))],
    hasExclusions,
    nerve,
    // El texto dice QUÉ SE QUITÓ; jamás que lo que queda esté bien para esa persona. La versión
    // vieja ("Se excluyeron ejercicios contraindicados y se priorizaron variantes seguras")
    // afirmaba una revisión clínica que nunca ocurrió y le bajaba la guardia a quien revisa.
    advice: !detected ? ''
      // Sin repetir «revisa cada día»: el banner del coach ya cierra con eso (se vio MIRANDO
      // la captura, no leyendo el texto — el string suelto no delata la redundancia).
      : hasExclusions ? 'Quitamos lo que suele molestar ahí: flexión y carga sobre la columna, giros cargados e impacto. Es un filtro automático por lo que escribió, NO una valoración clínica: ajusta cargas y rangos, y confírmale qué hace hoy sin dolor.'
      : 'Limitación sin zona específica: NO se excluyó ningún ejercicio automáticamente. Revísala y ajústala a mano antes de aprobar.',
    nerveAdvice: !nerve ? ''
      : 'Menciona síntomas que pueden venir del nervio (dolor que baja por la pierna, hormigueo o falta de fuerza). Antes de cargar, que lo valore un profesional de la salud: este plan es un borrador y no reemplaza esa valoración.',
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
  // ⛔ La SEMANA DE DESCARGA ya NO pasa por aquí (v434). Pasaba: `opts.deload` bajaba una serie
  // dentro del generador, y el generador VUELVE A ELEGIR EJERCICIOS — por eso el PO recibía «una
  // rutina totalmente distinta». Ahora la descarga es un modo temporal sobre el plan que la persona
  // YA tiene (`startDeload`/`endDeload`), sin tocar la selección. Ver §3 del plan vivo.
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

// ── EJERCICIOS RETIRADOS: a dónde va lo que apuntaba a ellos ──────────────────────────────────
// Vivía en app-2-login.js. Se subió a avi-core (v484) porque el remapeo hace falta en DOS
// superficies —el arranque del coach y el del asesorado— y dos copias de este mapa serían dos
// verdades sobre el mismo hecho.
//   e38  «Curl Femoral Acostado en Máquina» = e15 (2026-06-10)
//   e32  = e19
//   e181 «Escaladores» = e81 · e208 «Caminata del Granjero» = e136
//   e221 «Pullover con Mancuerna» = e137 · e224 «Press Francés con Barra Z» = e12
//   e227 «Curl de Bíceps en Banco Inclinado» = e121                        (los 5 últimos, v408)
const REMOVED_EXERCISES = { 'e38': 'e15', 'e32': 'e19', 'e181': 'e81', 'e208': 'e136', 'e221': 'e137', 'e224': 'e12', 'e227': 'e121' };

// prsRemapRetired(prs, remap) → { prs, moved }. PURA.
// 🔴 EL DEFECTO (v484): al retirar un ejercicio duplicado, `dedupeExercises` remapeaba el catálogo
// y las RUTINAS… y dejaba los RÉCORDS apuntando al id muerto. La rutina pasaba a `e15` y el récord
// se quedaba en `e38`, así que la app dejaba de encontrarlo. Puerta cerrada, ventana abierta — la
// misma clase que el filtro de lesiones y el calentamiento (v424).
// Medido contra producción el 14-ago: **3 récords varados en `e38`** (Kathe, Nataly, Miguel; ningún
// otro id retirado tiene récords, y ni las rutinas ni el historial quedaron con huérfanos), y la
// consecuencia real es **Miguel sin peso sugerido** en un ejercicio donde tiene marca de 30 kg.
// 🔒 Cuando el id bueno YA tiene récord, se funden con `isBetterPR` — la ÚNICA definición de
// récord de la app. Inventar aquí otra regla («se queda el más reciente») sería una segunda
// definición de lo mismo, que es la forma exacta del bug de v435/v444.
function prsRemapRetired(prs, remap) {
  const src = (prs && typeof prs === 'object') ? prs : {};
  const mapa = remap || REMOVED_EXERCISES;
  const viejos = Object.keys(mapa).filter(k => src[k]);
  if (!viejos.length) return { prs: src, moved: 0 };
  const out = Object.assign({}, src);
  let moved = 0;
  viejos.forEach(viejo => {
    const rec = out[viejo];
    const nuevo = mapa[viejo];
    delete out[viejo];              // el huérfano se va SIEMPRE: si no, queda duplicado en pantalla
    if (!nuevo || !rec || typeof rec !== 'object') { moved++; return; }
    const val = rec.val != null ? rec.val : rec.kg;
    if (isBetterPR(val, rec.reps, rec.unit || 'kg', out[nuevo])) out[nuevo] = rec;
    moved++;
  });
  return { prs: out, moved: moved };
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
// ── Escalón de carga: cuánto se sube, proporcional a lo que se levanta ──
// 🔴 El paso fijo de 2,5 kg está calibrado para quien levanta 40: sobre una mancuerna de
// 2,5 kg es un **+100%**, un salto que ninguna principiante puede dar. Por eso quien arranca
// liviano se queda liviano para siempre.
function loadStep(kg) {
  kg = parseFloat(kg) || 0;
  if (kg < 10) return 1;
  if (kg < 30) return 2.5;
  return 5;
}

// Desde un PR guardado ({val|kg, reps, unit:'kg'}) → kg sugeridos para targetReps.
// Solo aplica a modalidad de peso; PRs en reps/seg/min no estiman 1RM.
// 🔴 BUCLE CERRADO, medido en producción 2026-08-03 (hallazgo de Valery): estimaba el 1RM
// desde el récord y devolvía el 95% para ESAS MISMAS repeticiones — que da exactamente el
// peso que la persona ya levanta. Caso real: PR de 10 kg × 12 → 1RM 14 → 14/1,4 × 0,95 = 9,5
// → redondea a **10**. El peso sugerido no sube ⇒ el récord no sube ⇒ el detector lo lee como
// estancamiento. Una asesorada llevaba **10 sesiones en 2 meses remando con 10 kg** mientras
// hacía hip thrust con 100: no estaba fatigada, estaba INFRACARGADA por el propio consejo.
// Y con más de 15 reps devolvía `null` (`estimate1RM`), o sea que la app se CALLABA justo
// cuando alguien llega a 20 repeticiones y se ganó el salto de mancuerna.
// Regla nueva = doble progresión, la de toda la vida: si ya cumpliste las reps objetivo con
// ese peso, lo siguiente es SUBIR.
function suggestFromPR(pr, targetReps, opts) {
  if (!pr || (pr.unit || 'kg') !== 'kg') return null;
  const kg = parseFloat(pr.val != null ? pr.val : pr.kg);
  if (!(kg > 0)) return null;
  const reps = parseInt(pr.reps) || 1;
  const tgt = parseInt(targetReps) || 10;
  if (reps >= tgt) {
    // ⚠️ ESTA RAMA SUBE EL PESO. Quien la use dentro de un contexto que quiere BAJARLO tiene que
    // toparla, no encadenarle un factor: hasta v481 la semana de descarga multiplicaba por 0,9 el
    // número que ya había salido subido de aquí, y el resultado quedaba POR ENCIMA del propio
    // récord en 130 de 148 casos reales (medido 14-ago, `scripts/deload-carga.mjs`). El tope vive
    // en `deloadSuggestKg`.
    const paso = (opts && opts.step) || loadStep(kg);
    return Math.round((kg + paso) * 2) / 2;   // a medio kilo: es una sugerencia, no un disco
  }
  // El récord es a MENOS reps que el objetivo → sí hay que estimar (más reps = menos peso).
  const e1 = estimate1RM(kg, Math.min(reps, 15));
  return e1 ? suggestLoad(e1, tgt, opts) : null;
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
  // ── LOTE DE MÁQUINAS (e228-e249, 2026-08-18). Criterio: 'P' la máquina GUIADA que un novato usa
  // sin técnica previa (prensa, poleas, selectorizadas, asistida, Smith en banca); 'I' lo que exige
  // bisagra de cadera, banco declinado o estabilidad sobre una pierna; 'A' solo el Pendlay, que
  // arranca parado desde el suelo y no perdona una espalda redondeada.
  e228:'P',e229:'P',e230:'I',e231:'P',e232:'I',e233:'P',e234:'P',e235:'P',e236:'P',e237:'P',e238:'P',e239:'P',e240:'P',e241:'I',e242:'P',e243:'I',e244:'I',e245:'I',e246:'I',e247:'A',e248:'P',e249:'P',
  // e250: la pendular la señaló el PO al revisar el lote. Guiada y con la espalda apoyada: es de
  // las sentadillas MÁS amables para un principiante, así que va 'P'.
  e250:'P',
  // e251: bisagra de cadera, aunque la barra vaya guiada. No es de entrada: si la espalda se
  // redondea el ejercicio se vuelve otra cosa. 'I'.
  e251:'I',
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
  // e186 «Salto del Patinador» → 'A' (2026-08-03, Valery): es pliometría de alto impacto, igual
  // que sus hermanas e185 «Zancadas con Salto» y e187 «Salto al Cajón», que sí estaban en 'A'.
  // El criterio escrito seis líneas más arriba dice 'A' = impacto alto; esta contradecía el
  // propio criterio y era alcanzable por una principiante EN FASE DE ADAPTACIÓN, donde el
  // impacto está explícitamente prohibido.
  e182:'P',e183:'P',e184:'I',e185:'A',e186:'A',e187:'A',e188:'I',e189:'I',
  e190:'I',e191:'A',e192:'I',e193:'P',e194:'I',e195:'P',e196:'I',e197:'P',
  // e205 «Zancada Lateral con Salto» → 'A' por el mismo motivo que e186.
  e198:'P',e199:'P',e200:'A',e201:'I',e202:'A',e203:'I',e204:'A',e205:'A',
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
  // Los ids de `GEN_EXCL_IDS` van por la MISMA puerta que las regex: si el generador solo mirase
  // el nombre, `e93` («Sentadilla con Banda» = abductor disfrazado) se colaría y la lista sería
  // decorativa. Es el caso que el nombre genuinamente no delata.
  const ids = new Set();
  lim.keys.forEach(z => (GEN_EXCL_IDS[z] || []).forEach(i => ids.add(i)));
  return ex => {
    if (ex && ex.id && ids.has(ex.id)) return true;
    const n = _norm(ex.name); return res.some(re => re.test(n));
  };
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
  const scheme = genSchemeFor(client.goal || '', level, opts.adaptation);
  // `limitationsFor` y no `parseLimitations`: el dolor que declaró la persona excluye igual que la
  // nota del coach (P0 del dictamen de Laura). Determinista — la ventana de vigencia se mide
  // contra `opts.now`, no contra el reloj.
  const lim = limitationsFor(client, Date.parse(now) || Date.now());
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
  // En qué días de la semana cae el plan. `opts.startDay` = nombre del día en que la persona
  // ARRANCA (lo usa el auto-registro para que el día 1 tenga entreno). Sin él, lunes: es lo que
  // el coach espera al generar desde su panel.
  const _startIdx = opts.startDay ? Math.max(0, GEN_WEEK_DAYS.indexOf(opts.startDay)) : 0;
  const _genDays = genWeekDays(codes.length, _startIdx);
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
      ? `⚠️ REVISAR — limitación detectada (${lim.zones.join(', ')}). ${lim.advice}${lim.nerve ? ' 🚑 ' + lim.nerveAdvice : ''} Ajusta antes de aprobar.`
      : scheme.adaptation
      ? '🌱 Fase de adaptación (primeras semanas): 15-20 reps con poco o nada de peso, sin llegar al fallo. La técnica primero; las cargas suben cuando el patrón esté limpio.'
      : 'Borrador generado automáticamente. Revisa y ajusta antes de asignar.';
    return {
      id: idFn(), name: nm, day: _genDays[idx] || ('Día ' + (idx + 1)), shift: null,
      note, why: client.goal || '', restSec: scheme.restSec, exercises: exs,
      // needsReview también si el día quedó VACÍO (lib/entorno sin match) — el coach no
      // debe poder aprobar un día en blanco sin alerta. Auditoría 2026-06-21.
      createdAt: now, generated: true, reviewed: false, needsReview: lim.detected || exs.length === 0,
    };
  });
  // 🔴 TRABAJO CORRECTIVO: la mitad que faltaba. El motor sabía quitar lo que hace daño y no
  // sabía poner lo que hace falta (lo destapó el PO con «necesito fortalecer el manguito»).
  // Va como accesorio AL FINAL de cada día —no reemplaza nada— y solo si hay una zona declarada
  // con bloque. Lleva su propio `why` porque la persona tiene que saber por qué apareció: un
  // ejercicio nuevo sin explicación se lee como un error de la app (regla de v434).
  // 🔒 CON DOLOR QUE IMPIDE HACER EL EJERCICIO (nivel 3) NO SE PRESCRIBE NADA. Laura: con ese
  // nivel la sesión no debería existir, y añadirle un ejercicio a quien acabamos de decirle que
  // pare es contradecirnos en la misma pantalla. (Mapeo provisional: cuando exista el triaje de
  // 5 niveles, esto pasa a ser N3 y N4.)
  const _nowTs = Date.parse(now) || Date.now();
  const _bloquea = painCareActive(client.painCare, _nowTs).some(p => p && p.level === 3);
  // 🔴 Las zonas del CORRECTIVO no son las del filtro: viven 8 semanas y sobreviven a que el
  // reporte caduque o a que la persona toque «Ya estoy bien». El filtro protege del dolor de HOY;
  // el correctivo trabaja el déficit que lo causó, y ese tarda 6-8 semanas.
  const _corrKeys = correctiveZoneKeys(client, _nowTs);
  const _corr = _bloquea ? null : correctiveFor([...new Set([...lim.keys, ..._corrKeys])], lib, place, {
    painKeys: painZoneKeys(client, _nowTs),   // dolor VIGENTE: manda sobre la nota vieja (F5)
    corrKeys: _corrKeys,                      // reportes de hasta 8 semanas → texto de mantenimiento
    levelCap: _gate.cap,                      // el correctivo pasa el mismo gate que el resto (F4)
    fases: correctivePhases(client, _nowTs),  // agudo/subagudo por zona (aductor y abductor)
  });
  if (_corr) routines.forEach(r => {
    if (!r.exercises || !r.exercises.length) return;          // un día vacío no se «arregla» con esto
    if (r.exercises.some(e => e.id === _corr.ex.id)) return;  // ya lo tiene: no duplicar
    // 🔴 F3: el texto dice de dónde salió la zona. «por el dolor que reportaste» a quien no
    // reportó nada (la zona venía de la nota del coach) es afirmar algo falso.
    // 🔒 Tres textos, no dos. El tercero es el que evita que lo abandone: si ya no le duele y
    // nadie le explica por qué sigue haciéndolo, lo deja — y ahí es justo cuando empieza a servir.
    const _porQue = _corr.fuente === 'dolor'
      ? 'por el dolor que reportaste'
      : _corr.fuente === 'nota'
      ? 'por lo que tu coach anotó en tu ficha'
      : 'y se queda un tiempo aunque ya no te duela: esto es lo que evita que vuelva';
    const _dosis = _corr.porLado ? ' Hazlo por cada lado.' : '';
    r.exercises.push(Object.assign({}, _corr.ex, {
      sets: _corr.sets, reps: _corr.reps,
      // 🔒 El `track` de la COPIA manda sobre el del catálogo: `e177` se dosifica en TIEMPO como
      // correctivo (30 s por lado) y en repeticiones cuando el coach lo pone a mano. Sin esto,
      // `reps:30` se leería como 30 repeticiones de movilidad, que es otra cosa.
      // (Sin `track` propio no se toca la clave: el ejercicio conserva la del catálogo.)
      corrective: true, correctiveZone: _corr.zona, correctiveWhen: _corr.cuando,
      correctiveFase: _corr.fase,
      correctiveWhy: `Va aquí ${_corr.why}, ${_porQue}. No lo cargues: busca sentirlo, no moverlo con peso.${_dosis}${_corr.extra ? ' ' + _corr.extra : ''}`,
    }));
    if (_corr.track) r.exercises[r.exercises.length - 1].track = _corr.track;
  });
  const envGaps = [...st.envShortfall];
  // Eleva la revisión global si hay huecos de entorno o algún día sin ejercicios (antes solo
  // lo hacían las limitaciones, así que un plan a medio cubrir pasaba sin bandera).
  const anyEmpty = routines.some(r => !(r.exercises || []).length);
  return { routines, needsReview: lim.detected || envGaps.length > 0 || anyEmpty, limitations: lim, place, envGaps, adaptation: !!scheme.adaptation, loadProfile };
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
// ── Cordura RELATIVA: el cero de más que el tope absoluto no ve ────────────
// 🔴 El tope de `_SANE_MAX.kg` (1.000) atrapa el 800.000.090 de v417 pero deja pasar los
// **200 kg × 12** que una asesorada tiene sellados como récord de peso muerto piernas rígidas
// (medido en producción 2026-08-03, en 5 fechas). 200 es un número «posible» en abstracto; lo
// que lo delata es que **sus otras dos series de ESE MISMO día fueron de 20 kg**.
// La regla es relativa a la propia persona y DENTRO de la sesión, no un absoluto:
//   · un cero de más CONVIVE con valores normales el mismo día (20 / 20 / 200)
//   · progresar hace que el valor nuevo SEA el normal (todas las series suben a la vez)
// Medido sobre la base real: con el criterio absoluto se marcaban 21 series y **la mayoría era
// PROGRESO REAL** (alguien que pasó de 2,5 a 10 kg). Con este, 9 series y ninguna es progreso.
const _SANE_REL_FACTOR = 4;    // veces la mediana de las OTRAS series del ejercicio ese día
const _SANE_REL_MIN_SETS = 3;  // por debajo de 3 no hay con qué comparar: no se acusa a nadie
function _medianOf(nums) {
  const s = nums.slice().sort((a, b) => a - b);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
// ¿El kg de la serie `i` es imposible frente a las otras series del mismo ejercicio ese día?
function _saneRelKg(sets, i) {
  const kgs = (sets || []).map(s => parseFloat(s && s.kg)).map(k => (isFinite(k) && k > 0 ? k : null));
  if (kgs.filter(k => k != null).length < _SANE_REL_MIN_SETS) return false;
  const mio = kgs[i];
  if (mio == null) return false;
  const otros = kgs.filter((k, j) => j !== i && k != null);
  if (otros.length < _SANE_REL_MIN_SETS - 1) return false;
  const m = _medianOf(otros);
  return m > 0 && mio >= _SANE_REL_FACTOR * m;
}

// Versión para el MOMENTO DE ANOTAR: recibe los kg que ya lleva ese ejercicio hoy y dice si el
// de la posición `i` desentona. Misma regla que la auto-cura, para que la app no avise de algo
// que después no limpia (ni al revés). AVISA, no bloquea: un día pesado de verdad se confirma.
// ── Tope RELATIVO A LA PROPIA PERSONA (pedido del PO, 2026-08-08) ────────────────────────────
// El tope duro de 1.000 kg (v417) atrapa el disparate absoluto y `kgOutlier` atrapa el cero de más
// comparando con las OTRAS series de ese día. Entre los dos queda un hueco por el que se cuela
// justo lo que el PO reporta: «a este niño le parece muy divertido poner un millón de kilos».
//   · 1.000 kg es «posible» en abstracto, así que 800 en una prensa pasa el tope.
//   · Y si lo pone en TODAS las series, la mediana del día también es 800 → `kgOutlier` no salta.
// Aquí la referencia es **su propia mejor marca en ESE ejercicio**, que es la única que sabe que
// 200 kg en una patada de glúteo es imposible aunque en un peso muerto no lo sea.
//
// 🔬 UMBRAL DERIVADO MIDIENDO, no escrito de memoria (1.258 series reales de la nube):
//   · solo `> 2×` marcaba 14 series, y muchas eran progreso REAL — doblar de 5 a 10 kg en un
//     accesorio es normal; doblar de 100 a 200 es imposible. Por eso hacen falta LAS DOS
//     condiciones: el múltiplo Y un salto absoluto de +20 kg.
//   · sin referencia previa en ese ejercicio (28,6% de las series), cae a su mejor marca GLOBAL.
//   Con la regla completa dispara en **9 de 1.258 (0,7%)**, una cada 140 series.
const KG_CONFIRM_FACTOR = 2, KG_CONFIRM_SALTO = 20, KG_CONFIRM_PISO = 120;
function kgConfirmLimit(bestEx, bestGlobal) {
  const be = parseFloat(bestEx) || 0;
  if (be > 0) return Math.max(KG_CONFIRM_FACTOR * be, be + KG_CONFIRM_SALTO);
  const bg = parseFloat(bestGlobal) || 0;
  return Math.max(KG_CONFIRM_FACTOR * bg, KG_CONFIRM_PISO);
}
// ¿Hay que pedirle que confirme este peso? PURA. No bloquea nada por sí sola: quien la llama
// decide, y la decisión del PO es que no se acepte hasta confirmar (un día pesado de verdad se
// confirma una vez y sigue; el que está jugando se topa siempre, aunque lo ponga en todas las series).
function kgNeedsConfirm(kg, bestEx, bestGlobal) {
  const v = parseFloat(kg);
  if (!isFinite(v) || v <= 0) return false;
  return v > kgConfirmLimit(bestEx, bestGlobal);
}

function kgOutlier(kgs, i) {
  const nums = (kgs || []).map(k => { const n = parseFloat(k); return isFinite(n) && n > 0 ? n : null; });
  const mio = nums[i];
  if (mio == null) return false;
  const otros = nums.filter((k, j) => j !== i && k != null);
  if (otros.length < _SANE_REL_MIN_SETS - 1) return false;
  const m = _medianOf(otros);
  return m > 0 && mio >= _SANE_REL_FACTOR * m;
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
      const sets = ex.sets.map((s, i) => {
        if (!s) return s;
        let sTocado = false; const ns = { ...s };
        Object.keys(_SANE_MAX).forEach(f => {
          if (_saneNum(ns[f], _SANE_MAX[f])) { ns[f] = ''; sTocado = true; fixed++; }
        });
        // Cordura relativa: el kg que no cuadra con las OTRAS series de ese día. Se pone en
        // BLANCO, jamás se recorta: recortar 200 a 100 afirmaría que levantó 100, tan falso
        // como el original (lección de v417).
        if (!sTocado && _saneRelKg(ex.sets, i)) { ns.kg = ''; sTocado = true; fixed++; }
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
// `history` (opcional, YA saneado) permite la cordura RELATIVA: un récord de 200 kg cuando lo
// más pesado que queda en todo su historial de ese ejercicio son 40 kg es el fantasma del cero
// de más, y **mientras siga ahí esa persona no puede volver a batir ese récord nunca** — el
// ejercicio le queda «estancado» de por vida y su gráfica inflada (medido: ×4). Sin `history`
// se comporta exactamente como antes.
function sanitizePrs(prs, history) {
  const src = (prs && typeof prs === 'object') ? prs : {};
  // Mejor kg que SOBREVIVE en el historial, por id de ejercicio.
  const mejor = {};
  (Array.isArray(history) ? history : []).forEach(h => {
    ((h && h.exercises) || []).forEach(ex => {
      if (!ex || !ex.id) return;
      ((ex.sets) || []).forEach(s => {
        const kg = parseFloat(s && s.kg);
        if (isFinite(kg) && kg > 0 && kg > (mejor[ex.id] || 0)) mejor[ex.id] = kg;
      });
    });
  });
  const out = {}; let removed = 0;
  Object.keys(src).forEach(k => {
    const p = src[k];
    const malo = p && typeof p === 'object' &&
      ['kg', 'val', 'reps', 'secs', 'min', 'dist'].some(f => _saneNum(p[f], _SANE_MAX[f] || 1000));
    // Relativo: el récord dice X pero en el historial limpio no hay nada que se le acerque.
    const kgPR = p && parseFloat(p.kg);
    const tope = mejor[k];
    const fantasma = !malo && isFinite(kgPR) && kgPR > 0 && tope > 0 && kgPR >= _SANE_REL_FACTOR * tope;
    if (malo || fantasma) { removed++; return; }
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
// 🔴 LAS ZONAS LAS DICTA LAURA (§1.2 de `docs/dictamen-laura-dolor-2026-08-08.md`), no el código.
// La lista vieja tenía 10 y le faltaban las que la gente realmente reporta: el PO marcó dolor «en
// los abductores de la pierna izquierda» y **esa zona no existía** → cayó en «otra zona», consejo
// genérico y CERO exclusión. Tampoco existían aductores, cuello, muslo ni pantorrilla.
// ⚠️ Tener la zona NO implica que se excluya algo: `_PAIN_ZONE_TO_EXCL` mapea solo las que tienen
// lista clínica firmada por Laura. Declarar una zona sin regla es mejor que no poder declararla
// (el coach se entera), pero la app NO debe prometer una exclusión que no ocurrió.
const PAIN_AREAS = [
  'cuello','hombro','pecho','codo','muñeca o mano','espalda alta','zona lumbar',
  'cadera o ingle','muslo por delante','muslo por detrás','muslo por dentro (aductores)',
  'cara externa del muslo o glúteo (abductores)','rodilla','pantorrilla','tobillo o pie','otra zona',
];
// El LADO es el dato que decide si el trabajo unilateral sigue siendo posible y el que permite
// medir simetría al dar el alta (§5.4). No se preguntaba.
const PAIN_SIDES = ['izquierda','derecha','ambos','centro'];
// 🔴 «CENTRO» NO SIGNIFICA NADA EN UN HOMBRO Y «AMBOS» NO SIGNIFICA NADA EN LA LUMBAR (Laura,
// 2026-08-09). Ofrecer los cuatro siempre no es neutral: obliga a elegir entre opciones que no
// aplican, y quien tiene dolor lumbar central marcaba «ambos» —que en una estructura de la línea
// media es literalmente lo mismo que «centro»— y el dato quedaba sucio para siempre.
// · LÍNEA MEDIA (cuello, lumbar, espalda alta, pecho): izquierda/derecha/centro. Sin «ambos»:
//   una estructura central no tiene dos ejemplares.
// · PAREADAS (el resto): izquierda/derecha/ambos. Sin «centro»: no hay centro de un hombro.
// · `otra zona`: los cuatro, porque no sabemos qué marcó.
const PAIN_AREAS_MEDIA = ['cuello', 'zona lumbar', 'espalda alta', 'pecho'];
function painSidesFor(area) {
  if (area === 'otra zona' || !PAIN_AREAS.includes(area)) return PAIN_SIDES.slice();
  if (PAIN_AREAS_MEDIA.indexOf(area) >= 0) return ['izquierda', 'derecha', 'centro'];
  return ['izquierda', 'derecha', 'ambos'];
}
const PAIN_LEVELS = [
  { v: 1, label: 'Leve', emoji: '🟡' },
  { v: 2, label: 'Molesto', emoji: '🟠' },
  { v: 3, label: 'No puedo hacerlo', emoji: '🔴' },
];
const PAIN_TIPS = {
  'hombro': 'Evita por ahora las cargas por encima de la cabeza y los rangos que duelan. Prueba agarres neutros (palmas enfrentadas) y baja el peso — como te pasó: a veces cambiar de mancuerna a barra (o al revés) cambia todo.',
  'pecho': 'Reduce el rango de bajada y el peso en los presses. Si un ángulo duele (inclinado), prueba plano o máquinas con recorrido guiado mientras pasa.',
  'codo': 'Baja el peso en empujes y jalones, y evita bloquear el codo con fuerza al final del movimiento. Agarres neutros suelen ayudar.',
  'muñeca o mano': 'Revisa que la muñeca vaya RECTA bajo la carga. Agarres neutros o straps pueden ayudar mientras se calma.',
  'espalda alta': 'Calienta más tiempo la zona antes de jalones/remos y baja el peso. Evita encoger los hombros al remar.',
  'zona lumbar': 'Evita por ahora cargar peso con la columna flexionada (peso muerto, remo con barra) y prefiere ejercicios con apoyo (máquinas, poleas). El core firme es tu protección.',
  'cadera o ingle': 'Reduce la profundidad en sentadillas/zancadas al rango que NO duela y trabaja movilidad suave de cadera en el calentamiento.',
  'rodilla': 'Controla la bajada (no rebotes), reduce profundidad y carga. Las extensiones/prensas con rango corto suelen tolerarse mejor mientras pasa.',
  'tobillo o pie': 'Evita impacto (saltos, trote) mientras duela; la bici estática y ejercicios sentado son buena alternativa.',
  // Zonas nuevas (§1.2 de Laura). Mismo criterio conservador: qué bajar y qué evitar, sin nombrar
  // ninguna lesión y sin prometer que lo demás sea seguro.
  'cuello': 'Evita por ahora lo que va por encima de la cabeza y los encogimientos de hombros. Trabaja sentado con respaldo, con el peso bajo y los hombros sueltos.',
  'muslo por dentro (aductores)': 'Evita por ahora abrir las piernas bajo carga (sentadilla sumo, aducción en máquina) y todo lo lateral o explosivo. Mantén los pies al ancho de la cadera.',
  'cara externa del muslo o glúteo (abductores)': 'Evita por ahora los movimientos que llevan la pierna hacia afuera con carga o banda, y los saltos laterales. El empuje de cadera en línea recta suele tolerarse mejor.',
  'muslo por delante': 'Reduce profundidad y carga en sentadillas y prensas, y quédate en el rango que NO duele. Evita la extensión de cuádriceps mientras pase.',
  'muslo por detrás': 'Baja la carga en peso muerto rumano y curl femoral, y NO lo estires buscando el tirón: eso suele empeorarlo. Quédate en el rango que no molesta.',
  'pantorrilla': 'Evita impacto (saltos, trote) y las elevaciones de talón mientras duela. La bici con sillín alto y el trabajo sentado suelen tolerarse mejor.',
  '_default': 'Baja la carga y quédate en el rango de movimiento que NO duele. Si un ejercicio puntual molesta, cámbialo por una variante — para eso está el botón 🔄.',
};
function painTipFor(area) {
  return PAIN_TIPS[area] || PAIN_TIPS._default;
}
// ── TRIAJE DE DOLOR (§1 del dictamen VINCULANTE de Laura, 2026-08-08) ────────────────────────
// 5 niveles, de agujetas a bandera roja. Reglas suyas que gobiernan TODO lo de abajo:
//  1. 🔒 NADA DE ESCALAS 0-10: «un 6 para uno es un 3 para otro». Todo se ancla a CONDUCTA
//     OBSERVABLE — qué puede o no puede hacer ahora mismo.
//  2. 🔒 LA BANDERA ROJA GANA SOBRE LA INTENSIDAD, siempre. «Leve» + «se me duerme el pie» es N4,
//     no N1. Se evalúa la bandera ANTES que el nivel.
//  3. 🔒 EL DEFAULT ES EL LADO SEGURO: un reporte incompleto se trata como N2, nunca como N1. Un
//     reporte a medias es una señal, no un silencio.
//  4. 🔒 N0 (agujetas) existe para que el triaje NO se apague solo: si la app declara protocolo de
//     lesión por unas agujetas, la gente aprende que reportar es un fastidio y DEJA DE REPORTAR —
//     y el día que sea de verdad no nos enteramos. Un triaje que sobre-reacciona se suicida.
const PAIN_LIMITA = ['normal', 'cambia', 'no_puedo', 'reposo'];   // P2, en orden de gravedad
// P3. `unilateral` = «ayer, después de entrenar, pero solo en un lado»: NO es agujetas (las
// agujetas son parejas en los dos lados) y por eso no abre la puerta de N0.
const PAIN_INICIO = ['agujetas', 'unilateral', 'golpe_seco', 'progresivo', 'traumatismo', 'cronico'];
// P4 — lista CERRADA. `U` = urgencias hoy · `R` = valoración en 24-72 h. Textos exactos de Laura.
const PAIN_FLAGS = [
  // ⚠️ Redacción revisada por Sofía (2026-08-08). Sus cambios NO son de tono, son de seguridad:
  //  · 🔴 U3 decía «no puedo apoyar el peso NI mover esa parte» → exigía LAS DOS cosas. Quien no
  //    puede apoyar pero sí mueve el pie no la marcaba, y U3 es fractura hasta que se demuestre lo
  //    contrario. **Un conector de dos letras apagaba una urgencia.**
  //  · 🔴 U1 cubría incontinencia pero NO retención: quien «no logra orinar» no se reconocía, y esa
  //    es la urgencia real de la columna lumbar. (Pendiente del visto de Laura.)
  //  · «articulación» fuera (es anatomía), «mandíbula» con «quijada» al lado, «6 semanas» → «mes y
  //    medio» porque obligaba a hacer una cuenta que con dolor viejo nadie sabe.
  { id: 'U1', urg: true, txt: 'Desde que empezó: se me sale el pipí o la popó, o no logro orinar, o siento dormida la zona de entre las piernas (como cuando se le duerme a uno un pie)' },
  { id: 'U2', urg: true, txt: 'Me duele el pecho, el brazo o la mandíbula (la quijada) y además me falta el aire, tengo sudor frío o mareo' },
  { id: 'U3', urg: true, txt: 'Fue por un golpe o una caída fuerte y no puedo apoyar el peso, o no puedo mover esa parte' },
  { id: 'R1', urg: false, txt: 'El dolor se corre por el brazo o por la pierna, y pasa del codo o de la rodilla' },
  { id: 'R2', urg: false, txt: 'Siento hormigueo, corrientazos, o se me duerme una parte del brazo, la pierna o el pie' },
  { id: 'R3', urg: false, txt: 'Se me afloja o no me responde: se me cae lo que agarro, se me vence la rodilla, no levanto bien el pie' },
  { id: 'R4', urg: false, txt: 'Me duele en la noche o me despierta el dolor' },
  { id: 'R5', urg: false, txt: 'Empezó con un golpe, una caída o un tirón fuerte' },
  { id: 'R6', urg: false, txt: 'La zona está hinchada, caliente o morada' },
  { id: 'R7', urg: false, txt: 'Se me traba: no la puedo estirar o doblar del todo' },
  { id: 'R8', urg: false, txt: 'Además del dolor, tengo fiebre o me siento enfermo (escalofrío, malestar)' },
  { id: 'R9', urg: false, txt: 'Llevo más de mes y medio con esto y no mejora' },
];
// Zonas donde unas agujetas son plausibles: VIENTRE MUSCULAR. Nunca una articulación ni la lumbar.
const PAIN_N0_ZONAS = ['pecho', 'espalda alta', 'muslo por delante', 'muslo por detrás',
  'muslo por dentro (aductores)', 'cara externa del muslo o glúteo (abductores)', 'pantorrilla'];

// PURA. Devuelve el nivel y por qué. `rep` = {area, side, limita, inicio, flags[], note}.
function painTriage(rep) {
  const r = rep || {};
  const flags = Array.isArray(r.flags) ? r.flags.filter(f => PAIN_FLAGS.some(x => x.id === f)) : [];
  // 🔴 FUGA QUE CAZÓ SOFÍA: P3 «Después de un golpe, una caída o un accidente» es PALABRA POR
  // PALABRA la bandera R5 de P4. Quien ya lo contestó en P3 no vuelve a marcarlo en P4 —«ya lo
  // dije»— y el nivel N4 depende de las casillas de P4, no de P3. O sea: contestar bien la
  // pregunta anterior APAGABA una bandera roja. Se marca sola.
  if (r.inicio === 'traumatismo' && flags.indexOf('R5') < 0) flags.push('R5');
  // 🔴 Y LA MISMA FUGA UN NIVEL MÁS ABAJO, que es la que importa (Laura, v468): los dos hechos que
  // componen **U3** —«fue por un golpe o una caída» y «no puedo apoyar el peso o mover esa parte»—
  // YA están los dos en P3 y P2. Pedirle que los vuelva a marcar en P4 es el mismo «ya lo dije», y
  // el precio es que un trauma con pérdida funcional recibía «pide cita» en vez de «urgencias
  // hoy». Eso es una fractura hasta que se demuestre lo contrario.
  // No crea urgencias falsas: trauma + pérdida funcional es exactamente el umbral de imagen.
  if (r.inicio === 'traumatismo' && (r.limita === 'no_puedo' || r.limita === 'reposo')
      && flags.indexOf('U3') < 0) flags.push('U3');
  const urg = flags.filter(f => (PAIN_FLAGS.find(x => x.id === f) || {}).urg);
  // 🔒 REGLA 2 — la bandera roja se evalúa PRIMERO y gana sobre cualquier intensidad.
  if (urg.length) return { nivel: 4, urgente: true, flags, motivo: 'bandera_urgente', texto: 'U' };
  if (flags.length) return { nivel: 4, urgente: false, flags, motivo: 'bandera_roja', texto: 'A' };
  // 🔒 La MISMA regex de compromiso nervioso que ya usa el generador, ahora sobre lo que escribe
  // LA PERSONA. Existía y solo miraba las notas del coach: describir el síntoma con palabras
  // propias y no reconocerlo en una lista es lo más normal del mundo (§2.3).
  if (r.note && GEN_NERVE_RE.test(_norm(r.note)))
    return { nivel: 4, urgente: false, flags, motivo: 'nervio_en_la_nota', texto: 'A' };

  const limita = PAIN_LIMITA.indexOf(r.limita);
  // 🔒 REGLA 3 — incompleto ⇒ N2, jamás N1. El default cae del lado seguro.
  if (limita < 0) return { nivel: 2, urgente: false, flags, motivo: 'incompleto', texto: 'N2' };
  if (limita >= 2) return { nivel: 3, urgente: false, flags, motivo: 'no_puede', texto: 'C' };

  const inicio = r.inicio;
  // Un tirón seco es N2 aunque hoy se sienta poco: el mecanismo manda sobre la sensación.
  if (inicio === 'golpe_seco' || inicio === 'traumatismo' || inicio === 'cronico')
    return { nivel: 2, urgente: false, flags, motivo: 'mecanismo', texto: 'N2' };
  if (limita === 1) return { nivel: 2, urgente: false, flags, motivo: 'limita', texto: 'N2' };

  // N0 sólo con TODO a favor: se mueve normal, es de ayer, parejo en los dos lados, sin banderas,
  // y en vientre muscular. Cualquier duda cae a N1.
  // 🔒 Y no se abre con UN SOLO LADO: `agujetas` significa «parejo en los dos lados», así que
  // marcarlo junto a `side:'izquierda'` es la misma contradicción que motivó crear `unilateral`.
  const _unLado = r.side === 'izquierda' || r.side === 'derecha';
  if (inicio === 'agujetas' && !_unLado && PAIN_N0_ZONAS.indexOf(r.area) >= 0)
    return { nivel: 0, urgente: false, flags, motivo: 'agujetas', texto: 'N0' };
  return { nivel: 1, urgente: false, flags, motivo: 'leve', texto: 'N1' };
}
// ¿Este nivel PARA la sesión? N3 y N4. Con dolor en reposo o bandera roja la app no propone nada:
// ofrecer una alternativa automática es afirmar que esa alternativa es segura, y eso está prohibido.
function painStopsSession(nivel) { return nivel >= 3; }

// Agrega un reporte normalizado a la lista de cuidado (inmutable). Cap 20 (los más recientes).
function painCareAdd(list, rep, nowIso) {
  rep = rep || {};
  const entry = {
    id: 'p' + Math.random().toString(36).slice(2, 9),
    area: PAIN_AREAS.includes(rep.area) ? rep.area : 'otra zona',
    // Lado: sin él no se puede prescribir trabajo unilateral ni medir simetría al dar el alta
    // (§5.4 del dictamen). `null` cuando no se marcó — NUNCA se inventa un lado.
    // 🔒 Se valida contra los lados QUE APLICAN A ESA ZONA, la misma función que pinta los chips.
    // Con `PAIN_SIDES` a secas, un «centro» en un hombro entraba y quedaba guardado: la pantalla
    // dejaba de ofrecerlo y la capa que guarda seguía aceptándolo. Es la clase de v468 (un dato
    // que la UI calcula bien y la capa de abajo no respeta), esta vez al revés.
    side: painSidesFor(PAIN_AREAS.includes(rep.area) ? rep.area : 'otra zona').includes(rep.side) ? rep.side : null,
    level: Math.min(3, Math.max(1, parseInt(rep.level) || 1)),
    exId: rep.exId || null,
    exName: String(rep.exName || '').slice(0, 80),
    note: String(rep.note || '').slice(0, 300),
    at: nowIso || new Date().toISOString(),
    // 🔴 P0 QUE CAZÓ LAURA AUDITANDO (v468): esto era una LISTA BLANCA de 7 campos y **se comía el
    // triaje entero**. `painSubmit` calculaba bien y pasaba {triaje, motivo, flags, limita,
    // inicio}, y aquí se tiraban en silencio. Tres consecuencias, las tres reales:
    //  1. Las BANDERAS ROJAS no se persistían nunca. La ficha del coach está escrita para
    //     pintarlas (`p.flags`, `p.triaje`) y no pintaba ninguna — la interfaz era correcta y la
    //     capa que guarda la vaciaba.
    //  2. N3 y N4 eran indistinguibles en disco (los dos `level:3`).
    //  3. 🔴 **La salvaguarda de v466 no existía.** Su comentario dice que el coach viendo la
    //     respuesta original «es la única razón por la que esto es seguro» — y `previo.flags`
    //     siempre venía `[]`. Alguien marcaba hormigueo, la app lo mandaba a N4, se arrepentía, y
    //     el coach leía la corrección SIN la bandera. Justo el escenario que decía prevenir.
    // Misma familia que ya nos mordió tres veces: un dato que se calcula bien y NO SOBREVIVE a la
    // capa que lo guarda. Las banderas se normalizan aquí igual que en `painTriage`.
    triaje: rep.triaje == null ? null : Math.min(4, Math.max(0, parseInt(rep.triaje) || 0)),
    motivo: rep.motivo || null,
    flags: Array.isArray(rep.flags) ? rep.flags.filter(f => PAIN_FLAGS.some(x => x.id === f)) : [],
    limita: PAIN_LIMITA.indexOf(rep.limita) >= 0 ? rep.limita : null,
    inicio: PAIN_INICIO.indexOf(rep.inicio) >= 0 ? rep.inicio : null,
  };
  return (list || []).concat([entry]).slice(-20);
}
// ── «Me equivoqué al responder» (Sofía, 2026-08-08) ──────────────────────────────────────────
// 🔴 POR QUÉ EXISTE: sin esto, quien marca una casilla sin querer y se le cae la sesión entera
// aprende una sola cosa — **la próxima vez reporta menos**. Es el mismo modo de falla que Laura
// describe para N0 («un triaje que sobre-reacciona se apaga solo»), entrando por otra puerta.
// ⚠️ NO es la «confirmación disuasoria» que prohíbe el dictamen: esa empuja a seguir entrenando;
// esto permite corregir un dato mal marcado.
// 🔒 UNA SOLA VEZ, y el COACH VE LAS DOS RESPUESTAS. Sin el límite se vuelve el botón de saltarse
// el triaje; sin que el coach vea la original, alguien puede bajarse una bandera roja en silencio
// — y esa es la única razón por la que esto es seguro.
function painCareCorrect(list, entryId, nuevo, nowIso) {
  const arr = (list || []).slice();
  const i = arr.findIndex(p => p && p.id === entryId);
  if (i < 0) return arr;
  const viejo = arr[i];
  if (viejo.corregido) return arr;          // ya se usó su única corrección
  arr[i] = Object.assign({}, viejo, nuevo, {
    id: viejo.id, at: viejo.at,             // sigue siendo el MISMO reporte, no uno nuevo
    corregido: true, corregidoAt: nowIso || new Date().toISOString(),
    // Lo que dijo la primera vez queda guardado: es lo que el coach tiene que poder comparar.
    previo: { area: viejo.area, side: viejo.side, limita: viejo.limita, inicio: viejo.inicio,
              flags: viejo.flags || [], triaje: viejo.triaje, level: viejo.level },
  });
  return arr;
}
// ¿A este reporte le queda su corrección? Puro, para que la UI no adivine.
function painCanCorrect(list, entryId) {
  const p = (list || []).find(x => x && x.id === entryId);
  return !!p && !p.corregido;
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

// Avance de un hábito hacia su meta, para la barra y el color. PURA.
// Existe porque v504 pone los MISMOS tres hábitos en dos sitios a la vez —la tira de chips y el
// bloque desplegado— y ese cálculo estaba escrito a mano tres veces en app-5. Dos superficies
// con dos cuentas del mismo dato se acaban contradiciendo (lección v435): aquí hay una sola.
// Sin meta legible el avance es 0 y NUNCA «cumplido» — una barra llena sobre una meta que no
// existe le diría que terminó algo que nadie le pidió.
function habitPct(n, goal) {
  const v = Math.max(0, Number(n) || 0);
  const g = Number(goal) || 0;
  if (g <= 0) return { pct: 0, met: false };
  return { pct: Math.min(100, Math.round(v / g * 100)), met: v >= g };
}

// ══════════════════════════════════════════════════════════════════════
// REGISTRO DE ALIMENTOS — F0: MODELO DE DATOS (estipulaciones E1-E4 de Fable)
// ──────────────────────────────────────────────────────────────────────
// Todo PURO: sin DOM, sin DB, `now` siempre por parámetro. La UI llega en F2.
//
// E1 — DÓNDE VIVE: en el perfil propio del asesorado (`client.foodlog`), el mismo vehículo
// probado de `habits`/`painCare` → viaja en `clientToRow` a su fila de `user_data`. NUNCA en
// una clave suelta de localStorage (lo que solo vive en el teléfono no existe para ningún
// motor) y NUNCA dentro del `ax_c` del coach.
//
// FORMA:  { d: { 'YYYY-MM-DD': [entrada, …] }, m: { 'YYYY-MM': {dias,kcal,p,c,f} } }
// Claves cortas a propósito: `sv()` hace REPLACE TOTAL del objeto en cada escritura, así que
// cada byte se re-sube 3-5 veces al día.
//
// E2 — LA ENTRADA ES UN SNAPSHOT, no una referencia:
//   { id, ts, meal, src:'tcac2018'|'avi50'|'off', foodId, name, g, kcal, p, c, f[, barcode, brand] }
// Los macros se copian al momento de anotar. Corregir el catálogo después NO reescribe el
// pasado de nadie (ya corregimos la yuca, la avena y el atún: sin snapshot, esas correcciones
// habrían cambiado en silencio lo que la gente ya tenía registrado).
// E3 — RETENCIÓN DEL DETALLE. Fable estipuló 90 días con el número «a confirmar midiendo, no de
// memoria». Medido el 2026-08-05 y la medición manda: 90 días × 5 comidas pesan 78 KB (106 KB si
// todo viene de código de barras), y los perfiles REALES de producción pesan ~600 bytes (Luz 600,
// Kathe 619) con el historial completo de meses de entreno en 10-18 KB. A 90 días el registro de
// comida multiplicaría el perfil por más de 100 y sería, de lejos, lo más pesado de la fila — y
// ese objeto se re-sube ENTERO en cada una de las 3-5 anotaciones del día.
// A 30 días (la misma retención que ya usan agua y pasos) el detalle pesa ~26 KB, proporcionado
// al historial, y el coach conserva un mes completo — más de lo que revisa de una sentada.
// Lo anterior NO se pierde: se agrega al resumen mensual. Desviación de E3 documentada en el plan.
const FOODLOG_KEEP_DAYS = 30;
const FOODLOG_MAX_G = 5000;      // tope de cordura por entrada (5 kg de un alimento)
// El nombre del snapshot es para RELEER una entrada pasada, no para identificar el alimento
// (para eso está `foodId`). Medido el 2026-08-05: sin acotarlo, 90 días de productos de código
// de barras («Galletas Festival Sabor a Vainilla Paquete x 12 unidades») pesan 109 KB contra
// 78 KB de comida normal, y ese objeto se re-sube ENTERO en cada anotación.
const FOODLOG_NAME_MAX = 48;
const FOODLOG_BRAND_MAX = 24;
function _flCut(s, max) { s = String(s == null ? '' : s).trim(); return s.length > max ? s.slice(0, max - 1) + '…' : s; }
const FOODLOG_MEALS = ['desayuno', 'media_m', 'almuerzo', 'media_t', 'cena'];

// Objeto vacío por FÁBRICA, no literal suelto: un campo nuevo queda cubierto solo (lección
// del reset de Comunidad, v398).
function foodLogBlank() { return { d: {}, m: {} }; }
function _flNorm(fl) {
  const o = foodLogBlank();
  if (fl && typeof fl === 'object') {
    if (fl.d && typeof fl.d === 'object') o.d = Object.assign({}, fl.d);
    if (fl.m && typeof fl.m === 'object') o.m = Object.assign({}, fl.m);
  }
  return o;
}
// Un macro puede faltar en la fuente: se conserva `null` («sin dato»), JAMÁS 0 — un 0 es una
// afirmación nutricional falsa, un null es honestidad (E7).
function _flMacro(per100, g) {
  if (per100 == null || per100 === '') return null;
  const n = parseFloat(per100);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * g) / 100;
}
// Construye la entrada-snapshot desde un alimento del catálogo (macros por 100 g) y los gramos
// servidos. Devuelve null si el alimento o la cantidad no son utilizables — el llamador decide
// qué decirle a la persona; aquí no se inventa nada.
function foodLogEntry(food, grams, meal, now, idFn) {
  if (!food || !food.id) return null;
  const g = parseFloat(grams);
  if (!Number.isFinite(g) || g <= 0) return null;
  const gg = Math.min(FOODLOG_MAX_G, Math.round(g));   // tope en el punto ÚNICO de escritura
  const t = now ? now.getTime() : Date.now();
  const e = {
    id: (typeof idFn === 'function' ? idFn() : 'fl' + t + Math.random().toString(36).slice(2, 7)),
    ts: t,
    meal: FOODLOG_MEALS.indexOf(meal) !== -1 ? meal : 'almuerzo',
    src: food.src || 'avi50',
    foodId: food.id,
    name: _flCut(food.name, FOODLOG_NAME_MAX),
    g: gg,
    kcal: _flMacro(food.kcal, gg),
    p: _flMacro(food.p, gg),
    c: _flMacro(food.c, gg),
    f: _flMacro(food.f, gg),
  };
  if (food.barcode) e.barcode = String(food.barcode);
  if (food.brand) e.brand = _flCut(food.brand, FOODLOG_BRAND_MAX);
  return e;
}
// Las entradas de un día (orden estable por ts y luego por id: el render no debe saltar).
function foodLogDay(foodlog, now) {
  const d = (foodlog && foodlog.d) || {};
  const arr = d[habitDayKey(now)] || [];
  return arr.slice().sort((a, b) => (a.ts - b.ts) || String(a.id).localeCompare(String(b.id)));
}
// Suma del día POR MACRO, no solo el total: un total bueno puede tapar un macro roto (lección
// del plan de comida). `parcial` avisa que algún alimento no traía ese macro, para que la
// pantalla no presente como completo lo que no lo está.
function foodLogTotals(entries) {
  const out = { kcal: 0, p: 0, c: 0, f: 0, n: 0, parcial: false };
  (entries || []).forEach(e => {
    if (!e) return;
    out.n++;
    ['kcal', 'p', 'c', 'f'].forEach(k => {
      const v = e[k];
      if (v == null || !Number.isFinite(parseFloat(v))) { out.parcial = true; return; }
      out[k] += parseFloat(v);
    });
  });
  ['kcal', 'p', 'c', 'f'].forEach(k => { out[k] = Math.round(out[k] * 10) / 10; });
  return out;
}
// E3 — PODA con memoria: lo que sale del detalle NO se pierde, se agrega al resumen del mes.
// Sin esto la fila del asesorado crece sin techo y cada anotación re-sube el objeto entero.
function foodLogPrune(foodlog, now) {
  const o = _flNorm(foodlog);
  const base = now ? now.getTime() : Date.now();
  const cutoff = habitDayKey(new Date(base - FOODLOG_KEEP_DAYS * 86400000));
  Object.keys(o.d).forEach(dk => {
    if (dk >= cutoff) return;                       // 'YYYY-MM-DD' ordena lexicográfico
    const tot = foodLogTotals(o.d[dk]);
    if (tot.n > 0) {
      const mk = dk.slice(0, 7);
      const m = o.m[mk] || { dias: 0, kcal: 0, p: 0, c: 0, f: 0 };
      o.m[mk] = {
        dias: m.dias + 1,
        kcal: Math.round(m.kcal + tot.kcal),
        p: Math.round(m.p + tot.p),
        c: Math.round(m.c + tot.c),
        f: Math.round(m.f + tot.f),
      };
    }
    delete o.d[dk];
  });
  return o;
}
// Agregar / editar / borrar. Inmutables (nunca mutan lo que reciben) y siempre podan.
function foodLogAdd(foodlog, entry, now) {
  if (!entry || !entry.id) return _flNorm(foodlog);
  const o = _flNorm(foodlog);
  const k = habitDayKey(now);
  o.d = Object.assign({}, o.d);
  o.d[k] = (o.d[k] || []).filter(e => e && e.id !== entry.id).concat([entry]);
  return foodLogPrune(o, now);
}
function foodLogRemove(foodlog, dayKey, entryId) {
  const o = _flNorm(foodlog);
  if (!o.d[dayKey]) return o;
  o.d = Object.assign({}, o.d);
  const rest = o.d[dayKey].filter(e => e && e.id !== entryId);
  if (rest.length) o.d[dayKey] = rest; else delete o.d[dayKey];
  return o;
}
// E4 — MERGE MULTI-DISPOSITIVO. La app es offline-first: el teléfono PISA la nube con un
// replace total. Sin esto, anotar el almuerzo en el celular y abrir la app en otro aparato
// BORRA el almuerzo — «la app me borró lo que comí» en el módulo que pide 3-5 toques de fe
// al día. Regla: unión por `id` dentro de cada día; si la misma entrada existe en los dos
// lados (se editó), gana el `ts` mayor. Los resúmenes mensuales toman el MÁXIMO de cada lado
// (los dos vienen del mismo pasado; sumarlos lo duplicaría).
function foodLogMerge(a, b) {
  const A = _flNorm(a), B = _flNorm(b);
  const out = foodLogBlank();
  const dias = new Set(Object.keys(A.d).concat(Object.keys(B.d)));
  dias.forEach(dk => {
    const porId = new Map();
    (A.d[dk] || []).concat(B.d[dk] || []).forEach(e => {
      if (!e || !e.id) return;
      const prev = porId.get(e.id);
      if (!prev || (parseFloat(e.ts) || 0) > (parseFloat(prev.ts) || 0)) porId.set(e.id, e);
    });
    const arr = Array.from(porId.values()).sort((x, y) => (x.ts - y.ts) || String(x.id).localeCompare(String(y.id)));
    if (arr.length) out.d[dk] = arr;
  });
  const meses = new Set(Object.keys(A.m).concat(Object.keys(B.m)));
  meses.forEach(mk => {
    const x = A.m[mk] || {}, y = B.m[mk] || {};
    out.m[mk] = {
      dias: Math.max(x.dias || 0, y.dias || 0),
      kcal: Math.max(x.kcal || 0, y.kcal || 0),
      p: Math.max(x.p || 0, y.p || 0),
      c: Math.max(x.c || 0, y.c || 0),
      f: Math.max(x.f || 0, y.f || 0),
    };
  });
  return out;
}
// Progreso del día contra el objetivo, POR MACRO y no solo en el total (un total bueno puede
// tapar un macro roto: lección del plan de comida). `target` es el objetivo del día que ya
// calcula `nutWeekTargets` — aquí no se recalcula nada, se compara. Devuelve, por cada macro,
// lo hecho, la meta, el porcentaje y lo que falta (nunca negativo: el exceso se lee en `pct`).
const FOODLOG_MACROS = [['kcal', 'kcal'], ['p', 'prot_g'], ['c', 'carb_g'], ['f', 'fat_g']];
function foodLogProgress(totals, target) {
  const t = totals || {};
  const out = { parcial: !!t.parcial, n: t.n || 0 };
  FOODLOG_MACROS.forEach(([k, tk]) => {
    const hecho = Math.round((parseFloat(t[k]) || 0) * 10) / 10;
    const meta = Math.round(parseFloat(target && target[tk]) || 0);
    out[k] = {
      hecho, meta,
      pct: meta > 0 ? Math.round(hecho / meta * 100) : null,
      falta: meta > 0 ? Math.max(0, Math.round((meta - hecho) * 10) / 10) : null,
    };
  });
  return out;
}
// ══════════════════════════════════════════════════════════════════════
// LA FRANJA, NO LA CIFRA EXACTA (patrón 2 del estudio de Fitia/MFP)
// ──────────────────────────────────────────────────────────────────────
// Pedirle a alguien que clave «2.089 kcal» es pedirle una precisión que NI EL PROPIO PLAN
// tiene: el plato sirve entre el 94,7% y el 110,2% de lo que promete. Una cifra al gramo finge
// una exactitud que no existe y convierte cualquier día normal en un fracaso.
//
// 🔴 EL ANCHO ESTÁ MEDIDO, NO ESCRITO DE MEMORIA (2026-08-12, ruta `nutBaseFor` contra la nube):
// 25 filas de asesorado → 21 resueltas → **17 que en producción SÍ ven el plan de comida**
// (6 son `tier:'libre'` y nunca lo ven; 4 no resuelven), 119 días-plan. Lo que el plato SIRVE
// como % de lo que promete: min 94,7% · mediana 102,8% · max 110,2%.
//   franja ±5%  → 28 de 119 días-plan quedan fuera (10 personas)
//   franja ±8%  →  6 de 119 (4 personas)
//   franja ±10% →  1 de 119 (**Nataly**, cuyo plato entrega 110,2%)
//   franja ±12% →  0 de 119   ← ELEGIDA
// 🔒 La restricción es dura y no es de gusto: **una franja más estrecha de lo que el plato
// entrega le diría «te pasaste» a quien comió EXACTAMENTE lo que la app le mandó** — la misma
// contradicción de v435/v444, servida por la pantalla que existe para dar tranquilidad.
// Si algún día el plato entrega más fino, esta cifra se re-mide y se aprieta; no al revés.
// 🔁 RE-MEDIDA DOS VECES el 2026-08-15, y la segunda la volvió a APRETAR — que es la dirección que
// esta nota exige y casi no se cumple. (1) Al corregir la yuca (112 → 157) su ración mínima subió
// de 113 a 151 kcal y la esquina mala del barrido se fue a 113,9%: hubo que abrir a ±14%. (2) Al
// traer 8 filas más de la TCAC el plato volvió a entregar FINO y la curva es:
//   ±8% → 13 de 315 fuera · ±10% → 5 · ±11% → 2 · ±12% → 0   ← ELEGIDA (el plato da 94,6%-111,6%)
// ⚠️ Lo que enseña el par: **una franja ensanchada no se queda ensanchada por comodidad**. Si se
// hubiera dejado en 14 «porque ya pasaba», la app le estaría diciendo «vas bien» a alguien con un
// 13% de desvío real. Cada vez que cambie la tabla de alimentos, esta cifra se vuelve a medir en
// las DOS direcciones. Antes de abrirla se probaron dos arreglos del plato —bajarle el tope de
// ración a la yuca y darle un escalón chico de media medida— y ninguno movió una sola cifra.
// ⚠️ Solo para CALORÍAS. Por macro el reparto es mucho más ancho (grasa 80,9%-129,2%) y una
// franja de ±29% no dice nada: los macros siguen con su porcentaje.
// 🔁 CUARTA RE-MEDIDA (2026-08-18, v501) — y esta vez APRIETA, que es la dirección que esta nota
// exige. No cambió la tabla: cambió la forma de CONTAR. El plato sumaba sus calorías con la fórmula
// genérica `4p+4c+9f` mientras el registro sumaba el campo `kcal` de la fuente — dos definiciones
// de caloría vivas en la misma app. Medido: el plato **se contaba a sí mismo un +1,43% de más de
// media y hasta +5,18%**, y el sitio donde más pegaba eran los ACOMPAÑANTES, que son las verduras
// (la fórmula se pasa +28,7% en la espinaca porque su carbohidrato TOTAL incluye la fibra).
// Con la caloría de la fuente en las dos puntas, el barrido de 315 días-plan entrega **91,9%-112,3%**:
//   ±10% → 3 fuera · ±11% → 2 · ±12% → 1 · ±13% → 0   ← ELEGIDA
// 🔒 Y el efecto que de verdad importa: el plato y el REGISTRO ya dicen el mismo número para la
// misma comida (coinciden ±1 kcal en 202 de 315 días y el peor caso son **3 kcal**; antes se
// separaban ~35). La contradicción de v477 queda cerrada.
// 🔁 TERCERA RE-MEDIDA (2026-08-16, v490 — las 6 filas sin fuente pasaron a su valor real). Vuelve
// a abrirse a ±14%, y hay que decir con precisión POR QUÉ, porque la nota de arriba manda apretar:
//   BARRIDO SINTÉTICO (315 días-plan): el plato entrega 93,0%-114,0%
//     ±8% → 17 fuera · ±10% → 7 · ±11% → 5 · ±12% → 3 · ±13% → 3 · ±14% → 0   ← ELEGIDA
//   PERSONAS REALES (19 perfiles de la nube resueltos por `nutBaseFor`, 399 días-plan): el plato
//   entrega 95,7%-111,4% y **±12% deja 0 fuera** — o sea que HOY no hay nadie a quien esto afecte
//   (con la tabla vieja daba 95,2%-111,3%: la corrección de los datos casi no los movió).
// 🔴 Se abre por la ESQUINA, no por la gente, igual que en la primera re-medida: el barrido tiene
// un perfil (1.800 kcal con 30% de proteína en día de DESCANSO) que ninguna de las 19 ocupa, y una
// franja que no lo cubra le diría «te pasaste» a la primera persona que caiga ahí.
// 🔴 Y la causa de esa esquina NO es la tabla nueva: con la vieja ya entregaba 108,5%. Ahí el plato
// sirve **4 huevos en el desayuno y otros 4 en la cena** y la grasa se va a 67 g contra un objetivo
// de 50 — o sea que casi todo el exceso es la GRASA del huevo, no la proteína.
// 🔴 **CORRECCIÓN MEDIDA (2026-08-18, v494).** Esta nota decía que la causa era `NUT_PROT_MIN_SHARE`
// y que «el día que eso baje, esta cifra se vuelve a apretar a 12». **Es falso, y se supo bajándolo:
// con 0,70 y con 0,60 la esquina entrega exactamente lo mismo (93%-114%), el mismo día (1.800 kcal,
// descanso, día 3) y con los mismos 8 huevos.** **Una hipótesis escrita al lado de una constante se
// lee como un hecho: esta llevaba dos versiones diciéndole al siguiente por dónde atacar.**
// 🔁 SEGUIMIENTO (v495): se midió el otro sospechoso, el tope de ración del huevo. **Tampoco la
// cierra.** Con `maxG: 200` (4 huevos, el que se puso porque sale gratis) la esquina entrega
// exactamente lo mismo, y con 150 g **EMPEORA a 114,6%** — el «recorta en vez de repartir» del
// 2026-08-10 otra vez. Lo ÚNICO que la cierra es topar el huevo en **2 huevos** (93,3%-109,6%,
// ±12% → 0 fuera), y eso sí se paga: **tres cenas reales caen al 84% de su proteína**, las comidas
// pasadas del 130% suben de 3 a 7 y la variedad baja de 44 a 41. **Es una decisión dietética, de
// Andrés, no técnica: la franja se queda en ±14% hasta que él la tome**, y el precio queda medido
// aquí para que quien la tome no tenga que volver a medirlo.
// ──────────────────────────────────────────────────────────────────────
// LA VERSIÓN QUE SE MUESTRA SE DERIVA DE LA QUE SE SIRVIÓ (v491)
// ──────────────────────────────────────────────────────────────────────
// 🔴 Hasta v490 la barra del coach decía «v2.0 · Jun 2026» escrito a mano en el HTML: llevaba
// DOS MESES y ~490 despliegues mintiendo. Lo destapó una auditoría externa que copió esa etiqueta
// y fechó TODO su informe en «v2.0 (Junio 2026)» — o sea que el rótulo no solo estaba viejo:
// engañó a quien vino a evaluar la app. Es la clase de v437 y v486 (el número se arregla y el
// rótulo se queda), aquí aplicada a la propia app.
// 🔒 Ahora sale del `?v=` con el que el navegador PIDIÓ los scripts, que es el despliegue que la
// persona está corriendo de verdad. No se puede quedar viejo porque no hay nada que actualizar.
// 🔒 Y de paso cierra un punto abierto desde v415: cuando alguien reportaba un fallo no había
// forma de saber en qué versión iba su teléfono. Ahora lo lee en su propio perfil y lo dicta.
function appBuildFrom(urls) {
  const vs = [];
  (urls || []).forEach(u => {
    const m = /[?&]v=(\d+)/.exec(String(u || ''));
    if (m) { const n = parseInt(m[1], 10); if (n > 0) vs.push(n); }
  });
  return vs.length ? Math.max.apply(null, vs) : null;
}
function appBuildLabel(urls) {
  const b = appBuildFrom(urls);
  // Sin `?v=` NO se inventa un número ni se deja el último que se recuerde: se dice que no se
  // sabe. Un rótulo que adivina es exactamente lo que se está quitando de aquí.
  return b ? ('AVI · versión ' + b) : 'AVI';
}

const FOODLOG_BAND = 0.13;
function foodLogBandFor(meta, hecho) {
  const m = Math.round(parseFloat(meta) || 0);
  if (!(m > 0)) return null;
  const lo = Math.round(m * (1 - FOODLOG_BAND));
  const hi = Math.round(m * (1 + FOODLOG_BAND));
  const h = Math.round((parseFloat(hecho) || 0) * 10) / 10;
  return {
    lo, hi, meta: m, hecho: h,
    estado: h < lo ? 'bajo' : (h > hi ? 'alto' : 'dentro'),
    // 🔴 Lo que falta para ENTRAR EN LA FRANJA, no para clavar el número exacto. Y se redondea
    // AQUÍ, porque la pantalla que lo rehizo a mano sacó «36.799999999999955» (reporte del PO).
    falta: Math.max(0, Math.round(lo - h)),
    // Lo que sobra por encima del techo (0 si no se pasó). Sirve para no decir «te faltan 0».
    sobra: Math.max(0, Math.round(h - hi)),
  };
}
// ── LA SEMANA EN UNA FILA (patrón 3 del estudio) ──────────────────────────────
// El dato ya existía y solo lo veía el coach. `estado` por día: 'vacio' (no registró — que NO
// es «comió cero»: es «no sabemos», la misma regla que ya protege el promedio del coach),
// 'bajo' | 'dentro' | 'alto', o 'sinmeta' si ese día no tiene plan contra el que comparar.
function foodLogWeekStates(foodlog, targetsPorDia, now, dias) {
  return foodLogWeek(foodlog, now, dias).map(d => {
    const t = targetsPorDia && targetsPorDia[d.dayIndex];
    const band = (d.n > 0 && t) ? foodLogBandFor(t.kcal, d.kcal) : null;
    return Object.assign({}, d, {
      band,
      estado: d.n === 0 ? 'vacio' : (band ? band.estado : 'sinmeta'),
    });
  });
}
// ── EL VOCABULARIO DE LOS ESTADOS, EN UN SOLO SITIO ───────────────────────────
// 🔴 Vivía suelto en app-5-salud.js (`_FL_ESTADO`) y el coach no lo tenía: su fila de 7 días
// pintaba BINARIO («registró / no registró») mientras la asesorada leía «✓ vas en tu franja».
// Duplicarlo en app-3 era fabricar la segunda verdad de v435/v444 a mano, así que vive aquí y
// las DOS pantallas leen de esto. El TEXTO cambia por audiencia (`tu` / `su`) porque una lee
// sobre sí misma y el otro sobre ella; lo que NO puede cambiar es qué estados hay y cuáles
// cuentan como fuera.
// 🔒 `fuera` es lo que hace posible el candado por CONTEO: los días que el coach ve como
// desviados tienen que ser EXACTAMENTE los que ella ve fuera de su franja. Y ni `vacio` ni
// `sinmeta` cuentan como fuera —«no sabemos» y «no hay con qué comparar» no son un fallo—,
// que es la misma regla del hueco que protege el promedio.
const FL_ESTADO_UI = {
  dentro:  { bg: '--gl',  fg: '--gt',  tu: 'en tu franja',  su: 'en su franja',  fuera: false },
  bajo:    { bg: '--bll', fg: '--blt', tu: 'por debajo',    su: 'por debajo',    fuera: true  },
  alto:    { bg: '--orl', fg: '--ort', tu: 'por encima',    su: 'por encima',    fuera: true  },
  sinmeta: { bg: '--bg',  fg: '--t2',  tu: 'registrado',    su: 'registrado',    fuera: false },
  vacio:   { bg: '--bg',  fg: '--t3',  tu: 'sin registrar', su: 'sin registrar', fuera: false },
};
// Cuántos días de la semana caen dentro / fuera de franja. Fuente ÚNICA para las dos
// superficies: si el coach contara por su lado, volvería la contradicción que esto cierra.
function foodLogBandCount(semana) {
  const out = { dentro: 0, fuera: 0, registrados: 0 };
  (semana || []).forEach(d => {
    if (!d) return;
    if (d.n > 0) out.registrados++;
    if (d.estado === 'dentro') out.dentro++;
    const e = FL_ESTADO_UI[d.estado];
    if (e && e.fuera) out.fuera++;
  });
  return out;
}
// ── F4: lo que ve el COACH ────────────────────────────────────────────────────
// Últimos N días con su total (hoy de último), como `waterWeek`. `n` = cuántos alimentos anotó.
function foodLogWeek(foodlog, now, dias) {
  const base = now ? now.getTime() : Date.now();
  const N = Math.max(1, parseInt(dias) || 7);
  const out = [];
  for (let i = N - 1; i >= 0; i--) {
    const d = new Date(base - i * 86400000);
    const tot = foodLogTotals(foodLogDay(foodlog, d));
    out.push({ day: habitDayKey(d), dayIndex: d.getDay(), n: tot.n, kcal: tot.kcal, p: tot.p, c: tot.c, f: tot.f, parcial: tot.parcial });
  }
  return out;
}
// Adherencia y desvío por macro para la ficha del coach.
// 🔴 EL PROMEDIO SOLO CUENTA LOS DÍAS QUE REGISTRÓ. Un día sin registrar NO es «comió cero»: es
// «no sabemos». Promediarlo contra 0 haría ver a todo el mundo en déficit brutal y el coach
// tomaría decisiones sobre un dato inventado — la peor forma de mentir es con un promedio.
// `targetsPorDia` = mapa dayIndex(0..6) → objetivo de ese día (el que ya da `nutWeekTargets`).
function foodLogAdherence(foodlog, targetsPorDia, now, dias) {
  const week = foodLogWeek(foodlog, now, dias);
  const conRegistro = week.filter(d => d.n > 0);
  const out = {
    dias: week.length, registrados: conRegistro.length, week,
    parcial: conRegistro.some(d => d.parcial),
    prom: null, meta: null, desvio: null,
  };
  if (!conRegistro.length) return out;
  const suma = { kcal: 0, p: 0, c: 0, f: 0 }, metaSuma = { kcal: 0, p: 0, c: 0, f: 0 };
  let conMeta = 0;
  conRegistro.forEach(d => {
    ['kcal', 'p', 'c', 'f'].forEach(k => { suma[k] += d[k] || 0; });
    const t = targetsPorDia && targetsPorDia[d.dayIndex];
    if (t) {
      conMeta++;
      metaSuma.kcal += parseFloat(t.kcal) || 0;
      metaSuma.p += parseFloat(t.prot_g) || 0;
      metaSuma.c += parseFloat(t.carb_g) || 0;
      metaSuma.f += parseFloat(t.fat_g) || 0;
    }
  });
  const n = conRegistro.length;
  out.prom = { kcal: Math.round(suma.kcal / n), p: Math.round(suma.p / n), c: Math.round(suma.c / n), f: Math.round(suma.f / n) };
  if (!conMeta) return out;                       // sin plan no hay contra qué comparar: no se opina
  out.meta = { kcal: Math.round(metaSuma.kcal / conMeta), p: Math.round(metaSuma.p / conMeta), c: Math.round(metaSuma.c / conMeta), f: Math.round(metaSuma.f / conMeta) };
  out.desvio = {};
  ['kcal', 'p', 'c', 'f'].forEach(k => {
    out.desvio[k] = out.meta[k] > 0 ? Math.round((out.prom[k] - out.meta[k]) / out.meta[k] * 100) : null;
  });
  return out;
}
// Días DISTINTOS con al menos una comida guardada en los últimos N días. Es la métrica del
// criterio de corte (§8.4) y la usa `scripts/nut-adherencia.mjs`: se DERIVA del propio
// registro, sin tabla de telemetría ni dato personal nuevo.
function foodLogActiveDays(foodlog, now, ventanaDias) {
  const o = _flNorm(foodlog);
  const base = now ? now.getTime() : Date.now();
  const desde = habitDayKey(new Date(base - (ventanaDias || 21) * 86400000));
  const hasta = habitDayKey(now);
  return Object.keys(o.d).filter(dk => dk >= desde && dk <= hasta && (o.d[dk] || []).length > 0).length;
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
// 🔴 EL RECORTE VA DESPUÉS DEL FILTRO, NO ANTES. Cortaba a 3 y la pantalla filtraba las novedades
// `coach:true` DESPUÉS: en cuanto las tres más nuevas fueron todas de Premium (pasó en v478), a
// quien está en el tier libre **no le quedaba ninguna y el tour no abría nunca**. Nadie lo habría
// notado — un tour que no sale no da error, y las novedades viejas ya se habían pasado de largo.
// Puerta cerrada, ventana abierta: la misma familia del filtro de lesiones y el calentamiento.
// `opts.coach === false` = no tiene coach. Sin `opts` se comporta como antes (compatibilidad).
//
// 🔴 SON DOS PÚBLICOS, NO UNO (v508). `coach` y `premium` NO son el mismo corte y confundirlos
// deja gente sin enterarse de lo suyo: `clientHasCoach` excluye al tier **'app'** (Premium sin
// coach), que en producción son **7 personas de 24** — más que el tier libre. Una novedad sobre una
// función Premium-de-app (el registro de comida, el plan del día) marcada `coach:true` no les
// llegaría, aunque la tengan y la usen. Y al revés: marcarla para todos se la promete a las 4 del
// tier libre, que es el error que v316 ya pagó con el chat.
//   · `coach:true`   → solo quien tiene coach de verdad (chat, lista del mercado…).
//   · `premium:true` → todo el que NO es libre, coach o no (registro de comida, plan del día).
//   · sin marca      → para todos.
function newsToShow(list, seenV, opts) {
  const seen = parseInt(seenV) || 0;
  const conCoach = !opts || opts.coach !== false;
  const conPremium = !opts || opts.premium !== false;
  return (list || [])
    .filter(n => n && parseInt(n.v) > seen)
    .filter(n => conCoach || !n.coach)
    .filter(n => conPremium || !n.premium)
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
// ══════════════════════════════════════════════════════════════════════
// EL COACH TAMBIÉN ENTRENA — su perfil es un asesorado más (2026-08-01)
// ──────────────────────────────────────────────────────────────────────
// Pedido repetido del PO, y hasta hoy contestado a medias: primero con una
// tarjeta de resumen en su Inicio («lo mejor que hiciste fue poner un feo banner»).
// Lo que pidió es otra cosa: «que mi perfil sea como cualquier perfil de asesorado»
// — que aparezca en las estadísticas, en la lista, y que pueda EDITARLO desde su
// propio panel igual que edita a los demás.
//
// El dato que lo justifica (medido 2026-08-01 contra producción): su fila propia
// tiene 53 sesiones, 6 de ellas en la última semana y 27 en el último mes, y el
// panel no cuenta NINGUNA. Su tablero dice 30 sesiones semanales cuando son 36.
//
// CÓMO: su fila entra a la lista de asesorados como un cliente sintético con id
// reservado. Así los ~200 sitios que hacen `DB.clients.find(...)` lo encuentran
// solos, sin tocarlos uno por uno.
//
// 🔴 EL CANDADO QUE NO SE PUEDE QUITAR: `_persistCoachWrite` recorre `DB.clients` y
// llama `UD.updateClientRow(id, …)` por cada uno. Si el coach entra a esa lista sin
// blindaje, la app le CREA UN ASESORADO FANTASMA en la nube con su propio
// entrenamiento dentro. Todo lo suyo se guarda en SU fila (`upsertOwn`), jamás como
// fila de cliente. `isSelfClient` existe para que ese filtro sea una sola pregunta
// y no una comparación de strings repartida por el código.
const SELF_CLIENT_ID = '_self';
function isSelfClient(c) {
  const id = c && typeof c === 'object' ? c.id : c;
  return id === SELF_CLIENT_ID;
}

// Construye el asesorado sintético a partir de la fila propia del coach.
// `row` = fila `user_data` del coach (profile/routines/…). Sin fila → null.
// ⚠️ Un coach CON fila pero sin entrenar SÍ aparece, con los valores por defecto: es su
// puerta de entrada para armarse su propio plan, no un error. (La versión anterior de este
// comentario decía que no aparecía — falso, y es justo la clase de defecto que la auditoría
// persigue: texto que afirma algo que el código no hace.)
// NO lleva `payments` ni `tier` a propósito: no se cobra a sí mismo, y `MS.getStatus`
// sobre un cliente sin pagos da 'pending', que es justo «no me molestes con plata».
function selfClientFromRow(row, opts) {
  if (!row || typeof row !== 'object') return null;
  const p = (row.profile && typeof row.profile === 'object') ? row.profile : {};
  const nombre = (opts && opts.name) || p.name || 'Yo';
  return {
    id: SELF_CLIENT_ID,
    isSelf: true,                 // bandera explícita, además del id
    name: nombre,
    // datos de ENTRENAMIENTO: son los que hacen que el generador y la nutrición
    // funcionen igual que con cualquier otro
    sex: p.sex || '', age: p.age != null ? p.age : null,
    weight: p.weight != null ? p.weight : null,
    height: p.height != null ? p.height : null,
    goal: p.goal || '', level: p.level || 'Principiante',
    days: p.days != null ? p.days : 3, place: p.place || 'gym',
    activityFactor: p.activityFactor != null ? p.activityFactor : 1.55,
    notes: p.notes || '', habits: p.habits || null,
    startDate: p.startDate || null,
    routines: Array.isArray(row.routines) ? row.routines : [],
    // NADA de negocio: sin payments, sin tier, sin suspended, sin wantsCoach.
  };
}

// ── El coach editándose a sí mismo NO puede borrarse lo que su panel no sabe leer ──────────────
// 🔴 EL DEFECTO (medido sobre su perfil REAL el 2026-08-21, auditoría de v507): `selfClientFromRow`
// es una LISTA BLANCA a propósito —el coach entra a `DB.clients` SIN nada de negocio— pero
// `_persistCoachWrite` armaba la fila desde esa vista PARCIAL y `upsertOwn` **REEMPLAZA la columna
// jsonb entera**. Resultado: **19 claves → 14**, y lo que se perdía era `foodlog` (6.476 B, 2 días
// de comida registrada), `deload` (2.373 B), `painCare` (el reporte de dolor de codo del 17-ago),
// `foodlogOk` y `tier`. Le pasaba con solo abrir su ficha y guardar, sin tocar nada de eso.
// Asimetría que lo delataba: **«Mi entrenamiento» era SEGURO** (usa `rowToClient`, que preserva
// todo); el que perdía era el PANEL.
//
// 🔑 EL ARREGLO NO ES ENSANCHAR LA LISTA BLANCA. Esa lista existe para que `payments`, `tier`,
// `suspended` y `wantsCoach` NO entren en la vista del coach-como-asesorado, y ensancharla ripplea
// a cada render que lo lee. El defecto es otro: **una vista parcial estaba pisando un registro
// completo**. Así que se arregla donde vive — en la ESCRITURA: se pisa lo que se sabe leer y se
// CONSERVA intacto lo demás.
//
// 💎 Las claves «conocidas» se DERIVAN del propio viaje de ida y vuelta (`selfClientFromRow` →
// `clientToRow`), no se listan a mano: si mañana alguien añade un campo a la lista blanca queda
// cubierto solo, sin que nadie tenga que acordarse de tocar esto.
function ownProfileKeys() {
  return Object.keys(clientToRow(selfClientFromRow({ profile: {} }), {}).profile);
}
// `guardado` = el perfil que HAY en la fila (la misma de la que se hidrató la vista).
// `nuevo`    = el perfil que produce el panel. Gana `nuevo` en todo lo que el panel sabe editar.
function mergeOwnProfile(guardado, nuevo) {
  const conocidas = ownProfileKeys();
  const base = (guardado && typeof guardado === 'object') ? guardado : {};
  const out = {};
  Object.keys(base).forEach(k => { if (conocidas.indexOf(k) === -1) out[k] = base[k]; });
  return Object.assign(out, (nuevo && typeof nuevo === 'object') ? nuevo : {});
}

// ¿Este cliente puede recibir cobros, recordatorios, chat o push? El coach NO:
// no se cobra, no se escribe ni se notifica a sí mismo. Un solo lugar donde
// preguntarlo, para que ninguna superficie nueva se olvide.
function clientIsBillable(c) { return !!c && !isSelfClient(c); }
function clientIsContactable(c) { return !!c && !isSelfClient(c); }

// Separa la lista para persistir: el coach JAMÁS va como fila de cliente.
// Devuelve { clients, self } — `clients` es lo que se puede mandar a
// `updateClientRow`, `self` lo que va a `upsertOwn`. Pura y sin sorpresas.
function splitSelfFromClients(list) {
  const arr = Array.isArray(list) ? list : [];
  return {
    clients: arr.filter(c => !isSelfClient(c)),
    self: arr.find(isSelfClient) || null,
  };
}

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
const _NUT_GOALS = ['volumen', 'definicion', 'cutting', 'mantenimiento', 'recomposicion'];
function inferNutGoal(nut) {
  if (!nut) return null;
  if (nut.goal && _NUT_GOALS.indexOf(nut.goal) !== -1) return nut.goal;
  const t = ((nut.plan || '') + ' ' + (nut.avoid || '')).toLowerCase();
  // «recomposición» va ANTES que mantenimiento: su texto habla de mantener las calorías y
  // caería en el cubo equivocado, que es justo el que NIEGA lo que es una recomposición.
  if (/recomposici/.test(t)) return 'recomposicion';
  if (/cutting/.test(t)) return 'cutting';
  if (/definici|definir/.test(t)) return 'definicion';
  if (/super[áa]vit|volumen|ganar m[áa]sa|masa muscular|ganancia/.test(t)) return 'volumen';
  if (/d[ée]ficit|perder grasa|p[ée]rdida de grasa|bajar de peso/.test(t)) return 'cutting';
  if (/mantener|mantenimiento|balance cal/.test(t)) return 'mantenimiento';
  return null;
}

// ── El objetivo del PLAN que le corresponde al objetivo del ASESORADO. Fuente ÚNICA: la usa
// «✨ Generar» para ROTULAR lo que acaba de calcular y la habitación de nutrición para explicar
// el «por qué» de la estimación automática (antes era un mapa suelto en app-5). ──
const NUT_GOAL_BY_CLIENT = {
  'Perder grasa': 'cutting',
  'Ganar músculo': 'volumen',
  'Fuerza': 'volumen',
  'Recomposición': 'recomposicion',
  'Resistencia': 'mantenimiento',
};
// `client` es opcional y sirve para dos cosas, las dos del dictamen de Andrés Hyp:
//  (1) si es menor de edad y su objetivo implicaría déficit, el rótulo dice MANTENIMIENTO —
//      porque eso es lo que el motor le entrega (ver `nutritionEstimate`). Cambiar el número y
//      dejar el rótulo viejo es el defecto de v437.
//  (2) «Recomposición» en un menor de peso normal NO es un objetivo: no tiene nada que
//      recomponer, y el texto de una recomposición es lenguaje de composición corporal, que es
//      exactamente lo que no debe leer una niña de 15 años. Se le habla de salud general.
function nutGoalForClient(goal, client, weightKg) {
  return nutMinorSafeGoal(NUT_GOAL_BY_CLIENT[goal] || 'mantenimiento', client, weightKg);
}

// 🔴 EL CANDADO DE MENORES VIVE AQUÍ, en un solo sitio, porque hay DOS caminos por los que se
// elige qué explicación lee el asesorado y el candado solo estaba en uno: cuando el coach TIENE
// un plan guardado, el rótulo salía de `inferNutGoal(nut)`, que ni siquiera recibe al cliente
// (`app-5-salud.js`, la habitación de nutrición). Hallazgo de Sofía al auditar v449 antes de
// publicarla: con un toque del botón «Recomposición 🔄» sobre el plan de una niña de 15 años, la
// app le explicaba «que cambie de qué está hecho ese peso: menos grasa y más músculo» — el
// lenguaje de composición corporal que el dictamen prohíbe justamente en lo que ella lee.
// La regla: el candado va donde se ELIGE EL TEXTO, no donde se infiere el objetivo.
const NUT_GOALS_COMPOSICION = ['cutting', 'definicion', 'recomposicion'];
function nutMinorSafeGoal(goalKey, client, weightKg) {
  if (!goalKey) return goalKey;
  if (!(client && isMenor(client))) return goalKey;
  if (NUT_GOALS_COMPOSICION.indexOf(goalKey) !== -1) return 'mantenimiento';
  // Y «volumen» tampoco, cuando la banda le acaba de quitar el superávit por IMC (REGLA 3): la
  // explicación «superávit calórico limpio para ganar masa» encima de un plan que ya NO lleva
  // superávit es el defecto de v437 en la única superficie que ella lee de verdad. Sin sobrepeso
  // se queda como está: un adolescente delgado que quiere músculo sí hace volumen (Andrés, §1.5).
  if (goalKey === 'volumen' && nutMinorBmiOver(client, weightKg)) return 'mantenimiento';
  return goalKey;
}
// El rótulo de un plan YA GUARDADO por el coach. Es la ruta hermana de `nutGoalForClient` (que
// sirve a la estimación automática) y pasa por el MISMO candado.
function nutWhyKey(nut, client, weightKg) {
  return nutMinorSafeGoal(inferNutGoal(nut), client, weightKg);
}

// ── ¿El RÓTULO del plan contradice sus propios números? Un plan rotulado «mantenimiento» que
// entrega 500 kcal MENOS de lo que la persona gasta le explica al asesorado que «está comiendo
// en balance: lo que gastas» encima de un déficit. Devuelve null si concuerdan, o
// {dice, real} con la dirección que anuncia el rótulo y la que hacen los números.
// Tolerancia ±5% del gasto: redondeos y ciclado calórico no son una contradicción. ──
// La dirección calórica de una RECOMPOSICIÓN es 0 (Andrés Hyp, punto 2 del dictamen): el ±200
// desaparece dentro del error de la propia estimación. Lo que la dirige es la proteína alta.
const NUT_GOAL_DIR = { cutting: 'deficit', definicion: 'deficit', volumen: 'superavit', mantenimiento: 'balance', recomposicion: 'balance' };
const NUT_DIR_TOL = 0.05;
function nutKcalDirection(kcal, tdee) {
  const k = parseFloat(kcal), t = parseFloat(tdee);
  if (!k || !t) return null;
  if (k < t * (1 - NUT_DIR_TOL)) return 'deficit';
  if (k > t * (1 + NUT_DIR_TOL)) return 'superavit';
  return 'balance';
}
// `client` es opcional y sirve para UNA cosa: a un MENOR la app le impone un número dentro de una
// FRANJA (gasto ×1,05 a ×1,10), y esa franja entera cabe dentro de la tolerancia del detector —los
// dos márgenes son del mismo tamaño—. Sin esto, la app marca como «su rótulo se contradice» el
// número que ella misma acaba de elegir: primero por 3 kcal cuando llegó el piso (v485), y después
// el volumen legítimo de un adolescente delgado cuando llegó el techo (v493). Un detector que
// marca lo que el propio sistema hace a propósito enseña a ignorarlo.
function nutGoalMismatch(nutGoal, kcal, tdee, client) {
  const dice = NUT_GOAL_DIR[nutGoal];
  if (!dice) return null;                       // sin rótulo legible no hay contradicción que marcar
  // 🔴 Y desde la banda, el margen del piso ya no es un PUNTO sino una FRANJA — el mismo choque de
  // v485, una talla más grande. La app le impone al menor un número entre gasto ×1,05 y ×1,10, y
  // esa franja entera cabe DENTRO de la tolerancia del detector (±5%): con el techo puesto, un
  // adolescente delgado en volumen legítimo caía en «balance» y su ficha marcaba «el rótulo
  // miente» por un superávit que la app le acababa de recortar A PROPÓSITO. Dentro de la franja el
  // número lo elige el sistema, no el rótulo: no hay nada que corregirle al coach.
  // 🗑️ Aquí vivía además `ref = tdee × 1,05` para los menores (v485). Se BORRÓ al llegar la franja
  // y no por gusto: su sabotaje salió VERDE. La franja cubre el caso que aquel `ref` existía para
  // cubrir (el piso exacto) y los dos únicos llamadores le entregan siempre un número de dentro
  // —la ficha pasa lo SERVIDO y el editor corta antes con su propio aviso—, así que era una
  // segunda definición de «el punto de referencia de un menor» esperando a discrepar de esta.
  if (client && isMenor(client) && tdee > 0 && kcal > 0
    && kcal >= Math.round(tdee * NUT_MENOR_PISO_MARGEN)
    && kcal <= Math.round(tdee * NUT_MENOR_TECHO_MARGEN) + NUT_MENOR_GRANO) return null;
  const real = nutKcalDirection(kcal, tdee);
  if (!real) return null;                       // sin gasto (faltan datos del cuerpo) no se opina
  return real === dice ? null : { dice, real };
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
// 🔴 MENORES DE 18: Mifflin-St Jeor NO está validado por debajo de esa edad — no incluye el
// costo energético del crecimiento y SUBESTIMA. Medido en una asesorada real (F, 15 años, 52 kg,
// 161 cm): Mifflin da 1.290 kcal de basal y Schofield 1.389, y con su factor de actividad eso son
// ~136 kcal/día que la app le estaba quitando **a una niña en crecimiento**, bajo un rótulo que
// decía «mantenimiento». Para 10-18 años se usa **Schofield (FAO/OMS/UNU, 1985)**, que es la
// ecuación de referencia en esa franja. Veredicto de Andrés Hyp, 2026-08-05.
const TMB_MENOR_EDAD = 18;
function calcTMB(weightKg, heightCm, age, sex) {
  const w = parseFloat(weightKg), h = parseFloat(heightCm), a = parseInt(age);
  if (!w || !h || !a || !sex) return null;
  if (a < TMB_MENOR_EDAD) {
    // Schofield 10-18 años (por peso). Debajo de 10 usa la banda 3-10, por si acaso.
    const b = a >= 10
      ? (sex === 'M' ? 17.686 * w + 658.2 : 13.384 * w + 692.6)
      : (sex === 'M' ? 22.706 * w + 504.3 : 20.315 * w + 485.9);
    return Math.round(b);
  }
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(sex === 'M' ? base + 5 : base - 161);
}
// ¿Es menor de edad? Una sola definición para todo el motor.
function isMenor(client) {
  const a = parseInt(client && client.age);
  return Number.isFinite(a) && a > 0 && a < TMB_MENOR_EDAD;
}

// ── ¿EL IMC DE UN MENOR LO PONE EN SOBREPESO PARA SU EDAD Y SU SEXO? ──────────────────────
// En un adulto «sobrepeso» es un número quieto (IMC 25). Entre los 5 y los 19 años NO lo es: el
// corte se mueve con la edad y con el sexo, y compararlo contra 25 no es ser estricto, es medir
// otra cosa. A los 16 años el corte de una mujer son 24,3 y el de un hombre 23,9; a los 11 son
// 20,3 y 19,5.
// Tabla: OMS, *Growth reference data for 5-19 years* (2007), indicador **BMI-for-age**, columna
// **+1 DE** de las tablas de puntuación z (`bmi-girls-z-who-2007-exp.xlsx` y
// `bmi-boys-z-who-2007-exp.xlsx`, descargadas de who.int el 2026-08-18). En esa referencia la OMS
// define **sobrepeso > +1 DE** y obesidad > +2 DE.
// La app solo guarda la edad en AÑOS, así que de cada año se toma el mes CENTRAL (edad × 12 + 6):
// ni el corte más estricto del año ni el más laxo, el de la mitad del año que la persona declara.
// Debajo de 5 años manda otra referencia (OMS 0-5, donde sobrepeso es > +2 DE) y aquí NO se
// extrapola: devuelve null, y quien pregunte se queda sin recorte por IMC en vez de con uno
// inventado. Igual sin sexo declarado (el corte es distinto por sexo: no hay tabla neutra).
const WHO_BMI_SD1 = {
  F: { 5: 16.923, 6: 17.131, 7: 17.488, 8: 18.012, 9: 18.666, 10: 19.429, 11: 20.320, 12: 21.305, 13: 22.279, 14: 23.145, 15: 23.832, 16: 24.324, 17: 24.649 },
  M: { 5: 16.676, 6: 16.888, 7: 17.231, 8: 17.663, 9: 18.179, 10: 18.808, 11: 19.542, 12: 20.375, 13: 21.298, 14: 22.235, 15: 23.116, 16: 23.910, 17: 24.603 },
};
function nutMinorBmiOver(client, weightKg) {
  if (!client || !isMenor(client)) return null;
  const sx = client.sex === 'M' || client.sex === 'F' ? client.sex : null;
  if (!sx) return null;
  const corte = WHO_BMI_SD1[sx][parseInt(client.age)];
  if (corte == null) return null;
  const bmi = bmiFrom(weightKg != null && weightKg !== '' ? weightKg : client.weight, client.height);
  if (bmi == null) return null;
  return bmi > corte;
}

// 🔴 El nombre de la ecuación que DE VERDAD se usó, derivado de la misma pregunta que hace
// `calcTMB`. Estaba escrito a mano en tres pantallas y v448 cambió el cálculo sin tocar el texto:
// desde entonces la app le decía «fórmula Mifflin-St Jeor» a una asesorada de 16 años — que es
// justo la ecuación que el dictamen prohibió usarle por no estar validada bajo 18. Un rótulo que
// nombra el método tiene que salir del método, no de la memoria de quien escribió el HTML.
function tmbFormulaName(client) {
  return isMenor(client) ? 'Schofield (FAO/OMS/UNU)' : 'Mifflin-St Jeor';
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
    // Recomposición = mantenimiento calórico con la proteína arriba. NO lleva ±200: ese ajuste
    // desaparece dentro del error de la propia estimación (Mifflin × factor es ±10-15%). Lo que
    // la dirige es la proteína y la medición de cintura cada 3-4 semanas (dictamen, punto 2).
    case 'Recomposición': deficit = 0;    label = 'Mantenimiento calórico con proteína alta'; break;
    case 'Fuerza':        deficit = +200; label = 'Superávit moderado para rendimiento'; break;
    case 'Resistencia':   deficit = 0;    label = 'Mantenimiento con foco en carbohidratos'; break;
    default:              deficit = 0;    label = 'Mantenimiento calórico'; break;
  }
  return { kcalObj: tdee ? tdee + deficit : null, label, deficit };
}

// Macros desde las calorías objetivo: proteína por kg (`nutProtPerKg`), grasa
// 0.9 g/kg, el resto a carbohidratos con piso propio. Sin kcal o sin peso →
// null. Devuelve { prot_g, fat_g, carb_g, kcal }.
// ── PISOS FISIOLÓGICOS de una recomendación calórica (Andrés Hyp, 2026-08-03) ──
// Nadie recibe un objetivo por debajo de su metabolismo basal ni del mínimo por sexo.
const NUT_KCAL_FLOOR_F = 1200;
const NUT_KCAL_FLOOR_M = 1500;
const NUT_CARB_MIN_G_KG = 2.0;   // el carbohidrato es un PISO de rendimiento, no un residuo
const NUT_BMI_RAMPA_LO = 28;     // debajo de aquí se dosifica sobre el peso real
const NUT_BMI_RAMPA_HI = 32;     // desde aquí, el ajuste completo (ideal + 0,25 × exceso)
const NUT_BMI_IDEAL = 22.5;

function nutKcalFloor(tmb, sex) {
  const abs = sex === 'M' ? NUT_KCAL_FLOOR_M : NUT_KCAL_FLOOR_F;
  return Math.max(abs, Math.round(parseFloat(tmb) || 0));
}

// Peso de REFERENCIA para dosificar proteína y grasa. Dosificar sobre el peso TOTAL a partir de
// cierta grasa corporal dispara los dos macros hasta que no queda espacio para el carbohidrato
// — es lo que dejaba a una mujer de 82 kg con 0 g de carbohidrato. El ajuste completo es
// `ideal + 0,25 × exceso`, con el ideal en IMC 22,5.
// 🔴 Ese ajuste NO puede entrar de golpe en un umbral. Verificado el 2026-08-05: con el corte
// seco en IMC 30, **200 gramos de báscula cambiaban 30 g de proteína** — una mujer de 156 cm a
// 72,9 kg recibía 160 g y a 73,1 kg, 130 g. Y muerde al revés de como debería: Claudia está en
// IMC 30,4, y si baja 1,1 kg —que es el propósito de su plan— su proteína SALTA de 131 a 160 sin
// ninguna razón que ella pueda ver. Al PO ya le pasó cruzando de 90 a 92 kg en julio.
// La rampa lo hace CONTINUO entre IMC 28 y 32 (146→145 al cruzar, en vez de 160→130). Es
// idéntica a la fórmula anterior por encima de 32 y por debajo de 28: solo cambia la franja que
// estaba rota. Regla de Andrés Hyp, punto 6 del dictamen.
function nutRefWeight(weightKg, heightCm) {
  const w = parseFloat(weightKg);
  if (!(w > 0)) return null;
  const h = parseFloat(heightCm);
  if (!(h > 0)) return w;                       // sin estatura no hay IMC: se queda como estaba
  const m = h / 100, imc = w / (m * m);
  const t = Math.max(0, Math.min(1, (imc - NUT_BMI_RAMPA_LO) / (NUT_BMI_RAMPA_HI - NUT_BMI_RAMPA_LO)));
  if (t <= 0) return w;                         // debajo de IMC 28: el peso real, sin tocar
  const ideal = NUT_BMI_IDEAL * m * m;
  const ajustado = ideal + 0.25 * (w - ideal);  // el ajuste COMPLETO (la fórmula de v428)
  // Los dos extremos se devuelven TAL CUAL, no como resultado de la interpolación: `w - 1×(w-a)`
  // es `a` en álgebra pero no bit a bit en punto flotante, y esa diferencia de última cifra caía
  // del otro lado del redondeo a 0,1 kg en IMC ~48-54. La identidad fuera de la franja tiene que
  // ser por construcción, no por suerte.
  if (t >= 1) return Math.round(ajustado * 10) / 10;
  return Math.round((w - t * (w - ajustado)) * 10) / 10;
}

// ── Cuánta proteína por kilo de peso de REFERENCIA ────────────────────────────────────────────
// 🔴 Regla de Andrés Hyp (punto 1 del dictamen, 2026-08-05): **2,2 g/kg si el objetivo depende de
// construir o CONSERVAR músculo; 1,8 si no.** Antes el 2,2 se daba solo a «músculo» y «fuerza», lo
// que metía a «Perder grasa» en el cubo bajo — que es donde la proteína alta importa MÁS, porque
// ahí hay un déficit de 500 kcal tirando del músculo. Y encima la app le decía a esa persona
// «mantenemos la proteína alta para no perder lo ganado» encima de la dosis más baja del motor:
// la mentira de v437 otra vez. «Recomposición» estaba en el mismo hueco.
// No 2,4 (aunque las tablas lo permitan): el carbohidrato paga la diferencia y es el combustible
// del estímulo; entre 2,2 y 2,4 se gana poco y en esta población nadie pesa al gramo.
const NUT_PROT_ALTA = ['Ganar músculo', 'Fuerza', 'Recomposición', 'Perder grasa'];
const NUT_PROT_G_KG_ALTA = 2.2;
const NUT_PROT_G_KG_BASE = 1.8;   // se queda con Resistencia y Salud general
function nutProtPerKg(goal) {
  return NUT_PROT_ALTA.indexOf(goal) !== -1 ? NUT_PROT_G_KG_ALTA : NUT_PROT_G_KG_BASE;
}

// Macros desde las calorías objetivo: proteína (`nutProtPerKg`) y grasa 0.9 g/kg sobre el peso
// de REFERENCIA (`nutRefWeight`); el carbohidrato tiene PISO propio.
// 🔴 Antes el carbohidrato era «lo que sobre, mínimo 0», y ese `Math.max(0, …)` se tragaba el
// desbordamiento EN SILENCIO: medido el 2026-08-03, una mujer de 50 años, 48 kg, 150 cm,
// sedentaria y con objetivo «Perder grasa» recibía **708 kcal/día con 0 g de carbohidrato** —
// el 70% de su propio metabolismo basal. Ninguna persona real cayó ahí (todas tienen factor
// 1.55), pero 3 de las 10 mujeres de producción quedaban a UN TOQUE: basta que se marquen
// «sedentaria». `heightCm` es opcional — sin ella se dosifica sobre el peso total, como antes.
function calcMacrosFromKcal(kcalObj, weightKg, goal, heightCm) {
  const w = parseFloat(weightKg);
  if (!kcalObj || !w) return null;
  const ref = nutRefWeight(w, heightCm);
  const prot_g = Math.round(ref * nutProtPerKg(goal));
  const fat_g = Math.round(ref * 0.9);
  const carbMin = Math.round(ref * NUT_CARB_MIN_G_KG);
  let kcal = kcalObj;
  let carb_g = Math.round((kcal - prot_g * 4 - fat_g * 9) / 4);
  if (carb_g < carbMin) {
    // No cabe el piso de carbohidrato → SUBE la caloría objetivo. Poner 0 g y callarse era
    // entregar una dieta sin carbohidratos sin que nadie se enterara.
    carb_g = carbMin;
    kcal = prot_g * 4 + fat_g * 9 + carb_g * 4;
  }
  return { prot_g, fat_g, carb_g, kcal };
}

// ── El peso VIGENTE de una persona ────────────────────────────────────────────────────────────
// 🔴 Fuente ÚNICA de «cuánto pesa hoy». Existía repetida en 5 sitios como `bw[bw.length-1]`, y
// ese índice es EL EXTREMO EQUIVOCADO: `saveBodyweight` guarda con `unshift` + `sort` DESCENDENTE
// (app-4-entreno.js), así que el último elemento del arreglo es el registro MÁS VIEJO. Medido
// contra producción el 2026-08-06: los 5 historiales con más de un registro están en orden
// descendente y 4 personas recibían un plan calculado sobre un peso que ya no era el suyo —
// Nataly con 54 kg cuando pesa 59,5 (85 kcal y 12 g de proteína de diferencia), Kathe con los
// 85 kg de mayo cuando ya bajó a 83, Samuel con 88 en vez de 86. O sea: **pesarse no movía el
// plan**, que es justo lo que el plan promete. La app leía el primer peso de la persona, para
// siempre. Quinta superficie de la familia v435/v444/v448.
// Se decide por FECHA, no por posición, para no depender del orden en que llegue el arreglo.
// Si ningún registro trae fecha usable, gana el índice 0 (el convenio de escritura).
function lastBodyweightKg(bwList) {
  if (!Array.isArray(bwList) || !bwList.length) return null;
  let kgGanador = null, tGanador = -Infinity, kgSinFecha = null;
  for (const e of bwList) {
    if (!e) continue;
    const kg = parseFloat(e.kg);
    if (!(kg > 0)) continue;
    if (kgSinFecha == null) kgSinFecha = kg;
    // `new Date(null)` devuelve EPOCH, no Invalid Date: hay que atajar el nulo ANTES de parsear.
    if (e.date == null || e.date === '') continue;
    const t = new Date(e.date).getTime();
    if (!Number.isFinite(t)) continue;
    if (t > tGanador) { tGanador = t; kgGanador = kg; }
  }
  return kgGanador != null ? kgGanador : kgSinFecha;
}

// El peso con el que se le calcula el plan a alguien: el último que registró y, si nunca
// registró ninguno, el de su ficha (que envejece — por eso es el respaldo, no la fuente).
function nutWeightFor(client, bwList) {
  const ultimo = lastBodyweightKg(bwList);
  return ultimo != null ? ultimo : (client && client.weight);
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
  // 🔴 UN MENOR NUNCA LLEVA DÉFICIT. Ni con objetivo «Perder grasa», ni con «Recomposición».
  // Está creciendo: restarle energía no es un plan, es un riesgo — y además «recomposición» en
  // alguien de peso normal no es un objetivo. Se le entrega su mantenimiento y el TEXTO lo dice
  // (si se cambiara el número y se dejara el rótulo, sería la mentira de v437 otra vez).
  // Regla de Andrés Hyp (2026-08-05), sobre 5 menores reales en la base.
  if (isMenor(client) && t.deficit < 0) {
    t.kcalObj = tdee;
    t.deficit = 0;
    t.label = 'Mantenimiento: estás creciendo, así que tu plan no baja de lo que gastas';
  }
  // El objetivo NUNCA baja del piso fisiológico. Y si lo tocó, el texto tiene que decir la
  // verdad: seguir anunciando «Déficit de 500 kcal/día» mientras se entrega el basal sería
  // cambiar el número y dejar la mentira.
  const piso = nutKcalFloor(tmb, sx);
  const tocoPiso = t.kcalObj != null && t.kcalObj < piso;
  const kcalPiso = tocoPiso ? piso : t.kcalObj;
  const macros = calcMacrosFromKcal(kcalPiso, w, client.goal, client.height);
  const kcalObj = macros ? macros.kcal : kcalPiso;
  const ajustado = tocoPiso || (kcalPiso != null && kcalObj > kcalPiso);
  const label = ajustado
    ? 'Mínimo seguro para tu cuerpo (no bajamos de lo que gastas en reposo)'
    : t.label;
  const water = w ? Math.round(w * 35 / 250) : null; // ~35 ml/kg en vasos de 250 ml
  // 🔴 LA BANDA DE MENORES SE APLICA AQUÍ TAMBIÉN, y no es una redundancia: `nutritionEstimate` es
  // una superficie PÚBLICA que leen cinco sitios por su cuenta (la habitación de Nutrición, la
  // calculadora del Perfil, el prefill de «✨ Generar», el oráculo del editor y el compartir por
  // WhatsApp), mientras el plato, «Hoy» y la lista del mercado leen la salida de `nutBaseFor`.
  // Con la banda en un solo lado, las dos mitades de la app pintaban números distintos para la
  // misma persona (medido: 2.111 contra 2.219 en una menor real). Misma función, mismos datos,
  // mismo resultado: la banda no es de una pantalla, es de la persona.
  const _band = nutMinorBandBase({ kcalObj, macros }, client, w);
  const out = {
    tmb, tdee, af, kcalObj: _band.kcalObj, label,
    deficit: _band.kcalObj != null && tdee ? Math.round(_band.kcalObj - tdee) : t.deficit,
    floored: !!ajustado, macros: _band.macros, water,
  };
  // El motivo viaja con el número: la pantalla de ella y la ficha del coach explican POR QUÉ le
  // cambió el plan, y sin esto la explicación se quedaba solo en la mitad `nutBaseFor` de la app.
  if (_band.minorFloor) out.minorFloor = _band.minorFloor;
  if (_band.minorCap) out.minorCap = _band.minorCap;
  if (_band.minorFloorUnknown) out.minorFloorUnknown = true;
  // Y el RÓTULO no puede quedarse anunciando el superávit que la banda acaba de quitar: cambiar el
  // número y dejar el texto viejo es, literalmente, el defecto de v437.
  if (_band.minorCap) {
    out.label = _band.minorCap.sobrepeso
      ? 'Mantenimiento: estás creciendo, así que tu plan acompaña lo que gastas y el músculo lo pone el entrenamiento'
      : 'Superávit de ' + Math.max(0, _band.minorCap.techo - tdee) + ' kcal/día (ganancia limpia)';
  }
  return out;
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
// 🔴 Esta lista es el POOL DEL RECETARIO: cerrada, curada, con `rol` y `maxG` de nutrición
// deportiva, y **referenciada POR ID desde `NUT_MENUS`** (41 de sus 50, verificado 2026-08-05).
// NO crece con el uso y NO se fusiona con nada. El registro de alimentos que el PO aprobó el
// 2026-08-04 —revirtiendo la decisión del 2026-07-09— vive en la OTRA capa (`foods.json`, ver
// `foodCatalog` más abajo): ahí sí entra la TCAC del ICBF y ahí busca el usuario. Mezclarlas
// rompería los platos que la app ya recomienda. Estipulación E5 de Fable.
//
// Macros por 100 g del alimento LISTO PARA COMER (cocido cuando aplica), que es
// como lo pesa una persona en su cocina. `un` = medida casera y sus gramos, para
// poder decir «2 huevos» o «1 taza de arroz» en vez de «104 g».
// ──────────────────────────────────────────────────────────────────────
const NUT_FOODS = [
  // ── PROTEÍNA ──
  { id: 'pollo_pechuga', src: 'usda_sr', ref: "FDC 171477 - Chicken, broilers or fryers, breast, meat only, cooked, roasted", name: 'Pechuga de pollo', rol: 'prot', kcal: 165, p: 31.0, c: 0, f: 3.6, un: { label: 'porción', g: 120 } },
  // 🔴 v490 · LAS CUATRO CARNES QUE QUEDABAN SIN FUENTE. Ninguno de sus números anteriores
  // reconcilia con NINGUNA fila de la TCAC ni de USDA (comprobado contra la API el 2026-08-16):
  // eran cifras de cabeza, la misma clase que el 112 de la yuca. Las de aquí son la fila que
  // imprime la fuente, sin factores ni ajustes. La sección F de la TCAC solo publica carbohidrato
  // TOTAL (no tiene columna de «disponibles»), así que en las carnes ese criterio ni se plantea.
  { id: 'pollo_muslo', src: 'tcac2018', ref: "TCAC 2018 (ICBF) F074, pag. 72 - Pollo, contramuslo sin piel, cocido, sin sal; carbohidrato TOTAL", name: 'Muslo de pollo sin piel', rol: 'prot', kcal: 186, p: 24.7, c: 0, f: 9.7, compra: 'un', un: { label: 'muslo', g: 95 } },
  // «Posta» en Colombia es el corte de CADERA (posta de cadera, posta negra), y esa es la fila.
  // Va la preparación «frita» porque la TCAC no publica cadera de otra forma — y no mete grasa
  // ajena: sus 6,6 g están a un pelo de la res magra CRUDA (F099, 5,7 g), o sea que lo que subió
  // es la concentración por pérdida de agua, no el aceite. Se dice aquí para que se pueda discutir.
  { id: 'res_magra', src: 'tcac2018', ref: "TCAC 2018 (ICBF) F095, pag. 74 - Res, cadera, frita, sin sal; carbohidrato TOTAL", name: 'Carne de res magra (posta)', rol: 'prot', kcal: 176, p: 28.7, c: 0.5, f: 6.6, un: { label: 'porción', g: 120 } },
  // 🔴 La TCAC NO tiene carne molida COCIDA: su única fila molida (F101) es CRUDA, y esta tabla es
  // cocido-base. Pero sí sirve para elegir la de USDA: la TCAC llama «semigorda» a la molida
  // colombiana (F101, 12,7 g de grasa en crudo), que cae entre el 85% magro de USDA (17,4 g crudo)
  // y el 90% (10,0 g crudo) — más cerca del 90. Y la forma es «crumbles», que es como se cocina
  // aquí (desmenuzada en el guiso), no en torta.
  { id: 'res_molida', src: 'usda_sr', ref: "FDC 171794 - Beef, ground, 90% lean meat / 10% fat, crumbles, cooked, pan-browned", name: 'Carne molida de res', rol: 'prot', kcal: 230, p: 28.4, c: 0, f: 12.0, un: { label: 'porción', g: 120 } },
  { id: 'cerdo_lomo', src: 'tcac2018', ref: "TCAC 2018 (ICBF) F018, pag. 68 - Cerdo, lomo, cocido, sin sal; carbohidrato TOTAL", name: 'Lomo de cerdo', rol: 'prot', kcal: 170, p: 35.1, c: 0, f: 3.2 , un: { label: 'porción', g: 120 } },
  // 🔒 `maxG: 200` = 4 huevos (v495). Era el ÚNICO proteico sin tope de ración, y el tope se pone
  // donde lo ponen sus pares por densidad: la clara también lo tiene en 200 g. Sin él, medido sobre
  // las 17 personas reales, **17 de las 117 comidas con huevo servían más de 4** — cinco huevos en
  // una sentada a Miguel, Samuel, Cristian, Yeison y Sharith, y **seis (300 g) en un desayuno**.
  // Cuesta CERO: comidas por debajo del 85% de su proteína 0 → 0, comidas pasadas del 130% 3 → 3,
  // variedad 44 → 44, ración proteica mínima 50 g. Solo desaparecen las raciones de 5 y 6.
  // ⚠️ Y lo que este tope NO hace, medido antes de ponerlo: **no cierra la esquina** del barrido
  // (93%-114% con tope y sin él), así que la franja del registro sigue en ±14%. Cerrarla exige
  // bajar el tope a **2 huevos**, y eso sí se paga: tres cenas reales caen al 84% de su proteína,
  // las comidas pasadas de proteína suben de 3 a 7 y la variedad baja de 44 a 41. Es una decisión
  // dietética, no técnica: la toma Andrés. Y el valor intermedio es PEOR que no poner nada —
  // con 150 g (3 huevos) la esquina EMPEORA a 114,6%, que es el «recorta en vez de repartir» del
  // 2026-08-10 otra vez: el menú deja de caber y el selector se va a otro con raciones mayores.
  { id: 'huevo', src: 'usda_sr', ref: "FDC 171287 - Egg, whole, raw, fresh", name: 'Huevo entero', rol: 'prot', kcal: 143, p: 13.0, c: 1.1, f: 9.9, maxG: 200, compra: 'un', un: { label: 'huevo', g: 50 } },
  { id: 'clara', src: 'usda_sr', ref: "FDC 172183 - Egg, white, raw, fresh", name: 'Clara de huevo', rol: 'prot', kcal: 52, p: 11.0, c: 0.7, f: 0.2, maxG: 200, un: { label: 'clara', g: 33 } },
  // ⏭️ PARA EL LOTE DE CONVERSIÓN (dictamen de Andrés Hyp + decisión del PO, 13-ago): estos
  // macros son de pescado COCIDO (la TCAC E043 da la mojarra entera cruda en 96 kcal / 20,1 P).
  // **El PO decidió que aquí se compra ENTERA**, así que el factor de compra es el peor de toda
  // la tabla: 100 g listos ← 128 g de filete crudo (Bognár 2002, tabla 13, pescado magro
  // hervido 0,77) ÷ 62% de parte comestible (TCAC 2018, E043, pág. 67) = **207 g comprados**.
  // O sea que hoy la lista pide MENOS DE LA MITAD del pescado. No se convierte todavía porque
  // la conversión va antes de repartir en unidades y eso toca los 14 `compra:'un'`.
  { id: 'tilapia', src: 'usda_sr', ref: "FDC 175177 - Fish, tilapia, cooked, dry heat", name: 'Mojarra o tilapia', rol: 'prot', kcal: 128, p: 26.0, c: 0, f: 2.7, un: { label: 'porción', g: 130 } },
  // `un.g` = 100: la lata colombiana de 160 g NETOS escurre ~104 g (Van Camp's, etiqueta y
  // ficha de Éxito/Open Food Facts, verificado 2026-08-03). Decía 120 g = una lata que no existe.
  { id: 'atun', src: 'usda_sr', ref: "FDC 171986 - Fish, tuna, light, canned in water, without salt, drained solids", name: 'Atún en agua (escurrido)', rol: 'prot', kcal: 116, p: 26.0, c: 0, f: 1.0, compra: 'un', un: { label: 'lata', g: 100 }, un2: { label: 'cucharada', g: 20 } },
  { id: 'queso_campesino', src: 'tcac2018', ref: "TCAC 2018 (ICBF) G017, pag. 78 - Queso fresco, semiduro, semigraso, tipo campesino; carbohidrato TOTAL", name: 'Queso campesino', rol: 'prot', kcal: 301, p: 17.5, c: 0.3, f: 25.5, maxG: 90, un: { label: 'tajada', g: 30 } },
  { id: 'cuajada', src: 'tcac2018', ref: "TCAC 2018 (ICBF) G016, pag. 78 - Queso fresco, semiblando, semimagro, tipo cuajada; carbohidrato TOTAL", name: 'Cuajada', rol: 'prot', kcal: 207, p: 15.2, c: 2.0, f: 15.4, maxG: 150, un: { label: 'porción', g: 60 } },
  { id: 'yogur_griego', src: 'usda_sr', ref: "FDC 170894 - Yogurt, Greek, plain, nonfat (Includes foods for USDAs Food Distributi", name: 'Yogur griego natural', rol: 'prot', kcal: 59, p: 10.0, c: 3.6, f: 0.4, maxG: 400, un: { label: 'vaso', g: 200 } },
  // 🔴 La TCAC NO tiene leche SEMIDESCREMADA: publica entera (G012), descremada (G007) y cruda,
  // nada en medio. No se cambia el alimento para que quepa en la fuente —el coach receta
  // semidescremada y eso es lo que se compra— así que la fila viene de USDA, como otras 35 de esta
  // tabla. El 2% de grasa de USDA cae DENTRO del rango que la norma colombiana le exige a una
  // semidescremada (1,5-2,0%), en su tope alto.
  { id: 'leche', src: 'usda_sr', ref: "FDC 172205 - Milk, reduced fat, fluid, 2% milkfat, without added vitamin A and vitamin D", name: 'Leche semidescremada', rol: 'prot', kcal: 50, p: 3.3, c: 4.8, f: 1.98, maxG: 400, un: { label: 'vaso', g: 200 } },
  { id: 'lenteja', src: 'usda_sr', ref: "FDC 172421 - Lentils, mature seeds, cooked, boiled, without salt", name: 'Lentejas cocidas', rol: 'prot', kcal: 116, p: 9.0, c: 20.0, f: 0.4, maxG: 350, un: { label: 'taza', g: 200 } },
  { id: 'frijol', src: 'usda_sr', ref: "FDC 175194 - Beans, kidney, red, mature seeds, cooked, boiled, without salt", name: 'Fríjol cocido', rol: 'prot', kcal: 127, p: 9.0, c: 23.0, f: 0.5, maxG: 350, un: { label: 'taza', g: 180 } },
  { id: 'garbanzo', src: 'usda_sr', ref: "FDC 173757 - Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled,", name: 'Garbanzo cocido', rol: 'prot', kcal: 164, p: 9.0, c: 27.0, f: 2.6, maxG: 300, un: { label: 'taza', g: 165 } },
  // ── CARBOHIDRATO ──
  // ⚠️ AQUÍ NO HAY `maxG` A PROPÓSITO, Y SE INTENTÓ (2026-08-10). Léelo antes de volver a ponerlo.
  // EL PROBLEMA ES REAL: `maxG` nació para los alimentos proteicos (la leche que pedía 1.000 g) y
  // ningún carbohidrato lo declara, así que —medido sobre 770 comidas reales— **170 sirven ≥3
  // raciones caseras**: «252 g de pan integral» son 9 tajadas y «800 g de papa criolla» son 8
  // porciones. Pero **topar NO lo arregla**, y esto está medido por alimento sobre las 22 personas:
  //   · los 5 topes «baratos» juntos → carbohidrato entregado **−6,8% → −11,1%** y las porciones
  //     sobre 3 raciones se quedan **igual (139 → 140)**. Dos de ellos las AUMENTAN, porque al
  //     recortar un alimento el selector se va a otro menú con porciones más grandes.
  //   · topar los 11 → **−20,9%** de carbohidrato y rompe el guardián de −13% que ya existe.
  //   · `mazorca` no cambia NADA (idéntico con y sin).
  // 🔑 LA CAUSA: **cada menú tiene UN SOLO carbohidrato**, así que topar no reparte — RECORTA. Se
  // cambiaría una ración fea (visible pero inocua) por un plato que no entrega lo que promete
  // (invisible y peor), que es la misma clase de defecto que se mató en v471, en espejo.
  // ✅ LA SALIDA es una SEGUNDA fuente de carbohidrato en el menú (arroz + tajada, arepa + papa),
  // que es un cambio de estructura de `NUT_MENUS` y decisión de Andrés — no un número aquí.
  { id: 'arroz', src: 'usda_sr', ref: "FDC 168878 - Rice, white, long-grain, regular, enriched, cooked", name: 'Arroz blanco cocido', rol: 'carb', kcal: 130, p: 2.7, c: 28.0, f: 0.3, maxG: 316, un: { label: 'taza', g: 158 }, un2: { label: 'cucharada', g: 20 } },
  { id: 'papa', src: 'usda_sr', ref: "FDC 170438 - Potatoes, boiled, cooked in skin, flesh, without salt", name: 'Papa cocida', rol: 'carb', kcal: 87, p: 2.0, c: 20.0, f: 0.1, maxG: 450, compra: 'un', un: { label: 'papa mediana', g: 150 } },
  { id: 'papa_criolla', src: 'tcac2018', ref: "TCAC 2018 (ICBF) B070, pag. 52 - Papa, variedad harinosa, criolla, con cascara, cocida, sin sal; carbohidrato TOTAL. La fuente imprime 85 kcal, pero 1,4 P + 18,1 C + 0 G no llegan a 85 con ningun factor (la propia fila no reconcilia); el plato se arma con los MACROS, asi que el titular se DERIVA de ellos (78) en vez de dejar un numero decorativo. Sus kJ (358) y su suma de componentes (99,9 g) confirman que la fila esta bien leida", name: 'Papa criolla cocida', rol: 'carb', kcal: 78, p: 1.4, c: 18.1, f: 0.0, maxG: 300, un: { label: 'porción', g: 100 } },
  // 🔴 Traía los valores de yuca CRUDA (USDA cassava raw = 160 kcal / 1,36 P / 38,1 C) con el
  // nombre «cocida». Cocida absorbe agua: 112 kcal / 1 P / 26,7 C / 0,2 G (verificado
  // 2026-08-03). El error de +28% en carbohidrato hacía que el motor recetara ~22% MENOS yuca
  // de la que la persona necesitaba. Hallazgo de Andrés Hyp, verificado contra fuente.
  // 🔴 ABIERTO Y SIN RESOLVER (Andrés Hyp, 13-ago) — **NO TOCAR ESTOS NÚMEROS TODAVÍA.** El 112
  // de arriba dice «verificado» pero **no cita contra qué**, y la TCAC 2018 (código B106, pág. 54,
  // yuca blanca sin cáscara cocida sin sal) da **157 kcal / 33,9 g de carbohidrato disponible**:
  // 29% más energía que lo que la app cree. Y la premisa con la que se dedujo el 112 —«cocida
  // absorbe agua»— **no se sostiene en esa misma tabla**: B106 (cocida) tiene 61,6% de humedad y
  // B107 (cruda) 60,9%, o sea que la yuca NO absorbe agua al hervirse. Si el 112 salió de una
  // deducción y no de una fila, el arreglo del 3-ago cambió un número malo por otro número
  // derivado — la clase de la yuca, otra vez en la yuca, con el signo al revés (hoy el motor la
  // cree más floja de lo que es y por eso sirve de MÁS).
  // ✅ EL PRIMER PASO YA ESTÁ HECHO (2026-08-15) — **el 112 NO SE VERIFICÓ CONTRA NADA.**
  // Es la fila CRUDA de USDA multiplicada por 0,70, en los cuatro macros:
  //     kcal  160   × 0,70 = 112,0   (AVI: 112)     factor implícito 0,7000
  //     carbo  38,1 × 0,70 =  26,67  (AVI: 26,7)    factor implícito 0,7008
  //     prot    1,36× 0,70 =   0,95  (AVI: 1,0)
  //     grasa   0,28× 0,70 =   0,20  (AVI: 0,2)
  // Comprobado además contra la API de USDA FoodData Central: **no existe ninguna fila de yuca
  // cocida con estos valores**. Las que hay son SR 169985 «Cassava, raw» (160/1,36/38,1/0,28) y
  // FNDDS 2709564 «Cassava, cooked» (191 kcal, porque lleva grasa de preparación). O sea que el
  // arreglo del 3-ago cambió un número malo por otro DERIVADO, exactamente como sospechaba la
  // nota de Andrés — y el factor 0,70 sale de una premisa («cocida absorbe agua») que la TCAC
  // desmiente con su propia humedad. Marcado `src:'derivado'` con test que lo afirma (v487).
  // ✅ CERRADO (2026-08-15): la fila B106 COMPLETA, leída del PDF oficial del ICBF (pág. 54
  // impresa). Se pudo porque las 147 páginas están escaneadas SIN capa de texto —`pdftotext`
  // devuelve vacío y por eso se creía que no había ruta— pero el PDF solo lleva cifrado de
  // propietario: se abre con contraseña vacía y cada página sale como un JPEG que SÍ se puede leer.
  //   B106 · Yuca blanca, sin cáscara, COCIDA, sin sal · Pulpa
  //     humedad 61,6 · 157 kcal · proteína 0,7 · lípidos 0,2 · carbo total 36,6 · DISPONIBLE 33,9
  //   B107 · la misma, CRUDA: humedad 60,9 · 159 kcal
  // 🔴 Los dos datos que cierran el caso: (1) la yuca **NO absorbe agua al hervirse** (61,6% contra
  // 60,9%), así que la premisa del factor 0,70 era falsa y está medida en la propia tabla; (2) la
  // TCAC cruda (159) y la USDA cruda (160) COINCIDEN — las dos fuentes concuerdan entre sí y el
  // 112 no sale de ninguna.
  // 🔴 SE USA EL CARBOHIDRATO **TOTAL** (36,6), NO el disponible (33,9) — y esto se aparta a
  // propósito de la convención de las 42 filas TCAC de fruta del repo. Dos razones MEDIDAS:
  //   (1) los otros 36 alimentos de esta tabla salen de USDA, cuyo campo es `Carbohydrate, by
  //       difference` = carbohidrato TOTAL con la fibra dentro. Usar aquí el disponible dejaría a
  //       la yuca midiéndose distinto que sus vecinas de la MISMA tabla.
  //   (2) Con el disponible, sus macros suman 140 kcal contra los 157 declarados (11% de hueco) y
  //       **el plato se arma con los MACROS** (4/4/9), así que el 157 sería decorativo. Con el
  //       total suman 151, dentro de lo que explica el redondeo.
  // ⏭️ QUEDA PARA ANDRÉS: las 42 filas de fruta usan DISPONIBLE y esta usa TOTAL, así que hoy
  // conviven dos criterios de carbohidrato en la misma tabla. No se unifica sin su dictamen.
  // ⚠️ Cambia el plato: la ración pasa de 200 g a 150 g (medido sobre los asesorados reales).
  { id: 'yuca', src: 'tcac2018', ref: "TCAC 2018 (ICBF) B106, pag. 54 - Yuca blanca, sin cascara, cocida, sin sal (pulpa); carbohidrato TOTAL 36,6 (el disponible es 33,9)", name: 'Yuca cocida', rol: 'carb', kcal: 157, p: 0.7, c: 36.6, f: 0.2, maxG: 300, un: { label: 'trozo', g: 100 } },
  { id: 'platano_maduro', src: 'tcac2018', ref: "TCAC 2018 (ICBF) B088, pag. 52 - Platano harton, maduro, cocido, sin sal; carbohidrato TOTAL", name: 'Plátano maduro cocido', rol: 'carb', kcal: 130, p: 0.8, c: 30.1, f: 0.2, maxG: 240, un: { label: 'tajada grande', g: 80 } },
  { id: 'platano_verde', src: 'usda_sr', ref: "FDC 169130 - Plantains, yellow, raw", name: 'Plátano verde cocido', rol: 'carb', kcal: 122, p: 1.2, c: 32.0, f: 0.4, maxG: 240, un: { label: 'trozo', g: 80 } },
  { id: 'arepa', src: 'tcac2018', ref: "TCAC 2018 (ICBF) A006, pag. 42 - Arepa de maiz, asada; carbohidrato TOTAL", name: 'Arepa de maíz asada', rol: 'carb', kcal: 162, p: 4.1, c: 36.3, f: 0.0, compra: 'un', un: { label: 'arepa', g: 80 } },
  { id: 'pan_integral', src: 'tcac2018', ref: "TCAC 2018 (ICBF) A069, pag. 46 - Pan integral, regular, horneado; carbohidrato TOTAL", name: 'Pan integral tajado', rol: 'carb', kcal: 279, p: 9.4, c: 50.4, f: 3.1, maxG: 112, compra: 'un', un: { label: 'tajada', g: 28 } },
  // 🔴 Decía «cucharada = 15 g» y una cucharada de hojuelas pesa **~5,6 g** (verificado
  // 2026-08-03): la persona servía un TERCIO de lo recetado, y la avena es lo más denso de la
  // tabla (389 kcal/100 g). Se pasa a TAZA, que además es como se sirve: con medios pasos se
  // lee «media taza (40 g)» en vez de «4 cucharadas» que nadie mide igual.
  { id: 'avena', src: 'usda_sr', ref: "FDC 169705 - Oats (Includes foods for USDA's Food Distribution Program)", name: 'Avena en hojuelas', rol: 'carb', kcal: 389, p: 17.0, c: 66.0, f: 7.0, un: { label: 'taza', g: 80 }, un2: { label: 'cucharada', g: 10 } },
  { id: 'pasta', src: 'usda_sr', ref: "FDC 169737 - Pasta, cooked, enriched, without added salt", name: 'Pasta cocida', rol: 'carb', kcal: 158, p: 6.0, c: 31.0, f: 0.9, un: { label: 'taza', g: 140 } },
  { id: 'mazorca', src: 'usda_sr', ref: "FDC 169999 - Corn, sweet, yellow, cooked, boiled, drained, without salt", name: 'Mazorca (maíz tierno)', rol: 'carb', kcal: 96, p: 3.4, c: 21.0, f: 1.5, compra: 'un', un: { label: 'mazorca', g: 130 } },
  // ── GRASA ──
  { id: 'aguacate', src: 'usda_sr', ref: "FDC 171705 - Avocados, raw, all commercial varieties", name: 'Aguacate', rol: 'fat', kcal: 160, p: 2.0, c: 9.0, f: 15.0, un: { label: 'octavo', g: 30 } },
  { id: 'aceite', src: 'usda_sr', ref: "FDC 171413 - Oil, olive, salad or cooking", name: 'Aceite de oliva o canola', rol: 'fat', kcal: 884, p: 0, c: 0, f: 100.0, un: { label: 'cucharada', g: 14 } },
  { id: 'mani', src: 'usda_sr', ref: "FDC 172430 - Peanuts, all types, raw", name: 'Maní', rol: 'fat', kcal: 567, p: 26.0, c: 16.0, f: 49.0, un: { label: 'puñado', g: 30 }, un2: { label: 'cucharada', g: 10 } },
  { id: 'almendra', src: 'usda_sr', ref: "FDC 170567 - Nuts, almonds", name: 'Almendras', rol: 'fat', kcal: 579, p: 21.0, c: 22.0, f: 50.0, un: { label: 'puñado', g: 30 }, un2: { label: 'almendra', g: 1.2 } },
  // La TCAC no llega hasta aquí: no tiene sección de leguminosas ni de frutos secos (salta las
  // letras I, M y O), así que ni maní ni crema de maní existen en ella. Va la fila SMOOTH porque
  // el alimento se llama «crema»; la de trozos (172469) queda más cerca de los números viejos,
  // y por eso mismo no se elige — elegir la fila que se parece a lo inventado es cómo se blinda
  // un dato inventado.
  { id: 'crema_mani', src: 'usda_sr', ref: "FDC 172470 - Peanut butter, smooth style, without salt", name: 'Mantequilla de maní', rol: 'fat', kcal: 598, p: 22.2, c: 22.3, f: 51.4, un: { label: 'cucharada', g: 16 } },
  // ── VERDURA (libre: acompañan, no se cuentan al ajustar macros) ──
  { id: 'tomate', src: 'usda_sr', ref: "FDC 170457 - Tomatoes, red, ripe, raw, year round average", name: 'Tomate', rol: 'verd', kcal: 18, p: 0.9, c: 3.9, f: 0.2, compra: 'un', un: { label: 'tomate', g: 120 } },
  { id: 'cebolla', src: 'usda_sr', ref: "FDC 170000 - Onions, raw", name: 'Cebolla', rol: 'verd', kcal: 40, p: 1.1, c: 9.0, f: 0.1, un: { label: 'porción', g: 60 } },
  { id: 'zanahoria', src: 'usda_sr', ref: "FDC 170393 - Carrots, raw", name: 'Zanahoria', rol: 'verd', kcal: 41, p: 0.9, c: 10.0, f: 0.2, compra: 'un', un: { label: 'zanahoria', g: 80 } },
  { id: 'espinaca', src: 'usda_sr', ref: "FDC 168462 - Spinach, raw", name: 'Espinaca', rol: 'verd', kcal: 23, p: 2.9, c: 3.6, f: 0.4, un: { label: 'taza', g: 30 } },
  { id: 'brocoli', src: 'usda_sr', ref: "FDC 170379 - Broccoli, raw", name: 'Brócoli', rol: 'verd', kcal: 34, p: 2.8, c: 7.0, f: 0.4, un: { label: 'taza', g: 90 } },
  { id: 'habichuela', src: 'usda_sr', ref: "FDC 169961 - Beans, snap, green, raw", name: 'Habichuela', rol: 'verd', kcal: 31, p: 1.8, c: 7.0, f: 0.2, un: { label: 'taza', g: 100 } },
  { id: 'pepino', src: 'usda_sr', ref: "FDC 168409 - Cucumber, with peel, raw", name: 'Pepino', rol: 'verd', kcal: 15, p: 0.7, c: 3.6, f: 0.1, un: { label: 'porción', g: 100 } },
  { id: 'lechuga', src: 'usda_sr', ref: "FDC 169249 - Lettuce, green leaf, raw", name: 'Lechuga', rol: 'verd', kcal: 15, p: 1.4, c: 2.9, f: 0.2, un: { label: 'taza', g: 50 } },
  { id: 'ahuyama', src: 'usda_sr', ref: "FDC 168448 - Pumpkin, raw", name: 'Ahuyama', rol: 'verd', kcal: 26, p: 1.0, c: 6.5, f: 0.1, un: { label: 'taza', g: 120 } },
  // ── FRUTA ──
  { id: 'banano', src: 'usda_sr', ref: "FDC 173944 - Bananas, raw", name: 'Banano', rol: 'fruta', kcal: 89, p: 1.1, c: 23.0, f: 0.3, compra: 'un', un: { label: 'banano', g: 118 } },
  { id: 'mango', src: 'usda_sr', ref: "FDC 169910 - Mangos, raw", name: 'Mango', rol: 'fruta', kcal: 60, p: 0.8, c: 15.0, f: 0.4, un: { label: 'taza', g: 165 } },
  { id: 'papaya', src: 'usda_sr', ref: "FDC 169926 - Papayas, raw", name: 'Papaya', rol: 'fruta', kcal: 43, p: 0.5, c: 11.0, f: 0.3, un: { label: 'taza', g: 145 } },
  { id: 'guayaba', src: 'usda_sr', ref: "FDC 173044 - Guavas, common, raw", name: 'Guayaba', rol: 'fruta', kcal: 68, p: 2.6, c: 14.0, f: 1.0, compra: 'un', un: { label: 'guayaba', g: 90 } },
  { id: 'naranja', src: 'usda_sr', ref: "FDC 169097 - Oranges, raw, all commercial varieties", name: 'Naranja', rol: 'fruta', kcal: 47, p: 0.9, c: 12.0, f: 0.1, compra: 'un', un: { label: 'naranja', g: 130 } },
  { id: 'mandarina', src: 'usda_sr', ref: "FDC 169105 - Tangerines, (mandarin oranges), raw", name: 'Mandarina', rol: 'fruta', kcal: 53, p: 0.8, c: 13.0, f: 0.3, compra: 'un', un: { label: 'mandarina', g: 90 } },
  { id: 'pina', src: 'usda_sr', ref: "FDC 169124 - Pineapple, raw, all varieties", name: 'Piña', rol: 'fruta', kcal: 50, p: 0.5, c: 13.0, f: 0.1, un: { label: 'taza', g: 165 } },
  { id: 'fresa', src: 'usda_sr', ref: "FDC 167762 - Strawberries, raw", name: 'Fresa', rol: 'fruta', kcal: 32, p: 0.7, c: 7.7, f: 0.3, un: { label: 'taza', g: 150 } },
  { id: 'maracuya', src: 'tcac2018', ref: "TCAC 2018 (ICBF) C056, pag. 58 - Maracuya, cruda (pulpa sin semillas); carbohidrato TOTAL", name: 'Maracuyá', rol: 'fruta', kcal: 60, p: 1.5, c: 12.4, f: 0.5, compra: 'un', un: { label: 'unidad', g: 60 } },
];

// Índice por id, null-proto para que un id raro NO herede del prototipo
// (misma clase de bug que EX_IMG_NAME, hallazgo C4 de la auditoría 2026-07-13).
const NUT_FOOD_BY_ID = NUT_FOODS.reduce((a, f) => { a[f.id] = f; return a; }, Object.create(null));

// ══════════════════════════════════════════════════════════════════════
// CATÁLOGO DE BÚSQUEDA — F1a del registro de alimentos (E5, E7, E9 de Fable)
// ──────────────────────────────────────────────────────────────────────
// 🔴 DOS CAPAS, NUNCA UNA FUSIÓN. `NUT_FOODS` (arriba) es el pool del RECETARIO: lista cerrada,
// curada, con `rol` y `maxG` decididos por nutrición deportiva, y **referenciada POR ID desde
// `NUT_MENUS`** — 41 de sus 50 alimentos (verificado 2026-08-05). Meterle encima los 773 de la
// TCAC rompería los platos que la app ya recomienda y pisaría valores verificados contra fuente.
// `foods.json` es la OTRA capa: el catálogo de BÚSQUEDA y REGISTRO, que sí crece. El generador
// de platos jamás lo lee; el buscador lee las dos.
const FOOD_PAGE = 30;                       // tandas, como la biblioteca de ejercicios (v405)
// Cuadre kcal ↔ macros: caza un número mal tecleado en UN campo. Hace falta el umbral RELATIVO
// **y** el ABSOLUTO, medido sobre los 50 el 2026-08-05: 4/4/9 (Atwater) sobreestima cuando hay
// fibra, así que la espinaca (23 kcal declaradas, 29,6 según sus macros) se desvía **29%** por
// 6,6 kcal, y las almendras 43 kcal por solo 7%. Con un solo umbral, cualquiera de los dos lados
// da falsos positivos. Se rechaza solo si falla EN LOS DOS. Máximo real medido: mazorca, 16% y
// 15,1 kcal — dentro.
// 🔴 LÍMITE HONESTO DE ESTE CANDADO: NO caza la clase de error que ya nos mordió. La yuca cruda
// etiquetada «cocida» traía 160 kcal *con los macros de la cruda*: internamente coherente, cuadre
// perfecto. Eso solo lo caza verificar contra la FUENTE (la muestra de E7), no una fórmula.
const FOOD_KCAL_TOL = 0.15;
const FOOD_KCAL_TOL_ABS = 25;               // kcal por 100 g
// Normaliza para buscar: sin tildes, sin signos, minúsculas. Buscar «platano» encuentra «plátano»
// (nadie escribe tildes en un buscador desde el celular).
// Reusa `_norm` (minúsculas + sin tildes) y le añade lo que ESTE caso necesita y los otros no:
// los nombres de alimento traen paréntesis y comas —«Carne de res magra (posta)», «Atún en agua
// (escurrido)»— que romperían el match por palabra.
function foodNormText(s) {
  return _norm(String(s == null ? '' : s)).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
// E9 — DEGRADACIÓN: si `foods.json` no cargó (primera visita sin red, fetch caído, archivo
// corrupto), la app NO se queda sin catálogo: cae a los 50 de `NUT_FOODS`, que viajan dentro del
// propio avi-core. Devuelve SIEMPRE un array usable — nunca null, nunca lanza.
// 🔴 `extra` es la TERCERA fuente (F5, lo escaneado en `food_barcodes`). Se AÑADE, nunca
// sustituye: si `foods.json` no cargó, el catálogo son los 50 de casa MÁS lo escaneado — quedarse
// sin red no puede borrarle a nadie el producto que él mismo aportó. Sus ids llevan prefijo
// `bc:` (ver `foodFromBarcode`), así que no pueden chocar con los de las otras dos capas.
function foodCatalog(json, extra) {
  const base = NUT_FOODS.map(f => Object.assign({}, f, { src: 'avi50' }));
  const arr = json && Array.isArray(json.foods) ? json.foods : null;
  const vistos = Object.create(null);
  const out = [];
  const push = f => {
    if (!f || !f.id || vistos[f.id]) return;      // sin id no se puede registrar ni deduplicar
    vistos[f.id] = 1;
    out.push(f);
  };
  (arr || []).forEach(push);
  if (!out.length) base.forEach(push);            // degradación E9: el catálogo de casa
  (Array.isArray(extra) ? extra : []).forEach(push);
  return out;
}
// Desfase entre las kcal declaradas y las que dan sus propios macros. null si falta algún macro
// (no se puede opinar) — el candado de la tabla lo usa para cazar errores de transcripción, que
// es la clase de defecto que NINGÚN test de cuadre ve porque el dato malo es coherente consigo.
function foodKcalGap(food) {
  if (!food) return null;
  const k = parseFloat(food.kcal), p = parseFloat(food.p), c = parseFloat(food.c), f = parseFloat(food.f);
  if (![k, p, c, f].every(Number.isFinite) || k <= 0) return null;
  const abs = Math.abs(k - (4 * p + 4 * c + 9 * f));
  return { abs: Math.round(abs * 10) / 10, rel: abs / k };
}
// ¿Este alimento huele a número mal tecleado? Solo si se pasa de los DOS umbrales (ver arriba).
function foodKcalSuspect(food) {
  const g = foodKcalGap(food);
  if (!g) return false;
  return g.rel > FOOD_KCAL_TOL && g.abs > FOOD_KCAL_TOL_ABS;
}
// Búsqueda por tandas. Ranking: empieza-por > palabra-que-empieza-por > contiene. Determinista
// (desempate por nombre) para que la lista no salte entre repintados.
function foodSearch(foods, q, opts) {
  opts = opts || {};
  const lista = Array.isArray(foods) ? foods : [];
  const offset = Math.max(0, parseInt(opts.offset) || 0);
  const limit = Math.max(1, parseInt(opts.limit) || FOOD_PAGE);
  const t = foodNormText(q);
  let hits;
  if (!t) {
    hits = lista.map(f => ({ f, r: 3 }));
  } else {
    hits = [];
    lista.forEach(f => {
      const n = foodNormText(f && f.name);
      if (!n) return;
      let r = -1;
      if (n.indexOf(t) === 0) r = 0;
      else if (n.split(' ').some(w => w.indexOf(t) === 0)) r = 1;
      else if (n.indexOf(t) !== -1) r = 2;
      if (r >= 0) hits.push({ f, r });
    });
  }
  hits.sort((a, b) => (a.r - b.r) || String(a.f.name).localeCompare(String(b.f.name), 'es'));
  return {
    total: hits.length,
    offset: offset,
    items: hits.slice(offset, offset + limit).map(h => h.f),
    hayMas: offset + limit < hits.length,
  };
}

// ══════════════════════════════════════════════════════════════════════
// F5 · ESCÁNER DE CÓDIGOS DE BARRAS — la parte pura
// ──────────────────────────────────────────────────────────────────────
// Tabla `public.food_barcodes` (ver `supabase/community/f5_food_barcodes.sql`). Aquí vive TODO lo
// que se puede decidir sin cámara, sin red y sin DOM: validar el número, convertir una etiqueta
// que habla «por porción» a los 100 g del resto del catálogo, y decir si lo que tecleó la persona
// va a ser aceptado ANTES de mandarlo. Lo demás (getUserMedia, BarcodeDetector) vive en app-5.
//
// 🔴 POR QUÉ SE VALIDA AQUÍ Y NO SOLO EN LA BASE: los CHECK de Postgres son el candado real, pero
// su mensaje de error es `new row violates check constraint "food_barcodes_p_check"`. Eso no se le
// puede mostrar a nadie. Estas funciones son el ESPEJO de esos CHECK, para poder decir «la
// proteína no puede pasar de 100 g por cada 100 g de producto» en vez de un error de motor.
// La regla: si se relaja un CHECK en el SQL, se relaja aquí; el espejo que miente es peor que
// ningún espejo.

const EAN_RE = /^[0-9]{8,14}$/;              // el MISMO rango que el check de la tabla
// Solo estas longitudes son GS1 con dígito de control (EAN-8, UPC-A, EAN-13, ITF-14). Las otras
// (9, 10, 11) las acepta la tabla porque existen códigos internos de tienda, pero no traen
// control: ahí no se puede opinar sobre si sobra o falta un dígito.
const EAN_GS1_LEN = [8, 12, 13, 14];

// Deja solo dígitos. Un código leído a ojo del empaque viene con espacios y guiones.
function eanNormalize(raw) {
  return String(raw == null ? '' : raw).replace(/[^0-9]/g, '');
}
// Dígito de control GS1 (mod 10, pesos 3-1 desde la derecha del cuerpo). Devuelve null si la
// longitud no lo lleva — `null` NO es «malo», es «no se puede saber».
function eanCheckDigit(ean) {
  const s = eanNormalize(ean);
  if (EAN_GS1_LEN.indexOf(s.length) === -1) return null;
  let suma = 0;
  const cuerpo = s.slice(0, -1);
  for (let i = cuerpo.length - 1, peso = 3; i >= 0; i--, peso = peso === 3 ? 1 : 3) {
    suma += parseInt(cuerpo[i], 10) * peso;
  }
  return (10 - (suma % 10)) % 10;
}
// ¿Este número puede ser un código de barras? El escáner nativo YA verifica el control, así que
// esto muerde sobre todo cuando alguien lo teclea: un dígito de menos o cambiado se caza aquí y
// no acaba siendo un producto fantasma que nadie vuelve a encontrar.
function eanValid(raw) {
  const s = eanNormalize(raw);
  if (!EAN_RE.test(s)) return false;
  const dc = eanCheckDigit(s);
  return dc == null || dc === parseInt(s[s.length - 1], 10);
}

// ── La etiqueta colombiana habla «por porción», el catálogo habla «por 100 g» ──
// ⚠️ Esto NO es un detalle de formato: es la diferencia entre 520 kcal y 156. La mayoría de los
// empaques de D1/ARA declaran la tabla POR PORCIÓN (30 g de cereal, 200 ml de leche) y quien
// transcribe copia lo que ve. Si la app no pregunta sobre qué cantidad son esos números, el dato
// entra mal — y entra COHERENTE consigo mismo, que es la clase de error que ningún cuadre caza
// (la yuca «cocida» con los valores de la cruda).
// `porcion` en gramos; devuelve los cuatro macros llevados a 100 g. Puro, sin redondeo de más
// que el de la tabla (numeric(x,1)).
function labelPer100(v, porcionG) {
  const x = parseFloat(v), g = parseFloat(porcionG);
  if (!Number.isFinite(x) || !Number.isFinite(g) || g <= 0) return null;
  return Math.round((x * 100 / g) * 10) / 10;
}

const FOOD_BC_MAX = { kcal: 900, p: 100, c: 100, f: 100, un_g: 2000 };
const FOOD_BC_LEN = { name: 80, brand: 60, un_label: 24 };

// Valida y NORMALIZA lo que tecleó quien escaneó. Devuelve siempre el mismo sobre:
//   { ok, errores:{campo:'texto humano'}, aviso:'…'|null, fila:{…listo para insert}|null }
// `errores` bloquea; `aviso` NO. La diferencia importa: un empaque puede declarar unas calorías
// que no cuadran con sus propios macros (fibra, polioles, redondeo del fabricante) y eso es un
// hecho de la etiqueta, no un error de la persona. Bloquear ahí sería llamarle mentiroso al
// producto que tiene en la mano. Se avisa, se deja pasar, y la fila nace `verified=false` para
// que un humano la mire.
// `d.base`: 'g100' (los números ya son por 100 g) | 'porcion' (hay que convertirlos).
function barcodeDraft(d) {
  d = d || {};
  const errores = {};
  const ean = eanNormalize(d.ean);
  if (!EAN_RE.test(ean)) errores.ean = 'El código tiene que ser de 8 a 14 números.';
  else if (!eanValid(ean)) errores.ean = 'Ese código no cuadra — revisa si falta o sobra un número.';

  const name = String(d.name == null ? '' : d.name).trim().replace(/\s+/g, ' ');
  if (!name) errores.name = 'Escribe cómo se llama el producto.';
  else if (name.length > FOOD_BC_LEN.name) errores.name = 'El nombre no puede pasar de ' + FOOD_BC_LEN.name + ' letras.';
  const brand = String(d.brand == null ? '' : d.brand).trim().replace(/\s+/g, ' ');
  if (brand.length > FOOD_BC_LEN.brand) errores.brand = 'La marca no puede pasar de ' + FOOD_BC_LEN.brand + ' letras.';

  // 🔴 La porción se valida ANTES de convertir, no después: sin ella la conversión da `null` y el
  // error que vería la persona sería «escribe las calorías» sobre un campo que SÍ llenó.
  const porcion = parseFloat(d.porcionG);
  const porBase = d.base === 'porcion';
  if (porBase && !(Number.isFinite(porcion) && porcion > 0 && porcion <= FOOD_BC_MAX.un_g)) {
    errores.porcionG = 'Escribe de cuántos gramos es la porción que dice el empaque.';
  }
  const conv = v => {
    if (v == null || v === '') return null;
    if (!porBase) { const x = parseFloat(v); return Number.isFinite(x) ? Math.round(x * 10) / 10 : null; }
    return errores.porcionG ? null : labelPer100(v, porcion);
  };
  const macro = (campo, etiqueta) => {
    const bruto = d[campo];
    if (bruto == null || String(bruto).trim() === '') { errores[campo] = 'Falta ' + etiqueta + '.'; return null; }
    const x = conv(bruto);
    if (x == null) { if (!errores.porcionG) errores[campo] = 'Escribe ' + etiqueta + ' en números.'; return null; }
    if (x < 0) { errores[campo] = etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) + ' no puede ser negativa.'; return null; }
    if (x > FOOD_BC_MAX[campo]) {
      errores[campo] = porBase
        ? 'Con esa porción, ' + etiqueta + ' daría ' + x + ' por cada 100 g, y eso no cabe en un alimento. Revisa el tamaño de la porción.'
        : etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) + ' no puede pasar de ' + FOOD_BC_MAX[campo] + ' por cada 100 g.';
      return null;
    }
    return x;
  };
  const kcal = macro('kcal', 'las calorías');
  const p = macro('p', 'la proteína');
  const c = macro('c', 'los carbohidratos');
  const f = macro('f', 'la grasa');
  // Espejo del CHECK `p + c + f <= 100`. Sin este mensaje, el insert vuelve con un error de motor.
  if (p != null && c != null && f != null && Math.round((p + c + f) * 10) / 10 > 100) {
    errores.suma = 'Proteína, carbohidratos y grasa suman ' + (Math.round((p + c + f) * 10) / 10) +
      ' g por cada 100 g de producto, y eso es imposible. Revisa si esos números son por porción.';
  }

  // Medida casera. Si la etiqueta venía «por porción», esa porción YA es una medida casera de
  // verdad (1 tarrina, 1 vaso) → se ofrece sola, que es justo lo que evita que alguien tenga que
  // pesar una barra de cereal.
  let un_label = String(d.un_label == null ? '' : d.un_label).trim().replace(/\s+/g, ' ');
  let un_g = parseFloat(d.un_g);
  if (!un_label && !Number.isFinite(un_g) && porBase && Number.isFinite(porcion) && porcion > 0) {
    un_label = 'porción'; un_g = porcion;
  }
  if (un_label && !(Number.isFinite(un_g) && un_g > 0)) errores.un_g = 'Escribe cuántos gramos pesa una ' + un_label + '.';
  if (Number.isFinite(un_g) && un_g > 0 && !un_label) errores.un_label = 'Ponle nombre a esa medida (tarrina, vaso, cucharada…).';
  if (un_label.length > FOOD_BC_LEN.un_label) errores.un_label = 'Ese nombre de medida es muy largo.';
  if (Number.isFinite(un_g) && un_g > FOOD_BC_MAX.un_g) errores.un_g = 'Una medida casera no puede pesar más de ' + FOOD_BC_MAX.un_g + ' g.';

  const hayError = Object.keys(errores).length > 0;
  const fila = hayError ? null : {
    ean: ean, name: name, brand: brand || null,
    kcal: kcal, p: p, c: c, f: f,
    un_label: un_label || null,
    un_g: (un_label && Number.isFinite(un_g) && un_g > 0) ? Math.round(un_g * 10) / 10 : null,
  };
  // El aviso se calcula sobre la fila YA en 100 g, con el mismo detector de la tabla curada.
  const aviso = (fila && foodKcalSuspect(fila))
    ? 'Ojo: ' + fila.kcal + ' kcal no cuadra con esos macros (dan ' + Math.round(4 * fila.p + 4 * fila.c + 9 * fila.f) +
      '). Puede ser del empaque, pero revísalo antes de guardar.'
    : null;
  return { ok: !hayError, errores: errores, aviso: aviso, fila: fila };
}

// Una fila de `food_barcodes` vestida de alimento del catálogo, para que el buscador y el
// registro no tengan que saber de dónde salió. `bc:` delante del id: es lo que garantiza que la
// tercera fuente no pise ni a los 50 del recetario ni a los 181 de `foods.json`.
// `verified` viaja: la interfaz TIENE que poder decir «esto lo aportó alguien y nadie lo ha
// revisado». Un dato sin revisar que se ve igual que uno verificado es peor que no tenerlo.
function foodFromBarcode(row) {
  if (!row || !row.ean) return null;
  const num = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : null; };
  const g = num(row.un_g);
  const out = {
    id: 'bc:' + eanNormalize(row.ean),
    ean: eanNormalize(row.ean),
    name: String(row.name || '').trim() + (row.brand ? ' (' + String(row.brand).trim() + ')' : ''),
    kcal: num(row.kcal), p: num(row.p), c: num(row.c), f: num(row.f),
    src: 'bc',
    verified: !!row.verified,
  };
  if (row.un_label && g && g > 0) out.un = { label: String(row.un_label).trim(), g: g };
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// F6 · LA COLA DE APROBACIÓN DEL COACH — la parte pura
// ──────────────────────────────────────────────────────────────────────
// Sin esta cola nada llega nunca a `verified` y el rótulo «sin revisar» sale en el 100%: una
// marca de calidad que nadie puede quitar es ruido que se aprende a ignorar.
//
// 🔴 QUÉ PUEDE AFIRMAR ESTA CAPA Y QUÉ NO. Lo que sigue son señales ARITMÉTICAS — cosas que no
// pueden ser ciertas de ningún alimento del mundo. NO hay aquí ningún detector del error que de
// verdad importa (copiar la etiqueta «por porción» como si fuera por 100 g), porque ese dato es
// COHERENTE consigo mismo y solo se delata contra el producto real. Se intentó calibrar un umbral
// de densidad calórica y **no hay con qué**: la tabla tiene 0 filas. Un umbral inventado sin datos
// es la clase de detector mudo que ya costó caro en este repo. Lo que la cola hace es enseñarle al
// coach el dato completo para que juzgue; cuando haya filas reales se podrá medir.
function fbReviewNotes(row) {
  const notas = [];
  if (!row) return notas;
  const n = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : null; };
  const k = n(row.kcal), p = n(row.p), c = n(row.c), f = n(row.f), g = n(row.un_g);
  const gap = foodKcalGap(row);
  if (gap && foodKcalSuspect(row)) {
    notas.push('Las calorías no cuadran con sus macros: dice ' + k + ' y sus gramos dan ' +
      Math.round(4 * p + 4 * c + 9 * f) + '.');
  }
  // Un producto que declara energía sin un solo gramo de macro no existe: o falta lo que aporta
  // esa energía, o las calorías son de otra cosa.
  if (k != null && k > 0 && p === 0 && c === 0 && f === 0) {
    notas.push('Declara ' + k + ' kcal pero proteína, carbohidratos y grasa están los tres en cero.');
  }
  // Y al revés: gramos que no pesan nada en energía.
  if (k === 0 && (p || c || f)) {
    notas.push('Dice 0 calorías pero sí declara macros. Alguno de los dos está mal.');
  }
  // Una medida casera que pesa más de un kilo no es una medida casera: es el peso del empaque
  // entero metido donde va «1 vaso».
  if (g != null && g > 1000) {
    notas.push('Una «' + String(row.un_label || 'medida') + '» de ' + g + ' g es más de un kilo. Revisa si ese es el peso del paquete completo.');
  }
  return notas;
}
// Parte la cola en lo que espera revisión y lo ya aprobado. La tarjeta del panel cuenta SOLO lo
// pendiente — un contador que incluya lo ya resuelto no baja nunca y deja de significar nada.
function fbQueueSplit(rows) {
  const lista = Array.isArray(rows) ? rows : [];
  const pendientes = [], verificados = [];
  lista.forEach(r => { if (r && r.ean) (r.verified ? verificados : pendientes).push(r); });
  return { pendientes: pendientes, verificados: verificados, porRevisar: pendientes.length };
}
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
// Género de una medida, para concordar «medio puñado» / «media arepa». Se mira el
// núcleo del sintagma —la PRIMERA palabra—, porque en «tajada grande» el género lo
// pone «tajada» y no «grande». Femenino: termina en -a, o es de las terminaciones
// que siempre lo son (-ción, -sión, -dad). Todo lo demás, masculino.
function _nutFem(label) {
  const nucleo = String(label || '').trim().split(/\s+/)[0].toLowerCase();
  return /a$/.test(nucleo) || /(ción|sión|dad)$/.test(nucleo);
}
// Cantidad escrita como la serviría una persona: «2 huevos», «1½ tazas», «media
// arepa», «medio puñado». Los medios van en fracción y no en decimal — «0.5 porción»
// no es como habla nadie. Sin medida casera, gramos redondeados a 5.
function _nutNumText(rn, label) {
  if (rn === 0.5) return _nutFem(label) ? 'media' : 'medio';
  const ent = Math.floor(rn);
  return rn === ent ? String(ent) : String(ent) + '½';
}
function nutPortionText(food, grams) {
  if (!food || !(grams > 0)) return null;
  // 🔴 DOS ESCALONES DE MEDIDA CASERA, GRANDE Y CHICO (v476). El plato escribía «avena 15 g»,
  // «maní 5 g», «almendras 5 g» — medido sobre las 22 personas reales, **78 de 2.310 raciones**
  // salían en gramos-polvo, y 40 de ellas eran la avena. La cantidad NO estaba mal: 15 g de avena
  // en hojuelas son **una cucharada y media**, y 5 g de maní **media cucharada**. Lo que estaba mal
  // era que cada alimento declaraba UNA sola medida casera y era demasiado grande para las
  // cantidades chicas (una TAZA de avena son 80 g, un PUÑADO de maní son 30).
  // ⚠️ Esto NO cambia lo que se sirve —ni un gramo, ni una caloría—, solo cómo se escribe. Por eso
  // es el arreglo correcto y no subir la ración a media medida: eso sí infla el plato, y ya rompió
  // el guardián de los extremos cuando se intentó en `carb2` (14,2% sobre una mujer de 55 kg).
  // La medida chica solo se usa cuando la grande NO alcanza; si alcanza, manda la grande, o se
  // leería «8 cucharadas de avena» donde cabe decir «1 taza».
  const escalon = (un) => {
    if (!un || !un.g) return null;
    const n = grams / un.g;
    // Hasta 4 unidades se permite medio; de ahí en adelante, enteras.
    const paso = n <= 4 ? 0.5 : 1;
    let rn = Math.round(n / paso) * paso;
    // El tope se aplica DESPUÉS de redondear, o el redondeo lo burla: 350 g de lentejas
    // caían en «2 tazas» = 400 g, por encima de su ración máxima. Se baja un escalón.
    if (food.maxG > 0) while (rn > paso && rn * un.g > food.maxG) rn -= paso;
    if (rn >= paso && !(food.maxG > 0 && rn * un.g > food.maxG)) {
      const label = rn > 1 ? _nutPlural(un.label) : un.label;
      const txt = _nutNumText(rn, un.label) + ' ' + label;
      return { n: rn, grams: Math.round(rn * un.g), text: txt + ' (' + Math.round(rn * un.g) + ' g)' };
    }
    return null;
  };
  const grande = escalon(food.un);
  if (grande) return grande;
  const chica = escalon(food.un2);
  if (chica) return chica;
  let g = Math.max(5, Math.round(grams / 5) * 5);
  if (food.maxG > 0) g = Math.min(g, Math.round(food.maxG / 5) * 5);
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
// 🔴 La PROTEÍNA es un PISO, no un techo: uno quiere comer AL MENOS X gramos, mientras
// que el carbohidrato y la grasa son «alrededor de». Descontarla igual que los otros dos
// deja platos que cuadran en macros y son absurdos en la mesa: medido 2026-08-01, con
// pasta (6 g de proteína por 100 g) el solver dejaba «20 g de atún con 490 g de pasta».
// Por eso el alimento proteico nunca baja de esta fracción de la meta de la comida.
// 🔒 0,70 → 0,60 (REGLA 4 del dictamen de Andrés Hyp, 2026-08-15, ejecutada en v494). Es el CODO
// de la curva, y la curva se volvió a medir contra el código de HOY antes de tocar nada — la del
// dictamen se hizo sobre v485 y entre medio se corrigió media tabla de alimentos, así que sus
// cifras absolutas ya no valían (él medía 48 comidas pasadas de proteína; hoy son 17).
// Medido el 2026-08-18 sobre las **17 personas reales que SÍ ven el plan** (595 comidas; 3 de las
// 20 que resuelve `nutBaseFor` están en tier libre y nunca lo ven), con la proteína servida
// recalculada desde los gramos y la tabla, NO preguntándole al plan:
//   piso   comidas >130%   <85%   combos   prot del día (mediana/peor)
//   0,70        17           0       43         +6,8% / +25,0%
//   0,65        11           0       43         +6,4% / +25,0%
//   0,60 ←       3           0       44         +5,2% / +23,4%   ELEGIDO
//   0,55         1           0       44         +4,7% / +14,3%
//   0,50         2           0       44         +4,6% / +16,2%
// **Lo que NO se paga, que es lo que autoriza el cambio:** ni una comida se queda corta (<85% sigue
// en 0), la ración proteica mínima sigue siendo media lata de atún (50 g) —no aparece el «5 g de
// atún» que se rechazó dos veces— y **la variedad SUBE** (43 → 44 combinaciones distintas).
// Por qué 0,60 y no 0,55: entre 0,70 y 0,60 se ganan 14 comidas, de 0,60 a 0,55 se ganan 2, y a
// 0,50 se pierde una. Es el codo, y coincide con el que midió Andrés sobre el código anterior.
// ⚠️ Lo que este cambio NO arregla, medido: **la esquina del barrido sintético no se mueve ni una
// décima** (93%-114% con 0,70 y con 0,60), así que la franja del registro NO se puede apretar.
// Ver la nota de `FOODLOG_BAND`, donde estaba escrito lo contrario.
const NUT_PROT_MIN_SHARE = 0.6;
// 🔴 SEGUNDA FUENTE DE CARBOHIDRATO (`pick.carb2`, dictamen de Andrés 2026-08-10).
// Un plato colombiano casi nunca trae un solo carbohidrato: es arroz + tajada, arepa + papa.
// Con UNO solo, cubrir el objetivo obliga a raciones que nadie sirve —«800 g de papa criolla»,
// «9 tajadas de pan»— y **topar el alimento no lo arregla: RECORTA** (medido: los 11 topes dejan
// el plato entregando −20,9% y las porciones feas igual, porque el menú deja de CABER, sale del
// pool factible y el selector se va a otro con raciones mayores). Repartir sí lo arregla.
// El objetivo de carbohidrato de la comida se parte 60/40 entre el principal y el segundo.
const NUT_CARB2_SHARE = 0.4;
// 🔒 Y LLEVA PISO: si al segundo no le toca ni MEDIA medida casera, no se parte el plato (todo
// al principal). Sin este piso salen «5 g de plátano» — exactamente la ración-que-no-es-ración
// que se rechazó en v471 («5 g de clara de huevo»). Medido: 14 de 349 segundas raciones.
const NUT_CARB2_MIN_UN = 0.5;
function nutSolveMeal(target, pick) {
  target = target || {};
  const prot = NUT_FOOD_BY_ID[pick && pick.prot] || null;
  const carb = NUT_FOOD_BY_ID[pick && pick.carb] || null;
  const carb2 = NUT_FOOD_BY_ID[pick && pick.carb2] || null;
  const fat = NUT_FOOD_BY_ID[pick && pick.fat] || null;
  const tP = target.prot_g > 0 ? target.prot_g : 0;
  const tC = target.carb_g > 0 ? target.carb_g : 0;
  const tF = target.fat_g > 0 ? target.fat_g : 0;
  // 🔒 ¿SE PARTE EL PLATO? Se decide ANTES de iterar, no después.
  // Si al segundo carbohidrato no le toca ni MEDIA medida casera, no se parte: todo al principal.
  // ⚠️ Y la decisión va aquí arriba a propósito. Al principio esto era un arreglo POSTERIOR
  // (resolver partido y devolver los gramos al principal si el segundo salía muy chico) y eso
  // rompió a una persona real: **Andrés Martínez pasó de 6 desayunos distintos a 1**. Su desayuno
  // pide mucha proteína y poco carbohidrato (36 g / 41 g), así que al partir, el principal se
  // encogía, el plato cambiaba de calorías y **dejaba de CABER en el filtro de menús** — devolver
  // los gramos al final ya no deshacía eso, porque la proteína y la grasa ya se habían resuelto
  // contra el reparto. **Una decisión que cambia el resultado del solver no puede tomarse después
  // de correrlo.**
  //
  // 🔴 Y LA PUERTA MIRA EL NÚMERO QUE DE VERDAD SE SIRVE, NO EL OBJETIVO BRUTO (hallazgo P1-1 de
  // Fable, 2026-08-12). La primera versión abría con `tC * SHARE`, pero lo que el solver reparte
  // es `falta` = tC MENOS el carbohidrato que ya traen la proteína y la grasa. Con un aporte
  // cruzado grande —fríjol, lenteja, avena— `falta` es una fracción de `tC`: la puerta veía 116 g
  // de plátano y el plato servía 15. Medido: 9 de 322 segundas raciones salían por debajo del piso
  // que la puerta acababa de exigir, en el almuerzo de 7 personas reales.
  //
  // ⚠️ NO se arregla estimando `falta` con una pre-pasada sin partir: se probó y CIERRA DE MÁS
  // (medido: en el menú del fríjol, a tC=100 dejaba de servir la media tajada que antes sí salía),
  // porque al partir, `carb2` aporta proteína y grasa, así que `gP` y `gF` bajan y `falta` SUBE.
  // La estimación sin partir es un PISO de `falta`, no su valor.
  //
  // Lo que se hace: resolver el plato ENTERO en las dos configuraciones y quedarse con la que
  // cumple el piso. **Esto NO es «decidir después de correr el solver»** —la trampa de aquí
  // arriba—: aquella devolvía los gramos del segundo al principal SOBRE un resultado ya calculado
  // contra el reparto, y dejaba un plato híbrido que no era solución de nada. Aquí cada
  // configuración se calcula completa y coherente consigo misma, y se DESCARTA una entera.
  //
  // ⚠️ Y EL PISO SIGUE MIDIÉNDOSE EN GRAMOS CRUDOS, no preguntándole a `nutPortionText`.
  // Se probó lo segundo —parecía más honesto, porque `nutPortionText` es lo que la persona LEE, y
  // redondea 25 g crudos de plátano a «media tajada (40 g)», una ración presentable que el umbral
  // crudo rechaza— y **rompe el guardián de los extremos: 14,2% de exceso** (tope 14%) sobre una
  // mujer de 55 kg con objetivo de perder grasa. La razón: ese redondeo es hacia ARRIBA, y sobre
  // un presupuesto chico el gramaje que añade es proporcionalmente enorme. El piso crudo no está
  // aproximando lo que se sirve: está impidiendo que se parta un plato tan pequeño que el propio
  // redondeo del segundo lo desborde. **Son dos trabajos distintos y el crudo hace el que importa.**
  const ap = (food, g, macro) => (food ? food[macro] * g / 100 : 0);
  const _c2min = (carb2 && carb2.un && carb2.un.g > 0) ? carb2.un.g * NUT_CARB2_MIN_UN : 0;
  const resolver = (parte) => {
  // gramos de cada alimento, en crudo (sin redondear) durante la iteración
  let gP = 0, gC = 0, gC2 = 0, gF = 0;
  for (let i = 0; i < NUT_SOLVE_PASSES; i++) {
    // proteína: la que falta después de la que traen el carbohidrato y la grasa, pero
    // NUNCA por debajo del piso (arriba) ni por encima de una ración creíble (`maxG`):
    // sin tope, la leche —3,3 g por 100 g— pedía 1.000 g para cubrir una merienda.
    if (prot && prot.p > 0 && tP > 0) {
      // ⚠️ NO ACREDITAR AQUÍ la proteína que traen el carbohidrato y la grasa. Se probó en v471
      // (`Math.max(0, tP*SHARE - ap(carb,gC,'p') - ap(fat,gF,'p')) / prot.p * 100`, la línea que
      // dejó escrita la auditoría diciendo que «no toca la doctrina de Andrés») y **sí la toca**:
      // este piso no mide GRAMOS DEL DÍA, mide que el plato sea creíble en la mesa. Medido sobre
      // las 21 personas reales (735 comidas): las comidas donde el alimento proteico aporta menos
      // de la mitad de la proteína de su propia comida pasan de **26 a 136**, y la peor ración
      // queda en **«5 g de clara de huevo»** — que no es una ración, es un redondeo en un plato.
      // Y ni siquiera compra lo que prometía: el peor hueco de proteína del día EMPEORA (−3,3% →
      // −5,0%). Es exactamente el caso que hizo nacer esta constante («20 g de atún con 490 g de
      // pasta») y hay un test que lo afirma.
      // ⚠️ CORRECCIÓN (Andrés, dictamen v471): el caso que la línea quería arreglar —«9 tajadas
      // de pan con 4 huevos encima»— **SÍ se reproduce en gente real**, al revés de lo que dijo
      // la auditoría anterior («era un perfil sintético»). Medido por la ruta de producción
      // (`nutBaseFor`, 22 personas, 770 comidas): **51 comidas sirven más del 130% de la proteína
      // de su propia comida**, p.ej. «clara 132 g + avena 120 g» para una meta de 23 g. No era el
      // PAN: es la **AVENA (17 g de proteína/100 g)**, que este piso no descuenta. O sea que el
      // diagnóstico era bueno y el remedio no. **Y el sitio donde se arregla es el MENÚ** —no
      // emparejar un carbohidrato de 17 g/100 g con una proteína atada a un piso—, no el solver.
      // Si algún día se toca esto, Andrés dice que el lever es BAJAR la constante (0,70 → 0,60),
      // nunca acreditar; y no antes de ampliar el banco de menús, porque a 0,60 la suite cae
      // 680/681 por VARIEDAD (`el menú se elige entre los que CABEN`), no por doctrina.
      const piso = tP * NUT_PROT_MIN_SHARE / prot.p * 100;
      // ⚠️ `carb2` también aporta proteína (la arepa 4,5 g/100 g, el arroz 2,7) y hay que restarla
      // aquí o el plato la sirve DOS veces — el mismo aporte cruzado que esta línea ya descuenta
      // del principal.
      gP = Math.max(piso, (tP - ap(carb, gC, 'p') - ap(carb2, gC2, 'p') - ap(fat, gF, 'p')) / prot.p * 100);
      if (prot.maxG > 0) gP = Math.min(gP, prot.maxG);
    }
    // carbohidrato: el que falta después del que traen la proteína y la grasa, REPARTIDO entre
    // las dos fuentes si hay segunda.
    // 🔴 EL APORTE CRUZADO SE DESCUENTA UNA SOLA VEZ, y luego se reparte. La primera versión lo
    // restaba en LAS DOS ramas —cada una del objetivo de su parte— y eso descuenta dos veces el
    // mismo gramo: medido, hundía la entrega de carbohidrato del peor día a **−14,2%** (era
    // −6,8%) y hacía fallar el guardián de los extremos. Es la misma clase de defecto que este
    // solver existe para evitar («el plato descuenta los aportes CRUZADOS»), reintroducida al
    // partir el plato en dos.
    if ((carb && carb.c > 0) && tC > 0) {
      const falta = Math.max(0, tC - ap(prot, gP, 'c') - ap(fat, gF, 'c'));
      gC = falta * (parte ? 1 - NUT_CARB2_SHARE : 1) / carb.c * 100;
      gC2 = parte ? falta * NUT_CARB2_SHARE / carb2.c * 100 : 0;
      // ⚠️ NO AÑADIR AQUÍ UN `if (carb.maxG > 0) gC = Math.min(gC, carb.maxG)`. Se probó y es
      // REDUNDANTE: `nutPortionText` YA aplica `maxG` a cualquier alimento que lo declare (en dos
      // sitios: la rama de medidas caseras, que es la que manda, y el clamp final). El tope de un
      // alimento se pone DECLARÁNDOLO en la tabla, no tocando el solver — medido, con la línea y
      // sin ella los resultados son idénticos en las 770 comidas reales.
      // 💎 Se supo porque el sabotaje que quitaba la línea salía VERDE. Un cambio que no mueve
      // ninguna cifra no es un arreglo, es una línea más que mantener.
    }
    // grasa: descontando la que traen la proteína y LOS DOS carbohidratos
    if (fat && fat.f > 0 && tF > 0) {
      gF = Math.max(0, (tF - ap(prot, gP, 'f') - ap(carb, gC, 'f') - ap(carb2, gC2, 'f')) / fat.f * 100);
    }
  }
    return { gP: gP, gC: gC, gC2: gC2, gF: gF };
  };
  // Se intenta partir; si al segundo no le toca ni media medida casera DE VERDAD (la que se va a
  // leer en el plato), se resuelve otra vez ENTERO sin partir y se tira el primer resultado.
  const _conDos = (carb2 && carb2.c > 0 && tC > 0) ? resolver(true) : null;
  const usaDos = !!(_conDos && _conDos.gC2 >= _c2min);
  const sol = usaDos ? _conDos : resolver(false);
  const gP = sol.gP, gC = sol.gC, gC2 = sol.gC2, gF = sol.gF;
  const items = [];
  let gotP = 0, gotC = 0, gotF = 0, gotK = 0;
  const poner = (food, g, rol) => {
    if (!food || !(g > 0)) return;
    const por = nutPortionText(food, g);
    if (!por) return;
    items.push({ id: food.id, name: food.name, rol, grams: por.grams, text: por.text });
    gotP += food.p * por.grams / 100; gotC += food.c * por.grams / 100; gotF += food.f * por.grams / 100;
    // 🔴 LA CALORÍA DE UN ALIMENTO SALE DE SU FILA, NO DE UNA FÓRMULA. Aquí se sumaba
    // `4p + 4c + 9f`, que es una aproximación genérica, mientras el REGISTRO de la persona suma el
    // campo `kcal` de la tabla —el de la fuente oficial, con los factores de Atwater propios del
    // alimento—. Eran DOS definiciones de caloría vivas en la misma app. Medido el 2026-08-18 sobre
    // las 50 filas: **40 se separan ≥1%**, y no al azar — la fórmula genérica se pasa hasta un
    // **+28,7% en la espinaca, +26,7% en la lechuga y +25,9% en el brócoli** (su `c` es carbohidrato
    // TOTAL e incluye la FIBRA, que no da 4 kcal/g) y se queda corta un **−6,5% en la clara y −5,2%
    // en la pechuga** (USDA les aplica factores específicos: 4,27 kcal/g de proteína, no 4).
    gotK += food.kcal * por.grams / 100;
  };
  poner(prot, gP, 'prot');
  poner(carb, gC, 'carb');
  poner(carb2, gC2, 'carb');
  poner(fat, gF, 'fat');
  return {
    items,
    real: { prot_g: Math.round(gotP), carb_g: Math.round(gotC), fat_g: Math.round(gotF), kcal: Math.round(gotK) },
  };
}

// ── MENÚS: qué se combina en cada comida ────────────────────────────────
// Combinaciones que un colombiano reconoce como una comida, no como una lista de
// macros. Cada una declara su proteína, su carbohidrato y su grasa; las verduras y
// frutas acompañan (`acomp`) y no se ajustan.
// Hay VARIAS por comida a propósito: la lección del generador de rutinas (2026-08-01)
// es que un pool de UNO obliga a repetir, y un plan que sirve el mismo desayuno los 7
// días es exactamente el mismo defecto en otra pantalla.
const NUT_MENUS = {
  desayuno: [
    { pick: { prot: 'huevo', carb: 'arepa', fat: 'aguacate' }, acomp: ['tomate'] },
    { pick: { prot: 'huevo', carb: 'pan_integral', carb2: 'banano', fat: 'aguacate' }, acomp: ['tomate', 'cebolla'] },
    { pick: { prot: 'yogur_griego', carb: 'avena', carb2: 'banano', fat: 'mani' }, acomp: [] },
    { pick: { prot: 'queso_campesino', carb: 'arepa', fat: 'aguacate' }, acomp: ['papaya'] },
    { pick: { prot: 'clara', carb: 'avena', carb2: 'banano', fat: 'almendra' }, acomp: ['fresa'] },
    // 🔴 LOS 3 DE ABAJO LOS AÑADIÓ ANDRÉS (dictamen v471) Y SON EL ARREGLO DE FONDO DE LA
    // VARIEDAD. El banco decía 5 y en la práctica eran 3: medido sobre los 154 presupuestos de
    // desayuno REALES (22 personas × 7 días), `huevo+pan_integral` cabe **31 veces** y
    // `queso_campesino+arepa` **22** — y el del queso no es mala suerte, es estructural: su
    // `maxG` de 90 g lo topa en 15 g de proteína cuando el piso le pide ~23, así que NUNCA llega.
    // La causa de que los otros se pasen: los carbohidratos del banco eran los más densos de la
    // tabla (avena 389 kcal/100 g, arepa 218, pan 247) **y la avena trae 17 g de proteína por
    // 100 g**, que se suman al piso del alimento proteico y disparan las calorías.
    // Por eso los nuevos traen carbohidratos de BAJA densidad (papa 87 kcal/100 g, plátano 116)
    // y rompen el monopolio de la avena en la rama del yogur.
    // Cobertura medida al añadirlos: los presupuestos con UNA SOLA opción pasan de **15 a 0** y
    // el promedio de opciones de **2,55 a 5,12**.
    { pick: { prot: 'huevo', carb: 'papa', carb2: 'arepa', fat: null }, acomp: ['cebolla'] },       // 140/154
    { pick: { prot: 'huevo', carb: 'platano_maduro', carb2: 'arepa', fat: null }, acomp: ['tomate'] }, // 122/154
    { pick: { prot: 'yogur_griego', carb: 'pan_integral', carb2: 'banano', fat: 'almendra' }, acomp: [] }, // 135/154
  ],
  // 🔴 MERIENDAS MAGRAS (Andrés Hyp, 2026-08-03). A la merienda se le pide el 10% de las
  // calorías del día pero el 15% de la proteína (`wProt`), así que la fuente que cubra esa
  // proteína NO puede traer su propia grasa encima: con queso campesino (17 g/100 g) y huevo
  // entero (9,9 g/100 g) las dos meriendas se iban +33% y +31%, y eran TODO el exceso del día
  // (desayuno, almuerzo y cena cuadraban). Se midieron 4 caminos sobre 8 perfiles × 7 días;
  // los otros tres (bajar wProt, subir el peso calórico de la merienda, y ambos) mejoraban el
  // promedio y EMPEORABAN el peor día. Cambiar la FUENTE es el único que mejora los dos.
  // No se toca `wProt` ni los pesos de NUT_MEALS_5: el reparto de proteína en 5 tomas de
  // 25-30 g clava el umbral de leucina y es correcto.
  media: [
    { pick: { prot: 'yogur_griego', carb: null, fat: 'almendra' }, acomp: ['mango'] },
    { pick: { prot: 'yogur_griego', carb: 'banano', fat: 'mani' }, acomp: [] },
    { pick: { prot: 'atun', carb: 'pan_integral', fat: null }, acomp: ['guayaba'] },      // era queso_campesino (17 g grasa/100 g → 1)
    { pick: { prot: 'clara', carb: 'avena', fat: 'mani' }, acomp: ['mandarina'] },        // era huevo entero (9,9 g grasa/100 g → 0,2)
    { pick: { prot: 'yogur_griego', carb: 'avena', fat: 'crema_mani' }, acomp: ['pina'] },
    // 🔴 Y LA MERIENDA ESTABA IGUAL DE ESTRECHA (Andrés, dictamen v471). Luz no era un caso
    // aislado: medido sobre los 154 presupuestos reales, **37 se quedaban con UNA sola opción**.
    // Con estos dos bajan a 22 y el promedio sube de 2,55 a 3,68.
    // ⚠️ Queda un hueco CONOCIDO y sin cerrar: **10 presupuestos no tienen NINGÚN menú factible**
    // y esos dos no los arreglan (caen al respaldo, que sirve el que menos incumple). Es la
    // esquina del piso calórico; la salida es más banco, no aflojar el filtro.
    { pick: { prot: 'yogur_griego', carb: 'pan_integral', fat: null }, acomp: ['guayaba'] },  // 92/154
    { pick: { prot: 'clara', carb: 'pan_integral', fat: null }, acomp: ['mandarina'] },       // 81/154
  ],
  almuerzo: [
    { pick: { prot: 'pollo_pechuga', carb: 'arroz', carb2: 'platano_maduro', fat: 'aceite' }, acomp: ['ensalada', 'zanahoria'] },
    { pick: { prot: 'res_magra', carb: 'papa', carb2: 'arroz', fat: 'aguacate' }, acomp: ['habichuela'] },
    { pick: { prot: 'tilapia', carb: 'yuca', carb2: 'arroz', fat: 'aceite' }, acomp: ['tomate', 'cebolla'] },
    { pick: { prot: 'lenteja', carb: 'arroz', carb2: 'platano_maduro', fat: 'aguacate' }, acomp: ['ensalada'] },
    { pick: { prot: 'cerdo_lomo', carb: 'platano_maduro', carb2: 'arroz', fat: 'aceite' }, acomp: ['brocoli'] },
    { pick: { prot: 'pollo_muslo', carb: 'papa_criolla', carb2: 'arroz', fat: 'aguacate' }, acomp: ['ahuyama'] },
    { pick: { prot: 'frijol', carb: 'arroz', carb2: 'platano_maduro', fat: 'aguacate' }, acomp: ['tomate'] },
  ],
  cena: [
    { pick: { prot: 'tilapia', carb: 'papa', carb2: 'arroz', fat: 'aguacate' }, acomp: ['ensalada'] },
    { pick: { prot: 'pollo_pechuga', carb: 'platano_verde', carb2: 'arroz', fat: 'aceite' }, acomp: ['habichuela'] },
    { pick: { prot: 'huevo', carb: 'arepa', fat: 'aguacate' }, acomp: ['tomate'] },
    { pick: { prot: 'atun', carb: 'pasta', fat: 'aceite' }, acomp: ['brocoli'] },
    { pick: { prot: 'res_molida', carb: 'arroz', carb2: 'platano_maduro', fat: 'aguacate' }, acomp: ['zanahoria', 'habichuela'] },
  ],
};

// Reparto del día en 5 tomas (decisión del PO 2026-08-01). La proteína se reparte
// EN PARTES IGUALES —se sintetiza mejor distribuida— y el resto sigue estos pesos.
const NUT_MEALS_5 = [
  { key: 'desayuno', name: 'Desayuno', w: 0.25 },
  { key: 'media', name: 'Media mañana', w: 0.10 },
  { key: 'almuerzo', name: 'Almuerzo', w: 0.30 },
  { key: 'media', name: 'Media tarde', w: 0.10 },
  { key: 'cena', name: 'Cena', w: 0.25 },
];

// ── EL PLAN DEL DÍA, con comida de verdad ───────────────────────────────
// Compone todo: objetivo del día (ciclado según se entrene o no) → reparto en 5
// tomas → cada toma resuelta en cantidades servibles.
// `dayIndex` (0-6) rota los menús para que la semana no sea el mismo plato repetido;
// las dos medias del día se desfasan entre sí para no repetir merienda.
// Puro y determinista. Sin base (faltan peso/talla/edad/sexo) → null: no se inventa.
// ── Macros de los ACOMPAÑANTES de una comida ────────────────────────────
// 🔴 Los acompañantes SE COMEN. Hasta el 2026-08-03 se mapeaban solo a NOMBRE para
// pintarlos ("con guayaba, tomate") y sus macros no entraban ni en el presupuesto de la
// comida ni en la cuenta del día → el plan SERVÍA hasta un 22% más de lo que PROMETÍA en
// su propia tarjeta, y el error pegaba más fuerte justo en quien está en déficit: medido
// sobre perfiles reales, +22,1% en Luz (perder grasa) y +11,4% en Samuel (ganar músculo).
// A ella el motor le calculó 500 kcal de déficit y el plato escrito se lo dejaba en ~110.
// Varios acompañantes son FRUTA (guayaba 61 kcal, banano 105), no lechuga.
// Un id que no esté en la tabla (p.ej. 'ensalada', que no es un alimento) aporta 0 — no se
// inventa nada, pero queda anotado en el radar.
// PURA: recibe ids, devuelve macros. `un.g` es la ración con la que se le habla a la persona.
// La ración con la que se sirve un acompañante. Vive en UNA función porque la usan dos sitios
// —los macros de aquí y las entradas que escribe `nutPlanMealEntries`— y si se separan, el
// registro diría una guayaba distinta de la que el plato contó.
function nutAcompGrams(food) { return (food && food.un && food.un.g > 0) ? food.un.g : 100; }
function nutAcompMacros(ids) {
  let p = 0, c = 0, f = 0, kcal = 0;
  (ids || []).forEach(id => {
    const food = NUT_FOOD_BY_ID[id];
    if (!food) return;
    const g = nutAcompGrams(food);
    p += food.p * g / 100; c += food.c * g / 100; f += food.f * g / 100;
    kcal += food.kcal * g / 100;
  });
  const prot_g = Math.round(p), carb_g = Math.round(c), fat_g = Math.round(f);
  // 🔴 Y aquí pegaba MÁS FUERTE que en ningún otro sitio: los acompañantes son justo las VERDURAS,
  // que son las filas donde la fórmula genérica más se pasa (+19% a +29%). El plan contaba la
  // ensalada con `4c` incluyendo la fibra y el registro la contaba por su valor real: la misma
  // ensalada, dos números distintos, en dos pantallas a un toque de distancia.
  return { prot_g, carb_g, fat_g, kcal: Math.round(kcal) };
}

// ── ELEGIR EL MENÚ QUE DE VERDAD CABE EN LA COMIDA ──────────────────────
// 🔴 EL PLATO SOLO SABE SUMAR, NUNCA RESTAR, y ahí estaba el desbordamiento. `nutSolveMeal`
// resuelve tres alimentos con la proteína como PISO (`NUT_PROT_MIN_SHARE`): cuando la proteína
// obligatoria y la grasa **ya se pasan** del presupuesto, poner el carbohidrato en cero es lo
// único que puede hacer — y no alcanza. Nadie absorbe el sobrante y la comida se sirve de más.
//
// Medido (mujer de 45 kg sedentaria, día 2): el almuerzo pide 29 g de carbohidrato al plato y
// le sirve 69, **172 kcal de más en un solo plato**. La razón no es un error de cuentas: la
// proteína de ese menú es **fríjol, que trae 2,56 g de carbohidrato por cada gramo de proteína**.
// Para darle sus 24 g de proteína hay que servirle 270 g de fríjol, y eso son 62 g de
// carbohidrato **haga lo que haga el solver**. Ese menú es INFACTIBLE con ese presupuesto, y
// ninguna aritmética lo arregla: el fríjol es así. Lo mismo con lenteja (2,22) y, más suave,
// con el yogur griego (0,36) en los desayunos chicos.
//
// 🔒 Por eso el arreglo NO va en el solver sino en QUIÉN ELIGE EL MENÚ: se evalúa el banco
// entero, se separan los que CABEN, y la rotación de siempre corre **sobre esos**. Se conserva
// todo lo que ya funcionaba —variedad a lo largo de la semana, el desfase entre Media mañana y
// Media tarde, y que el resultado sea determinista— y solo cambia la elección cuando la de hoy
// MIENTE.
// Se compara la comida COMPLETA (plato + acompañantes) contra lo que esa comida prometió, que
// es lo que la persona se lleva a la boca; comparar solo el plato dejaría fuera la fruta, que
// es justo el otro sitio por donde se colaba (una taza de piña son 91 kcal).
// ⚠️ LA ROTACIÓN VA SOBRE LOS FACTIBLES, y hay que decir la verdad sobre eso: **es forma, no
// fondo.** Escribí primero «el primero que cabe recorriendo desde donde apunta el día», creí que
// esa era la causa de que la variedad cayera, la cambié por esto… y el SABOTAJE SALIÓ VERDE. Las
// dos son equivalentes en cobertura, y la razón es de una línea: `start` recorre TODOS los
// índices, así que cualquier menú factible `j` sale elegido el día que `start` vale `j`. Lo que
// cambia es solo QUÉ día le toca cada uno. **La variedad la arregló el UMBRAL, no esta forma.**
// Se conserva porque es la que no se degrada si algún día se aprieta el tope, pero ningún test la
// protege y no se le puede atribuir un mérito que no tiene.
// 🔒 Y si NINGUNO cabe, se devuelve el que menos se pasa: un plan feo es mejor que ningún plan,
// y quedarse con el de la rotación sería preferir el azar al mejor disponible.
// 🔴 EL UMBRAL LO ELIGIÓ EL PO (2026-08-09) SOBRE UNA CURVA MEDIDA EN LAS 21 PERSONAS REALES,
// no sobre perfiles de laboratorio. Están en tensión dos cosas y no hay punto que gane las dos:
// cuánto se pasa el plato · cuántos platos distintos ve en la semana la persona PEOR SERVIDA
// (desayuno/almuerzo/cena — el mínimo de las 21, no el promedio, que aquí esconde el caso malo):
//    sin filtro (lo de antes) → peor +14,8% · promedio +8,9%              · 5/7/5
//    20% → peor +12,1% · prom +7,7% · mejoran 14, empeoran 7             · 3/7/4
//  ▶ 15% → peor +12,1% · prom +5,9% · mejoran 17, empeoran 3             · 2/5/3   ← ELEGIDO
//    10% → peor  +8,0% · prom +3,7% · mejoran 21, empeoran 0             · 1/3/2
// 🔴 Y por eso NO se apretó más, aunque al 10% mejoren las 21 sin excepción: ahí alguien
// (Hernán Camacho, medido) comería **EL MISMO DESAYUNO LOS 7 DÍAS**. Un plan que repite es un
// plan que se abandona — el defecto del banco de UNO que ya costó una versión en el generador de
// rutinas, y un plan abandonado sirve 0% de lo que promete, no el 96%.
// ⚠️ Que 3 personas empeoren 1-2 puntos es real y va dicho: la elección es POR COMIDA contra el
// presupuesto de esa comida, así que un día puede acumular varias comidas cerca del tope. Sale a
// cuenta (el promedio de las 21 baja de 8,9% a 5,9%) pero no es una mejora persona a persona.
const NUT_MENU_MAX_OVER = 0.15;
// Cuanto puede QUEDARSE CORTO un menu (v470 no tenia piso: aceptaba uno que servia -13,9%).
const NUT_MENU_MAX_UNDER = 0.10;
// 🔒 Y la PROTEINA aparte, mas estrecha que las calorias: es el macro que Andres protege.
const NUT_MENU_PROT_UNDER = 0.10;
function nutPickMenu(banco, start, meta, evitar) {
  if (!banco || !banco.length) return null;
  const kMeta = (meta.prot_g || 0) * 4 + (meta.carb_g || 0) * 4 + (meta.fat_g || 0) * 9;
  const evaluar = menu => {
    const ac = nutAcompMacros(menu.acomp || []);
    const sub = {
      prot_g: Math.max(0, (meta.prot_g || 0) - ac.prot_g),
      carb_g: Math.max(0, (meta.carb_g || 0) - ac.carb_g),
      fat_g: Math.max(0, (meta.fat_g || 0) - ac.fat_g),
    };
    const solved = nutSolveMeal(sub, menu.pick);
    const kReal = (solved.real.prot_g + ac.prot_g) * 4 + (solved.real.carb_g + ac.carb_g) * 4
      + (solved.real.fat_g + ac.fat_g) * 9;
    const pReal = solved.real.prot_g + ac.prot_g;
    return { menu, ac, sub, solved,
      over: kMeta > 0 ? (kReal - kMeta) / kMeta : 0,
      protRatio: (meta.prot_g || 0) > 0 ? pReal / meta.prot_g : 1 };
  };
  const todos = banco.map(evaluar);
  // 🔴 «CABER» ES BILATERAL Y POR MACRO — v470 lo miraba solo en kcal y por eso salió RECHAZADA.
  // Dos agujeros que costaron caro y los dos son de la misma familia (un total que tapa un macro):
  //  1. Sin PISO, `over <= tope` aceptaba menús que se quedan CORTOS: con 1.400 kcal de
  //     presupuesto «cabían» los 7 menús, incluido uno que servía 1.206 (−13,9%).
  //     ⚠️ ALCANCE de la cifra, que antes iba sin él: el «32 → 677 días» sale de la MALLA
  //     SINTÉTICA (136.080 días), no de nadie real. En las 22 personas reales el piso **no mueve
  //     el total del día** (−1,41% con y sin, idéntico) y por eso Andrés lo dio por inerte — pero
  //     NO lo es: muerde **por COMIDA**, que es donde vive el defecto. Quitarlo lleva las comidas
  //     servidas 10% por debajo de su propio presupuesto de **10 a 34 de 770**, y la peor comida
  //     de −12,9% a −22,9%. **El total del día TAPA la comida rota** — la misma lección del
  //     promedio que escondía el carbohidrato, y la razón de que su test sea por comida.
  //  2. Sin mirar los MACROS, un menú que cuadra en calorías y entrega 20 g menos de proteína
  //     «cabía». **A Kathe le quitaba 22 g de proteína en su peor día** — y Kathe es exactamente
  //     la persona por la que Andrés peleó +26 g (119→145) en `dictamen-andres-macros-2026-08-05`.
  //     Las personas bajo −20% de proteína pasaron de 116 a 1.482.
  // 🔒 LA PROTEÍNA NO SE NEGOCIA (dictamen de Andrés §1): tiene su propio mínimo y es más estrecho
  // que el de las calorías. Es el gotcha que ya estaba escrito en el repo —«toda aserción sobre un
  // total lleva su hermana POR MACRO»— y que este filtro nació ignorando.
  const cabe = c => c.over <= NUT_MENU_MAX_OVER && c.over >= -NUT_MENU_MAX_UNDER
    && c.protRatio >= 1 - NUT_MENU_PROT_UNDER;
  const caben = todos.filter(cabe);
  // 🔴 `evitar` = lo que YA se sirvió hoy de ESTE MISMO banco. Sin esto, v470 le mandaba a la
  // persona **la misma merienda a media mañana y a media tarde el 60,4% de los días** (medido en
  // 1.260 días-plan; el control en v469 daba 0,0%). Lo cazaron DOS auditorías, no yo.
  // La causa era mía y es sutil: las dos meriendas comparten banco y se separaban con un desfase
  // FIJO de 4 índices (`i * 2`), que funcionaba porque el banco SIEMPRE tenía 5. Al rotar sobre el
  // subconjunto FACTIBLE el tamaño cambia, y con un pool de 1, 2 o 4 un desfase de 4 es un
  // **no-op**: las dos comidas caen en la misma casilla, los 7 días.
  // **Un desfase constante solo separa si el módulo es constante — y desde v470 no lo es.**
  // 🔒 Y es el MISMO defecto por el que se rechazó apretar el umbral al 10% («comería el mismo
  // desayuno los 7 días»), colado por la puerta de al lado: la curva que aprobó el PO medía
  // desayuno/almuerzo/cena, y las que colisionan son las dos `media`. **Una métrica que no mira la
  // superficie afectada no es un control.**
  // 🔴 CUÁNTO INCUMPLE un menú: la PEOR de las tres condiciones, medida en la misma unidad
  // (fracción de su objetivo). Sin pesos inventados, y ninguna condición puede ignorar a las
  // otras. Aquí vivía el MISMO defecto que se arregla arriba: el desempate era `|over|`, o sea
  // CALORÍAS PURAS, así que el respaldo podía entregar el menú que peor lleva la proteína con tal
  // de cuadrar el total — puerta cerrada, ventana abierta, otra vez. Medido en la malla de 5.200
  // perfiles × 7 días contra el desempate por kcal: peor hueco de proteína del día **−13,4% →
  // −9,3%** y días bajo −10% de proteína **0,16% → 0**, pagando 15,3% → 16,7% de exceso de kcal.
  // (El desempate «la proteína a cualquier precio» que probé primero lo disparaba a 23,6%: por eso
  // NO se pondera un macro sobre otro, se minimiza el peor incumplimiento.)
  const incumple = c => Math.max(
    c.over - NUT_MENU_MAX_OVER,               // se pasa de calorías
    -NUT_MENU_MAX_UNDER - c.over,             // se queda corto de calorías
    (1 - NUT_MENU_PROT_UNDER) - c.protRatio,  // se queda corto de proteína
  );
  const menosMalo = pool => pool.reduce((a, b) => (incumple(b) < incumple(a) ? b : a));
  const usados = evitar || [];
  const noUsado = c => usados.indexOf(c.menu) < 0;
  if (!caben.length) {
    // Ninguno cabe (5,9% de las comidas, medido sobre 182.000): manda el que menos incumple,
    // pero primero entre los que HOY no se han servido. Un plan feo es mejor que ningún plan.
    const libres = todos.filter(noUsado);
    return menosMalo(libres.length ? libres : todos);
  }
  const libres = caben.filter(noUsado);
  if (libres.length) {
    const i = ((parseInt(start, 10) || 0) % libres.length + libres.length) % libres.length;
    return libres[i];
  }
  // 🔴 TODOS LOS QUE CABEN YA SE SIRVIERON HOY. Antes se repetía uno, y ahí seguía viva la mitad
  // del P0 que reportaron las dos auditorías: a quien el presupuesto le deja UN SOLO menú de
  // merienda factible, `evitar` no tiene nada que evitar y le caía **la misma merienda a media
  // mañana y a media tarde, los 7 días**. Le pasa a gente real (Luz, medida en el respaldo del
  // 9-ago), no a un perfil sintético.
  // Se prefiere un menú DISTINTO que se sale un poco antes que el MISMO plato dos veces el mismo
  // día. Medido sobre las 21 personas reales: **merienda repetida 27,2% → 0,0%**, pagando peor
  // proteína −2,6% → −3,3% y peor exceso de kcal +10,9% → +12,6%. Los dos siguen MUY dentro de
  // sus topes, y en producción (v470) esto era 55,1% con la proteína en −20,1%.
  const otros = todos.filter(noUsado);
  if (otros.length) return menosMalo(otros);
  // Ya se sirvió el banco ENTERO hoy: repetir antes que dejarla sin comer.
  return caben[((parseInt(start, 10) || 0) % caben.length + caben.length) % caben.length];
}
function nutDayPlan(base, kind, trainDays, legDays, dayIndex) {
  const t = nutDayTarget(base, kind, trainDays, legDays);
  if (!t) return null;
  const di = ((parseInt(dayIndex) || 0) % 7 + 7) % 7;
  // 🔴 La proteína NI se reparte por igual NI sigue el tamaño de la comida: va a MITAD DE
  // CAMINO. Repartirla por igual tiene su razón nutricional (se sintetiza mejor distribuida),
  // pero produce platos absurdos: medido 2026-08-01 sobre un plan de 180 g, la media mañana
  // cargaba los mismos 36 g que el almuerzo — «6 huevos» a las diez de la mañana, visible en
  // la captura y que el texto del harness no delataba. Seguir sólo el tamaño la dejaría
  // demasiado floja en las meriendas. La mezcla da comidas creíbles sin perder el reparto.
  const nM = NUT_MEALS_5.length;
  // Menus ya servidos hoy, POR BANCO: las dos meriendas comparten el de `media`.
  const _usados = {};
  const meals = NUT_MEALS_5.map((slot, i) => {
    const banco = NUT_MENUS[slot.key] || [];
    const wProt = (slot.w + 1 / nM) / 2;   // mezcla: mitad tamaño de la comida, mitad reparto parejo
    const meta = {
      prot_g: Math.round(t.prot_g * wProt),
      carb_g: Math.round(t.carb_g * slot.w),
      fat_g: Math.round(t.fat_g * slot.w),
    };
    // El menú se elige entre los que CABEN en el presupuesto de esta comida, empezando por el
    // que le tocaba a este día (el desfase `i * 2` mantiene distintas Media mañana y Media tarde).
    // Lo que traen los acompañantes se DESCUENTA del presupuesto del plato: si la comida
    // viene con guayaba, el arroz baja. Antes el plato se calculaba como si la fruta no
    // existiera y luego la fruta se servía igual, encima.
    const elegido = banco.length ? nutPickMenu(banco, di + i * 2, meta, _usados[slot.key]) : null;
    if (elegido) (_usados[slot.key] = _usados[slot.key] || []).push(elegido.menu);
    const menu = elegido ? elegido.menu : null;
    const ac = elegido ? elegido.ac : nutAcompMacros([]);
    const solved = elegido ? elegido.solved : { items: [], real: { prot_g: 0, carb_g: 0, fat_g: 0, kcal: 0 } };
    // `real` = lo que la persona SE COME de verdad: el plato MÁS los acompañantes.
    const real = {
      prot_g: solved.real.prot_g + ac.prot_g,
      carb_g: solved.real.carb_g + ac.carb_g,
      fat_g: solved.real.fat_g + ac.fat_g,
    };
    // El total de la comida es la SUMA de lo que trae cada alimento (plato + acompañantes), no
    // una re-derivación desde los macros redondeados: así `plan.real` y lo que el REGISTRO le
    // suma a esa misma comida son EL MISMO NÚMERO.
    real.kcal = Math.round(solved.real.kcal + ac.kcal);
    return {
      name: slot.name,
      target: meta,          // lo que esa comida DEBE aportar (acompañantes incluidos)
      items: solved.items,
      acomp: menu ? (menu.acomp || []).map(a => (NUT_FOOD_BY_ID[a] ? NUT_FOOD_BY_ID[a].name : a)) : [],
      // Los NOMBRES son para pintar; los IDS son para poder registrarlos (F7). `acomp` los perdía
      // por el camino, y sin ellos «me lo comí» habría anotado el plato sin la fruta — justo el
      // 22% de más que costó v470, pero al revés.
      acompIds: menu ? (menu.acomp || []).slice() : [],
      acompReal: ac,
      real,
    };
  });
  const real = meals.reduce((a, m) => ({
    prot_g: a.prot_g + m.real.prot_g, carb_g: a.carb_g + m.real.carb_g, fat_g: a.fat_g + m.real.fat_g,
  }), { prot_g: 0, carb_g: 0, fat_g: 0 });
  real.kcal = meals.reduce((a, m) => a + m.real.kcal, 0);
  return { kind: t.kind, target: t, meals, real };
}

// ══════════════════════════════════════════════════════════════════════
// EL PLAN SE MARCA, NO SE RE-ESCRIBE (F7 · patrón 1 del estudio Fitia/MFP)
// ──────────────────────────────────────────────────────────────────────
// Hasta hoy el plan de comida y el registro eran DOS MUNDOS: la app le decía a la persona qué
// comer y con cuántos gramos, y acto seguido le pedía buscarlo y teclearlo otra vez, 3-5 veces
// al día. El dato que lo decide: **el vaso de agua, que es UN toque, lo usan 6 de 24** — nada
// que pida más esfuerzo que eso se sostiene. En Fitia el plan del día ES el registro.
// Aquí la comida del plan se convierte en entradas NORMALES del registro (el mismo
// `foodLogEntry`, el mismo snapshot de macros) para que todo lo de aguas abajo —totales,
// progreso, la ficha del coach, la poda, el merge— siga funcionando sin enterarse de nada.
//
// 🔒 LOS TRES CANDADOS, y cada uno paga un bug ya conocido de este repo:
//  1. **El id es DETERMINISTA** (`pl-<día>-<comida>-<n>`). Marcar dos veces no duplica —
//     `foodLogAdd` reemplaza por id— y dos teléfonos que marcan la misma comida producen las
//     MISMAS entradas, así que `foodLogMerge` las une en vez de servir el desayuno dos veces.
//     Un id aleatorio habría convertido el merge multi-dispositivo (E4) en un duplicador.
//  2. **Los acompañantes CUENTAN.** Es el bug que costó v470 al revés: el plato servía 22% de
//     más porque la guayaba se pintaba y no se sumaba. Si aquí se registrara solo el plato, el
//     registro quedaría por debajo de lo que el propio plan dice que la persona se está comiendo.
//  3. **Se puede DESMARCAR.** Una marca que no se puede deshacer obliga a quien tocó por error a
//     borrar cuatro entradas a mano — la misma lección de la bandeja que no se puede vaciar.
const FOODLOG_PLAN_PREFIX = 'pl-';
// Los ids que escribe el registro a mano empiezan por `fl`; los del plan, por `pl-`. Distinguirlos
// permite decir en pantalla de dónde salió cada entrada Y desmarcar solo lo que puso el plan,
// sin tocar lo que la persona anotó ella misma en esa misma comida.
function foodLogIsPlanEntry(e) { return !!e && String(e.id || '').indexOf(FOODLOG_PLAN_PREFIX) === 0; }
function _flPlanId(dayKey, mealKey, n) { return FOODLOG_PLAN_PREFIX + dayKey + '-' + mealKey + '-' + n; }
// Las entradas de registro que corresponden a UNA comida del plan. PURA.
// `idx` es la posición de la comida en el plan (0..4) y también en `FOODLOG_MEALS`: los dos
// arreglos van en el mismo orden por construcción (`NUT_MEALS_5`) y **hay un test que lo afirma**
// — si alguien reordena uno solo de los dos, el desayuno se registraría como cena.
function nutPlanMealEntries(plan, idx, now) {
  const m = ((plan && plan.meals) || [])[idx];
  const mealKey = FOODLOG_MEALS[idx];
  if (!m || !mealKey) return [];
  const dayKey = habitDayKey(now);
  const out = [];
  const add = (foodId, grams) => {
    const food = NUT_FOOD_BY_ID[foodId];
    if (!food) return;                       // un id que no está en la tabla no se inventa
    const e = foodLogEntry(food, grams, mealKey, now, () => _flPlanId(dayKey, mealKey, out.length));
    if (e) out.push(e);
  };
  (m.items || []).forEach(it => add(it.id, it.grams));
  (m.acompIds || []).forEach(id => { const f = NUT_FOOD_BY_ID[id]; if (f) add(id, nutAcompGrams(f)); });
  return out;
}
function foodLogMarkPlanMeal(foodlog, plan, idx, now) {
  let fl = _flNorm(foodlog);
  nutPlanMealEntries(plan, idx, now).forEach(e => { fl = foodLogAdd(fl, e, now); });
  return fl;
}
// Desmarcar quita SOLO lo que puso el plan en esa comida: si la persona añadió un café a mano,
// el café se queda.
function foodLogUnmarkPlanMeal(foodlog, idx, now) {
  const o = _flNorm(foodlog);
  const mealKey = FOODLOG_MEALS[idx];
  const dayKey = habitDayKey(now);
  if (!mealKey || !o.d[dayKey]) return o;
  o.d = Object.assign({}, o.d);
  const rest = o.d[dayKey].filter(e => !(foodLogIsPlanEntry(e) && e.meal === mealKey));
  if (rest.length) o.d[dayKey] = rest; else delete o.d[dayKey];
  return o;
}
function foodLogPlanMealDone(foodlog, idx, now) {
  const mealKey = FOODLOG_MEALS[idx];
  if (!mealKey) return false;
  return foodLogDay(foodlog, now).some(e => foodLogIsPlanEntry(e) && e.meal === mealKey);
}

// ── De dónde salen los macros del día ───────────────────────────────────
// 🔴 EL PLAN DEL COACH MANDA. Si él escribió kcal y macros, esos son los números y
// AVI solo los REPARTE según el día y los convierte en comida. Recalcularlos por
// nuestra cuenta sería pisarle el criterio a quien conoce a la persona — y el PO fue
// explícito: «AVI propone, el coach aprueba».
// Sin plan del coach (o incompleto) se cae a la estimación automática, y si tampoco
// hay datos del cuerpo → null: no se inventa un plan.
// Las calorías que de verdad suman unos macros. Es la CUENTA, no el titular.
function nutMacroKcal(macros) {
  const m = macros || {};
  const p = parseFloat(m.prot_g != null ? m.prot_g : m.prot) || 0;
  const c = parseFloat(m.carb_g != null ? m.carb_g : m.carbs) || 0;
  const f = parseFloat(m.fat_g != null ? m.fat_g : m.fat) || 0;
  return Math.round(p * 4 + c * 4 + f * 9);
}
const NUT_KCAL_MISMATCH = 25; // desfase que ya no es redondeo y hay que avisarle al coach

// 🔴 EL CANDADO NUMÉRICO DE MENORES VIVE AQUÍ, a la SALIDA de `nutBaseFor`, que es el punto ÚNICO
// donde se ELIGE el número que lee el asesorado: las 7 superficies (Hoy · Perfil · «Ver mi plan en
// grande» · el plato · la lista del mercado ×2 · la franja del registro) leen de aquí.
// La regla «un menor NUNCA lleva déficit» (dictamen de Andrés Hyp, 2026-08-05) vivía SOLO dentro de
// `nutritionEstimate` — o sea, la calculadora automática. Un plan ESCRITO A MANO por el coach entra
// por la otra puerta y nadie le preguntaba la edad. Medido el 2026-08-15 sobre el backup del 12-ago:
// una asesorada de 15 años con plan escrito de 1.771 kcal y gasto de 1.910 comía un 7,3% POR DEBAJO
// de lo que gasta, todos los días, mientras su pantalla le explicaba «estás comiendo en balance».
// Puerta cerrada, ventana abierta: la misma clase que el filtro de lesiones y el calentamiento
// (v424), y que el candado de TEXTO de v449 — que sí cubre sus 3 rutas, pero solo protege el TEXTO.
// El plato se arma con los MACROS, así que subir el titular a secas no serviría de nada: se escalan
// los tres en la MISMA proporción (respeta el reparto que eligió el coach, corrige solo el total) y
// el faltante del redondeo se cierra con carbohidrato, para que el piso se cumpla SIEMPRE — un
// candado que afirma el signo y no la dosis deja pasar el defecto que lo motivó (lección de v482).
// Margen del piso sobre el gasto y techo de proteína del menor: los dos DICTADOS por Andrés Hyp
// (2026-08-15) con su medición al lado. El 1,05 sale del margen REAL del plato (−5,3% a +11,4%),
// no de una intuición sobre el crecimiento; el 2,2 g/kg es sobre peso de REFERENCIA, no de báscula.
const NUT_MENOR_PISO_MARGEN = 1.05;
const NUT_MENOR_PROT_MAX = 2.2;
// Y el otro lado de la banda (REGLA 3 del mismo dictamen, 2026-08-15): un menor tampoco lleva
// superávit libre. Tope general +10% del gasto, y **cero superávit** si su IMC lo pone en
// sobrepeso para su edad y su sexo — ahí su dirección es mantenimiento y el músculo lo pone el
// entrenamiento, no el exceso de comida. Cuando el IMC manda, el techo ES el piso: no queda una
// franja donde elegir, queda un número.
const NUT_MENOR_TECHO_MARGEN = 1.10;
// Un gramo de carbohidrato son 4 kcal, así que un techo nunca cae en un número exacto: se llega a
// él con un grano de 3 kcal de holgura. Sin esta holgura el recorte NO ES IDEMPOTENTE —la segunda
// pasada volvía a «recortar» su propio redondeo y pisaba el `kcalAntes` del aviso con un número
// que no era el original (cazado midiendo: decía «antes 2.697» cuando el plan real era 2.917)—
// y el mismo grano es el que le sobra al detector de contradicciones para no marcar la franja.
const NUT_MENOR_GRANO = 3;
function nutMinorTecho(tdee, client, weightKg) {
  if (!(tdee > 0) || !client || !isMenor(client)) return null;
  const margen = nutMinorBmiOver(client, weightKg) ? NUT_MENOR_PISO_MARGEN : NUT_MENOR_TECHO_MARGEN;
  return Math.round(tdee * margen);
}
// El gasto del menor se calcula en UN solo sitio: el piso y el techo son los dos bordes de la
// misma banda, y si cada uno lo dedujera por su cuenta podrían acabar mirando números distintos.
// Sin sexo declarado no hay gasto que calcular — y quien pregunte recibe `null`, no una suposición.
function nutMinorTdee(client, weightKg) {
  const sx = client && (client.sex === 'M' || client.sex === 'F') ? client.sex : null;
  if (!sx) return null;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);
  return calcTDEE(calcTMB(w, client.height, client.age, sx), client.activityFactor);
}
function nutMinorFloorBase(base, client, weightKg) {
  if (!base || !base.macros || !client || !isMenor(client)) return base;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);
  const tdee = nutMinorTdee(client, w);
  // 🔴 Sin gasto conocido NO se inventa un piso — pero TAMPOCO se calla: el plan sigue como está y
  // se MARCA, para que el coach vea que a esta persona el candado no la está cubriendo. Fallar en
  // silencio era el hallazgo L3 de Lucas: las dos puertas degradaban al revés (la calculadora se
  // cierra y pide datos; el plan escrito se abría y servía). Un candado que falla mudo no es un
  // candado. Hoy le toca a Santiago, 17 años, que no declara sexo.
  if (!tdee) return Object.assign({}, base, { minorFloorUnknown: true });
  if (!(base.kcalObj > 0)) return base;
  // El piso NO es el gasto pelado: es gasto × 1,05. No por el crecimiento (son 1-2%, FAO/WHO/UNU
  // 2004) sino porque EL PLATO entrega entre −5,3% y +11,4% de lo que promete — con el piso clavado
  // en el gasto exacto, la menor real seguía comiendo −5,1% en su peor día. El piso tiene que
  // absorber el margen del plato o no es un piso. Dictamen de Andrés Hyp, 2026-08-15.
  const piso = Math.round(tdee * NUT_MENOR_PISO_MARGEN);
  if (base.kcalObj >= piso) return base;
  const factor = piso / base.kcalObj;
  // Techo de proteína: escalar sin tope convierte un plan escrito muy bajo en un disparate — un
  // plan de 1.000 kcal daría 287 g = 5,5 g/kg. Hoy no mueve a nadie (por eso el test lo fuerza).
  const ref = nutRefWeight(w, client.height) || w;
  const protTecho = Math.round(ref * NUT_MENOR_PROT_MAX);
  const macros = {
    prot_g: Math.min(Math.round(base.macros.prot_g * factor), protTecho),
    carb_g: Math.round(base.macros.carb_g * factor),
    fat_g: Math.round(base.macros.fat_g * factor),
  };
  macros.kcal = nutMacroKcal(macros);
  // El faltante (del redondeo, y de la proteína que el techo no dejó subir) va a carbohidrato, que
  // es el macro flexible. Así el piso se cumple SIEMPRE: un candado que afirma el signo y no la
  // DOSIS deja pasar el defecto que lo motivó (v482).
  if (macros.kcal < piso) {
    macros.carb_g += Math.ceil((piso - macros.kcal) / 4);
    macros.kcal = nutMacroKcal(macros);
  }
  return Object.assign({}, base, {
    kcalObj: macros.kcal, macros,
    minorFloor: {
      tdee, piso, kcalAntes: base.kcalObj, factor: Math.round(factor * 1000) / 1000,
      protTope: macros.prot_g >= protTecho,
    },
  });
}

// 🔴 EL OTRO LADO DEL CANDADO. El de v485 solo miraba hacia abajo, y hacia arriba sí había gente:
// medido el 2026-08-15 sobre la base real, una asesorada de 16 años con IMC 26,4 —sobrepeso para
// su edad en la referencia de la OMS— recibía **+350 kcal/día, todos los días**, y no lo escribió
// nadie: sale de la calculadora, porque su objetivo dice «Ganar músculo». Un candado que solo
// mira un lado no es medio candado: es un candado que enseña a confiar en la puerta.
// El recorte sale del CARBOHIDRATO, que es el macro flexible (mismo criterio que el piso), y la
// proteína se queda donde está —con el techo de 2,2 g/kg de REGLA 1— porque bajarla es
// exactamente lo que no se hace cuando se recorta energía. Si el carbohidrato ya está en su
// suelo, **el que cede es el TECHO, no el plato**: dejar a alguien sin carbohidrato para cumplir
// un tope es el defecto del 0-carb de v428 puesto del revés. Cuando cede, se dice (`apretado`).
function nutMinorCapBase(base, client, weightKg) {
  if (!base || !base.macros || !client || !isMenor(client)) return base;
  if (!(base.kcalObj > 0)) return base;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);
  const tdee = nutMinorTdee(client, w);
  if (!tdee) return base;                       // sin gasto no hay techo (el piso ya lo MARCA)
  const techo = nutMinorTecho(tdee, client, w);
  if (!techo || base.kcalObj <= techo + NUT_MENOR_GRANO) return base;
  const ref = nutRefWeight(w, client.height) || w;
  const prot_g = Math.min(base.macros.prot_g, Math.round(ref * NUT_MENOR_PROT_MAX));
  const fat_g = base.macros.fat_g;
  const carbMin = Math.round(ref * NUT_CARB_MIN_G_KG);
  // El residuo del redondeo se cierra HACIA ARRIBA a propósito. Cuando el IMC manda, techo y piso
  // son el MISMO número y un gramo de carbohidrato son 4 kcal: hay que caer de un lado. Pasarse
  // 3 kcal de un techo (una regla de dirección) es preferible a quedarse 3 por debajo de un piso
  // (una promesa de dosis, y la que v485 pagó caro). Así el piso de la banda queda en no-op.
  let carb_g = Math.ceil((techo - prot_g * 4 - fat_g * 9) / 4);
  const apretado = carb_g < carbMin;
  if (apretado) carb_g = carbMin;
  const macros = { prot_g, carb_g: Math.max(0, carb_g), fat_g };
  macros.kcal = nutMacroKcal(macros);
  return Object.assign({}, base, {
    kcalObj: macros.kcal, macros,
    minorCap: {
      tdee, techo, kcalAntes: base.kcalObj, apretado,
      sobrepeso: !!nutMinorBmiOver(client, w),
    },
  });
}

// La BANDA completa, y en este orden a propósito: primero el techo, el piso al final. Cuando el
// IMC manda, techo y piso son el MISMO número y el redondeo del recorte puede dejar la cifra 1-3
// kcal por debajo; que la última palabra la tenga el piso hace que la promesa «ningún menor por
// debajo de su gasto» siga siendo exacta, y que la que se pase por 3 kcal sea la del techo, que
// es una regla de dirección, no de dosis.
function nutMinorBandBase(base, client, weightKg) {
  return nutMinorFloorBase(nutMinorCapBase(base, client, weightKg), client, weightKg);
}

function nutBaseFor(client, nut, weightKg) {
  const k = parseFloat(nut && nut.kcal);
  const p = parseFloat(nut && nut.prot);
  const c = parseFloat(nut && nut.carbs);
  const f = parseFloat(nut && nut.fat);
  if (k > 0 && p > 0 && c > 0 && f > 0) {
    // 🔴 El titular que escribió el coach y la suma de SUS PROPIOS macros no siempre cuadran
    // (medido 2026-08-04: 6 de 10 planes, y el de Nataly por 240 kcal/día). El plato se arma con
    // los MACROS, así que el titular escrito es el número que miente: se muestra el DERIVADO y el
    // desfase viaja para que el coach lo vea y arregle uno de los dos. Cambiar el número y dejar
    // el titular viejo sería el mismo error de v428 (anunciar un déficit mientras se sirve otra cosa).
    const macros = { prot_g: Math.round(p), carb_g: Math.round(c), fat_g: Math.round(f) };
    macros.kcal = nutMacroKcal(macros);
    // `desfase` se calcula ANTES del piso a propósito: describe la contradicción del COACH (su
    // titular contra sus propios macros), no el efecto de nuestro candado. Mezclarlos le echaría
    // encima la culpa de algo que hicimos nosotros — el error de v471 con el botón «✨ Generar».
    return nutMinorBandBase({
      origen: 'coach', kcalObj: macros.kcal, macros,
      kcalEscrito: Math.round(k), desfase: macros.kcal - Math.round(k),
    }, client, weightKg);
  }
  const est = nutritionEstimate(client, weightKg);
  if (!est || !est.macros) return null;
  // 🔴 ESTA RAMA SÍ ES IDEMPOTENTE AHORA, Y ANTES NO LO ERA — decía serlo en este mismo comentario.
  // `nutritionEstimate` aplicaba la regla «un menor no lleva déficit» pero NO el piso ×1,05, que
  // v485 dejó solo aquí. Resultado medido el 2026-08-18 sobre la base real: a una asesorada de 16
  // años la habitación de Nutrición le decía **2.111 kcal** y «Hoy», el plato y la lista del
  // mercado **2.219** — 108 kcal para el MISMO plan, a un toque de distancia, porque esas dos
  // pantallas leen `nutritionEstimate` directo y estas leen la salida de aquí. Ahora la banda vive
  // DENTRO de la estimación, así que las dos puertas devuelven el mismo número y este paso no
  // mueve nada; se deja igual porque la garantía tiene que ser de la SALIDA de `nutBaseFor`, no de
  // una de sus ramas ni de que quien toque la otra puerta mañana se acuerde de la regla.
  const b = nutMinorBandBase({ origen: 'estimado', kcalObj: est.kcalObj, macros: est.macros, tdee: est.tdee }, client, weightKg);
  if (est.minorFloor && !b.minorFloor) b.minorFloor = est.minorFloor;
  if (est.minorCap && !b.minorCap) b.minorCap = est.minorCap;
  if (est.minorFloorUnknown) b.minorFloorUnknown = true;
  return b;
}

// ══════════════════════════════════════════════════════════════════════
// UNA SOLA VERDAD PARA LAS DOS PANTALLAS (v435)
// ──────────────────────────────────────────────────────────────────────
// El PO reportó «hay dos planes de nutrición y son diferentes». Medido el 2026-08-04 sobre los 21
// asesorados: el kcal BASE sí coincide, pero «Hoy» muestra el objetivo DEL DÍA (que se mueve con
// el tipo de entreno) y «Perfil» muestra el número FIJO de la semana. A Kathe le salían 2.227 el
// domingo, 2.395 el martes y 2.507 el lunes contra los 2.400 del perfil: hasta 173 kcal de
// diferencia, sin una sola línea que explicara por qué. Está bien calculado y aun así, en pantalla,
// son dos números que se contradicen.
// `nutWeekTargets` es el reparto COMPLETO de la semana. Las dos pantallas leen de aquí: «Hoy» toma
// su día y «Perfil» pinta los siete. Puro.
const NUT_WEEK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function nutWeekTargets(base, routines) {
  if (!base || !base.macros) return null;
  const shape = nutWeekShape(routines);
  const rs = Array.isArray(routines) ? routines : [];
  const days = NUT_WEEK_DAYS.map((name, i) => {
    const rut = rs.find(r => r && r.day === name) || null;
    const kind = nutDayKind(rut);
    return { dayIndex: i, day: name, kind, routineName: (rut && rut.name) || '', target: nutDayTarget(base, kind, shape.trainDays, shape.legDays) };
  });
  // El total de la semana NO cambia con el reparto: es la promesa que sostiene todo esto.
  const semana = days.reduce((t, d) => t + ((d.target && d.target.kcal) || 0), 0);
  return { days, shape, baseKcal: base.kcalObj, semanaKcal: semana, promedioKcal: Math.round(semana / 7) };
}

// ══════════════════════════════════════════════════════════════════════
// LA LISTA DEL MERCADO (patrón 4 del estudio de Fitia/MFP)
// ──────────────────────────────────────────────────────────────────────
// Fitia LA COBRA (está en su plan de pago) y AVI ya tiene todo lo necesario: los 7 días
// resueltos, con sus alimentos y sus gramos. Esto es sumar y agrupar — la mejor relación
// impresión/costo de lo que quedaba del estudio.
//
// 🔴 LO QUE SE COMPRA NO ES LO QUE SE SIRVE, y hay DOS diferencias que no se pueden callar:
//  1. **`maxG` NO se aplica aquí.** Es el tope de UNA ración («no le sirvas 400 g de clara de
//     huevo de una sentada»), no de la compra de la semana. Aplicarlo dejaría la lista pidiendo
//     200 g de clara para siete días. Hay un test que lo afirma, porque el reflejo de reusar
//     `nutPortionText` —que sí lo aplica— es fortísimo.
//  2. **La tabla habla de comida LISTA PARA COMER** (cocida cuando aplica): 1 kg de arroz cocido
//     no es 1 kg de arroz crudo. **Aquí NO se inventa el factor de conversión**: no hay fuente
//     citable por alimento, y un factor inventado es un número falso internamente coherente — la
//     clase de la yuca, que ya costó que el motor recetara un 22% de menos.
//     🔴 **CÓMO SE DECÍA ANTES, Y POR QUÉ ESTABA MAL (dictamen de Andrés Hyp, 13-ago).** Se
//     MARCABA alimento por alimento derivando la marca de su propio NOMBRE (`/cocid[ao]s?/`). Eso
//     parecía el candado derivado de siempre y era un colador, porque **la tabla entera es
//     cocido-base y solo algunos alimentos lo dicen en el nombre**: las 6 carnes (pechuga 165 kcal
//     y 31 g de proteína son valores COCIDOS — la cruda no llega, no cabe con 70-75% de agua)
//     **no se marcaban**, así que la lista pedía 1,4 kg de pechuga para que quedara 1 kg servido:
//     **~28% menos proteína de la semana, todas las semanas, sin un solo aviso.**
//     Y el aviso que sí salía estaba **al revés para la mayoría**, porque no hay UN mecanismo
//     sino TRES: ① ABSORCIÓN (arroz, pasta, granos: se compran secos y ganan agua → comprar
//     MENOS), ② MERMA (las carnes: pierden 25-33% de agua → comprar MÁS) y ③ CÁSCARA (papa,
//     yuca, plátano: la cocción es neutra —hervir papa pelada rinde 1,00— y lo que cambia el peso
//     es la parte que se bota → comprar MÁS). El texto viejo decía «crudo pesa menos»: cierto
//     para ①, **falso para ② y ③**. Acertaba en 5 de 17 alimentos.
//     ✅ **DECISIÓN DEL PO (13-ago): se quita el marcado por alimento y va UNA frase completa.**
//     Marcar 10 y dejar 6 sin marcar es peor que no marcar ninguno: el chip en el arroz le dice a
//     la persona, sin decirlo, que la pechuga SÍ es peso de compra — puerta cerrada, ventana
//     abierta. La frase es incondicional a propósito: si dependiera de detectar alimentos
//     afectados, el alimento que el detector no vea vuelve a salir mudo, que es este mismo bug.
//     ⏭️ Cerrarlo de verdad = CONVERTIR con los factores que ya trajo Andrés con fuente (TCAC
//     2018 con página · USDA Cooking Yields R2 2014). ⚠️ Al hacerlo: `un.g` es unidad de RACIÓN,
//     no de compra, así que la conversión va ANTES de dividir en unidades o la cuenta de «19
//     papas» sale mal en silencio.
// 🔴 EL TEXTO VIVE EN UNA SOLA CONSTANTE. Lo leen la pantalla Y el texto de WhatsApp: si cada
// una escribe el suyo, se separan a la primera corrección (familia v435/v444).
const NUT_SHOP_NOTA = 'Ojo: estos pesos son de la comida ya lista para comer. En el mercado el peso es otro: '
  + 'el arroz, la pasta y los granos pesan menos crudos, y las carnes, la papa, la yuca y el plátano pesan más.';
const NUT_SHOP_GROUPS = [
  ['prot', 'Proteína'],
  ['carb', 'Harinas, granos y tubérculos'],
  ['verd', 'Verduras'],
  ['fruta', 'Frutas'],
  ['fat', 'Grasas y frutos secos'],
];
function nutShopQty(food, grams) {
  const g = Math.round(parseFloat(grams) || 0);
  if (!food || !(g > 0)) return null;
  // En el mercado el kilo es la unidad: «1,2 kg» se lee, «1.240 g» hay que traducirlo.
  const peso = g >= 1000 ? String(Math.round(g / 100) / 10).replace('.', ',') + ' kg' : g + ' g';
  const un = food.un;
  // Se compran unidades ENTERAS y se redondea HACIA ARRIBA: nadie compra 11,3 huevos, y que
  // sobre un huevo es un problema mucho menor que quedarse corto el viernes.
  const n = (un && un.g > 0) ? Math.ceil(g / un.g) : null;
  const cuenta = n ? String(n) + ' ' + (n > 1 ? _nutPlural(un.label) : un.label) : null;
  // 🔴 LA MEDIDA DE RACIÓN NO ES LA MEDIDA DE COMPRA. `un` existe para decirle a la persona
  // cuánto SERVIRSE («un octavo de aguacate»), y sumada a la semana produce cantidades que en
  // un mercado no significan nada: «13 octavos de aguacate», «32 claras», «13 vasos de yogur».
  // Al mercado se va con el peso, salvo en lo que de verdad se compra por unidad — y eso es
  // una propiedad del ALIMENTO, no algo que se pueda deducir de su etiqueta, así que se declara
  // en la tabla (`compra:'un'`, 14 alimentos) donde el PO y Andrés pueden revisarla.
  const porUnidad = food.compra === 'un' && !!cuenta;
  return {
    grams: g, peso, n, porUnidad,
    text: porUnidad ? cuenta : peso,      // lo que se lee grande: con lo que se actúa
    // 🔴 La ayuda de al lado SOLO en lo que se compra por unidad («12 huevos · 575 g»). Al revés
    // no sirve: poner «13 octavos» debajo de «375 g de aguacate» devuelve por la puerta de atrás
    // el ruido que `compra:'un'` existe para quitar. Cada línea, UN número con el que actuar.
    sub: porUnidad ? peso : null,
  };
}
function nutShoppingList(base, routines) {
  if (!base || !base.macros) return null;
  const shape = nutWeekShape(routines);
  const rs = Array.isArray(routines) ? routines : [];
  const acum = Object.create(null);
  let dias = 0;
  NUT_WEEK_DAYS.forEach((name, i) => {
    const rut = rs.find(r => r && r.day === name) || null;
    const plan = nutDayPlan(base, nutDayKind(rut), shape.trainDays, shape.legDays, i);
    if (!plan) return;
    dias++;
    plan.meals.forEach(m => {
      (m.items || []).forEach(it => {
        if (it && it.id && it.grams > 0) acum[it.id] = (acum[it.id] || 0) + it.grams;
      });
      // Los acompañantes se COMPRAN igual que el plato: es la misma lección de F7 (si la fruta
      // no entra, la lista manda a la persona al mercado sin la mitad de lo que va a comer).
      (m.acompIds || []).forEach(id => {
        const f = NUT_FOOD_BY_ID[id];
        if (f) acum[id] = (acum[id] || 0) + nutAcompGrams(f);
      });
    });
  });
  if (!dias) return null;
  const grupos = NUT_SHOP_GROUPS.map(([rol, name]) => ({
    rol, name,
    items: Object.keys(acum)
      .filter(id => NUT_FOOD_BY_ID[id] && NUT_FOOD_BY_ID[id].rol === rol)
      .map(id => Object.assign({ id, name: NUT_FOOD_BY_ID[id].name, rol }, nutShopQty(NUT_FOOD_BY_ID[id], acum[id])))
      .sort((a, b) => b.grams - a.grams || a.name.localeCompare(b.name)),
  })).filter(g => g.items.length);
  const items = grupos.reduce((a, g) => a + g.items.length, 0);
  // `nota` viaja CON la lista para que las dos superficies pinten la misma, sin poder elegir.
  return { dias, grupos, items, nota: NUT_SHOP_NOTA };
}
// El mismo contenido en texto plano, para mandarlo por WhatsApp o pegarlo donde sea. Pura:
// recibe la lista ya armada, NO la vuelve a calcular (o serían dos verdades a un toque).
function nutShoppingText(lista, nombre) {
  if (!lista || !lista.grupos || !lista.grupos.length) return '';
  const l = ['🛒 Mi lista del mercado' + (nombre ? ' — ' + nombre : ''), 'Para ' + lista.dias + ' días de plan', ''];
  lista.grupos.forEach(g => {
    l.push(g.name.toUpperCase());
    g.items.forEach(i => l.push('• ' + i.name + ': ' + i.text + (i.sub ? ' (' + i.sub + ')' : '')));
    l.push('');
  });
  l.push(lista.nota || NUT_SHOP_NOTA);
  return l.join('\n').trim();
}

// nutDayNote: la línea que explica por qué HOY el número no es el de la semana. Sin esto, las dos
// pantallas se contradicen a la vista aunque por dentro estén bien. Pura; devuelve '' si no hay
// nada que explicar (el día que coincide con la base no necesita disculpa).
function nutDayNote(kind, dayKcal, baseKcal) {
  const d = Math.round(parseFloat(dayKcal) || 0);
  const b = Math.round(parseFloat(baseKcal) || 0);
  if (!d || !b) return '';
  const dif = d - b;
  if (Math.abs(dif) < 25) return ''; // ruido de redondeo: no vale la pena explicarlo
  const cuanto = Math.abs(dif) + ' kcal';
  if (kind === 'pierna') return 'Hoy entrenas pierna, así que llevas ' + cuanto + ' más de carbohidrato. En la semana comes lo mismo.';
  if (kind === 'entreno') return dif > 0
    ? 'Hoy entrenas, así que llevas ' + cuanto + ' más de carbohidrato. En la semana comes lo mismo.'
    : 'Hoy llevas ' + cuanto + ' menos que tu promedio: el carbohidrato se corre a los días de pierna. En la semana comes lo mismo.';
  return 'Hoy descansas, así que llevas ' + cuanto + ' menos de carbohidrato. En la semana comes lo mismo.';
}

// Cuenta los días del plan y cuántos son de pierna/full body — lo que `nutDayTarget`
// necesita para repartir el carbohidrato SIN cambiar el total de la semana.
function nutWeekShape(routines) {
  const rs = Array.isArray(routines) ? routines.filter(r => r && (r.exercises || []).length) : [];
  let leg = 0;
  rs.forEach(r => { if (nutDayKind(r) === 'pierna') leg++; });
  return { trainDays: rs.length || 3, legDays: leg };
}

// ── LA REVISIÓN PARA EL COACH ───────────────────────────────────────────
// «AVI propone, el coach aprueba» (decisión del PO 2026-08-01, mismo candado que el
// plan de choque): esto NO cambia nada, sólo dice qué tan lejos está el plan que la
// persona tiene hoy de lo que su cuerpo necesita. El coach decide.
// Devuelve null si no hay con qué comparar — jamás una alarma sin sustento.
const NUT_REVIEW_MIN_GAP = 300;   // kcal de diferencia para que valga la pena avisar
function nutPlanReview(client, currentPlan, weightKg) {
  const base = nutritionEstimate(client, weightKg);
  if (!base || !base.kcalObj) {
    // Sin peso/talla/edad/sexo no se puede opinar: se pide el dato, no se inventa el plan.
    return { status: 'sin_datos', falta: ['peso', 'estatura', 'edad', 'sexo'].filter(k => {
      if (k === 'peso') return !(parseFloat(weightKg != null && weightKg !== '' ? weightKg : (client || {}).weight) > 0);
      if (k === 'estatura') return !((client || {}).height > 0);
      if (k === 'edad') return !((client || {}).age > 0);
      return (client || {}).sex !== 'M' && (client || {}).sex !== 'F';
    }) };
  }
  const actual = parseFloat(currentPlan && currentPlan.kcal);
  if (!actual) return { status: 'sin_plan', sugerido: base.kcalObj, base };
  // 🔴 UN PLAN PUEDE ESTAR NUMÉRICAMENTE PERFECTO Y AUN ASÍ MENTIR SOBRE SÍ MISMO, y hasta hoy
  // este revisor solo sabía mirar números. Medido el 15-ago sobre los 10 planes escritos: Luz
  // (objetivo «Perder grasa») tiene desfase **0** —su déficit es exactamente el que le toca— pero
  // su plan quedó rotulado `mantenimiento` de una plantilla vieja, así que su app le explica
  // «estás comiendo en balance: lo que gastas» mientras baja de peso a propósito. Igual Kathe, e
  // igual Samuel al revés (gana músculo leyendo «balance»). Son 3 de 10 y **ninguno disparaba
  // ningún aviso**: el único detector vivía dentro del editor de nutrición, así que solo existía
  // si el coach reabría a esa persona. Detectar en el editor y callar sobre lo guardado deja vivos
  // exactamente los casos que ya estaban ahí — el mismo defecto de forma que v485 le cerró a los
  // menores. El rótulo se compara contra lo que de verdad se SIRVE (`nutBaseFor`), no contra el
  // titular escrito, porque desde v485 pueden no ser el mismo número.
  const _srv = (typeof nutBaseFor === 'function') ? nutBaseFor(client, currentPlan, weightKg) : null;
  const _kcalSirve = (_srv && _srv.kcalObj) || actual;
  const rotulo = (typeof nutWhyKey === 'function') ? nutWhyKey(currentPlan, client, weightKg) : null;
  const mismatch = nutGoalMismatch(rotulo, _kcalSirve, base.tdee, client);
  const gap = Math.round(actual - base.kcalObj);
  // La dosis de proteína se mide sobre lo que se SIRVE (`_srv.macros`), no sobre lo escrito: desde
  // v485 pueden no ser el mismo número, y auditar el titular es auditar algo que nadie se come.
  const prot = (_srv && _srv.macros) ? nutProtCheck(client, _srv.macros, weightKg) : null;
  // 🔴 UN UMBRAL DE TOLERANCIA NO SIRVE PARA MEDIR UNA REGLA DURA. `NUT_REVIEW_MIN_GAP` (300 kcal)
  // se derivó midiendo planes de ADULTOS, donde la pregunta es «¿cuánto se desvía?». Para un menor
  // la pregunta es otra: CUALQUIER déficit rompe la regla del dictamen, no es cuestión de grados.
  // Con el umbral de adulto, la menor real (−135 kcal) daba `status:'ok'` y la ficha del coach se
  // quedaba MUDA: el único aviso vivía dentro del editor, así que él podía no enterarse nunca de
  // que la app le subió el plan. Detectar en el editor y callar sobre lo guardado deja vivos justo
  // los casos que ya existían — el mismo defecto que sigue abierto para los adultos. (Sofía, v485.)
  if (isMenor(client) && gap < 0) {
    return { status: 'menor_bajo_gasto', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch, prot };
  }
  // El espejo exacto del de arriba, y por la misma razón: la regla no admite grados, así que no
  // puede vivir debajo del umbral de 300 kcal de los adultos. Si el techo actuó, el coach está
  // escribiendo un número que NO es el que su asesorada come, y tiene que enterarse sin abrirle
  // el editor. `minorCap` viene de la misma función que decide lo que ella ve, no de una cuenta
  // paralela — la lección de v485 sobre los oráculos que calculan por su cuenta.
  if (isMenor(client) && _srv && _srv.minorCap) {
    return { status: 'menor_sobre_techo', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch, prot, sirve: _kcalSirve, cap: _srv.minorCap };
  }
  // 🔴 EL ORDEN CAMBIÓ EN v496, y no por gusto: `rotulo_miente` iba ANTES que `desviado` y su
  // tarjeta afirma «sus números están bien, lo que está mal es la etiqueta». Cuando las DOS cosas
  // fallan a la vez, esa frase es falsa y manda al coach a arreglar lo que no toca. Se destapó
  // simulando el arreglo de un asesorado real: al corregirle el objetivo, su plan quedaba 387 kcal
  // por encima Y con el rótulo cambiado, y la app le decía que las cifras estaban bien.
  // Ahora manda el NÚMERO (que es la palanca grande) y el rótulo VIAJA en el resultado para que la
  // ficha lo diga en una línea de más. El caso de v486 —cifras perfectas, rótulo mentiroso— sigue
  // intacto: ahí el hueco es 0, así que `desviado` no se dispara y gana `rotulo_miente`.
  // 🔒 La decisión se toma sobre lo que se SIRVE, no sobre el titular escrito — el mismo principio
  // que v486 aplicó al rótulo, extendido al número. Con un plan descuadrado (titular 2.200, macros
  // 1.636) el titular dice «+470 sobre lo que le corresponde» y el plato dice «−94»: headlinear el
  // desvío con un número que nadie se come mandaría a corregir lo que no es. De ese caso ya se
  // ocupa, antes que este revisor, la tarjeta de desfase de la ficha.
  // ⚠️ …pero «lo que se sirve» solo EXISTE si el coach escribió los macros: un plan con titular y
  // nada más lo resuelve la estimación, y entonces el número que hay que juzgar es el que él
  // escribió. Sin esta rama, un plan de «2.400 kcal» a secas se comparaba consigo mismo y daba 0.
  const _conMacros = !!(_srv && _srv.origen === 'coach');
  const gapSirve = _conMacros ? Math.round(_kcalSirve - base.kcalObj) : gap;
  if (Math.abs(gapSirve) >= NUT_REVIEW_MIN_GAP) {
    // Qué significa la desviación PARA SU OBJETIVO — es lo que le importa al coach.
    const g = _norm((client || {}).goal || '');
    let riesgo = null;
    if (gapSirve > 0 && (g.includes('perd') || g.includes('grasa') || g.includes('defin'))) riesgo = 'come_de_mas_para_bajar';
    else if (gapSirve < 0 && (g.includes('gan') || g.includes('musc') || g.includes('masa'))) riesgo = 'come_de_menos_para_subir';
    return { status: 'desviado', gap: gapSirve, actual: _conMacros ? _kcalSirve : actual, sugerido: base.kcalObj, riesgo, base, rotulo, mismatch, prot, sirve: _kcalSirve };
  }
  // El número puede estar bien y el RÓTULO mentir: es un defecto propio, con su propio estado.
  if (mismatch) return { status: 'rotulo_miente', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch, prot, sirve: _kcalSirve };
  // 🔴 Y LA PROTEÍNA, que hasta v496 no miraba NADIE. El revisor juzgaba calorías y rótulo, así que
  // decía «ok» a 4 de los 10 planes escritos que están entre 25 y 37 g POR DEBAJO de la doctrina y
  // a uno que está 26 g POR ENCIMA del techo de 2,2 g/kg. Es el punto 1 del dictamen de Andrés Hyp
  // del 2026-08-05, y su nota lo dice entero: «todas mujeres, todas en Perder grasa o Recomposición,
  // que es el cubo donde la proteína alta importa MÁS; mientras eso no entre, cada plan nuevo que se
  // escriba va a nacer con la misma brecha».
  if (prot && prot.dir) return { status: 'proteina_fuera', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch, prot, sirve: _kcalSirve };
  return { status: 'ok', gap, actual, sugerido: base.kcalObj, base, rotulo, mismatch, prot };
}

// ── ¿LA PROTEÍNA DEL PLAN ESTÁ EN SU DOSIS? ─────────────────────────────────────────────
// Se juzga en **g por kg de peso de REFERENCIA**, que es el idioma del dictamen y el único que no
// se descuadra con la grasa corporal (dosificar sobre el peso de báscula es lo que v428 arregló).
// La tolerancia (±0,3 g/kg) NO se eligió a ojo: se derivó de los VEREDICTOS de Andrés sobre los 10
// planes escritos, midiendo el 2026-08-18. Él marcó a Claudia (−0,56), Kathe (−0,47), Natalia
// (−0,41) y Luz (−0,40) como cortas y a Miguel (+0,37) como pasado del techo; y dio por buenos a
// Nataly (−0,20), Samuel (+0,06) y Astrid (−0,01). **±0,3 es el único corte que reproduce sus 9
// veredictos**, y tiene aire a los dos lados (el peor aprobado está en 0,20 y el mejor marcado en
// 0,37). Con ±0,25 entraría el plan del propio coach, que él no juzgó.
const NUT_PROT_TOL_G_KG = 0.3;
function nutProtCheck(client, servido, weightKg) {
  if (!client || !servido || !(servido.prot_g > 0)) return null;
  const w = parseFloat(weightKg != null && weightKg !== '' ? weightKg : client.weight);
  if (!(w > 0)) return null;
  const ref = nutRefWeight(w, client.height) || w;
  if (!(ref > 0)) return null;
  const doctrina = nutProtPerKg(client.goal);
  const dosis = servido.prot_g / ref;
  const objetivo = Math.round(ref * doctrina);
  const dif = dosis - doctrina;
  return {
    g: servido.prot_g, objetivo, gramos: servido.prot_g - objetivo,
    dosis: Math.round(dosis * 100) / 100, doctrina,
    dir: Math.abs(dif) < NUT_PROT_TOL_G_KG ? null : (dif < 0 ? 'corta' : 'pasada'),
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

// ── ¿El entreno de hoy llega COLAPSADO? (v447) ────────────────────────────────
// Medido el 2026-08-05: «Hoy» pesaba 4.709 px = 5,6 pantallas de celular, y el entreno era
// el 79% de eso (3.736 px). El PO propuso mudarlo a «Rutinas»; se midió y se descartó — eso
// dejaría a «Hoy» sin acción principal y pondría entrenar a un toque más, justo cuando 8 de 22
// asesorados nunca han completado una sesión. En vez de mudarlo, llega como tarjeta de arranque.
//
// 🔴 EL CANDADO QUE IMPORTA: si hay una sesión EN CURSO, NO se colapsa. Es exactamente el bug
// de v366 (`.trained-card` tapando un entreno a medias) que costó un rechazo de Fable: colapsar
// encima de alguien que va en la serie 3 le esconde su propio entreno y le hace perder el hilo.
// PURA: recibe el estado ya leído; quien lee localStorage es la vista.
function workoutStartCollapsed(o) {
  o = o || {};
  if (o.expanded) return false;      // ya tocó «Empezar» en esta visita
  if (o.hasProgress) return false;   // 🔴 sesión a medias: jamás se colapsa encima
  if (o.isOverride) return false;    // eligió una rutina a mano: la quiere abierta
  if (o.trainAgain) return false;    // pidió «entrenar otra vez»
  return true;
}

// ══════════════════════════════════════════════════════════════════════
// EL HÉROE DE «HOY» — dirección B «El Compromiso» (v503)
// ──────────────────────────────────────────────────────────────────────
// El PO eligió B viendo cuatro columnas lado a lado: el entreno del día ocupa la primera
// pantalla entera y el resto del día cede. Lo que la hizo elegible fue una medición: en «Hoy»
// salen hasta 6 tarjetas a la vez, y le caen a las 8 asesoradas que MÁS entrenan.
// Aquí vive SOLO el modelo (qué dice el héroe); el pintado y el `esc()` viven en app-4.
//
// 🔴 La maqueta se dibujó con una rutina de 4 ejercicios y un nombre de 15 letras. Los datos
// reales del 19-ago dicen otra cosa: de 93 rutinas, la moda son 6 ejercicios (39), 35 tienen
// 7 o más (una tiene 14) y el nombre más largo son 40 caracteres («Tren Superior — Espalda,
// Pecho y Hombros»). Por eso el título se escala por longitud y la lista tiene tope: un héroe
// que no cabe en la pantalla deja de ser una promesa y vuelve a ser un muro.

// ══════════════════════════════════════════════════════════════════════
// EL TOPE DE TARJETAS DE «HOY» — dirección B «El Compromiso» (v505)
// ──────────────────────────────────────────────────────────────────────
// La regla que NO existía. `_todayOrder` ordena los bloques y el modo día 1 apaga once de
// golpe, pero en un día normal nada limita CUÁNTAS salen a la vez. Medido sobre los 22
// asesorados reales (20-ago, con el historial recortado a la fecha): máximo **6 tarjetas
// simultáneas**, mediana 5 — y les caen a las que MÁS entrenan, no a las que no usan la app.
// Encima, tres de ellas viven en `localStorage` y no se pueden medir desde la nube
// (aviso de push, novedades, puerta a Comunidad): solo SUMAN. Así que 6 es el piso de lo peor.
//
// 🔴 EL TOPE NO BORRA NADA. Lo que no cabe hoy NO se silencia ni se marca como visto: se
// aparta detrás de una fila de una línea («+2 avisos») que la abre en el sitio. Silenciar por
// falta de espacio sería decidir por la persona, y una tarjeta que nunca gana su turno es una
// feature muerta que nadie sabe que existe.
//
// El orden es de VALOR, no de antigüedad: primero lo que cambia lo que hace hoy, después lo
// que le dice algo sobre ella, y de últimas lo que le pedimos nosotros.
const TODAY_CARD_PRIORITY = [
  'cn-deload',        // 1. la semana de descarga cambia CÓMO entrena hoy
  'cn-missday',       // 2. recuperar un día de ESTA semana: acción concreta sobre su plan
  'cn-coach-card',    // 3. alguien pendiente de ella (récord, racha, inactividad)
  'cn-push-nudge',    // 4. sin permiso de notificaciones no la podemos alcanzar (15 de 16 lo están)
  'cn-today-upsell',  // 5. pedir coach (solo tier libre)
  'cn-news',          // 6. novedades de la app
  'cn-cmty-nudge',    // 7. la puerta a Comunidad
  'cn-share',         // 8. invitar a alguien
];
// 🔴 NUNCA entran al tope: el entreno y su cabecera (son la pantalla), la portada del día 1
// (que ya apaga todo lo demás por su cuenta) y las HERRAMIENTAS del día —la tira de hábitos,
// el plan de comida y los entrenamientos rápidos—, que no piden atención: esperan a que se las
// busque. Toparlas sería esconderle su propio registro, no quitarle ruido.
// LA CURVA, medida el 20-ago sobre el peor caso realista (el perfil de las 4 personas que hoy
// llegan a 6 tarjetas), alto de «Hoy» a 390×844 — `scripts/e2e/_verify-tope.mjs` la vuelve a
// imprimir en cada corrida, así que se re-mide, no se hereda:
//     sin tope → 1.526 px (2,1 pantallas) · 4 mensajes
//     tope 3   → 1.501 px (2,1)           · 3
//     tope 2   → 1.355 px (1,9)           · 2   ← elegido
//     tope 1   → 1.189 px (1,6)           · 1
//     tope 0   →   998 px (1,4)           · 0
// 🔴 NO hay codo en la curva: cada aviso cuesta 150-190 px, parejo. Así que el número NO lo
// eligió el dato — lo elige el criterio de producto, y el dato dice lo que cuesta cambiarlo:
// el héroe ya pide UNA cosa (entrenar), y dos avisos más es lo máximo que cabe en la pantalla
// sin obligar a la persona a decidir cuál de cinco atiende. Moverlo es una línea y el PO tiene
// la cuenta al lado.
const TODAY_MAX_CARDS = 2;
function todayCardPlan(presentes, opts) {
  opts = opts || {};
  const max = (opts.max === undefined) ? TODAY_MAX_CARDS : Math.max(0, parseInt(opts.max) || 0);
  const hay = new Set(presentes || []);
  // El orden de salida es el de PRIORIDAD, no el que traiga quien llame: dos pantallas con la
  // misma gente tienen que decidir igual.
  const orden = TODAY_CARD_PRIORITY.filter(id => hay.has(id));
  // Lo que llegue sin puesto en la lista se respeta y NO se topa: preferimos que salga una
  // tarjeta nueva de más a que desaparezca en silencio por habérsenos olvidado prioritizarla.
  const sinRango = (presentes || []).filter(id => TODAY_CARD_PRIORITY.indexOf(id) === -1);
  return {
    visibles: orden.slice(0, max).concat(sinRango),
    ocultas: orden.slice(max),
  };
}

// Config del HIIT de un ejercicio (trabajo/descanso en segundos) y segundos de un isométrico.
// Viven aquí —y no en app-4, donde nacieron— porque `exDoseShort` los necesita y la regla no
// puede tener dos fuentes: la dosis del héroe y la del entreno deben decir lo MISMO.
function hiitCfg(ex) { const c = (ex && ex.hiit) || {}; return { work: parseInt(c.work) || 30, rest: parseInt(c.rest) || 15 }; }
function holdSecsOf(ex) { ex = ex || {}; return parseInt(ex.holdSecs) || parseInt(ex.reps) || 60; }

// Dosis COMPACTA de un ejercicio, para la columna derecha del héroe. PURA.
// 🔴 Clase de bug ya conocida (Camilo, 2026-06-29): pintar «S×R» para todo le decía «1×20
// series × reps» a un cardio de 20 minutos. Cada modalidad se dice en su unidad o no se dice.
function exDoseShort(ex) {
  ex = ex || {};
  const t = exTrack(ex);
  const sets = Math.max(0, parseInt(ex.sets) || 0);
  if (t === 'cardio') { const m = parseInt(ex.reps) || 0; return m > 0 ? m + ' min' : ''; }
  if (t === 'hiit') return sets > 0 ? sets + ' ronda' + (sets === 1 ? '' : 's') : '';
  if (t === 'tiempo') return sets > 0 ? sets + ' × ' + holdSecsOf(ex) + 's' : holdSecsOf(ex) + 's';
  const reps = String(ex.reps == null ? '' : ex.reps).trim();
  if (!sets) return reps;
  return reps ? sets + ' × ' + reps : String(sets);
}

// Tamaño del titular según lo LARGO que sea el nombre de la rutina. El 34 px de la maqueta solo
// funciona con nombres cortos; a 40 caracteres son cuatro líneas y el héroe se come la pantalla.
const HERO_TITLE_SIZES = ['xl', 'lg', 'md'];
function heroTitleSize(name) {
  const n = String(name == null ? '' : name).trim().length;
  if (n <= 18) return 'xl';   // «Pierna y glúteo» — 34 px
  if (n <= 30) return 'lg';   // 28 px
  return 'md';                // 24 px — a 40 caracteres caben en dos líneas a 360 px
}

// Cuántos ejercicios se listan como máximo. Si sobran, la última fila los resume («y 3 más»):
// nunca se listan MÁS de HERO_MAX_LINES filas, pero tampoco se esconde que existen.
const HERO_MAX_LINES = 6;
function todayHeroModel(routine, opts) {
  opts = opts || {};
  const exs = ((routine && routine.exercises) || []).filter(Boolean);
  if (!exs.length) return null;   // rutina vacía → no hay promesa que hacer; la vista degrada sola
  const max = Math.max(2, parseInt(opts.max) || HERO_MAX_LINES);
  const show = exs.length <= max ? exs.length : max - 1;
  const mins = estimateWorkoutMinutes(routine);
  return {
    name: String((routine && routine.name) || '').trim() || 'Entrenamiento',
    size: heroTitleSize((routine && routine.name) || ''),
    count: exs.length,
    mins: mins,
    // Solo se promete «menos de una hora» cuando el motor dice que es verdad. Sin estimación
    // fiable no se inventa: la frase que se rompe el primer día no se recupera después.
    underHour: mins != null && mins < 60,
    lines: exs.slice(0, show).map((e, i) => ({
      n: String(i + 1).padStart(2, '0'),
      name: String((e && e.name) || '').trim() || 'Ejercicio',
      dose: exDoseShort(e),
    })),
    rest: exs.length - show,
  };
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
// ══════════════════════════════════════════════════════════════════════
// DETECTOR DE ESTANCAMIENTO (v433) — ver docs/plan-estancamiento-descarga.md
// ──────────────────────────────────────────────────────────────────────
// El detector viejo miraba SOLO `p.maxKg`, con una ventana de 4 PUNTOS y `recent <= prior`.
// Consecuencias medidas sobre los datos reales (2026-08-04): marcaba 41 ejercicios en 6 personas
// y disparaba 4 semanas de descarga. **Castigaba terminar bien una progresión**: Astrid subió el
// hip thrust 90→100 kg y lo consolidó, su récord quedó DENTRO de la ventana `prior` y la app le
// dijo «se estancó»; Nataly subió de 40 a 57 repeticiones con 80 kg fijos y también.
// Lo nuevo, con los criterios de Andrés Hyp:
//   · índice de rendimiento = Epley con TOPE de 20 reps (las repeticiones cuentan)
//   · ventana ELÁSTICA: dura ≥5-6 semanas Y contiene ≥6 puntos, lo que resulte más largo
//   · la referencia es lo de ANTES de la ventana (un récord reciente ya no condena)
//   · compuertas: principiante <12 semanas entrenando JAMÁS; <8 semanas de datos no se evalúa
const PERF_CLAMP_REPS = 20;          // tope de reps del índice: 30 reps de calentamiento no son un récord
const STALL_WIN_WEEKS = 5;           // ventana mínima; el principiante lleva una más (abajo)
const STALL_WIN_WEEKS_BEGINNER = 6;
const STALL_MIN_POINTS = 6;          // sesiones del ejercicio DENTRO de la ventana (Andrés)
const STALL_MIN_BEFORE = 1;          // puntos ANTES de la ventana que hacen de referencia
const STALL_MIN_DATA_WEEKS = 8;      // semanas de historial en AVI para siquiera evaluar
const STALL_BEGINNER_MIN_WEEKS = 12; // principiante con menos que esto: nunca estancado
const STALL_DELOAD_REGRESSION = 0.05; // caída del índice que cuenta como REGRESIÓN (no meseta)

// perfIndex: índice de rendimiento de una serie. Epley (`kg·(1+reps/30)`) con las reps topadas.
// ⚠️ NO se reusa `estimate1RM`: devuelve null con reps>15, justo el caso de quien progresa
// subiendo repeticiones — que es como progresa una principiante (aviso de Andrés).
function perfIndex(kg, reps) {
  kg = parseFloat(kg); reps = parseInt(reps);
  if (!(kg > 0) || !(reps >= 1)) return null;
  return kg * (1 + Math.min(reps, PERF_CLAMP_REPS) / 30);
}

// exercisePerfSeries: una serie de puntos {t, day, perf, kg} por ejercicio de CARGA (peso_reps).
// El punto de un día es el MEJOR índice de sus series hechas. Pura; recibe el historial tal como
// se guarda (nuevo→viejo) y devuelve cada serie ordenada viejo→nuevo.
function exercisePerfSeries(history) {
  const map = {};
  const sessions = (history || []).slice().reverse();
  sessions.forEach(s => {
    const t = new Date(s && s.date).getTime();
    if (isNaN(t)) return;
    const day = new Date(t).setHours(0, 0, 0, 0);
    (s.exercises || []).forEach(ex => {
      if ((ex.track || 'peso_reps') !== 'peso_reps') return;
      let best = null, bestKg = 0;
      (ex.sets || []).forEach(st => {
        if (!st || !st.done) return;
        const v = perfIndex(st.kg, st.reps);
        if (v != null && (best == null || v > best)) best = v;
        const k = parseFloat(st.kg);
        if (k > bestKg) bestKg = k;
      });
      if (best == null) return;
      const m = (map[ex.name] = map[ex.name] || { name: ex.name, muscle: ex.muscle, icon: ex.icon || '💪', points: [] });
      const prev = m.points.find(p => p.day === day);
      if (prev) { prev.perf = Math.max(prev.perf, best); prev.kg = Math.max(prev.kg, bestKg); }
      else m.points.push({ t, day, perf: best, kg: bestKg });
    });
  });
  return Object.keys(map).map(k => map[k]);
}

// stallGateReason: por qué NO se puede evaluar a esta persona, o '' si sí se puede. Puro.
function stallGateReason(client, sessions, now) {
  // Sin perfil no se sabe el NIVEL, y sin nivel no se puede aplicar la compuerta que protege a la
  // principiante en adaptación. Callar es la única respuesta segura: decirle «te estancaste» a
  // quien lleva tres semanas entrenando es el daño que este detector existe para evitar.
  if (!client) return 'sin perfil';
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const ts = (sessions || []).map(s => new Date(s && s.date).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b);
  if (!ts.length) return 'sin sesiones';
  // Antigüedad: startDate si la hay, si no la primera sesión. `raw == null` ANTES de new Date()
  // (gotcha: new Date(null) es EPOCH, no Invalid Date).
  const raw = client.startDate;
  const sd = (raw == null || raw === '') ? NaN : new Date(raw).getTime();
  const desde = isNaN(sd) ? ts[0] : sd;
  const semEntrenando = (nowTs - desde) / (7 * 86400000);
  const esPrincipiante = !/avanz|interm/i.test(client.level || '');
  if (esPrincipiante && semEntrenando < STALL_BEGINNER_MIN_WEEKS) return 'principiante en adaptación';
  if ((nowTs - ts[0]) / (7 * 86400000) < STALL_MIN_DATA_WEEKS) return 'pocas semanas de datos';
  return '';
}

// stallReport(client, sessions, now) → PURA. El veredicto por ejercicio de carga:
//   { evaluable:bool, reason:'', items:[{name,muscle,icon,stalled,delta,before,after,sessions,weeks}] }
// `delta` = variación relativa del índice (negativa = regresión). `items` solo trae los ejercicios
// que SE PUDIERON evaluar; el orden es determinista (el poll de 15 s del coach no debe saltar).
function stallReport(client, sessions, now) {
  const reason = stallGateReason(client, sessions, now);
  if (reason) return { evaluable: false, reason, items: [] };
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const esPrincipiante = !/avanz|interm/i.test((client || {}).level || '');
  const winMs = (esPrincipiante ? STALL_WIN_WEEKS_BEGINNER : STALL_WIN_WEEKS) * 7 * 86400000;
  const items = [];
  exercisePerfSeries(sessions).forEach(e => {
    const pts = e.points.slice().sort((a, b) => a.t - b.t);
    if (pts.length < STALL_MIN_POINTS + STALL_MIN_BEFORE) return;
    // La ventana dura AL MENOS `winMs` y contiene AL MENOS STALL_MIN_POINTS puntos: se toma el
    // corte más ANTIGUO de los dos. Con ventana fija de 5 semanas, un ejercicio que solo sale
    // 1 vez por semana nunca junta 6 puntos y quedaría invisible para siempre (medido: 31 de 41
    // se salvaban por ahí, no por haber mejorado).
    const cut = Math.min(nowTs - winMs, pts[pts.length - STALL_MIN_POINTS].t);
    const dentro = pts.filter(p => p.t >= cut);
    const antes = pts.filter(p => p.t < cut);
    if (antes.length < STALL_MIN_BEFORE) return;
    const before = Math.max.apply(null, antes.map(p => p.perf));
    const after = Math.max.apply(null, dentro.map(p => p.perf));
    if (!(before > 0)) return;
    items.push({
      name: e.name, muscle: e.muscle || '', icon: e.icon,
      stalled: after <= before, delta: after / before - 1,
      before, after, sessions: dentro.length, weeks: (nowTs - cut) / (7 * 86400000),
    });
  });
  items.sort((a, b) => (a.delta - b.delta) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { evaluable: true, reason: '', items };
}

// stalledExercises(client, sessions, now) → solo los estancados, el más plantado primero. Puro.
function stalledExercises(client, sessions, now) {
  return stallReport(client, sessions, now).items.filter(x => x.stalled);
}
// _insStallOf: el ejercicio de carga MÁS plantado, o null. Predicado compartido por el pulso del
// coach y el plan de choque (la asesorada ya no recibe este aviso — decisión del PO 2026-08-04).
function _insStallOf(sessions, client, now) {
  return stalledExercises(client, sessions, now)[0] || null;
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

  // Candidatos en ORDEN de prioridad (v353; el «estancado» salió en v433):
  //   inactivo > deload > récord > racha > adaptación > peso > agua.
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
  // v433: pasa por los MISMOS pisos que la descarga del coach. Si no, la app le decía a alguien con
  // dos meses entrenando «pídele una semana suave a tu coach» mientras la herramienta del coach se
  // negaba a proponérsela — las dos descargas tienen que hablar el mismo idioma.
  const ws = weekStreak(sessions, planDays(client), nowTs);
  if (!isFree && ws.weeks >= INSIGHT_DELOAD_WEEKS && !deloadFloorReason(client, sessions, nowTs)) {
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

  // 5) ⛔ EL ESTANCAMIENTO YA NO SE LE MUESTRA A LA ASESORADA (v433, decisión del PO 2026-08-04).
  //    Era la tarjeta «X se estancó un poquito» + «Hablar con mi coach». Valery pidió las dos cosas:
  //    a ella NUNCA la palabra «estancada», y fuera ese CTA — le anuncia un problema que no puede
  //    resolver sola y la manda a pedirle explicaciones a su coach. El detector NO se borra: el
  //    aviso es ahora SOLO del coach (`coachPulse` + la tarjeta de choque de la ficha), y siempre
  //    con la acción concreta. Ella se entera cuando él le escribe o le cambia la rutina.

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
      const stall = _insStallOf(sessions, c, nowTs);
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
const SHOCK_GLOBAL_MIN = 3;         // ≥3 ejercicios EN REGRESIÓN a la vez = fatiga sistémica → descarga global
const SHOCK_MULTI_MAX = 2;          // secciones por-ejercicio que muestra la tarjeta (el resto vuelve luego)
const SHOCK_GLOBAL_MUTE_DAYS = 7;   // re-chequear antes que los 21d: si está fundido, una semana después hay que volver a mirar
// «3+ estancados = descarga» SOLO vale si viene entrenando parejo (fatiga de tanto exigir). Si se
// estancó por FALTAS (poca frecuencia / huecos por trabajo), una descarga es el consejo equivocado
// —ya entrena poco— y toca RECUPERAR EL RITMO. Los separa la constancia reciente (decisión de
// Camilo con el caso real de Astrid, 2026-07-16). Ver [[avi-coach-inteligente-plan]].
const SHOCK_CONSISTENCY_DAYS = 28;       // ventana para medir la constancia reciente
const SHOCK_CONSISTENCY_MIN_RATIO = 0.8; // fracción del plan (días/sem) para llamarla "constante"
// (v433: sube de 0,7 a 0,8 — criterio de Andrés Hyp para la descarga)
// Pisos de ANTIGÜEDAD de la descarga (Andrés). Una semana de descarga es una herramienta de
// periodización para quien lleva meses acumulando fatiga; a quien lleva 8 semanas entrenando no le
// sobra volumen, le falta. DECISIÓN DEL PO (2026-08-04): van tal cual, con su consecuencia medida
// —hoy NADIE del gimnasio califica— porque el coach puede generar una descarga a mano cuando quiera.
const DELOAD_MIN_TRAINING_DAYS = 180;
const DELOAD_MIN_DATA_WEEKS = 10;
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
// Mapa dictado por Laura (adenda 2026-08-08 §2). Una zona puede apuntar a DOS reglas.
// 🔒 `pecho`, `codo`, `muñeca o mano` y `otra zona` NO tienen regla, y NO se les inventa una:
//  · pecho — excluirlo borraría todo el patrón de empuje, y el dolor torácico que de verdad
//    importa lo cubre la bandera roja de urgencias, no un filtro de ejercicios. Un filtro aquí
//    daría falsa seguridad sobre lo único que no la admite.
//  · codo y muñeca — son de CARGA y AGARRE, no de patrón: la misma dominada duele o no según el
//    agarre, y el agarre no está en el nombre. Un regex acertaría por azar.
//  · otra zona — por definición no sabemos qué es, y filtrar sobre lo desconocido es inventar.
// En esos casos la app hace todo lo demás (aviso al coach, consejo, bloqueo del ejercicio
// reportado) pero NO excluye por zona **y no dice que lo hizo** — mismo criterio y mismas palabras
// que `parseLimitations` con una limitación sin zona.
const _PAIN_ZONE_TO_EXCL = {
  'cuello': 'cuello',
  'hombro': 'hombro',
  'espalda alta': 'cuello',            // comparten trapecio, escápula y lo que va sobre la cabeza
  'zona lumbar': 'lumbar',
  'cadera o ingle': ['aductor', 'abductor'],  // 🔒 las DOS: sin exploración no se separa una ingle de un trocánter
  'muslo por delante': 'rodilla',      // cuádriceps y rodilla comparten el aparato extensor
  'muslo por detrás': 'lumbar',        // 🔒 isquios + lumbar son una cadena, y «detrás del muslo» es
                                       //    lo más parecido a una ciática que escribe alguien sin formación
  'muslo por dentro (aductores)': 'aductor',
  'cara externa del muslo o glúteo (abductores)': 'abductor',
  'rodilla': 'rodilla',
  'pantorrilla': 'tobillo',            // tríceps sural y Aquiles son la misma unidad
  'tobillo o pie': 'tobillo',
};

// shockTargets(sessions, client, now) → PURA. Decide CÓMO atacar cuando hay varios ejercicios
// plantados a la vez (v355 Fase 4.1; gate de constancia v356). Criterio del coach profesional
// (decisión de Camilo): mismo músculo = un problema con dos síntomas → se ataca UNO primero;
// músculos distintos = recuperación independiente → en paralelo; 3+ = fatiga sistémica → descarga
// global… PERO solo si viene entrenando parejo — si se estancó por FALTAS, toca recuperar el ritmo,
// no bajar aún más el volumen. Devuelve:
//   null                                              → 0 estancados
//   { mode:'global', count, names }                   → ≥SHOCK_GLOBAL_MIN en REGRESIÓN y constante → descarga
//   { mode:'rebuild', count, names, cadence }         → ≥SHOCK_GLOBAL_MIN en regresión pero entrenó a saltos
//   { mode:'multi', targets:[{name,muscle,also}] }    → el resto (uno por músculo)
// `client`/`now` hacen falta para las compuertas del detector; sin ellos no hay veredicto.
// v433 — el disparo de DESCARGA cambió: antes bastaban 3 ejercicios PLANTADOS y eso es un conteo
// absoluto que ignora cuántos van subiendo (medido: Astrid tenía 3 planos y 7 mejorando, y la app
// le mandaba una descarga). Ahora pide 3 en REGRESIÓN real (índice cayendo ≥5%), que es lo que
// significa fatiga sistémica — una meseta no lo es (criterio de Andrés Hyp).
// deloadFloorReason: por qué esta persona NO puede recibir una semana de descarga, o '' si puede.
// Pura. Los pisos son de Andrés (antigüedad e historial) y la PARADA por dolor es de Laura, cuyo
// veredicto es vinculante: `shockTargets` era CIEGA AL DOLOR mientras `shockPlan` sí lo miraba —
// justo al revés de como debía ser, porque esta es la que reescribe la rutina.
function deloadFloorReason(client, sessions, now) {
  client = client || {};
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  if (painCareActive(client.painCare, nowTs).length > 0) return 'dolor reciente';
  const ts = (sessions || []).map(s => new Date(s && s.date).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b);
  if (!ts.length) return 'sin sesiones';
  const raw = client.startDate;
  const sd = (raw == null || raw === '') ? NaN : new Date(raw).getTime();
  const desde = isNaN(sd) ? ts[0] : sd;
  if ((nowTs - desde) / 86400000 < DELOAD_MIN_TRAINING_DAYS) return 'lleva poco entrenando';
  if ((nowTs - ts[0]) / (7 * 86400000) < DELOAD_MIN_DATA_WEEKS) return 'poco historial en AVI';
  return '';
}

// ══════════════════════════════════════════════════════════════════════
// LA SEMANA DE DESCARGA (v434) — ver docs/plan-estancamiento-descarga.md §3
// ──────────────────────────────────────────────────────────────────────
// El PO reportó que la descarga «le manda una rutina totalmente distinta»: era cierto — el botón
// vivía DENTRO del generador y marcarlo llamaba a `generarRutinas`, que vuelve a ELEGIR ejercicios.
// Y no se guardaba el plan anterior, así que volver era imposible.
// La descarga deja de ser una rutina nueva y pasa a ser un MODO TEMPORAL de 7 días sobre el plan
// que la persona YA tiene. Lo único que cambia son las SERIES y la carga sugerida:
//   · ejercicios, días y REPETICIONES: intactos  (Laura, vinculante — Andrés lo reconfirmó 14-ago)
//   · series × 0,6 con piso de 2                 (Andrés)
//   · carga × 0,85 SOBRE EL RÉCORD               (Andrés, dictamen 2026-08-14)
//   · 7 días                                     (Andrés · decisión del PO 2026-08-04)
// Medido sobre planes reales: Kathe 91 → 54 series (−41%), Astrid 113 → 64 (−43%).
//
// ── v482: LA DESCARGA NO DESCARGABA LA CARGA (reclamo del PO 13-ago, medido el 14-ago) ──
// Él dijo: «solo le bajas el 10% del peso y eso es prácticamente nada». Tenía razón en el dato y
// midiendo salió peor: el 10% casi nunca llegaba. Dos causas, las dos cerradas aquí:
//   1. El factor multiplica el PESO SUGERIDO, que solo existe donde hay récord guardado y fuera
//      de la fase de adaptación → llegaba a 186 de 544 ejercicios (34%), y a 9 de 21 personas no
//      les tocaba NI UNO. Para esas se dice EN PALABRAS (`deloadLoadHint`).
//   2. El factor caía ENCIMA del escalón de progresión de `suggestFromPR` → la sugerencia «de
//      descarga» quedaba por encima del propio récord en 130 de 148 casos (mediana +6,7%).
//      Ahora la base es el récord SIN escalón (`noProgress`), y el factor se aplica sobre eso.
// 📊 MEDIDO 2026-08-14, ruta `scripts/deload-carga.mjs` sobre 21 asesorados con rutina, 186 casos:
//    con 0,85 la sugerencia queda en mediana −15,0% respecto al récord (peor −25%, más suave −10%),
//    y 0 de 186 se quedan sin bajar. Antes: +6,7% de mediana.
// 🔴 POR QUÉ 0,85 Y NO EL 0,50 QUE PIDIÓ EL PO — dictamen de Andrés Hyp del 14-ago, que él NO
// firma: «bajar al 50%» viene del powerlifting, donde se trabaja al 85-90% del máximo. Medido, la
// mediana de repeticiones de estos planes es 12, o sea ~71% del máximo; ×0,50 deja a la persona en
// 36% pidiéndole 12 repeticiones cuando podría hacer ~54. El taper recorta VOLUMEN 40-60% y
// MANTIENE la intensidad (Bosquet et al., MSSE 2007;39(8):1358-65; Pritchard et al., Strength Cond
// J 2015;37(2):72-83), y lo que retiene la adaptación es la carga, no las series (Bickel et al.,
// MSSE 2011;43(7):1177-87). Recortar las dos a la vez (0,6 × 0,5 = 29% del tonelaje) no está en
// ninguna literatura. ⚠️ Y no hay ECA de semana de descarga en hipertrofia: esto es criterio
// apoyado, no dato. Además NINGUNA descarga ha corrido completa todavía (0 filas, medido 14-ago),
// así que no hay ni un resultado propio con qué calibrar.
// 🔒 El recorte de SERIES se queda como está porque está MEDIDO que no hace daño: de 158 pares
// persona-músculo, 0 caen bajo un tercio de su volumen y solo 4 cruzan hacia abajo las 4 series
// semanales (tríceps y cardio) — `scripts/deload-dosis.mjs`.
const DELOAD_DAYS = 7;
const DELOAD_SETS_FACTOR = 0.6;
const DELOAD_SETS_MIN = 2;
const DELOAD_LOAD_FACTOR = 0.85;
// Piso de Laura para AVISAR al coach cuando la activa a mano (no bloquea: él manda).
const DELOAD_WARN_DAYS = 56;
const DELOAD_WARN_SESSIONS = 12;

// deloadSets: las series de un ejercicio durante la descarga. Puro. Lo que no es un número de
// series se devuelve tal cual (cardio/HIIT traen su propia configuración).
function deloadSets(sets) {
  const n = parseInt(sets);
  if (!(n > 0)) return sets;
  return Math.max(DELOAD_SETS_MIN, Math.round(n * DELOAD_SETS_FACTOR));
}

// startDeload(client, now) → { routines, deload } NUEVOS. PURA: no muta al cliente.
// El snapshot guarda las series originales POR POSICIÓN, con el id y el nombre como testigo: si el
// coach cambia un ejercicio durante la semana, al volver se respeta SU cambio en vez de pisarlo.
function startDeload(client, now) {
  client = client || {};
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const snapshot = {};
  const routines = (client.routines || []).map(r => {
    const entries = [];
    const exercises = (r.exercises || []).map((e, i) => {
      const n = parseInt(e && e.sets);
      if (!(n > 0)) return e;
      entries.push({ i, id: (e.id || ''), name: (e.name || ''), sets: n });
      return Object.assign({}, e, { sets: deloadSets(n) });
    });
    if (entries.length) snapshot[r.id] = entries;
    return Object.assign({}, r, { exercises });
  });
  return {
    routines,
    deload: {
      from: new Date(nowTs).toISOString(),
      until: new Date(nowTs + DELOAD_DAYS * 86400000).toISOString(),
      sets: snapshot,
    },
  };
}

// endDeload(client) → { routines } con las series ORIGINALES devueltas. PURA.
function endDeload(client) {
  client = client || {};
  const snap = (client.deload || {}).sets || {};
  const routines = (client.routines || []).map(r => {
    const entries = snap[r.id];
    if (!Array.isArray(entries) || !entries.length) return r;
    const exercises = (r.exercises || []).slice();
    entries.forEach(en => {
      const e = exercises[en.i];
      if (!e) return;
      // Testigo: si en esa posición ya no está el mismo ejercicio, el coach lo cambió → no se toca.
      if ((e.id || '') !== (en.id || '') || (e.name || '') !== (en.name || '')) return;
      exercises[en.i] = Object.assign({}, e, { sets: en.sets });
    });
    return Object.assign({}, r, { exercises });
  });
  return { routines };
}

// deloadState(client, now) → null si no está en descarga, o el estado. Puro.
// `over` = ya pasaron los 7 días y el coach todavía no la ha cerrado. NO se cierra sola: fue
// decisión del PO (el coach reactiva con un toque). El aviso de `over` existe para que no se olvide.
function deloadState(client, now) {
  const d = (client || {}).deload;
  if (!d || !d.until) return null;
  const until = new Date(d.until).getTime();
  if (isNaN(until)) return null;
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const ms = until - nowTs;
  return {
    from: d.from || '',
    until: d.until,
    daysLeft: ms > 0 ? Math.ceil(ms / 86400000) : 0,
    daysOver: ms < 0 ? Math.floor(-ms / 86400000) : 0,
    over: ms <= 0,
  };
}
// deloadSuggestKg(pr, targetReps) → el peso sugerido DURANTE la semana de descarga, o null. Pura.
// Reemplaza a `deloadLoadFactor` (v434-v481), que era un multiplicador aplicado al final por la
// pantalla: eso dejaba la decisión fuera del motor y en cadena con la progresión. Aquí la decisión
// es UNA: en descarga no se progresa, y la referencia es el peso que la persona YA levanta.
function deloadSuggestKg(pr, targetReps) {
  const base = suggestFromPR(pr, targetReps);
  if (!base) return null;
  const rec = parseFloat(pr.val != null ? pr.val : pr.kg);
  // 🔒 TOPE — la descarga jamás parte de un peso por encima del que la persona YA levantó. Cubre
  // los dos caminos por los que la sugerencia se iba para arriba: la doble progresión (récord +
  // escalón, el defecto que reportó el PO) y el redondeo de `suggestLoad` a su rejilla de 2,5 kg
  // en récords muy livianos (récord 2 kg ×1 con un plan de 8 reps → sugería 2,5).
  // 🎓 Aquí hubo TERCER mecanismo —suprimir el escalón con una opción en `suggestFromPR`— y la
  // matriz de sabotaje demostró que era REDUNDANTE: borrarlo dejaba la suite verde porque este
  // tope da el mismo número. Se quitó. Dos arreglos para el mismo efecto son uno que nadie
  // mantiene y un candado que no muerde (precedente: el `maxG` redundante de v471).
  const partida = (rec > 0) ? Math.min(base, rec) : base;
  const kg = Math.round(partida * DELOAD_LOAD_FACTOR * 2) / 2;
  // 🔒 Y el redondeo a medio kilo tampoco puede EMPATAR el récord: con un récord de 1 kg,
  // 1 × 0,85 = 0,85 redondea a 1 y la «descarga» vuelve a no descargar. Este caso el tope de
  // arriba NO lo cubre — por eso son dos y no uno.
  if (rec > 0 && kg >= rec) return Math.max(0.5, Math.round((rec - 0.5) * 2) / 2);
  return kg;
}

// deloadLoadHint(client, history, ex, now) → la frase de carga para un ejercicio de peso al que la
// app NO le puede sugerir un número (sin récord), o null. Pura.
// 🔴 Existe porque el factor solo alcanzaba al 34% de los ejercicios: sin esto, la mitad de la
// descarga es invisible para 9 de 21 personas por más que se baje el número.
// La instrucción va anclada a un OBJETO (la mancuerna de al lado), no a una fracción suelta: quien
// no tiene un número de referencia no puede operar un porcentaje. La comprobación por sensación va
// en cristiano —«que te sobraran unas cinco repeticiones»—, nunca RIR ni RPE (texto de Andrés).
const DELOAD_NO_PR_HINT = 'Esta semana agarra la mancuerna que sigue por debajo de la de siempre. '
  + 'Le acertaste si al terminar la serie sientes que te sobraban unas cinco repeticiones.';
function deloadLoadHint(client, history, ex, now) {
  if (!deloadState(client, now)) return null;
  if (exTrack(ex) !== 'peso_reps') return null;
  // Andrés (14-ago): a quien lleva pocas semanas NO se le habla de bajar carga. Ahí el peso ES la
  // referencia técnica y todavía está armando el patrón del movimiento; «usa menos» es la peor
  // instrucción posible. `_suggestKg` ya se calla con ella — la frase tenía que callarse igual.
  if (isInAdaptation(client, history, now)) return null;
  return DELOAD_NO_PR_HINT;
}

// deloadCardText(client, now) → el texto que ve la ASESORADA, o null. Voz AVI: la descarga es una
// decisión de entrenamiento, no un castigo ni un error de la app — si no se explica, se lee como
// que alguien se equivocó o la están descuidando.
function deloadCardText(client, now) {
  const st = deloadState(client, now);
  if (!st) return null;
  if (st.over) return {
    title: 'Tu semana suave ya terminó',
    msg: 'Descansaste lo que había que descansar. Tu coach te devuelve el plan completo en cuanto lo revise.',
  };
  const d = st.daysLeft;
  // Texto de Andrés (14-ago). «Un poquito menos peso» se cayó con el número: era la descripción de
  // un −10% que además no llegaba. La instrucción va anclada a un objeto y con su comprobación por
  // sensación, para que sirva TAMBIÉN a quien no tiene un peso sugerido en pantalla.
  return {
    title: 'Esta semana bajamos revoluciones',
    msg: 'Baja un poco el peso y quédate ahí: agarra la mancuerna que sigue por debajo de la que usas '
      + 'siempre. Le acertaste si al terminar la serie sientes que te sobraban unas cinco repeticiones. '
      + 'Haces las mismas repeticiones de siempre, solo que sin llegar al límite: es la semana en que el '
      + 'cuerpo termina de armar lo que ya entrenaste. '
      + (d === 1 ? 'Queda un día.' : 'Quedan ' + d + ' días.'),
  };
}

// deloadWarnings(client, sessions, now) → avisos para el COACH al activarla a mano. NO bloquean:
// la decisión es suya. Pero AVI no se calla cuando la descarga no le cuadra a esa persona.
function deloadWarnings(client, sessions, now) {
  client = client || {};
  sessions = sessions || [];
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  const out = [];
  if (painCareActive(client.painCare, nowTs).length > 0) {
    out.push('🤕 Reportó dolor hace poco. Bajarle el volumen no atiende un dolor — revisa su estado primero.');
  }
  const ts = sessions.map(s => new Date(s && s.date).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b);
  const raw = client.startDate;
  const sd = (raw == null || raw === '') ? NaN : new Date(raw).getTime();
  const desde = !isNaN(sd) ? sd : (ts.length ? ts[0] : nowTs);
  const dias = Math.round((nowTs - desde) / 86400000);
  if (dias < DELOAD_WARN_DAYS || ts.length < DELOAD_WARN_SESSIONS) {
    out.push('Lleva ' + Math.max(0, Math.round(dias / 7)) + ' semanas y ' + ts.length +
      ' sesiones. Una descarga baja volumen a quien todavía está construyendo — ¿seguro?');
  }
  return out;
}

// deloadOverdue(clients, now) → los que llevan la descarga vencida, para el Inicio del coach.
// Determinista (el poll de 15 s no debe reordenar): por días vencidos desc, luego nombre.
function deloadOverdue(clients, now) {
  return (clients || [])
    .filter(c => c && !c.suspended)
    .map(c => ({ c, st: deloadState(c, now) }))
    .filter(x => x.st && x.st.over)
    .map(x => ({ id: x.c.id, name: x.c.name || '', daysOver: x.st.daysOver }))
    .sort((a, b) => (b.daysOver - a.daysOver) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function shockTargets(sessions, client, now) {
  const stalled = stalledExercises(client, sessions, now);
  if (!stalled.length) return null;
  const enRegresion = stalled.filter(e => e.delta <= -STALL_DELOAD_REGRESSION);
  if (enRegresion.length >= SHOCK_GLOBAL_MIN && !deloadFloorReason(client, sessions, now)) {
    const names = enRegresion.map(e => e.name);
    if (now != null) {
      const cadence = _recentCadence(sessions, now, SHOCK_CONSISTENCY_DAYS, SHOCK_RETURN_WEEK_DAYS);
      const plan = planDays(client);
      if (cadence < plan * SHOCK_CONSISTENCY_MIN_RATIO) {
        // Se estancó entrenando a saltos → una descarga sería consejo equivocado. Recuperar ritmo.
        // Devuelve la cadencia y el plan para que la tarjeta muestre la evidencia («~1,2 de 3 días»).
        return { mode: 'rebuild', count: enRegresion.length, names, cadence: Math.round(cadence * 10) / 10, plan };
      }
    }
    return { mode: 'global', count: enRegresion.length, names };
  }
  // Por cada músculo gana el ejercicio que MÁS cayó (el más clavado); las hermanas del mismo
  // músculo van en `also` («X también se plantó — destrabemos este primero»).
  // Desempate por nombre asc = determinista (el poll de 15s del coach no debe reordenar).
  const byMuscle = {};
  stalled.forEach(e => { const m = e.muscle || ''; (byMuscle[m] = byMuscle[m] || []).push(e); });
  const targets = Object.keys(byMuscle).map(m => {
    const group = byMuscle[m].slice().sort((a, b) =>
      (a.delta - b.delta) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return { name: group[0].name, muscle: m, also: group.slice(1).map(e => e.name), delta: group[0].delta };
  });
  // La tarjeta muestra como mucho SHOCK_MULTI_MAX secciones: se atiende lo que MÁS cayó y el resto
  // vuelve a salir la próxima vez. Antes esto se cumplía solo (con <3 estancados había ≤2 targets);
  // ahora que la descarga pide REGRESIÓN, el modo multi puede recibir muchos más y hay que topar.
  targets.sort((a, b) => (a.delta - b.delta) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const top = targets.slice(0, SHOCK_MULTI_MAX);
  // Orden estable de las secciones por nombre del ganador (el poll de 15 s no debe reordenarlas).
  top.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { mode: 'multi', targets: top };
}

// shockPlan(client, exName, sessions, lib, now) → null si ESE ejercicio no está estancado, o el plan.
function shockPlan(client, exName, sessions, lib, now) {
  client = client || {};
  lib = lib || [];
  const nowTs = (now != null ? new Date(now) : new Date()).getTime();
  // El veredicto lo da el detector (v433); la GRÁFICA de kg sigue saliendo de computeExerciseProgress,
  // que es de donde el coach lee «se plantó en N kg desde tal fecha».
  if (!stalledExercises(client, sessions, now).some(x => x.name === exName)) return null;
  const e = computeExerciseProgress(sessions || []).find(x => x.name === exName);
  if (!e || !e.points || !e.points.length) return null;

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
  // 🔴 A un MENOR no se le habla de grasa ni de recomposición: cae en la rama neutra. Las dos
  // asesoradas de 15 y 16 años con objetivo «Recomposición» leían cada semana «RECOMPOSICIÓN ·
  // Más fuerte y más definido» encima de sus rutinas, y el de 17 con objetivo de perder grasa,
  // «cada gota cuenta · encender tu metabolismo». Es la misma regla del dictamen que ya rige la
  // nutrición (cero lenguaje de composición corporal en lo que lee una menor), aplicada al texto
  // que la app pinta en su pantalla de entreno. «Ganar músculo» se conserva: habla de entrenar,
  // no de cómo se ve el cuerpo. Andrés dejó la revisión de los textos marcada como pendiente.
  const _g = (client.goal || '').toLowerCase();
  const g = (isMenor(client) && /grasa|perder|baj|adelgaz|recompos/.test(_g)) ? '' : _g;
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
    foodLogBandFor,
    foodLogWeekStates,
    FL_ESTADO_UI,
    foodLogBandCount,
    FOODLOG_BAND,
    appBuildFrom,
    appBuildLabel,
    foodLogWeek,
    foodLogAdherence,
    foodLogActiveDays,
    inferNutGoal,
    nutGoalForClient,
    nutMinorSafeGoal,
    nutWhyKey,
    nutKcalDirection,
    nutGoalMismatch,
    getIccLabel,
    getRctLabel,
    getGoalMsg,
    calcTMB,
    isMenor,
    TMB_MENOR_EDAD,
    calcTDEE,
    tmbFormulaName,
    kcalTargetFor,
    calcMacrosFromKcal,
    NUT_CARB_MIN_G_KG,
    nutKcalFloor,
    nutRefWeight,
    nutProtPerKg,
    lastBodyweightKg,
    nutWeightFor,
    nutritionEstimate,
    NUT_FOODS,
    NUT_FOOD_BY_ID,
    FOOD_PAGE,
    FOOD_KCAL_TOL,
    FOOD_KCAL_TOL_ABS,
    foodNormText,
    foodCatalog,
    foodKcalGap,
    foodKcalSuspect,
    foodSearch,
    EAN_RE,
    FOOD_BC_MAX,
    FOOD_BC_LEN,
    eanNormalize,
    eanCheckDigit,
    eanValid,
    labelPer100,
    barcodeDraft,
    foodFromBarcode,
    fbReviewNotes,
    fbQueueSplit,
    nutDayKind,
    nutDayTarget,
    nutPortionText,
    nutSolveMeal,
    nutPickMenu,
    NUT_MENU_MAX_OVER,
    NUT_MENU_MAX_UNDER,
    NUT_MENU_PROT_UNDER,
    NUT_DAY_W,
    NUT_SOLVE_PASSES,
    NUT_PROT_MIN_SHARE,
    NUT_CARB2_SHARE,
    NUT_CARB2_MIN_UN,
    NUT_MENUS,
    NUT_MEALS_5,
    nutAcompMacros,
    nutAcompGrams,
    nutDayPlan,
    nutShoppingList,
    nutShopQty,
    nutShoppingText,
    NUT_SHOP_NOTA,
    NUT_SHOP_GROUPS,
    nutPlanMealEntries,
    foodLogIsPlanEntry,
    foodLogMarkPlanMeal,
    foodLogUnmarkPlanMeal,
    foodLogPlanMealDone,
    FOODLOG_PLAN_PREFIX,
    nutPlanReview,
    nutProtCheck,
    NUT_PROT_TOL_G_KG,
    nutBaseFor,
    nutMinorFloorBase,
    nutMinorCapBase,
    nutMinorBandBase,
    nutMinorTecho,
    nutMinorBmiOver,
    WHO_BMI_SD1,
    NUT_MENOR_TECHO_MARGEN,
    nutMacroKcal,
    NUT_KCAL_MISMATCH,
    nutWeekShape,
    nutWeekTargets,
    nutDayNote,
    NUT_WEEK_DAYS,
    NUT_REVIEW_MIN_GAP,
    nutMealSplit,
    getSexCode,
    migrateRoutineIds,
    shouldPostPush,
    delClientGuard,
    cnTodayGuard,
    hiitCfg,
    holdSecsOf,
    exDoseShort,
    heroTitleSize,
    HERO_TITLE_SIZES,
    todayHeroModel,
    HERO_MAX_LINES,
    todayCardPlan,
    TODAY_CARD_PRIORITY,
    TODAY_MAX_CARDS,
    generarRutinas,
    GEN_WEEK_DAYS,
    genDayIdxFromDate,
    genWeekDays,
    EX_LEVEL,
    exLevel,
  mcInk,
    mcInkUp,
    inkOn,
    exLevelRank,
    parseLimitations,
    warmupContraindicated,
    warmupWarnZones,
    warmupWarnText,
    WARMUP_ZONE_EXCL_IDS,
    GEN_ZONE_EXCL,
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
    kgOutlier,
    kgConfirmLimit,
    kgNeedsConfirm,
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
    loadStep,
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
    PAIN_SIDES,
    painSidesFor,
    PAIN_LEVELS,
    PAIN_LIMITA,
    PAIN_INICIO,
    PAIN_FLAGS,
    painTriage,
    painStopsSession,
    painCareCorrect,
    painCanCorrect,
    painTipFor,
    painCareAdd,
    painCareActive,
    painZoneKeys,
    limitationsFor,
    exerciseContraindicated,
    correctiveFor,
    correctiveZoneKeys,
    correctiveReview,
    correctivePhases,
    GEN_CORRECTIVE,
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
    SELF_CLIENT_ID,
    isSelfClient,
    selfClientFromRow,
    ownProfileKeys,
    mergeOwnProfile,
    clientIsBillable,
    clientIsContactable,
    splitSelfFromClients,
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
    workoutStartCollapsed,
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
    perfIndex,
    exercisePerfSeries,
    stallGateReason,
    stallReport,
    stalledExercises,
    deloadFloorReason,
    DELOAD_MIN_TRAINING_DAYS,
    DELOAD_MIN_DATA_WEEKS,
    DELOAD_DAYS,
    DELOAD_SETS_FACTOR,
    DELOAD_SETS_MIN,
    DELOAD_LOAD_FACTOR,
    deloadSets,
    startDeload,
    endDeload,
    deloadState,
    deloadSuggestKg,
    deloadLoadHint,
    DELOAD_NO_PR_HINT,
    deloadCardText,
    deloadWarnings,
    deloadOverdue,
    PERF_CLAMP_REPS,
    STALL_WIN_WEEKS,
    STALL_WIN_WEEKS_BEGINNER,
    STALL_MIN_POINTS,
    STALL_MIN_DATA_WEEKS,
    STALL_BEGINNER_MIN_WEEKS,
    STALL_DELOAD_REGRESSION,
    shockTargets,
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
    habitPct,
  };
}
