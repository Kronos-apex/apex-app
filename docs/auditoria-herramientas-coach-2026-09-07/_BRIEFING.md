# BRIEFING COMÚN — auditoría «las herramientas de trabajo del coach» (2026-09-07)

Lee este archivo completo antes de hacer nada. Aplica a las 3 áreas (D1, D2, D3).

El encargo del PO se juzga con el mismo criterio de la ronda anterior: **«auditorías serias, nada
genérico»**. Ver «Qué es un hallazgo serio» más abajo. Un informe lleno de buenas prácticas
genéricas se considera fallido aunque esté bien escrito.

---

## Por qué existe esta ronda, y por qué ESTAS tres áreas

El área nueva se elige leyendo la sección **«Qué NO miré y por qué»** de las rondas anteriores.
Hay seis rondas ya hechas (`docs/auditoria-areas-2026-07-31/`, `-08-22/`, `-09-01/`,
`docs/auditoria-v507-2026-08-21/`, `docs/auditoria-app-instalada-2026-09-05/`,
`docs/auditoria-entreno-y-arranque-2026-09-06/`). Lo que confiesan:

- **C3-panel-del-coach (6-sep):** *«Plantillas, Ejercicios y Mensajes (los otros 3 de los 6
  paneles del coach): con el presupuesto de esta ronda prioricé Inicio/Asesorados/Detalle»* y
  *«el detalle completo de `#p-detail` más allá de las 4 acciones frecuentes (nutrición, medidas,
  fotos, progreso por ejercicio): confirmé que están bien organizados, pero no medí su fricción
  específica»*.
- **A4-deportivo (1-sep)** audita el motor que GENERA rutinas y el catálogo como contenido
  deportivo, **nunca la herramienta con la que el coach lo edita**.
- El panel **«Cargas»** (`p-progress`, `renderProgressPanel`) **no aparece en ninguna de las seis
  rondas.** Nadie lo ha mirado jamás.
- **Mensajes** tampoco. Y es el ÚNICO canal propio que tiene el negocio: la ronda del 5-sep midió
  que **13 de 22 personas son inalcanzables** por push y teléfono. Si el chat de la app funciona,
  esa cifra cambia; si no funciona, hay que dejar de contarlo como canal.

O sea: **el coach tiene 6 paneles en su barra lateral y solo 2 se han auditado.** Esta ronda
cubre los otros cuatro y el fondo del detalle del asesorado.

| Área | Qué cubre | Quién |
|---|---|---|
| **D1** | **Mensajes**, los dos lados: el panel del coach, el chat dentro del detalle, y el chat del asesorado. Polling, badges, avisos, mezcla local/nube. | Sofía Castaño (CS) + Lucas Ortega (QA funcional) |
| **D2** | **Ejercicios y Plantillas**: el catálogo de 374, crear/editar/borrar un ejercicio, las 5 plantillas, aplicar una plantilla a un asesorado. | Valery (coach) + Julián (QA estático) |
| **D3** | **Cargas** (`p-progress`) **y el fondo del detalle del asesorado**: progreso por ejercicio, medidas, fotos, nutrición vistos POR EL COACH. | Mateo Sanín (Data) + Valentina Ríos (PM) |

---

## El producto

AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build, un solo `index.html` +
9 módulos `app-*.js` + `avi-core.js`) de **Camilo Andrés**, entrenador personal independiente en
Guaduas, Cundinamarca. Backend Supabase, deploy a GitHub Pages
(`https://kronos-apex.github.io/apex-app/`), empaquetada además como TWA para Android.

**Arquitectura que hay que tener en la cabeza:** es *offline-first*. `localStorage` es la fuente
de verdad y sincroniza HACIA Supabase; el teléfono PISA al servidor. Cada persona escribe su
propia fila de `user_data` (`profile`, `routines`, `history`, `prs`, `msgs`, `templates`,
`coach_settings`, …). Un dato que solo vive en memoria, o que solo se escribe «al terminar», se
pierde de verdad.

**Mapa de claves que importa para esta ronda** (`app-1-infra.js:152-166`):
- `ax_e` = la biblioteca de ejercicios · `ax_tpl` = las plantillas · `ax_m` = los mensajes ·
  `ax_msgreads` = qué conversaciones marcó leídas el coach · `ax_pr` = récords.
- `_COACH_SETTINGS_KEYS` mete `ax_e`, `ax_cn`, `ax_ce`, `ax_site`, `ax_nequi`, `ax_msgreads` y
  `ax_leadsdone` **dentro de la columna `coach_settings` de la fila del coach**. Hoy esa columna
  pesa **95.323 bytes**. Pregunta abierta y medible: ¿qué se sube, cuándo y cuánto?

**El problema del negocio es la ADOPCIÓN.** Un hallazgo que devuelva a alguien que dejó de
entrenar, o que le ahorre al coach una tarea que hoy hace a mano, vale más que uno elegante que
no mueva a nadie.

---

## BASELINE MEDIDO HOY (7-sep-2026) — créelo, NO lo vuelvas a medir

Lo midió el orquestador contra producción con SQL de solo lectura (proyecto
**`eoebhrxbokyllqalyecj`**, AVI-ENTRENAMIENTO; el otro, `yndpryhirbhlhlkmxyyv`, NO es este
producto). Si tu área necesita un número de aquí, úsalo tal cual. **Si tu trabajo lo contradice,
dilo explícitamente: eso es un hallazgo en sí mismo** (ya pasó el 6-sep: una medición tumbó dos
hallazgos de la auditoría anterior).

### Estado del repo
- HEAD limpio en **avi-v583**. Suite **1065/1065** en los dos husos, hook 12/12, `_prodcheck 583`
  verde con `jsErrors: []`.
- Lo desplegado esta semana que toca tu área: v579 (terminar temprano también premia), v580
  («Empujar» ya no sale sin destinatario), v581 (tope de 2 avisos en el Inicio del coach), v582
  («olvidé mi contraseña»), v583 (renovaciones pendientes al lado de las cifras).

### Gente (tabla `user_data`, 26 filas no-QA)
- Descuenta SIEMPRE las filas de harness («🧪 QA HARNESS», «🧪 QA COACH»). Filtro usado:
  `profile->>'name' not ilike '%QA%'`.
- 1 coach real: **Andres Martínez** (`0a6484ed-42af-449d-9903-e440ac683ecf`). 25 asesorados.
- **108 rutinas** repartidas entre las 26 filas.

### MENSAJES (para D1, pero léelo todos)
**95 mensajes en toda la historia de la app**, repartidos entre **10 personas de 25**.
**15 asesorados no han cruzado NUNCA un solo mensaje.**

| persona | del asesorado | del coach | último del asesorado | último del coach |
|---|---|---|---|---|
| **Samuel Cifuentes** | 27 | 13 | 2026-07-31 | 2026-07-31 |
| **Nataly** | 2 | 9 | 2026-06-14 | 2026-07-31 |
| **Miguel Pulido** | 4 | 4 | 2026-05-29 | 2026-05-29 |
| **Astrid Beltran** | 2 | 5 | 2026-06-05 | 2026-07-16 |
| **Natalia Martinez** | 2 | 5 | **2026-08-29** | **2026-05-25** |
| **Claudia Valbuena** | 5 | 2 | 2026-09-04 | 2026-09-04 (10 min después) |
| **Kathe Beltran** | 2 | 3 | 2026-08-10 | 2026-07-29 |
| **Sharith sofia** | 1 | 4 | 2026-07-20 | 2026-07-21 |
| **Cristian Sneyder** | 1 | 1 | 2026-07-11 | 2026-07-11 |
| **Luz Rodríguez** | 1 | 1 | 2026-07-16 | 2026-08-20 |
| Andres Martínez (fila del coach) | — | 1 | — | 2026-08-20 |

- **Dos personas escribieron y nadie les contestó después: Natalia Martinez (29-ago, 9 días) y
  Kathe Beltran (10-ago, 28 días).** Eso es una VÍCTIMA VIVA si el defecto está en la app (que el
  coach no lo vea); es una decisión de negocio si el coach simplemente no contestó. **D1 tiene que
  distinguir esas dos cosas y decir cuál es, con evidencia.**
- El último mensaje de todo el sistema es del **4-sep**. En 3 días no ha habido ninguno.

### EJERCICIOS Y PLANTILLAS (para D2)
- El catálogo del código (`defaultExercises`, `app-1-infra.js:1475`) tiene **374 ejercicios**:
  piernas 69 · espalda 48 · hombros 40 · glúteo 40 · core 40 · pecho 39 · bíceps 34 · tríceps 31 ·
  cardio 29 · otro 4. 8 modalidades (Compuesto, Aislamiento, Bodyweight, Funcional, Isométrico,
  Cardio, HIIT, Movilidad). **Ninguno tiene `desc` ni `descSimple` vacío.**
- El coach tiene **5 plantillas** en su columna `templates`: 4 creadas el **29-jun en 4 minutos**
  (Brazo y abdomen · Glúteo · Pierna · Pecho espalda) y 1 el **14-ago** (Tren Superior).
- ⚠️ **TRAMPA MEDIDA — no caigas en ella.** De las 108 rutinas, **CERO llevan marca de venir de
  una plantilla** (`fromTemplate`/`tplId`/`templateId` no existen en ninguna). Eso **NO prueba que
  las plantillas no se usen**: `applyTemplateToClient` (`app-2-login.js:782`) abre el editor de
  rutina nueva precargado y **no guarda ninguna marca de origen**. Es un cero sin control. Si
  quieres saber si se usan, hay que compararlas por CONTENIDO contra las rutinas reales, y decir
  con qué margen.
- La columna `coach_settings` del coach pesa **95.323 bytes** (ahí va la biblioteca entera).

### CARGAS Y EL FONDO DEL DETALLE (para D3)
Por persona (no-QA), lo que el coach tiene para decidir:

| persona | sesiones | ejercicios con récord | pesajes | medidas | fotos | días de nutrición |
|---|---|---|---|---|---|---|
| Andres Martínez (coach) | 80 | 43 | 4 | 1 | 2 | 11 |
| Astrid Beltran | 58 | 35 | 1 | 0 | 0 | 11 |
| Luz Rodríguez | 48 | 30 | 0 | 1 | 1 | 11 |
| Claudia Valbuena | 48 | 30 | 1 | 1 | 0 | 11 |
| Kathe Beltran | 44 | 31 | 3 | 1 | 0 | 11 |
| Samuel Cifuentes | 37 | 36 | 2 | 1 | 5 | 11 |
| Nataly | 28 | 22 | 2 | 0 | 0 | 11 |
| Natalia Martinez | 26 | 25 | 2 | 1 | 0 | 11 |
| Valery | 14 | 23 | 1 | 1 | 0 | 11 |
| Miguel Pulido | 14 | 23 | 2 | 2 | 2 | 11 |
| Danilo | 12 | 30 | 1 | 0 | 0 | 11 |
| (los 14 restantes) | 0-4 | 0-7 | 0-2 | 0-1 | 0-1 | 0 u 11 |

- **11 personas tienen récords de carga con volumen real; 14 no tienen prácticamente nada.**
- **Los pesajes son casi inexistentes: la mediana es 1.** Nadie se pesa dos veces.
- Medidas corporales: ya auditadas y decididas por el PO ([[medidas]] v566/v567, corte al
  28-oct). **No las re-audites como feature; sí puedes mirar cómo las VE el coach.**

### Contexto ya auditado — NO lo re-audites
- **Push y alcance (5-sep):** 12 suscripciones, las 10 con push son las 10 que entrenan, 8 de 24
  tienen teléfono, **13 de 22 inalcanzables**. Techo medido y reportado.
- **`app_errors`:** 15 filas, todas ya auditadas y arregladas el 5-sep (v576). Solo reporta uno
  NUEVO.
- **El entreno en vivo, el arranque/cuentas y el Inicio/Asesorados/Detalle-superficie:** ronda del
  6-sep, ya entregada y con 4 arreglos desplegados.

---

## FALSOS POSITIVOS CONOCIDOS — si reportas uno de estos, tu informe pierde credibilidad

1. **El advisory `rls_disabled` de Supabase sobre `_cm_rate`, `_cpost_rate`, `_cc_rate`.**
   Comprobado en vivo: esas tablas tienen los GRANTS revocados y **Postgres evalúa privilegios
   ANTES que RLS**. `anon` y `authenticated` no pueden tocarlas. **No es un hallazgo.**
2. **`auth_leaked_password_protection`.** Es de plan Pro; la organización está en Free y el PO
   decidió no pagarlo. Cerrado.
3. **La fuerza de contraseña del servidor.** Configurada y verificada contra la API real (422
   `weak_password`). Cerrada desde el 13-jul.
4. **Nutrición.** El PO la dio por CERRADA como feature. Puedes mirar cómo la ve el coach; no
   propongas rediseñarla ni tocar el motor del plato.
5. **Comunidad.** CONGELADA por decisión del PO (de 45 publicaciones, 0 las escribió una persona).
   No propongas features ahí.
6. **La vitrina de tarjetas en la pantalla de inicio.** Salió a la web de venta a propósito
   (v578). Si la ves ausente, es deliberado.
7. **«Ingresos mes» y «Activos» no miden el tecleo del coach.** La auditoría del 6-sep lo afirmó y
   **la medición contra los 26 pagos reales lo desmintió**: las fechas son reales y espaciadas, y
   el vaivén es el CICLO de renovación. v583 ya puso al lado «+N por renovar» y «+N en gracia».
   **No lo vuelvas a reportar.**
8. **Que las plantillas no dejen marca en las rutinas.** Está medido arriba y es un cero sin
   control, no un hallazgo por sí solo.

---

## Qué es un hallazgo SERIO (y qué se va a rechazar)

**SÍ es un hallazgo:**
- Algo que una persona real puede sufrir hoy, con su nombre y la consulta que lo demuestra.
- Algo que la app PROMETE por escrito y no cumple (cita el texto exacto y el `archivo:línea`).
- Un número que no cuadra entre dos pantallas que muestran lo mismo.
- Un camino sin salida: una acción que se puede empezar y no terminar, o un estado del que no se
  puede volver.
- Un dato que se pierde en silencio (esta arquitectura es offline-first: es la clase más común).
- Trabajo manual que el coach hace hoy y la app ya tiene datos para ahorrarle.
- Una medición que **contradice** el baseline de arriba.

**NO es un hallazgo, y no lo escribas:**
- Consejos genéricos de buenas prácticas («falta manejo de errores», «convendría refactorizar»,
  «añadir tests», «mejorar la accesibilidad» sin un caso concreto y una víctima).
- Cualquier cosa ya escrita en **GOTCHAS VIGENTES** de `CLAUDE.md` — léelo antes de reportar.
- Algo que ya se arregló: **verifica contra HEAD**, no contra un informe viejo. Esto ya costó
  tiempo una vez (29-ago).
- Una hipótesis sin medir presentada como hecho. Para eso está «Sospechas sin medir».
- «Falta X» cuando X existe con otro nombre. Busca antes de afirmar una ausencia.

**Una regla que este repo pagó caro:** *el que audita llega con hipótesis, no con hallazgos.* En
la ronda del 5-sep, dos pistas del orquestador resultaron FALSAS y las tumbaron los agentes. Se
espera lo mismo de ti: **tumba tus propios hallazgos antes de escribirlos, y escribe cómo lo
intentaste.**

---

## REGLAS DURAS

1. 🔒 **SOLO LECTURA contra producción.** `SELECT` sí. `INSERT`/`UPDATE`/`DELETE`, migraciones,
   invocar edge functions que escriban, y despliegues: **jamás**. Son los datos de 25 personas
   reales que le pagan al PO.
2. 🔒 **NO toques el código del repo.** Esta ronda es diagnóstico. Cero commits, cero ediciones a
   archivos que no sean tu propio informe.
3. 🔒 **Un hallazgo sin evidencia verificable no es un hallazgo.** Cada uno lleva `archivo:línea`,
   o la consulta SQL con su resultado, o la salida del comando. Nombres de función y de columna
   **verbatim**: si escribes un nombre que no existe, el hallazgo entero queda en duda.
4. 🔒 **Intenta TUMBAR tu propio hallazgo antes de escribirlo**, y escribe cómo lo intentaste. Si
   lo tumbaste, va a «lo que verifiqué y está SANO», que también vale.
5. 🔒 **Distingue «no hay víctima hoy» de «no pasa nada».** Las dos se reportan, marcadas distinto:
   el PO decide con esa diferencia.
6. ⚠️ **Cuidado con tus propias sondas.** En este repo, en un solo día, TRES hallazgos resultaron
   ser defectos de la sonda que los midió, y en la ronda del 6-sep fueron SEIS. Toda medición
   lleva **control de discriminación** (¿distingue de verdad los dos casos?) y **control de
   cobertura** (¿estoy midiendo algo, o el cero sale porque no leí nada?). **Un cero sin control
   no vale** — mira la trampa de las plantillas, arriba.
7. ⚠️ **Si corres algo en el navegador:** los harness de `scripts/e2e/` sirven de patrón. El sello
   `cloudWriteSealed` impide escribir a producción desde `localhost`; **no lo desactives**. Hay una
   cuenta QA sellada en `~/.avi/e2e-creds.json` — nunca uses la de un asesorado real. Ojo con el
   rate limit del login (~2-3 min entre corridas). Los harness comparten los puertos 8829/9349:
   **si otro agente está usando el navegador, espera o mide por código y SQL.**

---

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)

**Antes de investigar nada, CREA tu archivo de informe con el esqueleto de secciones vacío.**
Luego ve rellenándolo a medida que encuentras, no al final. Si te quedas sin presupuesto a mitad
de camino, lo que ya escribiste se conserva y la ronda no se pierde. Esto no es una sugerencia: es
la razón por la que las dos rondas anteriores entregaron completas.

Tu archivo: `docs/auditoria-herramientas-coach-2026-09-07/<TU-CÓDIGO>.md`

Secciones, en este orden:

```
# <código> · <área> — <tu nombre de rol>
## Veredicto en una frase
## Los 3 más grandes
   (cada uno: qué es · a quién le pasa HOY, con nombre · evidencia (archivo:línea o SQL con su
    resultado) · cómo intenté tumbarlo · qué costaría arreglarlo)
## Todos los hallazgos
   (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿hay víctima hoy?)
## Lo que verifiqué y está SANO (con números)
## Sospechas sin medir
## Qué NO miré y por qué
```

La última sección **«Qué NO miré y por qué» no es relleno: es como se elige la próxima ronda.**
Sé específico y honesto ahí.

Al terminar, tu **última respuesta** debe ser un resumen de máximo 15 líneas: el veredicto y los
3 grandes. El informe completo vive en el archivo, no en tu respuesta.

**Escribe en español de Colombia, en lenguaje de producto.** El PO es entrenador, no
desarrollador: dile qué ve la persona y qué arriesga el negocio. Los detalles técnicos van en la
evidencia, no en el veredicto.
