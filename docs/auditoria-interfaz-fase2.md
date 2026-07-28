# Auditoría de interfaz — FASE 2: las 12 pantallas

> **Qué es esto.** La FASE 1 estudió a fondo la primera sesión (`estudio-interfaz-primera-sesion.md`).
> Esta es la **auditoría general**: las 6 pestañas del asesorado y los 6 paneles del coach.
> Escrita 2026-07-27. **Todo lo de aquí está MEDIDO**, no opinado: el instrumento es
> `scripts/e2e/_audit-pantallas.mjs`, que abre cada pantalla con datos de forma real y afirma.

---

## 0. Por qué la auditoría empezó por construir un instrumento

La FASE 1 terminó descubriendo que **v403 había roto «Perfil» del asesorado en producción** durante
un día entero, y que el harness que abría esa pantalla era de **solo capturas**: seguía generando
sus PNG de una pantalla rota. Al revisar, **9 de los 13 harnesses `_shot*` estaban igual**.

Así que lo primero fue un recorrido que **afirma**. Mide por pantalla:

| Qué mide | Por qué |
|---|---|
| ¿LANZA? | El bug de v403: una pantalla que revienta en su primera línea |
| ¿PINTA? | Una pantalla viva no está vacía |
| ¿SE SALE? | Desbordamiento horizontal a 390px — mobile-first es innegociable |
| ¿SE PUEDE TOCAR? | Área táctil **efectiva** por hit-testing (no la caja del elemento) |
| ¿ALGUIEN LE ROBA EL TOQUE? | La píldora flotante contra cada control |
| ¿CUÁNTO HAY QUE BAJAR? | Alto del contenido en pantallas de 844px |

**Tres de mis propias mediciones resultaron falsas y hubo que corregirlas antes de concluir nada:**
contar como defecto lo que vive en un carrusel horizontal (`.mquick` es `overflow-x:auto` a
propósito); sumar el alto del botón al alcance medido desde su centro (un botón de 27px daba 53 y
pasaba el filtro); y medir controles pegados al borde de la pantalla, donde los puntos de prueba
caen fuera del viewport y devuelven un falso «no responde». Es la misma lección que dejó el falso
`peso_reps` de la FASE 1: **antes de creerle a una medición, hay que intentar tumbarla.**

---

## 1. La tabla (12 superficies, 390×844)

| Pantalla | Texto | Alto | Pantallas de scroll | Se sale | Toques <36px | Roba toques |
|---|---|---|---|---|---|---|
| Hoy | 453 | 726 px | 1,0 | 0 | 0 ✅ | 0 |
| Rutinas | 390 | 591 px | 0,8 | 0 | 0 ✅ | 0 |
| Mensajes | 208 | 302 px | 0,4 | 0 | 0 ✅ | 0 |
| Progreso | 1362 | 1953 px | 2,7 | 0 | 0 ✅ | 0 |
| Perfil | 1248 | 2356 px | 3,2 | 0 | 1 ⚠️ | 0 |
| Comunidad | 198 | 330 px | 0,5 | 0 | 0 ✅ | 0 |
| Coach · Inicio | 802 | 1525 px | 2,1 | 0 | 0 ✅ | 0 |
| Coach · Asesorados | 459 | 614 px | 0,8 | 0 | 0 ✅ | 0 |
| Coach · Ficha | 1431 | 2186 px | 3,0 | 0 | 0 ✅ | 0 |
| Coach · Plantillas | 201 | 369 px | 0,5 | 0 | 0 ✅ | 0 |
| Coach · Ejercicios | 30756 | **30 752 px** | **42** | 0 | 0 ✅ | 0 |
| Coach · Mensajes | 213 | 262 px | 0,4 | 0 | 0 ✅ | 0 |

(La columna de toques ya refleja las correcciones de este mismo día; **antes de ellas eran 41
controles por debajo del mínimo**.)

**Lo que está sano y no hay que tocar:** ninguna de las 12 lanza, ninguna se queda vacía, nada se
sale del ancho del teléfono, y no hay un solo error JS en todo el recorrido.

---

## 2. Hallazgos

### F1 🔴 La píldora «Instalar app» le robaba el toque a los dos primeros botones de alguien nuevo — CORREGIDO

`#install-banner` vivía en `z-index:8000`. **Todo lo que se abre encima vive entre 700 y 1600**:
tour educativo 800, asistente de datos 900, modales 1000, sala de rutina 1400. O sea que la
píldora flotaba **por encima de todos ellos**, y medido con hit-testing se quedaba con el toque de:

- **«Empezar · 2 min»** — el botón del asistente de datos, lo primero que ve alguien que entra.
- **«Siguiente →»** — el del tour educativo.

Es directamente el embudo de activación: los 8 del gimnasio que nunca completaron un entreno
pasaron por ahí. **Arreglado bajando la píldora a `z-index:690`**, por encima del contenido y de la
barra de pestañas (200) pero por debajo de cualquier overlay, presente o futuro. Un número, no una
regla por caso: mata la clase entera.

### F2 🟠 Los botones pequeños medían 27px de alto — CORREGIDO

La doctrina del proyecto exige **mínimo 36px** para algo que se toca con el dedo. Medido: `.bsm`
daba **27-28px de alto efectivo** y los chips de rango de Progreso, **22px**. Aparecía en 11 de las
12 pantallas: «Entrenar otra vez», «Enviar», «+ Nueva rutina», «Editar», «+ Registrar pago»,
«Suspender», los 12 filtros de músculo…

**Decisión del PO: subirlos en toda la app.** El mínimo se puso en `.btn` (lo hereda `.bsm`), más
`.adv-pill` y `.collapse-more`. **De 41 controles por debajo del mínimo se bajó a 1.**

**La excepción que queda, documentada:** la ✕ de «Eliminar registro de peso» en Perfil. Tiene la
primitiva `.hit40` (que agranda el área sin agrandar el ícono) pero su alcance real medido es
26×32 px porque las filas vecinas interceptan el overlay. Se probó subirla con `z-index` y **no
cambió nada**, así que el intento se revirtió en vez de dejar código que no hace nada. Es una ✕ de
borrado en una lista, con su confirmación; queda anotada, no maquillada.

### F3 🟠 La Biblioteca de Ejercicios: 42 pantallas de scroll y sin buscador — CORREGIDO

212 ejercicios pintados de una sola vez, **cada uno con su foto**, para un total de **30 752 px**.
Y no había forma de buscar por nombre: solo filtros por músculo y bajar a pulso. `#p-clients` sí
tiene buscador desde hace tiempo; esta pantalla no. **Y el PO va a repoblarla**, así que empeora.

**Decisión del PO: buscador + pintar de a poco.** `searchExercises(lib, texto, músculo)` pura en
avi-core — busca por nombre, etiqueta de músculo y tipo, **sin distinguir tildes** («biceps»
encuentra «Bíceps», que es como se teclea de afán) y por palabras sueltas («press banca» encuentra
«Press de Banca con Barra»). La vista pinta 30 y ofrece «Ver 182 más (30 de 212)». **El alto pasó
de 30 752 px a 4 308 px.**

### F4 ✅ CERRADO (2026-07-28) — y **tres de las cuatro no estaban flacas**

**Lo que decía esta sección:** Mensajes del asesorado (0,4 pantallas), Comunidad (0,5), Plantillas
del coach (0,5) y Mensajes del coach (0,4) estaban medio vacías y había que decidir qué hacer.

**Lo que apareció al ir a arreglarlas: la medición de tres de ellas era un espejismo del
harness**, no de la app. Van con nombre propio porque es la MISMA clase de error que ya nos costó
dos falsos hallazgos en la FASE 1:

| Pantalla | Por qué medía 0,5 | Veredicto |
|---|---|---|
| Comunidad | El recorrido corre **sin red**: lo que se midió fue el estado «Conéctate para ver a tu gente», no la pantalla | **Falso.** No se toca |
| Mensajes del coach | El fixture tenía **2 asesorados**. En producción hay 23, con 12 conversaciones abiertas | **Falso** como problema de alto |
| Plantillas | El fixture tenía 2 plantillas; el coach tiene 4 | **Falso** como problema de alto, pero apareció otro defecto REAL (abajo) |
| Mensajes del asesorado | **Verdadero.** Y peor de lo medido | **Arreglado** |

**El único defecto de alto real — el chat del asesorado.** La conversación vivía en una cajita de
380px arriba y el campo de escribir flotaba a media pantalla con el 60% de abajo vacío. Y no es un
caso de borde: contra el backup del 2026-07-27, **11 de los 23 no han cruzado NUNCA un mensaje** y
la mediana de los otros son **5**. Casi todos ven la pantalla flaca. Ahora la tarjeta se estira, el
hilo scrollea por dentro, los mensajes se apoyan abajo y el compositor queda al pie, como en
cualquier chat. **0,4 → 0,9 pantallas.**

**Lo que sí valía la pena de las otras dos:**
- **Bandeja del coach:** el hueco no se rellenó con decoración sino con **quién no ha recibido
  nunca un mensaje** (11 de 23), a un toque de escribirle. La pantalla gana razón de ser y ataca
  el problema nº1 de la app, que es que la gente no arranca.
- **Plantillas:** el alto era falso pero al mirar la fila apareció otro defecto: con los nombres
  REALES del coach («Brazo y abdomen (plantilla)») al título le quedaba una columna de ~140px y
  salía partido en tres renglones. Los botones bajaron a su propia línea.

**Y el arreglo trajo un defecto propio, cazado por hit-testing:** al bajar el compositor al pie,
el chat pasó a vivir en la franja de la píldora «Instalar app», y **con letra grande la píldora se
paraba encima del campo de escribir** — tocar para escribirle al coach abría el instalador. Es
exactamente F1 otra vez. La lista de pantallas donde la píldora se aparta (`_PILL_ZONAS`) se
escribió cuando el compositor estaba a media pantalla; **al mover un control a la zona de abajo
hay que revisar esa lista.** Harness: `scripts/e2e/_verify-f4-chat.mjs` (17 aserciones, 4 estados).

### F5 ✅ CERRADO (2026-07-28) — los diez harnesses de captura ya muerden

Era la deuda que dejó pasar el bug de v403: la pestaña «Perfil» estuvo ROTA en producción un día
entero mientras su harness seguía generando PNG **y saliendo con código 0**. Diez estaban igual.

**Los dientes viven en UN sitio, no repetidos diez veces:** `scripts/e2e/_afirma.mjs`. Exige lo
mínimo que le faltaba a todos — que el montaje no devuelva error, que la pantalla exista, esté
visible, **pinte contenido real** y no se salga del ancho; que las capturas no sean PNG vacíos; y
que **cualquier excepción no capturada haga fallar la corrida**. Antes terminaban en éxito pasara
lo que pasara.

| Harness | Qué exige ahora |
|---|---|
| `_shot-routines` · `_shot-history` · `_shot-finish` | la pantalla arranca y pinta (`#cn-routines`, `#cn-history`, `#workout-finish`) |
| `_shots-modals` | cada uno de los 4 modales **abre de verdad** y pinta, en los dos temas |
| `_shots-login` · `_shot-design-audit` | la bienvenida y el formulario existen; el panel del coach se monta |
| `_shots-rooms` | las 7 habitaciones abren — antes renombraba el PNG a `_FAIL` y **salía en verde igual** |
| `_shot-nutri` | la habitación de nutrición abre y trae la guía |
| `_shot-f4` · `_shot-f5` | el guiado, el home del coach y la ficha arrancan (`_shot-f5` es de escritorio: se le exige su ancho, 1180px, no el del teléfono) |

**Probado con sabotaje, no de palabra:** con `renderClientAllRoutines` lanzando a propósito,
`_shot-routines` pasó de «✅ + PNG bonito» a **exit 1** señalando que la pantalla pintó 17
caracteres. Es exactamente el escenario de v403.

**CANDADO en la suite** (`avi.test.js`, sección estática): si mañana nace un `_shot*` que no
importe `_afirma.mjs` ni tenga salida propia distinta de cero, la suite lo caza. Verificado
creando un harness de mentira: la suite falló y lo nombró.

---

## 3. Lo que esta auditoría NO responde

- **Si la app se ve bien.** Esto mide estructura y ergonomía, no estética. Las capturas en claro y
  oscuro de las 12 quedan en `Temp/avi-fase2` para mirarlas.
- **Cómo se comporta en un celular real de gama baja.** Todo está medido en Chrome headless. Que la
  biblioteca haya bajado de 30 752 a 4 308 px debería notarse, pero no está medido en un aparato.
- **Contraste y lectura con letra grande.** El recorrido no mide ratio de contraste ni prueba
  `data-fs="xl"` en las 12 pantallas. Candidato claro para una FASE 3.


---

## FASE 3 — ¿SE LEE? (2026-07-28)

Lo que la FASE 2 dejó dicho que NO respondía: **contraste y letra grande**. Le importa a la mitad
del gimnasio — quien entrena de noche mirando el celular con el brazo estirado, y quien tiene el
teléfono con la letra subida porque no ve de cerca. Harness: `scripts/e2e/_audit-lectura.mjs`
(las 12 superficies × 2 temas, cálculo WCAG 2.1 sobre el color REALMENTE pintado).

**La sonda se validó antes de creerle**: texto blanco sobre negro tiene que dar 21 y el gris
límite `#767676` sobre blanco tiene que dar 4.54. Da exactamente eso.

### El hallazgo: un token con dos oficios que se pisan

Los colores semánticos (`--or` naranja, `--bl` azul, `--rd` rojo) hacen dos trabajos a la vez:
pintan **texto** sobre un tinte claro y **rellenan** botones y badges. En tema oscuro se aclaran
para poder leerse como texto… y entonces la letra blanca encima deja de leerse.

| Dónde | Antes | Ahora |
|---|---|---|
| «Entrenar otra vez», «+ Rutina», «WhatsApp» (botón naranja) | **2.19:1** | 5.5–7.8:1 |
| «+1» del vaso de agua (botón azul) | **2.23:1** | 7.7:1 |
| Badge de mensajes sin leer (rojo, 9px) | 4.17:1 | 6.2:1 |
| Etiquetas de estado del asesorado, macros, deltas de peso | 2.4–2.9:1 | ≥4.5:1 |
| Etiqueta de series con el color del músculo | 2.14–2.84:1 (7 de 10 colores) | ≥6:1 |

**La regla que queda escrita en el CSS:** los tokens de color son para **rellenos y bordes**; para
**texto** va su variante legible (`--gt` ya existía y por eso el verde era el único que pasaba;
ahora existen `--ort`, `--blt`, `--rdt`), y **todo relleno declara su tinta** (`--on-or`,
`--on-bl`, `--on-rd`). Los colores de músculo conservan su identidad: el tinte y el borde siguen
siendo el color del código, solo el **texto** se oscurece (`mcInk`, función pura con tests).

### Letra grande (`data-fs="xl"`)

- **Texto cortado: 0.** Nada queda partido por un alto fijo.
- **Desbordamiento: 16 → 0.** La ficha del asesorado se iba a 406px en un teléfono de 390 por el
  reventón clásico de CSS Grid (una columna `1fr` tiene `min-width:auto`, así que un nombre largo
  la hace crecer). `.g2>*{min-width:0}` lo cierra sin tocar el diseño de dos columnas.
- Quedan **3 controles por debajo de 36px** con letra grande, en «Perfil» (los mismos que ya
  reportaba la FASE 2).

### Marcador

| | Antes | Ahora |
|---|---|---|
| Textos por debajo del mínimo WCAG | 96 | **45** |
| El peor contraste de la app | **2.19:1** | **3.04:1** |
| Se sale de la pantalla con letra grande | 16 | **0** |

**Lo que NO se hizo, a propósito:** los 45 que quedan están entre 3.0 y 4.5 y son casi todos
**texto secundario** (metadatos en gris `--t3`, subtítulos). Bajarlos a 4.5 es cambiar el gris de
toda la app: es una decisión de DISEÑO del PO, no un defecto que se arregle de tapadillo. El
harness falla por debajo de 3:1 —lo indefendible— y reporta el resto como número.
