# Plan de unificación: el MODO GUIADO como pantalla principal de "Hoy"

**Decisión de Camilo (2026-07-03):** unificar las dos experiencias de entrenamiento dejando
SOLO el modo guiado, como pantalla principal. La tarjeta clásica se retira al final del plan.

**Para quién es este documento:** para la sesión de Claude (Opus 4.8) que va a ejecutar el
trabajo. Léelo COMPLETO antes de tocar código. Está escrito para no cometer errores de raíz:
cada fase es pequeña, deployable por sí sola, con verificación obligatoria y con vuelta atrás.

---

## 0. Reglas de oro (NO negociables — vienen de errores reales ya cometidos)

1. **Cada fase termina deployable y desplegada.** Nada de big-bang. Si una fase no cabe en una
   sesión, se parte en dos. El deploy SIEMPRE pasa por la skill `avi-deploy` (Julián QA +
   Lucas QA en verde; sin verde no hay commit).
2. **Verificación en 3 capas antes de decir "listo"** (regla de reporte honesto):
   - `node --check` de cada JS tocado + `node avi.test.js` (267/267 hoy; si bajan, se arregla).
   - Harness E2E: `Desktop/AVI/_repro-plancha.mjs` (matriz modalidades×modos, 25 checks) y
     `Desktop/AVI/_repro-back-v243.mjs` (atrás/navegación, 17 checks). Se AMPLÍAN, no se borran.
   - Captura headless del render (Chrome del sistema `--headless=new --screenshot`; puppeteer
     NO arranca en este PC).
   Reportar a Camilo en niveles: ✅ Verificado (reproduje el flujo) / 🟡 Desplegado-falta-tu-ojo
   / ⚪ No revisado. NUNCA decir "listo" sin reproducir.
3. **Subir versión de `sw.js` (CACHE_NAME) en CADA deploy** que toque JS/CSS/HTML. Hoy va en
   `avi-v245`.
4. **Las claves de sesión no se rompen jamás**: `done_<rid>_<ei>_<si>`, logs por campo, tokens
   auxiliares `w0`/`dN` (calentamiento/dropset — NUNCA entran a volumen/récords: los bucles
   recorren solo enteros 0..sets-1). El guiado y la clásica ya comparten estas claves — esa es
   la base que hace posible la migración.
5. **Timers por timestamp absoluto** (`endAt = Date.now()+secs*1000`), nunca por ticks
   (iOS congela setInterval con pantalla bloqueada). Ya es así en todos los timers — mantenerlo.
6. **Overlays e IDs**: si un overlay pinta encima de una vista con los mismos IDs,
   `getElementById` agarra el oculto (bug real del HIIT v170 → por eso existen `gm-hiit-*`).
   Al EMBEBER el guiado esto se invierte: cuidar que no queden DOS renders simultáneos con IDs
   `gm-*` (el embebido y el overlay viejo).
7. **Botón atrás (Android/TWA)**: todo overlay sobre una vista empuja capa (`navOpenLayer`) y
   los cierres por UI pasan por `navCloseLayer`. Al volverse pantalla principal, el guiado deja
   de ser overlay → revisar qué capas empuja/consume (Fase 4).
8. **Nada de `perl -pi` / sed con tildes o emojis** (corrompe UTF-8). Ediciones con el Edit tool.
9. **No matar el Chrome del usuario** al usar el harness; los headless del harness usan
   perfiles temporales con timestamp (un perfil fijo puede quedar retenido por un zombie).
10. **Auditar datos existentes** por cada cambio de modelo (Supabase MCP, proyecto
    `eoebhrxbokyllqalyecj`, tabla `user_data` con columnas jsonb `routines/history/...`).

---

## 1. Estado de partida (2026-07-03, avi-v245)

- La CLÁSICA (`renderClientToday` + `renderClientExList`, app-4-entreno.js) es hoy la pantalla
  "Hoy": hero con botón "▶ Empezar — ejercicio a ejercicio" (abre el guiado), check-in de ánimo,
  lista de bloques por ejercicio, progreso, finalizar/reiniciar.
- El GUIADO (`openGuidedMode`/`gmRender`, app-6-extra.js) es un overlay full-screen
  (#guided-mode) sobre la clásica. Estado en el objeto global `GM`.
- avi-v245 acaba de unificar la SEMÁNTICA del cronómetro isométrico en ambos modos (banner
  ámbar + Cancelar honesto). Ver `_repro-plancha.mjs` y los hitos en CLAUDE.md.
- La gente usa mayormente la clásica (razón del cambio: dos caminos = cada bug ×2).

## 2. Inventario de paridad — qué le falta al guiado para ser LA pantalla

Portar UNA COSA POR FASE. Lo que ya está en el guiado, NO tocarlo.

| # | Feature | Clásica (hoy) | Guiado (hoy) | Acción |
|---|---------|---------------|--------------|--------|
| P1 | Check-in de ánimo (mood) + adaptación `applyMood` | ✅ `moodChooserHtml`/`pickMood` en renderClientToday | ❌ (el guiado recibe la rutina YA adaptada solo si se abre desde la clásica) | Portar: chooser al entrar a "Hoy" guiado + re-render con `applyMood` |
| P2 | Progreso del día + "✓ Finalizar entrenamiento" + "↺ Reiniciar" | ✅ (`updateClientProgress`, `finishSessionEarly`, `resetSession`) | Parcial (barra propia gm-prog; el guiado cierra con `checkAndShowCongrats` al completar todo, pero NO hay finalizar-temprano ni reiniciar) | Portar botones + asegurarse de que `saveSessionToHistory` reciba lo mismo |
| P3 | Reordenar ↑/↓ y sustituir 🔄 ejercicios (v176: las claves de sesión se MUEVEN con el índice) | ✅ `todayMoveEx`/`todaySubstitute` | ❌ | Portar (reusar las mismas funciones + `gmRender`; regenerar `GM.steps` tras mover) |
| P4 | Lastre (peso añadido) para corporal | ✅ `lastreOn`/`toggleLastre` | ❌ (gm pinta solo REPS en corporal) | Portar toggle + celda KG condicional |
| P5 | Peso sugerido por récord | ✅ `_suggestKg` | ✅ (gmSug) | Nada |
| P6 | Calentamiento por ejercicio (w0) | ✅ | ✅ (`gmAuxRowHTML`) | Nada |
| P7 | Dropsets swipe | ✅ | ✅ (v182) | Nada |
| P8 | HIIT intervalos | ✅ (`buildHiitCard`) | ✅ (`gm-hiit-*`) | Nada (al retirar la clásica, borrar `buildHiitCard`) |
| P9 | Isométrico ámbar + cancelar | ✅ v245 | ✅ v245 | Nada |
| P10 | Reset diario de sesión (`checkAndResetSession`) y `_rehomeOrphanDropsets` | ✅ (viven en el render clásico) | ❌ (dependen de que la clásica renderice primero) | Moverlos al entrar a "Hoy" (independiente del modo) |
| P11 | Fotos/miniaturas del ejercicio | ✅ (`exImgSrc` thumb) | Parcial (`exIcon`) | Portar thumb a la tarjeta gm (visual, baja prioridad) |
| P12 | Nota/why de la rutina, banner override "elegiste otra rutina" | ✅ hero | ❌ | Portar al header del guiado |
| P13 | Respiración (tarjetas + cues) | ❌ | ✅ | Nada — es la ventaja del guiado |
| P14 | Biseries ejecutadas (A1,B1,A2,B2 + transición 12s) | Solo etiqueta | ✅ | Nada |
| P15 | Marcar series FUERA de orden / uso "libre" | ✅ natural | ✅ posible (gmToggleSet en cualquier fila) pero el flujo empuja secuencia | Verificar UX: que quien solo quiere marcar rápido no se sienta forzado |

## 3. Fases (cada una = deploy propio con QA)

### F0 — Preparación y línea base (sin tocar producto)
1. Leer CLAUDE.md completo + memoria del proyecto + este plan.
2. Correr: `node avi.test.js` (esperado 267/267), `node --check` de los 7 JS,
   `Desktop/AVI/_repro-plancha.mjs` y `_repro-back-v243.mjs` en verde.
   ⚠️ Gotchas del harness: `cnTodayGuard` salta el re-render de "Hoy" (llamar
   `renderClientToday(c)` directo tras inyectar rutina de prueba); el poll de 15s pisa la
   rutina inyectada (stub `UD.loadOwn=async()=>null`); UN solo `doLogin` con espera de 60s
   (reintentarlo encima duplica `_enterAuthSession`); en esta máquina Chrome tarda (findPage
   120×500ms). ⚠️ **PUERTOS ZOMBI**: si una corrida se mata a medias (p.ej. `| head -N` corta
   el pipe), el `python -m http.server` y el Chrome headless QUEDAN VIVOS reteniendo el puerto
   → la siguiente corrida habla con la instancia muerta y "el login falla" sin ser cierto.
   ANTES de cada corrida: `netstat -ano | grep -E "9266|8766" | grep LISTENING` y matar esos
   PIDs (`taskkill //F //PID <pid>`). Nunca cortar el harness con `head`; usar `tail`.
3. Anotar en un archivo `_baseline.txt` los números (tests, checks) para comparar al final.

### F1 — Paridad dentro del guiado (overlay igual que hoy; 4-6 deploys chicos)
Orden sugerido (de menos a más riesgo): **P10 → P2 → P1 → P3 → P4 → P12 → P11**.
Para cada uno:
1. Escribir/ampliar PRIMERO el check E2E en `_repro-plancha.mjs` (rojo), luego implementar.
2. La lógica NUEVA que sea pura va a `avi-core.js` con test en `avi.test.js`.
3. No duplicar lógica: si la clásica ya tiene la función (`todayMoveEx`, `resetSession`,
   `finishSessionEarly`…), parametrizarla con callback de re-render (patrón ya usado en
   `attachDropSwipe(row,routine,ei,si,rerender)`) en vez de copiarla.
4. P10 en concreto: extraer `checkAndResetSession(routine)` + `_rehomeOrphanDropsets(todayR)`
   a un punto común que corra al entrar al tab "Hoy" ANTES de cualquier render (clásico o
   guiado), no dentro de `renderClientExList`.
5. P1 en concreto: el chooser de ánimo se muestra ANTES de arrancar (pantalla de entrada del
   guiado); al elegir, `applyMood` recalcula la rutina y se regeneran `GM.steps`.
   ⚠️ `applyMood` puede RECORTAR series → ahí actúa `_rehomeOrphanDropsets`; y si recorta con
   series ya hechas, `GM.currentStep` se recalcula con el bucle de `openGuidedMode`.
6. P3 en concreto: tras mover/sustituir hay que regenerar `GM.steps` (`guidedStepOrder`) y
   recalcular `GM.currentStep`; las claves ya se mueven con el índice (v176) — verificar con
   un check E2E de reorden con serie hecha + dropset.

### F2 — El guiado se vuelve la vista de "Hoy" (detrás de interruptor)
1. Nuevo flag por dispositivo `ax_ui_guided` (localStorage, default `'0'`).
2. Con flag ON: `cnTab('cn-today')` renderiza el guiado EMBEBIDO en `#cn-today-body`
   (no overlay): `gmRender` recibe un contenedor destino; `#guided-mode` deja de usar
   `position:fixed` cuando está embebido (clase `gm-embedded`). El botón "▶ Empezar" desaparece
   (ya estás dentro); el header del guiado absorbe el hero (nombre de rutina, pills, nota/why).
3. Con flag OFF: todo exactamente como hoy (la clásica intacta). **El flag es el kill-switch.**
4. ⚠️ Cuidar: (a) que NUNCA haya dos renders `gm-*` a la vez (embebido + overlay) — al entrar
   embebido, el camino del overlay se bloquea; (b) el poll de 15s llama `renderClientToday` —
   con flag ON debe re-render el guiado embebido respetando la guarda anti-pisado
   (`CUR.todayWorking`/`_authDirty`) y SIN matar timers vivos (`GM.restTimer`, `GM.hiit`, HOLD:
   los timers re-consultan por id — patrón `paintGo` de v245 — verificar que el gm haga lo
   mismo tras re-render embebido); (c) `document.body.style.overflow` ya no se toca en embebido.
5. Activarlo SOLO en el dispositivo de Camilo (Perfil → toggle oculto o `?uig=1`) y que él lo
   use entrenando unos días. Los demás siguen viendo la clásica.

### F3 — Navegación, atrás y TWA con el guiado embebido
1. El guiado embebido NO empuja capa al entrar (es un tab), pero sus overlays internos
   (descanso gm-rest-overlay, tarjeta de inicio, ficha ❓ `openExDetail`) siguen las reglas
   de capas de v223/v243. Revisar `_repro-back-v243.mjs` y AÑADIR escenarios: atrás con
   descanso abierto, atrás en medio de serie, atrás con ficha abierta desde el guiado.
2. Probar en el TWA real (celular de Camilo) — el WebView del TWA es donde el atrás se rompe.

### F4 — Encendido por defecto
1. Tras el visto bueno de Camilo en F2/F3 (mínimo una semana de uso real suyo + idealmente
   1-2 clientes beta, p.ej. Miguel o Kathe), default `ax_ui_guided='1'`.
2. Dejar en Perfil un enlace discreto "Volver a la vista clásica" (el kill-switch al alcance
   del usuario) durante al menos 2 semanas.
3. Vigilar reportes; el poll/foreground y el TWA son los frentes de riesgo.

### F5 — Retiro de la clásica (solo con F4 estable ≥2 semanas y CERO reportes)
1. Borrar: `renderClientExList` y todo lo que solo ella usa (`buildHiitCard`, `startHiit`,
   `setLogInputsHTML`, `buildWarmupSection`, `startHoldTimer`/`HOLD` clásico, CSS `.cex-*`,
   `.set-log-row`…), el flag y el enlace de fallback. `startRoutineNow`/vista previa de rutinas
   pasan a abrir el guiado embebido.
2. ⚠️ ANTES de borrar, grep de CADA función a retirar en TODOS los archivos (el coach y otros
   paneles reusan helpers: `_sessionExercisesHTML`, `updateClientProgress`, `restForExercise`,
   `exMetaText`… esos se QUEDAN). Regla de no-duplicados: al reemplazar, ELIMINAR lo viejo,
   pero solo lo que de verdad quedó huérfano.
3. Bump SW + limpiar CLAUDE.md (secciones de la clásica) + actualizar memoria.

## 3b. PROGRESO (actualizar aquí al cerrar cada tajada)

- **F0 ✅ COMPLETA (2026-07-03, sesión Fable 5):** baseline en `_baseline.txt` (raíz del repo):
  267/267 tests, 9/9 node --check, `_repro-plancha.mjs` TODO OK. `_repro-back-v243.mjs` NO
  corrido aún — correrlo antes de F3. Gotcha confirmado en vivo: el puerto 9266 quedó zombi
  DOS veces (matar PID antes de cada corrida, como dice F0.2).
- **F1·P10 ✅ + F1·P2 ✅ (2026-07-03, avi-v246):** `prepareTodaySession(routine)` en
  app-4-entreno.js (reset diario + `_rehomeOrphanDropsets`, llamada desde `renderClientToday`
  y `openGuidedMode`; se SACÓ `checkAndResetSession` de `renderClientExList`).
  `finishSessionEarly()`/`resetSession()` ahora devuelven boolean; el guiado los reusa vía
  `gmFinishEarly()`/`gmResetSession()` (app-6-extra.js) + fila `#gm-session-actions` al final
  de `gm-body` (no en el footer fijo, para no taparlo). Verificación: 267/267 tests +
  `_repro-plancha.mjs` ampliado a **29 checks** (S5 nuevo: P2 reiniciar/finalizar + P10 día
  nuevo sin render clásico), jsErrors []. 🟡 Falta ojo visual humano de la fila de botones
  (el DOM se verificó E2E; captura dedicada no se tomó).
- **F1·P1 ✅ (2026-07-03, avi-v247):** check-in de ánimo DENTRO del guiado. `moodChooserHtml`
  acepta handler (`'gmPickMood'`, con allowlist); `gmRender` antepone el chooser si hoy no
  eligió; `gmPickMood` = `pickMood` (guarda/adapta/avisa coach/re-renderiza clásica) +
  `openGuidedMode()` encima (regenera GM.steps sobre la rutina adaptada y recalcula el paso).
  No bloquea (igual que la clásica). Harness ampliado a **31 checks** (S6), jsErrors [].
  NOTA: el banner de ánimo elegido (moodBannerHtml) NO se portó — va con P12 (header del
  guiado absorbe el hero).
- **F1·P3 ✅ (2026-07-03, avi-v248):** reordenar ↑↓ y sustituir 🔄 desde el guiado. Se extrajo
  el cuerpo de reconstrucción de `openGuidedMode` a **`gmRebuild()`** (regenera GM.steps/
  currentStep desde `CUR.activeRoutine`, SIN re-lanzar la tarjeta de inicio). `gmMoveEx` =
  `todayMoveEx` (copia de trabajo + `_swapSessionKeys` + re-render clásico) + `gmRebuild`;
  la botonera `.cex-reorder` se añadió al `.gm-ex-header`; 🔄 reusa `todaySubstitute`→`#m-picker`
  (z-index 1000 > 700) y `_applySubstitute` llama `gmRebuild` si el guiado sigue abierto.
  `gmPickMood` migró a `gmRebuild` (mata la tarjeta de inicio repetida que anotó Lucas en v247).
  **BLINDAJE:** `gmRebuild` cancela timers vivos (rest/hold/HIIT) antes de repintar — el HIIT
  corre dentro de la tarjeta con los ↑↓ visibles, así que mover esa tarjeta dejaría el intervalo
  huérfano; ahora se cancela. Harness a **36 checks** (S7 reorden con serie+dropset+segundos;
  S8 mover HIIT en curso sin timer huérfano). QA estática hecha inline (Opus 4.8, tras agotarse
  Fable 5): 0 duplicados, handlers resueltos, .cex-reorder en CSS, 267 tests, jsErrors [].
- **F1·P4 ✅ (2026-07-03, avi-v249):** lastre (peso añadido) para peso corporal en el guiado.
  Toggle "+ Lastre" una vez por ejercicio (reusa `lastreOn`/`toggleLastre` de la clásica →
  clave `lastre_<rid>_<ei>` compartida, ya viaja en reorden vía `_SK_EX`); `gmSetCellsHTML`
  acepta `lastre` y con él pinta celda KG (placeholder "lastre") + REPS, mismo campo `kg` →
  entra al volumen igual que la clásica. Harness a **39 checks** (S9: toggle presente, KG
  aparece al activar, estado persiste, serie con lastre suma 10×12=120 al volumen). 267 tests,
  jsErrors [], auditoría estática inline (0 duplicados, node --check).
- **F1·P12 ✅ (2026-07-03, avi-v250):** cabecera de rutina en el guiado. `gmRoutineHeaderHTML()`
  antepone (tras el chooser de ánimo, antes de las tarjetas) nombre + pills (nº ejercicios/
  series/descanso) + nota del coach + "POR QUÉ ESTA RUTINA" + banner si `CUR.todayOverride`.
  Estilos sobre tokens neutros (el guiado va sobre var(--bg), no el gradiente del hero); todo
  con esc(). Harness a **40 checks** (S10). En F2 esta cabecera reemplaza al hero de la clásica.
- **F1·P11 ✅ (2026-07-03):** SIN código nuevo — el guiado ya pinta la foto del ejercicio vía
  `exIcon`→`exImgTag`→`.exicon-img` dentro de `.gm-ex-icon` (overflow:hidden, object-fit:cover).
  Se dejó como regresión el check S11 (verifica `img.exicon-img` con src `.jpg` en la tarjeta).

- **✅✅ F1 COMPLETA (2026-07-03).** Toda la paridad del inventario §2 está en el guiado:
  P1 (ánimo), P2 (finalizar/reiniciar), P3 (reordenar/sustituir), P4 (lastre), P10 (reset
  diario común), P11 (foto), P12 (cabecera). P5–P9/P13/P14 ya estaban; P15 se valida DURANTE F2.
  Desplegado en avi-v246→v250. Harness `_repro-plancha.mjs` = **41 checks** (S1–S11), jsErrors [].
  🟡 Falta el ojo de Camilo en el celular (recorrer el guiado: ánimo, reordenar, lastre, cabecera).

### F2 EN CURSO (partida en sub-deploys, kill-switch protege prod entera)
- **Interruptor en Perfil ✅ (2026-07-03, avi-v255):** Camilo pidió poder encenderlo desde la app
  (el `?uig=1` no sirve en el TWA instalado). `renderGuidedViewToggle` ahora es un ON/OFF real:
  con ON muestra "↩ Volver a la vista clásica" (a cualquiera que la tenga ON); con OFF muestra
  "🧭 Activar vista guiada" SOLO en el propio entreno del coach (`COACH_SELF`=Camilo) para que
  los clientes no lo vean aún. `switchToGuidedView()` enciende, `switchToClassicView()` apaga.
  Camilo lo activa en Perfil de "Mi entrenamiento". Harness S12 ampliado (60 checks): cliente+OFF
  oculto; COACH_SELF+OFF muestra Activar; activar enciende; ON muestra Volver.
- **F2·sub-1 ✅ (2026-07-03, avi-v251):** flag `ax_ui_guided` + toggle. `uiGuided()`/`setUiGuided(on)`
  en app-1-infra.js (per-dispositivo, NO en SB_KEYS → no sincroniza); `_initUiGuidedFromUrl()`
  parsea `?uig=1`/`?uig=0` al boot (app-2-login.js, tras initTextSize); `renderGuidedViewToggle`
  (app-4) llena `#cn-guided-card` en el Perfil SOLO cuando el flag ya está ON (con botón
  "↩ Volver a la vista clásica" → `switchToClassicView`), oculto por defecto. **INERTE con OFF**:
  nada lee el flag para cambiar el render todavía → "Hoy" sigue clásica. Harness a **46 checks**
  (S12: OFF por defecto; setUiGuided persiste; toggle aparece con ON; volver-a-clásica apaga;
  con OFF Hoy sigue clásica). ⚠️ GOTCHA harness confirmado HOY: matar TODOS los Chrome del
  harness (no solo el listener 9266) antes de correr, si no el setup falla en falso
  ("Cannot set properties of undefined (setting 'routines')" = login no completó por hablar con
  Chrome zombi). Receta: `taskkill` del PID de 9266 + `wmic` de los chrome con `9266`/`remote-debug`.
- **F2·sub-2 ✅ (2026-07-03, avi-v252):** el render EMBEBIDO. Con flag ON, `renderClientToday`
  hace `con.innerHTML=''` + `openGuidedEmbedded(todayR)` y `return` (no pinta hero+cex-list).
  `openGuidedEmbedded` reubica el MISMO `#guided-mode` dentro de `#cn-today-body` (reusa
  topbar/body/footer/rest-overlay ya probados) con la clase `.gm-embedded` (CSS: quita
  position:fixed, oculta el ✕, sin scroll interno, `zoom:1` para no doblar el zoom de texto del
  `.cnp`). Helpers `_gmCaptureHome`/`gmRestoreOverlayHome` mueven el nodo entre overlay↔tab;
  `gmRestoreOverlayHome` corre al tope de `renderClientToday` ANTES del `innerHTML=''` (si no,
  borraría el nodo compartido) y **SOLO actúa si está embebido** (un overlay abierto no se toca
  — bug hallado y corregido: hidden a media sesión cuando pickMood/todayMoveEx disparan el
  render con el overlay abierto, S6/S7/S8). `closeGuidedMode` es embedded-aware: al completar
  todo NO oculta el tab (la celebración la muestra `checkAndShowCongrats`); `gmUpdateActionBtn`
  oculta el botón "Cerrar" en embebido. Como `openGuidedMode` (overlay) tiene UN solo llamador
  (el botón "▶ Empezar", que NO se pinta con flag ON) → nunca hay dos renders `gm-*` a la vez.
  Harness a **50 checks** (S13: embebido dentro del tab sin ✕/cex-list/Empezar; marcar serie;
  completar todo sin ocultar + botón Cerrar oculto; flag OFF restaura clásica y devuelve el nodo).
- **F2·sub-3 ✅ (2026-07-03, avi-v253):** el poll en vivo ya NO corta la serie del embebido.
  Guarda al TOPE de `renderClientToday`: si `uiGuided() && _gmIsEmbedded() && _gmLiveTimer()`
  (descanso/HIIT/isométrico corriendo) → `return` inmediato (no toca el DOM). Así el
  `_pollAuthClient` de 15s (que re-renderiza "Hoy" cuando el coach cambia el plan) no interrumpe
  una serie en curso; el refresco entra en el próximo render sin timer. Reorden/ánimo NO pasan
  por esta guarda para re-render (llaman `gmRebuild` aparte, que cancela el timer a propósito).
  Harness a **54 checks** (S14: HIIT del embebido sobrevive a un poll con cambio de plan; termina
  normal; render posterior sin timer aplica el plan nuevo).

- **✅✅ FASE F2 COMPLETA (2026-07-03, avi-v251→v253).** El guiado embebido ES la pantalla de
  "Hoy" detrás del flag `ax_ui_guided` (kill-switch, default OFF). 🟡 **Ahora toca CAMILO en su
  celular**: abrir `...apex-app/?uig=1`, entrenar varios días (marcar series, descanso, HIIT,
  reordenar, ánimo, completar), y confirmar que se siente bien. Volver a la clásica: Perfil →
  "Volver a la vista clásica". NO seguir a F4 (default ON) sin ese visto bueno + idealmente
  1-2 clientes beta.
- **F3 ✅ en código (2026-07-03, avi-v254) — 🟡 falta confirmarlo en el TWA real.** Dos fixes en
  `_aviCloseTopOverlay` (app-2-login.js): (1) BUG crítico corregido — el check del guiado era
  `!hidden`, pero el embebido tampoco está hidden → el atrás entraba a `closeGuidedMode()`
  (embedded-aware, no hace nada) y quedaba SIN EFECTO; ahora excluye `.gm-embedded` (el embebido
  es un TAB → el atrás sigue el flujo de pestañas: vuelve a la previa o arma salida en "Hoy").
  (2) el descanso del guiado (`gm-rest-overlay`) ahora se cierra con atrás (gmSkipRest) — antes,
  en overlay cerraba TODO el guiado y en el embebido no hacía nada. La ficha ❓ y el lightbox ya
  empujaban capa propia (navOpenLayer, v243) → el atrás los cierra igual embebido. Harness
  `_repro-plancha.mjs` a **64 checks** (S15: embebido no se cierra con atrás; descanso sí; ficha
  empuja capa; overlay clásico SÍ se cierra — sin regresión); `_repro-back-v243.mjs` regresión
  LIMPIA. 🟡 **Falta probar el atrás en el TWA real de Camilo** (el WebView del TWA es donde el
  atrás se rompe) — hacerlo con el flag ON (`?uig=1`): atrás en Hoy, atrás con descanso, atrás
  con ficha abierta.
- **Bugs del ojo de Camilo en F2+F3 ✅ (2026-07-03, avi-v255→v258).** Interruptor visible SIEMPRE
  (quité gate COACH_SELF, v256); el toggle re-renderiza "Hoy" DE VERDAD (`_switchTodayView` pone
  `CUR.todayRenderedDay=null` saltando `cnTodayGuard`, v257) y NAVEGA a "Hoy" (`cnTab('cn-today')`)
  para que el cambio se vea sin salir/entrar de la app (v258). S16 en el harness.
- **P1 ánimo en el embebido ✅ (2026-07-03, avi-v259).** Camilo: "la vista me gusta pero no podemos
  dejar fuera la feature de cómo te sientes". El guiado (`gmRender`, app-6-extra.js) solo mostraba
  el chooser y al elegir DESAPARECÍA todo → parecía que la feature no estaba. Ahora hay paridad
  COMPLETA con la clásica: si no eligió → chooser (`moodChooserHtml(_cli,'gmPickMood')`); si YA
  eligió → banner con la adaptación + "Cambiar cómo me siento" (`moodBannerHtml(GM.routine.adapt,
  'gmChangeMood')`). `moodBannerHtml` ahora acepta `fnName` (allowlist); nuevo `gmChangeMood()`:
  embebido → `renderClientToday` (re-adapta sin ánimo + re-embebe), overlay → `gmRebuild` (chooser,
  y re-elegir re-adapta). Harness `_repro-plancha.mjs` a **64 checks** (S17: chooser antes →
  banner al elegir → chooser tras "Cambiar", siempre embebido). 🟡 falta el ojo de Camilo.
- **Bugs del ojo de Camilo en el ánimo del embebido ✅ (2026-07-03, avi-v260):** dos cosas que vio
  al probarlo en el celular. (1) **Salto de pantalla:** al cambiar de ánimo la pantalla saltaba
  hacia abajo — `openGuidedEmbedded` difería un `gmScrollToCurrent()` a 120ms que pisaba el
  scroll-al-tope de la acción de ánimo; ahora ese scroll diferido se rastrea en un handle
  (`_gmDeferScrollToCurrent`) y `gmScrollTop()` lo CANCELA + sube `.cnbody` (el scroller real es
  `.cnbody`, no `#cn-today`) al tope. (2) **PÉRDIDA DE DATOS (crítico, fuera del plan pero salió
  aquí):** entrenó pierna en la mañana (completo) y al reiniciar por la tarde mientras probaba el
  guiado, Progreso mostró SOLO el nuevo y BORRÓ el de la mañana. Causa: `saveSessionToHistory`
  de-duplicaba por (rutina+día) → el parcial de la tarde pisaba el completo de la mañana. Fix:
  identidad de sesión (`session_id_<rid>`, acuñada al arrancar fresca = día nuevo o reiniciar);
  el historial hace match por ese id → un reinicio crea una entrada NUEVA, no destruye la hecha.
  Harness a **67 checks** (S18: mañana completa 2/2 → reiniciar cambia el sid → tarde 1/2 es
  entrada APARTE, la mañana intacta). 267/267 tests, jsErrors []. 🟡 falta el ojo de Camilo.
- **Reorder ↑↓🔄 fuera de pantalla con letra grande ✅ (2026-07-03, avi-v261):** Camilo (con razón,
  molesto por lo que se escapa de las auditorías) reportó que al agrandar la letra los botones de
  subir/bajar/cambiar ejercicio quedaban casi fuera de pantalla. Causa: `.gm-ex-header` era una
  fila flex sin `flex-wrap` y el nombre (`flex:1` SIN `min-width:0`) empujaba las herramientas
  fuera del viewport cuando el zoom de texto (`.cnp` a 1.40 en `xl`) las agrandaba. Fix: el
  nombre y las herramientas (❓+↑↓🔄) van en grupos propios (`.gm-ex-nm` con ancho mínimo legible,
  `.gm-ex-tools` con `margin-left:auto`), y `.gm-ex-header` tiene `flex-wrap:wrap` → con letra
  grande las herramientas ENVUELVEN a una 2ª línea (visibles) en vez de salirse. Nuevo tipo de
  check en el harness (**S19, 68 checks**): MIDE el `getBoundingClientRect` de cada botón contra
  el viewport (390px) con `data-fs=xl` → 0 fuera de pantalla (antes salían). Lección: las
  auditorías deben incluir geometría real con texto grande, no solo presencia en el DOM. 🟡 ojo de Camilo.
- **F4 ✅ en código (2026-07-04, avi-v262) — Camilo dio visto bueno de F2+F3 en su celular.**
  El guiado es el DEFAULT: `uiGuided()` lee `ld('ax_ui_guided','1')` (antes `'0'`). Quien nunca
  tocó el flag → guiado embebido en "Hoy"; quien guardó `'0'` con "Volver a la vista clásica"
  → clásica (opt-out respetado). El enlace kill-switch del Perfil queda VISIBLE ≥2 semanas
  (`renderGuidedViewToggle`, ambas direcciones). Fallback intacto: si `openGuidedEmbedded` no
  puede embeber, `renderClientToday` cae a la lista clásica. Harness: **S12 ahora verifica el
  default real** (`localStorage.removeItem('ax_ui_guided')` → `uiGuided()===true`) y `setupRoutine`
  fija OFF explícito para que los escenarios clásicos/overlay (SETUP,S1–S11) corran igual.
  Verificación: 267/267 tests, `_repro-plancha.mjs` TODO OK (jsErrors []). 🟡 **Ahora toca a
  Camilo y a algún cliente beta (Miguel/Kathe) USAR el default por ~2 semanas y vigilar reportes
  (poll/foreground y TWA son los frentes de riesgo). CERO reportes 2 semanas → habilita F5.**
- **F4 BLINDAJE ✅ (2026-07-04, avi-v263) — auditoría profunda "tipo 5 agentes" tras el deploy.**
  4 ángulos: (1) datos reales Supabase (497 ejercicios de 18 clientes+coach → 0 sin sets, 0
  rutinas vacías, 7 tipos→5 tracks todos manejados, HIIT real sin `hiit` inline corre por default
  30/15 de `hiitCfg`, Isométrico guarda segs en `reps`→`holdSecsOf`); (2) cobertura de tracks
  (los 5 renderizan+se marcan; cardio y biserie verificados, eran huecos del harness); (3)
  regresión atrás/TWA (`_repro-back-v243.mjs` 18/18, boot con guiado-default sin errores JS);
  (4) robustez ante excepciones → **hallazgo real**: `renderClientToday` hacía `con.innerHTML=''`
  y llamaba `openGuidedEmbedded` SIN try/catch → un throw (p.ej. `#gm-body` ausente por SW/index
  viejo, o hueco null en `exercises`) dejaba "Hoy" en BLANCO (y el poll de 15s lo hacía
  permanente). Datos reales NO lo disparan hoy (0 nulls), pero es trampa latente en un default
  para todos. FIX (2 guardas mínimas): (a) `prepareTodaySession` filtra huecos null de
  `exercises` (raíz común clásica+guiado; no-op sin huecos); (b) `try/catch` alrededor de
  `openGuidedEmbedded` → cualquier throw cae a la clásica (repinta `con` completo). Harness +S20
  (a: null filtrado→embebe 2 reales; b: sin `#gm-body`→cae a clásica, no blanco). 267/267 tests,
  TODO OK, jsErrors []. Hallazgos 🟡 no aplicados (para el ojo de Camilo): tooltip educativo de
  onboarding (`showExTooltip` busca `#cex-list`, ausente en el guiado default → no se muestra a
  usuarios nuevos, degrada sin crash); harness sin assert de atrás parado en el tab embebido.
- **SIGUIENTE → F5 (retiro de la clásica), SOLO con F4 estable ≥2 semanas y CERO reportes.**
  Borrar `renderClientExList`/`buildHiitCard`/etc., SOLO lo huérfano, grep de cada función antes;
  el coach reusa helpers como `updateClientProgress`/`_sessionExercisesHTML` → esos se QUEDAN.

## 4. Riesgos señalados (dicho con franqueza, luego se ejecuta lo decidido)

- La gente HOY entrena en la clásica; cambiarles la pantalla principal es un cambio de hábito.
  Por eso F2 es opt-in (Camilo primero), F4 gradual con fallback visible, y F5 solo al final.
- El guiado empuja una secuencia paso a paso; hay usuarios "rápidos" que solo marcan series.
  Verificar en F2 que marcar fuera de orden y saltar descansos se sienta natural (P15).
- El poll en vivo (v199) re-renderizando una pantalla con timers es la fuente #1 de bugs
  sutiles de esta migración. Cada timer debe sobrevivir a un re-render (re-consultar por id,
  nunca guardar referencias DOM en closures largos) — patrón ya aplicado en v245.

## 5. Checklist de cierre de CADA fase

- [ ] `node --check` de los JS tocados
- [ ] `node avi.test.js` — todos verdes (si agregaste lógica pura, con tests nuevos)
- [ ] `_repro-plancha.mjs` y `_repro-back-v243.mjs` verdes (ampliados si la fase tocó su área)
- [ ] Captura headless del estado nuevo revisada con los ojos
- [ ] Datos reales auditados si cambió el modelo (Supabase)
- [ ] `sw.js` CACHE_NAME +1
- [ ] Deploy vía skill `avi-deploy` (Julián + Lucas en verde)
- [ ] CLAUDE.md actualizado (hitos + pie) y memoria actualizada
- [ ] Reporte a Camilo con niveles honestos (✅/🟡/⚪) y qué falta de su ojo
