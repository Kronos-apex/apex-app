# Evaluación: GRASA CORPORAL ESTIMADA en AVI (v607, sin desplegar)

**Quién pide la evaluación:** Camilo Andrés (PO, entrenador personal). Instrucción literal del
11-sep-2026: *«constrúyelo y se lo pasas a los coach para que lo evalúen»*.

**De dónde nace:** el PO leyó en su propia ficha un **IMC de 31,3** y lo entendió como su
porcentaje de grasa corporal. No lo es. Y la app **ya tenía** las entradas para decirlo bien: los
13 perímetros de v566 incluyen **cuello, cintura y cadera**.

---

## Lo que está construido (pendiente de tu veredicto para desplegar)

`bodyFatEstimate(client, entries)` — función PURA en `avi-core.js`.

- **Método:** Navy / Hodgdon-Beckett, versión métrica.
  - Hombre: `495 / (1,0324 − 0,19077·log10(cintura − cuello) + 0,15456·log10(talla)) − 450`
  - Mujer: `495 / (1,29579 − 0,35004·log10(cintura + cadera − cuello) + 0,22100·log10(talla)) − 450`
- **Franja:** se devuelve `pct` y una banda de **±3,5 puntos** (`BF_BAND_PTS`), y la pantalla
  muestra las dos cosas. Razón: es una estimación con cinta, no un DEXA.
- **Guardas ya puestas:**
  - **Menor de 18 → NO se estima** y no se pinta NADA (ni una explicación): es lenguaje de
    composición corporal, prohibido para menores por el dictamen de Andrés (v448/v449). Hay
    **4 menores** en la base (15, 15, 16 y 17 años).
  - **Sin `sex` no se calcula** (no hay default a hombre: ese fue el defecto de v604).
  - **Los tres perímetros salen de la MISMA toma.** No se mezcla la cintura de hoy con el cuello
    de junio. Consecuencia real: la toma del 17-jun del PO no tiene cuello, así que **hoy no tiene
    flecha de evolución** y la app lo dice en vez de inventarla.
  - **Rango de cordura** 3–60%; fuera de eso se calla (y `cintura ≤ cuello` no se calcula).
  - Las tomas **borradas** (lápidas de v566) no se usan.
- **Sin categorías ni adjetivos.** Hoy la pantalla enseña el número, la franja y su procedencia.
  No dice «alto», «saludable» ni «atleta». Eso es justo lo que se somete a evaluación.

## Dónde se ve
1. **Asesorado** — dentro de su tarjeta de medidas (hereda el candado Premium de esa tarjeta).
2. **Coach** — una casilla en la «Valoración física» de la ficha, al lado de Cintura/Talla,
   Cintura/Cadera, TMB y TDEE.

## Medido sobre los 28 perfiles REALES de producción (backup del 10-sep)
| Estado | Personas |
|---|---|
| Se puede estimar hoy | **1** (el PO: 24,4%) |
| Solo les falta **el cuello** | **5** (Claudia, Natalia, Kathe, Luz, Nicolás) |
| Sin ninguna toma de medidas | 16 |
| Menores (bloqueados por diseño) | 4 |
| Sin talla en la ficha | 2 |

Los números del PO: talla 175, 37 años, peso 96 kg. Cintura **102** y cuello **44,5** (8-sep) →
**24,4%** (franja 20,9–27,9). Cintura/talla 0,583. IMC 31,3. En junio su cintura era 95 con el
mismo peso-ish (90 kg): la cintura subió **7 cm** en tres meses y su objetivo declarado es
**«Perder grasa»**.

---

## LO QUE SE TE PIDE DECIDIR (cada punto, con razón)

1. **¿El método es el correcto para este producto?** Alternativas reales: Navy por perímetros (lo
   construido), pliometría de 3-7 pliegues (necesita plicómetro y técnica del coach), BIA
   (báscula de bioimpedancia, no la tenemos), o no dar el número en absoluto. Si Navy sirve:
   ¿la franja de ±3,5 puntos es honesta, o debería ser más ancha?
2. **¿Se muestran CATEGORÍAS?** Hoy no hay ninguna. Si deben existir, dicta los cortes por sexo
   (y si dependen de la edad), y el TEXTO exacto que lee la persona. Recuerda que esto lo leen
   asesorados, no colegas: el tono es cálido, español colombiano, cero jerga.
3. **¿Debe entrar donde hoy manda el IMC?** `bodyLoadProfile` decide el perfil de carga con
   **IMC ≥ 30 o cintura/talla ≥ 0,60**, y con «alto» el generador prioriza máquinas y movimientos
   guiados y **quita saltos y pliométricos**. El PO acaba de cruzar IMC 30 (31,3) con
   cintura/talla 0,583 y 24,4% de grasa estimada: hoy el motor le retiraría los pliométricos por
   el IMC. ¿Se cambia el criterio, se añade la grasa estimada como tercera vía, o se deja igual?
4. **¿La grasa estimada debe mover algo de NUTRICIÓN?** Hoy no toca nada. Por encima de IMC 30 la
   app dosifica proteína y grasa sobre **peso de referencia** (v428/v485) — al registrar 96 kg, la
   proteína del PO bajó de 186 a 174 g. Si la masa magra estimada es un mejor insumo que el peso
   de referencia, dilo y con qué fórmula.
5. **El caso del PO, como asesorado real:** +7 cm de cintura en 3 meses, objetivo «Perder grasa»,
   y ayer una **lesión leve de isquios** corriendo (descansa el fin de semana el tren inferior).
   ¿Qué le dirías tú?

## Reglas del proyecto que NO se negocian (y que tu veredicto no puede saltarse)
- Lo clínico y lo deportivo lo dictas tú; el ingeniero verifica que sea implementable con los
  datos REALES (arriba está el reparto: 1 de 28 hoy).
- **A un menor, cero lenguaje de composición corporal.** Es la regla más dura que tiene la app.
- Nada de umbrales inventados: **una cifra sin fuente citable no entra**. Si das cortes, di de
  dónde salen.
- Si la respuesta es «esto no se debe mostrar», **esa es una respuesta válida** y se acata.
