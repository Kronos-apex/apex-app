# Briefing · Andrés (Hyp) · la nutrición no sabe de embarazo (5-nov-2026, tarde)

Pedido del PO: *«pásale lo de la nutrición a Andrés»*. Viene del radar de v727: Laura escribió la lista del
ENTRENO para el embarazo (`docs/poblaciones-2026-11-05/laura-embarazo.md`) y dejó escrito: *«Andrés (Hyp):
nutrición del embarazo, antes que cualquier otra cosa de esta lista»*.

## Lo que ya hace la app (en producción desde hoy)
- Lee el embarazo de la NOTA de la persona: `parseLimitations(nota).embarazo === true` (regex `GEN_EMBARAZO_RE`,
  `avi-core.js:387`). No lee el trimestre a propósito (Laura, E1: leerlo solo serviría para relajar, y un lector
  ingenuo se equivoca 6 de 14 veces). Lo aplica desde que se nombra.
- Quita del entreno lo boca arriba/boca abajo, saltos y esfuerzo máximo; avisa que NO es un plan de embarazo y pide el
  visto bueno de su médico u obstetra.

## El hallazgo (medido con el código real, `nutritionEstimate`, `avi-core.js` ~7955)
Mujer de 30 años, 68 kg, 162 cm, actividad 1,55 → gasto (TDEE) **2.142 kcal**.

| Objetivo | Nota | kcal | Proteína | Carbohidrato | Grasa | Rótulo |
|---|---|---|---|---|---|---|
| Perder grasa | «estoy embarazada» | **1.693** | **150 g** (2,2 g/kg) | 136 g | 61 g | «Mínimo seguro para tu cuerpo» |
| Perder grasa | *(sin nota)* | 1.693 | 150 g | 136 g | 61 g | igual |
| Ganar músculo | «estoy embarazada» | **2.492** (+350) | 150 g | 336 g | 61 g | «Superávit de 350 kcal/día (ganancia limpia)» |
| Salud general | «estoy embarazada» | 2.142 | — | — | — | «Mantenimiento calórico» |
| Perder grasa | «postparto, estoy lactando» | 1.693 | — | — | — | «Mínimo seguro…» |

O sea: **la nutrición no lee la nota**. Una embarazada con «Perder grasa» recibe un DÉFICIT de ~450 kcal (lo frena
solo el piso fisiológico), y el texto le dice que es «mínimo seguro para tu cuerpo». Lo mismo una mujer lactando.

**Precedente que ya existe:** la regla de MENORES que dictaste el 5-ago (`docs/dictamen-andres-menores-2026-08-15.md`,
y en código: `isMenor` dentro de `nutritionEstimate` → nunca déficit, se entrega el mantenimiento y el RÓTULO lo dice;
más la banda `nutMinorBandBase`). `nutritionEstimate` es la cuenta ÚNICA que leen seis superficies (habitación de
Nutrición, calculadora del Perfil, prefill de «✨ Generar» del coach, oráculo del editor, compartir por WhatsApp y la
cabecera de valoración del coach en `app-3-coach.js` ~2880); el plato, «Hoy» y la lista del mercado leen `nutBaseFor`
(`avi-core.js` ~9444).

## Preguntas

**N1 · Energía con embarazo.** ¿Qué objetivo calórico corresponde cuando la nota dice embarazo y la persona eligió
«Perder grasa» / «Recomposición»? ¿Y con «Ganar músculo» / «Fuerza» (hoy +350 / +200)? La app NO sabe el trimestre:
tu regla tiene que funcionar sin él (lado seguro). Número exacto, de dónde sale y qué dice el rótulo.

**N2 · Proteína, carbohidrato y agua con embarazo.** Hoy: 2,2 g/kg de proteína en «Perder grasa», piso de 2,0 g/kg
de carbohidrato, ~35 ml/kg de agua. ¿Cambia alguno? ¿Sobre qué peso se dosifica, si el peso SUBE por el embarazo
(`nutRefWeight`)?

**N3 · Postparto y lactancia.** Hoy la app no lee «lactancia» (Laura está decidiendo en paralelo si «lactancia» y
las frases del parto entran como clave, en `docs/poblaciones-2026-11-05/laura-postparto.md`). Para la nutrición: ¿qué
regla necesitas si la app pudiera leer lactancia? ¿Y en el postparto sin lactancia? Dilo condicionado a lo que Laura
decida; no escribas regex de notas (eso es de Laura).

**N4 · El peso durante el embarazo.** La app usa el peso para varias cosas: recalcula el plan con cada pesada (v448),
avisa estancamiento, muestra tendencias y metas de peso. ¿Alguna de esas le diría algo dañino a una embarazada que sube
de peso? Búscalas en el código (`bwLive`, `_coachPesoDe`, mensajes de tendencia o meta de peso) y dime cuáles hay que
apagar o reescribir con embarazo.

**N5 · Los textos.** El rótulo y lo que lee la persona (sin diagnosticar, sin plazos, sin «no te preocupes», sin
prometer que algo es seguro; que remita a su médico u obstetra o a un nutricionista), y el aviso al coach. Exactos.

**N6 · Las superficies.** Confirma que tu regla, puesta donde está la de menores, llega a TODAS las superficies de
arriba (mide: misma persona, mismo número en `nutritionEstimate` y `nutBaseFor`). Si alguna se escapa, nómbrala.

## Cómo trabajar
- Mide con el código real (`node -e "const c=require('./avi-core.js'); ..."`), con tus reglas nuevas SOLO en memoria.
  Cada cifra con su unidad y su control (sin embarazo el número NO debe cambiar).
- **Solo lectura.** No edites código, no hagas commits, no abras navegador, no toques Supabase.
- Lo obstétrico que no sea de tu competencia (nutrición deportiva), márcalo para que lo valide un nutricionista u
  obstetra. Si citas guías (IOM, ACOG, OMS…), di si es de memoria.
- Escribe en `docs/poblaciones-2026-11-05/andres-embarazo.md`. Créalo al empezar y **guarda cada pregunta al
  cerrarla**. Cierra con «Qué NO miré y por qué» y los candados que exiges en la suite.
- En español, claro, sin nombres reales de asesorados.
