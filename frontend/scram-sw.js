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
      
      if (scramjet && scramjet.route && scramjet.route(event)) {
        return await scramjet.fetch(event);
      }
      
      const encodedPath = url.pathname.slice(self.__scramjet$config.prefix.length);
      const decodedUrl = self.__scramjet$config.codec.decode(encodedPath);
      
      const proxyUrl = `/api/proxy/fetch?url=${encodeURIComponent(decodedUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return response;
    } catch (err) {
      console.error('Scramjet fetch error:', err);
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Proxy Error</title></head>
        <body style="background:#1a1a2e;color:#fff;font-family:sans-serif;padding:40px;">
          <h1>Proxy Error</h1>
          <p>${err.message}</p>
          <p style="color:#888;">Try using Ultraviolet (UV) engine instead - it has better compatibility.</p>
          <button onclick="history.back()" style="padding:10px 20px;cursor:pointer;">Go Back</button>
        </body>
        </html>
      `, { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  })());
});
