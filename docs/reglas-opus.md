# REGLAS DE EJECUCIÓN PARA OPUS — contrato vinculante del proyecto AVI

> **Autoridad:** estipuladas por Fable a pedido del PO (Camilo, 2026-07-18). **INVIOLABLES.**
> Solo se actualizan por enmienda de Fable o del PO, versionada al final (§E) con fecha y motivo.
> Violar una regla = sesión fallida, aunque "el código funcione". Este doc NO reemplaza la
> doctrina de CLAUDE.md ni `metodologia.md` — las OPERACIONALIZA por fase. Ante conflicto
> aparente, gana la interpretación MÁS estricta.
>
> **El ciclo es sagrado: Fable planifica → Opus ejecuta → Fable verifica.** Nada está "hecho"
> hasta el veredicto de Fable. Opus no se auto-aprueba. Punto.

---

## FASE 0 — ANTES DE TOCAR CÓDIGO (la fase que más bugs ha evitado… cuando se cumplió)

**R0.1 — Verifica los supuestos contra DATOS REALES, no contra lo que alguien dijo.**
Si la feature depende de CÓMO alguien usa la app (el coach, un asesorado), consulta la fila real
en Supabase (read-only) ANTES de diseñar. *Origen: v369 — Camilo dijo "cuenta aparte", la data
dijo COACH_SELF en su fila propia; medio deploy a la basura por creerle a la frase y no al dato.*

**R0.2 — Lee GOTCHAS VIGENTES (CLAUDE.md) y el plan vivo del área ANTES de editar.** Si el área
tiene doc de plan (`docs/plan-*.md`), el spec de Fable manda. Si no hay spec y la feature es
no-trivial, el diseño se escribe primero (scratchpad o `docs/`) y se valida contra el código
existente (¿qué vía de persistencia YA existe? ¿qué función pura YA hace esto?).

**R0.3 — Al PO solo se le preguntan decisiones DE PRODUCTO** (AskUserQuestion, opciones con
recomendación marcada). Las decisiones técnicas son tuyas y las defiendes con evidencia. Decisión
ya tomada por el PO = no se re-pregunta (están en memoria y en los docs).

**R0.4 — Anti-complacencia activa.** Cada pedido se evalúa: ¿mejora el producto? ¿hay forma
mejor? ¿qué rompe? Si la respuesta correcta es "no lo hagas" o "hazlo distinto", ESA es la
respuesta, con razones y alternativa. "¡Excelente idea!" sin análisis = fallo de doctrina.

**R0.5 — Busca la CLASE antes de escribir.** Toda feature nueva se pregunta: ¿qué bug de clase
ya conocido aplica aquí? (parcial-en-curso que pisa vistas [v367→v368], aserciones clavadas a
versiones [_verify-news], upsert-sin-SELECT, wa.me sin waPhone, let-no-es-window…). El catálogo
vivo de clases es GOTCHAS VIGENTES.

## FASE 1 — EJECUCIÓN

**R1.1 — Un feature = un commit. Un fix = un commit.** Cero mezclas, cero refactors "de paso" en
zonas calientes. Si ves basura ajena, va al radar, no al diff.

**R1.2 — La lógica nueva nace PURA en avi-core:** determinista, recibe `now`/datos por parámetro,
sin localStorage/DOM, exportada en el bloque dual, testeada. La UI solo pinta y delega. Si no
puedes escribirla pura, el diseño está mal.

**R1.3 — Persistencia: SOLO vías sancionadas.** `sv('ax_*')` → upsertOwn/_persistCoachWrite.
PROHIBIDO inventar sync, fetch crudo con Bearer manual, o escribir a Supabase por fuera del
cliente auth. Campo que sincroniza → `SB_KEYS`; ajuste de coach → ADEMÁS `_COACH_SETTINGS_KEYS`
+ `_coachSettingsObj()` + hidratación (las TRES, lección v321). Tabla nueva con upsert → policies
INSERT+UPDATE+SELECT.

**R1.4 — Guardrails duros heredados (sin excepción):** `esc()` en todo innerHTML con datos de
usuario · claves de sesión y `apex`/`ax_` intocables · timers por timestamp absoluto · tokens CSS
(nada hardcodeado, `transition:all` prohibido) · Edit tool o python utf-8 sin BOM (jamás
perl/sed) · secretos JAMÁS en el repo · wa.me solo vía `waPhone`.

**R1.5 — Toda superficie visible cumple la barra premium ANTES del commit:** 360-390px, táctil
≥36px, ambos temas, tono Sofía, estados no-felices (vacío/error/offline/datos extremos — el
"Hace Infinity días" fue exactamente esto). Feature "happy path" = feature a medias = no se
entrega.

**R1.6 — Nudges y tarjetas nuevas en "Hoy" o el panel:** ganan su derecho a existir (engagement
real, candados anti-molestia, mute/snooze LOCAL documentado) y JAMÁS compiten con un entreno en
curso (una sesión parcial de hoy silencia cualquier tarjeta que pueda pisarlo o esconderlo —
clase v367/v372).

## FASE 2 — VERIFICACIÓN PROPIA (lo que Opus corre ANTES de declarar nada)

**R2.1 — Test de regresión CON DIENTES: se prueba saboteando.** Todo fix/función pura nueva
lleva un test que FALLA con la conducta vieja. Y se DEMUESTRA: sabotea el código a la conducta
incorrecta → suite/harness cae → restaura → verde. Ese resultado se REPORTA (rojo→verde). Un
test que nunca viste caer no protege nada.

**R2.2 — PROHIBIDO ajustar un test/harness para que pase.** Si un test cae con tu cambio, la
pregunta es "¿qué rompí?" — no "¿cómo lo callo?". Re-fechar fixtures, aflojar aserciones o
saltar checks para poner verde = enmascarar un bug = la violación más grave de este doc.
*Origen: el re-fechado de S14 que tapó el bug real de v366.* Si el test está genuinamente mal,
se explica POR QUÉ en el commit y Fable lo confirma.

**R2.3 — Aserciones de harness DERIVADAS del dato, no clavadas a valores que envejecen**
(versiones, textos de ventana top-N, conteos). Todo harness es asertivo: exit 1, cero jsErrors,
"TODO OK" — nunca screenshots-sin-assert como única prueba.

**R2.4 — Zona caliente tocada → su cinturón completo, siempre:** `renderClientToday`/guiado →
`_guiado-suite` + `_shot-trained`; navegación coach/`openDetail` → `_test-coach-back`; entrada
en `AVI_NEWS` → `_verify-news` EN LA MISMA sesión (nunca "después"); feature nueva con flujo
propio → harness NUEVO dedicado. Suite ANTES y DESPUÉS del cambio.

**R2.5 — Harnesses: cuenta QA sellada, jamás usuarios reales; sello cloudWriteSealed intacto;
sin `head` que deje zombis; respetar el rate-limit (~2-3 min entre corridas con login).**

**R2.6 — Verificación visual REAL:** capturas claro+oscuro del elemento EN VISTA (scrollIntoView
si vive en scroller interno) y MIRADAS (leer la imagen), no solo generadas.

## FASE 3 — DEPLOY

**R3.1 — Protocolo completo, en orden, sin saltos:** suite verde → hook 11/11 (jamás
`--no-verify`) → bump del PAR `?v=NNN` (×10) + `CACHE_NAME` con python sin BOM (verificar
primeros 3 bytes) → commit (mensaje honesto: qué, por qué, QA corrido) → push a main (jamás
`--force`) → curl Pages sirve la versión → `_prodcheck.mjs <vNNN>` verde. **"Está en producción"
solo se dice con curl + prodcheck en la mano.**

**R3.2 — Documentación en el MISMO commit del deploy:** bitácora (parte nueva, más reciente
primero), CLAUDE.md solo si cambió el contexto vivo (arquitectura/gotcha/backlog/footer),
memoria de sesión al cierre. Gotcha nuevo → GOTCHAS VIGENTES, no enterrado en un hito.

**R3.3 — Feature visible al asesorado → evaluar entrada AVI_NEWS** (y si se añade, R2.4 aplica).
No toda feature la lleva (un banner que se explica solo, no); la decisión se declara.

## FASE 4 — EL CICLO CON FABLE

**R4.1 — Todo deploy queda "PENDIENTE re-verificación de Fable"** en bitácora y memoria, y así
se le comunica al PO. Opus nunca anuncia una feature como cerrada.

**R4.2 — Veredicto de Fable = vinculante.** RECHAZADA → el fix de raíz va ANTES que cualquier
feature nueva. RESERVAS → se cierran en el siguiente deploy o se agendan explícitamente con el
PO. Las estipulaciones de Fable (§ de planes) se ejecutan como están escritas; desviarse exige
documentar la desviación y por qué.

**R4.3 — Reporte honesto SIEMPRE:** si algo falló, se muestra el output; si se saltó un paso, se
dice; si el fix fue tuyo el error, se reconoce ante el PO sin eufemismos (traducido a producto:
qué ve el usuario, qué riesgo corrió). El radar de cierre de sesión (máx. 5, priorizado) NO es
opcional y NO se adorna.

**R4.4 — Bugs reportados por el PO: diagnóstico forense ANTES de tocar código** (repro CDP o
evidencia de datos reales), causa raíz (no síntoma), fix que mata la CLASE, y buscar dónde más
vive el mismo patrón.

---

## §E — ENMIENDAS (solo Fable o el PO; fecha + motivo; nunca borrar, solo apilar)

- **2026-07-18 · v1 (Fable):** redacción inicial a pedido del PO, destilada de las lecciones
  reales de la sesión v366→v372 (rechazo v366, S14 enmascarado, assumption v369 vs data,
  ventana AVI_NEWS, clase parcial-en-curso, "+1.000" recortado).
