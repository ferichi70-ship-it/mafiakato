/* С какой секунды начинать трек, когда «Наступает ночь».
   Трек, которого нет в списке, начинается с 10-й секунды (как раньше). */
window.NIGHT_START = {
  "21.mp3": 30,   // Go Fuck Yourself — 0:30
  "22.mp3": 65,   // Where Are U Now — 1:05
  "23.mp3": 13,   // Make It Bun Dem — 0:13
  "24.mp3": 42,   // Sexy Bitch — 0:42
  "25.mp3": 13,   // Baby's On Fire — 0:13
  "26.mp3": 0,    // Like A G6 — 0:00
  "27.mp3": 70,   // Often — 1:10
  "28.mp3": 20,   // Hurt — 0:20
  "29.mp3": 0,    // 140.mzhb — 0:00
  "30.mp3": 0,    // Love Me Hate Me — 0:00
  "31.mp3": 40    // The Hills — 0:40
};
window.nightStartFor = function(src, dur){
  var s = 10;
  try{
    var name = decodeURIComponent(String(src||'').split('?')[0].split('#')[0].split('/').pop());
    if (window.NIGHT_START && Object.prototype.hasOwnProperty.call(window.NIGHT_START, name)) s = window.NIGHT_START[name];
  }catch(_){}
  if (isFinite(dur) && dur > 0) s = Math.min(s, Math.max(0, dur - 0.5));
  return s;
};
