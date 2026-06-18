# Arquitectura y escalabilidad de AVI

> Documento vivo. Última revisión: 2026-06-18.
> Objetivo: que cualquiera (incluido el yo del futuro) entienda cómo está armada
> la app, qué tan lejos llega como está, y en qué orden profesionalizarla.

## 1. Stack en una frase

PWA estática (HTML/JS/CSS) servida por **GitHub Pages** (CDN), con **Supabase**
(Postgres + Auth + RLS + Edge Functions + Web Push) como único backend.

```
Usuario ──HTTPS──> GitHub Pages (estático, CDN)         ← el "frontend"
                        │
                        └──API REST/Auth──> Supabase     ← el "backend"
                                              ├─ Postgres (datos + RLS)
                                              ├─ Auth (auth.users)
                                              └─ Edge Functions (push, borrar cuenta)
```

- **Frontend:** `index.html` (monolito, ~9.800 líneas) + `apex-core.js`
  (lógica pura testeable, ~900 líneas, 140 tests) + `sw.js` (Service Worker,
  cache-versionado `apex-vNNN`).
- **Backend (proyecto Supabase `eoebhrxbokyllqalyecj`):** ver §3.
- **App de gimnasio (SaaS):** fork aparte, proyecto Supabase propio
  `yndpryhirbhlhlkmxyyv` (no confundir con el de la app personal).

## 2. Modelo de datos

Patrón **"un blob JSON por usuario"**. Tabla principal `user_data`:

| Columna | Tipo | Para qué |
|---|---|---|
| `user_id` (PK) | uuid → auth.users | dueño de la fila |
| `coach_id` (idx) | uuid → auth.users | qué coach lo ve |
| `role` | text (`coach`/`client`) | rol |
| `profile, routines, history, prs, bodyweight, medidas, nutrition, photos, msgs` | jsonb | todos los datos del usuario |
| `updated_at` | timestamptz | sync last-write-wins |

- El **cliente** lee/escribe **solo su fila** (`where user_id = yo`), por PK → instantáneo.
- El **coach** lee las de sus clientes (`where coach_id = yo`), `coach_id` indexado.
- Tablas auxiliares: `push_subscriptions` (suscripciones web-push),
  `apex_data_backups` (respaldo semanal automático), `apex_data` (blob legacy,
  en retirada).
- **RLS activado en todas** las tablas (cada quien ve lo suyo; el coach ve a sus clientes).

## 3. Escalabilidad: ¿hasta dónde llega como está?

Medición real (2026-06-17, 13 usuarios):

| Métrica | Hoy | Proyección 1.000 | Límite plan free |
|---|---|---|---|
| Tamaño DB | 13 MB | ~25–40 MB | 500 MB |
| Fila por usuario (prom.) | 18 kB | igual | — |
| Foto más pesada (en blob) | 88 kB | igual | — |
| Consulta del cliente | 1 fila por índice | igual | instantánea |

**Conclusión: 1.000 usuarios entran sin reescribir nada.** El tope de tamaño del
plan free se alcanza recién por los ~25.000 usuarios; para entonces ya se está en
plan Pro. Las consultas no se degradan con el volumen porque son por índice
(`user_id` PK, `coach_id` idx), no escaneos de tabla.

### La analogía del "cajero"
- **Frontend (GitHub Pages):** cajeros infinitos automáticos. 100 o 100.000
  usuarios da igual; es estático servido por CDN, gratis.
- **Postgres (Supabase):** *un* cajero, no se auto-clona por petición. Pero cada
  trámite es minúsculo e indexado, así que un solo cajero atiende miles. Cuando
  se llene: cajero más grande (subir instancia) + más filas (connection pooling,
  ya incluido en Supabase).
- **Edge Functions:** sí auto-escalan (serverless) como en la analogía.
- **Archivos (fotos):** su "cajero correcto" es **Supabase Storage**, no el blob.

## 4. Cuellos de botella reales, en orden

1. **Plan free → Pro ($25/mes):** no por tamaño, sino por ancho de banda
   (5 GB/mes), backups diarios y evitar auto-pausa. Es costo, no reescritura.
   *(Mitigación parcial ya hecha: keepalive anti-pausa.)*
2. **La consulta del coach trae el blob completo de cada cliente** (fotos +
   historial incluidos). Trivial para 5–50 clientes; pesado para el escenario
   gimnasio (300 socios ≈ 5 MB por carga). → Optimización dirigida (§5, Fase 2).
3. **Fotos dentro del blob JSON.** Hoy son chicas (88 kB máx). Si crecen (fotos
   de progreso), mover a Storage y dejar solo URLs (§5, Fase 3).

## 5. Roadmap de profesionalización

Principio: **refactor incremental, nunca reescritura desde cero**; cada cambio con
tests verdes + verificación de render antes de desplegar.

- **Fase 1 — Este documento.** Mapa compartido. ✅
- **Fase 2 — Optimizar la carga del coach.** ✅ La lista del coach trae solo lo
  que renderiza (perfil, rutinas, history, msgs, bodyweight para el sparkline);
  fotos/PRs/medidas/nutrición se cargan al abrir cada cliente (`UD.loadClientHeavy`
  + `_ensureClientHeavy`). Habilita el escenario gimnasio (300 socios).
- **Fase 3 — Fotos a Supabase Storage.** ✅ Bucket `apex-photos` (público en
  lectura). Subir/borrar usan el **token de sesión** del usuario; políticas
  limitadas a la propia carpeta `{uid}/` o a la de los clientes del coach.
  `migratePhotosToStorage` auto-sana fotos y avatares base64 que queden en el blob.
  *(Pendiente: verificar una subida real autenticada con un cliente.)*
- **Fase 4 — Adelgazar el monolito.** 🔄 En curso (incremental, con tests).
  - Paso 1 ✅: `MS` (membresía: getStatus/canLogin/badge) → `apex-core.js` (+8 tests).
  - Paso 2 ✅: `fmtMetric`, `fmtDuration`, `WF_FEELINGS`+`feelingEmoji/Label`,
    `inferNutGoal` → `apex-core.js` (+9 tests). apex.test.js: 140 → 157.
  - Paso 3 ✅: valoración nutricional/composición → `apex-core.js`: `calcTMB`
    (Mifflin-St Jeor), `calcTDEE`, `getRctLabel` (hermano de `getIccLabel`),
    `getGoalMsg`, `kcalTargetFor`, `calcMacrosFromKcal` (+13 tests). Sacó ~75
    líneas de lógica pura enterrada en el render de la valoración. 157 → 170.
  - Paso 4 ✅: gamificación → `apex-core.js`: `GX_LEVELS`, `gxLevel` (nivel
    permanente), `gxDiscount` (descuento del mes por adherencia, `now` opcional
    para tests deterministas), `gxNextTier` (+8 tests). Lógica del descuento que
    ve el coach, antes sin un solo test. 170 → 178. `renderGamification` se queda
    como consumidor DOM.
  - Paso 5 ✅: progreso por ejercicio → `apex-core.js` `computeExerciseProgress`
    (+6 tests). Agrega el historial en una serie por ejercicio (mejor valor del
    día + volumen) según la modalidad (peso_reps/reps/tiempo/cardio/hiit).
    `buildExerciseProgress` quedó como wrapper de 3 líneas (solo el acceso a `DB`).
    178 → 184.
  - Paso 6 ✅: editorial de la semana → `apex-core.js` `weekEditorial` (+3 tests).
    Elige kick/título/cuerpo del banner semanal según el objetivo (matching por
    regex, antes sin test) y cuenta días de entreno; devuelve DATOS, no HTML.
    `clientWeekEditorial` quedó de 6 líneas (solo arma el markup con `esc`). 184 → 187.
  - Próximos candidatos puros a evaluar: helpers de fecha/formato restantes
    (`fmtT`/`fmtD`), geometría de gráficas (depende del ancho del contenedor → DOM,
    poco extraíble). Regla: solo lógica SIN DOM ni `DB`.

### Deuda menor anotada
- Advisor de Supabase: `user_data` tiene dos políticas DELETE permisivas
  (`user_data_delete` + `user_data_delete_coach`); unificar para limpiar el lint.
