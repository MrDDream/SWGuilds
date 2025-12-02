'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function DynamicFavicon() {
  const pathname = usePathname()

  useEffect(() => {
    // Toujours mettre à jour le favicon (même sans logoUrl dans settings, il cherchera logo.*)
    const updateFavicon = () => {
      const timestamp = Date.now()
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (link) {
        link.href = `/api/favicon?t=${timestamp}`
      } else {
        // Créer un nouveau lien favicon
        const newLink = document.createElement('link')
        newLink.rel = 'icon'
        newLink.type = 'image/png'
        newLink.href = `/api/favicon?t=${timestamp}`
        document.head.appendChild(newLink)
      }
    }
    
    // Mettre à jour immédiatement
    updateFavicon()
    
    // Écouter les changements de visibilité de l'onglet pour mettre à jour le favicon
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateFavicon()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname]) // Se mettre à jour à chaque changement de route

  return null
}

