# Diseño: Modalidades de entrenamiento en APEX

> Estado: **DISEÑO APROBADO** (2026-05-29) — pendiente de implementar.
> Origen: Andrés detectó en el gym que la rutina de Cardio HIIT del asesorado
> Andrés Martínez pedía **kilos** en vez de un cronómetro; lo mismo con
> ejercicios de peso corporal (rueda abdominal, lagartijas) que pedían kg
> inexistentes.

## Problema raíz

Los ejercicios ya tienen el campo `type` (Compuesto / Aislamiento / Isométrico /
Cardio), pero la UI de registro durante el entreno está **hardcodeada** a tres
columnas para todos por igual (`index.html`, ~línea 4164):

```
SET | KG | REPS | ✓
```

Consecuencias:
- Cardio HIIT pide kilos en vez de cronómetro.
- Peso corporal (lagartijas, rueda) pide kilos que no existen.
- Isométricos/cardio venían "parchados" con descripciones tipo *"reps = segundos/
  minutos"* — workaround confuso para el asesorado.
- El volumen y los PRs se calculan como `kg × reps` y filtran `kg > 0`
  (`index.html` líneas 2304-2305, 4406), así que **cardio y peso corporal hoy no
  registran ningún progreso** — son invisibles en las gráficas.

**APEX solo entiende una forma de entrenar (pesas), pero el coach entrena de
varias formas.**

## Decisión de diseño: campo `track` (modalidad de seguimiento)

Cada ejercicio gana un campo `track` que decide **qué se mide y qué UI se pinta**.

### Cómo se define la modalidad: híbrido (auto-derivado + override)

1. **Auto-derivar** en una migración (igual que `migrateRoutineIds`), desde el
   `type` que ya existe — cero trabajo para los 96 ejercicios actuales:
   ```
   type 'Cardio'      → track 'cardio'   (o 'hiit' si el coach lo marca)
   type 'Isométrico'  → track 'tiempo'
   type 'Compuesto'   → track 'peso_reps'
   type 'Aislamiento' → track 'peso_reps'
   ```
2. **Override** en el formulario de ejercicio: un selector de modalidad para
   corregir cuando haga falta.
3. **Repaso único de peso corporal:** `type` NO distingue peso corporal de pesas
   (lagartijas y rueda hoy son `Compuesto/Aislamiento`, idénticas a un press de
   banca para el sistema). No hay forma 100% automática de saberlo — solo el coach
   lo sabe. Solución: listar candidatos y que el coach los marque con un toque.

## Las 5 modalidades

| `track` | Ejemplos | UI de registro | Métrica de progreso |
|---|---|---|---|
| `peso_reps` | Press banca, curl | `SET · KG · REPS · ✓` (actual) | Volumen kg×reps, PR de peso |
| `reps` | Lagartijas, rueda, dominadas | `SET · REPS · ✓` + toggle opcional **+lastre kg** | Máx reps, total reps |
| `tiempo` | Plancha, hollow | Cronómetro cuenta regresiva + `SET · SEG · ✓` | Segundos aguantados |
| `cardio` | Carrera, bici, elíptica | `MIN · DIST(opc) · ✓` + cronómetro libre | Tiempo, distancia |
| `hiit` | Cardio HIIT | **Timer de intervalos** trabajo/descanso × rondas | Rondas completadas |

### Decisiones de metodología (definidas por Andrés)

- **Peso corporal con lastre OPCIONAL:** por defecto solo reps, con un toggle
  `+kg` para asesorados avanzados (chaleco/cinturón).
- **Default HIIT: 30s trabajo / 15s descanso / 8 rondas** (editable por rutina).

## Modelo de datos (mínimo, sin migración riesgosa)

- **Ejercicio** (`defaultExercises` / `DB.exercises`):
  - `track`: una de las 5 cadenas.
  - `cfg` (opcional, según modalidad):
    - hiit → `{ work: 30, rest: 15, rounds: 8 }`
    - tiempo → `{ holdSecs: 60 }`
    - cardio → `{ targetMin: 20 }`
    - reps → `{ allowLastre: true }`
- **Registro por serie:** ya usa `setLog(routineId, ei, si, field, val)` en
  localStorage (`index.html` línea 4092) con fields flexibles. **No requiere
  migración**: solo se agregan fields nuevos según modalidad (`secs`, `rounds`,
  `dist`, `lastre`). El sistema `logKey` lo soporta tal cual.
- **Historial de sesión** (objeto armado en `index.html` línea 4314): añadir
  `track` + la métrica correspondiente, para que las gráficas sepan qué mostrar.

> No hay migración de BD riesgosa. Solo un `migrateExercises` que setea `track`
> (igual patrón que `migrateRoutineIds`).

## Impacto en progreso y gráficas

Branchear la métrica por modalidad (hoy todo es `kg × reps`):

- `peso_reps` → volumen y PR de peso (actual).
- `reps` → PR de repeticiones máximas, total acumulado.
- `tiempo` → récord de segundos.
- `cardio` → minutos / distancia acumulada.
- `hiit` → rondas completadas / sesiones.

Cada modalidad con su propia gráfica de evolución, no una de kg vacía.

## Timer HIIT — detalles de implementación

- Config por rutina: trabajo / descanso / rondas (default 30/15/8).
- **Pitido + vibración** en cada cambio de fase (en el gym no se mira la pantalla).
- **Wake Lock API** para que la pantalla no se apague durante el timer.
- Pausar / saltar / reiniciar.
- El audio/vibración va en cliente; `sw.js` ya maneja notificaciones push aparte.

## Limpieza incluida

Quitar los parches *"reps = segundos/minutos"* de las descripciones
(`index.html` líneas 1718-1731) — innecesarios cuando la UI sea explícita.

## Plan por fases

- **Fase 1 (rápida):** campo `track` + migración + render condicional. Peso
  corporal = solo reps (+lastre opcional); isométrico/cardio = tiempo. **Mata el
  bug y arregla los datos**, sin timer todavía.
- **Fase 2:** timer de intervalos HIIT + cronómetro de isométricos (lo vistoso).
- **Fase 3:** métricas de progreso por modalidad (gráficas de reps/tiempo/
  distancia, no solo de kg).

## Por qué importa para el negocio

Ninguna app típica de "rutina de gym" trae buen HIIT integrado — la gente usa una
app aparte. Si APEX lo tiene bien hecho, es un diferencial real para el pitch
multi-trainer de v2.0.

## Puntos de código relevantes (referencia para implementar)

- Definición de ejercicios: `index.html` ~1651 (`defaultExercises`).
- Migraciones existentes: `migrateRoutineIds` ~1626, `migrateExercises` ~1780.
- Render de la fila de serie (el bug): `index.html` ~4164 (header de columnas) y
  ~4177 (inputs kg/reps).
- Guardado por serie: `setLog` ~4092, `getLog`/`logKey`.
- Cálculo de volumen/PR: ~2304-2305, ~4406.
- Armado del historial de sesión: ~4314.
- Formulario de ejercicio (agregar selector de modalidad): `index.html` ~1146
  (select de músculo) y ~1149 (series/reps por defecto).
