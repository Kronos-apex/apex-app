# AUDITORÍA `e704c17..4478afd` — Julián (QA estático, sin navegador)

**Integridad de lo leído:** árbol limpio en `4478afd` antes y después; `git hash-object app-5-salud.js` = `dba9f3c…` = `HEAD:app-5-salud.js`. Nada de lo que reporto salió de un archivo saboteado por Lucas.

---

## 🔴 1 · La ventana que quedó abierta es la que LEE el asesorado: `AVI_NEWS` v505 sigue diciendo «tira de tres»

**`app-6-extra.js:2736` y `:2737`**

```
d: '…El agua, los pasos y tu plato bajan a una tira de tres…'
steps[2]: 'Abajo, la tira de tres: toca el agua para sumar un vaso, igual que siempre'
```

- Es la entrada **más nueva** del catálogo, entra en el tope de 3 de `newsToShow` y es **la única sin `coach:true`** (a propósito, «la pantalla cambió para todos»). O sea: el tour se abre a pantalla completa y le describe al asesorado una tira que **ya no existe**, y le manda a buscar su plato ahí.
- v507 tampoco añadió entrada propia, así que a las 5 personas que sí usaban el registro se les fue el chip **sin una línea que lo explique** — la regla de v434 («el usuario tiene que saber por qué su plan cambió») y la clase de v437/v491 (el número cambia, el rótulo se queda).
- **Cómo lo comprobé:** grep de `tira de tres` sobre los 7 módulos + lectura del bloque `AVI_NEWS` completo; v505 es la primera entrada del array y `newsToShow` topa en 3 (v505/v479/v478).
- **Está en producción** (`?v=507`).

---

## 🟡 2 · La puerta nueva no tiene ningún candado que corra solo

**`app-5-salud.js:587-593` (`_foodLogDoorHtml`) · `scripts/e2e/_verify-chips.mjs:231,236`**

- El único candado de la puerta de «Mi nutrición» es **C4-bis/C4-ter, un harness de navegador**. `.github/workflows/ci.yml` corre `node avi.test.js` + `scripts/hooks/pre-commit`, y **ninguno de los dos toca `scripts/e2e/`**. `grep -rn "_foodLogDoorHtml" avi.test.js` → **0 resultados**.
- Contraste con el gate hermano: el bloque del detalle **sí** tiene check estático (`avi.test.js:5029-5031` afirma `conComida` y `${conComida?_foodLogBlockHtml(client):''}`). La puerta nueva no.
- Consecuencia concreta: borrar la línea `${_foodLogDoorHtml(c)}` de `openNutritionRoom` deja **suite 803/803 y hook 12/12 en verde**, y el registro se queda solo dentro de un detalle plegado — que es exactamente lo que el commit dice que no quiere («sería esconderlo»).
- **Mitigación parcial que sí existe** (no la vi declarada en el commit): `_verify-foodlog.mjs:543-553` (LM5) abre la habitación a 360 px con `data-fs=xl` y mide desborde de `#nutroom-body`, así que la puerta **sí** queda cubierta contra desborde en letra grande.

**Sub-hallazgo del mismo sitio:** el gate Premium `if(isFreeClient(c))return ''` de `app-5-salud.js:589` **no tiene control en ningún lado**. C8 solo prueba el tier libre en el detalle de hábitos, no en la habitación de nutrición. Saboteando esa línea, todo sigue verde. (Impacto real bajo: `openFoodLogRoom` tiene su propio gate y la habitación de nutrición ya es Premium — pero es una guarda sin prueba.)

---

## 🟡 3 · C11 lo puede satisfacer un defecto: «no hay chip» y «no hay tira» dan lo mismo

**`scripts/e2e/_verify-chips.mjs:245-254`**

```js
await montar();
const platos = …{ chip:!!qs('#cn-habits .hb-strip .hb-chip.f'), plan:…, kcal:… }
check('C11 … el plato sale UNA sola vez', platos.chip===false && platos.plan===true && platos.kcal!==null)
```

Dos problemas, en orden de peso:

1. **`chip===false` se cumple igual si `#cn-habits` no pintó nada.** C11 hace su propio `montar()` y no vuelve a afirmar que la tira existe. Si `renderHabitsCard` dejara de pintar, C11 sale **verde**. C4 no tiene este agujero porque además exige `hayMas` (el «+» del detalle), que obliga a que `#cn-habits` haya renderizado; C11 sí lo tiene. **El arreglo cuesta una condición: añadir `n===2` al mismo objeto.**
2. **El título promete más de lo que mide.** «el plato sale UNA sola vez en Hoy» se afirma comprobando *un* chip concreto y *una* tarjeta concreta. Una tercera superficie del plato (héroe, aviso, fila nueva) lo dejaría en verde. Hoy es correcto porque solo hay dos candidatos, pero el nombre invita a confiar en algo que el check no cubre.

---

## 🟡 4 · C7: dos de sus tres cláusulas son inertes con ese fixture

**`scripts/e2e/_verify-chips.mjs:271-274`**

```js
check('C7 …', !plato.err && plato.cumplido===false && plato.barra==='0%' && !/te toca entre/i.test(plato.sub))
```

El fixture **no registra ni un alimento**, así que `pr.kcal.hecho = 0` y `_hbPct(0, meta).pct = 0` **haya meta o no**. Con el defecto puesto (la fila se inventa una meta) `barra` sigue siendo `'0%'` y `cumplido` sigue siendo `false` (`band.estado='bajo'`). **Lo único que discrimina es el regex del texto.** Las otras dos cláusulas dan sensación de rigor sin aportarla. Para que muerdan hace falta un fixture con kcal registradas.

C7-bis (el control) sí está bien montado y sí discrimina.

---

## 🟡 5 · Dependencia de efectos secundarios entre checks — frágil, pero **ruidosa**, no silenciosa

Trazado completo del estado compartido en `_verify-chips.mjs`:

- **C6 (`:150-172`) y C5 (`:175-180`) dependen de que C3 (`:134`) haya hecho clic en el chip de pasos**, que es lo que abre el detalle; ese estado se persiste en `localStorage['ax_hbopen_chips']`. Ninguno de los dos hace `montar()` intermedio.
- **Lo que salva el harness:** `MONTAR` (`:69`) borra `/^ax_hbopen_/` en cada montaje, así que cada bloque que sí re-monta arranca cerrado; y si se reordenaran, la sonda de C6 devuelve `{err:'faltan elementos'}` y C5 lee `detalle===false` → **rojo**, nunca verde silencioso.
- Nota: C4 (`:196`) usa `habitsToggle()` incondicional mientras C7/C8/C10 usan `abrirDetalle()` (condicional). La asimetría solo es segura porque C4 va inmediatamente después de un `montar()`. Es un acoplamiento no declarado.

Veredicto: **no lo cuento como defecto**, pero es la clase que se rompe al insertar un check en medio.

---

## 🟢 6 · El `return` muerto de `a9cabba`: confirmado inalcanzable, no se llevó nada

`avi-core.js` — `nutProtCheck` termina en `return { g, objetivo, gramos, dosis, doctrina, dir };` y la línea borrada iba **después**, en el mismo bloque, sin `if` ni `try` de por medio. Sintácticamente inalcanzable. Además citaba `gap, actual, base, riesgo, rotulo, mismatch`, que **no existen en ese ámbito** (verificado leyendo la función completa): si alguna vez se hubiera alcanzado, era `ReferenceError`. Ningún llamador dependía de esos campos (la forma de retorno no cambió). Suite idéntica: **803/803**.

---

## 🟢 7 · `scripts/medir-descuadre-tapaba.mjs` — la lógica es correcta; la cabecera declara **una** dirección de anacronismo y omite la otra

**Reproducción de las dos ramas de `renderNutReviewCard`:** la comparé línea a línea contra `app-3-coach.js:1634+` y contra la versión pre-v506 (`git show 5d2193b^`). `banda`, `_desfase` (mismo `NUT_KCAL_MISMATCH`, mismo `nutMacroKcal`), `hayReview` y `tapado = desfase && hayReview` **coinciden**. Corrí el script: sale limpio y reproduce el titular publicado (**1 persona en la ventana, el coach, 7 de 7 backups**).

Dos desviaciones que el script no declara:

1. **`medir-descuadre-tapaba.mjs:57`** aplica el guard `banda` a **toda** la ventana. Ese guard entró en **v493 (`6bd1395`, 2026-08-18)**, o sea que **6 de los 7 backups de la ventana son de una época en que la rama del descuadre NO lo tenía**: un menor con descuadre habría sido `tapado` de verdad y el script lo excluye. La cabecera (`:24-26`) declara el anacronismo que **infla** (`proteina_fuera`, bandas) y calla el que **desinfla**.
   - **MEDIDO:** reproduje `analizar` sin el guard sobre los 7 backups de la ventana → **el resultado no cambia** (`["Andres"]` los 7 días). La única fila con banda activa es Valery (15 a), y su plan no tiene descuadre ≥ `NUT_KCAL_MISMATCH`. **El titular «1 de 10, y es el del coach» aguanta.** Es un hueco de método, no un número mal.
2. **`:65`** `hayReview = status!=='ok'`, pero la app corta sin pintar cuando `status==='sin_datos'` y `falta` viene vacío (`app-3-coach.js`, rama `sin_datos`). Eso sobrecontaría `tapados`. **MEDIDO:** tampoco ocurre en la ventana.

Lo demás de la cabecera es honesto: el filtro «solo filas con `nut.kcal>0`» está dicho y el denominador se imprime como «planes con titular».

---

## 🟢 8 · Restos de la bajada (limpieza, no riesgo)

| Sitio | Qué |
|---|---|
| `styles.css:398` | `.hb-chip.f{…}` — **CSS huérfano**: ya no hay productor de `hb-chip f` en ningún módulo. Único uso de `--ort/--orl/--or` en ese bloque. |
| `app-5-salud.js:1455-1457` | Cabecera «LA TIRA DE 3 CHIPS … pasan a una tira de tres chips de una línea» — falso desde v507. |
| `app-5-salud.js:1466` | «el de comida abre la habitación del registro (igual que antes)» — ese chip ya no existe. |
| `app-5-salud.js:1320` | «los tres chips y las tres filas del detalle» — son dos chips. |
| `avi.test.js:10686` | Mensaje `'_hbPct debería alimentar los 3 chips y las 3 filas'`. El umbral `usos>=5` sigue pasando porque los dos chips comparten `_habitChipHtml` (conté: 5 apariciones, una es la definición) — el número no cambió, el texto sí quedó falso. |
| `docs/plan-diseno-B-compromiso.md:180` | La tabla del lote sigue diciendo `_verify-chips.mjs` **(17)** mientras `4478afd` actualizó CLAUDE.md a **(21)**. |
| `scripts/e2e/_verify-foodlog.mjs:102` | FL1 sigue aceptando `.hb-chip.f` como alternativa válida → daría verde si alguien devolviera el chip y borrara la fila del detalle. |
| `_verify-chips.mjs` C4-ter/C10 | La sonda de contraste **no compone el `opacity` de la cadena de padres** (sí el alfa del color). Es la clase que el propio repo documentó en v453 con `_audit-lectura`. Aquí no hay elementos con opacity, pero la sonda se copiará. |

---

## Lo que busqué y está limpio

- **Referencias huérfanas al chip:** grepeé `hb-chip.f`, `conComida`, `_habitStripHtml`, `.hb-chip`, `openFoodLogRoom`, `hb-strip`, `cn-habits` en `app-*.js`, `avi-core.js`, `index.html`, `styles.css`, `avi.test.js`, `scripts/**`, `docs/**`. Fuera de la tabla de arriba, **nada roto**: `_verify-water.mjs:64-66` (W0) pide `chips >= 2`, así que sobrevivió; `_verify-tope.mjs:101,155` y `_medir-tarjetas-hoy.mjs:33` tratan `cn-habits`/`cn-meals` como intocables y no cuentan chips; `index.html` no tiene ni una referencia al chip.
- **Código muerto/degradado introducido:** ninguno. `_foodLogTargetHoy` (llamado en `:1428` y `:1679`), `foodLogBandFor` (`:1434`, `:1689`), `habitPct`/`_hbPct` (4 sitios) y `_foodLogBlockHtml` (`:1542`) conservan llamadores reales. `conComida` dejó de ser parámetro pero sigue siendo variable usada. **Cero parámetros o variables sin uso.**
- **Separación de roles:** `openNutritionRoom` solo se alcanza desde `renderNutritionClient`/`renderMealsToday` (vista del asesorado, o el coach en COACH_SELF), y `openFoodLogRoom()` resuelve el cliente por `CUR.clientId` con su propio gate Premium. La puerta nueva **no** le abre un registro ajeno a nadie.
- **La afirmación «NO se pierde información: la franja la sigue diciendo `#cn-meals`»:** la **medí** sobre el backup real del 19-ago, corriendo `nutBaseFor`+`nutDayPlan` en los 7 días de la semana para las 20 filas Premium. `nutDayPlan` **no devolvió null ni una vez** cuando había `base`; las 3 filas sin `base` tampoco habrían tenido franja con el chip. **La promesa se cumple sobre los datos reales de hoy.** (Sigue sin candado: `renderMealsToday` tiene 3 `return` que dejan `#cn-meals` vacío y ningún check afirma el caso «Premium sin plan escrito».)
- **Suite y hook, corridos por mí:**
  - `node --test avi.test.js` → **803/803** ✅ (10,6 s)
  - `python scripts/hooks/pre-commit` → **12/12 OK, 0 errores, 0 avisos**; check 10 confirma `?v=507` coherente con `CACHE_NAME avi-v507`; check 11 baseline 803 = 803. *(Ojo operativo: el hook es Python, no Node — `node scripts/hooks/pre-commit` revienta con `SyntaxError` y **devuelve exit 0**.)*
- **Cuenta de aserciones:** `_verify-chips.mjs` tiene 19 `check(` + el de C10 dentro de un bucle de 2 temas = **21 resultados**. El «17→21» de `4478afd` es correcto; el «19→20» del cuerpo de `63f8ffb` contaba sentencias. Antes de v507 eran 16 sentencias → 17 resultados. Consistente.
- **No verificable sin navegador (queda para Lucas):** las cifras de contraste publicadas (C4-ter 5,45 claro / 7,14 oscuro; C7/C10 6,01 / 6,33) y los dos sabotajes declarados. Razonando el sabotaje 1 sobre el código, los rojos serían C1, C4, C8, C9, C9-bis y C11 = **6**, que cuadra con lo afirmado; el sabotaje 2 debería dar **dos** rojos (C4-bis **y** C4-ter), no uno como dice el commit.

---

## Recomendado, por orden

1. Corregir el texto de `AVI_NEWS` v505 (`app-6-extra.js:2736-2737`) — o publicar entrada v507 que explique la mudanza. **Requiere bump de `?v=`/`CACHE_NAME`.**
2. Añadir `n===2` a C11 (`_verify-chips.mjs:252`), para que no lo satisfaga una tira ausente.
3. Un check estático en `avi.test.js` que exija `${_foodLogDoorHtml(c)}` dentro del tramo `openNutritionRoom`→`closeNutritionRoom` **y** el gate `isFreeClient` dentro de `_foodLogDoorHtml` — mismo patrón que `avi.test.js:5029-5031` ya usa para `conComida`. Es lo único que hace que el candado corra en el hook y en CI.
4. Añadir a la cabecera de `medir-descuadre-tapaba.mjs` la segunda dirección del anacronismo (el guard `banda` es de v493) **con la medición que dice que no mueve el resultado** — si no, el siguiente que lo lea repite el trabajo.
5. Limpieza: `styles.css:398`, los tres comentarios de `app-5-salud.js`, el mensaje de `avi.test.js:10686` y el «(17)» de `plan-diseno-B-compromiso.md:180`.

Ninguna recomendación choca con las restricciones (un solo HTML, vanilla, sin dependencias, 360 px, mobile-first).
