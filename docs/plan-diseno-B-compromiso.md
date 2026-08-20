# PLAN VIVO — DIRECCIÓN «B · EL COMPROMISO»

> Escrito el 2026-08-19 al cortar la sesión. **✅ CERRADO el 2026-08-20: las tres piezas están
> construidas y en producción** (v503 héroe · v504 tira de chips · v505 tope de tarjetas), más
> v506 (los 21 gates muertos de «Hoy» en 0). Árbol limpio en `5d2193b`, `_prodcheck 506` verde.
> **Lo de abajo se conserva como está** —es el razonamiento con el que se construyó— y al final,
> en §8, está lo que CAMBIÓ respecto a este plan y lo que queda abierto. Empezar por ahí.

---

## 0 · LA DECISIÓN QUE YA TOMÓ EL PO

De cuatro columnas puestas lado a lado (A = estado actual, B, C, D), **el PO eligió B**.

> **B · «El Compromiso» — el día tiene UNA promesa.** El entreno del día ocupa la primera
> pantalla entera como superficie esmeralda; el resto del día cede a una tira de chips.

Catálogo navegable y capturas: `Desktop/AVI/DISENO-2026-08-19/preview-direcciones.html`
(+ `capturas/`, + los dos informes de origen). **Ábrelo antes de escribir una línea**: la
descripción en prosa no reemplaza ver las cuatro columnas juntas.

---

## 1 · POR QUÉ B, CON LA MEDICIÓN DELANTE

No se eligió por gusto. Se midió sobre los **22 asesorados reales** (backup local del 19-ago,
evaluando las MISMAS funciones puras de `avi-core.js` que corre la app):

| Tarjetas simultáneas en «Hoy» | Personas |
|---|---|
| **6** | **8** |
| 5 | 3 |
| 4 | 4 |
| 1 (modo día 1) | 7 |

- **Techo estable en 6** — barrido de 14 días con el historial RECORTADO a cada fecha (nadie ve
  el futuro). Nunca subió de 6 en dos semanas.
- **Los lunes bajan a 5 y nadie llega a 6**, porque «el día que se corrió» no puede dispararse un
  lunes (no hay días pasados en la semana). De martes a domingo vuelve a 6.
- **A quien le cae son las 8 que MÁS entrenan** (Astrid, Kathe, Luz, Samuel, Nataly, Claudia,
  Miguel, Valery). No es un problema de los que no usan la app: es de las mejores.
- **Tres tarjetas no son medibles desde la nube** (aviso de push, novedades, puerta a Comunidad):
  viven en `localStorage`. Solo **SUMAN**. Los silenciados locales solo restan. Así que **6 es el
  piso de lo peor, no el techo.**

Script de la medición: `scratchpad/medir/tarjetas-hoy.mjs` (efímero — si se necesita otra vez,
está descrito arriba con el detalle suficiente para reescribirlo en 20 líneas).

⚠️ **Corrección que hay que arrastrar:** es FALSO que «no haya código que arbitre». `_todayOrder`
(app-4-entreno.js:679) SÍ ordena los 14 bloques y cambia el orden según sea día de entreno o de
descanso; el modo **día 1** apaga once tarjetas de golpe; y hay exclusión por pares (la puerta de
Comunidad le cede el turno al banner de compartir). **Lo que NO existe es un tope de CANTIDAD en
un día normal.** Esa es la frase correcta.

---

## 2 · LO QUE B PIDE, MIRANDO LA CAPTURA

Sobre `#cn-today`, de arriba abajo:

1. **Héroe esmeralda a sangre** (`border-radius:0 0 26px 26px`) que FUNDE tres cosas que hoy son
   bloques separados: el saludo, el chip de racha y la tarjeta de arranque del entreno.
2. Dentro del héroe: rótulo `↔ LUNES · TU ENTRENO DE HOY`, **nombre de la rutina a 34 px**,
   meta (`4 ejercicios · ~48 min · te toma menos de una hora`), y la **lista numerada 01-04** con
   sets×reps, con entrada escalonada de 40/90/140/190 ms.
3. **CTA único brillante** `Empezar mi entreno` (min-height 56, `--accent3` sobre esmeralda) y
   debajo un enlace secundario subrayado `Hoy prefiero otra rutina`.
4. **`LO DEMÁS DEL DÍA`** → agua / pasos / plato bajan a una **tira de 3 chips** con barra de 4 px.
5. Lo que queda (rápidos, nota del coach) → **filas delgadas de una línea con chevron**, borde
   punteado, sin peso visual.

---

## 3 · LO QUE YA ESTÁ A FAVOR (medido, no supuesto)

- 🟢 **`--emerald-hdr` YA EXISTE** en `styles.css:34` con el valor exacto que usa el preview
  (`linear-gradient(115deg,#0A1A12,#0E3A2C 58%,#10593F)`). Hoy lo usan `.cntopbar` y la línea 200.
  Está declarado UNA vez y los bloques oscuros no lo pisan — correcto, es una superficie oscura
  fija en los dos temas. **B no inventa la paleta: usa la que la app ya tiene.**
- 🟢 **`--accent3:#10E0A0` ya existe** en los tres bloques `:root`.
- 🟢 El preview **no trae dependencias**: HTML+CSS vanilla, tokens del sistema, `--ease-out`/`--dur`,
  cero `transition:all`.

**Y resuelve solo la objeción de Isabella al `#10E0A0`:** ella lo marcó por ilegible en tema claro
(medido por mí: **1,72:1 sobre blanco**). En B ese verde vive ÚNICAMENTE sobre el héroe oscuro,
donde mide **10,10:1**. Es el uso correcto del color, no el prohibido. **No extenderlo fuera del
héroe.**

**Falta declarar:** `--on-emerald` (tinta sobre esmeralda) no existe en `styles.css`. Mirar primero
cómo colorea su texto `.cntopbar` y reutilizar antes que inventar.

---

## 4 · LOS CANDADOS QUE APLICAN (leer ANTES de tocar `renderClientToday`)

Esta es zona caliente y ya costó rechazos. Todo esto es de `GOTCHAS VIGENTES` y aplica directo:

1. 🔴 **Nada que colapse, funda o tape el entreno puede ignorar una sesión EN CURSO.** Es el bug
   de v366 que Fable rechazó y que volvió en v447. El héroe DEBE preguntar por sesión parcial
   antes de pintarse como «Empezar mi entreno», o pisará a quien está a mitad de rutina.
2. 🔴 **El progreso se lee de las BANDERAS REALES** (`done_<rid>_<ei>_<si>`), nunca de un espejo.
3. 🔴 **El modo DÍA 1 manda sobre todo** (`firstSessionMode`): apaga once bloques y tiene su propia
   portada `#cn-firstrun`. El héroe de B y la portada del día 1 **no pueden coexistir** — decidir
   explícitamente cuál gana (mi apuesta: la portada del día 1 se absorbe DENTRO del héroe de B,
   pero eso es diseño nuevo, no port).
4. 🔴 **Estados no felices obligatorios:** día de descanso · sin rutinas · «ya entrenaste hoy»
   (`.trained-card`) · rutina sin ejercicios. El héroe asume que hay rutina con 4 ejercicios.
5. 🔴 **Letra grande (`data-fs="xl"`)**: el héroe lleva 34 px de titular. Con el zoom del sistema
   esto es exactamente el defecto de v452 (algo que crece y se sale sin scroll propio). Probar.
6. 🔴 **360 px** y táctil ≥36 px. El CTA cumple; la tira de 3 chips a 360 hay que medirla.
7. ⚠️ **`aviIcon` cae en ✨ si el nombre no existe y NO da error.** Cualquier icono nuevo del héroe
   se verifica contra `AVI_ICONS` (ya hay check estático).
8. ⚠️ El héroe va a sangre y `.cntopbar` es `position:sticky` con el MISMO esmeralda. Ojo a que no
   se lean como una sola mancha sin separación.

**Harnesses que TIENEN que seguir verdes** (son los que cubren esta pantalla):
`_verify-firstrun` · `_shot-trained` · `_fable-repro-midsession` · `_verify-missday` ·
`_verify-water` · `_audit-pantallas` · `_verify-estudio-defectos` (hit-testing de la píldora).

---

## 5 · EL TROCEADO PROPUESTO (no mezclar en un commit)

- **v503 · EL HÉROE.** Fundir saludo + racha + arranque del entreno en la superficie esmeralda,
  con lista numerada y CTA único. Es el 80% del efecto y lo que la medición exige.
- **v504 · LA TIRA DE 3 CHIPS.** Agua / pasos / plato dejan de ser tarjeta y pasan a chips.
- **v505 · LAS FILAS DELGADAS + EL TOPE.** Lo secundario a una línea con chevron, y **la regla que
  hoy no existe: un máximo de cuántas tarjetas pueden salir a la vez.** Sin esto, B se degrada
  sola en cuanto vuelvan a apilarse seis.

---

## 6 · LO QUE QUEDÓ ABIERTO, APARTE DE B

- 🟡 **«El día que se corrió» se dispara en 15 de 15** de los que entrenan. Verificado contra datos
  reales: **la tarjeta dice la verdad** (Astrid entrenó el martes y se saltó el lunes; Samuel se
  saltó lunes y martes). Pero algo que le sale a todo el mundo cada semana deja de ser aviso y pasa
  a ser decoración — misma familia que el detector de estancamiento de v433. **Mirarlo aparte.**
- 🟡 **`BRAND.md` está caducado y ya hizo daño**: dice que el verde primario es `#2D6A4F` —el valor
  que ya sabemos equivocado— y ese verde **sigue vivo en 7 sitios** de `styles.css`. También
  nombra mal al PO. Media hora, y evita que la próxima sesión construya sobre el color malo.
- 🟡 **`--t2` vs `--t3` = 1,14:1** (medido: `#636363` vs `#6C6C6C`, 9 unidades de diferencia). Tres
  niveles de texto declarados, **dos que el ojo distingue**. No es accesibilidad (6,01 y 5,25 sobre
  blanco): es una jerarquía que existe en el código y no en la pantalla.
- 🟡 **Cero tokens de espaciado** y la escala tipográfica usada en **10 de 1.139** `font-size`
  (verificado por mí, no heredado del informe). Sin esto toda limpieza se revierte sola.
- 🟡 **Emojis → iconos SOLO en títulos, nunca barrido masivo** (el emoji se queda donde es
  contenido: caritas de ánimo, icono de ejercicio). Razón dura: el fallback silencioso a ✨.
- 🟢 **Diego no alcanzó a escribir `03-direcciones-diego.md`** (se cayó por 529 al final). El HTML
  y las capturas SÍ quedaron completos, y el HTML trae al final la tabla de coste por dirección.

---

## 7 · CIFRAS VERIFICADAS POR MÍ vs REPORTADAS

El informe de Isabella es bueno, pero **sus decimales no se heredan** (regla del repo):

| Ella reportó | Yo medí | Veredicto |
|---|---|---|
| Escala tipográfica: 10 de 1.122 | **10 de 1.139** | ✅ |
| Cero tokens de espaciado | cero | ✅ |
| `--t2` vs `--t3` = 1,14:1 | **1,14:1** | ✅ exacto |
| `#10E0A0` en claro = 1,56:1 | **1,72:1** | dirección sí, cifra no |
| `--g2` en claro = 2,39:1 | **2,64:1 sobre blanco** | dirección sí, cifra no |
| 858 emojis DOM vs 151 iconos | **1.174 vs 101** (estático) | mismo orden, método distinto |

El conteo de emojis por DOM (el suyo) es el que vale para decidir; el estático (el mío) infla
porque cuenta los que son FALLBACK de `aviIcon` y nunca se pintan. **Al retomar, si esa cifra va a
justificar trabajo, medirla en el DOM.**


---

## 8 · CIERRE — QUÉ SE CONSTRUYÓ, QUÉ CAMBIÓ Y QUÉ QUEDA (2026-08-20)

### Lo que está en producción
| | qué | dónde vive |
|---|---|---|
| **v503** | **El héroe.** Saludo + racha + arranque del entreno fundidos en la superficie esmeralda a sangre, lista numerada y CTA único. | `renderTodayHead(client, heroRoutine)` + `_todayHeroHTML` (app-4) · `todayHeroModel`/`exDoseShort`/`heroTitleSize` (avi-core) · `.tod-hero*` (styles) · `_verify-hero.mjs` (20) |
| **v504** | **La tira de 3 chips.** Agua/pasos/plato de una línea; el bloque completo a un toque y se queda abierto. | `_habitStripHtml`/`habitsToggle` (app-5) · `habitPct` (avi-core) · `.hb-strip`/`.hb-chip*` · `_verify-chips.mjs` (17) |
| **v505** | **El tope.** Máximo 2 avisos a la vez por prioridad; lo que no cabe baja a `#cn-more` y vuelve mañana. | `_applyTodayCap` (app-4, al final de `_todayOrder`) · `todayCardPlan`/`TODAY_CARD_PRIORITY`/`TODAY_MAX_CARDS` (avi-core) · `.cap-off`/`.tod-more` · `_verify-tope.mjs` (14) |
| **v506** | Los 21 gates muertos de «Hoy» en 0 — y **3 de los 18 eran defectos reales**. | ver bitácora |

### Lo que CAMBIÓ respecto a lo que decía este plan
1. **La maqueta se dibujó con datos cómodos.** 4 ejercicios y un nombre de 15 letras; los reales
   son 6 de moda, 35 rutinas con 7+ y nombres de 40 caracteres. El titular se escala por longitud,
   la lista topa en 6 y lo que sobra se DICE. **De una maqueta se hereda la intención, no las medidas.**
2. **Los chips NO son meros indicadores.** Medido: agua 8 personas/71 días · pasos 8/45 · registro
   de comida 5/7. El vaso de agua es UN toque y es lo más usado, así que cada chip conserva la
   acción de SU hábito aunque los tres no se comporten igual.
3. **El §3 decía que el `#10E0A0` mide 10,10:1 sobre el héroe.** Eso es contra el extremo OSCURO
   del degradado; contra el más claro mide **4,83**. Pasa AA igual, pero el peor caso es el que vale.
4. **El tope apaga con clase propia (`.cap-off`), no con `style.display`** — el modo día 1 gestiona
   el display de esos mismos contenedores y los dos mecanismos se tapaban (lo delató un sabotaje verde).
5. **El número del tope (2) no lo eligió el dato:** la curva no tiene codo (150-190 px por aviso).
   Lo elige el criterio de producto y la curva está escrita al lado de la constante para moverlo.

### Lo que queda ABIERTO
- 🟡 **`#cn-meals` repite el plato** justo debajo de su propio chip. No es ruido (es el PLAN del día
  contra el REGISTRO), pero es apilamiento. **Decisión de producto del PO:** cuánto del plan de
  comida quiere ver en «Hoy».
- 🍽️ **El registro de alimentos no lo usa nadie** (5 personas, 7 días, ninguna desde el 13-ago).
  Siete versiones de trabajo. Decisión del PO: empujarlo o bajarle el sitio.
- ✅ **CERRADO el 2026-08-20 — «cuántos planes reales tenían el aviso equivocado»: 1 de 10, y es el
  del propio coach.** `scripts/medir-descuadre-tapaba.mjs` (read-only, sobre los 30 backups, con las
  funciones puras de la app). En los 7 backups de la ventana viva del defecto (v435 04-ago → v506
  19-ago) el aviso equivocado cayó siempre en la misma ficha: **Andrés, «ajusta el titular, 25 kcal»
  tapando −1.418 kcal de desviación (57×)**. 💎 **Una foto de hoy habría contestado mal**: el caso de
  Luz que motivó v506 ya no está en el backup del 19-ago porque su plan se reescribió el 04-ago. La
  serie enseña que el día que nació la tarjeta había **6 descuadrados y los 6 tapaban algo**, y que
  **al día siguiente quedaba 1** — el coach corrigió esos 6 planes en 24-48 h. Detalle en la bitácora.
- 🟡 **`_prodcheck` puede dar un rojo falso** justo tras desplegar (espera a `initPWA`, que lo define
  app-1, y luego pregunta por `renderClientToday`, que vive en app-4). Debería esperar al ÚLTIMO
  módulo. Pasó con v505: rojo a los 80 s, verde en las cinco corridas siguientes.
- 🟡 **`BRAND.md` sigue diciendo que el verde primario es `#2D6A4F`**, que ya se sabe falso.
- 🔴 **Fable no ha verificado nada desde v386** (ahora v506).
