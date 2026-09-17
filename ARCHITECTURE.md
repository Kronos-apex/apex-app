# Arquitectura de AVI

Este documento existe para responder la pregunta que hace cualquiera que abre el repositorio por
primera vez: **¿por qué está hecho así?** Cada restricción de abajo es una decisión con una razón,
no una carencia — y donde hay deuda real, está escrita con su nombre.

---

## 1. Las restricciones, y por qué

### Un solo HTML, sin paso de construcción

No hay empaquetador, ni transpilador, ni `node_modules` en producción. El navegador pide
`index.html` y ocho archivos `.js` planos.

**Por qué:** AVI la mantiene una persona que no es desarrollador de profesión, para un negocio de
una persona. Una cadena de construcción es una dependencia que se rompe sola con el tiempo — se
desactualiza, cambia de API, deja de instalar — y el día que se rompa, la app no se puede tocar.
Sin construcción, cualquiera con un editor de texto puede abrir el archivo y arreglar algo dentro
de cinco años. El costo lo pagamos en ergonomía (sin tipos, sin importaciones); el beneficio es que
el producto no depende de que un ecosistema siga existiendo.

**Consecuencia honesta:** el estado es global (`DB`, `CUR`), las funciones viven en el ámbito
global y los manejadores van en el marcado (`onclick=`). Eso se compensa con controles automáticos
—hay uno que verifica que **cada `onclick` apunte a una función que existe**, y otro que verifica
que **cada identificador que el JS busca esté en el HTML**—, no con disciplina.

### Sin dependencias de terceros en el cliente

Ni una librería de JavaScript. Las gráficas son SVG dibujado a mano; las imágenes compartibles son
Canvas; el calendario, los temporizadores y el modelo de datos son propios.

**Por qué:** la app guarda datos de salud. Cada dependencia es superficie de ataque (un paquete
comprometido llega al navegador de una persona real) y superficie de mantenimiento. La regla del
proyecto es: *si cabe en veinte líneas de JavaScript plano, va en veinte líneas de JavaScript
plano.*

### Offline-first, con el dispositivo como fuente de verdad

`localStorage` manda mientras se entrena; Supabase es el punto de encuentro entre dispositivos.
Entrenar **nunca** depende de la red: se puede abrir la app, iniciar sesión, hacer la rutina
completa y registrar todo sin señal.

**Por qué:** la mitad de los gimnasios no tienen cobertura. Una app de entrenamiento que necesita
red durante la serie es una app que no se usa.

**Y aquí está la deuda principal, dicha sin adornos** → §4.

---

## 2. El mapa

### En el navegador

| Archivo | Qué hace | Puede tocar el DOM |
|---|---|---|
| `avi-core.js` | **Motor puro.** Generador de rutinas, nutrición, progresión de carga, filtros de lesión, fusiones de datos, fechas, festivos. | **No** |
| `app-1-infra.js` | Persistencia, sincronización, cola de reintentos, iconos | Sí |
| `app-2-login.js` | Autenticación, registro, arranque | Sí |
| `app-3-coach.js` | Panel del entrenador | Sí |
| `app-4-entreno.js` | Entrenamiento en vivo, historial, imágenes compartibles | Sí |
| `app-5-salud.js` | Nutrición, medidas, fotos, hábitos | Sí |
| `app-6-extra.js` | Instalación, novedades, ayuda | Sí |
| `app-7-community.js` | Comunidad (congelada, ver §5) | Sí |

La línea que importa es la primera: **`avi-core.js` no conoce el navegador**. Ahí vive todo lo que
decide algo —qué ejercicio le toca a quién, cuántas calorías, si un peso sube, qué se excluye por
una lesión— y por eso se puede probar sin abrir un navegador. Es lo que hace posible tener miles de
pruebas que corren en un segundo.

Una regla dura del arranque: **todo llamado a una función que vive en otro módulo va con
`typeof f === 'function'`**. La app reventó tres veces en Android real porque un módulo secundario
no cargó y se llevó por delante la cadena de arranque. Hoy un control estático lo verifica, y el
arranque tiene una red de última instancia **en línea dentro de `index.html`** — la única que se
ejecuta pase lo que pase.

### En el servidor (Supabase)

- **`user_data`** — una fila por persona. El dato de dominio vive en columnas `jsonb`: `profile`,
  `routines`, `history`, `prs`, `bodyweight`, `medidas`, `nutrition`, `photos`, `msgs`,
  `templates`, `coach_settings`.
- **Seguridad por fila en todas las tablas**, por dueño: `auth.uid() = user_id OR auth.uid() = coach_id`.
  En las tablas sensibles los permisos son **por columna**, no por tabla.
- **Funciones de borde** (Deno): notificaciones diarias, envío de avisos, borrado de cuenta,
  creación de cuentas por el coach, instantánea de constancia. Todas exigen identidad real: el
  token del usuario, o un secreto que vive **dentro de la base**, nunca una llave pública.
- **Migraciones versionadas** en `supabase/migrations/`.

**Lo que NUNCA va en una columna que el cliente escribe:** nada que decida un permiso. El cliente
puede escribir su propio `profile` y su `coach_id`, así que derivar de ahí «es premium» o «es de mi
gimnasio» permitiría que alguien se lo auto-asigne. La pertenencia vive en tablas que solo escribe
el rol autorizado.

---

## 3. Cómo se prueba

Cuatro capas. Cada una existe porque algo se escapó de la anterior.

1. **Suite de negocio** (`avi.test.js`) — más de 1.200 pruebas sobre las funciones puras, en `node`
   y sin framework. Corre **tres veces por commit**: huso local, UTC y con los finales de línea
   normalizados. No es paranoia: dos defectos reales solo aparecían en uno de los tres.
2. **Audit estático** (`scripts/hooks/pre-commit`, 12 controles) — bloquea el commit.
3. **Harnesses de navegador** (`scripts/e2e/`) — Chrome real por CDP. **Afirman, no fotografían.**
   Cada uno lleva su *control de montaje* («¿de verdad se abrió la pantalla?») y su *control de
   cobertura* («¿la sonda está midiendo algo?»).
4. **Matrices de sabotaje** — rompen el código a propósito, una línea a la vez, y exigen que la
   suite se ponga **roja**. Es lo que separa una prueba que vigila de una que pasa por casualidad.

Tres reglas de método que se ganaron a golpes y gobiernan todo lo anterior:

- **Un candado que no puede fallar no es un candado.** Todo control se prueba rompiendo lo que
  vigila.
- **Medir antes de arreglar, y medir el arreglo.** Varias veces la causa «obvia» era falsa y la
  medición la tumbó. Las decisiones de producto de este repositorio llevan al lado el número que
  las justificó.
- **Verificado en producción o no está hecho.** Cada despliegue arranca la app contra la URL real y
  comprueba versión, arranque y cero errores.

---

## 4. La deuda que sí existe

Un documento de arquitectura que solo explica aciertos no sirve para auditar nada.

### 4.1 · La sincronización pisa por columna entera

PostgREST **reemplaza la columna `jsonb` completa** en cada escritura. Como cada dispositivo sube
su copia en memoria, dos aparatos abiertos a la vez pueden pisarse: el segundo en guardar se lleva
por delante lo que hizo el primero.

Es la familia de defectos más cara del proyecto. Está **cerrada** para `coach_settings` (fusión en
el servidor), para `profile` y `routines` (fusión de tres vías con base en el cliente) y para
`msgs` (unión, porque es append-only). **Sigue abierta, sin víctima medida, en `history`, `prs`,
`bodyweight`, `medidas`, `nutrition` y `photos`.**

La salida definitiva no es más fusiones: es que el servidor acepte **parches por campo** en vez de
columnas enteras. El patrón ya existe y funciona.

### 4.2 · No hay ambiente de pruebas

Existe **un** proyecto de Supabase y es producción. Por eso los harnesses están *sellados* para que
no puedan escribir en la nube desde `localhost` — un sello que existe porque una prueba borró las
rutinas reales de un asesorado. Consecuencia: la sincronización entre dispositivos se prueba contra
una nube **simulada**, no real.

### 4.3 · Los textos legales están en borrador

Están escritos y publicados, pero **sin revisión de abogado**, y la app tiene menores registrados
con autorización de acudiente. Es el punto más expuesto del proyecto y no es técnico.

### 4.4 · `avi-core.js` es grande

Más de 11.000 líneas en un archivo. Partirlo por dominio es viable sin cambiar comportamiento
—hay miles de pruebas que lo demostrarían— y está pendiente de que exista una razón concreta:
que entre otra persona a trabajar en el código.

---

## 5. Lo que está congelado

**Comunidad** (`app-7-community.js`, ~2.200 líneas) está en producción y **no recibe features
nuevas**. El número que lo decidió: de 45 publicaciones, **ninguna la escribió una persona** (todas
son automáticas), 1 comentario en toda la historia y 3 mensajes directos. Se mantiene —seguridad y
correcciones sí— y se reabre si la gente empieza a usarla.

Congelar no es esconder: el código sigue vivo, sus candados se siguen manteniendo y la decisión
está escrita con su fecha y su medición.

---

## 6. Decisiones que no se van a revertir

| | Por qué |
|---|---|
| No migrar a un framework ni a tipos | Decenas de miles de líneas que funcionan y miles de pruebas que se perderían, a cambio de ergonomía. El usuario no gana nada. |
| No renombrar los identificadores internos heredados (`apex`, `ax_`) | Rompería los datos guardados y la app instalada de gente real. |
| No cambiar el formato de las claves de sesión | Rompería las sesiones de entrenamiento en curso. |
| El service worker es un archivo estático | Convertirlo en blob rompe Android Chrome. Ya pasó. |
| El porcentaje de grasa corporal no sale de su pantalla | Decisión de producto: los kilos que alguien levanta se pueden presumir; su composición corporal, no. |
