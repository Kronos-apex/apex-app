# R13 · Lesiones: la matriz completa — estado (25-sep, noche)

**EN CURSO. No es un veredicto consolidado todavía.**

| Informe | Estado |
|---|---|
| `G2-lo-que-llega.md` (Mateo + Lucas) | ✅ Completo. Verificación del orquestador: parcial (abajo) |
| `G1-matriz.md` (Laura + Coach Pro) | ⏸️ **Cortado por el límite de sesión** a mitad (Q1 escrita, Q3 corriendo, Q4 sin escribir). Retomar con `SendMessage` al agente `aafb94381de261ff0` y la orden de escribir PRIMERO lo que ya tiene |

## Verificado por el orquestador contra el código (25-sep)

- ✅ **CIERTO — `_painForEx` (`app-6-extra.js`, la marca 🩹 en vivo del guiado) lee SOLO `painCare`.**
  `painCareActive(c.painCare)` vacío → `return null`, antes de mirar nada más. Nunca llama a
  `limitationsFor` ni a `parseLimitations`. Una limitación que vive en las NOTAS no marca nada
  mientras se entrena.
- ✅ **CIERTO — `renderDetailRoutines` (`app-3-coach.js`, la lista de rutinas de la ficha del coach)
  calcula `limitationsFor(c).keys` y lo usa SOLO para `buildWarmup`.** Los ejercicios de la rutina
  no se marcan.

## Pendiente de verificar antes de llevárselo al PO

- `rfExRow` (editor de rutina) sin marca de contraindicación.
- Laura Ramírez: los ids de codo (e11/e69/e75/e81), cuello (e23/e69/e18/e62/e75/e184) y rodilla
  en su plan real.
- Pool colapsado a 1 (e89 Laura, e133 Danilo) en el barrido de 80 semillas — y el slot que lo causa.
- `e15` Curl Femoral en la rutina del martes del PO con isquios vigente.
- G1: «espalda alta» → `cuello` deja vivos los remos y jalones; `rodilla` con `sentadilla` suelto
  se lleva el wall-sit (`e128`) y el sit-to-stand (`e158`), que el dictamen de Laura declara
  terapéuticos. **Contradice lo que el repo da por cerrado desde v424: medirlo antes de creerlo.**

## Decisiones que serán del PO / de Laura (no del código)

- Qué zonas nuevas entran a `GEN_LIMIT_KWS` (las notas hoy solo reconocen rodilla/lumbar/hombro/
  genérico).
- Si la marca en vivo y la ficha del coach deben leer también las notas (regla de la casa: lo que
  arma el coach se MARCA, no se quita).
