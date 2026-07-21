-- ============================================================================
-- C12 · ④ FEED — community_posts (publicar rutinas) + visibilidad de seguidor
--        aprobado (§16.11) + reacciones ❤️ sobre posts
-- ============================================================================
-- Slice ④ backend. Estipulado por Fable §13-BIS.5 + §16.11. Aplicado a prod
-- (eoebhrxbokyllqalyecj, 2026-07-21, migración `c12_posts_feed`). Artefacto = estado real.
--
-- QUÉ ABRE ④: cada quien PUBLICA una rutina (solo nombre/días/ejercicios con series-reps —
-- NUNCA pesos, kg ni datos de salud, candado allow-list del trigger) y ve un MURO con las
-- rutinas de a quien sigue (+ las propias), con ❤️. Reusa el candado de visibilidad de ③
-- (`private._profile_visible`) — NO se re-inventa la regla de quién-ve-a-quién.
--
-- ESTIPULACIONES DE FABLE APLICADAS AL PIE (§16.11):
--   1. ADULTO privado: un seguidor 'active' SÍ ve su perfil/posts (rama nueva en _profile_visible).
--   2. MENOR: el follow NUNCA otorga visibilidad, ni aprobado — sale gratis de `AND NOT _is_minor(owner)`.
--   3. (punto 3 de §16.11 = decisión de PRODUCTO del PO 2026-07-21: NO se bloquea el INSERT de un
--      follow hacia un menor; el menor decide. Aprobar sigue sin dar visibilidad → sin fuga. Por eso
--      esta migración NO toca `_community_follow_state`.)
--
-- DESVIACIÓN vs recomendación de Fable §13-BIS.5 (documentada, R4.2): Fable recomendó que solo
-- amigos/seguidores/gym pudieran reaccionar (conservador). El PO decidió (2026-07-21) que CUALQUIERA
-- QUE VE el post pueda darle ❤️. La visibilidad sigue con candado (_profile_visible) — reaccionar solo
-- se suma a "poder ver el post", no lo ensancha. Reusa `community_reactions` con `context = post.id`.

-- ── ①  Helper: ¿viewer es seguidor APROBADO de owner? (§16.11 pto 1) ───────────
-- SECURITY DEFINER para poder leer `follows` sin depender de fo_sel; determinista.
create function private._is_approved_follower(viewer uuid, owner uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.follows
    where follower = viewer and followee = owner and state = 'active'
  );
$$;
revoke all on function private._is_approved_follower(uuid,uuid) from public;
grant execute on function private._is_approved_follower(uuid,uuid) to authenticated, service_role;

-- ── ②  _profile_visible v2 — AÑADE la rama de seguidor aprobado (adultos, §16.11) ─
-- Mismo cuerpo que c8 + una rama. Cambiar quién-ve-a-quién = este único lugar (lo usan cp_sel ③,
-- cmty_activity_labels ②, y ahora cpost_sel ④). La cláusula `AND NOT _is_minor(owner)` es el candado
-- del pto 2: aprobar un seguidor JAMÁS abre el perfil de un menor.
create or replace function private._profile_visible(viewer uuid, owner uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select owner = viewer
    or private._are_friends(owner, viewer)
    or private._same_community(viewer, owner)
    or ( coalesce((select not is_private from public.community_profiles where user_id = owner), false)
         and not private._is_minor(owner) )                          -- pública real (③)
    or ( private._is_approved_follower(viewer, owner)                -- seguidor aprobado (④ / §16.11 pto 1)
         and not private._is_minor(owner) );                         -- ...NUNCA de un menor (§16.11 pto 2)
$$;
revoke all on function private._profile_visible(uuid,uuid) from public;
grant execute on function private._profile_visible(uuid,uuid) to authenticated, service_role;

-- ── ③  community_posts — la rutina publicada (payload acotado por trigger) ──────
create table public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.community_profiles(user_id) on delete cascade,
  kind       text not null default 'routine' check (kind in ('routine')),
  payload    jsonb not null,
  visible    boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.community_posts enable row level security;
create index community_posts_user_created on public.community_posts(user_id, created_at desc);

-- ── ④  Validación de payload — ALLOW-LIST, jamás deny-list (§13-BIS.5) ──────────
-- Solo `{name, days, exercises}` arriba y `{name, muscle, sets, reps, type}` por ejercicio. Cualquier
-- otra clave (note/desc/imgUrl/peso/kg/salud…) = rechazo. No se "prohíben palabras" (se evade trivial);
-- solo lo explícitamente permitido pasa. Caps de tamaño para no volver el post un vector de spam.
create function public._community_post_validate() returns trigger language plpgsql set search_path = '' as $$
declare k text; ex jsonb; exk text;
begin
  if new.kind <> 'routine' then raise exception 'unsupported kind: %', new.kind; end if;
  if jsonb_typeof(new.payload) <> 'object' then raise exception 'payload must be object'; end if;

  -- claves de primer nivel
  for k in select jsonb_object_keys(new.payload) loop
    if k not in ('name','days','exercises') then raise exception 'forbidden payload key: %', k; end if;
  end loop;

  -- name obligatorio, string, acotado
  if jsonb_typeof(new.payload->'name') is distinct from 'string' then raise exception 'name must be a string'; end if;
  if char_length(new.payload->>'name') = 0 or char_length(new.payload->>'name') > 80 then raise exception 'name length out of range'; end if;

  -- days opcional: string ("Lunes") o array de strings
  if new.payload ? 'days' then
    if jsonb_typeof(new.payload->'days') not in ('string','array') then raise exception 'days must be string or array'; end if;
    if jsonb_typeof(new.payload->'days') = 'string' and char_length(new.payload->>'days') > 60 then raise exception 'days too long'; end if;
    if jsonb_typeof(new.payload->'days') = 'array' and jsonb_array_length(new.payload->'days') > 7 then raise exception 'too many days'; end if;
  end if;

  -- exercises obligatorio, array, acotado
  if jsonb_typeof(new.payload->'exercises') <> 'array' then raise exception 'exercises must be an array'; end if;
  if jsonb_array_length(new.payload->'exercises') = 0 or jsonb_array_length(new.payload->'exercises') > 40 then raise exception 'exercises count out of range'; end if;

  for ex in select jsonb_array_elements(new.payload->'exercises') loop
    if jsonb_typeof(ex) <> 'object' then raise exception 'each exercise must be an object'; end if;
    for exk in select jsonb_object_keys(ex) loop
      if exk not in ('name','muscle','sets','reps','type') then raise exception 'forbidden exercise key: %', exk; end if;
    end loop;
    if jsonb_typeof(ex->'name') is distinct from 'string' then raise exception 'exercise name must be a string'; end if;
    if char_length(ex->>'name') = 0 or char_length(ex->>'name') > 80 then raise exception 'exercise name out of range'; end if;
    if ex ? 'muscle' and char_length(ex->>'muscle') > 40 then raise exception 'muscle too long'; end if;
    if ex ? 'type'   and char_length(ex->>'type')   > 20 then raise exception 'type too long'; end if;
    -- sets/reps: se aceptan como número o texto corto ("3", "8-12", "al fallo"); solo se acota longitud
    if ex ? 'sets' and char_length(ex->>'sets') > 20 then raise exception 'sets too long'; end if;
    if ex ? 'reps' and char_length(ex->>'reps') > 20 then raise exception 'reps too long'; end if;
  end loop;

  return new;
end $$;
revoke all on function public._community_post_validate() from public, anon, authenticated;
grant execute on function public._community_post_validate() to service_role;
create trigger trg_community_post_validate before insert or update on public.community_posts
  for each row execute function public._community_post_validate();

-- ── ⑤  RLS de community_posts — visibilidad reusa el helper único ───────────────
-- El autor ve SIEMPRE lo suyo (incl. si lo ocultó); los demás solo si visible y _profile_visible.
create policy cpost_sel on public.community_posts for select
  using ( user_id = auth.uid() or (visible and private._profile_visible(auth.uid(), user_id)) );
create policy cpost_ins on public.community_posts for insert
  with check ( user_id = auth.uid() );
create policy cpost_upd on public.community_posts for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
create policy cpost_del on public.community_posts for delete
  using ( user_id = auth.uid() );

revoke all on public.community_posts from anon, authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant all on public.community_posts to service_role;

-- ── ⑥  Reacciones ❤️ sobre posts — reusan community_reactions.context = post.id ─
-- Helper DEFINER: devuelve el autor del post SOLO si `viewer` puede verlo (evita RLS anidada en la
-- policy y centraliza "¿puedo ver este post?"). null = no visible / no existe.
create function private._post_author_if_visible(viewer uuid, post_id text) returns uuid
  language sql stable security definer set search_path = '' as $$
  select p.user_id from public.community_posts p
   where p.id::text = post_id and p.visible
     and private._profile_visible(viewer, p.user_id);
$$;
revoke all on function private._post_author_if_visible(uuid,text) from public;
grant execute on function private._post_author_if_visible(uuid,text) to authenticated, service_role;

-- Un ❤️ por usuario por post (toggle vía DELETE). Las 2 reacciones existentes tienen context=null → no colisiona.
create unique index community_reactions_post_uq on public.community_reactions(from_user, context) where context is not null;

-- re_ins v2: context=null → amigos (perfil, C3, sin cambios); context=post → to_user debe ser el autor
-- REAL y from_user debe poder VER el post (decisión PO: cualquiera que ve, reacciona).
drop policy re_ins on public.community_reactions;
create policy re_ins on public.community_reactions for insert
  with check (
    from_user = auth.uid() and from_user <> to_user and (
      ( context is null and private._are_friends(from_user, to_user) )
      or
      ( context is not null and to_user = private._post_author_if_visible(from_user, context) )
    )
  );

-- re_sel v2: ves tus propias reacciones (perfil) O las de cualquier post que puedas ver (contador ❤️).
drop policy re_sel on public.community_reactions;
create policy re_sel on public.community_reactions for select
  using (
    auth.uid() = from_user or auth.uid() = to_user
    or ( context is not null and private._post_author_if_visible(auth.uid(), context) is not null )
  );
-- re_del sin cambios (from_user = auth.uid()) → sirve para quitar el ❤️.
