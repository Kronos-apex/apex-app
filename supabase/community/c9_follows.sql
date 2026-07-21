-- ============================================================================
-- C9 · ③b SEGUIR — tabla follows (seguir/aprobar, modelo Instagram)
-- ============================================================================
-- Slice ③b. Estipulado por Fable §13-BIS.4. Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-21,
-- migración `c9_follows`). Artefacto refleja el estado real.
--
-- MODELO: seguir a un perfil PÚBLICO = 'active' al instante; seguir a un perfil PRIVADO = 'pending'
-- hasta que el dueño (followee) apruebe. Un bloqueo corta el seguir. NO enumeras la red ajena
-- (fo_sel = solo filas donde eres parte). El seguir NO abre DM (`_can_dm` sigue = amigo O gym; §13-BIS.2).
--
-- DESVIACIÓN vs el DDL literal de §13-BIS.4 (higiene, lección reserva §14.2): se REVOCA execute de las
-- dos funciones-trigger de public/anon/authenticated. Son funciones RETURNS TRIGGER (no invocables
-- directo por RPC); el disparo del trigger NO pasa por el chequeo de EXECUTE del rol que emite el DML
-- (probado en el ①), así que revocar no rompe nada y evita el advisor 0029.
--
-- DECISIÓN ABIERTA marcada para Fable (③c/④): un seguidor APROBADO ('active') de una cuenta PRIVADA
-- hoy NO ve el perfil de esa cuenta — `private._profile_visible` (③a) NO incluye una rama de follows
-- (self/amigo/gym/público). Es decir, aprobar un follow a un privado hoy no otorga visibilidad; eso se
-- resuelve cuando se construya el FEED (④) / la vitrina privada. NO lo decido unilateralmente (es
-- ensanchamiento de visibilidad = terreno de Fable). Se construye follows como MECANISMO; el "qué ve
-- un seguidor aprobado" lo estipula Fable antes de ④.

create table public.follows (
  follower   uuid not null references auth.users(id) on delete cascade,
  followee   uuid not null references auth.users(id) on delete cascade,
  state      text not null default 'pending' check (state in ('active','pending')),
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
alter table public.follows enable row level security;

-- Estado inicial: self→rechaza · bloqueado→rechaza · privado→pending · público→active.
-- SECURITY DEFINER para poder leer is_private de un followee PRIVADO (que el follower no ve por cp_sel).
create function public._community_follow_state() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare tgt_private boolean;
begin
  if new.follower = new.followee then raise exception 'cannot follow self'; end if;
  if private._is_blocked(new.follower, new.followee) then raise exception 'blocked'; end if;
  select is_private into tgt_private from public.community_profiles where user_id = new.followee;
  if tgt_private is null then raise exception 'no target profile'; end if;
  new.state := case when tgt_private then 'pending' else 'active' end;
  return new;
end $$;
revoke all on function public._community_follow_state() from public, anon, authenticated;
grant execute on function public._community_follow_state() to service_role;
create trigger trg_follow_state before insert on public.follows
  for each row execute function public._community_follow_state();

-- Solo el followee aprueba pending→active; NINGUNA otra transición (el solicitante no se auto-aprueba).
create function public._community_follow_accept() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.state = 'pending' and new.state = 'active' then
    if auth.uid() <> old.followee then raise exception 'only followee accepts'; end if;
    return new;
  end if;
  raise exception 'invalid transition';
end $$;
revoke all on function public._community_follow_accept() from public, anon, authenticated;
grant execute on function public._community_follow_accept() to service_role;
create trigger trg_follow_accept before update on public.follows
  for each row execute function public._community_follow_accept();

-- Solo tu propia red (NO enumeración de seguidores ajenos, §13-BIS.4/#14).
create policy fo_sel on public.follows for select using (auth.uid() in (follower, followee));
create policy fo_ins on public.follows for insert with check (follower = auth.uid());
create policy fo_upd on public.follows for update using (auth.uid() in (follower, followee)) with check (auth.uid() in (follower, followee));
create policy fo_del on public.follows for delete using (auth.uid() in (follower, followee));  -- unfollow, cancelar o rechazar/quitar seguidor

revoke all on public.follows from anon, authenticated;
grant select, insert, update, delete on public.follows to authenticated;
grant all on public.follows to service_role;
