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

### F4 🟡 Cuatro pantallas casi vacías — SIN TOCAR, para decidir

Mensajes del asesorado (0,4 pantallas), Comunidad (0,5), Plantillas del coach (0,5) y Mensajes del
coach (0,4). No están rotas: están **flacas**. Media pantalla de contenido y media de vacío. No se
tocó nada porque no es un defecto, es una decisión de producto: o se les da más razón de ser, o se
acepta que son pantallas de paso.

### F5 🟡 Nueve harnesses de captura sin aserciones — PARCIALMENTE CERRADO

Es la deuda que dejó pasar el bug de v403. `_shot-profile` ya afirma (FASE 1) y este recorrido
cubre las 12 pantallas de una. Siguen sin dientes: `_shot-design-audit`, `_shot-f4`, `_shot-f5`,
`_shot-finish`, `_shot-history`, `_shot-nutri`, `_shot-routines`, `_shots-login`, `_shots-modals`,
`_shots-rooms`. **Regla adoptada: un harness que abre una pantalla tiene que exigir que arranque.**

---

## 3. Lo que esta auditoría NO responde

- **Si la app se ve bien.** Esto mide estructura y ergonomía, no estética. Las capturas en claro y
  oscuro de las 12 quedan en `Temp/avi-fase2` para mirarlas.
- **Cómo se comporta en un celular real de gama baja.** Todo está medido en Chrome headless. Que la
  biblioteca haya bajado de 30 752 a 4 308 px debería notarse, pero no está medido en un aparato.
- **Contraste y lectura con letra grande.** El recorrido no mide ratio de contraste ni prueba
  `data-fs="xl"` en las 12 pantallas. Candidato claro para una FASE 3.
