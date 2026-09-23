// K-Learner - Service Worker (PWA)
const CACHE_NAME = "klearner-pwa-v7";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("Deleting old cache:", key);
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // GETリクエスト以外はキャッシュしない
  if (event.request.method !== "GET") {
    return;
  }

  const url = event.request.url;

  // ローカル開発環境、HTMLナビゲーション、Supabase、機械翻訳、RSS、外部API等は常にリアルタイム通信（キャッシュ回避）
  if (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    event.request.mode === "navigate" ||
    url.includes("supabase.co") ||
    url.includes("googleapis.com") ||
    url.includes("translate") ||
    url.includes("workers.dev") ||
    url.includes("/api/") ||
    url.includes("rss") ||
    url.includes("news")
  ) {
    return;
  }

  // ネットワーク優先 (Network First, fallback to cache)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          (response.type === "basic" || response.type === "cors")
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
