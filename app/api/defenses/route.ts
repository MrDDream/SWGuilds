import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const pinned = searchParams.get('pinned')
    const userId = searchParams.get('userId')

    // Vérifier si l'utilisateur est admin pour filtrer par userId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    const where: any = {}

    // Si userId est fourni et que l'utilisateur est admin, filtrer par userId
    if (userId && user?.role === 'admin') {
      where.userId = userId
    } else {
      // Sinon, utiliser la logique normale (ses défenses + défenses publiques)
      where.OR = [
        { userId: session.user.id },
        { isPublic: true, userId: { not: session.user.id } }
      ]
    }

    if (pinned === 'true') {
      where.AND = [
        { pinnedToDashboard: true },
        { userId: session.user.id }
      ]
    }

    const defenses = await prisma.defense.findMany({
      where,
      include: {
        counters: true,
        tags: {
          include: {
            tag: true,
          },
        },
        votes: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Calculer les likes/dislikes pour chaque défense
    const defensesWithLikes = defenses.map(defense => {
      const likes = defense.votes?.filter(v => v.voteType === 'like').length || 0
      const dislikes = defense.votes?.filter(v => v.voteType === 'dislike').length || 0
      return {
        ...defense,
        likes,
        dislikes,
        votes: undefined, // Ne pas envoyer tous les votes détaillés
      }
    })

    return NextResponse.json(defensesWithLikes)
  } catch (error) {
    console.error('Erreur lors de la récupération des défenses:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const {
      leaderMonster,
      monster2,
      monster3,
      strengths,
      weaknesses,
      attackSequence,
      notes,
      pinnedToDashboard,
      tagIds,
    } = body

    if (!leaderMonster || !monster2 || !monster3) {
      return NextResponse.json(
        { error: 'Les trois monstres sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si une défense avec les mêmes monstres existe déjà pour cet utilisateur
    // Vérifier les deux ordres possibles : (leader, m2, m3) et (leader, m3, m2)
    const trimmedLeader = leaderMonster.trim()
    const trimmedM2 = monster2.trim()
    const trimmedM3 = monster3.trim()

    const existingDefense = await prisma.defense.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          {
            leaderMonster: trimmedLeader,
            monster2: trimmedM2,
            monster3: trimmedM3,
          },
          {
            leaderMonster: trimmedLeader,
            monster2: trimmedM3,
            monster3: trimmedM2,
          },
        ],
      },
    })

    if (existingDefense) {
      return NextResponse.json(
        { error: 'Une défense avec ces mêmes monstres existe déjà' },
        { status: 400 }
      )
    }

    const defense = await prisma.defense.create({
      data: {
        userId: session.user.id,
        leaderMonster,
        monster2,
        monster3,
        strengths: strengths || null,
        weaknesses: weaknesses || null,
        attackSequence: attackSequence || null,
        notes: notes || null,
        pinnedToDashboard: pinnedToDashboard || false,
        isPublic: body.isPublic !== undefined ? body.isPublic : true,
        createdBy: session.user.name || session.user.identifier,
        updatedBy: session.user.name || session.user.identifier,
        tags: tagIds && tagIds.length > 0 ? {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        } : undefined,
      },
      include: {
        counters: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    // Créer un log
    const userName = session.user.name || session.user.identifier
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'defense',
        entityId: defense.id,
        details: JSON.stringify({ 
          leaderMonster, 
          monster2, 
          monster3,
          isPublic: defense.isPublic,
          userName,
        }),
      }
    })

    return NextResponse.json(defense, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la défense:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

