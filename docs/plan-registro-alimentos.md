# 🍽️ Registro de alimentos — plan vivo

> **Decisión del PO (2026-08-04, ratificada el 2026-08-05): se construye el registro COMPLETO
> tipo MyFitnessPal** — base grande, búsqueda libre y código de barras. Revierte la decisión del
> 2026-07-09 («no construir base de datos de alimentos»).
>
> Se le presentaron tres alcances con su costo medido y eligió el completo. **Es su decisión y va
> completa.** Este documento define QUÉ se construye, EN QUÉ ORDEN y con qué datos, más el riesgo
> que queda vivo y cómo se mide.

---

## 1. El riesgo que el PO ya conoce y aceptó

Medido el 2026-08-05 sobre la base real, la acción más barata que tiene la app —**un toque** para
sumar un vaso de agua, disponible desde el 9 de julio— da esto:

| | |
|---|---|
| Personas que la han usado alguna vez | **6 de 24** |
| Personas que nunca la usaron | **18** |
| Mejor adherencia individual (Luz) | **10 días de 27 = 37%** |
| Pasos (desde el 17-jul) | máximo **7 días**, 5 personas |
| Actividad semanal | 3-6 personas, 4-13 registros |

Un registro de alimentos pide **3-5 anotaciones diarias**, unas 25 veces más esfuerzo. El riesgo
es que se construya el módulo más grande de la app y lo use nadie.

**No se discute más — pero se MIDE.** El módulo nace instrumentado (§7): a las 3 semanas de estar
en producción se cuenta cuánta gente registró ≥3 días. Ese número decide si se invierte en las
fases de aceleración o se congela. Medir no es desconfiar de la decisión: es lo que permite
defenderla con datos en vez de con opiniones.

---

## 2. De dónde salen los alimentos (verificado el 2026-08-05)

### 2.1 Base propia de AVI → **ICBF, Tabla de Composición de Alimentos Colombianos (TCAC 2018)**
- **773 alimentos**, incluidos **95 alimentos autóctonos y las preparaciones típicas del país**.
  Es exactamente lo que a la tabla actual de 50 le falta: sancocho, bandeja, arepas, tamal.
- Es la tabla **oficial del Estado colombiano** — la misma fuente que usa la política pública de
  seguridad alimentaria. Para una app colombiana no hay fuente mejor.
- Se publica como PDF (`tcac_web.pdf`) + un portal de consulta. **Extraerla y normalizarla es
  trabajo real** (F1), no un copiar y pegar.
- 🔴 **Pendiente antes de F1:** confirmar por escrito las condiciones de reúso/cita con el ICBF.
  La página no publica una licencia explícita de datos abiertos. Es una publicación oficial y lo
  esperable es que baste con citar la fuente, pero **eso se confirma, no se asume**.

### 2.2 Productos empacados por código de barras → **Open Food Facts**
- Base colaborativa mundial con **código de barras**, gratuita y con API pública.
- 🔴 **HALLAZGO QUE CAMBIA LA ARQUITECTURA:** está bajo licencia **ODbL**, que permite uso
  comercial **pero obliga a atribución Y a compartir-igual**. Si se **fusionan** sus datos con los
  nuestros, **la base resultante hay que publicarla como datos abiertos**.
- **Decisión técnica (mía, y es la que evita el problema): NO se fusionan.** La TCAC es la base de
  AVI; Open Food Facts se **consulta en línea por código de barras** y su resultado se guarda como
  lo que es —un producto de terceros consultado— con su **atribución visible** en la pantalla
  donde aparece. Nunca entra al `foods.json` propio.
- Consecuencia honesta para el usuario: **el escaneo de código de barras necesita internet.** El
  resto del registro funciona sin conexión.

---

## 3. Restricciones de la app que este módulo NO puede romper

| Restricción | Cómo se respeta |
|---|---|
| Sin dependencias JS externas | Código de barras con **`BarcodeDetector` nativo** del navegador. Nada de librerías. |
| Offline-first | La base propia viaja en el dispositivo y la cachea el Service Worker. Solo el escaneo pide red. |
| Peso del arranque | La base **NO va dentro de `index.html`**: archivo `foods.json` aparte, versionado y cacheado igual que los módulos `app-*.js`. |
| Datos que un motor pueda necesitar | El registro va en el **historial que ya sincroniza**, jamás en una clave suelta de `localStorage` (gotcha del ánimo: lo que solo vive en el teléfono no existe para ningún motor). |
| Valores verificados contra fuente | Cada alimento guarda **de qué fuente salió**. Los gramajes por medida casera los dicta la tabla — nada de «una cucharada son 15 g» escrito de memoria (ya nos costó: la avena pesaba 5,6 y la persona servía un tercio). |
| iPhone | `BarcodeDetector` no existe en Safari → **degradación explícita** a búsqueda por texto, no pantalla rota. |

---

## 4. Fases (orden de construcción, no recortes de alcance)

### F1 · La base de datos y el buscador
Extraer la TCAC, normalizar a la forma de `NUT_FOODS`, fusionar con los 50 actuales sin duplicar,
empaquetar `foods.json` + carga por Service Worker. Buscador sin tildes y por tandas (mismo patrón
que la biblioteca de ejercicios, v405). **Sin UI de registro todavía.**
**Entregable medible:** buscar «sancocho», «arepa de huevo» o «changua» devuelve resultados con
sus macros y su fuente. Muestra verificada contra el PDF original.
**Gate:** revisión de **Andrés Hyp** sobre la tabla (decisión #1 del PO, aún sin su visto bueno).

### F2 · Registrar el día
Agregar alimentos a desayuno/almuerzo/cena/meriendas, cantidad en medidas caseras y en gramos,
editar y borrar. Suma del día contra el objetivo que ya calcula el motor, por kcal **y por macro**
(un total bueno puede tapar un macro roto). Funciona sin conexión.
**Aquí entra el pendiente `nutPortionText`** (el paso de media ración), que es de una sola función.

### F3 · Código de barras y productos empacados
`BarcodeDetector` nativo → consulta a Open Food Facts → producto con su atribución. Caché local de
lo ya escaneado. Degradación limpia donde no hay soporte o no hay red.

### F4 · Lo que ve el coach
En la ficha del asesorado: qué comió, adherencia al plan y desvío por macro. Sin esto el módulo
solo sirve al asesorado y **el coach es quien paga la app**.

### F5 · Que registrar no dé pereza
«Repetir lo de ayer», recientes, favoritos, mis recetas (combinaciones propias). Es la fase que
decide si la gente sigue registrando en la semana 3. **Su construcción depende de lo que diga la
medición del §7.**

---

## 5. Lo que se reusa (ya está construido y probado)

- `NUT_FOODS` / `NUT_FOOD_BY_ID`, `nutSolveMeal`, `nutDayPlan`, `nutPortionText` — el motor que ya
  arma el plato con gramos.
- `nutWeekTargets` / `nutBaseFor` / `nutDayNote` (v435) — el objetivo del día y de la semana,
  fuente única para las dos pantallas.
- La tarjeta de hábitos `#cn-habits` (agua y pasos) — el registro de comida es su tercer bloque.
- El patrón de buscador + tandas de 30 de la biblioteca de ejercicios (v405).

---

## 6. Decisiones que siguen siendo del PO

1. **¿El registro es para todos o solo Premium?** Hoy la nutrición está bloqueada para el tier
   libre. El registro es el módulo más caro de construir y de mantener.
2. **¿Qué ve el coach exactamente?** Ver todo lo que come una persona es íntimo. ¿El detalle
   completo, o solo adherencia y desvío por macro?
3. **La revisión de Andrés Hyp** sobre la tabla — sigue pendiente desde el 3-ago y bloquea F1.

---

## 7. Instrumentación obligatoria (parte de F2, no opcional)

Se registra, sin datos personales: cuántas personas abren el registro, cuántas guardan al menos un
alimento, cuántos días seguidos, y en qué punto lo abandonan.
**A las 3 semanas en producción:** si menos de 3 personas registraron ≥3 días, se para F5 y se
revisa el enfoque con el dato en la mano.

*Escrito el 2026-08-05 · avi-v437 en producción · autor: sesión de Opus con el PO*

---

# §8 · ESTIPULACIÓN DE FABLE (2026-08-05) — VINCULANTE (R4.2)

> Pedida por el PO antes de arrancar: *«es muy complejo y necesitamos que todo quede bien
> organizado antes de iniciar»*. Ciclo de `docs/reglas-opus.md`: **Fable planifica → Opus ejecuta
> → Fable verifica.** Desviarse de E1–E18 exige documentar la desviación y su porqué.
>
> **Verificado por Opus antes de pegar (2026-08-05):** el hallazgo H2 es REAL, no teórico —
> **41 de los 50 alimentos están referenciados por id desde `NUT_MENUS`**, el recetario que arma
> los platos en producción. Una «fusión» que renombre o pise ids rompe `nutSolveMeal`/`nutDayPlan`
> para todo el mundo.

## VEREDICTO: **APROBADO CON RESERVAS**

El plan acierta en lo difícil (fuentes verificadas, instinto correcto con ODbL, instrumentación con
criterio de corte, reuso del motor) y **calla lo que más caro cuesta después**: no define dónde vive
el registro diario ni cómo se poda, no separa el catálogo de registro del pool de recetario que ya
corre en producción, y encadena todo el módulo detrás de dos bloqueos externos (ICBF y Andrés Hyp)
que no dependen de nosotros. Nada de eso es podredumbre arquitectónica: todo es estipulable.
**Aprobado condicionado a ejecutar E1–E18 tal como están escritas y con el orden corregido de §8.3.**

## 8.1 · Los huecos, priorizados

### 🔴 H1 — El modelo de datos del registro diario NO existe en el plan
«El registro va en el historial que ya sincroniza» es una intención, no un modelo. Falta:
- **Vehículo.** Un registro de 3–5 entradas/día con snapshot de macros es **~2 órdenes de magnitud
  más grande** que `{water:{fecha:n}}`. Sin poda declarada la fila `user_data` crece sin techo, y
  **cada escritura re-sube el objeto completo** (`sv()` hace replace total, no append).
- **Merge de dos dispositivos.** La app es «localStorage pisa a Supabase». Dos dispositivos el mismo
  día = el almuerzo anotado en el teléfono A desaparece cuando sincroniza el B. **Va a pasar**, y se
  lee como «la app me borró lo que comí» — justo en el módulo que pide 3–5 toques diarios de fe.
- **Retroactividad.** Si la entrada solo referencia el `id` y luego se corrige un valor del catálogo
  (ya pasó: yuca, avena, atún), **el pasado de la persona cambia solo**. Las entradas van snapshot.

### 🔴 H2 — «Fusionar con los 50 actuales» es la frase más peligrosa del plan
Los 50 no son una tabla cualquiera: son el **pool del recetario**, referenciados **por id** desde
`NUT_MENUS` (41 de 50, verificado), con valores ya corregidos contra fuente externa. Una fusión
ingenua puede (a) pisar esos valores verificados con la variante cruda de la TCAC —reintroduciendo
la clase «un dato equivocado es internamente coherente y el sabotaje sale verde»—, o (b) meter 773
alimentos al pool del generador, donde `rol` y `maxG` son decisiones de nutrición deportiva que la
TCAC **no trae** (¿el sancocho es 'prot'? nadie lo decidió). → **Dos capas, no una fusión.**

### 🔴 H3 — El orden serializa todo detrás de dos bloqueos externos
F1, la fase más cara, está bloqueada por el ICBF **y** por Andrés Hyp: hasta que un tercero conteste
no se escribe nada, y la medición que gobierna F5 arranca semanas tarde. Además F3 (barras: mayor
riesgo técnico, sin iPhone, online-only) iba antes que F4 (el coach, **que es quien paga la app**).

### 🟠 H4 — Las decisiones del PO bloquean fases y no están atadas a un momento
La #2 (¿el coach ve el detalle íntimo?) bloquea F4 **y el modelo de datos**: si el coach no debe ver
el detalle, hay que decidirlo antes de que el detalle viaje a donde el coach lee.

### 🟠 H5 — Legal: arquitectura correcta, incompleta en un punto
- **ODbL:** no fusionar es correcto y suficiente para consultar y mostrar con atribución. Punto
  ciego: el caché de escaneados + el snapshot en el registro hacen que datos ODbL vivan en nuestro
  Supabase. Eso es uso interno y está bien **mientras nunca se re-sirva como base consultable a
  otros usuarios** — un «caché comunitario de productos escaneados» SÍ dispararía el compartir-igual.
  Queda **prohibido por escrito**, porque es la optimización «obvia» que alguien propondrá en 6 meses.
- **ICBF:** «confirmar por escrito» no tiene plazo ni plan B → bloqueo indefinido de un tercero.
- **XSS que el plan no vio:** los nombres de producto de Open Food Facts son **contenido escrito por
  desconocidos** entrando a nuestro `innerHTML`. `esc()` obligatorio.

### 🟡 H6 — Instrumentación bien concebida, sin mecánica
Si termina en tabla nueva arrastra toda la clase RLS. Salida barata: **el propio registro ES la
instrumentación**, derivada con un script read-only. Sin tabla nueva, sin telemetría personal.

### 🟡 H7 — `foods.json` y el protocolo de deploy
Entra al precache del SW, al par de bump `?v=`+`CACHE_NAME` y al hook. Y si no cargó (primera visita
sin red) la app **arranca igual** y el registro degrada con mensaje, jamás pantalla rota.

## 8.2 · Estipulaciones — se ejecutan tal como están escritas

**Modelo de datos (antes de una línea de F2):**
- **E1.** El registro vive en el **perfil propio del asesorado** (vehículo probado de `habits`/
  `painCare` → fila propia de `user_data`), clave nueva `foodlog`. PROHIBIDO en claves sueltas de
  `localStorage` y PROHIBIDO inflar `ax_c` del coach con el detalle.
- **E2.** Entrada = `{id, ts, meal, src:'tcac2018|avi50|off', foodId, name, grams, kcal, p, c, f}`,
  **snapshot denormalizado**: corregir el catálogo NO cambia lo ya registrado. Para `src:'off'`,
  además `barcode` y marca.
- **E3.** **Poda declarada y testeada:** detalle 90 días; antes de eso, resumen mensual agregado.
  Candado: test con 90 días × 5 comidas que **afirma el tamaño serializado del perfil** (umbral
  derivado midiendo, no de memoria).
- **E4.** **Merge multi-dispositivo:** función pura en avi-core que une por `id` dentro de cada día
  (unión de conjuntos; misma entrada editada = gana el `ts` mayor). Test: «dos dispositivos, mismo
  día, entradas distintas → quedan todas». Sin ella, el replace total borra comidas en silencio.

**Catálogo (F1):**
- **E5.** **Dos capas, no una fusión.** (a) `NUT_FOODS` en avi-core = pool del RECETARIO: los 50
  curados, **intactos, ids intactos**. (b) `foods.json` = catálogo de REGISTRO/búsqueda: los 50
  (mismos ids y valores) + la TCAC. **El generador de platos jamás lee `foods.json`; el buscador lee
  ambas capas.** Con esto la migración que rompe producción deja de existir por diseño.
- **E6.** En conflicto de valores, **mandan los 50 curados**. Todo conflicto >10 % en cualquier macro
  se lista en un archivo y lo revisa Andrés Hyp — nunca se resuelve en silencio.
- **E7.** Cada alimento declara `id`, macros por **100 g listo para comer** (si la TCAC da crudo se
  marca `prep:'crudo'` y el buscador lo dice — la clase yuca-cruda no vuelve disfrazada), `src` con
  referencia localizable, y medida casera **solo si la fuente la da**. Macro faltante = `null` y la
  UI dice «sin dato», **jamás 0** (0 es una afirmación; null es honestidad). Candados: muestra de
  ≥15 alimentos afirmados contra el PDF · propiedad `|kcal − (4p+4c+9f)| ≤ 15 %` sobre TODA la tabla ·
  ids únicos y los 50 legacy presentes (sabotaje: renombrar `arroz` → cae).
- **E8.** `foods.json` entra al precache, al par de bump y al hook **en el mismo commit** que lo crea.
  Peso máximo medido y anotado (>300 KB se discute compresión antes de desplegar).
- **E9.** Si `foods.json` no cargó: la app arranca, el registro degrada accionable y los 50 siguen
  disponibles. Harness que lo afirma **bloqueando el archivo por red**.

**Registro (F2):**
- **E10.** La suma del día se afirma **por macro, no solo por total**, y el test la **recalcula desde
  foods + gramos como oráculo independiente** — prohibido comparar `app.total` contra `app.total`.
  Sabotaje obligatorio: que una entrada no se cuente → el test por macro cae.
- **E11.** Estados no-felices con test: día sin registro · cantidad absurda (tope en el punto único
  de escritura, valor imposible en blanco, nunca recortado) · alimento cuyo id ya no existe (el
  snapshot pinta igual) · edición y borrado. Harness E2E nuevo y dedicado.

**Barras (F3):**
- **E12.** `esc()` en **todo** campo de Open Food Facts. La atribución «Datos de producto: Open Food
  Facts (ODbL)» se afirma **en el DOM pintado y mirando la captura**. Harness con `BarcodeDetector`
  stubbeado + degradación afirmada sin soporte (iPhone) y sin red.
- **E13.** **Prohibición ODbL por escrito:** los datos OFF viven solo como snapshots del usuario que
  escaneó y caché **local por dispositivo**. PROHIBIDO promoverlos a cualquier base compartida entre
  cuentas sin re-evaluar ODbL. Esta estipulación se copia como comentario en el código del caché.

**Legal:**
- **E14.** La solicitud al ICBF sale **esta semana** con plazo de **3 semanas**. Sin respuesta, el PO
  decide entre (a) publicar citando la fuente como obra oficial, o (b) plan B con fuente de licencia
  explícita (USDA FoodData Central, dominio público) perdiendo preparaciones típicas. El bloqueo
  indefinido no es una opción — E5 garantiza que mientras tanto se construye.

**Instrumentación:**
- **E15.** Sin tabla nueva: la adherencia se deriva del registro con `scripts/nut-adherencia.mjs`
  (read-only, versionado, escrito **en F2**). Si alguna vez se propone tabla nueva: policies
  INSERT+UPDATE+SELECT las tres y grants auditados.
- **E16.** Ver §8.4.

**Proceso:**
- **E17.** Antes de F2 se le piden al PO las decisiones **#1 (tier)** y **#2 (privacidad del coach)**
  con recomendación marcada. No se re-preguntan después.
- **E18.** Cada fase termina con veredicto de Fable antes de abrir la siguiente; barra premium
  completa por superficie; AVI_NEWS evaluado y declarado en F2; un feature = un commit; toda lógica
  nueva nace pura en avi-core.

## 8.3 · Orden corregido de ejecución

| Orden | Fase | Por qué cambia |
|---|---|---|
| 0 | **F0 — Modelo de datos + decisiones #1/#2** (E1–E4, E17) | Es lo que después cuesta 10×. Una sesión. |
| 1 | **F1a — Esquema `foods.json` + pipeline + buscador sobre los 50** | Cero bloqueo externo: esquema, SW, buscador y candados se construyen YA. |
| 2 | **F2 — Registro + instrumentación** | El flujo completo en producción con los 50; la fontanería no depende del ICBF. |
| ∥ | **F1b — Ingesta TCAC** (en PARALELO, desde que lleguen permiso + visto de Andrés) | El bloqueo externo bloquea la ingesta, no el módulo. Fix de raíz de H3. |
| 3 | **F4 — Vista del coach** | El coach paga la app: va antes que la pieza de mayor riesgo. |
| 4 | **F3 — Código de barras** | Online-only, sin Safari, riesgo alto: lo último que se ancla al esqueleto probado. |
| 5 | **F5 — Aceleradores** | Solo si §8.4 lo autoriza. |

## 8.4 · Criterio de corte (E16)

- **Reloj:** los 21 días se cuentan desde el deploy que deja **F2 + F1b juntos** en producción —
  medir adherencia con 50 alimentos castigaría al módulo por un catálogo que aún no llega
  («no encuentro sancocho» no es falta de adherencia). Lo registrado antes es señal, **no** el gate.
- **Métrica:** personas con **≥3 días distintos con ≥1 comida guardada** en 21 días, medida con
  `scripts/nut-adherencia.mjs`, no a ojo.
- **Corte:** `<3` → **F5 congelada** y sesión con el PO con el número en la mano. `≥3` → F5 procede.
- **Alarma temprana:** si a los 10 días **cero** personas guardaron siquiera una comida, no se espera
  al día 21: se le muestra al PO de inmediato.

*Estipulado por Fable, 2026-08-05. Nada de este módulo está «hecho» sin veredicto de Fable por fase.*

---

# §9 · DECISIONES DEL PO — respondidas el 2026-08-05 (E17 cumplida, NO re-preguntar)

1. **¿Quién puede usar el registro?** → **SOLO PREMIUM.** Coherente con que la nutrición completa
   ya está bloqueada para el tier libre; es el módulo más caro de construir y mantener; y el dato
   manda: las 13 cuentas auto-registradas dieron 8 sesiones y **cero** activos.
2. **¿Qué ve el coach?** → **DETALLE COMPLETO, avisado al asesorado desde el inicio.** Sin ver QUÉ
   comió, un «no cumplió» no dice si fue el pan de la noche o que no desayunó. El coach ya ve peso,
   medidas y fotos de progreso, más íntimos que un almuerzo. **La protección es la transparencia,
   no esconder el dato:** el aviso va en el momento de activar el registro, con lenguaje claro, y
   entra en el texto legal (`LEGAL_V`) — **eso es parte de F2, no un extra.**
3. **Solicitud escrita al ICBF** → pendiente del PO esta semana (E14 le pone plazo de 3 semanas).

# §10 · F0 EJECUTADA — avi-v438, en producción el 2026-08-05

Motor puro en `avi-core.js`, sin UI (código inerte hasta F2). Suite **580 → 592**, 2 sabotajes
aplicados (merge de un solo lado · poda sin resumen) que tumbaron 4 tests, `_prodcheck 438` verde.

| Estipulación | Cómo quedó |
|---|---|
| **E1** | `client.foodlog` = `{d:{'YYYY-MM-DD':[…]}, m:{'YYYY-MM':{…}}}`, en el perfil propio. Claves cortas a propósito: `sv()` re-sube el objeto ENTERO en cada anotación. |
| **E2** | `foodLogEntry()` produce el snapshot con macros ya calculados a los gramos. Corregir el catálogo NO reescribe el pasado. Macro que la fuente no trae → **`null`, jamás 0**. |
| **E3** | `foodLogPrune()` agrega al resumen mensual antes de borrar el detalle. |
| **E4** | `foodLogMerge()` une por `id` dentro de cada día; entrada editada en ambos lados → gana el `ts` mayor; resúmenes por MÁXIMO (sumarlos duplicaría el pasado). |
| **E15** | `foodLogActiveDays()` = la métrica del criterio de corte, derivada del propio registro. Sin tabla nueva. |

## 🔴 DESVIACIÓN DE E3, documentada (R4.2) — retención de 90 a 30 días

**Lo estipulado:** detalle 90 días, con el umbral de tamaño «a confirmar midiendo, no de memoria».
**Lo medido el 2026-08-05, que es lo que manda:**

| | 90 días | 30 días |
|---|---|---|
| Comida normal (5/día) | 78,0 KB | 26,0 KB |
| Peor caso, todo de código de barras | 106,6 KB | 35,5 KB |
| Tras **un año** de uso diario | — | **27,8 KB** (37,6 peor caso), estable |

Contraste con producción: **los perfiles reales pesan ~600 bytes** (Luz 600, Kathe 619) y el
historial completo de meses de entreno, 10-18 KB. A 90 días el registro multiplicaría el perfil por
más de 100 y sería, de lejos, lo más pesado de la fila — re-subido entero 3-5 veces al día.
A 30 días (misma retención que agua y pasos) queda proporcionado y **el coach conserva un mes
completo de detalle**, más de lo que revisa de una sentada. Nada se pierde: lo anterior queda en el
resumen mensual. Acotados también el nombre (48) y la marca (24) del snapshot.
**Queda a confirmación de Fable en su verificación de F0.**

# §11 · F1a EJECUTADA — avi-v439, en producción el 2026-08-05

Catálogo de búsqueda, su generador y sus candados. Suite **592 → 604**, hook **11 → 12 checks**,
`_prodcheck 439` verde, `foods.json` servido y precacheado.

| Estipulación | Cómo quedó |
|---|---|
| **E5** | `scripts/build-foods.mjs` **lee** `NUT_FOODS` y genera `foods.json`; no lo toca. Dos capas reales: el generador de platos nunca lee el catálogo de búsqueda. |
| **E7** | Cada alimento lleva su `src`, y las fuentes van documentadas dentro del propio archivo (incluida la prohibición ODbL de E13, escrita ahí para quien lo abra en 6 meses). Un macro no numérico se rechaza; el 0 solo se acepta como valor real. |
| **E8** | `foods.json` entra al precache del SW con `?v=` **en el mismo commit**. Pesa **10,9 KB** con 50 alimentos (muy por debajo del límite de 300 KB; la TCAC lo subirá y se re-mide en F1b). |
| **E9** | `foodCatalog(null)` → los 50 de avi-core. Probado con `null`, `{}`, lista vacía, tipo equivocado y basura. |
| **buscador** | `foodSearch` por tandas de 30, sin tildes, tolerando paréntesis del nombre («posta», «escurrido»), ranking empieza-por → palabra → contiene, determinista. |
| **candado nuevo** | **Check 12 del hook**: `foods.json` tiene que coincidir con su generador. Muerde si alguien edita el catálogo a mano o toca `NUT_FOODS` sin regenerar (probado saboteándolo). |

## Dos correcciones que salieron de MEDIR, no de suponer

**1. El cuadre kcal ↔ macros necesita dos umbrales, no uno.** Con solo el relativo (15%) el
validador rechazó **8 verduras sanas**: Atwater (4/4/9) sobreestima cuando hay fibra, así que la
espinaca se desvía **29% por solo 6,6 kcal** y las almendras **43 kcal por solo 7%** — un único
umbral siempre deja fuera a uno de los dos lados. Se rechaza solo si falla en los dos
(rel > 15% **y** abs > 25 kcal/100 g). 🔴 **Y queda escrito el límite honesto del candado:** NO
caza la clase de la yuca (cruda etiquetada «cocida» traía 160 kcal *con los macros de la cruda* —
cuadre perfecto). Esa clase solo la caza verificar contra la FUENTE, que es la muestra de E7 en F1b.

**2. Mi primer test del enganche con el recetario SALIÓ VERDE al sabotearlo.** Construía la lista
de ids referenciados **cruzándola contra lo que estaba probando**, así que al renombrar «huevo» el
id roto simplemente desaparecía de la lista. Reescrito leyendo la **estructura** de `NUT_MENUS`
(`pick`/`acomp`). Al arreglarlo destapó que el recetario referencia **`ensalada`, que no es un
alimento** — deliberado y ya documentado en `nutAcompMacros`, ahora es una **excepción explícita**
para que cualquier otro id colgado sí haga fallar el test.

## Deuda declarada de F1a (va en F2, no se olvida)
El **fetch** de `foods.json` y el harness que lo **bloquea por red** (E9) llegan con F2: hoy no hay
pantalla que degradar. La degradación pura ya está probada en la suite.

# §12 · F1b CON LA BASE DE EE.UU. — avi-v440, en producción el 2026-08-05

**Decisión del PO (2026-08-05):** arrancar con **USDA FoodData Central** y complementar con el ICBF
cuando llegue el permiso. El catálogo pasó de **50 a 139 alimentos**. Suite **604 → 607**.

## Por qué CURADA y no en bloque
SR Legacy trae 7.793 registros y **están en inglés**. Medido antes de importar nada: buscar
**«huevo» → 0 resultados** y **«plátano» → 0**. Volcarla cruda habría dejado el buscador **peor**
que con los 50. Además **345 son comida de bebé, 312 cadenas gringas, 954 cortes de res** que aquí
no se venden. Se importaron **89 seleccionados y traducidos**, los que llenan huecos reales de los
50 (salmón, quinua, champiñones, manzana, lácteos, semillas, embutidos…).

## Cómo queda, y por qué es re-ejecutable
- `scripts/usda-curada.mjs` — la lista curada: nombre en español + cómo se localiza el registro
  oficial + qué medida casera usar. **Editable sin tocar código.**
- `scripts/usda-resolver.mjs` — resuelve contra el volcado de la USDA.
- `scripts/foods-ingesta.json` — el resultado, que entra por el punto ÚNICO que ya existía. **La
  TCAC entrará por ahí mismo**, sin tocar nada más.
- Cada importado guarda **`FDC <id> — <descripción original>`**: se puede re-verificar contra la
  fuente en cualquier momento (E7).
- Los **gramos de cada medida casera los publica la USDA**. Si un alimento no trae la medida
  pedida, se queda **SIN medida** antes que pegarle un gramaje que no es — la clase exacta del bug
  de la avena (15 g declarados contra 5,6 g reales: la persona servía un tercio).
- Validador nuevo: **nombres repetidos**, porque dos filas idénticas en el buscador no se pueden
  distinguir.

## 🔴 Tres cosas que el proceso cazó y que yo no habría visto
1. **«Ala de pollo» resolvía a GALLINA DE GUISAR.** El filtro buscaba subcadenas y **«ste-wing»
   contiene «wing»**. Un sustantivo dentro de otro es un falso positivo silencioso — y aquí un
   falso positivo es un alimento equivocado en el plato de alguien. Ahora busca por PALABRA.
2. **«Tocineta» resolvía a manteca de cerdo (898 kcal)** y **«gaseosa» a soda de chocolate.** Por
   eso las 91 elecciones se revisaron una por una en vez de confiar en el automático.
3. **La CERVEZA la rechazó el cuadre kcal↔macros por 63%** — y tenía razón: sus calorías vienen
   del **etanol** (7 kcal/g), que no es proteína, carbohidrato ni grasa. **Nuestro modelo de datos
   no puede representarlas** y las contaría de menos sin avisar. Quedan FUERA, con el porqué
   escrito en la lista. **Limitación conocida:** quien tome cerveza el fin de semana va a
   registrar menos de lo que consumió. Si eso importa, hay que decidir si el modelo gana un campo
   para el alcohol — **es decisión de producto, no la tomo yo.**

## Lo que sigue faltando del ICBF
Las frutas y preparaciones nuestras que la USDA no tiene: **lulo, curuba, tomate de árbol,
granadilla, feijoa, borojó, sancocho, ajiaco, tamal, changua**. Por eso la carta al ICBF sigue
siendo la que completa el catálogo, aunque ya no bloquea nada.

# §13 · LA TABLA DEL ICBF, CITANDO LA FUENTE — avi-v441, en producción el 2026-08-05

**Decisión del PO (2026-08-05):** *«utiliza la lista del ICBF y cita la fuente»* — es la **opción
(a) de E14**, que Fable dejó prevista: usarla como obra oficial citándola, sin esperar la respuesta
al derecho de petición. **La carta sigue su curso** (`docs/carta-icbf-tcac.md`) y su respuesta
puede simplificar el resto del trabajo. Catálogo **139 → 181 alimentos**.

## 🔴 No hay ruta automática, y esto cambia el ritmo del trabajo
Dos hallazgos medidos antes de transcribir nada:
1. **El PDF oficial son 147 páginas ESCANEADAS COMO IMAGEN.** No tiene capa de texto: `pdftotext`
   devuelve 147 páginas vacías. Extraer los 773 alimentos automáticamente exigiría OCR, y **un
   dígito mal leído por OCR es un número falso en el plan de alguien** — exactamente la clase de
   dato que ningún test caza porque es internamente coherente (lección de la yuca).
2. **La API del portal de consulta del ICBF responde 401: exige cuenta de usuario.** Ahí me
   detuve; no se buscó forma de saltarlo.

**Consecuencia:** la tabla entra **por lotes transcritos y revisados**, leyendo las páginas. Cada
alimento guarda su **código y su página** (`TCAC 2018 (ICBF) C045, pág. 58`) para poder
re-verificarlo contra el original, y la **cita formal viaja dentro de `foods.json`**.

## Lo que entró (42, lote 1: frutas + lácteos y cerdo típicos)
Lulo · curuba · tomate de árbol · uchuva · guanábana · granadilla · chontaduro · feijoa ·
mangostino · zapote · pitahaya (amarilla y roja) · mora de Castilla · gulupa · badea · guama ·
mamoncillo · mamey · madroño · icaco · chirimoya · anón · papayuela · piñuela · pomarrosa ·
tamarindo · noni · granada · banano bocadillo · harina de banano · harina de chontaduro ·
**queso costeño · queso doble crema · suero costeño · kumis · chicharrón · pernil · costilla de
cerdo cocida · hígado de cerdo** · manteca de cerdo · aceite de palma.

**Nada de esto existe en la base de EE.UU.** — es exactamente para lo que sirve la tabla
colombiana. Los 42 pasaron el cuadre kcal↔macros **sin una sola excepción**.

## Cambios de infraestructura
- El pipeline lee **varias fuentes** (`foods-usda.json` + `foods-tcac.json`): agregar una fuente
  nueva es agregar un archivo, nada más.
- La TCAC **no publica medidas caseras**, así que estos alimentos entran **sin `un`** — antes que
  inventar un gramaje (E7). El registro pedirá gramos para ellos hasta que haya fuente.
- Suite **607 → 609**, con sabotajes que verifican que nadie pueda perder el código/página ni
  volver a nombres extranjeros.

## Lo que falta de la TCAC (lotes siguientes)
Verduras y tubérculos nativos (arracacha, cubios, ibias, ulluco, ñame, achira), cereales y
leguminosas locales, y las **preparaciones típicas** (sancocho, ajiaco, tamal, changua), que son
las que más valor agregan y no están en ninguna otra base. Va por lotes revisados, no en bloque.

## Lo siguiente: **F2 — registrar el día** (E10, E11, E15)
