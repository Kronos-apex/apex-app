# E1 · El calentamiento visto por el asesorado — Lucas Ortega (QA funcional) + Sofía Castaño (CS)

## Veredicto en una frase

El calentamiento funciona en el camino feliz y su filtro de seguridad ya está bien cerrado (verificado
contra HEAD), pero pierde la confianza de la persona en un punto concreto y medido — un segundo
entreno el mismo día puede abrir con el calentamiento YA marcado como hecho sin que nadie lo haya
tocado — y tiene dos descuidos de pulido menores (una sección puede quedar con título y cero
ejercicios, y un botón se quedó con emoji crudo cuando su vecino de al lado ya es SVG de marca).

## Los 3 más grandes

### 1. El calentamiento aparece YA HECHO en el segundo entreno del mismo día

**Qué es:** el estado de la tarjeta (`wu_<rid>_<exId>`) y el de las series (`done_<rid>_<ei>_<si>`)
solo se limpian por DÍA (`checkAndResetSession`, compara `toDateString()`) o con el botón manual
"↺ Reiniciar" (`resetSession`, que sí llama a `clearWarmup`). Ni "Entrenar otra vez" (`todayTrainAgain`)
ni volver a arrancar la MISMA rutina desde "Rutinas" (`startRoutineNow`, que entra por
`overrideRoutine`) llaman a ninguno de los dos. Si la persona ya marcó su calentamiento (o completó
la sesión) la primera vez, la SEGUNDA sesión de esa rutina el mismo día abre con la barra al 100% y
la insignia en "✅ ¡Listo para entrenar!" sin que la persona haya tocado nada.

**A quién le pasa HOY, con nombre:** medido contra `user_data.history` (proyecto
`eoebhrxbokyllqalyecj`, filtro `profile->>'name' not ilike '%QA%'`), hay **4 casos** de "misma
rutina, mismo día, dos sesiones" en toda la vida de la app:
- **Samuel Cifuentes**, 8-jul-2026, rutina `mqqxfqv0vyz65o7wt2b`: sesión 1 llega a 21/21 entre
  16:51 y 17:24 UTC; sesión 2 arranca a las 19:20 UTC (≈2h después, mismo día en Colombia,
  UTC-5) partiendo de 1/21.
- **Estella Rodríguez**, 1-ago-2026, entrenamiento rápido `qw_hiit_maquina`: 1/10 a las 14:57 UTC,
  luego 10/10 (finalizada) a las 15:11 UTC.
- **Natalia Martinez**, 18-jul-2026, rutina `mrqi7fbmkb75ydn1au`: dos sesiones finalizadas el
  mismo día (20/20 y 19/20).
- **Andres Martínez** (el coach, en «Mi entrenamiento»), 4-jul-2026: dos rutinas distintas
  completas el mismo día.

**Evidencia (archivo:línea):**
- `app-4-entreno.js:2150-2164` — `resetSession` (SÍ limpia: llama `clearWarmup(routine.id)`).
- `app-4-entreno.js:2183-2198` — `checkAndResetSession` (solo limpia si `lastDate!==today`).
- `app-4-entreno.js:1062-1068` — `todayTrainAgain` (solo `CUR.trainAgain=true` + re-render).
- `app-4-entreno.js:1674-1681` — `startRoutineNow` (solo re-render con `overrideRoutine`).
- `app-6-extra.js:2424-2428` — `wuKey/wuIsDone/clearWarmup` (claves por rutina, no por sesión).
- SQL de solo lectura contra `user_data.history` (resultado con los 4 casos arriba).

**Cómo intenté tumbarlo:** revisé si `prepareTodaySession`/`gmRebuild` (lo único que corre siempre
al reabrir "Hoy") hacen alguna limpieza adicional — no, solo reubican dropsets huérfanos
(`_rehomeOrphanDropsets`). Consideré que el "1/21" de Samuel pudiera venir de OTRO aparato (el
`wu_`/`done_` es local y nunca sale del teléfono, es la ceguera que el propio briefing señala): no
puedo descartarlo desde la nube, así que separo el hallazgo en dos partes que SÍ pude verificar por
separado — (a) el código no tiene ningún camino que limpie el calentamiento en un segundo entreno
del mismo día, y (b) entrenar la misma rutina dos veces el mismo día ocurre de verdad, 4 veces
documentadas. La unión de las dos (que el celular mostró el calentamiento ya marcado) es la
explicación más simple y no tengo cómo falsearla ni confirmarla del todo sin el teléfono.

**Qué costaría arreglarlo:** bajo — en el mismo punto donde se decide reabrir sin pasar por "ya
entrenaste hoy" (`todayTrainAgain` y la rama `overrideRoutine` de `renderClientToday`), comprobar si
esa rutina ya tiene una sesión de HOY con `finishedAt` y, si la hay, limpiar calentamiento + series
igual que hace `resetSession`. Falta decidir con el PO si se limpia solo o se pregunta.

### 2. Una sección de la tarjeta puede quedar con título y CERO ejercicios debajo

**Qué es:** `renderWarmup` siempre pinta los dos títulos de sección — "🦴 Movilidad articular" y
"⚡ Activación muscular" — sin comprobar si la lista de abajo tiene contenido. `buildWarmup` filtra
cada pool por las limitaciones de la persona y, si una zona queda sin nada, la deja vacía A PROPÓSITO
(comentario explícito: "uno de menos no le hace daño a nadie, uno contraindicado sí"). Con dos
limitaciones reales y comunes a la vez —zona lumbar + tobillo— un día de pierna o de glúteo deja la
sección de Activación en CERO ejercicios, y el usuario ve el título "⚡ Activación muscular" sin
ninguna fila debajo.

**A quién le pasa HOY:** sin víctima confirmada — de las fichas del baseline, ninguna declara
simultáneamente lumbar + tobillo. Es un riesgo estructural (cualquier futura persona con esa
combinación en un día de pierna/glúteo lo va a ver), no un caso vivo.

**Evidencia:** simulé `buildWarmup` extrayendo el código real de `avi-core.js` (líneas 121-124,
417-527, 791-804, 857-866) y `app-6-extra.js` (2242-2322, 2330-2418) en un módulo Node aparte y lo
ejecuté con `limKeys=['lumbar','tobillo']`:
- músculo `piernas` → `articulares.length=5`, `activaciones.length=0`
- músculo `gluteo` → `articulares.length=4`, `activaciones.length=0`

El render nunca condiciona el título a que su lista tenga contenido (`app-6-extra.js:2515-2522`).

**Cómo intenté tumbarlo:** probé combinaciones de 1, 2, 3 y las 11 zonas a la vez para ver si el
`total` completo (no solo una sección) podía llegar a 0/0 — no ocurre: siempre sobrevive algo de
movilidad articular aunque la activación se vacíe, así que la insignia no queda muda en este
escenario (sí lo haría con una lista `warmup` propia del coach que resolviera 0 ids, ver hallazgo #7
de la tabla). También until confirmé que las 4 zonas «obvias» de pierna (rodilla+aductor+abductor+
tobillo) SOLAS no bastan — hace falta lumbar también, porque `wai3` (Peso muerto con peso corporal)
solo lo excluye esa zona.

**Qué costaría arreglarlo:** bajo — ocultar el título de la sección cuando su lista está vacía, o
mejor (tono Sofía): una línea que explique por qué, del estilo "Por tu espalda y tu tobillo, hoy
vamos solo con movilidad".

### 3. El botón de video (🎥) es el único emoji crudo dentro de un control de la tarjeta

**Qué es:** `exRow` pinta `<button class="wu-guide-btn" ...>🎥</button>` — un emoji sin envolver
como ícono de un botón CLICABLE ("Ver cómo se hace: guía y video"). El pulido v626-v627 (documentado
en CLAUDE.md) barrió los 78 botones de clase `.btn` de la app y dejó 70 sin emoji; `wu-guide-btn` no
lleva la clase `.btn`, así que se quedó fuera de ese barrido. Dos líneas más abajo, en el MISMO
archivo y la MISMA fila de ejercicio, el ícono 🔥 de "Sets de calentamiento" SÍ sigue el patrón
correcto (`_gmIco('flame',12,'🔥')`, que en pantalla pinta el SVG de marca, no el emoji). El catálogo
`AVI_ICONS` ya tiene `camera` y `play` listos para usar.

**Medido EN PANTALLA, no en el fuente (regla del 17-sep):** este botón se genera dinámicamente
dentro de `renderWarmup` → `con.innerHTML=...`, que corre bien DESPUÉS de que `aviIconizeStatic()`
ya hizo su única pasada (al `DOMContentLoaded`). No está envuelto en `<span class="t-ic" data-ic>`,
así que nunca se convierte a SVG: lo que se ve en el navegador es el emoji crudo del sistema
operativo (distinto en Android/iOS/Windows), al lado de un ícono de marca consistente.

**Evidencia:** `app-6-extra.js:2493` (el botón) vs `app-6-extra.js:889-891` (el ícono hermano, ya
convertido) y `app-1-infra.js:2128+` (`AVI_ICONS`, con `camera`/`play` ya definidos), más
`app-1-infra.js:2205-2211` (`aviIconizeStatic`, pasada única sobre el DOM estático).

**Cómo intenté tumbarlo:** busqué si algún otro paso re-ejecuta `aviIconizeStatic()` después de un
render dinámico — no lo hace, se llama una sola vez. Busqué si `wu-guide-btn` tiene alguna regla CSS
que sustituya visualmente el contenido por un ícono — no, el emoji es el contenido real del botón.

**Qué costaría arreglarlo:** trivial — cambiar `>🎥<` por `>${aviIcon('camera',17)}<` (o `'play'`).

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🟡 | El calentamiento (y las series) quedan marcados como hechos en un 2º entreno de la misma rutina el mismo día | `app-4-entreno.js:1062-1068,1674-1681` + `app-6-extra.js:2424-2438` | Sí — 4 casos medidos de "misma rutina, mismo día, dos sesiones" (Samuel, Estella, Natalia, el coach). El síntoma exacto en pantalla no se puede confirmar desde la nube (el dato es local) |
| 🟡 | La sección "⚡ Activación muscular" puede quedar con título y 0 ejercicios (ej. lumbar+tobillo en día de pierna/glúteo) | `app-6-extra.js:2330-2418, 2515-2522` | No hoy — riesgo estructural, ninguna ficha real declara esa combinación ahora mismo |
| 🟢 | El botón 🎥 ("Ver cómo se hace") es el único emoji crudo dentro de un control de la tarjeta; su vecino 🔥 ya es SVG | `app-6-extra.js:2493` | Sí — lo ve todo asesorado que abre el guiado (100% desde F5) |
| 🟢 | "Sets de calentamiento" (por ejercicio, aproximación) y "Calentamiento" (de la sesión) comparten literalmente la palabra para dos mecánicas distintas, en la misma pantalla | `app-6-extra.js:884-896` (por ejercicio) vs `2501-2523` (de sesión) | Sin medir — riesgo de comprensión, no de función; no encontré que se pisen visualmente ni que compartan datos |
| 🟢 | Una rutina de un solo ejercicio de tipo `cardio` o sin músculo reconocido (`otro`) etiqueta su calentamiento como "Cuerpo completo ⚡", que no describe lo que se va a entrenar | `app-6-extra.js:2363-2377` | Sin medir — no confirmé rutinas reales de un solo ejercicio cardio |
| 🟢 | La ficha de video (🎥) rotula TODO ejercicio de calentamiento como "Calentamiento · movilidad", incluidos los de ACTIVACIÓN (Deadbug, lagartija, band pull-apart…) | `app-6-extra.js:2644` (`muscleLabel` fijo) | Sin medir — es un texto, no bloquea nada; toca a cualquiera que abra el 🎥 de un ejercicio de activación |
| 🟢 | Si la lista propia del coach (`routine.warmup`) resolviera 0 ids válidos (ej. un id retirado del catálogo sin migrar), la insignia queda naranja "Calentar antes de empezar" PARA SIEMPRE y la tarjeta sin filas (0/0, nunca pasa a verde) | `app-6-extra.js:2477-2479, 2451` | No hoy — el baseline confirma que los 49 ids en uso existen los 49 en `WARMUP_LIBRARY`. Riesgo latente, misma familia que `REMOVED_EXERCISES` |

## Lo que verifiqué y está SANO (con números)

- **El filtro de limitaciones SÍ se aplica al calentamiento auto-derivado, ANTES del `slice(0,2)`**
  (`app-6-extra.js:2330-2349`) — confirmado contra HEAD, consistente con el falso positivo #1 del
  briefing (arreglado en v424/v454). No lo repito como hallazgo propio.
- **El colapso de la tarjeta persiste por rutina** (`wuopen_<rid>`, `app-6-extra.js:2535-2545`,
  v572) — no encontré el salto de 543px ya cerrado.
- **Marcar/desmarcar (`wuToggle`) actualiza barra, insignia y persistencia de forma consistente**
  (`app-6-extra.js:2430-2462`) y usa `esc()` sobre el nombre del ejercicio (`app-6-extra.js:2490`).
- **El reseteo por DÍA limpia bien las tres cosas**: calentamiento de sesión, sets de aproximación y
  dropsets (`checkAndResetSession`, `app-4-entreno.js:2183-2198`, llama a `clearWarmup` +
  `clearWarmDropDone`).
- **El reinicio MANUAL ("↺ Reiniciar") también limpia el calentamiento** (`resetSession`,
  `app-4-entreno.js:2150-2164`).
- **Todo el módulo es 100% local** — recorrí `buildWarmup → renderWarmup → wuToggle →
  updateWarmupProgress` completo y no hay ninguna llamada a `fetch`/Supabase: la tarjeta usa
  `routine`/`client` ya cargados en memoria y `localStorage`. Entrar sin red no cambia nada
  (verificado por lectura de código, no reproducido en el navegador por compartirlo con otros
  agentes).
- **No hay ningún gate que bloquee entrenar si el calentamiento no está al 100%** — es puramente
  informativo; no encontré ninguna condición que dependa de `wuIsDone`/`updateWarmupProgress` fuera
  de pintar la insignia.
- **El calentamiento manual del coach (`routine.warmup`) reemplaza al auto-derivado y NO se filtra
  por lesión** — confirmado que sigue así en HEAD. Es el falso positivo #2 del briefing (decisión
  deliberada, el aviso vive en el editor del coach, no en la vista del asesorado); no lo reporto
  como defecto.
- **El único punto de montaje de `renderWarmup` es el guiado** (`app-6-extra.js:761`, dentro de
  `gmRender`) — la "clásica" ya no existe (murió en v291/F5b); los comentarios que hablan de "paridad
  con la clásica" son residuales y no afectan el comportamiento actual.

## Sospechas sin medir

- No reproduje el hallazgo #1 en pantalla con un harness E2E: los puertos 8829/9349 estaban en uso
  por otros agentes de la ronda gran parte de la sesión, y la regla dura pide esperar o medir por
  código en ese caso. La conclusión se apoya en lectura de código + SQL de solo lectura, no en una
  repro visual paso a paso.
- No revisé las 25 fichas reales para contar cuántas tienen HOY 2+ limitaciones simultáneas que
  disparen el hallazgo #2 (combinaciones tipo lumbar+tobillo) — se solapa con el trabajo que E2
  (Laura/Coach Pro) ya está haciendo sobre el contenido clínico del calentamiento en esta misma
  ronda, y no quise duplicar esfuerzo.
- No verifiqué "entrar sin red" con el navegador realmente desconectado (DevTools offline) — la
  conclusión de que es indiferente sale de que no hay ninguna llamada de red en la cadena, no de una
  prueba en vivo.

## Qué NO miré y por qué

- El contenido clínico de las listas de exclusión (`WARMUP_ZONE_EXCL_IDS`, `GEN_ZONE_EXCL`) — si
  falta algo por excluir o sobra algo excluido es responsabilidad explícita de E2 (Laura, veredicto
  vinculante en seguridad) según el briefing; solo usé esas listas como insumo para simular
  `buildWarmup`, sin juzgar si están completas.
- El editor del coach (`_rfWarmChip`, `renderRfWarmup`, `openWarmPicker`, `saveRoutine`) — es área
  de E3 (el constructor de rutinas y lo que no deja rastro).
- No repetí ninguna medición del baseline (34 piezas, 124 rutinas, 118 auto-derivadas, 503 sesiones
  sin rastro del calentamiento, los 9 falsos positivos) — se tomó como válido tal como pide el
  briefing.
- No corrí matrices de sabotaje ni usé el navegador compartido con los otros dos agentes de la
  ronda; todo lo escrito aquí se verificó leyendo `archivo:línea`, ejecutando extractos puros de
  `buildWarmup` y sus tablas en Node (sin montar la app), y una única consulta SQL de solo lectura
  contra `user_data.history`.
- No audité los otros 5 paneles/pestañas del coach ni del asesorado fuera del calentamiento — fuera
  del alcance de E1.
