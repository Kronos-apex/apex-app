# Plan de correcciones — Auditoría profunda 2026-07-13

> **Documento VIVO y estipulado.** Lo escribió la sesión de auditoría (Fable) tras revisar
> el trabajo reciente (programa premium v329→v349, modales, login, habitaciones, hábitos,
> push, chat, nube). **La sesión que corrige (Opus) ejecuta EXACTAMENTE lo estipulado aquí**
> y marca cada checkbox al terminar. Después, una sesión de verificación (Fable) audita el
> resultado con el protocolo de la sección final. No improvisar alcance.

## Estado de línea base (auditado 2026-07-13, avi-v349)

- Suite unit: **312/312** verde · Hook: **11/11** OK · `_verify-modals.mjs`: **12/12**
- Producción: `_prodcheck.mjs 349` verde (arranca limpio, cero errores JS)
- Nube: policies de `push_subscriptions` completas (INS+SEL+UPD, fix v324 en pie);
  `SB_KEYS` ⊇ `_COACH_SETTINGS_KEYS` consistente; advisors sin hallazgos nuevos graves.

---

## 🛡️ REGLAS PARA LA SESIÓN QUE CORRIGE (obligatorias)

1. **Leer primero** `CLAUDE.md` completo (DOCTRINA + GOTCHAS VIGENTES) y `docs/metodologia.md`.
2. **Un hallazgo = un commit.** Prohibido mezclar fixes o "aprovechar" para refactors no estipulados.
3. **Edit tool o python utf-8** — jamás perl/sed (tildes/emojis se corrompen en Windows).
4. Suite (`node avi.test.js`) **antes y después** de cada fix. Hook corre solo al commitear.
5. Los tests de regresión estipulados **deben fallar sin el fix y pasar con él** (probarlo).
6. Al terminar TODOS los fixes de código: **UN solo deploy** con bump del PAR `?v=350`
   (index.html, TODAS las referencias `?v=`) + `CACHE_NAME` `avi-v350` (sw.js), curl a Pages
   y `node scripts/e2e/_prodcheck.mjs 350`. Nunca "debería estar ya".
7. Marcar aquí cada checkbox y dejar hito en `docs/bitacora.md`. NO tocar el backlog de
   CLAUDE.md salvo lo estipulado en C6.
8. Si algo de lo estipulado resulta imposible o revela un problema mayor: **PARAR y
   documentarlo aquí** (sección "Desviaciones"), no inventar un fix alternativo en silencio.

---

## 🔴 C1 — Botón "Aplicar →" de la lista de plantillas ROTO (bug real, reproducido)

- [x] corregido · [x] test de regresión · [x] verificado — commit `ca50c67` (suite 313)

**Problema (producto):** en el panel Plantillas (`#p-templates`), cada tarjeta tiene el botón
rápido **"Aplicar →"** en su encabezado. Al tocarlo **no pasa nada** (error silencioso en
consola). El coach solo puede aplicar plantillas expandiendo la tarjeta y usando el botón
grande "📋 Aplicar a un asesorado →" (ese sí funciona).

**Causa raíz:** `app-2-login.js:436` (dentro de `renderTemplates()`):

```js
onclick="event.stopPropagation();applyTemplateToClient(tpl.id ?? '${tpl.id}')"
```

El template literal interpola el segundo `${tpl.id}`, pero deja el primer `tpl.id` **crudo**
en el atributo onclick. Los onclick inline se evalúan en scope global, donde `tpl` no existe
→ `ReferenceError: tpl is not defined` ANTES de que el `??` pueda actuar (semántica JS
verificada: el fallback nunca se alcanza). Parece el residuo de un intento de fallback que
no puede funcionar por diseño.

**Fix estipulado (quirúrgico, 1 línea):** dejarlo igual al botón hermano que sí funciona:

```js
onclick="event.stopPropagation();applyTemplateToClient('${tpl.id}')"
```

**Test de regresión estipulado:** agregar a `avi.test.js` un test estático (la suite corre en
Node y puede leer archivos): leer `app-2-login.js` + `app-3-coach.js` + `app-4-entreno.js` +
`app-5-salud.js` + `app-6-extra.js` y afirmar que **ningún atributo `onclick="` contiene un
identificador local crudo con el patrón `?? '${`** (regex sugerida: `/\?\?\s*'\$\{/`).
Eso mata la CLASE de bug (interpolación a medias en onclick), no solo la instancia.
⚠️ El hook (check 11) exige que el conteo de tests NO BAJE — con este test la baseline sube
a 313: actualizar `_baseline.txt` si el hook lo exige (ver cómo lo hace el check).

**Verificación:** suite ≥313 verde · `grep -n "?? '\${" *.js` → 0 resultados ·
en la app local: login coach QA → Plantillas → tocar "Aplicar →" abre el selector de asesorado.

---

## 🟡 C2 — El buscador de asesorados se borra solo cada 15 segundos

- [x] corregido · [x] test de regresión · [x] verificado — commit `ee21c7d` (_verify-v317 +4 checks)

**Problema (producto):** el coach escribe en el buscador de `#p-clients` para filtrar; si en
ese momento llega el poll de sincronización (cada 15 s) o un mensaje, la lista se re-renderiza,
**el texto del buscador desaparece y el filtro se pierde**. Con el orden inteligente (v317)
además la lista se reordena bajo sus dedos. Conocido desde v317 (aviso Lucas), aún vivo.

**Causa raíz:** `renderClients()` (`app-3-coach.js:31`) limpia el input incondicionalmente:
```js
const searchEl=document.getElementById('cli-search');if(searchEl)searchEl.value='';
```
y ninguno de sus callers distingue "navegación a panel" de "refresh del poll". Callers
auditados: poll (`app-1-infra.js:686` y `:569`), `renderAll()` (`app-2-login.js:1110`),
borrado de cliente (`app-3-coach.js:1257`, `app-6-extra.js:2322,2333`).

**Fix estipulado (causa, no síntoma):**
1. En `renderClients()`: **NO tocar el input**. Capturar `searchEl.value` al inicio y, tras
   reconstruir la lista, si hay término → re-aplicar `filterClients(term)` (ya existe,
   `app-3-coach.js:4`, opera sobre el DOM recién creado).
2. La limpieza del buscador pasa a la **navegación**: en `gp()` (definida en app-2-login.js,
   mapa de paneles en `:1225`), al ENTRAR a `p-clients` limpiar `#cli-search` ANTES de
   renderizar. Así: navegar = lista fresca; poll = conserva término y filtro.
3. No tocar nada más de `renderClients` (zona con orden inteligente v317 testeado).

**Test de regresión estipulado:** extender `scripts/e2e/_verify-v317.mjs` (patrón
preview-SIN-login que ya inyecta asesorados fake y llama `renderClients()` directo — cero
rate-limit): (a) fijar `#cli-search.value='mar'` + `filterClients('mar')`, (b) llamar
`renderClients()` otra vez (simula el poll), (c) afirmar que el input sigue diciendo `mar`
y que los `.cli` no coincidentes siguen `display:none`. Debe fallar sin el fix.

**Verificación:** harness extendido verde · manual: filtrar, esperar >15 s con la app viva,
el filtro sigue.

---

## 🟡 C3 — Código muerto: `openGuidedMode` y la rama overlay del guiado

- [x] corregido · [x] verificado — commit `6f8af92` (guiado 53/53, coach-back 20/20, modales 12/12). Ver Desviaciones.

**Problema:** desde que murió la clásica (F5, avi-v291) `openGuidedMode` (`app-6-extra.js:190`)
no tiene NINGÚN caller (auditado hoy: solo comentarios lo mencionan). La DOCTRINA §3 prohíbe
acumular código muerto; ya estaba en backlog. Es zona caliente (navegación/atrás), por eso se
estipula con red de seguridad completa.

**Fix estipulado:**
1. Borrar `openGuidedMode` completa.
2. En `closeGuidedMode` y `_aviCloseTopOverlay`: borrar SOLO la rama del overlay que
   únicamente `openGuidedMode` podía activar (leer los comentarios en `app-6-extra.js:210,261,593`
   para delimitarla). Si al leerla la rama resulta compartida con el guiado embebido → NO
   borrarla y documentar aquí la desviación.
3. Actualizar los comentarios que lo citan y quitar el item del backlog de CLAUDE.md.

**Verificación:** `grep -rn openGuidedMode *.js index.html` → 0 · suite verde ·
`node scripts/e2e/_guiado-suite.mjs` → **53/53** · `node scripts/e2e/_test-coach-back.mjs`
→ **20/20** (ambos obligatorios: atrás/overlays es la zona que toca).
⚠️ Gotchas de harness: limpiar Chromes huérfanos antes
(`Get-Process chrome | Where-Object {$_.MainWindowTitle -eq ''} | Stop-Process -Force`) y
respetar el rate-limit de login QA (~2 min entre corridas; sondear con el POST del README e2e).

---

## 🟡 C4 — Lookup de ejercicios hereda del prototipo (hallazgo Julián v315, aún vivo)

- [x] corregido · [x] test de regresión · [x] verificado — commit `419853d` (setPrototypeOf null; suite 314)

**Problema:** `EX_IMG_NAME[nf(e.name)]` (`app-1-infra.js:1230` en `exImgSrc` y `:1249` en
`exVidSrc`; revisar también `exIcon` por el mismo patrón) usa acceso directo a objeto literal:
un ejercicio custom llamado `constructor`, `__proto__`, `toString`, etc. resuelve a un miembro
del prototipo → src de imagen basura (404 inofensivo hoy, pero es la clase de bug que un día
deja de ser inofensiva).

**Fix estipulado:** en los puntos de lookup por nombre, exigir propiedad propia:
```js
const id=(e.id&&EX_IMG_IDS.has(e.id))?e.id:(Object.hasOwn(EX_IMG_NAME,nf(e.name))?EX_IMG_NAME[nf(e.name)]:'');
```
(o convertir `EX_IMG_NAME` a `Object.create(null)` en su construcción — elegir UNA vía y
aplicarla a TODOS los lookups por nombre del mismo mapa; documentar cuál).

**Test de regresión estipulado:** si `exImgSrc`/`exVidSrc` son alcanzables desde la suite
(viven en app-1, no en avi-core — verificar cómo la suite carga módulos), test directo con
`{name:'constructor'}` → `''`. Si no son alcanzables: test estático que afirme que todo
`EX_IMG_NAME[` va precedido de `Object.hasOwn` (o que el mapa nace de `Object.create(null)`).

**Verificación:** suite verde con el/los tests nuevos · crear en la app un ejercicio custom
llamado `constructor` → no rompe el render (icono fallback, sin src basura).

---

## 🟢 C5 — CLAUDE.md desactualizado: nota de seguridad de `push_subscriptions`

- [x] corregido — junto con este bloque de checkboxes (docs)

**Problema:** la tabla "🔒 SEGURIDAD — ESTADO ACTUAL" y la sección de estado de auth dicen
`⚠️ push_subscriptions solo-escritura para anon (tradeoff… follow-up = mover a autenticado)`.
**Ya no es cierto** (verificado hoy contra `pg_policies` en producción): la tabla tiene
`push_ins_own` + `push_upd_own` + `push_sel_own`, todas para `authenticated`. El follow-up
se cumplió (v320-v324) y el doc quedó atrás — contexto falso para la próxima sesión.

**Fix estipulado:** actualizar esa línea de CLAUDE.md a:
`✅ push_subscriptions con RLS propia (INS/UPD/SEL solo authenticated, policy *_own) — fix raíz 2026-07-12`.
Commit `docs:` separado. Nada más de CLAUDE.md se toca (salvo lo que C3 estipula).

---

## 🟢 C6 — Cohesión menor de diseño (OPCIONAL — solo si Camilo lo pide)

- [x] decidido por Camilo: **SÍ** (2026-07-13, "terminar todo lo de interfaz antes del Coach Inteligente") — **EJECUTADO en avi-v351** con skill emil-design-eng: C6.1 `transition:all` erradicado (36, commit `fe9c817`) · C6.2 gráficas SVG conscientes del tema, tokens `--chart-g/--chart-or` (`47aac34`) · C6.3 últimos 7 `.eico` emoji → SVG (`2ecf97f`). Verificación visual ambos temas (rooms + history). Ver bitácora parte 56.

Deuda estética consciente, NO bloqueante. Se lista para que Camilo decida si vale una sesión:
1. **20 `transition:all` en styles.css** contradicen la regla FASE 0 ("animar solo
   transform/opacity"; la propia `.exc` y `#toast` la violan). Migrar solo los de componentes
   interactivos a propiedades explícitas con `--dur/--ease-out`, con shots antes/después
   ambos temas. Riesgo bajo pero es un barrido — no hacerlo "de pasada".
2. **Colores hardcodeados en SVGs del DOM** (`#0A7C5B`, `#B0B0B0` en `drawExProgChart`/
   `renderVolChart`, `#E76F51` en `miniSparkline`, `_planStyle` `#FBF4DC/#9A7B16/#1a4a7a`):
   los SVG inline SÍ heredan tokens CSS → `var(--g)`, `var(--t3)`, `var(--or)`. Verificar
   contraste en dark antes de dar por hecho.
3. **`.eico` emoji en rutinas del asesorado** (🏋️/✨/📋) — diferido a propósito en v337;
   sigue siendo decisión estética de Camilo.

---

## 🚫 FUERA DE ALCANCE de la sesión que corrige (decisiones de Camilo, NO tocar)

- **Coach Inteligente**: bloqueado por 5 decisiones de producto (§9 de `docs/plan-coach-inteligente.md`).
- **"Programar notificaciones" del coach es poco confiable** (dispara por `setTimeout` solo
  con la app abierta): la decisión honesta es de producto — etiquetarla "requiere app abierta"
  o moverla a server-side. Camilo decide; no parchear.
- **Fotos/avatares a Storage rotos**: decisión vigente 2026-07-12 = re-arquitectura bien hecha
  cuando se trabaje el módulo de fotos. No aflojar policies.
- **Supabase → Auth → leaked-password protection**: sigue APAGADA (advisor lo confirma hoy).
  Es un toggle del Dashboard que debe hacer **Camilo** (2 minutos). Recordárselo.
- **Adopción de push**: producto (copy/momento del permiso), no defecto.
- Advisors menores aceptados: `app_errors` INSERT abierto (telemetría, tradeoff consciente),
  `pg_net` en schema public (WARN heredado), doble policy DELETE en `user_data` (own+coach,
  by design).

---

## ✅ PROTOCOLO DE VERIFICACIÓN (para la sesión Fable posterior)

Correr en orden; TODO debe pasar antes de dar el trabajo por bueno:

1. `git log --oneline` — commits atómicos, uno por hallazgo, sin refactors colados.
2. `git diff 6028804..HEAD -- '*.js' '*.css' index.html sw.js` — leer el diff
   (`6028804` = HEAD al momento de la auditoría, avi-v349 + docs del Coach Inteligente) —
   COMPLETO buscando scope creep (cambios no estipulados = rechazar).
3. `node avi.test.js` → **≥313/313** (C1 sube la baseline; +C4 si agregó tests).
4. `python scripts/hooks/pre-commit` → 11/11.
5. C1: `grep -n "?? '\${" *.js` → 0 · repro manual/harness del botón "Aplicar →".
6. C2: `node scripts/e2e/_verify-v317.mjs` verde con los checks nuevos del buscador.
7. C3: `grep -rn openGuidedMode` → 0 · `_guiado-suite.mjs` 53/53 · `_test-coach-back.mjs` 20/20.
8. C4: test de regresión presente y verde; probar que FALLA al revertir el fix (git stash).
9. `node scripts/e2e/_verify-modals.mjs` → 12/12 (los fixes no tocan modales; regresión general).
10. Deploy: curl a Pages con `?nocache` confirma `?v=350` · `node scripts/e2e/_prodcheck.mjs 350` verde.
11. `docs/bitacora.md` con el hito · checkboxes de este doc marcados · C5 aplicado en CLAUDE.md.

## Desviaciones (llenar por la sesión que corrige, si las hay)

**C3 — alcance acotado a lo estipulado (Opus, 2026-07-13).** Borré `openGuidedMode`
(cero callers) y SU rama exclusiva de cierre en `_aviCloseTopOverlay` (app-2-login.js:
`#guided-mode` visible-sin-`gm-embedded`, estado que sólo `openGuidedMode` producía —
verificado: nada más quita `hidden` sin poner `gm-embedded`). **NO** toqué las ramas
`else` de `if(_gmIsEmbedded()){…}else{…}` que quedan en funciones VIVAS (`closeGuidedMode`
tail, `gmChangeMood` :592-593, etc.): son fallbacks DEFENSIVOS guardados por condición,
no código huérfano comentado, y removerlos era un refactor MÁS ancho que lo estipulado
(rule 2: un hallazgo = un commit, sin refactors colados; rule 8: parar y documentar).
Quedan como oportunidad de limpieza futura si se decide retirar del todo el modo overlay.
Harnesses de la zona caliente verdes tras el cambio: `_guiado-suite` 53/53,
`_test-coach-back` 20/20, `_verify-modals` 12/12.
