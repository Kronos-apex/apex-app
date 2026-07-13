# 🎨 Programa de elevación PREMIUM de AVI — pantalla por pantalla, área por área

> Escrito 2026-07-12. Propuesta destilada de 3 skills de diseño instaladas —
> **web-design-guidelines** (Vercel), **emil-design-eng** (Emil Kowalski) y **ui-ux-pro-max**
> — cruzada con el código real de AVI (tokens, gotchas, zonas calientes). Nace de la auditoría
> de Isabella (bitácora/backlog 2026-07-12). Plan VIVO: se ejecuta por fases, se marca lo hecho.
> Restricción dura: **CSS vanilla, single-file, mobile-first 360px, tokens existentes — NO frameworks.**

---

## La estrategia en una frase
**Primero las PRIMITIVAS del sistema (una vez → elevan TODA la app), luego superficie por
superficie con un método repetible.** Emil lo llama *cohesion*: cuando las primitivas son
premium, cada pantalla nueva nace premium sin esfuerzo extra.

---

## FASE 0 — FUNDACIÓN (la de mayor apalancamiento; toca los tokens, eleva todo a la vez)

Estas 5 primitivas son la base. Sin ellas, cada pantalla se pule a mano y nunca hay cohesión.

1. ✅ **Movimiento como token + press-feedback** *(el lever #1 "se siente premium" — Emil).* **HECHO avi-v329 (2026-07-12).**
   - Tokens en `:root` base: `--ease-out:cubic-bezier(.23,1,.32,1)`, `--ease-io:cubic-bezier(.4,0,.2,1)`, `--dur-fast:160ms`, `--dur:220ms`. Disponibles para toda fase futura.
   - **Corrección al plan:** AVI SÍ tenía press-feedback, pero disperso (28 reglas `:active{transform}` ad-hoc con escalas inconsistentes .94–.99). El gap real eran las 2 clases *workhorse* `.btn` y `.cli` — sin `:active` y con `transition:all`. Se aplicó ahí: `transition:all`→props explícitas con `--ease-out` + `.btn:active{scale(.97)}`, `.cli:active{scale(.985)}` (tras su `:hover`).
   - Guard `prefers-reduced-motion` para el nuevo transform. NO se tocó el guiado (suite 53 intacta).
   - **Pendiente de esta primitiva (radar, fase superficie):** estandarizar las otras 19 `transition:all` y 28 `:active` ad-hoc al token `--ease-out` — superficie por superficie; varias en zona caliente (`gm-*`, `cntab`, `sbi`, `sbout`). NO hacerlo en bloque (regresiones + zona caliente). Emil: nunca entrar desde `scale(0)` (arrancar en `.95`+opacity) — aplica al diseñar entradas nuevas.

2. ✅ **Sistema de elevación/superficie coherente en AMBOS temas.** **HECHO avi-v330 (2026-07-12).**
   - Modelo de 3 niveles codificado en un comentario del CSS: **N0** fondo (`--bg`) · **N1** tarjeta (`--w` + borde `--br2` + `--sh`) · **N2** modal (`--w` + `--sh2`, sin borde). Los modales ya tenían `--sh2` por tema.
   - **Fix H5:** borde de tarjeta `--br`→`--br2` en las 3 primitivas del sistema (`.card`, `.cli`, `.exc`). En claro `#E5E5DF` apenas separaba del fondo crema; `#D0D0C8` define con nitidez. En oscuro el canto verde claro `--br2` da separación coherente.
   - **Decidido por preview de variantes A/B/C × 2 temas** (tokens exactos): B (borde `--br2`) ganó sobre C (borde + sombra en capas) — C añadía peso/complejidad y no rinde en oscuro (las sombras no se ven). Divisores internos (`.ch`) se quedan en `--br` a propósito (jerarquía: exterior fuerte, interior suave).
   - **Pendiente (fase superficie):** subir al modelo las tarjetas de COMPONENTE (`.qw-card`, `.sescard`, `.nutri-card`, etc.) y las superficies recesadas (pills/step-boxes con `--bg`+`--br`). El token `--surface` (definido, 0 usos) queda para consolidar ahí. NO en bloque.

3. ✅ **Ritmo tipográfico + cifras tabulares.** **HECHO avi-v331 (2026-07-12) — en gran parte pre-satisfecha.**
   - **Cifras tabulares: YA resueltas en v319.** Los timers/cargas/volúmenes usan 'JetBrains Mono' (monoespaciada → ya tabular); 'Anton' (KPIs coach) IGNORA `tnum` (medido); el único lugar proporcional que ayudaba (`.wf-stat-val`, Plus Jakarta) ya lo tiene. Nada que añadir.
   - **Escala tipográfica: tokens en `:root`** (`--fs-2xs:10 … --fs-4xl:30`, base 13) destilados de los tamaños REALES dominantes de AVI (13/12/11 = 43% de 425 usos). Es la "regla" a la que las fases de superficie ajustan cada pantalla. Tokenizadas las primitivas de texto (`.btn/.tag/.psub/.ctitle/.llbl/.ilbl/.bsm/.etxt/.esub`) como no-op exacto.
   - **Hallazgo:** las primitivas ya estaban en ritmo limpio; la inconsistencia (38 tamaños, oddballs 12.5/13.5/…) vive en el styling DE COMPONENTES. Barrer los 425 a ciegas = riesgo sin QA → **fase superficie** (radar). `.ptitle` 19px vs escala 18 → reconciliar al pulir esa superficie.

4. ✅ **Estados de foco (`:focus-visible`) + táctil.** **HECHO avi-v332 (2026-07-12).**
   - `:focus-visible` (anillo `--g2` para teclado) YA existía de una auditoría vieja (styles.css línea 6). Nada que añadir.
   - Táctil: auditados TODOS los controles < 36px (estándar propio de AVI). Peor caso borrar peso 20×20px; `.ex-tooltip-close` 22px. Primitiva reusable **`.hit40`** (renombrada de `.tap` en v333 — colisionaba con `.profav.tap`): expande el ÁREA de toque a ≥40px con overlay `::after` (WCAG 2.5.5) SIN agrandar el ícono ni la altura de la fila (verificado en preview: ícono 11×14px, fila 32px, hit-test a 15px del centro = botón). Aplicada a `deleteBodyWeight` (+`aria-label`). `.ex-tooltip-close` (botón visible con fondo) → 34px real.
   - **Diferido (radar, superficie del coach):** micro-botones del constructor de rutinas (`moveEx`/`rfDelEx`/`linkBiset` 28-30px, `cex-reorder`/`tplExs` 26px) — fila densa que en 360px ya va apretada; el cluster se rediseña en su superficie, no a ciegas.

5. **Sistema de iconografía SVG (matar los emojis funcionales).**
   AVI ya tiene `aviIcon` (47 íconos). Extenderlo a TODO control funcional (el mood-selector del
   cierre es el caso grave — audit H2) con `stroke:currentColor` + `aria-pressed`. Emojis solo
   como *deleite* en eventos raros (🏆 del cierre), nunca como control.

---

## FASES 1–N — SUPERFICIE POR SUPERFICIE (orden por frecuencia de uso: lo más visto primero)

> Cada superficie se pule con el MÉTODO de abajo. Marcar aquí lo hecho.

### Grupo A — Asesorado (lo que más se ve; es el producto)
- [ ] `#cn-today` + guiado embebido (zona caliente — suite 53)
- [ ] `#workout-finish` (cierre — pico emocional; ya casi premium, aplicar H2/H3/H4)
- [x] `#cn-routines` (rutinas con foto, v315) — **HECHO avi-v337**. Auditoría honesta (harness `_shot-routines.mjs`): la pantalla YA estaba premium (foto v315 + toda la FASE 0 heredada) — NO requería rediseño. Único hueco real = cohesión de íconos (#5): los 4 botones de acción de cada tarjeta usaban emojis funcionales (▶/📊/✏️/🗑️) que rompían el lenguaje SVG monolínea Y no heredaban el color del botón (el ▶ salía negro sobre el CTA verde). Convertidos a `aviIcon` (patrón inline que la función ya usaba), igualando el toolbar del panel del coach. Nuevo ícono `play`. `aria-label` en borrar (solo ícono). El ✨ de "Regenerar" se conserva (marca "generar" consistente en toda la app). DIFERIDO: los `.eico` de los estados vacíos (🏋️/✨/📋) siguen emoji — rara vez vistos; alinear a SVG si se retoma
- [x] `#cn-history` + gráficas SVG de volumen — **HECHO avi-v336**. Auditoría (harness `_shot-history.mjs`): el screen YA estaba premium (gamificación 100% SVG, streak+calendario, advstats, gráfica) — no requería rediseño. Pulido de craft: (1) unificados los 2 encabezados impares al estilo dominante `.streak-title`+ícono ("Tus logros"→medal, "Mi progreso por ejercicio"→trend); "Historial" queda como divisor `.prog-sech` a propósito. (2) etiquetas del eje X de `renderVolChart` (se salían del borde) → banda propia +16px y extremos anclados start/end
- [~] `#cn-profile` (progressive disclosure) — **PASE 1 hecho avi-v334**: reorden identidad-primero (Mis datos → Récords → Nutrición → seguimiento → ajustes; antes lideraba la nutrición gigante y Mis datos quedaba al fondo) + íconos SVG en los 3 encabezados sin ellos (Mis datos/Apariencia/Tamaño). Método: captura full-page `_shot-profile.mjs` ambos temas → audit → decisión Camilo → re-captura verificada. **PASE 2 hecho avi-v335**: (1) estados vacíos de medidas/fotos → componente `.empty` (ícono SVG ruler/camera + título + subtítulo tono Sofía), verificado ambos temas; (2) banner "Instalar app" — CONFIRMADO real (position:fixed bottom:84px, solo se oculta instalada → asesorados en navegador lo ven flotar sobre el final), fix `body:has(#install-banner[style*="flex"]) .cnbody{padding-bottom:64px}` (reserva hueco solo cuando el banner está; cero cambios a la lógica de instalación). PENDIENTE menor: el mismo banner tapa el home del COACH → su superficie (Grupo B); espaciado fino entre tarjetas si se decide pulir más
- [ ] `#cn-gamif` (nivel + logros/medallas)

### Grupo B — Coach (uso diario)
- [x] `#p-home` (dashboard) — **HECHO avi-v338**. Harness NUEVO `_shot-coach.mjs` (patrón reusable para pantallas del coach: monta 4 clientes fake + `showScreen('s-coach')` + `gp(panel)`; expande `.main`). Auditoría honesta: el home ya estaba bastante trabajado (banner héroe, stats g4, retención, banners). Gaps reales cerrados: (1) 🔴 el banner "Instalar app" (`#install-banner` fixed bottom:84px) tapaba la última tarjeta de prioritarios → extendida la regla `:has()` del perfil (v335) a `.main`; (2) 🟡 emojis funcionales → SVG (#5): ✅→check, ⚠️→alert, 🏋️→dumbbell en los 3 banners/lista (toasts conservan emoji); (3) robustez: "Hace -1d" (días negativos) → clamp `dd<=0`→"Hoy". PENDIENTE del home: micro-audit de las tarjetas de stat/retención si se retoma
- [x] `#p-clients` (lista + orden inteligente v317) — **HECHO avi-v341**. Ya estaba mayormente en SVG (day-pills timer/calendar/moon/flag/chat vía `_coIco`, sesión previa). Cerrados los gaps: (1) buscador 🔍 (placeholder emoji) → nuevo ícono `search` monolínea DENTRO del campo (absolute, `t-ic` auto-iconizado); (2) day-pill "Entrenó hoy" ✓ (glifo texto, los otros 4 estados ya SVG) → `_coIco('check')`; (3) badge "Libre" 🆓 → leaf (consistente con tier del detalle); (4) empty-state 👥 → nuevo ícono `users` (calca sidebar). CONSERVADO: pills de ATENCIÓN (⛔/⏳/🤕/🚩) — emoji vive en `avi-core` (capa lógica testeada; inyectar SVG viola capas + varios sin SVG limpio + son marcadores expresivos de severidad)
- [x] `#p-detail` (el más denso) — **PASE 1 (v339) + PASE 2 (v340) HECHOS**. PASE 1: tarjeta de gestión de rutina (`renderDetailRoutines`), área #4. (1) 🟡 táctil #4: los 3 micro-botones (plantilla/editar/borrar) ~20px → `min-height:36px` centrado, sin ensanchar la fila 360px (NO `.hit40`: son adyacentes, chocarían) + `aria-label`; (2) 🟡 cohesión: 📂→nuevo ícono `folder` (calca el de Plantillas) vía `_coIco`; `⏱`→timer, `🔗`→link en meta/filas (detalle + preview "Generar semana"). PASE 2 (v340): iconos FUNCIONALES restantes → SVG dejando el tono intacto — tiers 🆓/⭐/👑→leaf/star/crown (header tag `_planIco` que hereda color del pill + selector `planControlHTML`; escalera básico→premium→top); 💳 del historial de pagos→card (igualando el título Membresía). CONSERVADO a propósito (tono Sofía / sin SVG limpio): 👇 chat vacío, 🙋 quiere-coach, 📊 frase de valoración, 🦴/⚡ calentamiento. Superficie `#p-detail` cerrada
- [x] `#p-exercises` (212 ejercicios, filtros) — **HECHO avi-v342**. Ya pulido (filtros en chips, tarjetas foto+meta+pill+desc); mismo gap que la tarjeta de rutina del detalle: los 2 botones de acción de cada tarjeta (ver 👁 / editar ✏️) eran emoji crudo Y chicos (~20px) → 👁→nuevo ícono `eye`, ✏️→pencil, ambos a `min-height:36px` táctil + `aria-label` (mismo tratamiento que `renderDetailRoutines`). Empty-state 🏋️→dumbbell. Tooling: `_shot-coach.mjs` acepta `SHOT_MAXH` (capturar top de paneles enormes; el catálogo son 30k px)
- [x] `#p-templates` · [x] `#p-msgs` — **HECHOS avi-v343 (cierran Grupo B)**. PLANTILLAS: tenía todos los gaps de la tarjeta de rutina → badge 📂 + empty 📂 → folder SVG; ✏️/🗑️ (~20px) → pencil/trash a 36px táctil + aria + "Aplicar →" a 36px (toolbar alineado); ⏱→timer; 📋 "Aplicar a un asesorado" → clipboard. MENSAJES: casi limpio (empty ya SVG); los marcadores 📤/📥 (emoji ruidoso sin par SVG) → etiquetas de COLOR "Tú" verde / "Asesorado" azul (dirección por color, el 💪 del mensaje real se conserva). `_shot-coach.mjs` soporta templates|msgs

### Grupo C — Habitaciones (entran con profundidad; son el "wow" de navegación)
- [x] `#session-room` · [x] `#exercise-room` · [x] `#month-room` · [x] hero-tint (récord/rutina/músculo/nutrición) — **AUDITADAS avi-v347**. Veredicto honesto (igual que Rutinas v337): las 7 habitaciones YA eran premium (pase dedicado v224 Fraunces+dorado+profundidad + nutrición v235 + íconos SVG v307 + fix hero-tint claro v311 + FASE 0 heredada); NO requerían rediseño. Auditoría real ambos temas con datos reales (`_shots-rooms.mjs` ampliado; 3 minas del harness cazadas antes: tour de novedades tapando, poll de nube borrando datos → "NaN kg" falso, zombis de puerto). 2 brechas de cohesión cerradas: (1) banner comparativo de sesión 📈/📉/➖ → SVG vía `_sroomIc` (nuevos íconos `trenddown`+`flat`) + su gemela "📉 Bajando" en Cargas; (2) etiquetas de `drawExProgChart` recortadas en extremos → anclado start/end + volteo del punto de tope (patrón v336). Conservados a propósito: 🥗 hero Nutrición, ▶ "Hacer esta rutina". El pulido corto del RADAR (📉 de Cargas) queda CERRADO aquí.

### Grupo D — Modales (10) — **HECHO avi-v349**
- [x] m-client · m-routine · m-picker · m-ex · m-settings · m-template · m-tpl-picker · m-notif · m-exref · m-backup (+ los ~13 restantes)
  Auditoría honesta (harness `_shots-modals.mjs` ambos temas + `_verify-modals.mjs` funcional): los modales YA eran visualmente premium y con jerarquía clara (`.md`/`.mdtitle`/`.mdfooter` con `.btn bg` Cancelar ghost + `.btn bp` primario; animación de entrada `mIn`). Los gaps eran ESTRUCTURALES, centralizados (benefician a los ~23 modales de una): **(1) 🔴 BUG: el click-en-fondo (tap-fuera) no cerraba 7 modales** (m-qwcfg/m-notif/m-nut/m-med/m-delacct/m-payment/m-photos) — raíz: el handler `querySelectorAll('.mdbg').forEach` se ligaba en tiempo de PARSEO, antes de que esos modales tardíos existieran en el DOM → **fix: delegación en `document`** (inmune al orden de declaración). **(2) foco atrapado (a11y):** `MutationObserver` por `.mdbg` → al abrir el foco entra al diálogo (enfoca `.md`, no un input → sin teclado móvil), Tab ATRAPADO dentro, al cerrar el foco vuelve al disparador; cubre las 5 vías de cierre (cm/tap-fuera/Escape/botón-atrás) sin tocar la navegación. **(3) `prefers-reduced-motion`:** faltaba el override de `mIn` → `.md{animation:none}`. Verificado 12/12 en `_verify-modals.mjs` (repro del bug + foco). **PROGRAMA `plan-diseno-premium.md` COMPLETO: FASE 0 + Grupos A·B·C·D·E hechos.**

### Grupo E — Entrada
- [x] `#s-login` (primera impresión) · [x] `#apex-loading` — **AUDITADO/HECHO avi-v348**. Harness NUEVO `_shots-login.mjs` (pantalla PRE-login, sin credenciales/rate-limit: loading + bienvenida ±banner + form + wizard). Veredicto honesto (igual que rooms/rutinas): login/loading/wizard YA eran premium (video cinematográfico, wordmark, wizard de registro paso-a-paso, overlay de carga de marca). El H6 "2 CTAs iguales" YA estaba resuelto (Iniciar sesión blanco sólido = primario, Crear cuenta contorno = secundario). ÚNICO defecto real (el 🔴 top del backlog): la píldora flotante `#install-banner` se ENCIMABA sobre el recuadro propio del login `#install-hint` (redundante + tapaba su título) → fix CSS `#s-login.on~#install-banner{display:none!important}` (hermano `~`, el banner va después de `#s-login`); reaparece sola en las pantallas internas (`showScreen` quita `.on`). Verificado sin login: `{onLogin:none, onCoach:flex}`. No se pierde install (el login conserva su recuadro + botón "Instalar AVI" de un toque en Android instalable). **PROGRAMA `plan-diseno-premium.md` COMPLETO: FASE 0 + Grupos A·B·C·E hechos; Grupo D (modales) queda como el único pendiente.**

---

## EL MÉTODO por superficie (repetible, doctrina §3.1 + skills)

1. **Capturar** shots claro+oscuro a 360-390px, CON datos reales y **casos feos** (vacío / texto
   larguísimo / error / offline). Herramienta: `scripts/e2e/_shot-design-audit.mjs` (extender).
2. **Benchmarkear** vs referentes (Strong/Hevy/Fitbod/NTC/Whoop) — ¿cuál es la barra?
3. **Auditar** con los agentes+skills: Isabella (Design Strategist) cargando web-design-guidelines
   + emil-design-eng + ui-ux-pro-max sobre los shots; cruzar con el código (gotchas, hot zones).
4. **Previsualizar 2-4 variantes** × 2 temas antes de casarse (la variante tímida no es premium).
5. **Implementar** en CSS vanilla con tokens (nunca hex sueltos; reusar clases).
6. **Verificar**: shots a ojo ambos temas + suite 53 si toca guiado + `prefers-reduced-motion` +
   táctil ≥44px + estados no-felices. Deploy con el pipeline (Julián/Lucas + hook + curl + boot-check).

---

## CHECKLIST PREMIUM (la vara, por superficie) — destilada de las 3 skills
- [ ] **Jerarquía**: una sola CTA primaria; el ojo sabe dónde ir primero.
- [ ] **Ritmo de espaciado** consistente (escala de spacing, no valores sueltos).
- [ ] **Tipografía**: escala coherente + tabular-nums (fuentes con `tnum`).
- [ ] **Color/contraste** en AMBOS temas (WCAG AA); color nunca único portador de significado.
- [ ] **Microinteracción**: press-feedback, transiciones `transform`/`opacity`, easing custom, reduced-motion.
- [ ] **Táctil ≥44px** + `:focus-visible`.
- [ ] **Estados no-felices** (vacío/error/offline) también premium, con tono Sofía.
- [ ] **Cohesión**: usa los MISMOS patrones que el resto (Emil: "everything in harmony").

---

## Orden recomendado de ejecución
**FASE 0 primero** (foundation — un golpe eleva todo), luego **Grupo A** (el producto que más
se ve), **B**, **C** (las habitaciones dan el mayor "wow" por esfuerzo), **D**, **E**.
Cada fase = su propia sesión con deploy verificado. Marcar aquí + bitácora al cerrar cada una.
