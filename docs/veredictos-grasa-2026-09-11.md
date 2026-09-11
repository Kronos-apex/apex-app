# Veredictos del equipo — GRASA CORPORAL ESTIMADA (v607)

Pedido del PO el 11-sep-2026: *«constrúyelo y se lo pasas a los coach para que lo evalúen»*.
La función está construida y **sin desplegar**. Briefing que recibieron:
`docs/evaluacion-grasa-2026-09-11.md`.

---

## 💃 VALERY (transformación corporal femenina) — 🟡 APROBADO CON AJUSTES

Pasa a 🟢 con estos cinco puntos resueltos:

1. **🔴 `BF_BAND_PTS` es una sola constante tomada del error MASCULINO, y decide por las mujeres.**
   La fórmula femenina compone TRES perímetros (cuello, cintura, cadera) contra dos en la
   masculina, así que arrastra tres errores de cinta; y la cadera es la medida más sensible a la
   postura y a la estructura ósea. El error estándar de estimación de Hodgdon & Beckett (1984,
   Naval Health Research Center, validado contra pesaje hidrostático) es **mayor en mujeres**.
   → `BF_BAND_PTS_M = 3.5` · `BF_BAND_PTS_F = 4.5`. *«El número exacto lo puede ajustar el
   ingeniero; la ASIMETRÍA no se negocia.»*
   → Y el texto que dice «puede irse unos **3** puntos» tiene que **leer la constante**, no
   llevar el número escrito a mano: hoy le miente a las mujeres.
   💎 Es la clase de v604: una constante «por defecto» con una persona dentro.
2. **Categorías: NO, y que se quede así.** El error del método (±3,5–4,5) es del MISMO orden que
   el ancho de una categoría, así que alguien en el borde cae de un lado o del otro según cómo
   quedó la cinta ese día — *«eso no es información, es ruido con etiqueta»*. Mismo criterio que
   `medAsimetria` desde v566. Si algún día se muestran, la fuente NO es la tabla plana del ACE
   (que le dice a una mujer de 48 que «pasó a estar mal» por un cambio fisiológico normal) sino
   **Gallagher et al. 2000, Am J Clin Nutr** (NHANES, ajusta por edad y sexo) — y aun así su
   recomendación sigue siendo no mostrarlas.
3. **El texto del cuello que falta suena a tarea pendiente.** Reemplazar por:
   > Ya tienes lo demás registrado. Solo te falta un dato: **el cuello**. Mídelo cuando quieras,
   > con la misma cinta — no es una tarea, y en cuanto lo anotes aquí aparece tu estimación.
4. **El ciclo menstrual mueve la cintura, que es la entrada que más pesa.** Sin rastrear fechas ni
   preguntar nada, una línea en el aviso de cómo medirse (`#med-first`):
   > Y si menstrúas: evita medirte justo antes o durante tu período, si puedes — la retención de
   > líquidos puede sumarle centímetros a la cintura que no son grasa. Elige un día parecido al de
   > tu última medida.
5. **🔴 EL COLOR DEL DELTA ES LENGUAJE DE CASTIGO.** `.mg-delta.baja` va en verde y `.mg-delta.sube`
   en naranja: la app le dice «bajar es bueno, subir es un problema» **sin preguntarle su objetivo
   a la persona**. Para quien está en recomposición o en volumen, subir un punto mientras gana
   músculo **es el plan funcionando**. Es la familia de `nutWhyKeyShown` (v510): un número sin el
   objetivo al lado dice lo contrario de lo que pasó.
   → Delta en texto NEUTRO (`--t2`) en los dos sentidos.
   → Y **un cambio menor que media franja no es un cambio**: si `|delta| < banda/2` (≈1,75 en
   hombre, ≈2,25 en mujer), en vez de flecha con cifra se dice *«Dentro del margen de tu cinta —
   con este método no se puede afirmar que haya cambio real»*.

**Lo que aprueba tal cual y pide MANTENER activamente:**
- 🟢 El silencio del menor, sin cambios («este punto NO se negocia y hoy está bien cerrado»).
- La tarjeta vive en Medidas, **separada de las fotos de progreso**: nunca el número y la foto en
  la misma pantalla.
- Es opt-in por fricción (la persona entra, se mide y abre su pantalla): nunca por push.
- ⚖️ **REGLA NUEVA que pide dejar escrita, no solo practicada:** el % de grasa **NUNCA** entra a la
  vitrina pública (`avi_showcase`) ni a ninguna gamificación. *«Los kilos que alguien levanta se
  pueden presumir; el % de grasa de alguien, no — ni con su permiso, porque abre la puerta a que
  otra persona compare el suyo contra el de ella.»* Ni metas de «% objetivo» en ningún texto.

**Sobre el caso del PO:** se declara fuera de su terreno (es especialista en mujeres) y lo remite a
Andrés Hyp y a Laura/Coach Pro. Lo único que aporta: *«un solo dato de %BF no dice si esos 7 cm son
grasa, agua o inflamación por la lesión — con una sola toma no hay delta que enseñar, y eso es
justo lo que la pantalla ya dice honestamente.»*

---

## 🩺 LAURA (fisioterapia deportiva) — 🟡 SE PUEDE MOSTRAR, con DOS condiciones duras

*«No sale a producción sin las dos cosas que dicto: la lista de isquios y las dos banderas rojas.
El resto del diseño ya cumple lo que un motor de composición corporal le debe a quien lo lee.»*

### 🔴 CONDICIÓN 1 — La lista de ISQUIOS (el hueco medido hoy). DICTADA:
- `'muslo por detrás': ['lumbar', 'isquios']` en `_PAIN_ZONE_TO_EXCL` (mismo patrón que
  `'cadera o ingle'`, que ya apunta a dos reglas).
- `GEN_ZONE_EXCL.isquios = /curl femoral|curl nordico/` — **como REGEX y no como lista de ids, a
  propósito**: es nombrable, cubre las 4 variantes que existen y seguirá cazando las que traiga el
  próximo lote sin que nadie se acuerde de actualizar nada.
- `GEN_ZONE_LABEL.isquios = 'la parte de atrás de tu muslo (isquiotibiales)'`.
- 🔒 **NO se mete dentro de `lumbar`**: quien tiene hernia o lumbalgia pura no necesita perder el
  curl femoral (es otra articulación, y en máquina con apoyo la carga lumbar es mínima). Meterlo
  ahí sería la regla ancha que ya costó el sit-to-stand y el wall-sit en v424.
- **EL CONTROL — lo que NO debe caer, con su razón clínica:** Hip Thrust (`e42`/`e43`) y Puente de
  Glúteo (`e73`/`e106`) — *la rodilla va flexionada todo el movimiento, el isquio nunca se alarga
  bajo carga; son de los más seguros para reintroducir carga posterior* · Extensión de cuádriceps
  (`e37`) — otro grupo · el patrón de bisagra sin peso (`e148`) y los estiramientos de isquios
  (`e179`, `e166`, `e176`) — *un estiramiento suave y autolimitado es parte del tratamiento, no del
  problema*. *«La lista existe para sacar lo que carga directamente el músculo lesionado, no para
  vaciarle a nadie la cadena posterior completa.»*
- Y pide explícitamente: **que el control se pruebe con un sabotaje, no que se declare.**

### 🔴 CONDICIÓN 2 — Las dos banderas rojas, que hoy no existen:
**A) Cintura en rango de riesgo cardiometabólico.** Fuente: **OMS, *Waist Circumference and
Waist–Hip Ratio*, 2008** — ≥102 cm en hombre / ≥88 cm en mujer (usa el corte alto para no
sobre-alarmar; el de ≥94/≥80 es «aumentado»). Dispara **con cintura + sexo**, sin necesitar la
grasa estimada. ⚠️ **El PO cae exactamente en el umbral: 102 cm, y subió 7 en 3 meses.**
> «Tu cintura está en un rango que vale la pena revisar con un profesional de la salud, más allá de
> lo que hagamos aquí contigo entrenando. No es una alarma ni un diagnóstico — es cuidarte con toda
> la información, no solo con la del gimnasio.»

**B) Un cambio más grande que el método puede medir.** No inventa un «ritmo seguro de pérdida»
(*«no tengo con qué citarlo bien y no quiero que una cifra sin respaldo entre a un motor de
salud»*): usa **el doble de la franja del propio método (7 puntos)**, porque eso no se explica por
ruido del instrumento — o el dato está mal tomado, o el cambio es demasiado rápido. Las dos cosas
merecen pausa, y la misma acción las cubre.
> «Este cambio es más grande de lo que este método suele medir bien. Antes de seguir, cuéntale a tu
> coach cómo te has sentido estos días — con la comida, con el sueño, con el ánimo — y si pueden,
> vuelvan a tomar la medida para confirmarla.»

**NO acepta un tercer umbral por valor bajo absoluto:** *«flaggear a alguien solo por tener poca
grasa castigaría a gente naturalmente delgada sin señal real de riesgo. El riesgo está en la
VELOCIDAD del cambio, no en el punto aislado.»*

### Lo que aprueba, y por qué (útil para no «mejorarlo» mañana)
- 🟢 **El silencio del menor es la respuesta CLÍNICA, no la fácil:** *«explicar “no te lo mostramos
  porque eres menor” sigue nombrando el concepto delante de una persona de 15 años»*, y además
  empuja a buscarlo en una calculadora de internet sin ninguna de estas guardas. *«El silencio no
  es evasión, es la barrera.»*
- ✏️ **Única corrección del lado del COACH:** su ficha también queda muda y él es un adulto que
  necesita distinguir «no hay dato» de «la app decidió no mostrarlo» →
  *«No se estima grasa corporal para menores de edad — es una regla del equipo, no un dato que
  falte.»* (si no, le pide a la familia que «complete la medida»).
- 🟢 **La franja PROTEGE, no confunde** — es la honestidad que le faltaba al IMC crudo que confundió
  al PO. *«No la ensancharía ni la apretaría sin remedir el método contra otra fuente.»*
- 💎 **La cadencia de 8 semanas (v567) es la verdadera barrera contra el chequeo compulsivo:** con
  el peso uno se pesa a diario; aquí la flecha solo puede aparecer cada dos meses. *«Manténganla —
  es lo que separa esto de un contador obsesivo, más que cualquier texto al lado.»*
- ⚠️ **Pide separación visual de las FOTOS de progreso** (al menos una tarjeta de por medio o
  secciones distintas): apiladas, la persona hace sola la comparación «¿me veo como dice el
  número?». Es ajuste de producto, no clínico, pero deja la advertencia por escrito.

### ¿Entra la grasa estimada donde hoy manda el IMC?
**NO. Dejar `bodyLoadProfile` como está.** *«Lo que decide si alguien aterriza un salto con más o
menos fuerza de reacción es su MASA TOTAL, no su composición. Con IMC 31 y 24% de grasa sigue
habiendo más masa cayendo sobre rodilla y tobillo que con IMC 24: el tejido que compone esa masa no
cambia la física del aterrizaje. Una tercera vía que “desbloquee” pliométricos sería un retroceso
de seguridad disfrazado de personalización.»* Y en el caso del PO lo confirma sin cambiar nada: su
IMC 31,3 le quita saltos **justo cuando trae un isquio lesionado**.

### Nutrición
Se declara fuera de su cancha (es de Andrés) con una nota: si algún día se dosifica proteína sobre
masa magra estimada, **la franja tiene que viajar con el número** — ±3,5 puntos de grasa son varios
kilos de masa magra, y un gramaje «preciso» sobre eso es la falsa precisión de v533.

### El caso del PO
*«Vas exactamente donde dice tu objetivo: el número no cambia el plan, lo confirma. Lo que de
verdad me importa hoy es tu cintura subiendo 7 cm en tres meses — no es una emergencia, pero si
sigue otro trimestre, habla con tu médico de cabecera. Y del isquio: leve, ayer, tren inferior en
reposo el fin de semana — bien hecho, eso es POLICE aplicado con criterio, ni reposo total ni
ignorar la señal.»*
Su miércoles, ejercicio por ejercicio: Sentadilla en Smith y Peso Muerto Rumano **ya excluidos** ✅ ·
Hip Thrust 🟡 se queda con carga reducida · Desplantes 🟡 paso corto, sin inclinación profunda ·
Extensión de cuádriceps ✅ seguro · **Curl Femoral acostado ❌ CONTRAINDICADO esta semana: es trabajo
resistido DIRECTO sobre el músculo que se lesionó ayer.** *«Sin la corrección, la app le serviría
el miércoles el ejercicio que más directamente contrae esa cadena. Eso no es “un poco intenso”: es
cargar tejido lesionado en fase aguda, contra POLICE.»*

---

## 🥗 ANDRÉS HYP (nutrición e hipertrofia) — pendiente
## 🏋️ COACH PRO (fisiología del entrenamiento) — pendiente
