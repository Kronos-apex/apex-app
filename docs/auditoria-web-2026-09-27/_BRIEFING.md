# BRIEFING COMÚN — auditoría «LA WEB DE VENTA EN SU DOMINIO NUEVO» (15.ª ronda, R15, 2026-09-27)

Lee este archivo completo antes de hacer nada. Aplica a las 2 áreas (W1, W2).

El encargo del PO se juzga con el criterio de siempre: **«auditorías serias, nada genérico»**. Un informe
lleno de buenas prácticas genéricas se considera FALLIDO aunque esté bien escrito.

---

## Por qué existe esta ronda

La web de venta (`avientrena.com`, repo `C:/Users/KRONOS/Desktop/AVI/avi-web`, Next.js en Vercel) es donde
cae quien viene de las historias de Instagram/Facebook/WhatsApp del PO. La auditoría del 30-ago encontró 27
hallazgos y **ya se ejecutaron casi todos** (11 commits: peso en móvil −75 %, teclado, contraste, FAQ, marca,
precio, canonical por página). **NO la repitas.** Desde entonces cambió mucho y nadie lo miró junto:
dominio propio (22-sep), la app en `app.avientrena.com` (23-sep), el FAQ nuevo, el coach con nombre
(«Andrés Martínez»), AVI PRO a $30.000, la VITRINA de resultados que se mudó de la app a la web (v578) y las
6 capturas regeneradas (23-sep). Y en la app pasaron cosas que la web puede estar prometiendo mal: el plan
vencido cae a AVI FREE (v564), «olvidé mi contraseña» (v582), el correo sin confirmar (v679), eliminar
cuenta (v680).

| Área | Qué cubre | Quién |
|---|---|---|
| **W1** | **La promesa contra la app**: cada afirmación de las 4 páginas (planes, precios, qué incluye cada plan, FAQ, vitrina, capturas, «sobre AVI», contacto) contra lo que la APP hace HOY (código de `apex-app` y datos). Y el camino real de quien llega de una historia: cuántos toques hasta tener cuenta y entrenar, y dónde se cae. | Camilo (Growth) + Sofía (CS) |
| **W2** | **Técnica, accesibilidad, SEO y seguridad en el dominio nuevo**: accesibilidad REAL (árbol de accesibilidad, teclado, foco, contraste con sonda y control), rendimiento en móvil con red lenta, SEO (tarjetas sociales, datos estructurados, redirecciones, indexación), cabeceras de seguridad, enlaces e imágenes rotas, y qué ve el público de la vitrina (datos, fallos de red). | Julián (QA estático) + Isabella (diseño/a11y) |

## El producto (lo mínimo)
AVI: PWA de entrenamiento de Andrés Martínez (Camilo Andrés), coach en Guaduas. App en `app.avientrena.com`
(repo `C:/Users/KRONOS/Desktop/AVI/apex-app`, **avi-v680**). La web vende: planes Libre / AVI PRO / coach,
contacto por WhatsApp y pago por Bre-B. Supabase `eoebhrxbokyllqalyecj` (la web solo LEE `avi_showcase`).

## MAPA DE LA SUPERFICIE (verificado hoy)
- `avi-web/lib/site.ts` (config: URL, WhatsApp, Bre-B, `appUrl`, coach) · `lib/showcase.ts` (lectura de la vitrina).
- Páginas: `app/page.tsx` (inicio) · `app/precios/page.tsx` · `app/sobre-avi/page.tsx` · `app/contacto/page.tsx` ·
  `app/opengraph-image.tsx` · `app/robots.ts` · `app/sitemap.ts` · `next.config.ts` (redirecciones).
- Componentes: `Resultados.tsx` (vitrina) · `AppGallery.tsx` (capturas) · `FAQ.tsx` · `PagoBreB.tsx` ·
  `HeroMedia.tsx` · `Counter.tsx` · `StructuredData.tsx` · `Header`/`Footer`.
- En la app, lo que la web promete se decide en: `avi-core.js` (`premiumLocked`, `isFreeClient`,
  `clientHasCoach`, tiers `libre`/`app`/`premium`), `app-2-login.js` (login, registro), `legal/`.

## BASELINE MEDIDO HOY (27-sep) — créelo, NO lo vuelvas a medir
- 4 páginas. Tamaño del HTML (unidad: bytes del documento, sin recursos): `/` 156.744 · `/precios` 99.015 ·
  `/sobre-avi` 43.640 · `/contacto` 35.249.
- `canonical` y `og:url` propios en las 4 (4/4) · `robots.txt` permite todo y apunta al sitemap · sitemap con 4 URL.
- `hero.mp4`: 1.119.137 bytes, `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
- En `/precios` aparecen: $30.000 (AVI PRO, 6 veces) y $100.000 / $150.000 / $250.000 (interprétalos tú).
  «Sin permanencia» 10 veces, «WhatsApp» 11.
- El WhatsApp y la llave Bre-B son el celular del PO: **decisión suya**, no hallazgo.
- La vitrina muestra las tarjetas que el coach publica desde la app (tabla `avi_showcase`, tope 6 por coach,
  solo primer nombre y kilos). Hoy hay **4** del PO.

## FALSOS POSITIVOS CONOCIDOS (no los reportes)
1. «La web se ve vieja / hay que rediseñarla»: medido el 30-ago, el sistema visual es de 2026. **No proponer rediseño.**
2. Exponer el celular del PO (WhatsApp/Bre-B): decisión suya.
3. Comunidad y registro de alimentos están **CONGELADOS**: no se venden ni se proponen.
4. Nutrición: cerrada por el PO.
5. «Faltan tests / convendría refactorizar» sin víctima: no es hallazgo.
6. Los hallazgos del 30-ago que ya se arreglaron (lista arriba): solo son hallazgo si VOLVIERON.

## Qué es un hallazgo SERIO
- Una promesa escrita que la app no cumple hoy (texto exacto, dónde vive, y qué hace la app — con `archivo:línea`).
- Un camino donde alguien que quiere pagar o registrarse se queda sin salida.
- Algo que el público puede ver y no debería (datos de una persona, un menor, algo interno).
- Algo que rompe en un teléfono real de gama media con red lenta, con la medida.
- Una medición que contradice el baseline.

**Tumba tus propios hallazgos antes de escribirlos, y escribe cómo lo intentaste.**

## REGLAS DURAS
1. 🔒 **SOLO LECTURA.** No edites `avi-web` ni `apex-app`; no despliegues; no escribas en Supabase; no envíes
   formularios, WhatsApp ni correos; no crees cuentas. Scripts de medición en `%TEMP%`.
2. 🔒 Cada hallazgo lleva `archivo:línea`, la medida con su unidad, o la captura. Una cifra sin unidad no vale.
3. ⚠️ Toda sonda lleva **control de discriminación y de cobertura** (lecciones del repo: una sonda de contraste
   que no sabe leer un degradado da un número falso; sin `<meta viewport>` la prueba se maqueta a 980 px; se
   juzga solo lo VISIBLE; en headless el tema arranca OSCURO si no se fija).
4. ⚠️ Navegador: **W1 puertos 9450-9459**, **W2 puertos 9460-9469**. Mide la web publicada
   (`https://avientrena.com`); para la app, `https://app.avientrena.com` SIN iniciar sesión (o lectura de código).
5. ⚠️ Español de Colombia, lenguaje de producto: el PO es entrenador.

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)
**Crea tu archivo con el esqueleto ANTES de investigar, y escribe en él CADA VEZ QUE CIERRES UNA PREGUNTA.**
Tu archivo: `apex-app/docs/auditoria-web-2026-09-27/W1-promesa-contra-app.md` o `W2-tecnica-seo.md`.

```
# <código> · <área> — <tus nombres de rol>
## Veredicto en una frase
## Los 3 más grandes
   (qué es · a quién le pasa · evidencia · cómo intenté tumbarlo · qué costaría arreglarlo)
## Todos los hallazgos (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿víctima hoy?)
## Respuesta a las preguntas del orquestador (una por una: CIERTA / FALSA / NO SE PUDO MEDIR)
## Lo que verifiqué y está SANO (con números)
## Lo que decide el PO
## Qué NO miré y por qué
```

Última respuesta: máximo 15 líneas.
