# Briefing 2 · Laura · embarazo por estándar y alerta cardíaca (5-nov-2026)

Sigue a tu dictamen de esta mañana (`docs/poblaciones-2026-11-05/laura.md`). El PO decidió tus 🟡:

> «No preguntes nada de posparto o diástasis, eso en caso de que el usuario lo nombre. El tema del embarazo
> igual si el usuario lo nombra según estándares o reglamentos para esas etapas. El tema de palpitaciones sí
> recomendar de una vez valoración por profesionales de la salud y listo; el resto tus recomendaciones.»

O sea:
- **Q7 (casillas en el registro): NO.** La app solo lee lo que la persona ESCRIBE en su nota. Tu regla de la
  «población invisible» sigue siendo el escudo (dead bug y `we5` se quedan donde dijiste).
- **Embarazo: SÍ a la lista**, aplicada «según estándares» cuando la persona lo nombra. La escribes tú.
- **Síntomas cardíacos: SÍ**, solo aviso: recomendar de una vez valoración por un profesional de la salud, sin
  quitar ningún ejercicio.
- Todo lo demás de tu dictamen se programa tal cual (las 3 claves, las listas, los textos, el mínimo de 8
  repeticiones, la vigencia y los 14 candados menos el 10, que era el registro).

## E1 · La lista del ENTRENO para embarazo
Ya decidiste que `embaraz` entra en `core_central` (abdomen, impacto, lastres) y que nace la bandera `lim.embarazo`.
Falta lo que `core_central` NO cubre y el estándar sí (ACOG 2020 n.º 804, SOGC/CSEP 2019, guías de la OMS 2020,
o las que tú consideres vigentes; cita cuál usas en cada punto):
- Posición **boca arriba** sostenida (después del primer trimestre) y **boca abajo**.
- Riesgo de caída o de golpe en el abdomen, equilibrio, Valsalva / cargas máximas, calor.
- Cualquier otra cosa del estándar que se pueda leer por NOMBRE.
Entrega una zona nueva `embarazo` para `GEN_ZONE_EXCL` (regex contra el nombre normalizado, sin lookbehind) y, si
el nombre no delata la posición (p. ej. un press de banca es boca arriba sin decirlo, el hip thrust apoya la
espalda alta, el curl femoral puede ser tumbado), una lista `GEN_EXCL_IDS.embarazo`. **Medida contra los 375**
(`defaultExercises`), con cuántos caen, la lista, y los CONTROLES de lo que NO cae (lo que es bueno en el
embarazo: caminar, bici, elíptica, sentadilla con peso moderado, remos sentado, etc.).

**Decide además:** la app NO sabe en qué trimestre va. ¿La lista se aplica desde que lo nombra (lado seguro), o
hay una forma honesta de leer el trimestre de la nota («12 semanas», «primer trimestre», «3 meses»)? Si propones
leerlo, con su regex y sus controles; si no, dilo y por qué.

## E2 · El calentamiento para embarazo
Lista por id para `WARMUP_ZONE_EXCL_IDS.embarazo` (piezas boca arriba y boca abajo, o que el estándar desaconseje)
y **vuelve a barrer las 12 recetas** como esta mañana: qué pieza ASCIENDE con `embarazo` sola y con
`embarazo + core_central` (siempre irán juntas), que ninguna receta quede sin bloque general ni sin movilidad, y
que `wg1`/`wg2` no caigan.

## E3 · Los textos de embarazo
Tu Q4 ya trae el aviso obligatorio (cliente y coach). Revísalo con la lista nueva: ahora la app SÍ quita la
posición boca arriba y boca abajo, así que la frase del coach «NO controla la posición boca arriba ni boca
abajo» deja de ser cierta. Dame: `GEN_ZONE_LABEL.embarazo`, `GEN_ZONE_QUITA.embarazo`, la `{PARADA}` (las
señales del estándar para detenerse: sangrado, contracciones, pérdida de líquido, mareo, dolor de cabeza, dolor
en el pecho, falta de aire ANTES del esfuerzo, dolor en la pantorrilla…), y el aviso al coach.

## E4 · La alerta cardíaca (solo aviso, decisión del PO)
Gemela de `GEN_NERVE_RE` (`avi-core.js:420`), pero que **dispare sola** (no exige otra limitación detectada,
como sí exige la del nervio). Entrega:
- La regex, con CONTROLES de falsos positivos medidos (al estilo de tu Q1): «palpitaciones», «se me acelera el
  corazón», «me desmayé», «desmayo», «dolor/presión en el pecho al hacer ejercicio», «me falta el aire»,
  «mareo». Controles: «frecuencia cardíaca en reposo», «pecho» como músculo («quiero sacar pecho», «dolor de
  pecho por el press» = músculo, no corazón: ¿cómo lo separas?), «me ahogo de la risa», etc.
- El texto al coach y el texto a la persona que se registró sola. El PO pidió: **recomendar de una vez la
  valoración por un profesional de la salud**, y nada más. Sin «no te preocupes», sin plazos, sin diagnosticar.
- ¿Se relaciona con la clave `presion`? (p. ej. si escribe «arritmia» ya cae en `presion`; ¿también dispara la
  alerta?). Decide.

## Cómo trabajar (igual que esta mañana)
- Mide con el código real (`node -e "const c=require('./avi-core.js'); ..."`), con las tablas nuevas SOLO en
  memoria. Cada cifra con su unidad y su control.
- **Solo lectura.** No edites código, no hagas commits, no corras matrices de sabotaje, no abras navegador, no
  toques Supabase. El orquestador está programando en paralelo las 3 claves de esta mañana: si `avi-core.js`
  cambia mientras mides, vuelve a cargarlo; tus tablas nuevas siempre en memoria.
- Escribe en `docs/poblaciones-2026-11-05/laura-embarazo.md`. Crea el archivo al empezar y **guarda cada
  pregunta al cerrarla**. Cierra con «Qué NO miré y por qué» y los candados que exiges en la suite.
- En español, claro, sin nombres reales de asesorados.
