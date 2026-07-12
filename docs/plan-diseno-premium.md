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
- [ ] `#cn-routines` (rutinas con foto, v315)
- [ ] `#cn-history` + gráficas SVG de volumen
- [ ] `#cn-profile` (progressive disclosure)
- [ ] `#cn-gamif` (nivel + logros/medallas)

### Grupo B — Coach (uso diario)
- [ ] `#p-home` (dashboard — H1 banner instalar, H5 tarjetas)
- [ ] `#p-clients` (lista + orden inteligente v317)
- [ ] `#p-detail` (el más denso: rutinas/mensajes/progreso/nutrición/medidas/fotos)
- [ ] `#p-exercises` (212 ejercicios, filtros)
- [ ] `#p-templates` · [ ] `#p-msgs`

### Grupo C — Habitaciones (entran con profundidad; son el "wow" de navegación)
- [ ] `#session-room` (detalle de un entreno) · [ ] `#exercise-room` (historial+progresión de un ejercicio)
- [ ] `#month-room` (reporte mensual) · [ ] habitaciones hero-tint (récord/rutina/músculo/nutrición)

### Grupo D — Modales (10)
- [ ] m-client · m-routine · m-picker · m-ex · m-settings · m-template · m-tpl-picker · m-notif · m-exref · m-backup
  (foco: animación de entrada coherente, jerarquía, foco atrapado, botón primario claro)

### Grupo E — Entrada
- [ ] `#s-login` (primera impresión — H6 dos CTAs iguales) · [ ] `#apex-loading`

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
