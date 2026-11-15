/* Режим замеров скорости. Работает ТОЛЬКО если открыть страницу с ?diag=1
   (например pc.html?diag=1). Ничего не меняет в игре и в базе — только измеряет и показывает цифры. */
(function () {
  try { if (!/[?&]diag=1\b/.test(location.search)) return; } catch (_) { return; }

  var stats = { save: [], render: [], refresh: [], longtasks: [], events: [] };
  function now() { return performance.now(); }
  // Data/Game/UI объявлены на странице как const — берём их по имени
  function getG(name) {
    try { if (name === 'Data' && typeof Data !== 'undefined') return Data; } catch (_) {}
    try { if (name === 'Game' && typeof Game !== 'undefined') return Game; } catch (_) {}
    try { if (name === 'UI' && typeof UI !== 'undefined') return UI; } catch (_) {}
    return window[name];
  }
  function wrap(obj, name, bucket) {
    try {
      if (!obj || typeof obj[name] !== 'function' || obj[name].__diag) return false;
      var orig = obj[name];
      var w = function () {
        var t = now();
        try { return orig.apply(this, arguments); }
        finally { bucket.push(now() - t); if (bucket.length > 200) bucket.shift(); }
      };
      w.__diag = true;
      obj[name] = w;
      return true;
    } catch (_) { return false; }
  }
  // Data.save могут переобернуть позже — проверяем периодически
  setInterval(function () {
    try { wrap(getG('Data'), 'save', stats.save); } catch (_) {}
    try { wrap(getG('Game'), 'render', stats.render); } catch (_) {}
    try { wrap(getG('UI'), 'refreshAll', stats.refresh); } catch (_) {}
  }, 1000);

  try {
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) { stats.longtasks.push(e.duration); if (stats.longtasks.length > 300) stats.longtasks.shift(); });
    }).observe({ entryTypes: ['longtask'] });
  } catch (_) {}
  try {
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) {
        if (e.duration < 100) return;
        var t = e.target, label = '';
        try { label = (t && (t.id ? '#' + t.id : '') + ' ' + ((t.textContent || t.value || '').trim().slice(0, 30))) || e.name; } catch (_) { label = e.name; }
        stats.events.push({ ms: Math.round(e.duration), type: e.name, what: label });
        if (stats.events.length > 30) stats.events.shift();
      });
    }).observe({ type: 'event', buffered: true, durationThreshold: 100 });
  } catch (_) {}

  function agg(a) {
    if (!a.length) return '—';
    var s = 0, m = 0; a.forEach(function (x) { s += x; if (x > m) m = x; });
    return 'в среднем ' + Math.round(s / a.length) + ' мс, максимум ' + Math.round(m) + ' мс (' + a.length + ' раз)';
  }
  function sizeInfo() {
    try {
      var D = getG('Data'); var st = (D && D.state) || {};
      var full = JSON.stringify(st).length;
      var hist = JSON.stringify(st.history || []).length;
      var sign = JSON.stringify(st.signups || {}).length;
      return 'база: ' + (full / 1e6).toFixed(2) + ' МБ (история: ' + (hist / 1e6).toFixed(2) + ' МБ, ' + (st.history || []).length +
        ' игр; запись на игры: ' + (sign / 1e6).toFixed(2) + ' МБ; игроков: ' + (st.players || []).length + ')';
    } catch (e) { return 'база: ?'; }
  }
  function report() {
    var lt = stats.longtasks, ltSum = 0, ltMax = 0;
    lt.forEach(function (x) { ltSum += x; if (x > ltMax) ltMax = x; });
    var lines = [
      'ЗАМЕРЫ СКОРОСТИ (' + new Date().toLocaleString() + ')',
      navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''),
      sizeInfo(),
      'сохранение (Data.save): ' + agg(stats.save),
      'перерисовка игры (Game.render): ' + agg(stats.render),
      'перерисовка всего (UI.refreshAll): ' + agg(stats.refresh),
      'зависания страницы: ' + lt.length + ' шт., всего ' + Math.round(ltSum) + ' мс, самое долгое ' + Math.round(ltMax) + ' мс',
      'медленные нажатия (>100 мс):'
    ];
    stats.events.slice(-12).forEach(function (e) { lines.push('  ' + e.ms + ' мс — ' + e.type + ' ' + e.what); });
    return lines.join('\n');
  }

  function panel() {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;background:#111;color:#fff;font:12px/1.35 system-ui,sans-serif;' +
      'padding:8px 10px;border-radius:8px;max-width:360px;white-space:pre-wrap;box-shadow:0 2px 10px rgba(0,0,0,.4);opacity:.92';
    var txt = document.createElement('div');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = 'Скопировать замеры';
    btn.style.cssText = 'margin-top:6px;padding:4px 8px;border-radius:6px;border:0;background:#4c8bf5;color:#fff;cursor:pointer';
    btn.onclick = function () {
      var r = report();
      try { navigator.clipboard.writeText(r).then(function () { btn.textContent = 'Скопировано ✓'; setTimeout(function () { btn.textContent = 'Скопировать замеры'; }, 1500); }); }
      catch (_) { window.prompt && prompt('Скопируйте:', r); }
    };
    box.appendChild(txt); box.appendChild(btn);
    document.body.appendChild(box);
    setInterval(function () {
      var lt = stats.longtasks, ltMax = 0; lt.forEach(function (x) { if (x > ltMax) ltMax = x; });
      txt.textContent = '🔧 Режим замеров\n' + sizeInfo() + '\nсохранение: ' + agg(stats.save) + '\nперерисовка: ' + agg(stats.render) +
        '\nзависаний: ' + lt.length + ', самое долгое ' + Math.round(ltMax) + ' мс';
    }, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', panel); else panel();
})();
