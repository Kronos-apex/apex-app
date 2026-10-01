# D1 · Diseño y accesibilidad — Isabella (diseño/a11y) + Julián (QA)

Auditoría de solo lectura de `https://avientrena.com` (1-oct-2026, R18). Método: skills `design:design-critique` (primera impresión, jerarquía, consistencia) y `design:accessibility-review` (WCAG 2.1 AA), pero cada hallazgo apunta a algo medido en ESTA web. Navegador: Chrome headless por CDP, puertos 9470-9479, sondas en `%TEMP%\d1\` (`p4x.mjs` contraste por píxel, `p7.mjs`/`q1.mjs` foco y teclado, `p8.mjs` menú y orientador, `p9/p10/q2/q6` letra grande y 320 px). Capturas compartidas usadas antes de tomar las mías (`movil-*`, `compu-*`); capturas propias en `%TEMP%\d1\` (`w320-precios.jpg`, `w320-coaching.jpg`, `cap01.png`, `tabla390-a.jpg`, `menu-abierto2.jpg`).
No repito lo de D2 (textos y recorrido); donde toco un tema suyo (botón principal ausente en La app/Coaching/Resultados) lo cito y no lo cuento.

## Veredicto en una frase

El sistema visual es coherente de punta a punta y la base de accesibilidad es mejor que la de casi cualquier web de entrenador (menú `inert`, orientador con foco que sigue la pregunta, visor de capturas con foco atrapado, contenido completo sin JavaScript), pero **ninguna pieza impide usar la web y sí hay una tanda de bordes reales**: el texto chico y pálido de las fichas de resultados (la prueba de venta), el foco que se esconde bajo el encabezado fijo, un menú móvil que no cierra con Escape, un héroe del celular con una franja de foto sin contenido y el orientador enterrado a 5,2 pantallas, y un bloque de pago cortado a 320 px. Cero 🔴, 9 🟡, 10 🟢.

## Los 5 más grandes

### 1. 🟡 La prueba de venta se lee en 10 px y en gris pálido: fichas de Resultados (y 5 textos más que comparten el defecto)
- **Qué es.** En cada ficha de resultados hay dos líneas de letra mono diminuta: «3 MESES EN AVI · 53 ENTRENOS» a **10,4 px** con contraste **3,95:1** (`text-gold/80`, `components/Resultados.tsx:131`) y «SUBIÓ CARGA EN 16 DE 28 EJERCICIOS» a **10,9 px** con **3,15:1** (`text-cream/45`, `Resultados.tsx:178`). Piden 4,5:1. Son justo el dato que da contexto a la cifra grande (`+55 kg`): la ficha dice «cuánto» en 60 px y «en cuánto tiempo y de cuántos ejercicios» en letra que no se lee al sol. Misma clase en otros 5 sitios medidos: «Día 1/3/7» (coaching) 11,5 px a **3,47:1** (`app/coaching/page.tsx:105`, `text-gold-deep`); «Pregunta 1 de 3» del orientador 11,2 px a **4,23:1** (`Orientador.tsx:146`, `text-gold/85`); «COP / mes» del plan destacado 14 px a **4,39:1** (`precios/page.tsx:260`, `text-cream/60`); «← desliza →» 12 px a **3,85:1** (`AppGallery.tsx:164`, `text-ink-soft/70`); y los guiones de la tabla comparativa (11 celdas «—» a **2,45:1**, `precios/page.tsx:161`, `text-ink-soft/50`) que son la señal visual de «no incluido».
- **A quién le pasa.** A quien mira desde el celular en la calle o con la pantalla al mínimo, y a baja visión. Las fichas se repiten en Inicio y en Resultados: 4 fichas × 2 líneas.
- **Evidencia.** Contraste por píxel (texto vuelto transparente, captura del fondo, percentil 3 peor), 390 y 1440 px, 6 páginas, controles OK en las 12 corridas (negro 21, `#767676` 4,54, degradado p3 1,06). Salida en `%TEMP%\d1\c390.txt` y `c1440.txt`. Tamaños: Inicio tiene 20 nodos de texto de 11,2 px o menos (3 a 9,9 px, 3 a 10,4, 3 a 10,9, 11 a 11,2); `/la-app` 10 chips «Gratis»/«PRO» a **9,9 px**; Resultados 11 a ≤10,9 px. Captura: `movil-inicio-04.jpg`, `movil-planes-01…` (tabla `tabla390-a.jpg`).
- **Cómo intenté tumbarlo.** (a) ¿Falso positivo por animación de entrada (las capas `.reveal` quedan desplazadas 28 px al medir)? Congelé `.reveal/.rise` y repetí: las líneas de ficha, «Día 1/3/7», «desliza», guiones y «COP / mes» siguen igual. (b) ¿Es la sonda? El control del degradado da 1,06 y el del `#767676` 4,54: la sonda lee bien. (c) Verifiqué el arreglo con un CSS inyectado y la misma sonda: **0 fallos en las 6 páginas** (ver «Arreglo»). Descarté 3 positivos que SÍ eran de la sonda (ver «Lo que descarté»).
- **Arreglo (verificado inyectándolo).**
  - `Resultados.tsx:131` `text-gold/80` → `text-gold`; `:178` `text-cream/45` → `text-cream/80`; y las dos líneas de `text-[0.65rem]`/`text-[0.68rem]` → `text-xs` (12 px).
  - `coaching/page.tsx:105` `text-gold-deep` → `text-green` (5,78:1).
  - `Orientador.tsx:146,176` `text-gold/85` → `text-gold`.
  - `precios/page.tsx:260` `text-cream/60` → `text-cream/75`; `:161` `text-ink-soft/50` → `text-ink-soft/80`.
  - `AppGallery.tsx:164` `text-ink-soft/70` → `text-ink-soft/90`.
  - Chips Gratis/PRO de `/la-app`: `text-[0.62rem]` → `text-[0.7rem]` como mínimo (hoy 9,9 px).

### 2. 🟡 El foco queda escondido bajo el encabezado fijo cuando se navega hacia atrás
- **Qué es.** El encabezado es `sticky top-0` (65 px de alto) y la página no declara `scroll-padding-top`. Al volver con Shift+Tab, el navegador deja el elemento enfocado pegado al borde de arriba, **debajo del encabezado**. Medido en `/ayuda` a 390 px: de 32 paradas, **6** quedan con el borde superior bajo el encabezado, entre ellas los resúmenes del FAQ («¿Tengo que instalar algo?» a top=46, «¿Cómo cancelo?» a top=0, «¿AVI reemplaza a un entrenador…?» a top=0). A 1440 px: 4 de 37. En `/precios` y `/coaching` también aparecen (2 cada una; el 1.º es el logo).
- **A quién le pasa.** Teclado, interruptores y lector de pantalla con teclado (WCAG 2.4.11 Foco no oculto, AA en 2.2; 2.4.7 en 2.1): el aro de foco del resumen del FAQ no se ve, justo en la página donde más se tabula (66 paradas en `/ayuda`).
- **Evidencia.** `q1.mjs` (Shift+Tab desde el pie, `top < alto del header`) y `p7.mjs`. En `/precios` con Tab hacia adelante también cae 1 («Qué incluye» a top=62 con header de 66).
- **Cómo intenté tumbarlo.** Control: la misma pasada con `html{scroll-padding-top:5rem}` inyectado da **0 de 32**; sin el arreglo vuelve a dar 6 (`q2.mjs` bloque A). No es un artefacto del emulador: ocurre con el recorrido real de teclas (`Input.dispatchKeyEvent`).
- **Arreglo.** En `app/globals.css`: `html { scroll-padding-top: 5rem; }` (un renglón). De paso arregla los saltos por ancla (`#orientador`, `#comparar`), que hoy se apoyan en `scroll-mt-20` suelto en cada sección.

### 3. 🟡 El menú del celular no cierra con Escape, no devuelve el foco y se queda abierto al tocar la sección donde ya estás
- **Qué es.** `components/Header.tsx`: el botón alterna `open` pero no hay manejo de teclado ni de salida. Medido con teclas reales: abrir con Enter → Tab llega a «Inicio» (bien, el panel está justo después) → **Escape: `aria-expanded` sigue en `true` y el foco sigue dentro** (`p8.mjs`: «tras Escape: exp:true, act:Inicio»). Además, tocar «Inicio» estando en Inicio **no cierra el menú** (el cierre depende de que cambie `pathname`, `Header.tsx:21`): la persona toca y no pasa nada visible (`q4.mjs`: tras el clic, `aria-expanded` sigue en `true`). Tocar fuera del panel tampoco cierra.
- **A quién le pasa.** Teclado/lector: no hay forma estándar de salir del menú. Celular: quien está en la sección y toca su propio enlace cree que la web no responde. Es la ÚNICA navegación del celular (la barra horizontal solo existe desde 1024 px).
- **Evidencia.** `p8.mjs` y `q4.mjs` (salida literal arriba). Contraste interno: el visor de capturas de la MISMA web (`AppGallery.tsx:52-84`) sí resuelve Escape, foco atrapado y retorno de foco; el menú quedó atrás.
- **Cómo intenté tumbarlo.** (a) ¿El panel está `inert` cuando cierra? Sí, bien (`inert={!open}`, `Header.tsx:103`), así que no hay tabulación fantasma: ese punto está SANO. (b) ¿Escape lo cierra por algún manejador global? Probé Escape con el foco en el botón y en el primer enlace: no.
- **Arreglo.**
  ```tsx
  const botonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); botonRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  ```
  `ref={botonRef}` en el botón (`Header.tsx:65`) y `onClick={() => setOpen(false)}` en cada enlace del panel (`:110-117` y el de «Probar la app gratis» `:119`).

### 4. 🟡 Jerarquía en el celular: el héroe de Inicio gasta media pantalla en una foto sin contenido y la herramienta clave, el orientador, está a 5,2 pantallas sin ninguna entrada
- **Qué es (héroe).** En Inicio a 390 px el héroe mide **1.229 px = 1,46 pantallas**. La primera pantalla está bien resuelta (H1 con cursiva dorada → párrafo → botón dorado «Probar la app gratis» claramente distinto del contorno «Conocer el coaching», `movil-inicio-01.jpg`). Pero a continuación hay un bloque de foto de **506 px (60 % de la pantalla)** que, en el celular, es el recorte de un torso y unos shorts oscuros, sin cara, sin acción y bajo el mismo verde (`movil-inicio-02.jpg`). La siguiente información útil («Así se ve un día de entrenamiento») empieza a ~1,06 pantallas de la parte baja del botón. En escritorio la misma foto (`compu-inicio-01.jpg`) sí actúa de fondo del héroe; en celular se apila.
- **Qué es (orientador).** `#orientador` empieza en y=**4.375 de 6.529 px (67 % de la página, 5,2 pantallas)**; en Inicio no hay ningún enlace que lleve a él (`p15.mjs`: «enlaces al orientador en Inicio: []»; solo `/precios` lo enlaza). Es la pieza que el PO pidió para quien no sabe por dónde empezar, y a esa persona se le pide primero atravesar el héroe, la galería, las fichas y el coach. Vista aislada, la pieza es buena: tarjeta con «Pregunta 1 de 3», 4 opciones grandes (≥56 px), resultado con título dorado y los dos botones (`movil-inicio-06.jpg`, `or4.jpg`).
- **A quién le pasa.** A quien llega de una historia: en los primeros 3 segundos ve el titular y el botón (bien), y después la franja oscura de foto; no hay un «¿No sabes por dónde empezar?» que lo lleve a las 3 preguntas.
- **Evidencia.** `p6.mjs`: `mediaTop 788, mediaH 506`, héroe 1.229 px; `p15.mjs`: orientador a 4.375 px, 5,18 pantallas.
- **Cómo intenté tumbarlo.** ¿Es culpa del emulador? La altura sale de `min-h-[60vh]` en `app/page.tsx` y se repite a 844 de alto real. ¿El vídeo la rellena en celular? No: `HeroMedia` no monta `<video>` bajo 1024 px (ahorro medido por el equipo), solo el póster.
- **Arreglo.** (a) `app/page.tsx`, contenedor de `HeroMedia`: `min-h-[60vh]` → `min-h-[26vh] lg:min-h-full` y, en `HeroMedia.tsx`, `bg-[position:50%_18%]` para que asome el rostro en vez del torso. (b) Enlace de una línea debajo del microtexto del héroe (`app/page.tsx:88-95`): `<Link href="#orientador" …>¿No sabes por dónde empezar? Responde 3 preguntas ↓</Link>`, y subir `<Orientador />` justo después de la galería de capturas (de 4.375 a ~1.900 px). El texto exacto del enlace lo decide D2/PO.

### 5. 🟡 Se rompe con zoom fuerte y con letra grande de Android: Bre-B queda cortado a 320 px y el encabezado se sale desde 125-140 %
- **Qué es (320 px).** A 320 px el bloque «Paga con tu llave» (`PagoBreB.tsx`) queda **cortado**: el texto «Bre-B es el sistema de pagos inmediatos de Colombia: llega al instante y sin comisiones…» se recorta por la derecha («inmediatos c», «comisione»), porque su caja mide 290 px dentro de un contenedor con `overflow-hidden` (`w320-precios.jpg`; 23 elementos más anchos que 320). `/coaching` se desliza **13 px de lado** (scrollWidth 333; `w320-coaching.jpg`). La causa es una sola regla: `.btn { white-space: nowrap }` (`app/globals.css:150`); el botón «Enviar pantallazo por WhatsApp» (`PagoBreB.tsx`) no cabe y ensancha la columna.
- **Qué es (letra grande).** El encabezado (logo + «Entrar a la app» + hamburguesa) no encoge: con la letra del sistema al 125 % en 360 px el botón de menú queda en x=370 (fuera de 360) y el documento pasa a 370 px; al 140 % en 390 px, 415 px. Al 200 %: 592 px, o sea la página se reduce a ~66 % para caber y la letra grande no sirve de nada. 125 % es un ajuste común en Android de gama media. Un lector que depende de ampliar queda con la web más pequeña que antes.
- **A quién le pasa.** Baja visión, mayores de 40 con letra grande, zoom del navegador al 400 % (WCAG 1.4.10 Reflow, 1.4.4 Resize text). 320 px es un celular chico o la ventana de un escritorio al 400 %.
- **Evidencia.** `q1.mjs` bloque 4; `p9.mjs` (modos 320/fuente200/fuente150); `p10.mjs` y `q6.mjs` (barrido 100-200 %).
- **Cómo intenté tumbarlo.** Control de cada arreglo, inyectado con la misma sonda: con `.btn{white-space:normal}` a 320 px → `/precios` 23 → **0** elementos fuera y `/coaching` scrollWidth 333 → **320** (`q2.mjs` B). Con `header a.btn{white-space:normal;text-align:center;line-height:1.15;padding-inline:.9rem}` el encabezado cabe al 125 % y 140 % en 360 y 390 px (`q6.mjs`); **al 200 % sigue desbordando (492 px): ese tramo queda abierto.** 360 y 390 px sin letra grande: sanos (baseline del equipo, no lo repetí).
- **Arreglo.** `app/globals.css:150`: `.btn { white-space: normal; text-align: center; }` (si se quiere conservar `nowrap` en escritorio: `@media (min-width: 640px) { .btn { white-space: nowrap; } }`). `Header.tsx:60`: `className="btn btn-primary text-sm py-2.5 px-3.5 whitespace-normal text-center leading-tight"` y `min-w-0` en el contenedor flex.

## Todos los hallazgos

| # | Sev | Qué | Dónde | Arreglo propuesto |
|---|---|---|---|---|
| 1 | 🟡 | Texto de ficha (10,4-10,9 px a 3,15-3,96:1) | `components/Resultados.tsx:131,178` | `text-gold`, `text-cream/80`, `text-xs` |
| 2 | 🟡 | «Día 1/3/7» 3,47:1, «Pregunta 1 de 3» 4,23:1, «COP / mes» 4,39:1, «← desliza →» 3,85:1 | `coaching/page.tsx:105`, `Orientador.tsx:146,176`, `precios/page.tsx:260`, `AppGallery.tsx:164` | Ver Grande 1 |
| 3 | 🟡 | Guiones «—» de la tabla a 2,45:1 (11 celdas) | `precios/page.tsx:161` | `text-ink-soft/80` |
| 4 | 🟡 | Foco bajo el header fijo con Shift+Tab (6 de 32 en /ayuda) | `app/globals.css` | `html{scroll-padding-top:5rem}` |
| 5 | 🟡 | Menú móvil: sin Escape, sin retorno de foco, no cierra al tocar la sección actual | `Header.tsx:21,65,110-119` | Ver Grande 3 |
| 6 | 🟡 | Héroe de Inicio en celular: 506 px de foto sin contenido; orientador a 5,2 pantallas sin enlace | `app/page.tsx` (héroe), `HeroMedia.tsx`, `Orientador.tsx` | Ver Grande 4 |
| 7 | 🟡 | A 320 px Bre-B cortado y /coaching 13 px de lado (`.btn nowrap`) | `globals.css:150` | `.btn{white-space:normal}` |
| 8 | 🟡 | Letra grande: el encabezado no encoge (370 px a 125 % en 360) | `Header.tsx:31-62` | `whitespace-normal` en «Entrar a la app» |
| 9 | 🟡 | Vídeo del héroe en escritorio: autoplay, loop infinito y ken-burns infinito, sin pausa (WCAG 2.2.2 nivel A). Medido a 1440 con movimiento permitido: `paused:false, loop:true, anim:kenburns, iter:infinite, botonPausa:false`. Control: con «reducir movimiento» no se monta el vídeo | `HeroMedia.tsx:46-59`, `globals.css` `.kenburns` | Botón «Pausar movimiento» (`aria-pressed`) que detiene vídeo y animación, o quitar `loop`+`kenburns` |
| 10 | 🟢 | Planes: comparar los 3 precios exige ~2,5 pantallas (FREE a y=779, PRO 1.407, COACH 2.144; la tabla a 3.123 = 3,7 pantallas; Presencial a 4.482). No hay una tira de precios arriba | `precios/page.tsx` | Tira de 3 chips con precio + ancla a cada tarjeta, sobre la primera tarjeta |
| 11 | 🟢 | Cierre de Inicio: el titular y los dos botones cubren la cara del coach (`movil-inicio-07.jpg`); «Sin permanencia, sin letra chica.» 18 px a 4,27:1 sobre la foto | `app/page.tsx:190-200` | Subir texto, mover la foto a `object-position: 50% 0`, `text-cream` pleno |
| 12 | 🟢 | `<h2>` de Resultados con interlineado 1,5 (153 px de alto en 2 líneas) frente a 1,1 de todos los demás: se ve «abierto» | `Resultados.tsx:38` | Añadir `leading-[1.1]` |
| 13 | 🟢 | Números decorativos «01/02/03» de las tarjetas de plan no están ocultos a lector de pantalla: se lee «AVI FREE 01». Además, trazo dorado pálido a 1:1 (decorativo) | `precios/page.tsx` (`num-outline`), `PagoBreB.tsx` | `aria-hidden` en los `num-outline` que no son de una lista numerada |
| 14 | 🟢 | Celdas de la tabla: nombre vía `aria-label` en un `<span>` (rol genérico: el nombre no es fiable en NVDA/VoiceOver; Chrome sí lo expone) | `precios/page.tsx:158-162` | `role="img"` en esos dos `span`, o `<span className="sr-only">Incluido</span>` |
| 15 | 🟢 | Sin enlace «Saltar al contenido»: 3 paradas de tabulador antes del contenido en celular, 8 en escritorio | `app/layout.tsx` | `<a href="#contenido" className="sr-only focus:not-sr-only …">Saltar al contenido</a>` + `id="contenido"` en `<main>` |
| 16 | 🟢 | Enlace del logo se lee «AVI AVI» (img `alt="AVI"` + texto «AVI») | `components/Logo.tsx` | `alt=""` en la imagen |
| 17 | 🟢 | Sombra de los teléfonos de la galería recortada por el contenedor deslizable: bandas rectangulares visibles bajo cada captura; el «01» queda sobre la sombra (la sonda midió 1,8:1, pero el número en sí es legible, ver «Lo que descarté») | `AppGallery.tsx:122-145` (`overflow-x-auto` + `blur-xl`) | `pb-10` en el carril y `overflow-y: visible` no es posible: dar al `blur` un contenedor sin recorte o acortar la sombra |
| 18 | 🟢 | Etiqueta vertical «ENTRENAMIENTO CON NOMBRE PROPIO» (`.vlabel`) se lee en voz alta, repite el titular | `app/page.tsx:100-102` | `aria-hidden` |
| 19 | 🟢 | Objetivos de toque: 1 solo enlace bajo 44 px de alto fuera del pie («AVI PRO desde $30.000», 40 px); en el pie «Inicio» 36 px de ancho y «Ayuda» 42 | `app/page.tsx:93`, `Footer.tsx` | `py-3.5` y `px-2` |

## Lo que verifiqué y está SANO (con números)

- **Contraste de cuerpo y titulares**: por píxel, 6 páginas × 390/1440 px; textos medidos a 390 px: Inicio 87, La app 73, Planes 186, Coaching 100, Resultados 62, Ayuda 91. Todo el cuerpo y los titulares pasan salvo lo listado. Controles de la sonda OK en las 12 corridas.
- **Estructura**: `lang="es"`, 1 `main`, 1 `header`, 1 `footer`, **1 solo `h1` por página**, sin saltos de nivel en los encabezados observados; `<meta viewport>` permite ampliar (`width=device-width, initial-scale=1`).
- **Foco y teclado**: toda parada recibe un aro visible (el de Chrome, doble negro/blanco, o el `focus-visible` propio del orientador, del FAQ y de las fichas); paradas por página a 390 px: Inicio 29, La app 44, Planes 24, Coaching 18, Resultados 16, Ayuda 66. No hay trampas de foco.
- **Menú móvil**: `aria-expanded` y `aria-controls` correctos; cerrado está `inert` (cero tabulación fantasma); abierto, 7 enlaces de 48 a 52 px de alto; el cierre con el botón devuelve la cruz/hamburguesa. Lo que falla es solo Escape/retorno/cierre al tocar la actual (Grande 3).
- **Orientador**: `fieldset` + `legend` por pregunta, opciones con nombre, el foco pasa al `<h3>` en cada paso y en el resultado (`tabindex=-1`), «Volver a la pregunta anterior» a 44 px, respuestas listadas con `aria-label`. Opciones ≥56 px de alto; resultado con jerarquía clara (título dorado → motivo → botón dorado → botón de contorno). Las 36 combinaciones ya medidas por el equipo.
- **Visor de capturas**: `role=dialog` + `aria-modal`, foco entra al abrir, queda atrapado, Escape y flechas, y el foco vuelve a la miniatura.
- **Tabla comparativa**: región con foco (`tabindex=0`, `role=region`, `aria-label`), primera columna `position:sticky`, encabezados de fila con nombre, 11 filas de ~78 px, celdas «Incluido»/«No incluido» expuestas en el árbol de accesibilidad. A 390 px muestra Gratis y PRO completos y asoma «Virtual» cortado en el borde (esa es la pista de que hay más), más el texto «Desliza la tabla…».
- **Sin JavaScript**: 0 de 2.846 caracteres ocultos en Inicio (0 de 4.827 en Planes y 0 de 3.576 en Coaching): las clases `.reveal` no esconden contenido.
- **Movimiento**: con «reducir movimiento» no se monta el vídeo y se apagan `.rise/.reveal/.kenburns/.floaty/.marquee`; control medido (hay `<video>` con movimiento permitido, no hay `<video>` con reducido).
- **Consistencia entre las 6 secciones**: mismo molde de héroe (etiqueta mono → H1 con cursiva dorada → párrafo), mismos cuerpos de tarjeta, mismo ritmo de botón dorado/verde/contorno y mismo cierre. Parecen el mismo sitio. La única desviación visible es el interlineado del H2 de Resultados (#12).
- **Objetivos de toque**: todos ≥40 px de alto (baseline); solo los de #19 quedan bajo 44 px en alguno de los dos ejes.
- **Imágenes**: todas con `alt`; las fotos de ambiente con texto genérico «Atleta de AVI…» (aceptable, es decorativa).
- **Anchos 360 y 390 px**: sin desborde en las 6 páginas (baseline del equipo, no repetido).

## Lo que descarté (positivos de MI sonda que no eran defectos)

- «0 1», «0 2» de la galería a **1,8:1** (30 px): la sonda toma el fondo de toda la caja del texto, que incluye la sombra del teléfono. El número es `text-gold-deep` (#a87a17) sobre crema: **3,47:1** (texto grande, pide 3,0), y a simple vista se lee bien (`cap01.png`). Queda solo el defecto de las bandas de la sombra (#17).
- «lleva tu nombre.» (2,93:1) y el botón «Escribirle a Andrés» (4,45:1) del cierre: aparecían en la primera pasada y **desaparecen al congelar las animaciones de entrada y el ken-burns** (la foto de fondo se mueve entre el rectángulo medido y la captura). No los cuento; sí conservo «Sin permanencia, sin letra chica.» (4,27:1 con p3, mediana 8,26) como 🟢 porque sigue saliendo con la animación congelada.
- Cualquier número de contraste sobre el vídeo del héroe: no se pudo muestrear (el pipeline mide el póster), queda en «Qué NO miré».

## Lo que decide el PO

1. **Héroe del celular**: ¿se acorta la franja de foto (de 506 a ~220 px) y se recorta para que asome el rostro, o se deja el torso por estética? Cambia la longitud de Inicio de 7,7 a ~7,4 pantallas.
2. **Orientador**: ¿se sube justo después de la galería y se enlaza desde el héroe (hoy a 5,2 pantallas, sin entrada)? Es la decisión de mayor efecto en la conversión de quien llega de una historia.
3. **Planes**: ¿una tira de precios arriba (3 chips) para comparar sin recorrer 2,5 pantallas? Es diseño, no texto.
4. **Vídeo del héroe en escritorio**: ¿botón de pausa visible o quitar el bucle? (el criterio 2.2.2 es nivel A).
5. **Tipografía mono de 10-11 px**: es parte del carácter de la marca (etiquetas, fichas); el costo medido es 3,15-3,96:1 y 9,9 px. ¿Se sube a 12 px y a los colores propuestos? El arreglo propuesto no cambia la paleta, solo opacidades.

## Qué NO miré y por qué

- **Lectores de pantalla reales** (VoiceOver en iPhone, TalkBack, NVDA): solo el árbol de accesibilidad de Chrome (`Accessibility.getFullAXTree`). Las diferencias de anuncio entre lectores (p. ej. #14) quedan como riesgo, no medidas.
- **iPhone/Safari**: no hay uno en el banco; el comportamiento de `position: sticky`, de `inert` y del `backdrop-blur` del encabezado en Safari no se probó.
- **Texto fuera de pantalla en carriles deslizables**: el análisis por píxel no alcanza lo que está más allá de x=390 en las tiras (27 textos en Inicio, 39 en Resultados). Las fichas 2-4 usan las mismas clases que la ficha 1, que sí se midió; cualquier ficha con otro color se escaparía.
- **Contraste sobre el vídeo del héroe** (escritorio, en movimiento).
- **Modo de contraste alto de Windows / `forced-colors`** y modo oscuro del sistema (la web no declara esquema oscuro).
- **Navegador interno de Instagram** (de donde llega parte del público): no disponible.
- **Páginas de paso `/ir/<destino>`** (~0,5 s, A PROPÓSITO) y el envío real del orientador a WhatsApp (se corta la salida, regla del proyecto).
- **Textos, recorrido y afirmaciones contra la app**: es D2. **SEO/JSON-LD**: fuera de alcance (falso positivo 8 del briefing). **«Entrar a la app» siempre visible y su peso visual frente al botón dorado**: decisión del PO (falso positivo 7), no se critica.
