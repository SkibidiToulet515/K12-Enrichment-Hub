importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');
importScripts('/uv/uv.sw.js');

const sw = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            try {
                if (sw.route(event)) {
                    return await sw.fetch(event);
                }
                return await fetch(event.request);
            } catch (err) {
                console.error('Service worker fetch error:', err);
                return new Response('Proxy error: ' + err.message, { status: 500 });
            }
        })()
    );
});

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
