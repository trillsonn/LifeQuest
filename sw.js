// Memaster Service Worker - Complete Offline Support
const CACHE_NAME = 'memaster-v1.4.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // External resources that we need
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // Cache the main app content
  '/?source=pwa',
  '/?homescreen=1'
];

// Install event - cache all resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching app files');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('📂 Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // Otherwise fetch from network and cache it
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback - serve the main app for any HTML requests
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        
        // For other requests, you could return a custom offline page
        return new Response('Offline - Please check your connection', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

// Handle background sync for future enhancements
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-tasks') {
    console.log('🔄 Service Worker: Background sync triggered');
    // Future: Could sync with server when back online
  }
});

// Handle push notifications for future enhancements
self.addEventListener('push', (event) => {
  console.log('📢 Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Task reminder from Memaster',
    icon: './manifest.json',
    badge: './manifest.json',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'Open Memaster',
        icon: './manifest.json'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './manifest.json'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Memaster', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Skip waiting when requested
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Memaster Service Worker: Loaded and ready for complete offline use!'); 