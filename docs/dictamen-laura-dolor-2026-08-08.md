# 🩺 DICTAMEN VINCULANTE — Laura Ospina, Fisioterapeuta Deportiva AVI
## Dolor reportado por el asesorado: triaje, parada, derivación y retorno

**Fecha:** 2026-08-08 · **Alcance:** todo lo que la app hace cuando alguien dice «me duele».
**Estado:** VINCULANTE en seguridad. Lo marcado 🔒 no se negocia; lo marcado 💡 es recomendación
suya y el PO decide.

> **Nota de Opus (quien implementa):** los hallazgos del §0 se verificaron uno a uno en el código
> antes de aceptar el dictamen — `PAIN_AREAS` (10 zonas, sin aductores/abductores/cuello),
> `generarRutinas` usando solo `parseLimitations(client.notes)`, y `renderPickerForTarget`
> (`app-2-login.js:545`) filtrando solo por músculo y entorno. Los tres son ciertos.
> Pedido del PO (2026-08-08): implementar el protocolo **completo**.

---

## §0 · LO QUE MEDÍ EN EL CÓDIGO ANTES DE OPINAR (y el hallazgo que cambia el encargo)

El PO pide «qué hacer cuando alguien reporta dolor». Antes de diseñarlo fui a ver qué pasa **hoy**
con un reporte de dolor ya existente. Enumeré **todas** las superficies por las que un ejercicio
llega a una persona — que es la lección de v424, la puerta cerrada con la ventana abierta:

| # | Superficie | ¿Mira `client.painCare` (el dolor que la persona reportó)? |
|---|---|---|
| 1 | `generarRutinas` — la rutina de la semana (`avi-core.js:875`) | ❌ **NO.** Solo `parseLimitations(client.notes)` = lo que escribió el **coach** |
| 2 | `buildWarmup` — calentamiento/movilidad (`app-6-extra.js:1851`) | ❌ **NO.** Mismo `limKeys` de las notas del coach |
| 3 | `todaySubstitute` → `renderPickerForTarget` (`app-2-login.js:542-545`) | ❌ **NO.** Filtra por **músculo y entorno**, nada más |
| 4 | `applyMood('dolor')` — el 🤕 del check-in (`avi-core.js:2530`) | ❌ **NO.** Quita **carga** de todo, no quita **ejercicios**, no toca el calentamiento y **no registra dónde duele** |
| 5 | `QUICK_WORKOUTS` — entrenamientos rápidos (`app-4-entreno.js:1171`) | ❌ **NO.** Listas fijas, cero filtro |
| 6 | Constructor manual del coach + plantillas (`openNewRoutineFromTemplate`) | ❌ **NO** para ejercicios. Solo el **calentamiento** se marca (`warmupWarnZones`, `app-3-coach.js:2209`) |
| 7 | `shockPlan` — plan de choque (`avi-core.js:4997-5000`) | ✅ **SÍ**: excluye zona y prohíbe el 5×5 |
| 8 | `deloadFloorReason` (`avi-core.js:4770`) | ✅ **SÍ**: bloquea la descarga con «dolor reciente» |

**🔴 Hallazgo P0 — el reporte de dolor no protege a nadie.** El único mapa que traduce zona de
dolor → exclusión (`_PAIN_ZONE_TO_EXCL`, `avi-core.js:4746`) se usa **exclusivamente** en la
propuesta que la app le hace al **coach** cuando alguien se estanca. La persona que reporta el
dolor **no está protegida en ninguna de las 6 superficies que ella misma toca**. Concretamente:

- Alguien marca 🔴 «zona lumbar · no puedo hacerlo». Mañana el generador le entrega Russian Twist
  (`e62`) y Crunch (`e18`), y el calentamiento le pide `we3` «Apertura de cadena posterior» — el
  mismo ejercicio que saqué en v424 por hernia. La zona lumbar tiene reglas
  (`GEN_ZONE_EXCL.lumbar`) **y no se aplican porque el dolor no viaja por ese camino**.
- **Peor, y es responsabilidad directa de un diseño nuestro:** `painSubmit`
  (`app-6-extra.js:392`), al recibir un nivel 🔴, **abre automáticamente el selector de
  sustitución** — que filtra **solo por el mismo músculo**. Es decir: la persona dice «no puedo
  hacer esta sentadilla, me duele la rodilla» y la app le ofrece, en orden, `e13` Sentadilla con
  Barra, `e33` Sentadilla en Smith, `e58` Sentadilla Hack. **La reacción de la app al dolor es
  ofrecer más de lo que duele.**
- El 🤕 del check-in de ánimo y el ⚠️ de reporte de dolor son **dos sistemas separados**: uno sabe
  *cuánto* pero no *dónde*, el otro sabe *dónde* pero no cambia nada. Los dos avisan al coach.
  Ninguno de los dos protege el calentamiento.

**🔒 INNEGOCIABLE #0: nada de lo que sigue vale si el dato de dolor no llega a las 6 superficies.**
Un triaje precioso encima de un motor ciego es peor que no tener triaje, porque le pone sello
clínico a algo que no lo tiene. Esto se arregla **primero**.

**Segundo hallazgo, del propio caso del PO:** él reportó dolor en **los abductores de la pierna
izquierda**. En `PAIN_AREAS` (`avi-core.js:1798`) **no existe esa zona** — ni aductores, ni
abductores, ni muslo, ni pantorrilla, ni cuello. Cae en «otra zona» → consejo genérico, cero
exclusión. Y **no hay lado**: izquierda/derecha no se pregunta, cuando es el dato que decide si el
trabajo unilateral sigue siendo posible.

---

## §1 · TRIAJE POR GRAVEDAD

### §1.1 Principio de diseño del cuestionario 🔒

1. **Nada de escalas 0-10.** Un 6 para uno es un 3 para otro. Todos los niveles se anclan a
   **conducta observable**: qué puede o no puede hacer ahora mismo.
2. **Cuatro preguntas, ninguna opcional, ninguna con «saltar».** `feeling` se registra en el 12%
   de las sesiones: si esto es opcional, no existe. Debe caber en **≤4 toques y ≤30 segundos**.
3. **El default es el lado seguro.** Si alguien abandona el flujo a mitad, el reporte se guarda con
   lo que alcanzó a marcar y se trata como **N2**, nunca como N1. Un reporte incompleto es una
   señal, no un silencio.
4. **La bandera roja gana siempre sobre la intensidad.** «Leve» + «se me duerme el pie» es **N4**,
   no N1. Se evalúa la bandera **antes** que el nivel.
5. **El flujo debe existir fuera del entreno.** Hoy `gmReportPain` solo se alcanza desde la tarjeta
   de un ejercicio dentro del guiado (`app-6-extra.js:524`). El dolor no espera a que uno esté
   entrenando — el caso del PO fue exactamente ese. 🔒 Debe existir entrada desde **«Hoy»**
   (también en día de descanso y sin rutina) y desde **«Perfil»**.

### §1.2 Las cuatro preguntas

**P1 · ¿Dónde te duele?** (chip obligatorio + **lado**: izquierda / derecha / ambos / centro)

🔒 La lista de zonas debe reemplazar la actual por esta, o el triaje no puede clasificar lo que la
gente realmente reporta:

`cuello` · `hombro` · `pecho` · `codo` · `muñeca o mano` · `espalda alta` · `zona lumbar` ·
`cadera o ingle` · `muslo por delante` · `muslo por detrás` · **`muslo por dentro (aductores)`** ·
**`cara externa del muslo o glúteo (abductores)`** · `rodilla` · `pantorrilla` · `tobillo o pie` ·
`otra zona`

**P2 · ¿Qué tanto te limita AHORA MISMO?** (una sola opción, redacción conductual, no numérica)

| | Texto exacto que ve el asesorado |
|---|---|
| 🟢 | «Lo siento, pero me muevo normal» |
| 🟡 | «Me hace cambiar la forma de moverme, o dejo de hacer cosas por él» |
| 🟠 | «No puedo cargar / apoyar / mover bien esa parte» |
| 🔴 | «Me duele hasta estando quieto» |

**P3 · ¿Cuándo empezó?** (una sola opción — separa agujetas de lesión, que es lo que más cuesta a
alguien sin formación)

- «Hoy o ayer, después de entrenar, y lo siento parejo en los dos lados»
- «De golpe, durante un ejercicio: un tirón, un pinchazo, algo que sonó»
- «Se fue apareciendo de a poquitos, entrenando»
- «Después de un golpe, una caída o un accidente»
- «Llevo más de dos semanas así»

**P4 · «Marca todo lo que te esté pasando»** (multi-selección obligatoria, con opción explícita
**«Nada de esto ✓»** — nunca se puede dejar en blanco). Es la lista cerrada del §2.

💡 P2+P3 se pueden preguntar en la misma pantalla; P4 va sola, sin nada más en pantalla, o la gente
la barre sin leer.

### §1.3 Los cinco niveles y qué hace la app en cada uno

#### **N0 — Agujetas (dolor muscular tardío)**

**Se clasifica así SOLO si se cumple todo:** P2 = 🟢 · P3 = «hoy o ayer después de entrenar, parejo
en los dos lados» · P4 = «nada de esto» · zona = vientre muscular (muslo, pantorrilla, pecho,
espalda alta, glúteo), **nunca** una articulación ni la zona lumbar.

**Qué hace la app:**
- ✅ **No para nada.** No abre protocolo, no manda alerta al coach, no marca la zona.
- Mensaje tranquilizador + «calienta un poco más hoy» + **carga sugerida al 70-80%** de lo
  previsto, solo en los ejercicios de esa zona.
- Lo registra como agujetas, no como dolor. **No entra en `painCare` como lesión**, no debe subir a
  esa persona al tier 0 del panel del coach.

**Por qué existe este nivel 🔒:** si la app declara protocolo de lesión por unas agujetas, la gente
aprende que reportar dolor es un fastidio y **deja de reportar**. El día que sea de verdad, no nos
vamos a enterar. Un triaje que sobre-reacciona es un triaje que se apaga solo.

#### **N1 — Molestia leve**

P2 = 🟢 sin cumplir N0 (un solo lado, o articular, o lleva días), y P4 limpia.

**Qué hace la app:**
- ✅ **La sesión sigue.**
- ❌ **Se para ESE ejercicio** y todos los del §3 marcados ❌ para esa zona — hoy y en las próximas
  sesiones hasta que se reevalúe.
- 🟡 El resto de la zona baja carga (**−30%**) y se queda **estrictamente en el rango que no duele**.
- 🔒 El calentamiento se filtra igual que el entreno (§3).
- 🔒 La sustitución que ofrece la app **debe excluir la zona**, no ofrecer la misma familia.
- Coach: **informativo**, sin urgencia. Aparece en su ficha.
- **Reevaluación automática al abrir la siguiente sesión**: «¿Cómo va ese hombro?» → mejor / igual /
  peor. **Dos reevaluaciones seguidas en «igual» o una en «peor» ⇒ sube a N2 solo.** Un dolor leve
  que no cede en 7 días deja de ser leve; hoy `painCare` simplemente **caduca a los 14 días en
  silencio** (`PAIN_TTL_MS`), que es exactamente al revés.

#### **N2 — Dolor que limita** 🔒

P2 = 🟡, **o** N1 que persiste ≥7 días, **o** N1 que empeoró, **o** P3 = «de golpe, un tirón, algo
sonó» aunque hoy se sienta poco.

**Qué hace la app:**
- ❌ **Se para la zona completa**: hoy y las siguientes sesiones. No solo el ejercicio — **la
  zona**, con la lista del §3, en entreno **y** calentamiento.
- ✅ La sesión **puede continuar** con las zonas que no comparten cadena (§3 dice cuáles por zona).
- ❌ Cero progresión de carga en todo el cuerpo mientras dure: nada de PR, nada de subir peso, nada
  de plan de choque, nada de descarga (esto último **ya funciona bien**, `deloadFloorReason`).
- ✅ Se ofrece el bloque de movilidad del §4 (`qw_movilidad` ya existe y sirve, **con el filtro de
  zona puesto**).
- Coach: **alerta en 24 h**, con el detalle del §6.
- 🔒 **A los 5 días en N2 sin mejorar, la app deriva** con el texto A del §2.4. No es opcional ni es
  «si quieres»: 5 días de dolor que limita, sin valoración, es donde las cosas se vuelven crónicas.

#### **N3 — Parada** 🔒

P2 = 🟠 o 🔴 (no puede cargar/apoyar, o duele en reposo).

**Qué hace la app:**
- ❌ **Se para la sesión entera. Hoy no se entrena.** No hay «entonces hagamos tren superior»: con
  dolor en reposo la app no tiene forma de saber qué está pasando, y ofrecer una alternativa
  automática es afirmar que esa alternativa es segura — lo que tenemos prohibido.
- ✅ Lo único que se ofrece: **caminar suave si le apetece, respiración, y nada más**. Sin contador,
  sin racha, sin «no pierdas tu progreso».
- 🔒 **La racha no se rompe y la sesión no cuenta como fallada.** Si parar cuesta la racha, la gente
  no para. Se marca como «día de cuidado» y suma como día cumplido.
- 🔒 **La zona queda bloqueada** en todas las superficies hasta que el **coach** la reabra
  explícitamente o la persona reporte mejoría en dos reevaluaciones. La app sola no reabre.
- Coach: **alerta inmediata (push)**, arriba de todo en su panel — esto ya lo hace bien
  `clientAttentionRank` (tier 0).
- Texto C del §2.4.

#### **N4 — Bandera roja → derivación** 🔒

Cualquier ítem marcado en P4. **Manda sobre el nivel de P2**, siempre.

**Qué hace la app:** todo lo de N3, **más** el texto de derivación del §2.4 (A o B según el ítem),
**más** bloqueo de la zona que solo puede levantar el coach tras hablar con la persona. Y una línea
que la app debe guardar: **«¿Ya te valoraron?»** en cada reapertura de la app, con dos botones (sí /
todavía no). El «sí» pide una nota libre de qué le dijeron — que es la información que el coach
necesita y hoy no tiene por ninguna vía.

---

## §2 · BANDERAS ROJAS — LISTA CERRADA Y TEXTOS EXACTOS

### §2.1 Bandera roja URGENTE — atención médica HOY (grupo U)

🔒 Estas no son «pide cita». Son urgencias y la app tiene que decirlo con esas palabras.

| # | Texto exacto del chip que ve el asesorado |
|---|---|
| U1 | «Desde que empezó, no controlo bien el pipí o la popó, o siento dormida la zona de la entrepierna» |
| U2 | «Me duele el pecho, el brazo o la mandíbula y además siento falta de aire, sudor frío o mareo» |
| U3 | «Fue por un golpe o una caída fuerte y no puedo apoyar el peso ni mover esa parte» |

*(U1 es síndrome de cauda equina, la única emergencia real de la columna lumbar. U2 existe porque
`PAIN_AREAS` tiene «pecho» y alguien puede tocarlo durante un esfuerzo. U3 es fractura hasta que se
demuestre lo contrario. No se pueden dejar fuera.)*

### §2.2 Bandera roja de derivación — valoración en 24-72 h (grupo R)

| # | Texto exacto del chip |
|---|---|
| R1 | «El dolor baja por el brazo o por la pierna» (pasa del codo o de la rodilla) |
| R2 | «Siento hormigueo, corrientazos, o se me duerme una parte del brazo, la pierna o el pie» |
| R3 | «Se me afloja o no me responde: se me cae algo de la mano, se me vence la rodilla, no levanto bien el pie» |
| R4 | «Me duele en la noche o me despierta el dolor» |
| R5 | «Empezó con un golpe, una caída o un tirón fuerte» |
| R6 | «La zona está hinchada, caliente o morada» |
| R7 | «Se me traba la articulación: no la puedo estirar o doblar completa» |
| R8 | «Tengo fiebre o me siento enfermo, además del dolor» |
| R9 | «Llevo más de 6 semanas con esto y no mejora» |
| — | **«Nada de esto ✓»** ← obligatoria, y marcarla es un acto positivo, no un default |

### §2.3 Nota técnica que hay que respetar 🔒

La app **ya tiene** un detector de compromiso nervioso: `GEN_NERVE_RE` (`avi-core.js:185`), que
reconoce *irradia, hormigueo, adormec, debilidad, ciátic*. Pero solo se aplica sobre **las notas que
escribe el coach**, y su texto (`nerveAdvice`) **solo lo lee el coach**. La nota libre que escribe
el asesorado en el reporte de dolor (`pain-note`, hasta 300 caracteres) **no pasa por ningún
detector**.

🔒 **La misma regex debe correr sobre `pain-note`**, y si engancha, el reporte sube a **N4** aunque
la persona no haya marcado ninguna casilla — porque describir el síntoma con sus propias palabras y
no reconocerlo en una lista es lo más normal del mundo. Es una función, ya existe, y hoy mira solo
hacia un lado.

### §2.4 Textos EXACTOS de derivación

Estos son literales. No los reescribe nadie sin mí. Cumplen tres reglas: **no diagnostican**, **no
prometen que lo demás sea seguro**, y **no asustan de gratis**.

**TEXTO U — urgencia (banderas U1, U2, U3):**
> **Para ahora mismo y busca atención médica hoy.**
> Lo que nos marcaste no se espera en casa: es de ir a urgencias hoy, no de pedir cita para la otra
> semana. Si estás solo, pídele a alguien que te acompañe.
> Ya le avisamos a tu coach. Tu entrenamiento te espera — esto va primero.

**TEXTO A — derivación (cualquier bandera R):**
> **Hoy paramos aquí, y no es un castigo.**
> Lo que nos contaste es de las cosas que necesitan que alguien te revise en persona — un médico o
> un fisioterapeuta — antes de volver a cargar peso. Desde la app no podemos revisarte, y no vamos a
> adivinar contigo.
> Ya le avisamos a tu coach para que esté pendiente. Cuando te valoren, cuéntanos qué te dijeron y
> armamos tu regreso con eso en la mano.

**TEXTO C — N3 sin bandera roja:**
> **Hoy no entrenamos esa zona.**
> Con un dolor así, seguir es la forma más rápida de perder dos semanas. No es exageración: es la
> cuenta que hemos visto mil veces.
> Ya le avisamos a tu coach para que ajuste contigo. Si en 3 días sigue igual o va peor, que te
> valore un profesional de la salud.

**TEXTO N2 — dolor que limita:**
> **Esa zona la dejamos quieta por ahora.**
> Cambiamos tu sesión para que puedas seguir entrenando lo demás sin meterte ahí. No es todo o nada.
> Te vamos a preguntar cómo va antes de cada entreno. Si en unos días no mejora, te vamos a pedir
> que lo consultes.

**TEXTO N1 — molestia leve:**
> **Ok, anotado. Seguimos, pero cuidando eso.**
> Sacamos de hoy lo que más suele molestar ahí y bajamos un poco la carga en el resto. Quédate en el
> rango que **no** duele — si duele, ese no es tu rango hoy.
> Le contamos a tu coach.

**TEXTO N0 — agujetas:**
> **Eso son agujetas, y son buena señal.**
> Es el músculo respondiendo a lo que hiciste. Calienta un poquito más hoy y baja algo el peso:
> moverse las quita más rápido que quedarse quieto.
> Si en vez de aflojar va empeorando, o se concentra en una articulación, cuéntanos otra vez.

### §2.5 Textos PROHIBIDOS 🔒

La app **nunca** escribe, en ninguna variante:
- Un nombre de lesión: «contractura», «tendinitis», «desgarro», «hernia», «esguince»,
  «pinzamiento», «ciática».
- «No es nada», «es normal», «se te va a pasar», «no te preocupes» aplicado a un dolor no-N0.
- «Ya puedes seguir tranquilo», «esto es seguro para ti», «estos ejercicios no te van a doler».
  **La app dice qué QUITÓ, jamás que lo que queda esté bien para esa persona** — es la regla que ya
  está escrita en la doctrina desde v424 y aplica igual aquí.
- Un plazo de recuperación: «en 3 días estarás bien», «esto dura una semana».
- Cualquier frase que empuje a continuar: «no pierdas tu racha», «solo te faltan 2 ejercicios»,
  «¿seguro que quieres parar?». 🔒 **El botón de parar no lleva confirmación disuasoria.** Se toca y
  se para.

---

## §3 · QUÉ SE PARA Y QUÉ SE PUEDE SEGUIR HACIENDO, POR ZONA

**🔒 Regla que cubre las seis tablas:** cada lista aplica a **TODAS las superficies** — generador,
calentamiento/movilidad, sustitución del día, entrenamientos rápidos, constructor manual del coach
(ahí **marcando**, no borrando: el coach decide, pero viéndolo) y plantillas. La lección de v424 es
que enumerar mal las superficies es el bug, no la lista.

**🔒 Segunda regla:** ninguna de estas listas puede vaciar el pool. Si al filtrar una zona no queda
nada para un puesto, **el puesto queda vacío** y se le dice al coach. Un hueco no lastima a nadie;
un ejercicio contraindicado sí.

**🔒 Tercera regla (la del PO):** ninguna de estas tablas afirma que lo ✅ sea *seguro para esa
persona*. Lo ✅ significa **«no está en la lista de lo que típicamente agrava esa zona»**. La
diferencia es todo.

### 3.1 — ADUCTORES / ABDUCTORES (muslo por dentro · cara externa de muslo y glúteo) — el caso del PO

*Zona nueva: hoy no existe ni como chip ni como regla.*

| | Entreno |
|---|---|
| ❌ **Prohibido** | `e60` Aducción en Máquina · `e45` Abducción en Máquina · `e163` Abducción Tumbado · `e129` Paseo Lateral con Banda · `e90` Fire Hydrant · `e87` Patada Lateral en Polea · `e61`/`e161` Sentadilla Sumo · `e68` Peso Muerto Sumo · `e205` Zancada Lateral con Salto · `e186` Salto del Patinador · todo lo lateral, explosivo o de apertura de piernas · el preset **`qw_plio`** completo |
| 🟡 **Modificar** | Sentadillas y prensa: **pies al ancho de cadera, sin apertura**, profundidad hasta donde no tire (`e36`, `e70`, `e128`) · zancadas **solo hacia adelante o atrás, nunca laterales** (`e162`) · todo unilateral **empezando y probando por la pierna sana** |
| ✅ **Se puede** | Todo el tren superior · `e42`/`e43` Hip Thrust y `e73` Puente de Glúteo (empuje de cadera en línea recta) · `e15`/`e126` Curl Femoral · `e16`/`e59` Talones · core antirrotación `e133` Press Pallof, `e17` Plancha · `e64` Bici estática **con sillín alto y sin resistencia** |

| | Calentamiento / movilidad |
|---|---|
| ❌ **Prohibido** | `wc3` Apertura de cadera 90/90 · `wc5` Patada lateral de pie · `wc2` Estocada con rotación · `e174` Cadera 90/90 · `e172` Estiramiento del Mundo · `e175` Zancada con Giro |
| 🟡 **Modificar** | `wc1` Círculos de cadera **pequeños** · `wc4` Puente de glúteo **suave** |
| ✅ **Se puede** | `wr1` Círculos de rodilla · `wt1`/`wt2` tobillos · `we1` Gato-Vaca · toda la movilidad de tren superior |

**Nota clínica:** el aductor es la lesión que más recae porque **deja de doler mucho antes de estar
curada**. Aquí «ya no me duele» no es criterio de alta — el §5 lo cubre.

### 3.2 — RODILLA

*Ya tiene regla (`GEN_ZONE_EXCL.rodilla`) y está bien construida: ancha a propósito, porque el
riesgo está en rango y alineación y el sistema no controla ninguno de los dos. **La confirmo.** Lo
que falta es que se aplique con `painCare`, no solo con las notas del coach.*

| | Entreno |
|---|---|
| ❌ **Prohibido** | Todo lo que ya excluye la regla (sentadilla, zancada, estocada, salto, pistol, búlgara, burpee, thruster, clean, sprint, rodillas altas) · **`extension de cuadriceps`** — extensión terminal bajo carga es el pico de estrés femoropatelar · `e184` Sentadilla con Salto · `e20` Carrera/Caminata (impacto) · presets `qw_plio` y `qw_hiit_casa` |
| 🟡 **Modificar** | `e36` Prensa **en rango 0-60°** · `e128` Wall Sit y `e158` Sit-to-Stand **hasta el punto que no duela** — son terapéuticos y NO se borran · `e70` Goblet en rango corto solo si va sin dolor |
| ✅ **Se puede** | `e42`/`e43` Hip Thrust · `e73`/`e106` Puente de Glúteo · `e15`/`e39`/`e126` Curl Femoral · `e14`/`e226` Peso Muerto Rumano ligero · `e64` **Bici estática con sillín alto y resistencia baja** · `e16`/`e59` Talones · todo el tren superior · core |

| | Calentamiento / movilidad |
|---|---|
| ❌ **Prohibido** | `wr2` Sentadilla de movilidad lenta · `wai1` Sentadilla peso corporal · `wai2` Desplante alterno — **ya están en `WARMUP_ZONE_EXCL_IDS.rodilla` y confirmo las tres** |
| ✅ **Se puede** | `wr1` Círculos de rodilla · `wr3` Movilidad de isquios · `wt1`/`wt2` tobillo — **la movilidad de tobillo es tratamiento de rodilla, no riesgo** · `wc1` Círculos de cadera · `wc4` Puente |

### 3.3 — ZONA LUMBAR

*Regla existente (`GEN_ZONE_EXCL.lumbar` + `WARMUP_ZONE_EXCL_IDS.lumbar` = `we3`, `we5`, `wai3`,
`wac3`). **La confirmo entera, incluidos los cuatro calentamientos.** Añado lo de abajo.*

| | Entreno |
|---|---|
| ❌ **Prohibido** | Todo lo de la regla vigente (bisagra cargada, flexión, rotación cargada, impacto, sobre la cabeza con barra) · `e62` Russian Twist · `e18`/`e131` Crunch · `e47` Rueda Abdominal · `e116` Hiperextensiones · `e34`/`e14`/`e46`/`e68` peso muerto en todas sus formas · `e190` Balanceo con Pesa Rusa · `e176` Oruga · `e5` Remo con Barra · `e136` Farmers Walk con carga alta |
| 🟡 **Modificar** | `e36` Prensa **con la lumbar pegada al respaldo y sin llevar las rodillas al pecho** · `e114` Remo Sentado y `e6` Jalón **con el tronco fijo, sin balanceo** · `e42`/`e43` Hip Thrust **sin hiperextender arriba: se termina en línea, no arqueado** |
| ✅ **Se puede** | `e133` **Press Pallof — antirrotación es tratamiento, no riesgo** · `e134` Bird Dog · `e72` Dead Bug · `e17`/`e164` Plancha · `e49` Plancha Lateral (si no duele) · `e128` Wall Sit y `e158` Sit-to-Stand — **terapéuticos, la regla los preserva a propósito y así se queda** · tren superior sentado o con apoyo · `e64` Bici con espalda erguida |

| | Calentamiento / movilidad |
|---|---|
| ❌ **Prohibido** | `we3`, `we5`, `wai3`, `wac3` (los cuatro ya listados) · `e165` Gato-Camello **en su rango de flexión completa** — se permite solo la mitad de extensión · `e176` Oruga · `e167` Postura del Niño en fase aguda (es flexión sostenida de columna) |
| ✅ **Se puede** | `we2` Rotación torácica en el suelo · `wh4` Rotación torácica sentado · `wc2` Estocada con rotación — **el giro es torácico y la pelvis queda quieta: es tratamiento** · `wc1` Círculos de cadera suaves · `wc4` Puente · `e168` Cobra suave · caminar |

### 3.4 — HOMBRO

*Regla existente (`GEN_ZONE_EXCL.hombro` + `wh3`). **La confirmo.***

| | Entreno |
|---|---|
| ❌ **Prohibido** | Todo lo de la regla (tras nuca, fondos, press militar, Arnold, pike, push press, sobre la cabeza, agarre amplio, aperturas) · `e7`/`e22`/`e23`/`e98`/`e156` press militar en todas sus formas · `e97`/`e154` Pike Push-up · `e19`/`e79` Fondos · `e4` Dominadas y `e103` Chin-up en fase aguda · `e53` Elevaciones Frontales · `e8`/`e99`/`e117`/`e155` Elevaciones Laterales **por encima de 90°** · `e157` Toques de Hombro en Plancha |
| 🟡 **Modificar** | Presses **solo horizontales, agarre neutro, rango parcial** (`e84` Hammer, `e71` mancuernas) · `e6` Jalón **agarre estrecho neutro, al pecho, nunca a la nuca** · Elevaciones laterales **hasta 60-70°, con peso mínimo** |
| ✅ **Se puede** | `e21`/`e100` Face Pull · `e138` Rotación Externa con Banda · `e109` Elevaciones Y-T-W · `e119` Pec Deck Inverso · `e114`/`e25`/`e52` remos con codo pegado · todo el tren inferior · core sin apoyo en manos (`e72` Dead Bug, `e134` Bird Dog) |

| | Calentamiento / movilidad |
|---|---|
| ❌ **Prohibido** | `wh3` Apertura de pecho en pared (ya listado) · `e178` Pasa-vallas de Hombro · `wa1` Flexión de pecho · `wa2` Remo invertido |
| ✅ **Se puede** | `wh2` Rotación de manguito rotador **— es el tratamiento** · `wh1` Círculos de hombro de rango corto · `wh4` Rotación torácica · `wa3` Band pull-apart · `wh5` muñecas |

### 3.5 — CUELLO

*Zona **inexistente** hoy: ni chip, ni regla de exclusión. Es de las que más se reportan en gente
que trabaja sentada.*

| | Entreno |
|---|---|
| ❌ **Prohibido** | `e115` Encogimientos · `e5` Remo con Barra · `e34` Peso Muerto Convencional · todo lo que va sobre la cabeza (`e7`, `e22`, `e23`, `e97`, `e118`) · `e4` Dominadas · `e17`/`e164`/`e49` planchas si hay que sostener la cabeza · `e18` Crunch — **la gente se jala el cuello con las manos y ahí es donde duele** · todo el `qw_abs_casa` |
| 🟡 **Modificar** | Presses y jalones **sentados con respaldo**, peso bajo, hombros abajo y atrás · Cardio **sin agarrarse tenso al manubrio** |
| ✅ **Se puede** | Todo el tren inferior sentado o con apoyo (`e36`, `e15`, `e42`, `e16`) · `e21`/`e100` Face Pull con peso ligero · `e133` Press Pallof · `e64` Bici erguida |

| | Calentamiento / movilidad |
|---|---|
| ❌ **Prohibido** | Círculos completos de cuello y cualquier movilidad que lleve el cuello a rango final — **`e180` «Movilidad de Cuello» se revisa conmigo antes de entregarse a nadie con dolor cervical** |
| ✅ **Se puede** | `wh1` Círculos de hombro · `wh4` Rotación torácica sentado · `we2` Rotación torácica en suelo · movilidad de tren inferior completa |

### 3.6 — TOBILLO

*Zona con chip (`tobillo`) y con consejo, pero **sin ninguna regla de exclusión**. Cualquiera con un
esguince recibe hoy la semana entera de saltos.*

| | Entreno |
|---|---|
| ❌ **Prohibido** | **Todo el impacto**: `e20` Carrera/Caminata, `e184` Sentadilla con Salto, `e185`, `e186` Salto del Patinador, `e189` Plancha Saltarina, `e198`, `e203`, `e205` · presets `qw_plio` y `qw_hiit_casa` completos · `e16`/`e59`/`e159` Elevación de Talones · `e136` Farmers Walk · zancadas caminando (`e125`) · todo lo unilateral de pie sobre el lado afectado |
| 🟡 **Modificar** | `e36` Prensa **con el pie plano y apoyo completo**, sin empujar desde la punta · Sentadillas **solo con talones apoyados y rango corto** · `e64` Bici **solo si pedalea sin dolor**, resistencia baja |
| ✅ **Se puede** | Todo el tren superior **sentado** · `e15`/`e126` Curl Femoral · `e42`/`e43` Hip Thrust · `e73` Puente de Glúteo · `e44`/`e88` Patadas en Polea del lado sano · core en el suelo · `e65` Remo Ergómetro solo si no duele el empuje |

| | Calentamiento / movilidad |
|---|---|
| ❌ **Prohibido** | `wai1` Sentadilla peso corporal · `wai2` Desplante · `wai4` Elevación de talones · `e177` Movilidad de Tobillo **en fase aguda (0-72 h)** · `e166` Perro Boca Abajo |
| ✅ **Se puede** | `wt1` Círculos de tobillo **sin carga, sentado** — es el tratamiento, pero **pasadas las 72 h** · `wc1` Círculos de cadera · `wr1` Círculos de rodilla · `we1` Gato-Vaca · movilidad de tren superior completa |

**🔒 Nota sobre esguince de tobillo:** propiocepción y equilibrio **antes** que cualquier
pliometría. La app **no** debe reintroducir saltos por tiempo transcurrido; solo cuando se cumplan
los criterios del §5.

---

## §4 · MOVILIDAD Y RECUPERACIÓN — LAS PRIMERAS 48-72 H

### §4.1 Qué SÍ se puede proponer 🔒

- **Movimiento sin carga en el rango que no duele**, de la zona **y de las articulaciones vecinas**.
  Aquí no hay debate clínico: el reposo total es contraproducente en casi toda lesión
  musculoesquelética. Lo que se retira es **la carga**, no **el movimiento**.
- **Movilidad de las zonas NO afectadas, completa y sin recortar.** Alguien con la rodilla mal puede
  y debe mover hombros y columna torácica.
- **Caminar**, si camina sin cojear. 🔒 Si cojea, no camina como ejercicio: cojear es reprogramar un
  patrón malo.
- **Respiración diafragmática y control de core sin carga** (`e133` Press Pallof suave, `e134` Bird
  Dog) — salvo que la zona sea la lumbar en N3.
- **Frío las primeras 48 h si hay hinchazón** (15-20 min, con tela de por medio). Calor **no** en
  fase aguda.
- 💡 El preset `qw_movilidad` (`e165`, `e173`, `e170`, `e168`, `e179`, `e167`) es una base decente
  **y ya existe**. 🔒 Pero hoy se sirve **sin filtrar por zona**, y contiene `e165` Gato-Camello y
  `e167` Postura del Niño, que son **flexión de columna**: para un lumbar agudo son exactamente lo
  contrario de lo que necesita. Debe pasar por el filtro del §3 como todo lo demás.

### §4.2 Qué NO se puede proponer en 48-72 h 🔒

- ❌ **Estirar el sitio que duele.** Es el error nº1 del asesorado. Un músculo con lesión de fibras,
  estirado, se agranda la lesión. Y con dolor de origen nervioso (R1/R2), estirar reproduce el
  síntoma y **empeora**. El texto que ve la persona debe decirlo: *«no estires lo que te duele,
  muévelo suave»*.
- ❌ **Rodillo / foam roll agresivo** sobre la zona aguda, y **nunca** sobre banda iliotibial ni
  sobre una zona con hormigueo.
- ❌ **Calor, sauna, baño caliente** con hinchazón activa.
- ❌ **Excéntricas, isométricas al máximo, «test» de a cuánto aguanta.** La app no puede proponer
  que alguien averigüe su límite.
- ❌ **Automasaje o «manipulación»**: la app no enseña técnica manual, punto.
- ❌ Reintroducir el ejercicio que provocó el dolor «para probar si ya pasó».

### §4.3 Reglas de la rutina de recuperación

*Coach Pro arma los ejercicios. Estos son los límites, y son míos:*

| Parámetro | Límite 🔒 |
|---|---|
| **Duración de la sesión** | 15-25 min. Más que eso ya no es recuperación |
| **Frecuencia** | Diaria o casi. Poco y seguido gana a mucho y de vez en cuando |
| **Volumen** | Máximo **6 ejercicios**, 1-2 series cada uno |
| **Intensidad** | **Cero carga externa** sobre la zona afectada. Peso corporal o menos (apoyos, asistencia) |
| **Rango** | El que **no duele**. Nunca «hasta donde aguantes» |
| **Umbral de dolor durante** | 🔒 **0-3/10 y que baje al terminar.** Si sube durante, se para el ejercicio. Si al día siguiente está peor, se para el bloque y sube de nivel |
| **Progresión** | 🔒 **Ninguna automática.** La rutina de recuperación **no progresa sola**. La progresa el coach, o los criterios del §5 |
| **Lo que NO lleva** | Impacto · pliometría · rango final · carga axial · trabajo unilateral sobre el lado afectado · nada explosivo · nada al fallo |
| **Qué SÍ lleva** | Movilidad de zonas vecinas · activación sin carga · trabajo pleno del resto del cuerpo si el nivel lo permite · educación en la pantalla (por qué esto y no lo otro) |
| **Duración del bloque** | 🔒 **Máximo 10 días sin reevaluación humana.** Si a los 10 días sigue en modo recuperación, la app deriva. Un modo que no expira solo es la trampa que ya nos costó la semana de descarga en v434 |

🔒 **La rutina de recuperación es un MODO sobre el plan que ya tiene, no un plan nuevo.** Se
transforma lo que hay (se retiran los ❌, se bajan cargas, se suma movilidad) y **se guarda el
snapshot para volver atrás**. Regenerar la semana entera es la trampa exacta de la descarga en
v433/v434: el generador **vuelve a elegir ejercicios** y la persona recibe «una rutina totalmente
distinta» justo el día que menos entiende por qué. No se repite.

🔒 **Y la persona tiene que saber por qué su plan cambió.** Menos series sin explicación se lee como
un error de la app.

---

## §5 · CRITERIOS DE RETORNO

🔒 **Regla madre: el retorno se decide por CRITERIOS CUMPLIDOS, jamás por días transcurridos.** «Ya
pasaron dos semanas» no es un criterio; es un calendario. La app **no puede** reabrir una zona
porque venció un contador — es exactamente el error que le costaría a alguien la recaída.

### §5.1 De N4 (bandera roja) → a cualquier otra cosa

🔒 **Solo con dos cosas: la persona reporta que ya la valoraron, y el coach lo confirma en la app.**
La app no reabre sola, nunca, bajo ninguna condición. Si hubo indicación profesional, esa manda
sobre todo lo que diga este documento.

### §5.2 De N3 → N2

Los cuatro, y los cuatro se preguntan explícitamente:
1. No duele en reposo, ni en la noche.
2. Puede apoyar / cargar / mover esa zona en la vida diaria sin evitarla.
3. Ninguna bandera roja marcada en la última reevaluación.
4. **≥48 h** cumpliendo lo anterior de forma sostenida.

### §5.3 De N2 → N1

1. Movimiento activo completo de la zona, sin dolor.
2. Puede hacer los 🟡 de su zona con carga ligera **a 0-2/10 y sin dolor al día siguiente** — este
   último punto es el que casi nadie pregunta y es el que más avisa.
3. Sin cojera, sin compensación visible.
4. **≥3 sesiones seguidas** cumpliendo esto.

### §5.4 De N1 → alta (rutina normal)

1. **Cero dolor** en los movimientos de su plan.
2. 🔒 **Simetría: el lado afectado maneja ≥80% de lo que maneja el sano** en un ejercicio unilateral
   comparable. Sin dinamómetro, el criterio práctico es hacer el mismo trabajo unilateral con el
   mismo peso y las mismas reps a ambos lados, sin compensar. **Si no hay dato de simetría, no hay
   alta a carga libre.**
3. **Dos semanas** completas de entrenamiento en modo modificado, sin recaída.
4. Reintroducción **progresiva, un patrón por sesión**, empezando por lo 🟡 y solo después lo ❌.
   Nunca todo a la vez.
5. 🔒 **Lo último que vuelve es el impacto y lo explosivo**: saltos, sprints, cambios de dirección,
   pliometría. Y solo si lo anterior va limpio.

### §5.5 Retroceso 🔒

Reaparece el dolor durante o al día siguiente ⇒ **se vuelve al nivel anterior automáticamente y se
reinicia el contador de sesiones limpias.** Sin discutirlo, sin «pero ya casi». Y a la **segunda
recaída en la misma zona**, se deriva con el TEXTO A, aunque no haya ninguna bandera roja: dos
recaídas es información suficiente para saber que no lo vamos a resolver desde aquí.

---

## §6 · QUÉ TIENE QUE VER EL COACH, Y CON QUÉ URGENCIA

*Este apartado nace de un bug real: el aviso de dolor no le llegó y no pudo hacer nada.*

### §6.1 Urgencia por nivel 🔒

| Nivel | Canal | Cuándo |
|---|---|---|
| **N4 / U** | Push + tope del panel + **marca que no se limpia sola** | **Inmediato** |
| **N3** | Push + tope del panel | **Inmediato** |
| **N2** | Panel + badge de no-leído en el chat | **≤24 h** |
| **N1** | Ficha del asesorado | Informativo |
| **N0** | Nada | No es un evento |

`clientAttentionRank` ya pone el dolor en **tier 0** (`avi-core.js:2626-2631`) y eso está bien
resuelto. Lo que falta es lo de abajo.

### §6.2 Qué información necesita el coach para decidir 🔒

Hoy la ficha le muestra zona, nivel, ejercicio y fecha (`app-3-coach.js:1319-1325`) — está bien,
pero es insuficiente para decidir. Necesita, en una sola tarjeta y sin abrir nada:

1. **Zona y LADO** (izquierda/derecha) — hoy no existe el lado.
2. **Nivel de triaje** (N0-N4), no solo el chip de intensidad.
3. **Qué banderas rojas marcó**, textuales. Es lo que decide si él ajusta la rutina o levanta el
   teléfono.
4. **Cuándo empezó y con qué** (respuesta a P3).
5. **La nota literal de la persona.**
6. **Con qué ejercicio pasó** — ya está.
7. **Qué hizo la app**: qué se paró, qué zonas quedaron bloqueadas, qué se le dijo a la persona.
   🔒 **Si el coach no sabe qué le dijo la app, va a contradecirla.** Ese es el bug de v437 con otra
   cara.
8. **Historial de esa zona**: cuántas veces la ha reportado y cuándo fue la última. Una rodilla
   reportada tres veces en dos meses es un dato clínico, y hoy se pierde en el `slice(-3)` de la
   ficha.
9. **Estado de la derivación**: si se derivó, si ya lo valoraron, y qué le dijeron.
10. **Un botón «Reabrir esta zona»** con confirmación activa. 🔒 Es el único camino de vuelta desde
    N3/N4, y es del coach — no de la app, no de la persona.

### §6.3 Lo que el coach NO debe recibir 🔒

- Un diagnóstico sugerido por la app.
- Una recomendación de tratamiento.
- Un «ya está resuelto» automático porque venció el TTL de 14 días. 🔒 Hoy `painCare` **caduca en
  silencio** (`PAIN_TTL_MS`). Un dolor que caduca solo no se resolvió: se dejó de mirar. Debe
  **cerrarse explícitamente**, por la persona o por él.

### §6.4 Un defecto colateral que hay que arreglar de paso

`painCareClear` (`app-6-extra.js:396-402`) marca `cleared = true` en **todos** los reportes vigentes
de golpe. Alguien con dolor de hombro **y** de rodilla que toca «Ya estoy bien ✓» porque se le pasó
el hombro, **borra también la rodilla**. El cierre tiene que ser **por zona**.

---

## §7 · LO QUE LA APP NO DEBE HACER NUNCA 🔒

1. **Diagnosticar.** Ni nombrar una lesión, ni sugerirla, ni «esto parece».
2. **Afirmar que lo que queda es seguro para esa persona.** Dice qué quitó. Nada más. *(Regla ya
   escrita en la doctrina desde v424; aquí se aplica igual.)*
3. **Reabrir una zona sola** por tiempo transcurrido, por caducidad de un TTL o por cualquier
   automatismo. Solo criterios cumplidos (§5) o el coach.
4. **Insistir para que alguien siga entrenando** después de un reporte de dolor: nada de rachas en
   riesgo, nada de «solo te faltan 2», nada de confirmación disuasoria al parar.
5. **Penalizar el haber parado.** Ni la racha, ni el nivel, ni los logros, ni el pulso del coach.
   🔒 Si parar cuesta algo, nadie para, y toda esta arquitectura se vuelve decorativa.
6. **Ofrecer un ejercicio de la zona que duele como sustituto** de otro de la misma zona. Hoy lo
   hace, y es el hallazgo más embarazoso del §0.
7. **Recomendar estiramientos, masaje, calor, frío o cualquier técnica como tratamiento de algo
   específico.** Consejo general de cuidado sí; prescripción no.
8. **Sugerir medicamentos**, ni siquiera de venta libre, ni siquiera «un ibuprofeno». Ni una vez.
9. **Poner un plazo de recuperación.**
10. **Tratar un dato opcional como si fuera un dato.** Si el triaje se puede saltar, no existe.
    `feeling` se registra en el 12% de las sesiones y ya sabemos cómo termina eso.
11. **Guardar el dolor solo en el dispositivo.** 🔒 El mood vive en `localStorage`
    (`mood_<cid>_<fecha>`) y se borra a medianoche — la app le baja la carga a quien declara dolor y
    luego lo lee como estancamiento. **Todo lo de dolor viaja en el perfil o en la sesión**, que ya
    sincronizan, y se escribe en **todas** las ramas que crean o actualizan la sesión.
12. **Dejar el calentamiento fuera del filtro.** Es literalmente el bug de v424. Si vuelve a pasar,
    es porque no leímos nuestra propia bitácora.
13. **Filtrarle al coach en silencio.** A él se le **marca** y decide; al motor se le **filtra**.
    Son cosas distintas y la distinción ya está escrita en la doctrina.
14. **Prometer una revisión clínica que no ocurrió.** Ningún texto puede sugerir que un
    fisioterapeuta miró esto.

---

## §8 · HUECOS DEL CATÁLOGO QUE HAY QUE CERRAR PARA QUE ESTO SEA IMPLEMENTABLE

| # | Hueco | Impacto |
|---|---|---|
| 1 | `painCare` no llega a 6 de las 8 superficies (§0) | 🔴 **P0.** Sin esto, nada de este dictamen protege a nadie |
| 2 | Solo hay reglas de exclusión para **rodilla, lumbar, hombro** | Cadera/aductores/abductores, cuello, tobillo, pantorrilla, codo, muñeca: **cero** |
| 3 | `PAIN_AREAS` no tiene aductores, abductores, cuello, muslo ni pantorrilla | El caso del PO cae en «otra zona» |
| 4 | No se pregunta el **lado** | Sin lado no se puede prescribir unilateral ni medir simetría (§5.4) |
| 5 | `todaySubstitute` filtra solo por músculo | La app responde al dolor ofreciendo más de lo mismo |
| 6 | `QUICK_WORKOUTS` sin filtro | `qw_plio` (5 saltos) a un toque para alguien con rodilla o tobillo |
| 7 | `GEN_NERVE_RE` no lee `pain-note` | El detector de compromiso nervioso existe y mira hacia el lado equivocado |
| 8 | `painCare` caduca sola a los 14 días | Un dolor no resuelto desaparece del radar del coach |
| 9 | `painCareClear` borra todas las zonas de golpe | Cerrar el hombro cierra la rodilla |
| 10 | El reporte solo se alcanza dentro del guiado | Quien no está entrenando no puede reportar |
| 11 | Mood 🤕 y reporte de dolor son dos sistemas ciegos entre sí | Uno sabe cuánto, otro dónde, ninguno actúa |
| 12 | `qw_movilidad` contiene flexión de columna (`e165`, `e167`) | Es lo que **no** debe recibir un lumbar agudo, y es el preset que se ofrece «cuando no puedes entrenar fuerte» |

---

## §9 · RESUMEN DE LO INNEGOCIABLE

1. El dato de dolor llega a **las ocho superficies** o esto no se despliega.
2. Las **cuatro preguntas**, ninguna opcional, con default al lado seguro.
3. La **lista cerrada de banderas rojas del §2**, con U1/U2/U3 diciendo «urgencias hoy».
4. Los **textos exactos del §2.4**, y ninguno de los prohibidos del §2.5.
5. Las **seis tablas del §3**, aplicadas a entreno **y** calentamiento **y** sustitución **y**
   rápidos **y** constructor manual.
6. **N3 y N4 paran la sesión.** No hay alternativa automática ese día.
7. **Parar no cuesta racha, nivel ni logros.**
8. El **retorno es por criterios cumplidos, jamás por días.** N4 solo lo reabre el coach.
9. La **rutina de recuperación transforma el plan, no lo regenera**, guarda snapshot y **expira a
   los 10 días**.
10. La app **nunca diagnostica y nunca afirma que lo que queda es seguro para esa persona.**

**Lo que dejo a criterio del PO (💡):** dónde va exactamente la entrada al reporte fuera del
entreno · si la reevaluación se pide en cada sesión o cada 48 h · si el bloque de recuperación se
ofrece automáticamente o lo activa el coach · el texto final de las tarjetas, que debe pasar por
Sofía antes de publicarse.

**Lo siguiente en el pipeline:** con estos límites puestos, Coach Pro arma la rutina de recuperación
por zona y Andrés revisa si el cambio de carga toca los macros. **Yo audito la implementación antes
de que salga** — en particular que cada término de las listas atrape lo que dice, que no se lleve
por delante lo terapéutico (wall-sit, sit-to-stand, Press Pallof, rotación externa, movilidad de
tobillo) y que ningún pool quede vacío.

---

**Archivos que toca este dictamen:**
`avi-core.js` (175-287 reglas de zona · 1792-1838 reporte de dolor · 2422-2561 `applyMood` · 4746
`_PAIN_ZONE_TO_EXCL` · 4997-5020 `shockPlan`) · `app-6-extra.js` (348-421 flujo de dolor ·
1763-1856 `WARMUP_LIBRARY` y `buildWarmup`) · `app-4-entreno.js` (894-967 mood y aviso al coach ·
1171-1200 `QUICK_WORKOUTS` · 1640-1660 `todaySubstitute`) · `app-2-login.js` (542-545 filtro del
selector) · `app-3-coach.js` (1317-1330 ficha del coach · 2205-2209 marca del calentamiento) ·
`index.html` (818-830 modal `m-pain`) · `scripts/e2e/_verify-pain.mjs`
