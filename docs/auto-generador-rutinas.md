# Auto-Generador de Rutinas — Plan (Paso 1)

> **Objetivo de negocio:** escalar el tiempo del coach. Que la app arme un **borrador
> completo de la semana** a partir del perfil del asesorado, para que Andrés solo
> **ajuste** en vez de construir desde cero. El mismo motor alimentará después el
> **modo libre / embudo gratis** (Paso 2).

**Estado:** ✅ **Paso 1 implementado (2026-05-30).** Motor puro `generarRutinas()` en
`apex-core.js` (testeado, 18 tests en `apex.test.js` §7-8) + UI: botón **✨ Generar semana**
en el detalle del asesorado → modal de preview → el coach confirma y ajusta en el editor.
Pendiente: §3.5 (etiquetar `tier` en los 96 ejercicios — lo soporta como opcional, hoy inerte)
y Paso 1b (progresión/deload).

---

## 0. Principio rector

El generador produce un **BORRADOR, no la versión final**. El coach **siempre revisa
y aprueba**. Esto es innegociable por seguridad — un algoritmo no conoce la rodilla
operada de Miguel ni su dolor lumbar (lección del incidente real con Laura, la fisio).

El valor no es "quitar al coach", es que el coach pase de **armar a mano** (lento) a
**aprobar/tweakear** (rápido) → atiende 3-4x más asesorados en las mismas horas.

---

## 1. Entradas (ya existen en el perfil del cliente)

`sex` · `age` · `level` (Principiante/Intermedio/Avanzado) · `days` (días/sem) ·
`goal` (Perder grasa / Ganar músculo / Recomposición) · `notes` (limitaciones).

---

## 2. Lógica de generación

### 2.1 Estructura (split) según días + sexo
Prioridad por sexo (regla de Andrés): **mujeres → glúteo y piernas primero**;
**hombres → tren superior y fuerza**.

| Días | Mujer | Hombre |
|------|-------|--------|
| 3 | Glúteo+Piernas A / Tren Superior / Glúteo+Piernas B | Empuje / Tracción / Pierna |
| 4 | Glúteo+Piernas A / Tren Superior / Glúteo+Piernas B / Core+Cardio | Empuje / Tracción / Pierna / Tren Superior |
| 5 | Glúteo+Piernas A / Tren Sup. / Glúteo+Piernas B / Empuje/Brazos / Core+Cardio | Empuje / Pierna / Tracción / Hombros+Brazos / Cardio+Core |
| 6 | PPL-Glúteo x2 | Empuje/Pierna/Tracción x2 |

- **Principiante puro:** sustituir por **Full Body** (3 días) con máquinas/guiados.
- **< 16 años:** SIEMPRE Full Body con máquinas y peso corporal, **sin carga axial**
  (nada de sentadilla/peso muerto con barra).

### 2.2 Slots por día (plantilla de huecos a llenar)
Cada "día" es una lista de slots `{muscle, type, n}`. Ejemplos:
- **Empuje:** 2× (pecho, Compuesto) · 1× (hombros, Compuesto) · 1× (pecho, Aislamiento) ·
  1× (hombros, Aislamiento) · 1-2× (triceps, Aislamiento)
- **Pierna (hombre):** 2× (piernas, Compuesto) · 1× (piernas, Funcional) ·
  2× (piernas, Aislamiento) · 1× (gluteo, Aislamiento) · 1× (core)
- **Glúteo+Piernas A (mujer):** 2× (gluteo, Compuesto) · 1× (piernas, Compuesto) ·
  1× (gluteo, Aislamiento) · 2× (piernas, Aislamiento) · 1× (core)

Hay pool de sobra para variar (piernas 17 · espalda 14 · glúteo 12 · pecho 10 ·
triceps 8 · cardio 8 · core 9 · biceps 5 · hombros 7).

### 2.3 Selección dentro de cada slot
Filtrar `ax_e` por `muscle` + `type` **y por `tier`** (ver §3.5), elegir sin repetir,
**rotando** para que A y B de un mismo grupo no salgan idénticos. Excluir avanzados
para principiantes (ej. e69 Clean & Press ⚠️).

### 2.4 Sets / reps / descanso por objetivo (regla de Andrés)
| Objetivo | Series | Reps | Descanso | Extra |
|----------|--------|------|----------|-------|
| Perder grasa | 3-4 | 12-15 | 45-60s | + Cardio/HIIT al cierre |
| Ganar músculo | 3-4 | 8-12 | 90s | — |
| Recomposición | 3-4 | 10-15 | 60-75s | + core |
| Fuerza (avanzado) | 4-5 | 5-8 | 120s | compuestos pesados |

Principiante → tope 3 series. Intermedio/Avanzado → 4.

### 2.5 Orden dentro de la rutina (regla de Andrés)
**Compuesto → Funcional → Aislamiento → Cardio/Core al final.** Ordenar el array
`exercises` antes de guardar.

### 2.6 Enriquecimiento de ejercicios (CRÍTICO)
Cada ejercicio copiado a la rutina DEBE llevar `id, icon, name, muscle, type, sets,
reps` tomados de `ax_e`. Si falta `icon`/`muscle`, los íconos se rompen (ya pasó 2
veces). Ver modalidades: `type` define la modalidad de seguimiento (reps/peso/tiempo/
cardio/hiit) vía `exTrack()`.

---

## 3. Seguridad y limitaciones físicas (lo que hizo Laura, codificado)

1. Parsear `notes` por palabras clave: `rodilla, menisco, lumbar, espalda baja, hombro,
   lesión, operad, postoperatorio, hernia, tendón`.
2. Si hay match:
   - **Excluir** ejercicios contraindicados (mapa por zona).
   - **Preferir** variantes seguras.
   - Poner **⚠️ en la nota** de la rutina con la precaución.
   - Marcar la rutina como **"⚠️ REVISAR — limitación detectada"** y mostrar banner;
     el coach NO la aprueba sin mirar.

**Mapa de exclusiones por zona (semilla, ampliable):**
| Zona | Fuera | Preferir |
|------|-------|----------|
| Rodilla | sentadilla libre profunda, saltos/impacto, zancadas pesadas | prensa 0-90°, sentadilla goblet, hip thrust, abducción cadera |
| Espalda baja / lumbar | peso muerto convencional pesado, remo libre inclinado | RDL con mancuernas liviano (patrón), remos sentados/apoyados, dead bug, plancha |
| Hombro | press tras nuca, fondos profundos | press neutro, elevaciones controladas |

> El modo libre (Paso 2) usará esto como gancho de conversión:
> *"¿Tienes alguna lesión? Mejor que un coach te arme esto → [Hablar con coach]"*.

---

## 3.5 Biblioteca por niveles (free vs premium)

Cada ejercicio lleva `tier: 'free' | 'premium'` (default `premium`). El generador y el
selector de ejercicios **filtran por el tier del usuario**.

- **Free (~35-40 ejercicios):** los fundamentales seguros y con equipo flexible
  (peso corporal, mancuernas, máquinas básicas). Debe alcanzar para entrenar **completo
  y seguro** todos los grupos musculares en solitario — 1 compuesto principal +
  aislamientos básicos por grupo + core y cardio básicos.
- **Premium (resto):** variantes **avanzadas** (olímpicos como Clean & Press),
  **especializadas**, dependientes de máquina específica, de **rehabilitación/limitación**
  (las que usa Laura: prensa con protocolo, técnica de bisagra, etc.) y aislamientos finos.

**Doble beneficio:**
1. Monetización: el coach (premium) desbloquea la biblioteca completa **y** la personaliza.
2. Seguridad: el modo libre **no puede prescribir** ejercicios avanzados/de rehabilitación
   a un usuario desconocido — encajan en premium, que siempre pasa por criterio de coach.

**Regla de oro:** el moat es el **coach**, no la cantidad de ejercicios. Free entrena
completo; premium = biblioteca total + el humano que elige y adapta por ti.

**Gancho de conversión (modo libre):** mostrar los ejercicios premium **bloqueados**
(🔒 "Disponible con coach") en lugar de esconderlos → el candado vende.

**Pendiente de Andrés:** confirmar el criterio del split y etiquetar `tier` en los 93
ejercicios (se propone tag automático por el criterio de arriba + revisión manual del coach).

## 4. UX / Flujo

- Botón **"✨ Generar rutina automática"** en: (a) detalle del asesorado y
  (b) al terminar de crear un asesorado nuevo.
- Genera el borrador → **preview de los N días** → el coach revisa, ajusta en el
  constructor existente (`m-routine`) y guarda.
- Badge **"Generada — sin revisar"** hasta que el coach la edite/confirme.
- Banner de seguridad si se detectó limitación en `notes`.

---

## 5. Implementación técnica

- Función **pura** `generarRutinas(cliente, ejerciciosLib)` → devuelve `routines[]`.
  Vanilla JS, sin dependencias (cabe en `index.html`).
- **Vive en `apex-core.js`** (la fuente testeable) → cubierta por `apex.test.js`.
- Splits, slots y mapas de exclusión como **objetos de config** (fáciles de tunear
  sin tocar la lógica).
- Usa `DB.exercises` en memoria. Guarda en `client.routines` vía `sv('ax_c', DB.clients)`.
- Reemplaza/formaliza el viejo `crear_rutinas.py` (estaba en Temp) dentro de la app.

---

## 6. Pruebas (apex.test.js)
Para cada combinación (sexo × nivel × días × objetivo) verificar:
- nº de días = `days`; orden de tipos correcto; sets/reps acordes al objetivo;
- **todos** los ejercicios con `id+icon+muscle+type`; sin duplicados en un día;
- exclusiones por limitación aplicadas y nota ⚠️ presente cuando hay limitación;
- `< 16` nunca recibe carga axial con barra.

---

## 7. Alcance de Paso 1 (qué NO incluye)
- ❌ Progresión automática semana a semana (sub-paso 1b — usa el historial/PRs).
- ❌ Modo libre / onboarding público (Paso 2).
- ❌ Cambios de marca o de cobro.

## 8. Métrica de éxito
- Tiempo para dejar lista la rutina de un asesorado nuevo: de ~minutos a mano →
  generar + ajustar en < 2-3 min.
- ≥ 80% de los ejercicios generados se aprueban **sin cambio**.

---

## 9. Roadmap premium (después de Paso 1)

> Estas son funciones **premium** (justifican el pago). Principio que se mantiene en
> todas: con coach, el motor **sugiere y el coach aprueba** (no se auto-aplica a sus
> espaldas, por control y seguridad — lección Miguel). En modo libre sí puede auto-aplicar.

### Paso 1b — Motor de progresión y semana de descarga (deload)
Lee el historial (ya hay `totalVol` por sesión, PRs y tendencia por ejercicio):
- **Progresión:** por ejercicio, según la tendencia → subió: sugerir +peso/+rep;
  estancado: mantener o variar; bajó: revisar/bajar. Sugerencia al coach (o auto en libre).
- **Deload:** detectar cuándo toca semana de descarga, por **ciclo** (cada ~8 semanas de
  entreno acumulado, configurable) **o por métricas** (estancamiento/regresión sostenida o
  caída de volumen). Genera versión deload de las rutinas (volumen/intensidad −40-50%).
- Requiere: contador de ciclo por cliente (se infiere de las fechas de sesión en `ax_hist`).
- **Disparador del deload (DECIDIDO): AMBOS** → fijo cada **8 semanas** de entreno
  acumulado **y** adelantable automáticamente si las métricas muestran estancamiento/
  regresión sostenida. El motor lo **propone**; el coach **aprueba**.

### Métodos de intensidad (premium) — drop set, superserie, rest-pause, tempo…
- Campo `method` en el ejercicio dentro de la rutina + UI de registro acorde
  (ej. un drop set registra varios pesos en una misma "serie").
- Premium-only (técnica avanzada, requiere criterio de coach).
- **Realista:** empezar simple (etiqueta del método + instrucción en la nota), y después
  el registro completo por método. La UI de registro varía por método — no subestimarla.

### Reportes / Analítica (premium)
- **Gráfico:** el motor SVG por ejercicio YA existe (`renderProgressPanel`, sparklines).
  Trabajo = **presentación**: mostrar la curva de avance, no solo el texto "estable/subió/
  bajó". Bajo costo.
- **Exportar PDF del reporte** del asesorado (historial + gráficos). **DECIDIDO:**
  **vista imprimible + "Guardar como PDF"** del navegador (multipágina, profesional) —
  con un stylesheet `@media print` dedicado. ❌ NO meter jsPDF ni dependencias.

### Paso 2 — Modo libre gratis
Montado sobre el motor ya probado + biblioteca `tier` (§3.5) + ganchos de conversión a coach.

---

## 10. Secuencia recomendada
1. **Paso 1** — auto-generador (escala tiempo ya).
2. **Paso 1b** — progresión + deload (usa el historial; alto valor premium).
3. **Reportes** — gráfico visible + PDF (barato, el motor ya existe; gran percepción de valor).
4. **Métodos de intensidad** — pulido premium.
5. **Paso 2** — modo libre / embudo.

> Progresión, deload y auto-ajuste **dependen de leer bien el historial** → tiene sentido
> hacerlos juntos (1b) y justo después del generador.
