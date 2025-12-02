import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditDefense, getUserWithPermissions } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const defense = await prisma.defense.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: session.user.id },
          { isPublic: true, userId: { not: session.user.id } }
        ]
      },
      include: {
        counters: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    if (!defense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(defense)
  } catch (error) {
    console.error('Erreur lors de la récupération de la défense:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const {
      leaderMonster,
      monster2,
      monster3,
      strengths,
      weaknesses,
      attackSequence,
      notes,
      pinnedToDashboard,
      isPublic,
      tagIds,
    } = body

    // Vérifier que la défense existe
    const existingDefense = await prisma.defense.findUnique({
      where: { id: params.id },
    })

    if (!existingDefense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur peut modifier cette défense
    const user = await getUserWithPermissions(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Pour les utilisateurs non-admin, vérifier qu'ils sont créateurs de la défense
    const userIdentifier = session.user.name || session.user.identifier || ''
    const isCreator = existingDefense.createdBy === userIdentifier || existingDefense.createdBy === session.user.identifier || existingDefense.createdBy === session.user.name
    const isAdmin = user?.role === 'admin'
    const canEditAllDefenses = user?.canEditAllDefenses === true
    
    const canEdit = isAdmin || canEditAllDefenses || isCreator
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier cette défense' },
        { status: 403 }
      )
    }

    // Vérifier si une autre défense avec les mêmes monstres existe déjà pour cet utilisateur
    // (en excluant la défense actuelle)
    // Vérifier les deux ordres possibles : (leader, m2, m3) et (leader, m3, m2)
    if (leaderMonster && monster2 && monster3) {
      const trimmedLeader = leaderMonster.trim()
      const trimmedM2 = monster2.trim()
      const trimmedM3 = monster3.trim()

      const duplicateDefense = await prisma.defense.findFirst({
        where: {
          userId: session.user.id,
          id: { not: params.id }, // Exclure la défense actuelle
          OR: [
            {
              leaderMonster: trimmedLeader,
              monster2: trimmedM2,
              monster3: trimmedM3,
            },
            {
              leaderMonster: trimmedLeader,
              monster2: trimmedM3,
              monster3: trimmedM2,
            },
          ],
        },
      })

      if (duplicateDefense) {
        return NextResponse.json(
          { error: 'Une défense avec ces mêmes monstres existe déjà' },
          { status: 400 }
        )
      }
    }

    // Supprimer les anciennes relations de tags
    await prisma.defenseTag.deleteMany({
      where: {
        defenseId: params.id,
      },
    })

    const defense = await prisma.defense.update({
      where: { id: params.id },
      data: {
        leaderMonster,
        monster2,
        monster3,
        strengths: strengths || null,
        weaknesses: weaknesses || null,
        attackSequence: attackSequence || null,
        notes: notes || null,
        pinnedToDashboard: pinnedToDashboard || false,
        isPublic: isPublic !== undefined ? isPublic : true,
        updatedBy: session.user.name || session.user.identifier,
        tags: tagIds && tagIds.length > 0 ? {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        } : undefined,
      },
      include: {
        counters: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    // Créer un log
    const userName = session.user.name || session.user.identifier
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'defense',
        entityId: defense.id,
        details: JSON.stringify({ 
          leaderMonster, 
          monster2, 
          monster3,
          isPublic: defense.isPublic,
          userName,
        }),
      }
    })

    return NextResponse.json(defense)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la défense:', error)
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

    // Vérifier que la défense existe
    const existingDefense = await prisma.defense.findUnique({
      where: { id: params.id },
    })

    if (!existingDefense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est créateur de la défense OU admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    const userIdentifier = session.user.name || session.user.identifier || ''
    const isCreator = existingDefense.createdBy === userIdentifier || existingDefense.createdBy === session.user.identifier || existingDefense.createdBy === session.user.name
    const isAdmin = user?.role === 'admin'

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer cette défense' },
        { status: 403 }
      )
    }

    // Créer un log avant la suppression
    const userName = session.user.name || session.user.identifier
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'defense',
        entityId: params.id,
        details: JSON.stringify({ 
          leaderMonster: existingDefense.leaderMonster,
          monster2: existingDefense.monster2,
          monster3: existingDefense.monster3,
          userName,
        }),
      }
    })

    await prisma.defense.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Défense supprimée avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de la défense:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

