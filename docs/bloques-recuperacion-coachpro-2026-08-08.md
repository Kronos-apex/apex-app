# 🏋️ Bloques de recuperación por zona — Coach Pro

**Fecha:** 2026-08-08 · **Compañero de** [`dictamen-laura-dolor-2026-08-08.md`](dictamen-laura-dolor-2026-08-08.md).
Diseñado **DENTRO** de los límites de Laura (§4.3 de su dictamen), que son vinculantes.

> **Método de verificación (suyo, no a ojo):** cargó `GEN_ZONE_EXCL` desde `avi-core.js` y el
> catálogo desde `app-1-infra.js`, normalizó nombres con el mismo `_norm` del motor y probó los
> **42 ids citados (18 distintos)** contra las 3 regex de Laura.
> **Resultado: los 42 existen, los 42 son nivel `P`, y ninguno choca con ninguna lista.**
>
> **Verificado por Opus antes de aceptarlo:** `e227` **no existe** (el catálogo llega a `e226`;
> 220 ejercicios con huecos en e32, e38, e181, e208, e221, e224) — **el footer de CLAUDE.md decía
> `e1–e227` y estaba mal**. Y `_PAIN_ZONE_TO_EXCL` (`avi-core.js:4746`) mapea **solo 3 zonas**:
> `{ hombro, 'zona lumbar', rodilla }`.

**Reglas comunes a los 7 bloques:** 1–2 series · descanso 30–45 s · rango que no duele, nunca
«hasta donde aguantes» · dolor 0–3/10 y que BAJE al terminar · sin progresión automática · es un
MODO sobre el plan que ya tiene, con snapshot.

---

## 1 · ADUCTORES (ingle) — ~18 min

| # | id | Ejercicio | Dosis | Por qué | Fase |
|---|---|---|---|---|---|
| 1 | **e170** | Círculos de Cadera | 1×10 c/sentido | Movilidad de cadera sin carga | 🔴 Aguda |
| 2 | **e165** | Gato–Camello | 1×10 lentos | Movilidad del vecino de arriba | 🔴 Aguda |
| 3 | **e73** | Puente de Glúteo | 2×12 lentos | Activación BILATERAL que releva al aductor | 🔴 Aguda |
| 4 | **e72** | Dead Bug | 2×8 c/lado | Core sin carga, lumbar pegada | 🔴 Aguda |
| 5 | **e141** | Marcha en el Sitio | 1×3–5 min | Caminar sin impacto. **Solo si no cojea** | 🔴 Aguda |
| 6 | **e174** | Cadera 90/90 | 2×30 s c/lado | Devuelve rotación de cadera | 🟢 >72 h |

**Resto del cuerpo:** tren superior completo, preferible sentado/tumbado — e111, e219, e2, e114,
e27, e51, e52, e8, e117, e54, e21, e56, e120, e121, e11, e31, e57. Core: e17, e134, e133.
Cardio: e64, e67.
**Fuera:** e161, e68 (sumo abre la ingle) · **e60** (carga directa sobre el aductor) ·
e35/e124/e125/e162 · e186/e205.

> ⚠️ **Este bloque no tiene ni un solo ejercicio del músculo lesionado.** Es 100% vecinos, porque
> el isométrico de aducción no existe en el catálogo (ver §Faltantes).

---

## 2 · ABDUCTORES / glúteo medio — ~18 min

| # | id | Ejercicio | Dosis | Por qué | Fase |
|---|---|---|---|---|---|
| 1 | **e170** | Círculos de Cadera | 1×10 c/sentido | Movilidad sin carga | 🔴 Aguda |
| 2 | **e73** | Puente de Glúteo | 2×12 | Glúteo mayor bilateral, cero abducción | 🔴 Aguda |
| 3 | **e134** | Bird Dog | 2×8 c/lado | Estabilidad de pelvis sin cargar el abductor | 🔴 Aguda |
| 4 | **e163** | Abducción Tumbado de Lado | 1×12 | Activación con el peso de la pierna | 🔴 **solo lado SANO** / 🟢 afectado >72 h, rango corto |
| 5 | **e141** | Marcha en el Sitio | 1×3–5 min | Caminar, si no cojea | 🔴 Aguda |
| 6 | **e89** | Clamshell con Banda | 2×15 | Primera carga sobre el glúteo medio | 🟢 >72 h (sin banda entra en agudo) |

> ⚠️ **Choque que hay que resolver, y lo decide Laura:** ella prohíbe «trabajo unilateral sobre el
> lado afectado», pero **la abducción es unilateral por definición**. La salida propuesta sin
> ampliar su límite: en agudo se trabaja el **lado sano**; el afectado entra a partir de las 72 h.

**Resto:** igual que aductores + e130. **Fuera:** e129, e94, e40, e108, e186, e205.

---

## 3 · RODILLA — ~20 min

| # | id | Ejercicio | Dosis | Por qué | Fase |
|---|---|---|---|---|---|
| 1 | **e64** | Bicicleta Estática | 1×8–10 min **sin resistencia** | Rango sin carga | 🔴 Aguda |
| 2 | **e177** | Movilidad de Tobillo | 1×10 c/lado | Sin dorsiflexión la rodilla se va a valgo | 🔴 Aguda |
| 3 | **e73** | Puente de Glúteo | 2×12 | Extensión de cadera sin compresión femoropatelar | 🔴 Aguda |
| 4 | **e89** | Clamshell **sin banda** | 2×15 | Glúteo medio = control del valgo | 🔴 Aguda / 🟢 con banda |
| 5 | **e72** | Dead Bug | 2×8 c/lado | Core sin apoyar la rodilla en el suelo | 🔴 Aguda |
| 6 | **e174** | Cadera 90/90 | 2×30 s c/lado | Vecino de arriba | 🟢 >72 h |

> ⚠️ **Lo que NO puso a propósito:** **e128 Wall Sit** y **e158 Sit-to-Stand** son terapéuticos y,
> verificado en su script, **están excluidos** por la lista de rodilla — el `sentadilla` ancho se
> conserva **a propósito** ahí (está escrito en el comentario del propio código: en lumbar se
> estrechó, en rodilla no). No los mete. **Si Laura quiere un isométrico de cuádriceps, la
> excepción la firma ella.**
> También evitó **e134 Bird Dog** y **e130** en rodilla: la cuadrupedia apoya la rótula en el suelo.

**Resto:** tren superior sentado/tumbado — e1, e71, e2, e111, e219, e84, e6, e27, e114, e52, e51,
e137, e22, e23, e8, e117, e54, e21, e9, e10, e56, e120, e121, e11, e12, e31, e57, e222.
Core: e17, e49, e133.
**Fuera:** todo el regex + **e41, e107, e145, e199** (patrón de escalón, que la lista NO atrapa) +
e36/e37 hasta que Laura fije el rango.

---

## 4 · ZONA LUMBAR — ~20 min

| # | id | Ejercicio | Dosis | Por qué | Fase |
|---|---|---|---|---|---|
| 1 | **e165** | Gato–Camello | 1×10 lentos | Movilidad sin carga (Laura vetó we3/we5/wac3, no el cat-cow) | 🔴 Aguda |
| 2 | **e173** | Rotación Torácica | 2×8 c/lado | Torácica rígida = lumbar rotando de más | 🔴 Aguda |
| 3 | **e174** | Cadera 90/90 | 2×30 s c/lado | Vecino de abajo, mismo argumento | 🔴 Aguda |
| 4 | **e72** | Dead Bug | 2×8 c/lado | Core con lumbar pegada — lista SEGURA de Laura | 🔴 Aguda |
| 5 | **e134** | Bird Dog | 2×8 c/lado | Antiextensión/antirrotación — lista SEGURA | 🔴 Aguda |
| 6 | **e141** | Marcha en el Sitio (o caminar) | 1×5–10 min | Lo primero que Laura autoriza | 🔴 Aguda |

**Sustituciones desde el día 4 (siguen siendo 6):** **e133** Press Pallof 2×8 c/lado (la banda entra
AQUÍ, no antes) reemplaza a e134 · **e164** Plancha en Rodillas 2×15–20 s (**no al máximo**) ·
**e168** Cobra **solo si su dolor mejora en extensión** — lo decide Laura, la app no pregunta
preferencia direccional.

**NO puso, verificado:** **e148 «Patrón de Bisagra (Buenos Días sin Peso)»** — la lista lo excluye
por el nombre `buenos dias` aunque sea sin peso · **e167** Postura del Niño y **e179** Estiramiento
de Isquios (flexión / bisagra de rango final, prohibido en 48–72 h) · **e82**, **e132**, **e176**.

**Resto:** nada con carga axial — e111, e219, e2, e114, e27, e51, e52, e137, e15, e126, e37, e8,
e117, e54, e21, e56, e120, e121, e11, e31, e57.
**Fuera además del regex:** e22/e118/e98/e156 (todo press por encima de la cabeza comprime la
columna; la lista solo atrapa el de BARRA) · **e136** · e16/e59.

---

## 5 · HOMBRO — ~17 min

| # | id | Ejercicio | Dosis | Por qué | Fase |
|---|---|---|---|---|---|
| 1 | **e173** | Rotación Torácica | 2×8 c/lado | Le devuelve rango al hombro sin tocarlo. Sentado si molesta apoyar | 🔴 Aguda |
| 2 | **e180** | Movilidad de Cuello | 1×8 | Vecino cervical, donde se acumula la compensación | 🔴 Aguda |
| 3 | **e72** | Dead Bug | 2×8 c/lado | Core sin apoyo sobre el brazo | 🔴 Aguda |
| 4 | **e141** | Marcha en el Sitio | 1×5 min | Mover el cuerpo sin cargar el hombro | 🔴 Aguda |
| 5 | **e109** | Elevaciones Y-T-W en Suelo | 2×8 | Hombro posterior y trapecio bajo sin peso | 🟡 **solo T y W** en agudo; la **Y** desde 72 h |
| 6 | **e138** | Rotación Externa con Banda | 2×15, banda suave | Manguito rotador — lista SEGURA, pero es carga externa | 🟢 >72 h |

Después, si va bien: **e100** o **e21** Face Pull, 2×15.

**NO puso, verificado:** **e178 «Pasa-vallas de Hombro»** — es LO obvio para movilidad de hombro y
**la lista lo excluye** por nombre (`pasa-?vallas`) · **e166** Perro Boca Abajo · **e211**.

**Resto:** tren inferior completo + core — e36, e37, e15, e126, e42, e43, e70, e158, e128, e159,
e124, e35, e73, e106, e89, e129, e130, e163, e17, e49, e134, e64, e67.
**Fuera:** e13/e33/e58 (la barra se apoya sobre el hombro) · **e16** (almohadillas en el hombro →
usar e59 o e159) · **e136** · **e212**.

---

## 6 · CUELLO — ~16 min

| # | id | Ejercicio | Dosis | Por qué | Fase |
|---|---|---|---|---|---|
| 1 | **e180** | Movilidad de Cuello | 1–2×8, lento | El **único** ejercicio cervical del catálogo. Sin círculos completos | 🔴 Aguda |
| 2 | **e173** | Rotación Torácica | 2×8 c/lado | Torácica rígida obliga al cuello a girar de más | 🔴 Aguda |
| 3 | **e165** | Gato–Camello | 1×10 | Movilidad de toda la columna. La cabeza **acompaña**, no lidera | 🔴 Aguda |
| 4 | **e141** | Marcha en el Sitio | 1×5 min | Mover el cuerpo sin carga sobre el cuello | 🔴 Aguda |
| 5 | **e109** | Y-T-W en Suelo | 2×8, **frente apoyada** | Trapecio bajo = el que descarga al superior | 🟢 >72 h |
| 6 | **e100** | Face Pull con Banda | 2×15 muy suave | Retracción escapular con carga mínima | 🟢 >72 h |

**Resto:** tren inferior y core completos (mismo listado que hombro).
**Fuera con criterio propio (la app no tiene NADA para cuello):** e136, e206, e207, e115, e212,
e211, e7/e22/e23/e118, e13/e33/e58 (barra sobre el trapecio), e4/e103.

---

## 7 · TOBILLO — ~19 min

| # | id | Ejercicio | Dosis | Por qué | Fase |
|---|---|---|---|---|---|
| 1 | **e72** | Dead Bug | 2×8 c/lado | Core sin carga y sin apoyar el pie | 🔴 Aguda |
| 2 | **e73** | Puente de Glúteo | 2×12 | Cadena de cadera, cero carga en el tobillo | 🔴 Aguda |
| 3 | **e171** | Balanceo de Piernas | 1×12 c/lado, amplitud corta, agarrado | La pierna se mueve **sin apoyar** | 🔴 Aguda |
| 4 | **e64** | Bicicleta Estática | 1×8–10 min sin resistencia | Bombeo y rango sin impacto | 🔴 Aguda |
| 5 | **e177** | Movilidad de Tobillo | 2×10 | Dorsiflexión, el primer rango que se pierde | 🟡 Aguda **solo si apoya sin cojear**; si no, >72 h |
| 6 | **e159** | Elevación de Talones a Peso Corporal | 2×12 **bilateral, con apoyo en pared** | Pantorrilla/Aquiles con carga repartida | 🟢 >72 h |

**NO puso:** **e166** Perro Boca Abajo (talones al suelo = estirar el Aquiles donde duele) ·
**e141** (impacto sobre el tobillo; prefiere e64) · e128/e158/e160 (carga cerrada).

**Resto:** tren superior sentado/tumbado (listado de rodilla) + e15, e126, e37, e42/e43 (pies
apoyados, solo si no duele), core e17/e49/e134/e133.

---

## ⚠️ Lo que le FALTA al catálogo — no lo inventó

Con los 220 ejercicios reales, estos son de primera línea en fisioterapia y **no existen**:

1. **Aductores** — isométrico de aducción (pelota/toalla entre las rodillas a 0°/45°/90°) y su
   progresión (Copenhagen). Por eso el bloque de aductores es 100% vecinos.
2. **Rodilla** — *quad set*, *elevación de pierna recta (SLR)*, *deslizamiento de talón*. Los tres
   están escritos en la **fase 1 de la tabla de la propia Laura** y ninguno está en el catálogo.
3. **Hombro** — *pendulares de Codman*, *deslizamiento en pared/mesa*, isométricos submáximos contra
   la pared. El bloque de hombro agudo hoy **no toca el hombro**.
4. **Cuello** — *retracción cervical (chin tuck)*, isométricos cervicales contra la mano,
   estiramiento de trapecio superior/escaleno. Hay **un solo** ejercicio de cuello.
5. **Tobillo** — *bombeo/alfabeto de tobillo sentado*, *inversión/eversión con banda*, *apoyo en un
   pie*. Laura escribe «propioceptivo y equilibrio antes de pliometría» y **no hay ni un ejercicio
   de propiocepción**.
6. **Genérico** — *respiración diafragmática*: Laura la autoriza explícitamente en agudo y no existe.

## 🔎 Auditoría del catálogo

- **e174 «Cadera 90/90»** está como `muscle:'gluteo'` siendo movilidad de rotadores de cadera;
  **e170, e165, e167, e168, e173, e176** están como `muscle:'core'` siendo movilidad de
  cadera/columna. Se citan por id, pero **quien filtre por `muscle` no encontrará la movilidad de
  cadera**.
- **e180 «Movilidad de Cuello»** es `muscle:'otro'` — el único ejercicio cervical es invisible a
  cualquier filtro por músculo.
- Los 16 de movilidad (e165–e180) traen `sets:1` + `track:'reps'|'tiempo'`. Quien implemente **debe
  respetar `track`**, no forzar sets×reps: **e166/e167/e174/e179** son tiempo;
  **e165/e170/e171/e173/e177/e180** son reps.

## 🚨 3 huecos VIVOS en las listas de exclusión (para Laura — Coach Pro no los toca)

1. **hombro** — **`e212 «Paseo del Camarero»`** es un acarreo con mancuerna **fija SOBRE LA CABEZA**
   y la lista **no lo atrapa**: dice `sobre la cabeza`, pero eso está en la *descripción*, no en el
   *nombre*, y el filtro solo mira el nombre. **`e211 «Colgarse de la Barra»`** tampoco.
2. **rodilla** — la lista atrapa `sentadilla|zancada|estocada|desplante` pero **no el patrón de
   escalón**: `e41`, `e107`, `e145`, `e199` pasan enteros.
3. **lumbar** — **`e136 «Caminata del Granjero»`** (carga axial pesada de pie) pasa entero.

## 🧱 El límite estructural — lo más importante

De las 7 zonas pedidas, **la app solo sabe reconocer 3**. `GEN_LIMIT_KWS` detecta
rodilla/lumbar/hombro y `GEN_ZONE_EXCL` solo tiene reglas para esas 3:

- **`cuello` no existe ni como área declarable.** `PAIN_AREAS` = hombro, pecho, codo, muñeca,
  espalda alta, zona lumbar, cadera, rodilla, tobillo, otra zona. **Nadie puede decir que le duele
  el cuello.**
- **`tobillo` y `cadera` SÍ se declaran pero no excluyen NADA** — `_PAIN_ZONE_TO_EXCL` solo mapea
  hombro/lumbar/rodilla (**verificado**, `avi-core.js:4746`). Quien declara dolor de tobillo hoy
  recibe el plan completo, **saltos incluidos**.
- **aductores/abductores no existen en ninguna capa**; caen bajo `cadera`, que no filtra.

**Entregar estos 7 bloques sin cerrar eso deja 4 de 7 zonas con un bloque de recuperación que nadie
puede llegar a activar.** Ese es el trabajo de plomería que va antes o junto con la implementación.
