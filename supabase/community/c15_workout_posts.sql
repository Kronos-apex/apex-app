-- ============================================================================
-- c15 · ÍTEMS #2+#3 lote v3-a — ENTRENO TERMINADO como post + NOTA CORTA (Fable §8.2)
-- ============================================================================
-- Aplicado a prod 2026-07-22 (avi-v389). Artefacto recuperado de la historia de
-- migraciones el 2026-07-23: se aplicó por MCP pero no se versionó en el repo, contra
-- la convención de supabase/community/ (cuerpo idéntico al aplicado, verificado contra
-- supabase_migrations.schema_migrations).
--
-- kind nuevo 'workout' (lo inserta el cliente); los hitos siguen siendo server-only.
alter table public.community_posts drop constraint community_posts_kind_check;
alter table public.community_posts add constraint community_posts_kind_check
  check (kind in ('routine','streak','level','workout'));

drop policy cpost_ins on public.community_posts;
create policy cpost_ins on public.community_posts for insert
  with check ( user_id = auth.uid() and kind in ('routine','workout') );

-- Rate-limit de posts (deuda de c12): 5/min por usuario; la edge (service_role, auth.uid() null) exenta.
create table public._cpost_rate (
  uid uuid not null, minute timestamptz not null, count int not null default 0,
  primary key (uid, minute)
);
create function public._community_post_rate_limit() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare m timestamptz := date_trunc('minute', now()); n int;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then return new; end if;
  insert into public._cpost_rate(uid, minute, count) values (new.user_id, m, 1)
    on conflict (uid, minute) do update set count = public._cpost_rate.count + 1 returning count into n;
  if n > 5 then raise exception 'rate limit exceeded'; end if;
  delete from public._cpost_rate where minute < m - interval '10 minutes';
  return new;
end $$;
revoke execute on function public._community_post_rate_limit() from public, anon, authenticated;
create trigger trg_cpost_rate before insert on public.community_posts
  for each row execute function public._community_post_rate_limit();
revoke all on public._cpost_rate from anon, authenticated;
grant all on public._cpost_rate to service_role;

-- _community_post_validate COMPLETA (c13 + rama workout nueva; ramas de hito y rutina byte a byte)
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

  -- entreno terminado (kind='workout'; lo inserta el cliente, allow-list estricta) --
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
