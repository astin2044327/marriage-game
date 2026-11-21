const CACHE = "marriage-game-v18";
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css?v=18",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./js/safe.js?v=18",
  "./js/cards.js?v=18",
  "./js/storage.js?v=18",
  "./js/live-room.js?v=18",
  "./js/avatar.js?v=18",
  "./js/marriage-calc.js?v=18",
  "./js/callbreak-calc.js?v=18",
  "./js/callbreak-play.js?v=18",
  "./js/marriage-play.js?v=18",
  "./js/app.js?v=18"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
