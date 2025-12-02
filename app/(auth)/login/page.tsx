'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n-provider'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [instanceName, setInstanceName] = useState('SWGuilds')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    // Charger les settings (logo et nom)
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.instanceName) {
          setInstanceName(data.instanceName)
        }
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl)
        }
      })
      .catch(() => {})

    const params = new URLSearchParams(window.location.search)
    if (params.get('registered') === 'true') {
      if (params.get('pending_approval') === 'true') {
        setInfo(t('auth.pendingApproval'))
      } else {
        setInfo(t('auth.accountCreated'))
      }
    }
    if (params.get('error') === 'not_approved') {
      setError(t('auth.notApproved'))
    }
  }, [t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        identifier,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes('approuvé')) {
          setError(t('auth.notApproved'))
        } else {
          setError(t('auth.incorrectCredentials'))
        }
      } else {
        router.push('/news')
        router.refresh()
      }
    } catch (err) {
      setError(t('auth.errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo et nom de l'instance */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {logoUrl && !logoError ? (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-gray-300 dark:border-slate-600">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center border-2 border-gray-300 dark:border-slate-600">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {instanceName[0]?.toUpperCase() || 'S'}
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {instanceName}
          </h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            {t('auth.login')}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t('auth.email')}
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="JohnCena"
            />
            
            <Input
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {info && (
              <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg">
                {info}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.loginButton')}
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-block break-words">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

