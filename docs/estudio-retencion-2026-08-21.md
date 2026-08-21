# Estudio de retención y engagement de AVI — 2026-08-21

Encargo del PO. **Dos fuentes: los datos reales de producción (backup del 21-ago, 24 filas) y la
literatura.** Todo lo que dice «medido» sale de correr las funciones puras de la app sobre las filas
reales; lo que sale de la literatura va con su cita.

Scripts efímeros (fuera del repo, en el scratchpad de la sesión): `embudo.js`, `embudo2.js`,
`primeros28.js`.

---

## 1. El embudo, medido

| Etapa | Personas | % del total | % de la etapa anterior |
|---|---|---|---|
| En la base | 24 | 100% | — |
| Tiene rutina asignada | 23 | 96% | 96% |
| **Empezó al menos 1 entreno** | **16** | **67%** | **70%** ← 🔴 |
| Terminó su primer entreno | 14 | 58% | 88% |
| Llegó a 4 entrenos | 10 | 42% | 71% |
| Llegó a 12 entrenos | 6 | 25% | 60% |
| Activo últimos 28 días | 10 | 42% | — |

🔴 **La fuga grande está en un solo escalón: 23 → 16.** Siete personas tienen rutina y **nunca
empezaron una sola sesión**, llevando entre **12 y 70 días** en la app. Es el 30% de la base perdido
antes de que ninguna otra cosa de la app llegue a importar.

Todo lo que viene después funciona razonablemente: de los que empiezan, el **88% termina** su primer
entreno; de esos, el **71% llega a cuatro**.

---

## 2. El hallazgo que manda: los primeros 28 días

La literatura más pertinente que encontré es un estudio de cohorte de **389.481 usuarios de una app
de entrenamiento de fuerza** (100.709 principiantes). Su conclusión principal:

> **La frecuencia de entrenamiento durante los primeros 28 días es el predictor más fuerte de
> permanencia a largo plazo.** Por cada desviación estándar más de días activos en ese primer mes,
> el riesgo de abandono cae un **27% en la semana 11**. La mediana de abandono es de **19 semanas**;
> a los 12 meses sigue el **10,1%** de los principiantes.

**Lo probé contra tus 20 personas con más de 28 días de antigüedad, y se reproduce:**

| Días entrenados en su primer mes | Personas | Siguen activos | Entrenos totales (media) |
|---|---|---|---|
| 0 días | 8 | **13%** | 0,1 |
| 1-3 días | 6 | 50% | 6,8 |
| 4-7 días | 2 | 50% | 19,5 |
| **8 o más días** | **4** | **100%** | **40,5** |

**Los cuatro que juntaron 8+ días activos en su primer mes siguen todos entrenando, con 40 sesiones
de media.** Los ocho que no entrenaron ni un día están fuera, salvo uno.

⚠️ **Honestidad sobre esta tabla:** n=20, y hay algo de circularidad (entrenar mucho al principio y
seguir activo no son independientes del todo). Lo que la sostiene no es mi muestra, es que **el
mismo patrón aparece en 389.481 personas** con métodos que sí controlan eso.

**Consecuencia operativa:** el objetivo de los primeros 30 días de un asesorado no es «que le guste
la app». Es un número: **8 días entrenados.**

---

## 3. La ventana es de días, no de semanas

- De los 16 que arrancaron, la **mediana hasta el primer entreno es 1 día**; 5 lo hicieron el mismo
  día del alta.
- De los 7 que no arrancaron, ninguno lo hizo nunca — llevan **12, 46, 46, 60, 65 y 70 días**.

**Nadie arranca tarde.** O entrenan en los primeros días o no entrenan nunca. Eso convierte las
primeras 48 horas en el momento de mayor palanca de todo el producto.

---

## 4. De dónde vienen: la diferencia es de 23×

| Origen | Personas | Entrenos terminados | Activos (28 d) |
|---|---|---|---|
| **Creados por el coach** | 10 | **186** | 7 |
| Auto-registrados | 12 | **8** | 2 |

Doce personas se registraron solas y entre todas juntaron **ocho** entrenos. **Seis de los siete que
nunca empezaron son auto-registrados**, y seis de esos siete **no dejaron teléfono y nunca
escribieron un mensaje**: el coach no tiene forma de alcanzarlos.

✅ **Esto ya está parcialmente arreglado:** el teléfono obligatorio en el registro entró en v418
(31-jul) y funciona — la única alta posterior (9-ago) sí lo dejó. Las seis huérfanas son de junio y
julio.

---

## 5. El techo de todo: 13 de 22 son inalcanzables

**Sin suscripción a notificaciones y sin teléfono guardado: 13 de tus 22 asesorados.** Ninguna
campaña, recordatorio o mejora de producto llega a esa gente. Es el límite duro de cualquier plan
de retención que se escriba.

Incluye a personas que **sí entrenan**, como Miguel Pulido.

---

## 6. Lo que hacen distinto los que siguen

| | Activos (9) | Inactivos (4) |
|---|---|---|
| Días con agua registrada | **5,9** | **0,0** |
| Días con pasos | 3,2 | 0,0 |
| Mensajes con el coach | 8,4 | 2,3 |
| Con plan de nutrición | 8 de 9 | 1 de 4 |

⚠️ **Correlación, no causa, y la dirección es probablemente la contraria**: quien entrena también
registra agua. No se puede concluir «hazles registrar agua y se quedarán».

💡 **Lo que sí es accionable es el uso como TERMÓMETRO**: los cuatro inactivos tienen **cero** días
de agua y cero de pasos. Es una señal temprana y gratuita — se apaga antes que el entreno.

Y la **cadencia** sí discrimina fuerte: los cinco que más entrenan tienen un **hueco mediano de 1
día** entre sesiones. Los que se están apagando: 3, 4, 5 y 23 días.

---

## 7. Dos cifras que yo mismo di mal, corregidas

1. **«23% de entrenos abandonados» está inflado.** De las 74 sesiones sin finalizar, **23 llegaron
   al 75-99%** y 13 de ellas son posteriores a v367 — de **las personas más activas** (Natalia ×4,
   Andrés ×4, Valery ×2, Samuel ×2), con marcadores como 17/18, 25/26 y 27/28 series. **Eso no es
   abandono: es gente que hizo el entreno y no pulsó «Finalizar».** El abandono temprano real
   (0-25%) son 19 sesiones.
2. **194 de las 322 sesiones no tienen `finishedAt`** porque el campo llegó en v367 (13-jul).
   Cualquier medida de «abandono» que lo use como oráculo sobre datos anteriores miente.

---

## 8. Cómo estás contra la industria (con el matiz por delante)

Los benchmarks públicos dan para apps de fitness un **8-12% de retención a 30 días**, con los
mejores en **25%**. AVI está en **42% a 28 días**.

⚠️ **No es comparable y no conviene creérselo:** esas cifras son de apps de consumo que captan
usuarios de una tienda; las tuyas son de personas **reclutadas por un entrenador que las conoce**, y
son 24. La comparación no dice «AVI es 4 veces mejor que la industria»: dice **que el coach humano
es el activo**, que es exactamente lo que concluyó el estudio de Fitia/MyFitnessPal del 12-ago.

Y encaja con la evidencia: los nudges automáticos retienen bien 30-60 días, pero para 3-12 meses
**el acompañamiento humano rinde más**; comprometerse con otra persona sube un **65%** la
probabilidad de cumplir un objetivo, y **95%** si hay revisiones periódicas agendadas.
**Lo que manda es la frecuencia y la calidad del contacto, no el canal.**

---

## 9. Qué haría, por orden de palanca

### 🥇 1. Un objetivo operativo por persona nueva: **8 días en su primer mes**
No es una idea, es el número que sale de tus datos y del estudio. Hoy nadie lo mira.
**Producto:** una fila en el panel del coach con «días entrenados de sus primeros 28» para cada
asesorado nuevo, y un aviso cuando va por debajo del ritmo. Es dato que ya existe (`history`).

### 🥈 2. La regla de las 48 horas
Nadie arranca tarde. **Si a las 48 h del alta no ha empezado, el coach lo llama.** Después de la
primera semana, el dato dice que ya no vuelve.
**Producto:** avisar al coach al día siguiente del alta si hay rutina y cero sesiones. Barato
(`clientAttentionRank` ya ordena por atención; es un tier más).

### 🥉 3. Cerrar la puerta que capta y no activa
12 auto-registrados → 8 entrenos → 2 activos. **Decisión tuya**, y hay tres opciones honestas:
(a) quitar el auto-registro y que todo asesorado entre por ti; (b) dejarlo pero que su alta te
**avise** para contactarlo en 48 h; (c) dejarlo como canal de captación aceptando que su conversión
es ~17%. Yo recomiendo **(b)**: conserva el canal y le pone encima lo único que funciona, que eres tú.

### 4. Recuperar a los 13 inalcanzables
No es de producto: es de teléfono. Pedirles el número por el canal que sea. Mientras estén así,
**ninguna feature les llega**.

### 5. Que «Finalizar» deje de perderse
13 sesiones de tus mejores asesorados quedan sin cerrar. Ensucia tus estadísticas y, desde v483,
también los récords. Arreglo posible: al 100% de las series, cerrar sola o preguntar.

---

## 10. Lo que NO haría

- **Rachas y gamificación agresiva.** El descuento por adherencia ya se eliminó el 6-jul por poca
  recepción. Con 24 personas y un coach que las conoce, el refuerzo humano rinde más.
- **Más notificaciones.** 13 de 22 no las pueden recibir, y la evidencia dice que una notificación
  que se descarta no es acompañamiento.
- **Copiar la IA de Fitia/MyFitnessPal.** Ya está estudiado y descartado el 12-ago: gastan fortunas
  simulando lo que tú tienes de verdad.
- **Optimizar la retención de los que ya están.** Los activos entrenan con hueco mediano de 1 día:
  ahí no hay problema que resolver. El problema está antes del primer entreno.

---

## Fuentes

- Predictors of long-term resistance exercise adherence — Frontiers in Sports and Active Living,
  2026 (n=389.481): https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1855668/full
- Health & Fitness App Benchmarks — Business of Apps: https://www.businessofapps.com/data/health-fitness-app-benchmarks/
- Mobile App Retention Benchmarks by Industry — UXCam: https://uxcam.com/blog/mobile-app-retention-benchmarks/
- Fitness App Retention: What Top Apps Do Differently — productgrowth.in: https://productgrowth.in/insights/healthtech/fitness-app-retention/
- Estudio interno previo de competencia: `docs/estudio-fitia-mfp-2026-08-12.md`
