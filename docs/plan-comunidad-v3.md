# Comunidad v3 — ANÁLISIS DE FABLE (sin construir nada)

> **Encargo textual del PO (2026-07-22):** *"me gusta que se puedan hacer publicaciones pero solo
> publicar el entrenamiento o la rutina?? porque no podemos dejarlo abierto a publicar algo mas un
> mensaje y que cada usuario tenga su propio perfil donde aparezcan sus logros entrenamientos kilos
> movidos progresos rachas y que el usuario decida si el perfil es publico o privado; en mi caso como
> coach me gustaría mostrar mis avances en cada ejercicio y me imagino que también los usuarios; y
> también me gustaría que si un grupo de amigos quiere armar un clan o un grupo, o un gym quiere armar
> un equipo con su nombre, pueda hacerlo."*
>
> Este documento es **análisis**, no implementación. Nada de esto se construye hasta que el PO decida
> sobre las preguntas de producto de §6 y, si aplica, Opus ejecute bajo `docs/reglas-opus.md` con mi
> RLS estipulada primero. Verificado contra el estado REAL del repo (`avi-v387`, main limpio) y contra
> `supabase/community/c1…c13*.sql` como fuente de verdad — no contra lo que dicen los planes viejos.

---

## 0. Lo que ya existe hoy (para no re-analizar lo cerrado)

- Perfiles públicos/privados con menor forzado-privado (`c8`), seguir con aprobación (`c9`),
  DMs en vivo (`c6`), grant de columnas endurecido (`c10`), muro de **rutinas** publicadas por el
  cliente + **hitos** (racha/nivel) emitidos SOLO por el servidor (`c12`, `c13`) — arcos ③ y ④,
  ambos con mi veredicto **🟢 APROBADO** (§16, §17 de `plan-comunidad.md`).
- El candado central de todo: `private._profile_visible(viewer, owner)` — un solo lugar decide
  quién ve a quién; todo lo social nuevo (posts, reacciones, hitos, y lo que viene) DEBE reusarlo,
  nunca reinventarlo. Un menor **jamás** gana visibilidad por follow, ni aprobado (§16.11 pto 2,
  probado con sabotaje en §17.1).
- Moderación existente: `community_reports` (INSERT del reportero, SELECT solo admin/service role)
  + bloquear (`friendships.status='blocked'`, corta DM y visibilidad de golpe). **No existe hoy
  ninguna vista para que Camilo lea esos reportes** — la tabla recibe filas y nadie las mira. Esto
  ya es una deuda de moderación viva, antes de sumar texto libre.
- Ya aprobado por el PO (maqueta vista, pendiente mi RLS): **publicar el ENTRENO TERMINADO**
  (nombre + duración + Nº de ejercicios, sin kilos) como `kind` nuevo de post, y **comentarios**
  sobre posts. Los incluyo en el orden recomendado (§5) porque compiten por el mismo cupo de
  atención de Opus que lo nuevo que pide el PO aquí.
- Legal: `legal/politica-tratamiento-datos.md` §9 dice, **hoy, en el borrador vigente**, con
  todas las letras: *"Qué NO se comparte NUNCA: tu peso, medidas, fotos de progreso, notas de
  salud o lesiones, **tus kilos levantados** ni tus mensajes con el entrenador."* Esto no es un
  detalle — es una promesa ya redactada que (B) y (C) piden romper. Ver §2.

---

## 1. Veredicto por pedido

### (A) Publicaciones de TEXTO LIBRE — 🔴 NO construir tal como se pidió; alternativa concreta

**Por qué no.** AVI es un coach con ~20 asesorados, sin equipo de moderación, con adolescentes
reales de 16-17 años en la base y ningún panel hoy para revisar reportes. Un campo de texto libre
en un muro social es la superficie de abuso más barata de explotar y la más cara de moderar: acoso
entre usuarios, contenido inapropiado o sexual dirigido a un menor, spam, enlaces externos, memes
de mal gusto sobre el cuerpo de alguien. Todo lo que hoy hace seguro al muro (rutinas con
allow-list, hitos server-side) es seguro **porque el contenido es estructurado y acotado**. Texto
libre destruye esa propiedad de un plumazo: no hay allow-list posible para "lo que alguien puede
decir". El propio plan de Fase 2 (`plan-comunidad.md` línea 224) ya lo había anticipado y diferido
por la misma razón, antes de que este pedido llegara — no es una posición nueva mía, es la
continuación de una decisión ya tomada con la misma lógica.

**Lo que SÍ da casi el mismo valor sin el riesgo:** el PO probablemente no quiere "Twitter dentro de
AVI" — quiere que la gente pueda **contarle a su gente qué le está pasando en su entreno** más allá
de una rutina o un hito automático. Eso ya está cubierto por lo que está en cola y aprobado:
publicar el **entreno terminado** (con NOTA corta opcional, ver más abajo) + **comentarios** sobre
cualquier post. Concretamente:
- El post de "entreno terminado" puede llevar un campo `note` de texto **corto y acotado**
  (ej. 140 caracteres, incluido en el allow-list del trigger, `esc()` en el pintado) — es la forma
  de "decir algo" que el PO probablemente imagina, pero atada SIEMPRE a un evento real que el
  cliente no puede inventar de la nada (terminaste un entreno de verdad, con `finishedAt`).
- **Comentarios** (ya aprobados) dan el espacio conversacional real — "¡vas durísimo!", "¿qué
  rutina es esa?" — sin abrir un post-desde-cero sin gancho a ningún evento.

**Diferencia con "texto libre" que hay que explicarle al PO en una frase:** no es "no se puede
escribir nada" — es "todo lo que se escribe cuelga de un evento real (un entreno, un hito, un
comentario a otro), nunca un post en blanco sin origen". Esa distinción es la que mantiene la
moderación manejable con 20 asesorados y un solo coach.

### (B) PERFIL RICO (logros, entrenamientos, kilos movidos, progresos, rachas) — 🟡 construir ACOTADO

**Lo bueno del pedido:** un perfil de comunidad hoy es minimalista (apodo/avatar/bio/racha/nivel).
Un perfil más rico — historial de constancia, hitos ganados, entrenos totales, gráfica de progreso
— es exactamente lo que hace un perfil "tipo Instagram" sentirse habitado, y no compite con ningún
candado existente **mientras se quede en agregados ya públicos o derivables de ellos** (racha,
nivel, cantidad de entrenos, antigüedad).

**Lo que NO puede entrar tal cual lo pidió el PO: "kilos movidos".** Ver la distinción completa en
§2 — un total agregado de "volumen levantado" (kg × reps × series, sumado) es un derivado directo
del peso que cada quien carga en sus series, que es **exactamente el dato que el propio candado de
④ excluyó a propósito del payload de rutina** y que la política de datos promete que nunca sale de
la cuenta. Meterlo al perfil público reabre esa puerta por la puerta de atrás.

**Recomendación:** construir el perfil rico con:
- Racha (ya existe), nivel (ya existe), hitos ganados (ya existen vía `c13`, solo falta pintarlos
  en el perfil además del muro — trivial, mismo dato).
- **Nº de entrenos totales / de la semana / del mes** — agregado seguro: es un conteo, no un peso,
  y ya es indirectamente derivable de "racha" (si tienes racha de 8 semanas ya se infiere que
  entrenaste bastante), así que no ensancha lo que ya se sabía.
- **Antigüedad** ("entrenando desde hace 6 meses") — agregado seguro, sin cifra sensible.
- **"Kilos movidos" y "progreso por ejercicio" van FUERA del perfil rico**, tratados aparte en (C)
  con opt-in propio y explícito (no heredan el opt-in general de "hacer mi perfil público").

Esto es "construir acotado": el PO obtiene un perfil que se siente lleno y vivo, con datos que ya
son públicos o triviales de inferir, sin tocar la promesa de datos sensibles.

### (C) PUBLICAR PROGRESO POR EJERCICIO (kilos, "mis avances") — 🟡 construir MUY acotado, opt-in propio, nunca para menores

Este es el pedido donde el PO tiene razón en algo real: un **adulto** que decide mostrar "Sentadilla
100kg" está haciendo lo mismo que alguien en Strava que publica su ritmo de 5K — es SU dato,
publicado por decisión propia, no vigilancia de un tercero sobre él. No es automáticamente "dato de
salud sensible que la app expone sin permiso" — es autoexposición voluntaria, y la doctrina del
proyecto (`R0.4` anti-complacencia) exige no aplicar el candado más conservador solo porque "kg" es
una palabra que ya vetamos en otro contexto. El contexto importa: el trigger de ④ veta que el
**cliente pueda insertar kg dentro de una rutina compartida a otros SIN que el dueño lo decidiera
campo por campo** — no veta per se que el dueño publique un número que él mismo eligió mostrar.

**Pero el pedido, tal como está redactado, mezcla dos cosas que deben separarse por diseño:**

1. **Un PR concreto que el usuario decide publicar activamente** (evento único, "hoy levanté 100kg
   en sentadilla, quiero compartirlo") — esto es viable, EXACTAMENTE con las mismas condiciones que
   ya use el proyecto para "publicar rutina": opt-in por publicación, nunca automático, y con un
   candado anti-cheat distinto al de una rutina (ver abajo).
2. **Un widget de "mis avances en cada ejercicio" en el perfil, visible siempre a quien vea el
   perfil** — esto es un tracker público permanente de cuánto pesas moviendo, no un logro puntual.
   Es más cercano a exponer `ax_pr`/historial completo que a compartir un hito. Recomiendo NO
   construir esta forma amplia — es el "progreso por ejercicio siempre visible" que el propio
   `plan-comunidad-reforma.md` §R2(c) ya identificó y descartó para 'pr' en v1 por la misma razón:
   sin capa anti-cheat, es publicar en el muro un número que el propio usuario tecleó en una
   serie, sin verificación posible.

**Recomendación concreta:** construir SOLO la forma (1), como un `kind` nuevo `'pr'` de post,
con estas condiciones no negociables:
- **Opt-in EXPLÍCITO, propio, no heredado.** No es "mi perfil es público" → automáticamente
  publico mis PRs. Es un toggle/consentimiento SEPARADO ("Publicar mis récords de peso"),
  redactado en español claro explicando que esto SÍ expone un número de peso a quien vea tu perfil
  — exactamente el patrón que ya usa `show_milestones` (nace `false`, no se agrega al consentimiento
  inicial general).
- **JAMÁS disponible para un menor.** El trigger de menor (`_community_enforce_minor_privacy`) ya
  fuerza `is_private=true`; además, la UI del toggle de "publicar récords" NO debe ni aparecer si
  `_is_minor(auth.uid())` es verdadero — doble candado (UI + sería trivial añadir el mismo chequeo
  al trigger de validación del post, igual que hace con `is_private`). Esto no es solo higiene:
  un peso corporal-adyacente publicado por un adolescente es exactamente el tipo de dato que un
  adulto con malas intenciones usa para "notar" a alguien.
- **El dato publicado es EL PR, no el historial.** Un solo número + el nombre del ejercicio (ej.
  "Sentadilla — 100kg", análogo a un hito de racha), nunca la serie completa de reps/kg de una
  sesión, nunca una gráfica de progreso con fechas (eso sí sería un patrón de actividad/salud
  reconstruible, el mismo riesgo que ya se cerró con `trained_today`).
- **Anti-cheat mínimo, no inexistente:** aceptar que el peso es autoreportado (igual que cualquier
  red social de fitness real — Strava tampoco verifica tu GPS con un juez), pero exigir que el PR
  publicado coincida con un PR que YA existe en `ax_pr`/historial del usuario (no un número
  arbitrario tecleado en el momento de publicar) — un candado de "no puedes inventar un PR que
  nunca registraste entrenando", que es barato de imponer client-side + razonable server-side
  (el payload trae `exerciseId`+`value`, el trigger no puede verificar contra `user_data` porque
  RLS de esa tabla no lo permite sin problemas nuevos — así que este candado específico es
  responsabilidad del MAPEADOR cliente, como ya ocurre con el payload de rutina; documentarlo como
  tal, no fingir que es un candado de servidor cuando no lo es).

**Lo que NO se construye bajo ninguna forma:** peso corporal, medidas, fotos de progreso, datos de
salud/lesiones — esos siguen exactamente donde están hoy (`ax_bw`/`ax_med`/`ax_photos`, jamás en
`community_*`). El PO no lo pidió, y conviene decirlo explícito para que quede escrito que la
distinción se sostuvo incluso donde no hacía falta que alguien lo pidiera para violarla.

### (D) GRUPOS / CLANES / EQUIPOS — 🔴 no ahora; proyecto grande, aparte, con su propio ciclo Fable-planifica

**Por qué no ahora, con argumento de producto, no solo técnico:** esto no es una tabla nueva
pequeña — es una **entidad social nueva de primera clase** (con su propio ciclo de vida: crear,
nombrar, invitar, expulsar, disolver) que interactúa con TODO lo que ya existe y que el proyecto
ya había marcado explícitamente como "futuro, quizá nunca" (`CLAUDE.md` línea 279, tabla de
prioridades: *"Retos entre amigos, grupos/gym, integración AVI GYM — depende de demanda, cada uno
su propio doc"*). El PO ya lo había despriorizado una vez con buen juicio; este pedido lo revive,
pero eso no cambia que el costo real siga siendo grande.

**Decisiones de producto sin resolver que el PO tendría que tomar ANTES de que esto sea un diseño
(no las resuelvo yo, las marco para que no se construyan sobre la marcha):**
1. ¿Quién CREA un grupo — cualquier usuario, o solo el coach? Si cualquiera puede crear un "clan",
   ¿hay tope (evitar 200 clanes de 1 persona) y quién los modera?
2. ¿Quién invita/expulsa — el creador solo, o cualquier miembro?
3. ¿Puede un MENOR estar en un grupo? Si sí, ¿el grupo hereda la protección de "no descubrible"
   como un perfil de menor, o un grupo con un menor dentro queda expuesto igual a extraños que
   busquen el grupo (agujero: un grupo público con nombre + lista de miembros visible expondría a
   ese menor a un descubrimiento que su perfil individual ya le niega)?
4. ¿El grupo tiene FEED PROPIO (muro solo del grupo, más infraestructura, más RLS) o es solo una
   ETIQUETA visual sobre el muro existente ("Ana · Equipo Fuerza Guaduas")? La segunda es
   sustancialmente más barata y da el 70% del valor social ("tener un nombre de equipo") sin
   duplicar toda la maquinaria de visibilidad/posts/reacciones que ya existe para perfiles
   individuales.
5. `community_gym_members` YA es, en los hechos, "un equipo con nombre" para el caso más simple
   (el gimnasio de Camilo) — controlado por el coach, sin auto-servicio. ¿"Grupo de amigos" es una
   generalización de ESO (cualquier usuario puede ser "coach" de su propio mini-grupo) o es un
   concepto distinto que no debería reusar esa tabla? Mi lectura: son conceptualmente el mismo
   patrón (membresía controlada por un dueño) pero el gym de hoy asume un ÚNICO dueño con
   autoridad real (el coach que YA verificó a sus asesorados en persona); un "clan de amigos"
   inventado por cualquier usuario no tiene ese mismo nivel de confianza de entrada — mezclarlos
   sin pensarlo institucionalizaría membresías sin verificación bajo la misma tabla que hoy
   confía en la verificación humana del coach.

**Costo estimado (para que "grande" no quede en el aire):** una tabla `groups` + una tabla de
membresía `group_members` (con roles: dueño/miembro) + RLS de ambas + una decisión de visibilidad
(¿un grupo es descubrible o solo por invitación?) + cómo interactúa con el candado de menores
(punto 3, sin resolver) + UI nueva completa (crear, ver, invitar, salir, expulsar) + su propio
harness de sabotaje (mínimo 10-15 casos, del mismo calibre que ③/④) + una decisión sobre si necesita
feed propio. Es, en tamaño, comparable a TODO el arco ③ (perfil+seguir) que tomó 5 commits y una
sesión completa de verificación adversarial mía. No es "una tabla más" — es la magnitud de un arco
nuevo.

**Recomendación:** si el PO quiere seguir con esto, que sea su PRÓXIMA sesión de planificación
dedicada (yo planifico la RLS igual que hice con ①-④), después de cerrar lo que ya está en cola
(entreno terminado + comentarios) y de que (B)/(C) tengan una primera versión en producción y
verificada. No se mete en el mismo lote que (A)/(B)/(C) — mezclarlo diluiría la verificación de
todo lo demás.

---

## 2. La distinción de datos — explícita y accionable

| Dato | ¿Se puede publicar? | Condición | Menores |
|---|---|---|---|
| Handle, avatar, bio | Sí (ya existe) | Opt-in general de perfil | Perfil sigue forzado privado |
| Racha, nivel, hitos (racha/nivel) | Sí (ya existe, `c13`) | Opt-in `show_milestones` | Nunca visible a un extraño/seguidor si el dueño es menor (candado de `_profile_visible`) |
| Nº de entrenos / antigüedad (agregado) | Sí — NUEVO, bajo (B) | Parte del opt-in general de perfil (agregado ya de bajo riesgo, análogo a racha) | Igual que arriba |
| Rutina completa (ejercicios/series/reps, SIN peso) | Sí (ya existe, `c12`) | Opt-in por publicación | Igual que arriba |
| Entreno terminado (nombre+duración+Nº ejercicios, SIN peso) | Sí — ya aprobado por el PO, pendiente RLS | Opt-in por publicación (o automático al terminar, a decidir con el PO — ver §6) | Igual que arriba |
| **Un PR puntual de un ejercicio** (ej. "Sentadilla 100kg") | 🟡 Sí, bajo (C), MUY acotado | Opt-in SEPARADO y explícito, distinto del opt-in general; publicación activa por evento, nunca automática ni retroactiva | **NUNCA disponible si el usuario es menor** — ni la UI del toggle debe aparecer |
| **"Kilos movidos" agregados / volumen total** | 🔴 NO | — | — |
| **Progreso por ejercicio como gráfica/serie histórica** | 🔴 NO | Es reconstrucción de patrón de entreno + peso a lo largo del tiempo — el mismo riesgo que ya se cerró con `trained_today`, en versión peor (con cifras) | — |
| Peso corporal, medidas, fotos de progreso, notas de salud/lesiones | 🔴 NUNCA, bajo ninguna forma | Ya excluido hoy; se mantiene | — |
| Texto libre sin evento de origen (pedido A tal cual) | 🔴 NO | Ver §1(A) — alternativa: nota corta atada a un post real + comentarios | — |

**Impacto en el allow-list del trigger (`_community_post_validate`):** un `kind` nuevo `'pr'`
necesita su propia rama (mismo patrón que `'streak'`/`'level'` en `c13`) — payload estrictamente
`{exercise_name, value_kg}` o similar, tope de longitud, sin ningún otro campo. La política
`cpost_ins` **no** necesita gatear `'pr'` a `service_role` como sí hace con `'streak'`/`'level'`
(esos son server-only porque el cliente no puede demostrarlos honestamente; un PR SÍ lo publica el
propio cliente, es autoexposición, no una medición que deba certificar el servidor) — pero si el
PO acepta el candado de "debe coincidir con un PR ya registrado", ese chequeo específico queda como
responsabilidad del MAPEADOR cliente (`communityPostPayload`), documentado honestamente como
candado de UX, no de servidor (mismo patrón ya usado y aceptado para el allow-list de nombres de
ejercicio de una rutina).

**Impacto en `_profile_visible`:** ninguno — todo lo nuevo (perfil rico, PR, entreno terminado)
cuelga del mismo helper único ya construido. La regla de oro de §13-BIS.5 ("no se reinventa la
visibilidad") se sostiene sin cambios.

**Impacto en menores, resumen de una línea:** todo lo nuevo de este documento hereda exactamente
el mismo candado que ya existe (`_is_minor` fuerza privado, follow nunca abre visibilidad a un
menor) — la única pieza NUEVA de protección que hay que añadir explícitamente es que el toggle de
"publicar mis PRs" ni siquiera se ofrezca en la UI de un usuario detectado como menor, porque a
diferencia de la visibilidad (que ya está cerrada por RLS pase lo que pase en el cliente), aquí el
riesgo es que un menor ACTIVE voluntariamente la exposición de un dato peso-adyacente — el candado
de "quién lo ve después" ya existe, pero es mejor que la opción ni aparezca.

---

## 3. Moderación — lo mínimo viable y honesto

Con AVI operado por un solo coach y ~20 asesorados, el diseño de moderación "de red social grande"
(equipo de revisión, IA de contenido, apelaciones) no es realista ni necesario. Lo mínimo honesto:

**Lo que YA existe (y hoy es un cascarón sin usar):**
- `community_reports` recibe filas (reportero + reportado + motivo) — pero **nadie las lee**. Hoy
  esto es, en la práctica, un botón que no hace nada visible para Camilo. Esto es un hallazgo
  independiente del pedido del PO, y debería resolverse ANTES o EN PARALELO a abrir más superficie
  de contenido (texto/comentarios), no después: abrir más contenido sin cerrar esto primero es
  invertir el orden de riesgo.
- Bloquear (`friendships.status='blocked'`) — funciona hoy, corta DM y visibilidad de inmediato,
  es autoservicio (no requiere a Camilo). Es la primera línea de defensa real y ya está bien.

**Lo mínimo que propongo añadir, en orden de esfuerzo/valor:**
1. **Vista de reportes para Camilo** (bandeja simple: lista de `community_reports` con quién
   reportó a quién y por qué, botón "banear de comunidad" = fuerza `is_private=true` + revoca sus
   posts/comentarios `visible=false`, sin borrar cuenta de AVI). Sin esto, "reportar" es teatro.
   Costo: bajo (una pantalla nueva + 2 acciones), y es requisito real antes de sumar comentarios.
2. **Límite de tasa en comentarios** (mismo patrón que `_community_msg_rate_limit` de DMs — tope
   de N comentarios/minuto por usuario) para cortar flood/spam automatizado.
3. **`esc()` estricto + longitud acotada** en cualquier texto libre nuevo (nota de entreno,
   comentario) — ya es el patrón del proyecto, se reafirma aquí porque texto libre es exactamente
   donde XSS/inyección importa más.
4. **Borrado propio + borrado por el autor del post** (el dueño de un post puede borrar cualquier
   comentario colgado de SU post, no solo el autor del comentario) — mismo patrón que Instagram:
   control de "mi espacio" sin depender de que Camilo intervenga cada vez.
5. **Ningún filtro automático de palabras prohibidas.** Ya es doctrina del proyecto para el
   allow-list de payloads (`§13-BIS.5`: "no se prohíben palabras, se evade trivial") — para texto
   libre la única defensa realista con este tamaño de equipo es reporte+bloqueo+revisión humana
   rápida, no un filtro de malas palabras que da falsa sensación de seguridad.

**Lo que esto NO cubre, dicho sin adornos:** no hay moderación proactiva (nadie lee contenido antes
de publicarse), no hay respuesta en tiempo real a un reporte (depende de que Camilo entre a
revisar), no hay forma de detectar grooming o manipulación que no se reporte explícitamente. Con un
solo coach y ~20 asesorados esto es un riesgo aceptable SI el volumen de contenido libre se
mantiene bajo (por eso §1.A limita el texto libre a notas cortas + comentarios, no un muro abierto)
— si la base de usuarios crece un orden de magnitud, este esquema de moderación deja de alcanzar y
hay que revisarlo, no es una solución permanente.

---

## 4. Grupos (D) — detalle del modelo de datos, para cuando se planifique (no para construir ya)

Si/cuando el PO decide seguir con esto, el boceto de forma (sujeto a las 5 preguntas sin resolver
de §1.D) sería:

```
groups (id, name, kind /* 'friends'|'gym' */, owner_id, created_at, is_private default true)
group_members (group_id, user_id, role /* 'owner'|'member' */, joined_at, state /* 'active'|'pending' */)
```
- RLS de `group_members`: ver tu propia fila (no la lista completa de un grupo ajeno) salvo que
  seas miembro tú también (entonces sí ves la lista, es tu grupo) — mismo patrón de "no
  enumeración de red ajena" que ya se usó en `follows` (`fo_sel`, §13-BIS.4).
- Un grupo con un miembro menor: recomiendo, mientras no se resuelva la pregunta 3 de §1.D, que
  **cualquier grupo con al menos un miembro menor nazca forzado no-descubrible** (mismo patrón que
  un perfil individual) — conservador por defecto, se afloja si el PO decide que quiere otra cosa
  con el análisis completo hecho.
- Empezar como **etiqueta sobre el muro existente**, NO feed propio (pregunta 4 de §1.D) — es la
  opción de menor costo que da valor real ("Ana · Equipo Fuerza Guaduas" junto a su nombre en el
  muro), evita duplicar toda la maquinaria de posts/reacciones/visibilidad para una entidad nueva.
- `community_gym_members` (pregunta 5): NO reusar tal cual para "clanes de amigos" — el gym de
  Camilo tiene una garantía implícita (el coach verificó a esa gente en persona) que un clan
  autoservicio no tiene. Si se construye, es tabla nueva, aunque el PATRÓN (membresía controlada
  por un dueño) se copie del gym.

Este es un boceto de forma, no una RLS lista para construir — antes de escribir el DDL final hace
falta que el PO responda las 5 preguntas de §1.D con las opciones que le presente Opus/yo, igual
que se hizo con el modelo Instagram en `§13.0`.

---

## 5. Orden recomendado (valor/riesgo, todo lo pendiente junto)

| # | Ítem | Backend nuevo | Riesgo | Por qué en esta posición |
|---|---|---|---|---|
| 1 | **Vista de reportes para Camilo** | Chico (query + 2 acciones) | Bajo | Deuda ya existente; requisito moral antes de abrir más texto libre |
| 2 | **Entreno terminado como post** (ya aprobado, maqueta vista) | Sí (`kind='workout'`, RLS ya patrón conocido) | Bajo (sin peso, evento real no falsificable — `finishedAt` ya existe) | Ya tiene decisión del PO; solo falta mi RLS; alto valor (más contenido real y frecuente que rutinas) |
| 3 | **Comentarios** (ya aprobados) | Sí (tabla nueva, RLS + rate-limit) | Medio (abre texto libre, pero acotado a "colgar de un post", no post-desde-cero) | Ya tiene decisión del PO; depende de #1 estando listo primero |
| 4 | **Perfil rico — agregados seguros** (B, acotado: entrenos totales, antigüedad, hitos en el perfil) | Ninguno nuevo (reusa datos ya públicos) | Muy bajo | Solo frontend, sin RLS nueva; rápido de dar |
| 5 | **Nota corta en el post de entreno** (alternativa a texto libre de A) | Ninguno adicional a #2 (mismo trigger, un campo más) | Bajo (acotado, atado a evento real) | Cierra el pedido (A) de forma segura, casi gratis sobre #2 |
| 6 | **PR puntual opt-in** (C, acotado) | Sí (`kind='pr'`, opt-in propio, candado anti-menor) | Medio-alto (es el más cercano a dato sensible de todo el lote) | Necesita su propia sesión de RLS (como ①-④); no se apura |
| 7 | **Grupos/clanes/equipos** (D) | Grande (2 tablas + RLS + UI nueva + decisión de menores sin resolver) | Alto si se decide mal la pregunta de menores | Proyecto aparte, su propia sesión de planificación completa |

Nota: #1-#5 son, en conjunto, del tamaño de UN arco más (comparable a ③ o ④ individualmente);
#6 es otra sesión de RLS dedicada del mismo calibre; #7 es, por costo, equivalente a TODO el arco
③+④ junto — no cabe en el mismo lote sin diluir la verificación de todo lo demás.

---

## 6. Decisiones que le corresponden al PO

Preguntas de PRODUCTO (no técnicas), con mi recomendación marcada:

1. **¿El post de "entreno terminado" se publica automático al terminar, o el usuario elige
   publicar cada vez?**
   **Recomendación: opt-in por publicación** (un botón "Compartir este entreno" al terminar,
   no automático) — mismo patrón que rutinas; automático se sentiría invasivo y generaría más
   contenido del que la moderación con un solo coach puede sostener.
2. **¿Los comentarios los puede hacer cualquiera que VE el post, o solo quien tiene relación
   (amigo/seguidor/gym) con el autor?**
   **Recomendación: solo quien tiene relación** (más conservador que las reacciones ❤️, que sí se
   abrieron a "cualquiera que ve" por decisión suya en ④) — un comentario es texto libre dirigido a
   una persona, mientras un ❤️ es un solo bit; el riesgo de acoso vía comentario de un desconocido
   es mayor que el de un corazón.
3. **¿El PR puntual (C) se permite para CUALQUIER adulto, o solo para el coach (Camilo) al
   principio, como piloto?**
   **Recomendación: empezar solo con el coach** (Camilo mismo lo pidió para sí — "me gustaría
   mostrar mis avances"). Es la forma más barata de dar valor real a quien lo pidió, aprender si
   genera abuso/comparación tóxica entre asesorados antes de abrirlo a todos, y limita la
   superficie nueva de dato sensible a una sola cuenta mientras se observa el efecto.
4. **¿"Kilos movidos" agregados (volumen total) queda descartado del todo, o el PO quiere insistir
   en alguna forma?**
   **Recomendación: descartado del todo** — es el punto de mayor riesgo del pedido original y el
   valor que aporta sobre un PR puntual + racha + nivel ya visibles es marginal.
5. **Grupos/clanes (D): ¿se agenda como su propia sesión de planificación, o se descarta de nuevo
   (como ya se había hecho una vez) por ahora?**
   **Recomendación: agendar aparte, después de que #1-#6 de la tabla de §5 estén en producción y
   verificados** — no perder el pedido, pero no mezclarlo con este lote.
6. **¿Un menor puede alguna vez ver el toggle de "publicar mis PRs", aunque quede sin efecto por
   RLS?**
   **Recomendación: no, ni siquiera se le muestra la opción** — coherente con el resto del arco
   (la UI ya oculta "hacer público mi perfil" de forma equivalente cuando el trigger lo va a
   revertir de todos modos; es mejor experiencia y mensaje más honesto que "puedes intentarlo pero
   no funcionará").

---

## 7. Lo legal

- **`legal/politica-tratamiento-datos.md` §9 DEBE cambiar** antes de que (B)/(C) salgan, no
  después. Hoy dice, sin ambigüedad, que los kilos levantados **nunca** se comparten — eso deja de
  ser cierto en cuanto exista el `kind='pr'` opt-in. El texto nuevo debe:
  - Mantener la promesa por defecto ("tus kilos NUNCA se comparten, salvo que tú actives
    explícitamente...").
  - Explicar en español simple qué es un "récord publicado" y que es una acción activa del
    usuario, no algo que la app hace por él.
  - Aclarar que esta opción no existe para menores.
  - Documentar el perfil rico ampliado (entrenos totales, antigüedad) como agregados ya cubiertos
    por el §9 actual (no requieren texto nuevo, son extensión menor del "resumen de constancia" ya
    descrito).
- **Subir `LEGAL_V`** (`app-3-coach.js`, hoy `2026-07-20-borrador`) al publicar el cambio — mismo
  patrón que C4 y R2 ya siguieron. Esto NO re-pide consentimiento a nadie retroactivamente para
  datos que ya compartían (racha/hitos/rutinas siguen igual) — pero si un usuario activa el PR
  opt-in, su `consent_v` debe capturar la versión NUEVA (evidencia de que aceptó específicamente
  esta ampliación, no la general vieja).
- **Debe pasar por abogado, no solo por mí, antes de salir a producción real (no solo antes de
  build):** la redacción exacta de "esto es un dato que tú decides publicar, bajo tu propio
  riesgo" para que sea jurídicamente sólida como consentimiento específico e informado (Ley 1581,
  datos sensibles) — mi análisis técnico garantiza que el candado se sostiene en el servidor, pero
  la SUFICIENCIA del texto de consentimiento es criterio legal, no de ingeniería. Esto ya estaba
  pendiente de abogado en general (`§11` de `plan-comunidad.md`, backlog) — este pedido lo hace más
  urgente porque ahora hay un dato sensible-adyacente nuevo en juego, no solo metadata de actividad.
- Grupos (D), si se construye, no tiene impacto legal nuevo evidente más allá de lo ya cubierto
  (nombre de grupo + membresía no son datos sensibles) — se revisa igual en su propia sesión.

---

## Resumen ejecutivo (para Camilo)

Del pedido, hay 4 partes y las trato distinto:

1. **Publicaciones de texto libre sueltas** — no las voy a recomendar tal cual. Con un solo
   entrenador y ~20 personas, un muro donde cualquiera escribe lo que sea es la puerta más fácil
   para que alguien abuse de otro, y hoy ni siquiera tenemos dónde revisar los reportes que ya se
   generan. La alternativa que sí propongo da casi lo mismo: una nota corta cuando alguien
   comparte que terminó su entreno, más comentarios en las publicaciones — siempre "colgado" de
   algo real, nunca un mensaje suelto sin origen.

2. **Perfil con logros, entrenos, progresos y rachas** — sí, se puede hacer bien y pronto, con
   números que ya son seguros hoy (racha, nivel, hitos, cuántos entrenos llevas, hace cuánto
   entrenas). Lo único que separo aparte es **"kilos movidos"**: eso NO lo voy a poner en el perfil
   como número agregado — es exactamente el tipo de dato que decidimos, con evidencia y con tu
   aprobación, que nunca sale de tu cuenta ni de la de tus asesorados.

3. **Publicar tus avances por ejercicio (los tuyos, como coach, y en general)** — aquí hay una parte
   real que tienes razón en pedir: si TÚ decides mostrar "levanté 100kg en sentadilla", es tu dato y
   tu decisión, como en Strava. Lo que propongo es dejarlo como una publicación puntual que activas
   tú mismo cuando quieras compartir un récord — nunca automático, nunca visible para un menor bajo
   ninguna circunstancia, y empezando SOLO contigo (ya que fuiste tú quien lo pidió para sí mismo)
   antes de abrirlo a todos, para ver cómo se siente antes de generalizarlo.

4. **Grupos/clanes/equipos con nombre propio** — es una buena idea, pero es GRANDE: del tamaño de
   todo lo que ya construimos para perfiles+seguir juntos. Además trae una pregunta que hay que
   resolver con cuidado antes de escribir una sola línea: ¿qué pasa si un menor está en un grupo
   público con nombre? Mi recomendación es no meterlo en este lote — lo dejamos anotado y le damos
   su propia sesión de planificación completa cuando termine lo de arriba.

Antes de que cualquiera de las partes 2 y 3 salga, hay que actualizar el texto legal de la
Comunidad (hoy dice, literal, que los kilos "nunca se comparten") — y esa parte del texto la debe
revisar un abogado antes de publicarse de verdad, no solo yo.

**Documento completo:** `docs/plan-comunidad-v3.md`.
