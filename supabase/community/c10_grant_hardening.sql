-- ============================================================================
-- C10 · ③c-1 ENDURECIMIENTO DEL GRANT DE COLUMNAS (§13-BIS.1b)
-- ============================================================================
-- Slice ③c-1. Estipulado por Fable §13-BIS.1b. Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-21,
-- migración `c10_grant_hardening`). ACOPLADO al frontend (mismo deploy) — romper el grant sin
-- actualizar la carga del perfil rompería la comunidad en prod.
--
-- POR QUÉ AHORA: ③a abrió la rama pública de cp_sel (dormida hasta que haya un perfil público). ③c-2
-- permitirá a un ADULTO hacerse público → un DESCONOCIDO podrá leer su fila. Con el grant de tabla/
-- columnas actual ese desconocido leería también share_code (rompe el anti-enumeración de
-- resolve_share_code), consent_v/at (evidencia legal) y birth_date (fecha exacta de un menor). Hay que
-- sacar lo sensible del grant ANTES de que exista el primer perfil público.
--
-- Estado antes (post-c7b): grant de COLUMNAS = 17 (todas menos last_active), + is_private/role de ③a
-- SIN otorgar. Este slice: quita las sensibles, agrega is_private/role (que el frontend de ③c usará).

-- Quitar del grant general lo sensible (nadie los lee AJENOS por API):
revoke select (share_code, consent_v, consent_at, trained_today, snapshot_at)
  on public.community_profiles from authenticated;
-- Agregar las que ③c necesita mostrar (estado público/privado + insignia de rol):
grant select (is_private, role) on public.community_profiles to authenticated;
-- Grant resultante = user_id, handle, avatar_url, bio, visible, is_private, streak_weeks, sessions_4w,
--   level, achievements, role, created_at, show_today, show_last_active.
-- FUERA (nadie ajeno los lee): share_code, consent_v, consent_at, birth_date, last_active,
--   trained_today, snapshot_at. (trained_today/snapshot_at se siguen ESCRIBIENDO server-side por la
--   edge refresh_snapshot por si se usan internamente, pero ya nadie los lee por API — decisión §13.0.)

-- El DUEÑO lee sus PROPIOS secretos (código/consentimiento) sin reabrir el grant general.
-- DESVIACIÓN vs el sketch INVOKER de §13-BIS.1b (mismo motivo que ② cmty_activity_labels): una función
-- INVOKER correría como el cliente, que tras el revoke NO tiene grant sobre share_code → permission
-- denied. DEFINER acotada a `user_id = auth.uid()` (solo TU propia fila) lo resuelve. Revocada de
-- public/anon, EXECUTE solo authenticated → advisor 0029 intencional (como resolve_share_code).
create function public.cmty_my_secrets()
  returns table(share_code text, consent_v text, consent_at timestamptz)
  language sql stable security definer set search_path = '' as $$
  select share_code, consent_v, consent_at from public.community_profiles where user_id = auth.uid();
$$;
revoke all on function public.cmty_my_secrets() from public, anon;
grant execute on function public.cmty_my_secrets() to authenticated;
grant execute on function public.cmty_my_secrets() to service_role;
