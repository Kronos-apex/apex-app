-- ============================================================================
-- C2 · Bucket de AVATARES de comunidad (§9.4) — estado REAL en producción
-- ============================================================================
-- Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-19). NO toca la ruta rota de fotos de progreso.
-- Diseño: bucket PÚBLICO en lectura (el avatar se ve por URL como en cualquier app; la URL solo
-- llega a amigos vía el perfil friend-gated o a quien tenga tu código vía resolve_share_code).
-- Escritura SOLO del dueño en su carpeta avatars/{auth.uid()}/. Límite 2 MB + solo imágenes.
--
-- ⚠️ NOTA (advisor 0025 "public_bucket_allows_listing"): un bucket público sirve los objetos por su
-- URL SIN necesidad de una policy SELECT. Una policy SELECT amplia (using bucket_id='avatars') solo
-- habilita LISTAR/enumerar todos los archivos → se OMITE a propósito. Sin policy SELECT: los avatares
-- se ven por URL, pero nadie puede enumerar la carpeta ajena.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars','avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;

-- Escritura SOLO del dueño en avatars/{auth.uid()}/…  (NO hay policy SELECT: ver nota de arriba)
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Verificado con dientes (probe RLS, 2026-07-19): un usuario NO puede escribir en la carpeta de otro,
-- sí en la suya (WITH CHECK folder[1]=auth.uid()).
