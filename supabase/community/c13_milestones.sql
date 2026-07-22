-- ============================================================================
-- C13 · R2 HITOS EN EL MURO (streak / level) — server-side, NO inflables
-- ============================================================================
-- ESTIPULADO POR FABLE (docs/plan-comunidad-reforma.md §R2, veredicto 2026-07-22,
-- commit `070de89`). Opus ejecuta tal cual; Fable re-verifica con sabotaje.
--
-- QUÉ ABRE: el muro deja de depender de que alguien publique una rutina a mano —
-- celebra HITOS de constancia (racha cumplida, subida de nivel). El punto crítico:
-- un hito NO lo publica el cliente (si no, cualquiera falsea "rompí un récord").
-- Se emite en el SERVIDOR desde la edge `refresh_snapshot`, con service_role.
--
-- DECISIONES DE PRODUCTO DEL PO (2026-07-22):
--   · Umbrales de racha = {2, 4, 8, 12, 24, 52} semanas (lista FIJA server-side).
--   · `'pr'` (récord personal) queda FUERA de v1 — Fable §R2(c): el peso es
--     AUTOREPORTADO por el usuario; celebrarlo sería publicar un logro derivado de
--     un número que él mismo tecleó (la misma clase de riesgo que ④ excluyó del
--     payload de rutina). Si se retoma, es un diseño anti-cheat aparte.
--   · Opt-in `show_milestones` nace `false` y vive como toggle en Ajustes (NO se
--     agrega a la pantalla de consentimiento inicial: no ensancha el consentimiento
--     ya firmado; quien lo quiera lo enciende).
--   · Poda = 90 días para los hitos (los posts de rutina NO se podan).
--
-- DESVIACIÓN DE IMPLEMENTACIÓN (documentada, R4.2): el sketch de Fable §R2(e) usaba
-- `jsonb_object_keys(new.payload) is distinct from array['weeks']`. `jsonb_object_keys`
-- es SET-RETURNING → esa comparación no es SQL válido. Se implementa la MISMA regla
-- (exactamente una clave, la permitida) con el patrón de bucle que ya usa la rama
-- 'routine' de esta misma función. Intención idéntica, sintaxis correcta.

-- ── ①  Opt-in propio del hito (Fable §R2(f)) ────────────────────────────────────
-- Flag NUEVO: un hito es más ruidoso socialmente que la etiqueta de última conexión
-- (aparece en el MURO de otros, no en una tarjeta al consultar el perfil) → su propio
-- consentimiento, default FALSE (mismo patrón conservador que is_private/show_last_active).
alter table public.community_profiles add column show_milestones boolean not null default false;
grant update(show_milestones) on public.community_profiles to authenticated;

-- ── ②  kinds nuevos + EL CANDADO: el cliente SOLO puede insertar 'routine' ──────
-- (Fable §R2(b)) No basta con "la mecánica está pensada para que no lo haga": se cierra
-- en la policy. service_role no pasa por RLS → los hitos SOLO entran por la edge.
alter table public.community_posts drop constraint community_posts_kind_check;
alter table public.community_posts add constraint community_posts_kind_check
  check (kind in ('routine','streak','level'));

drop policy cpost_ins on public.community_posts;
create policy cpost_ins on public.community_posts for insert
  with check ( user_id = auth.uid() and kind = 'routine' );

-- ── ③  Allow-list del payload por kind (Fable §R2(e)) ───────────────────────────
-- Ningún ejercicio, peso, kg ni texto libre en un hito: solo el número que YA es
-- público en el perfil (streak_weeks/level son visibles hoy vía community_profiles
-- para quien tenga acceso al perfil). La rama 'routine' queda EXACTAMENTE igual.
create or replace function public._community_post_validate() returns trigger language plpgsql set search_path = '' as $$
declare k text; ex jsonb; exk text; nkeys int;
begin
  if jsonb_typeof(new.payload) <> 'object' then raise exception 'payload must be object'; end if;

  -- ── hitos (solo los emite service_role vía la edge; cpost_ins impide al cliente) ──
  if new.kind = 'streak' or new.kind = 'level' then
    select count(*) into nkeys from jsonb_object_keys(new.payload);
    if nkeys <> 1 then raise exception 'milestone payload must have exactly one key'; end if;
    if new.kind = 'streak' then
      if not (new.payload ? 'weeks') then raise exception 'forbidden streak payload key'; end if;
      if jsonb_typeof(new.payload->'weeks') <> 'number' then raise exception 'weeks must be a number'; end if;
      if (new.payload->>'weeks')::numeric <= 0 or (new.payload->>'weeks')::numeric > 520 then raise exception 'weeks out of range'; end if;
    else
      if not (new.payload ? 'level') then raise exception 'forbidden level payload key'; end if;
      if jsonb_typeof(new.payload->'level') <> 'number' then raise exception 'level must be a number'; end if;
      if (new.payload->>'level')::numeric <= 0 or (new.payload->>'level')::numeric > 5 then raise exception 'level out of range'; end if;
    end if;
    return new;
  end if;

  if new.kind <> 'routine' then raise exception 'unsupported kind: %', new.kind; end if;
  -- (el resto = validación de 'routine', sin un solo cambio respecto de c12)
  for k in select jsonb_object_keys(new.payload) loop
    if k not in ('name','days','exercises') then raise exception 'forbidden payload key: %', k; end if;
  end loop;
  if jsonb_typeof(new.payload->'name') is distinct from 'string' then raise exception 'name must be a string'; end if;
  if char_length(new.payload->>'name') = 0 or char_length(new.payload->>'name') > 80 then raise exception 'name length out of range'; end if;
  if new.payload ? 'days' then
    if jsonb_typeof(new.payload->'days') not in ('string','array') then raise exception 'days must be string or array'; end if;
    if jsonb_typeof(new.payload->'days') = 'string' and char_length(new.payload->>'days') > 60 then raise exception 'days too long'; end if;
    if jsonb_typeof(new.payload->'days') = 'array' and jsonb_array_length(new.payload->'days') > 7 then raise exception 'too many days'; end if;
  end if;
  if jsonb_typeof(new.payload->'exercises') <> 'array' then raise exception 'exercises must be an array'; end if;
  if jsonb_array_length(new.payload->'exercises') = 0 or jsonb_array_length(new.payload->'exercises') > 40 then raise exception 'exercises count out of range'; end if;
  for ex in select jsonb_array_elements(new.payload->'exercises') loop
    if jsonb_typeof(ex) <> 'object' then raise exception 'each exercise must be an object'; end if;
    for exk in select jsonb_object_keys(ex) loop
      if exk not in ('name','muscle','sets','reps','type') then raise exception 'forbidden exercise key: %', exk; end if;
    end loop;
    if jsonb_typeof(ex->'name') is distinct from 'string' then raise exception 'exercise name must be a string'; end if;
    if char_length(ex->>'name') = 0 or char_length(ex->>'name') > 80 then raise exception 'exercise name out of range'; end if;
    if ex ? 'muscle' and char_length(ex->>'muscle') > 40 then raise exception 'muscle too long'; end if;
    if ex ? 'type'   and char_length(ex->>'type')   > 20 then raise exception 'type too long'; end if;
    if ex ? 'sets' and char_length(ex->>'sets') > 20 then raise exception 'sets too long'; end if;
    if ex ? 'reps' and char_length(ex->>'reps') > 20 then raise exception 'reps too long'; end if;
  end loop;
  return new;
end $$;
revoke all on function public._community_post_validate() from public, anon, authenticated;
grant execute on function public._community_post_validate() to service_role;

-- ── ④  Anti-duplicado (Fable §R2(g)) ────────────────────────────────────────────
-- `refresh_snapshot` corre con debounce de 30min pero puede correr varias veces el
-- mismo día: el índice único + ON CONFLICT DO NOTHING hacen la emisión idempotente.
create unique index community_posts_streak_uq on public.community_posts(user_id, (payload->>'weeks')) where kind = 'streak';
create unique index community_posts_level_uq  on public.community_posts(user_id, (payload->>'level')) where kind = 'level';

-- ── HOTFIX c13b (2026-07-22) ───────────────────────────────────────────────────
-- La versión original de este archivo dio grant update(show_milestones) pero NO el
-- SELECT. El SELECT de community_profiles es a nivel de COLUMNA (c10_grant_hardening),
-- así que el cliente recibía permission denied al pedirla y cmtyLoad lanzaba → TODA la
-- pestaña Comunidad caía a «Conéctate para ver a tu gente». Migración c13b:
grant select(show_milestones) on public.community_profiles to authenticated;
