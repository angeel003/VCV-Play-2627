const CACHE_NAME = 'fantasy-vcv-cache-v3';

// Al instalar, saltamos la espera para activar inmediatamente
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Al activar, tomamos el control de las pestañas abiertas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Estrategia: Network First (Red primero, si falla va a caché)
// Esto asegura que SIEMPRE descargue el HTML, CSS y JS más reciente si hay internet
self.addEventListener('fetch', event => {
    // Solo interceptamos peticiones GET (no los POST a Google Apps Script)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Si la red funciona, guardamos un clon en la caché por si luego no hay internet
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // Si falla la red (sin conexión), intentamos sacar de la caché
                return caches.match(event.request);
            })
    );
});

