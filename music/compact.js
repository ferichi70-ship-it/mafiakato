/* Сжатие истории игр. Включается ТОЛЬКО по адресу pc.html?compact=1.
   1) Скачивает полную резервную копию базы файлом.
   2) В играх старше 7 дней оставляет только то, что нужно для выдачи ролей и дневного рейтинга:
      дата, номер, время, победитель, MVP и для каждого игрока: id, место, роль, команда, очки.
      Удаляются подробности (ночная сетка, отметки, снимки стола).
   3) Сохраняет сжатую базу. */
(function () {
  try { if (!/[?&]compact=1\b/.test(location.search)) return; } catch (_) { return; }
  var KEEP_DAYS = 7;

  function getData() {
    try { if (typeof Data !== 'undefined') return Data; } catch (_) {}
    return window.Data;
  }
  function size(x) { try { return JSON.stringify(x).length; } catch (_) { return 0; } }
  function mb(n) { return (n / 1e6).toFixed(2) + ' МБ'; }

  function compactGame(g) {
    return {
      date: g.date, number: g.number, num: g.num, name: g.name,
      timestamp: g.timestamp, winnerTeam: g.winnerTeam,
      mvpId: g.mvpId || null, mvpBonus: g.mvpBonus || 0,
      compacted: true,
      players: (g.players || []).map(function (p) {
        return { playerId: p.playerId || '', seat: p.seat, role: p.role || '', team: p.team || '', score: (typeof p.score === 'number' ? p.score : 0) };
      })
    };
  }

  function plan(D) {
    var H = (D.state && D.state.history) || [];
    var cutoff = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
    var old = 0, recent = 0;
    var next = H.map(function (g) {
      var ts = Number(g && g.timestamp) || 0;
      if (ts && ts >= cutoff) { recent++; return g; }
      if (g && g.compacted) { old++; return g; }
      old++; return compactGame(g || {});
    });
    return { next: next, old: old, recent: recent };
  }

  function download(obj) {
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    var d = new Date();
    a.download = 'mafiakato-backup-' + d.toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  function ui() {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;background:#111;color:#fff;' +
      'font:14px/1.4 system-ui,sans-serif;padding:12px 14px;border-radius:10px;max-width:420px;box-shadow:0 4px 16px rgba(0,0,0,.5)';
    var info = document.createElement('div');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = 'Скачать копию и сжать историю';
    btn.style.cssText = 'margin-top:8px;padding:6px 10px;border-radius:8px;border:0;background:#e2574c;color:#fff;font-weight:600;cursor:pointer';
    box.appendChild(info); box.appendChild(btn); document.body.appendChild(box);

    function refresh() {
      var D = getData();
      if (!D || !D.state || !Array.isArray(D.state.history)) { info.textContent = 'Сначала войдите — жду загрузки данных…'; btn.disabled = true; return; }
      var p = plan(D);
      info.textContent = 'Сейчас база: ' + mb(size(D.state)) + ', история: ' + D.state.history.length + ' игр (' + mb(size(D.state.history)) + ').\n' +
        'Будет сжато игр: ' + p.old + ' (старше ' + KEEP_DAYS + ' дней). Полностью останутся: ' + p.recent + '.\n' +
        'После сжатия история ≈ ' + mb(size(p.next)) + '.';
      info.style.whiteSpace = 'pre-wrap';
      btn.disabled = !p.old;
    }
    var iv = setInterval(refresh, 1500); refresh();

    btn.onclick = function () {
      var D = getData(); if (!D || !D.state) return;
      var p = plan(D);
      var ok = window.confirm(
        'Будет сжато ' + p.old + ' игр старше ' + KEEP_DAYS + ' дней.\n\n' +
        'Останется: дата, номер, победитель, MVP, и для каждого игрока — место, роль, команда, очки (этого хватает для выдачи ролей и дневного рейтинга).\n' +
        'Удалится: подробная ночная сетка и снимки стола старых игр. Рейтинги за месяц/год будут неточными.\n\n' +
        'Сначала скачается полная резервная копия базы файлом. Отменить сжатие на сайте нельзя — только восстановить из этого файла.\n\nПродолжить?');
      if (!ok) return;
      try { download(D.state); } catch (e) { alert('Не удалось скачать резервную копию — сжатие отменено.'); return; }
      setTimeout(function () {
        var ok2 = window.confirm('Файл резервной копии скачался? (проверьте папку «Загрузки»)\n\nНажмите OK, чтобы сжать историю.');
        if (!ok2) return;
        D.state.history = plan(D).next;
        try { D.save(); } catch (e) { alert('Ошибка сохранения: ' + (e && e.message || e)); return; }
        clearInterval(iv);
        info.textContent = 'Готово. История сжата: ' + D.state.history.length + ' игр, ' + mb(size(D.state.history)) + '. Обновите страницу без ?compact=1.';
        btn.remove();
      }, 1500);
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();
})();
