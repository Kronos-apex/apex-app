# Lo que queda sobre la mesa — decisiones del PO

Ordenado por **lo que mueve el negocio dividido por lo que cuesta**, no por lo elegante.
Todo lo de la primera sección se hace **sin escribir una línea de código**.

---

## 0 · Esta semana, sin código

### 🔴 El 2 de septiembre se vencen cuatro el mismo día — 560.000 COP
**Astrid, Claudia, Kathe y Luz.** Antes: **Nataly el 31 de agosto**. Después: Miguel el 3, Samuel
el 5. **Siete cobros en seis días, y el 63 % de tu recurrente cae en uno solo.**
Es una fecha en tu calendario, no una tarea de desarrollo. Lo demás de esta lista puede esperar;
esto no.

### 🟠 Valery lleva 8 sesiones y no paga
Se auto-registró el 2 de agosto y **es la primera persona auto-registrada que de verdad adopta la
app** — eso tumba la conclusión de julio de que ese canal estaba muerto. Está en `premium`
regalado. **Cobrarle cuesta cero.**

### 🟠 Tu vitrina está al 17 %
**1 tarjeta de 6 huecos, y hay 8 asesorados con historia lista.** Es el canal que construiste para
vender a nuevos, funcionando a un sexto de su capacidad. Publicar las 5 que faltan son unos toques
desde la ficha de cada uno.

---

## 1 · Lo que le pasa a una persona real

### 🔴 El día 1 sigue cayendo en «día de descanso» — el 43 % de los días
El plan se reparte de lunes a viernes; quien se registra un sábado abre la app y lo primero que lee
es que **hoy no entrene**. **Le pasó a Chema el sábado 22 de agosto**, con plan de pago y cero
sesiones. Y el rediseño de «Hoy» que elegiste (v503-v508) **está apagado a propósito para el día 1**,
así que a quien más falta le hace, no le llegó.
👉 **Choca de frente con tu decisión de vender a nuevos.** Es lo primero que arreglaría del producto.

### 🔴 La app promete «menos de una hora» y no se cumple la mitad de las veces
Dos áreas lo midieron por separado: promete ~43 min, la sesión real dura 56-62, y **el 44-53 % pasa
de la hora**. Es el texto menos cierto de la app y es fácil de corregir: **decir la verdad medida**.

### 🟠 El gate de nivel nunca cura los planes ya escritos
El motor de hoy no comete el fallo (0 violaciones en 5.760 planes), pero **4 ejercicios avanzados
siguen dentro de planes de principiante e intermedio** — y uno lo metió la propia corrección de
v513 al re-etiquetar el hip thrust unilateral. **Hoy no lo ejecuta nadie** (las dos personas tienen
0 sesiones), y por eso mismo conviene cerrarlo ahora: el día que una de las dos abra la app, nadie
va a estar mirando.

### 🟠 El asistente ya pregunta por lesiones, pero sella el plan como «revisado» sin avisarte
El filtro es real y funciona. Lo que no es cierto es el sello: **nadie revisó ese plan**, y tú no te
enteras de que esa persona declaró una lesión.

### 🟡 Declarar dolor baja el peso… salvo en `core` y `funcional`
El step-up con mancuernas se queda con su carga. Puerta cerrada, ventana abierta — la familia de
siempre.

---

## 2 · Lo que se está degradando solo

### 🟠 A Nataly cada recordatorio le llega 8 veces
Un mismo teléfono acumula filas de notificación. La tabla pasó de 10 a 18 filas en tres semanas y
**7 de esas 18 son duplicados de una sola persona**. Lo encontraron A2 y A3 por separado.
**Cinco líneas.**

### 🔴 El gate del arranque aprueba justo el caso que existe para cazar
`_verify-arranque-modulos` está para que nadie se quede mirando una pantalla pegada en su Android.
A1 lo corrió con un módulo bloqueado: **imprime OK**. Su criterio de éxito lo cumple el defecto.
Es un gate que da falsa tranquilidad, que es peor que no tenerlo — la lección que este repo ya
pagó tres veces.

### 🟠 Media jornada de trabajo del último mes no la usa nadie
**90 de 182 commits son de nutrición; 49 del registro de alimentos.** Uso real: 4 personas, 5 días,
16 anotaciones, **nada desde el 13 de agosto**. El escáner de códigos de barras tiene **0 filas: no
se ha usado nunca**. El triaje de dolor (24 commits) se usó una vez y fuiste tú.
👉 La recomendación es **congelarlo con un disparador medible, no borrarlo**. No rompe nada; es el
costo de oportunidad más grande del delta.

---

## 3 · Deuda que hoy no muerde, pero está cargada

- **La página pública no filtra por coach** (`app-2-login.js:1877`): pide las 6 tarjetas más nuevas
  sin mirar de quién son. Hoy da igual porque hay un solo moderador. **Muerde el día que AVI GYM
  tenga el suyo**: cada coach le regalaría vitrina al otro. **Una línea.**
- **`fb_ins` de `food_barcodes`** es el último hermano vivo de la clase que v525 cerró en la
  vitrina: «es mi fila» gateando un catálogo compartido con registro abierto. **0 filas, así que
  hoy no le pasa a nadie.**
- **El `.catch` del Service Worker.** Una línea, correcta de poner. ⚠️ **No es lo que impide que una
  versión llegue a un teléfono** — eso está medido y descartado.
- **3 de 129 sabotajes ya no se aplican** y los 2 gates que la auditoría de v417 marcó siguen igual
  **108 versiones después**.

---

## 4 · Decisiones que solo puedes tomar tú

1. **¿Se instrumenta la versión que trae cada teléfono?** Hoy la app solo la registra cuando hay un
   error, así que **no hay forma de confirmar que un arreglo llegó**. Es la pregunta de fondo detrás
   del reporte de Kathe.
2. **¿La rampa calórica se construye?** Sigue sin construirse y A4 dice que **hay que re-medir el
   argumento antes de decidir**: los números con los que se planteó ya no son los de hoy.
3. **¿El registro de alimentos se congela?** Y si sí, con qué disparador para volver a abrirlo.
4. **La ración de «6 claras de huevo»** en el desayuno: el arreglo es cambiar un dato de la tabla,
   pero topar un alimento tiene un valor intermedio **peor** que no topar. Si el número que arregla
   la métrica cuesta comida real, **la decisión es de Andrés, no del ingeniero**.
