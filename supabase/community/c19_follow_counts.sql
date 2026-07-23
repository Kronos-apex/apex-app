-- ============================================================================
-- c19 · PERFIL DE OTRO USUARIO — conteo de seguidores/seguidos (RPC segura)
-- ============================================================================
-- La pantalla de perfil (tocar a un amigo → ver su perfil) quiere mostrar «N seguidores ·
-- sigue a M». Pero la RLS de `follows` (fo_sel) SOLO deja ver filas donde el que consulta es
-- follower o followee → NADIE puede contar los seguidores de OTRA persona con un select normal.
-- Igual que en ② (última conexión) y en la moderación: se resuelve con una RPC DEFINER gateada
-- por la visibilidad del perfil objetivo. Devuelve SOLO conteos (nunca la LISTA de quién sigue a
-- quién — eso expondría el grafo social de un tercero, decisión que no se toma aquí). 0 filas si
-- no puedo ver ese perfil (el caller no pinta nada). Solo `state='active'` (una solicitud pendiente
-- no cuenta como seguidor). Espejo de la regla de oro §13-BIS.5: reusa `_profile_visible`, no
-- reinventa visibilidad.

create function public.cmty_follow_counts(target uuid)
  returns table(followers int, following int)
  language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::int from public.follows f where f.followee = target and f.state = 'active'),
    (select count(*)::int from public.follows f where f.follower = target and f.state = 'active')
  where target = auth.uid() or private._profile_visible(auth.uid(), target);
$$;
revoke all on function public.cmty_follow_counts(uuid) from public, anon;
grant execute on function public.cmty_follow_counts(uuid) to authenticated, service_role;
