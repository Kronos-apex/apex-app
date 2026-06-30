-- ══════════ coach_settings ══════════
-- Auditoría 2026-06-30, bug #1: los ajustes GLOBALES del coach (ejercicios custom, nº Nequi
-- para cobrar, nombre/email/sitio) estaban en SB_KEYS pero NO tenían destino en AUTH_MODE
-- (caían al vacío en _persistCoachWrite) → se perdían al recargar. Esta columna les da hogar
-- en la fila PROPIA del coach, igual que `templates` guarda ax_tpl. jsonb nullable, sin riesgo.
-- Forma: { e:[...ejercicios], nequi:"", cn:"<b64>", ce:"<b64>", site:"" }
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS coach_settings jsonb;
