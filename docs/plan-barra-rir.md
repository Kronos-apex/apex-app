# Plan — la barra y las reps en reserva (v681 + v682)

> **Origen:** estudio de progresión del 28-sep-2026. Primero se hizo el techo de Astrid y después
> la curva con el historial del PO. Decisión del PO: *«dale arranca»* al lote de 4 puntos. Este plan
> cubre los dos primeros; la curva en la ficha (punto 4) necesita estos datos antes.
> Informe del estudio (privado): https://claude.ai/artifact/173Ds6vXjpqLYuxyf4aRpF · prototipo de la
> curva: https://claude.ai/artifact/RxPnyevfFjiqfXmoQbZ1dU

## Hechos medidos (respaldo del 27-sep-2026)

- **9 de las 15 personas que usan barra anotan SOLO LOS DISCOS**: el PO y 8 asesorados. Hay remos con
  barra anotados con 5 kg y sentadillas con 4,5, menos que una barra vacía. El PO lo confirmó: anota
  discos y su barra pesa 20. La barra del hip thrust de Astrid pesa 15.
- **La sensación de la sesión (`feeling`) se llena en 60 de 550 sesiones (11 %)**: cualquier pregunta
  nueva tiene que costar un toque y poder saltarse.
- **Los `log_` se conservan de un día para otro** (el peso y las reps de ayer quedan como sugerencia).
  Solo `done_` se borra al empezar un día nuevo (`_wipeSessionFlags`). Un dato que NO debe heredarse
  (las reps en reserva) tiene que borrarse ahí.
- **Cada serie marcada vuelve a guardar la sesión entera** (`updateClientProgress` →
  `saveSessionToHistory`, que reconstruye las series desde los `log_`). Un dato que se anota DESPUÉS
  de marcar la última serie solo llega al historial si algo vuelve a guardar.

## v681 — La barra

**Regla (decisión del PO, recomendada en el estudio):** se sigue anotando lo que se pone, los discos.
La app sabe cuánto pesa la barra de ese ejercicio y la suma donde hace falta el peso real. No se pide
el total: el primer día que alguien lo anotara así saldría un récord falso de +20 kg y el historial
quedaría partido en dos.

- **`BAR_DEFAULTS` (avi-core, por id):** el peso de barra por defecto de cada ejercicio del catálogo
  que la lleva. Olímpica 20, barra Z 10, hexagonal 25, Smith y multipower 0 (el peso efectivo cambia
  con cada máquina: se deja en 0 y se ajusta). La LISTA la valida Coach Pro. Los ejercicios de polea con
  barra recta o Z NO llevan barra: la carga es la pila.
- **`exerciseBarKg(history, ex)` PURA:** la barra que usa ESTA persona en ESTE ejercicio. Es la última
  `bar` explícita de ese ejercicio en su historial (por identidad, `exerciseIdentity`, lección de v585).
  Si no hay ninguna, el defecto del catálogo. Si el ejercicio no lleva barra, `null`.
- **En vivo (guiado):** en los ejercicios con barra, una línea sobre las series (como el «+ Lastre»)
  dice «Barra de 20 kg · se suma a los discos». Al tocarla se abren cuatro opciones:
  20 · 15 · 10 · Sin barra. La casilla KG pasa a rotularse **DISCOS**.
  La elección del día vive en `barra_<rid>_<ei>`. Es una clave NUEVA por ejercicio, así que se
  registra en `_SK_EX` (reorden, barrido, limpiar al sustituir) y en `MV_MUST_RE` (viaja en la
  mudanza). Clase de v538/v662: toda clave de sesión nueva tiene que estar en TODAS las listas.
- **Historial:** el ejercicio guardado lleva `bar: N` cuando el ejercicio tiene barra.
- **Qué la usa en ESTE lote:** el **1RM estimado** en sus tres superficies (tarjeta de récord, habitación
  del ejercicio, hitos). Pasa a ser `(kg + barra) × (1 + reps/30)`, rotulado «con la barra».
- **Qué NO la usa, a propósito:** el volumen, los récords (siguen en discos, como se anotaron), el peso
  sugerido (sigue en discos, que es lo que se pone) y el detector de estancamiento. Meter la barra ahí
  crea saltos falsos en los gráficos el día del cambio. Entra con la curva (punto 4), que lee TODO el
  historial con la misma barra.

## v682 — Las reps en reserva

- **Pregunta:** «¿Cuántas más te salían?» · 0 · 1 · 2 · 3+. Un toque, opcional.
- **Cuándo:** en la ÚLTIMA serie de trabajo de cada ejercicio de peso (`peso_reps`), en dos sitios que
  escriben lo mismo:
  1. el **descanso** que sigue a esa serie (el momento en que la persona está quieta y mirando);
  2. una fila **bajo esa serie** en la tarjeta del ejercicio, para verla o cambiarla después.
- **No se pregunta:** calentamiento, dropset, tiempo, cardio, HIIT, peso corporal. Tampoco en la
  última serie de la sesión entera, porque al marcarla se cierra el guiado y sale la pantalla de fin.
  Coach Pro valida si ese hueco es aceptable.
- **Guardado:** `log_<rid>_<ei>_<si>_rir` = '0'…'3'. Viaja con el reorden y la mudanza (prefijo `log_`)
  y **se borra en `_wipeSessionFlags`** (día nuevo y «Reiniciar»), porque los `log_` se heredan.
  Al elegir se llama a `updateClientProgress` para que el guardado parcial lo lleve al historial.
- **Historial:** `rir` en esa serie (número 0-3; 3 = «3 o más»).
- **Se ve en:** el detalle de la sesión, del asesorado y del coach: «110 × 12 · sobraban 2».
- **Consumidores en este lote:** ninguno algorítmico. Es dato para la curva (punto 4). Coach Pro
  decide si alguna regla debe usarlo YA.

## Preguntas para Coach Pro (vinculante en progresión)

1. ¿La escala 0 · 1 · 2 · 3+ sirve, o hace falta 4+ / 5+?
2. ¿Última serie de TODOS los ejercicios de peso, o solo del principal (el primero del día)?
3. ¿El texto de la pregunta? (Sofía revisa el tono después.)
4. Lista de barras por defecto: qué ids llevan olímpica (20), Z (10), hexagonal (25), Smith (0) o nada.
5. ¿Alguna regla actual debe leer las reps en reserva ya (estancamiento, «sube»), o solo se junta el dato?
6. ¿Es aceptable no preguntar en la última serie de la sesión?

## Veredicto de Coach Pro (28-sep-2026) — APROBADO CON CAMBIOS

1. **Escala 0 · 1 · 2 · 3+: basta.** Con ~1 rep de error en el autorreporte (Halperin 2022), separar
   4 de 5 no aporta nada accionable. «3+» significa «3 o más» y NUNCA se lee como «3 exactas».
2. **Todos los ejercicios de peso, no solo el principal.** Si no, la curva nace sesgada a un ejercicio.
3. **El texto** «¿Cuántas más te salían?» mide RIR (no RPE invertido). Sofía ajusta el tono.
4. **La lista de barras:** la suya, completada. Agregó 11 que el plan no tenía (seis de multipower, la
   Zercher, el remo en T y el press en punta a una mano). Los de un extremo ANCLADO (e306, e230, e323:
   landmine / remo en T) van sin barra: los discos cargan una palanca y sumar 20 inventa un 1RM.
   **e222** (press de banca agarre cerrado) lo agregó la verificación contra el catálogo (se le escapó).
   Thruster y push press van sin barra: el implemento es ambiguo (barra o mancuernas).
5. **Ninguna regla lee las reps en reserva todavía.** El historial viejo no tiene el dato, y un «0
   implícito» mezclado con un «0 real» fabrica saltos falsos. Si algún día entra al índice, la serie sin
   dato es DESCONOCIDA, jamás 0. El «sube» se afinará (RIR ≤ 1 en el tope del rango) cuando haya
   semanas de cobertura medida, no antes. Y «1 reportado» puede ser 0 real (Halperin).
6. **No preguntar en la última serie de la sesión: aceptable**, documentado como sesgo de cobertura
   estructural (no aleatorio). Preguntarlo en la pantalla de cierre daría un dato RECORDADO, el menos
   preciso, y rompe un momento que premia (v579).

**Riesgo que marcó y quedó resuelto en v681:** las opciones del selector salen del ejercicio
(`barChoices`): la hexagonal ofrece 25.
