-- ============================================================================
-- c17 · ÍTEM #5 lote v3-a — PERFIL RICO: agregados seguros (Fable §8.4)
-- ============================================================================
-- Dos columnas de snapshot NUEVAS, mismo régimen server-only que streak_weeks/level:
-- SOLO las estampa la edge refresh_snapshot (v5) con service_role; el cliente recibe
-- únicamente SELECT (jamás UPDATE) — así no puede inflar «N entrenos» ni su antigüedad.
--
--  · total_sessions  int  — número de entrenos del historial (hist.length).
--  · training_since  date — día Bogota del PRIMER entreno válido; null si no hay historial.
--                           La UI pinta MES y AÑO, nunca el día exacto (patrón «etiqueta
--                           redondeada» de ②: menos precisión = menos patrón reconstruible).
--
-- Lección c13b EN el DDL, no en un «acordarse después»: c10_grant_hardening dejó el SELECT de
-- community_profiles a nivel de COLUMNA, así que TODA columna nueva que el cliente deba LEER
-- necesita su grant SELECT explícito en el MISMO commit — o `cmtyLoad` lanza `permission denied`
-- al pedirla y toda la pestaña Comunidad cae (la regresión de c13). Sin grant UPDATE: las escribe
-- la edge. NO reabre nada de c10: las columnas sensibles (birth_date/share_code/…) siguen fuera.

alter table public.community_profiles
  add column total_sessions int not null default 0,
  add column training_since date;

grant select (total_sessions, training_since) on public.community_profiles to authenticated;

-- Sabotajes P verificados (tx+rollback / contra prod):
-- P1 la edge estampa total_sessions/training_since correctos (contra el espejo puro communitySnapshot).
-- P2 cliente impersonado `UPDATE ... SET total_sessions=999` → permission denied (column-level, sin grant UPDATE).
-- P3 tras deploy: _verify-community/_verify-feed contra PROD real piden las columnas nuevas y la pestaña carga entera.
-- P4 perfil sin historial → training_since null → la UI omite la frase (nunca «Invalid Date»).
-- P5 `select *` de un perfil ajeno sigue fallando (c7b/c10 intactos; esta migración no reabrió nada).
