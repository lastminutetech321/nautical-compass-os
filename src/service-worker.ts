/// <reference lib="webworker" />

import { cleanupOldCaches } from "workbox-precaching";

const CACHE_NAME = "nautical-compass-v1";
const RUNTIME_CACHE = "nautical-compass-runtime";

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico"
];

const NEVER_CACHE_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/user/,
  /\/api\/profile/,
  /\/api\/dashboard/,
  /\/api\/packets/,
  /\/api\/.*\?.*userId/,
  /\/api\/.*\?.*token/
];

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  (self as any).skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  cleanupOldCaches();
  (self as any).clients.claim();
});

function shouldNeverCache(url: string): boolean {
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldNeverCache(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.method !== "GET" || url.origin !== location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseToCache));
        return response;
      });
    })
  );
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      )
    );
  }
});
