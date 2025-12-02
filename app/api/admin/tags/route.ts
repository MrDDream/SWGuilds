import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  try {
    await requireAdmin()
    
    const tags = await prisma.tag.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Erreur lors de la récupération des tags:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom du tag est requis' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#3B82F6',
      },
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'tag',
        entityId: tag.id,
        details: JSON.stringify({
          tagName: tag.name,
          tagColor: tag.color,
        }),
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Un tag avec ce nom existe déjà' },
        { status: 400 }
      )
    }
    console.error('Erreur lors de la création du tag:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

