# BRIEFING COMÚN — auditoría «LESIONES: LA MATRIZ COMPLETA» (13.ª ronda, 2026-09-25)

Lee este archivo completo antes de hacer nada. Aplica a las 2 áreas (G1, G2).

El encargo del PO se juzga con el criterio de siempre: **«auditorías serias, nada genérico»**. Un informe
lleno de buenas prácticas genéricas se considera FALLIDO aunque esté bien escrito.

---

## Por qué existe esta ronda

Es la única área de AVI donde un defecto **lastima el cuerpo** de alguien. Las rondas anteriores la tocaron
por partes (v424 el filtro de lesiones, v546 codo/muñeca/pecho, v607 isquios, la ronda del calentamiento del
20-sep y la matriz 34×8 de v644), y dejaron escrito lo que falta:
- la del 20-sep (E2): *«`GEN_ZONE_EXCL.rodilla` con "estocada" también filtra ejercicios de ENTRENO; no medí
  si eso genera huecos similares ahí»* — en el calentamiento, lo que ASCENDÍA cuando otra pieza salía no lo
  había revisado nadie (`wc3` le llegó a dos personas con la rodilla dañada);
- la del 1-sep (A4): *«el detector no reconoce esas palabras (codo/muñeca/pecho/cuello/tobillo/cadera)»* y *«no
  corrí el barrido de 40 semillas»*;
- la del 8-sep: *«los presets de rápidos y las plantillas no tienen candado contra `REMOVED_EXERCISES`»*.

| Área | Qué cubre | Quién |
|---|---|---|
| **G1** | **La matriz de seguridad**: las 16 zonas que una persona puede declarar, a qué reglas se traducen, qué quita cada regla del ENTRENO (374 ejercicios, por entorno) y del CALENTAMIENTO (34 piezas), qué ASCIENDE cuando algo sale, dónde el pool queda vacío o casi, y qué casillas necesitan dictamen. | Laura Ospina (fisio, **veredicto vinculante en seguridad**) + Coach Pro |
| **G2** | **Lo que le llega de verdad a cada persona**: las dos puertas de entrada (lo que el coach escribe en las NOTAS y el dolor que la persona REPORTA), todas las superficies que deberían respetarlo (generador, plan del día, calentamiento, sustituto 🔄, plan de choque, entrenamientos rápidos, plantillas), el barrido de semillas, y las personas reales. | Mateo Sanín (Data) + Lucas Ortega (QA funcional) |

---

## El producto (lo mínimo)

AVI es una PWA de entrenamiento (vanilla JS, `index.html` + `app-*.js` + `avi-core.js`) de Camilo Andrés
(«Andrés Martínez» en público), entrenador en Guaduas. Supabase proyecto **`eoebhrxbokyllqalyecj`**. La app
vive en dos direcciones (`kronos-apex.github.io/apex-app/` y `app.avientrena.com`), ambas en **avi-v675**.
Es *offline-first*: `localStorage` manda y sincroniza hacia la nube.

**La regla de oro de esta área (CLAUDE.md, «Seguridad física del asesorado»):** lo que arma el ALGORITMO se
FILTRA; lo que arma el COACH a mano se MARCA (chip) y se confirma — nunca se le desaparece algo en silencio.
Y la lista de qué es contraindicado **la dicta Laura, nunca el código**: el ingeniero verifica que sea
implementable (que cada término atrape lo que dice, que no borre lo terapéutico, que el pool no se vacíe).

---

## MAPA DE LA SUPERFICIE (verificado contra HEAD hoy — nombres verbatim)

`avi-core.js`:
- `GEN_LIMIT_KWS` :365 — las palabras que se buscan en las NOTAS del coach. **Hoy solo 4 zonas: `rodilla`,
  `lumbar`, `hombro` y `generic`.**
- `GEN_ZONE_LABEL` :377 · `GEN_ZONE_EXCL` :420 (regex por nombre, **11 zonas**: rodilla, lumbar, hombro,
  aductor, abductor, cuello, tobillo, isquios, codo, muneca, pecho) · `GEN_EXCL_IDS` :574 (exclusiones por id).
- `WARMUP_ZONE_EXCL_IDS` :817 (**8 zonas**: lumbar, rodilla, hombro, aductor, abductor, cuello, tobillo,
  muneca) · `warmupWarnZones` :843 · `warmupContraindicated` :891.
- `limitationsFor(client, nowTs)` :999 — la ÚNICA puerta: une las NOTAS (`parseLimitations` :1020) y el dolor
  REPORTADO vigente (`painCareActive` :3976, 14 días). `painExclZones(area)` :10153 traduce un área a reglas.
- `PAIN_AREAS` :3734 (las 16 que se pueden declarar) · `generarRutinas` :2136 · `shockPlan` :10510.
- `app-6-extra.js`: `buildWarmup(exercises,limKeys,opts)` :2327. `app-4-entreno.js`: `todaySubstitute(ei)`
  :2439 (el 🔄) · `QUICK_WORKOUTS` :1789 (los rápidos).

---

## BASELINE MEDIDO HOY (25-sep) — créelo, NO lo vuelvas a medir

### Las 16 zonas declarables → a qué reglas van (`painExclZones`, ejecutado en Node)
| Zona que declara la persona | Reglas | Entreno (`GEN_ZONE_EXCL`) | Calentamiento (`WARMUP_ZONE_EXCL_IDS`) |
|---|---|---|---|
| cuello | cuello | sí | sí |
| hombro | hombro | sí | sí |
| pecho | pecho | sí | **no** |
| codo | codo | sí | **no** |
| muñeca o mano | muneca | sí | sí |
| **espalda alta** | **cuello** | sí | sí |
| zona lumbar | lumbar | sí | sí |
| cadera o ingle | aductor + abductor | sí | sí |
| **muslo por delante** | **rodilla** | sí | sí |
| muslo por detrás | lumbar + isquios | sí | lumbar sí, **isquios no** |
| muslo por dentro (aductores) | aductor | sí | sí |
| cara externa del muslo o glúteo | abductor | sí | sí |
| rodilla | rodilla | sí | sí |
| **pantorrilla** | **tobillo** | sí | sí |
| tobillo o pie | tobillo | sí | sí |
| otra zona | (ninguna) | — | — |

Las tres en negrita son APROXIMACIONES (una zona usa las reglas de otra): hay que juzgarlas.

### Las personas reales con algo declarado (27 asesorados; solo estas tienen algo)
- **El PO (Andrés Martínez, 37)** — dolor REPORTADO: *muslo por detrás izquierdo, nivel 3, bandera roja `R5`,
  triaje 4, 14-sep* (sobre Peso Muerto Rumano, corregido el 15-sep desde «aductores») → **vigente hoy**:
  `limitationsFor` devuelve `lumbar` + `isquios`. Un reporte de codo del 17-ago ya venció. Entrena hoy.
- **Darío (51)** — notas: *«Hernia lumbar L5 / Hernia umbilical / Pero Darío dice que estas hernias no son
  una limitación»* → el lector encuentra `lumbar`. Entrenó el 23-sep.
- **Lucía Ríos (29)** — notas: *«Rodillas desgastadas, dolor en la espalda alta, dolor en los
  codos»* → **el lector solo encuentra `rodilla`**. Entrenó hoy. ⚠️ PISTA del orquestador, NO un hallazgo:
  «espalda alta» y «codos» no están en `GEN_LIMIT_KWS`. Qué le llega de verdad a ella es trabajo de G2.
- Mario Parra (29, **suspendido**) — *«rodilla derecha operada»* → `rodilla` + `generic`.
- ⚠️ **Trampa ya pagada por el orquestador hoy**: el reporte de dolor guarda la fecha en `at` (no `date`). Una
  sonda con el campo equivocado da «sin dolor vigente» sobre alguien que sí lo tiene.

### El catálogo
374 ejercicios de entreno (con huecos e1–e381), 34 piezas de calentamiento en 9 pools.

---

## FALSOS POSITIVOS CONOCIDOS
1. **«El plan que escribió el coach no se filtra por dolor».** Deliberado (v546): lo que arma el coach se
   MARCA en el plan del día, no se le borra. Es hallazgo solo si hay una superficie que NO lo marca.
2. **«El calentamiento manual del coach no se filtra».** Deliberado: se marca con el chip naranja, que desde
   v642 también sale en el entreno.
3. **`wt1` «Círculos de tobillo» con dolor de tobillo y `wc2` con lumbar** son decisiones explícitas de Laura.
4. **Un 🟡 no entra a una lista de exclusión** (no cambia la conducta y ensancha la regla, v424/v644). **Una
   regla ANCHA también hace daño** (`sentadilla` a secas borraba el sit-to-stand, terapéutico).
5. **«`otra zona` no filtra nada».** Deliberado SI el texto lo dice (`hasExclusions` ramifica el mensaje). Es
   hallazgo solo si le promete una exclusión que no hace.
6. **Nutrición** (cerrada), **Comunidad** (congelada), **perseguir a quien no abre la app** (el PO lo cortó dos
   veces), **«faltan tests / convendría refactorizar»** sin víctima: no son hallazgos.

## Qué es un hallazgo SERIO
- Algo que una persona real puede sufrir HOY, con su nombre, el ejercicio y la regla exacta.
- Una promesa escrita que no se cumple (texto exacto y dónde vive).
- Una superficie que debería filtrar o marcar y no lo hace (puerta cerrada, ventana abierta — v424).
- Un pool que se vacía o queda de 1 (y entonces se repite todos los días o se cuela otra cosa).
- Algo que ASCIENDE a un plan cuando otra cosa sale, sin que nadie lo haya revisado para esa zona.
- Una medición que contradice el baseline.

**Tumba tus propios hallazgos antes de escribirlos, y escribe cómo lo intentaste.** Las pistas del
orquestador son hipótesis: en rondas anteriores varias las tumbaron los agentes.

## REGLAS DURAS
1. 🔒 **SOLO LECTURA contra producción.** `SELECT` sí; escribir, migrar, invocar edge functions o desplegar:
   jamás. Son datos de personas reales.
2. 🔒 **NO toques el código del repo.** Cero ediciones fuera de tu informe. Los scripts de medición van a una
   carpeta temporal FUERA del repo (`%TEMP%`).
3. 🔒 Cada hallazgo lleva `archivo:línea`, la consulta con su resultado o la salida del comando. Nombres
   verbatim. Para ejecutar el motor puedes `require('./avi-core.js')` en Node (no escribe nada).
4. 🔒 Distingue «no hay víctima hoy» de «no pasa nada».
5. ⚠️ **Toda medición lleva control de discriminación y de cobertura.** Un cero sin control no vale. Al barrer un
   enum, comprueba que los valores EXISTEN (`place` válidos: `gym`, `casa`, `corporal`, `parque`; con
   `'gimnasio'` sale todo vacío y parece un defecto). Un barrido corto miente: sube las semillas hasta que la
   cifra deje de moverse (v497: con 8 semillas «desaparecían» ejercicios que con 40 no).
6. ⚠️ **El navegador es SOLO de G2** (puertos 8829/9349). G1 trabaja por código y Node. No corras matrices de
   sabotaje.

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)
**Crea tu archivo con el esqueleto ANTES de investigar, y escribe en él CADA VEZ QUE CIERRES UNA PREGUNTA** —
no al final. En la ronda anterior dos agentes se cayeron por el límite de uso de la cuenta con el informe en
esqueleto y todo su trabajo se perdió hasta retomarlos.

Tu archivo: `docs/auditoria-lesiones-2026-09-25/G1-matriz.md` o `G2-lo-que-llega.md`.

```
# <código> · <área> — <tus nombres de rol>
## Veredicto en una frase
## Los 3 más grandes
   (qué es · a quién le pasa HOY, con nombre · evidencia · cómo intenté tumbarlo · qué costaría arreglarlo)
## Todos los hallazgos (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿víctima hoy?)
## Respuesta a las preguntas del orquestador (una por una: CIERTA / FALSA / NO SE PUDO MEDIR)
## Casillas que necesitan dictamen (solo G1: zona × ejercicio/pieza, con tu veredicto ✅/🟡/❌ y su razón)
## Lo que verifiqué y está SANO (con números)
## Sospechas sin medir
## Qué NO miré y por qué
```

Última respuesta: máximo 15 líneas. Español de Colombia, lenguaje de producto: el PO es entrenador.
