(function() {
  self.__scramjet$config = {
    prefix: "/scram-service/",
    codec: self.__scramjet$codecs ? self.__scramjet$codecs.xor : { encode: (s) => btoa(s), decode: (s) => atob(s) },
    config: "/js/scramjet.config.js",
    bundle: "/scram/scramjet.bundle.js",
    worker: "/scram/scramjet.worker.js",
    client: "/scram/scramjet.client.js",
    codecs: "/scram/scramjet.codecs.js",
    wasm: "/scram/scramjet.wasm.js"
  };
})();
