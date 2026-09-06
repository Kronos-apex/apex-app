-- 20260905_push_hermano_abandonado.sql — EL APARATO QUE SE DEJÓ DE USAR (v577)
--
-- EL DEFECTO (auditoría «app instalada», 5-sep, hallazgo B1-1 y medición del orquestador).
-- v535 colapsó las filas duplicadas por (client_id, endpoint) y dejó escrito, con razón para
-- entonces, que **«Samuel y Natalia tienen 2 filas cada uno pero con 2 endpoints DISTINTOS: son
-- dos aparatos de verdad y NO se tocan»**. Esa clasificación nunca se volvió a comprobar, y hoy
-- ya no se sostiene para una de las dos:
--
--   Natalia Martinez, medido el 5-sep:
--     · fila A — refrescada hace 2 días, `training_days` = ["Lunes","Martes","Jueves","Viernes"]
--       (su plan REAL de hoy)
--     · fila B — refrescada hace **30 días**, `training_days` = **["Lunes","Lunes","Martes"]**,
--       que es exactamente la copia congelada del 7-ago que el gotcha de v551 nombra como
--       huérfana. Ningún código de hoy escribe eso.
--   En los logs de la edge de hoy le salen **2 envíos «✅» en cada una de las 3 rondas diarias**.
--   Samuel, en cambio, tiene 2 filas de 7 y 12 días con su plan correcto en las dos: esas SÍ
--   parecen dos aparatos, y esta migración NO las toca.
--
-- 🔬 LA MEDICIÓN QUE HABILITA LA REGLA, porque sin ella «antigua» no significaría nada:
-- `updated_at` NO es «cuándo cambió el endpoint», es **cuándo esa persona abrió la app en ese
-- aparato** — `ensureClientPush()` fuerza la reescritura una vez por sesión. Comprobado cruzando
-- las 7 personas que tienen las dos señales: la fecha de su suscripción coincide con la de su
-- último latido `profile.dev`. Sin ese cruce, la regla de abajo sería una corazonada.
--
-- 🔒 LA TRAMPA QUE ESTA REGLA ESQUIVA, y es la razón de que NO se pode «por antigüedad» a secas:
-- podar toda suscripción vieja borraría justo las de quien lleva semanas sin entrenar — que son
-- exactamente las personas para las que existen los avisos de RESCATE y de VUELTA. El canal para
-- recuperar a alguien se amputaría solo. Por eso:
--
--   ✅ Se borra una fila SOLO si el MISMO client_id tiene OTRA refrescada al menos 21 días
--      DESPUÉS. Es la firma de un aparato que se abandonó mientras el otro siguió en uso.
--   🔒 La fila MÁS RECIENTE de cada persona NO se toca JAMÁS, por vieja que sea. Quien tiene una
--      sola suscripción queda intacto aunque lleve seis meses sin abrir la app: ese es
--      precisamente a quien queremos alcanzar.
--
-- POR QUÉ TRIGGER Y NO JS (misma razón que v535, y sigue vigente): AVI es offline-first y el JS
-- viaja en la caché del Service Worker, así que hay teléfonos corriendo la versión anterior
-- durante días. El trigger arregla a todos desde el primer momento.
--
-- SEGURIDAD: `security definer` con `search_path = ''` (regla F6 del repo, y hay un candado que
-- lo cuenta). Hace falta definer porque el DELETE lo ejecuta el usuario autenticado y
-- `push_subscriptions` no tiene policy de DELETE — sin definer borraría 0 filas EN SILENCIO, que
-- es la peor de las salidas.

-- ── 0) El margen, en un solo sitio ───────────────────────────────────────────────────────────
-- 21 días: por debajo de eso dos aparatos que se alternan (el del gym y el de la casa) podrían
-- colapsarse el uno al otro. Natalia son 28 días de diferencia; Samuel, 5.

-- ── 1) Limpieza de lo que ya está abandonado hoy ─────────────────────────────────────────────
delete from public.push_subscriptions v
 where exists (
   select 1 from public.push_subscriptions n
    where n.client_id = v.client_id
      and n.id is distinct from v.id
      and n.updated_at > v.updated_at + interval '21 days'
 );

-- ── 2) El trigger, para que no vuelva a acumularse ───────────────────────────────────────────
create or replace function private._push_poda_hermano_abandonado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Se borran las hermanas de ESTE mismo cliente que quedaron 21+ días atrás respecto a la que
  -- entra ahora. `new.updated_at` puede venir null (la columna tiene default), así que se usa
  -- coalesce con now() — sin eso la comparación sería null y no borraría nada, en silencio.
  delete from public.push_subscriptions v
   where v.client_id = new.client_id
     and v.id is distinct from new.id
     and coalesce(new.updated_at, now()) > v.updated_at + interval '21 days';
  return new;
end;
$$;

-- Va DESPUÉS del dedupe por endpoint de v535: primero se colapsa la misma suscripción, y solo
-- luego se mira si quedó un aparato abandonado. El orden lo da el nombre del trigger (Postgres
-- los dispara alfabéticamente): `push_dedupe_endpoint` < `push_poda_hermano`.
drop trigger if exists push_poda_hermano on public.push_subscriptions;
create trigger push_poda_hermano
  before insert on public.push_subscriptions
  for each row execute function private._push_poda_hermano_abandonado();
