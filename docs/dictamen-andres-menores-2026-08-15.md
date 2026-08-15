# 💪 Dictamen de Andrés Hyp — el piso de los menores, el piso de proteína y los planes de adultos

**2026-08-15 · repo en v485 (`88842b5`) · vinculante en lo que toca macros, planes y periodización.**

> ## ① VEREDICTO SOBRE EL ARREGLO DE MENORES: 🟡 **APRUEBO CON CAMBIOS**
> El mecanismo es el correcto y elegiste bien el reparto. Le faltan **dos candados** (un techo de
> proteína y un margen sobre el gasto) y **un flanco nuevo que apareció al medir**: hay dos menores
> comiendo *por encima* de lo que deberían.

---

## Sobre qué medí

- **Fuente:** backup local `avi-backup-2026-08-12.json`. Nada de la nube, nada de harness.
- **Población:** 25 filas de asesorado; **21 las resuelve `nutBaseFor`** (la ruta de producción) —
  4 no, por datos faltantes. De esas 21, **2 son `tier:'libre'` y nunca ven el plan de comida**
  (maria rubio y FELIPE R.L), así que en el frente ② separo lo que le llega a alguien de lo que no.
- **Menores:** 5. Uno (Santiago, 17) no declara sexo → no hay gasto que calcular.
- **Método:** los gastos y los platos se recalcularon con las funciones puras de `avi-core.js`
  (Schofield 10-18 para menores). Los barridos del piso de proteína se hicieron sobre **copias
  parcheadas** del archivo, con verificación de que el parche se aplicó (si no aparece exactamente
  una vez, el script aborta). **147 días · 735 comidas.** Repetí la corrida: mismo número.
- ⚠️ **Una cifra mía que estuvo mal y la corregí:** mi primer barrido pasaba el **arreglo de rutinas**
  a `nutDayKind`, que espera **una rutina** — así que medí a todo el mundo como si cada día fuera de
  descanso. Los números buenos son los de abajo (48 comidas, no 35 ni 40).

---

# ① El piso de los menores

## 1.1 · Escalar los tres macros en la misma proporción — ✅ **DE ACUERDO, no lo cambies**

Es la decisión correcta y por la razón correcta. Volcar el faltante en carbohidrato tenía un
argumento fisiológico razonable (el carbohidrato es el combustible del estímulo y la caloría más
barata de un adolescente que crece), **pero en este caso concreto haría daño**: el plan escrito de
Valery ya venía con la proteína corta, y meterle 135 kcal de puro carbohidrato la **diluye** todavía
más en g/kg. Medido:

| Valery (15 a, F, 52 kg, 161 cm, af 1,375 · gasto **1.910**) | kcal | Proteína | g/kg | Carb | Grasa |
|---|---|---|---|---|---|
| Plan escrito del coach | 1.775 (**−7,1%**) | 94 g | **1,81** | 244 | 47 |
| **Con tu escalado (v485)** | **1.915** (+0,3%) | **101 g** | **1,94** | 263 | 51 |
| Si hubieras volcado todo en carbohidrato | 1.911 | 94 g | **1,81** | 278 | 47 |

Escalar sube la proteína 7 g **sin tocar el reparto que eligió el entrenador**. Volcar en
carbohidrato la habría dejado en 1,81 g/kg. Tu opción es estrictamente mejor. **Aprobada.**

## 1.2 · La proteína sube a 101 g (1,94 g/kg) — ✅ **está bien, pero el techo hay que ponerlo igual**

**Hoy no sobra: falta.** 1,94 g/kg está **por debajo** de mi estándar (2,0-2,2 g/kg para alguien que
entrena con objetivo de músculo). Y hay una incoherencia que conviene que sepas: **sus 4 compañeros
menores, que caen a la calculadora, reciben exactamente 2,20 g/kg** (Sharith, Valery Valbuena y
Hernán, medidos). Valery recibe 1,94 **solo porque su plan lo escribió una persona**. No es peligroso
—va en la dirección segura— pero es un plan peor que el de sus compañeras.

**Ahora, el techo sí hace falta**, y no por Valery: por el caso que hoy no existe. El escalado
multiplica la proteína por `gasto ÷ kcal del plan`, y ese factor **no tiene tope**. Si mañana un
coach escribe un plan de 1.000 kcal con 150 g de proteína para un menor, el factor sale 1,91 y la
app le sirve **287 g de proteína = 5,5 g/kg**. Eso es una barbaridad y hoy nada lo impide.

> 🔒 **REGLA 1 — techo de escalado de proteína.** La proteína se escala **hasta 2,2 g/kg de peso de
> referencia** (`nutRefWeight`) y **el excedente se va a carbohidrato**.
> **Cuesta cero hoy:** el techo de Valery son 114 g y el escalado la deja en 101. Medido: no mueve
> ni un gramo de ningún menor de la base. Es un candado que cierra la puerta sin tocar a nadie.

## 1.3 · ¿El piso es el gasto, o un menor merece margen por encima? — 🟡 **el gasto × 1,05**

Aquí te voy a contradecir en el número, pero **no por el motivo que esperas.**

**El argumento «está creciendo, dale un extra» no se sostiene en la cifra.** El costo energético del
crecimiento a los 15 años es de **~1-2% del requerimiento total** (FAO/WHO/UNU, *Human Energy
Requirements*, 2004: la deposición energética en adolescentes ronda los 20-25 kcal/día). No es un
10%. Si pusiéramos un margen «para crecer» del 5-10% estaríamos inventando fisiología, que es
exactamente lo que no hacemos con la yuca.

**El motivo real para el margen es otro, y ese sí está medido: el plato no entrega lo que el titular
promete.** Sobre estas mismas 21 personas, la entrega calórica del día va de **−5,3% a +11,4%**
respecto del objetivo. O sea que con el piso puesto **exactamente** en su gasto, en su peor día el
plato de Valery le sirve `1.915 × 0,947 = 1.813 kcal` contra un gasto de 1.910: **−5,1%**. El mismo
defecto que acabas de arreglar, una capa más abajo.

> 🔒 **REGLA 2 — el piso es `gasto × 1,05`, no el gasto.** No es un margen de crecimiento: es el
> margen que absorbe **el error medido de nuestro propio plato**, para que la promesa «ningún menor
> por debajo de su gasto» sea cierta **en la mesa** y no solo en el titular. Es la lección de v482:
> un candado que afirma el signo y no la dosis deja pasar el defecto que lo motivó.
> **Impacto:** Valery pasaría de 1.915 a ~2.006 kcal. Los otros 4 menores no se mueven (ya están
> en o por encima de su gasto).

## 1.4 · ¿Aplica a los 5, o hay casos donde manda el plan del coach? — ✅ **a los 5, sin excepción**

**No hay ningún caso en el que un plan escrito a mano deba dejar a un menor bajo su gasto, y menos
en silencio.** Si un menor tuviera indicación clínica de restricción calórica —obesidad severa con
seguimiento, una condición metabólica— eso lo firma un pediatra o un nutricionista clínico, **no un
coach en un desplegable de una app de entrenamiento**, y hoy no hay ni un caso así en la base
(revisé los 5). Cuando la app se equivoque, que se equivoque hacia arriba.

Lo que **no** es una excepción y ya está bien resuelto: **Santiago (17) no declara sexo, así que no
hay gasto que calcular** y el código no inventa un piso. Correcto. Eso no es «gana el coach», es «no
sabemos», y son cosas distintas.

Si alguna vez el PO quiere una vía de escape, la condición es: **explícita, por persona, con el
nombre de quien la autoriza guardado al lado, y visible para el acudiente**. Nunca un rodeo callado.

## 1.5 · 🔴 **FLANCO NUEVO que salió al medir: dos menores con superávit por encima de la banda**

El candado mira hacia abajo. **Hacia arriba no mira nadie**, y ahí sí hay gente hoy:

| Menor | Datos | Gasto | Plan que recibe | Desvío |
|---|---|---|---|---|
| **Sharith sofia** | 16 a · F · 72 kg · 165 cm (IMC **26,4**) | 2.567 | 2.917 | **+350 kcal (+13,6%)** |
| **Hernán Camacho** | 17 a · M · 64 kg · 177 cm (IMC 20,4) | 2.775 | 3.125 | **+350 kcal (+12,6%)** |

- **Hernán está bien y lo dejaría igual.** IMC 20,4, hombre, 17 años, objetivo de músculo: +350 es
  un poco alto para mi banda de volumen limpio (+200 a +300) pero es defendible en un adolescente
  delgado en pleno crecimiento. **No lo toques.**
- **Sharith NO.** Mujer, 16 años, **IMC 26,4** — en las curvas de percentil de la OMS para 16 años
  eso cae en **sobrepeso**, y mi propio árbol de decisión dice: por encima del 25% de grasa en
  mujer **no hay superávit**, hay recomposición. La app le está mandando **+350 kcal/día** a una
  adolescente con sobrepeso, y eso viene de la calculadora, no de nadie escribiéndolo.

> 🔒 **REGLA 3 — un menor tampoco lleva superávit por encima de +10% de su gasto**, y **cero
> superávit si su IMC lo pone en sobrepeso para su edad y sexo**. Su dirección es mantenimiento y
> el trabajo lo hace el entrenamiento. Y el texto se lo dice sin una sola palabra de composición
> corporal (regla de v448/v449, que ahí sí funciona).
> **Afectada hoy: 1 persona (Sharith, 2.917 → 2.567).**

---

# ② El piso de proteína que no cede

## 2.1 · Cuánta gente, y en qué comidas — medido hoy, no heredado

Definición: comidas que **sirven más del 130% de la proteína de su propia comida**.

**48 de 735 comidas (6,5%), repartidas en 15 de las 21 personas.**

| Comida del día | Casos |
|---|---|
| **Cena** | **21** |
| **Desayuno** | **18** |
| Media tarde | 5 |
| Media mañana | 3 |
| Almuerzo | 1 |

**Exposición real:** de esas 48, **18 son de las dos personas en `tier:'libre'`** (maria rubio 11,
FELIPE R.L 7), **que nunca ven el plan de comida**. Le llega de verdad a **30 comidas en 13
personas**. Sigue siendo un defecto, pero es la mitad de grande de lo que dice el titular.

**En el día completo la proteína se pasa una mediana de +8,5%, y el peor día +41,7%.**

## 2.2 · 🔴 El diagnóstico que teníamos escrito está DESACTUALIZADO

En la memoria del proyecto está escrito que *«9 tajadas de pan dan 33 g y el piso le pone 4 huevos
encima»* y que **el culpable es la avena**. **Medido hoy, ya no es así** — entre medio pasaron el
segundo carbohidrato (v472), el escalón chico de medida casera (v476) y el arreglo de los
acompañantes:

| Pareja (proteico + carbohidrato) | Casos |
|---|---|
| **atún + pasta** | **17** |
| **yogur griego + pan integral** (con banano/almendra) | **11** |
| **atún + pan integral** | **6** |
| clara / yogur + **avena** | 7 |
| tilapia + papa · res + papa · pollo + plátano | 7 |

El culpable dominante ya no es la avena: es **la pasta y el pan integral emparejados con un atún de
26 g de proteína por 100 g**. Caso real: *«1 lata de atún (100 g) + 2½ tazas de pasta (350 g)»* para
una meta de **36 g** → sirve **50 g**. La pasta sola aporta 21 de esos gramos.

## 2.3 · ✅ Lo que YA no hay que volver a intentar (lo re-medí contra el código de v485, no lo heredé)

**Acreditar la proteína del carbohidrato dentro del piso** — el arreglo «obvio», el que la auditoría
de v471 dejó escrito diciendo que «no toca la doctrina de Andrés». **Sí la toca. Medido hoy:**

| | comidas >130% | el proteico aporta <50% de su comida | raciones < 25 g | peor ración |
|---|---|---|---|---|
| Hoy (0,70, sin acreditar) | 48 | 35 | **0** | — |
| **Acreditando** | **11** ✅ | **121** 🔴 | **8** 🔴 | **«5 g de atún»** 🔴 |

Arregla el titular y rompe el plato. **«5 g de atún» no es una ración, es un redondeo** — la misma
cosa que ya se rechazó en v471 con «5 g de clara». Y el número que importa: las comidas donde el
alimento proteico aporta **menos de la mitad** de la proteína de su propia comida pasan de 35 a 121.
Eso es «20 g de atún con 490 g de pasta», que es literalmente el caso que hizo nacer la constante.

**RECHAZADO otra vez, ahora con la medición de v485 al lado.** Que quede escrito para que no se
vuelva a proponer en seis meses.

## 2.4 · 🔒 **LA REGLA: bajar `NUT_PROT_MIN_SHARE` de 0,70 a 0,60**

Barrido completo sobre las 735 comidas:

| Piso | comidas >130% | comidas <85% | combos distintos | proteína del día (mediana / peor) | kcal del día (peor / mínimo) |
|---|---|---|---|---|---|
| **0,70 (hoy)** | **48** | 2 | 40 | +8,5% / +41,7% | +11,4% / −5,3% |
| 0,65 | 32 | 2 | 41 | +7,1% / +41,7% | +11,4% / −5,3% |
| **0,60 ← elegido** | **28** | **2** | **41** | **+6,3% / +30,6%** | **+11,4% / −4,7%** |
| 0,55 | 22 | 2 | 40 | +5,0% / +30,6% | +11,4% / −5,2% |
| 0,50 | 19 | 2 | 40 | +5,0% / +29,2% | +11,4% / −5,2% |

**Por qué 0,60 y no más abajo:** entre 0,70 y 0,60 se ganan 20 comidas; entre 0,60 y 0,50 se ganan 9
y el pico del día ya no baja. Es el codo de la curva.

**Lo que NO se paga (esto es lo que autoriza el cambio):**
- **Ni una ración por debajo de 25 g** a 0,60. El plato sigue siendo creíble en la mesa.
- **Las comidas que se quedan cortas (<85%) siguen siendo 2.** No se recorta la entrega.
- **La variedad no baja: 40 → 41 combinaciones distintas.** ⚠️ Ojo aquí: la nota anterior decía que
  a 0,60 *«la suite cae 680/681 por variedad»*. Eso era **la suite**, no la gente. **En las 21
  personas reales la variedad SUBE.** Quien lo implemente: corre la suite, y si un test cae, mira
  primero si el que está mal es **el fixture o la aserción** antes de tocar el motor.

## 2.5 · El residuo (28 comidas) es del MENÚ, no del solver

A 0,60 lo que queda es: `atún + pan integral` (6), `clara + avena` (5), `atún + pasta` (4), `yogur +
pan integral` (6). Todos el mismo patrón: **un proteico denso emparejado con un carbohidrato que
también trae proteína** (avena 17 g/100 · pan integral 13 · pasta 6, pero servida en 350 g).

> 🔒 **REGLA DE DISEÑO DE MENÚ (para cuando se toque el banco):** en un mismo menú, **la proteína
> que aporta el carbohidrato a su ración servida no debe pasar del 30% de la meta de proteína de esa
> comida**. Con eso, atún no va con pasta ni con pan integral; va con papa (2 g/100), arroz (2,7) o
> plátano.
> Y un remate barato: **`pasta` no tiene `maxG`** (pan integral sí, 112 g). 350 g de pasta en una
> cena aportan 21 g de proteína sin que nadie los cuente como proteína. **No he medido qué mueve
> ponerle tope** — hay que medirlo antes, porque topar un carbohidrato ya se probó una vez y
> RECORTABA en vez de repartir (2026-08-10).

---

# ③ Los planes de adultos que contradicen su rótulo

Los 8 adultos con plan escrito a mano, con el gasto recalculado por fuera de la app:

| Persona | Datos | Gasto | Plan | Desvío | Proteína | Rótulo | Veredicto |
|---|---|---|---|---|---|---|---|
| **Luz Rodríguez** | 39 F · 82 kg · 156 cm · IMC 33,7 | 2.230 | 1.731 | **−499 kcal (−22,4%)** | 111 g (1,80 g/kg ref) | «balance» | 🟡 número OK, **proteína corta**, rótulo mal |
| **Kathe Beltrán** | 28 F · 83 kg · 163 cm · IMC 31,2 | 2.399 | 1.931 | **−468 kcal (−19,5%)** | 119 g (1,73 g/kg ref) | «balance» | 🟡 número OK, **proteína corta**, rótulo mal |
| **Samuel Cifuentes** | 28 M · 86 kg · 176 cm · IMC 27,8 | 3.148 | 3.535 | **+387 kcal (+12,3%)** | 194 g (2,26 g/kg) | «balance» | 🔴 **bajar el número** |
| **Miguel Pulido** | 29 M · 70 kg · 183 cm · IMC 20,9 | 2.641 | 3.040 | **+399 kcal (+15,1%)** | 180 g (2,57 g/kg) | **(vacío)** | 🟡 ajustar reparto y rótulo |
| Natalia Martínez | 34 F · 63 kg | 2.052 | 2.053 | 0,0% | 113 g (1,79) | «balance» | ✅ número y rótulo bien · proteína corta |
| Astrid Beltrán | 33 F · 73 kg | 2.206 | 2.206 | 0,0% | 131 g (1,79) | «balance» | ✅ correcto |
| Claudia Valbuena | 34 F · 74 kg · IMC 30,4 | 2.145 | 2.146 | 0,0% | 107 g (1,80 g/kg ref) | «balance» | ✅ número bien · proteína corta |
| Nataly | 40 F · 59,5 kg | 1.933 | 2.197 | +13,7% | 119 g (2,00) | «volumen» | ✅ rótulo y número coherentes |

## Caso por caso

### 🟡 Luz, 39 años, −22,4% — **el déficit SÍ es defendible; el problema no es el que crees**
Tu pregunta era si −22% en una mujer de 39 es defendible. **En porcentaje asusta; en kilocalorías
está justo en mi banda.** −499 kcal/día es el **tope exacto** de mi corte moderado (−300 a −500).
El porcentaje sale grande porque su gasto es chico (2.230), no porque el recorte sea agresivo.
Con IMC 33,7 ese déficit es apropiado. **NO subas las calorías.**

**Lo que sí está mal es la proteína, y es lo importante:** 111 g = **1,80 g/kg de peso de
referencia** (61,6 kg) cuando la doctrina para «Perder grasa» son **2,2 g/kg ref = 136 g (+25 g)**.
En un déficit de 500 kcal con IMC 33, la proteína baja es exactamente donde se pierde músculo en vez
de grasa. **Súbele 25 g de proteína, quítale 100 kcal de carbohidrato, deja el total igual.**
Y el rótulo: **«déficit»**, no «balance».

### 🟡 Kathe, 28 años, −19,5% — **idéntico a Luz**
−468 kcal, dentro de banda. Proteína 119 g = 1,73 g/kg ref (68,9) contra **152 g de doctrina
(+33 g)**, la brecha más grande de toda la base. **No toques el total; mueve 130 kcal de
carbohidrato a proteína.** Rótulo → «déficit».

### 🔴 Samuel, 28 años, +12,3% — **el único donde hay que mover el NÚMERO**
Este es el caso que originó mi dictamen de v448: el PO lo puso en mantenimiento **precisamente
porque tiene ~25% de grasa**, y hoy el plan le da **+387 kcal/día**. Es lo contrario de lo que se
decidió, y +387 se sale de mi banda de volumen limpio (+200 a +300). Con IMC 27,8 y esa grasa,
**lo que corresponde es recomposición: 3.150 kcal (su mantenimiento), proteína 190 g (2,2 g/kg,
ya la tiene bien) y el trabajo lo hace el entrenamiento.** Y ahí el rótulo «balance» pasa a ser
verdad, en vez de una etiqueta encima de un superávit.

### 🟡 Miguel, 29 años, +15,1% — **el superávit se justifica, el reparto no, y el rótulo está VACÍO**
IMC 20,9 y objetivo de músculo: es el perfil de libro para volumen. Pero **+399 se pasa de la
banda** y su proteína son **2,57 g/kg**, por encima de mi techo de 2,2. Esos 26 g de proteína de más
son 104 kcal que deberían ser carbohidrato — el combustible del estímulo. **Ajuste: 2.940 kcal
(+300), proteína 154 g, los 104 kcal a carbohidrato.**
Y aparte: **su plan no tiene rótulo ninguno.** No es que diga algo falso — es que no dice nada.
Un plan sin rótulo es peor que uno mal rotulado, porque no hay nada que corregir.

## 🔴 El patrón que atraviesa los 8 — mi punto pendiente de v448, sin ejecutar

**4 de los 8 adultos están entre 24 y 33 g de proteína por debajo de la doctrina** (Luz −25, Kathe
−33, Natalia −26, Claudia −24). Todas mujeres, todas en «Perder grasa» o «Recomposición» — que es
**el cubo donde la proteína alta importa MÁS**, no menos. Es el **punto 1 de mi dictamen del
2026-08-05**, que sigue sin ejecutarse tres meses después. Mientras eso no entre, cada plan nuevo
que se escriba va a nacer con la misma brecha.

## Y sobre el rótulo mudo (lo que dice la bitácora de v485)

`nutGoalCheck` solo habla **con el editor abierto**. Los 4 planes de arriba ya están guardados: la
app no le dice nada al coach y a la persona le explica «balance» encima de un déficit del 22%.
**Un detector que solo mira lo que se está escribiendo deja vivos exactamente los casos que existían
antes del detector.** Ese aviso tiene que estar en la **ficha del asesorado**, no en la ventana.

---

# Resumen ejecutable, por orden de urgencia

| # | Qué | A quién le llega hoy | Estado |
|---|---|---|---|
| 1 | 🔴 **Sharith (16) con +350 kcal de superávit y IMC 26,4** → bajar a su mantenimiento (2.567) | 1 menor | **nuevo, sin construir** |
| 2 | 🔒 **Piso de menores = gasto × 1,05** (absorbe el −5,3% medido del plato) | Valery (1.915 → ~2.006) | cambio al arreglo de v485 |
| 3 | 🔒 **Techo: la proteína no escala por encima de 2,2 g/kg ref** | 0 hoy — cierra la puerta | cambio al arreglo de v485 |
| 4 | 🔒 **`NUT_PROT_MIN_SHARE` 0,70 → 0,60** | 20 comidas menos, 13 personas | medido, sin costo |
| 5 | 🟡 **Proteína +25 a +33 g en Luz, Kathe, Natalia y Claudia** (sin tocar el total) | 4 adultas | punto 1 de v448, pendiente |
| 6 | 🔴 **Samuel a mantenimiento (3.150)** · Miguel a +300 con 154 g de proteína | 2 adultos | decisión del PO |
| 7 | 🟡 **El aviso de rótulo, en la ficha y no solo en el editor** | 4 planes guardados | pendiente |
| 8 | 🟡 **Regla de menú: el carbohidrato no aporta >30% de la proteína de su comida** + `maxG` a la pasta (**medir antes**) | residuo de 28 comidas | sin medir |

**Lo que NO hay que hacer, con la medición al lado:** acreditar la proteína del carbohidrato dentro
del piso (48 → 11 comidas arregladas, pero **«5 g de atún»** y 121 comidas donde el proteico aporta
menos de la mitad). Ya se rechazó en v471; queda re-medido contra el código de v485.

---

*Andrés Bernal — Coach jefe de hipertrofia y nutrición. Todas las cifras de este documento se
recalcularon desde el backup del 12-ago con las funciones puras de `avi-core.js`; las que no
reproduje están marcadas como «sin medir». Fuentes externas citadas: FAO/WHO/UNU, «Human Energy
Requirements» (2004) para el costo energético del crecimiento; Schofield (FAO/OMS/UNU 1985) para el
gasto basal de 10-18 años, que es la que ya usa la app.*
