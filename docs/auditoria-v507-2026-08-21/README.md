# Auditoría de 4 agentes sobre avi-v507 — 20/21-ago 2026

**Alcance:** los 6 commits `e704c17..4478afd` (v507 «el registro de alimentos baja de sitio»,
el `return` muerto de `nutProtCheck`, el script `medir-descuadre-tapaba.mjs` y el harness
`_verify-chips.mjs`), más la escritura directa en producción sobre la fila del PO.

**Cómo se corrió:** 4 agentes en paralelo sobre el mismo árbol (`4478afd`), uno solo con
navegador porque los harnesses de `scripts/e2e/` comparten los puertos 8829/9349.

| Informe | Quién | Qué atacó | Navegador |
|---|---|---|---|
| [`julian-qa-estatico.md`](julian-qa-estatico.md) | Julián | El diff completo: código huérfano, «puerta cerrada / ventana abierta», si las aserciones nuevas son candados de verdad | No |
| [`lucas-qa-funcional.md`](lucas-qa-funcional.md) | Lucas | 8 harnesses, 8 estados no felices, 5 sabotajes, el coste en toques | **Sí** |
| [`andres-dba.md`](andres-dba.md) | Andrés Q. | La escritura en producción sobre la fila del coach y su radio de impacto | No |
| [`mateo-datos.md`](mateo-datos.md) | Mateo | Reproducir por su cuenta la medición del «1 plan de 10» e intentar tumbarla | No |

⚠️ **Nota de honestidad sobre la corrida:** el primer lanzamiento (20-ago) murió por el tope de
gasto. Julián y Andrés alcanzaron a entregar; **Lucas murió con un error de API y Mateo nunca
reportó**, y los 4 archivos `.output` quedaron en 0 bytes. Los informes de Julián y Andrés se
rescataron del transcripto; Lucas y Mateo se relanzaron el 21-ago sobre el mismo `4478afd`.
Es la razón por la que las fechas de los informes no coinciden.

**Capturas de Lucas:** `C:\Users\KRONOS\Desktop\AVI\capturas-auditoria-v507\` (29 PNG, 7,7 MB).
Fuera del repo a propósito.

---

## Veredicto sobre v507

**Lo que v507 afirma de sí mismo se sostiene medido.** Lucas hizo el recorrido real: las tres
puertas registran de verdad, y el camino más barato («✓ Me lo comí») cuesta **2 toques**, los
mismos que costaba el chip. Los 8 harnesses en verde, sin un rojo que diagnosticar. Donde sí se
paga: anotar algo **fuera del plan** pasó de 1 toque a 2 (o 3).

## Lo que hay que arreglar, por orden

### 🔴 1 · El tour le describe al asesorado una pantalla que ya no existe
`app-6-extra.js:2736-2737`. La entrada `AVI_NEWS` de v505 dice «el agua, los pasos y **tu plato**
bajan a una **tira de tres**» y es la única sin `coach:true`. **Está en producción.**
**Agravante que midió Lucas:** para el tier libre el texto **ya era falso antes de v507** —
desde v504 `conComida=!isFreeClient` le quitaba el plato, y esa entrada es **la única slide** que
ve un libre. Requiere bump de `?v=`/`CACHE_NAME`.

### 🔴 2 · La portada del DÍA 1 sobrevive al primer entreno terminado (PREEXISTENTE)
`app-4`: `renderFirstRun` limpia con `innerHTML=''` pero se la llama en `:964`, **después** de los
`return` de `finishedTrainingToday` (`:923`), descanso (`:945`) y sin-rutinas (`:915`); y
`#cn-firstrun` no está en `_DIA1_OFF`. Medido: 933 chars, `display:block`, 326 px, con la promesa
falsa «lo demás aparece cuando termines este» y el botón **«Empezar mi primer entreno →» vivo**,
encima de «¡Ya entrenaste hoy!». Captura `R1b-primer-entreno-terminado.png`.
**Misma familia que el `return` prematuro de v506 y el D5 de v403.**

### 🔴 3 · El coach editándose desde su panel se borra datos (PREEXISTENTE, no lo causó v507)
`selfClientFromRow` (`avi-core.js:3211`) es una **lista blanca**, `clientToRow` copia tal cual y
`upsertOwn({profile})` **REEMPLAZA** la columna jsonb entera. Medido sobre su perfil real:
**19 claves → 14**, se pierden `deload` (2.373 B), `foodlog` (6.476 B, 2 días de comida
registrada), `foodlogOk`, `painCare` (el dolor de codo del 17-ago) y `tier`.
Asimetría: **«Mi entrenamiento» es seguro** (usa `rowToClient`, que preserva todo); el que pierde
es el **panel del coach**. Propuesta no aplicada: que `selfClientFromRow` arrastre las claves
desconocidas, o que `_persistCoachWrite` **fusione** en vez de reemplazar.

### 🔴 4 · El gate Premium de la puerta nueva no tiene candado — sabotaje VERDE
Quitar `isFreeClient` de `_foodLogDoorHtml` deja `_verify-chips` en **21/21**. Lucas probó que el
sabotaje sí se aplica y sí cambia la conducta (el libre ve «Anotar lo que comí hoy» y al tocarlo
**no pasa nada**). De las tres causas es **test débil**. Atenuante medido: hoy ninguna de las 4
puertas a `openNutritionRoom` es alcanzable por un libre → es defensa en profundidad.
Julián añade que **ningún candado de la puerta corre solo**: `avi.test.js` no la menciona y ni CI
ni el hook tocan `scripts/e2e/`, así que borrar `${_foodLogDoorHtml(c)}` deja **803/803 y 12/12**.

### 🟡 5 · Dos candados que no dicen lo que su nombre dice
- **C11** (`_verify-chips.mjs:245-254`): `chip===false` lo cumple una pantalla vacía. Medido: con
  `renderHabitsCard` sin pintar → 17 rojos y **C11 verde**. Arreglo: añadir `n===2`.
- **C7** (`:271-274`): dos de sus tres cláusulas son inertes con ese fixture (sin kcal registradas,
  `barra` es `'0%'` haya meta o no). Lo único que discrimina es el regex del texto.

### 🟡 6 · Las dos cuentas de sabotajes del commit de v507 están mal
Medido por Lucas: **sabotaje 1 = 5 rojos, no 6** (C8 queda verde: el revert reintroduce el chip vía
`conComida` y al libre le siguen saliendo 2 — Julián también se equivocó aquí).
**Sabotaje 2 = 2 rojos, no 1** (C4-bis **y** C4-ter). Hay que corregir el cuerpo del commit/bitácora.

### 🟡 7 · Limpieza de la bajada
`styles.css:398` (`.hb-chip.f` huérfano) · tres comentarios falsos en `app-5-salud.js`
(`:1455-1457`, `:1466`, `:1320`) · el mensaje de `avi.test.js:10686` · el «(17)» de
`plan-diseno-B-compromiso.md:180` · `_verify-foodlog.mjs:102` (FL1 sigue aceptando `.hb-chip.f`).
Y la rama «sin estimación posible» de «Mi nutrición» **no pinta la puerta** para alguien que sí
puede registrar (hallazgo F de Lucas, exposición baja y sin cuantificar).

---

## Lo que se corrige de lo YA ESCRITO en la bitácora (Mateo)

La medición del «1 de 10» **aguanta**: la reprodujo con script propio, resolvió **24 de 24 filas**,
y probó con una matriz 2×2 que la caída de 6→1 es por **datos** y no por código. Lo que falla es
cómo quedó escrita:

1. **«Se mostró» es más de lo que se midió** — no hay telemetría; solo se sabe que la ficha *habría*
   pintado eso al abrirla, y la única fila afectada es la del propio coach.
2. **Las 6 cifras del 03-ago están fechadas mal**: son del revisor de HOY. Con el código de ese día
   (v436) son **+670 · +1.002 · +470 · +348 · −979 · −1.362**. Nataly cambia **+48%**.
3. **«Al día siguiente quedaba 1» exagera la cola**: por `updatedAt` el 6→4 pasó **27 minutos**
   después de desplegar v435, y quedó en 1 el 5-ago a las 15:20.
4. **No fueron 6 planes reescritos sino 5.** El sexto (Andrés) se re-guardó con los mismos
   1800/160/160/55: **re-guardar no es recalcular**, y por eso es justo el que quedó.

Y un hueco de método que Julián encontró y Mateo verificó por su cuenta: la cabecera de
`medir-descuadre-tapaba.mjs` declara la dirección del anacronismo que **infla** y calla la que
**desinfla** (el guard `banda` es de v493). No mueve el resultado, pero el margen es **una persona**.

---

## Radar para el PO (Mateo)

- 🔴 **Valery, 15 años** — plan de 1.774 kcal escrito el 5-ago contra un gasto de 1.910:
  `menor_bajo_gasto`, gap **−235**, **16 días** avisando sin que nadie actúe. El candado de v485 no
  falló: vive a la salida del generador, y este plan está escrito a mano.
  **Arreglo: «✨ Generar» + «Guardar» en su ficha → 2.009 / 114 P / 278 C / 49 G**, que la deja en
  `ok` con gap 0. Verificado que su factor 1,375 es el correcto: **7 sesiones en tres semanas**.
- 🟡 **Miguel Pulido** — plan sin tocar desde el **27-may**, `proteina_fuera` +59 estable en las 9 fotos.
- 🟡 **El 19-ago solo 2 de los 10 planes estaban `ok`.** Avisar en 8 de 10 fichas es cómo se enseña
  a ignorar el aviso.

---

## Gotchas operativos que dejó la corrida

- `app-5-salud.js` pasó de **LF a CRLF** al restaurarlo con git tras un sabotaje: el patrón de
  sabotaje hay que normalizarlo (es el gotcha del 12-ago, vuelto a pisar).
- La sonda de contraste de `_verify-chips` **no compone el `opacity` de la cadena de padres**. Hoy
  no cambia ninguna cifra (compuesto = 1 en todas), **pero midiendo a los 0 ms de
  `openNutritionRoom` el compuesto es 0 y el ratio real 1,0** — lo único que salva a C4-ter es su
  `sleep(800)`. Es la trampa que el repo ya documentó en v453.
- El respaldo de una escritura directa debe cubrir **la fila entera**, no una columna: las otras 11
  columnas quedaron sin imagen previa con la que comparar.
- `python scripts/hooks/pre-commit` es **Python**: `node scripts/hooks/pre-commit` revienta con
  `SyntaxError` **y devuelve exit 0**.
