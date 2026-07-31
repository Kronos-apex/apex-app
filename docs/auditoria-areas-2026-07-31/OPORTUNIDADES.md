# Oportunidades de mejora — síntesis de las 7 auditorías (2026-07-31)

Ordenadas por **impacto sobre el problema real (ACTIVACIÓN)**, no por gravedad técnica.
El dato que manda: 22 asesorados · **7 activos** · **8 nunca entrenaron** · auto-registro 13 → **0**.
Y la base es **binaria**: cero personas entre 3 y 7 días sin entrenar. No hay problema de
retención — hay un problema de puerta de entrada.

**Fuera de alcance:** el registro de pagos y los vencimientos los organiza el PO el lunes.

**Leyenda:** ✅ = medido por mí · 🔶 = lo reporta el agente con su evidencia, **sin re-medir**.

---

## GRUPO 1 · Que la gente pueda recibir un mensaje
*15 de 22 son inalcanzables hoy. Sin esto, ninguna otra mejora tiene por dónde llegar.*

| | Qué | Costo | Estado |
|---|---|---|---|
| 🔶 | **Pedir el teléfono en el registro.** Convierte 13 inalcanzables en 13 alcanzables. Hoy no se pide y por eso WhatsApp —el único canal que sí llega— no está disponible para ellos | ~25 líneas | — |
| 🔶 | **El chat está bloqueado para `tier:'app'`** → le escribiste **20 mensajes a 5 personas que no pueden leerlos**, y el badge de no leídos las llama igual. A **Nataly** le escribiste hoy | 1 línea | — |
| ✅ | **El coach recibe los avisos de asesorado** ×2 dispositivos (`daily-notifs` no excluye `_coach`) | 1 línea | **escrito, sin desplegar** |
| 🔶 | Al mensaje «Abre AVI» le falta el enlace | 1 línea | — |

## GRUPO 2 · Que el día 1 termine en un entrenamiento
*8 personas tienen rutina y nunca completaron una sesión.*

| | Qué | Costo |
|---|---|---|
| 🔶 | **El día 1 puede ser día de descanso.** El generador asigna días consecutivos desde el lunes en **1296 de 1296** planes → quien se registra de jueves a domingo ve «Hoy es tu día de descanso» en vez de su primer entreno. Los 2 casos reales tienen 0 sesiones | medio |
| 🔶 | **3 cuentas creadas que nunca entraron**, sin ficha, invisibles para el coach — una sería **Claudia Valbuena** (⚠️ discrepancia: en mis datos Claudia SÍ existe con 18 sesiones; probablemente son dos cuentas. **Verificar antes de actuar**) | bajo |
| ✅ | **El plan del principiante es el mismo entrenamiento repetido** (1,5 ejercicios idénticos en todos los días) y **no lleva nada de glúteo** — a hombres y mujeres por igual (2 de 144 planes). La diferenciación femenina sí funciona de Intermedio en adelante | medio |
| 🔶 | El navegador embebido de **WhatsApp no puede instalar la PWA**, y es la puerta de entrada real | medir primero |

## GRUPO 3 · Seguridad de quien entrena lesionado
*El hallazgo más grave de toda la auditoría. No es de adopción: es de daño a una persona.*

| | Qué | Costo |
|---|---|---|
| ✅ | **El registro nunca pregunta por lesiones** (`notes:''` a pelo) → el motor de exclusiones es **código muerto** para los 13 auto-registrados | un paso en el wizard |
| ✅ | **Y si la declara, igual recibe flexión de columna cargada.** Medido: 5.040 planes con y sin «hernia discal» → flexión **1.246 → 1.246**, control **10.108 → 0**. Se cuelan Russian Twist, Crunch, Rueda Abdominal. **Y la app le afirma al coach «se excluyeron los ejercicios contraindicados»** | 1 línea de regex — **pero qué entra en la lista lo decide Laura (fisio), no el código** |

> **Clase de bug a cazar en todas partes: texto que afirma algo que el código no hace.**

## GRUPO 4 · Que la app llegue actualizada al teléfono
*Medido: 3 teléfonos con la caché desfasada del HTML servido, uno con **18 versiones**. Son
exactamente las 3 caídas de Android. Es la hipótesis viva del bug del perfil de coach.*

| | Qué | Costo |
|---|---|---|
| 🔶 | **`cache.addAll` es ATÓMICO**: un solo archivo que falle deja la caché **vacía**. El comentario de `sw.js:19` afirma lo contrario | bajo |
| 🔶 | `app-6-extra.js:69`: `try{reg.update()}catch{}` **no atrapa el rechazo de una promesa** → 6 fallos de actualización de 5 usuarios con la PWA instalada, uno de hoy (Astrid, v417) | 1 línea |
| 🔶 | `SHELL` del service worker **nunca incluyó `app-7-community.js`** (escrito en v284, el módulo nació en v373) | 1 línea |

## GRUPO 5 · Ver lo que hoy pasa a oscuras
*El 28% de los entrenos se abandona a mitad y **nadie sabe por qué**. No faltan consultas: falta instrumentación.*

| | Qué | Costo |
|---|---|---|
| 🔶 | **`warn()` es un no-op en producción** → **42 `catch`** de fallo de red/persistencia no dejan rastro en ningún lado. El limitador ya está escrito y testeado | ~3 líneas |
| 🔶 | Instrumentar dónde exactamente se abandona una sesión | medio |
| ✅ | **`app_errors.build` YA dice en qué versión va cada persona** (5 con nombre) — el pendiente «no sé en qué versión va cada asesorado» está medio resuelto y nadie lo sabía | leer, no construir |

## GRUPO 6 · Deuda que aún no muerde
| | Qué | Costo |
|---|---|---|
| 🔶 | **El coach no tiene ninguna red offline.** Asignas una rutina con mala señal, la ves aplicada, el próximo arranque la borra y **el asesorado nunca la recibe**. El asesorado tiene 4 redes para lo mismo | medio |
| ✅ | **`send-push` y `daily-notifs` sin JWT**: el candado es la llave pública. Cualquiera te manda un push con el texto que quiera (probado con `curl`). Sin fuga de datos | 30 min + 2-3 h |
| ✅ | **El bloqueo por pago es client-writable** — agujero teórico REAL, **pero sin ninguna evidencia de uso**: los 20 entrenos con plan vencido son 18 anteriores al arreglo del 1-jul y 2 de teléfonos sin actualizar | bajo |
| 🔶 | `app_errors` acepta INSERT de cualquiera; la poda corre 1×/día | 1 línea |
| 🔶 | `initPWA()` es la última llamada del arranque a otro módulo sin guarda | 1 línea |
| 🔶 | 6 de 8 planes nutricionales son volcados de plantilla con kcal fijas (mujer de 56 kg con 3.200 kcal). **Son planes que asignó el coach a mano, no salida del motor** | decisión del PO |
| 🔶 | `estimateWorkoutMinutes` promete 38-49 min donde la realidad son 64,7 | 1 constante |

---

## Lo que las auditorías dicen que NO hagas
- **Comunidad: congelar, no apagar.** Sus 8 perfiles son el coach + **exactamente los 7 activos**
  (solapamiento 100%, cero auto-registrados). No fracasó: **ya tiene todos los usuarios que puede
  tener**. Consumió el 41% de los últimos commits. Retomar cuando haya 15 activos.
- **Play Store: hoy no.** Resuelve distribución, y el cuello está *después* de instalar.
- **No tocar** las tablas de rate-limit ni el advisor `auth_leaked_password_protection`.

## Si solo se hicieran tres cosas
1. **Pedir teléfono + desbloquear el chat de los `tier:'app'`** — 26 líneas que convierten
   15 inalcanzables en alcanzables y sueltan 20 mensajes ya escritos.
2. **Que el día 1 nunca sea día de descanso.**
3. **Preguntar por lesiones y arreglar el filtro lumbar** — el único que puede hacerle daño a alguien.
