-- ============================================================================
-- C6 · ① CHAT EN VIVO — community_messages (DMs Realtime entre amigos/gym-mates)
-- ============================================================================
-- Primer slice de COMUNIDAD v2 (red social tipo Instagram). Estipulado por Fable
-- en docs/plan-comunidad.md §13-BIS.2. Aplicado a prod (eoebhrxbokyllqalyecj,
-- 2026-07-21, migración `c6_community_messages`). Refleja el estado REAL de la base.
--
-- PRECONDICIONES VERIFICADAS contra la base real ANTES de aplicar (supuestos vs datos):
--   · private._are_friends / _same_community / _is_blocked existen (helpers reutilizados)
--   · community_messages / _cm_rate NO existían · friendships.status solo 'accepted'
--   · publicación supabase_realtime VACÍA (0 tablas) — tal cual §13-BIS afirmó
--
-- CANDADO "quién le escribe a quién": SOLO amistad 'accepted' (_are_friends) O
--   mismo gym (_same_community). Ninguno depende de coach_id/tier client-writable
--   (lección F7). El bloqueo corta DM automáticamente: _are_friends exige 'accepted'
--   (un bloqueo nunca lo es) y _same_community ya excluye bloqueados (c5b).
--
-- DESVIACIÓN ÚNICA vs el DDL literal de §13-BIS.2 (documentada para Fable):
--   `_community_msg_rate_limit()` se marca SECURITY DEFINER. El DDL de §13-BIS.2 lo
--   dejó SECURITY INVOKER sin grants sobre _cm_rate → el trigger corre como el usuario
--   autenticado, que NO tiene privilegio sobre _cm_rate → TODO INSERT de mensaje
--   fallaría con "permission denied for table _cm_rate". SECURITY DEFINER lo corre como
--   dueño (postgres): _cm_rate queda SIN grants y SIN RLS = totalmente inaccesible al
--   cliente (no puede resetear su propio contador → el rate-limit es infalsificable) y
--   el INSERT funciona. Estrictamente más seguro que otorgar INSERT/UPDATE a authenticated.
-- ============================================================================

-- ── Tabla de mensajes ──────────────────────────────────────────────────────
create table public.community_messages (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users(id) on delete cascade,
  to_user    uuid not null references auth.users(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
alter table public.community_messages enable row level security;
alter table public.community_messages replica identity full;  -- Realtime necesita la fila vieja completa en UPDATE (marcar leído)

create index cm_thread_idx on public.community_messages (least(from_user,to_user), greatest(from_user,to_user), created_at);

-- ── Candado de DM: reutiliza helpers existentes (cero relación nueva) ───────
create function private._can_dm(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select private._are_friends(a,b) or private._same_community(a,b);
$$;
revoke all on function private._can_dm(uuid,uuid) from public;
grant execute on function private._can_dm(uuid,uuid) to authenticated, service_role;

-- ── Anti-flood: 30 mensajes/minuto/usuario ─────────────────────────────────
create table public._cm_rate (
  uid    uuid not null,
  minute timestamptz not null,
  count  int not null default 0,
  primary key (uid, minute)
);
-- SECURITY DEFINER (ver DESVIACIÓN arriba): corre como dueño → _cm_rate sin grants
-- ni RLS = intocable por el cliente; el INSERT del mensaje dispara el conteo sin fallar.
create function public._community_msg_rate_limit() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare m timestamptz := date_trunc('minute', now()); n int;
begin
  insert into public._cm_rate(uid, minute, count) values (new.from_user, m, 1)
    on conflict (uid, minute) do update set count = public._cm_rate.count + 1 returning count into n;
  if n > 30 then raise exception 'rate limit exceeded'; end if;
  -- poda oportunista: mantiene _cm_rate acotada (no crece sin fin)
  delete from public._cm_rate where minute < m - interval '10 minutes';
  return new;
end $$;
create trigger trg_cm_rate before insert on public.community_messages
  for each row execute function public._community_msg_rate_limit();

-- ── RLS ────────────────────────────────────────────────────────────────────
create policy cm_sel on public.community_messages for select
  using (auth.uid() in (from_user, to_user));
create policy cm_ins on public.community_messages for insert with check (
  from_user = auth.uid() and from_user <> to_user and private._can_dm(from_user, to_user)
);
-- SOLO el destinatario marca leído; el emisor no puede reescribir su propio texto
create policy cm_upd on public.community_messages for update
  using (to_user = auth.uid()) with check (to_user = auth.uid());

-- ── Grants (columna ÚNICA escribible por el cliente = read_at) ──────────────
revoke all on public.community_messages from anon, authenticated;
grant select, insert on public.community_messages to authenticated;
grant update (read_at) on public.community_messages to authenticated;
grant all on public.community_messages to service_role;
-- _cm_rate: SIN grants a anon/authenticated (solo el trigger definer lo toca)
revoke all on public._cm_rate from anon, authenticated;
grant all on public._cm_rate to service_role;

-- ── Realtime: sin esto no llega ningún evento ──────────────────────────────
alter publication supabase_realtime add table public.community_messages;
