'use client'

import { useEffect } from 'react'

export function ThemeScript() {
  useEffect(() => {
    // Initialiser le thème au chargement de la page
    const storedTheme = localStorage.getItem('theme') || 'dark'
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(storedTheme)
  }, [])

  return null
}

