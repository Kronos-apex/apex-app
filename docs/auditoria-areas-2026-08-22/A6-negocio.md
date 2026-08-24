# Auditoría: NEGOCIO Y PRODUCTO — Camilo (Growth)

> **Alcance:** delta **v418 → v526** (HEAD `83f287a`, sello `avi-v526`). Read-only: ni un UPDATE.
> Todo sale de `SELECT` contra producción (`eoebhrxbokyllqalyecj`), de `archivo:línea` o de `git log`.
> Continúa `docs/auditoria-areas-2026-07-31/A6-negocio.md`: lo CERRADO no se re-audita, lo que
> aquel informe dio por SANO sí se re-verificó. Cruza con `A5-experiencia.md` de esta misma ronda.

---

## Veredicto en 5 líneas

1. **El dinero SUBIÓ y agosto es el mejor mes de la historia: 890.000 COP** (contra 746.000 en julio), con la **base recurrente de 725.000 → 835.000**. Lo movieron dos cosas que **no costaron una hora de código**: subirle el precio a Claudia y Luz (100.000 → 130.000, y las dos siguen entrenando) e inscribir a Danilo a mano (150.000 el mismo día del alta). Se fueron Valery Valbuena (100.000) y Yeison (20.000), y las dos **dejaron de entrenar 3-6 semanas ANTES de dejar de pagar**.
2. **«Vender a nuevos» es la decisión correcta, pero solo por una de las dos puertas.** Las cuentas que crea el coach van **10 de 10 en conversión a pago**; el auto-registro sumó 3 personas más en el delta y **0 pesos**. El predictor de los 28 días se confirma: las 2 que pasaron de 8 días entrenados siguen pagando, las 2 que no llegaron a 4 se fueron. Y la app **no está lista para recibirlos**: Chema se registró el sábado 22-ago y su primera pantalla fue «día de descanso» (A5 H1) — 0 sesiones y sin teléfono.
3. **La vitrina funciona y está medio vacía: 1 tarjeta en 6 huecos, con 8 historias listas.** El hueco de ESCRITURA lo cerró v525; **queda el de LECTURA** (`app-2-login.js:1877` pide las 6 más nuevas sin filtrar por coach) y **hoy no muerde** porque hay un solo moderador — muerde el día que AVI GYM tenga el suyo.
4. **La mitad del delta se fue en comida y el asesorado no la usa.** 90 de 182 commits son de nutrición y **49 son del registro de alimentos**; su uso total es **4 personas, 5 días, 16 entradas y nada desde el 13-ago**, y el **escáner de códigos de barras tiene 0 filas: nadie lo ha usado ni una vez**. El triaje de dolor (24 commits) se usó **una vez, y fue el propio PO**. En cambio el **motor del plan** de nutrición sí llega: 11 planes vigentes, todos de esta semana.
5. **Lo que anuncié en julio pasó tal cual:** el 1-ago quedaron bloqueadas 8 personas (**66 días-persona en 23 días**) y el candado **siguió sin morder** — Claudia y Luz entrenaron con el plan vencido. **El 1-sep se repite con 5 de los 8 que pagan: 560.000 COP/mes.**

---

## Hallazgos verificados

### H1 · 🟢 EL DINERO SUBIÓ: agosto es el mejor mes de la historia (890.000 COP) y la base recurrente creció de 725.000 a 835.000

- **Qué pasa:** entre el 31-jul y hoy 23-ago el negocio **no se erosionó: creció un 15% en base
  recurrente y un 19% en caja del mes**, y el crecimiento tiene tres causas distintas y medibles —
  una subida de precio, un cliente nuevo, y dos bajas que no lo compensaron.

- **Dónde:** `user_data.profile->'payments'` (query abajo). El KPI que el coach ve es
  `app-2-login.js:1356-1364`.

- **Evidencia:**

  **(a) Mes a mes, hasta hoy 23-ago:**
  ```
  mes      pagos  personas  cobrado   min      max
  2026-05    7       6      515000       0   150000
  2026-06    2       2      155000   30000   125000
  2026-07    8       8      746000    1000   150000
  2026-08    9       9      890000       0   150000   ← 23 días, no el mes completo
  ```
  Total histórico: **2.306.000 COP** (era 1.416.000 el 31-jul). Agosto solo lleva 23 días y ya es
  el mes más alto que ha tenido el negocio.

  **(b) La base recurrente — el número que sirve para decidir — pasó de 725.000 a 835.000 COP/mes:**
  ```
  persona            julio     agosto    Δ        vence
  Astrid Beltran    150.000   150.000    =        2026-09-02
  Kathe Beltran     150.000   150.000    =        2026-09-02
  Samuel Cifuentes  125.000   125.000    =        2026-09-05
  Claudia Valbuena  100.000   130.000   +30.000   2026-09-02
  Luz Rodríguez     100.000   130.000   +30.000   2026-09-02
  Danilo                  —   150.000   NUEVO     2026-09-20
  ───────────────────────────────────────────────
  nivel «coach»     725.000   835.000   +110.000  (6 personas las dos veces)
  Nataly (app)       vencida   30.000              2026-08-31
  Natalia (app)       1.000    25.000              2026-09-11
  ───────────────────────────────────────────────
  TOTAL              726.000   890.000   +164.000
  ```
  A ~4.000 COP/USD el negocio pasó de **≈US$180/mes a ≈US$222/mes**.

  **(c) Las dos bajas, con nombre y con lo que estaban haciendo:**
  ```
  Valery Valbuena  100.000/mes  último pago 2026-07-02, venció 2026-08-01
                   3 sesiones EN TOTAL, la última el 2026-07-09 — 45 días antes de vencer
                   16 años · sin teléfono guardado · sin push · último login 2026-07-07
  YEISON VALBUENA   20.000/mes  último pago 2026-07-01, venció 2026-07-31
                   3 sesiones, la última el 2026-07-10 · auto-registrado
                   sin teléfono · sin push · último login 2026-07-01 (el día del alta)
  ```
  **Ninguna de las dos se fue por el producto: las dos dejaron de entrenar entre 3 y 6 semanas
  ANTES de dejar de pagar.** El pago fue el último indicador en apagarse, no el primero. Y las dos
  son **inalcanzables**: ni teléfono ni push, así que ni siquiera se les podía escribir.

  **(d) El precio subió y nadie se fue.** Claudia y Luz pasaron de 100.000 a 130.000 (+30%) el
  3-ago y las dos siguen entrenando: **18 sesiones cada una desde el 31-jul, las dos más activas
  del negocio**. La sospecha nº3 de mi informe de julio («los de 100-150.000 aguantarían un alza»)
  **se probó en producción y aguantó** — pero se probó sobre las dos personas de más adherencia,
  no sobre las seis.

- **Intenté tumbarlo así:** cuatro intentos.
  1. *«Los 890.000 incluyen ruido como el pago de 1.000 de julio»* — **no**: los 9 pagos de agosto
     son 150.000 · 150.000 · 150.000 · 130.000 · 130.000 · 125.000 · 30.000 · 25.000 y **un 0**
     (Miguel Pulido, 4-ago). El 0 no suma. Sin él serían 890.000 igual.
  2. *«Agosto solo lleva 23 días, la comparación es injusta»* — es injusta **a favor de julio**:
     los pagos se concentran los días 1-6 del mes (7 de los 9 de agosto), así que el mes ya está
     cobrado. Nadie más vence antes del 31-ago (Nataly).
  3. *«Danilo puede ser una cuenta de prueba»* — su email es `danilo@avi.com`, el mismo patrón de
     las cuentas que crea el coach a mano, y **entrenó al día siguiente del alta** (22-ago).
     Es un cliente real y es la décima cuenta creada por el coach.
  4. *«¿Y si hay pagos en efectivo sin registrar?»* — sigue siendo la limitación de siempre
     (§Lo que NO alcancé a revisar). Estos números son un **piso**, no la verdad.

- **A quién le pasa:** al coach. Su tablero le dirá 890.000 este mes; lo que no le dice es que
  **835.000 de eso son 6 personas** y que dos de ellas (Claudia y Luz) acaban de aceptar un +30%.

- **Costo del arreglo:** ninguno — esto es una buena noticia, no un defecto. Lo accionable está en
  H2 y H3.

---
### H2 · 🔴 «Vender a nuevos» es la decisión correcta y el dato la respalda — pero solo por UNA de las dos puertas, y la que sirve depende de que el coach teclee un teléfono

- **Qué pasa:** en el delta entraron **4 personas nuevas**. Una la creó el coach y **pagó 150.000
  el mismo día**; las otras tres se auto-registraron y **ninguna pagó**. La decisión del PO es
  correcta, pero «vender a nuevos» tiene dos puertas con resultados opuestos, y la app **no
  distingue entre ellas en ningún sitio**.

- **Dónde:** `user_data` + `auth.users` (queries abajo); `app-3-coach.js:306` (el auto-registro
  manda `startDay`; el panel del coach no — ver A5 H1).

- **Evidencia:**

  **(a) Las 4 altas del delta, una por una:**
  ```
  nombre        alta     puerta          tel  pagó       sesiones  último login
  Valery      02-ago   auto-registro     NO   0 COP      8 (7 días)  21-ago
  maria rubio 09-ago   auto-registro     sí   0 COP      0           09-ago (el alta)
  Danilo      21-ago   la crea el coach  sí   150.000    1 (100%)    22-ago
  Chema       22-ago   auto-registro     NO   0 COP      0           22-ago (el alta)
  ```

  **(b) La cohorte acumulada sigue siendo binaria, y el delta la refuerza:**
  ```
                        los crea el coach     se auto-registran
  personas                    10                    13
  alguna vez pagaron       10 de 10 (100%)       1 de 13 (7,7%)
  dinero que dejaron       2.286.000 COP           20.000 COP
  con plan vigente hoy         8                     0
  ```
  **Danilo es la décima cuenta creada por el coach y la décima que paga.** Cien por ciento, diez
  de diez, en tres meses.

  **(c) Cuánto vale y cuánto dura un asesorado nuevo (nivel «coach», que es el que sostiene todo):**
  ```
  Samuel     125.000 × 4 meses seguidos (may·jun·jul·ago) = 500.000 — 0 fallos
  Astrid     150.000, 3 pagos                            = 450.000
  Kathe      150.000, 3 pagos                            = 450.000
  Claudia    100.000 → 130.000, 2 pagos                  = 230.000
  Luz        100.000 → 130.000, 2 pagos                  = 230.000
  Danilo     150.000, 1 pago (2 días de vida)            = 150.000
  ───────────────────────────────────────────────────────────────
  la ÚNICA baja del nivel: Valery Valbuena, 100.000 × 1 mes = 100.000 y se fue
  ```
  **Ticket medio 134.000 COP/mes · churn del nivel «coach» en 3 meses: 1 de 7 (14%).** Con el
  precio de hoy, un asesorado nuevo que dure lo que dura la media **vale ~400.000 COP**.

  **(d) Qué tiene que pasar en sus primeros 28 días — el predictor se sostiene y ahora tiene un
  contraejemplo que lo confirma.** Solo se puede medir sobre quien se dio de alta DESPUÉS del
  cutover del 3-jun (las 6 cuentas de esa fecha son una migración: entrenan desde mayo, así que
  «su primer mes» medido desde el alta no existe). La cohorte limpia:
  ```
  persona            días entrenados en sus 1os 28   dónde está hoy
  Luz                        16                      paga 130.000 · 35 sesiones
  Claudia                    15                      paga 130.000 · 35 sesiones
  Valery (auto)               7 (en 21 días)         entrena · 8 sesiones · NO paga
  Valery Valbuena             3                      SE FUE — 100.000/mes perdidos
  YEISON (auto)               3                      SE FUE — 20.000/mes perdidos
  jose Daniel, jhojan,
  Sharith, Nicolás (auto)   0-1                      muertos
  Danilo                      1 (lleva 2 días)       demasiado pronto
  ```
  **Las 2 que pasaron de 8 días siguen pagando; las 2 que no llegaron a 4 se fueron.** No hay ni
  un caso en medio. El objetivo operativo del estudio del 21-ago (8 días entrenados en el primer
  mes) **no se cae con los datos nuevos: se confirma**.

  **(e) ¿Está la app lista para recibirlos? A medias, y hay dos casos de esta misma semana.**
  - **Danilo** se dio de alta el **viernes 21-ago** y entrenó el **sábado 22**. Su plan es
    lunes-viernes: **el sábado su app no tenía nada programado** y aun así completó 23 de 23
    series — tuvo que rodear la pantalla de «día de descanso» que describe A5 H1. Le salió bien
    **porque estaba motivado y lo acababa de inscribir su coach en persona**.
  - **Chema** se dio de alta el **sábado 22-ago** por la puerta pública. Misma pantalla, sin coach
    detrás: **0 sesiones**. Y sin teléfono guardado ni push, **no hay forma de escribirle**.
  - Lo que SÍ funciona: los dos recibieron rutina (5 días) **y plan de nutrición el mismo día**
    (`user_data.nutrition`, `updated_at` 22-ago). El motor entrega; la primera pantalla no.

- **Intenté tumbarlo así:** tres intentos, y uno me cambió una conclusión de julio.
  1. *«El auto-registro sigue siendo un canal muerto»* — **ya no es cierto y hay que decirlo.**
     Valery (auto-registrada el 2-ago) lleva **8 sesiones, 6 terminadas al 100%, 7 días distintos
     en 3 semanas** y entrenó anteayer. Es **la primera auto-registrada de la historia de AVI que
     adopta**. Mi frase de julio («0 de 13 volvieron a iniciar sesión») era verdad entonces y hoy
     sería falsa. **Matiz que la sostiene igual: no paga.** El coach le puso `tier:'premium'`
     gratis, así que el canal sigue sin producir un peso desde el 1-jul.
  2. *«Danilo puede ser un traspaso de otro sistema, no una venta»* — no lo puedo descartar desde
     los datos (§Sospechas). Lo que sí es medible: su fila se creó el 21-ago y su primer pago tiene
     esa fecha, así que **para el negocio el dinero es nuevo** aunque la persona no lo sea.
  3. *«El churn del 14% está inflado: Valery Valbuena es hija del PO (email `valery@avi.com`,
     16 años)»* — es un argumento real y lo escribo aunque me quite el hallazgo: si esa cuenta es
     familiar, **el churn del nivel «coach» es 0 de 6 en 3 meses** y el negocio es aún más sano de
     lo que digo. En los dos casos, el dinero que se fue en agosto (120.000/mes entre ella y
     Yeison) es real.

- **A quién le pasa:** a Chema, hoy. Y a los próximos que lleguen por la puerta pública mientras
  la única puerta que convierte dependa de que el coach los inscriba a mano.

- **Costo del arreglo:** la palanca no es código, es **secuencia**. En orden de dinero por hora:
  1. **0 h — cobrarle a Valery.** Entrena más que 5 de los que pagan y está en `premium` gratis.
     Al piso del nivel «app» son **30.000 COP/mes**; al nivel coach, 130.000. Es la única
     conversión ya ganada que está sobre la mesa.
  2. **~3 h — auto-registro → «pedir cupo»** (recomendación de julio, sin ejecutar). El dato del
     delta la refuerza: 3 auto-registros más, 0 pesos más. Convierte un canal de 1 de 13 en el de
     10 de 10.
  3. **~2 h — que el día 1 nunca caiga en descanso** (A5 H1, mismo arreglo). Hoy le cuesta a la
     mitad de los que llegan y ya se comió a Chema.
  4. **0 h, 1 campo — teléfono obligatorio al crear un asesorado.** De las 4 altas del delta,
     **2 no tienen teléfono** y son las 2 que no arrancaron.

---
### H3 · 🟠 La vitrina pública está viva pero medio vacía: 1 tarjeta de 6, publicada anteayer, con 8 historias listas esperando. El hueco de seguridad se cerró en v525; queda el de LECTURA y hoy no muerde

- **Qué pasa:** v523 construyó el canal de venta que el PO pidió y **funciona** — hay una tarjeta
  real publicada y se sirve sin cuenta. Pero de los **6 puestos** que tiene la página, **5 están
  vacíos**, y el coach tiene **8 asesorados con historia lista**. Es la única pieza del delta
  construida para VENDER y está al 17% de su capacidad.

- **Dónde:** `app-2-login.js:1874-1897` (`renderShowcase`), `index.html:137` (`#cin-showcase`),
  `app-3-coach.js:1519-1590` (lo que publica el coach), tabla `avi_showcase`.

- **Evidencia:**

  **(a) Lo que hay publicado hoy — una fila, de anteayer:**
  ```sql
  select nombre, entrenos, meses, subieron, con_carga, created_at from avi_showcase;
  → Astrid | 48 entrenos | 3 meses | subió carga en 15 de 26 | 2026-08-22 18:49 UTC
  ```
  Una sola. `renderShowcase` pide `limit=6` (`app-2-login.js:1877`), así que **5 de los 6 huecos
  de su página de llegada están en blanco**.

  **(b) El material que NO está publicado — 8 personas con historia completa:**
  ```
  Astrid   48 sesiones · 33 récords   ← la única publicada
  Samuel   36 · 36        Claudia 35 · 29      Luz      35 · 29
  Kathe    34 · 30        Nataly  24 · 22      Natalia  18 · 18
  Miguel   14 · 23
  (Valery, 15 años, queda fuera CORRECTAMENTE por el candado de menores de v522)
  ```

  **(c) El hueco de seguridad heredado del radar: la mitad de ESCRITURA está CERRADA.**
  ```sql
  select policyname, cmd, with_check from pg_policies where tablename='avi_showcase';
  showcase_ins | INSERT | (coach_id = auth.uid()) AND private._is_moderator(auth.uid())
  showcase_del | DELETE | coach_id = auth.uid()
  showcase_sel | SELECT | true            ← anon + authenticated, a propósito
  ```
  v525 le puso el gate de moderador: **un desconocido con cuenta ya NO puede publicar** en la
  página del PO. Eso estaba abierto y hoy no lo está.

  **(d) Lo que SIGUE abierto es la LECTURA, y la asimetría se ve en el código.** El coach pide
  **sus** tarjetas filtrando (`app-3-coach.js:1530`: `.eq('coach_id', u.id)`), pero la página
  pública pide **las 6 más nuevas de la tabla entera** (`app-2-login.js:1877`), sin filtro.
  ```sql
  select count(*) from community_moderators;  → 1
  ```
  **Hoy no le pasa a nadie**: hay un solo moderador, así que las 6 más nuevas son siempre suyas.

- **Intenté tumbarlo así:** cuatro intentos.
  1. *«El hueco de lectura es un 🔴 de seguridad»* — **no lo es hoy y no lo voy a pintar así.**
     Con `_is_moderator` puesto y un solo moderador, no existe fila ajena que se pueda colar. Es
     una **bomba de relojería con fecha conocida**, no un incendio.
  2. *«Entonces no vale la pena arreglarlo»* — tampoco. El propio roadmap tiene **AVI GYM
     (white-label, piloto de 150.000 COP/mes) en curso**: el día que ese piloto tenga su coach,
     la página de venta del PO empieza a mostrar asesorados de otro gimnasio y la del otro
     gimnasio muestra a los suyos. **En dinero: cada uno le regala espacio de su vitrina al otro,
     y quien llegue por el link de uno lee resultados de gente que no es de su gimnasio.** En
     confianza: el visitante no tiene forma de saberlo.
  3. *«La vitrina no la ve nadie, da igual»* — no lo puedo medir (no hay analítica de la página de
     llegada; va a §Sospechas). Lo que sí es medible es que **se carga sin bloquear el login**
     (`app-2-login.js:1078`, sin `await`) y que **si no hay nada publicado no pinta nada**
     (`return 0` en tres ramas) — o sea que el coste de tenerla vacía es que su página vuelve a
     ser exactamente la de antes de v523: una promesa y cero pruebas. **La feature no falla:
     está sin munición.**
  4. *«Las 5 restantes no se publicaron porque el candado de menores las bloquea»* — falso: de
     las 8, **7 son adultos de 28 a 40 años**; solo Valery (15) queda fuera.

- **A quién le pasa:** al PO, cada vez que comparte el link. Y a los dos coaches de AVI GYM el día
  que sean dos.

- **Costo del arreglo:**
  - **0 h y es lo que más rinde:** publicar las otras 5-7 tarjetas. El botón ya existe en la ficha
    de cada asesorado; el tope es 6 por coach.
  - **1 línea** para el hueco de lectura: añadir `&coach_id=eq.<id>` a la URL de
    `app-2-login.js:1877`. Hoy el coach es uno solo, así que el id se puede fijar; bien hecho es
    derivarlo del enlace (`?c=<id>`), que son ~20 líneas y hace falta igual para AVI GYM.
    **No es urgente hasta que haya un segundo moderador — pero es exactamente el tipo de cosa que
    nadie recuerda el día que lo hay.**

---
### H4 · 🟠 La mitad del delta se fue en COMIDA, y lo que el asesorado toca de ahí lo usan 4 personas 5 días. El escáner de códigos de barras no lo ha usado NADIE, ni una vez

- **Qué pasa:** de los **182 commits** del delta, **90 (49%) son de nutrición/comida** y **49 (27%)
  son específicamente del registro de alimentos y su escáner**. Lo que esa cadena entrega al
  asesorado se ha usado **16 veces en total**, por 4 personas, en 5 días distintos, y **nada desde
  el 13-ago**. El escáner —cámara, cola de moderación del coach, tabla con RLS, espejo de los
  CHECK en el cliente— tiene **0 filas en producción**.

- **Dónde:** `git log --since=2026-07-31`; `avi-core.js:4336` (`NUT_FOODS`), `foods.json` (2.445
  líneas), `app-5-salud.js` (`foodLog*`/`fl*`), `supabase/community/f5_food_barcodes.sql`,
  `scripts/e2e/_verify-foodlog.mjs` (574 líneas), `scripts/e2e/_sabotaje-f7.mjs` (216).

- **Evidencia:**

  **(a) El esfuerzo, contado:**
  ```
  commits del delta (31-jul → 23-ago)                       182
    de nutrición / comida / macros / tabla de alimentos       90   (49%)
    de ellos, específicos del REGISTRO + escáner + mercado    49   (27%)
  despliegues del delta                                      45
  ```

  **(b) El uso, contado — el registro entero, desde que existe:**
  ```sql
  select nombre, dia, jsonb_array_length(entradas) from ... profile->'foodlog'->'d' ...
  Astrid Beltran   2026-08-05   1 entrada
  Astrid Beltran   2026-08-06   6
  Kathe Beltran    2026-08-10   1
  Samuel Cifuentes 2026-08-12   1
  Natalia Martinez 2026-08-13   7
  ────────────────────────────────────
  4 personas · 5 días · 16 entradas · NADA desde el 13-ago (hace 10 días)
  ```
  Desglose por vía:
  ```
  marcado del plan («✓ Me lo comí», F7/v477)   7 entradas   ← las 7 son de Natalia, un solo día
  tecleado a mano desde el catálogo             9
  escaneado con la cámara                       0
  ```

  **(c) El escáner, medido en la tabla que lo respalda:**
  ```sql
  select count(*), min(created_at), max(created_at) from food_barcodes;
  → 0 | null | null
  ```
  **Cero filas.** Ni un producto escaneado, ni uno pendiente de aprobar en la bandeja del coach.

  **(d) Y no es el único: el TRIAJE DE DOLOR (24 commits, v455 + v459-v466, con dictamen
  vinculante de Laura, 5 niveles, 4 preguntas, 7 zonas y motor de trabajo correctivo) se ha usado
  UNA vez, y fue el propio PO:**
  ```sql
  select nombre, painCare from user_data where profile ? 'painCare';
  🧪 QA HARNESS      []            ← vacío
  Samuel Cifuentes   []            ← vacío
  Andres Martínez    [{"at":"2026-08-17…","area":"codo","level":2,…}]   ← el COACH, sobre sí mismo
  ```
  **Un solo reporte de dolor en toda la base, el 17-ago, del entrenador.** De los 23 asesorados,
  cero. (`deload`: 0 personas lo tienen puesto hoy.)

  **(e) Lo que SÍ se usa de todo ese trabajo, y hay que decirlo porque es la mitad buena:**
  ```
  planes de nutrición vigentes en user_data.nutrition:  11 personas
  todos con updated_at entre el 20 y el 22-ago          ← fresco, no legacy
  incluidos Danilo y Chema, que lo recibieron el mismo día de su alta
  hábitos (agua/pasos): 7 personas, la última anotación de AYER (Luz, 22-ago)
  ```
  **El PLAN de comida se usa. El REGISTRO de comida no.** Son dos cosas distintas y el delta las
  trató como una sola.

- **Intenté tumbarlo así:** cinco intentos, y dos me obligaron a partir el hallazgo en dos.
  1. *«Los 90 commits de nutrición son todos del registro»* — **falso, y por eso el hallazgo no es
     "se perdió medio mes".** Al separarlos, 41 de los 90 son del MOTOR del plan (el piso de
     menores, el techo, la proteína, el rótulo que mentía, el plato que servía de más). Ese trabajo
     **llega a 11 personas hoy** y arregló cosas que le daban déficit a una niña de 15 años. Lo
     que no llega a nadie son los **49 del registro**.
  2. *«El registro es nuevo, hay que darle tiempo»* — nació en **v438, el 4-ago**. Lleva **19 días
     y 7 versiones de trabajo**. Su punto más alto fue el 13-ago; desde entonces, cero. **No es
     una curva que arranca: es una que ya bajó.**
  3. *«El escáner con 0 filas puede ser que la tabla no reciba»* — comprobado que no es eso: la
     tabla existe, tiene sus policies y sus CHECK, y el registro manual SÍ escribió 9 entradas por
     el catálogo en las mismas fechas. Lo que no ocurrió es que nadie apuntara la cámara.
  4. *«El dolor con 1 reporte prueba que la gente no tiene dolor, no que la feature falle»* —
     posible, y lo dejo escrito. Pero el propio CLAUDE.md dice que el motor correctivo nació de un
     caso real; con **1 uso en 24 commits** no se puede afirmar que valga lo que costó, en ningún
     sentido. Va como dato, no como condena.
  5. *«El PO decidió construir el registro contra la recomendación medida»* — **cierto, y está
     escrito**: la nota de v438 dice que se eligió «el MyFitnessPal COMPLETO contra mi
     recomendación medida», y que nacía **con criterio de corte medido**. Este informe es ese
     criterio de corte, y la cifra es 4 personas / 5 días / 0 desde hace 10.

- **Por qué NO es 🔴:** no rompe nada y no hay una persona a la que le pase algo. Es **coste de oportunidad**, y bajo la regla de este briefing eso no lleva rojo aunque sea, en plata, el hallazgo más grande del informe.

- **A quién le pasa:** al PO. No hay un usuario dañado; hay **tres semanas de su producto** puestas
  en algo que, medido, 19 de 23 asesorados no han tocado nunca. En el mismo periodo el negocio
  creció por otras dos vías —una subida de precio (0 h de código) y un cliente que él inscribió a
  mano (0 h de código)—.

- **Costo del arreglo:** **cero de código, y esa es la recomendación.**
  - **No se borra nada.** El registro no molesta: v507 ya lo bajó de la primera pantalla por
    decisión del PO, así que hoy solo lo ve quien lo busca. Desmontarlo costaría más que dejarlo.
  - **Se CONGELA**, con el mismo disparador que Comunidad: **no entra un commit nuevo del registro
    de alimentos ni del escáner hasta que 5 personas lo usen 5 días seguidos.** Hoy el récord es
    una persona, un día.
  - **Lo que sí conviene mantener del lote, porque cuesta cero y ya está hecho:** el «✓ Me lo
    comí» del plan (F7) es **un toque** y es la única vía del registro con adopción medible; y la
    **lista del mercado** (v479) es la pieza que Fitia COBRA y AVI regala. Ninguna de las dos
    necesita el escáner.
  - **Coste de mantenerlo:** ~4.800 líneas entre `foods.json`, los dos volcados de fuente, el
    harness (574) y la matriz de sabotaje (216), más 239 aserciones de la suite. No es gratis: es
    lo que hay que volver a verificar cada vez que se toque la tabla de alimentos.

---
### H5 · 🟠 Las dos predicciones de julio se cumplieron al pie de la letra: 8 personas bloqueadas el 1-ago, y el candado siguió sin morder (Claudia y Luz entrenaron vencidas). Y el 1-sep vuelve a pasar

- **Qué pasa:** no re-audito los H1/H2 de julio — mido **si lo que anuncié ocurrió**. Ocurrió las
  dos veces, y las dos con nombres.

- **Dónde:** `avi-core.js:1976-1982` (`getStatus`/`canLogin`, sin período de gracia),
  `app-3-coach.js:495-505` (donde muerde).

- **Evidencia:**

  **(a) El bloqueo del 1-ago, tal como estaba anunciado.** Días-persona con la app apagada por
  vencimiento en los 23 días del delta:
  ```
  YEISON VALBUENA   venció 31-jul   sin pago      24 días y contando
  Valery Valbuena   venció 01-ago   sin pago      23 días y contando
  Claudia Valbuena  venció 31-jul   pagó 03-ago    3
  Luz Rodríguez     venció 31-jul   pagó 03-ago    3
  Kathe Beltran     venció 01-ago   pagó 03-ago    2
  Astrid Beltran    venció 01-ago   pagó 03-ago    2
  Nataly            venció 30-jul   pagó 01-ago    2
  Natalia Martinez  venció 10-ago   pagó 12-ago    2
  Samuel Cifuentes  venció 05-ago   pagó 06-ago    1
  Miguel Pulido     venció 23-jun   «pago» de 0 el 04-ago   (4 días dentro del delta)
  ─────────────────────────────────────────────────────────
  ≈66 días-persona de bloqueo en 23 días de operación
  ```
  En julio medí **90 días-persona en 90 días**. Ahora van **66 en 23**: por día, **casi el triple**.

  **(b) Y el candado sigue sin ser un candado.** El 1-ago, con el plan **vencido el día anterior**:
  ```sql
  select nombre, fecha, count(*) from history where fecha between '2026-07-31' and '2026-08-06'
  2026-08-01  Claudia Valbuena   3 sesiones   ← plan vencido el 31-jul, pagó el 3
  2026-08-01  Luz Rodríguez      4 sesiones   ← plan vencido el 31-jul, pagó el 3
  ```
  **Siete sesiones con el plan vencido, de las dos personas de mayor adherencia del negocio**, y
  a las dos se les subió el precio dos días después sin problema.

  **(c) El coach volvió a usar el parche que ya usó dos veces:** el **tercer pago de 0 COP** de la
  historia (Miguel Pulido, 4-ago), que no es un cobro sino un «extenderle el plazo». Sigue sin
  existir el botón que lo haga bien, así que ese 0 entra en la lista de pagos del tablero.

  **(d) Se repite el 1-sep.** Vencimientos vigentes hoy 23-ago:
  ```
  Nataly            31-ago  ← en 8 días
  Kathe · Astrid · Claudia · Luz    02-sep
  Samuel            05-sep
  Natalia           11-sep
  Danilo            20-sep
  Miguel            03-sep (cortesía de 0)
  ```
  **5 de los 8 que pagan vencen entre el 31-ago y el 2-sep**, otra vez en bloque.

- **Intenté tumbarlo así:** dos intentos.
  1. *«El bloqueo sí cobró: todos pagaron a los 2-3 días»* — es la lectura más favorable y no se
     sostiene: **Claudia y Luz entrenaron igual el día que estaban vencidas**, así que para ellas
     no hubo bloqueo que las empujara. Y las dos que de verdad quedaron fuera (Yeison, Valery
     Valbuena) llevan 23-24 días bloqueadas y **no han vuelto ni han pagado**. El bloqueo recauda
     de quien iba a pagar igual y expulsa a quien dudaba.
  2. *«El candado no muerde porque la app no se actualizó»* — puede ser (A3 midió teléfonos por
     detrás), y da lo mismo para el negocio: **un candado que depende de la versión que tenga cada
     teléfono castiga al que actualiza.** Es lo mismo que escribí en julio y sigue siendo cierto.

- **A quién le pasa:** al 1-sep, a Kathe, Astrid, Claudia, Luz y Samuel; a Nataly el 31-ago.
  Y al negocio: son **560.000 COP/mes** de gente que va a ver una pantalla de plan vencido.

- **Costo del arreglo:** el mismo que estimé en julio y que sigue sin hacerse — **~2 h** para el
  estado `grace` (0-7 días vencido → entra en solo lectura, con banda y botón de WhatsApp) más
  **~1 h** del recordatorio 3 días ANTES del vencimiento. Con un matiz que el delta hace posible:
  **el recordatorio ya tiene por dónde salir** — v520 construyó `coachCanReach` y el coach ya ve
  a quién puede avisarle. De los 8 que pagan, **7 de los 8 tienen teléfono guardado**
  (medido sobre `profile.phone`); el único sin él es **Samuel**, que además es el que lleva 4
  meses pagando sin fallar una vez.

---
## Las 4 palancas del mes que viene — con costo y con métrica

| # | Palanca | Costo | Qué mueve | Cómo se mide |
|---|---|---|---|---|
| **1** | **Publicar las 5-7 tarjetas que faltan en la vitrina** (H3) | **0 h**, el botón ya existe | Es lo único del delta construido para VENDER y está al 17%. Su página de llegada vuelve a ser «una promesa y cero pruebas» mientras siga con una sola | tarjetas publicadas: hoy **1 de 6** |
| **2** | **Cobrarle a Valery** (H2) | **0 h**, una conversación | La primera auto-registrada que adopta lleva 8 sesiones en `premium` regalado. Al piso «app» son 30.000/mes; a nivel coach, 130.000 | ingreso del nivel «app»: hoy 55.000/mes |
| **3** | **Modo de gracia de 7 días + recordatorio 3 días ANTES** (H5) | ~2 h + ~1 h | El 1-sep vuelven a quedar fuera 5 de los 8 que pagan = **560.000 COP/mes** de gente viendo una pantalla de plan vencido. Y el recordatorio ya tiene por dónde salir: 7 de 8 tienen teléfono | días-persona bloqueados en septiembre. Objetivo **0**; el delta llevó **66 en 23 días** |
| **4** | **Auto-registro → «pedir cupo»** + teléfono obligatorio al crear (H2) | ~3 h + 1 campo | 3 auto-registros más en el delta, 0 pesos más. La otra puerta va **10 de 10** | de los próximos 8 que lleguen, cuántos entrenan al menos 1 vez. Hoy: **1 de 16** (Valery) |

**Y lo que hay que dejar de hacer:** **congelar el registro de alimentos y el escáner** (H4), con el
mismo disparador que se le puso a Comunidad. La regla, escrita para que sea verificable: *no entra
un commit nuevo del registro de alimentos ni del escáner hasta que 5 personas lo usen 5 días
seguidos.* Hoy el récord es **una persona, un día**.

---
## Sospechas sin probar

1. **No sé si alguien mira la vitrina.** No hay una sola métrica de la página de llegada — ni
   visitas, ni cuántos de los que la ven se registran. La feature más orientada a venta del delta
   **no tiene forma de saber si vende.** *Para probarlo: un contador anónimo (un insert a una tabla
   de conteo al pintar la vitrina, sin identificar a nadie) o un parámetro `?src=` en el link que
   el PO comparte. ~1 h, y sin él la decisión de invertir más en la vitrina es a ciegas.*
2. **Danilo puede no ser un cliente nuevo sino uno de siempre que acaba de entrar a la app.** Su
   email es del dominio que usa el coach para las cuentas que crea a mano, y pagó 150.000 el mismo
   día del alta — un cliente completamente nuevo no suele pagar el precio más alto sin probar.
   Para el flujo de caja da igual; para decir «la app captó un cliente» **no da igual**.
   *Para probarlo: preguntarle al coach si Danilo ya era su asesorado presencial.*
3. **Sospecho que el precio de 130.000 aguanta en los otros cuatro.** Claudia y Luz lo aceptaron y
   son las dos de más adherencia; Astrid y Kathe están en 150.000 y Samuel en 125.000 desde mayo,
   sin fallar un mes. **No lo recomiendo como palanca todavía**: el negocio son 8 personas y subir
   el precio a la única base sana por un +10% no compensa el riesgo mientras haya cupo libre
   (~25% de ocupación). *Para probarlo: que el precio nuevo lo estrenen los que entren, no los que
   ya están.*
4. **El pago de 0 COP de Miguel Pulido puede ser una cortesía, o puede ser que Miguel ya no sea
   cliente y el coach solo le esté dejando la app abierta.** Lleva **sin entrenar desde el 30-jun**
   (54 días) y su último pago real fueron 10.000 COP en mayo. *Para probarlo: preguntarle al coach.
   Si es lo segundo, es la primera baja del nivel «app» y hay que contarla.*
5. **El efectivo sin registrar sigue siendo el techo de todo este informe** (igual que en julio).
   De los 9 pagos de agosto, **solo 1 tiene nota** («Transferencia Nequi»). *Para probarlo: cruzar
   contra el Nequi del coach — fuera de mi alcance.*
6. **Sospecho que las 3-4 filas de auto-registrados que existían en julio y hoy no existen se
   borraron a mano** (Stevan, diana, Hernán, jose Gutiérrez: A5 los encontró en `auth.users` sin
   fila en `user_data`). Si es así, **mis cohortes y las de julio no son comparables sin decirlo**,
   y por eso el conteo de auto-registrados sigue en 13 pese a haber entrado 3 nuevos.
   *Para probarlo: preguntarle al coach si limpió la lista.*

---
## Lo que revisé y está SANO

- **El negocio creció, y creció por lo barato.** +164.000 COP/mes de base recurrente en 23 días, y
  las dos causas (subirle el precio a dos personas, inscribir a una a mano) **costaron 0 horas de
  desarrollo**. Ninguna de las 45 versiones del delta aparece en la explicación del crecimiento.
- **La puerta que convierte sigue convirtiendo: 10 de 10.** Con Danilo, las cuentas creadas por el
  coach llevan **cien por ciento de conversión a pago** en tres meses. Era el hallazgo más fuerte
  de julio y se reforzó.
- **El motor de nutrición SÍ llega a la gente.** 11 planes vigentes en `user_data.nutrition`, todos
  con `updated_at` del 20-22 de agosto, incluidas las dos altas de esta semana el mismo día de su
  registro. Los ~41 commits del motor del plan (frente a los 49 del registro) no fueron churn.
- **Comunidad: congelarla fue la decisión correcta y se cumplió.** El delta le metió
  **prácticamente 0 commits nuevos** y aun así pasó de **10 a 44 publicaciones** (8→10 perfiles, la
  última del 22-ago). De los 37 posts nuevos, **20 los provoca una persona** (19 «compartir
  entreno» + 1 rutina) y 17 los emite el servidor. **Creció sola, sin construir nada**, que es
  exactamente lo que dije que pasaría. El chat en vivo sigue en 3 mensajes de toda su vida.
- **Los hábitos siguen siendo el gesto más usado de la app:** 7 personas con agua/pasos y la última
  anotación de **ayer**. La medición que decidió la forma de la tira de chips (v504) sigue siendo
  cierta hoy.
- **Infraestructura: 0 COP/mes y sin riesgo cerca.** Supabase sigue en plan **free**; la base pesa
  **51 MB de los 500** disponibles, el storage 299 kB y hay 31 cuentas auth. Nada del crecimiento
  del delta acerca al negocio a tener que pagar.
- **El candado de menores de la vitrina funciona en producción:** de las 9 personas con historia
  suficiente para publicar, **la única menor (Valery, 15) queda fuera** y las 8 adultas dentro.
  No es teoría: es lo que hay hoy en la tabla.
- **La ocupación sigue baja, y eso es margen, no problema:** 9 personas entrenaron en los últimos
  7 días sobre un techo de 30-40 = **~25%**. El límite del negocio sigue sin ser el tiempo del coach.
- **Sin cambio (no es hallazgo nuevo, es estado):** el KPI **«Ingresos mes»** sigue sumando la caja
  del mes calendario (`app-2-login.js:1400`, `d.getMonth()===mo`) y sigue sin existir un widget de
  base recurrente. **Este mes no engaña** —todos pagaron dentro de agosto— pero el 890.000 que le
  va a mostrar incluye el pago de 0 COP de Miguel y no distingue los 835.000 que son base de los
  55.000 que son cola.

---

## Lo que NO alcancé a revisar

- **El Nequi real del coach.** Todo el dinero de este informe sale de lo que él registró en la app.
  Sigue siendo **la limitación más grande**, igual que en julio, y con 8 de 9 pagos de agosto sin
  nota es imposible cruzarlo desde aquí.
- **Si la vitrina la ve alguien.** No hay analítica de la página de llegada (§Sospechas 1). Pude
  medir su contenido y su código, no el canal.
- **AVI GYM** (`Desktop/AVI-GYM`, white-label, piloto de 150.000 COP/mes). Sigue fuera de este repo
  y sin revisar, y **sigue siendo la única vía de crecimiento que no depende de conseguir más gente
  en Guaduas**. Además es lo que dispara el hueco de lectura de la vitrina (H3): merece su propia
  revisión antes de que ese piloto tenga coach.
- **El margen por cliente.** Solo puedo medir ingreso, no las horas presenciales que el coach le
  dedica a cada uno. Sin eso, «cuánto vale un asesorado» (H2) es ingreso bruto, no margen.
- **Por qué Valery adoptó y los otros 12 auto-registrados no.** Es el caso más valioso del delta
  —la primera auto-registrada que entrena— y desde los datos no puedo separar «la app mejoró» de
  «esa persona ya venía motivada» de «el coach la contactó por fuera». Con n=1 no hay dato.
  *Para probarlo: preguntarle al coach cómo llegó.*
- **La cohorte de julio y la de hoy pueden no ser comparables** por las filas borradas
  (§Sospechas 6). No lo pude confirmar, y lo dejo dicho en vez de presentar una serie limpia que
  quizá no lo sea.
- **El abandono a mitad de entreno desde el ángulo de negocio** (¿abandonan los que luego se van?).
  Sigue sin instrumentación, igual que en julio. Lo único nuevo que se puede decir es que Valery
  **termina el 75% de sus sesiones** (6 de 8 al 100%), mejor que la media histórica.
- **No re-audité el motor deportivo, el catálogo ni la seguridad de la base** — son A1/A2/A4 de
  esta misma ronda. De la vitrina solo miré sus policies y su consulta pública porque el encargo
  lo pedía explícitamente.
