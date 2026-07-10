# Plan: sistema de íconos SVG de marca (por fases)

> Pedido de Camilo 2026-07-09: *"premium desde los stickers en adelante, igual de premium
> a la interfaz"*. Estilo aprobado por él: **SVG propios estilo línea** (trazo 2px,
> currentColor → tokens de marca, esquinas redondeadas). Cierra el ítem de la auditoría
> UX 2026-07-04 ("reemplazar emojis por iconos SVG").

## Reglas del sistema

- Íconos en `AVI_ICONS` + helper `aviIcon(name,size)` en **app-1-infra.js** (carga primero).
- Trazo 2px, viewBox 24, `fill=none stroke=currentColor` con caps/joins redondeados —
  el color lo pone el CSS del contenedor (tokens → claro/oscuro gratis).
- Clases: `.avic` (el svg), `.ic-chip` (caja tintada 34px para títulos/modales).
- **Se migran solo los emojis que actúan como ICONO DE UI** (título de tarjeta, chip,
  botón). Los emojis dentro de TEXTOS (toasts, chat, mensajes de Sofía) se quedan —
  ahí son tono, no interfaz.
- Todo uso lleva fallback: `typeof aviIcon==='function'?aviIcon(...):'<emoji>'`
  (caché puede mezclar versiones de módulos).
- Verificación visual OBLIGATORIA antes de deploy: screenshot claro+oscuro
  (patrón scratchpad + `chrome --headless --screenshot`).

## Fases

| Fase | Superficie | Estado |
|---|---|---|
| **F1** | Tarjeta novedades (✨→sparkles, items), tarjeta agua (💧→droplet), modal HIIT rápido (⚡/🚴→bolt/bike) | ✅ avi-v303 (2026-07-09) |
| **F2** | Pantalla Hoy restante: botón ⚡ entrenamientos rápidos (bolt) + tarjetas de la biblioteca QW (chips por preset), saludo/racha (🔥→flame, 💪→target), banner de descanso (💤→moon), nudge de push (🔔→bell). Harness propio `_verify-icons-f2.mjs`. Nota: la tarjeta "🔥 Tu constancia" vive en PROGRESO → va en F3. | ✅ avi-v306 (2026-07-10) |
| **F3** | Perfil completo (títulos, héroe con pills/cámara, calculadora, botones Editar/WhatsApp/Subir/plan), títulos de Rutinas/Mensajes/Progreso, Constancia, botones de tema, ❓ Ayuda, chips de estadísticas de TODAS las habitaciones (`_sroomIc`), héroes 📅. Los tabs YA eran SVG. Harness `_verify-icons-f3.mjs`. Mecanismo `data-ic`+`aviIconizeStatic` (DOMContentLoaded) para HTML estático. PENDIENTE F3b: badges de logros del gamif (arte propio, no íconos de UI). | ✅ avi-v307 (2026-07-10) |
| **F4** | Guiado: ⚠️ dolor→alert, ❓ video→help, 🔥 calent.→flame, 🔻 dropset→tridown, 💨 respiración→wind (tarjeta + overlay + tooltip), 🔄 sustituir→repeat, ✅ completo→check, ⏱/🔗 en lista de Rutinas→timer/link. DECISIÓN: los tokens de estado ✓/○/▶/⏸/↑/↓ NO se migran (glifos tipográficos + textContent que leen lógica y harness); el 👆 del tooltip se queda (tono). REGLA NUEVA: screenshot del guiado real post-cambio — el grep encuentra lo que buscas, el shot lo que no (v309 cazó 🔄 y ✅ así). Suite completa 53 corrida en v308 y v309. | ✅ avi-v308+v309 (2026-07-10) |
| **F5** | Panel del coach: sidebar (bell/sliders), títulos de paneles y p-detail, chips de estado del home (calendar/moon/timer/flag), statBox, d-tags, biserie, eicos vacíos, botones pencil/trash. Helper `_coIco` (app-3). Placeholder 🔍 se queda (texto plano). | ✅ avi-v310 (2026-07-10) |

**PLAN COMPLETO (F1-F5, v303→v310).** Quedan fuera a propósito: badges de logros del gamif
(arte propio, decidir estilo con Camilo), badges de PLAN 🆓⭐👑 (identidad de nivel, misma
categoría que los logros), placeholder 🔍, glifos tipográficos (✓ ○ ▶ ⏸ ↑ ↓ ▾ ×),
emojis de TEXTOS (toasts, mensajes, tono Sofía) y los íconos por-ejercicio del catálogo
(`icon:` en DB.exercises — sistema aparte, `exIcon`/`muscleIcon`).

## Íconos existentes

F1: `sparkles` · `droplet` · `bike` · `bolt` · `wind`
F2: `flame` (racha/HIIT casa) · `target` (meta semanal) · `moon` (descanso) · `bell` (push) ·
`burst` (abdomen) · `leaf` (movilidad) · `dumbbell` (glúteo/pierna) · `gauge` (pliométrico)
F3: `clipboard` · `chat` · `chart` · `trend` · `apple` · `trophy` · `scale` · `ruler` · `camera` ·
`sun` · `contrast` (tema auto) · `calendar` · `repeat` · `utensils` · `pie` · `arrowup` · `timer` ·
`check` · `barbell` · `pencil` · `help` · `phone` — mapa emoji→ícono de chips: `_SROOM_IC` (app-4)
F4: `alert` (dolor) · `link` (biserie) · `tridown` (dropset) — helper del guiado: `_gmIco` (app-6)
F5: `sliders` (config) · `trash` · `flag` (sin rutinas) · `card` (membresía) — helper del coach: `_coIco` (app-3)

Al agregar: dibujar a mano en el estilo (nada de copiar sets con licencia dudosa),
previsualizar en ambos temas, y mantener este inventario al día.
