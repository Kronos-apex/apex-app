# Plan de re-forma — Pestaña Comunidad (post-benchmark)

> Nace del informe de benchmark 2026-07-21 (Symmetry / Hevy / Strava / JEFIT / Strong) y del
> feedback del PO: la pestaña Comunidad está armada como panel de configuración, no como producto
> social; el muro queda enterrado al fondo y se comparte el PLAN (plantilla) en vez del ACTO.
> Lección de proceso guardada ([[avi-benchmark-antes-de-construir]]): benchmark ANTES de construir
> superficies visibles. Este plan es de FORMA — la infraestructura de ④ (avi-v382) se reusa casi entera.
>
> **DECISIÓN DEL PO (AskUserQuestion 2026-07-21):** el muro celebra **HITOS/LOGROS** (récord, racha,
> nivel) mezclados con rutinas compartidas — opt-in, calculados SERVER-SIDE (no inflables). NO es
> "quién entrenó hoy" (eso lo quitó a propósito, §13.0). Es celebración, no vigilancia.

## Principio
Hoy la pestaña abre en **configuración** (perfil gigante + código + 4 toggles + "Salir"). Se da vuelta
para abrir en **contenido** (muro + tu gente). Todo lo de ajustes se va detrás de un engranaje.

## Layout objetivo (móvil, arriba→abajo)
```
Comunidad                    ✉️ 3    ⚙️      ← header: DMs (badge) + ajustes
[ ＋ Compartir una rutina ]                   ← barra delgada de publicar
MURO
  👤 Andrea rompió un récord en Sentadilla 🎉   ❤️4   ← hito (server-side)
  👤 Beto cumplió 4 semanas de racha 🔥          ❤️6   ← hito
  👤 Caro compartió "Pierna dura" · Sentadilla…  ❤️2   ← rutina (community_posts)
Tu gente (5)                        Ver todos →  ← tira compacta con avatares
Descubrir en tu gym                          →   ← compacto, colapsable
[ 2 solicitudes ]                                ← banner SOLO si hay pendientes

⚙️ Ajustes (hoja): perfil · código · 4 toggles (público/activo/última conexión/entrené hoy)
   · editar apodo/bio · salir de la comunidad
```

## Mapa de reúso — NADA de seguridad se toca
| Intacto | Se reorganiza (frontend) |
|---|---|
| Backend completo: `community_profiles`/`friendships`/`follows`/`community_gym_members`/`community_messages`/`community_reactions`/`community_posts` + RLS/triggers/edges (verificado por Fable) | `_cmtyPaint` — orden de armado |
| Handlers (`cmtyFollow`/`cmtyHeart`/`cmtyChatOpen`/`cmtyPublish`…) | Header nuevo (✉️/⚙️) + hoja de Ajustes |
| `communityPostPayload`, tests, `_verify-feed` | Requests → banner condicional |
| Compartir rutina (queda como acción SECUNDARIA) | Los 3 modelos de relación se **presentan** como "Tu gente" (UI), **sin tocar los 3 backends** |

## Fases
### R1 — Dar vuelta el layout (SOLO frontend, cero backend, bajo riesgo) — ✅ HECHO (avi-v383, 2026-07-21, PENDIENTE re-verificación de Fable)
> Router de vistas `CMTY.view` ('feed'|'settings'|'inbox') en `_cmtyPaint`. Header `_cmtyHeadMain` (título +
> ✉️ bandeja con badge + ⚙️ ajustes) y `_cmtyHeadSub` (‹ Volver + título), `cmtyGoView(v)`. Vista MURO
> (default) = solicitudes (condicionales) + muro (`_cmtyFeedHtml`) + gym + amigos + descubrir. Ajustes (⚙️)
> = perfil/código/toggles/editar/salir (`_cmtyMyProfileHtml`) + agregar por código. Bandeja (✉️) =
> `_cmtyInboxHtml`. `renderCommunity` resetea a 'feed' al entrar. GOTCHA: `.ph`/`.ptitle` NO dan fila
> horizontal (el header usa flex explícito auto-contenido). Harness `_verify-feed` +4 (19/19); ajustados
> `_verify-community` CM7 (código ahora en Ajustes) y `_verify-public` P2 (perfil ahora en Ajustes) +
> waitFor con `showScreen`. Verificado visual claro+oscuro. Suite 407.

- Header de la pestaña con ícono ✉️ (bandeja DM, badge no-leídos) + ⚙️ (ajustes).
- Hoja/sección de **Ajustes** que absorbe: tarjeta de perfil, código (copiar/compartir), los 4 toggles,
  editar apodo/bio, "Salir de la comunidad".
- `_cmtyPaint` reordenado: barra publicar → MURO → Tu gente (compacta) → Descubrir (compacta) → banner
  de solicitudes SOLO si `incoming`/`followerReqs` > 0.
- "Tu gente" = amigos + gym + seguidos presentados juntos (misma tarjeta compacta), badges de DM.
- Ejecuta Opus, verifica Fable. Harness: extender `_verify-feed`/`_verify-community` para el nuevo orden.

### R2 — Hitos en el muro (SERVER-SIDE, no inflable) — **NECESITA que Fable planee la RLS primero**
El punto crítico: un hito NO lo publica el cliente (si no, alguien falsea "rompí un récord"). Se deriva
en el SERVIDOR, igual que el snapshot de constancia (decisión #7, no inflable).
- **Mecánica propuesta (a validar por Fable):** extender la edge `refresh_snapshot` para que, al
  recalcular el snapshot tras un entreno (`cmtyOnWorkoutFinished`), COMPARE nuevo vs anterior y, si se
  cruzó un hito, inserte una fila con `service_role` en una tabla nueva `community_milestones`
  (o `community_posts` con `kind='milestone'`, INSERT solo service_role, NUNCA el cliente).
- **Hitos candidatos (a acotar con el PO/Fable):** récord (PR nuevo), racha de N semanas (2/4/8…),
  subida de nivel. Empezar CONSERVADOR (pocos, para no spamear el muro).
- **Visibilidad:** reusa `private._profile_visible` (mismo candado de ③/④; menores protegidos gratis).
- **Reacciones:** reusan `community_reactions.context = milestone.id` (mismo patrón que ④).
- **Opt-in:** ¿reusar `show_today`/`show_last_active` o un flag nuevo `show_milestones`? (decisión Fable/PO).
- **Anti-duplicado + poda:** no re-emitir el mismo hito; retención de filas viejas.
- Puntos abiertos para Fable: tabla vs kind en posts · RLS INSERT service_role-only · dedupe ·
  qué hitos · flag opt-in · poda. Flujo: **Fable planifica RLS → Opus ejecuta → Fable verifica.**

### R3 — Pulido
- Estado vacío UNIFICADO (un solo mensaje accionable, no tres vacíos apilados).
- Fix del banner "Instalar app" que tapa el muro (misma clase que `#s-login~#install-banner`).
- "Seguir por código" (renombrar la entrada de "amigos por código" hacia el verbo único).

## Lo que se decidió y lo que NO se hace
- ✅ Muro = hitos + rutinas compartidas (D1 del PO).
- ❌ NO competencia (coronas/rankings/duelos estilo Symmetry) — la evidencia dice que quema; el ❤️ de
  aliento es el carril de AVI.
- ❌ NO se tocan los 3 backends de relación (amigos/follows/gym) — solo se PRESENTAN unificados en UI.
- ❌ NO "entrenó hoy" crudo — los hitos son celebración opt-in, no vigilancia de actividad diaria.
