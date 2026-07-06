---
name: avi-audit
description: Auditoría profunda completa de AVI. Úsalo cuando el usuario diga "audita AVI", "corre el audit", "verifica que todo funciona", o después de cualquier cambio importante. Ejecuta los 9 checks de calidad y devuelve un reporte con ✅/❌.
---

# AVI Audit — Auditoría profunda automatizada

Ejecuta la suite completa de auditoría (9 checks) sobre el código embarcado
real: `index.html` (inline) + `avi-core.js` + `app-1..6` + `muscle-map.js` +
`exercise-muscles.js`, más la suite de tests y la auditoría de catálogo.

## Cuándo activar este skill

- "Corre el audit de AVI"
- "Verifica que todo está bien"
- "Audita el código"
- "¿Hay errores?"
- Después de cualquier cambio importante por Camila

## Procedimiento

**El auditor es UN SOLO script** — el mismo que corre como pre-commit hook
(`core.hooksPath=scripts/hooks`). No dupliques su lógica aquí: si un check
necesita cambiar, se cambia en `scripts/hooks/pre-commit` y ambos caminos
(skill y hook) quedan actualizados a la vez.

Desde la raíz del repo (`Desktop/AVI/apex-app`):

```bash
python scripts/hooks/pre-commit
```

(En esta PC `python` y `python3` sirven igual. El script no necesita estar en
un commit: audita el working tree tal cual está.)

## Los 9 checks

1. **Sintaxis JS** — `node --check` del inline + los 9 módulos
2. **Funciones duplicadas** — dentro de y ENTRE módulos
3. **IDs rotos** — `getElementById` sin match en HTML estático ni templates JS
4. **Handlers sin función** — `onclick/oninput/onchange/onsubmit` huérfanos
5. **SB_KEYS** — claves críticas de sync presentes
6. **Catálogo sin ids duplicados** — solo definiciones (`id:'eN',name:`); las referencias sin `name` (entrenos rápidos, warmups) son repetibles
7. **Secretos** — VAPID privada, service_role, JWTs, credenciales E2E
8. **Suite de negocio** — `avi.test.js` completa (obligatoria)
9. **Integridad de catálogo** — `scripts/audit-catalog.mjs`

## Cómo interpretar el resultado

- **🟢 Audit OK (9/9)** — listo para deploy.
- **🔴 COMMIT ABORTADO** — hay ❌: NO deployar. Reporta al responsable:
  - Sintaxis / duplicados / IDs / handlers / catálogo → Camila
  - SB_KEYS → Andrés DBA
  - Secretos → detener TODO y avisar a Camilo (¿hay que rotar la clave?)
  - Suite fallando → quien tocó la lógica (los tests viven en avi.test.js)

## Después del reporte

Si hay errores, **NO los arregles tú**. El skill solo audita; la corrección la
hace quien corresponda y luego se re-corre.
