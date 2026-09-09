# Auditoría «entrenamientos rápidos» — 2026-09-08

Área elegida leyendo el «Qué NO miré» de las ocho rondas anteriores: **los entrenamientos
rápidos no aparecen en ninguna**. Nadie los había mirado nunca, y son la única superficie donde
el asesorado entrena **sin que el coach haya revisado nada** — el plan lo aprueba él, el rápido no.

La hizo el orquestador (sin subagentes: es un área sola). Todo lo de abajo está medido contra
producción o reproducido con un harness; lo que es lectura de código va dicho como tal.

## Baseline medido (8-sep, contra la nube)

| | |
|---|---|
| sesiones de rápidos | **44** (id de rutina `qw*`), la última **hoy** |
| personas que los usan | **9** — Claudia 11, Luz 11, Astrid 7, Kathe 6, Danilo 3, Natalia 2, Samuel 2, Diana Paola 1, Yeison 1 |
| presets usados | **HIIT en Máquina 35** · Abdomen Express 8 · Glúteo & Pierna 1 |
| presets NUNCA usados | los 4 restantes, **incluidos los dos de alto impacto** (`qw_plio`, `qw_hiit_casa`) |
| exposición | 4 menores · 5 personas con IMC ≥ 30 · 12 principiantes · **0 reportes de dolor vigentes hoy** |

⚠️ **Una cifra que corregí a mitad de la medición:** conté primero **78** sesiones «fuera del
plan», y **34 de esas eran rutinas borradas o regeneradas**, no rápidos. Los rápidos de verdad
—los que llevan `routineId` `qw*`— son **44**. Es la lección de nombrar la unidad de lo que se
cuenta, otra vez.

---

## 🔴 1 · Un dedo gordo en las REPETICIONES se vuelve récord para siempre

**No es un defecto de los rápidos** — apareció persiguiendo una cifra rara de esta ronda y es de
otra zona, pero es el hallazgo más caro del día, así que va primero.

`kgOutlier`/`sanitizeHistory` (v431) vigilan **los kilos**: un `200` entre series de `20` se
detecta y se deja en blanco. **Las repeticiones no tienen ese candado.**

Medido sobre **7.116 series con repeticiones** de toda la base, con el mismo criterio de v431
(≥4× la mediana de las OTRAS series del mismo día):

| persona | ejercicio | día | series | |
|---|---|---|---|---|
| **Luz Rodríguez** | Dead Bug | 28-ago | `10 / 110` | 🔴 **es su récord** |
| **Luz Rodríguez** | Dead Bug | 2-sep | `10 / 110` | 🔴 **es su récord** |
| Astrid Beltran | Prensa de Pierna | 2-sep | `10 / 110 / 10 / 8` | no llegó a récord (el suyo va en kg) |

**3 sospechosas de 7.116 (0,04 %)**, y dos son el mismo caso. Su plan dice **2×10**: el 110 es un
1 de más.

**Por qué importa, con la consecuencia exacta de v431:** ese récord es **imposible de superar**,
así que el detector de estancamiento leerá ese ejercicio como plantado **para siempre**, y su
gráfica de repeticiones está inflada ×11.

**Lo que haría:** extender la regla que ya existe (misma función, misma forma) a las
repeticiones — auto-cura del dato guardado + el aviso al teclear que ya tienen los kilos
(«¿110 repeticiones? revisa el número»). Es trabajo conocido: v431 lo dejó escrito y probado
para kg.

---

## 🟡 2 · Con un temporizador vivo, el rápido NO arranca y la app dice que sí

**REPRODUCIDO** (`scripts/e2e/_repro-qw-timer.mjs`):

- sin temporizador → arranca (`GM.routine` pasa a `qw_abs_casa`) ✅
- **con un descanso corriendo → NO arranca** (`GM.routine` no cambia) **y el toast igual dice
  «⚡ HIIT en Máquina — ¡a darle!»**

La causa es un candado correcto usado de más: `renderClientToday` corta con un `return` si hay un
timer vivo —eso impide que el poll de 15 s del coach corte una serie a media— pero `_qwGo` llama a
esa misma función y **canta el toast pase lo que pase**. La persona ve el aviso de que arrancó,
la pantalla no cambia, y lo que eligió se pierde.

**Lo que haría:** que `_qwGo` mire si de verdad arrancó antes de anunciarlo, y si hay un timer
vivo lo diga («estás a media serie: termina el descanso y vuelve a tocarlo»). Es la misma familia
del «Mensaje enviado» de v588: no cantar victoria antes de saberlo.

---

## 🟡 3 · Los presets no pasan por NINGÚN filtro (sin víctima hoy)

`buildQuickRoutine` arma la rutina directo del preset: **no corre el gate de nivel, ni el perfil
de carga (`bodyLoadProfile`), ni el entorno**. El generador sí los aplica; esta puerta no.

- **Nivel:** `qw_plio` («Cardio Pliométrico · Alto impacto») incluye `e185`/`e186`, que v513 movió
  a nivel **avanzado**. Cualquiera de los **12 principiantes** lo puede arrancar de un toque.
- **Perfil de carga:** el generador excluye el alto impacto a quien tiene IMC ≥ 30 (`GEN_HIIMPACT_RE`).
  Aquí no. Son **5 personas** — y **Claudia (30,4) y Luz (33,7) son justamente las dos que más
  usan los rápidos**, a un toque de un preset que su propio generador jamás les daría.
- 🟢 **Lo que SÍ funciona:** el chip de cuidado por dolor **se pinta también en un rápido** —
  comparten el motor de «Hoy», así que `_painForEx` marca igual. Verificado leyendo las dos
  llamadas. Hoy no hay ningún reporte de dolor vigente, así que no hay a quién le aplique.

**Sin víctima hoy: 0 de las 44 sesiones fueron de los dos presets de alto impacto.** Es una mina,
no un incendio — y por eso lo dejo como decisión, no como urgencia. ⚖️ Y tiene su contra-argumento
legítimo: **la persona ELIGE de una lista donde cada tarjeta dice qué es** («Alto impacto», «Gym»,
«Casa»), y la regla de la casa es que lo que arma el algoritmo se filtra y lo que elige una
persona se marca. Quién manda aquí lo decide el PO, y si toca lista clínica, Laura.

---

## 🟡 4 · «HIIT Quema-grasa» le aparece a los cuatro menores

El preset `qw_hiit_casa` se llama **«HIIT Quema-grasa»** y esa biblioteca no tiene ningún gate por
edad. En la base hay **4 menores** (Sharith 16, Santiago 17, Samuel 15, Valery 15) y **Samuel ya
usa los rápidos** (2 sesiones).

«Quema-grasa» es **lenguaje de composición corporal**, que el repo tiene prohibido para menores
desde el dictamen de v448 y los candados de v485/v493 — es exactamente la misma clase que el
`weekEditorial` («RECOMPOSICIÓN · Más fuerte y más definido») que se retiró en v493 justo porque
se lo estaba diciendo a dos menores.

**Lo que haría:** cambiar el nombre del preset. El contenido no tiene nada de malo (es un circuito
de intervalos sin equipo); lo que sobra es la promesa sobre el cuerpo. Un nombre por lo que ES
—«HIIT sin equipo», «Intervalos en casa»— sirve igual para todos y no hay que gatear nada por edad.

---

## 🟢 Sano y verificado

- Los rápidos **cuentan bien**: historial, racha y volumen, cada uno con su `session_id` propio.
- El **HIIT deriva su duración del protocolo** (v545), así que las pausas largas ya no se cuentan
  como entreno ni se vuelven calorías.
- `clampQwHiit` acota rondas/trabajo/descanso de lo que teclea la persona (probado en la suite).
- **No pisan el plan**: la rutina rápida vive con id propio y las claves de sesión son suyas.

---

## Qué NO miré y por qué

- **No abrí el calentamiento**: es la siguiente ronda que pidió el PO, y merece su propia pasada
  (100 de 105 rutinas usan el auto-sugerido).
- **No revisé los textos de los 7 presets uno por uno con Sofía**: solo señalé el que choca con
  una regla dura (menores). El emoji 🍑 de «Glúteo & Pierna» y el tono del resto quedan sin juzgar.
- **No probé un rápido de punta a punta en un teléfono real** — como en todas las rondas, no hay
  banco físico. El repro del temporizador es Chrome headless.
- **No medí si los rápidos AYUDAN a la adherencia** (¿quien los usa entrena más?): con 9 personas
  y 44 sesiones no hay población para afirmar causalidad, y Mateo no concluye con N<10.
- **No audité `QUICK_WORKOUTS` como contenido deportivo** (¿son buenas sesiones?): eso es de Coach
  Pro/Valery, no mío. Solo miré los filtros que no corren y los textos que chocan con reglas ya
  escritas.
- ~~No revisé qué pasa si el catálogo cambia bajo un preset~~ → **lo comprobé antes de entregar,
  porque costaba diez segundos**: los 7 presets usan **27 ejercicios y los 27 están vivos en el
  catálogo; ninguno está en `REMOVED_EXERCISES`**. 🟢 Lo que sigue SIN candado es que mañana se
  retire uno y nadie avise — el cruce inverso que v502 pide para las fotos no existe para los
  presets.
