-- ============================================================================
-- S1 · VITRINA PÚBLICA — las tarjetas de progreso que el coach publica en su página
-- ============================================================================
-- Pedido del PO (2026-08-22), describiendo cómo vende: «voz a voz de gente que me ve entrenando
-- y le da curiosidad cuando le presento la app; también comparto el link de la app en historia de
-- Instagram, Facebook y WhatsApp. **Lo que más está vendiendo ahora es el resultado visual de las
-- personas que entrenan conmigo**».
--
-- 🔴 EL PROBLEMA MEDIDO: quien toca ese link ve una promesa («tu coach arma tu plan, te acompaña
-- y te responde») y **CERO pruebas** — ni una cifra, ni una cara, ni un resultado (capturado
-- contra producción el 22-ago). Y la página de llegada es PÚBLICA, así que no puede leer los
-- datos de sus asesorados: están cerrados a quien no inició sesión, y eso es a propósito.
-- Esta tabla es el puente: lo ÚNICO que el coach decide publicar, y nada más.
--
-- 🔒 QUÉ VIVE AQUÍ Y QUÉ NO. Solo el PRIMER NOMBRE y números de entrenamiento que él eligió
-- mostrar. Ni apellidos, ni edad, ni peso, ni medidas, ni fotos, ni el id del asesorado — nada
-- que permita cruzar esta fila con la persona dentro de la app. Es una vitrina, no una copia.
--
-- 🔒 SIN GRANT DE UPDATE, A PROPÓSITO. Lección c13c de este mismo repo: una policy de INSERT que
-- restringe un valor NO sirve de nada si el grant de UPDATE es amplio — el cliente inserta algo
-- legítimo y después lo edita hasta el estado que el INSERT le prohibía. Aquí editar = borrar y
-- volver a publicar. El validador vive en un trigger y corre en INSERT, que es la única puerta.
--
-- 🔒 TOPE DE 6 POR COACH. Una vitrina sin tope crece hasta volver ilegible la página de llegada,
-- que es justo lo que esta tabla existe para arreglar.
--
-- ⚖️ CONSENTIMIENTO: lo resuelve el coach tarjeta por tarjeta (la app se lo recuerda al publicar,
-- y le avisa de la diferencia con una historia de Instagram: esto queda PERMANENTE y público).
-- Por eso el borrado es de una: si la persona se lo pide, se quita en un toque.

create table public.avi_showcase (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- primer nombre, nada más. El largo tope es el que cabe en la tarjeta sin recortarse.
  nombre      text not null check (btrim(nombre) <> '' and length(nombre) <= 24),
  entrenos    int  not null check (entrenos >= 1 and entrenos <= 2000),
  meses       int  not null check (meses >= 1 and meses <= 240),
  -- [{ejercicio, de, a}] — lo valida el trigger con allow-list (patrón c12)
  subidas     jsonb not null,
  subieron    int  not null check (subieron >= 1 and subieron <= 200),
  con_carga   int  not null check (con_carga >= 1 and con_carga <= 200),
  created_at  timestamptz not null default now(),
  check (subieron <= con_carga)
);

-- ── Allow-list del payload (patrón del muro, c12): el cliente NO decide la forma ──
-- Sin esto, `subidas` es un jsonb libre y por ahí entra cualquier cosa a una página pública.
create or replace function public._showcase_validate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare it jsonb; n int;
begin
  if jsonb_typeof(new.subidas) <> 'array' then
    raise exception 'subidas debe ser un arreglo';
  end if;
  n := jsonb_array_length(new.subidas);
  if n < 1 or n > 3 then
    raise exception 'subidas debe traer entre 1 y 3 elementos (es lo que cabe legible en la tarjeta)';
  end if;
  for it in select * from jsonb_array_elements(new.subidas) loop
    if (select count(*) from jsonb_object_keys(it) k where k not in ('ejercicio','de','a')) > 0
       or not (it ? 'ejercicio' and it ? 'de' and it ? 'a') then
      raise exception 'cada subida lleva exactamente ejercicio, de y a';
    end if;
    if jsonb_typeof(it->'ejercicio') <> 'string'
       or btrim(it->>'ejercicio') = '' or length(it->>'ejercicio') > 60 then
      raise exception 'ejercicio debe ser texto de 1 a 60 caracteres';
    end if;
    if jsonb_typeof(it->'de') <> 'number' or jsonb_typeof(it->'a') <> 'number'
       or (it->>'de')::numeric <= 0 or (it->>'a')::numeric <= 0
       or (it->>'a')::numeric <= (it->>'de')::numeric
       or (it->>'a')::numeric > 1000 then
      raise exception 'de y a deben ser kilos positivos con a > de';
    end if;
  end loop;
  -- tope por coach: la vitrina no crece sin fin
  if (select count(*) from public.avi_showcase s where s.coach_id = new.coach_id) >= 6 then
    raise exception 'ya hay 6 tarjetas publicadas: quita una antes de publicar otra';
  end if;
  return new;
end $$;

create trigger showcase_validate before insert on public.avi_showcase
  for each row execute function public._showcase_validate();

alter table public.avi_showcase enable row level security;

-- LEER: cualquiera, incluido quien no tiene cuenta. ES EL PUNTO de la tabla — es la prueba que
-- ve quien llega desde una historia de Instagram.
create policy showcase_sel on public.avi_showcase for select to anon, authenticated using (true);
-- ESCRIBIR: solo el dueño, y solo lo suyo.
create policy showcase_ins on public.avi_showcase for insert to authenticated with check (coach_id = auth.uid());
create policy showcase_del on public.avi_showcase for delete to authenticated using (coach_id = auth.uid());

revoke all on public.avi_showcase from anon, authenticated;
grant select on public.avi_showcase to anon, authenticated;
grant insert, delete on public.avi_showcase to authenticated;   -- ⚠️ UPDATE NO: ver la nota de arriba
revoke execute on function public._showcase_validate() from public, anon, authenticated;

create index avi_showcase_coach_idx on public.avi_showcase (coach_id, created_at desc);
