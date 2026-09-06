# BRIEFING COMÚN — auditoría «el entreno en vivo, el arranque y el panel» (2026-09-06)

Lee este archivo completo antes de hacer nada. Aplica a las 3 áreas (C1, C2, C3).

El PO pidió esta ronda con dos palabras: **«auditorías serias, nada genérico»**. Eso no es un
adorno del encargo: es el criterio con el que se va a juzgar tu informe. Ver «Qué es un hallazgo
serio» más abajo.

---

## Por qué existe esta ronda, y por qué ESTAS tres áreas

El área nueva se elige leyendo la sección «Qué NO miré y por qué» de las rondas anteriores. Hay
cinco rondas ya hechas (`docs/auditoria-areas-2026-07-31/`, `-08-22/`, `-09-01/`,
`docs/auditoria-v507-2026-08-21/`, `docs/auditoria-app-instalada-2026-09-05/`). Lo que dicen sus
propias limitaciones:

- **A5-experiencia (1-sep):** *«Las otras 17 personas con al menos 1 sesión: no recorrí su
  experiencia después del día 1 — mi mandato era la superficie nueva y el camino de quien nunca
  vuelve, no un recorrido completo de retención.»* y *«El wizard de registro paso a paso: leí
  solo los pasos con datos personales.»*
- **A4-deportivo (1-sep):** audita el motor que GENERA rutinas y el catálogo. **Nadie ha
  auditado nunca lo que pasa mientras alguien entrena.**
- **B3-servidor (5-sep):** *«No miré `coach-create-client`: no estaba en mi mandato»* y *«No
  perseguí a fondo el camino de login por email/contraseña para confirmar si tiene o no un
  self-heal equivalente al de "Continuar con Google" — quedó como sospecha, no como hallazgo.»*
- Y el panel del coach **nunca ha sido un área**. Se han auditado el negocio (A6, tres veces) y
  la experiencia del asesorado (A5), pero no la herramienta que el PO abre todos los días.

O sea, los tres huecos: **el entreno en vivo (C1) · el camino desde que existe una cuenta hasta
el primer entreno completo (C2) · el panel del coach (C3).**

---

## El producto

AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build, un solo `index.html` +
9 módulos `app-*.js` + `avi-core.js`) de **Camilo Andrés**, entrenador personal independiente en
Guaduas, Cundinamarca. Backend Supabase, deploy a GitHub Pages
(`https://kronos-apex.github.io/apex-app/`), empaquetada además como TWA para Android.

**Arquitectura que hay que tener en la cabeza:** es *offline-first*. `localStorage` es la fuente
de verdad y sincroniza HACIA Supabase; el teléfono PISA al servidor. Cada persona escribe su
propia fila de `user_data` (`profile`, `routines`, `history`, `prs`, …). Eso significa que un
dato que solo vive en memoria, o que solo se escribe «al terminar», se pierde de verdad.

**El problema del negocio es la ADOPCIÓN.** Un hallazgo que devuelva a alguien que dejó de
entrenar, o que haga que un entreno empezado se termine, vale más que uno elegante que no mueva
a nadie.

---

## BASELINE MEDIDO HOY (6-sep-2026) — créelo, NO lo vuelvas a medir

Lo midió el orquestador contra producción con SQL de solo lectura. Si tu área necesita un número
de aquí, úsalo tal cual. **Si tu trabajo lo contradice, dilo explícitamente: eso es un hallazgo
en sí mismo.**

**Estado del repo**
- HEAD limpio en **avi-v578** (desplegado hoy: la vitrina de tarjetas salió de la pantalla de
  inicio y quedó solo en la web de venta). Suite **1046/1046** en los dos husos, hook 12/12,
  `_prodcheck 578` verde con `jsErrors: []`.
- Módulos: `avi-core.js` ~9.950 · `app-4-entreno.js` ~3.896 · `app-3-coach.js` ~3.746 ·
  `app-6-extra.js` ~3.049 · `app-5-salud.js` ~2.451 · `app-7-community.js` ~2.230 ·
  `app-2-login.js` ~2.135 · `app-1-infra.js` ~1.985 · `sw.js` 161.

**Gente (tabla `user_data`, 28 filas)**
- Descuenta SIEMPRE las filas de harness («🧪 QA HARNESS», «🧪 QA COACH») — no son personas.
  Filtro que usé: `profile->>'name' not ilike '%QA%'`.
- 1 coach real: **Andres Martínez** (`0a6484ed-42af-449d-9903-e440ac683ecf`). 25 asesorados.
- **8 de los 25 nunca han entrenado** (`history` vacío).
- Proyecto Supabase de producción: **`eoebhrxbokyllqalyecj`** (AVI-ENTRENAMIENTO). El otro
  (`yndpryhirbhlhlkmxyyv`, AVI-GYM) NO es este producto.

**El entreno (para C1, pero léelo todos)**
- **418 sesiones en total, de 18 personas.** El campo `finishedAt` existe desde v367 (13-jul).
- Desde el 13-jul: **282 sesiones y 213 cerradas → 69 sin cerrar, el 24,5%.**
- Repartidas MUY desigual:
  | persona | sesiones | sin cerrar | % | sin cerrar últimos 30d |
  |---|---|---|---|---|
  | **Nataly** | 21 | **20** | **95%** | 9 |
  | Andres Martínez (el coach) | 42 | 11 | 26% | 4 |
  | Natalia Martinez | 25 | 8 | 32% | 3 |
  | Astrid Beltran | 37 | 6 | 16% | 3 |
  | Luz Rodríguez | 39 | 5 | 13% | 0 |
  | Samuel Cifuentes | 16 | 5 | 31% | 0 |
  | Claudia Valbuena | 39 | 4 | 10% | 0 |
  | Kathe Beltran | 31 | 4 | 13% | 0 |
  | Valery | 14 | 2 | 14% | 1 |
  | Danilo · Yovan · Sharith · Diana | — | 1 c/u | — | 3 |
- Integridad del historial: **0 sesiones con id duplicado, 0 sin id, 0 con fecha futura.**

**Las cuentas (para C2)**
- **33 cuentas en `auth.users`** contra **28 filas en `user_data`** → **5 cuentas existen en
  auth y NO tienen fila de datos**:
  | proveedor | creada | último ingreso | confirmada |
  |---|---|---|---|
  | google (`ste***`) | 2026-06-09 | 2026-06-09 | sí |
  | google (`jos***`) | 2026-06-23 | 2026-06-23 | sí |
  | email (`val***ry@avi.com`) | 2026-07-02 | 2026-07-07 | sí |
  | google (`her***`) | 2026-07-06 | 2026-07-06 | sí |
  | email (`pin***`) | 2026-07-25 | **nunca entró** | **no** |
- 15 cuentas por Google, 18 por email/contraseña. 5 creadas en los últimos 30 días.
- **`recovery_sent_at` es NULL en las 33: nadie ha pedido nunca recuperar su contraseña.**

**El dinero y la membresía (para C3)**
- De los 25 asesorados: **3 al día** (vencimiento futuro), **8 vencidos**, **14 sin NINGÚN pago
  registrado**, 5 en tier `libre`. **Cobrado este mes según la app: $120.000.**

**Push y alcance (contexto, ya auditado el 5-sep — no lo re-audites)**
- 12 suscripciones; **las 10 personas con push son las 10 que entrenan**; solo 8 de 24 tienen
  teléfono guardado. 13 de 22 son inalcanzables. Ese techo ya está medido y reportado.

**Errores reales en producción (`app_errors`, 15 filas)** — 12 son `Failed to update a
ServiceWorker` y 3 son `SyntaxError: Unexpected end of input`. **Ya auditados y arreglados el
5-sep (v576).** No los vuelvas a reportar salvo que encuentres uno NUEVO.

---

## FALSOS POSITIVOS CONOCIDOS — si reportas uno de estos, tu informe pierde credibilidad

1. **El advisory `rls_disabled` de Supabase sobre `_cm_rate`, `_cpost_rate`, `_cc_rate`.**
   Está comprobado en vivo: esas tablas tienen los GRANTS revocados, y **Postgres evalúa
   privilegios ANTES que RLS**, así que `anon` y `authenticated` no pueden tocarlas
   (`has_table_privilege` = false en las 4 operaciones). El advisory es una plantilla que asume
   los grants por defecto. **No es un hallazgo.**
2. **`auth_leaked_password_protection`.** Es de plan Pro; la organización está en Free y el PO
   decidió no pagarlo por eso. **Cerrado, no se vuelve a poner en el radar.**
3. **La fuerza de contraseña del servidor.** Ya está configurada y verificada contra la API real
   (422 `weak_password`). Cerrado desde el 13-jul.
4. **Nutrición.** El PO la dio por CERRADA. No se abre.
5. **Comunidad.** CONGELADA por decisión del PO (medido: de 45 publicaciones, 0 las escribió una
   persona). Se mantiene, no se le añade nada. No propongas features ahí.
6. **La vitrina de tarjetas en la pantalla de inicio.** El PO la mandó HOY a la web. Si la ves
   ausente, es deliberado.

---

## Qué es un hallazgo SERIO (y qué se va a rechazar)

**SÍ es un hallazgo:**
- Algo que una persona real puede sufrir hoy, con su nombre y la consulta que lo demuestra.
- Algo que la app PROMETE por escrito y no cumple (cita el texto exacto y el archivo:línea).
- Un número que no cuadra entre dos pantallas que muestran lo mismo.
- Un camino sin salida: una acción que se puede empezar y no terminar, o un estado del que no se
  puede volver.
- Un dato que se pierde en silencio.
- Una medición que **contradice** el baseline de arriba.

**NO es un hallazgo, y no lo escribas:**
- Consejos genéricos de buenas prácticas («falta manejo de errores», «convendría refactorizar»,
  «añadir tests», «usar un framework», «mejorar la accesibilidad» sin un caso concreto).
- Cualquier cosa que ya esté escrita en **GOTCHAS VIGENTES** de `CLAUDE.md` — léelo antes de
  reportar. Si lo encuentras ahí, ya se sabe.
- Algo que ya se arregló: **verifica contra HEAD**, no contra un informe viejo. Esto ya costó
  tiempo una vez (29-ago: se reportaron dos puntos que llevaban versiones cerrados).
- Una hipótesis sin medir presentada como hecho. Para eso está la sección «Sospechas sin medir».
- «Falta X» cuando X existe con otro nombre. Busca antes de afirmar una ausencia.

**Una regla que este repo pagó caro:** *el que audita llega con hipótesis, no con hallazgos.* En
la ronda del 5-sep, dos pistas del orquestador resultaron FALSAS y las tumbaron los agentes. Se
espera lo mismo de ti en la dirección contraria: **tumba tus propios hallazgos antes de
escribirlos, y escribe cómo lo intentaste.**

---

## REGLAS DURAS

1. 🔒 **SOLO LECTURA contra producción.** `SELECT` sí. `INSERT`/`UPDATE`/`DELETE`, migraciones,
   invocar edge functions que escriban, y despliegues: **jamás**. Son los datos de 25 personas
   reales que le pagan al PO.
2. 🔒 **NO toques el código del repo.** Esta ronda es diagnóstico. Cero commits, cero ediciones a
   archivos que no sean tu propio informe.
3. 🔒 **Un hallazgo sin evidencia verificable no es un hallazgo.** Cada uno lleva: `archivo:línea`,
   o la consulta SQL con su resultado, o la salida del comando. Nombres de función y de columna
   **verbatim** — si escribes un nombre que no existe, el hallazgo entero queda en duda.
4. 🔒 **Intenta TUMBAR tu propio hallazgo antes de escribirlo**, y escribe cómo lo intentaste. Si
   lo tumbaste, no lo reportes (o repórtalo en «lo que verifiqué y está SANO», que también vale).
5. 🔒 **Distingue «no hay víctima hoy» de «no pasa nada».** Las dos cosas se reportan, marcadas
   distinto: el PO decide con esa diferencia.
6. ⚠️ **Cuidado con tus propias sondas.** En este repo, en un solo día, TRES hallazgos resultaron
   ser defectos de la sonda que los midió. Toda medición lleva **control de discriminación**
   (¿esto distingue de verdad los dos casos?) y **control de cobertura** (¿estoy midiendo algo, o
   el cero sale porque no leí nada?). **Un cero sin control no vale.**
7. ⚠️ **Si corres algo en el navegador:** los harness de `scripts/e2e/` sirven de patrón. El sello
   `cloudWriteSealed` impide escribir a producción desde `localhost`; **no lo desactives**. Y hay
   una cuenta QA sellada en `~/.avi/e2e-creds.json` — nunca uses la de un asesorado real. Ojo con
   el rate limit del login (~2-3 min entre corridas).

---

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)

**Antes de investigar nada, CREA tu archivo de informe con el esqueleto de secciones vacío.**
Luego ve rellenándolo a medida que encuentras, no al final. Si te quedas sin presupuesto a mitad
de camino, lo que ya escribiste se conserva y la ronda no se pierde. Esto no es una sugerencia:
es la razón por la que la ronda anterior entregó 3 de 3.

Tu archivo: `docs/auditoria-entreno-y-arranque-2026-09-06/<TU-CÓDIGO>.md`

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

Al terminar, tu **última respuesta** debe ser un resumen de máximo 15 líneas: el veredicto y los
3 grandes. El informe completo vive en el archivo, no en tu respuesta.

**Escribe en español de Colombia, en lenguaje de producto.** El PO es entrenador, no
desarrollador: dile qué ve la persona y qué arriesga el negocio. Los detalles técnicos van en la
evidencia, no en el veredicto.
