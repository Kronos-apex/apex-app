# Auditoría «AVI como app instalada» — 2026-09-05

**3 de 3 áreas entregadas.** Pedida por el PO: *«continúa con una auditoría en otra área aparte
de las que ya auditamos, ten cuidado al lanzar agentes para que no queden a mitad de camino.»*

## Por qué esta área y no otra

Se descartó **Comunidad**: ya se auditó el 1-sep (área A9) y el PO la congeló.

El hueco lo nombraron los propios informes del 1-sep en su sección «Qué NO miré»: los tres que
tocaban el teléfono dicen lo mismo — **nadie ha auditado nunca la app como app instalada.**
A3 excluyó explícitamente la entrega real de push y el TWA; A1 y A2 dijeron no haber revisado
`delete-account`, `activate_public_profile` ni `refresh_snapshot`.

Ejecución: 3 agentes en **Sonnet** (con Opus, en la ronda del 30-ago, 3 de 4 se cayeron por
límite de sesión), solo lectura, cada uno obligado a **crear su archivo ANTES de investigar** y
rellenarlo sobre la marcha — para que un agente que se quede corto no se lleve la ronda con él.
Los 3 entregaron completo.

| | Área | Informe | Veredicto |
|---|---|---|---|
| B1 | El push hasta el teléfono | `B1-push.md` | 🔴 el rescate no tiene a quién rescatar |
| B2 | La app instalada (SW, caché, TWA) | `B2-instalada.md` | 🔴 se cachea sin comprobar que la respuesta esté bien |
| B3 | Funciones de servidor sin auditar | `B3-servidor.md` | 🔴 borrar la cuenta no borra todo lo que promete |

## Lo que hay que arreglar, en orden

### 1. 🔴 Borrar la cuenta no borra todo lo que la pantalla promete (B3)
Verificado línea por línea en `supabase/functions/delete-account/index.ts`: borra `user_data`,
`push_subscriptions`, el bucket `avatars` y `auth.users`. **Nunca toca `avi_showcase`** (la
tarjeta pública, que además no se puede volver a atar por id), **ni el bucket de fotos**, **ni
`apex_data_backups`**, que conserva el perfil completo hasta ~90 días sin que
`legal/politica-tratamiento-datos.md` lo mencione. Afecta al **100%** de quien borre su cuenta.
Es además el derecho de supresión de la Ley 1581/2012, o sea que el riesgo no es solo técnico.
De paso: el borrado va en 4 pasos sin transacción y en el orden contrario al que sugiere la
propia llave foránea — si falla a mitad, el perfil queda borrado y la cuenta viva.

### 2. 🔴 El rescate no tiene a quién rescatar (B1)
Medido contra las 24 personas reales hoy: **las 10 que tienen push son las 10 que están
entrenando esta semana.** Las 14 sin push son las 7 que nunca entrenaron más las que se
fueron. O sea que **RESCUE y COMEBACK —las notificaciones hechas para traer de vuelta a quien se
fue— solo pueden hablarle a quien ya volvió.**
🔴 El caso que lo retrata: **Yovan Tellez entrenó HOY (5-sep), lleva 2 sesiones, y no tiene push
ni teléfono.** Es exactamente la persona que un recordatorio salvaría, y es inalcanzable.
Y solo **8 de 24 tienen teléfono guardado**, que es la única vía alterna.

### 3. 🔴 La app guarda en caché respuestas que no comprobó (B2)
`sw.js:57-68` y `sw.js:81-86` hacen `cache.put()` sin mirar `response.ok` ni integridad. Una
respuesta cortada o un error del servidor **se guarda y se sirve después**. Encaja con la firma
de los 3 `Uncaught SyntaxError: Unexpected end of input` registrados en v470, v479 y v507.

### 4. 🔴 Suscripciones duplicadas que cuentan doble (B1)
**Natalia Martinez y Samuel Cifuentes tienen 2 filas cada uno.** Verificado en los logs de la
edge de hoy: Natalia recibe 2 envíos «✅» en cada una de las 3 rondas diarias. La poda solo actúa
ante un 410/404; una fila que nunca falla así se cuenta como éxito para siempre aunque lleve un
mes sin refrescarse.

### 5. 🟡 Nadie ve los avisos (B1 + B2)
`app_errors` acumula 15 avisos de hasta 6 semanas y **no existe ninguna pantalla en toda la app
que los muestre** (confirmado por búsqueda): solo se llega por SQL. Y del push no hay tabla, log
ni alerta de envíos y fallos. Es la misma ceguera que dejó el push roto meses en julio por una
policy de RLS que faltaba.

### 6. 🟡 El distintivo de «coach» se puede falsificar (B3)
`activate_public_profile` lo deriva de `user_data.coach_id` de otra fila, que el propio cliente
puede escribir (misma clase que la lección F7). Con dos cuentas se fabrica el 👑. Impacto bajo
hoy: Comunidad congelada y un solo coach real.

## Dos pistas del orquestador que los agentes TUMBARON

Las dos las traía yo del montaje y las dos eran falsas. Quedan escritas porque el valor de la
ronda está tanto en lo que se cayó como en lo que se sostuvo.

- **«12 fallos de service worker = gente atrapada en una versión vieja.»** FALSO. B2 cruzó los 5
  afectados —el coach entre ellos— contra el latido de versión `profile.dev` y los 5 están hoy en
  v556-v572. El diseño ya lo protege: JS y CSS se piden siempre a la red primero. El defecto real
  estaba al lado (el punto 3), no donde yo apuntaba.
- **«9 de 10 perfiles de Comunidad sin fecha de nacimiento = el candado de menores está ciego.»**
  FALSO. B3 encontró un disparador en la base (`trg_enforce_minor_privacy`) que fuerza
  `is_private=true` cuando la fecha falta. Verificado contra los 10 perfiles reales.

## Lo que se verificó y está SANO (con números)

- `assetlinks.json` responde 200 en las dos rutas; los íconos y capturas del manifest miden
  exactamente lo declarado; el shell precacheado pesa 2,6 MB y los **115 MB de fotos de
  ejercicios NO se precachean** (carga perezosa, de 30 en 30).
- Una actualización del service worker **nunca interrumpe un entreno en curso**.
- RLS de push completa y vigente; `send-push` bien autorizado (el hueco de la llave pública de
  v426 sigue cerrado); `sw.js` navega bien al chat con la app abierta.
- **El gotcha de v551 quedó cerrado de verdad** — verificado con datos reales de hoy, no leyendo
  código.
- La suscripción de **iPhone** (Kathe) funciona sin errores en 24 h.
- `delete-account` cierra bien el acceso: nadie borra la cuenta de otro y la del coach está
  protegida.
- `refresh_snapshot` cumple su promesa: el cliente no puede inflar racha ni nivel.

## Qué NO miró esta ronda

- **Ningún teléfono real.** Otra vez. Todo sale de código, SQL y Chrome headless. La entrega de
  un push a una pantalla bloqueada sigue sin comprobarse en un aparato de verdad — y es
  justamente lo que el PO sí puede hacer en un minuto.
- **No se ejecutó `delete-account` ni `activate_public_profile`** contra nadie: son 24 personas
  reales. Los hallazgos de B3 son por ausencia de candado, leyendo el código, no por explotación.
- **`send-push` y `daily-notifs`** los miró B1; `coach-create-client` no lo miró nadie.
- **Play Store**: la app aún no está publicada, así que la huella del certificado de
  `assetlinks.json` no se pudo contrastar contra Play App Signing.
