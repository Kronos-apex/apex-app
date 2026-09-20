# E3 · El editor del coach y lo que NO se mide — Mateo Sanín (Data) + Valentina Ríos (PM)

## Veredicto en una frase

El editor arma el calentamiento de forma honesta y sin caminos sin salida reales, pero su único
freno de seguridad es completamente **pasivo** — y hoy, en este mismo momento, el propio coach
entrena con una bisagra de cadera metida en su calentamiento, seis días después de lesionarse
haciendo exactamente ese movimiento; la ceguera de si alguien calienta, en cambio, **no vale la
pena cerrarla todavía**: no bloquea ninguna decisión real y el único caso donde habría importado
(la lesión del propio coach) resultó no tener nada que ver con AVI.

---

## Los 3 más grandes

### 1. 🔴 El aviso naranja del calentamiento manual es pasivo — y HOY el propio coach entrena una bisagra de cadera contra su propia lesión

**Qué es:** cuando el coach arma un calentamiento a mano, la app **nunca se lo filtra** (decisión
deliberada, documentada en `avi-core.js:808-811`): en su lugar pinta un chip naranja
(`_rfWarmChip`, `app-3-coach.js:3626`) SOLO cuando alguien **reabre el editor de esa rutina**. No
hay ningún mecanismo que avise cuando una limitación **nueva** entra en conflicto con una lista
**ya guardada**. El aviso solo existe si alguien va a buscarlo.

**A quién le pasa HOY:** a **Andres Martínez, el propio coach**. Su lista manual «Full body
funcional» se creó el **10-sep-2026** con estos 14 movimientos: `wh1 wh2 wc1 wc2 wr1 wr2 wt1 wt2
wm1 wm2 we5 we1 wa1 wai3`. El **14-sep** reportó una lesión con **bandera roja** (`R5`, triaje 4,
`inicio:"traumatismo"`) en «muslo por detrás», corregida el 15-sep de una zona equivocada («muslo
por dentro (aductores)») a la correcta. Verificado hoy con SQL contra producción (tabla
`user_data`, proyecto `eoebhrxbokyllqalyecj`):

```json
{"at":"2026-09-14T14:24:53Z","area":"muslo por detrás","exId":"e14","exName":"Peso Muerto Rumano",
 "flags":["R5"],"level":3,"triaje":4,"corregido":true,"corregidoAt":"2026-09-15T11:38:11Z"}
```

`avi-core.js:9781` mapea `'muslo por detrás': ['lumbar', 'isquios']`. Esa entrada sigue **ACTIVA**
hoy (`painCareActive`, TTL de 14 días desde el `at`, `avi-core.js:3651-3654` — han pasado 6). Su
lista de calentamiento contiene **dos ids que `WARMUP_ZONE_EXCL_IDS.lumbar` excluye explícitamente**
(`avi-core.js:791-800`: `lumbar: ['we3','we5','wai3','wac3']`):

- **`we5` «Rollitos sobre colchoneta»** — flexión de columna con balanceo sobre la espalda baja.
- **`wai3` «Peso muerto con peso corporal»** — *«Inclinación de cadera sin barra... practica la
  bisagra de cadera y activa el femoral»* (`app-6-extra.js:2299`). Es la MISMA bisagra de cadera
  del Peso Muerto Rumano (`e14`) — el ejercicio con el que se lesionó.

Como es una lista MANUAL, ninguno de los dos se filtra nunca, y cuando él entrena su propia rutina
(«Mi entrenamiento»), el calentamiento que ve en pantalla incluye ensayar la bisagra de cadera. El
chip que avisaría de esto **no se muestra en la pantalla de entreno** — solo existe dentro del
editor de rutina, y solo si alguien lo abre.

**Cómo intenté tumbarlo:**
- ¿Se corrigió la lista después del 14-sep? La lista se creó el 10-sep y no hay marca de edición
  posterior visible en el dato (no hay `updatedAt` por rutina); lo único seguro es que el chip,
  si él la reabrió, la habría mostrado — pero nada le avisó proactivamente de que su NUEVA lesión
  chocaba con su lista VIEJA.
- ¿Es un movimiento seguro pese al patrón? No es un juicio mío: `wai3` está en la lista de exclusión
  de `lumbar` que la propia Laura dictó (`WARMUP_ZONE_EXCL_IDS`). El criterio clínico ya dice que
  no debería estar ahí para alguien con esa lesión.
- ¿Es un caso aislado sin importancia? No: es el ÚNICO reporte de dolor con bandera roja de toda la
  base, y es del propio dueño del negocio.

**Qué costaría arreglarlo:** no hay que tocar el filtro (eso es decisión de Laura/E2 y ya está
resuelto para las listas automáticas). Lo barato y de alto impacto es una alerta activa: cuando se
guarda un reporte de dolor nuevo, comprobar si alguna rutina VIGENTE de esa persona tiene lista
manual con ids que ahora caen en `WARMUP_ZONE_EXCL_IDS` de la zona reportada, y avisar — reusando el
mismo canal que ya existe para limitaciones del auto-registro (v552: mensaje al hilo + push, una
sola vez). Es una función pura nueva (`manualWarmupConflicts(client, allRoutines)`) + un `if` en el
punto donde se guarda `painCare`. Medio día de trabajo, no una feature nueva.

---

### 2. ⚪ La ceguera del cumplimiento (0/503) — medida con cuidado, y la conclusión es NO instrumentarla todavía

**Qué es:** ninguna de las 503 sesiones de `history` guarda nada del calentamiento; el estado
(`wu_<rid>_<exId>`, `wuopen_<rid>`) vive solo en `localStorage` del teléfono y se borra por día. Ni
el coach, ni la app, ni Laura pueden saber quién calienta.

**El error que NO cometo:** de este cero no se sigue que nadie caliente. Es un cero **sin
instrumento**, tal como advierte el briefing. Antes de opinar, medí dos proxies con SQL de solo
lectura, con su control de discriminación declarado:

**Proxy 1 — duración de sesión** (¿las 6 rutinas con lista manual se entrenan distinto?):

| grupo | sesiones | duración media | duración mediana | series promedio |
|---|---|---|---|---|
| auto-derivado | 253 | 66,6 min | 61,6 min | 22,4 |
| lista manual | 45 | 61,9 min | 62,1 min | 19,4 |

Cobertura: 394 de 503 sesiones (78%) se pudieron atar a una rutina que todavía existe (109 quedaron
huérfanas porque su rutina se editó/regeneró desde entonces — no son evidencia de nada, son ruido
de cobertura). De esas, 378 traían `durationSec`.

**Control de discriminación — Y AQUÍ SE CAE EL PROXY:** el grupo "lista manual" con sesiones reales
son solo **3 personas** (Claudia, Estella, Danilo — la lista del propio coach es del 10-sep y no
tiene ni una sesión registrada todavía, es demasiado nueva). Con N=3 personas no hay manera de
separar "calienta distinto" de "esta persona en particular entrena distinto" — la mediana de
duración es prácticamente IDÉNTICA entre los dos grupos (61,6 vs 62,1 min, 0,8% de diferencia) y la
diferencia en series (22,4 vs 19,4) se explica mejor por quién es cada persona que por el
calentamiento. **N=3 está muy por debajo del mínimo de 10 que exijo para concluir algo** (regla
propia: N=1 nunca es tendencia).

**Proxy 2 — % de series completadas** (¿el grupo con lista manual entrena "mejor"?):

| grupo | sesiones | % completado promedio | % sesiones finalizadas |
|---|---|---|---|
| auto-derivado | 349 | 90,7% | 54,7% |
| lista manual | 45 | 100,0% | 77,8% |

Esto SE VE como una señal fuerte a favor del calentamiento manual. **La tumbé antes de creérmela**:
es casi con certeza **causalidad al revés**. El coach le arma calentamientos a mano a las personas
en las que ya invierte más atención (Claudia y Estella llevan meses de plan estable, con 57 y 58
sesiones históricas cada una) — no es que la lista manual las vuelva más disciplinadas, es que ya
eran las más disciplinadas y por eso se ganaron una lista a medida. Con N=3 no hay forma de separar
esto. **Reportar esto como "el calentamiento manual mejora la adherencia" sería exactamente el
error que Mateo tiene prohibido** (confundir correlación con causalidad, concluir con N<10).

**Veredicto de Valentina (framework de 3 dimensiones):**

| Dimensión | Puntaje | Por qué |
|---|---|---|
| Impacto en negocio | 1 | Nadie ha pedido este dato; no hay evidencia de que cambie una decisión de cobro o retención |
| Impacto en usuario | 1 | El asesorado no ve nada distinto si esto se construye |
| Costo técnico | 2 | Bajo-medio: un campo más en el objeto de sesión que YA se sincroniza (`ax_hist`), pero hay que escribirlo de forma progresiva (no solo al terminar — la clase de bug que ya le costó a AVI los récords perdidos en v483) |

**El caso que casi lo justifica, y por qué no lo hace:** el único reporte de dolor real de toda la
base es el del propio coach. Si el motivo hubiera sido "se lesionó calentando mal", este sería el
ejemplo perfecto de "esta ceguera le costó algo a alguien". No lo es: `inicio:"traumatismo"` y el
propio hallazgo #1 muestra que la lesión fue un tirón muscular reportado con bandera roja urgente
(la nota del repositorio del 20-sep lo confirma: *"un tirón al arrancar ES un traumatismo",
"arrancando una carrera jugando fútbol"* — o sea, **la lesión no ocurrió entrenando en AVI**).
Incluso en el caso más favorable posible para construir esto, el dato no habría cambiado nada.

**Decisión: 🟡 HACER DESPUÉS, no ahora.** Se reabre si: (a) Laura pide el dato para decidir algo
clínico concreto, (b) alguien se lesiona de verdad calentando y el coach necesita reconstruir qué
pasó, o (c) el coach lo pide explícitamente. Ninguna de las tres está pasando hoy.

---

### 3. 🟡 «+ Agregar movimiento» cierra el selector en cada toque — construir una lista de más de 1 movimiento cuesta el doble de lo necesario

**Qué es:** `rfWarmAdd(id)` (`app-3-coach.js:3645-3653`) siempre termina con `cm('m-warmpick')`,
que **cierra el modal del selector** (`cm(id){document.getElementById(id).classList.remove('on')}`,
`app-4-entreno.js:4323`) — pase lo que pase, incluso cuando el movimiento no tenía ninguna
advertencia que confirmar. Para armar una lista de 4 movimientos, el coach necesita: abrir el
selector → tocar 1 → se cierra → tocar «+ Agregar movimiento» otra vez → abrir → tocar 2 → se
cierra... **8 toques para 4 movimientos**, en vez de 5 (abrir una vez + 4 toques).

**A quién le pasa HOY:** a cualquier coach que intente armar una lista manual de más de un
movimiento — que, dado que solo 6 de 124 rutinas (4,8%) tienen lista propia, es un grupo pequeño
pero es exactamente el grupo que la feature existe para servir. No tengo forma de probar que esta
fricción es LA causa de la baja adopción (la explicación más simple sigue siendo que el
auto-derivado ya resuelve el 95% de los casos sin que nadie tenga que tocar nada), pero es un costo
real, medido en el código, indiscutible.

**Cómo intenté tumbarlo:** revisé si tal vez el cierre es intencional (para forzar al coach a
revisar la lista actualizada antes de seguir agregando) — es plausible como intención de diseño,
pero el costo en toques es el mismo sin importar la intención, y no hay ningún texto ni comentario
en el código que lo explique como decisión consciente.

**Qué costaría arreglarlo:** quitar el `cm('m-warmpick')` de `rfWarmAdd` y dejar el selector
abierto (los ítems ya agregados se re-pintan como "usados" con el ✓, así que el coach ve el
progreso sin perder su lugar). Cambio de una línea; sin riesgo, sin necesidad de migración.

---

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | El aviso de calentamiento manual conflictivo es pasivo; hoy el coach entrena una bisagra de cadera (`wai3`) contra su propia lesión activa de lumbar/isquios | `app-3-coach.js:3626` (`_rfWarmChip`), `avi-core.js:791-800` | Sí — Andres Martínez, el propio coach |
| 🟡 | El chip de aviso, dentro del selector (`openWarmPicker`), queda a `opacity:.45` en los ítems ya usados → contraste ≈2,2:1 (claro) / ≈2,5:1 (oscuro), muy por debajo del mínimo WCAG de 4,5:1 | `app-3-coach.js:3663` | Estructural — no hay evidencia de que alguien lo haya mirado hoy en ese estado exacto, pero la lista del propio coach calificaría si él reabre el selector |
| 🟡 | `rfWarmAdd` cierra el selector en cada toque, encareciendo construir listas de >1 movimiento | `app-3-coach.js:3645-3653`, `app-4-entreno.js:4323` | No hay víctima con nombre — es un costo de fricción, no un bloqueo |
| 🟢 | «Círculos de muñeca» existe dos veces en el picker (ids `wh5` y `wm1`, pools distintos) con el mismo nombre y distinto ícono | `app-6-extra.js` (`WARMUP_LIBRARY`) | No — dato ya medido por el orquestador como "sin veredicto pedido"; cosmético, no confunde el resultado |
| ⚪ | 0/503 sesiones guardan algo del calentamiento — ceguera total, sin instrumento | `history` (Supabase) | Ver Los 3 más grandes #2 — decisión: no construir todavía |

---

## Lo que verifiqué y está SANO (con números)

- **Las tres "apariencias" de estado (`warmup:[]`, sin la clave, lista propia) son en realidad DOS
  estados funcionales, idénticos en las dos puntas.** Verificado con SQL contra las 124 rutinas
  reales: 70 con `warmup:[]` + 48 sin la clave = 118 (95%), y las dos formas colapsan al MISMO
  resultado en el cliente (`app-6-extra.js:2475-2476`: `customIds=(routine.warmup)||null;
  custom=(customIds&&customIds.length)?...:null` — un array vacío también cae a `null`) y en el
  editor del coach (`app-3-coach.js:3491`: `CUR.routineWarmup=(r.warmup&&r.warmup.length)?...:null`).
  **No hay tercer estado real**, y la diferencia entre "vacío explícito" y "sin clave" es solo un
  rastro de si esa rutina alguna vez pasó por `saveRoutine` (que siempre escribe la clave) o nació
  del generador (`generarRutinas`, que nunca la escribe) — sin consecuencia funcional.
- **Reabrir una rutina para editarla muestra HONESTAMENTE lo que el asesorado ve.** Si la rutina
  tiene `warmup:[]` o sin clave, el editor auto-deriva EN VIVO (mismos ejercicios, mismas
  limitaciones actuales) y pinta el aviso "Sugerido según los músculos de la rutina" — no hay
  ningún estado guardado que se pierda ni se invente al reabrir. El merge `{...existing,...rutData}`
  de `saveRoutine` (`app-3-coach.js:3703`) siempre trae un `warmup` fresco calculado de
  `CUR.routineWarmup` en ese momento, así que no puede quedar una versión vieja pisada por el spread.
- **El "camino sin salida" que sospechaba no es tal — es una limitación real pero HONESTAMENTE
  dicha.** Si el coach borra el último movimiento de una lista propia (`rfWarmDel`), no hay forma
  de dejar la rutina con "cero calentamiento": el estado colapsa a auto-derivado, y el texto que se
  muestra — *"Sin movimientos — la app auto-sugiere el calentamiento"* — describe EXACTAMENTE lo
  que va a pasar al guardar (verifiqué que `saveRoutine` con `CUR.routineWarmup=[]` también guarda
  `warmup:[]`, el mismo resultado). No es una mentira ni un callejón oculto; es un límite de diseño
  (nunca hay "cero calentamiento" posible) sin evidencia de que alguien lo necesite hoy — grep de
  `notes`/`painCare` por la palabra "calent" en las 25 personas: 0 resultados.
- **Las plantillas nunca llevan calentamiento, y aplicarlas no hereda el de una rutina anterior.**
  `saveTemplate` (`app-2-login.js:768`) nunca guarda un campo `warmup`. Las tres puertas de entrada
  al formulario (`openNewRoutine`, `openNewRoutineFromTemplate`, el picker de plantillas dentro del
  modal) llaman `rfBlank()` primero (fix de v590, hallazgo D2-4 de esa ronda), que pone
  `CUR.routineWarmup=null` — así que una rutina nueva por plantilla siempre auto-deriva su
  calentamiento sobre los ejercicios REALES de esa plantilla, nunca arrastra la lista de la rutina
  que el coach tenía abierta antes (el bug que v590 ya cerró). Verificado leyendo las tres funciones
  completas, no solo el comentario que lo afirma.
- **El aviso naranja SÍ recalcula en vivo contra la limitación ACTUAL, no contra la que existía al
  crear la lista.** `_rfWarmLim()` llama `limitationsFor(c, Date.now())` en cada render — así que si
  el coach reabre HOY el editor de su propia rutina, el chip para `we5`/`wai3` SE MOSTRARÍA
  correctamente (contraste ≈6,6:1 claro / ≈7,8:1 oscuro en la lista principal, que no tiene la
  atenuación de opacidad del selector). El defecto de hallazgo #1 no es que el chip esté roto: es
  que nadie tiene que ir a buscarlo activamente.

## Sospechas sin medir

- **¿La fricción del selector (hallazgo #3) es la causa real de que solo 4,8% de las rutinas tengan
  lista propia?** No lo pude medir — no hay telemetría de cuántas veces alguien abrió el selector y
  desistió. La hipótesis más simple sigue siendo que el auto-derivado ya es suficientemente bueno.
- **¿Hay más casos como el del coach entre las otras 5 listas manuales?** Medí específicamente la
  del coach porque su reporte de dolor es el único con bandera roja de toda la base. Claudia,
  Estella y Danilo no tienen `painCare` activo hoy (Danilo tiene `notes` con una hernia, pero sin
  reglas de exclusión de WARMUP_LIBRARY para ese texto libre) — así que hoy no hay un segundo caso,
  pero no corrí el cruce completo id-por-id contra las 4 listas restantes porque el briefing asigna
  esa pregunta exacta a E2.
- **¿Vale la pena una alerta activa (hallazgo #1) fuera de este caso puntual?** Con un solo caso
  histórico de conflicto real, no puedo estimar la frecuencia con la que esto pasaría en el futuro
  si la base de asesorados crece. Es una apuesta de "barato de construir y el costo de NO tenerlo es
  alto si vuelve a pasar", no una necesidad medida con volumen.

## Qué NO miré y por qué

- **No repetí la medición del catálogo (34 piezas, duplicado wh5/wm1, filtro de lesiones) que ya
  hizo el orquestador** — el briefing pide creerle al baseline y solo reportar si mi trabajo lo
  contradice; no encontré ninguna contradicción.
- **No audité si las 4 listas manuales restantes (Claudia/Estella, creadas 29-jun, antes del chip)
  contienen hoy algo contraindicado contra las zonas de dolor VIGENTES de esas personas** — es
  exactamente la pregunta que el briefing le asigna a E2 ("¿Hay hoy alguien recibiendo un movimiento
  que el filtro le quitaría? Con nombre, id y la regla exacta"), y duplicarla habría sido pisar su
  trabajo en vez de complementarlo.
- **No medí el `localStorage` de ningún teléfono real** — es literalmente inobservable desde aquí
  (vive en el dispositivo, nunca sale), tal como advierte el briefing; por eso todo el análisis de
  "la ceguera" se apoya en proxies de servidor con su control de discriminación declarado, no en
  intentar rodear la limitación.
- **No abrí el navegador** para ver el chip renderizado en vivo (contraste medido por cálculo desde
  los valores CSS reales de `styles.css`, no por captura) — los puertos 8829/9349 podían estar en
  uso por los otros dos agentes de la ronda, y el cálculo de contraste desde los tokens declarados
  es reproducible y verificable sin necesitar el navegador.
- **No miré si el `feeling`/`mood` del cierre de sesión correlaciona con calentar** — no hay ningún
  campo que registre "calentó" para correlacionar contra nada; habría sido inventar una medición
  que no existe.
