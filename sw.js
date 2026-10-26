/* Сохранение музыки на устройстве.
   Перехватывает ТОЛЬКО запросы к music/*.mp3. Всё остальное (страницы, Firebase) идёт как обычно.
   Песни скачиваются в фоне по одной и потом отдаются из памяти браузера мгновенно,
   с поддержкой перемотки (Range-запросы). */
const CACHE = 'mafia-music-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function isMusic(url) {
  return url.origin === self.location.origin && /\/music\/[^/]+\.mp3$/i.test(url.pathname);
}

async function rangeResponse(cached, rangeHeader) {
  const blob = await cached.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
  let start = 0, end = size - 1;
  if (m) {
    if (m[1] === '' && m[2] !== '') { start = Math.max(0, size - parseInt(m[2], 10)); }
    else {
      start = parseInt(m[1] || '0', 10);
      if (m[2] !== '') end = Math.min(size - 1, parseInt(m[2], 10));
    }
  }
  if (start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!isMusic(url)) return;
  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req.url);
      if (cached) {
        const range = req.headers.get('range');
        if (range) return rangeResponse(cached, range);
        return cached;
      }
    } catch (_) {}
    return fetch(req);
  })());
});

let running = false;
async function precache(urls, client) {
  if (running) return;
  running = true;
  const cache = await caches.open(CACHE);
  const want = new Set(urls);
  // удаляем старые версии песен, которых больше нет в списке
  for (const r of await cache.keys()) { if (!want.has(r.url)) await cache.delete(r); }
  let done = 0;
  for (const u of urls) {
    try {
      if (!(await cache.match(u))) {
        const res = await fetch(u, { cache: 'no-store' });
        if (res.ok && res.status === 200) await cache.put(u, res);
      }
    } catch (_) {}
    done++;
    try { client && client.postMessage({ type: 'music-progress', done, total: urls.length }); } catch (_) {}
  }
  running = false;
}

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'precache-music' && Array.isArray(d.urls)) {
    e.waitUntil(precache(d.urls, e.source));
  }
});
