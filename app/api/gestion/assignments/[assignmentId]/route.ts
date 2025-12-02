import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditAssignments, getUserWithPermissions } from '@/lib/permissions'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await requireAuth()
    const { assignmentId } = await params

    const user = await getUserWithPermissions(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    if (!canEditAssignments(user)) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous n\'avez pas la permission de supprimer des affectations.' },
        { status: 403 }
      )
    }

    // Vérifier que l'affectation existe
    const assignment = await prisma.defenseAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        defense: true,
        user: true,
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Affectation non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer l'affectation
    await prisma.defenseAssignment.delete({
      where: { id: assignmentId },
    })

    // Créer un log
    const userName = assignment.user.name || assignment.user.identifier
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'defense_assignment',
        entityId: assignmentId,
        details: JSON.stringify({
          defenseMonsters: `${assignment.defense.leaderMonster} / ${assignment.defense.monster2} / ${assignment.defense.monster3}`,
          defenseId: assignment.defenseId,
          userId: assignment.userId,
          userIdentifier: assignment.user.identifier,
          userName,
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'affectation:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

