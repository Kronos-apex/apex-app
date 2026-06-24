# 🎬 Plan de videos de ejercicio AVI — faltantes y producción manual

> Generado 2026-06-24. Fuente de datos: `docs/videos-faltantes.json` / `.csv`
> (se regeneran con el script de faltantes). Galería visual: `prompts-videos.html`.

## Estado
- **Catálogo total:** 162 ejercicios
- **Con video:** 32 ✅
- **Faltan video:** 129 (todos con imagen de referencia ya lista) 🟡
- **Sin imagen (no generable aún):** 1 → `e159` Elevación de talones a peso corporal

**Reparto:** 13 días a 10 videos/día (ver el plan de tandas abajo). Por músculo:
pecho 8 · espalda 13 · hombros 18 · bíceps 12 · tríceps 10 · piernas 19 · glúteo 20 · core 12 · cardio 14 · otro 3.

---

## ⚠️ ANTES de empezar la semana: prueba 1 video
En su momento (feb-2026) registramos que **la app de Gemini BLOQUEABA animar fotos
de personas** (política, no límite de plan) — por eso montamos la **API de Veo**
(`gen-video.mjs`, modelo `veo-3.1-fast`, `personGeneration:allow_adult`). Pudo
haber cambiado, pero **NO planees los 13 días sin confirmar**:

1. Abre la app de Gemini, sube **una** imagen (ej. `e71.jpg`) y pega el prompt.
2. ¿Genera el video con la persona? → ✅ adelante con el flujo manual.
3. ¿Lo bloquea por "persona/rostro"? → el camino sigue siendo la **API de Veo**
   (mismo billing que las imágenes; ya tienes `gen-video.mjs`). Avísame y lo
   automatizamos por lotes en vez de a mano.

---

## Flujo recomendado (manual, 10/día)

**La herramienta ya está hecha:** abre **`prompts-videos.html`** (doble clic, en el
Escritorio AVI). Es una galería con buscador donde cada ejercicio muestra:
- su **imagen de referencia** (♂ y ♀ si existe) — esa imagen es el **primer fotograma**;
- el **prompt de video ya optimizado** (en inglés, con el nombre exacto del ejercicio
  para que el movimiento salga correcto) + botón **📋 Copiar**.
- Los faltantes salen **primero**; los que ya tienen video salen en gris al final.

Para cada ejercicio del día:
1. En la galería, busca el `id` (ej. `e71`) y copia su prompt.
2. En la app de Gemini: **sube la imagen** `media/exercises/e71.jpg` + pega el prompt.
3. Genera, revisa (¿movimiento completo? ¿logo AVI intacto? ¿fase correcta?).
4. Descarga el `.mp4`, renómbralo **exactamente** `e71.mp4` y guárdalo para integrarlo.
5. Marca la casilla ☐→☑ en el plan de tandas.

> Al final del lote yo integro los `.mp4` (los copio a `media/exercises/` y agrego cada
> `id` a `EX_VID` en `app-1-infra.js`), subo versión y despliego. **Convención de nombre
> = el `id` tal cual** (`e71.mp4`); si grabaste una versión mujer, `e71_f.mp4`.

---

## ⭐ Meta-prompt OFICIAL (Gemini redacta el prompt + genera el video)

**Regla de oro contra errores:** el fallo #1 NO es cómo está escrito el prompt — es que
Gemini **adivine mal qué ejercicio es** (ya pasó: confundió curl femoral con extensión de
cuádriceps, e126). Por eso **SIEMPRE le das el nombre exacto** (sale en el plan de tandas /
la galería). Dejas que Gemini redacte y adapte el movimiento, pero NO que lo adivine.

Pega ESTO + adjunta la imagen. **Lo único que cambias por ejercicio es la línea del nombre:**

```
Eres director de video de demostraciones de ejercicio. Te adjunto UNA imagen de
referencia: una persona a mitad de un ejercicio, en un estudio con iluminación verde
esmeralda cinematográfica, fondo oscuro con humo y camiseta negra con el logo verde "AVI".

El ejercicio es: «Press de Banca con Mancuernas».

PASO 1 — Escribe el prompt de video ideal para animar esta foto como demostración del
ejercicio, describiendo con precisión su recorrido completo (postura inicial, fase de
bajada/estiramiento, fase de subida/contracción máxima y vuelta).

PASO 2 — Genera ese video con estas reglas OBLIGATORIAS:
- Empieza EXACTAMENTE desde la pose de la foto (la imagen es el primer fotograma).
- La MISMA persona hace 2 repeticiones completas y deliberadas.
- CRÍTICO: cada repetición recorre TODO el rango — alcanza con claridad los DOS extremos
  (estiramiento/inicio Y contracción máxima/final) y vuelve completo. Nada de reps a
  medias, cortas ni nerviosas.
- Ritmo lento y constante, ~2 segundos por dirección.
- Cámara fija y bloqueada (sin paneos ni zoom).
- Conserva EXACTAMENTE la iluminación verde esmeralda, el fondo oscuro con humo y la
  camiseta negra con el logo verde "AVI". Vertical 9:16, fotorrealista, loop sin cortes.
- Sin texto, marcas de agua ni logos extra.
```

> **Aún más a prueba de errores:** la galería `prompts-videos.html` ya trae el prompt escrito
> (en inglés, con el nombre exacto incrustado) → copiar/pegar sin que Gemini redacte. Usa el
> meta-prompt de arriba si sientes que Gemini adapta mejor el movimiento describiéndolo él.

---

## Recordatorios de calidad (ojo-coach)
- **Movimiento completo:** el error #1 de Veo era cortar el recorrido. Si sale a medias,
  re-genera insistiendo en "full range of motion, both extremes".
- **Fase inconfundible:** que se vea claramente QUÉ ejercicio es (no un gesto ambiguo).
- **Logo AVI y estilo:** misma estética del catálogo; si pierde el logo o cambia la
  iluminación, descártalo.
- **Cardio/HIIT** (e20, e64-67, e74-76, e135, e141-145): movimiento cíclico continuo
  (correr, pedalear, saltar) en vez de "2 reps" — el prompt igual sirve, pero prioriza
  que el ciclo se vea natural y en loop.

---

## Plan de tandas (13 días · 10/día)
<!-- Casillas: cambia ☐ por ☑ a medida que descargues cada mp4. -->

### Día 1 — 10 videos · pecho, espalda
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e71` | Press de Banca con Mancuernas | `media/exercises/e71.jpg` |
| ☐ | `e77` | Flexiones en Pared | `media/exercises/e77.jpg` |
| ☐ | `e78` | Flexiones en Rodillas | `media/exercises/e78.jpg` |
| ☐ | `e83` | Lagartijas (Push-up) | `media/exercises/e83.jpg` |
| ☐ | `e110` | Press Inclinado con Barra | `media/exercises/e110.jpg` |
| ☐ | `e111` | Pec Deck (Máquina Contractora) | `media/exercises/e111.jpg` |
| ☐ | `e112` | Aperturas con Mancuernas en Banco | `media/exercises/e112.jpg` |
| ☐ | `e113` | Flexiones Inclinadas (Manos Elevadas) | `media/exercises/e113.jpg` |
| ☐ | `e4` | Dominadas | `media/exercises/e4.jpg` |
| ☐ | `e25` | Remo en Polea a una Mano | `media/exercises/e25.jpg` |

### Día 2 — 10 videos · espalda
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e50` | Buenos Días con Barra | `media/exercises/e50.jpg` |
| ☐ | `e82` | Superman | `media/exercises/e82.jpg` |
| ☐ | `e104` | Remo con Banda | `media/exercises/e104.jpg` |
| ☐ | `e114` | Remo Sentado en Máquina | `media/exercises/e114.jpg` |
| ☐ | `e115` | Encogimientos con Mancuernas | `media/exercises/e115.jpg` |
| ☐ | `e116` | Hiperextensiones en Banco Romano | `media/exercises/e116.jpg` |
| ☐ | `e137` | Pullover con Mancuerna en Banco | `media/exercises/e137.jpg` |
| ☐ | `e146` | Remo Invertido en Mesa o Barra Baja | `media/exercises/e146.jpg` |
| ☐ | `e147` | Remo con Toalla en Puerta | `media/exercises/e147.jpg` |
| ☐ | `e148` | Patrón de Bisagra (Buenos Días sin Peso) | `media/exercises/e148.jpg` |

### Día 3 — 10 videos · espalda, hombros
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e149` | Nadador en Suelo | `media/exercises/e149.jpg` |
| ☐ | `e7` | Press Militar con Barra | `media/exercises/e7.jpg` |
| ☐ | `e8` | Elevaciones Laterales | `media/exercises/e8.jpg` |
| ☐ | `e21` | Face Pull en Polea | `media/exercises/e21.jpg` |
| ☐ | `e53` | Elevaciones Frontales | `media/exercises/e53.jpg` |
| ☐ | `e54` | Pájaro / Elevaciones Posteriores | `media/exercises/e54.jpg` |
| ☐ | `e97` | Pike Push-up (Flexión Pica) | `media/exercises/e97.jpg` |
| ☐ | `e98` | Press de Hombro con Banda | `media/exercises/e98.jpg` |
| ☐ | `e99` | Elevaciones Laterales con Banda | `media/exercises/e99.jpg` |
| ☐ | `e100` | Face Pull con Banda | `media/exercises/e100.jpg` |

### Día 4 — 10 videos · hombros, biceps
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e109` | Elevaciones Y-T-W en Suelo | `media/exercises/e109.jpg` |
| ☐ | `e117` | Elevaciones Laterales en Polea | `media/exercises/e117.jpg` |
| ☐ | `e118` | Press Arnold con Mancuernas | `media/exercises/e118.jpg` |
| ☐ | `e119` | Posteriores en Máquina (Pec Deck Inverso) | `media/exercises/e119.jpg` |
| ☐ | `e138` | Rotación Externa con Banda | `media/exercises/e138.jpg` |
| ☐ | `e154` | Pike Push-up Inclinado | `media/exercises/e154.jpg` |
| ☐ | `e155` | Elevaciones Laterales con Botellas | `media/exercises/e155.jpg` |
| ☐ | `e156` | Press de Hombro con Mochila | `media/exercises/e156.jpg` |
| ☐ | `e157` | Toques de Hombro en Plancha | `media/exercises/e157.jpg` |
| ☐ | `e10` | Curl Martillo con Mancuernas | `media/exercises/e10.jpg` |

### Día 5 — 10 videos · biceps
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e29` | Curl de Bíceps con Mancuernas | `media/exercises/e29.jpg` |
| ☐ | `e55` | Curl de Bíceps en Polea Baja | `media/exercises/e55.jpg` |
| ☐ | `e101` | Curl de Bíceps con Banda | `media/exercises/e101.jpg` |
| ☐ | `e102` | Curl Martillo con Banda | `media/exercises/e102.jpg` |
| ☐ | `e103` | Dominada Supina (Chin-up) | `media/exercises/e103.jpg` |
| ☐ | `e120` | Curl Concentrado con Mancuerna | `media/exercises/e120.jpg` |
| ☐ | `e121` | Curl Inclinado con Mancuernas | `media/exercises/e121.jpg` |
| ☐ | `e139` | Curl Invertido con Barra | `media/exercises/e139.jpg` |
| ☐ | `e140` | Curl de Muñeca con Barra | `media/exercises/e140.jpg` |
| ☐ | `e150` | Curl con Botellas o Mochila | `media/exercises/e150.jpg` |

### Día 6 — 10 videos · biceps, triceps
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e151` | Curl Isométrico Autorresistido | `media/exercises/e151.jpg` |
| ☐ | `e12` | Extensión de Tríceps Tumbado (Skull Crushers) | `media/exercises/e12.jpg` |
| ☐ | `e19` | Fondos en Paralelas (Tríceps) | `media/exercises/e19.jpg` |
| ☐ | `e30` | Extensión de Tríceps sobre la Cabeza (Trasnuca) | `media/exercises/e30.jpg` |
| ☐ | `e31` | Extensión de Tríceps a una Mano en Polea | `media/exercises/e31.jpg` |
| ☐ | `e79` | Fondos en Banco (Tríceps) | `media/exercises/e79.jpg` |
| ☐ | `e105` | Extensión de Tríceps con Banda | `media/exercises/e105.jpg` |
| ☐ | `e122` | Patada de Tríceps con Mancuerna (Kickback) | `media/exercises/e122.jpg` |
| ☐ | `e123` | Flexiones Diamante | `media/exercises/e123.jpg` |
| ☐ | `e152` | Flexión Cerrada Inclinada | `media/exercises/e152.jpg` |

### Día 7 — 10 videos · triceps, piernas
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e153` | Patada de Tríceps con Botella | `media/exercises/e153.jpg` |
| ☐ | `e15` | Curl Femoral Tumbado | `media/exercises/e15.jpg` |
| ☐ | `e16` | Elevación de Talones de Pie | `media/exercises/e16.jpg` |
| ☐ | `e35` | Desplantes / Zancada | `media/exercises/e35.jpg` |
| ☐ | `e39` | Curl Femoral de Pie en Máquina | `media/exercises/e39.jpg` |
| ☐ | `e41` | Step-up con Mancuernas | `media/exercises/e41.jpg` |
| ☐ | `e59` | Elevación de Talones Sentado | `media/exercises/e59.jpg` |
| ☐ | `e70` | Sentadilla Goblet | `media/exercises/e70.jpg` |
| ☐ | `e93` | Sentadilla con Banda de Resistencia | `media/exercises/e93.jpg` |
| ☐ | `e95` | Peso Muerto Rumano a Una Pierna | `media/exercises/e95.jpg` |

### Día 8 — 10 videos · piernas
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e107` | Step-up a Peso Corporal | `media/exercises/e107.jpg` |
| ☐ | `e108` | Sentadilla a Una Pierna Asistida | `media/exercises/e108.jpg` |
| ☐ | `e124` | Zancada Inversa | `media/exercises/e124.jpg` |
| ☐ | `e125` | Zancada Caminando con Mancuernas | `media/exercises/e125.jpg` |
| ☐ | `e126` | Curl Femoral Sentado en Máquina | `media/exercises/e126.jpg` |
| ☐ | `e127` | Sentadilla Frontal con Barra | `media/exercises/e127.jpg` |
| ☐ | `e128` | Sentadilla Isométrica en Pared (Wall Sit) | `media/exercises/e128.jpg` |
| ☐ | `e158` | Sentadilla a Silla (Sit-to-Stand) | `media/exercises/e158.jpg` |
| ☐ | `e160` | Zancada Estática con Apoyo | `media/exercises/e160.jpg` |
| ☐ | `e161` | Sentadilla Sumo a Peso Corporal | `media/exercises/e161.jpg` |

### Día 9 — 10 videos · gluteo
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e43` | Hip Thrust en Máquina | `media/exercises/e43.jpg` |
| ☐ | `e44` | Patada de Glúteo en Polea | `media/exercises/e44.jpg` |
| ☐ | `e45` | Abducción de Cadera en Máquina | `media/exercises/e45.jpg` |
| ☐ | `e46` | Peso Muerto Piernas Rígidas | `media/exercises/e46.jpg` |
| ☐ | `e60` | Aducción de Cadera en Máquina | `media/exercises/e60.jpg` |
| ☐ | `e61` | Sentadilla Sumo | `media/exercises/e61.jpg` |
| ☐ | `e73` | Puente de Glúteo | `media/exercises/e73.jpg` |
| ☐ | `e87` | Patada Lateral en Polea | `media/exercises/e87.jpg` |
| ☐ | `e88` | Patada en Polea Rodilla Doblada | `media/exercises/e88.jpg` |
| ☐ | `e89` | Clamshell con Banda (Concha) | `media/exercises/e89.jpg` |

### Día 10 — 10 videos · gluteo
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e90` | Fire Hydrant (Hidrante) | `media/exercises/e90.jpg` |
| ☐ | `e91` | Frog Pump (Bomba de Rana) | `media/exercises/e91.jpg` |
| ☐ | `e92` | Hip Thrust Unilateral | `media/exercises/e92.jpg` |
| ☐ | `e94` | Abducción de Cadera de Pie con Banda | `media/exercises/e94.jpg` |
| ☐ | `e96` | Kickback con Banda (en Suelo) | `media/exercises/e96.jpg` |
| ☐ | `e106` | Puente de Glúteo a Una Pierna | `media/exercises/e106.jpg` |
| ☐ | `e129` | Paseo Lateral con Banda | `media/exercises/e129.jpg` |
| ☐ | `e130` | Patada de Glúteo en Cuadrupedia | `media/exercises/e130.jpg` |
| ☐ | `e162` | Zancada Inversa a Peso Corporal | `media/exercises/e162.jpg` |
| ☐ | `e163` | Abducción Tumbado de Lado | `media/exercises/e163.jpg` |

### Día 11 — 10 videos · core
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e17` | Plancha Frontal | `media/exercises/e17.jpg` |
| ☐ | `e18` | Crunch Abdominal | `media/exercises/e18.jpg` |
| ☐ | `e49` | Plancha Lateral | `media/exercises/e49.jpg` |
| ☐ | `e62` | Russian Twist | `media/exercises/e62.jpg` |
| ☐ | `e63` | Hollow Body | `media/exercises/e63.jpg` |
| ☐ | `e72` | Dead Bug | `media/exercises/e72.jpg` |
| ☐ | `e81` | Mountain Climbers | `media/exercises/e81.jpg` |
| ☐ | `e131` | Crunch en Polea Alta | `media/exercises/e131.jpg` |
| ☐ | `e132` | Elevación de Piernas Tumbado | `media/exercises/e132.jpg` |
| ☐ | `e133` | Press Pallof con Banda | `media/exercises/e133.jpg` |

### Día 12 — 10 videos · core, cardio
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e134` | Bird Dog (Perro de Caza) | `media/exercises/e134.jpg` |
| ☐ | `e164` | Plancha en Rodillas | `media/exercises/e164.jpg` |
| ☐ | `e20` | Carrera / Caminata | `media/exercises/e20.jpg` |
| ☐ | `e64` | Bicicleta Estática | `media/exercises/e64.jpg` |
| ☐ | `e65` | Remo Ergómetro | `media/exercises/e65.jpg` |
| ☐ | `e66` | Salto a la Cuerda | `media/exercises/e66.jpg` |
| ☐ | `e67` | Elíptica | `media/exercises/e67.jpg` |
| ☐ | `e74` | HIIT / Intervalos | `media/exercises/e74.jpg` |
| ☐ | `e75` | Burpees | `media/exercises/e75.jpg` |
| ☐ | `e76` | Saltos de Tijera | `media/exercises/e76.jpg` |

### Día 13 — 9 videos · cardio, otro
| ✓ | id | ejercicio | imagen de referencia |
|---|----|-----------|----------------------|
| ☐ | `e135` | Escaladora (Stair Climber) | `media/exercises/e135.jpg` |
| ☐ | `e141` | Marcha en el Sitio | `media/exercises/e141.jpg` |
| ☐ | `e142` | Paso Lateral (Step-Touch) | `media/exercises/e142.jpg` |
| ☐ | `e143` | Talones Atrás Suave | `media/exercises/e143.jpg` |
| ☐ | `e144` | Sombra de Boxeo | `media/exercises/e144.jpg` |
| ☐ | `e145` | Subir y Bajar Escalón | `media/exercises/e145.jpg` |
| ☐ | `e68` | Peso Muerto Sumo | `media/exercises/e68.jpg` |
| ☐ | `e69` | Clean & Press ⚠️ AVANZADO | `media/exercises/e69.jpg` |
| ☐ | `e136` | Caminata del Granjero (Farmers Walk) | `media/exercises/e136.jpg` |
