# Dictamen de Andrés (Hyp) · la nutrición y el embarazo (5-nov-2026, noche)

Estado: CERRADO (N1 a N6; al final «Qué NO miré» y los 19 candados). Responde `_BRIEFING-andres-embarazo.md`. Vinculante en macros y planes.

**Cómo medí.** `avi-core.js` real, sin tocar el repo: copié el archivo a la carpeta temporal, le apliqué mis reglas con reemplazos que abortan si el texto no aparece EXACTAMENTE una vez, y comparé contra el original. Cada cifra lleva su CONTROL (sin embarazo el número es idéntico). Citas externas: TODAS de memoria, marcadas 🟡 y para validación de un nutricionista u obstetra (mi competencia es la nutrición deportiva, no la obstétrica).

⚠️ **Una corrección al briefing.** `nutritionEstimate` NO lee `client.notes`: el ejemplo del briefing pasa `notes:'estoy embarazada'` y da 1.693 porque la función la ignora. Eso es el hallazgo (la nutrición no sabe), pero también significa que mi regla tiene que leer la nota ella misma: `parseLimitations(client.notes).embarazo` (la misma bandera que usa el entreno; `limitationsFor` hace igual).

⚠️ **Una decisión mía que cambia lo del briefing: la regla exige `sex === 'F'`.** Medí que la frase «mi esposa está embarazada» en la ficha de un HOMBRE (objetivo «Perder grasa») dispara la bandera y, sin esta condición, su plan pasaba de 2.225 a 2.864 kcal (+639) con un rótulo que le habla de SU embarazo. Laura aceptó ese falso positivo en el entreno porque ahí cuesta variedad de ejercicios; en nutrición cuesta un plan cambiado de verdad. Con `sex==='F'` el control da 2.225 = 2.225. Costo: un hombre trans embarazado queda fuera de la regla (el coach escribe su plan a mano). Queda el otro falso positivo que Laura aceptó, el de una MUJER («tuve un embarazo hace 3 años»): ahí pagan el coach (quitar la frase) y la vigencia de 90 días; lo digo en N5.

---

## N1 · Energía con embarazo  (CERRADA)

### Veredicto: 🟡 **APRUEBO CON UNA REGLA, y la cifra del 2.º y 3.º trimestre NO es mía**

> 🔒 **REGLA E1.** Si la persona es mujer y su nota dice embarazo: **nunca déficit y nunca superávit libre. El objetivo calórico es `gasto × 1,05` para los SEIS objetivos** («Perder grasa», «Recomposición», «Ganar músculo», «Fuerza», «Salud general», «Resistencia»). Sin leer el trimestre (Laura E1: leerlo solo serviría para relajar).

Es la regla de menores (`gasto × 1,05`) puesta donde está aquella: dentro de `nutritionEstimate` y en la banda `nutMinorBandBase`, que es por donde pasan las dos puertas (calculadora y plan escrito). El 1,05 no lo inventé: es el margen del plato que medí en agosto (−5,3 % a +11,4 %), y lo **re-medí hoy** con perfiles de embarazo (abajo): el plato entrega entre 0,893 y 1,089 de su objetivo del día.

### Por qué ese número y no otro (la parte honesta)
- **Por qué no déficit, ni siquiera en obesidad.** Perder peso a propósito durante un embarazo no es decisión de un coach en un desplegable ni de una calculadora: la dirección del peso la fija quien atiende el embarazo (IOM 2009 da rangos de aumento por IMC previo, **incluso para obesidad** — de memoria, 🟡). La app no sabe el IMC previo.
- **Por qué no +340/+452.** Las guías suman energía por trimestre (IOM/DRI 2002-2005, repetido por ACOG: +0 kcal en el 1.er trimestre, ~+340 en el 2.º, ~+452 en el 3.º — de memoria, 🟡). La app **no sabe la semana**. Sumar +340 «por si acaso» a alguien en el 1.er trimestre es un superávit sin base; no sumar nada a alguien en el 3.º es quedarse ~450 kcal corto. **Elegí el error que se puede ver y arreglar:** el piso lo dice el rótulo, el coach recibe el aviso y su plan escrito por encima del piso NO tiene techo (no lo capo: un plan de +340 para el 2.º trimestre es legítimo y lo firma quien conoce la semana).
- **Y el error de quedarse corto es más chico de lo que parece**, por una coincidencia que reporto y NO uso como argumento: el gasto se calcula con el peso ACTUAL, que sube con el embarazo. Medido: 68 → 85 kg (+17 kg) sube el gasto de 2.142 a 2.406 (**+264 kcal**), y con el ×1,05 el plan pasa de 2.249 a 2.529 (+280 sobre el de 68 kg). Sin embargo es una coincidencia (Mifflin sobre peso gestacional no es una fórmula de embarazo), así que **la cifra del 2.º y 3.º trimestre la tiene que firmar un nutricionista u obstetra** y llega por el plan escrito del coach.

### Cifras medidas: ANTES (código real) → DESPUÉS (mi regla en memoria)
Mujer, nota «estoy embarazada». Unidad: kcal/día, macros en g.

| Persona (gasto) | Objetivo | ANTES | DESPUÉS |
|---|---|---|---|
| 30 a · 68 kg · 162 cm · af 1,55 (**2.142**) | Perder grasa | **1.693** (−449) · P150 C136 G61 | **2.249** (+107) · P109 C316 G61 |
| | Recomposición | 2.142 · P150 C248 | 2.249 · P109 C316 |
| | Ganar músculo | 2.492 (+350) · P150 C336 | 2.249 · P109 C316 |
| | Fuerza | 2.342 (+200) | 2.249 |
| | Salud general / Resistencia | 2.142 · P122 C276 | 2.249 · P109 C316 |
| 30 a · 68 kg · af 1,2 (**1.658**) | Perder grasa | 1.693 · P150 C136 (el piso de carbohidrato la sube sobre su gasto) | 1.741 · P87 C211 G61 |
| | Ganar músculo | 2.008 | 1.741 |
| 25 a · 52 kg · 160 cm · af 1,375 (**1.697**) | Perder grasa | **1.295** (−402) · P114 C104 G47 | 1.783 · P83 C257 G47 |
| 35 a · 90 kg · 162 cm · IMC 34 · af 1,55 (**2.444**) | Perder grasa | 1.944 (−500) · P147 C204 G60 | 2.569 · P128 C332 G81 |
| 28 a · 47 kg · 155 cm · af 1,2 (**1.366**) | Perder grasa | **1.200** (−166) · P103 C103 G42 | 1.434 · P72 C192 G42 |

Los seis objetivos dan **el mismo plan** con embarazo (ese es el punto: el objetivo de composición corporal no gobierna un embarazo).

### Barrido y CONTROLES
- **Con embarazo:** 7.200 combinaciones (12 pesos 40-110 kg × 4 estaturas × 5 edades × 5 factores de actividad × 6 objetivos). `kcal ÷ gasto` entre **1,050 y 1,127**; **solo 2 de 1.200 pasan de 1,10** (110 kg, 150 cm, sedentaria: el piso de carbohidrato de 2,0 g/kg las sube). **0 violaciones** del piso (kcal ≥ gasto en todas).
- **CONTROL sin embarazo:** los mismos 7.200 con nota vacía → JSON idéntico al original, **7.200 de 7.200**. Más 120 de 120 con notas «», «situación embarazosa», «tengo una hernia» y «mi esposa está xx». El número NO cambia.
- **Plato (lo que de verdad se come):** 378 días-plato (18 perfiles × 7 días × 3 tipos de día). Entrega ÷ objetivo del día: **0,893 – 1,089**. Entrega ÷ gasto: **0,937 – 1,144**; **12 de 378 (3,2 %) quedan por debajo del gasto, el peor −6,3 %**. Es el mismo defecto de menores y el 1,05 no lo cubre al 100 %; lo dejo así por coherencia con el precedente y porque el plan escrito del coach puede ir por encima, pero queda dicho.

### El rótulo (texto de la etiqueta de la calculadora y de la cabecera del coach)
`NUT_EMB_LABEL`:
> «Mantenimiento: por lo que escribiste sobre tu embarazo, tu plan no baja de lo que gastas. Cuánto más necesitas lo define tu médico, obstetra o nutricionista.»

(Sin «déficit», sin «seguro», sin plazos, sin «no te preocupes».) Cambiar el número y dejar el rótulo viejo sería el defecto de v437: por eso con embarazo el rótulo NUNCA cae en «Mínimo seguro para tu cuerpo…» (hoy es lo que dice a una embarazada con 1.693).

### Plan escrito por el coach (la otra puerta)
Misma mecánica que menores, medida: plan de 1.800 kcal con P150 C150 G60 (suma 1.740) a esa misma mujer → **sirve 2.250 (P150 C237 G78)**, mismo reparto escalado (factor 1,293), `embFloor` presente. Plan de +330 (2.470 kcal, P130 C330 G70) → **no se toca** (2.470 = 2.470, macros idénticos). Control sin embarazo: 5 de 5 planes idénticos al original.
**Embarazada menor de edad** (16 años, 58 kg): 2.392 kcal (×1,051), proteína 93 g (1,6 g/kg), etiqueta de embarazo; las dos reglas coexisten porque el orden es embarazo → techo de menores → piso de menores. 🟡 Un embarazo adolescente suma el crecimiento: lo que le toca lo dicta quien atiende el embarazo; mi regla solo garantiza que no baja.

---

## N2 · Proteína, carbohidrato, grasa y agua con embarazo  (CERRADA)

### Veredicto: 🟡 **CAMBIAN LOS CUATRO, y el peso con el que se dosifica también**

> 🔒 **REGLA E2.** Con embarazo (mujer):
> - **Peso de dosificación = el peso REAL de báscula, SIN la rampa de IMC** (`nutRefWeight` no se usa).
> - **Proteína** = `1,6 g/kg`, con **tope de 20 % de las kcal** y **piso de 1,1 g/kg**.
> - **Grasa** = `0,9 g/kg` (sin cambio de dosis; sobre peso real).
> - **Carbohidrato** = lo que resta, con **piso de max(175 g; 2,0 g/kg)**.
> - **Agua** = `35 ml/kg` con **piso de 9 vasos de 250 ml (2,25 L)**, en las TRES rutas donde hoy se calcula (ver N6).
> - **Sin ciclado de carbohidrato por tipo de día** (el día de descanso baja 8-15 % y rompería el piso de 175 g).

### De dónde sale cada cifra (🟡 todas de memoria; las verifica un nutricionista)
| Cifra | Fuente (de memoria) | Por qué esa y no la mía de siempre |
|---|---|---|
| Proteína **1,6 g/kg** | RDA del IOM (2005) para embarazo: **1,1 g/kg** (o 71 g/día); estudios de oxidación de aminoácido indicador (Elango, Ball y colaboradores) la ubican en ~1,2 g/kg al inicio y ~1,5 g/kg al final | Mi doctrina (2,2 g/kg) existe para **conservar músculo en un déficit**. Sin déficit, la razón desaparece. 1,6 es el borde inferior de mi banda de mantenimiento (1,6-2,0) y queda por encima de la estimación más alta de la literatura que recuerdo |
| Tope **20 % de las kcal** | La revisión Cochrane de suplementos **hiperproteicos** (≥25 % de la energía) en embarazo no mostró beneficio y sugirió más recién nacidos pequeños para la edad gestacional (Kramer y Kakuma) | Es evidencia vieja y sobre SUPLEMENTOS, no sobre comida; pero no hay razón para estar cerca de ese borde. 20 % deja margen. El piso 1,1 g/kg evita que el tope deje corta a una mujer de peso alto |
| Carbohidrato **175 g** | RDA del IOM (2005) en embarazo: 175 g/día | Hoy el piso es `2,0 g/kg` del peso de referencia: para 68 kg son **136 g, por DEBAJO de 175** (es lo que recibe hoy una embarazada con «Perder grasa»). Con el piso nuevo, 0 casos <175 en los 7.200 |
| Agua **9 vasos** | IOM (2004): ingesta adecuada de agua total 3,0 L/día en embarazo, ~2,3 L en bebidas | Hoy 52 kg dan **7 vasos (1,75 L)**; con piso: 9. Máximo de la grilla: 15 |
| Grasa 0,9 g/kg | Sin cambio (≥0,8 de mi doctrina; DHA/omega-3 lo dicta quien atiende el embarazo) | En peso real: 90 kg dan 81 g (30 % de las kcal, dentro del 20-35 % general) |

### ¿Sobre qué peso? (la pregunta del briefing)
**El real, sin rampa.** La rampa de `nutRefWeight` (IMC 28-32) existe para el EXCESO DE GRASA: el peso que sube en un embarazo (feto, placenta, útero, volumen de sangre, líquido) casi no lo es, y calcular el IMC con ese peso la mete a la rampa y le BAJA los macros justo cuando más pesa el embarazo. **Medido** (68 → 90 kg, 162 cm, «Perder grasa»):

| Peso | IMC | Peso de referencia hoy | Proteína ANTES (rampa, 2,2) | Proteína DESPUÉS (real, 1,6 con tope 20 %) |
|---|---|---|---|---|
| 68 | 25,9 | 68 | 150 | **109** (1,60 g/kg) |
| 76 | 29,0 | 73 | 161 | 119 (1,57) |
| 80 | 30,5 | 70,2 | 154 | 122 (1,52) |
| 85 | 32,4 | **65,5** | **144** | 126 (1,48) |
| 90 | 34,3 | 66,8 | 147 | 130 (1,44) |

ANTES la proteína **bajaba** de 161 a 144 g mientras la mujer subía 9 kg; DESPUÉS sube de forma continua y cede solo por el tope de 20 %. (Si usara 1,6 g/kg sobre la rampa daría 105 g a 85 kg, es decir, menos que a 68: por eso peso real.)

### Barrido y controles (los mismos 7.200 de N1)
Con embarazo: proteína **1,10 a 1,60 g/kg**, **10,5 a 21,5 %** de las kcal; carbohidrato **mínimo 175 g** en todos; agua **9 a 15 vasos**. Control sin embarazo: idéntico al original en los 7.200.
**Carbohidrato entregado en el plato:** de los 378 días-plato, **0 días por debajo de 175 g** (por eso el ciclado va apagado: con ciclado, un plan que esté justo en el piso de 175 g y entrene 6 días a la semana (2 de pierna) dejaría su día de descanso en ~148 g, calculado con `NUT_DAY_W`; el descanso baja 8,5 % con 3 días de entreno y 15,6 % con 6).
**Qué NO recomiendo con embarazo:** ningún suplemento deportivo (creatina, cafeína en dosis, pre-entrenos, quemadores). Ácido fólico, hierro, yodo, DHA: los indica quien atiende el embarazo; **no es mi competencia** y la app no los menciona.

---

## N3 · Postparto y lactancia  (CERRADA, condicionada a lo que Laura YA cerró)

Laura cerró `laura-postparto.md` mientras yo medía (lo leí en lo que toca: P1 a P5). Lo que dejó es esto, y de ahí depende mi regla:
- «lactancia» entra a `core_central` **como señal de postparto**, dentro de `GEN_POSTPARTO_RE` (las líneas de `lactanc|lactand|amamant|lactante` y «le doy pecho»). Banderas nuevas booleanas: `postparto`, `perdida`, `fin` (el embarazo terminó). **NO hay bandera `lactancia`**, y ella misma escribió: *«la app NO ajusta la comida a la lactancia: consúltalo con nutrición»*. O sea, hoy la app no podría distinguir a la que da leche de la que no.
- Pérdida del embarazo: `core_central` sola + `perdida`, y una lista de **frases prohibidas para esa persona** (no nombrar lo ocurrido, no plazos, no metas de cuerpo o peso, no «es normal», «seguro»…). Mis textos para esa persona las cumplen (revisé las 9).

### 🔒 Lo que le pido a Laura (una línea; es suyo decidirlo)
Una bandera booleana más, **`lim.lactancia`**, sacada de las DOS últimas líneas de `GEN_POSTPARTO_RE` (`lactanc|lactand|amamant|lactante` y «dar el pecho al bebé»), sin tocar `keys`, `zones` ni `hasExclusions`, igual que `postparto`. Es la única forma de que la comida distinga. **Sin esa bandera** aplico lo de la tercera fila.

### Mi regla, según lo que Laura decida (mujer; `embarazo` gana a todo; si hay dos, el piso mayor)

| Lo que lee la app | Qué hago con la comida |
|---|---|
| `embarazo` | Reglas E1 y E2 (arriba) |
| **`lactancia`** (si Laura agrega la bandera) | 🔒 **REGLA L:** objetivo = `max(gasto × 1,05; 1.800 kcal)` para los seis objetivos (nunca déficit, nunca superávit libre); proteína 1,6 g/kg (tope 20 %, piso 1,1); carbohidrato piso `max(210 g; 2,0 g/kg)`; **agua piso 12 vasos** (3,0 L); sin ciclado; sin tarjeta «peso hacia el objetivo», sin grasa estimada y sin bandera de cintura (como en N4) |
| **`postparto` / `perdida` / `fin` sin `lactancia`** (o sin la bandera nueva) | 🔒 **REGLA P:** el déficit **no pasa de −300 kcal** (hoy «Perder grasa» es −500); los demás objetivos y todos los macros quedan IGUAL; sin tarjeta de peso, sin grasa estimada y sin bandera de cintura. Aviso al coach T-P2 pidiéndole la fecha del parto |
| Nada de lo anterior | Nada cambia |

### De dónde sale (🟡 de memoria; lo valida un nutricionista u obstetra)
- **Energía de la lactancia:** el IOM (DRI 2002-2005) suma ~+330 kcal en el primer semestre y ~+400 en el segundo sobre el requerimiento (cuenta ~500 de producción de leche menos ~170 que salen de la reserva de grasa materna).
- **Proteína:** RDA del IOM en lactancia 1,3 g/kg (~71 g/día). **Carbohidrato:** RDA 210 g/día. **Agua:** ingesta adecuada de agua total ~3,8 L, ~3,1 L en bebidas (12 vasos).
- **Piso de 1.800 kcal:** circula en guías de lactancia de EE. UU. (1.500-1.800, con discusión); **elijo el extremo alto porque la app no sabe en qué mes va**. Es un candado de prudencia mío, no una cifra que pueda citar con página.
- **Pérdida de peso compatible con lactar:** la literatura que recuerdo (Dewey, Lovelady) acepta ~0,5 kg/semana pasadas las primeras semanas, sin afectar la leche. Mi número deja a una lactante ~**225 kcal por debajo** del requerimiento del IOM (2.249 contra 2.472 en la mujer de 68 kg), ≈ 0,2 kg/semana: **dentro de eso**. Si no quiere bajar nada, el coach escribe el plan con +330; sigue sin techo.
- **−300 en postparto sin lactancia:** NO tengo una guía que citar. Es el extremo bajo de mi corte moderado (−300 a −500) porque la app **no sabe cuántas semanas** pasaron desde el parto; mi criterio es que mientras su médico no la dé de alta la pérdida de grasa no se empuja. Es un 🟡 de criterio, no un hecho.

### Cifras (calculadora; ANTES = hoy)
| Persona (gasto) | Objetivo | ANTES | REGLA L | REGLA P |
|---|---|---|---|---|
| 30 a · 68 kg · af 1,55 (2.142) | Perder grasa | 1.693 · P150 | 2.249 · P109 C316 G61 · agua 12 | **1.842** (−300; P150 igual) |
| | Ganar músculo | 2.492 | 2.249 | 2.492 (sin cambio) |
| 30 a · 68 kg · af 1,2 (1.658) | Perder grasa | 1.693 | **1.801** (piso 1.800) · P90 C223 | 1.693 (sin cambio: ya está en el piso fisiológico) |
| 25 a · 52 kg · af 1,375 (1.697) | Perder grasa | **1.295** (−402) | 1.799 · P83 C261 G47 | **1.397** (−300) |
| 35 a · 90 kg · IMC 34 (2.444) | Perder grasa | 1.944 (−500) | 2.565 · P128 C331 G81 | **2.144** (−300) |

Controles: «Ganar músculo» y «Salud general» con regla P quedan idénticos; sin ninguna bandera, idénticos al original. ⚠️ Estas cifras de L y P las calculé con una réplica sencilla de la cuenta, **no con el motor completo** (a diferencia de N1 y N2): hay que re-medirlas con el código real cuando se programe.

### Textos para esas personas (no nombran nada; cumplen la lista prohibida de Laura)
- **Rótulo con regla L** (calculadora): «Mantenimiento: por lo que escribiste, tu plan no baja de lo que gastas. Cuánto más necesitas lo define tu médico o nutricionista.»
- **Rótulo con regla P**, solo cuando el tope de −300 actuó: «Tu plan avanza con calma: no baja más de 300 kcal de lo que gastas. Si quieres cambiarlo, lo define tu médico o nutricionista.»
- **T-P2, aviso al coach (postparto, pérdida, fin):** «El plan de comida no baja más de 300 kcal de lo que gasta. La app no sabe hace cuánto fue ni si está lactando: pregúntale, y que su médico o nutricionista le dé el número si quiere más déficit. No le hables de peso ni de cuerpo si ella no lo trae.» (La última frase protege a la persona que tuvo una pérdida; el resto sirve para todas.) Con `perdida` el aviso no cita la nota (punto 9 de Laura, que comparto).

---

## N4 · El peso durante el embarazo  (CERRADA)

### Veredicto: 🔴 **SÍ: una tarjeta le aplaude el kilo que sube o el que baja, y otras cinco cosas le hablan de su cuerpo**
Revisé cada lugar donde el peso, la cintura o la grasa se convierten en un mensaje (`bwLive`, `_coachPesoDe`, `nutWeightFor`, `coachInsight`, `bodyFatEstimate`, `waistFlag`, `getGoalMsg`, valoración del coach, recordatorio de medidas). **No existe «meta de peso» ni «meta de %» en el código** (busqué: nada), así que no hay nada que apagar ahí; la regla de Valery se cumple.

### Lo que hay que APAGAR o REESCRIBIR con embarazo (mujer + nota)

| # | Dónde | Qué dice hoy | Por qué hace daño | Acción |
|---|---|---|---|---|
| 1 | 🔴 `coachInsight`, candidato 7 «peso hacia el objetivo» (`avi-core.js:11234-11257`) | «**Vas en la dirección de tu objetivo.** N kg en las últimas semanas, paso a paso y sin afán. Así se hace.» | Sale **solo, a la persona**. Con objetivo «Ganar músculo» **aplaude el peso que sube del embarazo como si fuera músculo**; con «Perder grasa» **aplaude el peso que BAJA** (náuseas, un primer trimestre difícil) con «Así se hace» | **APAGAR** (ni al alza ni a la baja). Control: la misma persona sin embarazo SÍ lo recibe |
| 2 | `bodyFatEstimate` (`avi-core.js:6373`, método de la Marina: cintura + cadera − cuello) y sus pantallas (`app-5-salud.js:1238`, `app-3-coach.js:2918-2935`) | «Tu grasa corporal estimada: N %», franja, **flecha de cambio** y **bandera** «Este cambio es más grande de lo que este método suele medir bien… cuéntale a tu coach cómo te has sentido… con el ánimo» | Cintura y cadera crecen por el útero: la fórmula lee «grasa» donde hay embarazo, y el cambio entre tomas dispara la bandera con un texto que sugiere un problema emocional | Devolver `{ok:false, razon:'embarazo'}` (precedente: `'menor'`). **Persona: silencio**. Coach: el casillero dice «No se estima durante el embarazo» |
| 3 | `waistFlag` (`avi-core.js:6460`) y su aviso (`app-5-salud.js:1312`) | «Tu cintura está en un rango que vale la pena revisar con un profesional de la salud…» (≥ 88 cm en mujer) | Una cintura de 88 cm en un embarazo no es riesgo cardiometabólico | Devolver `null` con embarazo |
| 4 | Valoración del coach: tarjetas «Cintura/Talla» con etiqueta de riesgo en color y «Cintura/Cadera» (`app-3-coach.js:2866-2867, 2904-2910`) y **`getGoalMsg`** (`app-3-coach.js:2980`, `avi-core.js:7723`) | «📉 … Reducir 10 % de cintura tiene impacto real en tu salud» / «Cada cm menos en cintura importa más que los kilos» | Mismo motivo, y el coach lo lee como indicación | Sin las dos tarjetas de riesgo y con el mensaje T6 (N5) |
| 5 | Recordatorio «📏 Toca volver a medirte» (`app-5-salud.js:1163-1198`) y la tabla de cambio de cintura/cadera (`app-5-salud.js:1343`, hoy `sinInterpretar` solo para menores) | Pide medirse cada 8 semanas y muestra ▲/▼ cm | Le pide medir justo lo que crece, y lo interpreta | No sale la tarjeta; cintura y cadera se **guardan pero no se interpretan** (patrón de menores) |
| 6 | La explicación del plan (`GOAL_WHY`) y las fichas `NUTRI_INFO.kcal` / `prot` (`app-5-salud.js:290, 294, 310-330`) | «Comes algo menos de lo que gastas (déficit)… cuando estás bajando de peso» | Es lo que lee ella encima de su plan | Clave nueva `embarazo` (T2 y T8, N5). **Sin esa entrada la pantalla se queda muda** (el bloque `if(d.why)` no pinta nada) |

### Lo que DEJO como está, y por qué
- **El recálculo con cada pesada** (`nutWeightFor`, `_nutPesoDe`, `_coachPesoDe`, v448): con mi regla es benigno. El plan ya no persigue un déficit: acompaña el gasto, que sube con el peso (medido: +264 kcal de 68 a 85 kg). Pesarse mueve el plan **hacia arriba**, no hacia un recorte.
- **La gráfica de peso y su resumen «↑ N kg»** (`app-4-entreno.js:350-366`): neutros desde v668 (sin color por dirección, sin juicio).
- **El aviso de peso viejo >60 días** del coach (`app-3-coach.js:2999-3022`): neutro.
- **`bodyLoadProfile`** (`avi-core.js:2421`): el peso gestacional puede cruzar IMC 30 y subir el perfil a `high` (máquinas, sin pliométricos). La dirección es conservadora y coincide con lo que Laura ya quitó; **se lo señalo a ella, no lo toco**.
- **El «estancamiento»** es de EJERCICIOS (v433), no de peso: no aplica.
- **El pill «🎯 Perder grasa»** (`app-4-entreno.js:524`, `app-3-coach.js:2947`) es el dato que ELLA eligió; no lo borro. El rótulo del plan lo contradice con claridad y el aviso al coach explica por qué.
- **Cuánto debe subir:** el IOM (2009) da rangos por IMC previo (🟡 de memoria, no cito cifra): **la app no los usa ni los muestra**; eso es de quien atiende el embarazo.
- **Lo mismo para `postparto`, `perdida` y `fin`** (Laura, «ni hables de peso o del cuerpo»): las filas 1, 2, 3 y 5 de la tabla se aplican también a esas banderas. La fila 4 y la 6 no.

---

## N5 · Los textos  (CERRADA)

Reglas que cumplen todos (las de Laura y las de v424): dicen qué se hizo, **jamás que lo que queda sea seguro**; sin plazos; sin «no te preocupes», «es normal», «seguro», «sin riesgo»; sin diagnosticar; remiten a médico, obstetra o nutricionista; la persona lee «embarazo» porque ella misma lo escribió. 🟡 **Un obstetra o nutricionista debe leerlos antes de publicar.** Mi competencia es la cifra, no la clínica.

**T1 · Rótulo de la calculadora y de la cabecera (`NUT_EMB_LABEL`)** — reemplaza a «Mínimo seguro para tu cuerpo…» y a «Superávit de 350 kcal/día»:
> «Mantenimiento: por lo que escribiste sobre tu embarazo, tu plan no baja de lo que gastas. Cuánto más necesitas lo define tu médico, obstetra o nutricionista.»

**T2 · «¿Por qué este plan?» que lee ella (`GOAL_WHY.embarazo`)**
> Título: «🤰 Embarazo / Tu plan no baja de lo que gastas»
> Texto: «Escribiste algo sobre tu embarazo, así que este plan no busca que bajes de peso ni que cambies tu cuerpo: comes lo que gastas, con proteína, carbohidratos y agua suficientes para sostener tu energía. No sabemos en qué semana vas, así que este número es un punto de partida y no una indicación para tu embarazo. Cuánto necesitas comer, y qué pasa con tu peso durante el embarazo, lo define tu médico, tu obstetra o un nutricionista: antes de seguirlo, pide su visto bueno. Si algo no te cuadra, no lo sigas y avísale a tu coach.»

**T3 · Nota bajo el plan de ella cuando el piso subió el número del coach (`embFloor`)** — gemela de la de menores (`app-5-salud.js:700-701`):
> «Por lo que escribiste sobre tu embarazo, tu plan nunca baja de la energía que tu cuerpo gasta en el día. Por eso puede que veas un número más alto del que esperabas: tu entrenador lo sabe. Antes de seguirlo, pide el visto bueno de tu médico, obstetra o nutricionista.»

**T4 · Aviso al COACH en el editor de Nutrición (`nutGoalCheck`) cuando el piso actuó**
> «🔒 {Nombre} escribió algo sobre un embarazo y este plan queda por debajo de lo que gasta ({antes} contra ~{gasto} kcal). Con embarazo la app no sirve déficit, así que le va a servir {kcal} kcal (P{p} C{c} G{g}), con el mismo reparto que tú elegiste. La app no sabe en qué semana va: si su médico u obstetra le indicó más energía, escríbela tú por encima de ese piso. Si el embarazo ya terminó, no borres la frase de la nota: cámbiala por «postparto» o lo que corresponda.»

Más, cuando `embAvisos` los trae (mismo recuadro, una línea cada uno):
> `carb_bajo`: «Su plan trae menos de 175 g de carbohidrato al día; con embarazo la referencia que conozco es de 175 g como mínimo (de memoria): confírmalo con su nutricionista.»
> `prot_alta`: «Su proteína pasa del 25 % de las calorías; con embarazo no la dejaría ahí sin el visto bueno de su nutricionista u obstetra.»

**T5 · Tarjeta del coach en la ficha (`nutPlanReview` nuevo estado `embarazo_bajo_gasto`)**
> Título: «{Nombre} escribió algo sobre un embarazo y su plan queda bajo su gasto»
> Cuerpo: «Su plan dice **{actual} kcal** y gasta **{gasto}**. Con embarazo no se sirve déficit, así que la app le está sirviendo **{sirve} kcal** con el mismo reparto que tú elegiste. La app no sabe en qué semana va ni si tiene una condición que cambie esto (diabetes, hipertensión, embarazo múltiple…): pregúntaselo y que su médico u obstetra firme el número. Si quieres otro, escríbelo tú en **Nutrición**.»

**T6 · Cabecera de la valoración del coach (reemplaza a `getGoalMsg`)**
> «🤰 Menciona un embarazo. Su plan no busca bajar de peso ni subir músculo, y la app no interpreta cintura, cadera ni grasa estimada. Pregúntale la semana, si tiene el visto bueno de su médico u obstetra y si hay una condición (diabetes, hipertensión, embarazo múltiple).» Y el título del tablero pasa de «OBJETIVO: PERDER GRASA» a «OBJETIVO: EMBARAZO» (`app-3-coach.js:2947`).

**T7 · Casillero «Grasa estim.» del coach:** «No se estima durante el embarazo» (precedente: «No se estima en menores de edad»).

**T8 · Fichas `NUTRI_INFO` con embarazo (opcional, recomendado)**
> `kcal.why`: «Es la energía que tu cuerpo gasta en el día con tu entrenamiento, y tu plan no baja de ahí. Cuánto más necesitas durante el embarazo lo define tu médico, tu obstetra o un nutricionista.»
> `prot.why`: «Ayuda a que tu cuerpo mantenga y repare el músculo. Tu plan la ajusta a tu peso y no se pasa; si tu médico u obstetra te indica otra cantidad, esa es la que vale.»

**T9 · Plantilla del editor (`NUT_TEMPLATES`, objetivo `embarazo`)** — sin ella `_nutSwapTemplateText('embarazo')` no hace nada y la pantalla de ella conserva el texto de «Definición» o «Cutting» («Déficit moderado…») que había en el editor:
> plan: «Mantenimiento calórico con proteína moderada, carbohidratos suficientes y agua. Sin déficit. No es un plan de embarazo: tu médico, obstetra o nutricionista define cuánto más necesitas.»
> examples: «Desayuno: Huevos cocidos, arepa y fruta · Almuerzo: Proteína cocida, carbohidrato y vegetales · Merienda: Yogur y fruta · Cena: Proteína cocida con verduras y un carbohidrato»
> avoid: «Lo que tu médico u obstetra te haya pedido evitar.»

🟡 «Cocidos/cocida» en T9 es un criterio de inocuidad que dejo a quien atiende el embarazo; **no escribo listas de alimentos prohibidos** (crudos, lácteos sin pasteurizar, pescados con mercurio, alcohol, cafeína): no es mi competencia y inventarlas sería inventar una guía.

**El falso positivo de la MUJER que ya no está embarazada** («tuve un embarazo hace 3 años»): lo cubren, en este orden, T1 (dice «por lo que escribiste»), el aviso T4/T5 (que manda al coach a cambiar la frase) y la vigencia de 90 días de Laura (v728). Pesa más en nutrición que en el entreno (un plan de 1.693 pasa a 2.249 hasta que alguien lo corrija); lo dejo dicho para que Laura valore pedir que `GEN_EMBARAZO_RE` no dispare con «tuve un embarazo» + tiempo en pasado.

---

## N6 · Las superficies  (CERRADA)

### Veredicto: 🔴 **Mi regla, puesta donde está la de menores, llega a las cifras de TODAS las superficies de cálculo. Pero hay 5 que se escapan en TEXTO o en una cuenta paralela, y las nombro**

**La medición.** Misma persona (30 a, 68 kg, 162 cm, af 1,55, nota «estoy embarazada», «Perder grasa») por las dos puertas: `nutritionEstimate` → **2.249 kcal · P109 C316 G61**; `nutBaseFor(c, null)` → **2.249 · P109 C316 G61**. **Iguales** (kcal y macros), y las dos traen `embarazo:true`. Las mismas dos puertas con 12 personas × 6 objetivos dan lo mismo (candado 4). El lugar es `nutMinorBandBase`, que ambas llaman: `embarazo → techo de menores → piso de menores`.

| # | Superficie | Cómo llega | Cifra | Qué se escapa |
|---|---|---|---|---|
| 1 | Habitación de Nutrición, plan escrito (`app-5-salud.js:640`) | `nutBaseFor` | ✅ medido: plan 1.740 → sirve 2.250 | 🔴 `d` solo copia `minorFloor`/`minorCap` (líneas 640 y 652): hay que copiar también `embarazo`/`embFloor`/`embAvisos` y pintar T3 junto a la nota de menores (700-701) |
| 2 | Habitación de Nutrición, estimación (`:652`) | `nutritionEstimate` | ✅ 2.249 | Lo mismo; y `GOAL_WHY[...]` ya recibe `'embarazo'` (T2) |
| 3 | Calculadora del Perfil (`:383`) | `nutritionEstimate` | ✅ 2.249 · agua 10 | — |
| 4 | Prefill «✨ Generar» (`:86`) | `nutritionEstimate` | ✅ | 🔴 `nutGoalForClient` ahora devuelve `'embarazo'` y el `<select id="nut-goal">` **no tiene esa opción** (queda vacío) y `NUT_TEMPLATES` tampoco (T9): el plan nuevo se guardaría con el texto de la plantilla anterior |
| 5 | Oráculo del editor (`nutGoalCheck`, `:141`) | `nutritionEstimate` + `nutBaseFor` | ✅ | 🔴 con embarazo `nutGoalMismatch` devuelve `null` (no hay rótulo legible) y **ninguna de las dos ramas** de la nota (`minorFloor`/`minorCap`) se cumple: el coach edita un déficit para una embarazada **sin ningún aviso**. Falta la rama T4 |
| 6 | Compartir por WhatsApp (`:825-875`) | `nutBaseFor` / `nutritionEstimate` | ✅ | — (cifras y agua heredan) |
| 7 | Cabecera de la valoración del coach (`app-3-coach.js:2879`) | `nutritionEstimate` | ✅ número y rótulo | 🔴 el título dice «OBJETIVO: PERDER GRASA», `getGoalMsg` habla de cintura y reducir, y las tarjetas RCT/ICC pintan riesgo (N4, filas 4): T6 |
| 8 | El plato, «Hoy» y la lista del mercado | `nutBaseFor` → `nutDayPlan` / `nutWeekTargets` / `nutShoppingList` | ✅ 378 días-plato medidos: el objetivo del día es SIEMPRE el kcal base (sin ciclado) | — |
| 9 | Revisión del coach en la ficha (`nutPlanReview`, `app-3-coach.js:3201`) | `nutritionEstimate` + `nutBaseFor` + `nutProtCheck` | Medido ANTES: un plan de **1.740 kcal para una embarazada daba `ok`**; uno de **2.470 daba `desviado` con riesgo «come de más para bajar»** (tarjeta roja). DESPUÉS: `embarazo_bajo_gasto` y `ok` | 🔴 hay que escribir la rama de la tarjeta (T5), y `_banda` en `:3185` debe incluir `embFloor` o la tarjeta de «desfase» habla antes |
| 10 | Dosis de proteína (`nutProtCheck`) | doctrina por objetivo | ANTES: 109 g (1,6 g/kg) = «**corta**, le corresponden 150»; DESPUÉS: sin aviso; 150 g (27 % de las kcal) = «pasada» | La doctrina y el peso de dosificación se cambiaron dentro de la función |
| 11 | **Agua del hábito** (`_waterGoalFor`, `app-5-salud.js:2033`; `coachInsight` `avi-core.js:11262`) | `waterGoalGlasses(client.weight)`, **cuenta paralela** | ANTES y DESPUÉS: 52 kg → **7 vasos** (la estimación del plan dice 9) | 🔴 **No pasa por `nutritionEstimate`.** Hay que llamar a `waterGoalFor(client, nut)` (que sí cubro: 7 → 9) en `_waterGoalFor` |
| 12 | Adherencia de agua del coach (`app-3-coach.js:3547`) | `waterGoalFor` | ✅ 9 | — |

### Resultado de los CONTROLES de N6
- Sin embarazo, **idéntico al original**: `nutBaseFor` con 5 planes distintos (5 de 5), `nutDayTarget` (el día de descanso sigue ciclando: 1.645 contra 2.249 plano con embarazo), `nutGoalForClient`/`nutWhyKey` (siguen `cutting`), `nutProtCheck`, `waterGoalFor`.
- Hombre con «mi esposa está embarazada»: 2.225 = 2.225.
- Sin sexo declarado: `nutritionEstimate` → `null` (como hoy); `nutBaseFor` con plan escrito marca `embFloorUnknown` (como `minorFloorUnknown`: un candado que falla mudo no es un candado).

---

## Qué NO miré y por qué
- **Ninguna guía abierta.** IOM/DRI 2002-2005 y 2009, ACOG, OMS, Cochrane (Kramer y Kakuma), Elango/Ball, Dewey/Lovelady: **todo de memoria**, marcado 🟡. No hay red en este encargo. Antes de publicar cualquier cifra del 2.º-3.er trimestre o de la lactancia, que la lea un nutricionista u obstetra.
- **Diabetes gestacional, hipertensión del embarazo, hiperemesis, embarazo múltiple, peso previo bajo o con obesidad.** Cambian la energía, el carbohidrato y la proteína, y **no son de mi competencia**: la app no los lee. Por eso mi regla nunca baja de un piso y nunca fija un techo al plan del coach, y T5 los nombra para que se pregunten.
- **Qué alimentos conviene evitar** (crudos, mercurio, pasteurización, alcohol, cafeína), **suplementos** (ácido fólico, hierro, yodo, DHA) y **si el entreno es apto**: de quien atiende el embarazo (y de Laura en lo musculoesquelético).
- **El peso previo al embarazo.** La app no lo sabe (la ficha puede ser anterior, pero no hay forma de afirmarlo): no uso los rangos de aumento del IOM.
- **Las cifras de N3 (L y P)** están calculadas con una réplica de la cuenta, no con el motor completo; N1, N2, N4 y N6 sí vienen del `avi-core.js` real.
- **El generador de RUTINAS con objetivo «Perder grasa»** (más cardio, descansos cortos) en una embarazada: es de Laura y de Coach Pro/Valery; Laura ya quitó HIIT, bici de asalto y el resto. No lo audité.
- **Los textos de `index.html` y de las Edge Functions** (`daily-notifs`: busqué «peso/kg» y no hay; la pregunta del agua/pasos no calcula metas). **El compartir como imagen** (tarjetas): no lo abrí.
- **Datos reales de la base:** no consulté Supabase ni backups (regla del encargo). Cuántas asesoradas tienen hoy la palabra «embarazo» en la nota: **sin medir**. Las 7.200 combinaciones son sintéticas; los controles son sobre esas mismas.
- **El plato por trimestre:** no medí si el banco de menús tiene combinaciones inadecuadas para el embarazo (no es mi competencia).

---

## Candados que exijo en la suite (antes de programar; ninguno es opcional)

Cada uno con su CONTROL (sin embarazo no cambia) y su sabotaje. Las constantes se fijan con sus valores: `NUT_EMB_PISO_MARGEN` 1,05 · `NUT_EMB_PROT_G_KG` 1,6 · `NUT_EMB_PROT_MIN_G_KG` 1,1 · `NUT_EMB_PROT_MAX_SHARE` 0,20 · `NUT_EMB_PROT_WARN_SHARE` 0,25 · `NUT_EMB_FAT_G_KG` 0,9 · `NUT_EMB_CARB_MIN_G` 175 · `NUT_EMB_WATER_MIN` 9 (y, si Laura agrega la bandera: lactancia 1.800 kcal · 210 g · 12 vasos · y el tope de −300 de la regla P).

1. **Identidad sin embarazo.** Para ≥ 5.000 combinaciones (peso × talla × edad × actividad × los 6 objetivos) con nota vacía, «situación embarazosa», «tengo una hernia» y «mi esposa está embarazada» en un hombre: `nutritionEstimate`, `nutBaseFor` (con y sin plan), `nutPlanReview`, `nutProtCheck`, `nutDayTarget`, `nutGoalForClient`, `nutWhyKey` y `waterGoalFor` devuelven **JSON idéntico** al de antes del cambio (yo medí 7.200/7.200 y 120/120).
2. **El piso, con dosis y no solo con signo** (lección de v482): con embarazo, para toda la grilla, `kcalObj ≥ round(gasto × 1,05)` **exacto**, `kcalObj ≤ round(gasto × 1,13)`, `deficit ≥ 0` y los seis objetivos dan el mismo `kcalObj` y los mismos macros. Sabotaje: bajar el margen a 1,00 o quitar el `Math.round` debe romperlo.
3. **Macros.** Carbohidrato ≥ 175 g en toda la grilla; proteína entre 1,10 y 1,60 g/kg del peso REAL y ≤ 21,5 % de las kcal (si se rompe el tope de 20 %, falla); agua ≥ 9 vasos. Un sabotaje por piso (175 → 136; tope 20 % fuera; piso 1,1 fuera).
4. **Una sola cuenta.** 12 personas × 6 objetivos: `nutritionEstimate().kcalObj === nutBaseFor(c, null).kcalObj` y macros iguales. Y para un plan escrito de 1.740 kcal: `nutBaseFor` sirve ≥ piso con el reparto proporcional y `embFloor` presente; para un plan de 2.470: **idéntico** (sin techo).
5. **Idempotencia.** Pasar un plan dos veces por `nutMinorBandBase` no cambia el resultado ni pisa `embFloor.kcalAntes`.
6. **Peso real.** Para 68 → 90 kg (162 cm) la proteína con embarazo **no decrece** al subir el peso (hoy, con la rampa, baja de 161 a 144); `nutRefWeight` no se llama en la ruta de embarazo.
7. **Rótulo.** Con embarazo `nutGoalForClient`, `nutWhyKey` y `nutWhyKeyShown` devuelven `'embarazo'` y **nunca** `cutting`, `definicion`, `volumen` ni `recomposicion`; existen `GOAL_WHY.embarazo` y `NUT_TEMPLATES` con `goal:'embarazo'` y la opción del `<select>`; `nutGoalMismatch('embarazo', …)` es `null`.
8. **Textos** (T1 a T9, y los de N3): contienen «visto bueno» (T2, T3), «médico» y «obstetra»/«nutricionista»; **no** contienen «déficit», «bajar de peso» (salvo la negación de T2), «perder», «superávit», «seguro», «sin riesgo», «sin problema», «no te preocupes», «es normal», ni un plazo (se admite solo «en qué semana vas»); el texto de la persona con `perdida` no contiene «bebé», «embarazo», «parto», «aborto», «pérdida», «peso» ni «cuerpo».
9. **La revisión del coach.** `nutPlanReview` con embarazo **nunca** devuelve `desviado`, `riesgo` ni `rotulo_miente`; con un plan de 1.740 devuelve `embarazo_bajo_gasto` (hoy `ok`); con uno de 2.470, `ok` (hoy `desviado` rojo). `nutProtCheck`: 109 g sobre 68 kg **no** es `corta` (hoy lo es); 150 g (27 %) es `pasada`.
10. **Agua del hábito.** `_waterGoalFor` llama a `waterGoalFor` (candado estático sobre el fuente sin comentarios: no puede contener `waterGoalGlasses(client.weight)`); con embarazo y 52 kg la meta es ≥ 9, sin embarazo 7.
11. **Sin ciclado.** `nutDayTarget` con `base.embarazo` devuelve el mismo `kcal` y `carb_g` para `descanso`, `entreno` y `pierna`; sin embarazo el descanso sigue por debajo (control).
12. **Solo mujeres.** `sex !== 'F'` → nada cambia aunque la nota diga embarazo.
13. **Menor embarazada.** 16 años, 58 kg: `kcalObj / gasto` entre 1,05 y 1,10, sin déficit, etiqueta de embarazo, y las dos reglas coexisten (orden embarazo → techo → piso).
14. **El peso no se aplaude.** `coachInsight` con embarazo no devuelve nunca el candidato `peso`, con peso que sube y con peso que baja, para «Ganar músculo» y para «Perder grasa»; el CONTROL: la misma serie sin embarazo SÍ lo devuelve.
15. **El cuerpo no se interpreta.** `bodyFatEstimate` → `{ok:false, razon:'embarazo'}`; `waistFlag` → `null`; `_medGrasaHtml` y `_medCinturaFlagHtml` devuelven cadena vacía; la tarjeta «Toca volver a medirte» no sale; cintura y cadera quedan `sinInterpretar`; en la valoración no sale el mensaje de `getGoalMsg` ni las etiquetas de riesgo. Control con el mismo caso sin embarazo.
16. **Escapes de N6 cerrados.** `nutGoalCheck` produce la nota T4 (no queda en silencio) cuando `embFloor` actúa; la tarjeta de la ficha pinta T5; el objeto `d` de la habitación copia `embarazo`/`embFloor`; la cabecera dice «OBJETIVO: EMBARAZO». (Candados de DOM/estático; se comprueban con el harness del editor.)
17. **Sin lookbehind** en cualquier regex nueva (no escribí ninguna: la lectura del embarazo es de Laura).
18. **Mi candado de siempre:** si alguien toca `kcalTargetFor`, `nutKcalFloor`, `nutRefWeight`, `nutProtPerKg`, `calcMacrosFromKcal`, `nutMinorBandBase`, `NUT_DAY_W` o las constantes `NUT_EMB_*`, se vuelve a correr la grilla de 7.200 completa **y los controles**.
19. **Si Laura agrega `lim.lactancia`:** reglas L y P con los mismos candados 1 a 4 (identidad sin la bandera; piso `max(gasto×1,05; 1.800)`; el tope de −300 solo actúa con déficit < −300; «Ganar músculo» y «Salud general» no se mueven con la regla P).

*Andrés Bernal — Coach jefe de hipertrofia y nutrición. N1, N2, N4 y N6 se midieron con el `avi-core.js` real (v728) y mis reglas solo en memoria; N3 con una réplica; las citas externas son de memoria y van marcadas 🟡. Decide el PO: el 1,05 y el 20 % (míos), y que un nutricionista u obstetra lea T1 a T9 y las cifras de lactancia antes de publicar.*
