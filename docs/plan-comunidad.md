# Plan de diseño — COMUNIDAD en AVI

> **Estado:** Fase 1 COMPLETA EN PROD (2026-07-20, avi-v374) — C1+C2 verificados por Fable;
> **C3+C4 EJECUTADOS por Opus, PENDIENTES de re-verificación de Fable.** Idea #5 (Camilo 2026-07-17).
> **Autor del borrador:** Opus 4.8 (2026-07-18). **Endurecido por Fable (auditoría 2026-07-18):**
> se cerraron 4 huecos de arquitectura (§5.0, §5.2, §5.3, §5.6) y se añadió la **decisión #7**
> (integridad del snapshot) — la v1 era inconstruible tal cual (el flujo "agregar por código"
> chocaba con su propia RLS).
> **Regla del proyecto:** *Fable planifica → Opus ejecuta → Fable verifica.* Este doc es la base
> para que Fable estipule las sesiones de construcción. **NO se toca código hasta que Camilo
> apruebe el alcance y las 7 decisiones abiertas del final.**

---

## 0. TL;DR (para Camilo, en 30 segundos)

Quieres que tus asesorados (y la gente del gym) se vean entre sí, se motiven, reaccionen
(❤️) y compitan sano. **Es una gran palanca de retención y crecimiento** — pero es lo más
delicado que hemos tocado, por 3 razones: (1) AVI guarda datos SENSIBLES (peso, fotos,
medidas, salud) y una comunidad NO puede filtrarlos; (2) la app es *offline-first* y un muro
social necesita internet — hay que romper esa regla SOLO en la sección de comunidad, con
elegancia; (3) **el ranking por kilos es mala idea** (fomenta ego-lifting, desmotiva a
principiantes y mujeres, y premia lesionarse). La versión buena compite por **CONSTANCIA**,
que es justo lo que AVI ya predica ("la constancia es lo que te transforma").

**Recomendación:** hacerlo en **2 fases chicas**, no de un solo golpe. Fase 1 = perfil
compartible opt-in + amigo por código + ver su tarjeta + ❤️. Si la gente lo usa, Fase 2 =
feed de logros + ranking de constancia. Todo **gratis** (una comunidad con muro de pago no
tiene efecto de red). Antes de escribir una línea, decidir las 7 preguntas del §9.

---

## 1. Qué pidió Camilo (la idea cruda)

Textual del lote: *"comunidad dentro de la app — amigos/gym que ven perfiles/rutinas/
resultados, ❤️ en perfiles, competencia sana, ranking de pesos"*. Camilo pidió explícitamente
**ayuda a pulirla** (sabía que estaba sin cocinar). Este doc la pule.

## 2. Por qué SÍ (el valor real)

- **Retención:** entrenar es solitario; ver a un amigo cumplir su semana motiva a no fallar.
  La constancia sube cuando hay testigos amables. Es el mismo motor de Strava/Fitbit friends.
- **Crecimiento orgánico:** cada invitación a un amigo = un usuario nuevo potencial (se cruza
  con la idea #4 «Comparte AVI», v370).
- **Encaje con la marca:** AVI ya celebra la constancia (racha, gamificación, Coach
  Inteligente). Una comunidad que premia constancia es coherente, no un injerto.
- **Diferenciador para el coach:** un gimnasio/coach cuyos clientes se ven y se pican entre sí
  retiene más. Palanca para AVI GYM (proyecto hermano).

## 3. Los 3 riesgos que hay que mirar de frente (doctrina: mostrar lo que no se ve)

### 3.1 🔴 PRIVACIDAD — el más grave
AVI guarda en `user_data` datos que JAMÁS pueden ser públicos: **peso corporal, fotos de
progreso, medidas, PRs en kg, plan nutricional, notas de salud/lesiones, mensajes con el
coach**. La RLS actual de `user_data` es `auth.uid()=user_id OR =coach_id` — correcta y
**no se toca ni se afloja** (el bug de las fotos a Storage, 2026-07-12, demostró lo fácil que
es romper una policy). La comunidad **NO lee `user_data`**. En su lugar: una **tabla nueva de
perfil PÚBLICO** que contiene SOLO lo que el usuario decidió compartir, y un **snapshot
agregado** de sus stats de constancia (nunca el historial crudo). Ver §5.

### 3.2 🟡 OFFLINE-FIRST — ruptura filosófica controlada
El núcleo de AVI (entrenar, marcar series, ver rutinas) es *offline-first*: localStorage manda,
Supabase sincroniza. **Un feed de OTRA gente no puede ser local** (no tienes su historial en tu
teléfono, ni debes). Por lo tanto la sección Comunidad es **ONLINE-only** y:
- Degrada con elegancia sin red: "Conéctate para ver a tu gente" (nunca pantalla rota).
- **NUNCA bloquea el flujo de entreno.** Si la comunidad falla o está offline, entrenar sigue
  igual. La comunidad es un "extra", no una dependencia del core.
- Se cachea lo último visto (lectura) para que no quede en blanco, pero se marca como "puede
  estar desactualizado".

### 3.3 🟡 RANKING POR KILOS = NO (competencia sana, no ego-lifting)
Rankear por peso levantado es tentador pero **dañino**:
- Fomenta **ego-lifting** (subir kilos con técnica de mierda → lesión). AVI tiene protocolo de
  lesiones (Laura); un ranking que premia arriesgarse contradice todo el producto.
- **Desmotiva** al principiante y a las mujeres (siempre "pierden" contra un avanzado pesado).
- Es **injusto**: no controla peso corporal, palancas, experiencia.
- Es **trampeable** sin verificación (nadie confirma que de verdad levantó 140 kg).

**La versión sana compite por CONSTANCIA** (rachas, sesiones completadas, adherencia al plan),
que: motiva a TODOS por igual, no incita a lesionarse, es lo que de verdad transforma un
cuerpo, y ya es el corazón de AVI. Opcional a futuro: "fuerza relativa" (kg/peso corporal)
como stat DIVERTIDA secundaria, jamás como el ranking principal. **Decisión de producto en §9.**

### 3.4 🟡 (bonus) ABUSO / MODERACIÓN
Cualquier función social invita a: acoso, perfiles falsos, spam de solicitudes. Desde el día 1
de interacción real hace falta: **bloquear**, **reportar**, y **límites de tasa** (X solicitudes
de amistad/día). No es opcional aunque la base sea chica y conocida (gente del gym de Camilo).

## 4. Filosofía de diseño (los candados que hacen que esto no se salga de madre)

1. **Opt-in TOTAL.** Nadie entra a la comunidad sin activarla explícitamente (consentimiento
   Habeas Data versionado). Por defecto, TODO privado. Salirse borra el perfil público y las
   amistades (derecho de supresión).
2. **Mínimo dato expuesto.** El perfil público lleva solo lo compartible; los datos sensibles
   nunca salen de `user_data`.
3. **Amistad mutua, no directorio abierto.** Te conectas por **código** (o link de invitación),
   ambos aceptan. No hay buscador global de personas (privacidad). Ves solo a tus amigos.
4. **La comunidad es un EXTRA, no el core.** Nunca bloquea entrenar. Vive en su propia pantalla.
5. **Constancia, no kilos.** El único ranking/celebración principal premia aparecer, no el ego.
6. **Gratis para todos.** Gating premium mata el efecto de red (nadie tiene amigos si la mitad
   está tras un muro). Es palanca de retención/crecimiento, no de monetización directa.
7. **Reversible y auditable.** Bloquear, reportar, borrar mi perfil público, ver qué comparto.

## 5. Arquitectura de datos (propuesta — a validar con Andrés DBA)

> **Principio rector:** `user_data` NO se toca. Todo lo social vive en tablas nuevas con RLS
> propia y estricta. Los amigos leen un SNAPSHOT agregado, jamás el historial crudo. **Quién
> calcula el snapshot (cliente vs servidor) es la DECISIÓN #7 — ver §5.1 y §9.**

### 5.0 ⚠️ Resolución del código de amigo — RPC obligatoria (hueco (a) de la auditoría)
El flujo "pego un código → mando solicitud" **no puede implementarse con SELECT directo**: la RLS
de `community_profiles` (correctamente) solo deja leer a amigos ya aceptados, y resolver
`share_code → user_id` ocurre ANTES de ser amigos. Sin esto la Fase 1 es inconstruible.
**Solución:** una función RPC `SECURITY DEFINER` (o edge function) `resolve_share_code(code)` que:
- devuelve SOLO lo mínimo para confirmar a quién agregas: `{user_id, handle, avatar_url}` —
  NUNCA el snapshot de stats ni `trained_today`;
- solo responde si el perfil está `visible=true` y el solicitante está autenticado;
- aplica rate-limit EN SERVIDOR (p. ej. tabla de intentos: máx. N resoluciones/día por uid) para
  que no sirva de oráculo de enumeración de códigos (los `share_code` además deben ser largos y
  aleatorios — mínimo 8 chars base32, no secuenciales);
- misma vía para el link de invitación (el link solo encapsula el código).

### 5.1 `community_profiles` — el perfil público (1 fila por usuario opt-in)
```
user_id        uuid PK (= auth.uid)      -- dueño
handle         text                       -- nombre visible que ELIGE (no el legal por defecto)
avatar_url     text NULL                  -- avatar OPT-IN aparte (NO la foto de progreso privada)
share_code     text UNIQUE                -- código corto para que un amigo lo agregue
bio            text NULL                  -- opcional, corto, moderable
-- SNAPSHOT agregado de constancia (calculado por el cliente, sin datos crudos):
streak_weeks   int                        -- semanas de racha (weekStreak)
sessions_4w    int                        -- sesiones en las últimas 4 semanas (constancia)
level          int                        -- nivel de gamificación (gxLevel, 1-5)
achievements   int                        -- nº de logros
trained_today  bool                       -- ¿entrenó hoy? (para el "está activo")
snapshot_at    timestamptz                -- cuándo se calculó (para marcar "desactualizado")
visible        bool DEFAULT true          -- toggle rápido de "pausar mi perfil"
created_at     timestamptz
```
**RLS:** SELECT permitido si `user_id = auth.uid()` **O** existe amistad ACEPTADA entre
`auth.uid()` y `user_id` (via `friendships`). INSERT/UPDATE/DELETE solo `user_id = auth.uid()`.
⚠️ Recordar el gotcha de los upserts: si el cliente hace upsert, la tabla necesita policy
SELECT además de INSERT/UPDATE (bug de push 2026-07-12).

⚠️ **INTEGRIDAD DEL SNAPSHOT (hueco (c) de la auditoría → DECISIÓN #7 del §9).** La v1 de este
doc descartaba el ranking de kilos por "trampeable sin verificación"… y a la vez proponía que el
CLIENTE calcule y publique su snapshot — igual de trampeable (cualquiera escribe `streak_weeks:999`
desde la consola del navegador). Ser honestos con la contradicción. Opciones:
- **(A) Server-side (recomendada si habrá ranking):** una edge function `refresh_snapshot` con
  service role lee `user_data.history` del PROPIO solicitante (jamás de otros), calcula el
  agregado con la misma lógica pura y escribe `community_profiles`. El cliente solo la invoca.
  La RLS de `community_profiles` entonces NIEGA el UPDATE de las columnas de stats al cliente
  (o directamente todo UPDATE salvo handle/bio/avatar/visible).
- **(B) Cliente + aceptar el riesgo:** válido SOLO si la Fase 2 nunca rankea (tarjetas entre
  amigos que se conocen en persona = el costo social de inflarse es el castigo). Si Camilo
  quiere ranking, (B) queda descartada.
La decisión define media arquitectura → se toma ANTES del spec de Fase 1 aunque el ranking sea
de Fase 2 (migrar de (B) a (A) después = rehacer políticas y sembrar desconfianza en los datos).

### 5.2 `friendships` — el grafo de amistades
```
id           uuid PK
user_a       uuid   -- SIEMPRE el menor de los dos uuids (para unicidad del par)
user_b       uuid   -- el mayor
status       text   -- 'pending' | 'accepted' | 'blocked'
requested_by uuid   -- quién mandó la solicitud
created_at   timestamptz
UNIQUE(user_a, user_b)
```
**RLS (endurecida — hueco (b) de la auditoría):** un UPDATE genérico con `auth.uid() IN
(user_a,user_b)` deja que **la parte BLOQUEADA se des-bloquee sola** (regresa `status` a
`accepted`). Falta memoria de QUIÉN bloqueó:
- columna `blocked_by uuid NULL`;
- transiciones válidas (por policy granular con `WITH CHECK`, o trigger `BEFORE UPDATE`):
  `pending→accepted` solo el que NO la pidió; `pending→(DELETE)` cualquiera; `*→blocked`
  cualquiera de los dos y setea `blocked_by=auth.uid()`; `blocked→*` **SOLO** `auth.uid() =
  blocked_by`. Todo lo demás se rechaza.
- SELECT si `auth.uid() IN (user_a,user_b)`; INSERT si `requested_by=auth.uid()` y es parte del
  par, con `status='pending'` forzado por `WITH CHECK`.
- Rate-limit de solicitudes EN SERVIDOR (no "lógica de app"): p. ej. trigger que cuenta
  `pending` creadas por uid en 24 h y rechaza sobre un tope (anti-spam de solicitudes).
Normalizar `user_a<user_b` evita filas duplicadas del mismo par.

### 5.3 `community_reactions` — los ❤️ (Fase 1 simple)
```
id         uuid PK
from_user  uuid   -- quién reacciona (= auth.uid al insertar)
to_user    uuid   -- a quién (debe ser amigo aceptado)
kind       text   -- 'heart' (extensible: 'fire','clap')
context    text NULL -- Fase 2: id del "momento"/logro reaccionado; Fase 1: NULL (reacción al perfil)
created_at timestamptz
```
**RLS + integridad (hueco (d) de la auditoría — "rate-limit por lógica de app" = cero
enforcement, el spam de ❤️ era trivial por consola):**
- `UNIQUE(from_user, to_user, kind, context)` → en Fase 1 (context NULL) un ❤️ por amigo,
  idempotente; quitar el ❤️ = DELETE de la fila propia. En Fase 2, uno por momento.
- INSERT si `from_user = auth.uid()` **y** amistad `accepted` (verificada en la policy) **y**
  `kind` dentro de un CHECK de valores permitidos. SELECT si `auth.uid() IN (from_user,to_user)`.
  DELETE solo `from_user = auth.uid()`.
- El UNIQUE ya elimina el spam del caso Fase 1; para Fase 2 (momentos) añadir tope diario por
  trigger si hiciera falta. Nada de confiar en el cliente.

### 5.4 `community_reports` — moderación
```
id         uuid PK
reporter   uuid
reported   uuid
reason     text
created_at timestamptz
```
**RLS:** INSERT si `reporter = auth.uid()`. SELECT solo para un rol admin (Camilo / service role).
Reportar + bloquear van juntos en la UI.

### 5.5 Feed de logros (Fase 2) — `community_moments`
```
id         uuid PK
user_id    uuid
kind       text   -- 'streak_week' | 'level_up' | 'achievement' | 'trained' (opt-in por tipo)
payload    jsonb  -- datos SEGUROS del momento (ej. {weeks:3}); nunca kg/salud
created_at timestamptz
```
El cliente publica un "momento" cuando pasa algo celebrable (cumplió su semana, subió de
nivel). **Opt-in por tipo** (que el usuario elija qué se publica). Los amigos lo ven en su feed
y reaccionan. **Sin comentarios en Fase 2** (los comentarios = carga de moderación real →
se difieren o se descartan). La integridad de los momentos hereda la decisión #7 (si el snapshot
es server-side, los momentos derivados también deberían serlo).

### 5.6 Salida de la comunidad = borrado REAL (hueco (d), parte 2)
"Salir borra todo" no puede ser un flag ni quedar a merced de que el cliente ejecute N DELETEs
con red intermitente. Diseño:
- FKs de `friendships`/`community_reactions`/`community_moments` hacia `community_profiles
  (user_id)` con **`ON DELETE CASCADE`** → borrar el perfil arrastra todo lo social del usuario
  en una transacción.
- El botón "salir de la comunidad" = un solo `DELETE FROM community_profiles WHERE user_id =
  auth.uid()` (policy DELETE propia ya prevista). `community_reports` NO cascadea (el historial
  de moderación se conserva — interés legítimo; anonimizar `reporter` si aplica).
- **Integrar a la edge `delete-account`:** borrar la CUENTA debe borrar también el perfil
  comunitario (hoy esa función no lo sabe; añadirlo al spec de Fase 1, no después).

## 6. UX / pantallas (propuesta)

### Fase 1 (MVP — probar si la gente lo quiere)
- **Nueva pestaña/sección "Comunidad"** en la vista del asesorado (o entrada desde el perfil).
  Si NO ha activado la comunidad → pantalla de bienvenida con el opt-in + consentimiento.
- **Mi perfil público:** editar handle, avatar opt-in, ver mi código/link para compartir,
  toggle "pausar mi perfil", botón "salir de la comunidad" (borra todo lo social).
- **Agregar amigo:** pegar código / abrir link → manda solicitud. Bandeja de solicitudes
  (aceptar/rechazar).
- **Mis amigos:** lista de tarjetas. Cada tarjeta = handle + avatar + racha + nivel + "entrenó
  hoy" + botón ❤️. Tocar = ver su tarjeta ampliada (misma info, más grande). Bloquear/reportar.
- **Estados no-felices:** offline ("conéctate para ver a tu gente"), sin amigos aún ("invita a
  alguien con tu código"), perfil pausado.

### Fase 2 (si Fase 1 pega)
- **Feed de logros:** lista de momentos de tus amigos ("Andrea cumplió su semana 💪 · 3 racha").
  Reacciona con ❤️/🔥. Sin comentarios.
- **Ranking de CONSTANCIA (semanal, se reinicia):** entre tus amigos, ordenados por sesiones de
  la semana / racha. Reinicio semanal = perdonar una mala semana y mantenerlo fresco. Celebra al
  de arriba sin humillar al de abajo (mostrar progreso propio, no solo el puesto).
- (Opcional, decisión abierta) stat divertida de "fuerza relativa" kg/peso — nunca el ranking.

## 7. Legal / Habeas Data (Colombia)

- **Consentimiento nuevo y específico** para la comunidad (distinto del consentimiento general
  ya existente). Versionado con el patrón `LEGAL_V` (hoy `2026-07-07-borrador`). Explica QUÉ se
  comparte (handle, avatar, stats de constancia) y con QUIÉN (solo amigos aceptados).
- **Revocable:** "salir de la comunidad" borra `community_profiles` + `friendships` +
  `reactions` del usuario (derecho de supresión). Debe ser de verdad un DELETE, no un flag.
- Actualizar `legal/` (política de privacidad) y **subir `LEGAL_V`** al publicar.
- Revisión de abogado antes de producción (ya está en el backlog legal general).

## 8. Plan por fases (alcance realista, anti scope-creep)

| Fase | Alcance | Por qué en este orden |
|---|---|---|
| **0** | Este doc + 7 decisiones §9 + esquema+RLS+**RPC resolve_share_code**+cascadas revisados por Andrés DBA en proyecto de PRUEBA (probar el flujo por-código y el des-bloqueo con dos uids reales) | No tocar prod sin RLS probada (memoria: RLS se rompe fácil) |
| **1 (MVP)** | Opt-in+consentimiento · perfil público · amigo por código · lista de amigos con tarjeta (racha/nivel/hoy) · ❤️ · bloquear/reportar · degradación offline | Mínimo para validar si la gente lo usa. Sin feed, sin ranking. |
| **2** | Feed de logros (opt-in por tipo) · ranking de constancia semanal · fuerza relativa opcional | Solo si Fase 1 tiene tracción real |
| **3 (futuro, quizá nunca)** | Retos entre amigos, grupos/gym, integración AVI GYM | Depende de demanda; cada uno su propio doc |

**Cada fase es su propio ciclo Fable-planifica / Opus-ejecuta / Fable-verifica**, con harness
propio (incluido un harness de RLS que pruebe que un no-amigo NO puede leer, y que `user_data`
sigue blindada).

## 9. ⚖️ DECISIONES ABIERTAS (las necesita el spec, responde Camilo antes de un spec de construcción)

1. **Identidad:** ¿handle que el usuario elige (recomendado, más privado) o nombre real? Default
   sugerido: nombre de pila editable.
2. **A quién ve:** ¿solo amigos por código (recomendado) o también sugerir "otros clientes de tu
   coach"? (sugerir clientes del coach cruza privacidad → yo lo dejaría fuera de Fase 1).
3. **El coach en la comunidad:** ¿Camilo/los coaches participan como un perfil más, o la
   comunidad es solo entre asesorados? (recomiendo: asesorado↔asesorado; la relación coach ya
   existe por el chat).
4. **Avatar:** ¿avatar opt-in NUEVO para la comunidad (recomendado, no expone la foto privada) o
   reusar la foto de perfil? (reusar la foto privada = fuga de privacidad → NO).
5. **Ranking:** confirmar **constancia como ranking principal** (racha/sesiones), con kilos
   FUERA. ¿Sumamos "fuerza relativa" como stat secundaria divertida en Fase 2, o ni eso?
6. **Alcance de arranque:** ¿construimos SOLO Fase 1 (perfil+amigo+❤️) y evaluamos, o Camilo
   quiere el ranking desde el principio? (recomiendo Fase 1 sola primero).
7. **Integridad del snapshot (añadida por Fable, §5.1):** ¿el snapshot de constancia lo calcula
   una edge function server-side (opción A — obligatoria si algún día hay ranking; recomendada)
   o el cliente aceptando que es inflable (opción B — solo válida si NUNCA rankeamos)? Esta
   decisión define media arquitectura y NO es diferible a Fase 2.

### ✅ §9 RESUELTO — decisiones del PO (Camilo, 2026-07-18, vía AskUserQuestion)
| # | Decisión | Elección |
|---|---|---|
| 1 | Identidad | **Apodo que elige** (default nombre de pila, editable) |
| 2 | Alcance | ~~Solo amigos por código~~ → **REVISADA 2026-07-20: DIRECTORIO DEL GIMNASIO** (los que comparten coach se ven y se agregan sin código; el código sigue para invitar de fuera). Global público DESCARTADO por el PO (privacidad). Ver C5. |
| 3 | Coach | ~~Solo asesorados~~ → **REVISADA 2026-07-20: el coach SÍ participa** (es su gym; Camilo ya creó su perfil). Ver C5. |
| 4 | Avatar | **Foto opt-in desde YA** ⚠️ contra recomendación de Fable — ver condición §9.4 |
| 5 | Ranking | **Constancia + fuerza relativa** (kg/peso corporal como stat secundaria, Fase 2; ranking = constancia) |
| 6 | Alcance arranque | **Fase 1 sola**, evaluar antes de Fase 2 |
| 7 | Snapshot | **SERVER-SIDE** (edge function `refresh_snapshot`) |

**§9.4 — condición técnica del avatar-foto (Fable, vinculante):** los avatares NO tocan la ruta
rota de fotos-a-Storage (bug backlog 2026-07-12: carpetas por id legacy + subida por el coach).
Van a un **bucket/carpeta NUEVO `avatars/{auth.uid()}/`** con subida SOLO por el dueño
(`folder[1]=auth.uid()` sí matchea porque quien sube es el usuario autenticado — el bug viejo era
el COACH subiendo por otros con ids legacy), policies INSERT+UPDATE+**SELECT** (gotcha upsert),
límite de tamaño + compresión client-side (ya existe `compressImage`), y moderación = reportar
(§5.4) + al bloquear no se ve. El bug legacy de fotos de progreso queda EXACTAMENTE igual de
pendiente — no se "aprovecha" nada aquí (R1.1).
**Nota #5:** fuerza relativa es de Fase 2 y su cálculo TAMBIÉN server-side (deriva de peso
corporal = dato sensible; el snapshot publica solo el ratio, jamás el peso).

---

## 9-BIS. ESTIPULACIÓN DE FASE 1 (Fable → Opus; ejecutar bajo `docs/reglas-opus.md`)

Cuatro sesiones, cada una su ciclo completo (Opus ejecuta → Fable verifica). NO avanzar a la
siguiente con la anterior sin veredicto.

**C1 — ✅ EJECUTADO Y VETADO en banco de prueba (Opus, 2026-07-18; PENDIENTE veredicto de Fable
antes de migrar a prod).** Artefactos en `supabase/community/`: `c1_community_foundations.sql`
(migración lista para prod) + `c1_rls_harness.sql` (harness de 2 usuarios, cobertura documentada).
Banco de prueba = **AVI-GYM** (la org Free tope 2 proyectos → no se pudo crear uno dedicado;
elegido por el PO, aislado, se hizo DROP de todo al terminar). **Harness 14/14 PASS** (extraño no
lee ajeno, snapshot solo-servidor, RPC resuelve solo mínimos + rate-limit, bloqueado no se
desbloquea, doble ❤️ y no-amigo rechazados, cascada al salir, normalización + no-auto-aceptar,
reportes ilegibles, anon sin acceso). **✅ VERIFICADO por Fable (2026-07-19) — APROBADO CON CORRECCIÓN APLICADA.** Confirmé los 14
resultados en vivo + corrí sondas adversariales propias: **1 HALLAZGO real** (el bloqueado evadía
el bloqueo con DELETE+re-INSERT — el trigger solo cubría UPDATE) → fix `fr_del` vetado end-to-end;
+2 endurecimientos de diseño (reports `ON DELETE SET NULL` para conservar moderación; nota de ❤️
huérfano). Snapshot blindado también en INSERT. **✅ C1 APLICADO A PRODUCCIÓN (Opus, 2026-07-19)** — migración `c1_community_foundations` +
endurecimiento `c1_community_hardening` (advisor: `_are_friends` a schema `private` no expuesto,
`search_path=''` en todas las funciones). Verificado en prod: 5 tablas, RLS×5, 12 policies, RPC,
`fr_del` con el fix. Advisor security = solo ítems intencionales (`resolve_share_code` definer =
la feature; `community_resolve_attempts` sin policy = blindada) + pre-existentes. **AL RETOMAR: C2
(edge `refresh_snapshot` server-side + bucket `avatars/` §9.4 + integrar borrado a `delete-account`).**

**C1 (spec original) — Cimientos de datos (en proyecto Supabase de PRUEBA primero, R0/Fase 0 del §8):**
`community_profiles` (con `handle`, `share_code` ≥8 base32 aleatorio, `visible`, snapshot cols
SOLO escribibles por service role — §9.7) · `friendships` (con `blocked_by` + transiciones §5.2
por trigger) · `community_reactions` (UNIQUE §5.3) · `community_reports` · cascadas §5.6 · RPC
`resolve_share_code` (§5.0, con rate-limit servidor). **Verificación C1 (harness SQL con dos
uids de prueba):** no-amigo NO lee perfil · resolve devuelve solo mínimos · bloqueado NO puede
des-bloquearse · des-bloqueo por `blocked_by` SÍ · doble-❤️ rechazado · DELETE perfil arrastra
todo · `user_data` intacta (probar que un amigo NO puede leerla). Solo tras veredicto → migrar
a producción.

**C2 — ✅ EJECUTADO EN PRODUCCIÓN (Opus, 2026-07-19; PENDIENTE veredicto de Fable).**
(a) Edge function `refresh_snapshot` (supabase/functions/, v1, verify_jwt): lee el historial PROPIO
del caller (uid de su token), calcula el snapshot server-side y lo escribe con service role → el
cliente NO puede inflar sus números (decisión #7). Port FIEL de `communitySnapshot` (avi-core,
NUEVO, testeado en avi.test.js — reusa weekStreak/gxLevel/planDays + las 8 medallas de
renderGamification), con zona America/Bogota. Opt-in: solo refresca si ya hay perfil.
(b) Bucket `avatars` (supabase/community/c2_avatars_bucket.sql): público en lectura por URL,
escritura solo del dueño en `avatars/{uid}/`, límite 2 MB + imágenes; SIN policy SELECT amplia
(advisor 0025 — evita enumerar). Probe RLS: A no escribe en carpeta ajena.
(c) `delete-account` (v4): limpia avatares en Storage + rate-limit; las TABLAS de comunidad
cascadean solas al borrar auth.users. Advisor security limpio salvo intencionales. **AL RETOMAR: C3
(UI del asesorado: opt-in+consentimiento, perfil, agregar por código, lista de amigos, ❤️, offline).**

**C2 (spec original) — Servidor:** edge function `refresh_snapshot` (lee historial PROPIO, calcula con la misma
lógica pura de avi-core portada — `weekStreak`/`gxLevel`; escribe snapshot server-side) + bucket
`avatars/` (§9.4) + integrar borrado comunitario a `delete-account`.

**⚠️ REQUISITOS DE SEGURIDAD PARA C3 (hallazgos de la auditoría de Fable a C2, 2026-07-19 — NO opcionales):**
- 🟡 **`avatar_url` es texto libre escribible por el cliente** (está en el grant de UPDATE). Si un
  usuario lo apunta a una URL externa arbitraria, el navegador de sus amigos la carga como `<img>`
  → logging de IP / contenido no deseado. C3 DEBE (a) subir la foto SOLO al bucket `avatars/{uid}/`
  y setear `avatar_url` a esa URL, y (b) idealmente un CHECK/trigger en DB que exija que `avatar_url`,
  si no es null, empiece por el prefijo público del bucket `avatars` del proyecto. No es explotable
  hoy (sin UI), pero es bloqueante ANTES de que los avatares salgan.
- 🟡 **`handle`/`bio` son texto de usuario mostrado a amigos** → `esc()` obligatorio en todo innerHTML.
- 🟢 **Frescura del snapshot:** `trained_today`/racha son del último `refresh_snapshot`. C3 debe
  invocarlo en los momentos correctos (al abrir la app, al terminar un entreno) con **debounce**
  (la edge no tiene rate-limit propio → no spamear; guardar "último refresh < X" en el cliente).

**C3 — UI del asesorado (Fase 1 completa):** sección Comunidad con opt-in+consentimiento (§7,
subir `LEGAL_V`), mi perfil (apodo/foto/código/pausar/salir), agregar por código, solicitudes,
lista de amigos con tarjeta (racha/nivel/❤️), bloquear/reportar, degradación offline. Barra
premium completa + harness E2E propio (`_verify-community.mjs`) con sabotajes.

### C3 — ESTIPULACIÓN DETALLADA (Fable → Opus, 2026-07-19; ejecutar bajo `docs/reglas-opus.md`)

**Decisión de superficie del PO (2026-07-19, AskUserQuestion):** la Comunidad vive como **6ª
pestaña «Comunidad»** en la barra del asesorado (Hoy · Rutinas · Mensajes · Progreso · Perfil ·
Comunidad). Razón: la Fase 1 es una PRUEBA de adopción; esconderla sesgaría el resultado. La
barra queda más apretada — verificar a 360px con letra grande (data-fs xl) que las 6 caben sin
recorte. **Gratis para TODOS los tiers (§4.6): sin `premiumLockHTML`, el tier libre entra igual.**

Un deploy = **avi-v373** (bump PAR ?v/CACHE_NAME + `_prodcheck 373`). Un commit por bloque
(C3.1 migración → C3.2 motor puro → C3.3 capa de datos+UI → C3.4 harness/QA pueden agruparse
según tamaño real, pero migración y frontend JAMÁS en el mismo commit). Suite antes y después.
Antes de tocar código: leer `c1_community_foundations.sql` (grants reales) y
`supabase/functions/refresh_snapshot/index.ts` (contrato de la edge) — no asumir de memoria.

**C3.1 Migración `c3_community_consent_avatar` (prod; tablas verificadas VACÍAS 0/0/0 el
2026-07-19 → columnas pueden nacer NOT NULL sin backfill):**
- `consent_v text not null` + `consent_at timestamptz not null default now()` en
  `community_profiles` — evidencia Habeas Data del opt-in (patrón `consentEvidence`/`LEGAL_V`
  del registro, app-3:756-812). **Grant INSERT sí, grant UPDATE NO** (columnas de evidencia
  inmutables para el cliente; recordar que los grants de C1 son POR COLUMNA — extender el
  `grant insert (…)` existente, no reemplazarlo por uno de tabla completa).
- `show_today boolean not null default true` — toggle «mostrar si entrené hoy» (riesgo 🔴 §11
  patrones de actividad). Grant INSERT+UPDATE al cliente (es preferencia, no stat). La edge
  `refresh_snapshot` (v2) lo LEE y si es false escribe `trained_today=false` — el ocultamiento
  es SERVER-SIDE, no cosmético (una policy no oculta columnas; el dato jamás debe llegar).
- CHECK del avatar (requisito 🟡 de la auditoría C2): `avatar_url is null or avatar_url like
  'https://eoebhrxbokyllqalyecj.supabase.co/storage/v1/object/public/avatars/%'` → el cliente
  no puede apuntar el `<img>` de sus amigos a una URL externa (logging de IP).
- Verificación en vivo tras aplicar: INSERT con avatar externo → rechazado; consentimiento
  UPDATE por authenticated → rechazado; advisor security sin regresiones.

**C3.2 Motor puro (avi-core.js + tests en avi.test.js; deterministas, reciben `now`):**
- Constantes `CMTY_REFRESH_MIN_MS` (30 min — debounce del refresh, requisito 🟢: la edge no
  tiene rate-limit propio) y `CMTY_STALE_MS` (48 h — snapshot viejo se marca desactualizado).
- `cmtyHandleValid(h)` (trim, 1-30 — espejo del CHECK de DB) · `cmtyCodeNormalize(s)`
  (mayúsculas, sin espacios/guiones; el código es 10 hex-upper) · `cmtyShouldRefresh(lastTs,
  now)` · `cmtyFreshness(snapshotAt, now)` → `{fresh, daysOld}` · `cmtyAvatarOk(url)`
  (prefijo del bucket, defensa DOBLE del CHECK antes de tocar un `<img>`) ·
  `cmtyInitials(handle)` (fallback de avatar sin foto).

**C3.3 Capa de datos `CMTY` + UI (módulo ÚNICO en el app-N que corresponda — confirmar
leyendo dónde viven las secciones `cn-*` del asesorado; probable app-5/app-6):**
- **Toda operación vía `AUTH.client()`** (`.from()/.rpc()/.functions.invoke()/.storage`) —
  JAMÁS fetch crudo con token extraído (gotcha v323). Operaciones: cargar todo (mi perfil +
  amistades + perfiles de amigos + ❤️ dados/recibidos, mínimo de queries) · crear perfil
  (INSERT con handle+consent_v+consent_at → primer `refresh_snapshot`) · editar
  handle/bio/visible/show_today · subir avatar (`compressImage` → Storage
  `avatars/{auth.uid()}/avatar.jpg` upsert → setear `avatar_url`) · salir (DELETE del perfil;
  la cascada del servidor arrastra el resto — confirmación fuerte que explica el borrado) ·
  agregar por código (`rpc('resolve_share_code')` → tarjeta de confirmación handle+avatar →
  INSERT friendship) · aceptar/rechazar/bloquear/desbloquear/eliminar amistad · ❤️
  poner/quitar (INSERT/DELETE, el UNIQUE de DB lo hace idempotente) · reportar (+ ofrecer
  bloquear en el mismo gesto) · `refreshSnapshot()` con debounce en `ax_cmty_refresh`
  (LOCAL) — se invoca al ABRIR la pestaña y al FINALIZAR un entreno, SOLO si hay opt-in.
- **NADA de comunidad entra a `SB_KEYS`** (no es parte del sync offline-first; vive en sus
  tablas). Caché de última vista en `ax_cmty_cache` (LOCAL, por dispositivo) SOLO para el
  estado offline, marcada «puede estar desactualizado».
- **SELLO DE NUBE (lección Samuel 2026-07-08, NO negociable):** en localhost las escrituras
  de CMTY quedan selladas igual que `cloudWriteSealed` sella `UD.*` — extender el sello o
  replicar el mecanismo, y PROBARLO en el harness (un write con el sello puesto NO llega).
- **UI — pestaña `#cn-community`** (ícono `users` de aviIcon) con estados:
  (a) **Sin opt-in** → bienvenida: qué se comparte (apodo, avatar, stats de constancia —
  NUNCA peso/fotos/salud/kilos), con quién (solo amigos que aceptaste), consentimiento
  específico con checkbox + gate 18+/representante (§11) + apodo prellenado con el nombre de
  pila (decisión #1) + CTA «Crear mi perfil». Al crear → `LEGAL_V` NUEVO queda registrado en
  `consent_v`. (b) **Con opt-in** → Mi perfil (avatar/iniciales, apodo, bio, mi código
  GRANDE con copiar + compartir por `navigator.share`/`wa.me` reusando el patrón `shareApp`,
  toggles pausar/`show_today`, salir) · Solicitudes (recibidas: aceptar/rechazar; enviadas:
  «pendiente») · Agregar por código (input → resolver → confirmar → enviar; errores del RPC
  con mensaje humano, incluido el rate-limit) · Amigos (tarjeta: avatar, apodo, racha,
  nivel, punto «entrenó hoy», ❤️, menú ⋯ bloquear/reportar/eliminar; tocar = tarjeta
  ampliada). (c) **Offline** → «Conéctate para ver a tu gente» + caché marcada. (d) **Sin
  amigos** → empty state con CTA de compartir el código. (e) Perfil pausado → aviso.
- **`esc()` en handle y bio en TODO innerHTML** (requisito 🟡 — texto de OTRO usuario).
  Avatar solo se pinta si `cmtyAvatarOk(url)`. La comunidad JAMÁS bloquea entrenar: toda
  falla degrada a mensaje accionable, nunca pantalla rota ni error sin catch.
- Barra premium completa (360px, táctil ≥36px, ambos temas con tokens, tono Sofía, letra
  grande, reduced-motion) + entrada `AVI_NEWS` (v373, `coach:false`) con poda + correr
  `_verify-news`.

**C3.4 QA / verificación (cinturón completo):**
- Suite: tests nuevos de C3.2 (verde antes y después). Hook 11/11.
- Harness NUEVO `_verify-community.mjs` (CDP, sin login o cuenta QA, cloud sellado, CMTY
  stubbeado con fixtures): opt-in visible y gate de consentimiento (sin checkbox NO crea) ·
  control XSS (handle `<img onerror>`/`<script>` NO ejecuta, se pinta escapado) · avatar con
  URL externa NO se pinta (cae a iniciales) · tarjetas de amigos renderizan las stats ·
  ❤️ toggle · offline degradado (stub de red caída) · shots claro/oscuro verificados.
- Regresión de zona tocada: `_guiado-suite` (si se tocó `renderClientToday`/navegación),
  harnesses previos de la pestaña Hoy si aplica.
- **Sabotajes mínimos (reglas-opus §C):** (1) quitar `esc()` del handle → harness rojo;
  (2) quitar el gate de consentimiento → harness rojo; (3) romper `cmtyShouldRefresh`
  (debounce) → test rojo. Árbol limpio antes de cada sabotaje.
- Deploy: bump par 373 (python sin BOM) → push → curl Pages → `_prodcheck 373` verde.

**PROHIBIDO en C3:** tocar `user_data` o cualquier RLS/policy existente · construir feed o
ranking (Fase 2) · aflojar grants «para que sea más fácil» · claves de sesión · SB_KEYS
nuevos · DMs. Si algo del spec resulta inconstruible contra el esquema real, PARAR y
documentar para Fable — no improvisar arquitectura (reglas-opus §A).

**C4 — Legal + cierre — ✅ EJECUTADO (Opus, 2026-07-20, avi-v374; PENDIENTE veredicto de Fable).**
- **Texto legal:** nueva **sección 9 «Comunidad (función opcional)»** en `legal/politica-tratamiento-datos.md`
  (opt-in apagado por defecto; qué se comparte = apodo/avatar/resumen de constancia server-side y NUNCA
  datos crudos; qué NO se comparte jamás = peso/fotos/medidas/salud/kilos/mensajes; conexión solo por
  código mutuo; `show_today` ocultable; salir = borrado real del perfil+amistades; menores 18+/representante).
  Sigue siendo BORRADOR pendiente de abogado (mismo estatus que el resto de `legal/`, backlog legal general).
- **`LEGAL_V` subido** `2026-07-07-borrador`→`2026-07-20-borrador` (regla: cambió un doc de `legal/`).
  `CMTY_CONSENT_V` = `comunidad-2026-07-20-borrador` (evidencia del opt-in en `community_profiles.consent_v`
  + `consent_at`; el opt-in exige las 2 casillas → si hay fila, ambas se marcaron en esa versión).
- **Cableado:** en el opt-in, «política de tratamiento de datos» es un ENLACE real → `showLegalDoc('politica')`
  (abre `#m-legal` con la sección Comunidad). Harness `_verify-community` +CM10 (verifica el enlace end-to-end).
- **Tono (Sofía):** repaso de todo el texto visible = cálido, español colombiano, cero jerga (ya venía limpio de C3).
- **Riesgos §11 resueltos (no diferidos a Fase 2):** (a) patrones de actividad → `trained_today` con
  granularidad de DÍA (jamás hora) + toggle `show_today` server-side (la edge fuerza `false`); (b) menores →
  gate 18+/representante en el opt-in (casilla obligatoria) + cláusula en la política; **confirmar ambos con
  abogado** en la revisión legal pendiente. (c) avatares = bucket nuevo `avatars/{uid}/` con CHECK de prefijo
  (no toca la deuda de fotos-a-Storage legacy).
- **Radar de adopción (arrancar con el gym de Camilo):** medir con dos números sobre `community_profiles`
  (nº de perfiles opt-in) y `friendships` (nº de amistades `accepted`) a lo largo del tiempo; arrancar
  invitando a los asesorados activos de Camilo con su código. Métrica de éxito de la Fase 1 = ¿la gente crea
  perfil y se conecta? Si pega → Fase 2 (feed + ranking de constancia). Nota: consulta admin simple
  `select count(*) from community_profiles` / `select count(*) from friendships where status='accepted'`.
- **QA:** suite 405, hook 11/11, `_verify-community` 11/11 (+CM10), `_prodcheck 374`. Deploy avi-v374.

---

## 12. C5 — DIRECTORIO DEL GIMNASIO (cambio de concepto del PO, 2026-07-20) — ✅ EJECUTADO (avi-v375)

> ### ⚖️ RE-VERIFICACIÓN DE FABLE de C5 (2026-07-20) — 🟢 APROBADO CON RESERVA
> **Núcleo de seguridad: SÓLIDO (verificación independiente).** Re-corrí la infiltración (G1-G5, todo
> 403/0-filas) + ataques NUEVOS que Opus no probó: **RV2 un miembro NO puede enumerar el roster** del gym
> (solo ve su propia fila) · **RV3 al remover a un miembro, la visibilidad se revoca al instante**
> (`_same_community`→false) · RV1 el directorio funciona para miembros reales. Membresía imposible de
> falsificar (ni `coach_id` ni `tier`, ambos client-writable, sirven). Prod v375 limpio; datos de prueba
> purgados, fila de Camilo intacta.
>
> **🟡 HALLAZGO (RESERVA, cerrar antes de dar C5 por terminado): el BLOQUEO no oculta dentro del gym.**
> `cp_sel = propio OR _are_friends(aceptado) OR _same_community` — la rama de gym NO mira bloqueos. Dos
> compañeros de gym **se ven el perfil aunque uno bloquee al otro** (regresión: antes de C5, bloquear
> quitaba la visibilidad). Además, en el frontend `cmtyLoad`, un bloqueado (status 'blocked', ni accepted
> ni pending) **reaparece en «Tu gimnasio»** como «Agregar»-able (y re-agregar falla con error confuso por
> el UNIQUE). Relevante para el riesgo §11 (una asesorada que bloquea a un compañero espera desaparecer de
> él y NO desaparece). **Corrección recomendada:** (1) `_same_community`/`cp_sel` deben EXCLUIR pares con
> una amistad 'blocked' entre ellos; (2) `cmtyLoad` debe filtrar de `CMTY.gym` a quien tenga status
> 'blocked'. No es infiltración (el bloqueado ya era del mismo gym), pero sí un hueco de expectativa/seguridad.
> **VEREDICTO: el directorio es seguro contra extraños (lo crítico) y funciona; queda la reserva del bloqueo
> para el siguiente ciclo de Opus.**

> ### ✅ RESERVA CERRADA por Opus (2026-07-20, avi-v376; PENDIENTE re-verificación de Fable)
> El bloqueo ahora oculta también DENTRO del gym. **Raíz:** la rama `_same_community` de `cp_sel` no
> miraba bloqueos (la rama `_are_friends` ya era segura: exige 'accepted'). **Reproducido en prod** (tx
> con ROLLBACK, dos usuarios reales del mismo gym + amistad 'blocked'): `_same_community(a,b)=true`.
> **(1) Backend** — migración `c5_block_hides_in_gym` (artefacto `c5b_block_hides_in_gym.sql`): helper
> nuevo `private._is_blocked(u1,u2)` (simétrico, SECURITY DEFINER, private) + `_same_community` redefinida
> a `exists(mismo gym) AND NOT _is_blocked`. Verificado con dientes (misma tx, rojo→verde): sin bloqueo
> visible, con bloqueo oculto en ambas direcciones. Advisor de seguridad sin regresión.
> **(2) Frontend** (defensa en profundidad) — `cmtyLoad` arma `blockedIds` y excluye a los bloqueados de
> la partición del directorio, por si un perfil bloqueado llegara igual (regresión de RLS/caché).
> **Harness `_verify-community` 13/13** (+CM13, con sabotaje demostrado). Suite 405/405.

> **✅ CONSTRUIDO por Opus (2026-07-20, avi-v375; PENDIENTE re-verificación de Fable).** La corrección
> de Fable (F7) se profundizó: **NI `coach_id` NI `tier` sirven** (ambos escribibles por el cliente,
> verificado PATCH→200) → membresía en tabla nueva `community_gym_members`, escrita SOLO por el coach.
> Backend verificado adversarialmente por Opus (infiltración cerrada G1-G5, directorio funciona,
> advisor sin regresión). **Coach:** tarjeta «Comunidad de mi gym» en su Inicio → modal `#m-gym`
> (`openGymMgr`/`toggleGymMember`/`_renderGymMgr` en app-3) con switch por asesorado + «Yo participo»;
> `member_id` = auth uid (`DB.clients[].id` en modo auth). **Asesorado:** sección «Tu gimnasio» en
> `#cn-community` (`CMTY.gym` + `_cmtyGymHtml`/`cmtyGymAdd`) lista compañeros aún no conectados con
> «Agregar» (INSERT friendship directo, sin RPC). Escrituras por `AUTH.client()` + selladas en
> localhost. Harness `_verify-community` +CM11/CM12 (13/13). **Fase B (DMs en vivo) sigue pendiente.**
> Detalle original del diseño abajo (ya implementado).



> ### ⚖️ VEREDICTO DE FABLE (2026-07-20) — verificación del arco + revisión de C5
> **C3 (UI) + C4 (legal) + fix-avatar: ✅ APROBADO.** Verificación independiente: **16 sondeos
> adversariales desde la API real** (10 de Opus + 6 nuevos de Fable) — todos aguantaron: no-amigo no
> lee perfil/snapshot/user_data ajenos; el cliente no infla su racha (403 columna) ni edita
> consent_v/share_code; avatar externo rechazado por CHECK; req_handle anti-spoof graba el real;
> rate-limit del RPC muerde; ❤️ exige amistad; **NUEVO: no se puede suplantar perfil ajeno (F1),
> inyectar amistad entre terceros (F2), auto-aceptar la propia solicitud (F3), ni leer amistades/
> reacciones/reportes ajenos (F4-F6).** Sin scope creep (nunca `user_data`/`SB_KEYS`); suite 405,
> harness 11/11, prod v374 limpio; limpieza sin residuos, fila de Camilo intacta. Fix-avatar
> re-verificado (upsert 200). **El arco construido es sólido y queda VERIFICADO.**
>
> **C5 (diseño): 🟡 BENDECIDO CON CORRECCIÓN OBLIGATORIA (no construir sin resolverla).**
> **HALLAZGO F7 (Fable):** `coach_id` en `user_data` es **escribible por el cliente** (PATCH dio 200;
> además es como funciona `requestCoach` — un libre se auto-asigna `coach_id=COACH_UID`). Por tanto
> **derivar la pertenencia al gym del `coach_id` crudo es INSEGURO: cualquier usuario se pone
> `coach_id=<uid del coach>` y aparece en el directorio → ve a los 21 asesorados.** Dato real: el gym
> de Camilo ya tiene 5 filas `tier='libre'` (auto-asignadas); un extraño sería una 6ª.
> **CORRECCIÓN REQUERIDA:** la membresía del directorio debe ser **CONTROLADA POR EL COACH**, no
> auto-declarada. Opciones (a decidir en el build): (i) un flag por-asesorado que el coach activa
> («está en mi comunidad»); (ii) o gatear a asesorados que el coach REALMENTE posee (creados por él o
> convertidos a premium — `tier` NO 'libre'; un extraño no puede volverse premium, solo el coach lo
> convierte). `_same_gym` NO puede ser solo `coach_id=coach_id`. **Todo lo demás del diseño C5 (RLS
> con helper en `private`, UI «Tu gimnasio», agregar sin RPC, gym ve apodo+avatar+constancia) queda
> aprobado** una vez cerrada la fuente de membresía. Re-estipular §C5.1 con la corrección antes de ejecutar.


**Origen:** tras probar la Fase 1, Camilo pidió que la comunidad NO dependa de código: que la gente
se vea entre sí y se manden solicitudes. Decisiones del PO (AskUserQuestion 2026-07-20): **(A) alcance =
SOLO el gimnasio** (los que comparten coach; global público DESCARTADO por privacidad/menores/mujeres);
**(B) mensajería en vivo = FASE POSTERIOR** (primero el directorio, DMs después con su propio diseño).
Esto **revisa las decisiones #2 y #3** (el coach SÍ participa; hay directorio, pero acotado al gym).

**⚠️ Toca la RLS más sensible (visibilidad de `community_profiles`) → el PO decidió (2026-07-20) que
FABLE VERIFICA C3+C4+fix-avatar Y ESTIPULA/BENDICE este diseño C5 ANTES de que Opus lo construya (igual
que C1).** Diseño validado contra datos reales (read-only): la «gym key»
= `coalesce(user_data.coach_id, uid si role='coach')` agrupa correctamente el gym de Camilo = **22 personas**
(él + 21 asesorados). Un usuario libre sin coach → sin gym → no ve directorio (el código sigue disponible).

**C5.1 — RLS (migración):**
- Helper `private._same_gym(v uuid, t uuid)` SECURITY DEFINER (schema `private`, NO expuesto — patrón
  `_are_friends`): true si `gym_key(v)=gym_key(t)` y no es null. `gym_key(x)=coalesce(coach_id, uid si coach)`.
- Extender `cp_sel`: `using (user_id=auth.uid() OR _are_friends(...) OR private._same_gym(auth.uid(), user_id))`.
  → un compañero de gym puede LEER tu perfil (apodo, avatar, snapshot) ANTES de ser amigos. `share_code` sigue
  SIN grant al cliente (no se filtra). **Exposición nueva:** el snapshot (racha/nivel/`trained_today`) queda
  visible a TODO el gym; `trained_today` lo mitiga el toggle `show_today` (ya server-side). Racha/nivel = baja
  sensibilidad. **✅ RESUELTO por el PO (2026-07-20): el gym ve apodo+avatar+CONSTANCIA (racha/nivel)** — no se
  restringen columnas; `show_today` cubre la actividad diaria. (La opción de ocultar stats hasta la amistad se
  descartó: más trabajo y un directorio menos motivador.)
- `friendships`: sin cambio de esquema. Agregar desde el directorio = INSERT normal (ya tenemos su `user_id`,
  no hace falta `resolve_share_code`). El trigger y las policies de C1 siguen igual.

**C5.2 — Frontend (`app-7-community.js`):** sección «Tu gimnasio» en `#cn-community` (con perfil): lista de
compañeros de gym que NO son ya amigos ni tienen solicitud pendiente, cada uno con apodo+avatar+(stats) y botón
«Agregar». `cmtyLoadGym()` = `select ... from community_profiles` (RLS devuelve gym-mates+amigos) menos los ya
conectados. «Agregar» → `cmtyAddFriendDirect(userId)` (INSERT friendship, sin RPC). Reusa tarjeta/estilos. El
código para invitar de fuera se conserva. Barra premium + estados (gym vacío, offline).

**C5.3 — QA:** harness RLS con dos uids del MISMO gym y uno de OTRO gym: gym-mate LEE perfil, extraño NO,
`user_data` sigue blindada, amistad desde directorio funciona, `share_code` no se filtra. `_verify-community`
+ checks de la sección gym (lista, botón agregar, no muestra a extraños). Sabotajes: quitar `_same_gym` del
policy → gym-mate deja de verse (o al revés, extraño se ve = rojo).

**C5.4 — Actualizar:** decisiones #2/#3 (hecho arriba), no-goals §10 (el directorio deja de ser no-goal; DMs
sigue siendo no-goal HASTA la Fase B), footer.

**FASE B (posterior, su propio diseño): DMs en vivo entre amigos.** Tabla `community_messages` (RLS: solo entre
amigos aceptados), UI de conversación, **tiempo real con Supabase Realtime** (postgres_changes → el mensaje
llega sin recargar), no-leídos. Reusa patrones del chat coach↔asesorado (v321). Bloquear/reportar ya existen.
NO se construye hasta cerrar el directorio y ver tracción.

## 10. Lo que este doc NO propone (no-goals, para acotar expectativas)

- ❌ Mensajería directa entre amigos (ya hay chat con el coach; DMs = moderación/abuso → fuera).
- ❌ Directorio/buscador público de usuarios (privacidad).
- ❌ Ranking por kilos crudos (§3.3).
- ❌ Comentarios en el feed en Fase 2 (moderación pesada → diferidos).
- ❌ Aflojar la RLS de `user_data` (jamás).
- ❌ Que la comunidad bloquee o dependa del flujo de entreno.

## 11. Riesgos residuales / radar

- **Costo Supabase:** un feed genera lecturas frecuentes → vigilar cuota (plan Free). Cachear,
  paginar, no *polling* agresivo.
- **Masa crítica:** una comunidad vacía se siente muerta. Fase 1 debe empujar la invitación
  (se cruza con la idea #4). Si Camilo tiene pocos asesorados activos, arrancar con su gym.
- **Moderación humana:** los reportes necesitan que alguien (Camilo) los revise. Definir el
  flujo mínimo (email al coach / vista admin).
- **Diseño premium:** aplica la barra premium completa (móvil 360-390, ambos temas, tono Sofía,
  estados vacíos/offline, táctil ≥36px).
- **🔴 Patrones de actividad (añadido por Fable):** `trained_today` + `snapshot_at` le dicen a un
  "amigo" CUÁNDO alguien está o no está en el gym — con usuarias mujeres eso es un dato de
  seguridad personal, no una stat. Mitigar: granularidad gruesa (día, jamás hora), toggle
  "ocultar mi actividad de hoy" dentro del opt-in, y recordar que amistad = confianza mutua
  aceptada (por eso NO hay directorio). Evaluar si `trained_today` aporta lo suficiente para
  existir en Fase 1.
- **Menores de edad (añadido por Fable):** hay asesorados adolescentes reales (p. ej. registro
  de 2009 en la base). Habeas Data reforzado para menores → la comunidad podría requerir 18+
  en el consentimiento, o autorización del representante. Consultarlo en la revisión de abogado
  YA pendiente en el backlog legal.
- **Avatares = moderación + infraestructura (añadido por Fable):** el avatar opt-in choca con el
  bug pendiente de fotos-a-Storage (backlog 2026-07-12: rutas legacy vs uuid, policies rotas).
  NO montar avatares sobre esa base rota: o Fase 1 arranca con avatar de iniciales/color (cero
  fotos, cero moderación), o primero se paga la deuda de Storage. Recomiendo iniciales en Fase 1.

---

*Siguiente paso (2026-07-20): **Fase 1 COMPLETA en prod (avi-v374).** Fable re-verifica el arco
C3 (UI) + C4 (legal) con sabotajes propios + prod. Luego: revisión de abogado de los textos de
`legal/` (backlog general) + arrancar la adopción con el gym de Camilo. Fase 2 (feed + ranking de
constancia) SOLO si la Fase 1 tiene tracción real.*

---

## 13. COMUNIDAD v2 — RED SOCIAL (giro de visión del PO, 2026-07-20)

> **Origen:** Camilo, tras cerrar C5, pidió ir más lejos: *"los mensajes en vivo sí o sí… quiero
> que la comunidad sea tipo red social tipo Instagram, que se puedan seguir entre usuarios, que si
> quieren publicar sus rutinas lo puedan hacer… mi perfil de coach también público… y no me gusta
> eso de ver si entreno o no, mejor 'activo hace una hora / un día' y que sea a elección del
> usuario."* Reconoció (correctamente) que veníamos conservadores. Este es un cambio de PRIVACIDAD
> grande → **el ciclo se respeta: Opus diseña (esta sección) · Fable planifica la RLS ANTES de
> construir · Opus construye · Fable verifica.** No se improvisa.

### 13.0 Decisiones del PO (AskUserQuestion, 2026-07-20 — NO re-preguntar)
- **Modelo de visibilidad = INSTAGRAM REAL:** perfil PÚBLICO por defecto, con **cuenta privada
  opcional** (aprobar seguidores). **Menores → privados automáticos y NO descubribles** por
  extraños. **Publicar rutina = opt-in por rutina.** **Última conexión = opt-in.** (Descartados:
  "todo público para todos" = reabre el riesgo de menores/mujeres que el PO mismo vetó en C5;
  "público solo entre conectados" = quedó como punto medio, no elegido.)
- **Orden de construcción:** ① CHAT EN VIVO → ② última conexión opt-in (reemplaza `trained_today`)
  → ③ perfil público del coach + SEGUIR → ④ publicar rutinas / feed.

### 13.1 Cambio de eje respecto a Fase 1 (lo que hay que ver claro)
Fase 1/C5 fue deliberadamente CERRADA (amigos por código + directorio del propio gym) por menores
y mujeres. v2 abre a **seguir a cualquiera** y **perfiles públicos**. El modelo Instagram elegido
TRAE el candado: cuenta privada + menores protegidos. La RLS deja de ser "solo mi gym / solo
amigos aceptados" y pasa a **"público salvo cuenta privada; privado ⇒ solo seguidores aprobados;
menor ⇒ privado forzado y fuera de descubrimiento"**. Esta es la pieza que Fable debe planificar
con lupa (es un ensanchamiento de visibilidad, la dirección más peligrosa).

### 13.2 FASE 0 — verificado contra el código real (2026-07-20)
- **`supabase-js@2` YA cargado** (index.html) → Realtime (`.channel()`) disponible **sin nueva
  dependencia** (respeta single-file/no-deps). Realtime se habilita por-tabla en Supabase.
- **El chat coach↔asesorado de HOY NO es apto para tiempo real:** vive en `ax_m` (DB.msgs), un
  BLOB del todo-en-uno `apex_data`, sondeado por `fetch` cada 15s (`pollMessages`, app-1-infra).
  No hay filas por mensaje. Para instantáneo hace falta un **modelo NUEVO de mensajes por fila**.
- **Ya existe base social:** `community_profiles` (opt-in, snapshot server-side), `friendships`
  (pending/accepted/blocked, con `_are_friends`/`_is_blocked`), `community_reactions`,
  `community_reports`, `community_gym_members`. v2 REUTILIZA esto; NO se tira nada.

### 13.3 Diseño propuesto por slice (Opus — sujeto a plan de RLS de Fable)

**① CHAT EN VIVO (Realtime).** Tabla nueva `community_messages` (id, from_user, to_user, text,
created_at, read_at). RLS: leer/insertar SOLO si eres parte del hilo (`auth.uid() in (from,to)`) Y
existe relación que permita DM (seguidor mutuo / amistad aceptada / coach↔su-asesorado — a definir
con Fable). Suscripción `channel('dm:'+peer)` que apinta el hilo abierto al instante; push (ya
existe) cubre app cerrada. **Decisión de arquitectura para Fable:** ¿capa de mensajería ÚNICA que
sirva coach↔asesorado Y DMs de comunidad, o `community_messages` SOLO para comunidad y el chat
coach sigue en `ax_m`? Migrar el chat coach del blob a filas es potente pero toca datos reales
offline-first (riesgo). Recomendación inicial: `community_messages` nuevo para DMs de comunidad;
el chat coach↔asesorado se MIGRA en un slice aparte, después, con su propio harness.

**② ÚLTIMA CONEXIÓN opt-in (reemplaza `trained_today`).** Campo `last_active` (timestamptz,
server-side, actualizado en el refresh de snapshot / al abrir) + flag `show_last_active` (opt-in).
Se muestra como relativo ("activo hace 5 min / 1 h / 2 d") SOLO si el dueño lo comparte. `trained_today`
se retira de la cara pública (era un patrón de actividad que el PO no quiere). Presentación pura en
avi-core (`relativeLastSeen(ts, now)`), determinista.

**③ PERFIL PÚBLICO + SEGUIR.** Tabla `follows` (follower, followee, created_at, state:
'active'|'pending' — pending solo si la cuenta destino es privada). Flag `community_profiles.is_private`
(default false) + `is_minor` (derivado/forzado privado). RLS de `community_profiles` se reescribe:
visible si `not is_private` (y not menor-a-extraño) OR sigues-aprobado OR eres el dueño. El coach
obtiene su `community_profiles` como cualquiera (perfil público del entrenador = vitrina). `follows`
reemplaza conceptualmente a `friendships` para el eje social (friendships/bloqueo se conservan para
bloquear/reportar).

**④ PUBLICAR RUTINAS / FEED.** Tabla `community_posts` (autor, tipo='rutina', payload jsonb con la
rutina — ejercicios/series, SIN datos de salud/peso, opt-in por rutina, `esc()` en todo texto).
Feed = posts de a quien sigues (+ propios), server-side, paginado. Reacciones ❤️ reutilizan
`community_reactions`. Moderación: reporte ya existe; evaluar límite de rate.

### 13.4 Riesgos y candados (para el plan de Fable)
- **Ensanchamiento de visibilidad** = la RLS de `community_profiles` pasa de restrictiva a
  permisiva-por-defecto. Menores DEBEN quedar forzados a privado y fuera de descubrimiento.
  **EDAD (confirmado por el PO 2026-07-20): SÍ se guarda la edad de los asesorados** (`client.age`
  en la ficha). Hueco conocido: los **auto-registrados** pueden no tenerla → la salida limpia es
  **pedir fecha de nacimiento al ACTIVAR el perfil público** y forzar a privado a los menores
  (`is_minor` derivado server-side, no client-writable — lección F7/gotcha de campos client-writable).
  La verificación de edad debe ser server-side; el gate 18 del consentimiento no basta como dato firme.
- **DM abuse:** ¿quién puede escribir a quién? (seguidor mutuo vs cualquiera). Bloqueo debe cortar
  DM y visibilidad (ya tenemos `_is_blocked`).
- **Publicar rutina** no debe filtrar nada sensible (es solo ejercicios; validar el payload).
- **Realtime** respeta la RLS de la tabla (Supabase la aplica a los eventos) — verificar que un
  tercero no reciba eventos de un hilo ajeno.
- **Offline-first:** la comunidad NO entra a SB_KEYS ni al blob; todo por `AUTH.client()` + Realtime.

### 13.5 Siguiente paso
Opus entrega este diseño → **Fable planifica la RLS del modelo Instagram (13.3③) y del chat en vivo
(13.3①) ANTES de construir** (cambio de privacidad, como en C5). Se arranca por ① CHAT EN VIVO.

---

## 13-BIS. ESTIPULACIÓN RLS — COMUNIDAD v2 (Fable → Opus; planificación de seguridad ANTES de construir)

> **Autor:** Fable, 2026-07-20. Verificado contra el esquema REAL (MCP Supabase read-only, proyecto
> `eoebhrxbokyllqalyecj`) y contra datos reales: `community_profiles` tiene **2 filas existentes**
> (opt-in de Fase 1, ya en prod — un default nuevo NO puede exponerlas retroactivamente); `user_data`
> tiene **asesorados reales de 16, 17 y 18 años** (Santiago Santos 17, Valery Valbuena 16, Sharith
> Sofía 16, Felipe/Sofía/Cristian/Hernan/jhojan a los 18 — frontera legal) y varios con `age: null`
> (auto-registrados: Stevan Guerrero). La publicación `supabase_realtime` existe pero **con CERO
> tablas añadidas** — Realtime no está habilitado en NADA todavía. `c1_community_foundations.sql`
> hoy da `grant select on community_profiles to authenticated` **de TABLA COMPLETA** (no por columna)
> — esto importa mucho para §13-BIS.3. Este documento ejecuta la regla del proyecto: *Fable planifica
> → Opus ejecuta → Fable verifica.* NADA de esto se aplica a producción sin que Opus lo construya bajo
> `docs/reglas-opus.md` y sin el veredicto de Fable después.

### 13-BIS.0 Alcance de esta sesión de planificación
Se estipula en DETALLE: **① `community_messages`** (chat en vivo, primer slice que Opus construye) y
**③ el modelo de visibilidad** (`community_profiles` público/privado + `follows` + menores). **②**
(`last_active` opt-in) y **④** (`community_posts`) van más ligeros, como pidió el PO indirectamente
(orden de construcción ①→②→③→④, pero el candado de visibilidad de ③ es el que hace seguro a TODO lo
demás, así que se especifica ya). **NO se construye ② line, ③ ni ④ todavía** — el primer commit de
Opus es SOLO ①. El resto de esta estipulación es el mapa para cuando lleguen esas sesiones, para que
Opus no diseñe la RLS de menores/visibilidad sobre la marcha cuando construya ③.

### 13-BIS.1 Corrección de arquitectura, ANTES de las tablas (2 cambios que Opus debe adoptar)

**(a) `is_private` en la migración de columnas nuevas SIEMPRE nace `default true` (privado), NUNCA
`false`.** El giro de producto ("público por defecto") es una decisión de **UX para el formulario de
alta** (el checkbox de "hacer mi perfil público" puede venir pre-marcado para un usuario NUEVO que
recién activa su perfil) — **no es una instrucción para el `ALTER TABLE`**. Si la columna nace con
`default false` (=pública), las **2 filas que ya existen hoy en prod** (gente que activó su perfil bajo
el modelo "solo amigos/gym" de Fase 1/C5) quedarían **públicas de un día para otro sin haberlo
consentido nunca** — viola §4.1 del propio doc ("por defecto, TODO privado") y es una regresión de
privacidad real, no hipotética, con datos reales de por medio. Opus expone "público" como opción en la
UI de alta; el dato en DB arranca conservador siempre.

**(b) El GRANT de SELECT de `community_profiles` deja de ser de tabla completa.** Hoy (`c1_community_foundations.sql`
línea 198) es `grant select on public.community_profiles to authenticated` — **toda columna, para
cualquier fila que la RLS deje pasar**. Bajo Fase 1/C5 esto solo importaba entre amigos/gym-mates
(círculo ya de confianza). **En v2, la rama nueva de `cp_sel` abre filas a "cualquier desconocido con
perfil público"** (es literalmente lo que pidió el PO) — con el grant actual, ESE desconocido lee
también `share_code` (destruye el rate-limit/anti-enumeración que existe *solo* para proteger
`resolve_share_code`), `consent_v`/`consent_at` (metadata de evidencia legal, sin necesidad de ser
pública) y, peor, **`birth_date` nuevo (§13-BIS.3) — la fecha de nacimiento exacta de un menor, en
texto plano, para cualquier desconocido autenticado.** Esto es inaceptable con la población real de
AVI (adolescentes reales, algunos sin coach directo verificándolos). Corrección obligatoria:

```sql
-- reemplaza el grant de tabla completa por uno de columnas (las mismas que hoy consulta
-- app-7-community.js:105-106 explícitamente + is_private + role, nada nuevo sensible):
revoke select on public.community_profiles from authenticated;
grant select (user_id, handle, avatar_url, bio, visible, is_private,
              streak_weeks, sessions_4w, level, achievements, role, created_at)
  on public.community_profiles to authenticated;
-- share_code, consent_v, consent_at, birth_date, last_active (crudo) quedan FUERA del grant general.
```
`trained_today`/`snapshot_at` se retiran del grant general por decisión del PO (§13.0, "no me gusta
ver si entrenó") — dejan de estar en la lista; el cliente YA NO puede leerlos ajenos (siguen
escribiéndose server-side por si `refresh_snapshot` los sigue usando internamente, pero nadie los lee
por API). Para que el DUEÑO siga viendo su propio `share_code`/`consent_v`/`consent_at` (la app hoy se
los muestra: "mi código para compartir"), una función chica en vez de reabrir el grant:
```sql
create function public.cmty_my_secrets()
  returns table(share_code text, consent_v text, consent_at timestamptz)
  language sql stable security invoker set search_path = '' as $$
  select share_code, consent_v, consent_at from public.community_profiles where user_id = auth.uid();
$$;
grant execute on function public.cmty_my_secrets() to authenticated;
```
`security invoker` (default, explícito por claridad) → sigue pasando por `cp_sel`, que ya permite
`user_id = auth.uid()`; no hace falta `security definer`. Opus debe actualizar la carga del **propio**
perfil (`app-7-community.js:83`, hoy `select('*')`) a la lista de columnas seguras + un llamado a
`cmty_my_secrets()` para pintar el código/evidencia. Las cargas de amigos/gym (líneas 105-106, ya
explícitas por columna) casi no cambian — solo pierden `trained_today`.

### 13-BIS.2 ① `community_messages` — chat en vivo (PRIMER slice, el que Opus construye ahora)

**Candado de "quién puede escribirle a quién" — reutiliza lo que YA existe, cero relación nueva:**
en este slice ③ (follows) todavía no existe, así que el único universo seguro de pares que pueden
tener DM es el mismo que ya está *server-verificado* hoy: **amistad `accepted`** (`private._are_friends`)
**O compañeros del mismo gym** (`private._same_community`, que desde `c5b` ya excluye bloqueados en
ambas direcciones). Ninguna de las dos depende de `coach_id`/`tier` client-writable (la lección F7).
Cuando ③ llegue, la ampliación a "seguidor mutuo" se decide aparte (ver nota al final) — **no se abre
DM a "cualquiera que te sigue"** de entrada, es superficie de acoso demasiado grande con adolescentes
reales en la base.

```sql
create table public.community_messages (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users(id) on delete cascade,
  to_user    uuid not null references auth.users(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
alter table public.community_messages enable row level security;
alter table public.community_messages replica identity full;  -- Realtime necesita la fila vieja completa en UPDATE (marcar leído)

-- helper reutilizado, en private (no expuesto), mismo patrón que _are_friends/_same_community:
create function private._can_dm(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select private._are_friends(a,b) or private._same_community(a,b);
$$;
revoke all on function private._can_dm(uuid,uuid) from public;
grant execute on function private._can_dm(uuid,uuid) to authenticated, service_role;

-- anti-flood: tope simple, cuenta mensajes propios en la última ventana
create table public._cm_rate (uid uuid not null, minute timestamptz not null, count int not null default 0, primary key(uid, minute));
create function public._community_msg_rate_limit() returns trigger language plpgsql set search_path = '' as $$
declare m timestamptz := date_trunc('minute', now()); n int;
begin
  insert into public._cm_rate(uid, minute, count) values (new.from_user, m, 1)
    on conflict (uid, minute) do update set count = public._cm_rate.count + 1 returning count into n;
  if n > 30 then raise exception 'rate limit exceeded'; end if;   -- 30 mensajes/minuto/usuario, generoso para chat real, corta flood de script
  return new;
end $$;
create trigger trg_cm_rate before insert on public.community_messages
  for each row execute function public._community_msg_rate_limit();

create policy cm_sel on public.community_messages for select
  using (auth.uid() in (from_user, to_user));
create policy cm_ins on public.community_messages for insert with check (
  from_user = auth.uid() and from_user <> to_user and private._can_dm(from_user, to_user)
);
-- SOLO el destinatario marca leído; nada más es mutable (el emisor no puede reescribir su propio texto)
create policy cm_upd on public.community_messages for update
  using (to_user = auth.uid()) with check (to_user = auth.uid());

revoke all on public.community_messages from anon, authenticated;
grant select, insert on public.community_messages to authenticated;
grant update (read_at) on public.community_messages to authenticated;   -- columna ÚNICA escribible por el cliente
grant all on public.community_messages to service_role;

-- Realtime: la tabla no está en la publicación (verificado — CERO tablas hoy). Sin esto no llega nada.
alter publication supabase_realtime add table public.community_messages;
```
**No hay DELETE** (nadie "desmanda" un mensaje en Fase 1 de chat; si se quiere luego, política aparte).
**No es un upsert** — usar `.insert()` para enviar y `.update({read_at:...})` (nunca `.upsert()`) para
marcar leído, así el gotcha "upsert exige SELECT" ni aplica aquí (ya hay SELECT de sobra, pero mejor
evitar el patrón por completo cuando no hace falta resolver conflicto).

**Cómo Realtime respeta la RLS (y qué debe probar Opus, no asumir):** Supabase Realtime evalúa la
policy SELECT de la tabla **por cada suscriptor, por cada fila cambiada**, usando el JWT de la sesión
del cliente (no la anon key) — un evento de INSERT/UPDATE solo se entrega a un socket cuyo `auth.uid()`
pasaría `cm_sel` para esa fila. Esto es automático en cuanto la tabla está en `supabase_realtime` y RLS
está activo (ya lo está) — **pero "debería funcionar así" no es un veredicto; Opus lo demuestra**:
1. Dos sesiones autenticadas SIN relación entre sí (ni amigos ni mismo gym): sesión A se suscribe
   **sin filtro** (`channel('any').on('postgres_changes',{event:'*',schema:'public',table:'community_messages'},cb)`)
   — la config más laxa posible del lado cliente. Sesión B (amiga de una C cualquiera) inserta un
   mensaje a C. **Assert: A recibe CERO eventos.**
2. A y B SÍ son amigos/gym-mates: A se suscribe (con o sin filtro), B inserta → A recibe el evento.
   Confirma que no quedó sobre-restringido por accidente.
3. Verificar que el cliente pasa el JWT de sesión al canal Realtime (no la anon key) — `supabase-js@2`
   lo hace automático al usar el cliente autenticado ya existente (`AUTH.client()`), pero probarlo con
   una sesión real, no asumirlo de la documentación.
4. Sabotaje del rate-limit: 40 inserts en <60s desde una cuenta → el #31 en adelante debe rechazar.

### 13-BIS.3 ③ Modelo de visibilidad — `community_profiles` público/privado + menores

**Columnas nuevas:**
```sql
alter table public.community_profiles
  add column is_private        boolean not null default true,   -- §13-BIS.1(a): SIEMPRE privado por default
  add column birth_date        date,                             -- SOLO la escribe la edge (ver abajo); NUNCA client-writable
  add column last_active       timestamptz,                      -- server-set (② , ver 13-BIS.4-ligero)
  add column show_last_active  boolean not null default false,   -- opt-in, SÍ client-writable (preferencia)
  add column role              text not null default 'client' check (role in ('coach','client'));  -- para el "perfil de coach público" (③)
```
`role` se fija SOLO en el `INSERT` (trigger que lee `user_data.role` para `new.user_id` — es una
lectura de la PROPIA fila del que se está registrando, `auth.uid()=user_id` ya se lo permite la RLS de
`user_data` sin necesitar `security definer`); no lleva grant de UPDATE al cliente — nadie se auto-nombra
coach.

**Detección de menor — infalsificable, sin columna `is_minor` que pueda quedar obsoleta:** en vez de
guardar un booleano que hay que mantener sincronizado (y que puede quedar "congelado" en `true` para
alguien que ya cumplió 18, o peor, mal escrito una vez y nunca corregido), la minoría de edad se
**calcula en el momento**, siempre desde `birth_date`:
```sql
create function private._is_minor(u uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select date_part('year', age(now(), cp.birth_date)) < 18 from public.community_profiles cp where cp.user_id = u),
    true    -- SIN fecha de nacimiento confirmada = tratar como menor (fail-safe, nunca fail-open)
  );
$$;
revoke all on function private._is_minor(uuid) from public;
grant execute on function private._is_minor(uuid) to authenticated, service_role;
```
**El candado real (que no depende de que la app lo respete) es un TRIGGER, no la app:**
```sql
create function public._community_enforce_minor_privacy() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.birth_date is null or date_part('year', age(now(), new.birth_date)) < 18 then
    new.is_private := true;   -- pisa lo que haya mandado el cliente, SIEMPRE, en INSERT y en UPDATE
  end if;
  return new;
end $$;
create trigger trg_enforce_minor_privacy before insert or update on public.community_profiles
  for each row execute function public._community_enforce_minor_privacy();
```
Corre en TODO insert/update (incluso los del `service_role`, incluida la propia edge) — la invariante
"sin fecha o menor ⇒ privado forzado" no tiene forma de saltarse. El cliente puede seguir teniendo
`grant update (is_private)`, porque el trigger es la autoridad final, no el grant.

**`birth_date` — de dónde sale, sin dejarlo client-writable directo:** una edge function NUEVA
`activate_public_profile` (verify_jwt, mismo patrón que `refresh_snapshot`):
- recibe `birth_date` del propio usuario (autoafirmado — **igual que Instagram/Meta, no hay verificación
  de identidad mejor disponible**; esto es un riesgo residual de PRODUCTO/LEGAL, no un hueco técnico —
  ya está anotado en §11 y debe confirmarlo el abogado en la revisión pendiente);
- **rechaza si `community_profiles.birth_date` YA tiene valor** (escritura única — nadie "recalibra" su
  edad después de construir seguidores para intentar zafarse de `is_minor`);
- escribe `birth_date` con `service_role` (el cliente NUNCA tiene grant de columna sobre `birth_date`,
  ni INSERT ni UPDATE — cero excepciones);
- el trigger de arriba corre igual sobre esta escritura y fuerza `is_private` según corresponda.
- El toggle "quiero que mi perfil sea público" en la UI simplemente llama esta edge (si aún no hay
  `birth_date`) y LUEGO intenta `update({is_private:false})` normal — si es menor, el trigger lo
  revierte a `true` en silencio; la UI debe releer la fila tras el update y reflejar el valor REAL
  (nunca asumir que lo que mandó es lo que quedó).

**RLS de `community_profiles` v2 — reemplaza `cp_sel` de C5:**
```sql
drop policy cp_sel on public.community_profiles;
create policy cp_sel on public.community_profiles for select
  using (
    user_id = auth.uid()
    or private._are_friends(user_id, auth.uid())
    or private._same_community(auth.uid(), user_id)
    or (is_private = false and not private._is_minor(user_id))   -- rama NUEVA: público real
  );
```
La rama nueva es defensa en 2 capas a propósito: `is_private=false` ya es imposible para un menor
(trigger), y el `not private._is_minor(...)` es un cinturón adicional por si el trigger tuviera un bug
algún día — barato, y es exactamente el tipo de "candado que sobrevive al siguiente refactor" que pide
la doctrina del proyecto.

**Esto abre enumeración pública — es SABIDO y ACEPTADO, no un hallazgo:** con esta policy, cualquier
autenticado puede hacer `select` sin `where` y recibir TODAS las filas con `is_private=false` (columnas
seguras del grant de §13-BIS.1b). Eso es literalmente lo que el PO pidió ("tipo Instagram", perfiles
públicos descubribles) — no se re-decide producto. Lo único que Fable exige es que esa lista NUNCA
incluya `share_code`/`consent_*`/`birth_date`/`last_active` crudo (ya resuelto en §13-BIS.1b) y que
NINGÚN menor pueda entrar jamás a esa lista (ya resuelto arriba, con doble candado).

### 13-BIS.4 `follows` (③, forma completa porque gatea DM futuro) y ② `last_active` (ligero)

```sql
create table public.follows (
  follower   uuid not null references auth.users(id) on delete cascade,
  followee   uuid not null references auth.users(id) on delete cascade,
  state      text not null default 'pending' check (state in ('active','pending')),
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
alter table public.follows enable row level security;

create function public._community_follow_state() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare tgt_private boolean;
begin
  if private._is_blocked(new.follower, new.followee) then raise exception 'blocked'; end if;
  select is_private into tgt_private from public.community_profiles where user_id = new.followee;
  if tgt_private is null then raise exception 'no target profile'; end if;
  new.state := case when tgt_private then 'pending' else 'active' end;   -- SECURITY DEFINER: puede leer is_private de un privado sin que cp_sel se lo permita al cliente
  return new;
end $$;
create trigger trg_follow_state before insert on public.follows
  for each row execute function public._community_follow_state();

create function public._community_follow_accept() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.state = 'pending' and new.state = 'active' then
    if auth.uid() <> old.followee then raise exception 'only followee accepts'; end if;   -- el solicitante no se auto-aprueba
    return new;
  end if;
  raise exception 'invalid transition';
end $$;
create trigger trg_follow_accept before update on public.follows
  for each row execute function public._community_follow_accept();

create policy fo_sel on public.follows for select using (auth.uid() in (follower, followee));  -- NO enumeración de red ajena
create policy fo_ins on public.follows for insert with check (follower = auth.uid());
create policy fo_upd on public.follows for update using (auth.uid() in (follower, followee)) with check (auth.uid() in (follower, followee));
create policy fo_del on public.follows for delete using (auth.uid() in (follower, followee));  -- unfollow o rechazar/quitar seguidor

revoke all on public.follows from anon, authenticated;
grant select, insert, update, delete on public.follows to authenticated;
grant all on public.follows to service_role;
```
`fo_sel` deliberadamente NO deja ver la red de un tercero (ni siquiera de un perfil público) — sabes a
quién sigues tú y quién te sigue a ti, no el grafo ajeno completo (evita el mismo tipo de fuga que
`_are_friends` ya evitaba para amistades). Si el producto quiere mostrar "1.2k seguidores" en un perfil
público, eso es un **conteo agregado** vía una función `security definer` que devuelve solo el número,
nunca la lista — se agrega cuando haga falta, no antes.

**② `last_active` — más ligero, pero con una nota de seguridad que Opus debe respetar:** un timestamp
CRUDO expuesto en tiempo real reintroduce el MISMO riesgo por el que se retiró `trained_today` (§11:
"patrones de actividad") — y potencialmente peor, porque es de grano fino ("hace 4 minutos" delata que
la persona está con el teléfono en la mano AHORA MISMO), mientras que `trained_today` era un booleano
diario. **Recomendación:** no exponer `last_active` crudo en el grant general en absoluto (ya excluido
en §13-BIS.1b); en vez de eso, una función chica que devuelve una etiqueta YA redondeada:
```sql
create function public.cmty_activity_label(target uuid) returns text
  language sql stable security invoker set search_path = '' as $$
  select case
    when not show_last_active then null
    when last_active > now() - interval '30 minutes' then 'ahora'
    when last_active > now() - interval '1 day'       then 'hoy'
    when last_active > now() - interval '7 days'       then 'esta semana'
    else 'hace tiempo'
  end
  from public.community_profiles where user_id = target;
$$;  -- security invoker → sigue pasando por cp_sel; si no puedes ver el perfil, tampoco esto
grant execute on function public.cmty_activity_label(uuid) to authenticated;
```
`last_active` en sí lo escribe server-side (la edge `refresh_snapshot` o un `touch` liviano al abrir la
pestaña — decisión de Opus, sin exponerlo jamás crudo al cliente).

### 13-BIS.5 ④ `community_posts` — ligero, reusa el candado de visibilidad de ③

```sql
create table public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.community_profiles(user_id) on delete cascade,
  kind       text not null default 'routine' check (kind in ('routine')),
  payload    jsonb not null,
  visible    boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.community_posts enable row level security;
```
**Regla de oro: NO se re-inventa la visibilidad.** Extraer la condición de `cp_sel` a un helper
reusable `private._profile_visible(viewer uuid, owner uuid)` (mismo cuerpo que la `using` de §13-BIS.3)
y usarlo TAMBIÉN en `community_posts` (`select` permitido si `_profile_visible(auth.uid(), user_id) and
visible=true`) — si algún día cambia la regla de quién ve a quién, cambia en un solo lugar, no en dos
policies que se puedan desincronizar (exactamente la clase de bug que la doctrina del proyecto pide
matar de raíz, no parchar en cada tabla nueva por separado).
**Validación de payload — allow-list, no deny-list:** un trigger `BEFORE INSERT OR UPDATE` que rechaza
si `payload` trae cualquier clave fuera de `{name, days, exercises}` y dentro de `exercises[]` cualquier
clave fuera de `{name, muscle, sets, reps, type}` — nunca intentar bloquear "palabras prohibidas" como
`peso`/`kg`/`salud` (se evade trivial); solo lo explícitamente permitido puede pasar. `esc()` en `name`
y en cualquier texto libre al pintarlo (mismo requisito que `handle`/`bio` en C3).
**Reacciones sobre posts:** reusan `community_reactions.context = post.id::text`; **decisión abierta
para cuando se construya ④ (no la resuelvo ahora, la marco):** ¿cualquiera que VE el post puede
reaccionar (más viral, más superficie de spam/acoso) o solo quien sigue al autor / es su amigo/gym-mate
(más conservador)? Recomiendo lo segundo para el arranque — se puede aflojar después con datos, aflojar
una policy es reversible y barato; apretarla después de que ya hubo abuso, no tanto.

### 13-BIS.6 Bloqueo corta DM y visibilidad — resumen explícito
Ya está resuelto por reutilización, no por código nuevo: `private._are_friends` exige `status='accepted'`
(un bloqueo nunca es `accepted`) y `private._same_community` (desde `c5b`) ya excluye pares con
`_is_blocked=true` en ambas direcciones. Como `_can_dm` (§13-BIS.2) y la rama de amistad de `cp_sel`
se apoyan en esos dos helpers, **un bloqueo corta DM Y visibilidad automáticamente, sin condición
adicional que Opus tenga que acordarse de escribir.** La única rama que el bloqueo NO toca es la
"pública real" (`is_private=false`) — es decir, si dos desconocidos con perfiles públicos se bloquean,
el bloqueo NO los hace invisibles entre sí en un directorio público (nadie "oculta" un perfil público
de un usuario específico sin un mecanismo nuevo). Si el PO quiere que un bloqueo oculte también en la
rama pública, es una función `private._is_blocked` adicional en esa rama del `cp_sel` — trivial de
añadir, pero es una decisión de producto ("¿el bloqueo debe ganarle a 'soy público'?") que dejo
marcada, no resuelta unilateralmente.

### 13-BIS.7 Recordatorio anti-upsert / vías sancionadas (regla del proyecto, repetida a propósito)
Ninguna tabla de este documento usa `.upsert()` desde el cliente (todas usan INSERT+UPDATE separados
explícitos), así que el gotcha "upsert exige política SELECT" no aplica hoy — **pero si Opus decide en
la implementación real usar `.upsert()` en cualquier punto** (por ejemplo, para "marcar todos los
mensajes de un hilo como leídos" de una vez), esa tabla necesita policies INSERT+UPDATE+**SELECT**, las
tres, sin excepción (bug real de `push_subscriptions`, 2026-07-12; bug real de `avatars` Storage,
2026-07-20 — ambos en GOTCHAS VIGENTES). Toda escritura, sin excepción, por `AUTH.client()` — jamás
`fetch` crudo con `Bearer` extraído a mano (el token se vence y PostgREST lo trata como anónimo).

### 13-BIS.8 Checklist de sabotaje adversarial — Opus DEBE pasar todos antes de declarar ① o ③ "hecho"
1. Extraño (sin amistad/gym/seguimiento) lee `community_profiles` de alguien con `is_private=true` →
   0 filas.
2. Extraño lee el perfil de un MENOR conocido por `user_id` (perfil forzado privado) → 0 filas, aunque
   el atacante intente forzar `is_private=false` desde su lado (no aplica: RLS es del dueño de la fila).
3. Cliente intenta `UPDATE`/`INSERT` directo de `birth_date` vía PostgREST → rechazado (sin grant de
   columna); solo la edge `activate_public_profile` (service_role) escribe esa columna, y solo una vez.
4. Cliente llama la edge dos veces con fechas de nacimiento distintas (intento de "recalibrarse" adulto
   después de fijarse menor) → la 2ª llamada rechaza (columna ya no-null).
5. Cliente intenta `UPDATE is_private=false` en su propia fila siendo menor (o con `birth_date` null) →
   el trigger lo revierte a `true`; verificar con un `SELECT` posterior, no confiar en la respuesta del
   `UPDATE`.
6. Cliente lee `share_code`/`consent_v`/`consent_at`/`birth_date`/`last_active` crudo de OTRO usuario
   (amigo, gym-mate o desconocido con perfil público) → siempre ausente (columna no seleccionable),
   incluso pidiendo `select('*')` explícito.
7. Extraño sin amistad ni gym intenta `INSERT` en `community_messages` hacia cualquiera → rechazado por
   `_can_dm`. Repetir para el caso "amistad `pending`, no `accepted`" (también debe rechazar).
8. Usuario A intenta `SELECT` un hilo ajeno (B↔C, sin relación con A) por consulta directa → 0 filas.
9. **Realtime:** sesión A suscrita SIN FILTRO a `community_messages`; B y C (relacionados entre sí, sin
   relación con A) intercambian mensajes → A recibe CERO eventos. Repetir con A relacionado con B (SÍ
   debe recibir) para confirmar que no quedó sobre-restringido.
10. Usuario bloqueado por su contraparte ya no puede `INSERT` mensajes nuevos hacia quien lo bloqueó,
    aunque el historial viejo del hilo se conserve legible para ambos.
11. Receptor de un mensaje intenta `UPDATE` de `text`/`from_user`/`to_user` (no solo `read_at`) →
    rechazado por grant de columna, aunque `to_user=auth.uid()` pase la policy `using`.
12. Flood: 40 `INSERT` en <60s desde una cuenta → los últimos rechazan por el trigger de rate-limit.
13. `follows`: solicitud hacia un perfil privado nace `pending`; el SOLICITANTE no puede pasarla a
    `active` él mismo (solo el `followee`); usuario bloqueado no puede `INSERT` un follow hacia quien lo
    bloqueó.
14. `follows`: A intenta `SELECT` la lista de seguidores/seguidos de un B cualquiera (no A) → 0 filas
    (ni siquiera si B es público — solo tu propia red).
15. (cuando exista ④) `community_posts`: extraño sin relación con el autor de un post cuyo perfil es
    privado → 0 filas; post con `visible=false` → invisible para todos salvo el autor; `INSERT`/`UPDATE`
    con una clave de payload fuera del allow-list → rechazado por el trigger de validación.

Cada sabotaje se demuestra con dientes (R2.1): romper el candado a propósito, ver el harness/prueba caer
en rojo, restaurar, ver verde — y REPORTARLO, no solo afirmarlo.

### 13-BIS.9 Veredicto sobre el diseño de Opus (§13.3)

**Apruebo tal cual:**
- El orden de construcción ①→②→③→④ y que ③ (visibilidad) sea el candado que hace segura a toda la
  torre — coincide con mi propio análisis.
- Reutilizar `community_profiles`/`friendships`/`community_reactions`/`community_reports`/
  `community_gym_members` sin tirar nada — la base de Fase 1/C5 es sólida y sus helpers (`_are_friends`,
  `_same_community`, `_is_blocked`) son exactamente las piezas correctas para construir `_can_dm` encima
  sin inventar una relación de confianza nueva.
- `is_minor` derivado server-side desde fecha de nacimiento, nunca de un campo client-writable — el
  planteamiento del propio Opus en §13.4 ya apuntaba bien; lo que faltaba era el CÓMO exacto (trigger +
  función `_is_minor` calculada en vivo, no un booleano estático — ver §13-BIS.3).
- La recomendación de NO migrar el chat coach↔asesorado ahora (ver §13-BIS.10).

**Corrijo (huecos reales que el borrador de §13.3/13.4 no cerraba):**
1. **El GRANT de columnas de `community_profiles` no estaba en el radar de Opus** — §13.3③ solo hablaba
   de la policy de filas (`cp_sel`), pero un grant de tabla completa expone `share_code`/`consent_*`/
   `birth_date` a cualquier desconocido en cuanto la fila es pública. Esto es el hallazgo más importante
   de esta sesión (§13-BIS.1b) — sin él, el modelo Instagram filtra la fecha de nacimiento de menores a
   cualquiera con perfil público visible.
2. **`is_private default false`** habría sido el error natural al escribir el `ALTER TABLE` sin pensar
   en las 2 filas ya existentes — corregido a `default true` (§13-BIS.1a).
3. **`is_minor` como columna estática** (implícito en la redacción de §13.4, "flag `is_minor`
   (derivado/forzado privado)") se vuelve obsoleta con el tiempo (alguien cumple 18 y queda congelado
   en `true` para siempre, o un bug la deja en `false`) — reemplazada por cálculo en vivo desde
   `birth_date` + trigger que es la ÚNICA autoridad sobre `is_private` (§13-BIS.3).
4. **`last_active` crudo** tal como está descrito en §13.3② (timestamp expuesto, aunque sea "opt-in")
   reintroduce el riesgo de §11 en versión MÁS fina que `trained_today` — corregido a etiqueta
   pre-redondeada server-side, nunca el timestamp exacto (§13-BIS.4).
5. **`follows` sin candado explícito de enumeración** — §13.4 no especificaba quién puede leer la LISTA
   de seguidores de un tercero; sin restringirlo, cualquiera con perfil público expone su red social
   completa a cualquier desconocido, lo cual NO fue pedido por el PO (pidió perfiles públicos y seguir,
   no un grafo social público). `fo_sel` restringido a "tu propia fila del grafo" (§13-BIS.4).
6. **DM gateado por relación existente, no por "cualquiera te puede escribir"** — §13.3① lo dejaba como
   pregunta abierta para mí ("a definir con Fable"); la respondo: para el slice ① (sin follows aún) el
   único universo seguro es amistad-aceptada O mismo-gym. Cuando ③ construya `follows`, la ampliación a
   DM-por-seguimiento debe ser **seguimiento MUTUO** (ambos se siguen activamente), nunca "cualquiera
   que te sigue" — con adolescentes reales de 16-17 años en la base, un modelo de "cualquier seguidor te
   puede escribir" es una superficie de acoso que no hace falta abrir; MUTUO da casi todo el valor social
   con mucho menos riesgo. Esta ampliación específica se re-estipula cuando llegue la sesión de ③, no se
   decide sola en la implementación.
7. **`role` en `community_profiles`** no existía en el diseño de Opus, pero "perfil de coach público"
   (③) es imposible de renderizar correctamente sin él: `user_data.role` no es legible por un
   desconocido (RLS de `user_data` es estrictamente `auth.uid()=user_id OR =coach_id`), así que sin una
   copia denormalizada y server-set en `community_profiles`, Opus habría tenido que inventar una fuente
   de verdad insegura (o el cliente autodeclarándose "coach", que es exactamente la clase de bug F7).
   Añadida como columna server-set-only (§13-BIS.3).

**Ninguna parte del diseño del PO es "peligrosa sin candado" tal como está escrito en §13.0** — el
modelo elegido (público-por-defecto + privado opcional + menor forzado-privado-no-descubrible +
publicar-rutina-opt-in + última-conexión-opt-in) es exactamente la forma correcta de dar lo que pidió
sin reabrir los riesgos que el propio PO vetó en C5 (mujeres/menores). El trabajo de esta sesión fue
cerrar los huecos de EJECUCIÓN de ese modelo (grant de columnas, default seguro, candado de menor
infalsificable-y-no-obsoleto, alcance de `last_active`, alcance de `follows`), no cambiar la decisión.

### 13-BIS.10 Recomendación explícita — el chat coach↔asesorado (`ax_m`) NO se migra ahora

**NO migrar** el chat existente (blob `ax_m` dentro de `apex_data`/`user_data.msgs`, sondeado cada 15s
por `pollMessages` en `app-1-infra.js`) al modelo nuevo de filas (`community_messages`) en este ciclo.
Razones, en orden de peso:
1. **Es zona caliente con usuarios reales dependiendo de ella HOY** (21 asesorados + el coach, canal
   primario de comunicación). `community_messages` es código nuevo sin historial en producción — mezclar
   la migración de un sistema que YA funciona con la construcción de uno nuevo multiplica el radio de
   una falla en el peor lugar posible (mensajería).
2. **Viola R1.1 (`docs/reglas-opus.md`): "un feature = un commit... cero refactors de paso en zonas
   calientes"** — migrar el chat del coach es un refactor de una feature que YA está terminada y en uso,
   no parte del pedido del PO (que pidió comunidad tipo red social, no "arreglar el chat del coach").
3. **El chat coach↔asesorado tiene semántica distinta** (1 coach : muchos asesorados, ligado a
   membresía/`coach_id`, offline-first con el resto de `apex_data`) que no encaja limpio en un modelo
   par-a-par simétrico como `community_messages` (pensado para amigos/gym-mates, sin noción de
   coach/cliente ni de plan). Forzar ambos en la misma tabla ahora obligaría a re-derivar la RLS del
   chat del coach — la superficie más usada de la app — dentro del mismo ciclo que abre la RLS más
   ancha que el proyecto ha tocado. Dos cambios de alto riesgo en un commit es exactamente lo que la
   doctrina prohíbe.
4. Migrar DESPUÉS, con su propio harness dedicado y su propio ciclo Fable-planifica/Opus-ejecuta/
   Fable-verifica, es reversible y de bajo riesgo comparado con hacerlo ahora. La recomendación de Opus
   en el propio §13.3① coincidía con esto — la confirmo como la decisión técnica correcta, no una que
   necesite reabrirse.

### 13-BIS.11 Próximo paso de Opus
Un commit de MIGRACIÓN (`c6_community_messages` o similar) con exactamente el DDL de §13-BIS.2, en
proyecto de PRUEBA primero si hay uno disponible (si no, aplicar en prod con las tablas verificadas
vacías — `community_messages` nace vacía por definición, cero riesgo de backfill). Un commit de FRONTEND
separado (UI del chat + suscripción Realtime + `AUTH.client()`, nunca fetch crudo) — **migración y
frontend NUNCA en el mismo commit** (patrón ya establecido en C3.1 de este mismo doc). Harness NUEVO
dedicado con los sabotajes 1-12 de §13-BIS.8 que aplican a ①. Suite antes y después. **NO tocar
`community_profiles`/`follows`/`community_posts` en este ciclo** — esos son de la sesión de ③, que
Fable ya dejó estipulada arriba para cuando llegue, pero que Opus NO debe adelantar sin que esa sesión
tenga su propio veredicto de Fable después de construida (mismo patrón que C1→C2→C3→C4→C5).

---

## 14. VEREDICTO DE FABLE — ① CHAT EN VIVO (backend `37792ad` + frontend `a77989c`, avi-v377)

**🟡 APROBADO CON RESERVA** (una corrección de una línea, no bloqueante, para Opus).

Verificación adversarial independiente contra prod real (`eoebhrxbokyllqalyecj`), sin confiar en lo
que Opus reportó — cada sabotaje se rehizo desde cero, con datos reales (única amistad `accepted`
F1=`0a6484ed…`↔F2=`31bf6d19…`, gym de F1 con ~23 miembros poblado en vivo por Camilo).

### 14.1 DDL vs §13-BIS.2 — coincide, desviación única correcta

`supabase/community/c6_community_messages.sql` implementa el DDL literal (tabla, índice de hilo,
`_can_dm`, `_cm_rate`, trigger anti-flood, `cm_sel`/`cm_ins`/`cm_upd`, grants de columna, Realtime).
La única desviación declarada por Opus —`_community_msg_rate_limit()` como **SECURITY DEFINER** en vez
de INVOKER— la verifiqué en los dos frentes que pedí:
- **(a) el argumento es correcto:** confirmado con dientes — revertí la función a INVOKER en una
  transacción de prueba (`rollback` después) y un INSERT normal de mensaje SÍ falla con
  `permission denied for table _cm_rate`; con DEFINER (el estado real de prod), el mismo INSERT
  funciona y el trigger cuenta correctamente.
- **(b) DEFINER no abre un hueco nuevo:** `_cm_rate` tiene `rowsecurity=false` PERO **cero grants** a
  `anon`/`authenticated` (solo `service_role`/`postgres`) — confirmado con `SELECT`/`INSERT` directos
  como `authenticated`: ambos devuelven `permission denied for table _cm_rate` (el chequeo de
  privilegio de tabla ocurre ANTES de evaluar RLS, así que la ausencia de RLS es inofensiva aquí, no
  un descuido). Intenté invocar `_community_msg_rate_limit()` directamente vía RPC como `authenticated`
  (la ruta que preocupaba el pedido): Postgres la rechaza a nivel de compilación —
  `ERROR: trigger functions can only be called as triggers` — una función `RETURNS TRIGGER` en
  PL/pgSQL **no se puede invocar fuera de un trigger, sin importar qué GRANT tenga**. `search_path=''`
  está fijado en ambas funciones nuevas (`_can_dm` y `_community_msg_rate_limit`), igual que el resto
  del proyecto.

### 14.2 Hallazgo real (la reserva) — advisor SÍ regresó, aunque es inofensivo

Pedí explícitamente verificar "que el advisor de seguridad no regrese". **Sí regresó:** `get_advisors`
(security) muestra 2 WARN nuevos que no existían antes de esta migración —
`anon_security_definer_function_executable` y `authenticated_security_definer_function_executable`,
ambos apuntando a `public._community_msg_rate_limit()`. Causa: el DDL nunca hizo
`revoke execute ... from public` sobre esa función (a diferencia de `_can_dm`, que sí lo hizo
correctamente — `revoke all on function private._can_dm(uuid,uuid) from public;`). Por defecto Postgres
otorga `EXECUTE` a `PUBLIC` en toda función nueva; como quedó sin revocar, `anon` y `authenticated`
técnicamente tienen el grant.

**Por qué NO es un hueco explotable (probado, no asumido):** confirmado en 14.1(b) — Postgres bloquea
la invocación directa de una función `RETURNS TRIGGER` sin importar el grant. Aun así **revoqué el
grant en una transacción de prueba y reinserté un mensaje real como `authenticated`** para confirmar
que el trigger **sigue disparando igual sin el grant** (`rate_row_created_by_trigger=1`) — la
revocación no rompe nada, porque el mecanismo de disparo de un trigger no pasa por el chequeo de
`EXECUTE` del rol que emite el DML. Es decir: el fix es gratis, no hay ningún trade-off.

**Corrección exacta para Opus** (no bloqueante, aplicar en el próximo commit de comunidad o suelto):
```sql
revoke execute on function public._community_msg_rate_limit() from public, anon, authenticated;
```
Un `ALTER FUNCTION ... SET search_path` no hace falta (ya está en `''`). Con esto los 2 WARN
desaparecen y la función queda con la misma higiene que `_can_dm`.

### 14.3 Sabotajes DB #7/#8/#10/#11/#12 — re-hechos desde cero, todos verdes

Impersonación por JWT (`set local role authenticated` + `set_config('request.jwt.claims',...)`) en
transacciones `BEGIN…ROLLBACK`, actores reales (F1, F2, un compañero de gym de F2 sin amistad —
Astrid `c52b90af…` vía gym de F1— y un extraño real sin relación, `qa-harness` `9418640a…`):
- **#7a** extraño→F1 sin relación: rechazado por RLS (`new row violates row-level security policy`).
- **#7b** con amistad `pending` (creada real en la tx): sigue rechazado — `_are_friends` exige
  `accepted`, `pending` no cuenta.
- **#8** extraño hace `SELECT` del hilo F1↔F2 por filtro directo: 0 filas. `SELECT *` sin `where`
  sobre toda la tabla: también 0 filas (RLS, no solo el filtro de la app).
- **positivo (control):** compañero de gym SIN amistad (Astrid→F2, solo `_same_community`) SÍ puede
  insertar — confirma que la vía "mismo gym" del candado funciona, no solo la de amistad.
- **#10** F2 bloquea a F1 (`status='blocked'`): el INSERT posterior de F1→F2 se rechaza; el hilo VIEJO
  sigue legible para AMBOS (`n=1` en las dos direcciones) — el bloqueo corta DM nuevo, no borra
  historial, tal como especifica §13-BIS.6.
- **#11** receptor intenta `UPDATE text=...`: `permission denied for table community_messages` (grant
  de columna, ni siquiera llega a evaluar la policy). Receptor marca `read_at`: confirmé con
  `GET DIAGNOSTICS row_count` que realmente afecta **1 fila** (no un falso-verde por ausencia de
  excepción). El EMISOR intenta marcar `read_at` de un mensaje que él mismo envió: **0 filas
  afectadas** y `read_at` sigue `NULL` tras el intento — la policy `using(to_user=auth.uid())` lo
  filtra en silencio (esto lo detecté como falso-positivo en mi primer intento de prueba, que solo
  miraba si había excepción; un `UPDATE` sin filas que matcheen NO lanza error en Postgres — corregido
  re-verificando con `row_count` explícito).
- **#12** 40 inserts en <60s desde un mismo usuario (contador ya en 1 por un insert previo en la misma
  transacción — `now()` es constante por transacción): 29 pasan, 11 rechazan con `rate limit exceeded`
  — el trigger corta antes de superar el tope generosamente (>30).

Toda esta batería corrió en transacciones con `rollback` explícito; verifiqué después con consultas
directas que prod quedó en cero (`community_messages`, `_cm_rate`, `friendships.status='accepted'`
intacto, `community_profiles`=2 filas, sin residuos).

### 14.4 Sabotaje #9 (Realtime respeta RLS entre DOS sesiones reales) — LA PRUEBA VIVA QUE FALTABA

Opus no pudo cerrar esto (una sola sesión no puede DMearse a sí misma) y lo dejó pendiente
explícitamente para mí. **La hice**, con 2+ sesiones `supabase-js` reales, no simuladas:
- Creé 3 usuarios QA **desechables** (`admin.auth.admin.createUser`, email confirmado, contraseña
  aleatoria por ejecución) — A, B, C — vía `SERVICE_ROLE_KEY` (`~/.avi/service-role.key`, nunca en el
  repo). Los relacioné con `community_gym_members` (tabla sin los triggers de `friendships`, más
  simple para el fixture): C hace de "coach" de sí mismo y de B (B y C quedan same-gym); A queda
  AFUERA por completo (ni amigo ni gym-mate de nadie).
- **Fase 1:** A abre un canal Realtime **sin filtro** (`event:'*'` sobre toda `community_messages`) con
  su JWT real de sesión (`signInWithPassword`, no la anon key). B inserta un mensaje real a C (B y C sí
  están relacionados). Ventana de espera 3.5s. **Resultado: A recibió 0 eventos.**
- **Fase 2:** agregué A al mismo gym que B (ahora sí relacionados). B envía un mensaje DIRECTO a A (no
  a C — la policy de Realtime filtra por FILA, no por "estás relacionado con alguien en general"). El
  mismo canal de A, sin reconectar, sin cambiar el filtro: **A recibió el evento en <4s**, con el `id`
  exacto del mensaje nuevo.
- Limpieza: borré los mensajes y filas de `community_gym_members` de los 3 UIDs y los 3 usuarios de
  `auth.users` vía `admin.auth.admin.deleteUser`. Verifiqué después: `community_messages`=0,
  `community_gym_members` de los fixtures=0, usuarios fixture=0. Quedó 1 fila huérfana en `_cm_rate`
  (esa tabla no tiene FK a `auth.users`, así que el borrado de B no la arrastra — inofensiva, la limpié
  a mano). **Nota para el radar:** cualquier borrado real de cuenta (`delete-account` edge) puede dejar
  el mismo tipo de fila huérfana en `_cm_rate`; no es un problema de seguridad (nadie la lee), es
  housekeeping — el propio trigger la poda cuando pasan >10 min y alguien más manda un mensaje, así que
  se autolimpia con el uso normal.

Script: `realtime9.mjs` (ejecutado en el scratchpad de esta sesión, no forma parte del repo — un
harness E2E persistente para este caso necesitaría credenciales de servicio en el entorno de CI, que
hoy no están disponibles ahí; queda como script ad-hoc de verificación, reproducible manualmente).

### 14.5 Frontend — vías sancionadas, XSS, sellado, scope

- **`AUTH.client()` siempre:** `_cmtyClient()` = `AUTH.client()`, cero `fetch` crudo con `Bearer`
  extraído a mano en todo `app-7-community.js`.
- **XSS:** `_cmtyInboxHtml` usa `esc()` en handle y preview del último mensaje; las burbujas del hilo
  (`_cmtyChatRender`) usan `textContent`, no `innerHTML` — un mensaje con `<img onerror=...>` nunca se
  interpreta como HTML. Re-corrí `_verify-dm.mjs` (DM6) que lo prueba con control negativo: 22/22 verde.
- **Sellado en localhost:** `_cmtySealed()` reusa `cloudWriteSealed` (el mecanismo estándar del
  proyecto) — confirmado por DM7/DM8 del harness.
- **No-upsert:** `cmtyChatSend` usa `.insert()`, `_cmtyChatMarkRead` usa `.update({read_at}).in('id',…)`
  — nunca `.upsert()`, tal como pedía §13-BIS.7.
- **Scope:** revisé el diff completo de ambos commits. Backend (`37792ad`) toca solo la migración SQL +
  bitácora. Frontend (`a77989c`) toca `app-7-community.js` (el feature), `index.html` (markup del
  overlay + bump `?v=377` ×11, pareado con `sw.js` `CACHE_NAME`), `styles.css` (una regla nueva,
  documentada, que oculta la píldora de instalar con CUALQUIER `.cchat` abierto — arregla de paso el
  chat del coach, no es un refactor no pedido, es la causa raíz del mismo defecto de clase),
  `app-2-login.js` (3 líneas: registra `#cmty-chat` en la pila de cierre de overlays — necesario para
  que el botón atrás/hardware cierre el chat nuevo primero, no toca lógica del chat del coach),
  `scripts/hooks/pre-commit` (agrega `app-7-community.js` a `APP_JS` — corrige que el módulo de
  comunidad NUNCA se auditaba, hallazgo real y bien puesto), CLAUDE.md/bitácora (documentación) y el
  harness nuevo. **Nada en `SB_KEYS`, nada en `user_data`, el chat coach↔asesorado (`ax_m`) no se tocó**
  — cumple §13-BIS.10 al pie de la letra.

### 14.6 QA re-corrido independientemente

`node avi.test.js` → **405/405**. `node scripts/e2e/_verify-dm.mjs` → **22/22**.
`node scripts/e2e/_verify-community.mjs` → **13/13** (CM1-CM13, sin regresión de C3/C5).
`node scripts/e2e/_prodcheck.mjs 377` → **verde**, `avi-v377` servida, cero `jsErrors`.

### 14.7 Veredicto

**🟡 APROBADO CON RESERVA.** El diseño, el DDL, los 11 sabotajes de nivel-DB y — lo más importante —
la prueba viva de Realtime con 2 sesiones reales (#9, el punto que Opus no pudo cerrar) pasan todos,
verificados desde cero por mí, no solo releídos. La única corrección pendiente es de higiene
(2 advisores WARN nuevos, cero riesgo real, fix de una línea):
```sql
revoke execute on function public._community_msg_rate_limit() from public, anon, authenticated;
```
Que Opus la aplique como migración suelta (`c6b_revoke_ratelimit_execute` o similar) y confirme con
`get_advisors` que los 2 WARN desaparecen — no hace falta otra ronda mía para esto, es mecánico, pero
si Opus prefiere que yo la aplique directamente lo hago con una migración de una línea y re-corro
advisors en el mismo turno.

**Comunidad de gym (C5) — nota al margen, NO es parte de esta verificación:** al poblar los actores
reales para los sabotajes noté que el gym de F1 (Camilo) sigue con ~23 miembros y la reserva de C5
(bloqueo oculta dentro del gym, `avi-v376`) sigue con su propia re-verificación pendiente por separado
— la dejo anotada, no la re-audito aquí (el PO pidió verificar el ① específicamente).

## 15. VEREDICTO DE FABLE — ② ÚLTIMA CONEXIÓN (commit `d0389df`, avi-v378)

Verificación adversarial independiente de la parte 93 (bitácora) — sondeo desde cero contra la base
real de producción (`eoebhrxbokyllqalyecj`), sin confiar en lo reportado por Opus. Fuente del
encargo: `docs/plan-comunidad.md` §13-BIS.4 (mi propia estipulación).

### 15.1 Desviación #1 (DEFINER en vez de INVOKER) — justificación verificada, no solo leída

El sketch de §13-BIS.4 proponía `security invoker` confiando en que `cp_sel` filtrara la fila. Opus
cambió a `security definer` con chequeo propio, alegando que el grant de columna (§13-BIS.1b, ya
vigente antes de este slice) le impide a una función INVOKER leer `last_active` — correría con los
privilegios del cliente, que no tiene grant sobre esa columna. **Reproduje la alternativa rechazada**
en una transacción con rollback: reescribí `cmty_activity_labels` a `security invoker` (spot-check,
no aplicado) y confirmé que el `select last_active` interno de la función revienta con
`insufficient_privilege` exactamente como predice Opus — la alternativa del sketch, tal cual, no
compila en runtime dado el esquema de grants ya vigente. DEFINER era la única vía sin aflojar nada.
**Verifiqué las 3 garantías que pidió el encargo:**
- **(a) el chequeo de visibilidad SÍ bloquea a un extraño real.** Sembré `last_active=now()` +
  `show_last_active=true` en F1 (Camilo, `0a6484ed…`) y, en la misma tx, borré la fila de
  `community_gym_members` del extraño real `6e54e22b…` (para que `_same_community`=false — sin esto
  Camilo tiene casi todo su gym adentro y no queda un extraño real). Como ese extraño, la RPC devolvió
  **`null`**, no el timestamp ni error — visibilidad negada limpiamente.
- **(b) `revoke all ... from public, anon` + `grant execute ... to authenticated` se cumple en prod**
  tal cual el archivo: confirmado leyendo `pg_class`/el propio código de `c7_last_active.sql` aplicado
  (migración `c7_last_active`, `list_migrations` lo confirma en prod) — es la lección de la reserva
  §14.2 del ①, esta vez aplicada desde el primer commit, no como corrección posterior.
- **(c) el `left join` no oculta filas, las deja con `label=null`.** Con el extraño consultando a F1
  (que SÍ tiene perfil), la fila vino presente con `label=NULL` explícito — nunca cero filas — que es
  justo el contrato que el frontend (`_cmtyLoadActivity`) espera para poder distinguir "no lo vi" de
  "no me contestó".
Equivalencia algebraica de `_are_friends`/`_same_community` confirmada por lectura: ambos helpers son
simétricos (`least/greatest` en `_are_friends`; auto-join simétrico bajo bloqueo en `_same_community`
tras C5b) → el orden de argumentos invertido entre el chequeo inline de la RPC y `cp_sel` no cambia el
resultado. El chequeo replicado es **exactamente** `cp_sel` vigente hoy (self OR amigo-aceptado OR
mismo-gym-sin-bloqueo).

### 15.2 Hallazgo #2 (`c7b`, el SELECT era table-level) — reproducido CON DIENTES, no solo leído

Repetí el ataque que Opus dice haber encontrado y cerrado: en una tx con rollback, **re-otorgué
`grant select on public.community_profiles to authenticated`** (exactamente el estado pre-`c7b`) y
consulté `last_active` crudo como **F2 (Samuel, amigo aceptado de F1 — alguien que SÍ puede ver la
fila vía `cp_sel`)**. Resultado: **fuga real, devolvió el timestamp `2026-07-21 09:00:00+00`
sembrado.** Revoqué el grant de tabla (dejando solo los grants de columna del fix) y repetí la misma
consulta: **`permission denied`.** Esto prueba que `c7b` no es cosmético — es la única barrera real
entre "amigo ve tu perfil" y "amigo ve tu timestamp crudo al minuto". (Mi primer intento de esta
prueba usó al extraño en vez de un amigo y dio un falso "no bug" porque la RLS de fila ya lo bloqueaba
antes de llegar al chequeo de columna — lo detecté y repetí con el actor correcto; documento el error
propio porque es exactamente la clase de falso-negativo que la doctrina pide cazar, no solo el
resultado final.)

### 15.3 Matriz de sabotajes DB (todo en tx→rollback, prod verificada limpia antes/después de cada bloque)

| Prueba | Resultado |
|---|---|
| F1 opt-in (`show_last_active=true`) + F2 amigo consulta | `'ahora'` ✅ |
| Extraño real (gym quitado en la tx) consulta a F1 | `null` ✅ (fila presente, no cero filas) |
| F1 se pone opt-out (`show_last_active=false`) + F2 amigo consulta | `null` ✅ |
| `select last_active` crudo de OTRO usuario, como authenticated | `permission denied` ✅ |
| `update last_active` como el propio dueño (F1), authenticated | `permission denied` ✅ (server-set únicamente) |
| `select *` crudo como authenticated (`EXECUTE 'SELECT * FROM ...'`) | `permission denied` ✅ |
| R2.1 con dientes: re-grant tabla + amigo lee crudo | **fuga reproducida**, luego revert → denegado de nuevo ✅ |

Prod confirmada limpia tras cada bloque (`last_active`/`show_last_active` de F1 y F2 en su valor real
original, membresía de gym del extraño restaurada, `relacl` de `community_profiles` sin SELECT de
tabla para `authenticated`, temp tables descartadas). Los actores reales usados fueron F1=Camilo
(`0a6484ed…`) y F2=Samuel (`31bf6d19…`, amistad `accepted` verificada antes de empezar); el extraño
`6e54e22b…` es miembro real del gym de F1, por eso su fila de `community_gym_members` se quitó y
restauró dentro de la misma transacción (gotcha del encargo, confirmado necesario: sin este paso no
queda un extraño real en los datos de Camilo).

### 15.4 Edge `refresh_snapshot` v3 — código leído, comportamiento confirmado

`last_active` se estampa **siempre** (vía cliente `service_role`, que ignora RLS) en cada refresh,
**independiente** del opt-in — correcto: `show_last_active` gatea solo la LECTURA (vía la RPC), nunca
la escritura, tal como documenta el propio comentario del código. `show_today` sigue gobernando
`trained_today` exactamente como en C3/① (`if (!showToday) snap.trained_today = false;` intacto,
sin tocar) — cero regresión al snapshot existente. No tuve sesión real para invocar la edge en vivo;
me basé en lectura de código (`get_edge_function`, versión 3 activa en prod) más el hecho de que la
columna `last_active` de F1 en prod trae un timestamp reciente real (`2026-07-21 12:44:59`, de uso
normal de la app, no de mis pruebas) — evidencia indirecta de que la edge SÍ está estampando en
producción.

### 15.5 Frontend — scope, columnas, XSS, sellado

Diff de `d0389df` revisado completo: **nada en `SB_KEYS`/`user_data`**, toda escritura por
`AUTH.client()` (`_cmtyPatch`, ya sellado en localhost desde antes), toggle opt-in nace en `false`
(coincide con el default de la columna). El cambio de `select('*')` a columnas explícitas en el
perfil propio pide **exactamente** las 17 columnas del grant de `c7b` (conté ambas listas — SQL y JS
— coinciden 1:1); grep de `CMTY.profile.*` confirma que ningún campo usado en la UI (`share_code`,
`visible`, `show_today`, `show_last_active`) quedó fuera de esa lista, o sea que el recorte de
columnas no rompió nada. `_cmtyActivityHtml` pasa el texto por `esc()` antes de insertar aunque el
universo de valores posibles ya está acotado por el `CASE` de la RPC (defensa en profundidad, no
hueco). Chat coach↔asesorado sin tocar; ③ (`follows`)/④ (`community_posts`) confirmados NO
construidos — `list_tables` en prod no los tiene, `list_migrations` no tiene entradas después de
`c7b_lock_last_active_select`.

### 15.6 Advisors

`get_advisors(security)` muestra **exactamente un** 0029 nuevo (`cmty_activity_labels`, mismo patrón
intencional que `resolve_share_code`, ya aceptado). Los WARN de `_community_msg_rate_limit` de la
reserva del ① **no reaparecieron** (la parte 92 los cerró y siguen cerrados). Resto de la lista =
preexistente y ajeno a este slice (`auth_leaked_password_protection` Pro-only ignorado por decisión
ya tomada; `rls_enabled_no_policy` en tablas legacy; `extension_in_public` pg_net;
`rls_policy_always_true` en `app_errors_insert`). **Nota aparte, fuera de esta verificación:**
`list_tables` marca `public._cm_rate` (del ①) con RLS deshabilitada como advisory "critical" — leí su
`relacl` y no tiene NINGÚN grant a `anon`/`authenticated` (solo `postgres`/`service_role`), así que no
hay exposición real pese a la etiqueta; es ruido del linter genérico, preexistente al ②, no lo re-abro
aquí.

### 15.7 QA re-corrido independientemente

`node avi.test.js` → **405/405**. `node scripts/e2e/_verify-lastactive.mjs` → **14/14** (LA1-LA7 +
shots light/dark, cero jsErrors). `node scripts/e2e/_verify-community.mjs` → **13/13** (sin regresión
de C3/C5). `node scripts/e2e/_verify-dm.mjs` → **22/22** (sin regresión del ①). `node
scripts/e2e/_prodcheck.mjs 378` → **verde**, `avi-v378` servida, boot real confirmado, cero
`jsErrors`.

### 15.8 Veredicto

**🟢 APROBADO.** Las dos desviaciones que Opus declaró son ambas correctas y quedaron verificadas con
pruebas propias, no releídas: la DEFINER es la única opción viable dado el esquema de grants de
columna ya vigente (reproduje por qué INVOKER truena), y el chequeo de visibilidad replicado es
algebraicamente idéntico a `cp_sel`. El hallazgo `c7b` es real y su fix es load-bearing — lo probé
reintroduciendo el bug original con un actor que SÍ tiene visibilidad de fila (un amigo, no un
extraño) y vi la fuga real del timestamp, luego confirmé que revertir el grant vuelve a cerrarla. Los
7 puntos de la matriz de sabotaje pasan contra datos reales de producción, con la base quedando limpia
en cada paso. Frontend sin scope creep, columnas explícitas completas, opt-in default OFF respetado.
Sin correcciones pendientes — nada que devolver a Opus en este slice. Orden restante de Comunidad v2:
③ perfil de coach + seguir → ④ feed.
