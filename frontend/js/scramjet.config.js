(function() {
  self.__scramjet$config = {
    prefix: "/scram-service/",
    codec: self.__scramjet$codecs ? self.__scramjet$codecs.xor : null,
    config: "/js/scramjet.config.js",
    bundle: "/scram/scramjet.bundle.js",
    worker: "/scram/scramjet.worker.js",
    client: "/scram/scramjet.client.js",
    codecs: "/scram/scramjet.codecs.js"
  };
})();
