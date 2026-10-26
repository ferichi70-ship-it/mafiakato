/* Старый фоновый загрузчик музыки отключён: этот файл удаляет его из браузера.
   Музыка теперь сохраняется через music/offline.js и играет напрямую из памяти браузера. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { await self.registration.unregister(); } catch (_) {}
    try {
      const list = await self.clients.matchAll({ type: 'window' });
      // не перезагружаем страницы, чтобы не прерывать игру — со следующего открытия SW уже не будет
      void list;
    } catch (_) {}
  })());
});
