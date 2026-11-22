-- Prueba de la v756 (tienda de suplementos) — la corre el director DESPUÉS de aplicar
-- supabase/migrations/20261122_tienda_pedidos.sql. TODO va dentro de begin … rollback: no deja nada.
--
-- Cómo leerla: cada comprobación imprime «OK» o «FALLA» (pestaña de mensajes / NOTICE). Si sale una sola
-- «FALLA», no se publica. Las líneas «CONTROL» demuestran que la sonda sí ve el problema: por ejemplo, la
-- misma consulta como coach SÍ ve el costo, y pedir lo que queda SÍ funciona (el tope no es ciego).
--
-- Simula sesiones con `set local role authenticated` + `set local request.jwt.claims`. El uid del coach está
-- fijo en las políticas, así que se usa el real; las personas son inventadas (seudónimos) y viven solo aquí.
-- Si `user_data.user_id` tuviera llave foránea a auth.users, el bloque 0 intenta crear la cuenta falsa.
-- ⚠️ Escrita sin poder correrla contra un Postgres (no había uno a mano): si un insert del bloque 0 se queja
--    de una columna obligatoria de `user_data`, es el único ajuste esperable.
begin;

create or replace function public._probar_chk(p_ok boolean, p_txt text) returns void
language plpgsql as $f$ begin raise notice '%  %', case when coalesce(p_ok, false) then 'OK   ' else 'FALLA' end, p_txt; end $f$;
grant execute on function public._probar_chk(boolean, text) to public;

-- ── 0 · Datos falsos (como dueño de la base, sin sesión) ──────────────────────────────────────────────
-- Mariana (adulta, '33') · Sofía (menor, '15') · Valentina (edad 'abc' = desconocida)
-- Camila (trae «edad» en vez de «age») · Paula (sin coach)
do $$
declare u uuid;
begin
  foreach u in array array[
    'aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000003',
    'aaaaaaaa-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000005']::uuid[] loop
    begin
      insert into auth.users (id, aud, role, email) values (u, 'authenticated', 'authenticated', u::text || '@prueba.invalid')
      on conflict (id) do nothing;
    exception when others then null;   -- si no hace falta (o no se puede), se sigue
    end;
  end loop;
end $$;

insert into public.user_data (user_id, coach_id, role, profile, routines) values
 ('aaaaaaaa-0000-4000-8000-000000000001', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Mariana Prueba","age":"33"}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000002', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Sofía Prueba","age":"15"}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000003', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Valentina Prueba","age":"abc"}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000004', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Camila Prueba","edad":"30"}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000005', null,                                   'client', '{"name":"Paula Prueba","age":"40"}', '[]');

insert into public.coach_productos (id, nombre, categoria, precio, costo, no_menores, activo, en_tienda, descripcion) values
 ('b1000000-0000-4000-8000-000000000001', 'Preentreno · sachet', 'preentreno', 4000, 2720, true,  true, true,  '1 porción, sellado'),
 ('b1000000-0000-4000-8000-000000000002', 'Creatina 300 g',      'creatina',  85000, 55000, false, true, true,  '60 porciones'),
 ('b1000000-0000-4000-8000-000000000003', 'Oculto de la tienda', 'otro',      9000, 6000,  false, true, false, '');

-- una venta ya existente de Mariana (para que el CONTROL de «0 filas» tenga algo que ver)
insert into public.coach_ventas (client_id, producto_id, producto_nombre, precio, costo)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'Creatina 300 g', 85000, 55000);

-- ── 1 · Coach: carga el stock del preentreno (5) ──────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"0a6484ed-42af-449d-9903-e440ac683ecf","role":"authenticated"}';
do $$
declare r jsonb;
begin
  r := public.tienda_cargar_stock('b1000000-0000-4000-8000-000000000001', 5, 'sumar');
  perform public._probar_chk((r->>'stock_actual')::int = 5, 'coach: cargar 5 unidades deja stock 5');
  perform public._probar_chk((select stock_actual = 5 and apartado = 0 and ultima_carga = 5 and lleva_stock
                              from public.coach_stock() where producto_id = 'b1000000-0000-4000-8000-000000000001'),
                             'coach: coach_stock() dice 5 de 5, 0 apartados');
  perform public._probar_chk((select count(*) from public.coach_productos where costo > 0) >= 2
                             and (select count(*) from public.coach_ventas) >= 1,
                             'CONTROL coach: SÍ ve el costo en coach_productos y las filas de coach_ventas');
end $$;

-- ── 2 · Mariana (adulta) ──────────────────────────────────────────────────────────────────────────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
begin
  perform public._probar_chk((select count(*) from public.coach_productos) = 0, 'asesorada: ve 0 filas en coach_productos');
  perform public._probar_chk((select count(*) from public.coach_ventas) = 0, 'asesorada: ve 0 filas en coach_ventas');
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 2, 'asesorada adulta: el catálogo trae 2 (no el oculto de la tienda)');
  perform public._probar_chk(not exists (
      select 1 from public.tienda_catalogo() c
      where to_jsonb(c) ?| array['costo','stock','stock_entradas','stock_desde','stock_ultima_carga','apartado','apartados','entradas','coach_id','no_menores']),
    'catálogo: NUNCA trae costo, stock, apartado ni entradas');
  perform public._probar_chk(exists (select 1 from public.tienda_catalogo() c where c.nombre = 'Preentreno · sachet' and c.precio = 4000 and c.disponible),
    'catálogo: trae nombre, precio y «disponible»');
  perform public._probar_chk((select pronargs from pg_proc where proname = 'tienda_pedir' and pronamespace = 'public'::regnamespace) = 2,
    'tienda_pedir solo recibe producto y cantidad: no hay dónde mandar un precio inventado');
end $$;
do $$
declare p public.tienda_pedidos; ok boolean; n int;
begin
  p := public.tienda_pedir('b1000000-0000-4000-8000-000000000001', 3);
  perform public._probar_chk(p.precio_unit = 4000 and p.cantidad = 3 and p.estado = 'pendiente'
                             and p.client_id = 'aaaaaaaa-0000-4000-8000-000000000001' and p.client_nombre = 'Mariana Prueba',
    'pedir 3: el precio (4000) sale del catálogo, queda pendiente y client_id = su uid');
  ok := false;
  begin perform public.tienda_pedir('b1000000-0000-4000-8000-000000000001', 3); exception when others then ok := (sqlerrm = 'agotado'); end;
  perform public._probar_chk(ok, 'no puede pedir 3 más: «agotado» porque 3 ya están apartadas (5 − 3 = 2)');
  p := public.tienda_pedir('b1000000-0000-4000-8000-000000000001', 2);
  perform public._probar_chk(p.cantidad = 2, 'CONTROL: pedir las 2 que quedan SÍ se puede (el tope no es ciego)');
  perform public._probar_chk((select disponible from public.tienda_catalogo() where nombre = 'Preentreno · sachet') = false,
    'con todo apartado el catálogo dice «Agotado»');
  p := public.tienda_pedir('b1000000-0000-4000-8000-000000000002', 1);
  ok := false;
  begin perform public.tienda_pedir('b1000000-0000-4000-8000-000000000002', 1); exception when others then ok := (sqlerrm = 'limite'); end;
  perform public._probar_chk(ok, 'máximo 3 pedidos pendientes por persona: el cuarto da «limite»');
  ok := false;
  begin perform public.tienda_pedir('b1000000-0000-4000-8000-000000000002', 11); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'cantidad 11: «no_disponible»');
  ok := false;
  begin perform public.tienda_pedir('b1000000-0000-4000-8000-000000000003', 1); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'un producto que no está en la tienda no se puede pedir');
  ok := false;
  begin
    insert into public.tienda_pedidos (client_uid, client_id, producto_id, producto_nombre, precio_unit, cantidad)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'x', 1, 1);
  exception when others then ok := (sqlstate = '42501'); end;
  perform public._probar_chk(ok, 'no puede insertar en tienda_pedidos directo (RLS)');
  update public.tienda_pedidos set precio_unit = 1, estado = 'entregado'; get diagnostics n = row_count;
  perform public._probar_chk(n = 0, 'no puede actualizar tienda_pedidos directo (0 filas tocadas)');
  delete from public.tienda_pedidos; get diagnostics n = row_count;
  perform public._probar_chk(n = 0, 'no puede borrar tienda_pedidos directo (0 filas tocadas)');
  perform public._probar_chk((select count(*) from public.tienda_pedidos) = 3, 've sus 3 pedidos');
end $$;

-- ── 3 · Sofía (menor), Valentina (edad desconocida), Camila (campo «edad»), Paula (sin coach) ──────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}';
do $$
declare ok boolean := false;
begin
  perform public._probar_chk(not exists (select 1 from public.tienda_catalogo() where nombre = 'Preentreno · sachet')
                             and exists (select 1 from public.tienda_catalogo() where nombre = 'Creatina 300 g'),
    'menor (15): el catálogo NO trae el «No para menores» y sí la creatina');
  begin perform public.tienda_pedir('b1000000-0000-4000-8000-000000000001', 1); exception when others then ok := (sqlerrm = 'menor'); end;
  perform public._probar_chk(ok, 'menor (15): pedir el «No para menores» da «menor»');
  perform public._probar_chk((select count(*) from public.tienda_pedidos) = 0, 'menor: no ve pedidos ajenos (0)');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated"}';
do $$
begin
  perform public._probar_chk(not exists (select 1 from public.tienda_catalogo() where nombre = 'Preentreno · sachet'),
    'edad desconocida («abc»): se trata como menor, sin el «No para menores»');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000004","role":"authenticated"}';
do $$
begin
  perform public._probar_chk(not exists (select 1 from public.tienda_catalogo() where nombre = 'Preentreno · sachet'),
    'el campo de la edad en la base es profile->>''age'': con «edad» la edad es desconocida (sin «No para menores»)');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000005","role":"authenticated"}';
do $$
declare ok boolean := false;
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 0, 'sin coach: el catálogo sale vacío');
  begin perform public.tienda_pedir('b1000000-0000-4000-8000-000000000002', 1); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'sin coach: no puede pedir');
end $$;

-- Valentina pide una creatina (para «ve solo los suyos» y «cancela solo los suyos»)
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated"}';
select public.tienda_pedir('b1000000-0000-4000-8000-000000000002', 1);
do $$
begin
  perform public._probar_chk((select count(*) from public.tienda_pedidos) = 1, 'Valentina ve solo el suyo (1 de los 4 que hay en total)');
end $$;

-- ── 4 · Cancelar: solo los suyos ──────────────────────────────────────────────────────────────────────
reset role;
create table public._ped as select id, client_uid, producto_id, cantidad from public.tienda_pedidos;
grant all on public._ped to public;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated"}';
do $$
declare ok boolean := false; ajeno uuid;
begin
  select id into ajeno from public._ped where client_uid = 'aaaaaaaa-0000-4000-8000-000000000001' and producto_id = 'b1000000-0000-4000-8000-000000000002';
  begin perform public.tienda_cancelar(ajeno); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'no puede cancelar el pedido de otra persona');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
declare ok boolean := false; mio uuid; r public.tienda_pedidos;
begin
  select id into mio from public._ped where client_uid = 'aaaaaaaa-0000-4000-8000-000000000001' and producto_id = 'b1000000-0000-4000-8000-000000000002';
  r := public.tienda_cancelar(mio);
  perform public._probar_chk(r.estado = 'cancelado' and r.cancelado_por = 'asesorado' and r.resuelto is not null,
    'CONTROL: cancela el suyo y queda cancelado por «asesorado»');
  begin perform public.tienda_cancelar(mio); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'no se cancela dos veces');
  ok := false;
  begin perform public.tienda_entregar((select id from public._ped where cantidad = 3 limit 1)); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'la asesorada NO puede entregar (solo el coach)');
end $$;

-- ── 5 · Coach: entrega, venta y stock por libro ───────────────────────────────────────────────────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"0a6484ed-42af-449d-9903-e440ac683ecf","role":"authenticated"}';
do $$
declare ok boolean := false; r jsonb; p3 uuid; p2 uuid; v public.coach_ventas;
begin
  select id into p3 from public._ped where producto_id = 'b1000000-0000-4000-8000-000000000001' and cantidad = 3;
  select id into p2 from public._ped where producto_id = 'b1000000-0000-4000-8000-000000000001' and cantidad = 2;
  perform public._probar_chk((select count(*) from public.tienda_pedidos) = 4, 'coach: ve los 4 pedidos de todas');
  r := public.tienda_entregar(p3);
  perform public._probar_chk((r->'venta'->>'precio')::bigint = 12000 and (r->'venta'->>'costo')::bigint = 8160
                             and (r->'venta'->>'cantidad')::int = 3 and r->'venta'->>'pedido_id' = p3::text,
    'entregar 3: venta de 12.000, costo 8.160 (actual × 3), cantidad 3, con pedido_id');
  select * into v from public.coach_ventas where id = (r->'venta'->>'id')::uuid;
  perform public._probar_chk(v.client_id = 'aaaaaaaa-0000-4000-8000-000000000001' and v.cuotas = 1
                             and (select coalesce(sum((a->>'monto')::bigint), 0) from jsonb_array_elements(v.abonos) a) = 12000
                             and v.fecha = (now() at time zone 'America/Bogota')::date,
    'entregar de contado: venta de la ficha de Mariana, PAGADA (un abono por el total) con fecha de Bogotá');
  perform public._probar_chk((r->>'stock_actual')::int = 2 and (r->>'pocas')::boolean, 'el stock bajó a 2 y avisa «pocas»');
  perform public._probar_chk((select estado = 'entregado' and venta_id = v.id and resuelto is not null from public.tienda_pedidos where id = p3),
    'el pedido queda entregado con su venta_id');
  begin perform public.tienda_entregar(p3); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'una segunda entrega del mismo pedido FALLA');
  -- el libro: una venta hecha a mano descuenta sola; borrada con lápida devuelve
  insert into public.coach_ventas (client_id, producto_id, producto_nombre, precio, costo, cantidad)
  values ('aaaaaaaa-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Preentreno · sachet', 4000, 2720, 1);
  perform public._probar_chk((select stock_actual from public.coach_stock() where producto_id = 'b1000000-0000-4000-8000-000000000001') = 1,
    'una venta a mano desde la ficha descuenta el stock sola (2 → 1)');
  ok := false;
  begin perform public.tienda_entregar(p2); exception when others then ok := (sqlerrm = 'sin_stock'); end;
  perform public._probar_chk(ok, 'si el stock ya no alcanza, entregar da «sin_stock»');
  update public.coach_ventas set borrado = true
   where producto_id = 'b1000000-0000-4000-8000-000000000001' and cantidad = 1 and pedido_id is null;
  perform public._probar_chk((select stock_actual from public.coach_stock() where producto_id = 'b1000000-0000-4000-8000-000000000001') = 2,
    'borrar esa venta con lápida devuelve la unidad (1 → 2)');
  r := public.tienda_entregar(p2);
  perform public._probar_chk((r->>'stock_actual')::int = 0, 'ahora sí se entrega y el stock queda en 0');
  r := public.tienda_entregar((select id from public._ped where producto_id = 'b1000000-0000-4000-8000-000000000002'
                                 and client_uid = 'aaaaaaaa-0000-4000-8000-000000000003'), 3, 4000);
  perform public._probar_chk((r->'venta'->>'cuotas')::int = 3 and jsonb_array_length(r->'venta'->'abonos') = 1
                             and (r->'venta'->'abonos'->0->>'monto')::bigint = 4000 and (r->>'stock_actual') is null,
    'entregar a cuotas con abono: 3 cuotas, abono de 4.000, y un producto sin stock no devuelve número');
  r := public.tienda_cargar_stock('b1000000-0000-4000-8000-000000000001', 7, 'fijar');
  perform public._probar_chk((r->>'stock_actual')::int = 7
      and (select stock_actual = 7 and ultima_carga = 7 from public.coach_stock() where producto_id = 'b1000000-0000-4000-8000-000000000001'),
    '«contar lo que tengo» (fijar 7) deja el stock actual en 7 exacto');
  perform public.tienda_cargar_stock('b1000000-0000-4000-8000-000000000001', null, 'quitar');
  perform public._probar_chk((select not lleva_stock from public.coach_stock() where producto_id = 'b1000000-0000-4000-8000-000000000001'),
    'quitar apaga el stock: el producto ya no lleva');
end $$;

-- ── 6 · anon no ve nada ───────────────────────────────────────────────────────────────────────────────
reset role; set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare n int := -1; ok boolean := false;
begin
  begin select count(*) into n from public.tienda_pedidos; exception when insufficient_privilege then n := 0; end;
  perform public._probar_chk(n = 0, 'anon: no ve pedidos');
  begin perform * from public.tienda_catalogo(); exception when insufficient_privilege then ok := true; end;
  perform public._probar_chk(ok, 'anon: no puede ni llamar tienda_catalogo()');
  ok := false;
  begin perform public.tienda_pedir('b1000000-0000-4000-8000-000000000002', 1); exception when insufficient_privilege then ok := true; end;
  perform public._probar_chk(ok, 'anon: no puede llamar tienda_pedir()');
end $$;

-- ── 7 · Estructura (como dueño) ──────────────────────────────────────────────────────────────────────
reset role;
do $$
begin
  perform public._probar_chk((select count(*) = 6 and bool_and(prosecdef) and bool_and(coalesce(proconfig::text, '') like '%search_path=%')
    from pg_proc where pronamespace = 'public'::regnamespace
      and proname in ('tienda_catalogo','tienda_pedir','tienda_cancelar','tienda_entregar','tienda_cargar_stock','coach_stock')),
    'las 6 funciones son security definer con search_path fijo');
  perform public._probar_chk(not has_function_privilege('anon', 'public.tienda_pedir(uuid,int)', 'execute')
                             and has_function_privilege('authenticated', 'public.tienda_pedir(uuid,int)', 'execute'),
    'tienda_pedir: sin permiso para anon, con permiso para authenticated');
  perform public._probar_chk((select count(*) = 2 from pg_policies where schemaname = 'public' and tablename = 'tienda_pedidos')
                             and (select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'tienda_pedidos'
                                  and policyname = 'tienda_pedidos_propios' and cmd = 'SELECT'),
    'tienda_pedidos: solo 2 políticas (coach todo; la persona, solo select)');
end $$;

rollback;
