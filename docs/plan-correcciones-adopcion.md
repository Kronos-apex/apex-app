# Plan de correcciones — verificación del lote de ADOPCIÓN (A1-A4) + bug de identidad

> **Estado:** escrito 2026-07-25. **P0 (+F1) CORREGIDO en avi-v398 el 2026-07-26; el resto sigue abierto.**
> El lote A1-A4 está EN PRODUCCIÓN (avi-v394→v397 + edge `refresh_snapshot` v6) y **RECHAZADO**
> por la verificación. Este documento es lo que se ejecuta en la siguiente sesión, en orden.
>
> **Método de la verificación:** Opus se auto-verificó siguiendo el método de Fable (contrato
> `docs/reglas-opus.md`): revisión adversarial del diff área por área con 4 revisores
> independientes, sabotaje contra la base REAL, repro en navegador, y comprobación propia de
> cada hallazgo grave antes de darlo por bueno. **Esto NO reemplaza el veredicto de Fable**
> (R4.1/R4.2): sigue pendiente, y este documento entra en su cola.

---

## 🔥 P0 — BUG REPORTADO POR EL PO: la identidad de Comunidad queda PEGADA entre cuentas

> **✅ HECHO — avi-v398 (2026-07-26).** Cierra también **F1**. `_cmtyBlank()` + `cmtyResetIdentity()`
> (app-7) llamada desde `logout()` (que además pone `_authUid=null`), claves locales con uid vía
> `cmtyLocalKey` (avi-core, PURA, +1 test) y candado de identidad: asíncrono en `cmtyLoad` /
> `cmtyAdoptionProbe` **y SÍNCRONO** (`_cmtyIdentityGuard`) en `renderCommunity` y en la tarjeta de
> «Hoy» — hueco que este plan no tenía: `renderCommunity()` corta ANTES de `cmtyLoad`, así que el
> cambio de cuenta sin `logout()` seguía pintando lo anterior. `_repro-cmty-identity.mjs` pasó a
> harness de REGRESIÓN: 6/6, con 3 sabotajes que mordieron. **Desviación:** NO se borran
> `ax_cmty_msask_<uid>` ni `ax_cmty_minor_<uid>` al salir — ya van con uid (no filtran) y borrarlas
> debilitaría el candado anti-molestia de R1.6 y la marca de menor de edad. Pendiente de Fable.

**Reporte (Camilo, 2026-07-25):** *«vi la pantalla de comunidad de Astrid y en el perfil de ella
aparecía el MÍO en la parte superior»*.

**REPRODUCIDO** → `scripts/e2e/_repro-cmty-identity.mjs` (exit 1 mientras el bug siga vivo).
Salida real del repro, en la vista «Tu perfil y ajustes» de la SEGUNDA cuenta:

```
AN  Andres  Racha 3 sem · Nivel 2  Entrena desde enero de 2026 · 20 entrenos  TU CÓDIGO…
CMTY.uid = …c0ac (el del coach)   CMTY.profile.handle = 'Andres'   CMTY.loaded = true
```

**NO es del servidor.** La consulta del perfil es `.eq('user_id', uid).maybeSingle()` y la RLS no
deja leer la fila de otro. Es identidad pegada en el CLIENTE, por dos vías independientes:

1. **MEMORIA.** `logout()` (`app-2-login.js`) limpia `ax_session` y `_pushCtx` — y comenta que lo
   hace justo por esta clase de bug — pero **no toca el objeto `CMTY`**. En todo el repo no existe
   ni un `CMTY.profile = null`, ni `CMTY.uid = null`, ni `CMTY.loaded = false`. Y `renderCommunity()`
   corta con `if(!CMTY.loaded && !CMTY.loading && !CMTY.busy){ cmtyLoad(); return; }`: con `loaded`
   en `true` heredado, **no recarga** y pinta lo de la cuenta anterior. `logout()` tampoco recarga
   la página, así que el estado sobrevive al cambio de cuenta en la misma pestaña.
2. **DISCO.** `ax_cmty_cache` (localStorage, **sin namespace por usuario**) guarda `profile` +
   `friends` + `heartsRecv`, y `_cmtyLoadCache()` lo carga en CUALQUIER fallo de `cmtyLoad`
   (offline, error de grant). `logout()` tampoco lo borra → sobrevive incluso a recargar.

**Alcance real (mayor que el perfil):** queda pegado también `friends`, `heartsRecv`, `posts`,
`profById`, `peers` y **`dmThreads` — la bandeja de mensajes directos**, con apodos y último
mensaje de conversaciones ajenas (el repro confirma `dm:1` arrastrado). Abrir un hilo sí pega al
servidor con el JWT nuevo (la RLS lo corta), pero **la LISTA ya se pintó desde memoria**.

**Antigüedad:** PREEXISTENTE, del módulo de Comunidad (C3) — **no lo introdujo el lote de adopción**.
Pero A2 amplió la misma clase al añadir `ax_cmty_probe`, que ahora pinta datos de terceros en
«Hoy» sin que el usuario abra nada (ver F2.1).

**Fix de raíz (mata la CLASE, no el síntoma):**
- Una función `cmtyResetIdentity()` en app-7 que devuelva `CMTY` a su estado inicial (TODOS los
  campos, no solo `profile`) y borre las claves locales de comunidad:
  `ax_cmty_cache`, `ax_cmty_probe`, `ax_cmtynudge`, `ax_cmty_msask_*`, `ax_cmty_refresh`,
  `ax_cmty_minor_*`.
- Llamarla desde `logout()` (con guard `typeof`), junto al bloque que ya limpia `_pushCtx`.
- **Candado adicional (defensa en profundidad):** `cmtyLoad` compara el `uid` recién resuelto
  contra `CMTY.uid`; si cambió, resetea antes de pintar. Así también cubre un cambio de cuenta
  que no pase por `logout()`.
- **Namespacing:** las claves locales que guardan datos de OTRAS personas deben llevar el uid en
  el nombre (como ya hace `ax_cmty_msask_<uid>`), no ser globales del dispositivo.
- Verificación: `_repro-cmty-identity.mjs` debe pasar a VERDE (hoy sale 1), y añadirle un caso de
  cambio de cuenta SIN `logout()`.

---

## 🔴 P1 — Bloqueantes del lote de adopción

### F1 · A2 — La sonda filtra apodos y caras de terceros entre cuentas
`ax_cmty_probe` guarda handles, `avatar_url` e `is_private` de otras personas y **no se borra en
`logout()`**. La cuenta B ve en su «Hoy»: *«Astrid, Natalia y 1 más de tu gym ya están aquí»* —
gente del gym de A. Reproducido. Misma raíz que P0 → **se cierra con el mismo fix**.
`ax_cmtynudge` (silencio de 30 días) también se hereda.

### F2 · A4 — La pregunta de los logros es inerte en la sesión típica

> **✅ HECHO — avi-v399 (2026-07-26), junto con F11.** `communityMe(profile,probe,cache)` PURA en
> avi-core + `_cmtyMe()` en app-7; la sonda de A2 ahora lleva `showMilestones`. Cubre también el
> colateral (`renderWfCmtyShare`/`cmtyShareWorkout`) y **un hallazgo que este plan no tenía:**
> `cmtyOnWorkoutFinished()` tenía el mismo guard, así que a quien no abre la pestaña el servidor
> NUNCA le recalculaba el snapshot — sus logros no se emitían jamás. `_verify-milestoneask` 13→19,
> 3 sabotajes. Pendiente de Fable.
`renderWfMilestoneAsk` exige `CMTY.profile`, que solo se llena en `cmtyLoad()`. Verificado:
`renderCommunity()` tiene **UN solo llamador** (`cnTab('cn-community')`, `app-4:158`) y `cmtyLoad`
no se invoca en el arranque ni en ningún poll. En la sesión normal (abrir → entrenar → cerrar)
`CMTY.profile === null` y **la tarjeta no se pinta nunca**. Es la ironía del propio commit: A4
nació porque «quien no entra a Ajustes nunca lo enciende» y quedó dependiendo de que entre a
Comunidad en esa misma carga.
**Fix:** leer el perfil de la sonda que A2 ya mantiene (`ax_cmty_probe` / `ax_cmty_cache`), que es
justo el mecanismo que A2 creó para esto. Colateral a revisar: `renderWfCmtyShare` (v3-a #2/#3)
tiene el mismo guard → «Compártelo con tu gente» sufre lo mismo, y `cmtyOnWorkoutFinished()`
tampoco refresca el snapshot en esas sesiones.

### F3 · A1 — La prueba social se desarma cuando alguien se hace público
`communityPeersLine` usa `is_private === true` como señal de «es de mi gym», y eso no es lo mismo
(`c11_activate_public` existe justamente para que un adulto se haga público). Con 5 públicos + 1
privado la línea dice **«Zulma de tu gym ya está aquí»**: esconde a 5 y usa singular. Con todos
públicos pierde el «de tu gym», que es la feature entera.
**Agravante:** `avi.test.js` consagra ese comportamiento como correcto
(`assert.strictEqual(l.total, 1); // el público NO se cuenta dentro del gym`) — un test con dientes
apuntando al blanco equivocado; hay que corregir el test, no solo el código.
**Fix:** derivar la pertenencia de la señal real (`community_gym_members`, la que usa
`_same_community`), o no partir el pool y reservar «de tu gym» para cuando el scope lo justifique.

---

## 🟡 P2 — Serias (una a tres líneas cada una, cerrar en el mismo pase)

| # | Área | Qué pasa |
|---|---|---|
| F4 | A3 | **`_gymActive` queda rancio tras `toggleGymMember`**: agregas al gym a alguien que YA tiene perfil → te lo marca como no activado y te empuja a invitarlo a algo donde ya está. Repro en 2 toques. Fix: refrescar `_gymActive` (o re-consultar) dentro de `toggleGymMember`. |
| F5 | A3 | **La frase miente**: «A los otros N puedes invitarlos desde esta lista» cuenta al COACH (su fila nunca tiene botón, `_renderGymMgr` le pasa `''`) y a miembros del gym que ya no están en `DB.clients` (archivados, sin fila). Puede decir «al que falta» con **0 botones** en pantalla. Fix: derivar el conteo de lo que la lista realmente ofrece. |
| F6 | A3 | **Botón «Invitar» de 32px**, bajo el mínimo de 36 (R1.5), pegado al switch que da/quita membresía. Fix: `min-height:36px`. |
| F7 | A2 | **La puerta no se cierra al cruzarla**: tras crear el perfil la tarjeta sigue visible porque nada repinta «Hoy» (`cnTodayGuard` devuelve false el mismo día). El mensaje del commit afirmaba lo contrario. Fix: repintar «Hoy» tras el opt-in, o que `renderCommunityNudge` re-lea la sonda al volver a la pestaña. |
| F8 | A2 | **Un fallo parcial de `cmtyLoad` escribe una sonda MENTIROSA**: la consulta de peers tiene su propio `catch` que la traga → `peers:0` con `at` fresco → la puerta queda desactivada 24h sin señal. Fix: no escribir sonda cuando no se pudo leer (dejar `null` = «no sé», como se hizo bien en A3). |
| F9 | A2 | **Sonda con forma corrupta rompe «Hoy»**: `renderCommunityNudge` corre ANTES de pintar el entreno y sin `try/catch`; un `list` no-array lanza y **el entreno no se pinta**. Fix: `Array.isArray(probe.list)` en el candado + try/catch en el caller. |
| F10 | A4 | **Un «Sí» sin conexión quema la pregunta para siempre**: `_cmtyAskedMark(m)` corre ANTES del patch. Fix: marcar después de confirmar, o solo en el «No». |
| F11 | A4 | **`_cmtyPatch` no distingue «actualicé» de «0 filas»** (`.update()` sin `.select()`): PostgREST devuelve 204 sin error aunque no exista la fila → se confirma «Listo, tu gente lo va a ver» sin haber publicado nada. | **✅ HECHO avi-v399:** `.select()` + devuelve true/false; el «Sí» solo confirma con la fila en la mano.
| F12 | A4 | **Ignorar la tarjeta no la calla**: solo «Sí»/«No» marcan. Cerrar la pantalla la deja reapareciendo en CADA entreno hasta el umbral siguiente; en 52 semanas, **para siempre**. Es el candado anti-molestia de R1.6. |
| F13 | A4 | **La pantalla de fin no scrollea** (`maxScroll:0` medido en todos los casos) y con las 3 tarjetas apiladas a 360×640 el trofeo (−194) y «¡Lo lograste!» (−99) quedan fuera y no se pueden alcanzar. El apilado es previo (push+share ya deja el trofeo en −35), pero A4 es el que empuja el título fuera. Falta coordinación de turnos entre las 3 tarjetas (A2 sí la tiene). |
| F14 | A3 | **`waPhone` manda la invitación a un número equivocado** con teléfonos reales: fijo de Bogotá `6012345678` → `wa.me/6012345678` = **+60 Malasia**; móvil de EE.UU. sin +1 `3055551234` → **+57 …, un colombiano REAL distinto**. Clase preexistente (v365), pero A3 es el primer sitio que empuja a invitar en tanda. Fix: validar el formato antes de construir el enlace y no abrir WhatsApp si el número no es plausible. |

---

## 🟢 P3 — Huecos de los propios harnesses (R2.3: aserciones sin dientes)

- `_verify-cmtynudge` **N6 prueba el harness, no el código**: la línea del check ejecuta
  `dismissCmtyNudge(); renderShareBanner(...)` — el paso que falta en la app. Pasaría con el bug.
- `_verify-community` **CM17** y `_verify-cmtynudge` **N11** pasan **en vacío** si
  `#install-banner` está oculto (`solapa=false` por ausencia). Falta afirmar que el banner existe.
- `_verify-gyminvite`: el cliente falso tiene `in(){return b;}` — **ignora sus argumentos**, así que
  no detecta que la consulta pierda su filtro (eso ocultó F4). `window.__calls` se puebla y nunca
  se assertea. `const rowsOf` está definido y sin usar.
- **Test estático de paridad de umbrales (A4): falso verde.** El `.filter(n => !isNaN(n))` descarta
  tokens no numéricos, así que si alguien **agrega** un umbral a la edge (`…,52,104`) el test PASA.
  Fix: exigir que todos los tokens parseen antes de comparar.
- `_verify-milestoneask` asigna `CMTY.profile` a mano → por eso no cazó F2.
- **Colisión de puertos**: `_verify-cmtynudge` (8799) choca con `_verify-community` y
  `_shot-trained`; `_verify-gyminvite` (8801) con `_verify-dm`; `_verify-milestoneask` (8803) con
  `_verify-public`. Secuencialmente no molesta, pero impide correr el cinturón en paralelo.

---

## ⚖️ Decisiones que son del PO / Fable, no de implementación

1. **A1 muestra nombres y caras del gym —incluidos MENORES— a quien todavía no aceptó nada.**
   La RLS lo autoriza (verificado con un miembro real sin perfil: el servidor ya le entrega los 7
   handles), pero *autorizado por RLS ≠ que el producto deba mostrarlo*. Antes, ver la identidad de
   un compañero exigía crear perfil, marcar la casilla legal y pasar el gate 18/representante.
   Dato: **6 de los 7 perfiles se tratan como menores** (`birth_date` nulo → fail-safe).
2. **El catch-up de A4 roza la decisión «sin retroactivo» (R2/§R2(f)).** Publica UN hito, el
   vigente, y solo por acción explícita del usuario — pero la llamada es de Fable/PO.
3. **`CMTY_CONSENT_V` no se subió** al corregir el copy del opt-in («Solo tus amigos te ven» era
   materialmente falso desde C5). El versionado existe justo para registrar qué se mostró.
   Pendiente del abogado.

---

## 🔎 Modelo de confianza — hallazgo aparte (PREEXISTENTE, no del lote)

Probado en vivo contra prod con usuario sintético: **un cliente que manipula su propio
`user_data.history` (client-writable) hace que el servidor le publique «52 semanas» y «nivel 5»**
por el camino NORMAL, sin catch-up. El candado real que sí se sostiene es que el cliente no puede
insertar posts (`cpost_ins`, 403 verificado) ni escribir sus columnas de snapshot (403 verificado):
no elige el RESULTADO, pero sí el INSUMO. La documentación («decisión #7: el cliente NO puede
inflar sus números») está sobredimensionada y conviene matizarla.

---

## ✅ Lo que la verificación SÍ dio por bueno

- **6 sabotajes contra la base real, todos aguantaron:** el cliente no puede insertarse un hito
  (403) ni escribir su racha (403); el catch-up no publica sin opt-in ni sin umbral ganado; 5
  cuerpos hostiles (`"true"`, `1`, `{}`, no-JSON, vacío) no publican ni tumban la edge; 15 llamadas
  seguidas no duplican. Limpieza verificada en cada corrida.
- **Edge desplegada = fuente del repo**, v6 ACTIVE, `verify_jwt` intacto. Sin advisors nuevos.
- **Producción sirve v397** en las 11 referencias + `CACHE_NAME avi-v397`; local == `origin/main`.
- **Sin scope creep** en ninguno de los 6 commits (cada uno toca solo lo suyo + bump + baseline).
- **R1.6 literal:** la tarjeta de A2 va en posición 9 de 11 y el early-return de timer vivo corre
  antes; `_fable-repro-midsession` verde.
- **`esc()` sin huecos** en las cuatro superficies nuevas; avatar externo no se pinta.
- Suite **437/437**, los 4 harnesses nuevos verdes, smoke verde.

---

## Orden de ejecución propuesto para la siguiente sesión

1. **P0** — identidad pegada (`cmtyResetIdentity` + `logout` + candado por uid en `cmtyLoad` +
   namespacing). Cierra también **F1**. Un commit.
2. **F2** — que A4 aparezca de verdad (leer el perfil de la sonda). Un commit.
3. **F3** — pertenencia real del gym en A1 + corregir el test que consagra el error. Un commit.
4. **F4-F6** — los tres del modal del gym. Un commit.
5. **F7-F13** — el resto de las serias, agrupadas por área (A2 / A4). Un commit por área.
6. **F14** — validación del teléfono antes de abrir WhatsApp (mata la clase, toca los 4 call sites).
7. **P3** — huecos de harnesses.
8. Llevar el conjunto a Fable para veredicto vinculante (R4.1/R4.2).
