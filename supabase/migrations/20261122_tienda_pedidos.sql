-- v756 · Tienda de suplementos (pedido del dueño, maqueta aprobada el 22-nov-2026).
--
-- Flujo: la persona ve la tienda de su coach (sin costo, sin margen, sin unidades) → PIDE → el coach la
-- recibe y toca «Entregado» al dársela en el gym → queda como venta en su ficha y el stock baja.
--
-- 🔒 NADA de esto abre `coach_productos` ni `coach_ventas` a los asesorados: su RLS NO cambia (0 filas).
--    La persona solo lee su catálogo y escribe sus pedidos A TRAVÉS DE FUNCIONES `security definer`.
-- 🔒 El precio lo copia la función del catálogo: el teléfono no lo manda. El costo, el stock, lo apartado y
--    las entradas NUNCA salen de `tienda_catalogo()`.
-- 📚 El stock es «por libro», no un número guardado: stock actual = `stock_entradas` − suma de `cantidad`
--    de las ventas vivas de ese producto desde `stock_desde`. Así una venta hecha a mano desde la ficha
--    (también la que se hizo sin señal y subió después) descuenta sola, una venta borrada con lápida
--    devuelve las unidades, y una copia vieja del teléfono no puede pisar el stock: el teléfono NUNCA
--    escribe `stock_entradas`, `stock_desde` ni `stock_ultima_carga` (solo `tienda_cargar_stock`).
-- 🎯 La tienda es SOLO para quien entrena con el coach (decisión del dueño): además de `user_data.coach_id`, el plan no puede ser
--    'libre' ni 'app' (copia fiel de `clientHasCoach` de avi-core: `tier !== 'libre' && tier !== 'app'`; el mes de PRO de bienvenida
--    sigue siendo tier 'libre', o sea que tampoco ve la tienda). Lo único que no se lleva a SQL es `_self` (la fila del propio coach, que no es asesorada).
-- 🧒 La edad vive en `user_data.profile->>'age'` (texto: '15', '33'). Si no es un número, la edad es
--    DESCONOCIDA y se trata como menor: no ve ni puede pedir los «No para menores».
--
-- ⚠️ NO aplicada: la revisa y la aplica el director. Es idempotente (se puede correr dos veces).
-- Prueba (con rollback): scripts/sql/probar-tienda.sql

-- ── coach_productos: descripción corta, «en la tienda» y stock por libro ───────────────────────────
alter table public.coach_productos
  add column if not exists descripcion text not null default '',
  add column if not exists en_tienda boolean not null default false,
  add column if not exists stock_entradas int null,
  add column if not exists stock_desde timestamptz null,
  add column if not exists stock_ultima_carga int null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_productos_descripcion_largo') then
    alter table public.coach_productos
      add constraint coach_productos_descripcion_largo check (char_length(descripcion) <= 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_productos_stock_no_negativo') then
    alter table public.coach_productos
      add constraint coach_productos_stock_no_negativo
      check ((stock_entradas is null or stock_entradas >= 0) and (stock_ultima_carga is null or stock_ultima_carga >= 0));
  end if;
end $$;

-- ── coach_ventas: cantidad y de qué pedido salió ──────────────────────────────────────────────────
-- `precio` y `costo` siguen siendo el TOTAL de la venta (precio unitario × cantidad).
alter table public.coach_ventas
  add column if not exists cantidad int not null default 1,
  add column if not exists pedido_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_ventas_cantidad_rango') then
    alter table public.coach_ventas
      add constraint coach_ventas_cantidad_rango check (cantidad between 1 and 99);
  end if;
end $$;

-- Para sumar lo vendido de un producto desde `stock_desde` sin recorrer toda la tabla.
create index if not exists coach_ventas_producto_creado_idx on public.coach_ventas (producto_id, creado);
create index if not exists coach_ventas_pedido_idx on public.coach_ventas (pedido_id);

-- ── Pedidos de la tienda ──────────────────────────────────────────────────────────────────────────
create table if not exists public.tienda_pedidos (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null default '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid,
  client_uid      uuid not null,                 -- auth uid de quien pide (= user_data.user_id)
  client_id       text not null,                 -- el id del asesorado en la app (= user_id::text; el mismo de coach_ventas.client_id)
  client_nombre   text,
  producto_id     uuid references public.coach_productos(id) on delete set null,
  producto_nombre text not null,
  precio_unit     bigint not null default 0 check (precio_unit >= 0),   -- copia del precio al pedir
  cantidad        int not null check (cantidad between 1 and 10),
  estado          text not null default 'pendiente' check (estado in ('pendiente','entregado','cancelado')),
  cancelado_por   text null check (cancelado_por is null or cancelado_por in ('asesorado','coach')),
  venta_id        uuid null references public.coach_ventas(id) on delete set null,
  creado          timestamptz not null default now(),
  resuelto        timestamptz null
);

create index if not exists tienda_pedidos_producto_idx on public.tienda_pedidos (producto_id);
create index if not exists tienda_pedidos_venta_idx on public.tienda_pedidos (venta_id);
create index if not exists tienda_pedidos_estado_idx on public.tienda_pedidos (estado);
create index if not exists tienda_pedidos_client_idx on public.tienda_pedidos (client_uid);
create index if not exists tienda_pedidos_coach_idx on public.tienda_pedidos (coach_id);

alter table public.tienda_pedidos enable row level security;

-- El coach puede todo.
drop policy if exists tienda_pedidos_coach on public.tienda_pedidos;
create policy tienda_pedidos_coach on public.tienda_pedidos
  for all to authenticated
  using ((select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  with check ((select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid);

-- La persona SOLO lee sus filas. Sin política de insert, update ni delete: escribe a través de las funciones.
drop policy if exists tienda_pedidos_propios on public.tienda_pedidos;
create policy tienda_pedidos_propios on public.tienda_pedidos
  for select to authenticated
  using (client_uid = (select auth.uid()));

revoke all on public.tienda_pedidos from anon;

-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- Ayudantes INTERNOS (nadie los llama desde la API: se les quita el permiso a todos)
-- ══════════════════════════════════════════════════════════════════════════════════════════════════

-- Stock actual por libro. null = el producto no lleva stock (siempre disponible).
create or replace function public._tienda_stock_actual(p_producto uuid)
returns int
language sql
security definer
set search_path = ''
as $$
  select case when p.stock_entradas is null then null
    else p.stock_entradas - coalesce((
      select sum(v.cantidad)::int
      from public.coach_ventas v
      where v.producto_id = p.id and v.borrado = false and v.creado >= p.stock_desde
    ), 0) end
  from public.coach_productos p
  where p.id = p_producto;
$$;

-- Unidades apartadas por pedidos pendientes.
create or replace function public._tienda_apartado(p_producto uuid)
returns int
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(t.cantidad), 0)::int
  from public.tienda_pedidos t
  where t.producto_id = p_producto and t.estado = 'pendiente';
$$;

-- Edad en años de una persona; null = desconocida (no hay fila, o `age` no es un número).
create or replace function public._tienda_edad(p_uid uuid)
returns int
language sql
security definer
set search_path = ''
as $$
  select case when (u.profile ->> 'age') ~ '^\d{1,3}(\.\d+)?$' then floor((u.profile ->> 'age')::numeric)::int end
  from public.user_data u
  where u.user_id = p_uid;
$$;

revoke execute on function public._tienda_stock_actual(uuid) from public, anon, authenticated;
revoke execute on function public._tienda_apartado(uuid) from public, anon, authenticated;
revoke execute on function public._tienda_edad(uuid) from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- tienda_catalogo() — lo que la persona ve. NUNCA costo, stock, apartado ni entradas.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
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
                     and lower(coalesce(u.profile ->> 'tier', '')) not in ('libre', 'app')) then
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

-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- tienda_pedir(p_producto, p_cantidad) — el precio sale del producto, NO del teléfono.
-- Errores (el mensaje es solo el código): no_disponible, menor, agotado, limite.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
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
      and lower(coalesce(u.profile ->> 'tier', '')) not in ('libre', 'app');
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

-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- tienda_cancelar(p_pedido) — la dueña cancela uno suyo pendiente; el coach, cualquiera pendiente.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.tienda_cancelar(p_pedido uuid)
returns public.tienda_pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach constant uuid := '0a6484ed-42af-449d-9903-e440ac683ecf';
  v_uid  uuid := (select auth.uid());
  v_ped  public.tienda_pedidos%rowtype;
  v_por  text;
begin
  if v_uid is null then raise exception 'no_disponible'; end if;
  select * into v_ped from public.tienda_pedidos t where t.id = p_pedido for update;
  if not found or v_ped.estado <> 'pendiente' then raise exception 'no_disponible'; end if;
  if v_uid = v_coach then v_por := 'coach';
  elsif v_ped.client_uid = v_uid then v_por := 'asesorado';
  else raise exception 'no_disponible';
  end if;
  update public.tienda_pedidos t
     set estado = 'cancelado', cancelado_por = v_por, resuelto = now()
   where t.id = p_pedido
   returning * into v_ped;
  return v_ped;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- tienda_entregar(p_pedido, p_cuotas, p_abono) — SOLO el coach. Crea la venta y baja el stock (por libro).
-- Abonos con el MISMO formato de la v748: [{id, monto, fecha}].
--   · 1 cuota y sin abono → pagada de contado: un abono por el total ese día («se pagan al recibirlos»).
--   · con cuotas → abono inicial = p_abono (0 si viene null → sin abonos).
-- Devuelve {venta, stock_actual, pocas}.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.tienda_entregar(p_pedido uuid, p_cuotas int default 1, p_abono numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach constant uuid := '0a6484ed-42af-449d-9903-e440ac683ecf';
  v_uid    uuid := (select auth.uid());
  v_ped    public.tienda_pedidos%rowtype;
  v_prod   public.coach_productos%rowtype;
  v_total  bigint;
  v_costo  bigint := 0;
  v_hoy    date := (now() at time zone 'America/Bogota')::date;
  v_abono  bigint;
  v_abonos jsonb := '[]'::jsonb;
  v_venta  public.coach_ventas%rowtype;
  v_stock  int;
begin
  if v_uid is distinct from v_coach then raise exception 'no_disponible'; end if;
  if p_cuotas is null or p_cuotas < 1 or p_cuotas > 12 then raise exception 'no_disponible'; end if;

  select * into v_ped from public.tienda_pedidos t where t.id = p_pedido for update;
  if not found or v_ped.estado <> 'pendiente' then raise exception 'no_disponible'; end if;

  if v_ped.producto_id is not null then
    select * into v_prod from public.coach_productos p where p.id = v_ped.producto_id for update;
    if found then
      v_costo := v_prod.costo * v_ped.cantidad;            -- costo ACTUAL del producto
      if v_prod.stock_entradas is not null
         and public._tienda_stock_actual(v_prod.id) < v_ped.cantidad then
        raise exception 'sin_stock';
      end if;
    end if;
  end if;

  v_total := v_ped.precio_unit * v_ped.cantidad;
  if p_cuotas = 1 and p_abono is null then
    v_abono := v_total;
  else
    v_abono := least(v_total, greatest(0, round(coalesce(p_abono, 0))))::bigint;
  end if;
  if v_abono > 0 then
    v_abonos := jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text, 'monto', v_abono, 'fecha', to_char(v_hoy, 'YYYY-MM-DD')));
  end if;

  insert into public.coach_ventas (coach_id, client_id, producto_id, producto_nombre, precio, costo,
                                   cuotas, fecha, abonos, cantidad, pedido_id)
  values (v_coach, v_ped.client_id, v_ped.producto_id, v_ped.producto_nombre, v_total, v_costo,
          p_cuotas, v_hoy, v_abonos, v_ped.cantidad, v_ped.id)
  returning * into v_venta;

  update public.tienda_pedidos t
     set estado = 'entregado', venta_id = v_venta.id, resuelto = now()
   where t.id = v_ped.id;

  v_stock := case when v_prod.id is not null and v_prod.stock_entradas is not null
                  then public._tienda_stock_actual(v_prod.id) end;
  return jsonb_build_object('venta', to_jsonb(v_venta),
                            'stock_actual', v_stock,
                            'pocas', (v_stock is not null and v_stock <= 5));
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- tienda_cargar_stock(p_producto, p_unidades, p_modo) — SOLO el coach. Modos: 'sumar', 'fijar', 'quitar'.
--   · sumar: suma unidades.  · fijar: deja el stock actual exactamente en N (cuando cuenta lo que tiene).
--   · quitar: el producto deja de llevar stock (entradas y desde a null; p_unidades se ignora).
-- La primera carga pone stock_desde = now(). stock_ultima_carga = el stock que queda (la «N» de «32 de 50»).
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.tienda_cargar_stock(p_producto uuid, p_unidades int, p_modo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach constant uuid := '0a6484ed-42af-449d-9903-e440ac683ecf';
  v_uid     uuid := (select auth.uid());
  v_prod    public.coach_productos%rowtype;
  v_vendido int;
  v_entradas int;
  v_desde   timestamptz;
  v_actual  int;
begin
  if v_uid is distinct from v_coach then raise exception 'no_disponible'; end if;
  select * into v_prod from public.coach_productos p
    where p.id = p_producto and p.coach_id = v_coach for update;
  if not found then raise exception 'no_disponible'; end if;

  if p_modo = 'quitar' then
    update public.coach_productos p
       set stock_entradas = null, stock_desde = null, stock_ultima_carga = null
     where p.id = p_producto;
    return jsonb_build_object('stock_actual', null, 'ultima_carga', null);
  end if;

  if p_modo not in ('sumar', 'fijar') or p_unidades is null or p_unidades < 0 or p_unidades > 100000
     or (p_modo = 'sumar' and p_unidades < 1) then
    raise exception 'no_disponible';
  end if;

  v_desde := v_prod.stock_desde;
  if v_prod.stock_entradas is null then
    -- primera carga: el libro empieza ahora
    v_entradas := p_unidades;
    v_desde := now();
  else
    select coalesce(sum(v.cantidad), 0)::int into v_vendido
      from public.coach_ventas v
     where v.producto_id = p_producto and v.borrado = false and v.creado >= v_prod.stock_desde;
    v_entradas := case when p_modo = 'sumar' then v_prod.stock_entradas + p_unidades
                       else p_unidades + v_vendido end;      -- fijar: actual = N exacto
  end if;
  v_actual := v_entradas - coalesce(v_vendido, 0);
  if v_actual < 0 then v_actual := 0; end if;

  update public.coach_productos p
     set stock_entradas = v_entradas, stock_desde = v_desde, stock_ultima_carga = v_actual
   where p.id = p_producto;
  return jsonb_build_object('stock_actual', v_actual, 'ultima_carga', v_actual);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- coach_stock() — SOLO el coach: por producto, stock actual, apartado y última carga (para «Mis productos»).
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.coach_stock()
returns table (producto_id uuid, lleva_stock boolean, stock_actual int, apartado int, ultima_carga int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach constant uuid := '0a6484ed-42af-449d-9903-e440ac683ecf';
  v_uid uuid := (select auth.uid());
begin
  if v_uid is distinct from v_coach then return; end if;
  return query
    select p.id, (p.stock_entradas is not null),
           greatest(0, public._tienda_stock_actual(p.id)),
           public._tienda_apartado(p.id),
           p.stock_ultima_carga
    from public.coach_productos p
    where p.coach_id = v_coach;
end;
$$;

-- Permisos de las funciones públicas: solo personas con sesión (authenticated); nunca anon.
revoke execute on function public.tienda_catalogo() from public, anon;
revoke execute on function public.tienda_pedir(uuid, int) from public, anon;
revoke execute on function public.tienda_cancelar(uuid) from public, anon;
revoke execute on function public.tienda_entregar(uuid, int, numeric) from public, anon;
revoke execute on function public.tienda_cargar_stock(uuid, int, text) from public, anon;
revoke execute on function public.coach_stock() from public, anon;
grant execute on function public.tienda_catalogo() to authenticated;
grant execute on function public.tienda_pedir(uuid, int) to authenticated;
grant execute on function public.tienda_cancelar(uuid) to authenticated;
grant execute on function public.tienda_entregar(uuid, int, numeric) to authenticated;
grant execute on function public.tienda_cargar_stock(uuid, int, text) to authenticated;
grant execute on function public.coach_stock() to authenticated;
