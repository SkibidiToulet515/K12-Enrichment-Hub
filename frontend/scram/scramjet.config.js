(function() {
  self.__scramjet$config = {
    prefix: "/scramjet/",
    codec: self.__scramjet$codecs ? self.__scramjet$codecs.plain : { encode: function(s) { return s; }, decode: function(s) { return s; } },
    config: "/scram/scramjet.config.js",
    bundle: "/scram/scramjet.bundle.js",
    worker: "/scram/scramjet.worker.js",
    client: "/scram/scramjet.client.js",
    codecs: "/scram/scramjet.codecs.js"
  };
})();
