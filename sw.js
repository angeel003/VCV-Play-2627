self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body || 'Tienes un nuevo aviso de Fantasy VCV',
                icon: 'files/images/icon_192.png',
                badge: 'files/images/icon_192.png',
                vibrate: [200, 100, 200, 100, 200, 100, 200],
                data: data.data || { url: '/' }
            };

            event.waitUntil(
                self.registration.showNotification(data.title || 'Fantasy VCV', options)
            );
        } catch (e) {
            // Si no es JSON
            event.waitUntil(
                self.registration.showNotification('Fantasy VCV', {
                    body: event.data.text(),
                    icon: 'files/images/icon_192.png'
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // Si la notificación trae una URL en su data, la abrimos
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    } else {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
