const xorDecode = function(str) {
  if (!str) return str;
  try {
    str = decodeURIComponent(str);
  } catch (e) {}
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ 2);
  }
  return result;
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const prefix = "/scram-service/";
  
  if (!url.pathname.startsWith(prefix)) {
    return;
  }
  
  event.respondWith((async () => {
    try {
      const encodedPath = url.pathname.slice(prefix.length);
      console.log('Scramjet SW - encoded path:', encodedPath);
      
      const decodedUrl = xorDecode(encodedPath);
      console.log('Scramjet SW - decoded URL:', decodedUrl);
      
      if (!decodedUrl || (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://'))) {
        throw new Error('Invalid decoded URL: ' + decodedUrl);
      }
      
      const proxyUrl = `/api/proxy/fetch?url=${encodeURIComponent(decodedUrl)}`;
      console.log('Scramjet SW - proxy URL:', proxyUrl);
      
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
