# Verificación del orquestador con los DATOS REALES (28-sep, tras V2)

V2 midió con historiales **sintéticos** de hasta 220 sesiones por persona (y un peor caso de 365 que
pesa 755 KB). Hoy el máximo real es **91 sesiones** (el coach) y **72** (la asesorada que más entrena).
Antes de ponerle cifras al PO se repitió con lo que HAY: el respaldo del 27-sep cargado SOLO en la
memoria del navegador local (nube sellada en localhost), sin copiarlo a ningún archivo ni imprimir
nombres. CPU ×4, 3 corridas. Sonda: `scripts/e2e/_r16-verif-real.mjs`.

| Pantalla | V2 (sintético) | **Real hoy (ms)** |
|---|---|---|
| Inicio del coach (`renderHome`, 26 asesorados) | 621-892 | **32-90** |
| **Cargas** (`renderProgressPanel`) | 1.400-1.872 | **445-847** |
| Asesorados (`renderClients`) | 227-317 | **11-54** |
| Ficha del que más entrena (72 sesiones) | 1.266-1.971 | **165-364** |
| Marcar una serie (guiado, 7 ejercicios, 3 con barra, 72 sesiones) | 108-345 | **77-97** |
| …de eso, la barra de v681 (`exerciseBarKg` × 3 por toque) | 30-51 | **6-12** |
| `gmRender` completo | 139-561 | **21-59** |

## Lectura
- **Hoy, lo único que una persona siente es «Cargas»**: medio segundo o más con la app sin responder,
  cada vez que el coach abre la pestaña. Es síncrono de punta a punta (una sola tarea).
- **Marcar una serie ronda los 100 ms** con la asesorada que más entrena: en el borde, no por encima.
- **Lo de V2 es el FUTURO, no el presente**: las cuentas que recorren todo el historial crecen con él.
  La asesorada que más entrena acumuló 72 sesiones en 4 meses; al ritmo actual, alguien llega a 365 en ~1,5 años y entonces
  las cifras de V2 dejan de ser hipotéticas. Por eso los arreglos de «calcular una vez» valen, pero no
  son urgentes salvo «Cargas».
- **La barra de v681 (mía, hoy) suma 6-12 ms por toque**: recalcula la identidad de ejercicios sobre
  todo el historial una vez POR CADA ejercicio con barra. Pequeño hoy, crece con el historial.
  Arreglo barato: calcular la identidad una vez por guardado.
- ⚠️ La medición de «tarea larga» con `PerformanceObserver` salió en 0 en varias corridas: el
  tiempo total (síncrono) es el dato confiable aquí.
