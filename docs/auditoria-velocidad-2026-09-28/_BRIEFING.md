# BRIEFING COMÚN — auditoría «PESO Y VELOCIDAD» (16.ª ronda, R16, 2026-09-28)

Lee este archivo completo antes de hacer nada. Aplica a las 3 áreas (V1, V2, V3).

El encargo del PO se juzga con el criterio de siempre: **«auditorías serias, nada genérico»**. Un informe
lleno de buenas prácticas genéricas («minifica», «usa lazy loading», «optimiza imágenes») sin una medición
propia y una persona real afectada se considera FALLIDO aunque esté bien escrito.

---

## Por qué existe esta ronda

El PO preguntó el 28-sep: *«¿hemos hecho alguna revisión de código muerto o código que se pueda optimizar,
código que haga lenta la app, o features que podamos mejorar?»*. La respuesta honesta fue **no, nunca**: las
15 rondas anteriores miraron seguridad física, datos, cuentas, calentamiento, lesiones y la web, y ninguna
midió cuánto pesa AVI ni cuánto tarda. Y cada informe dejó escrito «ningún teléfono real» en su «Qué NO miré».

| Área | Qué cubre | Quién |
|---|---|---|
| **V1** | **Arranque y red**: qué espera la app CADA VEZ que se abre, qué baja por la red en la primera visita y en las siguientes (asesorado y coach), qué bloquea la primera pintura, el service worker. | Camila (engineer) + Julián (QA estático) |
| **V2** | **Pantallas y memoria durante el uso**: qué toques tardan en responder (tareas largas) con un teléfono de gama media emulado: el entreno guiado, el historial, las gráficas, el panel del coach con todos sus asesorados, Comunidad; y cómo crece la memoria y el trabajo con 365 sesiones de historial. | Lucas (QA funcional) |
| **V3** | **Código muerto y peso que no se usa**: funciones, CSS y tablas que viajan y nadie usa; cuánto del peso es comentario; qué ganaría de verdad (en milisegundos, no en bytes) quitar lo que sobra. | Julián (QA estático) + Diego R. (CSS) |

---

## El producto (lo mínimo)

AVI es una PWA de entrenamiento (vanilla JS sin build: `index.html` + `app-1..7-*.js` + `avi-core.js` +
`styles.css`, supabase-js local en `vendor/`) de Camilo Andrés, entrenador en Guaduas. Supabase proyecto
**`eoebhrxbokyllqalyecj`**. Vive en dos direcciones, las dos en **avi-v682**:
`https://kronos-apex.github.io/apex-app/` y `https://app.avientrena.com/` (la que usan casi todos).
~20 asesorados activos + el coach, que también entrena con la app. La mayoría usa Android de gama media;
dos asesoradas usan iPhone con la app instalada desde github.io.

## MAPA (verificado contra HEAD hoy)

- Arranque: `index.html` carga los 9 scripts en orden; `syncFromCloud()` (`app-1-infra.js:1698`) baja todo
  al arrancar; el boot real (`initPWA`, tema, sesión) corre DENTRO de `syncFromCloud().then(…)`
  (`app-2-login.js:1250`). El símbolo que dice «arranque terminado» es `window._aviUpdateBusy`
  (lo define `app-6-extra.js:39`). **Gotcha v624: el DOM presente NO es la app arrancada.**
- Service worker `sw.js`: `CACHE_NAME='avi-v682'`, precachea `SHELL` al instalar (línea 15 y 28).
- Entreno guiado: `gmRender` (`app-6-extra.js`) **repinta la lista ENTERA con cada toque** (por diseño,
  gotcha «lo que la persona abrió tiene que sobrevivir al repintado»).
- Datos por persona: una fila en `user_data` con columnas `profile`, `routines`, `history` (hasta 365
  sesiones), `prs`, `bodyweight`, `medidas`, `nutrition`, `photos`, `msgs`, `templates`, `coach_settings`.
- Herramientas que YA existen: `scripts/e2e/_medir-arranque.mjs` (la de este baseline),
  `_prodcheck.mjs`, `_capturas-web.mjs` (monta una asesorada INVENTADA en local sin login: el molde para
  medir pantallas con datos sintéticos), `_guiado-suite.mjs` (login con la cuenta QA).
- Respaldos: `C:/Users/KRONOS/Desktop/AVI/backups/avi-backup-2026-09-27.json` (los datos reales de ayer:
  úsalos para dimensionar, NUNCA los copies a un informe con nombres; enmascara).

---

## BASELINE MEDIDO HOY (28-sep) — créelo, NO lo vuelvas a medir

### Peso que baja al teléfono (unidad: bytes servidos por app.avientrena.com, curl)
| archivo | sin comprimir | comprimido (br/gzip) |
|---|---|---|
| avi-core.js | 815.549 | 294.881 |
| app-1-infra.js | 400.119 | 119.715 |
| app-4-entreno.js | 329.646 | 111.806 |
| app-3-coach.js | 320.974 | 107.365 |
| styles.css | 228.048 | 62.855 |
| vendor/supabase-js | 217.945 | 57.215 |
| app-6-extra.js | 215.241 | 74.943 |
| app-5-salud.js | 188.909 | 62.977 |
| index.html | 170.376 | 43.840 |
| app-2-login.js | 153.119 | 51.178 |
| app-7-community.js | 140.571 | 40.978 |
| (otros: muscle-map, exercise-muscles, sw, foods.json) | 107.002 | 28.372 |
| **TOTAL** | **3.210 KB** | **1.031 KB** |

- **El 37 % del JavaScript son comentarios de línea** (918 KB de 2.475 KB). Son la memoria de por qué se
  decidió cada cosa: NO son código muerto y no se borran del repo; la pregunta es si deben VIAJAR.

### Arranque (unidad: milisegundos hasta pantalla de entrada pintada Y `_aviUpdateBusy`, SIN sesión iniciada)
Medido con `_medir-arranque.mjs` contra app.avientrena.com, Chrome headless, 412×915:
| perfil | 1.ª visita | 2.ª visita (service worker ya instalado) |
|---|---|---|
| escritorio sin freno | 7.094 | **4.420** |
| teléfono gama media: CPU ×4 + 4G lenta (1,6 Mbps, 150 ms) | pintó a los **18.229**; `_aviUpdateBusy` **no llegó en 2 min** | **5.131** |
| teléfono gama media: CPU ×4, red buena | 6.282 | **4.451** |

- Por la red en la 1.ª visita: **~2.918 KB** codificados (más que el total comprimido de arriba: fuentes,
  imágenes y lo que el service worker baja al instalarse — por explicar).
- **Tiempo de CPU en tareas: 173–752 ms**. O sea: **ejecutar el JavaScript NO explica los ~4,4 s** que tarda
  la app en quedar lista cada vez que se abre, incluso en un computador rápido. (Hipótesis del orquestador,
  NO hallazgo: el arranque espera la red a Supabase; la gotcha de v624 ya decía «~4 s por la red».)
- **Sin medir:** el arranque CON sesión iniciada (el caso real de todos los días), y el del coach.

### Datos por persona (unidad: KB de JSON de su fila en `user_data`, respaldo del 27-sep)
- Mediana de un asesorado: **63 KB**. Los más pesados: 191, 178, 175 (casi todo `history`).
- **El coach: 533 KB** su propia fila (history 224 KB; el resto sin desglosar).
- Dos asesorados tienen **80–88 KB en `photos`** (¿base64 viejo que no se migró? por verificar).
- Todas las fichas juntas: **2.427 KB** (lo que baja el coach si pide todas: por medir).

### Código muerto (unidad: funciones `function nombre(` declaradas en los 12 archivos de la app)
- **1.595 funciones declaradas; solo 7 no las nombra nadie más** en la app (sin contar comentarios), y 4 de
  esas las usa la suite. Heurística de nombres: no ve llamadas por texto armado. **El código muerto de
  funciones NO es el problema grande** — no lo vendas como tal sin medir otra cosa.

---

## FALSOS POSITIVOS CONOCIDOS (no los reportes como hallazgo)
1. **Los comentarios no son código muerto.** Son documentación viva por decisión del proyecto.
2. **«Pasar a un framework / usar un bundler / npm»**: prohibido por las restricciones del proyecto (vanilla,
   sin build en producción). Un paso de «quitar comentarios al publicar» SÍ es discutible: si lo propones,
   di cuánto ahorra EN MILISEGUNDOS medidos en el teléfono emulado, no en KB.
3. **2.ª visita con 0 KB por la red**: es el service worker funcionando.
4. **El `_aviUpdateBusy` tardío** respecto al DOM: gotcha v624; mide el símbolo, no el DOM.
5. **`gmRender` repinta todo**: es a propósito. Es hallazgo SOLO si mides un toque que tarde > 100 ms en un
   teléfono de gama media emulado, con cuántos ejercicios y cuánto historial.
6. **Comunidad está CONGELADA**: se miden sus costos (si pesa en el arranque de todos, eso importa), no se
   proponen features.
7. **La anon key y la URL de Supabase en el JS**: por diseño.

## Qué es un hallazgo SERIO
- Una espera que una persona real SIENTE: > 1 s de más al abrir, o un toque que tarda > 100 ms en responder
  (tarea larga), en un teléfono de gama media emulado (CPU ×4) — con el camino exacto y el número.
- Algo que CRECE con el tiempo y ya afecta a alguien: el historial de 365 sesiones, fotos en base64 dentro de
  la fila, mensajes; di a quién (enmascarado) y cuánto.
- Bytes que cuestan SEGUNDOS (no KB que no cambian nada): demuéstralo con la medición antes y después.
- Algo que se baja o se ejecuta y no se usa en esa pantalla, con cuánto cuesta.
- Una medición que contradice el baseline.

**Tumba tus propios hallazgos antes de escribirlos, y escribe cómo lo intentaste.** Las pistas del
orquestador son hipótesis: en rondas anteriores varias las tumbaron los agentes. Toda sonda lleva un
CONTROL que demuestre que puede fallar (lección de hoy: una sonda de contraste aprobó tres veces en
falso hasta que un control la cazó).

## REGLAS DURAS
1. 🔒 **SOLO LECTURA contra producción.** Nada de escribir en Supabase. Si necesitas sesión iniciada, usa
   SOLO la cuenta QA (`scripts/e2e/_creds.mjs` la lee de `~/.avi/e2e-creds.json`); **nunca** un asesorado
   real. En localhost la escritura a la nube está sellada (v298); no toques `AVI_ALLOW_CLOUD_WRITE`.
2. **Rate limit del login: 2–3 min entre corridas con login.** Un solo `doLogin`, nunca encima de otro.
3. **NO edites NINGÚN archivo de la app** (`*.js`, `index.html`, `styles.css`, `sw.js`). Tus sondas van en
   archivos NUEVOS `scripts/e2e/_r16-<tu área>-*.mjs`. Nada de matrices de sabotaje (mutan archivos que
   otros están leyendo).
4. **Puertos propios** para no chocar: V1 = 9480-9489 y 8880-8884 · V2 = 9490-9499 y 8885-8889 ·
   V3 = 9500-9509 y 8890-8894. Mata tu Chrome y tu servidor al terminar (nunca `head` sobre un harness).
5. Datos reales: enmascara nombres (inicial + 3 letras) y no pegues filas.
6. Todo número nombra su UNIDAD (bytes, KB, ms, filas, sesiones). Tres cifras del baseline de otra ronda las
   tumbaron los agentes por no nombrar la unidad.

## ENTREGABLE (uno por área, en esta carpeta: `V1-arranque-red.md`, `V2-pantallas-memoria.md`, `V3-codigo-peso.md`)
1. **Resumen en 5 líneas** para el PO (lenguaje de producto: qué siente la persona).
2. **Hallazgos** ordenados por lo que siente la persona: cada uno con la medición (unidad, perfil, cómo
   reproducirla con tu script), a quién afecta, la causa en el código (archivo:línea) y **una** propuesta
   concreta con lo que ganaría (ms medidos o estimados con método explícito) y lo que arriesga.
3. **Lo que tumbaste** (hipótesis que no se sostuvieron) y cómo.
4. **Qué NO miré.**
