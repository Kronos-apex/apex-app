-- ══════════════════════════════════════════════════════════════════════════════════════════
-- 20260910 · apex-photos: LA POLICY SELECT QUE FALTABA (y por la que ninguna foto subió nunca)
-- ══════════════════════════════════════════════════════════════════════════════════════════
-- MEDIDO el 10-sep-2026 contra producción:
--   · el bucket `apex-photos` tenía DOS objetos en toda su historia, los dos del 28-may 11:58:06
--     y 11:58:07 (una migración de un tiro). Ninguna subida orgánica, nunca.
--   · el avatar de perfil no subió NI UNA VEZ: los 3 que existen viven en base64.
--   · 11 fotos de progreso + 3 avatares de 6 personas ocupaban 838 KB DENTRO de las filas de
--     `user_data`, porque el `catch` del llamador cae a base64 y solo deja un `warn`.
--   · `migratePhotosToStorage` corre 3 s después de CADA arranque: llevaba 3 meses y medio
--     reintentando y fallando en silencio, en cada apertura de cada persona.
--
-- CAUSA (reproducida con un JWT de usuario real, no deducida):
--   el POST de subida va con `x-upsert: true`, y un upsert necesita LEER la fila existente para
--   resolver el conflicto. `apex-photos` no tenía policy SELECT → la RLS se la oculta y RECHAZA
--   con «new row violates row-level security policy» (HTTP 400).
--   🔬 Mismo token, mismo bucket, SIN `x-upsert` → 200.
--   🔬 CONTROL: mismo token CON `x-upsert` contra `avatars` (que sí tiene su SELECT) → 200.
--      O sea que no era el token, ni el cliente, ni el tamaño, ni el mime: eran las policies.
--   🔒 CONTROL de seguridad: subir a la raíz del bucket, sin carpeta → 403. La guarda funciona,
--      así que este arreglo NO la puede ensanchar.
--
-- 🔴 Y la nota que este mismo repo dejó el 12-jul en `20260712_rls_snapshot_refresh.sql` decía que
--    la causa era la ruta con el id legacy. Es solo la MITAD, y es la que NO manda: con la ruta ya
--    correcta seguía fallando. La otra mitad estaba escrita —con este fallo explicado palabra por
--    palabra— en `community/c2_avatars_bucket.sql`, del MISMO DÍA, que lo arregló para el bucket
--    hermano con `avatars_select_own`. La lección se aprendió, se escribió, se aplicó a UN bucket
--    y nunca se trajo al otro. Puerta cerrada, ventana abierta (misma familia que v424).
--
-- La ruta la arregla la app en v600 (la carpeta pasa a ser el uuid de auth, no el id de cliente),
-- y las 11 fotos + 3 avatares se migran SOLOS en la siguiente apertura de cada persona.
--
-- ⚠️ ACOTADA A LA CARPETA PROPIA, jamás un `using (bucket_id='apex-photos')` a secas: un SELECT
--    ancho habilitaría LISTAR/enumerar todo el bucket. Es exactamente la razón por la que
--    `c2_avatars_bucket.sql` lo acotó, y aquí se copia el criterio, no solo la línea.
--    Las fotos se VEN por URL pública (el bucket es público), no por esta policy.
-- ══════════════════════════════════════════════════════════════════════════════════════════

drop policy if exists apex_photos_select_own on storage.objects;
create policy apex_photos_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'apex-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Verificación después de aplicar (con la cuenta QA, no con una real):
--   node scripts/e2e/_verify-v600.mjs
-- Espera: subida con x-upsert a la carpeta propia → 200 · a la carpeta de otro → 403.
