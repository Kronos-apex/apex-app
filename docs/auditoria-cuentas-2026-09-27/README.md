# R14 · Cuentas y servidor — veredicto consolidado (27-sep)

Dos agentes Sonnet (H1 cuentas y servidor · H2 correos y recuperación), cero correos y cero cuentas creadas.
**El orquestador midió cada hallazgo que pesa** contra la base (SQL solo lectura), el código y el DNS.
Los correos van enmascarados en todos los informes (el repo es público; los agentes los escribieron completos
y se enmascararon antes de guardarlos).

## Veredicto en una frase

El servidor está bien construido (las 6 funciones exigen identidad real, lo desplegado coincide con el repo
salvo una función sin consecuencia) y «olvidé mi contraseña» funciona sin caminos sin salida. El problema está
en los **correos de las cuentas**: 9 asesorados entran con direcciones de dominios que no son del PO y que sí
reciben correo, y el login le dice «contraseña incorrecta» a quien solo no confirmó su correo.

## Los hallazgos que quedan en pie (medidos por el orquestador)

### 🔴 1. Nueve asesorados entran con correos de dominios AJENOS que sí reciben correo
- `avi.com` → MX `avi-com.mail.protection.outlook.com`; `apex.com` → MX `apex-com.mail.protection.outlook.com`
  (Microsoft 365 de terceros, `nslookup` 27-sep). `avientrena.com` no tiene correo configurado.
- Asesorados reales (unidad: personas con ficha): **Andrea, Karen, Nadia, Salomón (15 años)** en `apex.com`;
  **Carla, Darío, Elena** en `avi.com`; **Mario y Nayla** (suspendidos). Más las 2 cuentas QA y 2 cuentas
  sin ficha (Valery y Dora Pilar, `@avi.com`).
- «Olvidé mi contraseña» manda el enlace al correo registrado sin mirar el dominio (`AUTH.resetPassword` →
  `resetPasswordForEmail`), y cualquiera puede pedirlo para una dirección que adivine (`nombre@avi.com`): el
  enlace —que abre la cuenta— llegaría al dueño de ese dominio. No se pudo probar que exista el buzón concreto
  (hacerlo exige mandar el correo, prohibido): **se sostiene el riesgo, no un incidente**.
- Hoy nadie lo ha usado: `recovery_sent_at` solo aparece en la cuenta QA (6-sep).
- **La salida ya existe y no la conocía nadie** (hallazgo de H2, verificado): el coach puede cambiar el correo
  y la contraseña de un asesorado desde «Editar asesorado» (`_updateClientAccount` → `coach-create-client`
  modo actualización, `updateUserById`). CLAUDE.md decía lo contrario desde v582 — corregido.

### 🔴 2. «No confirmaste tu correo» se muestra como «contraseña incorrecta» y gasta un intento
- Ni `app-2-login.js` ni ningún módulo reconocen `email_not_confirmed`: cae en «Email o contraseña
  incorrectos» (`app-2-login.js:361`) y cuenta para el bloqueo de 5 intentos / 30 s. No hay botón de
  reenviar la confirmación en ninguna parte.
- Víctimas (unidad: personas): **Elías A.** (registro por correo del 25-jul, nunca confirmó, no volvió) y
  **Lucía Ríos** (15-sep, se atascó con su correo y 76 s después se registró con Google: hoy tiene una
  cuenta viva y una fantasma). Dora Pilar hizo lo mismo (correo → Google en minutos).

### 🟡 3. Eliminar un asesorado desde el panel no le quita el acceso
- `delClient` (`app-3-coach.js:2765`) solo borra la ficha (`UD.deleteClientRow` → `user_data`); la cuenta de
  acceso, sus fotos en el almacenamiento y sus suscripciones de avisos quedan.
- Si se había registrado solo (`selfReg`), su metadata trae el perfil completo y al volver a entrar
  `_enterAuthSession` → `_provisionFreeClient` le **crea una ficha nueva** sin que el coach se entere. Si lo
  creó el coach, el self-heal de cuenta fantasma lo borra al volver (correcto).
- Víctima hoy: **ninguna** (0 carpetas de fotos huérfanas, 0 suscripciones huérfanas salvo la fila `_coach`).

### 🟢 4. `daily-notifs` desplegada (v9) es más vieja que la del repo
- Le falta el CORS de dos orígenes de v657 (verificado leyendo lo desplegado). Sin consecuencia: solo la llama
  el cron desde el servidor con su secreto, nunca un navegador.

## Lo que se TUMBÓ o se CORRIGIÓ
- ⚪ **«Las 3 cuentas de Google sin ficha quedan en un limbo»**: no. El self-heal (`delete-account` modo
  `ghost`) las borra en cuanto esa persona vuelva a intentar; solo siguen porque nunca volvieron.
- ⚠️ **El orquestador se equivocó**: dijo que H1 confundió a Luisa con Elena — son la MISMA persona («Luisa Estela
  Rodríguez Jiménez» en la cuenta, «Elena Romero» en la ficha). Y el briefing repitió la frase falsa de
  CLAUDE.md sobre la contraseña.

## Lo que está SANO (con números)
- `coach-create-client` y `delete-account`: repo = desplegado (carácter por carácter). Solo el coach puede
  crear/actualizar (UID resuelto por JWT); la contraseña espeja `passwordProblem`; captura el consentimiento de
  menores. `delete-account` limpia los 4 almacenes con paginación.
- «Olvidé mi contraseña»: `_verify-reset-pass` 20/20, anti-enumeración real, enlace vencido explicado.
- SMTP propio (Brevo) activo; últimas 24 h de logs de auth: 58 eventos, 0 errores, 0 límites.
- Advisors de seguridad: nada nuevo fuera de los conocidos.

## ✅ Ejecutado el 27-sep
- v679 (correo sin confirmar + dominios ajenos) y v680 (eliminar = quitar acceso) en producción.
- Los 8 asesorados con correo ajeno ya tenían Google conectado: su correo de acceso pasó a ese Gmail (decisión
  del PO, cero correos enviados, respaldo privado fuera del repo). Queda Mario (suspendido), 2 QA y 2 cuentas vacías.

## Decisiones del PO
1. **Los 9 correos ajenos**: cambiarlos (desde «Editar asesorado») por el correo real de cada persona — o, si no
   tiene, por una dirección del PO (`su_gmail+nombre@gmail.com`), así un «olvidé mi contraseña» le llega a él y
   nunca a un tercero. Cada asesorado entra después con el correo nuevo: hay que avisarle. Salomón primero (menor).
2. **Login con correo sin confirmar** (propuesta de H2): decirlo, no gastar el intento y ofrecer «Reenviar
   correo».
3. **Que eliminar a un asesorado le quite también el acceso** (cuenta, fotos y avisos), no solo la ficha.
4. **Una línea en «olvidé mi contraseña»**: *«¿Tu coach te creó la cuenta? Él te puede poner una contraseña nueva.»*
5. **Ver en el panel de Supabase** (Authentication → Email Templates) si las plantillas de recuperación, enlace
   mágico e invitación tienen el diseño de AVI (la bitácora y el backlog se contradicen; no vive en SQL).
6. Menores: redesplegar `daily-notifs` para que coincida con el repo y ampliar `_verify-borrado-cuenta` para que
   suba archivos a los almacenes nuevos antes de borrar.

## Qué NO se miró
- Ningún teléfono real (como en las rondas anteriores).
- Si el buzón concreto (`salomon@…`) existe en esos dominios: solo se puede saber mandando el correo.
- El flujo de «vincular Google» a una cuenta de correo ya abierta.
