# 🍽️ Registro de alimentos — plan vivo

> **Decisión del PO (2026-08-04, ratificada el 2026-08-05): se construye el registro COMPLETO
> tipo MyFitnessPal** — base grande, búsqueda libre y código de barras. Revierte la decisión del
> 2026-07-09 («no construir base de datos de alimentos»).
>
> Se le presentaron tres alcances con su costo medido y eligió el completo. **Es su decisión y va
> completa.** Este documento define QUÉ se construye, EN QUÉ ORDEN y con qué datos, más el riesgo
> que queda vivo y cómo se mide.

---

## 1. El riesgo que el PO ya conoce y aceptó

Medido el 2026-08-05 sobre la base real, la acción más barata que tiene la app —**un toque** para
sumar un vaso de agua, disponible desde el 9 de julio— da esto:

| | |
|---|---|
| Personas que la han usado alguna vez | **6 de 24** |
| Personas que nunca la usaron | **18** |
| Mejor adherencia individual (Luz) | **10 días de 27 = 37%** |
| Pasos (desde el 17-jul) | máximo **7 días**, 5 personas |
| Actividad semanal | 3-6 personas, 4-13 registros |

Un registro de alimentos pide **3-5 anotaciones diarias**, unas 25 veces más esfuerzo. El riesgo
es que se construya el módulo más grande de la app y lo use nadie.

**No se discute más — pero se MIDE.** El módulo nace instrumentado (§7): a las 3 semanas de estar
en producción se cuenta cuánta gente registró ≥3 días. Ese número decide si se invierte en las
fases de aceleración o se congela. Medir no es desconfiar de la decisión: es lo que permite
defenderla con datos en vez de con opiniones.

---

## 2. De dónde salen los alimentos (verificado el 2026-08-05)

### 2.1 Base propia de AVI → **ICBF, Tabla de Composición de Alimentos Colombianos (TCAC 2018)**
- **773 alimentos**, incluidos **95 alimentos autóctonos y las preparaciones típicas del país**.
  Es exactamente lo que a la tabla actual de 50 le falta: sancocho, bandeja, arepas, tamal.
- Es la tabla **oficial del Estado colombiano** — la misma fuente que usa la política pública de
  seguridad alimentaria. Para una app colombiana no hay fuente mejor.
- Se publica como PDF (`tcac_web.pdf`) + un portal de consulta. **Extraerla y normalizarla es
  trabajo real** (F1), no un copiar y pegar.
- 🔴 **Pendiente antes de F1:** confirmar por escrito las condiciones de reúso/cita con el ICBF.
  La página no publica una licencia explícita de datos abiertos. Es una publicación oficial y lo
  esperable es que baste con citar la fuente, pero **eso se confirma, no se asume**.

### 2.2 Productos empacados por código de barras → **Open Food Facts**
- Base colaborativa mundial con **código de barras**, gratuita y con API pública.
- 🔴 **HALLAZGO QUE CAMBIA LA ARQUITECTURA:** está bajo licencia **ODbL**, que permite uso
  comercial **pero obliga a atribución Y a compartir-igual**. Si se **fusionan** sus datos con los
  nuestros, **la base resultante hay que publicarla como datos abiertos**.
- **Decisión técnica (mía, y es la que evita el problema): NO se fusionan.** La TCAC es la base de
  AVI; Open Food Facts se **consulta en línea por código de barras** y su resultado se guarda como
  lo que es —un producto de terceros consultado— con su **atribución visible** en la pantalla
  donde aparece. Nunca entra al `foods.json` propio.
- Consecuencia honesta para el usuario: **el escaneo de código de barras necesita internet.** El
  resto del registro funciona sin conexión.

---

## 3. Restricciones de la app que este módulo NO puede romper

| Restricción | Cómo se respeta |
|---|---|
| Sin dependencias JS externas | Código de barras con **`BarcodeDetector` nativo** del navegador. Nada de librerías. |
| Offline-first | La base propia viaja en el dispositivo y la cachea el Service Worker. Solo el escaneo pide red. |
| Peso del arranque | La base **NO va dentro de `index.html`**: archivo `foods.json` aparte, versionado y cacheado igual que los módulos `app-*.js`. |
| Datos que un motor pueda necesitar | El registro va en el **historial que ya sincroniza**, jamás en una clave suelta de `localStorage` (gotcha del ánimo: lo que solo vive en el teléfono no existe para ningún motor). |
| Valores verificados contra fuente | Cada alimento guarda **de qué fuente salió**. Los gramajes por medida casera los dicta la tabla — nada de «una cucharada son 15 g» escrito de memoria (ya nos costó: la avena pesaba 5,6 y la persona servía un tercio). |
| iPhone | `BarcodeDetector` no existe en Safari → **degradación explícita** a búsqueda por texto, no pantalla rota. |

---

## 4. Fases (orden de construcción, no recortes de alcance)

### F1 · La base de datos y el buscador
Extraer la TCAC, normalizar a la forma de `NUT_FOODS`, fusionar con los 50 actuales sin duplicar,
empaquetar `foods.json` + carga por Service Worker. Buscador sin tildes y por tandas (mismo patrón
que la biblioteca de ejercicios, v405). **Sin UI de registro todavía.**
**Entregable medible:** buscar «sancocho», «arepa de huevo» o «changua» devuelve resultados con
sus macros y su fuente. Muestra verificada contra el PDF original.
**Gate:** revisión de **Andrés Hyp** sobre la tabla (decisión #1 del PO, aún sin su visto bueno).

### F2 · Registrar el día
Agregar alimentos a desayuno/almuerzo/cena/meriendas, cantidad en medidas caseras y en gramos,
editar y borrar. Suma del día contra el objetivo que ya calcula el motor, por kcal **y por macro**
(un total bueno puede tapar un macro roto). Funciona sin conexión.
**Aquí entra el pendiente `nutPortionText`** (el paso de media ración), que es de una sola función.

### F3 · Código de barras y productos empacados
`BarcodeDetector` nativo → consulta a Open Food Facts → producto con su atribución. Caché local de
lo ya escaneado. Degradación limpia donde no hay soporte o no hay red.

### F4 · Lo que ve el coach
En la ficha del asesorado: qué comió, adherencia al plan y desvío por macro. Sin esto el módulo
solo sirve al asesorado y **el coach es quien paga la app**.

### F5 · Que registrar no dé pereza
«Repetir lo de ayer», recientes, favoritos, mis recetas (combinaciones propias). Es la fase que
decide si la gente sigue registrando en la semana 3. **Su construcción depende de lo que diga la
medición del §7.**

---

## 5. Lo que se reusa (ya está construido y probado)

- `NUT_FOODS` / `NUT_FOOD_BY_ID`, `nutSolveMeal`, `nutDayPlan`, `nutPortionText` — el motor que ya
  arma el plato con gramos.
- `nutWeekTargets` / `nutBaseFor` / `nutDayNote` (v435) — el objetivo del día y de la semana,
  fuente única para las dos pantallas.
- La tarjeta de hábitos `#cn-habits` (agua y pasos) — el registro de comida es su tercer bloque.
- El patrón de buscador + tandas de 30 de la biblioteca de ejercicios (v405).

---

## 6. Decisiones que siguen siendo del PO

1. **¿El registro es para todos o solo Premium?** Hoy la nutrición está bloqueada para el tier
   libre. El registro es el módulo más caro de construir y de mantener.
2. **¿Qué ve el coach exactamente?** Ver todo lo que come una persona es íntimo. ¿El detalle
   completo, o solo adherencia y desvío por macro?
3. **La revisión de Andrés Hyp** sobre la tabla — sigue pendiente desde el 3-ago y bloquea F1.

---

## 7. Instrumentación obligatoria (parte de F2, no opcional)

Se registra, sin datos personales: cuántas personas abren el registro, cuántas guardan al menos un
alimento, cuántos días seguidos, y en qué punto lo abandonan.
**A las 3 semanas en producción:** si menos de 3 personas registraron ≥3 días, se para F5 y se
revisa el enfoque con el dato en la mano.

*Escrito el 2026-08-05 · avi-v437 en producción · autor: sesión de Opus con el PO*
