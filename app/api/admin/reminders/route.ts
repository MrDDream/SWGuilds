import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  try {
    await requireAdmin()

    const reminders = await prisma.reminder.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Erreur lors de la récupération des rappels:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { title, message, daysOfWeek, hour, minute, discordRoleId, webhookUrl, isActive } = body

    // Validation
    if (!title || !message || !daysOfWeek || hour === undefined || !webhookUrl) {
      return NextResponse.json(
        { error: 'Titre, message, jours de la semaine, heure et URL webhook sont requis' },
        { status: 400 }
      )
    }

    // Valider daysOfWeek (doit être un tableau JSON valide)
    let daysArray: number[]
    try {
      daysArray = JSON.parse(daysOfWeek)
      if (!Array.isArray(daysArray) || daysArray.length === 0) {
        throw new Error('daysOfWeek doit être un tableau non vide')
      }
      // Vérifier que tous les éléments sont entre 0 et 6
      if (!daysArray.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
        throw new Error('Les jours doivent être entre 0 (dimanche) et 6 (samedi)')
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Format invalide pour les jours de la semaine. Utilisez un tableau JSON comme "[1,3,5]"' },
        { status: 400 }
      )
    }

    // Valider hour (0-23)
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return NextResponse.json(
        { error: 'L\'heure doit être un entier entre 0 et 23' },
        { status: 400 }
      )
    }

    // Valider minute (0-59)
    const minuteValue = minute !== undefined ? minute : 0
    if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59) {
      return NextResponse.json(
        { error: 'Les minutes doivent être un entier entre 0 et 59' },
        { status: 400 }
      )
    }

    // Valider webhookUrl (doit être une URL valide)
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json(
        { error: 'URL webhook invalide' },
        { status: 400 }
      )
    }

    const reminder = await prisma.reminder.create({
      data: {
        title,
        message,
        daysOfWeek: JSON.stringify(daysArray),
        hour,
        minute: minuteValue,
        discordRoleId: discordRoleId || null,
        webhookUrl,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: session.user.id,
      },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'reminder',
        entityId: reminder.id,
        details: JSON.stringify({
          title: reminder.title,
          message: reminder.message,
          daysOfWeek: daysArray,
          hour: reminder.hour,
          minute: reminder.minute,
        }),
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error: any) {
    console.error('Erreur lors de la création du rappel:', error)
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

