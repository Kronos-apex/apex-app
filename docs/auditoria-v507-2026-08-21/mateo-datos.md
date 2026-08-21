# 📊 Mateo — Re-medición independiente de la cola del defecto de avi-v506

**Encargo:** reproducir por mi cuenta la medición publicada el 20-ago e intentar tumbarla.
**Método:** script propio (`mateo-medir.mjs` + `mateo-epoca.mjs`, en el scratchpad, **fuera del repo**).
No usé `scripts/medir-descuadre-tapaba.mjs`. Sin navegador, sin Supabase, sin tocar el árbol
(`git status` limpio antes y después; `avi-core.js` sha1 `b3935c0…`, `app-3-coach.js` sha1 `132aecb…`,
sin cambios durante la corrida).

**Definición del defecto, sacada del diff de `5d2193b`** (no de la prosa): la rama vieja pinta la
tarjeta de descuadre y corta con `return` **antes** de llamar a `nutPlanReview`. Entonces
`tapado` = `desfase ≠ null` **Y** `nutPlanReview(...).status !== 'ok'`, con `desfase` gateado por
`!_banda`, `parseFloat(nut.kcal)>0` y `|nutMacroKcal(macros) − round(kcal)| ≥ NUT_KCAL_MISMATCH`.
(Única salida temprana extra en la rama del revisor: `sin_datos` con `falta` vacío — no la toca
ningún tapado de la ventana, así que mi conteo es exacto, no una cota.)

---

## (a) MIS CIFRAS AL LADO DE LAS TUYAS

| Afirmación publicada | Mi medición | Veredicto |
|---|---|---|
| Ventana 04-ago → 19-ago | `git log -S` reproduce: la tarjeta y la llamada al revisor **nacen en el mismo commit**, `9637f7a` (v435, **4-ago 13:33 COT**), y el `return` se quita en `5d2193b` (**19-ago 21:18 COT**) | ✅ correcta |
| «1 plan de 10» en la ventana | **1 de 10**, en los 7 backups de la ventana, siempre el mismo: **Andrés** | ✅ reproducido |
| «es el del propio coach (Andrés)» | Sí: fila `role:'coach'`, entra al panel por `_hydrateSelfClient` | ✅ |
| «ajusta el titular, 25 kcal» | titular 1800, macros 1775 → **−25**, justo en el umbral `NUT_KCAL_MISMATCH=25` | ✅ |
| «callaba −1.418 kcal, 57 veces más grande» | −1.418 **es la cifra de HOY**. Con el código de cada época: **−1.362** (05-ago) y **−1.393** (08→16-ago). Ratio real de la ventana ≈ **54-56×**, no 57 | 🟢 matiz |
| «el 03-ago: 6 planes descuadrados y los 6 tapaban algo» | **6 de 9 planes** (el 03-ago hay 9, no 10: Valery aún no tenía). Los **6 nombres reproducen exactos** con el código de HOY **y** con el código de ese día (v436) | ✅ nombres |
| Luz +625 · Nataly +677 · Kathe +456 · Natalia +303 · Samuel −1.007 · Andrés −1.418 | Con el código del **4-ago (v436)**, que es lo que el coach habría leído: **Luz +670 · Nataly +1.002 · Kathe +470 · Natalia +348 · Samuel −979 · Andrés −1.362** | 🔴 **6 de 6 cifras no son las de la época** (Nataly, +48%) |
| «al día siguiente quedaba 1» | **No hay backup del 04-ago.** La siguiente observación es el **05-ago 20:00**. Y por `updatedAt`, el 6→4 ocurrió a las **14:00 COT del 4-ago, 27 minutos después** de desplegar v435 | 🟡 la frase exagera la exposición |
| «porque el coach reescribió esos 6 planes el 4 y 5 de agosto» | **5 de 6.** El sexto (Andrés) sí se re-guardó el 4-ago 20:01 COT, pero **con los mismos números** (1800/160/160/55) → su descuadre sobrevivió. Por eso es el que queda | 🟡 |

### La línea de tiempo medida (COT = UTC−5; `nutrition.updatedAt` es `toISOString()`, o sea UTC)

| Momento | Qué pasó | Tapados |
|---|---|---|
| 3-ago 09:19 | Andrés fija su plan 1800/160/160/55 (desfase −25, **exacto** en el umbral) | — |
| **3-ago 10:10** | backup 08-03 (última foto antes de la tarjeta) | **6 de 9** |
| **4-ago 13:33** | **v435: nace la tarjeta** (estado inferido = el del 03-ago) | 6 |
| 4-ago 14:00 / 14:01 | el coach reescribe **Luz** y **Kathe** | 4 |
| 4-ago 20:01 | re-guarda Andrés **sin cambiar un número** | 4 |
| 5-ago 15:15–15:20 | reescribe **Nataly, Samuel, Natalia** (+Claudia, +Valery estrena plan) | **1** |
| **5-ago 20:00** | backup 08-05 | **1** ✅ medido |
| 10-ago 08:54 | única escritura de plan dentro de un hueco sin backup (Astrid); sin desfase en ninguno de sus dos extremos | 1 |
| **19-ago 20:00** | backup 08-19, **78 min antes del arreglo** | **1** ✅ medido |
| 19-ago 21:18 | v506: se quita el `return` | — |
| 20-ago 07:01 | el PO reescribe el plan de Andrés → desfase 0 | 0 |

**El estado de «6» vivió ~27 minutos de los 15 días de la tarjeta; «4» ~25 horas; «1» los 14 días restantes.**

### Universo resuelto (gotcha «declara cuántas filas»)

- Backup 19-ago: **24 filas, resolví 24 de 24, 0 errores, 0 descartes silenciosos.**
- Panel de Camilo = **21 asesorados + su propia fila = 22 personas**. Fuera del panel: `🧪 QA COACH`
  (coach propio) y `🧪 QA HARNESS` (`coach_id` del QA coach) — **ninguno tiene nutrición**, así que
  no mueven nada.
- De esas 22: **10 tienen plan con `kcal>0`** ← ese es el «de 10». Las otras **12 no tienen objeto
  `nutrition` en absoluto** (les sale la tarjeta azul «no tiene plan / faltan datos», que el defecto
  **no podía** callar porque sin `kcal` no hay descuadre).
- **`tier:'libre'` no mueve el número:** ninguno de los 10 con plan es libre, y la tarjeta vive en el
  panel del coach, que no tiene puerta de tier.
- **Rotación en la ventana:** entra `maria rubio` (09-ago), salen `Stevan Guerrero`, `diana ramirez` y
  `Hernan Camacho` (15-ago) — **los cuatro sin plan** → el denominador es **10 en los 7 backups**.
- **Menores:** el guard `_banda` excluye a Sharith (16), Valery Valbuena (16) y Valery (15). Solo
  Valery tiene plan → es la única fila que el guard puede quitar del numerador.

---

## (b) DEFECTOS DE MÉTODO

### 🔴 1. «Se MOSTRÓ» no es lo que mediste — mediste ESTADO
`renderNutReviewCard` solo corre cuando el coach **abre esa ficha** (`openClient` → `p-detail`).
No hay telemetría de aperturas. Lo medido es «1 de 10 planes ESTABA en el estado en que la ficha
miente», no «se mostró». Y aquí pesa el doble: **la única fila afectada es la del propio coach**, a
la que se llega por otra puerta (`openMyTraining` / su perfil), no por la lista de asesorados. Es
perfectamente posible que el aviso equivocado **no se le haya mostrado nunca a nadie** — y también
que se le mostrara cincuenta veces. La medición no lo puede decir.

### 🔴 2. Las 6 cifras de la frase del 03-ago son del revisor de HOY, no del de entonces
Los **nombres** aguantan (medido con el código de v436: los mismos 6). Los **gaps** no: cada uno de
los seis cambia, y el de Nataly cambia **+325 kcal (+48%)**. La frase publicada los presenta como lo
que la ficha decía ese día; nunca dijo eso. Es el gotcha del repo aplicado a una medición forense:
**el número que se atribuye a un momento del pasado se calcula con el código de ese momento, o se
declara como recálculo.**

### 🟡 3. «Al día siguiente» no existe: hay un hueco de 34 horas sin backup en el momento crítico
Backup 03-ago **10:10** → backup 05-ago **20:00**, y la tarjeta nace en medio (4-ago 13:33). El
«6 → 1» cruza el único hueco que importa. La reconstrucción por `updatedAt` (que sí hice) dice que
la caída empezó **27 minutos** después del despliegue, no «al día siguiente». La frase **exagera la
cola del defecto**, no la subestima — pero es igual de falsa.
⚠️ Límite honesto de mi propia reconstrucción: `updatedAt` guarda **la última** escritura, así que
una escritura intermedia dentro del hueco es invisible. «6 tapados el 4-ago a las 13:33» sigue siendo
**inferencia**, no medición.

### 🟡 4. «El coach reescribió esos 6 planes» — fueron 5, y el sexto es justo el que queda
Andrés se re-guardó el 4-ago 20:01 con los **mismos** 1800/160/160/55. Decir «los 6» tapa el
mecanismo: el descuadre no sobrevivió por descuido, sobrevivió porque **re-guardar no es
recalcular**. Es la mitad interesante de la historia.

### 🟢 5. El anacronismo que declaraste: medido, y NO puede llegar al numerador
Corrí los 7 backups con el `avi-core.js` **y la rama del render de cada fecha** (v448, v466, v470,
v479, v489, v491, v503). Resultado:
- El anacronismo **sí es grande en el revisor**: cambia el status de **8 de 10 filas** el 05-ago
  (`rotulo_miente` es de v486 y `proteina_fuera` de v496; con el código de la época esas 8 salían `ok`).
- Y **no mueve ni un tapado**: `1` en los 7 días con el código de la época, `1` con el de hoy.
- **La razón estructural, que conviene escribir:** `tapado` está gateado por el **DESFASE**, y el
  desfase lo calculan `nutMacroKcal` + `NUT_KCAL_MISMATCH`, **nacidos en v435 y jamás tocados desde**
  (`git log -S` sobre los dos: un solo commit, `9637f7a`). El revisor solo decide si *había algo que
  tapar*; el desfase decide si *se tapó*. Por eso la conclusión sobrevive al anacronismo — y por eso
  la cabecera debería decir eso, en vez de una lista de estados.

### 🟢 6. El hueco de Julián (guard `banda`), verificado por mi cuenta y no heredado
Con el guard **desactivado** en los 7 backups: `["Andres Martínez"]` los 7 días. **Coincide con lo
que él reportó.** La razón: el plan de Valery (15 a) es 1774 kcal contra 1775 de sus macros → **1 kcal
de desfase**, contra un umbral de 25. Pero el matiz importa: **eso es un margen de UNA persona, no una
garantía estructural.** Si mañana un menor tiene un plan descuadrado, el script lo descarta en
silencio y el titular se cae.

### 🟡 7. Cobertura: 7 de 16 días — pero se puede levantar, y no lo declaraste
La ventana tiene 16 días y hay backup en 7 (faltan 04, 06, 07, 10, 11, 13, 14, 17, 18). Ahora bien:
crucé **todos los `nutrition.updatedAt` del periodo** y solo **UNA** escritura de plan cae dentro de
un hueco ciego: **Astrid, 10-ago 08:54 COT**. Sus dos extremos observados (2000/175/185/60 y
2206/131/272/66) **no tienen desfase**, así que no pudo producir un tapado. Para la condición que
manda (el desfase, que depende **solo** de `nutrition`), la cobertura es **efectivamente continua**
con un único agujero no falsificable. Eso es *más fuerte* que lo publicado y merece estar escrito.

### 🟢 8. El «1 de 10» está a 15 kcal de ser «2 de 10»
Barrido del umbral sobre el backup 19-ago (que además es el **control de discriminación** de mi propia
sonda: tope 0 → 7 tapados · 5 → 2 · **25 → 1** · 50 → 0; la sonda discrimina, no es una constante):
con umbral 10 entra **Miguel Pulido** (plan 3050 contra 3040 de macros = **−10**), y lo que se le
habría callado es un `proteina_fuera` de +59 vivo desde mayo. El titular es correcto **y frágil**: no
es un 1 con holgura, es un 1 con 15 kcal de margen.

### 🟢 9. Lo que sí aguanta sin una sola reserva: «es por DATOS, no por CÓDIGO»
Es la afirmación que pediste que atacara más y es la mejor sostenida de todas. Matriz 2×2:

| | datos 03-ago | datos 05-ago |
|---|---|---|
| **código v436** (4-ago) | 6 | 1 |
| **código HOY** (v507) | 6 | 1 |

El eje del código no mueve nada; el de los datos lo mueve todo. Y el mecanismo está fechado con
evidencia independiente (los `updatedAt`: Luz 4-ago 14:00, Kathe 14:01, Nataly 5-ago 15:15, Samuel
15:19, Natalia 15:19). **No la pude tumbar.**

---

## (c) FRASES DE LA BITÁCORA QUE HAY QUE CORREGIR

1. **«el aviso equivocado se MOSTRÓ en 1 plan de 10»** → *«1 de 10 planes ESTABA en el estado en que
   la ficha miente (no hay telemetría de aperturas; y la única fila afectada es la del propio coach,
   a la que se llega por otra puerta)»*.
2. **«6 planes descuadrados … (Luz +625 · Nataly +677 · Kathe +456 · Natalia +303 · Samuel −1.007 ·
   Andrés −1.418)»** → o se sustituyen por las cifras de la época **(+670 · +1.002 · +470 · +348 ·
   −979 · −1.362)**, o se marca explícitamente *«recalculado con el revisor de hoy; con el código de
   entonces los seis gaps son otros»*. Tal como está, atribuye al pasado números que la app no dijo.
3. **«y al día siguiente quedaba 1»** → *«no hay backup del 04-ago; la siguiente observación es el
   05-ago. Por los `updatedAt`, el estado de 6 duró ~27 minutos desde el despliegue: a las 14:00 del
   4-ago ya eran 4, y 1 desde las 15:20 del 5-ago»*.
4. **«el coach reescribió esos 6 planes»** → *«5 de los 6. El sexto (Andrés) se re-guardó el 4-ago
   con los mismos números: re-guardar no es recalcular, y por eso es el que queda»*.
5. **«callaba −1.418 kcal, 57 veces más grande»** → cierto para el estado final; durante la ventana
   el gap fue −1.362 → −1.393 (**54-56×**). Poner el rango, o aclarar que es la cifra de hoy.
6. **Añadir la cobertura y el porqué de la robustez** (hoy no están): *«7 backups de 16 días; la
   única escritura de plan en un hueco ciego (Astrid, 10-ago) no tiene desfase en ninguno de sus
   extremos. La conclusión sobrevive al anacronismo porque el numerador lo gatea el DESFASE, y
   `nutMacroKcal`/`NUT_KCAL_MISMATCH` no se han tocado desde que nacieron en v435»*.
7. **Añadir el margen:** *«con umbral 10 en vez de 25 serían 2 de 10 (entra Miguel Pulido, −10 kcal).
   El 1 tiene 15 kcal de holgura»*.

**En una línea: la dirección aguanta entera (1 de 10, el del coach, y la caída 6→1 es por datos); lo
que hay que arreglar es el lenguaje —«se mostró» por «estaba»— y las siete cifras que están fechadas mal.**

---

## RADAR — cosas raras en los datos de gente real (aparte del encargo)

1. 🔴 **Valery (15 años) lleva desde el 05-ago con `menor_bajo_gasto`, gap −235, y sigue así en el
   backup de ayer (20-ago).** Plan de 1774 kcal escrito el 5-ago y **nunca tocado**: 16 días seguidos
   de una menor por debajo de su gasto, que es exactamente lo que el dictamen de Andrés prohíbe. El
   candado de v485/v493 corrige lo que se SIRVE, pero el plan escrito sigue ahí y la ficha lleva 16
   días avisando sin que nadie actúe. **Es el punto más accionable de todo el informe.**
2. 🟡 **Miguel Pulido: plan sin tocar desde el 27-may (3 meses).** 3.050 kcal, `proteina_fuera` +59
   estable en las 9 fotos, sin `goal`. Es el único de los 10 que **no** pasó por la reescritura del
   4-5 de agosto. Y está a −10 kcal de disparar también el descuadre.
3. 🟡 **De los 10 planes, el 19-ago solo 2 están `ok`** (Astrid y Nataly). Los otros 8: 3
   `rotulo_miente` (Luz, Kathe, Samuel), 3 `proteina_fuera` (Natalia, Miguel, Claudia), 1
   `menor_bajo_gasto` (Valery) y 1 `desviado` (Andrés). La ficha del coach está avisando en 8 de 10
   fichas — con ese ruido de fondo **se aprende a ignorarla**, que es la muerte del gate que este
   repo ya documentó dos veces.
4. 🟢 **12 de 22 personas del panel no tienen plan de nutrición en absoluto.** El «10» del titular es
   menos de la mitad de la base.
5. 🟢 **Residuo de plantilla, fotografiado en los datos:** el 03-ago, **cuatro** personas distintas
   tenían el plan **literalmente idéntico** 2400/150/270/75, y Nataly compartía el 3200/180/380/80
   con Andrés. Es el defecto de v471 («una plantilla no puede traer su propio titular») visible en
   producción; la reescritura del 4-5 de agosto es lo que lo deshizo.
