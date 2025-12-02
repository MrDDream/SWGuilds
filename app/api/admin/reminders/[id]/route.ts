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
    const { title, message, daysOfWeek, hour, minute, discordRoleId, webhookUrl, isActive } = body

    // Vérifier que le rappel existe
    const existingReminder = await prisma.reminder.findUnique({
      where: { id },
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Rappel non trouvé' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    if (title !== undefined) {
      updateData.title = title
    }

    if (message !== undefined) {
      updateData.message = message
    }

    if (daysOfWeek !== undefined) {
      // Valider daysOfWeek
      let daysArray: number[]
      try {
        daysArray = JSON.parse(daysOfWeek)
        if (!Array.isArray(daysArray) || daysArray.length === 0) {
          throw new Error('daysOfWeek doit être un tableau non vide')
        }
        if (!daysArray.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
          throw new Error('Les jours doivent être entre 0 (dimanche) et 6 (samedi)')
        }
      } catch (e) {
        return NextResponse.json(
          { error: 'Format invalide pour les jours de la semaine. Utilisez un tableau JSON comme "[1,3,5]"' },
          { status: 400 }
        )
      }
      updateData.daysOfWeek = JSON.stringify(daysArray)
    }

    if (hour !== undefined) {
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        return NextResponse.json(
          { error: 'L\'heure doit être un entier entre 0 et 23' },
          { status: 400 }
        )
      }
      updateData.hour = hour
    }

    if (minute !== undefined) {
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
        return NextResponse.json(
          { error: 'Les minutes doivent être un entier entre 0 et 59' },
          { status: 400 }
        )
      }
      updateData.minute = minute
    }

    if (discordRoleId !== undefined) {
      updateData.discordRoleId = discordRoleId || null
    }

    if (webhookUrl !== undefined) {
      try {
        new URL(webhookUrl)
      } catch {
        return NextResponse.json(
          { error: 'URL webhook invalide' },
          { status: 400 }
        )
      }
      updateData.webhookUrl = webhookUrl
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'reminder',
        entityId: id,
        details: JSON.stringify({
          title: updatedReminder.title,
          updatedFields: Object.keys(updateData),
        }),
      },
    })

    return NextResponse.json(updatedReminder)
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du rappel:', error)
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: error.status }
      )
    }
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

    // Vérifier que le rappel existe
    const existingReminder = await prisma.reminder.findUnique({
      where: { id },
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Rappel non trouvé' },
        { status: 404 }
      )
    }

    await prisma.reminder.delete({
      where: { id },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'reminder',
        entityId: id,
        details: JSON.stringify({
          title: existingReminder.title,
          message: existingReminder.message,
        }),
      },
    })

    return NextResponse.json({ message: 'Rappel supprimé avec succès' })
  } catch (error: any) {
    console.error('Erreur lors de la suppression du rappel:', error)
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive doit être un booléen' },
        { status: 400 }
      )
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id },
      data: { isActive },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: isActive ? 'activate' : 'deactivate',
        entityType: 'reminder',
        entityId: id,
        details: JSON.stringify({
          title: updatedReminder.title,
          isActive,
        }),
      },
    })

    return NextResponse.json(updatedReminder)
  } catch (error: any) {
    console.error('Erreur lors de la modification du statut du rappel:', error)
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Rappel non trouvé' },
      { status: 404 }
    )
  }
}

