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
//     nombre (decisión correcta: es pública), así que se ataba por (coach_id, nombre).
//     🔴 v691 · con dos asesorados que se llaman igual eso se llevaba la tarjeta del OTRO. Desde
//     v691 cada tarjeta nueva queda atada a su persona en `avi_showcase_dueno` (privada, s3) y se
//     borra por esa atadura: una tarjeta atada a otra persona JAMÁS se toca. Solo las viejas sin
//     atar siguen yendo por el nombre, y ahí se mantiene la decisión de v574: si otra persona se
//     llama igual se quita igual (dejar publicado el nombre y los kilos de quien ejerció su
//     derecho de supresión no es una opción; una tarjeta se vuelve a publicar en un toque), y la
//     respuesta lo DICE (`tarjetasDudosas`) para que la app le avise al coach.
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

// v657 · DOS orígenes durante la mudanza a app.avientrena.com: el navegador solo acepta UN origen
// por respuesta, así que se contesta con el del que pregunta si es uno de los nuestros. Por
// PETICIÓN (envolviendo el handler), nunca mutando `cors`: dos peticiones simultáneas se pisarían.
const ORIGENES = ["https://app.avientrena.com", "https://kronos-apex.github.io"];
const conCors = (h: (req: Request) => Promise<Response>) => async (req: Request): Promise<Response> => {
  const res = await h(req);
  const o = req.headers.get("origin") || "";
  if (ORIGENES.includes(o)) {
    try { res.headers.set("Access-Control-Allow-Origin", o); res.headers.append("Vary", "Origin"); } catch (_e) { /* cabeceras inmutables */ }
  }
  return res;
};


// UID del coach (modelo de un solo coach). Su cuenta NO se borra por esta vía:
// es la cuenta operativa del negocio y arrastraría las filas de sus asesorados.
const COACH_UID = "0a6484ed-42af-449d-9903-e440ac683ecf";

// ══════ v680 · EL BORRADO COMPLETO, EN UN SOLO SITIO ══════
// Lo usan DOS caminos: la persona que borra su propia cuenta y el coach que elimina a un
// asesorado suyo (v680). Una sola lista de lo que se borra, para que no se separen.
// 🔒 ORDEN: todo lo que NO cascadea va PRIMERO; `auth.users` de último. Ver cabecera.
// deno-lint-ignore no-explicit-any
async function borrarTodo(admin: any, uid: string): Promise<{ tarjetasQuitadas: number; tarjetasDudosas: number }> {
  // 0. Leer lo que hace falta para atar sus rastros ANTES de que desaparezca la fila.
  const { data: mio } = await admin
    .from("user_data").select("coach_id, profile").eq("user_id", uid).maybeSingle();
  // MISMA derivación que `showcaseFirstName` en avi-core.js: si se separan, la atadura
  // falla en silencio y la tarjeta se queda publicada.
  const primero = (s: unknown) => String(s ?? "").trim().split(/\s+/)[0] ?? "";
  const primerNombre = primero((mio?.profile as Record<string, unknown> | null)?.name);

  // 1. Su TARJETA PÚBLICA. Va primero porque es el único dato suyo visible sin cuenta:
  //    si algo falla después, al menos ya dejó de estar publicada.
  //    1a · v691 · las ATADAS a esta persona (`avi_showcase_dueno`, privada): exacto.
  const { data: suyas, error: eA } = await admin
    .from("avi_showcase_dueno").select("showcase_id").eq("user_id", uid);
  if (eA) throw new Error("avi_showcase_dueno: " + eA.message);
  const ids = new Set<string>((suyas ?? []).map((x: { showcase_id: string }) => x.showcase_id));
  //    1b · las VIEJAS sin atar con su primer nombre. Una tarjeta atada a OTRA persona no se toca
  //         nunca: ese era el defecto (con dos que se llaman igual, se llevaba la del otro).
  let tarjetasDudosas = 0;
  if (mio?.coach_id && primerNombre) {
    const { data: mismas, error: eM } = await admin
      .from("avi_showcase").select("id").eq("coach_id", mio.coach_id).eq("nombre", primerNombre);
    if (eM) throw new Error("avi_showcase: " + eM.message);
    const cand = (mismas ?? []).map((x: { id: string }) => x.id).filter((id: string) => !ids.has(id));
    if (cand.length) {
      const { data: atadas, error: eT } = await admin
        .from("avi_showcase_dueno").select("showcase_id").in("showcase_id", cand);
      if (eT) throw new Error("avi_showcase_dueno: " + eT.message);
      const deOtro = new Set((atadas ?? []).map((x: { showcase_id: string }) => x.showcase_id));
      const sinAtar = cand.filter((id: string) => !deOtro.has(id));
      if (sinAtar.length) {
        // ¿Otra persona de ese coach se llama igual? Entonces la tarjeta sin atar PUEDE ser suya:
        // se quita igual (v574) y se DICE, para que el coach la vuelva a publicar si era de ella.
        const { data: gente, error: eG } = await admin
          .from("user_data").select("user_id, nombre:profile->>name").eq("coach_id", mio.coach_id).neq("user_id", uid);
        if (eG) throw new Error("user_data: " + eG.message);
        const otros = (gente ?? []).filter((g: { nombre: unknown }) =>
          primero(g.nombre).toLowerCase() === primerNombre.toLowerCase()).length;
        if (otros > 0) tarjetasDudosas = sinAtar.length;
        sinAtar.forEach((id: string) => ids.add(id));
      }
    }
  }
  let tarjetasQuitadas = 0;
  if (ids.size) {
    const { data: quitadas, error: eSc } = await admin
      .from("avi_showcase").delete().in("id", [...ids]).select("id");
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

  // 4. Archivos en Storage — los CUATRO buckets. `avatars` va por uuid; `apex-photos` se
  //    creó antes de auth y sus carpetas usan el id LEGACY (gotcha 2026-07-12), así que
  //    por uuid puede no encontrar nada: se intenta igual, y lo de hoy vive como base64
  //    dentro de `user_data` (que sí cascadea). Best-effort: no bloquea el borrado.
  //    v649 · + `chat-media` (fotos y videos del chat, PRIVADO): todo lo de una pareja
  //    coach-asesorado vive en la carpeta del asesorado, suba quien suba.
  //    v650 · + `progress-photos` (fotos de progreso, PRIVADO), mismo modelo de carpeta.
  //    🔴 `list` devuelve como mucho 100 por llamada: un chat con más fotos dejaba restos.
  //    Se borra por PÁGINAS hasta que la carpeta quede vacía (tope de vueltas por si acaso).
  for (const bucket of ["avatars", "apex-photos", "chat-media", "progress-photos"]) {
    try {
      for (let vuelta = 0; vuelta < 50; vuelta++) {
        const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 100 });
        if (!files || !files.length) break;
        await admin.storage.from(bucket).remove(files.map((f: { name: string }) => `${uid}/${f.name}`));
        if (files.length < 100) break;
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
  return { tarjetasQuitadas, tarjetasDudosas };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(conCors(async (req) => {
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
  const body = await req.json().catch(() => ({}));

  // ── v680 · MODO COACH: el coach elimina a un asesorado SUYO (R14, hallazgo H1) ──
  // Antes «Eliminar» en el panel solo borraba la ficha: la cuenta de acceso, las fotos, los avisos y
  // la tarjeta pública quedaban, y quien se había registrado solo volvía a entrar con su contraseña
  // vieja y la app le fabricaba una ficha nueva. La pantalla del coach ya promete borrar «rutinas,
  // historial, fotos y todos sus datos»: esto lo cumple.
  // 🔒 EL PERMISO: quien llama tiene que ser el `coach_id` de la FICHA de esa persona. Esa ficha solo
  //    la escriben su dueño o su coach (RLS de user_data), así que nadie más puede fabricar el permiso.
  //    Sin ficha no hay permiso que comprobar → no se borra (no se adivina de quién es una cuenta).
  if (body && typeof body.cliente === "string" && body.cliente.trim()) {
    const objetivo = body.cliente.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(objetivo)) {
      return json({ ok: false, error: "bad_target" }, 400);
    }
    if (objetivo === uid || objetivo === COACH_UID) return json({ ok: false, error: "not_allowed" }, 403);
    try {
      const { data: fila, error: ef } = await admin
        .from("user_data").select("coach_id").eq("user_id", objetivo).maybeSingle();
      if (ef) throw new Error("user_data check: " + ef.message);
      if (!fila) return json({ ok: false, error: "not_found" }, 404);
      if (fila.coach_id !== uid) return json({ ok: false, error: "not_your_client" }, 403);
      const { tarjetasQuitadas, tarjetasDudosas } = await borrarTodo(admin, objetivo);
      return json({ ok: true, deleted: objetivo, porCoach: true, tarjetasQuitadas, tarjetasDudosas });
    } catch (err) {
      return json({ ok: false, error: String(err) }, 500);
    }
  }

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
    const { tarjetasQuitadas, tarjetasDudosas } = await borrarTodo(admin, uid);
    return json({ ok: true, deleted: uid, tarjetasQuitadas, tarjetasDudosas });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}));
