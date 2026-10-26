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
    var name = (window.__blobName && window.__blobName[src]) || decodeURIComponent(String(src||'').split('?')[0].split('#')[0].split('/').pop());
    if (window.NIGHT_START && Object.prototype.hasOwnProperty.call(window.NIGHT_START, name)) s = window.NIGHT_START[name];
  }catch(_){}
  if (isFinite(dur) && dur > 0) s = Math.min(s, Math.max(0, dur - 0.5));
  return s;
};

/* Длительность треков (сек) — чтобы плеер не скачивал все песни сразу ради неё. */
window.TRACK_DUR = {"1.mp3": 202.5, "2.mp3": 143.0, "3.mp3": 227.8, "4.mp3": 324.9, "5.mp3": 221.7, "6.mp3": 218.5, "7.mp3": 224.2, "8.mp3": 193.9, "9.mp3": 175.1, "10.mp3": 181.3, "11.mp3": 173.4, "12.mp3": 258.4, "13.mp3": 205.4, "14.mp3": 214.4, "15.mp3": 217.9, "16.mp3": 166.4, "17.mp3": 238.6, "18.mp3": 203.8, "19.mp3": 200.1, "20.mp3": 216.1, "21.mp3": 240.4, "22.mp3": 250.4, "23.mp3": 213.8, "24.mp3": 195.9, "25.mp3": 236.9, "26.mp3": 216.9, "27.mp3": 249.1, "28.mp3": 145.2, "29.mp3": 161.9, "30.mp3": 186.6, "31.mp3": 242.3};
