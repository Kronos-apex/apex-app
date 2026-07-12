# 📧 Plantillas de correo de AVI (Supabase Auth)

> Nace de un caso real (2026-07-12): un usuario vio el **enlace de confirmación crudo y
> larguísimo** de Supabase, le dio **miedo** (parecía phishing) y **no abrió la app**. No era
> un problema de seguridad — era de **confianza/percepción**. Fix: correos de MARCA con botón
> grande (el usuario nunca ve el muro de caracteres) + copy que tranquiliza (tono Sofía).

## Cómo aplicar (Camilo — 2 min, sin código, sin deploy)
1. Supabase → tu proyecto → **Authentication → Email Templates**.
2. Pestaña **"Confirm signup"** → borra el HTML actual → pega el de `confirm-signup.html`.
3. (Opcional pero recomendado) subir el **"Subject"** a algo cálido:
   `Confirma tu cuenta en AVI 💪` (en vez de "Confirm your signup").
4. **Guardar.** Probá creando una cuenta de prueba y mirá cómo llega el correo.

> El botón usa la variable `{{ .ConfirmationURL }}` (el enlace real de Supabase). El usuario
> ve el BOTÓN, no la URL. Hay un enlace de respaldo discreto abajo, con una nota que **educa**:
> "es normal que sea largo, así son los enlaces de seguridad" → para que no asuste.

## Pendiente (para consistencia — mismas mejoras a las otras plantillas)
- [ ] **Confirm signup** — ✅ diseñada (`confirm-signup.html`)
- [ ] Magic Link · Reset Password · Change Email · Invite — mismo tratamiento de marca (TODO)

## Opción MÁS fuerte (a futuro, requiere tocar el flujo de la app)
En vez de un ENLACE, mandar un **código de 6 dígitos** (`{{ .Token }}` de Supabase) que el
usuario escribe en la app → **no hay enlace que dé miedo**. Es lo que hacen muchas apps
modernas. Cuesta un poco más (pantalla de código en el registro + `verifyOtp` en el cliente),
pero elimina el problema de raíz. Evaluar cuando se trabaje el onboarding.
