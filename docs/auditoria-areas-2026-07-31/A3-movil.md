# Auditoría: PLATAFORMA MÓVIL (Android / iOS / PWA) — Samuel Ríos

## Veredicto en 5 líneas

1. **La hipótesis de la «caché vieja del teléfono» está CONFIRMADA con datos de producción**, no con teoría: la tabla `app_errors` guarda la versión de la caché del teléfono (`build`) y la del HTML servido (`?v=` en `src`), y hay **tres filas donde no coinciden — una con 18 versiones de desfase** (caché `avi-v375` sirviendo un HTML `v393`). Ese desfase es el estado en el que ocurrieron **las 3 caídas de Android** (24, 26 y 27-jul): 3 de 3.
2. La causa mecánica es doble y ambas son de una línea: (a) `cache.addAll()` es **atómico** — un solo archivo que falle deja la caché **VACÍA**, y el comentario de `sw.js` afirma exactamente lo contrario; (b) `reg.update()` se envuelve en un `try/catch` **síncrono** que no atrapa el rechazo de la promesa → los fallos de actualización del Service Worker se pierden como `unhandledrejection` (**6 filas, 5 usuarios distintos, una HOY en el teléfono de Astrid con v417**).
3. **«No se sabe en qué versión va cada asesorado» ya está resuelto en un 80% y nadie lo sabe.** `app_errors.build` trae la versión y `app_errors.ctx->>'uid'` trae la persona (la nota que dice «la telemetría no identifica a nadie» mira la columna `uid`, que sí está NULL, pero **el uid está dentro de `ctx`**). Falta solo reportar al ARRANCAR, no solo al fallar. Costo real: ~10 líneas.
4. **Push:** encontré el emisor del «push al celular del coach que sigue sin explicar» — `daily-notifs` recorre `push_subscriptions` **sin excluir `_coach`**, así que el coach recibe cada día las 3 notificaciones de asesorado. Y hay un endpoint **idéntico registrado a la vez como `_coach` y como el asesorado Samuel** (mismo md5): ese aparato recibe las notificaciones del coach, que llevan **nombre y texto de mensajes de otros asesorados**.
5. Lo demás está sano y mejor de lo que esperaba: manifest, íconos maskable, `assetlinks.json` bien servido en la raíz del dominio, safe-areas, `dvh`, inputs a 16px, la píldora en z-index 690 con su guardia de hit-testing, y la frontera hacia `app-7` correctamente aguardada. **Play Store: mi opinión es NO hoy** (argumentada al final).

---

## Hallazgos verificados

### H1 · 🔴 Los teléfonos se quedan corriendo una caché vieja — y es el estado en el que la app reventó las 3 veces

- **Qué pasa:** el Service Worker nuevo se queda instalado pero **sin activar** (o directamente no llega), así que el teléfono sigue con la caché de una versión anterior mientras el HTML que carga sí es el nuevo. En ese estado los `?v=` que pide el HTML no existen en la caché activa, y basta que la red falle para que un módulo entero **no cargue**.
- **Dónde:** `sw.js:12-20` (install sin `skipWaiting`), `sw.js:28-36` (activate borra las otras cachés **solo cuando activa**), `app-6-extra.js:49-56` (`_tryApplyUpdate` exige `!_aviUpdateBusy()`), y la telemetría `app_errors`.
- **Evidencia:** `build` se calcula en `app-1-infra.js:162` como
  `caches.keys().then(ks => fin((ks.find(k=>/^avi-v\d+$/.test(k))||'').slice(0,40)))`
  → es **la caché más vieja que sobrevive en el teléfono = la del SW ACTIVO**. `src` trae el `?v=` de los `<script>` de `index.html` → **la versión del HTML realmente servido**. Query:

  ```sql
  select at, build, left(msg,60) msg, left(src,40) src, ctx from app_errors order by at desc;
  ```

  Filas donde **no coinciden** (las tres son las tres caídas de Android):

  | fecha | `build` (caché del teléfono) | `src` (HTML servido) | desfase | error |
  |---|---|---|---|---|
  | 2026-07-24 20:47 | `avi-v375` | `app-1-infra.js?v=393` | **18 versiones** | `migratePhotosToStorage is not defined` |
  | 2026-07-26 02:21 | `avi-v393` | `app-1-infra.js?v=397` | 4 versiones | `migratePhotosToStorage is not defined` |
  | 2026-07-27 23:04 | `avi-v403` | `app-1-infra.js?v=406` | 3 versiones | `migratePhotosToStorage is not defined` |

  Y la cuarta caída registrada (`_dia1 is not defined`, 2026-07-27 12:27) sí tiene `build avi-v403` con `src app-4-entreno.js?v=403` — **coinciden**, y en efecto esa fue un bug de código puro (la `const` copiada entre funciones), no de caché. O sea: la telemetría **separa sola** las dos familias de fallo, y las 3 del módulo que no cargó caen todas del lado del desfase.
- **Intenté tumbarlo así:** (1) pensé que la dirección podía ser la contraria (HTML viejo, caché nueva) — no lo es: `src` sale de los `<script src="app-N.js?v=NNN">` de `index.html`, así que `?v=393` prueba que el HTML era v393; (2) pensé que `ks.find` podía devolver una caché *nueva* en vez de la vieja — `caches.keys()` devuelve en orden de creación y `activate` solo borra las demás **cuando activa**, así que con un SW atascado en `waiting` conviven varias y `find` toma la primera = la del SW activo; (3) busqué si el `fetch` network-first de los JS (`sw.js:75-84`, con `cache:'no-cache'`) hacía el desfase inofensivo — **lo hace mientras haya red**, y por eso el síntoma es intermitente y nunca se reprodujo en el PC; con red mala o nula el desfase se vuelve visible. Sobrevivió: la coincidencia 3-de-3 entre desfase y caída no es explicable por azar, y el caso de control (`_dia1`, sin desfase) confirma que la medición discrimina.
- **A quién le pasa:** a cualquiera con red del gimnasio. Está medido en al menos 3 dispositivos distintos y los fallos de actualización de SW (H3) aparecen en **5 usuarios**: Astrid, Natalia, Samuel, Luz y Kathe.
- **Costo del arreglo:** el arreglo de fondo es H2 + H3 (dos líneas). Adicional recomendado, quirúrgico: en `activate`, borrar las cachés viejas también, y añadir un tope de edad al `waiting` (si lleva N horas esperando, aplicar aunque `_aviUpdateBusy` diga que sí, salvo timer de entreno vivo). ~15 líneas.

---

### H2 · 🔴 `cache.addAll()` es todo-o-nada: un archivo que falle deja la caché COMPLETAMENTE vacía — y el comentario dice lo contrario

- **Qué pasa:** el precache del shell mete 15 URLs con un solo `addAll`. Por especificación, `Cache.addAll` es **atómico**: si UNA sola petición falla (red intermitente, 404 durante el despliegue), la promesa se rechaza y **no se guarda ninguna**. El `.catch(()=>{})` no salva las demás: se las traga junto con el error. Resultado: existe una caché `avi-vNNN` **vacía**, y como `build` la reporta, el teléfono parece actualizado y no lo está.
- **Dónde:** `sw.js:7-11` y `sw.js:19`:
  ```js
  // El .catch evita que un 404 puntual rompa el install.
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL).catch(() => {})));
  ```
  El comentario afirma que un 404 puntual queda contenido. **Es falso:** contiene el *rechazo*, no el *daño*.
- **Evidencia:** el propio código + la semántica de `addAll`. Cierra el círculo con H1: para que `migratePhotosToStorage is not defined` ocurra, `app-5-salud.js` tiene que fallar por las **tres** vías del handler (`sw.js:78-82`): red, `caches.match` exacto y `caches.match {ignoreSearch:true}`. Con la caché **poblada** la tercera vía rescataría una copia vieja del archivo — que igual define la función, así que el error no saldría. Con la caché **vacía** las tres fallan, `respondWith` recibe `undefined`, el `<script>` no carga y la función no existe. **Es la única combinación que produce el error observado**, y explica por qué las 3 caídas coinciden con desfase de caché.
- **Intenté tumbarlo así:** busqué si `app-5-salud.js` podía faltar por otra razón — si estuviera fuera del `SHELL` (como sí lo está `app-7-community.js`, ver «sospechas»); no es el caso, está en `sw.js:10`. También comprobé que el regex del handler (`sw.js:75`) sí lo intercepta. Y verifiqué que el fallback `{ignoreSearch:true}` existe y funcionaría **si hubiera algo cacheado**. Sobrevivió.
- **A quién le pasa:** a quien instale o actualice el SW con red inestable — el gimnasio. Es la causa raíz de la clase de bug que v416 tapó con un `typeof` (el `typeof` es correcto y debe quedarse, pero **cura el síntoma**: el módulo sigue sin cargar, solo que ahora en silencio).
- **Costo del arreglo:** una línea conceptual — cachear archivo por archivo en vez de en bloque, para que un fallo puntual no arrastre al resto:
  ```js
  Promise.allSettled(SHELL.map(u => c.add(u)))
  ```
  ~2 líneas. Y corregir el comentario, que hoy documenta una creencia falsa.

---

### H3 · 🟠 Los fallos de actualización del Service Worker no se atrapan: se pierden como `unhandledrejection` y se comen el presupuesto de telemetría

- **Qué pasa:** `reg.update()` devuelve una promesa. Se envuelve en un `try/catch` **síncrono**, que no atrapa rechazos asíncronos. Cada vez que la actualización falla, el rechazo sube a `window.unhandledrejection` → se reporta como error de la app.
- **Dónde:** `app-6-extra.js:69`:
  ```js
  const _checkUpdate=()=>{ try{ reg.update(); }catch(_e){} };
  ```
  Se dispara en cada `visibilitychange` (línea 70) y cada 20 minutos (línea 72).
- **Evidencia:** 6 filas en `app_errors` con
  `Failed to update a ServiceWorker for scope ('.../apex-app/') with script ('.../sw.js'): An unknown …`,
  de **5 usuarios distintos** (`c52b90af` Astrid ×2, `78ea069c` Natalia ×3, `31bf6d19` Samuel ×1), todas con `ctx.standalone = true` (o sea, **PWA instalada**), la más reciente **2026-07-31 12:54 con build `avi-v417`** — hoy. Doble daño: (a) confirma que las comprobaciones de versión están fallando de verdad en teléfonos reales (el combustible de H1); (b) `errReportGate` (`avi-core.js:3464`) topa en **5 errores por sesión y 20 por día**, así que un teléfono que falle al actualizar puede **gastar la cuota y esconder un error real**.
- **Intenté tumbarlo así:** verifiqué que no hubiera un `.catch()` en otra parte de la cadena (`app-6-extra.js:79` tiene `.catch` pero cuelga del `register()`, no del `update()`); y comprobé que `errReportGate` deduplica por firma de mensaje, lo que mitiga —pero no elimina— el consumo de cuota. Sobrevivió.
- **A quién le pasa:** a los 5 usuarios medidos, con la app instalada.
- **Costo del arreglo:** **una línea**: `reg.update().catch(()=>{})`.

---

### H4 · 🟠 Sí se puede saber en qué versión va cada asesorado — falta el 20%, no el 100%

- **Qué pasa:** el pendiente está redactado como si no hubiera nada. En realidad `app_errors` ya guarda `build` (versión de la caché) y `ctx.uid` (la persona). Lo único que falta es que se escriba **al arrancar**, no solo cuando algo falla.
- **Dónde:** `app-1-infra.js:156-163` construye la fila; `ctx:{standalone, w, uid:(typeof _authUid!=='undefined'&&_authUid)||null}`.
- **Evidencia:** de 17 filas, **13 traen `ctx.uid` poblado** con uid reales (Astrid `c52b90af`, Samuel `31bf6d19`, Natalia `78ea069c`, Luz `782f3c3d`, el coach `0a6484ed`). La nota del proyecto —«`app_errors` guarda `uid` NULL, así que la telemetría no identifica a nadie»— **es cierta solo para la columna `uid` de primer nivel**; el identificador está dentro del jsonb `ctx`. Query que ya funciona hoy:
  ```sql
  select ctx->>'uid' as quien, build, ctx->>'standalone' as instalada, max(at)
  from app_errors group by 1,2,3 order by 4 desc;
  ```
  Además `ctx.standalone` responde gratis «¿la tiene instalada o la abre en el navegador?» y `ua` distingue Android de iPhone.
- **Intenté tumbarlo así:** revisé si `_authUid` podría estar vacío en el momento del arranque (sería el caso de las 4 filas con `uid:null`, todas anteriores al login o de sesión anónima) — es una limitación real pero solo afecta al pre-login; al reportar en el arranque **después** de resolver la sesión, se cubre. Sobrevivió.
- **A quién le pasa:** al PO, que hoy no puede responder «¿por qué versión va Astrid?» teniendo el dato a una query de distancia.
- **Costo del arreglo:** ~10 líneas — un `_logAppError('boot', ...)` (o mejor, una tabla/campo aparte para no ensuciar los errores ni gastar `errReportGate`) disparado una vez por sesión tras el login. **Cero infraestructura nueva.**

---

### H5 · 🟠 `daily-notifs` le manda al COACH las 3 notificaciones diarias de asesorado, todos los días

- **Qué pasa:** la función lee **todas** las filas de `push_subscriptions` sin excluir `client_id='_coach'`. Como el coach no tiene fila en `user_data` con ese id, su `state` queda en `null` y **cae a las ramas genéricas** de mañana / media mañana / tarde, con `training_days: []` → recibe los textos de «día de descanso» pensados para asesorados.
- **Dónde:** `supabase/functions/daily-notifs/index.ts:240-243`:
  ```ts
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("client_id, subscription, training_days, training_shift");
  ```
  sin `.neq('client_id','_coach')`. Y línea 291, que lo reconoce sin actuar:
  `const st = state.get(String(sub.client_id)) ?? null; // null p.ej. para '_coach'`.
  El recorrido de ramas (líneas 296-340) solo salta (`skipped++`) en los segmentos que exigen `st` (rescate / comeback); todas las ramas genéricas **envían**.
- **Evidencia:** camino de ejecución completo arriba. Datos: `_coach` tiene **2 filas vivas** en `push_subscriptions` (`_coach` 2026-07-31 12:59 y `_coach` 2026-06-01), y `send-push`/`daily-notifs` envían a **cada fila** → **hasta 6 notificaciones diarias** al coach que él nunca pidió. Coincide con el reporte del PO de «avisos push al celular que no se explican» (los 3 crones son 7am / 10am / 5pm Colombia).
- **Intenté tumbarlo así:** busqué un filtro por `_coach` en cualquier punto anterior — no existe; y verifiqué que la rama de «nunca entrenó» (que sí filtra) **no** aplica porque exige `st` no nulo. También descarté que `training_days: []` lo callara: con `isTraining=false` cae a los pools `.rest`, que también envían. Sobrevivió.
- **A quién le pasa:** al PO, todos los días, ×2 dispositivos.
- **Costo del arreglo:** **una línea**: `.neq('client_id','_coach')` en el select.

---

### H6 · 🟠 Un mismo endpoint de push está registrado a la vez como `_coach` y como el asesorado Samuel

- **Qué pasa:** hay un aparato/navegador cuyo endpoint de push aparece en **dos filas**: una con `client_id='_coach'` y otra con el uid de un asesorado. Ese aparato recibe **las dos corrientes**: las notificaciones del asesorado y las del coach — y las del coach llevan **nombre y texto de mensajes de terceros**.
- **Dónde / query:**
  ```sql
  with s as (select client_id, updated_at, md5(subscription->>'endpoint') eph from push_subscriptions)
  select eph, count(*), array_agg(distinct client_id), array_agg(updated_at order by updated_at)
  from s group by eph having count(*)>1;
  ```
  Salida (una sola fila):
  ```
  80bd0669d52b09bc74cbe3d487890765 | 2 | {_coach, 31bf6d19-ec43-46e3-a7f8-5769bff5a5cd}
                                       | {2026-06-01 01:42:49+00, 2026-07-28 20:45:56+00}
  ```
  `31bf6d19…` = **Samuel Cifuentes** (`samuel@apex.com`, 4 rutinas, coach_id `0a6484ed…`).
- **Evidencia adicional del contenido expuesto** — lo que se envía a `_coach`:
  `app-4-entreno.js:3017` → `'💬 '+clientName+' te escribió'` + los primeros 80 caracteres del mensaje;
  `app-4-entreno.js:915` y `app-6-extra.js:383` → `'🩺 '+name+' tiene dolor hoy'` + el texto;
  `app-2-login.js:1345` → `'💳 '+client.name+' notificó su pago'`.
  `send-push/index.ts:47-50` selecciona **por `client_id`** y envía a **todas** las filas, sin deduplicar por endpoint.
  El endpoint sigue **vivo**: la poda de `send-push` solo borra en 410/404 (líneas 78-95) y esa fila del 1-jun sobrevivió dos meses, además de haber sido re-registrada el 28-jul.
- **Intenté tumbarlo así:** (1) sospeché que el prefijo de 45 caracteres podía ser una coincidencia de truncado (los endpoints FCM comparten 36 caracteres de prefijo) → **repetí la comparación con `md5()` del endpoint completo** y siguen siendo idénticos; (2) consideré que pudiera ser el PC de desarrollo, en cuyo caso no hay fuga de privacidad — **no lo puedo descartar**, y por eso el hallazgo es 🟠 y no 🔴: lo que está **probado** es que el mismo aparato recibe ambas corrientes; **quién es el dueño de ese aparato NO lo puedo determinar desde los datos**. Si es el teléfono de Samuel, es fuga de datos de otros asesorados; si es el PC del PO, es solo ruido duplicado.
- **A quién le pasa:** al coach (duplicado seguro) y, si el aparato no es suyo, a un asesorado que ve los mensajes de los demás.
- **Costo del arreglo:** dos partes. (a) Inmediata, cero código: borrar la fila `_coach` del 2026-06-01 (decisión del PO). (b) De raíz, ~5 líneas: al suscribir, **borrar cualquier otra fila con el mismo endpoint y distinto `client_id`** — un aparato solo puede pertenecer a una identidad a la vez. Encaja con la regla ya escrita en `CLAUDE.md` sobre limpiar el estado por-identidad en `logout()`.

---

### H7 · 🟡 En iPhone sin la app instalada, el push falla en SILENCIO: nunca se le dice «instálala primero»

- **Qué pasa:** en iOS, `window.PushManager` y `window.Notification` **solo existen** dentro de la PWA añadida a la pantalla de inicio (y desde iOS 16.4). En la pestaña de Safari no existen. Las tres tarjetas que piden el permiso comprueban justamente eso y **se vacían sin decir nada**.
- **Dónde:** las tres puertas, todas con el mismo patrón:
  - `app-1-infra.js:381` — `if(!cid||typeof Notification==='undefined'||!('PushManager' in window)){ el.innerHTML=''; return; }` (tarjeta de «Hoy»)
  - `app-1-infra.js:440` — igual, tarjeta del coach
  - `app-4-entreno.js:1854` — igual, tarjeta al terminar el entreno
  - `app-1-infra.js:323` — `subscribePush` devuelve `false` en la primera línea
- **Evidencia:** camino de ejecución. Y la comprobación de que **no hay ningún texto alternativo**:
  ```
  grep -rn "iOS|iPhone|standalone" --include=*.js . | grep -i "push|notific"   → 0 resultados
  ```
  El mensaje de permiso bloqueado (`_pushDeniedHowto`, `app-1-infra.js:372`) sí distingue standalone de navegador, pero solo se alcanza cuando `Notification` **existe** — o sea, nunca en Safari-pestaña.
- **Fracción de la base afectada, medida:** de las 6 suscripciones de asesorado vivas, **1 es de Apple** (`web.push.apple.com`, `78fe5c7c…` = Kathe Beltran) y 5 son FCM/Android. O sea, hay al menos **un iPhone que SÍ lo logró** (tiene la PWA instalada e iOS ≥16.4) — el camino funciona. El riesgo es para el iPhone que **no** la instala: hay al menos otro (telemetría 2026-07-06, `iPhone; CPU iPhone OS 18_7 … Version/26.5 Mobile/15E148 Safari/604.1`, con `ctx.standalone:false` — o sea, **en pestaña**). Para esa persona, la app nunca menciona las notificaciones.
- **Intenté tumbarlo así:** busqué si el banner de instalación iOS (`index.html:1077`) mencionara las notificaciones como motivo — habla solo de instalar, no de notificaciones; y comprobé si `renderWfPushNudge` tenía una rama alternativa — no la tiene, hace `return` seco.
- **A quién le pasa:** a los usuarios de iPhone que abren AVI desde el enlace de WhatsApp y no la instalan. Dado que **15 de 22 son inalcanzables**, callar la única vía que les queda es caro.
- **Costo del arreglo:** ~8 líneas — en las tres puertas, cuando `isIOS && !standalone`, en vez de `innerHTML=''` pintar «Para recibir tus recordatorios, instala AVI: Compartir ⬆️ → Añadir a pantalla de inicio» con el botón que ya abre `#ios-install-banner`.

---

### H8 · 🟡 En iPhone, tocar el campo para escribirle al coach hace ZOOM (fuente < 16px)

- **Qué pasa:** iOS Safari hace zoom automático al enfocar cualquier `<input>`/`<textarea>` con `font-size` menor a 16px. El compositor del chat está en **14px**.
- **Dónde:** `styles.css:1574`:
  ```css
  .cchat-composer textarea{...;padding:9px 14px;font-size:14px;...}
  ```
- **Evidencia:** medición estática del valor + la regla conocida de WebKit. Alcance: `.cchat` lo reusan **el chat del coach y el chat de comunidad (DMs)** (`app-7`, overlay `#cmty-chat`), así que cubre las dos superficies de escritura.
- **Intenté tumbarlo así:** revisé si el resto de campos tenía el mismo defecto — **no**: `.inp/.sel/.tarea` (`styles.css:455`) y `.gm-sinput` del guiado (`styles.css:1416`) están correctamente a 16px. Es un caso aislado, lo que refuerza que es un descuido y no una decisión. También comprobé que `user-scalable=no` no lo tapa: **el `<meta viewport>` (`index.html:5`) no lo lleva** (`width=device-width, initial-scale=1.0, viewport-fit=cover`), así que nada impide el zoom.
- **A quién le pasa:** a Kathe (el iPhone con push confirmado) cada vez que le escribe al coach.
- **Costo del arreglo:** **una línea** — `font-size:16px`.

---

## Sospechas sin probar

- **La píldora «Instalar app» en las pestañas que NO están en `_PILL_ZONAS`.** La lista es `'#cn-today.on,#cn-routines.on,#cn-messages.on'` (`app-6-extra.js:184`) y la decisión de dejar fuera Comunidad/Perfil/Progreso está documentada y argumentada. Pero **Comunidad ganó campos de escritura después** de esa decisión: el compositor de publicación y el **borrador de comentario por post** (v390, `_cmtyActionsHtml`). Ese es exactamente el patrón que el propio comentario advierte («al mover algo a la zona de abajo, hay que revisar esta lista») y que ya mordió en v409 con Mensajes. **No lo medí**: hacerlo exige montar el fixture de comunidad con login real y correr el hit-testing de `pillStealsTap` sobre `#cn-community`. Falta: correr `_verify-comments.mjs` / `_verify-feed.mjs` con las credenciales de `~/.avi/e2e-creds.json` y añadirle el hit-test que ya usa `_verify-f4-chat`.
- **`AVINAV.layers` podría dejar la app sin poder actualizarse nunca.** `_aviUpdateBusy` devuelve `true` mientras `AVINAV.layers>0` (`app-6-extra.js:30`), y el contador **solo se decrementa en un sitio**, dentro del handler de `popstate` (`app-2-login.js:1143`), mientras se incrementa en `navOpenLayer` (`app-1-infra.js:27`). Si una capa se cierra por una vía que no pasa por `history.back()`, el contador queda alto y el SW nuevo se queda en `waiting` indefinidamente — que es justo el estado de H1. **Atenuante que no pude descartar:** `navReset` (`app-1-infra.js:25`) lo pone en 0 al cambiar de pestaña, así que el escape existe. Falta: un harness que abra y cierre cada overlay por sus 5 vías de cierre y afirme `AVINAV.layers===0` al final.
- **`Uncaught SyntaxError: Unexpected end of input` en `:4:87`** — 5 filas de `app_errors`, entre v310 y v410 (6 meses, 8 versiones distintas), **cuatro de ellas en el dispositivo del coach** (`0a6484ed`) y una en el de Luz. El `src` sin nombre de archivo (`:4:87`, una vez `#:4:87`) apunta a un script en línea o inyectado, no a un archivo de la app. **Sospecho una extensión del navegador o un `javascript:` externo**, no código de AVI — pero está consumiendo cuota de telemetría desde hace medio año y nadie lo ha mirado. Falta: reproducir en el aparato del PO, o añadir el nombre del documento al `src` para poder atribuirlo.
- **`app-7-community.js` no está en el precache del shell** (`sw.js:10` lista los 10 archivos, y `app-7` no está, aunque `index.html:1170` sí lo carga). El handler de red **sí** lo intercepta (`sw.js:75`, el regex `app-\d-[\w-]+` lo cubre), así que se cachea de forma oportunista tras el primer uso. **Verifiqué que la frontera está bien aguardada** (ver «sano»), así que no rompe nada — pero es una asimetría no intencional que conviene cerrar cuando se toque H2.

---

## Lo que revisé y está SANO

- **Manifest** (`manifest.json`): `display:standalone` + `display_override`, `theme_color`/`background_color` `#06090A`, `scope` e `id` correctos, `orientation:portrait`, y **los 4 íconos separando `any` de `maskable`** (192/512 de cada uno) — que es lo correcto, no el `"any maskable"` mezclado que describe mi propio archivo de rol. `shortcuts` y `screenshots` presentes.
- **`assetlinks.json` — intenté tumbarlo y me equivoqué yo.** Di por hecho que estaría solo en `/apex-app/.well-known/` (invisible para Chrome, que lo busca en la raíz del origen) y que la TWA abriría con la barra de direcciones. **Falso, medido:** `curl https://kronos-apex.github.io/.well-known/assetlinks.json` → **200**, con el `package_name` `io.github.kronos_apex.twa` y su huella SHA-256. La infraestructura de TWA está lista. (Caveat que no puedo verificar sin la Play Console: con Play App Signing la huella que debe ir ahí es la de la **clave de firma de Google**, no la de subida local.)
- **Service Worker, lo que sí está bien pensado:** archivo estático con scope `/apex-app/` (nunca blob), sin `skipWaiting` automático para no cortar un entreno, `network-first` con respaldo para los JS y CSS (que es lo correcto: `cache-first` fue lo que dejaba `styles.css` pegado), `cache:'no-cache'` para saltarse el `max-age=600` de Pages, timeout de 3s solo en la navegación, rango de bytes respetado en los `.mp4` para iOS, y limpieza de registros con scope distinto (`app-6-extra.js:75-77`).
- **Frontera hacia `app-7`, limpia.** Barrí las 157 funciones de `app-7-community.js` buscando llamadas sin guarda desde los otros 6 módulos — la única llamada real, `renderCommunity()` (`app-4-entreno.js:215`), **está aguardada** por `typeof renderCommunity==='function'` en la línea anterior, y no hay ninguna referencia a `CMTY` fuera de su módulo. La clase de bug de v416 **no se repite hacia comunidad**.
- **iOS, el resto:** `viewport-fit=cover` + 15 usos de `env(safe-area-inset-*)`; `100vh` siempre con su `100dvh` detrás (3 de 3); `apple-touch-icon` apuntando a un PNG de marca real con cache-buster (`app-1-infra.js:12`), no a un canvas; `apple-mobile-web-app-capable` y `status-bar-style: black-translucent`; **8 `apple-touch-startup-image`** por resolución exacta de iPhone; y la guía de instalación de iOS de 3 pasos, bien escrita y en tono correcto.
- **Píldora de instalación:** `z-index:690` (por debajo de todos los overlays, por encima de la barra de pestañas) tal como quedó en v405; se esconde con `visibility:hidden` y no con `display:none` (respetando el gotcha de la caja que se mide a sí misma, `styles.css:870`); reglas que la ocultan en login, en el chat, en la pantalla de cierre y en las «habitaciones»; guardia `pillStealsTap` enganchada a scroll/resize/orientationchange **y al click con re-medición a 320ms** para las tarjetas que se despliegan animadas. La captura temprana de `beforeinstallprompt` en el `<head>` (`index.html:12-14`), antes de que cargue el JS que espera a la nube, es correcta y necesaria.
- **Push, la mecánica:** escritura por `AUTH.client().upsert` y no por `fetch` crudo (la raíz de los 40 días sin push); `client_id` derivado de `auth.getUser().id` y no de un valor local; `onConflict:'client_id,subscription'`; sellado en localhost (`cloudWriteSealed`) para que ningún harness contamine producción; self-heal forzado una vez por sesión para coach y asesorado, marcando «curado» **solo tras éxito**; toasts honestos; poda de 410/404 en `send-push`; y `send-push` exige `Authorization` con la anon key.
- **Inputs a 16px** en `.inp/.sel/.tarea` y en el campo de series del guiado — el zoom de iOS solo escapa en el compositor del chat (H8).
- **`ios-install-banner`**: menor y no lo cuento como hallazgo — `dismissIOSBanner` escribe `apex_ios_banner_dismissed` en localStorage y **nadie lee esa clave** (`grep` → 1 sola aparición, la escritura). Es código muerto inofensivo, porque el banner solo aparece al tocar «Instalar».

---

## Play Store — mi opinión, con argumentos

**No hoy.** Y no por el trabajo técnico, que está casi hecho, sino por el requisito de Google.

Lo que **ya está listo**: keystore respaldado con su `.aab` y `signing-key-info.txt`; `assetlinks.json` sirviéndose bien en la raíz del dominio (medido, 200); manifest con `standalone`, íconos maskable, screenshots `narrow` y shortcuts; borrado de cuenta self-service (edge `delete-account`); política de privacidad pública en `legal/`.

Lo que **cuesta de verdad**: (1) US$25 una vez; (2) desde 2023, una cuenta de desarrollador **personal** nueva debe correr una prueba cerrada con **20 testers que se mantengan 14 días seguidos** antes de poder publicar — con 22 asesorados de los cuales **7 están activos**, eso no se cumple sin inventar cuentas; (3) formulario de Data Safety; (4) y lo que nadie contabiliza: **mantenimiento recurrente** — Google sube el `targetSdk` obligatorio cada año y hay que reempaquetar y resubir o la app deja de ser instalable.

Lo que **no compra**: la app ya se instala hoy desde Chrome en un toque (`beforeinstallprompt` capturado, con su píldora). Play Store no arregla el problema real, que es de **activación**: 8 personas con rutina que nunca entrenaron, y 13 auto-registradas con 0 activos. Nadie de esos 8 se va a activar porque el ícono venga de Play en vez de «Añadir a inicio».

**Mi recomendación:** dejarlo dormido y gastar ese esfuerzo en H4 (saber en qué versión va cada quien) + H7 (que el iPhone sepa que existe el push). Reabrirlo cuando haya ~50 usuarios activos o cuando AVI GYM empiece a vender a gimnasios, donde «está en Play Store» sí es un argumento comercial. Si el PO igual lo quiere, el orden es: los 20 testers primero — todo lo demás ya está.

---

## Lo que NO alcancé a revisar

- **Nada de esto se confirmó en un teléfono físico.** No tengo dispositivo real. En concreto **requieren un aparato de verdad**: (a) que el ícono maskable no se recorte mal en el lanzador de Android; (b) que la barra de estado tome el `theme_color`; (c) el comportamiento real del teclado tapando el campo activo (el emulador no levanta teclado); (d) el zoom de H8 en Safari real; (e) que la TWA abra sin barra de Chrome (además Chrome **cachea** la verificación de assetlinks, así que exige reinstalar o reiniciar Chrome); (f) el push de iOS con la pantalla bloqueada.
- **No corrí ningún harness de Playwright.** Preferí gastar el presupuesto en la telemetría de producción, que resultó dar evidencia mucho más dura que cualquier emulación. Queda sin medir: el hit-testing de la píldora en Comunidad/Perfil/Progreso (ver «sospechas»), y la comprobación en vivo de que una caché vacía produce el error de módulo no cargado (se puede montar con `caches.delete` + `offline` en CDP).
- **Ciclo de vida del teléfono, punto 4 del encargo: revisado solo a medias.** Verifiqué que los timers van por timestamp absoluto y que `_aviUpdateBusy` protege contra recargar encima de un entreno. **No revisé**: qué pasa exactamente si el sistema mata la pestaña a mitad de entreno (las claves `done_/log_` viven en localStorage y deberían sobrevivir, pero no lo probé), el giro de pantalla (el manifest fuerza `portrait` **solo en la PWA instalada**; en pestaña gira y no medí el layout), ni el **navegador embebido de WhatsApp**, que es la puerta de entrada real de los asesorados y donde no hay `beforeinstallprompt` ni, en muchas versiones, Service Worker: ahí la píldora «Instalar app» cae al toast genérico «Abre el menú del navegador (⋮)» (`app-6-extra.js:152`), que en WhatsApp **no lleva a ninguna opción de instalar**. Eso último huele mal y es probablemente el hallazgo más caro que dejé sin medir.
- **No revisé** el flujo de shortcuts del manifest (`?go=hoy`/`?go=progreso`/`?go=mensajes`) ni el manejo de `?avi-chat=` que abre `notificationclick`.
