# BRIEFING COMÚN — auditoría «LA WEB NUEVA» (18.ª ronda, R18, 2026-09-30)

Lee este archivo completo antes de hacer nada. Aplica a las 2 áreas (D1, D2).

El encargo del PO se juzga con el criterio de siempre: **«auditorías serias, nada genérico»**. Un informe
lleno de buenas prácticas genéricas se considera FALLIDO aunque esté bien escrito. Esta ronda usa las
herramientas de diseño instaladas (skills), pero **la skill es el método, no el entregable**: cada hallazgo
tiene que señalar algo concreto de ESTA web, con su captura o su `archivo:línea`.

---

## Por qué existe esta ronda

Hoy (30-sep) `avientrena.com` dejó de ser una sola página larga y pasó a ser un sitio de **6 secciones**
(Inicio, La app, Planes, Coaching, Resultados, Ayuda) con un **orientador** de 3 preguntas. Se publicó esta
noche. El armado y casi todo el texto los escribió el orquestador (una IA) en un día: **nadie con ojo de
diseño ni de texto lo ha mirado**. La auditoría anterior (R15, 27-sep) miró la web VIEJA: no la repitas.

| Área | Qué cubre | Quién | Skills |
|---|---|---|---|
| **D1** | **Diseño y accesibilidad**: jerarquía visual, consistencia entre las 6 secciones (¿parecen el mismo sitio?), qué se ve primero en cada pantalla del celular, ritmo y largo de cada página, la tabla de planes en el celular, el orientador como pieza visual; y accesibilidad REAL: contraste medido, tamaño de toque, foco y teclado, árbol de accesibilidad, lector de pantalla en el orientador y el menú. | Isabella (diseño/a11y) + Julián (QA) | `design:design-critique` + `design:accessibility-review` |
| **D2** | **Textos y recorrido**: tono (colombiano, cercano, de entrenador — no de agencia), repeticiones entre secciones, botones (¿dicen qué pasa al tocarlos?), lo que alguien que llega de una historia de Instagram entiende en 5 segundos, cuántos toques hasta «Probar gratis» o hasta escribirle al coach desde cada sección; y **cada afirmación NUEVA contra la app real** (ver «Lo que se escribió hoy»). | Valentina (copy) + Sofía (CS) | `design:ux-copy` |

**Cómo usar las skills:** cárgalas con la herramienta Skill (`design:design-critique`, etc.). Si el nombre no
existe, lee el archivo `C:/Users/KRONOS/.claude/plugins/synced/4689a679-62ac-4c0f-8cba-9f3f8a634fb0_ef478e75-cbe7-4aea-8547-3d9df0ce54f1/design/skills/<nombre>/SKILL.md`
y sigue su método. No pidas nada al usuario: no hay usuario en tu sesión.

## El producto (lo mínimo)
AVI: app de entrenamiento (PWA) de **Andrés Martínez**, entrenador en Guaduas (Cundinamarca). La app vive en
`app.avientrena.com` (repo `C:/Users/KRONOS/Desktop/AVI/apex-app`, **avi-v695**). La web vende 5 planes:
Gratis $0 · AVI PRO $30.000 · Coach virtual $100.000 · Presencial 2 días $150.000 · Presencial 4 días $250.000
(mensuales). Contacto por WhatsApp, pago por Bre-B. Público: personas en Colombia que entrenan en casa o en
gimnasio, la mayoría desde el celular (gama media, datos móviles).

## MAPA DE LA SUPERFICIE (repo `C:/Users/KRONOS/Desktop/AVI/avi-web`, Next.js 16 en Vercel)
- `lib/site.ts` (nav, `saltos` = destinos de los botones, `ir()`) · `lib/planes.ts` (funciones Gratis/PRO) ·
  `lib/capturas.ts` · `lib/showcase.ts` (fichas de resultados que el coach publica desde la app).
- Páginas: `app/page.tsx` (Inicio) · `app/la-app/page.tsx` · `app/precios/page.tsx` (Planes + tabla
  `Comparacion`) · `app/coaching/page.tsx` · `app/resultados/page.tsx` · `app/ayuda/page.tsx` ·
  `app/ir/[destino]/page.tsx` (páginas de paso).
- Componentes: `Header.tsx` · `Footer.tsx` · `Orientador.tsx` · `Resultados.tsx` · `AppGallery.tsx` ·
  `FAQ.tsx` · `PagoBreB.tsx` · `PageHero.tsx` · `Salto.tsx` · `HeroMedia.tsx`.
- En la app, lo que la web promete se decide en `apex-app/avi-core.js` (`isFreeClient`, `premiumLocked`,
  `clientHasCoach`) y en `apex-app/app-*.js`.

## CAPTURAS YA TOMADAS (úsalas antes de tomar las tuyas)
`C:/Users/KRONOS/AppData/Local/Temp/avi-web-auditoria-2026-09-30/` — las 6 secciones de la web publicada,
pantalla por pantalla: `movil-<seccion>-NN.jpg` (390×844, como un teléfono) y `compu-<seccion>-NN.jpg`
(1440×900). Índice con alturas en `_indice.txt`. Las animaciones de entrada ya están disparadas.

## BASELINE MEDIDO HOY (30-sep) — créelo, NO lo vuelvas a medir
- Enlaces: 60/60 botones llegan a su destino final (`avi-web/scripts/verificar-enlaces.mjs`), en producción.
- Celular: 41/41 (`scripts/verificar-movil.mjs`): a 390 y 360 px nada se sale de lado, botones ≥40 px de
  alto, cero errores de JS, menú con 6 secciones, las 36 combinaciones del orientador dan su sugerencia.
- Alto en el celular (unidad: pantallas de 844 px): Inicio 7,7 · La app 6,7 · Planes 9,7 · Coaching 9,1 ·
  Resultados 4,4 · Ayuda 5,5.
- Hay **4** fichas de resultados publicadas (tope de la app: 6).

## LO QUE SE ESCRIBIÓ HOY (D2: contrástalo con la app; D1: míralo como pieza)
- Inicio: hero con «Probar la app gratis» + «Conocer el coaching», 3 capturas, 3 fichas, sección del coach,
  orientador, cierre.
- La app: lista de funciones con chip Gratis/PRO (`lib/planes.ts` dice que PRO = los candados `isFreeClient`).
- Planes: «para quién es» de cada plan, tabla comparativa de 4 columnas, «Revisión cada semana y un ajuste del
  plan cada 4 semanas» (Coach virtual).
- Coaching: 3 pasos, «Tu primera semana» (día 1/3/7), «Después» (cada semana / cada 4 semanas / si te duele
  algo → el mismo día), qué incluye cada modalidad.
- Resultados: «cómo leer cada ficha» (meses en AVI, entrenos, objetivo, de→a).
- Orientador: 3 preguntas (objetivo, experiencia, dónde entrena) → sugiere app gratis o WhatsApp.

## FALSOS POSITIVOS CONOCIDOS (no los reportes)
1. **«Hay que rediseñar / se ve vieja»**: el sistema visual (verde oscuro, crema, amarillo) es de 2026 y el PO
   pidió conservarlo. Se critica cómo se USA, no se propone otro.
2. El celular del PO en WhatsApp y Bre-B: decisión suya.
3. Comunidad y registro de alimentos están **CONGELADOS**: no se venden ni se proponen. Nutrición: cerrada.
4. **Los botones pasan por `/ir/<destino>`** (página de paso de ~0,5 s): es A PROPÓSITO, así se cuentan los
   toques en el plan gratis de Vercel (no tiene eventos propios). No propongas quitarlas ni «usar eventos».
5. La medición de Vercel **se apaga sola en un navegador automático** (headless/webdriver): que tu sonda no vea
   envíos de medición NO es hallazgo.
6. **El PO CONFIRMÓ hoy**: precios, lugar y horario del presencial «se acuerdan por WhatsApp», los textos de
   «para quién es», las reglas del orientador, las promesas de Coaching (semanal / cada 4 semanas / mismo día)
   y las 4 fichas. Solo son hallazgo si la APP contradice algo de eso.
7. «Entrar a la app» siempre visible arriba: pedido del PO.
8. Títulos de las páginas, descripciones y datos estructurados (SEO): **fuera de alcance**, se cambian hoy en
   paralelo.
9. «Faltan tests / convendría refactorizar» sin víctima: no es hallazgo.

## Qué es un hallazgo SERIO
- Algo que hace que alguien que llegó con ganas NO toque «Probar gratis» ni escriba (no entiende, no encuentra,
  se cansa, desconfía) — con la captura y la razón concreta.
- Una afirmación escrita que la app no cumple hoy (texto exacto, dónde vive, y qué hace la app con `archivo:línea`).
- Algo que no se puede usar en un teléfono real, con lector de pantalla o con teclado — con la medida.
- Una incoherencia visible entre secciones (el mismo plan con distinto nombre/precio, estilos que se contradicen).
- Un texto que suena a máquina o a agencia, o se repite tanto que pierde fuerza — citándolo y proponiendo el
  reemplazo EXACTO en español de Colombia.

**Tumba tus propios hallazgos antes de escribirlos, y escribe cómo lo intentaste.**

## REGLAS DURAS
1. 🔒 **SOLO LECTURA.** No edites `avi-web` ni `apex-app` (salvo TU informe); no despliegues; no escribas en
   Supabase; no envíes WhatsApp, correos ni formularios; no crees cuentas. Scripts de medición en `%TEMP%`.
2. 🔒 **En tu informe NO escribas nombres de personas reales** (las fichas de resultados: «ficha 1…4» por
   orden de aparición) **ni números de teléfono** (el del PO: «el WhatsApp del PO»). El repo es público y un
   candado rechaza el archivo. Al coach se le dice «Andrés» o «el PO».
3. 🔒 Cada hallazgo lleva captura (nombre del archivo), `archivo:línea` o la medida con su unidad.
4. ⚠️ Toda sonda lleva **control de discriminación y de cobertura** (lecciones del repo: una sonda de contraste
   que no sabe leer un degradado da un número falso; sin `<meta viewport>` la prueba se maqueta a 980 px; se
   juzga solo lo VISIBLE; las animaciones de entrada dejan cosas en opacidad 0 hasta que se ven).
5. ⚠️ Navegador (Chrome headless por CDP, ver `avi-web/scripts/verificar-movil.mjs` como ejemplo):
   **D1 puertos 9470-9479**, **D2 puertos 9480-9489**. Mide la web publicada `https://avientrena.com`.
6. ⚠️ Español de Colombia, lenguaje de producto: el PO es entrenador, no desarrollador.

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)
**Crea tu archivo con el esqueleto ANTES de investigar, y escribe en él CADA VEZ QUE CIERRES UNA PREGUNTA**
(si tu sesión se corta, lo escrito queda). Tu archivo, en `C:/Users/KRONOS/Desktop/AVI/apex-app/docs/auditoria-web-nueva-2026-09-30/`:
`D1-diseno-accesibilidad.md` o `D2-textos-recorrido.md`.

```
# <código> · <área> — <tus nombres de rol>
## Veredicto en una frase
## Los 5 más grandes
   (qué es · a quién le pasa · evidencia · cómo intenté tumbarlo · el arreglo concreto)
## Todos los hallazgos (tabla: severidad 🔴/🟡/🟢 · qué · dónde · arreglo propuesto)
## Lo que verifiqué y está SANO (con números)
## Lo que decide el PO
## Qué NO miré y por qué
```

Última respuesta: máximo 15 líneas.
