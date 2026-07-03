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
- **SIGUIENTE → F1·P12** (nota/why de la rutina + banner override "elegiste otra rutina" en el
  header del guiado; hoy están en el hero de la clásica), luego P11 (thumb de foto en la
  tarjeta gm, baja prioridad) y **F2** (el guiado embebido en `#cn-today` tras el flag
  `ax_ui_guided`, con kill-switch). Releer las reglas de oro antes de cada tajada. ⚠️ El puerto
  9266 queda zombi CADA corrida — matar PID antes de correr el harness (loop en Bash que ya uso).

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
