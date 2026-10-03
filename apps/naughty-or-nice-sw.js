/* Caches only Naughty or Nice Scanner files. Other site pages are not controlled:
   this worker is registered with scope naughty-or-nice.html. */
var CACHE = "naughty-or-nice-v3";
var ASSETS = [
  "naughty-or-nice.html",
  "naughty-or-nice.css",
  "naughty-or-nice.js",
  "naughty-or-nice/manifest.json",
  "naughty-or-nice/icon.svg",
  "naughty-or-nice/icon-192.png",
  "naughty-or-nice/icon-512.png",
  "naughty-or-nice/apple-touch-icon.png",
  "naughty-or-nice/art/elf-terminal.webp",
  "naughty-or-nice/art/santa-nice.webp",
  "naughty-or-nice/art/santa-naughty.webp",
  "naughty-or-nice/art/seal.webp"
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
        if (key.indexOf("naughty-or-nice-") === 0 && key !== CACHE) {
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
  return /\/naughty-or-nice\.html$/.test(url.pathname) ||
    /\/naughty-or-nice\.css$/.test(url.pathname) ||
    /\/naughty-or-nice\.js$/.test(url.pathname) ||
    /\/naughty-or-nice\/art\/[^/]+$/.test(url.pathname) ||
    /\/naughty-or-nice\/[^/]+$/.test(url.pathname);
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
