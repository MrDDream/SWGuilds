'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useI18n } from '@/lib/i18n-provider'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { locale, setLocale, t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferredLocale, setPreferredLocale] = useState<string>('fr')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingJson, setUploadingJson] = useState(false)
  const [lastJsonUpload, setLastJsonUpload] = useState<Date | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [regeneratingApiKey, setRegeneratingApiKey] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'informations' | 'json' | 'settings'>('informations')

  useEffect(() => {
    // Charger les données du profil
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setIdentifier(data.identifier)
          setName(data.name || '')
          setAvatarUrl(data.avatarUrl)
          setPreferredLocale(data.preferredLocale || 'fr')
          setLastJsonUpload(data.lastJsonUpload ? new Date(data.lastJsonUpload) : null)
          setApiKey(data.apiKey || null)
        }
      })
      .catch(err => {
        console.error('Erreur lors du chargement du profil:', err)
      })
  }, [session])

  const handleSubmitInformations = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (password && password !== confirmPassword) {
      setError(t('profile.passwordMismatch'))
      setLoading(false)
      return
    }

    try {
      const updateData: { password?: string; name?: string | null } = {}
      if (name !== undefined) {
        updateData.name = name.trim() || null
      }
      if (password && password.trim().length > 0) {
        updateData.password = password
      }

      if (Object.keys(updateData).length === 0) {
        setError(t('profile.noChanges'))
        setLoading(false)
        return
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.user) {
          setName(result.user.name || '')
        }
        setSuccess(t('profile.profileUpdated'))
        setPassword('')
        setConfirmPassword('')
        await update()
        // Faire disparaître le message après 3 secondes
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || t('errors.updateError'))
      }
    } catch (err) {
      setError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const updateData: { preferredLocale?: string | null } = {
        preferredLocale: preferredLocale || 'fr'
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.user) {
          if (result.user.preferredLocale !== undefined) {
            setPreferredLocale(result.user.preferredLocale || 'fr')
            // Mettre à jour le contexte i18n immédiatement
            setLocale(result.user.preferredLocale || 'fr')
            if (typeof window !== 'undefined') {
              localStorage.setItem('locale', result.user.preferredLocale || 'fr')
            }
          }
        }
        setSuccess(t('profile.settingsUpdated'))
        // Mettre à jour la session pour refléter les changements (incluant preferredLocale)
        await update()
        // Faire disparaître le message après 3 secondes
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || t('errors.updateError'))
      }
    } catch (err) {
      setError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 mt-4">{t('profile.title')}</h1>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8">
        {/* Onglets */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('informations')}
            className={`px-4 sm:px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'informations'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            {t('profile.tabs.informations')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-4 sm:px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'json'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            {t('profile.tabs.json')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 sm:px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            {t('profile.tabs.settings')}
          </button>
        </div>

        {/* Contenu de l'onglet Informations */}
        {activeTab === 'informations' && (
          <>
            {/* Section photo de profil */}
            <div className="mb-8 pb-8 border-b border-gray-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {t('profile.avatar')}
              </label>
              <div className="flex items-center gap-6">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Photo de profil"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center border-2 border-gray-300 dark:border-slate-600">
                    <span className="text-4xl text-gray-600 dark:text-gray-400">
                      {(session?.user?.name || session?.user?.identifier || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setUploading(true)
                      setError('')
                      const formData = new FormData()
                      formData.append('avatar', file)

                      try {
                        const response = await fetch('/api/user/profile/upload', {
                          method: 'POST',
                          body: formData,
                        })

                        const data = await response.json()

                        if (!response.ok) {
                          setError(data.error || t('errors.loadError'))
                          return
                        }

                        setAvatarUrl(data.avatarUrl)
                        setSuccess(t('profile.avatarUpdated'))
                        await update()
                        setTimeout(() => setSuccess(''), 3000)
                      } catch (err) {
                        setError(t('errors.loadError'))
                      } finally {
                        setUploading(false)
                        // Réinitialiser l'input
                        e.target.value = ''
                      }
                    }}
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? t('common.uploading') : avatarUrl ? t('profile.changeAvatar') : t('profile.changeAvatar')}
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(t('profile.deleteAvatarConfirm'))) return
                        
                        setUploading(true)
                        setError('')
                        
                        try {
                          // Mettre à jour avatarUrl à null
                          const response = await fetch('/api/user/profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ avatarUrl: null }),
                          })

                          if (response.ok) {
                            setAvatarUrl(null)
                            setSuccess(t('profile.avatarRemoved'))
                            await update()
                            setTimeout(() => setSuccess(''), 3000)
                          } else {
                            const data = await response.json()
                            setError(data.error || t('errors.deleteError'))
                          }
                        } catch (err) {
                          setError(t('errors.deleteError'))
                        } finally {
                          setUploading(false)
                        }
                      }}
                      className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      disabled={uploading}
                    >
                      {t('profile.removeAvatar')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitInformations} className="space-y-6">
              <div>
                <Input
                  label={t('profile.identifier')}
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="JohnCena"
                  disabled
                  className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <Input
                  label={t('profile.pseudo')}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('profile.pseudo')}
                />
              </div>

              <div>
                <Input
                  label={t('profile.newPassword')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('profile.passwordPlaceholder')}
                />
              </div>

              <div>
                <Input
                  label={t('profile.confirmPassword')}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

            <div className="flex gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? t('common.updating') : t('common.update')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/news')}
                >
                  {t('common.cancel')}
                </Button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 dark:bg-green-900/50 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}
            </form>
          </>
        )}

        {/* Contenu de l'onglet Json & API */}
        {activeTab === 'json' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.jsonFile')}
              </label>
              {lastJsonUpload && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.lastUpload')}: {lastJsonUpload.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="json-upload"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  // Demander confirmation avant l'upload
                  if (!confirm(t('profile.uploadJsonConfirm'))) {
                    e.target.value = ''
                    return
                  }

                  setUploadingJson(true)
                  setError('')
                  const formData = new FormData()
                  formData.append('json', file)

                  try {
                    const response = await fetch('/api/user/profile/upload-json', {
                      method: 'POST',
                      body: formData,
                    })

                    const data = await response.json()

                    if (!response.ok) {
                      setError(data.error || t('errors.loadError'))
                      return
                    }

                    setSuccess(t('profile.jsonUploaded'))
                    setLastJsonUpload(new Date())
                    setTimeout(() => setSuccess(''), 3000)
                  } catch (err) {
                    setError(t('errors.loadError'))
                  } finally {
                    setUploadingJson(false)
                    // Réinitialiser l'input
                    e.target.value = ''
                  }
                }}
              />
              <label
                htmlFor="json-upload"
                className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingJson ? t('common.uploading') : t('profile.uploadJson')}
              </label>
            </div>
            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            {/* Section Clé API */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.apiKey')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {t('profile.apiKeyDescription')}
              </p>
              
              {apiKey ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={apiKey}
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(apiKey)
                            setSuccess(t('profile.apiKeyCopied'))
                            setTimeout(() => setSuccess(''), 3000)
                          } catch (err) {
                            setError(t('errors.generic'))
                          }
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        {t('profile.copyApiKey')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          if (!confirm(t('profile.regenerateApiKeyConfirm'))) {
                            return
                          }

                          setRegeneratingApiKey(true)
                          setError('')
                          
                          try {
                            const response = await fetch('/api/user/profile', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ action: 'regenerateApiKey' }),
                            })

                            const data = await response.json()

                            if (!response.ok) {
                              setError(data.error || t('errors.generic'))
                              return
                            }

                            setApiKey(data.apiKey)
                            setSuccess(t('profile.apiKeyRegenerated'))
                            setTimeout(() => setSuccess(''), 3000)
                          } catch (err) {
                            setError(t('errors.generic'))
                          } finally {
                            setRegeneratingApiKey(false)
                          }
                        }}
                        disabled={regeneratingApiKey}
                        className="flex-1 sm:flex-none"
                      >
                        {regeneratingApiKey ? t('common.uploading') : t('profile.regenerateApiKey')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('profile.apiKeyNotGenerated')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contenu de l'onglet Paramètres */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSubmitSettings} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('common.language')}
              </label>
              <select
                value={preferredLocale}
                onChange={(e) => setPreferredLocale(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fr">{t('common.french')}</option>
                <option value="en">{t('common.english')}</option>
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('common.applyAfterSave')}
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? t('common.updating') : t('common.update')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/news')}
              >
                {t('common.cancel')}
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/50 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

