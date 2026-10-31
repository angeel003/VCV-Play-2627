// Service Worker de Fantasy VCV
// Escucha y muestra notificaciones Push nativas (RFC 8291 / RFC 8292)

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
    console.log('[SW] Push recibido:', event);

    let title = '🏐 Fantasy VCV';
    let body = '¡Tienes una nueva actualización de partido en VCV Play!';
    let payloadData = { url: '/dev.html' };

    if (event.data) {
        try {
            const data = event.data.json();
            if (data.title) title = data.title;
            if (data.body) body = data.body;
            if (data.data) payloadData = data.data;
        } catch (e) {
            try {
                const text = event.data.text();
                if (text) body = text;
            } catch(e2) {}
        }
    }

    const options = {
        body: body,
        icon: 'files/images/icon_192.png',
        badge: 'files/images/icon_192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: payloadData,
        tag: 'vcv-match-alert-' + Date.now(),
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dev.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes('dev.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
