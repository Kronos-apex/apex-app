-- s3_showcase_dueno.sql — DE QUIÉN ES CADA TARJETA PÚBLICA, SIN PUBLICARLO (v691)
--
-- `avi_showcase` guarda solo el PRIMER NOMBRE a propósito: es la única tabla que se lee sin cuenta, y lo
-- que no está ahí no se puede filtrar (s1). El precio era que la tarjeta solo se podía atar a su persona
-- por ese nombre, y con dos asesorados que se llaman igual (ya pasó: dos con el mismo primer nombre),
-- borrar la cuenta de uno se llevaba la tarjeta del OTRO, y la ficha de uno mostraba y dejaba quitar la
-- tarjeta del otro.
--
-- Esta tabla guarda la atadura por cuenta y NO se puede leer sin sesión: la tabla pública no cambia.
-- 🔒 Solo el coach dueño de la tarjeta la escribe y la lee. Sin UPDATE (como s1): corregir = quitar y
--    volver a publicar. Quitar la tarjeta se lleva la atadura (ON DELETE CASCADE).
-- 🔒 El que borra la cuenta de alguien (`delete-account`, service role) la lee para saber qué quitar.

create table if not exists public.avi_showcase_dueno (
  showcase_id uuid primary key references public.avi_showcase(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  coach_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists avi_showcase_dueno_user on public.avi_showcase_dueno(user_id);

alter table public.avi_showcase_dueno enable row level security;

-- Escribe solo el coach dueño de la tarjeta, y solo hacia un asesorado suyo.
create policy showcase_dueno_ins on public.avi_showcase_dueno for insert to authenticated
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.avi_showcase s where s.id = showcase_id and s.coach_id = auth.uid())
    and exists (select 1 from public.user_data u where u.user_id = avi_showcase_dueno.user_id and u.coach_id = auth.uid())
  );
create policy showcase_dueno_sel on public.avi_showcase_dueno for select to authenticated using (coach_id = auth.uid());
create policy showcase_dueno_del on public.avi_showcase_dueno for delete to authenticated using (coach_id = auth.uid());

revoke all on public.avi_showcase_dueno from public, anon, authenticated;
grant select, insert, delete on public.avi_showcase_dueno to authenticated;   -- ⚠️ UPDATE NO, y nada para anon

-- Las tarjetas que ya estaban publicadas: se atan SOLO si el nombre no se repite entre los asesorados de
-- ese coach. Si se repite, se quedan sin atar y la app las muestra como «revisar» (no se adivina).
insert into public.avi_showcase_dueno (showcase_id, user_id, coach_id)
select s.id, u.user_id, s.coach_id
from public.avi_showcase s
join public.user_data u
  on u.coach_id = s.coach_id
 and lower(split_part(btrim(coalesce(u.profile->>'name', '')), ' ', 1)) = lower(s.nombre)
where (select count(*) from public.user_data u2
       where u2.coach_id = s.coach_id
         and lower(split_part(btrim(coalesce(u2.profile->>'name', '')), ' ', 1)) = lower(s.nombre)) = 1
on conflict (showcase_id) do nothing;
