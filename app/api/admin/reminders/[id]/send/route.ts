import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    // Récupérer le rappel
    const reminder = await prisma.reminder.findUnique({
      where: { id },
    })

    if (!reminder) {
      return NextResponse.json(
        { error: 'Rappel non trouvé' },
        { status: 404 }
      )
    }

    // Construire le message avec le ping du rôle si configuré
    let message = reminder.message
    if (reminder.discordRoleId) {
      message = `<@&${reminder.discordRoleId}> ${message}`
    }

    // Envoyer le message Discord via webhook
    const response = await fetch(reminder.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      return NextResponse.json(
        { error: `Erreur lors de l'envoi du webhook: ${response.status} ${responseText}` },
        { status: 500 }
      )
    }

    // Mettre à jour lastSent
    await prisma.reminder.update({
      where: { id },
      data: { lastSent: new Date() },
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'send',
        entityType: 'reminder',
        entityId: id,
        details: JSON.stringify({
          title: reminder.title,
          message: reminder.message,
          sentManually: true,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Rappel envoyé avec succès',
    })
  } catch (error) {
    console.error('Erreur lors de l\'envoi du rappel:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

