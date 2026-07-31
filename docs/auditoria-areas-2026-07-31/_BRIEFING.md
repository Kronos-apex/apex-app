# BRIEFING COMÚN — auditoría profunda por áreas de AVI (2026-07-31)

Lee este archivo COMPLETO antes de hacer nada. Aplica a todas las áreas.

## Quién eres
Al principio de tu prompt se te asigna un ARCHIVO DE ROL en
`C:\Users\KRONOS\Desktop\AVI\apex-app\.claude\agents\<nombre>.md`.
**Léelo primero**: define tu carácter, tu criterio y tu especialidad. Actúa como esa persona.

⚠️ Esos archivos de rol están DESACTUALIZADOS en un punto: dicen que el código vive en
`index.html`. **Ya no.** El código vive en 8 archivos (ver abajo). Ignora esa parte del rol,
conserva el resto.

## El producto (contexto real, no hipotético)
AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build step) que usa un coach real
—Camilo, el PO— con su gimnasio real en Bogotá. Supabase de backend. Deploy a Vercel.

**Números reales medidos el 30-jul (créelos, están verificados):**
- 22 asesorados. 14 con alguna sesión. 12 completaron al menos una. **7 activos. 8 NUNCA entrenaron.**
- Autorregistro: 13 personas → 8 sesiones → **0 activos**. El coach crea 9 → 156 sesiones → 7 activos.
- 15 de 22 son inalcanzables (sin push y sin teléfono).
- 28% de los entrenos se abandonan a mitad (avance medio 52,7%).
- Comunidad: 8 perfiles, 6 posts. Consumió el 41% de los últimos 150 commits.
- La app pesa 1,6 MB en 13 archivos.

**El problema del negocio es la ADOPCIÓN, no la falta de features.** Tenlo presente al priorizar:
un hallazgo que mueva a los 8 que nunca entrenaron vale más que uno elegante que no mueva a nadie.

## Dónde está todo
```
C:\Users\KRONOS\Desktop\AVI\apex-app\        ← repo git (limpio, en avi-v417)
  index.html          128K  cascarón + CSS + markup
  avi-core.js               lógica PURA compartida (y espejada en edge functions)
  app-1-infra.js      244K  arranque, sync nube, PWA, push
  app-2-login.js      104K  auth, registro, onboarding
  app-3-coach.js      156K  todo el panel del coach
  app-4-entreno.js    212K  motor de entreno, rutinas, modo guiado
  app-5-salud.js       64K  peso, medidas, fotos, nutrición, hábitos
  app-6-extra.js      152K  progreso, gráficas, generador de rutinas
  app-7-community.js  140K  comunidad / red social
  sw.js                     service worker (aquí vive el sello de versión avi-vNNN)
  avi.test.js               suite (482 tests)
  scripts/e2e/*.mjs         harnesses Playwright/CDP
  docs/*.md                 planes y auditorías previas
  CLAUDE.md            910 líneas — DOCTRINA + "GOTCHAS VIGENTES". LÉELO.
  docs/reglas-opus.md  contrato vinculante del proyecto
```
Supabase: proyecto `AVI-ENTRENAMIENTO`, ref `eoebhrxbokyllqalyecj`.
Tienes herramientas MCP de Supabase (`mcp__claude_ai_Supabase__*`) si tu área las necesita —
`execute_sql`, `get_advisors`, `list_tables`, `get_logs`.

## REGLAS DURAS DE ESTA AUDITORÍA

### 1. Eres READ-ONLY. No cambias NADA.
No edites archivos del repo. No hagas commits. No apliques migraciones. No despliegues.
No corras `execute_sql` con INSERT/UPDATE/DELETE/ALTER/DROP — **solo SELECT**.
Tu entregable es un informe. La ejecución la decide el PO después.
(Puedes escribir libremente en tu carpeta de scratchpad y tu informe final.)

### 2. EVIDENCIA O NO EXISTE. Esta es la regla que más se ha violado.
**Durante tres días seguidos, el hallazgo más alarmante de un informe resultó FALSO al medirlo.**
Ejemplos reales de esta misma auditoría:
- Un agente reportó «las tablas de rate-limit no tienen RLS → los límites son evadibles», y el
  **propio advisory de Supabase lo marcaba como *critical***. Se probó en vivo con
  `set local role anon; select ...` → `ERROR 42501: permission denied`. **Postgres deniega por
  PRIVILEGIO antes de mirar RLS**; los grants estaban revocados. El hallazgo era FALSO y el
  advisory MIENTE. Aplicar su `remediation_sql` habría sido churn inútil.
- Cuatro afirmaciones de la auditoría de contraste eran falsas: el error de login «estaba roto»
  y nunca lo estuvo (una cascada CSS lo repinta más abajo).
- Cuatro mediciones propias mintieron por leer el fixture y no la app real.

Por lo tanto, para CADA hallazgo:
- **Cítalo con `archivo:línea`** (o la query exacta y su salida).
- **Pruébalo.** Si es de código: el camino de ejecución que lo alcanza, o córrelo. Si es de datos:
  la query y su resultado. Si es de interfaz: la medición, no la impresión.
- **Intenta TUMBARLO antes de escribirlo.** Pregúntate: ¿qué haría que esto NO fuera cierto?
  ¿hay un guard más arriba? ¿una cascada que lo repinta? ¿un grant revocado? ¿lo tapa otro
  código? Escribe en el informe qué intentaste para refutarlo.
- Si no lograste probarlo, va en la sección **«SOSPECHAS SIN PROBAR»**, no en los hallazgos.
  Una sospecha honesta vale más que un hallazgo inflado. **No pasa nada si tienes pocos
  hallazgos.** Lo que sí es fallo es reportar humo.

### 3. Nada de teatro de severidad
No etiquetes 🔴 lo que no rompe nada real. Un 🔴 debe poder completarse la frase:
«esto le pasa a [persona real] cuando [hace X]». Si no puedes, no es 🔴.

### 4. Impacto sobre elegancia
No reportes «falta TypeScript» ni «debería usar un framework» ni «los archivos son muy grandes».
El PO es un entrenador, no una fábrica de software; la arquitectura sin build step es una
decisión deliberada. Reporta lo que **rompe, arriesga o frena la adopción**.

### 5. Costo del arreglo, siempre
Cada hallazgo lleva estimación honesta: ¿una línea de config? ¿un fix quirúrgico? ¿una semana?
Los mejores hallazgos de la ronda anterior fueron de una línea (un cron mal puesto que hacía
llegar la notificación 1 hora tarde respecto al pico real de entrenos).

## FORMATO DEL INFORME (obligatorio)
Escribe UN archivo markdown en la ruta que te indica tu prompt. Estructura:

```
# Auditoría: <TU ÁREA> — <tu nombre de rol>

## Veredicto en 5 líneas
(lo que un PO ocupado necesita saber; si el área está sana, DILO)

## Hallazgos verificados
### H1 · 🔴|🟠|🟡 <título en una línea>
- **Qué pasa:** ...
- **Dónde:** archivo:línea (o query)
- **Evidencia:** (la prueba concreta — salida, camino de ejecución, medición)
- **Intenté tumbarlo así:** ... y sobrevivió porque ...
- **A quién le pasa:** ...
- **Costo del arreglo:** ...

## Sospechas sin probar
(lo que huele mal pero NO pudiste demostrar, con lo que faltaría para probarlo)

## Lo que revisé y está SANO
(explícito: sirve tanto como los hallazgos, y evita re-auditar lo mismo)

## Lo que NO alcancé a revisar
(honestidad de alcance — di dónde se quedó tu barrido)
```

## Presupuesto
La ronda anterior de esta auditoría **murió por límite de gasto de la cuenta**. Sé eficiente:
apunta al grano de tu área, no leas los 1,6 MB completos, usa Grep con criterio.
**Si sientes que te estás quedando sin espacio, ESCRIBE TU INFORME YA** con lo que tengas
y marca claro en «Lo que NO alcancé a revisar» dónde te quedaste. Un informe parcial entregado
vale infinitamente más que uno completo que nunca se escribió.
