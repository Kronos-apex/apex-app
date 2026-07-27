# Estudio de interfaz — FASE 1: la PRIMERA SESIÓN

> **Qué es esto.** El PO dijo «siento que la interfaz estamos cortos y la gente no conecta» y pidió
> un estudio con benchmark de apps de entrenamiento ANTES de tocar nada (misma regla que ya nos
> corrigió el enfoque del muro de Comunidad). Escrito 2026-07-26. **Fase 1 = de abrir la app a
> terminar el PRIMER entreno.** La auditoría general del resto de la interfaz es la Fase 2.
>
> **Nada de esto está implementado.** El entregable es: diagnóstico + camino + maquetas para elegir.

---

## 1. El dato que manda (producción, 2026-07-26)

De las **23 personas del directorio del gimnasio**:

| Segmento | Personas |
|---|---|
| Entrenan y están en la Comunidad | 7 |
| **Tienen rutina asignada y NUNCA completaron un entreno** | **8** |
| Entrenaron alguna vez y se fueron (último entreno hace 15-45 días) | 7 |
| Activa hoy y fuera de la Comunidad | 1 (Claudia) |

Los 8 **sí abrieron la app** (tienen su fila sincronizada con las rutinas que les armaste). No es un
problema de instalación ni de acceso: **abrieron, vieron su plan y no completaron una sola sesión.**

Ese es el punto exacto donde se pierde el 35% de tu gimnasio, y es lo que estudia esta fase.

### Contexto honesto antes de dramatizar
La referencia de la industria: **solo el 20-30% de quien baja una app de fitness completa un entreno
en su primera semana**; la retención a 7 días está por debajo del 15%
([RetentionCheck](https://retentioncheck.com/churn-benchmarks/fitness-apps),
[Lifecycle Architect](https://lifecyclearchitect.com/guides/activation-optimization-for-fitness-apps/)).
En AVI, 15 de 23 completaron al menos uno = **65%**. Contra una app fría, AVI va MUY por encima.

**Pero la comparación correcta no es esa.** Estas 23 personas no bajaron una app al azar: son
asesorados de un entrenador que conocen, que les armó un plan personalizado y les pidió usarla. Con
esa calidez, que 1 de cada 3 no llegue a terminar un entreno sí es un problema de producto.

---

## 2. Qué ve HOY una de esas 8 personas

Reproducido con el harness `scripts/e2e/_shot-day1.mjs` (rutinas asignadas, historial en cero) y
MIRADO, no supuesto. Capturas en `Temp/avi-day1`.

**El primer pantallazo (390×844, lo que cabe sin desplazar):**
1. Saludo «Buenas noches, Santiago 👋» + píldora «Empieza tu racha esta semana».
2. Una barra de progreso que dice **«Sentadilla · Serie 1/3 — 0%»**… antes de haber empezado nada.
3. **«¿Cómo te sientes hoy?»** con 5 caras, ocupando media pantalla.
4. Empieza una foto grande.

**Lo que NO se ve sin desplazar:** qué entrena hoy, cuántos ejercicios son, cuánto dura, ni un botón
de empezar. El bloque «ENTRENAMIENTO DE HOY · Full body A · 4 ejercicios · 12 series» está en la
**segunda** pantalla. La primera serie que puede registrar está en la **cuarta**.

**Medido:** el contenido de «Hoy» el día 1 son **3.565 px** de alto con **729 px** visibles —
**casi 5 pantallas** antes de terminar de ver el día.

### Tres defectos concretos hallados en las capturas
1. 🔴 **La primera acción que la app pide no es entrenar, es autoevaluarse.** El chooser de ánimo
   está por encima de todo. Para quien ya entrena es una función querida (adapta la rutina); para
   quien nunca ha entrenado es un peaje emocional antes del valor.
2. 🔴 **Jerga técnica visible al asesorado:** bajo «Sentadilla» dice literalmente **`Pierna ·
   peso_reps`**. `peso_reps` es un identificador interno. La investigación de referentes marca la
   jerga sin explicar como una de las cinco barreras principales para principiantes (solo 13 de 50
   apps la evitan, [Medium/50 apps](https://medium.com/@trainrboost/why-73-of-fitness-apps-fail-beginners-i-analyzed-50-apps-6817a6cb23b2)).
   Viola además la regla de tono del propio proyecto («cero jerga técnica»).
3. 🔴 **La píldora «Instalar app» tapa el primer campo de serie.** En la captura se ve encima de la
   fila donde se anota el primer peso. Ya la escondimos en login, chats y cierre de entreno; en
   «Hoy» sigue encima del contenido.

**Un cuarto, de jerarquía:** en «Rutinas», el botón más llamativo de toda la pantalla es
**«+ Nueva rutina»** (verde, ancho completo). A un principiante al que su entrenador ya le armó el
plan, lo que más grita la pantalla es que se cree otro.

---

## 3. Qué hacen los referentes

**Hevy** (el más cercano en categoría) vende como característica que se empieza un entreno **en 2
toques**: el botón de empezar vive **arriba del todo** de su pestaña principal
([Hevy](https://www.hevyapp.com/features/start-empty-workout/)). Las reseñas coinciden en el porqué:
*«sin bloat, sin gamificación innecesaria, sin upselling agresivo — abres, empiezas, registras, ves
tu progreso»* ([Setgraph](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026),
[PRPath](https://prpath.app/blog/strong-vs-hevy-2026.html)).

La literatura de activación dice lo mismo con otras palabras: las apps de fitness fallan por
**exigir esfuerzo antes de entregar valor** (permisos, cuestionarios, metas) y porque **un solo
punto de fricción en las primeras 48 horas** basta para que la persona no vuelva
([Purchasely](https://www.purchasely.com/blog/app-onboarding-process),
[Digia](https://www.digia.tech/post/how-to-build-in-app-onboarding-flow-first-win/)).
Y una distinción que aplica de lleno a AVI: la activación de una app de fitness es **conductual, no
informativa** — no basta con que entienda, tiene que **terminar** algo, y ese primer final decide si
vuelve ([Lifecycle Architect](https://lifecyclearchitect.com/guides/activation-optimization-for-fitness-apps/)).

**Lo que AVI ya hace mejor que ellos** (no hay que tocarlo): el plan viene armado por un entrenador
de verdad, con fotos por ejercicio, calentamiento sugerido, adaptación por ánimo y una pantalla de
cierre celebratoria. Hevy te da una hoja en blanco; AVI te da un plan. **La ventaja está construida
y enterrada bajo cuatro pantallas.**

---

## 4. Diagnóstico

> El problema no es que la interfaz sea fea ni que falten funciones. **Es de ORDEN.** El día 1, AVI
> muestra sus funciones para gente que ya entrena (ánimo, progreso, racha, hábitos) antes de mostrar
> lo único que le importa a quien nunca ha entrenado: **qué hago hoy y cómo empiezo.**

Quien ya entrena tiene ese orden aprendido y no le molesta — por eso los 7 activos están felices y
no vemos quejas. Quien no ha entrenado nunca no llega al final de la primera pantalla.

---

## 5. Camino propuesto (para decidir con las maquetas)

**Variante A — la actual.** Base de comparación.

**Variante B — «Empezar primero».** El bloque del entreno de hoy sube al tope, con un botón
**EMPEZAR** grande y visible sin desplazar. El ánimo se pregunta **después** de tocar empezar (donde
sigue sirviendo para adaptar la rutina) y se puede saltar. Todo lo demás (hábitos, coach, racha,
comunidad) baja. Es el patrón de Hevy aplicado sin renunciar al plan del coach.

**Variante C — «Primera vez».** Solo para quien tiene CERO entrenos: una pantalla única de
bienvenida —«Tu plan está listo. Hoy: Full body A · 4 ejercicios · ~35 min»— con un botón y nada
más; el resto de tarjetas aparece a partir del segundo entreno. Es la más agresiva contra la
fricción y la que más se parece a lo que recomienda la literatura de activación.

Los tres defectos concretos del §2 (jerga `peso_reps`, banner encima del campo, jerarquía de
«+ Nueva rutina») se corrigen en cualquiera de los caminos: no dependen de la variante.

**Maqueta comparable:** `docs/preview-primera-sesion.html` — se abre en el celular y se comparan las
tres, una al lado de la otra, sin tocar la app.

---

## 6. Lo que este estudio NO responde

- **Por qué no volvieron los 7 que sí entrenaron alguna vez.** Es otra pregunta (retención, no
  activación) y merece su propio estudio con los datos de cuándo abandonaron.
- **Si instalaron la app como PWA.** No se puede saber: la app no registra el estado de instalación.
  Vale la pena registrarlo — convierte «no sé» en dato para el coach.
- **La auditoría del resto de la interfaz** (Fase 2, ya aprobada por el PO): las 6 pantallas del
  asesorado y los 6 paneles del coach, coherencia, jerarquía, densidad y tono.
