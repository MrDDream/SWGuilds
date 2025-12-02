'use client'

import { SessionProvider } from 'next-auth/react'
import { I18nProvider } from '@/lib/i18n-provider'

export function Providers({ 
  children,
  locale 
}: { 
  children: React.ReactNode
  locale?: string
}) {
  return (
    <SessionProvider>
      <I18nProvider locale={locale}>
        {children}
      </I18nProvider>
    </SessionProvider>
  )
}

