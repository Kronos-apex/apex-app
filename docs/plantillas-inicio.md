# Plantillas de inicio (v746)

Qué son: la rutina que el COACH aprobó para quien empieza. Cuando la persona es **Principiante** y existe una plantilla para su
combinación (lugar · sexo · días por semana), `generarRutinas` entrega ESA rutina: sin semilla ni rotación, en el orden escrito.
Dos personas iguales reciben exactamente lo mismo. Sin plantilla para la combinación, corre el generador de siempre.

Por qué: de 20 personas con rutina generada, 10 no registraron ni un entreno; de 16 con rutina del coach, 15 entrenaron (11-nov-2026).

## Dónde vive y cómo se ve
`PLANTILLAS_INICIO` en `avi-core.js` (justo debajo de `GEN_SPLITS`). Es dato plano, pegable desde JSON:

```js
PLANTILLAS_INICIO[lugar][sexo][días] = {
  id: 'inicio-gym-F-3',                 // único; queda en la rutina como `plantillaId`
  nombre: 'Inicio · mujer · gimnasio · 3 días',
  dias: [ { nombre: 'Glúteo', ejercicios: [
      { id: 'e42', series: 4, reps: 10 },                       // id del CATÁLOGO (app-1-infra.js)
      { id: 'e61', series: 4, reps: 10, alternativa: 'e73' },   // alternativa opcional (un solo id)
  ] } ],
}
```
- `lugar`: `gym` · `casa` · `parque` · `corporal` (el `place` del generador). `sexo`: `F` o `M`. `días`: 2 a 5 (el largo de `dias` TIENE que ser igual).
- `reps` de un ejercicio de tiempo (plancha) son **segundos**; los de cardio, **minutos** (como en el catálogo).
- Hoy sembradas (lo que el coach ya aprobó): **gimnasio · mujer · 3 y 4 días**. Nada más.

## Cómo pegar las del coach (cuando las apruebe)
1. Partir del borrador `docs/plantillas-inicio-BORRADOR.json`. Su forma es distinta (días con nombre propio, `alternativa:{id,nombre}`, `cierre`, `unidad`):
   cada entrada de `ejercicios` pasa a `{ id, series, reps, alternativa: '<id>' }` y cada semana se arma como `dias:[...]` en el orden de la semana.
   Los días «cierre» (cardio/abdomen) van como un ejercicio más, al final.
2. Pegar en `PLANTILLAS_INICIO` (un día reutilizable puede ser una `const` aparte, como `_PI_GLUTEO`).
3. Correr `core.validarPlantillasInicio(PLANTILLAS_INICIO, catálogo)` — la suite lo hace sola (test «las plantillas sembradas son válidas»): caza ids que no existen,
   ejercicios que no se hacen en ese lugar, repetidos en un día, series/reps vacíos, alternativas inexistentes y días que no cuadran con la clave.
4. Añadir en `avi.test.js` el caso nuevo (los ids esperados escritos a mano, no leídos de la tabla), versión nueva y entrada en `historial-versiones.md`.

## Qué decide el código (y por qué)
- **El nivel NO frena a la plantilla.** Hip Thrust con Barra, Desplantes, Lagartijas, Press Inclinado con Mancuernas y Remo con Barra son «Intermedio» en `EX_LEVEL` y SALEN igual:
  lo que el coach puso manda. Solo los saca una regla de salud.
- **Salud: el MISMO filtro de siempre** (`_genMakeExcluder`: zonas de Laura, menores de 16, perfil de carga alto, lista negra del coach, bandas en gym). Un ejercicio excluido se cambia por su
  `alternativa` si ESTA pasa el filtro (y no está ya ese día); si no, por lo que el generador elegiría para ese hueco (mismo músculo y tipo del original). El ejercicio cambiado lleva `plantillaReemplazo: '<id original>'`.
  Nunca se entrega uno prohibido. El correctivo por zona y los avisos de limitación siguen igual.
- **Fase de adaptación: NO se aplica encima.** Para un principiante la adaptación convertiría todo en 3×15 y el coach no vería lo que escribió. La plantilla ya es su rutina de inicio; la nota de la rutina pide
  poco peso y técnica primero. La única regla que toca series/reps es la de salud de **8 repeticiones mínimas** (presión, abdomen y piso pélvico, embarazo): sube a 8 lo que esté por debajo (el tiempo y el cardio no).
- **Descanso**: por tipo y objetivo, como en cualquier rutina normal (no el 60 s uniforme de la adaptación).
- **Biblioteca incompleta** (falta algún id de la plantilla): se usa el generador de siempre, no un día con huecos.
- La rutina queda marcada `origen:'plantilla-inicio'`, `plantillaId`, además de `generated:true, reviewed:false`. Regenerar sobre una rutina así pide confirmación (v746).
- Las rutinas que YA existen no cambian: esto solo corre al generar o regenerar.
