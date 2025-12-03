importScripts('/scram/scramjet.codecs.js');
importScripts('/scram/scramjet.config.js');
importScripts('/scram/scramjet.bundle.js');
importScripts('/scram/scramjet.worker.js');

const sw = new ScramjetServiceWorker();

self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            if (sw.route(event)) {
                return await sw.fetch(event);
            }
            return await fetch(event.request);
        })()
    );
});
