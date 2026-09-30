# BRIEFING COMÚN — auditoría «CUENTAS Y SERVIDOR» (14.ª ronda, R14, 2026-09-27)

Lee este archivo completo antes de hacer nada. Aplica a las 2 áreas (H1, H2).

El encargo del PO se juzga con el criterio de siempre: **«auditorías serias, nada genérico»**. Un informe
lleno de buenas prácticas genéricas se considera FALLIDO aunque esté bien escrito.

---

## Por qué existe esta ronda

Es lo que pasa cuando alguien **entra, se crea o se va** de AVI, y lo que ninguna de las 13 rondas miró a
fondo: la del 5-sep dejó escrito «**No miré `coach-create-client`**»; «olvidé mi contraseña» (v582) se
construyó sin poder comprobar que el correo LLEGUE; `delete-account` ganó 3 almacenes privados en
septiembre (v649-v652) y su prueba de punta a punta no se volvió a correr. Y hoy (27-sep) el PO preguntó
si se puede «infiltrar un virus» en la app: esta ronda es la parte de CUENTAS de esa pregunta.

| Área | Qué cubre | Quién |
|---|---|---|
| **H1** | **Cuentas y servidor**: cómo nace una cuenta (`coach-create-client`, registro propio, Google), quién puede tomar el control de una cuenta ajena, qué queda vivo cuando una persona se borra o el coach la elimina, y si lo desplegado en el servidor es lo que dice el repo. | Andrés Q. (DBA) + Julián (QA estático) |
| **H2** | **Correos y recuperación**: qué ve una persona que olvida su contraseña, que no confirmó su correo o que entra con Google sin terminar; qué le llega (y qué no) por correo; qué salida tiene quien NO puede recibir correos. | Sofía (CS) + Lucas (QA funcional) |

---

## El producto (lo mínimo)

AVI es una PWA de entrenamiento (vanilla JS, `index.html` + `app-*.js` + `avi-core.js`) de Camilo Andrés
(«Andrés Martínez» en público), entrenador en Guaduas. Supabase proyecto **`eoebhrxbokyllqalyecj`**. Vive
en dos direcciones (`kronos-apex.github.io/apex-app/` y `app.avientrena.com`), ambas en **avi-v678**. Auth
real de Supabase (correo+contraseña y Google) + RLS por dueño en `user_data` (`auth.uid()=user_id OR
=coach_id`). Desde v2.0 **el coach NO puede cambiar la contraseña de un asesorado** (vive en Supabase Auth).

## MAPA DE LA SUPERFICIE (verificado contra HEAD hoy)

- `supabase/functions/coach-create-client/index.ts` (desplegada **v5**) · `delete-account/index.ts` (**v8**) ·
  `send-push` (v12) · `daily-notifs` (v9, `verify_jwt:false` a propósito: secreto en BD, v418) ·
  `refresh_snapshot` (v9) · `activate_public_profile` (v3). Las otras 5 con `verify_jwt:true`.
- `app-1-infra.js`: objeto `AUTH` (≈línea 540: `signUpEmail`, `signInEmail`, `signInGoogle`,
  `sendMagicLink`, `resetPassword`, `updatePassword`), `window._aviRecovery` (marca del enlace de recuperación).
- `app-2-login.js`: `doLogin` (≈línea 300-350; `loginFailIsNetwork`, bloqueo de 5 intentos/30 s),
  el modal `#m-newpass` (v582) y `openNewPassModal`.
- `app-3-coach.js`: alta del coach (`saveClient`, ≈línea 260-340), `_provisionFreeClient` (≈630),
  `_enterAuthSession`, `delClient`.
- `docs/email-templates/` (solo `confirm-signup.html` tiene diseño de marca) · `legal/`.
- Harnesses que YA existen: `_verify-reset-pass.mjs` (espía AUTH, cero correos), `_probe-delete-account.mjs`,
  `_verify-borrado-cuenta.mjs` (ESCRIBE: crea y borra una cuenta desechable — **no lo corras tú**, ver reglas),
  `_verify-rls-aislamiento.mjs` (acceso cruzado con las cuentas QA).

---

## BASELINE MEDIDO HOY (27-sep) — créelo, NO lo vuelvas a medir

### Cuentas (unidad: filas de `auth.users` salvo que se diga otra cosa)
- **37 cuentas** de acceso · por proveedor: **20 correo** y **17 Google** · **2 sin confirmar** · **3 nunca
  entraron** · **13 entraron en los últimos 30 días**.
- **30 fichas** en `user_data` (2 de rol coach, 28 de asesorado) · **18** con `profile.selfReg=true` ·
  **0 fichas sin cuenta** · **7 cuentas SIN ficha**:

| uid (8) | correo (enmascarado) | proveedor | creada | último ingreso | confirmada | trae datos del asistente |
|---|---|---|---|---|---|---|
| (uid de un asesorado) | oculto@gmail.com | google | 2026-06-09 | 2026-06-09 | sí | no |
| (uid de un asesorado) | oculto@gmail.com | google | 2026-06-23 | 2026-06-23 | sí | no |
| (uid de un asesorado) | oculto@avi.com | email | 2026-07-02 | 2026-07-07 | sí | no |
| (uid de un asesorado) | oculto@gmail.com | google | 2026-07-06 | 2026-07-06 | sí | no |
| (uid de un asesorado) | oculto@gmail.com | email | 2026-07-25 | nunca | **no** | sí |
| (uid de un asesorado) | oculto@avi.com | email | 2026-09-11 | nunca | sí | no |
| (uid de un asesorado) | oculto@hotmail.com | email | 2026-09-15 | nunca | **no** | sí |

### Dominios de correo (unidad: cuentas de acceso)
| dominio | cuentas | con ficha | entraron en 30 días | por correo |
|---|---|---|---|---|
| gmail.com | 22 | 18 | 5 | 5 |
| **apex.com** | **7** | 7 | **4** | 7 |
| **avi.com** | **6** | 4 | **4** | 6 |
| hotmail.com | 1 | 0 | 0 | 1 |
| outlook.com | 1 | 1 | 0 | 1 |

⚠️ **PISTA del orquestador, NO un hallazgo:** `avi.com` y `apex.com` **no son dominios del PO** (su dominio es
`avientrena.com`; `avi.com` se comprobó «tomado» el 22-sep). 2 de las 7 de `apex.com` son las cuentas QA de
los harnesses (`qa-harness@`, `qa-coach@`). Si una de esas direcciones pide «olvidé mi contraseña», el enlace
va al correo de ESE dominio. Hay que medir: quiénes son, si esos dominios reciben correo (registros MX), qué
hace exactamente Supabase y qué hace la app — **sin disparar nunca un correo**.

### Correos (unidad: marcas de tiempo en `auth.users`)
- `auth.audit_log_entries` está **VACÍA**: los eventos de acceso solo viven en los LOGS del servicio auth
  (`query_logs`, retención corta). Una consulta a la tabla que diga «0 correos» NO prueba nada.
- `recovery_sent_at`: **1 sola cuenta en toda la historia** — la QA (`9418640a…`), el 6-sep 20:03 (la prueba de
  v582 contra el servidor). O sea: **ningún asesorado real ha pedido nunca recuperar su contraseña**.
- `confirmation_sent_at` en los últimos 120 días: **7** envíos, **5 confirmaron**, **2 no** (25-jul y 15-sep, las
  dos de la tabla de arriba).

### Almacenamiento (unidad: objetos en `storage.objects`)
`apex-photos` privado 0 · `avatars` **público** 2 (63 kB) · `chat-media` privado 1 · `progress-photos` privado 21
(921 kB). **0 carpetas huérfanas**: toda carpeta tiene cuenta y ficha.

---

## FALSOS POSITIVOS CONOCIDOS (no los reportes como hallazgo)
1. **El advisory `rls_disabled`** sobre `_cm_rate`/`_cpost_rate`/`_cc_rate`: sin GRANTS, la RLS es irrelevante (medido 30-jul).
2. **`auth_leaked_password_protection`**: es solo del plan Pro; decidido no pagarlo. Ignorar.
3. **`daily-notifs` con `verify_jwt:false`**: a propósito, su secreto vive en la BD (v418; la anon key da 401).
4. **La anon key pública** en el JS: es por diseño; la protección es la RLS.
5. **`coach_id` y `profile.tier` los escribe el cliente** (F7): conocido; es hallazgo solo si algo NUEVO los usa de candado.
6. **«El login por correo no tiene el self-heal de cuenta fantasma»**: TUMBADA el 6-sep (es la misma función).
7. **El bucket `avatars` es público**: decisión (solo Comunidad, 2 objetos).
8. **Comunidad está CONGELADA**: no se proponen features; sí se reportan huecos de SEGURIDAD.

## Qué es un hallazgo SERIO
- Alguien puede entrar a una cuenta que no es suya, o dejar a alguien sin poder entrar a la suya — con la
  cuenta concreta, el camino exacto y lo que hay dentro (¿es un menor? ¿entrena?).
- Algo que la persona hizo por sí misma (borrarse, pedir recuperación) y no pasó, o pasó a medias.
- Una promesa escrita que no se cumple (texto exacto y dónde vive).
- Lo desplegado en el servidor no es lo que dice el repo.
- Una medición que contradice el baseline.

**Tumba tus propios hallazgos antes de escribirlos, y escribe cómo lo intentaste.** Las pistas del
orquestador son hipótesis: en rondas anteriores varias las tumbaron los agentes.

## REGLAS DURAS
1. 🔒 **SOLO LECTURA contra producción.** `SELECT` y `query_logs` sí; escribir, migrar, invocar edge functions o
   desplegar: jamás. Son datos de personas reales.
2. 📧 **CERO CORREOS Y CERO CUENTAS.** Nunca llames a `/auth/v1/recover`, `/otp`, `/signup`, `resetPassword`,
   `sendMagicLink` ni `signUpEmail` de verdad: un correo puede llegarle a un asesorado real **o al dueño de un
   dominio ajeno**. En el navegador, **espía** esos métodos (patrón de `_verify-reset-pass.mjs`). Consultar DNS
   (`nslookup -type=mx dominio`) sí se puede: es una lectura pública.
3. 🔒 **Nada que escriba**: `_verify-borrado-cuenta.mjs` crea y borra una cuenta en producción — si crees que
   hay que correrlo, escríbelo en tu informe y lo corre el orquestador.
4. 🔒 **NO toques el código del repo.** Cero ediciones fuera de tu informe. Scripts de medición en `%TEMP%`.
5. 🔒 Cada hallazgo lleva `archivo:línea`, la consulta con su resultado o la salida del comando. Correos
   SIEMPRE enmascarados en el informe (`oculto@avi.com`); nombres de asesorados sí (el PO los conoce).
6. ⚠️ **Toda medición lleva control de discriminación y de cobertura.** Un cero sin control no vale
   (recuerda: la tabla de auditoría de auth está vacía por diseño). Nombra la UNIDAD de cada cifra.
7. ⚠️ **El navegador es SOLO de H2** (puertos 8890-8899 / 9440-9449). H1 trabaja por código, SQL y DNS. No
   corras matrices de sabotaje (mutan archivos que el otro agente está leyendo).

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)
**Crea tu archivo con el esqueleto ANTES de investigar, y escribe en él CADA VEZ QUE CIERRES UNA PREGUNTA** —
no al final. En las dos rondas anteriores varios agentes se cayeron por el límite de uso de la cuenta y todo lo
que no estaba escrito se perdió.

Tu archivo: `docs/auditoria-cuentas-2026-09-27/H1-cuentas-servidor.md` o `H2-correos-recuperacion.md`.

```
# <código> · <área> — <tus nombres de rol>
## Veredicto en una frase
## Los 3 más grandes
   (qué es · a quién le pasa HOY, con nombre · evidencia · cómo intenté tumbarlo · qué costaría arreglarlo)
## Todos los hallazgos (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿víctima hoy?)
## Respuesta a las preguntas del orquestador (una por una: CIERTA / FALSA / NO SE PUDO MEDIR)
## Lo que verifiqué y está SANO (con números)
## Lo que tiene que correr o decidir el orquestador / el PO
## Sospechas sin medir
## Qué NO miré y por qué
```

Última respuesta: máximo 15 líneas. Español de Colombia, lenguaje de producto: el PO es entrenador.
