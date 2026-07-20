-- ============================================================================
-- C5b · RESERVA DE FABLE: el BLOQUEO debe ocultar DENTRO del gym
-- ============================================================================
-- Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-20, migración `c5_block_hides_in_gym`).
-- Refleja el estado REAL de la base.
--
-- HALLAZGO (re-verificación de Fable de C5, plan-comunidad.md §12): la política `cp_sel` de
-- community_profiles = `propio OR _are_friends OR _same_community`. La rama de gym (_same_community)
-- NO miraba bloqueos → dos compañeros de gym se veían el perfil aunque uno bloqueara al otro.
-- REGRESIÓN: antes de C5, bloquear quitaba la visibilidad (la única rama era _are_friends, que
-- exige 'accepted'). Relevante para §11 (una asesorada que bloquea a un compañero espera desaparecer
-- de él). No es infiltración (el bloqueado ya era del mismo gym) pero sí un hueco de expectativa.
--
-- REPRODUCIDO antes del fix (tx con rollback, dos usuarios reales del mismo gym + amistad 'blocked'):
--   private._same_community(a,b) = TRUE  (bug)  ·  private._are_friends(a,b) = false
-- VERIFICADO tras el fix (misma tx):
--   gym SIN bloqueo → _same_community = true (sigue funcionando)
--   gym CON bloqueo → _same_community = false (ambas direcciones) · _is_blocked = true
--
-- FIX: _same_community excluye pares con una amistad 'blocked'. La rama _are_friends ya era segura
-- (blocked != accepted). Helper _is_blocked simétrico (least/greatest, igual que _are_friends),
-- SECURITY DEFINER + schema private (NO expuesto como RPC → no dispara el advisor 0029). Advisor de
-- seguridad sin regresión.
-- ============================================================================

-- ¿Existe una amistad 'blocked' entre u1 y u2? (par canónico least/greatest). SECURITY DEFINER
-- para poder leer friendships sin la RLS del llamante; private para no exponerlo como RPC.
create function private._is_blocked(u1 uuid, u2 uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.friendships f
    where f.status = 'blocked' and f.user_a = least(u1,u2) and f.user_b = greatest(u1,u2)
  );
$$;
revoke all on function private._is_blocked(uuid,uuid) from public;
grant execute on function private._is_blocked(uuid,uuid) to authenticated, service_role;

-- ¿v y t son del MISMO gym Y NO se han bloqueado? El bloqueo oculta también dentro del gym.
create or replace function private._same_community(v uuid, t uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.community_gym_members m1
    join public.community_gym_members m2 on m1.coach_id = m2.coach_id
    where m1.member_id = v and m2.member_id = t and v <> t
  ) and not private._is_blocked(v, t);
$$;
