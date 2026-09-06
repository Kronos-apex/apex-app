# Auditoría «el entreno en vivo, el arranque y el panel» — 2026-09-06

Ronda de 3 áreas, 3 agentes Sonnet, **3 de 3 entregadas**. Encargo del PO: *«manda otra auditoría
en otra área»* + *«auditorías serias, nada genérico»*.

- `_BRIEFING.md` — reglas duras, baseline medido, falsos positivos conocidos y qué cuenta como
  hallazgo serio. **Reutilizable: es el molde de la próxima ronda.**
- `C1-entreno-en-vivo.md` — Lucas Ortega (QA funcional) + Mateo Sanín (Data)
- `C2-arranque-y-cuentas.md` — Sofía Castaño (CS) + Andrés Quintero (DBA)
- `C3-panel-del-coach.md` — Valentina Ríos (PM) + Camilo Duque (Growth)

## Cómo se eligió el área

Leyendo la sección «Qué NO miré y por qué» de las cinco rondas anteriores. Las tres áreas salen
de confesiones textuales de los propios informes: A5 *(«no recorrí su experiencia después del día
1»)*, A4 (audita el motor que GENERA rutinas, nunca lo que pasa mientras alguien entrena), B3
*(«no miré `coach-create-client»`)*, y el panel del coach, que **nunca ha sido un área** en cinco
rondas.

## Lo que verificó el orquestador ANTES de reportarle al PO

No se le pasa nada al PO sin medirlo. De los 9 hallazgos grandes, se re-verificaron los 3 que
deciden trabajo, de forma independiente:

- **C2-1** — `AUTH.resetPassword` y `AUTH.sendMagicLink` existen en `app-1-infra.js:248-249` y
  tienen **cero llamadas** en todo el repo; `index.html` no tiene ningún enlace de recuperación.
  ✅ confirmado.
- **C1-1** — `showWorkoutFinish` tiene exactamente **dos** puntos de entrada
  (`app-4-entreno.js:2254` y `app-6-extra.js:1738`), los dos en el camino del 100%;
  `finishSessionEarly` (`app-4-entreno.js:2328-2348`) termina en un `toast` y no la llama.
  ✅ confirmado.
- **C3-1** — serie mensual medida contra producción: **mayo $515.000 (7 pagos) · junio $155.000
  (2) · julio $646.000 (7) · agosto $890.000 (9) · septiembre $120.000 (1, con 6 días)**.
  ✅ confirmado: el titular sigue la cadencia con la que el coach teclea, no el negocio.
- **C3-3** — `coachCanReach` se usa en **un solo sitio** (`app-2-login.js:2072`, el reporte «Sin
  entrenar» de v520); el banner de adherencia pinta «Empujar 💪» → `whatsappNudge`
  (`app-2-login.js:1633`) sin preguntar si hay por dónde escribirle. ✅ confirmado.

## Los 9 hallazgos, en una línea cada uno

**C1 · el entreno en vivo**
1. 🔴 Quien cierra su entreno temprano no recibe NADA: la pantalla de cierre (duración, kcal,
   récord, subida de nivel, pedido de avisos) solo corre al 100%. **4 de 213 cierres en toda la
   historia usaron ese botón.**
2. 🟡 Ese botón usa `confirm()` nativo — la clase que v568 ya corrigió en el borrado de fotos y
   que en la app instalada se come el sistema. Sin reproducir en Android real.
3. 🟢 Nataly (95% sin cerrar) **no es un bug**: abandona sistemáticamente el tramo final de su
   rutina (1.00 en el primer ejercicio → 0.00 en el último; control: Claudia, plana 93-100%). Es
   decisión de coaching: reordenar o acortar.

**C2 · de la cuenta al primer entreno**
4. 🔴 **No existe «olvidé mi contraseña»** en la app. Explica el `recovery_sent_at` NULL en las 33
   cuentas. Única salida hoy: que el coach cambie la clave a mano.
5. 🔴 `coach-create-client` puede fallar entre crear el usuario y sembrar sus datos, y el reintento
   vive SOLO en el `localStorage` del coach. **Caso real: Valery Valbuena** (`valery@avi.com`),
   entró 2 veces en 5 días leyendo un error que habla de Google en una cuenta de correo; se
   resolvió sola registrándose con su Gmail.
6. 🟡 Los **8 que nunca entrenaron son los 8 auto-registrados**, todos con rutina lista y **7 de 8
   sin teléfono**. Uno pidió coach hace 2 meses y sigue sin conversión.
7. 🟢 Tumbada la sospecha de B3: el self-heal de cuenta fantasma **sí** cubre el login por correo
   igual que el de Google (misma función `_enterAuthSession`). El defecto es el MENSAJE, que
   siempre habla de Google.

**C3 · el panel del coach**
8. 🔴 «Ingresos mes» y «Activos» miden la cadencia con que se teclean los pagos, no el negocio.
9. 🔴 El Inicio **no tiene tope de tarjetas**: 9 bloques con datos hoy, 5 de ellos avisos. El
   asesorado tiene `TODAY_MAX_CARDS=2` desde v505 exactamente por esto.
10. 🔴 «Empujar 💪» abre WhatsApp sin destinatario para **11 de las 12 personas** que lista hoy.

## Estado

**Nada de esto está arreglado.** La ronda es de diagnóstico: los tres agentes trabajaron en solo
lectura y sin tocar código. Las prioridades las decide el PO.
