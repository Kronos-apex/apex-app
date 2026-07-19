# Plan de diseño — COMUNIDAD en AVI

> **Estado:** DISEÑO v2 (sin código). Idea #5 del lote de Camilo (2026-07-17). Documento vivo.
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

**C1 — Cimientos de datos (en proyecto Supabase de PRUEBA primero, R0/Fase 0 del §8):**
`community_profiles` (con `handle`, `share_code` ≥8 base32 aleatorio, `visible`, snapshot cols
SOLO escribibles por service role — §9.7) · `friendships` (con `blocked_by` + transiciones §5.2
por trigger) · `community_reactions` (UNIQUE §5.3) · `community_reports` · cascadas §5.6 · RPC
`resolve_share_code` (§5.0, con rate-limit servidor). **Verificación C1 (harness SQL con dos
uids de prueba):** no-amigo NO lee perfil · resolve devuelve solo mínimos · bloqueado NO puede
des-bloquearse · des-bloqueo por `blocked_by` SÍ · doble-❤️ rechazado · DELETE perfil arrastra
todo · `user_data` intacta (probar que un amigo NO puede leerla). Solo tras veredicto → migrar
a producción.

**C2 — Servidor:** edge function `refresh_snapshot` (lee historial PROPIO, calcula con la misma
lógica pura de avi-core portada — `weekStreak`/`gxLevel`; escribe snapshot server-side) + bucket
`avatars/` (§9.4) + integrar borrado comunitario a `delete-account`. Verificación: snapshot no
falsificable desde cliente (intentar UPDATE directo → RLS rechaza), avatar sube/reemplaza/borra
solo el dueño.

**C3 — UI del asesorado (Fase 1 completa):** sección Comunidad con opt-in+consentimiento (§7,
subir `LEGAL_V`), mi perfil (apodo/foto/código/pausar/salir), agregar por código, solicitudes,
lista de amigos con tarjeta (racha/nivel/❤️), bloquear/reportar, degradación offline. Barra
premium completa + harness E2E propio (`_verify-community.mjs`) con sabotajes.

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

*Siguiente paso: Camilo responde las 7 decisiones del §9 → Fable estipula la Fase 1 (esquema +
RLS en proyecto de PRUEBA primero) → Opus ejecuta con harness de RLS → Fable verifica.*
