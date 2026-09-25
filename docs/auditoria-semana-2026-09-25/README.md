# Auditoría «lo construido esta semana» (12.ª ronda, 25-sep-2026)

Área elegida por el orquestador y aprobada por el PO (*«Arranca»*): las **24 versiones del 21 al 23-sep
(v645 → v668)** que ninguna ronda anterior había revisado — la mudanza a `app.avientrena.com`, las fotos
privadas y lo que sale de la app, y el chat nuevo. Briefing común en `_BRIEFING.md`; informes en
`F1-mudanza.md`, `F2-fotos.md`, `F3-chat.md`.

**Cómo corrió:** 3 agentes `general-purpose` en Sonnet, en paralelo, solo lectura contra producción.
🔴 **Dos de los tres (F1 y F3) se cayeron por el límite de sesión de la cuenta** con el informe en
esqueleto; se **retomaron** con su contexto intacto cuando el límite se renovó (11:30), con la orden de
escribir primero lo que ya tenían. F2 terminó a la primera. Lección para el molde: exigir escribir en el
archivo al cerrar CADA pregunta, y de a 2 agentes si la ronda es pesada.

## Veredicto

Lo construido esta semana **aguanta lo que más importa**: nadie puede ver fotos ajenas (6 ataques
reales bloqueados, con sus controles pasando), borrar una cuenta borra de verdad fotos, chat y tarjeta
pública, las imágenes que se comparten no llevan datos de salud, y la mudanza no pierde datos en el salto
normal. Pero salieron **un hueco de seguridad real en la mudanza**, **avisos duplicados que ya le llegan a
3 personas** y un puñado de defectos de honestidad (cosas que la app dice antes de que sean ciertas).

## Hallazgos, verificados por el orquestador

Cada fila se re-midió contra HEAD (`9dce945`, v668) o contra producción antes de aceptarla. Donde la
severidad del agente no se sostuvo, se dice.

| # | Sev | Qué | Evidencia re-medida | Víctima hoy |
|---|---|---|---|---|
| F1-1 | 🔴 | **Un enlace fabricado puede meter a alguien en una cuenta ajena.** `_aviLlegada` acepta `avi_auth` de cualquier `#avimv=` siempre que el navegador no tenga sesión todavía en el hogar nuevo — no comprueba que la navegación venga del origen viejo. El formato es público (repo público). | `app-1-infra.js:98-120`: la única guarda es `localStorage.getItem('avi_auth')!=null`; `mudanzaKeyAllowed` deja pasar `avi_auth`. Repro local sellado del agente (planta la sesión; el control con sesión propia queda protegido). | Ninguna conocida. Expuesto: todo navegador que aún no haya entrado al hogar nuevo. |
| F1-2 | 🟡 | **Avisos duplicados tras la mudanza.** El candado de v662 que retira el endpoint viejo «del mismo aparato» no está funcionando. | SQL: **3 dueños con 2 filas** en `push_subscriptions`, endpoints distintos — Diana Paola (21 y 23-sep), **Claudia (23-sep y HOY 06:38)** y **el coach (22-sep y HOY 10:50)**. El agente vio solo 1; dos aparecieron hoy. Causa raíz sin cerrar. | Sí: probablemente 2 avisos por envío para Diana Paola y Claudia (el del coach puede ser su 2.º aparato legítimo). |
| F1-3 | 🟡 | **Nada impide dejar las dos direcciones en versiones distintas.** Un `git push` actualiza github.io; el hogar nuevo solo con `publicar-hogar.mjs`, a mano. Como casi todos se están mudando, un arreglo publicado solo en github.io no le llegaría a nadie. | `.github/workflows/` (ci.yml, keepalive.yml): cero referencias a `avientrena`/`vercel`/`prodcheck`. Ya pasó una vez (v659). | No hoy (las dos en v668). |
| F2-1 | 🟡 | **Con la edad VACÍA, el candado de menores no actúa** en la imagen de progreso del coach (`clientProgressStory`) ni en «Compartir este entreno» (`app-4:3622`): `parseInt('')` es `NaN` y el `if` no corre. Y el formulario del coach no exige la edad salvo que se marque el consentimiento. Es el hallazgo #4 de la ronda del 1-sep (A7), todavía abierto. | `avi-core.js:11264-11265`, `app-4-entreno.js:3622`, `app-3-coach.js:282`. SQL: **0 de 27** asesorados sin edad. | No hoy. El agente lo marcó 🔴; se deja en 🟡 por no tener víctima posible hasta que falte una edad. |
| F2-2 | 🟡 | **Subir la foto de perfil no dice dónde se va a usar** (las 3 imágenes que se comparten la ponen a pantalla completa). | `app-4-entreno.js:581,599`: solo «Subiendo foto…» y «Foto de perfil actualizada». **8 de 27** con foto; ningún menor. ⚠️ Corrección al agente: la página pública NO muestra fotos (él mismo lo verificó en `avi_showcase`). | Las 8 personas con foto. |
| F2-3 | 🟡 | **El respaldo local del PC del coach (45 días) guarda fotos y la política no lo menciona.** El de la nube (≈89 días) sí está declarado. | `Desktop/AVI/backups/avi-backup-2026-09-23.json`: **4** cadenas `data:image/…;base64`. `legal/politica-tratamiento-datos.md` §10 no lo nombra. → pregunta 8 del paquete del abogado. | Cualquiera que borre su cuenta. |
| F3-1 | 🟡 | **Una corrección del coach hecha sin señal queda retenida si después se escribe OTRA columna de esa fila** — el «visto» es el disparador más natural (`markCoachRead` escribe el perfil). La regla de v588 compara el `updated_at` de la FILA, que se mueve con cualquier columna. | `avi-core.js:11048-11067` (`coachQueueCanReplay`), `app-1-infra.js:656` (todo update estampa `updated_at`). ⚠️ El agente lo marcó 🔴 «en silencio»: **no es en silencio** — el aviso «⚠️ N sin guardar» se ve y desde v620 se puede descartar; lo que pasa es que la app podría reenviarla sola y obliga a rehacerla. | No medible (la cola vive en el teléfono del coach). |
| F3-2 | 🟡 | **«Esperando respuesta» no se puede apagar sin escribir** (ni «Entendido» ni silencio, a diferencia de `coachPulse`), y cuenta también los mensajes que no piden nada. | `renderAwaitCard` (`app-3-coach.js:4015-4029`) sin salida; 2 de las 4 respuestas rápidas («💪 ¡Entrenamiento hecho!», «🙏 ¡Gracias, coach!») no piden nada. Hoy sale **Claudia**, con «💪 ¡Entrenamiento hecho!». | Sí, hoy 1. **Decisión del PO.** |
| F3-3 | 🟡 | **Foto o video del chat: dice «enviada» y manda el push aunque el mensaje no se haya guardado** — v588 cubrió el texto y no esto. No se pierde (cae a la cola), pero se anuncia antes de ser cierto. | `coachSendMedia` (`app-3-coach.js:4193-4211`) y `clientSendMedia` (`app-4-entreno.js:4422-4440`): `svNow` sin mirar el resultado, push y toast siempre. | No observado (0 archivos huérfanos: 1 objeto = 1 mensaje). |

**Menores (F3/F2, fuera del código):** de los 4 menores, solo Samuel tiene la autorización de su
acudiente registrada; Valery y Sharith tienen `adulto:true` de la versión vieja y Santiago un `consent`
vacío. Medido el 25-sep. Va a la pregunta 1 del paquete del abogado.

## Lo que se verificó y está SANO
- Storage: los 3 buckets privados resisten asesorado↔asesorado, coach↔coach y anónimo (6/6 bloqueados,
  controles pasando). Enlaces firmados de 1 h en las tres superficies. `sw.js` nunca cachea `supabase.co`.
- `delete-account` v8 borra vitrina, push, `app_errors`, los 4 buckets (por páginas) y la cuenta, en ese orden.
- La mudanza: `avi_auth` nunca viaja en `Referer` ni en `app_errors`; un enlace no puede plantar la cola del
  coach ni la bandera de «sin confirmar»; con algo sin subir el salto no ocurre; el reenvío de `media/` funciona.
- Chat: todos los lectores del hilo pasan por la vista filtrada salvo código muerto; el contexto del entreno
  sale por FECHA; «visto» respeta el merge de tres vías; todo se pinta con `textContent`.
- Las 3 imágenes compartibles no llevan % de grasa, peso, medidas ni dolor. Las capturas viejas de la web: 404.

## Qué NO miró esta ronda (candidatas para la siguiente)
- **Ningún teléfono real, otra vez** — ni iPhone instalado, ni el doble aviso en pantalla, ni el salto en un
  Android instalado. Es el hueco que TODAS las rondas declaran.
- `_chatMediaUrls` y el DOM no se limpian en `logout()` (clase v398): necesita navegador.
- `system:true` lo pone solo 1 de 4 generadores de mensajes automáticos (no lo lee nadie hoy; ensucia análisis).
- `_pollAuthCoach`/`_pollAuthClient` notifican sobre el hilo crudo (hipótesis de baja probabilidad).
- `daily-notifs` desplegada sin `conCors` (no la llama el navegador; alinearla la próxima vez que se toque).
- Siguen en el plan: R13 lesiones con Laura · R14 cuentas y servidor · R15 la web en su dominio.
