-- ============================================================================
-- F5 · ESCÁNER DE CÓDIGOS — tabla food_barcodes (catálogo que crece con el uso)
-- ============================================================================
-- Pedido del PO (2026-08-10): «que cualquier usuario pueda escanear cualquier alimento y ese
-- quede guardado en nuestra base de datos, y así no tener que estar escaneando siempre».
--
-- 🔴 DÓNDE ENCAJA — LAS DOS CAPAS SIGUEN SIN FUSIONARSE (estipulación E5 de Fable):
--   · `NUT_FOODS` (50) es el POOL DEL RECETARIO: cerrado, curado, referenciado POR ID desde
--     `NUT_MENUS`. **Esta tabla NO lo toca.** Nadie va a recibir un almuerzo armado con lo que
--     escaneó un desconocido.
--   · `foods.json` (181, TCAC/USDA) es el catálogo de BÚSQUEDA y REGISTRO.
--   · `food_barcodes` es la TERCERA fuente del buscador, y la única que crece en vivo.
--   El generador de platos jamás lee ninguna de las dos últimas.
--
-- 🔴 DE DÓNDE SALEN LOS DATOS: de la ETIQUETA del producto, transcrita por quien escanea. El
-- código de barras solo trae un NÚMERO, no la tabla nutricional. No se copia de Open Food Facts
-- ni de ninguna base ajena: su licencia ODbL es share-alike y contagiaría a todo el catálogo de
-- AVI. Los datos de un empaque son hechos, y los hechos no tienen dueño.
--
-- 🔒 `verified` ES DEL SERVIDOR, NO DEL CLIENTE. La lección F7 de este repo: nunca gatees un
-- permiso con un campo que el cliente puede escribirse a sí mismo. Se implementa con GRANT POR
-- COLUMNA: el cliente puede insertar los datos del alimento, pero NO `verified`, `verified_by`
-- ni `verified_at`. Solo un moderador los mueve.
--
-- ⚠️ POR QUÉ IMPORTA LA VERIFICACIÓN, con precedente medido en este mismo proyecto: un dato mal
-- tecleado es INTERNAMENTE COHERENTE y ningún test de cuadre lo caza. La yuca traía los valores
-- de CRUDA con el nombre «cocida» —cuadre perfecto contra sus propios macros— y el motor recetaba
-- 22% menos yuca. Por eso lo escaneado nace `verified=false` y se marca como tal en la interfaz.

create table public.food_barcodes (
  ean         text primary key check (ean ~ '^[0-9]{8,14}$'),
  name        text not null check (btrim(name) <> '' and length(name) <= 80),
  brand       text check (length(brand) <= 60),
  -- macros por 100 g del producto tal como se come, igual que el resto del catálogo
  kcal        numeric(6,1) not null check (kcal >= 0 and kcal <= 900),
  p           numeric(5,1) not null check (p >= 0 and p <= 100),
  c           numeric(5,1) not null check (c >= 0 and c <= 100),
  f           numeric(5,1) not null check (f >= 0 and f <= 100),
  -- medida casera opcional, para poder decir «1 tarrina» en vez de «125 g»
  un_label    text check (length(un_label) <= 24),
  un_g        numeric(6,1) check (un_g > 0 and un_g <= 2000),
  verified    boolean not null default false,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_by  uuid not null default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  -- 🔒 La suma de macros de 100 g no puede pasar de 100 g. Caza el dedo gordo grueso (un 500 en
  -- vez de 50) sin opinar sobre la coherencia fina, que vive en el cliente (`foodKcalGap`).
  check (p + c + f <= 100)
);
alter table public.food_barcodes enable row level security;

-- Búsqueda por nombre desde el celular (el buscador ya normaliza sin tildes en el cliente).
create index food_barcodes_name_idx on public.food_barcodes (lower(name));
create index food_barcodes_verified_idx on public.food_barcodes (verified) where verified = false;

-- ── PERMISOS POR COLUMNA ────────────────────────────────────────────────────
-- Se revoca todo y se otorga lo justo. `verified*` queda FUERA del insert y del update del
-- cliente: es la diferencia entre «marco un dato como bueno» y «pido que lo revisen».
revoke all on public.food_barcodes from public, anon, authenticated;
grant select on public.food_barcodes to authenticated;
grant insert (ean, name, brand, kcal, p, c, f, un_label, un_g) on public.food_barcodes to authenticated;
grant update (name, brand, kcal, p, c, f, un_label, un_g) on public.food_barcodes to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- SELECT: cualquiera autenticado ve el catálogo entero. Es el punto de la feature: que no haya
-- que volver a escanear lo que ya escaneó otro. No hay dato personal aquí — es un empaque.
create policy fb_sel on public.food_barcodes for select to authenticated using (true);

-- INSERT: cualquiera aporta, y la fila queda a su nombre. `created_by` no se puede falsificar
-- (default auth.uid() + el WITH CHECK lo ata), así que la autoría es real.
create policy fb_ins on public.food_barcodes for insert to authenticated
  with check (created_by = auth.uid());

-- UPDATE: solo el que la aportó **mientras siga sin verificar** (para corregir su propio
-- tecleo), o un moderador. Una fila ya verificada no la reescribe un cliente: si se pudiera,
-- el gate de verificación no valdría nada — es la clase de hueco de `cpost_upd` (c13c), donde
-- un INSERT restringido se burlaba con un UPDATE amplio.
create policy fb_upd on public.food_barcodes for update to authenticated
  using (
    (created_by = auth.uid() and verified = false)
    or exists (select 1 from public.community_moderators m where m.user_id = auth.uid())
  )
  with check (
    (created_by = auth.uid() and verified = false)
    or exists (select 1 from public.community_moderators m where m.user_id = auth.uid())
  );

-- DELETE: nadie desde el cliente. Un alimento borrado rompería los registros que lo referencian.
-- La moderación se hace corrigiendo o marcando, no borrando.

-- ── VERIFICAR: solo por RPC, y solo un moderador ────────────────────────────
-- SECURITY DEFINER porque `verified*` no tiene grant de UPDATE para nadie: es la única puerta.
create function public.fb_verify(p_ean text, p_ok boolean)
  returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.community_moderators m where m.user_id = auth.uid()) then
    raise exception 'not a moderator';
  end if;
  update public.food_barcodes
     set verified = p_ok,
         verified_by = case when p_ok then auth.uid() else null end,
         verified_at = case when p_ok then now() else null end
   where ean = p_ean;
end $$;
revoke execute on function public.fb_verify(text, boolean) from public, anon;
grant execute on function public.fb_verify(text, boolean) to authenticated;
