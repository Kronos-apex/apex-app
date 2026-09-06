const CACHE_NAME = 'avi-v582';
// La página pide JS/CSS con ?v=NNN (cache-bust del WebView Huawei, v230) — el precache
// debe usar LA MISMA URL o nunca matchea (instalación fresca + offline quedaba sin JS).
// El check 10 del pre-commit garantiza que ?v= y CACHE_NAME van siempre juntos.
const V = CACHE_NAME.replace('avi-v', '');

// Shell mínimo precacheado al instalar → la app abre offline desde el primer momento
// (antes solo se cacheaba on-demand). El .catch evita que un 404 puntual rompa el install.
const SHELL = ['/apex-app/', '/apex-app/index.html', '/apex-app/manifest.json', '/apex-app/icons/icon-192.png', '/apex-app/icons/icon-512.png']
  // `foods.json` = catálogo de búsqueda del registro de alimentos (E8). Va precacheado con
  // ?v= como los módulos: sin él, la primera visita sin red se quedaría sin buscador. Si aun
  // así falta, `foodCatalog(null)` cae a los 50 que viajan dentro de avi-core (E9).
  .concat(['styles.css', 'app-1-infra.js', 'app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'avi-core.js', 'muscle-map.js', 'exercise-muscles.js', 'foods.json']
    .map(f => '/apex-app/' + f + '?v=' + V));
self.addEventListener('install', e => {
  // SIN skipWaiting automático (v325): el SW nuevo ESPERA en 'waiting' hasta que la página
  // pida activarlo en un momento SEGURO — nunca encima de un timer de entreno corriendo. La
  // página manda {type:'SKIP_WAITING'} vía postMessage (app-6, auto-actualización segura). En
  // la PRIMERA instalación no hay worker activo → se activa igual sin esperar a nadie.
  // (Antes, v324 hacía skipWaiting + navigate() a la fuerza de TODAS las pestañas al activar →
  // podía RECARGAR y cortar un entrenamiento en curso. Ahora la recarga la decide la página.)
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL).catch(() => {})));
});

// La página pide activar el SW nuevo cuando es seguro (no hay timer vivo) → skipWaiting →
// dispara controllerchange en la página → la página recarga UNA vez. Ver app-6-extra.js.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
    // La RECARGA la coordina la PÁGINA (controllerchange en app-6) cuando NO hay timer vivo,
    // en vez del navigate() a la fuerza de v324 que podía cortar un entrenamiento en curso.
  );
});

// ══════ v576 · NO SE GUARDA EN EL TELÉFONO LO QUE NO SE COMPROBÓ ══════
// Hallazgo de la auditoría «app instalada» (5-sep). Había TRES sitios que hacían `cache.put`
// con lo que llegara de la red —navegación, JS/CSS y el CDN— sin mirar si la respuesta estaba
// bien. Un 404 o un 500 de GitHub Pages se guardaba y se servía después, **incluso sin red**,
// que es cuando más se necesita que lo guardado sea bueno. Encaja con los 3
// `Uncaught SyntaxError: Unexpected end of input` registrados en producción (v470, v479, v507):
// la firma de un archivo que llegó cortado.
// 💎 El patrón correcto YA ESTABA en este archivo, en la rama de iconos/manifest (`r.ok`).
// Los otros tres no lo usaban. Aquí se unifica en un solo sitio para que no vuelva a haber
// una rama que se olvida.
function _guardable(res){
  if(!res) return false;
  // 🔒 OPACA se acepta a propósito: el supabase-js del CDN llega en modo no-cors (status 0,
  //    `ok` falso) y NO se puede inspeccionar. Guardarla es justo lo que hace que el login
  //    funcione sin red (hueco cazado en la auditoría 2026-07-06). Exigirle `ok` lo rompería.
  if(res.type === 'opaque') return true;
  if(!res.ok) return false;              // 404, 500 y todo lo que no sea 2xx
  // 🔴 206 = respuesta PARCIAL. `Response.ok` es true para 200-299, o sea que un trozo de
  //    archivo pasa el filtro obvio. Guardarlo sirve un archivo CORTADO en la siguiente carga.
  if(res.status === 206) return false;
  return true;
}
function _guardar(req, res){
  if(!_guardable(res)) return;
  const cl = res.clone();
  // El `.catch` no estaba: un `put` rechazado (respuesta no cacheable) quedaba como promesa sin
  // atender, o sea ruido en el registro de errores por algo que no es un fallo de la app.
  caches.open(CACHE_NAME).then(ca => ca.put(req, cl)).catch(() => {});
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(url.hostname.includes('supabase.co')){
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return;
  }
  // cdn.jsdelivr.net = supabase-js: sin cachearlo, el login moría offline aunque el shell
  // entero estuviera precacheado (hueco cazado en la auditoría 2026-07-06).
  if(url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('cdn.jsdelivr.net')){
    e.respondWith(caches.match(e.request).then(c => {
      if(c) return c;
      return fetch(e.request).then(r => { _guardar(e.request, r); return r; });
    })); return;
  }
  if(e.request.mode === 'navigate'){
    // Network-first con timeout de 3s: en red lenta (gym) sirve la versión cacheada en vez
    // de dejar pantalla en blanco esperando. Respaldo final al index.html del shell.
    e.respondWith((async () => {
      try {
        // cache:'no-cache' → revalida contra el servidor (ETag/304) en vez de aceptar la
        // copia del caché HTTP (GitHub Pages manda max-age=600 → hasta 10 min de desfase
        // tras cada deploy, Camilo 2026-07-05). Se usa la URL porque construir un fetch
        // con init sobre un request en modo 'navigate' lanza error en Chrome.
        const net = await Promise.race([
          fetch(e.request.url, {cache:'no-cache'}),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        _guardar(e.request, net);
        return net;
      } catch (_e) {
        return (await caches.match(e.request)) || (await caches.match('/apex-app/index.html')) || fetch(e.request);
      }
    })()); return;
  }
  // JS de la app + styles.css: network-first (con respaldo en caché para offline). Es lógica/
  // estilo crítico que DEBE ir sincronizado con index.html; cache-first los dejaba DESFASADOS
  // tras un update (styles.css se quedaba pegado en la versión vieja → "agrandé el texto y
  // sigue igual" de Camilo 2026-06-29). Network-first evita ese desfase y refresca al recargar.
  if(url.origin === self.location.origin && (/\/(app-\d-[\w-]+|avi-core|muscle-map|exercise-muscles)\.js$/.test(url.pathname) || /\/styles\.css$/.test(url.pathname))){
    // cache:'no-cache' → sin él, "network-first" devolvía la copia del caché HTTP
    // (max-age=600 de Pages) hasta 10 min tras un deploy. Con ETag el 304 es barato.
    e.respondWith(
      fetch(e.request, {cache:'no-cache'}).then(r => { _guardar(e.request, r); return r; })
        // Offline: primero la MISMA versión (?v= exacto); si no está (SW recién actualizado
        // sin red), cualquier copia cacheada del archivo antes que pantalla rota.
        .catch(() => caches.match(e.request).then(c => c || caches.match(e.request, {ignoreSearch:true})))
    );
    return;
  }
  // Videos de ejercicio (.mp4): network primero para que las peticiones por rango
  // (range requests, necesarias en iOS Safari) funcionen; respaldo en caché si no hay red.
  if(url.origin === self.location.origin && url.pathname.endsWith('.mp4')){
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Assets del mismo origen (icons, manifest): cache-first y se
  // guardan tras el primer fetch para que funcionen offline.
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => {
    if(url.origin === self.location.origin) _guardar(e.request, r);
    return r;
  })));
});

self.addEventListener('push', e => {
  if(!e.data) return;
  let d = {}; try { d = e.data.json(); } catch { d = {title: 'AVI', body: e.data.text()}; }
  const isMsg = d.type === 'message';
  e.waitUntil(self.registration.showNotification(d.title || 'AVI', {
    body: d.body || '',
    icon: '/apex-app/icons/icon-192.png',
    badge: '/apex-app/icons/icon-192.png',
    vibrate: isMsg ? [200,100,200,100,200] : [200,100,200],
    tag: d.tag || (isMsg ? 'avi-chat-' + (d.chatId || 'x') : 'avi-notif'),
    renotify: true,
    requireInteraction: isMsg,
    data: {type: d.type, chatId: d.chatId}
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  e.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(cls => {
    if(cls.length){
      cls[0].postMessage({type: 'notif-click', chatId: data.chatId, notifType: data.type});
      return cls[0].focus();
    }
    const base = self.registration.scope;
    const url = data.chatId ? base + '?avi-chat=' + data.chatId : base;
    if(clients.openWindow) return clients.openWindow(url);
  }));
});
