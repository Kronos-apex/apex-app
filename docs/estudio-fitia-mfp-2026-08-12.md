# 🔬 Estudio de competencia — Fitia y MyFitnessPal (2026-08-12)

> Encargo del PO: *«un estudio a Fitia y a MyFitnessPal para ver qué funciones, qué interfaz y qué
> detalles podemos traer a AVI, que ellas dominan el mercado»*.
> Versión visual publicada como artefacto:
> https://claude.ai/code/artifact/be3e92e1-2da4-4b80-a8da-b266f1e72876
> **Fuentes:** fichas oficiales de App Store (capturas leídas una a una), centro de ayuda de Fitia,
> soporte de MyFitnessPal, reseñas independientes. Nada de esto viene de memoria del modelo.

---

## TESIS

**AVI no puede ganarles en base de datos ni en IA, y no necesita hacerlo.** Fitia declara 10 M+
usuarios y ~1 M de alimentos; MyFitnessPal tiene el catálogo más grande del mundo.

**Pero las dos están gastando fortunas en SIMULAR lo que AVI tiene de verdad: un entrenador humano.**
El «Fitia Coach» y el «Coach» de MyFitnessPal son chatbots. AVI tiene a Camilo. Ese es el foso, y se
defiende, no se imita.

**Lo que sí hay que copiar es la mecánica del día a día**, donde llevan diez años de ventaja.

---

## LO QUE SON, EN FRÍO

### Fitia (Perú · LATAM · 10 M+ · 4,9★)
Planificador de comidas con base de datos **localizada por país** y validada por nutricionistas de
casa. **Es el competidor directo del terreno de AVI.**
- **Gratis:** calorías y macros personalizados · escáner de códigos · registro por texto ·
  registro de peso · **tope de 4 comidas al día**.
- **Premium:** el **plan de comidas automático**, planificador, recetas, **lista de compras**,
  tipos de dieta, registro por foto y por voz, crear alimentos con IA, ajustes automáticos,
  Fitia Coach 24/7, ayuno intermitente, progreso completo (fotos/medidas/grasa), sin anuncios.

### MyFitnessPal (EE. UU. · global)
El diario de comidas más grande del mundo. Free / **Premium US$79,99 año** / Premium+ US$99,99.
- **Gratis:** registro escribiendo, y poco más.
- 🔴 **El escáner de códigos YA NO ES GRATIS** — lo movieron a Premium y es su queja más repetida.
- **Su costura:** el catálogo lo escriben los usuarios **sin validar**; un estudio de 2024 le
  encontró *«validez pobre»* en energía, carbohidratos y proteína. El rediseño de 2026 molestó a su
  base por la cantidad de publicidad.

---

## LO QUE SE VE EN SUS PANTALLAS (observado en las capturas oficiales)

**Fitia:** tira de 7 días arriba con **puntos de color** por adherencia · racha (🔥 213) junto al
avatar · las kcal como **RANGO con banda y ✓ verde** (`2.004 / 1.986`, banda 1.787–2.185) · 3 macros
con barras (amarilla si no llega) · las comidas con **un check por alimento** y emoji · «Score
Nutricional» 0-100 en anillo con consejo accionable · registro por Foto / Voz / Lista / Cód. Barras.

**MyFitnessPal:** barra inferior de 5 (Today · Plan · Progress · Coach · **+** flotante) · fila de 7
días con círculos ✓ y contador de racha · **«976 cal / 2.074 — 1.098 left»** (enfatiza lo que QUEDA)
· macros con un color distinto cada uno · **escudo verde de «verificado» por alimento** · el escaneo
de plato deja **editar y borrar ítems ANTES de guardar** · sección GLP-1 (Ozempic).

---

## LO QUE HAY QUE TRAER (ordenado por impacto ÷ costo)

| # | Patrón | De | Esfuerzo | Por qué |
|---|---|---|---|---|
| 1 | **El plan se MARCA, no se re-escribe** | Fitia | medio | Hoy plan y registro son dos mundos: 3-5 anotaciones al día. **Medido: el vaso de agua, que es UN toque, lo usan 6 de 24.** Un toque por comida, y le da al coach adherencia REAL en vez de autoreporte. |
| 2 | **El objetivo es una FRANJA, no una cifra** | Fitia | bajo | Hoy AVI muestra el número exacto y cualquier desvío se lee como error. Nuestros márgenes son ±10% y están medidos: la franja es **más honesta y menos castigadora**. Los topes ya existen en el código. |
| 3 | **La semana entera en una fila** | ambas | bajo | AVI ya calcula adherencia y rachas (las usa el panel del coach) pero el asesorado no las ve. Es sacar a la superficie un dato que ya tenemos. |
| 4 | **La lista del mercado, salida del plan** | Fitia | medio-bajo | **Fitia COBRA por esto y AVI ya tiene todo lo necesario**: genera los 7 días, sabe cada alimento y cada gramo. Es sumar y agrupar. La mejor relación impresión/costo de la lista. |
| 5 | **El sello de «revisado», bien visible** | MFP | muy bajo | **AVI ya va por delante** (F6, la cola del coach). Falta enseñarlo: el verde de «revisado por tu coach» tan claro como el aviso de lo que no lo está. Y aquí el que revisa **no es un moderador anónimo: es su entrenador**. |
| 6 | **Decir lo que QUEDA, no lo que llevas** | MFP | mínimo | El número que sirve para decidir la próxima comida. Combina con el 2: la franja dice si vas bien, «te quedan» dice qué hacer ahora. |

---

## LO QUE NO HAY QUE COPIAR (con razones, no por prudencia)

1. 🔴 **La foto del plato con IA.** Rompe las tres restricciones del proyecto (sin dependencias,
   offline, un solo archivo), cuesta por foto, y sus propias reseñas dicen que exige corregir a mano
   casi siempre. **El escáner de códigos ya resuelve el mismo problema sin ninguna de esas facturas.**
2. 🔴 **El coach de IA 24/7.** Las dos gastan millones en imitar a un entrenador real. AVI tiene uno.
   Un chatbot en medio **diluye lo único que la hace distinta** y le quita conversaciones a Camilo.
3. 🟡 **La puntuación nutricional con micronutrientes.** Se ve muy bien, pero nuestra tabla no tiene
   micros y meterlos exige fuente confiable para cada uno. Un número inventado sobre datos que no
   tenemos es **la clase de error de la yuca**. Se archiva, no se descarta.
4. 🔴 **Cobrar por lo que ya se dio gratis.** MFP movió el escáner a Premium y es su queja nº 1.
   Si algún día hay planes de pago: **se cobra por lo NUEVO**, jamás quitando lo que la gente tenía.
5. 🔴 **Seguimiento de medicamentos (GLP-1 / Ozempic).** Terreno médico, responsabilidad médica.
   Que ellos lo hagan no es un argumento.
6. ⚠️ **Y una trampa suya que casi copiamos:** las dos muestran kcal con precisión de unidad
   («2.004 / 1.986»), transmitiendo una exactitud que ningún plan de comida tiene — las suyas
   tampoco. **Si se trae la estética, que venga con la franja del patrón 2, no sola.**

---

## DÓNDE AVI YA LES GANA

- **Un entrenador de verdad detrás.** El plan lo revisa quien conoce a la persona y sabe qué lesión
  tiene. Ellas cobran suscripción por simularlo.
- **El plan de comida completo, sin pagar.** Lo que Fitia pone tras su muro de pago es justo lo que
  AVI genera para todos, con comida colombiana y medidas de casa.
- **Un catálogo del que uno se puede fiar.** El de MFP lo escriben usuarios sin validar (validez
  pobre, estudio 2024). En AVI lo escaneado nace «sin revisar» hasta que el coach lo aprueba.
- **Entrenamiento y comida en la misma app.** AVI sabe qué entrenó hoy la persona y le ajusta el
  plato al día de pierna. **Ninguna de las dos puede: no tienen la rutina.**

---

## ORDEN PROPUESTO (sin aprobar por el PO)

1. **Marcar el plan como comido** — es el que cambia el producto; todo lo demás se apoya en ese dato.
2. **Franja + «te quedan» + fila de la semana**, en un solo lote (los tres son pantalla, no motor).
3. **La lista del mercado.**
4. ⚠️ **Antes de nada: que el PO pruebe el escáner en su celular.** Sigue siendo lo único sin
   verificar, y el catálogo sigue en **0 productos**.
