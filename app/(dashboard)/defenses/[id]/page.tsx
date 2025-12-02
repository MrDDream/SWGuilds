import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { notFound } from 'next/navigation'
import { DefenseForm } from '@/components/defenses/DefenseForm'
import { DefenseViewWrapper } from '@/components/defenses/DefenseViewWrapper'
import { DefensePageTitle } from '@/components/defenses/DefensePageTitle'
import { transformDefense } from '@/lib/transform-defense'

export default async function DefenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireAuth()

  if (id === 'new') {
    return (
      <div className="container mx-auto px-4 py-8">
        <DefensePageTitle />
        <div className="bg-slate-800 rounded-lg p-8">
          <DefenseForm isNew />
        </div>
      </div>
    )
  }

  const defense = await prisma.defense.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { isPublic: true, userId: { not: session.user.id } }
      ]
    },
    include: {
      counters: {
        include: {
          votes: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  if (!defense) {
    notFound()
  }

  const transformedDefense = transformDefense(defense)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-slate-800 rounded-lg p-8">
        <DefenseViewWrapper defense={transformedDefense} />
      </div>
    </div>
  )
}

