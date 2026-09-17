# 🏛️ PLAN «AVI NO LA HIZO UN NOVATO» — plan VIVO

> Pedido del PO (17-sep-2026): *«quiero que hagamos que AVI parezca que sí la hizo un equipo
> profesional, vamos a armar un plan de trabajo para que AVI deje de parecer hecha por un novato»*.
> Nace de su pregunta anterior: *«¿si hoy alguien hiciera una auditoría sabría que AVI la hizo
> alguien sin ser un desarrollador?»* — respuesta honesta: **sí, en los primeros diez minutos**.
>
> Este archivo se ACTUALIZA al cerrar cada tanda. Al retomar: leer §0 y §5 antes de tocar nada.

---

## §0 · LA TESIS (y la trampa que trae el pedido)

Medido el 17-sep, en el pedido hay **tres cosas distintas mezcladas**, y tratarlas igual es como
se hace daño:

1. **Deuda REAL que además se ve.** Cuesta datos de gente que paga. Se arregla. → §1
2. **Calidad que YA EXISTE y es invisible desde fuera.** 1.226 pruebas, 126 harness de navegador,
   66 matrices de sabotaje, CI que corre el audit completo — y **nada de eso se ve al abrir el
   repositorio**, que no tiene ni un README. Es un problema de **EMPAQUE**, no de ingeniería, y es
   lo más barato de arreglar de todo el plan. → §2
3. **Decisiones que un auditor va a leer como amateur y que NO se deben cambiar.** El archivo
   único, vanilla sin construcción, sin dependencias. Están en las restricciones no negociables
   con su razón, y cambiarlas haría PEOR la app. → §4

🔴 **LA TRAMPA:** el camino que suena más «profesional» —reescribir a un framework moderno con
tipos— es **la peor decisión posible aquí**, y decirlo es parte del trabajo:
- son **37.118 líneas** de app que funcionan hoy, con **24 personas reales** encima;
- las **1.226 pruebas** (19.572 líneas) habría que rehacerlas, así que se perdería exactamente lo
  único que hoy está por ENCIMA del promedio profesional;
- durante meses la app estaría peor para quien la usa, y ninguno de sus asesorados entrenaría mejor.
**Un auditor no te aprueba por usar React. Te reprueba por perder datos, por no tener dónde
probar y por no tener los papeles.** Ese es el orden del plan.

---

## §1 · FASE 1 — LO QUE ES REAL (y de paso se ve)

Ordenada por riesgo MEDIDO, no por lo que se ve más.

### F1.1 · UN AMBIENTE DE PRUEBAS · 🔴 lo primero que marca cualquier auditoría
**Hoy existe UN proyecto de Supabase y es PRODUCCIÓN**, con los datos de 24 personas. Los harness
tienen que estar SELLADOS para no escribir ahí (`cloudWriteSealed`, v298) — y ese sello existe
porque el 8-jul-2026 una prueba **borró las 4 rutinas reales de Samuel**. Hoy hay cosas que
literalmente NO se pueden probar de verdad (escritura a la nube, sincronización entre dos
aparatos: el harness de v623 tiene que SIMULAR la nube).
- Segundo proyecto Supabase (plan gratis) con el MISMO esquema, aplicado desde las migraciones
  que ya están versionadas. Si las migraciones no reproducen el esquema solas, ESO es el hallazgo.
- Un interruptor de entorno para que los harness apunten ahí y el sello se quede como cinturón.
- **Criterio de cierre:** correr `_verify-perfil-dos-aparatos` contra la nube DE VERDAD, con dos
  sesiones reales, sin simulación.
- **Costo estimado:** 1 sesión. **Lo que compra:** poder probar la sincronización de verdad, y la
  respuesta a la primera pregunta de cualquier auditoría técnica.

### F1.2 · CERRAR LA CLASE DE LA ESCRITURA POR COLUMNA ENTERA · 🔴 la deuda más cara
v623 la cerró para `profile` y `routines`. **Medido hoy: sigue abierta en 7 colecciones** —
`history`, `prs`, `bodyweight`, `medidas`, `nutrition`, `photos` y `msgs` —, donde el panel del
coach escribe `updateClientRow(id, {columna: su copia en memoria})` **sin fusionar con la nube**.
Son 20 llamadas de escritura que reemplazan una columna entera.
La peor es `history`: si el coach le crea una sesión a alguien mientras esa persona está
entrenando desde su celular, **uno de los dos entrenos se pierde** (y el coach ha creado 186).
- 🔬 **Primero MEDIR, como en v623: cuál de las 7 tiene víctima real** en los 45 respaldos
  diarios de `Desktop/AVI/backups` — la medición de v623 dio 0 reversiones y así se supo que el
  mecanismo era real pero el daño acotado. Sin ese número se arregla a ciegas.
- El patrón ya existe DOS veces en el repo y **no hay que inventar nada**:
  `mergeOwnRow3` (fusión de tres vías en el cliente) y **`coach_settings_patch`** (fusión en el
  SERVIDOR, v589 — el mejor de los dos: el cliente manda solo lo que cambió).
- Cada colección tiene su forma de fusionar y hay que respetarla: `history` y `msgs` son
  APPEND-ONLY (unión), `prs` es «el mejor valor» con la corrección del coach por encima (v615/v618),
  `medidas`/`photos`/`bodyweight` llevan lápida (v566/v568/v614).
- **Criterio de cierre:** `_verify-perfil-dos-aparatos` extendido a las 7, con su control de
  discriminación por colección (con la fusión apagada, cada una pierde su dato).
- **Costo estimado:** 2-3 sesiones. **Lo que compra:** que se acabe la familia de bugs que se ha
  llevado v509, v588, v616, v621 y v623 — cinco versiones del mismo problema.

### F1.3 · LO LEGAL · 🔴 es lo único que hace FALLAR una auditoría, y tiene fecha
Los textos de `legal/` están en **BORRADOR** desde julio, con **menores registrados** en la app
(hay dos, y uno declaró 28 años teniendo 15). Compromiso con fecha: **3-oct-2026, el abogado**.
No es código y no lo puedo hacer yo. Lo que sí puedo tener listo para ese día:
- el inventario de qué datos se recogen, de quién, dónde viven y cuánto duran (ya está casi todo
  en CLAUDE.md, hay que ponerlo en el lenguaje del abogado);
- el procedimiento de borrado de cuenta y de descarga de datos, que **existe** (`delete-account`)
  y hay que documentar como derecho del titular;
- la lista de lo que hoy NO cumple: no hay botón de «descargar mis datos» en la app.

### F1.4 · QUE LOS FALLOS DE PRODUCCIÓN SE VEAN · 🟡
Hay una tabla `app_errors` y un latido de versión por aparato (v541), y **nadie los mira**. Una
auditoría pregunta «¿cómo se enteran de que se rompió?» y hoy la respuesta es «lo reporta el PO».
- Un reporte que se pueda correr en un comando: errores de la semana, por versión y por persona.
- **Costo:** media sesión. **Lo que compra:** dejar de depender de que él lo note.

---

## §2 · FASE 2 — EL EMPAQUE (barato, y es lo que cambia la primera impresión)

Medido: **no existe README, ni LICENSE, ni SECURITY.md, ni ARCHITECTURE.md**. Esto es literalmente
lo primero que abre quien audita, y hoy dice «taller».

⚠️ **Corrección a mi propia medición (17-sep):** primero conté «38 archivos en la raíz, 11 de
borrador» **listando el DISCO**, y el repositorio no es eso: `.gitignore` ya tapaba los
`_*.html`, así que en GitHub la raíz tenía **23 archivos** y solo **5 eran basura**
(`_baseline.txt`, `_preview-interior.html` y 3 de `llm-council/`). El resto de los borradores
nunca estuvo publicado. **Medir el repositorio con `git ls-files`, jamás con `ls`** — es la misma
clase de las tres sondas falsas del 31-jul: la herramienta medía otra cosa que la pregunta.

### F2.1 · README · el archivo más rentable de todo el plan
Qué es AVI, para quién, qué resuelve, cómo se corre, cómo se prueba, **y las cifras de QA**
(1.226 pruebas · 126 harness · 66 matrices de sabotaje · 12 controles antes de cada commit · CI).
Hoy esa calidad existe y **no se ve**. En inglés y español: quien audita puede no leer español.

### F2.2 · ARCHITECTURE.md · convierte «amateur» en «decisión»
La diferencia entre que lean «archivo único sin build» como ignorancia o como criterio es **que
esté escrito con su razón**. Va el mapa de los 8 módulos, el modelo de datos (11 columnas jsonb),
el modelo de sincronización con su límite conocido, y la doctrina de QA. Casi todo ya está escrito
en CLAUDE.md y en `docs/` — pero CLAUDE.md son **3.000 líneas dirigidas a un modelo**, no un
documento que alguien de fuera pueda leer.

### F2.3 · LIMPIAR LA RAÍZ · 🟢 una hora
Los 11 archivos de borrador a `scratch/` (ignorado) o borrados —están en la historia de git—,
`llm-council` fuera del repositorio si no es del producto, y un `.gitignore` que lo diga.

### F2.4 · LICENSE y SECURITY.md · 🟢 una hora
**El repositorio es PÚBLICO y no tiene licencia**, o sea que legalmente nadie sabe qué puede hacer
con él (y eso también aplica al revés: nadie puede alegar permiso). Y SECURITY.md es dónde
reportar un hallazgo sin publicarlo — para una app con datos de salud, su ausencia es una señal.

### F2.5 · QUE EL QA SE VEA · 🟢
Insignia de CI en el README y un reporte de la suite legible. Las matrices de sabotaje son lo más
fuerte que tiene este repositorio y **hoy no hay forma de que alguien de fuera sepa que existen**.

---

## §3 · FASE 3 — LO ESTRUCTURAL, y SOLO si hay una razón concreta

No se toca «porque se ve mejor». Se toca el día que haya un motivo medible.

- **`avi-core.js` son 11.574 líneas** y es el motor puro. Partirlo por dominio (nutrición ·
  entrenamiento · comunidad · fecha/formato) es **viable sin cambiar comportamiento**, justamente
  porque tiene 1.226 pruebas detrás que lo demostrarían. **Cuándo:** el día que entre otra persona
  a trabajar en el código, no antes.
- **Los `onclick=` en el marcado**: pasarlos a delegación de eventos es el cambio más grande de
  estilo y el de peor relación beneficio/riesgo — toca cada pantalla de la app. **Hoy: no.** El
  candado que ya existe (todo `onclick` tiene que apuntar a una función que exista, v473) cubre el
  riesgo real, que es el botón que no hace nada.
- **`index.html` son 2.118 líneas** y el resto ya está partido en 8 módulos: la restricción
  «un solo archivo» hoy es de FACTO «un solo HTML + módulos», que es defendible.

---

## §4 · LO QUE **NO** SE VA A HACER, con su razón (para que nadie lo reabra)

| No se hace | Por qué |
|---|---|
| Reescribir a React/Vue/Svelte | 37.118 líneas que funcionan + 1.226 pruebas que se perderían, meses de regresiones, cero beneficio para quien entrena |
| Pasar a TypeScript | exige construcción, y la restricción «sin build» es lo que hace que esto se pueda abrir desde un archivo y sobreviva sin npm |
| Partir `index.html` en muchos HTML | rompe la restricción del PO y la portabilidad; el beneficio es estético |
| Renombrar `apex`/`ax_` a `avi` | rompería los datos guardados y la PWA instalada de gente real. Ya está documentado como prohibido |
| Añadir dependencias «de las que usa todo el mundo» | cada una es superficie de ataque y de mantenimiento en una app con datos de salud |

---

## §5 · LA PREGUNTA QUE ORDENA EL PLAN (decisión del PO)

**¿Para quién es la auditoría?** Cambia el orden completo:

- **Un inversionista o un socio** → F1.3 (legal) y F1.1 (ambiente), luego §2. El código no lo miran.
- **Un gimnasio como cliente** (AVI GYM) → F1.3 legal + F1.2 (no perder datos) + un acuerdo de nivel de servicio.
- **Contratar a alguien que entre a programar** → §2 completo y F3.1 (partir `avi-core`) suben a lo primero.
- **Play Store** → legal + formulario de seguridad de datos + borrado desde la app.
- **Orgullo propio / que no lo miren mal** → §2 completo, que es una sesión y media y cambia la
  primera impresión por completo.

---

## §6 · ESTADO

| Punto | Estado | Cerrado en |
|---|---|---|
| F1.1 ambiente de pruebas | ⏳ sin empezar | |
| F1.2 columnas enteras (7 colecciones) | ⏳ sin empezar — **medir primero** | |
| F1.3 legal | ⏳ del PO + abogado (3-oct) | |
| F1.4 fallos visibles | ⏳ sin empezar | |
| F2.1 README | ⏳ sin empezar | |
| F2.2 ARCHITECTURE.md | ⏳ sin empezar | |
| F2.3 limpiar la raíz | ⏳ sin empezar | |
| F2.4 LICENSE + SECURITY.md | ⏳ sin empezar | |
| F2.5 QA visible | ⏳ sin empezar | |

**Medición de partida (17-sep-2026, v624):** 37.118 líneas de app · `avi-core.js` 11.574 ·
`avi.test.js` 19.572 con 1.226 pruebas · 126 harness · 66 matrices de sabotaje · 12 controles de
pre-commit · CI con suite + audit · **23 archivos en la raíz del repositorio, 5 de basura** ·
0 README · 0 LICENSE · 1 proyecto Supabase (producción) · 20 escrituras que reemplazan una columna
entera, **7 colecciones sin fusión**.

---

## §7 · UNA DECISIÓN DE NEGOCIO QUE APARECIÓ MIDIENDO (no estaba en el pedido)

**El repositorio es PÚBLICO**, así que el producto entero —el generador de rutinas, los dictámenes
de nutrición, la tabla de alimentos, cada decisión de los últimos ocho meses— lo puede clonar
cualquiera, incluido alguien que quiera montar lo mismo. No hay ningún secreto dentro (eso está
verificado en cada commit), así que **no es un problema de seguridad: es de competencia**.

Y probablemente no fue una decisión, sino el precio de GitHub Pages gratis. **Si es así, ya no
hace falta pagarlo:** él ya despliega la web de venta en **Vercel**, que sí publica desde un
repositorio PRIVADO en el plan gratis. Mover la app ahí costaría una sesión y el repositorio podría
cerrarse sin gastar un peso.

⚖️ **La decisión tiene dos caras y es del PO:**
- **Cerrarlo** protege el trabajo de ocho meses de que lo copien.
- **Dejarlo abierto** es lo que permite que alguien audite de verdad —y ahí la calidad del QA
  juega a favor—, y es un argumento de confianza para un gimnasio que le va a entregar los datos
  de sus clientes.
- Si se cierra, este plan cambia: §2 (el empaque) pierde casi todo su sentido, porque el público
  que lo leería deja de existir. **Por eso esta decisión va ANTES de §2.**
