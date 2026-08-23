# Auditoría: CÓDIGO, DEUDA TÉCNICA Y SALUD DE LOS GATES — Julián Ospina (QA estático)

**Alcance:** delta **v418 → v525** (HEAD `d6d51fa`, sello en código `avi-v524`). Encargo principal:
enumerar TODOS los gates del proyecto y decir cuáles no pueden fallar.

---

## Veredicto en 5 líneas

La salud de los gates es **mejor de lo que temía y peor en un punto concreto**. Lo bueno está medido:
**859/859 tests y ninguno corre sin una sola aserción** (instrumenté la suite en caliente, no la grepeé),
**104 de 108 harnesses tienen ruta a salir en rojo** (los 4 restantes son una librería de fixture, un
medidor y dos exploradores — ninguno se llama «verify»), y el hook da **12/12**. El hallazgo grande es
uno solo y es 🔴: **`_verify-arranque-modulos.mjs` —el gate que existe para que nadie se quede mirando
una pantalla pegada en el Android de su casa— aprueba justo ese caso**, porque su criterio de éxito
(«`#s-login` está visible») lo cumple el defecto: `#s-login` es marcado ESTÁTICO y el splash que lo
tapa es `position:fixed;z-index:9999`. **Lo corrí: con `app-2-login.js` bloqueado imprime `OK`, y su
propia línea de salida trae `cargaFuera:false` — el dato que lo delata, medido y descartado.**
Aparte: **3 de 129 sabotajes ya no se aplican** (el código al que apuntan se movió), y los dos gates
que la auditoría de v417 dejó marcados (`showPanel` muerto y `initPWA` sin guarda) **siguen exactamente
igual 108 versiones después**.

---

## TABLA DE GATES — el encargo principal

Todos los que existen. «¿Puede fallar?» = ¿hay algo real que lo ponga rojo?

| Gate | ¿Puede fallar? | Qué lo pondría rojo | ¿Lo probé? |
|---|---|---|---|
| `avi.test.js` (859 tests) | **Sí** | Cualquier `assert` falso. **Medido: 0 de 859 corren sin aserción; 0 tests por debajo del bloque `// RESUMEN`** | **Sí** — corrida + instrumentación |
| Hook [1] Sintaxis JS | Sí | `node --check` en cualquiera de los 10 módulos | Sí (hook 12/12) |
| Hook [2] Funciones duplicadas | Sí | Dos `function X(` en dos módulos. Universo real: 1.245 nombres | Sí |
| Hook [3] IDs JS sin HTML | **A medias 🟡** | **Solo falla con MÁS de 5 ids rotos; con 1-5 avisa y deja pasar (exit 0)** | Sí (hoy 0 rotos) |
| Hook [4] Handlers sin función | Sí | Un `onclick="X("` sin `X`. Medido: 296 handlers, 0 rotos, **0 salvados por la regla laxa `const X = (`**. Ciego a eventos fuera de click/input/change/submit (hoy 2: keydown y error, los dos cableados) | **Sí** — repliqué el check con control + y − |
| Hook [5] SB_KEYS | **Casi no 🟡** | Solo comprueba que **10 claves escritas a mano** sigan en el literal. Una clave NUEVA que no sincronice no la ve nadie | Sí (pasa por construcción) |
| Hook [6] Ejercicios duplicados | Sí | Id repetido. Tiene guarda de población (`if not ex_ids: fail`) | Sí |
| Hook [7] Secretos | Sí | 4 patrones (VAPID, service_role, JWT, creds de prueba) | Sí |
| Hook [8] Suite ×2 (local + UTC) | Sí | Suite roja en cualquiera de los dos husos (candado de v517) | Sí — 859/859 en los dos |
| Hook [9] `audit-catalog.mjs` | Sí | Solo **BLOCK** aborta; los **11 MAJOR de hoy (fotos faltantes) NO bloquean**. Guarda de población `_CAT_MIN=100` presente. No lee `app-7-community.js` | **Sí** — 0 BLOCK · 11 MAJOR |
| Hook [10] `?v=` vs `CACHE_NAME` | Sí | Desalineación. Ya cazó una de 37 versiones | Sí (524=524) |
| Hook [11] Baseline de la suite | **A medias 🟡** | Solo si el conteo **BAJA**. **No puede cazar el defecto de v524** (un test debajo del RESUMEN no entra en la tanda y el contador no sube: se lee «= baseline») | Sí (859 = baseline) |
| Hook [12] `foods.json` vs generador | Sí | `build-foods.mjs --check` en rojo | Sí (181 alimentos) |
| CI `.github/workflows/ci.yml` | Sí | Corre suite + hook en Ubuntu (UTC). Red contra `--no-verify` | No (no hice push) |
| CI `keepalive.yml` | Sí | HTTP ≠ 200/206 de Supabase | No |
| `scripts/smoke.mjs` | **A medias 🟡** | Sonda 4 módulos de 10 (**app-1, app-2, app-3 y app-7 sin sondear**); `hasLogin` mira marcado ESTÁTICO; los errores de log (404) se imprimen y **no** fallan | **Sí** — verde, EXIT 0 |
| `scripts/smoke-run.mjs` | Sí | `process.exit(okAll?0:1)` | No |
| `scripts/e2e/_prodcheck.mjs` | Sí | `exit(pass?0:1)` — versión servida + login + 0 errores JS | No (requiere deploy) |
| **108 harnesses `scripts/e2e/*.mjs`** | **104 sí / 4 no** | Los 4 sin ruta a rojo son `_fixture-12` (librería), `_medir-tarjetas-hoy` (medidor) y `_walk-live`/`_walk-train` (exploradores, `exit(0)` fijo) — **ninguno se llama «verify»** | **Sí** — sonda con control ± |
| ↳ `_verify-arranque-modulos.mjs` | **NO para su propio caso 🔴** | Ver **H1** | **Sí — corrido** |
| ↳ `_shot-design-audit.mjs` | **Casi no 🟠** | Ver **H3** | **Sí — corrido, verde** |
| ↳ `_verify-hero` · `_verify-tope` · `_verify-alcance` · `_verify-story` | Sí | Corridos hoy, los 4 verdes | **Sí** |
| ↳ `_verify-lesiones.mjs` (gate de SEGURIDAD física) | Sí | Tiene **dos guardas de montaje duras** (`if(setup!==true) exit 1`, `if(g1!==true) exit 1`) antes de afirmar nada | No (leído, no corrido) |
| **7 matrices `_sabotaje-*.mjs`** (129 sabotajes) | Sí | Y gritan `NO SE APLICÓ` + `exit 1` cuando el ancla no aparece 1 vez. **3 están en ese estado hoy → ver H2** | **No las corrí** (restricción del encargo). Verifiqué su aplicabilidad **en solo lectura** |
| `scripts/_verify-*.mjs` (raíz de `scripts/`) | **No son gates** | `scripts/_*` está en `.gitignore` (confirmado con `git check-ignore`): no versionados, no los corre nadie. `_verify-timer.mjs` sigue sondeando 5 funciones borradas en F5b | Sí (comprobado que no está en `git ls-files`) |

---

## Hallazgos verificados

### H1 · 🔴 El gate del arranque aprueba EXACTAMENTE el defecto que existe para cazar: su criterio de éxito es el síntoma

- **Qué pasa:** `_verify-arranque-modulos.mjs` bloquea por red cada módulo y afirma que «la app
  arranca». Su criterio es
  `ok = login && (!exigeInitPWA || initPWA) && fatales.length===0`, donde
  `login = !!(l && getComputedStyle(l).display!=='none')` sobre `#s-login`.
  **`#s-login` es marcado ESTÁTICO de `index.html:110` (`class="screen on cin"`): existe y está
  «visible» desde que el HTML se parsea, cargue o no cargue un solo byte de JS.** Y el splash que lo
  tapa (`#avi-loading`) es `position:fixed;inset:0;z-index:9999` (styles.css:1419), o sea que
  «`#s-login` visible» y «la persona ve el login» son dos cosas distintas.
  El harness SÍ mide la que importa —`cargaFuera`— **y no la usa en el veredicto.**

- **Dónde:** `scripts/e2e/_verify-arranque-modulos.mjs:53-63` (la sonda y el `ok`) ·
  `index.html:110` (`#s-login` estático) · `styles.css:1419` (`#avi-loading`) ·
  `app-1-infra.js:1073` y `:1129-1130` (`syncFromCloud` es quien quita el splash) ·
  `app-2-login.js:1047` (su ÚNICO llamador) · `app-2-login.js:1051` (`initPWA()` sin guarda).

- **Evidencia (corrida real de hoy, salida literal):**
  ```
   OK   sin app-2-login.js   → la app arranca — {"login":true,"initPWA":true,"cargaFuera":false,...}
   OK   sin app-3-coach.js   → la app arranca — {"login":true,"initPWA":true,"cargaFuera":true, ...}
   OK   sin app-4-entreno.js → la app arranca — {"login":true,"initPWA":true,"cargaFuera":true, ...}
   OK   sin app-5-salud.js   → la app arranca — {"login":true,"initPWA":true,"cargaFuera":true, ...}
   OK   sin app-6-extra.js   → la app arranca — {"login":true,"initPWA":false,"cargaFuera":true,...}
   OK   sin app-7-community  → la app arranca — {"login":true,"initPWA":true,"cargaFuera":true, ...}
  ✅ TODO OK — ningún módulo ausente deja la app en blanco (6 probados)   EXIT=0
  ```
  **Fila 1: `cargaFuera:false`.** El splash NUNCA se quitó y el gate dijo OK. El mecanismo es
  cerrado: el `.fade` + `remove()` del overlay vive DENTRO de `syncFromCloud()`
  (app-1-infra.js:1129), y el único sitio del repo que llama a `syncFromCloud()` es
  `app-2-login.js:1047` (`grep -rn "syncFromCloud()"` → exactamente 2 aciertos: la definición y esa
  llamada). Sin app-2 no hay boot, no hay `.fade`, y quedan **9 s (y los que sigan) de pantalla de
  carga pegada** — que es, palabra por palabra, lo que dice la cabecera del propio harness que viene
  a evitar: *«su modo de fallo es una pantalla en blanco en el Android de una persona real»*.

  **La segunda mitad, en la fila de app-6.** Ahí el harness se EXIME de exigir `initPWA`
  (`const exigeInitPWA = mod !== 'app-6-extra.js'`, línea 62) y se queda con «login pintado + 0
  excepciones». Pero `initPWA()` (app-2:1051) **no tiene la guarda `typeof`** que sí llevan sus
  vecinas, así que sin app-6 lanza `ReferenceError`, el `.catch()` del boot lo atrapa y hace
  `showScreen('s-login')` — **y todo lo que venía después no corre: `_aviInstallBack()`, el
  `_enterAuthSession(session.user)` de Supabase y `tryAutoLogin()`** (app-2:1052-1076). O sea: la
  persona queda **deslogueada**. El gate lo llama OK porque su criterio —ver el login— es el síntoma.

- **Intenté tumbarlo así:**
  - *¿Los 9 s son pocos y el splash se va después?* No: las otras 5 filas dan `cargaFuera:true` a
    los mismos 9 s. Cuando funciona, 9 s sobran.
  - *¿Lo quita algún otro módulo?* `grep -rn "avi-loading" app-*.js` da **dos** sitios: app-1:1129
    (dentro de `syncFromCloud`) y app-2:1084 (el `.catch()` del boot). Los dos mueren con app-2.
  - *¿Es un escenario real o de laboratorio?* Real y ya ocurrido: `app_errors` de producción trae
    `Uncaught SyntaxError: Unexpected end of input` **5 veces** (v310…v410) — la firma de un script
    truncado — y **`sw.js:79` sigue cacheando respuestas NO-OK** (sin `if(r.ok)`, a diferencia de la
    rama de assets en `sw.js:95`, que sí lo comprueba). Un 404 de 30 s durante un deploy se guarda
    en el caché versionado y se vuelve permanente. Esto ya estaba reportado como H4 el 31-jul y
    **sigue sin arreglar** (verificado hoy línea por línea).
  - *¿No lo cazaría el `fatales.length===0`?* No: el `ReferenceError` de `initPWA` está ATRAPADO por
    el `.catch()` del boot, así que nunca llega como `Runtime.exceptionThrown`.

- **A quién le pasa:** a un asesorado en Android con señal irregular o justo durante un deploy.
  Lo que él reporta es «se quedó cargando» o «me sacó y me pide entrar otra vez». Encaja con los
  8 que nunca completaron un entreno: una app que el día 1 te deja mirando el splash no se reabre.

- **Costo del arreglo:** tres líneas, todas de una.
  1. En el harness, **usar el dato que ya mide**: añadir `&& estado.cargaFuera` al `ok` (línea 63).
  2. Cambiar la sonda de `login` por algo que solo exista si el boot llegó al final (p. ej. que
     `#avi-loading` ya no esté en el DOM, que es la señal real).
  3. En la app, `if(typeof initPWA==='function') initPWA();` en `app-2-login.js:1051` — idéntico al
     fix de v416 — y entonces el harness puede exigir `initPWA` también en la fila de app-6 sin
     eximirse. **Y con eso el gate por fin vigila la puerta que dice vigilar.**

---

### H2 · 🟠 3 de 129 sabotajes ya NO SE APLICAN: el código al que apuntan se movió, y los conteos documentados están caducados

- **Qué pasa:** revisé **en solo lectura** las 7 matrices (no las corrí: la restricción del encargo)
  contando cuántas veces aparece el texto de búsqueda de cada sabotaje en su archivo destino, con la
  MISMA normalización de finales de línea que usa el runner. Tres aparecen **0 veces**, o sea que el
  runner los marcaría `NO SE APLICÓ` y las dos matrices saldrían **en rojo por ancla caduca**, no por
  un defecto.

- **Dónde y por qué (los tres, con su causa):**

  | Matriz | Sabotaje | Ancla | Por qué murió |
  |---|---|---|---|
  | `_sabotaje-f7.mjs:129-131` | `26· el tour de novedades vuelve a recortar ANTES de filtrar` | `.filter(n => conCoach \|\| !n.coach)` + salto + `.sort((a,b)=>b.v-a.v)` | **v508** metió `.filter(n => conPremium \|\| !n.premium)` ENTRE las dos líneas (`avi-core.js:3280-3282`). El ancla de dos líneas dejó de casar. |
  | `_sabotaje-fuentes.mjs` F1 | `un alimento deja de declarar de dónde salió su número` | `{ id: 'crema_mani', src: 'sin_verificar',` | **v490** le dio fuente real: hoy es `src:'usda_sr', ref:"FDC 172470 …"` (`avi-core.js:4483`). `grep -c sin_verificar avi-core.js` → **0**. |
  | `_sabotaje-fuentes.mjs` F4 | `entra un alimento NUEVO sin fuente (lo caza el CONTEO)` | idéntico | misma causa |

- **Evidencia:** sonda de solo lectura sobre las 7 matrices (129 sabotajes), con su control en las
  dos direcciones — `function nutBaseFor` → 1 acierto (esperado ≥1) · `zzz_no_existe_zzz` → 0
  (esperado 0). Resultado: **129 revisados, 3 con ≠1 aparición.** Las otras 126 anclan en texto que
  sigue existiendo exactamente una vez.

- **Intenté tumbarlo así:** *¿No pasarán silenciosamente por un ✅ más de la lista?* No: **los dos
  runners los cuentan como FALLO y salen con 1** (`_sabotaje-f7.mjs:191-195` los mete en `fallos`;
  `_sabotaje-fuentes.mjs:56-58` los mete en `verdes` con la etiqueta `(NO SE APLICÓ)` y hace
  `process.exit(1)`). O sea que el mecanismo del grito FUNCIONA — el problema es que **nadie las ha
  corrido desde v490/v508**, y mientras tanto CLAUDE.md sigue afirmando «34/34» y «5/5». *¿El
  `execSync('node --test avi.test.js')` que usan para medir el rojo propaga bien?* Lo comprobé
  aparte con un archivo de control que sale con 1: `node --test` devuelve **EXIT=1**. Ese eslabón
  está sano.

- **A quién le pasa:** al siguiente que despliegue confiando en el conteo escrito. El sabotaje 26 de
  f7 lleva **inerte desde v508** — el candado del recorte del tour de novedades lleva 17 versiones
  sin que nadie compruebe que muerde.

- **Costo del arreglo:** reapuntar tres anclas y anotar el porqué al lado, como manda el gotcha de
  v490. **Minutos.** El de f7 ancla mejor en una sola línea (`.slice(0, 3);` de `newsToShow`) que en
  dos consecutivas — un ancla de dos líneas se despega cada vez que alguien mete una en medio. Los
  dos de `fuentes` piden un alimento que HOY tenga `src` real y afirmar sobre él.

---

### H3 · 🟠 `_shot-design-audit.mjs` sigue con la sonda muerta que se reportó el 31-jul, y su fixture ya solo pinta UN estado de membresía de los tres que quería

- **Qué pasa:** dos defectos, los dos ya descritos en la auditoría anterior (H6) y **los dos vivos
  108 versiones después**.
  1. `if(typeof showPanel==='function')showPanel('p-home')`. **`showPanel` no existe en ninguna parte
     del repo** — el navegador real usa `gp(...)`. El `typeof` lo convierte en no-op silencioso, el
     IIFE devuelve `true` igual y la aserción `A.ok(coachOK===true, 'el panel del coach se monta')`
     **afirma un montaje que nunca se intentó**.
  2. Su fixture fija tres `dueDate` ABSOLUTOS para pintar tres estados de membresía distintos.
     **Hoy los tres están vencidos.**

- **Dónde:** `scripts/e2e/_shot-design-audit.mjs:48-50` y `:56`.

- **Evidencia:**
  - **Corrí el harness hoy**: imprime `✅ el panel del coach se monta` y sale con **EXIT=0**.
  - Barrido cruzado de las 1.637 definiciones de los 10 módulos contra todas las sondas de los 142
    scripts: `showPanel` es uno de los 4 nombres muertos (los otros 3 son de `_verify-timer.mjs`, que
    no está versionado). Control de la tabla en las dos direcciones: `renderClientToday`/`gp` →
    DEFINIDO; `openGuidedMode`/`startClientRest`/`showPanel` → NO EXISTE.
  - Estados de membresía calculados con la función REAL (`MS.getStatus`, hoy 2026-08-22):
    ```
    overdue  2026-08-01   c1 Samuel
    overdue  2026-07-14   c2 Andrés
    overdue  2026-06-30   c3 Astrid
    CONTROL: 2027-01-01 → active · sin pagos → pending
    ```
    Las capturas de diseño 04/05 llevan desde el 1-ago mostrando tres «Vencido» donde debían salir
    tres badges distintos.

- **Intenté tumbarlo así:** *¿No caza al menos que `renderHome()` reviente?* **Sí, eso sí lo caza**
  (el `try` interno devolvería `'err:…'`) — por eso es 🟠 y no 🔴. Lo que no puede cazar es lo que su
  mensaje promete: que el panel esté montado. *¿Y el resto de harnesses con fechas absolutas?*
  Los revisé: `_verify-pulse` y `_verify-shock` usan `dueDate:'2026-09-01'` (vencen en 10 días),
  **pero es inerte**: `coachPulse` (avi-core.js:7109-7110) solo mira `c.suspended`, no la membresía.
  Los descarto. `_verify-deload` está en 2026-12-01. `_fixture-12.mjs` ya usa `_dk(±n)` relativo —
  ese está bien hecho.

- **A quién le pasa:** a la próxima revisión de diseño que mire esas capturas creyendo que ve el
  panel del coach con sus tres estados.

- **Costo del arreglo:** dos líneas: `showPanel` → `gp('p-home', document.getElementById('sbi-home'),
  'Inicio')`, y las tres fechas a relativas con el `_dk(±n)` que ya existe en `_fixture-12.mjs`.
  Y afirmar un dato que solo exista si `p-home` pintó, en vez de `coachOK===true`.

---

### H4 · 🟡 `smoke.mjs`: sondea 4 de los 10 módulos, su check de login mira marcado estático, y un 404 no lo pone rojo

- **Qué pasa:** tres huecos en el mismo archivo.
  1. **`hasLogin: !!document.getElementById('s-login')`** — es marcado estático de `index.html:110`.
     Es verdadero aunque no cargue un solo módulo. Es el gotcha «DOM presente ≠ app booteada» que el
     propio CLAUDE.md tiene escrito, dentro del gate que existe para detectar justo eso.
  2. **Solo sondea 4 módulos**: `generarRutinas` (avi-core), `renderClientToday` (app-4),
     `renderNutritionCoach` (app-5), `openGuidedEmbedded` (app-6). **Sin sonda: `app-1-infra.js`,
     `app-2-login.js`, `app-3-coach.js`, `app-7-community.js`, `muscle-map.js`,
     `exercise-muscles.js`.** Entre ellos el arranque (app-2) y el panel entero del coach (app-3).
  3. **Los errores de log (404) se imprimen y NO fallan.** `logErrors` se pinta con `⚠️` y nunca
     entra en `problems` (`scripts/smoke.mjs:137-146`). Hoy la salida es literalmente:
     `⚠️ errores de log: 1 → 404 (Not Found)` seguido de
     `✅ SMOKE OK — la app arranca sin errores`.

- **Dónde:** `scripts/smoke.mjs:112-119` (sondas) y `:140-146` (los `problems`).

- **Evidencia:** lo corrí hoy → EXIT=0, con el `⚠️ 404` en la salida. Verifiqué que las 4 funciones
  sondeadas existen y en qué módulo vive cada una. Y verifiqué que `#s-login` es estático
  (`index.html:110`).

- **Intenté tumbarlo así:** *¿El 404 de hoy es un defecto?* **No, y lo descarté midiéndolo.** Es el
  `manifest.json` con ruta absoluta `/apex-app/...`, que resuelve bien en Pages y no en
  `localhost:8000/`. Comprobado contra producción: `manifest.json → 200`, `icons/icon-192.png → 200`.
  *¿No cubre el hueco de app-1/2/3/7 el `exceptions.length`?* Solo si el módulo revienta ruidosamente
  al parsear. Un módulo que llega **truncado pero sintácticamente válido** define menos de lo que
  debe y no lanza nada: para esos cuatro no hay sonda.

- **A quién le pasa:** a nosotros, cuando el smoke diga OK sobre un app-3 que no cargó. Y el
  precedente exacto ya está pagado: este mismo archivo pasó **43 versiones en rojo permanente**
  apuntando a `openGuidedMode`, borrada en v350.

- **Costo del arreglo:** ~6 líneas. Una sonda por módulo que falta (una función representativa de
  cada uno), cambiar `hasLogin` por un símbolo post-boot real (`window._aviUpdateBusy`, que es lo que
  el propio CLAUDE.md recomienda), y meter en `problems` los `logErrors` que sean 404 de un
  `.js`/`.css` del propio origen.

---

### H5 · 🟡 Dos checks del hook que casi no pueden fallar, y el cruce de las 3 listas del coach sigue sin gate

- **Qué pasa:**
  1. **Check [3]** (`scripts/hooks/pre-commit:105-119`): si faltan **1 a 5** ids, llama `warn(...)`
     → el commit **pasa con exit 0**. Solo `fail` con más de 5. Un id roto en un flujo crítico entra
     a producción con un aviso amarillo que nadie lee.
  2. **Check [5]** (`:135-150`): comprueba que **10 claves escritas a mano** sigan dentro del literal
     de `SB_KEYS`. Es un check que solo puede detectar que alguien BORRE una de esas 10; no ve una
     clave nueva que debía sincronizar y no se agregó — que es la forma real del bug (v321).
  3. **El cruce de las tres listas del coach sigue sin ningún gate.** Para que un ajuste suyo suba
     tiene que estar en `SB_KEYS` (17 claves, `app-1-infra.js:116`), en `_COACH_SETTINGS_KEYS`
     (7, `:122`) y en el literal de `_coachSettingsObj()`. Hoy coinciden.
     `grep -c "_COACH_SETTINGS_KEYS" avi.test.js scripts/hooks/pre-commit` → **0 y 0**. Esto ya se
     reportó como H7 el 31-jul y está **igual**.

- **Evidencia:** lectura del hook + el grep de arriba + el hook corrido (12/12, 0 avisos → check 3
  hoy da 0 ids rotos, así que el hueco es latente, no daño actual).

- **Intenté tumbarlo así:** *¿El check 3 se ablandó por buenas razones?* Sí: los ids dinámicos
  (`id="fbe-${x}"`) darían falsos positivos, y por eso hay el filtro `in_src`. Pero el umbral «5» es
  un número a ojo que convierte el gate en aviso justo en el rango típico de un defecto real (1-2
  ids). **Un umbral que perdona el tamaño habitual del defecto no es un umbral.**

- **A quién le pasa:** deuda latente, no daño de hoy — por eso 🟡.

- **Costo del arreglo:** check 3 → `fail` desde 1 id roto y mantener a mano una lista corta de
  excepciones justificadas (~4 líneas). Check 5 + las tres listas → ~6 líneas en `avi.test.js`, el
  molde del test de paridad de `STREAK_MILESTONES` que ya existe: afirmar
  `_COACH_SETTINGS_KEYS ⊆ SB_KEYS` y que las claves de `_coachSettingsObj()` sean exactamente
  `_COACH_SETTINGS_KEYS`.

---

### H6 · 🟢 Cuatro funciones sin un solo llamador en todo el repo (código muerto REAL)

- **Qué pasa:** de las **1.244** funciones `function X(` declaradas en los 10 módulos, hay **4** cuyo
  nombre aparece **exactamente una vez en todo el repositorio: su propia declaración.**

  | Dónde | Función | Nota |
  |---|---|---|
  | `app-3-coach.js:1317` | `convertToPremium(cid)` | Es un alias de compatibilidad de una línea (`setClientPlan(cid,'coach')`). **⚠️ CLAUDE.md:430 la sigue documentando como «Botón "⭐ Activar Premium" en el detalle (`#d-freelead`)»** — el botón real hoy dice `Activar Premium + Coach` y llama a `setClientPlan` (`app-3-coach.js:2937`). La doc está desfasada, no la app. |
  | `app-2-login.js:173` | `verifyClientPass(client, plain)` | 3 líneas, envoltorio de `verifyPass`. |
  | `app-4-entreno.js:1502` | `exMetaText(ex,sets,track)` | 6 líneas; su sucesor vivo es `exSetsCellHTML` (justo debajo). |
  | `app-4-entreno.js:3097` | `cnToggleSub(rowEl)` | 6 líneas; ningún `onclick` la referencia. |

- **Evidencia:** cruce de las 1.244 declaraciones contra todo el código embarcado (10 módulos +
  `index.html` + `sw.js`), contando también las referencias **sin paréntesis** (para no confundir un
  callback con código muerto — así se salvaron `pkFilter`, `changeMood`, `_unlockAudio`, `exFilter`,
  etc.). Confirmado uno a uno con `grep -rn` sobre `.js/.html/.mjs/.md`. Control de la sonda:
  `renderClientToday` → 19 llamadas, `nutBaseFor` → 15, `zzzNoExiste` → 0.

- **Intenté tumbarlo así:** *¿Las llama un harness o un test?* No: `enTest:0`, `enE2E:0` en las
  cuatro. *¿Un `onclick` de plantilla?* No: el barrido incluye el HTML generado desde los módulos, y
  el check 4 del hook confirma 296 handlers, ninguno con estos nombres.

- **A quién le pasa:** a nadie hoy. Es limpieza. Lo que sí cuesta es la **línea 430 de CLAUDE.md**,
  que le va a hacer perder tiempo al siguiente que busque el botón por ese nombre.

- **Costo del arreglo:** borrar 4 bloques (18 líneas en total) y corregir una línea de CLAUDE.md.
  El check [11] del hook no se entera (es del conteo de tests, no de funciones).

---

## Sospechas sin probar

1. **`_verify-deload.mjs:76` hace `document.getElementById('tab-today')` y ese id no existe en ningún
   sitio del repo** (las pestañas del asesorado no llevan id: `index.html:826` es
   `<div class="cntab on" onclick="cnTab('cn-today',this)">`). Devuelve `null`, y `cnTab(id, el)`
   tiene `if(el)` (app-4:182), así que **no lanza** y la pestaña igual se activa. Lo dejo en sospecha
   porque no medí si el botón sin resaltar cambia algo de lo que el harness afirma después. Para
   cerrarlo: correr `_verify-deload` con y sin esa línea y comparar sus 22 aserciones.
2. **`audit-catalog.mjs` no lee `app-7-community.js`** (su lista `FUENTES` tiene 8 archivos y ese no
   está). Hoy no hay catálogo ahí, así que probablemente da igual; no lo comprobé. Es la misma forma
   del defecto que ya pagó ese archivo cuando leía SOLO `index.html` y daba «0 ejercicios · sin
   problemas».
3. **El check [4] del hook es ciego a los eventos fuera de `click/input/change/submit`.** Medido:
   hoy hay 2 handlers en la zona ciega (`onkeydown` ×4 y `onerror` ×2) y **todos están cableados a
   funciones que existen** (`cmtyCloseZoom` verificada). No es daño; es superficie sin vigilar. Un
   `onblur`/`ontouchstart` nuevo entraría sin gate.
4. **Los `_shot-*` que fijan `dueDate:'2026-08-01'`** (`_shot-history`, `_shot-profile`,
   `_shot-routines`, `_shot-coach`) también están todos en `overdue` hoy. No medí si eso cambia lo
   que capturan del lado del asesorado (esas pantallas quizá no miran la membresía). Se cierra
   pasándolos a fechas relativas, que cuesta lo mismo que comprobarlo.

---

## Lo que revisé y está SANO (medido, no supuesto)

- **La suite no tiene tests vacíos ni tests fuera de la tanda.** Instrumenté `avi.test.js` en
  caliente (envolví `assert` y atribuí cada llamada al test que el runner imprime a continuación):
  **859 tests contados, 0 con cero aserciones.** Control de la sonda sobre una suite sintética: de 3
  tests, marca los 2 que no afirman nada y deja pasar el que sí. Y **0 bloques `test(` por debajo del
  `// RESUMEN`** (línea 12130) — el defecto de v524 está cerrado en el archivo. Mi partidor de
  bloques cuenta 859, el mismo número que el runtime: la lectura estática y la real coinciden.
- **Ningún test asíncrono.** `grep` de `test(...async` → 0. Importa porque `test()` (línea 316) llama
  `fn()` y atrapa **síncronamente**: un test `async` que fallara contaría como pasado.
- **Fechas absolutas: no hay problema.** 121 de los 859 tests usan una fecha literal, pero solo **1**
  la mezcla con el reloj real (`Date.now()`), y ahí el `now` cae sobre un cliente sin descarga →
  `null` en cualquier fecha. Determinista. (Control de la sonda verificado en las dos direcciones.)
- **Los candados estáticos SÍ inspeccionan poblaciones reales** — la clase «0 de 0 aprueba» no está
  presente. Medido: sprite 19 símbolos / 20 usos · `AVI_ICONS` 57 entradas / 90 usos ·
  `onclick=` en app-5 39 · `avc(` 7 · `style=` con `color:#` 22 · reglas de `styles.css` 1.526.
  Y varios traen su control escrito (`assert.ok(validos.size > 30, 'el parser no está viendo la
  tabla')`, `assert.ok(llamados.size > 10, 'control: …')`) — la disciplina está.
- **Check [4] del hook, replicado con controles ±:** 296 handlers, **0 rotos**, y **0 salvados por la
  regla laxa `const X = (`** (que era mi sospecha de entrada: era falsa). Con un handler inventado la
  réplica lo caza.
- **`audit-catalog.mjs` tiene su guarda de población** (`_CAT_MIN=100`, y grita `[BLOCK] Solo se
  leyeron N ejercicios`). Hoy lee 244. Es la lección de v393 ya aplicada.
- **El eslabón `execSync('node --test avi.test.js')` de las matrices propaga bien el rojo:**
  comprobado aparte con un archivo de control que sale con 1 → `node --test` da EXIT=1.
- **104 de 108 harnesses pueden salir en rojo.** Los 4 que no, no son gates y ninguno se llama
  «verify». ⚠️ **Nota de método para el PO:** mi PRIMERA sonda dio 6 y estaba mal — su regex
  (`[^)0]*`) no reconocía `process.exit(fail === 0 ? 0 : 1)` porque el argumento contiene un `0`.
  La segunda parsea el argumento con balanceo de paréntesis y sus controles discriminan en las dos
  direcciones (`_test-coach-back`/`_verify-f5a` → MUERDE · `_walk-train`/`_fixture-12` → no).
- **`scripts/_*` está en `.gitignore`** (confirmado con `git check-ignore -v`): `_verify-timer.mjs`,
  con sus 5 sondas a funciones borradas en F5b, **no es un gate** — no está versionado ni lo corre
  nadie. Sigue siendo una trampa para quien quiera verificar los timers, pero no un gate rojo.
- **Hook 12/12, suite 859/859 en los dos husos, `audit-catalog` 0 BLOCK, `foods.json` alineado, smoke
  verde, y 4 harnesses del delta corridos y verdes** (`_verify-hero`, `_verify-tope`,
  `_verify-alcance`, `_verify-story`).
- **El repo quedó intacto:** `git status --short` al final solo muestra `?? docs/auditoria-areas-2026-08-22/`.

### Harnesses y gates que CORRÍ (para que quede dicho)
`node avi.test.js` (×3, una instrumentada) · `node --test avi.test.js` · `python scripts/hooks/pre-commit`
· `node scripts/audit-catalog.mjs` · `node scripts/smoke.mjs` · `_verify-hero` · `_verify-tope` ·
`_verify-alcance` · `_verify-story` · `_shot-design-audit` · `_verify-arranque-modulos`.
**NO corrí ninguna matriz `_sabotaje-*` ni ningún script que mute archivos.**

### Sabotaje que pido ejecutar (para cerrar H1 con dientes)
No lo aplico yo. Es de una línea y prueba que el arreglo de H1 es load-bearing:
- **Archivo:** `scripts/e2e/_verify-arranque-modulos.mjs`, línea 63.
- **Cambiar:** `ok = !!(estado && estado.login && (!exigeInitPWA || estado.initPWA) && fatales.length === 0);`
- **Por:** la misma línea con `&& estado.cargaFuera` añadido.
- **Resultado esperado SIN más cambios en la app:** la fila `sin app-2-login.js` pasa de `OK` a
  `FAIL` y el harness sale con **EXIT=1**. Si sale verde, el arreglo no está haciendo nada.

---

## Lo que NO alcancé a revisar

- **No audité la lógica interna de los 859 tests uno por uno**: probé que todos afirman algo y que
  sus poblaciones no son cero, pero la clase «la aserción es más floja que la propiedad» (el
  `proteína < 2 g/kg` de v428) solo se caza sabotaje a sabotaje, y eso me lo prohibía el encargo.
  Los 129 sabotajes existentes son la cobertura real de esa clase, y 126 de ellos siguen anclados.
- **No corrí los otros ~100 harnesses.** Muchos exigen login real (`_creds.mjs`) y el rate-limit de
  la cuenta QA; con cuatro agentes en el mismo árbol no me parecía prudente.
- **No repasé las Edge Functions ni el SQL** (área de Andrés DBA), salvo lo que tocan las matrices.
- **No verifiqué el CI en vivo** (habría que hacer push). El fichero es correcto y corre el mismo
  script que el hook, pero **CI no corre la suite dos veces**: corre en Ubuntu/UTC, que es la mitad
  que le importa. Está bien así, pero conviene saberlo.
- **Los dos hallazgos de la ronda anterior que siguen SIN EJECUTAR y confirmé hoy línea por línea:**
  `initPWA()` sin guarda (`app-2-login.js:1051`) y `sw.js:79` cacheando respuestas NO-OK +
  `app-7-community.js` ausente del `SHELL` (`grep -c "app-7" sw.js` → **0**). No los vuelvo a
  desarrollar: están enteros en `docs/auditoria-areas-2026-07-31/A1-codigo.md` (H1 y H4). Los traigo
  porque **son el mecanismo que hace REAL el escenario de H1**, no como relleno.
