# F2 · Fotos privadas y lo que sale de la app — Andrés Q. (DBA/Storage/RLS) + Sofía Castaño (CS)

## Veredicto en una frase

Los buckets están bien cerrados — lo probé atacándolos de verdad (asesorado contra asesorado,
coach QA contra un asesorado del PO, anónimo contra los tres buckets privados) y los tres ataques
fallaron — y borrar una cuenta sí limpia las cuatro rutas de Storage y la vitrina pública; pero el
candado de menores tiene un agujero real y repetido (una edad vacía se lee como «no es menor», y
el formulario del coach no exige la edad), y **nadie** —adulto o menor— sabe que la foto que sube a
su perfil puede terminar, a toda pantalla, en una imagen que el coach comparte fuera de la app: ni
la app se lo dice al subirla, ni la política legal lo menciona.

## Los 3 más grandes

### 1. Una edad VACÍA apaga el candado de menores, en DOS sitios con la MISMA fórmula rota, y el
   formulario del coach no obliga a escribirla

- **Qué es:** `clientProgressStory` (avi-core.js:11264-11265) decide si alguien es menor así:
  `const edad = parseInt(client.age); if (edad && edad < 18 && !showcaseMinorOk(client)) return
  {ok:false, razon:'menor'};`. Si `client.age` está vacío/`null`, `parseInt(undefined)` da `NaN`, y
  `NaN && …` es `false` — el `if` NUNCA se ejecuta. Una persona SIN edad registrada se trata como
  **adulta publicable**, exactamente la lección que v565 ya dejó escrita en este mismo repo («el
  defecto por defecto es la rama menos protectora»). La MISMA fórmula, con la MISMA falla, vive
  duplicada en `app-4-entreno.js:3622` (`parseInt(_shClient.age)<18`, el candado de «Compartir este
  entreno» que arma el coach desde una sesión guardada).
- **A quién le pasa HOY, con nombre:** a nadie todavía — medí las 26 fichas reales con coach y
  **ninguna tiene `age` vacío** (SQL: `profile->>'age' is null or =''` → 0 filas). Pero el camino
  para crear la víctima está abierto: en el modal «Nuevo asesorado» del coach (`index.html:1048`),
  el campo `Edad (años)` es el ÚNICO de los datos que deciden algo legal que NO lleva asterisco de
  obligatorio — a diferencia de Nombre* y Email*. `saveClient()` (app-3-coach.js:258) solo exige la
  edad si el coach ADEMÁS marca la casilla de consentimiento (línea 282: `if(_ckC&&_ckC.checked&&
  !(data.age>0))`); si el coach guarda la ficha sin marcar esa casilla, `data.age` se queda en
  `null` sin ningún aviso.
- **Evidencia:** `avi-core.js:11264-11266` (la función), `app-4-entreno.js:3617-3623` (la segunda
  copia), `index.html:1048` (el campo sin `*`), `app-3-coach.js:239-306` (`saveClient`, sin exigir
  edad fuera de la rama de consentimiento). SQL contra producción: `select profile->>'name' from
  user_data where coach_id is not null and (profile->>'age' is null or profile->>'age'='')` → 0
  filas hoy.
- **Cómo intenté tumbarlo:** pensé que la app force­ara la edad en TODA alta, no solo en el
  auto-registro — el propio CLAUDE.md dice «la edad es obligatoria en el auto-registro (12–99)»,
  pero esa frase describe el asistente de auto-registro del asesorado, NO el modal del coach. Los
  leí los dos por separado: el de auto-registro sí la exige; el del coach, no. También probé si
  `showcaseMinorOk` compensaba el hueco por otra vía — no: esa función solo entra en juego cuando
  `edad && edad<18` ya fue cierto, así que con `edad` vacía nunca se llega a preguntarle nada.
- **Qué costaría arreglarlo:** una función pura (`esMenorSinDato` o extender
  `clientProgressStory`/el guard de línea 3622 para que `!(edad>0)` cuente como «no se puede
  publicar sin confirmar que es adulto», igual que ya hace el piso nutricional de menores con datos
  ausentes) + quitar la rama que hoy trata «sin dato» como «adulto». Y en el formulario, exigir la
  edad SIEMPRE que se vaya a guardar un asesorado nuevo (no solo cuando se marca consentimiento).
  Una tarde, sin tocar el modelo de datos.

### 2. Las imágenes de «logro» y «cierre del entreno» —las dos que arma el propio asesorado, con su
   cara a sangre— no llevan ningún candado de edad, y **nadie sabe que va a pasar** cuando sube su
   foto de perfil

- **Qué es:** de las 3 imágenes, solo la que arma el COACH (`_storyDrawG`, v667) pasa por
  `clientProgressStory` y su candado de menores. Las otras dos —`_gxCard` (app-4:728, el logro) y
  `_wfDrawShareG`/`wfShare` (app-4:3006/3105, el cierre)— se disparan directo desde la pantalla del
  PROPIO asesorado (`gxShareLogro`/`gxShareWeek`/`wfShare`) sin preguntar la edad en ningún punto.
  **Esto es, en parte, DISEÑO A PROPÓSITO** — lo dice el propio comentario del cuarto camino que sí
  tiene candado (app-4-entreno.js:3619-3621): «el coach NO comparte el entreno de un menor sin
  permiso… En la app del propio asesorado no cambia nada: es SU dato y SU pantalla de cierre ya se
  lo ofrece» — es decir, la intención es que el candado proteja lo que el COACH publica a nombre de
  otro, no lo que la persona comparte de sí misma. Lo que NO es diseño, es que **nadie se lo dice a
  la persona**: `openAvatarPicker`/`saveAvatar` (app-4-entreno.js:570-602) solo muestran
  `⏳ Subiendo foto...` y `📸 Foto de perfil actualizada` — cero mención de que esa foto puede salir
  a pantalla completa en una imagen para WhatsApp/Instagram, ni de que puede terminar en la página
  pública del coach.
- **A quién le pasa HOY, con nombre:** a los **8 de 27 asesorados con foto de perfil** (medido el
  22-sep, cifra que cita el propio código en v661) cada vez que terminan un entreno o desbloquean un
  logro — entre ellos personas adultas que jamás leyeron que su foto se usaría así. Hoy **ninguno de
  los 4 menores** (Sharith 16, Santiago 17, Samuel 15, Valery 15) tiene foto de perfil, así que hoy
  no hay un menor concreto expuesto por esta vía — pero el día que uno la suba, su foto sale a
  sangre en su propia pantalla de cierre y en la tarjeta de logro **sin ningún candado**, porque esas
  dos superficies fueron diseñadas para no tenerlo.
- **Evidencia:** `app-4-entreno.js:725-825` (`_gxCard`, sin ningún chequeo de edad),
  `app-4-entreno.js:2995-3104` (`_wfDrawShareG`/`wfShare`, ídem), `app-4-entreno.js:570-602`
  (`openAvatarPicker`/`saveAvatar`, el único texto es el toast de confirmación).
- **Cómo intenté tumbarlo:** busqué CUALQUIER texto en `index.html`/`app-4-entreno.js` que avisara
  «esta foto puede aparecer en imágenes que compartes» — no existe ninguno (grep de
  `vitrina|showcase|página pública` en los archivos del asesorado: 0 resultados fuera del panel del
  coach). Revisé si el aviso vivía en el flujo de bienvenida/consentimiento inicial —
  `legal/autorizacion-consentimiento.md` §B solo autoriza tratar «fotos de progreso» para
  «personalizar mis rutinas y seguir mi evolución», no para compartir fuera de la app.
- **Qué costaría arreglarlo:** una línea de texto bajo el selector de foto de perfil («Se puede usar
  en las imágenes que compartes al terminar un entreno o un logro») — medio día. Decidir si esto
  necesita o no el mismo candado de edad que la tarjeta del coach es una decisión de producto/legal,
  no técnica: lo dejo para el PO con la evidencia de arriba.

### 3. El respaldo local del computador del PO (45 días, con fotos en base64) sobrevive al borrado
   de cuenta, y la política legal no lo menciona en ninguna parte

- **Qué es:** `legal/politica-tratamiento-datos.md` §10 promete: «Al eliminar tu cuenta se borran de
  inmediato y para siempre: tu perfil… tus fotos… **Copias de seguridad:** la base de datos se
  respalda a diario y esos respaldos se conservan **hasta 90 días**» — y solo describe el respaldo
  de la NUBE (`apex_data_backups`). No dice una palabra del segundo respaldo, que vive en
  `C:\Users\KRONOS\Desktop\AVI\backups` (Tarea de Windows diaria, `scripts/backup-local.mjs`, 45
  días de retención) y que **si contiene la foto de alguien, la contiene en base64 dentro del
  JSON**: comprobé el archivo de HOY (`avi-backup-2026-09-23.json`) y trae cadenas
  `data:image/jpeg;base64,/9j/4AAQ…` reales. El propio código de `delete-account/index.ts` lo dice
  en su comentario (línea 34-37): «LO QUE NO SE PUEDE BORRAR AQUÍ… editar un respaldo para sacarle
  una persona lo rompe como respaldo» — refiriéndose solo al de la nube; el local ni se menciona
  porque la función no tiene forma de tocarlo (vive fuera de Supabase, en el PC del PO).
- **A quién le pasa HOY, con nombre:** cualquiera de las personas cuya foto viaja hoy en base64
  dentro de la fila (ver pregunta 5: jhojan hernandez, Miguel Pulido, Nicolás Andrés Gutiérrez
  Serrano) queda con su foto en TODOS los backups locales de los últimos 45 días que ya se tomaron,
  y si alguna de esas 3 personas borrara su cuenta mañana, su foto seguiría en esos archivos hasta
  que caduquen — un plazo que la política legal no le informa a nadie.
- **Evidencia:** `legal/politica-tratamiento-datos.md:130-139` (§10, no menciona el backup local);
  `supabase/functions/delete-account/index.ts:34-37` (el comentario que reconoce el límite, solo
  para el respaldo de la nube); archivo local `avi-backup-2026-09-23.json` con `data:image/jpeg`
  confirmado por grep; `CLAUDE.md` sección «Respaldos» confirma la existencia y el plazo de 45 días
  del mecanismo, ajeno a Supabase.
- **Cómo intenté tumbarlo:** pensé que quizás el backup local NO incluye `photos` (podría limpiar
  solo `user_data`/`apex_data` estructurales) — el grep lo desmiente directamente sobre el archivo
  de HOY. También pensé que quizás está mencionado en otra parte de `legal/` (busqué «45 d»,
  «local», «Desktop», «backup-local», «respaldo local» en los 4 archivos de `legal/`) — cero
  resultados.
- **Qué costaría arreglarlo:** una frase en la política («además, para poder recuperar toda la
  aplicación ante un desastre, hay una copia adicional fuera de la nube que se conserva 45 días»)
  es gratis. Que el borrado de cuenta realmente alcance esa copia no es técnicamente razonable
  (romper un respaldo para editarlo es peor que dejarlo), así que la solución honesta es
  **declarar** el plazo, no perseguir el borrado retroactivo.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | Edad vacía desactiva el candado de menores en `clientProgressStory` y en el candado de «Compartir este entreno»; el modal del coach no exige la edad | `avi-core.js:11264-11266`, `app-4-entreno.js:3617-3623`, `index.html:1048`, `app-3-coach.js:258-286` | No (0 fichas con edad vacía hoy) — camino abierto |
| 🟡 | Logro y cierre del entreno (imágenes 1 y 2) muestran la foto de perfil a sangre sin candado de edad — diseño a propósito, pero sin aviso a la persona | `app-4-entreno.js:725-825`, `2995-3104` | Sí, indirectamente: 8/27 personas ya suben foto y no saben que se usa así |
| 🟡 | Subir la foto de perfil no dice dónde se va a usar (imágenes compartidas, vitrina pública) | `app-4-entreno.js:570-602` | Sí, las mismas 8 personas |
| 🟡 | La política legal (`autorizacion-consentimiento.md` §B, `politica-tratamiento-datos.md`) no cubre la vitrina pública ni las 3 imágenes compartibles — solo cubre «Comunidad» (opt-in, distinta) | `legal/*.md` | Sí, para cualquiera con foto |
| 🟡 | El respaldo local (45 días, base64) sobrevive al borrado de cuenta y no está declarado en la política legal | `legal/politica-tratamiento-datos.md:130-139`, backups locales | Sí, para las 3 personas con foto en base64 hoy, si borraran su cuenta |
| 🟢 | Storage RLS de `progress-photos`/`chat-media`/`apex-photos`: asesorado↔asesorado, coach↔coach y anónimo, los tres ataques BLOQUEADOS (medido con impersonación real) | `storage.objects` policies | No — SANO |
| 🟢 | Enlaces firmados: 1 hora para las 3 superficies (chat, progreso, perfil), misma función `_chatMediaUrl` | `app-1-infra.js:290-301` | No — SANO |
| 🟢 | `sw.js` NUNCA cachea respuestas de `supabase.co` (ni guarda, ni sirve caché para ese origen salvo el `caches.match` de emergencia, que nunca tendría nada guardado) | `sw.js:75-77` | No — SANO |
| 🟡 | `_chatMediaUrls` (caché de URLs firmadas en memoria) y el DOM del panel anterior NO se limpian en `logout()`, a diferencia de `_pushCtx`/`CMTY`/`_authUid` que sí siguen el patrón anti-fuga de v398 | `app-1-infra.js:289`, `app-2-login.js:463-511` | No pude confirmar un caso visible (ver «Sospechas sin medir») |
| 🟢 | `delete-account` v8 limpia, en orden: vitrina pública, push, `app_errors`, los 4 buckets (por páginas de 100), `community_resolve_attempts`, y al final la cuenta | `supabase/functions/delete-account/index.ts` | No — SANO |
| 🟢 | `avi_showcase` (4 tarjetas): solo primer nombre + kg de ejercicio, sin apellido/edad/peso/foto; ninguna es de un menor; INSERT solo por moderador, sin grant de UPDATE | SQL contra producción | No — SANO |
| 🟢 | Capturas viejas de la web (incluida la que saludaba a un menor) ya no se sirven — confirmado con `curl` contra `avientrena.com` en vivo; las nuevas son de una persona 100% inventada («Mariana»), generada localmente sin tocar datos reales | `avi-web/public/shots/2026-09/`, `scripts/e2e/_capturas-web.mjs` | No — SANO |
| 🟢 | `avatars` (bucket público) tiene 2 objetos: el avatar del propio coach (Comunidad) y un archivo de 344 B de la cuenta QA de pruebas — ninguno es un asesorado real | SQL contra producción | No — SANO |
| 🟢 | 3 fotos de progreso en base64 dentro de la fila (jhojan hernandez, Miguel Pulido, Nicolás Gutiérrez — ninguno menor) están protegidas por la misma RLS de `user_data` (dueño+coach); no hay camino de código hacia nada público | SQL + lectura de `clientProgressStory`/`showcaseRow` | No — privadas, pero probablemente nunca se muden (ver abajo) |
| 🟢 | `app_errors.ctx`: 0 de 31 filas con pista de foto/URL firmada/token; las subidas fallidas de foto solo van a `console.warn`, nunca a `app_errors` | SQL + `app-1-infra.js:469-503` | No — SANO |
| 🟢 | Ninguna de las 3 imágenes imprime % de grasa, peso corporal, medidas o dolor — solo duración/calorías/series/volumen/PRs (carga de ejercicio, que sí conserva color por regla explícita del repo) | `app-4-entreno.js:2760-2765`, `avi-core.js:6199-6203`, `app-3-coach.js:2178-2196` | No — SANO |

## Respuesta a las preguntas del orquestador

**1. Políticas de Storage — ¿quién puede LEER, LISTAR, SUBIR y BORRAR?**

Para `progress-photos`, `chat-media` y `apex-photos` (privados, las 3 con las mismas 4 políticas):
LEER/LISTAR/SUBIR/BORRAR solo el **dueño de la carpeta** (`(storage.foldername(name))[1] =
auth.uid()::text`) **o su coach** (`exists (select 1 from user_data where user_id=carpeta and
coach_id=auth.uid())`). Nadie más — ni otro asesorado, ni otro coach, ni anónimo.

Para `avatars` (público): SUBIR/ACTUALIZAR/BORRAR solo el dueño de la carpeta (sin excepción de
coach); LEER es libre para cualquiera con la URL porque el bucket es **público por diseño**
(Comunidad, decisión congelada — falso positivo conocido).

**Probado con impersonación real (transacción con rollback, roles reales) contra `progress-photos`:**
- CONTROL (debe pasar): Andrés (coach real) lee la carpeta de Samuel, su asesorado → **5 filas** ✅
- CONTROL (debe pasar): Claudia lee su propia carpeta → **1 fila** ✅
- ATAQUE: coach QA (`d69a24f5…`) lee la carpeta de Samuel (asesorado de OTRO coach) → **0 filas** ✅ bloqueado
- ATAQUE: Claudia (asesorada A) lee la carpeta de Samuel (asesorado B, mismo coach) → **0 filas** ✅ bloqueado
- ATAQUE: Claudia lee `chat-media` de Natalia → **0 filas** ✅ bloqueado
- ATAQUE: anónimo lee `progress-photos`/`chat-media`/`apex-photos` completos → **0/0/0** ✅ bloqueado
- Control de cobertura del propio anónimo: el mismo rol anon SÍ lee `avi_showcase` (**4 filas**) →
  confirma que la impersonación de `anon` funciona de verdad y que los ceros de arriba son RLS, no
  un rol roto.

**CIERTA-y-verificada**: las políticas son correctas y se sostienen bajo ataque real.

**2. Los enlaces firmados — duración y fugas.**

Los tres (chat, foto de progreso, foto de perfil) usan la MISMA función `_chatMediaUrl`
(`app-1-infra.js:290-301`) con `expiresIn:3600` — **1 hora para las tres**, no solo el chat.

- **«Compartir»**: comparte un archivo binario (PNG) + texto con el link de `avientrena.com` — nunca
  una URL firmada de Storage. SANO.
- **`app_errors.ctx`**: 0 de 31 filas con rastro de foto/URL/token; las fallas de subida de foto solo
  van a `console.warn`, nunca a la tabla. SANO.
- **`sw.js` y el teléfono compartido**: el Service Worker tiene una rama explícita para
  `supabase.co` (`sw.js:75-77`) que hace `fetch(...).catch(()=>caches.match(...))` **sin ningún
  `_guardar()`** — o sea que NUNCA escribe una respuesta de `supabase.co` (incluido
  `/storage/v1/...`) en el Cache Storage del navegador. Confirmado leyendo las 6 ramas del `fetch`
  handler: la única que toca `supabase.co` no llama a `_guardar`, y ninguna otra rama matchea ese
  hostname. **FALSA la hipótesis de que `sw.js` cachea fotos.**
- **La vitrina** (`avi_showcase`): no guarda ningún campo de foto — solo nombre/entrenos/meses/kg de
  ejercicios. No hay URL firmada que pueda escaparse por ahí. SANO.
- **Pero hay un cabo suelto de la MISMA familia de bug del teléfono compartido**: `_chatMediaUrls`
  (la caché de URLs firmadas EN MEMORIA, `app-1-infra.js:289`) y el DOM del panel anterior no se
  limpian en `logout()` — a diferencia de `_pushCtx`/`CMTY`/`_authUid`, que sí siguen el patrón
  anti-fuga que v398 dejó escrito para exactamente este escenario («en el perfil de Astrid aparecía
  el mío»). No pude confirmar una fuga visible sin navegador (fuera de mi alcance en esta ronda);
  ver «Sospechas sin medir».

**CIERTA para chat (1h) y AMPLIADA para progreso/perfil (también 1h, no algo distinto). FALSA la
hipótesis de la caché del service worker.**

**3. Borrar una cuenta — ¿qué queda?**

Leyendo `delete-account/index.ts` v8 (NO se ejecutó): borra, en este orden, ANTES de la cuenta
(irreversible): su tarjeta en `avi_showcase` (atada por coach_id+primer nombre), sus
`push_subscriptions`, sus filas en `app_errors`, sus archivos en los 4 buckets (`avatars`,
`apex-photos`, `chat-media`, `progress-photos`, por páginas de 100 con tope de 50 vueltas) y su fila
en `community_resolve_attempts`; al final borra `auth.users`, lo que cascadea `user_data` (perfil,
rutinas, historial, récords, peso, medidas, nutrición, fotos, mensajes) y toda la Comunidad.

**Lo que NO borra, y por diseño no puede:**
- `apex_data_backups` (nube): confirmado 26 filas, ventana 2026-06-28 → 2026-09-25 (≈89 días) —
  cuadra con lo que promete la política legal («hasta 90 días»).
- **Los respaldos locales del PC del PO** (`Desktop/AVI/backups`, 45 días, confirmé
  `data:image/jpeg;base64` real en el backup de hoy) — **esto NO está declarado en
  `legal/politica-tratamiento-datos.md`**, que solo habla del respaldo de la nube. Ver hallazgo #3.

**Lo que promete `legal/` §10** («se borran de inmediato y para siempre: tu perfil, tus rutinas, tu
historial… tus fotos… también se retira de la página pública de tu entrenador la tarjeta con tu
progreso») **SÍ se cumple** en la base de datos y en Storage — el código hace exactamente eso. Lo
que la política NO dice es la existencia del respaldo local de 45 días.

**4. Las 3 imágenes compartibles.**

- **(a) ¿El candado de menores en las TRES?** FALSA. Solo la tarjeta que arma el COACH
  (`_storyDrawG`, vía `clientProgressStory`) lo tiene. Las otras dos (logro y cierre), que arma el
  PROPIO asesorado sobre sí mismo, no llevan ningún candado — y por el comentario de
  `app-4-entreno.js:3619-3621` esto es **decisión de diseño**, no descuido: «es SU dato y SU
  pantalla». Con la edad VACÍA, incluso las dos superficies que SÍ tienen candado (la tarjeta del
  coach y «Compartir este entreno») lo pierden — ver hallazgo #1.
- **(b) ¿Imprime % de grasa o datos de salud?** FALSA. Ninguna de las tres imprime % de grasa, peso
  corporal, medidas ni dolor. Solo duración/calorías/series/volumen y récords de CARGA de ejercicio
  (kg levantados), que el propio repo declara explícitamente que sí puede llevar color (regla de
  Valery, v607/v668).
- **(c) ¿El asesorado sabe/consiente que su cara sale en la imagen que arma el COACH?** FALSA (no
  hay aviso). No hay ningún consentimiento específico ni aviso en pantalla para el asesorado ADULTO
  cuando el coach construye/comparte su tarjeta de progreso (`shareClientProgress`,
  `app-3-coach.js:2051-2063`): el botón «Crear la imagen para compartir» está siempre disponible
  para cualquier adulto con ≥8 sesiones, sin pedirle nada a él. La política legal solo describe
  consentimiento de publicación para MENORES (vía `registrarPermisoVitrina`) y solo para la
  finalidad de «Comunidad» — nunca para esto. **El día que un menor suba foto**: su tarjeta de
  logro y de cierre saldrán con su cara a sangre sin ningún candado (por diseño, ver (a)); su
  tarjeta de PROGRESO (la que arma el coach) SÍ quedará bloqueada — salvo que su edad esté vacía,
  en cuyo caso también se publicaría.

**5. Las 3 fotos en base64 dentro de la fila.**

Identificadas: **jhojan hernandez** (18 años, 1 foto), **Miguel Pulido** (29, 1 base64 + 1 ya
migrada), **Nicolás Andrés Gutiérrez Serrano** (34) — ninguno menor. `¿Abren la app?`: su
`updated_at` es reciente (18-21 sep) pero su ÚLTIMA SESIÓN de entreno es vieja (24-jun, 30-jun,
7-ago) — probablemente no están abriendo su propio perfil lo suficiente como para disparar
`migrateProgressPhotosPrivate()` (que exige `CUR.clientId===_authUid===cid`, o sea que la persona
esté viendo SU PROPIO perfil logueada como ella misma). `¿Camino hacia algo público?`: NO. La RLS de
`user_data` (`user_data_select`) solo deja ver la fila al dueño o a su coach, y ni
`clientProgressStory` ni `showcaseRow` leen `DB.photos`/`user_data.photos` en ningún punto — solo
leen `avatarPath`/`avatar` (foto de PERFIL, campo distinto). Privadas y sin salida. SANO.

**6. `avatars` tiene 2 objetos.**

`0a6484ed…/avatar.jpg` (64.463 B) = el avatar del propio **Andrés Martínez** (el coach/PO), para su
perfil de Comunidad. `9418640a…/_r4-…jpg` (344 B) = de la cuenta **«🧪 QA HARNESS (no borrar)»**, un
resto de pruebas automatizadas, no un asesorado real. Ninguno es una persona real expuesta por
accidente.

**7. La vitrina pública y las capturas de la web.**

`avi_showcase` (4 tarjetas, verificado con SQL): Kathe, Claudia, Nataly, Astrid — solo primer
nombre + kg de ejercicios concretos (no peso corporal); ninguna es menor; `objetivo` es el único
campo nuevo y no es dato sensible. SANO. Las capturas de `avi-web/public/shots/`: el historial de
git (`git log`) muestra un único commit de reemplazo (`734dd04`, 23-sep) cuyo propio mensaje
confirma el problema que vengo a verificar: la versión anterior «saludaba a un asesorado MENOR de
edad en una página pública». **Confirmé con `curl` en vivo contra `https://avientrena.com/`**: las
rutas viejas (`/shots/app-plan.png`, etc.) dan **404**, las nuevas (`/shots/2026-09/*.png`) dan
**200**. Las nuevas capturas las genera `scripts/e2e/_capturas-web.mjs` con una persona
**100% inventada** («Mariana», `id:'demo-web'`), sin login ni red — confirmé leyendo el script, no
hay forma de que se cuele un dato real. SANO en ambas partes de la pregunta.

**8. Lo que la persona ENTIENDE (Sofía).**

- **Subir foto de perfil**: NO se dice dónde va a aparecer. El único texto es
  `📸 Foto de perfil actualizada` (`app-4-entreno.js:599`). Nadie le avisa que esa foto puede salir
  a pantalla completa en una imagen que comparte a WhatsApp, ni que puede terminar en la página
  pública del coach.
- **Chat — foto o video**: el texto de la política (`legal/politica-tratamiento-datos.md` §9, que
  describe Comunidad) SÍ explica bien quién ve las publicaciones del muro, pero el chat foto/video
  de `chat-media` (v649) es una función DISTINTA y no está descrita en ningún lado del texto legal
  ni de la interfaz del chat: no encontré, dentro del alcance de F2 (solo miro Storage/buckets, no
  la UI del chat que es de F3), ningún texto en pantalla que diga «esto solo lo ve tu coach» o
  «se guarda hasta que…». Dejo esto anotado para que F3 lo confirme desde su lado (la UI del hilo),
  porque yo solo puedo hablar del candado de Storage (correcto: 1 hora de vigencia del enlace,
  archivo privado para siempre en el bucket hasta que se borre la cuenta o el mensaje).

## Lo que verifiqué y está SANO (con números)

- Storage RLS de los 3 buckets privados: **6 de 6 pruebas de ataque bloqueadas** (asesorado↔asesorado,
  coach↔coach cruzado, anónimo×3 buckets), con **3 controles que SÍ pasan** (coach con su asesorado,
  asesorada con su propia carpeta, anon con `avi_showcase`) — control de discriminación cumplido.
- `sw.js`: 0 de 6 ramas del `fetch` handler cachean `supabase.co` (leído el archivo completo, 174
  líneas).
- `app_errors`: 31 filas totales, 0 con indicio de foto/token/URL de Storage.
- `avi_showcase`: 4 tarjetas, 0 con dato de menor, 0 con apellido/edad/peso corporal; INSERT
  gateado a `private._is_moderator`, sin grant de UPDATE (`showcase_del`/`showcase_ins`/
  `showcase_sel` son las 3 únicas policies).
- `apex_data_backups`: 26 filas, ventana de ≈89 días — cuadra con la promesa legal de «hasta 90
  días».
- Capturas de la web: 404 confirmado en vivo para las rutas viejas, 200 para las nuevas; commit
  único (`734dd04`) que retira las viejas del repo.
- `delete-account` (leído, no ejecutado): borra vitrina, push, app_errors y 4 buckets por páginas,
  antes de la cuenta — orden correcto (lo reversible primero, `auth.users` al final).
- Las 3 imágenes compartibles: 0 apariciones de `% de grasa`, `peso corporal`, `medidas` o `dolor`
  en el código que arma sus textos (`_gxCard`, `_wfDrawShareG`, `_storyDrawG` — leídos completos).

## Sospechas sin medir

- **`_chatMediaUrls` (caché de URLs firmadas en memoria) y el DOM del panel anterior no se limpian
  en `logout()`.** Es el mismo patrón de bug que v398 ya cerró para `CMTY`/`_pushCtx`/`_authUid`
  («en el perfil de Astrid aparecía el mío»), pero para fotos privadas nadie lo cerró. Sin embargo,
  al leer el código encontré DOS mitigaciones que probablemente lo hacen inofensivo en la práctica:
  (1) los `<img data-ppath>` nacen SIN `src` hasta que `hydratePrivatePhotos` resuelve la URL de
  forma asíncrona, y esa resolución comprueba `img.isConnected` antes de escribir — si un re-render
  para la persona 2 ya reemplazó ese nodo, la escritura se descarta; (2) `logout()` si sí resetea
  `DB.clients`/`DB.photos` (a lo que haya en localStorage legacy, casi vacío) cuando `AUTH_MODE` es
  cierto. NO pude confirmar ni descartar un caso real de fuga visual porque F2 tiene prohibido el
  navegador. Se lo dejo a F1 o a una ronda futura con navegador: el experimento sería loguearse
  como persona A, abrir su perfil/foto, cerrar sesión SIN recargar la página, loguearse como persona
  B en la misma pestaña, y mirar si algún `<img>` viejo con `src` de A queda visible un instante.
- **Consentimiento de imagen para adultos**: no encontré ningún mecanismo, ni en código ni en
  `legal/`, que le pida al asesorado ADULTO autorización específica para que el coach comparta su
  imagen de progreso. No sé si el PO lo considera necesario (culturalmente, muchos coaches publican
  transformaciones de sus clientes sin pedir permiso explícito cada vez) — lo dejo para que el PO
  decida con la evidencia del hallazgo #2/#3, no lo afirmo como hallazgo cerrado.

## Qué NO miré y por qué

- **El chat nuevo (contenido, "visto", eliminar conversación) es 100% de F3.** Yo solo verifiqué la
  capa de Storage de `chat-media` (políticas, bucket, enlaces firmados) — no abrí la UI del hilo ni
  medí sus textos, porque el briefing lo asigna a Lucas/Mateo.
- **No usé el navegador** (regla dura de mi encargo): todo lo de "qué ve la persona en pantalla" lo
  leí del código fuente, nunca lo miré renderizado. Eso deja sin confirmar visualmente la sospecha
  del `logout()` de arriba, y en general cualquier defecto que solo se vea maquetado (algo que este
  repo ha aprendido a desconfiar, "mide en pantalla, no en el fuente" — regla 8 del briefing) queda
  fuera de mi alcance esta ronda.
- **No corrí `_probe-chat-media`** (prohibido explícitamente: escribe en producción) ni ningún otro
  harness que escriba. Tampoco corrí los harnesses de LECTURA existentes (`_verify-fotos-privadas`,
  `_verify-story-g`, `_verify-compartir-sesion`) porque F1 y F3 comparten los mismos puertos y
  correrlos en paralelo con dos agentes más trabajando el mismo repo es justo lo que la regla 9
  prohíbe; en su lugar verifiqué las mismas propiedades por lectura directa de código + SQL, que es
  más lento pero no interfiere con nadie.
- **No medí cuántas veces se ha usado de verdad el botón "Crear la imagen para compartir"** (la
  tarjeta del coach) ni cuántas veces se compartieron las tres imágenes en producción — no hay
  ninguna tabla que registre ese evento (es una acción 100% del lado del cliente, con
  `navigator.share`), así que no hay manera de medirlo con SQL ni sin navegador.
- **No audité `community_*` a fondo** (mensajes con foto, moderación) más allá de confirmar que
  `chat-media` es el bucket correcto para el chat NUEVO (v645-649) y no el mismo que Comunidad — es
  territorio de la auditoría congelada de Comunidad, fuera del encargo de esta ronda.
- **No verifiqué en un navegador real si el Service Worker de un teléfono YA INSTALADO con una
  versión vieja (pre-v649) todavía tiene código que cacheaba fotos** — solo confirmé que el `sw.js`
  de HEAD no lo hace. Si algún teléfono no ha actualizado su Service Worker, no puedo saber desde
  aquí qué versión de `sw.js` tiene activa.
