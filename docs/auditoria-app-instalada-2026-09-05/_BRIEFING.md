# BRIEFING COMÚN — auditoría «AVI como app instalada» (2026-09-05)

Lee este archivo completo antes de hacer nada. Aplica a las 3 áreas (B1, B2, B3).

## Por qué existe esta ronda

La ronda del 1-sep cubrió 9 áreas (código, base de datos, móvil, deportivo, experiencia,
negocio, legal, web de venta, comunidad). **Los tres informes que tocaban el teléfono dicen lo
mismo en su sección «Qué NO miré»:**

- A3-móvil: *«Ningún dispositivo real (Android ni iPhone)… Entrega real de push: solo miré el
  código del lado del cliente y la tabla de suscripciones… TWA/Play Store: es territorio de
  otra área.»*
- A1-código: *«No revisé `activate_public_profile` ni `delete-account` a fondo.»*
- A2-base de datos: *«No revisé a fondo `send-push`, `delete-account` ni `refresh_snapshot`.»*

O sea: **la app se distribuye como app instalada en teléfonos y esa superficie no la ha
auditado nadie nunca.** Esta ronda es exactamente ese hueco.

## El producto

AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build) de **Camilo Andrés**,
entrenador personal independiente en Guaduas, Cundinamarca. Backend Supabase, deploy a GitHub
Pages (`https://kronos-apex.github.io/apex-app/`), empaquetada además como **TWA** para Android.

**El problema del negocio es la ADOPCIÓN.** Un hallazgo que devuelva a alguien que dejó de
entrenar vale más que uno elegante que no mueva a nadie. Y hay un techo medido: **13 de 22
personas son inalcanzables** (sin push y sin teléfono guardado) — por eso esta ronda importa.

## BASELINE MEDIDO HOY (5-sep-2026) — créelo, NO lo vuelvas a medir

Lo midió el orquestador contra producción. Si tu área necesita un número de aquí, úsalo. **Si tu
trabajo lo contradice, dilo explícitamente: eso es un hallazgo en sí mismo.**

**Código y despliegue**
- HEAD limpio en **avi-v573**, suite **1037/1037** verde, hook 12/12, `_prodcheck 573` verde.
- Módulos: `avi-core.js` 9.985 · `app-4-entreno.js` 3.891 · `app-3-coach.js` 3.780 ·
  `app-6-extra.js` 3.049 · `app-5-salud.js` 2.451 · `app-7-community.js` 2.230 ·
  `app-2-login.js` 2.172 · `app-1-infra.js` 1.985 · `sw.js` 131.
- 6 edge functions: `activate_public_profile` (80 líneas), `coach-create-client` (128),
  `daily-notifs` (474), `delete-account` (111), `refresh_snapshot` (238), `send-push` (164).

**Errores REALES registrados en producción (tabla `app_errors`, 15 filas)**
🔴 **12 de los 15 son `Failed to update a ServiceWorker for scope (…/apex-app/)`**, repartidos en
**10 builds distintos**: v481, v483, v501, v506, v512, v543, v547, v563 (×2), v564 (×2), y más.
Del **13-ago al 3-sep**. Nadie los ha mirado nunca.
🔴 Los otros 3 son `Uncaught SyntaxError: Unexpected end of input` en v470, v479 y v507 — la
firma de un archivo JS que llegó **cortado**.

**Push (tabla `push_subscriptions`)**
- **13 suscripciones de 11 personas.** 12 son FCM (Chrome/Android) y **1 es Apple** — o sea que
  sí hay al menos un iPhone real en producción.
- Todas frescas: ninguna con `updated_at` de más de 30 días; la última es de hoy (5-sep).
- Columnas: `id, client_id (text), subscription (jsonb), updated_at, training_days, training_shift`.

**Gente (tabla `user_data`, 28 filas)**
- Descuenta siempre las filas de harness («🧪 QA HARNESS», «🧪 QA COACH») — **no son personas**.
- 1 coach real: Andres Martínez (`0a6484ed-42af-449d-9903-e440ac683ecf`).

**Proyecto Supabase:** `eoebhrxbokyllqalyecj` (nombre AVI-ENTRENAMIENTO). Hay un segundo
proyecto `yndpryhirbhlhlkmxyyv` (AVI-GYM) que **no** es el de producción de la app.

## REGLAS DURAS

1. 🔒 **SOLO LECTURA contra producción.** SELECT sí; INSERT/UPDATE/DELETE, migraciones y
   despliegues, **jamás**. Son datos de 24 personas reales que le pagan al PO.
2. 🔒 **NO toques código del repo.** Esta ronda es de diagnóstico. Nada de commits.
3. 🔒 **Un hallazgo sin evidencia verificable no es un hallazgo.** Cada uno lleva: archivo y
   línea, o la consulta SQL con su resultado, o la salida del comando. Nombres de función y de
   columna **verbatim** — si escribes un nombre que no existe, el hallazgo entero queda en duda.
4. 🔒 **Intenta TUMBAR tu propio hallazgo antes de escribirlo**, y escribe cómo lo intentaste.
   Si no lo pudiste tumbar, dilo. Si sí, no lo reportes.
5. 🔒 **Distingue «no hay víctima hoy» de «no pasa nada».** Las dos cosas se reportan, pero
   marcadas distinto: el PO decide con esa diferencia.
6. ⚠️ **Cuidado con las sondas propias.** En este repo, en un solo día, tres hallazgos resultaron
   ser defectos de la propia sonda. Toda medición lleva **control de discriminación** (¿esto
   distingue de verdad los dos casos?) y **control de cobertura** (¿estoy midiendo algo, o el
   cero sale porque no leí nada?). Un cero sin control no vale.

## CÓMO ENTREGAS (esto es obligatorio y va primero)

**Antes de investigar nada, CREA tu archivo de informe con el esqueleto de secciones vacío.**
Luego ve rellenándolo a medida que encuentras, no al final. Si te quedas sin presupuesto a mitad
de camino, lo que ya escribiste se conserva y la ronda no se pierde.

Tu archivo: `docs/auditoria-app-instalada-2026-09-05/<TU-CÓDIGO>.md`

Secciones, en este orden:

```
# <código> · <área> — <tu nombre de rol>
## Veredicto en una frase
## Los 3 más grandes
   (cada uno: qué es · evidencia con archivo:línea o SQL · cómo intenté tumbarlo · qué cuesta arreglarlo)
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
