// ══════════ delete-account ══════════
// Borrado de cuenta self-service (requisito obligatorio de Google Play 2023).
// El cliente no puede borrar auth.users con la anon key → esta función usa el
// service role. Identifica al usuario por SU access token (no la anon key):
// solo un JWT de usuario real resuelve en admin.auth.getUser → ese es el candado.
//
// El frontend lo invoca con supabase-js (functions.invoke), que adjunta
// automáticamente Authorization: Bearer <access_token> de la sesión activa.
//
// ══════ v574 · EL ORDEN IMPORTA, Y LA PANTALLA PROMETE MÁS DE LO QUE SE BORRABA ══════
// Hallazgo de la auditoría «app instalada» (2026-09-05, B3 + verificación del orquestador).
//
// 🔒 REGLA DE ORDEN: **primero lo que NO cascadea, y `auth.users` DE ÚLTIMO.**
// Antes se borraba `user_data` primero y la cuenta al final, sin transacción: si algo
// fallaba en medio, la persona quedaba **con el perfil borrado y la cuenta viva** — un
// fantasma con datos a medias. Ahora el único paso irreversible es el último, y todo lo
// anterior es idempotente: si falla, no se borró nada que importe y se puede reintentar.
// `user_data` YA NO SE BORRA A MANO: su FK es `ON DELETE CASCADE` contra `auth.users`
// (verificado en `pg_constraint`), igual que toda la comunidad
// (`community_profiles` → posts/comments/reactions/friendships).
//
// 🔴 LO QUE FALTABA, contra lo que la pantalla promete —«se borrarán para siempre tu
// cuenta, perfil, rutinas, progreso, medidas y fotos»— :
//   · `avi_showcase`: su tarjeta seguía PUBLICADA en la página del coach. Es lo más grave,
//     porque es el único dato suyo que se lee SIN cuenta. La tabla guarda solo el primer
//     nombre (decisión correcta: es pública), así que se ata por (coach_id, nombre).
//     ⚠️ Si dos asesorados del mismo coach comparten primer nombre, se borran las dos
//     tarjetas. Es deliberado: dejar publicado el nombre y los kilos de quien ejerció su
//     derecho de supresión no es una opción, y una tarjeta se vuelve a publicar en un toque.
//     La respuesta dice cuántas se quitaron para que la app pueda avisarle al coach.
//   · `app_errors`: guarda `uid`, el user-agent y el contexto de sus errores.
//   · `apex-photos`: se limpiaba `avatars` pero no este bucket.
//
// ⚠️ LO QUE NO SE PUEDE BORRAR AQUÍ, y por eso se DECLARA en la política de datos:
// `apex_data_backups` conserva instantáneas completas ~90 días (medido: 25 filas, ventana
// de 83 días). Editar un respaldo para sacarle una persona lo rompe como respaldo; lo
// correcto es declarar la ventana de retención, que es lo que exige la Ley 1581/2012.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Origen restringido al dominio de la app (igual que send-push/daily-notifs). Antes era "*",
// lo que permitía invocarla desde cualquier sitio con un token robado. Auditoría 2026-06-21.
const cors = {
  "Access-Control-Allow-Origin": "https://kronos-apex.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// UID del coach (modelo de un solo coach). Su cuenta NO se borra por esta vía:
// es la cuenta operativa del negocio y arrastraría las filas de sus asesorados.
const COACH_UID = "0a6484ed-42af-449d-9903-e440ac683ecf";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolver al usuario a partir de SU access token. La anon key no tiene usuario
  // → getUser devuelve null → 401. Ese es el control de acceso de la función.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const uid = user.id;

  // El coach no puede autoborrarse por aquí (protege a sus asesorados).
  if (uid === COACH_UID) {
    return json({ ok: false, error: "coach_account_protected" }, 403);
  }

  try {
    // ── MODO FANTASMA (auditoría 2026-07-01) ──
    // "Continuar con Google" en el login AUTO-CREA una cuenta auth vacía cuando la
    // persona aún no tiene cuenta en AVI; ese cascarón luego bloquea el "Conectar
    // mi Google" de su cuenta real (identity_already_exists). La app lo invoca con
    // {ghost:true} justo al rechazar ese ingreso, para matar al fantasma al nacer.
    // CANDADO EN EL SERVIDOR: solo borra si el usuario NO tiene fila user_data —
    // una cuenta con datos JAMÁS se borra por esta vía, diga lo que diga el cliente.
    const body = await req.json().catch(() => ({}));
    if (body && body.ghost === true) {
      const { data: rows, error: eg } = await admin
        .from("user_data").select("user_id").eq("user_id", uid).limit(1);
      if (eg) throw new Error("user_data check: " + eg.message);
      if (rows && rows.length) return json({ ok: false, error: "not_a_ghost" }, 403);
      const { error: eDel } = await admin.auth.admin.deleteUser(uid);
      if (eDel) throw new Error("auth.deleteUser: " + eDel.message);
      return json({ ok: true, deleted: uid, ghost: true });
    }

    // ── Borrado COMPLETO self-service (flujo original de Play Store) ──
    // 🔒 ORDEN: todo lo que NO cascadea va PRIMERO; `auth.users` de último. Ver cabecera.

    // 0. Leer lo que hace falta para atar sus rastros ANTES de que desaparezca la fila.
    //    Su tarjeta pública solo se puede atar por (coach_id, primer nombre): `avi_showcase`
    //    guarda únicamente el nombre de pila, a propósito, porque es la única tabla que se
    //    lee sin cuenta.
    const { data: mio } = await admin
      .from("user_data").select("coach_id, profile").eq("user_id", uid).maybeSingle();
    // MISMA derivación que `showcaseFirstName` en avi-core.js: si se separan, la atadura
    // falla en silencio y la tarjeta se queda publicada.
    const primerNombre = String((mio?.profile as Record<string, unknown> | null)?.name ?? "")
      .trim().split(/\s+/)[0] ?? "";

    // 1. Su TARJETA PÚBLICA. Va primero porque es el único dato suyo visible sin cuenta:
    //    si algo falla después, al menos ya dejó de estar publicada.
    let tarjetasQuitadas = 0;
    if (mio?.coach_id && primerNombre) {
      const { data: quitadas, error: eSc } = await admin
        .from("avi_showcase").delete()
        .eq("coach_id", mio.coach_id).eq("nombre", primerNombre)
        .select("id");
      if (eSc) throw new Error("avi_showcase: " + eSc.message);
      tarjetasQuitadas = quitadas?.length ?? 0;
    }

    // 2. Suscripciones push (client_id = uid en modo auth). Sin FK: no cascadea.
    const { error: e2 } = await admin
      .from("push_subscriptions").delete().eq("client_id", uid);
    if (e2) throw new Error("push_subscriptions: " + e2.message);

    // 3. Sus errores registrados: llevan uid, user-agent y contexto. Sin FK: no cascadea.
    const { error: e4 } = await admin.from("app_errors").delete().eq("uid", uid);
    if (e4) throw new Error("app_errors: " + e4.message);

    // 4. Archivos en Storage — los DOS buckets. `avatars` va por uuid; `apex-photos` se
    //    creó antes de auth y sus carpetas usan el id LEGACY (gotcha 2026-07-12), así que
    //    por uuid puede no encontrar nada: se intenta igual, y lo de hoy vive como base64
    //    dentro de `user_data` (que sí cascadea). Best-effort: no bloquea el borrado.
    for (const bucket of ["avatars", "apex-photos"]) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(uid);
        if (files && files.length) {
          await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
        }
      } catch (_e) { /* Storage best-effort */ }
    }

    // 5. Rate-limit del resolver de comunidad (sin FK).
    await admin.from("community_resolve_attempts").delete().eq("uid", uid);

    // 6. LA CUENTA (irreversible, y por eso de última). Aquí cascadean `user_data` y toda
    //    la comunidad: profiles → posts/comments/reactions/friendships, messages,
    //    gym_members, moderators, follows; `community_reports` queda anonimizado.
    const { error: e3 } = await admin.auth.admin.deleteUser(uid);
    if (e3) throw new Error("auth.deleteUser: " + e3.message);

    return json({ ok: true, deleted: uid, tarjetasQuitadas });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
