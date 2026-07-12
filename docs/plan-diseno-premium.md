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

2. **Sistema de elevación/superficie coherente en AMBOS temas.**
   Definir 3 niveles de superficie (`--surface-0/1/2`) con su borde+sombra por tema. Hoy en
   claro las tarjetas se apoyan solo en `--sh` suave y el borde `--br` casi no separa (audit H5).
   Subir el borde de tarjetas a `--br2` y estandarizar la elevación.

3. **Ritmo tipográfico + cifras tabulares donde la fuente lo soporte.**
   Escala tipográfica consistente. `font-variant-numeric:tabular-nums` en stats/timers **de fuentes
   que traen `tnum`** (Plus Jakarta, JetBrains Mono). ⚠️ **gotcha v319: 'Anton' (KPIs del coach)
   IGNORA tnum** → ahí ancho fijo/mono, no tabular-nums.

4. **Estados de foco (`:focus-visible`) + táctil ≥44px** (accesibilidad — Vercel).
   Anillo de foco visible con `--g` para teclado; auditar que ningún control táctil baje de 44px.

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
