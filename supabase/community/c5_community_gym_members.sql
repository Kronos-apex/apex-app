-- ============================================================================
-- C5 · DIRECTORIO DEL GIMNASIO — membresía CONTROLADA POR EL COACH (idea #5, cambio de concepto)
-- ============================================================================
-- Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-20). Refleja el estado REAL.
--
-- POR QUÉ una tabla nueva y no `coach_id`/`tier`: Fable (F7) halló que `user_data.coach_id` es
-- escribible por el cliente (así funciona `requestCoach`); al profundizar, `profile.tier` TAMBIÉN
-- (PATCH→200). Derivar la pertenencia al gym de cualquiera de los dos = un extraño se auto-asigna y
-- se infiltra a ver a los 21 asesorados. Única vía segura: una tabla que SOLO el coach escribe.
--
-- Verificado adversarialmente (API real, cuenta QA): un extraño NO se ve; NO puede agregar a un
-- tercero que no lo declaró como coach (G3), NO escribe en el roster ajeno (G5); un miembro real SÍ
-- ve a sus compañeros (helper true) y a un extraño NO (helper false).
-- ============================================================================

create table public.community_gym_members (
  coach_id   uuid not null references auth.users(id) on delete cascade,
  member_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, member_id)
);  -- (sin check coach<>member: el coach TAMBIÉN se agrega como miembro para participar — decisión #3)
alter table public.community_gym_members enable row level security;

-- ¿v y t son del MISMO gym? = existe un coach que agregó a AMBOS. SECURITY DEFINER (bypassa la RLS de
-- la tabla → sin recursión) + schema private (NO expuesto como RPC).
create function private._same_community(v uuid, t uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.community_gym_members m1
    join public.community_gym_members m2 on m1.coach_id = m2.coach_id
    where m1.member_id = v and m2.member_id = t and v <> t
  );
$$;
revoke all on function private._same_community(uuid,uuid) from public;
grant execute on function private._same_community(uuid,uuid) to authenticated, service_role;

-- INSERT: el coach agrega a sí mismo, o a un miembro que lo tenga a ÉL como coach_id (anti-infiltración
-- del "gym falso": la víctima nunca puso coach_id=atacante → no se le puede agregar). El coach real puede
-- leer las filas de sus clientes (user_data RLS coach_id=auth.uid()) → el EXISTS pasa para ellos.
create policy gm_ins on public.community_gym_members for insert with check (
  coach_id = auth.uid()
  and ( member_id = auth.uid()
        or exists (select 1 from public.user_data ud where ud.user_id = member_id and ud.coach_id = auth.uid()) )
);
create policy gm_del on public.community_gym_members for delete using (coach_id = auth.uid());
-- SELECT mínima (sin recursión): el coach ve su roster; el miembro ve su propia fila. El DESCUBRIMIENTO
-- de compañeros NO lee esta tabla, va por community_profiles + _same_community (definer).
create policy gm_sel on public.community_gym_members for select using (coach_id = auth.uid() or member_id = auth.uid());

revoke all on public.community_gym_members from anon, authenticated;
grant select, insert, delete on public.community_gym_members to authenticated;
grant all on public.community_gym_members to service_role;

-- Visibilidad de perfiles: mío, de un amigo aceptado, O de un compañero de gym.
drop policy cp_sel on public.community_profiles;
create policy cp_sel on public.community_profiles for select
  using (user_id = auth.uid() or private._are_friends(user_id, auth.uid()) or private._same_community(auth.uid(), user_id));
