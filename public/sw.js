// K-Learner - Service Worker (PWA) v13
const CACHE_NAME = "klearner-pwa-v13";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // すべての古いキャッシュを完全消去
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // ★ HTMLページ（ナビゲーション）はService Workerで一切キャッシュしない！常に生通信！
  if (
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.url.endsWith(".html") ||
    event.request.url.endsWith("/") ||
    (event.request.url.includes("koreanews.seronworks.dev") && !event.request.url.includes("."))
  ) {
    return;
  }

  // GETリクエスト以外もスルー
  if (event.request.method !== "GET") {
    return;
  }

  const url = event.request.url;

  // Supabase、機械翻訳、RSS、外部API等は常にリアルタイム通信
  if (
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

  // 静的アセット（画像等）のみフォールバックキャッシュ
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
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
