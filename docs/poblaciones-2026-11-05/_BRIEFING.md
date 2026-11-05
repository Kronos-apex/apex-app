# Briefing · Laura · que la app LEA postparto/diástasis, osteopenia e hipertensión (5-nov-2026)

**Pedido del PO (5-nov):** «Arranca» — primero tu dictamen, después se programa. Es el paso «Siguiente» de
`docs/roadmap.md` (§ CALENTAMIENTO POR RECETA) que nació de TU dictamen del 23-oct
(`docs/calentamiento-2026-10-23/laura.md`, §3.2 «Lo que NO lee, y qué hace falta»).

Tu veredicto es VINCULANTE. No se escribe una línea de código hasta que este informe exista.

## Qué hay hoy (medido por el orquestador el 5-nov, antes de lanzarte)
- La app lee las limitaciones SOLO de un texto libre: `client.notes` (el coach lo escribe en la ficha; quien se
  registra solo lo escribe en el paso 6 del asistente). Lector: `parseLimitations()` en `avi-core.js:1135`, palabras
  en `GEN_LIMIT_KWS` (`avi-core.js:385`). Cada clave apunta a una zona de `GEN_ZONE_EXCL` (`avi-core.js:460`, regex
  contra el NOMBRE del ejercicio) y a la matriz del calentamiento `WARMUP_ZONE_EXCL_IDS` (`avi-core.js:890`, por id).
- Las recetas del calentamiento: `WU_RECIPES` (`avi-core.js:3696`) y `wuResolveRecipe` (`avi-core.js:3784`), con tus
  cadenas de alternas. La biblioteca de piezas: `WARMUP_LIBRARY` en `app-6-extra.js` (~línea 2460).
- **Datos reales (tabla `user_data`, asesorados, NO el coach):** 26 asesorados · 14 mujeres · **solo 4 tienen
  notas escritas**. Ninguna nota menciona postparto, cesárea, diástasis, embarazo, piso pélvico, prolapso,
  osteopenia/osteoporosis, hipertensión ni corazón. **UNA sí dice «hernia umbilical»**: hombre, principiante,
  recomposición, 6 rutinas, 46 sesiones, **entrenó hoy**. Hoy la app lo lee como `lumbar` porque `hernia` está en la
  regex de lumbar (el comentario de `avi-core.js:370` dice que ese error «va hacia el lado seguro»).
- O sea: lo que dictes protege sobre todo a quien LLEGUE (registro por cuenta propia y altas nuevas), más ese caso.

## Lo que tienes que dictaminar (escribe CADA pregunta en tu informe al cerrarla, no al final)
**Q1 · Las palabras.** Tu propuesta del 23-oct: `core_central` = `postparto|posparto|diastasis|cesarea|piso pelvico|
prolapso|embaraz|hernia umbilical|hernia abdominal`; `hueso` = `osteopeni|osteopor`; `presion` = `hipertens|presion
alta|tension alta|cardiopat|arritmia|infarto`. Revísalas como en v676: cada término con su CONTROL de falso positivo
(¿«embarazo» de la pareja?, ¿«cesárea hace 10 años»?, ¿«presión» a secas, que puede ser «presión en el pecho» = bandera
roja y NO hipertensión?, ¿«parto» suelto?). Recuerda que `_norm` quita tildes y la ñ.

**Q2 · Las reglas del ENTRENO por clave** (lo que falta y por lo que se frenó todo). Para cada clave: la regex contra
el NOMBRE del ejercicio, **medida contra el catálogo real de 375** (`defaultExercises` en `app-1-infra.js`; cómo
extraerlo: `docs/biblioteca/cruzar-biblioteca.js` líneas 8-18), con cuántos caen, la lista de los que caen y los
CONTROLES de lo que NO debe caer (como hiciste con isquios: lo que es tratamiento se queda). Tu 23-oct dijo: postparto
sin impacto ni flexión de tronco; osteopenia sin flexión de tronco con carga; hipertensión sin apneas ni isométricos.
Decide además lo que el nombre NO puede atrapar (Valsalva, cargas máximas) y cómo lo dice el TEXTO.

**Q3 · El calentamiento.** Tus listas por id del 23-oct (`core_central`: wac1 wac2 we5 we4 wf1 · `hueso`: we5 wf1 wac3 ·
`presion`: wa6 wf1 wac1). **Vuelve a barrer la matriz** (tu candado 7): con cada clave nueva, qué pieza ASCIENDE en
cada receta cuando sale la otra (la clase de bug del 20-sep). Y dictamina el interino: con las claves ya leídas,
¿vuelve el dead bug (`wac1`) a ser la primera opción del CORE_CARDIO de mujer sin la clave? ¿entran `we5`, `wf1` y
`wg4` a alguna receta, o siguen fuera?

**Q4 · Los textos.** Etiqueta para el coach (`GEN_ZONE_LABEL`), qué dice que quitó (`GEN_ZONE_QUITA`) y lo que lee la
persona que se registró sola (ver el bloque «¿QUIÉN VA A LEER ESTA NOTA?» en `avi-core.js` ~1165). Estas tres no son
ZONAS de dolor sino CONDICIONES: ¿cambia cómo se le habla a la persona?

**Q5 · Vigencia.** El postparto pasa; la nota no. ¿Regla? (¿la condición dura hasta que el coach la borre?, ¿algún
texto que le recuerde revisarla?)

**Q6 · El caso real de «hernia umbilical».** ¿Queda `lumbar` + `core_central`, o solo `core_central`? Mide qué
cambia en SU plan con cada opción (cuántos ejercicios salen o entran) usando `generarRutinas` real.

**Q7 · (Recomendación, la decide el PO)** ¿Conviene que el registro PREGUNTE explícitamente (casillas «estoy en
postparto / tengo diástasis», «tengo hipertensión», «tengo osteoporosis») en vez de depender de que la persona lo
escriba? Solo tu recomendación y por qué.

## Cómo trabajar
- Lee primero tu rol (`.claude/agents/laura-physio.md`), tu dictamen del 23-oct y `docs/dictamen-laura-dolor-2026-08-08.md`.
- **Mide con el código real**: `node -e "const c=require('./avi-core.js'); ..."` (la suite lo carga así). Cada cifra
  con su UNIDAD (¿ejercicios del catálogo, rutinas, piezas?) y su CONTROL. Un número sin control no vale.
- **Solo lectura.** No edites código, no hagas commits, no corras matrices de sabotaje, no abras navegador, no toques
  Supabase (los datos reales ya están arriba).
- Escribe en `docs/poblaciones-2026-11-05/laura.md`. **Al cerrar CADA pregunta, guárdala en el archivo** (dos rondas
  se perdieron por escribir todo al final). Cierra con: «Qué NO miré y por qué» y la lista de candados que exiges en
  la suite.
- En español, claro, sin nombres reales de asesorados.
