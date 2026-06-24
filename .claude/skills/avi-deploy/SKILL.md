---
name: avi-deploy
description: Despliega AVI a producción via Git. Úsalo cuando el usuario diga "deploy", "publica", "sube a producción", "push a GitHub". OBLIGATORIO pasar por Julián QA y Lucas QA antes de cualquier commit. Sin verde de ambos agentes, no hay deploy.
---

# AVI Deploy — Pipeline de despliegue con gates de QA

## Regla inviolable

**NO existe el deploy sin QA verde. Punto.**
Si algún agente reporta 🔴, el deploy se aborta sin excepción, sin "es solo una cosa menor", sin "lo arreglamos después".

---

## Pipeline obligatorio (6 pasos en orden estricto)

### PASO 1 — Julián QA: Auditoría estática de código

Invocar al agente `julian-qa` como subagente. Su suite completa cubre:

- Sintaxis JS (node --check)
- Funciones duplicadas
- IDs JS sin match en HTML
- Handlers onclick sin función definida
- SB_KEYS sin reload en syncFromCloud
- Ejercicios con IDs duplicados

**Resultado esperado:** `🟢 PRODUCCIÓN OK` en todos los checks.

Si el resultado es `🔴`:
```
🔴 Deploy abortado — Julián QA bloqueó el pipeline.
Errores encontrados:
- [lista de errores de Julián]
Delegar a Camila para corrección. Reinvocar deploy cuando esté en 🟢.
```

Si el resultado es `🟡` (avisos menores):
- Reportar al usuario los avisos
- Preguntar si desea proceder igual
- Solo continuar si el usuario confirma explícitamente

---

### PASO 2 — Lucas QA: Verificación funcional

Invocar al agente `lucas-qa-func` como subagente. Su verificación cubre:

- Visibilidad de elementos nuevos o modificados en el DOM
- Flujo completo desde perspectiva del usuario
- 6 edge cases críticos: sin datos, estado colapsado, tabs, re-render, datos extremos, móvil 360px
- Contenedores con display:none que bloqueen features

**Resultado esperado:** `🟢 LISTO` o `🟡 con aviso menor`.

Si el resultado es `🔴`:
```
🔴 Deploy abortado — Lucas QA detectó un bloqueante funcional.
Problema: [descripción de Lucas]
Delegar a Camila / Diego según corresponda. Reinvocar cuando esté resuelto.
```

---

### PASO 3 — Identificar qué cambió

```bash
git status
git diff --stat HEAD
```

Presentar al usuario la lista de archivos modificados antes de continuar.

---

### PASO 4 — Commit con mensaje descriptivo

Formato obligatorio:

```
[tipo]: [resumen en una línea]

- [cambio específico 1]
- [cambio específico 2]
- [cambio específico N]

Tested: ✅ Julián QA — [X]/[Y] checks OK
Tested: ✅ Lucas QA — [feature principal] LISTO
```

**Tipos válidos:**
- `feat` — nueva feature visible para el usuario
- `fix` — corrección de bug
- `refactor` — reestructuración sin cambio de comportamiento
- `style` — solo visual/CSS
- `docs` — documentación / CLAUDE.md
- `perf` — mejora de rendimiento
- `chore` — mantenimiento interno

**Reglas:**
- Una feature = un commit. No mezclar cambios no relacionados.
- El mensaje es para el Andrés del futuro — describe el QUÉ y el POR QUÉ.
- NUNCA commitear secretos (VAPID privado, tokens, .env).

---

### PASO 5 — Push

```bash
git add index.html  # (y otros archivos modificados, nunca git add -A sin revisar)
git commit -m "[mensaje descriptivo]"
git push origin main
```

**NUNCA:**
- `git push --force` a main
- `--no-verify` para saltarse el hook
- Pushear a `master` (la rama de producción es `main`)

---

### PASO 6 — Actualizar CLAUDE.md (obligatorio tras cada deploy)

Después del push, antes de confirmar al usuario, revisar si CLAUDE.md refleja el estado actual. Actualizar si alguno de estos cambió:

| Qué revisar | Cuándo actualizar |
|---|---|
| Número de líneas / funciones / ejercicios | Si el diff fue significativo (>50 líneas) |
| Schema de datos (`DB`, cliente, sesión) | Si se añadió/cambió algún campo |
| `SB_KEYS` | Si se añadió/eliminó alguna clave |
| Funciones clave documentadas | Si se creó una función importante nueva |
| Roadmap — versión actual | Si la feature era del roadmap, marcarla ✅ |
| Tokens CSS | Si se añadió un token nuevo |
| Estado de seguridad | Si se corrigió un punto de seguridad |
| Versión del producto | Si el conjunto de cambios justifica bump de versión |

**Cómo actualizar:**
1. Leer las secciones relevantes de CLAUDE.md
2. Editar solo lo que cambió — no reescribir secciones sanas
3. Actualizar la línea `*Última actualización:*` al pie del archivo
4. Incluir CLAUDE.md en el mismo commit del deploy O en un commit `docs:` inmediatamente después

**Si no hubo cambio relevante para documentar:** confirmarlo explícitamente — "CLAUDE.md revisado, sin cambios necesarios."

Después de todo, confirmar al usuario:

```
🚀 Deploy completado

✅ Julián QA  : [X]/[Y] checks OK
✅ Lucas QA   : [feature] — LISTO
✅ Commit     : [tipo]: [resumen]
✅ Push       : origin/main → github.com/Kronos-apex/apex-app
✅ CLAUDE.md  : [actualizado con X / sin cambios necesarios]
⏱️  GitHub Pages propaga en ~30 segundos
```

---

## Manejo de errores

### git push falla por conflicto
```bash
git pull --rebase origin main
# Si hay conflictos que no se pueden resolver automáticamente:
git rebase --abort
# Reportar al usuario — NO forzar
```

### No hay cambios para commitear
```
ℹ️  Sin cambios para desplegar.
git status: working tree clean.
La versión actual ya está en producción.
```

---

## Lo que NUNCA hace este pipeline

1. **Deploy sin Julián QA verde** — aunque "sean solo cambios de texto"
2. **Deploy sin Lucas QA verde** — aunque "el código se vea bien"
3. **Saltarse un agente porque el cambio es pequeño** — los bugs pequeños también rompen la app
4. **`--no-verify`** — el hook de pre-commit existe por una razón
5. **Proceder con 🔴 por presión de tiempo** — producción rota es peor que producción tarde
