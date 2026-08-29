import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@apex.app";
// Llave pública del proyecto — misma que usa el frontend y los cron jobs
// (la anon key ya no vive aquí: era el candado y es PÚBLICA. Ver la comprobación de abajo.)

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const COLOMBIA_DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

type Slot = "morning" | "midmorning" | "afternoon";

// ── Morning & midmorning: solo training vs rest ───────────────────────────────

const MORNING = {
  training: {
    title: "Buenos días 💪",
    body: [
      "Hoy entrenas. Desayuna carbohidratos y proteína mínimo 1.5 horas antes de tu sesión.",
      "Día de entreno. Empieza bien: huevos, avena o fruta + proteína. Mínimo 90 min antes.",
      "Tienes sesión hoy. Desayuna temprano — el combustible importa más de lo que crees.",
      "Jornada de entrenamiento. Come bien esta mañana y llega hidratado/a a tu sesión.",
      "Hoy es día de trabajo. Un buen desayuno ahora = mejor rendimiento en tu entreno.",
      "Entreno programado hoy. Nada de entrenar en ayunas — desayuna y espera 90 min.",
      "Arranca bien el día de entreno. Proteína + carbohidratos en el desayuno. ¡Vamos!",
    ],
  },
  rest: {
    title: "Buenos días 🌅",
    body: [
      "Hoy descansas. Come con calma y prepara tu cuerpo para la próxima sesión.",
      "Día de descanso activo. Camina, estírate y nutre tu cuerpo para recuperarte bien.",
      "El descanso también es entrenamiento. Come bien hoy — tu músculo repara ahora.",
      "Recuperación en marcha. Desayuna sin afanes y recarga energía para mañana.",
      "Hoy no entrenas, pero sí alimentas. Un buen desayuno apoya tu recuperación.",
      "Descanso programado. Aprovecha para comer bien y dormir suficiente.",
      "Día libre. Tu cuerpo construye músculo mientras descansas — ayúdalo con buena nutrición.",
    ],
  },
};

const MIDMORNING = {
  training: {
    title: "💧 Hidratación",
    body: [
      "Si entrenas hoy, toma agua ahora. No esperes a tener sed — llega hidratado/a.",
      "Check de hidratación. ¿Ya llevas 2 vasos de agua? Especialmente con sesión hoy.",
      "Agua antes del entreno. Hidratarte ahora te hace rendir mejor en tu sesión.",
      "Toma 250 ml de agua ahora — la hidratación empieza horas antes de entrenar.",
      "¿Ya bebiste agua hoy? Si tienes entreno, la hidratación de ahorita es parte del trabajo.",
      "A media mañana. Toma agua ahora y llega hidratado/a a tu sesión de hoy.",
      "Hydration check. Dos vasos de agua antes de tu entreno de hoy. Dale.",
    ],
  },
  rest: {
    title: "💧 Hidratación",
    body: [
      "Día de descanso — tu cuerpo sigue trabajando. 8 vasos de agua hoy aceleran la recuperación.",
      "Hidratación diaria. No solo los días de entreno — hoy también necesitas tus 2 litros.",
      "La recuperación muscular necesita hidratación constante, incluso en días de descanso.",
      "Tu cuerpo repara mientras descansas — ayúdalo con buena hidratación hoy.",
      "Los días de descanso bien hidratados se convierten en mejores entrenamientos mañana.",
      "Agua a media mañana. Tu cuerpo recupera mejor cuando está bien hidratado.",
      "¿Ya tomaste agua hoy? La hidratación en días de descanso es igual de importante.",
    ],
  },
};

// ── Afternoon: 4 variantes según turno y día ──────────────────────────────────

const AFTERNOON = {
  // Entrena de mañana → ya entrenó, mensaje de recuperación
  postworkout: {
    title: "💪 Gran trabajo hoy",
    body: [
      "Entrenamiento de hoy completado. Ahora toca recuperar: come proteína y duerme bien.",
      "Hoy dejaste todo en el gym. Recuperación activa esta noche — estírate un poco.",
      "Sesión de hoy: ✅. Ahora hidratación y comida de calidad para recuperarte.",
      "Terminaste tu entreno esta mañana. La recuperación empieza ahora — no descuides la cena.",
      "Gran día de entrenamiento. Esta noche: proteína, hidratación y sueño temprano.",
      "Lo hiciste esta mañana. Recuperación activa: camina, estírate y come bien hoy.",
      "Sesión cerrada con éxito. El descanso de hoy = el rendimiento de mañana.",
    ],
  },
  // Entrena de tarde → recordatorio de que va a entrenar pronto
  preworkout: {
    title: "⚡ Hora de moverse",
    body: [
      "Tu sesión de hoy te espera. No la dejes para mañana — dale ahora.",
      "Si aún no has entrenado, este es tu momento. 45 minutos y quedas listo/a.",
      "Último turno del día. Tu sesión de hoy suma — no la saltes.",
      "Recuerda: hoy entrenas. Ponte la ropa y empieza — lo difícil es arrancar.",
      "Tu rutina de hoy es tu inversión en la versión más fuerte de ti.",
      "Sesión pendiente. No hay excusas, no hay mañana — dale hoy.",
      "Hoy tienes entreno. Un esfuerzo más y el día queda completo.",
    ],
  },
  // Entrena de noche → recordatorio antes de la sesión nocturna
  evening: {
    title: "🌙 Esta noche entrenas",
    body: [
      "Esta noche tienes sesión. Cena ligera 90 min antes — y llega hidratado/a.",
      "Sesión nocturna hoy. Evita comidas pesadas antes de entrenar — ligero y con energía.",
      "Entrenas esta noche. Prepara tu ropa ahora para no perder tiempo después.",
      "Tu sesión de esta noche: lista. Cena pronto y liviano para rendir al máximo.",
      "Esta noche te toca. Hidrátate bien ahora — la noche la cierras con el entreno.",
      "Sesión de noche en camino. Come algo ligero antes y llega concentrado/a.",
      "Entreno nocturno hoy. No lo dejes muy tarde — descansa bien después.",
    ],
  },
  // Sin turno especificado → mensaje neutral
  neutral: {
    title: "⚡ Tu sesión de hoy",
    body: [
      "Hoy es día de entreno. ¿Ya lo hiciste? Bien. ¿No? Ahora es el momento.",
      "Si ya entrenaste: ¡excelente! Si no: aún tienes tiempo. No lo dejes ir.",
      "Recordatorio de entreno. Solo tú sabes si ya cumpliste — y si no, ya sabes.",
      "Si entrenaste esta mañana: buen trabajo. Si no: aún quedan horas del día.",
      "Tu consistencia define tu resultado. Día de entreno — ¿cumplido o pendiente?",
      "Sea mañana o tarde, lo importante es que la sesión de hoy se haga.",
      "Día de sesión activo. Un entrenamiento más en tu historial. Dale.",
    ],
  },
  // Día de descanso
  rest: {
    title: "🔋 Recuperación activa",
    body: [
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


// ── Pools por ESTADO REAL (2026-07-07): la función ya no adivina por turno — lee el
// historial. RESCUE = registrado que NUNCA ha entrenado (máx 2/semana: martes y sábado).
// COMEBACK = entrenaba y lleva ≥7 días sin sesión (máx 2/semana: lunes y jueves).
// MORNING_DONE = ya entrenó HOY antes de la notif de la mañana (madrugadores).

const RESCUE = {
  title: "Tu rutina te espera 💚",
  body: [
    "Tu plan sigue listo, hecho para ti. El primer entreno es el más difícil — y el que más cambia todo.",
    "No necesitas una hora: tu primera sesión toma ~40 minutos y sales con energía. ¿Hoy?",
    "Registrarte fue el paso 1. El paso 2 es una sola sesión. Tu rutina te está esperando.",
    "Todos empiezan una vez. Abre tu rutina, mira el primer ejercicio y solo haz ese. El resto sale solo.",
    "Tu cuerpo no necesita el momento perfecto, necesita el primer movimiento. Tu plan está listo.",
    "¿Sabías que tu rutina se adapta a cómo te sientas? Ábrela hoy y pruébala a tu ritmo.",
    "Una sesión esta semana vale más que un plan perfecto el mes que viene. Dale al primer paso.",
  ],
};

const COMEBACK = {
  title: "Te extrañamos 💪",
  body: [
    "Hace días no entrenas. No pasa nada — lo importante es volver. Tu rutina sigue lista.",
    "La constancia no es no fallar nunca: es volver. Hoy es un buen día para retomar.",
    "Tu progreso no se borró — está esperándote. Una sesión suave para volver a agarrar el ritmo.",
    "Volver es más fácil de lo que parece: abre tu rutina y haz solo la mitad. Cuenta igual.",
    "Tu cuerpo recuerda más de lo que crees. Retoma hoy con calma — mañana lo agradeces.",
    "Un descanso largo no es el final — es una pausa. Tu plan sigue ahí, ajustado a ti.",
    "El mejor momento para volver fue ayer. El segundo mejor es hoy. Te esperamos.",
  ],
};

const MORNING_DONE = {
  title: "¡Ya entrenaste! 🔥",
  body: [
    "Madrugaste y cumpliste. Ahora desayuna con proteína — tu músculo la necesita YA.",
    "Sesión hecha antes que el resto despierte. Hidrátate y come bien — la recuperación empieza ahora.",
    "Entreno de hoy: ✅ desde temprano. Buen desayuno y a ganar el día.",
    "Ya cumpliste lo más difícil del día. Proteína + agua ahora mismo.",
    "Entrenar temprano = disciplina de verdad. Recupera con un buen desayuno.",
    "Tu sesión ya quedó en el historial. Ahora aliméntate a la altura del esfuerzo.",
    "Cumpliste antes de las 7am. Eso no lo hace cualquiera. Desayuna bien — te lo ganaste.",
  ],
};

// ── Recordatorio de RENOVACIÓN (v540) ────────────────────────────────────────────────
// Decisión del PO (25-ago): el aviso le llega al asesorado, SIN cifras y sin número de cuenta.
// 🔴 UN SOLO push, el día que faltan exactamente RENEW_NOTICE_DAYS y solo en el turno de la
// TARDE. Repetirlo los 3 días × 3 turnos serían NUEVE avisos de cobro: eso es justo lo que el PO
// pidió evitar («sin que sea incómodo»). Los otros dos días el recordatorio vive en la banda de
// «Hoy», que la persona ve si abre la app y no la persigue si no.
// ⚠️ ESPEJO de `renewalNotice` (avi-core). Deno no puede importar el módulo del navegador, así
// que la regla vive dos veces y un test de la suite LEE este archivo y compara la constante —
// el mismo patrón que `STREAK_MILESTONES` y que el espejo del `.sql` de la vitrina.
const RENEW_NOTICE_DAYS = 3;
const RENEW = {
  title: "Tu plan se renueva pronto 💚",
  body: [
    "Tu plan va hasta este fin de semana. Habla con tu coach para renovarlo y seguir sin cortes.",
    "Quedan pocos días de tu plan. Escríbele a tu coach cuando puedas y lo renuevan.",
    "Tu plan está por cumplir el mes. Coordina con tu coach para seguir sin interrupciones.",
    "Se acerca la fecha de renovación de tu plan. Tu coach te cuenta cómo seguir.",
    "Tu plan termina en unos días. Habla con tu coach para que no se te corte el proceso.",
    "Recordatorio tranquilo: tu plan se renueva pronto. Escríbele a tu coach.",
    "Tu mes está por cerrar. Coordina la renovación con tu coach y sigues igual.",
  ],
};

// ── Recordatorio de hábitos (v362): se APENDE al push de la tarde SOLO si el asesorado
// no registró su agua ni sus pasos hoy. No es un push nuevo — es una coletilla suave al
// mensaje que ya recibe, para cerrar el día completo. Rotativo por día (msgIndex).
const HABITS_REMINDER = [
  "Y no olvides: ¿ya registraste tu agua y tus pasos de hoy?",
  "De paso, anota tu agua y tus pasos de hoy en la app.",
  "Cierra el día completo: registra tu agua y tus pasos.",
  "¿Cuántos pasos llevas hoy? Anótalos junto con tu agua.",
  "Un toque más: registra tu agua y tus pasos de hoy.",
  "Antes de dormir, apunta tu agua y tus pasos de hoy.",
  "Tu agua y tus pasos de hoy te esperan en la app.",
];

const cors = {
  "Access-Control-Allow-Origin": "https://kronos-apex.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // ── Autorización ──────────────────────────────────────────────────────────
  // El candado ERA la anon key, que es PÚBLICA (va en el JS servido y en un repo público):
  // probado con curl el 2026-07-31, cualquiera desde internet disparaba la ronda de pushes.
  // Ahora manda un secreto de 32 bytes que vive en la BASE (`private.fn_secrets`), se lee por
  // una RPC que solo puede llamar `service_role`, y viaja en el comando del cron —que no es
  // legible por el público—. Nunca está en el código, ni en el repo, ni en un log.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let notifSecret = "";
  try {
    const { data, error } = await supabase.rpc("fn_notif_secret");
    if (error) throw new Error(error.message);
    notifSecret = String(data ?? "");
  } catch (e) {
    // FALLA CERRADA, pero con código propio: un 503 en los logs dice «no pude leer el secreto»
    // y no se confunde con «alguien tocó la puerta sin credencial» (401).
    console.error("[daily-notifs] 503 — no se pudo leer el secreto:", e);
    return new Response(JSON.stringify({ error: "secret_unavailable" }), {
      status: 503, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Los 3 cron ya mandan el secreto (verificado end-to-end antes de cerrar): la anon key
  // pública YA NO abre esta puerta. La transición se retiró el 2026-07-31.
  if (notifSecret.length === 0 || token !== notifSecret) {
    console.log("[daily-notifs] 401 — Authorization inválido");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { slot?: Slot; dry?: boolean };
    const slot = body.slot;
    const dry = body.dry === true; // dry:true = clasifica y cuenta SIN enviar (para pruebas)
    if (!slot || !["morning", "midmorning", "afternoon"].includes(slot)) {
      return new Response(JSON.stringify({ error: "slot inválido. Usa: morning | midmorning | afternoon" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Colombia time = UTC - 5h
    const now = new Date();
    const colombiaDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const dayIndex = colombiaDate.getUTCDay();   // 0=Dom … 6=Sáb
    const todayName = COLOMBIA_DAYS[dayIndex];
    const msgIndex = dayIndex % 7;

    // (el cliente de service role se crea arriba, junto a la comprobación del secreto)

    // El coach NO recibe los avisos de asesorado (decisión del PO, 2026-07-31). Su fila '_coach'
    // no tiene `user_data` propia, así que `st` era null y caía en las ramas genéricas: llevaba
    // meses recibiendo los 3 turnos diarios ×2 dispositivos. Los pushes que SÍ son suyos
    // (mensajes, leads) van por `send-push`, que no pasa por aquí.
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, client_id, subscription, training_days, training_shift")
      .neq("client_id", "_coach");

    if (error) throw new Error(error.message);

    // ── Estado REAL por usuario (2026-07-07): el historial manda sobre el turno ──
    // trainedToday: tiene una sesión con fecha (Colombia) de HOY. total: sesiones de
    // por vida. daysSince: días desde la última. Con esto la función deja de adivinar.
    const { data: udRows, error: udErr } = await supabase
      .from("user_data")
      .select("user_id, history, profile, routines");
    if (udErr) console.error("[daily-notifs] user_data:", udErr.message);
    const todayCol = new Date(now.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
    const state = new Map<string, { trainedToday: boolean; total: number; daysSince: number | null; habitsLoggedToday: boolean; renewDays: number | null }>();
    // ⚠️ ESPEJO de `pushPlanFromRoutines` (avi-core). Deno no importa el módulo del navegador, así
    // que la derivación vive dos veces y un test de la suite lee este archivo — mismo patrón que
    // RENEW_NOTICE_DAYS. Los días de entreno son de la PERSONA: leerlos de su plan de HOY es lo
    // único que impide que una fila huérfana mande el mensaje de un plan de hace tres semanas.
    const plans = new Map<string, { days: string[]; shift: Record<string, string> }>();
    for (const r of (udRows ?? [])) {
      const hist: Array<{ date?: string }> = Array.isArray(r.history) ? r.history : [];
      let trainedToday = false, last = 0;
      for (const h of hist) {
        const t = h && h.date ? Date.parse(h.date) : NaN;
        if (isNaN(t)) continue;
        if (new Date(t - 5 * 3600_000).toISOString().slice(0, 10) === todayCol) trainedToday = true;
        if (t > last) last = t;
      }
      // Hábitos de HOY (v362): el asesorado está en Colombia (UTC-5) → su habitDayKey local
      // == todayCol. Registró si tiene agua o pasos > 0 hoy. profile.habits viaja en el perfil.
      const habits = (r.profile && (r.profile as { habits?: { water?: Record<string, number>; steps?: Record<string, number> } }).habits) || {};
      const waterToday = Number((habits.water || {})[todayCol]) || 0;
      const stepsToday = Number((habits.steps || {})[todayCol]) || 0;
      // Días que faltan para que venza su plan (v540). null = no aplica: sin pagos («pending»,
      // no hay nada que RE-novar), en cortesía (v539: a esta persona no se le cobra) o suspendido.
      const prof = (r.profile ?? {}) as { payments?: Array<{ dueDate?: string }>; courtesy?: boolean; suspended?: boolean };
      let renewDays: number | null = null;
      if (!prof.courtesy && !prof.suspended && Array.isArray(prof.payments) && prof.payments.length) {
        let due = 0;
        for (const p of prof.payments) {
          const t = p && p.dueDate ? Date.parse(p.dueDate) : NaN;
          if (isFinite(t) && t > due) due = t;
        }
        if (due > 0) renewDays = Math.ceil((due - now.getTime()) / 86400_000);
      }
      const rutinas: Array<{ day?: string; shift?: string }> = Array.isArray(r.routines) ? r.routines : [];
      if (rutinas.length) {
        const days: string[] = [], shift: Record<string, string> = {};
        for (const rt of rutinas) {
          const d = rt && rt.day;
          if (!d || d === "Libre") continue;
          if (days.indexOf(d) < 0) days.push(d);
          if (rt.shift && !shift[d]) shift[d] = rt.shift;
        }
        plans.set(String(r.user_id), { days, shift });
      }
      state.set(String(r.user_id), {
        renewDays,
        trainedToday, total: hist.length,
        daysSince: last ? Math.floor((now.getTime() - last) / 86400_000) : null,
        habitsLoggedToday: waterToday > 0 || stepsToday > 0,
      });
    }
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const deadIds: string[] = [];   // endpoints que el servicio de push declara muertos (410/404)

    for (const sub of subs) {
      try {
        // El plan MANDA sobre la copia guardada en la fila (v551). La copia se queda como
        // respaldo para quien todavía no tiene rutinas — ahí no hay nada mejor que leer.
        const plan = plans.get(String(sub.client_id));
        const trainingDays: string[] = plan ? plan.days : (sub.training_days ?? []);
        const shiftMap: Record<string,string> = plan ? plan.shift : (sub.training_shift ?? {});
        const shift: string = shiftMap[todayName] ?? "";
        const isTraining = trainingDays.includes(todayName);
        const st = state.get(String(sub.client_id)) ?? null; // null p.ej. para '_coach'

        let title: string;
        let body: string;
        let habitsNudge = false; // v362: ¿apendemos el recordatorio de hábitos a la tarde?

        // ── Segmentos por estado (solo asesorados con fila user_data) ──
        // RENOVACIÓN primero (v540): es el único con FECHA — si cede el turno a otro segmento,
        // ese día no vuelve. Los demás son recurrentes y pierden un turno sin consecuencia.
        if (st && st.renewDays === RENEW_NOTICE_DAYS && slot === "afternoon") {
          title = RENEW.title; body = RENEW.body[msgIndex];
        } else if (st && st.total === 0) {
          // NUNCA ha entrenado → rescate SOLO tarde, SOLO martes y sábado (no quemar el push)
          if (slot !== "afternoon" || (dayIndex !== 2 && dayIndex !== 6)) { skipped++; continue; }
          title = RESCUE.title; body = RESCUE.body[msgIndex];
        } else if (st && st.daysSince !== null && st.daysSince >= 7 && !st.trainedToday) {
          // INACTIVO ≥7 días → "vuelve" SOLO tarde, SOLO lunes y jueves
          if (slot !== "afternoon" || (dayIndex !== 1 && dayIndex !== 4)) { skipped++; continue; }
          title = COMEBACK.title; body = COMEBACK.body[msgIndex];
        } else if (st && st.trainedToday && slot === "morning") {
          // Madrugador: YA entrenó antes de la notif de la mañana
          title = MORNING_DONE.title; body = MORNING_DONE.body[msgIndex];
        } else if (st && st.trainedToday && slot === "afternoon") {
          // Ya entrenó HOY (lo dice el historial, no el turno) → recuperación
          title = AFTERNOON.postworkout.title; body = AFTERNOON.postworkout.body[msgIndex];
          habitsNudge = true;
        } else if (slot === "morning") {
          const pool = isTraining ? MORNING.training : MORNING.rest;
          title = pool.title;
          body  = pool.body[msgIndex];

        } else if (slot === "midmorning") {
          const pool = isTraining ? MIDMORNING.training : MIDMORNING.rest;
          title = pool.title;
          body  = pool.body[msgIndex];

        } else {
          // afternoon — depende del turno de entreno
          if (!isTraining) {
            title = AFTERNOON.rest.title;
            body  = AFTERNOON.rest.body[msgIndex];
          } else if (shift === "morning") {
            title = AFTERNOON.postworkout.title;
            body  = AFTERNOON.postworkout.body[msgIndex];
          } else if (shift === "afternoon") {
            title = AFTERNOON.preworkout.title;
            body  = AFTERNOON.preworkout.body[msgIndex];
          } else if (shift === "evening") {
            title = AFTERNOON.evening.title;
            body  = AFTERNOON.evening.body[msgIndex];
          } else {
            title = AFTERNOON.neutral.title;
            body  = AFTERNOON.neutral.body[msgIndex];
          }
          habitsNudge = true;
        }

        // v362: coletilla de hábitos SOLO en la tarde, SOLO si no registró agua/pasos hoy
        // (y solo en las ramas normales/postworkout — nunca en rescate/comeback, que son pushes
        // de retención con su propio foco). Un push, un objetivo claro; esto solo cierra el día.
        if (habitsNudge && st && !st.habitsLoggedToday) {
          body = body + " " + HABITS_REMINDER[msgIndex];
        }

        const payload = JSON.stringify({ title, body, icon: "/apex-app/icons/icon-192.png" });
        if (!dry) await webpush.sendNotification(sub.subscription, payload);
        sent++;
        console.log(`[daily-notifs] ${slot} → ${sub.client_id} shift=${shift||"none"} (${isTraining?"entreno":"descanso"}) ✅`);
      } catch (e) {
        failed++;
        // Poda de suscripciones MUERTAS — la misma que `send-push` tiene desde el 2026-07-11 y
        // que a esta hermana le faltaba: un 410 Gone / 404 Not Found dice que ese endpoint ya no
        // existe. Sin esto los zombis se acumulan para siempre y la ronda reporta "enviado" a la
        // nada (clase conocida: 7 filas '_coach' muertas del cutover).
        const code = (e as { statusCode?: number; status?: number } | undefined)?.statusCode
                  ?? (e as { statusCode?: number; status?: number } | undefined)?.status;
        if (code === 410 || code === 404) deadIds.push(sub.id);
        console.error(`[daily-notifs] Error → ${sub.client_id}:`, e);
      }
    }

    let pruned = 0;
    if (deadIds.length && !dry) {
      const { error: delErr } = await supabase.from("push_subscriptions").delete().in("id", deadIds);
      if (!delErr) pruned = deadIds.length;
      else console.error("[daily-notifs] poda:", delErr.message);
    }

    return new Response(
      JSON.stringify({ ok: true, slot, dry, today: todayName, sent, failed, skipped, pruned, total: subs.length }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
