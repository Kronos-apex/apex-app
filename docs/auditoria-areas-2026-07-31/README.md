# Auditoría profunda por áreas — 2026-07-31

Relanzamiento de la auditoría que el 30-jul murió a 1 de 7 por límite de gasto de la cuenta.
Estado en `avi-v417`, repo limpio, `_prodcheck 417` verde al arrancar.

## Cómo se lanzó (lo que costó aprender)
- Los agentes de `.claude/agents/*.md` **NO son `subagent_type` válidos** → se lanzan con
  `general-purpose` pidiéndoles que **lean su archivo de rol**. Funciona bien.
- **De a pocos, no los 7 de golpe** — así el límite de gasto no se lleva la ronda entera.
- Briefing común vinculante en `_BRIEFING.md`: READ-ONLY, evidencia obligatoria con
  `archivo:línea` o query, sección «intenté tumbarlo así», y **«sospechas sin probar» separadas
  de los hallazgos**. Esa separación es lo que más valor dio.

## Estado: 4 de 7 áreas
| Área | Informe | Estado |
|---|---|---|
| Datos y adopción | (ronda del 30-jul, ejecutada en v416/v417) | ✅ |
| Código y deuda técnica | `A1-codigo.md` | ✅ entregado |
| Base de datos y seguridad | `A2-basedatos.md` | ✅ entregado |
| Plataforma móvil | `A3-movil.md` | ✅ entregado |
| Motor deportivo y nutrición | `A4-deportivo.md` | ✅ entregado |
| **Experiencia y fricción** | — | ⬜ **falta** |
| **Negocio y producto** | — | ⬜ **falta** |

---

## ✅ VERIFICADO POR MÍ (no solo reportado por el agente)

### 1. 🟠 `send-push` y `daily-notifs` no exigen JWT — el candado es una llave PÚBLICA
`verify_jwt:false` en ambas (`list_edge_functions`). El único chequeo compara el header contra
`sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8`, **escrita en claro dentro de la función** y
presente en `app-1-infra.js:115` y `.github/workflows/keepalive.yml:22`. El repo es público
(HTTP 200 sin auth) y el JS se sirve en Pages (HTTP 200).

**Probado en vivo desde fuera del navegador, sin mandarle notificación a nadie** (clientId
inexistente, así el candado se prueba y ningún teléfono suena):
```
con la llave pública →  HTTP 200  {"ok":false,"reason":"no_subscriptions"}   ← la puerta ABRE
sin Authorization    →  HTTP 401  {"error":"Unauthorized"}                    ← único candado
```
`send-push` toma `clientId`/`title`/`body` del cuerpo sin validar y entrega con service role;
**`_coach` es un literal adivinable**. El CORS NO protege (es del navegador; `curl` lo ignora).
Impacto: push con texto arbitrario al celular del coach (phishing creíble) y blast a los
suscritos. **No hay fuga de datos.**

Arreglo: `daily-notifs` con secreto de entorno (~30 min, los cron son ilegibles para el público);
`send-push` pasando `pushToClient` a `AUTH.client().functions.invoke` + `verify_jwt:true` (~2-3 h).
Mismo anti-patrón del gotcha ya escrito (se arregló en `subscribePush` v323, quedó vivo aquí).

### 2. 🔴 El auto-registro NUNCA pregunta por lesiones
`notes:''` escrito a pelo en `_provisionFreeClient` (`app-3-coach.js:407`) y el formulario público
no tiene campo. **Todo el motor de exclusiones por limitación es código muerto para los 13
auto-registrados.** El único asesorado con limitación declarada lo creó el coach a mano.

### 3. 🔴 El filtro lumbar no excluye la FLEXIÓN DE COLUMNA — y la app promete que sí
`GEN_ZONE_EXCL.lumbar` (`avi-core.js:152`) = `/peso muerto|remo con barra|buenos dias|hiperexten|sentadilla/`.
No contiene ningún movimiento de flexión.

Medido corriendo `generarRutinas` (función pura) sobre 5.040 planes con y sin la nota
`"Hernia discal L4-L5..."` — `verificaciones/verif-hernia4.js`:

| | sin nota | con hernia declarada |
|---|---|---|
| planes | 5.040 | 5.040 |
| **flexión de columna entregada** | 1.246 | **1.246** |
| peso muerto/sentadilla/remo (**CONTROL**) | 10.108 | **0** |

El control cae a 0 → **el filtro corre y funciona para lo que cubre**; la flexión no se mueve.
Se cuelan Russian Twist (462), Crunch Abdominal (448), Crunch en Polea (231), Rueda Abdominal (56).
**La cifra está SUBESTIMADA**: la sonda no contó «Elevación de Piernas» por el acento.

Lo que lo vuelve grave: al mismo tiempo `parseLimitations().advice` le afirma al coach
**«Se excluyeron ejercicios contraindicados y se priorizaron variantes seguras.»** Promete una
protección que no dio. Qué movimientos entran en la lista **es criterio de fisioterapia (Laura),
no de programación** — no arreglar solo.

> ⚠️ **Mi PRIMERA medición dijo que el agente estaba equivocado (dio 0) y era MI sonda la que
> mentía**: barrí 108 perfiles con niveles solo capitalizados y mi control no discriminaba, así
> que el cero no probaba nada. Además mi regex tenía 4 falsos positivos («Encogimientos» son de
> trapecio/espalda, no flexión; «Bicicleta Estática» es cardio). **Un control que no puede fallar
> no es un control** — la misma clase de los gates ciegos. Ver `verif-hernia.js` → `verif-hernia4.js`.

### 4. 🟠 Lo del glúteo es de NIVEL, no de sexo — el agente lo enfocó mal
Reportado como «toda mujer principiante recibe cero glúteo, el split femenino no entra hasta
Intermedio». Medido por nivel **y por sexo** (`verificaciones/verif-gluteo.js`):
```
Principiante  F   144 planes → 2 con glúteo (6 series)
Principiante  M   144 planes → 2 con glúteo (6 series)   ← IGUAL a los hombres
Intermedio    F   144 planes → 72 con glúteo (1.796 series)
Intermedio    M   144 planes → 72 con glúteo (726 series)
```
No es sesgo de sexo: la plantilla `FULL_BODY` de principiante no tiene hueco de glúteo **para
nadie**. Y la diferenciación femenina que sí existe **funciona** (2,5× más glúteo de Intermedio
en adelante). Defecto real, encuadre corregido.

### 5. ✅ El coach recibía los avisos de asesorado — CERRADO (decisión del PO)
`daily-notifs` seleccionaba todas las suscripciones sin excluir `_coach`, que tiene **2
dispositivos suscritos** (verificado en `push_subscriptions`, actualizados el 31-jul). Como
`_coach` no tiene fila en `user_data`, `st` era null y caía en las ramas genéricas → los 3 turnos
diarios ×2 aparatos, durante meses. Corrida en seco antes del arreglo: `sent:10, total:10`.
**Decisión del PO: fuera.** Fix escrito (`.neq('client_id','_coach')`) — ver PENDIENTES.

> Matiz: esto explica los **avisos diarios genéricos** duplicados, **NO** los avisos de
> «quiere coach» que el PO reportó el 22-jul (otro texto, otra vía: `send-push`). Ese sigue abierto.

---

## 🔶 REPORTADO y NO verificado por mí (créelo con reserva)

**A2 · base de datos** — modelo de acceso **sano**, probado por el agente impersonando roles:
`anon` no lee nada en ninguna tabla; un asesorado ve 1 fila propia y 0 ajenas; nadie puede
hacerse pasar por coach; respaldos vivos; los 5 cron correctos.
`app_errors` acepta INSERT de cualquiera (probado por cadena de privilegios, no por INSERT real
— la auditoría era read-only); el cron de poda existe pero corre 1×/día, así que entre corridas
no hay tope y la base es Free de 500 MB.

**A1 · código** — suite 488/488; la clase del bug de v416 barrida entera, **queda 1 caso vivo**
(`initPWA()`, `app-2-login.js:1022`). Dos de fondo:
- 🔴 **El coach no tiene ninguna red offline.** `_persistCoachWrite` solo hace `warn()` al fallar y
  `_flushAuthOnline` excluye explícitamente al coach; el próximo arranque pisa `DB.clients` con la
  nube. Asignar una rutina con mala señal → se ve aplicada → el asesorado nunca la recibe.
  El asesorado tiene 4 redes para lo mismo.
- 🟠 **`warn()` es un no-op en producción** (`AVI_DEBUG` es solo localhost): 42 `catch` de fallo de
  red/persistencia no dejan rastro. Arreglo ~3 líneas, `errReportGate` ya escrito y testeado.

**A3 · móvil** — el área menos sana; 4 de 8 hallazgos son de una línea.
- 🔴 **La caché vieja está medida con datos de producción**: `app_errors.build` guarda la versión de
  la caché del teléfono y `src` la del HTML servido; **3 filas donde no coinciden, una con 18
  versiones de desfase** (caché v375 sirviendo HTML v393), y esas 3 son exactamente las 3 caídas
  de Android. Caso de control sin desfase → la medición discrimina.
- 🔴 **`sw.js:19` cree algo falso de sí mismo**: el comentario dice que el `.catch` evita que un 404
  rompa el install, pero `cache.addAll` es **atómico** — un archivo que falle deja la caché
  **vacía**, única combinación capaz de producir el error observado.
- 🟠 `app-6-extra.js:69`: `try{reg.update()}catch{}` no atrapa el rechazo de una promesa → 6 filas
  de «Failed to update a ServiceWorker» de 5 usuarios con la PWA instalada, **una de hoy (Astrid,
  v417)**, que además se comen la cuota de 20 errores/día.
- **Sobre el bug del perfil de coach: la caché vieja queda CONFIRMADA COMO MECANISMO, no como
  prueba del caso concreto.** No hay telemetría del 27-jul del teléfono de Astrid. Deja de ser
  corazonada.
- El agente **se equivocó y lo dejó escrito**: acusó `assetlinks.json` de estar mal ubicado y `curl`
  a la raíz devuelve 200, está bien.

**A4 · deportivo** — **la rutina automática NO es una paliza y la hipótesis de que espanta queda
refutada con datos reales**: de 220 sesiones, las MÁS grandes son las que más se terminan (82% en
las de 31+ series vs 72% en las de ≤15). El problema es el contrario: el plan del principiante es
**el mismo entrenamiento repetido** (1,5 ejercicios idénticos en TODOS los días).
Bonus sin verificar: 6 de 8 planes nutricionales reales son volcados de plantilla con kcal fijas
(una mujer de 56 kg con 3.200 kcal, +1.300 sobre su TDEE; dos que vinieron a perder grasa comen en
mantenimiento) — **son planes que asignó el coach a mano, no salida del motor**.
Y `estimateWorkoutMinutes` promete 38-49 min donde la realidad son 64,7.

---

## ⬜ PENDIENTES QUE DEJA ESTA SESIÓN

1. **Fix del `_coach` ESCRITO Y SIN DESPLEGAR** — `supabase/functions/daily-notifs/index.ts`
   modificado (sin commit, a propósito: el repo no debe decir que algo está desplegado si no lo
   está). Copia local verificada idéntica a la v5 desplegada (mismo commit, escrita 22 min antes
   del deploy). **Bloqueado en `npx supabase login`** — el CLI está instalado (2.111.0) pero sin
   sesión (401 al listar secretos). Con la sesión: `supabase functions deploy daily-notifs` sube
   el archivo tal cual (sin transcribirlo a mano, que es el riesgo real: 370 líneas dentro de una
   llamada MCP) **y** habilita `supabase secrets set` para el secreto de `daily-notifs`.
   Verificación después del deploy: corrida en seco debe pasar de `total:10` a `total:8`.
2. **Faltan 2 áreas**: experiencia y fricción · negocio y producto.
3. Nada de lo demás se ejecutó: **la auditoría fue read-only por diseño.**
