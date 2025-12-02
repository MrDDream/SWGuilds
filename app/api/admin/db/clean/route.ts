import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    let deletedCount = 0

    // Récupérer tous les IDs valides
    const validUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
    const validDefenseIds = (await prisma.defense.findMany({ select: { id: true } })).map(d => d.id)
    const validCounterIds = (await prisma.counter.findMany({ select: { id: true } })).map(c => c.id)

    // Supprimer les UserMonster sans userId valide
    const allUserMonsters = await prisma.userMonster.findMany({
      select: { id: true, userId: true },
    })
    const orphanedUserMonsters = allUserMonsters.filter(um => !validUserIds.includes(um.userId))
    if (orphanedUserMonsters.length > 0) {
      const result = await prisma.userMonster.deleteMany({
        where: {
          id: { in: orphanedUserMonsters.map(um => um.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les Defense sans userId valide
    const allDefenses = await prisma.defense.findMany({
      select: { id: true, userId: true },
    })
    const orphanedDefenses = allDefenses.filter(d => !validUserIds.includes(d.userId))
    if (orphanedDefenses.length > 0) {
      const result = await prisma.defense.deleteMany({
        where: {
          id: { in: orphanedDefenses.map(d => d.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les Counter sans defenseId valide
    const allCounters = await prisma.counter.findMany({
      select: { id: true, defenseId: true },
    })
    const orphanedCounters = allCounters.filter(c => !validDefenseIds.includes(c.defenseId))
    if (orphanedCounters.length > 0) {
      const result = await prisma.counter.deleteMany({
        where: {
          id: { in: orphanedCounters.map(c => c.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les DefenseVote sans userId ou defenseId valide
    const allDefenseVotes = await prisma.defenseVote.findMany({
      select: { id: true, userId: true, defenseId: true },
    })
    const orphanedDefenseVotes = allDefenseVotes.filter(
      dv => !validUserIds.includes(dv.userId) || !validDefenseIds.includes(dv.defenseId)
    )
    if (orphanedDefenseVotes.length > 0) {
      const result = await prisma.defenseVote.deleteMany({
        where: {
          id: { in: orphanedDefenseVotes.map(dv => dv.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les CounterVote sans userId ou counterId valide
    const allCounterVotes = await prisma.counterVote.findMany({
      select: { id: true, userId: true, counterId: true },
    })
    const orphanedCounterVotes = allCounterVotes.filter(
      cv => !validUserIds.includes(cv.userId) || !validCounterIds.includes(cv.counterId)
    )
    if (orphanedCounterVotes.length > 0) {
      const result = await prisma.counterVote.deleteMany({
        where: {
          id: { in: orphanedCounterVotes.map(cv => cv.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les CalendarEvent sans userId valide
    const allCalendarEvents = await prisma.calendarEvent.findMany({
      select: { id: true, userId: true },
    })
    const orphanedCalendarEvents = allCalendarEvents.filter(ce => !validUserIds.includes(ce.userId))
    if (orphanedCalendarEvents.length > 0) {
      const result = await prisma.calendarEvent.deleteMany({
        where: {
          id: { in: orphanedCalendarEvents.map(ce => ce.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les DefenseAssignment sans userId ou defenseId valide
    const allDefenseAssignments = await prisma.defenseAssignment.findMany({
      select: { id: true, userId: true, defenseId: true },
    })
    const orphanedDefenseAssignments = allDefenseAssignments.filter(
      da => !validUserIds.includes(da.userId) || !validDefenseIds.includes(da.defenseId)
    )
    if (orphanedDefenseAssignments.length > 0) {
      const result = await prisma.defenseAssignment.deleteMany({
        where: {
          id: { in: orphanedDefenseAssignments.map(da => da.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les ActivityLog sans userId valide
    const allActivityLogs = await prisma.activityLog.findMany({
      select: { id: true, userId: true },
    })
    const orphanedActivityLogs = allActivityLogs.filter(al => !validUserIds.includes(al.userId))
    if (orphanedActivityLogs.length > 0) {
      const result = await prisma.activityLog.deleteMany({
        where: {
          id: { in: orphanedActivityLogs.map(al => al.id) },
        },
      })
      deletedCount += result.count
    }

    // Supprimer les NewsPost sans createdBy ou updatedBy valide
    const allNewsPosts = await prisma.newsPost.findMany({
      select: { id: true, createdBy: true, updatedBy: true },
    })
    const orphanedNewsPosts = allNewsPosts.filter(
      np => !validUserIds.includes(np.createdBy) || !validUserIds.includes(np.updatedBy)
    )
    if (orphanedNewsPosts.length > 0) {
      const result = await prisma.newsPost.deleteMany({
        where: {
          id: { in: orphanedNewsPosts.map(np => np.id) },
        },
      })
      deletedCount += result.count
    }

    return NextResponse.json({
      message: 'Nettoyage terminé',
      deletedCount,
    })
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base de données:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

