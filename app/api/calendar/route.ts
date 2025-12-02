import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

// GET : Récupérer tous les événements du calendrier
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') // Format: YYYY-MM
    const year = searchParams.get('year') // Format: YYYY

    let where: any = {}

    // Filtrer par mois si fourni
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
      
      where.OR = [
        {
          startDate: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          endDate: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: endDate } }
          ]
        }
      ]
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            identifier: true,
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST : Créer un nouvel événement
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { eventType, startDate, endDate, description, userId: targetUserId } = body

    if (!eventType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Type d\'événement, date de début et date de fin requis' },
        { status: 400 }
      )
    }

    if (eventType !== 'absence' && eventType !== 'autre') {
      return NextResponse.json(
        { error: 'Type d\'événement invalide. Doit être "absence" ou "autre"' },
        { status: 400 }
      )
    }

    // Vérifier que la date de fin est après la date de début
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (end < start) {
      return NextResponse.json(
        { error: 'La date de fin doit être après la date de début' },
        { status: 400 }
      )
    }

    // Déterminer le userId à utiliser
    let finalUserId = session.user.id
    if (targetUserId && session.user.role === 'admin') {
      // Vérifier que l'utilisateur cible existe
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, isApproved: true },
      })
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Utilisateur cible non trouvé' },
          { status: 404 }
        )
      }
      if (!targetUser.isApproved) {
        return NextResponse.json(
          { error: 'L\'utilisateur cible n\'est pas approuvé' },
          { status: 403 }
        )
      }
      finalUserId = targetUserId
    } else if (targetUserId && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent créer des événements pour d\'autres utilisateurs' },
        { status: 403 }
      )
    }

    // Créer l'événement
    const event = await prisma.calendarEvent.create({
      data: {
        userId: finalUserId,
        eventType,
        startDate: start,
        endDate: end,
        description: description || null,
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
    const logDetails: any = {
      eventType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      description: description || null,
    }
    
    // Si l'événement a été créé pour un autre utilisateur, l'inclure dans les détails
    if (finalUserId !== session.user.id) {
      const targetUser = await prisma.user.findUnique({
        where: { id: finalUserId },
        select: { name: true, identifier: true },
      })
      logDetails.targetUserId = finalUserId
      logDetails.targetUserName = targetUser?.name || targetUser?.identifier || 'Inconnu'
    }
    
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'calendar',
        entityId: event.id,
        details: JSON.stringify(logDetails),
      },
    })

    // Si c'est une absence, envoyer une notification Discord
    if (eventType === 'absence') {
      try {
        // Récupérer les settings pour obtenir le webhook Discord
        const settings = await prisma.settings.findFirst()
        
        if (settings?.discordWebhookUrl) {
          // Récupérer le nom de l'utilisateur pour lequel l'événement a été créé
          const eventUser = await prisma.user.findUnique({
            where: { id: finalUserId },
            select: { name: true, identifier: true },
          })
          const userName = eventUser?.name || eventUser?.identifier || 'Utilisateur'
          const startDateFormatted = start.toLocaleDateString('fr-FR')
          const endDateFormatted = end.toLocaleDateString('fr-FR')
          
          const message = `Absence: **${userName}** du ${startDateFormatted} au ${endDateFormatted}`
          
          // Envoyer le message Discord de manière asynchrone (ne pas bloquer)
          fetch(settings.discordWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: message,
            }),
          }).catch((error) => {
            console.error('Erreur lors de l\'envoi de la notification Discord:', error)
            // Ne pas faire échouer la création de l'événement si Discord échoue
          })
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification Discord:', error)
        // Ne pas faire échouer la création de l'événement si Discord échoue
      }
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

