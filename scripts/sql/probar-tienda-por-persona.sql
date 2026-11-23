-- Prueba de la v756 (2ª parte): «quién ve la tienda» persona por persona. La corre el director ANTES de aplicar y DESPUÉS de aplicar
-- supabase/migrations/20261123_tienda_por_persona.sql (antes debe dar FALLA en lo nuevo: es la prueba de que la sonda ve algo).
-- TODO va dentro de begin … rollback: no deja nada. Cada comprobación imprime «OK» o «FALLA» (NOTICE). Las líneas «CONTROL» demuestran
-- que la sonda discrimina (por ejemplo, una Libre con la clave en true SÍ ve y SÍ pide).
--
-- Regla: profile->>'tiendaVer' = 'true' → la ve; 'false' → no; ausente → la ve quien NO es de plan 'libre' ni 'app'.
-- Mismo estilo que probar-tienda.sql: sesiones con `set local role authenticated` + `set local request.jwt.claims`; el coach es el uid real.
begin;

create or replace function public._probar_chk(p_ok boolean, p_txt text) returns void
language plpgsql as $f$ begin raise notice '%  %', case when coalesce(p_ok, false) then 'OK   ' else 'FALLA' end, p_txt; end $f$;
grant execute on function public._probar_chk(boolean, text) to public;

-- ── 0 · Datos falsos ──────────────────────────────────────────────────────────────────────────────────
-- 11 Lucía (Libre, sin clave) · 12 Daniela (Libre, tiendaVer=true) · 13 Mariana (premium, tiendaVer=false) · 14 Paula (premium, sin clave)
-- 15 Sofía (Libre, 15 años, tiendaVer=true) · 16 Camila (premium, sin clave: pedirá y luego se apaga) · 17 Valentina (Libre: intenta prenderse sola)
-- 18 Ximena (cuenta nueva: intenta crearse con la clave)
do $$
declare u uuid;
begin
  foreach u in array array[
    'aaaaaaaa-0000-4000-8000-000000000011','aaaaaaaa-0000-4000-8000-000000000012','aaaaaaaa-0000-4000-8000-000000000013',
    'aaaaaaaa-0000-4000-8000-000000000014','aaaaaaaa-0000-4000-8000-000000000015','aaaaaaaa-0000-4000-8000-000000000016',
    'aaaaaaaa-0000-4000-8000-000000000017','aaaaaaaa-0000-4000-8000-000000000018']::uuid[] loop
    begin
      insert into auth.users (id, aud, role, email) values (u, 'authenticated', 'authenticated', u::text || '@prueba.invalid')
      on conflict (id) do nothing;
    exception when others then null;
    end;
  end loop;
end $$;

insert into public.user_data (user_id, coach_id, role, profile, routines) values
 ('aaaaaaaa-0000-4000-8000-000000000011', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Lucía Prueba","age":"30","tier":"libre"}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000012', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Daniela Prueba","age":"30","tier":"libre","tiendaVer":true}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000013', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Mariana Prueba","age":"40","tier":"premium","tiendaVer":false}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000014', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Paula Prueba","age":"40","tier":"premium"}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000015', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Sofía Prueba","age":"15","tier":"libre","tiendaVer":true}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000016', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Camila Prueba","age":"40","tier":"premium"}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000017', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Valentina Prueba","age":"30","tier":"libre"}', '[]');

insert into public.coach_productos (id, nombre, categoria, precio, costo, no_menores, activo, en_tienda, descripcion) values
 ('b2000000-0000-4000-8000-000000000001', 'Preentreno · sachet', 'preentreno', 4000, 2720, true,  true, true, '1 porción, sellado'),
 ('b2000000-0000-4000-8000-000000000002', 'Creatina 300 g',      'creatina',  85000, 55000, false, true, true, '60 porciones');

-- ── 1 · Libre sin clave: no ve ni puede pedir ─────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000011","role":"authenticated"}';
do $$
declare ok boolean := false;
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 0, 'Libre sin clave: el catálogo sale vacío');
  begin perform public.tienda_pedir('b2000000-0000-4000-8000-000000000002', 1); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'Libre sin clave: no puede pedir');
end $$;

-- ── 2 · Libre con tiendaVer=true: SÍ ve y SÍ pide (CONTROL) ───────────────────────────────────────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000012","role":"authenticated"}';
do $$
declare p public.tienda_pedidos;
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 2, 'CONTROL Libre con tiendaVer=true: SÍ ve el catálogo (2 productos)');
  p := public.tienda_pedir('b2000000-0000-4000-8000-000000000002', 1);
  perform public._probar_chk(p.estado = 'pendiente' and p.precio_unit = 85000, 'CONTROL Libre con tiendaVer=true: SÍ puede pedir');
end $$;

-- ── 3 · Premium con tiendaVer=false: no ve ni puede pedir ─────────────────────────────────────────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000013","role":"authenticated"}';
do $$
declare ok boolean := false;
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 0, 'Premium con tiendaVer=false: el catálogo sale vacío');
  begin perform public.tienda_pedir('b2000000-0000-4000-8000-000000000002', 1); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'Premium con tiendaVer=false: no puede pedir');
end $$;

-- ── 4 · Premium sin clave: ve (regla por defecto) ─────────────────────────────────────────────────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000014","role":"authenticated"}';
do $$
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 2, 'Premium sin clave: ve el catálogo (regla por defecto)');
end $$;

-- ── 5 · Menor Libre con true: ve, pero sin «No para menores» ──────────────────────────────────────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000015","role":"authenticated"}';
do $$
declare ok boolean := false;
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 1
                             and not exists (select 1 from public.tienda_catalogo() where nombre = 'Preentreno · sachet'),
    'Menor Libre con tiendaVer=true: ve la tienda SIN el «No para menores»');
  begin perform public.tienda_pedir('b2000000-0000-4000-8000-000000000001', 1); exception when others then ok := (sqlerrm = 'menor'); end;
  perform public._probar_chk(ok, 'Menor Libre con tiendaVer=true: no puede pedir el «No para menores»');
end $$;

-- ── 6 · La persona NO puede prenderse la tienda sola (UPDATE) ni crearse con la clave (INSERT) ─────────
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000017","role":"authenticated"}';
update public.user_data set profile = profile || '{"tiendaVer":true}'::jsonb where user_id = 'aaaaaaaa-0000-4000-8000-000000000017';
do $$
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 0, 'una Libre que se escribe tiendaVer=true a sí misma SIGUE sin ver la tienda');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000018","role":"authenticated"}';
do $$
begin
  begin
    insert into public.user_data (user_id, coach_id, role, profile)
    values ('aaaaaaaa-0000-4000-8000-000000000018', '0a6484ed-42af-449d-9903-e440ac683ecf', 'client', '{"name":"Ximena Prueba","age":"30","tier":"premium","tiendaVer":true}');
  exception when others then null;   -- si la RLS la rechaza, tampoco quedó la clave: también cuenta
  end;
end $$;
reset role;
do $$
begin
  perform public._probar_chk(not exists (select 1 from public.user_data where user_id = 'aaaaaaaa-0000-4000-8000-000000000017' and jsonb_exists(profile, 'tiendaVer')),
    'UPDATE propio: la clave tiendaVer quedó como estaba (ausente)');
  perform public._probar_chk(not exists (select 1 from public.user_data where user_id = 'aaaaaaaa-0000-4000-8000-000000000018' and jsonb_exists(profile, 'tiendaVer')),
    'INSERT propio: la clave tiendaVer se quita (o la fila ni entra)');
end $$;

-- ── 7 · El coach SÍ puede cambiarla (CONTROL) ─────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"0a6484ed-42af-449d-9903-e440ac683ecf","role":"authenticated"}';
update public.user_data set profile = profile || '{"tiendaVer":true}'::jsonb where user_id = 'aaaaaaaa-0000-4000-8000-000000000017';
do $$
begin
  perform public._probar_chk((select (profile ->> 'tiendaVer') = 'true' from public.user_data where user_id = 'aaaaaaaa-0000-4000-8000-000000000017'),
    'CONTROL: el coach SÍ puede ponerle tiendaVer=true a una persona');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000017","role":"authenticated"}';
do $$
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 2, 'CONTROL: y entonces esa Libre SÍ ve la tienda');
end $$;

-- ── 8 · Un pedido pendiente de alguien a quien luego se apaga: el coach lo entrega, la persona lo cancela ─
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000016","role":"authenticated"}';
do $$
declare p1 public.tienda_pedidos; p2 public.tienda_pedidos;
begin
  p1 := public.tienda_pedir('b2000000-0000-4000-8000-000000000002', 1);
  p2 := public.tienda_pedir('b2000000-0000-4000-8000-000000000002', 2);
  perform public._probar_chk(p1.id is not null and p2.id is not null, 'Camila (premium sin clave) hace 2 pedidos');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"0a6484ed-42af-449d-9903-e440ac683ecf","role":"authenticated"}';
update public.user_data set profile = profile || '{"tiendaVer":false}'::jsonb where user_id = 'aaaaaaaa-0000-4000-8000-000000000016';
do $$
declare r jsonb; id1 uuid;
begin
  select id into id1 from public.tienda_pedidos where client_uid = 'aaaaaaaa-0000-4000-8000-000000000016' and cantidad = 1;
  perform public._probar_chk((select count(*) from public.tienda_pedidos where client_uid = 'aaaaaaaa-0000-4000-8000-000000000016' and estado = 'pendiente') = 2,
    'apagada la tienda, el coach TODAVÍA ve los 2 pedidos pendientes');
  r := public.tienda_entregar(id1);
  perform public._probar_chk((r -> 'venta' ->> 'precio')::bigint = 85000, 'y TODAVÍA puede entregar uno (queda la venta)');
end $$;
reset role; set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000016","role":"authenticated"}';
do $$
declare ok boolean := false; id2 uuid; r public.tienda_pedidos;
begin
  perform public._probar_chk((select count(*) from public.tienda_catalogo()) = 0, 'Camila apagada: ya no ve la tienda');
  begin perform public.tienda_pedir('b2000000-0000-4000-8000-000000000002', 1); exception when others then ok := (sqlerrm = 'no_disponible'); end;
  perform public._probar_chk(ok, 'Camila apagada: ya no puede pedir');
  select id into id2 from public.tienda_pedidos where cantidad = 2 and estado = 'pendiente';
  r := public.tienda_cancelar(id2);
  perform public._probar_chk(r.estado = 'cancelado' and r.cancelado_por = 'asesorado', 'Camila apagada: SÍ puede cancelar su pedido pendiente');
end $$;

-- ── 9 · Estructura (como dueño) ──────────────────────────────────────────────────────────────────────
reset role;
do $$
begin
  perform public._probar_chk(pg_get_functiondef('public.user_data_campos_del_coach()'::regprocedure) like '%''tiendaVer''%',
    'el trigger user_data_campos_del_coach conoce la clave tiendaVer');
  perform public._probar_chk(pg_get_functiondef('public.tienda_catalogo()'::regprocedure) like '%tiendaVer%'
                             and pg_get_functiondef('public.tienda_pedir(uuid,int)'::regprocedure) like '%tiendaVer%',
    'tienda_catalogo y tienda_pedir usan la regla de tres estados');
  perform public._probar_chk(not has_function_privilege('anon', 'public.tienda_pedir(uuid,int)', 'execute')
                             and has_function_privilege('authenticated', 'public.tienda_pedir(uuid,int)', 'execute'),
    'los permisos de tienda_pedir siguen: sin anon, con authenticated');
end $$;

rollback;
