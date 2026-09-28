# R15 · La web de venta en su dominio nuevo — veredicto consolidado (27-sep)

Dos agentes Sonnet (W1 la promesa contra la app · W2 técnica, accesibilidad, SEO y seguridad), solo lectura.
**El orquestador verificó cada hallazgo** antes de actuar, y arregló los dos técnicos el mismo día.

## Veredicto en una frase

**La web no promete nada que la app no cumpla**, y está técnicamente sana. Tenía dos defectos técnicos que se
veían justo donde entra la gente —compartir un enlace— y ya están arreglados y publicados.

## Arreglado y publicado (avi-web `89e4026`, `npx vercel --prod`)
- 🟡 **`/precios`, `/sobre-avi` y `/contacto` no tenían imagen al compartirse** (sin `og:image` ni
  `twitter:image`). Causa: cada página declara su propio `openGraph` (para su canonical) y eso REEMPLAZA entero
  el del layout, imagen incluida. Ahora cada ruta tiene su `opengraph-image`. Verificado en vivo: las 3
  responden 200 `image/png`, 1200×630.
- 🟡 **«Contacto» saltaba al cargar (CLS 0,7118, umbral malo > 0,25)**: la tarjeta verde era la única de 9 con
  `.grain` sin `relative`, y su adorno se posicionaba contra la pantalla. Medido en vivo tras el arreglo:
  **CLS 0** en `/contacto`, `/precios` y `/`.

## Lo que está SANO (W1, verificado)
- Planes, precios (AVI PRO $30.000), qué incluye cada plan, las preguntas frecuentes (sin internet, cancelar →
  vuelve a AVI FREE con su historial, menores sin carga con barra, pago por Bre-B), la vitrina (4 tarjetas: solo
  primer nombre y kilos, sin menores) y las 6 capturas **coinciden con la app v680**. Coach «Andrés Martínez»,
  374 ejercicios, marca «AVI» siempre en mayúsculas, ningún enlace a la dirección vieja de la app.
- W2: accesibilidad de controles y teclado, cabeceras de seguridad, redirecciones, sitemap/robots, enlaces e
  imágenes: sin roturas.

## Lo que se TUMBÓ
- ⚪ **«`avi_showcase` entrega `coach_id` con la llave pública»**: cierto pero sin riesgo — ese identificador ya
  está publicado en el código abierto de la app, y la vitrina es pública por diseño (la web filtra por coach desde
  v553). No es hallazgo.

## Decisiones del PO
1. **Pagar AVI PRO desde el celular cuesta 3 toques y 2 pantallas** (☰ → Precios → bajar → «Quiero AVI PRO»),
   contra 1 toque para WhatsApp o para «Probar la app gratis», los dos visibles al abrir. Es fricción medida, no
   un defecto: ¿se pone un acceso directo a AVI PRO arriba?
2. **Google**: no se pudo confirmar si ya indexa `avientrena.com` (solo hay Search Console para saberlo). El paso
   2 de `avi-web/SEO-LANZAMIENTO.md` (verificar el dominio y enviar el sitemap) es suyo.

## Qué NO se miró
- Ningún teléfono real. La vitrina depende del candado de menores de la app (`clientProgressStory`): la web no
  lo repite. Hoy está limpia; se deja anotado.
