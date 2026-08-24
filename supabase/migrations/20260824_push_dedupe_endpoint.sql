-- 20260824_push_dedupe_endpoint.sql — UNA SUSCRIPCIÓN POR TELÉFONO, NO POR CLAVE (v535)
--
-- EL DEFECTO (hallazgo H1 de la auditoría de base de datos, medido el 22-ago y reproducido el 24):
-- la UNIQUE de `push_subscriptions` es `(client_id, subscription)`, y `subscription` incluye
-- `keys.p256dh` y `keys.auth`, que **el navegador ROTA** cada vez que rehace la suscripción. Así
-- que el `upsert` con `onConflict:'client_id,subscription'` **nunca casa el conflicto** e inserta
-- una fila nueva. Y `ensureClientPush()` llama con `force=true` una vez por cada apertura de la
-- app, saltándose el guard que lo frenaría.
--   Medido en producción: **Nataly, 8 filas · 1 endpoint · 8 claves**, acumuladas entre el 12 y el
--   20 de agosto (~1 por apertura). Los logs de la edge de ese día imprimieron **8 líneas de envío
--   para ella en una sola ronda**: 7 de cada 17 envíos diarios eran basura.
--   🔒 EL CONTROL que separa el defecto de lo legítimo: Samuel y Natalia tienen 2 filas cada uno
--   pero con **2 endpoints DISTINTOS** — son dos aparatos de verdad y NO se tocan.
-- No hay auto-cura: `send-push` solo poda en 410/404 y un endpoint vivo con clave vieja devuelve
-- 201. Sólo crece (10 filas en julio → 18 hoy).
--
-- 🔴 POR QUÉ SE ARREGLA CON UN TRIGGER Y NO CAMBIANDO EL `onConflict` DEL CLIENTE: AVI es
-- offline-first y el JS viaja en la caché del Service Worker, así que durante horas o días hay
-- teléfonos corriendo la versión ANTERIOR. Si sólo se creara el índice único nuevo, esos clientes
-- viejos —que siguen apuntando su `onConflict` a la constraint vieja— **fallarían al re-suscribirse**
-- (el conflicto no lo captura su cláusula, así que el INSERT revienta contra el índice nuevo) y se
-- quedarían con las claves caducadas, o sea sin recibir avisos. El trigger, en cambio, arregla a
-- TODOS desde el primer momento y sin tocar una línea de JS: la primera vez que cada persona abra
-- la app, sus filas se colapsan en una.
--
-- SEGURIDAD: la función va `security definer` con `search_path = ''` (regla del repo: F6 exigió que
-- TODAS las definer lo declaren, y el candado lo cuenta). Hace falta definer porque el DELETE lo
-- ejecuta el usuario autenticado y `push_subscriptions` no tiene policy de DELETE — sin definer
-- borraría 0 filas en silencio, que es la peor de las salidas.

-- ── 1) Limpieza de lo que ya está duplicado ──────────────────────────────────────────────────
-- Se conserva la fila más RECIENTE por (client_id, endpoint) — es la que tiene las claves vivas —
-- y se le arrastran `training_days`/`training_shift` de cualquier hermana que los traiga, para no
-- perder los ajustes por aparato al borrar.
with orden as (
  select id, client_id,
         subscription->>'endpoint' as endpoint,
         row_number() over (partition by client_id, subscription->>'endpoint'
                            order by updated_at desc nulls last, id desc) as rn
  from public.push_subscriptions
),
rescate as (
  select o.client_id, o.endpoint,
         (array_agg(p.training_days  order by p.updated_at desc nulls last)
            filter (where p.training_days  is not null))[1] as td,
         (array_agg(p.training_shift order by p.updated_at desc nulls last)
            filter (where p.training_shift is not null))[1] as ts
  from orden o join public.push_subscriptions p on p.id = o.id
  group by 1, 2
)
update public.push_subscriptions p
   set training_days  = coalesce(p.training_days,  r.td),
       training_shift = coalesce(p.training_shift, r.ts)
  from orden o
  join rescate r on r.client_id = o.client_id and r.endpoint = o.endpoint
 where p.id = o.id and o.rn = 1;

delete from public.push_subscriptions p
 using (
   select id, row_number() over (partition by client_id, subscription->>'endpoint'
                                 order by updated_at desc nulls last, id desc) as rn
   from public.push_subscriptions
 ) o
 where p.id = o.id and o.rn > 1;

-- ── 2) El trigger: la identidad de una suscripción es el ENDPOINT ────────────────────────────
create or replace function private._push_dedupe_endpoint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare vieja record;
begin
  -- Se arrastran los ajustes por aparato de la fila que se va, si la nueva no los trae.
  -- ⚠️ DOS TRAMPAS, las dos cazadas por la prueba en transacción con rollback y NINGUNA por leer
  -- el código:
  --   (1) `training_days` tiene DEFAULT '[]'::jsonb, así que NUNCA llega null → un `coalesce` a
  --       secas es INERTE y se pierden los días guardados;
  --   (2) en PL/pgSQL un `SELECT ... INTO` que NO encuentra fila **pone NULL en los destinos**.
  --       Asignando directo sobre `new.*`, la PRIMERA suscripción de cada aparato (que no tiene
  --       hermana que buscar) se borraba a sí misma los ajustes que venían en el INSERT.
  -- Por eso se lee a una variable y solo se asigna `if found`.
  select v.training_days, v.training_shift into vieja
    from public.push_subscriptions v
   where v.client_id = new.client_id
     and v.subscription->>'endpoint' = new.subscription->>'endpoint'
     and v.id is distinct from new.id
   order by v.updated_at desc nulls last
   limit 1;
  if found then
    if new.training_days is null or new.training_days = '[]'::jsonb then
      new.training_days := vieja.training_days;
    end if;
    if new.training_shift is null then
      new.training_shift := vieja.training_shift;
    end if;
  end if;

  delete from public.push_subscriptions v
   where v.client_id = new.client_id
     and v.subscription->>'endpoint' = new.subscription->>'endpoint'
     and v.id is distinct from new.id;
  return new;
end;
$$;

drop trigger if exists push_dedupe_endpoint on public.push_subscriptions;
create trigger push_dedupe_endpoint
  before insert on public.push_subscriptions
  for each row execute function private._push_dedupe_endpoint();

-- ── 3) El candado, por si el trigger se cae algún día ────────────────────────────────────────
-- Es seguro crearlo DESPUÉS del trigger: el trigger quita el conflicto antes de que el INSERT
-- llegue al índice, así que ningún cliente —viejo o nuevo— lo viola.
create unique index if not exists push_subscriptions_client_endpoint_key
  on public.push_subscriptions (client_id, (subscription->>'endpoint'));
