-- ============================================================================
-- c16 · ÍTEM #4 lote v3-a — COMENTARIOS en las publicaciones (Fable §8.3)
-- ============================================================================
-- Regla del PO (§6-BIS.2, vinculante): comenta CUALQUIERA QUE VE el post.
-- Contrapeso obligatorio ya en pie: bandeja de reportes (c14) + rate-limit.
--
-- CANDADOS DE MENORES (los dos, en AMBAS direcciones — §8.3.2):
--   · post de AUTOR menor  → solo su gente. Hoy es redundante con _profile_visible
--     (que ya colapsa a su gente para un menor) A PROPÓSITO: doble candado explícito,
--     para que re-ensanchar la visibilidad mañana NO ensanche los comentarios en
--     silencio (patrón c8). El sabotaje K3 lo prueba load-bearing por sí solo.
--   · COMENTARISTA menor → solo comenta a su gente. Candado NUEVO y load-bearing HOY:
--     sin él, un menor comentando el post público de un desconocido expondría su
--     handle/avatar ante extraños — justo lo que c8 le niega a su perfil.
-- Nadie EDITA un comentario: sin policy ni grant de UPDATE (se borra y se reescribe).
--
-- DESVIACIONES de §8.3 (documentadas, R4.2):
--  D1 · El borrado del MODERADOR no va por la rama _is_moderator de cc_del, va por RPC
--       DEFINER (cmty_mod_delete_comment). Misma trampa ya reproducida en c14b: un
--       DELETE cuyo WHERE referencia columnas aplica TAMBIÉN la policy de SELECT, y el
--       moderador NO ve el comentario de un post ajeno (cc_sel → _can_see_post) → borraría
--       0 filas justo en el caso de moderación. Dejar la rama muerta en cc_del sería
--       superficie engañosa: se omite. cc_del = autor del comentario o dueño del post.
--  D2 · El CHECK exige además `btrim(text) <> ''`: un comentario de puros espacios pasaba
--       el `between 1 and 280` y era basura pintable. Estrictamente más restrictivo.

create table public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.community_profiles(user_id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 280 and btrim(text) <> ''),
  created_at timestamptz not null default now()
);
alter table public.community_comments enable row level security;
create index community_comments_post_idx on public.community_comments(post_id, created_at);

-- ── Helpers (private, DEFINER, search_path='') ──
create function private._post_owner(p_post uuid) returns uuid
  language sql stable security definer set search_path = '' as $$
  select p.user_id from public.community_posts p where p.id = p_post;
$$;
revoke all on function private._post_owner(uuid) from public;
grant execute on function private._post_owner(uuid) to authenticated, service_role;

-- espejo EXACTO de cpost_sel (el autor ve lo suyo aunque esté oculto; el resto: visible + _profile_visible)
create function private._can_see_post(viewer uuid, p_post uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.community_posts p
    where p.id = p_post
      and (p.user_id = viewer or (p.visible and private._profile_visible(viewer, p.user_id)))
  );
$$;
revoke all on function private._can_see_post(uuid,uuid) from public;
grant execute on function private._can_see_post(uuid,uuid) to authenticated, service_role;

-- Regla de comentar: ver el post Y (ser el autor, o su gente, o AMBOS adultos).
create function private._can_comment(viewer uuid, p_post uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select private._can_see_post(viewer, p_post)
     and coalesce((
       select p.user_id = viewer
           or private._are_friends(viewer, p.user_id)
           or private._same_community(viewer, p.user_id)
           or (not private._is_minor(viewer) and not private._is_minor(p.user_id))
         from public.community_posts p where p.id = p_post
     ), false);
$$;
revoke all on function private._can_comment(uuid,uuid) from public;
grant execute on function private._can_comment(uuid,uuid) to authenticated, service_role;

-- ── RLS ──
create policy cc_sel on public.community_comments for select
  using ( user_id = auth.uid() or private._can_see_post(auth.uid(), post_id) );
create policy cc_ins on public.community_comments for insert
  with check ( user_id = auth.uid() and private._can_comment(auth.uid(), post_id) );
create policy cc_del on public.community_comments for delete
  using ( user_id = auth.uid() or auth.uid() = private._post_owner(post_id) );  -- D1: el moderador va por RPC
-- SIN policy de UPDATE (no se edita).

-- ── Rate-limit: 10/min (patrón _cm_rate de ① / _cpost_rate de c15) ──
create table public._cc_rate (
  uid uuid not null, minute timestamptz not null, count int not null default 0,
  primary key (uid, minute)
);
create function public._community_comment_rate_limit() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare m timestamptz := date_trunc('minute', now()); n int;
begin
  insert into public._cc_rate(uid, minute, count) values (new.user_id, m, 1)
    on conflict (uid, minute) do update set count = public._cc_rate.count + 1 returning count into n;
  if n > 10 then raise exception 'rate limit exceeded'; end if;
  delete from public._cc_rate where minute < m - interval '10 minutes';
  return new;
end $$;
revoke execute on function public._community_comment_rate_limit() from public, anon, authenticated;
create trigger trg_cc_rate before insert on public.community_comments
  for each row execute function public._community_comment_rate_limit();
revoke all on public._cc_rate from anon, authenticated;
grant all on public._cc_rate to service_role;

-- ── Grants (sin UPDATE; no hay upsert → no aplica la regla de las tres policies) ──
revoke all on public.community_comments from anon, authenticated;
grant select, insert, delete on public.community_comments to authenticated;
grant all on public.community_comments to service_role;

-- ── D1 · borrado de un comentario reportado, por el moderador (RPC DEFINER, mínimo privilegio) ──
create function public.cmty_mod_delete_comment(p_comment uuid) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if not private._is_moderator(auth.uid()) then raise exception 'not allowed'; end if;
  delete from public.community_comments where id = p_comment;
end $$;
revoke all on function public.cmty_mod_delete_comment(uuid) from public, anon;
grant execute on function public.cmty_mod_delete_comment(uuid) to authenticated, service_role;

-- ── Bandeja del moderador v2: excerpt también para reportes de COMENTARIO ──
-- Cuerpo COMPLETO de c14 con la rama `comment:%` añadida antes del else.
create or replace function public.cmty_mod_reports()
  returns table(rid uuid, rcreated_at timestamptz, rstatus text, rreason text, rcontext text,
                reporter_uid uuid, reporter_handle text, reported_uid uuid, reported_handle text,
                excerpt text)
  language sql stable security definer set search_path = '' as $$
  select r.id, r.created_at, r.status, r.reason, r.context,
         r.reporter, pr.handle, r.reported, pd.handle,
         case
           when r.context like 'post:%' then
             (select left(coalesce(p.payload->>'name','') ||
                          coalesce(' — ' || (p.payload->>'note'), ''), 140)
                from public.community_posts p
               where p.id::text = split_part(r.context, ':', 2))
           when r.context like 'comment:%' then
             (select left(c.text, 140) from public.community_comments c
               where c.id::text = split_part(r.context, ':', 2))
           else null
         end
    from public.community_reports r
    left join public.community_profiles pr on pr.user_id = r.reporter
    left join public.community_profiles pd on pd.user_id = r.reported
   where private._is_moderator(auth.uid())
   order by (r.status = 'open') desc, r.created_at desc
   limit 200;
$$;
revoke all on function public.cmty_mod_reports() from public, anon;
grant execute on function public.cmty_mod_reports() to authenticated, service_role;
