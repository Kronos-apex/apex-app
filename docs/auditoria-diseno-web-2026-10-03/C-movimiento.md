# R19 · C — Movimiento e interacción de la web (3-oct-2026)

Método: skill design-motion-principles, modo Audit. Ponderación para una página de venta: Jakub primario, Jhey secundario, Emil selectivo (botones, menú, visor). Se contó el código y se midió en Chrome contra `localhost:3456` (duraciones y curvas reales, «reducir movimiento», sin JavaScript, CPU 4× más lenta). Informe técnico con demos: `C-movimiento.html`. No se tocó nada del sitio.

## 1. Inventario: todo lo que se mueve

**19 efectos en uso + 3 escritos y sin usar.**

| # | Qué | Dónde | Duración | Cuánto lo ve la persona |
|---|---|---|---|---|
| 1 | Entrada del héroe (`rise`) | 22 elementos en las 6 páginas (6 en Inicio) | 0,8 s, escalonado hasta 0,42 s de retraso (termina a ~1,3 s) | Cada página que abre: 2-4 veces por visita |
| 2 | Aparición al hacer scroll (`Reveal`) | **64 bloques** (Inicio 9, La app 9, Planes 10, Coaching 23, Resultados 7, Ayuda 6) | 0,7 s + retraso hasta 0,36 s | Una vez por bloque, todo el recorrido |
| 3 | Vídeo del héroe | Solo Inicio en escritorio (no se carga en celular) | bucle de 11 s | Continuo |
| 4 | Zoom lento sobre el vídeo (ken-burns) | Inicio, escritorio | 20 s sin parar | Continuo |
| 5 | Paralaje de la foto HIIT | La app | Mientras se hace scroll | Una vez por visita |
| 6 | Botones: se elevan 2 px al pasar el cursor | 5-12 por página | 0,18 s | Constante |
| 7 | Tarjetas de plan: elevación 6 px, borde dorado, barrido de luz | 3 en Planes | 0,35 s / 0,8 s | Solo con cursor |
| 8 | Teléfonos de la galería se levantan | 3 en Inicio, 6 en La app | 0,45 s | Solo con cursor |
| 9 | Pastilla «Ampliar» | Cada captura | 0,3 s | Solo con cursor |
| 10 | Visor de capturas: fundido + zoom | La app, Inicio | 0,25 s + 0,3 s (cierre instantáneo) | Pocas veces |
| 11 | Carrusel de capturas, scroll suave con flechas | La app, Inicio | nativo | Pocas veces |
| 12 | Menú móvil: hamburguesa → X y panel | Todas | 0,15 s y 0,3 s | Varias veces por visita en celular |
| 13 | Encabezado al hacer scroll (fondo y desenfoque) | Todas | 0,3 s | Una vez por página |
| 14 | Cambio de color de enlaces | ~20-26 por página | 0,15 s | Constante |
| 15 | «+» de las preguntas frecuentes gira 45° | 19 en Ayuda | 0,3 s (la respuesta aparece sin animar) | Ocasional |
| 16 | Botón «Tocar para copiar» → «¡Copiado!» | Planes | Cambio de texto instantáneo | Raro |
| 17 | Orientador (3 preguntas + resultado) | Inicio | Sin transición | Una vez por visita |
| 18 | Página «Abriendo…» antes de la app o WhatsApp | Todos los botones de conversión | Sin movimiento; 0,65 s en local, tope 2,2 s | Cada conversión |
| 19 | Scroll suave global | Todas | nativo | Constante |
| — | Sin uso: `Marquee`, `Counter`, `.floaty` | Código muerto | — | Nunca |

## 2. Lo que suma

- Poco movimiento y de buen gusto: cero pulsos, cero rebotes, cero desenfoque en entradas.
- El héroe arranca con CSS puro, sin esperar al JavaScript: primera imagen a 324 ms, sin saltos de diseño (CLS 0).
- Casi todo anima solo opacidad y transform, con una curva propia y suave.
- El vídeo (~1,1 MB) no se carga en celular ni con «reducir movimiento»: ahorro de datos y de batería.
- El paralaje es correcto y el borde de la foto nunca se asoma en pantalla.
- Los gestos con carácter (tarjetas de plan, teléfonos, barrido dorado) están contenidos en 2 páginas y combinan con la marca.

## 3. Lo que resta (por prioridad)

**CRÍTICO**
1. **El texto de la página no existe hasta que carga el JavaScript.** Cada bloque de `Reveal` sale del servidor en opacidad 0. Sin JavaScript queda invisible el 24 % de Inicio, el **66 % de Planes (con los precios)** y el **80 % de Coaching**. En un móvil lento simulado, el primer bloque tarda **2,7 s** en aparecer aunque el texto ya estaba pintado a los 0,7 s. Arreglo respetando la marca: contenido visible por defecto, y la entrada como extra con CSS puro (`animation-timeline: view()` dentro de `@supports`); donde no haya soporte, el texto simplemente está. De paso bajar a 14 px / 0,45 s. (`Reveal.tsx:19-41`, `globals.css:217-225`)

**IMPORTANTE**
2. **El botón principal no reacciona al toque y el hover se queda pegado en celular.** El estado «pulsado» está por debajo del hover en el CSS y pierde: el botón dorado marca −2 px pulsado igual que en reposo. No hay ningún `@media (hover:hover)`: tras tocar una tarjeta de plan queda levantada y con borde dorado, como si estuviera elegida. Arreglo: hovers solo con cursor y «pulsado» (+1 px, escala .97, 90 ms) al final. (`globals.css:162-192,330-378`)
3. **La misma entrada en 64 bloques y 9 listas escalonadas**, incluso títulos y párrafos. Arreglo: 3-4 momentos por página (tarjetas, teléfonos, fotos), texto fijo, escalonado máximo de 3 elementos con 60 ms. (`Reveal.tsx`, `coaching/page.tsx:79,107,130,249`)
4. **«Reducir movimiento» apaga lo principal, pero deja el scroll suave, el visor (fundido + zoom), el menú y el encabezado.** Arreglo: una regla global al final del CSS y `behavior:"auto"` en el JS; el visor solo con fundido de 160 ms. (`globals.css:43,465-485`, `AppGallery.tsx:21-25,180,222`)
5. **El visor de capturas entra con zoom desde el centro, se cierra de golpe (a 30 ms ya no existe) y apila 4 desenfoques a pantalla completa** aunque el fondo ya es 85 % opaco. Arreglo: salida de 160 ms, que crezca desde la miniatura tocada y quitar los desenfoques. (`AppGallery.tsx:169-243`)
6. **El menú móvil anima una propiedad de layout (`max-height`) con `transition: all`** y 49 px muertos que retrasan el cierre. Arreglo: panel sobrepuesto con `clip-path` + opacidad, 220 ms. (`Header.tsx:39,90-121`)

**OPORTUNIDADES (8)**: respuesta de las preguntas frecuentes con fundido de 160 ms; héroe de 6 a 3 escalones; borrar o apuntar `Marquee`/`Counter`/`.floaty`; quitar el ken-burns del vídeo (duplica movimiento); transición entre las preguntas del orientador; el subrayado dorado de «una persona.» que se dibuja una vez (un solo momento firmado, coste cero); línea de avance en «Abriendo…»; barrido dorado con `transform` y sin `will-change` fijo.

## 4. Accesibilidad del movimiento

- Con «reducir movimiento» **sí se apagan**: entradas del héroe y de scroll, vídeo (ni se monta), ken-burns, paralaje, hovers de elevación. Verificado en el navegador.
- **No se apagan**: scroll suave (global, carrusel y 3 llamadas en JS), fundido y zoom del visor, panel del menú, encabezado y la elevación de los botones. Ninguno es grande, por eso es Importante y no Crítico.
- Pausa del vídeo del héroe (WCAG 2.2.2): ya conocida, no se repite. Algo nuevo: encima del vídeo corre un zoom lento infinito que no aporta (oportunidad 4).
- El teclado no anima (Escape y flechas cambian en seco), lo cual es correcto. Menú cerrado con `inert`, foco que sigue a la pregunta del orientador.

## 5. Rendimiento en un Android de gama media

Límite honesto: Chrome sin pantalla no mide la GPU; lo que sigue es CPU a 4× más lenta y lectura de código.
- **Scroll fluido en CPU lenta**: mediana de 16,7 ms por cuadro, 95 % ≤ 22 ms y ningún cuadro > 50 ms en Inicio, La app, Planes y Coaching. El movimiento no es el cuello de botella.
- **El cuello es el JavaScript al cargar**: tarea larga de 378 ms al hidratar Planes (129 ms en Coaching) y, como el texto depende de esa hidratación, el hallazgo crítico 1.
- El paralaje actualiza el estado de React en cada cuadro de scroll (40 de 40): sin tirones medidos, pero lo más barato sería escribir el `transform` directo.
- **Riesgos de GPU sin medir** (por código): el encabezado con desenfoque de 24 px sobre contenido que se desplaza; el visor con 12 px + 3 × 8 px a pantalla completa mientras anima; el barrido dorado que anima `left`; `will-change` permanente en las tarjetas de plan.
- En celular no se carga el vídeo ni se mueve el fondo: lo mejor que tiene la web para un teléfono modesto.

Evidencia: `%TEMP%\avi-r19-mov.json` y `avi-r19-mov2.json` (mediciones), código citado archivo:línea en cada punto.
