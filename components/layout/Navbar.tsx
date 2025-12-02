'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useEffect, useState, useRef } from 'react'
import { useI18n } from '@/lib/i18n-provider'

export function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { t } = useI18n()
  const [isAdmin, setIsAdmin] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [instanceName, setInstanceName] = useState('SWGuilds')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoError, setLogoError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const floatingButtonRef = useRef<HTMLButtonElement>(null)

  // Charger les settings (logo et nom) même si l'utilisateur n'est pas connecté
  useEffect(() => {
    const loadSettings = () => {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          if (data.instanceName) {
            setInstanceName(data.instanceName)
          }
          if (data.logoUrl) {
            // Ajouter un timestamp pour forcer le rechargement de l'image
            const logoWithTimestamp = `${data.logoUrl}?t=${Date.now()}`
            setLogoUrl(logoWithTimestamp)
            setLogoError(false) // Réinitialiser l'erreur lors du chargement
          } else {
            setLogoUrl(null)
          }
        })
        .catch(() => {})
    }
    
    loadSettings()
    // Recharger les settings toutes les 5 secondes pour détecter les changements de logo (fallback)
    const interval = setInterval(loadSettings, 5000)
    
    // Écouter l'événement personnalisé pour mise à jour immédiate du logo
    const handleLogoUpdate = (event: CustomEvent<{ logoUrl: string | null }>) => {
      if (event.detail.logoUrl) {
        // Ajouter un timestamp unique pour forcer le rechargement de l'image
        const logoWithTimestamp = `${event.detail.logoUrl}?t=${Date.now()}`
        setLogoUrl(logoWithTimestamp)
        setLogoError(false)
      } else {
        setLogoUrl(null)
      }
    }
    
    window.addEventListener('logoUpdated', handleLogoUpdate as EventListener)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('logoUpdated', handleLogoUpdate as EventListener)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Vérifier le rôle depuis la session
      const role = session.user?.role
      setIsAdmin(role === 'admin')
      
      // Si le rôle n'est pas dans la session, vérifier via l'API
      if (!role) {
        fetch('/api/admin/check')
          .then(res => res.json())
          .then(data => setIsAdmin(data.isAdmin))
          .catch(() => setIsAdmin(false))
      }

      // Charger l'avatar
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.avatarUrl) {
            setAvatarUrl(data.avatarUrl)
          }
        })
        .catch(() => {})
    } else {
      setIsAdmin(false)
      setAvatarUrl(null)
    }
  }, [session, status])

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
      // Ne pas fermer le menu mobile si le clic est sur le bouton flottant
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        if (floatingButtonRef.current && floatingButtonRef.current.contains(event.target as Node)) {
          return // Ne pas fermer si le clic est sur le bouton flottant
        }
        setShowMobileMenu(false)
      }
    }

    if (showProfileMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu, showMobileMenu])

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 max-w-7xl mx-auto">
          {/* Logo à gauche */}
          <div className="flex-shrink-0">
            <Link 
              href="/news" 
              className="flex items-center gap-3 md:gap-4 text-gray-900 dark:text-white hover:opacity-90 transition-opacity"
            >
              {logoUrl && !logoError ? (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center overflow-hidden border-2 border-gray-300 dark:border-slate-600 shadow-md">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border-2 border-gray-300 dark:border-slate-600 shadow-md">
                  <span className="text-lg md:text-xl font-bold text-blue-400">
                    {instanceName[0]?.toUpperCase() || 'S'}
                  </span>
                </div>
              )}
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {instanceName}
              </span>
            </Link>
          </div>
          
          {/* Menus centrés */}
          {session && (
            <div className="flex-1 hidden md:flex justify-center items-center gap-2">
                <Link 
                  href="/news" 
                  className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        pathname === '/news' 
                          ? 'text-gray-900 dark:text-white bg-gradient-to-r from-blue-600/30 to-purple-600/30 dark:from-blue-600/30 dark:to-purple-600/30 shadow-md border border-blue-500/30 dark:border-blue-500/30' 
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-slate-800 dark:hover:to-slate-700 hover:shadow-md'
                  }`}
                >
                  <span className="relative z-10">{t('navbar.news')}</span>
                  <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-opacity duration-200 ${
                    pathname === '/news' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}></span>
                </Link>
                <Link 
                  href="/defenses" 
                  className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    pathname?.startsWith('/defenses')
                      ? 'text-white bg-gradient-to-r from-blue-600/30 to-purple-600/30 shadow-md border border-blue-500/30' 
                      : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:shadow-md'
                  }`}
                >
                  <span className="relative z-10">{t('navbar.defenses')}</span>
                  <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-opacity duration-200 ${
                    pathname?.startsWith('/defenses') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}></span>
                </Link>
                <Link 
                  href="/map" 
                  className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    pathname === '/map'
                      ? 'text-white bg-gradient-to-r from-blue-600/30 to-purple-600/30 shadow-md border border-blue-500/30' 
                      : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:shadow-md'
                  }`}
                >
                  <span className="relative z-10">{t('navbar.map')}</span>
                  <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-opacity duration-200 ${
                    pathname === '/map' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}></span>
                </Link>
                <Link 
                  href="/gestion" 
                  className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    pathname === '/gestion'
                      ? 'text-white bg-gradient-to-r from-blue-600/30 to-purple-600/30 shadow-md border border-blue-500/30' 
                      : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:shadow-md'
                  }`}
                >
                  <span className="relative z-10">{t('navbar.gestion')}</span>
                  <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-opacity duration-200 ${
                    pathname === '/gestion' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}></span>
                </Link>
                <Link 
                  href="/monsters" 
                  className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    pathname === '/monsters'
                      ? 'text-white bg-gradient-to-r from-blue-600/30 to-purple-600/30 shadow-md border border-blue-500/30' 
                      : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:shadow-md'
                  }`}
                >
                  <span className="relative z-10">{t('navbar.monsters')}</span>
                  <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-opacity duration-200 ${
                    pathname === '/monsters' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}></span>
                </Link>
                <Link 
                  href="/calendar" 
                  className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    pathname === '/calendar'
                      ? 'text-white bg-gradient-to-r from-blue-600/30 to-purple-600/30 shadow-md border border-blue-500/30' 
                      : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:shadow-md'
                  }`}
                >
                  <span className="relative z-10">{t('navbar.calendar')}</span>
                  <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-opacity duration-200 ${
                    pathname === '/calendar' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}></span>
                </Link>
            </div>
          )}
          
          {/* Profil à droite */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {session && (
              <>
                {/* Menu profil desktop */}
                <div className="hidden md:block relative" ref={menuRef}>
                        <button
                          type="button"
                          onClick={() => setShowProfileMenu(!showProfileMenu)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profil"
                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-300 dark:border-slate-600"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border-2 border-gray-300 dark:border-slate-600">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {(session.user?.name || session.user?.identifier || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
                            {session.user?.name || session.user?.identifier}
                          </span>
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-2xl z-50 border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {t('navbar.profile')}
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t('navbar.admin')}
                          </Link>
                        )}
                        <div className="border-t border-gray-200 dark:border-slate-700 my-1"></div>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowProfileMenu(false)
                            await signOut({ redirect: false })
                            if (typeof window !== 'undefined') {
                              window.location.href = `${window.location.origin}/login`
                            }
                          }}
                          className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          {t('auth.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Bouton menu mobile */}
                <button
                  type="button"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  aria-label="Menu"
                >
                  {showMobileMenu ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                {/* Avatar mobile */}
                {!showMobileMenu && (
                  <div className="md:hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profil"
                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-300 dark:border-slate-600"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border-2 border-gray-300 dark:border-slate-600">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {(session.user?.name || session.user?.identifier || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Menu mobile */}
        {session && showMobileMenu && (
            <div ref={mobileMenuRef} className="md:hidden border-t border-gray-200 dark:border-slate-700 py-4 space-y-1" onClick={(e) => {
              // Fermer le menu si on clique sur un lien
              if ((e.target as HTMLElement).tagName === 'A') {
                setShowMobileMenu(false)
              }
            }}>
            <Link
              href="/news"
              className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              {t('navbar.news')}
            </Link>
            <Link
              href="/defenses"
              className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              {t('navbar.defenses')}
            </Link>
            <Link
              href="/map"
              className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              {t('navbar.map')}
            </Link>
            <Link
              href="/gestion"
              className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              {t('navbar.gestion')}
            </Link>
            <Link
              href="/monsters"
              className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              {t('navbar.monsters')}
            </Link>
            <Link
              href="/calendar"
              className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              {t('navbar.calendar')}
            </Link>
                <div className="border-t border-gray-200 dark:border-slate-700 pt-2 mt-2">
              <Link
                href="/profile"
                className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                {t('navbar.profile')}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="block px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  {t('navbar.admin')}
                </Link>
              )}
              <button
                type="button"
                onClick={async () => {
                  setShowMobileMenu(false)
                  await signOut({ redirect: false })
                  if (typeof window !== 'undefined') {
                    window.location.href = `${window.location.origin}/login`
                  }
                }}
                    className="w-full text-left px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {t('auth.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bouton flottant mobile pour ouvrir la navbar */}
      {session && (
        <button
          ref={floatingButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const newState = !showMobileMenu
            setShowMobileMenu(newState)
            // Si on ouvre le menu, scroller vers le haut pour afficher le menu
            if (newState) {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
          className="md:hidden fixed bottom-4 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition-colors"
          aria-label="Menu"
        >
          {showMobileMenu ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      )}
    </nav>
  )
}

