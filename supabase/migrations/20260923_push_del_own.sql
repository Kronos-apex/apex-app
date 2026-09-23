-- ════════════════════════════════════════════════════════════════════════
-- push_subscriptions — el aparato puede RETIRAR su propia suscripción vieja (v662, 2026-09-23).
--
-- POR QUÉ: la mudanza de la app a app.avientrena.com cambia el ORIGEN, y el permiso de avisos es
-- por origen. Quien reactiva los avisos en el hogar nuevo obtiene un endpoint NUEVO mientras el
-- de github.io SIGUE VIVO (su service worker no muere): sin retirarlo, cada aviso le llegaría DOS
-- veces hasta que la poda de v577 (hermana 21+ días más vieja) lo alcanzara. `subscribePush`
-- borra, justo DESPUÉS de guardar la nueva, la fila del endpoint anterior de ESE mismo aparato.
-- Hasta hoy no había policy de DELETE: el cliente no podía borrar nada (0 filas, sin error).
--
-- Alcance: IDÉNTICO al de push_ins_own / push_upd_own / push_sel_own — cada quien su fila, y el
-- coach (UID fijo, no es credencial) la del literal '_coach'. Nadie borra la de otra persona.
-- Idempotente (drop+create).
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists push_del_own on public.push_subscriptions;
create policy push_del_own on public.push_subscriptions
  for delete to authenticated
  using (
    client_id = ((select auth.uid()))::text
    or (client_id = '_coach'::text and (select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  );
