# 💬 Sofía — Revisión de tono, v485 (candado de menores en el número escrito a mano)

**Contexto:** HEAD `88842b5`, sin desplegar. Caso real: Valery, 15 años, plan escrito por el coach
a 1.775 kcal contra un gasto de 1.910 → `nutMinorFloorBase` lo sube a 1.915 (avi-core.js:5028-5051),
aplicado en la salida de `nutBaseFor` (avi-core.js:5053-5080).

Pasada por Andrés-test: **🟡 con reservas** — nada rompe la regla clínica, pero hay una frase que
puede leerse mal y un hueco real de que el coach nunca se entere del cambio.

---

## ① El texto que ella lee

### 1.1 «¿Por qué este plan?» — `GOAL_WHY.mantenimiento`
`app-5-salud.js:269`, se pinta en `openNutritionRoom` (línea 569→622) vía `nutWhyKey(nut,c)`
(avi-core.js:3539), que pasa por el candado `nutMinorSafeGoal` (avi-core.js:3532) y cae aquí
porque `NUT_GOALS_COMPOSICION` excluye `cutting/definicion/recomposicion` para un menor.

> **Literal:** *"Estás comiendo en balance: lo que gastas. El objetivo no es subir ni bajar, sino
> sostener tu composición, sentirte con energía y crear hábitos sostenibles. Comida variada,
> suficiente proteína para cuidar el músculo y carbohidratos para rendir en el día a día."*

**✅ PASA.** Antes de v485 esta frase era falsa (kcal < gasto). Con `nutMinorFloorBase` garantizando
`kcalObj >= tdee` en la salida de `nutBaseFor`, la frase se volvió cierta *sola* — exactamente lo
que pedía el hallazgo del PO. La palabra "composición" aparece pero en sentido neutro ("sostener",
no "cambiar/perder/definir") — no es lenguaje de composición corporal prohibido, es lo opuesto.

### 1.2 Las otras 4 entradas de `GOAL_WHY` (volumen/definición/cutting/recomposición)
Bloqueadas para un menor desde antes de v485 (`nutMinorSafeGoal`, sin tocar en este cambio). No
las relee un menor salvo que alguien quite el candado — fuera del alcance de este diff. **✅ PASA**
(no regresó).

### 1.3 La tarjeta «Tu semana de comida» y la nota del día (`nutDayNote`)
`app-5-salud.js:508-512` y `avi-core.js:5235-5247`. *"Promedio X kcal al día. Los días que entrenas
comes un poco más y los de descanso un poco menos — en la semana comes lo mismo."* Sin lenguaje de
cuerpo, correcto para cualquier edad. **✅ PASA.**

### 1.4 🟡 Lo que NO dice: por qué el número subió sin que ella tocara nada
Grepeado `minorFloor` en todo el repo: solo aparece en `nutGoalCheck` (el aviso al COACH,
`app-5-salud.js:159`). **En `renderNutritionClient` (línea 466) y `openNutritionRoom` (línea 552)
no hay ni una línea que le diga a Valery que su plan pasó de 1.775 a 1.915.** Para ella el número
grande simplemente cambió de un día para otro — la app ya pagó esta lección en v434 ("un número
que cambia sin explicación se lee como un error de la app", sobre la descarga de series).

**Propongo** una línea corta bajo el título "¿Por qué este plan?" cuando `base.minorFloor` existe
(el dato ya viaja en el objeto que devuelve `nutBaseFor`, solo falta pintarlo):

> *"Ajustamos un poco tus calorías para que nunca queden por debajo de lo que tu cuerpo necesita
> mientras creces."*

Una frase, sin números (los números ya están arriba en las tarjetas), sin mencionar al coach ni
sonar a corrección — sólo la razón. Encaja con el patrón que ya usa `nutDayNote` (explicar sin
alarmar).

### 1.5 🟡 Riesgo no verificable desde el código: el texto LIBRE del plan (`nut.plan`/`nut.avoid`)
`openNutritionRoom` (línea 634-636) pinta `nut.plan` y `nut.avoid` **tal cual los escribió el
coach**, sin pasar por ningún candado — a diferencia del titular (que se deriva) y del "por qué"
(que sí pasa por `nutMinorSafeGoal`). Si el texto a mano de Valery dice algo como "plan para bajar
de peso" o "déficit moderado", esa frase queda al lado de un titular que ahora dice "come en
balance" — dos mensajes contradictorios en la misma pantalla. No pude confirmar el contenido real
de su campo `plan` (no se consultó Supabase, por presupuesto y por alcance del pedido); lo marco
como pendiente de que alguien con acceso a su ficha lo revise a ojo. Si el texto libre resulta
mencionar déficit/bajar de peso, hay que decírselo al coach para que lo reescriba — la app no
puede tocarlo por su cuenta (regla de "marcar, no filtrar" que ya rige `_nutSwapTemplateText`).

---

## ② El aviso nuevo al coach (`nutGoalCheck`, `app-5-salud.js:159-168`)

> **Literal:** *"🔒 Valery es menor de edad y este plan queda por debajo de lo que gasta (1.775
> contra ~1.910 kcal). Un menor en crecimiento no lleva déficit, así que la app le va a servir
> 1.915 kcal (P180 C250 G70), con el mismo reparto que tú eligió. Si quieres otro número, súbelo
> tú aquí."*

**¿Se entiende sin ser nutricionista?** Sí — "un menor en crecimiento no lleva déficit" es lenguaje
llano, y "con el mismo reparto que tú elegiste" es honesto: no le está imponiendo una fórmula nueva,
respeta lo que él armó. **¿Suena a que lo corrigió con soberbia o a que lo está cuidando?** Se lee
como cuidado, no reproche — no dice "tu plan estaba mal", explica una regla de seguridad y sigue.
**¿Sabe qué hacer si no está de acuerdo?** Sí, el cierre "Si quieres otro número, súbelo tú aquí" es
un CTA claro y le devuelve el control.

**🟡 Dos cosas de tono/forma que no cuadran con el resto del archivo:**

1. **El color es el de un problema, no el de una protección.** El contenedor `#nut-goal-nota`
   (`index.html:1381`) usa `--orl`/`--ort` (naranja de advertencia) — el MISMO color que usa dos
   líneas más abajo (`app-5-salud.js:169-175`) para "tu rótulo no coincide con tus calorías", que
   sí es un error del coach que hay que corregir. Aquí no hay error suyo: es la app avisando que
   YA actuó por seguridad. El resto del archivo sí distingue esto — `renderNutReviewCard`
   (`app-3-coach.js:1618-1673`) usa `--bll` (azul, informativo) para "faltan datos" o "sin plan" y
   reserva `--rdl` (rojo) solo para el caso de riesgo real. Este aviso debería ir en azul, no en
   el mismo naranja que un plan mal escrito.
2. **Formato distinto al resto de avisos del coach.** Todo `d-nutreview`/`d-shock`/`d-deload` usa
   título corto en negrita + cuerpo aparte (`<div>título</div><div>cuerpo</div>`). Este aviso mete
   todo en un párrafo corrido, y la abreviatura **"P180 C250 G70"** no aparece en ningún otro sitio
   del archivo (los demás avisos siempre escriben "Proteína/Carbos/Grasas" o "sus macros suman X").
   Un coach que no vio nunca esa notación puede no caer en que P/C/G son proteína/carbo/grasa.

**Versión propuesta** (mismo contenido, formato y tono del resto del archivo):

```
🔒 Ajustamos el plan de Valery — es menor de edad
Su plan (1.775 kcal) quedaba por debajo de lo que gasta (~1.910 kcal). Como está en crecimiento,
AVI no la deja en déficit: le va a servir 1.915 kcal, con el mismo reparto que tú elegiste
(proteína 180 g · carbos 250 g · grasa 70 g). Si prefieres otro número, edítalo aquí arriba.
```
En contenedor azul (`--bll`/`--blt`), como las notas informativas del mismo archivo.

---

## ③ Si alcanza — riesgo para el PO (no técnico)

**🔴 El único lugar donde el coach ve este aviso es reabriendo el editor de Nutrición de ESA
persona.** La tarjeta que sí se muestra sola al abrir la ficha del asesorado (`d-nutreview`,
`renderNutReviewCard`, `app-3-coach.js:1618`) usa un umbral general de 300 kcal
(`NUT_REVIEW_MIN_GAP`, avi-core.js~5263) para decidir si vale la pena avisar. La diferencia de
Valery es de 135 kcal (1.775 vs. su gasto de 1.910) — **por debajo del umbral**, así que esa
tarjeta no se enciende para ella. Si Camilo (o cualquier coach) no vuelve a abrir el modal de
Nutrición de esa persona en particular, **nunca ve que la app le subió el plan**, y puede seguir
creyendo que el número que él escribió (1.775) es el que ella recibe. Esto no es un problema de
tono: es que el aviso que sí escribieron para este caso (②) vive detrás de una puerta que nadie
tiene motivo para volver a abrir. Sugiero pedirle a Camila/Andrés que este aviso también dispare
la tarjeta de la ficha (bypasee el umbral de 300 kcal cuando el afectado es menor), no solo el
modal de edición.

---

## Resumen

| # | Texto | Veredicto |
|---|---|---|
| 1.1 | "Estás comiendo en balance…" (GOAL_WHY mantenimiento) | ✅ Pasa — se volvió cierta con el fix |
| 1.2 | Resto de GOAL_WHY (volumen/cutting/definición/recomposición) | ✅ Pasa — candado previo intacto |
| 1.3 | Semana de comida / nota del día | ✅ Pasa |
| 1.4 | Sin explicación del salto 1.775→1.915 para ella | 🟡 Mejora de tono — propuesta arriba |
| 1.5 | Texto libre `nut.plan`/`nut.avoid` sin filtrar | 🟡 Riesgo sin verificar — pedir revisión manual del caso real |
| 2 | Aviso al coach — contenido | 🟡 Correcto en fondo; color y formato no calzan con el resto |
| 3 | Umbral de 300 kcal apaga el aviso automático en la ficha | 🔴 Riesgo operativo — el coach puede no enterarse nunca |

No se encontró una tercera puerta de lenguaje de composición corporal: `weekEditorial`
(avi-core.js:6721) ya tiene su candado desde antes de v485, y el selector "Recomposición · Bajar
grasa, subir músculo" del wizard de auto-registro (`index.html:200`) es inalcanzable para un menor
porque ese flujo exige declarar "soy mayor de 18 años" para completarse (`index.html:315`).
