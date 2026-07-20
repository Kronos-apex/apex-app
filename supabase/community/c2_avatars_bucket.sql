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

-- ⚠️ FIX 2026-07-20 (bug reportado por Camilo: "no me dejó subir la foto" → POST 400 storage):
-- el cliente sube con x-upsert:true (sobrescribe avatars/{uid}/avatar.jpg), pero un UPSERT necesita
-- LEER la fila para resolver el conflicto → SIN policy SELECT, RLS la oculta y RECHAZA con
-- "new row violates row-level security policy" (HTTP 400). MISMA CLASE que el bug de push 2026-07-12:
-- todo upsert exige INSERT+UPDATE+SELECT. Reproducido con cuenta QA (x-upsert=400, sin upsert=200) y
-- corregido: SELECT ACOTADA a la carpeta propia → arregla el upsert SIN habilitar enumeración (el
-- dueño solo lista SU carpeta; los avatares de amigos se ven por URL pública, no por esta policy).
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- Re-verificado: con la policy, la subida con x-upsert de la app da 200 (antes 400).
