# Lo que queda sobre la mesa — decisiones del PO

Ordenado por **lo que mueve el negocio dividido por lo que cuesta**, no por lo elegante.
Todo lo de la sección 0 se hace **sin escribir una línea de código**.

---

## 0 · Sin código

### 🔴 La app obliga a una menor de edad a mentir para registrarse
Casilla **obligatoria** «Declaro que soy mayor de 18 años» (`index.html:366`), sin alternativa de
acudiente y **sin cruzar contra la edad que la propia app acaba de pedirle** dos pasos antes
(`index.html:313` pide 12-99). Valery (15) y Sharith Sofía (16) tienen `consent.adulto:true`
guardado en producción. Y la evidencia que quedó registrada dice, literalmente,
`v:"2026-07-26-borrador"`.

Además: **la ruta por la que TÚ creas la cuenta no captura consentimiento en absoluto.** Solo 4 de
24 personas lo tienen, todas auto-registradas desde el 20-jul.

Esto no es una preferencia de producto. En Colombia, la Ley 1581 tiene régimen reforzado para
menores, y la app guarda peso, medidas, fotos y salud. **La decisión es tuya y la recomendación es
que la tomes con un abogado**, no conmigo: los 4 documentos de `legal/` siguen rotulados «BORRADOR
pendiente de revisión de abogado». Detalle en `A7-legal.md`.

### 🔴 7 personas llevan semanas leyendo, dentro de su propia rutina, una nota que es para ti
«Borrador generado automáticamente. Revisa y ajusta antes de asignar.» Verificado en producción:
Cristian, Daniel, diana ramirez, jhojan, Nicolás, Santiago Santos y Sofía Vega la tienen **en
todas sus rutinas**, la más antigua desde el 28-jun, con **0 sesiones**. Se arregla revisando y
asignando esas rutinas desde tu panel — o quitando el texto de la vista del asesorado, que ya es
código. La misma frase sale en **2 de las capturas de la web de venta**.

### 🟠 El canal de auto-registro no cobra
De 13 auto-registrados, **12 nunca han pagado un peso** y solo uno (Yeison) pagó alguna vez.
Contraste: de los 9 que creaste tú, **pagaron los 9**. Y **0 de 13 tienen notificaciones activas**
(1 tiene teléfono), así que no hay forma de alcanzarlos. Es una decisión de negocio, no un defecto:
o se les cobra, o se asume que ese canal es vitrina. Detalle en `A6-negocio.md`.

---

## 1 · Lo que le pasa a una persona real

### 🔴 El filtro de lesiones protege 3 de 10 zonas cuando la lesión la escribes tú
`parseLimitations` solo detecta **rodilla, lumbar y hombro** desde la nota de ingreso. Codo,
muñeca, pecho, cuello y tobillo dan `detected:false`. Las reglas clínicas de Laura (v546) sí
cubren esas zonas, pero **solo se disparan cuando el asesorado reporta dolor desde dentro del
entreno**. Si la limitación la escribiste tú al darlo de alta, no filtra. `A4-deportivo.md`.

### 🔴 Marcar una serie puede fallar en silencio
`setLog` y `setDone` (`app-4-entreno.js:1627`, `:1631`) escriben sin protección, y son la **única**
vía por la que una serie entra al historial. Si esa escritura falla, «✓ Completar serie» no hace
nada: no avanza, no arranca el descanso, no avisa.
**Medí el disparador antes de alarmar:** las fotos viven en ese mismo cupo y la más pesada es la de
Samuel con 273 kB, sobre un cupo de varios megas — **en Android hoy no le pasa a nadie**. Donde es
inmediato es en un iPhone en modo privado, el aparato que nadie ha probado. Arreglo de 2 líneas.

### 🔴 La pantalla se apaga en el descanso entre series
El temporizador más usado de la app **nunca pide mantener la pantalla encendida**, mientras que el
isométrico, el HIIT y el cardio sí lo hacen (`app-6-extra.js:1098`, `:1155`, `:1243`). Arreglo de
una línea, en el hermano olvidado de tres que ya lo hacen bien.

### 🟠 Nadie ve si un dato quedó sin subir — y esto apunta al reporte de Claudia
La app sabe qué quedó pendiente y al volver con red fusiona sin perder nada, pero **eso no se pinta
en ninguna parte** del flujo de entreno. Refuerza la hipótesis abierta: lo que le falla no es
*entrar*, es *sincronizar*, y no tiene cómo saberlo. `A3-movil.md`.

### 🟠 El suspendido no tiene salida
Desde v564 el vencido entra y ve cómo volver. **El suspendido sigue viendo solo el formulario de
login**, sin tu contacto ni WhatsApp. Hoy son Nataly y Miguel Pulido.

---

## 2 · Candados que no muerden

### 🔴 La puerta que crea las cuentas copia a mano la regla de contraseña
`supabase/functions/coach-create-client/index.ts:61` replica `passwordProblem` (`avi-core.js:2825`)
en una función suelta, y **ningún test ata las dos**: `avi.test.js` menciona la original y cero
veces la copia. Bajarla a «4 caracteres cualquiera» deja la suite en 976/976. Es la tercera vez que
este repo paga la misma clase de defecto (v426, v551) — las dos anteriores se cerraron con un test
espejo. `A1-codigo.md`.

### 🟠 Las matrices de sabotaje mutan archivos compartidos sin candado
Mientras una corre, el repo está inconsistente y no hay forma de distinguir un defecto real del
sabotaje de otro. Ya costó un fixture de producción roto. Se cierra con un archivo de bloqueo.

### 🟡 24 versiones de trabajo tirado
`renderPaymentCard` se sigue llamando en cada render de «Hoy» (`app-4-entreno.js:458`) pese a estar
documentada como letra muerta desde v540: pide un Nequi vacío que además vive en tu fila, y la RLS
por dueño impide que el teléfono del asesorado la lea. **No la ha visto nadie nunca.**

---

## 3 · La web de venta

- 🔴 **Las capturas siguen mostrando la nota interna** (arriba). Esperan fotos tuyas.
- 🟠 **Cero enlaces a política de datos y términos** en la página que pide teléfono y plata. Los 4
  documentos existen y responden 200; nadie los enlaza.
- ✅ Lo sano, medido: precios y planes coinciden con lo que el código entrega, «374 ejercicios» es
  cierto hoy, el FAQ de dolor refleja v546, y **no hay deriva de despliegue**.

---

## 4 · Lo que está sano y conviene no tocar

- **El aislamiento de datos: 16/16.** Nadie llega a los datos de otro, con controles que prueban
  que las sesiones sí ven lo suyo.
- **La comunidad está bien construida**, aunque nadie la use: `esc()` en las 61 interpolaciones,
  validador en el servidor, **protección de menores por trigger de base de datos** (infalsificable
  desde el teléfono) y tres límites de tasa reales.
- **Los 6 temporizadores del guiado usan marca de tiempo absoluta** — a prueba de que iOS los
  congele en segundo plano.
- **Los 27 sabotajes del filtro de lesiones siguen mordiendo** contra el catálogo de +127
  ejercicios nuevos, y `_verify-lesiones.mjs` da 27/27 contra producción.
