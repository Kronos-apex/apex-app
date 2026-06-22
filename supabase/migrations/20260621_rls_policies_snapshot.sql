-- ════════════════════════════════════════════════════════════════════════
-- SNAPSHOT de RLS — versiona el estado REAL de las policies en producción
-- (proyecto eoebhrxbokyllqalyecj). Generado desde pg_policies en la auditoría
-- 2026-06-21 para que el control de acceso sea AUDITABLE/REPRODUCIBLE desde el
-- repo (antes solo vivía en el dashboard).
--
-- Idempotente (drop+create) → seguro de re-aplicar en un proyecto fresco. NO
-- cambia el comportamiento actual: refleja exactamente lo que ya existe.
-- ════════════════════════════════════════════════════════════════════════

-- ── user_data: la tabla REAL de datos (perfil/rutinas/historial/... por usuario).
-- Modelo correcto: cada quien ve/edita SU fila; el coach ve/edita las de SUS clientes
-- (coach_id = su uid). Verificado seguro en la auditoría.
alter table public.user_data enable row level security;

drop policy if exists user_data_select on public.user_data;
create policy user_data_select on public.user_data
  for select to authenticated
  using ((select auth.uid()) = user_id or (select auth.uid()) = coach_id);

drop policy if exists user_data_insert on public.user_data;
create policy user_data_insert on public.user_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_data_update on public.user_data;
create policy user_data_update on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id or (select auth.uid()) = coach_id)
  with check ((select auth.uid()) = user_id or (select auth.uid()) = coach_id);

drop policy if exists user_data_delete on public.user_data;
create policy user_data_delete on public.user_data
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_data_delete_coach on public.user_data;
create policy user_data_delete_coach on public.user_data
  for delete to public
  using ((select auth.uid()) = coach_id);

-- ── apex_data / apex_data_backups: blob LEGACY. RLS habilitada SIN policies =
-- denegado por defecto (bloqueado a propósito desde 2026-06-03). No se añaden
-- policies a propósito: nadie debe leer/escribir el blob viejo.
alter table public.apex_data enable row level security;
alter table public.apex_data_backups enable row level security;

-- ── push_subscriptions: ⚠️ PENDIENTE DE ENDURECER (auditoría 2026-06-21).
-- Hoy INSERT/UPDATE son permisivos para `anon` (with check = true) porque la
-- suscripción push se escribe client-side sin JWT. Riesgo de baja severidad:
-- un anónimo podría insertar/sobrescribir suscripciones ajenas. Endurecerlo
-- exige mover la escritura al contexto autenticado (auth.uid() = client_id) y
-- AJUSTAR el flujo de subscribePush — hacerlo con cuidado y probar push antes.
-- Se deja el estado ACTUAL documentado (no se cambia aquí para no romper push):
drop policy if exists push_write_insert on public.push_subscriptions;
create policy push_write_insert on public.push_subscriptions
  for insert to anon
  with check (true);

drop policy if exists push_write_update on public.push_subscriptions;
create policy push_write_update on public.push_subscriptions
  for update to anon
  using (true)
  with check (true);
