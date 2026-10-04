# R19 · Revisor B — Evidencia del detector y del navegador (3-oct-2026)

Método: "Assessment B" de la skill impeccable (detector por línea de comandos + detector inyectado en el navegador). Solo evidencia mecánica; el juicio de diseño es del revisor A. Web probada: build de producción local `http://localhost:3456` (no se navegó avientrena.com).

## 1. Resultado en una línea

- **Línea de comandos sobre el código: 0 hallazgos** (código de salida 0, JSON = `[]`).
- **Navegador (8 pasadas: 4 páginas × 390 px y 1440 px): 145 hallazgos en bruto, 16 reglas distintas.** Ninguno es un defecto mecánico grave; la mayoría son falsos positivos de la herramienta o señales de "plantilla" que son decisiones de marca (para el revisor A). Lo que sí es real y medible: **texto por debajo de 12 px en 8 lugares** (ver 4.1).

## 2. Conteos

### 2.1 Línea de comandos (`detect --json app components`)
| Objetivo | Archivos | Hallazgos | Salida |
|---|---|---|---|
| `app/` + `components/` (35 `.tsx`, 2 `.ts`, 1 `.css`) | todos los de marcado | **0** | 0 |

Control de que el escáner SÍ lee `.tsx`: un `ctrl.tsx` con `border-l-4` + degradado en texto devolvió 2 hallazgos y salida 2 (y el `ctrl.html` equivalente también). O sea el cero es real, no un escáner mudo. Con `--no-config` también da `[]` (no hay `.impeccable/` ni ignores del proyecto que lo estén silenciando).

Prueba adicional (no pedida, de apoyo): escaneé el HTML ya construido en `.next/server/app/*.html` (6 páginas) → `B-detector-html-build.json`, 14 hallazgos: 9× `nested-cards`, 6× `flat-type-hierarchy`, 1× `em-dash-overuse`. **Los 6 `flat-type-hierarchy` son falsos positivos de la herramienta**: no pudo leer la hoja de estilos (`/_next/static/chunks/…css`, avisó "could not read linked stylesheet") y por eso vio body/h1/h2/h3 todos a 16 px. En el navegador real esa regla no sale. Los `nested-cards` y el `em-dash-overuse` coinciden con lo del navegador (ver 4.3).

### 2.2 Navegador (detector inyectado, filas = hallazgos listados, contados por regla)
| regla | / 390 | /precios 390 | /coaching 390 | /la-app 390 | / 1440 | /precios 1440 | /coaching 1440 | /la-app 1440 | total |
|---|---|---|---|---|---|---|---|---|---|
| kicker-above-heading | 5 | 3 | 6 | 3 | 5 | 2 | 5 | 2 | 31 |
| low-contrast | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 22 |
| all-caps-body | 5 | 1 | 3 | 1 | 5 | 1 | 3 | 1 | 20 |
| nested-cards | 0 | 4 | 5 | 0 | 0 | 4 | 5 | 0 | 18 |
| undersized-ui-text | 3 | 1 | 0 | 0 | 3 | 1 | 0 | 0 | 8 |
| overused-font | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 8 |
| italic-serif-display | 1 | 0 | 0 | 0 | 2 | 1 | 1 | 2 | 7 |
| body-text-viewport-edge | 2 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 7 |
| hero-eyebrow-chip | 1 | 0 | 0 | 0 | 1 | 1 | 1 | 1 | 5 |
| tiny-text | 2 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 4 |
| gpt-thin-border-wide-shadow | 0 | 2 | 0 | 0 | 0 | 2 | 0 | 0 | 4 |
| dark-glow | 0 | 2 | 0 | 0 | 0 | 2 | 0 | 0 | 4 |
| radial-spotlight-glow | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 2 |
| em-dash-overuse | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 2 |
| clipped-overflow-container | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 2 |
| edge-flush-cards | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| **TOTAL** | 23 | 18 | 18 | 14 | 22 | 19 | 19 | 12 | **145** |

(El mensaje resumen del detector, "N anti-patterns found", da cifras un poco menores —23/15/17/13 a 390 y 21/15/17/10 a 1440— porque agrupa por elemento; la tabla cuenta cada hallazgo listado.)

Las 8 inyecciones se confirmaron: título cambiado, `<script>` añadido, `detect.js` cargado (`onload` verdadero) y el detector corrió en la página (nodos de superposición en el DOM: 19–45 por página).

## 3. Cómo leer las clasificaciones
- **REAL**: el defecto existe en el navegador y se puede señalar.
- **FP**: falso positivo (la herramienta se equivoca) con su razón.
- **JUICIO**: la regla acierta en lo que ve, pero es una decisión de marca/estilo, no un fallo mecánico; se pasa al revisor A. No lo cuento como defecto.
- **CONOCIDO**: ya está en el briefing (R15/R18 o la lista de abiertos).

## 4. Hallazgos reales (con ubicación)

### 4.1 Texto por debajo de 12 px  — REAL
Medido con `getComputedStyle` (390 px; igual a 1440) además del detector. El briefing dice que R18 llevó "la letra mono a 12 px"; esto es lo que **todavía queda por debajo**:

| Tamaño | Dónde | Archivo:línea | Texto de ejemplo | Cuántos |
|---|---|---|---|---|
| **9,9 px** (`0.62rem`) | `/` sección "Resultados con nombre propio", etiqueta del objetivo dentro de cada ficha | `components/Resultados.tsx:145` | "Salud general", "Ganar músculo", "Recomposición" | 3 por pasada (marcada por el detector como `undersized-ui-text`) |
| **10,4 px** (`0.65rem`) | `/precios` caja de pago, rótulo "Llave Bre-B" | `components/PagoBreB.tsx:58` | "Llave Bre-B" | 1 (`undersized-ui-text`) |
| **10,4 px** (`0.65rem`) con `text-cream/40` | `/la-app` contador "1 / N" bajo la galería (solo si se abre el visor) | `components/AppGallery.tsx:237` | "1 / 8" | no lo marcó el detector ni lo vi renderizado; lo encontré por `grep`. Es además `/40` de opacidad sobre fondo oscuro: verificar contraste |
| 11,2 px (`0.7rem`) | `/` nota "Datos tomados de la app de cada persona…" | `components/Resultados.tsx:105` | — | 1 en `/` (marcado `tiny-text`) |
| 11,2 px (`0.7rem`) | `/` "Creador y coach de AVI" sobre la chapa dorada | `app/page.tsx:183` | — | 1 (marcado `tiny-text`) |
| 11,2 px (`0.7rem`) | **TODOS los `.eyebrow`** (los rótulos en mayúsculas sobre cada título, el "El que más recomiendo", los del pie) | `app/globals.css:122-128` (`.eyebrow{font-size:.7rem}`) | "PLANES Y PRECIOS", "POR DENTRO", "NAVEGACIÓN"… | 7–11 por página (medidos); el detector no los acusa como `tiny-text` pero siguen en 11,2 px |
| 11,2 px (`0.7rem`) | Orientador, "Pregunta 1 de 3" y "Tu siguiente paso" | `components/Orientador.tsx:153`, `:183` | — | 4 en `/` |
| 11,5 px (`0.72rem`) | `/coaching` "Día 1 / Día 2…" de la primera semana | `app/coaching/page.tsx:109` | "Día 1" | 3 |

Nota: la línea de arriba contradice lo anotado en el briefing ("letra mono a 12 px"): lo medido es 11,2 px en los eyebrows, y 9,9–10,4 px en los tres puntos de la primera y segunda fila. CONOCIDO solo en parte (R18 tocó la letra mono pero estos quedaron). Para accesibilidad lo importante: el mínimo medido es 9,9 px.

### 4.2 Otros reales
- **`hero-eyebrow-chip` con "Est. 2026 — Guaduas, Colombia"** (`app/page.tsx:44`): la regla acierta (hay un chip de mayúsculas espaciadas sobre el h1) y el texto "Est. 2026" ya está en la lista de abiertos → **CONOCIDO**.
- **`italic-serif-display` en h2 "Suda. Respira. Sigue."** (`/la-app`, 1440 px, y=2702): **CONOCIDO** (la frase está en la lista de abiertos); la regla como tal es JUICIO.

### 4.3 Patrones de "plantilla" que el detector marca y que son JUICIO (para el revisor A, no defectos mecánicos)
| Regla (total) | Dónde | Observación |
|---|---|---|
| `kicker-above-heading` (31) | casi cada sección: "Por dentro de la app", "Tres preguntas", "Gente que ya entrena con AVI", "Si quieres acompañamiento", "Planes y precios", "Lado a lado", "Cómo empieza", "Tu primera semana", "Después", "Qué incluye", "Quién te acompaña", "Por dentro", "Qué hace"… | Es el mismo recurso (mini rótulo en mayúsculas encima de cada `h2`) repetido en las 4 páginas. 5–6 por página a 390 px. |
| `all-caps-body` (20) | `.eyebrow`, `.vlabel` (`app/page.tsx:109`), rótulos de `Resultados.tsx:145`, tarjetas de Coaching (3781/4284 px), pie (`Footer.tsx:16`) | Mayúsculas en 31–49 caracteres. |
| `overused-font` (8) | todas | Plus Jakarta Sans = 46 % del texto en `/`, 62–80 % en las otras. Es la fuente de marca. |
| `italic-serif-display` (7) | h1 del héroe (`/`, 48 px y 96 px), h1 de `/precios`, `/coaching`, `/la-app` (80 px), h2 "Tu próxima rutina lleva tu nombre." (64 px) | Es la `<em>` dorada en Fraunces cursiva de cada título: identidad de marca (el briefing la fija). |
| `hero-eyebrow-chip` (5) | los 4 héroes | Eyebrow de mayúsculas espaciadas sobre el h1. |
| `gpt-thin-border-wide-shadow` (4) + `dark-glow` (4) | `/precios`, tarjetas "El que más recomiendo" y "¿Estás en Guaduas?" | Borde de 1 px + sombra de 80 px (`app/precios/page.tsx:234`), y halo dorado de la insignia (`:239`, `shadow-[0_8px_20px_-6px_rgba(232,197,71,.7)]`). |
| `radial-spotlight-glow` (2) | héroe de `/` | `app/page.tsx:33`, degradado radial dorado a 10 %. |
| `em-dash-overuse` (2) | `/precios` | 13 rayas largas en el cuerpo (el detector lo trata como advisory). |
| `nested-cards` (18) | `/precios`: `PagoBreB.tsx:57` (caja `rounded-2xl` dentro de la tarjeta oscura) y la tabla comparativa dentro de otra superficie; `/coaching`: `app/coaching/page.tsx:108`, `:138`, `:250` | En `/coaching` es **probable falso positivo** (la capa externa es un `Reveal` que solo anima, sin superficie propia); no lo verifiqué con más pruebas. En `/precios` sí hay una caja con borde dentro de una tarjeta con borde. |

## 5. Falsos positivos (con su razón)

1. **`low-contrast` "#f7f3ea sobre #f7f3ea" a 1,0:1 y "#e8c547 sobre #f2ecdd" a 1,4:1 (22 hallazgos)**: títulos, subtítulos y eyebrow de los héroes de `/precios`, `/coaching`, `/la-app` (`components/PageHero.tsx`) y el cierre de `/` ("Tu próxima rutina lleva tu nombre", `app/page.tsx`). El detector resolvió el fondo al crema del `body` porque el fondo real es una `<Image fill className="-z-10">` + `bg-forest/70` + `scrim-bottom`. Se ve claro en la captura `precios-cel-0-pantalla.jpg` y `inicio-cel-3.jpg`: texto crema/dorado sobre verde oscuro, legible. **No es un defecto.**
   - Aviso de método para el revisor A: eso no dice que el contraste del dorado sobre la foto sea alto en toda la imagen; solo que el detector no sabe medirlo. Es una medida pendiente por píxeles si importa.
2. **`body-text-viewport-edge` (7)**: los `figcaption` de la galería horizontal (`components/AppGallery.tsx:121`, `overflow-x-auto snap-x`). Están fuera de pantalla a propósito (carrusel con scroll); el detector los cuenta como "se salen -118/-382/…px". Esperado.
3. **`clipped-overflow-container` (2)**: foto con `Parallax` dentro de `overflow-hidden` (`app/la-app/page.tsx:144-154`). Es el recorte intencional del efecto.
4. **`edge-flush-cards` (1, solo /la-app 1440)**: marcos de teléfono pegados al borde izquierdo del carrusel "en reposo" (3 px). Es el carrusel con `-mx-5`; en escritorio hay 3 px de margen. Rareza visual mínima, no defecto.
5. **`all-caps-body` sobre `.vlabel` a 390 px** (`app/page.tsx:109`): el elemento es `hidden lg:block` y `aria-hidden` (ancho 0 en móvil) y el detector igual lo cuenta; en 1440 px es una etiqueta vertical decorativa.
6. **`flat-type-hierarchy` en el HTML construido (6)**: falso por no cargar el CSS (ver 2.1).
7. **`nested-cards` en `/coaching`**: probable falso (ver 4.3).

## 6. Run notes

- **Detector por línea de comandos**: funcionó a la primera con `sh …/impeccable detect --json app components` (Git Bash). Salida 0, JSON `[]`, guardado en `B-detector.json`. Validado con controles `.html` y `.tsx`.
- **`live-server`**: `impeccable live-server --background` arrancó en el **puerto 8400** (pid 10292). Detenido con `impeccable live-server stop` ("Stopped live server on port 8400"); luego `/health` ya no responde y no queda ningún `LISTENING` en 8400 (solo conexiones `TIME_WAIT`). Detalle: el comando `stop` imprimió dos avisos "config_missing" al intentar quitar la línea del script de `live.js` del HTML de entrada; es inofensivo aquí porque la web local es un build de Next y yo nunca inyecté `live.js` en un archivo del repo (solo cargué `detect.js` en la pestaña).
- **Incidente menor**: mi primera llamada combinó `live-server --help` con `live-server --background` en una sola línea; el segundo quedó esperando y la herramienta lo movió a segundo plano (tarea `bt3c22c2j`, que luego terminó sola). No dejó un segundo servidor.
- **Chrome / CDP**: Chrome headless por CDP en el puerto 9562 con `--user-data-dir` en `%TEMP%`; patrón de `scripts/verificar-movil.mjs` (módulo `ws` de avi-web). Para cada una de las 8 combinaciones: navegar, scroll completo para que corran las animaciones `Reveal`, comprobar mutación (`document.title` + `<script>` añadido → `true` en las 8), inyectar `http://localhost:8400/detect.js` (`onload` verdadero en las 8), esperar 3,5 s y leer consola. Chrome se cerró con `Browser.close` y después comprobé que no queda ningún `chrome.exe` con mi `user-data-dir` ni nada escuchando en 9562.
- **Lo que casi falla**: la primera lectura de consola solo traía el título del grupo ("N anti-patterns found") porque el detector lista los hallazgos con `console.group` y mensajes internos; capturé todos los `consoleAPICalled` y resolví el elemento de cada mensaje con `Runtime.callFunctionOn` para sacar selector, texto y sección. Un detalle de mi script: el selector que imprimí reemplaza la letra "s" de los nombres de clase por "." (error de escape en una plantilla de JS), por eso en las salidas crudas se ve "ju.tify" o "ri.e"; en este informe cité los archivos:línea reales leídos del código fuente, no esos selectores.
- **Medición extra** (`getComputedStyle`, 390 px, solo lectura): barrido de todo texto visible con `font-size < 12 px` en las 4 páginas; sus cifras están en 4.1.
- **Detector sobre HTML construido**: dio avisos "could not read linked stylesheet" (ver 2.1); lo traté como evidencia de apoyo, no sustituye a la pasada del navegador.
- **Fallback usado**: ninguno. CLI, mutación e inyección en navegador funcionaron.
- **Limitación honesta**: el detector no sabe medir contraste de texto sobre imagen/degradado (FP 5.1), así que el contraste real del héroe y del cierre de `/` sobre las fotos **no** quedó medido por esta vía. R18 ya cubrió contraste.
- **Archivos temporales**: borrado el directorio `.impeccable/` que el `live-server` creó dentro de `avi-web` (no existía antes), los directorios `impeccable-b-chrome-*` de `%TEMP%` y los archivos de control del scratchpad (`ctrl.html`, `ctrl.tsx`). No se editó ningún archivo del producto. Dejé en esta carpeta, como evidencia: `B-detector.json` (CLI), `B-detector-html-build.json` (apoyo) y este informe. Los datos en bruto del navegador están en el scratchpad de la sesión (`b-browser-out.json`).
