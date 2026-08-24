# Cómo retomar esta ronda (escrito 2026-08-23, 22:0x)

**Estado: 5 de 6 áreas entregadas.** A1, A2, A3, A5 y A6 están commiteadas.
**Falta A4 (motor deportivo y nutrición).** Se lanzó y quedó CORRIENDO al cortarse la sesión;
su archivo `A4-deportivo.md` puede estar a medio escribir (escribe incremental a propósito).

## Al retomar, en este orden
1. `ls -la docs/auditoria-areas-2026-08-22/` y mirar el tamaño de `A4-deportivo.md`.
   Si tiene «Lo que NO alcancé a revisar» al final, está completo → commitear.
   Si no, **relanzar A4** con el mismo encargo (ver el prompt en el commit `6d2a561` y la nota
   de sesión): rol Diego Ramírez NSCA-CSCS, leer `../auditoria-areas-2026-07-31/_BRIEFING.md` y
   su informe de julio, delta v418→v527, CORRER el motor (no leerlo), read-only,
   **crear el archivo temprano y añadir cada hallazgo al cerrarlo**.
2. Con las 6, escribir el `README.md` (separando lo MEDIDO de lo que solo reportó un agente)
   y `OPORTUNIDADES.md`, como en la ronda de julio.

## Lo que ya está decidido y NO hay que re-discutir
- El PO no persigue a quien no continuó (11 de esos 12 nunca pagaron): quiere VENDER A NUEVOS.
- El objetivo operativo de un asesorado nuevo son 8 días entrenados en su primer mes.

## Colas abiertas de esta ronda (verificadas por mí, no solo reportadas)
- 🔴 **2 de septiembre: se vencen Astrid, Claudia, Kathe y Luz — 560.000 COP el mismo día.**
  Antes: Nataly el 31-ago. Después: Miguel el 3, Samuel el 5. No necesita código.
- 🟠 **Valery** (auto-registrada 2-ago, 8 sesiones) está en `premium` regalado y no paga. 0 horas.
- 🟠 **La vitrina tiene 1 tarjeta de 6** y hay 8 asesorados con historia lista. 0 horas.
- 🟠 **El escáner de códigos de barras tiene 0 filas en producción** (medido). 49 commits.
- 🟠 A3 H3: el `.catch` del Service Worker sigue sin poner. **Medido: NO es lo que impide que
  v525/v527 lleguen a un teléfono** (los 11 casos son Android, todos en la versión del día;
  el reintento funciona). Es higiene de una línea, no una urgencia.
- ⚠️ **La app no registra qué versión trae cada teléfono salvo cuando hay un error**, así que
  hoy no se puede saber si el arreglo del botón «Volver» ya llegó. Decisión del PO.
