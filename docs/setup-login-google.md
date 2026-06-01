# Fase 1 — Configurar Login con Google (y Email) en APEX

> Guía para Andrés. Son clics en TUS cuentas (Google Cloud + Supabase). El código de la
> app lo conecta Claude después de que esto quede configurado. No se programa nada aquí.

## Datos que vas a necesitar (cópialos)
- **URL de la app:** `https://kronos-apex.github.io/apex-app/`
- **URL de callback de Supabase (la que pide Google):**
  `https://eoebhrxbokyllqalyecj.supabase.co/auth/v1/callback`

---

## PARTE 1 — Crear las credenciales en Google Cloud

1. Entra a **https://console.cloud.google.com** con tu cuenta de Google.
2. Arriba, crea un proyecto nuevo (botón del selector de proyectos → "Proyecto nuevo").
   Nómbralo, por ejemplo, **APEX**. Espera a que se cree y selecciónalo.
3. Menú ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** → Crear.
   - Nombre de la app: **APEX**. Correo de asistencia: tu correo. Datos de contacto del
     desarrollador: tu correo. Guardar y continuar.
   - En "Permisos/Scopes": deja los básicos (`.../auth/userinfo.email` y `userinfo.profile`).
     Son **no sensibles** → no requieren verificación de Google. Guardar y continuar.
   - Usuarios de prueba: agrega tu propio correo (y los de quien vaya a probar) **mientras esté
     en modo prueba**. Guardar.
4. Menú → **APIs y servicios** → **Credenciales** → **+ Crear credenciales** → **ID de cliente
   de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: **APEX Web**.
   - **Orígenes autorizados de JavaScript**, agrega:
     - `https://kronos-apex.github.io`
     - `http://localhost:3000` *(opcional, para pruebas locales)*
   - **URIs de redireccionamiento autorizados**, agrega EXACTAMENTE:
     - `https://eoebhrxbokyllqalyecj.supabase.co/auth/v1/callback`
   - Crear.
5. Google te muestra el **ID de cliente** y el **Secreto de cliente**. **Cópialos** (los
   pegas en Supabase en la Parte 2). Puedes volver a verlos luego en Credenciales.

---

## PARTE 2 — Conectar Google en Supabase

1. Entra a **https://supabase.com/dashboard** → tu proyecto **APEX** (`eoebhrxbokyllqalyecj`).
2. Menú izquierdo → **Authentication** → **Providers** (o "Sign In / Providers").
3. Busca **Google** → actívalo (toggle) y pega:
   - **Client ID** = el ID de cliente de Google.
   - **Client Secret** = el secreto de cliente de Google.
   - **Save**.
4. En **Authentication** → **URL Configuration**:
   - **Site URL:** `https://kronos-apex.github.io/apex-app/`
   - **Redirect URLs** (agregar): `https://kronos-apex.github.io/apex-app/`
     *(y `http://localhost:3000` si vas a probar local).*
   - Guardar.

---

## PARTE 3 — Activar Email (enlace mágico)

1. En **Authentication** → **Providers** → **Email**: asegúrate de que esté **activado**
   (suele venir activo). Deja activada la opción de **Magic Link**.
2. Nota: el correo de prueba de Supabase tiene límite de envíos. Para producción, más adelante
   conviene conectar un servicio de correo propio (SMTP) — lo vemos cuando crezca el uso.

---

## PARTE 4 — Pasar a producción (cuando ya quieras abrirlo a cualquiera)
- En la **Pantalla de consentimiento de OAuth** de Google, mientras esté en **"Prueba"** solo
  pueden entrar los correos que agregaste como usuarios de prueba.
- Cuando estés listo para el público, dale **"Publicar app"**. Como solo usamos permisos
  básicos (email/perfil), normalmente se publica **sin verificación** de Google.

---

## ✅ Cuando termines, avísame con:
- Que Google quedó **conectado y guardado** en Supabase.
- Que el **Site URL / Redirect URLs** quedaron puestos.

Con eso, yo conecto el código del botón **"Entrar con Google"** y el registro por email, más la
pantalla de consentimiento (los checkboxes legales de la Fase 0). Recuerda: el login puede
funcionar, pero **no abrimos a personas reales hasta que los textos legales estén revisados**.
