# Git hooks de AVI

**Desde 2026-07-06 esta carpeta ES el hook vivo**: el repo se configura con

```bash
git config core.hooksPath scripts/hooks
```

así la copia versionada y la activa son el mismo archivo (antes `.git/hooks/`
divergía en silencio, y peor: `core.hooksPath` quedó apuntando a la ruta vieja
`Desktop\apex` tras la mudanza a `Desktop\AVI` → NINGÚN commit corría el audit).

**Al clonar el repo en una máquina nueva, correr ese `git config` una vez.**
Requiere `python3` y `node` en PATH.

## `pre-commit`

Corre la auditoría de AVI (9 checks) y **aborta el commit** si algo falla.
Saltarlo solo en emergencias: `git commit --no-verify`.

1. Sintaxis JS (`node --check`) del inline + los 9 módulos (`avi-core`, `app-1..6`, `muscle-map`, `exercise-muscles`)
2. Funciones duplicadas dentro de y ENTRE módulos
3. IDs de `getElementById` con match en HTML estático o templates JS
4. Handlers `onclick/oninput/onchange/onsubmit` con función definida
5. Claves críticas presentes en `SB_KEYS`
6. Definiciones del catálogo (`id:'eN',name:`) sin ids duplicados — las
   referencias sin `name` (entrenos rápidos, warmups) son repetibles y no cuentan
7. Sin secretos (VAPID privada, service_role, JWTs, credenciales E2E de prueba)
8. Suite completa `avi.test.js` (obligatoria — falla = no commit)
9. `scripts/audit-catalog.mjs` (integridad ejercicios/media/registros)

### Mantenimiento

- Si se agrega/renombra un módulo JS de la app, actualizar `APP_JS` en el hook
  (el hook avisa con ⚠️ si un nombre listado deja de existir).
- El skill `avi-audit` ejecuta ESTE MISMO script (una sola fuente de verdad).
