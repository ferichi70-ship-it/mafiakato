/* Правила ночных смертей для ролей Бронежилет и Телохранитель (pc.html).
   Хранится в той же папке, что и другие подключаемые скрипты сайта.

   Флаги в сетке ночи (cg.grid[игрок].nights[n]):
     shot  — мафия стреляет в игрока        heal — Врач лечит игрока
     guard — Телохранитель охраняет игрока  hook — Путана путанит игрока
     maniac — Маньяк убивает игрока
   Вычисляемые флаги (пересчитываются автоматически):
     guarded   — выстрел мафии в этого игрока принял на себя Телохранитель
     guardDied — Телохранитель погиб этой ночью, закрыв собой цель
     vestSaved — Бронежилет спас игрока от выстрела мафии (срабатывает один раз за игру)

   Правила:
   - Врач вылечил цель выстрела -> все живы (Телохранитель не погибает, бронежилет не тратится).
   - Телохранитель охраняет цель, мафия стреляет в цель, Врач не лечил -> цель жива, Телохранитель погибает.
     Не работает, если Телохранитель мёртв к началу ночи или его запутала Путана. Себя охранять нельзя.
   - Бронежилет: первый выстрел мафии (не вылеченный и не перехваченный Телохранителем) не убивает.
   - От Маньяка ни Бронежилет, ни Телохранитель не защищают. */
(function () {
  var GUARD_ROLE = 'Телохранитель';
  var VEST_ROLE = 'Бронежилет';

  function keyOf(p) { return p.playerId || ('seat' + p.seat); }

  function rawShotKills(s) {
    return !!s && ((s.shot && !s.heal && !s.guarded && !s.vestSaved) || !!s.guardDied);
  }

  function hasRole(cg, name) {
    return (cg.players || []).some(function (p) { return p && p.role === name; });
  }

  function recompute(cg) {
    if (!cg || !cg.grid || !Array.isArray(cg.players)) return;
    var players = cg.players;
    // очистить вычисляемые флаги
    Object.keys(cg.grid).forEach(function (k) {
      var r = cg.grid[k];
      (r && r.nights || []).forEach(function (s) {
        if (!s) return;
        if (s.guarded) delete s.guarded;
        if (s.guardDied) delete s.guardDied;
        if (s.vestSaved) delete s.vestSaved;
      });
    });
    if (!hasRole(cg, GUARD_ROLE) && !hasRole(cg, VEST_ROLE)) return;

    var vestUsed = {};
    for (var n = 0; n < 8; n++) {
      var aliveAtStart = function (p) {
        var r = cg.grid[keyOf(p)];
        if (!r || !r.nights) return false;
        for (var i = 0; i < n; i++) {
          var s = r.nights[i];
          if (s && (rawShotKills(s) || s.maniac)) return false;
        }
        var lyn = r.lynch;
        if (lyn === 'исключен') return false;
        var nl = Number(lyn || 0);
        if (nl && nl < n + 1) return false;
        return true;
      };
      // Телохранитель
      players.forEach(function (g) {
        if (!g || g.role !== GUARD_ROLE) return;
        var gk = keyOf(g), gr = cg.grid[gk];
        var gs = gr && gr.nights && gr.nights[n];
        if (!gs || gs.hook || !aliveAtStart(g)) return;
        players.forEach(function (t) {
          var tk = keyOf(t);
          if (tk === gk) return;
          var ts = cg.grid[tk] && cg.grid[tk].nights && cg.grid[tk].nights[n];
          if (ts && ts.guard && ts.shot && !ts.heal && !ts.guarded) {
            ts.guarded = true;
            gs.guardDied = true;
          }
        });
      });
      // Бронежилет
      players.forEach(function (v) {
        if (!v || v.role !== VEST_ROLE) return;
        var vk = keyOf(v);
        if (vestUsed[vk]) return;
        var vs = cg.grid[vk] && cg.grid[vk].nights && cg.grid[vk].nights[n];
        if (!vs || !aliveAtStart(v)) return;
        if (vs.shot && !vs.heal && !vs.guarded) { vs.vestSaved = true; vestUsed[vk] = true; }
      });
    }
  }

  var lastSig = null, lastCg = null;
  function signature(cg) {
    var parts = [];
    (cg.players || []).forEach(function (p) {
      var r = cg.grid && cg.grid[keyOf(p)];
      var line = keyOf(p) + ':' + (p.role || '') + ':' + (r ? r.lynch : '') + ':';
      (r && r.nights || []).forEach(function (s) {
        s = s || {};
        line += (s.shot ? 1 : 0) + '' + (s.heal ? 1 : 0) + (s.guard ? 1 : 0) + (s.hook ? 1 : 0) + (s.maniac ? 1 : 0) +
          (s.guarded ? 1 : 0) + (s.guardDied ? 1 : 0) + (s.vestSaved ? 1 : 0) + '|';
      });
      parts.push(line);
    });
    return parts.join(';');
  }

  function ensure() {
    try {
      var cg = (window.Data && Data.state) ? Data.state.currentGame : null;
      if (!cg || !cg.grid) return;
      // В игре нет Телохранителя и Бронежилета — пересчитывать нечего (раз очистим старые отметки и выходим)
      if (!hasRole(cg, GUARD_ROLE) && !hasRole(cg, VEST_ROLE)) {
        if (lastCg !== cg || lastSig !== 'none') { recompute(cg); lastCg = cg; lastSig = 'none'; }
        return;
      }
      var sig = signature(cg);
      if (cg === lastCg && sig === lastSig) return;
      recompute(cg);
      lastCg = cg; lastSig = signature(cg);
    } catch (_) {}
  }

  window.NightRules = {
    GUARD_ROLE: GUARD_ROLE,
    VEST_ROLE: VEST_ROLE,
    recompute: recompute,
    ensure: ensure,
    // убивает ли игрока этой ночью выстрел мафии (с учётом Врача, Телохранителя, Бронежилета)
    shotKills: function (s) { ensure(); return rawShotKills(s); }
  };
})();
