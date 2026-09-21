-- 20260921_progress_photos.sql — LAS FOTOS DE PROGRESO PASAN A UN BUCKET PRIVADO (v650)
--
-- Pedido del PO (21-sep-2026). `apex-photos` es PÚBLICO: cualquiera con el enlace veía la foto de
-- progreso de una persona (su cuerpo, a veces un menor). Medido antes: 15 fotos vivas de 6 personas
-- — 13 base64 dentro de la propia fila (privadas por RLS) y 2 en `apex-photos` con enlace público.
-- En `apex-photos` se quedan SOLO las fotos de perfil (avatar), que se muestran en toda la app.
--
-- 🔒 Mismo modelo que `chat-media` (v649): todo en la carpeta del ASESORADO; lo leen exactamente él y
--    su coach (`user_data.coach_id`); sin enlace público — la app pide uno FIRMADO que vence.
-- 🔒 Las cuatro políticas, SELECT incluida (sin SELECT el upsert se rechaza y no hay enlace firmado).
-- 📏 5 MB y solo imágenes: la app las reduce antes de subir (~100 KB).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg','image/webp','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists progress_photos_select on storage.objects;
create policy progress_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));

drop policy if exists progress_photos_insert on storage.objects;
create policy progress_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));

drop policy if exists progress_photos_update on storage.objects;
create policy progress_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())))
  with check (bucket_id = 'progress-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));

drop policy if exists progress_photos_delete on storage.objects;
create policy progress_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.user_data ud
               where ud.user_id::text = (storage.foldername(objects.name))[1] and ud.coach_id = auth.uid())));
