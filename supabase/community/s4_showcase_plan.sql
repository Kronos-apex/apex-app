-- ============================================================================
-- S4 · CÓMO ENTRENÓ CADA PERSONA, EN SU TARJETA DE VITRINA
-- ============================================================================
-- Auditoría final de la web (5-oct-2026), punto 4; el PO aprobó «dale con todos».
--
-- 🔴 POR QUÉ: las fichas de avientrena.com no decían con qué plan entrenó cada persona, y medido el
-- 5-oct eran de planes distintos (una con AVI PRO por su cuenta, el resto con acompañamiento del coach).
-- Quien las lee puede creer que la app gratis sola da «+55 kg en prensa». Decir cómo entrenó cada una
-- es más honesto y es, de paso, la prueba del coaching sin adjetivos.
--
-- 🔒 TRES VALORES, NINGUNO IDENTIFICA A NADIE: 'gratis' · 'pro' · 'coach'. Es el NIVEL de la cuenta
-- al publicar (lo deriva `showcasePlanOf` en avi-core.js), no su fecha de pago ni su plan exacto
-- (presencial o virtual no se distingue: hoy la app no lo guarda, y adivinarlo sería inventar).
--
-- 🔒 NULA A PROPÓSITO, como `objetivo` (s2): una tarjeta publicada antes no se puede editar desde la
-- app (no hay grant de UPDATE) y una columna NOT NULL la rompería. La web no pinta nada si viene null.
--
-- 🔒 CHECK DECLARATIVO. Su espejo en la app es `SHOWCASE_PLANES` (avi-core.js) y en la web la lista de
-- `lib/showcase.ts`; los tests leen ESTE archivo y fallan si se separan.
-- ============================================================================

alter table public.avi_showcase
  add column if not exists plan text;

alter table public.avi_showcase
  drop constraint if exists avi_showcase_plan_check;
alter table public.avi_showcase
  add constraint avi_showcase_plan_check check (
    plan is null or plan in ('gratis', 'pro', 'coach')
  );
