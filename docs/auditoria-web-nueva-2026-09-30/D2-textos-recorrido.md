# D2 · Textos y recorrido — Valentina (copy) + Sofía (CS)

Auditoría de solo lectura de `avientrena.com` (30-sep-2026, R18). Método: skill `design:ux-copy` (CTA = verbo + lo que pasa;
estado vacío/error/onboarding dicen qué, por qué y cómo seguir) aplicada al texto real de `avi-web` y contrastada con la app
(`apex-app`, avi-v695). Medí tres cosas que no estaban medidas: (1) el recorrido en toques y pantallas desde cada sección,
(2) lo que ve el visitante DESPUÉS de tocar «Probar la app gratis» (captura de la app real) y (3) cada promesa de la lista
«Lo que se escribió hoy» contra el código, con sondas que ejecutan la app (no solo leen el archivo).

Sondas (todas en `%TEMP%\d2\`, solo lectura, con control): `recorrido.mjs` (390×844 contra la web publicada),
`probe-free.mjs` (cliente libre / PRO / coach con la misma sesión), `probe-lapsed.mjs` (PRO vencido), `probe-cat.mjs`
(catálogo), cálculo sobre el respaldo del 30-sep (solo agregados, sin nombres), `shot-app.mjs` (bienvenida real de la app).

---

## Veredicto en una frase

El texto de la web es en general honesto y está bien medido contra el código, pero **el viaje se rompe en la puerta y en el
nombre del producto**: quien toca «Probar la app gratis» cae en una bienvenida que le promete un coach a todos, le pone
«Iniciar sesión» primero y lo manda de vuelta a la web; y **«AVI PRO», el plan que la web vende, no existe dentro de la app**
(allí el candado dice «Disponible con un coach (Premium)»).

## Los 5 más grandes

### 1. 🔴 El salto «Probar la app gratis» aterriza en una pantalla que dice lo contrario de la web
- **Qué es.** La web vende un plan gratis SIN coach. La pantalla a la que llega el botón (`/ir/probar` → `app.avientrena.com`)
  dice: eyebrow «**Con un coach de verdad**», y «**Tu coach arma tu plan, te acompaña y te responde. Aquí no entrenas solo.**»
  (`apex-app/index.html:196` y `:200`). Debajo, el botón relleno y primero es «**Iniciar sesión**» y «Crear cuenta» queda
  como contorno (`index.html:205-206`): el visitante nuevo tiene que fijarse en el segundo. Y justo debajo hay un enlace
  «¿Primera vez aquí? Conoce AVI, los planes y los precios →» (`index.html:216`) que **lo devuelve a la web de la que
  acaba de venir**: web → app → web.
- **A quién le pasa.** A todo el que toca «Probar gratis» (es el botón principal de 5 de las 6 secciones) y, sobre todo,
  a quien viene de una historia de Instagram. El gratis no tiene coach ni chat (`avi-core.js:5774`, `app-4-entreno.js:4460`):
  «Aquí no entrenas solo» es falso para el plan gratis y para PRO.
- **Evidencia.** Captura real de la app recién abierta: `%TEMP%\d2\app-bienvenida.jpg`. Código arriba. No hay enlace
  profundo al registro (`grep URLSearchParams` en `app-*.js`: solo `mudanza`, `ver`, `avi-chat`, `tab`), así que el botón de
  la web nunca puede llevar directo a «Crear cuenta».
- **Cómo intenté tumbarlo.** (a) ¿Será la pantalla vieja de caché? La saqué fresca de `https://app.avientrena.com/` con perfil
  limpio, 9 s de espera: es esa. (b) ¿Será que el asistente de registro sí corrige la promesa? Lo lee: el paso 7 dice
  «Empiezas con tu rutina automática… Cuando quieras, súmale un coach real» (honesto) — pero llega DESPUÉS de la portada, y
  con 6 pasos de por medio. El hallazgo se sostiene en la primera pantalla.
- **Arreglo (texto exacto).** En la web se puede hacer ya; en la app es decisión suya (ver «Lo que decide el PO»).
  - Web, `app/page.tsx:88` («Empieza gratis ·») → `Gratis y sin descargar nada · ` (queda: «Gratis y sin descargar nada · AVI PRO desde $30.000 COP/mes →»).
  - Web, botón `Probar la app gratis` se queda (es suave y claro), pero avisar lo que sigue en `FAQ.tsx:129-132` (ver hallazgo 7).
  - App, `index.html:196` «Con un coach de verdad» → `Tu rutina, en tu celular`.
  - App, `index.html:200` «Tu coach arma tu plan, te acompaña y te responde. Aquí no entrenas solo.» →
    `Gratis para empezar: la app te arma la rutina y te guía serie por serie. Si después quieres un coach, se suma sin perder nada.`
  - App, `index.html:205-206`: cuando se llegue con `?origen=web` (la web lo añade en `lib/site.ts:62`), el botón relleno es
    «Crear cuenta» y el de contorno `Ya tengo cuenta` (hoy «Iniciar sesión»; así coincide con «Ya tengo cuenta: entrar» de `la-app/page.tsx:182`).
  - App, `index.html:216`: ocultar el enlace «¿Primera vez aquí?…» cuando viene `?origen=web`.

### 2. 🔴 «AVI PRO» no existe dentro de la app, y quien tiene PRO vencido queda en un callejón
- **Qué es.** La web ofrece 4 nombres (AVI FREE / AVI PRO $30.000 / COACH VIRTUAL $100.000 / PRESENCIAL). La app, de cara al
  usuario, tiene uno solo para lo de pago: «Premium», y siempre es un coach.
  - Candado de cada función: `Disponible con un <b>coach (Premium)</b>.` y botón «**Quiero un coach →**»
    (`app-3-coach.js:1826,1829`). Ese botón abre «⭐ AVI Premium · **Un coach real, contigo**» (`index.html:2074-2075`), cuyo
    botón «Quiero mi coach →» manda al chat del coach el mensaje «Me gustaría pasar a Premium y tener un coach que me guíe»
    (`app-3-coach.js:1845`). Y esa misma pantalla vende como beneficio de COACH «Nutrición y seguimiento — fotos, medidas y
    tu progreso con gráficas» (`index.html:2080`), que es justo lo que PRO da por $30.000 sin coach.
  - Resultado: quien leyó en la web «AVI PRO — La app entera, sin candados» y se topa con un candado, **no tiene ningún botón
    para pedir PRO**: o se queda, o pide un coach ($100.000). `grep "AVI PRO"` en `index.html` y `app-*.js`: cero textos
    visibles (solo comentarios). «AVI FREE» sí aparece una vez, en la banda de plan vencido.
  - **PRO vencido = callejón.** Medido con `probe-lapsed.mjs` (tier `app`, vencido hace 20 días): la banda dice «Estás en AVI
    FREE… » con el botón «**Hablar con mi coach**» (`app-4-entreno.js:1636-1640`), que lleva a la pestaña Mensajes, donde
    el candado dice «Chat con tu coach… Vuelve a estar disponible en cuanto renueves tu plan. [**Hablar con mi coach**]»
    (`app-3-coach.js:1823-1829` + `app-4-entreno.js:4460`) y ese botón vuelve a la misma pestaña. Un PRO nunca tuvo coach ni
    chat (`clientHasCoach`, `avi-core.js:5774`): el botón no hace nada y promete «volver» a algo que nunca tuvo.
- **A quién le pasa.** A todo el que quiera pasar de gratis a PRO desde dentro de la app, y a todo PRO que deje vencer su mes.
  En el respaldo del 30-sep hay **9 de 22 asesorados en tier `app` (PRO)**, más que cualquier otro tier por separado.
- **Cómo intenté tumbarlo.** ¿Quizá el upsell se bifurca por tier y no lo vi? `showPremiumUpsell` (`app-4-entreno.js:3407`) sale
  con `clientHasCoach` y no distingue más. ¿Quizá el vencido PRO tiene otra banda? `renderLapsedBand` es una sola. Y corrí
  el escenario (PRO y coach vencidos con la misma sonda): PRO ve el candado; coach ve su hilo.
- **Arreglo (texto exacto; es cambio de app, decide el PO).**
  - `app-3-coach.js:1826` `Disponible con un <b>coach (Premium)</b>.` → `Se desbloquea con <b>AVI PRO</b> o con un coach.`
  - `app-3-coach.js:1829` botón `Quiero un coach →` → `Ver cómo desbloquearlo →`
  - `index.html:2074-2075` `⭐ AVI Premium` / `Un coach real, contigo` → `⭐ Más de AVI` / `Elige cómo seguir`, con dos opciones:
    `AVI PRO · $30.000 al mes — Toda la app: gráficas, récords, constancia, plan de comida, medidas y fotos.` (botón `Quiero AVI PRO`) y
    `AVI COACH VIRTUAL · $100.000 al mes — Todo lo de PRO, y yo armo tu plan, lo reviso cada semana y te respondo en el chat.` (botón `Quiero el coaching`).
    Cada botón manda su mensaje (`Hola, quiero AVI PRO ($30.000/mes).` es el mismo de `lib/site.ts:30`).
  - `index.html:2080` la línea «Nutrición y seguimiento — fotos, medidas y tu progreso con gráficas» sale de la opción COACH y va a la de PRO.
  - `app-4-entreno.js:1640` (banda de vencido, solo tier `app`) `Hablar con mi coach` → `Renovar mi AVI PRO` con enlace a
    WhatsApp y el texto `Hola, quiero renovar mi AVI PRO.`

### 3. 🔴 «Las dictó una fisioterapeuta»: no encuentro quién
- **Qué es.** FAQ «¿Qué pasa si tengo una lesión o me duele algo?», `components/FAQ.tsx:72-73` (y su copia en los datos para
  Google, `:82`): «**Las listas de qué sacar en cada zona no las escribió un programa: las dictó una fisioterapeuta.**» Se
  publica en `/ayuda`.
- **Lo que encuentro en el repo.** Las listas de lesiones las dictó el rol de fisioterapia del equipo de agentes
  (`apex-app/.claude/agents/laura-physio.md`: un *prompt* de personaje, «Eres… fisioterapeuta deportiva con 9 años de
  experiencia») y la bitácora lo dice sin rodeos: «Laura, Valery y Sofía son también agentes» (`docs/bitacora.md:137`). No hay
  en el repo ningún nombre, matrícula, contrato ni mensaje de una fisioterapeuta humana que haya firmado esas listas.
- **Por qué es serio.** Es una frase de salud, de confianza, y literalmente invierte la verdad en su primera mitad («no las
  escribió un programa»). Va además en los datos estructurados que lee Google.
- **Cómo intenté tumbarlo.** Busqué en `avi-web`, `apex-app/docs`, `legal/` y la memoria del proyecto una persona real detrás del
  rol. No la hay: la memoria dice «las dicta Laura (fisio)» y siempre es el rol. **No puedo descartar que el PO haya consultado a
  una fisioterapeuta de verdad** — por eso lo dejo como lo único que le pregunto antes de actuar. Si existe y las revisó, la
  frase vale y se cambia por la versión B.
- **Arreglo (texto exacto).** `FAQ.tsx:72-73`:
  - Versión A (verdadera hoy): `Para cada zona hay una lista fija de ejercicios que se quitan o se marcan, y no cambia de un día a otro.`
  - Versión B (solo si hay una fisioterapeuta real que las revisó): `Esas listas las revisó una fisioterapeuta deportiva.`
  - El resto de la respuesta («Eso no es un tratamiento ni un diagnóstico…») es correcto y se queda. Igual en `:82`.

### 4. 🟡 Lo que la web marca como «solo PRO», el plan gratis ya lo ve — y lo que Inicio muestra sin etiqueta sí es PRO
- **Qué es (dos mitades de la misma incoherencia).**
  1. `lib/planes.ts:15-16` («Tu progreso por ejercicio, con gráficas» · «Tus récords y cuánto peso podrías mover en un solo
     intento»), la tabla (`precios/page.tsx:147`) y el FAQ dicen que la gráfica por ejercicio y el 1RM son PRO. **Un usuario
     gratis llega a los dos**: Historial → tocar un entreno (`app-4-entreno.js:4348`) → tocar un ejercicio (`:3579`) →
     `openExerciseRoom`, que no pregunta por el nivel (`:3791-3860`) y pinta «Progresión de carga» (gráfica) y «≈ N kg · 1RM
     estimado».
  2. Al revés, las capturas de Inicio — la página de «Probar gratis» — muestran como si fuera de la app gratis lo que SÍ es PRO:
     `lib/capturas.ts:38-40` «Mide tu progreso · Peso, medidas y fotos para ver — con números — cuánto avanzaste» (la captura
     `app-progreso.png` trae «MIS MEDIDAS» con tabla), y el héroe dice «y **te muestra** tu progreso» (`app/page.tsx:62-64`). La
     misma auditoría del 30-ago ya quemó este punto («se encontraba candados y se sentía engañado»); en `/la-app` el cuadro de abajo
     lo etiqueta, en Inicio no.
- **Evidencia.** `probe-free.mjs`, mismo cliente con tier `libre`, `app` y `premium`: sala del ejercicio → `1RM: true`,
  `#exroom-chart: true` en los TRES (candado `premiumLocked`: `true/false/false`, o sea que el libre está bloqueado en el resto y aquí no).
- **Cómo intenté tumbarlo.** Necesitaba que el libre llegara a la sala por una puerta real, no por una llamada directa: confirmé
  que `renderClientHistory` (sin candado) pinta `sescard-h onclick=openSessionRoom` (`:4348`) y que `_sessionExercisesHTML` pone
  la puerta a cada ejercicio (`:3579`). La racha, en cambio, SÍ es gratis como chip (`app-4-entreno.js:3594-3595`), por eso `planes.ts:19`
  también sobra («racha» no es PRO; sí lo es el calendario del mes).
- **Arreglo (dos caminos; decide el PO).** O se cierra la puerta en la app (`openExerciseRoom` pregunta `premiumLocked`) y la web
  queda como está, o se dice la verdad en la web:
  - `lib/planes.ts:15` → `Tu progreso de todos los ejercicios en un solo lugar, con gráficas`
  - `lib/planes.ts:16` → `Tu lista de récords, ordenada y siempre a la mano`
  - `lib/planes.ts:19` → `Tu constancia en detalle: calendario del mes, tu mejor racha y tu récord`
  - `lib/capturas.ts:40` → `Tu peso, y con PRO también tus medidas y tus fotos, para ver con números cuánto avanzaste.`
  - `app/page.tsx:62-64` → `Una app que te arma la rutina, te guía en cada entrenamiento y guarda tu progreso.` (el verbo ya lo usa `la-app/page.tsx:51`).

### 5. 🟡 El recorrido: la puerta persistente es «Entrar a la app», WhatsApp no está en el menú y dos secciones no tienen forma de escribir
- **Qué es.** Medido a 390×844 en producción (`recorrido.mjs`, posiciones en pantallas de 844 px desde arriba, cada «toque»
  es un toque del dedo; el salto `/ir/…` de ~0,5 s no cuenta):

| Sección (alto) | «Probar gratis»: dónde está su botón | Toques hasta él | Escribirle a Andrés: primer botón | Toques hasta él |
|---|---|---|---|---|
| Inicio (7,7) | 0,61 (primera pantalla) | **1** | 6,43 («Escribirle a Andrés»); el enlace de 0,79 abre WhatsApp pero de PRO | 1 tras bajar ~6 pantallas |
| La app (6,7) | 5,27 | 1 tras bajar 5 pantallas, o **2** por el ☰ | **no tiene** | **mín. 3** (Ver planes → bajar → tarjeta) o 1 en el pie |
| Planes (9,7) | 1,5 (tarjeta Gratis) | 1 tras bajar 1,5 | 2,37 («Quiero AVI PRO») / 3,22 («Empezar») | 1 tras bajar 2–3 |
| Coaching (9,1) | **no tiene** | **2** (☰ → Probar) | 4,79 («Quiero el coaching virtual»); la hero no tiene botón | 1 tras bajar ~5 pantallas |
| Resultados (4,4) | 3,08 | 1 tras bajar 3, o 2 por ☰ | **no tiene** | **mín. 2** (Conocer el coaching → bajar 5 → botón) |
| Ayuda (5,5) | 1,35 | 1 tras bajar 1,3 | 3,23 (enlace) / 3,78 («Abrir WhatsApp») | 1 tras bajar 3–4 |

  - El menú móvil (`Header.tsx:109-122`) trae 6 secciones + «Probar la app gratis». **WhatsApp no está en el menú ni en el
    encabezado**; el único botón fijo arriba es «Entrar a la app» (decisión suya, no lo toco), que es para quien ya tiene
    cuenta. Quien baja del primer pantallazo de Inicio y quiere probar tiene que abrir el ☰.
  - El pie de página (siempre al fondo) sí trae «Escríbeme por WhatsApp» (`Footer.tsx:169`), por eso «mín.» no es infinito.
- **Los 5 segundos de quien llega de una historia de Instagram al Inicio en el celular** (captura `movil-inicio-01.jpg`):
  ve el logo, un botón verde enorme «Entrar a la app», la etiqueta «Est. 2026 — Guaduas, Colombia», el titular «Entrenamiento
  con nombre propio.», un párrafo de 4 líneas y dos botones. Entiende: *es una app, tiene un coach, hay algo gratis*. NO entiende
  (porque no está en esa pantalla): que **no hay que descargar nada**, que **hace falta crear una cuenta**, que la rutina sale
  de unas preguntas, ni para quién es (casa o gimnasio). El titular es una consigna, no una descripción; lo que lo explica es
  el párrafo, y el párrafo ya trae tres promesas y un condicional. La línea que ayudaría («sin descargar nada») está en
  `/la-app` y en el FAQ, no en la primera pantalla.
- **Arreglo (texto exacto).**
  - `Header.tsx:119-121`: debajo de «Probar la app gratis», un segundo botón `Escribirle a Andrés` (destino `ir("whatsapp")`).
  - `coaching/page.tsx`: un botón `Escribirle a Andrés` (destino `ir("whatsapp-coach")`) en el `PageHero`, antes de «Cómo empieza».
  - `resultados/page.tsx:87-89`: añadir al cierre `Escribirle a Andrés` (destino `ir("whatsapp")`) junto a «Conocer el coaching».
  - `la-app/page.tsx:97-104`: tras «Ver planes y precios →», `¿Dudas? Escríbele a Andrés` (destino `ir("whatsapp-pregunta")`).
  - `app/page.tsx:88` (microlínea del héroe): `Gratis y sin descargar nada · ` + el enlace de PRO.
  - `app/page.tsx:93` el enlace `AVI PRO desde $30.000 COP/mes →` abre WhatsApp sin decirlo → `AVI PRO desde $30.000 COP/mes · se pide por WhatsApp →`.

---

## Todos los hallazgos

| # | Sev. | Qué | Dónde | Arreglo propuesto (texto en el cuerpo del informe) |
|---|---|---|---|---|
| 1 | 🔴 | Aterrizaje de «Probar gratis»: promete coach a todos, «Iniciar sesión» primero, enlace que devuelve a la web | `apex-app/index.html:196,200,205-206,216` | Hallazgo 1 |
| 2 | 🔴 | «AVI PRO» no existe en la app; candado y upsell solo ofrecen coach; PRO vencido en bucle | `app-3-coach.js:1826,1829,1845`; `index.html:2074-2080`; `app-4-entreno.js:1636-1640,4460` | Hallazgo 2 |
| 3 | 🔴 | «Las dictó una fisioterapeuta» sin evidencia humana (el rol es un agente) | `components/FAQ.tsx:72-73,82` | Hallazgo 3 |
| 4 | 🟡 | El libre ve gráfica por ejercicio y 1RM; las capturas de Inicio muestran medidas/fotos sin etiqueta PRO; héroe dice «te muestra tu progreso» | `lib/planes.ts:15-16,19`; `lib/capturas.ts:38-40`; `app/page.tsx:62-64`; `app-4-entreno.js:3579,3791,4348` | Hallazgo 4 |
| 5 | 🟡 | Recorrido: WhatsApp fuera del menú; Coaching, La app y Resultados sin forma directa de escribir; primera pantalla sin «sin descargar nada» | `Header.tsx:109-122`; `app/page.tsx:88-95` | Hallazgo 5 |
| 6 | 🟡 | Resultados define mal dos cifras: «hasta hoy» (están congeladas al día de publicar: las 4 fichas son del 29-30-ago) y «sesiones que completó» (cuenta toda sesión guardada) | `app/resultados/page.tsx:57-58`; `avi-core.js:11789,11801,11858` | Ver «Resultados» abajo |
| 7 | 🟡 | FAQ «abres la app, respondes unas preguntas y ya tienes tu rutina» omite el correo de confirmación y los 7 pasos | `components/FAQ.tsx:129-132`; `app-3-coach.js:1741`; `index.html:283-440` | Ver «Registro» abajo |
| 8 | 🟡 | Etiquetas de botón que no dicen lo que pasa: «Reservar mi cupo» (no reserva nada), «Empezar», el enlace de PRO que abre WhatsApp sin decirlo; 4 rótulos para el mismo destino | `precios/page.tsx:62,94,114,130`; `app/page.tsx:93,207`; `precios:411`; `Footer.tsx:169`; `ayuda/page.tsx:34` | Ver «Botones» abajo |
| 9 | 🟡 | Insignia «Más elegido» sin respaldo: de 22 asesorados, ninguno tiene un último pago de $100.000 | `precios/page.tsx:234` (`p.badge ?? "Más elegido"`) | `El que más recomiendo` |
| 10 | 🟡 | Voz mezclada en la misma página: tercera persona («Andrés Martínez arma…») y primera («Tu plan lo armo yo») | `app/page.tsx:62-65,147-149`; `coaching/page.tsx:56,70,97,212`; `precios/page.tsx:84,339` | Ver «Voz» abajo |
| 11 | 🟡 | El FAQ no responde las dudas que el flujo real produce: correo de confirmación, olvidé mi contraseña, borrar mi cuenta, pagar con tarjeta | `components/FAQ.tsx` (faltan) | Q&A exactas abajo |
| 12 | 🟢 | «Tres toques» (en realidad, tres mensajes) se confunde con «toca» del resto del sitio | `coaching/page.tsx:159` | `Tres mensajes míos en tu primera semana (días 1, 3 y 7) y una revisión cada semana` |
| 13 | 🟢 | Jerga de la app: «candados» / «sin candado» (5 apariciones) | `lib/planes.ts:11`; `precios/page.tsx:69` y FAQ | `sin bloqueos` / `todo desbloqueado` |
| 14 | 🟢 | «+370 ejercicios» y «374 ejercicios» en la misma página | `la-app/page.tsx:158` vs `lib/planes.ts:13` | Usar `374` en ambas (verificado: 374/374 con técnica) |
| 15 | 🟢 | Mensaje de WhatsApp del orientador en una sola frase con comas encadenadas | `components/Orientador.tsx:93-96` | Ver «Orientador» abajo |
| 16 | 🟢 | FAQ de privacidad: «Nadie más… Lo único público son las fichas» ignora lo que la persona decide compartir en Comunidad (opcional, congelada pero viva) | `components/FAQ.tsx` (respuesta «¿Qué pasa con mis datos?») | Añadir al final: `Y lo que tú decidas compartir, si algún día activas Comunidad.` |
| 17 | 🟢 | FAQ de casa: «dices… con qué equipos cuentas» — la app pregunta entre 4 lugares (Gym completo, En casa, Solo peso corporal, Aire libre) | `components/FAQ.tsx:57-58`; `index.html:308-316` | `Al registrarte eliges dónde entrenas (gimnasio, casa con bandas o mancuernas, solo peso corporal o al aire libre)` |
| 18 | 🟢 | «Cupos limitados» sin número ni criterio; es frase de agencia | `precios/page.tsx:374` | Quitar, o `Por ahora recibo pocas personas a la vez en Guaduas.` (solo si es cierto) |
| 19 | 🟢 | «Est. 2026» y «Suda. Respira. Sigue.» suenan a marca de ropa deportiva, no a entrenador de pueblo | `app/page.tsx:44`; `la-app/page.tsx:115-116` | `Guaduas, Colombia` / `Suda. Descansa. Vuelve mañana.` |
| 20 | 🟢 | Cada tarjeta de plan dice tres veces lo mismo antes de la lista (`pitch`, `paraQuien`, `paying`) | `precios/page.tsx:45-47,69-71,84-86` | Decisión de contenido: dejar `paraQuien` (confirmado) y `paying`; quitar `pitch` en móvil |

### Resultados: dos definiciones que no se cumplen
- «**Meses en AVI** — Desde su primer entreno registrado en la app hasta hoy.» (`resultados/page.tsx:57`). El número se calcula UNA vez, al
  publicar (`avi-core.js:11801`) y se guarda; la tabla no admite UPDATE. Hoy (30-sep) las 4 fichas siguen diciendo 2-3 meses y se
  publicaron el 29-30 de agosto. → `Desde su primer entreno registrado en la app hasta el día en que se publicó la ficha.`
- «**Entrenos** — Las sesiones que completó y anotó en ese tiempo.» (`:58`). El código cuenta toda sesión con fecha
  (`avi-core.js:11789,11858` `entrenos: ses.length`), terminada o no. Medido en el respaldo del 30-sep, personas con ≥8 sesiones:
  15 personas, 570 sesiones, 477 terminadas (84%); en **7 de las 15** más del 10% de lo que contaría no está terminado (un caso: 4 de 28).
  → `Las sesiones que anotó en la app en ese tiempo, completas o no.` (o la app cuenta solo `sessionFinished`; decide el PO).
- Sano: el «**De → a**» (`:60`) SÍ es lo que dice. Sospechaba que contaba series no hechas (`clientProgressStory` no mira `done`, y
  `saveSessionToHistory` guarda `kg` aunque no se marque): recalculé las 15 historias con y sin esas series y **0 de 15 cambian**.
- «Publicadas… con su permiso» (`Resultados.tsx:106`): la app solo pregunta al coach «¿Ya le avisaste a X?» (`app-3-coach.js:2543`), un aviso, no
  un permiso. Con las 4 fichas actuales es cierto por su palabra; no lo impone el código. 🟢 si quiere que lo imponga: `¿X te autorizó a publicarla?`.

### Registro (lo que el FAQ no cuenta)
Tres hechos verificados: el registro es un asistente de **7 pasos** (`index.html:283-440`), el correo exige **confirmación**
(`mailer_autoconfirm=false`, `docs/bitacora.md:8797`; el código lo maneja en `app-3-coach.js:1741` y `app-2-login.js:358`) y hay
«Crear cuenta con Google». `FAQ.tsx:129-132` hoy: «abres la app, respondes unas preguntas y ya tienes tu rutina…». Reemplazo:
`Gratis y sin fecha de vencimiento. No es una prueba de siete días ni te pide tarjeta: abres la app, creas tu cuenta (con Google, o con tu correo, que te pide confirmarlo), respondes siete preguntas y ya tienes tu rutina, la biblioteca completa y el registro de tus pesos. Para siempre, si así lo quieres.`

### Botones (verbo + lo que pasa)
- `precios/page.tsx:114,130` «**Reservar mi cupo**» → `Preguntar por cupos`: el botón abre WhatsApp con «Hola, me interesa AVI PRESENCIAL…» (`lib/site.ts:69-70`); nada se
  reserva, y la propia página dice que lugar y horario «los acordamos por WhatsApp, según los cupos» (`coaching/page.tsx:183`).
- `precios/page.tsx:94` «**Empezar**» (Coach Virtual) → `Quiero el coaching virtual` (así lo llama `coaching/page.tsx:170`; hoy el mismo plan tiene dos botones distintos).
- `precios/page.tsx:62` «Probar gratis» → `Probar la app gratis` (en las demás secciones es así).
- Mismo destino `ir("whatsapp")`, cuatro rótulos: «Escribirle a Andrés» (`app/page.tsx:207`), «Escribirme por WhatsApp» (`precios:411`), «Escríbeme por WhatsApp» (`Footer.tsx:169`), «Abrir WhatsApp» (`ayuda:34`).
  Regla propuesta (la web ya casi la sigue): **botones en infinitivo y hablando de Andrés en tercera persona, cuerpo de texto de planes en primera**. →
  `Escribirle a Andrés por WhatsApp` (precios, pie) y `Escribirle a Andrés` (ayuda).
- `precios/page.tsx:234` badge «**Más elegido**» → `El que más recomiendo`. Dato: último pago de los 22 asesorados: $150.000 ×4, $130.000 ×3, otros 5 entre $20.000 y $125.000, 9 sin pago; **ninguno de $100.000**. Y por tier: PRO 9, coach 12, libre 1.

### Voz (la máquina se delata cuando cambia de persona dentro de la misma página)
Dentro de `/coaching`: hero en tercera («Andrés Martínez arma tu rutina…», `:56`), pasos en primera («Me escribes por WhatsApp…», `:70`), sección final en tercera
(«No es un algoritmo. Es Andrés Martínez.», `:212`). Dentro de Inicio: héroe en tercera (`:62-65`) y la ficha del coach en tercera (`:147-149`), pero el orientador
justo debajo habla en primera («conviene que yo mire tu caso», `Orientador.tsx:71`). Propuesta (cuerpo en primera, créditos en tercera):
- `app/page.tsx:62-65` → `Una app que te arma la rutina, te guía en cada entrenamiento y guarda tu progreso. Y si quieres que alguien te acompañe, soy yo: reviso tu plan y lo ajusto contigo.`
- `app/page.tsx:147-149` → `Yo armo tu plan mirando tu caso, reviso cada semana lo que registras y te lo ajusto cuando cambia tu progreso, tu horario o te duele algo. Virtual desde donde estés, o en persona en Guaduas.`
- `coaching/page.tsx:56` → `Yo armo tu rutina, reviso lo que registras y la ajusto contigo. Así funciona, paso a paso.`

### FAQ: preguntas que faltan (el flujo real las produce)
1. **¿No me llegó el correo de confirmación?** — `Mira en spam o en promociones y busca «AVI». Si no está, abre la app, toca «Iniciar sesión», escribe tu correo y tu contraseña y toca «Reenviar correo». Si sigue sin llegar, escríbeme por WhatsApp y te ayudo.` (el botón existe: `app-2-login.js:358-359`).
2. **¿Olvidé mi contraseña?** — `En la pantalla de entrar toca «¿Olvidaste tu contraseña?», escribe tu correo y te llega un enlace para crear una nueva.` (`index.html:254`).
3. **¿Cómo borro mi cuenta y mis datos?** — `Desde la app: Perfil → «Eliminar mi cuenta». Se borran tus datos y tus fotos. Si prefieres pedírmelo, escríbeme por WhatsApp o al correo.` (`app-4-entreno.js:539`; el consentimiento del registro promete poder «pedir eliminar mis datos cuando quiera», `index.html`, paso 7).
4. **¿Puedo pagar con tarjeta?** — `Por ahora solo por Bre-B, que llega al instante y sin comisiones desde Nequi, Bancolombia, Daviplata y la mayoría de apps.`

### Orientador
`Orientador.tsx:93-96` arma «Quiero bajar grasa, nunca he entrenado y voy a entrenar en casa.» (verbo + frase + frase); con «lesión» sale «Quiero volver a entrenar
después de una lesión o molestia, he entrenado, pero sin constancia y voy a entrenar en un gimnasio.» — una coma de más en lo más importante. Para quien lo lee en WhatsApp:
`Hola, vengo del orientador de la web.` + salto + `Objetivo: ${objetivo.t}` + salto + `Experiencia: ${experiencia.t}` + salto + `Dónde entreno: ${lugar.t}` (usa los rótulos de las opciones, sin `frase`).

---

## Lo que verifiqué y está SANO (con números)

- **374 de 374** ejercicios traen `desc` + `descSimple` + `muscleLabel` (`probe-cat.mjs`); la promesa «los 374… en simple y en detalle» es exacta.
- «**Cómo respirar**» existe y no tiene candado: `breathCue` (`app-6-extra.js:1708`) cubre todo ejercicio, por id o por tipo; la captura `app-explica.png` es real.
- **Crear y editar rutinas, gratis**: `canEdit=true` sin condición (`app-4-entreno.js:3465`); FAQ y tabla ciertos.
- Los **candados PRO** que la web nombra existen: progreso por ejercicio (`app-2-login.js:1124`), récords (`app-4-entreno.js:460`), constancia (`:3599`), series por músculo (`:4188`),
  volumen (`:3515`), plan de comida (`app-5-salud.js:493`), medidas (`:1108`), fotos (`:1561`), chat (`app-4-entreno.js:4460`). Con la salvedad del hallazgo 4.
- **Plan de comida en PRO sin coach**: sin plan escrito por un coach la app arma uno con calculadora (`app-5-salud.js:499-508`): «calorías, porciones y qué comer» se cumple.
- **Menores de 16**: `/sentadilla|peso muerto|militar con barra/` (`avi-core.js:2485`) con `age<16` (`:2542`); el FAQ dice lo que pasa (la regla es más ancha que el texto, quita también la sentadilla con peso corporal; 🟢 no se toca).
- **Cancelar = volver a AVI FREE con historial**: banda de plan vencido (`app-4-entreno.js:1631-1640`, v564); la promesa se cumple.
- **Sin internet**: el FAQ coincide con v687/v688 (no lo remido, está en el baseline del PO).
- **Primera pantalla de Inicio**: «Probar la app gratis» a 0,61 pantallas (visible sin bajar) en 390×844.
- Mayoría de la voz es **tuteo colombiano limpio**: cero voseo (v542), cero «Usted», tildes sin errores en lo que leí.
- **Coaching** (primera semana, cada semana, cada 4, mismo día si duele): confirmado por el PO hoy; la app no lo contradice (chat solo con coach: `avi-core.js:5774`).
- **Tabla de Planes**: filas 5 y 6 coinciden con los candados reales; fila «Crear y editar tus propias rutinas» ✓ para los 4.
- Baseline del PO (60/60 enlaces, 41/41 móvil) no lo repetí.

## Lo que decide el PO

1. **La bienvenida de la app** (hallazgo 1): ¿se cambia el texto «Con un coach de verdad / Aquí no entrenas solo» para todos, o solo para quien llega con `?origen=web`?
   ¿«Crear cuenta» pasa a ser el botón principal en ese caso? ¿Se oculta el enlace que devuelve a la web?
2. **PRO dentro de la app** (hallazgo 2): ¿se muestra PRO como opción en el candado y en el upsell, con su propio mensaje a WhatsApp? Es la decisión comercial más grande de esta auditoría.
3. **La frase de la fisioterapeuta** (hallazgo 3): ¿existe una fisioterapeuta humana que revisó las listas? Si sí, versión B (y poner su nombre si ella quiere). Si no, versión A.
4. **Gráfica y 1RM para el plan gratis** (hallazgo 4): ¿se cierra la puerta en la app (más fiel a la tabla) o se deja y se cambia el texto de PRO?
5. **«Entrenos» de las fichas** (hallazgo 6): ¿cuentan solo sesiones terminadas (cambia el número de 3 de las 4 fichas hacia abajo) o se aclara el texto?
6. **Insignia «Más elegido»** (hallazgo 9): ¿«El que más recomiendo», o se quita?
7. **Voz**: ¿primera persona en todo el cuerpo (propuesta) o tercera? Lo que hoy se nota es el cambio dentro de una misma página.
8. **WhatsApp en el menú móvil** (hallazgo 5): ¿se añade «Escribirle a Andrés» debajo de «Probar la app gratis»?
9. **«Reservar mi cupo»** → «Preguntar por cupos» (cambia la promesa; no hay reserva real).

## Qué NO miré y por qué

- **Registro con Google dentro de la ventana de Instagram.** Google bloquea el acceso con OAuth en navegadores embebidos; no tengo cómo abrir el enlace desde dentro de Instagram. Si el visitante de la historia toca «Crear cuenta con Google» en esa ventana puede fallar: **no verificado**, lo dejo como pregunta (probar con su propio teléfono).
- **iPhone / Safari**: no tengo uno en el banco. El FAQ habla de «ponerla en la pantalla de inicio» sin distinguir Android de iPhone.
- **El tiempo real del asistente de 7 pasos**: no lo medí; por eso no propongo escribir «en 2 minutos».
- **Diseño, contraste, foco, lector de pantalla**: es D1.
- **SEO, títulos, descripciones y datos estructurados**: fuera de alcance (se cambian hoy en paralelo). Solo anoto que `plano` (JSON-LD) y el texto visible del FAQ ya difieren en varias respuestas; no lo califiqué.
- **Versión de escritorio**: leí las capturas, pero el criterio de los 5 segundos y los toques es móvil.
- **Datos de conversión reales**: el plan gratis de Vercel solo cuenta visitas; el embudo web → cuenta creada no se puede medir hoy.
- **Prometer plazos de respuesta**: no los toqué (decisión del PO: solo el compromiso de «mismo día si duele»).
