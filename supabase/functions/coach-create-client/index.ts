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

  let body: { email?: string; password?: string; profile?: Record<string, unknown>; routines?: unknown[] };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const routines = Array.isArray(body.routines) ? body.routines : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid_email" }, 400);
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
      // ¿ya existe? buscar por correo y actualizar la clave (idempotente).
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const ex = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (!ex) return json({ error: "create_failed", detail: cErr?.message || "" }, 500);
      userId = ex.id;
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
