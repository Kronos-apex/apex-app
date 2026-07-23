-- ============================================================================
-- c18 · ÍTEM #6 lote v3 — PR PILOTO: publicar un récord de PESO (kind='pr', SOLO COACH)
-- ============================================================================
-- Estipulación escrita por Opus (§8-BIS del plan) desde el análisis (C) de Fable + §6-BIS.3 del PO,
-- porque Fable reservó su sesión de RLS y está sin créditos. PENDIENTE de su verificación vinculante.
--
-- PILOTO SOLO COACH: solo el moderador (dueño de >=5 asesorados = Camilo, tabla community_moderators
-- que solo service_role escribe) puede insertar kind='pr'. Gate server-side, NO falsificable (a
-- diferencia de role/tier, hallazgo F7). JAMÁS un menor (doble candado: cpost_ins + trigger).
-- El dato = UN récord de PESO puntual {exercise_name, value_kg}, nunca historial/gráfica. Anti-cheat
-- de UX (el valor sale de un PR ya registrado, mapeador cliente) — el servidor no lo certifica y no
-- se finge que lo haga. streak/level siguen server-only (los inserta la edge con service_role, que
-- BYPASA RLS → esta policy solo gobierna al cliente authenticated).

alter table public.community_posts drop constraint community_posts_kind_check;
alter table public.community_posts add constraint community_posts_kind_check
  check (kind in ('routine','streak','level','workout','pr'));

-- cpost_ins: 'pr' SOLO al moderador adulto. routine/workout intactos.
drop policy cpost_ins on public.community_posts;
create policy cpost_ins on public.community_posts for insert
  with check (
    user_id = auth.uid()
    and (
      kind in ('routine','workout')
      or ( kind = 'pr'
           and private._is_moderator(auth.uid())
           and not private._is_minor(auth.uid()) )
    )
  );

-- _community_post_validate COMPLETA (c15 + rama 'pr' NUEVA; ramas de hito/workout/rutina byte a byte).
create or replace function public._community_post_validate() returns trigger language plpgsql set search_path = '' as $$
declare k text; ex jsonb; exk text; nkeys int;
begin
  if jsonb_typeof(new.payload) <> 'object' then raise exception 'payload must be object'; end if;

  -- hitos (server-only) --
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

  -- entreno terminado (kind='workout') --
  if new.kind = 'workout' then
    for k in select jsonb_object_keys(new.payload) loop
      if k not in ('name','duration_min','exercises_count','note') then
        raise exception 'forbidden workout key: %', k;
      end if;
    end loop;
    if jsonb_typeof(new.payload->'name') is distinct from 'string' then raise exception 'name must be a string'; end if;
    if char_length(new.payload->>'name') = 0 or char_length(new.payload->>'name') > 80 then raise exception 'name length out of range'; end if;
    if new.payload ? 'duration_min' then
      if jsonb_typeof(new.payload->'duration_min') <> 'number' then raise exception 'duration_min must be a number'; end if;
      if (new.payload->>'duration_min')::numeric < 1 or (new.payload->>'duration_min')::numeric > 600 then raise exception 'duration_min out of range'; end if;
    end if;
    if jsonb_typeof(new.payload->'exercises_count') is distinct from 'number' then raise exception 'exercises_count must be a number'; end if;
    if (new.payload->>'exercises_count')::numeric < 1 or (new.payload->>'exercises_count')::numeric > 60 then raise exception 'exercises_count out of range'; end if;
    if new.payload ? 'note' then
      if jsonb_typeof(new.payload->'note') is distinct from 'string' then raise exception 'note must be a string'; end if;
      if char_length(new.payload->>'note') = 0 or char_length(new.payload->>'note') > 140 then raise exception 'note length out of range'; end if;
    end if;
    return new;
  end if;

  -- récord de PESO (kind='pr'; lo publica el cliente MODERADOR; allow-list estricta) --
  if new.kind = 'pr' then
    if private._is_minor(new.user_id) then raise exception 'pr not allowed for minors'; end if; -- D2: candado explícito, load-bearing cuando se abra
    for k in select jsonb_object_keys(new.payload) loop
      if k not in ('exercise_name','value_kg') then raise exception 'forbidden pr key: %', k; end if;
    end loop;
    if jsonb_typeof(new.payload->'exercise_name') is distinct from 'string' then raise exception 'exercise_name must be a string'; end if;
    if char_length(new.payload->>'exercise_name') = 0 or char_length(new.payload->>'exercise_name') > 80 then raise exception 'exercise_name length out of range'; end if;
    if jsonb_typeof(new.payload->'value_kg') <> 'number' then raise exception 'value_kg must be a number'; end if;
    if (new.payload->>'value_kg')::numeric <= 0 or (new.payload->>'value_kg')::numeric > 1000 then raise exception 'value_kg out of range'; end if;
    return new;
  end if;

  if new.kind <> 'routine' then raise exception 'unsupported kind: %', new.kind; end if;
  -- rutina (byte a byte de c13) --
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

-- Sabotajes PR1-PR7 verificados (tx+rollback, actores sintéticos con perfil):
-- PR1 moderador inserta 'pr' válido → OK · PR2 no-moderador → cpost_ins · PR3 menor (forzado
-- moderador) → trigger _is_minor MUERDE solo · PR4 clave extra/tipo/rango/nombre → trigger ·
-- PR5 user_id ajeno → cpost_ins · PR6 tercero ve/comenta/felicita, dueño borra · PR7 mapeador.
