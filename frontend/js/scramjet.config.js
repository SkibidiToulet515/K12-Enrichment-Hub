(function() {
  if (typeof self.__scramjet$codecs === 'undefined') {
    self.__scramjet$codecs = {
      plain: { encode: (s) => s, decode: (s) => s },
      base64: { encode: (s) => btoa(unescape(encodeURIComponent(s))), decode: (s) => decodeURIComponent(escape(atob(s))) },
      xor: {
        encode: function(str) {
          if (!str) return str;
          let result = '';
          for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ 2);
          }
          return encodeURIComponent(result);
        },
        decode: function(str) {
          if (!str) return str;
          str = decodeURIComponent(str);
          let result = '';
          for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ 2);
          }
          return result;
        }
      }
    };
  }
  
  self.__scramjet$config = {
    prefix: "/scram-service/",
    codec: self.__scramjet$codecs.xor,
    config: "/js/scramjet.config.js",
    bundle: "/scram/scramjet.bundle.js",
    worker: "/scram/scramjet.worker.js",
    client: "/scram/scramjet.client.js",
    codecs: "/scram/scramjet.codecs.js"
  };
})();
