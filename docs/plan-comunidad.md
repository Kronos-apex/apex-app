# Plan de diseño — COMUNIDAD en AVI

> **Estado:** CONSTRUCCIÓN Fase 1 en curso (2026-07-19) — C1 y C2 EN PROD y verificados por
> Fable; **C3 ESTIPULADO** (ver §9-BIS → C3 detallado). Idea #5 del lote de Camilo (2026-07-17).
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
| 2 | Alcance | **Solo amigos por código** (sin directorio ni sugerencias) |
| 3 | Coach | **Solo asesorados** (el coach no participa en Fase 1) |
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

**C4 — Legal + cierre:** texto de consentimiento específico, actualización de `legal/`,
revisión de tono (Sofía), radar de adopción (arrancar con el gym de Camilo). Los riesgos §11
(patrones de actividad → granularidad día + toggle; menores → gate 18+/representante en el
consentimiento, confirmar con abogado) se resuelven en C3/C4, no se difieren a Fase 2.

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

*Siguiente paso (2026-07-19): Opus ejecuta la ESTIPULACIÓN DETALLADA de C3 (§9-BIS) bajo
`docs/reglas-opus.md` → deploy avi-v373 → Fable verifica (sabotajes propios + prod) → C4.*
