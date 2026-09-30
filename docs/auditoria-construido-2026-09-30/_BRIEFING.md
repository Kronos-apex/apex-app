# BRIEFING COMÚN — R17 «LO CONSTRUIDO DEL 28 AL 30 DE SEPTIEMBRE» (2026-09-30)

Lee este archivo completo antes de hacer nada. Aplica a las dos áreas (A1, A2).

El encargo del PO se juzga con el criterio de las dieciséis rondas anteriores: **«auditorías serias,
nada genérico»**. Ver «Qué es un hallazgo serio». Un informe lleno de buenas prácticas genéricas se
considera FALLIDO aunque esté bien escrito.

---

## Por qué existe esta ronda

Entre el 28 y el 30-sep salieron **12 versiones (v681 → v692) que nadie ha revisado con ojos
independientes**. Las hizo el mismo que las probó. Tocan justo lo que más duele si falla:

- **Entrar a la app** (v683, v684, v687, v688): la pantalla de carga, el video del login, abrir con la
  WiFi «conectada pero sin internet» y **entrar sin red con la sesión vencida**. v688 decide quién
  entra cuando el servidor no contesta — es una decisión de ACCESO, no solo de velocidad.
- **Lo que se guarda del entreno** (v681 la barra, v682 las reps en reserva, v689 el aviso de salto):
  cambian qué significa el número que la persona anota y qué queda para la curva de progreso.
- **Las cuentas y el repo público** (v690 seudónimos en 181 archivos, v691 la tarjeta pública atada a
  su persona + `delete-account` v10, v692 la contraseña sin el nombre + `coach-create-client` v6, el
  check [14] de credenciales del hook).

**Lo que pasó hoy y lo vuelve urgente:** hoy (30-sep) el PO cambió la contraseña de **6 asesorados**
que tenían «nombre + 2026/1234». Cambiar la contraseña **cierra todas sus sesiones** (Supabase). Esos
6 teléfonos tienen HOY una sesión guardada que el servidor ya no reconoce, y v688 decide qué ven al
abrir. No es una hipótesis de laboratorio: le pasa a gente real esta semana.

| Área | Qué cubre | Quién (lee su archivo de rol en `.claude/agents/`) |
|---|---|---|
| **A1** | **Entrar y abrir**: la sesión cerrada desde el servidor, la cuenta borrada o suspendida con copia local, la WiFi colgada, el service worker que no se actualiza, los módulos que no cargan. **Con navegador.** | `camila-engineer.md` + `lucas-qa-func.md` |
| **A2** | **Datos, servidor y repo**: lo que v690 cambió en código que se EJECUTA, la barra y los saltos contra los datos reales, la tarjeta atada y `delete-account` v10, `coach-create-client` v6, lo que el repo público todavía dice de las personas. **Sin navegador: código y SQL.** | `andres-dba.md` + `julian-qa.md` |

---

## El producto

AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build: `index.html` + 7 módulos
`app-*.js` + `avi-core.js` + `sw.js`) de **Camilo Andrés** («Andrés Martínez» en público), entrenador
personal independiente en Guaduas, Cundinamarca. Backend Supabase (proyecto **`eoebhrxbokyllqalyecj`**;
el otro, `yndpryhirbhlhlkmxyyv`, NO es este producto).

Vive en DOS direcciones: `https://kronos-apex.github.io/apex-app/` (GitHub Pages) y
`https://app.avientrena.com/` (Vercel, proyecto `avi-app`). Los teléfonos actualizados saltan solos
al hogar nuevo; los iPhone con la app instalada se quedan en github.io a propósito.

**Arquitectura que hay que tener en la cabeza:** es *offline-first*. `localStorage` es la fuente de
verdad y sincroniza HACIA Supabase; el teléfono PISA al servidor. Por eso «entrar sin red» significa
«trabajar con la copia local y subirla después» — y si el después nunca llega, se pierde en silencio.

**El repo es PÚBLICO y está SEUDONIMIZADO desde v690:** en todo lo que escribas usa SOLO seudónimos.
La tabla real ↔ seudónimo está en `~/.avi/seudonimos.json` (privada: **nunca** la copies ni cites un
nombre real en tu informe). El check [13] del hook bloquea los nombres reales al commitear.

---

## MAPA DE LA SUPERFICIE (verificado contra HEAD `5c94256` — nombres verbatim)

### A1 · Entrar y abrir
- **v688** · `avi-core.js`: `BOOT_NET_MS` :1588 (3 s) · `bootNetWait(online)` :1591 (0 si
  `navigator.onLine === false`) · `conTope(promesa, ms, siVence)` :1593 · `bootAuthDecision(r)` :1601
  (con sesión → entra; sin respuesta + copia local + el MISMO usuario guardado antes y después → entra
  `sinRed:true`; si no → login). Llamadas: `app-2-login.js` :1361-1369 (arranque del asesorado),
  `app-3-coach.js` :728-736 (fila propia del coach) y :1248-1253 (lista de asesorados del coach).
  `app-1-infra.js` :580 (el usuario guardado que usa la decisión).
- **v683** · `_aviModulesReady()` `app-2-login.js` :1321 (el arranque espera `DOMContentLoaded`) y la
  cadena `syncFromCloud().then(_aviModulesReady)…` :1328. Gotcha vigente en `CLAUDE.md`: «la app debe
  ARRANCAR aunque un módulo no cargue».
- **v684** · `aviLoginVideo()` `app-2-login.js` :613 (el video solo cuando el login se ve).
- **v687** · `sw.js`: `SHELL` :15 · `_versionExacta(req)` :97 y su uso :148 (los `.js`/`.css` con `?v=`
  salen de la copia de ESA versión).
- **Suspendido**: `canLogin(c)` `avi-core.js` :6234 (solo `inactive` queda fuera).
- **Borrado de cuenta**: `supabase/functions/delete-account/index.ts` (desplegada **v10**).
- Harnesses que ya existen (no los repitas: busca lo que NO cubren): `_verify-red-colgada` (A+B, con
  `--prod --sesion` usa la cuenta QA en producción), `_verify-splash-v683`, `_verify-video-v684`,
  `_verify-arranque-modulos`, `_repro-login-sin-internet`, `_prodcheck` y `_prodcheck-mudanza`.
  **Ninguno prueba una sesión que el SERVIDOR revocó.**

### A2 · Datos, servidor y repo
- **v681/v682/v686** · `avi-core.js`: `BAR_DEFAULTS` :1473 · `exerciseBarKg(history, ex, idtOpt)` :1512
  (la barra se suma a los discos que se anotan). Plan y veredicto: `docs/plan-barra-rir.md`.
  Estudio de fondo: la persona anota SOLO DISCOS — pero eso lo midió el PO sobre él + 8 personas.
- **v689** · `avi-core.js`: `JUMP_LOW/JUMP_HIGH/JUMP_MIN_KG/JUMP_WINDOW_DAYS` (≤55 % o ≥180 % y ≥15 kg,
  90 días) · `jumpPrevTop` :1623 · `jumpCheck` :1646 · `jumpImplement` :1659 · `jumpText` :1678 ·
  `jumpSessionEncode` :1687 · `jumpSessionValue` :1692. `app-4-entreno.js`: `sessionJump` /
  `setSessionJump` / `sessionJumpPrev` :2011-2022 — la respuesta del día vive en
  `localStorage['salto_<rid>_<ei>']` y «se borra con el día». Harness: `_verify-salto` (53/53).
- **v690** · commit `9b922db` (182 archivos). Check [13] del hook (`scripts/hooks/pre-commit`).
- **v691** · `avi-core.js`: `showcaseOwner(card, clients)` :11917 · `showcaseCardFor(clientId, cards,
  clients)` :11934. `app-3-coach.js`: lectura de ataduras :2483, publicar ata :2548, aviso de tarjeta
  dudosa :2853. `delete-account/index.ts`: `borrarTodo(admin, uid)` :75, `tarjetasDudosas` :93-113.
  SQL: `supabase/community/s3_showcase_dueno.sql`.
- **v692** · `avi-core.js`: `passwordProblem(pass, who)` · `passwordMentionsPerson` :4070 ·
  `generatePassword` :4091. `app-2-login.js`: `_pwWhoMe` :472. `app-3-coach.js`: `cfGenPass` :170,
  `_ACCOUNT_ERR`. Espejo en `supabase/functions/coach-create-client/index.ts` (`mentionsPerson`).
- **6c5f7a4** · check [14] del hook (credenciales en lo añadido).

---

## BASELINE MEDIDO HOY (30-sep-2026) — créelo, NO lo vuelvas a medir

Lo midió el orquestador: el código contra HEAD y los datos con `SELECT` de solo lectura sobre
producción. **Cada cifra nombra su unidad.** **Si tu trabajo contradice un número de aquí, dilo
explícitamente: eso es un hallazgo en sí mismo** (tres cifras del orquestador ya las tumbaron agentes).

### Repo y producción
- HEAD limpio en **`5c94256` (avi-v692)**. Suite **1411/1411**.
- Producción sirve **`avi-v692` en las DOS direcciones** (`_prodcheck` ×2 hoy) · `_prodcheck-mudanza` 6/6.
- Edge functions DESPLEGADAS (versión de Supabase): `coach-create-client` **v6** (hoy), `delete-account`
  **v10** (29-sep), `send-push` v12, `refresh_snapshot` v9, `activate_public_profile` v3,
  `daily-notifs` v9 (~29-ago; no la llama el navegador).

### Sesiones y cuentas (A1)
- `auth.sessions`: **211 sesiones vivas** de **20 personas**.
- **Las 6 cuentas a las que el PO cambió la contraseña hoy**: **0 sesiones vivas** cada una (medido
  después del cambio). Antes del cambio, de esas 6: **3 tenían su última sesión con Google**, **2 con
  contraseña** (un iPhone y un Android) y **1 no tenía ninguna**. Las 6 tienen Google conectado. No hace falta nombrarlas; si necesitas sus uid para medir si
  volvieron a entrar, pídeselos al orquestador en tu informe como «sospecha sin medir».
- **Versión por teléfono** (`node scripts/versiones-telefonos.mjs`, unidad = PERSONAS con sello):
  **11 en v691** (sello de hoy; uno es el propio coach) · **1 en v684** · **6 muy atrás** (v644, v608,
  v654, v563, v571, v619) · **4 sin datos** · **0 en v692** todavía (se publicó hoy ~13:00 hora Colombia).
- `app_errors` desde el 28-sep: **11 filas** — **9** «Failed to update a ServiceWorker for scope
  ('https://app.avientrena.com/')…» (builds v679, v682 ×3, v687, v688 ×2, v691 ×2) y **2 «Script error.»**
  (`kind='error'`, builds v680 y v691). **`uid` NULL en las 11**. La tabla guarda desde el 1-sep (41 filas).

### Datos del entreno y de la vitrina (A2)
- `user_data`: **24 filas**. Con `"rir":` en `history`: **7 filas**. Con `"corte":true` en `history`:
  **0 filas** (v689 salió el 29-sep: puede que nadie haya saltado aún, o que el «sí» nunca llegue a la
  nube — eso es justo lo que hay que averiguar).
- `avi_showcase`: **4 tarjetas**, `avi_showcase_dueno`: **4 ataduras**, **0 tarjetas sin atar**.

### Ya encontrado por el orquestador — NO lo reportes
- 🟡 **v690 cambió un texto que se EJECUTA**: el festivo del 19 de marzo ahora se llama «Día de San
  Jorge» (`avi-core.js` :223; el comentario :187 y la prueba `avi.test.js` :741 también), un festivo que
  no existe: el seudonimizador cambió el nombre del santo porque coincide con un nombre de la lista de
  nombres reales. La FECHA sigue bien calculada. Víctima: nadie hasta
  marzo de 2027. Se arregla en el lote de esta ronda. **Lo que SÍ te toca (A2):** ¿hay OTRO cambio de v690
  que se ejecute — en la app, en un harness, en una migración, en una edge function?
- ✅ **La cola de altas del coach ya trata `password_has_name` como rechazo permanente** (lo saca de la
  cola y avisa: `_flushPendingClients` `app-3-coach.js` :917, `_ACCOUNT_ERR`). No es hallazgo.

---

## FALSOS POSITIVOS CONOCIDOS — si reportas uno de estos, tu informe pierde credibilidad

1. **«Sin red se entra con la sesión vencida: eso es inseguro».** Es la promesa de la app (offline-first)
   y fue decisión del PO (v688): la persona ya había entrado en ESE teléfono y los datos son suyos. **Lo
   que SÍ es hallazgo:** que entre alguien a quien el SERVIDOR ya le quitó el acceso (contraseña
   cambiada, cuenta borrada, suspendido) y siga así con red, o que lo que registre se pierda en silencio.
2. **«El iPhone instalado no salta a app.avientrena.com».** Deliberado (v662).
3. **«github.io sigue vivo».** A propósito: un teléfono sin actualizar vería pantalla de error.
4. **«La pantalla de carga dura 1 s».** Decisión del PO (v683: «1 segundo la marca»).
5. **«El video del login pesa 1,4 MB».** Decisión del PO (v684: «que no pierda la calidad premium»);
   medido que no baja más de 30 % sin perder calidad.
6. **«El repo tiene historia con nombres reales».** Conocido; se resuelve volviendo privado el repo
   (decidido, espera el pago del PO). Lo tuyo es HEAD, no la historia.
7. **`auth_leaked_password_protection`** (solo plan Pro, decidido no pagarlo) y los advisories de
   `SECURITY DEFINER` (las 12 funciones comprueban `auth.uid()` o moderador por dentro — medido hoy).
8. **Nutrición** (cerrada), **Comunidad** (congelada), **registro de alimentos** (congelado).
9. **«Hay que perseguir a los asesorados que no abren la app».** El PO lo cortó dos veces.
10. **«Faltan tests / convendría refactorizar»** sin caso concreto y sin víctima: no es un hallazgo aquí.

---

## Qué es un hallazgo SERIO (y qué se va a rechazar)

**SÍ es un hallazgo:**
- Algo que una persona real puede sufrir hoy, con su seudónimo y la consulta o el `archivo:línea` que lo
  demuestra.
- Algo que la app PROMETE por escrito y no cumple (cita el texto exacto y dónde vive).
- Un dato que se pierde en silencio, o que queda al alcance de quien no debe verlo.
- Un camino sin salida: una pantalla de la que no se puede volver, un aviso que no se puede apagar.
- Un número que cambia de significado sin que nadie lo sepa (un peso que ya incluía la barra y ahora la
  suma dos veces).
- Una medición que **contradice** el baseline de arriba.

**NO es un hallazgo:** consejos genéricos; algo ya escrito en **GOTCHAS VIGENTES** de `CLAUDE.md` (léelo);
algo ya arreglado (verifica contra HEAD); una hipótesis sin medir presentada como hecho (va a «Sospechas
sin medir»); «falta X» cuando X existe con otro nombre.

**El que audita llega con hipótesis, no con hallazgos.** Las preguntas de tu encargo son HIPÓTESIS del
orquestador y pueden ser falsas. **Tumba tus propios hallazgos antes de escribirlos, y escribe cómo.**

---

## REGLAS DURAS

1. 🔒 **SOLO LECTURA contra producción.** `SELECT` sí. `INSERT`/`UPDATE`/`DELETE`, migraciones, invocar
   edge functions que escriben, desplegar, subir archivos: **jamás**. Para probar quién puede LEER algo
   puedes impersonar un rol dentro de `begin; set local role authenticated; select set_config(
   'request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true); select …; rollback;` — solo
   `SELECT` dentro. Leer el código DESPLEGADO de una edge function (`get_edge_function`) sí se permite.
2. 🔒 **ÚNICA excepción, solo A1:** para reproducir «la sesión que el servidor revocó» puedes usar **la
   cuenta QA de ASESORADO** (`~/.avi/e2e-creds.json`) y SOLO ella: iniciar sesión (eso crea una sesión) y
   cerrar sesión con `scope:'global'` desde otro contexto (eso revoca las demás). **Nada más**: no cambies
   contraseñas (de nadie, tampoco de QA), no borres ni suspendas cuentas, no toques la cuenta QA del
   COACH ni la de ninguna persona real. Rate limit del login ~2-3 min entre intentos.
3. 🔒 **NO toques el código del repo.** Cero commits, cero ediciones a cualquier archivo que no sea tu
   informe. Un harness propio va en tu carpeta de trabajo temporal, no en `scripts/`.
4. 🔒 **Evidencia verificable en cada hallazgo**: `archivo:línea`, o la consulta SQL con su resultado, o la
   salida del comando. Nombres **verbatim**.
5. 🔒 **Intenta TUMBAR tu hallazgo antes de escribirlo**, y escribe cómo. Si lo tumbaste, va a «Lo que
   verifiqué y está SANO», que también vale.
6. 🔒 **Distingue «no hay víctima hoy» de «no pasa nada».**
7. ⚠️ **Cuidado con tus propias sondas.** En un solo día, TRES hallazgos de este repo eran defectos de la
   sonda. Toda medición lleva **control de discriminación** y **control de cobertura**. **Un cero sin
   control no vale.** En SQL, `NOT (condición)` sobre una clave ausente descarta la fila en silencio.
8. ⚠️ **El navegador es SOLO de A1.** El sello `cloudWriteSealed` impide escribir a producción desde
   `localhost`: **no lo desactives**. Usa puertos libres (los harnesses usan 8829/9349, 8877/9421,
   8878/9422): elige otros para lo tuyo.
9. ⚠️ **No corras matrices de sabotaje** (`_sabotaje-*`): mutan el árbol y el otro agente lo está leyendo.
10. ⚠️ **En el Bash de esta máquina, las barras invertidas dentro de un heredoc se destrozan** (`\\n` se
    vuelve salto de línea). Un script con `\` va a un archivo escrito con la herramienta de escribir.

---

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)

**Antes de investigar nada, CREA tu archivo de informe con el esqueleto de secciones vacío.** Después,
**escribe en el archivo al cerrar CADA pregunta** — no al final. En las dos rondas anteriores los agentes
se cortaron por el límite de la cuenta y lo que no estaba escrito se perdió.

Tu archivo: `docs/auditoria-construido-2026-09-30/A1-entrar.md` o `…/A2-datos.md`

```
# <código> · <área> — <tus roles>
## Veredicto en una frase
## Los 3 más grandes
   (cada uno: qué es · a quién le pasa HOY (seudónimo) · evidencia · cómo intenté tumbarlo · qué costaría)
## Todos los hallazgos
   (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿hay víctima hoy?)
## Respuesta a las preguntas del orquestador
   (una por una: CIERTA / FALSA / NO SE PUDO MEDIR, con la evidencia)
## Lo que verifiqué y está SANO (con números)
## Sospechas sin medir
## Qué NO miré y por qué
```

La sección **«Qué NO miré y por qué» no es relleno: es como se elige la próxima ronda.**

Al terminar, tu **última respuesta** debe ser un resumen de máximo 15 líneas: el veredicto y los 3
grandes. El informe completo vive en el archivo.

**Escribe en español de Colombia, en lenguaje de producto.** El PO es entrenador, no desarrollador.
