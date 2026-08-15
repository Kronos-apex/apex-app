# Verificación adversarial — v484 (`aa70b3c`) y v485 (`88842b5`)

**Rol:** verificador adversarial (suplencia de Fable) · **Fecha:** 2026-08-15 · **HEAD verificado:** `88842b5` · rama `main`
**Nada de esto está desplegado** (producción sirve v483). No toqué código del proyecto; este archivo es lo único creado.
Todo lo que sigue está **reproducido con `node` sobre `avi-core.js` de HEAD**, salvo donde diga explícitamente «leído, no ejecutado».

---

## VEREDICTO: **APROBADO CON RESERVAS — NO hay P0. Se puede desplegar.**

Ni v484 ni v485 dejan a nadie peor en la **comida que se le sirve**. El piso de menores funciona en el motor, el plato
lo respeta y la matriz de sabotaje muerde donde dice que muerde.

Pero **v485 crea una contradicción nueva en pantalla** (P1-1) que es exactamente la clase que este repo ya versionó dos
veces (v428 «anunciar un déficit mientras se sirve otra cosa», v435 «dos pantallas, dos verdades»), y **la garantía
“ningún menor queda bajo su gasto” NO es total** (P1-3): a la salida de `nutBaseFor` hay tres entradas plausibles que
la saltan en silencio. Ambas son de una línea o dos.

**Recomendación:** v484 va tal cual. v485 con P1-1 arreglado antes de subir (una línea), o subirlo y cerrarlo el mismo
día — la habitación es de la asesorada, no del coach.

| # | Sev | Qué se rompe | Estado |
|---|---|---|---|
| **P1-1** | 🔴 | La habitación «Ver mi plan en grande» pinta el titular CON piso y los macros SIN piso → **503 kcal de contradicción en la misma tarjeta** | **REPRODUCIDO** |
| **P1-2** | 🔴 | La garantía no es total: **menor sin `sex`, sin `height` o sin peso ⇒ el plan escrito pasa SIN piso, y el coach tampoco recibe aviso**. Las dos puertas degradan en direcciones opuestas | **REPRODUCIDO** |
| **P1-3** | 🟠 | `shareNutWhatsapp` manda el titular ESCRITO por el coach: **3ª cifra distinta** para la misma menor (2.153 / 1.650 / 1.775) | **REPRODUCIDO** (pre-existe; v485 lo agranda de ~0 a 378 kcal) |
| **P2-1** | 🟡 | La promesa es **semanal, no diaria**: 4 días de 7 la menor lee 2.085 contra un gasto de 2.153 (−3,2%) | **REPRODUCIDO** (es el ciclado, por diseño — el problema es la redacción de la promesa) |
| **P2-2** | 🟡 | El escalado de macros no tiene techo: `activityFactor:99` produce **137.511 kcal y 10.001 g de proteína**; plan de 900 kcal produce **5,5 g/kg de proteína** | **REPRODUCIDO** (no encontré ruta de UI que meta un af fuera de rango) |
| **P3-1** | ⚪ | v484: un récord que NO sea objeto se **borra** en vez de moverse (el `delete` va antes del guard) | **REPRODUCIDO** (hoy inalcanzable: todos los escritores escriben objetos) |
| **P3-2** | ⚪ | El comentario «idempotente por esta rama» es **falso, a favor**: el piso SÍ corrige el redondeo de la rama `estimado` | **REPRODUCIDO** |
| **P3-3** | ⚪ | `nutGoalCheck` hace `return` temprano: con piso, el coach ya no ve el aviso de rótulo contradictorio | **LEÍDO** (`app-5-salud.js:159-168`), no ejecutado en navegador |

---

# P1-1 🔴 La superficie que quedó a MEDIAS: titular con piso, macros sin piso

**`app-5-salud.js:567-569`** (dentro de `openNutritionRoom`, `:552`)

```js
const _base=(typeof nutBaseFor==='function')?nutBaseFor(c,nut,_nutPesoDe(c)):null;
const _kcal=(_base&&_base.kcalObj)?_base.kcalObj:nut.kcal;
d={kcal:_kcal, water:nut.water, prot:+nut.prot||0, carb:+nut.carbs||0, fat:+nut.fat||0, ...};
```

El **titular** sale de `_base.kcalObj` (con piso ✅). Los **tres macros** salen crudos de `nut.*`, el objeto que escribió
el coach, **sin piso**. Antes de v485 esto era invisible *por construcción*: `kcalObj` era literalmente
`nutMacroKcal()` de esos mismos macros, así que titular y barra eran el mismo número. **v485 los separa.**

Y no es una cifra suelta: esos `d.prot/d.carb/d.fat` alimentan (a) la barra de proporción de macros (`:580-581`) y
(b) los tres `macroTile` con sus gramos **y sus kcal por macro** (`:598`). La tarjeta entera queda desmentida por su
propio titular.

**Entrada exacta y reproducción** (forma de Valery, 15 años, con macros redondos):

```
cliente: {sex:'F', age:15, height:161, weight:52, activityFactor:1.55, goal:'Perder grasa'}
plan del coach: {kcal:1775, prot:120, carbs:180, fat:50}

nutBaseFor → kcalObj 2153 · macros {prot_g:157, carb_g:235, fat_g:65}
             minorFloor {tdee:2153, kcalAntes:1650, factor:1.305}
lo que pinta la habitación → titular 2153 · tiles P120 C180 G50 → la barra suma 1650
DIFERENCIA EN LA MISMA TARJETA: 503 kcal
```

Con los macros reales de Valery del backup (132/178/59, tdee 1.910, factor 1,078) la brecha es **139 kcal**: más
pequeña, igual de falsa, y es la persona que motivó el commit.

**Por qué NO es P0:** el plato (`nutDayPlan`), la lista del mercado, la franja del registro y «Hoy» leen `base.macros`,
así que **la comida que se le sirve sí es la corregida** (verificado: el plato del día de descanso resuelve al 105,1%
de su objetivo). El daño es una pantalla que se contradice a sí misma, a un toque de las otras dos que ya están bien —
justo lo que el comentario de `:561-566` presume haber cerrado para siempre.

**Arreglo:** `prot:(_base&&_base.macros?_base.macros.prot_g:+nut.prot||0)` y sus dos hermanos.

**🔴 Por qué la matriz NO lo ve — el sabotaje que le falta.** `_sabotaje-menores.mjs` sabotea y afirma **solo sobre
`avi-core.js`**: sus 10 sabotajes no cruzan a `app-*.js`, y ningún test de la suite lee esta habitación. El sabotaje
que falta es exactamente éste: *«una superficie toma `kcalObj` del `base` y los macros del `nut` crudo»*. Lo probé a
mano (arriba) y **la suite sigue verde con la contradicción viva** — control débil **demostrado**, no supuesto: el
defecto está presente en HEAD sin sabotear nada y 749/749 no se enteran.

---

# P1-2 🔴 La garantía **no es total**: tres entradas la saltan en silencio, y las dos puertas degradan al revés

`avi-core.js:5029-5034`. El piso se abandona (`return base`) si falta `sex`, o si `calcTMB` devuelve `null` — y
`calcTMB` devuelve `null` si falta **peso, talla, edad o sexo** (`:3585`).

Reproducido, mismo plan de coach `{kcal:1775, prot:120, carbs:180, fat:50}` sobre una menor de 15 años cuyo gasto real
es **2.153 kcal**:

| Entrada | `origen` | `kcalObj` servido | ¿piso? | ¿queda bajo su gasto? |
|---|---|---|---|---|
| completa (control) | coach | **2153** | sí (f 1,305) | no ✅ |
| `sex` ausente | coach | **1650** | **no** | **sí, −23,4%** 🔴 |
| `sex:'X'` (basura) | coach | **1650** | **no** | **sí, −23,4%** 🔴 |
| `height:0` | coach | **1650** | **no** | **sí, −23,4%** 🔴 |
| `weight:0` | coach | **1650** | **no** | **sí, −23,4%** 🔴 |
| `activityFactor:-2` | coach | **1650** | no (tdee negativo) | n/a |

**Lo que convierte esto en hallazgo y no en «no se inventa un piso sin datos»:**

1. **Las dos puertas degradan en direcciones OPUESTAS.** Sin sexo, la puerta de la calculadora devuelve `null` y la app
   pide los datos («Completa tu peso, estatura, edad y sexo»): degrada **cerrada**, no sirve nada. La puerta del plan
   escrito **degrada abierta**: sirve el déficit del coach sin decir palabra. La promesa del commit («la garantía es de
   la SALIDA de `nutBaseFor`, no de una de sus ramas») **no se cumple**: depende de qué campos tenga el perfil.
2. **El coach tampoco se entera.** El aviso nuevo de `app-5-salud.js:159` solo enciende `if(_bf&&_bf.minorFloor)`. Sin
   `minorFloor` cae a `nutGoalMismatch`, que exige `est.tdee` — y `nutritionEstimate` devuelve `null` sin sexo
   (`:3799-3800`), así que `nutGoalCheck` hace `apagar()` (`:140`). **Silencio total en las dos puntas.**
3. **`height` es un hueco GRATUITO.** Para menores el motor usa **Schofield, que no usa la talla**
   (`avi-core.js:3588-3592`). Medido: `calcTMB(52, 161, 15, 'F') = 1389` y `calcTMB(52, 0, 15, 'F') = null`, pero el
   1.389 no depende del 161 — el TDEE de 2.153 **era perfectamente calculable sin la talla**. `calcTMB` exige un dato
   que su propia fórmula ignora, y por eso el piso se cae. Arreglo natural: en la rama de menor, no exigir `h`.

**Población real:** el propio informe de origen dice que de los 5 menores solo Valery tiene plan escrito completo y que
«los otros 4 caen a la calculadora **o no tienen datos para estimar**». O sea: hoy el hueco está vacío. Es **latente**,
no vivo — por eso P1 y no P0. Pero el enunciado «ningún menor queda bajo su gasto» hay que degradarlo a *«ningún menor
**con peso, talla, edad y sexo** queda bajo su gasto»*, o taparlo.

---

# P1-3 🟠 `shareNutWhatsapp` manda el número que el coach escribió, no el que la app sirve

**`app-5-salud.js:748-755`** — cero paso por `nutBaseFor`:

```js
if(nut.kcal)msg+=`🔥 *Calorías diarias:* ${nut.kcal} kcal\n`;
if(nut.prot)msg+=`  • Proteína: ${nut.prot}g (${nut.prot*4} kcal)\n`;
```

Para la misma menor quedan **tres** cifras vivas en la misma app:

| Superficie | kcal |
|---|---|
| «Hoy» · el plato · la lista del mercado · la franja del registro · el **titular** de la habitación | **2.153** |
| La **barra y las tarjetas de macros** de la habitación (P1-1) | **1.650** |
| El WhatsApp que ella comparte (y que le llega a quien se lo mande) | **1.775** |

Es la 4ª superficie de la familia v435/v444 y **pre-existe a v485** — pero hasta ahora se desviaba solo por el desfase
titular-vs-macros, que el propio informe midió en **0 de 10 planes**. v485 la vuelve a abrir: **378 kcal**.

---

# P2-1 🟡 La promesa es SEMANAL; lo que ella lee el martes es diario

Reproducido con la misma menor y 3 rutinas (Lunes/Miércoles/Viernes):

```
Domingo descanso 2085 · Lunes entreno 2241 · Martes descanso 2085 · Miércoles entreno 2241
Jueves  descanso 2085 · Viernes entreno 2241 · Sábado descanso 2085
semanaKcal 15063 · promedio 2152 · tdee 2153 · promedio − tdee = −1
```

El piso se cumple **en el promedio** (−1 kcal, redondeo puro: aguanta limpio). Pero `nutWeekTargets` cicla el
carbohidrato y lo que ella ve en «Hoy» **cuatro días de cada siete** es **2.085 contra un gasto de 2.153: −68 kcal,
−3,2%**. Defendible como diseño (el ciclado es intencional, el total semanal cuadra), pero la frase del commit y el
mensaje del test de barrido afirman sobre `nutBaseFor`, no sobre lo que ella lee el martes — y este repo ya se quemó
con esa distinción exacta (v435: «Hoy» daba el día y «Perfil» la semana). **Recomiendo precisar la afirmación, no
tocar el código.**

---

# P2-2 🟡 El escalado no tiene techo — inocuo hoy, dependiente del dato mañana

`avi-core.js:5035-5041`: `factor = tdee / base.kcalObj` se aplica idéntico a los tres macros, **sin cota**. Medido:

| Entrada | factor | proteína antes → después | g/kg (52 kg) |
|---|---|---|---|
| **Valery real** (132/178/59, tdee 1.910) | **1,078** | 132 → 142 | **2,73** — sano |
| Plan escrito de 1.650 kcal (120/180/50) | 1,305 | 120 → 157 | 3,02 — alto, defendible |
| Plan escrito de **900 kcal** (120/60/20) | **2,392** | 120 → **287** | **5,52** — absurdo |
| Macros `1/1/1` (dedazo del coach) | 126,6 | 1 → **127** | 2,44 |
| **`activityFactor: 99`** | **83,3** | 120 → **10.001 g** | kcalObj **137.511** |

**Veredicto de este frente: NO bloquea.** La preservación del reparto acota el daño: la proteína solo se vuelve
absurda si el reparto del coach ya lo era, o si escribió un plan grotescamente bajo — y en ese segundo caso el aviso
nuevo del editor se lo dice en la cara con el número. Sobre `activityFactor:99`: **no encontré ruta de UI que lo
produzca** (viene de un `<select>` fijo, `app-3-coach.js:230`, y de `setNutActivity` con la lista `_NUT_ACTS`); pero
`avi-core.js:3128` lo copia del perfil de la nube **sin acotar**, y el cambio de v485 es que ahora ese valor corrupto
ya no solo distorsiona una estimación que nadie con plan mira — **sobrescribe el plan escrito del coach**. Anotado
como deuda; un `min(prot escalada, 2,5 g/kg)` sería el arreglo, pero eso **decide por el entrenador**, que es justo lo
que el commit dice no querer. Decisión del PO.

---

# P3 — los tres menores

**P3-1 · v484 borra en vez de mover cuando el récord no es un objeto.** `avi-core.js` (`prsRemapRetired`): el
`delete out[viejo]` va **antes** del guard `typeof rec !== 'object'`, así que un `{e38: 30}` se pierde y `moved` lo
cuenta igual. Reproducido: `{e38:30, e15:pr(15)}` → `{e15:pr(15)}`, moved 1. **Hoy inalcanzable**: los tres escritores
de `DB.prs` (`app-4-entreno.js:339`, `app-3-coach.js:1938`, el sync) escriben objetos. Es un default que destruye dato,
no un bug vivo. (Detalle simétrico: `viejos = keys.filter(k => src[k])` **no** borra un `e38: null`, así que el
comentario «el huérfano se va SIEMPRE» tampoco es exacto. Inofensivo.)

**P3-2 · «Idempotente por esta rama» es falso, y a favor.** `avi-core.js:5077-5080`. En la rama `estimado`,
`nutritionEstimate` fija `t.kcalObj = tdee` y **después** deriva macros con `calcMacrosFromKcal`, cuyo redondeo puede
dejar `est.kcalObj` por debajo de `tdee`. `nutMinorFloorBase` **sí** corrige ahí. La segunda llamada no es un cinturón
redundante: es el único sitio donde se cierra ese redondeo. Corregir el comentario, no el código.

**P3-3 · El aviso de rótulo se apaga cuando hay piso.** `app-5-salud.js:159-168`: si `_bf.minorFloor` existe,
`nutGoalCheck` hace `return` antes de `nutGoalMismatch`. Una menor con piso **y** rótulo equivocado deja al coach sin
el segundo aviso. Probablemente deliberado (un aviso a la vez), pero no está escrito ni afirmado por ningún test, así
que es indistinguible de un olvido. **Leído en el fuente, no ejecutado** (requiere DOM).

---

# Lo que ataqué y AGUANTÓ

*(Un frente descartado con medición vale tanto como uno encontrado. Todo lo de aquí está ejecutado.)*

### v485

1. **Batería de entradas basura a `nutBaseFor` — 17 casos, 0 `NaN` filtrados a pantalla.** `sex` ausente/basura,
   `activityFactor` `'mucho'` / `0` / `-2` / `99`, `age:'17.9'` (string), `age:18` (frontera), peso 0, talla 0, peso
   ausente cayendo a la ficha, macros en 0, macros negativos, `kcal` con un macro faltante, macros como string, macros
   `1/1/1`. **Ninguna produce `NaN`, ninguna lanza, y `macros.kcal === kcalObj` se mantiene en todas.** Lo que salva
   la mitad de los casos es la guarda `k>0 && p>0 && c>0 && f>0` de `nutBaseFor:5057`: la basura cae a
   `nutritionEstimate`, que tiene su propio candado. (Los casos que **no** aguantaron están en P1-2 y P2-2.)
2. **`activityFactor` basura NO desincroniza las dos cuentas.** Temía que `parseFloat('mucho')||1.55` divergiera entre
   `calcTDEE` (`:3606`) y `nutritionEstimate` (`:3803`). Medido: **la misma caída a 1,55 en los dos**; el tdee del piso
   y el de la calculadora coinciden al kcal. Frente cerrado.
3. **`age:'17.9'` en string no abre nada.** `isMenor` y `calcTMB` usan **el mismo** `parseInt` → 17 en ambos; el piso
   se aplica (kcalObj 1650 → 2153). `age:18` no se toca. La frontera es una sola definición, como dice el comentario.
4. **El remate del redondeo con carbohidrato.** `Math.ceil((tdee - kcal)/4)` — nunca deja el resultado por debajo
   (`ceil`, no `round`) y el sobrepaso máximo medido es de **3 kcal**. S4 de la matriz lo muerde de verdad.
5. **🔴 El guardián de extremos del plato SIGUE EN PIE con el piso aplicado.** Era mi frente favorito y se cayó con la
   medición: resuelta la semana de la menor floreada (2.153 kcal, P157 C235 G65), el plato del día de descanso sirve
   **2.191 sobre un objetivo de 2.085 = 105,1%**, dentro de la franja del guardián. El piso no empuja el plato fuera
   de tolerancia.
6. **`nutWeekTargets`, `nutShoppingList` y la franja del registro no se descolocan.** `minorFloor` entra por
   `Object.assign` como propiedad **añadida**; nadie itera las claves de `base`; los consumidores leen `kcalObj` y
   `macros`, que quedan coherentes entre sí. Lista del mercado de la menor floreada: **33 ítems, 5 grupos, 7 días**,
   sin excepciones ni ítems en negativo. Semana: `semanaKcal 15063`, sin `NaN`.
7. **`desfase` y `kcalEscrito` sobreviven al piso** (S9 muerde). Confirmado a mano: `desfase:-125` sigue describiendo
   la contradicción del **coach**, no la nuestra. Correcto y bien argumentado.
8. **La matriz corre 10/10 y su control S5 SÍ está en el estado que dice controlar.** Verificado: el sabotaje S5
   (aplicar el piso a todo el mundo) pone la suite roja **por el test de la adulta en déficit**, no por otro. Los dos
   verdes están justificados (S2 cubierto por el combinado S2b, que muerde). **Su único defecto es de alcance, no de
   rigor: no cruza a `app-*.js`** — ver P1-1.

### v484 — `prsRemapRetired`

9. **No puede perder un récord bueno** (con récords bien formados). 11 escenarios ejecutados: solo `e38`; `e38` gana;
   `e38` pierde; empate con mismas reps; empate con más reps en `e38`; `e38` legacy (solo `kg`, sin `val`/`unit`)
   ganando; `e15` legacy ganando; `e38` null; nada retirado. **En todos gana el mejor y el huérfano desaparece.**
10. **Los récords legacy se comparan bien.** `val = rec.val != null ? rec.val : rec.kg` en los dos lados de la
    comparación (`prsRemapRetired` y `isBetterPR:6790`), y `rec.unit || 'kg'`. Probado en ambas direcciones:
    `{e38: {kg:40, reps:8}}` (legacy) vence a `{e15: {val:15,…}}` (moderno) y viceversa. **Aguanta.**
11. **No resucita lo que el coach borró.** Solo mueve entradas que **existen** en la fila. Si el coach borró `e38`
    (`app-3-coach.js:1953` hace `delete`), no hay nada que mover. El único caso «raro» —el coach borra `e15` y `e38`
    sigue vivo— no es una resurrección: es un récord que nunca se borró porque estaba bajo la otra clave, y llevarlo a
    `e15` es literalmente lo que el commit promete.
12. **El doble cableado (coach + asesorado) no duplica ni oscila.** La función es idempotente: en la segunda pasada
    `e38` ya no existe y devuelve la fila **byte a byte igual** (verificado por comparación de JSON en los 11
    escenarios). `_prMoved` solo persiste (`sv('ax_pr', …)`) si hubo movimiento, así que no hay escritura en vacío.
13. **Comparación entre unidades distintas** (`e38` 30 kg vs `e15` 60 seg) resuelve sin lanzar y se queda con el
    numérico mayor. Es una debilidad **pre-existente** de `isBetterPR` (compara números de escalas distintas), pero
    **irrelevante para los 7 pares de `REMOVED_EXERCISES`**, que son todos duplicados del mismo ejercicio de peso.
    Frente descartado por alcance, no por corrección.
14. **Cosmético descartado:** tras la fusión, `p.name` del récord es el nombre del ejercicio **retirado**, y el panel
    del coach pinta `esc(p.name||exId)` (`app-3-coach.js:1899`). Como los 7 pares son duplicados literales, el nombre
    mostrado es el mismo o casi. No lo cuento como hallazgo.

---

## Lo que NO verifiqué (para que no se lea como cobertura que no di)

- **No corrí ningún harness de `scripts/e2e/` que toque Supabase**, por la regla de producción. Solo el puramente
  local `_sabotaje-menores.mjs` (10/10).
- **No abrí la app en navegador.** P1-1, P1-3 y P3-3 están leídos en el fuente y su aritmética reproducida con las
  funciones puras; no vi los píxeles.
- **No tuve acceso al backup `avi-backup-2026-08-12.json`**: las cifras de Valery que cito vienen del informe
  `docs/auditoria-nutricion-2026-08-15.md`; el factor 1,078 y la brecha de 139 kcal los recalculé yo con esos macros,
  pero la fuente del dato crudo no la verifiqué de forma independiente.
- **No corrí la suite completa** (749/749 la reporta el commit); sí la corrió la matriz de sabotaje, que la invoca.
