// 푸시 수신·클릭만 한다. 캐시는 건드리지 않는다 (오래된 화면이 남는 문제를 만들지 않으려고).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data && event.data.text() }; }
  const title = d.title || '둥지';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/app-icon-180.png?v=5',
    badge: '/app-icon-180.png?v=5',
    data: { url: d.url || '/' },
    tag: d.tag || undefined,
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url.includes(url) && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(url);
  })());
});
