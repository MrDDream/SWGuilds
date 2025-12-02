import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const entityType = searchParams.get('entityType')
    const action = searchParams.get('action')

    const where: any = {}
    if (entityType) {
      where.entityType = entityType
    }
    if (action) {
      where.action = action
    }

    const logs = await prisma.activityLog.findMany({
      where,
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
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

