/* 司南·典籍阁 Service Worker — 离线缓存 v20260813h */
'use strict';
const CACHE = 'djg-v20260813-h';
const SHELL = ['./', './css/style.css', './js/app.js', './data/registry.json', './manifest.json', './icon.svg', './img/changming-archive-hall-v3.webp'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Shell（index + CSS + JS + registry）：缓存优先，后台更新
  if (path.endsWith('/') || path.endsWith('index.html') ||
      path.endsWith('style.css') || path.endsWith('app.js') ||
      path.endsWith('registry.json') || path.endsWith('manifest.json') ||
      path.endsWith('icon.svg') || path.endsWith('changming-archive-hall-v3.webp') ||
      path.includes('/img/covers/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(cached => {
          const networkFetch = fetch(req).then(r => {
            if (r && r.ok) cache.put(req, r.clone());
            return r;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // JSON 文本数据 & 搜索索引：stale-while-revalidate（有缓存立刻返回，同时后台刷新）
  if (path.includes('/data/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fresh = fetch(req).then(r => {
            if (r && r.ok) cache.put(req, r.clone());
            return r;
          }).catch(() => cached);
          return cached || fresh;
        })
      )
    );
  }
});
