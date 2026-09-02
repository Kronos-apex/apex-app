# A1 · Código y calidad interna — Camila Restrepo (Lead Engineer) + Julián Ospina (QA)

## Veredicto en una frase
El código está sano — 976/976 verde, árbol limpio, los 21 sabotajes del codo y los 6 de
consolidación siguen mordiendo, y el filtro de lesiones sigue en cero contra el catálogo de
374 — pero hay un espejo nuevo sin candado (la fuerza de la contraseña que crea el coach vive
copiada a mano en una Edge Function y nada la compara contra `avi-core`), y sigue viva letra
muerta ya documentada (`renderPaymentCard`) que nadie retiró.

## Los 3 más grandes

1. 🔴 **La fuerza de la contraseña que el COACH le pone a un asesorado no tiene candado — se la
   pude bajar a "4 caracteres cualquiera" y la suite de 976 tests se quedó en verde.**
   - Evidencia: `supabase/functions/coach-create-client/index.ts:61` — `const weakPass = (p: string)
     => p.length < 8 || !/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/[0-9]/.test(p);` es una copia a
     mano de `passwordProblem` (`avi-core.js:2825`). No hay una sola línea en `avi.test.js` que lea
     `supabase/functions/coach-create-client/index.ts` (`grep -n "weakPass\|coach-create-client"
     avi.test.js` → 0 resultados), mientras que el mismo tipo de espejo SÍ tiene guarda en otros
     dos sitios: `RENEW_NOTICE_DAYS` (`avi.test.js:4825`, compara el umbral literal contra
     `daily-notifs/index.ts`) y `STREAK_WEEK_MIN_DAYS` (comentario explícito de paridad en
     `refresh_snapshot/index.ts:96`).
   - Intenté tumbarlo así: cambié la línea 61 a `const weakPass = (p: string) => p.length < 4;`
     (deja pasar `"abcd"`) y corrí `node avi.test.js` → **976/976 pasaron igual**. Restauré la
     línea original y confirmé `git status --porcelain` limpio.
   - Por qué importa: **esta es la ÚNICA puerta server-side de las cuentas que crea el coach**
     (el propio comentario del archivo lo dice, línea 58: "admin.createUser/updateUserById NO
     aplican la política de contraseñas del proyecto… ESTA es la única puerta"). Si alguien afloja
     `passwordProblem` en `avi-core.js` mañana (o lo endurece, y solo actualiza un lado) los
     asesorados que el coach crea a mano quedan con una regla de fuerza distinta a la de
     auto-registro, sin que ningún test lo note — exactamente la clase de defecto que ya costó
     `subscribePush`/`send-push` (v426) y `send-push`/`daily-notifs` (v551): un candado que se
     actualiza en un lado del espejo y muere en el otro, silencioso.
   - Qué cuesta arreglarlo: bajo. Un test en `avi.test.js` que lea el archivo `.ts` y compare su
     regex contra `passwordProblem` con los mismos casos de prueba que ya existen (línea 3962),
     igual que el patrón que ya usa el candado de `RENEW_NOTICE_DAYS`. ~15 líneas.

2. 🟠 **Las matrices de sabotaje mutan archivos del repo compartido sin ninguna señal externa de
   "sabotaje en curso" — un auditor de solo lectura no puede distinguir, desde fuera, un defecto
   real de un sabotaje ajeno en vuelo.**
   - Evidencia: lo viví yo mismo corriendo `node scripts/e2e/_sabotaje-codo.mjs` (21 sabotajes,
     ~2 min) en segundo plano. Mientras corría, `git status --porcelain` mostraba
     `M avi-core.js` y `node avi.test.js` reportaba entre 973/976 y 974/976 — rojo real, del
     sabotaje que en ese instante estaba adentro del archivo. No hay ningún lockfile
     (`.sabotaje-en-curso` o similar) que otro proceso — u otro agente de esta MISMA ronda de 9
     áreas, todas leyendo el mismo repo a la vez — pueda consultar antes de leer el estado del
     árbol o correr la suite. El propio orquestador confirmó el precedente más caro: anoche la
     matriz de RLS (`_sabotaje-rls.mjs`) dejó un fixture de producción roto de verdad porque un
     caso de escritura no se restauró, y hubo que repararlo a mano.
   - Intenté tumbarlo así: no es un sabotaje del catálogo de aserciones del proyecto — es una
     observación directa de operar la herramienta tal cual está: dejé correr el runner
     normalmente (sin intervenir) y medí el estado intermedio que cualquier lector externo vería
     en ese instante (repo sucio, suite intermitente en rojo), que el runner restauró solo al
     terminar (`exit 0`, 21/21, `git status --porcelain` limpio después).
   - Por qué importa: esta ronda tiene 9 agentes leyendo el mismo repo al mismo tiempo. Si dos
     corren sabotajes que tocan el mismo archivo, o uno lee "estado sano" mientras otro sabotea,
     el primero reporta un falso rojo — o, como ya pasó con RLS, un sabotaje que escribe de verdad
     puede quedar sin restaurar si el proceso muere a mitad de camino, y nadie lo nota hasta
     tropezar con el fixture roto.
   - Qué cuesta arreglarlo: bajo-medio. Un lockfile que cada runner de sabotaje escriba al
     empezar y borre en su bloque de restauración (ya todos tienen ese `try/finally` para volver
     los archivos a su estado), y una línea en el README de `scripts/e2e/` que diga: si el lock
     existe, esperar — no diagnosticar. Decisión del PO, dado el volumen de agentes concurrentes
     de hoy.

3. 🟡 **`renderPaymentCard` sigue viva y se sigue llamando en cada render de Hoy, aunque desde
   v540 el propio repo documenta que es letra muerta.**
   - Evidencia: `app-2-login.js:1412` define la función; `app-4-entreno.js:458` la sigue llamando
     (`renderPaymentCard(client);`) en cada pintada de la pantalla "Hoy". El gotcha de v540 en
     `CLAUDE.md` (línea ~966) ya certificó que el campo `nequi` está vacío en la nube y que aunque
     no lo estuviera vive en la fila del COACH, inalcanzable para el asesorado por RLS. El código
     de la función confirma el cortocircuito: `if(!nequi||st!=='expiring'){con.innerHTML='';return;}`
     (`app-2-login.js:1417`) — nunca pinta nada en producción.
   - Intenté tumbarlo así: no hace falta sabotearla — es una función que corre en cada render de
     Hoy y siempre retorna vacío por las mismas dos razones ya medidas en v540 (dato vacío + RLS
     por dueño). No es un candado que pueda fallar mudo: es trabajo que se hace y se tira, versión
     tras versión, desde hace 24 versiones (v540→v564).
   - Qué cuesta arreglarlo: bajo — borrar la función y su llamada (o dejarla explícitamente
     comentada con una nota de por qué se conserva). Decisión del PO si prefiere conservarla por
     si algún día resuelve la RLS del Nequi.

## Todos los hallazgos

(mismos tres de arriba, en el mismo orden por daño ÷ costo — no hay una cuarta entrada: meter
algo más sería la complacencia que la regla 5 prohíbe)

1. 🔴 El espejo sin candado de `passwordProblem` en `coach-create-client/index.ts` — ver arriba.
2. 🟠 Las matrices de sabotaje sin lockfile, riesgo de falso rojo/verde entre agentes concurrentes
   — ver arriba.
3. 🟡 `renderPaymentCard` sigue siendo letra muerta que corre en cada render — ver arriba.

## Lo que SÍ está sano, con números

No es un hallazgo — es la parte del informe que la regla 5 pide decir con cifras en vez de
callar. Le pasé la matriz de sabotajes al catálogo repoblado (+127 ejercicios, v547-v550) y al
motor de consolidación de carga (v529), y los dos gates siguen mordiendo:
- `node scripts/e2e/_sabotaje-codo.mjs` → **21/21 sabotajes muerden** contra el catálogo de 374
  ejercicios (incluye los 3 casos del lote 4: v550 «salto» dentro de «a-salto», v549 el nombre
  leído del catálogo en vez de escrito a mano).
- `python scripts/e2e/_sabotaje-consolidacion.py` → **6/6 muerden** (consolidación de carga, v529).
- `node scripts/e2e/_verify-lesiones.mjs` contra el catálogo REAL en producción → **27/27 OK**,
  cero contraindicados pintados con hernia declarada, calentamiento incluido (v424 sigue cerrado).
- Migración de los 18 candados premium de `isFreeClient` a `premiumLocked` (v564): revisé los 19
  call sites (`grep -c "premiumLocked("` en los 6 archivos) y no quedó ninguno usando el criterio
  viejo donde debería usar el nuevo — los 3 sitios que SIGUEN en `isFreeClient`
  (`app-3-coach.js:250`, `app-3-coach.js:1286`, comentario en `app-6-extra.js`) son del panel del
  COACH, donde el propio código documenta (`avi-core.js:4114`) por qué NO deben migrar. Además
  revisé a mano el `premiumLockHTML`/`showPremiumUpsell` que Lucas QA marcó como hallazgo del
  propio v564 (el botón "Quiero un coach" quedaba muerto para un vencido) — confirmado arreglado
  con rama explícita por `MS.getStatus(c)==='overdue'` (`app-3-coach.js:1307-1312`).

## Sospechas sin medir

- **La banda de "sin entrenar 4+ días" (`h-venc`, `app-2-login.js:1506-1513`) y el banner de
  adherencia (`app-2-login.js:1579-1583`) excluyen a propósito a `overdue` de la cuenta**
  ("lo vencido lo cubre el banner de pagos"). Esa exclusión se escribió cuando `overdue`
  significaba "bloqueado, no puede entrenar". **Desde hoy (v564) `overdue` SÍ puede entrenar** (cae
  en AVI FREE). No medí si esto deja huecos reales: el banner de pagos sigue mostrando a todo
  `overdue` con vencimiento pasado (su condición `due<=in5days` es perpetua una vez vencido), así
  que el coach probablemente sigue viendo a esa persona en algún lado — pero ya NO se le marca
  específicamente como "dejó de entrenar", solo como "debe". No tengo el dato de cuántos `overdue`
  reales hay hoy entrenando o no entrenando para decir si esto muerde a alguien.
- El scan de `audit-catalog.mjs` reporta 142 ejercicios "MAJOR: sin foto" — son los 127+ del lote
  de repoblación, foto pendiente por decisión ya tomada del PO (las toma él en el gym). No es un
  hallazgo nuevo, lo dejo anotado solo porque toca directamente el delta.

## Qué NO miré y por qué

- **No corrí la matriz completa `_sabotaje-descarga-programada.py` ni `_sabotaje-dia1.py`** (v531,
  v532): ambas invocan un harness Chrome real y, dado que otras áreas de esta misma ronda
  comparten la cuenta QA con ventana de rate-limit, preferí no encadenar más corridas de
  navegador de las estrictamente necesarias. Ya están documentadas como verdes en el historial
  reciente y no tocan directamente el módulo de dinero ni el catálogo, que eran mi foco.
- **No audité el módulo de comunidad** (`app-7-community.js`, 2.230 líneas) más allá de lo que
  aparece en los gotchas — está CONGELADO por el PO hoy y fuera de mi territorio salvo hallazgo de
  seguridad; no encontré ninguno al pasar por los espejos de Edge Functions.
- **No revisé `activate_public_profile` ni `delete-account`** a fondo — no hay superficie del
  delta v528→v564 que los toque, y el briefing pide centrarme en el delta.
- **No repetí visualmente las capturas de `_verify-lesiones.mjs`** (7 PNG generados en
  `%TEMP%/avi-lesiones`) — confié en las 27 aserciones del harness, que ya leen `innerText` de lo
  pintado (no HTML crudo), siguiendo la regla de sondas de este repo.
- **No medí cuántos asesorados reales están hoy en estado `overdue`** para cuantificar la sospecha
  del banner de adherencia — habría requerido una consulta SQL nueva contra producción y el
  briefing ya me dio la base de "Gente"; no quise volver a medir lo que no estaba en mi lista.

## Verificación final del entorno
- `git status --porcelain` → limpio (confirmado dos veces: tras mi sabotaje manual del edge de
  contraseñas, y tras el sabotaje-codo en background que dejó `avi-core.js` modificado a mitad de
  corrida — esperé a que el propio runner lo restaurara y volví a confirmar).
- `node avi.test.js` → **976/976 pasaron**, árbol limpio, HEAD en avi-v564.
