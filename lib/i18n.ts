import frTranslations from '@/locales/fr.json'
import enTranslations from '@/locales/en.json'

type Translations = typeof frTranslations

const translations: Record<string, Translations> = {
  fr: frTranslations,
  en: enTranslations,
}

/**
 * Get all translations for a specific locale
 */
export function getTranslations(locale: string = 'fr'): Translations {
  return translations[locale] || translations.fr
}

/**
 * Get a translated string by key path (e.g., "common.loading" or "auth.login")
 */
export function t(key: string, locale: string = 'fr', params?: Record<string, string> | { returnObjects?: boolean }): string | any {
  const translations = getTranslations(locale)
  const keys = key.split('.')
  
  let value: any = translations
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Return the key if translation not found
      return key
    }
  }
  
  // Handle returnObjects option
  if (params && typeof params === 'object' && 'returnObjects' in params && params.returnObjects) {
    return value
  }
  
  // Handle string interpolation
  if (typeof value === 'string' && params && !('returnObjects' in params)) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return (params as Record<string, string>)[paramKey] || match
    })
  }
  
  return typeof value === 'string' ? value : key
}

/**
 * Get the locale from environment variable or default to 'fr'
 * Note: This is mainly for server-side. Client-side should use I18nProvider.
 */
export function getLocale(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('locale') || 'fr'
  }
  return process.env.LOCALE || 'fr'
}

