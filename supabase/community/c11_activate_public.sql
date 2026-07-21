-- ============================================================================
-- C11 · ③c-2 ACTIVAR PERFIL PÚBLICO — grant is_private + edge activate_public_profile
-- ============================================================================
-- Slice ③c-2. Estipulado por Fable §13-BIS.3. Aplicado a prod (eoebhrxbokyllqalyecj, 2026-07-21,
-- migración `c11_activate_public`). La edge `activate_public_profile` se despliega aparte (Deno).
--
-- El cliente puede ALTERNAR is_private (hacerse público/privado). El trigger de menor
-- (_community_enforce_minor_privacy, ③a) es la AUTORIDAD FINAL: un menor o alguien sin birth_date que
-- ponga is_private=false es revertido a true en silencio → el grant es seguro (§13-BIS.3: "El cliente
-- puede seguir teniendo grant update(is_private) porque el trigger es la autoridad final, no el grant").
-- Un ADULTO solo puede ponerse público DESPUÉS de que la edge le fije birth_date (sin fecha = fail-safe
-- menor = forzado privado).
grant update (is_private) on public.community_profiles to authenticated;

-- birth_date y role los escribe SOLO la edge activate_public_profile (service_role); el cliente NUNCA
-- tiene grant sobre ellas. role NO se deriva de user_data.role (CLIENT-WRITABLE, lección F7 — probado
-- 2026-07-21: un asesorado se auto-nombró 'coach') sino de "POSEE asesorados" (user_data.coach_id
-- apuntando a él desde OTRAS filas, no forgeable por un atacante solo). Verificado: Camilo=22 asesorados
-- (coach), Samuel=0 (client).
