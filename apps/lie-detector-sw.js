/* Caches only Lie Detector Scanner files. Other site pages are not controlled:
   this worker is registered with scope lie-detector.html. */
var CACHE = "lie-detector-v1";
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

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url;
  try {
    url = new URL(event.request.url);
  } catch (err) {
    return;
  }
  if (!isToyAsset(url)) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || network;
    })
  );
});
