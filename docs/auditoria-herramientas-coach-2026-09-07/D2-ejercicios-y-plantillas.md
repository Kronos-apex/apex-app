# D2 · Ejercicios y Plantillas — Valery (coach) + Julián (QA)

## Veredicto en una frase
La biblioteca y las plantillas SÍ se usan de verdad (21 de 108 rutinas reales, en 10 de 25
asesorados, son copia exacta de una de las 5 plantillas) — pero la herramienta con la que el coach
las edita tiene tres fugas silenciosas: lo que él renombra en el catálogo se revierte solo, marcar
un mensaje leído sube de nuevo los 374 ejercicios completos, y una plantilla que promete "Hombros"
no trae ni un solo ejercicio de hombro y ya se la aplicó a 4 personas reales.

## Los 3 más grandes

### 1 — El catálogo se "edita" pero no dura: `migrateExercises()` revierte nombre/músculo/tipo en cada arranque
**Qué es:** el comentario en `app-2-login.js:3-6` dice *"Lo editable por el coach —sets, reps,
env, track, holdSecs…— NO se toca"*. Es falso contra el propio código: `CATALOG_FIELDS`
(`app-2-login.js:7`) es `['name','muscle','type','icon','desc','descSimple','muscleLabel',
'ytQuery']` — 5 de esos 8 campos (`name`,`muscle`,`type`,`icon`,`desc`) son EXACTAMENTE los que
`saveEx()` deja editar desde el modal `#m-ex` (`app-4-entreno.js:68-84`: el formulario tiene
`ex-n` nombre, `ex-m` músculo, `ex-t` tipo, `ex-i` ícono, `ex-d` descripción). `migrateExercises()`
recorre TODO `defaultExercises` (el catálogo de 374 escrito en el código) y para cada id que
coincida con uno del catálogo, si el valor guardado difiere del código, **lo pisa con el del
código** (`if(def[f]!==undefined && cur[f]!==def[f]){ cur[f]=def[f]; }`, línea 18). Y se llama SIN
condición ni bandera en `initCoach()` (`app-2-login.js:1320`), es decir, en CADA login/apertura de
la app como coach — no solo la primera vez.

**A quién le pasa HOY:** a nadie todavía — medido contra producción, los 374 ejercicios del coach
(`coach_settings->'e'`) tienen **374 de 374 ids con formato de catálogo** (`e#` o `fb04`), o sea
que **no ha creado ningún ejercicio propio ni le consta haber renombrado uno del catálogo**
(verificado por SQL). Es un riesgo verificado en el código, sin víctima todavía.

**Evidencia:** `app-2-login.js:3-21` (comentario + `CATALOG_FIELDS` + `migrateExercises`),
`app-4-entreno.js:68-84` (`saveEx`, los campos editables reales), `app-2-login.js:1320`
(`initCoach(){migrateExercises();dedupeExercises();...}`, sin guard). SQL: `select count(*) from
(coach_settings->'e') where id ~ '^e[0-9]+$'` → 374/374.

**Cómo intenté tumbarlo:** busqué una bandera tipo `_migrated`/`localStorage` que impidiera correr
esto más de una vez (no existe, a diferencia de otras migraciones del repo como `migrateExTypes`
que sí llevan guard). Busqué si `saveEx()` marca de algún modo "esto lo tocó el coach" para que
`migrateExercises` lo respete (no existe ese campo). Confirmé que el ejercicio SÍ se ve renombrado
en la MISMA sesión (el `toast` dice "actualizado" y `DB.exercises` en memoria ya trae el nombre
nuevo) — el problema es solo al volver a cargar la app.

**Qué costaría arreglarlo:** una línea — sacar `name`, `muscle`, `type`, `icon`, `desc` de
`CATALOG_FIELDS` (dejando solo lo puramente de presentación que de verdad nadie edita:
`descSimple`, `muscleLabel`, `ytQuery`), o marcar con un flag `_edited` los campos que el coach
tocó a mano y saltarlos en el refresco.

---

### 2 — Marcar un mensaje leído (o un lead atendido) sube de nuevo los 374 ejercicios completos
**Qué es:** `_COACH_SETTINGS_KEYS` (`app-1-infra.js:158`) agrupa `ax_e` (la biblioteca entera),
`ax_nequi`, `ax_cn`, `ax_ce`, `ax_site`, `ax_msgreads` y `ax_leadsdone` en UN SOLO objeto
(`_coachSettingsObj()`, línea 163-166) que se escribe COMPLETO cada vez que CUALQUIERA de esas 7
claves cambia (`app-1-infra.js:967-969`: `if(_COACH_SETTINGS_KEYS.includes(k)){ await
UD.upsertOwn({coach_settings:_coachSettingsObj()}); }`). El propio comentario de
`app-3-coach.js:3384` lo admite: `sv('ax_msgreads',m); // sv espeja a localStorage y sube
coach_settings`. `markCoachRead(id)` se llama automáticamente cada vez que el coach ABRE una
conversación (`app-3-coach.js:3399` y `:3451`) — no es un botón "marcar leído", es pasivo. Lo
mismo con `_leadsDone` (`app-3-coach.js:1556`,`1572`) al marcar un lead como atendido. Cada una de
esas acciones —que no tienen nada que ver con ejercicios— dispara, 800ms después
(`_persistAuthUserDebounced`, `app-1-infra.js:940-948`, debounce POR CLAVE, no compartido entre
claves), un upsert de `coach_settings` completo.

**El tamaño real, medido (no el de la baseline):** la baseline dice "95.323 bytes" — es el tamaño
COMPRIMIDO en disco (`pg_column_size`). Lo que el TELÉFONO del coach sube por la red es el JSON
sin comprimir: medido con `octet_length(coach_settings::text)` = **250.842 bytes** (245 KB), de
los cuales el campo `e` (los 374 ejercicios) solo son **249.617 bytes**. `fetch`/Supabase-js no
comprime el cuerpo de una petición por defecto. **Esto contradice el marco de la baseline y hay
que decirlo: la columna en disco pesa 95 KB, pero cada subida real pesa ~245 KB.**

**A quién le pasa HOY:** a Andres Martínez (el coach), cada vez que abre CUALQUIERA de sus 10
conversaciones activas o marca un lead — algo que hace de forma rutinaria (el chat sigue activo:
último mensaje 4-sep). No hace falta tocar el catálogo para pagar el costo del catálogo.

**Evidencia:** `app-1-infra.js:158-166` (`_COACH_SETTINGS_KEYS`/`_coachSettingsObj`),
`app-1-infra.js:940-948` (debounce por clave) y `:967-969` (el upsert completo),
`app-3-coach.js:3381-3385` (`markCoachRead`) y `:3399`,`:3451` (se llama al abrir el chat). SQL:
`octet_length(coach_settings::text)=250842` vs `pg_column_size(coach_settings)=95323`.

**Cómo intenté tumbarlo:** revisé si `_udDebounce` coalesce distintas claves en un solo timer — no,
es un `setTimeout` por clave (`_udDebounce[k]`), así que tocar `ax_msgreads` y luego `ax_leadsdone`
(aunque sea la misma sesión) dispara DOS subidas completas si pasan más de 800ms entre sí. Revisé
si `UD.upsertOwn` manda solo el diff de la columna — sí, solo toca la columna `coach_settings` (no
routines/history), pero esa COLUMNA entera se reconstruye siempre desde cero con
`_coachSettingsObj()`, sin distinguir qué sub-clave cambió.

**Qué costaría arreglarlo:** sacar `ax_msgreads` y `ax_leadsdone` de `_COACH_SETTINGS_KEYS` a su
propia columna/mecanismo (son datos que cambian mucho más seguido que la biblioteca y no tienen
relación con ella), o hacer que `_persistAuthUser` mande un PATCH del sub-campo jsonb (`jsonb_set`)
en vez de reconstruir el objeto completo desde `_coachSettingsObj()`.

---

### 3 — La plantilla «Tren Superior — Espalda, Pecho y Hombros» no tiene NINGÚN ejercicio de hombro, y ya se la aplicaron a 4 personas
**Qué es:** medido por CONTENIDO (id de ejercicio, no por nombre) contra la tabla real: la
plantilla tiene 5 ejercicios — `e6` Jalón al Pecho en Polea (espalda), `e83` Lagartijas (pecho),
`e51` Remo Gironda en Polea (espalda), `e84` Press en Máquina Hammer (pecho), `e24` Pullover en
Polea (espalda). Tres de espalda, dos de pecho, **cero etiquetados `hombros`** — pero el nombre de
la plantilla (y el de las rutinas que salieron de ella) promete las tres zonas.

**A quién le pasa HOY, con nombre:** el mismo set exacto de esos 5 ejercicios está en las rutinas
reales de **Nataly**, **maria rubio**, **Astrid Beltran** y **Kathe Beltran** — las cuatro con el
día llamado literalmente "Tren Superior — Espalda, Pecho y Hombros" o "Tren Superior". Si alguna
de las cuatro entrena creyendo que ese día también trabaja hombro (se lo dice el nombre de su
propia rutina), no lo hace: no hay press militar, elevación lateral ni nada etiquetado hombro ese
día.

**Evidencia:** SQL de contenido — plantilla: `ex_ids:[e6,e83,e51,e84,e24]`; rutinas idénticas en
Nataly (`rhu8r86ehg1jsxf09w`, con 2 ejercicios más agregados encima: e21,e8 — tampoco hombro),
maria rubio (`mtqex4bptb97gzrr64c`, EXACTA), Astrid Beltran (`mssydsmilrdahr7nr69`, EXACTA), Kathe
Beltran (`060c33f645e6`, EXACTA). Nombres y músculos verificados contra `defaultExercises` en
`app-1-infra.js` (grep de los 5 ids).

**Cómo intenté tumbarlo:** consideré que el press (pecho) y el remo (espalda) SÍ reclutan hombro de
forma indirecta (deltoides anterior en el press, posterior en el remo) — cierto anatómicamente,
pero la propia taxonomía de la app tiene una categoría `hombros` dedicada (la usan e1 Press
Militar, elevaciones laterales, etc.) y ninguno de los 5 la lleva; si fuera intencional, igual
sería razonable avisarlo en vez de prometerlo en el nombre. También until revisé si era un caso
aislado — no: aparece igual en la plantilla Y en 4 rutinas reales distintas, con el MISMO id-set
exacto, lo que sugiere que es el "día 2" estándar del coach y no un error de tecleo puntual.

**Qué costaría arreglarlo:** es una decisión de programación, no de código — Valery/Coach Pro
revisan si falta un ejercicio de hombro en ese día (p. ej. elevación lateral) o si el nombre debe
decir solo "Espalda y Pecho" (como ya existe la plantilla separada "Pecho espalda").

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | `migrateExercises()` revierte name/muscle/type/icon/desc de un ejercicio del catálogo en cada login — el comentario dice lo contrario | `app-2-login.js:3-21,1320` | No (coach nunca ha editado un catálogo); mecanismo verificado |
| 🔴 | Marcar un chat leído o un lead atendido sube de nuevo los 374 ejercicios completos (~245 KB reales, no 95 KB) | `app-1-infra.js:158-166,940-969`; `app-3-coach.js:3381-3385,3399,3451` | Sí — pasa cada vez que el coach abre una conversación |
| 🟡 | Plantilla/rutina "Tren Superior — Espalda, Pecho y Hombros" sin ningún ejercicio de hombro, aplicada a 4 personas | Contenido medido en `templates` y `routines` (SQL) | Sí — Nataly, maria rubio, Astrid Beltran, Kathe Beltran |
| 🟡 | `openNewRoutineFromTemplate` NO resetea `CUR.routineWarmup`: aplicar una plantilla puede heredar el calentamiento personalizado de la ÚLTIMA rutina que el coach editó (de otro asesorado, con otra limitación) | `app-2-login.js:816-836` vs `app-3-coach.js:2947,3043` (los únicos 2 sitios que sí lo resetean) | No confirmada en producción (requiere secuencia específica); mecanismo verificado |
| 🟡 | Editar sets/reps de un ejercicio del catálogo NO actualiza las rutinas ya asignadas (copia congelada al agregarlo) — comportamiento razonable, pero no está documentado en ningún sitio de la UI y un coach puede creer que sí propaga | `app-4-entreno.js:73-84` (`saveEx`, sin tocar `DB.clients`); `app-2-login.js:740-742` (`{...ex}` al agregar a una rutina) | No hay evidencia de confusión reportada; comportamiento confirmado con datos reales (e42: catálogo hoy 4×10, rutinas van de 3×15 a 4×5) |
| 🟢 | No existe forma de BORRAR un ejercicio del catálogo desde la UI del coach (solo crear/editar) | `index.html:1142-1154` (modal `#m-ex` solo tiene Cancelar/Guardar); sin `delEx()` en el repo | No aplica — no hay acción que pueda fallar |
| 🟢 | Un ejercicio CUSTOM asignado a un cliente (id no-catálogo) no tiene foto/video (`imgUrl` nunca se captura en `saveEx`) ni `descSimple`, y en la habitación de progreso por ejercicio (`openExerciseRoom`) la sección "Cómo hacerlo" desaparece en silencio si el ejercicio no está en la biblioteca local del cliente | `app-4-entreno.js:68-75` (sin imgUrl/descSimple); `app-6-extra.js:2530-2544` (comentario admite el hueco, con fallback parcial); `app-4-entreno.js:3010-3065` (`openExerciseRoom`, sin ese fallback) | No — el coach tiene 0 ejercicios custom hoy (374/374 son de catálogo) |
| 🟢 | Aplicar una plantilla NO se puede hacer a varios asesorados a la vez, y siempre entra con día "Lunes" fijo (el coach debe cambiarlo a mano) | `app-2-login.js:796-836` (`openTemplateClientSelector`, un cliente por toque; `rf-day` hardcodeado) | No es un bug, es una limitación de flujo — 2-3 toques mínimo para aplicar |

## Lo que verifiqué y está SANO (con números)

- **Las plantillas SÍ se usan.** Comparando por CONTENIDO (set exacto de ids de ejercicio, no por
  el marcador `fromTemplate` que no existe — la trampa que advertía el briefing) contra las 108
  rutinas reales: **21 de 108 rutinas (19,4%) son copia exacta, ejercicio por ejercicio, de una de
  las 5 plantillas**, repartidas en **10 de 25 asesorados (40%)**: Sharith sofia (4 de sus 4
  rutinas), Claudia Valbuena (3 de 4), maria rubio (4 de 4), Natalia Martinez (2 de 4, más 2
  cuasi-idénticas con 1 ejercicio sustituido), Valery (3 de 4), Luz Rodríguez (3 de 4), Astrid
  Beltran (1 de 4), Kathe Beltran (1 de 4), Yovan Tellez Rubio (1 de 4), YEISON VALBUENA (1 de 2).
  Además el NOMBRE de la rutina resultante coincide con el de la plantilla menos el sufijo
  " (plantilla)" en casi todos los casos, que es exactamente lo que hace
  `tpl.name.replace(' (plantilla)','')` en `openNewRoutineFromTemplate`. Control: comparé también
  varias rutinas que NO usan plantilla (Felipe, Sofía Vega, Santiago Santos, Danilo, Chema,
  Cristian, Daniel, Diana Paola, Nicolás, jhojan, Andres Martínez el propio coach) y ninguna
  coincide por contenido con ninguna de las 5 plantillas — el 19,4% no es ruido de coincidencia.
- **El buscador y el pintado por tandas de la biblioteca funcionan como documenta el gotcha
  vigente**: `searchExercises`+`exQ`/`exF`/`EX_PAGE=30` (`app-4-entreno.js:1-58`) — no encontré
  nada roto ahí, coincide con lo ya auditado en la FASE 2 (2026-07-27).
- **El remapeo de ejercicios retirados (`REMOVED_EXERCISES`/`dedupeExercises`) SÍ actualiza rutinas
  Y récords**, ya documentado en GOTCHAS VIGENTES (v484) — no lo re-audité como pide el briefing,
  solo confirmé que sigue vigente en `app-2-login.js:43-89` y que no hay una segunda ruta de borrado
  que lo esquive.
- **El coach hoy tiene 374/374 ejercicios de formato catálogo — cero ejercicios propios.** Esto
  reduce el riesgo inmediato de los hallazgos 1 y el de fotos/descSimple (nadie ha creado uno
  custom todavía), pero no los invalida: son mecanismos, no promesas.
- **`coach_settings` pesa 95.323 bytes EN DISCO** (comprimido) — confirma el número de la baseline
  para ese dato puntual — pero el payload que sube el teléfono es **250.842 bytes**, un dato nuevo
  que la baseline no tenía y que corrige su marco (ver hallazgo #2).

## Sospechas sin medir
- No pude confirmar en producción que el hallazgo del `CUR.routineWarmup` sin resetear haya
  ocurrido de verdad (necesitaría reproducirlo en el navegador, y otro agente puede estar usando
  los puertos 8829/9349) — el mecanismo está verificado por código pero la secuencia exacta
  (editar rutina de un cliente con calentamiento propio → aplicar plantilla a OTRO cliente sin
  pasar por "Nueva rutina" de por medio) no se probó en vivo.
- No medí si las plantillas creadas el 29-jun en 4 minutos (mencionado en la baseline) coinciden
  con la SECUENCIA en que se crearon los 4 primeros asesorados que las usan — sería interesante
  para saber si "plantilla" = "cómo se dio de alta a los primeros clientes" y luego se generalizó,
  pero no cambia el veredicto y no alcancé a cruzarlo por fecha de alta de cada cliente.
- No verifiqué si `autoRoutineNote()` se dispara también al editar una rutina EXISTENTE (solo
  confirmé que se usa en `saveRoutine()` cuando el campo de nota está vacío) — no debería importar
  para plantillas ya creadas, pero no tracé todos los llamadores.

## Qué NO miré y por qué
- **No repetí la auditoría de contenido deportivo del catálogo** (A4 ya lo hizo: niveles,
  modalidades, filtros de lesión) — mi mandato era la HERRAMIENTA de edición, no el contenido en
  sí, salvo el caso puntual de la plantilla sin hombro que apareció midiendo uso real.
- **No usé el navegador/harness E2E** para reproducir en vivo el flujo de aplicar plantilla o
  editar un ejercicio — medí todo por código + SQL de solo lectura, siguiendo la prioridad que pide
  el briefing (otro agente puede estar en los puertos 8829/9349). Esto deja sin confirmar visualmente
  el hallazgo #1 (¿el coach VE algún aviso de que su edición se revertirá? No, no hay ninguno) y el
  del warmup stale.
- **No audité `openWarmPicker`/`WARMUP_LIBRARY` a fondo** más allá de lo necesario para entender el
  bug del `CUR.routineWarmup` — es una feature aparte (calentamiento auto-sugerido) que merece su
  propia pasada si el PO quiere profundizar.
- **No crucé las 5 plantillas contra el catálogo de 374 para ver si alguna referencia un ejercicio
  YA RETIRADO** (`REMOVED_EXERCISES`) — sería una comprobación rápida para la próxima ronda: si una
  plantilla quedó con un id remapeado, aplicarla arrastraría el ejercicio viejo con nombre
  actualizado pero potencialmente fuera de la selección con la que se diseñó el día.
