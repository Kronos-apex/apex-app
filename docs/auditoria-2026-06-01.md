# Auditoría de equipo APEX — 2026-06-01

> Auditoría enfocada e inline (orquestador coordinando cada área). Backlog de
> remediación para arreglar DESPUÉS de terminar la auditoría completa.
> Severidad: 🔴 crítico · 🟠 alto · 🟡 medio · 🟢 ok/verificado.

---

## 🛡️ Seguridad — Andrés (DBA)

**Datos: Supabase advisor + pg_policies reales.**

- 🔴 **RLS abierto en `apex_data`, `push_subscriptions`, `apex_coaches`.** Policies `USING(true)/WITH CHECK(true)` para `anon`. La key publishable va embebida en el `index.html` público → cualquiera puede **leer y escribir TODA la base** (nombres, emails, teléfonos, hashes, pagos, medidas, fotos). Es consecuencia de NO tener auth real en el servidor (todas las peticiones llegan como el mismo rol `anon`); **no se arregla sin login real**.
  - **Hoy (~9 asesorados propios):** riesgo aceptado y documentado.
  - **Antes de arrendar a otros coaches (v2.0):** INNEGOCIABLE — auth real de Supabase + RLS por coach. Es el bloqueador #1 del modelo de arrendamiento.
- 🟡 **Policies redundantes** — `apex_data` tiene `apex_access` + `apex_open` (ambas `true`); `push_subscriptions` tiene `apex_access` + `push_access`. Dejar una sola por tabla (limpieza, no cambia acceso). **Bajo riesgo, se puede hacer ya.**
- 🟡 **`pg_net` en schema `public`** (WARN del advisor) — mover a otro schema.
- 🟢 **`apex_data_backups` blindada** (RLS on, 0 policies → solo service_role). Correcto.
- ℹ️ Existe tabla `apex_coaches` — cimiento multi-coach ya iniciado (útil para v2.0).

---

## 💪 Deportivo — Laura · Coach Pro · Valery · Andrés (Hyp)

**Auditado: `generarRutinas` y helpers (apex-core.js), `buildWarmup`, schemes, macros, clasificación de ejercicios.**

- 🟠 **Laura — hueco en lesiones "genéricas".** `parseLimitations` detecta zona `generic` (notas como "operado", "cirugía", "lesión" sin nombrar rodilla/lumbar/hombro) y marca `needsReview`, PERO `GEN_ZONE_EXCL` no tiene reglas para `generic` → **no excluye NINGÚN ejercicio**, mientras el texto generado afirma "Se excluyeron ejercicios contraindicados". Mensaje engañoso + sin protección automática. Fix: cuando solo hay `generic`, cambiar el texto a "revisar manualmente — limitación sin zona específica" (no prometer exclusión que no ocurrió). El flag `needsReview` ya obliga al coach a revisar (bien).
- 🟡 **Andrés (Hyp) — sin progresión ni periodización.** Las rutinas generadas usan un número fijo de reps (no rango) y los mismos parámetros cada semana; no hay deload ni progresión. Aceptable para un BORRADOR que el coach ajusta; planear para v1.5.
- 🟡 **Coach Pro — principiantes siempre Full Body, incluso a 5–6 días/sem.** `_genResolveSplit` fuerza Full Body a todo principiante sin importar frecuencia → un principiante de 5 días hace 5× full body (frecuencia alta). Considerar upper/lower para principiantes de alta frecuencia.
- 🟡 **Dato — `e74` (HIIT) tiene `reps:'1'` como string** (el resto usa número). Inconsistencia menor; verificar que no afecte el render de modalidad HIIT.
- 🟢 **Verificado OK:**
  - Macros (`calcMacrosSugeridos`) usan bien `activityFactor` numérico del formulario; proteína por objetivo razonable.
  - Splits respetan reglas: mujer→glúteo/pierna primero, hombre→PPL; orden Compuesto→Funcional→Aislamiento→Cardio correcto.
  - Exclusión por menores (<16): sin carga axial con barra. Correcto.
  - Clasificación cardio/HIIT/isométrico → `_genKeepNatural` conserva reps naturales (minutos/rondas/seg) — el bug de "kg en cardio" está bien cubierto.
  - `buildWarmup`: movilidad + activación por grupo, clínicamente sensato. Aprobado.

---

## 🧪 QA funcional — Lucas

**Auditado: doLogin, MS (membresía), saveClient, tryAutoLogin.**

- 🟠 **Asesorado NUEVO no puede entrar + mensaje engañoso.** `saveClient` crea al cliente SIN pagos → `MS.getStatus`=`pending` → `MS.canLogin`=false → bloqueado. Y el mensaje de bloqueo solo distingue `inactive` ("pausado") vs todo lo demás ("**Tu plan venció**"). Un cliente recién creado ve "Tu plan venció" aunque **nunca tuvo plan**. Consecuencia: el coach DEBE registrar un pago antes del primer login del asesorado, o este se traba sin entender por qué. (Confirmado en código: `data` de `saveClient` no incluye `payments`.)
  - Fix mínimo: mensaje específico para `pending` ("Tu cuenta está casi lista — tu coach la activará" / "Aún no tienes un plan activo").
  - Decisión de producto: ¿`pending` debería poder entrar? Hoy NO → además **bloquea el tier "libre" self-serve** (usuario gratis = sin pago = pending = bloqueado).
- 🟡 **Colisión coach/cliente con mismo email:** el branch de coach corre primero; si la verificación de coach falla, cae a cliente (funciona), pero un email igual al del coach es ambiguo. Menor.
- 🟡 **`overdue` bloquea el día siguiente al vencimiento** (sin gracia). Es enforcement de pago intencional; considerar 1-2 días de gracia.
- 🟢 **Sólido:** rate limiting (30s tras varios intentos), expiración de sesión 30 días validada en `tryAutoLogin`, migración de contraseña a SHA-256 en primer login.

## 💬 Fricción / CS — Sofía

- 🟠 **Mensaje frío y falso al usuario nuevo** (ver arriba): "Tu plan venció" a alguien que nunca entró. Para un asesorado no técnico (la señora de 50) es confuso y desalentador justo en el primer contacto. Reescribir con tono cálido y verdadero.
- 🟠 **El usuario bloqueado no tiene salida dentro de la app** — no puede escribirle al coach porque no puede entrar. Si `pending`/`overdue` bloquea, mostrar al menos un WhatsApp/contacto del coach en la pantalla de login.
- 🟢 Los otros mensajes de bloqueo tienen buen tono ("Escríbele a tu coach 🟡", "Habla con tu coach para continuar entrenando 💪").
- 🟢 Empty states accionables y ayuda contextual ❓ ya implementados (trabajo previo).

## ⚙️ Ingeniería — Camila

- 🟢 **Timers sin fugas:** `_msgPollInt`, `restInt`, `HIIT.int`, `GM.restTimer` se limpian en logout, fin de sesión y al reiniciar. `startMsgPolling` limpia antes de crear. Correcto.
- 🟢 **Estructura disciplinada** pese al single-file: 318 funciones sin duplicados, IDs y handlers consistentes (pre-commit 8/8), lógica crítica testeable en `apex-core.js` (70 tests).
- 🟡 **Manejo de errores async silencioso** (`fetch` en `catch`→`warn`). Aceptable ahora que existe la cola de reintento (`_pendingPush`), pero sin telemetría: un fallo persistente solo se ve en consola. Considerar un indicador visible de "sin sincronizar" si la cola no se vacía.
- 🟡 **`e74` (HIIT) `reps:'1'` string** (resto numérico) — normalizar.
- 🟢 XSS: `esc()` consistente en innerHTML con datos de usuario (verificado).

## 🎨 Diseño — Isabella / Diego

- 🟠 **53 colores hex hardcodeados** en estilos inline (ej. `#7a5c00`, `#a07820` en notas/avisos del entreno). Saltan el sistema de tokens y **no se adaptan al dark mode** (texto oscuro queda oscuro sobre fondo que sí cambia → bajo contraste). Pasar a tokens (`--t1/--gt/--or`...). Nota: algunos hex sobre superficies siempre-oscuras (login cinematográfico, wohero con texto blanco) son legítimos — revisar uno por uno, no a ciegas.
- 🟡 Verificar contraste de esos textos en dark mode (WCAG) tras tokenizar.
- 🟢 Tokens del sistema bien definidos (3 bloques `:root`), marca esmeralda coherente, touch targets ≥36px (trabajo previo).

## 📋 Producto — Valentina (PM)

- 🟠 **Contradicción estrategia vs implementación:** el modelo self-serve define un tier **"libre" gratis**, pero el login bloquea a `pending` (sin pago) → un usuario gratis no puede entrar. Hay que decidir: ¿el tier libre entra como `pending` permitido, o se modela distinto? Bloquea el Paso 1 de la estrategia self-serve.
- 🟡 **RLS abierto = bloqueador del arrendamiento** (ya en sección Seguridad) — es decisión de roadmap: auth real + multi-coach antes de vender a otros entrenadores.
- 🟢 Roadmap del CLAUDE.md actualizado hoy a v1.4 (refleja la realidad).

---

# ✅ BACKLOG DE REMEDIACIÓN (para corregir al final)

Ordenado por prioridad. (S=Seguridad, D=Deportivo, Q=QA, X=CS, E=Ing, G=Diseño, P=PM)

**🔴 Hacer pronto (bajo riesgo, alto impacto):**
1. ✅ HECHO — `MS.canLogin` ahora permite `pending` (nuevo entra; arregla también el mensaje falso, que ya solo aplica a vencidos reales). [Q/X] _Sub-item pendiente: link de contacto del coach en login para bloqueados — requiere campo de contacto del coach._
2. ✅ HECHO — `parseLimitations.advice` ya no afirma exclusión en lesiones genéricas (`hasExclusions`); pide revisión manual. +2 tests (72/72). [D]
3. ⏸️ DIFERIDO — Limpieza de policies RLS + `pg_net`: es **cosmético** (no cambia acceso) y tocar RLS/extensiones en prod tiene downside catastrófico (tumbar la app) por beneficio casi nulo. Hacerlo JUNTO con el trabajo de auth real (#5), no aislado. [S]

**🟠 Decisiones de producto (definir antes de codificar):**
4. [P/Q] ¿El tier "libre" permite entrar a `pending`? Define el self-serve.
5. [S/P] Auth real + RLS por coach — prerequisito del arrendamiento (v2.0, esfuerzo grande).

**🟡 Mejoras / deuda (siguiente iteración):**
6. [G] Tokenizar los 53 colores hex (dark mode/contraste).
7. [D] Progresión/periodización en el auto-generador (v1.5).
8. [D] Principiantes de alta frecuencia (5-6d): considerar upper/lower en vez de full body.
9. [E] `e74` reps a número; indicador visible de "sin sincronizar".
10. [Q] Gracia de 1-2 días en `overdue` antes de bloquear (opcional).
- Isabella/Diego (diseño) — consistencia visual
- Valentina (PM) — coherencia de roadmap
