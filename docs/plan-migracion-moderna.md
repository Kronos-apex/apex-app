# 🧱 PLAN DE MIGRACIÓN A UN STACK MODERNO — plan VIVO

> Pedido del PO (17-sep-2026): *«quiero que mi aplicación sea una aplicación seria y profesional y
> necesitamos reescribirla en un framework moderno… imagina que un inversor quiera hacer una
> auditoría y vea que tenemos una buena idea pero algo muy básico»*.
>
> Este documento **revierte el §4 de `plan-profesional.md`** («no se va a migrar») con una razón:
> se midió el costo real y **el camino barato existe**. Lo que no cambia es el argumento de fondo —
> una reescritura COMPLETA sigue siendo la peor opción — pero eso no es lo que hace falta hacer.

---

## §0 · LO QUE SE MIDIÓ ANTES DE DECIDIR (17-sep)

### 1. El motor YA es consumible desde un proyecto moderno. Probado, no supuesto.

Se compiló un *spike* con el **TypeScript 5 que ya está instalado en `avi-web`**, importando
`avi-core.js` **sin tocarle una línea**:

```
funciones del motor disponibles: 534
TDEE calculado por el motor real: 2178 kcal
racha: 0 semanas · 1 días esta semana
whatsapp normalizado: 573001234567
festivos colombianos 2026: 18
```

**Cero errores de tipos. El motor corrió.** Y no es casualidad: `avi.test.js` lo ejecuta en Node
1.229 veces por commit desde hace meses, así que ya estaba probado que vive fuera del navegador.

👉 **Consecuencia:** los **11.574 lines del motor** —el generador de rutinas, la nutrición, la
progresión de carga, los filtros de lesión, ocho meses de decisiones medidas— **no se reescriben.
Se importan.** Lo que se migraría es la capa que pinta, no la que decide.

### 2. AVI ya tiene un stack moderno en producción

`avi-web` (el sitio de venta) corre **Next 16 · React 19 · TypeScript 5 · Tailwind 4** en Vercel.
No hay que elegir stack ni montar nada: ya existe, ya despliega y ya funciona.

### 3. El tamaño REAL de lo que habría que migrar

| Pieza | Líneas | ¿Migrar? |
|---|---:|---|
| `avi-core.js` — el motor | 11.574 | **No: se importa tal cual** |
| `app-3-coach.js` — panel del entrenador | 4.219 | **Sí, y primero** |
| `app-2` + `app-4` + `app-5` + `app-7` — la app del asesorado | 11.432 | **No** (ver §2) |
| `app-1-infra.js` — persistencia y sincronización | 2.232 | Parcial, y mejorándolo |

**La reescritura «completa» eran 37.118 líneas. El primer paso real son ~4.200 de interfaz.**
Elegir bien la frontera reduce el trabajo casi seis veces.

---

## §1 · EL MÉTODO: ESTRANGULAMIENTO, NO REESCRITURA

La técnica se llama *strangler fig* y es como migran los equipos que no pueden apagar el producto:
se levanta la app nueva **al lado**, se le pasa UNA pantalla a la vez, y la vieja se va quedando
sin trabajo hasta que se apaga sola. En ningún momento hay un «gran día del cambio».

Lo que lo hace posible aquí, y que no es normal tener:
- **El motor es puro y está probado**, así que la lógica no se re-implementa: se importa. Las 1.229
  pruebas siguen protegiendo exactamente lo mismo mientras se migra.
- **Los datos no se tocan**: las dos apps leen la misma base con la misma seguridad por fila.
- **Se puede parar en cualquier punto** y lo que haya quedado migrado sigue sirviendo.

---

## §2 · LA FRONTERA, Y POR QUÉ VA AHÍ

### Se migra el PANEL DEL ENTRENADOR

Es una herramienta **de escritorio y en línea**: el coach la usa sentado, con red. **No tiene
ninguna razón para ser offline-first**, que es la única restricción que obliga al stack actual. Y
es, además, **lo que un inversor mira**: nadie evalúa una empresa por la pantalla de series y
repeticiones, la evalúa por el tablero que muestra el negocio.

### NO se migra la app del asesorado

Ahí el vanilla no es una carencia, es **la ventaja competitiva**: arranca sin red en un gimnasio
sin cobertura, pesa lo que pesa y no depende de que un empaquetador siga existiendo. Una PWA
offline-first reconstruida en React sería **más pesada, más lenta al abrir y más frágil**, para
que la persona haga exactamente lo mismo. Eso no es modernizar: es pagar por empeorar.

> Y decirlo con esas palabras es parte del argumento frente a quien audite: **saber dónde NO
> cambiar de tecnología es lo que separa a un equipo con criterio de uno que sigue la moda.**

---

## §3 · LA CONVERGENCIA QUE LO VUELVE RENTABLE

El panel nuevo **no puede** escribir como escribe el viejo: si volviera a mandar la columna `jsonb`
entera, arrastraría la deuda que costó v509, v588, v616, v621, v623 y v625.

Así que la migración **es** el arreglo: cada pantalla que se pase escribe con **parches en el
servidor** (el patrón `coach_settings_patch` de v589, que ya funciona y ya está probado). Dicho de
otra forma, **F1.2 del plan profesional y esta migración son el mismo trabajo hecho una sola vez**.

---

## §4 · LOS PASOS

### Paso 0 · La prueba de que el camino existe · ✅ **HECHO** (17-sep)
El spike de arriba. Riesgo técnico de la migración: **medido y en cero**.

### Paso 1 · El esqueleto y UNA pantalla · ⏳ siguiente
Un proyecto Next + TypeScript (nuevo, privado, en Vercel) con:
- sesión real contra el mismo Supabase (misma seguridad por fila, sin permisos nuevos);
- `avi-core` como motor compartido;
- **el Inicio del coach**: ingresos del mes, activos, sesiones de la semana, retención, quién
  entrenó hoy. Es la pantalla que se enseña.
- **Criterio de cierre:** las cifras del panel nuevo **coinciden con las del actual** sobre los
  mismos datos. Si no coinciden, es un hallazgo — y se arregla antes de seguir.

### Paso 2 · Las pantallas de trabajo
Lista de asesorados → ficha → rutinas → mensajes. Una por una, **con sus escrituras por parche**.

### Paso 3 · Apagar lo migrado
Cuando el panel nuevo cubra lo que el coach usa a diario, el panel viejo se retira de la app y
`app-3-coach.js` se borra. La app del asesorado adelgaza de paso.

### Paso 4 · Lo que se decide DESPUÉS, con datos
Si AVI GYM (varios entrenadores, marca blanca) se activa, el panel nuevo ya es la base natural.
**La app del asesorado no entra en ningún paso**, salvo que aparezca una razón medida.

---

## §5 · LO QUE ESTO CUESTA, SIN ADORNOS

- **Paso 1:** una o dos sesiones. Sale algo que se puede enseñar.
- **Paso 2:** varias sesiones, pantalla por pantalla. Se puede parar en cualquiera.
- **Riesgo para quien usa la app hoy:** **ninguno mientras no se apague nada**. Las dos conviven.
- **Lo que NO compra:** que la app del asesorado sea mejor. Ahí no cambia nada, a propósito.
- **Lo que SÍ compra:** un panel que se puede mostrar sin explicar nada, tipado de punta a punta,
  con las escrituras arregladas de paso — y la frase que de verdad importa en una auditoría:
  *«el motor de dominio está aislado, probado y compartido entre las dos apps»*.

---

## §6 · LO QUE SIGUE SIN HACERSE (y no cambia)

Reescribir el producto ENTERO de una vez. No por conservadurismo: porque **37.118 líneas que
funcionan, con 24 personas pagando encima y 1.229 pruebas que habría que rehacer**, se cambian
por partes o no se cambian. El plan de arriba llega al mismo destino sin un solo día de app rota.

---

## §7 · ESTADO

| Paso | Estado |
|---|---|
| 0 · spike: el motor se importa desde TypeScript | ✅ hecho (17-sep) |
| 1 · esqueleto + Inicio del coach | ⏳ siguiente |
| 2 · pantallas de trabajo | ⏳ |
| 3 · apagar el panel viejo | ⏳ |

**Decisiones del PO pendientes antes del Paso 1:** ¿repositorio nuevo privado (gratis en Vercel) o
dentro de `avi-web`? · ¿en qué dirección vive el panel mientras no haya dominio propio?
