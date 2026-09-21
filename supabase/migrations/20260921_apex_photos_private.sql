-- 20260921_apex_photos_private.sql — `apex-photos` DEJA DE SER PÚBLICO (v652)
--
-- Desde v650 (fotos de progreso) y v652 (fotos de perfil) todo va al bucket privado
-- `progress-photos`. El 21-sep se mudaron por servidor las 7 fotos que quedaban aquí (2 de progreso,
-- 5 de perfil) y se borraron los 7 objetos (incluidos 2 huérfanos). Medido antes: 0 referencias a
-- `apex-photos` en perfiles, fotos, ajustes y mensajes.
-- 🔒 Cinturón: aunque alguien volviera a subir aquí, ya no habría enlace público que lo expusiera.
update storage.buckets set public = false where id = 'apex-photos';
