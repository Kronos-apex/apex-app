const CACHE_NAME = 'apex-v102';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(url.hostname.includes('supabase.co')){
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return;
  }
  if(url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')){
    e.respondWith(caches.match(e.request).then(c => {
      if(c) return c;
      return fetch(e.request).then(r => { const cl = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(e.request, cl)); return r; });
    })); return;
  }
  if(e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request).then(r => { const cl = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(e.request, cl)); return r; }).catch(() => caches.match(e.request))); return;
  }
  // apex-core.js: network-first (con respaldo en caché para offline). Es lógica crítica
  // que DEBE ir sincronizada con index.html; cache-first la dejaba desfasada tras un update
  // y colgaba el arranque. Network-first evita ese desfase.
  if(url.origin === self.location.origin && url.pathname.endsWith('apex-core.js')){
    e.respondWith(
      fetch(e.request).then(r => { const cl = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(e.request, cl)); return r; })
        .catch(() => caches.match(e.request))
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
    if(r.ok && url.origin === self.location.origin){ const cl = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(e.request, cl)); }
    return r;
  })));
});

self.addEventListener('push', e => {
  if(!e.data) return;
  let d = {}; try { d = e.data.json(); } catch { d = {title: 'APEX', body: e.data.text()}; }
  const isMsg = d.type === 'message';
  e.waitUntil(self.registration.showNotification(d.title || 'APEX', {
    body: d.body || '',
    icon: '/apex-app/icons/icon-192.png',
    badge: '/apex-app/icons/icon-192.png',
    vibrate: isMsg ? [200,100,200,100,200] : [200,100,200],
    tag: d.tag || (isMsg ? 'apex-chat-' + (d.chatId || 'x') : 'apex-notif'),
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
    const url = data.chatId ? base + '?apex-chat=' + data.chatId : base;
    if(clients.openWindow) return clients.openWindow(url);
  }));
});
