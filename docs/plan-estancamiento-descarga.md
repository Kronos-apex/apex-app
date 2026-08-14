# Plan vivo — DETECTOR DE ESTANCAMIENTO y SEMANA DE DESCARGA

> Nace del reporte del PO (2026-08-03): «la app dice que casi todos se estancaron» y «la semana de
> descarga le manda una rutina totalmente distinta». **Las dos quejas son ciertas** y están
> reproducidas con datos reales. Criterios deportivos de **Andrés Hyp** (periodización), **Valery**
> (transformación femenina) y **Laura** (fisioterapia, VINCULANTE). Decisiones de producto del PO
> marcadas como tales — no se re-preguntan.

---

## 1. EL DIAGNÓSTICO, MEDIDO (no re-derivar)

`_isStalledEx` (`avi-core.js`) **solo mira `p.maxKg`** y exige `unit==='kg'`. Ignora las
repeticiones, ignora `p.vol` —que está calculado y guardado en el mismo objeto—, ignora la
antigüedad y el nivel. La ventana son **los últimos 4 puntos**, no un tiempo. Y `recentMax <=
priorMax` significa que **mantener cuenta como estancarse**.

Medido el 2026-08-04 sobre los 26 registros vivos de `user_data` (16 personas con ≥1 sesión):

| | detector viejo |
|---|---|
| ejercicios marcados «estancado» | **41** |
| personas con ≥1 | **6** de 8 con datos reales |
| personas con ≥3 → **semana de descarga** | **4** |

Los tres casos que lo retratan:

- 🔴 **Astrid** subió el hip thrust **90 → 100 kg el 18-jul**, lo consolidó a 4×12 y está en su
  **volumen máximo histórico** — y la app le dice que se estancó. Su récord cayó **dentro de la
  ventana `prior`** (punto 10 de 14) → `recent(100) <= prior(100)`. **El detector castiga terminar
  bien una progresión:** cualquiera que suba el peso y lo afiance queda marcado a las 4 sesiones.
  Falso positivo ESTRUCTURAL, no un caso raro.
- **Nataly** lleva el hip thrust en 80 kg fijos **subiendo de 40 a 57 repeticiones totales**
  (+42% de volumen). La app: «se estancó».
- **Luz**, principiante con 5 semanas en la app, también sale estancada.

## 2. EL DETECTOR NUEVO (spec)

### 2.1 El índice de rendimiento
`perfIndex(kg, reps)` = **Epley con tope de 20 repeticiones**: `kg · (1 + min(reps,20)/30)`.

⚠️ **NO se reusa `estimate1RM`**: devuelve `null` con `reps>15`, que es justo el caso de la
principiante que progresa subiendo repeticiones (aviso de Andrés, verificado en el código).
El tope de 20 evita que 30 repeticiones de calentamiento se lean como un récord.

El punto de un día es el **mejor índice de sus series hechas**, no el peso máximo.

### 2.2 La ventana es ELÁSTICA
La ventana dura **al menos `WIN_WEEKS`** (5 semanas; **6 para principiante**) **y contiene al
menos 6 puntos** — lo que resulte más largo:

```
cut = min( now − WIN_WEEKS·7d ,  fecha del 6.º punto contando desde el final )
```

**Por qué elástica y no fija (medido).** Con «6 puntos en 5 semanas» fijos, **31 de los 41
ejercicios dejaban de marcarse por no alcanzar los 6 puntos**, no por haber mejorado: con un split
semanal cada ejercicio sale ~1 vez por semana, así que en 5 semanas se juntan 4-5 puntos y los
grandes básicos quedaban **invisibles para siempre**. Eso no es un detector más listo, es un
detector mudo — la cara opuesta del mismo error. La ventana elástica evalúa **9 de 22** ejercicios
de Astrid y **23 de 27** de Andrés, en vez de 0.

### 2.3 La referencia es lo de ANTES de la ventana
`estancado ⟺ mejor índice DENTRO de la ventana ≤ mejor índice ANTES de la ventana`,
con **≥1 punto antes** como base. Este es el arreglo del caso Astrid: su récord de 100 kg cae
dentro de la ventana, no en la referencia, así que lee **+11%** en vez de «estancada».

### 2.4 Compuertas (Andrés)
- **Principiante con menos de 12 semanas entrenando → JAMÁS estancado.** Nunca. En adaptación no
  hay meseta que valga.
- **Menos de 8 semanas de datos en AVI → no se evalúa** (no hay con qué comparar).
- Antigüedad = `startDate` si existe; si no, la primera sesión.

**Desviación documentada:** Andrés pedía además «sin cambio de plan en 3 semanas». **No es
implementable hoy: las rutinas no guardan fecha de modificación.** Queda anotado; si algún día se
añade un `updatedAt` a la rutina, esta compuerta entra sola.

### 2.5 Resultado medido del detector nuevo

| | viejo | nuevo |
|---|---|---|
| ejercicios | 41 | **21** |
| personas | 6 | **4** |
| descargas (regla vieja ≥3 estancados) | 4 | 3 |
| **descargas (criterio real de Andrés, §3)** | 4 | **1** |

Los 5 controles, todos correctos:

| caso | qué debe pasar | resultado |
|---|---|---|
| Astrid · Hip Thrust con Barra | consolidó 90→100 → **NO** estancada | ✅ lee **+11%** |
| Astrid · Remo con Barra | 10 kg quieto 2 meses → **SÍ** (el real de Valery) | ✅ estancado |
| Nataly · Hip Thrust con Barra | las reps subieron → **NO** | ✅ no evaluable hoy (6 puntos); con un dato más lee **+12%**, nunca estancada |
| Samuel · Curl de Bíceps | 20 kg quieto → **SÍ** | ✅ estancado |
| Luz · Curl Femoral Tumbado | principiante de 5 sem → **JAMÁS** | ✅ compuerta |

## 3. LA DESCARGA

### 3.1 Criterio de disparo (Andrés)
Hoy `shockTargets` dispara con **≥3 ejercicios estancados**. Es incorrecto por dos razones
medidas: (a) es un conteo ABSOLUTO que ignora cuántos van mejorando —Astrid tiene **3 planos y 7
subiendo**, eso no es fatiga sistémica, es progreso—; (b) una **meseta** no es una **regresión**.

Criterio nuevo: **REGRESIÓN ≥5% del índice en ≥3 ejercicios**, más los pisos:

- **180 días entrenando + 10 semanas de datos** en AVI
- constancia **0,8** del plan (sube desde 0,7)
- volumen ≥90% del pico
- **Laura (VINCULANTE): ninguna descarga sin al menos una señal de recuperación real** —
  volumen cayendo con asistencia sostenida · series abandonadas · tendencia de `feeling` a la baja.
- **Laura: `painCare` entra como PARADA, no como ponderación** (5 banderas rojas, incluida correr
  `GEN_NERVE_RE` sobre la nota de dolor).
- Piso de Laura: **56 días + 12 sesiones**.

**DECISIÓN DEL PO (2026-08-04): el piso de Andrés va tal cual.** Consecuencia medida y aceptada:
**nadie del gimnasio califica para una descarga automática hasta ~noviembre** (nadie tiene
`startDate`, así que la antigüedad se mide desde la primera sesión y el máximo son 73 días). El
coach sigue pudiendo generar una descarga a mano desde el generador — eso no se toca.

### 3.2 Qué HACE la descarga (decisiones del PO, ya tomadas)
1. La descarga es **la MISMA rutina**, no una nueva. Hoy `shockDeload` llama a `generarRutinas`
   con `deload:true` → **nueva selección de ejercicios** + −1 serie + una nota de texto. Y **no
   existe ningún snapshot del plan anterior**, así que «volver» hoy es imposible.
2. **El coach reactiva con un toque** al terminar la semana. NO temporizador automático.
3. Ejecución (Andrés): series **×0,6**, carga **−10%**, **reps IGUALES**, 7 días.
4. **Laura: NO tocar rango, frecuencia, reps ni selección de ejercicios.**

### 3.3 Las dos descargas están al revés (pendiente)
`coachInsight` la sugiere con criterio defendible (4 semanas cumpliendo el plan) y **solo pinta una
tarjeta**; `shockTargets` la dispara con 3 líneas planas de kg y **es la que reescribe la rutina**.
Además `shockTargets` es **ciega al dolor** mientras `shockPlan` sí lo mira.

## 4. LO QUE VE CADA UNO

**DECISIÓN DEL PO (2026-08-04): el estancamiento es aviso SOLO PARA EL COACH.** La asesorada no ve
nada: se entera cuando el coach le escribe o le cambia la rutina — que es lo que hace un entrenador
de verdad. Ejecuta las dos peticiones de Valery de una vez (nunca la palabra «estancada», y fuera
el CTA «hablar con tu coach»): la tarjeta desaparece en lugar de suavizarse.

- **Asesorada:** nada. Se elimina el candidato `estancado` de `coachInsight`.
- **Coach:** lo ve en el pulso (`coachPulse`) y en la ficha (`shockTargets`/`shockPlan`), **siempre
  con la ACCIÓN concreta** (Valery), no con el diagnóstico a secas.
- El detector **NO se borra**: con Astrid encontró un estancamiento REAL (remo 10 kg quieto 2
  meses) que su coach no había visto.

## 5. LO QUE LOS DATOS DICEN Y NADIE SABÍA

- 🔴 **`feeling` se registra en el 12% de las sesiones (28 de 241) y en 0% de las últimas dos
  semanas.** Es opcional al cerrar el entreno y la gente no lo toca. **No puede ser la señal de
  recuperación que pide Laura**, aunque suene a la mejor: hay que sostenerla con las otras dos.
- 🔴 **`finishedAt` no existe antes del 13-jul** (llegó con v367): 0% hasta esa semana, 21% → 74% →
  66% → 80% después. **«Series abandonadas» NO se mide con `finishedAt`** o se lee como abandono
  masivo lo que es solo historia vieja. Se mide con **`doneSets/totalSets`, presente en el 100% de
  las 241 sesiones**: 65 sesiones (27%) quedaron a medias, con un pico en 0-9% y otro en 90-99%.
- **Nadie tiene `startDate`.** Toda antigüedad se mide desde la primera sesión.
- El **ánimo previo (`mood`)** empezó a guardarse en la sesión con v432: 50% en la semana del 3-ago,
  0% antes.

## 6. QUÉ HACE LA DESCARGA — implementado en avi-v434

**Deja de ser una rutina nueva y pasa a ser un MODO TEMPORAL de 7 días** sobre el plan que la
persona ya tiene. No pasa por el generador: el checkbox `#mg-deload` y `opts.deload` se **borraron**
(no puede haber dos formas de hacer una descarga, una de ellas mala).

| | qué pasa | quién lo pidió |
|---|---|---|
| Ejercicios · días · **repeticiones** | **intactos** | Laura (vinculante) + Andrés |
| Series | **× 0,6**, piso 2 (`deloadSets`) | Andrés |
| Carga | ~~**−10%** en el peso sugerido (`deloadLoadFactor`)~~ → **v482: × 0,85 SOBRE EL RÉCORD** (`deloadSuggestKg`) | Andrés |
| Duración | **7 días** | Andrés · PO |

### 6.1 v482 — LA CARGA NO BAJABA (reclamo del PO 13-ago, medido el 14-ago)
El PO: *«solo le bajas el 10% del peso que maneja la persona y eso es prácticamente nada»*. Tenía
razón en el dato y **midiendo salió peor: el 10% casi nunca llegaba**. Dos causas:
1. El factor multiplicaba el **peso sugerido**, que solo existe con récord guardado, en modalidad
   peso+reps y fuera de la fase de adaptación → **186 de 544 ejercicios (34%)**, y **9 de 21
   personas no recibían la bajada en NI UN ejercicio**.
2. El factor caía **encima del escalón de progresión** de `suggestFromPR` → la sugerencia «de
   descarga» quedaba **por encima del propio récord en 130 de 148 casos** (mediana **+6,7%**,
   hasta +25%). Caso real: Natalia, récord 25 kg ×15 → la app le «descargaba» a 25 kg.

| medido, 148 casos comparables | v481 | v482 |
|---|---|---|
| queda ≥ al récord | 130 (88%) | **0** |
| mediana vs su récord | **+6,7%** | **−15,0%** |
| peor / más suave | −8,1% / +25,0% | −25,0% / −10,0% |

Ruta: `scripts/deload-carga.mjs` (y `scripts/deload-dosis.mjs` para las 7 mediciones de la dosis).

**Por qué 0,85 y no el 0,50 que pidió el PO** — dictamen de Andrés Hyp del 14-ago, que él **no
firma**: «bajar al 50%» viene del powerlifting, donde se trabaja al 85-90% del máximo. Medido, la
mediana de repeticiones de estos planes es **12 = ~71% del máximo**; ×0,50 deja a la persona en
**36%** pidiéndole 12 repeticiones cuando podría hacer ~54. El taper recorta **volumen** 40-60% y
**mantiene** la intensidad (Bosquet et al., MSSE 2007;39(8):1358-65 · Pritchard et al., Strength
Cond J 2015;37(2):72-83), y lo que retiene la adaptación es la carga, no las series (Bickel et al.,
MSSE 2011;43(7):1177-87). Recortar las dos a la vez (0,6 × 0,5 = **29% del tonelaje**) no está en
ninguna literatura. Su alternativa si el PO sostenía el 0,50: **series sin recorte y piso 3**. El PO
eligió la que Andrés firma. ⚠️ **No hay ECA de semana de descarga en hipertrofia**: es criterio
apoyado, no dato — y **ninguna descarga ha corrido completa todavía** (0 filas, 14-ago), así que no
hay ni un resultado propio con qué calibrar.

**El recorte de SERIES se queda** porque está medido que no hace daño: de 158 pares persona-músculo,
**0 caen bajo un tercio** de su volumen y solo **4 cruzan hacia abajo las 4 series semanales**
(tríceps y cardio). Y el hueco que temía Andrés —ejercicios ya en el piso de 2 series, que no
reciben recorte— son **2 de 544**.

**Lo que se agregó:** `deloadLoadHint`, la frase para los dos tercios de ejercicios sin récord
(texto de Andrés, anclado a un objeto y con comprobación por sensación, sin RIR ni RPE). **Se calla
en fase de adaptación**: ahí el peso ES la referencia técnica y «usa menos» es la peor instrucción.

Medido sobre planes reales: **Kathe 91 → 54 series (−41%)**, **Astrid 113 → 64 (−43%)**.

- **La vuelta:** `startDeload` guarda las series originales por posición, con el id y el nombre como
  testigo. `endDeload` las devuelve exactas — y si el coach cambió un ejercicio durante la semana,
  **se respeta SU cambio** en vez de pisarlo.
- **No se quita sola** (decisión del PO: sin temporizador). La contrapartida es `deloadOverdue` →
  aviso en el Inicio del coach: «Kathe · terminó hace 3 días — devuélvele el plan completo».
- **La asesorada lo ve explicado** (`deloadCardText` → `#cn-deload`, ARRIBA del entreno): «Esta
  semana bajamos revoluciones… Quedan 7 días». Sin jerga. Si no se explica, se lee como un error de
  la app o como que la están descuidando.
- **Manual siempre disponible** en la ficha, con `deloadWarnings` que AVISA (sin bloquear: la
  decisión es del coach) cuando hay dolor reciente o poca historia detrás.
- Quien está en descarga **no recibe planes de choque**: sería pedirle esfuerzo justo la semana en
  que la consigna es recuperar.

## 7. ESTADO

- [x] Diagnóstico medido (2026-08-03) + medición del prototipo contra la gente real (2026-08-04)
- [x] **Deploy A — el detector** (avi-v433): 41 → 21 ejercicios · 6 → 4 personas · 4 → 0 descargas
- [x] **Deploy B — la descarga** (avi-v434): misma rutina + snapshot + reactivar con un toque
- [ ] Pendiente de **Andrés**: el estado `carga_liviana` («listo para subir peso», `repsTop>=18`) —
      quien llega a 18+ repeticiones no necesita descargar, necesita SUBIR. Se dejó fuera a propósito.
- [ ] Pendiente: la señal de recuperación de Laura como **gate del disparo automático** (hoy solo
      están los pisos + la parada por dolor). Con `feeling` al 12% hay que sostenerla con volumen y
      `doneSets/totalSets`.
