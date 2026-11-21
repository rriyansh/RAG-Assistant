self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.mode !== "navigate" || url.origin !== self.location.origin ||
      url.pathname.startsWith("/api/") || event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    "<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Reso Agent offline</title><body><main><h1>You’re offline</h1><p>Reconnect to access Reso Agent.</p><a href='/'>Try again</a></main></body></html>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  )));
});
