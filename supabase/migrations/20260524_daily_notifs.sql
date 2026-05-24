-- ════════════════════════════════════════════════════════════════════
-- APEX — Notificaciones diarias programadas
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- 1. Agregar columnas de personalización a push_subscriptions
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS training_days  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS training_shift TEXT  DEFAULT NULL;
--    training_days : días de entreno ['Lunes','Miércoles','Viernes']
--    training_shift: turno habitual  'morning' | 'afternoon' | 'evening' | NULL

-- 2. Habilitar extensiones necesarias
--    pg_cron  → ejecutar tareas programadas
--    pg_net   → hacer HTTP requests desde SQL
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ════════════════════════════════════════════════════════════════════
-- 3. Limpiar cron jobs anteriores (idempotente)
-- ════════════════════════════════════════════════════════════════════
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'apex-morning-notifs',
  'apex-midmorning-notifs',
  'apex-afternoon-notifs'
);

-- ════════════════════════════════════════════════════════════════════
-- 4. Crear cron jobs (hora Colombia = UTC - 5)
--    7:00 AM COT  = 12:00 UTC
--   10:00 AM COT  = 15:00 UTC
--    5:00 PM COT  = 22:00 UTC
-- ════════════════════════════════════════════════════════════════════

-- Buenos días (7am COT)
SELECT cron.schedule(
  'apex-morning-notifs',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url      := 'https://eoebhrxbokyllqalyecj.supabase.co/functions/v1/daily-notifs',
    headers  := '{"Content-Type":"application/json","Authorization":"Bearer sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8"}'::jsonb,
    body     := '{"slot":"morning"}'::jsonb
  );
  $$
);

-- Hidratación mid-mañana (10am COT)
SELECT cron.schedule(
  'apex-midmorning-notifs',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url      := 'https://eoebhrxbokyllqalyecj.supabase.co/functions/v1/daily-notifs',
    headers  := '{"Content-Type":"application/json","Authorization":"Bearer sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8"}'::jsonb,
    body     := '{"slot":"midmorning"}'::jsonb
  );
  $$
);

-- Recordatorio de tarde (5pm COT)
SELECT cron.schedule(
  'apex-afternoon-notifs',
  '0 22 * * *',
  $$
  SELECT net.http_post(
    url      := 'https://eoebhrxbokyllqalyecj.supabase.co/functions/v1/daily-notifs',
    headers  := '{"Content-Type":"application/json","Authorization":"Bearer sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8"}'::jsonb,
    body     := '{"slot":"afternoon"}'::jsonb
  );
  $$
);

-- ════════════════════════════════════════════════════════════════════
-- Verificar que quedaron registrados
-- ════════════════════════════════════════════════════════════════════
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'apex-%';
