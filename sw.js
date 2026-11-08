// Cache khusus aplikasi Yusa. Nama beda dari aplikasi lain di domain yang sama.
var PREFIX = "yusa-belanja-";
var CACHE = PREFIX + "v1";
var FILES = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

// Hanya hapus cache lama milik Yusa sendiri, cache aplikasi lain tidak disentuh.
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Network-first untuk file sendiri (update langsung kebaca), cache sebagai cadangan offline.
// Request ke Google Apps Script (beda domain) tidak pernah di-cache.
// Pencarian cache selalu di cache Yusa saja (bukan semua cache di domain).
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) {
        return c.match(e.request).then(function (r) { return r || c.match("index.html"); });
      });
    })
  );
});
