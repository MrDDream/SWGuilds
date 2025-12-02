import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditAssignments, getUserWithPermissions } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
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
    
    const body = await request.json()
    const { defenseId, userIds } = body
    
    if (!defenseId || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'defenseId et userIds (tableau) sont requis' },
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
    const assignments = []
    
    // Créer les affectations (gérer les doublons avec try/catch ou vérification préalable)
    for (const userId of userIds) {
      try {
        // Vérifier si l'affectation existe déjà
        const existing = await prisma.defenseAssignment.findUnique({
          where: {
            defenseId_userId: {
              defenseId,
              userId,
            },
          },
        })
        
        if (!existing) {
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
          assignments.push(assignment)
        }
      } catch (error: any) {
        // Ignorer les erreurs de contrainte unique (doublon)
        if (error.code !== 'P2002') {
          console.error(`Erreur lors de la création de l'affectation pour userId ${userId}:`, error)
        }
      }
    }
    
    // Créer un log
    if (assignments.length > 0) {
      // Récupérer les noms des monstres de la défense pour le log
      const defenseMonsters = `${defense.leaderMonster} / ${defense.monster2} / ${defense.monster3}`
      
      // Récupérer les noms des utilisateurs affectés
      const assignedToNames = assignments.map(a => a.user.name || a.user.identifier)
      
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'assign',
          entityType: 'defense_assignment',
          entityId: defenseId,
          details: JSON.stringify({ 
            defenseMonsters,
            assignedTo: userIds,
            assignedToNames,
            count: assignments.length,
          }),
        }
      })
    }
    
    return NextResponse.json({ 
      success: true,
      assignments,
      count: assignments.length,
    })
  } catch (error) {
    console.error('Erreur lors de l\'affectation de la défense:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

