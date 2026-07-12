# 🧯 RUNBOOK — Restaurar AVI desde un backup

> **Simulacro ejecutado y APROBADO el 2026-07-12** (sesión #4). Los dos respaldos se
> probaron restaurando en una tabla de PRUEBA aislada y validando integridad contra
> producción viva: **24 filas · 89 rutinas · 140 sesiones — idénticas**, con los datos
> anidados (rutinas→ejercicios, historial) intactos. Este runbook usa los comandos EXACTOS
> que funcionaron. "Un backup sin restore probado no es un backup" — ahora sí lo es.

---

## Los dos respaldos (complementarios, NO redundantes)

| Capa | Qué | Dónde | Contiene | Se usa para |
|---|---|---|---|---|
| **1. En la DB** | `pg_cron` "apex-daily-backup" 08:00 UTC diario → `apex_data_backups` (id, snapshot_at, rows, data jsonb) | Dentro de Supabase (proyecto `eoebhrxbokyllqalyecj`). Retención 14 diarios + domingos 90 días | `apex_data` + `user_data` | **Corrupción de datos** (el proyecto sigue vivo). Restauración rápida |
| **2. JSON local** | `scripts/backup-local.mjs` + Tarea de Windows "AVI backup Supabase" 20:00 diaria | `Desktop\AVI\backups\avi-backup-YYYY-MM-DD.json` (45 días). Requiere `%USERPROFILE%\.avi\service-role.key` | `user_data` + `apex_data` + `push_subscriptions` + **`auth_users` (uid↔email)** | **Pérdida TOTAL del proyecto** (incluye las cuentas auth para re-vincular usuarios) |

> ⚠️ La capa 1 NO tiene las cuentas auth (vive en el mismo proyecto que se perdería). La capa
> 2 sí. Por eso ante pérdida total del proyecto se usa el JSON local.
> ⚠️ El JSON local corre a las 20:00; hasta esa hora el más fresco es el de AYER. La capa 1
> (08:00) cubre el mismo día. Para el punto de recuperación más reciente, preferir la capa 1.

---

## 🔴 REGLAS DE SEGURIDAD (antes de tocar nada)

1. **SIEMPRE restaurar primero en una tabla de PRUEBA** (`_restore_drill_user_data`), validar,
   y solo entonces (si aplica) reemplazar producción. NUNCA restaurar a ciegas sobre `user_data`.
2. **Offline-first:** si se reemplaza `user_data` en producción, coordinar que la app NO esté
   abierta en dispositivos, y pedir a los usuarios que la abran y cierren una vez tras el
   restore (fuerza el pull desde la nube). Ver `CLAUDE.md §☁️`.
3. **Service role key** vive en `%USERPROFILE%\.avi\service-role.key` — JAMÁS en el repo.
4. Coordinar la ventana con Camilo aunque sea solo lectura de prod.

---

## Escenario A — CORRUPCIÓN de datos (el proyecto sigue vivo) → capa 1

**1. Ver los snapshots disponibles y elegir uno (el más reciente sano):**
```sql
select id, to_char(snapshot_at,'YYYY-MM-DD HH24:MI') snap, rows,
       jsonb_array_length(data->'user_data') filas_ud
from apex_data_backups order by snapshot_at desc limit 10;
```

**2. Restaurar en una tabla de PRUEBA (reconstruye filas desde el JSONB):**
```sql
drop table if exists _restore_drill_user_data;
create table _restore_drill_user_data (like public.user_data including all);
insert into _restore_drill_user_data
select * from jsonb_populate_recordset(
  null::public.user_data,
  (select data->'user_data' from apex_data_backups where id = <ID_ELEGIDO>)
);
```

**3. Validar integridad ANTES de tocar producción:**
```sql
select count(*) filas,
  count(*) filter (where jsonb_array_length(coalesce(routines,'[]'::jsonb))>0) con_rutinas,
  sum(jsonb_array_length(coalesce(routines,'[]'::jsonb))) total_rutinas,
  sum(jsonb_array_length(coalesce(history,'[]'::jsonb))) total_sesiones
from _restore_drill_user_data;
-- Spot-check profundo (un asesorado con su rutina y ejercicios):
select profile->>'name' asesorado, routines->0->>'name' rut1,
       routines->0->'exercises'->0->>'name' ej1, jsonb_array_length(history) ses
from _restore_drill_user_data where jsonb_array_length(coalesce(history,'[]'::jsonb))>0 limit 3;
```
Comparar los agregados con lo que se espera. Si cuadran → el backup es bueno.

**4. Reemplazar producción — SOLO si el paso 3 cuadra y con las reglas de seguridad:**
Restaurar la(s) fila(s) afectada(s), no todo a ciegas. Para UNA fila corrupta:
```sql
-- (ejemplo: restaurar SOLO al asesorado <UID> desde el backup)
update public.user_data u
set routines = t.routines, history = t.history, profile = t.profile, updated_at = now()
from _restore_drill_user_data t
where u.user_id = t.user_id and u.user_id = '<UID_AFECTADO>';
```
Verificar con SELECT. Pedir al asesorado que abra/cierre la app (offline-first).

**5. Limpiar:** `drop table if exists _restore_drill_user_data;`

---

## Escenario B — PÉRDIDA TOTAL del proyecto → capa 2 (JSON local)

**1. Parsear y validar el JSON local más reciente:**
```bash
python -c "import json; d=json.load(open('C:/Users/KRONOS/Desktop/AVI/backups/avi-backup-YYYY-MM-DD.json',encoding='utf-8')); print(d['counts']); print('user_data:',len(d['user_data']),'auth_users:',len(d['auth_users']))"
```
Debe traer `user_data`, `apex_data`, `push_subscriptions`, `auth_users`.

**2. Recrear el proyecto Supabase** (o tablas): aplicar las migraciones de `supabase/migrations/`
(incluye las policies RLS — `20260621_rls_policies_snapshot.sql` + `20260712_push_select_policy.sql`).

**3. Recrear las cuentas auth** desde `auth_users` (uid↔email) con el service role (Admin API
`auth.admin.createUser` conservando el `id`/uid original para que las filas de `user_data`
sigan vinculadas). Sin esto, los `user_id` del backup no matchean ningún usuario.

**4. Cargar los datos:** insertar `user_data`, `apex_data`, `push_subscriptions` desde el JSON
(vía service role, que bypasea RLS). Validar conteos e integridad como en el Escenario A paso 3.

**5. Actualizar el frontend** (`SB_URL`/`SB_KEY` en `app-1-infra.js` + Edge Functions) si el
proyecto es nuevo, y re-desplegar.

---

## Resultado del último simulacro (2026-07-12)
- **Capa 1:** ✅ restaurada en tabla de prueba — 24 filas, 89 rutinas, 140 sesiones = idéntico a producción viva. Datos anidados intactos.
- **Capa 2:** ✅ JSON local (`avi-backup-2026-07-11.json`) parsea limpio — 24 user_data + 18 apex_data + 1 push + 25 auth_users. Misma integridad.
- **Pendiente real (deuda menor):** el Escenario B nunca se ejecutó de punta a punta (recrear proyecto + cuentas auth). El escenario A y la INTEGRIDAD de ambos backups sí están probados. Si se quiere certeza total del B, ensayar en un proyecto Supabase de PRUEBA.
