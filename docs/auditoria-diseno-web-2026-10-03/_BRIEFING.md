# R19 — Revisión de DISEÑO de la web de venta (`avientrena.com`), 3-oct-2026

Pedido del PO: «quiero enfocarme en el diseño de la web». Se instalaron skills de diseño nuevas y esta ronda las usa.
**Solo diagnóstico. No se cambia código, no se hace commit, no se publica nada.**

## El producto (lo que es verdad)
- **AVI** = app de entrenamiento (PWA en `app.avientrena.com`) + coaching personal del entrenador **Andrés Martínez**
  (Guaduas, Cundinamarca, Colombia; también virtual en toda Colombia). Un solo coach, un negocio pequeño y real.
- Planes: AVI FREE $0 · AVI PRO $30.000/mes · coaching virtual $100.000 · presencial $150.000 y $250.000 (COP). Se
  paga por WhatsApp/Bre-B, sin cobro automático.
- Quien llega: personas en Colombia que quieren entrenar, **casi todas en celular**, desde Instagram (@avientrena),
  WhatsApp o Google. Español de Colombia, trato de «tú», el coach habla en primera persona.
- La web (Next.js 16 + Tailwind 4, repo `C:\Users\KRONOS\Desktop\AVI\avi-web`) tiene 6 secciones: Inicio `/`, La app
  `/la-app`, Planes `/precios`, Coaching `/coaching`, Resultados `/resultados`, Ayuda `/ayuda`. Componentes en
  `components/`, páginas en `app/*/page.tsx`, tokens en `app/globals.css` (forest `#1b4332`, green `#2d6a4f`, gold
  `#e8c547`, clay `#e76f51`, cream `#f7f3ea`, ink `#15241d`; Fraunces display, Plus Jakarta Sans, JetBrains Mono).
- Modo de la superficie (impeccable): **Persuade** — el visitante decide y actúa (probar la app gratis o escribirle al
  coach por WhatsApp).

## Dónde mirar
- **La web corre en local:** `http://localhost:3456` (build de producción). **NO navegar `avientrena.com`**: cada visita
  real suma a la medición de Vercel Analytics del PO.
- **Capturas ya hechas** en `C:\Users\KRONOS\AppData\Local\Temp\avi-web-r19\`: `<pagina>-<cel|esc>-0-pantalla.jpg`
  (lo primero que ve quien llega) y `<pagina>-<cel|esc>-<n>.jpg` (la página entera en tramos de 1688 px en celular 390
  y 1800 px en escritorio 1440). `_indice.txt` dice cuántos tramos tiene cada una. Las animaciones de entrada ya
  corrieron. En la captura el vídeo del héroe está en un fotograma cualquiera.
- Chrome está en `C:/Program Files/Google/Chrome/Application/chrome.exe`; el repo trae `ws` y ejemplos de CDP en
  `scripts/verificar-movil.mjs` si hace falta abrir una página propia (headless, puerto de depuración distinto a 9541/9547).

## Lo que YA se auditó y NO hay que volver a reportar
R15 (27-sep) y **R18 (30-sep/1-oct, `docs/auditoria-web-nueva-2026-09-30/`)** cubrieron **accesibilidad** (contraste,
foco, teclado, tamaños táctiles, `sr-only`), **textos y promesas contra la app** y el recorrido. Ya publicado: orientador
arriba y enlazado desde el héroe, foto del héroe recortada en celular, WhatsApp en menú y secciones, «El que más
recomiendo», «Preguntar por cupos», primera persona, letra mono a 12 px. Quedan abiertos y conocidos (no repetir):
tira de precios arriba en Planes, pausa del vídeo del héroe (WCAG 2.2.2), «Entrenos» de las fichas, «Cupos
limitados» / «Est. 2026» / «Suda. Respira. Sigue.», falta una cifra VERDADERA de confianza arriba, faltan fotos reales
del coach (las actuales son generadas; el PO las va a mandar).
**Esta ronda es otra cosa: el OFICIO VISUAL** — ¿se ve de autor o de plantilla?, jerarquía, composición, ritmo,
tipografía, color, imagen, movimiento, coherencia entre las 6 secciones, lo que la haría memorable.

## Qué es un hallazgo serio
- Algo que **se ve** en una captura o en el código, con el archivo:línea o la captura que lo prueba. Nada de «considerar».
- Que le cueste algo a quien llega: confianza, claridad, ganas de probar. Di a quién y por qué.
- Con un arreglo concreto que respete la marca (verde bosque + dorado + crema, Fraunces). Esto es REFINAR, no rediseñar
  desde cero: si propones romper la identidad, dilo como pregunta para el PO, no como hallazgo.
- Nombra la unidad de lo que cuentas (px, secciones, tarjetas, segundos) y cuenta de verdad, no a ojo.
- No inventes datos del negocio (cifras, testimonios, años). Si algo falta, se dice que falta.

## Formato de entrega
Español, para el dueño del negocio (no es diseñador): claro y directo. Escribe tu informe en
`C:\Users\KRONOS\Desktop\AVI\apex-app\docs\auditoria-diseno-web-2026-10-03\<tu archivo>` y devuelve en tu respuesta
final un resumen de ≤ 25 líneas. No edites nada fuera de tu archivo. No hagas commit.
