# V2 — Pantallas y memoria durante el uso (16.ª ronda, R16, 2026-09-28)

Área de Lucas (QA funcional). Mide con CDP CPU ×4 (`Emulation.setCPUThrottlingRate`) y el
`PerformanceObserver` de tareas largas (`longtask`, > 50 ms) qué toques y pantallas hacen
esperar a un teléfono de gama media MIENTRAS SE USA la app — el arranque es de V1.

Sondas nuevas (no tocan ningún archivo de la app):
- `scripts/e2e/_r16-v2-cliente.mjs` — el lado del asesorado: guiado, historial, perfil,
  comunidad, la habitación de un ejercicio, memoria y las 4 funciones puras.
- `scripts/e2e/_r16-v2-coach.mjs` — el panel del coach con 28 asesorados sintéticos.

Todo montado EN LOCAL con datos inventados (la escritura a la nube está sellada en
localhost, v298); nada tocó producción. Puertos usados: 8885/9490 y 8886/9491.

---

## Resumen en 5 líneas

El coach —la persona que más usa AVI cada día— es quien más golpea el freno: su panel
«Cargas» (28 asesorados) tarda **hasta 1,9 segundos** en un teléfono de gama media y deja el
hilo principal **congelado más de un segundo de un solo tirón** (nada responde al tacto en
ese momento); abrir la ficha de su asesorado con más historial cuesta lo mismo. En el lado
del asesorado, cada toque para marcar una serie del entreno de hoy tarda **110-350 ms**
según cuánto historial acumule esa persona — por encima del umbral de "se siente lento" ya
con un historial mediano, y el causante es una cuenta que se recalcula ENTERA en cada toque cuando podría calcularse una
sola vez. No se encontró fuga de memoria medible en 20 ciclos de navegación repetida, aunque
la prueba es corta. La causa en los hallazgos de arriba es la misma familia: una cuenta que
barre TODO el historial (o los 28 historiales) se repite más veces de las que hace falta.

---

## Hallazgos

### H1 — El panel «Cargas» del coach congela el teléfono más de un segundo (🔴 el más serio)

**Medición.** `node scripts/e2e/_r16-v2-coach.mjs`, teléfono de gama media (CPU ×4), 28
asesorados sintéticos con la misma distribución de historial que el baseline (3 pesados
~220 sesiones/~340 KB de JSON, 10 medianos ~70 sesiones/~95 KB, 15 casi sin uso ~12
sesiones/~14 KB — 2,18 MB de historial en total, calcado de «3 asesorados con 191/178/175 KB
y una mitad que casi no entrena»). Abrir «Cargas» (`gp('p-progress')` + `renderProgressPanel()`):

| corrida | tiempo total | tarea más larga (bloquea el hilo) |
|---|---|---|
| 1 | 1.469 ms | 1.124 ms |
| 2 | 1.400 ms | 1.229 ms |
| 3 | 1.872 ms | 1.624 ms |

**CONTROL que lo tumba o lo confirma:** los MISMOS 28 asesorados con 2 sesiones cada uno
(69 KB de historial en total en vez de 2,18 MB) → **324 ms**, tarea más larga 165 ms. El
costo cae **4-6×** al vaciar el historial y NO al reducir la cantidad de asesorados (siguen
siendo 28): la causa es el TAMAÑO del historial, no el número de fichas.

**A quién afecta.** Al coach, cada vez que abre «Cargas» — y es una pantalla que él mismo
pidió para ver quién se estancó. Con 28 asesorados reales hoy (creciendo), y su PROPIO
historial (533 KB de fila, 224 KB de historial — el más pesado de todos, cuenta como un
asesorado más en este panel) es probablemente el caso peor de producción ahora mismo.

**Causa en el código.** `renderProgressPanel()` (`app-2-login.js:1086-1107`) recorre
`DB.clients` y para CADA UNO llama `buildExerciseProgress(c.id)` (`app-2-login.js:929-933`,
que es `computeExerciseProgress(DB.history[clientId])`, `avi-core.js:9811`) y
`stalledExercises(c, DB.history[c.id], now)` — las dos recorren el historial COMPLETO de esa
persona, y las dos vuelven a construir `exerciseIdentity(history)` (`avi-core.js:9764`) por
dentro. Con 28 personas y un historial que crece sin límite hasta 365 sesiones cada una, el
costo es O(asesorados × su historial), y esto corre TODO de una vez, en el hilo principal,
la primera vez que se abre la pestaña.

**Propuesta.** Paginar o diferir: pintar primero solo los asesorados con historial reciente
(los que entrenaron esta semana — que ya es la métrica que usa `renderHome`) y calcular el
resto en tandas con `requestIdleCallback`/`setTimeout` entre asesorado y asesorado, para que
el hilo principal respire entre cada uno. Ganancia estimada: la tarea más larga bajaría de
~1,1-1,6 s a los ~150-300 ms de UN SOLO asesorado pesado (mismo orden que abrir su ficha
individual, H2) — el bloqueo de "app congelada" desaparece aunque el trabajo total tarde lo
mismo repartido. Riesgo: la lista tarda unos segundos en completarse visualmente (hay que
decirlo con un indicador, no dejar huecos en silencio); y el filtro `_progFilter` que ya
existe tendría que operar sobre lo cargado hasta el momento, no sobre la lista completa.

---

### H2 — Abrir la ficha del asesorado con más historial cuesta lo mismo que congelar el panel entero

**Medición.** Mismo teléfono (CPU ×4), mismo montaje. `openDetail('qa-coach28-0', true)`
sobre el asesorado con 220 sesiones (~340 KB de historial):

| corrida | tiempo total | tarea más larga |
|---|---|---|
| 1 | 1.971 ms | 1.378 ms |
| 2 | 1.774 ms | 1.319 ms |
| 3 | 1.266 ms | 1.012 ms |

**CONTROL:** el MISMO asesorado con 2 sesiones en vez de 220 → **246 ms**, tarea más larga
64 ms (7-8× más rápido). Confirma que es el historial DE ESA PERSONA, no el resto del panel.

**A quién afecta.** Al coach, cada vez que toca a su asesorado más constante (el que más
entrena es, casi por definición, el que más historial acumula — no es un caso raro, es a
quien más veces va a entrar). Y al coach consigo mismo: «Mi entrenamiento» abre la MISMA
ficha con SU propio historial, que hoy es el más pesado de todos (224 KB).

**Causa en el código.** `openDetail` termina llamando, entre otras cosas,
`renderCoachExProgress` (`app-2-login.js:1066-1073`, que vuelve a llamar
`buildExerciseProgress`) y `renderVolChart`/gráficas de la ficha — todas O(historial de esa
persona), sin recorte ni paginación de sesiones antiguas.

**Propuesta.** Las gráficas y el progreso por ejercicio solo necesitan una VENTANA reciente
para ser útiles (la doble progresión ya solo mira las últimas 3 sesiones, v610); limitar
`computeExerciseProgress`/`exercisePerfSeries` a, por ejemplo, los últimos 120 días o 60
sesiones al ABRIR la ficha, con un botón «ver todo el historial» aparte para quien lo
necesite. Ganancia estimada: si el costo escala ~linealmente con sesiones (340 KB→1,3 s vs
2 sesiones→0,25 s), acotar a ~60 sesiones debería bajar la tarea más larga a un rango similar
al del control, unos 150-300 ms. Riesgo: alguien que SÍ quiere ver su progreso de hace 8
meses tiene que pedirlo con un toque de más — hay que decidir el corte con Coach Pro/Andrés,
no es solo una decisión de rendimiento.

---

### H3 — Marcar una serie en el guiado tarda de 110 a 350 ms, y crece con el historial

**Medición.** `node scripts/e2e/_r16-v2-cliente.mjs`, teléfono de gama media (CPU ×4). Tocar
`gmToggleSet` (el ✓ de una serie) en una rutina de 5-7 ejercicios:

| historial de la persona | tamaño del historial (JSON) | marcar 1 serie | marcar 2ª serie |
|---|---|---|---|
| 5 sesiones (CONTROL) | 10 KB | 108-108 ms | 130-131 ms |
| 90 sesiones (típico) | 141 KB | 119-175 ms | 139-176 ms |
| 365 sesiones (peor caso) | 755 KB* | 180-345 ms | 163-258 ms |

*(*) el peor caso construido aquí — 365 sesiones × 7 ejercicios × 4 series con todos los
campos — pesa MÁS que la fila más pesada real del baseline (220 KB): es a propósito un techo
por encima de lo peor que hay hoy, para no subestimar. El caso «típico» (141 KB de
historial) es más representativo de lo que ya vive en producción.*

Incluso el CONTROL con historial casi vacío (5 sesiones) ya está en el borde de los 100 ms:
hay un costo BASE de ese toque bajo CPU ×4 que no depende del historial, y encima de ese
piso se suma un costo que SÍ crece con el historial (hasta +230 ms en el peor caso).

**A quién afecta.** A cualquiera que entrena — es el toque que se repite más veces por
sesión (una vez por cada serie de cada ejercicio, típicamente 15-25 veces por entreno). Con
90-365 sesiones acumuladas (los asesorados más constantes, que son a quienes más les importa
que la app no se sienta pesada), cada toque roza o pasa el umbral de "se siente lento".

**Causa en el código.** `gmToggleSet` (`app-6-extra.js:1552`) llama `updateClientProgress`
(`app-4-entreno.js:2565`), que en CADA toque (no solo al terminar) llama
`saveSessionToHistory(routine, totalVol, done, false)` (`app-4-entreno.js:2608`). Esa función
recorre TODOS los ejercicios de la rutina (`app-4-entreno.js:2619`) y por cada uno con barra
por defecto llama `sessionBarKg` → `exerciseBarKg(history, ex)` (`app-4-entreno.js:2003`,
`avi-core.js:1509`), que internamente reconstruye `exerciseIdentity(history)`
(`avi-core.js:9764`) DESDE CERO — una pasada completa por todo el historial — **una vez POR
CADA ejercicio con barra de la rutina, en cada toque**. Medido directo sobre el historial de
365 sesiones: `exerciseBarKg` llamada una vez por cada uno de los 3 ejercicios con barra de
la rutina cuesta 30-51 ms solo en eso (`exerciseBarKg_porRutina` en la sonda) — y ese cálculo
da el MISMO resultado en las dos series seguidas del mismo entreno, porque el historial no
cambió entre un toque y el siguiente.

**Propuesta.** Calcular `exerciseIdentity(history)` UNA sola vez al entrar al guiado (cuando
se carga `GM.routine`) y reusar ese mismo mapa (`keyOf`/`nameOf`) durante toda la sesión, en
vez de que cada llamada a `exerciseBarKg` lo reconstruya. Es un cambio de bajo riesgo (la
función ya es pura y determinista sobre el MISMO historial; el historial de esta sesión solo
cambia cuando se guarda esta MISMA sesión, así que se puede invalidar el caché ahí). Ganancia
estimada: elimina la reconstrucción repetida — de los 30-51 ms medidos por toque en el peor
caso a prácticamente el costo de una consulta a un mapa ya armado (< 1 ms), es decir baja
entre 30 y 50 ms de los ~250-350 ms totales de un toque en el peor caso (10-15%). No resuelve
todo el toque —queda el resto de `saveSessionToHistory` y el trabajo de DOM— pero es la parte
más barata de arreglar porque no cambia ningún resultado, solo evita repetir el mismo cálculo.
Riesgo: bajo — hay que invalidar el caché si `DB.history[clientId]` cambia por otra vía
mientras el guiado está abierto (por ejemplo, una sincronización de otro dispositivo).

---

### H4 — `gmRender` (el repintado completo "por diseño") sí cruza el umbral con historial real

**Medición.** Llamar `gmRender()` directo (lo que dispara cambiar de ánimo, reordenar un
ejercicio, sustituirlo o reportar dolor — no el toque de marcar serie, que NO repinta todo):

| historial | gmRender() completo |
|---|---|
| 5 sesiones (control) | 252 ms |
| 90 sesiones (típico) | 139-203 ms |
| 365 sesiones (peor caso) | 325-561 ms |

El baseline dice que `gmRender` repinta todo "por diseño" y que **solo es hallazgo si se
mide > 100 ms con CPU ×4** — se midió, y con CUALQUIER cantidad de historial (incluso el
control casi vacío) ya pasa los 100 ms; con 365 sesiones pasa el medio segundo.

**A quién afecta.** A cualquiera que cambia de ánimo a mitad de entreno, reporta dolor,
reordena o sustituye un ejercicio — son acciones puntuales (no en cada serie), pero cuando
pasan, el teléfono se congela un rato perceptible.

**Causa en el código.** `gmRender()` (`app-6-extra.js:735`) reconstruye el DOM de la lista
entera y, por cada ejercicio, llama `_progressInfo(ex)` (`app-4-entreno.js:2036`), que a su
vez llama `loadAnchor(pr, history, exKey)` (`avi-core.js:1753`) y `sessionsAtLoad(history,
exKey, kg, reps)` (`avi-core.js:1628`) — las dos recorren el historial COMPLETO, UNA VEZ POR
CADA EJERCICIO de la rutina, en cada repintado. Con 7 ejercicios y 365 sesiones eso es 7
pasadas completas por el historial, más el costo de reconstruir cada tarjeta del DOM.

**Propuesta.** Misma familia que H3: memoizar por ejercicio (clave = id del ejercicio + hash
corto del historial, o simplemente "válido mientras dure esta sesión del guiado") el
resultado de `_progressInfo` en vez de recalcularlo en cada `gmRender`. Ganancia estimada:
con 7 ejercicios y ~15-25 ms por pasada de historial completo en el peor caso (extrapolado de
`exercisePerfSeries`≈21-25 ms medido), memoizar ahorraría del orden de 100-150 ms de los
325-561 ms medidos (20-30%) en el peor caso, y sería casi gratis en el caso típico. Riesgo:
bajo si el caché se invalida al guardar una serie nueva (que es exactamente cuándo cambiaría
el resultado); si no se invalida bien, alguien vería un peso sugerido desactualizado tras
marcar una serie — hay que probarlo con un sabotaje que rompa la invalidación.

---

### H5 — `renderHome()` (lo primero que ve el coach al entrar) tarda 620-890 ms con 28 asesorados reales

**Medición.** `gp('p-home')` + `renderHome()` sobre los 28 asesorados con su distribución de
historial real: **621-892 ms**. CONTROL con los mismos 28 pero 2 sesiones cada uno: **178
ms** (3,5-5× más rápido) — confirma que el costo es del TAMAÑO del historial acumulado, no
de tener 28 fichas.

**A quién afecta.** Al coach, en la PRIMERA pantalla que ve cada vez que abre la app (tras
el arranque que mide V1). Con 28 asesorados y creciendo, este número solo va a subir.

**Causa en el código.** `renderHome()` (`app-2-login.js:1659`) recorre `Object.values(DB.history||{})`
(línea ~1708 en adelante, "Sesiones esta semana") y hace pasadas similares para retención y
los asesorados prioritarios — son recorridos O(total de sesiones de TODOS los asesorados),
no solo de la última semana, aunque el resultado que se muestra sí sea semanal.

**Propuesta.** Si las métricas de "esta semana" y "retención" solo necesitan sesiones
recientes, filtrar por fecha ANTES de iterar en profundidad (o mantener un índice liviano por
fecha) en vez de recorrer el historial completo de cada asesorado cada vez que se abre
Inicio. Ganancia estimada: con la mayoría de sesiones siendo "viejas" respecto a la ventana
de una semana, el recorte debería acercar el costo al del control (178 ms), es decir bajar
~450-700 ms del total actual. Riesgo: bajo — es un recorte de qué se lee, no de qué se
calcula; hay que verificar que ningún otro bloque de `renderHome` reutilice esa misma pasada
completa para algo que sí necesite todo el historial.

---

## Notas menores (no alcanzan el umbral de hallazgo serio, quedan medidas)

- **`renderClients()`** (lista de 28 asesorados): 227-317 ms con CUALQUIERA de los dos
  historiales (pesado o casi vacío) — NO cambia con el tamaño del historial. Es un costo
  fijo de construir 28 tarjetas con `sortClientsByAttention` bajo CPU ×4; por debajo del
  peor de los hallazgos de arriba y sin una causa ligada al historial que arreglar aquí.
- **Comunidad (congelada)**: abrir la pestaña cuesta entre 83 y 555 ms según la corrida,
  sin relación clara con el tamaño del historial del asesorado (0 tareas largas en la
  mayoría de las corridas). No se investigó la causa exacta de la variabilidad — candidato:
  algún intento de red que en este montaje local no tiene con quién hablar. Por ser un área
  CONGELADA solo se deja el costo medido, sin proponer nada.
- **La habitación de un ejercicio** (`openExDetail`, la ficha con foto/video/mapa
  muscular): 42-398 ms, y NO depende del tamaño del historial (confirmado: no llama a
  `computeExerciseProgress` ni similares — se verificó leyendo el código). La variación
  entre corridas es ruido del entorno (ver "lo que tumbé" abajo), no del historial.

---

## Lo que tumbé

1. **Hipótesis: "abrir la habitación de un ejercicio es cara porque calcula progreso".**
   Falso — se verificó LEYENDO `_showExSheet`/`openExDetail` (`app-6-extra.js:2753-2780+`) y
   no hay ninguna llamada a `computeExerciseProgress`/`exercisePerfSeries`/
   `buildExerciseProgress` en esa ruta. La primera corrida dio 1.056 ms para esa pantalla en
   el peor caso, que parecía apoyar la hipótesis — pero era **contaminación del método**: la
   medición empezaba antes de que el repintado de la pantalla ANTERIOR (`cnTab('cn-today')`,
   sin medir) terminara de asentar bajo CPU ×4, así que ese trabajo pendiente se colaba en la
   ventana de medición siguiente. Con un `sleep` de asentamiento entre acciones y un
   `PerformanceObserver` que espera su latencia de entrega antes de leerse (~40-80 ms extra
   en `window.__medir`), el número bajó a 42-398 ms y dejó de moverse con el historial —
   coherente con que el código no lo toca.
2. **Hipótesis: 20 ciclos de navegación entre pestañas hacen crecer el heap JS (fuga).**
   No se sostuvo en esta prueba: el heap fue de -2,35 MB a +0,66 MB entre el antes y el
   después según la corrida (ruido de recolección de basura, sin un patrón de crecimiento
   sostenido). **No es un "cero limpio"**: 20 ciclos en unos segundos no es lo mismo que
   días de uso real con listeners/temporizadores que se acumulen lentamente, y esta prueba
   no puede forzar una colección de basura para aislar mejor la señal (CDP no expone ese
   control sin flags de Chrome dedicados). Queda como "no encontrado en esta ventana corta",
   no como "descartado para siempre".
3. **Hipótesis (del baseline): "gmRender solo es un problema si se mide, porque en el caso
   normal el historial es chico".** Parcialmente tumbada: incluso con el historial CASI
   VACÍO (5 sesiones, el control), `gmRender()` ya mide 252 ms — por encima del umbral de
   100 ms. El costo no nace solo del historial: hay un piso de costo de repintar el guiado
   entero bajo CPU ×4 que ya es alto antes de sumarle el historial.

## Qué NO miré

- **El arranque** con sesión iniciada (asesorado o coach) — es V1.
- **El código muerto o el peso que no se usa** dentro de estas pantallas — es V3.
- **El teléfono real**: todo esto es CPU ×4 emulado en Chrome de escritorio; un Android de
  gama media real puede comportarse distinto (mejor o peor) y esta ronda no tuvo uno a mano.
- **La causa exacta de la variabilidad de Comunidad** (83-555 ms) — se midió el costo, no
  se rastreó la petición de red o el motivo del rango tan ancho.
- **El costo de escribir a Supabase** en cada toque (el `sv()` real hace un upsert
  asíncrono): esta ronda corre en local con la nube sellada, así que solo mide el trabajo
  del HILO PRINCIPAL antes de que la escritura salga — el tiempo de red no está aquí.
- **Memoria en sesiones largas de verdad** (horas, no 20 ciclos en segundos) — ver "lo que
  tumbé" arriba.
- **El costo del panel «Cargas» con el filtro `_progFilter` activo** (solo se midió sin
  filtrar) ni con la tarjeta de cada asesorado ABIERTA (`.pload-card.open`, que agrega más
  DOM por asesorado).
