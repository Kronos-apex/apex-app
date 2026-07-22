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

### R2 — Hitos en el muro (SERVER-SIDE, no inflable) — ESTIPULADO por Fable (2026-07-22), listo para que Opus ejecute

El punto crítico sigue siendo el mismo: un hito NO lo publica el cliente (si no, alguien falsea
"rompí un récord"). Este es el diseño concreto — Opus ejecuta tal cual bajo `docs/reglas-opus.md`;
Fable verifica después, con el mismo estándar de sabotaje que ④.

**(a) Misma tabla, no una nueva — regla de oro reafirmada.** `community_posts.kind` extiende su
`check` de `in ('routine')` a `in ('routine','streak','level')` (v1 — ver punto (c) sobre por qué
`'pr'` queda FUERA de este alcance). Reusar la tabla evita duplicar `cpost_sel`/`_profile_visible`/
reacciones (`context=post.id`) en una tabla paralela — exactamente el patrón que ④ ya validó.

**(b) El candado real: el CLIENTE JAMÁS puede insertar un kind distinto de `'routine'`.** No basta con
"la mecánica está pensada para que el cliente no lo haga" — se cierra en la policy:
```sql
alter table public.community_posts drop constraint community_posts_kind_check;
alter table public.community_posts add constraint community_posts_kind_check
  check (kind in ('routine','streak','level'));

drop policy cpost_ins on public.community_posts;
create policy cpost_ins on public.community_posts for insert
  with check ( user_id = auth.uid() and kind = 'routine' );  -- el cliente SOLO puede publicar rutinas
-- service_role sigue con `grant all` (ya existe) y no pasa por RLS → los milestones SOLO entran por la edge.
```
Sabotaje que Opus debe correr (y Fable re-correrá): un cliente autenticado intenta
`insert(kind:'streak', payload:{weeks:99})` con su propio `user_id` → debe rechazar por la policy
(no por RLS de fila, por el `with check` de kind) aunque el `user_id` sea el suyo legítimo.

**(c) Hitos v1 — SOLO `streak` y `level`, `'pr'` QUEDA FUERA de este alcance (no lo resuelvo yo aquí).**
`streak_weeks` y `level` en `community_profiles` ya se computan **server-side dentro de
`refresh_snapshot`** (decisión #7, el mismo candado no-inflable de la constancia) — extenderlos a
hito es barato y hereda la garantía existente. Un "PR nuevo" es distinto: hoy vive en `ax_pr` /
`user_data.prs`, que es peso/reps **autoreportado por el cliente** en cada serie — evaluarlo como
hito sin una capa de anti-cheat propia significaría publicar en el muro un "logro" derivado
literalmente de un número que el propio usuario tecleó, la MISMA clase de riesgo que ④ excluyó a
propósito del payload de rutina (nunca pesos/kg). **No lo incluyo en v1**; si el PO lo quiere después,
es una sesión de planificación aparte (¿verificar contra el historial agregado en vez del dato
suelto? ¿degradarlo a "hizo su Nº sesión del ejercicio" sin exponer el peso?). Empezar conservador,
como pedía el propio plan.

**(d) Mecánica de emisión — dentro de `refresh_snapshot`, comparando ANTES vs DESPUÉS:**
```sql
-- pseudocódigo del cuerpo nuevo de la edge (TypeScript, service_role):
-- 1. leer streak_weeks/level ACTUALES de community_profiles (antes de recalcular)
-- 2. recalcular snapshot (como ya hace hoy)
-- 3. si show_milestones=true (ver punto f):
--    - streak cruzó un umbral de la lista {2,4,8,12,24,52} (antes<umbral<=después) →
--      insert community_posts(user_id, kind='streak', payload={weeks:N}) on conflict do nothing
--    - level subió (después>antes) →
--      insert community_posts(user_id, kind='level', payload={level:N}) on conflict do nothing
```
**Lista de umbrales de racha (2/4/8/12/24/52 semanas) es DECISIÓN DE PRODUCTO del PO** — la dejo
propuesta, no la fijo; lo único que exijo técnicamente es que sea una lista FIJA server-side (nunca
"cada semana es un hito", que saturaría el muro).

**(e) Payload — allow-list mínima, CERO datos de salud:** el trigger `_community_post_validate`
existente se extiende con una rama por `kind`:
```sql
-- dentro de _community_post_validate, antes de la validación de 'routine':
if new.kind = 'streak' then
  if jsonb_object_keys(new.payload) is distinct from array['weeks'] then raise exception 'forbidden streak payload key'; end if;
  if jsonb_typeof(new.payload->'weeks') <> 'number' then raise exception 'weeks must be a number'; end if;
  return new;
elsif new.kind = 'level' then
  if jsonb_object_keys(new.payload) is distinct from array['level'] then raise exception 'forbidden level payload key'; end if;
  if jsonb_typeof(new.payload->'level') <> 'number' then raise exception 'level must be a number'; end if;
  return new;
end if;
-- (el resto de la función, la validación de 'routine', sigue igual)
```
Ningún ejercicio, peso, kg ni nombre libre en un hito — solo el número ya público en el perfil
(streak/nivel ya son visibles hoy vía `community_profiles` para quien tiene acceso al perfil).

**(f) Opt-in — flag NUEVO, no reusar `show_today`/`show_last_active`.** Un hito es más "ruidoso"
socialmente que la etiqueta de última conexión (aparece en el MURO de otros, no solo en una tarjeta al
consultar el perfil) — merece su propio consentimiento, nace `default false` (mismo patrón
conservador que `is_private`/`show_last_active`):
```sql
alter table public.community_profiles add column show_milestones boolean not null default false;
-- client-writable (preferencia propia), mismo patrón que show_last_active: grant update(show_milestones).
```
La edge revisa `show_milestones` del propio usuario ANTES de insertar (si es `false`, no emite nada;
sigue computando el snapshot igual, solo no publica). Si el usuario lo activa DESPUÉS de ya haber
cruzado varios umbrales en el pasado, v1 **no** publica retroactivamente (solo el próximo cruce hacia
adelante) — evita un "muro" repentino de historia vieja el día que alguien activa el opt-in.

**(g) Anti-duplicado:** `unique index community_posts_milestone_uq on community_posts(user_id, kind,
(payload->>'weeks')) where kind='streak'` + análoga para `level` con `(payload->>'level')` — el
`ON CONFLICT DO NOTHING` de la edge hace la emisión idempotente aunque `refresh_snapshot` corra más de
una vez el mismo día (ya ocurre hoy con el debounce de 30min, pero doble candado es barato).

**(h) Poda:** mismo criterio que hábitos (30 días) es demasiado corto para un logro (querés que se
pueda seguir viendo/reaccionando un rato) pero no debe crecer sin límite — retención propuesta:
90 días o últimos 20 hitos por usuario, lo que sea menor, podado por un job liviano (mismo patrón que
`apex_daily_backup`, o simplemente `delete ... where created_at < now()-interval '90 days' and kind
<> 'routine'` al inicio de `refresh_snapshot`). **Decisión de producto final del PO**, técnica ya
resuelta.

**Checklist de sabotaje que Opus debe correr antes de declarar R2 "hecho" (Fable lo re-correrá):**
1. Cliente autenticado intenta `insert` directo `kind:'streak'`/`kind:'level'` con su propio
   `user_id` → rechazado por `cpost_ins` (kind≠'routine').
2. Cliente intenta `insert` con clave de payload fuera de `{weeks}`/`{level}` → rechazado por el
   trigger.
3. La edge (impersonada como `service_role` en una prueba de integración, no en producción real)
   SÍ puede insertar `kind='streak'` — confirma que el bloqueo es específico del rol `authenticated`,
   no total.
4. Doble llamado a `refresh_snapshot` el mismo cruce de umbral → un solo post (índice único +
   `on conflict do nothing`).
5. `show_milestones=false` → cruzar un umbral NO publica nada (releído tras el snapshot).
6. Visibilidad de un hito de un MENOR sigue el mismo candado que ④ (ni seguidor aprobado lo ve) —
   gratis por reusar `_profile_visible`, pero se re-prueba, no se asume.

**Puntos que siguen abiertos para el PO (producto, no técnica):** lista exacta de umbrales de racha,
si `show_milestones` nace visible en el opt-in inicial de la cuenta o requiere un toggle aparte
después, y cuándo (si alguna vez) se retoma `'pr'` con su propio diseño anti-cheat. Flujo: **Fable ya
planificó la RLS arriba → Opus ejecuta tal cual → Fable verifica con sabotaje antes de declarar R2
cerrado.**

### R3 — Pulido — ✅ HECHO (avi-v384, 2026-07-22, PENDIENTE re-verificación de Fable)
- **Estado vacío UNIFICADO — hecho.** Motor puro `communityEmptyState(counts)` en avi-core
  (`'none'|'quiet'|'lonely'`) + `_cmtyCounts()`/`_cmtyEmptyHtml(state)` en app-7; `_cmtyFriendsHtml`
  ya no pinta vacío propio. 'lonely' trae sus 2 acciones (compartir código / pegar código).
  +2 tests (suite 409) y +3 checks en `_verify-feed` (24/24).
- **Banner "Instalar app" — DESCARTADO con evidencia, no había bug.** Repro con medición real
  (banner visible, scroller al fondo, 390×844): última tarjeta y=700 vs banner y=710 → **10px de
  aire**. `.cnbody` ya reserva `padding-bottom:64px` con el banner visible desde v335 y
  `#cn-community` vive dentro de ese scroller. No se agregó código.
- **Verbo único — hecho con DESVIACIÓN documentada.** «Seguir por código» habría MENTIDO: esa
  entrada inserta una AMISTAD mutua (`friendships`), no un follow. Quedan dos verbos honestos:
  **Conectar** (mutuo: código + gym) y **Seguir** (una vía: descubrir). Copy: «Agregar un amigo»
  → «Conectar por código» (+ «Se conectan los dos…»); gym «Agrega a quien quieras seguir» (mentía)
  → «Conéctate con quien quieras», botón «Agregar» → «Conectar». `_verify-community` CM11 al día.
  ⚠️ **Abierto para Fable/PO:** unificar de verdad a «seguir» exige cambiar la MECÁNICA
  (friendship→follow en el flujo del código) = backend, no copy.

## Lo que se decidió y lo que NO se hace
- ✅ Muro = hitos + rutinas compartidas (D1 del PO).
- ❌ NO competencia (coronas/rankings/duelos estilo Symmetry) — la evidencia dice que quema; el ❤️ de
  aliento es el carril de AVI.
- ❌ NO se tocan los 3 backends de relación (amigos/follows/gym) — solo se PRESENTAN unificados en UI.
- ❌ NO "entrenó hoy" crudo — los hitos son celebración opt-in, no vigilancia de actividad diaria.

---

## VEREDICTO DE FABLE — R1 (`f64b488`, avi-v383) + fix de harness (`acea886`) + R3 (`7a8e7a0`, avi-v384)

Verificación independiente de los 3 commits de re-forma, con foco en que la reorganización visual NO
haya tocado ninguna vía de seguridad. Complementa el veredicto de ④ en `docs/plan-comunidad.md` §17.

### Scope confirmado: cero backend en R1 y R3

`git show f64b488 -- app-7-community.js` y `git show 7a8e7a0 -- app-7-community.js`, filtrados por
`rpc|\.from\(|\.insert\(|\.update\(|\.delete\(|\.select\(` sobre las líneas añadidas → **0
resultados en ambos commits.** R1 es exclusivamente `CMTY.view`/`_cmtyHeadMain`/`_cmtyHeadSub`/
`cmtyGoView`/reordenamiento de `_cmtyPaint`; R3 es exclusivamente `communityEmptyState` (pura, en
avi-core) + `_cmtyCounts`/`_cmtyEmptyHtml` (pintan, no escriben) + 4 líneas de copy. Los 3 backends de
relación (amigos/follows/gym) quedan intactos, tal como prometía el plan.

### Banner "Instalar app" — re-medido independientemente, NO había bug

Repro propia (no confié en los números de Opus): harness CDP a 390×844, perfil sintético con 3
posts en el muro, banner forzado `display:flex` (igual que la app real), scroll del `.cnbody` al
fondo, `getBoundingClientRect()` real de la última tarjeta y del banner:

```
bannerTop: 710   ·   última tarjeta bottom (tras scroll al fondo): 700   ·   gap: 10px
scrollerPaddingBottom (computed style de .cnbody): "64px"
```

**Confirmado exactamente lo que reportó Opus** — `body:has(#install-banner[style*="flex"]) .cnbody`
(styles.css, comentario fecha v335) reserva 64px y el hueco real es 10px, sin solape. El fix habría
sido código innecesario sobre un problema que no existe; correcto no tocarlo.

### Verbo "Conectar" vs "Seguir" (desviación documentada) — bien fundada, no se revierte

El plan pedía literalmente "seguir por código". Opus se desvió y lo llamó "Conectar por código"
porque esa acción (`cmtyResolve`/`cmtyGymAdd`) inserta una fila en `friendships` (amistad `pending`
mutua), no en `follows` (unidireccional) — confirmado leyendo el código, no solo el commit: línea
485 y 588 de `app-7-community.js` llaman a funciones que efectivamente tocan `friendships`
(`cmtyGymAdd`) mientras que el flujo de "Seguir" de Descubrir (`③c-3`) es el único que toca `follows`.
Llamar "seguir" a lo que crea una amistad mutua habría sido un texto que MIENTE sobre la mecánica al
usuario — exactamente el tipo de desviación que la doctrina del proyecto exige documentar, no
silenciar, y que además está bien fundada técnicamente (no hay forma de unificar el verbo sin
reescribir la mecánica del código de invitación de `friendship` a `follow`, que es un cambio de
BACKEND, no de copy). **Confirmo la desviación tal como está — no se revierte.** Queda, como Opus ya
anotó, como decisión abierta de Fable/PO si algún día se quiere UNA sola relación en vez de dos.

### Ajustes de harness (CM7/P2 en R1; CM11 en R3; LA4 en `acea886`) — juzgados como legítimos, no como enmascaramiento (R2.2)

Revisé los 4 diffs de harness línea por línea:
- **CM7/P2 (R1):** no aflojan ninguna aserción — agregan `cmtyGoView('settings')` antes de buscar el
  contenido que R1 movió de vista, y siguen exigiendo el mismo texto exacto (racha/nivel/código) que
  antes. Es "corregir DÓNDE mira el test", no "qué exige".
- **CM11 (R3):** cambia el texto buscado de `/Agregar/` a `/Conectar/` y el `onclick` esperado sigue
  exigiendo `cmtyGymAdd(...)` con el UUID correcto — mismo candado, texto actualizado al cambio de
  copy intencional documentado arriba.
- **LA4 (`acea886`):** el harness llevaba 2 checks ROJOS reales desde R1 (confirmé la causa: R1 movió
  el toggle de última conexión a la vista Ajustes y este harness no se actualizó en ese momento) — el
  fix agrega `CMTY.view='settings'` antes de buscar `#cmty-tg-lastactive`, sin tocar qué se exige
  (`aria-checked` sigue `show_last_active` exacto, off→false y on→true). Es un fix de raíz real
  (harness que quedó mirando la vista vieja), documentado como tal en el commit, con la causa
  explicada — cumple la excepción de R2.2 ("si el test está genuinamente mal, se explica por qué").
- Nota de proceso, no un hallazgo: `scripts/hooks/suite-baseline` saltó de 407 a 409 en `acea886`
  (el fix de harness, que no agrega tests) en vez de en `7a8e7a0` (que sí los agrega) — el hook lo
  actualiza automáticamente cuando el conteo SUBE, así que esto solo revela que el árbol de trabajo ya
  tenía los 2 tests nuevos de R3 sin comittear cuando se hizo el commit `acea886`. Inofensivo (el hook
  pasó igual, nunca bajó el conteo), pero deja constancia de que los commits no siempre reflejan el
  orden real de edición del árbol.

### Hallazgo nuevo (🟡, no bloqueante): `communityEmptyState` cuenta `discover` como "gente conectada"

`communityEmptyState` (avi-core, pura) suma `friends + gym + discover + following + incoming +
outgoing + followerReqs` para decidir 'quiet' (empuja a publicar) vs 'lonely' (empuja a conectar). El
propio comentario del código dice que 'quiet' es "ya tiene gente CONECTADA" — pero `discover` (leído
en `_cmtyCounts`) son perfiles PÚBLICOS de desconocidos sin ninguna relación con el usuario (línea 145
de `app-7-community.js`: cualquier perfil visible por RLS que no sea amigo ni gym-mate ni solicitud
pendiente cae ahí, y la visibilidad pública es asimétrica — que YO pueda descubrir a un desconocido
público no significa que ÉL pueda ver MI muro si yo soy privado sin amigos/gym/seguidores). Caso real:
un usuario privado, sin ninguna relación (0 amigos, 0 gym, 0 follows, 0 solicitudes), en una app que
ya tiene AUNQUE SEA UN solo perfil público no relacionado (ej. el propio perfil de coach de Camilo) →
`discover>0` → estado `'quiet'` ("ya tienes gente, publica") cuando en realidad su primer post no
sería visible para NADIE (ni para ese desconocido público, porque la visibilidad no es recíproca).
Confirmé que esto es intencional y probado (`avi.test.js` línea 1286: `communityEmptyState({posts:0,
discover:5})` → `'quiet'`, a propósito), no un descuido — pero contradice el propio criterio que R3
se propuso resolver (distinguir "genuinamente solo" de "tiene comunidad"). Impacto: bajo (un CTA de
copy subóptimo, "publica" en vez de "conéctate", en un caso de borde; cero riesgo de seguridad/datos).
**Recomendación para el radar de Opus, no urgente:** que 'quiet' solo cuente relaciones que
efectivamente predicen una audiencia para MI post (`friends + gym + followerReqs-aprobados`, si algún
día se trackea "quién me sigue aprobado"), y que `discover`/`following`/pendientes sigan sumando solo
para la distinción `'lonely'` vs "hay potencial cerca" en un futuro pulido, no para prometer audiencia
que no existe.

### QA re-corrido independientemente

`node --test avi.test.js` → **409/409**. `node scripts/e2e/_verify-feed.mjs` → **24/24** (incluye las
aserciones de R1 del router de vistas y las 3 de R3 del vacío único). `node
scripts/e2e/_verify-community.mjs` → **13/13**. `node scripts/e2e/_verify-public.mjs` → **10/10**.
`node scripts/e2e/_verify-follow.mjs` → **11/11**. `node scripts/e2e/_verify-lastactive.mjs` →
**14/14** (LA4 confirmado verde, ya no arrastra el rojo de R1). `node scripts/e2e/_prodcheck.mjs 384`
→ verde. Repro geométrica propia del banner (ver arriba) hecha con harness ad-hoc, no committeado
(no aporta cobertura permanente distinta de lo ya cubierto).

### Veredicto por deploy

- **R1 (`f64b488`, avi-v383):** 🟢 **APROBADO.** Reorganización de presentación pura, cero backend
  tocado, ajustes de harness legítimos (ubicación, no fuerza de la aserción), GOTCHA `.ph`/`.ptitle`
  documentado correctamente.
- **R3 (`7a8e7a0` + fix `acea886`, avi-v384):** 🟡 **APROBADO CON RESERVA MENOR, no bloqueante.**
  Estado vacío único correctamente implementado como motor puro + probado con sabotaje real
  (rojo→verde demostrado); verbo "Conectar" bien fundado y documentado; banner re-medido y
  confirmado sin bug. La reserva es el hallazgo de `discover` arriba — no requiere revertir ni
  bloquea trabajo nuevo, queda en el radar de Opus para un pulido futuro del criterio 'quiet'/'lonely'.

**Sigue: R2 (hitos server-side en el muro) — ver estipulación de RLS de Fable más abajo, lista para
que Opus ejecute cuando el PO lo priorice.**
