-- ============================================================================
-- C1 · CIMIENTOS DE DATOS DE COMUNIDAD (idea #5, Fase 1) — migración lista para PROD
-- ============================================================================
-- Estado: ✅ APLICADO A PRODUCCIÓN (AVI-ENTRENAMIENTO eoebhrxbokyllqalyecj, 2026-07-19) tras el
-- veredicto de Fable (APROBADO CON CORRECCIÓN) + endurecimiento por advisor (schema private para
-- _are_friends, search_path='' en todas las funciones). Vetado antes en AVI-GYM (harness 14/14 +
-- sondas de Fable). Este archivo refleja el estado REAL en prod (migraciones c1_community_foundations
-- + c1_community_hardening). Advisor security: solo quedan ítems intencionales (ver notas abajo) +
-- pre-existentes de Camilo.
-- Decisiones del PO (§9 de docs/plan-comunidad.md): apodo · solo-código · solo-asesorados ·
-- foto opt-in (bucket aparte, §9.4) · constancia+fuerza relativa (F2) · Fase 1 sola ·
-- SNAPSHOT SERVER-SIDE (#7 → columnas de stats sin grant al cliente; las escribe la edge fn de C2).
--
-- Para el test se antepusieron DROPs idempotentes; en PROD se aplica create-only (esto).
-- ============================================================================

-- schema privado (NO expuesto por PostgREST) para helpers internos de RLS (endurecimiento Fable/advisor)
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- código de amigo: 10 hex-upper aleatorio (no secuencial). Endurecible a base32 en el futuro.
-- search_path='' fijo (advisor 0011): sin refs a tablas, solo built-ins de pg_catalog.
create function public.gen_share_code() returns text language sql volatile set search_path = '' as $$
  select upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
$$;

-- ---------- tablas ----------
create table public.community_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  handle       text not null check (char_length(handle) between 1 and 30),
  avatar_url   text,
  bio          text check (bio is null or char_length(bio) <= 160),
  share_code   text not null unique default public.gen_share_code(),
  visible      boolean not null default true,
  -- SNAPSHOT agregado (decisión #7 = server-side): SOLO lo escribe service_role; el cliente no tiene grant.
  streak_weeks int not null default 0,
  sessions_4w  int not null default 0,
  level        int not null default 1,
  achievements int not null default 0,
  trained_today boolean not null default false,
  snapshot_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid not null references public.community_profiles(user_id) on delete cascade,
  user_b       uuid not null references public.community_profiles(user_id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','blocked')),
  requested_by uuid not null,
  blocked_by   uuid,
  created_at   timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table public.community_reactions (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.community_profiles(user_id) on delete cascade,
  to_user    uuid not null references public.community_profiles(user_id) on delete cascade,
  kind       text not null default 'heart' check (kind in ('heart','fire','clap')),
  context    text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (from_user, to_user, kind, context)   -- PG15+; bloquea ❤️ duplicado aun con context NULL
);
-- OBSERVACIÓN (Fable 2026-07-19, aceptada): un ❤️ sobrevive a la desamistad/bloqueo (re_sel no
-- re-chequea amistad) → queda huérfano pero es inocuo (el destinatario ya lo recibió; nuevas
-- reacciones sí exigen amistad). NO se añade trigger de limpieza (R1.1, evitar complejidad); si
-- molesta en producción, un trigger AFTER DELETE/UPDATE-to-blocked en friendships lo purga.

create table public.community_reports (
  id         uuid primary key default gen_random_uuid(),
  -- Fable 2026-07-19: SET NULL (no CASCADE) → el historial de moderación SOBREVIVE aunque el
  -- reportado (o el reportante) borre su cuenta; queda anonimizado (§5.4). CASCADE lo borraba.
  reporter   uuid references auth.users(id) on delete set null,
  reported   uuid references auth.users(id) on delete set null,
  reason     text,
  created_at timestamptz not null default now()
);

create table public.community_resolve_attempts (   -- rate-limit del RPC (solo lo toca la fn definer)
  uid   uuid not null,
  day   date not null,
  count int  not null default 0,
  primary key (uid, day)
);

-- ---------- helper interno (schema PRIVATE → NO expuesto como RPC; evita fuga del grafo de amistades) ----------
-- Advisor 0028/0029: en public quedaba callable vía /rpc/_are_friends (anon+auth podían enumerar amistades).
create function private._are_friends(u1 uuid, u2 uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.friendships f
    where f.status='accepted' and f.user_a = least(u1,u2) and f.user_b = greatest(u1,u2)
  );
$$;
revoke all on function private._are_friends(uuid,uuid) from public;
grant execute on function private._are_friends(uuid,uuid) to authenticated, service_role;

-- ---------- triggers de friendships ----------
create function public._community_norm_friendship() returns trigger language plpgsql set search_path = '' as $$
declare lo uuid; hi uuid;
begin
  lo := least(new.user_a, new.user_b);
  hi := greatest(new.user_a, new.user_b);
  if lo = hi then raise exception 'cannot befriend self'; end if;
  new.user_a := lo; new.user_b := hi;
  new.requested_by := auth.uid();   -- el cliente NO decide quién pidió: siempre el que inserta
  new.status := 'pending';
  new.blocked_by := null;
  return new;
end $$;
create trigger trg_norm_friendship before insert on public.friendships
  for each row execute function public._community_norm_friendship();

create function public._community_check_transition() returns trigger language plpgsql set search_path = '' as $$
declare me uuid := auth.uid();
begin
  -- columnas inmutables
  new.user_a := old.user_a; new.user_b := old.user_b;
  new.requested_by := old.requested_by; new.created_at := old.created_at;
  if me is null or (me <> old.user_a and me <> old.user_b) then raise exception 'not a party'; end if;
  if old.status='pending' and new.status='accepted' then
    if me = old.requested_by then raise exception 'requester cannot accept own request'; end if;
    new.blocked_by := null; return new;
  end if;
  if new.status='blocked' then new.blocked_by := me; return new; end if;         -- cualquiera bloquea; queda registrado
  if old.status='blocked' and new.status <> 'blocked' then
    if me <> old.blocked_by then raise exception 'only blocker can unblock'; end if;   -- §5.2: el bloqueado NO se desbloquea
    new.blocked_by := null; return new;
  end if;
  if old.status = new.status then return new; end if;   -- no-op
  raise exception 'invalid transition % -> %', old.status, new.status;
end $$;
create trigger trg_check_transition before update on public.friendships
  for each row execute function public._community_check_transition();

-- ---------- RPC de resolución de código (§5.0: SECURITY DEFINER + rate-limit en servidor) ----------
create function public.resolve_share_code(p_code text)
  returns table(user_id uuid, handle text, avatar_url text)   -- SOLO mínimos; jamás snapshot
  language plpgsql security definer set search_path = '' as $$   -- '' + refs calificadas (advisor 0011)
declare me uuid := auth.uid(); n int; d date := (now() at time zone 'utc')::date;
begin
  if me is null then raise exception 'auth required'; end if;
  insert into public.community_resolve_attempts(uid, day, count) values (me, d, 1)
    on conflict (uid, day) do update set count = public.community_resolve_attempts.count + 1
    returning count into n;
  if n > 30 then raise exception 'rate limit exceeded'; end if;   -- anti-enumeración de códigos
  return query
    select p.user_id, p.handle, p.avatar_url
    from public.community_profiles p
    where p.share_code = p_code and p.visible = true   -- invisible → no resuelve (no filtra existencia)
    limit 1;
end $$;
-- NOTA advisor (aceptado): resolve_share_code queda como WARN 0029 (definer ejecutable por authenticated)
-- — es la feature (resolver un código pre-amistad); se auto-protege (auth + rate-limit + solo visibles).
-- community_resolve_attempts: RLS on + SIN policy ni grant a authenticated/anon = blindada (INFO 0008 esperado).

-- ---------- RLS ----------
alter table public.community_profiles         enable row level security;
alter table public.friendships                enable row level security;
alter table public.community_reactions        enable row level security;
alter table public.community_reports          enable row level security;
alter table public.community_resolve_attempts enable row level security;

-- profiles: leo el mío o el de un amigo aceptado; escribo solo el mío
create policy cp_sel on public.community_profiles for select
  using (user_id = auth.uid() or private._are_friends(user_id, auth.uid()));
create policy cp_ins on public.community_profiles for insert with check (user_id = auth.uid());
create policy cp_upd on public.community_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cp_del on public.community_profiles for delete using (user_id = auth.uid());

-- friendships: solo las mías; el trigger valida las transiciones
create policy fr_sel on public.friendships for select using (auth.uid() in (user_a, user_b));
create policy fr_ins on public.friendships for insert with check (auth.uid() in (user_a, user_b) and requested_by = auth.uid() and status='pending');
create policy fr_upd on public.friendships for update using (auth.uid() in (user_a, user_b)) with check (auth.uid() in (user_a, user_b));
-- ⚠️ FIX de verificación (Fable 2026-07-19): el trigger blinda el UPDATE, pero un DELETE dejaba al
-- BLOQUEADO borrar la fila 'blocked' y re-solicitar (evasión del candado §5.2). Reproducido y corregido:
-- una amistad 'blocked' SOLO la puede borrar quien bloqueó; pending/accepted, cualquiera del par.
create policy fr_del on public.friendships for delete
  using (auth.uid() in (user_a, user_b) and (status <> 'blocked' or blocked_by = auth.uid()));

-- reactions: reacciono como yo, solo a un amigo; veo las que me tocan; borro las mías
create policy re_sel on public.community_reactions for select using (auth.uid() in (from_user, to_user));
create policy re_ins on public.community_reactions for insert with check (from_user = auth.uid() and from_user <> to_user and private._are_friends(from_user, to_user));
create policy re_del on public.community_reactions for delete using (from_user = auth.uid());

-- reports: inserto el mío; SIN policy de SELECT (authenticated ni siquiera puede leer — moderación = servidor)
create policy rp_ins on public.community_reports for insert with check (reporter = auth.uid());

-- ---------- grants (mínimo privilegio; snapshot y share_code fuera del alcance del cliente) ----------
revoke all on public.community_profiles         from anon, authenticated;
revoke all on public.friendships                from anon, authenticated;
revoke all on public.community_reactions        from anon, authenticated;
revoke all on public.community_reports          from anon, authenticated;
revoke all on public.community_resolve_attempts from anon, authenticated;

grant select on public.community_profiles to authenticated;
grant insert (user_id, handle, avatar_url, bio, visible) on public.community_profiles to authenticated;  -- NO share_code (default) NI snapshot
grant update (handle, avatar_url, bio, visible)          on public.community_profiles to authenticated;  -- NO share_code NI snapshot
grant delete on public.community_profiles to authenticated;
grant all on public.community_profiles to service_role;

grant select, insert, update, delete on public.friendships to authenticated;
grant all on public.friendships to service_role;

grant select, insert, delete on public.community_reactions to authenticated;
grant all on public.community_reactions to service_role;

grant insert on public.community_reports to authenticated;   -- sin SELECT a propósito
grant all on public.community_reports to service_role;
grant all on public.community_resolve_attempts to service_role;

revoke all on function public.resolve_share_code(text) from public, anon;
grant execute on function public.resolve_share_code(text) to authenticated;
-- (_are_friends vive en el schema private; sus grants están junto a su definición, arriba)
