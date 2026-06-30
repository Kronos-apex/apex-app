// ══════════ coach-create-client ══════════
// El COACH crea la cuenta de acceso de un asesorado desde la app. El login es solo-Auth,
// así que un cliente necesita una fila en auth.users para poder entrar — y la anon key del
// cliente no existe aún. Esta función usa el SERVICE ROLE para:
//   1) crear la cuenta auth YA CONFIRMADA (email_confirm:true → entra sin link de correo,
//      por eso sirven correos ficticios como claudia@avi.com),
//   2) sembrar su fila user_data (coach_id = el coach, role = client, profile + routines
//      tal cual los manda el coach — NO regenera nada).
//
// Candado de acceso: solo el COACH (su access token resuelve a COACH_UID) puede invocarla.
// Idempotente: si el correo ya existe, actualiza la clave y re-siembra perfil/rutinas
// (no duplica ni rompe). NO toca columnas pesadas (history/prs/...) → no borra progreso.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://kronos-apex.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
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

  // Solo el COACH puede crear cuentas de asesorados (su token resuelve a COACH_UID).
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json({ error: "Unauthorized" }, 401);
  if (caller.user.id !== COACH_UID) return json({ error: "forbidden_not_coach" }, 403);

  let body: { user_id?: string; email?: string; password?: string; profile?: Record<string, unknown>; routines?: unknown[] };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const routines = Array.isArray(body.routines) ? body.routines : [];
  const updateId = (body.user_id || "").trim();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── Modo UPDATE: edición de un asesorado YA provisionado (cambio de clave y/o correo de
  // acceso). Se enruta por user_id (no por correo) para que cambiar el email actualice la
  // cuenta existente en vez de crear una nueva. Antes era un no-op silencioso (bug #3
  // auditoría 2026-06-30). Solo toca auth.users; perfil/rutinas van por el guardado normal.
  if (updateId) {
    if (!password && !email) return json({ error: "nothing_to_update" }, 400);
    if (password && password.length < 4) return json({ error: "weak_password" }, 400);
    if (email && !emailRe.test(email)) return json({ error: "invalid_email" }, 400);
    const patch: Record<string, unknown> = { email_confirm: true };
    if (password) patch.password = password;
    if (email) patch.email = email;
    const { data: upd, error: uErr } = await admin.auth.admin.updateUserById(updateId, patch);
    if (uErr || !upd?.user) return json({ error: "update_failed", detail: uErr?.message || "" }, 500);
    return json({ ok: true, user_id: upd.user.id, updated: true });
  }

  if (!email || !emailRe.test(email)) return json({ error: "invalid_email" }, 400);
  if (!password || password.length < 4) return json({ error: "weak_password" }, 400);

  try {
    // 1) Crear la cuenta auth pre-confirmada. Si el correo ya existe, recuperarla.
    let userId: string;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: (profile as any)?.name || "" },
    });
    if (cErr || !created?.user) {
      // ¿ya existe? buscar por correo (perPage alto para no fallar con muchas cuentas).
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const ex = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (!ex) return json({ error: "create_failed", detail: cErr?.message || "" }, 500);
      userId = ex.id;
      // GUARD (#D3 auditoría 2026-06-30): ese correo YA pertenece a una cuenta. Solo es seguro
      // reescribir clave+perfil si es un asesorado de ESTE coach (re-provisión de acceso). Si es
      // de otro coach, un coach, o una cuenta independiente, reescribirla pisaría a un usuario
      // ajeno (le cambia la clave y le borra sus rutinas) → rechazar.
      const { data: exRow } = await admin.from("user_data").select("coach_id,role").eq("user_id", userId).maybeSingle();
      if (exRow && (exRow.role === "coach" || exRow.coach_id !== COACH_UID)) {
        // 200 con ok:false a propósito: así supabase-js expone el cuerpo y el cliente puede
        // leer 'email_taken' para NO encolar el alta a reintento infinito (es permanente).
        return json({ ok: false, error: "email_taken", detail: "Ese correo ya pertenece a otra cuenta" }, 200);
      }
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      userId = created.user.id;
    }

    // 2) Sembrar/actualizar la fila user_data (service role salta el RLS de INSERT).
    //    Solo escribe estas columnas → history/prs/medidas/etc. quedan intactos.
    const { error: rErr } = await admin.from("user_data").upsert({
      user_id: userId,
      coach_id: COACH_UID,
      role: "client",
      profile,
      routines,
      updated_at: new Date().toISOString(),
    });
    if (rErr) return json({ error: "row_failed", detail: rErr.message }, 500);

    return json({ ok: true, user_id: userId });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
