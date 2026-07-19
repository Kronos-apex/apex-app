-- ============================================================================
-- C3.1 · CONSENTIMIENTO + TOGGLE DE ACTIVIDAD + CHECK DEL AVATAR (idea #5, Fase 1)
-- ============================================================================
-- Estado: ✅ APLICADO A PRODUCCIÓN (eoebhrxbokyllqalyecj, 2026-07-19) vía apply_migration
-- `c3_community_consent_avatar`. Refleja el estado REAL en prod. Advisor security: sin
-- regresiones (solo intencionales de C1 + pre-existentes de Camilo).
--
-- Tablas de comunidad verificadas VACÍAS (community_profiles 0 filas) el 2026-07-19 → las
-- columnas nuevas pueden nacer NOT NULL sin backfill. Cierra 2 requisitos de la auditoría de
-- Fable a C2: avatar_url texto libre (🟡) y patrones de actividad (🔴 §11).
-- ============================================================================

alter table public.community_profiles
  add column consent_v  text        not null,                    -- versión de textos legales aceptada (evidencia Habeas Data); sin default → el opt-in DEBE proveerla
  add column consent_at timestamptz not null default now(),      -- cuándo consintió; server-set (el cliente no tiene grant → inmutable)
  add column show_today boolean     not null default true;       -- §11: ocultar "entrené hoy" (patrones de actividad, seguridad). El SERVIDOR lo respeta.

-- Requisito 🟡 (auditoría C2): avatar_url solo puede apuntar al bucket público 'avatars' del
-- propio proyecto → un usuario NO puede apuntar el <img> de sus amigos a una URL externa
-- (logging de IP / contenido no deseado). Defensa en DB además del CHECK del cliente (cmtyAvatarOk).
alter table public.community_profiles
  add constraint cp_avatar_url_bucket
  check (avatar_url is null or avatar_url like 'https://eoebhrxbokyllqalyecj.supabase.co/storage/v1/object/public/avatars/%');

-- Grants POR COLUMNA (aditivos a los de C1 en c1_community_foundations.sql). El cliente puede
-- INSERTAR consent_v (obligatorio en el opt-in) y show_today, y ACTUALIZAR show_today.
-- consent_v/consent_at NO son actualizables por el cliente (evidencia inmutable); consent_at
-- nunca se inserta (usa el default server-side).
grant insert (consent_v, show_today) on public.community_profiles to authenticated;
grant update (show_today)            on public.community_profiles to authenticated;

-- NOTA edge: refresh_snapshot (v2, supabase/functions/refresh_snapshot/index.ts) LEE show_today
-- y si es false fuerza trained_today=false → el ocultamiento es SERVER-SIDE (una policy no oculta
-- una columna; el dato jamás debe escribirse). El resto del snapshot se calcula igual.
