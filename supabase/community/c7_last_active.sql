-- ============================================================================
-- C7 · ② ÚLTIMA CONEXIÓN — last_active (server-set) + etiqueta redondeada opt-in
-- ============================================================================
-- Segundo slice de COMUNIDAD v2. Estipulado por Fable en docs/plan-comunidad.md §13-BIS.4.
-- Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-21, migración `c7_last_active`).
--
-- PRINCIPIO (Fable §13-BIS.4): NUNCA se expone `last_active` crudo (un timestamp fino delata
-- "está con el teléfono AHORA MISMO" — mismo riesgo §11 por el que se retiró trained_today, pero
-- peor). El cliente solo recibe una ETIQUETA YA REDONDEADA ('ahora'/'hoy'/'esta semana'/'hace
-- tiempo'), y solo si el dueño hizo OPT-IN (`show_last_active`, default OFF).
--
-- ESTADO REAL verificado antes de aplicar: last_active/show_last_active NO existían;
-- community_profiles TIENE grants a nivel de COLUMNA para authenticated (16 cols) → una col nueva
-- SIN grant NO es seleccionable por el cliente (justo lo que queremos para last_active).
--
-- DECISIÓN de diseño (por qué DEFINER y no INVOKER, como sugería el sketch de Fable):
-- el grant de columna impide que una función SECURITY INVOKER lea last_active (correría como el
-- cliente, sin grant sobre esa col). La alternativa —dar USAGE del schema `private` a authenticated
-- para delegar a un helper— debilitaría la barrera de TODAS las funciones privadas. Por eso la
-- lectora es SECURITY DEFINER en `public` con su PROPIO chequeo de visibilidad = espejo del `cp_sel`
-- ACTUAL (self OR amigo OR mismo-gym). NOTA: cuando ③ introduzca `private._profile_visible`,
-- UNIFICAR este chequeo con él para no desincronizar (§13-BIS.5 "no se re-inventa la visibilidad").
-- Es un RPC intencional → dispara el advisor 0029 igual que `resolve_share_code` (aceptado por Fable);
-- por eso: REVOCADO de public/anon, EXECUTE solo authenticated (lección de la reserva §14.2).

-- ── Columnas ────────────────────────────────────────────────────────────────
alter table public.community_profiles
  add column last_active      timestamptz,                       -- server-set (edge refresh_snapshot); NUNCA client-writable ni selectable crudo
  add column show_last_active  boolean not null default false;   -- opt-in, preferencia del cliente (default OFF)

-- show_last_active = preferencia del cliente (lee la propia, la edita).
grant select (show_last_active), update (show_last_active) on public.community_profiles to authenticated;

-- ⚠️ last_active NUNCA seleccionable crudo. SORPRESA verificada: el SELECT de authenticated era a
-- NIVEL DE TABLA (relacl `authenticated=rd`) → cubría TODA columna nueva, incluida last_active
-- (probado: `select last_active` devolvía el timestamp). Convertir a column-level EXCLUYENDO
-- last_active (migración `c7b_lock_last_active_select`; patrón §13-BIS.1b, aquí acotado a ②).
-- Tras esto `select last_active`/`select *` crudos → permission denied; el cliente debe pedir
-- columnas explícitas (el frontend ya no usa `select('*')` para el perfil propio).
-- (share_code/consent_* siguen en el grant = deuda preexistente de C1, para el endurecimiento de ③.)
revoke select on public.community_profiles from authenticated;
grant select (user_id, handle, avatar_url, bio, share_code, visible, streak_weeks, sessions_4w,
  level, achievements, trained_today, snapshot_at, created_at, consent_v, consent_at, show_today,
  show_last_active) on public.community_profiles to authenticated;

-- ── Lectura: etiqueta redondeada, en lote, nunca el timestamp crudo ─────────
create function public.cmty_activity_labels(targets uuid[])
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
   and (t.target = auth.uid()
        or private._are_friends(auth.uid(), t.target)
        or private._same_community(auth.uid(), t.target));
$$;
revoke all on function public.cmty_activity_labels(uuid[]) from public, anon;   -- lección reserva §14.2
grant execute on function public.cmty_activity_labels(uuid[]) to authenticated;
grant execute on function public.cmty_activity_labels(uuid[]) to service_role;
