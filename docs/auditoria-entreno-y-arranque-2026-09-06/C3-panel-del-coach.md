# C3 · El panel del coach — Valentina Ríos (PM) + Camilo Duque (Growth)

## Veredicto en una frase
El panel le dice la verdad en los números finos (sesiones, retención) pero miente por diseño en
los dos números de PLATA que abren la pantalla —"Ingresos mes" y "Activos"—, y el Inicio no tiene
ningún filtro de prioridad: hoy se apilan al menos 9 bloques de contenido (5 de ellos avisos) antes
de llegar a la lista de asesorados, sin el tope que el propio equipo ya le puso a la pantalla del
asesorado (v505) por esta misma razón.

## Los 3 más grandes

### 1. "Ingresos mes: $120.000" no mide el negocio: mide en qué día del mes está parado
**Qué es.** `renderHome()` (`app-2-login.js:1479-1486`) suma `payment.amount` de todo pago cuyo
campo `date` cae en el mes calendario actual, para los clientes `clientIsBillable`. Ese campo
`date` es la fecha en que el coach TECLEÓ el pago en la app, no una fecha de ciclo de facturación.

**A quién le pasa HOY.** Al propio Camilo, cada vez que abre su panel un 3 o un 6 del mes. Hoy
(6-sep) la tarjeta dice **$120.000**, y ese número sale de UN solo pago (Diana Paola Díaz, pagó el
3-sep). El resto de sus pagos activos —Astrid, Claudia, Kathe, Luz, Samuel, Natalia, Danilo,
Miguel, Nataly, Yeison, con cuotas de 100.000-150.000/mes cada uno— quedaron registrados en agosto
y no cuentan para "este mes" aunque cubran hasta bien entrado septiembre.

**Evidencia (SQL contra producción, solo lectura):**
```sql
select to_char((p->>'date')::timestamptz,'YYYY-MM') as mes, count(*), sum((p->>'amount')::numeric)
from user_data, jsonb_array_elements(coalesce(profile->'payments','[]'::jsonb)) p
where coach_id='0a6484ed-42af-449d-9903-e440ac683ecf'
  and coalesce((profile->>'courtesy')::boolean,false)=false
group by 1 order by 1;
```
Resultado real:
| mes | pagos | total |
|---|---|---|
| 2026-05 | 7 | $515.000 |
| 2026-06 | 2 | $155.000 |
| 2026-07 | 7 | $646.000 |
| 2026-08 | 9 | $890.000 |
| 2026-09 (6 días) | 1 | **$120.000** |

El número que la tarjeta muestra hoy varía **de $120.000 a $890.000 según qué día del mes sea**,
sin que el negocio real haya cambiado. Un lunes del mes va a decir siempre poco.

**Cómo intenté tumbarlo.** Pensé que quizás el patrón de pagos concentrados a inicio de mes lo
compensa (todos pagan entre el día 1 y 6, así que a fin de mes la cifra "se llena"). Es cierto en
parte —agosto cerró en $890.000— pero eso es justo el problema: la cifra que ve el coach depende
de si abre el panel el día 3 o el día 25, y en los primeros días de cada mes (que es cuando más
paga la gente, justo después del ciclo anterior) la tarjeta muestra su peor cara.

**Con 14 de 25 (hoy 24) sin ningún pago registrado, ¿qué significa el número?** Significa menos
de lo que parece: ni siquiera para los que SÍ pagan es una cifra de "cuánto entra al mes" — es
"cuánto tecleé este mes". Y **"Activos: 4"** (el otro número de la fila, `h-actv`,
`app-2-login.js:1488-1490`) tiene el mismo problema por otra vía: cuenta solo `active`+`expiring`
entre los `clientIsBillable`, y con 12 de 24 en `pending` (nunca pagaron) y 4 en `grace` (vencidos
hace ≤7 días, ver v528), el coach ve "4 activos" en una cuenta con 24 personas entrenando —de las
cuales 9 entrenaron esta semana según la propia app (`sesiones semana: 38` en 9 personas).
"Activos" es una etiqueta de COBRO disfrazada de etiqueta de USO.

**Qué costaría arreglarlo.** No es un bug de una línea: es una decisión de producto. Dos caminos
razonables, ninguno trivial: (a) mostrar un **ingreso proyectado por ciclos vigentes** (sumar la
cuota de cada pago cuyo `dueDate` cae en el mes, no su `date`) — más estable, pero cambia lo que
"Ingresos" significa; (b) renombrar la tarjeta a lo que de verdad mide ("Cobrado este mes", con
una nota de qué cuenta) y agregar al lado un número de negocio real: cuántos asesorados entrenan
esta semana, que es lo único que hoy no depende del calendario de cobros. Cualquiera de las dos
es una tarde de trabajo; lo caro es que el PO decida qué quiere que la cifra represente.

---

### 2. El Inicio no tiene ningún tope: hoy se apilan 9 bloques antes de la lista de asesorados
**Qué es.** El asesorado tiene `TODAY_MAX_CARDS=2` (v505, `avi-core.js:7723`) precisamente porque
se midió que una pantalla con muchos avisos se aprende a ignorar. El Inicio del coach
(`index.html:469-523`) no tiene ningún mecanismo equivalente. Conté los bloques de contenido leyendo
el HTML, en el orden en que aparecen:

| # | Bloque (id) | Línea | ¿Se pinta HOY con datos reales? |
|---|---|---|---|
| 1 | `h-push-nudge` | 478 | No (push ya concedido, `dev.push:"granted"`) |
| 2 | `h-reports` (reportes de comunidad) | 480 | No (0 reportes abiertos) |
| 3 | `h-fbqueue` (cola de productos escaneados) | 482 | No (feature congelada) |
| 4 | Fila de 4 estadísticas (ingresos/activos/sesiones/sin entrenar) | 484-489 | **Sí, siempre** |
| 5 | `h-retention-card` (retención semanal) | 491-494 | **Sí, siempre** con clientes |
| 6 | `h-mytraining` (mi entrenamiento) | 496 | **Sí** (Camilo entrenó hace 3 días) |
| 7 | "Comunidad de mi gym" (estática) | 498-504 | **Sí, siempre** |
| 8 | `h-today-banner` (quién entrenó hoy) | 506 | No aún (9:30 am, nadie ha entrenado) |
| 9 | `h-expiry-banner` (vencimientos ≤5 días) | 508 | **Sí — 5 personas** |
| 10 | `h-adherence-banner` (💤 necesitan empujón) | 510 | **Sí — 12 personas** |
| 11 | `h-deload` (descarga vencida) | 512 | No (nadie en descarga) |
| 12 | `h-pulse` (motivos positivos) | 513 | No verificado con certeza (ver «sospechas») |
| 13 | `h-builds` (teléfonos con versión vieja) | 515 | **Sí — 14 de 14 con dato son "atrasados"** |
| 14 | `h-page` ("Tus dos direcciones") | 517 | **Sí, siempre, permanente** |
| 15 | "Prioritarios" (top 5) | 519-522 | **Sí, siempre** |

**Resultado medido:** al menos **9 de los 15 bloques** se pintan hoy con datos reales, y de esos,
**5 son avisos/alertas** (vencimientos, adherencia, versiones atrasadas, más la fila de
estadísticas que ya trae dos alarmas visuales en rojo). Ninguno se puede posponer ni resolver
desde el propio bloque salvo el de vencimientos (que ofrece "WhatsApp" por fila) — no hay un
"Entendido" ni un botón que los mande a una bandeja de "ver más tarde", como sí existe en
`coachPulse` (mute de 3 días por fila) o en el tope del asesorado (`#cn-more`, "Tienes N avisos
más"). El coach scrollea los 9 bloques completos cada vez que abre la app.

**El caso más claro de "aviso que sale siempre": `h-builds`.** Compara la versión de cada
teléfono contra la que sirve la página en ese momento (`deviceInfo`, `avi-core.js:4730-4751`) y
avisa si hay alguien "atrasado". Pero este repo despliega **varias veces por semana** (el propio
CLAUDE.md documenta más de 578 versiones en meses), y un teléfono solo actualiza su marca al
cerrar y reabrir la app. Con esa cadencia de despliegue, es **estructuralmente casi imposible**
que todos los teléfonos estén "al día" en un momento dado: medido hoy, **14 de 14 asesorados con
dato de versión están "atrasados"** (todos en builds 556-572, contra 578 en producción) y **10 no
tienen dato aún**. La tarjeta no tiene botón de acción (es puramente informativa) ni forma de
apagarla — va a aparecer casi todos los días que el coach abra el panel, lo cual es exactamente
la definición de un aviso que se aprende a ignorar.

**Cómo intenté tumbarlo.** Revisé si `h-builds` tiene alguna condición de "solo avisar si el
atraso es grave" (por ejemplo, más de N versiones o más de N días) — no la tiene: cualquier
`db < b` cuenta como atrasado, sin importar si es una versión (ayer) o cincuenta. Y comprobé que
de verdad no hay tope global: grepeé `TODAY_MAX_CARDS`/`_applyTodayCap` en todo el repo y solo
aparecen en `app-4-entreno.js` (la pantalla del asesorado) — cero resultados para el panel del
coach.

**Qué costaría arreglarlo.** Adaptar `_applyTodayCap`/`todayCardPlan` (ya existen, están probados
con 14 tests) a los ids `h-*` es más barato que construirlos de cero — es la MISMA idea aplicada a
otra lista de ids y otro máximo (quizá 3, dado que el coach sí necesita ver más que el asesorado).
Medio día de trabajo con su harness de regresión.

---

### 3. El banner de "necesitan un empujón" ofrece un botón muerto a 11 de las 12 personas que lista
**Qué es.** `renderHome()` pinta `h-adherence-banner` (`app-2-login.js:1602-1641`) con hasta 6 de
las personas "dormidas" y un botón **"Empujar 💪"** por fila que llama a `whatsappNudge(id)`
(`app-6-extra.js:2883-2899`). Esa función arma el mensaje y abre `wa.me/${phone}?text=...` **si
hay teléfono**, y si no, cae a `wa.me/?text=...` — que abre WhatsApp pidiéndole al coach que ELIJA
un contacto de su lista, con el mensaje ya escrito pero sin destinatario. Para alguien sin
teléfono guardado, tocar "Empujar" no empuja a nadie: abre un selector de contactos en blanco.

**A quién le pasa HOY.** De las 12 personas que la app considera "dormidas" ahora mismo (Chema,
Cristian, Daniel, FELIPE, maria rubio, Santiago, Sofía Vega —nunca han entrenado— y jhojan
hernandez, jose Daniel, Nicolás, Samuel, Sharith —llevan de 11 a 73 días sin volver—), **11 de
las 12 NO tienen teléfono guardado** (solo maria rubio lo tiene). El coach que use el botón de
esta tarjeta para "empujar" a cualquiera de esos 11 va a terminar frente a un WhatsApp vacío
preguntándole a quién escribirle.

**Evidencia.** Verificado contra `profile->>'phone'` de los 12 en producción (solo lectura); 11
de 12 con cadena vacía `''`.

**Lo que hace más raro el hallazgo: la app YA sabe resolver esto bien, en OTRA pantalla.** El
reporte "Sin entrenar" (`openCoachStat('sinentrenar')`, `app-2-login.js:2057-2094`) —al que se
llega tocando el número rojo "Sin entrenar" de la fila de estadísticas— fue corregido en v520-521
exactamente por este motivo: separa "Necesitan un empujón 💪" (con teléfono) de "No tienes cómo
avisarles 🔕" (sin teléfono), y a este segundo grupo le dice explícitamente *"Aquí la app no
puede hacer nada — no gastes tu tiempo en esta lista"*. Ese trabajo de ingeniería
(`coachCanReach`, `avi-core.js:9449`) existe, está probado (`_verify-alcance.mjs`) y documentado
en el gotcha de v520 — pero el banner de Inicio, que muestra casi la misma lista de gente, nunca
lo adoptó. Dos superficies para el mismo problema: una madura (el reporte) y otra que quedó atrás
(el banner de Inicio), y la que ve el coach PRIMERO cada día es la vieja.

**Cómo intenté tumbarlo.** Comprobé si quizás el banner de Inicio usa un criterio de "dormido"
distinto que sí filtra por alcance en otro lado — no: `dormidos` en `renderHome` se arma
recorriendo `DB.clients` directo, sin pasar por `coachCanReach` en ningún punto del archivo
(confirmado con `grep coachCanReach app-2-login.js`, que solo aparece en la función del reporte,
línea 2072). También comprobé que hoy el umbral dinámico del banner (según los días/semana de
cada quien) y el umbral fijo (4+ días) del reporte dan la MISMA lista de 12 personas — es
coincidencia de los datos de hoy, no una garantía: son dos fórmulas distintas
(`app-2-login.js:1604-1619` vs. `1610` `daysSinceLastSession(...)>=4`) que un día pueden divergir.

**Qué costaría arreglarlo.** Reemplazar el cálculo de `dormidos` en `renderHome` por una llamada
a la misma función pura que ya arma la lista del reporte, y condicionar el botón "Empujar" con
`coachCanReach(c)` (si no, no se pinta el botón, o se pinta un texto "sin teléfono guardado").
Menos de una hora — es cablear una función que ya existe, no escribir lógica nueva.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | "Ingresos mes" depende del día del mes en que se abre el panel, no del negocio | `app-2-login.js:1479-1486` | Sí — hoy dice $120.000, agosto fue $890.000 |
| 🔴 | "Activos" cuenta cobro, no uso: 4 "activos" con 9 personas entrenando esta semana | `app-2-login.js:1488-1490` | Sí, todos los días que el coach mira esa cifra |
| 🔴 | Inicio sin tope de tarjetas: 9 de 15 bloques se pintan hoy, sin forma de posponerlos | `index.html:469-523` | Sí — cada apertura del panel |
| 🟡 | `h-builds` ("teléfonos con versión vieja") es casi-siempre-verdadero por la cadencia de deploy y no tiene acción ni botón de silenciar | `app-2-login.js:1895-1913` | Sí — 14/14 hoy |
| 🔴 | El botón "Empujar 💪" del banner de Inicio abre un WhatsApp sin destinatario para 11 de 12 personas listadas | `app-2-login.js:1602-1641` + `app-6-extra.js:2883-2899` | Sí — 11 de 12 hoy |
| 🟡 | El mismo problema (dormidos) tiene dos implementaciones con umbrales distintos: banner de Inicio (dinámico) vs. reporte "Sin entrenar" (fijo ≥4 días) | `app-2-login.js:1602-1619` vs. `2059` | No hoy (coinciden por casualidad), riesgo de divergencia futura |
| 🟡 | El Top-5 "Prioritarios" de Inicio ordena SOLO por estado de membresía; ignora `clientAttentionRank` (dolor reportado, mensaje sin leer) que sí usa `#p-clients` desde v360 | `app-2-login.js:1649-1654` vs. `avi-core.js:4785` | No hoy (0 reportes de dolor activos) — riesgo latente |
| 🟢 | Ver una ficha / escribir / cambiar rutina / registrar pago: 2-3 toques desde Inicio, formularios con valores prellenados | `app-3-coach.js:1582`, `app-6-extra.js:2775-2785` | Sano, ver abajo |
| 🟢 | El conteo de clientes reales del coach dio 24, no 25 como decía el baseline de la ronda | SQL `coach_id='0a6484ed…'` | Discrepancia de medición, no un defecto de producto (ver nota) |

**Nota sobre el conteo 24 vs 25:** el baseline de la ronda («25 asesorados») no coincide con lo
que devuelve la misma consulta hoy (24, filtrando "%QA%", 0 falsos positivos de ese filtro). No
alcancé a determinar si es una cuenta borrada entre la medición del orquestador y esta, o una
diferencia de filtro. Lo dejo dicho porque el propio briefing pide señalarlo: si mi conteo es
correcto, "8 nunca entrenaron" del baseline pasa a "7 confirmados + probablemente 1 en la cuenta
que ya no está" — no cambia ningún hallazgo de este informe, todos están recalculados sobre los
24 reales de hoy.

## Lo que verifiqué y está SANO (con números)
- **"Sesiones esta semana" (h-sess) es correcto**: recuenta contra `history` real → **38
  sesiones** en los últimos 7 días, cifra que no depende de ningún truco de calendario (a
  diferencia de "Ingresos").
- **La ficha del asesorado (`#p-detail`) es una sola pantalla larga, sin pestañas internas**, y
  las 4 acciones más frecuentes están cerca de la cabecera: membresía (`d-membership`, línea 565)
  y mensajes/rutinas (grid de dos columnas, líneas 583-604) aparecen ANTES del historial y la
  nutrición. Contando toques reales desde Inicio: **abrir una ficha = 1 toque** (si está en el
  Top-5) o **2-3 toques** (buscándola en Asesorados); **escribirle = +1 toque** ("Abrir chat");
  **cambiar una rutina = +1 toque** (editar o "+ Nueva rutina"); **registrar un pago = +1 toque**
  ("+ Registrar pago", con fecha de pago y de vencimiento a 30 días YA prellenadas,
  `openPaymentModal`, `app-6-extra.js:2775-2785`). No encontré fricción real aquí — es al
  contrario de lo que sospechaba antes de medir.
- **El reporte "Sin entrenar" (v520-521) SÍ separa alcanzables de inalcanzables** y no empuja al
  coach a perseguir a quien no tiene cómo contactar — decisión explícita del PO, ya construida y
  con su propio texto ("no gastes tu tiempo en esta lista").
- **El chip de versión de cada teléfono SÍ vive dentro de la ficha** (`app-3-coach.js:1604-1616`),
  junto con el estado real de sus notificaciones push (`v575`) — esto es justo lo que el brief
  preguntaba sobre "datos que la app sabe y no enseña": este dato SÍ se enseña, en la ficha
  individual (no agregado en Inicio, pero tampoco escondido).
- **`app_errors` sigue sin pantalla** — cabo suelto ya conocido y documentado (CLAUDE.md), no lo
  vuelvo a reportar como hallazgo nuevo.
- **Ninguna de las cifras de plata del Home usa datos de `courtesy` incorrectamente**: Valery
  (cortesía) queda fuera de "Ingresos" y de "Activos" en el código, tal como promete el gotcha de
  v539.

## Sospechas sin medir
- **`h-pulse` (el pulso positivo del coach)**: no llegué a recalcular en SQL si hoy hay algún
  récord/racha/estancamiento real que dispare esta tarjeta — requiere reproducir
  `_insRecordOf`/`_insStallOf` sobre `prs`+`history` de las 24 personas, que es lógica compleja y
  no puramente declarativa en SQL. Queda como sospecha, no como hallazgo.
- **`h-push-nudge`**: asumo que está oculto porque el último reporte del teléfono del coach dice
  `push:"granted"`, pero esa marca es la del ÚLTIMO login registrado (13-jul según `dev.at`), no
  el estado del navegador en el momento exacto de abrir el panel hoy — no lo verifiqué en vivo.
- **`ax_msgreads` (marca de mensajes leídos) del coach aparece NULO en `coach_settings` de
  producción.** Si esto reflejara de verdad que nunca se subió, todo mensaje histórico de un
  cliente contaría como "sin leer" para `clientAttentionRank` (usado en `#p-clients`, NO en
  Inicio). No lo confirmo como hallazgo: `ax_msgreads` puede vivir sano en el `localStorage` del
  dispositivo del coach sin haber subido nunca a la nube (no hay garantía de que se sincronice si
  nunca cambia tras el arranque), y no tengo forma de inspeccionar ese localStorage sin el
  navegador real del coach. Si se confirma, sería un hallazgo de otra área (mensajería), no
  necesariamente de Inicio.
- **El número exacto que el baseline de la ronda reporta para "vencidos" (8) y "al día" (3)** no
  reproduje esa partición exacta — mi propio cálculo de `MS.getStatus` da 2 `active` + 2
  `expiring` + 4 `grace` + 1 `overdue` + 2 `inactive` (por suspensión, no por mora) + 1 `courtesy`
  + 12 `pending`, sobre 24 personas. Puede ser una diferencia de cómo se agruparon esos estados en
  el baseline (p.ej. si "vencidos" ahí incluye `grace`+`overdue` = 5, no 8) más la diferencia de
  24 vs 25 personas. No afecta a los 3 hallazgos grandes, que están recalculados con SQL propio.

## Qué NO miré y por qué
- **Plantillas, Ejercicios y Mensajes** (los otros 3 de los 6 paneles del coach): el brief pide
  enfocar Inicio/Asesorados/Detalle como el uso diario más intensivo; con el presupuesto de esta
  ronda prioricé la pregunta central (¿el titular dice la verdad? ¿cuántas cosas piden atención a
  la vez?) sobre esos tres, que son más "herramienta de trabajo puntual" que "panel que se mira
  todos los días".
- **El detalle completo de `#p-detail` más allá de las 4 acciones frecuentes** (nutrición,
  medidas, fotos, progreso por ejercicio): confirmé que están bien organizados por debajo del
  pliegue, pero no medí su fricción específica — no son las acciones "más frecuentes" que pide el
  brief.
- **`h-pulse` con datos reales** (ver sospechas): habría requerido portar `coachPulse` completo a
  SQL o correr un harness contra la cuenta real del coach, que las reglas de esta ronda no
  permiten (nada de escritura, y no tengo credenciales del coach real, solo lectura SQL).
- **Comparación pixel-a-pixel de cuánto scroll hay que hacer en pantalla real** para ver los 9
  bloques del Inicio: conté bloques por código, no medí altura en px con un harness — el número
  "9 de 15" es un conteo de contenido, no de scroll físico.
