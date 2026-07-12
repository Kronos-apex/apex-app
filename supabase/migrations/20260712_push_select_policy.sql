-- ════════════════════════════════════════════════════════════════════════
-- push_subscriptions — estado REAL de las policies en producción (2026-07-12).
-- Refresca la sección de push del snapshot 2026-06-21, que había quedado
-- DESACTUALIZADA (nombraba push_write_insert/update; hoy son push_ins_own/
-- push_upd_own) y — crítico — NO tenía la policy de SELECT.
--
-- POR QUÉ ESTA MIGRACIÓN EXISTE (bug cazado 2026-07-12): la app guarda la
-- suscripción con .upsert() (INSERT ... ON CONFLICT DO UPDATE). Postgres EXIGE
-- poder LEER la fila para resolver el conflicto → sin policy de SELECT, RLS
-- rechazaba TODO upsert con 403 (insufficient_privilege) para coach y asesorados
-- → CERO suscritos por meses. v323 (fetch->cliente auth) fue necesario pero NO
-- suficiente: el token nunca fue el bloqueante, era la policy SELECT que faltaba.
-- Regla que deja: toda tabla con upsert desde el cliente necesita INSERT+UPDATE+SELECT.
--
-- Idempotente (drop+create). Alcance: cada quien ve/escribe SU fila; el coach
-- (UID fijo, no es secreto — no es credencial) usa el client_id especial '_coach'.
-- ════════════════════════════════════════════════════════════════════════

alter table public.push_subscriptions enable row level security;

-- INSERT: fila propia (client_id = uid) o la del coach ('_coach' con el UID del coach).
drop policy if exists push_ins_own on public.push_subscriptions;
create policy push_ins_own on public.push_subscriptions
  for insert to authenticated
  with check (
    client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  );

-- UPDATE: mismo alcance (el upsert cae acá al re-suscribir el mismo endpoint).
drop policy if exists push_upd_own on public.push_subscriptions;
create policy push_upd_own on public.push_subscriptions
  for update to authenticated
  using (
    client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  )
  with check (
    client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  );

-- SELECT: EL FIX DE HOY. Sin esto, el upsert no puede resolver el conflicto → 403.
drop policy if exists push_sel_own on public.push_subscriptions;
create policy push_sel_own on public.push_subscriptions
  for select to authenticated
  using (
    client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  );
