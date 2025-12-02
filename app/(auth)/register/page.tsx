'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n-provider'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
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
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('profile.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setError(t('errors.validationError'))
      return
    }

    if (!name || name.trim().length === 0) {
      setError(t('errors.validationError'))
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('auth.errorOccurred'))
        return
      }

      router.push('/login?registered=true&pending_approval=true')
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
            {t('auth.register')}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t('auth.name')}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.name')}
              required
            />
            
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

            <Input
              label={t('profile.confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.registerButton')}
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              {t('auth.loginButton')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

