importScripts("/js/scramjet.config.js");
importScripts("/scram/scramjet.codecs.js");
importScripts("/scram/scramjet.bundle.js");

let scramjet = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  if (!url.pathname.startsWith(self.__scramjet$config.prefix)) {
    return;
  }
  
  event.respondWith((async () => {
    try {
      if (!scramjet && typeof ScramjetServiceWorker !== 'undefined') {
        scramjet = new ScramjetServiceWorker();
      }
      
      if (scramjet && scramjet.route(event)) {
        return await scramjet.fetch(event);
      }
      
      const encodedPath = url.pathname.slice(self.__scramjet$config.prefix.length);
      const decodedUrl = self.__scramjet$config.codec.decode(encodedPath);
      
      const response = await fetch(decodedUrl, {
        method: event.request.method,
        headers: event.request.headers,
        body: event.request.method !== 'GET' && event.request.method !== 'HEAD' ? event.request.body : undefined,
        credentials: 'omit',
        redirect: 'follow'
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (err) {
      console.error('Scramjet fetch error:', err);
      return new Response('Proxy error: ' + err.message, { status: 500 });
    }
  })());
});
