-- ============================================================================
-- S5 · CUÁNTA GENTE LLEGA A CADA PASO DEL REGISTRO, SIN SABER QUIÉN ES
-- ============================================================================
-- Auditoría final de la web (5-oct-2026), punto 8; el PO aprobó «dale con todos».
--
-- 🔴 POR QUÉ: desde el 30-sep no se creó ninguna cuenta nueva y no había forma de separar «no llegan»
-- de «llegan y se van en el paso 7». Vercel cuenta los clics en «Probar la app» (/ir/probar), pero
-- lo que pasa DENTRO del registro no lo veía nadie.
--
-- 🔒 SIN NINGÚN DATO DE LA PERSONA. Una fila por paso VISTO con tres cosas: el número de paso, si
-- llegó desde la web o no, y el canal (una etiqueta como «ig-bio», nunca un nombre). Ni id, ni correo,
-- ni nombre, ni dirección de red guardada: la fila no trae ningún identificador. La fila la arma
-- `signupFunnelRow` (avi-core.js), que es su ESPEJO; los tests leen ESTE archivo y fallan si se separan.
--
-- Pasos: 1-7 = el paso del asistente que se mostró · 8 = creó la cuenta con su correo (le falta
-- confirmarlo) · 9 = salió a Google · 10 = la cuenta quedó lista y entró.
--
-- 🔒 SOLO INSERTAR. Nadie la lee desde la app: ni el anónimo ni el autenticado tienen SELECT (los
-- números se leen desde el panel de Supabase). Sin UPDATE ni DELETE: una fila no se corrige, se
-- cuenta. Y el CHECK acota cada columna, así que una fila inventada a mano no puede meter texto libre.
-- ============================================================================

create table if not exists public.signup_funnel (
  id bigserial primary key,
  at timestamptz not null default now(),
  paso smallint not null check (paso between 1 and 10),
  origen text not null check (origen in ('web', 'app')),
  canal text check (canal is null or canal ~ '^[a-z0-9][a-z0-9-]{1,23}$')
);

alter table public.signup_funnel enable row level security;

revoke all on table public.signup_funnel from anon, authenticated;
grant insert on table public.signup_funnel to anon, authenticated;
grant usage on sequence public.signup_funnel_id_seq to anon, authenticated;

drop policy if exists signup_funnel_ins on public.signup_funnel;
create policy signup_funnel_ins on public.signup_funnel
  for insert to anon, authenticated
  with check (paso between 1 and 10 and origen in ('web', 'app'));
