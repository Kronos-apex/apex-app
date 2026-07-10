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
| **F4** | ⚠️ Guiado (checks ✓/○, ⏱ crono, ⚠️ dolor, 🔗 biserie) — ZONA CALIENTE: harness completo obligatorio (_guiado-suite 53) | pendiente |
| **F5** | Panel del coach (paneles, botones de acción, badges) | pendiente |

## Íconos existentes

F1: `sparkles` · `droplet` · `bike` · `bolt` · `wind`
F2: `flame` (racha/HIIT casa) · `target` (meta semanal) · `moon` (descanso) · `bell` (push) ·
`burst` (abdomen) · `leaf` (movilidad) · `dumbbell` (glúteo/pierna) · `gauge` (pliométrico)
F3: `clipboard` · `chat` · `chart` · `trend` · `apple` · `trophy` · `scale` · `ruler` · `camera` ·
`sun` · `contrast` (tema auto) · `calendar` · `repeat` · `utensils` · `pie` · `arrowup` · `timer` ·
`check` · `barbell` · `pencil` · `help` · `phone` — mapa emoji→ícono de chips: `_SROOM_IC` (app-4)

Al agregar: dibujar a mano en el estilo (nada de copiar sets con licencia dudosa),
previsualizar en ambos temas, y mantener este inventario al día.
