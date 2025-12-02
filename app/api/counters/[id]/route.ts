import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { counterMonsters, description } = body

    // Vérifier que le contre existe
    const counter = await prisma.counter.findUnique({
      where: { id: params.id },
      include: {
        defense: true,
      },
    })

    if (!counter) {
      return NextResponse.json(
        { error: 'Contre non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est créateur du contre OU admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    // Comparer avec le nom ou l'identifiant de l'utilisateur
    const userIdentifier = session.user.name || session.user.identifier || ''
    const isCreator = counter.createdBy === userIdentifier || counter.createdBy === session.user.identifier || counter.createdBy === session.user.name
    const isAdmin = user?.role === 'admin'

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier ce contre' },
        { status: 403 }
      )
    }

    const updatedCounter = await prisma.counter.update({
      where: { id: params.id },
      data: {
        counterMonsters: JSON.stringify(counterMonsters || []),
        description: description || null,
        updatedBy: session.user.name || session.user.identifier,
      },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'counter',
        entityId: params.id,
        details: JSON.stringify({ 
          defenseId: counter.defenseId,
          leaderMonster: counter.defense.leaderMonster,
          monster2: counter.defense.monster2,
          monster3: counter.defense.monster3,
          counterMonsters,
        }),
      }
    })

    return NextResponse.json(updatedCounter)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du contre:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    // Vérifier que le contre existe
    const counter = await prisma.counter.findUnique({
      where: { id: params.id },
      include: {
        defense: true,
      },
    })

    if (!counter) {
      return NextResponse.json(
        { error: 'Contre non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est créateur du contre OU admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    // Comparer avec le nom ou l'identifiant de l'utilisateur
    const userIdentifier = session.user.name || session.user.identifier || ''
    const isCreator = counter.createdBy === userIdentifier || counter.createdBy === session.user.identifier || counter.createdBy === session.user.name
    const isAdmin = user?.role === 'admin'

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer ce contre' },
        { status: 403 }
      )
    }

    // Créer un log avant la suppression
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'counter',
        entityId: params.id,
        details: JSON.stringify({ 
          defenseId: counter.defenseId,
          leaderMonster: counter.defense.leaderMonster,
          monster2: counter.defense.monster2,
          monster3: counter.defense.monster3,
        }),
      }
    })

    await prisma.counter.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Contre supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du contre:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

