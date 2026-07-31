# Auditoría: MOTOR DEPORTIVO Y NUTRICIÓN — Coach Pro (Diego Ramírez, NSCA-CSCS)

> Método: **corrí el motor**, no lo leí. `generarRutinas` es pura → la importé en Node con la
> biblioteca real de 220 ejercicios extraída de `app-1-infra.js:1339-1584` y el `env` etiquetado
> con el mismo heurístico que usa la app (`inferExerciseEnv`, aplicado en `app-4-entreno.js:1247`).
> **16.128 planes generados** para el barrido del gate de nivel, **600** para el de volumen/estructura,
> **480 por cada limitación** declarada. Los planes reales de producción los saqué por SELECT.
> Scripts: `scratchpad/gen.js`, `sweep.js`, `gate.js`, `lvl.js`.

---

## ¿La rutina automática es buena?

**No es una paliza. Es un plan seguro, corto y hacible — y anónimo.** Si te espanta no es por
dura: es porque no se parece a un plan hecho para ti. Y con una excepción grave: **a la app
nunca le preguntan si te duele algo.**

Me puse en los zapatos de alguien que se registra un martes. Esto es lo que la app le entregó,
literal, generado ahora:

### Mujer, 29, principiante, 3 días, en casa, perder grasa

```
Lunes — Full Body (6 ej · ~32 min)
  1. Sentadilla con Banda de Resistencia      piernas/Compuesto   3x15
  2. Press de Pecho en el Suelo con Mancuernas pecho/Compuesto    3x15
  3. Remo con Banda                            espalda/Compuesto  3x15
  4. Press de Hombro con Mochila               hombros/Compuesto  3x15
  5. Bird Dog (Perro de Caza)                  core/Bodyweight    3x15
  6. Talones al Glúteo                         cardio/HIIT        3x30

Martes — Full Body 2 (6 ej · ~32 min)
  1. Sentadilla con Banda de Resistencia       ← el mismo
  2. Press de Pecho en el Suelo con Mancuernas ← el mismo
  3. Remo con Banda                            ← el mismo
  4. Press de Hombro con Banda
  5. Plancha en Rodillas
  6. Sprint en el Sitio

Miércoles — Full Body 3 (6 ej · ~28 min)
  1. Sentadilla con Banda de Resistencia       ← el mismo, tercera vez
  2. Press de Pecho en el Suelo con Mancuernas ← el mismo, tercera vez
  3. Remo con Banda                            ← el mismo, tercera vez
  4. Press de Hombro con Mochila
  5. Caminata del Cangrejo
  6. Carrera / Caminata

VOLUMEN SEMANAL: piernas 9 · pecho 9 · espalda 9 · hombros 9 · core 9 · cardio 7
GLÚTEO: 0 series.  BÍCEPS: 0.  TRÍCEPS: 0.
```

**Veredicto de entrenador sobre esto:** la estructura es CORRECTA. Full body 3×/semana para una
principiante es exactamente lo que yo prescribiría; 3×15 sin carga, 60 s de descanso, 30 minutos
— eso es una fase de adaptación anatómica bien entendida y me sorprendió gratamente encontrarla
codificada (`genSchemeFor` + `isInAdaptation`). **No hay overtraining, no hay riesgo, no hay
"20 series de pecho para alguien que nunca entrenó".** La hipótesis de que la rutina automática
espanta *por dura* la doy por **REFUTADA** (ver también H8: el tamaño de sesión no predice el
abandono en los datos reales).

Lo que sí falla es lo otro: **es el mismo entrenamiento tres veces**, no tiene una sola serie de
glúteo —lo primero que busca una mujer que se apunta a entrenar en Colombia— y no hay nada en él
que diga "esto lo armaron para mí". Medido: en los planes de principiante, **el 32,0 % de los
huecos de la semana son un ejercicio ya usado esa semana, y en promedio 1,5 ejercicios aparecen
en TODOS los días** del plan (en los de intermedio: 8,9 % y 0,08). Un principiante no distingue
entre "3 días iguales" y "no tengo plan"; distingue entre "esto es mío" y "esto es genérico".

### El plan REAL de una persona real que nunca entrenó

`diana ramirez` — 18 años, mujer, 92 kg / 164 cm (IMC 34,2), principiante, 3 días, quiere perder
grasa. Se auto-registró. **0 sesiones.** Lo que la app le dejó en el teléfono, tal cual está hoy
en producción:

| Día | Plan |
|---|---|
| Lunes | Step-up a Peso Corporal · Flexiones **en Rodillas** · Patrón de Bisagra · Pike Push-up Inclinado · Dead Bug · Carrera/Caminata |
| Martes | Step-up a Peso Corporal · Flexiones **Inclinadas** · Nadador en Suelo · Toques de Hombro en Plancha · Elevación de Piernas · Marcha en el Sitio |
| Miércoles | Step-up a Peso Corporal · Flexiones **en Pared** · Elevaciones Y-T-W · Superman · Bird Dog · Paso Lateral |

Lo reproduje exacto con el motor de hoy (`place='corporal'`, seed 3). Tres observaciones de
entrenador:

1. **El mismo primer ejercicio los tres días.** Step-up, step-up, step-up.
2. **La progresión de flexiones va AL REVÉS**: rodillas (más difícil) → inclinadas → **pared**
   (la más fácil) el día 3. Eso no es progresión, es el cursor de rotación pasando por el pool.
   Una principiante lee "el miércoles hago algo más fácil que el lunes" y concluye que el plan
   no piensa.
3. **Su perfil hoy dice `place: gym`** y su plan es de peso corporal en casa. La regeneración
   solo se dispara desde el diálogo de edición del coach (`app-3-coach.js:231-234`); si el dato
   cambia por otra vía, el plan queda desalineado y nadie avisa.
4. Cero glúteo. Cero. Para una mujer de 18 años con IMC 34 que quiere perder grasa.

### Hombre, 31, principiante, 4 días, gym, ganar músculo

```
Lun  Sentadilla Goblet · Press de Pecho en Polea · Jalón Neutro · Press Militar en Máquina · Bird Dog
Mar  Sentadilla en Smith · Press en Suelo Mancuernas · Jalón Cerrado · Press Militar en Máquina · Plancha en Rodillas
Mié  Prensa de Pierna · Press Hammer · Remo Sentado · Press Militar en Máquina · Caminata del Cangrejo
Jue  Sentadilla Hack · Press de Pecho en Polea · Jalón en Polea · Press Militar en Máquina · Plancha Frontal
   → 12 series/semana de piernas, pecho, espalda, hombros y core. CERO de bíceps y tríceps.
   → "Press Militar en Máquina" los CUATRO días.
```

Un hombre que se apuntó a "ganar músculo" y no ve un solo curl de bíceps en toda la semana va a
pensar que la app está rota. Técnicamente los compuestos cubren los brazos y para un principiante
eso es defendible; **comercialmente es indefendible**. Y repetir el mismo press de hombro 4 días
seguidos no lo defiende nadie.

### Lo que hace el COACH a mano, para contraste

Camilo asigna 4-5 rutinas de ~6,8 ejercicios, con nombres de sesión propios y ejercicios distintos
por día. **Ninguna de sus rutinas viola el gate de nivel; las 5 violaciones que hay en producción
están todas en rutinas generadas por el motor** (H7). Sus 9 cuentas dan 156 sesiones; las 13
auto-registradas dan 8. La diferencia no la explica la dureza del plan — la explica que el suyo
parece de un entrenador y el otro parece de un formulario.

---

## Hallazgos verificados

### H1 · 🔴 El registro NUNCA pregunta por lesiones — el filtro de seguridad de Laura es código muerto para los 13 auto-registrados

- **Qué pasa:** el wizard de registro tiene 7 pasos (nombre · objetivo · lugar · nivel · días+sexo ·
  edad/peso/talla · cuenta). **Ninguno pregunta por dolor, lesión, cirugía ni limitación.**
  `_provisionFreeClient` escribe `notes:''` a pelo, y `_autoGenerateWeek` aplica el plan con
  `reviewed:true`. Nadie lo revisa nunca.
- **Dónde:** `app-3-coach.js:401-419` (`notes:'', ... _autoGenerateWeek(rec)`) ·
  `app-3-coach.js:271-284` (`routines = res.routines.map(r=>({...r, reviewed:true}))`) ·
  `index.html:178-300` (los 7 pasos del wizard) · `avi-core.js:158-177` (`parseLimitations`).
- **Evidencia:**
  - `grep -c "su-notes\|su-lesion\|su-limit" index.html app-2-login.js` → **0 y 0**.
  - Producción: `select profile->>'notes' from user_data where profile->>'selfReg'='true'` →
    **13 de 13 con `notes` vacío.** El único cliente con limitación declarada
    (`Miguel Pulido`: *"Lesión rodilla derecha operada, con 10 % menos de cartílago y tendón"*)
    lo tiene porque **lo creó el coach a mano**.
  - `parseLimitations('')` → `{detected:false, keys:[], hasExclusions:false, advice:''}` →
    `_genMakeExcluder` no añade ni una regla → `needsReview:false` → el plan sale sin ⚠️ y sin
    banner. El principio rector del propio `docs/auto-generador-rutinas.md` §0 ("el coach SIEMPRE
    revisa y aprueba, innegociable por seguridad") **no se cumple en el camino de auto-registro**.
  - La casilla de consentimiento del paso 7 **sí menciona "lesiones"** entre los datos de salud
    que el usuario autoriza a tratar. Se pide permiso para un dato que jamás se recoge.
- **Intenté tumbarlo así:** (a) busqué un segundo formulario post-registro que preguntara por
  limitaciones — la pantalla "Cuéntanos de ti" existió y **fue eliminada** (`needsProfile:false`,
  comentario "vestigial", `app-3-coach.js:410`); (b) miré si el asesorado puede escribir sus notas
  desde su perfil — `notes` solo se edita desde el modal del coach (`cf-notes`); (c) comprobé si
  el coach ve algún aviso de "este lead no declaró limitaciones" — no existe. Sobrevive.
- **A quién le pasa:** a cualquiera de las 13 personas que se auto-registraron. Si alguna tiene
  una hernia, un menisco o un manguito rotador, recibió sentadillas, peso muerto, prensa y
  crunches sin un solo filtro, sin advertencia y sin que nadie lo mirara.
- **Costo del arreglo:** **un paso más en el wizard** (chips: rodilla / espalda baja / hombro /
  otra / ninguna) → escribir esas palabras en `notes` → el motor de exclusiones YA EXISTE y se
  enciende solo. Media jornada. Complemento de una línea: si `notes` está vacío, marcar
  `needsReview:true` en el auto-registro para que el coach lo vea como pendiente.

---

### H2 · 🔴 Aunque SÍ se declare la lesión, el filtro lumbar no excluye la flexión de columna cargada — y la nota le promete al coach que sí

- **Qué pasa:** con "hernia discal lumbar" declarada, `GEN_ZONE_EXCL.lumbar` solo saca
  `peso muerto | remo con barra | buenos dias | hiperexten | sentadilla`. **No saca ni un
  abdominal.** El hueco de `core` de cada día entrega exactamente lo que está contraindicado en
  una hernia: flexión lumbar repetida y cargada. Y la nota de la rutina dice, textual,
  *"Se excluyeron ejercicios contraindicados y se priorizaron variantes seguras"* — una afirmación
  falsa que baja la guardia del que revisa.
- **Dónde:** `avi-core.js:151-155` (`GEN_ZONE_EXCL`) · `avi-core.js:174` (el texto del `advice`) ·
  `avi-core.js:112-122` (todos los bloques `GEN_DAYS` traen un slot `['core', null, n]`).
- **Evidencia:** 480 planes generados con `notes:'Tengo hernia discal lumbar'` (2 sexos × 3
  niveles × 5 frecuencias × 4 entornos × objetivos). Ejercicios de riesgo entregados:

  | Ejercicio | Veces entregado |
  |---|---|
  | Russian Twist | 68 |
  | Elevación de Piernas Tumbado | 37 |
  | Crunch Abdominal | 11 |
  | Elevación de Piernas Colgado | 10 |
  | Crunch en Polea Alta | 8 |
  | **Total** | **134 entregas en 480 planes** |

  Caso concreto pegado (mujer, 40, intermedia, 3 días, gym, hernia lumbar): el lunes cierra con
  **Crunch en Polea Alta 4×12** y el martes con **Elevación de Piernas Tumbado 4×12**, bajo una
  nota que afirma que se excluyó lo contraindicado.
- **Criterio de Laura (vinculante) y mío:** con protrusión/hernia discal, la flexión lumbar
  repetida bajo carga es **la** contraindicación de manual (literatura de McGill). El core se
  entrena con antiextensión y antirrotación: plancha, plancha lateral, dead bug, bird dog, Press
  Pallof — **y los cinco ya están en el catálogo** (e17, e49, e72, e134, e133). No hay que
  inventar nada, hay que dejar de sacar los otros.
- **Intenté tumbarlo así:** (a) ¿lo tapa el `needsReview`? Sí se marca, pero la propia nota
  desactiva la sospecha al afirmar que ya se filtró — y en auto-registro **no hay revisor**
  (H1); (b) ¿los saca el gate de nivel? No: Russian Twist y Elevación de Piernas Tumbado son
  nivel 'P', son los primeros de la cola para un principiante; (c) ¿los saca el perfil de carga
  alto? No, `GEN_HIIMPACT_RE` es de saltos; (d) ¿el asesorado los ve con una advertencia en la
  ficha del ejercicio? Revisé `desc`/`descSimple` de e62 y e132: no mencionan la espalda baja.
  Sobrevive.
- **A quién le pasa:** a cualquier asesorado con lumbalgia/hernia que el coach dé de alta con la
  nota puesta — y a cualquier auto-registrado con hernia, sin siquiera la nota (H1).
- **Costo del arreglo:** **una línea de regex.**
  `lumbar: /peso muerto|remo con barra|buenos dias|hiperexten|sentadilla|crunch|russian twist|elevacion de piernas|abdominal|sit.?up/`
  Le añadiría además `hombro: /...|elevaciones laterales|press militar|pull.?over/` y
  `rodilla: /...|extension de cuadriceps/` (ver H3-bis abajo). 15 minutos + tests.

**H2-bis · 🟠 el mismo defecto, más leve, en rodilla y hombro.** Mismo barrido, 480 planes cada uno:
- **rodilla/menisco** → `Prensa de Pierna` 67 veces y `Extensión de Cuádriceps en Máquina` 2.
  La prensa a 0-90° es de hecho lo que yo prescribiría (y el propio doc la lista como "preferir"),
  así que ahí **no hay defecto**; la extensión de cuádriceps sí es la clásica a modificar en dolor
  femoropatelar y post-menisco, y pasa el filtro.
- **hombro/manguito** → `Press Militar en Máquina` 54, `Press Militar con Mancuernas` 34,
  `Press de Banca con Mancuernas` 36, `Elevaciones Laterales` (3 variantes) 22, dominadas 20.
  El filtro solo saca "tras nuca / fondos / militar con barra". Con un manguito irritado, el
  press por encima de la cabeza y las elevaciones laterales por encima de 90° son lo primero que
  se modifica. **Nota honesta:** aquí el código hace exactamente lo que dice la tabla del propio
  `coach-pro.md`; el defecto es que esa tabla es demasiado corta, no que el código la traicione.

---

### H3 · 🟠 TODA mujer principiante recibe CERO series de glúteo — el split femenino de Valery nunca se le aplica

- **Qué pasa:** `_genResolveSplit` devuelve `FULL_BODY` para **cualquier** principiante, sin mirar
  el sexo. Y la plantilla `FULL_BODY` tiene 5 huecos: piernas, pecho, espalda, hombros, core.
  **No hay hueco de glúteo.** La diferenciación por sexo (`GEN_SPLITS.F` con `GP_A`/`GP_B`, que
  sí es glúteo-primero y está bien pensada) solo entra a partir de Intermedio.
- **Dónde:** `avi-core.js:677-680` (`_genResolveSplit`) · `avi-core.js:112` (slots de `FULL_BODY`) ·
  `avi-core.js:126-139` (`GEN_SPLITS`).
- **Evidencia:** barrido de 600 planes → **mujer principiante con 0 series de glúteo: 100 de 100.**
  Y en total, **280 de 600 planes entregan cero glúteo, cero bíceps y cero tríceps** (son todos
  los que caen en Full Body: los 200 de principiante + los 80 de ≤2 días).
- **Criterio de Valery (y mío):** el full body para principiante es correcto y no lo tocaría.
  Lo que está mal es la **plantilla**: un full body sin bisagra de cadera dominante ni puente/hip
  thrust no es un full body completo para nadie, y para una mujer es exactamente el músculo por
  el que se apuntó. Además la app se llama AVI por las hijas del PO y su especialista femenina
  tiene su propio archivo de rol: esto contradice la propia doctrina del proyecto.
- **Intenté tumbarlo así:** (a) ¿algún ejercicio del hueco `piernas` es glúteo-dominante y no
  está etiquetado? Revisé los que salen de verdad — Sentadilla Goblet, Prensa, Sentadilla Hack,
  Smith, Step-up: cuádriceps-dominantes, ninguno es hip-hinge; (b) ¿lo compensa el cierre por
  objetivo? No, `cardioClose`/`coreClose` solo añaden cardio o core; (c) ¿lo arregla el coach?
  Para las 13 auto-registradas no hay coach.
- **A quién le pasa:** hoy, a `diana ramirez` (18 a, 92 kg, nunca entrenó) y a `Sharith sofia`
  (16 a, principiante). A toda mujer principiante que se registre mañana.
- **Costo del arreglo:** **una línea de datos**, no de lógica. Un sexto hueco en `FULL_BODY`:
  `['gluteo','Compuesto',1]` — o mejor, una variante `FULL_BODY_F` con glúteo delante y que
  `_genResolveSplit` la elija por `sexKey`. 1-2 horas con tests. Yo aprovecharía para meter el
  glúteo también en el full body masculino: la bisagra de cadera es patrón de movimiento básico,
  no cosmética femenina.

---

### H4 · 🟠 El plan del principiante es el mismo entrenamiento repetido: 32 % de huecos repetidos y 1,5 ejercicios en TODOS los días

- **Qué pasa:** el principiante recibe Full Body todos los días **y** el gate de nivel
  (`preferP`) agota primero todo lo de nivel 'P'. En muchos pares (músculo × Compuesto × entorno)
  el pool 'P' tiene 1-2 elementos → el cursor de rotación da la vuelta y repite. El intermedio no
  sufre esto porque su split cambia de músculo cada día y su pool es el doble.
- **Dónde:** `avi-core.js:617-619` (`if (st.preferP) addTier(...)`) · `avi-core.js:627-640`
  (cursor de rotación, que es por `muscle|type` y **no evita repetir entre días**, solo dentro
  del día vía `usedInDay`).
- **Evidencia:** 144 planes (72 principiante / 72 intermedio), mismas combinaciones:

  | | huecos de la semana | repetidos | % | ejercicios presentes en TODOS los días |
  |---|---|---|---|---|
  | Principiante | 1.536 | 492 | **32,0 %** | 108 (media **1,50** por plan) |
  | Intermedio | 1.881 | 167 | 8,9 % | 6 (media 0,08 por plan) |

  Casos pegados arriba: `Press Militar en Máquina` los 4 días · `Step-up a Peso Corporal` los 3
  días (verificado también en el plan real de `diana ramirez` en producción).
- **Intenté tumbarlo así:** (a) ¿es culpa de mi `seed` fijo? Repetí con 8 semillas distintas en
  `gate.js` y el patrón se mantiene: el cursor arranca en otro sitio pero vuelve a dar la vuelta;
  (b) ¿es culpa de mi biblioteca extraída? Los ejercicios coinciden uno a uno con el plan real de
  `diana ramirez` que está hoy en Supabase, generado por la app de verdad; (c) ¿es deliberado
  ("repetir el patrón motor 3 veces es bueno para aprender")? Deportivamente **sí lo defiendo
  para el compuesto principal** — repetir sentadilla tres veces por semana es correcto. Lo que
  no se defiende es que se repitan los 3 primeros a la vez y que la variación que sí existe vaya
  hacia atrás en dificultad. Sobrevive parcialmente y por eso lo dejo en 🟠, no en 🔴.
- **A quién le pasa:** a los 8 que nunca entrenaron. Es el hallazgo que más directamente toca la
  pregunta de la activación.
- **Costo del arreglo:** dos cosas baratas. (1) **Que el cursor no reinicie entre días**: hoy
  `st.usedInDay` se resetea por día pero no hay un `usedInWeek` con penalización — un `Set` extra
  que baje a esos candidatos al final de la cola (no que los prohíba: en Full Body hay que poder
  repetir el compuesto). ~1 hora. (2) **Ordenar las familias progresivas** (pared → inclinadas →
  rodillas → suelo) para que el día 3 no sea más fácil que el día 1: eso es un campo `progOrder`
  en el catálogo, medio día.

---

### H5 · 🟠 Los presets de nutrición son calorías FIJAS que ignoran el cuerpo — y 6 de los 8 planes reales son volcados de plantilla

- **Qué pasa:** `NUT_TEMPLATES` son 4 botones con kcal y gramos **absolutos**, sin relación con
  el peso, la talla, la edad ni el sexo de nadie. `applyNutTemplate` los escribe encima de los
  valores calculados y **oculta la nota** que decía "calculados para Fulana (92 kg…)".
- **Dónde:** `app-5-salud.js:5-22` (`NUT_TEMPLATES`) · `app-5-salud.js:25-38` (`applyNutTemplate`,
  incluido `nut-calc-nota.style.display='none'`).
- **Evidencia (producción, no hipótesis):** de los 8 asesorados con plan nutricional guardado,
  **6 son el volcado literal de una plantilla**, texto incluido:

  | Persona | Perfil | Objetivo declarado | Plan que tiene | Su TDEE por Mifflin×1,55 |
  |---|---|---|---|---|
  | Kathe Beltran | F, 28, 85 kg / 163 | **Perder grasa** | 2.400 "Mantenimiento" | ~2.430 |
  | Luz Rodríguez | F, 39, 82 kg / 156 | **Perder grasa** | 2.400 "Mantenimiento" | ~2.230 |
  | Claudia Valbuena | F, 34, 74 kg / 156 | Recomposición | 2.400 "Mantenimiento" | ~2.130 |
  | Natalia Martinez | F, 34, 63 kg / 164 | Recomposición | 2.400 "Mantenimiento" | ~2.070 |
  | Astrid Beltran | F, 33, **sin peso ni talla** | Ganar músculo | 2.400 "Mantenimiento" | no calculable |
  | **Nataly** | **F, 40, 56 kg / 162** | Ganar músculo | **3.200 kcal / 180 g prot** "Volumen" | **~1.877** |

- **Criterio de Andrés Hyp (vinculante en nutrición) y mío:**
  - **Nataly, 56 kg, con 3.200 kcal, es un superávit de ~+1.300 kcal/día.** Eso son ~57 kcal/kg
    y 3,2 g de proteína por kg. Un superávit limpio son +250-400 kcal. A ese ritmo se ganan
    ~1 kg/semana y la mayor parte es grasa. Es la prescripción más equivocada que encontré en
    toda la auditoría, y está en el teléfono de una persona real.
  - **Dos mujeres que vinieron a perder grasa están comiendo en mantenimiento o por encima.**
    Es literalmente el objetivo contrario al que pidieron.
  - Cinco mujeres con cuerpos distintos y objetivos distintos comparten el mismo número. Eso no
    es un plan de alimentación, es un texto.
- **Intenté tumbarlo así:** (a) ¿lo escribió el coach a mano y coincidió? No: el campo `plan`,
  `examples` y `avoid` son **byte a byte** los del preset (`grep` de "Balance calórico para
  mantener" → un solo sitio, `app-5-salud.js:15`); (b) ¿la app le avisa al coach de que ese
  número no cuadra con el objetivo del cliente? No hay ninguna validación entre `nut.goal` y
  `client.goal` ni entre `nut.kcal` y el TDEE calculado; (c) ¿es culpa exclusiva del coach y no
  del código? En parte sí — **el coach tocó el botón** —, pero el botón (i) está al lado de unos
  valores personalizados correctos, (ii) los pisa, y (iii) borra la nota que decía que estaban
  personalizados. La herramienta convirtió un error en un solo toque. Sobrevive.
- **Costo del arreglo:** **escalar los presets**, no borrarlos. Cambiar `kcal:3200` por
  `kcalPerKg:44` / `protPerKg:2.2` y calcular al aplicar (5 líneas en `applyNutTemplate`, media
  jornada). Y un aviso barato: si `nut.kcal` se aleja >20 % del `kcalObj` que devuelve
  `nutritionEstimate`, pintar una línea "ojo: tu estimación para esta persona era X".

---

### H6 · 🟠 Dos motores de macros distintos para la misma persona: 836 kcal de diferencia entre lo que ve el coach y lo que ve el asesorado

- **Qué pasa:** el editor del coach se pre-llena con `calcMacrosSugeridos` (regla de kcal por kg:
  36 kcal/kg a factor 1,55, déficit −350, proteína 2,0 g/kg en pérdida). La calculadora que ve el
  asesorado usa `nutritionEstimate` (Mifflin-St Jeor → TDEE → déficit −500, proteína 1,8 g/kg).
  Son dos fórmulas y dos déficits distintos.
- **Dónde:** `avi-core.js:30-47` (`calcMacrosSugeridos`) vs `avi-core.js:2226-2243`
  (`nutritionEstimate`) · llamadores: `app-5-salud.js:54` (coach) y `app-5-salud.js:201,307,433`
  (asesorado).
- **Evidencia** (corriendo ambas con datos reales de producción):

  | Persona | El asesorado ve | El coach ve pre-llenado | Diferencia |
  |---|---|---|---|
  | diana ramirez (F, 18, 92 kg) — perder grasa | **2.126 kcal** · P166 C179 G83 | **2.962 kcal** · P184 **C370** G83 | **+836 kcal** |
  | Kathe Beltran (F, 28, 85 kg) — perder grasa | 1.930 kcal | 2.710 kcal | +780 kcal |
  | Samuel (M, 28, 78 kg) — ganar músculo | 3.055 kcal | 3.058 kcal | +3 kcal |
- **La causa raíz, dicha como entrenador:** la regla de kcal/kg **se rompe con el sobrepeso**.
  36 kcal/kg × 92 kg = 3.312 kcal de partida para una chica que gasta 2.626. Mifflin lo hace bien
  precisamente porque separa peso de talla y edad. Por eso las dos fórmulas coinciden en Samuel
  (IMC 25) y divergen 836 kcal en diana (IMC 34). El bug se esconde exactamente en las personas
  a las que más importa acertar.
- **Intenté tumbarlo así:** (a) ¿son para cosas distintas a propósito? El comentario de
  `app-5-salud.js:3` dice "fuente única de verdad", lo que sugiere lo contrario;
  (b) ¿el coach nunca ve el número del cliente? Sí lo ve: `app-5-salud.js:433` pinta la
  estimación del cliente en la vista del coach — o sea, en la misma pantalla puede haber dos
  cifras distintas para la misma persona. Sobrevive.
- **Costo del arreglo:** borrar `calcMacrosSugeridos` y pre-llenar el editor del coach con
  `nutritionEstimate` (que ya es pura y está testeada), con caída a la regla vieja solo si falta
  talla/edad/sexo. ~2 horas incluyendo el test.

---

### H7 · 🟠 La corrección de niveles del 28-jul no volvió atrás: 4 auto-registrados siguen hoy con ejercicios avanzados en su plan

- **Qué pasa:** el motor de HOY ya no comete el fallo (verificado), pero los planes que se
  generaron antes siguen intactos en producción. Nada los regenera.
- **Dónde:** `avi-core.js:476-491` (el lote e165-e214 recibió nivel el 2026-07-28, commit
  *"fix(generador): los 48 ejercicios de junio no tenían nivel"*) · las rutinas viven en
  `user_data.routines` y no se recalculan nunca.
- **Evidencia:** crucé las 543 filas ejercicio-en-rutina de producción contra `exLevel()` y el
  gate `_levelGate` del nivel declarado de cada persona:

  | Persona | Nivel | Ejercicio | Nivel del ejercicio hoy |
  |---|---|---|---|
  | Stevan Guerrero (auto-reg, sin peso/edad/sexo) | Principiante | **Zancada Búlgara** | A |
  | FELIPE R.L (auto-reg, 18 a) | Principiante | **Pike Push-up (Flexión Pica)** | A |
  | FELIPE R.L | Principiante | **Rueda Abdominal (Ab Wheel)** | A |
  | Santiago Santos (auto-reg, 17 a) | Intermedio | **Thruster** | A |

  **Las 4 personas son auto-registradas y las 4 rutinas están marcadas `generated:true`.
  Ninguna rutina creada por el coach viola el gate.**
- **Intenté tumbarlo así:** corrí **16.128 planes** con el motor actual (2 sexos × 2 niveles ×
  6 frecuencias × 6 objetivos × 4 entornos × 8 semillas) buscando violaciones del gate →
  **0 violaciones**. Confirmado: el motor está sano, los datos no. También comprobé que no fuera
  ruido de mi biblioteca: solo 2 ids de las 543 filas no están en el catálogo actual (`fb01`,
  `fb04`, rutinas viejas del coach), y ninguno de esos 2 entra en el conteo.
- **Criterio de seguridad:** la zancada búlgara a un principiante del que la app no conoce **ni
  el peso, ni la edad, ni el sexo** es el ítem que menos me gusta de la lista. Es un movimiento
  unilateral con demanda de equilibrio y una excursión de rodilla grande; es de los que producen
  la primera lesión de alguien que nunca entrenó.
- **Costo del arreglo:** un barrido de una sola vez. La regla del proyecto ya está escrita
  (GOTCHA: *"arreglar datos SOLO en Supabase no dura"*) → la vía correcta es una **auto-cura en
  el cliente** que, al cargar, sustituya cualquier ejercicio por encima del gate por otro del
  mismo músculo/tipo dentro del nivel (el selector `_genPick` ya sabe hacerlo) y persista. Un día.
  El parche de 5 minutos, si se quiere ya: el coach regenera la semana de esas 4 personas.

---

### H8 · 🟡 La app promete 38-49 min y la sesión real dura 64,7 — y el tamaño de la sesión NO explica el abandono

Este hallazgo va contra la hipótesis con la que llegué, así que lo escribo con el dato que la
tumba primero.

- **El abandono NO es por sesión larga o dura.** De las 220 sesiones reales con series contadas:

  | Tamaño de sesión | n | avance medio | % completas | min reales |
  |---|---|---|---|---|
  | ≤15 series | 25 | 88,6 % | 72,0 % | 43,7 |
  | 16-22 | 83 | 92,3 % | 83,1 % | 58,6 |
  | 23-30 | 101 | 82,9 % | 65,3 % | 75,4 |
  | **31+** | 11 | **93,9 %** | **81,8 %** | 78,7 |

  No hay relación monótona: **las sesiones más grandes son las que MÁS se terminan.** El 28 % de
  abandono es real, pero no lo causa el volumen prescrito. Si algo, hay un bache en el tramo
  23-30 series (65 % vs 83 %) que merece mirarse aparte, pero no sostiene una conclusión.
- **Lo que sí falla:** `estimateWorkoutMinutes` asume 45 s de trabajo + el descanso nominal.
  Con 136 sesiones que tienen duración registrada: **reales 64,7 min · la fórmula predice 38,0
  (descanso 60 s) o 48,8 (descanso 90 s)**. Segundos reales por serie completada: **183**, frente
  a los 105-135 que asume la fórmula. Falta todo lo que no es serie ni descanso: montar la
  máquina, cambiar discos, el calentamiento, esperar el equipo, el celular.
- **Dónde:** `avi-core.js:2728-2738`. Se muestra en la portada del **día 1** (`renderFirstRun`),
  que es exactamente el momento en que el comentario del propio código advierte:
  *"decirle «~35 min» a alguien que va a tardar 70 quema la confianza en el primer día"*.
  Está pasando eso.
- **Intenté tumbarlo así:** `durationSec` puede inflarse si alguien deja la app abierta. Por eso
  miré también la mediana implícita por tramos (43,7 / 58,6 / 75,4 min): sigue muy por encima de
  la fórmula en los cuatro tramos, no es un puñado de outliers. **Reserva honesta:** no comprobé
  si `durationSec` para el cronómetro al minimizar; si no lo hace, el número real está algo
  inflado y el desfase sería menor de 26 min, pero no cero.
- **Costo del arreglo:** **una constante.** Subir `SET_WORK_SECONDS` de 45 a ~65, o añadir un
  sobrecoste fijo de transición por ejercicio (~90 s). Con 65 s la predicción sube a ~49/60 min,
  ya en el rango real. Cinco minutos, y calibrable contra estas 136 sesiones.

---

### H9 · 🟡 Cinco ejercicios de muñeca y agarre viven dentro del músculo `biceps` y ocupan sus huecos

- **Qué pasa:** el lote e209-e214 (antebrazo/grip) se clasificó con `muscle:'biceps'`. El motor
  no distingue: para él son candidatos legítimos del hueco de bíceps.
- **Dónde:** biblioteca en `app-1-infra.js` → e140 *Curl de Muñeca con Barra*, e209 *Curl de
  Muñeca Invertido*, e210 *Curl de Muñeca*, e213 *Rotaciones de Muñeca*, e211 *Colgarse de la
  Barra* — todos con `muscle:'biceps'`.
- **Evidencia:** en el barrido de 600 planes, **40 de 730 huecos de bíceps (5,5 %)** los ocupa
  un ejercicio de muñeca/agarre. Caso reproducido (hombre, 45, intermedio, 4 días, gym): el día
  de **Tracción** pide 2 huecos de bíceps y salen **"Curl Invertido con Barra" y "Curl de Muñeca
  con Barra"** — cero trabajo real de bíceps ese día; y el jueves el hueco de bíceps sale
  "Curl de Muñeca Invertido".
- **Intenté tumbarlo así:** ¿es defendible? El curl invertido (e139) **sí** trabaja braquial y
  braquiorradial y lo cuento como brazo legítimo — lo excluí del recuento mentalmente. Pero el
  curl de muñeca es flexor de dedos y muñeca: no comparte función con el bíceps. Y "Colgarse de
  la Barra" como aislamiento de bíceps es un ejercicio de agarre. Sobrevive con el matiz.
- **Costo del arreglo:** `muscle:'antebrazo'` en esos 4-5 ejercicios (más un slot opcional de
  antebrazo en el día de tracción si se quiere conservarlos). Una hora, es cambio de datos.

---

### H10 · 🟡 40 series de piernas por semana en el split de 6 días, y 4 de glúteo

- **Evidencia:** barrido de 600 planes → **92 planes superan las 25 series/semana en piernas**
  (mi propio techo declarado en `coach-pro.md`: "más allá de 25, rendimientos decrecientes y
  riesgo de overtraining"), y 52 lo superan en glúteo. Caso real en producción: `Santiago Santos`
  (17 años, 6 días) tiene **40 series/semana de piernas y 4 de glúteo**, más 24 de pecho.
- **Dónde:** `avi-core.js:120` (`PIERNA` = 5 huecos de piernas + 1 de glúteo) × 2 días en el
  split de 6 (`avi-core.js:137`) × 4 series (`genSchemeFor` para intermedio).
- **Intenté tumbarlo así:** ¿es la elección del usuario (pidió 6 días)? Sí, y en 6 días hay que
  poner volumen. Pero el reparto está torcido: 40 de piernas contra 4 de glúteo en el mismo
  bloque no es una decisión, es la plantilla multiplicada por dos. Y a un chico de 17 que se
  declara "intermedio" en un formulario yo no le pongo 40 series de pierna.
- **Costo del arreglo:** en los splits de 6 días, usar variantes A/B con menos huecos por día
  (o bajar el `setsN` cuando `days>=5`). Media jornada de datos, cero lógica nueva.

---

### H11 · 🟡 El factor de actividad del auto-registro está fijado en 1,55 para todo el mundo

- **Dónde:** `app-3-coach.js:406` → `activityFactor:1.55` a pelo. El wizard no lo pregunta.
- **Evidencia:** 1,55 es "moderadamente activo, 3-5 días de ejercicio". Alguien que se registra
  hoy para EMPEZAR a entrenar es, por definición, sedentario (1,2). Medido con perfiles reales:
  **la diferencia es de 548-611 kcal/día** (diana: 2.126 con 1,55 vs 1.533 con 1,2). En un
  objetivo de pérdida de grasa, eso **anula el déficit de 500 kcal entero**.
- **Intenté tumbarlo así:** y aquí el hallazgo se ablanda solo: la calculadora del asesorado
  **sí trae botones para cambiar el nivel de actividad** (`_NUT_ACTS` en `app-5-salud.js:206`,
  con `setNutActivity`). Así que es corregible en dos toques. Además la nutrición está bloqueada
  para el tier `libre`, o sea que ninguno de los 13 la ve hoy. Por eso queda en 🟡 y no más:
  el impacto real llega solo cuando un libre pasa a Premium.
- **Costo del arreglo:** un paso más en el wizard, o bajar el default a 1,375 (ligeramente
  activo) que es más honesto para quien está empezando. Una línea.

---

## Sospechas sin probar

1. **La primera pantalla no vende la sesión, y sospecho que ahí está la activación.** Los 3
   auto-registrados que SÍ entrenaron (`YEISON`, `jose Daniel`, `Sharith`) tienen rutinas con
   `generated=0` — es decir, **no están entrenando el plan que les dio el motor**, sino uno
   posterior. Los que se quedaron con el plan generado dan 1 sesión entre todos. Es un contraste
   muy sugerente, pero **no puedo probar la causalidad**: no sé si el coach les rehizo la rutina
   antes o después de que entrenaran, ni tengo timestamps de reemplazo de rutina. Para probarlo
   haría falta instrumentar "rutina reemplazada, por quién y cuándo".
2. **El bache del 65 % de compleción en sesiones de 23-30 series.** Se sale de la tendencia de
   los otros tres tramos. Con n=101 no es ruido, pero no tengo con qué explicarlo (¿ejercicio
   concreto donde se cae? ¿posición en la sesión?). Se probaría con el índice del último
   ejercicio tocado en las sesiones incompletas — el dato no se guarda hoy.
3. **Los menores.** `_genMakeExcluder` protege de carga axial solo si `age < 16`. En producción
   hay auto-registrados de 16 y 17 años (`Sharith` 16, `Santiago` 17, `Hernan` 17) que **sí
   reciben barra**, y la casilla del wizard les hizo declarar que eran mayores de 18. Deportivamente
   un chico de 17 puede levantar con barra si la técnica es buena; **lo que no puedo juzgar es si
   ese corte de 16 es una decisión tomada o un descuido** — el doc dice "<16" pero el resto de la
   app trata como menor a todo <18. Es una pregunta para el PO, no un hallazgo.
4. **El descanso horneado no se muestra siempre.** `restForExercise` prioriza el `restSec` del
   ejercicio, y el generador lo hornea bien (compuesto 120 s, aislamiento 60 s en hipertrofia).
   No verifiqué que la interfaz del modo guiado use ese valor y no el de la rutina; si usara el
   de la rutina, todos los descansos serían uniformes. No lo medí.

---

## Lo que revisé y está SANO

- **La fase de adaptación anatómica** (`isInAdaptation` + `genSchemeFor`): 3×15, 60 s, sin carga,
  full body, ventana de 21 días, y sobrescribe el objetivo. Está bien pensada y bien implementada.
  Es la mejor parte del motor.
- **Los esquemas por objetivo** (`genSchemeFor`): reps y descansos coinciden con los rangos
  estándar (fuerza 6/120 s, hipertrofia 10/90, pérdida 14/55, resistencia 18/45). Tope de 3
  series para principiante: correcto.
- **El descanso por TIPO de ejercicio** (`REST_BY_TYPE` + `restForExercise`): compuesto pesado
  180 s en fuerza y aislamiento 45 s en resistencia. Esto está mejor resuelto que en la mayoría
  de apps que he visto.
- **El gate de nivel con el motor de hoy**: 16.128 planes, **cero** ejercicios por encima del
  tope del cliente. La corrección del 28-jul funciona hacia adelante.
- **La preferencia P antes que I para principiantes** (`preferP`): agota todo lo de nivel P antes
  de tocar intermedio. Correcto (y es lo que causa H4 — el precio es la monotonía, no el riesgo).
- **La exclusión de movilidad como ejercicio de entreno** (`avi-core.js:586`): el arreglo del
  28-jul funciona; en 600 planes no salió una sola "Postura del Niño" ocupando el sitio de una
  plancha.
- **El orden dentro de la sesión** (`_genRank`): compuesto → funcional → aislamiento → cardio/core
  al final. Correcto en los 600 planes.
- **El perfil de carga alto** (`bodyLoadProfile` + `GEN_ASSISTED_RE`/`GEN_HIIMPACT_RE`): con
  IMC ≥ 30 prioriza máquinas y quita saltos. Verificado con el perfil de 108 kg: salió prensa,
  hack, polea, y ningún pliométrico. Bien.
- **Ningún día sale vacío**: 0 de 600 planes con un día sin ejercicios.
- **Las fórmulas de `nutritionEstimate`**: Mifflin-St Jeor correcta, TDEE correcto, exigir sexo
  explícito en vez de caer a 'F' (arreglado en su día) es lo correcto.
- **El caso "sin peso ni talla"** (Astrid, la más constante, y Stevan): `nutritionEstimate`
  devuelve `null` y la interfaz pinta un mensaje honesto pidiendo los datos, no un número
  inventado (`nutCalcHTML`, `app-5-salud.js:200-206`). `waterGoalGlasses(undefined)` cae a 8
  vasos, que es el default sensato. **Aquí la app se comporta exactamente como debe.**
- **Los datos de series/pesos ya están saneados** (v417): no vi valores imposibles en el barrido.

---

## Lo que NO alcancé a revisar

- **El plan de choque (`shockPlan`/`shockTargets`) no lo probé con datos reales.** Leí las
  constantes y el gate de constancia (`_recentCadence`) y el diseño me parece sensato —
  especialmente que 3+ estancamientos con baja constancia dé "recuperar ritmo" y no "descarga" —
  pero **no lo corrí**. Es la pieza de progresión y se quedó sin auditar por presupuesto.
- **La progresión de carga semana a semana**: no existe motor de progresión automática (el
  §7 del doc lo declara fuera de alcance). No lo audité porque no hay qué auditar, pero conviene
  decirlo: **el plan generado no cambia nunca solo.** Alguien que entrene 8 semanas hace las
  mismas 3×15 la semana 8 que la semana 1, salvo que el coach intervenga.
- **Las plantillas de activación / calentamiento** (`WARMUP_LIBRARY`): las vi de pasada y el
  contenido parecía correcto (movilidad articular por zona), pero **no verifiqué que la
  activación que se sugiere corresponda a los músculos del día**, que es la pregunta que importa.
- **`applyMood`**: adapta la rutina según el ánimo declarado y toca series y ejercicios. No lo
  probé. Es zona sensible: el estado 🤕 dolor debería tener el mismo criterio que H2.
- **La modalidad `hiit` y su configuración de intervalos** (`hiitCfg`, `clampQwHiit`): sin revisar.
- **Las descripciones técnicas de los 220 ejercicios**: leí unas 30. Las que vi son buenas
  (mencionan errores comunes y postura). No hice el censo completo ni verifiqué que las
  contraindicaciones estén mencionadas donde tocan.
- **El deload** (`scheme.deload`): comprobé que baja una serie y pone la nota, pero no lo probé
  end-to-end desde `shockDeload`.
