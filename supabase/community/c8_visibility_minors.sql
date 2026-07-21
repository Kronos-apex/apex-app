-- ============================================================================
-- C8 · ③a NÚCLEO DE VISIBILIDAD PÚBLICO/PRIVADO + PROTECCIÓN DE MENORES
-- ============================================================================
-- Fundación del slice ③ (perfil público + seguir). Estipulado por Fable §13-BIS.1a/§13-BIS.3/§13-BIS.5.
-- Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-21, migración `c8_visibility_minors`).
--
-- POR QUÉ IMPORTA: ③ abre perfiles públicos DESCUBRIBLES (giro Instagram del PO). Hay MENORES REALES
-- en la base (Fable verificó: 16-17 años) + auto-registrados sin edad. La RLS pasa de "solo amigos/
-- gym" a "público salvo cuenta privada; menor ⇒ forzado privado y no descubrible". Este slice pone la
-- FUNDACIÓN segura ANTES de cualquier UI: nace TODO privado, nadie es público todavía (birth_date null
-- ⇒ el trigger fuerza is_private=true para todos), así la rama pública queda DORMIDA hasta que ③c
-- (edge activate_public_profile, con verificación de edad server-side) permita a un ADULTO abrirse.
--
-- ESTE SLICE NO TOCA: el grant de columnas (§13-BIS.1b, va acoplado al frontend en ③c porque romper el
-- grant sin actualizar la carga del perfil rompería prod), la edge, ni `role` populado (columna añadida
-- pero queda 'client' para todos; se fija server-side en ③c — el trigger de Fable que leía user_data.role
-- es INSEGURO: `user_data.role` es CLIENT-WRITABLE, probado 2026-07-21, un asesorado se auto-nombró coach
-- → lección F7 → `role` se derivará de "posee asesorados", verificado en la edge con service_role).
--
-- DEFAULT is_private = TRUE (§13-BIS.1a): las 2 filas que YA existen en prod (opt-in de Fase 1 bajo el
-- modelo "solo amigos/gym") NO pueden volverse públicas retroactivamente sin consentir. Conservador.

-- ── Columnas ────────────────────────────────────────────────────────────────
alter table public.community_profiles
  add column is_private  boolean not null default true,                          -- SIEMPRE privado por default
  add column birth_date  date,                                                    -- SOLO la edge (③c) la escribe; NUNCA client-writable ni en el grant
  add column role        text not null default 'client' check (role in ('coach','client'));  -- populado seguro en ③c (no desde user_data.role, F7)

-- ── Menor infalsificable: calculado EN VIVO desde birth_date, fail-safe TRUE ──
create function private._is_minor(u uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select date_part('year', age(now(), cp.birth_date)) < 18 from public.community_profiles cp where cp.user_id = u),
    true    -- SIN fecha confirmada = tratar como menor (fail-safe, jamás fail-open)
  );
$$;
revoke all on function private._is_minor(uuid) from public;
grant execute on function private._is_minor(uuid) to authenticated, service_role;

-- ── El candado REAL es un TRIGGER (no la app): menor o sin fecha ⇒ is_private=true, SIEMPRE ──
create function public._community_enforce_minor_privacy() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.birth_date is null or date_part('year', age(now(), new.birth_date)) < 18 then
    new.is_private := true;   -- pisa lo que mande el cliente, en INSERT y en UPDATE
  end if;
  return new;
end $$;
create trigger trg_enforce_minor_privacy before insert or update on public.community_profiles
  for each row execute function public._community_enforce_minor_privacy();

-- ── Helper de visibilidad ÚNICO (§13-BIS.5: no se re-inventa la visibilidad) ──
-- Reemplaza la condición inline de cp_sel. Lo usan cp_sel, cmty_activity_labels (②, unificado aquí) y
-- lo usará community_posts (④). Cambiar quién-ve-a-quién = un solo lugar.
create function private._profile_visible(viewer uuid, owner uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select owner = viewer
    or private._are_friends(owner, viewer)
    or private._same_community(viewer, owner)
    or ( coalesce((select not is_private from public.community_profiles where user_id = owner), false)
         and not private._is_minor(owner) );   -- rama pública: público real Y no menor (doble candado)
$$;
revoke all on function private._profile_visible(uuid,uuid) from public;
grant execute on function private._profile_visible(uuid,uuid) to authenticated, service_role;

-- ── cp_sel v2 — reemplaza la de C5/c5b, unificada en el helper ──
drop policy cp_sel on public.community_profiles;
create policy cp_sel on public.community_profiles for select
  using ( private._profile_visible(auth.uid(), user_id) );

-- ── Unificar ② cmty_activity_labels con el helper (cierra la deuda anotada en §13-BIS.5) ──
create or replace function public.cmty_activity_labels(targets uuid[])
  returns table(uid uuid, label text)
  language sql stable security definer set search_path = '' as $$
  select t.target as uid,
    case
      when p.last_active is null            then null
      when not p.show_last_active           then null
      when p.last_active > now() - interval '30 minutes' then 'ahora'
      when p.last_active > now() - interval '1 day'      then 'hoy'
      when p.last_active > now() - interval '7 days'     then 'esta semana'
      else 'hace tiempo'
    end as label
  from unnest(targets) as t(target)
  left join public.community_profiles p
    on p.user_id = t.target
   and private._profile_visible(auth.uid(), t.target);   -- antes: chequeo inline (self/amigo/gym); ahora incluye pública real
$$;
