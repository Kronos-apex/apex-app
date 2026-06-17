# Mejoras Android / PWA — 2026-06-17

Trabajo tipo "equipo profesional" sobre cómo AVI se comporta como app instalada.

## ✅ Hecho en código (este commit)

1. **Íconos maskable con safe-zone** — el ala se redujo al ~70% del lienzo sobre
   `#06090A` para que la máscara circular/squircle de Android **no recorte las
   puntas**. Regenerados `icons/maskable-192.png` y `icons/maskable-512.png`.
2. **App shortcuts** (mantener presionado el ícono en Android) en `manifest.json`:
   - **Entreno de hoy** → `?go=hoy`
   - **Mi progreso** → `?go=progreso`
   - **Mensajes con tu coach** → `?go=mensajes`
   Con íconos propios `icons/sc-*.png` (96×96, glifos de marca).
3. **Deep-link** en `initClientView` (index.html): lee `?go=` y abre la pestaña
   correspondiente tras el login. Guardado: si entra por un acceso directo se
   omite el "welcome de vuelta"; respeta el onboarding de primer login.
4. **Push auditado** — `subscribePush` ya estaba bien guardado (permiso +
   `shouldPostPush` para no re-postear endpoint). Handlers `push` y
   `notificationclick` del SW completos. Corregido el fallback de marca `APEX`→`AVI`.
5. **Service Worker** bumpeado `apex-v158` → `apex-v159` (purga caché vieja).

Verificado: `node apex.test.js` 140/140 · `node scripts/smoke-run.mjs` 🟢.

## ⚠️ Lo que debe hacer Camilo a mano (no vive en este repo)

La app instalable (PWA) ya tiene todo. Pero el **paquete TWA** para Play Store
(el `.aab` firmado) se construye aparte con Bubblewrap/PWABuilder y **no está en
este repo**. Antes de subir a Play Store:

1. **Reempaquetar la TWA** para que tome el `manifest.json` nuevo (íconos
   maskable + shortcuts). Si usaste PWABuilder: volver a generar el paquete desde
   `https://kronos-apex.github.io/apex-app/` y firmar con el **mismo keystore** de
   siempre (el fingerprint debe seguir coincidiendo con `.well-known/assetlinks.json`).
2. **Target API level al día** — Google sube cada año el mínimo para publicar
   (actualización de apps). Al reempaquetar con Bubblewrap reciente queda al día
   automáticamente; si el paquete es viejo (v1.1), Play puede rechazarlo por
   `targetSdkVersion` desactualizado. Verificar en Play Console → "Versiones".
3. **Probar la TWA reempaquetada** en un teléfono real: que abra sin barra de
   Chrome (Digital Asset Links OK), ícono bien recortado, status bar de marca,
   y que los accesos directos aparezcan al mantener presionado el ícono.

## Notas

- Los shortcuts solo navegan a pestañas del **asesorado**; el coach no las usa,
  pero no estorban (si un coach las toca, abre la app normal).
- iOS no suena con pantalla bloqueada (límite de plataforma, no de la app);
  Android sí, vía web push.
