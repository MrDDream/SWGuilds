import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

// PUT : Modifier un événement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { eventType, startDate, endDate, description } = body

    // Vérifier que l'événement existe et appartient à l'utilisateur
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est propriétaire ou admin
    if (existingEvent.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Validation des données
    if (eventType && eventType !== 'absence' && eventType !== 'autre') {
      return NextResponse.json(
        { error: 'Type d\'événement invalide. Doit être "absence" ou "autre"' },
        { status: 400 }
      )
    }

    const start = startDate ? new Date(startDate) : existingEvent.startDate
    const end = endDate ? new Date(endDate) : existingEvent.endDate

    if (end < start) {
      return NextResponse.json(
        { error: 'La date de fin doit être après la date de début' },
        { status: 400 }
      )
    }

    // Mettre à jour l'événement
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        eventType: eventType || existingEvent.eventType,
        startDate: start,
        endDate: end,
        description: description !== undefined ? (description || null) : existingEvent.description,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            identifier: true,
          }
        }
      }
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'calendar',
        entityId: event.id,
        details: JSON.stringify({
          eventType: event.eventType,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          description: event.description || null,
        }),
      },
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Erreur lors de la modification de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE : Supprimer un événement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Vérifier que l'événement existe et appartient à l'utilisateur
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est propriétaire ou admin
    if (existingEvent.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Créer un log d'activité avant la suppression
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'calendar',
        entityId: id,
        details: JSON.stringify({
          eventType: existingEvent.eventType,
          startDate: existingEvent.startDate.toISOString(),
          endDate: existingEvent.endDate.toISOString(),
          description: existingEvent.description || null,
        }),
      },
    })

    await prisma.calendarEvent.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Événement supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

