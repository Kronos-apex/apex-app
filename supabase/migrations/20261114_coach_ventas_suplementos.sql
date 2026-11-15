-- v748 · Ventas de suplementos del coach (pedido del dueño, 14-nov-2026).
--
-- 🔒 TABLAS APARTE, nunca dentro del asesorado. Medido en vivo con `pg_policies`: en `user_data` la
-- asesorada puede hacer SELECT, UPDATE y DELETE sobre su propia fila, y `profile` es suyo. Un precio,
-- un costo o un saldo ahí lo vería ella. Aquí solo entra el coach.
--
-- 🔒 NINGUNA política para asesorados: con RLS activo y sin política para ellos, no ven nada (ni
-- siquiera «hay una fila»). Una sola política por tabla, `for all to authenticated`, con el UID del
-- coach (mismo patrón que `push_subscriptions`, 20260712_rls_snapshot_refresh.sql).
--
-- ⚠️ NO aplicada: la revisa y la aplica el director. Es idempotente (se puede correr dos veces).

-- ── Catálogo de productos (se archivan con `activo=false`, no se borran) ──────────────────────────
create table if not exists public.coach_productos (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid,
  nombre      text not null check (char_length(btrim(nombre)) between 1 and 80),
  categoria   text not null default 'otro',
  precio      bigint not null default 0 check (precio >= 0),
  costo       bigint not null default 0 check (costo >= 0),
  no_menores  boolean not null default false,
  activo      boolean not null default true,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

-- ── Ventas (copia de nombre/precio/costo del momento; abonos en jsonb; lápida en `borrado`) ───────
-- El saldo NO se guarda: se calcula (precio menos la suma de abonos).
create table if not exists public.coach_ventas (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null default '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid,
  client_id       text not null,
  producto_id     uuid references public.coach_productos(id) on delete set null,
  producto_nombre text not null,
  precio          bigint not null default 0 check (precio >= 0),
  costo           bigint not null default 0 check (costo >= 0),
  cuotas          int not null default 1 check (cuotas between 1 and 12),
  fecha           date not null default current_date,
  abonos          jsonb not null default '[]'::jsonb,
  borrado         boolean not null default false,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);

create index if not exists coach_productos_coach_idx on public.coach_productos (coach_id);
create index if not exists coach_ventas_coach_idx on public.coach_ventas (coach_id);
create index if not exists coach_ventas_client_idx on public.coach_ventas (client_id);
-- `producto_id` es una llave foránea (on delete set null): sin índice, borrar un producto recorre toda la tabla de ventas.
create index if not exists coach_ventas_producto_idx on public.coach_ventas (producto_id);

-- ── RLS: solo el coach ───────────────────────────────────────────────────────────────────────────
alter table public.coach_productos enable row level security;
alter table public.coach_ventas enable row level security;

drop policy if exists coach_productos_solo_coach on public.coach_productos;
create policy coach_productos_solo_coach on public.coach_productos
  for all to authenticated
  using ((select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  with check ((select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid);

drop policy if exists coach_ventas_solo_coach on public.coach_ventas;
create policy coach_ventas_solo_coach on public.coach_ventas
  for all to authenticated
  using ((select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid)
  with check ((select auth.uid()) = '0a6484ed-42af-449d-9903-e440ac683ecf'::uuid);

-- Sin acceso para anon: ni siquiera por la API pública.
revoke all on public.coach_productos from anon;
revoke all on public.coach_ventas from anon;
