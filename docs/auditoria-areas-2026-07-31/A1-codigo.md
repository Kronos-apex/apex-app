# Auditoría: CÓDIGO Y DEUDA TÉCNICA — Camila Restrepo, Lead Engineer

## Veredicto en 5 líneas
El código está más sano de lo que temía: suite 488/488 verde, `avi-core` con 161 de 184 exports
tocados por tests, y el arranque tiene red de seguridad. **Barrí la clase completa del bug de v416
y queda UN caso vivo, no diez** (`initPWA()`, app-2:1022) — el resto del camino de arranque ya está
protegido. El hallazgo grande no es de arranque sino de PERSISTENCIA: **el COACH no tiene ninguna
red de seguridad offline** — su escritura fallida se pierde en silencio, nadie la reintenta y el
próximo arranque la borra; el asesorado tiene cuatro redes para lo mismo. Lo agrava que `warn()` es
un **no-op en producción**: ~42 `catch` de fallo de red no dejan rastro en ningún lado, ni consola
ni telemetría. Y una corrección: **la telemetría SÍ identifica al usuario** (está en `ctx.uid`, no
en la columna `uid`) — el radar del proyecto dice lo contrario y es falso.

---

## Hallazgos verificados

### H1 · 🟠 `initPWA()` es la ÚNICA llamada del arranque a un módulo posterior sin guarda — y si cae, el usuario aparece deslogueado

- **Qué pasa:** el arranque real de la app es `syncFromCloud().then(async ()=>{ ... })`
  (`app-2-login.js:1018`). La cuarta línea de ese bloque llama `initPWA()`, que vive en
  **`app-6-extra.js`** — un módulo que carga DESPUÉS. Si app-6 no llegó (red del gimnasio,
  deploy a medias, respuesta truncada), esa línea lanza `ReferenceError`, el `.catch()` del final
  atrapa y hace `showScreen('s-login')`. **Todo lo que viene después de la línea 1022 no corre:
  `_aviInstallBack()`, la restauración de la sesión Supabase (`_enterAuthSession`) y
  `tryAutoLogin()`.** El usuario abre la app y ve el login como si nunca hubiera entrado.

- **Dónde:** `app-2-login.js:1022` (`initPWA();`), definición única en `app-6-extra.js:7`.

- **Evidencia:**
  1. Barrí las 10 fuentes cruzando "quién define cada global" contra "quién la llama", filtrando
     a las llamadas hacia un módulo que carga después Y dentro del camino de arranque
     (`syncFromCloud`, `tryAutoLogin`, `_enterAuthSession`, `initCoach`, `doLogin`, y el `.then()`
     del boot). Resultado, con el guard acreditado:
     ```
     ok(try)     app-1-infra.js:1053  syncFromCloud() → migrateExTypes()  [app-4]
     ok(try)     app-1-infra.js:1054  syncFromCloud() → migrateEnv()      [app-4]
     ok(typeof)  app-1-infra.js:1068  syncFromCloud() → migratePhotosToStorage() [app-5]  ← el fix de v416
     >> SIN GUARDA  app-2-login.js:1022  initPWA() [app-6]
     ```
  2. `grep -n "initPWA" *.js` → sólo dos apariciones: la llamada (app-2:1022) y la definición
     (app-6:7). No hay alias en `window` ni segunda definición.
  3. El mecanismo NO es hipotético: `app_errors` en producción trae
     `Uncaught ReferenceError: migratePhotosToStorage is not defined` **3 veces** (24, 26 y 27 de
     julio; builds v375/v393/v403; todas Android). Es el mismo módulo-no-cargó, un módulo más allá.
  4. La convención existe y está aplicada en el gemelo del coach: `app-3-coach.js:498` hace
     `if(typeof restoreNotifications==='function')restoreNotifications();` dentro de un `try`.

- **Intenté tumbarlo así:**
  - *¿Lo tapa el `.catch()`?* Lo atrapa, sí, pero el `.catch()` no restaura nada: hace
    `showScreen('s-login')` y ya. Atrapar aquí es peor que en v416 (allí el `setTimeout` sólo
    perdía la migración de fotos; aquí se pierde la sesión entera).
  - *¿Habrá una guarda más arriba?* No: las tres líneas anteriores (`initTheme`, `initTextSize`,
    `initRememberMe`) son de app-1/app-2, y ninguna envuelve el bloque en un `try`.
  - *¿app-6 está precacheado, así que nunca falta?* Sí está en el `SHELL` del SW — pero también lo
    está app-5, y app-5 falló tres veces igual (ver H4: el SW cachea respuestas NO-OK).
  - *¿Y si `initPWA` está en el HTML inline?* No: `grep` sobre `index.html` da cero.

- **A quién le pasa:** a cualquier asesorado en Android con señal irregular. Síntoma que él reporta:
  «me sacó de la app / me pide entrar otra vez». Encaja con el pendiente abierto del PO sobre
  usuarios que «no ven su cuenta» y con el 8-nunca-entrenaron: una app que te devuelve al login el
  día 1 no la vuelves a abrir.

- **Costo del arreglo:** una línea, idéntica al fix de v416:
  `if(typeof initPWA==='function') initPWA();`. Y **el test de v416 no lo caza**: está
  hard-codeado a un nombre de función y un archivo (`avi.test.js:4638-4645`, busca la línea que
  contenga `migratePhotosToStorage()` en `app-1-infra.js`). Convertirlo en un check de CLASE —
  «ninguna llamada del camino de arranque apunta a un módulo posterior sin guarda» — es ~20 líneas
  y mata la familia entera. Es un gate que hoy no puede fallar para los hermanos.

---

### H2 · 🔴 El COACH no tiene red de seguridad offline: su escritura fallida se pierde en silencio y el próximo arranque la borra

- **Qué pasa:** cuando el coach cambia algo de un asesorado (asignar rutina, registrar un pago,
  escribir un mensaje, activar Premium), `sv()` → `_persistCoachWrite()` → `UD.updateClientRow()`.
  Si esa escritura falla (sin señal en el gym), el `catch` **sólo llama `warn()`**: no marca
  `_setAuthDirty`, no anota `_udFailedKeys`, no encola nada y no avisa al coach. Nada la reintenta
  al reconectar, porque `_flushAuthOnline()` **excluye explícitamente al coach**. Y en el siguiente
  arranque, `_loadCoachClientsIntoDB()` reemplaza `DB.clients` con lo que trae la nube → el cambio
  desaparece. El coach lo vio aplicado en su pantalla; el asesorado nunca lo recibe; nadie se entera.

- **Dónde:**
  - `app-1-infra.js:958-980` — `_persistCoachWrite`, los dos `catch`:
    `catch(e){ warn('AVI coach persist ax_c falló:',id,e&&e.message); }`
  - `app-3-coach.js:357` — `if(!AUTH_MODE||AUTH_ROLE==='coach'||!_authDirty)return;`
  - `app-3-coach.js` — `_loadCoachClientsIntoDB()` → `_hydrateCoachFromRows(rows)`.

- **Evidencia (asimetría medida entre los dos caminos de escritura):**

  | | asesorado (`_persistAuthUser`, app-1:908-940) | coach (`_persistCoachWrite`, app-1:958-980) |
  |---|---|---|
  | marca la clave fallida | `_udFailedKeys[k]=true` ✅ | ✗ |
  | marca la fila sucia | `_setAuthDirty(true)` ✅ | ✗ |
  | respaldo local siempre | `_refreshAuthCache()` ✅ | ✗ |
  | reintento al reconectar | `_flushAuthOnline` ✅ | **excluido por el `AUTH_ROLE==='coach'` del `return`** |
  | fusión en el próximo arranque | `mergeAuthRow(cached,row)` ✅ | ✗ (`_hydrateCoachFromRows` pisa) |
  | el usuario se entera | — | ✗ (`warn` no existe en prod, ver H3) |

  El propio código documenta la red del asesorado (comentario en app-1:928-931: *«Sin red
  (entrenando en el parque): el dato NO se pierde…»*). El coach no tiene ninguna de las cinco.

- **Intenté tumbarlo así:**
  - *¿Lo cubre `flushPendingSync()`?* No: llama a `sbSet()`, que corta en la primera línea con
    `if(AUTH_MODE){return;}` (app-1:986). El coach está en AUTH_MODE desde el cutover v2.0.
  - *¿Lo cubre `_flushPendingClients()` (el listener `online` de app-3:642)?* No: esa cola es sólo
    para **provisionar altas** de cuentas nuevas (#8), no para ediciones de filas existentes.
  - *¿Reintenta solo dentro de la sesión?* **Parcialmente, y eso sí lo salva a veces:**
    `_coachSnap[sk]` sólo se actualiza tras un `await` exitoso, así que el SIGUIENTE `sv()` de la
    misma clave vuelve a detectar la diferencia y reintenta todos los clientes cambiados. Pero
    `_coachSnap` es memoria: si el coach hace un cambio y cierra la app (o no vuelve a guardar
    nada), no hay segundo intento. Esto baja la severidad de «siempre» a «cuando el cambio es el
    último de la sesión» — que es justo el caso típico: se le asigna la rutina y se cierra la app.
  - *¿Le sale al menos un toast?* El único toast de conectividad del coach es en la **carga**
    (`toast('📴 Sin conexión — mostrando tus asesorados guardados')`), no en la escritura.

- **A quién le pasa:** a Camilo, en su gimnasio, cada vez que la señal se cae mientras le arma la
  semana a alguien. Es la operación de más valor del producto (las 9 cuentas que él crea dan 156
  sesiones y 7 activos; las 13 autoregistradas dan 0). Un cambio perdido aquí se ve exactamente
  igual que un asesorado que «no abrió la app».

- **Costo del arreglo:** dos pasos, ninguno grande.
  (a) *Fix quirúrgico, ~10 líneas:* en los `catch` de `_persistCoachWrite` marcar una cola
  persistida por cliente (mismo patrón que `_udFailedKeys` + `_setAuthDirty`) y vaciarla desde el
  listener `online` que ya existe en app-3:642 — quitando el `AUTH_ROLE==='coach'` del corte de
  `_flushAuthOnline` o añadiendo su gemelo.
  (b) *Barato y de valor inmediato:* que el coach VEA que no subió (un toast, o el `sync-dot` que
  ya existe para el camino legacy). Hoy la interfaz le miente por omisión.

---

### H3 · 🟠 `warn()` es un no-op en producción: ~42 fallos de red/persistencia no dejan rastro en NINGÚN lado

- **Qué pasa:** `const warn = (...a) => window.AVI_DEBUG && console.warn(...a);` y
  `window.AVI_DEBUG = location.hostname==='localhost' || location.hostname==='127.0.0.1'`.
  En producción `AVI_DEBUG` es **false**, así que `warn()` no escribe ni en la consola. Todo
  `catch(e){ warn(...) }` es un `catch` vacío disfrazado. Y la telemetría (`_logAppError`) sólo
  está enganchada a `window.onerror` y `unhandledrejection` — es decir, **sólo ve lo NO atrapado**.
  Conclusión operativa: un error atrapado en AVI es invisible para todo el mundo, para siempre.

- **Dónde:** `app-1-infra.js:4-6` (definición) y `app-1-infra.js:166-179` (los dos únicos enganches
  de telemetría; el comentario dice explícitamente *«Sin capture: solo errores JS de runtime»*).

- **Evidencia:**
  - Conteo de `catch` que sólo llaman `warn`: app-1 **14**, app-3 **14**, app-4 **5**, app-5 **4**,
    app-6 **3**, app-2 **2** = **42**. Entre ellos los dos de H2 y toda la persistencia auth.
  - Además hay ~100 `catch(e){}` / `catch(_e){}` completamente vacíos.
  - Corroboración desde producción: en `app_errors` hay **18 filas en toda la historia de la app**,
    y las únicas útiles son excepciones NO atrapadas. Cero filas de «falló guardar».
  - Y encaja con el pendiente del PO: *«28% de los entrenos se abandonan a mitad y no se sabe por
    qué: falta instrumentación»*. La instrumentación existe (`_logAppError` con su limitador
    `errReportGate` ya probado: dedupe + 5/sesión + 20/día); lo que falta es enchufarla al `catch`.

- **Intenté tumbarlo así:** *¿Habrá un segundo canal (Sentry, un buffer local, el `sync-dot`)?*
  Grepeé: no hay ninguna otra vía. El `sync-dot` sólo lo enciende `sbSet()` (camino legacy, muerto
  en AUTH_MODE). *¿`AVI_DEBUG` se activa por query param en prod?* No, la expresión es sólo por
  hostname, sin `||` con nada más.

- **A quién le pasa:** a nosotros — no podemos diagnosticar nada de lo que le pasa a Camilo ni a
  sus 22 asesorados si no revienta ruidosamente. Es lo que hizo que el bug de v416 sobreviviera
  desde el 24 hasta el 30 de julio: se encontró leyendo `app_errors`, no un log.

- **Costo del arreglo:** ~3 líneas. Hacer que `warn()` (o un `warnReport()` nuevo usado en los
  `catch` de persistencia) llame a `_logAppError('warn', msg, src)`. El limitador ya está escrito y
  testeado, así que no hay riesgo de inundar la tabla. Empezaría sólo por los ~8 `catch` de
  persistencia y sync, no por los 42.

---

### H4 · 🟡 El Service Worker cachea respuestas NO-OK de los módulos JS — y `app-7-community.js` nunca entró al precache

- **Qué pasa:** dos defectos en `sw.js`, ambos de una línea.
  1. **`sw.js:79`** — para los módulos JS y `styles.css`:
     `fetch(e.request,{cache:'no-cache'}).then(r => { const cl=r.clone(); caches.open(CACHE_NAME).then(ca=>ca.put(e.request,cl)); return r; })`.
     **No comprueba `r.ok`.** `fetch` sólo rechaza por fallo de red: un **404 o un 5xx resuelve
     normalmente**, se devuelve al navegador (que intenta ejecutar HTML como JS → todas las
     funciones de ese módulo quedan indefinidas) **y además se GUARDA en el caché versionado**,
     donde queda como respaldo offline de esa versión hasta el próximo bump. Un fallo transitorio
     de 30 segundos (la ventana de swap de un deploy de GitHub Pages) se vuelve permanente.
     Contraste directo dentro del mismo archivo: **`sw.js:95`**, la rama de assets, SÍ hace
     `if(r.ok && url.origin===self.location.origin){ ... ca.put(...) }`.
  2. **`sw.js:10`** — el `SHELL` precacheado lista app-1…app-6 + core + mapas. **Falta
     `app-7-community.js`.** `git log` lo confirma: el SHELL se escribió en **v284** y app-7 nació
     en **v373** (`600f568`) — 44+ versiones de deriva sin que nada avise.

- **Evidencia:**
  - `grep -c "app-7" sw.js` → **0**.
  - Lectura directa de las dos ramas (79 vs 95): la comprobación `r.ok` está en una y no en la otra.
  - Que un 404 sea almacenable no es opinión: `Cache.put` sólo rechaza para `status 206` y para
    respuestas de tipo `error`/`opaqueredirect`; un 404 se guarda.
  - Mecanismo consistente con lo que hay en producción: `app_errors` trae
    `Uncaught SyntaxError: Unexpected end of input` **5 veces** (v310, v353, v383, v389, v410) —
    la firma de un script que llegó **truncado**, no de un error de lógica.

- **Intenté tumbarlo así:**
  - *¿La ausencia de app-7 rompe algo?* **No, y por eso lo dejo en 🟡**: los 4 sitios que llaman a
    app-7 desde otros módulos están todos guardados con `typeof`
    (`app-4-entreno.js:214, 770, 1053, 1885`). Degrada con gracia: la pestaña Comunidad no aparece
    en un primer arranque offline y se auto-cura al primer uso con red (la regla de fetch de
    `sw.js:75` sí matchea `app-7-community.js` y lo cachea on-demand).
  - *¿El `?v=` no protege del 404?* No: `?v=` es query, el archivo se llama igual; el 404 ocurre
    por estado del servidor, no por nombre.
  - *¿No lo salva el `.catch()` de la línea 82?* No: ese `.catch` sólo corre si el **fetch rechaza**
    (sin red). Con un 404 el fetch resuelve y el `.catch` no se ejecuta.

- **A quién le pasa:** a quien abra la app justo durante un deploy o con una conexión que corte a
  mitad de la descarga. Es el candidato más fuerte para explicar los `ReferenceError` de módulo
  ausente que sí están en la telemetría.

- **Costo del arreglo:** dos líneas. (a) envolver el `ca.put` de `sw.js:79` en `if(r.ok)`, igual que
  la línea 95; (b) añadir `'app-7-community.js'` al array de `SHELL`. El candado real (~15 líneas en
  el pre-commit, mismo espíritu que el check 10) es comparar los `<script src>` de `index.html`
  contra el `SHELL` de `sw.js` — así el próximo `app-8` no se queda fuera 44 versiones.

---

### H5 · 🟡 La telemetría SÍ identifica al usuario — el radar del proyecto afirma lo contrario y es FALSO

- **Qué pasa:** CLAUDE.md dice, en el bloque «AL RETOMAR» del 2026-07-30: *«`app_errors` deja
  insertar a `anon` y guarda `uid` NULL, así que la telemetría no identifica a nadie»*. Es falso.
  El cliente escribe el uid dentro del jsonb `ctx` (`app-1-infra.js:159-160`:
  `ctx:{ ..., uid:(typeof _authUid!=='undefined'&&_authUid)||null }`), no en la columna `uid`, que
  nadie llena. **14 de 18 filas traen uid.** El commit de v416 lo dio por perdido
  («*Tres personas distintas o la misma tres veces, no se puede saber*») cuando el dato estaba ahí.

- **Dónde:** columna `app_errors.ctx->>'uid'`; escritura en `app-1-infra.js:156-161`.

- **Evidencia (query y salida real, read-only):**
  ```sql
  select id, at::date, msg, build, ctx->>'uid' from app_errors order by at desc;
  ```
  ```
  24  2026-07-31  SW update failed        avi-v417  c52b90af-09c7-45d1-aa9a-e87cb30a3a33
  23  2026-07-30  SW update failed        avi-v416  31bf6d19-ec43-46e3-a7f8-5769bff5a5cd
  21  2026-07-29  SyntaxError end input   avi-v410  0a6484ed-42af-449d-9903-e440ac683ecf
  20  2026-07-27  migratePhotos undefined avi-v403  (null)   ← boot: _authUid aún no existe
  19  2026-07-27  _dia1 is not defined    avi-v403  0a6484ed-42af-449d-9903-e440ac683ecf
  ...
  ```
  Sólo quedan sin uid las 3 del arranque (donde `_authUid` todavía no está seteado) y la de iPhone
  de julio 6.

- **Intenté tumbarlo así:** *¿Serán uids basura o repetidos?* No: son 5 uuids distintos y estables,
  y uno de ellos (`0a6484ed…`) aparece en 4 errores separados en 3 semanas — perfectamente
  rastreable. *¿RLS impide leerlos?* No, la consulta corrió y devolvió.

- **A quién le pasa:** a nosotros: se está descartando la única señal que tenemos de usuarios
  reales. Y la nota falsa en CLAUDE.md le hará perder tiempo a la próxima sesión.

- **Costo del arreglo:** cero código para USARLO (la consulta de arriba). Corregir la línea del
  radar en CLAUDE.md: 1 línea. Opcional (1 línea en `app-1-infra.js:157`): mandar también `uid` a
  su columna, para poder indexar y unir contra `user_data` sin cavar en el jsonb.
  **Bonus ya utilizable:** los 3 errores de `migratePhotosToStorage` y los 5 `SyntaxError` vienen
  todos de UA `Android 10; K` en modo `standalone:true` — es decir, la PWA instalada en Android.
  Eso acota dónde buscar.

---

### H6 · 🟡 Dos harnesses que no pueden fallar (uno sondea 5 funciones borradas hace 123 versiones; el otro asegura una pantalla que quizá nunca montó)

- **Qué pasa:** el proyecto ya escribió tres veces la lección «un gate que no puede fallar no es un
  gate». Quedan dos casos vivos.
  1. **`scripts/_verify-timer.mjs`** llama `startClientRest()`, `restAdd15()`, `restPause()`,
     `skipRest()` y `_stopRest()` — **las cinco borradas el 2026-07-06 en F5b**. Cuatro de ellas sin
     guarda, dentro de un `Runtime.evaluate`: la primera lanza y se lleva por delante también la
     verificación del timer del GUIADO (sección 3), que sí está viva y es la que hoy usa la gente.
  2. **`scripts/e2e/_shot-design-audit.mjs:50`** hace
     `if(typeof showPanel==='function')showPanel('p-home')`. **`showPanel` no existe en ninguna
     parte del repo** (el navegador real usa `gp(...)`, como sí hace `_shot-coach.mjs:66`). El
     `typeof` lo convierte en un no-op silencioso, el IIFE devuelve `true` igual, y la aserción
     `A.ok(coachOK===true,'el panel del coach se monta')` **pasa siempre**, capturando lo que
     hubiera en pantalla.

- **Dónde:** `scripts/_verify-timer.mjs:96,99,102,106,109,132` · `scripts/e2e/_shot-design-audit.mjs:50`
  · funciones retiradas documentadas en `app-4-entreno.js:3100`.

- **Evidencia:** crucé todas las sondas `typeof X==='function'` y todas las llamadas de los 109
  scripts contra el mapa de definiciones de los 10 módulos. Salieron exactamente 4 nombres muertos:
  `restPause`, `restAdd15`, `_stopRest` (`_verify-timer`) y `showPanel` (`_shot-design-audit`).
  `grep -n "function startClientRest\|function skipRest" *.js` → **cero resultados**; sólo existe el
  comentario `// (_stopRest/startClientRest/restPause/restAdd15/skipRest … se RETIRARON en F5b
  2026-07-06 …)`.

- **Intenté tumbarlo así:**
  - *¿`_verify-timer` es un gate real?* **No, y eso lo baja a 🟡:** `scripts/_*` está en
    `.gitignore`, así que no está versionado, no lo corre el hook ni el CI, y no lo menciona ningún
    `.md`. Es scratch abandonado. Pero un archivo llamado «verify» que no puede correr es una trampa
    para la próxima sesión que quiera comprobar los timers.
  - *¿`_shot-design-audit` sí es gate?* **Sí, ese sí está versionado** (`scripts/e2e/`) y ya usa el
    módulo `_afirma`, o sea que se le pusieron dientes en F5 — pero se los pusieron a la aserción
    equivocada.
  - *Además, mismo archivo, defecto independiente:* su fixture usa fechas ABSOLUTAS
    (`dueDate:'2026-08-01' / '2026-07-14' / '2026-06-30'`), justo el gotcha que el proyecto escribió
    en v411. Hoy (31-jul) esos tres caen en «Por vencer» y dos «Vencido»; el estado «Al día» no se
    pinta, y en un mes los tres serán «Vencido». La captura de diseño va midiendo una app distinta
    cada semana.

- **A quién le pasa:** a la próxima sesión que confíe en esas dos verificaciones.

- **Costo del arreglo:** `_verify-timer.mjs` → borrarlo o recortarlo a la sección del guiado (30
  min). `_shot-design-audit.mjs` → cambiar `showPanel` por `gp` y afirmar un dato que sólo existe si
  `p-home` se pintó (una línea cada uno), y pasar las 3 fechas a relativas con el `_dk(±n)` que ya
  existe en `_fixture-12.mjs`.

---

### H7 · 🟡 Tres listas que TIENEN que coincidir y no hay ningún check que lo verifique

- **Qué pasa:** para que un ajuste del coach suba a la nube tiene que estar en las **tres**:
  `SB_KEYS` (portón de `sv()`), `_COACH_SETTINGS_KEYS` (ruta a la columna `coach_settings`) y el
  literal que arma `_coachSettingsObj()`. Faltar en una = el ajuste se guarda local y **no sube,
  en silencio**. Ya pasó (bug v321: `ax_msgreads` estaba en `_COACH_SETTINGS_KEYS` pero no en
  `SB_KEYS` → el «leído» del chat no sincronizaba). Hoy las tres están alineadas —
  `SB_KEYS` (17) ⊇ `_COACH_SETTINGS_KEYS` (7) = las 7 claves de `_coachSettingsObj()` — pero **la
  protección es una advertencia en prosa dentro de CLAUDE.md, no un gate.**

- **Dónde:** `app-1-infra.js:116` (`SB_KEYS`), `:122` (`_COACH_SETTINGS_KEYS`), `:129-130`
  (`_coachSettingsObj`).

- **Evidencia:** las tres listas leídas y comparadas a mano (coinciden hoy).
  `grep -n "_COACH_SETTINGS_KEYS" avi.test.js scripts/hooks/pre-commit` → **cero resultados**: ni la
  suite ni el hook las miran. El check 5 del hook sólo verifica que 10 claves críticas estén en
  `SB_KEYS`, nada del cruce entre listas.

- **Intenté tumbarlo así:** *¿Lo caza el harness de chat unificado?* `_verify-chatunified.mjs` no
  tiene aserciones duras (ni `process.exit(1)`, ni `throw`, ni `_afirma`), así que no. *¿Lo caza el
  check 4 de handlers?* No, es de otra cosa.

- **A quién le pasa:** al coach, la próxima vez que se añada un ajuste suyo. Es deuda latente, no
  daño actual — por eso 🟡.

- **Costo del arreglo:** ~6 líneas en `avi.test.js`, el mismo molde del test de paridad de
  `STREAK_MILESTONES` que ya existe: afirmar `_COACH_SETTINGS_KEYS ⊆ SB_KEYS` y que las claves de
  `_coachSettingsObj()` sean exactamente `_COACH_SETTINGS_KEYS`.

---

## Sospechas sin probar

1. **`Uncaught SyntaxError: Unexpected end of input`, 5 veces desde v310 hasta v410, `src=":4:87"`.**
   La firma huele a **script truncado** (encaja perfecto con H4). Pero no pude atribuirla: el
   `filename` que reporta el navegador termina en `/` o `#`, así que `String(e.filename).split('/').pop()`
   da vacío — es decir, un script **inline del documento**, no un `app-N.js`. Descarté el único
   `<script>` inline de AVI: `index.html` línea 4 es `<meta charset="UTF-8">`, de 22 caracteres —
   no hay columna 87. Candidatos que no pude descartar: un script inyectado por el navegador
   in-app de Android, o el bundle de `cdn.jsdelivr.net`. **Para probarlo faltaría:** guardar
   `e.filename` completo (hoy se recorta con `.split('/').pop()`) y `e.error.stack` en la
   telemetría — un cambio de una línea en `app-1-infra.js:170`.

2. **`localStorage` lleno durante un entreno = series perdidas en silencio.**
   `sv()`/`svNow()` hacen `try{localStorage.setItem(...)}catch(e){warn('localStorage full:',e)}`.
   Las claves de sesión (`log_`, `done_`, `session_id_`) NO están en `SB_KEYS`, así que su ÚNICO
   destino es localStorage: si la cuota se agota, cada serie que el usuario marca queda pintada en
   el DOM pero no persiste, y se pierde al recargar — sin un solo aviso (por H3). **No lo probé:**
   me faltó medir el tamaño real que ocupa un asesorado con 365 sesiones + fotos en base64 (el
   fallback que existe porque la subida a Storage está rota, ítem conocido del backlog) contra la
   cuota de 5-10 MB del WebView de Android. Se mediría con un harness que llene la cuota a propósito
   y luego intente registrar una serie.

3. **`_hydrateCoachFromRows` podría estar pisando ediciones del coach también en caliente**, no sólo
   al arrancar: `pollMessages` re-trae `ax_c` cada 15 s. El código tiene un guard (`app-1:653`:
   `const busy = editorOpen||CUR.todayWorking||CUR.todayDirty||_authDirty||CUR.todayOverride`), pero
   `_authDirty` **nunca se prende en el camino del coach** (es justo lo de H2), así que ese término
   del guard es inerte para él. No alcancé a construir el escenario que demuestre una pérdida real
   por esa vía; requiere un harness con dos escrituras concurrentes.

---

## Lo que revisé y está SANO

- **La suite: 488/488 verde** (`node avi.test.js`), corrida hoy. Y su cobertura de la lógica pura es
  buena de verdad: de los **184 exports de `avi-core.js`, 161 aparecen en `avi.test.js`**. Los 23 que
  no son constantes y etiquetas (`MUSCLE_GROUP_LABEL`, `STEPS_MAX`, `WATER_GLASS_ML`, `dayOrder`…),
  no funciones load-bearing. **No hay un agujero de cobertura en el motor**; el agujero está en el
  cableado DOM/sync, que ninguna suite de Node puede tocar — y ahí es donde salieron H1 y H2.
- **El camino de arranque, salvo H1.** Las otras 3 llamadas cruzadas del boot están protegidas:
  dos con `try/catch` en la misma línea (`migrateExTypes`, `migrateEnv`) y una con `typeof`
  (`migratePhotosToStorage`, el fix de v416). El `.then()` del boot tiene su `.catch()` de red de
  seguridad que garantiza que nadie se queda en el splash en blanco.
- **Handlers ligados en tiempo de parseo.** Reconstruí las sentencias de nivel superior de los 10
  módulos: **no queda ni un solo binding por-elemento en tiempo de parseo**. Todo es delegación en
  `document`/`window` o está detrás de `readyState==='loading' ? DOMContentLoaded : ejecutar`
  (`app-1:1689`, `app-4:3243`, la IIFE de `app-6:2225`). El único acceso directo al DOM al parsear,
  `buildFilterBtns('exf',exFilter)` (`app-4:3246`), apunta a `index.html:562` — **antes** del bloque
  de `<script>` (línea 1158), así que el elemento ya existe. El bug de v349 está cerrado como clase.
- **`let`/`const` de nivel superior compartidos entre archivos:** funcionan por diseño (los
  `<script>` clásicos comparten el entorno léxico global). Ningún módulo intenta leerlos como
  `window.X`, que es donde esto rompería.
- **El pre-commit (11 checks) y el CI están vivos y son el mismo script.** Verificado: `.github/workflows/ci.yml`
  corre `node avi.test.js` + `python3 scripts/hooks/pre-commit`, así que un `--no-verify` local no se
  escapa. El check 11 (baseline anti-borrado de tests) y el 10 (`?v=` vs `CACHE_NAME`) son de los
  buenos: cierran clases enteras de error humano.
- **La escritura del ASESORADO offline-first**, que era mi principal sospecha de entrada, es
  sólida: cuatro redes independientes (flag `_authDirty` persistido, respaldo local
  `_refreshAuthCache`, fusión `mergeAuthRow` al arrancar y reintento en el evento `online`) y la
  función de fusión es pura y está testeada. El problema es que **el coach no hereda nada de eso**.
- **El sello anti-escritura desde harness** (`cloudWriteSealed`) y `canCloudWrite()` (que bloquea
  `file://`) siguen en su sitio.
- Ni un secreto en el repo (check 7 del hook, verde) y las claves que sí viajan (anon key, VAPID
  pública) son públicas por diseño.

## Lo que NO alcancé a revisar

- **No corrí ningún harness E2E.** Todo lo de arriba es análisis estático + lectura del código +
  consultas de sólo lectura a producción. H1 y H4 quedarían clavados del todo con un harness que
  bloquee la descarga de `app-6-extra.js` (CDP `Network.setBlockedURLs`) y afirme que la app cae al
  login; H2, con uno que corte la red entre la edición del coach y el `upsert`. Los dos son ~1 hora
  cada uno y valen la pena antes de ejecutar los fixes.
- **No audité `app-4-entreno.js` (212 KB) ni `app-6-extra.js` (152 KB) por dentro** más allá de sus
  sentencias de nivel superior y sus llamadas cruzadas. El motor de entreno, el modo guiado y el
  generador de rutinas quedan sin barrer — el 28% de abandonos a mitad vive ahí y no lo toqué.
- **`app-7-community.js` (140 KB): sólo verifiqué su frontera** (que nadie lo llame sin guarda y que
  no esté en el precache). Su lógica interna no la miré.
- **Las 40 llamadas cruzadas restantes fuera del camino de arranque** (137 sitios sin guarda en
  total, de los cuales sólo revisé los del boot). Son seguras mientras todos los módulos carguen;
  no las clasifiqué una por una.
- **No revisé las Edge Functions ni el SQL** — es el área de Andrés DBA.
- **No medí la cuota real de `localStorage`** (sospecha 2), ni construí el escenario de escritura
  concurrente del coach (sospecha 3).
