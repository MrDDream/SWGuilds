'use client'

import { useI18n } from '@/lib/i18n-provider'

export function AdminPageTitle() {
  const { t } = useI18n()
  return <h1 className="text-3xl font-bold text-white mb-8">{t('admin.title')}</h1>
}

