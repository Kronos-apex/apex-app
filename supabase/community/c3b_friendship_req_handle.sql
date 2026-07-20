-- ============================================================================
-- C3.1b · IDENTIDAD DE LA SOLICITUD PENDIENTE (idea #5, Fase 1)
-- ============================================================================
-- Estado: ✅ APLICADO A PRODUCCIÓN (eoebhrxbokyllqalyecj, 2026-07-19) vía apply_migration
-- `c3b_friendship_req_handle`. **DESVIACIÓN de la estipulación C3** (documentada para Fable).
--
-- HUECO DE ARQUITECTURA hallado al ejecutar C3: la RLS `cp_sel` de community_profiles solo deja
-- leer el perfil de un amigo ACEPTADO (private._are_friends → status='accepted'). Una solicitud
-- PENDIENTE, por tanto, solo expondría el UUID del solicitante — el destinatario no vería QUIÉN
-- lo quiere agregar (no puede decidir aceptar/rechazar a ciegas).
--
-- SOLUCIÓN de MÍNIMO privilegio (elegida sobre aflojar la RLS): el handle REAL del solicitante se
-- graba en la fila `friendships`, que AMBAS partes YA ven por `fr_sel` (auth.uid() in user_a,user_b).
--   • NO se toca ninguna policy · NO se filtran las stats (racha/nivel/hoy) antes de 'accepted'
--     (siguen SOLO en community_profiles, tras aceptar).
--   • Anti-spoof: el trigger toma el handle del PERFIL del solicitante (auth.uid()), el cliente NO
--     lo decide. El solicitante debe tener perfil (opt-in) para poder enviar solicitudes.
--   • Inmutable: el trigger de UPDATE congela req_handle (label de la solicitud, no se reescribe).
-- Alternativa descartada: extender cp_sel a solicitudes pendientes → filtraría el snapshot completo
-- del solicitante ANTES de que el destinatario acepte (debilita la garantía "accepted-only").
-- ============================================================================

alter table public.friendships add column req_handle text;

create or replace function public._community_norm_friendship() returns trigger
  language plpgsql set search_path = '' as $$
declare lo uuid; hi uuid;
begin
  lo := least(new.user_a, new.user_b);
  hi := greatest(new.user_a, new.user_b);
  if lo = hi then raise exception 'cannot befriend self'; end if;
  new.user_a := lo; new.user_b := hi;
  new.requested_by := auth.uid();
  new.status := 'pending';
  new.blocked_by := null;
  new.req_handle := (select handle from public.community_profiles where user_id = auth.uid());  -- anti-spoof
  return new;
end $$;

create or replace function public._community_check_transition() returns trigger
  language plpgsql set search_path = '' as $$
declare me uuid := auth.uid();
begin
  new.user_a := old.user_a; new.user_b := old.user_b;
  new.requested_by := old.requested_by; new.created_at := old.created_at;
  new.req_handle := old.req_handle;   -- inmutable
  if me is null or (me <> old.user_a and me <> old.user_b) then raise exception 'not a party'; end if;
  if old.status='pending' and new.status='accepted' then
    if me = old.requested_by then raise exception 'requester cannot accept own request'; end if;
    new.blocked_by := null; return new;
  end if;
  if new.status='blocked' then new.blocked_by := me; return new; end if;
  if old.status='blocked' and new.status <> 'blocked' then
    if me <> old.blocked_by then raise exception 'only blocker can unblock'; end if;
    new.blocked_by := null; return new;
  end if;
  if old.status = new.status then return new; end if;
  raise exception 'invalid transition % -> %', old.status, new.status;
end $$;
