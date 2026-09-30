# A1 · Entrar y abrir — camila-engineer + lucas-qa-func

## Veredicto en una frase
La pregunta del orquestador era cierta y más ancha de lo supuesto: **una sesión que el servidor revocó NO saca a la persona de la app ni le dice nada** — entra "como sin red" (token aún vivo, o red colgada/lenta/ausente) y se queda en una zona zombi donde todo lo que registra solo vive en su teléfono; el SW y el video están sanos; lo demás que encontré es ruido de telemetría y una migración de arranque muerta.

## Los 3 más grandes
**1. 🟡 La sesión revocada no se detecta ni se comunica (zona zombi).** Qué es: nadie escucha `onAuthStateChange` (`app-1-infra.js:593`, 0 llamadas) y `bootAuthDecision` + `_enterAuthSession` tratan "la nube no me reconoce" igual que "no hay red". A quién le pasa HOY: a los asesorados a los que se les cambió la contraseña (los 6 del PO) solo si mantuvieron la app abierta desde antes del cambio o si la abren sin red; cualquier cuenta borrada/suspendida/con sesión cerrada desde otro aparato dentro de la hora siguiente; sin uid no puedo nombrar a nadie. Evidencia: `q1-browser.mjs` (5 escenarios, arriba) + `q1-server.mjs` (403 `session_not_found` vs REST 200). Cómo intenté tumbarlo: el harness de v688 (`_verify-red-colgada`) dice que entrar es correcto — y lo es; lo que no se tumbó es que tras volver la red la persona siga dentro sin aviso y que el guardado falle mudo ("Sin sesión" solo en consola). Costaría: escuchar `SIGNED_OUT` + un aviso "tu sesión se cerró, entra de nuevo; lo que registraste está guardado en tu teléfono" y un indicador de "sin subir" para el asesorado (la cola de v588 del coach ya existe).

**2. 🟢→🟡 El `reg.update()` sin `.catch` ensucia la telemetría.** 11 de las 41 filas de `app_errors` del mes (y 9 de las 11 desde el 28-sep) son "Failed to update a ServiceWorker" = un `sw.js` que no bajó por red flaca, NO una versión atascada ni culpa de v687 (existen desde el 1-sep en github.io). `app-6-extra.js:95`. Tumbé la hipótesis del orquestador con el historial completo de la tabla. Costaría una línea.

**3. 🟡/🟢 Tres migraciones de arranque que nunca corren desde el 22-jun** (`migrateExTypes`, `migrateEnv`, `healExerciseEnv` llamadas desde `syncFromCloud` antes de que exista app-4): "is not defined" en consola en cada apertura, capturado por el `try/catch`. Sin víctima hoy (el asesorado ya recibe el catálogo correcto del código), pero el gotcha v517 afirma que corre siempre y no es cierto. `app-1-infra.js:1757-1761`.

## Todos los hallazgos
| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🟡 | Sesión revocada por el servidor: la persona sigue dentro sin aviso; lo que registra falla mudo ("Sin sesión" solo en consola) y queda local con bandera sucia | `app-1-infra.js:593` (onChange sin uso), `app-3-coach.js:721-745`, `app-1-infra.js:617/1562` | Posible en los 6 con contraseña cambiada si tenían la app abierta; no medible sin uid |
| 🟡 | Ventana de 1 h tras revocar: PostgREST sigue sirviendo con el token viejo (REST 200) mientras `/auth/v1/user` da 403 | medido `q1-server.mjs` | Ya cerrada para los 6 (horas) |
| 🟡 | Login tras sesión cerrada por el servidor sin ninguna frase de contexto | `showScreen('s-login')`, escenario 2 | Los 6, al abrir |
| 🟢 | `reg.update()` sin `.catch`: 11/41 filas de `app_errors` | `app-6-extra.js:95` | No (ruido) |
| 🟢 | `migrateExTypes/migrateEnv/healExerciseEnv` muertas al arrancar (ReferenceError tragado) | `app-1-infra.js:1757-1761` | No medido |
| 🟢 | Cuenta borrada por otro / suspendida: la copia de salud `ax_udcache_<uid>` queda en el teléfono y no se avisa | `app-3-coach.js:782`, `app-4-entreno.js:567` (solo borra en el auto-borrado) | Los 6 borrados del 29-sep si seguían con la app instalada |
| 🟢 | Librería del login ausente + sesión guardada → login, sin usar la copia | `app-2-login.js:1358` | No (caso raro) |
| 🟢 | Bandera sucia atascada bloquea la mudanza a app.avientrena.com | `app-1-infra.js:45-47` | Derivado del primero |

## Respuesta a las preguntas del orquestador
### Q1 · sesión que el servidor revocó
**CIERTA, y peor que la hipótesis en un punto: no hace falta red lenta.** Cuenta QA de asesorado, app LOCAL (sellada: no escribe datos a producción), sesión A en el navegador, sesión B iniciada por node y cerrada con `scope:'global'` (HTTP 204). Scripts en `%TEMP%` (`q1-server.mjs`, `q1-browser.mjs`); lo que se hizo contra producción: 4 logins y 2 logouts globales de la cuenta QA y lecturas (`GET`) de su propia fila.

**Lo que dice el servidor tras revocar (medido):**
- El `access_token` de A sigue siendo criptográficamente válido hasta que vence (1 h). `GET /auth/v1/user` con él → **403 `session_not_found`** ("Session from session_id claim in JWT does not exist"). Pero `GET /rest/v1/user_data` (PostgREST) con ese mismo token → **200 con la fila**: PostgREST no mira la sesión. Durante la hora siguiente a un cambio de contraseña, un teléfono revocado todavía podría LEER (y escribir) la fila de la persona por REST directo; lo que lo frena es solo que la app llama antes a `getUser()`. El `refresh_token` de A → **400 `refresh_token_not_found`**.

**Lo que ve la persona (medido en el navegador, 5 escenarios, sesión revocada):**

| # | Caso | Resultado |
|---|---|---|
| 1 | red buena, token SIN vencer (la hora siguiente al cambio) | **Entra a su pantalla en 0,7-0,9 s** como si nada. La librería borra `avi_auth` (getUser da 403) y la app cae al "respaldo local de tu fila" (`_enterAuthSession`, `app-3-coach.js:743`, log "sin red — usando respaldo local") aunque hay red. No se le dice nada. A los +38 s sigue dentro, nadie la saca. |
| 2 | red buena, token VENCIDO (abre al día siguiente) | **Ve el login en ~1,5 s**, sin ninguna explicación (ni "tu contraseña cambió" ni "tu sesión se cerró"). Es lo correcto en seguridad; lo único que falta es una frase. |
| 3 | WiFi colgada (la nube no contesta), token vencido | Entra en **3,3-3,4 s** con `sinRed:true` (`BOOT_NET_MS`); `avi_auth` sigue guardada. Al volver la red la librería la borra (visible a los +3 s) y **la persona sigue dentro**, sin aviso. |
| 4 | SIN red, token vencido | Entra en **0,26 s** (por diseño, falso positivo nº 1). Al volver la red, a los +3 s `avi_auth` aún estaba; a los +12 s la librería la había borrado. **Sigue dentro, sin aviso, sin que nada la saque.** |
| 5 | red LENTA (nube +4,5 s), token vencido | Entra en **3,24 s** con `sinRed`. Mismo final: sesión borrada por la librería cuando contesta la nube, persona dentro, sin aviso. |

**La hipótesis concreta ("con red lenta la librería no alcanza a borrar la sesión y la app deja entrar sin red") es CIERTA (caso 5 y 3)**, pero el defecto es más ancho: aunque la librería sí la borre, la app **no se entera** — `AUTH.onChange`/`onAuthStateChange` está definido (`app-1-infra.js:593`) y **no lo llama nadie** (grep en los 7 módulos: 0 llamadas). Nada reacciona a `SIGNED_OUT`. Por eso los casos 1, 3, 4 y 5 terminan en la misma "zona zombi": dentro de la app, sin sesión, sin avisar.

**¿Lo que registra mientras tanto se sube, queda en cola o se pierde?** (se registró un peso con la función real `logBodyWeight`; el último paso de `UD.upsertOwn`, el que escribe, se sustituyó por una réplica exacta de `app-1-infra.js:617` que NO escribe — el sello de localhost nunca se desactivó):
- La escritura **lanza "Sin sesión"** (`getUser()` = null) → `_persistAuthUser` la marca: `_udFailedKeys.ax_bw`, `_authDirty=true`, `ax_udirty_<uid>='1'` en localStorage y la copia local `ax_udcache_<uid>` se refresca con el peso. Medido: `dirty:true, failedKeys:["ax_bw"], se habría escrito: []`. O sea **queda en cola local, no se pierde**.
- Pero **la persona ve "⚖️ Peso registrado"** y ninguna otra cosa; no existe indicador de "sin subir" para el asesorado (la barra de v588 es del coach). Mientras la app siga abierta (una PWA instalada sobrevive horas/días en segundo plano) todo lo que entrene, escriba o pese vive solo en su teléfono y **su coach no lo ve**. Cada escritura reintenta en cada `online`/guardado y falla igual.
- Se recupera al reabrir: sin `avi_auth`, el arranque muestra el login; al iniciar sesión con el mismo uid, `_enterAuthSession` ve `_readAuthDirty(uid)` y fusiona la copia con la nube (`mergeAuthRow`, `app-3-coach.js:756`) y la re-sube. **Por lectura de código; no se pudo ejercitar sin escribir en producción.** Riesgo residual: si esa persona inicia sesión con OTRA cuenta (por ejemplo una nueva) su entreno de la zona zombi queda en la copia del uid anterior, sin subir y sin avisar.
- Efecto colateral medido en código: la bandera sucia atascada bloquea el salto a app.avientrena.com (`_mvHasPending`, `app-1-infra.js:45-47`) para ese teléfono mientras no se vuelva a entrar.

**¿Qué vive HOY con las 6 cuentas?** Sus contraseñas se cambiaron hace horas (0 sesiones vivas, baseline): todo token ya venció. Con red, al abrir → caso 2 (login). Sin red → entra con la copia (falso positivo nº 1, por diseño). Un teléfono que tuviera la app abierta desde antes y sin cerrarla es el único que está en zona zombi; eso no se puede medir sin sus uid (sospecha sin medir).

Severidad 🟡: no hay pérdida comprobada (la copia sobrevive), pero hay una ventana silenciosa de entrenos que el coach no ve y una persona que cree estar conectada.

### Q2 · cuenta borrada o suspendida con copia local
**CIERTA en parte (solo por código + lo medido en Q1, nada tocado en producción).**
- Borrada por el coach / por el PO (`delete-account` modo coach) o desde OTRO teléfono: para el teléfono de la persona es igual que la sesión revocada de Q1 (la cuenta de auth desaparece, sus sesiones también). Sin red → entra con la copia (`bootAuthDecision`, por diseño). Con red y token vencido → login (Q1-2). Con token aún vivo (<1 h) → entra "como sin red" (Q1-1).
- Datos de salud que quedan en el teléfono: `ax_udcache_<uid>` (la fila ENTERA: perfil, rutinas, historial, récords, peso, medidas, nutrición, fotos, mensajes), `ax_udbase_<uid>`, `ax_udirty_<uid>`. Nada los borra salvo la auto-eliminación hecha en ESE teléfono (`confirmDeleteAccount`, `app-4-entreno.js:567`, que limpia `ax_|avi_|apex*`). `logout()` (`app-2-login.js:509`) tampoco los borra. Quien fue borrado por el coach no recibe ningún aviso ni en la app ni al ver el login; su copia local queda indefinidamente.
- Suspendida (`inactive`, `canLogin`): con red, `_enterAuthSession` (`app-3-coach.js:782`) la saca con el mensaje "Tu acceso está pausado" y `AUTH.signOut()`, pero **tampoco borra la copia** (queda `ax_udcache_`). Sin red entra con la copia vieja (el `suspended` guardado es el de antes) — por diseño (falso positivo nº 1), y se corrige al volver la red.
- Severidad 🟢: no hay víctima medida (los 6 borrados del 29-sep ya no tenían sesión) y el dato es de la propia persona en su teléfono; pero la app le promete al borrarse a sí misma "borrar todo rastro local" y, si la borra otro, el rastro queda. Sin mensaje a la persona en ningún caso.

### Q3 · service worker que no se actualiza
**FALSA la hipótesis de v687 y falsa la de "solo falla en el hogar nuevo".**
- `app_errors`: los "Failed to update a ServiceWorker…" existen **desde el 1-sep en github.io** (builds v563→v661: 22 filas antes del 23-sep) y en app.avientrena.com desde el 23-sep (v665). Las 9 de "desde el 28-sep" son solo la parte que ya se mudó de hogar, no algo nuevo. Builds v679, v682×3, v687, v688×2, v691×2: el primero (v679) es ANTERIOR a v687, y v687 no cambió la línea que falla.
- Causa: `app-6-extra.js:95` `const _checkUpdate=()=>{ try{ reg.update(); }catch(_e){} }`. `reg.update()` devuelve una promesa; el `try/catch` no atrapa su rechazo. Cuando Chrome de Android no logra bajar `sw.js` ("An unknown error occurred when fetching the script" = fallo de red) la promesa queda sin atender y `unhandledrejection` la registra como error. Se dispara al volver a la app (`visibilitychange`) y cada 20 min. Es ruido de red flaca, no una versión que no pueda actualizarse.
- Quién: 9 filas, 3 personas (por `ctx.uid`: una ×6, otra ×2, otra ×1; los uid no van al repo público), todas Android Chrome instalada (`standalone:true`). La columna `uid` es NULL pero `ctx.uid` SÍ trae la persona (el baseline decía "uid NULL en las 11": cierto solo para la columna).
- ¿Puede quedarse para siempre en una versión vieja? No por esto: el intento se repite en cada vuelta a la app y cada 20 min. Un teléfono solo se queda atrás si nunca vuelve a tener red estable (los 6 "muy atrás" del baseline = no abren la app, no es el SW).
- Cabeceras medidas (`curl -I`, 30-sep ~19:20 UTC): hogar nuevo (Vercel) `sw.js`, `index.html` y `app-2-login.js?v=692` → `Cache-Control: public, max-age=0, must-revalidate` + ETag; github.io → `Cache-Control: max-age=600` + ETag. Mismo contenido lógico. Dato curioso: el `sw.js` de Vercel pesa 12.820 B contra 12.620 B en Pages y su `Last-Modified` (18:42) es posterior al de index (18:04) — el árbol de trabajo (CRLF) se publica a Vercel y el checkout LF a Pages; no rompe nada, pero son dos bytes distintos para el mismo `sw.js`.
- Hallazgo 🟢 derivado: esos rechazos no atendidos ensucian la telemetría (11 filas de 41 en el mes son esto) y esconden los errores reales. Arreglo de una línea: `reg.update().catch(()=>{})`.
### Q4 · los 2 «Script error.»
**NO SE PUDO REPRODUCIR; se acota el origen. Sin daño visible conocido.**
- Son 3 en total en el mes, no 2: ids 55 (15-sep, v613, con uid), 76 (28-sep, v680) y 85 (29-sep, v691). Las tres: **iPhone, Safari real** (`Version/26.6.x`, sin marca de navegador interno de Instagram/Facebook), **no instalada** (`standalone:false`), `src` vacío. Las dos del baseline tienen uid NULL = la persona aún no había entrado (login/bienvenida).
- "Script error." solo lo entrega el navegador cuando el error viene de un script de OTRO origen sin CORS. `index.html` no carga ningún `<script src>` externo (verificado: 0 coincidencias de `<script ... src="https`; supabase-js vive en `vendor/` desde v677; la CSP `script-src 'self' 'unsafe-inline'` de v678 impide que entre uno). La CSP tampoco lo produce (una violación de CSP no dispara `error` de window). Por eliminación el script es de fuera de la página: extensión/autocompletado de Safari o traductor inyectando en el login. No es la librería de Google (no se usa Google JS; solo hoja de fuentes).
- Esto es una inferencia, no una medición: sin iPhone en el banco. Va a "Sospechas". Las dos de esta semana no correlacionan con v680/v691 concretos (la de v613 es anterior a todo lo de la ronda).

### Q5 · v683 y los módulos
**`_verify-arranque-modulos.mjs` en HEAD: VERDE 6/6** (app-2 a app-7 bloqueados uno a uno: sin app-2 → "aviso honesto" alcanzable; los otros cinco → login vivo, `initPWA` donde toca, cero excepciones). Corrida propia, local, 30-sep.

**Si NO carga `vendor/supabase-js-2.117.2.js` y la persona tiene sesión guardada** (prueba propia: login real, luego SW desregistrado + cachés borradas para que el 404 llegue de verdad, recarga):
- Control (librería disponible): entra a su pantalla en 1,7 s.
- Librería 404 + `avi_auth` fresca guardada: **va al LOGIN en 1,5 s, no se queda en blanco** (`AUTH.ready()` es falso, `app-2-login.js:1358` se salta el bloque y cae a `tryAutoLogin`). **NO entra con su copia** aunque la tiene guardada. Al intentar iniciar sesión ahí: "No se pudo conectar para entrar. Revisa tu internet e intenta de nuevo." (el mensaje de v563, correcto pero engañoso si hay red).
- Es un caso raro: la librería está en `SHELL` del SW (cache-first), así que solo aplica a una primera instalación que falló o a cachés purgadas por el sistema. **🟢 Observación, no defecto**: coherente con "la app debe arrancar", pero quien ya tenía sesión y copia pierde su acceso offline por un archivo que no llegó; la decisión de entrar con la copia solo se toma si la librería existe (`AUTH.ready()`).
- Límite de la cobertura del harness existente: corre SIN sesión, así que no ve caminos que dependen de ella (ya estaba dicho en el gotcha de v537); el camino "sesión + módulo del coach ausente" lo cubre un candado estático.

**Hallazgo lateral real (🟡/🟢) destapado al mirar la consola:** `app-1-infra.js:1757-1761`, dentro de `syncFromCloud()`, llama `migrateExTypes()`, `migrateEnv()` y `healExerciseEnv()`; esas tres funciones viven en `app-4-entreno.js` (:1926, :1958, :1978) y `syncFromCloud()` se ejecuta al PARSEAR app-2, antes de que exista app-4. Resultado en cada arranque (medido en todos los escenarios): `AVI: migrateExTypes falló (no bloquea): migrateExTypes is not defined` ×3 en consola. Desde el corte en módulos (22-jun, `f5684eb`) esas tres migraciones **nunca corren al arrancar**; las llamadas están bajo `try/catch`, por eso no se vio. Incumple la regla "todo llamado a otro módulo va con `typeof`" (v537) y contradice el gotcha v517 ("`healExerciseEnv` corre en CADA arranque"): para el asesorado no corre (para el coach sí, vía `app-3-coach.js:1300`, que lo llama con guarda). Impacto hoy: bajo (el catálogo del asesorado sale de `defaultExercises`, que ya trae `env`/`type` correctos), pero son tres migraciones declaradas como activas que están muertas. No lo causó v683 (la espera fija de 2,8 s estaba al FINAL de `syncFromCloud`, no antes de las migraciones).

### Q6 · v684 login tras cierre forzado
**SANO.** Tras el cierre forzado de Q1 (sesión revocada + token vencido) el login aparece en ~1,5 s con la marca ya retirada (`splash=false`), `doLogin` vivo y sin pantalla negra. El video: con `prefers-reduced-motion: reduce` (que este Chrome headless trae activado) **no se carga por diseño** y queda la foto de fondo (`src` vacío, `poster`, `opacity 0`: correcto, no es "negro"). Con `no-preference` emulado: `aviLoginVideo()` pone `src=media/hero-montage.mp4`, `readyState 4`, `paused:false`, `currentTime` avanzando (6,27 s a los ~9 s), clase `on` puesta, sin error de media. El login que aparece por la vía de la sesión revocada es el mismo `showScreen('s-login')` que el de quien nunca entró. (Una primera lectura mía decía "video no carga": era el ajuste de movimiento reducido del navegador de prueba, no la app.)

## Lo que verifiqué y está SANO (con números)
- `_verify-arranque-modulos` en HEAD: 6/6 OK, cero excepciones.
- Entrar con la sesión válida: 1,7 s (control, librería presente); login tras sesión vencida+revocada: 1,5 s sin ver el login "fantasma" antes de tiempo (`vioLogin:false` en los 5 casos con entrada).
- `bootAuthDecision` hace lo que dice: sin red entra en 0,26 s; con la nube colgada o a 4,5 s entra en 3,2-3,4 s (≈ `BOOT_NET_MS` 3 s) — no se queda en blanco y no pasa del tope. Con el token vencido y red buena NO entra con la copia (va al login): la parte de "si el servidor ya lo revocó y contesta, manda el servidor" se cumple.
- Video del login (v684): carga, reproduce y avanza (`readyState 4`, `currentTime` 6,27 s); con movimiento reducido se queda la foto, por diseño.
- Service worker: cabeceras equivalentes en ambos hogares (Vercel `max-age=0, must-revalidate`; Pages `max-age=600`, ambos con ETag); v687 no es la causa de los errores (los hay desde v563).
- Falso positivo descartado: "Script error." NO viene de la librería de Google ni de `vendor/` (no hay `<script src>` externo; CSP de v678 lo impide).
- Control de discriminación de las sondas: el control "red normal + sesión válida" entra; el caso revocado con el mismo montaje cambia de resultado (login vs zombi) — no es la sonda. Control de cobertura: el harness imprime `avi_auth` y `getUser` por caso; las claves guardadas (`claves guardadas: 4`, `ax_udcache_*: 1`) se imprimieron antes de revocar.

## Sospechas sin medir
- Qué ven los 6 teléfonos reales hoy: pedir al orquestador sus uid; `auth.sessions` mostraría si alguno inició sesión de nuevo, y `ax_udirty_` no se puede leer desde la nube.
- "Script error." en Safari de iPhone (3 filas, 15-sep, 28-sep, 29-sep, ninguna con uid salvo la primera): sospecho una extensión/autocompletado de Safari inyectando en el login; no se pudo reproducir (sin iPhone).
- El merge al volver a iniciar sesión tras la zona zombi (`mergeAuthRow`) se verificó solo por código; ejercitarlo exigiría escribir datos en producción.
- Si el refresco de token de supabase-js 2.117.2 cambia su reacción a `session_not_found` en otras versiones (hoy: `getUser` 403 → borra `avi_auth`). Actualizar la librería es una decisión; este comportamiento depende de ella.

## Qué NO miré y por qué
- Android/iOS reales (solo Chrome headless de escritorio con CDP): ni el WebView del TWA ni Safari.
- Cuenta del COACH (regla dura 2) — su fila propia y su lista de asesorados comparten el mismo patrón (`app-3-coach.js:728-736, 1248-1253`) y, por lectura, el mismo hueco; no se midió.
- La escritura real a producción tras revocar (sellada en localhost; reemplazada por réplica sin escritura) y el re-ingreso con datos pendientes.
- Suspensión (`inactive`) medida solo por código; no se suspendió nada.
- Matrices de sabotaje (regla dura 9) y la mudanza `#avimv=` con una sesión revocada dentro (el enlace lleva `avi_auth`; no medido qué pasa).

