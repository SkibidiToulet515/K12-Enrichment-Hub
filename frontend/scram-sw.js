importScripts("/scram/scramjet.codecs.js");
importScripts("/js/scramjet.config.js");
importScripts("/scram/scramjet.bundle.js");

let scramjet;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (!scramjet) {
    scramjet = new ScramjetServiceWorker();
  }
  
  if (scramjet.route(event)) {
    event.respondWith(scramjet.fetch(event));
  }
});
