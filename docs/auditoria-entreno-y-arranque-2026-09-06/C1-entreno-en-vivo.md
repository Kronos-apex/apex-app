# C1 · El entreno en vivo — Lucas Ortega (QA Funcional) + Mateo Sanín (Data)

## Veredicto en una frase
El 24,5% de sesiones sin cerrar no es (solo) que la gente no termine: **el botón para terminar
"a tiempo" no premia nada** — "Finalizar entrenamiento" temprano guarda el entreno pero jamás
muestra duración, calorías, celebración de récord, subida de nivel ni el pedido de activar
notificaciones (eso SOLO pasa si se llega al 100%), vive al final de todo el scroll, y usa un
diálogo nativo `confirm()` que este mismo repo ya diagnosticó como poco fiable en la app
instalada — por eso en 213 sesiones cerradas desde que existe el dato, solo **4** se cerraron por
ese camino.

## Los 3 más grandes

### 1 · "Finalizar entrenamiento" temprano es un cierre de segunda clase: no muestra NADA de lo que hace especial terminar un entreno
**Qué es:** hay dos caminos para cerrar una sesión — llegar al 100% de las series, o tocar
"Finalizar entrenamiento" con lo que se lleva. Solo el primero llama a `showWorkoutFinish()`
(`app-4-entreno.js:2254`, dentro de `updateClientProgress`), que es la única función que:
calcula y guarda `durationSec`/`kcal` (líneas 2405-2415), arma la lista de récords nuevos
(2249-2251, 2416-2418), decide si hay que celebrar una subida de nivel (2421-2432) y **pide
activar notificaciones push en "el momento de máximo compromiso"** (`renderWfPushNudge()`,
línea 2469 — comentario del propio código). El botón "Finalizar entrenamiento" del guiado
(`gmFinishEarly`, `app-6-extra.js:935-938`) llama a `finishSessionEarly()`
(`app-4-entreno.js:2328-2348`), que guarda el historial y cierra el overlay directo — **sin
llamar a `showWorkoutFinish` en ningún punto**. El único feedback es un toast
"✅ Entrenamiento guardado".

**A quién le pasa HOY:** a cualquiera que use ese botón. Verificado con los 4 casos reales de
toda la base (ver evidencia): 3 de los 4 quedaron sin `kcal` guardado, confirmando que ni
siquiera ellos vieron la pantalla de cierre. Y a las 47 personas-sesión que dejaron el entreno
abierto sin tocar nada — que es la inmensa mayoría — tampoco les llegó jamás el pedido de activar
push, que el propio equipo identificó como el momento de mayor conversión (`renderWfPushNudge`,
v325).

**Evidencia:**
- Código: `app-4-entreno.js:2244-2254` (única llamada a `showWorkoutFinish`) vs.
  `app-4-entreno.js:2328-2348` + `app-6-extra.js:935-938` (Finalizar temprano no la llama).
- SQL contra producción — dentro de las sesiones **sin cerrar** (`finishedAt IS NULL`), la
  presencia de `kcal` coincide EXACTAMENTE con haber llegado al 100% (0 excepciones en ningún
  sentido):
  ```
  has_kcal=false ⟺ ratio<100%   |   has_kcal=true ⟺ ratio=100%
  ```
- De las 4 sesiones de TODA la historia cerradas por "Finalizar temprano" (`finishedAt` con
  `doneSets<totalSets`), **3 no tienen `kcal`** — el cuarto caso es explicable por una edición
  posterior de la rutina, no por que el flujo temprano sí muestre el cierre.

**Cómo intenté tumbarlo:** busqué una segunda llamada a `showWorkoutFinish` o un `if` que la
disparara también desde `finishSessionEarly`/`gmFinishEarly` — no existe ninguna (grep completo
de `showWorkoutFinish(` en el repo: una sola invocación). Consideré que tal vez el pedido de push
viviera también en otro lado (por ejemplo, al cerrar el guiado) — grep de `renderWfPushNudge`:
una sola llamada, dentro de la función que nunca se ejecuta en este camino.

**Qué costaría arreglarlo:** extraer de `showWorkoutFinish` el cálculo de duración/kcal/PRs a una
función que ambos flujos puedan llamar (ya existe casi todo: `checkAndUpdatePRs` se llama en los
dos), y decidir un diseño de cierre — aunque sea más discreto que el de 100% — para
"Finalizar temprano" que SÍ muestre algo (duración, kcal, y el pedido de push). Es un cambio de
producto, no un one-liner: hay que decidir el tono de "terminaste antes de tiempo, igual cuenta".

---

### 2 · El botón que debería "cerrar honestamente" usa `confirm()`, la misma clase de fallo que este repo ya diagnosticó y corrigió en otro lado
**Qué es:** `finishSessionEarly()` (`app-4-entreno.js:2341`) pregunta con el diálogo nativo del
navegador: `if(done<total && !confirm(...))return false;`. El propio CLAUDE.md documenta, fechado
v568 (fotos de progreso, muy reciente), la razón por la que se ELIMINÓ `confirm()` del botón de
borrar una foto: *"`confirm()` está PROHIBIDO: bloquea el hilo y la PWA se lo come"* — se
reemplazó por un patrón de doble toque sobre el mismo botón. Ese arreglo no se propagó a
`finishSessionEarly`, que sigue usando `confirm()` sin cambios, y además puede encadenar un
**segundo** `confirm()` inmediatamente después si la rutina se reordenó ese día
(`offerKeepReorder()`, línea 2192, llamada en la línea 2347).

**A quién le pasa HOY:** a cualquiera que use la app instalada (que es como se recomienda usarla,
y como corre en la mayoría de teléfonos Android reales) y tenga menos del 100% de series hechas
al tocar "Finalizar entrenamiento".

**Evidencia:** `app-4-entreno.js:2341` (confirm sin arreglar) vs. `app-5-salud.js:1376-1385`
(mismo tipo de botón, ya arreglado, con el comentario explícito del porqué). Grep de `confirm(`
en `app-4-entreno.js` muestra 5 usos vivos, ninguno migrado al patrón de dos toques.

**Cómo intenté tumbarlo:** no tengo un Android real para reproducir el "se lo come" (el propio
equipo tampoco lo pudo reproducir para el caso del zoom de iOS, v526 — mismo tipo de límite).
Lo que SÍ pude confirmar con datos: el camino que depende de este `confirm()` casi no se usa (ver
hallazgo #3), lo cual es consistente con que esté fallando o generando fricción, pero **no es
prueba directa de que el diálogo falle** — puede ser simplemente que a nadie le importe tocar el
botón (ver hallazgo #1: no hay premio). Marco esto con la confianza que da el propio precedente
del repo, no con una reproducción mía.

**Qué costaría arreglarlo:** aplicar el mismo patrón de dos toques que ya existe y está probado
(`_photoAskDelete`) al botón "✓ Finalizar entrenamiento". Bajo, porque el patrón ya está escrito
y testeado en el mismo repo.

---

### 3 · Nataly (95% sin cerrar) no tiene un plan más largo que nadie — abandona sistemáticamente el mismo tramo del final
**Qué es:** medido ejercicio por ejercicio dentro de sus propias sesiones, el % de series que
completa CAE con la posición en la rutina: ejercicio 1-2 ≈ 90-100% completado, ejercicio 5-8 cae
hasta 0-33%. El control (Claudia Valbuena, 10% sin cerrar) NO muestra ese patrón: su ratio se
mantiene plano entre 93% y 100% en las 8 posiciones de su rutina. Y no es que Nataly tenga rutinas
más largas para justificar el abandono: las 5 personas comparadas (Nataly, Claudia, Luz, Astrid,
Kathe) tienen en promedio **la misma estructura — 4 rutinas de ~6-7 ejercicios cada una**.

**A quién le pasa HOY:** Nataly, con nombre — es el caso que ancla la ronda (20 de 21 sesiones
sin cerrar).

**Evidencia (SQL contra producción, historial completo de Nataly, agrupado por posición del
ejercicio dentro de la rutina):**
| posición | ratio promedio completado |
|---|---|
| 1ª (sentadilla/jalón/hip thrust) | 1.00 |
| 2ª | 0.82–1.00 |
| 3ª | 0.31–0.94 |
| 4ª | 0.29–0.67 |
| 5ª | 0.13–0.92 |
| 6ª–7ª | 0.00–0.29 |
| último (plancha/russian twist/dead bug) | **0.00** |

Control (Claudia, misma consulta): 1.00 · 0.96 · 0.96 · 0.94 · 0.93 · 0.96 · 0.86 · 0.86 — sin
declive. Sus sesiones empiezan siempre entre 9:00 y 9:56am y duran de 21 a 65 minutos (10
sesiones más recientes revisadas una por una) — consistente con que llega con un tiempo fijo
disponible y se va cuando se le acaba, sin importar cuánto le falte.

**Cómo intenté tumbarlo:** la hipótesis obvia era "sus rutinas son más largas" — medida y
descartada (mismo promedio de ejercicios por rutina que el resto). También consideré que el
patrón fuera un artefacto de CÓMO cuento "posición" (si el generador reordena ejercicios distinto
cada semana) — pero el declive se repite con nombres de ejercicio distintos en cada rutina de
ella (piernas, tren superior), así que es la POSICIÓN en el flujo, no un ejercicio puntual.

**Qué costaría arreglarlo (no es un bug de código, es una señal de coaching):** no hay nada que
"arreglar" en el software — es información para el coach: los últimos 2-3 ejercicios del plan de
Nataly (glúteo en polea, aductor/abductor, core) casi nunca se hacen. O se reordenan al principio,
o se acorta la rutina, o se le cambia el horario. Gratis, y accionable hoy.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | `showWorkoutFinish` (duración, kcal, PRs, subida de nivel, pedir push) solo corre al llegar al 100%; "Finalizar temprano" no la llama nunca | `app-4-entreno.js:2244-2254` vs `2328-2348`, `app-6-extra.js:935-938` | Sí — todo el que finaliza antes del 100% o deja la sesión abierta |
| 🔴 | `finishSessionEarly` usa `confirm()` nativo, clase de fallo ya diagnosticada y arreglada en otro botón del mismo repo (v568) | `app-4-entreno.js:2341` | Probable, sin reproducir en Android real |
| 🟡 | Solo 4 de 213 sesiones cerradas en toda la historia (desde 13-jul) usaron "Finalizar temprano" con éxito; 92% de las que no llegan al 100% simplemente quedan abiertas | SQL contra producción | Es el síntoma de #1+#2 |
| 🟡 | Nataly: abandono sistemático del tramo final de la rutina (declive medible por posición), sin que su plan sea más largo que el de otros | SQL, historial de Nataly vs control | Sí, Nataly — señal de coaching, no de código |
| 🟢 | `offerKeepReorder` puede encadenar un SEGUNDO `confirm()` justo después del de "Finalizar temprano" si hubo reorden/sustitución ese día | `app-4-entreno.js:2192`, `2347` | Baja frecuencia (requiere reorden + cierre parcial el mismo día) |
| 🟢 | `mood`/`feeling` aparecen mucho más en sesiones cerradas (38%/11%) que en abiertas (2%/1%) | SQL | Probable correlación (compromiso), no causalidad — ver «sospechas sin medir» |

## Lo que verifiqué y está SANO (con números)

- **El wake lock de los timers YA está arreglado y probado (v569).** Descanso, HIIT, isométrico y
  cardio piden y sueltan el candado de pantalla de forma idempotente
  (`reqWake`/`relWake`, `app-4-entreno.js:1891-1914`), con recuperación en
  `visibilitychange` y liberación en las 8 salidas revisadas de `app-6-extra.js` (líneas 303,
  334, 684, 944, 1153, 1207, 1218, 1307, 1562, 1609). No encontré ningún timer que pida el
  candado sin soltarlo en alguna salida.
- **El autoguardado escribe SIEMPRE a `localStorage` de forma síncrona antes de tocar la nube**
  (`sv()`/`_persistAuthUserDebounced`, `app-1-infra.js:890-941`), con reintento automático al
  reconectar (`online`), al ocultar la app (`pagehide`/`visibilitychange`) y al siguiente
  arranque (flag "sucio" persistido). La promesa "podés entrenar sin internet" se sostiene en el
  diseño: nunca hay una escritura que dependa de la red para no perderse.
- **Los récords (PRs) NO se pierden por no cerrar la sesión** — ya se calculan desde el guardado
  parcial (`_prsStashSession`, `app-4-entreno.js:2266`, fix de v483), no solo al terminar.
- **La racha, "entrenó hoy" del panel del coach, la barra de retención, el nivel de gamificación,
  `weeklyMissed` y el `trainedToday` del cron de notificaciones (`daily-notifs`) NO dependen de
  `finishedAt`/`sessionFinished`**: cuentan cualquier sesión por su FECHA
  (`weeklyActiveCount`/`clientsTrainedToday`/`retentionByDay`/`weekStreak`, `avi-core.js:2197-2263`
  y `:2537-2552`; `gxLevel` cuenta `hist.length`, `app-4-entreno.js:576-578`; `daily-notifs`
  usa su propio `trainedToday` por fecha, `supabase/functions/daily-notifs/index.ts:315-319`).
  Una persona que abandona a mitad NO pierde su racha ni su nivel, y la app no le manda por error
  un push de "te extrañamos" el mismo día.
- **"¿Se puede llegar al 100% sin que la app lo registre?" — HOY no.** Encontré 17 sesiones con
  `doneSets>=totalSets` y `finishedAt` nulo, pero las 17 caen en la ventana **2026-07-14 a
  2026-07-17** — justo cuando se desplegó v367 (13-jul), que introdujo el campo. Cero casos desde
  el 18-jul (verificado con `count(*)=0` contra el rango completo hasta hoy). Es un artefacto de
  la migración del campo, no un defecto vivo — y además, `sessionFinished()` (la función que usa
  el resto de la app) trata `doneSets>=totalSets` como terminado aunque falte el flag, así que
  ni siquiera esos 17 casos históricos afectan hoy a la racha/nivel/tarjeta "ya entrenaste".

## Sospechas sin medir

- El `confirm()` de "Finalizar temprano" (hallazgo #2) — tengo el precedente del propio repo y el
  patrón de uso (casi nadie lo completa con éxito), pero no una reproducción directa en un
  Android/TWA real fallando en vivo.
- La correlación mood/feeling con sesión cerrada podría ser causal en cualquier dirección, o
  ninguna: puede que declarar ánimo simplemente sea una señal de mayor compromiso, el mismo rasgo
  que hace que alguien también llegue al 100%. No medí si mostrar el selector de ánimo cambia la
  tasa de cierre.
- No medí si el patrón de Nataly (declive por posición) se repite en las otras 8-9 personas con
  sesiones sin cerrar (Andres/coach 26%, Natalia Martinez 32%, Astrid 16%) — solo comparé Nataly
  contra un control (Claudia). Es plausible que el mismo patrón "siempre se hace lo primero,
  nunca lo último" sea general y no exclusivo de ella, pero no lo verifiqué persona por persona.

## Qué NO miré y por qué
- El generador de rutinas y el catálogo de ejercicios — es mandato de A4-deportivo.
- El arranque/registro (C2) y el panel del coach (C3) — son las otras dos áreas de esta ronda.
- Comunidad (`communityWorkoutPayload`, que exige `sessionFinished` para poder compartir un
  entreno al muro) — está CONGELADA por decisión del PO; solo confirmé que depende
  correctamente de `sessionFinished` y no profundicé más.
- No reproduje en un dispositivo Android/TWA real el comportamiento de `confirm()` (hallazgo #2)
  — no hay banco de pruebas físico disponible, mismo límite que el equipo ya declaró para el
  zoom de iOS (v526).
- No recorrí las 8-9 personas restantes con sesiones sin cerrar una por una con el mismo detalle
  que a Nataly y Claudia — prioricé profundidad en el caso ancla (Nataly) y un control (Claudia)
  sobre amplitud en las demás, dado el presupuesto de la ronda.
