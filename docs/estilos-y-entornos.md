# Estilos de entrenamiento + Entornos de equipo — Plan

> **Objetivo de negocio:** que APEX deje de asumir que todos van al gym. Servir a quien
> entrena **en casa, sin equipo o con poco** (la señora de 50 que solo hace peso corporal),
> en el **parque/calistenia**, o en el **gym completo**. Más gente que puede usar APEX =
> más embudo (modo libre) y más asesorados posibles para el coach.

**Estado:** plan aprobado por Andrés (2026-05-30, decisiones abajo). Pendiente de implementar.
**Relacionado:** [[auto-generador-rutinas]] (el generador filtrará por entorno) ·
[[feedback_apex_rutinas]] (criterios del coach) · modalidades de seguimiento (ya implementadas).

---

## 0. Decisiones de Andrés (2026-05-30)

1. **"Estilo de entrenamiento" = preset que combina ENTORNO + METODOLOGÍA.**
   Ej: *"Calistenia en casa"*, *"Hipertrofia en gym"*, *"Funcional con bandas"*.
2. **Entornos a soportar:** Solo peso corporal · Casa con bandas+mancuernas ·
   Aire libre/parque · (Gym completo, que ya existe).
3. ✅ **Video/guía en calentamiento — YA IMPLEMENTADO** (commit 2026-05-30): los 33
   ejercicios de `WARMUP_LIBRARY` tienen `ytQuery` y abren la misma ficha (guía + YouTube)
   que un ejercicio normal, vía `openWarmupDetail()`.

---

## 1. Principio rector — TRES ejes independientes (no mezclar)

Es el error más fácil de cometer. Son cosas distintas:

| Eje | Campo | Qué responde | Ejemplo |
|-----|-------|--------------|---------|
| **Entorno/equipo** | `env: []` | ¿Dónde y con qué puedo hacerlo? | sentadilla goblet → `[casa, gym]` |
| **Objetivo** | `client.goal` | ¿Para qué entreno? (define series/reps/descanso) | Perder grasa → 3-4×12-15, 55s |
| **Monetización** | `tier` (§3.5) | ¿Es gratis o lo desbloquea el coach? | prensa → `premium` |

Un mismo ejercicio puede ser `env:[corporal]` + `goal-agnóstico` + `tier:free`. **Cada eje es
un campo aparte.** El "estilo" (preset) es solo un **atajo** que pre-configura entorno +
sesgo de metodología; por debajo siguen siendo estos ejes.

---

## 2. Modelo de datos

### 2.1 Por ejercicio: `env`
Array de entornos donde el ejercicio es realizable. Códigos:
- `corporal` — solo peso corporal, sin nada.
- `casa` — bandas elásticas y/o mancuernas (equipo mínimo de casa).
- `parque` — barras de dominadas, fondos, bancos (calistenia al aire libre).
- `gym` — barras, máquinas, poleas (lo actual).

**Regla de compatibilidad (implícita, no hay que taggear todo):** lo que es `corporal`
se puede hacer en cualquier entorno; lo `casa`/`parque` también sirve en `gym`. El filtro
del generador: *un ejercicio es elegible si el entorno del cliente está en su `env`* (más
la herencia de arriba). Se taggea con un **heurístico por nombre/tipo** + revisión del coach:

| Pista en el nombre / type | `env` sugerido |
|---|---|
| type `Bodyweight` o `Isométrico` sin implemento | `[corporal, casa, parque, gym]` |
| "mancuerna" | `[casa, gym]` |
| "banda" | `[casa, parque, gym]` |
| "barra" de colgarse (dominadas, fondos) | `[parque, gym]` |
| "máquina / polea / cable / prensa / smith / hack" | `[gym]` |
| "barra" con carga axial (sentadilla/peso muerto con barra) | `[gym]` |

> Igual que con `tier`: **el heurístico propone, Andrés valida** (él es el profesional;
> ver [[feedback_decisiones_diseno]] — selección de ejercicios es criterio de coach).

### 2.2 Por cliente: `place` (y opcional `equipo`)
El entorno principal del asesorado (`corporal` | `casa` | `parque` | `gym`). El generador
y el selector de ejercicios filtran por él. Va en el formulario de asesorado, al lado de
"días/semana".

### 2.3 Catálogo de presets (`TRAINING_STYLES`)
`{id, name, icon, env, methodBias, note}`. Semilla propuesta:

| Estilo | env | methodBias | Notas |
|--------|-----|-----------|-------|
| Gym — Hipertrofia | gym | hipertrofia | Default actual |
| Gym — Fuerza | gym | fuerza | Compuestos pesados |
| Casa — Peso corporal | corporal | funcional/calistenia | El caso de la señora de 50 |
| Casa — Bandas y mancuernas | casa | hipertrofia | Equipo mínimo, cubre muchísimo |
| Calistenia / Parque | parque | calistenia | Dominadas, fondos, progresiones |
| Funcional | casa/corporal | funcional | Patrones, core, cardio |

`methodBias` ajusta **selección y split** (no el rep-scheme, eso es `goal`): calistenia →
prioriza `Bodyweight`/progresiones; funcional → patrones + core/cardio; fuerza → compuestos.

---

## 3. El hueco de contenido (CRÍTICO — bloquea todo lo demás)

Hoy **no se puede armar una rutina completa sin gym.** Cobertura de peso corporal actual:
core 6 ✅ · pecho 3 ✅ · tríceps 3 ⚠️ · **piernas 1 · glúteo 1 · espalda 1 (necesita barra)
· hombros 0 · bíceps 0** 🔴.

**Ejercicios a AGREGAR** (semilla — Andrés afina/aprueba; cada uno con `env`, `descSimple`,
`ytQuery`, `icon`, `track`):

- **Hombros:** Pike Push-up `[corporal]` · Press hombro con banda `[casa,parque]` ·
  Elevaciones laterales con mancuerna `[casa,gym]`.
- **Bíceps:** Curl con banda `[casa,parque]` · Curl con mancuerna `[casa,gym]` ·
  Dominadas supinas/Chin-up `[parque,gym]`.
- **Espalda:** Remo invertido (mesa/barra baja) `[corporal,parque]` · Remo con banda
  `[casa,parque]` · Superman `[corporal]` · Remo con mancuerna `[casa,gym]`.
- **Piernas:** Sentadilla peso corporal `[corporal]` · Zancadas `[corporal]` ·
  Búlgara peso corporal `[corporal]` · Step-up `[corporal]` · Sentadilla con banda `[casa]` ·
  Sentadilla a una pierna asistida `[corporal]`.
- **Glúteo:** Hip Thrust a una pierna peso corporal `[corporal]` · Patada en cuadrupedia
  `[corporal]` · Abducción con banda `[casa,parque]` · Puente con banda `[casa]`.
- **Pecho:** Flexiones inclinadas/declinadas `[corporal]` · Fondos entre sillas/banco
  `[corporal,parque]`.

(~20 ejercicios → habilita un programa completo y seguro en casa/parque.)

---

## 4. Integración con el motor (ya construido)

- `generarRutinas(client, lib, opts)` → añadir filtro por `client.place` en `_genPick`
  (un ejercicio entra al pool si su `env` es compatible con el entorno del cliente).
- `methodBias` del preset → ajusta preferencia de `type` y, si aplica, el split (calistenia
  no usa "Tren Superior con press de banca", usa progresiones de empuje corporal).
- **Fallback de seguridad:** si para un entorno no hay con qué llenar un slot, el motor deja
  el día más corto antes que meter algo del entorno equivocado. Y marca aviso al coach.
- Tests nuevos en `apex.test.js`: cada entorno genera SOLO ejercicios compatibles.

## 5. Integración con el selector manual (picker)
El coach también gana: filtro de entorno en `openPicker()` → puede armar a mano una rutina
de casa sin colar ejercicios de gym. Mismo filtro que el generador.

## 6. UX
- Campo **"Entorno de entrenamiento"** en el formulario del asesorado.
- Al **✨ Generar semana**: selector de **estilo** (preset) arriba del preview.
- En la biblioteca/picker: chip de entorno por ejercicio (🏠 casa · 🌳 parque · 🏋️ gym).
- Modo libre (Paso 2): el estilo es la **primera pregunta** del onboarding ("¿Dónde
  entrenas?") → genera al instante → engancha.

---

## 7. Fases recomendadas

1. ✅ **Fase A — Cimientos de datos — HECHA (2026-05-30):** función pura `inferExerciseEnv()`
   en apex-core.js (9 tests) + `migrateEnv()` que etiqueta `env` en los 96 ejercicios
   (heurístico, el coach valida) · campo `place` en el formulario del asesorado (gym por
   defecto) · catálogo `TRAINING_STYLES` (6 estilos, se cablea en Fase D).
2. ✅ **Fase B — Contenido (primer lote) — HECHA (2026-05-30):** +13 ejercicios sin gym
   (e97–e109): hombros (pike, Y-T-W, press/lateral/face-pull con banda), bíceps (curl y
   martillo con banda, chin-up), espalda (remo con banda), tríceps (extensión con banda),
   glúteo (puente a una pierna), piernas (step-up y sentadilla a una pierna). **Casa queda
   cubierta en todos los grupos.** Huecos honestos en SOLO peso corporal: bíceps 0 y
   espalda 1 (Superman) — tirar/curl exige resistencia; un band barato lo resuelve.
3. **Fase C — Generador + picker:** filtro por entorno y `methodBias` + tests. (PENDIENTE)
4. **Fase D — UX:** selector de estilo en el generador, chips de entorno, mostrar `env` por
   ejercicio para que el coach valide/edite el etiquetado. (PENDIENTE)
5. ✅ **Calentamiento con video — HECHO** (fuera de fases).

### Cobertura tras Fase A+B (nº ejercicios por músculo × entorno)
```
músculo  | corporal | casa | parque | gym
pecho    |    3     |  5   |   3    | 10
espalda  |    1     |  3   |   3    | 14
hombros  |    2     |  6   |   5    | 12
biceps   |    0     |  3   |   3    |  8
triceps  |    1     |  3   |   3    |  9
piernas  |    6     |  8   |   7    | 20
gluteo   |    3     |  6   |   6    | 17
core     |    8     |  8   |   9    |  9
cardio   |    5     |  5   |   5    |  8
```
> **Pendiente de Andrés:** validar/editar el `env` heurístico de los 96 originales (algunos
> mancuerna sin pista quedaron 'gym' por conservadurismo) y decidir si añade bíceps/espalda
> corporal (ej. remo invertido en mesa, curl isométrico) o si empuja a usar 1 banda.

> **Orden lógico:** A→B son prerrequisito de C→D. B es trabajo de contenido del coach
> (Andrés valida cada ejercicio); A y C-D son código. Se puede avanzar A en paralelo a que
> Andrés liste/apruebe los ejercicios de B.

## 8. Métrica de éxito
- Un asesorado marcado "solo peso corporal" recibe una semana **completa y equilibrada**
  (todos los grupos musculares) sin un solo ejercicio que requiera gym.
- El coach arma una rutina de casa en el picker sin tener que descartar ejercicios de gym a mano.
