/* Подключает сохранение музыки на устройстве (sw.js) и показывает прогресс в углу экрана. */
(function () {
  if (!('serviceWorker' in navigator) || !window.caches) return;
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

  navigator.serviceWorker.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type !== 'music-progress') return;
    if (d.done < d.total) show('🎵 Сохраняю музыку на устройство: ' + d.done + '/' + d.total, false);
    else show('🎵 Вся музыка сохранена (' + d.total + ')', true);
  });

  navigator.serviceWorker.register('sw.js').then(function () {
    return navigator.serviceWorker.ready;
  }).then(function (reg) {
    return fetch('music/list.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (list) {
      var urls = list.map(function (it) {
        var u = typeof it === 'string' ? 'music/' + encodeURIComponent(it) : it.url;
        return new URL(u, location.href).toString();
      });
      var sw = reg.active || navigator.serviceWorker.controller;
      if (!sw) return;
      // небольшая пауза, чтобы сначала загрузилась сама страница и текущая песня
      setTimeout(function () { sw.postMessage({ type: 'precache-music', urls: urls }); }, 4000);
    });
  }).catch(function () {});
})();
