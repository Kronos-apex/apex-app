# V3 — Código muerto y peso que no se usa (16.ª ronda, R16, 2026-09-28)

Área de Julián (QA estático) + Diego R. (CSS). Verifica una por una las 7 funciones que el
baseline dio por no-referenciadas, mide cuánto CSS no usa ninguna pantalla, cuánto pesan los
bloques de DATOS grandes que viajan dentro del JS, y cuánto ganaría —en milisegundos medidos con
CDP, no en KB— quitar los comentarios al publicar.

Sondas nuevas (no tocan ningún archivo de la app; las copias sin comentarios viven en una
carpeta temporal, NUNCA en el repo):
- `scripts/e2e/_r16-v3-comentarios.mjs` — sirve dos copias LOCALES de los 10 scripts (con y sin
  comentarios, estos últimos generados con `esbuild --minify-whitespace=false
  --minify-identifiers=false --minify-syntax=false`, que solo retira comentarios) y mide
  `performance.now()` dentro de la página + `Performance.getMetrics` del protocolo, con CPU ×4,
  intercalando A/B para no dejar que una deriva térmica favorezca a un lado, y un CONTROL (harness
  vacío) que prueba que la sonda puede medir cero cuando debe.
- Análisis de funciones sin referencia, CSS sin uso y bloques de datos: scripts de una sola
  corrida en `%TEMP%` (no versionados, no forman parte del repo — ver «Cómo reproducir» en cada
  hallazgo).

Puertos usados: HTTP locales 8890 (original) / 8891 (sin comentarios) / 8892 (vacío, control);
CDP 9501 / 9502 / 9503.

---

## Resumen en 5 líneas

Nada de esto le pesa al bolsillo de datos de nadie de forma dramática, pero hay un hallazgo
real: el catálogo de 374 ejercicios (`defaultExercises`) pesa **235 KB sin comprimir — el 59%
de todo `app-1-infra.js`, 47,5 KB ya comprimidos** — y viaja completo en CADA visita para TODO
el mundo, aunque un asesorado normal jamás abre la biblioteca de ejercicios (su rutina ya trae
sus propios ejercicios copiados). Como el proyecto invalida el caché entero con un solo número
de versión global (`?v=NNN`) en cada despliegue —y despliega varias veces por día—, ese medio
megabyte de datos que casi nunca cambian se vuelve a bajar completo con cada arreglo, así sea de
una sola línea en otro archivo. Quitar los comentarios al publicar (37% del JS) SÍ se midió con
Chrome real bajo CPU ×4: el efecto está dentro del ruido de la propia medición (mediana ~20 ms
sobre un total de ~100 ms, con corridas que dan hasta negativo) — **no vale la pena el riesgo de
un paso de build nuevo por una ganancia que no se puede distinguir del ruido**. El CSS muerto es
mínimo (2,7 KB de 228 KB, 1,2%) y no hay tablas ni funciones grandes duplicadas entre módulos
(barrido de coincidencias, cero encontradas). De las 7 funciones que el baseline marcó sin
referencia, 2 SÍ se ejecutan (son auto-invocadas al cargar, el heurístico de nombres no las ve),
2 solo las usa la suite de pruebas, y 3 están genuinamente muertas — pero las tres juntas pesan
menos de 400 bytes: el código muerto de funciones sigue sin ser el problema.

---

## Hallazgos

### H1 — El catálogo de 374 ejercicios pesa 235 KB y viaja completo en cada visita, para todo el mundo (🔴 el más serio)

**Medición.** `defaultExercises` (`app-1-infra.js:2044-2455`, verificado con un parser de
llaves/corchetes balanceado sobre el archivo real): **235.178 bytes sin comprimir = el 58,8% de
los 400.119 bytes de `app-1-infra.js`**. Comprimido de verdad (Node `zlib`, brotli calidad 11,
sobre el bloque exacto extraído): **47.546 bytes** — el 49,7% de los 95.775 bytes comprimidos que
pesa el archivo entero. Sin el catálogo, `app-1-infra.js` pesaría 164.941 B sin comprimir / 50.091
B comprimido, es decir **menos de la mitad**.

**Reproducir:**
```
node -e "
const fs=require('fs'),zlib=require('zlib');
const s=fs.readFileSync('app-1-infra.js','utf8');
let i=s.indexOf('const defaultExercises=['); while(s[i]!=='[')i++;
let d=1,k=i+1; while(k<s.length&&d>0){ if(s[k]==='[')d++; else if(s[k]===']')d--; k++; }
const b=s.slice(i,k);
console.log('raw',Buffer.byteLength(b,'utf8'),'brotli',zlib.brotliCompressSync(b).length);
"
```

**A quién afecta.** A TODO el mundo, en TODA visita — coach y asesorados por igual — porque
`app-1-infra.js` es uno de los 9 scripts que `index.html` carga siempre (arranque). Pero de las
pantallas reales, solo la usan la biblioteca del coach `#p-exercises`, el selector `#m-picker` y
el generador de rutinas (`generarRutinas`) — y, en boot, `migrateExercises`
(`app-2-login.js:10-62`) la recorre para sincronizar campos editados por el coach. **El
asesorado que abre "Hoy" para marcar sus series NO necesita este catálogo**: su rutina ya trae
sus propios ejercicios copiados con nombre/descripción/imagen (schema documentado en
`CLAUDE.md`: `routines[].exercises[]` incluye `desc`/`descSimple`/`imgUrl` propios). Verificado:
`defaultExercises` no aparece en ningún camino de render de `#cn-today`, `#cn-routines` ni el
guiado (`grep` de las funciones de esas pantallas contra el nombre del arreglo, cero coincidencias
fuera de `app-1-infra.js`, `app-2-login.js` boot y `app-4-entreno.js` que también lo usa solo para
el editor de ejercicios del coach).

**Causa en el código.** El catálogo vive como un array literal ENORME dentro del mismo archivo
que la lógica de infraestructura que cambia con cada corrección (login, push, sync). Como el
proyecto invalida caché con **un solo número de versión global** (`sw.js:1`, `CACHE_NAME =
'avi-vNNN'`, y CADA archivo del `SHELL` se pide con el MISMO `?v=` — verificado leyendo
`sw.js:14-15` e `index.html:1413-1425`, los 9 scripts llevan idéntico `?v=682` hoy), **cualquier
despliegue —así sea un fix de una línea en `app-6-extra.js`— fuerza a re-bajar `app-1-infra.js`
completo**, incluidos sus 47,5 KB de catálogo comprimido que casi nunca cambian (el catálogo se
edita en «lotes» documentados, no en cada versión). El proyecto despliega con mucha frecuencia:
la propia bitácora de CLAUDE.md muestra v679→v680→v681→v682 en el mismo día (27/28-sep).

**Propuesta.** Sacar `defaultExercises` a su propio archivo (`exercise-catalog.js`, cargado con
su propio `<script src="...">`, sigue siendo vanilla — el proyecto ya reparte la lógica en 9
archivos, esto no rompe «sin build/sin framework»). Con su PROPIA entrada en el `SHELL` de
`sw.js`, un despliegue que no toque el catálogo no cambiaría su `?v=` y el service worker seguiría
sirviéndolo desde caché — el ahorro es en las visitas de VUELTA después de un deploy que no tocó
ejercicios, no en la primera visita (que de todas formas necesita bajarlo una vez).
**Ganancia estimada con método explícito** (no medida con CDP: exigiría cambiar `sw.js`, fuera de
alcance de esta auditoría de solo-lectura): a la velocidad del perfil «teléfono gama media + 4G
lenta» del baseline (1,6 Mbps ≈ 209.715 B/s), volver a bajar 47.546 B cuesta **≈227 ms** de red
pura, más el tiempo de parseo/ejecución proporcional a su peso (9,4% de los 2,5 MB totales de JS;
sobre los ~100 ms de parseo+ejecución medidos en H2 para el bundle entero bajo CPU×4, ~9-10 ms).
Sobre un despliegue cualquiera que NO toque el catálogo, hoy ese medio segundo (227 ms) se paga
igual; con el archivo separado, se ahorraría siempre que el catálogo no haya cambiado. **Riesgo:
bajo** — es extraer un array a otro archivo, sin tocar su contenido; el trabajo real es actualizar
`index.html` (el `<script src>` nuevo) y `sw.js` (agregarlo al `SHELL` con su propio ciclo de
`?v=`), y decidir si su versión se bumpea junto con el resto o solo cuando el catálogo cambia
(si se bumpea siempre igual que hoy, la ganancia es CERO — el punto de la propuesta es justo
desacoplar su ciclo de caché del resto).

### H2 — Quitar los comentarios al publicar: medido con Chrome real, el efecto no se distingue del ruido

**Medición.** `node scripts/e2e/_r16-v3-comentarios.mjs`. Se generaron copias sin comentarios de
los 10 scripts con `esbuild --minify-whitespace=false --minify-identifiers=false
--minify-syntax=false` (SOLO retira comentarios, no reformatea ni acorta nombres — así se aísla
el efecto que pide el briefing, no el de una minificación completa). Tamaño: 2.611.638 B → 1.774.065
B (−32,1%, cerca del 37% de comentarios del baseline; la diferencia es que `esbuild` también
colapsa algunas líneas vacías). Se sirvieron ambas copias en local (nunca el repo) y se cargaron
intercaladas A(original)/B(sin comentarios), CPU ×4, 12 pares, midiendo `performance.now()` DENTRO
de la página entre el primer y el último `<script>` (`t0`→`t1`) y `Performance.getMetrics`
(`ScriptDuration`) del protocolo:

| | mediana t0→t1 | media | mín | máx |
|---|---|---|---|---|
| **con comentarios** | 115,0 ms | 125,4 ms | 69,0 ms | 300,5 ms |
| **sin comentarios** | 86,3 ms | 88,6 ms | 72,5 ms | 108,2 ms |
| **diferencia PAREADA** (orig−strip, por corrida) | **23,7 ms** | 36,8 ms | −17,3 ms | 204,0 ms |

Y por `ScriptDuration` del protocolo (métrica independiente, mismas 12 corridas): mediana
con-comentarios 22 ms, sin-comentarios 30 ms — **diferencia pareada −5 ms** (a favor del que SÍ
tiene comentarios). Las dos métricas se CONTRADICEN en signo. 2 de las 12 corridas de t0→t1
salieron con el original más RÁPIDO que la copia sin comentarios (ruido dominando la señal). El
**CONTROL** (harness vacío, sin cargar ningún script): mediana 0,0 ms, máx 0,1 ms — confirma que
la sonda SÍ sabe medir cero cuando corresponde, así que el ruido de arriba no es un defecto de la
sonda, es variabilidad real de Chrome/GC bajo CPU×4 en esta máquina.

**Reproducir:** `node scripts/e2e/_r16-v3-comentarios.mjs orig stripped empty 12` con `orig/`,
`stripped/` y `empty/` sirviendo en 8890/8891/8892 (servidor estático de una línea, HTTP simple,
sin caché).

**A quién afecta.** A nadie de forma perceptible: la diferencia mediana (24 ms con una métrica,
−5 ms con la otra) es menor que el margen de "una persona real SIENTE" (>100 ms) del propio
criterio de esta ronda, y más chica que la variación entre dos corridas consecutivas de la MISMA
copia (rango 69-300 ms solo con comentarios puestos).

**Causa.** El 37% de comentarios (918 KB de 2.475 KB) se salta con un escaneo de caracteres
barato en el parser de V8; el costo real de parsear+ejecutar el bundle lo dominan los ~1.557 KB de
código+datos reales (array/object literals grandes como `defaultExercises`, no los comentarios).

**Propuesta: NO construir un paso de publicación que quite comentarios.** Es exactamente el caso
que el briefing pide discutir con números: el ahorro medido está DENTRO del ruido de la propia
medición (una métrica da +24 ms, la otra da −5 ms sobre el mismo experimento), muy por debajo del
umbral de "se siente", y el costo de construirlo es real: un paso de build nuevo (aunque sea un
script de 10 líneas con `esbuild` vía `npx`) es la primera semilla de infraestructura de build en
un proyecto cuya restricción no negociable es "sin build en producción" — y el riesgo de que un
comentario mal detectado (regex/edge case de un parser casero, o una dependencia de `esbuild` que
deje de estar disponible) rompa un despliegue no se paga con esta ganancia. **Ganancia: ~0 ms,
indistinguible del ruido. Riesgo de construirlo: no vale la pena.**

### H3 — El CSS que ninguna pantalla usa: 2,7 KB de 228 KB (1,2%) — no es un problema real

**Medición.** Parser de reglas top-level de `styles.css` (1.517 bloques `selector{...}`
balanceados por llaves, @media excluidos de este barrido —ver «Qué NO miré»—). Por cada
selector se extraen sus tokens `.clase`/`#id` y se busca cada uno como subcadena CRUDA (sin
límite de palabra, para no fallar con clases compuestas) en el texto completo de los 9 scripts +
`index.html`. **31 reglas sin NINGÚN token encontrado en ningún archivo, 2.777 bytes en total**
(1,2% de 228.048 B). Las 10 más pesadas: `.cex-thumb-badge` (265 B), `.cex-thumb` (179 B+71 B),
`.pr-new` (158 B), `.set-log-head` (148 B), `.wu-note` (140 B), `.lcard` (127 B), `.wu-apx-card`
(124 B), `.wu-apx-pct` (115 B), `.adv-smrow-lbl` (107 B), `.adv-smrow-val` (106 B). Verificado UNA
por una con `grep -l` sobre todos los `.js`/`.html`: cero coincidencias, incluidas variantes
parciales (no son prefijos de una construcción dinámica).

**Causa y sample verificado.** `.adv-smrow-*` (7 reglas, ~410 B) y `.adv-sm` son el residuo del
desglose de subregiones EN LÍNEA de "Tu entrenamiento en números"
(`app-4-entreno.js`, cerca de la línea 4190): el propio comentario del código dice **"El desglose
de subregiones vive ahora dentro de la habitación"** — se reemplazó por `openMuscleRoom()` (una
pantalla dedicada) y la función que hacía el expandir/colapsar en línea, `cnToggleSub`
(`app-4-entreno.js:4206`), quedó huérfana junto con su CSS (ver H4 más abajo — es la MISMA causa
raíz apareciendo en dos capas). Los `.wu-apx-*` (7 reglas, ~584 B) parecen otro residuo similar
(prefijo consistente, siete reglas hermanas, cero uso), aunque no se identificó a qué feature
pertenecían originalmente.

**Falsos positivos de la heurística, verificados y descartados.** El briefing avisa de clases
armadas dinámicamente (`'mood-'+x`). Se buscó ese patrón real en el código
(`grep` de `'prefijo-'+variable` y `` `prefijo-${var}` `` en los 8 archivos JS): existen casos de
concatenación (`'sescard-'+s.id`, `'med-'+f.key`, `'avatar-'+String(clientId)`), pero los tres
construyen **atributos `id=`**, no `class=` — se usan para `document.getElementById`, nunca los
lee `styles.css`. Las clases CSS de este proyecto son siempre literales completos (verificado:
`class="${cls}"` con `cls` asignado desde un `if/else` de valores fijos como `'up'/'down'/'flat'`,
que SÍ aparecen como subcadenas en el código y por tanto los detecta bien la heurística). **No se
encontró ningún caso real donde el heurístico fallara por construcción dinámica** — a diferencia
de lo que el briefing advertía como riesgo típico, en este código las clases CSS nunca se arman
por partes.

**A quién afecta.** A nadie de forma perceptible — 2,7 KB sin comprimir es ruido frente a los
228 KB totales (62,9 KB comprimidos). No es un hallazgo serio por sí solo.

**Propuesta.** Borrar las 31 reglas listadas (empezando por `.adv-smrow-*`/`.adv-sm`, que se
puede atar directamente al `cnToggleSub` muerto de H4) cuando se toque esa zona por otra razón —no
amerita una sesión dedicada. **Ganancia: 2,7 KB sin comprimir, ~1 KB comprimido — no medible en
milisegundos.**

### H4 — Las 7 funciones «sin referencia» del baseline, una por una

Metodología: para cada una de las 1.595 funciones declaradas (`function nombre(` en los 12
archivos), se cuenta cuántas veces aparece su nombre como palabra completa en el resto del
código (raw, sin quitar comentarios, para no fallar como en el primer intento — ver «Lo que
tumbé»). Con **conteo crudo ≤1** (nadie más las nombra, ni en comentario) salen exactamente
**7**, el mismo número del baseline. Verificadas una por una contra `onclick=`, `window[...]`,
`avi.test.js`, `sw.js` y `scripts/e2e/*.mjs`:

| función | archivo:línea | veredicto | evidencia |
|---|---|---|---|
| `_aviMudanza` | `app-1-infra.js:73` | **usada dinámicamente** — IIFE auto-invocada (`(function _aviMudanza(){…})();`) que corre en CADA carga para decidir si redirige al hogar nuevo | su cuerpo está probado por `avi.test.js:21020,21467` (recorta el texto desde `'(function _aviMudanza(){'`), no llamada por nombre porque NO necesita que nadie la llame |
| `_aviLlegada` | `app-1-infra.js:98` | **usada dinámicamente** — mismo patrón, IIFE que procesa la llegada de la mudanza | probada en `avi.test.js` (3 sitios recortan su cuerpo); mencionada en `app-6-extra.js:63` solo en un comentario |
| `_coachSettingsObj` | `app-1-infra.js:466` | **muerta en producción, usada solo por el harness** — ningún `app-*.js`/`avi-core.js` la LLAMA (`grep` de `_coachSettingsObj(` con paréntesis: solo aparece la declaración); el comentario que la acompaña dice «queda para el arranque y para el respaldo», pero eso ya no es cierto (v589 la reemplazó por subir solo la clave que cambió) | SÍ la invoca en vivo `scripts/e2e/_verify-ajustes-coach.mjs:42,70` (`ev(...)` contra el navegador real) como oráculo de prueba |
| `verifyClientPass` | `app-2-login.js:182` | **genuinamente muerta** — cero referencias en cualquier archivo, incluida la suite | residuo del login client-side legacy; `doLogin` (línea 296) usa `AUTH.signInEmail` (Supabase Auth) desde el cutover v2.0 — CLAUDE.md lo confirma: «El login client-side legacy fue eliminado» |
| `convertToPremium` | `app-3-coach.js:1877` | **genuinamente muerta** — cero referencias | el propio comentario la llama «alias de compat del botón anterior»; los DOS botones reales de activar Premium llaman `setClientPlan(cid,'coach')` directo (`app-3-coach.js:1817` y `4200`) |
| `exMetaText` | `app-4-entreno.js:2010` | **muerta en la app, mencionada solo estáticamente por la suite** — `avi.test.js:18572` recorta su texto para comprobar que use `repsUnitOf`, pero nunca la EJECUTA (no hay `ev(...)`) | superada por `exSetsCellHTML` (línea 2018, comentario: «Antes se pintaba siempre "S×R"…») |
| `cnToggleSub` | `app-4-entreno.js:4206` | **genuinamente muerta** — cero referencias | el comentario 3 líneas arriba de dónde se armaba su fila lo dice: «El desglose de subregiones vive ahora dentro de la habitación» — reemplazada por `openMuscleRoom('${clientId}','${g.group}')`, su CSS asociado (`.adv-sm*`) es parte de H3 |

**A quién afecta.** A nadie — las 3 genuinamente muertas (`verifyClientPass`, `convertToPremium`,
`cnToggleSub`) pesan **367 bytes juntas** sin comprimir. Esto CONFIRMA el baseline: «el código
muerto de funciones no es el problema grande». Lo único que vale la pena señalar es la trampa
para quien mire esta lista sin verificarla: **borrar `_aviMudanza` o `_aviLlegada` porque
"nadie las llama" rompería la mudanza entera de sesión entre las dos direcciones de la app** —
son las funciones más peligrosas de tocar de las siete, precisamente porque el heurístico de
nombres no puede distinguir una IIFE de una función huérfana.

**Propuesta.** Borrar los 3 genuinamente muertos (`verifyClientPass`, `convertToPremium`,
`cnToggleSub`) la próxima vez que se toquen esos archivos por otra razón. **Ganancia: <400 bytes
— no amerita una sesión dedicada.** Dejar `_coachSettingsObj` (la usa el harness) y NUNCA tocar
las dos IIFE sin releer su código primero.

### H5 — AVI_NEWS: 20 entradas de hasta 300 versiones de antigüedad, y `slice(0,3)` recorta al final

**Medición.** `AVI_NEWS` (`app-6-extra.js:3159-3225`): **10.904 bytes**, 20 entradas con versión
desde `v:316` hasta `v:639` (verificado con `grep -oE "v:[0-9]+"` y ordenado). `newsToShow`
(`avi-core.js:4763-4772`) filtra `n.v > seen` y recién DESPUÉS recorta con `.slice(0,3)` — el
recorte SÍ va al final (la clase de bug de v508 «un recorte antes del filtro por audiencia» está
cerrada aquí). Pero el filtro por versión significa que solo un usuario cuyo `seenV` sea menor a
`v:639` ve ALGO, y solo ve como máximo 3 (las 3 más nuevas por encima de su `seen`) — el resto del
array (típicamente 17-19 de las 20 entradas) se descarga y se parsea en cada boot para NO
mostrarse jamás a nadie que ya haya abierto la app después de esa versión.

**A quién afecta.** A todos, en cada boot (está en `app-6-extra.js`, uno de los 9 scripts siempre
cargados) — pero el costo real es minúsculo: 10,9 KB sin comprimir es el 2,7% de `app-6-extra.js`
(215 KB) y bajo el 0,5% del total de la app.

**Causa.** El propio comentario del código (línea 3158) documenta la intención: «podar viejas (tope
3 vía `newsToShow`)» — pero podar significa BORRAR entradas del array fuente cuando ya nadie las
puede ver (todo usuario activo tiene `seenV` > esa versión), y eso no se hace: el array solo CRECE.

**Propuesta.** Podar del array las entradas cuyo `v` sea menor que la versión mínima que cualquier
usuario activo pueda tener como `seenV` (un corte conservador, p. ej. todo lo anterior a las
últimas ~10 versiones publicadas de novedades) la próxima vez que se agregue una entrada nueva.
**Ganancia: unos pocos KB sin comprimir, no medible en milisegundos** — se incluye aquí porque es
exactamente el patrón que el propio proyecto se pidió a sí mismo evitar («agregar entrada... y
podar las viejas», `app-6-extra.js:3158`) y no se está cumpliendo; es deuda que sigue creciendo con
cada versión nueva, no un hallazgo de peso por sí solo.

---

## Lo que tumbé

- **Mi primer intento de contar referencias de funciones "quitando comentarios" dio 56
  candidatos, no 7.** El «stripper» de comentarios casero (regex + máquina de estados sobre
  comillas) trataba mal `index.html`: las URLs con `//` (`https://...`) las leía como inicio de
  comentario de línea y borraba el resto de esa línea, incluidos `onclick="saveClient()"` reales.
  Al repetir SIN quitar comentarios (raw, con límite de palabra) salieron exactamente 5 con
  conteo ≤1, y filtrando también "referenciada solo dentro de un comentario" (que el baseline SÍ
  cuenta como no-referenciada) subió a 7 — coincide con el baseline. **Lección: un stripper de
  comentarios de JS no se puede reusar sobre HTML sin adaptarlo (las URLs rompen el supuesto de
  que `//` siempre es un comentario).**
- **Busqué activamente clases CSS armadas por partes (`'prefijo-'+variable`) porque el briefing
  avisa de ese riesgo** (`'mood-'+x`). Encontré 4 casos reales de concatenación de prefijo+variable
  en el código, pero los cuatro construyen **`id=`**, no `class=` — ninguno afecta al barrido de
  CSS. No until pude reproducir el escenario de riesgo que el briefing describe; queda documentado
  que en ESTE código las clases CSS siempre son literales completos.
- **Busqué tablas o funciones grandes duplicadas entre los 8 módulos** (ventanas de 150
  caracteres con paso de 40, comparadas por hash entre TODOS los pares de archivos): **cero
  coincidencias cruzadas de archivo.** También cero nombres de función declarados en más de un
  archivo. No hay duplicación de lógica/datos grande entre módulos que valga la pena reportar
  como hallazgo — descartado tras medir, no asumido.
- **La hipótesis "quitar comentarios ahorra tiempo perceptible" se midió con Chrome real bajo
  CPU×4, intercalado, con control — y la tumbó la propia medición**: dos métricas independientes
  (tiempo de pared dentro de la página vs `ScriptDuration` del protocolo) dan resultados de SIGNO
  OPUESTO sobre las mismas 12 corridas. Ver H2.

## Qué NO miré

- **El CSS dentro de `@media {}` (24 bloques, ~6,4 KB del total de 228 KB, el 2,8%)**: mi parser
  trata cada `@media` como un bloque opaco y no baja a auditar los selectores de adentro (dark
  mode, responsive). Es poco peso (6,4 KB máximo posible), pero no está verificado si hay CSS
  muerto ahí también.
- **No repetí la medición de H2 con un perfil de red lento ni con "primera visita"** (sin caché):
  medí solo el costo de PARSEAR+EJECUTAR con los archivos ya en el disco local, que es la parte
  que el paso de quitar comentarios podría afectar; el costo de RED de bajar 918 KB de comentarios
  menos (si se comprime, el ahorro real es mucho menor — los comentarios en prosa comprimen bien)
  no se midió por separado.
- **No medí el costo real de la propuesta de H1** (separar `defaultExercises` a su propio
  archivo) con un despliegue de prueba real: exigiría tocar `index.html` y `sw.js`, fuera de
  alcance de una auditoría de solo lectura. La ganancia está estimada con método explícito (regla
  de tres sobre bytes/ancho de banda del baseline), no medida con CDP contra una versión separada.
- **No verifiqué NUT_FOODS (22 KB), GLOSS (5,3 KB), HELP_SECTIONS (4,7 KB), EX_LEVEL (5,2 KB)**
  más allá de medir su tamaño y confirmar que cada uno solo lo usa el módulo donde vive: son
  chicos comparados con el catálogo de ejercicios (H1) y no llegan al umbral de «hallazgo serio».
- **No probé en un teléfono real**, como todas las rondas anteriores — todo esto es Chrome
  headless en escritorio con CPU throttling emulado.
