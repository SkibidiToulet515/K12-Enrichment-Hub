importScripts("/scram/scramjet.bundle.js");
importScripts("/scram/scramjet.codecs.js");
importScripts("/scram/scramjet.config.js");

const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
  if (scramjet.route(event)) {
    return await scramjet.fetch(event);
  }
  return await fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
