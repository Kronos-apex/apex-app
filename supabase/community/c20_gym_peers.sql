-- ============================================================================
-- c20 · ¿QUIÉN ES DE MI GYM? — RPC segura (corrección F3 del plan de adopción)
-- ============================================================================
-- A1 (prueba social de la bienvenida) y la sección «Tu gimnasio» decidían la pertenencia con
-- `is_private === true`: «si lo veo y es privado, y aún no tengo perfil, solo puede ser del gym».
-- El proxy se cae en cuanto alguien del gym se hace PÚBLICO (`c11_activate_public` existe justo
-- para eso): pasa a contarse como desconocido de «Descubrir».
--
-- NO es hipotético (datos de prod 2026-07-26): de los 7 perfiles, el ÚNICO público es
-- **el coach dueño del gym** → la línea «X de tu gym ya está aquí» excluía precisamente a la cara
-- que más empuja a activar el perfil, y con 5 privados + 1 público decía «Zulma de tu gym ya está
-- aquí» (singular, escondiendo a los demás).
--
-- POR QUÉ una RPC y no un select: `gm_sel` (c5) solo deja leer TU PROPIA fila del roster
-- (`member_id = auth.uid()`) — a propósito, para que nadie enumere el gym ajeno. El cliente no
-- tiene forma de saber quién más es del gym. Mismo patrón ya sancionado en ② (cmty_activity_labels),
-- moderación y c19 (cmty_follow_counts): DEFINER + reusar el helper de visibilidad que YA existe.
--
-- NO ABRE NADA NUEVO: devuelve exactamente `{x : private._same_community(auth.uid(), x)}`, que es
-- una de las tres ramas de `cp_sel` — todo uid devuelto es de un perfil que el llamante YA puede
-- leer. Hereda gratis la exclusión por bloqueo de c5b (va por el mismo helper, no la reimplementa).
-- No revela el `coach_id`, ni rosters ajenos, ni a nadie de otro gimnasio.
-- ============================================================================

create function public.cmty_gym_peers()
  returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select distinct m.member_id
  from public.community_gym_members m
  where m.member_id <> auth.uid()
    and private._same_community(auth.uid(), m.member_id);
$$;
revoke all on function public.cmty_gym_peers() from public, anon;
grant execute on function public.cmty_gym_peers() to authenticated, service_role;
