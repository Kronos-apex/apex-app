---
name: apex-deploy
description: Despliega APEX a producción via Git. Úsalo cuando el usuario diga "deploy", "publica", "sube a producción", "push a GitHub". Corre el audit primero, hace commit con mensaje descriptivo y push automático.
---

# APEX Deploy — Workflow Git completo a producción

Este skill maneja todo el proceso de despliegue: audit previo → commit → push → confirmación.

## Cuándo activar este skill

- "Deploy APEX"
- "Sube los cambios"
- "Publica esto en producción"
- "Push a GitHub"
- "Despliega la nueva versión"

## Procedimiento obligatorio (4 pasos)

### Paso 1: Audit obligatorio ANTES de deploy
Si el resultado no es 🟢, **NO continúes**. Reporta al usuario y detente.

```bash
# Invocar skill apex-audit primero
# Si el resultado no es 6/6, abortar
```

### Paso 2: Identificar qué cambió
```bash
cd <ruta-del-repo>
git status
git diff --stat
```

Listar los archivos modificados al usuario para confirmar.

### Paso 3: Commit con mensaje descriptivo

El mensaje de commit debe seguir este formato:

```
[tipo]: [resumen en una línea]

- [cambio específico 1]
- [cambio específico 2]
- [cambio específico 3]

Tested: ✅ apex-audit 6/6
```

**Tipos válidos:**
- `feat` — nueva feature
- `fix` — bug fix
- `refactor` — reestructuración sin cambio de comportamiento
- `style` — solo visual/CSS
- `docs` — documentación / CLAUDE.md
- `perf` — mejora de rendimiento
- `chore` — mantenimiento

**Ejemplos buenos:**
```
feat: dashboard analytics del coach

- Añadido panel #p-analytics con métricas mensuales
- Calculados ingresos, retención y sesiones/semana
- Nueva función calcMonthlyStats()

Tested: ✅ apex-audit 6/6
```

```
fix: notificaciones push no llegan en Android background

- Reemplazado new Notification() por SW.showNotification()
- Corregido scope del Service Worker
- Añadido push subscription guardado en Supabase

Tested: ✅ apex-audit 6/6
```

### Paso 4: Ejecutar el deploy
```bash
git add index.html
git commit -m "[mensaje aquí]"
git push origin main
```

IMPORTANTE: La rama de producción es siempre `main`. Nunca pushear a `master`.

## Después del push

Confirma al usuario:
```
✅ Desplegado a producción
🔗 Repo: github.com/[usuario]/apex
⏱️  GitHub Pages tarda ~30 segundos en propagar
🧪 Verifica en: [URL del sitio]
```

## Manejo de errores

### Si `git push` falla por conflictos
```bash
git pull --rebase origin main
# Si hay conflictos, abortar y reportar al usuario
git rebase --abort  # si no se puede resolver
```

### Si el audit no pasa
**Detente. NO hagas commit.**

```
🔴 No puedo desplegar:
- Audit falló con [X] errores
- Reporta a [Camila/Diego/Julián]
- Cuando esté en 6/6, vuelve a invocar deploy
```

### Si no hay cambios para commitear
```
ℹ️  No hay cambios para desplegar
- git status: clean
- Última versión ya está en producción
```

## Reglas inviolables

1. **NUNCA hagas push sin audit verde** — la regla más importante
2. **NUNCA hagas `git push --force` a main** — solo a branches de feature
3. **NUNCA commitees secretos** — VAPID privado, tokens, etc.
4. **El mensaje de commit es para el futuro yo** — describe el QUÉ y el POR QUÉ
5. **Una feature = un commit** — no mezcles cambios no relacionados

## Estilo de comunicación

Cuando deployas, eres directo y conciso. Como un release manager seguro de sí mismo:

```
🚀 Deploy en progreso...
✅ Audit: 6/6
✅ Commit: feat: dashboard analytics
✅ Push: origin/main
⏱️  Propagación: ~30s
🌐 Live en 30 segundos
```
