/* Service worker voor de CTF Artiest-omgeving: ontvangt web-push en opent de app. */

self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
    const title = data.title || 'Café Theater Festival';
    const options = {
        body: data.body || '',
        icon: '/logo192.png',
        badge: '/notification-badge.png',
        data: { url: data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if ('focus' in client) {
                    if ('navigate' in client) { client.navigate(url); }
                    return client.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(url);
            return undefined;
        })
    );
});
