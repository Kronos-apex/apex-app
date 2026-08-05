# 💪 Dictamen de Andrés Hyp — proteína, recomposición y menores (2026-08-05)

> **Vinculante.** Los macros pasan por Andrés Hyp por decisión del PO (2026-08-03). Este
> documento es su veredicto completo, con los números medidos contra la base de producción.
> **De los 6 puntos, 2 están EJECUTADOS (avi-v448) y 4 quedan pendientes.**

## Cómo nació
El PO puso a Samuel Cifuentes en mantenimiento pese a tener objetivo «Ganar músculo», con este
argumento: *«tiene ~25% de grasa, sería un error ponerlo en superávit»*. Al ir a implementarlo
apareció que **el motor no sabe expresar una recomposición**: para darle mantenimiento hay que
marcarle «Recomposición», y eso le baja la proteína de 189 a 155 g — justo al revés de lo que
pide una recomposición. El PO lo había resuelto a mano, fuera del motor.

## Veredicto: 🔄 PROPUESTA ALTERNATIVA
> *«El diagnóstico del ingeniero es correcto y el remedio propuesto se queda corto. El hueco no
> es de "Recomposición": es que la proteína la está fijando la dirección calórica cuando debería
> fijarla si hay músculo en juego. Con el arreglo tal como estaba planteado, el peor caso del
> motor queda vivo.»*

---

## ✅ EJECUTADO en avi-v448

### 5. Menores de edad
- **Mifflin-St Jeor no está validado bajo 18** (no cuenta el crecimiento, subestima) → **Schofield
  (FAO/OMS/UNU 1985)** para 10-18 años. Medido en Valery (F, 15, 52 kg): Mifflin 1.290 vs
  Schofield 1.389 de basal.
- **Ningún menor lleva dirección negativa, nunca** — ni con «Perder grasa».
- **«Recomposición» en un menor de peso normal no es un objetivo**: Valery está en IMC 20,1 y
  Valery Valbuena en 19,1, no tienen nada que recomponer. Se tratan como salud general.
- **Cero lenguaje de composición corporal** en lo que lee una menor (riesgo de conducta
  alimentaria que no cuesta nada evitar). ⚠️ *Pendiente de revisar en los textos.*
- Impacto medido: Valery 1.774→1.910 · Sharith 2.691→2.917 · Valery Valbuena 1.972→2.111 ·
  Hernán 2.932→3.125. Adultos sin cambio.

### El peso de la ficha (hallazgo de código, no de macros)
`nutCalcHTML`, la habitación sin plan y el mensaje de WhatsApp estimaban con el peso de la
**ficha** en vez del **último registrado**: en Samuel, 78 kg contra 86 = **138 kcal y 17 g de
proteína de diferencia entre pantallas de la misma app**. Cuarta superficie de la familia
v435/v444. Corregido.

---

## ⏳ PENDIENTE — los 4 que faltan

### 1. Proteína 2,2 g/kg de peso de REFERENCIA — en Recomposición **Y en «Perder grasa»**
Hoy el motor usa 2,2 g/kg solo si el objetivo dice «músculo» o «fuerza»; 1,8 en todo lo demás.
Eso mete a «Perder grasa» en el cubo bajo, **que es donde la proteína alta importa MÁS** (el
déficit es de 500 kcal, no de 0). Y el texto que la app le muestra a esa persona dice
*«mantenemos la proteína alta para no perder lo ganado»* encima de la dosis más baja del motor:
**la clase de v437 otra vez.**

| | peso | IMC | ref | kcal | P hoy | **P con 2,2** |
|---|---|---|---|---|---|---|
| Kathe Beltran | 85 | 32,0 | 66,1 | 1.930 | 119 g | **145 g (+26)** |
| Luz Rodríguez | 82 | 33,7 | 61,6 | 1.730 | 111 g | **136 g (+25)** |
| diana ramirez (18) | 92 | 34,2 | 68,4 | 2.126 | 123 g | **150 g (+27)** |
| Claudia Valbuena | 74 | 30,4 | 59,6 | 2.145 | 107 g | **131 g (+24)** |
| Natalia Martinez | 63 | 22,3 | 63,0 | 2.052 | 113 g | **139 g (+26)** |
| Valery (15) | 52 | 20,1 | 52,0 | 1.910 | 94 g | **114 g (+20)** |

**Regla para el código:** `2,2 g/kg si el objetivo depende de construir o conservar músculo; 1,8
si no`. El cubo de 1,8 se queda con Resistencia y Salud general.
**No 2,4** (aunque su tabla lo diga): el carbohidrato paga la diferencia y es el combustible del
estímulo; entre 2,2 y 2,4 se gana poco y en esta población nadie pesa al gramo.
🔴 **Condición: van los dos juntos o no aprueba ninguno.**

### 4. Separar el objetivo de la dirección calórica + rótulo «recomposición»
`kcalTargetFor` y `calcMacrosFromKcal` leen **el mismo `goal`**: por construcción no se puede
mover uno sin el otro. Y **`_NUT_GOALS` no tiene la palabra «recomposición»** — se mapea a
`mantenimiento`, cuyo texto dice *«el objetivo no es subir ni bajar, sino sostener tu
composición»*, **la negación exacta de lo que es una recomposición**.

Propuesta: al asesorado **no** se le agrega ninguna pregunta (13 de 22 son auto-registradas). Al
**coach** se le agrega un control «Dirección calórica»: `Automático` (default) · Déficit ·
Balance · Superávit. En automático nada cambia para nadie.

| Objetivo | Dirección (auto) | Proteína g/kg ref |
|---|---|---|
| Ganar músculo | +350 | 2,2 |
| Fuerza | +200 | 2,2 |
| **Recomposición** | **0** | **2,2** ← cambia |
| **Perder grasa** | **−500** | **2,2** ← cambia |
| Resistencia | 0 | 1,8 |
| Salud general | 0 | 1,8 |

+ **rótulo `recomposicion` propio en `GOAL_WHY`**, redactado por Sofía y firmado por Andrés:
*«comes lo que gastas, pero con la proteína arriba: el objetivo no es que la balanza baje, es que
cambie de qué está hecho ese peso; mide la cintura cada 3 semanas»*.
🔴 **Sin ese rótulo, arreglar los gramos y dejar el texto de `mantenimiento` fabrica la mentira
nueva de siempre.**

### 6. La rampa que quita el acantilado de IMC 30
Verificado: **200 gramos de báscula cambian 30 g de proteína.** Mujer de 156 cm: a 72,9 kg el
peso de referencia es 72,9 (P 160 g) y a 73,1 kg cae a 59,3 (P 130 g). Muerde al revés: **Claudia
está en 74 kg / IMC 30,4 — si baja 1,1 kg, que es el propósito de su plan, su proteína SALTA de
131 a 160 g** sin ninguna razón visible para ella. Y ya le pasó a alguien real: el PO cruzó el
escalón al pasar de 90 a 92 kg en julio.

```js
t   = clamp((imc - 28) / 4, 0, 1);
ref = redondear(w - t * 0.75 * (w - ideal), 1);   // ideal = 22.5 × m²
```
Continua (146→145 al cruzar, en vez de 160→130) · **idéntica a hoy con IMC ≥ 32 y ≤ 28** · solo
cambia la franja 28-32, que es donde está rota. En esa franja las dosis bajan un poco (Claudia:
ref 59,6 → 65,3 → 144 g en vez de 131): es el precio de la continuidad, y lo da por bien pagado.

### 3. Samuel — plan aprobado, con condición previa
```
Fase: RECOMPOSICIÓN (mantenimiento calórico + proteína de hipertrofia)
Calorías: 3.148 kcal (TDEE 3.148 · ±0)
Macros:   P 189 g · C 425 g · G 77 g · 12 vasos de agua
```
Frente al plan que el PO le armó a mano (3.533 · P194 · C512 · G79): **−385 kcal, −5 g de
proteína, −87 g de carbohidrato**. *«La proteína que él eligió a mano ya era la correcta; el
error estaba en las calorías.»*
🔴 **Condición innegociable: que Samuel se vuelva a pesar** (último registro 6-jun, dos meses y
30 sesiones). Y **una cuarta sesión antes de tocarle una sola caloría más** — entrena 3 días.
Nada de superávit: IMC 27,8 con cintura-talla 0,568. Reevaluar cuando llegue a < 0,53 (≈93 cm).

### 2. La dirección de una recomposición es **0**, y el % de grasa **no** se levanta como requisito
El ±200 kcal desaparece dentro del error de la propia estimación (Mifflin × factor tiene ±10-15%
= ±315 a ±470 kcal en Samuel). Lo que dirige una recomposición es la proteína y **el ajuste por
medición a las 3-4 semanas**: si el peso se movió más de ±1% en 4 semanas, se corrige el objetivo
un 10% en contra; si no se movió y la cintura bajó, **eso ES la recomposición funcionando**.
**Sobre el % de grasa:** ±5 puntos de error en una estimación visual, nadie llena ese campo, y
**ya existe un proxy medido y mejor: la cintura** (6 de 22 la tienen, justo los que están en el
filo). Prioridad de producto: **pedir cintura al inicio y cada 3 semanas**, por encima de pedir
% de grasa.

---

## Límites de seguridad (punto 5, parte no ejecutada)
- **Renal:** no hay riesgo a 2,2 g/kg en riñón sano. Pero **la app no pregunta por enfermedad
  renal**: si el asesorado declara ERC, riñón único o litiasis recurrente, **la proteína no se
  auto-genera** — va a médico. Una línea en la ficha, no un cálculo.
- **Hidratación:** `water = peso × 35 / 250` usa el **peso real**, no el de referencia. Está
  bien. 🔴 **No cambiarlo al migrar la proteína a peso de referencia** — sería el error espejo.

## Advertencias abiertas
- **Sin sexo en la ficha, el motor no puede calcular nada:** Nicolás Gutiérrez, Santiago Santos
  (17) y Stevan Guerrero (sin ningún dato). Tres personas antes de discutir gramos.
- **Los pesos que alimentan todo esto tienen 1-2 meses** (Samuel 6-jun, Natalia 24-may, Claudia
  30-jun) y **las dos menores no tienen ni un peso registrado**. *«Discutir 24 g de proteína
  sobre un peso de hace dos meses es precisión falsa. La pelea de fondo es que la gente se pese.»*
- **Andres Martínez** (el PO) tiene objetivo «Ganar músculo» y plan de 1.800 kcal / cutting con
  92 kg. No cuadra; alguien debería mirarlo. *(Su perfil es decisión cerrada del PO desde el
  3-ago — pero el número sigue sin cuadrar.)*

**Siguiente revisión: 4 semanas**, con Samuel re-pesado y cintura tomada.

*Dictamen emitido el 2026-08-05. Puntos 5 y el hallazgo del peso, ejecutados en avi-v448.*
