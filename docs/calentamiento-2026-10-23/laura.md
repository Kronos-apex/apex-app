# Dictamen de Laura — calentamiento por sesión (propuesta consolidada del 23-oct-2026)

Veredicto fisioterapéutico VINCULANTE sobre `consolidado.md`. Lo que aquí dice ❌ no se programa; lo que dice 🟡 se queda y la cautela va en el TEXTO de la pieza; ✅ no pide nada.
Fuentes leídas: `consolidado.md`, `coach-pro.md` §7, `valery.md` §8, `WARMUP_LIBRARY` y `buildWarmup` (app-6-extra.js), `WARMUP_ZONE_EXCL_IDS`, `GEN_ZONE_EXCL`, `GEN_EXCL_IDS`, `GEN_LIMIT_KWS`, `_PAIN_ZONE_TO_EXCL`, `warmupContraindicated` (avi-core.js).
Cómo medí: corrí `warmupContraindicated` real sobre los nombres de las 14 piezas nuevas contra las 11 zonas con lista (script de la sesión, no entra al repo). El resultado fija la sección 1.

## 0. Veredicto en una línea

**Se puede programar CON mis cambios, no tal cual.** Condiciones: (a) las listas por zona de la sección 1, **todas por id**; (b) las alternas de la sección 2 (el orden de la cadena importa); (c) los textos de la sección 5; (d) **no entran `wg4` ni `wf1`** hasta que existan las claves de la sección 3; (e) los candados de la sección 6.

## 0.1 Lo que encontré midiendo (por qué «por id y no por nombre»)

El filtro mira el id Y el NOMBRE (regex de la zona). Los nombres de las piezas nuevas esquivan casi todas las reglas:

| Pieza nueva | Debería caer en… | El nombre la deja pasar porque… |
|---|---|---|
| `wg4` Saltar cuerda | rodilla, lumbar, cuello, tobillo, aductor, abductor | las reglas dicen `\bsalto`; «saltar» no lo contiene |
| `wag1` Almeja | aductor, abductor | las reglas dicen `clamshell`/`concha`; «almeja» no |
| `wag2` Caminata lateral | aductor, abductor, tobillo | las reglas dicen `paso lateral`/`paso/patada… lateral`; «caminata lateral» no |
| `wa6` Colgado activo | hombro, cuello | las reglas dicen `colgarse`; «colgado» no (codo y muñeca sí la cazan por `colgad`) |
| `wa5`, `wah2`, `wf1`, `wac4`, `wag3` | ver matriz | ninguna regla las nombra |

Y tres piezas que HOY caen solo por el nombre y no por id: `wc2` en rodilla (`estocada`), `wh3` en pecho (`apertura de pecho`), `wa1` en muñeca/cuello/hombro (`lagartija`). Basta reescribir el nombre («Paso largo con rotación») para que el filtro deje de protegerlas sin que ninguna prueba lo note. **Las tres pasan a lista por id.**

## 1. Matriz pieza × zona

Columnas: Rod = rodilla (incluye menisco, LCA, rótula, «muslo por delante») · Lum = lumbar (incluye hernia, disco, ciática, «muslo por detrás») · Hom = hombro · Cue = cuello (incluye «espalda alta») · Cod = codo · Mun = muñeca o mano · Pec = pecho · Tob = tobillo (incluye pie, Aquiles, fascitis y pantorrilla) · Adu = aductor · Abd = abductor («cadera o ingle» activa los dos) · Isq = isquios (nunca llega sola: «muslo por detrás» siempre trae Lum).
**NUEVO** = cambia respecto de `WARMUP_ZONE_EXCL_IDS` de hoy. Piezas que SALEN del catálogo (`wa2`, `wr1`, `we3`, `wh5`) se quitan también de las listas por zona (`we3` de lumbar y cuello; `wa2` de cuello) una vez migradas las rutinas propias, con una prueba que confirme que ningún id de lista queda huérfano.

| Pieza | Rod | Lum | Hom | Cue | Cod | Mun | Pec | Tob | Adu | Abd | Isq | Cambia |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `wh1` círculos de hombro | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `wh2` manguito rotador | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `wh3` apertura de pecho en pared | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | pecho pasa a lista por id |
| `wm1` círculos de muñeca | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `wm2`/`wm3` estiramientos muñeca (solo manual) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | — (son el automanejo de codo/muñeca) |
| `wc1` círculos de cadera | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | — |
| `wc2` estocada con rotación | ❌ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | **NUEVO** tobillo; rodilla por id |
| `wc3` 90/90 (transiciones) | ❌ | ❌ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🟡 | **NUEVO** lumbar |
| `wc4` puente de glúteo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | — |
| `wc5` patada lateral de pie | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | ✅ | aductor/abductor pasan a id |
| `wr2` sentadilla de movilidad lenta | ❌ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — |
| `wr3` isquios de pie | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | **NUEVO** lumbar |
| `wt1` círculos de tobillo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — (es el tratamiento) |
| `wt2` tobillo en pared | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — |
| `we1` gato-vaca | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `we2` rotación torácica en suelo | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | — |
| `we4` plancha de hombros | ✅ | ✅ | ❌ | ❌ | 🟡 | ❌ | 🟡 | ✅ | ✅ | ✅ | ✅ | — |
| `we5` rollitos (solo manual) | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | **sale de las recetas** (§2, §3) |
| `wa1` lagartija | ✅ | ✅ | ❌ | ❌ | 🟡 | ❌ | 🟡 | ✅ | ✅ | ✅ | ✅ | muñeca pasa a id |
| `wa3` apertura con banda | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `wa4` balanceo brazos cruzados (solo manual) | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `wai1` sentadilla corporal | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — |
| `wai2` desplante alterno | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | — |
| `wai3` bisagra sin peso | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | — |
| `wai4` elevación de talones | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — |
| `wac1` plancha corta | ✅ | ✅ | 🟡 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `wac2` deadbug | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `wac3` rotación de cadera tumbado | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **`wg1`** cardio suave en máquina | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | nueva; **nunca se excluye** |
| **`wg2`** marcha en el lugar | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | nueva; nunca se excluye |
| **`wg3`** caminata rápida | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | nueva |
| **`wg4`** cuerda — **NO ENTRA** | ❌ | ❌ | 🟡 | ❌ | ✅ | 🟡 | 🟡 | ❌ | ❌ | ❌ | ✅ | ninguna receta la usa (§3) |
| **`wf1`** gusano — **APLAZADA** | ✅ | ❌ | ❌ | ❌ | 🟡 | ❌ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ver §3 |
| **`wa5`** Y y T | ✅ | 🟡 | ❌ | ❌ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | nueva |
| **`wa6`** colgado activo | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🟡 | ✅ | ✅ | ✅ | ✅ | nueva; codo y muñeca por id |
| **`wag1`** almeja con banda | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | nueva |
| **`wag2`** caminata lateral con banda | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | nueva |
| **`wag3`** patada atrás en cuatro apoyos | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ✅ | ✅ | ✅ | ✅ | 🟡 | nueva |
| **`wac4`** perro de caza | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | nueva |
| **`wac5`** respiración 360° | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | nueva |
| **`wah1`** jalón facial liviano | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | nueva; sin receta la usa → entra como alterna (§2) |
| **`wah2`** deslizamiento en pared | ✅ | 🟡 | ❌ | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | nueva |

### 1.1 Las listas resultantes (para `WARMUP_ZONE_EXCL_IDS`)

```
lumbar:   we5, wai3, wac3, wc3*, wr3*            (+ wf1 cuando entre)
rodilla:  wr2, wai1, wai2, wc3, wc2*             (wc2 por id: hoy cae solo por el nombre)
hombro:   wh3, we4, wa1, wa5*, wa6*, wah2*       (+ wf1)
cuello:   we4, wa1, wac1, we5, wa5*, wa6*        (+ wf1)
tobillo:  wai1, wai2, wai4, wt2, wr2, wc2*, wag2*
muneca:   we4, we1, wa1*, wa6*, wac4*, wag3*     (+ wf1)    wa1 por id
codo:     wa6*                                   (hoy cae por el nombre «colgad»)
pecho:    wh3*                                   (hoy cae por el nombre)
aductor:  wc2, wc3, wc5, wai2, wag1*, wag2*
abductor: wc2, wc3, wc5, wai2, wag1*, wag2*
isquios:  — (sin cambio; nunca llega sola)
```
`*` = nuevo. Las razones clínicas de lo nuevo:
- **`wc3` y `wr3` en lumbar.** Mi dictamen del 20-sep dejó `wr3` fuera de lumbar porque era una pieza entre cinco que el motor rotaba. Ahora `wr3` es FIJA en GP_B y `wc3` fija en GP_A: cambió el mecanismo y caducó el dictamen. Y la clave `lumbar` mezcla hernia, disco y ciática: no puedo separar quién tiene irradiación, y el isquio de pie con el tronco al frente es la postura de tensión neural (el mismo test de elevación de pierna recta). `wc3` sentada en el suelo con el sacro hacia atrás mete flexión lumbar sostenida más rotación de cadera, el patrón de cizalla del anillo que ya saqué en `wac3`. Costo: casi cero, porque cada una tiene alterna segura (`wc1`, `wc2`).
- **`wc2` en tobillo.** Es la misma razón por la que `wt2` y `wr2` ya están fuera: dorsiflexión del pie delantero bajo el peso del cuerpo. Una Aquiles o pantorrilla en fase aguda no la tolera. Con Aquiles, `wt2` + `wc2` son además las dos fijas de PIERNA: no pueden quedar las dos.
- **`wag2` en tobillo.** Paso lateral con apoyo unilateral y banda: la regla del entreno ya excluye `paso lateral` por la misma inversión con carga.
- **`wag1`, `wag2` en aductor/abductor.** `wag1` es el clamshell (la regla ya excluye `clamshell` en ambas); `wag2` es el desplazamiento lateral con la pelvis sostenida sobre una pierna, el mecanismo de las dos zonas.
- **`wa5`, `wah2` en hombro; `wa5`, `wa6` en cuello; `wa6` en hombro.** La Y es brazo por encima de la cabeza en el arco 60-120° (mi lista de hombro ya excluye `sobre la cabeza`); el deslizamiento en pared cruza el mismo arco con fricción; el colgado pone todo el peso en la cápsula y el manguito (`colgarse` ya está excluido en hombro y cuello, pero «colgado» no lo cae). `wa5` boca abajo es el nadador/superman que ya está en la lista de cuello.
- **`wac4`, `wag3` en muñeca.** Cuadrupedia con la muñeca en extensión máxima: el mismo mecanismo por el que `we1` ya está fuera. El texto de `wac4` ofrece puños o antebrazos, pero el filtro no puede leer eso: se excluye.
- **`wa6`, `wa1` por id en codo/muñeca.** No dependen del nombre.

## 2. Promociones: qué entra cuando cae una pieza

**Regla del mecanismo (obligatoria).** Cada hueco de la receta lleva una CADENA ordenada de alternas, escrita a mano. Se evalúa contra la UNIÓN de todas las zonas declaradas (quien tiene rodilla y lumbar se filtra por las dos a la vez). Entra la primera de la cadena que no esté excluida y que no esté ya en la receta. Si ninguna sirve, el hueco queda VACÍO. **Jamás** se cae a «cualquier pieza del grupo». `wuTake`/la rotación de v644 solo baraja los pares declarados explícitamente `(A | B)` y el filtro corre ANTES.

Notación: `A > B` = si cae A entra B. `(A | B)` = par rotable. «—» = vacío.

| Receta | Hueco | Cadena final | Qué pasa por zona (solo donde algo cae) |
|---|---|---|---|
| **EMPUJE** | mov | `wh1` · `wh3 > wh2` · `wm1` | Hom/Pec: `wh3`→`wh2` (✅🟡) |
| | act | `wa3` · `we4 > wah1` | Hom/Cue/Mun: `we4`→`wah1` |
| **TRACCION** | mov | `we2` · `wh1` | nada cae |
| | act | `wa6 > wah1` · `(wa3 \| wa5) > wa3` | Hom/Cue/Cod/Mun: `wa6`→`wah1`; si el par saca `wa5` y cae, `wa3` |
| **PIERNA** | gen | `wg1` (bici) `> wg2` | `wg1` no cae nunca |
| | mov | `wt2 > wt1` · `wc2 > wc1` · `(wc3 \| wr3) > wc1` | Tob: `wt2`→`wt1`, `wc2`→`wc1`. Rod: `wc2`→`wc1`; el par `wc3`→`wr3` (✅). Lum: `wc2` se queda; par: `wc3` y `wr3` caen, entra `wc1`. Adu/Abd: `wc2`→`wc1` (🟡 círculos pequeños), par→`wr3` |
| | act | `wc4` · `(wc5 \| wag2) > wag3` | Adu/Abd: el par cae entero → `wag3`. Tob: `wag2` cae → `wc5` (🟡) |
| **TREN_SUP** | mov | `wh1` · `we2` · `wh3 > wh2` | como EMPUJE |
| | act | `wa3` · `we4 > wah1` | como EMPUJE |
| **HOMBROS_BRAZOS** | mov | `wh1` · `wh2` · `wm1` | nada cae |
| | act | `wa3` · `(wa5 \| wah1)` | Hom/Cue: `wa5`→`wah1` |
| **CARDIO_CORE** | mov | `wc1` · `we1 > we2` · (impacto: `wt1`, `wai4`) | Mun: `we1`→`we2`. Tob: `wai4` cae y se queda vacío (`wt1` queda: es el tratamiento) |
| | act | `wac2 > wac5` | hoy `wac2` no cae por zona; la cadena queda lista para la clave de §3 |
| **FULL_BODY** | gen | `wg1` 4 min; sin máquina `wg2` (**no `wf1`**) | — |
| | mov | `wc2 > wc1` · `wt2 > wt1` · `wh1` | Rod/Tob/Adu/Abd: `wc2`→`wc1`; Tob: `wt2`→`wt1` |
| | act | `wc4` · `wa3` | nada cae |
| **GP_A** | mov | `wt2 > wt1` · `wc2 > wc1` · `wc3 > wc1` · `wr2` | Rod: `wc2`→`wc1`, `wc3`→(`wc1` ya usada)→vacío, `wr2` vacío. Lum: `wc3`→`wc1`. Tob: `wt2`→`wt1`, `wr2` vacío. Adu/Abd: `wc2`/`wc3`→`wc1` una vez |
| | act | `wc4` · `wag1 > wag3` · `wag2 > wag3` | Adu/Abd: `wag1`→`wag3`, `wag2` vacío. Tob: `wag2`→`wag3`. Mun: `wag3` no entra, vacío |
| **GP_B** | mov | `wt2 > wt1` · `wr3` · `wc5` · `(wc3 \| wc2) > wc1` | Lum: `wr3` vacío; el par→`wc2`. Rod: el par→`wc1`. Adu/Abd: `wc5` vacío, par→`wc1` |
| | act | `wc4` · `wai3` · `wag3 > wag1` | Lum: `wai3` vacío. Mun: `wag3`→`wag1` |
| **TREN_SUP (mujer)** | mov | `wh1` · `we2` · `wah2 > wh2` | Hom: `wah2`→`wh2`, que ya está en act: dedupe → vacío |
| | act | `wa3` · `wh2` · `wa1 > wah1` | Hom/Cue/Mun: `wa1`→`wah1` |
| **EMP_BRAZOS** | mov | `wh1` · `wh3 > wh2` · `wm1` | Hom/Pec: `wh3`→`wh2` ya está en act → vacío |
| | act | `wa3` · `wh2` | nada cae |
| **CORE_CARDIO (mujer)** | mov | `we1 > we2` · `we2` · `wc1` (**`we5` fuera**) | Mun: `we1`→`we2` ya presente → vacío |
| | act | `wac5` · `wac4 > wac2` · (impacto: `wt2 > wt1`, `wai4`) | Mun: `wac4`→`wac2`. Tob: `wt2`→`wt1`, `wai4` vacío |

Por qué cada alterna es segura (las que el consolidado NO traía o que cambié):
- **`wc1` para `wc2`/`wc3`**: círculos de cadera sin carga, ✅ en todas las zonas menos 🟡 en aductor/abductor (círculos chicos, sin llegar a la ingle) — la única alterna universal del bloque de cadera. Va con una vez-por-receta (dedupe), si no se repite.
- **`wt1` para `wt2`**: círculos de tobillo sentado: es el tratamiento, ✅ en todas.
- **`wh2` para `wh3`**: rotación externa/interna con codo pegado, ✅ en hombro (la lista de «seguros» de hombro la incluye).
- **`wah1` para `we4`/`wa1`/`wa6`/`wa5`**: retracción escapular con banda liviana, ✅ en hombro; es la única pieza de «espalda alta» que sirve a la vez a hombro, cuello y muñeca. Por eso **`wah1` SÍ entra**, pero solo como alterna (en el consolidado era huérfana).
- **`wag3` para `wag1`/`wag2`**: extensión de cadera en cuatro apoyos, sin base abierta ni apoyo unilateral de pie: ✅ en aductor y abductor. Cae en muñeca, por eso GP_B tiene `wag3 > wag1` y no al revés.
- **`we2` para `we1`**: ya era ✅ en muñeca.
- **`wac2` para `wac4` (CORE_CARDIO)**: solo cuando `wac4` cae por muñeca; no es la primera opción por la razón de §3 (diástasis).
- **`wac5` para `wac2`**: respiración, ✅ en todas.
- **Lo que NO propongo**: ninguna cadena cae a `wai1`, `wai2`, `wr2` ni a ninguna pieza de plancha. Un hueco de menos no hace daño.

Dos consecuencias que el consolidado no dice:
1. **«Fija» no es «inmune».** `wt2` y `wc2` son fijas en PIERNA, pero el filtro corre antes: con tobillo se van las dos. Está bien; solo hay que escribirlo para que nadie lea la receta como garantía.
2. **El tope de 7 piezas ya se pasa**: GP_A suma 8 (`wg1`, 4 de movilidad, 3 de activación) y GP_B suma 8. Es producto, no seguridad; lo dejo anotado porque una lista larga se abandona.

## 3. Casos especiales y lo que la app NO sabe leer hoy

### 3.1 Lo que SÍ lee (y cómo queda)
| Caso | ¿La app lo lee? | Cómo queda |
|---|---|---|
| Hernia discal, disco, protrusión, ciática, lumbalgia | Sí → `lumbar` | Fuera `we5`, `wai3`, `wac3`, `wc3`, `wr3`. Quedan `wc4`, `wac2`, `wac4`, `wac5`, `wag3`, `wc2` (texto cuida el giro), `we2` y `wg1` (bici). La derivación médica por irradiación sigue siendo del banner del coach (`GEN_NERVE_RE`): el calentamiento no la reemplaza |
| Menisco o LCA operados, condromalacia | Sí → `rodilla` | Fuera `wc2`, `wc3`, `wr2`, `wai1`, `wai2`. 🟡 `wag2` (cuarto de sentadilla con banda sobre las rodillas, que es lo que se usa en la rótula), `wt2`, `wag1`, `wag3`, `we1`/`wac4` con toalla bajo las rodillas. **Válido desde fase 3 (~3 meses con alta parcial). En fases 1-2 las recetas automáticas no aplican: el coach arma la lista a mano** (`wg1` en bici, `wc4`, `wt1`, `wh1`, `wa3`) |
| Aquiles, esguince, fascitis, pantorrilla | Sí → `tobillo` (pantorrilla también) | Fuera `wt2`, `wc2`, `wai4`, `wai1`, `wai2`, `wr2`, `wag2`. `wt1` queda. `wg1` en bici; `wg3` solo plana |
| Hombro (manguito, pinzamiento, inestabilidad) | Sí → `hombro` | Fuera `wh3`, `we4`, `wa1`, `wa5`, `wa6`, `wah2`. Quedan `wh1`, `wh2`, `wa3`, `wah1` |
| Cuello / espalda alta | Sí → `cuello` | Fuera `we4`, `wa1`, `wac1`, `we5`, `wa5`, `wa6`. Quedan `wa3`, `wah1` |
| Codo, muñeca | Sí | `wa6` (ambas); muñeca además `we1`, `wa1`, `we4`, `wac4`, `wag3`. `wm1`, `wm2`, `wm3` se quedan (son el tratamiento) |
| Aductor, abductor, ingle, cadera | Sí → las dos zonas | Fuera `wc2`, `wc3`, `wc5`, `wai2`, `wag1`, `wag2`. Entra `wag3` |
| Sobrepeso | Parcial: `bodyLoadProfile` → 'high' (masa/IMC/cintura), pero el calentamiento NO lo consulta | Hoy no hace falta: `wg1` y `wg2` ya son sin impacto y `wg4` no entra. **Si algún día entra `wg4` o una pieza de impacto, 'high' debe excluirla** (mi objeción de v609 sigue en pie) |

### 3.2 Lo que NO lee, y qué hace falta
| Caso | Qué hace falta | Prioridad |
|---|---|---|
| **Postparto, cesárea, diástasis abdominal, embarazo, piso pélvico, prolapso** | Clave nueva `core_central` en `GEN_LIMIT_KWS` (palabras: `postparto\|posparto\|diastasis\|cesarea\|piso pelvico\|prolapso\|embaraz\|hernia umbilical\|hernia abdominal`; ojo: NO la palabra suelta `hernia`, que ya es lumbar). Lista de calentamiento: `wac1`, `wac2`, `we5`, `we4`, `wf1`. Y en el entreno, sin impacto ni flexión de tronco (`wg4`, saltos, crunch). Remplazos que sí sirven: `wac5` y `wac4` | **Alta antes de publicar el CORE_CARDIO de mujer.** Hoy `wac1` y `wac2` no están en ninguna lista de diástasis |
| **Osteopenia / osteoporosis** | Clave `hueso` (`osteopeni\|osteopor`). Lista: `we5`, `wf1`, `wac3`; y en el entreno nada de flexión de tronco con carga | Media. Mientras no exista, `we5` y `wf1` no están en recetas |
| **Hipertensión / cardiopatía** | Clave `presion` (`hipertens\|presion alta\|tension alta\|cardiopat\|arritmia\|infarto`). Lista: `wa6`, `wf1`, `wac1` (apneas e isométricos). El tope de esfuerzo del cardio (RPE 3-4) ya lo cumple el texto de `wg1` («que puedas conversar») | Media |
| **Ciclo menstrual** | Nada (de acuerdo con Valery: el texto de `wg1` ya dice «baja el ritmo si no te sientes bien») | — |

**Interino, hasta que existan las claves** (sin tocar el motor): `we5` fuera de las recetas; `wac2` NO es la primera opción de CORE_CARDIO de mujer (la cadena es `wac4 > wac2`, no el par); `wf1` y `wg4` no se programan; y los textos de `wa6`, `wac1`, `wac2` y `wac5` llevan la frase de respirar y detenerse (sección 5).

### 3.3 Impacto
- **`wg4` cuerda: NO ENTRA.** Ninguna receta del consolidado la usa (no aparece en ninguna tabla), cae en SEIS zonas, y su nombre esquiva el filtro. Pieza de impacto que nadie pidió, sin forma de leer postparto, sobrepeso ni osteopenia. Se puede revisar el día que una receta la pida y existan `core_central` y 'high' conectado.
- **`wg2` marcha en el lugar**: sí, con el texto «rodillas hasta la mitad del muslo, sin saltar». Es bajo impacto y no necesita lista. La «marcha con rodillas altas» que menciona Coach Pro como trote NO es la pieza definida en el consolidado; si alguien la quiere, es otra pieza y vuelve a mí.

### 3.4 `wf1` gusano: aplazada
Cuatro zonas la excluyen (lumbar, hombro, cuello, muñeca), y las tres poblaciones que la contraindican (osteoporosis, diástasis, hipertensión) la app no las lee. Es la única pieza del paquete que dependería sobre todo del texto. Para FULL_BODY corporal queda **`wg2` + `wc1`** (marcha + círculos de cadera). Cuando existan `core_central`, `hueso` y `presion`, la reviso con su texto de §5 y la lista de §1.1.

## 4. Aproximación

La regla de `consolidado.md` es segura **con tres ajustes**.

1. **Nunca se acorta con zona declarada, nunca llega al 90 %.** Coach Pro tiene razón: con una molestia declarada se agregan pasos de rampa, no se quitan. Pero el 90 % × 1-2 NO se programa en ejercicio con barra de tren superior si hay hombro, pecho, codo o cuello declarados (un single al 90 % con el manguito o el codo irritados es la carga más agresiva de toda la sesión y no calienta nada que el 75 % no haya calentado). Mismo criterio para `generic` (operado sin zona).
2. **Lumbar / hernia: se puede, con condición.** El filtro del entreno ya quita sentadilla con barra y peso muerto de la rutina que genera la app; lo que sobrevive son hip thrust con barra, prensa, goblet. Para esos, 40 %×8, 60 %×5, 80 %×3 está bien. Si el COACH dejó a mano un peso muerto o una sentadilla con barra a alguien con lumbar declarado (la regla es marca, no bloqueo), la rampa es de **3 series como máximo (40/60/80 %), nunca la del 90 %, con tempo controlado y sin pausa de aguantar el aire**. Hip thrust: la primera con barra sola y pausa de 2 s, **exhalando al subir** (nada de Valsalva; vale también para postparto e hipertensión).
3. **Hombro: el press al 75 % es el techo.** 50 %×8, 75 %×4, y el escalón del 90 % se omite. Con hombro declarado además quedan fuera `press de banca con barra`, inclinado y declinado con barra (por regla del entreno); lo que sobrevive es máquina horizontal: 1 serie al 60 %, rango sin dolor.

Además:
- **Base de cálculo.** «Último peso registrado» como 100 % es falso tras una pausa o un dolor. Si el último registro del ejercicio tiene más de 4 semanas, o hay dolor reportado en los últimos 14 días, se calcula sobre el **90 %** de ese peso. (Es una regla de carga; que la confirme Andrés Hyp, pero desde seguridad la exijo.)
- **Que el filtro no deje la primera serie real en frío** (la pregunta de Coach Pro): lo garantizo así. (a) `wg1` y `wg2` nunca se excluyen en ninguna zona, o sea el bloque general siempre existe. (b) La aproximación del primer ejercicio nunca se filtra por zona (si el ejercicio sobrevivió al filtro, su aproximación va completa). (c) La casilla «ya vengo caliente» salta SOLO el bloque general, nunca la movilidad ni la aproximación. (d) Si una zona vacía toda la activación, queda el bloque general + la aproximación, que es suficiente: un calentamiento de menos no hace daño; uno contraindicado sí.
- Cuello declarado: nunca series de aproximación de encogimientos o remo con barra (ya caen en el filtro del entreno).
- Tope «3 ejercicios y 6 series» queda, con la excepción de la rampa extendida de ítem 2 (lo que pase de 6 por este motivo se recorta de los ejercicios posteriores, no de la rampa).

## 5. Textos

**Regla general de redacción**: ningún texto dice «lo más alto posible», «hasta sentir el estiramiento» ni «relaja», que invitan a ir al final del rango; toda indicación lleva su condición de parada («si duele, para»); usa género neutro («acuéstate», no «acostada»). Los ids de zona NO viven en el texto: el texto cuida a quien no declaró nada.

### 5.1 Las tres que se corrigen
| Pieza | Texto final | Repeticiones |
|---|---|---|
| `wc3` Apertura de cadera (90/90) | «Sentado en el suelo, las dos rodillas dobladas a 90°, una delante y otra detrás, el tronco ERGUIDO. Sin apoyar las manos si puedes, gira las rodillas hacia el otro lado y cambia de posición. Despacio, sin dejar caer la rodilla hasta el suelo ni forzar. Si sientes tirón o dolor en la rodilla, la cadera o la ingle, detente.» | 6 cambios |
| `wc5` Patada lateral de pie | «De pie, una mano apoyada en la pared y el tronco erguido. Lleva la pierna estirada hacia el lado hasta la altura de la cadera (no más), sin inclinar el cuerpo ni balancearte, y vuelve con control. Primero un lado, luego el otro.» | 12 c/lado |
| `we5` Rollitos sobre colchoneta (solo biblioteca/manual) | «Acostado boca arriba sobre una colchoneta gruesa, abraza las rodillas y balancéate unos centímetros adelante y atrás, sin llegar a apoyar el cuello. Lento. Si sientes dolor o presión en la espalda o el cuello, detente.» | 8 |

Cambios de fondo: `wc3` ya no es una inclinación sobre la pierna delantera (flexión lumbar + rodilla en flexión profunda cargada) sino la transición activa que pidió Coach Pro. `wc5` pierde «al frente y atrás» (el lumbar se arquea al llevar la pierna atrás) y «lo más alto posible» (rotación de pelvis y lumbar). `we5` pierde «masajeando y descomprimiendo» (promesa terapéutica falsa) y «rueda sobre la columna».

### 5.2 Las nuevas
| Pieza | Texto final | Reps |
|---|---|---|
| `wg1` Cardio suave en máquina | «Bici o elíptica (o caminadora plana si no tienes molestia en rodillas ni tobillos), a un ritmo en que puedas conversar. El último minuto sube un poco, sin ahogarte. Si te mareas o te falta el aire, baja el ritmo.» | 3-5 min |
| `wg2` Marcha en el lugar con brazos | «Marcha con los brazos al ritmo. Las rodillas suben hasta la mitad del muslo, no más; pisa suave y sin saltar.» | 3-5 min |
| `wg3` Caminata rápida | «Camina a paso firme y con los brazos sueltos, en terreno plano (en banda, sin inclinación). Debes poder hablar entrecortado, no cantar.» | 5 min |
| `wa5` Elevaciones en Y y T | «Boca abajo con la frente apoyada (en la colchoneta o con el pecho sobre un banco inclinado), sin peso. Con el cuello largo, levanta los brazos en Y y bájalos; luego en T, con los pulgares arriba. El pecho no se despega del apoyo. Si el hombro o el cuello molestan, no lo hagas.» | 8 de cada una |
| `wa6` Colgado activo en barra | «Cuélgate con las manos al ancho de los hombros y los brazos estirados. Baja los hombros lejos de las orejas sin doblar los codos y respira normal, sin aguantar el aire. Si no llegas, deja los pies apoyados en el suelo o en un banco. Suelta si el hombro, el codo o la mano molestan.» | 2 × 15-20 s |
| `wag1` Almeja con banda | «Acuéstate de lado con la cabeza sobre el brazo o una almohada, las rodillas dobladas y la banda sobre ellas. Abre la rodilla de arriba sin que la cadera ruede hacia atrás. Despacio. Si duele la ingle o la cadera, detente.» | 12 c/lado |
| `wag2` Caminata lateral con banda | «Banda sobre las rodillas (nunca en los tobillos), rodillas apenas dobladas —un cuarto de sentadilla— y el tronco erguido. Da pasos cortos de lado manteniendo la tensión; las rodillas no se cierran ni se van hacia adentro.» | 10 pasos c/lado |
| `wag3` Patada atrás en cuatro apoyos | «En cuatro apoyos, con una toalla doblada bajo las rodillas, lleva una pierna doblada hacia atrás y arriba apretando el glúteo, solo hasta que el muslo quede en línea con la espalda. La espalda no se arquea y la cadera no gira.» | 10 c/lado |
| `wac4` Perro de caza (bird dog) | «En cuatro apoyos (toalla bajo las rodillas; puños o antebrazos si la muñeca molesta), estira un brazo al frente hasta la altura del hombro y la pierna contraria hacia atrás hasta alinearla con el tronco, sin mover la cadera. 2 s arriba y vuelve. Cambia de lado.» | 8 c/lado |
| `wac5` Respiración 360° | «Acuéstate boca arriba, rodillas dobladas, manos sobre las costillas. Inhala por la nariz: las costillas se abren a los lados y hacia atrás. Exhala largo por la boca soltando todo el aire. Sin forzar ni aguantar el aire.» | 5 respiraciones |
| `wah1` Jalón facial liviano con banda | «Banda a la altura de la cara. Jala hacia la nariz abriendo los codos a los lados, con los hombros lejos de las orejas. Liviano: si la banda te hace subir los hombros, es demasiado dura.» | 12-15 |
| `wah2` Deslizamiento en pared | «De pie con la espalda cerca de la pared y el mentón recogido, codos y manos pegados a ella en «W». Sube a «Y» y baja sin arquear la espalda baja. Llega solo hasta donde los brazos sigan pegados; si el hombro molesta, no lo hagas.» | 10 |

Para cuando `wf1` entre (no antes): «De pie, dobla las rodillas lo que necesites, apoya las manos, camina con ellas hasta la plancha alta (o con las rodillas en el suelo) y vuelve del mismo modo. Respira sin aguantar el aire; si te mareas, súbete despacio y detente.»
`wg4` (si algún día): «Saltos pequeños, rodillas suaves, aterrizando sobre la punta del pie. Si sientes el golpe en rodillas, espalda o tobillos, para y camina.»

### 5.3 Otros textos que toco (los que ya existen y la receta cambia de rol)
- **`wh3`**: «…hasta sentir el pecho abrirse» → «gira solo hasta donde el pecho se estire suave, sin dolor en el hombro; mantén 2 s».
- **`wc4`** (pasa a activación): «Sube las caderas apretando el glúteo hasta que hombros, cadera y rodillas queden en línea recta, sin arquear la espalda baja. Aguanta 1 s arriba (2 s en GP_A). Baja lento. Exhala al subir.»
- **`we4`**: «Los brazos no se doblan» → «codos estirados pero sin bloquearlos; abdomen firme, cadera en línea».
- **`wa1`** (Valery la usa inclinada): «Manos en una pared o un banco (cuanto más alto, más fácil) o en el suelo si ya es fácil. Cuerpo recto de cabeza a talones; baja el pecho al apoyo y sube. La espalda baja no se hunde.»
- **`wa3`**: agregar «hombros lejos de las orejas».
- **`wac2`**: agregar «Si ves un bulto en el centro del abdomen, detente.» **`wac1`**: «Respira; no aguantes el aire.»
- **`wr3`**: «inclínate ligeramente» → «lleva la cadera atrás con la espalda larga, sin redondearla ni rebotar; si hormiguea o tira, detente» (queda fuera de lumbar igualmente: el texto protege a quien no lo declaró).
- **`wc2`**: ya dice «si la espalda baja se queja, gira menos»; agregar «brazo hasta donde llegue sin dolor (o la mano en la nuca)».
- **`wt2`**: agregar «la rodilla va en línea con el segundo dedo del pie».
- **`wg1`/`wg2`**: sin «lo más posible», sin «agresivo»; el ritmo es «conversar».

## 6. Candados que exijo antes de programar (no es opcional)

1. **Prueba de recetas × zonas**: para CADA receta, CADA zona de §1 por separado Y las combinaciones típicas (rodilla+lumbar, hombro+cuello, aductor+tobillo), recorrer toda la cadena y afirmar que ninguna pieza que ENTRA da `warmupContraindicated === true`. Es el control que habría cazado el caso de `wc3` del 20-sep.
2. **Control de discriminación**: una prueba que confirme que `wg4`, `wag1`, `wag2`, `wa6`, `wa5`, `wah2`, `wac4`, `wag3`, `wc2`, `wh3`, `wa1` caen **por id aunque se les cambie el nombre** (sabotaje: renombrarlas y ver que el filtro sigue cayéndolas).
3. **Control de cobertura**: afirmar que todo id de `WARMUP_ZONE_EXCL_IDS` existe en `WARMUP_LIBRARY` (un id huérfano es una protección que no protege) y que todo id de las cadenas existe.
4. **Prueba del hueco vacío**: con las zonas lumbar+rodilla+tobillo a la vez, el calentamiento NO cae al grupo completo; devuelve menos piezas.
5. **`wg1` y `wg2` no excluibles** por ninguna zona (si alguien las agrega a una lista, la prueba falla).
6. **Aproximación**: prueba de que con hombro/pecho/codo/cuello declarados no hay escalón del 90 %.
7. Mi lección de siempre: **si se toca `GEN_ZONE_EXCL` o el mecanismo de cadenas, esta matriz se vuelve a barrer** (zonas × recetas), no solo las piezas nuevas.

## 7. Resumen de cambios respecto del consolidado

| Tema | Consolidado | Laura |
|---|---|---|
| Piezas nuevas | 14 | **12** (sin `wg4` ni `wf1`); `wah1` entra solo como alterna |
| `we5` | alterna en CORE_CARDIO mujer | **fuera de recetas**, solo manual |
| `wc3` / `wr3` en lumbar | no mencionado | ❌ ambas (cambió el mecanismo) |
| `wc2` en tobillo | no mencionado | ❌ |
| Listas por zona | nombres | **todo por id**; se agregan `wag1`, `wag2`, `wa5`, `wa6`, `wah2`, `wac4`, `wag3` |
| Alternas | «o» sueltos | **cadenas ordenadas** y vacío si ninguna sirve |
| Aproximación | 80 % pierna, 75-90 % tren sup | igual, **sin 90 % con zona declarada**; base 90 % tras pausa/dolor |
| Claves del parser | — | `core_central` (alta), `hueso`, `presion` (media) |

*Veredicto de Laura, 23-oct-2026. Vinculante en seguridad; Andrés aprueba la receta final.*
