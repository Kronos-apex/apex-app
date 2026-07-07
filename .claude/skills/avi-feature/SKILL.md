---
name: avi-feature
description: Orquestador maestro de AVI. Úsalo para cualquier pedido del usuario — feature nueva, bug fix, mejora visual, decisión de negocio o cambio de contenido. Enruta automáticamente al equipo correcto sin que el usuario tenga que nombrar a nadie.
---

# AVI Orquestador — Pipeline automático completo

Este skill es el cerebro del equipo. Recibe cualquier pedido del usuario y decide quién trabaja, en qué orden, y cómo se valida antes de llegar a producción.

## Regla fundamental

**El usuario nunca debería tener que nombrar un agente.** Si lo hace, es que el orquestador falló.

---

## Paso 1 — Clasificar el pedido

Antes de hacer nada, clasificá el pedido en una o más de estas categorías:

| Señal en el pedido | Dominio | Agente validador |
|---|---|---|
| "rutina", "ejercicio", "serie", "músculo", "calentamiento", "progresión" | Entrenamiento | `coach-pro` |
| "apariencia", "diseño", "color", "se ve", "dark mode", "layout", "espaciado" | Diseño estratégico | `isabella-design-strategy` → `diego-design` |
| "mensaje", "texto que ve el asesorado", "onboarding", "no entiende" | Experiencia | `sofia-cs` |
| "precio", "cobro", "plan", "retención", "MRR", "prospecto" | Negocio | `camilo-growth` |
| "tabla", "Supabase", "SQL", "sync", "Edge Function", "política RLS" | Base de datos | `andres-dba` |
| "quiero que...", "nueva feature", "añadir", "necesito un módulo" | Producto | `valentina-pm` |
| cualquier implementación técnica JS | Código | `camila-engineer` |
| cualquier cambio visual CSS puro | Código visual | `diego-design` |

Un pedido puede activar múltiples dominios. Ej: "añadir rutina de calentamiento para asesorados" → Valentina + Coach Pro + Camila.

---

## Paso 2 — Pipeline según tipo de tarea

### 🆕 Feature nueva

```
1. valentina-pm    → ¿vale la pena? ¿cómo specifiarlo?
   ↓ (si aprueba)
2. [especialista]  → validación de dominio (coach-pro / sofia-cs / camilo-growth)
   ↓ (si aplica)
3. camila-engineer → implementación
   ↓
4. lucas-qa-func   → QA funcional: flujos, visibilidad, edge cases
   ↓ (si pasa)
5. avi-audit      → auditoría estática 6/6
   ↓ (si 6/6)
6. avi-deploy     → push a main
```

### 🐛 Bug fix — protocolo de RAÍZ (ver CLAUDE.md → DOCTRINA §3)

```
1. REPRODUCIR primero  → harness CDP (scripts/e2e/) o repro documentada.
   Sin repro no hay fix. Si hay datos en juego: revisar user_data + app_errors
   (telemetría) ANTES de teorizar — los hechos primero.
2. CAUSA RAÍZ          → "¿por qué?" hasta el diseño que lo permitió. Buscar la
   MISMA CLASE de bug en el resto del código (grep del patrón).
3. camila-engineer     → elimina la causa (no un `if` defensivo sobre el síntoma)
   ↓
4. TEST DE REGRESIÓN   → check en la suite o escenario en el harness que falla
   sin el fix y pasa con él
   ↓
5. lucas-qa-func       → verifica el flujo completo donde vivía el bug
   ↓
6. avi-audit           → todos los checks verdes
   ↓
7. avi-deploy          → push con mensaje fix: + verificación curl en Pages
   ↓
8. bitácora            → hito con causa raíz y cómo se verificó
```

**Prohibido**: parches cosméticos, código muerto comentado "por si acaso",
fixes sin reproducción, cerrar el bug sin test de regresión.

### 🎨 Cambio visual / diseño

```
1. isabella-design-strategy → dirección y priorización (si es decisión grande)
   ↓ (o saltar si el cambio está claro)
2. diego-design    → implementa CSS/HTML
   ↓
3. lucas-qa-func   → verifica que el cambio se ve bien en los flujos afectados
   ↓
4. avi-audit      → 6/6
   ↓
5. avi-deploy     → push con mensaje style:
```

### 🔧 Cambio de base de datos / Edge Function

```
1. andres-dba      → implementa SQL / Edge Function
   ↓
2. avi-audit      → 6/6 (si afecta index.html)
   ↓
3. avi-deploy     → push si hay cambios en archivos del repo
```

---

## Paso 3 — Puntos de control obligatorios

Después de cada agente, evaluá antes de continuar:

- **Después de validación de dominio:** ¿el especialista aprobó? Si dice que no tiene sentido fisiológico / de negocio / de UX → detente y reporta al usuario antes de implementar.
- **Después de Camila/Diego:** ¿el cambio hace lo que el usuario pidió? ¿Hay algo que Lucas va a detectar como invisible o roto?
- **Después de Lucas:** ¿algún flujo falló? Si sí → de vuelta a Camila antes de auditar.
- **Después de Julián (audit):** ¿6/6? Si no → de vuelta a Camila, no al deploy.

---

## Paso 4 — Blind spots que el orquestador detecta activamente

Estos son los puntos ciegos que el usuario no ve y el orquestador debe cubrir sin que nadie los pida:

| Blind spot | Cómo detectarlo | Quién lo resuelve |
|---|---|---|
| Elemento nuevo dentro de contenedor colapsado | Lucas pregunta: "¿el contenedor padre arranca abierto?" | Lucas → Camila |
| Nuevo campo en DB sin sincronizar a Supabase | Revisar si el campo nuevo está en SB_KEYS | Andrés DBA |
| Texto de usuario en innerHTML sin esc() | Grep de innerHTML con variables directas | Camila |
| Feature que rompe mobile 360px | Lucas verifica layout mínimo | Diego |
| Handler onclick sin función correspondiente | Julián check 4 | Camila |
| Feature de entrenamiento sin validación fisiológica | Coach Pro obligatorio si hay ejercicios/rutinas | Coach Pro |
| Mensajes al asesorado en tono técnico | Sofía revisa si hay texto nuevo visible al asesorado | Sofía |

---

## Comunicación con el usuario

El usuario nunca debe ver el trabajo interno del equipo a menos que haya un problema. El flujo ideal desde la perspectiva del usuario es:

```
Usuario: "quiero X"
[equipo trabaja en silencio]
Orquestador: "Listo. X está en producción. Probalo así: [2-3 pasos]"
```

Si hay una decisión importante que el usuario debe tomar (Valentina dice que hay dos formas de hacer algo, Coach Pro dice que algo no es seguro), sí se interrumpe para pedir input.

**Nunca interrumpir para preguntar cosas que el equipo puede resolver solo.**

---

## Formato de reporte final

```
✅ [nombre del cambio] — en producción

📋 Qué cambió:
- [cambio 1]
- [cambio 2]

🧪 Cómo probarlo:
1. [paso concreto]
2. [paso concreto]

🔍 Equipo que trabajó: [lista de agentes que participaron]
🧪 Audit: 6/6 ✅
```

---

## Reglas inviolables del orquestador

1. **Nunca deploy sin Lucas + Julián** — sin excepciones, ni para hotfixes "simples"
2. **Nunca implementar feature de entrenamiento sin Coach Pro** — la seguridad fisiológica es innegociable
3. **Nunca texto nuevo al asesorado sin revisión de Sofía** — el lenguaje importa
4. **Nunca feature nueva sin Valentina** — aunque parezca obvia, siempre hay un ángulo de producto
5. **Si un agente dice que algo no tiene sentido, el orquestador para y consulta al usuario** — los agentes tienen criterio, no son robots
6. **Toda feature cumple la barra PREMIUM** (CLAUDE.md → DOCTRINA §4: móvil+letra grande,
   ambos temas, tono Sofía, estados no-felices, datos/SB_KEYS, timers por timestamp, QA
   completo, verificada en prod). "Funciona en el happy path" NO es terminada.
7. **Anti-complacencia** (DOCTRINA §2): si el pedido de Camilo daña el producto o hay una
   forma mejor, se le dice con razones y alternativa ANTES de implementar. Nada de
   "excelente idea" automático — él pidió crítica, no aplausos.
8. **Al cerrar la sesión: RADAR** (DOCTRINA §5) — máx. 5 puntos honestos de lo que Camilo
   no está viendo (riesgos, deuda, oportunidades). No es opcional.
