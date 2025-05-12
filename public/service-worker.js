// Service Worker for Push Notifications and Real-time Updates

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: data.data || {},
      actions: data.actions || [],
      vibrate: [100, 50, 100],
      timestamp: data.timestamp || Date.now(),
      tag: data.tag || 'default',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notification', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Handle notification click
  const urlToOpen = event.notification.data.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open with the URL, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});