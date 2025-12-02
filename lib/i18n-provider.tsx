'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getLocale, getTranslations, t as translateFunction } from './i18n'

type Translations = ReturnType<typeof getTranslations>

type LocaleContextType = {
  locale: string
  setLocale: (locale: string) => void
  refreshLocale: () => void
  t: (key: string, params?: Record<string, string> | { returnObjects?: boolean }) => string | any
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function I18nProvider({ 
  children, 
  locale: initialLocale 
}: { 
  children: ReactNode
  locale?: string 
}) {
  const { data: session, status } = useSession()
  const [localeVersion, setLocaleVersion] = useState(0)
  const [locale, setLocaleState] = useState<string>(() => {
    // Initialiser avec la locale depuis le localStorage ou la prop ou l'env (LOCALE du .env)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('locale') || initialLocale || getLocale()
    }
    return initialLocale || getLocale()
  })
  const [translations, setTranslations] = useState<Translations>(getTranslations(locale))

  // Mettre à jour la locale quand la session change et contient preferredLocale
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Récupérer preferredLocale depuis la session (peut être null)
      const sessionLocale = (session.user as any).preferredLocale
      // Si preferredLocale existe dans la session (même si null), l'utiliser
      // Sinon, utiliser le localStorage ou la valeur par défaut
      if (sessionLocale !== undefined) {
        // Utiliser preferredLocale de la session (peut être null, auquel cas on utilise 'fr')
        const localeToUse = sessionLocale || 'fr'
        setLocaleState(localeToUse)
        if (typeof window !== 'undefined') {
          localStorage.setItem('locale', localeToUse)
        }
        // Forcer le re-render
        setLocaleVersion(prev => prev + 1)
      } else {
        // Si pas de preferredLocale dans la session, utiliser le localStorage ou la valeur par défaut
        if (typeof window !== 'undefined') {
          const storedLocale = localStorage.getItem('locale')
          if (storedLocale) {
            setLocaleState(storedLocale)
          } else {
            // Utiliser la locale par défaut 'fr' si rien n'est stocké
            const defaultLocale = 'fr'
            setLocaleState(defaultLocale)
            localStorage.setItem('locale', defaultLocale)
          }
        } else {
          // Côté serveur, utiliser la locale par défaut
          setLocaleState('fr')
        }
      }
    } else if (status === 'unauthenticated') {
      // Si déconnecté, utiliser la locale du localStorage ou la valeur par défaut
      const storedLocale = typeof window !== 'undefined' ? localStorage.getItem('locale') : null
      if (storedLocale) {
        setLocaleState(storedLocale)
      } else {
        // Utiliser la locale par défaut 'fr' si rien n'est stocké
        const defaultLocale = 'fr'
        setLocaleState(defaultLocale)
        if (typeof window !== 'undefined') {
          localStorage.setItem('locale', defaultLocale)
        }
      }
    }
  }, [session, status])

  // Mettre à jour les traductions quand la locale change
  useEffect(() => {
    setTranslations(getTranslations(locale))
  }, [locale])

  const t = (key: string, params?: Record<string, string> | { returnObjects?: boolean }) => {
    return translateFunction(key, locale, params)
  }

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale)
    }
    // Forcer le re-render en incrémentant la version
    setLocaleVersion(prev => prev + 1)
  }

  const refreshLocale = () => {
    // Recharger la locale depuis localStorage ou session
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('locale')
      if (storedLocale) {
        setLocaleState(storedLocale)
      }
    }
    if (status === 'authenticated' && session?.user) {
      const sessionLocale = (session.user as any).preferredLocale
      if (sessionLocale) {
        setLocaleState(sessionLocale)
      }
    }
    // Forcer le re-render
    setLocaleVersion(prev => prev + 1)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, refreshLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function useLocale() {
  const context = useContext(LocaleContext)
  return context?.locale || 'fr'
}

