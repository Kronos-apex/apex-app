// activate_public_profile (Comunidad v2 ③c-2) — escribe birth_date (WRITE-ONCE) + role
// (server-verificado) con service_role. El cliente NO tiene grant sobre esas columnas.
// birth_date es AUTOAFIRMADO (como Instagram/Meta; riesgo residual de producto/legal, §11, para el
// abogado — un menor podría mentir la fecha; el trigger de menor solo garantiza que CON la fecha
// registrada, <18 = privado forzado). role = 'coach' SOLO si POSEE asesorados (user_data.coach_id
// apuntando a él desde OTRAS filas) — NO desde user_data.role (CLIENT-WRITABLE, lección F7).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://kronos-apex.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function ageYears(bd: Date, now: Date): number {
  let a = now.getUTCFullYear() - bd.getUTCFullYear();
  const m = now.getUTCMonth() - bd.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < bd.getUTCDate())) a--;
  return a;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);
  const uid = user.id;

  try {
    const { data: prof, error: ep } = await admin
      .from("community_profiles").select("user_id, birth_date, is_private, role").eq("user_id", uid).limit(1);
    if (ep) throw new Error("profile check: " + ep.message);
    if (!prof || !prof.length) return json({ error: "no_profile" }, 400);
    const row = prof[0] as { birth_date: string | null; is_private: boolean; role: string };
    const now = new Date();

    // WRITE-ONCE: si ya hay birth_date, NO se cambia (nadie se recalibra la edad, §13-BIS.8 #4).
    if (row.birth_date) {
      const bd0 = new Date(row.birth_date + "T00:00:00Z");
      return json({ ok: true, already: true, is_minor: ageYears(bd0, now) < 18, role: row.role });
    }

    const body = await req.json().catch(() => ({}));
    const raw = (body as { birth_date?: unknown })?.birth_date;
    const bdStr = typeof raw === "string" ? raw.slice(0, 10) : "";
    // Sin fecha y sin una guardada = solo consulta: la UI debe pedir la fecha.
    if (!bdStr) return json({ ok: true, needs_birthdate: true });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bdStr)) return json({ error: "bad_date" }, 400);
    const bd = new Date(bdStr + "T00:00:00Z");
    if (isNaN(bd.getTime())) return json({ error: "bad_date" }, 400);
    const age = ageYears(bd, now);
    if (bd.getTime() > now.getTime() || age > 100 || age < 5) return json({ error: "implausible_date" }, 400);

    // role: coach SOLO si posee asesorados (no forgeable por un atacante solo).
    const { count, error: ec } = await admin
      .from("user_data").select("user_id", { count: "exact", head: true })
      .eq("coach_id", uid).neq("user_id", uid);
    if (ec) throw new Error("role check: " + ec.message);
    const role = (count ?? 0) > 0 ? "coach" : "client";

    // Escribir con service_role. El trigger _community_enforce_minor_privacy fuerza is_private si <18.
    const { error: eu } = await admin
      .from("community_profiles").update({ birth_date: bdStr, role }).eq("user_id", uid);
    if (eu) throw new Error("update: " + eu.message);

    return json({ ok: true, is_minor: age < 18, role });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
