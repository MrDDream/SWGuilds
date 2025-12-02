import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    // Récupérer toutes les affectations avec les informations de défense et utilisateur
    const assignments = await prisma.defenseAssignment.findMany({
      include: {
        defense: {
          select: {
            id: true,
            leaderMonster: true,
            monster2: true,
            monster3: true,
            strengths: true,
            weaknesses: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            identifier: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    })
    
    // Grouper par défense
    const groupedByDefense: Record<string, {
      defenseId: string
      defense: any
      users: Array<{
        assignmentId: string
        id: string
        name: string | null
        identifier: string
        assignedAt: string
        assignedBy: string
      }>
    }> = {}
    
    for (const assignment of assignments) {
      const defenseId = assignment.defenseId
      
      if (!groupedByDefense[defenseId]) {
        groupedByDefense[defenseId] = {
          defenseId,
          defense: assignment.defense,
          users: [],
        }
      }
      
      groupedByDefense[defenseId].users.push({
        assignmentId: assignment.id,
        id: assignment.user.id,
        name: assignment.user.name,
        identifier: assignment.user.identifier,
        assignedAt: assignment.assignedAt.toISOString(),
        assignedBy: assignment.assignedBy,
      })
    }
    
    // Convertir en tableau et trier les utilisateurs par ordre alphabétique dans chaque groupe
    const result = Object.values(groupedByDefense).map(group => ({
      ...group,
      users: group.users.sort((a, b) => {
        const nameA = (a.name || a.identifier).toLowerCase()
        const nameB = (b.name || b.identifier).toLowerCase()
        return nameA.localeCompare(nameB)
      })
    }))
    
    return NextResponse.json({ assignments: result })
  } catch (error) {
    console.error('Erreur lors de la récupération des affectations:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

