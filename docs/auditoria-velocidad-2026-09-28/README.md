# R16 «PESO Y VELOCIDAD» — veredicto (28-sep-2026)

Pedido del PO: *«¿hemos hecho alguna revisión de código muerto, código que haga lenta la app o features
que podamos mejorar?»* → nunca se había hecho. Tres áreas (V1 arranque y red, V2 pantallas y memoria,
V3 código y peso), más la verificación del orquestador con los DATOS REALES del respaldo
(`VERIFICACION-datos-reales.md`), porque V2 midió con historiales inventados más grandes que los reales.
Todo medido en un teléfono de gama media EMULADO (CPU ×4, «4G lenta» de 1,6 Mbps). Ningún teléfono real.

## Lo que la persona siente, en orden

| # | Qué pasa | A quién | Medido | Propuesta | Quién decide |
|---|---|---|---|---|---|
| 1 | **Cada vez que se abre AVI, la pantalla de carga se queda 2,8 s a propósito** (`app-1-infra.js:1751`, `setTimeout(2800/3200)`, «+1 s a la pantalla de carga» del 8-jun). Toda la app espera DETRÁS de ella, sin hacer nada. | Todos, todos los días | 2.800 ms de los 5.217 ms que tarda en abrir con sesión guardada (54 %) | Que la app arranque MIENTRAS se ve la marca, y que la pantalla dure un mínimo corto (~1 s) → **~2 s menos en cada apertura** | **PO**: ¿cuánto quieres que se vea la marca? |
| 2 | **Instalar AVI por primera vez baja 1,8 MB de video y fotos del login**, más que todo el código (1 MB). El video de fondo (1,4 MB) arranca solo (`autoplay`) y anula su `preload="metadata"`. | Cada asesorado nuevo, justo cuando menos señal suele tener | 1.822 de 2.918 KB; en 4G lenta, **~7 s** solo el video | Comprimir el video a ~200-400 KB (misma sensación) o que no arranque solo | **PO**: ¿el video es parte de la marca? |
| 3 | **«Cargas» del coach deja la app sin responder medio segundo** cada vez que se abre (recorre el historial COMPLETO de los 26 asesorados de una vez). | El coach | **445-847 ms con los datos reales**; 1,4-1,9 s cuando el historial crezca | Pintar primero y calcular por tandas para que el teléfono respire | Técnica |
| 4 | **Cada versión que publicamos obliga a todos a volver a bajar la app entera** (~1 MB comprimido), aunque cambien 2-3 archivos: la versión es una sola para todo (`?v=NNN`). Este mes: **34 versiones en 28 días**. El catálogo de ejercicios, que casi nunca cambia, es el 59 % de un archivo (235 KB). | Todos, la primera apertura después de cada publicación | ~1 MB por publicación (≈5 s en 4G lenta) — **ESTIMADO, por medir** | Versión por archivo: solo se baja lo que cambió | Técnica (medir primero) |
| 5 | Las cuentas que recorren todo el historial se repiten en cada toque (marcar una serie, repintar el guiado, abrir una ficha). **Hoy no se siente**; crece con el historial. Incluye un costo que metí yo en v681 (la barra: 6-12 ms por toque). | Quien más entrena | Marcar serie **77-97 ms** hoy (borde de los 100); 180-345 ms con 365 sesiones | Calcular una vez por sesión y reusar | Técnica |
| 6 | ❓ **Primera visita con red lenta: la app puede quedar a medio arrancar** (muestra el login a los ~15 s, pero sin tema, sin el guardia del botón atrás ni el service worker). Reproducido SOLO en emulación, con 5 controles; causa sin cerrar. | Quien instala con mala señal (si pasa en teléfonos reales) | — | **Investigar antes de tocar** (V1 no propone parche a ciegas) | Técnica |

## Lo que NO es problema (medido)
- **Código muerto: casi nada.** De 1.595 funciones, 3 están muertas de verdad (367 bytes). 2 de las «7 sin
  referencia» del baseline se ejecutan solas al cargar (`_aviMudanza`, `_aviLlegada`): el baseline se
  equivocaba ahí. CSS sin usar: 2,7 KB de 228 KB (1,2 %). Lógica duplicada entre módulos: cero.
- **Los comentarios (37 % del código) no hacen lenta la app.** Quitarlos al publicar, medido en 12
  corridas con control: el efecto cae dentro del ruido (+24 ms en una métrica, −5 ms en la otra). **No se
  construye ese paso.**
- **El uso diario va por el service worker: 0 KB por la red** al reabrir. La promesa de abrir sin internet
  se cumple.
- **Memoria:** sin fuga visible en 20 ciclos de navegación (prueba corta; no descarta sesiones de horas).
- **Con los datos reales de hoy**, Inicio del coach (32-90 ms), la lista de asesorados (11-54 ms) y repintar
  el guiado (21-59 ms) están bien. Las cifras grandes de V2 son el futuro, no el presente.

## ✅ Hecho
- **#1 (v683):** la marca 1 s (decisión del PO) y el arranque espera a TODOS los módulos. Reabrir la app:
  4,0-5,0 s → 1,5-1,6 s (medido en local, mismo equipo).
- **#6 CERRADO (v683):** la causa del «a medio arrancar» era una carrera del arranque (la cadena corría antes
  de que cargaran app-3…7) que la espera fija escondía cuando la red era buena. Control: v682 con 4G lenta
  nunca terminaba de arrancar; v683 sí.

- **#2 (v684):** el video del login solo se carga cuando el login se ve. Comprimir sin perder calidad no daba
  más de un 30 % (medido con VMAF), así que no se tocó un pixel. Ya no lo baja quien tiene sesión ni compite
  con el código en la primera visita.

- **#3 (v685):** «Cargas» por tandas y cada tarjeta arma sus filas al abrirse; la silueta como imagen. Con los datos
  reales, la tarea más larga ~800 → ≤82 ms.

- **#5, la parte de la barra (v686):** la identidad se arma una vez por guardado (17,1 → 9 ms). El resto de #5
  (memoizar la identidad para todas las cuentas) se deja: hoy no se siente y un caché global mal invalidado es riesgo.

## Orden recomendado
1. **Decisiones del PO:** la pantalla de carga (#1) y el video (#2). Son las dos que más se sienten y las
   dos más baratas.
2. **Lote técnico A:** «Cargas» por tandas (#3) + calcular una vez (#5, incluida mi deuda de v681).
3. **Medir primero, después decidir:** la versión por archivo (#4) y la primera visita con red lenta (#6).
4. **La sesión de 10 minutos con el teléfono del PO** sigue pendiente: todo esto es emulado.

## Informes
`V1-arranque-red.md` · `V2-pantallas-memoria.md` · `V3-codigo-peso.md` · `VERIFICACION-datos-reales.md` ·
`_BRIEFING.md`. Sondas: `scripts/e2e/_medir-arranque.mjs`, `_r16-v1-*.mjs`, `_r16-v2-*.mjs`, `_r16-v3-*.mjs`,
`_r16-verif-real.mjs` (carga el respaldo SOLO en memoria local; no lo copia).
