'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function DynamicTitle() {
  const pathname = usePathname()

  useEffect(() => {
    // Charger le nom de l'instance et mettre à jour le titre
    const updateTitle = () => {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          const instanceName = data.instanceName || 'SWGuilds'
          document.title = `SWGuilds - ${instanceName}`
        })
        .catch(() => {
          // En cas d'erreur, utiliser le titre par défaut
          document.title = 'SWGuilds'
        })
    }

    // Mettre à jour immédiatement
    updateTitle()

    // Écouter les changements de visibilité de l'onglet pour mettre à jour le titre
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTitle()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname]) // Se mettre à jour à chaque changement de route

  return null
}

