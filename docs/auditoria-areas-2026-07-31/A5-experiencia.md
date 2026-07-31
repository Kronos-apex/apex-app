# Auditoría: EXPERIENCIA Y FRICCIÓN — Sofía Castaño (CS)

> Área: **el camino, no las pantallas.** Lo que le pasa a una persona real entre que se entera
> de AVI y su tercer entrenamiento. Read-only. Cada hallazgo lleva su prueba y lo que intenté
> para tumbarlo. Lo que no pude probar está abajo, separado.

---

## El camino de una persona real, paso a paso

Conté los toques y las pantallas leyendo el código que los produce, con la línea de cada uno.
Nadie tiene que creerme: cada toque de abajo es un `onclick` citable.

### Tramo 1 — «quiero probar» → tengo cuenta: **15 toques, 9 pantallas**

| # | Toque | Dónde |
|---|---|---|
| 1 | «Crear cuenta» | `index.html:125` |
| — | escribe su nombre (el foco entra solo) | `index.html:183` |
| 2 | «Continuar →» | `index.html:184` |
| 3 | chip de **objetivo** (avanza solo) | `index.html:193-198` + `app-3-coach.js:987` |
| 4 | chip de **lugar** | `index.html:208-211` |
| 5 | chip de **nivel** | `index.html:221-223` |
| 6 | chip de **días** (`data-adv="0"` → NO avanza solo) | `index.html:233-238` |
| 7 | chip de **sexo** (opcional, pero está ahí preguntando) | `index.html:242-244` |
| 8 | «Continuar →» | `index.html:246` |
| 9 | «Continuar →» del paso 6 (edad/peso/altura, todo opcional) | `index.html:272` |
| 10 | campo **email** + teclear | `index.html:281` |
| 11 | campo **contraseña** + teclear | `index.html:284` |
| 12-14 | **tres** casillas legales, ninguna premarcada | `index.html:291,292,293` |
| 15 | «Crear cuenta y empezar →» | `index.html:295` |

Son **7 pasos de wizard** (`WZ.steps`, `app-3-coach.js:952`) más la bienvenida y el reveal.
Saltarse «sexo» ahorra un toque. Nada más es opcional de verdad: los tres consentimientos son
obligatorios (`signupClient` corta sin ellos, `app-3-coach.js:1026`).

### Tramo 2 — tengo cuenta → estoy entrenando: **3 toques más**

| # | Toque | Dónde |
|---|---|---|
| 16 | «Ver mi plan →» (reveal del plan) | `index.html:320` ← `app-3-coach.js:571` |
| 17 | «Empezar mi primer entreno →» (portada del día 1) | `app-4-entreno.js:667` |
| 18 | primera serie: teclear kg/reps + ✓ | guiado embebido |

**Total: 18 toques y 10 pantallas desde «quiero probar» hasta marcar la primera serie.**

### Y el camino tiene tres puertas que se cierran

- **Si Supabase pide confirmar el correo**, el tramo 2 no existe: `signupClient` muestra un
  **toast** y devuelve (`app-3-coach.js:1044-1047`). La persona se queda en el paso 7 del wizard,
  con el formulario lleno, y tiene que salirse de la app, buscar el correo, volver y **hacer
  login otra vez** (3 toques más). Está pasando: hay confirmación activa para el registro por
  correo (`confirmation_sent_at` no nulo en los 3 registros por email de la app) y hay **una
  persona real que se quedó ahí** (ver H3).
- **Si se registra en jueves, viernes, sábado o domingo**, el tramo 2 termina en «Hoy es tu día
  de descanso» (ver **H2**). Cero entrenamiento el día 1.
- **Si el coach lo invitó por WhatsApp**, ese enlace abre el navegador embebido de WhatsApp y la
  app le ofrece instalarse con una instrucción que ahí no aplica (ver **H5**).

### Lo que el camino NUNCA pregunta

`_provisionFreeClient` escribe a pelo `notes:''` **y `phone:''`** (`app-3-coach.js:407`). Los 13
auto-registrados están **13 de 13 sin teléfono** (query en H4) y sin una sola lesión declarada.
El motor de exclusiones por limitación y el único canal que de verdad alcanza a la gente
(WhatsApp) quedan los dos apagados de nacimiento, por dos campos que el formulario no tiene.

---

## Hallazgos verificados

### H1 · 🔴 El coach le escribe a 5 personas que NO pueden leerlo — una recibió mensaje HOY

- **Qué pasa:** el chat del asesorado está gateado por `clientHasCoach`, que devuelve **false**
  para `tier:'app'` (el plan «Premium app», $19.900). Un asesorado con ese plan ve un **candado
  que le ofrece comprar un coach**, en el mismo sitio donde están los mensajes que el coach YA le
  escribió. El contador de no leídos **no tiene ese gate**: le pinta la burbuja roja, la toca, y
  encuentra el candado.
- **Dónde:**
  - `app-4-entreno.js:2983` → `if(!clientHasCoach(...)){ ... con.innerHTML=premiumLockHTML('Chat con tu coach', ...) ; return; }`
  - `avi-core.js:1763-1764` → `clientHasCoach = !!client && !isFreeClient(client) && client.tier !== 'app'`
  - `app-4-entreno.js:2968-2974` → `updateMsgBadge` cuenta `m.from==='coach'` **sin ningún gate de tier**
  - `app-1-infra.js:742-744` → tocar la notificación push lleva a esa misma pestaña
- **Evidencia:** consulta a producción — 5 personas con `tier='app'` tienen mensajes del coach
  guardados en su propia fila:

  | nombre | msgs | del coach | último del coach | sesiones | suscripciones push |
  |---|---|---|---|---|---|
  | **Nataly** | 11 | **9** | **2026-07-31 19:39** (hoy) | 15 | **0** |
  | Natalia Martinez | 6 | 5 | 2026-05-25 | 10 | 2 |
  | Miguel Pulido | 8 | 4 | 2026-05-29 | 14 | **0** |
  | Hernán Camacho | 2 | 1 | 2026-07-08 | 0 | **0** |
  | Cristian S. Luna | 2 | 1 | 2026-07-11 | 0 | **0** |

  **20 mensajes del coach detrás de un candado.** Y 4 de las 5 tienen **cero** suscripciones push
  (`push_subscriptions`), así que tampoco los leen por notificación. Nataly es una usuaria
  **activa** (15 sesiones) a la que el coach le escribió **hoy**.
- **Intenté tumbarlo así:**
  1. *¿Hay otra pantalla donde el asesorado lea el hilo?* `grep cn-msg-thread` → **un solo**
     renderizador, `app-4-entreno.js:2978`. No hay salida alterna.
  2. *¿Se lo lleva el push con el texto?* Sí, `sendCoachChatMsg` empuja el cuerpo del mensaje
     (`app-3-coach.js:2143`) — **pero 4 de 5 no tienen suscripción**, y a la única que sí la tiene
     el toque de la notificación la deposita en el candado y sin poder responder.
  3. *¿Será que `clientHasCoach` no es lo que gatea?* La propia suite lo fija:
     `avi.test.js:2406` → `assert.strictEqual(clientHasCoach({tier:'app'}), false)`.
  4. *¿Y si el coach no usa ya ese plan?* Lo usa: 8 filas vivas con `tier='app'`, y la más
     reciente recibió mensaje hoy.
  - Lo único que **no puedo** afirmar es si alguna leyó los mensajes *antes* de que el coach le
    cambiara el plan (la fecha del cambio de tier no se guarda). Da igual para el veredicto: el
    mensaje de **hoy** a Nataly no es legible hoy.
- **A quién le pasa:** a Nataly, Natalia, Miguel, Hernán y Cristian. Y al coach, que cree que está
  conversando. Los dos que pidieron coach (Hernán, Cristian) fueron respondidos —en 11 minutos y
  en 2 días— y **ninguno ha entrenado nunca**: pidieron ayuda, se les respondió, y la respuesta
  quedó tras un candado que les vende lo que acababan de pedir.
- **Costo del arreglo:** *pequeño y de producto, no de ingeniería.* Tres opciones, en orden de
  honestidad: (a) que `tier='app'` **lea** el hilo aunque no pueda escribir (una condición en
  `app-4-entreno.js:2983`, ~10 líneas); (b) que el candado, **si hay mensajes del coach**, los
  muestre encima del candado; (c) como mínimo inmediato: gatear `updateMsgBadge` con
  `clientHasCoach` (**1 línea**) para no llamar a alguien a una puerta cerrada, y avisarle **al
  coach** en su chat que esa persona no puede leerlo (~15 líneas en `openCoachChat`). Es
  **decisión del PO**: hoy el producto cobra $19.900 por un plan que esconde mensajes ya escritos.

---

### H2 · 🔴 El día 1 puede ser «día de descanso»: el plan automático siempre empieza en lunes

- **Qué pasa:** `generarRutinas` reparte los días **consecutivos desde el lunes**, siempre. Quien
  se auto-registra un jueves, viernes, sábado o domingo con el valor por defecto (3 días) cae en
  un día sin rutina, y **la portada del día 1 nunca se pinta**, porque vive DESPUÉS del
  early-return del descanso. Su primera pantalla tras el reveal («ya armamos tu semana») es
  *«Hoy es tu día de descanso. El descanso es parte del entrenamiento»*.
- **Dónde:**
  - `avi-core.js:100` `GEN_DAY_LABELS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']`
    y `avi-core.js:748` `day: GEN_DAY_LABELS[idx]` ← índice secuencial, no hay reparto.
  - `app-4-entreno.js:802-811` → `if(!baseR){ ... con.innerHTML= banner de descanso ...; return; }`
  - `app-4-entreno.js:826` → `renderFirstRun(client, todayR)` está **14 líneas más abajo** de ese
    `return`. En día de descanso la portada del día 1 no existe.
- **Evidencia:** corrí la función pura sobre **1296 planes** (6 valores de días × 3 sexos × 3
  niveles × 6 objetivos × 4 lugares) con el catálogo real de `app-1-infra.js`:
  ```
  planes generados: 1296
  days=1: {"Lunes":216}
  days=2: {"Lunes|Martes":216}
  days=3: {"Lunes|Martes|Miércoles":216}
  days=4: {"Lunes|Martes|Miércoles|Jueves":216}
  days=5: {"Lunes|Martes|Miércoles|Jueves|Viernes":216}
  days=6: {"Lunes|Martes|Miércoles|Jueves|Viernes|Sábado":216}
  ```
  **1296 de 1296.** Ni una sola variante reparte. Y en producción se ve igual: de las 13 filas
  auto-registradas, 10 tienen exactamente ese patrón consecutivo (las otras 3 fueron editadas
  después). Los dos casos reales que cayeron en la trampa:

  | alta | plan generado | ¿día 1 tenía rutina? | sesiones |
  |---|---|---|---|
  | **viernes 12-jun** | Lunes–Jueves | **NO** | **0** |
  | **sábado 04-jul** | Lunes–Viernes | **NO** | **0** |
- **Intenté tumbarlo así:**
  1. *¿La portada del día 1 lo tapa?* No: está después del `return` del descanso. Lo verifiqué
     leyendo el orden real de `renderClientToday` (líneas 802 → 826), no de memoria.
  2. *¿El banner de descanso ofrece entrenar igual?* Ofrece «Ver todas mis rutinas →»
     (`app-4-entreno.js:808`), que sí lleva a un sitio donde puede arrancar una — pero es un
     segundo destino, no la acción, y el texto que acaba de leer le dijo que hoy **no** entrene.
  3. *¿Será que casi todos se registran en lunes?* Justo lo contrario de un descargo: 7 de 13 se
     registraron en lunes **y aun así 8 de 13 nunca entrenaron**. Por eso no digo que esto
     explique la activación entera — digo que es una puerta cerrada, con 2 víctimas nombradas y
     ambas con cero sesiones.
- **A quién le pasa:** a cualquiera que se auto-registre 4 de los 7 días de la semana.
- **Costo del arreglo:** dos arreglos independientes. (a) **Una línea de criterio**: rotar
  `GEN_DAY_LABELS` para que el primer día del plan sea **hoy** (`opts.now` ya entra a
  `generarRutinas`) — ojo, el reparto de descansos es criterio deportivo (Coach Pro), no mío.
  (b) **Quirúrgico, ~15 líneas**: en día de descanso, si la persona nunca ha entrenado
  (`firstSessionMode`), pintar la portada del día 1 con la rutina del día más cercano en vez del
  banner de descanso. La (b) sola ya cierra la puerta.

---

### H3 · 🔴 Tres personas crearon cuenta y NUNCA entraron — y el coach no sabe que existen

- **Qué pasa:** hay 3 cuentas en `auth.users` **sin fila en `user_data`**. Sin fila no hay
  asesorado: no salen en el panel del coach, no cuentan entre los 22, no reciben nada. Son
  personas que llegaron hasta «crear cuenta» y se quedaron del otro lado de la puerta.
- **Dónde / query:**
  ```sql
  select u.email, u.raw_app_meta_data->>'provider', u.created_at, u.last_sign_in_at
  from auth.users u left join user_data d on d.user_id=u.id where d.user_id is null;
  ```
  ```
  josegutierrezpe19@gmail.com   google  23-jun 13:56   entró 1 vez (al crearse)
  claudiavalbuena94@gmail.com   google  19-jul 23:08   entró 1 vez (al crearse)
  pinzonedwin121@gmail.com      email   25-jul 18:59   NUNCA entró, correo sin confirmar
  ```
- **Evidencia adicional:** el de correo (`pinzonedwin121`) tiene `confirmation_sent_at` puesto y
  `email_confirmed_at` **null** → se quedó exactamente en el toast de `app-3-coach.js:1046`
  («Te enviamos un correo para confirmar tu cuenta»). Los dos de Google encajan con la rama de
  `_enterAuthSession:513-544`: entraron por «Entrar con Google» sin haberse registrado, la app los
  expulsó con un mensaje, y la limpieza de la cuenta fantasma (`delete-account` en modo ghost,
  línea 528) **no se aplicó** — la cuenta sigue viva, y según el propio comentario del código eso
  les **bloquea para siempre** conectar ese Google a su cuenta real (`identity_already_exists`).
  **Una de ellas se llama Claudia Valbuena — y «escribirle a Claudia» lleva semanas en los
  pendientes del PO.** Se cayó por la puerta el 19-jul.
- **Intenté tumbarlo así:**
  1. *¿Serán cuentas de QA?* No: los tres son gmails de persona, y la cuenta QA
     (`qa-harness@apex.com`) sí tiene su fila.
  2. *¿Se les creó la fila y falló el guardado, en vez de haber sido expulsados?* No lo puedo
     distinguir, y eso es parte del hallazgo: **los dos caminos de fallo son mudos**. En
     `_provisionFreeClient:419-420` el fallo de `UD.createFromClient` se traga con un `warn()`, y
     `warn()` es no-op en producción (hallazgo A1). Busqué telemetría en las tres ventanas horarias
     exactas → **0 filas en `app_errors`**. Nadie puede saber por dónde se cayeron.
- **A quién le pasa:** a José, a Claudia y a Edwin. Y a cualquiera que repita el gesto.
- **Costo del arreglo:** (a) **rescate hoy, 0 código**: son 3 correos; el coach les escribe.
  (b) **que se vean**: una consulta mensual de «cuentas sin fila» o un aviso en el panel
  (~20 líneas). (c) **que no vuelva a pasar en silencio**: subir esos dos `warn` a `errReport`
  (~3 líneas, el gate ya está escrito según A1). (d) el texto tras el registro por correo no puede
  ser un toast: debe ser **una pantalla** que diga a qué correo se envió, con «Reenviar» y
  «Cambiar correo» (~40 líneas). Ese toast es el único acuse de recibo de todo el registro.

---

### H4 · 🟠 El registro no pide teléfono — y WhatsApp es el único canal que llega

- **Qué pasa:** `_provisionFreeClient` escribe `phone:''` a pelo y el wizard no tiene el campo.
  Todo el arsenal de contacto del coach (`whatsappReminder`, `whatsappNudge`, `gymInvite`,
  `coachInviteOpenApp`) depende de `waPhone(c.phone)`. Sin teléfono, ninguno funciona.
- **Dónde:** `app-3-coach.js:407` (`notes:'', phone:''`); wizard completo en `index.html:162-303`.
- **Evidencia:**
  ```
  selfReg=true → 13 filas → sin_tel = 13 / 13
  ```
  (query agrupada sobre `user_data`, `profile->>'phone'` vacío o nulo). Es el subgrupo entero.
  Combinado con el dato ya verificado del 30-jul («15 de 22 son inalcanzables»), **los 13
  auto-registrados son inalcanzables por construcción**, no por descuido del coach.
- **Agravante medido:** el mensaje que el coach manda justo para rescatarlos, `coachInviteOpenApp`
  (`app-3-coach.js:2162`), dice literalmente *«Abre AVI un momentito (solo entrar)…»* y **no
  incluye el enlace**. Sus hermanos sí lo llevan (`communityInviteMsg` en `avi-core.js:2826`,
  `shareApp` en `app-4-entreno.js:1068`). A alguien que aún no instaló la app le estamos pidiendo
  que abra algo sin decirle dónde está.
- **Intenté tumbarlo así:** *¿lo pedirá después, en el perfil?* Grepeé: el campo `phone` solo se
  edita desde el **modal del coach** (`#m-client`), nunca desde la vista del asesorado. *¿Y el
  correo sirve de canal?* Se usa una sola vez, para confirmar la cuenta; no hay ningún envío de
  producto por correo. *¿Los 13 sin teléfono serán un artefacto de mi query?* Repetí contando por
  tier (libre 5/5, app 5/5, premium 3/3): 13 de 13 en los tres grupos.
- **A quién le pasa:** a los 13 auto-registrados, y a los 8 que nunca entrenaron.
- **Costo del arreglo:** **un paso más en el wizard** (o un campo en el paso 5) con el teléfono
  como opcional-pero-pedido, + `phone:p.phone||''` en el provisionamiento: ~25 líneas. Es el
  cambio con mejor relación esfuerzo/adopción de todo este informe — convierte 13 personas
  inalcanzables en 13 alcanzables. **Y en el mismo paso cabe la pregunta por lesiones** que hoy
  falta (`notes:''`), que ya está reportada como 🔴 en el README de esta auditoría.
  El enlace en `coachInviteOpenApp`: **1 línea** (`+ ' ' + AVI_SHARE_URL`).

---

### H5 · 🟠 La puerta real es WhatsApp, y ahí la app da una instrucción que no aplica

- **Qué pasa:** la píldora «Instalar app» y la pista del login se muestran **siempre** que no se
  esté en modo standalone, sin ninguna comprobación de navegador embebido. Dentro del navegador
  de WhatsApp (WebView, no Chrome) `beforeinstallprompt` no llega, así que el toque cae en el
  respaldo: *«Abre el menú del navegador (⋮) y toca "Instalar aplicación"»*. En el menú ⋮ del
  navegador de WhatsApp **no existe** esa opción: existe «Abrir en Chrome».
- **Dónde:** `app-6-extra.js:91-96` (`showInstallBtn`, sin más condición que `isStandalone` y el
  descarte de sesión), `app-6-extra.js:151-153` (el toast del respaldo), `index.html:132`
  (`install-hint-generic`: *«Android: menú ⋮ → Instalar aplicación»*).
- **Evidencia de que no hay ninguna detección:**
  ```
  grep -rn "FBAN|FBAV|Instagram|; wv)|WhatsApp|inAppBrowser" --include=*.js --include=*.html
  → 0 coincidencias de detección (solo enlaces wa.me y textos)
  ```
  Y que el canal es WhatsApp está en el propio código, escrito por quien lo construyó:
  `app-3-coach.js:2154-2157` → *«el chat interno solo llega como PUSH a quien YA está suscrito →
  a quien no ha abierto la app NO lo alcanza (huevo/gallina). Por eso el canal es WhatsApp»*.
  Los 4 sitios que abren `wa.me` con un enlace a la app: `avi-core.js:2826`,
  `app-4-entreno.js:1068`/`1076`, `app-7-community.js:579`.
- **Intenté tumbarlo así:**
  1. *¿Habrá un guard más arriba?* No: `showInstallBtn` solo mira `isStandalone` y
     `sessionStorage.avi_install_dismissed`.
  2. *¿Y en iPhone?* Peor: `isIOS` es verdadero también dentro de WhatsApp, así que despliega los
     pasos de «Compartir ↑ → Añadir a pantalla de inicio» (`index.html:131`), que en el WebView de
     WhatsApp tampoco existen.
  3. *¿Puedo probar que la gente llega por ahí?* **No, y lo digo:** `app_errors` tiene 18 filas en
     total y ninguna con UA de WebView (`; wv`). El **defecto de código está probado**; el
     **volumen no**. Ver «Sospechas sin probar».
- **A quién le pasa:** a quien reciba la invitación por WhatsApp y toque el enlace sin salirse
  primero al navegador — que es el gesto por defecto.
- **Costo del arreglo:** ~20 líneas. Detectar WebView (`/\bwv\b|FBAN|FBAV|Instagram/` en el UA, o
  `!('BeforeInstallPromptEvent' in window)` en Android) y **cambiar el texto**, no esconderlo:
  «Ábrelo en Chrome para instalarlo — toca ⋮ → *Abrir en Chrome*» con el enlace copiable. Un
  respaldo honesto vale más que un botón que no puede cumplir.

---

### H6 · 🟠 Alguien con un plan de pago lleva 3 semanas viendo «Tu coach está personalizando tu rutina»

- **Qué pasa:** **Hernán Camacho** — se auto-registró el 6-jul, pidió coach ese mismo día, el
  coach le respondió el 8-jul, lo subió a `tier='app'` (plan de pago) — **tiene 0 rutinas y 0
  sesiones**. Lo que ve en «Hoy» desde entonces es el estado vacío: *«Tu plan aún está en
  preparación. Tu coach está personalizando tu rutina. Mientras tanto, puedes enviarle un
  mensaje»* con un botón «Ir a mensajes →»… que por H1 lo lleva a un candado.
- **Dónde:** `app-4-entreno.js:777` (el estado vacío y su botón), `app-4-entreno.js:2070` (su
  gemelo en la pestaña de rutinas).
- **Evidencia:**
  ```sql
  select profile->>'name', profile->>'tier',
         jsonb_array_length(coalesce(routines,'[]')) rutinas,
         jsonb_array_length(coalesce(history,'[]')) sesiones, updated_at
  from user_data where role is distinct from 'coach'
    and jsonb_array_length(coalesce(routines,'[]'))=0;
  → Hernan Camacho | app | 0 rutinas | 0 sesiones | updated_at 2026-07-10
  ```
  Es el **único** con cero rutinas, y es de pago. Pidió 6 días, «Ganar músculo», Intermedio, gym:
  el generador tenía todo para producirle un plan (`_autoGenerateWeek` corre siempre en
  `_provisionFreeClient:416`) — y su fila quedó vacía. Por qué, no lo sé: ese `try/catch` también
  se traga el fallo con un `warn()` mudo.
- **Intenté tumbarlo así:** *¿será que el coach le borró las rutinas a propósito?* Puede ser, y no
  cambia el veredicto: **el texto que lee afirma que alguien está trabajando en su plan**, y lleva
  3 semanas sin plan. Un texto que promete trabajo en curso necesita que alguien lo esté haciendo,
  o miente por omisión. *¿Se le avisa al coach?* No: no hay ninguna señal de «asesorado sin
  rutina» en el panel (grepeé `coachPulse`/`clientAttentionRank`: sus niveles son dolor, vencido,
  mensaje sin leer y lead — **rutina vacía no es ninguno**).
- **A quién le pasa:** hoy a Hernán. Mañana a cualquiera cuyo `_autoGenerateWeek` falle en
  silencio, porque nadie se entera.
- **Costo del arreglo:** (a) **hoy**: generarle la semana a Hernán (0 código). (b) fila
  «sin rutina asignada» en los prioritarios del coach: ~20 líneas reusando `clientAttentionRank`.
  (c) que el estado vacío no prometa lo que no puede: si el asesorado es libre, el texto debe
  ofrecer **«✨ Generar mi semana»** (`clientSelfGenerate` ya existe, `app-3-coach.js:1081`) en vez
  de mandarlo a un chat con candado: ~10 líneas.

---

### H7 · 🟠 El tier libre: la portada promete un coach y la app entrega 9 candados

- **Qué pasa:** lo primero que lee cualquiera es *«Con un coach de verdad»* y *«Tu coach arma tu
  plan, te acompaña y te responde. **Aquí no entrenas solo**»* (`index.html:115` y `:119`). Quien
  se auto-registra queda `tier:'libre'` (`app-3-coach.js:407`) y entrena **exactamente solo**: sin
  coach, sin chat, y con la app llena de candados que le venden lo que la portada ya le prometió.
- **Dónde / cuenta exacta:** **9 superficies** con `premiumLockHTML` + 1 gráfica que directamente
  se oculta + 2 banners de upsell:

  | pestaña | qué está bajo candado | línea |
  |---|---|---|
  | Mensajes | el chat **entero** | `app-4-entreno.js:2986` |
  | Historial | progreso por ejercicio · constancia · «tu entrenamiento en números» · (gráfica de volumen **oculta**) | `app-2-login.js:842`, `app-4:2193`, `app-4:2749`, `app-4:2113` |
  | Perfil | récords (PRs) · medidas · fotos · plan nutricional | `app-4:374`, `app-5:496`, `app-5:715`, `app-5:229` |
  | Hoy + Perfil | 2 banners «🌟 ¿Quieres un coach real?» | `app-3-coach.js:1100-1107` |

  De las 6 pestañas del asesorado, **una es 100% candado** y **dos son mayoritariamente candado**.
  Cada candado repite el mismo botón: **«Quiero un coach →»** — hasta **11 veces** en la app.
- **Evidencia de resultado:** los 13 auto-registrados (todos libres al nacer) suman **8 sesiones
  entre todos y 0 activos**; las 9 cuentas que creó el coach suman 156 sesiones y 7 activos.
- **Intenté tumbarlo así:**
  1. *¿El wizard corrige la promesa antes de cobrarla?* Sí, y hay que reconocerlo: el paso 7 dice
     *«Empiezas con tu **rutina automática**»* y el pie *«Cuando quieras, súmale un coach real»*
     (`index.html:279` y `:301`), y el reveal repite *«Hecho con criterio. Cuando quieras, un coach
     real lo ajusta a ti»* (`index.html:321`). **La letra pequeña está bien escrita.** Pero llega
     en el toque 10 de 15; el titular que decide si alguien empieza el wizard sigue prometiendo
     un coach.
  2. *¿La portada del día 1 le atribuye el plan al coach?* Lo perseguí y **no**: `renderFirstRun`
     usa `getCoachName()` y **se calla** si vale «Mi Coach» (`app-4-entreno.js:656-657`), que es
     justo lo que devuelve para un libre, porque `ax_cn` es clave de coach y no baja al asesorado
     (`app-1-infra.js:927`). Está bien resuelto y **retiro** ese hallazgo.
  3. *¿Se le dice el precio en algún momento?* **No.** El modal de upsell (`index.html:1678-1702`)
     no lleva cifra; los precios ($19.900 / $100.000) solo existen en la pantalla del coach
     (`app-3-coach.js:1144-1146`).
- **A quién le pasa:** a los 13 auto-registrados.
- **Costo del arreglo:** es **decisión de producto del PO**, no un fix. Lo que sí puedo afirmar
  con la cuenta hecha: un producto donde 3 de 6 pestañas son candado se siente **demo**, no
  producto. Mi recomendación: que el tier libre tenga **un techo con fondo** —historial, récords y
  constancia abiertos (son SU esfuerzo, no una función premium)— y que el candado se reserve a lo
  que de verdad exige a una persona (chat, nutrición, ajuste del plan). Mover 4 condiciones,
  ~1 hora. Lo otro, la portada: o el tier libre entrega algo parecido a un coach, o el titular
  deja de prometerlo.

---

### H8 · 🟠 El 28% que abandona a mitad: nadie —ni la app ni el coach— reacciona jamás

- **Qué pasa:** una sesión a medias se guarda con `doneSets`/`totalSets`, y ese dato **solo se
  pinta**. No alimenta ninguna señal: ni `coachInsight` (las 8 señales del asesorado), ni
  `coachPulse` (los motivos del coach), ni `weeklyMissed` —que solo mira si hubo **alguna** sesión,
  así que una sesión al 20% le calla la tarjeta de «te quedó pendiente»—, ni
  `finishedTrainingToday`, que exige `finishedAt`. Resultado: quien deja el entreno a la mitad no
  recibe nada al día siguiente, y el coach no se entera.
- **Dónde:** `grep doneSets *.js` → **todas** sus lecturas son de presentación
  (`app-4:2251`, `:2273`, `:2280`, `:2904`, `:2912`, `:2945`) más `sessionFinished`
  (`avi-core.js:1005-1009`). Ninguna en `coachInsight`/`coachPulse`/`weeklyMissed`.
- **Evidencia — dónde se van (esto NO necesitaba instrumentación nueva, ya estaba en los datos):**
  ```
  169 sesiones con ejercicios · 120 completas · 49 incompletas (29%) · avance medio 53,6%
  se van en el ejercicio 1  →  10 de 49   (de rutinas de 5-7 ejercicios)
  se van en el ejercicio 2  →   4 de 49
  llegan al ÚLTIMO ejercicio y no lo cierran → 12 de 49
  ejercicios por rutina (media) → 6,3
  sesiones con finishedAt → 34 de 169
  ```
  Son **dos fenómenos distintos metidos en el mismo 28%**: **14 de 49** se caen en los dos primeros
  ejercicios (abandono de verdad) y **12 de 49** llegaron hasta el último ejercicio (entrenaron —
  simplemente no cerraron la sesión). Tratarlos igual es lo que hace que el número no se pueda
  accionar.
- **Intenté tumbarlo así:** *¿habrá una señal de abandono que se me escapó?* Grepeé los tres
  motores puros; sus ramas son récord, racha, inactividad, estancamiento, deload, adaptación, peso
  y agua. Ninguna mira el avance de la sesión. *¿Y el harness de fin de entreno?* `showWorkoutFinish`
  muestra el porcentaje, pero es la pantalla de cierre: solo la ve quien **sí** cierra.
- **A quién le pasa:** a 49 sesiones de las 169 medidas.
- **Costo del arreglo + la instrumentación mínima que faltaba:**
  - **Ya se puede responder «dónde» sin escribir una línea**: la consulta de arriba. Lo que falta
    es el **cuándo** y el **por qué**.
  - **Instrumentación mínima (~15 líneas, un campo):** guardar en la sesión el **timestamp de la
    última serie marcada** (`lastSetAt`) junto al `startedAt` que ya existe. Con eso se responde
    todo lo que hoy es opinión: cuánto duró antes de morir, si se fue en el descanso entre series
    (mismo minuto = interrupción) o si simplemente no volvió (horas de hueco), y si abandona el
    mismo ejercicio siempre. Un campo, en `saveSessionToHistory` (`app-4-entreno.js:1697`), que ya
    se llama en cada auto-guardado.
  - **Y `finishedAt` en las 100%** (hoy solo 34 de 169 lo tienen), para poder medir duración real
    y contrastar los 64,7 min reales contra los 38-49 que promete `estimateWorkoutMinutes`
    (hallazgo de A4). ~2 líneas.
  - **La reacción, después:** un «¿seguimos donde lo dejaste?» al volver el mismo día, y una fila
    en el pulso del coach para quien deja entrenos a medias dos veces seguidas. Pero **primero se
    mide**: hoy proponer la reacción sin el `lastSetAt` sería adivinar.

---

## Sospechas sin probar

1. **El volumen del navegador embebido de WhatsApp.** El defecto de H5 está probado en el código;
   **cuánta gente entra por ahí, no**. `app_errors` tiene 18 filas y ninguna con UA de WebView.
   *Para probarlo faltaría:* mandar el UA (o un `inapp:true`) en un ping de arranque, o mirar los
   `Referer`/UA de los logs de acceso de GitHub Pages (que no tengo).
2. **Los 3 pasos de datos corporales del wizard (edad/peso/altura) podrían no estar pagándose.**
   Son opcionales y el generador funciona sin ellos; sospecho que un paso entero se podría
   fusionar o mover a después del primer entreno. *Para probarlo faltaría* medir cuántos los
   rellenan: es un dato que sí está en `user_data.profile`, pero mezcla a los que creó el coach
   con los auto-registrados y con n=13 no distingue nada.
3. **Los dos que pidieron coach acabaron en `tier='app'` (el plan SIN coach).** Pidieron un coach
   y recibieron el plan que no lo incluye. Puede ser una decisión comercial deliberada del PO o un
   malentendido del control de planes. *No lo puedo determinar desde el código ni desde los datos*
   — se lo tiene que decir él.
4. **La sesión a medias vive solo en `localStorage`** (`done_`/`log_`, no están en `SB_KEYS`), así
   que sospecho que cambiar de teléfono o perder la caché borra el entreno en curso. No lo probé
   con dos dispositivos; *faltaría* un harness con dos perfiles de navegador.

---

## Lo que revisé y está SANO

- **La portada del día 1 (variante C) es buen trabajo** cuando llega a pintarse: una sola salida,
  apaga las 9 tarjetas que competían, y se apaga sola con la primera sesión aunque sea parcial
  (`app-4-entreno.js:740-747`). Mi única pega es **dónde** vive (H2), no cómo está hecha.
- **La atribución del plan NO miente.** Perseguí «X te armó tu plan» esperando un texto falso para
  el auto-registrado y el guard ya estaba puesto y bien puesto (`app-4-entreno.js:656-657`).
  **Retiro esa sospecha.**
- **Los tres consentimientos legales están bien planteados**: separados, ninguno premarcado, y el
  mismo gate para el camino de Google (`_wzConsent`, `app-3-coach.js:946`; `wzGoogle:1066`).
  Cuestan 3 toques y valen los 3.
- **El tono de los toasts del asesorado está limpio**: revisé los ~60 textos de `app-4`, `app-5` y
  `app-7`; son humanos, cortos y no culpan («Marca al menos una serie para guardar tu entreno 💪»,
  «Solo por hoy 👍»). Dos pecadillos veniales, no vale la pena tocar código por ellos: *«⚖️ Peso
  **registrado**»* (mi propia regla dice «guardado») y *«Disponible solo con sesión iniciada»*.
- **La promesa «tu coach te contactará pronto» SE CUMPLIÓ** en los dos casos que existen: 11
  minutos y 2 días. El problema no fue la respuesta (H1 es que no la pueden leer).
- **El respaldo cuando falla el guiado** es correcto: tarjeta con «Recargar la app» y «Tus datos
  están a salvo», nunca pantalla en blanco (`app-4-entreno.js:831-836`).
- **La píldora «Instalar app» ya no roba toques** — el hit-testing con `pillStealsTap`
  (`app-6-extra.js:184-224`) está bien resuelto y documentado. No lo re-auditué: lo cerró la FASE 2.
- **Reanudar el mismo día funciona**: las claves de sesión sobreviven a recargar y solo se limpian
  al cambiar de día (`checkAndResetSession`, `app-4-entreno.js:1467-1482`).

---

## Lo que NO alcancé a revisar

- **No corrí los harnesses.** El recuento de toques y pantallas está hecho **leyendo el código que
  los produce**, con línea por toque — es verificable, pero no es una medición en vivo. Lo que
  faltaría comprobar en el aparato: que ningún paso del wizard exija scroll a 360px y que el foco
  automático del paso 1 abre el teclado (dos cosas que cambian el recuento real).
- **No revisé el camino del asesorado que crea el COACH** (correo + clave enviados a mano). Es la
  cohorte que sí funciona (156 sesiones, 7 activos) y por eso prioricé la que no; pero ahí vive el
  otro 40% de las personas.
- **No revisé la experiencia del COACH** (su panel, su carga de trabajo diaria) — es área de
  «negocio y producto», que sigue sin auditar.
- **No medí nada de Comunidad** más allá de comprobar que no tiene candados de tier.
- **No abrí los mensajes reales** entre coach y asesorados: conté cuántos hay y de quién, no qué
  dicen. El tono de la voz del coach en sus propias palabras queda sin auditar (y es él quien la
  escribe, no la app).
- **El día 1 de quien entra por Google** no lo seguí punta a punta: la evidencia de que 11 de 13
  auto-registros llegaron por Google es fuerte, y ese camino pasa por `ax_wz_pending` y por una
  salida a otra página; merece su propio repaso.
