// ══════════ refresh_snapshot (Comunidad C2 · v2 en C3) ══════════
// v2 (C3): respeta show_today del perfil → si el usuario ocultó su actividad, trained_today se
// escribe SIEMPRE false (§11 patrones de actividad; ocultamiento server-side, no cosmético).
// Calcula el SNAPSHOT de constancia del PROPIO usuario y lo escribe en community_profiles.
// Decisión #7: server-side → el cliente NO puede inflar sus números (racha/nivel/logros). Lee el
// historial del CALLER (uid de SU access token), nunca de otros; escribe con service role las
// columnas de snapshot que el cliente no tiene grant para tocar. Si el usuario aún no hizo opt-in
// (no hay fila en community_profiles), no hace nada. Zona horaria fija: America/Bogota (UTC-5, sin DST).
//
// PORT FIEL de `communitySnapshot` en avi-core.js (testeado en avi.test.js) — misma lógica de
// weekStreak/gxLevel/planDays y las 8 medallas de renderGamification. Única diferencia: aquí el día
// y la semana se anclan a Bogota (allá = zona local del dispositivo, que para los usuarios ES Colombia).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://kronos-apex.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const BOGOTA_OFFSET_MS = 5 * 3600 * 1000; // UTC-5, sin DST
const GX_MINS = [0, 10, 30, 60, 120];     // umbrales de nivel 1..5 (GX_LEVELS en avi-core)

function bogotaDayStart(t: number): number {
  const s = new Date(t - BOGOTA_OFFSET_MS); s.setUTCHours(0, 0, 0, 0);
  return s.getTime() + BOGOTA_OFFSET_MS;
}
function bogotaWeekStart(t: number): number { // lunes 00:00 Bogota
  const s = new Date(t - BOGOTA_OFFSET_MS); s.setUTCHours(0, 0, 0, 0);
  const dow = s.getUTCDay(); s.setUTCDate(s.getUTCDate() - ((dow + 6) % 7));
  return s.getTime() + BOGOTA_OFFSET_MS;
}
function planDays(routines: any[], days: any): number {
  const fromR = (routines || []).filter((r: any) => r && r.day && r.day !== "Libre").length;
  const d = fromR || parseInt(days) || 3;
  return Math.max(1, Math.min(7, d));
}
function gxLevelN(total: number): number {
  let n = 1; for (let i = 0; i < GX_MINS.length; i++) { if (total >= GX_MINS[i]) n = i + 1; } return n;
}
function weekStreakWeeks(hist: any[], tgt: number, nowT: number): number {
  const byWeek: Record<number, Set<number>> = {};
  for (const h of (hist || [])) {
    const t = new Date(h && h.date).getTime(); if (isNaN(t)) continue;
    const wk = bogotaWeekStart(t);
    (byWeek[wk] = byWeek[wk] || new Set()).add(bogotaDayStart(t));
  }
  const WEEK = 7 * 86400000;
  const curWk = bogotaWeekStart(nowT);
  const met = ((byWeek[curWk] && byWeek[curWk].size) || 0) >= tgt;
  let weeks = 0; let cur = met ? curWk : curWk - WEEK;
  while (byWeek[cur] && byWeek[cur].size >= tgt) { weeks++; cur -= WEEK; }
  return weeks;
}
function snapshot(row: any, nowT: number) {
  const hist = Array.isArray(row && row.history) ? row.history : [];
  const prs = (row && row.prs) || {};
  const total = hist.length;
  const totalVol = hist.reduce((s: number, h: any) => s + ((h && h.totalVol) || 0), 0);
  const lvl = gxLevelN(total);
  const prsCount = Object.keys(prs).length;
  const tgt = planDays(row && row.routines, row && row.profile && row.profile.days);
  const streak_weeks = weekStreakWeeks(hist, tgt, nowT);
  const today = bogotaDayStart(nowT);
  const cutoff = today - 27 * 86400000;
  const days4w = new Set<number>(); let trained_today = false;
  for (const h of hist) {
    const t = new Date(h && h.date).getTime(); if (isNaN(t)) continue;
    const ds = bogotaDayStart(t);
    if (ds >= cutoff) days4w.add(ds);
    if (ds === today) trained_today = true;
  }
  const badges = [prsCount >= 1, total >= 10, total >= 30, totalVol >= 10000, totalVol >= 50000, totalVol >= 20000, lvl >= 3, lvl >= 4];
  return { streak_weeks, sessions_4w: days4w.size, level: lvl, achievements: badges.filter(Boolean).length, trained_today };
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
    // opt-in: solo refresca si el usuario YA tiene perfil de comunidad (no lo crea aquí).
    // Leemos show_today: si el usuario ocultó su actividad, trained_today JAMÁS se publica true
    // (§11 patrones de actividad → ocultamiento SERVER-SIDE, no cosmético). C3.1.
    const { data: prof, error: ep } = await admin
      .from("community_profiles").select("user_id,show_today").eq("user_id", uid).limit(1);
    if (ep) throw new Error("profile check: " + ep.message);
    if (!prof || !prof.length) return json({ ok: true, no_profile: true });
    const showToday = prof[0].show_today !== false; // default true si null/undefined

    const { data: rows, error: e1 } = await admin
      .from("user_data").select("history,prs,routines,profile").eq("user_id", uid).limit(1);
    if (e1) throw new Error("user_data: " + e1.message);

    const snap = snapshot((rows && rows[0]) || {}, Date.now());
    if (!showToday) snap.trained_today = false; // el amigo no ve CUÁNDO entrena
    // ② última conexión: last_active se estampa SIEMPRE server-side (el cliente no tiene grant para
    // escribirlo). El opt-in show_last_active solo gatea la LECTURA (cmty_activity_labels devuelve
    // null si el dueño no optó). Nunca se expone el timestamp crudo — solo la etiqueta redondeada.
    const nowIso = new Date().toISOString();
    const { error: e2 } = await admin
      .from("community_profiles")
      .update({ ...snap, snapshot_at: nowIso, last_active: nowIso })
      .eq("user_id", uid);
    if (e2) throw new Error("update: " + e2.message);

    return json({ ok: true, snapshot: snap });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
