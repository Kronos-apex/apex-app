# Dictamen de Laura · cuando el embarazo TERMINA (5-nov-2026, noche)

Estado: CERRADO (P1 a P5). Sigue a `laura.md` y `laura-embarazo.md`; responde `_BRIEFING-3.md`. Veredicto vinculante en seguridad. **Solo lectura del código**: todas las cifras salen de `avi-core.js` real (v728) y del catálogo real de 375 ejercicios (`defaultExercises`, extraído como en `cruzar-biblioteca.js`), con las regex nuevas inyectadas **solo en memoria** (guion de medición en la carpeta temporal de la sesión, fuera del repo). El repo no se tocó.

**Resumen**

| Pregunta | Veredicto |
|---|---|
| P1 | El texto actual es PELIGROSO: manda borrar la frase y eso apaga el filtro. Se reescribe el cierre; el aviso de vigencia necesita frase propia para `embarazo`. |
| P2 | Sí: 20 alternativas nuevas para `core_central` (parto, nacimiento, edad del bebé, lactancia). 40 positivas, 0 falsos negativos; 33 controles, 0 falsos positivos; 0 de 375 ejercicios caen. La lactancia SÍ entra (como señal de postparto). |
| P3 | La negación se lee en UN solo caso, el que es en realidad un FIN («ya no estoy embarazada», «mi embarazo terminó»): se trata como terminó, no como «no hay embarazo». El resto de negaciones («no estoy embarazada», «no sé si estoy embarazada») NO se leen: falso positivo documentado. |
| P4 | Pérdida del embarazo = `core_central` SOLA (no `embarazo`), con texto neutro que no la nombra, más un aviso médico genérico. Hoy es lo peor de los dos mundos. Lista de frases prohibidas abajo. Lo revisa un obstetra y Sofía. |
| P5 | 90 días sirve para el embarazo (un trimestre) pero la frase al coach y a la persona no sirven para el final del embarazo: se reescriben. Embarazada → postparto renueva la fecha (medido) y postparto a 90 días está bien. |

---

## P1 · El texto del coach al terminar el embarazo  (CERRADA)

### Lo que medí (y por qué el texto actual es un riesgo de seguridad)
Tabla de `parseLimitations(nota).keys` con el código de hoy:

| Nota | Claves hoy |
|---|---|
| «estoy embarazada» | `embarazo`, `core_central` |
| *(el coach «quita la frase», como pide el texto)* | **ninguna** |

El final de `GEN_COND_COACH.embarazo` («Si el embarazo ya terminó, quita la frase de la nota.») y el botón «Ya no aplica» de v728 llevan al coach a **dejar a una mujer en las primeras semanas del postparto SIN el filtro del abdomen y del suelo pélvico**, que es la población principal de `core_central` en mi Q1 de la mañana. Es el mismo defecto que ya vi con «quitar» sin sustituir: la salida (borrar) se ofrece sin pasar por el criterio de retorno. Los criterios de retorno se cumplen, no se infieren de que la persona ya no esté embarazada. **Nota que me parece grave:** el texto no dice qué escribir en su lugar.

### Texto propuesto (reemplaza SOLO la última frase de `GEN_COND_COACH.embarazo`)

Frase actual que sale: «Si el embarazo ya terminó, quita la frase de la nota.»

Frase nueva:

> Cuando el embarazo termine, NO borres la frase: sin ella la app apaga el filtro del abdomen y del suelo pélvico justo cuando más lo necesita. Cámbiala por «postparto» (y «cesárea» si la hubo) o, si no continuó, por «pérdida del embarazo». Solo la quitas del todo cuando su médico o su fisio la den de alta. Si la frase era un descarte («no estoy embarazada») o hablaba de otra persona, sí bórrala.

Control medido con las regex de P2/P4: lo que el coach escribiría siguiendo el texto se lee así:

| Nota que escribe el coach | Claves (reglas nuevas) |
|---|---|
| «postparto» | `core_central` |
| «postparto, cesárea» | `core_central` |
| «pérdida del embarazo» | `core_central` (+ bandera `perdida`) |
| «ya no está embarazada» | `core_central` (bandera `fin`) |
| «Postparto de 3 semanas, cesárea. Hipertensión controlada con losartán» | `core_central`, `presion` |

### El aviso de vigencia de v728 SÍ necesita frase propia para `embarazo`
Hoy (medido, día 90): *«Anotó embarazo hace más de 90 días. Pregúntale cómo va; si ya tiene visto bueno de su médico u obstetra, actualiza la nota.»* — «actualiza la nota» se lee como «bórrala», el mismo error. Y el botón «Ya no aplica» abre la nota para quitar la frase.

Texto propuesto de `limitReviewCoachText` cuando `r.conds` incluye `embarazo` (el resto de condiciones no cambia):

> Anotó embarazo hace más de 90 días. Pregúntale cómo está. Si sigue embarazada, pulsa «Sigue vigente». Si ya nació el bebé, cambia la frase por «postparto»; si el embarazo no continuó, por «pérdida del embarazo». No la borres: sin la frase se apaga el filtro del abdomen.

(La parte `${resp}` de «respondió en la app…» se conserva igual.) Botón: para `embarazo` el rótulo «Ya no aplica» debe decir **«Terminó o cambió»** (abre la nota igual). Para las otras condiciones se queda como está.

Dos textos más de v728 que nombran el embarazo y que se usan con alguien cuyo embarazo pudo terminar de la peor manera (ver P4, P5):
- `limitReviewAskText` (a la persona): «escribiste algo sobre **tu embarazo**».
- `limitReviewChangedMsg` (mensaje en el hilo): «cambió algo de lo que anotó (**embarazo**)». Este mensaje se guarda como `from:'client'` en el hilo: si más tarde la persona ve ese chat, lo ve escrito con su nombre. **Verifícalo** (el plan libre dice no tener chat; una persona que pasa a coach sí lo vería).

---

## P2 · Las frases del parto que no se leen  (CERRADA)

**Veredicto:** sí entran. Son nacimiento, no «embarazo»: van en `core_central` SOLA (nueva entrada `{ zone: 'core_central', re: GEN_POSTPARTO_RE }`, sin tocar las existentes). Sobre `_norm()`, **sin lookbehind** (verificado: `/\(\?<[=!]/` → falso en las cuatro regex), con lookahead solo.

### La regex (para `avi-core.js`)

Armada con `RegExp(array.join('|'))` a partir de piezas con nombre. Una sola literal de 3.266 caracteres es ilegible y no se puede revisar; el candado de la suite lee `.source`. Se escribe con la herramienta Edit (las barras invertidas no sobreviven a un heredoc).

```js
const GEN_NUM = String.raw`(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|varios|muchos)`;
// «hace años»: mira UNA palabra adelante. Más ancha se comía «tuvo un bebé y es de 30 años».
const GEN_ANT = String.raw`(?!( \w+)? (hace|de)( mas de| como| unos| casi)? ${GEN_NUM} anos|( \w+)? (en|del) (19|20)\d\d)`;
const GEN_BEBE = String.raw`(bebe|bebita|bebito|beba)`;
const GEN_HIJO = String.raw`(hij[oa]|nene|nena|nino|nina|gemelos|mellizos)`;
const GEN_DET = String.raw`(un |una |mi |su |el |al |nuestro |nuestra |a mi |a su )?`;
const GEN_TIEMPO = String.raw`(\d+ (dias?|semanas?)|([1-9]|1\d|2[0-4]|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce) mes(es)?|(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez) (dias?|semanas?))`;
const GEN_POSTPARTO_RE = new RegExp([
  String.raw`post[ -]?parto|pos[ -]?parto|puerper`,
  String.raw`(tras|luego del?|despues del?) (el |mi |un |este )?parto`,
  String.raw`\bparto${GEN_ANT} (hace|reciente|fue|prematur|complicad|dificil|largo|rapido|asistid|inducid)`,
  String.raw`\b(el |mi |su )?${GEN_BEBE}${GEN_ANT} (ya )?nacio`,
  String.raw`\b${GEN_HIJO}${GEN_ANT} (ya )?nacio`,
  String.raw`\bnacio ${GEN_DET}(${GEN_BEBE}|${GEN_HIJO})${GEN_ANT}`,
  String.raw`\bnacieron (mis |los |las |nuestros )?(gemelos|mellizos|hijos|bebes)`,
  String.raw`\b(tuve|tuvo|tuvimos|tuvieron|acab\w* de tener) ${GEN_DET}${GEN_BEBE}${GEN_ANT}`,
  String.raw`\b(tuve|tuvo|tuvimos) ${GEN_DET}${GEN_HIJO} hace ${GEN_TIEMPO}`,
  String.raw`\b(tengo|tiene|tenemos) ${GEN_DET}${GEN_BEBE}${GEN_ANT}`,
  String.raw`\b${GEN_BEBE} (tiene |de |con )${GEN_TIEMPO}`,
  String.raw`\b${GEN_HIJO} (tiene |de |con )${GEN_TIEMPO}`,
  String.raw`recien (parid[ao]|mama|madre|dio a luz|di a luz|tuve|tuvo)`,
  String.raw`\b(mi|su|nuestro) (bebe )?recien nacid`,
  String.raw`acab\w* de (parir|dar a luz|ser (mama|madre))`,
  String.raw`\b(mama|madre) (reciente|primeriza|nueva)\b`,
  String.raw`\b(mama|madre)${GEN_ANT} hace`,
  String.raw`\bcezarea|\bsesarea|\bcesaria\b`,
  String.raw`lactanc|lactand|amamant|lactante`,
  String.raw`(doy|dando|dar|di|le doy|le estoy dando) (el )?pecho (a |al )?(mi |un |el |su )?(${GEN_BEBE}|${GEN_HIJO})`,
].join('|'));
```

### Decisiones y por qué (cada una con su control medido)

| Decisión | Razón y control |
|---|---|
| `parto` suelto NO entra | «el parto de ideas», «parto de cero, soy principiante», «reparto domicilios», «me apartó del gym», «parte», «repartir» → 0. Solo con contexto de nacimiento («parto hace…», «tras el parto», «parto prematuro») |
| «hijo/hija» solo con tiempo reciente | «tuve un hijo» → 0 (puede ser de hace 15 años); «tuve un hijo hace 6 semanas» → ✔; «mi hijo tiene 12 años», «mi hijo tiene 30 meses», «mi hijo de 15 años» → 0. «bebé» sí se lee sin tiempo: «tengo un bebé» → ✔ |
| Guarda de «hace años» (`GEN_ANT`) | «tuvo un bebé hace 5 años», «tuve un bebé hace 2 años», «mi hija nació en 2010», «desde que nació mi hijo hace 8 años», «mi bebé tiene 3 años» → 0. «tuve un bebé hace 1 año» y «hace 18 meses» → ✔ (a propósito, el coach revisa a los 90 días) |
| La guarda NO se traga la edad de la madre | «tuvo un bebé y es de 30 años», «tuvo un bebe y tiene 30 años», «tengo 30 años y tuve un bebé» → ✔ las tres (en la primera pasada con ventana de 4 palabras fallaban) |
| Sin `quiero tener`/`tener` solo | «quiero tener un bebé» → 0 (es un plan, no un parto) |
| Cesárea con errores de escritura | `\bcezarea`, `\bsesarea`, `\bcesaria\b`. 🔴 **Sin el `\b`, «cesaria» cae dentro de «nece-SARIA» y el ejercicio e93 («Sentadilla con Banda de Resistencia», descripción «la fuerza glútea necesaria») se leería como cesárea**: lo cazó el control de los 375, no yo. Con `\b`: «la fuerza necesaria», «es necesaria» → 0 |
| «recién nacido» solo posesivo | «mi recién nacido» → ✔; «soy enfermera de recién nacidos», «trabajo con bebés» → 0 |
| Lactancia | **Sí entra.** Razón clínica abajo |
| «amamant/lactanc/lactand» con raíz propia | «intolerante a la lactosa», «ácido láctico», «lactato alto» → 0 (no empiezan igual) |

### Cifras

- **Positivas: 40 de 40** → `core_central` (34 de parto/nacimiento + 6 de lactancia). Ejemplos: «ya nació el bebé», «tuvo a su bebé», «tuvo el bebé hace 3 semanas», «parto hace 1 mes», «recién parida», «acaba de tener un bebé», «mi hijo nació hace 2 meses», «tengo un bebé de 8 meses», «mi hija tiene 3 meses», «mi bebé de 40 días», «acabo de dar a luz», «fue mamá hace dos meses», «post-parto» (con guion; hoy NO se lee), «puerperio», «tras el parto», «mi recién nacido», «lactancia», «estoy lactando», «amamantando», «le doy pecho a mi bebé».
- **Controles: 33 de 33 en 0** (más los 3 de «edad de la madre» de arriba, que son positivas bien leídas).
- **Regresión: 16 frases que ya se leían** («post parto», «di a luz hace 6 meses», «cesárea hace 10 años», «diástasis abdominal», «suelo pélvico», «embarazada», «gestante», «dulce espera», «bebé en camino», «estoy esperando un bebé», «espero un hijo», «futura mamá», «embarazada … me duele la rodilla», «hernia umbilical», «embarazada, hipertensión», «postparto») → **0 diferencias** de claves.
- **Catálogo: 0 de 375** ejercicios caen con estas regex (ni por nombre ni por nombre+descripción), una vez puesto el `\b` de «cesaria». `GEN_ZONE_EXCL` no se toca: los 65 de `core_central` se quedan en 65 (cifra de mi Q2 de la mañana). El candado tiene que correr con descripción incluida, no solo nombre.

### Lactancia: ¿es una condición para el filtro?
**Decisión: sí, como SEÑAL de postparto, no como restricción propia.** Razón clínica: la lactancia no limita la carga por sí misma (no quita sentadilla, remo ni prensa); pero quien escribe «lactancia» está casi siempre dentro de los 2 años del parto y puede tener diástasis o suelo pélvico sin haberlos nombrado: es la misma población invisible de mi Q1 de esta mañana. Costo del falso positivo: mínimo 8 repeticiones y sin abdominales de flexión, planchas ni saltos durante la revisión de 90 días. Alternativa 🟡 si el PO la prefiere: que «lactancia» sola solo avise al coach sin filtrar. **Fuera de mi competencia** (marcado para Andrés Hyp): la app no ajusta la comida a la lactancia; una mujer lactando con objetivo «Bajar de peso» recibe un déficit. Es el mismo hueco que ya anoté para el embarazo.

### Falsos positivos que ACEPTO (el lado seguro)
1. «El aborto de mi hermana» → `core_central` (no distingue sujeto), igual que «mi pareja está embarazada».
2. «Tuve un bebé hace 1 año» / «hace 18 meses» → ✔: el postparto de 12-24 meses todavía puede tener diástasis.
3. «Mi hijo tiene 8 meses» → ✔ (el de 30 meses ya no).
4. Cualquier mención del bebé sin tiempo («tengo un bebé») → ✔.

### No cubierto a propósito
«Cuarentena» (en Colombia es el postparto, pero choca con la del virus), «dieta» posparto, «mi esposa dio a luz» (hoy `di|dio a luz` ya lo lee de cualquier sujeto), «estoy en el sexto mes» sin la palabra embarazo, jerga regional o errores no listados. **Aparte (hallazgo, no es de esta pregunta):** «voy a tener un bebé», «voy a ser mamá» tampoco se leen como embarazo; mismo remedio con casilla que dije en Q7 (el PO la descartó). Si se quisiera cubrir por texto: `(voy|vamos) a (tener (un|mi) (bebe|hij[oa])|ser (mama|papa|madres|padres))`, con control «quiero tener un bebé» → 0; lo pasaría por Andrés/PO antes de añadirla a `GEN_EMBARAZO_RE`.

---

## P3 · Las negaciones  (CERRADA)

**Veredicto:** NO se intenta leer la negación en general; SÍ se separa un caso que no es negación sino FIN.

1. **«Ya no estoy embarazada», «ya no está embarazada», «mi embarazo terminó», «terminó mi embarazo», «dejé de estar embarazada», «ya no hay embarazo»** no significan «no hay embarazo»: significan que **hubo parto o pérdida**. Leerlos como negación borraría el filtro justo en el postparto; dejarlos como están (hoy) da la lista del embarazo y el texto «tu embarazo» a quien ya parió o perdió. Regla: se quitan esas frases del texto **antes** de buscar `embarazo` (con `replace`, sin lookbehind, como ya hace el parser con `GEN_HERNIA_ABD_RE`) y suman `core_central` + bandera `fin`. Medido: «ya no estoy embarazada» → hoy `embarazo,core_central`; con la regla → `core_central` solo.
2. **El resto de negaciones NO se leen**: «no estoy embarazada», «descarto embarazo», «no sé si estoy embarazada», «tengo retraso, creo que estoy embarazada», «mi pareja está embarazada». Se dejan con `embarazo,core_central` (falso positivo documentado). Razón de seguridad: leer la negación crea el error del lado peligroso (una mujer embarazada que escribe «no estoy segura de estar embarazada» o «aún no estoy embarazada, estoy intentando» quedaría sin filtro; el falso positivo solo cuesta sobrerrestricción y lo ve el coach). El texto de P1 le dice al coach qué hacer en el descarte.

```js
const GEN_EMBARAZO_FIN_RE = new RegExp([
  String.raw`ya no (estoy|esta|ando|andaba) (embarazad[ao]|en embarazo|gestando)`,
  String.raw`(deje|dejo) de estar embarazad[ao]`,
  String.raw`(el |mi |su )embarazo (ya )?(termino|acabo|finalizo|paso|concluyo)`,
  String.raw`(termino|acabo|finalizo) (el |mi |su )embarazo`,
  String.raw`ya no hay embarazo`,
].join('|'));
```

Medido con las 6 frases del tipo FIN → `core_central` solo y bandera `fin`, 6 de 6; las 5 negaciones del tipo «descarte» → `embarazo,core_central`, 5 de 5 (aceptado).

---

## P4 · La pérdida del embarazo  (CERRADA — lo más delicado; lo valida un obstetra y Sofía el tono)

**Lo medido hoy:** «perdí el embarazo» → `embarazo,core_central` (recibe «tu embarazo», el visto bueno de la obstetra y «si notas que el bebé se mueve menos»). «Tuve un aborto espontáneo», «me practicaron un legrado», «perdí el bebé», «muerte fetal», «nació sin vida» → **ninguna clave**. Las dos cosas son daño: la primera es crueldad automática; la segunda, una mujer en recuperación física sin ningún cuidado.

### Qué corresponde clínicamente
- **La clave que corresponde es `core_central` SOLA. No `embarazo`.** Razón: tras una pérdida del segundo o tercer trimestre (parto o cesárea) el cuerpo está en un postparto; tras un legrado o una pérdida temprana hay sangrado y cicatrización uterina; no sé de cuántas semanas fue y la app no debe preguntarlo. El filtro del abdomen y del suelo pélvico es proporcionado a lo que no sé; la lista del embarazo (boca arriba, boca abajo, caídas) no corresponde. Sobrerrestringir un poco durante 90 días tiene un costo pequeño y revisable por el coach; el contrario (quitar el filtro) o hablarle del embarazo, no.
- **Qué le dice la app a la persona:** solo el texto existente de `core_central` («Escribiste algo sobre tu abdomen o tu suelo pélvico…»), que NO nombra la pérdida, más una frase médica neutra (`GEN_RECIENTE_CLIENT`, abajo).
- **Qué le dice al coach:** una frase propia (`GEN_PERDIDA_COACH`, abajo).
- **Lo que NO es mío:** sangrado, restos, indicaciones tras el legrado, duelo, y cuándo reanudar son de su obstetra; el apoyo emocional no lo da la app ni el entreno. Mis rojas están marcadas «de memoria».

### La regla de lectura

```js
const GEN_PERDIDA_RE = new RegExp([
  String.raw`perd(i|io|imos|ieron) (a |al |el )?(mi |su |nuestro )?(embarazo|${GEN_BEBE}|gestacion)`,
  String.raw`perdida (gestacional|del embarazo|de (mi |un |el )?(embarazo|bebe|gestacion))`,
  String.raw`\baborto|\bme aborto|\babortamos|legrado|curetaje|malparto|mortinato`,
  String.raw`muerte (fetal|gestacional|perinatal|intrauterina)`,
  String.raw`embarazo (ectopico|molar|anembrionic\w*|bioquimico|no evolutivo|detenido)`,
  String.raw`(se )?(me|nos) murio (el |mi |nuestro )?${GEN_BEBE}|${GEN_BEBE} (murio|fallecio|sin vida)|nacio (muert[oa]|sin vida)`,
].join('|'));
const GEN_EMBARAZO_ACTUAL_RE = /(estoy|ando|estamos|quede|volvi a quedar|volvi a estar|de nuevo|otra vez) (de nuevo |otra vez )?(en )?embarazad|embarazad[ao] (de nuevo|otra vez)|\d+ (semanas|meses) de (embarazo|gestacion)/;
```

En `parseLimitations` (en memoria, sin lookbehind):
1. `nEmb = n` **sin** las frases `GEN_PERDIDA_RE` y `GEN_EMBARAZO_FIN_RE` (`replace` con bandera `g`);
2. `embarazo` solo si `GEN_EMBARAZO_RE.test(nEmb)`, y si hay pérdida **y** no hay una frase de embarazo ACTUAL (`GEN_EMBARAZO_ACTUAL_RE`), se suprime del todo («estuve embarazada, perdí el bebé en marzo» → solo `core_central`; si dice «estoy embarazada de nuevo» o «otra vez embarazada», conserva `embarazo`);
3. `core_central` por cualquiera de: la entrada de hoy, `GEN_POSTPARTO_RE`, `GEN_PERDIDA_RE`, `GEN_EMBARAZO_FIN_RE` o `embarazo`;
4. banderas nuevas `postparto`, `perdida`, `fin` (booleanas, como `cardiac`): no cambian `detected`, `keys`, `zones` ni `hasExclusions`.

Para la bandera `postparto` basta `GEN_POSTPARTO_RE` **o** el subconjunto de la entrada vieja: `post ?parto|pos ?parto|despues (de|del) (mi |el )?parto|(tuve|tras) (un |mi )?parto|parto (natural|vaginal|por cesarea)|(^| )(di|dio|dieron|dar) a luz( |$)|cesarea` (no «diástasis», «hernia», «cirugía»: esas no son recientes).

### Medido (código de hoy → reglas nuevas)

| Nota | Hoy | Nuevo |
|---|---|---|
| perdí el embarazo | `embarazo,core_central` | `core_central` (perdida) |
| perdí el bebé / perdi al bebé / perdimos a nuestro bebé | *(ninguna)* | `core_central` (perdida) |
| tuve un aborto espontáneo / aborto | *(ninguna)* | `core_central` (perdida) |
| me practicaron un legrado | *(ninguna)* | `core_central` (perdida) |
| embarazo ectópico | `embarazo,core_central` | `core_central` (perdida) |
| pérdida gestacional / muerte fetal / nació sin vida / mi bebé murió | *(ninguna o embarazo)* | `core_central` (perdida) |
| estuve embarazada, perdí el bebé en marzo | `embarazo,core_central` | `core_central` (perdida) |
| estoy embarazada de nuevo, perdí el anterior | `embarazo,core_central` | `core_central,embarazo` (se conserva) |
| **Controles (0 claves, igual que hoy):** aborté el plan de dieta · perdí peso · perdí el equilibrio · pérdida de peso · lo perdí · perdí a mi hijo | | |

Cifras: 15 positivas de pérdida → 15 de 15; 6 controles → 0 falsos positivos. «Perdí a mi hijo» queda fuera a propósito (es un duelo, no una pérdida gestacional; la app no debe asumirlo). «Lo perdí» solo no se lee. Falsos positivos que acepto: «el aborto de mi hermana», «aborto» en otro sentido.

### Texto al coach (`GEN_PERDIDA_COACH`; se añade cuando `lim.perdida`; reemplaza al de `core_central` genérico)

> Anotó una pérdida del embarazo. La app aplicó el filtro del abdomen y del suelo pélvico, como en el postparto, y NO el del embarazo; a ella solo le habla de «tu abdomen o tu suelo pélvico». No sabe de cuántas semanas fue ni si hubo legrado, cirugía o parto: pregúntalo solo si ella quiere contarlo, y pídele el visto bueno de su médico antes de entrenar. Si hay sangrado abundante, fiebre o dolor fuerte, que consulte. No uses frases como «ya vendrá otro» o «sigue adelante», ni hables de peso o del cuerpo; escúchala y sigue su ritmo. Si la ves muy afectada, sugiérele apoyo profesional: eso no lo resuelve la app ni el entreno. Es un dato sensible: no lo comentes con terceros.

**De memoria / para un obstetra:** el orden «sangrado abundante, fiebre, dolor fuerte → que consulte» es el criterio general de infección o restos; el obstetra decide la lista exacta y si falta algo. «Dato sensible» es por Ley 1581 (salud reproductiva): lo confirma el abogado.

### Texto a la persona (`GEN_RECIENTE_CLIENT`; se añade al final cuando `lim.postparto || lim.perdida || lim.fin`)

> Si todavía no lo has hecho, confirma con tu médico que ya puedes entrenar. Detente y consulta a tu médico si el sangrado aumenta o vuelve a ser rojo vivo, si tienes fiebre, dolor fuerte en el vientre, dolor o hinchazón en una pantorrilla, dolor de cabeza fuerte, dolor en el pecho o falta de aire; si es fuerte, ve a urgencias.

Medido contra la lista de palabras prohibidas (bebé, embarazo, parto, aborto, pérdida, cesárea, seguro, sin problema, no te preocupes, semanas/meses/días, hijo, mamá, diagnóstico): **0 apariciones**. No nombra el motivo, sirve igual para parto, cesárea, legrado o pérdida tardía. **De memoria** (ACOG sobre postparto: sangrado que aumenta, dolor o hinchazón de pantorrilla por trombosis, dolor de cabeza fuerte por preeclampsia posparto, dolor en el pecho o falta de aire por embolia): **la validación es de un obstetra**.

### Texto al coach para el postparto (`GEN_POSTPARTO_COACH`; se añade cuando `lim.postparto`)

> Postparto: pregúntale hace cuánto nació, si fue vaginal o cesárea y si ya tuvo la revisión de su médico o fisio; con cesárea, la cicatriz y el abdomen pesan más. Si está lactando, eso no es motivo para quitar el entreno, pero la app NO ajusta la comida a la lactancia: consúltalo con nutrición.

### Frases PROHIBIDAS para esa persona (en cualquier superficie que ella lea: nota, Perfil, push, hilo)
1. Nombrar lo ocurrido: «aborto», «pérdida», «perdiste», «tu bebé», «tu embarazo», «parto» (ella no lo escribió así en su pantalla).
2. Cualquier texto del embarazo: «si notas que el bebé se mueve menos», «visto bueno de tu obstetra», «no es un plan de embarazo».
3. Consuelo automático o frase hecha («lo sentimos mucho», «todo pasa por algo», «ya vendrá otro»): lo humano lo dice el coach, no una plantilla.
4. Plazos o promesas de recuperación («en X semanas podrás volver», «cuando estés lista»), metas de cuerpo o peso («recupera tu figura», «vuelve a tu peso»), «ánimo», «fuerza», «levántate».
5. Preguntas: «¿de cuántas semanas?», «¿qué pasó?», «¿quieres intentarlo de nuevo?».
6. «No te preocupes», «es normal», «seguro», «sin problema».
7. Un push o una notificación que muestre la condición con palabras (el aviso al coach hoy solo dice «abdomen y piso pélvico»: bien; mantenerlo).
8. Una fila en el Perfil que diga «tu embarazo» (ver P5).
9. 🟡 `limitationCoachAlert` copia la nota en el hilo («Escribió: «…»», hasta 200 caracteres): con `lim.perdida` conviene omitir esa cita (el coach ya lee la nota y la condición en la ficha) para que el hilo no guarde la frase textual.

---

## P5 · La vigencia del embarazo (v728)  (CERRADA)

Medido con `limitReview` real (nota «estoy embarazada», fecha de revisión en el día 0):

| Día | ¿Avisa? |
|---|---|
| 0 / 89 | no |
| 90, 91, 179, 180, 181, 269, 270, 271, 400 | sí (plazo 90) |

Con respuesta «Sigue igual» en el día 91, la persona NO vuelve a ver la fila hasta el día 181 (una vez por plazo, correcto).

**1 · ¿Sirve el aviso de la persona?** No tal como está. Hoy: *«Hace unos meses escribiste algo sobre tu embarazo. ¿Sigue igual? Si cambió, cuéntale a tu coach…»*. Para quien parió es torpe; para quien perdió el embarazo es una herida abierta en su Perfil. Texto propuesto cuando `conds` incluya `embarazo` (neutro, sirve para las tres situaciones y no necesita saber cuál fue):

> Hace unos meses nos contaste algo sobre cómo estabas. ¿Sigue igual? Si algo cambió, cuéntale a tu coach para que revise tu nota y tu plan.

(«Hace unos meses» alude a cuándo escribió la nota, no promete plazo de recuperación; es la misma fórmula ya aprobada.) Los botones «Sigue igual» / «Cambió» se quedan.

Mensaje al hilo `limitReviewChangedMsg` cuando `conds` incluya `embarazo`:

> 🔄 {nombre} avisó desde la app que cambió algo de lo que anotó sobre su salud. El filtro sigue puesto hasta que actualices su nota: pregúntale cómo está y si ya tiene el visto bueno de su médico.

(No nombra «embarazo» ni «obstetra».) El push al coach ya dice solo «su condición cambió».

**2 · ¿Son 90 días el plazo correcto?** Sí, para el embarazo: es un trimestre, y la nota que escribe la persona no trae la semana de gestación, así que no se puede afinar más. Con el embarazo normal (≈ 40 semanas, de memoria) avisa en los días 90, 180 y 270. El único defecto es de texto, no de plazo (P1). **🟡 Opcional:** pasados 300 días sin renovación (más de lo que dura un embarazo), cambiar el texto del coach a «Un embarazo no dura tanto: lo más probable es que ya terminó; actualiza la nota» (`r.revisado` ya está en `limitReview`; hoy el texto dice «más de 90 días» incluso a los 400).

**3 · Embarazada → postparto: ¿se renueva sola la fecha y se revisa a los 90 días?** Medido con `limitReviewStamp`:

| La nota pasa de «estoy embarazada» a… | Código de hoy | Con las reglas nuevas |
|---|---|---|
| «postparto» / «postparto, cesárea» | fecha NUEVA | fecha NUEVA |
| «ya nació el bebé» | **`null`** (sin condición: se apaga todo y no queda fecha) | fecha NUEVA |
| «perdí el embarazo» | **fecha VIEJA** (mismas condiciones: no se renueva) | fecha NUEVA |
| «ya no estoy embarazada» | **fecha VIEJA** | fecha NUEVA |
| «embarazada de 30 semanas» | fecha vieja | fecha vieja (guardar no es revisar: correcto) |

**Veredicto:** sí, bien, **pero solo después de P2/P3/P4**: hoy dos de los cinco cambios reales de la nota no renuevan la fecha (los dos peores) y uno la borra. El postparto se revisa a los 90 días: lo encuentro adecuado (≈ 13 semanas; ACOG, de memoria, ubica la visita posparto completa antes de las 12 semanas); esa revisión NO levanta nada, solo pregunta, y se renueva con «Sigue vigente» mientras el coach la necesite. Ninguna otra cosa cambia.

---

## Qué NO miré y por qué

- **Qué dicen exactamente ACOG, SOGC o la OMS sobre el postparto y la pérdida gestacional:** no los abrí (sin red en este encargo); todo lo citado es de memoria y va marcado. **Un obstetra tiene que leer** `GEN_RECIENTE_CLIENT` y `GEN_PERDIDA_COACH` antes de publicarlos. Mi competencia es la musculoesquelética y la salud pélvica del movimiento.
- **El tono de las frases de P4 y P5:** el criterio clínico y las frases prohibidas son míos; el tono final lo revisa Sofía.
- **Cómo muestra la ficha del coach `GEN_COND_COACH`:** si la nota del día (`note` del generador con `audience:'coach'`) llega al asesorado o solo al coach. Los textos de coach de esta entrega asumen que NO llegan a ella; **verifica** `app-3-coach.js` (marca, vista previa) y el flujo donde la nota de la rutina se asigna.
- **Si la persona ve el hilo del chat** donde cae `limitReviewChangedMsg` y la alerta de registro (`from:'client'`): el plan libre dice no tener chat; una persona que luego pasa a coach sí lo vería.
- **Nutrición del postparto, la lactancia y la pérdida** (déficit calórico, proteína, agua): es de Andrés Hyp; la app no lo lee. Mismo hueco que en el embarazo.
- **Ley 1581 y salud reproductiva como dato sensible:** lo confirma el abogado; yo solo recomiendo no copiar la nota textual al hilo.
- **`QUICK_WORKOUTS`, calentamiento y selector de sustitución con las claves nuevas:** son las mismas claves (`core_central`), ya cubiertas en mis dictámenes anteriores; no los volví a barrer. Quien programe esto debe correr la matriz recetas × zonas (candado 12 de `laura.md`).
- **Frases fuera de las medidas:** jerga regional, errores no listados, notas largas con varias ideas. La regex no es la respuesta final a esa variedad.
- **No corrí matrices de sabotaje, no toqué Supabase ni navegador, no edité ningún archivo del repo.**

## Candados que exijo en la suite (antes de programar; no es opcional)

1. **Sin lookbehind:** el check estático de `avi-core.js` (sobre `sinComentarios`) sigue vigente y además se afirma sobre `.source` de `GEN_POSTPARTO_RE`, `GEN_PERDIDA_RE`, `GEN_EMBARAZO_FIN_RE` y `GEN_EMBARAZO_ACTUAL_RE` (las regex armadas con `new RegExp` no las ve un `grep` del archivo).
2. **Palabras de parto (P2):** las 40 positivas afirman `core_central` y las 33 de control NO afirman la bandera `postparto` ni la clave. Controles que no pueden faltar: «nací en 1990», «mi bebé tiene 3 años», «tuvo un bebé hace 5 años», «tuve un bebé hace 2 años», «el parto de ideas», «parto de cero», «parte», «repartir», «reparto domicilios», «me apartó», «quiero tener un bebé», «soy enfermera de recién nacidos», «lactosa», «ácido láctico», «tuve un hijo», «mi hijo tiene 12 años», «la fuerza necesaria». **Cada control demuestra su par positivo** (por ejemplo «tuve un bebé hace 5 meses» ✔ junto a «hace 5 años» 0).
3. **Edad de la madre:** «tuvo un bebé y es de 30 años» y «tengo 30 años y tuve un bebé» deben seguir en ✔ (la guarda de «hace años» no se traga la edad de la madre).
4. **Los 375:** ni el nombre ni la descripción de ningún ejercicio activa `GEN_POSTPARTO_RE`, `GEN_PERDIDA_RE` ni `GEN_EMBARAZO_FIN_RE` (hoy 0 de 375; sin el `\b` de «cesaria», e93 cae). Los 65 de `core_central` por `GEN_ZONE_EXCL` no cambian.
5. **Nada se pierde (P1):** para cada nota que el texto de P1 manda escribir («postparto», «postparto, cesárea», «pérdida del embarazo», «ya no está embarazada») `keys` contiene `core_central`. Y `GEN_COND_COACH.embarazo` contiene «NO borres» y no contiene «quita la frase».
6. **Fin del embarazo (P3):** «ya no estoy embarazada», «mi embarazo terminó» → `core_central` y NO `embarazo`; «no estoy embarazada», «no sé si estoy embarazada», «descarto embarazo» → SIGUEN dando `embarazo,core_central` (documentado: se prefiere el falso positivo al falso negativo).
7. **Pérdida (P4):** las 15 positivas → `core_central` sin `embarazo`, bandera `perdida`; los 6 controles → 0; «estoy embarazada de nuevo, perdí el anterior» conserva `embarazo`. El texto al cliente con `lim.perdida` o `lim.postparto` **no contiene** «bebé», «embarazo», «parto», «aborto», «pérdida», «perdiste», «cesárea», «seguro», «sin problema», «no te preocupes», «te acompañamos», «lo sentimos» y SÍ contiene «confirma con tu médico». Tampoco contiene el texto del embarazo («se mueve menos», «obstetra»).
8. **Vigencia (P5):** con `estoy embarazada` los avisos salen en 90, 180 y 270 días y no antes; `limitReviewAskText` con `embarazo` NO contiene «embarazo»; `limitReviewChangedMsg` con `embarazo` NO contiene «embarazo» ni «obstetra»; `limitReviewCoachText` con `embarazo` contiene «postparto», «pérdida del embarazo» y «No la borres».
9. **Renovación de fecha:** `limitReviewStamp` da fecha NUEVA al pasar de «estoy embarazada» a cada una de: «postparto», «ya nació el bebé», «perdí el embarazo», «ya no estoy embarazada»; y fecha VIEJA a «embarazada de 30 semanas». (Hoy dos de ellas fallan.)
10. **Sin regresión:** las 16 frases de regresión de P2 dan las mismas claves que hoy, y la suite de Q1 de `laura.md` y de E1 de `laura-embarazo.md` sigue verde sin cambios.
11. **Rótulo del botón:** con `embarazo` el botón dice «Terminó o cambió», no «Ya no aplica».
12. **Mi candado de siempre:** si alguien toca `GEN_LIMIT_KWS`, `GEN_ZONE_EXCL` o los textos de condición después de esto, vuelve a barrerse la matriz completa (mi candado 12 del dictamen de la mañana).

*Veredicto de Laura, 5-nov-2026, noche. Vinculante en seguridad. Pendientes: validación de obstetra (textos de P4), tono de Sofía (P4, P5), decisión del PO sobre lactancia solo-aviso, y de Andrés Hyp sobre nutrición en postparto, lactancia y pérdida.*
