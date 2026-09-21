-- 20260921_chat_media.sql — FOTOS Y VIDEOS EN EL CHAT (v649)
--
-- Pedido del PO (21-sep-2026): que el asesorado pueda mandarle a su coach una foto o un video corto
-- de su técnica, y al revés.
--
-- 🔒 BUCKET PRIVADO, no `apex-photos`: ese es PÚBLICO (cualquiera con el enlace ve el archivo) y aquí
--    viaja el cuerpo de una persona entrenando, a veces un menor. Aquí no hay enlace público: la app
--    pide un enlace FIRMADO que vence, y solo lo consigue quien pasa la política de SELECT.
-- 🔒 Todo el material de una pareja vive en la carpeta del ASESORADO (`<uid del asesorado>/...`),
--    suba quien suba. Así lo pueden leer exactamente dos personas: el asesorado y su coach
--    (`user_data.coach_id`, que escribe el coach — mismo criterio que `apex-photos`), y borrar la
--    cuenta limpia una sola carpeta (edge `delete-account`).
-- 🔒 Las cuatro políticas, SELECT incluida: sin SELECT un upsert se rechaza (gotcha del 12-jul y v600),
--    y además el enlace firmado la necesita.
-- 📏 20 MB por archivo (un video de 60 s de un celular ronda 10-20 MB). El plan gratis trae 1 GB: el
--    límite es lo que evita que un solo video se coma el espacio de todos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 20971520,
        array['image/jpeg','image/webp','image/png','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists chat_media_select on storage.objects;
create policy chat_media_select on storage.objects for select to authenticated
  using (bucket_id = 'chat-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));

drop policy if exists chat_media_insert on storage.objects;
create policy chat_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));

drop policy if exists chat_media_update on storage.objects;
create policy chat_media_update on storage.objects for update to authenticated
  using (bucket_id = 'chat-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())))
  with check (bucket_id = 'chat-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));

drop policy if exists chat_media_delete on storage.objects;
create policy chat_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));
