# A2 · Datos, servidor y repo — andres-dba + julian-qa

## Veredicto en una frase
(pendiente)

## Los 3 más grandes
(pendiente)

## Todos los hallazgos
(pendiente)

## Respuesta a las preguntas del orquestador
### Q1 — ¿Qué otro cambio de v690 se EJECUTA? → **FALSA (no hay otro)**, con dos hallazgos menores de efecto indirecto
Método: `git diff -U0 9b922db^ 9b922db`, sólo líneas añadidas, quitando las que empiezan por `//`, `*`, `/*`, `--`
en cada archivo de código. Control de cobertura: los 182 archivos se repartieron (docs 82 · `.claude` 4 ·
`scripts/` ~75 · app/core/index/sw 11 · SQL 5 · edge 1 · `avi.test.js`); la lista por `--stat` termina en `sw.js` (último
alfabético), no se cortó.
- **Código de la app** (`app-1…7`, `avi-core.js`): 0 líneas ejecutables cambiadas salvo (a) el festivo ya conocido
  `avi-core.js:223` y (b) `const COACH_Q_MAX_ENTRY = 300 * 1024;   // …Salomón…` (sólo el comentario de cola). Todo lo demás
  es prosa de comentarios (p. ej. `app-3-coach.js` «Nelson»). `index.html`/`sw.js`: sólo el par `?v=690` / `avi-v690`.
- **`avi.test.js`** (450 líneas tocadas, 225 en + y 225 en −): fixtures y comentarios. Ninguna aserción cambió de
  significado: los nombres sólo entran como datos de prueba (`communityPeersLine([gym('Salomón'), gym('Andrea')…])`,
  `minorCoachAlert('Vanesa Vargas', …)`, `communityInviteMsg('Salomón Cárdenas', 7)`) y se comparan contra el mismo
  seudónimo en la misma prueba; ninguna compara contra un nombre que exista sólo en la base. Única línea con
  efecto de lectura: `'2026-03-23', // San Jorge (19-mar …)` = comentario del festivo conocido. Suite 1411/1411 sigue verde.
- **Harnesses `scripts/e2e/` y `scripts/*.mjs`**: los que tocan producción (`_verify-rls-aislamiento`, `_probe-*`,
  `_r16-*`, `backup-local`, `medir-*`, `versiones-telefonos`, `records-atascados`, `push-plan-contradice`…) toman la persona por
  **uid o por las credenciales QA de `~/.avi`**, nunca por nombre: barrí cada línea NO comentada de `scripts/*.mjs` contra los
  38 nombres seudónimo de la tabla privada → **0 coincidencias** (control: el mismo barrido sí encuentra 14 líneas con
  seudónimos en `scripts/e2e/_verify-community.mjs` y `_verify-cmtynudge.mjs`, pero son FIXTURES que el harness siembra
  él mismo con `RESET(...)`/`FRESH(...)`, no una búsqueda en datos reales). Los dos archivos renombrados
  (`_walk-<nombre real>→_walk-salomon`, `_repro-wf-<nombre real>→_repro-wf-carla`): `grep` de la vieja ruta fuera de `docs/` → 0 referencias colgantes.
  `_verify-login-confirmar.mjs` ahora escribe `oculto@gmail.com` en el campo y luego afirma que la llamada espiada recibió
  `oculto@gmail.com`: es un espía, pasa igual con cualquier texto (sin pérdida de significado).
- **SQL / edge**: `supabase/community/{c11,s1,s2}*.sql`, `migrations/2026082*`, `2026090*` y `coach-create-client/index.ts`:
  0 líneas ejecutables (sólo comentarios).
- **`foods.json`**: 0 cambios en el commit.
- **Hook** (`scripts/hooks/pre-commit`): el commit cambió el literal del check [7] del correo real de esa cuenta a `salomon@apex.com`
  (un patrón que dejaba de cazar el correo real de la cuenta de prueba durante las ~4 h hasta `6c5f7a4`; ese commit quitó el literal).
  En HEAD ya no existe → sin víctima hoy.
- 🟢 **Efecto indirecto #1 (no se ejecuta en producción, sí en el equipo de agentes):** `.claude/agents/laura-physio.md`
  §«Perfil específico: Mario Parra» y su disparador «Cualquier rutina para Mario Parra», y `andres-hyp.md`, ahora llevan el
  seudónimo. El PO habla con nombres reales; quien lea esa regla para «rutina de <nombre real>» no la reconoce. No hay datos
  clínicos nuevos en el archivo (el cuadro clínico real está en las notas de la ficha, que sí se leen), pero la regla
  nominal de Laura quedó apuntando a un nombre que no existe en `ax_c`.
- 🟢 **Efecto indirecto #2:** `.claude/skills/avi-generate/SKILL.md` dice «se busca el match más cercano en `ax_c`» y ahora su
  ejemplo es «Mario», «Karen» (seudónimos). Quien pida la rutina con el seudónimo que lee en los docs («genérame la de Karen»)
  hace un match difuso contra nombres REALES: puede caer en otra persona. Medí que **ningún seudónimo coincide con el primer
  nombre de una cuenta real viva** (27 nombres reales vs 38 seudónimos → 0 choques), así que hoy fallaría por «no encontrado»,
  no por «otra persona».

### Q2 — v681 la barra: ¿a alguien se le suma dos veces? → **NO SE PUDO PROBAR para nadie; evidencia parcial y una sospecha con números**
Datos: respaldo `avi-backup-2026-09-29` (24 filas `user_data`) + SQL en vivo sobre los 3 días posteriores. Control de cobertura:
reproduje el baseline (`"bar":` en **8** filas, `"rir":` en **7**, `"corte":` en **0**) antes de medir.
- 50 pares persona × ejercicio-con-barra en **14 personas**; 52 récords (`prs`) de ejercicios con barra en 16 (incluye QA).
- **Prueba de «discos» (imposible si el número fuera el total):** 18 de los 52 récords están por debajo de la barra del
  catálogo (5 a 15 kg con barra de 20). Por series HECHAS con kg > 0 en ejercicios de barra (14 personas, 1.127 series):
  **13 de 14 tienen series por debajo de la barra** (p. ej. Elena Romero 90/110, Carla 85/109, Dario 36/44, Karen 31/39,
  P17 30/34; Andrea 48/336, en parte typos tipo «4,5»; Nayla sólo 3/108). **El único sin ninguna serie por debajo de la barra
  es el PO (0 de 362 series)**; él mismo dijo que anota discos.
- **La prueba sólo vale con la barra del catálogo.** Las cuentas que confirmaron otra barra desde el 28-sep (campo `bar`):
  Carla/Elena/Karen `bar:10` (RDL e46, top 20), el PO `bar:15` (Remo e5, top 40), Lucía Ríos `bar:15` (Hip Thrust e42, top 40),
  Elena `bar:15` (Clean & Press). Con una barra de 10 o 15 kg, «10 kg» puede ser el total de una barra liviana. **Nadie confirmó
  «Sin barra» (0)** en un ejercicio de barra olímpica: no hay una sola persona que haya dicho «lo que anoto ya es el total».
- **Los dos que casi lo parecen:** (1) PO, Remo con Barra: 55 → 50 → **40 (30-sep, con barra 15)** y Peso Muerto Rumano
  90 (hasta 15-ago) → 40 (22-ago) → 70 (29-ago): saltos de ±20/30 kg sin cambio de plan, el patrón exacto para el que se escribió
  el aviso de salto de v689, pero no prueba que anote el total. (2) Andrea, Hip Thrust 120 el 23-sep y 120 el 28-sep: **sin
  salto** al estrenar «DISCOS» (sí hubo 28-sep sin campo `bar` → esa sesión salió de una versión anterior a v681).
- 🟡 **Lo que SÍ se ve hoy en pantalla:** la línea «≈ N kg · 1RM est. con barra» (`app-4-entreno.js:432-444`, `:3799`, `:3965`)
  suma 20 kg por defecto. **16 récords de 11 personas con kg < 20 y reps 2-15 muestran un 1RM 2,6 a 3,2 veces lo que movieron**
  (p. ej. Dora R. Clean & Press 10 kg × 10 → «≈ 40 kg con barra»; Yesid Torres Rojas Press de Banca 10 kg × 15 → «≈ 45 kg»;
  Dario Curl 10 × 15 → 45). Es cierto si movieron 10 kg de discos + barra de 20 (principiante de gimnasio: verosímil en Press/Curl),
  falso si movieron una mancuerna o barra liviana. Sólo `e69 Clean & Press` (catálogo: olímpica 20) tiene 7 de 7 personas por
  debajo de 13 kg: ese es el candidato más sospechoso de inflar (`BAR_DEFAULTS` líneas 1475-1487).
- El 1RM «con barra» se recalcula **con la barra más reciente para TODOS los récords**, no con la del día del récord:
  si el PO cambia `bar` de 20 a 15 en un ejercicio, su récord viejo (hecho con 20) se reestima con 15. Sin víctima medida.
- Observación sin relación con la barra que quedó medida (sospecha, sin causa probada): entre ejercicios de barra, las series
  hechas sin kg pasan de 37/750 (4,9 %) antes del 28-sep a 15/67 (22 %) desde esa fecha; pero el control
  (ejercicios sin barra con peso) también sube: 12,3 % → 16,2 %, y las 15 series son de 2 personas (Andrea, Dora R.). No se atribuye a v681.

### Q3 — v689: ¿el «sí» del salto llega a la nube? → **CIERTA a medias: el camino EXISTE y no se pierde; el cero es «nadie dijo sí», pero hay un hueco de medición**
- **Ruta del dato** (leída y comprobada): `gmSaltoResp(ei,'si')` (`app-6-extra.js:1107-1112`) guarda `estado:'corte'` en
  `salto_<rid>_<ei>` y **llama `resaveSessionPartial`** → `saveSessionToHistory` (`app-4-entreno.js:2644-2649`) copia
  `...(corte?{corte:true}:{})` dentro del ejercicio del historial → `sv('ax_hist')` → `user_data.history`. Nada en
  `sanitizeHistory` (`avi-core.js:3607`) reconstruye el ejercicio (usa `{...ex, sets}`), así que un campo extra sobrevive.
  Control de que los campos extra sí llegan a la nube: `"bar":` en 8 filas y `"rir":` en 7 (mismo nivel de objeto).
- **Recalculo del denominador** (misma regla: ≥ 1,8× o ≤ 0,55× Y ≥ 15 kg, 90 días, tope de series hechas):
  mi SQL da **79 saltos de 1.760 pares en toda la historia** (baseline del orquestador: 80 de 1.776 → concuerda, el método es
  válido). **Desde el 29-sep: 57 pares persona×ejercicio, 55 con sesión previa en 90 días, 1 salto**: Lucía Ríos, Hip Thrust,
  20 → 40 kg el 30-sep (con `bar:15`, teléfono en v691). Ese ejercicio tiene `corte` ausente.
- Por tanto: **no se perdió ningún «sí»** (hay un solo candidato y su teléfono ya tenía v689), pero tampoco hay ni un solo
  dato de que el aviso se contestó alguna vez en producción. 
- 🟡 **Hueco de diseño para el punto 4 (~nov):** sólo «Sí» deja huella. «Lo corrijo» (`visto`) y «no lo vio» no se guardan
  (`salto_*` se borra con el día, `_wipeSessionFlags` `app-4-entreno.js:2304`). Con 1 salto en 2 días (80 en 4 meses ≈ 0,7/día de entreno
  de la base) la curva de noviembre tendrá ~20 saltos posibles y **no sabrá cuáles se mostraron**; los que no dijeron «sí» se
  confundirán con los que nunca vieron la pregunta (teléfonos con 6 versiones atrás). No es una pérdida de datos, es un
  dato no registrado; decisión del PO/Coach Pro si importa contar «preguntas mostradas».
> ⚠️ **El agente se cortó aquí por el límite de uso de la cuenta (30-sep, ~14:00).** Q4, Q5 y Q6 las midió el
> orquestador con el mismo método (SELECT de solo lectura, `git grep` sobre HEAD, scripts que imprimen CONTEOS y
> nunca el dato). El veredicto, la tabla y el resto de las secciones también son del orquestador.

### Q4 — Lo desplegado = lo del repo, y la tarjeta atada → **SANO**
- `coach-create-client` **v6** se desplegó hoy desde el archivo del repo (commit `0fa315b`); arranca y responde 401 sin sesión.
- `delete-account` **v10**: desplegada el 29-sep 20:47 UTC, dos minutos antes del commit `eb991ea` (20:49 UTC), que es el
  último que toca el archivo. Siete líneas de lógica distintivas (la atadura, `sinAtar`, `tarjetasDudosas`, el modo coach
  `not_your_client`, el fantasma `not_a_ghost`, los 4 buckets, `app_errors`) están idénticas en las dos. Código sin
  comentarios del repo: 133 líneas.
- RLS de `avi_showcase_dueno`: SELECT/DELETE solo `coach_id = auth.uid()`; INSERT exige que la tarjeta Y la persona sean de
  ese coach; `anon` sin ningún permiso. **Impersonando** (solo lectura, `rollback`): una asesorada ve **0** ataduras y **4**
  tarjetas públicas (la vitrina es pública por diseño); el coach ve **4** ataduras (control de discriminación).
- Las **4 tarjetas** públicas están atadas a personas que **existen** (ficha y cuenta vivas) y su primer nombre coincide.
- `showcaseOwner` (`avi-core.js` :11917): una tarjeta atada a alguien que ya no está en la lista es `huerfana`, y
  `showcaseCardFor` no se la da a nadie aunque otra persona se llame igual. Correcto.

### Q5 — El repo público HOY (HEAD): ¿todavía se reconoce a alguien? → **CIERTA en dos puntos concretos**
Método: los datos reales se leen de la base en memoria y se buscan LITERALES en `HEAD` (`git grep -F -i`); se imprimen
conteos y archivos. Universo: 30 cuentas, 24 fichas, 28 correos, 10 teléfonos, 27 uid, 20 nombres completos.
- **Correos de acceso reales: 0 de 28** en HEAD.
- 🟡 **Teléfonos reales: 1 de 10** — el de una asesorada ADULTA (35 años), con el indicativo, en
  `docs/auditoria-entreno-y-arranque-2026-09-06/C2-arranque-y-cuentas.md:149`. v690 no buscaba teléfonos.
- 🟡 **uid de cuentas reales: 4 de 27** — en `docs/auditoria-entreno-y-arranque-2026-09-06/C2-arranque-y-cuentas.md`,
  `docs/auditoria-areas-2026-07-31/A1-codigo.md` (2), `docs/auditoria-areas-2026-07-31/A3-movil.md` y
  `docs/auditoria-app-instalada-2026-09-05/B1-push.md`. **Dos de los cuatro son de MENORES (15 años).** Un uid solo no abre
  nada (RLS), pero ata un texto a una cuenta concreta.
- **Nombres completos reales: 0** (aparecen 3, pero son las dos cuentas QA y el propio coach — control de cobertura: el uid
  del coach sí aparece en 21 archivos, como debe, porque el código lo necesita).
- 🟢 **Contexto que reconoce sin nombre:** el seudónimo del menor de 15 años aparece **261 veces** en `docs/`, `CLAUDE.md` y
  `avi.test.js`, y 41 archivos hablan de «15 años». La historia completa (se registró con otra edad, su mamá también
  entrena con el coach y autorizó) está contada con seudónimos. Para alguien del gimnasio de Guaduas (27 menciones del
  pueblo en HEAD) puede bastar. El arreglo de fondo es el repo privado, ya decidido y pendiente del pago.

### Q6 — v692 → **SANO**
- (a) `_pwWhoMe` (`app-2-login.js` :472): si la ficha todavía no cargó (llega por el enlace de recuperación), devuelve
  `null` y se aplica la regla de siempre (8 + mayúscula + minúscula + número). Degrada a lo de antes, no bloquea.
- (b) En modo editar, `coach-create-client` junta `user_data.profile.name` y `user_metadata.name`: si difieren, se exigen
  los dos. Más estricto, no más laxo.
- (c) **Falsos positivos: 0 de 1.200** (24 nombres reales × 50 contraseñas razonables de palabra + cifras, p. ej.
  «Montaña17», «Sentadilla48»). **Control:** «Nombre2026» se rechaza para 22 de 24 personas; las 2 que no son las cuentas
  QA, cuyo nombre empieza con un emoji.

## Veredicto en una frase
Lo que se guarda del entreno llega a la nube y la tarjeta pública está bien atada; lo que queda es de SIGNIFICADO (la línea
«1RM est. con barra» suma 20 kg a quien pudo haber usado una barra liviana, y el aviso de salto solo deja rastro del «sí») y
de PRIVACIDAD (un teléfono real y 4 uid, dos de menores, siguen en el repo público).

## Los 3 más grandes
1. **🟡 «≈ N kg · 1RM est. con barra» puede inflar el récord de principiantes** (Q2): 16 récords de 11 personas con menos de
   20 kg muestran un 1RM 2,6-3,2 veces lo que movieron; el caso más sospechoso es Clean & Press (`e69`, 7 de 7 personas por
   debajo de 13 kg). Y el 1RM de TODOS los récords se recalcula con la barra más reciente, no con la del día. Lo decide
   Coach Pro con el PO: ¿qué barra usa la gente de verdad en esos ejercicios?
2. **🟡 Datos reales en el repo público** (Q5): 1 teléfono de una adulta y 4 uid (2 de menores) en informes viejos de
   `docs/`. Arreglo: quitarlos de HEAD hoy; la historia solo se tapa con el repo privado.
3. **🟡 El aviso de salto solo guarda el «sí»** (Q3): «lo corrijo» y «no lo vio» se borran con el día. La curva de noviembre
   no sabrá qué saltos se preguntaron. Decisión de Coach Pro / PO.

## Todos los hallazgos
| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🟡 | «1RM est. con barra» suma 20 kg por defecto; 16 récords de 11 personas lo muestran 2,6-3,2× | `app-4-entreno.js:432-444`, `:3799`, `:3965`; `BAR_DEFAULTS` :1473 | Posible (no se sabe qué barra usan) |
| 🟡 | El 1RM de récords viejos se recalcula con la barra MÁS RECIENTE | `exerciseBarKg` `avi-core.js:1512` | No medida |
| 🟡 | Teléfono real de una asesorada en HEAD | `docs/auditoria-entreno-y-arranque-2026-09-06/C2-arranque-y-cuentas.md:149` | Sí (repo público) |
| 🟡 | 4 uid de cuentas reales en HEAD, 2 de menores | 4 informes de `docs/` (Q5) | Sí (repo público), bajo impacto |
| 🟡 | Solo el «sí» del aviso de salto deja rastro | `_wipeSessionFlags` `app-4-entreno.js:2304` | No es pérdida: dato no registrado |
| 🟢 | La historia del menor contada con seudónimo (261 menciones) | `docs/`, `CLAUDE.md`, `avi.test.js` | Riesgo de reconocimiento por conocidos |
| 🟢 | Reglas de agentes con seudónimo (Laura, avi-generate) que el PO nombra con el nombre real | `.claude/agents/laura-physio.md`, `.claude/skills/avi-generate/SKILL.md` | No (0 choques seudónimo↔nombre real) |

## Lo que verifiqué y está SANO (con números)
- v690: ninguna otra línea que se ejecute cambió (aparte del festivo ya hallado); harnesses por uid o credenciales QA, 0
  búsquedas por nombre en datos reales; `foods.json` intacto.
- v689: el «sí» sí llega a la nube (`saveSessionToHistory` copia `corte`); 1 salto desde el 29-sep y no lo contestaron con «sí».
- Lo desplegado = el repo (`delete-account` v10, `coach-create-client` v6); RLS de las ataduras correcta (0 / 4 con control);
  4 de 4 tarjetas atadas a personas vivas.
- v692: 0 falsos positivos en 1.200 pares; el control rechaza «Nombre2026» en 22 de 24.
- Correos de acceso reales en el repo: 0 de 28. Nombres reales de asesorados: 0.

## Sospechas sin medir
- Qué barra usa de verdad cada persona en Clean & Press, Press de Banca y Curl con barra (solo se sabe preguntando).
- Si alguien que no es el PO anota el TOTAL en algún ejercicio: nadie confirmó «sin barra» y 13 de 14 tienen series por
  debajo de la barra del catálogo (lo que apunta a DISCOS), pero con barras de 10-15 kg no se puede distinguir.

## Qué NO miré y por qué
- Q4-Q6 las cerró el orquestador sin el agente (límite de uso): el diff de `delete-account` desplegado vs repo se hizo por
  líneas distintivas, no byte a byte (el MCP no deja guardar el código desplegado a un archivo).
- Otras edge functions (`send-push`, `refresh_snapshot`, `activate_public_profile`, `daily-notifs`) contra el repo: fuera de
  la ronda (no cambiaron del 28 al 30-sep).
- La historia de git (solo HEAD): se resuelve con el repo privado.
- Ningún teléfono real, como en todas las rondas.
