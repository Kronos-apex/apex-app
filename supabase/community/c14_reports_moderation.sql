-- ============================================================================
-- c14 · ÍTEM #1 lote v3-a — BANDEJA DE REPORTES para el moderador (Fable §8.1)
-- ============================================================================
-- Aplicado a prod 2026-07-22. La deuda: community_reports se llena (reportar ya
-- existe en C3) pero el coach no tenía dónde verlos. Ahora sí.
--
-- Autoridad de moderación = TABLA que solo service_role escribe (community_moderators),
-- NO el role='coach' del perfil (cosmético, derivable/falsificable — F7). Seed una vez
-- por consulta (no UID pegado en repo público) verificado: 1 fila = UID real de Camilo.
-- Lectura/acciones por RPC DEFINER gateada por _is_moderator; community_reports sigue
-- SELLADA para authenticated (sin SELECT). Reportes de/hacia cuentas borradas sobreviven
-- (ON DELETE SET NULL de c1 + LEFT JOIN → handle null → UI «Ya no está en la comunidad»).

create table public.community_moderators (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.community_moderators enable row level security;
create policy mod_sel_self on public.community_moderators for select using (user_id = auth.uid());
revoke all on public.community_moderators from anon, authenticated;
grant select on public.community_moderators to authenticated;
grant all on public.community_moderators to service_role;

-- Seed: dueño de >=5 asesorados (Camilo=22; el coach QA=1 NO pasa). Verificado: 1 fila.
insert into public.community_moderators(user_id)
select ud.coach_id from public.user_data ud
 where ud.coach_id is not null
 group by ud.coach_id having count(*) >= 5
on conflict do nothing;

create function private._is_moderator(u uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.community_moderators m where m.user_id = u);
$$;
revoke all on function private._is_moderator(uuid) from public;
grant execute on function private._is_moderator(uuid) to authenticated, service_role;

-- community_reports: columnas de estado + context (0 filas hoy → constraints limpios)
alter table public.community_reports
  add column status      text not null default 'open' check (status in ('open','resolved')),
  add column resolved_at timestamptz,
  add column resolved_by uuid,
  add column context     text;
alter table public.community_reports add constraint community_reports_context_chk
  check (context is null or context ~ '^(post|comment):[0-9a-fA-F-]{36}$');
alter table public.community_reports add constraint community_reports_reason_len
  check (reason is null or char_length(reason) <= 300);

-- Bandeja del moderador (RPC DEFINER). Excerpt del post reportado; handle null tolerado.
create function public.cmty_mod_reports()
  returns table(rid uuid, rcreated_at timestamptz, rstatus text, rreason text, rcontext text,
                reporter_uid uuid, reporter_handle text, reported_uid uuid, reported_handle text,
                excerpt text)
  language sql stable security definer set search_path = '' as $$
  select r.id, r.created_at, r.status, r.reason, r.context,
         r.reporter, pr.handle, r.reported, pd.handle,
         case
           when r.context like 'post:%' then
             (select left(coalesce(p.payload->>'name','') ||
                          coalesce(' — ' || (p.payload->>'note'), ''), 140)
                from public.community_posts p
               where p.id::text = split_part(r.context, ':', 2))  -- TEXTO a propósito (context malformado → excerpt null, no revienta)
           else null
         end
    from public.community_reports r
    left join public.community_profiles pr on pr.user_id = r.reporter
    left join public.community_profiles pd on pd.user_id = r.reported
   where private._is_moderator(auth.uid())   -- no-moderador → 0 filas, en silencio
   order by (r.status = 'open') desc, r.created_at desc
   limit 200;
$$;
revoke all on function public.cmty_mod_reports() from public, anon;
grant execute on function public.cmty_mod_reports() to authenticated, service_role;

create function public.cmty_mod_resolve(p_report uuid) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if not private._is_moderator(auth.uid()) then raise exception 'not allowed'; end if;
  update public.community_reports
     set status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
   where id = p_report;
end $$;
revoke all on function public.cmty_mod_resolve(uuid) from public, anon;
grant execute on function public.cmty_mod_resolve(uuid) to authenticated, service_role;

-- ── c14b · borrado de contenido reportado por el moderador — RPC DEFINER ──────
-- DESVIACIÓN documentada de §8.1: Fable estipuló que el moderador borra con un DELETE
-- normal del cliente vía rama _is_moderator en cpost_del. NO FUNCIONA: un DELETE cuyo
-- WHERE referencia columnas aplica TAMBIÉN cpost_sel, y el moderador no ve el post de un
-- extraño (cp_sel) → borra 0 filas justo en el caso de moderación. Reproducido con dientes.
-- Fix más SEGURO que ampliar cpost_sel (que daría al moderador lectura de todo el muro):
-- borrar por RPC DEFINER (mínimo privilegio — solo el id que ya vio en la bandeja).
-- cpost_del vuelve a su forma original (solo dueño).
drop policy cpost_del on public.community_posts;
create policy cpost_del on public.community_posts for delete using ( user_id = auth.uid() );

create function public.cmty_mod_delete_post(p_post uuid) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if not private._is_moderator(auth.uid()) then raise exception 'not allowed'; end if;
  delete from public.community_posts where id = p_post;
end $$;
revoke all on function public.cmty_mod_delete_post(uuid) from public, anon;
grant execute on function public.cmty_mod_delete_post(uuid) to authenticated, service_role;

-- Sabotajes R1-R10 verificados (tx+rollback): R1 QA no lee reports crudo · R2 RPC da 0 filas
-- al no-moderador · R3 resolve/R4 auto-moderar/R9b RPC de borrado → denied al QA · R5 moderador
-- ve bandeja con handles + excerpt (load-bearing: quitar su fila de moderators → 0 filas) ·
-- R6 resolve estampa su uid · R7 context válido pasa / malformado bloqueado por check · R8
-- reportado sin perfil → handle null · R9a moderador borra por RPC un post que NO ve · R10 seed=1=Camilo.
