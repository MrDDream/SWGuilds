'use client'

import { DefenseForm } from '@/components/defenses/DefenseForm'
import { useI18n } from '@/lib/i18n-provider'

export default function NewDefensePage() {
  const { t } = useI18n()
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">{t('defenses.newDefense')}</h1>
      <div className="bg-slate-800 rounded-lg p-8">
        <DefenseForm isNew />
      </div>
    </div>
  )
}

