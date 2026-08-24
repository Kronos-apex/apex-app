# Auditoría por áreas — 22/24 de agosto de 2026

**6 de 6 áreas entregadas.** Delta auditado: **v418 → v527**. Todas read-only: ninguna tocó la app
ni una fila de la base.

| # | Área | Quién | Su hallazgo más grande |
|---|---|---|---|
| A1 | Código y deuda técnica | Julián (QA) | 🔴 El gate que existe para que nadie se quede mirando una pantalla pegada **aprueba justo ese caso** |
| A2 | Base de datos y seguridad | Andrés (DBA) | 🟠 Un mismo teléfono acumula filas de notificación: **a Nataly cada recordatorio le llega 8 veces** |
| A3 | Móvil y PWA | Julián (QA) | 🟠 **8 campos más** daban el zoom de iPhone que reportó Kathe → **cerrado en v527** |
| A4 | Motor deportivo y nutrición | Diego R. (NSCA-CSCS) | 🟠 El nivel se corrige hacia adelante y **nunca cura los planes ya escritos** |
| A5 | Experiencia y fricción | Sofía (CS) | 🔴 **El rediseño de «Hoy» no le llega a quien nunca ha entrenado** |
| A6 | Negocio y producto | Camilo (Growth) | 🔴 **El 2 de septiembre se vencen cuatro asesorados el mismo día: 560.000 COP** |

---

## Lo que está MEDIDO y lo que solo está REPORTADO

Esta separación existe porque en la ronda de julio media lista de un subagente resultó ser humo.
Lo de abajo lo verifiqué yo mismo contra producción o corriéndolo, **después** de que el área lo
reportara.

### Verificado por el orquestador (no heredado)

- **A6 · agosto son 890.000 COP de 9 personas** (julio 746.000). Reproduce exacto.
- **A6 · el 2 de septiembre vencen Astrid, Claudia, Kathe y Luz — 560.000 COP.** ⚠️ **A6 lo puso el
  1-sep y son 4, no 5.** Antes: Nataly el 31-ago. Después: Miguel el 3, Samuel el 5.
- **A6 · el escáner de códigos de barras tiene 0 filas.** Nunca se ha usado. Coincide con A2.
- **A6 · la vitrina tiene 1 tarjeta de 6 huecos.** Comunidad, 44 publicaciones.
- **A6 · Valery** (auto-registrada, 8 sesiones) está en `premium` y **no ha pagado nunca**.
- **A4 · H4: son exactamente 4 filas y ninguna más**, cruzando los 18 ids de nivel `A` contra
  `user_data.routines`. Todas generadas por el motor; **ninguna hecha a mano por el coach**.
  Dato que A4 no dio: **las dos personas tienen 0 sesiones**, así que hoy no lo ejecuta nadie.
- **A3 · H1 (los campos bajo 16 px): reproducido, y eran 8, no 11** — los cinco `<select>` del
  registro están ocultos y nunca reciben el foco. **Cerrado en v527.**

### 🔴 Corregido: un titular de área que NO se sostiene

**A3 dice que el fallo del Service Worker puede impedir que v525/v527 lleguen al teléfono de
Kathe. Lo medí y no es así.** Los 11 casos son de teléfonos **Android** (Kathe tiene iPhone) y cada
uno estaba corriendo **la versión de ese mismo día**: el reintento funciona, son tropiezos de red.
Tampoco quema la cuota de errores — nadie pasa de 3 errores al día. Sigue siendo una línea mal
escrita, pero **no es una urgencia y no explica nada sobre la entrega de versiones**.

### Reportado por el área y NO re-medido por mí

Todo lo demás. En particular los barridos de A4 (5.760 planes), los tiempos de sesión de A5 (81
sesiones), la instrumentación de la suite de A1 y las impersonaciones de A2. Cada uno trae su
evidencia con `archivo:línea` y su «intenté tumbarlo así» dentro de su informe.

---

## Lo que dos áreas encontraron por separado

Cuando dos auditores que no se hablan llegan a lo mismo por vías distintas, el hallazgo pesa más:

1. **La app promete una duración que no cumple.** A4 lo midió desde el motor (promete ~43 min, la
   sesión real dura 56, el 44 % pasa de la hora); A5 lo midió desde las sesiones reales (mediana
   62,2 min contra 40 prometidos, 70 de 81 más largas). **Es el texto menos cierto de la app.**
2. **Las notificaciones duplicadas de Nataly.** A2 lo vio en la tabla (8 filas para un endpoint);
   A3 lo vio desde el lado del teléfono. Mismo defecto, dos ángulos.

---

## Lo que NO cubre esta ronda

- **Nada se probó en un iPhone.** No hay uno en el banco de pruebas, y el reporte que arrancó todo
  esto era de un iPhone.
- **No hay forma de saber en qué versión va cada asesorado**: la app solo registra el build cuando
  hay un error. Así que no se puede confirmar que el arreglo del botón «Volver» ya les llegó.
- **A4 no escribió su propio cierre** (se quedó sin presupuesto): su veredicto y su sección de
  alcance las escribió el orquestador, marcadas como tales. Lo que un auditor no alcanza a decir
  que no miró es justo lo que no queda anotado.
- **El pago solo existe si el coach lo anotó**: 8 de 9 pagos de agosto no tienen nota, así que las
  cifras de dinero son un **piso**, no un total.

---

Las decisiones que quedan sobre la mesa, ordenadas, están en **`OPORTUNIDADES.md`**.
El encargo reutilizable está en `../auditoria-areas-2026-07-31/_BRIEFING.md`.
