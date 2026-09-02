# A3 · Móvil y dispositivo — auditoría de área, 1-sep-2026

## Veredicto en una frase
La app está bien defendida contra las trampas de iOS que ya se conocían (timers por timestamp
absoluto, `vibrate`/`wakeLock` con feature-detect, `100dvh`, service worker con revalidación por
ETag) — pero tiene un agujero nuevo y serio en el corazón de la experiencia: **marcar una serie
durante el entreno no tiene ningún seguro contra un `localStorage` que falle**, y lo reproduje: con
esa falla puesta, tocar «✓ Completar serie» no hace absolutamente nada — sin aviso, sin avance, sin
temporizador. A eso se suma que el descanso normal entre series (el temporizador que más se usa de
toda la app) no pide mantener la pantalla encendida, y que en TODO el flujo de entreno no hay una
sola señal de si lo que se guardó ya llegó a la nube o sigue pendiente.

## Los 3 más grandes

1. 🔴 **Marcar una serie puede congelarse en silencio, y lo reproduje.** `setLog`/`setDone`
   (`app-4-entreno.js:1628` y `:1631`) son la ÚNICA vía por la que un peso o una serie entran al
   historial — así lo dice el propio comentario de `setLog` en la línea 1626 — y ninguna de las
   dos tiene `try/catch` alrededor de `localStorage.setItem`. Las llama `gmActionBtn()`
   (`app-6-extra.js:1329`, el botón principal «✓ Completar serie») y `gmToggleSet()`
   (`app-6-extra.js:1367`, el toque manual en cualquier casilla) — **son las DOS únicas formas de
   marcar una serie en el guiado, que es el ÚNICO flujo de entreno desde v291.** Si `setItem`
   lanza (cupo lleno, un aparato viejo con años de sesiones acumuladas, Safari en modo privado en
   versiones que aún restringen el cupo, o una política de MDM que bloquea el almacenamiento), la
   excepción corta la función a la mitad: nunca llega al código que pinta el check ✓, avanza el
   paso, actualiza el progreso o arranca el descanso.
   - Evidencia: `app-4-entreno.js:1626-1631` (sin `try`, a diferencia de las otras ~150 escrituras
     a `localStorage` del repo, que casi todas sí lo llevan — la propia `sv()` de
     `app-1-infra.js:865` sí envuelve el `setItem` en `try/catch`); `app-6-extra.js:1329-1364`
     (`gmActionBtn`) y `:1367-1391` (`gmToggleSet`) muestran que TODO lo que pasa después de
     `setDone()` depende de que esa línea no reviente.
   - Intenté tumbarlo así: abrí el guiado real con una rutina real (cuenta QA, sellado de nube en
     localhost) y medí `GM.currentStep` antes/después de tocar «Completar serie». **Control**: sin
     tocar nada, el paso sube de 0 a 1 y el overlay de descanso se pinta (`restVisible:true`).
     **Sabotaje**: parcheé `Storage.prototype.setItem` para lanzar
     `QuotaExceededError` (la misma excepción que un cupo agotado) y volví a tocar el mismo botón:
     `GM.currentStep` se quedó en 1 (no avanzó) y `restVisible` quedó en `false` (no arrancó el
     temporizador) — la persona se queda mirando la pantalla sin ninguna señal de que algo falló.
   - Qué cuesta arreglarlo: envolver las dos funciones en `try/catch` (¿1 línea cada una?) + un
     mensaje («No pudimos guardar esta serie, intenta de nuevo») + medir cuánto pesa realmente el
     historial en un dispositivo viejo (el propio backup del coach ya mide y colorea su uso de
     `localStorage` en `app-4-entreno.js:3770-3786`, con el umbral rojo en 3.500 KB de ~5 MB — la
     misma cordura falta en el camino de escritura).

2. 🔴 **El descanso entre series —el temporizador más usado de la app— no mantiene la pantalla
   encendida.** `reqWake()` (Wake Lock API) solo se llama en tres sitios: el isométrico
   (`app-6-extra.js:1098`), el HIIT (`:1155`) y el cardio (`:1243`). El descanso NORMAL después de
   una serie de peso/repeticiones —`gmRest`→`gmShowRest`, `app-6-extra.js:1482-1541`, que se
   dispara después de CADA serie de la inmensa mayoría de los ejercicios del catálogo— nunca la
   pide. Verifiqué con `grep -rn "reqWake(" app-*.js` que solo hay esos 3 llamados en todo el
   repo, y ninguno cae en la ruta de `gmRest`/`gmShowRest`/`openGuidedEmbedded`.
   - Evidencia: `app-6-extra.js:1491` (`gmShowRest`, sin `reqWake`), contra `:1098`/`:1155`/`:1243`
     (los tres únicos que sí la piden).
   - Intenté tumbarlo así: confirmé por código que no hay ninguna otra llamada a `reqWake` en la
     cadena `openGuidedEmbedded→gmRebuild→gmRest→gmShowRest` ni en `prepareTodaySession`; no hay
     forma de que el descanso normal adquiera el wake lock por otra vía.
   - Por qué importa en un teléfono real: el propio código ya sabe que sin pantalla encendida el
     pitido/vibración de aviso puede no llegar a tiempo (comentario en `app-4-entreno.js:3687-3694`
     explica el patrón de timestamp absoluto justamente para este caso), pero eso protege el
     NÚMERO, no la EXPERIENCIA — si la pantalla se apaga a mitad del descanso de 60-90 s (el
     timeout de pantalla por defecto de muchos Android ronda ese rango), la persona no ve ni oye
     que terminó, porque el aviso solo suena/vibra cuando la app vuelve a estar visible.
   - Qué cuesta arreglarlo: mover `reqWake()`/`relWake()` a la entrada/salida de
     `openGuidedEmbedded`/`closeGuidedMode` (una sola adquisición para toda la sesión, en vez de
     tres puntos sueltos) — y de paso cerrar el hueco hermano: ningún `visibilitychange` vuelve a
     pedir el wake lock si el sistema lo liberó al pasar a segundo plano (el spec lo libera solo,
     y ninguno de los 3 sitios que sí lo piden lo re-adquiere al volver — confirmado con
     `grep -n visibilitychange app-*.js`, sin ningún listener que llame a `reqWake`).

3. 🔴 **En todo el flujo de entreno no hay UNA sola señal de "esto no se ha subido todavía" —
   confirma la hipótesis abierta sobre Claudia.** `_persistAuthUser` (`app-1-infra.js:912-959`)
   guarda siempre en local primero (seguro) y reintenta a la nube con `sv()`/`svNow()`; si la
   subida falla marca `_udFailedKeys[k]=true` y `_setAuthDirty(true)` — pero el `catch` solo hace
   `warn(...)` a la consola (`app-1-infra.js:955`). Recorrí el entreno completo (marcar series,
   terminar, ver "Hoy") y el único lugar de TODA la app con un aviso de estado offline/pendiente es
   la pestaña de Comunidad (`CMTY.offline` → `_cmtyStaleBanner()`, `app-7-community.js:393`) — el
   entreno no tiene nada parecido.
   - Evidencia: `grep -n "navigator.onLine" app-*.js` solo devuelve 2 líneas, las dos del login
     (`app-2-login.js:319` y `:333`, el arreglo de v563); ningún archivo de entreno/salud lo usa.
     `grep` de "offline"/"sin conexión"/"sin señal" con salida a `toast`/`innerHTML`/`render` en
     todo el repo tampoco encuentra nada fuera de Comunidad.
   - Intenté tumbarlo así: confirmé leyendo `gmActionBtn`→`saveSessionToHistory`→`sv('ax_hist',…)`
     que la cadena entera de "terminar el entreno" no lee ni pinta `_authDirty`/`_udFailedKeys` en
     ningún punto — es puramente decorativo para quien mira el código, invisible para quien mira
     la pantalla.
   - Esto no es "se pierde el dato" (el mérito real que sí tiene la app: `mergeAuthRow`,
     `avi-core.js:2111`, fusiona por unión —nunca reemplaza— el historial/PRs/mensajes/peso al
     reabrir con red después de haber entrenado sin ella, cerrando la ventana "Android mató la app
     antes de reconectar"). Es "no se entera": la persona termina su entreno sin red, ve la misma
     pantalla de "¡Buen trabajo!" que vería con red perfecta, y no hay ningún indicio de que su
     sesión quedó pendiente hasta que la app vuelva a abrir con señal.
   - Qué cuesta arreglarlo: un chip/badge chico ("Guardado en tu teléfono, se sube cuando haya
     señal") condicionado a `_authDirty` — reusar el patrón que ya existe en Comunidad en vez de
     inventar uno nuevo.

## Todos los hallazgos

4. 🟡 **En iPhone sin la PWA instalada, la tarjeta de activar notificaciones desaparece en
   silencio — y solo 1 de 9 suscripciones de push activas en producción es de Apple.**
   `renderPushNudge` (`app-1-infra.js:390-407`) corta con `el.innerHTML=''` si
   `!('PushManager' in window)` (línea 393) — que es exactamente el estado de Safari en una
   pestaña normal de iOS (Apple solo expone `PushManager` a una PWA instalada en pantalla de
   inicio). No hay ningún texto que diga "para activar tus recordatorios, primero instala AVI":
   los 3 bloques de instrucciones de instalación (`index.html:186-188`) hablan de "acceder sin
   navegador, como una app real", nunca mencionan notificaciones como motivo para instalar.
   - Evidencia SQL (solo `SELECT`, proyecto `eoebhrxbokyllqalyecj`):
     `select client_id, bool_or(subscription->>'endpoint' like '%web.push.apple.com%') apple,
     bool_or(subscription->>'endpoint' like '%fcm.googleapis.com%') fcm from push_subscriptions
     group by client_id` → de 9 client_id reales con alguna suscripción, **8 son
     `fcm.googleapis.com` (Android/Chrome) y solo 1 es `web.push.apple.com`** — el único caso
     Apple ya tuvo que instalar la PWA para lograrlo.
   - Intenté tumbarlo así: confirmé que Android/Chrome SÍ expone `PushManager` en pestaña normal
     (por eso el 8/9 de arriba), así que el efecto es específico de iOS y no un problema general de
     "sin instalar no hay push" — en Android la tarjeta de activar SÍ aparece sin instalar nada.
   - Esto es una pieza del "60% inalcanzable" ya medido en la línea base (no lo repito), vista
     desde el aparato: parte de esa cifra no es indiferencia de la persona, es que en iPhone la app
     nunca le ofrece el camino.
   - Qué cuesta arreglarlo: en `renderPushNudge`, si `isIOS && !isStandalone`, pintar un aviso que
     enlace a las instrucciones de instalación en vez de vaciar el contenedor. Costo bajo (una
     rama nueva reusando `_pushDeniedHowto`/el bloque `install-hint-ios` que ya existe).

5. 🟡 **Al reconectar EN CALIENTE (sin reabrir la app), la subida de lo pendiente NO se fusiona con
   lo que haya en la nube — a diferencia de la fusión que sí ocurre al reabrir.** `_flushAuthOnline`
   (`app-3-coach.js:442-456`) se dispara con el evento `online` y sube
   `_snapshotAuthRow()` (lo que hay en memoria en ESTE dispositivo) con un `upsertOwn` directo,
   SIN leer primero lo que haya en la nube en ese momento — a diferencia de `_enterAuthSession`
   (`app-3-coach.js:582-589`), que si arranca con red y el flag `dirty` puesto, SÍ hace
   `mergeAuthRow(cached, row)` antes de resubir.
   - Evidencia: `app-3-coach.js:444-448` construye `patch` desde `_snapshotAuthRow()` únicamente y
     llama `UD.upsertOwn(patch)` sin ningún `mergeAuthRow` de por medio; compárese con
     `app-3-coach.js:583-589`, que sí lo hace.
   - Intenté tumbarlo así: no lo reproduje contra producción (habría exigido escribir en dos
     sesiones simultáneas de una cuenta real, que las reglas de esta auditoría prohíben) — queda
     como hallazgo de código, no medido en vivo. La ventana de exposición es angosta: exige perder
     red A MITAD DE SESIÓN (no arrancar sin ella) y que la reconexión ocurra SIN cerrar/reabrir la
     app, y hoy no hay evidencia de que la app se use en más de un aparato por persona.
   - Qué cuesta arreglarlo: que `_flushAuthOnline` llame `UD.loadOwn()` primero y pase el resultado
     por `mergeAuthRow` antes de subir — mismo patrón que ya existe en el arranque, aplicado
     también aquí.

6. 🟢 **Sano, con número:** los 6 temporizadores del guiado (descanso, HIIT, cardio, isométrico) SÍ
   siguen la doctrina de timestamp absoluto (`endAt`/`phaseEnd` recalculado cada tick contra
   `Date.now()`, nunca por conteo de ticks) — verificado línea por línea en
   `app-6-extra.js:1113-1541` y `app-4-entreno.js:3687-3694`. Ninguno de los 8 usos de
   `setInterval` del repo (`grep -n setInterval app-*.js`) es un contador ingenuo.

7. 🟢 **Sano, con número:** `navigator.vibrate` (que Safari iOS nunca implementa) está
   feature-detected en las **13 de 13** llamadas del repo (`if(navigator.vibrate)…`); la Wake
   Lock API está feature-detected con `'wakeLock' in navigator` en su única definición
   (`app-4-entreno.js:1873`). Cero riesgo de excepción por API ausente en iOS en estos dos puntos.

8. 🟢 **Sano, con número:** la banda nueva de v564 (`renderLapsedBand`/`renderGraceBand`,
   `app-4-entreno.js:1349-1383`) cabe a 360px sin desborde. Medí con Chrome headless a 360×740,
   con sesión real y `cloudWriteSealed` (nada sale de la máquina): recorrí la cadena de PADRES de
   `.gband` (no solo `document.documentElement`, que es donde ya se ha escondido desborde antes)
   buscando `scrollWidth > clientWidth` — **0 elementos con desborde**, con `data-fs="xl"` (letra
   grande) también en 0. Lo mismo para la banda de renovación (v540). No hay hallazgo aquí, pero
   quedó medido, no supuesto.

9. 🟢 **Sano:** `100vh` en el repo (3 usos: `.screen`, `.sidebar`, `#app`) va SIEMPRE seguido de
   `100dvh` como sobre-escritura — el patrón correcto contra el bug de la barra de Safari en iOS.
   `viewport-fit=cover` + `<meta viewport>` presentes (`index.html:5`).

10. 🟢 **Sano, con número:** el service worker (`sw.js`) usa network-first con
    `cache:'no-cache'` para JS/CSS, lo que en teoría re-descarga el bundle en cada apertura — pero
    medí contra producción que GitHub Pages responde con `ETag` y que una segunda petición con
    `If-None-Match` da **HTTP 304** (0 bytes de cuerpo), así que en la práctica una vuelta con la
    misma versión cuesta solo el round-trip de cabeceras, no los ~600 KB de `avi-core.js`. Los
    `typeof X==='function'` guardas que protegen contra un módulo cacheado desfasado (la clase de
    bug que reventó 3 veces en Android real, según CLAUDE.md) siguen presentes en las llamadas que
    revisé (`renderLapsedBand`/`renderGraceBand` en `app-4-entreno.js:1369`, por ejemplo) — no
    audité los cientos de puntos uno por uno, ver «Qué NO miré».

11. 🟡 **Peso del shell completo (primera instalación / caché fría): ~1 MB comprimido.** Medí con
    `curl` contra producción (`Accept-Encoding: gzip, br`) el `Content-Length` real de cada
    archivo del `SHELL` del SW más íconos: HTML+CSS+9 JS = **783.345 bytes** + `foods.json`
    (11.113) + `manifest.json` (656) + los 2 íconos PNG (30.708 + 183.687) = **~1.009.509 bytes
    (~986 KB)** antes de que exista cualquier caché. En un Android de gama media con señal débil
    de gimnasio (el escenario que describe mi propio rol), esto puede tomar varios segundos de
    solo transferencia antes de la primera pintura útil. No es un defecto — es el costo de una
    app sin build/framework servida como 9 archivos JS — pero es una cifra que no estaba medida
    para ESTE repo (el 1,9 MB de la auditoría de agosto era de `avi-web`, otro proyecto).

## Sospechas sin medir

- **El backup del coach mide su propio uso de `localStorage` contra un techo de 5 MB
  (`app-4-entreno.js:3770-3786`) y lo pinta en rojo por encima de 3.500 KB** — sugiere que el
  equipo YA sospecha que el cupo se puede acercar en la práctica (el coach acumula `log_`/`done_`
  de todos sus asesorados y rutinas en el mismo origen). No medí el uso REAL de ningún dispositivo
  de producción (no tengo acceso al `localStorage` de un teléfono real), así que no puedo decir
  qué tan cerca está nadie hoy del cupo — solo que el hallazgo #1 (sin `try/catch`) deja de ser
  hipotético en el momento en que alguien lo alcance.
- **Wake Lock re-adquirido al volver de segundo plano**: documenté que ninguno de los 3 sitios que
  sí piden `reqWake()` lo vuelve a pedir en `visibilitychange` (el spec lo libera automáticamente
  al ocultar la pestaña/app). No medí el impacto real porque no tengo forma de simular
  "background→foreground" de un WebView Android/iOS real fuera de Chrome headless (que no libera
  wake locks al minimizar del mismo modo que un SO móvil).
- **Duplicados de `push_subscriptions` post-v535**: la línea base dice "12 filas / 10 client_id →
  2 duplicados vivos". Con la consulta de este informe (agrupada) veo 2 client_id con 2 filas cada
  uno (2 endpoints FCM distintos cada uno) — consistente con "dos aparatos reales", no con el bug
  ya cerrado de v535 (mismo endpoint duplicado). No profundicé más porque no es mi hallazgo — ya
  está triado en la línea base.

## Qué NO miré y por qué

- **Ningún dispositivo real (Android ni iPhone).** Todo lo de este informe sale de lectura de
  código + Chrome headless con emulación de viewport/user-agent, que reproduce geometría y APIs
  disponibles pero NO reproduce: throttling real de `setInterval` en segundo plano de iOS,
  comportamiento real del teclado virtual empujando el layout, gestos de vuelta atrás nativos,
  ni si Safari realmente lanza `QuotaExceededError` en modo privado en su versión actual (el
  comportamiento cambió entre versiones de iOS — lo que reproduje es la CONSECUENCIA en el código
  si `setItem` llegara a lanzar, no que hoy lo haga en un iPhone real).
- **Entrega real de push** (que el mensaje llegue al teléfono, con la pantalla bloqueada, en
  Android real e iOS real). Solo miré el código del lado del cliente y la tabla de suscripciones.
- **TWA/Play Store** (assetlinks, empaquetado, ícono maskable) — es territorio de Samuel/A-área
  Android nativo y el roadmap dice "Play Store: retirado"; no vi motivo para reabrirlo.
- **El resto de los ~150 usos de `localStorage.setItem` del repo, uno por uno** — solo confirmé que
  la gran mayoría SÍ tiene `try/catch` y aislé por lectura de contexto los que no lo tenían
  visible en la misma línea; no verifiqué cada uno de los ~39 restantes contra un `try` en líneas
  anteriores (varios sí están dentro de un bloque `try{}` de nivel superior, como `_pendingWizard`
  o el flujo de restauración de backup) — prioricé los dos (`setLog`/`setDone`) que están en la
  ruta más caliente de la app por ser LA función de guardar cada serie.
- **Medición de tiempo-hasta-interactivo real (Lighthouse/WebPageTest)** — reporté el PESO
  transferido (medible con `curl`, verificable), no un tiempo de carga cronometrado, porque no
  tengo forma de simular de forma confiable un enlace 3G/4G débil real desde esta máquina.
- **Nota de higiene del árbol:** a mitad de esta auditoría `git status` mostró `avi-core.js`
  modificado por un proceso externo (otra sesión de auditoría corriendo en paralelo sobre el mismo
  repo, mutando `GEN_EXCL_IDS`/`GEN_ZONE_EXCL` — coincide con el patrón ya documentado en
  CLAUDE.md de que una matriz de sabotaje muta el archivo mientras corre). No lo toqué ni lo
  revertí — no es un cambio mío y restaurarlo a mitad de la corrida de otra sesión habría sido
  peor que dejarlo. No escribí nada en el repo salvo este mismo archivo.
