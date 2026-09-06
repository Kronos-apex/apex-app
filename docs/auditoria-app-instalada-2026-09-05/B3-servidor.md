# B3 · Las funciones de servidor que nadie ha mirado — Julián QA, auditor de seguridad y corrección de servidor

## Veredicto en una frase

`delete-account` cierra bien la puerta de acceso (nadie puede borrar la cuenta de otro, la del coach
está protegida) pero **no cumple del todo lo que promete en pantalla** — dos rastros de datos
personales (la vitrina pública y las fotos en Storage) nunca se tocan, los respaldos diarios
conservan el perfil completo hasta 90 días sin que se le diga a nadie, y el propio orden de sus
pasos puede dejar a alguien con la cuenta viva y el perfil borrado; `refresh_snapshot` sí cumple su
promesa de que el cliente no pueda escribir el número de su racha; `activate_public_profile` está
bien construido en casi todo — el caso que me dieron como pista caliente (9/10 perfiles con
`birth_date` NULL) **result inocuo: hay un candado de base de datos que lo cubre** — pero delega el
insignia de "coach" en un campo tan manipulable por el cliente como el que reemplazó.

## Los 3 más grandes

### 1 · El borrado de cuenta NO es atómico: puede dejar a alguien con la cuenta viva y el perfil borrado

**Qué es.** `delete-account/index.ts` (líneas 79-105) hace, en orden estricto y sin transacción que
cubra las dos piezas (Postgres + Auth):
1. `DELETE FROM user_data WHERE user_id=uid` — si falla, lanza y nada se tocó.
2. `DELETE FROM push_subscriptions WHERE client_id=uid` — si falla, lanza, **pero el paso 1 ya
   corrió**: el perfil (rutinas, historial, medidas, nutrición, fotos) ya no existe.
3. Limpieza best-effort de Storage (`avatars`) y `community_resolve_attempts` (envuelta en
   `try/catch`, nunca lanza).
4. `admin.auth.admin.deleteUser(uid)` — si falla, lanza, **pero los pasos 1 y 2 ya corrieron**: la
   cuenta de `auth.users` (con la que la persona sigue pudiendo iniciar sesión) sobrevive sin
   ningún dato detrás.

**Evidencia.** El código en sí (`delete-account/index.ts:79-105`, verificado idéntico contra lo
desplegado en producción, versión 4). Y la propia base de datos tiene la pieza que haría esto
seguro AL REVÉS de como está escrito: `user_data.user_id` tiene una FK a `auth.users` con
`ON DELETE CASCADE` (verificado por `pg_constraint`, `confdeltype='c'`) — si el borrado empezara
por `auth.users`, `user_data` (y `community_profiles` y todo lo que cuelga de ahí) desaparecería
solo, y lo único que quedaría por limpiar a mano sería lo que NO tiene FK
(`push_subscriptions.client_id` es texto suelto, sin referencia). El código hace lo contrario:
borra a mano lo que ya se habría cascadeado, y deja el borrado que de verdad cuenta —el de
`auth.users`— para el final.

**Cómo intenté tumbarlo.** Busqué evidencia de que esto ya le hubiera pasado a alguien real: hay
**5 cuentas en `auth.users` sin fila en `user_data`** (33 en auth contra 28 en la tabla). Revisé
las 5 una por una: las 5 tienen **cero filas en `push_subscriptions`**, y 4 de las 5 tienen
`created_at` y `last_sign_in_at` con la MISMA marca de tiempo al segundo — la firma exacta del
"modo fantasma" ya documentado (alguien tocó "Continuar con Google" sin haberse registrado antes),
no de un borrado a medias. La quinta (`valery@avi.com`, creada 2026-07-02, con un inicio de sesión
5 días después) tampoco tiene rastro de haber usado la app. **No encontré una víctima confirmada
hoy** — el hueco es real y reproducible LEYENDO el código, pero no until ahora se ha materializado
(o si se materializó, el propio "modo fantasma" —que SÍ se auto-repara la próxima vez que esa
persona intente "Continuar con Google"— ya lo limpió antes de que yo mirara).

**Qué cuesta arreglarlo.** Invertir el orden: borrar primero `auth.users` (que arrastra
`user_data`/comunidad por CASCADE) y limpiar `push_subscriptions` + Storage DESPUÉS, como
limpieza best-effort que no bloquea nada si falla — exactamente el patrón que la función YA usa
para Storage. Es un cambio de orden de líneas, no de arquitectura.

### 2 · El derecho de supresión es parcial: la vitrina pública, las fotos y los respaldos sobreviven al borrado

**Qué es.** El texto que lee la persona antes de borrar su cuenta dice, literalmente: *"Eliminar tu
cuenta borra de forma permanente tu perfil, rutinas, progreso, **medidas y fotos**. No se puede
deshacer"* (`app-4-entreno.js:479`). Tres rastros reales de esa persona no se tocan:

- **`avi_showcase` (la vitrina pública que el coach publica en la app y en `avi-web`).** Guarda
  solo el primer nombre — por diseño, para no poder atarse por id — así que cuando la persona
  borra su cuenta, la fila de `avi_showcase` **no tiene ningún vínculo que borrar**: sigue
  publicada, con su nombre, sus kilos y su progreso, para siempre, hasta que el coach la note como
  "huérfana" (`showcaseAudit`/`showcasePendientes`, `avi-core.js:9382-9408`) y la quite A MANO. No
  hay plazo ni aviso automático — es un candado que depende de que alguien mire.
- **El bucket de Storage `apex-photos`** (fotos de progreso). `delete-account` solo limpia el
  bucket `avatars` (línea 96: `admin.storage.from("avatars")`). Nunca toca `apex-photos`.
  Verificado: el bucket existe, tiene 2 archivos (de 2026-05-28, con ids legacy pre-Auth, no uids
  actuales) y el código de la función no lo menciona en ninguna parte.
- **`apex_data_backups`.** El cron diario (`apex-daily-backup`) guarda una copia completa de
  `user_data` (y `apex_data`) en esta tabla — verificado: **25 filas, desde 2026-06-14 hasta hoy**,
  cada una con las claves `apex_data` y `user_data` completas adentro. `delete-account` no la
  toca. La política de retención documentada en CLAUDE.md (14 diarios + domingos por 90 días)
  significa que el perfil de alguien que acaba de borrar su cuenta **sigue existiendo, completo,
  en al menos una copia de seguridad durante semanas**. `legal/politica-tratamiento-datos.md` no
  menciona esta retención en ninguna parte (grep verificado).

**Cómo intenté tumbarlo.** Comprobé si `apex-photos` recibe subidas hoy en la práctica: según el
backlog del propio CLAUDE.md, la subida a Storage por uid está rota (usa el id legacy, no el uid) y
cae a base64 la mayoría de las veces — **hoy no hay víctima real** en ese bucket (los 2 archivos
son de antes de la migración a Auth). Comprobé las 6 filas de `avi_showcase`: las 6 coinciden hoy
con un cliente vivo en la lista del coach (`showcaseAudit` no reporta ninguna "huérfana" en este
momento) — **tampoco hay víctima hoy ahí**. La única pieza con exposición garantizada para el
100% de los borrados es `apex_data_backups`, y esa no tiene forma de "no tener víctima": todo el
que borre su cuenta hoy va a quedar en el respaldo del mismo día.

**Qué cuesta arreglarlo.** Para la vitrina: en el momento de borrar, con el nombre que todavía
está en `user_data.profile.name` (antes de borrar esa fila), buscar filas de `avi_showcase` que
matcheen por primer nombre contra los clientes del coach de esa persona y, si el match es
INEQUÍVOCO (no si hay ambigüedad, mismo criterio que `showcaseAudit`), borrarlas. Para las fotos:
espejar el bloque de `avatars` para `apex-photos` (mismo patrón, ya escrito). Para los respaldos:
esto es una decisión de producto/legal, no un fix de una línea — la opción barata es DECIRLO en el
texto de borrado y en la política ("tus copias de seguridad se conservan hasta 90 días por
seguridad operativa"); la opción cara es purgar activamente al uid de los respaldos vigentes.

### 3 · El insignia "Perfil de coach" de `activate_public_profile` se puede fabricar con dos cuentas

**Qué es.** El comentario del código dice que el rol se decide "NO desde `user_data.role`
(CLIENT-WRITABLE, lección F7)" sino contando cuántas filas de `user_data` tienen
`coach_id = uid` (líneas 64-69). El problema: **`coach_id` es exactamente tan escribible por el
cliente como `role`** — verificado contra la policy real de `user_data`:

```
user_data_update: USING/WITH CHECK (auth.uid() = user_id OR auth.uid() = coach_id)
```

No hay ninguna restricción sobre QUÉ valor puede tener `coach_id` en la fila propia de cada quien
— la policy solo exige que sea TU fila. Un atacante con dos cuentas (A y B) puede, con una
llamada REST directa (no necesita pasar por la interfaz), hacer que la cuenta B declare
`coach_id = A` en su propia fila. Al llamar `activate_public_profile` desde A, la función cuenta
"filas con `coach_id=A` y `user_id≠A`" → encuentra la fila de B → `role:'coach'` → la cuenta A
sale con el badge 👑 "Perfil de coach" ante cualquiera que la vea en Comunidad.

**Cómo intenté tumbarlo.** Busqué si hay algo que valide que ese `coach_id` señala al COACH REAL
(`COACH_UID`, la misma constante que usa `delete-account`) — no lo hay: la función cuenta
CUALQUIER fila que apunte a `uid`, sin comparar contra `COACH_UID`. Comprobé el impacto real: hoy
solo hay 1 coach de verdad (`Andres Martínez`) y su perfil ya tiene `role:'coach'` correctamente;
Comunidad está **congelada por decisión del PO** (0 publicaciones humanas, adopción casi nula) así
que el daño de un badge falso hoy es cosmético y sin audiencia. No es explotable a distancia ni
expone datos de nadie más — solo un rótulo. Por eso lo dejo en 🟡, no en 🔴, aunque la clase de
hueco es la misma familia que ya mató una vez `send-push`: "confiar en un dato que el atacante
puede escribirse a sí mismo".

**Qué cuesta arreglarlo.** Comparar contra `COACH_UID` (o, cuando haya multi-coach de verdad, contra
`community_moderators`, que es la tabla que YA se usa para blindar `avi_showcase` de exactamente
este mismo patrón — `_is_moderator`). Una línea.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Hay víctima hoy? |
|---|---|---|---|
| 🔴 | Orden de borrado no atómico: perfil borrado + cuenta auth viva si falla un paso intermedio | `delete-account/index.ts:81-105` | No confirmada (5 cuentas fantasma en `auth.users`, las 5 con firma de "modo fantasma" de Google, no de borrado a medias) |
| 🔴 | `avi_showcase` (vitrina pública) nunca se borra ni se desvincula al borrar la cuenta | `delete-account/index.ts` (no la menciona) + `avi_showcase` sin FK al asesorado | No — las 6 filas actuales coinciden con clientes vivos |
| 🔴 | Bucket `apex-photos` (fotos de progreso) no se limpia — solo se limpia `avatars` | `delete-account/index.ts:95-99` | No — solo 2 archivos, ambos de antes de la migración a Auth (pre-uid) |
| 🔴 | `apex_data_backups` conserva el perfil completo hasta ~90 días tras un borrado "permanente", sin aviso en la app ni en `legal/` | tabla `apex_data_backups` (25 filas, 2026-06-14→hoy) | Sí, estructuralmente, para el 100% de quien borre su cuenta hoy |
| 🟡 | `role:'coach'` de `activate_public_profile` se puede fabricar con 2 cuentas (delega en `user_data.coach_id`, tan escribible por el cliente como `role`) | `activate_public_profile/index.ts:64-69` | No — 1 solo coach real, badge ya correcto, Comunidad congelada |
| 🟢 | `birth_date` NULL en 9/10 perfiles NO es un hueco: el trigger `trg_enforce_minor_privacy` fuerza `is_private=true` cuando `birth_date IS NULL` (fail-safe, no fail-open) | trigger `_community_enforce_minor_privacy` en `community_profiles` | — (verificado sano) |
| 🟢 | El cliente no puede escribir directamente `streak_weeks`/`level`/`achievements`/`total_sessions`/`training_since` | grants de columna de `community_profiles` (solo SELECT para `authenticated`) | — (verificado sano) |
| 🟡 | (Límite honesto, no defecto) `refresh_snapshot` no puede distinguir un entreno real de uno fabricado a mano en `user_data.history` (que el cliente sí puede escribir): protege el NÚMERO, no el DATO de entrada | `refresh_snapshot/index.ts` | No — inherente a cualquier registro autoreportado, no es específico de esta función |
| 🟢 | Nadie puede invocar `delete-account` para borrar la cuenta de OTRO: el uid sale del JWT, nunca de un parámetro | `delete-account/index.ts:38-53` | — (verificado sano) |
| 🟢 | La cuenta del coach está protegida contra autoborrado por esta vía (`COACH_UID`) | `delete-account/index.ts:56-58` | — (verificado sano) |
| 🟢 | Las 3 funciones exigen JWT real (`verify_jwt:true` en la plataforma + `admin.auth.getUser(token)` dentro) — ninguna tiene la clase de hueco de `send-push` (comparar contra la anon key literal) | las tres, verificado contra lo desplegado | — (verificado sano) |
| 🟢 | Código desplegado = código del repo, sin drift, en las tres funciones (hash y contenido comparados) | `list_edge_functions`/`get_edge_function` | — (verificado sano) |
| 🟢 | Rol de moderador para publicar en `avi_showcase` (`showcase_ins`) exige `_is_moderator(auth.uid())`, no solo "es mi fila" — cierra el hueco de v525 documentado en CLAUDE.md | policy `showcase_ins` en `avi_showcase` | — (verificado sano, no es hallazgo nuevo) |

## Lo que verifiqué y está SANO (con números)

- **Las 3 funciones exigen identidad real, no la llave pública.** `verify_jwt:true` en las tres
  (confirmado contra `list_edge_functions`) + `admin.auth.getUser(token)` dentro de cada una. La
  anon key, aunque técnicamente es un JWT válido firmado por el proyecto, no resuelve a un usuario
  real en `getUser` → 401. No es la clase de hueco que tuvo `send-push` hasta v426.
- **Código desplegado = código del repo, byte a byte**, en las tres (`delete-account` v4,
  `activate_public_profile` v2, `refresh_snapshot` v7 — coinciden con lo que documenta CLAUDE.md).
  No hay drift.
- **Nadie borra la cuenta de otro.** El uid con el que opera `delete-account` sale siempre de
  `admin.auth.getUser(token)`, nunca de un campo del cuerpo de la petición.
- **El candado de menores de Comunidad NO se rompe con `birth_date` NULL.** Trigger
  `trg_enforce_minor_privacy` (`BEFORE INSERT OR UPDATE ON community_profiles`) fuerza
  `is_private := true` si `birth_date IS NULL OR edad < 18`. Verificado en los 10 perfiles reales:
  los 9 con `birth_date` NULL tienen los 10 `is_private = true`. El único con fecha
  (`Andres Martínez`, el coach) tiene `is_private = false`, coherente.
- **`activate_public_profile` no permite recalibrar la edad**: si `birth_date` ya existe, la
  función devuelve el valor guardado sin tocarlo (write-once verificado en el código y en el
  esquema — la columna no tiene grant de UPDATE para `authenticated` en absoluto, ni siquiera
  SELECT: el cliente no puede ni leerla directamente).
- **`refresh_snapshot` no deja que el cliente escriba su propia racha/nivel/logros.** Verificado
  contra `information_schema.column_privileges`: `authenticated` solo tiene SELECT sobre
  `streak_weeks`, `level`, `achievements`, `total_sessions`, `training_since`, `sessions_4w`. Cero
  INSERT/UPDATE. Y los números que escribe SÍ cuadran con el historial real: de 9 perfiles
  comparados, 6 coinciden exactamente con `jsonb_array_length(user_data.history)` y los otros 3
  están por DEBAJO del valor real (más viejos, nunca inflados) — es staleness por falta de
  refresco reciente, no manipulación.
- **Los hitos del muro (`community_posts kind='streak'/'level'`) no los puede publicar el
  cliente**: la policy `cpost_ins` exige `kind='routine'`, así que solo el service role de la
  propia edge function puede insertar un hito.
- **El rol de moderador para `avi_showcase` sí está bien gateado** (a diferencia del `role` de
  `activate_public_profile`): `showcase_ins` exige `coach_id = auth.uid() AND
  private._is_moderator(auth.uid())`, y `community_moderators` tiene 1 sola fila (el coach real).

## Sospechas sin medir

- El "modo fantasma" (`{ghost:true}`) se auto-repara **solo cuando la persona vuelve a intentar
  "Continuar con Google"** (`app-3-coach.js:707-723`). No verifiqué si existe un camino equivalente
  para alguien que se registró por email/contraseña y terminara en el mismo estado (perfil borrado,
  cuenta viva) — no encontré el código del lado de login por email que compruebe "sin perfil" de la
  misma forma. Si no existe, esa persona quedaría atascada sin que la app se lo explique.
- `activate_public_profile` calcula el `role` UNA sola vez, en el mismo momento en que se fija
  `birth_date` (write-once), y nunca se re-evalúa después. Si AVI GYM (multi-coach, en curso) hace
  que alguien empiece como cliente y luego se convierta en coach de otros, su insignia de Comunidad
  se quedaría "cliente" para siempre a menos que alguien borre y recree su `birth_date` a mano. Sin
  impacto hoy (1 solo coach).
- `app_errors.uid` es de tipo `uuid` (capaz de identificar a una persona) pero **las 15 filas
  actuales tienen `uid` NULL** — no until confirmé si eso es porque el cliente nunca lo manda o
  porque ninguna sesión con uid ha fallado desde que existe la columna. No até este cabo por
  presupuesto; si algún día empieza a llenarse, `delete-account` tampoco lo purga.

## Qué NO miré y por qué

- **No invoqué ninguna de las tres funciones** (ni siquiera `refresh_snapshot`, que no estaba en
  la lista explícita de prohibidas) porque las tres ESCRIBEN, y la regla dura de esta ronda es
  solo lectura contra producción. Todo lo de arriba sale de leer el código (repo y desplegado),
  las policies, los grants, los triggers y los datos ya existentes — nunca de ejecutar la función.
- **No miré `send-push` ni `daily-notifs`**: son de otro auditor de esta misma ronda, por mandato
  explícito.
- **No miré `coach-create-client`**: no estaba en mi mandato (aunque toqué de refilón el
  self-heal de cuentas fantasma que vive en el mismo archivo que la usa).
- **No verifiqué en vivo si el orden de `delete-account` (hallazgo #1) realmente produce el
  estado que describo** — lo derivé de leer el código y las FKs; no lo reproduje porque
  reproducirlo exige invocar la función contra una cuenta real, prohibido por las reglas duras.
- **No perseguí a fondo el camino de login por email/contraseña** para confirmar si tiene o no un
  self-heal equivalente al de "Continuar con Google" — quedó como sospecha, no como hallazgo.
