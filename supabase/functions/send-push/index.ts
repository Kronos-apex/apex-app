// ══════════ send-push ══════════
// Envía una notificación push a un destinatario concreto (un asesorado, o '_coach').
//
// ⚠️ CANDADO (2026-08-03, hallazgo H1 de la auditoría de base de datos 2026-07-31):
// hasta la v9 el único control era comparar el header Authorization contra la anon key
// HARDCODEADA aquí — una llave PÚBLICA (está en el JS de Pages y en el repo). Cualquiera
// con `curl` le mandaba un push con el texto que quisiera al celular de quien fuera
// ('_coach' es un literal adivinable). El CORS no protegía: CORS es del navegador.
//
// Ahora el candado es el MISMO que el de delete-account/coach-create-client: se resuelve
// al usuario por SU access token (`admin.auth.getUser`) — la anon key no tiene usuario, así
// que da 401 — y ADEMÁS se comprueba que ese usuario tenga derecho a pushear a ese
// destinatario. Es el mismo anti-patrón que ya se mató en `subscribePush` (v323): las
// llamadas autenticadas van por el CLIENTE de Supabase, nunca por fetch crudo con la anon
// key de Bearer.
//
// Quién puede pushear a quién (`_authorize`):
//   · a sí mismo            → siempre (el uid del token es el destinatario)
//   · a '_coach'            → cualquier asesorado del coach, y el propio coach
//   · a un asesorado (uuid) → SOLO su coach (user_data.coach_id del destinatario = quien llama)
// `user_data.coach_id` del DESTINATARIO no es forjable desde fuera: la RLS solo deja
// escribir esa fila a su dueño o a quien YA figura como su coach (gotcha F7 al revés).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@avi.app";

// UID del coach (modelo de un solo coach), igual que en delete-account. Sus suscripciones
// viven bajo el literal '_coach' (no bajo su uuid), por eso hace falta el mapeo explícito.
const COACH_UID = "0a6484ed-42af-449d-9903-e440ac683ecf";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const cors = {
  "Access-Control-Allow-Origin": "https://kronos-apex.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ¿Puede `uid` mandarle un push a `target`? Consulta user_data con service role.
// Devuelve el motivo del permiso (para el log) o null si NO puede.
async function _authorize(
  admin: ReturnType<typeof createClient>,
  uid: string,
  target: string,
): Promise<string | null> {
  if (!target) return null;
  if (target === uid) return "self";

  if (target === "_coach") {
    if (uid === COACH_UID) return "coach_self";
    // Un asesorado le escribe a su coach (mensaje, dolor, aviso de pago). Su propia fila
    // dice de quién es asesorado; nadie más puede escribir esa fila.
    const { data } = await admin
      .from("user_data").select("coach_id").eq("user_id", uid).maybeSingle();
    return (data && data.coach_id) ? "client_to_coach" : null;
  }

  // Destinatario asesorado: solo su coach. La titularidad la dice la fila del DESTINATARIO.
  const { data } = await admin
    .from("user_data").select("coach_id").eq("user_id", target).maybeSingle();
  return (data && data.coach_id === uid) ? "coach_to_client" : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Auth: el que llama tiene que ser un USUARIO REAL, no una llave pública ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    console.log("[send-push] 401 — sin sesión de usuario válida");
    return json({ error: "Unauthorized" }, 401);
  }
  const uid = user.id;

  try {
    const { clientId, title, body, type, chatId, tag } = await req.json();
    const target = typeof clientId === "string" ? clientId : "";

    // ── Autorización: no basta con estar logueado ──
    const reason = await _authorize(supabase, uid, target);
    if (!reason) {
      console.log(`[send-push] 403 — ${uid} no puede pushear a ${target}`);
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("client_id", target);

    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      return json({ ok: false, reason: "no_subscriptions", clientId: target });
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

    // Poda de suscripciones MUERTAS: si el push falla con 410 Gone / 404 Not Found, ese
    // endpoint ya no existe (el dispositivo/navegador rotó o revocó la suscripción). Sin esto
    // los endpoints zombis se acumulan para siempre y la función reporta "ok" enviando a la
    // nada (raíz del bug 2026-07-11: 7 suscripciones '_coach' del cutover, todas muertas).
    const deadIds: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const reason = r.reason as { statusCode?: number; status?: number } | undefined;
        const code = reason?.statusCode ?? reason?.status;
        if (code === 410 || code === 404) deadIds.push(subs[i].id);
      }
    });
    let pruned = 0;
    if (deadIds.length) {
      const { error: delErr } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", deadIds);
      if (!delErr) pruned = deadIds.length;
    }

    // ok = al menos UN dispositivo recibió (antes devolvía ok:true aunque fallaran todos).
    return json({ ok: sent > 0, sent, failed, pruned, total: subs.length });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
