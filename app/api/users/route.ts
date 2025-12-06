import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { handleApiError } from '@/lib/error-handler'

export const dynamic = 'force-dynamic'

// GET : Récupérer les utilisateurs approuvés (pour le calendrier)
export async function GET() {
  try {
    await requireAuth()
    
    const users = await prisma.user.findMany({
      where: {
        isApproved: true,
      },
      select: {
        id: true,
        identifier: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    })

    // Trier par ordre alphabétique (nom ou identifiant)
    users.sort((a, b) => {
      const nameA = (a.name || a.identifier).toLowerCase()
      const nameB = (b.name || b.identifier).toLowerCase()
      return nameA.localeCompare(nameB)
    })

    return NextResponse.json(users)
  } catch (error) {
    return handleApiError(error, 'Erreur lors de la récupération des utilisateurs:')
  }
}

