// ══════════ delete-account ══════════
// Borrado de cuenta self-service (requisito obligatorio de Google Play 2023).
// El cliente no puede borrar auth.users con la anon key → esta función usa el
// service role. Identifica al usuario por SU access token (no la anon key):
// solo un JWT de usuario real resuelve en admin.auth.getUser → ese es el candado.
//
// Borra, en orden: la fila user_data del usuario, sus push_subscriptions
// (client_id = uid) y, por último, su cuenta en auth.users (irreversible).
//
// El frontend lo invoca con supabase-js (functions.invoke), que adjunta
// automáticamente Authorization: Bearer <access_token> de la sesión activa.

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
    // 1. Datos del usuario.
    const { error: e1 } = await admin.from("user_data").delete().eq("user_id", uid);
    if (e1) throw new Error("user_data: " + e1.message);

    // 2. Suscripciones push (client_id = uid en modo auth).
    const { error: e2 } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("client_id", uid);
    if (e2) throw new Error("push_subscriptions: " + e2.message);

    // 2.5 Comunidad (C2): las TABLAS cascadean solas al borrar auth.users (community_profiles.user_id
    // → auth.users ON DELETE CASCADE → arrastra friendships/reactions; reports quedan anonimizados
    // por ON DELETE SET NULL). El cascade NO cubre: (a) los archivos de avatar en Storage, (b) las
    // filas de rate-limit del resolver (sin FK). Los limpiamos aquí. No bloquea el borrado si fallan.
    try {
      const { data: files } = await admin.storage.from("avatars").list(uid);
      if (files && files.length) {
        await admin.storage.from("avatars").remove(files.map((f) => `${uid}/${f.name}`));
      }
    } catch (_e) { /* Storage best-effort: no debe impedir el borrado de la cuenta */ }
    await admin.from("community_resolve_attempts").delete().eq("uid", uid);

    // 3. Cuenta de auth (irreversible). Aquí cascadea la comunidad en las tablas.
    const { error: e3 } = await admin.auth.admin.deleteUser(uid);
    if (e3) throw new Error("auth.deleteUser: " + e3.message);

    return json({ ok: true, deleted: uid });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
