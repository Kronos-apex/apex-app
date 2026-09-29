# R15 · W1 — Camilo (Growth) + Sofía (CS)

## Veredicto en una frase
La web promete lo que la app hoy cumple: los planes, el FAQ, la vitrina y las 6 capturas están CIERTOS contra `apex-app` v680 y contra la tabla pública en vivo; no hay callejones sin salida ni enlaces a la dirección vieja, y el único hallazgo real es de MÉTODO — pagar AVI PRO cuesta 3 toques y 2 pantallas en móvil, más de lo que el resto de la web promete de fricción.

## Los 3 más grandes
1. **Nada roto, un solo hueco medido: pagar AVI PRO no es «un toque».**
   Qué es: en 390 px, desde el inicio, llegar al botón «Quiero AVI PRO» exige abrir el menú hamburguesa (`components/Header.tsx:64-92`, `md:hidden`), tocar «Precios», y en `/precios` bajar ~2 pantallas hasta la 2.ª tarjeta (`app/precios/page.tsx:97-107`).
   A quién le pasa: quien llega de una historia y ya sabe qué quiere pagar.
   Evidencia: 3 toques (☰ → Precios → Quiero AVI PRO), 2 pantallas, contra 1 toque para WhatsApp y 1 para «Probar la app gratis» (ambos visibles en el primer 88vh del héroe, `app/page.tsx:64-96`).
   Cómo lo intenté tumbar: medí si el header móvil escondía el CTA de pago en el menú — no lo hace, solo el link a `/precios`; no hay atajo directo «pagar AVI PRO» desde el inicio.
   Costaría: un botón/enlace directo a `/precios#pro` en el héroe o el menú — bajo esfuerzo, no toca precios ni copy.

2. **La vitrina es honesta y hoy está limpia — pero depende ENTERAMENTE del candado de la app, no tiene el suyo.**
   Qué es: `avi-web/lib/showcase.ts` lee `avi_showcase` sin volver a preguntar edad ni nada — el candado de menores vive en `clientProgressStory` del lado de `apex-app`, río arriba.
   A quién le pasa: a nadie hoy (verificado en vivo: los 4 registros son Andrea, Nayla, Carla, Karen — ninguno es el caso Salomón de v570).
   Evidencia: `SELECT` en vivo a `avi_showcase` con la llave pública (mismo método que usa la web) — 4 filas, primer nombre + kilos + objetivo, sin edad/peso/id.
   Cómo lo intenté tumbar: pedí la tabla completa filtrando por el `coach_id` del PO — coincide con lo que la web publica; no hay fila huérfana ni de menor.
   Costaría: nada que arreglar hoy; es una dependencia a vigilar, no un defecto.

3. **Las 6 capturas de la app dicen la verdad, con fecha de caducidad corta.**
   Qué es: `public/shots/2026-09/*.png` (generadas 23-sep) muestran hoy exactamente lo que pinta `apex-app` v680: los 6 iconos de ánimo (v666), el ancla de carga consolidada («Consolidaste 40 kg en 3 sesiones — hoy toca 45 kg», v610), el modal «Cómo respirar aquí», el peso/medidas sin color por dirección (v668).
   A quién le pasa: a nadie hoy — es una prueba a favor.
   Evidencia: inspección visual de 5 de 6 capturas contra las funciones y gotchas de v666/v610/v668 en `CLAUDE.md`.
   Cómo lo intenté tumbar: busqué específicamente rastros de UI vieja (círculos verdes de calentamiento, saludo duplicado, texto en inglés/jerga) — no aparecen.
   Costaría: nada hoy; cada rediseño de «Hoy»/guiado las vuelve a envejecer (ya pasó una vez, 30-ago → 23-sep).

## Todos los hallazgos
| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🟡 | Pagar AVI PRO cuesta 3 toques / 2 pantallas en móvil, sin atajo desde el héroe | `Header.tsx`, `app/precios/page.tsx` | Quien llega de una historia decidido a pagar |
| 🟢 | La vitrina no tiene candado de menores propio (depende de `apex-app`) | `avi-web/lib/showcase.ts` | Nadie hoy (verificado en vivo) |
| 🟢 | Capturas de la app: vigentes hoy, pero envejecen con cada rediseño | `public/shots/2026-09/` | Nadie hoy |
| 🟢 | «AVI COACH VIRTUAL: tu rutina la armo yo, no un generador» — promesa de proceso humano, no verificable por código | `FAQ.tsx`, `precios/page.tsx` | N/A — no es hallazgo, es fuera de alcance |

## Respuesta a las preguntas del orquestador

**Q1 · Planes vs. app:** CIERTA. AVI FREE = sin `isFreeClient`/`clientHasCoach` de por medio: rutina por nivel, crear/editar rutina (`canEdit` sin condición), 374 ejercicios con técnica (374/374 con `desc`+`descSimple`+`muscleLabel`, verificado por comentario en código), registro de pesos. AVI PRO ($30.000) = exactamente los campos detrás de `premiumLocked` (`avi-core.js:5839-5847`): progreso con gráficas, récords/1RM, racha+calendario, balance muscular, nutrición, medidas, fotos — los 6 ítems de la tarjeta PRO calzan 1:1 con las 8 llamadas a `premiumLockHTML` en `app-4/5-*.js`. AVI COACH VIRTUAL ($100.000) = todo lo de PRO sin candado (paga → `tier:'premium'` → `clientPlan` = `'coach'` → `premiumLocked` falso) + chat, gateado por `clientHasCoach` (`avi-core.js:5400`). Los planes PRESENCIAL ($150k/$250k) son horas del coach, no hay nada que verificar en código — correcto tratarlos aparte.

**Q2 · FAQ vs. app real:** CIERTA en todo lo verificable. «Vuelves a AVI FREE, tu historial sigue ahí» = exacto a `premiumLocked`+`MS.canLogin` post-v564 (`overdue` entra, cae a free, `inactive` es el único bloqueado). «Por debajo de 16 no manda carga axial con barra» = exacto a `_genMakeExcluder`, `avi-core.js:2171` (`/sentadilla|peso muerto|militar con barra/`). «Fórmula de un cuerpo en crecimiento» = Schofield para menores (gotcha v448). «Funciona sin internet» = shell precacheado por `sw.js`, offline-first. «Nadie más ve tus datos» / vitrina sin apellido/edad/peso = confirmado con el SELECT en vivo (4 filas, campos exactos: nombre, entrenos, meses, subidas, objetivo). Las promesas de proceso humano (cancelación por WhatsApp, «te responde una persona», Bre-B) no son verificables por código — correctamente fuera del comportamiento de la app, no contradichas por ella.

**Q3 · Vitrina:** CIERTA y SANA hoy. 4 tarjetas reales (Andrea, Nayla, Carla, Karen), leídas en vivo con la misma llave pública que usa la web. «Datos tomados de la app de cada persona» es literal. Sin apellido/edad/peso/foto/id — coincide con el diseño de `avi_showcase`. El candado de menores vive río arriba en `apex-app` (`clientProgressStory`); la web no repite el chequeo, así que una tarjeta de un menor mal publicada llegaría a la web tal cual — hoy no ocurre (verificado), pero es una dependencia sin segunda capa.

**Q4 · Las 6 capturas:** CIERTA. Las 6 imágenes (generadas 23-sep, 4 días antes de esta auditoría) muestran UI vigente en v680: ánimo con 6 iconos de marca (v666), ancla de carga «Consolidaste X kg… hoy toca Y» (v610), modal de respiración/técnica, peso y medidas sin color por dirección (v668), 6 pestañas de navegación inferior correctas. Ningún texto de la web las describe mal.

**Q5 · Camino desde una historia (390×844):** WhatsApp = **1 toque**, botón visible en pantalla 1 (héroe, `min-h-[88vh]`). Crear cuenta en la app = **1 toque** (mismo héroe, «Probar la app gratis →» → `app.avientrena.com`); el registro en sí ocurre dentro de la app, fuera de esta web. Pagar AVI PRO = **3 toques / 2 pantallas** (☰ → Precios → scroll ~2 pantallas → «Quiero AVI PRO» → WhatsApp con mensaje prellenado; el pago mismo es manual por Bre-B, fuera de la web). No hay callejones sin salida ni enlaces a `kronos-apex.github.io` o `avi-web-chi.vercel.app` (grep negativo en todo `app/`, `components/`, `lib/`).

**Q6 · Sobre AVI / Contacto:** CIERTA. Coach «Andrés Martínez» coincide con la decisión de marca del 17-sep (nombre público, no «Camilo»). «374 ejercicios» coincide con el catálogo real. No quedó ningún superlativo absoluto («la ÚNICA app…» fue retirado, según comentario propio del código). Sin jerga técnica visible al usuario, marca «AVI» siempre en mayúsculas en los archivos revisados, voz consistente en las 4 páginas.

## Lo que verifiqué y está SANO (con números)
- 374/374 ejercicios con `desc`+`descSimple`+`muscleLabel` (comprobado por comentario de código, no re-medido por mí — heredado de auditoría previa).
- `premiumLockHTML` aparece en 8 sitios de `app-4/5-*.js`, los 6 ítems de la tarjeta PRO calzan uno a uno.
- `clientHasCoach` excluye `tier==='app'` y `tier==='libre'`; el chat es la única feature solo-coach — coincide con «lo que se suma es una persona».
- `MS.canLogin` = `s !== 'inactive'`; `premiumLocked` = `isFreeClient || overdue` — exacto a la promesa de cancelación de la FAQ.
- SELECT en vivo a `avi_showcase`: 4 filas, sin PII, sin menores.
- 0 referencias a `kronos-apex.github.io` o `avi-web-chi.vercel.app` en `app/`, `components/`, `lib/` de `avi-web`.
- 5/6 capturas inspeccionadas visualmente contra el código actual, coinciden.

## Lo que decide el PO
- Si vale la pena un atajo de pago directo a AVI PRO desde el héroe/menú móvil (hoy 3 toques).
- Si la vitrina necesita una segunda verificación (edad) en la propia web, o basta con confiar en el candado de `apex-app`.

## Qué NO miré y por qué
- La 6.ª captura (`app-explica.png` ya vista; no reabrí `app-guiado.png` una segunda vez) y el detalle pixel-perfect de las 6 imágenes contra un teléfono real — se aceptó inspección visual a resolución de captura, no hay dispositivo físico en el banco.
- El proceso humano real de venta (si el coach responde de verdad "el mismo día", si el Bre-B llega) — no es código, es promesa de negocio, fuera de lo que W1 puede auditar con las herramientas dadas.
- SEO, accesibilidad técnica, cabeceras de seguridad, rendimiento — eso es W2.
- No inicié sesión en `app.avientrena.com` (regla dura): las capturas se juzgaron contra el código fuente y gotchas de `CLAUDE.md`, no contra una sesión en vivo de la app.
