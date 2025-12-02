import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminPageTitle } from '@/components/admin/AdminPageTitle'

export default async function AdminPage() {
  await requireAdmin()

  const usersData = await prisma.user.findMany({
      select: {
        id: true,
        identifier: true,
        name: true,
        role: true,
        isApproved: true,
        lastLogin: true,
        avatarUrl: true,
        canEditAllDefenses: true,
        canEditMap: true,
        canEditAssignments: true,
        canEditNews: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            defenses: true,
            logs: true,
          }
        }
      },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const logsData = await prisma.activityLog.findMany({
    include: {
      user: {
        select: {
          id: true,
          identifier: true,
          name: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  })

  // Convertir les dates en strings
  const users = usersData.map(user => ({
    ...user,
    lastLogin: user.lastLogin?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }))

  const logs = logsData.map(log => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminPageTitle />
      <div className="bg-slate-800 rounded-lg p-8">
        <AdminPanel initialUsers={users} initialLogs={logs} />
      </div>
    </div>
  )
}

