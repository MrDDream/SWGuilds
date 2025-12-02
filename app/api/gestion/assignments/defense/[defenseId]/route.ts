import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditAssignments, getUserWithPermissions } from '@/lib/permissions'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ defenseId: string }> }
) {
  try {
    const session = await requireAuth()
    const { defenseId } = await params
    const body = await request.json()
    const { userIds } = body

    const user = await getUserWithPermissions(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    if (!canEditAssignments(user)) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous n\'avez pas la permission de modifier les affectations.' },
        { status: 403 }
      )
    }

    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds doit être un tableau' },
        { status: 400 }
      )
    }

    // Vérifier que la défense existe
    const defense = await prisma.defense.findUnique({
      where: { id: defenseId },
    })

    if (!defense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }

    const assignedBy = session.user.name || session.user.identifier || session.user.id

    // Récupérer les affectations existantes pour cette défense
    const existingAssignments = await prisma.defenseAssignment.findMany({
      where: { defenseId },
    })

    const existingUserIds = new Set(existingAssignments.map(a => a.userId))
    const newUserIds = new Set(userIds)

    // Identifier les utilisateurs à ajouter et à supprimer
    const toAdd = userIds.filter(id => !existingUserIds.has(id))
    const toRemove = existingAssignments
      .filter(a => !newUserIds.has(a.userId))
      .map(a => a.id)

    // Supprimer les affectations à retirer
    if (toRemove.length > 0) {
      await prisma.defenseAssignment.deleteMany({
        where: {
          id: { in: toRemove },
        },
      })
    }

    // Ajouter les nouvelles affectations
    const addedAssignments = []
    for (const userId of toAdd) {
      try {
        const assignment = await prisma.defenseAssignment.create({
          data: {
            defenseId,
            userId,
            assignedBy,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                identifier: true,
              },
            },
          },
        })
        addedAssignments.push(assignment)
      } catch (error: any) {
        // Ignorer les erreurs de contrainte unique (doublon)
        if (error.code !== 'P2002') {
          console.error(`Erreur lors de la création de l'affectation pour userId ${userId}:`, error)
        }
      }
    }

    // Récupérer les noms des monstres de la défense pour le log
    const defenseMonsters = `${defense.leaderMonster} / ${defense.monster2} / ${defense.monster3}`
    
    // Récupérer les noms des utilisateurs ajoutés
    const addedNames = addedAssignments.map(a => a.user.name || a.user.identifier)
    
    // Récupérer les affectations retirées et leurs utilisateurs
    const removedAssignments = existingAssignments.filter(a => toRemove.includes(a.id))
    const removedUserIds = removedAssignments.map(a => a.userId)
    
    // Récupérer les utilisateurs retirés depuis la base de données
    const removedUsers = removedUserIds.length > 0 ? await prisma.user.findMany({
      where: {
        id: { in: removedUserIds },
      },
      select: {
        id: true,
        name: true,
        identifier: true,
      },
    }) : []
    const removedUserNames = removedUsers.map(u => u.name || u.identifier)
    
    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'defense_assignment',
        entityId: defenseId,
        details: JSON.stringify({
          defenseMonsters,
          defenseId,
          added: toAdd.length,
          removed: toRemove.length,
          addedNames,
          removedNames: removedUserNames,
          total: userIds.length,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      added: addedAssignments.length,
      removed: toRemove.length,
    })
  } catch (error) {
    console.error('Erreur lors de la modification de l\'affectation:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

