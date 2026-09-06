# B2 · La app instalada: service worker, actualización y empaquetado — Marcela Ríos (ingeniera de PWA y distribución)

## Veredicto en una frase
Los 12 errores de "Service Worker no actualiza" no dejaron a nadie atrapado semanas con una
versión vieja de AVI (el diseño ya cubre esto: red primero, no caché primero) — pero los 3
"archivo cortado" sí delatan un hueco real en `sw.js` (nunca comprueba que lo descargado llegó
completo antes de guardarlo en caché), y esa tabla de errores no la ha visto nadie nunca porque
la app no tiene ninguna pantalla que la muestre — hay que hacer SQL a mano para enterarse, como
hice yo hoy.

## Los 3 más grandes

### 1 · 🟡 El Service Worker falla al actualizarse, pero NO deja a nadie con la app vieja — hoy
**Qué es.** 12 de los 15 errores de producción son `Failed to update a ServiceWorker for scope
(.../apex-app/)`, repartidos en 5 personas reales (incluido el propio Andrés Martínez, el coach)
entre el 13-ago y el 3-sep, en 10 builds distintos.

**Evidencia.**
- SQL (`app_errors`, ids 34-46): los 5 `uid` afectados son `0a6484ed…` (Andrés, el coach),
  `73c3452a…` (Valery), `c52b90af…` (Astrid Beltrán — 6 veces, la más repetida), `31bf6d19…`
  (Samuel Cifuentes) y `efcab7b2…` (Claudia Valbuena). Los 5 con `ctx.standalone:true` — app
  instalada, no pestaña de navegador.
- Crucé esos 5 `uid` contra `user_data.profile->'dev'` (el latido de versión de v541,
  `avi-core.js:4689`, que cada teléfono escribe al abrir la app): **hoy los 5 están entre v556 y
  v572**, contra la v573 real en producción — ninguno quedó congelado en v481 ni en ninguna de
  las versiones donde falló. Astrid, la de más fallos (6 en 3 semanas), está en v570.
- `sw.js:74-88`: el manejador de fetch para los JS/CSS de la app es **network-first con
  `cache:'no-cache'`** — pide siempre a la red primero, sin importar si el propio Service Worker
  logró auto-actualizarse. Es decir: aunque el registro del SW se quede en una versión vieja, el
  contenido que la persona ve sigue viniendo fresco de la red en cada carga (documentado así
  desde antes de estos incidentes, ver comentario en esa misma línea).

**Cómo intenté tumbarlo.** La hipótesis del brief era "gente atrapada con una versión de hace
semanas, hablándole a una base de datos que ya cambió". Si eso fuera cierto, el latido `dev`
de esas 5 personas debería mostrar una versión vieja HOY. No es el caso: los 5 están al día o a
1-3 versiones de diferencia — el patrón real es que el registro del SW falla una vez, y se
recupera solo en el siguiente intento (cada 20 min, o al abrir la app, `app-6-extra.js:76`).

**Qué SÍ es real y queda sin resolver.** Mientras el registro no se actualiza con éxito:
(a) el evento `activate` (que borra cachés viejos, `sw.js:31-39`) tampoco corre → cachés
huérfanas se acumulan en el teléfono sin límite; (b) el fallo se reporta como **promesa NO
capturada** — `_checkUpdate` en `app-6-extra.js:76` hace `try{ reg.update(); }catch(_e){}`, pero
`reg.update()` es asíncrono: el `try/catch` síncrono no atrapa nada, y el rechazo se escapa como
`unhandledrejection` (por eso `kind:"promise"` en las 12 filas). Es ruido rutinario de red
tratado como si fuera un error de la app.

**Qué cuesta arreglar.** Una línea: `reg.update().catch(()=>{})` en `app-6-extra.js:76` para dejar
de ensuciar `app_errors` con reintentos normales de red. Si se quiere conservar la señal por si
algún día SÍ se vuelve persistente, se loggea aparte bajo un `kind` propio en vez de mezclarlo con
errores reales.

### 2 · 🔴 `sw.js` cachea lo que llega, sin comprobar que llegó completo
**Qué es.** Los 3 `Uncaught SyntaxError: Unexpected end of input` (v470, v479, v507) son la firma
clásica de un archivo que se ejecutó a medias. `sw.js` tiene el defecto que lo explica: en NINGÚN
punto donde cachea una respuesta de red comprueba que la respuesta esté OK o completa antes de
guardarla.

**Evidencia (archivo:línea).**
- `sw.js:57-68` (navegación/HTML): `const net = await Promise.race([fetch(...), timeout])` →
  `const cl = net.clone(); caches.open(CACHE_NAME).then(ca => ca.put(e.request, cl)); return net;`
  — sin `if(net.ok)` antes de meterlo en caché.
- `sw.js:81-86` (JS/CSS de la app): mismo patrón, mismo hueco — `fetch(...).then(r => {
  const cl = r.clone(); caches.open(...).then(ca => ca.put(e.request, cl)); return r; })`.
- Reconstruí el campo `src` de las 3 filas de `app_errors` contra el código de captura
  (`app-1-infra.js:199`: `src = e.filename ? String(e.filename).split('/').pop()+':'+lineno+':'+
  colno : ''`). El id 32 trae `?avi-chat=78fe5c7c-...:4:87`; los ids 33 y 39 traen solo `:4:87`
  (sin nada antes de los dos puntos). Eso solo puede pasar si `e.filename` era **la URL de la
  propia página** (con o sin el query `?avi-chat=<uuid>` que arma `sw.js:128` cuando la app se
  abre desde un push) — no un archivo `.js` externo. El navegador atribuyó el error de sintaxis
  al DOCUMENTO, no a ningún script cargado con `<script src>`.

**Cómo intenté tumbarlo.** Mi primera hipótesis fue que el corte caía dentro del script de
captura de `beforeinstallprompt` (`index.html:11-15`, las primeras líneas de `<head>`), porque el
error reporta "línea 4". La comprobé contra el `index.html` real de esos mismos despliegues:
`git show d9e7b4a:index.html` (v470) y `git show 49f75a9:index.html` (v507) — en los dos, la
línea 4 es `<meta charset="UTF-8">`, no código. **Esa hipótesis específica queda descartada.**
Lo que NO pude tumbar es que el documento llegara truncado: un flujo de red cortado a mitad
puede desordenar la numeración de línea que reporta el motor (el navegador intenta interpretar
lo que alcanzó a llegar). No tengo forma de reproducir el corte exacto sin un teléfono real con
conexión inestable — así que el MECANISMO preciso queda como sospecha razonable, pero el DEFECTO
DE CÓDIGO (cachear sin validar `r.ok`/integridad) es un hecho verificable con solo leer `sw.js`,
sea o no la causa exacta de estos 3 casos puntuales.

**Qué cuesta arreglar.** Añadir `if(!net.ok) return net;` (o equivalente) antes de cada
`cache.put()`, en los dos sitios. Barato, no toca lógica de negocio ni la estrategia de caché.
Mientras no esté, cualquier respuesta parcial (una caída de red a media descarga, o un 5xx
transitorio de GitHub Pages durante la propagación de un deploy) puede quedar guardada como si
fuera el archivo bueno — y ahí sí hay riesgo real de servir algo roto **incluso sin red**, porque
el fallback offline es precisamente ese caché envenenado.

### 3 · 🟡 La tabla de errores no tiene ninguna pantalla — por eso nadie la había mirado
**Qué es.** `app_errors` existe desde v282, se llena sola (12 filas de SW + 3 de sintaxis en 6
semanas), y no hay ni un botón, ni una ficha, ni un panel en toda la app que la lea. Confirmado
por `grep` de `app_errors` en los 7 módulos `app-*.js` + `index.html`: las únicas apariciones son
la que ESCRIBE (`app-1-infra.js:192`) y dos comentarios que la mencionan — cero lecturas.

**Por qué importa para B2.** Es la razón concreta de que la pista caliente de este encargo
("nadie los ha mirado nunca") sea cierta: no es negligencia puntual, es que la única forma de
verlos es una consulta SQL directa a Supabase — exactamente lo que tuve que hacer yo. Un defecto
de actualización del SW que sí se vuelva persistente algún día (a diferencia de los 12 de hoy)
pasaría igual de inadvertido indefinidamente.

**Cómo intenté tumbarlo.** Busqué también en `docs/` y en los agentes por si existe un dashboard
externo o un script que sí la lea periódicamente (`scripts/`) — no encontré ninguno. Es
consistente con que el propio brief describa el hallazgo como algo que "nadie ha mirado nunca".

**Qué cuesta arreglar.** No es una feature grande: un conteo simple en el Inicio del coach
("N avisos técnicos sin revisar en los últimos 7 días", con severidad agrupada por `kind`)
bastaría para que esto deje de depender de que alguien haga una auditoría para enterarse. Fuera
de mi mandato de solo-lectura de hoy — lo dejo como hallazgo, no lo construyo.

## Todos los hallazgos

| Severidad | Qué | Dónde | ¿Hay víctima hoy? |
|---|---|---|---|
| 🟡 | 12 fallos de `registration.update()` en 5 personas reales, incl. el coach | `app-6-extra.js:76`, `app_errors` | No confirmada — las 5 personas están hoy en v556-v572 (latido `profile.dev`), casi al día |
| 🔴 | `cache.put()` sin comprobar `response.ok`/integridad, en navegación y en JS/CSS | `sw.js:57-68`, `sw.js:81-86` | Probable — coincide con la firma de los 3 `SyntaxError`, pero no reproducido en vivo |
| 🟡 | `app_errors` no tiene ninguna pantalla que la muestre | toda la app (ausencia confirmada por grep) | Sí, en el sentido de que 15 avisos llevan hasta 6 semanas sin que nadie los vea |
| 🟡 | `reg.update()` rechaza como promesa sin `.catch()` → ensucia la telemetría con ruido de red rutinario | `app-6-extra.js:76` | No — es un problema de SEÑAL, no de funcionamiento |
| 🟢 | `app-7-community.js` no está en el array `SHELL` que se precachea al instalar (los otros 7 módulos sí) | `sw.js:9-14` | No — igual se cachea en la primera carga en línea, porque se pide siempre vía `<script src>` (`index.html:1335`) y cae en el patrón network-first de `sw.js:78` |
| 🟢 | `exImgTag` no tiene `onerror` en el `<img>` de la foto de ejercicio | `app-1-infra.js:1425` | No verificada — solo importa si la imagen falta Y no hay red para reintentar; gotcha ya conocido de v502 sobre el mismo helper |
| 🟡 (sin verificar, heredado de A3) | La huella del certificado en `assetlinks.json` puede no coincidir con la de Play App Signing (si el paquete se sube a Play Store real) | `.well-known/assetlinks.json` | No hoy — la app no está en Play Store todavía |

## Lo que verifiqué y está SANO (con números)
- **`assetlinks.json` sirve 200 en las dos rutas que Android necesita**: `curl` en vivo a
  `https://kronos-apex.github.io/.well-known/assetlinks.json` → 200, y a
  `.../apex-app/.well-known/assetlinks.json` → 200, mismo `package_name`
  (`io.github.kronos_apex.twa`) y huella SHA-256. Consistente con lo que ya midió A3 el 31-jul.
- **Los 4 íconos del manifest miden exactamente lo que declaran**: verificado leyendo la cabecera
  PNG de cada archivo — `icon-192.png` 192×192, `icon-512.png` 512×512, `maskable-192.png`
  192×192, `maskable-512.png` 512×512. Las 3 capturas del diálogo de instalación también miden
  1080×1990 tal como las declara `manifest.json` (confirmado v559).
- **El ciclo de actualización del SW no interrumpe un entreno en curso**: `skipWaiting` NUNCA es
  automático (`sw.js:15-23`); la página decide cuándo aplicar la versión nueva
  (`_aviUpdateBusy`, `app-6-extra.js:39-49`), mirando timer vivo, reorden sin confirmar, modal
  abierto, campo con foco, pantalla de cierre y tour de novedades — historial documentado de v324
  (recarga forzada, causaba pérdida de entrenos) a v538 (se agregó el reorden sin confirmar).
- **El arranque tiene una red de última instancia FUERA de los módulos**: `index.html:108-140`
  (inline, v534) quita el splash a los 12 s pase lo que pase y ofrece "Reintentar" con mensaje
  honesto — no depende de que `app-2-login.js` haya cargado, así que un módulo roto no deja a
  nadie mirando una pantalla muda para siempre.
- **El peso de arranque es razonable**: el shell precacheado (`SHELL` de `sw.js`, 11 archivos)
  pesa **2,6 MB en disco** (`index.html` 156K + `styles.css` 204K + los 7 `app-*.js` + `avi-core.js`
  620K + `foods.json` 48K + 2 íconos). Las imágenes/videos de ejercicio (`media/exercises`: 399
  jpg + 36 mp4, **115 MB en total**) NO están en el shell — se cargan bajo demanda, con
  `loading="lazy"` en el `<img>` (`app-1-infra.js:1425`) y la biblioteca pagina de a 30 ejercicios
  (v405), así que abrir la app nunca descarga los 115 MB de una sola vez. Tamaño promedio real:
  jpg 252 KB (máx. 1,17 MB), mp4 420 KB (máx. 0,82 MB).
- **`manifest.json` coincide con lo que la app promete**: `scope`/`start_url` = `/apex-app/`
  (igual al `scope` de registro del SW en `app-6-extra.js:59`), `display: standalone` +
  `display_override` con `minimal-ui` de respaldo, `id` fijo, 3 atajos (`shortcuts`) que apuntan a
  rutas reales de la app (`?go=hoy/progreso/mensajes`).
- **`?v=573` es el mismo en TODAS las referencias**: los 8 módulos JS + `styles.css` en
  `index.html` usan `?v=573`, igual al `CACHE_NAME` (`avi-v573`) de `sw.js` — el check 10 del
  hook que exige esto sigue cumpliéndose.

## Sospechas sin medir
- **El mecanismo exacto del corte en los 3 `SyntaxError` no está probado, solo el defecto de
  código que lo permite.** Necesitaría un teléfono real con conexión inestable (o un proxy que
  simule cortes de red a mitad de respuesta) para confirmar que es `sw.js` cacheando una
  respuesta parcial y no otra cosa (p. ej. un problema del propio Chrome/WebView en Android 10
  con streams clonados — hay reportes de ese patrón en versiones viejas de Chromium).
- **La ventana de propagación de GitHub Pages como gatillo de los 12 fallos de `update()`.** El
  patrón (mismo error, siempre cerca de un deploy reciente, se autorresuelve en el siguiente
  intento) encaja con el gotcha ya documentado en CLAUDE.md ("el paso deploy de Pages falla flaky
  a veces" + `max-age=600`), pero no crucé las 12 fechas contra los timestamps exactos de cada
  deploy para confirmarlo — es una correlación razonable, no una prueba.
- **Sesgo de superviviente**: solo veo a las 5 personas que SÍ generaron un error. No puedo saber
  si hay más gente con el mismo problema de red que simplemente no coincidió con el `update()`
  fallando en un momento reportable, o si hay alguien que quedó atrás en una versión vieja SIN
  jamás lanzar el error (por ejemplo, si su navegador deja de intentar `update()` del todo).
- **La huella del certificado de `assetlinks.json` frente a Play App Signing.** Sigue sin
  verificarse (mismo límite que dejó A3 el 31-jul): si el paquete se sube a Play Store con firma
  gestionada por Google, la huella que debe figurar ahí es la de la clave de firma de Google, no
  la de la clave de subida local — no tengo acceso a Play Console para confirmar cuál es cuál.

## Qué NO miré y por qué
- **Ningún dispositivo Android ni iPhone real.** Todo el análisis es lectura de código +
  historial de git + SQL de solo lectura contra producción. No pude reproducir en vivo el corte
  de red que explicaría los 3 `SyntaxError`, ni confirmar cómo se comporta el diálogo de
  instalación o la ausencia de barra de URL en una TWA real instalada — eso ya lo dejó pendiente
  A3 el 31-jul y sigue pendiente.
- **Keystore / firma de Play App Signing.** Busqué en `Desktop/AVI/` y en `~/.avi/` cualquier
  rastro de `.keystore`, `.jks`, `.aab` o notas de firma — no encontré nada en esta máquina. Si
  existen (A3 los daba por existentes citando "signing-key-info.txt"), están en otro equipo o en
  la Play Console, fuera de mi alcance hoy.
- **Correlación exacta fecha-a-fecha entre los 12 fallos de `update()` y los timestamps de cada
  deploy a GitHub Pages.** Habría requerido cruzar contra el historial de Actions/deploys, que no
  consulté por presupuesto — quedó como sospecha razonable, no como hecho medido.
- **El resto de la superficie de push** (entrega real, payload, suscripciones) — es mandato de
  B1, no de B2; no lo dupliqué.
