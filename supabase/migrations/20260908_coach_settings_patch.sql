-- 20260908_coach_settings_patch.sql — ESCRIBIR UN AJUSTE SIN SUBIR LA BIBLIOTECA (v589)
--
-- EL DEFECTO (auditoría «herramientas del coach», 7-sep, hallazgo D2-2).
-- Los 7 ajustes del coach viven juntos en UNA columna jsonb (`user_data.coach_settings`) y
-- PostgREST reemplaza la columna ENTERA en cada escritura. Dentro de esa columna vive `e`, que
-- es su copia de la biblioteca de ejercicios.
--
-- Medido el 8-sep contra producción, sobre la fila real del coach:
--     coach_settings ................ 241.029 B
--       · e   (biblioteca, 374 ej.) .. 239.849 B  ← el 99,5 %
--       · mr  (chats leídos) .........     960 B
--       · ld  (leads atendidos) ......     133 B
--       · cn / ce / site / nequi .....      40 B
--
-- O sea que marcar una conversación como leída —que es escribir esos 960 B— costaba **241 KB
-- de subida desde el celular del coach**, y eso pasa al abrir cada chat, al enviar cada mensaje
-- y cada vez que llega uno con el chat abierto. 250 veces lo que el dato pesa.
--
-- LA FORMA DEL ARREGLO, y por qué es una función y no un cambio de esquema:
-- partir la columna en varias (o sacar la biblioteca a la suya) obliga a tocar el ARRANQUE del
-- coach —hidratación, respaldo local y el `_coachSettingsObj` que arma el backup— para ganar lo
-- mismo que se gana aquí sin mover un solo dato. La fusión (`||`) la hace el servidor: el
-- cliente manda únicamente la clave que cambió.
--
-- 🔒 SEGURIDAD — `security invoker` A PROPÓSITO, y es lo contrario de la regla habitual:
-- las funciones DEFINER de este repo existen para poder leer algo que el usuario NO puede leer
-- (los conteos de seguidores, el límite de mensajes). Aquí no hace falta ninguna elevación: el
-- coach ya tiene permiso de UPDATE sobre su propia fila. Con INVOKER la RLS se evalúa con SU
-- identidad, así que esta función NO puede escribir en la fila de nadie más aunque alguien la
-- llame con otros argumentos — no hay `user_id` que pasar. El `where user_id = auth.uid()` es
-- el cinturón, y la policy `auth.uid() = user_id` de `user_data` son los tirantes.
-- `set search_path = ''` + nombres calificados, como el resto (regla F6, con candado en la suite).
--
-- 🔒 Y el patch es un OBJETO, no una ruta: `||` fusiona en el primer nivel, así que mandar
-- `{"mr": {...}}` reemplaza `mr` y deja `e` intacta. Un `jsonb_set` con ruta variable dejaría
-- que el cliente escribiera dentro de cualquier clave anidada; esto no.

create or replace function public.coach_settings_patch(p jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.user_data
     set coach_settings = coalesce(coach_settings, '{}'::jsonb) || coalesce(p, '{}'::jsonb),
         updated_at = now()
   where user_id = auth.uid();
$$;

revoke execute on function public.coach_settings_patch(jsonb) from public, anon;
grant  execute on function public.coach_settings_patch(jsonb) to authenticated;

comment on function public.coach_settings_patch(jsonb) is
  'v589 — fusiona solo las claves recibidas en user_data.coach_settings del usuario en sesión. '
  'INVOKER: la RLS decide igual que en cualquier escritura suya. Evita subir la biblioteca de '
  'ejercicios (239 KB) cada vez que se marca un chat como leído (960 B).';
