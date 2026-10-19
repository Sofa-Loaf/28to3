/* Caches only Lie Detector Scanner files. Other site pages are not controlled:
   this worker is registered with scope lie-detector.html. */
var CACHE = "lie-detector-v2";
var ASSETS = [
  "lie-detector.html",
  "lie-detector.css",
  "lie-detector.js",
  "lie-detector/manifest.json",
  "lie-detector/icon.svg",
  "lie-detector/icon-192.png",
  "lie-detector/icon-512.png",
  "lie-detector/apple-touch-icon.png"
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
        if (key.indexOf("lie-detector-") === 0 && key !== CACHE) {
          return caches.delete(key);
        }
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isToyAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return /\/lie-detector\.html$/.test(url.pathname) ||
    /\/lie-detector\.css$/.test(url.pathname) ||
    /\/lie-detector\.js$/.test(url.pathname) ||
    /\/lie-detector\/[^/]+$/.test(url.pathname);
}

function isHtmlNavigation(request, url) {
  return request.mode === "navigate" ||
    request.destination === "document" ||
    /\.html$/.test(url.pathname);
}

function putInCache(request, response) {
  if (!response || !response.ok) return;
  var copy = response.clone();
  var stored = request.mode === "navigate"
    ? new Request(request.url, { method: "GET" })
    : request;
  caches.open(CACHE).then(function (cache) {
    return cache.put(stored, copy);
  }).catch(function () {});
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url;
  try {
    url = new URL(event.request.url);
  } catch (err) {
    return;
  }
  if (!isToyAsset(url)) return;

  if (isHtmlNavigation(event.request, url)) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.ok) {
          putInCache(event.request, response);
          return response;
        }
        return caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
          return cached || response;
        });
      }).catch(function () {
        return caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
          if (cached) return cached;
          return new Response("Offline", {
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
        putInCache(event.request, response);
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || network;
    })
  );
});
