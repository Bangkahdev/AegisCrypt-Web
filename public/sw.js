/* AegisCrypt service worker: caches the app shell and the hashed build assets
 * so the UI opens cold without a network. All cryptography stays local;
 * nothing is ever sent to a server. */

const CACHE_NAME = "aegiscrypt-v2";
const APP_SHELL = ["/", "/index.html", "/theme-init.js", "/favicon.svg", "/manifest.webmanifest"];

const readPrecacheManifest = async () => {
  try {
    const response = await fetch("/precache-manifest.json", { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.assets)
      ? data.assets.filter((asset) => typeof asset === "string")
      : [];
  } catch {
    return [];
  }
};

const precache = async () => {
  const cache = await caches.open(CACHE_NAME);
  const urls = Array.from(new Set([...APP_SHELL, ...(await readPrecacheManifest())]));
  await Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)));
};

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const putInCache = (request, response) => {
  if (!response || !response.ok || response.type === "opaque") return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(request, response);
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request, { ignoreVary: true })) ||
            (await caches.match("/index.html", { ignoreVary: true })) ||
            (await caches.match("/", { ignoreVary: true })) ||
            Response.error(),
        ),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreVary: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        putInCache(request, response);
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
