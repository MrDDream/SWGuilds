import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, isEnvAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        identifier: true,
        name: true,
        role: true,
        isApproved: true,
        lastLogin: true,
        avatarUrl: true,
        canEditAllDefenses: true,
        canEditMap: true,
        canEditAssignments: true,
        canEditNews: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            defenses: true,
            logs: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { userId, isApproved, role } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Protéger l'admin créé via .env contre la rétrogradation
    const isProtectedAdmin = await isEnvAdmin(userId)
    if (isProtectedAdmin && role === 'user') {
      return NextResponse.json(
        { error: 'L\'administrateur créé via les variables d\'environnement ne peut pas être rétrogradé' },
        { status: 403 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: isApproved !== undefined ? isApproved : user.isApproved,
        role: role !== undefined ? role : user.role,
      }
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: isApproved !== undefined ? (isApproved ? 'approve_user' : 'reject_user') : 'update_user',
        entityType: 'user',
        entityId: userId,
        details: JSON.stringify({ 
          identifier: user.identifier,
          isApproved: updatedUser.isApproved,
          role: updatedUser.role,
          previousIsApproved: user.isApproved,
          previousRole: user.role,
        }),
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

