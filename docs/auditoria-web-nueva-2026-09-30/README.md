# R18 — Auditoría de la web nueva (`avientrena.com`, 30-sep / 1-oct-2026)

Dos áreas con las skills de diseño instaladas, de solo lectura contra producción:
- **D1 · Diseño y accesibilidad** (`D1-diseno-accesibilidad.md`): 0 🔴 · 9 🟡 · 10 🟢. El sistema visual es coherente en las 6
  secciones y la base de accesibilidad es sólida; los fallos están en los bordes.
- **D2 · Textos y recorrido** (`D2-textos-recorrido.md`): 3 🔴 · 8 🟡 · 9 🟢. El texto es honesto en general, pero el viaje se
  rompe en la puerta (la bienvenida de la app) y en el nombre del producto (AVI PRO no existe dentro de la app).

Briefing común: `_BRIEFING.md`. Los 3 rojos de D2 los verificó el orquestador contra el código.

## Lo que YA está hecho (rama `r18-textos` de avi-web, vista previa; producción SIN tocar)

Todo lo que no pedía decisión del PO. Vista previa verificada: **enlaces 60/60**, **celular 53/53** (41 de siempre + 12 nuevas
del «Saltar al contenido»), contraste por píxel **celular 30 → 0 fallos** y **escritorio 34 → 1** (la etiqueta vertical
decorativa, que ya no se lee en voz alta).

| Commit | Qué |
|---|---|
| `603ddfe` | Textos (D2 #6, #7, #8 parcial, #11, #12, #14-17): 374 en vez de «+370»; las dos definiciones de Resultados que el código no cumplía; «tres toques» → tres mensajes; botones con un solo nombre («Probar la app gratis», «Quiero el coaching virtual», «Escribirle a Andrés»); mensaje del orientador en tres líneas; FAQ de casa y del plan gratis corregidas, Comunidad en la de datos y 4 preguntas nuevas (correo, contraseña, borrar cuenta, tarjeta), cada una contra el botón real de la app |
| `52719d1` | Sonda del orientador: re-toca hasta que el paso avance (vista previa sin hidratar daba rojo falso) |
| `1616e7e` | Accesibilidad sin cambiar el diseño (D1 #1-5, #7, #8, #12-16, #18): contraste solo por opacidad, `scroll-padding-top`, menú con Escape/retorno de foco/cierre al tocar, botones que parten su texto en el celular, «Incluido/No incluido» como texto, decorativos ocultos, logo sin «AVI AVI», «Saltar al contenido» |
| `87e422d` | 🔴 Defecto MÍO cazado antes de producción: el texto oculto de la tabla se escapaba del contenedor deslizable y la página entera se movía de lado (documento 459 px a 320). `relative` en la celda → 320 |
| `7d390b7` | La sonda del celular mide el «Saltar al contenido» al recibir el foco. Control: contra producción da rojo en las 12 combinaciones |

**No se tocó a propósito:** «candados» (la app muestra candados de verdad; es el mismo nombre que la persona ve), el tamaño de
la letra mono de 10-11 px (decisión 9) y todo lo de la lista de abajo.

## Lo que decide el PO

**Verdad y producto (lo grande):**
1. **«Las dictó una fisioterapeuta»** (D2 🔴3, `FAQ.tsx:72-73,82`). Las listas las dictó el agente de fisioterapia del equipo. Si
   ninguna fisioterapeuta humana las revisó: `Para cada zona hay una lista fija de ejercicios que se quitan o se marcan, y no cambia de un día a otro.`
2. **La bienvenida de la app** (D2 🔴1, apex-app `index.html:196-216`): dice «Con un coach de verdad / Aquí no entrenas solo» a quien
   llega a probar el plan gratis, pone «Iniciar sesión» primero y devuelve a la web. Propuesta: texto honesto para todos y, si llega
   con `?origen=web`, «Crear cuenta» de botón principal y sin el enlace de vuelta. Cambio de app: versión nueva y su despliegue.
3. **AVI PRO dentro de la app** (D2 🔴2, apex-app `app-3-coach.js:1826-1845`, `index.html:2074-2080`, `app-4-entreno.js:1636-1640`): el
   candado solo ofrece coach; quien quiere PRO no tiene botón, y un PRO vencido rebota entre «Hablar con mi coach» y el candado
   (9 de 22 asesorados son PRO). Propuesta: el candado ofrece las dos opciones con su mensaje a WhatsApp y la banda de vencido dice
   «Renovar mi AVI PRO».
4. **La gráfica por ejercicio y el 1RM ya los ve el plan gratis** (D2 🟡4) aunque la web los vende como PRO. Recomendación: corregir
   el texto de la web y NO quitarle al gratis lo que ya tiene (cobrar por lo ya dado gratis es la queja nº 1 de MyFitnessPal).

**Web (recomendación del orquestador en cada una):**
5. Subir el **orientador** justo después de la galería y enlazarlo desde el héroe (hoy a 5,2 pantallas sin ninguna entrada) — D1 🟡4.
6. **Acortar la franja de foto del héroe en el celular** (506 px de torso sin contenido → ~220 px con el rostro) — D1 🟡4.
7. **WhatsApp en el menú del celular** y un botón «Escribirle a Andrés» en Coaching, La app y Resultados — D2 🟡5.
8. «Más elegido» → **«El que más recomiendo»** (ningún asesorado paga hoy $100.000) · «Reservar mi cupo» → **«Preguntar por cupos»**
   (no reserva nada) · voz en **primera persona** en el cuerpo de cada página — D2 🟡8-10.
9. Letra mono de 10-11 px de las fichas y etiquetas → 12 px (D1 decisión 5).
10. Menores: una tira de precios arriba en Planes (D1 🟢10), pausa del vídeo del héroe en escritorio (D1 🟡9, WCAG 2.2.2 nivel A),
    «Entrenos» de las fichas contando solo sesiones terminadas (D2 🟡6), «Cupos limitados», «Est. 2026» y «Suda. Respira. Sigue.» (D2 🟢18-19).

## Qué NO se cubrió (de los dos informes)
Lectores de pantalla reales (solo el árbol de Chrome), Safari/iPhone, el navegador interno de Instagram (y si «Crear cuenta con
Google» funciona ahí), contraste sobre el vídeo en movimiento, y datos de conversión (Vercel gratis solo cuenta visitas).
