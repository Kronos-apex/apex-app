-- F6 · MATRIZ DE SABOTAJE contra PRODUCCIÓN, en tx con ROLLBACK.
-- 12 casos: 8 que deben MORDER + 4 que deben PASAR (el control: si todo muerde, la prueba puede
-- estar rechazando por la razón equivocada y no lo sabrías).
-- MOD = 0a6484ed-42af-449d-9903-e440ac683ecf (camilo, único en community_moderators)
-- NOM = 9418640a-2e55-414a-9952-c6030fc62dd9 (qa-harness, NO moderador)
begin;

create temp table _r(n int, caso text, espera text, obtuvo text, ok boolean) on commit drop;

-- Semilla: dos filas nuestras, una sin verificar y una verificada.
insert into public.food_barcodes(ean,name,brand,kcal,p,c,f,created_by,verified)
values ('7702001234567','SABOTAJE sin verificar','X',100,5,10,2,'9418640a-2e55-414a-9952-c6030fc62dd9',false),
       ('7702007654321','SABOTAJE verificada','X',200,6,20,3,'9418640a-2e55-414a-9952-c6030fc62dd9',true);

do $$
declare
  MOD constant text := '0a6484ed-42af-449d-9903-e440ac683ecf';
  NOM constant text := '9418640a-2e55-414a-9952-c6030fc62dd9';
  n int;
begin
  -- ── S1 · un NO moderador pide la cola → 0 filas, en silencio (MUERDE) ──
  perform set_config('request.jwt.claims', json_build_object('sub',NOM,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.fb_pending();
  reset role;
  insert into _r values (1,'no-moderador pide la cola','0 filas', n||' filas', n=0);

  -- ── S2 · el MODERADOR pide la cola → ve las 2 (DEBE PASAR) ──
  perform set_config('request.jwt.claims', json_build_object('sub',MOD,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.fb_pending() where ean like '77020%';
  reset role;
  insert into _r values (2,'MODERADOR pide la cola','2 filas', n||' filas', n=2);

  -- ── S2b · la cola ORDENA lo pendiente primero (DEBE PASAR) ──
  perform set_config('request.jwt.claims', json_build_object('sub',MOD,'role','authenticated')::text, true);
  set local role authenticated;
  select case when (select verified from public.fb_pending() where ean like '77020%' limit 1)=false
              then 1 else 0 end into n;
  reset role;
  insert into _r values (3,'lo pendiente sale primero','pendiente arriba', case when n=1 then 'pendiente arriba' else 'verificada arriba' end, n=1);

  -- ── S3 · un NO moderador borra por RPC → excepción (MUERDE) ──
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',NOM,'role','authenticated')::text, true);
    set local role authenticated;
    perform public.fb_delete('7702001234567');
    reset role;
    insert into _r values (4,'no-moderador borra por RPC','excepcion','BORRO', false);
  exception when others then
    reset role;
    insert into _r values (4,'no-moderador borra por RPC','excepcion', SQLERRM, SQLERRM like '%not a moderator%');
  end;

  -- ── S4 · el MODERADOR borra una fila NO verificada → borra (DEBE PASAR) ──
  perform set_config('request.jwt.claims', json_build_object('sub',MOD,'role','authenticated')::text, true);
  set local role authenticated;
  perform public.fb_delete('7702001234567');
  reset role;
  select count(*) into n from public.food_barcodes where ean='7702001234567';
  insert into _r values (5,'MODERADOR borra la no verificada','0 filas quedan', n||' quedan', n=0);
  -- la repongo para el resto de la matriz
  insert into public.food_barcodes(ean,name,brand,kcal,p,c,f,created_by,verified)
  values ('7702001234567','SABOTAJE sin verificar','X',100,5,10,2,NOM::uuid,false);

  -- ── S5 · el MODERADOR borra una fila YA VERIFICADA → se niega (MUERDE) ──
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',MOD,'role','authenticated')::text, true);
    set local role authenticated;
    perform public.fb_delete('7702007654321');
    reset role;
    insert into _r values (6,'MODERADOR borra una VERIFICADA','excepcion','BORRO', false);
  exception when others then
    reset role;
    insert into _r values (6,'MODERADOR borra una VERIFICADA','excepcion', SQLERRM, SQLERRM like '%unverify first%');
  end;

  -- ── S6 · REGRESIÓN F5: un cliente mueve `verified` con UPDATE directo → denegado (MUERDE) ──
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',NOM,'role','authenticated')::text, true);
    set local role authenticated;
    update public.food_barcodes set verified=true where ean='7702001234567';
    reset role;
    insert into _r values (7,'cliente se auto-verifica (UPDATE)','denegado','LO MOVIO', false);
  exception when others then
    reset role;
    insert into _r values (7,'cliente se auto-verifica (UPDATE)','denegado', SQLERRM, SQLERRM like '%permission denied%' or SQLERRM like '%column%');
  end;

  -- ── S7 · REGRESIÓN F5: DELETE directo del cliente → denegado (MUERDE) ──
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',NOM,'role','authenticated')::text, true);
    set local role authenticated;
    delete from public.food_barcodes where ean='7702001234567';
    reset role;
    insert into _r values (8,'cliente borra directo','denegado','BORRO', false);
  exception when others then
    reset role;
    insert into _r values (8,'cliente borra directo','denegado', SQLERRM, SQLERRM like '%permission denied%');
  end;

  -- ── S8 · el DUEÑO corrige su propia fila sin verificar (DEBE PASAR) ──
  perform set_config('request.jwt.claims', json_build_object('sub',NOM,'role','authenticated')::text, true);
  set local role authenticated;
  update public.food_barcodes set name='CORREGIDO POR SU DUENO' where ean='7702001234567';
  reset role;
  select count(*) into n from public.food_barcodes where ean='7702001234567' and name='CORREGIDO POR SU DUENO';
  insert into _r values (9,'el dueno corrige su fila sin verificar','1 fila', n||' filas', n=1);

  -- ── S9 · el dueño intenta corregir su fila YA VERIFICADA → 0 filas (MUERDE) ──
  perform set_config('request.jwt.claims', json_build_object('sub',NOM,'role','authenticated')::text, true);
  set local role authenticated;
  update public.food_barcodes set name='NO DEBERIA' where ean='7702007654321';
  reset role;
  select count(*) into n from public.food_barcodes where ean='7702007654321' and name='NO DEBERIA';
  insert into _r values (10,'el dueno reescribe una YA verificada','0 filas', n||' filas', n=0);

  -- ── S10 · el MODERADOR verifica por RPC → sella verified_by/at (DEBE PASAR) ──
  perform set_config('request.jwt.claims', json_build_object('sub',MOD,'role','authenticated')::text, true);
  set local role authenticated;
  perform public.fb_verify('7702001234567', true);
  reset role;
  select count(*) into n from public.food_barcodes
   where ean='7702001234567' and verified and verified_by=MOD::uuid and verified_at is not null;
  insert into _r values (11,'MODERADOR verifica por RPC','sellada', n||' filas selladas', n=1);

  -- ── S11 · un NO moderador llama fb_verify → excepción (MUERDE) ──
  begin
    perform set_config('request.jwt.claims', json_build_object('sub',NOM,'role','authenticated')::text, true);
    set local role authenticated;
    perform public.fb_verify('7702007654321', true);
    reset role;
    insert into _r values (12,'no-moderador llama fb_verify','excepcion','PASO', false);
  exception when others then
    reset role;
    insert into _r values (12,'no-moderador llama fb_verify','excepcion', SQLERRM, SQLERRM like '%not a moderator%');
  end;

  -- ── S12 · `anon` ni siquiera puede EJECUTAR la cola (MUERDE) ──
  begin
    set local role anon;
    select count(*) into n from public.fb_pending();
    reset role;
    insert into _r values (13,'anon ejecuta fb_pending','sin permiso','EJECUTO', false);
  exception when others then
    reset role;
    insert into _r values (13,'anon ejecuta fb_pending','sin permiso', SQLERRM, SQLERRM like '%permission denied%');
  end;
end $$;

select n, caso, espera, left(obtuvo,60) as obtuvo, case when ok then 'MUERDE/PASA ✅' else '🔴 FALLA' end as veredicto from _r order by n;

rollback;
