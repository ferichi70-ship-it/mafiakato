/* Этот файл только удаляет из браузера старый фоновый загрузчик музыки, если он был установлен. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => { e.waitUntil(self.registration.unregister().catch(() => {})); });
