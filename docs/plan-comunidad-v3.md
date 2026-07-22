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

## 6-BIS. DECISIONES DEL PO (AskUserQuestion, 2026-07-22) — cerradas, NO re-preguntar

Sobre las 6 preguntas de §6 (las #4 y #6 tenían respuesta obvia y se adoptó la recomendación
de Fable sin preguntar: **volumen total de kilos DESCARTADO del todo**, y **a un menor NI SE LE
MUESTRA el toggle de PRs**):

1. **Publicar el entreno = OPT-IN POR PUBLICACIÓN** (recomendación aceptada): botón «Compartir
   este entreno» al terminar; nada sale al muro sin un toque del usuario.
2. **Comentarios = CUALQUIERA QUE VE el post** — ⚠️ **DESVIACIÓN de la recomendación de Fable**
   (que era solo-con-relación). Decisión del PO con el riesgo en la mesa, coherente con la que ya
   tomó para los ❤️ en ④ («si puedes verlo, puedes reaccionar»). CONSECUENCIA vinculante: la vista
   de reportes (#1 de §5) y el rate-limit de comentarios NO son opcionales — son el contrapeso de
   esta apertura. Fable decide en su estipulación de RLS si añade candados extra (p.ej. un menor
   autor = comentarios solo de su gente, aunque el post sea visible).
3. **PRs con kilos = PILOTO SOLO COACH** (recomendación aceptada): Camilo publica sus récords
   primero; se abre a los demás adultos solo tras observar el efecto. El cambio legal de §7 aplica
   desde el piloto (el dato ya se publica, aunque sea de una sola cuenta).
4. **Grupos/clanes = AGENDADO APARTE** (recomendación aceptada): propia sesión de planificación
   cuando #1-#6 de §5 estén en producción y verificados. No se descarta.

**Flujo desde aquí:** Fable estipula la RLS del lote #1-#5 de §5 (vista de reportes ·
`kind='workout'` con nota corta · comentarios con las decisiones de arriba) → Opus ejecuta →
Fable verifica. El #6 (PR piloto) lleva su PROPIA sesión de RLS después del lote, junto con el
cambio legal de §7.

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

---

# §8 — ESTIPULACIÓN DEL LOTE v3-a (Fable, 2026-07-22)

> **Alcance:** ítems #1-#5 de la tabla de §5, con las decisiones del PO de §6-BIS ya incorporadas.
> El PR piloto (#6) y grupos (#7) NO van aquí — sesiones aparte, ya agendadas. Opus ejecuta esto
> bajo `docs/reglas-opus.md` (suite antes/después, hook 11/11, un corte = un commit, sabotaje con
> dientes, jamás `--no-verify`); yo re-verifico. Todo el DDL de abajo fue **verificado contra la
> base viva** (read-only, 2026-07-22): policies reales de `community_posts`/`community_reports`/
> `community_reactions`, grants por columna, constraint de `kind`, y la identidad real del coach
> (`community_profiles.role='coach'` tiene exactamente 1 fila = el UID con 22 asesorados en
> `user_data`; el coach QA tiene 1). `community_comments` no existe (nombre libre).
> `community_reports` tiene 0 filas — los constraints nuevos entran sin migración de datos.

---

## §8.0 · ÍTEM 0 (NUEVO, 🔴 HALLAZGO DE ESTA ESTIPULACIÓN) — hotfix `c13c`: un cliente puede FABRICARSE UN HITO por la puerta del UPDATE

**El agujero, verificado contra la base viva:** `cpost_ins` (c13) exige `kind='routine'` al
cliente… pero **`cpost_upd` solo exige `user_id = auth.uid()`**, y `authenticated` tiene grant de
UPDATE sobre **todas** las columnas de `community_posts` — incluidas `kind` y `payload` (confirmado
en `information_schema.column_privileges` y `pg_policy`). Ruta del exploit: el cliente publica una
rutina legítima (pasa `cpost_ins`) y luego hace
`UPDATE community_posts SET kind='streak', payload='{"weeks":52}' WHERE id=<suyo>` — la policy pasa
(es su fila), y el trigger `_community_post_validate` **valida el payload contra la rama de hitos y
lo ACEPTA** (`{weeks:52}` es un hito bien formado). Resultado: un hito falso «Cumplió 52 semanas»,
exactamente lo que el candado de R2 prometió imposible. La misma puerta permite inflar un hito ya
emitido (`weeks: 2 → 52`) editando solo `payload`.

**Fix (mata la CLASE, no el síntoma):** el cliente no necesita editar posts — el frontend solo
inserta y borra (verificado en `app-7-community.js`: cero `.update()` sobre `community_posts`). Se
le quita el UPDATE de todo salvo `visible` (ocultar/mostrar lo propio, inofensivo y validado igual
por el trigger):

```sql
-- c13c_posts_update_lockdown.sql — SOLO nube, sin bump de versión (no cambia JS)
revoke update on public.community_posts from authenticated;
grant update (visible) on public.community_posts to authenticated;
-- cpost_upd queda igual (user_id = auth.uid()): con el grant recortado, el único UPDATE
-- posible del cliente es visible de SU fila. kind/payload/user_id/created_at = intocables.
```

**Checklist de sabotajes M0 (Opus corre, yo re-corro; todo en tx con `rollback`, actor QA
impersonado con `set local role authenticated` + `request.jwt.claims`):**
- **M0.1 debe-BLOQUEAR:** con un post `routine` propio del actor, `UPDATE ... SET kind='streak',
  payload='{"weeks":52}'` → `permission denied for table community_posts` (column-level).
  **Primero reproducir el exploit SIN el fix** (antes de aplicar c13c): el mismo UPDATE debe
  PASAR y dejar el hito falso — evidencia de que el fix es load-bearing. Luego aplicar y ver morder.
- **M0.2 debe-BLOQUEAR:** `UPDATE ... SET payload='{"weeks":52}'` (sin tocar kind) → denied.
- **M0.3 debe-PASAR:** `UPDATE ... SET visible=false` de su propio post → OK; de un post AJENO → 0
  filas (policy).
- **M0.4 debe-PASAR:** la edge sigue emitiendo hitos (service_role no pasa por grants de
  authenticated) — smoke: un INSERT de hito con service_role en tx.

**Orden:** esto se aplica HOY, ANTES que el resto del lote, y Opus me reporta el resultado de M0
apenas esté (no espera al final del lote). Sin deploy de app (patrón `push_sel_own`).

---

## §8.1 · ÍTEM #1 — VISTA DE REPORTES para el coach (migración `c14_reports_moderation.sql` + UI coach)

### Decisiones cerradas

1. **Cómo se reconoce al moderador — tabla, no rol derivado.** `community_profiles.role='coach'`
   sirve como INSIGNIA (cosmética), pero NO como autoridad de moderación: la edge lo deriva de
   «posee asesorados», y `user_data.coach_id` es client-writable (F7) — un atacante con 2 cuentas
   se fabrica un "asesorado" y la edge lo marcaría coach. Leer TODOS los reportes (identidad de
   reporteros incluida) no puede colgar de eso. La autoridad vive en una tabla que **solo
   service_role escribe** (mismo principio que `community_gym_members`): `community_moderators`.
   El **seed** se hace en la migración con una consulta (no un UID pegado a mano en un repo
   público) y Opus **VERIFICA el resultado**: debe quedar exactamente 1 fila y ser el UID real de
   Camilo (`0a6484ed-…`, el de 22 asesorados; el coach QA con 1 asesorado NO pasa el umbral). Esto
   NO viola F7: no es un gate en runtime sobre dato client-writable — es un valor sembrado una vez,
   con privilegios de migración, verificado por humano+harness antes de dar por bueno.
2. **Lectura y acciones por RPC DEFINER, no por policy SELECT.** `community_reports` sigue
   **sellada** para authenticated (sin SELECT, como la dejó c1) — abrir una policy de SELECT +
   grants + join de handles en el cliente ensancharía superficie sin necesidad. Dos RPCs DEFINER
   gateadas por `_is_moderator` lo resuelven completo, incluida la vista del handle de gente que el
   coach no puede ver por `cp_sel` (el DEFINER bypasa) y el EXTRACTO del contenido reportado.
3. **Acciones mínimas del coach:** (a) **ver** la bandeja (quién reportó a quién, por qué, extracto
   del contenido si el reporte apunta a un post/comentario), (b) **marcar resuelto**, (c) **borrar
   el contenido reportado** (rama de moderador en `cpost_del`; los comentarios nacen con esa rama
   en §8.3). **DESVIACIÓN de mi propio análisis (§3.1 proponía «banear de comunidad»):** la
   suspensión global de una cuenta NO va en v3-a — hacerla bien exige columna server-only +
   tocar `_profile_visible` y `_can_dm` (un «ban» sobre `visible` sería teatro: el usuario tiene
   grant para revertirlo). Se difiere con criterio de disparo: al primer reincidente real en la
   bandeja, se diseña como slice propio. Queda en el radar.
4. **Reportes de/hacia cuentas borradas:** c1 ya usa `ON DELETE SET NULL` — el historial de
   moderación sobrevive anonimizado. La RPC hace LEFT JOIN a `community_profiles`: handle `null`
   (cuenta borrada O salió de la comunidad) → la UI pinta **«Ya no está en la comunidad»**, nunca
   una fila rota. El reporte sigue siendo accionable (marcar resuelto).

### DDL (compilado mentalmente contra PG15; refs calificadas, `search_path=''`)

```sql
-- ── Moderadores: solo service_role escribe; el cliente solo puede saber si ÉL es moderador ──
create table public.community_moderators (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.community_moderators enable row level security;
create policy mod_sel_self on public.community_moderators for select using (user_id = auth.uid());
revoke all on public.community_moderators from anon, authenticated;
grant select on public.community_moderators to authenticated;
grant all on public.community_moderators to service_role;

-- Seed (una sola vez; Opus VERIFICA: exactamente 1 fila = UID real de Camilo)
insert into public.community_moderators(user_id)
select ud.coach_id from public.user_data ud
 where ud.coach_id is not null
 group by ud.coach_id having count(*) >= 5
on conflict do nothing;

create function private._is_moderator(u uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.community_moderators m where m.user_id = u);
$$;
revoke all on function private._is_moderator(uuid) from public;
grant execute on function private._is_moderator(uuid) to authenticated, service_role;

-- ── Columnas nuevas de community_reports (0 filas hoy → constraints entran limpio) ──
alter table public.community_reports
  add column status      text not null default 'open' check (status in ('open','resolved')),
  add column resolved_at timestamptz,
  add column resolved_by uuid,
  add column context     text;
alter table public.community_reports add constraint community_reports_context_chk
  check (context is null or context ~ '^(post|comment):[0-9a-fA-F-]{36}$');
alter table public.community_reports add constraint community_reports_reason_len
  check (reason is null or char_length(reason) <= 300);
-- NOTA grants: el INSERT de c1 es a NIVEL DE TABLA (no por columna) → `context` queda cubierto
-- automáticamente. Opus lo CONFIRMA con el sabotaje R7 (insert con context como QA impersonado),
-- no a ojo — si resultara column-level, `grant insert(context)` explícito (lección c13b).

-- ── Bandeja del moderador (RPC DEFINER; LANGUAGE SQL: outputs con nombre propio, sin ambigüedad) ──
create function public.cmty_mod_reports()
  returns table(rid uuid, rcreated_at timestamptz, rstatus text, rreason text, rcontext text,
                reporter_uid uuid, reporter_handle text, reported_uid uuid, reported_handle text,
                excerpt text)
  language sql stable security definer set search_path = '' as $$
  select r.id, r.created_at, r.status, r.reason, r.context,
         r.reporter, pr.handle, r.reported, pd.handle,
         case
           when r.context like 'post:%' then
             (select left(coalesce(p.payload->>'name','') ||
                          coalesce(' — ' || (p.payload->>'note'), ''), 140)
                from public.community_posts p
               where p.id::text = split_part(r.context, ':', 2))
           else null
         end
    from public.community_reports r
    left join public.community_profiles pr on pr.user_id = r.reporter
    left join public.community_profiles pd on pd.user_id = r.reported
   where private._is_moderator(auth.uid())      -- no-moderador → 0 filas, en silencio
   order by (r.status = 'open') desc, r.created_at desc
   limit 200;
$$;
revoke all on function public.cmty_mod_reports() from public, anon;
grant execute on function public.cmty_mod_reports() to authenticated, service_role;
-- (advisor 0029 WARN intencional, mismo régimen que resolve_share_code/cmty_my_secrets)

create function public.cmty_mod_resolve(p_report uuid) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if not private._is_moderator(auth.uid()) then raise exception 'not allowed'; end if;
  update public.community_reports
     set status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
   where id = p_report;
end $$;
revoke all on function public.cmty_mod_resolve(uuid) from public, anon;
grant execute on function public.cmty_mod_resolve(uuid) to authenticated, service_role;

-- ── El moderador puede BORRAR contenido reportado (posts; comentarios nacen con esto en c16) ──
drop policy cpost_del on public.community_posts;
create policy cpost_del on public.community_posts for delete
  using ( user_id = auth.uid() or private._is_moderator(auth.uid()) );
```

Nota de comparación `p.id::text = split_part(...)`: se compara como TEXTO a propósito — castear el
context a `uuid` reventaría la RPC entera con un context legacy/malformado; como texto, un context
raro solo da `excerpt = null`.

### Frontend (coach)

- Tarjeta **«Reportes de comunidad»** en el Inicio del coach (`renderHome`, app-2), visible SOLO si
  `cmty_mod_reports()` devuelve filas con `status='open'` (para el no-moderador la RPC da 0 filas →
  la tarjeta jamás aparece; no hace falta saber client-side "soy moderador"). Badge con el conteo.
- Toca → modal/lista: reportero → reportado (handles con `esc()`, fallback «Ya no está en la
  comunidad»), motivo, extracto, fecha. Acciones por fila: **«Resuelto»** (`cmty_mod_resolve`) y,
  si `context` apunta a un post, **«Eliminar publicación»** (`delete` normal por el cliente auth —
  la policy nueva lo deja pasar por ser moderador) con confirmación.
- Sin `AVI_NEWS` (superficie del coach, no del asesorado). Barra premium completa igualmente
  (ambos temas, táctil, estados vacío/error). Escrituras vía `AUTH.client()`, selladas en localhost.

### Checklist de sabotajes R (tx + rollback, actores sintéticos)

- **R1 debe-BLOQUEAR:** usuario QA normal: `select * from community_reports` → permission denied
  (sigue sin grant de SELECT).
- **R2 debe-BLOQUEAR (en silencio):** usuario QA normal llama `cmty_mod_reports()` → 0 filas.
- **R3 debe-BLOQUEAR:** usuario QA normal llama `cmty_mod_resolve(<id>)` → exception `not allowed`.
- **R4 debe-BLOQUEAR:** usuario QA normal INSERT/DELETE sobre `community_moderators` → denied.
- **R5 debe-PASAR:** en tx, insertar al QA en `community_moderators` (como postgres) →
  `cmty_mod_reports()` devuelve el reporte fixture CON handles resueltos; **prueba load-bearing:**
  en la MISMA tx, borrar esa fila → la misma llamada da 0 filas (la tabla ES el gate).
- **R6 debe-PASAR:** moderador resuelve → `status='resolved'` + `resolved_by` estampado con SU uid.
- **R7 debe-PASAR:** reportero QA inserta reporte CON `context='post:<uuid-real>'` → 200 (confirma
  el grant de tabla); **debe-BLOQUEAR:** `context='post:abc'` y `context='loquesea'` → check.
- **R8 debe-PASAR:** reporte cuyo reportado NO tiene perfil (o borró cuenta → `reported=null`) →
  la RPC devuelve la fila con handle null y la UI pinta el fallback (check de harness UI).
- **R9 debe-PASAR / debe-BLOQUEAR:** moderador borra un post AJENO reportado → borrado; usuario QA
  normal intenta borrar el post de otro → 0 filas.
- **R10 seed:** `select * from community_moderators` = exactamente 1 fila = UID `0a6484ed-…`
  (cotejar contra el dueño de los 22 asesorados en `user_data`). El coach QA NO está.

**Harness:** `_verify-reports.mjs` NUEVO (render de la tarjeta/modal con RPC stubbeada: con filas,
sin filas, con handle null; aserciones duras, exit 1). La matriz R corre por SQL (MCP) — el UI
harness NO puede loguearse como Camilo real y no debe.

---

## §8.2 · ÍTEMS #2+#3 — ENTRENO TERMINADO como post + NOTA CORTA (migración `c15_workout_posts.sql` + avi-core + UI)

### Decisiones cerradas

1. **Opt-in POR publicación** (decisión PO §6-BIS.1): tarjeta «Compartir este entreno» en la
   pantalla de fin de entreno, SOLO si `CMTY.profile` existe (es miembro). Nada automático, nada
   pre-marcado. `cmtyOnWorkoutFinished` sigue igual (refresh del snapshot ≠ publicar).
2. **Qué va en el payload (lo escribe el CLIENTE = todo esto es falsificable-inofensivo, dicho sin
   eufemismos):** `{name, duration_min?, exercises_count, note?}`.
   - `name` (obligatorio, 1-80): nombre de la rutina. Mismo régimen que el post de rutina.
   - `duration_min` (opcional, número 1-600): lo DERIVA el mapeador cliente de
     `finishedAt - startedAt` (redondeado a minutos, clamp) — no lo teclea el usuario, pero desde
     el servidor sigue siendo autoreportado. Tolerado: mentir «entrené 90 min» es la misma clase
     que Strava sin verificación; acotado para que no sea vector de basura. Si la sesión legacy no
     tiene `startedAt` sano → el campo se OMITE (por eso es opcional) y la tarjeta no pinta el chip.
   - `exercises_count` (obligatorio, número 1-60): ejercicios completados de la sesión.
   - `note` (opcional, string 1-140, trim): **la nota corta del ítem #3.** Vive DENTRO del payload
     del post de entreno (no columna nueva, no post suelto): el trigger la valida (tope + tipo +
     allow-list) y `esc()` obligatorio al pintarla. Moderación: se reporta reportando el POST
     (`context='post:<id>'` → la RPC de §8.1 ya incluye la nota en el excerpt) y el moderador puede
     borrar el post. Cierra el pedido (A) tal como lo estipuló §1.A.
   - **La RACHA NO va en el payload.** La maqueta la muestra, pero meterla al payload sería dejar
     al cliente estampar un número que el servidor ya certifica — la tarjeta la lee al PINTAR de
     `community_profiles.streak_weeks` del autor (server-side, ya cargado en `profById`/amigos).
     Un solo origen de verdad, cero falsificación de racha.
   - **JAMÁS:** kilos/pesos, series con carga, datos de salud, ids internos — fuera del allow-list,
     el trigger rechaza cualquier clave extra.
3. **Cómo se amplía `cpost_ins` sin abrir los hitos:** allow-list de kinds del cliente pasa de
   `kind = 'routine'` a `kind in ('routine','workout')`. `'streak'`/`'level'` siguen siendo
   imposibles para authenticated (y la puerta del UPDATE ya quedó soldada en §8.0).
4. **Rate-limit de posts (adición MÍA, no pedida — cierra deuda de c12):** hoy `community_posts`
   no tiene NINGÚN límite de tasa — un cliente podía insertar cientos de posts válidos por minuto
   y enterrar el muro de sus seguidores. Con el post de entreno (más frecuente que rutinas) la
   deuda se vuelve riesgo real. Patrón `_cm_rate` ya probado: **5 posts/minuto**, con la emisión
   de hitos de la edge EXENTA (service_role no consume cupo del usuario).

### DDL

```sql
-- ── kind nuevo + policy de INSERT ampliada (hitos siguen server-only) ──
alter table public.community_posts drop constraint community_posts_kind_check;
alter table public.community_posts add constraint community_posts_kind_check
  check (kind in ('routine','streak','level','workout'));

drop policy cpost_ins on public.community_posts;
create policy cpost_ins on public.community_posts for insert
  with check ( user_id = auth.uid() and kind in ('routine','workout') );

-- ── Rate-limit de posts (patrón _cm_rate; edge exenta vía auth.uid() null) ──
create table public._cpost_rate (
  uid uuid not null, minute timestamptz not null, count int not null default 0,
  primary key (uid, minute)
);
create function public._community_post_rate_limit() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare m timestamptz := date_trunc('minute', now()); n int;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then return new; end if;
  insert into public._cpost_rate(uid, minute, count) values (new.user_id, m, 1)
    on conflict (uid, minute) do update set count = public._cpost_rate.count + 1 returning count into n;
  if n > 5 then raise exception 'rate limit exceeded'; end if;
  delete from public._cpost_rate where minute < m - interval '10 minutes';
  return new;
end $$;
revoke execute on function public._community_post_rate_limit() from public, anon, authenticated;
create trigger trg_cpost_rate before insert on public.community_posts
  for each row execute function public._community_post_rate_limit();
revoke all on public._cpost_rate from anon, authenticated;
grant all on public._cpost_rate to service_role;
```

**Rama nueva del trigger `_community_post_validate`** (create or replace de la función COMPLETA de
c13; se INSERTA este bloque después del `end if;` que cierra la rama de hitos y ANTES de
`if new.kind <> 'routine' then …`; no requiere variables nuevas en el `declare`; las ramas de hito
y de rutina quedan byte a byte como en c13):

```sql
  -- ── entreno terminado (kind='workout'; lo inserta el cliente, allow-list estricta) ──
  if new.kind = 'workout' then
    for k in select jsonb_object_keys(new.payload) loop
      if k not in ('name','duration_min','exercises_count','note') then
        raise exception 'forbidden workout key: %', k;
      end if;
    end loop;
    if jsonb_typeof(new.payload->'name') is distinct from 'string' then raise exception 'name must be a string'; end if;
    if char_length(new.payload->>'name') = 0 or char_length(new.payload->>'name') > 80 then raise exception 'name length out of range'; end if;
    if new.payload ? 'duration_min' then
      if jsonb_typeof(new.payload->'duration_min') <> 'number' then raise exception 'duration_min must be a number'; end if;
      if (new.payload->>'duration_min')::numeric < 1 or (new.payload->>'duration_min')::numeric > 600 then raise exception 'duration_min out of range'; end if;
    end if;
    if jsonb_typeof(new.payload->'exercises_count') is distinct from 'number' then raise exception 'exercises_count must be a number'; end if;
    if (new.payload->>'exercises_count')::numeric < 1 or (new.payload->>'exercises_count')::numeric > 60 then raise exception 'exercises_count out of range'; end if;
    if new.payload ? 'note' then
      if jsonb_typeof(new.payload->'note') is distinct from 'string' then raise exception 'note must be a string'; end if;
      if char_length(new.payload->>'note') = 0 or char_length(new.payload->>'note') > 140 then raise exception 'note length out of range'; end if;
    end if;
    return new;
  end if;
```

### avi-core + frontend

- **`communityWorkoutPayload(session, routineName)`** PURA en avi-core (bloque dual, testeada):
  devuelve el payload o `null` si la sesión no está finalizada (`sessionFinished`) o no tiene
  nombre. Clamps espejo del trigger (80/1-600/1-60/140). `duration_min` solo si
  `startedAt` y `finishedAt` existen y dan 1-600 min; `note` solo si el trim da 1-140.
- **UI de compartir:** en la pantalla de fin (workout-finish, app-4): tarjeta con el resumen
  («Pierna y glúteo · 52 min · 6 ejercicios»), input opcional de nota (`maxlength=140`, contador,
  tono Sofía: «Cuéntale algo a tu gente (opcional)») y botón «Compartir este entreno». Insert vía
  `AUTH.client()`, sellado en localhost. Tras publicar: toast + la tarjeta se reemplaza por
  «✓ Compartido». Errores → `_cmtyErr`.
- **Tarjeta del muro `_cmtyWorkoutCard(post)`** en app-7 (router `_cmtyPostCard` gana la rama
  `kind==='workout'`): avatar + handle (+tag COACH), «terminó su entreno», nombre, chips
  `X min · Y ejercicios` (omitir chip sin dato) **+ racha leída del PERFIL del autor**
  (`_cmtyAuthorProf(post.user_id).streak_weeks`, solo si > 0), nota en `esc()` si viene, fila de ❤️
  idéntica a las demás (reusa `cmtyPostHeart` — `re_ins`/`_post_author_if_visible` funcionan sin
  cambios para el kind nuevo). Visibilidad heredada: `cpost_sel` + `_profile_visible`, nada nuevo.
- **Legal (una sola edición para TODO el lote, en este corte):** añadir a
  `legal/politica-tratamiento-datos.md` §9 que (a) al compartir un entreno se publica nombre de
  rutina, duración aproximada, nº de ejercicios y una nota corta OPCIONAL escrita por el usuario, y
  (b) las publicaciones aceptan comentarios visibles para quien ve la publicación, reportables y
  borrables (por el autor del comentario, el autor de la publicación o el coach). Subir `LEGAL_V`
  (app-3) y `CMTY_CONSENT_V` (app-7) UNA vez aquí (cubre también §8.3 — dos bumps seguidos serían
  ruido; el texto puede mencionar comentarios un deploy antes de que existan, es borrador de
  abogado igual). Sigue pendiente de abogado (§7) — sin cambio de estado.
- **`AVI_NEWS`:** entrada nueva («Comparte tu entreno terminado en la Comunidad») → `_verify-news`
  EN LA MISMA sesión (R2.4).

### Checklist de sabotajes W (tx + rollback; actores sintéticos CON perfil — trampa 2 de fixtures)

- **W1 debe-PASAR:** QA impersonado inserta `workout` con `{name,duration_min,exercises_count}`
  válidos → 200. (Si falla, distinguir FK/policy ANTES de concluir — trampa 2.)
- **W2 debe-PASAR:** con `note` de exactamente 140 caracteres → 200.
- **W3 debe-BLOQUEAR:** `note` de 141 → `note length out of range`.
- **W4 debe-BLOQUEAR:** clave extra en el payload (`kg:100`, `weight`, `streak`, `sets`) →
  `forbidden workout key`.
- **W5 debe-BLOQUEAR:** `duration_min` 0, 601 y `"60"` (string) → rechazo; sin `duration_min` →
  PASA (opcional).
- **W6 debe-BLOQUEAR:** cliente inserta `kind='streak'` → `cpost_ins` lo rechaza (sigue cerrado).
- **W7 debe-BLOQUEAR:** el 6º post del mismo actor en el mismo minuto → `rate limit exceeded`;
  los primeros 5 PASAN. (Los 5 previos dentro de la MISMA tx — el rollback limpia `_cpost_rate`.)
- **W8 debe-PASAR:** INSERT de hito con service_role → no consume cupo ni choca con el rate-limit
  (rama `auth.uid() is null`).
- **W9 debe-PASAR / debe-BLOQUEAR (visibilidad heredada):** post `workout` de un ADULTO privado →
  su seguidor APROBADO lo ve (fixture: insert follow → queda `pending` por `_community_follow_state`
  → **UPDATE a `active` impersonando al followee + SELECT del estado real** — trampa 3), un extraño
  NO lo ve.
- **W10 debe-BLOQUEAR:** post `workout` de un MENOR sintético (perfil sin `birth_date`) → invisible
  para extraño Y para seguidor aprobado (rama `not _is_minor`); su amigo/gym SÍ lo ve (debe-PASAR).
  Actores 100% sintéticos SIN relación previa (trampa 1).
- **W11 frontend (harness):** terminar un entreno SIN tocar el botón → CERO inserts a
  `community_posts` (espía sobre el cliente stub); con el botón → 1 insert con el payload EXACTO
  del mapeador (deep-equal). XSS: nota con `<img onerror=...>` se pinta escapada en la tarjeta.

**Harness:** `_verify-workoutshare.mjs` NUEVO (flujo de fin + W11) + `_verify-feed.mjs` extendido
(tarjeta workout con/sin duración, con/sin nota, racha del perfil no del payload) + suite de
avi-core con tests del mapeador (incluye el caso «no finalizada → null», clase v367).

---

## §8.3 · ÍTEM #4 — COMENTARIOS (migración `c16_comments.sql` + UI)

### Decisiones cerradas

1. **Regla general (decisión del PO, §6-BIS.2, vinculante):** comenta **cualquiera que VE** el
   post. Se implementa literal… para ADULTOS. El contrapeso obligatorio (bandeja de reportes §8.1 +
   rate-limit) queda cumplido por diseño: c14 va ANTES en el orden (§8.5).
2. **MENORES — el candado que §6-BIS.2 me delegó, decidido en AMBAS direcciones:**
   - **Post cuyo AUTOR es menor:** solo comenta SU GENTE (amigos/gym/él mismo). Hoy esto ya es
     estructural — `_profile_visible` de un menor colapsa exactamente a su gente (las ramas pública
     y de seguidor excluyen menores), así que «cualquiera que ve» = su gente. PERO lo dejo
     **explícito** en `_can_comment` como doble candado deliberado (patrón c8): si mañana alguien
     re-ensancha `_profile_visible`, los comentarios hacia menores NO se ensanchan en silencio. El
     sabotaje K3 prueba que el candado explícito muerde por sí solo.
   - **COMENTARISTA menor (candado NUEVO, load-bearing hoy):** un menor solo puede comentar posts
     de SU GENTE. Sin esto, un menor comentando el post público de un desconocido expondría su
     handle/avatar ante extraños — exactamente el descubrimiento que c8 le niega a su perfil, roto
     por su propia acción. Coherente con la decisión ya cerrada del PO («a un menor NI SE LE
     MUESTRA el toggle de PRs»): la protección de menores no depende de que el menor se cuide.
3. **Quién borra:** el autor del comentario, el autor del POST (su espacio, patrón Instagram,
   §3.4), y el **moderador** (§8.1). Nadie edita (sin UPDATE: ni policy ni grant — un comentario
   se borra y se reescribe, no se edita en silencio).
4. **Tope de longitud: 280** (suficiente para «¡vas durísimo! ¿qué rutina es esa?», corto para no
   volverse muro dentro del muro). Rate-limit **10 comentarios/minuto** (patrón `_cm_rate`).
5. **Reportar un comentario: reusa `community_reports`** con `context='comment:<id>'` (columna ya
   creada en c14). La RPC del moderador gana la rama de excerpt de comentario (abajo). Reportar
   comentario NO auto-bloquea al autor (a diferencia del reporte de perfil §5.4: bloquear por un
   comentario que puede ser un malentendido es desproporcionado; el reportado queda en la bandeja
   y el reportero puede bloquear aparte si quiere — la UI ofrece ambas acciones separadas).
6. **Sin Realtime** para comentarios (decisión explícita anti-scope-creep): cargan con el feed y al
   abrir el hilo. Si el uso real lo pide, se evalúa después.

### DDL

```sql
create table public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.community_profiles(user_id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now()
);
alter table public.community_comments enable row level security;
create index community_comments_post_idx on public.community_comments(post_id, created_at);

-- ── Helpers (private, DEFINER, search_path='') ──
create function private._post_owner(p_post uuid) returns uuid
  language sql stable security definer set search_path = '' as $$
  select p.user_id from public.community_posts p where p.id = p_post;
$$;
revoke all on function private._post_owner(uuid) from public;
grant execute on function private._post_owner(uuid) to authenticated, service_role;

-- espejo EXACTO de cpost_sel (autor ve lo suyo aunque esté oculto; el resto: visible + _profile_visible)
create function private._can_see_post(viewer uuid, p_post uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.community_posts p
    where p.id = p_post
      and (p.user_id = viewer or (p.visible and private._profile_visible(viewer, p.user_id)))
  );
$$;
revoke all on function private._can_see_post(uuid,uuid) from public;
grant execute on function private._can_see_post(uuid,uuid) to authenticated, service_role;

-- Regla de comentar: ver el post Y (ser el autor, o su gente, o AMBOS adultos).
--  · autor menor  → amigos/gym/él (candado explícito; hoy redundante con la visibilidad, A PROPÓSITO)
--  · viewer menor → solo su gente (candado NUEVO: un menor no se auto-expone ante extraños)
--  · dos adultos que se ven (público/seguidor) → pueden (regla del PO)
create function private._can_comment(viewer uuid, p_post uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select private._can_see_post(viewer, p_post)
     and coalesce((
       select p.user_id = viewer
           or private._are_friends(viewer, p.user_id)
           or private._same_community(viewer, p.user_id)
           or (not private._is_minor(viewer) and not private._is_minor(p.user_id))
         from public.community_posts p where p.id = p_post
     ), false);
$$;
revoke all on function private._can_comment(uuid,uuid) from public;
grant execute on function private._can_comment(uuid,uuid) to authenticated, service_role;

-- ── RLS ──
create policy cc_sel on public.community_comments for select
  using ( user_id = auth.uid() or private._can_see_post(auth.uid(), post_id) );
create policy cc_ins on public.community_comments for insert
  with check ( user_id = auth.uid() and private._can_comment(auth.uid(), post_id) );
create policy cc_del on public.community_comments for delete
  using ( user_id = auth.uid()
       or auth.uid() = private._post_owner(post_id)
       or private._is_moderator(auth.uid()) );
-- SIN policy de UPDATE (no se edita).

-- ── Rate-limit: 10/min (patrón _cm_rate probado en ①) ──
create table public._cc_rate (
  uid uuid not null, minute timestamptz not null, count int not null default 0,
  primary key (uid, minute)
);
create function public._community_comment_rate_limit() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare m timestamptz := date_trunc('minute', now()); n int;
begin
  insert into public._cc_rate(uid, minute, count) values (new.user_id, m, 1)
    on conflict (uid, minute) do update set count = public._cc_rate.count + 1 returning count into n;
  if n > 10 then raise exception 'rate limit exceeded'; end if;
  delete from public._cc_rate where minute < m - interval '10 minutes';
  return new;
end $$;
revoke execute on function public._community_comment_rate_limit() from public, anon, authenticated;
create trigger trg_cc_rate before insert on public.community_comments
  for each row execute function public._community_comment_rate_limit();
revoke all on public._cc_rate from anon, authenticated;
grant all on public._cc_rate to service_role;

-- ── Grants (sin UPDATE; INSERT+SELECT+DELETE; no hay upsert → no aplica la regla de las tres) ──
revoke all on public.community_comments from anon, authenticated;
grant select, insert, delete on public.community_comments to authenticated;
grant all on public.community_comments to service_role;

-- ── RPC del moderador v2: excerpt de comentarios (create or replace del CUERPO COMPLETO de c14,
--    con esta rama añadida ANTES del else) ──
--         when r.context like 'comment:%' then
--           (select left(c.text, 140) from public.community_comments c
--             where c.id::text = split_part(r.context, ':', 2))
```

### Frontend (app-7)

- `_cmtyLoadFeed` gana UNA consulta más: `community_comments` con `.in('post_id', ids)` (asc,
  límite 400) → `CMTY.postComments = {postId: [..]}` (la RLS ya filtra; el `.in` es alcance, no
  seguridad — mismo patrón del feed).
- Cada tarjeta de post (rutina, entreno E hito) gana la fila «💬 N» junto al ❤️; toca → hilo
  expandido bajo la tarjeta: comentarios (handle en **`esc()`**, texto en **`esc()`**, fecha
  `fmtD`), botón borrar donde `cc_del` lo permitiría (mío / post mío), «Reportar» por comentario
  (`community_reports` con `context='comment:<id>'`), input `maxlength=280` + enviar.
- El input se muestra siempre que el post se ve; si el INSERT rebota por RLS (caso menor↔extraño),
  toast honesto: **«Esta publicación no acepta tus comentarios.»** — el cliente NO puede saber con
  certeza si es menor (la fecha vive server-side), así que el estado no-feliz se maneja, no se
  adivina (fail-visible, no fail-broken).
- Escrituras vía `AUTH.client()`, selladas (`_cmtySealed`). Nada en SB_KEYS.
- **`AVI_NEWS`:** entrada («Ahora puedes comentar las publicaciones del muro») → `_verify-news` en
  la misma sesión.

### Checklist de sabotajes K (tx + rollback; TODOS los actores con perfil — trampa 2; sintéticos — trampa 1)

- **K1 debe-PASAR:** adulto extraño comenta el post de un adulto PÚBLICO (regla del PO). Verificar
  que efectivamente pasa — si falla, distinguir FK/policy antes de concluir.
- **K2 debe-BLOQUEAR:** extraño comenta el post de una cuenta privada que no ve → `cc_ins` rechaza.
- **K3 candado explícito de autor-menor, probado load-bearing:** en tx, RE-ENSANCHAR temporalmente
  `_profile_visible` (quitar `not _is_minor` de la rama pública, como en mi sabotaje de §17) de
  modo que el extraño SÍ VEA el post del menor → `_can_comment` DEBE seguir bloqueando el INSERT
  (el doble candado muerde solo). Restaurar y verificar de nuevo el estado sano.
- **K4 debe-PASAR:** amigo del menor comenta su post; compañero de gym también.
- **K5 debe-BLOQUEAR:** MENOR sintético comenta el post público de un adulto DESCONOCIDO → rechazo
  (candado nuevo de comentarista menor).
- **K6 debe-PASAR:** el mismo menor comenta el post de su AMIGO adulto → 200.
- **K7 debe-BLOQUEAR:** insertar comentario con `user_id` de OTRO → `cc_ins`.
- **K8 debe-BLOQUEAR:** el 11º comentario del mismo actor en el mismo minuto → rate limit; los 10
  primeros PASAN.
- **K9 debe-BLOQUEAR:** texto de 281 chars y texto vacío → check.
- **K10 matriz DELETE:** autor del comentario ✓ borra el suyo · autor del POST ✓ borra el
  comentario ajeno en SU post · moderador ✓ borra cualquiera · un TERCERO ✗ (0 filas).
- **K11 SELECT:** quien ve el post ve sus comentarios; quien NO ve el post → 0 comentarios (aunque
  adivine el `post_id`).
- **K12 reporte de comentario:** insert con `context='comment:<uuid real>'` → 200; el moderador ve
  el excerpt del TEXTO del comentario vía `cmty_mod_reports()`; formato inválido → check.
- **K13 XSS (harness UI):** comentario `<img src=x onerror=alert(1)>` → pintado escapado, cero
  jsErrors.
- **K14 cascada:** borrar el POST (autor) → sus comentarios desaparecen (FK); salir de la
  comunidad (borrar perfil) → los comentarios de ese usuario desaparecen (FK a
  community_profiles).

**Harness:** `_verify-comments.mjs` NUEVO (hilo, contador, input, borrar, reportar, XSS K13,
estados vacío/error; aserciones duras) + matriz K por SQL + `_verify-news`.

---

## §8.4 · ÍTEM #5 — PERFIL RICO: agregados seguros (migración `c17_profile_rich.sql` + edge `refresh_snapshot` v5 + UI)

### Decisiones cerradas

1. **Server-side, mismo régimen que `streak_weeks`:** dos columnas nuevas de snapshot en
   `community_profiles` que SOLO estampa la edge (`service_role`): `total_sessions` (int) y
   `training_since` (date, día Bogota de la PRIMERA sesión válida del historial; null sin
   historial). El cliente NO recibe grant de UPDATE sobre ellas — solo SELECT explícito (lección
   c13b, en el DDL, no en un «acordarse después»).
2. **Qué es solo-frontend:** pintar «N entrenos» y «Entrena desde <mes año>» en las tarjetas
   (amigos/gym/descubrir/ajustes propios). Los HITOS ganados: **DESVIACIÓN de mi propio análisis
   (B)** — «pintarlos también en el perfil» se DIFIERE: hoy no existe una pantalla de perfil-ajeno
   donde colgarlos (solo tarjetas de lista) y el muro ya los celebra; forzarlos en una tarjeta de
   lista sería ruido, no perfil rico. Se retoma si/cuando exista una vista de perfil dedicada
   (candidata natural para la sesión del PR piloto #6). El `achievements` (conteo) ya visible cubre
   el hueco mientras tanto.
3. **`training_since` no es un dato nuevo sensible:** es un agregado de antigüedad (mes/año al
   pintar), derivable de la racha + nivel ya públicos; cubierto por el opt-in general (§2 del
   análisis, fila «Nº de entrenos / antigüedad»). La UI pinta MES y AÑO, nunca el día exacto
   (patrón «etiqueta redondeada» de ②: menos precisión = menos patrón reconstruible).

### DDL

```sql
alter table public.community_profiles
  add column total_sessions int not null default 0,
  add column training_since date;
-- Lección c13b EN el DDL: columna nueva que el cliente LEE = grant select EXPLÍCITO, mismo commit.
grant select (total_sessions, training_since) on public.community_profiles to authenticated;
-- SIN grant update: las escribe únicamente la edge (service_role), como streak_weeks/level.
```

### Edge + avi-core + frontend

- **`refresh_snapshot` v5:** `snapshot()` añade `total_sessions = hist.length` y
  `training_since` = día Bogota del `min(date)` válido del historial (null si no hay); van en el
  MISMO `update` que el resto del snapshot. La emisión de hitos y la poda no cambian.
- **avi-core:** el espejo puro `communitySnapshot` gana los mismos dos campos + tests de paridad
  (incluye: historial vacío → `training_since null`; fecha ilegible en una sesión → se ignora, no
  revienta). Helper puro nuevo **`communityTrainingSinceText(dateStr, now)`** → «Entrena desde
  marzo de 2026» o `null` si falta/ilegible/futura (fail-visible-nada, jamás «desde Invalid
  Date» — clase «Hace -1d»/«Infinity días»).
- **UI (app-7):** `cmtyLoad` añade `total_sessions,training_since` a los DOS selects de
  `community_profiles` (el propio y el de `allp`). Tarjetas de amigo/gym/descubrir: la línea de
  stats gana «· N entrenos» (si N>0); la tarjeta propia de Ajustes gana la frase de antigüedad.
  Letra pequeña, sin gráfica, sin kilos — agregados y ya.
- Sin `AVI_NEWS` (se explica sola — decisión declarada, R3.3).

### Checklist de sabotajes P

- **P1 debe-PASAR:** invocar la edge con la cuenta QA (historial fixture conocido) →
  `total_sessions`/`training_since` correctos en la fila (comparar contra el espejo puro).
- **P2 debe-BLOQUEAR:** cliente impersonado `UPDATE community_profiles SET total_sessions=999` →
  `permission denied` (column-level).
- **P3 debe-PASAR CONTRA PROD (no stub — la lección c13b con todas sus letras):** tras el deploy,
  `_verify-community`/`_verify-feed` contra PRODUCCIÓN real: pedir las columnas nuevas con el
  cliente auth REAL no da `permission denied` y la pestaña Comunidad carga entera. Los harness con
  `AUTH.client()` stubbeado NO cuentan para este check.
- **P4 debe-PASAR:** perfil sin historial → `training_since` null → la UI omite la frase (captura
  del estado, no «Invalid Date»).
- **P5 debe-BLOQUEAR:** `select *` de un perfil ajeno sigue fallando (las columnas sensibles de c10
  siguen FUERA del grant; esta migración no reabrió nada) — re-correr el check de c7b/c10.

**Harness:** suite avi-core (paridad snapshot + `communityTrainingSinceText`) + `_verify-feed`/
`_verify-community` extendidos y corridos CONTRA PROD (P3).

---

## §8.5 · ORDEN DE EJECUCIÓN, CORTES Y CICLO

| Orden | Corte | Contenido | Deploy | Por qué aquí |
|---|---|---|---|---|
| 0 | **c13c** (§8.0) | Lockdown UPDATE de posts | Solo nube, SIN bump (patrón `push_sel_own`) | 🔴 vulnerabilidad viva (hito falsificable); se aplica HOY y Opus me reporta M0 de inmediato |
| 1 | **c14** (§8.1) | Moderación: tabla+RPCs+cpost_del v2 + UI coach | App `vNNN` + migración | Requisito moral ANTES de abrir más texto (§5-#1); c16 depende de `_is_moderator` y de `context` |
| 2 | **c15** (§8.2) | `kind='workout'` + nota + rate-limit posts + legal/`LEGAL_V`/`CMTY_CONSENT_V` + AVI_NEWS | App + migración | Ya decidido por el PO; el contenido más frecuente del muro; la nota cierra (A) |
| 3 | **c16** (§8.3) | Comentarios + RPC v2 + AVI_NEWS | App + migración | La apertura del PO entra SOLO con su contrapeso (c14) ya en prod |
| 4 | **c17** (§8.4) | Perfil rico + edge v5 | App + migración + edge | El de menor riesgo; no bloquea a nadie |

- **Un corte = un commit = su migración + su artefacto en `supabase/community/` + su harness**
  (R1.1). Cinco deploys en total (el 0 sin bump). NO se fusionan cortes «para ahorrar deploys»: la
  verificación por corte es lo que hizo funcionar ③/④.
- Migraciones por MCP (`apply_migration`), artefacto versionado = espejo del estado real (patrón
  c1…c13). Cada corte con app: suite antes/después, hook 11/11, bump PAR `?v=`+`CACHE_NAME`, curl +
  `_prodcheck` (R3.1).
- **Ciclo conmigo:** M0 (corte 0) se me reporta de inmediato. Los cortes 1-4 quedan «PENDIENTE
  re-verificación de Fable» y yo verifico el lote completo al final (re-corro las matrices M0/R/W/
  K/P contra prod, con mis propios actores). Si algún sabotaje de Opus NO muerde como está escrito,
  se detiene el corte y se me consulta antes de seguir — no se «interpreta».

## §8.6 · DESVIACIONES DECLARADAS (de mi análisis o del encargo — R4.2)

1. **§8.0 (c13c) no estaba en el análisis:** hallazgo nuevo al verificar la base viva durante esta
   estipulación. Entra como ítem 0 por severidad.
2. **§8.1:** sin «banear de comunidad» (mi §3.1 lo sugería) — reemplazado por borrar-contenido +
   resolver; suspensión global diferida con criterio de disparo explícito. Motivo: un ban sobre
   `visible` es reversible por el baneado (grant), y hacerlo bien es medio arco (columna
   server-only + `_profile_visible` + `_can_dm`).
3. **§8.2:** rate-limit de posts (5/min) es adición mía no pedida — cierra la deuda de c12 (cero
   límite de tasa en `community_posts`) con el patrón ya probado, dos líneas de riesgo.
4. **§8.3:** la regla del PO «comenta cualquiera que ve» se cumple para adultos; los DOS candados
   de menores (autor-menor explícito + comentarista-menor) son míos, bajo la delegación expresa de
   §6-BIS.2. Además: reportar un comentario NO auto-bloquea (a diferencia del reporte de perfil) —
   desproporción, razonado en §8.3.5.
5. **§8.4:** «hitos en el perfil» (mi análisis B) se difiere — no existe superficie de perfil-ajeno
   donde pintarlos sin ruido; el muro ya los celebra. Se retoma con la vista de perfil (sesión #6).
6. **Legal:** un solo bump de `LEGAL_V`/`CMTY_CONSENT_V` en c15 cubriendo entreno+nota+comentarios
   (el texto menciona comentarios un deploy antes de que existan) — dos bumps consecutivos serían
   ruido de consentimiento sin valor probatorio extra.

## §8.7 · RECORDATORIO DE FIXTURES PARA TODA MATRIZ (las 3 trampas, obligatorio releerlas)

1. **Actores 100% sintéticos sin relación previa** para probar UNA rama de visibilidad
   (`auth.users` solo pide `id`; `community_profiles` pide `user_id`+`handle`+`consent_v`).
2. **Perfil para TODOS los actores** que insertan en tablas con FK a `community_profiles`
   (`community_comments.user_id` la tiene) — y verificar que los debe-PASAR efectivamente PASAN
   (si todo falla uniforme, es FK, no policy).
3. **Los triggers reescriben fixtures:** `follows` insertado hacia privado queda `pending` (un
   «seguidor aprobado» se crea insert + UPDATE a `active` como el followee);
   `_community_norm_friendship` fuerza `pending` y `requested_by := auth.uid()` (montar amistades
   BAJO JWT impersonado de una parte, transicionar como la parte correcta, y **SELECT del estado
   real** antes de concluir nada).
