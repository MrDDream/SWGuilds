import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, isEnvAdmin } from '@/lib/auth-helpers'
import bcrypt from 'bcryptjs'

// Modifier le mot de passe ou le nom
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { newPassword, name, canEditAllDefenses, canEditMap, canEditAssignments, canEditNews } = body

    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Protéger l'admin créé via .env contre toute modification
    const isProtectedAdmin = await isEnvAdmin(id)
    if (isProtectedAdmin) {
      return NextResponse.json(
        { error: 'L\'administrateur créé via les variables d\'environnement ne peut pas être modifié par d\'autres administrateurs' },
        { status: 403 }
      )
    }

    const updateData: { 
      password?: string
      name?: string | null
      canEditAllDefenses?: boolean
      canEditMap?: boolean
      canEditAssignments?: boolean
      canEditNews?: boolean
    } = {}

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 6 caractères' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    if (name !== undefined) {
      updateData.name = name || null
    }

    if (canEditAllDefenses !== undefined) {
      updateData.canEditAllDefenses = canEditAllDefenses === true
    }

    if (canEditMap !== undefined) {
      updateData.canEditMap = canEditMap === true
    }

    if (canEditAssignments !== undefined) {
      updateData.canEditAssignments = canEditAssignments === true
    }

    if (canEditNews !== undefined) {
      updateData.canEditNews = canEditNews === true
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: newPassword ? 'change_password' : 'rename_user',
        entityType: 'user',
        entityId: id,
        details: JSON.stringify({ 
          identifier: user.identifier,
          previousName: user.name,
          newName: updatedUser.name,
        }),
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: newPassword ? 'Mot de passe modifié avec succès' : 'Nom modifié avec succès',
      user: updatedUser
    })
  } catch (error) {
    console.error('Erreur lors de la modification:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Vérouiller/déverrouiller un compte
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { isApproved } = body

    if (typeof isApproved !== 'boolean') {
      return NextResponse.json(
        { error: 'isApproved doit être un booléen' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Protéger l'admin créé via .env contre le verrouillage
    const isProtectedAdmin = await isEnvAdmin(id)
    if (isProtectedAdmin) {
      return NextResponse.json(
        { error: 'L\'administrateur créé via les variables d\'environnement ne peut pas être verrouillé' },
        { status: 403 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isApproved }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: isApproved ? 'unlock_user' : 'lock_user',
        entityType: 'user',
        entityId: id,
        details: JSON.stringify({ identifier: user.identifier, isApproved }),
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Erreur lors de la modification du statut:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Supprimer un compte (avec transfert des défenses à un admin)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        defenses: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Protéger l'admin créé via .env contre la suppression
    const isProtectedAdmin = await isEnvAdmin(id)
    if (isProtectedAdmin) {
      return NextResponse.json(
        { error: 'L\'administrateur créé via les variables d\'environnement ne peut pas être supprimé' },
        { status: 403 }
      )
    }

    // Trouver un admin pour transférer les défenses (ou le premier admin si l'utilisateur supprimé est admin)
    const targetAdmin = await prisma.user.findFirst({
      where: { 
        role: 'admin',
        id: { not: id } // Ne pas prendre l'utilisateur à supprimer
      },
      orderBy: { createdAt: 'asc' }
    })

    if (!targetAdmin) {
      return NextResponse.json(
        { error: 'Aucun administrateur disponible pour transférer les défenses' },
        { status: 400 }
      )
    }

    // Transférer les défenses à l'admin
    if (user.defenses.length > 0) {
      await prisma.defense.updateMany({
        where: { userId: id },
        data: { userId: targetAdmin.id }
      })
    }

    // Supprimer l'utilisateur (les contres et logs seront supprimés en cascade)
    await prisma.user.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete_user',
        entityType: 'user',
        entityId: id,
        details: JSON.stringify({ 
          identifier: user.identifier,
          defensesTransferred: user.defenses.length,
          transferredTo: targetAdmin.identifier,
        }),
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Utilisateur supprimé. ${user.defenses.length} défense(s) transférée(s) à ${targetAdmin.identifier}` 
    })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

