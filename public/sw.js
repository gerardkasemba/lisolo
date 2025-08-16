// public/sw.js
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  const data = event.data.json();
  console.log('Push data:', data);
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/notification-icon.png', // 196x196px PNG
  });
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();
  event.waitUntil(clients.openWindow('/')); // Add deep linking later if needed
});