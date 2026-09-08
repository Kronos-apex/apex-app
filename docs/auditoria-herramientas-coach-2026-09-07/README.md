# Auditoría «las herramientas de trabajo del coach» — 2026-09-07

Ronda de 3 áreas, 3 agentes Sonnet, **3 de 3 entregadas**. Encargo del PO: seguir con *«una
auditoría en un área sin mirar»*.

- `_BRIEFING.md` — reglas duras, baseline medido, falsos positivos conocidos y qué cuenta como
  hallazgo serio. **Reutilizable: es el molde de la próxima ronda.**
- `D1-mensajes.md` — Sofía Castaño (CS) + Lucas Ortega (QA funcional)
- `D2-ejercicios-y-plantillas.md` — Valery (coach) + Julián (QA estático)
- `D3-cargas-y-detalle.md` — Mateo Sanín (Data) + Valentina Ríos (PM)

## Cómo se eligió el área

Leyendo la sección «Qué NO miré y por qué» de las seis rondas anteriores. El coach tiene **6
paneles** en su barra lateral y solo 2 se habían auditado (Inicio y Asesorados, ronda del 6-sep,
que además confesó por escrito no haber mirado *«Plantillas, Ejercicios y Mensajes»* ni el fondo
del detalle del asesorado). **«Cargas» (`p-progress`) no aparecía en ninguna de las siete rondas:
nadie lo había mirado jamás.**

## ⚠️ Lo primero: TRES cifras del baseline del orquestador salieron mal, y las tumbaron los agentes

Esto es lo más valioso de la ronda para la próxima, así que va arriba y no enterrado:

1. **«Natalia y Kathe escribieron y nadie contestó» — FALSO.** Los dos últimos mensajes suyos son
   **avisos automáticos** de la app (`system:true`: *«🩺 X marcó que hoy entrena con dolor…»*), no
   algo que ellas teclearan. La consulta del baseline agrupó por `from='client'` **sin mirar la
   bandera `system`**: le faltaba el control de discriminación. Se le llegó a reportar al PO y se
   corrigió el mismo día.
2. **«11 días de nutrición» — FALSO.** No son días de uso: son las **11 claves** del objeto de
   plan (`fat, goal, kcal, plan, prot, avoid, carbs, meals, water, examples, updatedAt`). Contar
   claves de un objeto no es contar registros.
3. **«La fila del coach pesa 95 KB» — CORTO.** Eso es `pg_column_size` (comprimido en disco). El
   payload real que viaja es **247.158 bytes**, de los cuales 245.933 son la biblioteca de
   ejercicios.

Y una corrección del orquestador **a un agente**: D2 dice que la plantilla sin hombros está
aplicada a 4 personas; son **3** (maria rubio, Astrid Beltran, Kathe Beltran). Nataly tiene otra
rutina de nombre casi igual —«Tren Superior — **Pecho, Espalda** y Hombros»— que **sí** trae dos
ejercicios de hombro.

## Lo que verificó el orquestador ANTES de reportarle al PO

No se le pasa nada al PO sin medirlo aparte. De los hallazgos que deciden trabajo:

- **D1-1** — `renderClientMsgs` (`app-4-entreno.js`) reemplaza el hilo ENTERO por
  `premiumLockHTML` cuando `!clientHasCoach`, y `sendCoachChatMsg` (`app-3-coach.js:3449`) manda
  el push con el texto real igual. Alcance medido: **5 de las 11 conversaciones bajo candado hoy**
  (Samuel `libre` con 40 mensajes; Nataly, Miguel, Natalia y Cristian en `app`) = **68 de los 95
  mensajes que existen, el 72%.** ✅ confirmado. → **ARREGLADO en v584.**
- **D1-2** — `_persistCoachWrite` (`app-1-infra.js:1079-1083`) solo hace `warn()` en el catch: ni
  `_setAuthDirty` ni respaldo local, mientras la rama del CLIENTE sí tiene *«Respaldo local
  SIEMPRE»*. En modo auth `ax_m` del coach no se espeja a localStorage. ✅ confirmado por asimetría.
- **D2-2** — `coach_settings::text` = **247.158 bytes**, la biblioteca 245.933, y el camino
  `openCoachChat → markCoachRead → sv('ax_msgreads') → upsertOwn({coach_settings})` sube el objeto
  completo. ✅ confirmado, con la cifra corregida al alza.
- **D2-1** — `CATALOG_FIELDS` (`app-2-login.js:7`) y `saveEx` (`app-4-entreno.js`) se solapan en
  **name, muscle, type, icon, desc**. ✅ mecanismo confirmado; **sin víctima hoy** (374/374 del
  catálogo, 0 ejercicios propios).
- **D2-3** — la plantilla «Tren Superior — Espalda, Pecho y Hombros» = `e6, e83, e51, e84, e24` →
  3 espalda + 2 pecho, **0 hombros**. ✅ confirmado. Alcance corregido a 3 personas, y la víctima
  real es **Kathe Beltran: 0 ejercicios de hombro en su plan entero** (4 rutinas, 25 ejercicios);
  Astrid y maria rubio sí entrenan hombro en «Brazo y abdomen».
- **D3-1** — `renderProgressPanel` pinta `pts[pts.length-1].maxKg` (la ÚLTIMA sesión) como
  titular y calcula la tendencia contra `pts[0]` (la PRIMERA). Astrid: sentadilla con récord
  **42,5 kg** y última sesión **4,5 kg** (1-sep). ✅ confirmado contra el historial real.
- **D3-2** — Nataly, «Curl Femoral Acostado en Máquina»: `prs` dice **20 kg del 25-may**; su
  historial tiene **30 kg el 25-jul**. ✅ confirmado.

## Los hallazgos, en una línea cada uno

**D1 · Mensajes**
1. 🔴 Bajar el nivel de acceso **esconde el historial completo** del chat, no solo bloquea
   escribir — y el push sigue entregando el texto del coach. **ARREGLADO en v584.**
2. 🔴 Un mensaje que el coach escribe sin red **se pierde en silencio** y la app le dice «Mensaje
   enviado».
3. 🟡 El badge de no leídos no distingue un aviso automático de dolor de un mensaje humano.
4. 🟢 Sanos y verificados: no hay tope en `msgs`, `ax_msgreads` sincroniza bien entre aparatos, la
   RLS aísla las conversaciones, y el push **sí** llega con la app cerrada.

**D2 · Ejercicios y Plantillas**
5. 🔴 `migrateExercises` **revierte en cada login** el nombre/músculo/tipo/ícono/descripción de un
   ejercicio del catálogo que el coach haya editado. Sin víctima hoy.
6. 🔴 Abrir una conversación **vuelve a subir los 374 ejercicios** (247 KB) por empaquetarlo todo
   en un solo bloque.
7. 🟡 La plantilla que promete hombros **no tiene ni un ejercicio de hombro** (3 personas; Kathe
   se queda en cero). **RESUELTO para Kathe el 7-sep** (ver abajo).
8. 🟡 Aplicar una plantilla puede **heredar el calentamiento** de la última rutina editada, de
   otro asesorado.
9. 🟢 Las plantillas **sí se usan**: 21 de 108 rutinas, en 10 de 25 asesorados, son copia por
   contenido de una de las 5 (medido comparando ejercicios, no por un marcador — que no existe).

**D3 · Cargas y el fondo del detalle**
10. 🔴 «Cargas» muestra **el peso de la última sesión**, no el récord: no coincide en el 33% de
    241 ejercicios, y 14 casos salen marcados «↓ bajando» cuando hubo progreso.
11. 🔴 Los récords **se quedan atascados** meses (Nataly: 20 kg de mayo cuando hizo 30 en julio).
12. 🔴 **El coach no ve ni una sola foto de progreso** en ningún panel; 6 personas tienen fotos
    guardadas.
13. 🔴 El **peso corporal** no se pide ni se recuerda nunca: 7 de 26 no tienen ninguno, y quien
    tiene uno lo tiene de hace hasta 103 días — con eso se calculan sus macros.
14. 🟡 El motor de estancamiento **ya existe** (`shockTargets`) y «Cargas» no lo usa: 10 de 11
    activos tienen al menos un ejercicio con 3+ sesiones al mismo peso.

## Estado — ACTUALIZADO el 8-sep

El PO mandó atacar los cuatro puntos que quedaban. **Los cuatro están en producción** (v588-v591,
`_prodcheck 591` verde con `jsErrors: []`):

| # | Hallazgo | Estado |
|---|---|---|
| D1-1 | el candado se come el historial del chat | ✅ **v584** |
| D1-2 | el mensaje del coach sin red se pierde en silencio | ✅ **v588** |
| D2-2 | abrir un chat resube la biblioteca (241 KB) | ✅ **v589** — 237.002 B → 438 B |
| D2-3 | la plantilla promete hombros y no los tiene | ✅ **v590** — la app lo dice; la plantilla la corrige el PO |
| D2-4 | aplicar una plantilla hereda el calentamiento de otro | ✅ **v590** — y también heredaba el «por qué» |
| D3-1 / D3-14 | «Cargas» muestra la última sesión, no el récord | ✅ **v585** |
| D3-2 | los récords se quedan atascados | ✅ **v591** — 9 récords de 4 personas |
| D3-3 | el coach no ve ninguna foto de progreso | ✅ **v586** |
| D3-4 | el peso corporal no se pide ni se recuerda | ✅ **v587** (la mitad: la ficha dice de cuándo es) |

### Lo que NO se hizo, y por qué
- **D1-3** 🟡 el badge de no leídos no distingue un aviso automático de un mensaje humano. Sin
  tocar: es el mismo dato que ya corrigió el baseline de esta ronda y no cuesta trabajo perdido.
- **D2-1** 🔴 `migrateExercises` revierte en cada login la edición del coach sobre un ejercicio del
  catálogo. **Sin víctima hoy: 374/374 del catálogo y 0 ejercicios propios**, medido otra vez el
  8-sep. Queda anotado como la mina que es.
- **La plantilla sigue sin hombros.** Qué ejercicio meterle es decisión del PO; la app se lo dice
  ahora cada vez que la ve, y a las dos rutinas vivas con ese nombre les pasa lo mismo.
- **Pedirle al asesorado que se pese** (la otra mitad de D3-4): sigue sin construir, por lo dicho
  en v587 (cadencia y tono los deciden él y un especialista, y hay dos menores en la base).

## Estado (al cierre de la ronda, 7-sep)

**Diagnóstico, salvo dos cosas que el PO mandó hacer el mismo día:**

- ✅ **v584 — el historial de Samuel.** El candado ya no se come la conversación: se lee en solo
  lectura y el candado baja al sitio de la caja de escribir. Escribir sigue siendo premium.
- ✅ **Kathe entrena hombro.** Se le añadieron **Press Militar con Mancuernas (4×10)** y
  **Elevaciones Laterales (4×15)** a su rutina del martes, escritos directo en producción con
  respaldo previo en `~/.avi/kathe-rutinas-antes-2026-09-07.json`.

El resto **no está arreglado**: las prioridades las decide el PO.
