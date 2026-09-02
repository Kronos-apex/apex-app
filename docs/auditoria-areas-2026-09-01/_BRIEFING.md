# BRIEFING COMÚN — auditoría por áreas de AVI (2026-09-01)

Lee este archivo COMPLETO antes de hacer nada. Aplica a las 9 áreas.

## Quién eres
Al principio de tu prompt se te asigna un ARCHIVO DE ROL en
`C:\Users\KRONOS\Desktop\AVI\apex-app\.claude\agents\<nombre>.md`.
**Léelo primero**: define tu carácter, tu criterio y tu especialidad. Actúa como esa persona.

⚠️ Los archivos de rol están DESACTUALIZADOS en un punto: dicen que el código vive en
`index.html`. **Ya no.** Vive en 10 archivos JS (ver abajo). Ignora esa parte, conserva el resto.

## El producto
AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build) de **Camilo Andrés**,
entrenador personal independiente en Guaduas, Cundinamarca. Supabase de backend, deploy a
GitHub Pages. Hay además una **web de venta** en otro repo (`../avi-web`, Next.js, Vercel).

**El problema del negocio es la ADOPCIÓN, no la falta de features.** Un hallazgo que mueva a
alguien que nunca entrenó vale más que uno elegante que no mueva a nadie.

---

## BASELINE MEDIDO HOY (1-sep-2026) — créelo, no lo vuelvas a medir

Lo midió el orquestador contra producción. **Si tu área necesita un número que esté aquí, úsalo.
No gastes tokens re-midiéndolo.** Si tu trabajo lo contradice, dilo explícitamente — eso es un
hallazgo en sí mismo.

**Código**
- HEAD limpio en **avi-v563**. Suite **972/972 verde** (`node avi.test.js`).
- Tamaños: `avi-core.js` 9.318 líneas · `app-4-entreno.js` 3.816 · `app-3-coach.js` 3.449 ·
  `app-6-extra.js` 2.973 · `app-7-community.js` 2.230 · `styles.css` 2.242 · `index.html` 1.997 ·
  `avi.test.js` 14.247.

**Gente (tabla `user_data`)**
- **25 filas de asesorado — pero una es el harness de QA** («🧪 QA HARNESS (no borrar)»).
  **Personas reales: 24.** Si tu métrica divide por el total, descuéntala.
- **1 coach real**: Andres Martínez (`0a6484ed…`), dueño de 23 asesorados. La segunda fila con `role=coach` es `🧪 QA COACH (harness)` — **no es una persona**. (Corregido por A2 el 1-sep; el borrador decía «2 coaches» y era falso.)
- **1 asesorado con `coach_id` nulo.**
- 25 de 25 tienen rutina. **16 tienen alguna sesión.** **318 sesiones** en total.
- 15 tocaron la app en los últimos 14 días.
- **14 auto-registrados / 9 creados por el coach** (+ el harness).
- Claves útiles de `profile`: `consent`, `courtesy`, `payments`, `tier`, `suspended`, `selfReg`,
  `painCare`, `phone`, `age`, `deload`, `genPrefs`, `habits`, `wantsCoach`.
  ⚠️ **NO existen `plan`, `planStatus` ni `planEnd`** — si buscas el vencimiento, está en otra
  parte (probablemente `payments` o la fila del coach en `apex_data`). No inventes la clave.

**Consentimiento (medido — es de A7, no lo pises)**
- **Solo 4 de 25 tienen la clave `consent`**, y los 4 son auto-registrados creados el 20-jul o
  después. **Los 9 que creó el coach tienen cero.** **4 son menores de edad** (15, 16, 16 y 17).
- `payments` presente en 11 · `courtesy` en 1 · `painCare` en 2.

**Alcanzabilidad (el techo de todo)**
- **8 con teléfono · 9 con push · 15 INALCANZABLES (60 %)** — sin push y sin teléfono.
- `push_subscriptions`: **12 filas / 10 client_id distintos** → quedan 2 duplicados vivos
  después de v535.

**Comunidad**
- 44 publicaciones · 10 perfiles · 24 miembros de gimnasio · 22 reacciones · **1 comentario** ·
  4 mensajes · 5 follows · **0 reportes de moderación**.

**Otros**
- `avi_showcase`: **6 filas** (la vitrina quedó llena 6/6).
- `food_barcodes`: **0 filas** — el escáner de códigos de barras no se ha usado nunca.
- `app_errors`: 16 filas.

**Una pista de seguridad ya triada (no la repitas como hallazgo nuevo)**
- El advisor de Supabase marca **crítico**: RLS desactivada en `_cm_rate`, `_cpost_rate`,
  `_cc_rate` (los contadores de rate-limit de comunidad). **Lo verifiqué: NO hay ningún `grant`
  a `anon` ni a `authenticated` sobre esas tres tablas**, así que hoy no son alcanzables con la
  clave pública. Queda como deuda para A2: hoy lo que protege es la revocación de grants, no una
  política — un `grant` futuro las abre sin que nada avise.

---

## EL DELTA QUE SE AUDITA: v528 → v563 (36 versiones)

La ronda anterior (22/24-ago, `docs/auditoria-areas-2026-08-22/`) auditó **v418 → v527**.
**No re-audites nada anterior a v528** salvo que tu hallazgo del delta te obligue a bajar ahí.

**Superficie NUEVA que nadie ha mirado todavía:**

| Versión | Qué entró |
|---|---|
| v528 | Siete días de gracia al vencer el plan |
| v529/v530 | El peso no sube hasta consolidar (umbral 3, decisión del PO) |
| v531 | La puerta del día 1 deja de estar cerrada el 43 % de los días |
| v532 | La descarga se programa (fecha, duración, a varios de una pasada) |
| v533 | La duración deja de mentir; se retira la promesa que no se sostenía |
| v534 | El gate del arranque dejaba pasar el caso que existe para cazar |
| v535 | Los 8 avisos duplicados de Nataly |
| v536 | El nivel se corrige también hacia atrás |
| v537/v538 | Higiene de candados; el reorden se perdía al recargar |
| **v539/v540** | **Cortesía («a esta persona no le cobro») y recordatorio de renovación 3 días antes — el módulo de plata es NUEVO** |
| v541 | La app dice qué versión trae cada teléfono |
| **v542/v543** | **La página pública que abre el link, con su puerta + el enlace a la web de venta** |
| v544/v545 | La racha desbordaba; en HIIT el tiempo lo decide el protocolo, no el reloj |
| **v546** | **El codo se podía declarar y no filtraba nada (dictamen de Laura)** |
| **v547-v550** | **REPOBLACIÓN DEL CATÁLOGO: 247 → 374 ejercicios (+127) en 4 lotes** |
| v551 | El aviso diario leía una copia congelada del plan |
| v552 | Quien se registra solo con una lesión: no se le miente ni se le esconde |
| v553 | «Trabajamos sin carga» ahora es verdad en los 374; la vitrina filtra por coach |
| v554 | Tres ejercicios de peso corporal dejaban de pedir kilos |
| v555/v556 | El objetivo en la tarjeta pública; la tarjeta se aplastaba |
| v557/v558 | «Comunidad» sin ficha de ayuda; un ejercicio renombrado contaba doble |
| v559 | Capturas del diálogo de instalación |
| v560-v563 | Fechas del eje ilegibles; saludo duplicado; texto sobre foto; login sin red |

---

## LOS PUNTOS MUERTOS QUE ESTA RONDA EXISTE PARA CERRAR

Conté las menciones en los 6 informes de agosto. Estos son huecos **reales**, no sospechas:

1. **`avi-web` (la web de venta): 0 menciones en las 6 áreas.** Nunca entró en el esquema.
2. **Legal y datos personales: 0 menciones en las 6 áreas.** Los 4 documentos de `legal/`
   siguen rotulados «BORRADOR pendiente de revisión de abogado», y la app guarda peso, fotos,
   medidas y salud **de menores de edad**, en Colombia.
3. **Comunidad, casi hueca:** A4 la mencionó **0 veces**, A5 **una**. Son 2.230 líneas vivas.
4. **Nada se ha probado nunca en un iPhone.** No hay uno en el banco de pruebas.

---

## Dónde está todo
```
C:\Users\KRONOS\Desktop\AVI\apex-app\        ← repo git (limpio, avi-v563)
  index.html          cascarón + markup
  avi-core.js         lógica PURA compartida (espejada en edge functions)
  app-1-infra.js      arranque, sync nube, PWA, push
  app-2-login.js      auth, registro, onboarding, página pública
  app-3-coach.js      panel del coach, visor legal, pagos
  app-4-entreno.js    motor de entreno, rutinas, modo guiado
  app-5-salud.js      peso, medidas, fotos, nutrición, hábitos
  app-6-extra.js      progreso, gráficas, generador de rutinas
  app-7-community.js  comunidad
  muscle-map.js / exercise-muscles.js   mapa muscular
  sw.js               service worker (aquí vive el sello avi-vNNN)
  avi.test.js         suite (972 tests)
  scripts/e2e/*.mjs   harnesses Playwright/CDP + sabotajes
  legal/*.md          términos, política de datos, consentimiento
  docs/               planes, bitácora (885 KB) y auditorías previas
  CLAUDE.md           DOCTRINA + GOTCHAS VIGENTES. LÉELO (406 KB — usa grep, no lo leas entero).
../avi-web/           web de venta (Next.js). Auditada aparte el 30-ago: docs de esa ronda
                      en ese repo. NO ha entrado nunca en el esquema por áreas.
```
Supabase: proyecto `AVI-ENTRENAMIENTO`, ref **`eoebhrxbokyllqalyecj`**.
Tienes MCP de Supabase (`mcp__claude_ai_Supabase__*`) si tu área lo necesita.

---

## REGLAS DURAS

### 1. Eres READ-ONLY. No cambias NADA.
No edites archivos del repo. No commits. No migraciones. No despliegues.
**Solo `SELECT`** en `execute_sql` — jamás INSERT/UPDATE/DELETE/ALTER/DROP.
Tu entregable es un informe. La ejecución la decide el PO después.
Puedes escribir libremente en tu scratchpad y en tu archivo de informe final.

### 2. EVIDENCIA O NO EXISTE — la regla que más se ha violado
Todo hallazgo lleva: **`archivo:línea`** o la consulta SQL que lo produjo, **el número medido**,
y **«intenté tumbarlo así»**. Un hallazgo sin intento de refutación no se entrega.
Si no lo pudiste medir, va en una sección aparte: **«Sospechas sin medir»**. No las mezcles.

### 3. Tu sonda también puede estar rota
Este repo ya pagó tres veces por esto: en un solo día, **tres «hallazgos» resultaron ser defectos
del instrumento**, no de la app. Reglas aprendidas, obligatorias:
- Toda sonda lleva **control de discriminación** (¿detecta el defecto si lo introduzco?) y
  **control de cobertura** (¿está mirando lo que creo?).
- Se lee **solo lo visible** (`innerText` de elementos pintados), nunca regex sobre el HTML ni
  texto de nodos ocultos.
- Sin `<meta viewport>` el navegador maqueta a 980 px y tu medición de móvil es basura.
- Cuidado con SQL: un subselect que referencia una columna que no existe en la tabla interna
  **se resuelve contra la tabla externa en silencio** y te da todo verde. (Me pasó hoy midiendo
  el push: dio «0 inalcanzables»; los reales son 15.)

### 4. Un gate que aprueba el defecto es peor que no tener gate
Si auditas una prueba, un harness o un candado: **sabotéalo**. Si sigue en verde con el defecto
metido, ese es tu hallazgo, y pesa más que diez cosméticos.

### 5. Nada de complacencia
Si tu área está sana, **dilo con números** — eso vale. Lo que no vale es rellenar con hallazgos
menores para que la lista parezca larga. Un informe de 3 hallazgos ciertos vence a uno de 15
tibios.

---

## FORMATO DEL INFORME

Escribe **un solo archivo**: `docs/auditoria-areas-2026-09-01/<TU-CODIGO>.md`.

```markdown
# <Código> · <Área> — <tu nombre y rol>

## Veredicto en una frase
(Lo que un PO ocupado necesita saber. Si el área está sana, dilo.)

## Los 3 más grandes
1. 🔴/🟠/🟡 **Titular en lenguaje de producto** (qué ve o sufre una persona real)
   - Evidencia: archivo:línea / SQL / medición
   - Intenté tumbarlo así: ...
   - Qué cuesta arreglarlo: (líneas, o «decisión del PO»)

## Todos los hallazgos
(mismo formato, ordenados por daño ÷ costo)

## Sospechas sin medir
(lo que huele mal pero no pude probar — separado, honesto)

## Qué NO miré y por qué
(**obligatorio**. Lo que un auditor no alcanza a decir que no miró es lo que queda sin anotar.)
```

Prioriza por **daño al negocio ÷ costo de arreglo**, no por elegancia.
Habla en español colombiano, lenguaje de producto. El PO es entrenador, no desarrollador.
