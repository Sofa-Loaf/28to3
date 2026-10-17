/* Caches only Speak. Other site pages are not controlled:
   this worker is registered with scope speak.html. */
var CACHE = "speak-v1";
var ASSETS = [
  "speak.html",
  "speak.css",
  "speak.js",
  "speak.webmanifest",
  "speak-192.png",
  "speak-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf("speak-") === 0 && key !== CACHE) {
          return caches.delete(key);
        }
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isSpeakAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return /\/speak\.html$/.test(url.pathname) ||
    /\/speak\.css$/.test(url.pathname) ||
    /\/speak\.js$/.test(url.pathname) ||
    /\/speak\.webmanifest$/.test(url.pathname) ||
    /\/speak-192\.png$/.test(url.pathname) ||
    /\/speak-512\.png$/.test(url.pathname);
}

function isHtml(url) {
  return /\/speak\.html$/.test(url.pathname);
}

function store(request, response) {
  if (!response || !response.ok) return;
  var copy = response.clone();
  caches.open(CACHE).then(function (cache) {
    cache.put(request, copy);
  });
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url;
  try {
    url = new URL(event.request.url);
  } catch (err) {
    return;
  }
  if (!isSpeakAsset(url)) return;

  if (isHtml(url)) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        store(event.request, response);
        if (response && response.ok) return response;
        return caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
          return cached || response;
        });
      }).catch(function () {
        return caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
          return cached || new Response("Offline. Open Speak once while online.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(event.request).then(function (response) {
        store(event.request, response);
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || network;
    })
  );
});
