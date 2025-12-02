import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { getLocale } from '@/lib/i18n'
import { DynamicFavicon } from '@/components/layout/DynamicFavicon'
import { DynamicTitle } from '@/components/layout/DynamicTitle'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'SWGuilds',
  description: 'Gestionnaire de guildes pour Summoners War: Sky Arena',
  icons: {
    icon: '/api/favicon',
    apple: '/icons/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SWGuilds',
  },
}

export const viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = getLocale()
  
  return (
    <html lang={locale} className="dark">
      <head>
        <DynamicFavicon />
        <DynamicTitle />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SWGuilds" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.add('dark');
              })();
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
        <Providers locale={locale}>
          <ServiceWorkerRegistration />
          {children}
        </Providers>
      </body>
    </html>
  )
}

