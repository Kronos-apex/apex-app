# D3 · Cargas y el fondo del detalle del asesorado — Mateo Sanín (Data) + Valentina Ríos (PM)

## Veredicto en una frase

**«Cargas» no muestra récords: muestra el número de la última sesión sin decirlo, así que en 1 de cada 3 ejercicios miente sobre si la persona subió o bajó** — y aparte de eso, hay dos superficies enteras del detalle que hoy no le sirven al coach para nada: no ve ni una foto de progreso (0 en todo el panel) y el motor que SÍ sabe quién está estancado (`shockTargets`) nunca llega a la pantalla que agrega a los 25 asesorados. El coach que quiere decidir a quién subirle el peso esta semana no lo lee en una pantalla: lo tiene que reconstruir abriendo ficha por ficha, y aun así el primer número que ve puede estar equivocado.

## Los 3 más grandes

### 1 · «Cargas» pinta el peso de la ÚLTIMA sesión como si fuera el récord — y en 33% de los ejercicios NO coincide

**Qué es.** El número grande de cada fila en el panel Cargas (`renderProgressPanel`, `app-2-login.js:1021-1094`) es `fmtMetric(lastKg,unit)`, donde `lastKg = pts[pts.length-1].maxKg` — el peso máximo de la **sesión más reciente**, no el récord. No lleva ninguna etiqueta («actual», «récord», nada): se pinta solo, en negrita, como si fuera EL número del ejercicio. Debajo, la flecha de tendencia (↑/↓) compara esa misma última sesión contra la PRIMERA sesión de toda la historia (`app-2-login.js:1064-1067`), no contra el récord ni contra el mes en curso.

**Por qué pasa esto (causa raíz, no síntoma).** `loadCoachClients` (`app-1-infra.js:300-308`) solo trae `history`/`routines`/`profile`/`bodyweight` de los 25 asesorados de una vez; `prs` (los récords reales) se cargan **solo cuando el coach abre la ficha de ESE cliente** (`_ensureClientHeavy`, `app-3-coach.js:939-948`, llamado desde `showClientDetail` en `app-3-coach.js:1679`). El panel Cargas nunca llama a `_ensureClientHeavy` para nadie — así que cuando el coach entra directo a «Cargas» (está en la barra inferior, a un toque de Inicio), `DB.prs` está VACÍO para todo el que no haya abierto su ficha en esa sesión. Por eso el panel no pudo construirse sobre `ax_pr`: se construyó sobre `history`, que sí llega completo. Es una limitación de arquitectura, no una elección de diseño consciente.

**A quién le pasa HOY, con nombre.**
- **Astrid Beltran — Sentadilla con Barra**: Cargas muestra **4,5 kg** con flecha ↓ (−35,5 kg desde el inicio). Su récord real es **42,5 kg**, logrado 5 días antes (27-ago). La sesión del 1-sep fue una sesión real y cerrada (`finishedAt` presente), con el calentamiento correcto en 70 kg, pero las series de trabajo quedaron anotadas en 4,5 kg (dos vacías). El coach que entra a Cargas ve a Astrid "desplomada" en su sentadilla cuando en realidad acaba de marcar su mejor peso.
- **Claudia Valbuena y Luz Rodríguez — Prensa de Pierna**: las dos muestran el MISMO patrón: primera sesión 30 kg, récord real 70 kg, última sesión **8 kg** → Cargas pinta "↓ bajando 22 kg" para ambas.
- Otros 11 casos más del mismo tipo, repartidos en 8 de las 11 personas activas (lista completa en «Todos los hallazgos»).

**Medido (control de cobertura: 241 ejercicios en kg de las 11 personas con récords reales, computados con la función REAL de la app `computeExerciseProgress`, corrida en Node contra sus datos de producción):**
- **80 de 241 (33%)** muestran en Cargas un número DISTINTO al récord real.
- **14 de esos 80** están clasificados como "↓ bajando" pese a que el récord real SUPERA la primera sesión (o sea: hubo progreso real y la pantalla lo cuenta como retroceso).
- El «Récords» (`ax_pr`, tarjeta `#d-prs` en la ficha) sí coincide con el récord calculado del historial en **200 de 217 casos (92%)** — es decir, `ax_pr` es la fuente confiable; Cargas simplemente no la usa.

**Cómo intenté tumbarlo.** Pensé que esto podía ser ruido normal de entrenamiento (días más livianos, series de técnica) y no un defecto de pantalla — es cierto que NO es un bug en el sentido de "dato corrupto": cada número que muestra viene de una sesión real. El problema no es el dato, es la ELECCIÓN de qué dato mostrar como titular y cómo se rotula. Confirmé que el mismo ejercicio, en la MISMA sesión del coach, se ve BIEN en otras dos pantallas: la tarjeta «Récords» (`ax_pr` directo) y, en el perfil del propio asesorado, la tarjeta «Progreso por ejercicio» SÍ distingue «Inicio», «Actual» y «Récord» por separado (`app-4-entreno.js:958-964`). Solo Cargas mezcla los dos conceptos en un solo número sin aviso.

**Qué costaría arreglarlo.** Dos caminos, ninguno estructural: (a) que el headline muestre el récord (que ya vive en `ax_pr` para quien tenga la ficha abierta, y se puede pre-cargar en lote con una sola consulta a `prs` para los 25 en vez de una por cliente) con la última sesión como dato secundario, etiquetados los dos; (b) si se conserva la última sesión como titular, ponerle la palabra «Actual» al lado y una segunda línea con el récord, tal como ya hace la tarjeta del propio asesorado.

---

### 2 · El récord (`ax_pr`) se puede quedar atascado meses — y de ahí sale el peso que la app le sugiere a la persona

**Qué es.** `ax_pr` es la fuente que TODAS las pantallas (Cargas indirectamente no, pero sí «Récords» del coach, «Mis récords» del asesorado, y el motor `suggestFromPR` que decide qué peso proponerle a alguien en su próxima sesión) dan por buena. El 92% de las veces coincide con lo que el historial demuestra. El 8% restante (17 de 217 récords comparables) NO coincide, y en 11 de esos 17 casos el desfase es en la cuenta del propio Andrés Martínez (el coach entrenando "Mi entrenamiento").

**A quién le pasa HOY, con nombre.** **Nataly — «Curl Femoral Acostado en Máquina»**: su récord dice **20 kg**, fechado **25-may-2026**. Su historial de sesiones muestra que hizo **30 kg × 15 reps, marcadas "done"**, el **25-jul** y otra vez el **4-ago** (verificado con SQL directo contra `user_data.history`, sesión completa incluida abajo). Esas dos sesiones de 30 kg nunca actualizaron su récord. Hoy, 4 meses después del salto real, tanto el coach (tarjeta «Récords») como ella misma (su lista de PRs) siguen leyendo 20 kg — y si el motor de sugerencia de carga (`suggestFromPR`) usa ese número, le puede estar proponiendo MENOS peso del que ya demostró levantar.

```sql
-- Sesión real de Nataly, 2026-07-25, e15 (Curl Femoral Acostado en Máquina):
-- sets: [{"kg":"20","done":true},{"kg":"30","done":true},{"kg":"30","done":true}]
-- ax_pr[e15] hoy: {"kg":20,"date":"2026-05-25T16:34:34.362Z", ...}
```

El código de `checkAndUpdatePRs` (`app-4-entreno.js:359-390`) SÍ está diseñado para escribir el récord en cuanto se marca una serie (arreglo de v483, ya documentado: «los récords van también en el guardado parcial, no solo al terminar»). Eso significa que en algún momento su dispositivo sí escribió 30 kg — y algo posterior lo devolvió a 20. La arquitectura offline-first de AVI ya tiene esta clase de bug documentada extensamente en `CLAUDE.md` (aparece en el peso corporal v448/v511, en el perfil del coach v509, en `deload` v512): **un dispositivo con `localStorage` viejo que vuelve a sincronizar pisa el dato bueno con el dato viejo.** No pude reproducir el mecanismo exacto (necesitaría los `updated_at` de cada escritura, que no quedan versionados), pero el síntoma es exactamente el de esa familia de bugs, aplicado por primera vez a `ax_pr`.

**Cómo intenté tumbarlo.** Verifiqué que no fuera un problema de identidad de ejercicio (un récord duplicado bajo el nombre en vez del id, la clase de bug de v484): no existe entrada `prs['Curl Femoral Acostado en Máquina']`, solo `prs['e15']`, y es la misma clave que usa el historial. Verifiqué que no fuera una corrección manual del coach (`coachEditPR`): el objeto no tiene el campo `corregido` que deja esa función. Descarté ambas causas conocidas; lo que queda es la más simple y la más grave: el número bueno se escribió y se perdió.

**Qué costaría arreglarlo.** Esto no se arregla tocando la UI — hay que rastrear el `updated_at` de la fila de Nataly en las fechas cercanas al 25-jul/4-ago para confirmar el mecanismo (¿hubo un segundo dispositivo, o una reinstalación?). Si se confirma la hipótesis, la clase de arreglo ya existe en el repo (auto-cura del lado del cliente que RECONSTRUYE `ax_pr` desde `history` al arrancar, tomando siempre el máximo, nunca al revés) — es la misma familia de solución que ya se aplicó a otros campos.

---

### 3 · El coach no ve NINGUNA foto de progreso — en ningún panel, de nadie

**Qué es.** Busqué exhaustivamente toda referencia a `DB.photos` en el código (`grep -rn "DB.photos" *.js`, 20 resultados). Las únicas que RENDERIZAN algo visible son `renderPhotosClient` (`app-5-salud.js:1340`, pintada en `#cn-photos-grid`) y un fallback legado en `app-6-extra.js` — **las dos viven exclusivamente en la pantalla del ASESORADO** (`#cn-profile`). El detalle del coach (`#p-detail`, `index.html:538-638`) tiene secciones para rutinas, mensajes, historial, la historia para redes (`#d-story`), progreso por ejercicio (`#d-exprog`), plan nutricional (`#d-nut-wrap`) y medidas corporales (`#d-med-wrap`) — **no existe ningún `#d-photos` ni equivalente**. Tampoco aparecen fotos en «Cargas», en la lista de asesorados, ni en la historia para Instagram/WhatsApp (`clientProgressStory`, que arma su relato solo con récords de peso, nunca con imágenes).

**A quién le pasa HOY, con nombre.** Samuel Cifuentes tiene **5 fotos** de progreso guardadas; el propio coach (Andrés, en su cuenta de "Mi entrenamiento") tiene **2**; Miguel Pulido **2**; Luz Rodríguez, Nicolás y jhojan **1 cada uno**. Ese material EXISTE en `user_data.photos` — se sube, se guarda, sobrevive un borrado con lápida (v568, verificado sano más abajo) — y **nadie del lado del coach lo ve jamás**. No hay comparación antes/después posible porque no hay "después" visible: solo el propio asesorado ve sus fotos, solas, en su perfil.

**Cómo intenté tumbarlo.** Pensé que quizás vivían en alguna pantalla que no fuera `p-detail` — revisé `p-clients`, `p-home`, el modal de historia (`d-story`) y el propio flujo de "Corregir récord". Ninguno las toca. También pensé que quizás el coach pudiera abrir el perfil del asesorado COMO si fuera él (vía "Mi entrenamiento" u otra puerta) — eso solo aplica a la cuenta del propio coach sobre sí mismo, no le da acceso a ver las fotos de un asesorado desde su rol de coach.

**Qué costaría arreglarlo.** Es una sección nueva, no un fix: agregar un bloque de fotos (grid simple, quizás con selector de "antes"/"después" tipo slider) al lado de `#d-med-wrap` en `p-detail`, reusando `photoLive`/`DB.photos[id]` que ya trae `_ensureClientHeavy`. El material para las 6 personas que sí tienen fotos ya está ahí, esperando.

---

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | «Cargas» pinta el peso de la última sesión (sin etiqueta) como titular, no el récord — 33% de 241 ejercicios kg no coincide, 14 casos marcados "↓ bajando" siendo progreso real | `app-2-login.js:1021-1094` (`renderProgressPanel`) | Sí — Astrid (sentadilla 4,5 vs 42,5 kg), Claudia y Luz (prensa 8 vs 70 kg), y 8 más |
| 🔴 | `ax_pr` puede quedarse atascado meses por la misma clase de bug de sincronización offline-first ya documentada en el repo (17 de 217 récords, 92% sanos) | `app-4-entreno.js:359-390` (`checkAndUpdatePRs`) + arquitectura `sv()`/localStorage | Sí — Nataly, Curl Femoral: PR dice 20kg de mayo, hizo 30kg en jul/ago dos veces |
| 🔴 | El coach no tiene NINGUNA vista de fotos de progreso: 0 en `p-detail`, 0 en Cargas, 0 en la historia para redes | Ausencia confirmada en `index.html:538-638`, `app-3-coach.js` | Sí — 6 personas con fotos guardadas y cero visibilidad para el coach |
| 🔴 | El peso corporal nunca se pide ni se recuerda: 7 de 26 personas (no 3) tienen CERO pesajes, incluida Luz Rodríguez (48 sesiones, activa); el resto tiene 1 pesaje viejo (hasta 103 días) sin ninguna señal de "hace cuánto" | `app-4-entreno.js:260-289` (`logBodyWeight`), sin equivalente a `medReminder` (avi-core.js:4061) | Sí — Astrid, Samuel y Claudia calculan macros/TDEE y perfil de carga con un peso de 3+ meses, sin aviso |
| 🟡 | El motor de estancamiento (`shockTargets`, ya construido y probado desde v354-356) nunca aparece en «Cargas» — la única pantalla que agrega a los 25. Solo se ve en Inicio (`#h-pulse`, tope 5 filas, 1 señal por persona) o abriendo cada ficha (`#d-shock`) | `avi-core.js:8506+` vs `app-2-login.js:1021` (Cargas no lo llama) | Parcial — 10 de 11 activos tienen ≥1 ejercicio con 3+ sesiones seguidas al mismo peso, con nombre propio (tabla abajo) |
| 🟡 | «Cargas» ordena a los 25 asesorados por orden de creación (no alfabético, no por atención) y a los ejercicios por cantidad de datos (no por músculo ni alfabético) — sin buscador. Responder "¿Astrid subió en sentadilla?" exige ≥3 toques + 2 búsquedas visuales | `app-2-login.js:1027,` `avi-core.js:8166` (`.sort((a,b)=>b.points.length-a.points.length)`) | No es un bug, es fricción — sin víctima puntual, pero mide la promesa de la pregunta de negocio del brief |
| 🟢 | El botón "Ajustar" (cambiar series/reps desde Cargas) empareja por NOMBRE contra las rutinas vigentes — 74 de 337 ejercicios con progreso (22%) no tienen ninguna rutina actual con ese nombre exacto, así que el botón simplemente no aparece | `app-2-login.js:1069-1078` | No — es esperable: rutinas viejas rotan ejercicios; no confirmé ningún caso de rename accidental |
| 🟢 | "¿11 días de nutrición?" — NO es una cifra de uso: es el número de CLAVES del objeto de plan (`fat,goal,kcal,plan,prot,avoid,carbs,meals,water,examples,updatedAt`=11), confirmado con `jsonb_object_keys` sobre las 26 filas: 14 con 11, 12 con 0. El baseline del orquestador midió mal esta columna | SQL directo, ver abajo | No es un hallazgo de producto — es una corrección al propio baseline de esta ronda |
| 🟢 | La tarjeta de adherencia de comida del coach (`d-foodlog`) exige registros en los últimos 7 días — hoy nadie ha registrado desde el 13-ago, así que la tarjeta está invisible para las 25 personas ahora mismo | `app-3-coach.js:2763-2795` | No es nuevo — coincide con la decisión ya tomada de congelar Registro de Alimentos |

## Lo que verifiqué y está SANO (con números)

- **El borrado de fotos con lápida (v568) funciona**: revisé `photoDelete`/`tombDelete` (`avi-core.js`) y confirmó el patrón de tombstone ya blindado por 25 tests y 24 sabotajes según el propio changelog — no encontré ninguna foto "resucitada" en los datos de las 6 personas con fotos.
- **El 92% de los récords (`ax_pr`) coinciden exactamente con el máximo real del historial** (200 de 217 comparados, calculado con la función real `computeExerciseProgress` corrida en Node contra los datos de producción de las 11 personas activas) — la fuente de verdad de récords está mayormente sana; el defecto es puntual, no sistémico.
- **La tarjeta «Progreso por ejercicio» del propio asesorado (`renderExerciseProgressInto`, `app-4-entreno.js:924-968`) SÍ distingue «Inicio», «Actual» y «Récord» con etiqueta explícita** — el patrón correcto YA EXISTE en el código, solo no se usó en Cargas.
- **El motor de sugerencia de carga y el detector de estancamiento (`shockTargets`) SÍ funcionan cuando se les da la oportunidad**: corrí `shockTargets` (avi-core.js) contra el historial real de las 11 personas activas y devolvió resultados coherentes (modo "multi" con 1-2 ejercicios) para 6 de 11 — la ausencia en Cargas es de EXPOSICIÓN, no de que el motor esté roto.
- **`_flCoachDetalleHtml`/`renderCoachFoodLogCard` calculan bien la adherencia cuando hay datos** (revisé la lógica de franja y desvío) — el problema de nutrición es de adopción (ya congelada por decisión del PO), no de cálculo.

## Sospechas sin medir

- **¿El mecanismo exacto detrás del récord atascado de Nataly (Q2, hallazgo #2) es una sincronización de dos dispositivos?** No pude confirmarlo sin ver `updated_at` histórico de sus escrituras (Supabase no versiona el valor anterior de un `jsonb`). Sospecho una reinstalación de la app o un segundo teléfono con localStorage viejo, por la misma clase de bug ya documentada para peso corporal y perfil.
- **¿Cuántos de los "récords atascados" restantes (los otros 5 de los 17, fuera de la cuenta del coach) son el mismo mecanismo?** No los rastreé uno por uno por presupuesto de tiempo; la muestra (17 casos, 11 en una sola cuenta) sugiere que podría concentrarse en quien más cambia de dispositivo, pero no lo verifiqué con datos de `push_subscriptions`/dispositivos.
- **¿El botón "Ajustar" desde Cargas falla en algún caso real por RENOMBRE del ejercicio (no solo por rotación de rutina)?** Medí que 22% no tiene match, pero no separé "el ejercicio ya no está en el plan" (esperable) de "está, pero con otro nombre" (sería un bug real, clase v546/v558). Necesitaría cruzar ids, no solo nombres, y no me alcanzó el presupuesto.

## Qué NO miré y por qué

- **`avi_showcase` / la vitrina pública**: ya auditada y con reglas propias (v555); no la toqué porque no es parte del detalle del coach.
- **El editor de nutrición (`openNutModal`) y el motor del plato**: explícitamente fuera de alcance por decisión del PO (registro de alimentos congelado, nutrición cerrada como feature).
- **Medidas corporales como feature**: ya decidida y con corte al 28-oct; solo miré cómo el coach las VE (confirmé que `renderMedidasCoach`/`d-med-preview` funcionan con el patrón `medLive` sano, sin profundizar más).
- **Las otras 14 personas sin récords/actividad real**: el análisis cuantitativo (los 241 ejercicios, los 217 récords comparados) se hizo solo sobre las 11 personas con historial real, siguiendo el baseline del brief — las 14 restantes tienen 0-7 puntos de datos, insuficiente para ningún patrón (Mateo: N<10 no concluye).
- **El flujo completo de `checkAndUpdatePRs` en vivo (con harness CDP/navegador)**: no lo reproduje interactuando con la app real porque el brief pide priorizar código+SQL (otro agente puede estar usando los puertos 8829/9349); el hallazgo #2 se sostiene en datos de producción + lectura de código, no en una repro en vivo.
- **`p-templates`, `p-exercises`, `p-msgs`**: fuera del mandato de D3 (cubiertos por D1/D2).
