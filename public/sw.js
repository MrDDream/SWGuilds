// Service Worker minimal pour PWA
// Ce service worker permet l'installation de l'application mais ne met pas en cache les ressources

const CACHE_NAME = 'swguilds-v1'
const urlsToCache = [
  '/',
  '/manifest.json',
]

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache ouvert')
        // Ne mettre en cache que le manifest pour permettre l'installation
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors de la mise en cache', error)
      })
  )
  // Forcer l'activation immédiate du nouveau service worker
  self.skipWaiting()
})

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Prendre le contrôle de toutes les pages immédiatement
  return self.clients.claim()
})

// Intercepter les requêtes (mais ne pas mettre en cache pour l'instant)
self.addEventListener('fetch', (event) => {
  // Laisser toutes les requêtes passer sans cache
  // L'application nécessite une connexion Internet pour fonctionner
  event.respondWith(fetch(event.request))
})

