# 🧠 Metodología de trabajo en AVI — cómo se caza un bug, cómo se mata de raíz y cómo se piensa cada área

> Escrito el 2026-07-11 a pedido explícito de Camilo:
> *"quiero que dejes instrucciones de cómo hacer las auditorías tal cual las haces tú
> cazando bugs antes de salir a producción y arreglando o quitando esos bugs de raíz y
> arreglando eso que causó esos bugs… quiero que dejes instrucciones muy claras de cómo
> trabajar en cada aspecto de AVI, en cada área, tal cual como hiciste hoy en el diseño y
> mejora de la interfaz que fuiste a ver todas las apps para incluir lo que nos hace falta.
> Ese nivel de inteligencia es el que quiero que utilices siempre."*
>
> **Esto NO reemplaza la doctrina de `CLAUDE.md` §🛡️ — la OPERACIONALIZA.** La doctrina
> dice *qué* es inaceptable; este documento dice *cómo* se hace el trabajo bien, con los
> casos reales de la sesión v314→v316 como material de estudio. Cualquier modelo/sesión
> que trabaje en AVI lo aplica. No es decorativo.

---

## 0. La regla madre: el nivel de inteligencia no es opcional

Camilo es entrenador, no ingeniero. **No va a atrapar tus errores.** Si algo llega roto a
producción lo sufren personas reales que le pagan y le erosionan la confianza a él. Por eso
el estándar no es "funciona en mi prueba", es **"lo verifiqué como si nadie fuera a
revisarme — porque nadie lo hará"**.

Ese estándar se sostiene con tres hábitos que se ven en cada parte de este documento:

1. **Antes de construir, mirá afuera.** Para interfaz fuimos a ver Strong, Hevy, Fitbod,
   Nike Training Club — no para copiar, para saber qué barra es "premium" y qué nos falta.
   El benchmarking es pensamiento, no adorno: convierte "se me ocurrió" en "esto es lo que
   la categoría ya resolvió y nosotros no".
2. **Antes de casarte con una decisión, previsualizá variantes.** No entregues la primera
   idea; genera 2-4 y compáralas con los ojos (previews visuales, mockups). La variante
   tímida casi nunca es la premium.
3. **Antes de desplegar, intentá romperlo tú mismo.** El QA que no encuentra nada casi
   siempre es un QA que no buscó. En v314→v316 el QA encontró **6+ bugs/avisos reales**
   antes de que Camilo los viera. Ese es el trabajo, no un trámite.

---

## PARTE 1 — CAZA DE BUGS ANTES DE PRODUCCIÓN (la auditoría pre-deploy)

### 1.1 Filosofía: encontrar el bug es más barato que enviarlo

Un bug atrapado en el harness cuesta 5 minutos. El mismo bug en producción cuesta: un
asesorado confundido → un mensaje a Camilo → Camilo perdiendo confianza en la app →
una sesión de emergencia. **Siempre es más barato buscarlo antes.** Por eso ninguna
capa de QA es "opcional porque el cambio es chiquito" (§🛡️.7 guardrails).

### 1.2 Las capas de QA — en orden, de más barata a más cara

Ninguna reemplaza a la otra; cada una atrapa una clase distinta de fallo.

| Capa | Qué atrapa | Cómo se corre | No-negociable |
|---|---|---|---|
| **1. Unitaria** (`node avi.test.js`) | lógica pura rota (core, rank, agregados, membresía) | siempre, antes Y después de editar | 297/297 — el hook check 11 falla si baja |
| **2. Hook pre-commit** (`python scripts/hooks/pre-commit`, 11 checks) | secretos, IDs duplicados, bump par `?v`/`CACHE_NAME`, SB_KEYS, sintaxis | automático en cada commit | bloquea el commit si falla; **JAMÁS** `--no-verify` |
| **3. Smoke** (`scripts/smoke.mjs`) | "¿carga la app? ¿están los módulos?" gate rápido | antes del harness | ojo: usa `openGuidedMode` como sonda — no lo borres sin actualizar el smoke |
| **4. Suite guiada** (53 checks) | regresión en la ZONA CALIENTE (entreno guiado, timers, navegación) | **si el cambio toca CSS/JS del guiado** | 53/53 |
| **5. Harness por feature** (`scripts/e2e/_verify-vNNN.mjs`) | **el bug específico de ESTA feature**, con shots revisados a ojo | uno nuevo por cada feature | verde + shots mirados, no solo "corrió" |
| **6. Subagentes QA** (Julián estático + Lucas funcional) | lo que un humano crítico ve y un script no: sobrepromesas, edge cases de UX, código huérfano | **antes de todo deploy** (§🤖 pipeline) | ambos 🟢 o no se despliega |
| **7a. Verificación en prod — archivo** (`curl` a Pages con nocache) | "¿de verdad salió el archivo?" — Pages tarda en propagar | después del push, poll hasta ver `?v=NNN` + `avi-vNNN` | **NUNCA** decir "está en producción" sin esto |
| **7b. Verificación en prod — arranque** (`node scripts/e2e/_prodcheck.mjs <vNNN>`) | "¿la app ARRANCA sin errores contra la URL real?" (el curl solo ve el archivo, no que boote) | después del 7a; headless contra prod, espera el boot REAL (`_aviUpdateBusy`, no el DOM), afirma versión + login/core + cero errores JS | adoptado 2026-07-12; "está en producción" = 7a **Y** 7b verdes |

### 1.3 Cómo se construye un harness por feature (el corazón de la caza)

Un harness NO es "abrir la app y mirar". Es un script CDP que **reproduce la feature de
forma determinista y afirma lo que debe ser verdad**. Patrón (ver cualquier
`scripts/e2e/_verify-vNNN.mjs` reciente como plantilla):

1. **Levanta la app** en un puerto http local (878x) + Chrome headless con puerto de
   debug (928x) y perfil temporal. Conéctate por WebSocket + `Runtime.evaluate`.
2. **Pon la app en el estado exacto** que ejercita la feature. Para features del asesorado
   sin quemar login real, **fuerza `s-client` con `CUR`/`DB` fake** (patrón `_verify-gamif`,
   `_verify-v315` preview sin login). Para el coach, login QA de coach (`~/.avi/qa-accounts.txt`).
3. **Afirma con checks nombrados** (A1…, P1…, R1…, Q1…). Cada check es una condición
   booleana con un nombre que dice qué protege. Un check que falla debe **señalar el bug**,
   no solo "algo salió mal".
4. **Incluye el caso que probablemente rompe**, no solo el happy path: nombre larguísimo,
   lista vacía, 3 taps en <500ms, asesorado sin coach, foto que no existe. Los bugs viven ahí.
5. **Toma screenshots** de los estados clave, en **ambos temas**, y **míralos con los ojos**.
   El shot A5 de v314 mostró un hueco de 55px que ningún assert booleano habría detectado.
6. **Espía los efectos secundarios**, no solo el DOM: en v316 el harness interceptó
   `pushToClient` para probar que el chip realmente notifica al coach (check Q). Un botón
   que "se ve bien" pero no dispara su efecto es un bug silencioso.

**Regla de oro de los harness:** si un check espía CONTENIDO que puede cambiar (p. ej.
`_verify-news.mjs` afirma textos de `AVI_NEWS`), esa expectativa está **atada** — cuando
cambies el contenido, actualiza el harness en el MISMO commit. Un harness que valida algo
viejo es peor que no tenerlo.

### 1.4 Cómo se usan los subagentes QA (Julián y Lucas) — paso obligatorio

Los agentes de rol en `.claude/agents/` existen, pero en la práctica se invocan como
**subagentes `general-purpose` con un prompt que carga el rol**, porque encuentran cosas
que los scripts no ven. Se lanzan **antes de cada deploy** (§🤖):

- **Lucas (QA funcional)** — *"sos un tester funcional despiadado. Tomá esta feature
  [diff/descripción], enumerá los flujos reales y los edge cases de UX, e intentá
  romperla desde la perspectiva del asesorado/coach. Reportá visibilidad DOM, estados
  vacío/offline/extremo, y cualquier cosa que la app le prometa al usuario que no puede
  cumplir."* → Lucas cazó en v316 que la slide de novedades **le prometía chat a un
  asesorado libre** que no lo tiene, y el CTA lo estrellaba contra el candado.
- **Julián (QA estático)** — *"sos un auditor de código estático. Revisá sintaxis, IDs
  duplicados, funciones huérfanas, allowlists que quedaron apuntando a nada, `esc()`
  faltante en innerHTML con datos de usuario, SB_KEYS, y cualquier secreto. No corrás la
  app; leé el código."* → Julián cazó el doble rebote de la animación (v314), el allowlist
  `_NT_ACTIONS` con entradas muertas (v316) y el quirk de prototipo en `EX_IMG_NAME` (v315).

**No los saltes "porque el cambio es simple".** El pipeline dice explícitamente: ni
hotfixes, ni cambios de texto, se despliegan sin ambos 🟢.

### 1.5 Casos de estudio REALES de esta sesión (así se ve la caza funcionando)

- **El pop que nunca corría (v314).** El micro-rebote al marcar serie no aparecía. El
  check P3 del harness lo delató: la animación efectiva era `checkDone`, no `gmPop`. Causa:
  `.gm-check.checked{animation:checkDone}` ganaba por **orden de hoja**. Sin el harness,
  "se ve que funciona a veces" habría pasado. → fix de raíz en §2.
- **El hueco de 55px (v314).** Yo había "arreglado" el sticky midiendo `top:55px` porque
  asumí que la barra superior taparía las anclas. El **shot A5**, mirado a ojo, mostró un
  hueco vacío de 55px. Diagnóstico sin login reveló que el scroller es `.cnbody` y la barra
  queda FUERA → `top:0` era lo correcto. Lección: **el assert no ve maquetación; el ojo sí.**
- **La mancha invisible (v315).** La foto de rutina a opacidad .42/.34 era casi invisible.
  El **preview de 4 variantes × 2 temas** (sin login) mostró que la variante tímida no era
  premium; ganó la de opacidad completa con máscara. Lección: **previsualizá antes de casarte.**

---

## PARTE 2 — MATAR EL BUG DE RAÍZ (y arreglar lo que lo permitió)

Camilo fue explícito: no basta con quitar el bug, hay que **arreglar lo que lo causó** para
que la clase entera no vuelva. Este es el protocolo (§🛡️.3 hecho procedimiento):

### 2.1 Los 6 pasos, sin saltos

1. **Reproducir primero.** Harness CDP o repro manual documentada. Sin repro no hay fix
   (única excepción: evidencia forense clara, tipo telemetría + datos de nube). Si no lo
   podés reproducir, no entendés el bug todavía.
2. **Causa raíz, no síntoma.** Preguntá "¿por qué?" hasta llegar al **diseño que lo
   permitió**. Un `if` defensivo sin entender el porqué NO es un fix, es basura acumulada.
   - *Pop no corría* → ¿por qué? la animación efectiva es otra → ¿por qué? dos reglas
     compiten por `animation` → ¿por qué ganó la vieja? **por orden de hoja / especificidad.**
     Ahí está la causa, no en "agreguemos !important".
3. **El fix elimina la causa Y la CLASE.** Preguntá: *¿dónde más existe este mismo patrón?*
   - El quirk de `EX_IMG_NAME[nombre]` heredando del prototipo no se parcha solo en
     `exImgSrc`: se audita **todo lookup por-nombre** (`exVidSrc`, `exIcon`, cualquier mapa)
     y se mata con `Object.hasOwn` / `Object.create(null)`. Esa es la CLASE.
4. **Arreglá lo que PERMITIÓ el bug** (el paso que Camilo subraya). No solo el efecto: la
   condición estructural.
   - El doble rebote no se tapó escondiendo la animación: al retirar `.gm-pop` a los 500ms,
     `animation-name` **volvía a `checkDone` y per-spec re-arrancaba**. La causa que lo
     permitía era dejar que el nombre de animación reviviera. El fix puso `animation:none`
     inline en el timeout — mata el mecanismo, no el síntoma.
5. **Candado permanente en dos lugares:**
   - **Comentario-candado en el código**, en el sitio exacto, explicando la trampa para que
     el próximo no la repita. Ejemplo real en `app-4-entreno.js`:
     ```js
     // CANDADO: el scroll del asesorado vive en .cnbody (overflow:auto) y la barra superior
     // queda FUERA de ese scroller → top:0 (styles.css) pega la fila JUSTO debajo de la barra.
     // No poner top en px aquí: 55px dentro de .cnbody = hueco de 55px (bug cazado 2026-07-10).
     ```
   - **Check de regresión permanente** en el harness: uno que **falla sin el fix y pasa con
     él** (P6 anti-doble-rebote, N9 filtro-libre). Queda para siempre, protege contra el
     regreso.
6. **Gotcha documentado** si la lección no expira → `CLAUDE.md` §🧠 GOTCHAS VIGENTES o
   `scripts/e2e/README.md`, NO enterrado en un hito de bitácora. + verificación en prod (curl).

### 2.2 Prohibido (lo que NO es un fix de raíz)

- Código muerto comentado "por si acaso" — git history existe.
- Parche cosmético sobre el síntoma (`!important`, `try/catch` vacío que traga el error,
  `if (x) return` sin entender por qué `x`).
- "Arreglo" no reproducido.
- TODO sin tarea en el backlog.
- Aprovechar la zona caliente para un refactor no pedido (§🛡️.7).

### 2.3 Al tocar cualquier zona: la regla del boy scout

Si al pasar ves basura (código huérfano, duplicado, un gotcha sin documentar), **repórtalo
en el radar o límpialo si es seguro** — nunca lo ignores en silencio. Así el allowlist
`_NT_ACTIONS` se podó cuando quedó apuntando a ctas muertas: no era el bug del día, pero
era deuda que crecía.

---

## PARTE 3 — CÓMO PENSAR CADA ÁREA (el nivel de inteligencia por dominio)

Cada área tiene su forma de pensarla, su forma de verificarla y sus trampas conocidas.
El error es aplicar el mismo reflejo a todas.

### 3.1 🎨 Interfaz / diseño visual

- **Cómo pensarlo:** **mirá los referentes primero** (Strong, Hevy, Fitbod, Nike Training
  Club, Whoop). Preguntá "¿qué hace que esto se sienta premium y AVI no?" — jerarquía,
  microinteracciones, densidad, tipografía tabular, transiciones. Esto NO es copiar; es
  saber cuál es la barra. El estudio de interfaz (Artifact aprobado por Camilo) nació así.
- **Antes de construir:** **previsualizá 2-4 variantes × ambos temas** sin login (patrón
  `_verify-v315` preview). La primera idea rara vez es la premium; la variante tímida es
  una mancha. Elegí con los ojos, no con la teoría.
- **Cómo verificarlo:** shots claro/oscuro a 360-390px, con letra grande (`data-fs xl`),
  revisados **a ojo** (los asserts no ven maquetación). Suite 53 SOLO si tocaste CSS del
  guiado.
- **Trampas conocidas:**
  - Selectores de tema: la casa usa `html[data-theme="dark"]` (manual) +
    `@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]) }` (auto). **NO
    `body.dark`.**
  - Texto de color fijo sobre fondo variable (bug v311) — barrer ambos temas.
  - Ediciones por regex en CSS pueden **pegar dos selectores** al quitar tokens (F5b).
  - `prefers-reduced-motion`: respetarlo SIEMPRE en animaciones nuevas; el headless lo trae
    en `reduce` por defecto → emular `no-preference` para probar la animación.
  - Re-skin visual (sin capacidad nueva) **NO** lleva entrada `AVI_NEWS` (criterio v315).

### 3.2 ✨ Features del asesorado (lo que ve quien entrena)

- **Cómo pensarlo:** lógica en **función PURA en `avi-core.js`** (recibe `now`, sin efectos),
  UI aparte. Así se testea sola y no "baila" con el reloj. Patrón calcado de agua (v300),
  hábitos, rank.
- **Cómo verificarlo:** tests unitarios de la función pura (casos extremos: vacío, sin
  historial, valores límite) → **la suite no puede bajar de 297** → harness de la feature
  con shots. Barra PREMIUM completa (§🛡️.4): móvil, ambos temas, tono Sofía, estados
  no-felices.
- **AVI_NEWS (regla v302):** capacidad nueva visible al asesorado → **entrada en `AVI_NEWS`
  (app-6) + poda de viejas** + actualizar `_verify-news.mjs` (expectativas atadas). Si la
  novedad depende de tener coach, marcala `coach:true` (filtro en `renderNewsCard`) para no
  prometerle al libre algo que no tiene (lección Lucas v316).
- **Trampas conocidas:** el scroller es `.cnbody`; sticky `top:0` se pega bajo la barra.
  Campo nuevo que sincroniza → SB_KEYS. `esc()` en todo innerHTML con datos de usuario.
  Guard ANTES de limpiar inputs (el guard del textarea v316: sin sesión el texto no se
  borra en silencio).

### 3.3 📊 Panel del coach

- **Cómo pensarlo:** el coach tiene 6 paneles y un **poll que re-renderiza cada 15s** — todo
  lo que muestres debe ser **determinista y estable** o "salta" en vivo (por eso el orden de
  asesorados desempata por nombre). Zona SEPARADA del guiado → no exige la suite 53.
- **Cómo verificarlo:** login QA de coach (`~/.avi/qa-accounts.txt`, patrón `_shot-f5`),
  clientes fake inyectados, shot del estado. `_test-coach-back.mjs` (20 checks del "atrás"
  del coach) puede tener expectativas de orden — correrlo.
- **Trampas:** `COACH_SELF` chatea consigo mismo (preexistente). No romper el poll de 15s.

### 3.4 ☁️ Datos / Supabase / sync (offline-first)

- **Cómo pensarlo:** AVI es **offline-first**: localStorage manda, la nube es respaldo/sync.
  El riesgo mayor es **pisar datos buenos en la nube con datos viejos locales** (§☁️).
- **Cómo verificarlo:** campo nuevo → SB_KEYS. NUNCA tocar tablas reales desde localhost (el
  **sello v298 `cloudWriteSealed`** corta escrituras a nube en localhost — es un salvavidas,
  no lo desactives). Harness SOLO con `qa-harness@apex.com`, **jamás asesorados reales**.
- **Trampas:** el service role vive en `~/.avi/service-role.key`, **nunca en el repo**
  (público). El toast optimista offline es patrón global: el mensaje se muestra ya pero se
  reenvía al volver la señal (`_udFailedKeys`/`_flushAuthOnline`) — no lo confundas con bug.
- **RESTORE:** hay backup doble pero **nunca se ensayó restaurar** — "un backup sin restore
  probado no es un backup". Pendiente crítico (sesión D del plan): ensayar snapshot →
  `user_data` en tabla/proyecto de PRUEBA, jamás producción.

### 3.5 🔒 Seguridad

- **Cómo pensarlo:** el repo es **PÚBLICO**. Toda entrada de usuario que va a innerHTML es
  superficie XSS; todo secreto en el repo es una fuga permanente.
- **Cómo verificarlo:** inventario de `innerHTML` por módulo (estático seguro / datos
  internos / **datos de usuario**), `esc()` en los de usuario, harness con payloads
  maliciosos (`<img onerror>`, comillas) en cliente fake. Documentar el inventario para que
  el próximo barrido sea **diff, no censo** (sesión E del plan; el último pase completo fue
  v1.3 y la app creció ×3).
- **Trampas:** lookup por-nombre que hereda del prototipo (`Object.hasOwn`). 2FA de GitHub
  y Supabase **solo Camilo puede** — recordárselo cada sesión.

### 3.6 💬 Contenido / tono (Sofía)

- **Cómo pensarlo:** todo texto visible al asesorado es **humano, cálido, español
  colombiano, cero jerga técnica**. Un error técnico ("Error 500") en la cara del usuario es
  un fallo de la barra premium.
- **Cómo verificarlo:** leelo como si fueras el asesorado nervioso en su primer día. Los
  estados no-felices (vacío, error, offline) también llevan tono Sofía y un mensaje
  accionable.
- **Trampas:** cambio de texto legal → subir `LEGAL_V`. Cambio de texto **igual pasa por
  Lucas + Julián** — ni los cambios de texto se despliegan sin QA.

### 3.7 💪 Deportivo / clínico

- **Cómo pensarlo:** cualquier pedido con lesión/dolor/limitación física → **Laura
  (fisioterapeuta) audita PRIMERO y su veredicto es vinculante** (§🩺). Rutinas/ejercicios →
  Coach Pro valida. Mujer → Valery. Hipertrofia/nutrición/macros → Andrés (Hyp).
- **Cómo verificarlo:** el ruteo del pipeline (§🤖) es automático por señal en el pedido —
  no inventes rutinas sin el agente que corresponde.
- **Trampas:** escribir a Supabase datos de un asesorado con limitación sigue el
  procedimiento seguro (§🩺 Paso 5).

### 3.8 💼 Negocio / producto

- **Cómo pensarlo:** las decisiones de **producto** son de Camilo (finales); las **técnicas**
  son tuyas y las defendés con evidencia. Feature nueva → Valentina prioriza; no construyas
  el toggle/opción que Camilo no pidió (YAGNI) — **preguntá antes de construir** lo que es
  decisión de producto (ej.: ¿orden alfabético opcional? ¿meta de pasos 8.000?).
- **Trampas:** no metas features en un solo commit; no "aproveches" para refactors no
  pedidos.

---

## PARTE 4 — EL ESTÁNDAR, EN UNA PÁGINA

Antes de decir "listo", pasá esta lista mental. Es la diferencia entre juguete y premium.

- [ ] **¿Miré afuera?** Para algo visual/UX, ¿sé cuál es la barra de los referentes?
- [ ] **¿Previsualicé variantes?** ¿Elegí con los ojos, no con la primera idea?
- [ ] **¿Intenté romperlo yo?** Harness con el caso feo + shots mirados a ojo + Lucas + Julián.
- [ ] **¿El bug lo maté de raíz?** Reproducido → causa (el "por qué" hasta el diseño) →
      clase entera → lo que lo permitió → candado en código + check permanente + gotcha.
- [ ] **¿Cumple la barra premium?** Móvil 360px, táctil ≥36px, ambos temas, tono Sofía,
      estados no-felices, timers por timestamp, `esc()`.
- [ ] **¿QA completo?** Unitaria 297/297 · hook 11/11 · smoke · suite 53 si toca guiado ·
      harness de la feature · Lucas 🟢 · Julián 🟢.
- [ ] **¿AVI_NEWS?** Capacidad nueva visible → entrada + poda + `_verify-news`. Re-skin → no.
- [ ] **¿Verifiqué en PRODUCCIÓN?** `curl` a Pages, `?v=NNN` + `avi-vNNN`, no "debería estar".
- [ ] **¿Dejé el rastro?** Bitácora (hito) · CLAUDE.md (contexto vivo) · README e2e (gotcha) ·
      memoria de sesión · **RADAR honesto** (máx 5, o "radar limpio").

Si algo de esta lista no se cumple y lo despachás igual, no fue una sesión de AVI: fue una
sesión de juguete, que es exactamente lo que Camilo pidió no volver a recibir.

---

*Documento vivo. Se actualiza cuando aparece una clase nueva de bug, una técnica de
verificación nueva o un área nueva. Ver también: `CLAUDE.md` §🛡️ (doctrina), `docs/plan-sesiones.md`
(qué hacer), `scripts/e2e/README.md` (cómo correr los harness), `docs/bitacora.md` (qué pasó).*
