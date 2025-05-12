// Service Worker for Push Notifications

// Cache name for offline support
const CACHE_NAME = 'employee-management-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/favicon.ico',
        '/dashboard',
        '/admin-dashboard'
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: claiming clients');
      return self.clients.claim();
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Service Worker: Push data', data);
      
      const options = {
        body: data.body || 'New notification',
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        data: data.data || { url: '/dashboard' },
        vibrate: [100, 50, 100],
        timestamp: data.timestamp || Date.now(),
        tag: data.tag || 'default',
        renotify: data.tag ? true : false,
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'Notification', options)
      );
    } catch (error) {
      console.error('Service Worker: Error processing push data', error);
      
      // Show a generic notification if JSON parsing fails
      event.waitUntil(
        self.registration.showNotification('New Notification', {
          body: 'You have a new notification',
          icon: '/favicon.ico',
          data: { url: '/dashboard' }
        })
      );
    }
  }
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  // Close the notification
  event.notification.close();
  
  // Get the notification data
  const data = event.notification.data || {};
  const url = data.url || '/dashboard';
  
  // Handle notification click - focus or open window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(url, self.location.origin);
        
        // If the pathname matches, focus that client
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open with the URL, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Fetch event - network first, then cache strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the response is valid, clone it and store it in the cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(() => {
        // If the network request fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});