# Calentamiento por sesión — propuesta consolidada (Coach Pro + Valery), 23-oct-2026

Borrador para el dictamen de Laura y después para la decisión del PO. Fuentes: `coach-pro.md` y `valery.md` (esta carpeta).
Nada de esto está en el código todavía.

## Decisiones ya tomadas por el PO (23-oct)
- Ya en producción (v720): sale `wh4` rotación torácica sentado; queda `we2` en el suelo.
- SE QUEDAN: `wc3` 90/90 · `wc2` estocada con rotación · `wc5` patada lateral · `wr3` isquios de pie · `we5` rollitos · `wt2` tobillo en pared.
- SALEN: `wa2` remo invertido · `wr1` círculos de rodilla · `we3` apertura de cadena posterior.

## Estructura (los dos coinciden)
1. **General** (nuevo, hoy no existe): 3-5 min de cardio suave. Casilla «ya vengo caliente» para saltarlo.
2. **Movilidad específica**: 2-4 piezas según la sesión.
3. **Activación**: 1-3 piezas.
4. **Aproximación**: series livianas del primer ejercicio de cada músculo.
- Tope: 7 piezas marcables (sin contar la aproximación).
- Mecanismo nuevo: **una receta por tipo de sesión** (lista de ids con alternas), en vez de «2 por grupo de músculo». La rotación de v644 (derivada de la rutina guardada) solo elige entre las ALTERNAS declaradas; las piezas fijas (p. ej. `wt2` en pierna, la activación de glúteo) no rotan. El filtro de lesiones corre ANTES de elegir; si una pieza cae, entra su alterna.

## Recetas — hombre y generales (Coach Pro)
| Sesión | General | Movilidad | Activación |
|---|---|---|---|
| EMPUJE | `wg1` 3 min | `wh1`, `wh3`, `wm1` | `wa3`, `we4` |
| TRACCION | `wg1` 3 min | `we2`, `wh1` | `wa6` + (`wa3` o `wa5`) |
| PIERNA | `wg1` bici 4 min | `wt2` y `wc2` fijas + (`wc3` o `wr3`) | `wc4` + (`wc5` o `wag2`) |
| TREN_SUP | `wg1` 3 min | `wh1`, `we2`, `wh3` | `wa3`, `we4` |
| HOMBROS_BRAZOS | `wg1` 3 min | `wh1`, `wh2`, `wm1` | `wa3`, `wa5` |
| CARDIO_CORE | dentro del cardio (3 min suaves) | `wc1`, `we1` (+ `wt1`, `wai4` si hay saltos o trote) | `wac2` |
| FULL_BODY | `wg1` 4 min (corporal: `wf1`) | `wc2`, `wt2`, `wh1` | `wc4`, `wa3` |

## Recetas — mujer (Valery)
| Sesión | General | Movilidad | Activación |
|---|---|---|---|
| GP_A | `wg1` 5 min (casa `wg2`, parque `wg3`) | `wt2`, `wc2`, `wc3` (alterna `wc1`), `wr2` | `wc4` (pausa 2 s), `wag1`, `wag2` |
| GP_B | igual | `wt2`, `wr3`, `wc5`, (`wc3` o `wc2`) | `wc4`, `wai3`, `wag3` |
| TREN_SUP (mujer) | `wg1` (elíptica) | `wh1`, `we2`, `wah2` | `wa3`, `wh2`, `wa1` inclinada |
| EMP_BRAZOS | 3-4 min | `wh1`, `wh3`, `wm1` | `wa3`, `wh2` |
| CORE_CARDIO | los primeros 3-4 min del cardio | `we1`, `we2`, `wc1` (o `we5`) | `wac5`, (`wac2` o `wac4`); con impacto + `wt2`, `wai4` |
(Valery nombró `wh5` en EMP_BRAZOS; queda `wm1` por el duplicado.)

## Piezas nuevas (consolidadas)
| id | Nombre | Reps | Indicación | Lo propuso |
|---|---|---|---|---|
| `wg1` | Cardio suave en máquina | 3-5 min | Bici, elíptica o caminadora inclinada a un ritmo en que puedas conversar; el último minuto sube un poco. | ambos |
| `wg2` | Marcha en el lugar con brazos | 3-5 min | Rodillas a media altura, brazos al ritmo, sin saltar. | ambos |
| `wg3` | Caminata rápida | 5 min | Paso firme, brazos sueltos (calle o banda con 2-3% de inclinación). | Valery |
| `wg4` | Saltar cuerda suave | 2-3 min | Saltos pequeños, rodillas suaves; para si sientes el golpe en las rodillas. | Coach Pro |
| `wf1` | Gusano (caminata de manos) | 5 | De pie, baja las manos al suelo, camina con ellas hasta la plancha y vuelve; dobla las rodillas lo que haga falta. | Coach Pro |
| `wa5` | Elevaciones en Y y T | 8 de cada una | Inclinado al frente o boca abajo, sin peso, pulgares arriba. | Coach Pro |
| `wa6` | Colgado activo en barra | 2 × 15-20 s | Cuélgate y baja los hombros lejos de las orejas sin doblar los codos. | Coach Pro |
| `wag1` | Almeja con banda | 12 c/lado | Acostada de lado, rodillas dobladas, banda sobre las rodillas; abre la de arriba sin que la cadera ruede. | Valery |
| `wag2` | Caminata lateral con banda | 10 pasos c/lado | Banda sobre las rodillas, media sentadilla, pasos cortos sin que las rodillas se cierren. | ambos |
| `wag3` | Patada atrás en cuatro apoyos | 10 c/lado | Pierna doblada hacia atrás y arriba apretando el glúteo, sin arquear la espalda. | Valery |
| `wac4` | Perro de caza (bird dog) | 8 c/lado | En cuatro apoyos, brazo y pierna contrarios sin mover la cadera; 2 s arriba. | ambos |
| `wac5` | Respiración 360° | 5 respiraciones | Acostada, manos en las costillas: el aire abre las costillas hacia los lados y atrás. | Valery |
| `wah1` | Jalón facial liviano con banda | 12-15 | Banda a la altura de la cara, jala hacia la nariz abriendo los codos. | Valery (P1) |
| `wah2` | Deslizamiento en pared | 10 | Espalda y brazos pegados a la pared, sube y baja de «W» a «Y» sin despegar. | Valery |

## Otros cambios
- `wh5` (duplicado de `wm1`) sale; `wm1` queda. `wm2` y `wm3` (estiramientos de 30 s) salen de las recetas automáticas, quedan en la biblioteca.
- `wc4` puente de glúteo pasa de `cadera` a activación.
- `we5` rollitos queda en la biblioteca, en recetas solo como alterna (Coach Pro: flexión lumbar repetida sin respaldo).
- Textos: `wc3` como transiciones activas (no estiramiento pasivo); `wc5` hasta la altura de la cadera, con apoyo en pared; `we5` sin «descomprimiendo».
- Datos (consulta del 23-oct sobre las 12 listas propias guardadas): `wh5` y `wa2` en 0 listas; `wr1` en 11; `we3` en 4. Esas listas las decide el PO; si se retira la pieza hay que migrar (sugerido: `wr1` → quitar o `wr2`, `wa2` → `wa3`, `we3` → `we1`).

## Aproximación (consolidada)
- Peso de trabajo = último peso registrado del ejercicio.
- Pierna con barra (sentadilla, peso muerto, hip thrust con barra): 3 series — 40 % × 8, 60 % × 5, 80 % × 3. Hip thrust: la primera con la barra sola y pausa de 2 s arriba.
- Tren superior con barra: 2 series — 50 % × 8, 75 % × 4 (+ 90 % × 1-2 si trabaja a 6 reps o menos).
- Prensa, hack, Smith: 2 series. Máquina o polea: 1 serie al 60 %. Aislamiento: 1 serie al 50 % solo si es el primero de su músculo y ningún compuesto anterior lo trabajó.
- Peso corporal: ninguna (en parque, la variante más fácil del mismo ejercicio).
- Tope: 3 ejercicios y unas 6 series por sesión. La aproximación del primer ejercicio aparece abierta.
