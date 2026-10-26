/* Сохранение музыки на устройстве.
   Песни по одной скачиваются в память браузера (Cache Storage) и потом играют прямо оттуда
   как локальные файлы: старт мгновенный, перемотка в любое место, работает без интернета.
   Плеер вызывает window.musicSrc(url): если песня сохранена — получает локальную ссылку, иначе обычную. */
(function () {
  var CACHE = 'mafia-music-v2';
  var local = {};          // абсолютный url -> blob:url
  window.__blobName = {};  // blob:url -> имя файла (для времени старта ночью)

  function abs(u) { try { return new URL(u, location.href).toString(); } catch (_) { return u; } }
  function nameOf(u) {
    try { return decodeURIComponent(String(u).split('?')[0].split('#')[0].split('/').pop()); } catch (_) { return ''; }
  }

  window.musicSrc = function (u) {
    var b = local[abs(u)];
    return b || u;
  };

  // Убираем старый фоновый загрузчик (sw.js) и его кэш, если он успел установиться.
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { try { r.unregister(); } catch (_) {} }); });
    }
    if (window.caches) caches.delete('mafia-music-v1');
  } catch (_) {}

  if (!window.caches || !window.fetch) return;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}

  var badge = null, hideTimer = null;
  function show(text, autoHide) {
    try {
      if (!badge) {
        badge = document.createElement('div');
        badge.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99999;padding:6px 10px;border-radius:8px;' +
          'background:rgba(0,0,0,.75);color:#fff;font:12px/1.2 system-ui,sans-serif;pointer-events:none;';
        document.body.appendChild(badge);
      }
      badge.textContent = text; badge.style.display = 'block';
      clearTimeout(hideTimer);
      if (autoHide) hideTimer = setTimeout(function () { badge.style.display = 'none'; }, 4000);
    } catch (_) {}
  }

  async function remember(cache, u) {
    var res = await cache.match(u);
    if (!res) return false;
    var blob = await res.blob();
    if (!blob || !blob.size) return false;
    var b = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'audio/mpeg' }));
    local[u] = b; window.__blobName[b] = nameOf(u);
    return true;
  }

  async function run() {
    var list = await fetch('music/list.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
    var urls = list.map(function (it) { return abs(typeof it === 'string' ? 'music/' + encodeURIComponent(it) : it.url); });
    var cache = await caches.open(CACHE);
    var want = {}; urls.forEach(function (u) { want[u] = 1; });
    var keys = await cache.keys();
    for (var k = 0; k < keys.length; k++) { if (!want[keys[k].url]) await cache.delete(keys[k]); }

    // уже сохранённые — сразу делаем локальными
    var missing = [];
    for (var i = 0; i < urls.length; i++) { if (!(await remember(cache, urls[i]))) missing.push(urls[i]); }
    if (!missing.length) return;

    // небольшая пауза, чтобы сначала загрузилась сама страница и текущая песня
    await new Promise(function (r) { setTimeout(r, 4000); });
    var done = urls.length - missing.length;
    for (var j = 0; j < missing.length; j++) {
      show('🎵 Сохраняю музыку на устройство: ' + done + '/' + urls.length, false);
      try {
        var res = await fetch(missing[j], { cache: 'no-store' });
        if (res.ok && res.status === 200) { await cache.put(missing[j], res); await remember(cache, missing[j]); }
      } catch (_) {}
      done++;
    }
    show('🎵 Вся музыка сохранена (' + urls.length + ')', true);
  }

  run().catch(function () {});
})();
