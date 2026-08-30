-- ============================================================================
-- S2 · EL OBJETIVO EN LA TARJETA DE VITRINA
-- ============================================================================
-- Pedido del PO (2026-08-30): «en la tarjeta debería aparecer el objetivo de cada quien».
--
-- 🔴 POR QUÉ NO ES DECORACIÓN: sin el objetivo, la MISMA cifra dice cosas opuestas. Nataly subió
-- de 54 a 59,5 kg y eso es un ÉXITO —su objetivo es ganar músculo— pero en una tarjeta muda un
-- «+5,5 kg» en una página de venta se lee como que engordó. Y al revés: Kathe y Claudia buscan
-- recomposición, así que su historia no es la báscula sino los kilos que mueven. El objetivo es
-- la LENTE con la que se leen los números que ya están en la tarjeta.
--
-- 🔒 SIGUE SIN HABER PESO, EDAD NI MEDIDAS. El principio de s1 no se toca: aquí solo entra un
-- valor de una lista cerrada de seis, el mismo que el coach ya eligió en la ficha. No permite
-- cruzar la fila con la persona dentro de la app, que es lo que s1 vino a impedir.
--
-- 🔒 NULA A PROPÓSITO. Las 6 tarjetas ya publicadas nacieron sin objetivo y NO se pueden editar
-- (s1 no da grant de UPDATE: editar = quitar y volver a publicar). Una columna NOT NULL las
-- rompería o exigiría inventarles un valor. Quedan en null y la tarjeta simplemente no pinta el
-- chip; cuando él las renueve, entran con su objetivo.
--
-- 🔒 CHECK DECLARATIVO, NO TRIGGER. La allow-list de `subidas` vive en el trigger porque es un
-- jsonb con forma; esto es una columna de texto contra seis valores, y un CHECK es el candado
-- exacto. Su espejo en la app es `SHOWCASE_OBJETIVOS` en avi-core.js, y hay un test que lee ESTE
-- archivo y falla si las dos listas se separan.
-- ============================================================================

alter table public.avi_showcase
  add column if not exists objetivo text;

-- Los seis son los mismos <option> del formulario de la ficha (index.html #cf-goal) y de la
-- alta guiada (#su-goal). Si alguna vez se agrega un objetivo allí, este CHECK lo rechaza y el
-- test del espejo lo caza antes de que llegue a la cara del coach.
alter table public.avi_showcase
  drop constraint if exists avi_showcase_objetivo_check;
alter table public.avi_showcase
  add constraint avi_showcase_objetivo_check check (
    objetivo is null or objetivo in (
      'Perder grasa', 'Ganar músculo', 'Recomposición', 'Fuerza', 'Resistencia', 'Salud general'
    )
  );
