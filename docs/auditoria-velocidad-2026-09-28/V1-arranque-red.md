# V1 — Arranque y red (16.ª ronda, «peso y velocidad», 28-sep-2026)

Medido con scripts propios (solo lectura) contra `https://app.avientrena.com/`, CDP (Chrome
headless), y con la cuenta QA (`qa-harness@apex.com` asesorado, `qa-coach@apex.com` coach) para
los dos casos de sesión iniciada. Scripts nuevos, todos en `scripts/e2e/`:
`_r16-v1-splash-cpu4-4g.mjs`, `_r16-v1-timer-control.mjs`, `_r16-v1-sesion-cliente.mjs`,
`_r16-v1-sesion-coach.mjs`, `_r16-v1-bytes-primera-visita.mjs`.

## Resumen en 5 líneas (para el PO)

1. **Casi dos tercios de lo que se descarga la primera vez que alguien abre AVI (1,8 de 2,9 MB) no
   es la app: es un video de fondo de 1,4 MB y tres fotos decorativas** de la pantalla de login —
   pesan más que TODO el código junto (1 MB). Es lo primero que carga un teléfono nuevo, y compite
   por el ancho de banda con lo que sí hace falta para entrar.
2. **Los ~4,4 s que tarda la app en quedar lista, en CUALQUIER visita, no son la nube: son un
   temporizador fijo de 2,8-3,2 s escrito en el código** para que alcance a leerse «AVI» en la
   pantalla de carga. Se paga CADA VEZ que se abre la app, con o sin sesión.
3. En un teléfono con señal mala (4G lenta) instalando la app **por primera vez**, medí que puede
   terminar de bajar todo (2,9 MB, cero errores) y aun así **quedarse sin arrancar de verdad**: lo
   que la persona ve a los ~15 s no es la app lista, es una pantalla de emergencia que se enciende
   sola y no pasa por el arranque real (sin tema, sin el guardia del botón atrás, sin el registro
   del Service Worker de esa visita).
4. **El caso de todos los días —abrir con la sesión ya guardada— funciona bien**: 0 KB por la red
   (todo sale del Service Worker), plan del día visible en ~6,2 s. La única espera que le queda es
   el mismo temporizador fijo del punto 2.
5. **La propuesta más barata y de menor riesgo: acortar el temporizador fijo.** Ahorro medido con
   método explícito: **~2.000-2.400 ms en cada apertura, para las ~20 personas que usan AVI cada
   día.** Segunda propuesta, más grande: diferir el video de fondo fuera del camino crítico.

---

## Hallazgos

### 🔴 H1 — El «tiempo de arranque» que más pesa es un `setTimeout` fijo, no la nube

**Qué siente la persona:** cada vez que abre AVI —tenga sesión guardada o no— hay una espera de
varios segundos que no depende de su conexión ni de su teléfono: es fija.

**Medición:** código, `app-1-infra.js:1751-1752` (dentro de `syncFromCloud()`, de la que cuelga
TODO el arranque — `syncFromCloud().then(async()=>{ initTheme(); initPWA(); ... })`,
`app-2-login.js:1250`):

```js
const hasSession = !!ld('ax_session', null);
await new Promise(r=>setTimeout(r, hasSession ? 2800 : 3200));
```

No hay ninguna llamada de red dentro de `syncFromCloud()` — el propio comentario del archivo lo
dice: *«los datos reales bajan por UD (user_data) al restaurar la sesión auth, justo después de
este boot local»*. El comentario que justifica el temporizador (línea 1748-1749) es honesto sobre
su propósito: *«Mantener la pantalla de carga unos segundos para que se vea la marca y se lea el
mensaje (antes se quitaba en 100-350ms y no daba tiempo)»*.

- **Perfil:** los tres del baseline, y confirmado también CON sesión iniciada — medido
  independientemente en H3 (5.160-5.217 ms totales, de los cuales 2.800 ms son este temporizador).
- **A quién afecta:** a TODOS, en TODAS las visitas — las ~20 personas que abren AVI cada día. Del
  baseline: **173-752 ms de CPU real en tareas** contra **2.800-3.200 ms de esta sola espera** — de
  los 4.420 ms de la 2.ª visita en escritorio (sin sesión), este temporizador es **~68-72%** del
  total.
- **Causa:** `app-1-infra.js:1751-1752`.
- **Cómo reproducirlo:** `node scripts/e2e/_medir-arranque.mjs` ya lo mide sin saberlo — su columna
  «arranque terminado» de la 2.ª visita menos el tiempo de CPU es casi enteramente este `await`.
- **Propuesta:** bajar el mínimo de 2.800/3.200 ms a ~700-900 ms. El logo se pinta en el primer
  frame del splash; 900 ms de exposición sigue siendo suficiente para leer «AVI · Entrenamiento con
  nombre propio» y ver la barra de progreso moverse, contra los 2.800-3.200 ms actuales.
  **Ahorro estimado (método explícito: viejo_mínimo − nuevo_mínimo):** bajar a 800 ms ahorra
  **2.000 ms (sin sesión) a 2.400 ms (con sesión), en CADA apertura de la app**.
  **Riesgo: BAJO.** No toca ninguna promesa de "abrir sin datos" (offline-first): el temporizador
  es puramente cosmético, no espera ningún dato ni ninguna respuesta. El único costo es que la
  marca se ve menos tiempo en pantalla — decisión de producto, no técnica. Verificar en un celular
  real que el texto siga siendo legible con el tiempo nuevo antes de fijar el número definitivo.

---

### 🔴 H2 — El registro de un asesorado nuevo pesa 1,8 MB en video y fotos decorativas — más que todo el código junto

**Qué siente la persona:** quien instala AVI por primera vez —el momento más sensible a la señal,
porque nunca hay nada en caché— baja 2,9 MB antes de poder usar la app, y **casi dos tercios de eso
(1.822 KB de 2.918 KB) es un video de fondo y fotos del coach para la pantalla de login**, no
código ni datos suyos.

**Medición:** `scripts/e2e/_r16-v1-bytes-primera-visita.mjs`, primera visita, red normal (sin
throttle, para medir bytes limpio), contra producción:

| categoría | KB | qué es |
|---|---|---|
| código propio (JS/CSS/HTML) | 1.018 | los 9 scripts + `avi-core.js` + `styles.css` + `index.html` |
| **video + fotos del login** | **1.822** | `media/hero-montage.mp4` (**1.418 KB**), `media/brand/hero.jpg` (142), `media/brand/coach-camilo.jpg` (141), `media/loading-bg.jpg` (121) |
| fuentes de Google | 47 | Plus Jakarta Sans + Anton (2 archivos `.woff2` bajaron en esta corrida) |
| íconos/manifest | 31 | `icon-192.png` + `manifest.json` |
| **TOTAL** | **2.918** | coincide con el baseline |

`index.html:181` declara el video: `<video class="cin-vid" autoplay muted loop playsinline
preload="metadata" poster="media/brand/hero.jpg" src="media/hero-montage.mp4">`. El `autoplay`
anula el ahorro del `preload="metadata"`: Chrome empieza a bajar el archivo completo apenas se
puede reproducir, no solo sus metadatos. `media/loading-bg.jpg` es el fondo CSS de la propia
pantalla de carga (`styles.css:1473`, `#avi-loading{background:...url('media/loading-bg.jpg')...}`)
y **no está en el `SHELL` que el Service Worker precachea** (`sw.js:15-20`), así que en una
instalación nueva se pide siempre por red, compitiendo por ancho de banda con el código.

- **A quién afecta:** a cualquiera que instala AVI por primera vez, especialmente con datos
  móviles o WiFi lento del gimnasio — el perfil típico de un asesorado nuevo.
- **Causa:** `index.html:181` (el `<video autoplay>`), `styles.css:1473` (el fondo del splash).
- **Cómo reproducirlo:** `node scripts/e2e/_r16-v1-bytes-primera-visita.mjs`.
- **Propuesta:** quitar `autoplay` del video (dejarlo con `preload="none"`, que arranque a un toque
  o tras el primer paint) y/o reemplazarlo por una versión comprimida (un video de fondo con loop
  no necesita 1,4 MB — el mismo contenido a menor bitrate/resolución puede bajar de 200-400 KB sin
  perder la sensación cinematográfica). El `poster` (`hero.jpg`, 142 KB) ya cubre el primer
  instante visual sin el video.
  **Ahorro estimado (método explícito: bytes del video − bytes de un poster estático que ya se
  descarga igual):** quitar el `autoplay` ahorra los **1.418 KB del video** en la ruta crítica de
  la primera visita (el `poster` de 142 KB ya se baja de todos modos) — sobre 1,6 Mbps eso son
  **~7 s de descarga** que dejan de competir con el código.
  **Riesgo: BAJO.** Es un cambio puramente visual (la pantalla de bienvenida), no toca lógica de
  negocio ni datos. Se verifica con el PO si el video en loop es parte de la decisión de marca —
  si lo es, la vía barata es SOLO comprimirlo (mismo efecto, una fracción del peso).

---

### 🔴 H3 — En 4G lenta y primera instalación, lo que la persona ve a los ~15 s puede NO ser la app arrancada

**Medición (con 5 controles):** `scripts/e2e/_r16-v1-splash-cpu4-4g.mjs`, CDP contra
`https://app.avientrena.com/`, perfil Chrome **nuevo** (primera visita real), CPU×4 + red
«4G lenta» (1,6 Mbps↓, 150 ms RTT — el mismo perfil del baseline). Corrida 4 veces (topes de 26 s,
50 s, 60 s y 100 s) con el mismo resultado:

| medido | valor |
|---|---|
| bytes totales bajados | 2.918-2.919 KB (igual al baseline) |
| peticiones de red pendientes al terminar | **0** |
| peticiones fallidas | **0** |
| excepciones JS sin capturar | **0** (con `window.AVI_DEBUG=true` forzado ANTES de cualquier script, para oír hasta los `warn()` que en producción son mudos) |
| `document.readyState` | `complete` desde ~t=17-22 s |
| `window._aviUpdateBusy` (arranque real terminado) | **nunca aparece**, ni a los 100 s |
| pantalla de login visible | sí, desde ~t=15 s |

**Los 5 controles que separan «probeta rota» de «defecto real»:**
1. El MISMO perfil pero **solo con el freno de red** (sin CPU×4) → tampoco llega a
   `_aviUpdateBusy`. Descarta que sea cosa del CPU.
2. El MISMO perfil pero **solo con CPU×4** (sin freno de red) → llega a `_aviUpdateBusy` en
   **6.789 ms**, igual al baseline (6.282 ms). Confirma que **es específico de la red emulada**.
3. Un control PURO de CDP, sin una sola línea de AVI (`_r16-v1-timer-control.mjs`): un
   `setTimeout(fn,3200)` en una página en blanco, bajo el MISMO throttle de red, dispara a los
   **3.208 ms**. Descarta que la emulación de red de Chrome rompa temporizadores en general.
4. **Llamar `syncFromCloud()` a mano, otra vez, en la misma pestaña, a los ~30 s** (con el motor ya
   «quieto») → **SÍ termina, en 3.300 ms**, lo esperado. La función en sí funciona bien bajo esas
   condiciones; lo que no ocurre es que la primera invocación (la real, al final de
   `app-2-login.js`) dispare su propio `.then()`.
5. **Segunda visita bajo el MISMO throttle, en el MISMO Chrome (sin perfil nuevo)** → arranca bien,
   en **6.300 ms**. El defecto es específico de la PRIMERA visita, en frío, bajo red lenta.

**Lo que esto significa:** un asesorado que instala AVI por primera vez con mala señal ve, a los
~12-15 s reales, una pantalla de login que **parece normal y probablemente deja tocar «Iniciar
sesión»** — pero es la «red de última instancia» del arranque (`index.html:154-176`, gotcha v534),
que se enciende sola a los 12 s SIN pasar por `initPWA()`/`initTheme()`/`initTextSize()`/
`_aviInstallBack()` ni por el auto-login de una sesión guardada. Esa red revela el login porque
`typeof window.doLogin==='function'` ya es cierto (las funciones se declaran apenas el motor de
JS *empieza* a ejecutar `app-2-login.js`, no cuando termina) — sin que eso pruebe que el arranque
real haya avanzado. La persona pierde, sin saberlo, hasta que recargue: su tema, su tamaño de
letra, el auto-login de una sesión guardada, el registro del Service Worker de ESA visita, y el
guardia del botón atrás de Android.

- **A quién afecta:** a quien instala AVI por primera vez con señal mala — el perfil de un
  asesorado nuevo con datos móviles flojos o el WiFi del gimnasio saturado.
- **Causa:** no se pudo aislar el mecanismo exacto dentro del tiempo disponible (ver «Lo que
  tumbé» y «Qué NO miré»). Sí está probado: no es CPU, no son peticiones colgadas, no es una
  excepción, no es un bug genérico de los temporizadores de Chrome headless bajo throttle. Es algo
  específico de la combinación «primera visita + red lenta emulada» que impide que la cadena
  `syncFromCloud().then(...)` de la invocación ORIGINAL dispare su callback — aunque la misma
  función, invocada de nuevo a mano, sí completa con normalidad.
- **Propuesta (con la causa exacta sin cerrar):** la red de última instancia de `index.html` ya
  hace lo correcto dado que algo se cuelga — revela una pantalla usable en vez de un splash
  eterno. Lo que falta es que, si el arranque real nunca llega, esa misma red de seguridad
  reintente `initPWA()`/`initTheme()` de forma independiente (hoy solo hace
  `showScreen('s-login')`), para no perder tema/back-guard/SW aunque la cadena original se pierda.
  **No se propone tocar código a ciegas sin cerrar el mecanismo primero** — el riesgo de un parche
  sin diagnóstico completo es alto.

---

### 🟢 H4 — El caso de todos los días (sesión ya guardada) funciona bien: 0 KB, ~6,2 s hasta el plan visible

**Medición:** `scripts/e2e/_r16-v1-sesion-cliente.mjs`. Login ÚNICO con la cuenta QA de asesorado
(`qa-harness@apex.com`), luego un RELOAD (no un segundo login) con CDP, que es el caso real: el
teléfono ya tiene el token guardado y reabre la app.

| medido | valor |
|---|---|
| pantalla pintada | 6.231 ms |
| identidad del cliente cargada (`CUR.clientId`) | 6.231 ms |
| arranque terminado (`_aviUpdateBusy`) | 5.217 ms |
| bytes por la red en el reload | **0 KB** (24 peticiones, las 24 servidas de caché) |

Es el falso positivo ya conocido del briefing («2.ª visita con 0 KB por la red: es el Service
Worker funcionando») — aquí confirmado también para el caso CON sesión: el reload entero se sirve
del Service Worker y de la sesión guardada en `localStorage`, sin una sola llamada de red visible
en la ventana medida. Lo único que queda pesando es el mismo temporizador fijo de H1 (2.800 ms de
los 5.217 ms totales = **54%**).

- **A quién afecta:** a las ~20 personas en su uso diario — y aquí el resultado es BUENO: la
  promesa offline-first se cumple.
- **No se propone nada aquí** más que lo que ya cubre H1.

---

### 🟡 H5 — El coach: la lista de asesorados se carga en memoria a 1 s; el peso real por asesorado no se pudo medir con la cuenta QA

**Medición:** `scripts/e2e/_r16-v1-sesion-coach.mjs`. Login ÚNICO con la cuenta QA de coach
(`qa-coach@apex.com`, que tiene **2 asesorados de prueba**), reload:

| medido | valor |
|---|---|
| pantalla pintada / arranque terminado | 5.160 ms |
| clientes cargados en `DB.clients` | **1.017 ms** (antes de que termine el resto del boot) |
| peticiones a `user_data` (REST) en el reload | 2 (la fila propia del coach + `loadCoachClients`) |
| bytes de esas 2 peticiones | **0 KB medibles** (cuenta QA con 2 filas de prueba, casi vacías) |

`UD.loadCoachClients()` (`app-1-infra.js:607-616`) pide explícitamente
`user_id,coach_id,role,profile,routines,history,msgs,bodyweight,updated_at` — es decir, **SÍ**
baja el historial completo (hasta 365 sesiones) y los mensajes de CADA asesorado al arrancar, pero
**NO** baja fotos, PRs, medidas ni nutrición (esas son carga perezosa, `loadClientHeavy`, solo al
abrir la ficha de una persona). Esto se ejecuta dentro de `_enterCoachAuth()`
(`app-3-coach.js:1239`, `await _loadCoachClientsIntoDB()`) **antes** de mostrar la pantalla —
bloquea el primer paint del panel.

- ⏳ **No se pudo medir el peso REAL** de esta consulta para un coach con ~20 asesorados activos
  (como el de producción) porque las HARD RULES de esta ronda exigen usar solo la cuenta QA, y
  esa cuenta solo tiene 2 filas de prueba casi vacías (0 KB medibles). El baseline del 28-sep ya
  reportó, desde el respaldo diario (no desde una petición en vivo): mediana de un asesorado 63 KB,
  los más pesados 191/178/175 KB, la fila propia del coach 533 KB, y «todas las fichas juntas:
  2.427 KB» — pero esa cifra del respaldo incluye TODAS las columnas (fotos/PRs/medidas/nutrición
  también), que `loadCoachClients` NO pide. El peso real de esta consulta puntual es, por
  construcción, menor que 2.427 KB, pero no se puede dar un número exacto sin verlo en vivo contra
  una cuenta con datos reales — que esta ronda no autoriza a usar.
- **A quién afecta:** al coach, en cada apertura de su panel — hoy solo él (Camilo).
- **Propuesta:** ninguna todavía — falta el dato. Si en una próxima ronda se autoriza medir contra
  el coach real (con su consentimiento, solo lectura, sin tocar nada), la pregunta concreta es:
  ¿cuántos KB pesan `history`+`msgs` de sus ~20 asesorados juntos, sin fotos/PRs/medidas/nutrición?
  Si el número es alto, la vía barata ya existe en el propio código: `history` es la parte más
  pesada de una fila (224 de 533 KB en la fila del propio coach) y podría paginarse o recortarse a
  las últimas N sesiones en esta consulta puntual, dejando el historial completo para cuando se
  abre la ficha.

---

## Lo que tumbé (hipótesis que no se sostuvieron)

1. **"El arranque espera a la red de Supabase" (hipótesis del orquestador, del baseline).** Es
   FALSO como explicación principal: `syncFromCloud()` no hace ninguna llamada de red — es un
   `await new Promise(setTimeout(...))` puro. La demora de ~4,4 s en un escritorio rápido es casi
   toda ese temporizador (H1), no la nube.
2. **"El defecto de CPU×4+4G-lenta es cosa del CPU throttle."** Falso: con CPU×4 solo (sin
   throttle de red) el arranque termina en 6.789 ms, normal. El defecto aparece SOLO con el
   throttle de red activo (H3).
3. **"Es un bug genérico de los temporizadores de Chrome headless bajo emulación de red."** Falso:
   un `setTimeout` puro, sin ninguna línea de AVI, dispara normal (3.208 ms) bajo el mismo
   throttle (control `_r16-v1-timer-control.mjs`).
4. **"Se quedó esperando una petición de red que nunca llegó."** Falso: 0 peticiones pendientes,
   0 fallidas, red completamente descargada (2.918 KB, igual que una corrida sana) mucho antes de
   que se cumplieran los 100 s de espera.
5. **"El doble-fetch del Service Worker explica el salto de 1.031 KB (código) a 2.918 KB
   (primera visita)."** Parcialmente falso: el desglose real por tipo de recurso (H2) muestra que
   la diferencia NO es principalmente un doble-fetch de los mismos archivos de código — es, en su
   mayoría (1.822 de 1.900 KB extra), media pesado (video + fotos) que ni siquiera estaba en la
   cuenta de «código» del baseline.

---

## Qué NO miré

- El mecanismo EXACTO de H3 (por qué la promesa original del arranque queda huérfana en la
  primera visita bajo red lenta) — cerrado como reproducible con 5 controles, no como explicado
  del todo. Ningún teléfono real en el banco de pruebas para confirmar si esto pasa igual fuera de
  Chrome headless.
- El peso REAL de `loadCoachClients()` contra una cuenta con datos reales (H5) — la cuenta QA de
  coach solo tiene 2 filas de prueba casi vacías; las HARD RULES de esta ronda no permiten usar
  la cuenta real del coach ni de ningún asesorado.
- Si el video de fondo (H2) también se pide de nuevo en visitas posteriores o si el Service Worker
  lo cachea oportunistamente tras el primer éxito — no medido si el costo de 1,4 MB es solo de la
  primera visita o se repite.
- Cualquier cosa de V2 (pantallas y memoria durante el uso) y V3 (código muerto) — fuera de
  alcance de esta área; V2 ya entregó su informe (`V2-pantallas-memoria.md`).
- El caso iPhone/Safari (ningún dispositivo iOS en el banco).
- El listado completo de qué precachea o no el Service Worker más allá de lo revisado para H2
  (por ejemplo, si `app-7-community.js` —que no está en el `SHELL`— se pide aparte en cada
  primera visita, y cuánto pesa eso).
