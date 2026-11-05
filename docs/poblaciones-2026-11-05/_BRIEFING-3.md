# Briefing 3 · Laura · cuando el embarazo TERMINA (5-nov-2026, tarde)

Sigue a tus dos dictámenes de hoy (`laura.md` y `laura-embarazo.md`). Ya están EN PRODUCCIÓN: v727 (las claves
`core_central`, `hueso`, `presion`, `embarazo` y la alerta del corazón) y v728 (la vigencia de tu Q5: fecha de
revisión, aviso al coach a los 90/180 días, «¿Sigue igual?» a quien se registró sola). El PO pidió que revises
esto: *«pásale el texto del embarazo a Laura»*.

## El hallazgo (medido con el código real, `parseLimitations(nota).keys`)

Tu texto al coach para el embarazo (`GEN_COND_COACH.embarazo`, `avi-core.js:1263`) termina en **«Si el embarazo ya
terminó, quita la frase de la nota.»** Y el aviso de vigencia de v728 (`limitReviewCoachText`, `avi-core.js:1489`)
dice a los 90 días: «Anotó embarazo hace más de 90 días. Pregúntale cómo va; si ya tiene visto bueno de su médico u
obstetra, actualiza la nota», con el botón «Ya no aplica» que abre la nota.

| Lo que queda escrito en la nota | Claves que lee la app |
|---|---|
| «estoy embarazada» | `embarazo`, `core_central` |
| *(quitar la frase, como dice el texto)* | **ninguna** |
| «ya no está embarazada» | `embarazo`, `core_central` (la negación no se lee) |
| «ya dio a luz» · «dio a luz hace 1 mes» | `core_central` |
| «postparto» · «posparto 2 meses» · «tuvo cesárea» · «cesarea hace 6 semanas» | `core_central` |
| «ya nació el bebé» · «tuvo a su bebé» · «tuvo el bebé hace 3 semanas» | **ninguna** |
| «parto hace 1 mes» · «recién parida» · «acaba de tener un bebé» | **ninguna** |
| «lactancia» · «estoy lactando» | ninguna |
| «perdí el embarazo» | `embarazo`, `core_central` |
| «tuve un aborto espontáneo» | **ninguna** |

O sea: el texto le pide al coach justo lo que **levanta el filtro del abdomen y del piso pélvico en el postparto**,
que en tu Q1 es la población principal de `core_central`. Y las formas más naturales de anotar el parto no se leen.

## Preguntas

**P1 · El texto del coach al terminar el embarazo.** Reescribe el final de `GEN_COND_COACH.embarazo` y dime si el
aviso de vigencia de v728 necesita una frase propia para `embarazo` (hoy usa la misma plantilla que las demás). Que el
coach sepa QUÉ escribir en la nota para que los cuidados del postparto sigan (y por cuánto: tu Q5 dice que se revisan
a los 90 días, nunca por calendario). Textos exactos.

**P2 · Las frases del parto que no se leen.** ¿Cuáles deben entrar en `core_central` (`GEN_LIMIT_KWS`, entrada de
`core_central`, `avi-core.js:433`)? Entrega la regex (sobre `_norm()`: minúsculas sin tildes; **sin lookbehind**) con
positivas y CONTROLES medidos, al estilo de tu Q1: «nació en 1990», «mi bebé tiene 3 años», «tuvo un bebé hace 5
años», «el parto de ideas», «parte», «repartir», etc. Decide qué hacer con la lactancia (¿es una condición para el
filtro o no?).

**P3 · Las negaciones.** «ya no está embarazada» sigue con la lista del embarazo. ¿Se intenta leer la negación, o se
acepta como falso positivo documentado (como hiciste con la alerta del corazón) y el texto del P1 lo evita? Decide y
mide.

**P4 · La pérdida del embarazo.** Hoy «perdí el embarazo» recibe la lista y los textos del EMBARAZO («tu embarazo»,
«visto bueno de tu médico u obstetra», «si notas que el bebé se mueve menos»), y «tuve un aborto espontáneo» no recibe
nada. ¿Qué corresponde clínicamente (¿`core_central`?, ¿ninguna?, ¿solo aviso de valoración?) y qué NO debe decirle
la app a esa persona? Es lo más delicado de este encargo: tú das el criterio clínico y las frases prohibidas; el
tono final lo revisa Sofía después.

**P5 · La vigencia del embarazo (v728).** Plazo de revisión hoy = 90 días. A quien se registró sola se le muestra
en su Perfil: «Hace unos meses escribiste algo sobre tu embarazo. ¿Sigue igual? Si cambió, cuéntale a tu coach para
que revise tu nota y tu plan» (`limitReviewAskText`, `avi-core.js:1503`). ¿Sirve para alguien cuyo embarazo terminó
(parto o pérdida)? ¿Los 90 días son el plazo correcto para el embarazo? Al pasar de «embarazada» a «postparto» la
fecha se renueva sola (cambian las condiciones) y el postparto se revisa a los 90 días: ¿bien?

## Cómo trabajar (igual que hoy)
- Mide con el código real (`node -e "const c=require('./avi-core.js'); ..."`), con tus regex nuevas SOLO en memoria.
  Cada cifra con su unidad y su control. Si propones tocar la regex de `core_central`, mide cuántos de los 375
  ejercicios caen (no debería cambiar: la regex de las NOTAS no es la del catálogo, pero compruébalo).
- **Solo lectura.** No edites código, no hagas commits, no corras matrices de sabotaje, no abras navegador, no toques
  Supabase.
- Escribe en `docs/poblaciones-2026-11-05/laura-postparto.md`. Crea el archivo al empezar y **guarda cada pregunta al
  cerrarla**. Cierra con «Qué NO miré y por qué» y los candados que exiges en la suite.
- En español, claro, sin nombres reales de asesorados.
