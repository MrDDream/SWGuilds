'use client'

import { useEffect, useState } from 'react'

export function ServiceWorkerRegistration() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Vérifier si le service worker est supporté
    if ('serviceWorker' in navigator) {
      // Enregistrer le service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker enregistré avec succès:', registration.scope)
          
          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nouveau service worker disponible
                  console.log('Nouveau service worker disponible')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Erreur lors de l\'enregistrement du service worker:', error)
        })

      // Écouter les changements d'état du service worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }

    // Gérer l'événement beforeinstallprompt pour l'installation PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher l'affichage automatique du prompt
      e.preventDefault()
      // Stocker l'événement pour l'utiliser plus tard
      setDeferredPrompt(e)
      setIsInstalled(false)
    }

    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Écouter l'événement appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('PWA installée')
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Fonction pour déclencher l'installation (peut être appelée depuis un bouton)
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Afficher le prompt d'installation
    deferredPrompt.prompt()

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('L\'utilisateur a accepté l\'installation')
    } else {
      console.log('L\'utilisateur a refusé l\'installation')
    }

    // Réinitialiser le prompt
    setDeferredPrompt(null)
  }

  // Ce composant ne rend rien visuellement
  // Vous pouvez ajouter un bouton d'installation si vous le souhaitez
  return null
}

