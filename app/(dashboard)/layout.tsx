import { Navbar } from '@/components/layout/Navbar'
import { requireAuth } from '@/lib/auth-helpers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}

