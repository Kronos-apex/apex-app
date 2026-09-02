# Auditoría por áreas — 2026-09-01/02

**9 de 9 áreas entregadas.** Pedida por el PO: *«antes de seguir me gustaría hacer una auditoría
profunda por áreas, no quiero dejar huecos o puntos muertos.»*

Alcance elegido por él: **el delta v528→v563** (36 versiones que nadie había mirado, incluidos los
+127 ejercicios nuevos y el módulo de dinero entero) **más los 3 puntos muertos** que nunca
tuvieron dueño en las rondas de julio y agosto. Ejecución: un agente por área con su archivo de
rol, solo lectura, cada uno con su informe y su evidencia.

Durante la ronda se desplegó **avi-v564**, que cerró el hallazgo mayor de A8+A5.

## Las áreas

| | Área | Informe | Veredicto |
|---|---|---|---|
| A1 | Código y calidad interna | `A1-codigo.md` | 🔴 un espejo sin candado |
| A2 | Base de datos | `A2-basedatos.md` | 🟡 sano; 3 candados con el UID en duro |
| A3 | Móvil y dispositivo | `A3-movil.md` | 🔴 tres, uno de ellos en el corazón del entreno |
| A4 | Deportivo | `A4-deportivo.md` | 🔴 el filtro de lesiones cubre 3 de 10 zonas |
| A5 | Experiencia de la persona | `A5-experiencia.md` | 🔴 dos promesas rotas y una nota interna a la vista |
| A6 | Negocio y dinero | `A6-negocio.md` | 🔴 el canal de auto-registro no cobra |
| A7 | Legal y datos personales | `A7-legal.md` | 🔴 la app obliga a un menor a mentir |
| A8 | La web de venta | `A8-web-venta.md` | 🔴 promesa incumplida (cerrada en v564) + capturas viejas |
| A9 | Comunidad | `A9-comunidad.md` | 🔴 sin uso humano → **congelada por el PO** |

## Los 3 puntos muertos, cerrados

1. **La web de venta** (`../avi-web`): 0 menciones en las 6 áreas de agosto. Ahora tiene informe.
2. **Legal y datos personales**: 0 menciones en agosto. Ahora tiene informe, y es el área con el
   hallazgo más grave de la ronda.
3. **Comunidad**: 2.230 líneas vivas que A4 mencionó 0 veces y A5 una. Medida y **congelada**.

El cuarto punto muerto —**nada se ha probado nunca en un iPhone**— no se puede cerrar sin un
aparato. A3 hizo lo que sí se podía: auditar el código buscando la familia de defectos que Safari
rompe. Los 6 temporizadores del guiado salieron sanos; lo demás está en su informe.

## Lo que ya se hizo durante la ronda

- **avi-v564 en producción** — vencer ya no es quedarse por fuera: se vuelve a AVI FREE. Cerró la
  promesa que la web hacía por escrito y la app incumplía. Ver `docs/bitacora.md`.
- **Comunidad congelada** — `docs/plan-comunidad.md` (cabecera) y `CLAUDE.md` → ROADMAP.
- **Un fixture de producción reparado** — la propia auditoría lo rompió; ver la nota de método.

## Nota de método (lo que salió mal, y es un hallazgo)

- **Las matrices de sabotaje mutan archivos compartidos sin candado.** Con varios agentes
  auditando el mismo repo a la vez, un `git status` sucio o un test en rojo puede ser el sabotaje
  de otro, no un defecto. Anoche eso dejó **un fixture de RLS roto de verdad** (el asesorado de QA
  apuntándose a sí mismo) y `_verify-rls-aislamiento.mjs` empezó a gritar sobre conducta correcta.
  Reparado a mano y verificado: **16/16**. Es el hallazgo nº2 de A1.
- **Correr 6 agentes en paralelo agotó el límite de sesión** y se cayeron 5 a la vez. La ronda se
  rehízo en tandas de 2. La nota de agosto («con Sonnet entregaron los 4») no se sostuvo.
- **La línea base del briefing envejeció a mitad de ronda** (v563/972 → v564/976). A las dos
  últimas áreas se les pasó corregida.

## Lo siguiente

`OPORTUNIDADES.md` — ordenado por lo que mueve el negocio dividido por lo que cuesta. Ninguna de
esas decisiones es mía.
