-- 20261121_user_data_campos_del_coach.sql — LOS CAMPOS DE NEGOCIO SON DEL COACH (hallazgo del 14-nov)
--
-- 🔴 EL HUECO: la política `user_data_update` deja a cada asesorado hacer UPDATE de SU fila
-- (auth.uid() = user_id). La política decide FILAS, no COLUMNAS: con su propia sesión y la API,
-- un asesorado podía escribirse `profile.payments`, `profile.tier`, `profile.suspended`,
-- `profile.courtesy`, `profile.proTrialUntil`, `role` o `coach_id`. O sea, darse PRO gratis, borrarse
-- la deuda o quitarse la suspensión. También podía borrar su fila y volverla a crear con esos campos.
--
-- 🔑 EL ARREGLO: un trigger BEFORE INSERT OR UPDATE que, cuando escribe el DUEÑO de la fila y no es
-- el coach, devuelve EN SILENCIO los campos del coach a lo que ya había (no lanza error: el guardado
-- normal de la app sube el perfil entero desde su caché y debe seguir funcionando; la nube manda).
--   · UPDATE  → role, coach_id y las claves del perfil del coach vuelven a OLD (si no existían, se quitan).
--   · INSERT  → la fila nueva nace como la del registro normal: role 'client', tier 'libre', sin payments,
--               suspended ni courtesy, y con la prueba PRO acotada a ~30 días. Cierra «borrar y recrear».
--   · Sin uid (service role, SQL, migraciones) → no se toca.
--   · El coach (uid = OLD.coach_id) y la fila propia del coach (OLD.role = 'coach') → sin cambios.
-- INSERT con la fila ya existente (el upsert de la app dispara primero el INSERT): se deja pasar, porque
-- la rama UPDATE que sigue decide con los valores viejos.
-- SECURITY DEFINER con search_path fijo: el INSERT comprueba que el coach_id sea un coach de verdad
-- (fila con role 'coach'), y con RLS el asesorado no ve esa fila. auth.uid() sigue leyendo el JWT.
-- (Una función de trigger no se puede llamar suelta: «trigger functions can only be called as triggers».)

create or replace function public.user_data_campos_del_coach()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid  uuid := auth.uid();
  v_base jsonb;
  v_k    text;
  v_fin  timestamptz;
  -- claves de negocio dentro de `profile` (plata y acceso). NO van `coach_id` del perfil (lo escribe el
  -- asesorado al pedir coach, app-3-coach.js `c.coach_id=COACH_UID`; el candado de RLS es la COLUMNA, que
  -- sí se protege abajo) ni `limitReviewedAt` (recordatorio de condiciones, no es plata ni acceso).
  v_claves constant text[] := array['payments','tier','suspended','courtesy','proTrialUntil'];
begin
  if v_uid is null then
    return new;                                   -- service role / SQL / migraciones
  end if;

  if tg_op = 'UPDATE' then
    if v_uid is distinct from old.user_id then return new; end if;     -- no es el dueño
    if v_uid is not distinct from old.coach_id then return new; end if; -- es su coach
    if old.role = 'coach' then return new; end if;                      -- fila propia del coach

    new.role     := old.role;
    new.coach_id := old.coach_id;

    if new.profile is null and old.profile is null then return new; end if;
    v_base := case when jsonb_typeof(new.profile) = 'object' then new.profile else '{}'::jsonb end;
    foreach v_k in array v_claves loop
      if jsonb_typeof(old.profile) = 'object' and old.profile ? v_k then
        v_base := jsonb_set(v_base, array[v_k], old.profile -> v_k);
      else
        v_base := v_base - v_k;
      end if;
    end loop;
    new.profile := v_base;
    return new;
  end if;

  -- INSERT
  if v_uid is distinct from new.user_id then return new; end if;
  if exists (select 1 from public.user_data u where u.user_id = new.user_id) then
    return new;                                   -- upsert sobre fila existente: decide la rama UPDATE
  end if;

  new.role := 'client';
  -- El coach de una fila nueva tiene que ser un COACH DE VERDAD (fila con role 'coach'). Sin esto, el
  -- asesorado borraba su fila y la volvía a crear con coach_id = él mismo (o una segunda cuenta suya):
  -- desde ahí la rama UPDATE lo trataba como su coach y el candado no servía. Por eso la función es
  -- SECURITY DEFINER: con RLS el asesorado no ve la fila del coach y el EXISTS daría siempre falso.
  if new.coach_id is not null and not exists (
       select 1 from public.user_data u where u.user_id = new.coach_id and u.role = 'coach') then
    new.coach_id := null;
  end if;
  v_base := case when jsonb_typeof(new.profile) = 'object' then new.profile else '{}'::jsonb end;
  v_base := v_base - 'payments' - 'suspended' - 'courtesy';
  v_base := jsonb_set(v_base, '{tier}', '"libre"'::jsonb);
  if v_base ? 'proTrialUntil' then
    begin
      v_fin := (v_base ->> 'proTrialUntil')::timestamptz;
    exception when others then
      v_fin := null;
    end;
    if v_fin is null or v_fin > now() + interval '31 days' then
      v_base := jsonb_set(v_base, '{proTrialUntil}',
        to_jsonb(to_char((now() + interval '30 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
    end if;
  end if;
  new.profile := v_base;
  return new;
end
$fn$;

drop trigger if exists user_data_campos_del_coach on public.user_data;
create trigger user_data_campos_del_coach
  before insert or update on public.user_data
  for each row execute function public.user_data_campos_del_coach();
