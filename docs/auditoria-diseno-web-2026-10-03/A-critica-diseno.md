# R19 · Revisor A — Crítica de diseño de la web de venta (3-oct-2026)

Método: Assessment A de impeccable (revisión de director de diseño), modo **Persuade**, más la lente de `redesign-existing-projects`. Juicio **independiente**: no corrí ningún detector ni leí su salida.
Evidencia: las 12 series de capturas de `%TEMP%\avi-web-r19\`, el código de `avi-web`, y una sonda propia en Chrome headless contra `localhost:3456` (puerto 9561; no se tocó `avientrena.com`). Lo que mido está dicho con su unidad; lo que no pude medir está marcado.
Alcance: el oficio visual. Accesibilidad, textos contra la app y el recorrido ya los cerró R18 y no se repiten. Las fichas de resultados se citan por su cifra, no por el nombre de la persona (el repo es público).

---

## 1. Veredicto de especificidad de diseño

**Mitad y mitad: la voz y los datos son de AVI; la piel es de plantilla editorial premium.**

Prueba del cambio de nombre: si cambias «AVI» por cualquier estudio boutique y «Andrés» por otro entrenador, **nada visual avisa del cambio**. Verde bosque + crema + dorado + Fraunces en cursiva + etiquetas en mono con mucho espaciado es hoy la receta más repetida del «gimnasio / bienestar de lujo». Lo que sí es de AVI no es la piel, es el contenido:

- Las **fichas de resultados** (el kilo ganado en grande y el «40 → 95 kg» en mono como libro de cuentas). Ninguna web de gimnasio tiene eso.
- La frase **«Estás pagando por una PERSONA / por la APP»** dentro de cada plan.
- El bloque de **pago con llave Bre-B**, que es Colombia real y no una pasarela de plantilla.
- La voz en primera persona del coach.

### Lo que delata la plantilla (contado, no a ojo)

| Tic | Cuántas veces | Dónde |
|---|---|---|
| Titular de dos líneas: blanca en negrita + **segunda línea en cursiva dorada** | **6 de 6 héroes** (+ el cierre del inicio, «Sigue.» y el título del FAQ = 9) | `app/page.tsx:55-56`, `la-app/page.tsx:48`, `precios/page.tsx:343`, `coaching/page.tsx:54`, `resultados/page.tsx:41`, `ayuda/page.tsx:56` |
| Etiqueta (eyebrow) mono en mayúsculas sobre cada título | **40 usos** | `.eyebrow` en `globals.css:122`; 8 de ellos encima de un H2 que ya se explica solo («Por dentro», «Qué hace», «Lado a lado», «Después», «Qué incluye», «Contacto», «Cómo leer cada ficha», «Antes de que preguntes») |
| Numeración 01 / 02 / 03 | **5 sitios, 3 tratamientos** (contorno gigante, contorno chico, ocre sólido) | solo **2** llevan una secuencia real (pasos de coaching `coaching/page.tsx:81`, pasos de pago `PagoBreB.tsx:80`); **3 son decoración** (planes `precios/page.tsx:253`, pies de la galería `AppGallery.tsx:149`, valores del coach `coaching/page.tsx:251`) |
| Tarjetas / columnas del mismo tamaño en fila de 3 (o 4) | **6 filas** | `coaching/page.tsx:105,128,242`, `la-app/page.tsx:163`, `precios/page.tsx:359`, `Resultados.tsx:91` |
| Filete dorado de 2 px a la izquierda en listas y citas | **4 sitios** | `coaching/page.tsx:131`, `la-app/page.tsx:170`, `resultados/page.tsx:62`, `precios/page.tsx:294` |
| Héroe de página interior: foto oscura duotono + velo de verde al 70 % + titular encima | **5 de 5** páginas interiores (`PageHero.tsx:22-36`), solo cambia la cara | |
| Grano feTurbulence en secciones oscuras | **9 componentes** (`.grain`, `globals.css:104`) | a 7 % casi no se ve; en la guía de la casa de impeccable es marca de aficionado |

### Coherencia entre las 6 secciones

- **Alta en lo que se ve:** misma cabecera, mismo pie, mismos tokens, mismo ritmo claro/oscuro, mismos botones. Se siente un solo sitio. Eso es un acierto.
- **Demasiado alta en la estructura:** cinco páginas empiezan con el mismo molde y siguen con «etiqueta + título + entrada + rejilla». No hay una página que tenga su propio trabajo visual (Resultados no se ve como un archivo de pruebas, Coaching no se ve como una conversación, Planes no se ve como un precio).
- **Fugas medidas** (escritorio 1440, con barra de scroll de 15 px):
  - **Cinco bordes izquierdos distintos:** héroe del inicio x=121 · logo del encabezado x=157 · contenido x=185 · «Cómo leer cada ficha» y «Presencial» x=249 · orientador y FAQ x=361. Causa: `max-w-7xl` en el héroe (`page.tsx:36`), `px-5` en el encabezado (`Header.tsx:45`) contra `px-12` en el contenido, y contenedores de `max-w-5xl`/`max-w-4xl`/`max-w-3xl` sueltos (`resultados/page.tsx:48`, `precios/page.tsx:373`, `Orientador.tsx:142`, `FAQ.tsx:324`). El logo queda **28 px a la izquierda** de todo lo que le sigue.
  - **Cinco finales distintos** (foto a sangre en el inicio, caja verde en La app, franja crema con 2 botones en Planes y Coaching, 3 botones en Resultados, tarjetas de contacto en Ayuda).
  - **Nombres del mismo plan:** «Coaching» (menú) · «AVI COACH VIRTUAL» (tarjeta) · «Virtual» (tabla) · «Presencial» / «AVI PRESENCIAL · 2 clases/semana». Quien compara tabla y tarjetas tiene que traducir.
  - **Dos verdes de marca:** el logo y la app usan el verde menta (`#10E0A0`) sobre negro; la web habla verde bosque + dorado. Se tocan solo en las capturas del celular, y ahí el menta aparece como invitado.

### Oportunidades perdidas de carácter (lo que solo AVI podría poner)

1. **«Con nombre propio» no se ve en ninguna parte.** Es la promesa, y la mejor prueba ya existe en tus capturas: la app que dice «Buenas tardes, Mariana» (`/shots/2026-09/app-saludo.png`). Hoy está en la tercera pantalla del inicio, a 216 px de ancho.
2. **Guaduas.** El pueblo se llama por la guadua. El hueco de «Est. 2026 — Guaduas, Colombia» es solo texto; nada visual viene del lugar. Un nudo de guadua como filete divisor o como marcador de progreso sería de AVI y de nadie más (y reemplaza a los filetes grises y a los numerales de adorno).
3. **«Empezar es una conversación, no un formulario»** (Coaching) se cuenta con una lista numerada 01-02-03 sobre un bloque verde, que es justo lo que parece un formulario. Un intercambio de WhatsApp dibujado (3 burbujas, marcado «ejemplo de cómo empieza») lo demostraría en vez de decirlo.
4. **El libro de cuentas** (la tipografía «40 → 95 kg» en mono con flecha dorada) es el único dispositivo gráfico propio y vive solo dentro de las fichas. Podría ser la firma de la web: la tabla de planes como escalera «Gratis → PRO → Coach → Presencial» con lo que suma cada paso.
5. **Cuando lleguen las fotos reales** del coach, el molde de héroe actual (foto detrás del titular, a 70 % de verde) las va a apagar. Hay que diseñar el héroe con la cara en un lado, sin velo, y el titular en el otro.

---

## 2. Heurísticas de Nielsen (0-4)

Modo Persuade: la **7 (flexibilidad y eficiencia)** va `n/a` (no hay tarea repetida ni atajos que importen en una página de venta). La **10 sí se puntúa** porque el sitio tiene una sección de Ayuda real. Máximo aplicable: **36**.

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | **3** | La galería del inicio muestra flechas ‹ › en escritorio que **no hacen nada**: las 3 capturas caben enteras (`scrollWidth` 1056 = `clientWidth` 1056) pero los botones siguen ahí (`AppGallery.tsx:101-116`). El resto (menú activo, «Pregunta 1 de 3», «¡Copiado!») está bien. |
| 2 | Lenguaje del usuario | **3** | La voz es de 4 (pantallazo, llave Bre-B, «Estás pagando por una PERSONA»). Baja por la nomenclatura de planes (4 nombres para 2 cosas) y por «RECOMPOSICIÓN» como etiqueta sin explicar en las fichas del inicio (solo se explica en /resultados). |
| 3 | Control y libertad | **3** | Visor con Esc, ✕, flechas y devolución del foco; orientador con «← Volver» y «Volver a empezar». Falla en detalle: el primer card de resultados queda pegado al borde de la pantalla (ver problema 5) y nada permite pausar el video (ya abierto). |
| 4 | Consistencia y estándares | **3** | Sistema visual muy sólido, con las fugas medidas arriba (5 bordes, 5 finales, 4 nombres de plan, 3 estilos de numeral). |
| 5 | Prevención de errores | **3** | El orientador no pide datos y el mensaje de WhatsApp sale armado. La tabla de planes en celular esconde la columna «Presencial» (se ven **348 px de 500**): el visitante puede creer que no existe. |
| 6 | Reconocer en vez de recordar | **3** | En celular, de todo el menú solo se ve «Entrar a la app» y la hamburguesa; para ir a Planes hay que abrir el menú. Los títulos de sección ayudan. |
| 7 | Flexibilidad y eficiencia | **n/a** | Superficie Persuade. |
| 8 | Estética y minimalismo | **3** | Mucho aire y una paleta contenida; pero capas de adorno repetido (grano, brillo, halo desenfocado, texto vertical, numerales de contorno, 40 etiquetas). El adorno compite con la prueba. |
| 9 | Recuperación de errores | **2** | (a) El 404 es el de Next por defecto, en inglés: «404: This page could not be found.» (no existe `app/not-found.tsx`; comprobado con `curl` a una ruta inventada). (b) «Tocar para copiar» la llave Bre-B: si `navigator.clipboard` falla, el `catch` se traga el error y no pasa nada visible (`PagoBreB.tsx:36-43`); es el momento de mayor riesgo del sitio. No lo probé en el navegador interno de Instagram: es un riesgo de código, no una falla medida. |
| 10 | Ayuda y documentación | **3** | Ayuda tiene 20 preguntas y hay salidas al final de Planes; pero las 20 van en una lista plana sin agrupar (empezar / pagar / datos / cuenta) y la pregunta «¿cuál plan es para mí?» aparece **al final** de Planes (ver Jordan). |
| | **Total** | **26 / 36** | **Bueno (72 %)**: base sólida, trabajo de composición y de carácter pendiente. |

---

## 3. Carga cognitiva

### Checklist de 8

| Punto | Resultado |
|---|---|
| Un solo foco | ✅ El inicio tiene un botón dominante (dorado) y los demás bajan de nivel. Coaching y Ayuda también. |
| Fragmentación (≤ 4 por grupo) | ❌ La tarjeta PRO lista 6 funciones, la de Coach 5; /la-app lista 10 funciones en una sola columna; el FAQ son 20 preguntas planas. |
| Agrupación | ✅ Bordes, fondos y secciones agrupan bien. |
| Jerarquía visual | ✅ Clara en todas las páginas; en Planes la tarjeta oscura decide sola. |
| Una cosa a la vez | ❌ Planes pide decidir entre 5 planes, leer una tabla de 4 columnas que repite las tarjetas y además ver el bloque de pago, todo en una página de **9,9 pantallas de celular** (8.324 px). |
| Pocas opciones (≤ 4 visibles) | ❌ Ver el conteo abajo. |
| Memoria de trabajo | ✅ con reserva: la primera columna de la tabla se queda fija al deslizar, pero hay que traducir «Virtual» ↔ «AVI COACH VIRTUAL» ↔ «Coaching». |
| Revelación progresiva | ✅ Orientador paso a paso, FAQ plegado, visor de capturas. |

**3 fallos = carga moderada (atender pronto).** No es crítica.

### Puntos de decisión con más de 4 opciones a la vez (contados)

| Dónde | Opciones visibles |
|---|---|
| **Planes (celular y escritorio)** | **5 planes**, cada uno con su botón (FREE, PRO, Virtual, Presencial 2, Presencial 4) + una tabla de 4 columnas |
| **Inicio, primera pantalla del celular (390×844)** | **6 acciones tocables:** «Entrar a la app», menú, «Probar la app gratis», «Conocer el coaching», «AVI PRO desde $30.000», «¿No sabes por dónde empezar?» (medido con la sonda) |
| Menú de escritorio | 6 enlaces + «Entrar a la app» = 7 |
| Menú de celular abierto | 6 enlaces + 2 botones = 8 |
| FAQ (/ayuda) | 20 preguntas |
| Pie | 12 enlaces |

El orientador cumple: máximo 4 opciones por pregunta.

---

## 4. Recorrido emocional (Instagram → Inicio → Planes → WhatsApp)

1. **Llegada:** seria, oscura, segura de sí. **Fría.** En la primera pantalla del celular hay solo texto y botones sobre verde: ni una cara, ni un pedazo de la app. Es un valle de calidez justo cuando se decide si seguir leyendo.
2. **Muestra de la app (3 teléfonos):** curiosidad, pero se lee poco (ver problema 5).
3. **Orientador:** **primer pico real.** Es lo más activo y lo menos arriesgado de la web (tocar una opción, sin dar datos).
4. **Resultados (+55 kg en dorado grande):** **pico de credibilidad.** Es lo más persuasivo del sitio.
5. **El coach sonriendo:** pico de calidez, pero llega en la quinta sección del inicio; en /coaching llega al **70 % de la página** (~3.800 px de 5.429 en escritorio).
6. **Planes:** valle de densidad (9,9 pantallas, 5 planes, tabla, pago). Lo salva el tono: «Sin permanencia ni letra chica» y «Estás pagando por una PERSONA» dan tranquilidad justo donde se decide.
7. **Pago Bre-B:** claro y tranquilizador («llega al instante y sin comisiones», 3 pasos). El único hueco es el botón de copiar (heurística 9).
8. **Cierre:** el inicio termina fuerte (foto + «Tu próxima rutina lleva tu nombre»). Coaching, Planes y Resultados terminan en una franja crema plana: **el final del recorrido de compra es más débil que el final del recorrido de curiosidad.**

**Pico-final:** el pico (resultados) está bien elegido; el final del flujo de pago no tiene ningún momento memorable ni una frase que diga qué pasa después de tocar «Quiero el coaching virtual» (se abre WhatsApp; no se cobra nada todavía).

---

## 5. Lo que funciona (y por qué)

1. **Las fichas de resultados** (`Resultados.tsx:121-183`). El número grande hace de ancla emocional y el libro de cuentas en mono («40 → 95 kg», alineado con `tabular-nums`) hace de prueba; el chip del objetivo y la línea «Datos tomados de la app… con su permiso» evitan que se lea como un testimonio inventado. Es lo único del sitio que no se podría copiar de otra web. Ojo: el «+55 kg grande + etiqueta + datos de apoyo» es en sí el patrón de métrica-héroe de las plantillas; lo que lo salva es el libro de cuentas y la honestidad de abajo. Si se quita eso, pierde el carácter.
2. **La estructura de las tarjetas de planes** (`precios/page.tsx:229-300`). «Para quién es» + **«qué estás pagando»** + lista + botón, con una única tarjeta oscura y una insignia dorada. En un vistazo se ve cuál se recomienda y por qué cuesta lo que cuesta. Resuelve la confusión PRO-vs-Coach con diseño, no con más texto.
3. **Contención y disciplina tipográfica.** Tres fuentes con tres trabajos (Fraunces para voz, Plus Jakarta para leer, JetBrains Mono para datos), una sola paleta, mucho aire y bandas claras/oscuras que marcan el ritmo. Las páginas se leen sin esfuerzo y nada grita. El **orientador** (`Orientador.tsx`) es la mejor interacción: táctil, sin datos personales, con progreso visible y salida clara.

---

## 6. Problemas prioritarios

### 1. [P1] El primer pantallazo del Inicio no enseña ni a una persona ni la app

**Qué:** en celular, la primera pantalla (0 → 835 px) es texto + 2 botones + 2 enlaces sobre verde liso; lo que hay de foto aparece **debajo del pliegue**, como una franja de 220 px con el torso del póster (`HeroMedia` en `page.tsx:107`). En escritorio, la imagen de la derecha es el póster/video del héroe: **un torso con shorts, sin cara**, casi del mismo verde oscuro del fondo; se le ve un **borde duro** donde empieza (x≈752) y una **franja verde vacía de ~80 px** a la derecha (x 1360 → 1440). Encima, un texto vertical que repite el titular (`page.tsx:109`).

**Por qué importa:** quien llega de Instagram viene de un feed visual y decide en segundos. Ve una frase abstracta («Entrenamiento con nombre propio») y no ve ni a quien entrena, ni a quien te acompaña, ni la app. El producto aparece recién a ~1.360 px (1,6 pantallas). Le cuesta confianza y curiosidad a quien llega en frío; los más afectados son quienes nunca han entrenado y necesitan ver para creer. *(No vi el video completo; el póster es su primer cuadro y es un torso sin cara.)*

**Arreglo (sin romper la marca):**
- **Celular:** subir a la primera pantalla la captura que ya tienes, `app-saludo.png` («Buenas tardes, Mariana · Glúteo y pierna · Empezar mi entreno»), en el `PhoneFrame` actual a ~15 rem, asomando desde el borde inferior del héroe, **debajo de los botones** y recortada a la mitad de su alto. Es literalmente «con nombre propio» demostrado. Quitar la franja del torso.
- **Escritorio:** el mismo teléfono, a la derecha, solapando el borde del fondo. El fondo (póster o video) pasa a **sangrar de verdad**: sacar `max-w-7xl` del contenedor de la imagen y cambiar el `bg-forest` opaco de `HeroMedia.tsx:47` por transparente para que no haya borde. Quitar el texto vertical.
- **Cuando lleguen las fotos reales:** la cara a un lado, sin velo, y el titular al otro (ver oportunidad 5).

**Comando:** `$impeccable layout` (composición del héroe) y luego `$impeccable delight` (el saludo por nombre como momento).
**Evidencia:** `inicio-cel-0-pantalla.jpg`, `inicio-cel-1.jpg` (franja del torso bajo el pliegue), `inicio-esc-0-pantalla.jpg` (torso sin cara, borde x≈752, franja derecha), `public/brand/hero-poster.jpg`; `page.tsx:36,107-111`, `HeroMedia.tsx:47`.

---

### 2. [P2] La piel es de plantilla: cuarenta etiquetas, numeración de adorno y el mismo titular seis veces

**Qué:** ver la tabla del punto 1 del veredicto: 6 titulares con cursiva dorada en la segunda línea, 40 etiquetas mono, 3 de 5 numeraciones sin secuencia, 6 filas de tarjetas iguales, 4 filetes laterales dorados de 2 px, 5 héroes idénticos.

**Por qué importa:** quien compara con otros dos coaches de Instagram ve lo mismo en los tres y se queda con el precio. La originalidad de AVI (la voz, los kilos, la llave Bre-B) queda tapada por una piel que cualquiera tiene. Es la mayor oportunidad de todo el sitio.

**Arreglo (refinar, no rediseñar):**
- **Quitar lo repetido:** la etiqueta mono solo en los 6 héroes (se queda tal cual) y fuera de las secciones donde el H2 ya dice todo (los 8 de la tabla). Numerales solo donde hay secuencia (pasos de coaching y de pago); borrarlos de los planes (`precios/page.tsx:253-259`), de los pies de la galería (`AppGallery.tsx:149-151`) y de los valores del coach (`coaching/page.tsx:251`). Los 4 filetes laterales de 2 px pasan a un filete superior de 1 px o a nada.
- **La cursiva dorada se queda solo en el titular del inicio** (es la marca). En las otras cinco, el dorado va en la palabra que carga el mensaje (el precio, «alguien», la cifra) y la segunda línea se queda en blanco.
- **Poner una cosa que solo es de AVI en cada página:** inicio = la app que saluda por nombre (problema 1); Coaching = el intercambio de WhatsApp dibujado en lugar de 01-02-03 (texto que escribes tú, marcado «ejemplo de cómo empieza»); Resultados = el libro de cuentas como cabecera; Planes = la escalera «cada plan suma al anterior»; un **nudo de guadua** como filete divisor de todo el sitio.
- Dejar de depender del grano `feTurbulence`: a 7 % aporta poco.

**Comando:** `$impeccable distill` (quitar) y después `$impeccable delight` (poner lo propio); por último `$impeccable polish`.
**Evidencia:** capturas `inicio-esc-0..3`, `precios-esc-1/2`, `coaching-esc-1..3` (los tres tipos de numeral, los filetes y las filas de 3); conteos del veredicto con sus archivo:línea.

---

### 3. [P2] Cada página abre igual y hace esperar lo que vende

**Qué:** los 5 héroes interiores son el mismo molde (cara oscura detrás del titular, 54 vh) y ninguno hace el trabajo de su página.
- **/resultados:** la página que se llama Resultados enseña la explicación («Cómo leer cada ficha», 4 definiciones) **antes** de la primera ficha, que arranca a **1.594 px** en escritorio (1,8 pantallas) y a ~2,3 pantallas en celular (`resultados/page.tsx:47-75` va antes de `<Resultados />`, línea 75). En el héroe, la cara de la mujer queda recortada por el cuello en escritorio: se ve la camiseta, no ella.
- **/coaching:** vende a una persona y la presenta al **70 % de la página** (~3.800 px de 5.429 en escritorio, ~5.500 de 7.865 en celular): primero pasos, primera semana, ritmo y planes; al final «No es un algoritmo. Es Andrés Martínez.» (`coaching/page.tsx:213`).
- Además la cara está **detrás del titular** en Coaching y Planes (el titular cae sobre el hombro/cuello).
- **/ayuda:** el fondo del héroe trae una frase pintada en la pared («DISCIPLINA / ENFOQUE / RESULTADOS», desenfocada, a la derecha) que se lee como un fantasma.

**Por qué importa:** quien llega a /resultados desde una historia (los enlaces de Instagram aterrizan en páginas interiores) lee una explicación sin haber visto nada que explicar. Quien llega a /coaching a decidir si confía en una persona, no la ve hasta el final. Les cuesta paciencia y confianza justo en la página de más intención de compra.

**Arreglo:**
- /resultados: la cifra más fuerte (la ficha de +55 kg) como cabecera de la página, o la primera ficha **antes** de la leyenda; la leyenda de las 4 definiciones pasa a una línea bajo el título de las fichas o a un «Cómo leer esto ▾» plegable. Resultado: la primera ficha arriba de 900 px.
- /coaching: la foto y «No es un algoritmo» suben a justo después del héroe; los pasos se quedan debajo.
- Titular y cara **no se cruzan**: en `PageHero.tsx` poner la foto con `object-position` hacia la derecha en `lg` y limitar el titular a la mitad izquierda; recortar o desenfocar la frase de la pared de `ath-bench.jpg`.

**Comando:** `$impeccable layout` por página (Resultados y Coaching primero) y `$impeccable polish`.
**Evidencia:** `resultados-esc-1.jpg` (ficha a 1.594 px: confirmado con la sonda), `coaching-esc-3.jpg` (la persona al final), `ayuda-esc-0-pantalla.jpg` (la frase fantasma, x≈1090-1290), `coaching-esc-0-pantalla.jpg` (titular sobre el hombro); `PageHero.tsx:22-36`.

---

### 4. [P2] Planes: cinco planes en tres formatos y una tabla que repite las tarjetas

**Qué:** la página muestra 3 tarjetas (FREE, PRO, Virtual) + una tabla de 4 columnas con las mismas funciones + 2 tarjetas más (Presencial), en 8.324 px de celular (**9,9 pantallas**). La tabla repite en filas lo que ya dicen las tarjetas (`FILAS`, `precios/page.tsx:142-154`) y en celular esconde la columna «Presencial» (348 px visibles de 500). La ayuda para el indeciso («¿No sabes cuál es para ti?») está **al final**, después del bloque de pago (`precios/page.tsx:405-430`; ~8.000 px en celular).

**Por qué importa:** quien llega sin saber cuál elegir ve primero cinco precios y no el filtro que le diría cuál. Le cuesta a quien más duda (el principiante) y a quien viene en celular y datos móviles. Ya está abierto aparte «tira de precios arriba»; esto es la estructura de la decisión, no el encabezado.

**Arreglo:**
- **Dos puertas arriba, en el mismo lugar que hoy ocupa «La app, contigo en cada serie»:** «Solo la app» (FREE y PRO) y «Con Andrés» (Virtual y Presencial, que se abre si estás en Guaduas). Un control segmentado de 2 opciones; dentro de cada puerta quedan 2-3 tarjetas, nunca 5 a la vez.
- Reemplazar la tabla por una **escalera acumulativa**: «Gratis → PRO suma 6 cosas → Coach suma 5 → Presencial suma 3», con el tratamiento mono del libro de cuentas de las fichas (la misma flecha dorada). Es menos texto que la tabla y es de AVI. En celular, la tabla actual sale.
- Un solo nombre por plan en todo el sitio («Coach virtual» y «Presencial»).
- Subir «¿No sabes cuál es para ti?» a la primera pantalla de Planes, bajo el título.

**Comando:** `$impeccable distill` (la tabla) + `$impeccable layout` (las dos puertas) + `$impeccable clarify` (los nombres).
**Evidencia:** `precios-cel-2.jpg` (tabla cortada), `precios-cel-5.jpg` (el orientador al final), `precios-esc-2.jpg` (tabla + tarjetas repetidas); `precios/page.tsx:142-154,186-220,359-361,405-430`.

---

### 5. [P2] La prueba de producto en celular casi no se lee, y tres detalles de acabado fallan justo ahí

**Qué:**
- **Galería de la app en celular:** cada teléfono mide **216 px** de ancho para una captura de 360 (escala **0,6**): el texto de la app (11-12 px) queda en ~7 px. Y se ve **un teléfono y medio** por pantalla (`AppGallery.tsx:129`, `w-[14.5rem]`). La explicación de «Toca una para verla en grande» es lo único que sostiene la sección.
- **Primera ficha pegada al borde:** en celular la primera ficha de resultados queda a **x = 0**, mientras el título está a x = 20. La tira (`Resultados.tsx:87`) usa `-mx-5 px-5` con `snap-start` (`:98`) pero **no pone `scroll-padding`**, así que el navegador alinea la ficha con el borde del contenedor y el relleno de 20 px desaparece (medido: `scrollLeft` 20, `left` de la ficha 0).
- **Flechas muertas en el inicio:** ver heurística 1 (`AppGallery.tsx:101-116`; se muestran aunque no haya nada que desplazar).
- **Ficha huérfana en /resultados:** con 4 fichas y `lg:grid-cols-3` (`Resultados.tsx:91`), la cuarta queda sola en una segunda fila con dos tercios vacíos (`resultados-esc-2.jpg`).

**Por qué importa:** son las piezas que más venden y las que más se miran en el celular (la audiencia real). Una captura ilegible no prueba nada; una ficha pegada al borde parece un error de montaje; unas flechas que no mueven nada le quitan seriedad al resto.

**Arreglo:**
- Galería en celular: teléfono al **78 % del ancho** (~300 px) y uno a la vez con su título sobre él, o recortar cada captura a la franja que importa (arriba: saludo + lista + «Empezar mi entreno») para que quepa un tamaño legible.
- `scroll-pl-5 sm:scroll-pl-8` en la tira de resultados (y `scroll-pr` equivalente al final).
- Ocultar las flechas cuando `scrollWidth <= clientWidth`.
- Rejilla de resultados con `lg:grid-cols-2` cuando son 4 (2 + 2) o `auto-fit` para que ninguna quede sola.

**Comando:** `$impeccable adapt` (celular) y `$impeccable polish`.
**Evidencia:** `inicio-cel-1.jpg`, `la-app-cel-1.jpg` (captura pequeña), `inicio-cel-2.jpg`/`inicio-cel-3.jpg` (ficha pegada al borde), `inicio-esc-1.jpg` (flechas sin función), `resultados-esc-2.jpg` (ficha huérfana). Medidas con la sonda propia.

---

## 7. Banderas rojas por persona

**Jordan (primera vez, sin saber de entrenamiento):**
- El titular dice «Entrenamiento con nombre propio»: es una frase de marca, no una descripción; lo que hace AVI se entiende en el párrafo de debajo.
- «RECOMPOSICIÓN» aparece como etiqueta de objetivo en las fichas del inicio y no se explica hasta /resultados.
- En Planes ve cinco precios y el único filtro («¿No sabes cuál es para ti?») está **al final**, después del bloque de pago.
- «AVI COACH VIRTUAL», «Coaching» y «Virtual» son lo mismo con tres nombres.

**Riley (probador de bordes):**
- Flechas de la galería activas sin nada que desplazar (inicio, escritorio).
- Ficha huérfana de /resultados a 1440; primera ficha pegada al borde a 390.
- Tabla de planes con la última columna fuera de la vista (348 de 500 px) en celular.
- 404 de Next en inglés; el aviso de «copiar» no dice nada si el portapapeles no responde.

**Casey (celular, un pulgar, interrumpido):**
- Páginas de 7,5 (inicio) a 9,9 (planes) pantallas; el encabezado fijo solo ofrece «Entrar a la app» (para quien ya entrena); la acción de quien viene a comprar no está a mano: o abre la hamburguesa o vuelve a una tarjeta.
- Capturas a 0,6 de escala, texto de ~7 px.
- La tabla pide deslizar de lado dentro de una página que ya se desliza.

**Valentina (persona del proyecto: en Colombia, entra desde un link de Instagram, Android de gama media, datos móviles):**
- Entra por el navegador interno de Instagram: ve una pared de texto verde, sin cara ni app (problema 1).
- Si la historia apunta a `/precios` o `/resultados`, ve el mismo héroe que en cualquier otra página y tiene que bajar 1.600 px para ver una ficha (problema 3).
- El botón verde y relleno de «Entrar a la app» es el control más fuerte en **todas** las páginas; una persona nueva puede tocarlo creyendo que «entrar» es empezar y caer en un login de una app que no ha probado.
- Riesgo de rendimiento sin medir (marcado como no medido): `background-attachment: fixed` en el cuerpo (`globals.css:54`), `backdrop-blur-xl` en el encabezado, `blur-xl` bajo cada teléfono y bloques de textura en 9 secciones. Vale probarlo en un Android real antes de dar por buena la fluidez.
- El pago por llave Bre-B es el camino correcto para Colombia; falta confirmar que el botón de copiar funciona en el navegador interno de Instagram.

---

## 8. Observaciones menores

- **Un tagline repetido cuatro veces:** «Entrenamiento con nombre propio» aparece en el titular, en el texto vertical del héroe, en la descripción del pie y en la línea de derechos. Dos sobran.
- **Separador huérfano** en /la-app en celular: «Ver planes y precios → ·» deja el punto colgando al final de la línea (`la-app/page.tsx:104`, visible en `la-app-cel-2.jpg`).
- **Tipografía mono muy pequeña:** la etiqueta de sección mide **11,2 px** (`globals.css:124`, 0,7 rem) con 0,3 em de espaciado y el chip de objetivo de las fichas **9,9 px** (`Resultados.tsx:145`, 0,62 rem). R18 habló de 12 px; conviene confirmar que se aplicó a todos.
- **Numerales de contorno** de las tarjetas claras de plan: dorado muy pálido sobre crema, casi invisible; además implican un orden (01, 02, 03) que los planes no tienen.
- **Una sola entrada para todo:** `Reveal` (`translateY(28px)` + opacidad, 0,7 s) es la misma en cada sección, sumada a `kenburns`, `floaty`, `sheen` y `tilt`. Es movimiento disperso en lugar de un momento escrito. En la práctica es lo que menos daña, pero pesa en gama media.
- **Los 4 valores del coach** («Personal · Honesto · Accesible · Constante», `coaching/page.tsx:242-256`) son cuatro tarjetas iguales con número: el tipo de bloque que más se parece a una plantilla; el texto tiene voz, la caja no.
- **Cierre de Resultados** con tres botones del mismo peso (`resultados/page.tsx:83-92`): uno tiene que ser dominante.
- **Footer de 12 enlaces** y dos columnas casi idénticas a la navegación. No es un problema, pero es el lugar más fácil para recortar.
- **404 sin marca** [P3]: crear `app/not-found.tsx` con el pie, el menú y tres salidas (Inicio, Planes, WhatsApp). El sitio tiene enlaces compartidos y redirecciones; un error de dedo en una historia termina ahí.
- **«Tocar para copiar» sin plan B** [P2, sin medir]: mostrar la llave seleccionada y un aviso «No se pudo copiar; mantén pulsada la llave» cuando falle el portapapeles (`PagoBreB.tsx:36-43`).

---

## 9. Preguntas para el dueño

1. **Si tapas el logo, ¿qué de esta web dice «Andrés» y «Guaduas» y no «un gimnasio boutique cualquiera»?** Hoy la respuesta está en los textos, no en lo que se ve. ¿Quieres que una cosa visual sea solo tuya: un nudo de guadua como filete, la conversación de WhatsApp dibujada, o tu foto real en el primer pantallazo?
2. **¿Y si lo primero que se viera en el celular fuera la app saludando a una persona por su nombre?** «Con nombre propio» deja de ser un eslogan y pasa a ser lo que ves. ¿Hay algo que se pierda quitando la franja del torso del héroe?
3. **¿Quieres que las seis páginas se parezcan, o que cada una tenga su trabajo?** Hoy se parecen tanto que Resultados no se ve como un archivo de pruebas y Coaching no se ve como una conversación contigo. ¿Qué página sería la primera que dejarías ser distinta?
4. **El botón verde «Entrar a la app» es el más fuerte de todas las páginas: ¿para quién lo quieres tan fuerte?** Para quien ya entrena sirve; para quien llega nuevo compite con «Probar gratis» y puede mandarlo a un login. ¿Lo bajamos a un botón de contorno y dejamos el dorado de «Probar gratis» como único relleno del encabezado?

---

## Nota de evidencia y límites

- Medido en vivo (390×844 y 1440×900, build local): posiciones x de títulos y logo, `scrollWidth`/`clientWidth` de la galería, `left` y `scrollLeft` de la tira de resultados, escala de las capturas, anchos visible/total de la tabla, alturas de página y posiciones de las fichas.
- **No medido:** rendimiento en Android real, comportamiento del portapapeles dentro del navegador de Instagram, el video completo del héroe (solo el póster y el cuadro de las capturas), la web en producción.
- Los números de línea son del árbol de `avi-web` del 3-oct-2026.
- No se editó ningún archivo del sitio ni se publicó nada. Sonda y datos temporales en el directorio temporal de la sesión.
