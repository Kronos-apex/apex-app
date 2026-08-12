-- ============================================================================
-- F6 · LA COLA DE APROBACIÓN DEL COACH — moderar lo que la gente escanea
-- ============================================================================
-- Cierra lo que F5 dejó abierto. Sin esto **nada llega nunca a `verified`**: la RPC `fb_verify`
-- existe desde el 10-ago pero no había pantalla que la llamara, así que el rótulo «sin revisar»
-- salía en el 100% de los productos aportados. Una marca de calidad que nadie puede quitar no es
-- una marca de calidad: es ruido que la gente aprende a ignorar.
--
-- 🔴 POR QUÉ HACEN FALTA RPCs Y NO BASTA UN SELECT DEL CLIENTE:
--   `fb_sel` deja a cualquier autenticado leer la tabla entera, así que un `select ... where
--   verified = false` funcionaría. Pero entonces la cola le aparecería a CUALQUIER coach, y al
--   pulsar «Aprobar» recibiría `not a moderator` de `fb_verify`. Un botón que se ve y no se puede
--   usar es peor que uno que no está. Con `fb_pending()` la autoridad y la vista salen de la
--   MISMA fuente: un no-moderador recibe 0 filas, en silencio, y la tarjeta ni se pinta. Es el
--   patrón que este repo ya estipuló en `cmty_mod_reports` (c14), y la razón de fondo es la
--   lección F7: no se gatea una pantalla con algo que el cliente pueda decidir por su cuenta.
--
-- 🔴 POR QUÉ `fb_delete` EXISTE, contra lo que dice el comentario de F5:
--   El `.sql` de F5 prohibió el DELETE razonando que «un alimento borrado rompería los registros
--   que lo referencian». **Se verificó y es falso en esta arquitectura**: `foodLogEntry`
--   (avi-core.js) COPIA `name/kcal/p/c/f` dentro de la entrada del registro — `foodId` queda solo
--   como referencia muerta — y no hay ni una sola FK entrante hacia `food_barcodes` (comprobado
--   contra producción). Borrar una fila no toca el historial de nadie.
--   ⚠️ Que borrar sea SEGURO no significa que deba poder hacerlo cualquiera: al cliente se le
--   sigue negando el DELETE (ni grant ni policy), porque un catálogo compartido donde cualquiera
--   borra filas es vandalismo con un `curl`. La puerta la abre un moderador y nadie más.
--   Y hace falta una salida, porque la alternativa es peor: sin ella, una fila de basura se queda
--   en la cola PARA SIEMPRE, la tarjeta dice «1 por revisar» eternamente, y el coach aprende a no
--   mirarla. Este proyecto ya tiene el precedente caro de gates que llevaban meses en rojo porque
--   nadie los miraba. **Una bandeja que no se puede vaciar es una bandeja muerta.**
--   Borrar (y no un estado «oculto») además LIBERA EL EAN: quien vuelva a escanear ese empaque lo
--   aporta de nuevo, bien. Una fila zombi ocupando la clave primaria haría que el segundo intento
--   fallara con `duplicate key` sobre un producto que la persona tiene en la mano.
--
-- ⚠️ Lo que NO se toca: `verified` sigue sin grant de UPDATE para nadie (F5), así que la única
-- puerta para moverlo sigue siendo `fb_verify`. Aquí no se relaja ni un permiso de columna.

-- ── LA COLA ─────────────────────────────────────────────────────────────────
-- Devuelve lo pendiente PRIMERO y detrás lo ya verificado (para poder deshacer una aprobación
-- equivocada sin tener que buscar el producto escaneándolo otra vez). `created_by` NO sale: el
-- coach tiene que decidir mirando el DATO, no mirando de quién es. Si sale el nombre de la
-- persona, se aprueba por confianza y la cola deja de filtrar nada — que es justo lo que pasó
-- con la yuca «cocida», un dato perfectamente coherente consigo mismo.
create function public.fb_pending()
  returns table(ean text, name text, brand text,
                kcal numeric, p numeric, c numeric, f numeric,
                un_label text, un_g numeric,
                verified boolean, created_at timestamptz)
  language sql stable security definer set search_path = '' as $$
  select b.ean, b.name, b.brand, b.kcal, b.p, b.c, b.f, b.un_label, b.un_g,
         b.verified, b.created_at
    from public.food_barcodes b
   where private._is_moderator(auth.uid())   -- no-moderador → 0 filas, en silencio
   order by b.verified asc, b.created_at desc
   limit 200;
$$;
revoke all on function public.fb_pending() from public, anon;
grant execute on function public.fb_pending() to authenticated, service_role;

-- ── DESCARTAR ───────────────────────────────────────────────────────────────
-- SECURITY DEFINER porque el cliente NO tiene grant de DELETE sobre la tabla (F5 lo revocó a
-- todos, y sigue revocado). Esta es la única puerta, y solo la abre un moderador.
-- 🔒 Se niega a borrar una fila YA VERIFICADA: si el coach quiere sacarla, primero le quita la
-- aprobación (`fb_verify(ean,false)`) y entonces la borra. Dos actos deliberados, no uno — un
-- producto verificado es el que más gente está usando, y es el que más caro sale borrar de un
-- toque mal dado. Es la misma doctrina del `confirm()` de la interfaz, pero del lado del servidor,
-- donde no se puede saltar.
create function public.fb_delete(p_ean text) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if not private._is_moderator(auth.uid()) then
    raise exception 'not a moderator';
  end if;
  if exists (select 1 from public.food_barcodes b where b.ean = p_ean and b.verified) then
    raise exception 'verified row: unverify first';
  end if;
  delete from public.food_barcodes b where b.ean = p_ean;
end $$;
revoke all on function public.fb_delete(text) from public, anon;
grant execute on function public.fb_delete(text) to authenticated, service_role;
