-- v756 (2ª parte) · La tienda la prende o la apaga el COACH, persona por persona.
--
-- 🎯 `user_data.profile->>'tiendaVer'` tiene tres estados:
--      true  → la ve y puede pedir          false → no la ve ni puede pedir
--      ausente → regla por defecto: la ve quien entrena con el coach (plan distinto de 'libre' y de 'app'); Libres y PRO no.
--    Sigue exigiendo `user_data.coach_id` = el coach. La regla la hace cumplir la BASE (tienda_catalogo y tienda_pedir): una
--    cuenta que el coach no prendió no puede pedir aunque intente hacer trampa desde la API.
-- 🔒 `tiendaVer` es una clave del COACH, igual que payments, tier, suspended, courtesy y proTrialUntil: el trigger
--    `user_data_campos_del_coach` la devuelve a lo que había si la escribe la propia persona (UPDATE) y la quita en un INSERT
--    propio. Si no, una Libre se prendía la tienda sola. Se recrea la función ENTERA con `create or replace` (la versión vigente de
--    20261121_user_data_campos_del_coach.sql + la clave nueva); el trigger se vuelve a crear igual.
-- 🧾 Un pedido pendiente de alguien a quien luego se apaga SIGUE llegando: tienda_entregar y tienda_cancelar no miran la regla de
--    la tienda, así que el coach lo entrega o lo cancela y la persona puede cancelarlo.
--
-- ⚠️ La prueba y la aplica el director. Es idempotente (se puede correr dos veces).
-- Prueba (con rollback): scripts/sql/probar-tienda-por-persona.sql

-- ── El trigger de campos del coach, con la clave nueva ──────────────────────────────────────────────────
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
  v_claves constant text[] := array['payments','tier','suspended','courtesy','proTrialUntil','tiendaVer'];
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
  v_base := v_base - 'payments' - 'suspended' - 'courtesy' - 'tiendaVer';
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

-- ── tienda_catalogo y tienda_pedir con la regla de tres estados ───────────────────────────────────────
create or replace function public.tienda_catalogo()
returns table (id uuid, nombre text, categoria text, descripcion text, precio bigint, disponible boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach constant uuid := '0a6484ed-42af-449d-9903-e440ac683ecf';
  v_uid   uuid := (select auth.uid());
  v_es_coach boolean;
  v_edad  int;
begin
  if v_uid is null then return; end if;
  v_es_coach := (v_uid = v_coach);
  if not v_es_coach then
    -- Solo las personas que entrenan con este coach (user_data.coach_id) ven la tienda.
    if not exists (select 1 from public.user_data u
                   where u.user_id = v_uid and u.coach_id = v_coach
                     and case when jsonb_exists(u.profile, 'tiendaVer') then lower(u.profile ->> 'tiendaVer') = 'true'
                          else lower(coalesce(u.profile ->> 'tier', '')) not in ('libre', 'app') end) then
      return;
    end if;
    v_edad := public._tienda_edad(v_uid);
  end if;
  return query
    select p.id, p.nombre, p.categoria, p.descripcion, p.precio,
           (p.stock_entradas is null
            or (public._tienda_stock_actual(p.id) - public._tienda_apartado(p.id)) > 0) as disponible
    from public.coach_productos p
    where p.coach_id = v_coach and p.activo = true and p.en_tienda = true
      -- edad menor de 18 o desconocida → sin los «No para menores» (el coach ve todo)
      and (v_es_coach or p.no_menores = false or coalesce(v_edad, 0) >= 18)
    order by p.nombre;
end;
$$;

create or replace function public.tienda_pedir(p_producto uuid, p_cantidad int)
returns public.tienda_pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach constant uuid := '0a6484ed-42af-449d-9903-e440ac683ecf';
  v_uid    uuid := (select auth.uid());
  v_user   public.user_data%rowtype;
  v_prod   public.coach_productos%rowtype;
  v_edad   int;
  v_stock  int;
  v_pend   int;
  v_nombre text;
  v_fila   public.tienda_pedidos%rowtype;
begin
  if v_uid is null then raise exception 'no_disponible'; end if;
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 10 then raise exception 'no_disponible'; end if;

  -- Una persona a la vez: dos pedidos suyos simultáneos no se saltan el tope.
  perform pg_advisory_xact_lock(hashtext('tienda_pedir:' || v_uid::text));

  select * into v_user from public.user_data u
    where u.user_id = v_uid and u.coach_id = v_coach
      and case when jsonb_exists(u.profile, 'tiendaVer') then lower(u.profile ->> 'tiendaVer') = 'true'
                          else lower(coalesce(u.profile ->> 'tier', '')) not in ('libre', 'app') end;
  if not found then raise exception 'no_disponible'; end if;
  if lower(coalesce(v_user.profile ->> 'suspended', 'false')) = 'true' then raise exception 'no_disponible'; end if;

  -- Bloquea la fila del producto: dos pedidos a la vez no venden lo mismo.
  select * into v_prod from public.coach_productos p
    where p.id = p_producto and p.coach_id = v_coach for update;
  if not found or v_prod.activo is not true or v_prod.en_tienda is not true then
    raise exception 'no_disponible';
  end if;

  v_edad := public._tienda_edad(v_uid);
  if v_prod.no_menores and coalesce(v_edad, 0) < 18 then raise exception 'menor'; end if;

  select count(*)::int into v_pend from public.tienda_pedidos t
    where t.client_uid = v_uid and t.estado = 'pendiente';
  if v_pend >= 3 then raise exception 'limite'; end if;

  if v_prod.stock_entradas is not null then
    v_stock := public._tienda_stock_actual(v_prod.id) - public._tienda_apartado(v_prod.id);
    if p_cantidad > v_stock then raise exception 'agotado'; end if;
  end if;

  v_nombre := nullif(btrim(coalesce(v_user.profile ->> 'name', '')), '');
  insert into public.tienda_pedidos (coach_id, client_uid, client_id, client_nombre, producto_id,
                                     producto_nombre, precio_unit, cantidad)
  values (v_coach, v_uid, v_uid::text, v_nombre, v_prod.id, v_prod.nombre, v_prod.precio, p_cantidad)
  returning * into v_fila;
  return v_fila;
end;
$$;

-- Permisos de las dos funciones de la tienda (igual que en 20261122_tienda_pedidos.sql): solo personas con sesión.
revoke execute on function public.tienda_catalogo() from public, anon;
revoke execute on function public.tienda_pedir(uuid, int) from public, anon;
grant execute on function public.tienda_catalogo() to authenticated;
grant execute on function public.tienda_pedir(uuid, int) to authenticated;
