# Auditoría: A3 · PLATAFORMA MÓVIL (Android / iOS / PWA) — Samuel Ríos

**Alcance:** delta v418 → v526 (HEAD `6d2a561`, sello `avi-v526`, en producción).
**Ronda anterior de esta área:** `docs/auditoria-areas-2026-07-31/A3-movil.md`.
**Medido hoy, no supuesto:** dos sondas propias sobre el DOM vivo con el iPhone simulado (393×852,
`env(safe-area-inset-top)` sustituido por 59 px, caché del navegador apagada) + 4 consultas de
solo-lectura a producción.

---

## Veredicto en 5 líneas

1. **v525 aguanta y aguanta bien.** Barrí el DOM vivo de **las 6 pestañas del asesorado y los 2
   chats de pantalla completa** con el iPhone simulado: **cero controles pulsables bajo la franja
   del sistema**, arriba *y* abajo. Y el área pulsable de «Volver» escala correcta en los 3 tamaños
   de letra y en los 2 temas (top 59 / 70 / 83 px, siempre por debajo de la línea) **sin robarle
   área al título**. La pregunta «¿rompe algo con la letra grande?» tiene respuesta medida: **no**.
2. **v526 arregló UN campo y dejó ONCE.** En el DOM vivo hay **94 campos tecleables y 12 por debajo
   de 16 px** — entre ellos **los dos compositores de chat a pantalla completa** (`#cchat-in` del
   coach y `#cmtychat-in` de los mensajes directos de Comunidad, los dos a **14 px**). Es
   literalmente el mismo defecto que v526 vino a matar, en la superficie de al lado.
3. **El candado que v526 dejó no puede cazarlos**, y por tres razones distintas: solo mira campos
   que tienen atributo `class`, solo entiende selectores de UNA clase a secas (no `.cchat-composer
   textarea`), y no ve el `style=` en línea, que le GANA a la clase. La frase «era la única de las 7
   clases por debajo de 16» es cierta sobre un universo equivocado.
4. **Nataly recibe cada notificación hasta 8 veces.** Tiene **8 filas de `push_subscriptions` con el
   MISMO endpoint** (mismo aparato, claves distintas). El comentario del código afirma justo lo
   contrario de lo que hace el `upsert`.
5. **Tres hallazgos de julio siguen vivos en v526** y uno de ellos con casos nuevos medidos: el fallo
   de actualización del Service Worker se sigue registrando en producción **11 veces más desde
   julio**, la última el **21-ago con caché `avi-v512`**, siempre con la app instalada. Los dos
   arreglos cuestan **una línea cada uno**.

> **Dato de tamaño para priorizar, medido hoy:** de las suscripciones de push vivas hay **8 personas
> en Android** y **1 en iPhone: Kathe Beltran** — que es exactamente quien reportó el bug de v525.
> El público de iOS es pequeño **y es el que está reportando**.

---

## Hallazgos verificados

### H1 · 🟠 Quedaron 11 campos por debajo de 16 px, y dos de ellos son los chats de pantalla completa

- **Qué pasa:** Safari en iOS hace zoom al enfocar un campo con letra menor de 16 px. v526 subió
  `.mta` (el campo de «Mensajes» del asesorado). Pero el **compositor del chat a pantalla completa**
  —el mismo overlay que usan el chat del coach y los **mensajes directos de Comunidad**— sigue en
  **14 px**, y hay otros nueve campos por debajo del umbral.
- **Dónde:**
  - `styles.css:1816` → `.cchat-composer textarea{…font-size:14px…}` — afecta a `#cchat-in`
    (`index.html:1759`) y a `#cmtychat-in` (`index.html:1773`).
  - `index.html:1322` `#notif-tpl`, `index.html:1332` `#notif-msg`, `index.html:1342`
    `#notif-target` → `font-size:13px` **en línea**.
  - `#r-why` (13 px en línea, con clase `.inp` que dice 16) y `#pk-env` (12 px en línea, clase
    `.sel`) — el `style=` gana.
  - `app-7-community.js:1722` → `#cmt-in-<post>` (caja de comentar del muro) a **13 px en línea**.
  - `app-3-coach.js:3219` y `app-2-login.js:1000-1004` (`#ads_`/`#adr_`) → 13 px en línea.
- **Evidencia (DOM vivo, no lectura del CSS):** sonda propia con login real de la cuenta QA,
  recorriendo las 6 pestañas y 4 overlays, leyendo `getComputedStyle(el).fontSize` de **todos** los
  `input/textarea/select` tecleables. Controles de la corrida: `2` reescrituras del CSS y
  `.exlb-close` en `top=67` (= 59+8, el valor que su regla promete). Salida:

  ```
  ===== CAMPOS TECLEABLES POR DEBAJO DE 16px (DOM vivo) =====
    12px       select#pk-env.sel
    13px       textarea#r-why.inp
    13px       select#notif-tpl
    13px       textarea#notif-msg
    13px       select#notif-target
    13.3333px  select#su-goal / #su-place / #su-level / #su-days / #su-sex   (ocultos, ver abajo)
    14px       textarea#cchat-in
    14px       textarea#cmtychat-in
    total campos vistos: 94
  ```
- **Por qué el candado de v526 no los ve** (`avi.test.js:12142`), tres agujeros independientes:
  1. `if (c) c[1].trim().split(...)` — un campo **sin atributo `class`** no entra en el conjunto.
     `#cchat-in` y `#cmtychat-in` no tienen clase: los viste un selector descendiente.
  2. `if (!/^\.[A-Za-z0-9_-]+$/.test(p)) continue;` — solo acepta selectores de **una clase a
     secas**, así que `.cchat-composer textarea` ni se mira.
  3. Mide la **clase**, no el **elemento**: `#r-why` es `.inp` (16 px) con `style="font-size:13px"`.
     El test lee 16 y la persona ve 13.
  Y una cuarta, de alcance: solo lee `index.html`, así que los campos que pinta el JS
  (`#cmt-in-…`, `#ads_…`) están fuera por construcción.
- **Intenté tumbarlo así:** (1) pensé que los cinco `select#su-*` a 13,33 px eran el hallazgo — **no
  lo son**: llevan `hidden` en `index.html:182-186` y el asistente elige con chips, así que nunca se
  enfocan; los saco de la cuenta y por eso el titular dice **once**, no dieciséis. (2) Comprobé si
  `user-scalable=no` tapaba el zoom: el `<meta viewport>` (`index.html:5`) **no lo lleva**, así que
  nada lo impide — igual que en julio. (3) Comprobé que `.mta` sí quedó arreglado
  (`styles.css:738`, `font-size:16px`) y que no aparece en la lista de la sonda: v526 hizo su
  trabajo, el problema es el alcance. (4) Comprobé que `.cchat-bar` **sí** respeta el área segura
  (`styles.css:1798`), o sea que ese overlay está bien por arriba y mal por dentro.
- **A quién le pasa:** a **Kathe Beltran**, el único iPhone con la app instalada que aparece medido
  en `push_subscriptions` — y es la misma persona que reportó el bug de v525. Los DM de Comunidad y
  el comentario del muro son superficies de asesorado; `#notif-*`, `#r-why`, `#pk-env` y `#ads_` son
  del coach, así que solo le pican si él usa iPhone (no lo pude determinar: su UA en `app_errors` es
  la reducida de Android).
- **Costo del arreglo:** el campo que importa es **una línea** (`styles.css:1816`, 14 → 16).
  Los demás, un `font-size` en línea cada uno (~6 ediciones). **Lo que de verdad cuesta es el
  candado**, y es donde recomiendo gastar: la sonda correcta ya está escrita y probada —
  `getComputedStyle` sobre el DOM vivo, que no necesita saber de clases ni de cascada. Media hora,
  y de paso cubre lo que pinta el JS. ⚠️ El zoom en sí **sigue sin poder reproducirse** (no hay
  iPhone en el banco); lo que está medido es que los campos están por debajo del umbral.

---

### H2 · 🟠 Una asesorada real tiene 8 filas de push para UN solo aparato — y el comentario del código dice lo contrario

- **Qué pasa:** `subscribePush` hace `upsert` con `onConflict:'client_id,subscription'`. La unicidad
  incluye **el jsonb entero** (endpoint **+ claves**), así que cuando el navegador rehace las claves
  y conserva el endpoint, **no hay conflicto y se inserta una fila nueva**. `send-push` reparte a
  **todas** las filas del `client_id` y solo poda las que devuelven 410/404.
- **Dónde:** `app-1-infra.js:352-355` (el upsert) y su comentario en `app-1-infra.js:344-345`:
  > «onConflict = la UNIQUE (client_id, subscription) → re-suscribir el mismo endpoint **ACTUALIZA
  > en vez de duplicar**.»

  `supabase/functions/send-push/index.ts:114` (selecciona todas las filas) y `:143-147` (poda solo
  410/404).
- **Evidencia (producción, solo SELECT):**
  ```sql
  with s as (select client_id, updated_at, md5(subscription->>'endpoint') eph from push_subscriptions)
  select eph, count(*) n, count(distinct client_id) ids from s group by eph having count(*)>1;
  -- 55eb36723f29288ad6130cf5bce4a9bf | 8 | 1
  ```
  Las 8 filas son de `6e54e22b…` = **Nataly** (`tier:'app'`), fechadas del **12-ago al 20-ago**, con
  el **mismo endpoint** y `keys.auth`/`keys.p256dh` **distintos en cada una**. Reparto por persona:
  Nataly 8 filas / 1 aparato · otras dos con 2 filas / 2 aparatos · el resto 1 y 1.
- **Intenté tumbarlo así:** (1) pensé que serían aparatos distintos con endpoints parecidos —
  comparé por `md5()` del endpoint **completo**, son idénticos; (2) pensé que la guarda
  `shouldPostPush` (que compara el endpoint contra `localStorage`) lo frenaría — la frena, pero el
  **self-heal con `force=true`** la salta una vez por sesión, que es exactamente la cadencia que se
  ve en las fechas; (3) busqué una poda que las limpiara — `send-push` solo borra en **410/404**, y
  una fila con claves viejas falla con **400** (cifrado inválido), que no se poda nunca. Sobrevivió.
- **A quién le pasa:** hoy a **Nataly**, y crece sola. Las dos ramas posibles son las dos malas y no
  puedo separarlas sin el aparato: **o recibe 8 copias de cada notificación** (una app que repite
  ocho veces se silencia, y el push es la única vía que le queda a quien no tiene teléfono guardado),
  **o recibe una y las otras 7 son envíos fallidos permanentes** que ensucian la cuenta de errores
  de la función.
- **Costo del arreglo:** ~5 líneas y una decisión. Al suscribir, **borrar las filas del mismo
  `client_id` cuyo endpoint coincida** antes de insertar (un aparato = una fila), que es la misma
  regla que ya se aplicó en julio al caso `_coach`. Y **corregir el comentario**, que hoy documenta
  una creencia falsa — es exactamente la clase que el propio `CLAUDE.md` marca como «un comentario
  con una razón falsa es peor que ninguno». Limpiar las 7 filas de Nataly es un `delete` de una vez.

---

### H3 · 🟠 El fallo de actualización del Service Worker sigue sin atraparse — 11 casos NUEVOS desde julio, el último anteayer

- **Qué pasa:** `reg.update()` devuelve una promesa y se envuelve en un `try/catch` **síncrono**, que
  no atrapa un rechazo asíncrono. Cada fallo sube como `unhandledrejection` y se reporta como error
  de la app, gastando cuota de telemetría (`errReportGate` topa en 5 por sesión / 20 por día).
- **Dónde:** `app-6-extra.js:85` → `const _checkUpdate=()=>{ try{ reg.update(); }catch(_e){} };`
  Reportado en julio (H3 de la ronda anterior) y **sin tocar en 108 versiones**.
- **Evidencia (producción):** `app_errors` de los últimos 30 días, agrupado por día y build:
  `Failed to update a ServiceWorker for scope ('https://kronos-apex.githu…')` en
  **v418, v432, v448, v479, v481 (×2, 2 personas), v483, v501, v506, v512** — la más reciente
  **2026-08-21 con caché `avi-v512`**. Todas con `ctx.standalone = true`, o sea **con la app
  instalada**, que es justo el público que reportó el bug de v525.
- **Intenté tumbarlo así:** busqué un `.catch()` más arriba en la cadena — el que hay
  (`app-6-extra.js`, colgando de `register()`) no cubre a `update()`; y comprobé que no fuera ruido
  de una sola persona: son **2 personas distintas** solo en el día 13-ago.
- **A quién le pasa:** a quien tiene la app instalada — que son los que entrenan. Y tiene un daño de
  segundo orden que importa hoy más que nunca: **si la comprobación de versión falla, v525 y v526 no
  llegan al teléfono de Kathe**, que es para quien se hicieron.
- **Costo del arreglo:** **una línea** — `reg.update().catch(()=>{})`.

---

### H4 · 🟡 `cache.addAll()` sigue siendo todo-o-nada, y el comentario sigue afirmando lo contrario

- **Qué pasa:** el precache mete **16 URLs con un solo `addAll`**. Por especificación es atómico: si
  una falla, **no se guarda ninguna** y queda una caché `avi-vNNN` **vacía** que el teléfono reporta
  como si estuviera actualizado.
- **Dónde:** `sw.js:8` (el comentario) y `sw.js:23`:
  ```js
  // El .catch evita que un 404 puntual rompa el install.
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL).catch(() => {})));
  ```
  El `.catch` contiene el **rechazo**, no el **daño**.
- **Evidencia:** el código + la semántica de `addAll`. Reportado en julio con el camino completo
  hasta las 3 caídas de Android; **idéntico en v526**. De paso sigue viva la asimetría que en julio
  quedó como sospecha: **`app-7-community.js` no está en `SHELL`** (`sw.js:14`) aunque
  `index.html` lo carga — se cachea de forma oportunista y nadie decidió que fuera así.
- **Intenté tumbarlo así:** comprobé que el `fetch` sea `network-first` para los JS (lo es), lo que
  hace el defecto **intermitente y solo visible con red mala** — que es por lo que nunca se reprodujo
  en el PC y por lo que lleva un año sin arreglarse.
- **A quién le pasa:** a quien instale o actualice con la red del gimnasio.
- **Costo del arreglo:** **dos líneas** — `Promise.allSettled(SHELL.map(u => c.add(u)))` y corregir
  el comentario. Añadir `app-7` a la lista es una coma.

---

### H5 · 🟡 En iPhone sin la app instalada, las notificaciones siguen fallando en SILENCIO

- **Qué pasa:** en Safari-pestaña de iOS no existen `Notification` ni `PushManager`. Las tres puertas
  que piden el permiso comprueban eso y **se vacían sin decir una palabra**: nunca le dicen a esa
  persona que tiene que instalar la app primero.
- **Dónde:** `app-1-infra.js:381` (tarjeta de «Hoy»), `app-1-infra.js:440` (tarjeta del coach),
  `app-4-entreno.js:2143` (al terminar el entreno), `app-1-infra.js:323` (`subscribePush`).
- **Evidencia:** `grep` de `isIOS` en los 7 módulos → **solo 3 apariciones, todas en
  `app-6-extra.js:104-160`**, que es la píldora de instalación. Ninguna de las tres puertas de push
  distingue iOS: es `innerHTML=''` y punto. Idéntico a julio.
- **Intenté tumbarlo así:** comprobé si `_pushDeniedHowto` cubría el caso — solo se alcanza cuando
  `Notification` **existe**, o sea nunca en Safari-pestaña.
- **A quién le pasa:** al iPhone que abre AVI desde el enlace de WhatsApp y no la instala. Con **13
  de 22 inalcanzables**, callar la única vía que le queda a alguien es caro.
- **Costo del arreglo:** ~8 líneas: cuando `isIOS && !standalone`, en vez de vaciar, pintar
  «Para recibir tus recordatorios, instala AVI: Compartir ⬆️ → Añadir a pantalla de inicio».

---

## Sospechas sin probar

- **El teclado y los chats a pantalla completa.** No hay **ni una** aparición de `visualViewport` en
  todo el repo, y el `<meta viewport>` no declara `interactive-widget`. `.cchat` es
  `position:fixed;inset:0` con el compositor como último hijo: en iOS, al abrir el teclado el
  *layout viewport* no encoge, así que el compositor puede quedarse **detrás del teclado**. Es el
  defecto clásico de WebKit y toca la MISMA superficie que H1. **No lo pude reproducir**: el
  headless no levanta teclado y no hay iPhone. Falta: probarlo en el aparato de Kathe, o instrumentar
  `visualViewport.height` y reportarlo una vez.
- **`#cmt-in-<post>` (comentar en el muro) a 13 px NO salió en mi sonda del DOM vivo** porque la
  cuenta de prueba tiene el muro vacío y esa caja la pinta el JS por publicación. Lo tengo por
  `grep` (`app-7-community.js:1722`), no por medición: es un hallazgo del mismo H1 pero con una
  evidencia más floja que los demás. Falta: montar un post y medirlo.
- **`.exdetail-sheet` reserva 32 px abajo** (`styles.css:1381`) y la barra de gestos del iPhone mide
  **34**. Es una hoja anclada al borde inferior, así que los últimos 2 px de su contenido caen bajo
  el indicador. No lo llamo hallazgo porque 2 px no rompen nada hoy — pero es la misma familia del
  calendario a 386 de 390 px: *un margen de 2 px no es que funcione, es que todavía no ha fallado*.
- **`.dob-sheet` («Datos de partida») no nombra el área segura por arriba** (`styles.css:1847`,
  `padding:26px`) dentro de un `#data-ob` que es `fixed;inset:0`. Hoy lo primero que hay ahí son
  los **puntitos de progreso**, que no son pulsables, así que mi barrido no marcó nada. Es un
  hallazgo latente: el día que alguien ponga un «‹ Atrás» arriba, es v525 otra vez.
- **El navegador embebido de WhatsApp**, que es la puerta de entrada real de los asesorados: sin
  `beforeinstallprompt` y a veces sin Service Worker, la píldora «Instalar app» cae al toast
  genérico «Abre el menú del navegador (⋮)», que ahí no lleva a ninguna opción de instalar.
  Heredado de julio, **sigue sin medir** — y sigue oliendo a lo más caro que nadie ha mirado.

---

## Lo que revisé y está SANO

- 🟢 **v525, verificado en el DOM vivo y no leyendo el CSS.** Con el iPhone simulado (inset 59 px
  arriba, 34 abajo) barrí **las 6 pestañas del asesorado** —`cn-today`, `cn-routines`,
  `cn-messages`, `cn-history`, `cn-profile`, `cn-community`, cada una afirmando su `display` antes
  de medirla— más los overlays de **DM de comunidad** y **chat del coach**:
  `CONTROLES BAJO EL AREA SEGURA → ninguno`, ni arriba ni abajo. Controles de la corrida: 2
  reescrituras del CSS y `.exlb-close` en `top=67`.
- 🟢 **El área pulsable del `::after` no rompe nada con la letra grande ni con el tema.** Medido
  sintetizando `.sroom.on > .sroom-bar > .sroom-back` en las 6 combinaciones:

  | tamaño | tema | top del botón | alto | ¿le roba área al título? |
  |---|---|---|---|---|
  | md | claro / oscuro | **59** | 34 | 0 px |
  | lg | claro / oscuro | **70** | 40 | 0 px |
  | xl | claro / oscuro | **83** | 48 | 0 px |

  Los tres quedan **en o por debajo** de la línea de 59 px, y el `zoom:1.40` de
  `styles.css:1749` **sobre-reserva** el área segura (la escala junto con el resto), o sea que va
  en la dirección segura. El `::after` no le quita ni un píxel a `.sroom-bar-t`.
  ⚠️ Honestidad de esa corrida: el conteo de píxeles pulsables salió **0 en las 6**, y eso es un
  fallo **de mi sonda**, no de la app — `#avi-loading` es `fixed;inset:0;z-index:9999` y estaba
  encima, así que `elementFromPoint` le devolvía el overlay. La geometría (que no depende del
  apilado) sí vale; el conteo pulsable ya lo mide `_repro-safearea-volver.mjs` después del login.
- 🟢 **`.mta` quedó realmente arreglado** — `styles.css:738`, `font-size:16px`, y no aparece en la
  lista de campos chicos del DOM vivo.
- 🟢 **Área segura INFERIOR (barra de gestos):** `.cntabs` (`styles.css:786`), `.cchat-composer`
  (`:1815`), `.wf-inner` (`:1477`), `.ob-btns` (`:1461`) y `.dob-sheet` (`:1847`) la reservan. Con
  el inset de 34 px puesto, **ningún control de las 6 pestañas cae dentro de esa banda**.
  ⚠️ Y una trampa de sonda que dejo escrita porque me mordió: `env(safe-area-inset-bottom,0px)`
  lleva un **valor de respaldo**, así que un regex que busque `env\(safe-area-inset-bottom\)` a
  secas **no lo sustituye**, el inset queda en 0 y la barra de pestañas sale «invadiendo» algo que
  en realidad reserva bien. Mi primera corrida imprimió **60 falsos positivos** por eso.
- 🟢 **`.cchat-bar` (la barra de los dos chats de pantalla completa) sí respeta el área segura**
  (`styles.css:1798`): la clase de v525 no se repite ahí.
- 🟢 **Los modales, calculados y descartados.** `.mdbg` centra con `padding:20px` y `.md` topa en
  `max-height:90vh` → el borde superior cae en **0,05 × alto** (42,6 px en un iPhone de 852) y el
  `.mdtitle` arranca 24 px más abajo, en **66,6 px**: por debajo de la línea de 59. Lo comprobé
  además para 812 y 956 px de alto. No hay hallazgo aquí.
- 🟢 **El guiado en modo overlay está muerto, así que `.gm-topbar` sin área segura no es un
  defecto.** `openGuidedMode` se borró en v350 y `openGuidedEmbedded` es el único camino
  (`app-6-extra.js:286-306`), que quita el `position:fixed` con la clase `gm-embedded`. Lo iba a
  reportar y lo tumbé.
- 🟢 **Manifest intacto** (`display:standalone` + `display_override`, `theme_color`/
  `background_color` `#06090A`, `scope`/`id`, `orientation:portrait`, y los **4 íconos separando
  `any` de `maskable`**), metas de Apple en su sitio (`black-translucent`, que es justamente lo que
  hace necesario el `env()` de v525), y `shortcuts`.
- 🟢 **Dos hallazgos de julio SÍ se cerraron:** (H5) `daily-notifs` ya excluye al coach
  —`supabase/functions/daily-notifs/index.ts:272`, `.neq("client_id","_coach")`— y (H6) **el
  endpoint compartido entre `_coach` y un asesorado ya no existe**: la consulta de endpoints
  duplicados devuelve **una sola fila y es de un único `client_id`** (H2 de este informe).

---

## Lo que NO alcancé a revisar

- **Nada se confirmó en un teléfono físico.** Sigue sin poder verificarse: el zoom de iOS en sí, el
  recorte del ícono maskable en el lanzador de Android, la barra de estado tomando el `theme_color`,
  el teclado tapando el compositor, el push de iOS con pantalla bloqueada y que la TWA abra sin la
  barra de Chrome. Todo lo que reporto es geometría, CSS resuelto o datos de producción.
- **`#workout-finish` y `#data-ob` los abrí VACÍOS.** El overlay se abrió (lo afirmé), pero su
  cuerpo lo pinta el JS y en mi montaje no tenía contenido, así que el barrido **no prueba nada
  sobre ellos** — es exactamente el «harness que recorre superficies vacías» del `CLAUDE.md`, y lo
  digo en vez de contarlo como cobertura.
- **El panel del coach en móvil solo por el `.sidebar`.** No entré con la cuenta de coach: la
  `.coach-topbar` (`styles.css:204`) declara el área segura y ahí se queda mi verificación. Sus 6
  paneles, sus 26 modales llenos y el chat `#coach-chat` con hilo real quedan sin barrer.
- **No corrí `_repro-safearea-volver.mjs` ni `_medir-chat-asesorado.mjs`** — los leí y monté mi
  propia sonda para poder ampliar el barrido a las 6 pestañas y a los overlays sin tocar el repo
  (soy read-only). Que esos dos sigan verdes en su forma actual no lo verifiqué yo.
- **Sin medir:** el ciclo de vida real (que el sistema mate la pestaña a mitad de entreno), el giro
  de pantalla en pestaña, los `shortcuts` del manifest (`?go=hoy`/`?go=progreso`/`?go=mensajes`), el
  manejo de `?avi-chat=` desde `notificationclick`, y el hit-testing de la píldora «Instalar app»
  sobre las cajas de escritura NUEVAS de Comunidad (el compositor del muro y el comentario por
  post) — que sigue siendo la sospecha que julio dejó abierta y que H1 vuelve a rozar.
- **`Uncaught SyntaxError: Unexpected end of input`** sigue apareciendo (v421, v436, v448, v470,
  v479, v507) sin nombre de archivo. Sigue oliendo a extensión del navegador y sigue gastando cuota
  de telemetría; no lo perseguí.
