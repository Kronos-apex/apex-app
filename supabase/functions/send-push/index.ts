import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@apex.app";

// Llave pública del proyecto — misma que usa el frontend (SB_KEY en index.html)
const APEX_ANON_KEY = "sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // ── Auth check ────────────────────────────────────────────────────────────
  // Verifica que el caller envíe Authorization: Bearer {anon_key}.
  // El frontend de APEX ya lo hace (línea pushToClient en index.html).
  // Cualquier llamada externa sin la key correcta recibe 401.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!APEX_ANON_KEY || token !== APEX_ANON_KEY) {
    console.log("[send-push] 401 — Authorization inválido o ausente");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const { clientId, title, body, type, chatId, tag } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("client_id", clientId);

    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, reason: "no_subscriptions", clientId }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/apex-app/icons/icon-192.png",
      ...(type  && { type }),
      ...(chatId && { chatId }),
      ...(tag   && { tag }),
    });

    const results = await Promise.allSettled(
      subs.map((s) => webpush.sendNotification(s.subscription, payload))
    );

    const sent  = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ ok: true, sent, failed, total: subs.length }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
