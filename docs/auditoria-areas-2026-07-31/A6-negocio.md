# Auditoría: NEGOCIO Y PRODUCTO — Camilo (Growth)

> Todo lo que va aquí sale de `SELECT` contra producción (`eoebhrxbokyllqalyecj`), de
> `archivo:línea` del repo, o de `git log`. Cada hallazgo trae la sección «intenté tumbarlo así».
> Read-only: no toqué un solo dato.

---

## El estado del negocio en una página

**El dinero real.** Desde que existe el registro (3-may → 31-jul) entraron **1.416.000 COP en
total**, de **10 personas**, en 15 pagos. Mes a mes: **mayo 515.000 · junio 155.000 · julio
746.000**. El número que sirve para tomar decisiones **no es ninguno de esos tres**: es la
**base recurrente = 725.000 COP/mes de 6 personas** (Astrid 150.000 · Kathe 150.000 · Samuel
125.000 · Claudia 100.000 · Luz 100.000 · Valery 100.000). Esas 6 son el **97,2 % de todo lo
cobrado en julio**. El resto —Nataly 30.000, Yeison 20.000, Natalia 1.000, Miguel 10.000— suma
21.000 COP en julio: ruido. A ~4.000 COP/USD, el negocio son **≈ US$180/mes**.

**Las personas reales.** 22 asesorados. Se parten en dos mundos que no se tocan:

| | los creó el coach a mano | se auto-registraron |
|---|---|---|
| personas | **9** | **13** |
| alguna vez pagaron | **9 de 9 (100 %)** | **1 de 13 (7,7 %)** |
| dinero que dejaron | **1.396.000 COP** | **20.000 COP** |
| activos hoy | **7** | **0** |
| nunca entrenaron | **0** | **8** |
| volvieron a iniciar sesión después del día 1 | 8 de 9 | **0 de 13** |

No hay un problema de retención: **de los 9 que el coach creó, 7 siguen entrenando esta semana y
todos pagaron**. Hay un problema de **puerta de entrada**: la puerta pública (auto-registro) no ha
producido un solo cliente en tres meses. Los 8 que nunca entrenaron son, uno por uno, los 8 que
entraron solos.

**Lo que cuesta.** En caja, **cero**: Supabase Free + GitHub Pages. Lo que cuesta es tiempo:
**817 commits, 417 versiones, 10 semanas**; solo en julio, 402 commits. De los últimos 146
(17→30 jul), **60 son de Comunidad (41 %)** — dos semanas completas. En esas dos semanas entraron
**0 clientes nuevos** y **0 pesos nuevos** (el último primer-pago de alguien fue el 2-jul).
Sí: el producto se paga a sí mismo con holgura, porque no cuesta plata. Pero **la app no genera
los ingresos, los atiende**: los 6 que pagan son gente del gimnasio que ya pagaba.

**Las 3 palancas para el mes que viene** (detalle y costo en «Recomendaciones»):

1. **Que un plan vencido deje de apagar la app.** Ya se cobraron **90 días-persona de bloqueo** en
   3 meses, y **mañana 1-ago vencen 6 de los 7 activos** (3 hoy 31-jul, 3 mañana). Es el riesgo
   más grande y más inmediato que tiene el negocio, y no lo causó un cliente: lo causa el producto.
2. **Cerrar el auto-registro público** y convertirlo en «pedir cupo» que le llegue al coach.
   9 de 9 contra 1 de 13 no es una diferencia de matiz: es la diferencia entre un canal y un
   agujero.
3. **Subir el piso de precio y matar la cola.** 8 personas en el nivel «app» dejaron 141.000 COP
   en tres meses (10 % del ingreso, 36 % de la base) y ahí está el 100 % de la fuga.

**Comunidad: congelar la construcción, no apagarla.** Ver §H5 — el dato no es «nadie la usa»
(la usan los 7 activos, el 100 % de quien puede usarla); el dato es que **su techo son 7 personas
y ya las tiene todas**.

---

## Hallazgos verificados

### H1 · 🔴 El bloqueo por falta de pago NO es una barrera: 20 entrenos completos con el plan vencido, y el estado de pago lo escribe el cliente

- **Qué pasa:** dos cosas que se refuerzan. (1) El estado de pago vive en `profile.payments`, y
  `profile` es una columna que el **propio asesorado puede escribir** — misma clase que el gotcha
  F7 ya conocido de `coach_id`/`tier`. (2) Aun sin tocar nada, el candado es JavaScript en el
  teléfono: no existe **ninguna** defensa del lado del servidor.

- **Dónde:**
  - `avi-core.js:1970-1982` — `MS.getStatus` deriva todo de `c.payments`; `MS.canLogin` bloquea
    `overdue`/`inactive`.
  - `avi-core.js:1789-1805` — `clientToRow` copia **toda** clave del cliente a `profile`
    (excepto `id`/`routines`/`password`) → `payments` viaja dentro de `profile`.
  - `app-1-infra.js:915-918` — cuando el **asesorado** guarda `ax_c`, sube su perfil entero:
    `await UD.upsertOwn({profile:row.profile, routines:row.routines})`.
  - `app-3-coach.js:495-505` — el único punto donde muerde el candado (`_enterAuthSession`).
  - `app-1-infra.js:257-266` — el coach reconstruye su lista leyendo `profile` de la fila del
    cliente → lo que el cliente escriba es lo que el coach ve.

- **Evidencia:**

  **(a) La cadena de privilegios está completa y no hay nada que la corte.**
  ```sql
  -- grants sobre public.user_data
  authenticated | UPDATE | ...,profile,...      ← columna profile incluida
  -- políticas
  user_data_update | UPDATE | {authenticated}
     USING  (auth.uid()=user_id OR auth.uid()=coach_id)
     CHECK  (auth.uid()=user_id OR auth.uid()=coach_id)
  -- triggers sobre user_data
  []                                            ← ninguno: nada valida el contenido
  -- políticas que miren el estado de pago
  policies_con_pago = 0  de  total_policies = 49
  ```
  Y `grep -r 'payment|overdue|dueDate' supabase/` → **cero coincidencias**: ninguna edge function
  conoce el estado de pago. **No existe enforcement server-side de ningún tipo.**

  **(b) Ya pasó en la vida real, sin que nadie lo intentara.** Reconstruí, sesión por sesión, qué
  vencimiento estaba vigente en el instante de cada entreno (tomando solo los pagos registrados
  *antes* de esa fecha):
  ```
  nombre            sesiones con plan VENCIDO   desde        hasta
  Astrid Beltran            9                  2026-06-18   2026-07-02
  Kathe Beltran             4                  2026-06-25   2026-07-02
  Miguel Pulido             4                  2026-06-24   2026-06-30
  Samuel Cifuentes          2                  2026-06-03   2026-06-06
  Nataly                    1                  2026-06-30   2026-06-30
  ```
  **20 entrenos completos, 5 personas.** Astrid entrenó 9 veces con hasta **14,8 días** de plan
  vencido — y es la mejor clienta del negocio.

- **Intenté tumbarlo así:** mi primera lectura fue «el candado nunca ha funcionado». **Falso, y me
  lo tumbó el propio git.** El gate murió en el cutover a Auth y lo repusieron en
  `d3ebb88 2026-07-01T20:09:11-05:00` (avi-v241) — o sea `2026-07-02T01:09Z`. Casi todas esas 20
  sesiones son **anteriores** a ese commit, así que **no prueban un bypass de hoy**. Al filtrar por
  el instante exacto quedan **2 que sí lo son**: Astrid `2026-07-02 13:17:45Z` (14,8 días vencida) y
  Kathe `2026-07-02 13:56:40Z` (7,9 días vencida), **12 horas después de que el candado estuviera
  en producción**, y ambas antes de que se registrara su pago ese mismo día a las 17:00Z. Dos
  explicaciones posibles y ninguna salva el candado: o el teléfono corría una caché vieja
  (el informe A3 midió teléfonos hasta **18 versiones** por detrás), o la app ya estaba abierta y
  el gate solo corre al arrancar. **Un candado que depende de que el teléfono se haya actualizado
  no es un candado.** También verifiqué que no hubiera un trigger, una policy o una edge function
  que compensara: no hay ninguno (queries arriba).

- **A quién le pasa:** hoy, a nadie que esté abusando — no vi indicios de que alguien haya
  falsificado un pago. Le pasa **al negocio**: el cobro entero descansa en que nadie lo intente, y
  una regresión de código lo apagó semanas enteras **sin que nadie se enterara**. El día que
  alguien lo intente, además, el pago falso aparece en el tablero del coach como ingreso real
  (el coach lee `profile` de la fila del cliente, `app-1-infra.js:262`).

- **Costo del arreglo:** el arreglo bueno es **mover el estado de pago fuera del alcance del
  cliente**, exactamente como se hizo con `community_gym_members` en C5: tabla `memberships`
  (`user_id`, `due_date`, `amount`) con **INSERT/UPDATE solo del coach** y SELECT del interesado,
  y las policies de `user_data` colgando de ahí. **1-2 días** bien hechos.
  Mitigación de 30 minutos mientras tanto: `revoke update(profile) on user_data from authenticated`
  **no sirve** (el cliente necesita escribir su perfil), pero sí sirve **sacar `payments` de
  `profile` a su propia columna** y quitarle el `grant update` de esa columna al cliente
  (~2 h, incluye migrar los 15 pagos existentes). **No es urgente por fraude; es urgente el día
  que se decida cobrar de verdad.**

---

### H2 · 🔴 Mañana 1-ago, 6 de los 7 asesorados activos quedan fuera de la app — y ya pasó: 90 días-persona de bloqueo en 3 meses

- **Qué pasa:** los pagos se concentran en los días 1-2 del mes y el plan dura 30 días, así que
  todo el mundo vence a la vez, a principio de mes. Entre que vence y que el coach registra el
  pago a mano, `MS.canLogin` deja a la persona **fuera de la app entera**: sin rutina, sin
  historial, sin nada. Es el escenario de la decisión (a) del PO, pero **no es hipotético: está
  agendado para mañana**.

- **Dónde:** `avi-core.js:1982` (`canLogin` excluye `overdue`) + `app-3-coach.js:495-505`
  (cierra sesión y muestra «Tu plan venció. Habla con tu coach para continuar entrenando 💪»).

- **Evidencia:** vencimientos vigentes leídos de producción hoy (31-jul):
  ```
  Claudia Valbuena   vence 2026-07-31 17:00Z   ← HOY
  Luz Rodríguez      vence 2026-07-31 17:00Z   ← HOY
  YEISON VALBUENA    vence 2026-07-31 17:00Z   ← HOY
  Kathe Beltran      vence 2026-08-01 17:00Z   ← MAÑANA
  Astrid Beltran     vence 2026-08-01 17:00Z   ← MAÑANA
  Valery Valbuena    vence 2026-08-01 17:00Z   ← MAÑANA
  Samuel Cifuentes   vence 2026-08-05
  Natalia Martinez   vence 2026-08-10
  Nataly             vence 2026-07-30 ← YA VENCIDA
  Miguel Pulido      vence 2026-06-23 ← vencido hace 38 días
  ```
  De los **7 activos** (Samuel, Astrid, Kathe, Claudia, Luz, Nataly, Natalia — los 7 con sesión en
  los últimos 7 días), **6 vencen entre hoy y mañana**.
  El precedente medido, con los huecos reales entre vencimiento y siguiente pago:
  Natalia 18 días · Astrid 15 · Kathe 8 · Nataly 6 · Samuel 5 · Miguel 38 y contando =
  **90 días-persona de bloqueo en ~90 días de operación**. Es decir, en promedio **siempre hay
  alguien encerrado afuera**, y en junio le tocó a la nº1 y a la nº3 del negocio.

- **Intenté tumbarlo así:** busqué el período de gracia. No existe: `getStatus` da `overdue` con
  `daysLeft < 0`, sin colchón (`avi-core.js:1976`). Busqué si el bloqueo aplica al historial ya
  pagado: aplica, porque `canLogin` corta **antes** de `_applyAuthClientDB`
  (`app-3-coach.js:495` vs `:506`) — no se carga nada. Busqué si en la práctica no muerde
  (H1 muestra que a veces no muerde): **eso lo empeora, no lo mejora** — significa que el bloqueo
  castiga de forma aleatoria según qué versión tenga cacheada cada teléfono.

- **A quién le pasa:** a Astrid, Kathe, Claudia, Luz, Valery y Yeison, entre hoy y mañana, si el
  coach no alcanza a registrar sus pagos el mismo día. Y a Nataly, ya.

- **Costo del arreglo:** **~2 horas** para la versión buena: en `MS`, un estado `grace` (0-7 días
  vencido) que `canLogin` **sí** deje entrar, en modo de solo lectura — ve su historial y su
  rutina, no puede iniciar un entreno nuevo — con una banda arriba que diga cuánto debe y un botón
  de WhatsApp al coach (`waPhone` ya existe). Pasados los 7 días, `overdue` como hoy.
  Es cambiar una constante y una rama, más la banda. **Ver la recomendación argumentada en la
  decisión (a).**

---

### H3 · 🟠 El tablero no miente por el MRR: miente porque mide CAJA DEL MES CALENDARIO, y eso oscila ±380 % con una base estable

- **Qué pasa:** el KPI «Ingresos mes» suma los pagos cuya `date` cae en el mes actual. Con 6
  clientes que pagan tarde y en bloque, el número salta sin que el negocio se mueva. En **junio
  el tablero le dijo al coach que había hecho 155.000 COP** cuando su base real era ~700.000: la
  gente simplemente pagó el 1-2 de julio. Un coach que mira ese número toma decisiones sobre una
  caída del 70 % que nunca ocurrió.

- **Dónde:** `app-2-login.js:1356-1364` (la suma) e `index.html:394` (la etiqueta «Ingresos mes»).
  Nota: la etiqueta es honesta — el problema es que ese es el único número de dinero que existe.

- **Evidencia:**
  ```
  mes      pagos  personas  cobrado   min      max
  2026-05    7       6      515000       0   150000
  2026-06    2       2      155000   30000   125000
  2026-07    8       8      746000    1000   150000
  ```
  La base de clientes no cambió entre mayo y junio (nadie se fue en junio; Miguel se fue después).
  Y dentro del 746.000 de julio hay **1.000 COP** (Natalia, 11-jul) y en mayo hay un pago de
  **0 COP** (Kathe, 25-may) que el tablero suma como si fueran ingresos.

- **Por qué existen esos importes:** `registerPayment` (`app-6-extra.js:2339`) hace
  `parseFloat(...)||0` **sin ninguna validación de monto** — exige las dos fechas
  (`:2344-2353`) pero acepta 0 y 1.000 en silencio. Leído en contexto, esos dos registros no son
  errores: son **el coach usando «registrar pago» como botón de «extenderle el plazo»** para que
  la persona no quede bloqueada (el pago de 0 COP de Kathe corre su vencimiento del 22 al 24 de
  junio). Es decir: **el coach ya inventó a mano el modo de gracia del H2, y el precio de su
  parche es que su propio número de ingresos queda contaminado.**

- **Intenté tumbarlo así:** verifiqué que el KPI no incluyera la fila propia del coach (su pago de
  100.000 del 23-may): `select coach_id from user_data where role='coach'` → **null**, y
  `loadCoachClients` filtra `.eq('coach_id', u.id)` (`app-1-infra.js:263`) → **no entra**, el
  tablero está limpio de eso. También verifiqué que los 22 asesorados sí estén ligados al coach
  (22 de 22) → el KPI ve a todos. Y comprobé que no exista otro widget de MRR proyectado que sí
  sirva: no existe (está en el backlog de CLAUDE.md como `payment.planType`, sin hacer).

- **A quién le pasa:** al coach, cada mes, al abrir su Inicio.

- **Costo del arreglo:** **~1 hora** por las dos mitades:
  (1) un segundo KPI **«Base del mes»** = suma del último pago ≥ un umbral de cada persona con
  plan vigente (hoy: 725.000) — es una función pura de 10 líneas junto a `MS`, testeable;
  (2) en el modal de pago, un botón aparte **«Extender sin cobro»** que grabe
  `{amount:null, note:'cortesía'}` y que la suma ignore los `amount == null` — así el parche del
  coach deja de ensuciar el número. Ambas cosas son quirúrgicas.

---

### H4 · 🔴 El auto-registro no es un canal flojo: es un canal muerto. 13 personas, 0 activos, 20.000 COP, y ninguna volvió a entrar

- **Qué pasa:** la puerta pública capta gente y no la activa **ni una sola vez**. No es un
  problema de conversión baja; es que **el 100 % de los auto-registrados se fue el día 1**.

- **Dónde:** dato de producción (`user_data` + `auth.users`), contrastado con
  `avi-core.js:1752-1771` (los tres niveles `libre`/`app`/`coach`).

- **Evidencia:**
  ```
  autoreg  personas  pagaron  COP totales  activos hoy  0 sesiones  volvieron a loguearse
  false        9        9      1.396.000        7            0            8 de 9
  true        13        1         20.000        0            8            0 de 13
  ```
  El detalle que remata: **para los 13 auto-registrados, `auth.users.last_sign_in_at` es
  exactamente igual a `created_at`.** Los 13. Crearon la cuenta y no volvieron a iniciar sesión
  jamás. Los 5 que llegaron a entrenar algo lo hicieron todo en ese primer día:
  Stevan (alta 9-jun, última sesión 9-jun), jhojan (24-jun/24-jun), jose Daniel (6-jul/6-jul),
  Sharith (20-jul/21-jul). **La única excepción es Yeison** — volvió el 10-jul... y es
  **el único auto-registrado que pagó** (20.000 COP el 1-jul). Volver y pagar van juntos.

- **Intenté tumbarlo así:** tres intentos.
  (1) *«Son más nuevos, no les ha dado tiempo»* — **falso**: 5 de los 13 llevan **37-52 días**
  (Stevan 52, diana 52, FELIPE 48, Sofía Vega 44, Daniel 38) con cero sesiones, mientras que
  Claudia y Luz, creadas por el coach hace 32 días, llevan **18 sesiones cada una**.
  (2) *«`last_sign_in_at` no prueba nada, una sesión viva se refresca sola sin actualizarlo»* —
  **cierto, y por eso no lo uso solo**: la prueba dura es el historial de entrenos, que es
  independiente y dice lo mismo. Dejo el matiz escrito porque es real.
  (3) *«No les llegó la rutina»* — **falso**: 12 de los 13 tienen rutinas generadas (3 a 6 cada
  uno); solo Hernán tiene 0. La app hizo su parte; la persona no volvió.

- **A quién le pasa:** a 13 personas que dijeron que querían entrenar y a las que el producto no
  volvió a ver. Y al coach, que tiene la lista llena de nombres que no son clientes.

- **Costo del arreglo:** decisión de producto antes que código. Ver la recomendación de la
  decisión (b): **cerrar el formulario público y convertirlo en «pedir cupo»** son ~3 horas
  (cambiar el submit por un lead que le llega al coach, reusando lo que ya existe de
  `wantsCoach`/`ax_leadsdone`).

---

### H5 · 🟠 Comunidad: el 41 % del esfuerzo de las últimas 2 semanas. Ya tiene al 100 % de la gente que puede tener — y son 7 personas

- **Qué pasa:** Comunidad no fracasó por falta de adopción; **se topó con su techo**. Todos los
  que podían usarla la usan. Los que no la usan no la van a usar, porque **no abren la app**.

- **Dónde:** `git log` + tablas `community_*` de producción.

- **Evidencia:**
  ```
  esfuerzo:  60 de los últimos 146 commits (17→30 jul) = 41 %  →  dos semanas completas
  uso:       community_profiles      8      (última alta 27-jul)
             community_posts        10      (último 31-jul)
             community_comments      1
             community_reactions    11
             community_messages      3      ← "chat en vivo", 3 mensajes en toda su vida
             follows                 4
             friendships             7
  ```
  Y quién:
  - Los **8 perfiles** son el coach + **7 asesorados**, y esos 7 son **exactamente los 7 activos**
    (Samuel, Astrid, Kathe, Claudia, Luz, Nataly, Natalia). Solapamiento **100 %**.
    **Cero de los 13 auto-registrados tiene perfil.** Cero de los 8 que nunca entrenaron.
  - De los **10 posts**, **4 los emite el servidor solo** (3 `streak` + 1 `level`) y **3 son del
    coach**. Los asesorados han publicado **3 cosas en total, desde siempre**: Samuel una rutina,
    Astrid dos entrenos.
  - En las **dos semanas** del sprint de Comunidad entraron **0 clientes nuevos** y **0 pesos
    nuevos** (el último primer-pago de alguien fue el 2-jul, dos semanas antes de empezar).

- **Intenté tumbarlo así:** dos intentos, y el primero me cambió la conclusión.
  (1) *«Nadie la usa, está muerta»* — **falso, y es importante**: hay actividad **de hoy**
  (2 posts del 31-jul, 4 personas con `last_active` de hoy). No está muerta, está **llena hasta
  el borde de un cuarto que tiene 7 sillas**. Decir «nadie la usa» sería tan deshonesto como
  decir que va bien.
  (2) *«Comunidad activó a alguien»* — **no hay ni un caso**: los 8 con perfil ya eran activos y
  ya pagaban **antes** de crear el perfil (todas las altas de perfil son del 20-27 jul; esas
  personas entrenan desde mayo-junio). Ningún inactivo creó perfil. Ningún auto-registrado tampoco.

- **A quién le pasa:** al coach, que puso dos semanas de su producto en una función cuyo público
  máximo son las 7 personas que ya tenía ganadas.

- **Costo del arreglo:** cero. Ver el veredicto abajo — **no se toca nada, se deja de construir.**

---

### H6 · 🟡 Hay tres precios distintos y el más barato es donde está toda la fuga

- **Qué pasa:** el producto tiene tres niveles (`libre` / `app` = Premium sin coach / `coach` =
  Premium con coach, `avi-core.js:1756-1772`), pero el precio no está en ninguna parte del código:
  lo pone el coach a mano en cada pago. En la práctica hay **dos productos**: asesoría a
  100.000-150.000 y «solo app» a 10.000-30.000. El segundo no sostiene nada.

- **Dónde:** `avi-core.js:1752-1772` (los niveles) + los importes reales de `profile.payments`.

- **Evidencia:**
  ```
  nivel        personas  último importe de cada uno
  coach          6+4     150.000 · 150.000 · 125.000 · 100.000 · 100.000 · 100.000
                         + 4 en 'premium'/'sin tier' que NUNCA pagaron
  app              8      30.000 · 20.000 · 10.000 · 1.000  +  4 que nunca pagaron
  libre            5      ninguno pagó nunca
  ```
  - **Nivel «coach»: 1.275.000 COP de ingresos históricos, 6 personas, 0 bajas.** Precio medio
    120.833 COP (~US$30/mes) — muy por encima de los ~40.000 que asumía mi propio archivo de rol;
    **ese supuesto estaba mal y el dato lo corrige**.
  - **Nivel «app»: 141.000 COP históricos, 8 personas** = **10 % del ingreso con el 36 % de la
    base** — y **ahí está el 100 % de la fuga**: Miguel se fue (vencido hace 38 días), Nataly bajó
    de 50.000 a 30.000 y está vencida, Natalia bajó de 30.000 a 1.000, Yeison vence hoy.
  - **3 cuentas con acceso completo, gratis:** jhojan, Sharith y Sofía Vega tienen `tier:'premium'`
    (se lo puso el coach, seguramente por `convertToPremium` al pedir coach), **nunca pagaron y
    tienen 0-1 sesiones**. Regalar el nivel caro a un lead que no volvió no convirtió a ninguno.

- **Intenté tumbarlo así:** ¿es un problema de precio? **No.** Si el precio espantara, el nivel
  caro tendría la fuga y el barato la retención; pasa **exactamente al revés**: los seis que pagan
  100-150.000 no se han ido nunca, y los que pagan 10-30.000 se están yendo todos. Tampoco es que
  no puedan pagar: Guaduas paga 100.000 sin problema cuando hay coach detrás. **El problema no es
  el precio: es que «solo app» no engancha.** Y eso encaja con H4 (auto-registro = app sola = 0
  activos) y con H5 (los 7 que usan Comunidad son los 7 que tienen coach).

- **A quién le pasa:** al coach, que sostiene 8 cuentas de soporte y datos por 47.000 COP al mes.

- **Costo del arreglo:** decisión, no código. Poner **piso de 40.000 COP** al nivel «app» y quitar
  el nivel «premium» regalado. **0 horas de desarrollo**, una conversación de WhatsApp por persona.
  Si los 4 se van, se pierden 47.000 COP/mes (6 % del ingreso) y se recupera el soporte;
  si 2 se quedan al piso nuevo, se gana.

---

## Las dos decisiones abiertas del PO — información para decidir

### (a) ¿Un plan vencido apaga TODO, o basta un modo de solo lectura?

**Los números sobre la mesa:**

| | dato medido |
|---|---|
| Días-persona con la app apagada por vencimiento (3 meses) | **90** |
| Personas a las que ya les pasó | **6 de 10 que han pagado** |
| Cuándo vuelve a pasar | **hoy a 3 personas, mañana a 3 más** — 6 de los 7 activos |
| Entrenos que ocurrieron igual con el plan vencido | **20** (el candado falla de forma aleatoria) |
| Veces que el coach ya lo esquivó a mano | **2** (pagos de 0 y 1.000 COP, H3) |
| Recaudo que el bloqueo ha forzado | **no medible, y probablemente 0**: todos los que se retrasaron pagaron después por WhatsApp, no por el bloqueo |
| Personas que se fueron durante el bloqueo | **1** (Miguel, 38 días vencido; el bloqueo no lo trajo de vuelta) |

**Mi recomendación: modo de solo lectura, con gracia de 7 días. Argumentada, no salomónica.**

1. **El bloqueo total no está cobrando.** No hay un solo caso donde alguien pagara *porque* lo
   bloquearon; lo que sí hay es Astrid —150.000 COP/mes, la nº1— sin poder abrir su app durante
   15 días. El apalancamiento real del cobro en este negocio es **el coach por WhatsApp**, no una
   pantalla.
2. **El historial que ya pagó no es tuyo para apagarlo.** Apagar el registro de 32 entrenos que
   Astrid ya pagó no es una palanca de cobro: es quitarle algo que compró. En un pueblo donde el
   negocio es la relación, eso cuesta más de lo que recauda. Y legalmente es el terreno más feo
   posible junto a los textos legales que aún esperan abogado.
3. **El bloqueo total ni siquiera funciona** (H1): quien tenga la app abierta o una caché vieja
   entra igual. Un candado que muerde al azar es peor que no tenerlo: castiga al que actualiza.
4. **El coach ya votó con los pies**: registró un pago de 0 COP y otro de 1.000 para que no
   bloqueara. El producto debe darle ese botón en vez de obligarlo a ensuciar sus ingresos.

**Forma concreta:** `grace` = 0-7 días vencido → **entra en solo lectura**: ve rutinas e historial,
banda arriba «Tu plan venció hace N días — ponte al día con tu coach» + botón WhatsApp, y **no
puede iniciar un entreno nuevo** (así el bloqueo sigue teniendo dientes donde duele: el servicio
del mes). Pasados 7 días, `overdue` como hoy. **~2 h**, más el recordatorio 3 días **antes** del
vencimiento (por WhatsApp, no por push: 15 de 22 son inalcanzables por push).

**Lo que NO recomiendo:** dejar el historial accesible para siempre a los `overdue` de largo plazo.
A los 7 días, fuera; el archivo no es un servicio gratis indefinido.

---

### (b) ¿Qué se hace con el auto-registro?

**Los números sobre la mesa:** 13 captados · 8 nunca entrenaron · 0 activos · 1 pagó (20.000 COP
en tres meses) · **0 de 13 volvieron a iniciar sesión** · y el coach los arrastra en su lista de
asesorados todos los días.

**Mi recomendación: convertirlo en «pedir cupo». Ni arreglarlo ni apagarlo del todo.**

Por qué no *arreglarlo*: llevaría onboarding, recordatorios, secuencia de activación — semanas de
trabajo para un canal que en tres meses produjo 20.000 COP. Y ya sabemos por H6 que el problema no
es la app: es que **sin coach detrás nadie vuelve**. Ninguna pantalla arregla eso.

Por qué no *apagarlo*: la gente **sí llega** (13 en tres meses, ~1 por semana, sin publicidad, en
un pueblo). Eso es demanda real. Lo que está roto es qué pasa después.

**La forma:** el botón «Crear cuenta» pasa a pedir **nombre + WhatsApp + objetivo** y crea un
**lead**, no una cuenta. Le llega al coach como los `wantsCoach` de hoy (`ax_leadsdone` y el
ranking de atención ya existen). El coach escribe por WhatsApp y **crea él la cuenta** — la vía que
tiene **9 de 9 de conversión y 7 de 9 de retención**. El auto-registro deja de ser la puerta
principal y pasa a ser el timbre.

**Además, gratis:** los 8 que nunca entrenaron y las 3 cuentas «premium» regaladas se limpian o se
archivan. Hoy inflan la lista del coach y el KPI de «Activos» del tablero.

**Cómo sabremos si funcionó (métrica, no opinión):** de los próximos 8 leads, cuántos terminan con
una cuenta creada por el coach y al menos 1 entreno completado. Hoy ese número es **0 de 13**.
Cualquier cosa por encima de 3 de 8 ya duplica el negocio en captación.

---

### Comunidad — el veredicto que nadie ha dado

**CONGELAR la construcción. No apagarla. No invertir más.** Con respeto, y con las cifras delante.

Lo que Comunidad **sí** logró, y hay que decirlo porque es real: **de las 7 personas que abren la
app, 7 crearon perfil.** Eso es adopción del **100 %** entre quien puede adoptarla. Está viva hoy
mismo (posts del 31-jul). No es un fracaso de ejecución: está bien construida y la gente que la ve
la usa.

Lo que Comunidad **no** puede hacer, y por eso hay que parar: **su público máximo son esas mismas
7 personas.** Los otros 15 no la van a usar nunca, no porque no les guste, sino porque **no abren
la app** — 8 no entrenaron jamás y 13 no volvieron a iniciar sesión. Una red social no puede
activar a quien no entra. **Ya tiene a todos sus usuarios posibles, y son 7.** Cada commit nuevo
de Comunidad se reparte entre las mismas 7 personas que ya estaban ganadas.

Y el precio de seguir es concreto: **60 de los últimos 146 commits, dos semanas**, durante las
cuales entraron **0 clientes** y **0 pesos**. Ese mismo tiempo, puesto en el H2 (que 6 personas no
queden fuera mañana) y en el H4 (que los leads lleguen al coach), toca directamente los 725.000
COP/mes.

**Congelar significa exactamente esto:** no se borra nada, no se apaga ninguna tabla, no se le
quita a nadie lo que ya usa; **no entra un commit nuevo de Comunidad hasta que haya 15 personas
activas en la app.** El día que la base activa pase de 7 a 15, Comunidad vuelve a valer la pena
sola, sin construir nada más. Ese es el disparador y es medible.

**Lo único que sí valdría la pena, y es de horas:** los hitos automáticos (`streak`/`level`) son
**el único contenido que se publica sin que nadie haga nada** (4 de 10 posts) y son la única
pieza de Comunidad que **el coach puede usar como excusa para escribirle a alguien**. Eso se
queda encendido. Lo demás —grupos, más feed, más perfil— se congela.

---

### Play Store — mi opinión, con argumentos

**No. Hoy no.** Y no es por los US$25.

- **La tienda resuelve distribución, y la distribución no es el cuello.** Este negocio no tiene un
  problema de que la gente no encuentre la app: el coach se la entrega en la mano, en su gimnasio,
  a personas que ya conoce. El cuello está **después** de la instalación: de 22 personas con cuenta
  y rutina, **8 no entrenaron nunca**. Poner esa misma app en una tienda multiplica la captación
  de un canal que hoy convierte **1 de 13** (H4). Es escalar la parte rota.
- **No arregla lo que uno esperaría que arreglara.** El informe A3 midió teléfonos corriendo
  cachés hasta 18 versiones viejas; una TWA de Play Store **sigue usando el motor y la caché de
  Chrome**, así que ese problema viaja igual. Y el push tampoco cambia: los 15 inalcanzables lo
  son por no tener teléfono guardado ni suscripción, no por el canal de instalación.
- **Lo que sí cuesta:** el formulario Data Safety obliga a declarar qué datos se recogen —
  y ahí hay **peso, medidas, fotos de progreso y datos de salud de menores**. Declararlo mal en
  Google es un riesgo real, y **la política de privacidad sigue siendo un borrador sin abogado**
  (`LEGAL_V = 2026-07-26-borrador`). La tienda **fuerza** ese trámite legal antes de tiempo.
- **Los US$25 no son el problema, pero tampoco son nada:** ≈100.000 COP = **el 14 % del ingreso de
  un mes**, o sea el mes completo de una clienta.

**Cuándo sí:** cuando haya **15+ personas activas** y el coach quiera captar gente que **no
conoce**. Ese día la tienda deja de ser un trámite y pasa a ser un canal. Mientras el 100 % de los
clientes que pagan salieron de su gimnasio, el enlace de WhatsApp hace exactamente el mismo
trabajo, gratis y sin auditoría legal.

**Lo que sí conviene mantener vivo desde ya, porque cuesta cero:** el keystore respaldado (ya está)
y la política de privacidad revisada por abogado — que hace falta igual, con tienda o sin ella.

---

## Recomendaciones — las 3 palancas, con costo y con métrica

| # | Palanca | Costo | Qué mueve | Cómo se mide |
|---|---|---|---|---|
| **1** | **Modo de gracia (7 días, solo lectura) + recordatorio por WhatsApp 3 días ANTES del vencimiento** | ~2 h + ~1 h | Protege los **725.000 COP/mes**. Evita que mañana 6 de 7 activos queden fuera. Elimina los 90 días-persona de bloqueo | días-persona bloqueados el próximo mes: objetivo **0** · días promedio de retraso en el pago: hoy 8,7 |
| **2** | **Auto-registro → «pedir cupo»** (lead al coach, el coach crea la cuenta) | ~3 h | Convierte un canal de **1 de 13** en el canal de **9 de 9** | de los próximos 8 leads, cuántos entrenan al menos 1 vez. Hoy: **0 de 13** |
| **3** | **Piso de precio 40.000 en el nivel «app» + retirar los 3 «premium» regalados** | 0 h, 7 conversaciones | Recorta el 36 % de la base que aporta el 10 % del ingreso y concentra el tiempo del coach en los 6 que pagan | ingreso del nivel «app» el mes que viene: hoy 47.000 COP/mes |

**Y lo que hay que dejar de hacer:** Comunidad, hasta 15 activos. Es la única forma de que las
tres palancas de arriba quepan en el mes.

---

## Sospechas sin probar

1. **El pago de 1.000 COP de Natalia podría ser un dedo gordo (100.000 → 1.000), no un parche.**
   No puedo distinguirlo desde los datos: solo el coach sabe si esa plata entró. En cualquiera de
   los dos casos el número del tablero es inservible, así que la recomendación de H3 no cambia.
   *Para probarlo: preguntarle al coach.*
2. **Sospecho que el bloqueo por vencimiento contribuyó a que Miguel se fuera** (14 sesiones, se
   venció el 23-jun, entrenó 4 veces vencido y no volvió después del 30-jun). Pero es un solo caso
   y hay explicaciones más simples. *Para probarlo: preguntarle a Miguel; con n=1 no hay dato.*
3. **Sospecho que los 6 clientes de 100-150.000 aguantarían un alza a 160-180.000** (retención del
   100 % durante 3 meses, tolerancia a 15 días sin app, todos renovaron tras el retraso). **No lo
   recomiendo todavía y no lo escribo como hallazgo**: subirle el precio a la única base sana del
   negocio con 7 activos es apostar el 97 % del ingreso por un +20 %. *Para probarlo: primero
   llegar a 12-15 activos; con lista de espera el alza se prueba sola con los nuevos.*
4. **El precio real por persona podría ser distinto de lo registrado** (efectivo sin registrar,
   descuentos de palabra). El campo `note` solo trae «Nequi», «Efectivo», «4 clases al mes» en 4 de
   15 pagos. *Para probarlo: cruzar contra el Nequi del coach — fuera de mi alcance.*
5. **No pude medir si Comunidad aumentó la frecuencia de entreno de los 7 que sí la usan.** Los
   perfiles se crearon entre el 20 y el 27 de julio; hay muy pocos días después para separar el
   efecto del ruido semanal. *Para probarlo: volver a medir a mediados de agosto, comparando
   sesiones/semana antes y después del 20-jul por persona.*

---

## Lo que revisé y está SANO

- **La retención del núcleo es excelente.** Los 6 que pagan 100-150.000 llevan 3 meses sin una sola
  baja; Samuel pagó los 3 meses seguidos. Churn del nivel «coach» = **0 %** en 3 meses. Para un
  coach independiente, eso es 🟢 según cualquier vara.
- **La calidad del cliente creado por el coach es inmejorable:** 9 de 9 pagaron, 7 de 9 siguen
  activos, promedio de **18 sesiones** por persona. El modelo funciona; solo está subalimentado.
- **El KPI «Activos» del tablero no está roto** (`app-2-login.js:1367`, cuenta `active`+`expiring`):
  hoy da 8 y los que entrenan son 7 — la diferencia es Valery, que paga y no entrena. Es una
  discrepancia legítima entre «paga» y «entrena», no un error de cálculo. *Aun así conviene saber
  que son dos cosas distintas.*
- **El coach no cobra de más ni de menos por error:** cada pago tiene fecha y vencimiento
  obligatorios y validados (`app-6-extra.js:2344-2353`); el problema es solo el monto sin validar.
- **Capacidad:** 7 activos sobre 30-40 de techo = **~20 % de ocupación**. Hay muchísimo espacio
  para crecer sin quemar al coach — el límite hoy no es su tiempo, es la entrada.
- **Costo de infraestructura: 0 COP/mes** (Supabase Free, GitHub Pages). No hay ningún gasto
  recurrente que justifique tocar el precio por el lado del costo.
- **Comunidad está bien construida y no molesta a nadie**: es opt-in, no bloquea entrenar, y los 15
  que no la usan ni la ven. Congelarla no obliga a desmontar nada.

---

## Lo que NO alcancé a revisar

- **El Nequi real del coach.** Todo mi análisis de dinero sale de lo que él registró en la app.
  Si cobró en efectivo y no lo registró, mis números son un piso, no la verdad. **Es la limitación
  más grande de este informe.**
- **Costo de oportunidad del tiempo del coach fuera de la app** (cuántas horas presenciales le
  dedica a cada uno de los 6). Sin eso no puedo calcular margen por cliente, solo ingreso.
- **No medí el 28 % de entrenos abandonados a mitad** desde el ángulo de negocio (¿los abandonan
  los que luego se van?). Requiere la instrumentación que el informe de datos ya pidió; con los
  datos de hoy no se puede separar «abandonó» de «cerró la app y siguió después».
- **No revisé los textos comerciales de la app** (upsell, `premiumLockHTML`, mensajes de
  conversión) — eso es del área de experiencia y fricción, que también falta.
- **No evalué AVI GYM** (el proyecto white-label separado, `Desktop/AVI-GYM`, piloto de 150.000
  COP/mes) — está fuera de este repo y es un negocio distinto, pero **es la única vía de
  crecimiento en este informe que no depende de conseguir más gente en Guaduas**. Merece su propia
  revisión.
- **No pude probar el H1 escribiendo** (la auditoría es read-only): la prueba es por cadena de
  privilegios + camino de código + los 20 entrenos reales con plan vencido, no por un `UPDATE`
  ejecutado. Si se quiere certeza absoluta antes de invertir 1-2 días en la tabla `memberships`,
  el experimento es de 5 minutos: con la cuenta QA, un `PATCH` a `user_data.profile` metiendo un
  `payments` con `dueDate` futuro y comprobar que el panel del coach la muestra «Al día».
