-- ════════════════════════════════════════════════════════════════════════
-- SNAPSHOT DE RLS — estado REAL y COMPLETO en producción al 2026-07-12.
-- Regenerado desde pg_policies (proyecto eoebhrxbokyllqalyecj) para que el
-- control de acceso vuelva a ser AUDITABLE/REPRODUCIBLE desde el repo.
--
-- SUPERSEDE a 20260621_rls_policies_snapshot.sql, que había quedado DESACTUALIZADO
-- (nombraba push_write_insert/update; hoy son push_ins_own/upd_own/sel_own) — deuda
-- cazada en la auditoría de sesión 2026-07-12. Incluye push_sel_own (el fix del día,
-- documentado con su "por qué" en 20260712_push_select_policy.sql).
--
-- Idempotente (drop+create) → seguro de re-aplicar en un proyecto fresco. Refleja
-- EXACTAMENTE lo que ya existe; NO cambia comportamiento.
-- ════════════════════════════════════════════════════════════════════════

-- ── user_data: cada quien ve/edita SU fila; el coach las de SUS clientes (coach_id).
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

-- Nota: esta policy quedó con rol `public` en prod (no `authenticated`). Funcionalmente
-- inocuo (anon tiene auth.uid()=null → null=coach_id es false → no borra), pero se
-- refleja como está. Candidata a normalizar a `authenticated` en una limpieza futura.
drop policy if exists user_data_delete_coach on public.user_data;
create policy user_data_delete_coach on public.user_data
  for delete to public
  using ((select auth.uid()) = coach_id);

-- ── push_subscriptions: fila propia o '_coach' (UID del coach). Las 3 (ins/upd/SEL).
-- El SELECT es obligatorio porque la app guarda con upsert (INSERT ON CONFLICT) → ver
-- 20260712_push_select_policy.sql para el detalle del bug que lo destapó.
alter table public.push_subscriptions enable row level security;

drop policy if exists push_ins_own on public.push_subscriptions;
create policy push_ins_own on public.push_subscriptions
  for insert to authenticated
  with check (client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid));

drop policy if exists push_upd_own on public.push_subscriptions;
create policy push_upd_own on public.push_subscriptions
  for update to authenticated
  using (client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid))
  with check (client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid));

drop policy if exists push_sel_own on public.push_subscriptions;
create policy push_sel_own on public.push_subscriptions
  for select to authenticated
  using (client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid));

-- ── app_errors: telemetría. Cualquiera puede INSERTAR (reportar un error); solo el coach LEE.
alter table public.app_errors enable row level security;

drop policy if exists app_errors_insert on public.app_errors;
create policy app_errors_insert on public.app_errors
  for insert to anon, authenticated
  with check (true);

drop policy if exists app_errors_select_coach on public.app_errors;
create policy app_errors_select_coach on public.app_errors
  for select to authenticated
  using ((select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid);

-- ── storage.objects (bucket apex-photos): el dueño escribe SU carpeta, o el coach la de
-- SUS clientes (join a user_data.coach_id). ⚠️ DEUDA CONOCIDA (backlog 2026-07-12): la app
-- nombra la carpeta con el ID LEGACY del asesorado (no su uuid) → foldername[1] nunca matchea
-- ni auth.uid() ni user_id → las subidas fallan y caen a base64. ADEMÁS falta una policy
-- SELECT (el upload usa x-upsert → mismo patrón que el bug de push). El fix seguro (rutas
-- por uuid + policy SELECT) está pendiente; este snapshot refleja el estado ACTUAL tal cual.
drop policy if exists apex_photos_owner_insert on storage.objects;
create policy apex_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'apex-photos'
    and ((storage.foldername(name))[1] = (auth.uid())::text
      or exists (select 1 from public.user_data ud
        where (ud.user_id)::text = (storage.foldername(name))[1] and ud.coach_id = auth.uid())));

drop policy if exists apex_photos_owner_update on storage.objects;
create policy apex_photos_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'apex-photos'
    and ((storage.foldername(name))[1] = (auth.uid())::text
      or exists (select 1 from public.user_data ud
        where (ud.user_id)::text = (storage.foldername(name))[1] and ud.coach_id = auth.uid())))
  with check (bucket_id = 'apex-photos'
    and ((storage.foldername(name))[1] = (auth.uid())::text
      or exists (select 1 from public.user_data ud
        where (ud.user_id)::text = (storage.foldername(name))[1] and ud.coach_id = auth.uid())));

drop policy if exists apex_photos_owner_delete on storage.objects;
create policy apex_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'apex-photos'
    and ((storage.foldername(name))[1] = (auth.uid())::text
      or exists (select 1 from public.user_data ud
        where (ud.user_id)::text = (storage.foldername(name))[1] and ud.coach_id = auth.uid())));
