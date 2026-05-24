import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@apex.app";
const APEX_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const COLOMBIA_DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

type Slot = "morning" | "midmorning" | "afternoon";

const MSGS: Record<Slot, {
  title_training: string;
  title_rest: string;
  body_training: string[];
  body_rest: string[];
}> = {
  morning: {
    title_training: "Buenos días 💪",
    title_rest: "Buenos días 🌅",
    body_training: [
      "Hoy entrenas. Desayuna carbohidratos y proteína mínimo 1.5 horas antes de tu sesión.",
      "Día de entreno. Empieza bien: huevos, avena o fruta + proteína. Mínimo 90 min antes.",
      "Tienes sesión hoy. Desayuna temprano — el combustible importa más de lo que crees.",
      "Jornada de entrenamiento. Come bien esta mañana y llega hidratado/a a tu sesión.",
      "Hoy es día de trabajo. Un buen desayuno ahora = mejor rendimiento en tu entreno.",
      "Entreno programado hoy. Nada de entrenar en ayunas — desayuna y espera 90 min.",
      "Arranca bien el día de entreno. Proteína + carbohidratos en el desayuno. ¡Vamos!",
    ],
    body_rest: [
      "Hoy descansas. Come con calma y prepara tu cuerpo para la próxima sesión.",
      "Día de descanso activo. Camina, estírate y nutre tu cuerpo para recuperarte bien.",
      "El descanso también es entrenamiento. Come bien hoy — tu músculo repara ahora.",
      "Recuperación en marcha. Desayuna sin afanes y recarga energía para mañana.",
      "Hoy no entrenas, pero sí alimentas. Un buen desayuno apoya tu recuperación.",
      "Descanso programado. Aprovecha para comer bien y dormir suficiente.",
      "Día libre. Tu cuerpo construye músculo mientras descansas — ayúdalo con buena nutrición.",
    ],
  },
  midmorning: {
    title_training: "💧 Hidratación",
    title_rest: "💧 Hidratación",
    body_training: [
      "Si entrenas hoy, toma agua ahora. No esperes a tener sed — llega hidratado/a.",
      "Check de hidratación. ¿Ya llevas 2 vasos de agua? Especialmente con sesión hoy.",
      "Agua antes del entreno. Hidratarte ahora te hace rendir mejor en tu sesión.",
      "Toma 250 ml de agua ahora — la hidratación empieza horas antes de entrenar.",
      "¿Ya bebiste agua hoy? Si tienes entreno, la hidratación de ahorita es parte del trabajo.",
      "A media mañana. Toma agua ahora y llega hidratado/a a tu sesión de hoy.",
      "Hydration check. Dos vasos de agua antes de tu entreno de hoy. Dale.",
    ],
    body_rest: [
      "Día de descanso — tu cuerpo sigue trabajando. 8 vasos de agua hoy aceleran la recuperación.",
      "Hidratación diaria. No solo los días de entreno — hoy también necesitas tus 2 litros.",
      "La recuperación muscular necesita hidratación constante, incluso en días de descanso.",
      "Tu cuerpo repara mientras descansas — ayúdalo con buena hidratación hoy.",
      "Los días de descanso bien hidratados se convierten en mejores entrenamientos mañana.",
      "Agua a media mañana. Tu cuerpo recupera mejor cuando está bien hidratado.",
      "¿Ya tomaste agua hoy? La hidratación en días de descanso es igual de importante.",
    ],
  },
  afternoon: {
    title_training: "⚡ Hora de moverse",
    title_rest: "🔋 Recuperación activa",
    body_training: [
      "Si aún no has entrenado, este es tu momento. 45 minutos y quedas listo/a.",
      "Tu sesión de hoy te espera — no la dejes para mañana. Dale.",
      "Si entrenaste: ¡excelente día! Si no: aún tienes tiempo. No lo dejes ir.",
      "Tu rutina de hoy es tu inversión en la versión más fuerte de ti.",
      "¿Ya entrenaste? Si sí: ¡bien hecho! Si no: 30 minutos ahora hacen la diferencia.",
      "Último turno del día. Tu sesión de hoy suma — no la saltes.",
      "Hoy tienes sesión. Si aún no vas, ponte la ropa y empieza. Lo difícil es arrancar.",
    ],
    body_rest: [
      "Hoy descansaste bien. Prepara tu ropa de entreno — mañana sí toca.",
      "Estírate 10 minutos antes de dormir esta noche. Tu cuerpo lo agradece.",
      "Come proteína esta noche — apoya la recuperación muscular del día.",
      "Duerme mínimo 7 horas — es cuando tu músculo realmente crece.",
      "Buen día de descanso. Prepárate para la sesión de mañana — llega listo/a.",
      "Día de recuperación bien aprovechado. Duerme temprano esta noche.",
      "Tu cuerpo descansó hoy. Mañana vuelves más fuerte — prepárate esta noche.",
    ],
  },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!APEX_ANON_KEY || token !== APEX_ANON_KEY) {
    console.log("[daily-notifs] 401 — Authorization inválido");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { slot?: Slot };
    const slot = body.slot;
    if (!slot || !["morning", "midmorning", "afternoon"].includes(slot)) {
      return new Response(JSON.stringify({ error: "slot inválido. Usa: morning | midmorning | afternoon" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Colombia time = UTC - 5h
    const now = new Date();
    const colombiaDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const dayIndex = colombiaDate.getUTCDay();          // 0=Dom … 6=Sáb
    const todayName = COLOMBIA_DAYS[dayIndex];
    const msgIndex = dayIndex % 7;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("client_id, subscription, training_days");

    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const pool = MSGS[slot];
    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        const trainingDays: string[] = sub.training_days ?? [];
        const isTraining = trainingDays.includes(todayName);

        const title = isTraining ? pool.title_training : pool.title_rest;
        const body  = isTraining ? pool.body_training[msgIndex] : pool.body_rest[msgIndex];

        const payload = JSON.stringify({ title, body, icon: "/icons/icon-192.png" });
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
        console.log(`[daily-notifs] ${slot} → ${sub.client_id} (${isTraining ? "entreno" : "descanso"}) ✅`);
      } catch (e) {
        failed++;
        console.error(`[daily-notifs] Error → ${sub.client_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, slot, today: todayName, sent, failed, total: subs.length }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
