// github.io ya no sirve la app (11-oct-2026): este service worker reemplaza al de la app en los
// teléfonos que la tenían instalada aquí. Borra lo que la app había guardado, se da de baja y recarga
// las ventanas abiertas para que vean la página «AVI se mudó» en vez de una copia vieja de la app.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try { var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k); })); } catch (x) {}
    try { await self.registration.unregister(); } catch (x) {}
    try {
      var cs = await self.clients.matchAll({ type: 'window' });
      cs.forEach(function (c) { try { c.navigate(c.url); } catch (x) {} });
    } catch (x) {}
  })());
});
