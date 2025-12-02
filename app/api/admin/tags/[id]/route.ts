import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { name, color } = body

    // Récupérer le tag avant la mise à jour pour le log
    const oldTag = await prisma.tag.findUnique({
      where: { id },
    })

    if (!oldTag) {
      return NextResponse.json(
        { error: 'Tag non trouvé' },
        { status: 404 }
      )
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        color,
      },
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'tag',
        entityId: tag.id,
        details: JSON.stringify({
          previousName: oldTag.name,
          newName: tag.name,
          previousColor: oldTag.color,
          newColor: tag.color,
        }),
      },
    })

    return NextResponse.json(tag)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Un tag avec ce nom existe déjà' },
        { status: 400 }
      )
    }
    console.error('Erreur lors de la mise à jour du tag:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    // Récupérer le tag avant la suppression pour le log
    const tag = await prisma.tag.findUnique({
      where: { id },
    })

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag non trouvé' },
        { status: 404 }
      )
    }

    await prisma.tag.delete({
      where: { id },
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'tag',
        entityId: id,
        details: JSON.stringify({
          tagName: tag.name,
          tagColor: tag.color,
        }),
      },
    })

    return NextResponse.json({ message: 'Tag supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du tag:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

